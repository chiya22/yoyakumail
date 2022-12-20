const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();
const puppeteer = require("puppeteer");

const fs = require("fs");
const iconv = require("iconv-lite");
const readline = require("readline");

const common = require("./common");

const m_kessais = require("../model/kessais");
const m_logininfo = require("../model/logininfo");
const { env } = require("process");

const seikyuinfo = require("./seikyuinfo");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// 検索情報IDに紐づく決済情報をファイルに出力する（電算システムアップロード用）
const outputFile = async (id_search) => {

  const kessais = await m_kessais.findByIdSearch(id_search);

  const outFileName = process.env.KESSAI_UP_PATH + "\\kessaiinfo" + common.getTodayTime() + ".csv";
  let content = "";

  kessais.forEach( kessai => {
    content += kessai.id_customer + "," + kessai.to_pay + "," + kessai.nm_customer_1 + "," + kessai.nm_customer_2 + "," + kessai.telno + "," + kessai.price + "," + kessai.yyyymmdd_kigen + "\r\n"
  });

  const content_SJIS = iconv.encode(content, "Shift_JIS");
  await fs.writeFileSync(outFileName, content_SJIS);

  return outFileName;

}

// 電算システムへ決済依頼データをアップロードする
const upkessaiinfo = async (id_search, upFilepath) => {

  // ★ヘッドレス設定
  const browser = await puppeteer.launch({ headless: true });

  let page = await browser.newPage();

  // 電算システムへログイン
  await page.goto(process.env.KESSAI_URL, { waitUntil: "domcontentloaded" });

  await page.waitForTimeout(process.env.WAITTIME);

  // ログイン
  const logininfo = await m_logininfo.find();
  await page.type('input[name="kamei_id"]', logininfo.id_kamei);
  await page.type('input[name="user_id"]', logininfo.id_riyou);
  await page.type('input[name="pass"]', logininfo.password);
  await page.click("#fra_maindsk > form > center > table:nth-child(5) > tbody > tr > td > input[type=submit]");

  await page.waitForTimeout(process.env.WAITTIME);
  // await page.waitForNavigation({waitUntil: 'domcontentloaded'});

  // 「ペーパレス決済」をクリック
  await page.click("#MENU2 > a");

  await page.waitForTimeout(process.env.WAITTIME);

  // 「依頼データアップロード」をクリック
  await page.click("#fra_menu2 > div:nth-child(3) > a");
  
  await page.waitForTimeout(process.env.WAITTIME);

  // コメントへ検索情報IDを設定する
  await page.type('input[name="comment"]', id_search);

  // アップロードファイルを設定
  const inputUploadfile = await page.$('input[type="file"]');
  inputUploadfile.uploadFile(upFilepath);

  await page.waitForTimeout(process.env.WAITTIME);

  // Promptが出たら必ずOKとする
  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  // 「アップロード」をクリック
  await page.click("#fra_main > center:nth-child(2) > form > input[type=submit]:nth-child(5)");

  await page.waitForTimeout(process.env.WAITTIME);

  const errmsg = await page.evaluate( () => {
    const err = document.querySelector("#fra_main > center:nth-child(2) > div");
    if (err) {
      return err.innerHTML;
    } else {
      return "";
    }
  });

  const errmsgdetail = await page.evaluate( () => {
    const err = document.querySelector("#fra_main > center:nth-child(2) > table > tbody");
    if (err) {
      return err.textContent.replace("\n", "").replace(/\s+/g,"");
    } else {
      return "";
    }
  });

  if (errmsg) {

    await logger.info(errmsg);
    await browser.close();
    return `[err]アップロードエラー：${errmsg} | ${errmsgdetail}`

  } else {

    await logger.info(`決済依頼情報をアップロードしました`);

    await page.waitForTimeout(process.env.WAITTIME);
  
    // 「アップロード」が完了したらファイル名をoldにする
    const upFilename = upFilepath.split('\\').slice(-1);
    fs.rename(process.env.KESSAI_DL_PATH + "\\" + upFilename[0], process.env.KESSAI_DL_PATH + "\\old_" + upFilename[0], (err) => {
      if (err) {
        logger.info(`${upFilename[0]}ファイルは存在しません：${new Date()}`);
        throw err;
      }
    });
  
    await browser.close();

    return "";
  }
}

// 電算システムから決済結果データをダウンロードする
const dlkessaiinfo = async (id_search) => {

  // ★ヘッドレス設定
  const browser = await puppeteer.launch({ headless: true });

  let page = await browser.newPage();

  // 電算システムへログイン
  await page.goto(process.env.KESSAI_URL, { waitUntil: "domcontentloaded" });

  await page.waitForTimeout(process.env.WAITTIME);

  // ログイン
  const logininfo = await m_logininfo.find();
  await page.type('input[name="kamei_id"]', logininfo.id_kamei);
  await page.type('input[name="user_id"]', logininfo.id_riyou);
  await page.type('input[name="pass"]', logininfo.password);
  await page.click("#fra_maindsk > form > center > table:nth-child(5) > tbody > tr > td > input[type=submit]");

  await page.waitForTimeout(process.env.WAITTIME);

  // 「ペーパレス決済」をクリック
  await page.click("#MENU2 > a");

  await page.waitForTimeout(process.env.WAITTIME);

  // 「結果データダウンロード」をクリック
  await page.click("#fra_menu2 > div:nth-child(5) > a");
  
  await page.waitForTimeout(process.env.WAITTIME);

  // コメントに検索IDを設定
  await page.type('input[name="comm"]', id_search);

  // アップロード処理日のToに現在の日付を設定
  await page.type("#fra_main > center:nth-child(3) > form:nth-child(2) > table.ViewTBL > tbody > tr:nth-child(1) > td > input[type=text]:nth-child(2)", common.getTodayTime().slice(0,8));

  // ダウンロード先を修正
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    // downloadPath: process.env.KESSAI_DL_PATH,
    downloadPath: "C:\\download\\yoyakumail",
  });

  // 検索ボタンをクリック
  await page.click("#fra_main > center:nth-child(3) > form:nth-child(2) > table:nth-child(4) > tbody > tr > td > input[type=button]");

  await page.waitForTimeout(process.env.WAITTIME);

  // エラーメッセージ表示領域より表示されているメッセージを取得
  const errmsg = await page.evaluate( () => {
    const err = document.querySelector("#fra_main > center:nth-child(3) > div");
    if (err) {
      return err.innerHTML;
    } else {
      return "";
    }
  });
  // const errmsg = await page.$eval("#fra_main > center:nth-child(3) > div", el => el.innerHTML);

  // エラーメッセージが表示されている場合
  if (errmsg) {

    return `[err]ダウンロードエラー:${errmsg}`;

  } else {

  await page.waitForTimeout(process.env.WAITTIME);

  await page.click("#fra_main > center:nth-child(3) > form:nth-child(4) > table > tbody > tr:nth-child(2) > td:nth-child(1) > input[type=button]");

  // ファイル名取得
  const filename = await page.$eval("#fra_main > center:nth-child(3) > form:nth-child(4) > table > tbody > tr:nth-child(2) > td:nth-child(2)", el => el.innerHTML);

  await page.waitForTimeout(process.env.WAITTIME);

  await logger.info(`決済結果データをダウンロードしました`);
  await page.waitForTimeout(process.env.WAITTIME);
  await browser.close();

  return filename + ".csv";

  }
}

// 電算システムよりダウンロードした決済結果データをもとに決済テーブルへ反映させる
const updkessaiinfo = async (id_search, dlfilename) => {

  let targetfilename = "";

  fs.readdirSync(process.env.YOYAKU_DL_PATH).forEach((filename) => {

    // 決済結果ダウンロードファイルの場合
    if (filename === dlfilename) {

      targetfilename = filename;

      // csvファイルはShift-JISのため
      const src = fs.createReadStream(process.env.KESSAI_DL_PATH + "\\" + filename).pipe(iconv.decodeStream("Shift_JIS"));

      // 1行ごとに読み込む
      const rl = readline.createInterface({
        input: src,
        output: process.stdout,
        terminal: false,
      });

      // 1行ごとの処理
      rl.on("line", (chunk) => {

        const linecontents = chunk.split(",");

        if (linecontents[9] === '') {
          return false
        } else {
          
          inObj = {};
          inObj.id_customer = linecontents[0];
          inObj.id_search = id_search;
          inObj.result = linecontents[7];
          inObj.id_data = linecontents[8];
          inObj.url_cvs = linecontents[9];
          inObj.message = linecontents[10];
  
          // 請求書のPDFファイルを作成し、そのパス情報を取得する
          seikyuinfo.createSeikyuPDF(inObj.id_customer, inObj.id_search);
          
          (async () => {
            // 決済情報へ反映する
            await m_kessais.updatekessaisBydlinfo(inObj);
          })();
          // logger.info(`決済情報ID：${inObj.id_customer}_${inObj.id_search}`);
        }

      });

      // 終了時には処理した対象ファイルをリネームする
      src.on("end", () => {
        try {
          fs.renameSync(process.env.KESSAI_DL_PATH + "\\" + targetfilename, process.env.KESSAI_DL_PATH + "\\old_" + common.getTodayTime() + "_" + targetfilename)
        } catch(err) {
            logger.info(`${targetfilename}ファイルは存在しません：${new Date()}`);
            throw err;
        }
      });
    }
  })
};


module.exports = {
  outputFile,
  upkessaiinfo,
  dlkessaiinfo,
  updkessaiinfo,
};
