const knex = require("../db/knex.js").connect();
const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();

const findPKey = async (id_search, id_customer) => {
  try {
    const retObj = await knex.from("kessais").where({ id_search: id_search }, { id_customer: id_customer});
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
    const retObj = await knex.raw(query);
    logger.info(query);
    return retObj[0];
  } catch (err) {
    throw err;
  }
};

// 予約情報をもとに決済情報を登録
const insertfromyoyakus = async (id_search) => {

  try {
    const query = 'INSERT INTO kessais ( id_customer, to_pay, nm_customer_1, nm_customer_2, telno, price, yyyymmdd_kigen, id_search) SELECT CONCAT("R",y.id_kanri,"-",y.yyyymmdd_uketuke,"-",y.yyyymmdd_yoyaku) AS id_customer,"800" AS to_pay,LEFT(concat(MID(y.nm_riyousha,INSTR(y.nm_riyousha,"　")+1,30),"　",y.nm_tantousha),10) AS nm_customer_1,MID(CONCAT(MID(y.nm_riyousha,INSTR(y.nm_riyousha,"　")+1,30),"　",y.nm_tantousha),11,10) AS nm_customer_2,y.telno AS telno,SUM(y.price) AS price,DATE_FORMAT(CURDATE() + 8,"%Y%m%d") AS yyyymmdd_kigen,y.id_search AS id_search FROM yoyakus y GROUP BY y.id_kanri, y.yyyymmdd_yoyaku, "800", y.nm_tantousha, y.telno, date_format(CURDATE() + 8,"%Y%m%d"), y.yyyymmdd_uketuke, id_search HAVING y.id_search = "' + id_search + '"'
    const retObj = await knex.raw(query);
    logger.info(query);
    return retObj;
  } catch(err) {
    throw err;
  }
}

const remove = async (id) => {
  try {
    const query = 'delete from kessais where id_customer = "' + id + '"';
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    log.error(err.message);
    throw err;
  }
};

const removeByIdSearch = async (id) => {
  try {
    const query = 'delete from kessais where id_search = "' + id + '"';
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    log.error(err.message);
    throw err;
  }
};

module.exports = {
  find: find,
  findPKey: findPKey,
  findByIdSearch: findByIdSearch,
  insert: insert,
  insertfromyoyakus:insertfromyoyakus,
  remove: remove,
  removeByIdSearch: removeByIdSearch,
};
