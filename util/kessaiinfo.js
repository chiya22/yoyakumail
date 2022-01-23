const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();
const puppeteer = require("puppeteer");

const fs = require("fs");
const iconv = require("iconv-lite");

const common = require("./common");

const m_kessais = require("../model/kessais");

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
const upkessaiinfo = async (id_search, upFilename) => {

  const browser = await puppeteer.launch({ headless: false });

  let page = await browser.newPage();

  // 電算システムへログイン
  await page.goto(process.env.KESSAI_URL, { waitUntil: "domcontentloaded" });

  await page.waitForTimeout(3000);

  // ログイン
  await page.type('input[name="kamei_id"]', process.env.KESSAI_KAMEI_ID);
  await page.type('input[name="user_id"]', process.env.KESSAI_RIYOU_ID);
  await page.type('input[name="pass"]', process.env.KESSAI_PASSWORD);
  await page.click("#fra_maindsk > form > center > table:nth-child(5) > tbody > tr > td > input[type=submit]");

  await page.waitForTimeout(3000);
  // await page.waitForNavigation({waitUntil: 'domcontentloaded'});

  // 「ペーパレス決済」をクリック
  await page.click("#MENU2 > a");

  await page.waitForTimeout(3000);

  // 「依頼データアップロード」をクリック
  await page.click("#fra_menu2 > div:nth-child(3) > a");
  
  await page.waitForTimeout(3000);

  // アップロードファイルを設定
  const inputUploadfile = await page.$('input[type="file"]');
  inputUploadfile.uploadFile(upFilename);

  await page.waitForTimeout(3000);

  // Promptが出たら必ずOKとする
  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  // 「アップロード」をクリック
  await page.click("#fra_main > center:nth-child(2) > form > input[type=submit]:nth-child(5)");

  await logger.info(`決済依頼情報をアップロードしました`);
  await page.waitForTimeout(3000);
  await browser.close();

}

// 電算システムから決済結果データをダウンロードする
const dlkessaiinfo = async () => {

  const browser = await puppeteer.launch({ headless: false });

  let page = await browser.newPage();

  // 電算システムへログイン
  await page.goto(process.env.KESSAI_URL, { waitUntil: "domcontentloaded" });

  await page.waitForTimeout(3000);

  // ログイン
  await page.type('input[name="kamei_id"]', process.env.KESSAI_KAMEI_ID);
  await page.type('input[name="user_id"]', process.env.KESSAI_RIYOU_ID);
  await page.type('input[name="pass"]', process.env.KESSAI_PASSWORD);
  await page.click("#fra_maindsk > form > center > table:nth-child(5) > tbody > tr > td > input[type=submit]");

  await page.waitForTimeout(3000);
  // await page.waitForNavigation({waitUntil: 'domcontentloaded'});

  // 「ペーパレス決済」をクリック
  await page.click("#MENU2 > a");

  await page.waitForTimeout(3000);

  // 「結果データダウンロード」をクリック
  await page.click("#fra_menu2 > div:nth-child(5) > a");
  
  await page.waitForTimeout(3000);

  // ダウンロード先を修正
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: process.env.KESSAI_DL_PATH,
    // downloadPath: "C:\\download\\customer",
  });

  // 隠し項目へ設定する値を取得
  // stl_id設定用
  const stl_id = await page.$eval("#fra_main > center:nth-child(3) > form:nth-child(4) > table > tbody > tr:nth-child(2) > td:nth-child(2)", el => el.innerHTML);
  // ins_day設定用
  const ins_day = await page.$eval("#fra_main > center:nth-child(3) > form:nth-child(4) > input[type=hidden]:nth-child(6)", el => el.value);

  // 隠し項目へ設定　★うまくいかない★
  await page.$eval('input[name="ins_day"]', (el,ins_day) => (el.value = ins_day));
  await page.$eval('input[name="stl_id"]', (el, stl_id) => (el.value = stl_id));

  // 「Download」ボタンをクリックし、決済結果データをダウンロード
  await page.$eval('form[name="SPKS0030_download"]', (form) => {
    form.action = "/SP/SPKB/SPKS0030";
    form.target = "";
  });

  // formをsubmit
  await page.$eval('form[name="SPKS0030_download"]', (form) => form.submit());

  // await page.click("#fra_main > center:nth-child(3) > form:nth-child(4) > table > tbody > tr:nth-child(2) > td:nth-child(1) > input[type=button]");

  await page.waitForTimeout(3000);

  await logger.info(`決済結果データをダウンロードしました`);
  await page.waitForTimeout(1000);
  await browser.close();

  return stl_id + ".csv";

}

// 電算システムよりダウンロードした決済結果データをもとに決済テーブルへ反映させる
const updkessaiinfo = async (id_search) => {

  let targetfilename = "";

  fs.readdirSync(process.env.YOYAKU_DL_PATH).forEach((filename) => {

    // 決済結果ダウンロードファイルの場合
    if (filename.slice(0, 11) === "aaaaaa") {

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

        inObj.id_customer = linecontents[0];
        inObj.id_search = id_search;
        inObj.result = linecontents[7];
        inObj.in_data = linecontents[8];
        inObj.url_cvs = linecontents[9];
        inObj.message = linecontents[10];

        (async () => {
          await m_kessais.updatekessaisBydlinfo(inObj);
        })();
        logger.info(`決済情報ID：${inObj.id_customer}_${inObj.id_search}`);
      });

      // 終了時には処理した対象ファイルをリネームする
      src.on("end", () => {
        fs.rename(process.env.KESSAI_DL_PATH + "\\" + targetfilename, process.env.KESSAI_DL_PATH + "\\old_" + targetfilename, (err) => {
          if (err) {
            logger.info(`${targetfilename}ファイルは存在しません：${new Date()}`);
            throw err;
          }
        });
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
