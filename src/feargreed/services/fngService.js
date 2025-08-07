const { ScoreStock, FearGreed } = require('@/feargreed/strategies/fngStrategie');
const { getCandles } = require('@/crypto/services/candleService');

async function computeFng(market = 'KRW-BTC', type = 'days', count = 120, ex = 'bithumb') {
    const duration = count;
    const candles = await getCandles(type, market, null, duration + 2, ex);

    const P = [candles.map(c => c.trade_price)];
    const H = [candles.map(c => c.high_price)];
    const L = [candles.map(c => c.low_price)];
    const V = [candles.map(c => c.candle_acc_trade_volume)];

    const stock = new ScoreStock(P, H, L, V);
    const fg = new FearGreed(stock);

    const matrix = fg.computeStock(duration);
    const lastValues = matrix.map(row => row[row.length - 1]);

    return lastValues;
}

module.exports = { computeFng };
