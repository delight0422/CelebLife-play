// ───── 앨범 제작 틀 (v153, 12-4) ─────
// 앨범 하나가 거치는 단계. 대표 · 전담 프로듀서 · A&R · 작곡가 · 가수가 같은 앨범을 놓고 각자 제 차례를 맡는다
//   ① 기획: 컨셉 (여러 개를 같이 고를 수 있다. 둘째부터 기획비)
//   ② 데모곡 확보: 곡을 모으는 곳 (여러 곳을 같이 고를 수 있다. 곳마다 비용)
//   ③ 심사: A&R이 모인 곡을 다섯 곡으로 줄인다 (듣는 귀가 나쁘면 좋은 곡이 떨어진다)
//   ④ 선정: 다섯 곡 중 세 곡 + 타이틀곡 (대표 또는 전담 프로듀서)
//   ⑤ 편곡 · 작사 · 수정 한 달 → ⑥ 녹음 한 달 (고를 것 없음) → 발매
// 여기에는 누가 하든 똑같은 계산만 둔다. 창과 돈은 쓰는 쪽(company.js 등)에 있다
// x(제작 조건) = { tier 회사 크기 1~3, rep 회사 평판, sig 대표 컨셉, mem 멤버들, prod 앨범 제작비, budget 타이틀곡에 쓸 만한 돈, cs 고른 컨셉들, src 고른 곳들 }
const ALB_KEEP = 5, ALB_PICK = 3;
// 곡을 모으는 곳: cnt 모이는 곡 수 · cost 드는 돈 (회사 크기 차례)
const ALB_SRC = [
  { k: 'open', n: '외부 공모', h: '작곡가들에게 두루 곡을 받는다 · 곡은 많지만 수준이 들쭉날쭉', cnt: [0, 9, 13, 17], cost: [0, 0, 0, 0] },
  { k: 'name', n: '지명 의뢰', h: '이름난 작곡가 몇 명에게 따로 부탁한다 · 곡은 적지만 믿을 만하다', cnt: [0, 3, 3, 4], cost: [0, 1500e4, 3000e4, 5000e4] },
  { k: 'camp', n: '송캠프', h: '작곡가들을 한데 모아 고른 컨셉으로 곡을 쓰게 한다', cnt: [0, 4, 5, 6], cost: [0, 2500e4, 5000e4, 9000e4] },
  { k: 'mem', n: '멤버 자작곡', h: '작곡할 줄 아는 멤버에게 곡을 받는다', cnt: [0, 0, 0, 0], cost: [0, 0, 0, 0] },
  { k: 'me', n: '내가 쓴 곡', h: '내가 직접 한 곡 쓴다 · 심사 없이 후보에 오른다', cnt: [0, 1, 1, 1], cost: [0, 0, 0, 0] },
];
// 그 크기 회사에 '헐한 곡'으로 치는 값 (심사 때 이런 곡을 둘은 끼워 온다)
const ALB_CHEAP = [0, 1500e4, 3500e4, 7000e4];
function albWriters(x) { return (x.mem || []).filter(p => has(p, 'compose') && lv(p, 'compose') >= 20).slice(0, 2); }
// 지금 고를 수 있는 곳 (멤버 자작곡은 작곡하는 멤버가 있을 때, 내 곡은 내가 작곡을 할 때)
function albSrcList(s, x) { return ALB_SRC.filter(z => z.k === 'mem' ? albWriters(x).length : z.k === 'me' ? has(me(s), 'compose') : true); }
function albSrcCnt(x, z, ncs) { return z.k === 'mem' ? albWriters(x).length : z.k === 'open' ? Math.round(z.cnt[x.tier] * (1 + 0.25 * Math.max(0, (ncs || 1) - 1))) : z.cnt[x.tier]; }
// 컨셉을 하나 더 고를 때마다 드는 기획비
function albPlanFee(x) { return Math.max(300e4, Math.round((x.prod || 0) * 0.1 / 1e5) * 1e5); }
function albPlanCost(x, cs, src) { return ALB_SRC.filter(z => src.includes(z.k)).reduce((a, z) => a + z.cost[x.tier], 0) + Math.max(0, cs.length - 1) * albPlanFee(x); }
// 편곡 · 작사를 이름난 사람에게 맡길 때 드는 돈
function albPolCost(x) { return [0, 800e4, 2000e4, 4000e4][x.tier]; }
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
  const price = Math.round((100 + L * L * 1.2 + m * 2) * (1 + Math.log10(1 + (c.fame || 0)) / 12) * (kind === 'name' ? 1.2 : 1) / 10) * 10 * 1e4;
  return { cid: c.id, q, c: cn, m, price, title: songTitle(), src: kind };
}
// ② 모인 데모곡 전부
function albDemos(s, x) {
  const used = [], out = [], p = me(s);
  for (const z of ALB_SRC) {
    if (!x.src.includes(z.k)) continue;
    if (z.k === 'me') { if (!has(p, 'compose')) continue; const c = x.cs.slice().sort((a, b) => cmGet(s, b) - cmGet(s, a))[0]; out.push({ mine: true, q: Math.round(U.clamp(lv(p, 'compose') * 0.9 + U.normal(0, 5) + cmBonus(s, c), 5, 95)), c, m: cmGet(s, c), price: 0, title: songTitle(), src: 'me' }); continue; }
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
  const sd = albEarSd(judge);
  const over = d => x.budget != null && d.price > x.budget ? 20 + Math.min(30, (d.price / Math.max(1, x.budget) - 1) * 15) : 0;
  const seen = demos.map(d => ({ d, v: d.mine ? 999 : d.q + U.normal(0, sd) + (x.cs.includes(d.c) ? 3 : 0) - over(d) })).sort((a, b) => b.v - a.v);
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
function albPolish(s, x, out) {
  if (!out) return { dq: U.fl(0, 1.5), arr: '', lyr: '' };
  const a = pickIndustry(s, '프로듀서'), l = pickIndustry(s, '작사가');
  return { dq: U.clamp(0.5 + lv(a, 'compose') * 0.02 + lv(l, 'lyric') * 0.015 + U.normal(0, 0.7), 1, 4.5), arr: a.name, lyr: l.name, aid: a.id, lid: l.id };
}
function albBy(s, d) { const c = d.cid && s.people[d.cid]; return d.mine ? '나' : c ? c.name : '작곡가'; }
// 성적표에 남기는 제작 기록 (작게): 누가 무엇을 했는지
function albMk(s, a, picks, ti, pol, boss) {
  const j = a.by && s.people[a.by];
  return { boss, cs: a.cs.slice(), src: a.src.slice(), n: a.n, by: j ? j.name : '', k: a.five.length, pk: picks.map(d => ({ t: d.title, by: albBy(s, d), c: d.c, ti: d === ti ? 1 : 0 })).sort((p, q) => q.ti - p.ti), arr: pol.arr || '', lyr: pol.lyr || '' };
}
function albStepsHTML(mk) {
  if (!mk) return '';
  const src = ALB_SRC.filter(z => mk.src.includes(z.k)).map(z => z.n).join(' · ');
  const R = [
    ['기획', `${mk.boss} · ${mk.cs.map(c => `'${c}'`).join(' ')} 컨셉`],
    ['데모곡', `${mk.n}곡 · ${src}`],
    ['심사', mk.by ? `A&R 팀장 ${mk.by}${mk.n > mk.k ? ` · ${mk.k}곡으로 추림` : ''}` : `${josa(mk.boss, '이가')} 직접 들음`],
    ['선정', `${mk.boss} · ${mk.pk.length}곡`],
    ['편곡 · 작사', mk.arr ? `편곡 ${mk.arr} · 작사 ${mk.lyr}` : '회사에서'],
    ['녹음', '한 달'],
  ];
  return `<div class="alb-mk"><div class="alb-h">제작 과정</div><div class="alb-steps">${R.map(([k, v], i) => `<div class="alb-st"><b>${i + 1}</b><span class="alb-k">${U.esc(k)}</span><span class="alb-v">${U.esc(v)}</span></div>`).join('')}</div><div class="alb-h">실린 곡</div><div class="alb-songs">${mk.pk.map(p => `<div class="alb-sg${p.ti ? ' ti' : ''}"><span class="alb-tag">${p.ti ? '타이틀' : '수록'}</span><b>「${U.esc(p.t)}」</b><span>작곡 ${U.esc(p.by)} · '${U.esc(p.c)}'</span></div>`).join('')}</div></div>`;
}
// 기획 창의 체크 줄: 컨셉 여덟 개 + 곡을 모으는 곳. fit(c) = 그 컨셉이 가수에게 어울리는 정도를 말해 주는 글 (쓰는 쪽에서 준다)
function albPlanForm(s, x, fit) {
  const F = [{ type: 'head', label: '컨셉', grid: true }];
  for (const c of TRENDS) F.push({ k: 'c_' + c, type: 'check', on: c === x.sig, label: c, tr: c === s.trend, sub: [c === x.sig ? '대표 컨셉' : '', fit ? fit(c) : ''].filter(Boolean).join(' · ') });
  F.push({ type: 'head', label: '곡을 모으는 곳' });
  for (const z of albSrcList(s, x)) { const n = albSrcCnt(x, z, 1), w = z.k === 'mem' ? albWriters(x).map(p => p.name).join(' · ') : ''; F.push({ k: 's_' + z.k, type: 'check', on: z.k === 'open', label: z.n, sub: `${z.h}${w ? ` (${w})` : ''} · ${n}곡${z.k === 'open' ? '쯤' : ''} · ${z.cost[x.tier] ? fmtWon(z.cost[x.tier]) : '돈 안 듦'}` }); }
  return F;
}
function albOn(v, k) { return !!v[k] && v[k] !== 'false'; }
function albPlanRead(s, x, v) { return { cs: TRENDS.filter(c => albOn(v, 'c_' + c)), src: albSrcList(s, x).filter(z => albOn(v, 's_' + z.k)).map(z => z.k) }; }
