const knex = require("../db/knex.js").connect();
const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();

const selectSqKessai = async () => {
  try {
      const query1 = 'update sq_kessai set id=LAST_INSERT_ID(id+1)';
      const query2 = 'select LAST_INSERT_ID() as id from sq_kessai';

      // const client = knex.connect();
      const retObj1 = await knex.raw(query1);
      const retObj2 = await knex.raw(query2);

      return retObj2[0][0];
  } catch(err) {
      throw err;
  }
};
const selectSqYoyaku = async () => {
  try {
      const query1 = 'update sq_yoyaku set id=LAST_INSERT_ID(id+1)';
      const query2 = 'select LAST_INSERT_ID() as id from sq_yoyaku';

      // const client = knex.connect();
      const retObj1 = await knex.raw(query1);
      const retObj2 = await knex.raw(query2);

      return retObj2[0][0];
  } catch(err) {
      throw err;
  }
};

module.exports = {
    selectSqKessai,
    selectSqYoyaku
};
  