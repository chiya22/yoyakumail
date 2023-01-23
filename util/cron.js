const config = require("../config/app.config");
const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();

const cron = require("node-cron");

const fs = require("fs");
const mail = require("./mailinfo");

// cron設定
const startcron = () => {
  if (config.cron.effective === "on") {

    cron.schedule(config.cron.checkErrInLogfile, () => {

      const logfilepath = process.cwd() + "\\logs\\crud.log";
      const logcontent = fs.readFileSync(logfilepath, "utf-8");
      const logcontentlist = logcontent.split("\r\n");
      const regexp = RegExp('err:', 'g')

      let mailbody = '';
      for (let i=0;i < logcontentlist.length; i++) {
        if (regexp.test(logcontentlist[i])) {
          mailbody += logcontentlist[i] + "\r\n";
        }
      }

      //メール送信
      if (mailbody !== '') {
        mail.sendByXserer("【予約確認メール送信】エラー発生", mailbody);
        logger.info(`cronより通知メールを送信しました（エラーチェック）：${new Date()}`);
      } else {
        logger.info(`エラーはありませんでした：${new Date()}`);
      }

    });
  }
};

module.exports = {
  startcron,
};
