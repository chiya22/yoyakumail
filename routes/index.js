const express = require("express");
const router = express.Router();

const m_yoyaku = require("../model/yoyakus");
const yoyakuweb = require("../util/yoyakuweb");
const common = require("../util/common");

router.get("/", function (req, res) {
  (async () => {
    res.render("index", {
    });
  })();
});

router.post("/yoyakus", function (req, res) {
  (async () => {
    const yyyymmdd_addupd_start = req.body.yyyymmdd_addupd_start;
    const yyyymmdd_addupd_end = req.body.yyyymmdd_addupd_end;
    const yyyymmdd_riyou_start = req.body.yyyymmdd_riyou_start;
    const yyyymmdd_riyou_end = req.body.yyyymmdd_riyou_end;

    // 予約システムより指定した期間の予約情報をダウンロード
    await yoyakuweb.dlyoyakuinfo(yyyymmdd_addupd_start,yyyymmdd_addupd_end,yyyymmdd_riyou_start,yyyymmdd_riyou_end);

    // ダウンロードディレクトリにあるファイル群を読み込む
    let targetfilename = "";
    fs.readdirSync("C:\\download\\customer").forEach((filename) => {

      // 予約情報ダウンロードファイルの場合
      if (filename.slice(0,11) === "kakuninsho_") {

        targetfilename = filename;

        // id設定用プレフィックス
        let max_id_yoyaku = 1;
        let yyyymmddhhmmss_proc = common.getTodayTime();

        // csvファイルはShift-JISのため
        const src = fs
          .createReadStream("c:\\download\\customer\\" + filename)
          .pipe(iconv.decodeStream("Shift_JIS"));

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
            let inObj = {};
            inObj.id = 'Y' + yyyymmddhhmmss_proc + ('00000' + max_id_yoyaku).slice(-5)
            inObj.id_kanri = linecontents[0];
            inObj.nm_room = linecontents[1];
            inObj.yyyymmdd_yoyaku = linecontents[2].replace(/\//g, "");
            inObj.time_start = linecontents[3];
            inObj.time_end = linecontents[4];
            inObj.price = linecontents[5];
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
            inObj.quantity = linecontents[20];
            inObj.tanka = linecontents[21];
            inObj.caution = linecontents[22];
            inObj.memo = linecontents[23];
            inObj.yyyymmdd_created = yyyymmddhhmmss_proc;
            (async () => {
              await m_yoyaku.insert(inObj);
              logger.info(`予約情報ID：${inObj.id}`);
            })();
            // id設定用プレフィックスに+1
            max_id_yoyaku += 1;
          }
        });

        // 終了時には処理した対象ファイルをリネームする
        src.on("end", () => {
          fs.rename(
            "C:\\download\\customer\\" + targetfilename,
            "C:\\download\\customer\\old_" + targetfilename,
            (err) => {
              if (err) {
                logger.info(
                  `${targetfilename}ファイルは存在しません：${new Date()}`
                );
                throw err;
              }
            }
          );
        });
      }
    });
    res.render("yoyakus", {
      yyyymmdd_addupd_start,
      yyyymmdd_addupd_end,
      yyyymmdd_riyou_start,
      yyyymmdd_riyou_end
    });
  })();
});





module.exports = router;
