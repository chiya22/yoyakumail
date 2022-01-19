const express = require("express");
const router = express.Router();

const m_searchinfos = require("../model/searchinfos");
const m_yoyakus = require("../model/yoyakus");

const yoyakuweb = require("../util/yoyakuweb");
const common = require("../util/common");

const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();

const fs = require("fs");
const iconv = require("iconv-lite");
const readline = require("readline");

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
    await m_searchinfos.remove(req.params.id); // 検索条件
    await m_yoyakus.removeByIdSearch(req.params.id); // 予約情報

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

    // 予約システムより指定した期間の予約情報をダウンロード
    await yoyakuweb.dlyoyakuinfo(yyyymmdd_addupd_start, yyyymmdd_addupd_end, yyyymmdd_riyou_start, yyyymmdd_riyou_end);

    // ダウンロードディレクトリにあるファイル群を読み込む
    let targetfilename = "";

    // ID用プレフィックス
    let yyyymmddhhmmss_proc = common.getTodayTime();

    await fs.readdirSync(process.env.YOYAKU_DL_PATH).forEach((filename) => {
      
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
            inObj.ymd_uketuke = linecontents[6].replace(/\//g, "");
            inObj.status_shiharai = linecontents[7];
            inObj.nm_nyuryoku = linecontents[8];
            inObj.nm_riyousha = linecontents[9];
            inObj.nm_room_seishiki = linecontents[10];
            inObj.type_room = linecontents[11];
            inObj.no_keiyakusha = linecontents[12];
            inObj.nm_keiyakusha = linecontents[13];
            inObj.nm_tantousha = linecontents[14];
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

            (async () => {
              await m_yoyakus.insert(inObj);
              logger.info(`予約情報ID：${inObj.id}`);
            })();
            // id設定用プレフィックスに+1
            max_id_yoyaku += 1;
          }
        });

        // 終了時には処理した対象ファイルをリネームする
        src.on("end", () => {
          fs.rename(process.env.YOYAKU_DL_PATH + "\\" + targetfilename, process.env.YOYAKU_DL_PATH + "\\old_" + targetfilename, (err) => {
            if (err) {
              logger.info(`${targetfilename}ファイルは存在しません：${new Date()}`);
              throw err;
            }
          });
        });
      }
    });

    // 検索条件を登録する
    // 検索条件用オブジェクト
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

    const retObjSearchinfo = await m_searchinfos.findPKey("Y" + yyyymmddhhmmss_proc);
    const retObjYoyakus = await m_yoyakus.findByIdSearch("Y" + yyyymmddhhmmss_proc);

    res.render("yoyakus", {
      searchinfo: retObjSearchinfo[0],
      yoyakus: retObjYoyakus,
    });
  })();
});

router.post("/kessais", function (req, res) {});

module.exports = router;
