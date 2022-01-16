const knex = require("../db/knex.js").connect();

const findPKey = async (id) => {
  try {
    const retObj = await knex.from("yoyakus").where({ id: id });
    return retObj;
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

const insert = async (inObj) => {
  try {
    const query =
      'insert into yoyakus values ("' +
      inObj.id +
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
      inObj.ymd_uketuke +
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
      '")';
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    throw err;
  }
};

const remove = async (inObj) => {
  try {
    const query = 'delete from yoyakus where id = "' + inObj.id + '"';
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    throw err;
  }
};

module.exports = {
  find: find,
  findPKey: findPKey,
  insert: insert,
  remove: remove,
};
