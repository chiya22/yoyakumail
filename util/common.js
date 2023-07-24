const retSqlValue = (value) => {
  return (value ? `"${value}"` : null);
}

const getYYYYMMDD = (date) => {

  let tmp;
  tmp = '' + date.getFullYear();
  tmp += '' + ('0' + (date.getMonth() + 1)).slice(-2);
  tmp += '' + ('0' + date.getDate()).slice(-2);
  return tmp

}

const getTodayTime = () => {
  const d = new Date();
  let mm = ('00' + (d.getMonth() + 1)).slice(-2);
  let dd = ('00' + d.getDate()).slice(-2);
  let hh = ('00' + d.getHours()).slice(-2);
  let mi = ('00' + d.getMinutes()).slice(-2);
  let ss = ('00' + d.getSeconds()).slice(-2);
  return d.getFullYear() + mm + dd + hh + mi + ss;
}

const getBeforeday = () => {
  let date = new Date();
  date.setDate(date.getDate() - 1);
  return getYYYYMMDD(date);
}

const getAfterday = () => {
  let date = new Date();
  date.setDate(date.getDate() + 1);
  return getYYYYMMDD(date);
}

const getNextYearday = () => {
  let date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return getYYYYMMDD(date);
}

const hankaku2Zenkaku = (str) => {
    const kanaMap = {
        'ｶﾞ': 'ガ', 'ｷﾞ': 'ギ', 'ｸﾞ': 'グ', 'ｹﾞ': 'ゲ', 'ｺﾞ': 'ゴ',
        'ｻﾞ': 'ザ', 'ｼﾞ': 'ジ', 'ｽﾞ': 'ズ', 'ｾﾞ': 'ゼ', 'ｿﾞ': 'ゾ',
        'ﾀﾞ': 'ダ', 'ﾁﾞ': 'ヂ', 'ﾂﾞ': 'ヅ', 'ﾃﾞ': 'デ', 'ﾄﾞ': 'ド',
        'ﾊﾞ': 'バ', 'ﾋﾞ': 'ビ', 'ﾌﾞ': 'ブ', 'ﾍﾞ': 'ベ', 'ﾎﾞ': 'ボ',
        'ﾊﾟ': 'パ', 'ﾋﾟ': 'ピ', 'ﾌﾟ': 'プ', 'ﾍﾟ': 'ペ', 'ﾎﾟ': 'ポ',
        'ｳﾞ': 'ヴ', 'ﾜﾞ': 'ヷ', 'ｦﾞ': 'ヺ',
        'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ',
        'ｶ': 'カ', 'ｷ': 'キ', 'ｸ': 'ク', 'ｹ': 'ケ', 'ｺ': 'コ',
        'ｻ': 'サ', 'ｼ': 'シ', 'ｽ': 'ス', 'ｾ': 'セ', 'ｿ': 'ソ',
        'ﾀ': 'タ', 'ﾁ': 'チ', 'ﾂ': 'ツ', 'ﾃ': 'テ', 'ﾄ': 'ト',
        'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ',
        'ﾊ': 'ハ', 'ﾋ': 'ヒ', 'ﾌ': 'フ', 'ﾍ': 'ヘ', 'ﾎ': 'ホ',
        'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ',
        'ﾔ': 'ヤ', 'ﾕ': 'ユ', 'ﾖ': 'ヨ',
        'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ',
        'ﾜ': 'ワ', 'ｦ': 'ヲ', 'ﾝ': 'ン',
        'ｧ': 'ァ', 'ｨ': 'ィ', 'ｩ': 'ゥ', 'ｪ': 'ェ', 'ｫ': 'ォ',
        'ｯ': 'ッ', 'ｬ': 'ャ', 'ｭ': 'ュ', 'ｮ': 'ョ',
        '｡': '。', '､': '、', 'ｰ': 'ー', '｢': '「', '｣': '」', '･': '・'
    };

    const reg = new RegExp('(' + Object.keys(kanaMap).join('|') + ')', 'g');

    return str
          .replace(reg, (match) => kanaMap[match])
          .replace(/ﾞ/g, '゛')
          .replace(/ﾟ/g, '゜')
          .replace(/[A-Za-z0-9!-~]/g, (s) => String.fromCharCode(s.charCodeAt(0) + 0xFEE0))
          .replace(/\"/g, "”")
          .replace(/'/g, "’")
          .replace(/`/g, "‘")
          .replace(/\\/g, "￥")
          .replace(/ /g, "　")
          .replace(/~/g, "〜");
};

const zenkakuNum2hankakuNum = (str) => {
  return str
  .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
}

const sleep = (time) => {
  return new Promise((resolve, reject) => {
      setTimeout(() => {
          resolve()
      }, time)
  })
};

/**
 * hhmm形式の文字列が時間に変換できるかチェックする
 * @param {*} str hhmm形式
 * @returns true：時間に変換可能、false：時間に変換不可
 */
const isTime = (str) => {
  return str.match(/^([01]?[0-9]|2[0-3])([0-5][0-9])$/) !== null;
};

/**
 * yyyymmdd形式の文字列が日付に変換できるかチェックする
 * @param {*} str yyyymmdd形式
 * @returns true：日付に変換可能、false：日付に変換不可
 */
const isDate = (str) => {
  if (str.length !== 8) {
    return false
  }
  const arr = (str.substr(0, 4) + '/' + str.substr(4, 2) + '/' + str.substr(6, 2)).split('/');
  if (arr.length !== 3) return false;
  const date = new Date(arr[0], arr[1] - 1, arr[2]);
  if (arr[0] !== String(date.getFullYear()) || arr[1] !== ('0' + (date.getMonth() + 1)).slice(-2) || arr[2] !== ('0' + date.getDate()).slice(-2)) {
    return false;
  } else {
    return true;
  }
};


module.exports = {
  retSqlValue,
  getYYYYMMDD,
  getTodayTime,
  getBeforeday,
  getAfterday,
  getNextYearday,
  hankaku2Zenkaku,
  zenkakuNum2hankakuNum,
  sleep,
  isTime,
  isDate
};