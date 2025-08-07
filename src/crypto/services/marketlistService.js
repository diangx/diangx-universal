const axios = require('axios');
const { BITHUMB_API_URL, UPBIT_API_URL } = process.env;

/**
 * @param {boolean} detail - 상세 정보
 * @param {string} ex - 거래소
 */

async function getmarketlist(detail = false, ex = 'bithumb') {
  let url = '';
  let prefix = (ex == 'upbit' ? UPBIT_API_URL : BITHUMB_API_URL)

  url = `${prefix}/v1/market/all?isDetails=${detail}`;

  const res = await axios.get(url, {
    headers: { accept: 'application/json' },
  });
  console.log(res.data)
  return res.data;
}

module.exports = { getmarketlist };
