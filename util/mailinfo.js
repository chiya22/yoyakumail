const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();

const nodemailer = require('nodemailer');

const common = require("./common");

const m_kessais = require("../model/kessais");
const m_yoyakus = require("../model/yoyakus");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

/**
 * 決済情報からメール情報を作成し、決済情報へ範囲する
 * 決済情報IDが設定されている場合は、1件の決済情報を対象とする
 * 検索情報IDが設定されている場合は、検索情報IDに紐づくすべての決済情報を対象とする（１件から複数件）
 * 
 * @param {*} id_search 検索情報ID
 * @param {*} id_kessai 決済情報ID
 */
const setMailContent = async (id_search, id_kessai = null) => {

  if (id_kessai) {

    // 決済情報を取得する（1件）
    const kessai = await m_kessais.findPKey(id_kessai);

    // メール文を作成
    const inObj = await makeMailBody(kessai);

    // 決済情報を更新する
    await m_kessais.updatekessaisByMailinfo(inObj);

  } else {

    // 検索情報IDで決済情報を取得する
    const kessais = await m_kessais.findByIdSearch(id_search);

    // 各決済情報に対する処理
    let inObj = {};
    kessais.forEach((kessai) => {
      (async () => {
        // メール文を作成
        inObj = await makeMailBody(kessai);
        // 決済情報を更新
        await m_kessais.updatekessaisByMailinfo(inObj);
      })();
    });

 }
}

/**
 * 引数で渡した決済情報ををもとに、
 * メール文章を作成し、メール情報が格納されたオブジェクトを返却する
 * 
 * @param {*} kessai 決済情報
 * @returns inObj 決済情報ID、メールタイトル、メール本文が格納されたオブジェクト
 */
const makeMailBody = async (kessai) => {
  
  // 予約情報取得
  let yoyakus = await m_yoyakus.findByIdKessai(kessai.id);

  //　予約情報から明細情報を作成する
  let meisai = '';
  yoyakus.forEach( (yoyaku) => {
    if (yoyaku.type_room === '9') {
      meisai += yoyaku.nm_room + "(" + yoyaku.time_start.slice(0,2) + ":" + yoyaku.time_start.slice(-2) + "-" + yoyaku.time_end.slice(0,2) + ":" + yoyaku.time_end.slice(-2) + ") × " + yoyaku.quantity + "  " + yoyaku.price.toLocaleString() + "円(税込)\r\n"
    } else {
      meisai += yoyaku.nm_room + "(" + yoyaku.time_start.slice(0,2) + ":" + yoyaku.time_start.slice(-2) + "-" + yoyaku.time_end.slice(0,2) + ":" + yoyaku.time_end.slice(-2) + ")   " + yoyaku.price.toLocaleString() + "円(税込)\r\n"
    }
  });

  let mailbody_before = '';
  let mailbody = '';
  let mailbody_cvs = '';
  let mailbody_after = '';

  mailbody_before += "＜会議室・ミーティングルーム予約確認書＞\r\n";
  mailbody_before += "この度はちよだプラットフォームスクウェア会議室を\r\n";
  mailbody_before += "ご予約いただきありがとうございます。\r\n"
  mailbody_before += "下記の内容にて承りましたのでご確認ください。\r\n"
  mailbody_before += "ご請求書は別途添付しております。\r\n"
  mailbody_before += "\r\n"

  // ◆契約者名の編集
  // （表示名：XXX）があれば削除する　例）■　１２３４　株式会社ＡＡＡ（表示名：ＢＢＢ）　⇒　■　１２３４　株式会社ＡＡＡ
  let nm_keiyaku = kessai.nm_keiyaku;
  if (nm_keiyaku.indexOf("（表示") !== -1) {
    nm_keiyaku = kessai.nm_keiyaku.slice(0,kessai.nm_keiyaku.indexOf("（表示"));
  }
  // 「登録区分　登録名」の場合に「登録名」を抜き出す　例）■　１２３４　株式会社ＡＡＡ　⇒　１２３４　株式会社ＡＡＡ
  if (nm_keiyaku.indexOf("　") !== -1) {
    nm_keiyaku = nm_keiyaku.slice(nm_keiyaku.indexOf("　")+1);
  }
  // 「入居番号　登録名」の場合に「登録名」を抜き出す　例）１２３４　株式会社ＡＡＡ　⇒　株式会社ＡＡＡ
  if (!isNaN(common.zenkakuNum2hankakuNum(nm_keiyaku.slice(0,4)))) {
    nm_keiyaku = nm_keiyaku.slice(5);
  }

  // ◆担当者名の編集
  const s_nm_tantou = kessai.nm_tantou?kessai.nm_tantou:"";

  // 会社名と担当者名が同一の場合は、会社名のみを宛先名として出力する
  if (nm_keiyaku.trim().replace(" ","").replace("　","") !== s_nm_tantou.trim().replace(" ","").replace("　","")) {
    mailbody_before += "ご利用者名： " + nm_keiyaku.trim() + " " + s_nm_tantou.trim() + "　様\r\n"
  } else {
    mailbody_before += "ご利用者名： " + nm_keiyaku.trim() + "　様\r\n"
  }
  mailbody_before += "ご連絡先： " + kessai.email + "\r\n"
  mailbody_before += `ご予約受付日：${common.getTodayTime().slice(0,4)}年${common.getTodayTime().slice(4,6)}月${common.getTodayTime().slice(6,8)}日\r\n`
  mailbody_before += `ご利用日： ${kessai.yyyymmdd_yoyaku.slice(0,4)}年${kessai.yyyymmdd_yoyaku.slice(4,6)}月${kessai.yyyymmdd_yoyaku.slice(6,8)}日\r\n`
  mailbody_before += "利用施設：\r\n"
  mailbody_before += meisai + "\r\n\r\n"
  mailbody_before += "ご利用料金合計： " + kessai.price.toLocaleString() + "円(税込)\r\n"
  mailbody_before += "\r\n"

  if (kessai.price !== 0) {
    // メール本文（コンビニ決済対象）
    mailbody_cvs += "使用料は、【7日以内】に下記の手順に従い、\r\n"
    mailbody_cvs += "コンビニ決済、銀行振込または現金にてお願いいたします。\r\n"
    mailbody_cvs += "尚、必ずご利用時までにお支払いください。\r\n"
    mailbody_cvs += "ご利用日が７日以内の場合、当日受付でもお支払いいただけます。\r\n"
    mailbody_cvs += "\r\n"
    mailbody_cvs += "【コンビニ決済】\r\n"
    mailbody_cvs += "　下記URLより決済コードを取得の上、店頭にてお支払いください。\r\n"
    mailbody_cvs += "　※手数料は発生しません。\r\n"
    mailbody_cvs += "\r\n"
    mailbody_cvs += "　" + kessai.url_cvs + "\r\n"
    mailbody_cvs += "\r\n"
    mailbody_cvs += "　※携帯電話等からもご利用いただけます。\r\n"
    mailbody_cvs += "\r\n"

    // メール本文（コンビニ決済対象外）
    mailbody += "使用料は、【7日以内】に下記の手順に従い、\r\n"
    mailbody += "銀行振込または現金にてお願いいたします。\r\n"
    mailbody += "尚、必ずご利用時までにお支払いください。\r\n"
    mailbody += "ご利用日が７日以内の場合、当日受付でもお支払いいただけます。\r\n"
    mailbody += "\r\n"
    mailbody += "(コンビニ決済はオンライン予約の場合のみ承っております。)\r\n"
    mailbody += "\r\n"

    // 共通部分
    mailbody_after += "【銀行振込】\r\n"
    mailbody_after += "　三菱UFJ銀行　東京営業部\r\n"
    mailbody_after += "　普通　6974978　プラットフォームサービス(カ\r\n"
    mailbody_after += "　※必ず、「利用登録NO.」もしくは「(冠称を除いた)利用登録名」にてお振込みください。\r\n"
    mailbody_after += "　※振込手数料はご負担ください。\r\n"
    mailbody_after += "\r\n"
    mailbody_after += "【現金】\r\n"
    mailbody_after += "　ちよだプラットフォームスクウェア・コンシェルジュまでお持ちください。\r\n"
    mailbody_after += "　受付時間は平日10:00～17:00となっております。\r\n"
    mailbody_after += "\r\n"
    mailbody_after += "尚、本書面を以て料金が発生いたします。キャンセルは承っておりません。\r\n"
  }
  mailbody_after += "\r\n"
  mailbody_after += "●ご予約の誤り\r\n"
  mailbody_after += "お手数ですが、本日中に【TEL：03-5259-8400（平日10:00～17:00）】まで\r\n"
  mailbody_after += "ご連絡ください。明日以降のご連絡の場合、対応いたしかねます。\r\n"
  mailbody_after += "\r\n"
  mailbody_after += "●ご予約の変更\r\n"
  mailbody_after += "1回のみ、ご利用日の2週間前の同じ曜日（土日祝の場合その前の平日）まで\r\n"
  mailbody_after += "お電話にて受付いたします。それ以降はお受けできませんのでご了承ください。\r\n"
  mailbody_after += "\r\n"
  mailbody_after += "●ご利用当日について\r\n"
  mailbody_after += "・「会議室利用登録証」を受付へ必ずご提示ください。\r\n"
  mailbody_after += "　（初回は本メールの文面をお持ちください。）\r\n"
  mailbody_after += "・会議室への飲食物の持ち込みはお断りしております。\r\n"
  mailbody_after += "　飲食を希望される方は、1階カフェしまゆしにご相談ください。\r\n"
  mailbody_after += "・駐輪・駐車場はございません。近くのコインパーキングを\r\n"
  mailbody_after += "　ご利用いただくか、公共の交通機関をご利用ください。\r\n"
  mailbody_after += "\r\n"
  mailbody_after += "ご利用お待ち申し上げております。\r\n"
  mailbody_after += "\r\n"
  mailbody_after += "--------------------------------------------\r\n"
  mailbody_after += "プラットフォームサービス株式会社\r\n"
  mailbody_after += "Tel  : 03-3233-1511\r\n"
  mailbody_after += "Fax : 03-3233-1501\r\n"
  mailbody_after += "Mail: concierge@yamori.jp\r\n"
  mailbody_after += "--------------------------------------------\r\n"
  mailbody_after += "\r\n"
  mailbody_after += "～ちよだプラットフォームスクウェアのご案内～\r\n"
  mailbody_after += "〒101-0054 千代田区神田錦町3-21\r\n"
  mailbody_after += "\r\n"
  mailbody_after += "○コンシェルジュ○　TEL：03-3233-1511\r\n"
  mailbody_after += "　会議室対応：月-土9時～22時／日祝9時～19時\r\n"
  mailbody_after += "　（予約受付は平日10時～17時のみ）\r\n"
  mailbody_after += "\r\n"
  mailbody_after += "○しまゆし○　TEL：03-5259-8051\r\n"
  mailbody_after += "　営業：平日10時～22時／土曜10時～14時\r\n"
  mailbody_after += "　（日祝休み）\r\n"
  mailbody_after += "\r\n"
  mailbody_after += "○ビジネスセンター○　TEL：03-5259-8020\r\n"
  mailbody_after += "　営業：平日9時～19時\r\n"
  mailbody_after += "　（土日祝休み）\r\n"

  let inObj = {};
  inObj.id = kessai.id;
  // inObj.id_customer = kessai.id_customer;
  // inObj.id_search = kessai.id_search;
  inObj.mail_subject = "会議室・ミーティングルーム予約確認書及びご請求書";
  inObj.mail_body = mailbody_before + mailbody + mailbody_after;
  inObj.mail_body_cvs = mailbody_before + mailbody_cvs + mailbody_after;

  return inObj;
}

//  検索情報ID配下のすべての決済情報をもとに、メールを送信する
const sendMailByIdSearch = async ( id_search )=> {

  // 対象となる決済情報を取得
  const kessais = await m_kessais.findByIdSearch(id_search);

  for (let i=0; i < kessais.length; i++) {

    // 予約情報
    let yoyakus = await m_yoyakus.findByIdSearchAndCustomer(id_search, kessais[i].id_customer);
    let no_keiyaku = yoyakus[0].no_keiyaku;

    //　メール送信対象の場合
    if ((kessais[i].isSendMail === '1') && (kessais[i].yyyymmddhhmmss_sended_mail == null)) {

      // 請求書PDFファイルパスを組み立て
      let filename = `${kessais[i].id_search}-${no_keiyaku}-${kessais[i].yyyymmdd_yoyaku}-${kessais[i].yyyymmdd_uketuke}-${kessais[i].id}.pdf`

      // コンビニ決済有無によりbody部の設定をわける
      if (kessais[i].isCvs === '1') {
        send(kessais[i].email, kessais[i].mail_subject, kessais[i].mail_body_cvs, kessais[i].id_search, filename, kessais[i].isPDF);
      } else {
        send(kessais[i].email, kessais[i].mail_subject, kessais[i].mail_body, kessais[i].id_search, filename, kessais[i].isPDF);
      }
      
      // メール送信時間を設定
      await m_kessais.updatekessaiToSendMail(kessais[i].id, common.getTodayTime());

      // 送信後sleep
      await common.sleep(5000);
    }
  }
};

/**
 * 決済情報をもとに、メールを再送信する
 * @param {*} id 決済情報ID
 */
const sendMail = async (id_kessai)=> {

  // 対象となる決済情報を取得
  const kessai = await m_kessais.findPKey(id_kessai);

  // 対象となる予約情報よりIDを抽出する
  const yoyakus = await m_yoyakus.findByIdKessai(id_kessai);
  const no_keiyaku = yoyakus[0].no_keiyaku;

  // 請求書PDFのファイル名を組み立てる
  const filename = `${kessai.id_search}-${no_keiyaku}-${kessai.yyyymmdd_yoyaku}-${kessai.yyyymmdd_uketuke}-${kessai.id}.pdf`;

  if (kessai.isCvs === '1') {
    send(kessai.email, kessai.mail_subject, kessai.mail_body_cvs, kessai.id_search, filename, kessai.isPDF);
  } else {
    send(kessai.email, kessai.mail_subject, kessai.mail_body, kessai.id_search, filename, kessai.isPDF);
  }

  // メール送信時間を設定
  const setTimeValue = kessai.yyyymmddhhmmss_resended_mail? `${kessai.yyyymmddhhmmss_resended_mail}|${common.getTodayTime()}`: common.getTodayTime();
  await m_kessais.updatekessaiToReSendMail(kessai.id,setTimeValue);
  await logger.info(`送信先：${kessai.nm_keiyaku} <${kessai.email}>`);
  
};

// private
// メール送信
const send = (mail_to,title, content, id_search, filename, isPDF) => {

  // ▼Gmail送信用
  // 認証情報
  // const auth = {
  //     type         : 'OAuth2',
  //     user         : process.env.MAIL_USER,
  //     clientId     : process.env.CLIENT_ID,
  //     clientSecret : process.env.CLIENT_SECRET,
  //     refreshToken : process.env.REFRESH_TOKEN
  // };
  // トランスポート
  // const smtp_config = {
  //     service : 'gmail',
  //     auth    : auth
  // };

  // ▼XServer送信用
  const smtp_config = {
    host: process.env.XSERVER_HOST_NAME,
    port: '465',
    secure: true,
    auth: {
        user: process.env.XSERVER_USER_NAME,
        pass: process.env.XSERVER_PASSWORD,
    }
  };

  let transporter = nodemailer.createTransport(smtp_config);

  // メール情報
  let mail_to_value;
  let mail_subject_value;

  // テストモードかによって宛先を切り替える
  if (process.env.TEST_MODE === "on") {
    mail_to_value = process.env.MAIL_TO_TEST;
    mail_subject_value = process.env.MAIL_SUBJECT_TEST + title;
  } else {
    mail_to_value = mail_to;
    mail_subject_value = title;
  }

  let message = {
    from: process.env.MAIL_FROM,
    to: mail_to_value,
    bcc: process.env.MAIL_CC_TEST,
    subject: mail_subject_value,
    text: content,
  };

  if (isPDF) {
    message.attachments = [{
        filename: filename,
        path: `public/pdf/${id_search}/${filename}`,
        contentType: 'application/pdf'
      }]
  }

  // メール送信
  transporter.sendMail(message, (err, response) => {
      if (err) {
        logger.info(`[err: ${mail_to}]${err}`);
      } else {
        logger.info(`send mail to ${mail_to}`);
      }
  });
};

module.exports = {
  setMailContent,
  sendMailByIdSearch,
  sendMail,
  send,
};
