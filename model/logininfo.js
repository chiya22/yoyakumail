const knex = require("../db/knex.js").connect();
const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();

// 1件のみ登録していることが前提
const find = async () => {
  try {
    const retObj = await knex.from("logininfo").limit(1);
    return retObj[0];
  } catch (err) {
    throw err;
  }
};

// パスワードの更新
const update = async (password) => {

  try {
    const query = 'update logininfo set password = "' + password + '"';
    logger.info(query);
    const retObj = await knex.raw(query);
    return retObj
  } catch (err) {
    throw err;
  }
};

module.exports = {
  find,
  update,
};
