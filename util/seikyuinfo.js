const log4js = require("log4js");
const logger = log4js.configure("./config/log4js-config.json").getLogger();

const common = require("./common");

const m_kessais = require("../model/kessais");
const m_yoyakus = require("../model/yoyakus");

const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');
const pdfmaker = require('pdfmake');
// https://pdfmake.github.io/docs/0.1/

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// 決済情報に対応する請求書PDFを作成する
const createSeikyuPDF = async (id_kessai) => {
  // const createSeikyuPDF = async (id_search,id_customer) => {

  // 決済情報を取得する
  const kessai = await m_kessais.findPKey(id_kessai);

  //　対応する予約情報を取得する
  let yoyakus = await m_yoyakus.findByIdKessai(id_kessai);

  //　予約情報から請求書（PDF）出力情報を作成する
  let meisais = [];
  let bihinmeisais = [];
  let bihinIndx = true;
  let roomIndx = true;
  let no_keiyaku = "";
  yoyakus.forEach( (yoyaku) => {
      no_keiyaku = yoyaku.no_keiyaku;
      if (yoyaku.type_room === '9') {
          // 備品の場合
          // 最初の備品の場合はインデックスを挿入する
          if (bihinIndx) {
            let objBihinIndx = {}
            objBihinIndx.name = "付帯設備名"
            objBihinIndx.time = "時間帯"
            objBihinIndx.price = "料金"
            bihinIndx = false;
            bihinmeisais.push(objBihinIndx);
          }
          let objBihin = {}
          objBihin.name = yoyaku.nm_room + "×" + yoyaku.quantity
          objBihin.time = yoyaku.time_start.slice(0,2) + ":" + yoyaku.time_start.slice(-2) + "-" + yoyaku.time_end.slice(0,2) + ":" + yoyaku.time_end.slice(-2)
          objBihin.price = yoyaku.price.toLocaleString() + "円"
          bihinmeisais.push(objBihin);
      } else {
          // 部屋の場合
          // 最初の備品の場合はインデックスを挿入する
          if (roomIndx) {
            let objRoomIndx = {}
            objRoomIndx.name = "会場名"
            objRoomIndx.time = "時間帯"
            objRoomIndx.price = "料金"
            roomIndx = false;
            meisais.push(objRoomIndx);
          }
          let objRoom = {}
          objRoom.name = yoyaku.nm_room
          objRoom.time = yoyaku.time_start.slice(0,2) + ":" + yoyaku.time_start.slice(-2) + "-" + yoyaku.time_end.slice(0,2) + ":" + yoyaku.time_end.slice(-2)
          objRoom.price = yoyaku.price.toLocaleString() + "円"
          meisais.push(objRoom);
      }
  });
  meisais = meisais.concat(bihinmeisais);

  // 契約者名
  // （表示名：XXX）があれば削除する　例）■　１２３４　株式会社ＡＡＡ（表示名：ＢＢＢ）　⇒　■　１２３４　株式会社ＡＡＡ
  let nm_keiyaku = kessai.nm_keiyaku;
  if (nm_keiyaku.indexOf("（表示") !== -1) {
    nm_keiyaku = kessai.nm_keiyaku.slice(0,kessai.nm_keiyaku.indexOf("（表示"));
  }
  // 「登録区分　登録名」の場合に「登録名」を抜き出す　例）■　１２３４　株式会社ＡＡＡ　⇒　１２３４　株式会社ＡＡＡ
  if (nm_keiyaku.indexOf("　") !== -1) {
    nm_keiyaku = nm_keiyaku.slice(nm_keiyaku.indexOf("　")+1);
  }
  // 「入居番号　登録名」の場合に「登録名」を抜き出す　例）１２３４　株式会社ＡＡＡ　⇒　株式会社ＡＡＡ
  if (!isNaN(common.zenkakuNum2hankakuNum(nm_keiyaku.slice(0,4)))) {
    nm_keiyaku = nm_keiyaku.slice(5);
  }

  // ▼▼▼　PDF　▼▼▼
  // テンプレートSVGを取得し、独自SVGを作成する
  let stdin = fs.readFileSync("public/template/A4.svg","utf8").toString();
  let dom = new JSDOM(stdin);
  let document = dom.window.document;

  // 請求番号
  let no_seikyu = document.querySelector("#__no_seikyu > tspan");
  // no_seikyu.textContent = kessai.id_search + "-" + kessai.id_customer;
  no_seikyu.textContent = kessai.id_search + "-" + no_keiyaku + "-" + kessai.yyyymmdd_yoyaku + "-" + kessai.yyyymmdd_uketuke + "-" + kessai.id;

  // 利用者番号
  let no_riyou = document.querySelector("#__no_riyou > tspan");
  no_riyou.textContent = no_keiyaku

  // 利用者名
  let name_riyou = document.querySelector("#__name_riyou > tspan");
  name_riyou.textContent = nm_keiyaku + "　様";
  if (name_riyou.textContent.length > 30) {
    name_riyou.setAttribute("font-size", "8");
  } else if (name_riyou.textContent.length > 25) {
    name_riyou.setAttribute("font-size", "10");
  }

  // 発行日
  let ymdyoubi_hakkou = document.querySelector("#__ymdyoubi_hakkou > tspan");
  let yyyymmdd_now = common.getYYYYMMDD(new Date());
  ymdyoubi_hakkou.textContent = `${yyyymmdd_now.slice(0,4)}年${yyyymmdd_now.slice(4,6)}月${yyyymmdd_now.slice(6,8)}日\r\n`;

  // 利用日
  const ymdyoubi_riyou = document.querySelector("#__ymdyoubi_riyou > tspan");
  ymdyoubi_riyou.textContent = `${kessai.yyyymmdd_yoyaku.slice(0,4)}年${kessai.yyyymmdd_yoyaku.slice(4,6)}月${kessai.yyyymmdd_yoyaku.slice(6,8)}日\r\n`;

  // ご利用金額合計
  const price_total = document.querySelector("#__price_total > tspan");
  setRightPositionForPrice(price_total, kessai.price.toLocaleString() + "円");

  // 名前、時間、料金
  let indx = 1;
  let targetfiledname = '';
  let targetobj;
  meisais.forEach( (meisai) => {
      targetfiledname = "#__name_room_" + indx + " > tspan"
      targetobj = document.querySelector(targetfiledname);
      if ((meisai.name === "付帯設備名") || (meisai.name === "会場名")) {
          targetobj.setAttribute("x","163");
      }
      meisai.name = meisai.name.replace("ミーティングR","ミーティングルーム")
      meisai.name = meisai.name.replace("プロジェクトR","プロジェクトルーム")
      meisai.name = meisai.name.replace("プレゼンＲ","プレゼンテーションルーム")
      targetobj.textContent = meisai.name;
      targetfiledname = "#__time_" + indx + " > tspan"
      targetobj = document.querySelector(targetfiledname);
      if (meisai.time === "時間帯") {
          targetobj.setAttribute("x","357");
      }
      targetobj.textContent = meisai.time;
      targetfiledname = "#__price_" + indx + " > tspan"
      targetobj = document.querySelector(targetfiledname);
      if (meisai.price === "料金") {
          targetobj.setAttribute("x","467");
          targetobj.textContent = meisai.price;
      } else {
          setRightPositionForPrice(targetobj, meisai.price);
      }
      indx += 1;
  })
  for (let i=indx; i<18; i++) {
    targetfiledname = "#__name_room_" + i + " > tspan"
    targetobj = document.querySelector(targetfiledname);
    targetobj.textContent = '';
    targetfiledname = "#__time_" + i + " > tspan"
    targetobj = document.querySelector(targetfiledname);
    targetobj.textContent = '';
    targetfiledname = "#__price_" + i + " > tspan"
    targetobj = document.querySelector(targetfiledname);
    targetobj.textContent = '';
  }

  let svgcontent = document.querySelector("svg");
  
  // fontの指定
  let fonts = {
    NotoSansJP: {
      normal: 'public/fonts/NotoSansJP-Regular.otf',
      bold: 'public/fonts/NotoSansJP-Medium.otf',
    }
  };
  let printer = new pdfmaker(fonts);
  let docDefinition = {
    content:[
      {
        svg:svgcontent.outerHTML
      }
    ],
    pageSize: 'A4',
    pageMargins: [ 0, 0, 0, 0 ],
    defaultStyle: {
      font: 'NotoSansJP',
    },
    ownerPassword: process.env.PDF_PASSWORD,
    permissions: {
      // printing: false, //'lowResolution'
      printing: 'highResolution', //'lowResolution'
      modifying: false,
      copying: false,
      annotating: false,
      fillingForms: false,
      contentAccessibility: false,
      documentAssembly: false
    },
  };
  let options = {
  }
  
  let pdfDoc = printer.createPdfKitDocument(docDefinition,options);
  let filepath = `public/pdf/${kessai.id_search}`;
  let filename = kessai.id_search + "-" + no_keiyaku + "-" + kessai.yyyymmdd_yoyaku + "-" + kessai.yyyymmdd_uketuke + "-" + kessai.id;
  if (!fs.existsSync( filepath )) {
    fs.mkdirSync(filepath);
  }
  pdfDoc.pipe(fs.createWriteStream(`${filepath}/${filename}.pdf`));
  pdfDoc.end();
  
}

/**
 * 料金フィールドに右詰めで金額を設定する
 * 
 * @param {*} obj 設定対象フィールド
 * @param {*} string 設定値
 */
const setRightPositionForPrice = (obj, string) => {
    // const maxsize = encodeURI(obj.textContent).replace(/%../g,"x").length;
    // const stringsize = encodeURI(string).replace(/%../g,"x").length;
    const stringsize = string.length;
    let xposition = 0;
    if (stringsize <= 4) {
        // 「,」が4つ
        xposition = (20-stringsize-4)*6 + (4*3)
    } else if ((stringsize >= 5) && (stringsize <= 8)) {
        // 「,」が3つ
        xposition = (20-stringsize-3)*6 + (3*3)
    } else if ((stringsize >= 9) && (stringsize <= 12)) {
        // 「,」が3つ
        xposition = (20-stringsize-2)*6 + (3*2)
    } else if ((stringsize >= 13) && (stringsize <= 16)) {
        // 「,」が3つ
        xposition = (20-stringsize-1)*6 + (3*1)
    } else {
        xposition = (20-stringsize)*6
    }
    obj.textContent = string;
    xposition = Number(obj.getAttribute("x")) + xposition
    obj.setAttribute("x", xposition);
}

module.exports = {
    createSeikyuPDF,
  };
  