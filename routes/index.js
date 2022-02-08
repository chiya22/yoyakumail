const express = require("express");
const router = express.Router();

const m_searchinfos = require("../model/searchinfos");
const m_yoyakus = require("../model/yoyakus");
const m_kessais = require("../model/kessais");
const m_logininfo = require("../model/logininfo");

const common = require("../util/common")
const yoyakuinfo = require("../util/yoyakuinfo");
const kessaiinfo = require("../util/kessaiinfo");
const mailinfo = require("../util/mailinfo");

const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();

// 検索条件の一覧を表示する
router.get("/", (req, res) => {
  (async () => {

    const searchinfos = await m_searchinfos.find();
    const logininfo = await m_logininfo.find();

    const curYyyymmdd = common.getTodayTime().slice(0,8);
    const curYyyymmdd_minus1Day = common.getBeforeday();
    const curYyyymmdd_plus1Year = common.getNextYearday();

    res.render("index", {
      curYyyymmdd:curYyyymmdd,
      curYyyymmdd_minus1Day:curYyyymmdd_minus1Day,
      curYyyymmdd_plus1Year:curYyyymmdd_plus1Year,
      searchinfos: searchinfos,
      logininfo: logininfo,
    });
  })();
});

// ログイン用のパスワードを更新する
router.post("/changepwd", (req,res) => {
  (async () => {

    const password = req.body.pass;
    try {
      await m_logininfo.update(password);
      req.flash("success","パスワードを変更しました。");
      res.redirect("/");
      
    } catch (err) {
      req.flash("error",err.message);
      res.redirect("/");
    }
  })();
})

// 検索条件を新規登録し、対象となる予約情報をダウンロードして登録する
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
      let yoyakulist = [];
      yoyakulist = await yoyakuinfo.filetodb(yyyymmddhhmmss_proc);
      
      req.flash("success","予約情報を取得しました。");

      res.redirect("/");
    } catch (err) {
      req.flash("error",err);
      res.redirect("/");
    }

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

    try {
      // idより予約一覧を取得し、返却する
      await m_yoyakus.removeByIdSearch(req.params.id); // 予約情報
      await m_kessais.removeByIdSearch(req.params.id);  // 決済情報
      await m_searchinfos.remove(req.params.id);       // 検索条件

      // 検索条件情報の一覧を取得する
      await m_searchinfos.find();

      req.flash("success", `検索条件情報を削除しました。(${req.params.id})`);
      res.redirect("/");

    } catch (error) {
      req.flash("error", err.message);
      res.redirect("/");
    }

  })();
});

// 対象検索条件IDの情報をもとに決済を行う
router.get("/kessaiscreate/:id", (req,res) => {
  (async () => {

    try {

      let retValue = '';

      // 前回処理時の決済情報がある場合は削除する
      await m_kessais.removeByIdSearch(req.params.id);
  
      // 予約情報をもとに、決済情報を登録する
      await m_kessais.insertfromyoyakus(req.params.id)
  
      // ファイルへ書き出す
      const outFilePath = await kessaiinfo.outputFile(req.params.id);
      
      // 電算システムへアップロードする
      retvalue = await kessaiinfo.upkessaiinfo(req.params.id, outFilePath);
      if (retValue.includes("エラー")) {
        console.log(retValue);
        res.redirect("/");
      }
  
      // 電算システムでURLが付与されるまで待機
      // await common.sleep(process.env.WAITTIME);
      await common.sleep(10000);
  
      // 電算システムよりダウンロードする
      retValue = await kessaiinfo.dlkessaiinfo(req.params.id);
      if (retValue.includes("エラー")) {
        console.log(retValue);
        res.redirect("/");
      }
  
      // ダウンロードしたファイルより、テーブルへ情報を反映する
      await kessaiinfo.updkessaiinfo(req.params.id, retValue);
  
      await common.sleep(5000);
  
      // メール文章を作成する
      await mailinfo.setMailContent(req.params.id);
  
      // 検索条件情報のステータスを更新する
      await m_searchinfos.updateStatusAndTime(req.params.id, '2', common.getTodayTime());

      req.flash("success",`決済情報を取得しました。(${req.params.id})`);
      res.redirect("/");

    } catch (error) {
      req.flash("success",error.message);
      res.redirect("/");
    }

  })();
});

// 検索条件に紐づく決済情報一覧を表示する
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

// 決済情報一覧において「コンビニ決済対象」「メール送信対象」を更新する
router.post("/kessais/update", (req,res) => {
  (async () => {

    try {
      // 更新値を取得
      const id_search_list = req.body.id_search;
      const id_customer_list = req.body.id_customer;
      const isCvs_list = req.body.isCvs;
      const isSendMail_list = req.body.isSendMail;

      for (let i = 0; i < id_customer_list.length; i++) {
        await m_kessais.updatekessaisToisCvsAndisSendMail(id_search_list[i], id_customer_list[i], isCvs_list[i], isSendMail_list[i]);
      }

      req.flash("success","更新しました。");
      res.redirect(`/kessais/${id_search_list[0]}`);

    } catch (error) {
      req.flash("error",error.message);
      res.redirect(`/kessais/${id_search_list[0]}`);
    }

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

// 検索情報IDに紐づいた決済情報すべてに対してメールを送信する
router.get("/kessais/sendmail/:id", (req,res) => {
  (async () => {

    try {

      const id_search = req.params.id;
      await mailinfo.sendMailByIdSearch(id_search);
  
      // 検索条件情報のステータスを更新する
      await m_searchinfos.updateStatusAndTime(req.params.id, '3', common.getTodayTime());
  
      req.flash("success", `すべてのメールを送信しました。(${id_search})`);
      res.redirect("/");

    } catch (error) {
      req.flash("error", error.message);
      res.redirect("/");
    }

  })();
});

// 決済情報をメール送信する
router.get("/kessai/sendmail/:id", (req,res) => {
  (async () => {

    try {
      const id_search = req.params.id.split("_")[0];
      const id_customer = req.params.id.split("_")[1];
  
      await mailinfo.sendMail(id_search, id_customer);
  
      req.flash("success",`メールを再送信しました。(${id_customer})`)
      res.redirect(`/kessai/${id_search}_${id_customer}`);
  
    } catch (error) {
      req.flash("error", error.message);
      res.redirect(`/kessai/${id_search}_${id_customer}`);
    }

  })();
});


module.exports = router;
