const express = require("express");
const router = express.Router();

const m_searchinfos = require("../model/searchinfos");
const m_yoyakus = require("../model/yoyakus");

const common = require("../util/common")
const yoyakuinfo = require("../util/yoyakuinfo");

const log4js = require("log4js");
const yoyakus = require("../model/yoyakus");
const logger = log4js.configure("./config/log4js-config.json").getLogger();

// 検索条件の一覧を表示する
router.get("/", function (req, res) {
  (async () => {
    const searchinfos = await m_searchinfos.find();
    res.render("index", {
      searchinfos: searchinfos,
    });
  })();
});

// 検索条件の一覧から1つの検索条件をクリックした際に、その検索条件に紐づけ予約情報を表示する
router.get("/yoyakus/:id", function (req, res) {
  (async () => {

    // idより予約一覧を取得し、返却する
    const searchinfo = await m_searchinfos.findPKey(req.params.id); // 検索条件
    const yoyakus = await m_yoyakus.findByIdSearch(req.params.id); // 予約情報

    res.render("yoyakus", {
      searchinfo: searchinfo[0],
      yoyakus: yoyakus,
    });

  })();
});

// 対象検索条件IDの情報を削除する
router.get("/yoyakudelete/:id", function (req, res) {
  (async () => {

    // idより予約一覧を取得し、返却する
    await m_yoyakus.removeByIdSearch(req.params.id); // 予約情報
    await m_searchinfos.remove(req.params.id); // 検索条件

    // 検索条件情報の一覧を取得する
    await m_searchinfos.find();

    res.redirect("/");

  })();
});

// 検索条件の登録
router.post("/yoyakus", function (req, res) {
  (async () => {

    const yyyymmdd_addupd_start = req.body.yyyymmdd_addupd_start;
    const yyyymmdd_addupd_end = req.body.yyyymmdd_addupd_end;
    const yyyymmdd_riyou_start = req.body.yyyymmdd_riyou_start;
    const yyyymmdd_riyou_end = req.body.yyyymmdd_riyou_end;

    // ID用プレフィックス
    const yyyymmddhhmmss_proc = common.getTodayTime();

    // 予約システムより指定した期間の予約情報をダウンロード
    await yoyakuinfo.dlyoyakuinfo(yyyymmdd_addupd_start, yyyymmdd_addupd_end, yyyymmdd_riyou_start, yyyymmdd_riyou_end);

    // 検索条件情報を登録する
    let inObjSearch = {};
    inObjSearch.id = "Y" + yyyymmddhhmmss_proc;
    inObjSearch.yyyymmdd_addupd_start = yyyymmdd_addupd_start;
    inObjSearch.yyyymmdd_addupd_end = yyyymmdd_addupd_end;
    inObjSearch.yyyymmdd_riyou_start = yyyymmdd_riyou_start;
    inObjSearch.yyyymmdd_riyou_end = yyyymmdd_riyou_end;
    inObjSearch.status = "1";
    inObjSearch.yyyymmddhhmmss_created = yyyymmddhhmmss_proc;
    await m_searchinfos.insert(inObjSearch);
    logger.info(`検索条件情報ID：${inObjSearch.id}`);

    // ダウンロードしたファイルより予約情報をテーブルへ登録する
    let yoyakulist = [];
    yoyakulist = await yoyakuinfo.filetodb(yyyymmddhhmmss_proc);

    res.redirect("/");
  })();
});

router.post("/kessais", function (req, res) {});

module.exports = router;
