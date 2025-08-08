const express = require('express');
const router = express.Router();
const { computeAlterFng } = require('@/feargreed/services/alternative-fngService');

router.get('/', async (req, res) => {
  try {
    const {
      limit = 1,
    } = req.query;

    console.log(req.query)

    const fearGreedIndex = await computeAlterFng(limit);
    return res.json({ fearGreedIndex });
  } catch (err) {
    console.error('FNG Fail:', err);
    return res.status(500).json({ error: 'Fear & Greed Index Calculate Fail' });
  }
});

module.exports = router;