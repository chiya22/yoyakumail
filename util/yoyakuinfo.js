const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();
const puppeteer = require("puppeteer");

const fs = require("fs");
const iconv = require("iconv-lite");
const readline = require("readline");

const common = require("./common");

const m_yoyakus = require("../model/yoyakus");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

//　予約情報ダウンロード
const dlyoyakuinfo = async (yyyymmdd_addupd_start, yyyymmdd_addupd_end, yyyymmdd_riyou_start, yyyymmdd_riyou_end) => {
  
  // ★ヘッドレス設定
  const browser = await puppeteer.launch({ headless: true });

  let page = await browser.newPage();

  await page.goto(process.env.YOYAKU_URL, { waitUntil: "domcontentloaded" });

  // ログイン
  await page.type('input[name="in_office"]', process.env.YOYAKU_LOGIN_ID);
  await page.type('input[name="in_opassword"]', process.env.YOYAKU_LOGIN_PASSWORD);
  await page.click("body > table > tbody > tr > td > table > tbody > tr:nth-child(1) > td > form > table:nth-child(2) > tbody > tr > td:nth-child(2) > input");

  await page.waitForTimeout(process.env.WAITTIME);
  // await page.waitForNavigation({waitUntil: 'domcontentloaded'});

  // 「予約検索」をクリック
  const menu = await page.$("body > table > tbody > tr > td > table > tbody > tr > td > table:nth-child(2) > tbody > tr:nth-child(8) > td:nth-child(2) > input[type=image]:nth-child(9)");
  await menu.click();

  await page.waitForTimeout(process.env.WAITTIME);

  // 「新規予約確認」をクリック
  const shinki = await page.$("body > div:nth-child(4) > table:nth-child(3) > tbody > tr > th:nth-child(3) > a");
  await shinki.click();

  await page.waitForTimeout(process.env.WAITTIME);

  // 登録日/更新日の設定
  const yyyymm_addupd_start = yyyymmdd_addupd_start.slice(0, 6);
  const dd_addupd_start = "" + Number(yyyymmdd_addupd_start.slice(-2));
  const yyyymm_addupd_end = yyyymmdd_addupd_end.slice(0, 6);
  const dd_addupd_end = "" + Number(yyyymmdd_addupd_end.slice(-2));
  const yyyymm_riyou_start = yyyymmdd_riyou_start.slice(0, 6);
  const dd_riyou_start = "" + Number(yyyymmdd_riyou_start.slice(-2));
  const yyyymm_riyou_end = yyyymmdd_riyou_end.slice(0, 6);
  const dd_riyou_end = "" + Number(yyyymmdd_riyou_end.slice(-2));

  await page.select('select[name="s_tourokuYm"]', yyyymm_addupd_start);
  await page.select('select[name="s_tourokudd"]', dd_addupd_start);
  await page.select('select[name="e_tourokuYm"]', yyyymm_addupd_end);
  await page.select('select[name="e_tourokudd"]', dd_addupd_end);
  await page.select('select[name="s_riyouYm"]', yyyymm_riyou_start);
  await page.select('select[name="s_riyoudd"]', dd_riyou_start);
  await page.select('select[name="e_riyouYm"]', yyyymm_riyou_end);
  await page.select('select[name="e_riyoudd"]', dd_riyou_end);

  // 「検索」ボタンをクリック
  await page.click("body > div:nth-child(4) > form > table:nth-child(1) > tbody > tr > td:nth-child(4) > input");

  await page.waitForTimeout(process.env.WAITTIME);

  // Promptが出たら必ずOKとする
  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  // ダウンロード先を修正
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: "C:\\download\\yoyakumail",
  });

  // 隠し項目へ値を設定
  // proc_flg
  await page.$eval('input[name="proc_flg"]', (el) => (el.value = "download"));
  // OLDShoriTabMenu
  await page.$$eval('input[name="OLDShoriTabMenu"]', (els) => {
    els.forEach((el) => (el.value = "2"));
  });
  // target,action
  await page.$eval('form[name="formlist"]', (form) => {
    form.action = "/studio/office/MemberEntry/OLDSTabSelect.php";
    form.target = "";
  });

  // formをsubmit
  await page.$eval('form[name="formlist"]', (form) => form.submit());

  await logger.info(`予約情報をダウンロードしました`);
  await page.waitForTimeout(process.env.WAITTIME);
  await browser.close();

  logger.info(`予約情報ダウンロード終了`);
};

// ダウンロードディレクトリにあるファイル群を読み込む
const filetodb = (yyyymmddhhmmss_proc) => {

  let targetfilename = "";

  fs.readdirSync(process.env.YOYAKU_DL_PATH).forEach((filename) => {

    // 予約情報ダウンロードファイルの場合
    if (filename.slice(0, 11) === "kakuninsho_") {

      targetfilename = filename;

      // id設定用プレフィックス
      let max_id_yoyaku = 1;

      // csvファイルはShift-JISのため
      const src = fs.createReadStream(process.env.YOYAKU_DL_PATH + "\\" + filename).pipe(iconv.decodeStream("Shift_JIS"));

      // 1行ごとに読み込む
      const rl = readline.createInterface({
        input: src,
        output: process.stdout,
        terminal: false,
      });

      // 1行ごとの処理
      rl.on("line", (chunk) => {

        const linecontents = chunk.split(",");

        // ヘッダーは飛ばす
        if (linecontents[0] !== "管理ID" && linecontents[0] !== "") {
          // 予約情報用オブジェクト
          let inObj = {};
          inObj.id = "Y" + yyyymmddhhmmss_proc + ("00000" + max_id_yoyaku).slice(-5);
          inObj.id_search = "Y" + yyyymmddhhmmss_proc;
          inObj.id_kanri = linecontents[0];
          inObj.nm_room = linecontents[1];
          inObj.yyyymmdd_yoyaku = linecontents[2].replace(/\//g, "");
          inObj.time_start = linecontents[3];
          inObj.time_end = linecontents[4];
          inObj.price = linecontents[5] ? linecontents[5] : 0;
          inObj.yyyymmdd_uketuke = linecontents[6].replace(/\//g, "");
          inObj.status_shiharai = linecontents[7];
          inObj.nm_nyuryoku = common.hankaku2Zenkaku(linecontents[8]);
          inObj.nm_riyousha = common.hankaku2Zenkaku(linecontents[9]);
          inObj.nm_room_seishiki = linecontents[10];
          inObj.type_room = linecontents[11];
          inObj.no_keiyakusha = linecontents[12];
          inObj.nm_keiyakusha = common.hankaku2Zenkaku(linecontents[13]);
          inObj.nm_tantousha = common.hankaku2Zenkaku(linecontents[14]);
          inObj.telno = linecontents[15];
          inObj.faxno = linecontents[16];
          inObj.email = linecontents[17];
          inObj.kubun = linecontents[18];
          inObj.address = linecontents[19];
          inObj.quantity = linecontents[20] ? linecontents[20] : 0;
          inObj.tanka = linecontents[21] ? linecontents[21] : 0;
          inObj.caution = linecontents[22];
          inObj.memo = linecontents[23];
          inObj.yyyymmddhhmmss_created = yyyymmddhhmmss_proc;
          inObj.id_customer = "R" + inObj.id_kanri + "-" + inObj.yyyymmdd_uketuke + "-" + inObj.yyyymmdd_yoyaku;

          (async () => {
            await m_yoyakus.insert(inObj);
          })();
          // logger.info(`予約情報ID：${inObj.id}`);

          // id設定用プレフィックスに+1
          max_id_yoyaku += 1;

        }
      });

      // 終了時には処理した対象ファイルをリネームする
      src.on("end", () => {
        fs.rename(process.env.YOYAKU_DL_PATH + "\\" + targetfilename, process.env.YOYAKU_DL_PATH + "\\old_" + common.getTodayTime() + "_" + targetfilename, (err) => {
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
  dlyoyakuinfo,
  filetodb,
};
