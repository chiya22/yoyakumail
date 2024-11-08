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

// 決済情報IDで抽出
const findByIdKessai = async ( id_kessai ) => {
  try {
    const retObj = await knex.from("yoyakus").where("id_kessai",id_kessai).orderBy("id", "asc");
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

/**
 * 決済IDより、対象予約情報の料金合計をもとめる
 * 
 * @param {*} id_kessai 決済情報のID
 * @returns 料金合計
 */
const findPriceByIdKessai = async (id_kessai) => {
  try {
    const query = `select sum(y.price) as price from yoyakus y group by y.id_kessai having y.id_kessai = ${id_kessai}`;
    // logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    throw err;
  }
}


/**
 * 税率と決済IDより、対象予約情報の料金合計をもとめる
 * 
 * @param {*} kbn_per 税率
 * @param {*} id_kessai 決済情報のID
 * @returns 料金合計
 */
const findPriceByKbnPerAndIdKessai = async (kbn_per, id_kessai) => {
  try {
    const query = `select sum(y.price) as price from yoyakus y group by y.per_tax, y.id_kessai having y.per_tax = ${kbn_per} and y.id_kessai = ${id_kessai}`;
    // logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    throw err;
  }
}

/**
 * 予約情報の登録
 * 
 * @param {*} inObj 
 * @returns 
 */
const insert = async (inObj) => {
  try {
    const query =
      'insert into yoyakus values ("' +
      inObj.id +
      '","' +
      inObj.id_kessai +
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
      inObj.nm_riyou +
      '", "' +
      inObj.nm_room_seishiki +
      '", "' +
      inObj.type_room +
      '", "' +
      inObj.no_keiyaku +
      '", "' +
      inObj.nm_keiyaku +
      '", "' +
      inObj.nm_tantou +
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
      '", ' + 
      inObj.per_tax +
      ')';
    // logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    logger.info(err);
    throw err;
  }
};

/**
 * 検索情報IDとお客様情報IDをもとに検索した予約情報に、決済情報IDを設定する
 * @param {*} id 
 * @param {*} id_search 
 * @param {*} id_customer 
 * @returns 
 */
const updateByIdSearchAndIdCustomer = async (id, id_search, id_customer) => {
  try {
    const query = `update yoyakus set id_kessai = "${id}" where id_search = "${id_search}" and id_customer ="${id_customer}"`;
    // logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    logger.error(err.message);
    throw err;
  }
}

const remove = async (id) => {
  try {
    const query = 'delete from yoyakus where id = "' + id + '"';
    // logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    logger.error(err.message);
    throw err;
  }
};

/**
 * 決済情報IDをキーに対象となる予約情報を削除する
 * @param {*} id_kessai 決済情報ID
 */
const removeByIdKessai = async (id_kessai) => {
  try {
    const query = `delete from yoyakus where id_kessai = "${id_kessai}"`;
    // logger.info(query);
    const retObj = await knex.raw(query);
    return retObj[0];
  } catch (err) {
    logger.error(err.message);
    throw err;
  }
};

/**
 * 検索情報IDをキーに対象となる予約情報を削除する
 * @param {*} id_search 検索情報ID 
 * @returns 
 */
const removeByIdSearch = async (id_search) => {
  try {
    const query = 'delete from yoyakus where id_search = "' + id_search + '"';
    // logger.info(query);
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
  findByIdKessai,
  findByIdSearch,
  findByIdSearchAndCustomer,
  findMaxId,
  findPriceByIdKessai,
  findPriceByKbnPerAndIdKessai,
  insert,
  updateByIdSearchAndIdCustomer,
  remove,
  removeByIdKessai,
  removeByIdSearch,
  removeByIdSearchAndIdCustomer
};
