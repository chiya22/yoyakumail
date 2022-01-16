const Knex = require("knex");
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
  }
  
const connect = () => {
    const configdb= {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        port: process.env.DB_PORT,
    };

    const knex = Knex({
        client: "mysql",
        connection: configdb,
    });
    knex.client.pool.max = 5;
    knex.client.pool.min = 5;
    knex.client.pool.createTimeoutMillis = 30000; // 30 seconds
    knex.client.pool.idleTimeoutMillis = 600000; // 10 minutes
    knex.client.pool.createRetryIntervalMillis = 200; // 0.2 seconds
    knex.client.pool.acquireTimeoutMillis = 600000; // 10 minutes
    return knex;
};

module.exports = {
    connect: connect,
}