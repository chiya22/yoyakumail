const express = require("express");
const router = express.Router();

const m_searchinfos = require("../model/searchinfos");
const m_yoyakus = require("../model/yoyakus");
const m_kessais = require("../model/kessais");

const common = require("../util/common")
const yoyakuinfo = require("../util/yoyakuinfo");
const kessaiinfo = require("../util/kessaiinfo");

const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();

// 検索条件の一覧を表示する
router.get("/", (req, res) => {
  (async () => {
    const searchinfos = await m_searchinfos.find();
    res.render("index", {
      searchinfos: searchinfos,
    });
  })();
});

// 検索条件を新規登録し、対象となる予約情報をダウンロードして登録する
router.post("/yoyakus", (req, res) => {
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

// 検索条件に紐づく予約情報一覧を表示する
router.get("/yoyakus/:id", (req, res) => {
  (async () => {

    // idより予約一覧を取得し、返却する
    const searchinfo = await m_searchinfos.findPKey(req.params.id); // 検索条件
    const yoyakus = await m_yoyakus.findByIdSearch(req.params.id); // 予約情報

    res.render("yoyakus", {
      searchinfo: searchinfo,
      yoyakus: yoyakus,
    });

  })();
});

// 予約情報を取得する
router.get("/yoyaku/:id", (req,res) => {
  (async () => {

    // idより予約情報を取得し、返却する
    const yoyaku = await m_yoyakus.findPKey(req.params.id); // 予約情報

    res.render("yoyaku", {
      yoyaku: yoyaku,
    });
  })();
})

// 対象検索条件IDの情報を削除する
router.get("/yoyakudelete/:id", (req, res) => {
  (async () => {

    // idより予約一覧を取得し、返却する
    await m_yoyakus.removeByIdSearch(req.params.id); // 予約情報
    await m_kessais.removeByIdSearch(req.params.id);  // 決済情報
    await m_searchinfos.remove(req.params.id);       // 検索条件

    // 検索条件情報の一覧を取得する
    await m_searchinfos.find();

    res.redirect("/");

  })();
});

// 対象検索条件IDの情報をもとに決済を行う
router.get("/kessaiscreate/:id", (req,res) => {
  (async () => {

    // 予約情報をもとに、決済情報を登録する
    await m_kessais.insertfromyoyakus(req.params.id)

    // ファイルへ書き出す
    // const outFileName = await kessaiinfo.outputFile(req.params.id);
    
    // 電算システムへアップロードする
    // await kessaiinfo.upkessaiinfo(req.params.id, outFileName);

    // 電算システムよりダウンロードする
    const inFileName = await kessaiinfo.dlkessaiinfo(req.params.id);

    // ダウンロードしたファイルより、テーブルへ情報を反映する
    // await kessaiinfo.updkessaiinfo(req.params.id, inFileName)

    // 検索条件情報のステータスを更新する
    await m_searchinfos.updateStatus(req.params.id, '2');

    res.redirect("/");

  })();
});

// 検索条件に紐づく決済情報一覧を表示する
router.get("/kessais/:id", (req, res) => {
  (async () => {

    // idより決済一覧を取得し、返却する
    const searchinfo = await m_searchinfos.findPKey(req.params.id); // 検索条件
    const kessais = await m_kessais.findByIdSearch(req.params.id); // 決済情報

    res.render("kessais", {
      searchinfo: searchinfo,
      kessais: kessais,
    });

  })();
});

// 決済情報を表示する
router.get("/kessai/:id", (req,res) => {
  (async () => {

    const id_search = req.params.id.split("_")[0];
    const id_customer = req.params.id.split("_")[1];

    const kessai = await m_kessais.findPKey(id_search, id_customer);

    res.render("kessai", {
      kessai: kessai,
    });
  })();
});

module.exports = router;
