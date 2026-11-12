// ───── 앨범 제작 틀 (v153, 12-4) ─────
// 앨범 하나가 거치는 단계. 대표 · 전담 프로듀서 · A&R · 작곡가 · 가수가 같은 앨범을 놓고 각자 제 차례를 맡는다
//   ① 기획: 컨셉 (여러 개를 같이 고를 수 있다. 둘째부터 기획비)
//   ② 데모곡 확보: 곡을 모으는 곳 (여러 곳을 같이 고를 수 있다. 곳마다 비용)
//   ③ 심사: A&R이 모인 곡을 다섯 곡으로 줄인다 (듣는 귀가 나쁘면 좋은 곡이 떨어진다)
//   ④ 선정: 다섯 곡 중 세 곡 + 타이틀곡 (대표 또는 전담 프로듀서)
//   ⑤ 편곡 · 작사 · 수정 한 달 → ⑥ 녹음 한 달 (고를 것 없음) → 발매
// 여기에는 누가 하든 똑같은 계산만 둔다. 창과 돈은 쓰는 쪽(company.js 등)에 있다
// x(제작 조건) = { tier 회사 크기 1~3 (회사 없는 인디는 0), rep 회사 평판, sig 대표 컨셉, def 처음부터 체크해 둘 컨셉, mem 멤버들, prod 앨범 제작비, budget 타이틀곡에 쓸 만한 돈, cs 고른 컨셉들, src 고른 곳들 }
const ALB_KEEP = 5, ALB_PICK = 3;
// 곡을 모으는 곳: cnt 모이는 곡 수 · cost 드는 돈 (회사 크기 차례. 0은 회사 없는 인디: v154)
const ALB_SRC = [
  { k: 'open', n: '외부 공모', h: '작곡가들에게 두루 곡을 받는다 · 곡은 많지만 수준이 들쭉날쭉', cnt: [5, 9, 13, 17], cost: [0, 0, 0, 0] },
  { k: 'name', n: '지명 의뢰', h: '이름난 작곡가 몇 명에게 따로 부탁한다 · 곡은 적지만 믿을 만하다', cnt: [2, 3, 3, 4], cost: [400e4, 1500e4, 3000e4, 5000e4] },
  { k: 'camp', n: '송캠프', h: '작곡가들을 한데 모아 고른 컨셉으로 곡을 쓰게 한다', cnt: [3, 4, 5, 6], cost: [900e4, 2500e4, 5000e4, 9000e4] },
  { k: 'in', n: '사내 제작', h: '회사 사내 프로듀서들이 곡을 쓴다 · 곡값은 월급에 들어 있다', cnt: [0, 0, 0, 0], cost: [0, 0, 0, 0] },
  { k: 'mem', n: '멤버 자작곡', h: '작곡할 줄 아는 멤버에게 곡을 받는다', cnt: [0, 0, 0, 0], cost: [0, 0, 0, 0] },
  { k: 'me', n: '내가 쓴 곡', h: '내가 직접 한 곡 쓴다 · 심사 없이 후보에 오른다', cnt: [1, 1, 1, 1], cost: [0, 0, 0, 0] },
];
// 그 크기 회사에 '헐한 곡'으로 치는 값 (심사 때 이런 곡을 둘은 끼워 온다)
const ALB_CHEAP = [300e4, 1500e4, 3500e4, 7000e4];
// 인디(회사 없음)에게는 작곡가들도 곡값을 낮춰 부른다
const ALB_PRICE_M = [0.3, 1, 1, 1];
function albWriters(x) { return (x.mem || []).filter(p => has(p, 'compose') && lv(p, 'compose') >= 20).slice(0, 2); }
// 지금 고를 수 있는 곳 (멤버 자작곡은 작곡하는 멤버가 있을 때, 내 곡은 내가 작곡을 할 때)
// 사내 제작은 사내 프로듀서가 있을 때 (v155: 내 회사)
function albSrcList(s, x) { return ALB_SRC.filter(z => z.k === 'mem' ? albWriters(x).length : z.k === 'me' ? has(me(s), 'compose') : z.k === 'in' ? (x.inh || []).length : true); }
function albSrcCnt(x, z, ncs) { return z.k === 'mem' ? albWriters(x).length : z.k === 'in' ? (x.inh || []).length : z.k === 'open' ? Math.round(z.cnt[x.tier] * (1 + 0.25 * Math.max(0, (ncs || 1) - 1))) : z.cnt[x.tier]; }
// 컨셉을 하나 더 고를 때마다 드는 기획비
function albPlanFee(x) { return Math.max(x.tier ? 300e4 : 50e4, Math.round((x.prod || 0) * 0.1 / 1e5) * 1e5); }
function albPlanCost(x, cs, src) { return ALB_SRC.filter(z => src.includes(z.k)).reduce((a, z) => a + z.cost[x.tier], 0) + Math.max(0, cs.length - 1) * albPlanFee(x); }
// 편곡 · 작사를 이름난 사람에게 맡길 때 드는 돈
function albPolCost(x) { return [300e4, 800e4, 2000e4, 4000e4][x.tier]; }
// 곡값: 타이틀곡 값만 따로 낸다 (수록곡 값은 앨범 제작비에 들어 있다)
function albSongCost(picks, ti) { return ti ? ti.price || 0 : 0; }

// 곡을 보내는 작곡가: 회사가 클수록 이름난 작곡가가 많고, 나머지는 신인의 싼 곡 (v131 규칙 그대로)
function albComposer(s, x, kind, used) {
  const free = y => !used.includes(y.id);
  let c;
  if (kind === 'name' || U.chance(kind === 'camp' ? 0.5 : 0.25 + x.tier * 0.17)) {
    c = pickIndustry(s, '작곡가', free, 0.6);
    // 지명 의뢰는 둘을 알아보고 더 잘하는 쪽에 맡긴다
    if (kind === 'name') { used.push(c.id); const c2 = pickIndustry(s, '작곡가', free, 0.6); used.pop(); if (lv(c2, 'compose') > lv(c, 'compose')) c = c2; }
  } else {
    c = industry(s, '작곡가', y => free(y) && lv(y, 'compose') < 45)[0];
    if (!c || U.chance(0.5)) { c = makeIndustry(s, '작곡가'); const l = U.int(18, 44); c.sk.compose.lv = c.sk.compose.best = l; c.sk.compose.pot = Math.max(c.sk.compose.pot, l + U.int(5, 25)); c.fame = Math.round(c.fame * 0.2); }
  }
  used.push(c.id);
  return c;
}
// 데모곡 한 곡. 완성도(숨은 값): 작곡 실력 · 그 컨셉 숙련도 · 운. 이름난 작곡가도 작은 회사 · 평판 낮은 회사에는 아껴 둔 곡을 주지 않는다
function albSong(s, x, kind, used) {
  const c = albComposer(s, x, kind, used), cm = coCm(c);
  const best = TRENDS.slice().sort((a, b) => cm[b] - cm[a])[0], mine = x.cs.slice().sort((a, b) => cm[b] - cm[a])[0];
  // 공모에는 주문한 컨셉이 아닌 곡도 섞여 온다. 지명 의뢰 · 송캠프는 주문한 컨셉으로 쓴다
  const cn = kind === 'open' ? (U.chance(0.5) ? U.pick(x.cs) : U.chance(0.6) ? best : U.pick(TRENDS)) : kind === 'name' ? (U.chance(0.7) ? mine : U.pick(x.cs)) : U.pick(x.cs);
  const m = cm[cn], L = lv(c, 'compose');
  const q0 = U.clamp(L * 0.6 + (m - 30) / 6 + U.normal(0, 7) + 4 + (kind === 'name' ? 2 : kind === 'camp' ? 1 : 0), 5, 90), qc = 40 + x.tier * 10 + x.rep / 8;
  const q = Math.round(q0 > qc ? qc + (q0 - qc) * 0.3 : q0);
  const price = Math.round((100 + L * L * 1.2 + m * 2) * (1 + Math.log10(1 + (c.fame || 0)) / 12) * (kind === 'name' ? 1.2 : 1) * ALB_PRICE_M[x.tier] / 10) * 10 * 1e4;
  return { cid: c.id, q, c: cn, m, price, title: songTitle(), src: kind };
}
// 사내 프로듀서가 쓴 곡 (v155): 회사 사람이라 아껴 둔 곡 없이 제 실력대로, 고른 컨셉 가운데 자기가 가장 잘 아는 컨셉으로 쓴다
function albInSong(s, x, P) {
  const cm = coCm(P), c = x.cs.slice().sort((a, b) => cm[b] - cm[a])[0];
  return { cid: P.id, q: Math.round(U.clamp(lv(P, 'compose') * 0.6 + (cm[c] - 30) / 6 + U.normal(0, 7) + 4, 5, 90)), c, m: cm[c], price: 0, title: songTitle(), src: 'in' };
}
// ② 모인 데모곡 전부
function albDemos(s, x) {
  const used = [], out = [], p = me(s);
  for (const z of ALB_SRC) {
    if (!x.src.includes(z.k)) continue;
    if (z.k === 'me') { if (!has(p, 'compose')) continue; const c = x.cs.slice().sort((a, b) => cmGet(s, b) - cmGet(s, a))[0]; out.push({ mine: true, q: Math.round(U.clamp(lv(p, 'compose') * 0.9 + U.normal(0, 5) + cmBonus(s, c), 5, 95)), c, m: cmGet(s, c), price: 0, title: songTitle(), src: 'me' }); continue; }
    if (z.k === 'in') { for (const P of x.inh || []) out.push(albInSong(s, x, P)); continue; }
    if (z.k === 'mem') { for (const w of albWriters(x)) out.push({ cid: w.id, q: Math.round(U.clamp(lv(w, 'compose') * 0.85 + U.normal(0, 7), 5, 90)), c: U.pick(x.cs), m: null, price: 0, title: songTitle(), src: 'mem' }); continue; }
    const n = Math.max(1, albSrcCnt(x, z, x.cs.length) + (z.k === 'open' ? U.int(-1, 1) : 0));
    for (let i = 0; i < n; i++) out.push(albSong(s, x, z.k, used));
  }
  return out;
}
// ③ 심사: 듣는 사람의 귀만큼 흐리게 들린다 (스카우트 · 작곡이 높을수록 정확). 내 곡(대표 · 전담 프로듀서의 곡)은 심사 없이 올라간다
// 심사하는 사람은 회사 형편도 본다: 타이틀곡으로 쓰기엔 너무 비싼 곡(x.budget 넘는 곡)은 웬만큼 좋지 않으면 올리지 않는다
// 심사하는 사람이 없거나 곡이 다섯 곡 이하면 전부 올라간다. lost: 떨어뜨린 곡이 올린 곡들보다 눈에 띄게 좋았을 때
function albEarSd(p) { return (30 - 25 * U.clamp(scoutLv(p, 'compose'), 0, 100) / 100) * 0.45; }
function albScreen(s, x, demos, judge) {
  if (!judge || demos.length <= ALB_KEEP) return { five: demos.slice(), lost: null };
  const sd = albEarOf(judge);
  const over = d => x.budget != null && d.price > x.budget ? 20 + Math.min(30, (d.price / Math.max(1, x.budget) - 1) * 15) : 0;
  const seen = demos.map(d => ({ d, v: d.mine || d.pass ? 999 : d.q + U.normal(0, sd) + (x.cs.includes(d.c) ? 3 : 0) + (d.fav || 0) - over(d) })).sort((a, b) => b.v - a.v);
  const five = seen.slice(0, ALB_KEEP).map(z => z.d);
  // 값이 헐한 곡도 둘은 있게: 올린 곡이 죄다 비싸면 가장 아쉬운 비싼 곡을 빼고 회사 크기 · 형편에 맞는 곡을 끼워 온다
  if (x.budget != null) {
    // 헐한 곡이 둘도 안 모였으면 모인 곡 가운데 가장 싼 두 곡을 헐한 곡으로 친다
    const line = Math.min(x.budget, Math.max(ALB_CHEAP[x.tier], x.budget * 0.1)), low = demos.slice().sort((a, b) => a.price - b.price).slice(0, 2);
    const fit = demos.filter(d => d.mine || d.price <= line).length >= 2 ? d => d.mine || d.price <= line : d => low.includes(d);
    for (const z of seen.slice(ALB_KEEP).filter(z => fit(z.d))) {
      if (five.filter(fit).length >= 2) break;
      let i = five.length - 1; while (i >= 0 && fit(five[i])) i--;
      if (i < 0) break;
      five[i] = z.d;
    }
  }
  const out = demos.filter(d => !five.includes(d)).sort((a, b) => b.q - a.q)[0];
  const top = Math.max(...five.map(d => d.q));
  return { five, lost: out && out.q >= 55 && out.q > top + 4 && !over(out) ? out : null };
}
// ⑤ 편곡 · 작사: 이름난 사람에게 맡기면 그 실력만큼 곡이 다듬어진다
// v165: out이 { arr, lyr }(사람 id)면 고른 사람에게만 맡긴다. 맡기지 않은 쪽은 조금만 다듬어진다 ('me'는 내가 직접 · 쓰는 쪽에서 따로 셈한다)
function albPolish(s, x, out) {
  if (out && typeof out === 'object') {
    const a = out.arr && s.people[out.arr], l = out.lyr && s.people[out.lyr];
    const da = a ? U.clamp(0.25 + lv(a, 'compose') * 0.02 + U.normal(0, 0.35), 0.5, 2.5) : U.fl(0, 0.75);
    const dl = l ? U.clamp(0.25 + lv(l, 'lyric') * 0.015 + U.normal(0, 0.35), 0.5, 2) : U.fl(0, 0.75);
    return { dq: da + dl, arr: a ? a.name : '', lyr: l ? l.name : '', aid: a ? a.id : null, lid: l ? l.id : null };
  }
  if (!out) return { dq: U.fl(0, 1.5), arr: '', lyr: '' };
  const a = pickIndustry(s, '프로듀서'), l = pickIndustry(s, '작사가');
  return { dq: U.clamp(0.5 + lv(a, 'compose') * 0.02 + lv(l, 'lyric') * 0.015 + U.normal(0, 0.7), 1, 4.5), arr: a.name, lyr: l.name, aid: a.id, lid: l.id };
}
// ⑤ 편곡 · 작사 의뢰 (v165): 편곡자와 작사가를 따로 고른다. 후보는 앨범마다 세 명씩이고, 지난번에 맡긴 사람은 늘 후보에 든다
const ALB_POL_N = 3;
// 한 사람에게 맡기는 값: 실력 · 이름값 · 회사 크기 (예전 '둘 다 맡기기' 값의 절반쯤이 보통)
function albPolFee(x, p, k) { const L = lv(p, k === 'arr' ? 'compose' : 'lyric'); return Math.max(50e4, Math.round(albPolCost(x) * 0.5 * (0.4 + L / 100 * 1.2) * (1 + Math.log10(1 + (p.fame || 0)) / 15) / 1e5) * 1e5); }
function albPolCands(s, last) {
  const pick = (job, keep) => {
    const out = [], k = keep && s.people[keep];
    if (k && k.alive) out.push(k.id);
    for (let i = 0; i < 15 && out.length < ALB_POL_N; i++) { const p = pickIndustry(s, job, y => !out.includes(y.id), 0.6); if (p && !out.includes(p.id)) out.push(p.id); }
    return out;
  };
  return { arr: pick('프로듀서', last && last.arr), lyr: pick('작사가', last && last.lyr) };
}
// 표 아래에 놓는 고르는 줄. base: 맡기지 않을 때의 줄 { arr: [{ v, label, sub }], lyr: [...] }, vf(특기): 실력을 보는 눈
// 처음 찍혀 있는 줄은 지난번 고른 것 (그 사람이 후보에 있으면)
function albPolFields(s, x, C, last, base, vf) {
  const F = [];
  for (const [k, n, sk] of [['arr', '편곡', 'compose'], ['lyr', '작사', 'lyric']]) {
    const L = (base[k] || []).map(o => o.v).concat(C[k] || []), cur = last && L.includes(last[k]) ? last[k] : '';
    F.push({ type: 'head', label: `${n} 맡기기`, after: true });
    for (const o of base[k] || []) F.push({ k, type: 'radio', after: true, v: o.v, on: cur === o.v, label: o.label, sub: o.sub || '' });
    for (const id of C[k] || []) { const p = s.people[id]; if (!p) continue; F.push({ k, type: 'radio', after: true, v: id, on: cur === id, label: `${p.name}${last && last[k] === id ? ' · 지난번에 맡김' : ''}`, sub: `${n} 실력 ${typeof coCellLv === 'function' ? coCellLv(vf(sk), p, sk, false)[1] : lvi(p, sk)}레벨 · ${fmtWon(albPolFee(x, p, k))}` }); }
  }
  return F;
}
function albPolRead(v) { return { arr: v.arr || '', lyr: v.lyr || '' }; }
// 편곡 · 작사에 드는 돈: 예전 방식(참 · 거짓)도 그대로 받는다
function albPolPay(s, x, pol) { if (!pol) return 0; if (typeof pol !== 'object') return albPolCost(x); return ['arr', 'lyr'].reduce((a, k) => { const p = pol[k] && s.people[pol[k]]; return a + (p ? albPolFee(x, p, k) : 0); }, 0); }
function albBy(s, d) { const c = d.cid && s.people[d.cid]; return d.mine || d.me ? '나' : c ? c.name : '작곡가'; }
// 성적표에 남기는 제작 기록 (작게): 누가 무엇을 했는지
function albMk(s, a, picks, ti, pol, boss) {
  const j = a.by && s.people[a.by];
  return { boss, cs: a.cs.slice(), src: a.src.slice(), n: a.n, by: j ? j.name : a.byN || '', k: a.five.length, pk: picks.map(d => ({ t: d.title, by: albBy(s, d), c: d.c, ti: d === ti ? 1 : 0 })).sort((p, q) => q.ti - p.ti), arr: pol.arr || '', lyr: pol.lyr || '' };
}
// 성적표 위의 '제작 과정' 배너 (누르면 작은 창)
function albBannerHTML(mk) { return mk && typeof popBtnHTML === 'function' ? `<div class="co-last">${popBtnHTML('🎼 제작 과정', albStepsHTML(mk))}</div>` : ''; }
function albStepsHTML(mk) {
  if (!mk) return '';
  const src = ALB_SRC.filter(z => mk.src.includes(z.k)).map(z => z.n).join(' · ');
  const R = [
    ['기획', `${mk.boss} · ${mk.cs.map(c => `'${c}'`).join(' ')} 컨셉`],
    ['데모곡', `${mk.n}곡 · ${src}`],
    ['심사', mk.by ? `${/A&R/.test(mk.by) ? mk.by : `A&R 팀장 ${mk.by}`}${mk.n > mk.k ? ` · ${mk.k}곡으로 추림` : ''}` : mk.boss === '나' ? '내가 직접 들음' : `${josa(mk.boss, '이가')} 직접 들음`],
    ['선정', `${mk.boss} · ${mk.pk.length}곡`],
    ['편곡 · 작사', mk.arr || mk.lyr ? `편곡 ${mk.arr || (mk.boss === '나' ? '직접' : '회사')} · 작사 ${mk.lyr || (mk.boss === '나' ? '직접' : '회사')}` : mk.boss === '나' ? '직접' : '회사에서'],
    ['녹음', '한 달'],
  ];
  // 내가 낸 곡이 어디까지 갔는지 (v154: 가수가 '자작곡 쓰기'를 켜 뒀을 때)
  if (mk.my) R.push(['내 곡', `「${mk.my.t}」 · ${mk.my.r}`]);
  return `<div class="alb-mk"><div class="alb-h">제작 과정</div><div class="alb-steps">${R.map(([k, v], i) => `<div class="alb-st"><b>${i + 1}</b><span class="alb-k">${U.esc(k)}</span><span class="alb-v">${U.esc(v)}</span></div>`).join('')}</div><div class="alb-h">실린 곡</div><div class="alb-songs">${mk.pk.map(p => `<div class="alb-sg${p.ti ? ' ti' : ''}"><span class="alb-tag">${p.ti ? '타이틀' : '수록'}</span><b>「${U.esc(p.t)}」</b><span>작곡 ${U.esc(p.by)}${p.ly ? ` · 작사 ${U.esc(p.ly)}` : ''} · '${U.esc(p.c)}'</span></div>`).join('')}</div></div>`;
}
// 기획 창의 체크 줄: 컨셉 여덟 개 + 곡을 모으는 곳. fit(c) = 그 컨셉이 가수에게 어울리는 정도를 말해 주는 글 (쓰는 쪽에서 준다)
function albPlanForm(s, x, fit) {
  const F = [{ type: 'head', label: '컨셉', grid: true }];
  // v165: 지난번 기획 설정(x.last)이 있으면 그대로 체크해 둔다
  const L = x.last && x.last.cs && x.last.cs.length ? x.last : null, SL = albSrcList(s, x), srcOn = L && L.src && L.src.some(k => SL.some(z => z.k === k)) ? k => L.src.includes(k) : k => k === 'open';
  for (const c of TRENDS) F.push({ k: 'c_' + c, type: 'check', on: L ? L.cs.includes(c) : c === (x.def || x.sig), label: c, tr: c === s.trend, sub: [c === x.sig ? '대표 컨셉' : '', fit ? fit(c) : ''].filter(Boolean).join(' · ') });
  F.push({ type: 'head', label: '곡을 모으는 곳' });
  for (const z of SL) { const n = albSrcCnt(x, z, 1), w = z.k === 'mem' ? albWriters(x).map(p => p.name).join(' · ') : z.k === 'in' ? x.inh.map(p => p.name).join(' · ') : ''; F.push({ k: 's_' + z.k, type: 'check', on: srcOn(z.k), label: z.n, sub: `${z.h}${w ? ` (${w})` : ''} · ${n}곡${z.k === 'open' ? '쯤' : ''} · ${z.cost[x.tier] ? fmtWon(z.cost[x.tier]) : '돈 안 듦'}` }); }
  return F;
}
function albOn(v, k) { return !!v[k] && v[k] !== 'false'; }
function albPlanRead(s, x, v) { return { cs: TRENDS.filter(c => albOn(v, 'c_' + c)), src: albSrcList(s, x).filter(z => albOn(v, 's_' + z.k)).map(z => z.k) }; }

// ───── 남이 정하는 앨범 (v154: 아이돌 멤버 · 회사 소속 솔로 · 밴드 · 버츄얼 아이돌) ─────
// 대표(소형 회사) 또는 전담 프로듀서(중 · 대형)가 ① 기획 · ② 데모곡 확보 · ④ 선정을, 회사 A&R 팀장이 ③ 심사를 맡는다. 가수(나)는 정하지 않는다
// 직업 창에서 '자작곡 쓰기 · 가사 쓰기'를 켜 두면 내 곡도 남의 곡과 똑같이 심사를 받고, 실린 곡 하나의 가사를 맡을 수도 있다
// o = { tier, rep, sig, mem 다른 멤버들, cs 정한 컨셉, ok(c) 가수에게 맞는 컨셉인가, boss · anr 정하는 사람 · A&R 팀장 (인물 또는 귀만 { sd }),
//       bossN · anrN 제작 기록에 남길 이름, my 내 곡을 낸다, lyr 가사를 낸다, out 편곡 · 작사를 밖에 맡길 가능성, fav 가수 본인 · 멤버 곡을 더 챙겨 보는 정도 }
// 남의 회사 타이틀곡 완성도를 예전 평균(24 + 회사 크기 × 7)에 맞추는 값 (v154 기준선)
const ALB_NPC_ADJ = [0, -17, -18, -17];
// 듣는 귀: 인물이면 스카우트 · 작곡만큼, { sd }면 그만큼, 없으면 보통
function albEarOf(p) { return !p ? 8 : p.sd != null ? p.sd : albEarSd(p); }
// 내가 낸 데모곡: 정한 컨셉 가운데 내가 가장 잘 아는 컨셉으로 쓴다 (숙련도가 조금 오른다)
function albMyDemo(s, x) {
  const p = me(s), c = x.cs.slice().sort((a, b) => cmGet(s, b) - cmGet(s, a))[0];
  const q = Math.round(U.clamp(lv(p, 'compose') * 0.9 + U.normal(0, 5) + cmBonus(s, c), 5, 95));
  useSkill(s, p, 'compose', 1.5); cmGain(s, c, 6);
  return { cid: s.me, me: true, q, c, m: cmGet(s, c), price: 0, title: songTitle(), src: 'self' };
}
function albNpc(s, o) {
  const src = ['open'];
  if (o.tier >= 2 && U.chance(o.tier >= 3 ? 0.8 : 0.5)) src.push('name');
  if (o.tier >= 3 && U.chance(0.4)) src.push('camp');
  const x = { tier: o.tier, rep: o.rep, sig: o.sig, mem: o.mem || [], cs: o.cs.slice(), src, budget: null };
  if (albWriters(x).length) src.push('mem');
  const demos = albDemos(s, x), my = o.my ? albMyDemo(s, x) : null;
  if (my) demos.push(my);
  // v157 자작곡의 길: 심사 피드백을 들었으면 조금 더 잘 쓰고(myB), 공동 프로듀서면 늘 다섯 곡에 오르고 고를 때도 더 챙겨 본다(myPass)
  if (my && o.myB) my.q = Math.min(95, my.q + o.myB);
  if (my && o.myPass) { my.pass = true; my.fav = 8; }
  // 가수 본인 · 멤버가 쓴 곡을 조금 더 챙겨 본다 (o.fav: 솔로 · 밴드)
  if (o.fav) for (const d of demos) if (d === my || d.src === 'mem') d.fav = o.fav;
  const sc = albScreen(s, x, demos, o.anr || { sd: 8 });
  // ④ 선정: 정하는 사람의 귀로 듣고, 정한 컨셉 · 가수에게 맞는 곡을 고른다
  const sd = albEarOf(o.boss);
  const picks = sc.five.map(d => ({ d, v: d.q + U.normal(0, sd) + (x.cs.includes(d.c) ? 10 : 0) + (d.fav || 0) - (o.ok && !o.ok(d.c) ? 30 : 0) })).sort((a, b) => b.v - a.v).slice(0, ALB_PICK).map(z => z.d);
  const ti = picks[0], pol = albPolish(s, x, U.chance(o.out != null ? o.out : [0, 0, 0.4, 0.8][o.tier] || 0));
  // 가사: 내 작사 실력이 맡을 사람보다 좋으면 타이틀곡, 조금 모자라면 수록곡 하나
  let lyr = null;
  if (o.lyr) {
    const L = lv(me(s), 'lyric'), w = pol.lid && s.people[pol.lid], rival = w ? lv(w, 'lyric') : 30 + o.tier * 6, r = L + U.normal(0, 8) - rival;
    useSkill(s, me(s), 'lyric', 1.5);
    lyr = r >= 0 ? ti : r >= -15 && picks.length > 1 ? U.pick(picks.slice(1)) : null;
    if (lyr === ti) { pol.dq += U.clamp((L - rival) * 0.03, -1, 1.5); if (pol.lyr) pol.lyr = '나'; }
  }
  const a = { cs: x.cs, src, n: demos.length, five: sc.five, by: o.anr && o.anr.id ? o.anr.id : null, byN: o.anrN || '' };
  const mk = albMk(s, a, picks, ti, pol, o.bossN || '회사');
  if (lyr) { const k = mk.pk.find(p => p.t === lyr.title); if (k) k.ly = '나'; }
  if (my) mk.my = { t: my.title, r: ti === my ? '타이틀곡' : picks.includes(my) ? '수록곡으로 실림' : sc.five.includes(my) ? '다섯 곡에 들었지만 빠짐' : '심사에서 떨어짐' };
  const side = picks.filter(d => d !== ti);
  return { x, a, picks, ti, pol, mk, my, lyr, lost: sc.lost, side: side.length ? side.reduce((n, d) => n + d.q, 0) / side.length : null };
}
// 트랙에 남겨 두는 앨범 (발매 때 쓴다). at: 기획한 달, q: 타이틀곡 완성도 (남의 회사면 기준선 값을 더한다. 내가 · 멤버가 쓴 곡이 타이틀이면 예전 자작곡처럼 그대로)
function albKeep(s, r, npc) {
  const ti = r.ti, my = r.my;
  return { at: s.t, q: ti.q + r.pol.dq + (npc && ti !== my && ti.src !== 'mem' ? ALB_NPC_ADJ[r.x.tier] || 0 : 0), side: r.side, c: ti.c, title: ti.title, cid: ti.cid || null, w: albBy(s, ti),
    mine: !!my && ti === my, sub: my && my !== ti && r.picks.includes(my) ? [my.title] : [], lyrT: !!r.lyr && r.lyr === ti, lyrS: r.lyr && r.lyr !== ti ? [r.lyr.title] : [], mk: r.mk, npc: npc ? 1 : 0 };
}
// 가수 쪽 '이번 앨범' 단계 (직업 창): 기획한 달 → 심사 · 선정 → 편곡 · 작사 → 녹음
function albStageW(s, a) { const k = s.t - a.at; return a.deb ? '녹음 중' : k <= 0 ? '데모곡을 모아 A&R 심사 중' : k === 1 ? '편곡 · 작사 중' : '녹음 중'; }
// 선정이 끝난 달에 남기는 소식 (내 곡 · 가사가 어떻게 됐는지)
function albNewsLine(s, a, what) {
  const R = [`${what} 곡이 정해졌다. 타이틀곡은 ${a.mine ? '내가 쓴' : `${a.w}의`} 「${a.title}」 ('${a.c}' 컨셉).`];
  if (a.mk && a.mk.my && !a.mine) R.push(`내가 낸 곡 「${a.mk.my.t}」 — ${a.mk.my.r}.`);
  if (a.lyrT) R.push('타이틀곡 가사를 내가 맡았다.');
  else if (a.lyrS && a.lyrS.length) R.push(`수록곡 「${a.lyrS[0]}」 가사를 내가 맡았다.`);
  return R.join(' ');
}
// 발매 때: 내 곡 · 가사가 실렸으면 저작권료 (타이틀 작곡 0.7 · 수록곡 작곡 0.25 · 타이틀 작사 0.35 · 수록곡 작사 0.12)
// sideOnly: 타이틀곡 몫은 쓰는 쪽(솔로 · 밴드 성적표)이 따로 셀 때. { txt 글, m 매달 들어올 돈 }
function albRoyalty(s, a, sc, job, sideOnly) {
  const R = [];
  let m = 0;
  if (!a) return { txt: '', m };
  if (a.mine && !sideOnly) { m += addCatalog(s, a.title, '작곡', sc, 0.7, job); cmGain(s, a.c, 4); R.push(`타이틀곡 ${josa(`「${a.title}」`, '을를')} 내가 썼다.`); }
  for (const t of a.sub || []) { m += addCatalog(s, t, '작곡', sc, 0.25, job); R.push(`내가 쓴 ${josa(`「${t}」`, '이가')} 수록곡으로 실렸다.`); }
  if (a.lyrT && !sideOnly) { m += addCatalog(s, a.title, '작사', sc, 0.35, job); R.push('타이틀곡 가사를 내가 썼다.'); }
  for (const t of a.lyrS || []) { m += addCatalog(s, t, '작사', sc, 0.12, job); R.push(`수록곡 「${t}」 가사를 내가 썼다.`); }
  return { txt: R.join(' '), m };
}
// 그 컨셉이 무대에 서는 사람들에게 어울리는 정도 (회사 창 · 기획 창에서 같은 말)
function albFit(s, P, c) {
  if (!cAgeOK(s, P, c, 1)) return '나이에 안 맞는다';
  const F = CONCEPT_FIT[c], R = cFit(s, c, P, 0);
  return F === 'rap' ? (R.rap >= 30 ? '잘 어울린다' : R.rap >= 15 ? '무난하다' : '안 어울린다') : R.b >= 1 ? '잘 어울린다' : R.b <= -1 ? '안 어울린다' : '무난하다';
}
