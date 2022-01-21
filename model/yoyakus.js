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

const insert = async (inObj) => {
  try {
    const query =
      'insert into yoyakus values ("' +
      inObj.id +
      '","' +
      inObj.id_search +
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
      inObj.telno +
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
    const retObj = await knex.raw(query);
    logger.info(query);
    return retObj[0];
  } catch (err) {
    logger.info(err);
    throw err;
  }
};

const remove = async (id) => {
  try {
    const query = 'delete from yoyakus where id = "' + id + '"';
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    log.error(err.message);
    throw err;
  }
};

const removeByIdSearch = async (id) => {
  try {
    const query = 'delete from yoyakus where id_search = "' + id + '"';
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
  remove: remove,
  removeByIdSearch: removeByIdSearch,
};
