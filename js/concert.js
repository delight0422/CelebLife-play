// ───── 아이돌 그룹 단독 콘서트 (v193) ─────
// 앨범 5장 이상 · 그룹 팬 30만 명 이상 · 연습생 · 제작 비용을 다 회수한 우리 회사 아이돌 그룹만 연다 (1년에 한 번)
// 대표가 정하는 순서: 공연장(대관) → 셋리스트(곡 순서 + 중간 토크 · VCR 쉬는 시간) → 토크마다 누가 말할지 → 입장료
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
  if (coM(t, 'music') < ccCost(0)) return '자본금이 모자라다';
  return '';
}
// 부를 수 있는 곡: 앨범마다 타이틀곡 하나 + 수록곡 둘 (수록곡 이름은 처음 기획할 때 정해 둔다)
// 예전 세이브 · 경력 회사처럼 앨범 기록이 낸 앨범 수보다 적으면 모자란 만큼 옛 앨범을 채운다
function ccSongs(s, g) {
  const D = (g.disc || []).filter(a => a && a.title), need = Math.max(0, (g.cbCount || 0) - D.length);
  if ((g.ccOld || []).length < need) { g.ccOld = (g.ccOld || []).concat(Array.from({ length: need - (g.ccOld || []).length }, () => ({ title: songTitle(), q: U.int(48, 66), sc: U.int(48, 70), y: calY(s) - 3 }))); }
  const A = (g.ccOld || []).slice(0, need).concat(D), L = [];
  for (const a of A) {
    a.bs = a.bs || [songTitle(), songTitle()];
    const q = a.q || 55, sc = a.sc || 55;
    L.push({ key: a.title + '|0', t: a.title, alb: a.title, tt: 1, q, sc });
    a.bs.forEach((b, i) => L.push({ key: a.title + '|' + (i + 1), t: b, alb: a.title, tt: 0, q: q - 4 + (i ? -2 : 0), sc: sc - 15 - i * 3 }));
  }
  return L;
}
function ccSongBy(s, g) { const M = {}; for (const x of ccSongs(s, g)) M[x.key] = x; return M; }
function ccTalkP(x) { return lv(x, 'variety'); }
// 자동으로 짜기: 완성도가 가장 높은 곡으로 끝내고, 두 번째 곡으로 시작하고, 사이는 앨범 순서대로. 3곡 뒤 첫 토크, 그 뒤로 4곡마다 VCR · 토크를 번갈아
function ccAutoSet(s, g) {
  const L = ccSongs(s, g), pick = L.filter(x => x.tt).concat(L.filter(x => !x.tt).sort((a, b) => b.q - a.q)).slice(0, 16);
  const hit = pick.slice().sort((a, b) => b.q - a.q), last = hit[0], first = hit[1] || hit[0];
  const mid = L.filter(x => pick.includes(x) && x !== last && x !== first);
  const seq = (first !== last ? [first] : []).concat(mid, [last]), out = [];
  let brk = 0;
  seq.forEach((x, i) => { out.push('s:' + x.key); const n = i + 1; if (n < seq.length - 1 && (n === 3 || (n > 3 && (n - 3) % 4 === 0))) out.push(brk++ % 2 ? 'v' : 't'); });
  return out;
}
function ccAutoTalk(s, g, set) {
  const P = coP(s, g.members).sort((a, b) => ccTalkP(b) - ccTalkP(a)), T = {};
  let k = 0;
  set.forEach((c, i) => { if (c === 't') { T[i] = k === 0 || !P.length ? 'all' : P[(k - 1) % P.length].id; k++; } });
  return T;
}
// 기대 관객 수 (두 번 공연을 합친 것): 그룹 팬 수 × 팬 충성도(0이면 0.4배 · 50이면 1배 · 100이면 1.6배) × 입장료(쌀수록 많이)
function ccDemand(s, g, price, r) { return coGFans(g) * 0.05 * (0.4 + loyOf(g) / 100 * 1.2) * Math.pow(121000 / price, 1.3) * (r == null ? 1 : r); }
function ccAutoPlan(s, t, g, mode) {
  const d0 = ccDemand(s, g, 121000), res = coFixed(s, t, 'music') * CO_AUTO_RES;
  let v = 0; CC_VENUE.forEach((V, i) => { if (V.seat * CC_SHOWS <= d0 * 1.05 && coM(t, 'music') >= ccCost(i) + res) v = i; });
  const set = ccAutoSet(s, g), price = d0 > CC_VENUE[v].seat * CC_SHOWS * 1.6 ? 3 : 2;
  return { v, set, talk: ccAutoTalk(s, g, set), p: price, mode };
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
  // 2. 곡 완성도
  const songQ = nS ? songs.reduce((a, x) => a + x.q, 0) / nS : 30;
  if (songQ >= 75) N.push('완성도 높은 곡들로 꽉 채웠다.'); else if (songQ < 50) N.push('완성도가 아쉬운 곡이 많았다.');
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
  // 셋리스트 짜임 (조금만)
  if (nS < 8) { h -= (8 - nS) * 2; N.push('곡이 적어 금방 끝난 느낌이었다.'); } else if (nS > 20) { h -= (nS - 20) * 1.2; N.push('공연이 너무 길었다.'); }
  const seen = {}; let dup = 0; for (const x of songs) { if (seen[x.key]) dup++; seen[x.key] = 1; }
  if (dup) { h -= dup * 4; N.push('같은 곡을 두 번 불렀다.'); }
  const rank = songs.slice().sort((a, b) => b.q - a.q), lastS = songs[nS - 1];
  if (set[0] && !set[0].startsWith('s:')) { h -= 2; N.push('시작부터 쉬어 가서 분위기가 늦게 올라왔다.'); } else if (songs[0] && rank.indexOf(songs[0]) <= 2) { h += 2; N.push('첫 곡부터 객석이 뜨거웠다.'); }
  if (lastS && nS >= 3 && rank.indexOf(lastS) <= 1) { h += 3; N.push('마지막 곡에서 떼창이 터졌다.'); }
  if (!nB && nS) { h -= 6; N.push('쉬는 시간이 없어 뒤로 갈수록 힘이 빠졌다.'); } else if (nB > nS / 2) { h -= (nB - nS / 2) * 1.5; N.push('토크와 VCR이 너무 잦아 흐름이 자주 끊겼다.'); }
  let run = 0, maxRun = 0, tired = 0; const tiredAt = {};
  set.forEach((c, i) => { if (c.startsWith('s:')) { run++; if (run > 5) { tired++; tiredAt[i] = 1; } maxRun = Math.max(maxRun, run); } else run = 0; });
  if (tired) { h -= tired * 1.5; N.push(`쉬지 않고 ${maxRun}곡을 이어 불러 멤버들이 지쳤다.`); }
  h = Math.round(U.clamp(h + U.normal(0, 3), 0, 100));
  // 무대 장면 (live.js liveConcert): 곡 · 토크 · VCR마다 반응 세기 (-1~1). 곡은 그 곡의 완성도와 무대 실력으로
  let no = 0;
  set.forEach((c, i) => {
    if (c === 't') B.push({ k: 't', who: TK[i].who, h: Math.round(TK[i].v * 100) / 100 });
    else if (c === 'v') B.push({ k: 'v', h: Math.round(((h - 60) / 30) * 100) / 100 });
    else { const x = SB[c.slice(2)]; no++; B.push({ k: 's', no, t: x.t, tt: x.tt, h: Math.round(U.clamp((x.q * 0.5 + perf * 0.5 - 58) / 18 - (tiredAt[i] ? 0.6 : 0), -1, 1) * 100) / 100, tired: tiredAt[i] ? 1 : 0, first: no === 1 ? 1 : 0, last: x === lastS && no === nS ? 1 : 0 }); }
  });
  return { heat: h, sold, cap, fill, price, perf, songQ, talkQ, nS, nT, nV, notes: N, blocks: B };
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
  submitT: () => '다음 · 셋리스트',
  fbtn: (s, d) => { const g = coGroup(s, d.gid), GP = g && coGProd(s, g); return GP ? [{ t: `전담 프로듀서 ${GP.name}에게 맡기기`, h: '공연장부터 입장료까지 알아서 정한다 · 공연 장면은 안 본다', f: s => { const t = coT(s), pl = ccAutoPlan(s, t, g, 'prod'); if (coM(t, 'music') < ccCost(pl.v)) return '자본금이 모자라 맡기지 못했다.'; return ccConfirm(s, t, g, pl) + ` 전담 프로듀서 ${josa(GP.name, '이가')} 셋리스트를 짰다.`; } }] : []; },
  cancel: () => '', cancelT: () => '그만두기',
  submit(s, d, v) {
    const { g, t, pl } = ccPlanD(s, d), i = U.clamp(parseInt(v.v, 10) || 0, 0, CC_VENUE.length - 1);
    if (coM(t, 'music') < ccCost(i)) return { err: '자본금이 모자라다' };
    pl.v = i; if (!pl.set) pl.set = ccAutoSet(s, g);
    fireEvent(s, 'co_cc_set', { gid: d.gid, pl }); return {};
  },
});
// ───── 2. 셋리스트: 곡을 눌러 넣고, ↑ ↓로 순서를 바꾸고, ✕로 뺀다. 토크 · VCR(쉬는 시간)은 몇 번이든 넣는다 ─────
function ccItemTx(SB, c) { if (c === 't') return ['💬', '토크', '']; if (c === 'v') return ['🎬', 'VCR · 쉬는 시간', '']; const x = SB[c.slice(2)]; return x ? ['🎵', `「${x.t}」`, `${x.tt ? '타이틀곡' : '수록곡'} · 앨범 「${x.alb}」`] : ['?', '', '']; }
function ccSum(SB, set) {
  const nS = set.filter(c => c.startsWith('s:')).length, nT = set.filter(c => c === 't').length, nV = set.filter(c => c === 'v').length;
  let run = 0, mx = 0; for (const c of set) { if (c.startsWith('s:')) { run++; mx = Math.max(mx, run); } else run = 0; }
  return `곡 ${nS} · 토크 ${nT} · 쉬는 시간 ${nV} · 약 ${nS * 4 + nT * 6 + nV * 3 + 10}분${mx >= 6 ? ` · 쉬지 않고 ${mx}곡이 이어진다` : ''}`;
}
function ccListHTML(SB, set) {
  return set.length ? set.map((c, i) => { const [ic, tx, sub] = ccItemTx(SB, c); return `<li class="cc-it k-${c[0]}"><span class="cc-ix">${i + 1}</span><span class="cc-tx">${ic} ${U.esc(tx)}${sub ? `<small>${U.esc(sub)}</small>` : ''}</span><span class="cc-bt"><button class="btn sm" data-ccmv="${i}:-1" ${i ? '' : 'disabled'} aria-label="위로">↑</button><button class="btn sm" data-ccmv="${i}:1" ${i < set.length - 1 ? '' : 'disabled'} aria-label="아래로">↓</button><button class="btn sm" data-ccdel="${i}" aria-label="빼기">✕</button></span></li>`; }).join('') : '<li class="cc-empty">아래에서 곡을 눌러 넣는다</li>';
}
function ccPoolHTML(L, set) {
  const inS = new Set(set);
  return `<button class="cc-chip k-t" data-ccadd="t">💬 토크</button><button class="cc-chip k-v" data-ccadd="v">🎬 VCR · 쉬는 시간</button>` + L.filter(x => !inS.has('s:' + x.key)).map(x => `<button class="cc-chip${x.tt ? ' tt' : ''}" data-ccadd="${U.esc('s:' + x.key)}">🎵 ${U.esc(x.t)}<small>${x.tt ? '타이틀' : '수록곡'} · 「${U.esc(x.alb)}」</small></button>`).join('');
}
E({
  id: 'co_cc_set', cat: '단독 콘서트', tag: 'career', wide: true,
  title: (s, d) => `「${(coGroup(s, d.gid) || {}).name || ''}」 단독 콘서트 · 셋리스트`,
  cond: s => coOn(s),
  init(s, d) { const g = coGroup(s, d.gid); if (!g || !d.pl) { d.skip = true; return; } if (!d.pl.set) d.pl.set = ccAutoSet(s, g); },
  text: (s, d) => `${CC_VENUE[d.pl.v].n}. 부를 곡과 순서, 중간중간 토크 · VCR(멤버들이 숨 고르는 쉬는 시간)을 정한다.`,
  html: (s, d) => { const { g, pl } = ccPlanD(s, d), L = ccSongs(s, g), SB = ccSongBy(s, g); return `<div class="cc-ed"><div class="cc-col"><div class="ck-head">셋리스트</div><ol class="cc-list" id="cc-list">${ccListHTML(SB, pl.set)}</ol><div class="cc-sum" id="cc-sum">${U.esc(ccSum(SB, pl.set))}</div></div><div class="cc-col"><div class="ck-head">넣을 수 있는 것 <span class="cc-tools"><button class="btn sm" data-ccauto>자동으로 짜기</button><button class="btn sm" data-ccclear>모두 비우기</button></span></div><div class="cc-pool" id="cc-pool">${ccPoolHTML(L, pl.set)}</div></div><input type="hidden" data-k="set" id="cc-set" value="${U.esc(JSON.stringify(pl.set))}"></div>`; },
  form: () => [],
  onShow(s, d, card) {
    const ed = card.querySelector('.cc-ed'); if (!ed) return;
    const g = coGroup(s, d.gid), L = ccSongs(s, g), SB = ccSongBy(s, g), pl = d.pl;
    const draw = () => { ed.querySelector('#cc-list').innerHTML = ccListHTML(SB, pl.set); ed.querySelector('#cc-pool').innerHTML = ccPoolHTML(L, pl.set); ed.querySelector('#cc-sum').textContent = ccSum(SB, pl.set); ed.querySelector('#cc-set').value = JSON.stringify(pl.set); };
    ed.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || !ed.contains(b) || b.disabled) return;
      e.preventDefault(); e.stopPropagation();
      if (b.dataset.ccadd != null) pl.set.push(b.dataset.ccadd);
      else if (b.dataset.ccdel != null) pl.set.splice(+b.dataset.ccdel, 1);
      else if (b.dataset.ccmv != null) { const [i, dv] = b.dataset.ccmv.split(':').map(Number), j = i + dv; if (j >= 0 && j < pl.set.length) [pl.set[i], pl.set[j]] = [pl.set[j], pl.set[i]]; }
      else if (b.dataset.ccauto != null) pl.set = ccAutoSet(s, g);
      else if (b.dataset.ccclear != null) pl.set = [];
      else return;
      draw();
    });
  },
  submitT: () => '다음',
  fbtn: ccBack('co_cc_venue'),
  cancel: () => '', cancelT: () => '그만두기',
  submit(s, d, v) {
    const { g, pl } = ccPlanD(s, d), SB = ccSongBy(s, g);
    let set = pl.set; try { const x = JSON.parse(v.set || 'null'); if (Array.isArray(x)) set = x; } catch (e) { }
    set = set.filter(c => c === 't' || c === 'v' || (typeof c === 'string' && c.startsWith('s:') && SB[c.slice(2)]));
    if (set.filter(c => c.startsWith('s:')).length < 3) return { err: '곡을 3곡 이상 넣어야 한다' };
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
  id: 'co_cc_price', cat: '단독 콘서트', tag: 'career',
  title: (s, d) => `「${(coGroup(s, d.gid) || {}).name || ''}」 단독 콘서트 · 입장료`,
  cond: s => coOn(s),
  init(s, d) { if (!coGroup(s, d.gid) || !d.pl) d.skip = true; },
  text: (s, d) => { const { g, t, pl } = ccPlanD(s, d), V = CC_VENUE[pl.v]; return `${V.n} · ${(V.seat * CC_SHOWS).toLocaleString()}석 (${V.seat.toLocaleString()}석 × ${CC_SHOWS}회)\n그룹 팬 ${fmtFans(coGFans(g))} · 팬 충성도 ${loyTxt(g)}\n\n그룹 팬이 많고 팬 충성도가 높을수록, 입장료가 쌀수록 표가 잘 팔린다. 예매 수수료 ${Math.round(CC_FEE * 100)}%는 뗀다.\n대관 · 무대 ${fmtWon(ccCost(pl.v))} · 자본금 ${fmtWon(coM(t, 'music'))}`; },
  form: (s, d) => { const pl = d.pl, on = pl.p != null ? pl.p : 2; return [{ type: 'head', label: '입장료' }].concat(CC_PRICE.map((p, i) => ({ k: 'p', type: 'radio', v: String(i), on: i === on, label: fmtWon(p) }))); },
  sum: (s, d, v) => { const V = CC_VENUE[d.pl.v], p = CC_PRICE[parseInt(v.p, 10)] || CC_PRICE[2]; return `만석이면 티켓 매출 ${fmtWon(Math.round(V.seat * CC_SHOWS * p * (1 - CC_FEE)))}`; },
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
  id: 'co_cc_res', cat: '단독 콘서트', tag: 'career', keepPop: true, wide: true,
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
      + `<div class="sec-h">셋리스트</div><div class="cc-rset">${r.blocks.map(b => `<span class="cc-rb${lv3(b)}">${ic[b.k]} ${U.esc(b.k === 's' ? b.t : b.k === 't' ? `토크 · ${b.who}` : 'VCR')}</span>`).join('')}</div>`
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
  ceoRep: (s, d) => { const t = coT(s); if (!d.r || !coCeo(t, 'music')) return null; const r = d.r; return { f: 'music', ic: '🎤', t: `「${d.gn}」 단독 콘서트 · ${CC_VENUE[d.pl.v].n}`, res: `열기 ${r.heat} · 관객 ${r.sold.toLocaleString()}명 (${Math.round(r.fill * 100)}%)`, rows: ccRows(r), net: r.net, rep: r.repD, log: `「${d.gn}」 단독 콘서트 (${CC_VENUE[d.pl.v].n}). 열기 ${r.heat} · ${r.net >= 0 ? `남은 돈 ${fmtWon(r.net)}` : `손해 ${fmtWon(-r.net)}`}.` }; },
  ch: (s, d) => [{ t: '확인', f: () => `「${d.gn}」 단독 콘서트 (${CC_VENUE[d.pl.v].n}). 열기 ${d.r.heat} · ${d.r.net >= 0 ? `남은 돈 ${fmtWon(d.r.net)}` : `손해 ${fmtWon(-d.r.net)}`}.` }],
});
