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
    const retObj = await knex.from("searchinfos").orderBy("id", "desc");
    return retObj;
  } catch (err) {
    throw err;
  }
};

// const findlimit = async (num) => {
//   try {
//     const retObj = await knex.from("searchinfos").orderBy("id", "desc").limit(num);
//     return retObj;
//   } catch (err) {
//     throw err;
//   }
// };

const insert = async (inObj) => {
  try {
    const query =
      'insert into searchinfos ( id, yyyymmdd_addupd_start, yyyymmdd_addupd_end, yyyymmdd_riyou_start, yyyymmdd_riyou_end, status, yyyymmddhhmmss_created_yoyakus ) values ("' +
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
      inObj.yyyymmddhhmmss_created_yoyakus +
      '")';
    logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    throw err;
  }
};

// ステータスと処理時間の更新
const updateStatusAndTime = async (id, status, yyyymmddhhmmss) => {

  try {
    let query = "";
    if (status === '1') {
      query = 'update searchinfos set status = "' + status + '", yyyymmddhhmmss_created_yoyakus = "' + yyyymmddhhmmss + '" where id = "' + id + '"';
    } else if (status === '2') {
      query = 'update searchinfos set status = "' + status + '", yyyymmddhhmmss_created_kessais = "' + yyyymmddhhmmss + '" where id = "' + id + '"';
    } else if (status ==='3') {
      query = 'update searchinfos set status = "' + status + '", yyyymmddhhmmss_sended_mails = "' + yyyymmddhhmmss + '" where id = "' + id + '"';
    }
    logger.info(query);
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
    logger.error(err.message);
    throw err;
  }
};

module.exports = {
  find,
  // findlimit,
  findPKey,
  insert,
  updateStatusAndTime,
  remove,
};
