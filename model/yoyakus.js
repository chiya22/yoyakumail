const knex = require("../db/knex.js").connect();
const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();

const findPKey = async (id) => {
  try {
    const retObj = await knex.from("yoyakus").where({ id: id });
    return retObj[0];
  } catch (err) {
    throw err;
  }
};

const find = async () => {
  try {
    const retObj = await knex.from("yoyakus").orderBy("id", "asc");
    return retObj;
  } catch (err) {
    throw err;
  }
};

// 検索条件IDで抽出
const findByIdSearch = async ( id_search ) => {
  try {
    const retObj = await knex.from("yoyakus").where("id_search",id_search).orderBy("id", "asc");
    return retObj;
  } catch (err) {
    throw err;
  }
};

// お客様IDで抽出
const findByIdSearchAndCustomer = async ( id_search, id_customer ) => {
  try {
    const retObj = await knex.from("yoyakus").where({"id_search":id_search,"id_customer":id_customer}).orderBy("id", "asc");
    return retObj;
  } catch (err) {
    throw err;
  }
};

// 
/**
 * 検索情報ID内のMAXのIDを取得する
 * @param {*} id_search 
 * @returns 検索情報ID内のIDの最大値（Y+id_search+5桁の連番）
 */
const findMaxId = async ( id_search ) => {
  try {
    const query = `select MAX(id) as maxnum from yoyakus where id_search = "${id_search}" group by id_search`
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
      'insert into yoyakus values ("' +
      inObj.id +
      '","' +
      inObj.id_search +
      '", "' +
      inObj.id_customer +
      '","' +
      inObj.id_kanri +
      '","' +
      inObj.nm_room +
      '","' +
      inObj.yyyymmdd_yoyaku +
      '", "' +
      inObj.time_start +
      '", "' +
      inObj.time_end +
      '", "' +
      inObj.price +
      '", "' +
      inObj.yyyymmdd_uketuke +
      '", "' +
      inObj.status_shiharai +
      '", "' +
      inObj.nm_nyuryoku +
      '", "' +
      inObj.nm_riyousha +
      '", "' +
      inObj.nm_room_seishiki +
      '", "' +
      inObj.type_room +
      '", "' +
      inObj.no_keiyakusha +
      '", "' +
      inObj.nm_keiyakusha +
      '", "' +
      inObj.nm_tantousha +
      '", "' +
      inObj.telno.replace(/\s+/g,"") +
      '", "' +
      inObj.faxno +
      '", "' +
      inObj.email +
      '", "' +
      inObj.kubun +
      '", "' +
      inObj.address +
      '", "' +
      inObj.quantity +
      '", "' +
      inObj.tanka +
      '", "' +
      inObj.caution +
      '", "' +
      inObj.memo +
      '", "' +
      inObj.yyyymmddhhmmss_created +
      '")';
    logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    logger.info(err);
    throw err;
  }
};

const remove = async (id) => {
  try {
    const query = 'delete from yoyakus where id = "' + id + '"';
    logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    logger.error(err.message);
    throw err;
  }
};

const removeByIdSearch = async (id) => {
  try {
    const query = 'delete from yoyakus where id_search = "' + id + '"';
    logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    logger.error(err.message);
    throw err;
  }
};

/**
 * 検索情報ID＋顧客情報IDをキーに対象となる予約情報を削除する
 * @param {*} id_search 検索情報ID
 * @param {*} id_customer 顧客情報ID
 */
const removeByIdSearchAndIdCustomer = async (id_search, id_customer) => {
  try {
    const query = `delete from yoyakus where id_search = "${id_search}" and id_customer = "${id_customer}"`;
    // logger.info(query);
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
  findByIdSearchAndCustomer,
  findMaxId,
  insert,
  remove,
  removeByIdSearch,
  removeByIdSearchAndIdCustomer,
};
