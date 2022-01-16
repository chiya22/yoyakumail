const req = require("express/lib/request");
const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();
const puppeteer = require("puppeteer");

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

//　予約情報ダウンロード
const dlyoyakuinfo = async (yyyymmdd_addupd_start,yyyymmdd_addupd_end,yyyymmdd_riyou_start,yyyymmdd_riyou_end) => {

  const browser = await puppeteer.launch({ headless: false });

  let page = await browser.newPage();

  await page.goto(process.env.YOYAKU_URL, { waitUntil: "domcontentloaded" });

  // ログイン
  await page.type('input[name="in_office"]', process.env.YOYAKU_LOGIN_ID);
  await page.type('input[name="in_opassword"]', process.env.YOYAKU_LOGIN_PASSWORD);
  await page.click(
    "body > table > tbody > tr > td > table > tbody > tr:nth-child(1) > td > form > table:nth-child(2) > tbody > tr > td:nth-child(2) > input"
  );

  await page.waitForTimeout(1000);
  // await page.waitForNavigation({waitUntil: 'domcontentloaded'});

  // 「予約検索」をクリック
  const menu = await page.$(
    "body > table > tbody > tr > td > table > tbody > tr > td > table:nth-child(2) > tbody > tr:nth-child(8) > td:nth-child(2) > input[type=image]:nth-child(9)"
  );
  await menu.click();

  await page.waitForTimeout(1000);

  // 「新規予約確認」をクリック
  const shinki = await page.$(
    "body > div:nth-child(4) > table:nth-child(3) > tbody > tr > th:nth-child(3) > a"
  )
  await shinki.click();

  await page.waitForTimeout(1000);

  // 登録日/更新日の設定
  const yyyymm_addupd_start = yyyymmdd_addupd_start.slice(0,6);
  const dd_addupd_start = "" + Number(yyyymmdd_addupd_start.slice(-2));
  const yyyymm_addupd_end = yyyymmdd_addupd_end.slice(0,6);
  const dd_addupd_end = "" + Number(yyyymmdd_addupd_end.slice(-2));
  const yyyymm_riyou_start = yyyymmdd_riyou_start.slice(0,6);
  const dd_riyou_start = "" + Number(yyyymmdd_riyou_start.slice(-2));
  const yyyymm_riyou_end = yyyymmdd_riyou_end.slice(0,6);
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
  await page.click(
    "body > div:nth-child(4) > form > table:nth-child(1) > tbody > tr > td:nth-child(4) > input"
  );

  await page.waitForTimeout(1000);

  // Promptが出たら必ずOKとする
  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  // ダウンロード先を修正
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: "C:\\download\\customer",
  });

  // 隠し項目へ値を設定
  // proc_flg
  await page.$eval('input[name="proc_flg"]', el => el.value = "download");
  // OLDShoriTabMenu
  await page.$$eval('input[name="OLDShoriTabMenu"]', (els) => {
    els.forEach( el => el.value= "2")
  });
  // target,action
  await page.$eval('form[name="formlist"]', (form) => {
    form.action = "/studio/office/MemberEntry/OLDSTabSelect.php";
    form.target = "";
  })

  // formをsubmit
  await page.$eval('form[name="formlist"]', (form) => form.submit());

  await logger.info(`予約情報をダウンロードしました`);
  await page.waitForTimeout(1000);
  await browser.close();

  logger.info(`予約情報ダウンロード終了`);
  
};

module.exports = {
  dlyoyakuinfo,
};