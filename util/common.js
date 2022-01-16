const getTodayTime = () => {
    const d = new Date();
    let mm = ('00' + (d.getMonth() + 1)).slice(-2);
    let dd = ('00' + d.getDate()).slice(-2);
    let hh = ('00' + d.getHours()).slice(-2);
    let mi = ('00' + d.getMinutes()).slice(-2);
    let ss = ('00' + d.getSeconds()).slice(-2);
    return d.getFullYear() + mm + dd + hh + mi + ss;
  }

module.exports = {
    getTodayTime,
};