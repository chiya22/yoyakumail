const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();

const nodemailer = require('nodemailer');

const common = require("./common");

const m_kessais = require("../model/kessais");
const m_yoyakus = require("../model/yoyakus");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// メール情報を作成し、決済情報へ格納する
const setMailContent = async (id_search) => {

  // 決済情報を取得する
  const kessais = await m_kessais.findByIdSearch(id_search);

  // 各決済情報に対する処理
  kessais.forEach( (kessai) => {

    //　対応する予約情報を取得する
    (async () => {

      let yoyakus = await m_yoyakus.findByIdSearchAndCustomer(id_search, kessai.id_customer);

      //　予約情報から明細情報を作成する
      let meisai = '';
      yoyakus.forEach( (yoyaku) => {
        meisai += yoyaku.nm_room + "(" + yoyaku.time_start.slice(0,2) + ":" + yoyaku.time_start.slice(-2) + "-" + yoyaku.time_end.slice(0,2) + ":" + yoyaku.time_end.slice(-2) + ")   " + yoyaku.price + "円(税込)\r\n"
      });

      let mailbody_before = '';
      let mailbody = '';
      let mailbody_cvs = '';
      let mailbody_after = '';

      mailbody_before += "＜会議室・ミーティングルーム予約確認書及びご請求書＞\r\n";
      mailbody_before += "この度はちよだプラットフォームスクウェア会議室を\r\n";
      mailbody_before += "ご予約いただきありがとうございます。\r\n"
      mailbody_before += "下記の内容にて承りましたのでご確認ください。\r\n"
      mailbody_before += "\r\n"

      // 「契約名」「◆　契約名」「◆　１１１１　契約名」のいずれにも対応する
      let nm_keiyaku = kessai.nm_keiyaku.slice(kessai.nm_keiyaku.indexOf("　")+1,kessai.nm_keiyaku.length);
      nm_keiyaku = nm_keiyaku.slice(nm_keiyaku.indexOf("　")+1,nm_keiyaku.length);

      mailbody_before += "ご利用者名： " + nm_keiyaku + " " + kessai.nm_tantousha + "様\r\n"
      mailbody_before += "ご連絡先： " + kessai.email + "\r\n"
      mailbody_before += "ご予約受付日： " + common.getTodayTime().slice(0,4) + "年" + common.getTodayTime().slice(4,6) + "月" + common.getTodayTime().slice(6,8) + "日\r\n"
      mailbody_before += "ご利用日： " + kessai.yyyymmdd_yoyaku +"\r\n"
      mailbody_before += "利用施設：\r\n"
      mailbody_before += meisai + "\r\n\r\n"
      mailbody_before += "ご利用料金合計： " + kessai.price + "円(税込)\r\n"
      mailbody_before += "\r\n"
  
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
      inObj.id_customer = kessai.id_customer;
      inObj.id_search = id_search;
      inObj.mail_subject = "会議室・ミーティングルーム予約確認書及びご請求書";
      inObj.mail_body = mailbody_before + mailbody + mailbody_after;
      inObj.mail_body_cvs = mailbody_before + mailbody_cvs + mailbody_after;
  
      await m_kessais.updatekessaisByMailinfo(inObj);

    })();

  });
}

//  検索情報ID配下のすべての決済情報をもとに、メールを送信する
const sendMailByIdSearch = async ( id_search)=> {

  // 対象となる決済情報を取得
  const kessais = await m_kessais.findByIdSearch(id_search);

  kessais.forEach( (kessai) => {
    //　メール送信対象の場合
    if ((kessai.isSendMail === '1') && (kessai.yyyymmddhhmmss_sended_mail == null)) {

      send(kessai.email, kessai.mail_subject, kessai.mail_body);
      
      // メール送信時間を設定
      (async () => {
        await m_kessais.updatekessaiToSendMail(id_search,kessai.id_customer,common.getTodayTime());
        await logger.info(`送信先：${kessai.nm_keiyaku} <${kessai.email}>`)
      })();
    }
    // logger.info(`送信先：${kessai.nm_keiyaku} <${kessai.email}>`)
  })

};

//  決済情報をもとに、メールを再送信する
const sendMail = async ( id_search, id_cutomer)=> {

  // 対象となる決済情報を取得
  const kessai = await m_kessais.findPKey(id_search, id_cutomer);

  //　メール送信対象の場合
  if (kessai.isSendMail === '1') {

    send(kessai.email, kessai.mail_subject, kessai.mail_body);

    // メール送信時間を設定
    const setTimeValue = kessai.yyyymmddhhmmss_resended_mail? `${kessai.yyyymmddhhmmss_resended_mail}|${common.getTodayTime()}`: common.getTodayTime();
    await m_kessais.updatekessaiToReSendMail(id_search,id_cutomer,setTimeValue);
    await logger.info(`送信先：${kessai.nm_keiyaku} <${kessai.email}>`);

  }
};

// private
// メール送信
const send = (mail_to,title, content) => {

  // SMTP情報
  const smtp_config = {
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: true,
      auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
      },
  }

  let transporter = nodemailer.createTransport(smtp_config);

  // メール情報
  let message = {
      from: process.env.MAIL_FROM,
      // テスト用として宛先を強制的に変更
      to: 'yoshida@yamori.jp',
      // to: mail_to,
      // テスト用として件名に【テスト】を追加
      subject: `【テスト】${title}`,
      // subject: title,
      text: content,
  };

  // メール送信
  transporter.sendMail(message, (err, response) => {
      if (err) {
          logger.info(`[err]${err}`);
      }
  });
}


module.exports = {
  setMailContent,
  sendMailByIdSearch,
  sendMail,
};
