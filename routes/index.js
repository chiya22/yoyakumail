const express = require("express");
const router = express.Router();

const m_searchinfos = require("../model/searchinfos");
const m_yoyakus = require("../model/yoyakus");
const m_kessais = require("../model/kessais");
const m_logininfo = require("../model/logininfo");

const common = require("../util/common");
const yoyakuinfo = require("../util/yoyakuinfo");
const kessaiinfo = require("../util/kessaiinfo");
const mailinfo = require("../util/mailinfo");

const fs = require("fs");

const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();

/**
 * 検索情報の一覧を表示する
 *
 * ※初期表示は10件
 */
router.get("/", (req, res) => {
  (async () => {
    const searchinfos = await m_searchinfos.find();
    const logininfo = await m_logininfo.find();

    const curYyyymmdd = common.getTodayTime().slice(0, 8);
    const curYyyymmdd_minus1Day = common.getBeforeday();
    const curYyyymmdd_plus1Year = common.getNextYearday();

    res.render("index", {
      curYyyymmdd: curYyyymmdd,
      curYyyymmdd_minus1Day: curYyyymmdd_minus1Day,
      curYyyymmdd_plus1Year: curYyyymmdd_plus1Year,
      searchinfos: searchinfos,
      logininfo: logininfo,
    });
  })();
});

/**
 * 電算システムのログイン用パスワードを更新する
 */
router.post("/changepwd", (req, res) => {
  (async () => {
    const password = req.body.pass;
    try {
      await m_logininfo.update(password);
      req.flash("success", "パスワードを変更しました。");
      res.redirect("/");
    } catch (err) {
      req.flash("error", err.message);
      res.redirect("/");
    }
  })();
});

/**
 * 検索情報を新規登録し、検索情報に設定されている検索条件をもとに
 * 予約システムより予約情報をダウンロードし、当システムへ登録する
 *
 */
router.post("/yoyakus", (req, res) => {
  (async () => {
    const yyyymmdd_addupd_start = req.body.yyyymmdd_addupd_start;
    const yyyymmdd_addupd_end = req.body.yyyymmdd_addupd_end;
    const yyyymmdd_riyou_start = req.body.yyyymmdd_riyou_start;
    const yyyymmdd_riyou_end = req.body.yyyymmdd_riyou_end;

    // ID用プレフィックス
    const yyyymmddhhmmss_proc = common.getTodayTime();

    try {
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
      inObjSearch.yyyymmddhhmmss_created_yoyakus = yyyymmddhhmmss_proc;
      await m_searchinfos.insert(inObjSearch);
      logger.info(`検索条件情報ID：${inObjSearch.id}`);

      // ダウンロードしたファイルより予約情報をテーブルへ登録する
      await yoyakuinfo.filetodb(yyyymmddhhmmss_proc);

      req.flash("success", "予約情報を取得しました。");
      res.redirect("/");
    } catch (err) {
      req.flash("error", err);
      res.redirect("/");
    }
  })();
});

/**
 * 検索情報IDに紐づくすべての予約情報を取得する
 *
 * ▼パラメータ
 * id：検索情報ID
 */
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

/**
 * 予約情報を登録しなおし、登録した予約情報をもとに決済情報を作成しなおす
 *
 * ▼パラメータ
 * id：検索情報ID＋"_"＋顧客情報ID
 *
 * ▼
 * 予約情報編集画面（yoyakusform）から呼び出される
 * 予約日（yyyymmdd_yoyaku）は同一であることが前提
 */
router.post("/updyoyakus/:id", (req, res) => {
  (async () => {
    try {
      const id_search = req.params.id.split("_")[0];
      const id_customer = req.params.id.split("_")[1];

      if (!req.body.nm_room) {
        req.flash("error", "予約情報を入力してください。");
        res.redirect(`/yoyakus/edit/${id_search}_${id_customer}`);
        return;
      }

      // フォームからの入力値を受け取る
      const nm_room_list = Array.isArray(req.body.nm_room) ? req.body.nm_room : [req.body.nm_room];
      // const yyyymmdd_yoyaku_list = Array.isArray(req.body.yyyymmdd_yoyaku) ? req.body.yyyymmdd_yoyaku : [req.body.yyyymmdd_yoyaku];
      const time_start_list = Array.isArray(req.body.time_start) ? req.body.time_start : [req.body.time_start];
      const time_end_list = Array.isArray(req.body.time_end) ? req.body.time_end : [req.body.time_end];
      const price_list = Array.isArray(req.body.price) ? req.body.price : [req.body.price];
      const quantity_list = Array.isArray(req.body.quantity) ? req.body.quantity : [req.body.quantity];
      const type_room_list = req.body.type_list.split(","); // 通常会議室：0、ミーティングルーム：1、プロジェクトルーム：2、備品：9

      // 予約年月日が日付変換できるかチェック
      if (!common.isDate(req.body.yyyymmdd_yoyaku)) {
        req.flash("error", "予約情報の予約年月日はyyyymmdd形式で入力してください。" + req.body.yyyymmdd_yoyaku);
        res.redirect(`/yoyakus/edit/${id_search}_${id_customer}`);
        return;
      }

      // 部屋名/備品名が入力されているかチェック
      for (let j = 0; j < nm_room_list; j++) {
        if (!nm_room_list[j]) {
          req.flash("error", "部屋名/備品名は必ず入力してください。 " + (j + 1) + "行目：" + nm_room_list[j]);
          res.redirect(`/yoyakus/edit/${id_search}_${id_customer}`);
          return;
        }
      }

      // 開始時間は時間変換できるかチェック
      for (let j = 0; j < time_start_list.length; j++) {
        if (!common.isTime(time_start_list[j])) {
          req.flash("error", "予約情報の開始時間はhhmm形式で入力してください。 " + (j + 1) + "行目：" + time_start_list[j]);
          res.redirect(`/yoyakus/edit/${id_search}_${id_customer}`);
          return;
        }
      }

      // 終了時間は時間変換できるかチェック
      for (let j = 0; j < time_end_list.length; j++) {
        if (!common.isTime(time_end_list[j])) {
          req.flash("error", "予約情報の終了時間はhhmm形式で入力してください。 " + (j + 1) + "行目：" + time_end_list[j]);
          res.redirect(`/yoyakus/edit/${id_search}_${id_customer}`);
          return;
        }
      }

      // 価格が数値であるかチェック
      for (let j = 0; j < price_list.length; j++) {
        if ((!Number.isInteger(Number(price_list[j]))) || (Number(price_list[j]) < 0) || (Number(price_list[j]) > 9999999999)) {
          req.flash("error", "価格は11桁以内の正の数値で入力してください。 " + (j + 1) + "行目：" + price_list[j]);
          res.redirect(`/yoyakus/edit/${id_search}_${id_customer}`);
          return;
        }
      }

      // 数量が数値であるかチェック
      for (let j = 0; j < quantity_list.length; j++) {
        if ((!Number.isInteger(Number(quantity_list[j]))) || (Number(quantity_list[j]) < 0) || (Number(quantity_list[j]) > 9999999999)) {
          req.flash("error", "数量は11桁以内の正の数値で入力してください。 " + (j + 1) + "行目：" + quantity_list[j]);
          res.redirect(`/yoyakus/edit/${id_search}_${id_customer}`);
          return;
        }
      }

      // 既存決済情報の削除
      await m_kessais.remove(id_search, id_customer);

      // 既存予約情報の削除
      await m_yoyakus.removeByIdSearchAndIdCustomer(id_search, id_customer);

      // 検索情報ID単位での採番MAXを取得
      const maxinfo = await m_yoyakus.findMaxId(id_search);
      let maxnum = Number(maxinfo[0].maxnum.slice(-5)) + 1;

      const id_customer_new = `R${req.body.id_kanri}-${common.getYYYYMMDD(new Date())}-${req.body.yyyymmdd_yoyaku}`;

      // 入力情報をもとに予約情報を登録
      for (let i = 0; i < nm_room_list.length; i++) {
        // 追加用予約情報オブジェクト
        let inObjYoyaku = {};

        // フォームからの入力値を設定する
        inObjYoyaku.id = id_search + ("00000" + maxnum).slice(-5);
        maxnum += 1;
        // inObjYoyaku.id_customer = `R${req.body.id_kanri[0]}-${common.getYYYYMMDD(new Date())}-${req.body.yyyymmdd_yoyaku[i]}`
        inObjYoyaku.id_customer = id_customer_new;
        inObjYoyaku.nm_room = nm_room_list[i];
        inObjYoyaku.time_start = time_start_list[i];
        inObjYoyaku.time_end = time_end_list[i];
        inObjYoyaku.price = price_list[i];
        inObjYoyaku.nm_room_seishiki = nm_room_list[i];
        inObjYoyaku.type_room = type_room_list[i]; // 通常会議室：0、ミーティングルーム：1、プロジェクトルーム：2、備品：9
        inObjYoyaku.quantity = quantity_list[i];
        inObjYoyaku.yyyymmddhhmmss_created = common.getTodayTime();

        // 共通項目のためリストの最初の項目値を設定
        inObjYoyaku.id_search = id_search;
        inObjYoyaku.id_kanri = req.body.id_kanri;
        inObjYoyaku.yyyymmdd_yoyaku = req.body.yyyymmdd_yoyaku;
        inObjYoyaku.yyyymmdd_uketuke = common.getYYYYMMDD(new Date());
        inObjYoyaku.status_shiharai = "未";
        inObjYoyaku.nm_nyuryoku = "システム補正";
        inObjYoyaku.nm_riyousha = req.body.nm_riyousha;
        inObjYoyaku.no_keiyakusha = req.body.no_keiyaku;
        inObjYoyaku.nm_keiyakusha = req.body.nm_keiyaku;
        inObjYoyaku.nm_tantousha = req.body.nm_tantousha;
        inObjYoyaku.telno = req.body.telno;
        inObjYoyaku.faxno = req.body.faxno;
        inObjYoyaku.email = req.body.email;
        inObjYoyaku.kubun = "";
        inObjYoyaku.address = req.body.address;
        inObjYoyaku.tanka = 0;
        inObjYoyaku.caution = "";
        inObjYoyaku.memo = "";
        inObjYoyaku.yyyymmddhhmmss_created = common.getTodayTime();

        await m_yoyakus.insert(inObjYoyaku);
      }

      // 予約情報をもとに、決済情報を登録する
      await m_kessais.insertfromyoyakus(id_search, id_customer_new);

      // ファイルへ書き出す
      const outFilePath = await kessaiinfo.outputFile(id_search, id_customer_new);

      // 電算システムへアップロードする
      retValue = await kessaiinfo.upkessaiinfo(`${id_search}_${id_customer_new}`, outFilePath);
      if (retValue.includes("エラー")) {
        console.log(retValue.replace(/\s+/g, ""));
        req.flash("error", retValue.replace(/\s+/g, ""));
        res.redirect("/");
      } else {
        // 電算システムでURLが付与されるまで待機
        // await common.sleep(process.env.WAITTIME);
        await common.sleep(60000);

        // 電算システムよりダウンロードする
        retValue = await kessaiinfo.dlkessaiinfo(`${id_search}_${id_customer_new}`);
        if (retValue.includes("エラー")) {
          console.log(retValue.replace(/\s+/g, ""));
          req.flash("error", retValue.replace(/\s+/g, ""));
          res.redirect("/");

        } else {
          // ダウンロードしたファイルより、テーブルへ情報を反映する
          // 検索情報IDのみ渡す　顧客情報IDはダウンロードファイルの中に含まれているため
          await kessaiinfo.updkessaiinfo(id_search, retValue);

          await common.sleep(5000);

          // ▼コンビニ決済URLが取得できているかチェック！

          // 検索IDをキーに決済情報を取得する
          const retObj = await m_kessais.findPKey(id_search, id_customer_new);

          // コンビニ決済用URLが取得できている場合
          if (retObj.url_cvs) {
            // メール文章を作成する
            await mailinfo.setMailContent(id_search, id_customer_new);

            req.flash("success", `予約情報を更新しました。(${id_search}_${id_customer_new})`);
            res.redirect(`/kessai/${id_search}_${id_customer_new}`);

          // コンビニ決済用URLが取得できていない場合
          } else {
            // 決済情報がある場合は削除する
            await m_kessais.remove(req.params.id);

            req.flash("error", `決済情報の取得に取得しました。時間をおいて再度処理を行ってください。(${id_search}_${id_customer_new})`);
            res.redirect("/");
          }
        }
      }
    } catch (error) {
      console.log(error);
      req.flash("error", error.message);
      res.redirect("/");
    }
  })();
});

/**
 * 予約情報を取得する
 *
 * ▼パラメータ
 * id：予約情報ID
 *
 */
router.get("/yoyaku/:id", (req, res) => {
  (async () => {
    // idより予約情報を取得し、返却する
    const yoyaku = await m_yoyakus.findPKey(req.params.id); // 予約情報

    res.render("yoyaku", {
      yoyaku: yoyaku,
    });
  })();
});

/**
 * 検索情報IDに紐づく情報（予約情報、決済情報、検索情報）を削除する
 *
 * ▼パラメータ
 * id：検索情報ID
 *
 */
router.get("/yoyakudelete/:id", (req, res) => {
  (async () => {
    try {
      // idより各情報を削除する
      await m_yoyakus.removeByIdSearch(req.params.id); // 予約情報
      await m_kessais.remove(req.params.id); // 決済情報
      await m_searchinfos.remove(req.params.id); // 検索条件

      // 請求書PDFが存在する場合は削除する
      const dirpath = `public/pdf/${req.params.id}`;
      if (fs.existsSync(dirpath)) {
        fs.rmdirSync(dirpath, { recursive: true });
      }

      // 検索条件情報の一覧を取得する
      await m_searchinfos.find();

      req.flash("success", `検索条件情報を削除しました。(${req.params.id})`);
      res.redirect("/");
    } catch (error) {
      req.flash("error", error.message);
      res.redirect("/");
    }
  })();
});

/**
 * 検索情報IDに紐づくすべての決済情報を対象に、
 * 予約情報を取得し、決済情報の作成を行う
 *
 * ▼パラメータ
 * id：検索情報ID
 *
 */
router.get("/kessaiscreate/:id", (req, res) => {
  (async () => {
    try {
      let retValue = "";

      // 前回処理時の決済情報がある場合は削除する
      await m_kessais.remove(req.params.id);

      // 予約情報をもとに、決済情報を登録する
      await m_kessais.insertfromyoyakus(req.params.id);

      // ファイルへ書き出す
      const outFilePath = await kessaiinfo.outputFile(req.params.id);

      // 電算システムへアップロードする
      retValue = await kessaiinfo.upkessaiinfo(req.params.id, outFilePath);
      if (retValue.includes("エラー")) {
        console.log(retValue.replace(/\s+/g, ""));
        req.flash("error", retValue.replace(/\s+/g, ""));
        res.redirect("/");
      } else {
        // 電算システムでURLが付与されるまで待機
        // await common.sleep(process.env.WAITTIME);
        await common.sleep(60000);

        // 電算システムよりダウンロードする
        retValue = await kessaiinfo.dlkessaiinfo(req.params.id);
        if (retValue.includes("エラー")) {
          console.log(retValue.replace(/\s+/g, ""));
          req.flash("error", retValue.replace(/\s+/g, ""));
          res.redirect("/");
        } else {
          // ダウンロードしたファイルより、テーブルへ情報を反映する
          await kessaiinfo.updkessaiinfo(req.params.id, retValue);

          await common.sleep(5000);

          // 検索IDをキーに決済情報を取得する
          const retObj = await m_kessais.findByIdSearch(req.params.id);

          // コンビニ決済用URLが取得できている場合
          if (retObj[0].url_cvs) {
            // メール文章を作成する
            await mailinfo.setMailContent(req.params.id);

            // 検索条件情報のステータスを更新する
            await m_searchinfos.updateStatusAndTime(req.params.id, "2", common.getTodayTime());

            req.flash("success", `決済情報を取得しました。(${req.params.id})`);
            res.redirect("/");

            // コンビニ決済用URLが取得できていない場合
          } else {
            // 決済情報がある場合は削除する
            await m_kessais.remove(req.params.id);

            req.flash("error", `決済情報の取得に取得しました。時間をおいて再度処理を行ってください。(${req.params.id})`);
            res.redirect("/");
          }
        }
      }
    } catch (error) {
      req.flash("error", error.message);
      res.redirect("/");
    }
  })();
});

/**
 * 検索情報IDをもとに、紐づくすべての決済情報を取得する
 *
 * ▼パラメータ
 * id：検索情報ID
 *
 */
router.get("/kessais/:id", (req, res) => {
  (async () => {
    // idより決済一覧を取得し、返却する
    const searchinfo = await m_searchinfos.findPKey(req.params.id); // 検索条件
    const kessais = await m_kessais.findByIdSearch(req.params.id); // 決済情報

    for (kessai of kessais) {
      kessai.yoyakus = await m_yoyakus.findByIdSearchAndCustomer(kessai.id_search, kessai.id_customer);
    }

    res.render("kessais", {
      searchinfo: searchinfo,
      kessais: kessais,
    });
  })();
});

/**
 * 決済情報一覧画面において指定した「コンビニ決済対象」「メール送信対象」「PDF添付対象」の情報を
 * 対象となる決済情報へ設定する
 *
 */
router.post("/kessais/update", (req, res) => {
  (async () => {
    try {
      // 更新値を取得
      const id_search_list = req.body.id_search;
      const id_customer_list = req.body.id_customer;
      const isCvs_list = req.body.isCvs;
      const isSendMail_list = req.body.isSendMail;
      const isPDF_list = req.body.isPDF;

      let moveTo;
      // 更新対象が1件だけの場合は、「xxxx_list」変数が配列とならない場合の対処
      if (id_search_list.join().length == 15) {
        await m_kessais.updatekessaisToisCvsAndisSendMail(id_search_list, id_customer_list, isCvs_list, isSendMail_list, isPDF_list);
        moveTo = id_search_list;
      } else {
        for (let i = 0; i < id_customer_list.length; i++) {
          await m_kessais.updatekessaisToisCvsAndisSendMail(id_search_list[i], id_customer_list[i], isCvs_list[i], isSendMail_list[i], isPDF_list[i]);
        }
        moveTo = id_search_list[0];
      }

      req.flash("success", "更新しました。");
      res.redirect(`/kessais/${moveTo}`);
    } catch (error) {
      req.flash("error", error.message);
      res.redirect(`/`);
    }
  })();
});

/**
 * 検索情報ID、顧客情報IDをもとに、決済情報（1件）を表示する
 *
 * ▼パラメータ
 * id：検索情報ID＋"_"＋顧客情報ID
 *
 */
router.get("/kessai/:id", (req, res) => {
  (async () => {
    const id_search = req.params.id.split("_")[0];
    const id_customer = req.params.id.split("_")[1];

    const kessai = await m_kessais.findPKey(id_search, id_customer);
    const yoyakus = await m_yoyakus.findByIdSearchAndCustomer(id_search, id_customer);
    const searchinfo = await m_searchinfos.findPKey(id_search);

    res.render("kessai", {
      no_keiyaku: yoyakus[0].no_keiyaku,
      kessai: kessai,
      yoyakus: yoyakus,
      searchinfo: searchinfo,
    });
  })();
});

/**
 * 決済情報画面（kessai）から予約情報編集画面（yoyakusform）へ遷移する
 *
 * ▼パラメータ
 * id：検索情報ID＋"_"＋顧客情報ID
 */
router.get("/yoyakus/edit/:id", (req, res) => {
  (async () => {
    const id_search = req.params.id.split("_")[0];
    const id_customer = req.params.id.split("_")[1];

    const yoyakus = await m_yoyakus.findByIdSearchAndCustomer(id_search, id_customer);

    res.render("yoyakusform", {
      yoyakus: yoyakus,
    });
  })();
});

/**
 * 決済情報画面（kessai）から決済情報編集画面（kessaiform）へ遷移する
 *
 * ▼パラメータ
 * id：検索情報ID＋"_"＋顧客情報ID
 *
 */
router.get("/kessai/edit/:id", (req, res) => {
  (async () => {
    const id_search = req.params.id.split("_")[0];
    const id_customer = req.params.id.split("_")[1];

    const kessai = await m_kessais.findPKey(id_search, id_customer);

    const yoyakus = await m_yoyakus.findByIdSearchAndCustomer(id_search, id_customer);

    res.render("kessaiform", {
      no_keiyaku: yoyakus[0].no_keiyaku,
      yoyakus: yoyakus,
      kessai: kessai,
    });
  })();
});

/**
 * 決済情報編集画面（kessaiform）において編集したメール文を決済情報へ反映する
 *
 */
router.post("/kessai/save", (req, res) => {
  (async () => {
    try {
      // 更新値を取得
      const id_search = req.body.id_search;
      const id_customer = req.body.id_customer;
      const mail_subject = req.body.mail_subject;
      const mail_body = req.body.mail_body;
      // const mail_body_cvs = req.body.mail_body_cvs;
      const isCvs = req.body.isCvs;

      await m_kessais.updatekessaisToMailBody(id_search, id_customer, isCvs, mail_subject, mail_body);

      req.flash("success", "メール文を更新しました。");
      res.redirect(`/kessai/${id_search}_${id_customer}`);
    } catch (error) {
      req.flash("error", error.message);
      res.redirect(`/kessai/${id_search}_${id_customer}`);
    }
  })();
});

/**
 * 検索情報IDに紐づいたすべての決済情報において、メールを送信する（メール送信対象のみ）
 *
 * ▼パラメータ
 * id：検索情報ID
 *
 */
router.get("/kessais/sendmail/:id", (req, res) => {
  (async () => {
    try {
      const id_search = req.params.id;

      // 決済情報の一覧を取得する
      const kessais = await m_kessais.findByIdSearch(id_search);

      // 1件でもコンビニ決済用のURLが取得できていればOK
      if (kessais[0].url_cvs) {
        // メール送信
        await mailinfo.sendMailByIdSearch(id_search);

        // 検索条件情報のステータスを更新する
        await m_searchinfos.updateStatusAndTime(req.params.id, "3", common.getTodayTime());

        req.flash("success", `すべてのメールを送信しました。(${id_search})`);
        res.redirect("/");
      } else {
        req.flash("error", "コンビニ決済用URLの取得に失敗しています。最初からやり直してください。");
        res.redirect("/");
      }
    } catch (error) {
      req.flash("error", error.message);
      res.redirect("/");
    }
  })();
});

/**
 * 検索情報ID＋顧客情報IDで指定した決済情報（1件）をメール送信する
 *
 * 【注意】
 * メール送信対象外でもメールは送信されます！
 *
 * ▼パラメータ
 * id：検索情報ID＋"_"＋顧客情報ID
 *
 */
router.get("/kessai/sendmail/:id", (req, res) => {
  (async () => {
    try {
      const id_search = req.params.id.split("_")[0];
      const id_customer = req.params.id.split("_")[1];

      await mailinfo.sendMail(id_search, id_customer);

      req.flash("success", `メールを送信しました。(${id_customer})`);
      res.redirect(`/kessai/${id_search}_${id_customer}`);
    } catch (error) {
      req.flash("error", error.message);
      res.redirect(`/kessai/${id_search}_${id_customer}`);
    }
  })();
});

module.exports = router;
