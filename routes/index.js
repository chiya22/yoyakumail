const express = require("express");
const router = express.Router();

const m_searchinfos = require("../model/searchinfos");
const m_yoyakus = require("../model/yoyakus");
const m_kessais = require("../model/kessais");
const m_logininfo = require("../model/logininfo");
const m_sq = require("../model/sq");

const common = require("../util/common");
const yoyakuinfo = require("../util/yoyakuinfo");
const kessaiinfo = require("../util/kessaiinfo");
const mailinfo = require("../util/mailinfo");

const seikyuinfo = require("../util/seikyuinfo");


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
    const searchinfos = await m_searchinfos.findlimit(100);
    // const searchinfos = await m_searchinfos.find();
    const logininfo = await m_logininfo.find();

    const curYyyymmdd = common.getTodayTime().slice(0, 8);
    const curYyyymmdd_minus1Day = common.getBeforeday();
    const curYyyymmdd_plus1Day = common.getAfterday();
    const curYyyymmdd_plus1Year = common.getNextYearday();

    res.render("index", {
      curYyyymmdd: curYyyymmdd,
      curYyyymmdd_minus1Day: curYyyymmdd_minus1Day,
      curYyyymmdd_plus1Year: curYyyymmdd_plus1Year,
      curYyyymmdd_plus1Day: curYyyymmdd_plus1Day,
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
      inObjSearch.id = "S" + yyyymmddhhmmss_proc;
      inObjSearch.yyyymmdd_addupd_start = yyyymmdd_addupd_start;
      inObjSearch.yyyymmdd_addupd_end = yyyymmdd_addupd_end;
      inObjSearch.yyyymmdd_riyou_start = yyyymmdd_riyou_start;
      inObjSearch.yyyymmdd_riyou_end = yyyymmdd_riyou_end;
      inObjSearch.status = "1";
      inObjSearch.yyyymmddhhmmss_created_yoyakus = yyyymmddhhmmss_proc;
      inObjSearch.yyyymmddhhmmss_created_kessais = "";
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
 * 予約情報を取得する
 * id：予約情報ID
*/
router.get("/yoyaku/:id", (req, res) => {
  (async () => {
    const yoyaku = await m_yoyakus.findPKey(req.params.id); // 予約情報
    const searchinfo = await m_searchinfos.findPKey(yoyaku.id_search); // 検索情報
    res.render("yoyaku", {
      yoyaku: yoyaku,
      searchinfo: searchinfo,
    });
  })();
});

/**
 * 検索情報IDに紐づく情報（予約情報、決済情報、検索情報）を削除する
 * id：検索情報ID
 */
router.get("/searchdelete/:id", (req, res) => {
  (async () => {
    try {
      // idより各情報を削除する
      await m_yoyakus.removeByIdSearch(req.params.id); // 予約情報
      await m_kessais.remove(req.params.id); // 決済情報
      await m_searchinfos.remove(req.params.id); // 検索条件
      
      // 請求書PDFが存在する場合は削除する
      const dirpath = `public/pdf/${req.params.id}`;
      if (fs.existsSync(dirpath)) {
        // fs.rmdirSync(dirpath, { recursive: true });
        fs.rmSync(dirpath, { recursive: true });
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
 * 検索情報IDに紐づくすべての決済情報を対象に、予約情報を取得し、決済情報の作成を行う
 * id：検索情報ID
*/
router.get("/kessaiscreate/:id", (req, res) => {
  (async () => {
    try {
      let retValue = "";
      const id_search = req.params.id

      // 前回処理時の決済情報がある場合は削除する
      await m_kessais.remove(id_search);
      
      // 検索情報IDをキーに予約情報を集約（GroupBy）した決済情報を取得する
      const retObjkessais = await m_kessais.selectFromYoyakus(id_search);
      let id_max_kessai = 1

      // 取得した決済情報に決済IDを付与し登録する
      for (let i=0; i<retObjkessais.length; i++) {

        // 決済情報IDを採番し、決済情報を登録する
        const retObjKessaiSq = await m_sq.selectSqKessai();
        retObjkessais[i].id = retObjKessaiSq.id;

        // 消費税率によって集計地を設定する
        // ※予約システムから取得した時点での予約情報の場合はすべて10%
        retObjkessais[i].price_10per_total = retObjkessais[i].price / (1.1);
        retObjkessais[i].tax_10per_total = retObjkessais[i].price / (1 + 0.1) * 0.1;
        retObjkessais[i].price_8per_total = 0;
        retObjkessais[i].tax_8per_total = 0;
        retObjkessais[i].price_0per_total = 0;
        retObjkessais[i].tax_0per_total = 0;
        
        await m_kessais.insert(retObjkessais[i]);

        // 予約情報に決済情報IDを設定する
        await m_yoyakus.updateByIdSearchAndIdCustomer(retObjkessais[i].id,retObjkessais[i].id_search,retObjkessais[i].id_customer)
        id_max_kessai += 1;

      }

      // 電算システムへCSVコード払い出ししてもらうための要求ファイルを書き出す
      // 請求額が0円の場合は、nullが返却される
      const outFilePath = await kessaiinfo.outputFile(id_search);
      if (outFilePath !== null){
        // 請求額が1円以上の場合は、電算システムへCSVコードを取得し、決済情報へ反映する
        // 電算システムへアップロードする
        retValue = await kessaiinfo.upkessaiinfo(id_search, outFilePath);
        if (retValue.includes("エラー")) {
          console.log(retValue.replace(/\s+/g, ""));
          req.flash("error", retValue.replace(/\s+/g, ""));
          res.redirect("/");
          return;
        } else {
          // 電算システムでURLが付与されるまで待機
          // await common.sleep(process.env.WAITTIME);
          await common.sleep(30000);
          
          // 電算システムよりダウンロードする
          retValue = await kessaiinfo.dlkessaiinfo(id_search);
          if (retValue.includes("エラー")) {
            console.log(retValue.replace(/\s+/g, ""));
            req.flash("error", retValue.replace(/\s+/g, ""));
            res.redirect("/");
            return;

          } else {

            // await common.sleep(60000);
            // ダウンロードしたファイルより、テーブルへ情報を反映する
            // retValueは電算システムよりダウンロードしたファイル名
            await kessaiinfo.updkessaiinfo(id_search, retValue);

            //  検索情報IDをキーに予約情報リストを取得し、その予約情報リストに紐づく決済IDのリストを作成する
            // const result_rows = await m_yoyakus.findIdKessaiByIdSearch(id_search);
            const kessais = await m_kessais.findByIdSearch(id_search);

              //　それぞれの請求情報に対する請求書PDFを作成し、決済情報へ反映する
            try{
              for (const kessai of kessais) {
                await seikyuinfo.createSeikyuPDF(kessai.id);
              }
            } catch (err) {
              req.flash("error", err.message); // ← ここでエラーメッセージを画面に渡す
              res.redirect("/");
              return
            }
          }
        }
      }
          
      // メール文章を作成する
      await mailinfo.setMailContent(id_search);
        
      // 検索条件情報のステータスを更新する
      await m_searchinfos.updateStatusAndTime(id_search, "2", common.getTodayTime());

      req.flash("success", `決済情報を取得しました。(${id_search})`);
      res.redirect("/");

    } catch (error) {
      // 決済情報がある場合は削除する
      await m_kessais.remove(id_search);
      req.flash("error", `決済情報の取得に失敗しました。時間をおいて再度処理を行ってください。(${id_search}：${error.message})`);
      res.redirect("/");
    }
  })();
});

/**
 * 予約情報を登録しなおし、登録した予約情報をもとに決済情報を作成しなおす
 *
 * id：決済情報ID
 *
 * ▼
 * 予約情報編集画面（yoyakusform）から呼び出される
 * 予約日（yyyymmdd_yoyaku）は同一であることが前提
 */
router.post("/updyoyakus/:id", (req, res) => {
  (async () => {
    try {
      const id_kessai = req.params.id;

      if (!req.body.nm_room) {
        req.flash("error", "予約情報を入力してください。");
        res.redirect(`/yoyakus/edit/${id}`);
        return;
      }

      // フォームからの入力値を受け取る
      const id_search = req.body.id_search;
      const id_customer = req.body.id_customer;
      const nm_room_list = Array.isArray(req.body.nm_room) ? req.body.nm_room : [req.body.nm_room];
      // const yyyymmdd_yoyaku_list = Array.isArray(req.body.yyyymmdd_yoyaku) ? req.body.yyyymmdd_yoyaku : [req.body.yyyymmdd_yoyaku];
      const time_start_list = Array.isArray(req.body.time_start) ? req.body.time_start : [req.body.time_start];
      const time_end_list = Array.isArray(req.body.time_end) ? req.body.time_end : [req.body.time_end];
      const price_list = Array.isArray(req.body.price) ? req.body.price : [req.body.price];
      const quantity_list = Array.isArray(req.body.quantity) ? req.body.quantity : [req.body.quantity];
      const status_shiharai_list = Array.isArray(req.body.status_shiharai) ? req.body.status_shiharai: [req.body.status_shiharai]; //支払い状況
      const type_room_list = req.body.type_list.split(","); // 通常会議室：0、ミーティングルーム：1、プロジェクトルーム：2、備品：9、その他：Z
      const per_tax_list = req.body.tax_list.split(","); // 10%：10、8%：8、0%：0
      // const nm_nyuryoku_list = req.body.nm_nyuryoku

      // 予約年月日が日付変換できるかチェック
      if (!common.isDate(req.body.yyyymmdd_yoyaku)) {
        req.flash("error", "予約情報の予約年月日はyyyymmdd形式で入力してください。" + req.body.yyyymmdd_yoyaku);
        res.redirect(`/yoyakus/edit/${id_kessai}`);
        return;
      }

      // 部屋名/備品名が入力されているかチェック
      for (let j = 0; j < nm_room_list; j++) {
        if (!nm_room_list[j]) {
          req.flash("error", "部屋名/備品名は必ず入力してください。 " + (j + 1) + "行目：" + nm_room_list[j]);
          res.redirect(`/yoyakus/edit/${id_kessai}`);
          return;
        }
      }

      // 開始時間は時間変換できるかチェック
      for (let j = 0; j < time_start_list.length; j++) {
        if (!common.isTime(time_start_list[j])) {
          req.flash("error", "予約情報の開始時間はhhmm形式で入力してください。 " + (j + 1) + "行目：" + time_start_list[j]);
          res.redirect(`/yoyakus/edit/${id_kessai}`);
          return;
        }
      }

      // 終了時間は時間変換できるかチェック
      for (let j = 0; j < time_end_list.length; j++) {
        if (!common.isTime(time_end_list[j])) {
          req.flash("error", "予約情報の終了時間はhhmm形式で入力してください。 " + (j + 1) + "行目：" + time_end_list[j]);
          res.redirect(`/yoyakus/edit/${id_kessai}`);
          return;
        }
      }

      // 価格が数値であるかチェック
      let totalPrice = 0;
      for (let j = 0; j < price_list.length; j++) {
        // if ((!Number.isInteger(Number(price_list[j]))) || (Number(price_list[j]) < 0) || (Number(price_list[j]) > 9999999999)) {
        if ((!Number.isInteger(Number(price_list[j]))) || (Number(price_list[j]) > 9999999999)) {
            // req.flash("error", "価格は11桁以内の正の数値で入力してください。 " + (j + 1) + "行目：" + price_list[j]);
          req.flash("error", "価格は11桁以内の数値で入力してください。 " + (j + 1) + "行目：" + price_list[j]);
          res.redirect(`/yoyakus/edit/${id_kessai}`);
          return;
        } else {
          totalPrice += Number(price_list[j]);
        }
      }
      if (totalPrice < 0) {
        req.flash("error", `請求金額がマイナスになっています。（請求金額：${totalPrice}）`);
        res.redirect(`/yoyakus/edit/${id_kessai}`);
        return;
      }

      // 数量が数値であるかチェック
      for (let j = 0; j < quantity_list.length; j++) {
        if (quantity_list[j]) {
          if ((!Number.isInteger(Number(quantity_list[j]))) || (Number(quantity_list[j]) < 0) || (Number(quantity_list[j]) > 9999999999)) {
            req.flash("error", "数量は11桁以内の正の数値で入力してください。 " + (j + 1) + "行目：" + quantity_list[j]);
            res.redirect(`/yoyakus/edit/${id_kessai}`);
            return;
          }
        } else {
          req.flash("error", "数量は11桁以内の正の数値で入力してください。 " + (j + 1) + "行目：" + quantity_list[j]);
          res.redirect(`/yoyakus/edit/${id_kessai}`);
          return;
        }
      }

      // 検索情報ID単位での採番MAXを取得
      // const maxinfo = await m_yoyakus.findMaxId(id_search);
      // let id_max_yoyaku = 1;
      // if (maxinfo[0].maxnum) {
      //   id_max_yoyaku = Number(maxinfo[0].maxnum.slice(-5)) + 1;
      // }

      // 新しい決済情報IDを取得する
      const retObjKessaiSq = await m_sq.selectSqKessai();
      const id_kessai_new = retObjKessaiSq.id;

      // 予約情報を取得する

      // 入力情報をもとに予約情報を登録
      for (let i = 0; i < nm_room_list.length; i++) {

        // 追加用予約情報オブジェクト
        let inObjYoyaku = {};

        // 新しい予約情報IDを採番する
        const retObjYoyakuSq = await m_sq.selectSqYoyaku();
        inObjYoyaku.id = retObjYoyakuSq.id;

        // フォームからの入力値を設定する
        inObjYoyaku.nm_room = nm_room_list[i];
        inObjYoyaku.time_start = time_start_list[i];
        inObjYoyaku.time_end = time_end_list[i];
        inObjYoyaku.price = price_list[i];
        inObjYoyaku.nm_room_seishiki = nm_room_list[i];
        inObjYoyaku.type_room = type_room_list[i]; // 通常会議室：0、ミーティングルーム：1、プロジェクトルーム：2、備品：9、その他：Z
        inObjYoyaku.quantity = quantity_list[i];
        inObjYoyaku.per_tax = per_tax_list[i];
        inObjYoyaku.status_shiharai = status_shiharai_list[i];
        inObjYoyaku.yyyymmddhhmmss_created = common.getTodayTime();

        // 共通項目のためリストの最初の項目値を設定
        inObjYoyaku.id_search = id_search;
        inObjYoyaku.id_customer = id_customer;
        inObjYoyaku.id_kanri = req.body.id_kanri;
        inObjYoyaku.yyyymmdd_yoyaku = req.body.yyyymmdd_yoyaku;
        inObjYoyaku.yyyymmdd_uketuke = common.getYYYYMMDD(new Date());
        inObjYoyaku.nm_nyuryoku = req.body.nm_nyuryoku.slice(0,3) === "コピー"?"コピーシステム補正":"システム補正";
        inObjYoyaku.nm_riyou = req.body.nm_riyou;
        inObjYoyaku.no_keiyaku = req.body.no_keiyaku;
        inObjYoyaku.nm_keiyaku = req.body.nm_keiyaku;
        inObjYoyaku.nm_tantou = req.body.nm_tantou;
        inObjYoyaku.telno = req.body.telno;
        inObjYoyaku.faxno = req.body.faxno;
        inObjYoyaku.email = req.body.email;
        inObjYoyaku.kubun = "";
        inObjYoyaku.address = req.body.address;
        inObjYoyaku.tanka = 0;
        inObjYoyaku.caution = "";
        inObjYoyaku.memo = "";
        inObjYoyaku.yyyymmddhhmmss_created = common.getTodayTime();

        // 新しい決済情報IDを設定する
        inObjYoyaku.id_kessai = id_kessai_new;

        await m_yoyakus.insert(inObjYoyaku);
      }

      // 決済情報の雛型を予約情報から取得
      const retObjkessai = await m_kessais.selectFromYoyakus(id_search, id_kessai_new);

      // 新しい決済情報を登録する
      retObjkessai[0].id = id_kessai_new;

      // 予約情報より各税率の料金合計を取得する
      const price_10per = await m_yoyakus.findPriceByKbnPerAndIdKessai(10,id_kessai_new);
      const price_8per = await m_yoyakus.findPriceByKbnPerAndIdKessai(8,id_kessai_new);
      const price_0per = await m_yoyakus.findPriceByKbnPerAndIdKessai(0,id_kessai_new);

      // 各税率の税抜き料金と消費税料金を設定する
      retObjkessai[0].price_10per_total = price_10per.length === 1? Math.ceil(price_10per[0].price / (1.1)): 0;
      retObjkessai[0].tax_10per_total = price_10per.length === 1? price_10per[0].price - Math.ceil(price_10per[0].price / (1.1)): 0;
      retObjkessai[0].price_8per_total =  price_8per.length === 1? Math.ceil(price_8per[0].price / (1.08)): 0;
      retObjkessai[0].tax_8per_total = price_8per.length === 1? price_8per[0].price - Math.ceil(price_8per[0].price / (1.08) ): 0;
      retObjkessai[0].price_0per_total =  price_0per.length === 1? price_0per[0].price: 0;
      retObjkessai[0].tax_0per_total = 0

      await m_kessais.insert(retObjkessai[0]);

      // 既存予約情報の削除
      await m_yoyakus.removeByIdKessai(id_kessai);

      // 既存決済情報の削除
      await m_kessais.remove(id_search, id_kessai);

      // ファイルへ書き出す
      const outFilePath = await kessaiinfo.outputFile(id_search, id_kessai_new);

      // 請求額が0円の場合は電算システムよりCSV支払い用コードを取得しない
      if (outFilePath !== null) {
        // 請求額が1円以上の場合、電算システムへアップロードする
        retValue = await kessaiinfo.upkessaiinfo(`${id_kessai_new}`, outFilePath);
        if (retValue.includes("エラー")) {
          console.log(retValue.replace(/\s+/g, ""));
          req.flash("error", retValue.replace(/\s+/g, ""));
          res.redirect("/");
        } else {

          // 電算システムでURLが付与されるまで待機
          await common.sleep(60000);

          // 電算システムよりダウンロードする
          retValue = await kessaiinfo.dlkessaiinfo(`${id_kessai_new}`);
          if (retValue.includes("エラー")) {
            console.log(retValue.replace(/\s+/g, ""));
            req.flash("error", retValue.replace(/\s+/g, ""));
            res.redirect("/");

          } else {
            // ダウンロードしたファイルより、テーブルへ情報を反映する
            // 検索情報IDのみ渡す　顧客情報IDはダウンロードファイルの中に含まれているため
            await kessaiinfo.updkessaiinfo(id_search, retValue);
          }

        }
      }

      // メール文章を作成する
      await mailinfo.setMailContent(id_search, id_kessai_new);

      req.flash("success", `予約情報を更新しました。(${id_kessai_new})`);
      res.redirect(`/kessai/${id_kessai_new}`);

    } catch (error) {

      // エラーが発生し、決済情報がある場合は削除する
      await m_kessais.remove(id_kessai_new);
      console.log(error);
      req.flash("error", `決済情報の取得に失敗しました。時間をおいて再度処理を行ってください。(${id_kessai_new}：${error.message})`);
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
      kessai.yoyakus = await m_yoyakus.findByIdKessai(kessai.id);
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
      const id_list = req.body.id;
      const id_search_list = req.body.id_search;
      // const id_customer_list = req.body.id_customer;
      const isCvs_list = req.body.isCvs;
      const isSendMail_list = req.body.isSendMail;
      const isPDF_list = req.body.isPDF;
      
      let moveTo;
      if (Array.isArray(id_list)) {
        // 更新対象が配列の場合
        for (let i = 0; i < id_list.length; i++) {
          await m_kessais.updatekessaisToisCvsAndisSendMail(id_list[i], isCvs_list[i], isSendMail_list[i], isPDF_list[i]);
        }
        moveTo = id_search_list[0];
      } else {
        // 更新対象が1件だけの場合は、「xxxx_list」変数が配列とならない場合の対処
        await m_kessais.updatekessaisToisCvsAndisSendMail(id_list, isCvs_list, isSendMail_list, isPDF_list);
        moveTo = id_search_list;
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
 * 決済情報IDをもとに、決済情報（1件）を表示する
 * id：決済情報ID
 */
router.get("/kessai/:id", (req, res) => {
  (async () => {
    const id_kessai = req.params.id;
    const kessai = await m_kessais.findPKey(id_kessai);
    const yoyakus = await m_yoyakus.findByIdKessai(id_kessai);
    const searchinfo = await m_searchinfos.findPKey(kessai.id_search);

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
 * id：決済情報ID
*/
router.get("/yoyakus/edit/:id", (req, res) => {
  (async () => {

    const id_kessai = req.params.id;

    const yoyakus = await m_yoyakus.findByIdKessai(id_kessai);

    res.render("yoyakusform", {
      yoyakus: yoyakus,
    });
  })();
});

/**
 * 決済情報画面（kessai）に表示されている決済情報と、その決済情報に紐づく予約情報を複製する
 *
 * ▼パラメータ
 * id：決済情報のid
 *
*/
router.get("/kessai/copy/:id", (req, res) => {
  (async () => {

    // COPY元を取得
    const kessai = await m_kessais.findPKey(req.params.id); //決済情報
    // const searchinfo = await m_searchinfos.findPKey(kessai.id_search); //検索情報
    const yoyakus = await m_yoyakus.findByIdKessai(req.params.id); //予約情報

    // COPY先の情報作成

    // 検索情報
    // const yyyymmddhhmmss_proc = common.getTodayTime();
    // const id_searchinfo = "S" + yyyymmddhhmmss_proc;
    // searchinfo.id = id_searchinfo;
    // await m_searchinfos.insert(searchinfo);

    // 決済情報
    const retObjKessaiSq = await m_sq.selectSqKessai();
    const id_kessai = retObjKessaiSq.id;
    kessai.id = id_kessai;
    // kessai.id_search = id_searchinfo;
    await m_kessais.insert(kessai);

    // 予約情報
    for (let i=0; i<yoyakus.length; i++) {
      const retObjYoyakuSq = await m_sq.selectSqYoyaku();
      const id_yoyaku = retObjYoyakuSq.id;;
      yoyakus[i].id = id_yoyaku;
      // yoyakus[i].id_search = id_searchinfo;
      yoyakus[i].id_kessai = id_kessai;
      yoyakus[i].nm_nyuryoku = "コピー";
      await m_yoyakus.insert(yoyakus[i]);
    }

    req.flash("success", "複製を行いました。");
    res.redirect(`/kessais/${kessai.id_search}`);
  
  })();
});

/**
 * 決済情報画面（kessai）に表示されている決済情報と、その決済情報に紐づく予約情報を削除する
 *
 * ▼パラメータ
 * id：決済情報のid
 *
*/
router.get("/kessai/remove/:id", (req, res) => {
  (async () => {

    //決済情報から検索情報IDを取得する
    const retObjKessai = await m_kessais.findPKey(req.params.id);
    const id_search = retObjKessai.id_search;

    //決済情報削除
    await m_kessais.remove(null, req.params.id);

    //予約情報削除
    await m_yoyakus.removeByIdKessai(req.params.id);

    req.flash("success", `削除しました。(${req.params.id})`);
    res.redirect(`/kessais/${id_search}`);
  
  })();
});

/**
 * 決済情報画面（kessai）から決済情報編集画面（kessaiform）へ遷移する
 *
 * ▼パラメータ
 * id：決済情報ID
 *
*/
router.get("/kessai/edit/:id", (req, res) => {
  (async () => {

    const kessai = await m_kessais.findPKey(req.params.id);
    const yoyakus = await m_yoyakus.findByIdKessai(req.params.id);

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
      const id = req.body.id;
      // const id_customer = req.body.id_customer;
      const mail_subject = req.body.mail_subject;
      const mail_body = req.body.mail_body;
      // const mail_body_cvs = req.body.mail_body_cvs;
      const isCvs = req.body.isCvs==='1'?req.body.isCvs:"";

      await m_kessais.updatekessaisToMailBody(id, isCvs, mail_subject, mail_body);

      req.flash("success", "メール文を更新しました。");
      res.redirect(`/kessai/${id}`);
    } catch (error) {
      req.flash("error", error.message);
      res.redirect(`/kessai/${id}`);
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

      // すべての決済情報がCSV対象かどうか判定
      const allCvs = kessais.every(k => k.isCvs === "1");

      // 1件でもコンビニ決済用のURLが取得できていればOK
      // もしくは、すべてCSV対象でなければメール送信可能
      if ((kessais[0].url_cvs) || !allCvs) {

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
 * 決済情報IDで指定した決済情報（1件）をメール送信する
 *
 * 【注意】
 * メール送信対象外でもメールは送信されます！
*
 * ▼パラメータ
 * id：決済情報ID
 *
*/
router.get("/kessai/sendmail/:id", (req, res) => {
  (async () => {
    try {

      await mailinfo.sendMail(req.params.id);

      req.flash("success", `メールを送信しました。(${req.params.id})`);
      res.redirect(`/kessai/${req.params.id}`);
    } catch (error) {
      req.flash("error", error.message);
      res.redirect(`/kessai/${req.params.id}`);
    }
  })();
});


/**
 * 新規予約登録情報画面（newyoyakuform）へ遷移する
 *
*/
router.get("/newyoyaku/new", (req, res) => {
  (async () => {
    res.render("newyoyakuform", {
    });
  })();
});

/**
 * 新規予約情報から予約情報を登録し、登録した予約情報をもとに決済情報を作成する
 *
 * ▼
 * 新規予約情報登録画面（newyoyakusform）から呼び出される
 */
router.post("/newyoyaku/add", (req, res) => {
  (async () => {
    try {

      if (!req.body.nm_room) {
        req.flash("error", "予約情報を入力してください。");
        res.redirect(`/newyoyaku/new`);
        return;
      }

      if ((!Number.isInteger(Number(req.body.no_keiyaku))) || (req.body.no_keiyaku.length !== 5)) {
        req.flash("error", "契約番号は5桁の数値で入力してください。" + req.body.no_keiyaku);
        res.redirect(`/newyoyaku/new`);
        return;
      }

      // 契約者名チェック
      if (!req.body.nm_keiyaku) {
        req.flash("error", "契約者名は必ず入力してください。" + req.body.nm_keiyaku);
        res.redirect(`/newyoyaku/new`);
        return;
      }

      // 明細
      const nm_room_list = Array.isArray(req.body.nm_room) ? req.body.nm_room : [req.body.nm_room];
      const time_start_list = Array.isArray(req.body.time_start) ? req.body.time_start : [req.body.time_start];
      const time_end_list = Array.isArray(req.body.time_end) ? req.body.time_end : [req.body.time_end];
      const price_list = Array.isArray(req.body.price) ? req.body.price : [req.body.price];
      const quantity_list = Array.isArray(req.body.quantity) ? req.body.quantity : [req.body.quantity];
      const type_room_list = req.body.type_list.split(","); // 通常会議室：0、ミーティングルーム：1、プロジェクトルーム：2、備品：9、その他：Z
      const per_tax_list = req.body.tax_list.split(","); // 10%：10、8%：8、0%：0

      // 予約年月日が日付変換できるかチェック
      if (!common.isDate(req.body.yyyymmdd_yoyaku)) {
        req.flash("error", "予約情報の予約年月日はyyyymmdd形式で入力してください。" + req.body.yyyymmdd_yoyaku);
        res.redirect(`/newyoyaku/new`);
        return;
      }

      // 部屋名/備品名が入力されているかチェック
      for (let j = 0; j < nm_room_list; j++) {
        if (!nm_room_list[j]) {
          req.flash("error", "部屋名/備品名は必ず入力してください。 " + (j + 1) + "行目：" + nm_room_list[j]);
          res.redirect(`/newyoyaku/new`);
          return;
        }
      }

      // 開始時間は時間変換できるかチェック
      for (let j = 0; j < time_start_list.length; j++) {
        if (time_start_list[j]) {
          if (!common.isTime(time_start_list[j])) {
            req.flash("error", "予約情報の開始時間はhhmm形式で入力してください。 " + (j + 1) + "行目：" + time_start_list[j]);
            res.redirect(`/newyoyaku/new`);
            return;
          }
        }
      }

      // 終了時間は時間変換できるかチェック
      for (let j = 0; j < time_end_list.length; j++) {
        if (time_end_list[j]) {
          if (!common.isTime(time_end_list[j])) {
            req.flash("error", "予約情報の終了時間はhhmm形式で入力してください。 " + (j + 1) + "行目：" + time_end_list[j]);
            res.redirect(`/newyoyaku/new`);
            return;
          }
        }
      }

      // 価格が数値であるかチェック
      let totalPrice = 0;
      for (let j = 0; j < price_list.length; j++) {
        // if ((!Number.isInteger(Number(price_list[j]))) || (Number(price_list[j]) < 0) || (Number(price_list[j]) > 9999999999)) {
        if ((!Number.isInteger(Number(price_list[j]))) || (Number(price_list[j]) > 9999999999)) {
            // req.flash("error", "価格は11桁以内の正の数値で入力してください。 " + (j + 1) + "行目：" + price_list[j]);
          req.flash("error", "価格は11桁以内の数値で入力してください。 " + (j + 1) + "行目：" + price_list[j]);
          res.redirect(`/newyoyaku/new`);
          return;
        } else {
          totalPrice += Number(price_list[j]);
        }
      }
      if (totalPrice < 0) {
        req.flash("error", `請求金額がマイナスになっています。（請求金額：${totalPrice}）`);
        res.redirect(`/newyoyaku/new`);
        return;
      }

      // 数量が数値であるかチェック
      for (let j = 0; j < quantity_list.length; j++) {
        if (quantity_list[j]) {
          if ((!Number.isInteger(Number(quantity_list[j]))) || (Number(quantity_list[j]) < 0) || (Number(quantity_list[j]) > 9999999999)) {
            req.flash("error", "数量は11桁以内の正の数値で入力してください。 " + (j + 1) + "行目：" + quantity_list[j]);
            res.redirect(`/newyoyaku/new`);
            return;
          }
        } else {
          req.flash("error", "数量は11桁以内の正の数値で入力してください。 " + (j + 1) + "行目：" + quantity_list[j]);
          res.redirect(`/newyoyaku/new`);
          return;
        }
      }

      // ▼検索情報を作成
      const yyyymmddhhmmss_proc = common.getTodayTime();
      let inObjSearch = {};
      inObjSearch.id = "S" + yyyymmddhhmmss_proc;
      inObjSearch.yyyymmdd_addupd_start = common.getYYYYMMDD(new Date());
      inObjSearch.yyyymmdd_addupd_end = "";
      inObjSearch.yyyymmdd_riyou_start = req.body.yyyymmdd_yoyaku;
      inObjSearch.yyyymmdd_riyou_end = "";
      inObjSearch.status = "4"; // 手作成のステータスとして「4」を設定　リファレンス）1：請求情報取得済み、2：決済情報取得済み、3：メール送信済み
      inObjSearch.yyyymmddhhmmss_created_yoyakus = yyyymmddhhmmss_proc;
      inObjSearch.yyyymmddhhmmss_created_kessais = yyyymmddhhmmss_proc;
      await m_searchinfos.insert(inObjSearch);

      // 決済情報IDを取得(id_kessai)
      const retObjKessaiSq = await m_sq.selectSqKessai();
      const id_kessai_new = retObjKessaiSq.id;

      // ▼予約情報を作成
      const id_kanri = "9" + ("0000000" + id_kessai_new).slice(-8); // 管理IDは「先頭9＋決済番号」とする
      const id_customer = "R" + id_kanri + "-" + req.body.yyyymmdd_yoyaku + "-" + common.getYYYYMMDD(new Date());

      for (let i = 0; i < nm_room_list.length; i++) {

        // 追加用予約情報オブジェクト
        let inObjYoyaku = {};

        // 新しい予約情報IDを採番する(id)
        const retObjYoyakuSq = await m_sq.selectSqYoyaku();
        inObjYoyaku.id = retObjYoyakuSq.id;

        // フォームからの入力値を設定する
        inObjYoyaku.nm_room = nm_room_list[i];
        inObjYoyaku.time_start = time_start_list[i];
        inObjYoyaku.time_end = time_end_list[i];
        inObjYoyaku.price = price_list[i];
        inObjYoyaku.nm_room_seishiki = nm_room_list[i];
        inObjYoyaku.type_room = type_room_list[i]; // 通常会議室：0、ミーティングルーム：1、プロジェクトルーム：2、備品：9、その他：Z
        inObjYoyaku.quantity = quantity_list[i];
        inObjYoyaku.per_tax = per_tax_list[i];
        inObjYoyaku.status_shiharai = "未";
        inObjYoyaku.yyyymmddhhmmss_created = common.getTodayTime();

        // 共通項目のためリストの最初の項目値を設定
        inObjYoyaku.id_search = inObjSearch.id;
        inObjYoyaku.yyyymmdd_yoyaku = req.body.yyyymmdd_yoyaku;
        inObjYoyaku.yyyymmdd_uketuke = common.getYYYYMMDD(new Date());
        inObjYoyaku.id_kanri = id_kanri;
        inObjYoyaku.id_customer = id_customer;
        inObjYoyaku.nm_nyuryoku = "手作成";
        inObjYoyaku.nm_riyou = "";
        inObjYoyaku.no_keiyaku = req.body.no_keiyaku;
        inObjYoyaku.nm_keiyaku = req.body.nm_keiyaku;
        inObjYoyaku.nm_tantou = "";
        inObjYoyaku.telno = "";
        inObjYoyaku.faxno = "";
        inObjYoyaku.email = "";
        inObjYoyaku.kubun = "";
        inObjYoyaku.address = "";
        inObjYoyaku.tanka = 0;
        inObjYoyaku.caution = "";
        inObjYoyaku.memo = "";
        inObjYoyaku.yyyymmddhhmmss_created = common.getTodayTime();

        // 決済情報IDを設定する
        inObjYoyaku.id_kessai = id_kessai_new;

        // 予約情報の登録
        await m_yoyakus.insert(inObjYoyaku);
      }

      // ▼決済情報の作成
      let retObjkessai = {};
      retObjkessai.id = id_kessai_new;
      retObjkessai.id_customer = id_customer;
      retObjkessai.id_search = inObjSearch.id;
      retObjkessai.to_pay = "800";
      retObjkessai.nm_customer_1 = "";
      retObjkessai.nm_customer_2 = "";
      retObjkessai.telno = "";
      const retPrice = await m_yoyakus.findPriceByIdKessai(id_kessai_new);
      retObjkessai.price =  retPrice[0].price;
      retObjkessai.yyyymmdd_kigen = "";
      retObjkessai.result = "";
      retObjkessai.id_data = "";
      retObjkessai.url_cvs = "";
      retObjkessai.message = "";
      retObjkessai.nm_keiyaku = req.body.nm_keiyaku;
      retObjkessai.nm_tantou = "";
      retObjkessai.yyyymmdd_yoyaku = req.body.yyyymmdd_yoyaku;
      retObjkessai.yyyymmdd_uketuke = common.getYYYYMMDD(new Date());
      retObjkessai.email = "";
      retObjkessai.isCvs = "";
      retObjkessai.isSendMail = "";
      retObjkessai.isPDF = "";
      retObjkessai.mail_subject = "";
      retObjkessai.mail_body = "";
      retObjkessai.mail_body_cvs = "";
      // retObjkessai.yyyymmddhhmmss_sended_mail
      // retObjkessai.yyyymmddhhmmss_resended_mail

      // 予約情報より各税率の料金合計を取得する
      const price_10per = await m_yoyakus.findPriceByKbnPerAndIdKessai(10,id_kessai_new);
      const price_8per = await m_yoyakus.findPriceByKbnPerAndIdKessai(8,id_kessai_new);
      const price_0per = await m_yoyakus.findPriceByKbnPerAndIdKessai(0,id_kessai_new);

      // 各税率の税抜き料金と消費税料金を設定する
      retObjkessai.price_10per_total = price_10per.length === 1? Math.ceil(price_10per[0].price / (1.1)): 0;
      retObjkessai.tax_10per_total = price_10per.length === 1? price_10per[0].price - Math.ceil(price_10per[0].price / (1.1)): 0;
      retObjkessai.price_8per_total =  price_8per.length === 1? Math.ceil(price_8per[0].price / (1.08)): 0;
      retObjkessai.tax_8per_total = price_8per.length === 1? price_8per[0].price - Math.ceil(price_8per[0].price / (1.08) ): 0;
      retObjkessai.price_0per_total =  price_0per.length === 1? price_0per[0].price: 0;
      retObjkessai.tax_0per_total = 0

      // 決済情報の登録
      await m_kessais.insert(retObjkessai);

      // ▼請求書PDFの作成
      try {
        await seikyuinfo.createSeikyuPDF(retObjkessai.id);
      } catch (error) {
        req.flash("error", error.message);
        res.redirect("/");
        return;
      }

      req.flash("success", `予約情報・決済情報を登録しました。(${inObjSearch.id})`);
      res.redirect(`/`);
      return;

    } catch (error) {
      console.log(error);
      req.flash("error", error.message);
      res.redirect("/");
      return;
    }
  })();
});




module.exports = router;
