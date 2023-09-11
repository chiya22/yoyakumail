const knex = require("../db/knex.js").connect();
const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();
const common = require("../util/common.js");

const findPKey = async (id) => {
  try {
    const retObj = await knex.from("kessais").where({ 
      id: id
    });
    return retObj[0];
  } catch (err) {
    throw err;
  }
};

const find = async () => {
  try {
    const retObj = await knex.from("kessais").orderBy("id_customer", "asc");
    return retObj;
  } catch (err) {
    throw err;
  }
};

/**
 * 検索情報IDに紐づくすべての決済情報を取得する
 * @param {} id_search 検索情報ID
 * @returns 
 */
const findByIdSearch = async ( id_search ) => {
  try {
    const retObj = await knex.from("kessais").where("id_search",id_search).orderBy("id_customer", "asc");
    return retObj;
  } catch (err) {
    throw err;
  }
};

/**
 * 検索情報ID内のMAXのIDを取得する
 * @param {*} id_search 
 * @returns 検索情報ID内のIDの最大値（Y+id_search+5桁の連番）
 */
const findMaxId = async ( id_search ) => {
  try {
    const query = `select MAX(id) as maxnum from kessais where id_search = "${id_search}" group by id_search`
    // logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    throw err;
  }
};


const insert = async (inObj) => {
  try {
    const query =
      'insert into kessais values ("' +
      inObj.id + 
      '","' +
      inObj.id_customer +
      '","' +
      inObj.id_search +
      '",' +
      common.retSqlValue(inObj.to_pay) +
      ',' +
      common.retSqlValue(inObj.nm_customer_1) +
      ',' +
      common.retSqlValue(inObj.nm_customer_2) +
      ',' +
      common.retSqlValue(inObj.telno) +
      ',' +
      common.retSqlValue(inObj.price) +
      ',' +
      common.retSqlValue(inObj.yyyymmdd_kigen) +
      ',' +
      common.retSqlValue(inObj.result) +
      ',' +
      common.retSqlValue(inObj.id_data) +
      ',' +
      common.retSqlValue(inObj.url_cvs) +
      ',' +
      common.retSqlValue(inObj.message) +
      ',' +
      common.retSqlValue(inObj.nm_keiyaku) +
      ',' +
      common.retSqlValue(inObj.nm_tantou) +
      ',' +
      common.retSqlValue(inObj.yyyymmdd_yoyaku) +
      ',' +
      common.retSqlValue(inObj.yyyymmdd_uketuke) +
      ',' +
      common.retSqlValue(inObj.email) +
      ',' +
      common.retSqlValue(inObj.isCvs) +
      ',' +
      common.retSqlValue(inObj.isSendMail) +
      ',' +
      common.retSqlValue(inObj.isPDF) +
      ',' +
      common.retSqlValue(inObj.mail_subject) +
      ',' +
      common.retSqlValue(inObj.mail_body) +
      ',' +
      common.retSqlValue(inObj.mail_body_cvs) +
      ',' +
      common.retSqlValue(inObj.yyyymmddhhmmss_sended_mail) +
      ',' +
      common.retSqlValue(inObj.yyyymmddhhmmss_resended_mail) + 
      ',' +
      common.retSqlValue(inObj.price_10per_total) + 
      ',' +
      common.retSqlValue(inObj.tax_10per_total) + 
      ',' +
      common.retSqlValue(inObj.price_8per_total) + 
      ',' +
      common.retSqlValue(inObj.tax_8per_total) + 
      ',' +
      common.retSqlValue(inObj.price_0per_total) + 
      ',' +
      common.retSqlValue(inObj.tax_0per_total) + 
      ')';
    // logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    throw err;
  }
};

/**
 * ID、検索情報IDをもとに、対象となる予約情報から決済情報を登録
 * 決済情報IDが設定されている場合は、対象の決済情報IDが設定されているすべての予約情報を対象に作成した決済情報を返却（1件）
 * 検索情報IDが設定されている場合は、対象の検索情報IDが設定されているすべての予約情報を対象に作成した決済情報を返却（1件から複数件）
 * 
 * @param {*} id_search  検索情報ID
 * @param {*} id_kessai 　決済情報ID
 * @returns IDまたは検索情報IDに紐づく決済情報
 */
const selectFromYoyakus = async (id_search, id_kessai = null) => {

    try {
    let query = `SELECT NULL as id,
      y.id_customer AS id_customer,
      y.id_search AS id_search, 
      "800" AS to_pay,
      LEFT(concat(MID(y.nm_riyou,INSTR(y.nm_riyou,"　")+1,30),"　",y.nm_tantou),10) AS nm_customer_1,
      MID(CONCAT(MID(y.nm_riyou,INSTR(y.nm_riyou,"　")+1,30),"　",y.nm_tantou),11,10) AS nm_customer_2,
      y.telno AS telno,
      SUM(y.price) AS price,
      DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 8 DAY),"%Y%m%d") AS yyyymmdd_kigen,
      NULL as result,
      NULL as id_data,
      NULL as url_cvs,
      NULL as message,
      MAX(y.nm_keiyaku) as nm_keiyaku, 
      MAX(y.nm_tantou) as nm_tantou, 
      MAX(y.yyyymmdd_yoyaku) as yyyymmdd_yoyaku, 
      MAX(y.yyyymmdd_uketuke) as yyyymmdd_uketuke, 
      MAX(y.email) as email,
      '1' as isCvs,
      '1' as isSendMail,
      '1' as isPDF,
      NULL as mail_subject,
      NULL as mail_body,
      NULL as mail_body_cvs,
      NULL as yyyymmddhhmmss_sended_mail,
      NULL as yyyymmddhhmmss_resended_mail,
      0 as price_10per_total,
      0 as tax_10per_total,
      0 as price_8per_total,
      0 as tax_8per_total,
      0 as price_0per_total,
      0 as tax_0per_total 
      FROM yoyakus y 
      GROUP BY y.id_customer, 
      "800", 
      y.nm_tantou, 
      y.telno, 
      DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 8 DAY),"%Y%m%d"),
      `
    if (id_kessai) {
      query += `y.id_kessai HAVING y.id_kessai = "${id_kessai}"`
    } else {
      query += `y.id_search HAVING y.id_search = "${id_search}"`
    }
    logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch(err) {
    throw err;
  }
}

/**
 * PK（ID）をキーに決済結果ダウンロードファイルの内容を更新する
 * @param {*} inObj 決済情報へ反映するダウンロードファイルに内容を格納したオブジェクト
 * @returns 
 */
const updatekessaisBydlinfo = async (inObj) => {
  try {
    const query = `update kessais set result = "${inObj.result}", 
    id_data = "${inObj.id_data}", 
    url_cvs = "${inObj.url_cvs}", 
    message = "${inObj.message}" 
    where id = "${inObj.id}"`;
    // logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    logger.error(err.message);
    throw err;
  }
}

/**
 * PK（ID）をキーに決済情報のメール部分を更新する
 * @param {*} inObj 決済情報へ反映するメール情報（件名、本文など）を格納したオブジェクト
 * @returns 
 */
const updatekessaisByMailinfo = async (inObj) => {
  try {
    const query = `update kessais set mail_subject = "${inObj.mail_subject}", 
    mail_body = "${inObj.mail_body}", 
    mail_body_cvs = "${inObj.mail_body_cvs}" 
    where id = "${inObj.id}"`;
    // logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    logger.error(err.message);
    throw err;
  }
}

/**
 * PK（ID）をキーにメール送信年月日時分秒を更新する
 * @param {*} id ID
 * @param {*} time メール送信年月日時分秒（yyyymmddhhmmss）
 */
const updatekessaiToSendMail = async ( id, time) => {
  try {
    const query = `update kessais set yyyymmddhhmmss_sended_mail = "${time}" 
    where id = "${id}"`
    //  logger.info(query);
     const retObj = await knex.raw(query);
  } catch (err) {
   logger.error(err.message);
   throw err;
  }
 }

/**
 * PK（ID）をキーにメール再送信年月日時分秒を更新する
 * @param {*} id ID
 * @param {*} time メール再送信年月日時分秒（yyyymmddhhmmss）
 */
const updatekessaiToReSendMail = async ( id, time) => {
  try {
    const query = `update kessais set yyyymmddhhmmss_resended_mail = "${time}" 
    where id = "${id}"`
    //  logger.info(query);
     const retObj = await knex.raw(query);
  } catch (err) {
   logger.error(err.message);
   throw err;
  }
 }
 
/**
 * PK（ID）をキーにコンビニ決済対象、メール送信対象、PDF添付対象を更新する
 * @param {*} id ID
 * @param {*} isCvs コンビニ決済対象か
 * @param {*} isSendMail メール送信対象か
 * @param {*} isPDF PDF添付対象か
 */
const updatekessaisToisCvsAndisSendMail = async (id, isCvs, isSendMail, isPDF ) => {
  try {
    const query = `update kessais set isCvs = "${isCvs}", 
    isSendMail = "${isSendMail}", 
    isPDF = "${isPDF}" 
    where id = "${id}"`
    //  logger.info(query);
     const retObj = await knex.raw(query);
  } catch (err) {
   logger.error(err.message);
   throw err;
  }
}

/**
 * PK（ID）をキーに、件名と、コンビニ決済対象の場合はメール本文（コンビニ決済）、コンビニ決済対象外の場合はメール本文を更新する
 * @param {*} id ID
 * @param {*} mail_subject 更新するメール件名
 * @param {*} mail_body 更新するメール本文
 */
const updatekessaisToMailBody = async (id, isCvs, mail_subject, mail_body ) => {
  try {
    let query = '';
    if (isCvs === "1") {
      query = `update kessais set isCvs = "${isCvs}", mail_subject = "${mail_subject}", 
      mail_body_cvs = "${mail_body}" 
      where id = "${id}"`
    } else {
      query = `update kessais set isCvs = "", mail_subject = "${mail_subject}", 
      mail_body = "${mail_body}" 
      where id = "${id}"`
    }
    //  logger.info(query);
     const retObj = await knex.raw(query);
  } catch (err) {
   logger.error(err.message);
   throw err;
  }
}

/**
 * ID、検索情報IDをもとに、対象となる決済情報を削除する
 * IDが設定されている場合は、検索情報IDで検索した結果すべてを削除する
 * IDが設定されていない場合は、検索情報IDで検索した結果すべてを削除する
 * 
 * @param {*} id 　ID
 * @param {*} id_search  検索情報ID
 * @returns 
 */
const remove = async (id_search, id = null) => {
  try {
    let query;
    if (id) {
      query = `delete from kessais where id = "${id}"`;
    } else {
      query = `delete from kessais where id_search = "${id_search}"`;
    }
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    logger.error(err.message);
    throw err;
  }
};

module.exports = {
  find,
  findPKey,
  findByIdSearch,
  findMaxId,
  insert,
  selectFromYoyakus,
  updatekessaisBydlinfo,
  updatekessaisByMailinfo,
  updatekessaiToSendMail,
  updatekessaiToReSendMail,
  updatekessaisToisCvsAndisSendMail,
  updatekessaisToMailBody,
  remove,
};
