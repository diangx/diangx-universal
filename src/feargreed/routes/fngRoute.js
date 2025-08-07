const express = require('express');
const router = express.Router();
const { computeFng } = require('@/feargreed/services/fngService');

router.get('/', async (req, res) => {
  try {
    const {
      market = 'KRW-BTC',
      type = 'days',
      count  = '198',
      ex = 'bithumb'
    } = req.query;

    console.log(req.query)

    const cnt = parseInt(count, 10);
    const fearGreedIndex = await computeFng(market, type, cnt, ex);
    return res.json({ fearGreedIndex });
  } catch (err) {
    console.error('FNG Fail:', err);
    return res.status(500).json({ error: 'Fear & Greed Index Calculate Fail' });
  }
});

module.exports = router;