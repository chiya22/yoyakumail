const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();
const puppeteer = require("puppeteer");

const fs = require("fs");
const iconv = require("iconv-lite");

const common = require("./common");

const m_kessais = require("../model/kessais");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const outputFile = async (id_search) => {

  const kessais = await m_kessais.findByIdSearch(id_search);

  const outFileName = process.env.KESSAI_UP_PATH + "\\kessaiinfo" + common.getTodayTime() + ".csv";
  let content;

  kessais.forEach( kessai => {
    content += kessai.id_customer + "," + kessai.to_pay + "," + kessai.nm_customer_1 + "," + kessai.nm_customer_2 + "," + kessai.telno + "," + kessai.price + "," + kessai.yyyymmdd_kigen + "\r\n"
  });

  const content_SJIS = iconv.encode(content, "Shift_JIS");
  await fs.writeFileSync(outFileName, content_SJIS);

}

module.exports = {
  outputFile,
};
