// ───── 아이돌 그룹 단독 콘서트 (v193) ─────
// 앨범 5장 이상 · 그룹 팬 30만 명 이상 · 연습생 · 제작 비용을 다 회수한 우리 회사 아이돌 그룹만 연다 (1년에 한 번)
// 대표가 정하는 순서: 공연장(대관) → 부를 곡(10~20곡) → 셋리스트 순서 → 토크마다 누가 말할지 → 입장료
// v197: 곡을 먼저 고르면 토크 수(3곡마다 한 번, 버림)와 턴 수(곡 + 토크)가 정해지고, 5턴마다 한 번(버림) 하이라이트 자리가 무작위로 정해진다
//   하이라이트마다 그 자리에 어울리는 컨셉이 같이 정해진다 (공연의 어디쯤인지에 따라). 하이라이트에 든 곡의 완성도 · 컨셉은 열기에 더 크게 들어간다
//   VCR · 쉬는 시간은 없앴다 (예전 세이브의 기획은 그대로 읽는다)
// 다음 달에 공연. 내가 기획했으면 음악방송처럼 공연을 본다 (live.js liveConcert). 전담 프로듀서 · 자동 · CEO가 맡으면 안 보여 준다
// 관객 수 = 그룹 팬 · 팬 충성도 · 입장료. 열기 = 무대 실력 · 곡 완성도 · 토크 멤버 예능 (v194)
// 끝나면 결산: 열기(분위기) · 수익 · 열기가 높으면 팬 충성도 ↑ / 낮으면 그룹 팬 ↓ (토스트). CEO가 맡은 회사면 CEO 보고서에 들어간다
const CC_VENUE = [
  { n: '소극장 홀', seat: 1500, rent: 2000e4, stage: 8000e4 },
  { n: '중형 공연장', seat: 4000, rent: 6000e4, stage: 2e8 },
  { n: '체육관', seat: 9000, rent: 1.5e8, stage: 4.5e8 },
  { n: '실내 경기장', seat: 15000, rent: 3e8, stage: 8e8 },
  { n: '돔 경기장', seat: 40000, rent: 8e8, stage: 18e8 },
  { n: '주경기장', seat: 60000, rent: 12e8, stage: 28e8 },
];
const CC_SHOWS = 2, CC_PRICE = [77000, 99000, 121000, 143000, 165000, 198000], CC_MIN = { alb: 5, fans: 30e4 }, CC_FEE = 0.1;
function ccCost(v) { const V = CC_VENUE[v] || CC_VENUE[0]; return V.rent + V.stage; }
function ccWhy(s, t, g) {
  if (!g.debuted) return '데뷔한 뒤에 열 수 있다';
  if (g.ccQ) return '콘서트 준비 중이다';
  if (g.liveT > s.t) return `${g.liveT - s.t}개월 뒤에 다시 열 수 있다`;
  if ((g.cbCount || 0) < CC_MIN.alb) return `앨범을 ${CC_MIN.alb}장 이상 내야 한다 (지금 ${g.cbCount || 0}장)`;
  if (coGFans(g) < CC_MIN.fans) return `그룹 팬이 ${fmtFans(CC_MIN.fans)}을 넘어야 한다`;
  if (g.debt > 0) return `연습생 · 제작 비용을 다 회수해야 한다 (남은 ${fmtWon(g.debt)})`;
  if (!coMk(s, 'music')) return CO_MK_NO; // v203
  if (coM(t, 'music') < ccCost(0)) return '자본금이 모자라다';
  return '';
}
// 부를 수 있는 곡: 앨범마다 타이틀곡 하나 + 수록곡 둘 (수록곡 이름은 처음 기획할 때 정해 둔다)
// 예전 세이브 · 경력 회사처럼 앨범 기록이 낸 앨범 수보다 적으면 모자란 만큼 옛 앨범을 채운다
// v197: 곡마다 컨셉 (타이틀곡은 앨범 컨셉, 수록곡은 반쯤 앨범 컨셉 · 나머지는 다른 컨셉. 처음 볼 때 정해 둔다)
function ccSongs(s, g) {
  const D = (g.disc || []).filter(a => a && a.title), need = Math.max(0, (g.cbCount || 0) - D.length);
  if ((g.ccOld || []).length < need) { g.ccOld = (g.ccOld || []).concat(Array.from({ length: need - (g.ccOld || []).length }, () => ({ title: songTitle(), q: U.int(48, 66), sc: U.int(48, 70), y: calY(s) - 3 }))); }
  const A = (g.ccOld || []).slice(0, need).concat(D), L = [];
  for (const a of A) {
    a.bs = a.bs || [songTitle(), songTitle()];
    if (!a.c) a.c = U.pick(TRENDS);
    a.bc = a.bc || a.bs.map(() => U.chance(0.55) ? a.c : U.pick(TRENDS));
    const q = a.q || 55, sc = a.sc || 55;
    L.push({ key: a.title + '|0', t: a.title, alb: a.title, tt: 1, q, sc, c: a.c });
    a.bs.forEach((b, i) => L.push({ key: a.title + '|' + (i + 1), t: b, alb: a.title, tt: 0, q: q - 4 + (i ? -2 : 0), sc: sc - 15 - i * 3, c: a.bc[i] }));
  }
  return L;
}
function ccSongBy(s, g) { const M = {}; for (const x of ccSongs(s, g)) M[x.key] = x; return M; }
function ccTalkP(x) { return lv(x, 'variety'); }
// ───── 곡 수 · 토크 · 턴 · 하이라이트 (v197) ─────
const CC_SONG_N = [10, 20];
function ccTalkN(nS) { return Math.floor(nS / 3); }
function ccTurns(nS) { return nS + ccTalkN(nS); }
function ccHlN(n) { return Math.floor(n / 5); }
// 하이라이트 자리에 어울리는 컨셉: 공연의 어디쯤인지에 따라 (여는 부분은 세게 · 앞쪽 가운데는 밝게 · 뒤쪽 가운데는 감성 · 끝은 다시 터뜨리기)
const CC_HL_FIT = [[0.25, ['강렬', '힙합', '청량']], [0.5, ['청량', '큐티', '하이틴', '레트로']], [0.78, ['몽환', '성숙', '레트로']], [1.01, ['강렬', '청량', '성숙', '힙합']]];
function ccHlFit(i, n) { const r = (i + 0.5) / Math.max(1, n); return CC_HL_FIT.find(([x]) => r < x)[1]; }
// 하이라이트 자리를 무작위로 (서로 붙지 않게). 자리마다 어울리는 컨셉도 그 자리에 맞춰 무작위로
function ccHlRoll(n) {
  const k = ccHlN(n), P = [];
  for (let guard = 0; P.length < k && guard < 500; guard++) { const i = U.int(0, n - 1); if (!P.some(p => Math.abs(p - i) < 2)) P.push(i); }
  return P.sort((a, b) => a - b).map(i => ({ i, c: U.pick(ccHlFit(i, n)) }));
}
// 턴 수가 같으면 같은 하이라이트 (뒤로 갔다 와도 바뀌지 않는다)
function ccHlFor(pl, n) { pl.hlBy = pl.hlBy || {}; if (!pl.hlBy[n]) pl.hlBy[n] = ccHlRoll(n); pl.n = n; pl.hl = pl.hlBy[n]; return pl.hl; }
// 자동으로 고르기: 타이틀곡 모두 + 완성도 높은 수록곡, 16곡까지 (10곡은 넘게)
function ccAutoPick(s, g) {
  const L = ccSongs(s, g), pick = L.filter(x => x.tt).concat(L.filter(x => !x.tt).sort((a, b) => b.q - a.q)).slice(0, Math.max(Math.min(CC_SONG_N[0], L.length), 16));
  return L.filter(x => pick.includes(x)).map(x => x.key);
}
// 자동으로 짜기: 하이라이트 자리에는 어울리는 컨셉 · 완성도 높은 곡부터, 토크는 고르게 (하이라이트 · 첫 · 끝 자리는 피해서),
//   하이라이트가 아닌 마지막 자리에는 남은 곡 중 가장 좋은 곡, 첫 자리에는 그다음 곡, 나머지는 앨범 순서대로
function ccArrange(s, g, keys, hl, n) {
  const SB = ccSongBy(s, g), S0 = keys.filter(k => SB[k]).map(k => SB[k]), T = Math.max(0, n - S0.length), H = {}, out = Array(n).fill(null);
  for (const o of hl || []) H[o.i] = o.c;
  const free = i => i >= 0 && i < n && out[i] === null && H[i] == null && i !== 0 && i !== n - 1;
  for (let j = 0; j < T; j++) {
    const p = Math.round((j + 1) * n / (T + 1)); let i = -1;
    for (let d = 0; d < n && i < 0; d++) for (const c of [p + d, p - d]) if (i < 0 && free(c)) i = c;
    if (i < 0) i = out.findIndex((x, k) => x === null && H[k] == null);
    if (i < 0) i = out.indexOf(null);
    out[i] = 't';
  }
  const rest = S0.slice();
  const take = x => { rest.splice(rest.indexOf(x), 1); return 's:' + x.key; };
  for (const o of (hl || []).slice().sort((a, b) => b.i - a.i)) { if (out[o.i] !== null || !rest.length) continue; const b = rest.slice().sort((a, c) => ((c.c === o.c) * 100 + c.q) - ((a.c === o.c) * 100 + a.q))[0]; out[o.i] = take(b); }
  const byQ = () => rest.slice().sort((a, b) => b.q - a.q);
  if (out[n - 1] === null && rest.length) out[n - 1] = take(byQ()[0]);
  if (out[0] === null && rest.length) out[0] = take(byQ()[0]);
  for (let i = 0; i < n; i++) if (out[i] === null) out[i] = rest.length ? take(rest[0]) : 't';
  return out;
}
// 예전 이름 (자동 · 시험): 고르고 짜기까지
function ccAutoSet(s, g, pl) { const keys = ccAutoPick(s, g), n = ccTurns(keys.length), hl = pl ? ccHlFor(pl, n) : ccHlRoll(n); if (pl) pl.songs = keys; return ccArrange(s, g, keys, hl, n); }
function ccAutoTalk(s, g, set) {
  const P = coP(s, g.members).sort((a, b) => ccTalkP(b) - ccTalkP(a)), T = {};
  let k = 0;
  set.forEach((c, i) => { if (c === 't') { T[i] = k === 0 || !P.length ? 'all' : P[(k - 1) % P.length].id; k++; } });
  return T;
}
// 기대 관객 수 (두 번 공연을 합친 것): 그룹 팬 수 × 팬 충성도(0이면 0.4배 · 50이면 1배 · 100이면 1.6배) × 입장료(쌀수록 많이)
function ccDemand(s, g, price, r) { return coGFans(g) * 0.05 * (0.4 + loyOf(g) / 100 * 1.2) * Math.pow(121000 / price, 1.3) * (1 + 0.15 * coMkc(s, 'music')) * (r == null ? 1 : r); }
// v203: 마케터의 예상 수요 (공연장 · 입장료 창 아래). 실제 관객은 예상 수요 × 0.85~1.15 (ccRun)
//   마케터 실력(사업)의 곡선 c가 높을수록 덜 빗나가고 (v204 맞힐 가능성: 사업 30이면 49% · 50이면 55% · 70이면 66% · 90이면 87%)(빗나감은 기획마다 한 번 정한다, 마케터가 바뀌면 다시) 범위도 좁다 → 실제가 범위 안에 들 가능성이 높다
function ccMkGuess(s, pl) {
  const x = coMk(s, 'music'); if (!x) return null;
  const c = coHHc(lv(x, 'biz'));
  if (!pl.mkG || pl.mkG.id !== x.id) pl.mkG = { id: x.id, b: U.clamp(U.normal(0, 0.35 * (1 - 0.95 * c)), -0.6, 0.8) };
  return { x, c, b: pl.mkG.b, w: 0.17 + 0.05 * (1 - c) };
}
function ccMkRange(s, g, pl, price) { const G = ccMkGuess(s, pl); if (!G) return null; const m = ccDemand(s, g, price) * (1 + G.b); return { x: G.x, lo: m * (1 - G.w), hi: m * (1 + G.w) }; }
function ccPplN(n) { n = Math.max(0, Math.round(n / 100) * 100); return n < 1e4 ? n.toLocaleString() + '명' : fmtFans(n); }
function ccRangeTx(R) { return `${ccPplN(R.lo).replace(/ ?명$/, '')}~${ccPplN(R.hi)}`; }
function ccFillTx(R, cap) { return R.lo >= cap ? '매진 예상' : `자리의 ${Math.round(Math.min(1, R.lo / cap) * 100)}~${Math.round(Math.min(1, R.hi / cap) * 100)}%`; }
function ccAutoPlan(s, t, g, mode) {
  const d0 = ccDemand(s, g, 121000), res = coFixed(s, t, 'music') * CO_AUTO_RES;
  let v = 0; CC_VENUE.forEach((V, i) => { if (V.seat * CC_SHOWS <= d0 * 1.05 && coM(t, 'music') >= ccCost(i) + res) v = i; });
  const pl = { v, mode }, set = ccAutoSet(s, g, pl), price = d0 > CC_VENUE[v].seat * CC_SHOWS * 1.6 ? 3 : 2;
  return Object.assign(pl, { set, talk: ccAutoTalk(s, g, set), p: price });
}
// 확정: 대관료 · 무대 비용을 먼저 내고 다음 달에 공연한다
function ccConfirm(s, t, g, pl) {
  const c = ccCost(pl.v); coOut(t, c, '콘서트 대관 · 무대', 'music');
  g.ccQ = true; queueEv(s, 'co_cc_res', 1, { gid: g.id, pl, cost: c, mode: pl.mode || 'me' }, true);
  return `「${g.name}」 단독 콘서트를 ${CC_VENUE[pl.v].n}에서 다음 달에 연다. (대관 · 무대 ${fmtWon(c)} · 입장료 ${fmtWon(CC_PRICE[pl.p])})`;
}
// 자동 · CEO: 창 없이 기획까지 마친다
function ccAutoRun(s, t, g, mode) { const pl = ccAutoPlan(s, t, g, mode); if (coM(t, 'music') < ccCost(pl.v)) return ''; return ccConfirm(s, t, g, pl); }

// ───── 열기 계산 (v194) ─────
// 열기 = 멤버들의 무대 실력(노래 · 랩 · 춤 레벨) 40% + 셋리스트 곡 완성도 35% + 토크 멤버의 예능 레벨 25%
// 셋리스트 짜임(곡 수 · 쉬지 않고 이어 부른 곡 · 쉬는 시간 · 같은 곡 · 첫 곡 · 마지막 곡)은 조금 더하고 빼는 정도. 관객 수 · 팬 충성도는 열기가 아니라 관객 수에 들어간다
function ccStage(x) { return Math.max(lv(x, 'vocal'), lv(x, 'rap')) * 0.5 + lv(x, 'dance') * 0.5; }
function ccRun(s, t, g, pl) {
  const P = coP(s, g.members), SB = ccSongBy(s, g), V = CC_VENUE[pl.v] || CC_VENUE[0], price = CC_PRICE[pl.p] || 121000;
  const perf = P.reduce((a, x) => a + ccStage(x), 0) / Math.max(1, P.length);
  const cap = V.seat * CC_SHOWS, sold = Math.round(Math.min(cap, ccDemand(s, g, price, U.fl(0.85, 1.15)))), fill = sold / cap;
  const set = (pl.set || []).filter(c => c === 't' || c === 'v' || (c.startsWith('s:') && SB[c.slice(2)]));
  const songs = set.filter(c => c.startsWith('s:')).map(c => SB[c.slice(2)]), nS = songs.length, nT = set.filter(c => c === 't').length, nV = set.filter(c => c === 'v').length, nB = nT + nV;
  const N = [], B = [];
  if (fill >= 0.995) N.push('표가 다 팔렸다.'); else if (fill < 0.6) N.push('빈자리가 많았다.');
  // 1. 무대 실력
  if (perf >= 72) N.push('라이브와 춤이 압도적이었다.'); else if (perf < 40) N.push('라이브가 자주 흔들렸다.');
  // 2. 곡 완성도. v197: 하이라이트 자리의 곡은 네 배 무게, 그 자리에 어울리는 컨셉이면 +15 · 아니면 -10. 하이라이트에 토크가 들어가면 흐름이 끊긴다
  const HL = {}; for (const o of pl.hl || []) HL[o.i] = o.c;
  let qs = 0, qw = 0, hlTalk = 0; const hlGood = [], hlBad = [];
  set.forEach((c, i) => {
    if (c === 't' && HL[i] != null) hlTalk++;
    if (!c.startsWith('s:')) return;
    const x = SB[c.slice(2)]; let v = x.q, w = 1;
    if (HL[i] != null) { w = 4; if (x.c === HL[i]) { v += 15; hlGood.push(x); } else { v -= 10; hlBad.push(x); } }
    qs += v * w; qw += w;
  });
  const songQ = qw ? qs / qw : 30;
  if (songQ >= 75) N.push('완성도 높은 곡들로 꽉 채웠다.'); else if (songQ < 50) N.push('완성도가 아쉬운 곡이 많았다.');
  if (hlGood.length) N.push(`하이라이트 ${hlGood.map(x => `「${x.t}」`).join(' · ')}에서 객석이 폭발했다.`);
  if (hlBad.length) N.push(`하이라이트 ${hlBad.map(x => `「${x.t}」`).join(' · ')} 무대는 그 순간의 분위기와 맞지 않았다.`);
  // 3. 토크: 말하는 멤버의 예능 레벨. 모두 함께면 멤버 평균에 조금 더. 같은 사람이 여러 번 하면 덜 새롭다. 토크가 없으면 낮게 본다
  const used = {}, TK = {}, avgV = P.reduce((a, y) => a + lv(y, 'variety'), 0) / Math.max(1, P.length);
  let talkSum = 0;
  set.forEach((c, i) => {
    if (c !== 't') return;
    const w = (pl.talk || {})[i], x = w && w !== 'all' ? s.people[w] : null, mine = x && P.includes(x);
    const k = mine ? x.id : 'all'; let tq = mine ? lv(x, 'variety') : avgV + 5;
    if (used[k]) tq -= 8 * used[k]; used[k] = (used[k] || 0) + 1;
    tq = U.clamp(tq, 0, 100); talkSum += tq;
    TK[i] = { who: mine ? coSN(x) : '멤버 모두', v: U.clamp((tq - 45) / 25, -1, 1), n: mine ? x.name : '', tq };
  });
  const talkQ = nT ? talkSum / nT : 30;
  const tb = Object.values(TK).filter(o => o.n).sort((a, b) => b.tq - a.tq);
  if (tb.length && tb[0].tq >= 65) N.push(`${tb[0].n}의 토크가 큰 웃음을 줬다.`);
  if (tb.length && tb[tb.length - 1].tq < 35) N.push(`${tb[tb.length - 1].n}의 토크는 조금 어색했다.`);
  let h = perf * 0.4 + songQ * 0.35 + talkQ * 0.25;
  // 셋리스트 짜임 (조금만). v197: 곡 수 · 토크 수는 정해져 있어 '곡이 적다 · 쉬는 시간' 규칙은 뺐다 (예전 기획만 곡 수를 본다)
  if (!pl.hl) { if (nS < 8) { h -= (8 - nS) * 2; N.push('곡이 적어 금방 끝난 느낌이었다.'); } else if (nS > 20) { h -= (nS - 20) * 1.2; N.push('공연이 너무 길었다.'); } }
  if (hlTalk) { h -= hlTalk * 4; N.push('하이라이트 자리에 토크가 들어가 흐름이 끊겼다.'); }
  const seen = {}; let dup = 0; for (const x of songs) { if (seen[x.key]) dup++; seen[x.key] = 1; }
  if (dup) { h -= dup * 4; N.push('같은 곡을 두 번 불렀다.'); }
  const rank = songs.slice().sort((a, b) => b.q - a.q), lastS = songs[nS - 1];
  if (set[0] && !set[0].startsWith('s:')) { h -= 2; N.push('시작부터 쉬어 가서 분위기가 늦게 올라왔다.'); } else if (songs[0] && rank.indexOf(songs[0]) <= 2) { h += 2; N.push('첫 곡부터 객석이 뜨거웠다.'); }
  if (lastS && nS >= 3 && rank.indexOf(lastS) <= 1) { h += 3; N.push('마지막 곡에서 떼창이 터졌다.'); }
  let run = 0, maxRun = 0, tired = 0; const tiredAt = {};
  set.forEach((c, i) => { if (c.startsWith('s:')) { run++; if (run > 5) { tired++; tiredAt[i] = 1; } maxRun = Math.max(maxRun, run); } else run = 0; });
  if (tired) { h -= tired * 1.5; N.push(`쉬지 않고 ${maxRun}곡을 이어 불러 멤버들이 지쳤다.`); }
  h = Math.round(U.clamp(h + U.normal(0, 3), 0, 100));
  // 무대 장면 (live.js liveConcert): 곡 · 토크 · VCR마다 반응 세기 (-1~1). 곡은 그 곡의 완성도와 무대 실력으로
  let no = 0;
  set.forEach((c, i) => {
    if (c === 't') B.push({ k: 't', who: TK[i].who, h: Math.round(TK[i].v * 100) / 100 });
    else if (c === 'v') B.push({ k: 'v', h: Math.round(((h - 60) / 30) * 100) / 100 });
    else { const x = SB[c.slice(2)], hl = HL[i] != null ? (x.c === HL[i] ? 2 : 1) : 0; no++; B.push({ k: 's', no, t: x.t, tt: x.tt, hl, h: Math.round(U.clamp((x.q * 0.5 + perf * 0.5 - 58) / 18 - (tiredAt[i] ? 0.6 : 0) + (hl === 2 ? 0.4 : hl === 1 ? -0.3 : 0), -1, 1) * 100) / 100, tired: tiredAt[i] ? 1 : 0, first: no === 1 ? 1 : 0, last: x === lastS && no === nS ? 1 : 0 }); }
  });
  return { heat: h, sold, cap, fill, price, perf, songQ, talkQ, nS, nT, nV, hlN: (pl.hl || []).length, hlGood: hlGood.length, notes: N, blocks: B };
}
function ccHeatW(h) { return h >= 85 ? '공연장이 터질 듯했다' : h >= 70 ? '분위기가 뜨거웠다' : h >= 55 ? '무난하게 즐겼다' : h >= 40 ? '분위기가 조금 가라앉았다' : '객석이 식어 버렸다'; }

// ───── 창: 1. 공연장 ─────
function ccPlanD(s, d) { const g = coGroup(s, d.gid); return { g, t: coT(s), pl: d.pl || (d.pl = {}) }; }
function ccBack(id) { return (s, d) => [{ t: '← 뒤로', back: true, f: s => { fireEvent(s, id, { gid: d.gid, pl: d.pl }); return ''; } }]; }
E({
  id: 'co_cc_venue', cat: '단독 콘서트', tag: 'career',
  title: (s, d) => `「${(coGroup(s, d.gid) || {}).name || ''}」 단독 콘서트 · 공연장`,
  cond: s => coOn(s),
  init(s, d) { const g = coGroup(s, d.gid); if (!g) { d.skip = true; return; } d.pl = d.pl || {}; },
  text: (s, d) => { const { g, t } = ccPlanD(s, d); return `어디를 빌릴까. 공연은 이틀 동안 두 번 한다.\n\n그룹 팬 ${fmtFans(coGFans(g))} · 팬 충성도 ${loyTxt(g)} · 낸 앨범 ${g.cbCount || 0}장\n자본금 ${fmtWon(coM(t, 'music'))}`; },
  form: (s, d) => { const { t, pl } = ccPlanD(s, d), on = pl.v != null ? pl.v : 1; return [{ type: 'head', label: '공연장 (대관료 + 무대 · 연출비는 기획을 마칠 때 낸다)' }].concat(CC_VENUE.map((V, i) => ({ k: 'v', type: 'radio', v: String(i), on: i === on, label: `${V.n} · ${V.seat.toLocaleString()}석 × ${CC_SHOWS}회`, sub: `대관 ${fmtWon(V.rent)} · 무대 · 연출 ${fmtWon(V.stage)}${coM(t, 'music') < ccCost(i) ? ' · 자본금이 모자라다' : ''}` }))); },
  // v203: 아래에 마케터가 내다본 전체 수요 (보통 입장료 기준)
  sum: (s, d, v) => { const { g, pl } = ccPlanD(s, d), V = CC_VENUE[U.clamp(parseInt(v.v, 10) || 0, 0, CC_VENUE.length - 1)], cap = V.seat * CC_SHOWS, R = ccMkRange(s, g, pl, CC_PRICE[2]); return R ? `📈 마케터 ${R.x.name}의 예상 수요: 보통 입장료(${fmtWon(CC_PRICE[2])})면 이틀 동안 ${ccRangeTx(R)} · ${V.n} ${cap.toLocaleString()}석이면 ${ccFillTx(R, cap)}` : '📈 마케터가 없어 수요를 내다볼 수 없다'; },
  submitT: () => '다음 · 부를 곡',
  fbtn: (s, d) => { const g = coGroup(s, d.gid), GP = g && coGProd(s, g); return GP ? [{ t: `전담 프로듀서 ${GP.name}에게 맡기기`, h: '공연장부터 입장료까지 알아서 정한다 · 공연 장면은 안 본다', f: s => { const t = coT(s), pl = ccAutoPlan(s, t, g, 'prod'); if (coM(t, 'music') < ccCost(pl.v)) return '자본금이 모자라 맡기지 못했다.'; return ccConfirm(s, t, g, pl) + ` 전담 프로듀서 ${josa(GP.name, '이가')} 셋리스트를 짰다.`; } }] : []; },
  cancel: () => '', cancelT: () => '그만두기',
  submit(s, d, v) {
    const { g, t, pl } = ccPlanD(s, d), i = U.clamp(parseInt(v.v, 10) || 0, 0, CC_VENUE.length - 1);
    if (coM(t, 'music') < ccCost(i)) return { err: '자본금이 모자라다' };
    pl.v = i; if (!pl.songs) pl.songs = []; // v203: 부를 곡은 처음부터 고른다 (미리 골라 두지 않는다)
    fireEvent(s, 'co_cc_songs', { gid: d.gid, pl }); return {};
  },
});
// ───── 2. 부를 곡 (v197): 10~20곡을 고른다. 토크 수 · 턴 수 · 하이라이트 수가 여기서 정해진다 ─────
function ccQW(s, q) { return grade5(coViewer(s, 'anr', 'compose', 'music'), q, 'q', 'compose'); }
function ccCntTx(nS) { const T = ccTalkN(nS), n = nS + T; return `곡 ${nS} · 토크 ${T} · 턴 ${n} · 하이라이트 ${ccHlN(n)}번`; }
E({
  id: 'co_cc_songs', cat: '단독 콘서트', tag: 'career', wide: true,
  title: (s, d) => `「${(coGroup(s, d.gid) || {}).name || ''}」 단독 콘서트 · 부를 곡`,
  cond: s => coOn(s),
  init(s, d) { const g = coGroup(s, d.gid); if (!g || !d.pl) { d.skip = true; return; } if (!d.pl.songs) d.pl.songs = []; },
  text: (s, d) => `${CC_VENUE[d.pl.v].n}. 이번 콘서트에서 부를 곡을 ${CC_SONG_N[0]}~${CC_SONG_N[1]}곡 고른다.`,
  tbl: (s, d) => { const g = coGroup(s, d.gid), L = ccSongs(s, g), on = new Set(d.pl.songs || []); return { cols: [['t', '곡'], ['tt', '구분'], ['alb', '앨범'], ['c', '컨셉'], ['q', '완성도']], rows: L.map((x, i) => ({ k: 'c' + i, on: on.has(x.key), cells: { t: [x.t, `「${x.t}」`], tt: [x.tt, x.tt ? '타이틀곡' : '수록곡'], alb: [i, `「${x.alb}」`], c: [x.c, x.c], q: [x.q, ccQW(s, x.q)] } })), sort: ['alb', 1], cnt: { n: '고른 곡', u: '곡', min: CC_SONG_N[0], max: CC_SONG_N[1] }, clear: true }; },
  form: (s, d) => { const g = coGroup(s, d.gid), on = new Set(d.pl.songs || []); return ccSongs(s, g).map((x, i) => ({ k: 'c' + i, type: 'check', on: on.has(x.key), label: x.t })); },
  sum: (s, d, v) => { const nS = Object.keys(v).filter(k => /^c\d+$/.test(k) && v[k]).length; return ccCntTx(nS) + (nS < CC_SONG_N[0] ? ` · ${CC_SONG_N[0] - nS}곡 더 골라야 한다` : nS > CC_SONG_N[1] ? ` · ${nS - CC_SONG_N[1]}곡 빼야 한다` : ''); },
  submitT: () => '다음 · 순서',
  fbtn: (s, d) => ccBack('co_cc_venue')(s, d).concat([{ t: '자동으로 고르기', h: '타이틀곡 모두 + 완성도 높은 수록곡', f: s => { d.pl.songs = ccAutoPick(s, coGroup(s, d.gid)); fireEvent(s, 'co_cc_songs', { gid: d.gid, pl: d.pl }); return ''; } }]),
  cancel: () => '', cancelT: () => '그만두기',
  submit(s, d, v) {
    const { g, pl } = ccPlanD(s, d), L = ccSongs(s, g), keys = L.filter((x, i) => v['c' + i]).map(x => x.key);
    if (keys.length < CC_SONG_N[0] || keys.length > CC_SONG_N[1]) return { err: `곡은 ${CC_SONG_N[0]}~${CC_SONG_N[1]}곡 골라야 한다 (지금 ${keys.length}곡)` };
    const n = ccTurns(keys.length), same = pl.set && pl.n === n && (pl.songs || []).length === keys.length && keys.every(k => pl.set.includes('s:' + k));
    pl.songs = keys; const hl = ccHlFor(pl, n);
    if (!same) { pl.set = ccArrange(s, g, keys, hl, n); pl.talk = null; }
    fireEvent(s, 'co_cc_set', { gid: d.gid, pl }); return {};
  },
});
// ───── 3. 순서: 턴마다 곡 · 토크를 ↑ ↓로 옮긴다. 하이라이트 자리(★)는 그대로 있고, 그 자리에 무엇을 둘지 정한다 ─────
function ccItemTx(s, SB, c) { if (c === 't') return ['💬', '토크', '']; if (c === 'v') return ['🎬', 'VCR · 쉬는 시간', '']; const x = SB[c.slice(2)]; return x ? ['🎵', `「${x.t}」`, `${x.tt ? '타이틀곡' : '수록곡'} · 「${x.alb}」 · 컨셉 '${x.c}' · 완성도 ${ccQW(s, x.q)}`] : ['?', '', '']; }
function ccHLm(hl) { const H = {}; for (const o of hl || []) H[o.i] = o.c; return H; }
function ccSum(SB, set, hl) {
  const nS = set.filter(c => c.startsWith('s:')).length, nT = set.filter(c => c === 't').length, H = ccHLm(hl);
  let run = 0, mx = 0; for (const c of set) { if (c.startsWith('s:')) { run++; mx = Math.max(mx, run); } else run = 0; }
  const ok = (hl || []).filter(o => { const c = set[o.i], x = c && c.startsWith('s:') && SB[c.slice(2)]; return x && x.c === H[o.i]; }).length;
  return `곡 ${nS} · 토크 ${nT} · 약 ${nS * 4 + nT * 6 + 10}분 · 하이라이트에 어울리는 곡 ${ok}/${(hl || []).length}${mx >= 6 ? ` · 쉬지 않고 ${mx}곡이 이어진다` : ''}`;
}
// v198: 토크는 ★ 하이라이트 자리에 둘 수 없다. ↑ ↓는 바로 옆과 바꾸고, 그러면 토크가 하이라이트 자리에 가게 되는 버튼은 막는다
function ccSwapOK(set, H, i, j) { return j >= 0 && j < set.length && !(set[i] === 't' && H[j] != null) && !(set[j] === 't' && H[i] != null); }
function ccTalkOnHl(set, hl) { const H = ccHLm(hl); return set.some((c, i) => c === 't' && H[i] != null); }
// 끌어서 옮기기 (v198): 곡을 끌면 곡끼리 순서만 바뀌고 토크 자리는 그대로, 토크를 끌면 그 자리로 가고 곡들이 순서대로 빈자리를 채운다
//   토크를 하이라이트 자리에 놓으면 null (안 된다)
function ccMove(set, hl, a, b) {
  const H = ccHLm(hl), c = set[a], n = set.length;
  if (a === b || b < 0 || b >= n) return set.slice();
  if (c === 't') {
    if (H[b] != null) return null;
    if (set[b] === 't') return set.slice();
    const T = new Set(set.map((x, i) => x === 't' ? i : -1).filter(i => i >= 0)), songs = set.filter(x => x !== 't'), out = [];
    T.delete(a); T.add(b);
    let k = 0; for (let i = 0; i < n; i++) out.push(T.has(i) ? 't' : songs[k++]);
    return out;
  }
  const P = set.map((x, i) => x !== 't' ? i : -1).filter(i => i >= 0), songs = P.map(i => set[i]).filter(x => x !== c);
  songs.splice(P.filter(i => i !== a && (a < b ? i <= b : i < b)).length, 0, c);
  const out = set.slice(); P.forEach((i, j) => { out[i] = songs[j]; });
  return out;
}
function ccListHTML(s, SB, set, hl, dragI) {
  const H = ccHLm(hl);
  return set.map((c, i) => {
    const [ic, tx, sub] = ccItemTx(s, SB, c), x = c.startsWith('s:') && SB[c.slice(2)], hc = H[i], fit = hc != null && x && x.c === hc;
    const hb = hc != null ? `<span class="cc-hlb${fit ? ' ok' : c === 't' ? ' no' : ''}">★ 하이라이트 · 어울리는 컨셉 '${U.esc(hc)}'${fit ? ' ✓' : c === 't' ? ' · 토크는 둘 수 없다' : ''}</span>` : '';
    return `<li class="cc-it k-${c[0]}${hc != null ? ' hl' : ''}${dragI === i ? ' drag' : ''}" data-i="${i}"><span class="cc-drag" title="끌어서 옮기기" aria-label="끌어서 옮기기">⠿</span><span class="cc-ix">${i + 1}</span><span class="cc-tx">${hb}${ic} ${U.esc(tx)}${sub ? `<small>${U.esc(sub)}</small>` : ''}</span><span class="cc-bt"><button class="btn sm" data-ccmv="${i}:-1" ${ccSwapOK(set, H, i, i - 1) ? '' : 'disabled'} aria-label="위로">↑</button><button class="btn sm" data-ccmv="${i}:1" ${ccSwapOK(set, H, i, i + 1) ? '' : 'disabled'} aria-label="아래로">↓</button></span></li>`;
  }).join('');
}
function ccHlInfoHTML(SB, set, hl) {
  const H = ccHLm(hl);
  return (hl || []).length ? (hl || []).map(o => { const c = set[o.i], x = c && c.startsWith('s:') && SB[c.slice(2)], fit = x && x.c === H[o.i]; return `<div class="cc-hli${fit ? ' ok' : ''}"><b>★ ${o.i + 1}번째</b> · 어울리는 컨셉 '${U.esc(o.c)}'<small>지금: ${x ? `「${U.esc(x.t)}」 ('${U.esc(x.c)}')${fit ? ' ✓' : ''}` : c === 't' ? '토크' : '-'}</small></div>`; }).join('') : '<div class="cc-hli">이번 공연에는 하이라이트가 없다.</div>';
}
// 끌어서 옮기기 (v198): ⠿를 누른 채 위아래로 움직이면 놓을 자리를 미리 보여 주고, 놓으면 그 순서가 된다 (마우스 · 손가락 둘 다)
//   놓을 자리는 처음 줄 위치로 센다 (미리 보기로 줄 높이가 바뀌어도 흔들리지 않게). 목록 끝 가까이 가면 저절로 스크롤
function ccDragInit(list, pl, preview, done) {
  if (!list) return;
  let D = null;
  const scrollBox = () => { let el = list; while (el && el !== document.body) { const o = getComputedStyle(el).overflowY; if (/auto|scroll/.test(o) && el.scrollHeight > el.clientHeight + 1) return el; el = el.parentElement; } return null; };
  const at = y => { const yy = y - list.getBoundingClientRect().top + list.scrollTop; for (let i = 0; i < D.R.length; i++) { const [t0, h] = D.R[i]; if (yy < t0 + h) return i; } return D.R.length - 1; };
  const show = () => { const b = at(D.y); if (b === D.b) return; D.b = b; D.res = ccMove(D.set0, pl.hl, D.a, b); const set = D.res || D.set0, di = D.res ? set.findIndex((c, i) => c === D.set0[D.a] && (D.set0[D.a] !== 't' || i === b)) : D.a; preview(set, di); list.querySelectorAll('.cc-it').forEach(li => li.classList.toggle('bad', !D.res && +li.dataset.i === b)); };
  const tick = () => { if (!D) return; const sc = D.sc; if (sc) { const r = sc.getBoundingClientRect(), top = Math.max(r.top, 0), bot = Math.min(r.bottom, window.innerHeight); let v = 0; if (D.y < top + 44) v = -Math.ceil((top + 44 - D.y) / 4); else if (D.y > bot - 44) v = Math.ceil((D.y - (bot - 44)) / 4); if (v) { sc.scrollTop += v; show(); } } D.raf = requestAnimationFrame(tick); };
  const move = e => { if (!D || e.pointerId !== D.id) return; e.preventDefault(); D.y = e.clientY; show(); };
  const end = e => {
    if (!D || e.pointerId !== D.id) return;
    cancelAnimationFrame(D.raf); document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end);
    const R = e.type === 'pointerup' ? D.res : null, bad = e.type === 'pointerup' && !D.res && D.b !== D.a; D = null; list.classList.remove('dragging');
    if (R) pl.set = R;
    done();
    if (bad && typeof toast === 'function') toast('토크는 ★ 하이라이트 자리에 둘 수 없어요');
  };
  list.addEventListener('pointerdown', e => {
    const hd = e.target.closest('.cc-drag'), li = hd && hd.closest('.cc-it'); if (!li || D || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    const lt = list.getBoundingClientRect().top, a = +li.dataset.i;
    D = { id: e.pointerId, a, b: a, y: e.clientY, set0: pl.set.slice(), res: pl.set.slice(), sc: scrollBox(), R: [...list.querySelectorAll('.cc-it')].map(x => { const r = x.getBoundingClientRect(); return [r.top - lt + list.scrollTop, r.height]; }) };
    list.classList.add('dragging'); preview(D.set0, a);
    document.addEventListener('pointermove', move, { passive: false }); document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
    D.raf = requestAnimationFrame(tick);
  });
}
E({
  id: 'co_cc_set', cat: '단독 콘서트', tag: 'career', wide: true,
  title: (s, d) => `「${(coGroup(s, d.gid) || {}).name || ''}」 단독 콘서트 · 셋리스트 순서`,
  cond: s => coOn(s),
  init(s, d) { const g = coGroup(s, d.gid); if (!g || !d.pl) { d.skip = true; return; } const pl = d.pl; if (!pl.songs) pl.songs = ccAutoPick(s, g); const n = ccTurns(pl.songs.length); ccHlFor(pl, n); if (!pl.set || pl.set.length !== n || pl.set.includes('v') || ccTalkOnHl(pl.set, pl.hl)) pl.set = ccArrange(s, g, pl.songs, pl.hl, n); },
  text: (s, d) => `${CC_VENUE[d.pl.v].n} · ${ccCntTx(d.pl.songs.length)}.\n\n⠿를 끌어서 놓거나 ↑ ↓로 곡과 토크의 순서를 바꾼다. 곡을 끌면 곡끼리 순서만 바뀌고, 토크를 끌면 그 자리로 간다. ★ 하이라이트 자리는 움직이지 않고, 토크는 그 자리에 둘 수 없다. 하이라이트에 든 곡의 완성도와 컨셉은 다른 곡보다 열기에 더 크게 영향을 준다. 쉬지 않고 6곡 넘게 이어지면 멤버들이 지친다.`,
  html: (s, d) => { const { pl } = ccPlanD(s, d), SB = ccSongBy(s, coGroup(s, d.gid)); return `<div class="cc-ed"><div class="cc-col"><div class="ck-head">셋리스트 <span class="cc-tools"><button class="btn sm" data-ccauto>자동으로 짜기</button></span></div><ol class="cc-list" id="cc-list">${ccListHTML(s, SB, pl.set, pl.hl)}</ol><div class="cc-sum" id="cc-sum">${U.esc(ccSum(SB, pl.set, pl.hl))}</div></div><div class="cc-col"><div class="ck-head">하이라이트 ${(pl.hl || []).length}번</div><div class="cc-hls" id="cc-hls">${ccHlInfoHTML(SB, pl.set, pl.hl)}</div></div><input type="hidden" data-k="set" id="cc-set" value="${U.esc(JSON.stringify(pl.set))}"></div>`; },
  form: () => [],
  onShow(s, d, card) {
    const ed = card.querySelector('.cc-ed'); if (!ed) return;
    const g = coGroup(s, d.gid), SB = ccSongBy(s, g), pl = d.pl;
    const draw = () => { ed.querySelector('#cc-list').innerHTML = ccListHTML(s, SB, pl.set, pl.hl); ed.querySelector('#cc-hls').innerHTML = ccHlInfoHTML(SB, pl.set, pl.hl); ed.querySelector('#cc-sum').textContent = ccSum(SB, pl.set, pl.hl); ed.querySelector('#cc-set').value = JSON.stringify(pl.set); };
    ed.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || !ed.contains(b) || b.disabled) return;
      e.preventDefault(); e.stopPropagation();
      if (b.dataset.ccmv != null) { const [i, dv] = b.dataset.ccmv.split(':').map(Number), j = i + dv; if (ccSwapOK(pl.set, ccHLm(pl.hl), i, j)) [pl.set[i], pl.set[j]] = [pl.set[j], pl.set[i]]; }
      else if (b.dataset.ccauto != null) pl.set = ccArrange(s, g, pl.songs, pl.hl, pl.set.length);
      else return;
      draw();
    });
    ccDragInit(ed.querySelector('#cc-list'), pl, (set, di) => { ed.querySelector('#cc-list').innerHTML = ccListHTML(s, SB, set, pl.hl, di); }, draw);
  },
  submitT: () => '다음 · 토크',
  fbtn: ccBack('co_cc_songs'),
  cancel: () => '', cancelT: () => '그만두기',
  submit(s, d, v) {
    const { g, pl } = ccPlanD(s, d), SB = ccSongBy(s, g);
    let set = pl.set; try { const x = JSON.parse(v.set || 'null'); if (Array.isArray(x)) set = x; } catch (e) { }
    if (ccTalkOnHl(set, pl.hl)) return { err: '토크는 ★ 하이라이트 자리에 둘 수 없어요' };
    // 고른 곡과 토크가 그대로 다 있어야 한다 (순서만 바뀐다)
    const want = pl.songs.map(k => 's:' + k).concat(Array(ccTalkN(pl.songs.length)).fill('t')).sort(), got = set.filter(c => typeof c === 'string').slice().sort();
    if (want.join('\n') !== got.join('\n')) set = ccArrange(s, g, pl.songs, pl.hl, ccTurns(pl.songs.length));
    pl.set = set; const old = pl.talk || {}; pl.talk = {}; const auto = ccAutoTalk(s, g, set);
    set.forEach((c, i) => { if (c === 't') pl.talk[i] = old[i] && (old[i] === 'all' || g.members.includes(old[i])) ? old[i] : auto[i]; });
    fireEvent(s, set.includes('t') ? 'co_cc_talk' : 'co_cc_price', { gid: d.gid, pl }); return {};
  },
});
// ───── 3. 토크: 토크마다 누가 말할까 ─────
E({
  id: 'co_cc_talk', cat: '단독 콘서트', tag: 'career',
  title: (s, d) => `「${(coGroup(s, d.gid) || {}).name || ''}」 단독 콘서트 · 토크`,
  cond: s => coOn(s),
  init(s, d) { if (!coGroup(s, d.gid) || !d.pl) d.skip = true; },
  text: () => '토크 시간마다 누가 이야기를 이끌지 정한다. 예능 레벨이 높을수록 객석이 즐거워한다. 모두 함께면 멤버들 평균보다 조금 낫다.',
  form: (s, d) => {
    const { g, pl } = ccPlanD(s, d), SB = ccSongBy(s, g), P = coP(s, g.members), F = [];
    let k = 0;
    pl.set.forEach((c, i) => {
      if (c !== 't') return; k++;
      const prev = pl.set.slice(0, i).reverse().find(x => x.startsWith('s:')), pv = prev && SB[prev.slice(2)];
      F.push({ type: 'head', label: `💬 토크 ${k}${pv ? ` (「${pv.t}」 다음)` : ' (맨 처음)'}` });
      F.push({ k: 't' + i, type: 'radio', v: 'all', on: pl.talk[i] === 'all', label: '멤버 모두 함께' });
      for (const x of P) F.push({ k: 't' + i, type: 'radio', v: x.id, on: pl.talk[i] === x.id, label: coSNLabel(x), sub: `예능 ${lvi(x, 'variety')}` });
    });
    return F;
  },
  submitT: () => '다음 · 입장료',
  fbtn: ccBack('co_cc_set'),
  cancel: () => '', cancelT: () => '그만두기',
  submit(s, d, v) { const { g, pl } = ccPlanD(s, d); pl.set.forEach((c, i) => { if (c === 't' && v['t' + i]) pl.talk[i] = v['t' + i] === 'all' || g.members.includes(v['t' + i]) ? v['t' + i] : pl.talk[i]; }); fireEvent(s, 'co_cc_price', { gid: d.gid, pl }); return {}; },
});
// ───── 4. 입장료 ─────
E({
  id: 'co_cc_price', cat: '단독 콘서트', tag: 'career', ledA: () => '단독 콘서트 준비 (대관 · 무대)',
  title: (s, d) => `「${(coGroup(s, d.gid) || {}).name || ''}」 단독 콘서트 · 입장료`,
  cond: s => coOn(s),
  init(s, d) { if (!coGroup(s, d.gid) || !d.pl) d.skip = true; },
  text: (s, d) => { const { g, t, pl } = ccPlanD(s, d), V = CC_VENUE[pl.v]; return `${V.n} · ${(V.seat * CC_SHOWS).toLocaleString()}석 (${V.seat.toLocaleString()}석 × ${CC_SHOWS}회)\n그룹 팬 ${fmtFans(coGFans(g))} · 팬 충성도 ${loyTxt(g)}\n\n그룹 팬이 많고 팬 충성도가 높을수록, 입장료가 쌀수록 표가 잘 팔린다. 예매 수수료 ${Math.round(CC_FEE * 100)}%는 뗀다.\n대관 · 무대 ${fmtWon(ccCost(pl.v))} · 자본금 ${fmtWon(coM(t, 'music'))}`; },
  // v203: 입장료마다 마케터가 내다본 예상 관객 (입장료가 쌀수록 많다)
  form: (s, d) => { const { g, pl } = ccPlanD(s, d), on = pl.p != null ? pl.p : 2, cap = CC_VENUE[pl.v].seat * CC_SHOWS; return [{ type: 'head', label: '입장료' }].concat(CC_PRICE.map((p, i) => { const R = ccMkRange(s, g, pl, p); return { k: 'p', type: 'radio', v: String(i), on: i === on, label: fmtWon(p), sub: R ? `예상 관객 ${ccRangeTx(R)} · ${ccFillTx(R, cap)}` : '' }; })); },
  sum: (s, d, v) => { const { g, pl } = ccPlanD(s, d), V = CC_VENUE[pl.v], cap = V.seat * CC_SHOWS, p = CC_PRICE[parseInt(v.p, 10)] || CC_PRICE[2], R = ccMkRange(s, g, pl, p), tk = n => fmtWon(Math.round(Math.min(cap, n) * p * (1 - CC_FEE))); return `만석이면 티켓 매출 ${fmtWon(Math.round(cap * p * (1 - CC_FEE)))}` + (R ? ` · 📈 마케터 ${R.x.name}의 예상: 관객 ${ccRangeTx(R)} · 티켓 매출 ${R.lo >= cap ? `${tk(cap)} (매진)` : `${tk(R.lo)}~${tk(R.hi)}`}` : ' · 📈 마케터가 없어 수요를 내다볼 수 없다'); },
  submitT: () => '공연 확정',
  fbtn: (s, d) => ccBack(d.pl && d.pl.set && d.pl.set.includes('t') ? 'co_cc_talk' : 'co_cc_set')(s, d),
  cancel: () => '', cancelT: () => '그만두기',
  submit(s, d, v) {
    const { g, t, pl } = ccPlanD(s, d); pl.p = U.clamp(parseInt(v.p, 10) || 0, 0, CC_PRICE.length - 1); pl.mode = 'me';
    if (coM(t, 'music') < ccCost(pl.v)) return { err: '자본금이 모자라다' };
    return { log: ccConfirm(s, t, g, pl) };
  },
});
// ───── 공연 · 결산 ─────
function ccRows(r) { return [[`티켓 (${r.sold.toLocaleString()}석 × ${fmtWon(r.price)})`, Math.round(r.ticket)], [`예매 수수료 (${Math.round(CC_FEE * 100)}%)`, -Math.round(r.fee)], ['현장 굿즈', Math.round(r.goods)], ['대관 · 무대 · 연출', -Math.round(r.cost)], [`멤버 몫`, -Math.round(r.pay)], '-', [r.net >= 0 ? '회사에 남는 돈' : '손해', Math.round(r.net), 1]]; }
E({
  id: 'co_cc_res', cat: '단독 콘서트', tag: 'career', keepPop: true, wide: true, ledA: (s, d) => `단독 콘서트 · ${(CC_VENUE[d.pl && d.pl.v] || CC_VENUE[0]).n}`,
  title: (s, d) => `「${(coGroup(s, d.gid) || {}).name || d.gn || ''}」 단독 콘서트 결산`,
  cond: s => coOn(s),
  live: (s, d) => d.mode === 'me' ? d.sp : null,
  init(s, d) {
    const t = coT(s), g = coGroup(s, d.gid);
    if (!g) { if (d.cost) coIn(t, d.cost, '콘서트 취소 환불', 'music'); d.skip = true; return; }
    d.gn = g.name; g.ccQ = false; g.liveT = s.t + 12; g.cons = (g.cons || 0) + 1;
    const R = d.r = ccRun(s, t, g, d.pl), V = CC_VENUE[d.pl.v];
    R.ticket = R.sold * R.price; R.fee = R.ticket * CC_FEE; R.goods = R.sold * U.fl(2.5, 4.5) * 1e4 * (0.7 + R.heat / 100 * 0.6); R.cost = d.cost || ccCost(d.pl.v);
    const rev = Math.round(R.ticket - R.fee + R.goods);
    coIn(t, rev, '콘서트', 'music'); R.pay = coSettle(s, t, g, rev); R.net = rev - R.pay - R.cost;
    const h = R.heat; R.f0 = coGFans(g);
    if (h >= 70) { R.ly = loyAdd(g, Math.min(12, (h - 60) / 2.5)); const up = 1 + (h >= 85 ? U.fl(0.03, 0.06) : U.fl(0.01, 0.03)); MK.forEach(m => { g.f[m] = Math.round(g.f[m] * up); }); R.repD = h >= 85 ? 2 : 1; }
    else if (h < 45) { const dn = Math.min(0.12, 0.01 + (45 - h) / 300); MK.forEach(m => { g.f[m] = Math.round(g.f[m] * (1 - dn)); }); R.repD = -1; }
    else R.repD = 0.3;
    coVRepF(t, 'music', R.repD); R.fd = coGFans(g) - R.f0;
    if (!t.gcon) { t.gcon = true; milestone(s, `${age(s)}세에 우리 회사 「${g.name}」 첫 단독 콘서트를 ${V.n}에서 열었다.`); }
    if (d.mode === 'me' && typeof liveStage === 'function') {
      const P = coP(s, g.members);
      d.sp = liveStage({ k: 'idol', place: `단독 콘서트 · ${V.n}`, t: '', g: g.name, fd: g.fandom, c: g.sig || ((g.disc || []).slice(-1)[0] || {}).c, sx: liveSx(P), mem: P.map(x => [coSN(x), (g.pos[x.id] || '').split(' · ')[0]]), mi: -1,
        z: { fans: (Math.log10(1 + coGFans(g)) - 4) / 1.2, perf: (R.perf - 45) / 18 }, sc: h, key: true });
      d.sp.cc = { venue: V.n, fill: Math.round(R.fill * 100) / 100, B: R.blocks };
    }
  },
  text: (s, d) => { const r = d.r; return `${CC_VENUE[d.pl.v].n} · ${r.sold.toLocaleString()}석 (${Math.round(r.fill * 100)}%)\n열기 ${r.heat} · ${ccHeatW(r.heat)}\n\n${r.notes.join(' ')}`; },
  html: (s, d) => {
    const r = d.r, V = CC_VENUE[d.pl.v], g = coGroup(s, d.gid), ic = { s: '🎵', t: '💬', v: '🎬' };
    const lv3 = b => b.k === 'v' ? '' : b.h >= 0.45 ? ' hot' : b.h < -0.2 ? ' cold' : '';
    return `<div class="cc-res"><div class="cc-heat"><span class="cc-hl">🔥 열기</span><span class="cc-hbar"><i style="width:${r.heat}%"></i></span><b>${r.heat}</b></div><div class="cc-hw">${U.esc(ccHeatW(r.heat))}</div>`
      + infoTable([['공연장', `${V.n} · ${V.seat.toLocaleString()}석 × ${CC_SHOWS}회`], ['관객', `${r.sold.toLocaleString()}명 (${r.fill >= 0.995 ? '매진' : `${Math.round(r.fill * 100)}%`})`], ['입장료', fmtWon(r.price)]])
      + `<div class="sec-h">셋리스트</div><div class="cc-rset">${r.blocks.map(b => `<span class="cc-rb${lv3(b)}${b.hl ? ' hl' : ''}">${b.hl ? '★ ' : ''}${ic[b.k]} ${U.esc(b.k === 's' ? b.t : b.k === 't' ? `토크 · ${b.who}` : 'VCR')}</span>`).join('')}</div>`
      + (r.notes.length ? `<div class="cc-notes">${r.notes.map(x => `<div>· ${U.esc(x)}</div>`).join('')}</div>` : '')
      + billHTML({ t: '콘서트 정산', rows: ccRows(r) })
      + (d.sp && typeof liveBtnHTML === 'function' ? liveBtnHTML(d.sp, '콘서트 다시 보기') : '') + `</div>`;
  },
  toasts: (s, d) => {
    const r = d.r, g = coGroup(s, d.gid), T = [['🎤', `「${d.gn}」 단독 콘서트 결산`, 'h'], ['🔥', `열기 ${r.heat} · ${ccHeatW(r.heat)}`, r.heat >= 70 ? 'g' : r.heat < 45 ? 'b' : ''], ['💰', r.net >= 0 ? `수익 +${fmtWon(r.net)}` : `손해 ${fmtWon(-r.net)}`, r.net >= 0 ? 'g' : 'b']];
    if (r.ly) T.push(loyToast(r.ly, g));
    if (r.heat < 45 && g) T.push(['💔', `그룹 팬 ${sgnFans(r.fd)} → ${fmtFans(coGFans(g))}`, 'b']);
    else if (r.fd > 0 && g) T.push(['💜', `그룹 팬 ${sgnFans(r.fd)} → ${fmtFans(coGFans(g))}`, 'g']);
    return T.filter(Boolean);
  },
  // CEO가 맡은 회사면 CEO 보고서에 한 줄로 (company.js ceoRepAdd)
  ceoRep: (s, d) => { const t = coT(s); if (!d.r || !coCeo(t, 'music')) return null; const r = d.r; return { f: 'music', ic: '🎤', gn: d.gn, sh: `단독 콘서트 · ${CC_VENUE[d.pl.v].n}`, t: `「${d.gn}」 단독 콘서트 · ${CC_VENUE[d.pl.v].n}`, res: `열기 ${r.heat} · 관객 ${r.sold.toLocaleString()}명 (${Math.round(r.fill * 100)}%)`, rows: ccRows(r), net: r.net, rep: r.repD, log: `「${d.gn}」 단독 콘서트 (${CC_VENUE[d.pl.v].n}). 열기 ${r.heat} · ${r.net >= 0 ? `남은 돈 ${fmtWon(r.net)}` : `손해 ${fmtWon(-r.net)}`}.` }; },
  ch: (s, d) => [{ t: '확인', f: () => `「${d.gn}」 단독 콘서트 (${CC_VENUE[d.pl.v].n}). 열기 ${d.r.heat} · ${d.r.net >= 0 ? `남은 돈 ${fmtWon(d.r.net)}` : `손해 ${fmtWon(-d.r.net)}`}.` }],
});
