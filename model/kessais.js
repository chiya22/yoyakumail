const knex = require("../db/knex.js").connect();
const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();

const findPKey = async (id_search, id_customer) => {
  try {
    const retObj = await knex.from("kessais").where({ 
      id_search: id_search,
      id_customer: id_customer
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

// 検索条件IDで抽出
const findByIdSearch = async ( id_search ) => {
  try {
    const retObj = await knex.from("kessais").where("id_search",id_search).orderBy("id_customer", "asc");
    return retObj;
  } catch (err) {
    throw err;
  }
};

const insert = async (inObj) => {
  try {
    const query =
      'insert into kessais values ("' +
      inObj.id_customer +
      '","' +
      inObj.id_search +
      '","' +
      inObj.to_pay +
      '","' +
      inObj.nm_customer_1 +
      '","' +
      inObj.nm_customer_2 +
      '", "' +
      inObj.price +
      '", "' +
      inObj.yyyymmdd_kigen +
      '", "' +
      inObj.result +
      '", "' +
      inObj.id_data +
      '", "' +
      inObj.url_cvs +
      '", "' +
      inObj.message +
      '")';
    logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    throw err;
  }
};

// 予約情報をもとに決済情報を登録
const insertfromyoyakus = async (id_search) => {

  try {
    const query = 'INSERT INTO kessais ( id_customer, to_pay, nm_customer_1, nm_customer_2, telno, price, yyyymmdd_kigen, id_search, nm_keiyaku, nm_tantousha, yyyymmdd_yoyaku, yyyymmdd_uketuke, email ) SELECT y.id_customer AS id_customer,"800" AS to_pay,LEFT(concat(MID(y.nm_riyousha,INSTR(y.nm_riyousha,"　")+1,30),"　",y.nm_tantousha),10) AS nm_customer_1,MID(CONCAT(MID(y.nm_riyousha,INSTR(y.nm_riyousha,"　")+1,30),"　",y.nm_tantousha),11,10) AS nm_customer_2,y.telno AS telno,SUM(y.price) AS price,DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 8 DAY),"%Y%m%d") AS yyyymmdd_kigen,y.id_search AS id_search, MAX(y.nm_keiyaku) as nm_keiyaku, MAX(y.nm_tantousha) as nm_tantousha, MAX(y.yyyymmdd_yoyaku) as yyyymmdd_yoyaku, MAX(y.yyyymmdd_uketuke) as yyyymmdd_uketuke, MAX(y.email) as email FROM yoyakus y GROUP BY y.id_customer, "800", y.nm_tantousha, y.telno, DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 8 DAY),"%Y%m%d"), id_search HAVING y.id_search = "' + id_search + '"'
    logger.info(query);
    const retObj = await knex.raw(query);
    return retObj;
  } catch(err) {
    throw err;
  }
}

// PK（管理ID、検索情報ID）をキーに決済結果ダウンロードファイルの内容を更新する
const updatekessaisBydlinfo = async (inObj) => {
  try {
    const query = 'update kessais set result = "' + inObj.result + '", id_data = "' + inObj.id_data + '", url_cvs = "' + inObj.url_cvs + '", message = "' + inObj.message + '" where id_customer = "' + inObj.id_customer + '" and id_search = "' + inObj.id_search + '"';
    logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    logger.error(err.message);
    throw err;
  }
}

//PK（管理ID、検索情報ID）をキーに決済情報のメール部分を更新する
const updatekessaisByMailinfo = async (inObj) => {
  try {
    const query = 'update kessais set mail_subject = "' + inObj.mail_subject + '", mail_body = "' + inObj.mail_body + '", mail_body_cvs = "' + inObj.mail_body_cvs + '" where id_customer = "' + inObj.id_customer + '" and id_search = "' + inObj.id_search + '"';
    // logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    logger.error(err.message);
    throw err;
  }
}

//PK（管理ID、検索情報ID）をキーにメール送信年月日時分秒を更新する
const updatekessaiToSendMail = async ( id_search, id_customer, time) => {
  try {
    const query = 'update kessais set yyyymmddhhmmss_sended_mail = "' + time + '" where id_customer = "' + id_customer + '" and id_search = "' + id_search + '";'
     logger.info(query);
     const retObj = await knex.raw(query);
  } catch (err) {
   logger.error(err.message);
   throw err;
  }
 }

 //PK（管理ID、検索情報ID）をキーにメール再送信年月日時分秒を更新する
const updatekessaiToReSendMail = async ( id_search, id_customer, time) => {
  try {
    const query = 'update kessais set yyyymmddhhmmss_resended_mail = "' + time + '" where id_customer = "' + id_customer + '" and id_search = "' + id_search + '";'
     logger.info(query);
     const retObj = await knex.raw(query);
  } catch (err) {
   logger.error(err.message);
   throw err;
  }
 }
 
//PK（管理ID、検索情報ID）をキーにコンビニ決済対象、メール送信対象を更新する
const updatekessaisToisCvsAndisSendMail = async (id_search, id_customer, isCvs, isSendMail ) => {
  try {
    const query = 'update kessais set isCvs = "' + isCvs + '", isSendMail = "' + isSendMail + '" where id_customer = "' + id_customer + '" and id_search = "' + id_search + '";'
     logger.info(query);
     const retObj = await knex.raw(query);
  } catch (err) {
   logger.error(err.message);
   throw err;
  }
}

//PK（管理ID、検索情報ID）をキーに、コンビニ決済対象の場合はメール本文（コンビニ決済）、コンビニ決済対象外の場合はメール本文を更新する
const updatekessaisToMailBody = async (id_search, id_customer, isCvs, mail_body ) => {
  try {
    let query = '';
    if (isCvs) {
      query = 'update kessais set mail_body_cvs = "' + mail_body + '" where id_customer = "' + id_customer + '" and id_search = "' + id_search + '";'
    } else {
      query = 'update kessais set mail_body = "' + mail_body + '" where id_customer = "' + id_customer + '" and id_search = "' + id_search + '";'
    }
     logger.info(query);
     const retObj = await knex.raw(query);
  } catch (err) {
   logger.error(err.message);
   throw err;
  }
}

const remove = async (id_search, id_customer) => {
  try {
    const query = 'delete from kessais where id_customer = "' + id_customer + '" and id_search = "' + id_search + '"';
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    logger.error(err.message);
    throw err;
  }
};

const removeByIdSearch = async (id_search) => {
  try {
    const query = 'delete from kessais where id_search = "' + id_search + '"';
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
  insert,
  insertfromyoyakus,
  updatekessaisBydlinfo,
  updatekessaisByMailinfo,
  updatekessaiToSendMail,
  updatekessaiToReSendMail,
  updatekessaisToisCvsAndisSendMail,
  updatekessaisToMailBody,
  remove,
  removeByIdSearch,
};
