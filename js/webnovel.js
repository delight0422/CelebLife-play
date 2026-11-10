'use strict';
// ════════ 웹툰 작가 · 웹소설 작가 (7-2단계) ════════
// 지금은 틀만 넣는다. 자세한 일은 12단계 직업별 디테일에서 정한다
// 두 직업은 같은 연재 구조를 쓴다 (직업마다 다른 값은 WB)
//  - 작품 하나를 골라 연재한다. 일정에 연재 작업을 넣은 달마다 마감을 지키고 독자가 늘어난다
//  - 자유 연재(도전 만화 · 자유 연재란): 누구나 올릴 수 있지만 독자가 적고 수입이 없다. 독자가 모이면 플랫폼에서 정식 연재 제안이 온다
//  - 공모전: 붙으면 상금을 받고 그 플랫폼에서 정식 연재한다
//  - CP사(웹툰·웹소설 에이전시): 전속 계약하면 새 작품마다 연재처를 잡아 주고 원고료를 올려 준다. 웹툰은 어시스턴트팀도 붙는다
//    대신 유료 결제 · 판권 수익의 일부(CP 몫)를 가져간다
//  - 정식 연재: 원고료(매달)와 유료 결제 수익(독자 수만큼)이 들어온다. 마감을 석 달 못 지키면 연재가 중단된다
//  - 완결하면 등급 점수를 받는다. 인기작은 드라마 · 애니 · 영화 · 게임으로 2차 판권이 팔리고, 내 회사(영상·애니 제작사)의 원작으로도 쓸 수 있다

const WB_IDS = ['webtoon', 'webnovel'];
// 연재 플랫폼 (정보만 있는 회사): 클수록 독자가 많이 모인다
const WB_PLATS = {
  webtoon: [{ n: '툰스퀘어', tier: 3 }, { n: '코믹밭', tier: 2 }, { n: '방울툰', tier: 1 }],
  webnovel: [{ n: '노블마루', tier: 3 }, { n: '이야기장터', tier: 2 }, { n: '글방', tier: 1 }],
};
function wbPlat(id, n) { return WB_PLATS[id].find(x => x.n === n) || WB_PLATS[id][2]; }
function wbPlatOf(id, tier) { return WB_PLATS[id].find(x => x.tier === tier); }
// CP사 9곳 (크기마다 3곳, 컨셉 있음)은 js/data.js의 AGENCIES (kind 'cp'). 팀(편집부 · 어시스턴트팀)은 js/work.js의 회사 직원 규칙으로 만든다
function cpList() { return AGENCIES.filter(a => a.kind === 'cp'); }

// 직업마다 다른 값: len 작품 하나에 드는 개월(연재 작업을 넣은 달), ep 한 달에 올리는 화 수, mg 정식 연재 원고료(만 원, 등급별), rate 독자 한 명이 한 달에 내는 유료 결제(원)
// promo 자유 연재에서 정식 연재 제안이 오기 시작하는 독자 수, UP 등급 문턱 (맨 위는 tal 재능이 min 이상)
const WB = {
  webtoon: {
    n: '웹툰 작가', sn: '웹툰', ic: '🖌️', act: '웹툰 연재 작업', free: '도전 만화', mkey: 'wtm',
    tiers: ['웹툰 지망생', '도전 만화 작가', '신인 웹툰 작가', '연재 작가', '인기 웹툰 작가', '스타 웹툰 작가', '레전드 웹툰 작가'],
    UP: { pts: [0, 5, 11, 35, 62, 100, 175], tal: 'aesth', min: 52 },
    len: [20, 40], ep: 4, stress: 3, mg: [180, 220, 280, 380, 550, 850, 1400], rate: 25, promo: 2500,
    need: s => lv(me(s), 'art') >= 15 && lv(me(s), 'script') >= 10, needN: '그림 15 · 작문 10레벨 이상이어야 한다',
    pro: s => lv(me(s), 'art') >= 25 && lv(me(s), 'script') >= 20, proN: '그림 25 · 작문 20레벨 이상이어야 한다',
  },
  webnovel: {
    n: '웹소설 작가', sn: '웹소설', ic: '📖', act: '웹소설 연재 작업', free: '자유 연재', mkey: 'wnm',
    tiers: ['웹소설 지망생', '자유 연재 작가', '신인 웹소설 작가', '연재 작가', '인기 웹소설 작가', '베스트셀러 작가', '레전드 웹소설 작가'],
    UP: { pts: [0, 2, 8, 20, 39, 66, 125], tal: 'creative', min: 52 },
    len: [8, 20], ep: 25, stress: 2, mg: [40, 70, 110, 180, 320, 550, 900], rate: 20, promo: 2000,
    need: s => lv(me(s), 'script') >= 15, needN: '작문이 15레벨 이상이어야 한다',
    pro: s => lv(me(s), 'script') >= 25, proN: '작문이 25레벨 이상이어야 한다',
  },
};
const WB_POW = [0, 0.5, 1, 2, 3, 3.5, 4];
Object.assign(CAREER_SHORT, { webtoon: '웹툰 작가', webnovel: '웹소설 작가' });

// 작품 점수 (v95): 웹툰은 그림 · 연출(강함)과 작문(보통), 웹소설은 작문(강함)과 연출(보통). 그 장르의 숙련도가 보탠다
// 0.8배 + 웹툰 13 · 웹소설 8: 처음 작가의 점수 크기가 예전과 비슷하게 (연출은 일하면서 는다)
function wbScore(s, id, g) {
  const p = me(s), b = aniMBonus(s, WB[id].mkey, g);
  return id === 'webtoon' ? 0.8 * jobMix([[lv(p, 'art'), JS_], [lv(p, 'direct'), JS_], [lv(p, 'script'), JM_]]) + 13 + b : 0.8 * jobMix([[lv(p, 'script'), JS_], [lv(p, 'direct'), JM_]]) + 8 + b;
}
// 장르는 애니 장르 10개와 같다. 유행은 따로 있다 (s.trendTV.web)
function wbTrend(s) { const tv = s.trendTV = s.trendTV || {}; if (!tv.web) tv.web = U.pick(ANIME_TRENDS); return tv.web; }
function wbMBars(s, id) { const k = WB[id].mkey, tr = wbTrend(s); return ANIME_TRENDS.filter(g => aniMGet(s, k, g) >= 1 || g === tr).sort((a, b) => aniMGet(s, k, b) - aniMGet(s, k, a)).map(g => ({ n: g, v: aniMGet(s, k, g), tag: g === tr ? '유행' : '' })); }
function wbTierUp(s, id, t) { return aniTierUp(s, t, WB[id].UP, WB[id].tiers, k => k < 2 || t.proN >= 1); }
// 정식 연재를 시작하면 신인 작가(2등급)부터다
function wbDebut(s, id, t) { t.proN++; t.pts = Math.max(t.pts, WB[id].UP.pts[2]); return wbTierUp(s, id, t); }

// 작품의 매력 → 독자가 닿을 수 있는 높이: 10^((매력 + WB_REACH) / 16). 자유 연재는 그 6%까지만
const WB_REACH = 17;
function wbAppeal(s, id, t, w) {
  const p = me(s);
  return wbScore(s, id, w.g) + w.luck + researchB(w.rs) + WB_POW[t.tier] + (w.pro ? wbPlat(id, w.plat).tier * 2 : 0) + (t.cp && w.pro ? AG[t.cp].tier : 0) + (id === 'webtoon' && t.cp ? 1 : 0)
    + (w.g === wbTrend(s) ? 3 : 0) + (p.tal.star - 50) * 0.1 - (s.stigma || 0) * 0.25;
}
function wbTarget(s, id, t, w) { return Math.min(8e6, Math.pow(10, (wbAppeal(s, id, t, w) + WB_REACH) / 16) * (w.pro ? 1 : 0.06)); }
// 플랫폼 순위: 독자가 이만큼이면 1위 (플랫폼 크기별)
const WB_R1 = [0, 4e5, 1.2e6, 3e6];
function wbRank(id, w) { return w.pro ? Math.max(1, Math.round(WB_R1[wbPlat(id, w.plat).tier] / Math.max(1, w.readers))) : 0; }
function wbRankN(id, w) { const r = wbRank(id, w); return r <= 100 ? `${w.plat} ${r}위` : '순위 밖'; }

function wbStart(s, id, o = {}) {
  const old = s.tracks[id];
  s.tracks[id] = Object.assign({ st: 'active', months: 0, tier: old.tier || 0, pts: old.pts || 0, done: old.done || 0, proN: old.proN || 0, best: old.best || null, list: old.list || [], cp: null, cpN: '', cut: 0, cpEnd: 0, w: null, hist: old.hist || [] }, o);
  if (!old.months && !(old.hist || []).length) milestone(s, `${age(s)}세에 ${WB[id].sn} ${id === 'webtoon' ? '그리기' : '쓰기'}를 시작했다.`);
  return s.tracks[id];
}
function wbLeaveCp(t) { t.cp = null; t.cpN = ''; t.cut = 0; t.cpEnd = 0; }

for (const id of WB_IDS) {
  const W = WB[id];
  CAREERS[id] = {
    n: W.n, ic: W.ic,
    desc: id === 'webtoon'
      ? '웹툰을 그려 플랫폼에 연재한다. 그림과 컷 연출이 가장 중요하고, 작문(이야기)도 본다. 도전 만화에 혼자 올리거나, 공모전이나 CP사를 거쳐 정식 연재한다. 인기작은 드라마 · 애니 · 영화로 만들어진다.'
      : '웹소설을 써서 플랫폼에 연재한다. 작문 특기가 가장 중요하고, 장면 연출도 본다. 자유 연재로 혼자 올리거나, 공모전이나 CP사를 거쳐 정식 연재한다. 인기작은 드라마 · 애니 · 영화로 만들어진다.',
    act: { n: W.act, ic: W.ic, g: '직업 활동', eff: id === 'webtoon' ? [['그림', '↑', 1], ['연출', '↑', 1], ['작문', '↑', 1], ['스트레스', '↑', 0]] : [['작문', '↑↑', 1], ['연출', '↑', 1], ['스트레스', '↑', 0]] },
    status(s, t) {
      if (t.st !== 'active') return t.endNote || '';
      const w = t.w;
      return `${W.tiers[t.tier]}${t.cp ? ` · ${t.cpN} 소속` : ''} · ${w ? `「${w.title}」 ${w.pro ? w.plat + ' 연재' : W.free} · 독자 ${fmtFans(w.readers)}${w.pro ? ' · ' + wbRankN(id, w) : ''}` : '다음 작품 준비 중'}`;
    },
    short(s, t) { return W.n; },
    seg(s, t) { return t.w ? `${W.sn} 「${t.w.title}」 연재` : W.n; },
    title(s, t) { return t.done || t.proN ? W.tiers[t.tier] : null; },
    contract(s, t) { return t.st === 'active' && t.cp ? t.cpN : ''; },
    cLeft(s, t) { return t.st === 'active' && t.cp ? t.cpEnd - t.months : null; },
    mainSk() { return id === 'webtoon' ? 'art' : 'script'; },
    info(s, t) {
      const w = t.w, R = [['소속', t.cp ? `${t.cpN} (${agTag(AG[t.cp])} CP사) · CP 몫 ${pctN(t.cut)}` : '없음'], ['등급', W.tiers[t.tier]]];
      R.push(['연재 중', w ? `「${w.title}」 · ${w.g} · ${w.pro ? `${w.plat} 정식 연재` : W.free} · ${w.ep}화 · 독자 ${fmtFans(w.readers)}${w.pro ? ' · ' + wbRankN(id, w) : ''}` : '없음']);
      R.push(['완결작', t.done ? `${t.done}편 · 가장 잘된 작품 「${t.best.title}」 (독자 ${fmtFans(t.best.peak)})` : '없음']);
      R.push({ h: `${W.sn} 장르 숙련도`, bars: wbMBars(s, id) });
      return R;
    },
    actions(s, t) {
      if (t.st !== 'active') return [];
      const A = [];
      if (!t.w) A.push({ t: '새 작품 연재 시작', h: t.cp ? `${t.cpN}에서 연재처를 잡아 준다` : `${W.free}에 올린다`, ok: !hasQ(s, 'wb_new'), why: '작품을 고르는 중', run: s => { fireEvent(s, 'wb_new', { id }); return ''; } });
      else A.push({ t: '연재 그만두기', h: t.w.pro ? '정식 연재를 중간에 접는다' : `${W.free}에 올리던 작품을 접는다`, ok: true, danger: true, confirm: `「${t.w.title}」 연재를 그만둘까요?`, run: s => wbEnd(s, id, t, 'quit') });
      if (t.cp) {
        const left = Math.max(0, t.cpEnd - t.months), pen = Math.max(300e4, left * 15e4 * AG[t.cp].tier);
        A.push({ t: 'CP사 계약 해지', h: `계약이 ${left}개월 남았다 · 위약금 ${fmtWon(pen)}`, ok: true, danger: true, confirm: `${josa(t.cpN, '과와')}의 계약을 해지할까요? 위약금 ${fmtWon(pen)}을 물어야 해요.`, run: s => { s.debt += pen; t.hist.push(`${t.cpN} (계약 해지)`); wbLeaveCp(t); return 'CP사와의 계약을 해지했다. 이제 혼자 연재한다.'; } });
      }
      A.push({ t: `${W.n} 그만두기`, ok: !(t.w && t.w.pro), why: '정식 연재 중인 작품을 끝낸 뒤에 그만둘 수 있다', danger: true, confirm: `정말 ${W.n} 일을 그만둘까요?`, run: s => {
        if (t.w) wbEnd(s, id, t, 'quit');
        if (t.cp) { t.hist.push(`${t.cpN} (그만둠)`); wbLeaveCp(t); }
        t.st = 'ended'; t.endNote = `${W.tiers[t.tier]}, 완결작 ${t.done}편`; t.hist.push(t.endNote);
        return `${W.n} 일을 그만뒀다.`;
      } });
      return A;
    },
    monthly(s, t) { wbMonth(s, id, t); },
  };
}

// ───── 한 달 ─────
// 끈기가 낮을수록 원고를 미루다 마감을 놓친다 (끈기 50 이상은 놓치지 않는다)
function wbLazyP(s) { const g = me(s).tal.grit; return g >= 50 ? 0 : 0.25 * Math.pow((50 - g) / 50, 1.5); }
function wbMonth(s, id, t) {
  if (t.st !== 'active') return;
  const W = WB[id], p = me(s);
  let n = slotsOn(s, 'c_' + id);
  t.months++;
  if (t.cp && t.months >= t.cpEnd && !hasQ(s, 'wb_cp_end')) queueEv(s, 'wb_cp_end', 0, { id });
  if (n) {
    if (id === 'webtoon') { practice(s, p, 'art', 0.8 * n); practice(s, p, 'script', 0.5 * n); } else practice(s, p, 'script', 1.1 * n);
    // v95: 컷 · 장면 연출이 일하면서 조금씩 는다 (처음이면 연출 특기가 생긴다)
    if (!has(p, 'direct')) learnSkill(s, p, 'direct', 1);
    practice(s, p, 'direct', (id === 'webtoon' ? 0.5 : 0.3) * n);
  }
  // 예전에 완결한 인기작에도 가끔 판권 제안이 온다
  if (!hasQ(s, 'wb_ip') && U.chance(0.004)) { const L = (t.list || []).filter(x => x.peak >= WB_IP_MIN && (x.ips || []).length < 4); if (L.length) queueEv(s, 'wb_ip', 0, { id, wid: U.pick(L).id }); }
  const w = t.w;
  if (!w) return;
  // 군 복무 중에는 휴재한다 (연재는 끊기지 않고 독자만 조금씩 빠진다)
  if (s.army) { w.readers = Math.round(w.readers * 0.97); return; }
  // 논란 자숙 중에도 휴재로 세지 않는다 (v93: 자숙하다 연재가 끊기지 않게). 독자만 조금씩 빠진다
  if (s.hiatus && !n) { w.readers = Math.round(w.readers * 0.97); return; }
  // 끈기가 낮으면 일을 넣어도 원고를 미루다 마감을 놓친다 (v93, 정식 연재만)
  let lazy = false;
  if (n && w.pro && U.chance(wbLazyP(s))) { n = 0; lazy = true; }
  if (n) {
    addStress(s, W.stress - (id === 'webtoon' && t.cp ? 1 : 0));
    w.done++; w.ep += W.ep; w.miss = 0; aniMGain(s, W.mkey, w.g, 0.6);
  } else if (w.pro) {
    w.miss = (w.miss || 0) + 1;
    if (w.miss >= 3) { addLog(s, `「${w.title}」 마감을 석 달 동안 못 지켜 ${w.plat}에서 연재가 중단됐다. ` + wbEnd(s, id, t, 'drop'), 'bad'); return; }
    addLog(s, `${lazy ? '원고를 붙잡고는 있었지만 자꾸 미루다 ' : ''}이번 달 「${w.title}」 마감을 못 지켜 휴재했다. 독자들이 떠나고 있다.${w.miss === 2 ? ' 한 달 더 쉬면 연재가 중단된다.' : ''}`, 'bad');
    // 12개월 안에 휴재가 세 번이고 독자가 많으면 잦은 휴재 논란 (v93)
    w.hl = (w.hl || []).filter(x => x > s.t - 12).concat(s.t);
    if (w.hl.length >= 3 && w.readers >= 3000 && !s.scandal && !s.hiatus && !(s.cd.serialSc > s.t)) { w.hl = []; s.cd.serialSc = s.t + 24; s.flags.serialSc = { kind: W.sn, title: w.title }; startScandal(s, 'serial', 'real'); }
  }
  const before = w.readers, target = wbTarget(s, id, t, w);
  if (!n) w.readers = Math.round(w.readers * (w.pro ? 0.88 : 0.95));
  else if (w.readers < target) w.readers += Math.round((target - w.readers) * U.fl(0.06, 0.14) + U.int(5, 40));
  else w.readers = Math.round(w.readers * U.fl(0.97, 1.0));
  w.peak = Math.max(w.peak, w.readers);
  s.fans.kr += Math.round(Math.max(0, w.readers - before) * 0.15 * myRoom(s, 'kr'));
  if (w.pro) {
    // 정식 연재 수입: 원고료(마감을 지킨 달) + 유료 결제 (CP사 소속이면 CP 몫을 뗀다)
    const mg = Math.round(W.mg[t.tier] * (0.8 + wbPlat(id, w.plat).tier * 0.15) * (t.cp ? 1 + AG[t.cp].tier * 0.1 : 1)) * 1e4;
    if (n) earn(s, mg, `${W.sn} 원고료`, id);
    const pay = Math.round(w.readers * W.rate * U.fl(0.8, 1.2) * (1 - (t.cp ? t.cut : 0)));
    if (pay > 0) earn(s, pay, `${W.sn} 유료 결제`, id);
    const r = wbRank(id, w);
    if (n && r <= 10) {
      t.pts += r === 1 ? 1 : r <= 3 ? 0.6 : 0.3;
      if (r === 1 && !w.top) { w.top = true; jpopAdd(s, id, 4); addFame(s, 1.5); addLog(s, `「${w.title}」이 ${w.plat} 1위에 올랐다!`, 'good'); milestone(s, `${age(s)}세에 ${W.sn} 「${w.title}」로 ${w.plat} 1위를 했다.`); }
      const up = wbTierUp(s, id, t); if (up) addLog(s, up, 'good');
    }
    // 인기작은 연재 중에도 판권 제안이 온다
    if (w.readers >= WB_IP_MIN && !hasQ(s, 'wb_ip') && U.chance(0.015 * (t.cp ? 1.3 : 1))) queueEv(s, 'wb_ip', 0, { id, wid: w.id });
  } else if (n && w.readers >= W.promo && !hasQ(s, 'wb_promo') && !(s.cd['wbpro_' + id] > s.t) && U.chance(0.12)) queueEv(s, 'wb_promo', 0, { id });
  // 소속 없이 독자가 모이면 CP사에서 전속 계약 제안이 온다
  if (n && !t.cp && w.readers >= 2000 && !agencyContract(s) && !s.inbox.some(m => m.kind === 'wb_cp_offer') && U.chance(0.025 + t.tier * 0.005)) wbCpOffer(s, id, t);
  if (n && w.done >= w.len) addLog(s, wbEnd(s, id, t, 'done'), 'good');
}

// ───── 새 작품: 장르 → 제목 ─────
// 장르는 숙련도가 높은 것부터 보여 준다. 공모전에 붙어서 고르는 중이면(d.pro) 그만둘 수 없다
E({
  id: 'wb_new', cat: '새 작품', title: '새 작품', tag: 'career',
  init(s, d) { if (!trackOn(s, d.id) || s.tracks[d.id].w) d.skip = true; },
  text: (s, d) => { const t = s.tracks[d.id], W = WB[d.id]; return `${d.after ? '연재를 마쳤다. ' : ''}${d.pro ? `${d.plat}에서 정식 연재할 ` : '다음 '}${W.sn}은 어떤 장르로 할까?${t.cp && !d.pro ? ` ${t.cpN}에서 연재처를 잡아 준다.` : ''}`; },
  ch: (s, d) => {
    const k = WB[d.id].mkey, tr = wbTrend(s);
    const C = ANIME_TRENDS.map((g, i) => [g, aniMGet(s, k, g), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(([g]) => ({ t: g, tr: g === tr, h: `장르 숙련도 ${gauge(aniMGet(s, k, g))}`, f: s => { fireEvent(s, 'wb_title', { id: d.id, g, pro: d.pro, plat: d.plat }); return ''; } }));
    return d.pro ? C : C.concat([{ t: d.after ? '잠시 쉰다' : '그만둔다', f: () => d.after ? '다음 작품은 조금 쉬었다가 시작하기로 했다.' : '' }]);
  },
});
E({
  id: 'wb_title', cat: '새 작품', title: '작품 제목', tag: 'career',
  init(s, d) { d.title = freshName(() => animeTitle(d.g)); },
  text: (s, d) => `${d.g} ${WB[d.id].sn}의 제목을 정하자.`,
  form: (s, d) => [{ k: 'title', label: '제목', value: d.title, max: 20 }],
  submit(s, d, v) {
    const title = (v.title || '').trim();
    if (!title) return { err: '제목은 비울 수 없어요' };
    return { log: wbBegin(s, d.id, title, d) };
  },
});
function wbBegin(s, id, title, d) {
  const W = WB[id], t = s.tracks[id], cpT = t.cp ? AG[t.cp].tier : 0;
  const pro = !!(d.pro || t.cp);
  const plat = d.plat || (t.cp ? wbPlatOf(id, U.clamp(cpT - 1 + (t.tier >= 3 ? 1 : 0) + U.int(0, 1), 1, 3)).n : U.pick(WB_PLATS[id]).n);
  // 처음 독자: 전작 독자와 내 팬 일부가 따라온다
  const follow = (t.best ? t.best.peak * 0.15 : 0) + totalFans(s) * 0.01;
  // 사전 조사 (v97): 연재를 시작하기 전에 그 장르를 조사한다
  const r = researchDo(s, d.g);
  t.w = { id: 'w' + U.uid(), title, g: d.g, pro, plat, start: s.t, len: U.int(W.len[0], W.len[1]), done: 0, ep: 0, readers: Math.round(follow * (pro ? 1 : 0.3) + U.int(20, 200)), peak: 0, luck: U.normal(0, 6), miss: 0, ips: [], rs: r.rs };
  const up = pro ? wbDebut(s, id, t) : '';
  return `${d.g} 사전 조사: ${r.w}. ` + (pro ? `${plat}에서 ${W.sn} 「${title}」 정식 연재를 시작했다. 일정에 ${W.act}을 넣어야 마감을 지킨다.` : `${W.free}에 ${W.sn} 「${title}」을 올리기 시작했다. 일정에 ${W.act}을 넣어야 연재가 이어진다.`) + (up ? ' ' + up : '');
}
// 연재가 끝났을 때: 완결(done) · 마감을 못 지켜 중단(drop) · 내가 접음(quit). 결과 문장을 돌려준다
// 등급 점수: 가장 많을 때 독자 수로 정한다. 자유 연재는 40%, 끝까지 못 가면 30%만
const WB_DONE = [[1e3, 1], [1e4, 2], [5e4, 4], [2e5, 7], [5e5, 10], [1.5e6, 14], [4e6, 18]];
function wbEnd(s, id, t, why) {
  const W = WB[id], w = t.w, full = why === 'done';
  t.w = null;
  let pts = 0; for (const [v, k] of WB_DONE) if (w.peak >= v) pts = k;
  t.pts += pts * (w.pro ? 1 : 0.4) * (full ? 1 : 0.3);
  if (full) { t.done++; aniMGain(s, W.mkey, w.g, 5); }
  const q = U.clamp(Math.round(wbScore(s, id, w.g) + w.luck + researchB(w.rs) + 10), 10, 95);
  t.list = t.list || [];
  t.list.push({ id: w.id, title: w.title, g: w.g, pro: w.pro, plat: w.plat, peak: w.peak, ep: w.ep, q, end: why, y: calY(s), ips: w.ips || [], anime: !!w.anime, video: !!w.video });
  if (full && (!t.best || w.peak > t.best.peak)) t.best = { title: w.title, peak: w.peak };
  addWork(s, { type: W.sn, title: w.title, by: w.pro ? w.plat : W.free, sc: U.clamp(Math.round(Math.log10(Math.max(10, w.peak)) * 15), 0, 100), note: `${w.g} · ${w.ep}화 ${full ? '완결' : '중단'} · 독자 ${fmtFans(w.peak)}` });
  const up = wbTierUp(s, id, t);
  if (full && w.peak >= 1e5) milestone(s, `${age(s)}세에 ${W.sn} 「${w.title}」을 완결했다. (독자 ${fmtFans(w.peak)})`);
  if (full && w.peak >= WB_IP_MIN && U.chance(wbIpP(t, w.peak))) queueEv(s, 'wb_ip', 2, { id, wid: w.id }, true);
  if (why !== 'quit') queueEv(s, 'wb_new', full ? 2 : 1, { id, after: true });
  const msg = full ? `「${w.title}」 연재가 ${w.ep}화로 완결됐다. 가장 많을 때 독자 ${fmtFans(w.peak)}.` : why === 'drop' ? `가장 많을 때 독자 ${fmtFans(w.peak)}.` : `「${w.title}」 연재를 접었다.`;
  return msg + (up ? ' ' + up : '');
}

// ───── 자유 연재로 시작 ─────
for (const id of WB_IDS) JOB_APPLY.push({
  id: id + '_free', trk: id, g: `${WB[id].ic} ${WB[id].n}`, n: `${WB[id].free}에 올리기`,
  show: s => !trackOn(s, id),
  h: s => '수입은 없다 · 독자가 모이면 정식 연재 제안이 온다',
  ok: s => !s.army && age(s) >= 14 && WB[id].need(s),
  why: s => s.army ? '군 복무 중' : age(s) < 14 ? '14세부터 할 수 있다' : WB[id].needN,
  run: s => { wbStart(s, id); fireEvent(s, 'wb_new', { id }); return ''; },
});
// 자유 연재 작품에 독자가 모이면 플랫폼이 정식 연재를 제안한다 (독자가 많을수록 큰 플랫폼)
E({
  id: 'wb_promo', cat: '제안', title: '정식 연재 제안', tag: 'career',
  init(s, d) {
    const t = s.tracks[d.id], W = WB[d.id];
    if (!trackOn(s, d.id) || !t.w || t.w.pro) { d.skip = true; return; }
    d.plat = wbPlatOf(d.id, t.w.readers >= W.promo * 6 ? 3 : t.w.readers >= W.promo * 2.5 ? 2 : 1).n;
    d.mg = Math.round(W.mg[t.tier] * (0.8 + wbPlat(d.id, d.plat).tier * 0.15)) * 1e4;
  },
  text: (s, d) => { const W = WB[d.id], w = s.tracks[d.id].w; return `${W.free}에 올리던 「${w.title}」을 본 ${d.plat}에서 정식 연재를 하자고 연락이 왔다. 매달 원고료 ${fmtWon(d.mg)}과 유료 결제 수익이 들어오지만, 마감을 석 달 못 지키면 연재가 중단된다.`; },
  ch: (s, d) => [
    { t: '정식 연재한다', f: s => { const t = s.tracks[d.id], W = WB[d.id]; if (!t.w) return ''; Object.assign(t.w, { pro: true, plat: d.plat, len: t.w.done + U.int(W.len[0], W.len[1]) }); const up = wbDebut(s, d.id, t); return `「${t.w.title}」 ${d.plat} 정식 연재를 시작했다.${up ? ' ' + up : ''}`; } },
    { t: '거절한다', f: s => { s.cd['wbpro_' + d.id] = s.t + 12; return `${d.plat}의 정식 연재 제안을 거절했다.`; } },
  ],
});

// ───── 공모전 (플랫폼마다 1년에 한 번) ─────
const WB_PRIZE = [0, 500e4, 1000e4, 3000e4], WB_THR = [0, 40, 47, 54];
function wbContestP(s, id, pt) { const t = s.tracks[id], on = trackOn(s, id); return audP(wbScore(s, id) + WB_POW[t.tier || 0] * 2 + (on && t.w ? Math.log10(1 + t.w.readers / 1000) * 3 : 0), WB_THR[pt]); }
for (const id of WB_IDS) for (const pt of [3, 2, 1]) {
  const P = wbPlatOf(id, pt), W = WB[id];
  JOB_APPLY.push({
    id: `${id}_contest${pt}`, trk: id, g: `${W.ic} ${W.n}`, get n() { return `${P.n} ${W.sn} 공모전`; }, tag: `상금 ${fmtWon(WB_PRIZE[pt])}`,
    show: s => age(s) >= 14 && !(trackOn(s, id) && (s.tracks[id].cp || (s.tracks[id].w && s.tracks[id].w.pro))),
    h: s => W.pro(s) ? `합격 가능성 ${fmtPct(wbContestP(s, id, pt))} · 결과는 다음 달 · 붙으면 ${P.n}에서 정식 연재` : W.proN,
    ok: s => !s.army && W.pro(s) && !hasQ(s, 'wb_contest') && !(s.cd[`wbc_${id}${pt}`] > s.t),
    why: s => s.army ? '군 복무 중' : !W.pro(s) ? W.proN : hasQ(s, 'wb_contest') ? '결과를 기다리는 중' : '공모전은 1년에 한 번 열린다',
    run: s => { s.cd[`wbc_${id}${pt}`] = s.t + 12; queueEv(s, 'wb_contest', 1, { id, pt, p: wbContestP(s, id, pt) }); return `${P.n} ${W.sn} 공모전에 작품을 냈다.`; },
  });
}
E({
  id: 'wb_contest', cat: '공모전', title: '공모전 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); d.plat = wbPlatOf(d.id, d.pt).n; },
  text: (s, d) => d.pass ? `${d.plat} ${WB[d.id].sn} 공모전에 당선됐다! 상금 ${fmtWon(WB_PRIZE[d.pt])}을 받고 ${d.plat}에서 정식 연재를 하게 됐다.` : `${d.plat} ${WB[d.id].sn} 공모전에 떨어졌다.`,
  ch: (s, d) => { const jb = d.pass && !trackOn(s, d.id) && jobBlock(s, d.id); return jb ? [{ t: '확인', f: s => { earn(s, WB_PRIZE[d.pt], `${WB[d.id].sn} 공모전 상금`, d.id); return `${d.plat} 공모전에 당선돼 상금을 받았다. 하지만 ${jb}. 그래서 연재는 맡지 못했다.`; } }] : d.pass ? [{ t: '정식 연재를 준비한다', f: s => wbContestWin(s, d) }] : [{ t: '다시 준비한다', f: s => `${d.plat} 공모전에 떨어졌다.` + fx(s, { stress: 2 }) }]; },
});
function wbContestWin(s, d) {
  const id = d.id, W = WB[id], t = trackOn(s, id) ? s.tracks[id] : wbStart(s, id);
  earn(s, WB_PRIZE[d.pt], `${W.sn} 공모전 상금`, id);
  t.pts += 2;
  milestone(s, `${age(s)}세에 ${d.plat} ${W.sn} 공모전에 당선됐다.`);
  if (t.w && !t.w.pro) {
    Object.assign(t.w, { pro: true, plat: d.plat, len: t.w.done + U.int(W.len[0], W.len[1]) });
    const up = wbDebut(s, id, t);
    return `${W.free}에 올리던 「${t.w.title}」으로 ${d.plat} 정식 연재를 시작했다.${up ? ' ' + up : ''}`;
  }
  wbTierUp(s, id, t);
  if (!t.w) fireEvent(s, 'wb_new', { id, pro: true, plat: d.plat });
  return '';
}

// ───── CP사: 투고 · 먼저 오는 제안 · 계약 · 만료 ─────
const WB_CP_THR = [0, 40, 48, 56];
function wbCpP(s, id, ct) { const t = s.tracks[id], on = trackOn(s, id); return audP(wbScore(s, id) + WB_POW[t.tier || 0] * 3 + (t.best ? Math.log10(1 + t.best.peak / 1000) * 3 : 0) + (on && t.w ? Math.log10(1 + t.w.readers / 1000) * 2 : 0), WB_CP_THR[ct]); }
for (const id of WB_IDS) for (const ct of [3, 2, 1]) {
  const W = WB[id], cut = cpList().find(a => a.tier === ct).cut;
  JOB_APPLY.push({
    id: `${id}_cp${ct}`, trk: id, g: `${W.ic} ${W.n}`, n: `${TIER_N[ct]} CP사 투고`, tag: `CP 몫 ${pctN(cut)}`,
    show: s => age(s) >= 16 && !(trackOn(s, id) && s.tracks[id].cp),
    h: s => W.pro(s) ? `합격 가능성 ${fmtPct(wbCpP(s, id, ct))} · 결과는 다음 달` : W.proN,
    ok: s => !s.army && W.pro(s) && !agencyContract(s) && !hasQ(s, 'wb_cp_res') && !(s.cd[`wbcp_${id}${ct}`] > s.t),
    why: s => s.army ? '군 복무 중' : !W.pro(s) ? W.proN : agencyContract(s) ? contractWhy(s) : hasQ(s, 'wb_cp_res') ? '결과를 기다리는 중' : '얼마 전에 투고했다 (반년 뒤 다시)',
    run: s => { s.cd[`wbcp_${id}${ct}`] = s.t + 6; const ag = U.pick(cpList().filter(a => a.tier === ct)); queueEv(s, 'wb_cp_res', 1, { id, ag: ag.id, p: wbCpP(s, id, ct) }); return `${TIER_N[ct]} CP사 ${ag.n}에 원고를 투고했다.`; },
  });
}
function wbNego(s, id, ag, lev) { return startNego(s, { kind: 'wbcp', id, ag: ag.id, agN: ag.n, months: 36, cut: ag.cut, lev }); }
E({
  id: 'wb_cp_res', cat: '투고', title: '투고 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); },
  text: (s, d) => d.pass ? `${AG[d.ag].n}(${agTag(AG[d.ag])} CP사)에서 같이 하자는 연락이 왔다!` : `${AG[d.ag].n}에서 답이 없다. 이번 투고는 안 됐다.`,
  ch: (s, d) => d.pass ? [
    { t: '계약서를 받아 본다', ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : 'CP 몫과 계약 기간을 협상할 수 있다', f: s => wbNego(s, d.id, AG[d.ag], U.clamp((d.p - 0.5) * 0.8 + 0.3, 0.05, 0.8)) },
    { t: '거절한다', f: () => `${AG[d.ag].n}의 제안을 거절했다.` },
  ] : [{ t: '다시 준비한다', f: s => `${AG[d.ag].n} 투고가 안 됐다.` + fx(s, { stress: 2 }) }],
});
NEGO.wbcp = {
  what: d => `CP사 전속 계약이다. 새 ${WB[d.id].sn}마다 연재처를 잡아 주고 원고료를 올려 준다.${d.id === 'webtoon' ? ' 어시스턴트팀도 붙여 준다.' : ''} 대신 유료 결제와 판권 수익의 일부를 CP 몫으로 가져간다.`,
  block: s => agencyContract(s) ? contractWhy(s) : '',
  sign: (s, d) => wbSign(s, d),
  refuse: (s, d) => `${d.agN}의 계약 제안을 거절했다.`,
};
function wbSign(s, d) {
  const id = d.id, W = WB[id], ag = AG[d.ag], t = trackOn(s, id) ? s.tracks[id] : wbStart(s, id);
  Object.assign(t, { cp: ag.id, cpN: ag.n, cut: d.cut, cpEnd: t.months + d.months });
  coMeetJob(s, id);
  milestone(s, `${age(s)}세에 CP사 ${josa(ag.n, '과와')} 계약했다.`);
  let x = `${josa(ag.n, '과와')} 계약했다. (계약 ${yrs(d.months)} · CP 몫 ${pctN(d.cut)})`;
  if (t.w && !t.w.pro) {
    const plat = wbPlatOf(id, U.clamp(ag.tier - 1 + U.int(0, 1), 1, 3)).n;
    Object.assign(t.w, { pro: true, plat, len: t.w.done + U.int(W.len[0], W.len[1]) });
    x += ` ${josa(ag.n, '이가')} 「${t.w.title}」 연재처를 잡아 줬다: ${plat} 정식 연재.`;
    const up = wbDebut(s, id, t); if (up) x += ' ' + up;
  } else if (!t.w) queueEv(s, 'wb_new', 0, { id });
  return x;
}
function wbCpOffer(s, id, t) {
  const top = U.clamp(1 + Math.floor(t.tier / 2) + (t.w && t.w.readers >= 1e5 ? 1 : 0), 1, 3);
  const L = cpList().filter(a => a.tier <= top && a.tier >= top - 1), ag = U.pick(L.length ? L : cpList());
  sendMsg(s, 'wb_cp_offer', { from: ag.n, title: '전속 계약 제안', months: 4, d: { id, ag: ag.id, title: t.w ? t.w.title : '' } });
}
INBOX.wb_cp_offer = {
  ic: '📚',
  text: (s, m) => { const ag = AG[m.d.ag]; return `${ag.n}(${agTag(ag)} CP사)에서 ${m.d.title ? `「${m.d.title}」을 봤다며 ` : ''}전속 계약을 하자고 연락이 왔다. 연재처를 잡아 주고 원고료를 올려 주지만, 유료 결제와 판권 수익의 ${pctN(ag.cut)}는 CP 몫이다.`; },
  ch: (s, m) => [
    { t: '계약서를 받아 본다', ok: s => trackOn(s, m.d.id) && !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '', f: s => wbNego(s, m.d.id, AG[m.d.ag], 0.5) },
    { t: '거절한다', f: () => `${AG[m.d.ag].n}의 제안을 거절했다.` },
  ],
};
E({
  id: 'wb_cp_end', cat: '계약', title: 'CP사 계약 만료', tag: 'career',
  init(s, d) { const t = s.tracks[d.id]; if (!trackOn(s, d.id) || !t.cp) d.skip = true; },
  text: (s, d) => `${josa(s.tracks[d.id].cpN, '과와')}의 전속 계약이 끝났다.`,
  ch: (s, d) => { const t = s.tracks[d.id]; return [
    { t: '재계약한다', h: `3년 · CP 몫 ${pctN(t.cut)}`, f: s => { t.cpEnd = t.months + 36; return `${josa(t.cpN, '과와')} 재계약했다.`; } },
    { t: '혼자 연재한다', h: '연재 중인 작품은 그대로 이어 간다', f: s => { t.hist.push(`${t.cpN} (계약 만료)`); wbLeaveCp(t); return 'CP사를 나와 혼자 연재하기로 했다.'; } },
  ]; },
});

// ───── 2차 판권 (드라마 · 애니 · 영화 · 게임) ─────
// 독자가 WB_IP_MIN을 넘은 작품에만 온다. 판권료는 독자 수의 제곱근에 비례한다. 판 뒤 1~2년이면 그 작품이 나온다
const WB_IP_MIN = 2e5;
const WB_IP = { 드라마: { by: 'prod', base: 1e8 }, 애니: { by: 'ani', base: 6e7 }, 영화: { by: 'prod', base: 1.2e8 }, 게임: { by: 'game', base: 5e7 } };
function wbIpP(t, peak) { return U.clamp(0.25 + Math.log10(peak / WB_IP_MIN) * 0.35, 0, 0.9) * (t.cp ? 1.3 : 1); }
function wbFind(t, wid) { return t.w && t.w.id === wid ? t.w : (t.list || []).find(x => x.id === wid); }
E({
  id: 'wb_ip', cat: '판권', title: '2차 판권 제안', tag: 'career',
  init(s, d) {
    const t = s.tracks[d.id], w = t && wbFind(t, d.wid);
    const left = w ? Object.keys(WB_IP).filter(k => !(w.ips || []).includes(k) && !(k === '애니' && w.anime) && !((k === '드라마' || k === '영화') && w.video)) : [];
    if (!w || !left.length) { d.skip = true; return; }
    d.kind = U.pick(left); d.title = w.title;
    const I = WB_IP[d.kind];
    d.by = I.by === 'ani' ? aniCoOf(w.peak >= 1e6 ? 3 : U.pick([1, 2])).n : I.by === 'game' ? U.pick(BRANDS.filter(b => b.cat === '게임')).n : U.pick(PROD_COS).n;
    d.price = Math.round(I.base * Math.sqrt(w.peak / WB_IP_MIN) * U.fl(0.8, 1.2) / 1e6) * 1e6;
  },
  text: (s, d) => { const t = s.tracks[d.id]; return `${d.by}에서 ${WB[d.id].sn} 「${d.title}」을 ${josa(d.kind, '으로')} 만들고 싶다며 판권을 사겠다고 한다. 판권료 ${fmtWon(d.price)}${t.cp ? ` (CP 몫 ${pctN(t.cut)}를 뗀다)` : ''}.`; },
  ch: (s, d) => [
    { t: '판권을 판다', f: s => wbIpSell(s, d) },
    { t: '거절한다', f: () => `「${d.title}」 ${d.kind} 판권 제안을 거절했다.` },
  ],
});
function wbIpSell(s, d) {
  const t = s.tracks[d.id], w = wbFind(t, d.wid);
  if (!w) return '';
  (w.ips = w.ips || []).push(d.kind);
  if (d.kind === '애니') w.anime = true;
  if (d.kind === '드라마' || d.kind === '영화') w.video = true;
  const v = Math.round(d.price * (1 - (t.cp ? t.cut : 0)));
  earn(s, v, `${WB[d.id].sn} 판권료`, d.id);
  t.pts += 2;
  const up = wbTierUp(s, d.id, t);
  queueEv(s, 'wb_ip_out', U.int(12, 24), { id: d.id, wid: d.wid, kind: d.kind, title: d.title }, true);
  milestone(s, `${age(s)}세에 ${WB[d.id].sn} 「${d.title}」의 ${d.kind} 판권이 팔렸다.`);
  return `「${d.title}」 ${d.kind} 판권을 ${d.by}에 팔았다. (${fmtWon(v)})${up ? ' ' + up : ''}`;
}
E({
  id: 'wb_ip_out', cat: '판권', title: '원작 작품 공개', tag: 'career',
  init(s, d) { d.hit = U.chance(0.5); },
  text: (s, d) => `내 ${WB[d.id].sn} 「${d.title}」이 원작인 ${josa(d.kind, '이가')} 나왔다. ${d.hit ? '반응이 좋다! 원작을 찾아 읽는 사람이 늘었다.' : '반응은 그저 그렇다.'}`,
  ch: (s, d) => [{ t: '확인', f: s => {
    if (!d.hit) return `「${d.title}」 ${d.kind} 반응은 그저 그랬다.`;
    const t = s.tracks[d.id], w = t && wbFind(t, d.wid);
    if (w) w.peak = Math.round(w.peak * 1.2);
    if (t && t.w) t.w.readers = Math.round(t.w.readers * 1.1);
    jpopAdd(s, d.id, 3);
    return `원작 「${d.title}」을 찾아 읽는 사람이 늘었다.` + fx(s, { fame: 1, fkr: Math.round(((w && w.peak) || 0) * 0.03) });
  } }],
});

// ───── 내 회사의 원작 (js/studio.js): 완결한 작품 중 독자 1만 명 이상 ─────
// 영상 제작사(드라마·영화)는 장르를 드라마 장르로 바꿔 쓴다
const WB_DRAMA_G = { 판타지: '판타지', 이세계: '판타지', 액션: '액션', 로맨스: '로맨스', 일상: '휴먼 코미디', SF: '판타지', 스포츠: '휴먼 코미디', 학원물: '학원물', 미스터리: '스릴러', 아이돌: '로맨스' };
function wbMyWorks(s) {
  const L = [];
  for (const id of WB_IDS) { const t = s.tracks[id]; for (const x of (t && t.list) || []) if (x.peak >= 1e4 && x.end === 'done') L.push(Object.assign({ sn: WB[id].sn }, x)); }
  return L;
}
function wbMark(s, wid, k) { for (const id of WB_IDS) { const t = s.tracks[id], x = t && (t.list || []).find(y => y.id === wid); if (x) x[k] = true; } }
