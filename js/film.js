'use strict';
// 연출감독 · 시나리오 작가 (5단계-4. 피드백 22에서 '영화감독'으로 바꿨다가, 웹드라마·드라마·OTT도 찍어서 피드백 24에서 '연출감독'으로 되돌렸다)
// 감독: 단편영화로 시작하거나 제작사 연출부(조감독)로 들어간다. 데뷔할 때 그 제작사와 전속 계약을 맺거나 프리랜서로 나간다.
// 전속 감독은 계약금을 한 번에 받고, 회사가 맡기는 작품마다 연출료를 받는다 (피드백 23). 프리랜서는 제안을 기다리거나 직접 연출 자리를 찾는다
// 같은 장르·같은 매체를 많이 찍을수록 연출 숙련도가 오른다 (피드백 23)
// 작가: 일정에 '시나리오 집필'을 넣으면 원고가 조금씩 써진다. 다 쓴 원고는 제작사에 팔거나, 공모전에 내거나, 직접 연출한다
// 두 직업 다 연말 영화상(신인감독상·감독상·각본상·작품상) 후보가 될 수 있다

const DIR_TIERS = ['감독 지망생', '단편영화 감독', '독립영화 감독', '신인 감독', '중견 감독', '흥행 감독', '거장'];
const WRITER_TIERS = ['작가 지망생', '신인 작가', '현역 작가', '주목받는 작가', '중견 작가', '흥행 작가', '스타 작가'];
// 감독이 찍는 작품: months 촬영, post 후반 작업(공개까지), fee 연출료 배수, demand 연출 평 기준
const DIR_PJ = {
  short: { n: '단편영화', months: 1, post: 1, fee: 0, demand: 12 },
  web: { n: '웹드라마', months: 2, post: 1, fee: 0.5, demand: 25 },
  drama: { n: '드라마', months: 5, post: 1, fee: 1.5, demand: 40 },
  ott: { n: 'OTT 시리즈', months: 4, post: 2, fee: 2, demand: 45 },
  film: { n: '영화', months: 4, post: 4, fee: 2, demand: 45 },
};
const DIR_FEE = [300, 500, 800, 2500, 5000, 9000, 20000]; // 만 원 (등급별, 작품 종류 배수를 곱한다)
// 작품 사이사이 들어오는 광고 연출료 (만 원, 뮤직비디오는 절반). 독립영화 감독부터
const DIR_SIDE = [0, 0, 300, 700, 1500, 3000, 6000];
// 크게 잘된 연출작의 부가 판권 (해외 배급·VOD 등에서 감독 몫)
const DIR_IP = ['해외 배급', 'VOD', 'TV 방영권', '해외 리메이크 판권', '감독판 블루레이'];
// 등급마다 일의 크기 (점수·섭외·투자에 곱한다. 예전 5단계의 0~4 눈금)
const DIR_POW = [0, 0.5, 1, 2, 2.5, 3, 4];
// 등급이 오르는 기준 (k번째 칸 → k+1): sc 점수, rv 연출 호평이면 이만큼 낮춰 준다, big 큰 작품(드라마·OTT·영화)이어야 하는지
// 거장: 흥행 감독이 된 뒤 대작에서 hit점 이상을 hits번, 평판 rep 이상 (수능 1등급처럼 상위 4%만. 200명: 지망생 13 · 단편 12 · 독립 22 · 신인 14 · 중견 22 · 흥행 15 · 거장 4%)
// v99 (8-5): 거장은 예술 감각 52 이상 (작품성으로 남는 감독)
const DIR_UP = { sc: [67, 70, 74, 80, 85], rv: [0, 0, 6, 5, 4], big: [0, 0, 1, 1, 1], hit: 91, hits: 3, rep: 76, tal: 'aesth', min: 52 };
const SHORT_FEST = ['한강단편영화제', '푸른단편영화제', '청춘단편영화제'];
// 원고 종류별 값 (만 원)과 쓰는 속도 배수 (드라마는 회차가 많아 오래 걸린다)
const SCRIPT_BASE = { web: 300, drama: 3000, ott: 4000, film: 2500 };
const SCRIPT_SPEED = { web: 1.5, drama: 0.6, ott: 0.8, film: 1 };
const WRITER_MULT = [1, 1.3, 1.7, 2.4, 3.6, 6.5, 12];
// 작가 등급마다 일의 크기 (원고 판매 확률에 곱한다)
const WRITER_POW = [0, 1, 1.5, 2, 2.5, 3, 4];
// 작가 등급이 오르는 기준 (k번째 칸 → k+1): sc 작품 점수, big 웹드라마가 아닌 작품이어야 하는지, 스타 작가는 평판 rep도
// v99 (8-5): 스타 작가는 창의력 52 이상 (새로운 이야기를 만드는 사람)
const WRITER_UP = { sc: [58, 66, 70, 75, 80, 81.5], big: [0, 0, 0, 1, 1, 1], rep: 70, hits: 2, tal: 'creative', min: 52 };
const CONTEST = { film: '한빛 시나리오 공모전', drama: '방송사 극본 공모전', ott: 'OTT 오리지널 극본 공모전', web: '웹드라마 극본 공모전' };
CERE_N['영화'] = '올해의 영화상';
Object.assign(CAREER_SHORT, { director: '연출감독', writer: '시나리오 작가' });

// 연출감독 합격 (v99, 8-5): 연출(강함) + 교육(보통, 없으면 손해 없음: 레벨 1에 0.1) + 면접 통찰력(보통, 가산점) + 등급 · 평판. 작문은 뺐다
function dirScore(s) { const p = me(s), t = s.tracks.director || {}; return lv(p, 'direct') * 0.85 + fitB(p, ['edu']) + talB(p.tal.insight, false) + DIR_POW[t.tier || 0] * 5 + (t.rep || 0) * 0.1; }
function dirFee(tier, tk, s) { return Math.round(DIR_FEE[tier] * DIR_PJ[tk].fee * U.fl(0.85, 1.15) * (s ? awMul(s, 'director') : 1)) * 1e4; }
// 작품 성적 문장 (점수 0~100)
function filmRes(tk, sc) {
  if (tk === 'drama') return `최고 시청률 ${U.clamp((sc - 30) / 3.5, 0.6, 32).toFixed(1)}%`;
  if (tk === 'web') return `누적 조회수 ${fmtFans(Math.round(Math.pow(10, 4 + sc / 22))).replace('명', '회')}`;
  if (tk === 'ott') return `OTT 주간 순위 ${sc >= 80 ? '1위' : sc >= 70 ? U.int(2, 5) + '위' : sc >= 58 ? U.int(5, 15) + '위' : '20위 밖'}`;
  return `관객 ${fmtFans(filmAud(sc))}`;
}
function filmAud(sc) { return Math.min(1.7e7, Math.round(Math.pow(10, 4.3 + sc / 30))); }
// 연출 평 (연기 평과 같은 다섯 단계): 연출 실력이 작품이 요구하는 수준(demand)을 얼마나 넘는지에 예술 감각·전달력이 보탠다
const DIR_BIG = { hi: 33, lo: -18 };
const DIR_RV_REP = { '연출 대호평': 5, '연출 호평': 2, '무난한 연출': 0, '연출 혹평': -3, '연출 대혹평': -7 };
const DIR_RV_YB = { '연출 대호평': 12, '연출 호평': 6, '무난한 연출': 0, '연출 혹평': -6, '연출 대혹평': -12 };
function dirPerf(p, demand) { return lv(p, 'direct') + (p.tal.aesth - 50) * 0.12 + (p.tal.verbal - 50) * 0.08 + U.normal(0, 6) - demand; }
function dirReview(perf) { return perf > DIR_BIG.hi ? '연출 대호평' : perf > 12 ? '연출 호평' : perf > -5 ? '무난한 연출' : perf > DIR_BIG.lo ? '연출 혹평' : '연출 대혹평'; }
// 연출 평은 영화감독으로서의 인기를 바꾼다. 대호평·대혹평은 작품을 많이 볼수록(w: 작품 크기) 감독 이름이 크게 오르내리고 이름도 알려진다
function dirReviewFx(s, d, sc, w = 1) {
  const hot = U.clamp((sc - 30) / 50, 0.1, 1.4) * w;
  if (d.review === '연출 대호평') {
    d.boom = Math.round(Math.max(d.gain || 0, fanGain(s, sc, 'kr', 0.5), 0) * (0.3 + hot) + (800 + s.fans.kr * 0.02) * w * popSpeed(s) * Math.max(0, 1 - s.fans.kr / FANCAP.kr));
    s.fans.kr += d.boom; jpopAdd(s, 'director', 2 + hot * 5); addFame(s, 1 + hot * 3);
  } else if (d.review === '연출 대혹평') {
    d.boom = -Math.round(s.fans.kr * Math.min(0.25, 0.03 + hot * 0.1));
    s.fans.kr += d.boom; jpopAdd(s, 'director', -3 - hot * 6); addFame(s, hot * 2);
  } else if (d.review === '연출 혹평') jpopAdd(s, 'director', -2);
  else jpopAdd(s, 'director', d.review === '연출 호평' ? 1.5 : (sc - 50) / 25);
}
function dirReviewText(d) {
  return d.review === '연출 대호평' ? `\n\n'감독이 작품을 살렸다'는 평이 쏟아졌다. 명장면을 풀이하는 영상이 여기저기 퍼졌다.`
    : d.review === '연출 대혹평' ? '\n\n연출이 작품을 망쳤다는 혹평이 쏟아졌다. 감독 이름이 조롱거리가 됐다.'
    : d.review === '연출 혹평' ? '\n\n연출이 아쉽다는 기사가 났다.' : '';
}
function castAvgOf(s, ids) { const c = (ids || []).map(id => s.people[id]).filter(Boolean); return c.length ? c.reduce((a, x) => a + lv(x, 'acting'), 0) / c.length : 40; }

// ════════ 영화감독 (제작사가 맡기는 작품을 찍는다) ════════
// 전속 계약 (피드백 23): 월급 대신, 계약 기간 동안 받을 연봉을 지금 가치로 바꾼 계약금을 한 번에 받고 작품마다 연출료를 받는다
// DIR_EXCL_SAL: 등급별 한 달 연봉 몫 (만 원). 연 5%로 할인해 더한다. 연출료는 프리랜서 연출료의 60%에서 시작한다
// 계약 기간은 명성(업계 평판과 등급)이 높을수록 길게 내민다 (2~5년). 협상은 계약금 · 연출료 · 계약 기간 중 한 가지만 할 수 있다
const DIR_EXCL_SAL = [250, 280, 320, 400, 550, 750, 1000], DIR_EXCL_FEE = 0.6, DIR_EXCL_RATE = 0.05;
function dirExclBonus(tier, months) { const m = DIR_EXCL_SAL[tier] * 1e4; let v = 0; for (let i = 1; i <= months; i++) v += m / Math.pow(1 + DIR_EXCL_RATE, i / 12); return Math.round(v / 1e6) * 1e6; }
function dirExclMonths(rep, tier) { return 12 * U.clamp(2 + Math.floor(((rep || 0) + DIR_POW[tier] * 10) / 35), 2, 5); }
function dirExclFee(t, v) { return Math.round(v * (t.feeR || DIR_EXCL_FEE) / 1e5) * 1e5; }
// 전속 계약서 (데뷔할 때, 계약이 끝날 때). 계약 협상 창(contract_nego)으로 연다
function dirNego(s, renew, pj) {
  const t = s.tracks.director, tier = Math.max(2, t.tier), months = dirExclMonths(t.rep, tier);
  const d = { kind: 'director', ag: t.co, agN: t.co, months, bonus: dirExclBonus(tier, months), feeR: renew ? Math.max(DIR_EXCL_FEE, t.feeR || 0) : DIR_EXCL_FEE, tier, renew: !!renew, oneAsk: true, mMin: 12, mMax: 72, lev: U.clamp(0.2 + (t.rep || 0) / 200 + tier * 0.04, 0.2, 0.8), tried: [] };
  if (pj) { d.pj = pj; d.pjFee = pj.fee; }
  if (renew) d.note = `${josa(t.co, '과와')}의 전속 계약 기간이 다 됐다.`;
  d.orig = { months: d.months, bonus: d.bonus, feeR: d.feeR };
  return d;
}
function dirExclSign(s, d) {
  const t = s.tracks.director;
  t.renewQ = false;
  earn(s, d.bonus, '전속 계약금', 'director');
  Object.assign(t, { cEnd: s.t + d.months, cMonths: d.months, bonus: d.bonus, feeR: d.feeR });
  if (d.renew) return `${josa(t.co, '과와')} 전속 계약을 ${yrs(d.months)} 더 이어 가기로 했다. 계약금 ${josa(fmtWon(d.bonus), '을를')} 받았다.`;
  t.hist.push(`${t.co} 연출부 → 전속 감독`); t.mode = 'excl';
  return `${josa(t.co, '과와')} ${yrs(d.months)} 전속 계약을 맺었다. 계약금 ${josa(fmtWon(d.bonus), '을를')} 받았다. ` + startDirProject(s, Object.assign({}, d.pj, { fee: dirExclFee(t, d.pj.fee) }));
}
// 전속 계약을 중간에 깨면 계약금 중 남은 기간 몫을 돌려준다
function dirExclPen(s, t) { return t.cMonths ? Math.round((t.bonus || 0) * U.clamp((t.cEnd - s.t) / t.cMonths, 0, 1) / 1e5) * 1e5 : 0; }
NEGO.director = {
  what: d => d.renew ? '' :'전속 감독 계약이다. 계약금을 한 번에 주고, 회사가 맡기는 작품마다 연출료를 준다.',
  sign: (s, d) => dirExclSign(s, d),
  refuse: (s, d) => { if (d.renew) return dirGoFree(s, '계약 만료'); fireEvent(s, 'dir_debut', { pj: d.pj, noExcl: true }); return '전속 계약은 하지 않기로 했다.'; },
  lost: (s, d) => {
    if (d.renew) return `${d.agN}에서 재계약 이야기를 없던 일로 하자고 했다. ` + dirGoFree(s, '계약 만료');
    queueEv(s, 'dir_debut', 0, { pj: d.pj, noExcl: true }, true);
    return `${d.agN}에서 전속 계약 이야기는 없던 일로 하자고 했다. 데뷔작은 프리랜서로 맡을 수 있다.` + fx(s, { stress: 5 });
  },
  // 계약 기간이 바뀌면 계약금도 그 기간에 맞춰 다시 셈한다
  retune: (x, k) => { if (k === 'months' || k === 'mUp') x.bonus = dirExclBonus(x.tier, x.months); },
};
// ── 연출 숙련도 (피드백 23): 같은 장르, 같은 매체(단편영화·웹드라마·드라마·OTT 시리즈·영화)로 많이 찍을수록 오른다 (0~100, s.dmast { g: 장르, f: 매체 })
// 장르 숙련도는 작품 점수를(최대 +4), 매체 숙련도는 연출 평을(최대 +5) 올린다. 창의력이 높으면 빨리 오른다 (각본·곡 숙련도와 같은 셈)
function dmGet(s, kind, k) { return ((s.dmast || {})[kind] || {})[k] || 0; }
function dmGain(s, genre, tk, amt) {
  const M = s.dmast = s.dmast || { g: {}, f: {} }, cr = 0.6 + me(s).tal.creative / 100;
  for (const [kind, k] of [['g', genre], ['f', tk]]) { if (!k) continue; const m = M[kind][k] || 0; M[kind][k] = Math.min(100, m + amt * (1 - m / 100) * cr); }
}
function dmScore(s, pj) { return (dmGet(s, 'g', pj.genre) - 15) / 20; }
function dmPerf(s, tk) { return (dmGet(s, 'f', tk) - 15) / 17; }
function dmHint(s, genre, tk) { const g = dmGet(s, 'g', genre), f = dmGet(s, 'f', tk); return `숙련도 ${genre} ${gauge(g)} ${Math.floor(g)} · ${DIR_PJ[tk].n} ${gauge(f)} ${Math.floor(f)}`; }
function dmBars(s, kind) {
  const M = (s.dmast || {})[kind] || {}, tr = (s.trendTV || {}).drama;
  const ks = kind === 'f' ? Object.keys(DIR_PJ) : Object.keys(M).filter(k => M[k] >= 1).concat(tr && !(M[tr] >= 1) ? [tr] : []);
  return ks.map(k => ({ n: kind === 'f' ? DIR_PJ[k].n : k, v: M[k] || 0, tag: kind === 'g' && k === tr ? '유행' : '' })).sort((a, b) => b.v - a.v);
}
function startDirector(s, o = {}) {
  const old = s.tracks.director;
  s.tracks.director = Object.assign({ st: 'active', mode: 'indie', tier: old.tier || 0, works: old.works || 0, rep: old.rep || 0, hist: old.hist || [], proj: null, adM: 0 }, o);
  if (!old.works && !(old.hist || []).length) milestone(s, `${age(s)}세에 연출감독의 길에 들어섰다.`);
}
// 들어온 연출 제안. 등급이 오를수록 큰 작품이 들어온다
function genDirProjects(s, n) {
  const t = s.tracks.director, tier = t.tier, out = [];
  const kinds = [['short', 'short', 'web'], ['short', 'web', 'web'], ['short', 'web', 'web', 'drama', 'film'], ['web', 'drama', 'drama', 'ott', 'film'], ['web', 'drama', 'ott', 'film', 'film'], ['drama', 'ott', 'film', 'film'], ['drama', 'ott', 'film', 'film']][tier];
  // 제작사 작품을 한 번이라도 찍었으면(pro) 내 돈으로 찍는 단편영화 제안은 오지 않고, 등급이 낮으면 웹드라마·드라마가 온다
  const K = !t.pro ? kinds : tier < 2 ? ['web', 'web', 'drama'] : kinds.filter(k => k !== 'short');
  for (let i = 0; i < n; i++) {
    const tk = U.pick(K), T = DIR_PJ[tk];
    const genre = U.chance(0.35) ? s.trendTV.drama : U.pick(DRAMA_TRENDS);
    const writer = pickIndustry(s, '시나리오 작가');
    const q = U.clamp(Math.round(lv(writer, 'script') * 0.6 + U.int(5, 40)), 10, 95);
    const demand = T.demand + (tier >= 5 && tk === 'film' ? 8 : 0);
    const p = tk === 'short' ? 1 : U.clamp(U.sig((dirScore(s) + pm(s, 'audition', 0) - demand) / 6), 0.05, 0.95);
    const cost = tk === 'short' ? U.int(3, 15) * 100e4 : 0;
    out.push({ title: dramaTitle(genre), tk, genre, q, writer: writer.id, co: tk === 'short' ? '' : U.pick(PROD_CO), fee: tk === 'short' ? 0 : dirFee(tier, tk, s), cost, p, demand });
  }
  return out;
}
function dirLabel(pj) { return `${DIR_PJ[pj.tk].n} · ${pj.genre}`; }
// 촬영 시작: 배우들과 작가를 만난다. 촬영하는 동안 일정 두 칸이 묶인다
function startDirProject(s, pj) {
  const t = s.tracks.director, T = DIR_PJ[pj.tk];
  const cast = [];
  for (let i = 0, n = pj.tk === 'short' ? 2 : U.int(2, 4); i < n; i++) cast.push(pickIndustry(s, '배우', x => !cast.includes(x)));
  for (const c of cast) meetAt(s, c, `${T.n} 「${pj.title}」`, 'director');
  if (pj.writer !== 'me' && s.people[pj.writer]) meetAt(s, s.people[pj.writer], `${T.n} 「${pj.title}」`, 'director');
  if (pj.cost) addMoney(s, -pj.cost, '단편영화 제작비');
  if (t.mode === 'ad') { t.hist.push(`${t.co} 연출부 (감독 데뷔)`); t.mode = 'indie'; t.co = ''; t.sal = 0; }
  if (pj.tk !== 'short') t.pro = true;
  t.proj = Object.assign({}, pj, { id: 'dp' + U.uid(), left: T.months, cast: cast.map(c => c.id), setQ: 0 });
  if (pj.tk !== 'short' && T.months >= 2) queueEv(s, 'dir_set', Math.max(1, Math.floor(T.months / 2)), { id: t.proj.id });
  return `${T.n} 「${pj.title}」 연출을 맡았다! ${T.months}개월 동안 촬영한다.${pj.cost ? ` 제작비 ${fmtWon(pj.cost)}은 내 돈으로 댔다.` : ''}${pj.writer === 'me' ? ' 각본은 내가 썼다.' : ''}`;
}
function dirChoices(s, ps) {
  return ps.map(pj => {
    const wr = pj.writer === 'me' ? '내 각본' : `각본 ${grade5(me(s), pj.q, 'q', 'script')}`;
    return {
      t: `「${pj.title}」 ${dirLabel(pj)}`, tr: pj.genre === s.trendTV.drama,
      h: pj.tk === 'short' ? `제작비 ${fmtWon(pj.cost)} (내 돈) · 촬영 1개월 · ${wr} · ${dmHint(s, pj.genre, pj.tk)}${s.money < pj.cost ? ' · 돈이 모자라다' : ''}` : `${pj.co} · 맡을 가능성 ${fmtPct(pj.p)} · 연출료 약 ${fmtWon(pj.fee)} · 촬영 ${DIR_PJ[pj.tk].months}개월 · ${wr} · ${dmHint(s, pj.genre, pj.tk)}`,
      ok: s => s.money >= (pj.cost || 0),
      f: s => U.chance(pj.p) ? startDirProject(s, pj) + fx(s, { stress: -3 }) : `${pj.co}에서 다른 감독을 골랐다.` + fx(s, { stress: 2 * pm(s, 'loseStress') }),
    };
  });
}
CAREERS.director = {
  n: '연출감독', ic: '🎥', emp: true,
  desc: '제작사가 맡기는 영화·드라마·웹드라마를 연출한다. 단편영화나 제작사 연출부에서 시작한다. 데뷔할 때 그 제작사와 전속 계약을 맺거나 프리랜서로 나간다. 연출과 각본이 가장 중요하다. 촬영하며 배우들을 디렉팅하는데, 교육이 높을수록 배우 연기를 끌어올린다.',
  act: { n: '연출 작업 (기획·촬영)', ic: '🎥', g: '직업 활동', eff: [['연출', '↑↑', 1], ['교육', '↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) {
    if (t.st !== 'active') return t.endNote || '';
    return `${DIR_TIERS[t.tier]}${t.mode === 'ad' ? ` · ${t.co} 연출부 조감독` : t.mode === 'excl' ? ` · ${t.co} 전속 감독` : ' · 프리랜서'} · 연출작 ${t.works}편` + (t.proj ? ` · 「${t.proj.title}」 촬영 중 (${t.proj.left}개월 남음)` : '');
  },
  short(s, t) { return t.mode === 'ad' ? `${t.co} 조감독` : '연출감독'; },
  seg(s, t) { return t.mode === 'ad' ? `${t.co} 연출부 조감독` : t.mode === 'excl' ? `${t.co} 전속 감독` : '연출감독'; },
  title(s, t) { return t.works ? DIR_TIERS[t.tier] : null; },
  contract(s, t) { return t.st === 'active' && t.mode === 'ad' ? `${t.co} (연출부)` : t.st === 'active' && t.mode === 'excl' ? `${t.co} (전속 계약)` : ''; },
  cLeft(s, t) { return t.mode === 'excl' && t.cEnd != null ? t.cEnd - s.t : null; },
  mainSk() { return 'direct'; },
  info(s, t) {
    const p = me(s), R = [['등급', DIR_TIERS[t.tier]], ['내 실력', ['direct', 'script', 'edit'].filter(k => has(p, k)).map(k => `${SKILLS[k].n} ${lvi(p, k)}`).join(' · ') || '-'], ['업계 평판', `${Math.round(t.rep)}`], ['연출작', `${t.works}편`]];
    if (t.mode === 'ad') R.unshift(['일하는 곳', `${t.co} 연출부 조감독 · 월급 ${fmtWon(t.sal)}`]);
    else if (t.mode === 'excl') R.unshift(['일하는 곳', `${t.co} 전속 감독 · 연출료 프리랜서의 ${pctN(t.feeR || DIR_EXCL_FEE)}`]);
    else R.unshift(['일하는 곳', '프리랜서']);
    R.push({ h: '장르 숙련도', bars: dmBars(s, 'g') }, { h: '매체 숙련도', bars: dmBars(s, 'f') });
    if (t.proj) R.push({ h: `「${t.proj.title}」 촬영 중 (${t.proj.left}개월 남음)`, items: [`${dirLabel(t.proj)} · 각본 ${t.proj.writer === 'me' ? '나' : (s.people[t.proj.writer] || {}).name || '-'}`].concat(t.proj.cast.map(id => s.people[id]).filter(Boolean).map(x => ({ who: x.id, t: x.name, sub: `연기 ${lvSee(s, x, 'acting')} · ${relWord(x)}` }))) });
    return R;
  },
  locks(s, t) { return t.proj ? Array(Math.min(s.slots.length, 2)).fill('c_director') : []; },
  actions(s, t) {
    if (t.st !== 'active') return [];
    const A = [];
    // 서랍 속 내 각본으로 투자를 받아 직접 찍는다
    for (const sc of (s.scripts || []).filter(x => x.st === 'done')) A.push({ t: `내 각본 「${sc.title}」 직접 연출하기`, h: `${DIR_PJ[sc.tk].n} · ${sc.genre} · 투자를 받아야 찍을 수 있다`, ok: !t.proj && !(sc.pitchT > s.t), why: t.proj ? '지금 다른 작품을 찍고 있다' : '얼마 전에 투자를 못 받았다 (1년 뒤 다시)', run: s => dirPitch(s, sc) });
    if (t.mode === 'indie') A.push({ t: '연출 자리 찾기', h: '아는 제작사들에 연락을 돌린다 · 다음 달에 연출 제안이 온다', ok: !t.proj && !(s.cd.dirSeek > s.t) && !hasQ(s, 'dir_offer') && !s.hiatus, why: t.proj ? '지금 작품을 찍고 있다' : hasQ(s, 'dir_offer') ? '들어온 제안이 있다' : s.hiatus ? '자숙 중이다' : `${s.cd.dirSeek - s.t}개월 뒤에 다시 할 수 있다`, btn: '찾기', run: s => { s.cd.dirSeek = s.t + 3; queueEv(s, 'dir_offer', 1, { seek: true }); return '아는 제작사들에 연락을 돌렸다.'; } });
    if (t.mode === 'excl') { const pen = dirExclPen(s, t); A.push({ t: '전속 계약 깨기', h: `프리랜서 감독이 된다${pen ? ` · 위약금 ${fmtWon(pen)} (계약금 중 남은 기간 몫)` : ''}`, ok: !t.proj, why: '촬영 중에는 나갈 수 없다', danger: true, confirm: `${josa(t.co, '과와')}의 전속 계약을 깨고 프리랜서 감독이 될까요?`, run: s => { if (pen) addMoney(s, -pen, '전속 계약 위약금'); return dirGoFree(s, '계약 해지') + (pen ? ` 위약금 ${josa(fmtWon(pen), '을를')} 냈다.` : ''); } }); }
    if (t.mode === 'ad') A.push({ t: '연출부 그만두기', h: '혼자 단편영화부터 다시 시작한다', ok: !t.proj, danger: true, confirm: '연출부를 그만둘까요?', run: s => { t.hist.push(`${t.co} 연출부 (퇴사)`); t.mode = 'indie'; t.co = ''; t.sal = 0; return '연출부를 그만두고 혼자 작품을 준비하기로 했다.'; } });
    A.push({ t: '감독 일 그만두기', ok: !t.proj, why: '촬영 중에는 그만둘 수 없다', danger: true, confirm: '정말 감독 일을 그만둘까요?', run: s => { t.st = 'ended'; t.endNote = `${DIR_TIERS[t.tier]}, 연출작 ${t.works}편`; t.hist.push(t.endNote); return '감독 일을 그만뒀다.'; } });
    return A;
  },
  monthly(s, t) {
    if (t.st !== 'active') return;
    t.months = (t.months || 0) + 1;
    if (calM(s) === 11) dirAwards(s, t);
    const p = me(s), n = slotsOn(s, 'c_director');
    if (t.proj) {
      practice(s, p, 'direct', 1.5 * Math.max(1, n)); useSkill(s, p, 'script', 0.2);
      // v95: 배우들을 디렉팅하며 교육이 조금씩 는다 (처음이면 교육 특기가 생긴다)
      if (!has(p, 'edu')) learnSkill(s, p, 'edu', 1);
      practice(s, p, 'edu', 0.5);
      dmGain(s, t.proj.genre, t.proj.tk, 0.8);
      addStress(s, 3.5);
      for (const id of t.proj.cast) { const c = s.people[id]; if (c) bond(s, c, U.chance(0.12) ? -U.int(4, 10) : U.int(0, 3)); }
      if (--t.proj.left <= 0) {
        const wait = airDelay(t.proj.tk); queueEv(s, 'dir_res', wait, { pj: t.proj }, true);
        addLog(s, `「${t.proj.title}」 촬영을 마쳤다. 후반 작업에 들어간다. ${ymLater(s, wait)}쯤 공개된다.`, 'career');
        // 제작사 작품은 후반 작업에서 편집 방향을 정한다. 전속 감독은 몇 달 뒤 회사가 다음 작품을 맡긴다
        if (t.proj.tk !== 'short') queueEv(s, 'dir_edit', 0, { id: t.proj.id }, true);
        if (t.mode === 'excl') t.nextT = s.t + U.int(3, 6);
        t.proj = null;
      }
      return;
    }
    if (t.mode === 'ad') {
      // 조감독: 월급을 받으며 현장을 배운다. 실력이 쌓이면 제작사가 데뷔작을 맡긴다
      earn(s, t.sal, '월급', 'director');
      t.adM++;
      if (n) { practice(s, p, 'direct', 1.1 * n); addStress(s, 2); }
      if (t.adM % 6 === 0 && lv(p, 'direct') >= 35 && U.chance(0.4)) queueEv(s, 'dir_debut', 0);
      return;
    }
    if (t.mode === 'excl') {
      if (n) { practice(s, p, 'direct', 1.1 * n); useSkill(s, p, 'script', 0.2 * n); addStress(s, 1.5); }
      if (t.tier >= 2 && !s.inbox.some(m => m.kind === 'dir_side') && U.chance((0.02 + 0.012 * t.tier) * stigmaMul(s))) dirSideOffer(s, t);
      // 계약이 끝나면 회사가 재계약 조건을 내민다 (계약금을 다시 한 번에)
      if (s.t >= (t.cEnd || 0)) { if (!t.renewQ) { t.renewQ = true; queueEv(s, 'contract_nego', 0, dirNego(s, true), true); } }
      else if (s.t >= (t.nextT || 0) && !hasQ(s, 'dir_assign')) { t.nextT = s.t + 3; queueEv(s, 'dir_assign', 0); }
      return;
    }
    // 작품 사이사이 광고·뮤직비디오 연출 의뢰 (독립영화 감독부터)
    if (t.tier >= 2 && !s.inbox.some(m => m.kind === 'dir_side') && U.chance((0.02 + 0.012 * t.tier) * stigmaMul(s))) dirSideOffer(s, t);
    if (n) { practice(s, p, 'direct', 1.2 * n); useSkill(s, p, 'script', 0.2 * n); addStress(s, 1.5); }
    if (!n && t.tier < 3) return;
    const chance = stigmaMul(s) * (0.13 + DIR_POW[t.tier] * 0.03 + Math.min(0.08, t.rep / 800)) * access(s) * (n ? 1 : 0.4);
    if (!hasQ(s, 'dir_offer') && U.chance(chance)) queueEv(s, 'dir_offer', 0);
  },
};
JOB_APPLY.push({
  id: 'director_short', trk: 'director', g: '🎥 연출감독', n: '단편영화 찍으며 시작하기',
  show: s => !trackOn(s, 'director'),
  h: s => '제작비는 내 돈으로 댄다 · 일정에 연출 작업을 넣으면 찍을 거리가 생긴다',
  ok: s => !s.army && age(s) >= 16 && lv(me(s), 'direct') >= 15,
  why: s => s.army ? '군 복무 중' : age(s) < 16 ? '16세부터 할 수 있다' : '연출을 더 배워야 한다',
  run: s => { startDirector(s); return '단편영화를 찍으며 감독 일을 시작하기로 했다.'; },
});
// v207: 영상 제작사마다 따로 지원한다. 큰 회사일수록 문턱이 높다 (소형 29 · 중형 32 · 대형 35). 회사 특징 (CO_FOCUS.prod)
function dirAdP(s, c) { return audP(coFocus(s, 'prod', c.con, dirScore(s)), 26 + c.tier * 3); }
PROD_COS.forEach((x0, i) => { const key = 'prod.' + i; JOB_APPLY.push({
  id: 'director_ad_p' + i, coKey: key, pos: '연출부 지원 (조감독)', trk: 'director', g: '🎥 연출감독', get n() { return `${coByKey(key).n} 연출부 지원 (조감독)`; }, get tag() { return `${TIER_N[coByKey(key).tier]} · 월급 200만 원`; },
  show: s => !(trackOn(s, 'director') && (s.tracks.director.mode === 'ad' || s.tracks.director.mode === 'excl' || s.tracks.director.tier >= 3)) && age(s) >= 20,
  h: s => lv(me(s), 'direct') >= 25 ? `합격 가능성 ${fmtPct(dirAdP(s, coByKey(key)))} · 결과는 다음 달` : '연출이 25레벨 이상이어야 지원할 수 있다',
  ok: s => !s.army && lv(me(s), 'direct') >= 25 && !agencyContract(s) && !hasQ(s, 'dir_ad_res') && !(s.cd['dirAd_' + key] > s.t) && !(trackOn(s, 'director') && s.tracks.director.proj),
  why: s => s.army ? '군 복무 중' : lv(me(s), 'direct') < 25 ? '연출을 더 배워야 한다' : agencyContract(s) ? contractWhy(s) : hasQ(s, 'dir_ad_res') ? '결과를 기다리는 중' : trackOn(s, 'director') && s.tracks.director.proj ? '지금 작품을 찍고 있다' : '얼마 전에 지원했다 (반년 뒤 다시)',
  run: s => { const c = coByKey(key); s.cd['dirAd_' + key] = s.t + 6; queueEv(s, 'dir_ad_res', 1, { co: c.n, p: dirAdP(s, c) }); return `${c.n} 연출부에 지원했다.`; },
}); });
E({
  id: 'dir_ad_res', cat: '채용', title: '연출부 채용 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); },
  text: (s, d) => d.pass ? `${d.co} 연출부에서 조감독으로 일해 보자는 연락이 왔다. 월급은 200만 원.` : `${d.co} 연출부 채용에 떨어졌다.`,
  ch: (s, d) => d.pass ? [
    { t: '들어간다', nj: 'director', nm: ['emp'], ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '', f: s => { if (trackOn(s, 'director')) Object.assign(s.tracks.director, { mode: 'ad', co: d.co, sal: 200e4, adM: 0 }); else startDirector(s, { mode: 'ad', co: d.co, sal: 200e4 }); return `${d.co} 연출부에 조감독으로 들어갔다.`; } },
    { t: '거절한다', f: () => '연출부 제안을 거절했다.' },
  ] : [{ t: '확인', f: () => `${d.co} 연출부 채용에 떨어졌다.` }],
});
// 조감독으로 실력을 인정받으면 제작사가 데뷔작을 맡긴다
E({
  id: 'dir_debut', cat: '연출 제안', title: '감독 데뷔 제안', tag: 'career',
  cond: s => trackOn(s, 'director') && s.tracks.director.mode === 'ad' && !s.tracks.director.proj,
  init(s, d) { if (d.pj) return; const t = s.tracks.director; d.pj = genDirProjects(s, 4).find(x => x.tk !== 'short') || Object.assign(genDirProjects(s, 1)[0], { tk: 'web' }); d.pj.co = t.co; d.pj.p = 1; d.pj.fee = dirFee(Math.max(2, t.tier), d.pj.tk, s); d.pj.cost = 0; },
  text: (s, d) => `${s.tracks.director.co}에서 내 데뷔작을 맡기겠다고 한다.\n\n${DIR_PJ[d.pj.tk].n} 「${d.pj.title}」 · ${d.pj.genre} · 연출료 약 ${fmtWon(d.pj.fee)} · 각본 ${grade5(me(s), d.pj.q, 'q', 'script')}\n\n${d.noExcl ? '전속 계약 없이 프리랜서로 나가서 찍을지 정해야 한다.' : '이 회사와 전속 계약을 맺을지, 프리랜서로 나가서 찍을지 정해야 한다.'}`,
  ch: (s, d) => [
    d.noExcl ? null : { t: '전속 계약서를 받아 본다', h: '계약금을 한 번에 받는다 · 작품마다 연출료 · 다음 작품은 회사가 맡긴다', f: s => startNego(s, dirNego(s, false, d.pj)) },
    { t: '프리랜서로 나가 맡는다', h: '연출료를 다 받는다 · 다음 작품은 직접 찾는다', f: s => startDirProject(s, d.pj) },
    { t: '아직은 배운다', f: () => '데뷔 제안을 미뤘다. 조감독으로 조금 더 배우기로 했다.' },
  ].filter(Boolean),
});
// 전속 감독: 회사가 다음 작품을 맡긴다 (회사가 정하는 일이라 확인 버튼 하나)
function dirGoFree(s, why) { const t = s.tracks.director, co = t.co; t.hist.push(`${co} 전속 감독 (${why})`); Object.assign(t, { mode: 'indie', co: '', sal: 0, feeR: 0, renewQ: false, cEnd: null, cMonths: 0, bonus: 0 }); return `${josa(co, '을를')} 나와 프리랜서 감독이 됐다.`; }
E({
  id: 'dir_assign', cat: '연출', title: '다음 작품', tag: 'career',
  cond: s => trackOn(s, 'director') && s.tracks.director.mode === 'excl' && !s.tracks.director.proj && !s.hiatus && !pregMe(s),
  init(s, d) {
    const t = s.tracks.director;
    d.pj = U.pick(genDirProjects(s, 3).filter(x => x.tk !== 'short')) || Object.assign(genDirProjects(s, 1)[0], { tk: 'web' });
    Object.assign(d.pj, { co: t.co, p: 1, cost: 0, fee: dirExclFee(t, dirFee(t.tier, d.pj.tk, s)) });
  },
  text: (s, d) => `${s.tracks.director.co}에서 다음 작품을 맡겼다.\n\n${DIR_PJ[d.pj.tk].n} 「${d.pj.title}」 · ${d.pj.genre} · 각본 ${grade5(me(s), d.pj.q, 'q', 'script')}\n촬영 ${DIR_PJ[d.pj.tk].months}개월 · 연출료 ${fmtWon(d.pj.fee)}\n${dmHint(s, d.pj.genre, d.pj.tk)}`,
  ch: (s, d) => [{ t: '촬영에 들어간다', tr: d.pj.genre === s.trendTV.drama, f: s => startDirProject(s, d.pj) }],
});
// 촬영 현장: 촬영 중간에 한 번, 현장을 어떻게 끌고 갈지 고른다 (작품 완성도·촬영 기간·배우와의 사이)
const DIR_SET = ['비가 이어져 야외 촬영이 계속 밀린다.', '주연 배우가 중요한 장면의 해석이 나와 다르다고 한다.', '어제 찍은 장면이 아무래도 마음에 들지 않는다.', '제작사가 촬영 일정을 당겨 달라고 한다.'];
E({
  id: 'dir_set', cat: '촬영 현장', title: '촬영 현장', tag: 'career',
  // 12-3 보는 쪽: 감독 자리에서 촬영장을 먼저 보고, 그다음 어떻게 할지 고른다. '중요할 때만'에서는 첫 촬영장만
  live: (s, d) => d.live,
  cond: s => trackOn(s, 'director') && !!s.tracks.director.proj,
  init(s, d) { const pj = s.tracks.director.proj; if (!pj || pj.id !== d.id) { d.skip = true; return; } d.k = U.int(0, DIR_SET.length - 1);
    if (typeof liveStage === 'function') { const t = s.tracks.director, cast = (pj.cast || []).map(id => s.people[id]).filter(Boolean).slice(0, 3), av = castAvgOf(s, pj.cast);
      d.live = liveStage({ k: 'set', vn: 'film', place: '촬영장', t: pj.title, g: DIR_PJ[pj.tk].n, cn: '감독님', mem: cast.length ? cast.map(c => [c.name, '']) : [['배우', '']], mi: -1, key: !t.setN, sc: U.clamp(av + 15 + U.normal(0, 8), 0, 100), z: { perf: (av - DIR_PJ[pj.tk].demand) / 12, emo: U.fl(-0.6, 1), co: U.fl(-0.6, 1) } }); t.setN = (t.setN || 0) + 1; } },
  text: (s, d) => { const pj = s.tracks.director.proj; return `${DIR_PJ[pj.tk].n} 「${pj.title}」 촬영 현장. ${DIR_SET[d.k]}`; },
  ch: (s, d) => {
    const pj = s.tracks.director.proj;
    return [
      { t: '일정대로 밀어붙인다', h: '완성도 조금 ↓', f: s => { pj.setQ = -3; return `「${pj.title}」 촬영을 일정대로 밀어붙였다.`; } },
      { t: '다시 찍는다', h: '완성도 ↑ · 촬영 한 달 늘어남 · 스트레스 ↑', f: s => { pj.setQ = 6; pj.left += 1; return `「${pj.title}」 마음에 들 때까지 다시 찍기로 했다.` + fx(s, { stress: 5 }); } },
      { t: '배우들과 상의한다', h: '배우들과 사이 ↑ · 완성도 조금 ↑', f: s => { pj.setQ = 2; for (const id of pj.cast) { const c = s.people[id]; if (c) bond(s, c, 4); } return `배우들과 머리를 맞대고 「${pj.title}」 장면을 다시 짰다.`; } },
    ];
  },
});
// 편집 방향: 촬영이 끝나면 제작사가 더 대중적으로 다듬자고 한다 (흥행 쪽 / 평 쪽)
E({
  id: 'dir_edit', cat: '후반 작업', title: '편집 방향', tag: 'career',
  cond: s => true,
  init(s, d) { const q = s.queue.find(x => x.id === 'dir_res' && x.d.pj.id === d.id); if (!q) { d.skip = true; return; } d.t = q.d.pj.title; d.tk = q.d.pj.tk; d.co = q.d.pj.co; },
  text: (s, d) => `「${d.t}」 편집본을 본 ${d.co || '제작사'}에서 ${d.tk === 'film' ? '러닝타임을 줄이고' : '전개를 더 빠르게 하고'} 더 대중적으로 다듬자고 한다.`,
  ch: (s, d) => {
    const set = v => { const q = s.queue.find(x => x.id === 'dir_res' && x.d.pj.id === d.id); if (q) q.d.pj.edit = v; };
    return [
      { t: '제작사 의견을 따른다', h: '흥행 쪽', f: () => { set('com'); return `「${d.t}」 편집은 제작사 의견을 따르기로 했다.`; } },
      { t: '내 뜻대로 자른다', h: '평 쪽', f: s => { set('art'); return `「${d.t}」 편집은 내 뜻대로 밀고 나갔다.` + fx(s, { stress: 3 }); } },
    ];
  },
});
// 연출 제안: 두세 작품 중 하나에 손을 든다 (연출 자리 찾기로 받은 제안은 세 작품)
E({
  id: 'dir_offer', cat: '연출 제안', title: '연출 제안', tag: 'career',
  cond: s => trackOn(s, 'director') && !s.tracks.director.proj && s.tracks.director.mode === 'indie' && !s.hiatus && !pregMe(s),
  init(s, d) { d.ps = genDirProjects(s, d.seek ? 3 : U.int(2, 3)); },
  text: s => `연출 제안이 들어왔다. 하나를 고를 수 있다.\n\n'${DIR_TIERS[s.tracks.director.tier]}' · 연출 ${lvi(me(s), 'direct')}레벨`,
  ch: (s, d) => dirChoices(s, d.ps).concat([{ t: '이번엔 넘긴다', f: () => '들어온 제안을 모두 넘겼다.' }]),
});
// 내 각본을 들고 투자를 받으러 다닌다
function dirPitch(s, sc) {
  const t = s.tracks.director, p = U.clamp(U.sig((sc.q * 0.5 + DIR_POW[t.tier] * 8 + t.rep * 0.15 - 38) / 7), 0.05, 0.9);
  if (sc.tk === 'web' || U.chance(p)) {
    sc.st = 'mine';
    const ex = t.mode === 'excl';
    const pj = { title: sc.title, tk: sc.tk, genre: sc.genre, q: sc.q, writer: 'me', co: ex ? t.co : U.pick(PROD_CO), fee: ex ? dirExclFee(t, dirFee(t.tier, sc.tk, s)) : dirFee(t.tier, sc.tk, s), cost: 0, p: 1, demand: DIR_PJ[sc.tk].demand, scriptId: sc.id };
    return `${pj.co}에서 투자를 받았다! ` + startDirProject(s, pj);
  }
  sc.pitchT = s.t + 12;
  return `「${sc.title}」 각본을 들고 제작사를 돌았지만 투자를 받지 못했다.` + fx(s, { stress: 4 });
}
// 디렉팅 (v95): 감독의 교육이 배우 연기보다 높으면 그 차이의 절반만큼 배우 연기가 오르고, 낮으면 차이의 1/4만큼 떨어진다
function dirCast(p, c) { const e = lv(p, 'edu'); return e >= c ? c + (e - c) / 2 : c - (c - e) / 4; }
// 작품 공개: 성적과 연출 평, 연출료, 등급
E({
  id: 'dir_res', cat: '작품 성적', title: '연출작 공개', tag: 'career',
  // 공개 뒤 반응은 라이브온에서 (단편영화는 영화제에서만 틀어서 없다)
  plio: (s, d) => d.pl !== undefined ? d.pl : (d.pl = typeof plioSpec === 'function' && d.pj.tk !== 'short' && d.plsc != null ? plioSpec({ k: 'film', t: `「${d.pj.title}」 하이라이트`, ch: `${DIR_PJ[d.pj.tk].n} 「${d.pj.title}」`, me: `${me(s).name} 감독`, sc: d.plsc, rv: plioRv(d.review) }) : null),
  cond: s => true,
  init(s, d) {
    const pj = d.pj, t = s.tracks.director, p = me(s), T = DIR_PJ[pj.tk];
    // v95: 내 몫은 연출(강함)과 교육(강함: 디렉팅으로 배우 연기를 바꾼다, dirCast). 영상 편집 · 예술 감각은 뺐다
    const sc = U.clamp(lv(p, 'direct') * 0.45 + pj.q * 0.35 + dirCast(p, castAvgOf(s, pj.cast)) * 0.2 + DIR_POW[t.tier] + (pj.genre === s.trendTV.drama ? 5 : 0) + 8 + (pj.setQ || 0) + (pj.edit === 'com' ? 3 : pj.edit === 'art' ? -1 : 0) + dmScore(s, pj) + U.normal(0, 7), 0, 100);
    d.review = dirReview(dirPerf(p, T.demand) + (pj.edit === 'art' ? 6 : 0) + dmPerf(s, pj.tk));
    dmGain(s, pj.genre, pj.tk, 5);
    if (pj.tk === 'short') { d.fest = U.pick(SHORT_FEST); d.prizeN = sc >= 72 ? '대상' : sc >= 65 ? '우수상' : ''; d.res = d.prizeN ? `${d.fest} ${d.prizeN}` : sc >= 58 ? `${d.fest} 본선 진출` : `${d.fest} 예선 탈락`; }
    else d.res = filmRes(pj.tk, sc);
    d.fee = pj.fee || 0; d.plsc = Math.round(sc);
    // 흥행 인센티브: 잘될수록 연출료의 일부를 더 받는다 (작가와 같은 셈법)
    if (d.fee) { const hit = U.clamp((sc - 62) / 25, 0, 1.2); if (hit) d.bonus = Math.round(d.fee * hit * 0.6 / 1e5) * 1e5; }
    // 단편영화는 연출료가 없다: 영화제 상금(대상 500만·우수상 200만)과, 눈에 띄면 배급사·OTT에 상영권을 판 돈이 수입이다
    if (d.fest) {
      if (d.prizeN) d.bonus = d.prizeN === '대상' ? 500e4 : 200e4;
      if (sc >= 60 && U.chance(U.clamp((sc - 55) / 30, 0, 0.8))) { d.buyer = U.pick(['단편영화 배급사', 'OTT']); d.sale = Math.round(U.int(100, 300) * (1 + (sc - 60) / 20) / 10) * 10 * 1e4; earn(s, d.sale, '단편 상영권 판매'); }
    }
    earn(s, d.fee, '연출료', 'director');
    if (d.bonus) earn(s, d.bonus, d.fest ? '영화제 상금' : '흥행 인센티브', 'director');
    d.gain = Math.max(0, fanGain(s, sc, 'kr', 0.25));
    s.fans.kr += d.gain;
    dirReviewFx(s, d, sc, pj.tk === 'short' ? 0.3 : pj.tk === 'web' ? 0.6 : 1);
    t.works++; t.rep = U.clamp(t.rep + (sc - 52) / 4 + DIR_RV_REP[d.review], 0, 100);
    t.yearBest = Math.max(t.yearBest || 0, sc + DIR_RV_YB[d.review]);
    const big = pj.tk !== 'short' && pj.tk !== 'web';
    // 신인감독상은 첫 큰 작품(드라마·OTT·영화)이 나온 뒤 1년 동안만 후보가 될 수 있다
    if (big && t.debutT == null) t.debutT = s.t;
    // 거장: 대작에서 크게 성공한 일이 여러 번 쌓여야 한다 (수능 1등급처럼 상위 4~5%만)
    const U2 = DIR_UP, good = /호평/.test(d.review);
    if (big && sc >= U2.hit && t.tier >= 5) t.bigHits = (t.bigHits || 0) + 1;
    const k = t.tier;
    d.up = k < 6 && d.review !== '연출 대혹평' && (k === 5 ? big && (t.bigHits || 0) >= U2.hits && t.rep >= U2.rep && me(s).tal[U2.tal] >= U2.min
      :(!U2.big[k] || big) && (sc >= U2.sc[k] || (U2.rv[k] > 0 && good && sc >= U2.sc[k] - U2.rv[k])));
    if (d.up) { t.tier++; d.upN = DIR_TIERS[t.tier]; }
    for (const id of (pj.cast || [])) { const c = s.people[id]; if (c) bond(s, c, sc >= 60 ? U.int(3, 8) : U.int(-4, 2)); }
    d.sc = sc;
    addWork(s, { type: `${T.n} 연출`, title: pj.title, by: pj.writer === 'me' ? '각본·연출' : '연출', sc, note: `${d.res} · ${d.review}`, pay: d.fee + (d.bonus || 0) + (d.sale || 0) });
    if (t.works === 1) milestone(s, `${age(s)}세에 ${T.n} ${josa(`「${pj.title}」`, '으로')} 첫 연출작을 냈다.`);
    if (d.up && t.tier >= 5) milestone(s, `${age(s)}세에 ${josa(`「${pj.title}」`, '으로')} ${josa(DIR_TIERS[t.tier], '이가')} 되었다.`);
    // 내가 쓴 각본이면 작가로서의 성과도 함께 남는다
    if (pj.writer === 'me') d.wup = writerCredit(s, pj, sc);
    // 대작이 크게 잘되면 몇 달 뒤 부가 판권(해외 배급·VOD 등) 수익이 들어온다
    if (big && d.fee && sc >= 76) queueEv(s, 'dir_ip', U.int(3, 8), { t: pj.title, fee: d.fee, sc }, true);
  },
  text: (s, d) => `${DIR_PJ[d.pj.tk].n} ${josa(`「${d.pj.title}」`, "이가")} 공개됐다.\n\n${d.res} · ${d.review}\n팬 ${sgnFans(d.gain + (d.boom || 0))}${d.fee ? ` · 연출료 ${fmtWon(d.fee)}` : d.pj.tk === 'short' ? ' · 연출료 없음 (내 돈으로 찍은 단편영화)' : ''}${d.bonus ? ` · ${d.fest ? '상금' : '흥행 인센티브'} ${fmtWon(d.bonus)}` : ''}${d.sale ? ` · ${d.buyer}에 상영권 판매 ${fmtWon(d.sale)}` : ''}` + dirReviewText(d) + (d.up ? `\n\n이 작품으로 '${DIR_TIERS[s.tracks.director.tier]}' 소리를 듣게 됐다.` : '') + wupText(s, d),
  // v174: 결과 창을 인터넷 기사로 (ui.js newsEvHTML). 기사는 사실만, 반응은 댓글(영상 댓글), 얻은 것은 토스트로
  html: (s, d) => d.sc != null && d.res && typeof newsEvHTML === 'function' ? newsEvHTML(s, d, EVENTS.dir_res.news(s, d)) : '',
  news(s, d) {
    const pj = d.pj, T = DIR_PJ[pj.tk], A = `${me(s).name} 감독`, Q = newsQ(pj.title), rv = d.review, sh = pj.tk === 'short', f = (d.gain || 0) + (d.boom || 0), R = d.res;
    const cast = (pj.cast || []).map(id => s.people[id]).filter(Boolean).slice(0, 2).map(c => c.name), pass = /본선/.test(R);
    const heads = sh ? (d.prizeN ? [`${A}의 단편 ${Q}, ${d.fest} ${d.prizeN}`, `${d.fest} ${josa(d.prizeN, '은는')} ${A}의 ${Q}`] : pass ? [`${A}의 단편 ${Q}, ${d.fest} 본선 진출`] : [`${A}의 단편 ${Q}, ${d.fest} 예선에서 고배`])
      : rv === '연출 대호평' ? [`${A}, ${josa(Q, '으로')} 연출력 입증…${R}`, `${Q} ${R}…${A} 연출 빛났다`]
      : rv === '연출 호평' ? [`${A}의 ${Q}, ${R}`, `${A} 신작 ${Q} 공개…${R}`]
      : rv === '연출 대혹평' ? [`${A} 신작 ${Q}, 연출 혹평 쏟아져`, `${Q} ${A}, 연출 도마 위에`]
      : rv === '연출 혹평' ? [`${A} 신작 ${Q}, 연출 아쉬움 남겨`, `${A}의 ${Q}…${R}`]
      : [`${A} 신작 ${Q} 공개…${R}`, `${T.n} ${Q}, ${R}`];
    const body = [
      sh ? `${josa(A, '이가')} 연출한 단편영화 ${josa(Q, '이가')} ${d.fest}${d.prizeN ? `에서 ${josa(d.prizeN, '을를')} 받았다` : pass ? ' 본선에 올랐다' : ' 예선에서 떨어졌다'}.`
        : `${josa(A, '이가')} 연출한 ${pj.genre ? pj.genre + ' ' : ''}${T.n} ${josa(Q, '이가')} ${pj.tk === 'film' ? '개봉했다' : '공개됐다'}. 작품은 ${newsOut(R)}.`,
      [pj.writer === 'me' ? `각본도 ${josa(A, '이가')} 직접 썼다.` : '', cast.length ? `${josa(cast.join(', '), '이가')} 출연했다.` : '', d.buyer ? `${d.buyer}에 상영권이 팔렸다.` : ''].filter(Boolean).join(' '),
      rv === '연출 대호평' && !sh ? '명장면을 풀이하는 영상이 온라인에서 퍼지고 있다.' : rv === '연출 대혹평' && !sh ? `${A}의 이름을 붙인 패러디 영상이 온라인에 돌고 있다.` : '',
    ];
    const ts = [['🎬', R, sh ? (d.prizeN ? 'g' : pass ? '' : 'b') : newsTone(d.sc)], ['🎥', rv, /호평/.test(rv) ? 'g' : /혹평/.test(rv) ? 'b' : ''], ['⭐', `내 팬 ${sgnFans(f)} → ${fmtFans(totalFans(s))}`, f >= 0 ? 'g' : 'b']];
    if (d.fee) ts.push(['💰', `연출료 +${fmtWon(d.fee)}`, 'g']);
    if (d.bonus) ts.push(['💰', `${d.fest ? '영화제 상금' : '흥행 인센티브'} +${fmtWon(d.bonus)}`, 'g']);
    if (d.sale) ts.push(['💰', `${d.buyer}에 상영권 판매 +${fmtWon(d.sale)}`, 'g']);
    if (d.up) ts.push(newsUp('감독', d.upN || DIR_TIERS[s.tracks.director.tier]));
    if (d.wup && s.tracks.writer) ts.push(newsUp('작가', WRITER_TIERS[s.tracks.writer.tier]));
    return { who: A, heads, body, sec: pj.tk === 'film' || sh ? '영화' : '방송', t: pj.title, sc: d.sc, pl: EVENTS.dir_res.plio(s, d), cap: `${Q}의 한 장면`, ts };
  },
  ch: (s, d) => [{ t: '확인', f: () => `「${d.pj.title}」 공개. ${d.res}, ${d.review}.` }],
});
E({
  id: 'dir_ip', cat: '부가 판권', title: '부가 판권 수익', tag: 'career',
  cond: s => true,
  init(s, d) {
    d.items = U.shuffle(DIR_IP.slice()).slice(0, d.sc >= 88 ? 4 : d.sc >= 82 ? 3 : 2);
    d.money = Math.round(d.fee * U.fl(0.3, 0.6) * (1 + (d.sc - 76) / 12) / 1e5) * 1e5;
    earn(s, d.money, '부가 판권'); workPay(s, d.t, d.money);
  },
  text: (s, d) => `${josa(`「${d.t}」`, '이가')} 크게 잘된 덕분에 ${d.items.join('·')} 수익이 들어왔다.\n\n감독 몫으로 ${josa(fmtWon(d.money), '을를')} 받았다.`,
  ch: (s, d) => [{ t: '확인', f: () => `「${d.t}」 부가 판권(${d.items.join('·')}) 수익 ${fmtWon(d.money)}.` }],
});
// 광고·뮤직비디오 연출 의뢰: 작품을 안 찍는 동안 들어오는 짧은 일. 맡으면 바로 찍고 연출료를 받는다
function dirSideOffer(s, t) {
  const mv = U.chance(0.35);
  let what, ask, from;
  if (mv) { const have = industry(s, '가수'), sg = have.length && U.chance(0.6) ? U.pick(have).name : genName(U.chance(0.5) ? '여' : '남', calY(s) - U.int(20, 45)); what = `가수 ${sg}의 뮤직비디오`; ask = `${sg}의 새 뮤직비디오`; from = `${sg} 소속사`; }
  else { const b = U.pick(BRANDS); what = `${b.n} ${b.cat} 광고`; ask = `${b.cat} 광고`; from = b.n; }
  const fee = Math.round(DIR_SIDE[t.tier] * (mv ? 0.5 : 1) * U.fl(0.8, 1.25) / 10) * 10 * 1e4;
  sendMsg(s, 'dir_side', { from, title: mv ? '뮤직비디오 연출 의뢰' : '광고 연출 의뢰', months: 2, d: { what, ask, fee, mv } });
}
// 광고·뮤직비디오를 지금 찍을 수 없는 이유 (없으면 '')
function sideBusy(s) {
  const d = trackOn(s, 'director') ? s.tracks.director : null;
  if (!d) return '지금은 감독 일을 하고 있지 않다';
  if (d.proj) return '지금 작품을 찍고 있다';
  return '';
}
INBOX.dir_side = {
  ic: '🎬',
  text: (s, m) => `${m.from}에서 ${m.d.ask || m.d.what} 연출을 맡아 달라고 한다.\n\n연출료 ${fmtWon(m.d.fee)}`,
  ch: (s, m) => [
    { t: '맡는다', ok: s => !sideBusy(s), h: sideBusy(s) || '', f: s => { earn(s, m.d.fee, m.d.mv ? '뮤직비디오 연출' : '광고 연출'); practice(s, me(s), 'direct', 0.8); return `${josa(m.d.what, '을를')} 찍었다. 연출료 ${josa(fmtWon(m.d.fee), '을를')} 받았다.` + fx(s, { stress: 3 }); } },
    { t: '거절한다', f: () => `${m.from}의 연출 의뢰를 거절했다.` },
  ],
};
// 연말 영화상: 신인감독상 · 감독상 · 작품상
function dirAwards(s, t) {
  const yb = t.yearBest || 0; t.yearBest = 0;
  if (!yb) return;
  const who = me(s).name, newbie = !t.rookie && t.debutT != null && s.t - t.debutT < 12;
  let cat = null, won = false;
  if (newbie && yb >= 62) { cat = '신인감독상'; won = yb >= 70; if (won) t.rookie = true; }
  else if (t.tier >= 5 && yb >= 85) { cat = '작품상'; won = yb >= 92; }
  else if (t.tier >= 3 && yb >= 75) { cat = '감독상'; won = yb >= 84; }
  if (!cat) return;
  if (won) award(s, `영화상 ${cat}`);
  ceremony(s, '영화', who, cat, won, 'director');
}

// 극장 관객 1명당 제작·투자 쪽 몫 (원). 영상·애니메이션 제작사(studio.js)의 극장 수익에 쓴다
// (피드백 22: 예전 '영화감독(내 영화 만들기)'은 제작자 쪽 일이라 빼고, 연출감독을 '영화감독'으로 바꿨다)
const FM_TICKET = 4000;

// ════════ 시나리오 작가 ════════
// s.scripts: 내가 쓴 원고 { id, title, tk, genre, q, prog, st: draft|done|sold|mine|made|fixsold|fixmade, order(의뢰), fix(각본 수정 의뢰), price, madeAt }
function myScripts(s) { return (s.scripts = s.scripts || []); }
// 지금 쓰는 원고: 각본 수정 의뢰 → 원고 의뢰 → 내 원고 순서로 먼저 쓴다 (내 원고는 그동안 멈춘다)
function draftOf(s) { const D = myScripts(s).filter(x => x.st === 'draft' && !x.fm); return D.find(x => x.fix) || D.find(x => x.order) || D[0]; }
function jobDraft(s, kind) { return myScripts(s).find(x => x.st === 'draft' && x[kind]); }
// 각본 숙련도: 같은 장르, 같은 매체(웹드라마·드라마·OTT 시리즈·영화)로 많이 쓸수록 오른다 (0~100, s.smast { g: 장르, f: 매체 })
// 장르 숙련도는 원고 완성도를(최대 +4), 매체 숙련도는 완성도를 조금(최대 +2.5) 올리고 쓰는 속도를 빠르게 한다 (100이면 1.25배)
function smGet(s, kind, k) { return ((s.smast || {})[kind] || {})[k] || 0; }
function smGain(s, genre, tk, amt) {
  const M = s.smast = s.smast || { g: {}, f: {} }, cr = 0.6 + me(s).tal.creative / 100;
  for (const [kind, k] of [['g', genre], ['f', tk]]) { if (!k) continue; const m = M[kind][k] || 0; M[kind][k] = Math.min(100, m + amt * (1 - m / 100) * cr); }
}
function smBonus(s, sc) { return sc ? (smGet(s, 'g', sc.genre) - 15) / 20 + (smGet(s, 'f', sc.tk) - 15) / 34 : 0; }
function smSpeed(s, tk) { return 1 + smGet(s, 'f', tk) / 400; }
function smLine(s, kind) { const M = (s.smast || {})[kind] || {}; const L = Object.keys(M).filter(k => M[k] >= 1).sort((a, b) => M[b] - M[a]); return L.length ? L.map(k => `${kind === 'f' ? (DIR_PJ[k] || { n: k }).n : k} ${Math.floor(M[k])}`).join(' · ') : '아직 없음'; }
function smHint(s, genre, tk) { const g = smGet(s, 'g', genre), f = smGet(s, 'f', tk); return `숙련도 ${genre} ${gauge(g)} ${Math.floor(g)} · ${DIR_PJ[tk].n} ${gauge(f)} ${Math.floor(f)}`; }
// 직업 창의 숙련도 막대. 장르: 1 이상인 장르와 요즘 유행 장르, 매체: 원고를 쓰는 네 매체 모두
function smBars(s, kind) {
  const M = (s.smast || {})[kind] || {}, tr = (s.trendTV || {}).drama;
  const ks = kind === 'f' ? ['web', 'drama', 'ott', 'film'] : Object.keys(M).filter(k => M[k] >= 1).concat(tr && !(M[tr] >= 1) ? [tr] : []);
  return ks.map(k => ({ n: kind === 'f' ? (DIR_PJ[k] || { n: k }).n : k, v: M[k] || 0, tag: kind === 'g' && k === tr ? '유행' : '' })).sort((a, b) => b.v - a.v);
}
// v95: 작문만 (0.8배 + 8: 처음 작가의 점수 크기가 예전과 비슷하게) + 장르 숙련도
function scriptBaseQ(s, sc) { const p = me(s); return lv(p, 'script') * 0.8 + 8 + smBonus(s, sc); }
function scriptQ(s, sc) { return U.clamp(Math.round(scriptBaseQ(s, sc) + U.normal(0, 8)), 5, 98); }
// 고쳐 쓴 원고: 예전 완성도에서 조금 오르거나 새로 쓴 만큼. 고칠수록 덜 오르고, 내 실력보다 너무 높이는 못 간다
function scriptRevQ(s, sc) {
  const gain = U.int(3, 7) * Math.pow(0.6, (sc.rev || 1) - 1), cap = Math.round(scriptBaseQ(s, sc) + 16);
  return U.clamp(Math.round(Math.max(Math.min(cap, sc.baseQ + gain), scriptQ(s, sc), sc.baseQ)), 5, 98);
}
// 내 원고의 완성도 글자: 내 원고는 스카우트가 아니라 각본 실력으로 본다 (각본이 높을수록 '보통'의 폭이 좁다)
function myScriptGrade(s, q) { const hw = 20 - 15 * U.clamp(lv(me(s), 'script'), 0, 100) / 100, lo = 50 - hw, hi = 50 + hw; return GRADE_W.q[q < lo / 2 ? 0 : q < lo ? 1 : q <= hi ? 2 : q <= hi + (100 - hi) / 2 ? 3 : 4]; }
// 원고료: 매체 기본값 × 완성도 × 작가 등급. 완성도가 높을수록 늘 더 받는다 (완성도 55가 기본값, 36 오를 때마다 두 배)
// 예전에는 완성도 차이(최대 1.5배 남짓)보다 운(±15%)이 커서, 완성도가 더 좋은 원고가 더 싸게 팔리는 일이 잦았다
function scriptQMult(q) { return Math.pow(2, (q - 55) / 36); }
function scriptPrice(s, sc) { const t = s.tracks.writer || {}; return Math.round(SCRIPT_BASE[sc.tk] * scriptQMult(sc.q) * WRITER_MULT[t.tier || 0] * awMul(s, 'writer') / 10) * 10 * 1e4; }
function startWriter(s) {
  const old = s.tracks.writer;
  s.tracks.writer = { st: 'active', tier: old.tier || 0, rep: old.rep || 0, sold: old.sold || 0, made: old.made || 0, hist: old.hist || [], months: 0 };
  if (!old.sold && !(old.hist || []).length) milestone(s, `${age(s)}세에 시나리오 작가의 길에 들어섰다.`);
}
CAREERS.writer = {
  n: '시나리오 작가', ic: '📜', emp: true,
  desc: '영화·드라마 원고를 쓴다. 다 쓴 원고는 제작사에 팔거나 공모전에 내거나 직접 연출한다. 작문 실력과 장르 숙련도가 가장 중요하다.',
  act: { n: '시나리오 집필', ic: '📜', g: '직업 활동', eff: [['작문', '↑↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) {
    if (t.st !== 'active') return t.endNote || '';
    const dr = draftOf(s);
    return `${WRITER_TIERS[t.tier]} · 팔린 원고 ${t.sold}편` + (dr ? ` · 「${dr.title}」 ${Math.floor(dr.prog)}% ${dr.fix ? '손보는 중' : dr.baseQ != null ? '고쳐 씀' : '씀'}` : '');
  },
  short() { return '시나리오 작가'; },
  seg() { return '시나리오 작가'; },
  title(s, t) { return t.sold ? WRITER_TIERS[t.tier] : null; },
  contract() { return ''; },
  mainSk() { return 'script'; },
  info(s, t) {
    const p = me(s), S2 = myScripts(s), dr = draftOf(s);
    const R = [['등급', WRITER_TIERS[t.tier]], ['내 실력', ['script', 'direct'].filter(k => has(p, k)).map(k => `${SKILLS[k].n} ${lvi(p, k)}`).join(' · ') || '-'], ['업계 평판', `${Math.round(t.rep)}`], ['팔린 원고', `${t.sold}편 (작품이 된 것 ${t.made}편)`]];
    if (dr) R.push([dr.fix ? '각본 수정 중' : dr.baseQ != null ? '고쳐 쓰는 중' : '쓰는 중', `「${dr.title}」 ${DIR_PJ[dr.tk].n} · ${dr.genre} · ${Math.floor(dr.prog)}%${dr.fix ? ` (${dr.co} 의뢰, ${dr.by} 작가 원고)` : dr.order ? ` (${dr.order} 의뢰)` : ''}`]);
    R.push({ h: '장르 숙련도', bars: smBars(s, 'g') }, { h: '매체 숙련도', bars: smBars(s, 'f') });
    const paused = S2.filter(x => x.st === 'draft' && !x.fm && x !== dr);
    if (paused.length) R.push({ h: '멈춰 둔 원고 (의뢰를 먼저 쓴다)', items: paused.map(x => `「${x.title}」 ${DIR_PJ[x.tk].n} · ${x.genre} · ${Math.floor(x.prog)}%`) });
    const drawer = S2.filter(x => x.st === 'done');
    if (drawer.length) R.push({ h: '서랍 속 원고', items: drawer.map(x => `「${x.title}」 ${DIR_PJ[x.tk].n} · ${x.genre} · 완성도 ${myScriptGrade(s, x.q)}${x.rev ? ` (${x.rev}번 고침)` : ''}`) });
    const sold = S2.filter(x => x.st === 'sold' || x.st === 'fixsold');
    if (sold.length) R.push({ h: '제작 중인 작품', items: sold.map(x => `「${x.title}」 ${DIR_PJ[x.tk].n} · ${x.genre}${x.st === 'fixsold' ? ' (각본 수정)' : ''} · ${x.co} · ${ymLater(s, Math.max(0, x.madeAt - s.t))} 공개 예정`) });
    return R;
  },
  actions(s, t) {
    if (t.st !== 'active') return [];
    const A = [];
    for (const sc of myScripts(s).filter(x => x.st === 'done')) A.push({ t: `「${sc.title}」 제작사에 돌리기`, h: `${DIR_PJ[sc.tk].n} · ${sc.genre} · 답은 한두 달 뒤`, ok: !(sc.pitchT > s.t) && !hasQ(s, 'script_pitch'), why: hasQ(s, 'script_pitch') ? '다른 원고의 답을 기다리는 중' : '얼마 전에 돌렸다 (1년 뒤 다시)', run: s => { sc.pitchT = s.t + 12; queueEv(s, 'script_pitch', U.int(1, 2), { id: sc.id }); return `「${sc.title}」 원고를 제작사들에 보냈다.`; } });
    // 고쳐 쓰기: 다 쓴 원고를 다시 붙잡는다. 남은 40%를 다시 쓰고, 끝나면 완성도가 오른다 (제작사에도 다시 돌릴 수 있다)
    if (myScripts(s).some(x => x.st === 'done')) A.push({ t: '원고 고쳐 쓰기', ok: !draftOf(s), why: '지금 쓰는 원고가 있다', run: s => { fireEvent(s, 'script_rev_pick', {}); return ''; } });
    A.push({ t: '작가 일 그만두기', ok: true, danger: true, confirm: '정말 작가 일을 그만둘까요?', run: s => { t.st = 'ended'; t.endNote = `${WRITER_TIERS[t.tier]}, 팔린 원고 ${t.sold}편`; t.hist.push(t.endNote); for (const x of myScripts(s).filter(x => x.st === 'draft')) { if (x.fix) x.st = 'dropped'; else { x.st = 'done'; delete x.baseQ; } } return '작가 일을 그만뒀다.'; } });
    return A;
  },
  monthly(s, t) {
    if (t.st !== 'active') return;
    t.months++;
    if (calM(s) === 11) writerAwards(s, t);
    const p = me(s), n = slotsOn(s, 'c_writer');
    // 현역 작가부터 제작사가 원고를 의뢰한다 (메시지함). 등급이 높을수록 자주, 원고료도 많이
    if (t.tier >= 2 && !jobDraft(s, 'order') && !s.inbox.some(m => m.kind === 'script_order') && U.chance((0.01 + 0.012 * t.tier) * stigmaMul(s))) {
      const tk = U.pick(t.tier <= 2 ? ['web', 'drama', 'ott'] : ['drama', 'ott', 'film']), co = U.pick(PROD_CO);
      sendMsg(s, 'script_order', { from: co, title: `${DIR_PJ[tk].n} 원고 의뢰`, months: 3, d: { tk, genre: U.chance(0.5) ? s.trendTV.drama : U.pick(DRAMA_TRENDS), co, price: Math.round(SCRIPT_BASE[tk] * 1.15 * WRITER_MULT[t.tier] * awMul(s, 'writer') / 10) * 10 * 1e4 } });
    }
    // 다른 작가의 원고를 손봐 달라는 각본 수정 의뢰 (현역 작가부터)
    if (t.tier >= 2 && !jobDraft(s, 'fix') && !s.inbox.some(m => m.kind === 'script_fix') && U.chance((0.012 + 0.008 * t.tier) * stigmaMul(s))) {
      const tk = U.pick(['drama', 'ott', 'film', 'web']), co = U.pick(PROD_CO), genre = U.pick(DRAMA_TRENDS);
      sendMsg(s, 'script_fix', { from: co, title: `${DIR_PJ[tk].n} 각본 수정 의뢰`, months: 3, d: { tk, genre, co, title: dramaTitle(genre), by: genName(U.chance(0.5) ? '여' : '남', calY(s) - U.int(20, 45)), price: Math.round(SCRIPT_BASE[tk] * 0.3 * WRITER_MULT[t.tier] * awMul(s, 'writer') / 10) * 10 * 1e4 } });
    }
    if (!n) return;
    practice(s, p, 'script', 1.2 * n); useSkill(s, p, 'direct', 0.1 * n); addStress(s, 1.5);
    const dr = draftOf(s);
    if (!dr) { if (!hasQ(s, 'script_new')) queueEv(s, 'script_new', 0); return; }
    dr.prog += (3 + lv(p, 'script') * 0.12) * Math.min(2, n) * SCRIPT_SPEED[dr.tk] * smSpeed(s, dr.tk) * (dr.fix ? 2.5 : 1);
    smGain(s, dr.genre, dr.tk, 0.3 * n);
    if (dr.prog < 100) return;
    dr.prog = 100;
    if (dr.fix) { scriptFixDeliver(s, dr); return; }
    smGain(s, dr.genre, dr.tk, 5);
    dr.q = dr.baseQ != null ? scriptRevQ(s, dr) : scriptQ(s, dr); dr.revDone = dr.baseQ != null; delete dr.baseQ; dr.st = 'done'; if (dr.order) scriptDeliver(s, dr); queueEv(s, 'script_done', 0, { id: dr.id });
  },
};
JOB_APPLY.push({
  id: 'writer_start', trk: 'writer', g: '📜 시나리오 작가', n: '시나리오 작가로 시작하기',
  show: s => !trackOn(s, 'writer'),
  h: s => '일정에 시나리오 집필을 넣으면 원고를 쓴다',
  ok: s => !s.army && age(s) >= 16 && lv(me(s), 'script') >= 15,
  why: s => s.army ? '군 복무 중' : age(s) < 16 ? '16세부터 할 수 있다' : '작문을 더 배워야 한다',
  run: s => { startWriter(s); return '시나리오 작가로 원고를 쓰기 시작하기로 했다.'; },
});
// 새 원고: 무엇을 쓸지 고른다 (요즘 유행 장르가 섞여 나온다)
E({
  id: 'script_new', cat: '집필', title: '새 원고', tag: 'career',
  cond: s => trackOn(s, 'writer') && !draftOf(s),
  init(s, d) {
    const tks = s.tracks.writer.tier === 0 ? ['web', 'film', 'drama'] : ['web', 'drama', 'ott', 'film'];
    d.opts = U.shuffle(tks).slice(0, 3).map((tk, i) => ({ tk, genre: i === 0 ? s.trendTV.drama : U.pick(DRAMA_TRENDS) }));
  },
  text: s => '새 원고를 쓰려고 한다. 무엇을 쓸까?',
  ch: (s, d) => d.opts.map(o => ({ t: `${DIR_PJ[o.tk].n} · ${o.genre}`, tr: o.genre === s.trendTV.drama, h: `${o.tk === 'drama' ? '회차가 많아 오래 걸린다' : o.tk === 'web' ? '짧아서 금방 쓴다' : o.tk === 'ott' ? '회차가 조금 많다' : '한 편짜리'} · ${smHint(s, o.genre, o.tk)}`, f: s => { const sc = { id: 'sc' + U.uid(), title: dramaTitle(o.genre), tk: o.tk, genre: o.genre, q: 0, prog: 0, st: 'draft' }; myScripts(s).push(sc); return askTitle(s, 'script', { id: sc.id, title: sc.title, what: `새로 쓸 ${DIR_PJ[o.tk].n} 원고(${o.genre})의` }); } })),
});
// 원고 제목을 정했다 (새 원고 · 의뢰받은 원고 모두)
TITLE_CB.script = (s, d) => {
  const sc = myScripts(s).find(x => x.id === d.id);
  if (!sc) return '';
  sc.title = d.title;
  return sc.order ? `${sc.co}의 의뢰로 ${DIR_PJ[sc.tk].n} 「${sc.title}」 원고를 쓰기 시작했다.` : `${DIR_PJ[sc.tk].n} 「${sc.title}」(${sc.genre}) 원고를 쓰기 시작했다.`;
};
// 고쳐 쓸 원고 고르기
E({
  id: 'script_rev_pick', cat: '집필', title: '원고 고쳐 쓰기',
  cond: s => true,
  text: () => '어떤 원고를 다시 붙잡을까?',
  ch: s => myScripts(s).filter(x => x.st === 'done').map(sc => ({ t: `「${sc.title}」`, h: `${DIR_PJ[sc.tk].n} · ${sc.genre} · 완성도 ${myScriptGrade(s, sc.q)}${sc.rev ? ` · ${sc.rev}번 고침` : ''}`, f: s => { sc.st = 'draft'; sc.prog = 60; sc.baseQ = sc.q; sc.rev = (sc.rev || 0) + 1; sc.pitchT = 0; return `「${sc.title}」 원고를 다시 붙잡았다.`; } })).concat([{ t: '그만두기', f: () => '' }]),
});
// 원고를 다 썼다
E({
  id: 'script_done', cat: '집필', title: '원고 완성', tag: 'career',
  cond: s => true,
  init(s, d) { const sc = myScripts(s).find(x => x.id === d.id); if (!sc) { d.skip = true; return; } d.order = !!sc.order; },
  text: (s, d) => { const sc = myScripts(s).find(x => x.id === d.id); return (sc.revDone ? `${DIR_PJ[sc.tk].n} 「${sc.title}」(${sc.genre}) 원고를 다 고쳤다. 지금까지 ${sc.rev}번 고쳐 썼다. 다시 읽어 보니 완성도는 '${myScriptGrade(s, sc.q)}'.` : `${DIR_PJ[sc.tk].n} 「${sc.title}」(${sc.genre}) 원고를 다 썼다. 다시 읽어 보니 완성도는 '${myScriptGrade(s, sc.q)}'.`) + (d.order ? `\n\n의뢰받은 원고라 ${sc.co}에 넘겼다. 남은 원고료 ${fmtWon(Math.round(sc.price / 2))}을 받았다. ${ymLater(s, sc.madeAt - s.t)}쯤 공개된다.` : ''); },
  ch: (s, d) => {
    if (d.order) return [{ t: '확인', f: () => '의뢰받은 원고를 넘겼다.' }];
    const sc = myScripts(s).find(x => x.id === d.id), t = s.tracks.writer, C = [];
    C.push({ t: '제작사에 돌린다', h: '답은 한두 달 뒤', f: s => { sc.pitchT = s.t + 12; queueEv(s, 'script_pitch', U.int(1, 2), { id: sc.id }); return `「${sc.title}」 원고를 제작사들에 보냈다.`; } });
    if (t.tier <= 1) C.push({ t: `${CONTEST[sc.tk]}에 낸다`, h: '결과는 두 달 뒤', f: s => { queueEv(s, 'script_contest', 2, { id: sc.id }); sc.st = 'contest'; return `「${sc.title}」 원고를 ${CONTEST[sc.tk]}에 냈다.`; } });
    if (trackOn(s, 'director') && !s.tracks.director.proj) C.push({ t: '내가 직접 연출한다', h: '투자를 받아야 찍을 수 있다', f: s => dirPitch(s, sc) });
    C.push({ t: '한 번 더 고쳐 쓴다', f: s => { sc.st = 'draft'; sc.prog = 60; sc.baseQ = sc.q; sc.rev = (sc.rev || 0) + 1; sc.pitchT = 0; return `「${sc.title}」 원고를 다시 붙잡았다.`; } });
    C.push({ t: '서랍에 넣어 둔다', f: () => `「${sc.title}」 원고를 서랍에 넣어 뒀다.` });
    return C;
  },
});
// 제작사의 답: 원고가 좋고 이름이 있을수록 사겠다는 곳이 나온다
E({
  id: 'script_pitch', cat: '집필', title: '원고 판매', tag: 'career',
  cond: s => true,
  init(s, d) {
    const sc = myScripts(s).find(x => x.id === d.id);
    if (!sc || sc.st !== 'done') { d.skip = true; return; }
    const t = s.tracks.writer || { tier: 0, rep: 0 };
    d.p = U.clamp(U.sig((sc.q + WRITER_POW[t.tier] * 6 + t.rep * 0.1 + (sc.genre === s.trendTV.drama ? 5 : 0) - 58) / 7) * stigmaMul(s), 0.03, 0.95);
    d.ok = U.chance(d.p); d.co = U.pick(PROD_CO); d.price = scriptPrice(s, sc);
  },
  text: (s, d) => { const sc = myScripts(s).find(x => x.id === d.id); return d.ok ? `${d.co}에서 「${sc.title}」 원고를 사고 싶다고 연락이 왔다. 원고료는 ${fmtWon(d.price)}. (${DIR_PJ[sc.tk].n} · 완성도 ${myScriptGrade(s, sc.q)} · ${WRITER_TIERS[(s.tracks.writer || {}).tier || 0]})` :`「${sc.title}」 원고를 보낸 제작사 어디에서도 연락이 없다.`; },
  ch: (s, d) => {
    const sc = myScripts(s).find(x => x.id === d.id);
    if (!d.ok) return [{ t: '서랍에 넣어 둔다', f: () => `「${sc.title}」 원고는 팔리지 않았다.` + fx(s, { stress: 3 }) }];
    return [
      { t: '판다', f: s => scriptSell(s, sc, d.co, d.price) },
      { t: '팔지 않는다', f: () => `「${sc.title}」 원고를 팔지 않기로 했다.` },
    ];
  },
});
function scriptSell(s, sc, co, price) {
  const t = s.tracks.writer;
  sc.st = 'sold'; sc.co = co; sc.price = price; sc.madeAt = s.t + U.int(8, 18);
  earn(s, price, '원고료');
  if (t) { t.sold++; if (t.tier === 0) t.tier = 1; }
  if (t && t.sold === 1) milestone(s, `${age(s)}세에 처음으로 원고 ${josa(`「${sc.title}」`, "을를")} 팔았다.`);
  return `${co}에 「${sc.title}」 원고를 팔았다. 원고료 ${fmtWon(price)}. ${ymLater(s, sc.madeAt - s.t)}쯤 작품으로 나온다.`;
}
// 의뢰받은 원고를 넘긴다 (원고료 절반은 의뢰 때, 절반은 넘길 때)
function scriptDeliver(s, sc) {
  const t = s.tracks.writer;
  sc.st = 'sold'; sc.madeAt = s.t + U.int(6, 12);
  earn(s, Math.round(sc.price / 2), '원고료');
  if (t) t.sold++;
}
// 공모전 결과
E({
  id: 'script_contest', cat: '공모전', title: '공모전 결과', tag: 'career',
  cond: s => true,
  init(s, d) {
    const sc = myScripts(s).find(x => x.id === d.id);
    if (!sc) { d.skip = true; return; }
    const v = sc.q + U.normal(0, 8);
    d.prize = v >= 82 ? '대상' : v >= 72 ? '우수상' : v >= 64 ? '가작' : '';
    d.money = { 대상: 5000e4, 우수상: 1000e4, 가작: 300e4 }[d.prize] || 0;
    sc.st = 'done';
    if (d.money) earn(s, d.money, '공모전 상금');
    const t = s.tracks.writer;
    if (d.prize && t) { t.rep = U.clamp(t.rep + { 대상: 15, 우수상: 8, 가작: 4 }[d.prize], 0, 100); if (t.tier === 0) t.tier = 1; }
    if (d.prize === '대상') award(s, `${CONTEST[sc.tk]} 대상`);
    d.co = U.pick(PROD_CO);
  },
  text: (s, d) => { const sc = myScripts(s).find(x => x.id === d.id); return d.prize ? `${CONTEST[sc.tk]}에서 「${sc.title}」 원고가 ${josa(d.prize, '을를')} 받았다! 상금 ${fmtWon(d.money)}.` + (d.prize === '대상' ? `\n\n${d.co}에서 이 원고로 작품을 만들고 싶다고 한다.` : '') : `${CONTEST[sc.tk]}에서 「${sc.title}」 원고는 떨어졌다.`; },
  // 상을 받으면 위쪽에 수상 띠 (시상식과 같은 연출)
  html: (s, d) => { const sc = myScripts(s).find(x => x.id === d.id); return (d.prize ? awardBanner(`${calY(s)} ${CONTEST[sc.tk]}`, [`${CONTEST[sc.tk]} ${d.prize}`]) : '') + `<div class="m-text">${rich(EVENTS.script_contest.text(s, d))}</div>`; },
  ch: (s, d) => {
    const sc = myScripts(s).find(x => x.id === d.id);
    // 대상 원고를 사 가는 값도 보통 원고료와 같다 (예전엔 60%만 받아서, 완성도가 아주 좋은 원고일수록 손해였다)
    if (d.prize === '대상') return [{ t: '작품으로 만든다', h: `원고료 ${fmtWon(scriptPrice(s, sc))}`, f: s => scriptSell(s, sc, d.co, scriptPrice(s, sc)) },{ t: '서랍에 넣어 둔다', f: () => `「${sc.title}」 원고를 서랍에 넣어 뒀다.` }];
    return [{ t: '확인', f: () => d.prize ? `${CONTEST[sc.tk]} ${d.prize}.` : `${CONTEST[sc.tk]} 낙선.` + fx(s, { stress: 3 * pm(s, 'loseStress') }) }];
  },
});
INBOX.script_order = {
  ic: '📜',
  text: (s, m) => `${m.d.co}에서 ${DIR_PJ[m.d.tk].n} 원고를 써 달라고 한다. 장르는 ${m.d.genre}.\n\n원고료 ${fmtWon(m.d.price)} (절반은 지금, 절반은 원고를 넘길 때)`,
  ch: (s, m) => [
    { t: '맡는다', tr: m.d.genre === s.trendTV.drama, ok: s => trackOn(s, 'writer') && !jobDraft(s, 'order'), h: !trackOn(s, 'writer') ? '지금은 작가 일을 하고 있지 않다' : jobDraft(s, 'order') ? '이미 맡은 원고 의뢰가 있다' : draftOf(s) ? '쓰던 원고는 잠시 멈춘다' : '', f: s => { const sc = { id: 'sc' + U.uid(), title: dramaTitle(m.d.genre), tk: m.d.tk, genre: m.d.genre, q: 0, prog: 0, st: 'draft', order: m.d.co, co: m.d.co, price: m.d.price }; myScripts(s).push(sc); earn(s, Math.round(m.d.price / 2), '원고료'); askTitle(s, 'script', { id: sc.id, title: sc.title, what: `${m.d.co}에서 의뢰받은 ${DIR_PJ[m.d.tk].n} 원고(${m.d.genre})의` }); return `${m.d.co}의 원고 의뢰를 맡았다.`; } },
    { t: '거절한다', f: () => `${m.d.co}의 원고 의뢰를 거절했다.` },
  ],
};
// 각본 수정 의뢰: 다른 작가가 쓴 원고를 손본다. 수정료 절반은 지금, 절반은 넘길 때. 원고보다 2.5배 빨리 끝난다
INBOX.script_fix = {
  ic: '✏️',
  text: (s, m) => `${m.d.co}에서 ${m.d.by} 작가가 쓴 ${DIR_PJ[m.d.tk].n} 「${m.d.title}」(${m.d.genre}) 원고를 손봐 달라고 한다.\n\n각본 수정료 ${fmtWon(m.d.price)} (절반은 지금, 절반은 넘길 때)`,
  ch: (s, m) => [
    { t: '맡는다', ok: s => trackOn(s, 'writer') && !jobDraft(s, 'fix'), h: !trackOn(s, 'writer') ? '지금은 작가 일을 하고 있지 않다' : jobDraft(s, 'fix') ? '이미 손보는 원고가 있다' : draftOf(s) ? '쓰던 원고는 잠시 멈춘다' : '', f: s => { myScripts(s).push({ id: 'sc' + U.uid(), title: m.d.title, tk: m.d.tk, genre: m.d.genre, q: 0, prog: 0, st: 'draft', fix: true, co: m.d.co, by: m.d.by, price: m.d.price }); earn(s, Math.round(m.d.price / 2), '각본 수정료'); return `${m.d.co}의 각본 수정 의뢰를 맡았다. ${m.d.by} 작가의 「${m.d.title}」 원고를 손본다.`; } },
    { t: '거절한다', f: () => `${m.d.co}의 각본 수정 의뢰를 거절했다.` },
  ],
};
function scriptFixDeliver(s, sc) {
  const t = s.tracks.writer;
  sc.st = 'fixsold'; sc.madeAt = s.t + U.int(5, 10);
  // 손본 원고의 완성도: 원래 원고(보통)에 내 실력이 더해진다
  sc.q = U.clamp(Math.round(U.fl(38, 52) + scriptBaseQ(s, sc) * 0.4 + U.normal(0, 5)), 5, 95);
  earn(s, Math.round(sc.price / 2), '각본 수정료');
  if (t) t.rep = U.clamp(t.rep + 1, 0, 100);
  addLog(s, `「${sc.title}」 원고를 다 손봐서 ${sc.co}에 넘겼다. 남은 수정료 ${fmtWon(Math.round(sc.price / 2))}을 받았다. ${ymLater(s, sc.madeAt - s.t)}쯤 공개된다.`, 'career');
}
// 팔린 원고가 작품으로 공개된다 (다른 감독이 찍는다). 작가 일을 그만둬도 공개는 된다
E({
  id: 'script_release', fixed: true, cat: '작품 성적',
  cond: s => (s.scripts || []).some(x => (x.st === 'sold' || x.st === 'fixsold') && x.madeAt <= s.t),
  init(s, d) { for (const sc of s.scripts.filter(x => (x.st === 'sold' || x.st === 'fixsold') && x.madeAt <= s.t)) { const fix = sc.st === 'fixsold'; sc.st = fix ? 'fixmade' : 'made'; queueEv(s, 'script_res', 0, { id: sc.id, fix }, true); } d.skip = true; },
});
// 흥행 인센티브: 잘될수록 원고료의 일부를 더 받는다 (각본 수정은 원래 원고료 기준의 절반)
function scriptBonus(sc, v, fix) { const hit = U.clamp((v - 62) / 25, 0, 1.2); return hit ? Math.round(sc.price * (fix ? 1.5 : 1) * hit * 0.6 / 1e5) * 1e5 : 0; }
E({
  id: 'script_res', cat: '작품 성적', tag: 'career',
  plio: (s, d) => d.pl !== undefined ? d.pl : (d.pl = typeof plioSpec === 'function' && d.t ? plioSpec({ k: 'film', t: `「${d.t}」 하이라이트`, ch: `${DIR_PJ[d.tk].n} 「${d.t}」`, me: d.fix ? '' : `${me(s).name} 작가`, sc: d.sc, rv: d.sc >= 80 ? 2 : d.sc >= 65 ? 1 : d.sc >= 52 ? 0 : d.sc >= 40 ? -1 : -2 }) : null),
  cond: s => true,
  init(s, d) {
    const sc = myScripts(s).find(x => x.id === d.id);
    if (!sc) { d.skip = true; return; }
    const dir = pickIndustry(s, '연출감독');
    // 작품 점수: 원고 완성도가 가장 크고, 맡은 감독과 운은 조금만 (완성도 좋음이면 대개 잘된다)
    d.dir = dir.name; d.sc = U.clamp(sc.q * 0.65 + lv(dir, 'direct') * 0.15 + 15 + (sc.genre === s.trendTV.drama ? 5 : 0) + U.normal(0, 5), 0, 100);
    d.res = filmRes(sc.tk, d.sc);
    d.bonus = scriptBonus(sc, d.sc, d.fix);
    if (d.bonus) earn(s, d.bonus, '흥행 인센티브', 'writer');
    d.t = sc.title; d.tk = sc.tk; d.by = sc.by;
    // 각본 수정 작품은 기록에만 남는다 (등급·연말 각본상은 내가 쓴 원고로만)
    if (d.fix) { addWork(s, { type: `${DIR_PJ[sc.tk].n} 각본 수정`, title: sc.title, by: '각본 수정', sc: d.sc, note: d.res, pay: (sc.price || 0) + (d.bonus || 0) }); const t = s.tracks.writer; if (t && t.st === 'active') t.rep = U.clamp(t.rep + (d.sc - 55) / 8, 0, 100); }
    else d.up = writerCredit(s, { title: sc.title, tk: sc.tk }, d.sc, (sc.price || 0) + (d.bonus || 0));
    // 크게 잘되면 몇 달 뒤 2차 판권(웹툰·OST·굿즈·해외 리메이크 등) 수익이 들어온다. 원작자인 내 원고만
    if (!d.fix && d.sc >= 74) queueEv(s, 'script_ip', U.int(3, 8), { id: sc.id, sc: d.sc }, true);
  },
  title: (s, d) => d.fix ? '손본 원고가 작품으로' : '내 원고가 작품으로',
  text: (s, d) => (d.fix ? `내가 손본 ${DIR_PJ[d.tk].n} ${josa(`「${d.t}」`, "이가")} 공개됐다. 원작 ${d.by} 작가, 연출 ${d.dir} 감독.` : `내가 쓴 ${DIR_PJ[d.tk].n} ${josa(`「${d.t}」`, "이가")} 공개됐다. 연출은 ${d.dir} 감독.`) + `\n\n${d.res}${d.bonus ? ` · 흥행 인센티브 ${fmtWon(d.bonus)}` : ''}` + (d.up ? `\n\n이 작품으로 '${WRITER_TIERS[s.tracks.writer.tier]}' 소리를 듣게 됐다.` : ''),
  // v174: 결과 창을 인터넷 기사로 (ui.js newsEvHTML)
  html: (s, d) => d.sc != null && d.t && typeof newsEvHTML === 'function' ? newsEvHTML(s, d, EVENTS.script_res.news(s, d)) : '',
  news(s, d) {
    const T = DIR_PJ[d.tk], A = `${me(s).name} 작가`, Q = newsQ(d.t), R = d.res, sc = (myScripts(s) || []).find(x => x.id === d.id) || {}, hit = d.sc >= 70, low = d.sc < 45;
    const heads = d.fix ? [`${T.n} ${Q} 공개…${R}`, `${d.dir} 감독의 ${Q}, ${R}`]
      : hit ? [`${A}의 ${Q}, ${R}`, `${A} 각본 ${Q} 흥행…${R}`] : low ? [`${A}의 ${Q}, ${R}에 그쳐`, `${A} 각본 ${Q}…아쉬운 성적`] : [`${A} 각본 ${Q} 공개…${R}`, `${T.n} ${Q}, ${R}`];
    const body = [
      d.fix ? `${T.n} ${josa(Q, '이가')} ${d.tk === 'film' ? '개봉했다' : '공개됐다'}. 원작은 ${d.by} 작가가 썼고, 각본 수정은 ${josa(A, '이가')} 맡았다. 작품은 ${newsOut(R)}.`
        : `${josa(A, '이가')} 쓴 ${sc.genre ? sc.genre + ' ' : ''}${T.n} ${josa(Q, '이가')} ${d.tk === 'film' ? '개봉했다' : '공개됐다'}. 작품은 ${newsOut(R)}.`,
      d.dir ? `연출은 ${d.dir} 감독이 맡았다.` : '',
    ];
    const ts = [['🎬', R, newsTone(d.sc)]];
    if (d.bonus) ts.push(['💰', `흥행 인센티브 +${fmtWon(d.bonus)}`, 'g']);
    if (d.up && s.tracks.writer) ts.push(newsUp('작가', WRITER_TIERS[s.tracks.writer.tier]));
    return { who: A, heads, body, sec: d.tk === 'film' ? '영화' : '방송', t: d.t, sc: d.sc, pl: EVENTS.script_res.plio(s, d), cap: `${Q}의 한 장면`, ts };
  },
  ch: (s, d) => [{ t: '확인', f: () => `「${d.t}」 공개. ${d.res}.` }],
});
// 2차 판권: 크게 잘된 내 원고로 웹툰·웹소설·OST·굿즈·해외 리메이크 등이 나와 원작자 몫이 들어온다
const SCRIPT_IP = ['웹툰', '웹소설', 'OST 앨범', '굿즈', '해외 리메이크 판권', '뮤지컬 판권', '팝업 스토어'];
E({
  id: 'script_ip', cat: '2차 판권', title: '2차 판권 수익', tag: 'career',
  cond: s => true,
  init(s, d) {
    const sc = myScripts(s).find(x => x.id === d.id);
    if (!sc) { d.skip = true; return; }
    d.items = U.shuffle(SCRIPT_IP.slice()).slice(0, d.sc >= 85 ? 4 : d.sc >= 80 ? 3 : 2);
    d.money = Math.round(sc.price * U.fl(0.4, 0.8) * (1 + (d.sc - 74) / 12) / 1e5) * 1e5;
    earn(s, d.money, '2차 판권·굿즈'); workPay(s, sc.title, d.money);
    d.t = sc.title;
  },
  text: (s, d) => `${josa(`「${d.t}」`, '이가')} 크게 잘된 덕분에 ${josa(d.items.join('·'), '이가')} 나왔다.\n\n원작자 몫으로 ${josa(fmtWon(d.money), '을를')} 받았다.`,
  ch: (s, d) => [{ t: '확인', f: () => `「${d.t}」 2차 판권(${d.items.join('·')}) 수익 ${fmtWon(d.money)}.` }],
});
// 내가 쓴 각본으로 연출한 작품: 작가 등급이 올랐으면 결과창에 같이 쓴다 (피드백 17)
function wupText(s, d) { return d.wup && s.tracks.writer ? `\n\n각본을 쓴 작가로서도 '${WRITER_TIERS[s.tracks.writer.tier]}' 소리를 듣게 됐다.` : ''; }
// 작가로서의 성과: 평판·등급·연말 각본상. 돌려주는 값: 등급이 올랐는지
function writerCredit(s, w, sc, pay) {
  const t = s.tracks.writer;
  addWork(s, { type: `${w.typeN || DIR_PJ[w.tk].n} 각본${w.genre ? ' · ' + w.genre : ''}`, title: w.title, by: '각본', sc, note: w.note || filmRes(w.tk, sc), pay });
  if (!t || t.st !== 'active') return false;
  jpopWork(s, 'writer', sc);
  t.made++; t.rep = U.clamp(t.rep + (sc - 52) / 4, 0, 100);
  t.yearBest = Math.max(t.yearBest || 0, sc);
  const big = w.tk !== 'web';
  const k = t.tier, WU = WRITER_UP;
  // 스타 작가는 큰 작품(드라마·OTT·영화)이 문턱을 두 번 넘어야 한다 (WU.hits)
  if (big && sc >= WU.sc[5]) t.topN = (t.topN || 0) + 1;
  const up = k < 6 && sc >= WU.sc[k] && (!WU.big[k] || big) && (k < 5 || (t.rep >= WU.rep && (t.topN || 0) >= (WU.hits || 1) && me(s).tal[WU.tal] >= WU.min));
  if (up) { t.tier++; if (t.tier >= 5) milestone(s, `${age(s)}세에 ${josa(`「${w.title}」`, '으로')} ${josa(WRITER_TIERS[t.tier], '이가')} 되었다.`); }
  return up;
}
function writerAwards(s, t) {
  const yb = t.yearBest || 0; t.yearBest = 0;
  if (!yb || yb < 74) return;
  const won = yb >= 84;
  if (won) award(s, '영화상 각본상');
  ceremony(s, '영화', me(s).name, '각본상', won, 'writer');
}
