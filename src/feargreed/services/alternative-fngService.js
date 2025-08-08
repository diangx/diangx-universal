const axios = require('axios');

async function computeAlterFng(limit = 1) {
    let url = '';

    url = `https://api.alternative.me/fng/?limit=${limit}`;
    const res = await axios.get(url, { headers: { accept: 'application/json' }});

    return res.data;
}

module.exports = { computeAlterFng };