const axios = require('axios');
const { BITHUMB_API_URL, UPBIT_API_URL } = process.env;

/**
 * @param {string} type - minutes, days, weeks, months
 * @param {string} market - KRW-BTC
 * @param {number} unit - minutes일 때 단위 (1,3,5,10,15,30,60,240)
 * @param {number} count - 가져올 캔들 개수
 * @param {string} ex - 거래소
 */

async function getCandles(type = 'days', market = 'KRW-BTC', unit = 5, count = 120, ex = 'bithumb') {
  let url = '';
  let prefix = (ex == 'upbit' ? UPBIT_API_URL : BITHUMB_API_URL)

  if (type === 'minutes') {
    url = `${prefix}v1/candles/minutes/${unit}?market=${market}&count=${count}`;
  } else {
    url = `${prefix}/v1/candles/${type}?market=${market}&count=${count}`;
  }

  const res = await axios.get(url, {
    headers: { accept: 'application/json' },
  });

  return res.data;
}

module.exports = { getCandles };
