class VariableCalculation {
  getReturnTimeSeries(P) {
    const m = P.length, t = P[0].length;
    const rp = Array.from({ length: m }, () => Array(t - 1).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < t - 1; j++) {
        const num = P[i][j + 1] - P[i][j];
        const den = P[i][j + 1];
        let v = den !== 0 ? (num / den) * 100 : 0;
        if (v === 0) v = 1e-8;
        rp[i][j] = v;
      }
    }
    return rp;
  }

  getEwmTimeSeries(P, alpha) {
    const m = P.length, t = P[0].length;
    const ewm = Array.from({ length: m }, () => Array(t).fill(NaN));
    for (let i = 0; i < m; i++) {
      let prev = 0;
      for (let j = 0; j < t; j++) {
        const val = alpha * P[i][j] + (1 - alpha) * prev;
        ewm[i][j] = val === 0 ? NaN : val;
        prev = val;
      }
    }
    return ewm;
  }

  getVariancePrice(rp) {
    const m = rp.length, t = rp[0].length, lam = 0.94;
    const vp = Array.from({ length: m }, () => Array(t + 1).fill(0));
    for (let j = 0; j < t; j++) {
      for (let i = 0; i < m; i++) {
        vp[i][j + 1] = lam * vp[i][j] + (1 - lam) * (rp[i][j] ** 2);
      }
    }
    return vp.map(row => row.slice(1).map(v => (v === 0 ? NaN : v)));
  }

  getEwmVolume(V, durL = 60, durS = 20) {
    return [
      this.getEwmTimeSeries(V, 1 - 1 / durL),
      this.getEwmTimeSeries(V, 1 - 1 / durS)
    ];
  }

  getLogVp(vp, duration = 365) {
    const m = vp.length, n = vp[0].length;
    const stdp = vp.map(row => row.map(v => Math.sqrt(v)));
    const logMu = Array.from({ length: m }, () => Array(n - duration).fill(0));
    const logStd = Array.from({ length: m }, () => Array(n - duration).fill(0));
    for (let idx = 0; idx < n - duration; idx++) {
      for (let i = 0; i < m; i++) {
        const segment = stdp[i].slice(idx, idx + duration).map(v => Math.log(v));
        const valid = segment.filter(x => !isNaN(x));
        const meanLog = valid.reduce((a, b) => a + b, 0) / valid.length;
        const varLog = valid.reduce((a, b) => a + (b - meanLog) ** 2, 0) / valid.length;
        logMu[i][idx] = meanLog;
        logStd[i][idx] = Math.sqrt(varLog);
      }
    }
    return [logMu, logStd];
  }

  getDisparity(P, alpha) {
    const m = P.length, t = P[0].length;
    const ewmP = this.getEwmTimeSeries(P, alpha);
    return Array.from({ length: m }, (_, i) =>
      Array.from({ length: t }, (_, j) => ((P[i][j] - ewmP[i][j]) / ewmP[i][j]) * 100)
    );
  }

  getEwmScoreMomentum(scoreM, durS = 2, durL = 7) {
    const ewmS = this.getEwmTimeSeries(scoreM, 1 - 1 / durS);
    const ewmL = this.getEwmTimeSeries(scoreM, 1 - 1 / durL);
    return ewmS.map((row, i) => row.map((v, j) => (v + ewmL[i][j]) / 2));
  }

  getWeightVvLongShort(scoreVv) {
    return scoreVv.map(row =>
      row.map(v => {
        const a = 9 * v + 1;
        return [10 - a, a];
      })
    ).reduce((acc, row) => {
      const [lArr, sArr] = row.reduce(
        (p, [l, s]) => [p[0].concat(l), p[1].concat(s)],
        [[], []]
      );
      return acc.length === 0 ? [lArr, sArr] : [acc[0].concat(lArr), acc[1].concat(sArr)];
    }, []);
  }

  getMinMax(arr, thd, method = 'min') {
    return arr.map(v => (method === 'min' ? Math.min(thd, v) : Math.max(thd, v)));
  }
}

class ScoreStock {
  constructor(P, H, L, V) {
    this.P = P;
    this.H = H;
    this.L = L;
    this.V = V.map(row => row.map(v => (v === 0 ? 0.1 : v)));
    this.vc = new VariableCalculation();
  }

  volatilityScore(duration) {
    const rp = this.vc.getReturnTimeSeries(this.P);
    const vp = this.vc.getVariancePrice(rp);
    let [logMu, logStd] = this.vc.getLogVp(vp, duration);
    logStd = logStd.map(row => row.map(v => (v === 0 ? 0.1 : v)));
    const m = logMu.length, n = logMu[0].length;
    return Array.from({ length: m }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        const lnSigma = Math.log(Math.sqrt(vp[i][vp[i].length - n + j]));
        const val = (lnSigma - logMu[i][j]) / logStd[i][j];
        const capped = this.vc.getMinMax([val], -4, 'max')[0];
        return this.vc.getMinMax([capped], 4, 'min')[0];
      })
    );
  }

  volumeScore(ewmL, ewmS) {
    const m = ewmS.length, n = ewmS[0].length;
    return Array.from({ length: m }, (_, i) =>
      Array.from({ length: n - 1 }, (_, j) => {
        const lnS = Math.log(this.V[i][j + 1] / ewmS[i][j]);
        const lnL = Math.log(this.V[i][j + 1] / ewmL[i][j]);
        const val = (lnS + lnL) / 2;
        const capped = this.vc.getMinMax([val], -4, 'max')[0];
        return this.vc.getMinMax([capped], 4, 'min')[0];
      })
    );
  }

  volatilityVolumeScore(volScore, voluScore) {
    const n = volScore[0].length;
    return volScore.map((row, i) =>
      row.map((v, j) => (v + voluScore[i][j + (voluScore[i].length - n)]) / 8 + 0.5)
    );
  }

  weightLongShort(scoreVv) {
    const [l, s] = this.vc.getWeightVvLongShort(scoreVv);
    return [l, s];
  }

  disparity(lL, lS, durL = 30, durS = 7) {
    const xL = this.vc.getDisparity(this.P, 1 - 1 / durL)
      .map(row => row.slice(-lL.length));
    const xS = this.vc.getDisparity(this.P, 1 - 1 / durS)
      .map(row => row.slice(-lS.length));
    return [xL, xS];
  }

  scoreC(duration) {
    const m = this.P.length, t = this.P[0].length;
    return Array.from({ length: m }, (_, i) =>
      Array.from({ length: t - duration }, (_, j) => {
        const segP = this.P[i].slice(j, j + duration);
        const segV = this.V[i].slice(j, j + duration);
        const meanP = segP.reduce((a, b) => a + b, 0) / duration;
        const meanV = segV.reduce((a, b) => a + b, 0) / duration;
        const stdP = Math.sqrt(segP.reduce((a, b) => a + (b - meanP) ** 2, 0) / duration) / meanP;
        const stdV = Math.sqrt(segV.reduce((a, b) => a + (b - meanV) ** 2, 0) / duration) / meanV;
        const val = (stdP + stdV) / 2 || 0.01;
        return 5 + 15 / (Math.exp(1 / val - 2) + 1);
      })
    );
  }

  scoreMomentum(xL, xS, lL, lS, c) {
    return xL.map((row, i) =>
      row.map((v, j) => (c[i][j] * (v * lL[j] + xS[i][j] * lS[j])) / 10)
    );
  }

  betaCompensated(ewmW) {
    return ewmW.map(row =>
      row.map(v => {
        const beta = 2 + Math.abs(v) - 4 / (1 + Math.exp(-Math.abs(v)));
        return v < 0 ? -beta : beta;
      })
    );
  }

  scoreCompensation(scoreM, scoreVv, betaC) {
    return scoreM.map((row, i) =>
      row.map((v, j) => 1 / (1 + Math.exp(-(scoreVv[i][j] * (v - betaC[i][j])))) * 100)
    );
  }
}

class FearGreed {
  constructor(stock) {
    this.stock = stock;
    this.vc = stock.vc;
  }

  computeStock(duration = 120) {
    const volScore = this.stock.volatilityScore(duration);
    const [ewmL, ewmS] = this.vc.getEwmVolume(this.stock.V);
    const voluScore = this.stock.volumeScore(ewmL, ewmS);
    const vvScore = this.stock.volatilityVolumeScore(volScore, voluScore);
    const [lL, lS] = this.stock.weightLongShort(vvScore);
    const [xL, xS] = this.stock.disparity(lL, lS);
    const c = this.stock.scoreC(duration);
    const cTrimmed = c.map(row => row.slice(1));
    const mScore = this.stock.scoreMomentum(xL, xS, lL, lS, cTrimmed);
    const ewmW = this.vc.getEwmScoreMomentum(mScore);
    const betaC = this.stock.betaCompensated(ewmW);
    return this.stock.scoreCompensation(mScore, vvScore, betaC);
  }
}

module.exports = { ScoreStock, FearGreed };
