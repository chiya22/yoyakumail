const knex = require("../db/knex.js").connect();
const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();

const findPKey = async (id) => {
  try {
    const retObj = await knex.from("searchinfos").where({ id: id });
    return retObj[0];
  } catch (err) {
    throw err;
  }
};

const find = async () => {
  try {
    const retObj = await knex.from("searchinfos").orderBy("id", "asc");
    return retObj;
  } catch (err) {
    throw err;
  }
};

const insert = async (inObj) => {
  try {
    const query =
      'insert into searchinfos values ("' +
      inObj.id +
      '","' +
      inObj.yyyymmdd_addupd_start +
      '","' +
      inObj.yyyymmdd_addupd_end +
      '","' +
      inObj.yyyymmdd_riyou_start +
      '", "' +
      inObj.yyyymmdd_riyou_end +
      '", "' +
      inObj.status +
      '", "' +
      inObj.yyyymmddhhmmss_created +
      '")';
    logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    throw err;
  }
};

// ステータス更新
const updateStatus = async (id, status) => {
  try {
    const query = 'update searchinfos set status = "' + status + '" where id = "' + id + '"';
    const retObj = await knex.raw(query);
    return retObj
  } catch (err) {
    throw err;
  }
};


const remove = async (id) => {
  try {
    const query = 'delete from searchinfos where id = "' + id + '"';
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
  insert: insert,
  updateStatus:updateStatus,
  remove: remove,
};
