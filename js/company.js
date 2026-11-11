'use strict';
// ════════ 회사 경영 (6단계) ════════
// 회사는 하나만 운영한다. 처음엔 한 분야로 차리고, 어느 분야든 중형이 되면 같은 이름으로 다른 분야를 더한다 (회사 창 '분야 더하기')
// 평판과 크기는 분야마다 따로다 (t.f[분야] = { rep, tier }). 분야: music(기획사: 아이돌·밴드), vidol(버츄얼 아이돌 기획사: 기수)
// 연습생 수·그룹 수·운영비·오디션은 분야마다 그 분야 크기를 따른다. 직원·장비는 회사 전체가 함께 쓰고, 지원자 수준은 가장 큰 분야를 따른다
// 회사 돈(t.money)은 내 돈과 따로다. '돈 넣기'·'돈 꺼내기'로 옮긴다. 넣은 돈(t.inv)보다 많이 꺼낸 만큼만 '업계에서 번 돈'이 된다
// 회사를 운영하는 동안에는 다른 회사와 계약할 수 없다(contract). 내 연예 활동은 소속 없이 한다(emp: 아티스트 활동은 막지 않는다)
// 회사 사람(연습생·소속 아티스트·직원·지원자)은 업계 사람(rel '업계')이라 인간관계 창에는 나오지 않는다. x.co에 회사 안에서의 자리를 둔다
//   x.co = { f: 분야, role: 'cand'(지원자)|'tr'(연습생)|'art'(소속 아티스트)|'staff'(직원), kind: 'idol'|'band'|'vt', part: 밴드 파트, gid, job, k, sal, since, cost }
//   버츄얼 아이돌 멤버는 x.co에 { given: RP 이름, subs: 구독자, d3: 3D 모델 } 도 둔다
//   MCN 크리에이터(분야 mcn)는 연습생이 아니라 이미 활동 중인 업계 스트리머·버튜버다 (x.yt, js/mcn.js). t.crs에 두고 x.co = { f: 'mcn', role: 'art', kind: 'cr', cut, left, months, since, subs0 }

const CO_FIELDS = { music: { n: '기획사', ic: '🎤', kinds: ['idol', 'band'], what: '연습생을 뽑아 키우고 아이돌 그룹이나 밴드로 데뷔시킨다' }, vidol: { n: '버츄얼 아이돌 기획사', ic: '🎙️', kinds: ['vt'], what: '연습생을 뽑아 키우고 기수로 묶어 버츄얼 아이돌로 데뷔시킨다' }, mcn: { n: 'MCN', ic: '📡', kinds: [], what: '활동 중인 스트리머·버튜버를 영입해 광고를 잡아 주고 수익을 나눈다' }, video: { n: '영상 제작사', ic: '🎬', kinds: [], what: '웹드라마·드라마·OTT 시리즈·영화를 기획해 만들고 플랫폼·방송사·극장에 건다' }, anime: { n: '애니메이션 제작사', ic: '🎨', kinds: [], what: '웹 애니·TV 애니·OTT 애니·극장판을 기획해 만들고 플랫폼·방송사·극장에 건다' } };
const CO_SEED = 1e8;
// 분야 더하기: 어느 분야든 중형이 되면, 회사 돈으로 다른 분야를 연다
const CO_ADD_COST = 5e8;
// 평판 40이면 중형, 70이면 대형. 내려갈 때는 8 낮은 데서 내려간다
const CO_REP_UP = [0, 0, 40, 70], CO_REP_DOWN = 8;
const CO_OFFICE = [0, 100e4, 500e4, 2000e4];
const CO_TR_COST = [0, 50e4, 80e4, 120e4];
const CO_AUD_COST = [0, 300e4, 1000e4, 3000e4];
const CO_TR_CAP = [0, 8, 14, 24], CO_GRP_CAP = [0, 2, 3, 5], CO_TRAINER_CAP = [0, 2, 4, 6];
// v117 밸런스 B: 연습실 차이를 키웠다 (1.25 · 1.5 · 2 → 1.4 · 1.8 · 2.4)
const CO_EQ = { n: ['없음', '기본 연습실', '좋은 연습실', '최고급 연습실'], cost: [0, 3000e4, 1e8, 3e8], up: [0, 100e4, 250e4, 600e4], mult: [1, 1.4, 1.8, 2.4] };
// 앨범 제작비: 회사 크기별 최대, 그룹 팬이 30만 명이 되면 다 쓴다. 밴드는 절반
const CO_PROD = [0, 0.5e8, 1.5e8, 3e8];
const CO_CUT = 0.7, CO_TERM = 84;
// 회사 돈이 모자라 빚을 낼 때 내 빚이 이만큼을 넘으면 더 빌려주는 곳이 없다
const CO_DEBT_MAX = 5e8;
// 대표 등급 7단계: 가장 잘된 그룹 팬(버츄얼 아이돌은 기수 구독자의 절반) · 가장 높은 분야 평판 · 운영 중인 분야 크기의 합(소형 1 · 중형 2 · 대형 3)
// 맨 위 '초거대기업'은 분야가 둘 이상이어야 한다 (크기 합 4 이상)
// v99 (8-5): 대표 등급 이름을 회사 크기 이름으로 (사용자). 화면에는 'OO 대표'로, 회사 등급 칸에는 이름만
const CO_RANK = ['갓 차린 회사', '스타트업', '중소기업', '강소기업', '중견기업', '대기업', '초거대기업'];
const CO_RANK_UP = { fans: [0, 1, 1e4, 5e4, 5e5, 1.2e6, 1.2e6], rep: [0, 0, 15, 30, 45, 70, 85], size: [0, 1, 1, 1, 2, 3, 4] };
const CO_JOBS = { cast: '캐스팅 담당자', anr: 'A&R 팀장', trainer: '트레이너', edit: '편집자', pd: '기획 PD', prod: '사내 프로듀서' };
// 여러 명 둘 수 있는 직원 (나머지는 자리 하나)
// 사내 프로듀서 (v155): 그룹 수만큼 둘 수 있다. 그룹에 전담으로 붙이면 그 그룹 앨범의 기획 · 데모곡 확보 · 선정을 나 대신 한다
const CO_MULTI = ['trainer', 'edit', 'prod'];
// MCN: 소속 크리에이터 수(크기별) · 영입 제안 때 고르는 회사 몫 · 편집자 한 명이 맡는 크리에이터 수 · 합동 콘텐츠 비용
const CO_CR_CAP = [0, 8, 16, 30], CO_ED_CAP = [0, 2, 4, 6], CO_MCN_CUTS = [0.2, 0.25, 0.3], CO_ED_PER = 5, CO_MCOLLAB = 1000e4, CO_MADS = 3.5, CO_MGOODS = 200e4, CO_MEVENT_MIN = 3000e4;
const CO_TR_FIELDS = ['vocal', 'rap', 'dance', 'guitar', 'bass', 'drum', 'keyboard', 'variety', 'game', 'acting'];
const CO_IO = ['내가 넣은 돈', '내가 꺼낸 돈'];

// ───── 기본 조회 ─────
function coT(s) { return s.tracks.agency; }
function coOn(s) { return trackOn(s, 'agency'); }
function coP(s, ids) { return (ids || []).map(id => s.people[id]).filter(p => p && p.alive && p.co); }
function coTrainees(s, kind, f) { return coP(s, coT(s).tr).filter(x => (!kind || x.co.kind === kind) && (!f || x.co.f === f)); }
function coStaff(s, job) { return coP(s, coT(s).staff).filter(x => !job || x.co.job === job); }
function coGroup(s, gid) { return (coT(s).groups || []).find(g => g.id === gid); }
function coGFans(g) { return g.f.kr + g.f.jp + g.f.us; }
function coFields(t) { return Object.keys(t.f || {}); }
function coTier(t, f) { const F = t.f[f || t.main || 'music']; return F ? F.tier : 1; }
// 회사 전체의 크기: 가장 큰 분야 (직원 지원자 수준·트레이너 수)
function coTopTier(t) { return Math.max(1, ...coFields(t).map(f => t.f[f].tier)); }
function coSizeN(t, f) { f = f || t.main || 'music'; return `${TIER_N[coTier(t, f)]} ${CO_FIELDS[f].n}`; }
function coSizesN(t) { return coFields(t).map(f => coSizeN(t, f)).join(' · '); }
function coTierOfRep(rep, cur) { let k = cur || 1; while (k < 3 && rep >= CO_REP_UP[k + 1]) k++; while (k > 1 && rep < CO_REP_UP[k] - CO_REP_DOWN) k--; return k; }
function coKindN(kind) { return kind === 'band' ? '밴드' : kind === 'vt' ? '버츄얼 아이돌' : '아이돌'; }
function coFOfKind(kind) { return kind === 'vt' ? 'vidol' : 'music'; }
function coGroupsF(t, f) { return t.groups.filter(g => coFOfKind(g.kind) === f); }
function coCrs(s) { return coP(s, coT(s).crs); }
// 연습생을 두는 분야 (기획사·버츄얼 아이돌 기획사). MCN은 연습생이 없다
function coTrFields(t) { return coFields(t).filter(f => f !== 'mcn' && f !== 'video' && f !== 'anime'); }
function gNn(x) { return x.g === '여' ? '여' : '남'; }
// 회사 장부: 이번 달(L)·올해(Y). 넣고 꺼낸 돈(CO_IO)은 수입·지출에 넣지 않고 따로 보여 준다
function coLed(t, label, v) { v = Math.round(v); if (!v) return; t.L[label] = (t.L[label] || 0) + v; t.Y[label] = (t.Y[label] || 0) + v; }
function coIn(t, v, label) { v = Math.round(v); if (!(v > 0)) return 0; t.money += v; coLed(t, label, v); return v; }
function coOut(t, v, label) { v = Math.round(v); if (!(v > 0)) return 0; t.money -= v; coLed(t, label, -v); return v; }
function coSum(L) { let inc = 0, exp = 0; for (const k in L || {}) { if (CO_IO.includes(k)) continue; if (L[k] > 0) inc += L[k]; else exp -= L[k]; } return { inc, exp, net: inc - exp }; }
function coSumText(L) { const x = coSum(L); return `수입 ${fmtWon(x.inc)} · 지출 ${fmtWon(x.exp)} · ${x.net >= 0 ? '+' : '-'}${fmtWon(Math.abs(x.net))}`; }
// 매달 꼭 나가는 돈 (운영비·연습생·직원 월급·장비 유지비)
// 연습생 한 명의 매달 비용: 버츄얼 아이돌 연습생은 춤 연습실이 필요 없어 덜 든다
function coTrCost(t, f) { return CO_TR_COST[coTier(t, f)] * (f === 'vidol' ? 0.7 : 1); }
// 운영비: 분야마다 크기만큼. MCN은 연습실이 없어 다른 분야의 90%
function coOffice(t) { return coFields(t).reduce((a, f) => a + CO_OFFICE[coTier(t, f)] * (f === 'mcn' ? 0.9 : 1), 0); }
function coFixed(s, t) { return coOffice(t) + coTrainees(s).reduce((a, x) => a + coTrCost(t, x.co.f), 0) + coStaff(s).reduce((a, x) => a + (x.co.sal || 0), 0) + CO_EQ.up[t.eq || 0]; }

// ───── 돈 넣기 · 돈 꺼내기 ─────
// 돈 적는 칸 (v118 UI D4): 천만 원 단위로 적는다. 0.5처럼 소수도 된다 (만 원 단위로 반올림)
function wonVal(x) { const n = parseFloat(String(x == null ? '' : x).replace(/[^0-9.]/g, '')); return n > 0 ? Math.round(n * 1000) * 1e4 : 0; }
function coDeposit(s, t, v) { v = Math.round(v); addMoney(s, -v, '회사에 넣은 돈'); t.money += v; t.inv += v; coLed(t, '내가 넣은 돈', v); }
// 넣은 돈보다 많이 꺼낸 만큼만 '업계에서 번 돈'이 된다
function coWithdraw(s, t, v) {
  v = Math.round(v);
  const before = Math.max(0, t.out - t.inv);
  t.money -= v; t.out += v; coLed(t, '내가 꺼낸 돈', -v);
  addMoney(s, v, '회사에서 꺼낸 돈');
  const prof = Math.max(0, t.out - t.inv) - before;
  if (prof > 0) { s.earned += prof; s.mon.ent += prof; s.lastEntT = s.t; jobEarnAdd(s, 'agency', prof); }
}
E({
  id: 'co_money', cat: '회사 돈', tag: 'career',
  title: (s, d) => d.dir === 'in' ? '회사에 돈 넣기' : '회사에서 돈 꺼내기',
  cond: s => coOn(s),
  text: (s, d) => { const t = coT(s); return `회사 돈 ${fmtWon(t.money)} · 내 돈 ${fmtWon(s.money)}\n매달 꼭 나가는 돈 ${fmtWon(coFixed(s, t))}\n\n얼마를 ${d.dir === 'in' ? '넣을까' : '꺼낼까'}? (천만 원 단위)`; },
  form: (s, d) => { const mx = d.dir === 'in' ? s.money : coT(s).money; return [{ k: 'v', type: 'won', label: d.dir === 'in' ? '넣을 돈' : '꺼낼 돈', value: Math.min(mx, 1e8), max: mx }]; },
  cancel: () => '',
  submit(s, d, v) {
    const t = coT(s), x = wonVal(v.v);
    if (!(x > 0)) return { err: '금액을 숫자로 적어 주세요' };
    if (d.dir === 'in') { if (x > s.money) return { err: `내 돈이 모자라요 (지금 ${fmtWon(s.money)})` }; coDeposit(s, t, x); return { log: `「${t.name}」에 ${fmtWon(x)}을 넣었다. (회사 돈 ${fmtWon(t.money)})` }; }
    if (x > t.money) return { err: `회사 돈이 모자라요 (지금 ${fmtWon(t.money)})` };
    coWithdraw(s, t, x);
    return { log: `「${t.name}」에서 ${fmtWon(x)}을 꺼냈다. (회사 돈 ${fmtWon(t.money)})` };
  },
});

// ───── 회사 차리기 ─────
function coName() { return freshName(() => U.pick(['별', '해', '달', '온', '한', '새', '빛', '봄', '윤', '아라', '다온', '라온']) + U.pick(['빛', '길', '결', '담', '나래', '소리', '바람', '꽃']) + ' ' + U.pick(['엔터테인먼트', '엔터', '뮤직', '레이블', '컴퍼니'])); }
function coFoundWhy(s) {
  if (s.army) return '군 복무 중';
  if (age(s) < 20) return '20세부터 차릴 수 있다';
  if (agencyContract(s)) return `지금 ${josa(agencyContract(s), '과와')} 계약 중이라 회사를 차릴 수 없다`;
  if (s.money < CO_SEED) return `자본금 ${fmtWon(CO_SEED)}이 필요하다`;
  return '';
}
for (const f of Object.keys(CO_FIELDS)) JOB_APPLY.push({
  id: f === 'music' ? 'co_found' : 'co_found_' + f, trk: 'agency', g: '🏢 회사 대표', n: `${CO_FIELDS[f].n} 차리기`, tag: `자본금 ${fmtWon(CO_SEED)}부터`,
  show: s => !coOn(s) && age(s) >= 20,
  h: s => `${CO_FIELDS[f].what} · 내 돈 ${fmtWon(s.money)}`,
  ok: s => !coFoundWhy(s),
  why: s => coFoundWhy(s),
  run: s => { fireEvent(s, 'co_found', { f }); return ''; },
});
E({
  id: 'co_found', cat: '창업', title: (s, d) => `${CO_FIELDS[d.f].n} 차리기`, tag: 'career',
  init(s, d) { d.name = coName(); },
  text: (s, d) => `내 ${josa(CO_FIELDS[d.f].n, '을를')} 차린다. 자본금은 내 돈에서 회사 돈으로 옮겨진다.\n\n내 돈 ${fmtWon(s.money)} · 자본금은 1억 원부터 (천만 원 단위)`,
  form: (s, d) => [{ k: 'name', label: '회사 이름', value: d.name, max: 20 }, { k: 'cap', type: 'won', label: '자본금', value: CO_SEED, max: s.money }],
  cancel: () => '회사 차리기를 미뤘다.',
  submit(s, d, v) {
    const name = (v.name || '').trim(), cap = wonVal(v.cap);
    if (!name) return { err: '회사 이름을 적어 주세요' };
    const jb = jobBlock(s, 'agency');
    if (jb) return { err: jb };
    if (!(cap >= CO_SEED)) return { err: '자본금은 1억 원부터예요' };
    if (cap > s.money) return { err: `내 돈이 모자라요 (지금 ${fmtWon(s.money)})` };
    const old = s.tracks.agency || {};
    const t = s.tracks.agency = { st: 'active', name, main: d.f, founded: calY(s), months: 0, money: 0, inv: 0, out: 0, f: { [d.f]: { rep: 10, tier: 1 } }, tr: [], groups: [], staff: [], crs: [], vw: [], vdone: [], aw: [], adone: [], past: [], eq: 0, audCd: {}, gen: {}, L: {}, lastL: {}, Y: {}, lastY: {}, peakF: 0, rankMax: 0, awN: 0, hist: (old.hist || []).concat(old.name ? [`${old.name} (${old.founded}~${old.closed || ''})`] : []) };
    coDeposit(s, t, cap);
    (s.usedNames = s.usedNames || []).push(name);
    milestone(s, `${age(s)}세에 ${josa(`「${name}」`, '을를')} 차리고 대표가 되었다.`);
    const hadBiz = has(me(s), 'biz'), lm = learnMe(s, 'biz', null, true);
    return { log: `${CO_FIELDS[d.f].n} ${josa(`「${name}」`, '을를')} 차렸다! 자본금 ${fmtWon(cap)}. 맨 위 🏢 회사 버튼으로 회사를 관리한다.` + (!hadBiz && has(me(s), 'biz') ? `\n\n회사를 차리면서 '사업' 특기를 새로 얻었다. 회사를 운영할수록 늘고, 영업과 회사 일에 쓰인다.` : '') + lm };
  },
});
// 회사 정리: 소속된 사람은 모두 떠난다. 남은 회사 돈은 내 돈, 모자란 돈은 내 빚
function coClose(s, why) {
  const t = coT(s);
  for (const x of coTrainees(s)) { x.co = null; x.job = '전 연습생'; }
  for (const g of t.groups.slice()) coDisband(s, t, g, '회사 정리', true);
  for (const x of coStaff(s)) { x.job = `전 ${CO_JOBS[x.co.job]}`; x.co = null; }
  for (const x of coCrs(s)) { x.co = null; x.yt.mcn = null; }
  t.tr = []; t.staff = []; t.crs = []; t.vw = []; t.aw = [];
  let x = '';
  if (t.money > 0) { const m = t.money; coWithdraw(s, t, m); x = ` 남은 회사 돈 ${fmtWon(m)}은 내 돈이 됐다.`; }
  else if (t.money < 0) { s.debt += -t.money; x = ` 갚지 못한 회사 돈 ${fmtWon(-t.money)}은 내 빚이 됐다.`; t.money = 0; }
  t.st = 'ended'; t.closed = calY(s); t.endNote = `${t.name} 대표 (${why})`;
  milestone(s, `${age(s)}세에 ${josa(`「${t.name}」`, '을를')} 정리했다.`);
  return `${josa(`「${t.name}」`, '을를')} 정리했다.${x}`;
}
// 회사 돈이 바닥났을 때
E({
  id: 'co_short', cat: '회사 돈', title: '회사 돈이 바닥났다', tag: 'career',
  cond: s => coOn(s) && coT(s).money < 0,
  init(s, d) { const t = coT(s); d.need = Math.ceil((-t.money + coFixed(s, t)) / 1e6) * 1e6; },
  text: (s, d) => { const t = coT(s); return `「${t.name}」 회사 돈이 ${fmtWon(-t.money)} 모자라다. 이대로면 직원 월급과 연습생 비용을 낼 수 없다.\n\n매달 꼭 나가는 돈 ${fmtWon(coFixed(s, t))} · 내 돈 ${fmtWon(s.money)}`; },
  ch: (s, d) => [
    { t: '내 돈으로 메운다', h: `내 돈 ${fmtWon(d.need)}을 회사에 넣는다 (한 달 치 운영비 포함)`, ok: s => s.money >= d.need, f: s => { coDeposit(s, coT(s), d.need); return `내 돈 ${fmtWon(d.need)}을 회사에 넣어 급한 불을 껐다.`; } },
    { t: '빚을 내서 메운다', h: s.debt + d.need > CO_DEBT_MAX ? `빚이 ${fmtWon(s.debt)}이라 더 빌려주는 곳이 없다` : `빚 ${fmtWon(d.need)} · 이자가 붙는다`, ok: s => s.debt + d.need <= CO_DEBT_MAX, f: s => { const t = coT(s); s.debt += d.need; t.money += d.need; t.inv += d.need; coLed(t, '내가 넣은 돈', d.need); return `빚 ${fmtWon(d.need)}을 내서 회사에 넣었다.` + fx(s, { stress: 5 }); } },
    { t: '회사를 정리한다', f: s => coClose(s, '자금난') + fx(s, { stress: 8 }) },
  ],
});

// ───── 보는 눈 ─────
// 나와 직원(캐스팅 담당자·A&R 팀장) 중 그 분야를 더 잘 보는 사람의 눈으로 본다. 내 눈은 스카우트와 그 분야 특기를 함께 가졌을 때만 쓴다
// 고르는 건 언제나 내가 한다 (직원은 눈만 빌려준다)
function coViewer(s, job, k) {
  const p = me(s), mine = k ? (canScout(p, k) ? scoutLv(p, k) : -1) : (has(p, 'scout') ? lv(p, 'scout') : -1);
  let best = mine >= 0 ? p : null, bv = mine;
  for (const x of coStaff(s, job)) { const v = scoutLv(x, k); if (v > bv) { best = x; bv = v; } }
  return best || p;
}
function coLvSee(viewer, x, k) { const r = lvRange(viewer, x, k); return r[0] === r[1] ? String(r[0]) : `${r[0]}~${r[1]}`; }
// 회사 사람(연습생·소속 아티스트)이 가진 특기: 아이돌은 노래·랩·춤·예능, 밴드는 파트와 노래, 버츄얼 아이돌은 예능·노래·게임·연기
function coSkillsOf(x) { const ks = x.co.kind === 'band' ? [x.co.part, 'vocal'] : x.co.kind === 'vt' ? ['variety', 'vocal', 'game', 'acting'] : ['vocal', 'rap', 'dance', 'variety']; return [...new Set(ks)].filter(k => has(x, k)); }

// ───── 직원 뽑기 (캐스팅 담당자 · A&R 팀장 · 트레이너) ─────
// 지원자의 특기 레벨은 정확히 보인다. 회사가 클수록 실력 좋은 사람이 많이 지원한다
// boost: 캐스팅 담당자가 권한 분야의 트레이너를 구하면 담당자가 미리 알아봐 둔 만큼 조금 더 나은 사람이 온다 (v131)
function coStaffCand(s, t, job, k, boost) {
  // v132: 트레이너가 너무 잘 왔다 (갓 차린 회사에 64, 조금 크면 90대가 둘씩). 눈에 띄는 지원자를 드물게 하고, 분야 실력에 붙던 덤(+12~30)을 줄였다
  const tier = coTopTier(t), star = U.chance(job === 'trainer' ? 0.03 + tier * 0.03 : 0.08 + tier * 0.07);
  const L = Math.round(U.clamp(U.int(15, 42) + (tier - 1) * 12 + (star ? U.int(10, 25) : 0) + (boost || 0), 8, 95));
  const x = makePerson(s, { age: U.int(26, 52), rel: '업계', job: `${job === 'trainer' ? trFieldN(k) : CO_JOBS[job]} 지원자`, aff: 40 });
  if (job === 'cast') { learnSkill(s, x, 'scout', L); for (const f of CO_TR_FIELDS) if (U.chance(0.75)) learnSkill(s, x, f, Math.max(1, Math.round(L * U.fl(0.55, 0.95)))); }
  else if (job === 'anr') { learnSkill(s, x, 'scout', L); learnSkill(s, x, 'compose', Math.max(1, Math.round(L * U.fl(0.6, 1.05)))); if (U.chance(0.5)) learnSkill(s, x, 'lyric', Math.max(1, Math.round(L * U.fl(0.4, 0.9)))); }
  else if (job === 'edit') learnSkill(s, x, 'edit', Math.min(95, L + U.int(10, 25)));
  // 사내 프로듀서 (v155): 작곡 · 곡을 고르는 귀(스카우트) · 작사, 잘하는 컨셉 한두 개
  else if (job === 'prod') { learnSkill(s, x, 'compose', Math.min(92, L + U.int(0, 10))); learnSkill(s, x, 'scout', Math.max(1, Math.round(L * U.fl(0.6, 1)))); if (U.chance(0.6)) learnSkill(s, x, 'lyric', Math.max(1, Math.round(L * U.fl(0.5, 0.9)))); coCm(x); }
  // 기획 PD: 각본·감독·배우를 보는 눈 (스카우트와 작문·연출·연기)
  else if (job === 'pd') { learnSkill(s, x, 'scout', L); learnSkill(s, x, 'script', Math.max(1, Math.round(L * U.fl(0.6, 1.05)))); learnSkill(s, x, 'direct', Math.max(1, Math.round(L * U.fl(0.5, 0.95)))); learnSkill(s, x, 'acting', Math.max(1, Math.round(L * U.fl(0.4, 0.9)))); if (t.f.anime) learnSkill(s, x, 'art', Math.max(1, Math.round(L * U.fl(0.4, 0.9)))); }
  else { learnSkill(s, x, k, Math.min(92, L + U.int(0, 10))); learnSkill(s, x, 'edu', Math.max(1, L - U.int(0, 8))); }
  for (const kk of learnedSkills(x)) { const sk = x.sk[kk]; sk.lv = Math.min(sk.lv, 100); sk.best = sk.lv; sk.pot = Math.max(sk.pot, sk.lv); }
  const lvl = job === 'trainer' ? teachLv(x, k) : job === 'anr' ? scoutLv(x, 'compose') : job === 'edit' ? lv(x, 'edit') : job === 'prod' ? lv(x, 'compose') : lv(x, 'scout');
  x.co = { f: job === 'edit' ? 'mcn' : job === 'pd' ? (t.f.video ? 'video' : 'anime') : 'music', role: 'cand', job, k: k || null, sal: Math.round((job === 'edit' ? 100 + lvl * 2.5 : job === 'prod' ? 180 + lvl * 5 : 150 + lvl * 4) / 10) * 10 * 1e4 };
  return x;
}
function coStaffLine(x) {
  const j = x.co.job;
  return (j === 'trainer' ? `${SKILLS[x.co.k].n} ${lvi(x, x.co.k)} · 교육 ${lvi(x, 'edu')}` : j === 'edit' ? `편집 ${lvi(x, 'edit')}` : j === 'pd' ? `스카우트 ${lvi(x, 'scout')} · 작문 ${lvi(x, 'script')} · 연출 ${lvi(x, 'direct')} · 연기 ${lvi(x, 'acting')}${has(x, 'art') ? ` · 그림 ${lvi(x, 'art')}` : ''}` : j === 'anr' ? `스카우트 ${lvi(x, 'scout')} · 작곡 ${lvi(x, 'compose')}` : j === 'prod' ? `작곡 ${lvi(x, 'compose')} · 스카우트 ${lvi(x, 'scout')}${has(x, 'lyric') ? ` · 작사 ${lvi(x, 'lyric')}` : ''} · 잘하는 컨셉 ${coTopCm(x)}` : `스카우트 ${lvi(x, 'scout')}`) + ` · 월급 ${fmtWon(x.co.sal)}`;
}
// 그 사람이 잘하는 컨셉 (숙련도 45 이상, 없으면 가장 높은 하나)
function coTopCm(x) { const cm = coCm(x), L = TRENDS.slice().sort((a, b) => cm[b] - cm[a]); return L.filter(c => cm[c] >= 45).concat(L.slice(0, 1)).filter((c, i, A) => A.indexOf(c) === i).slice(0, 2).map(c => `'${c}'`).join(' · '); }
// 그룹에 붙은 전담 사내 프로듀서 (회사를 떠났으면 없다)
function coGProd(s, g) { const P = g && g.prod && s.people[g.prod]; return P && P.alive && P.co && P.co.job === 'prod' && coT(s).staff.includes(P.id) ? P : null; }
function coClean(s, ids, keep) { for (const id of ids || []) if (!keep.includes(id) && s.people[id] && s.people[id].co && s.people[id].co.role === 'cand') delete s.people[id]; }
function coFire(s, x) {
  const t = coT(s);
  t.staff = t.staff.filter(id => id !== x.id);
  if (x.co.job === 'prod') for (const g of t.groups) if (g.prod === x.id) g.prod = null;
  const n = x.co.job === 'trainer' ? trFieldN(x.co.k) : CO_JOBS[x.co.job];
  x.job = `전 ${n}`; x.co = null;
  return `${n} ${josa(x.name, '을를')} 내보냈다.`;
}
const CO_HIRE_CD = 3;
function coHireOK(s, job) {
  const t = coT(s), cd = (t.hireCd || {})[job] || 0;
  if (hasQ(s, 'co_hire') || hasQ(s, 'co_hire_tf')) return '지원서를 보는 중';
  if (cd > s.t) return `${cd - s.t}개월 뒤에 다시 뽑을 수 있다`;
  // 트레이너는 자리가 꽉 차 있어도 뽑을 수 있다 (v131): 새로 뽑은 다음에 내보낼 사람을 고른다 (co_tr_out)
  if (job === 'edit') { const m = coTier(t, 'mcn'); if (coStaff(s, 'edit').length >= CO_ED_CAP[m]) return `${TIER_N[m]} MCN은 편집자를 ${CO_ED_CAP[m]}명까지 둔다`; }
  if (job === 'prod') { const m = coTier(t, 'music'); if (coStaff(s, 'prod').length >= CO_GRP_CAP[m]) return `${TIER_N[m]} 기획사는 사내 프로듀서를 ${CO_GRP_CAP[m]}명까지 둔다`; }
  return '';
}
// 그 특기를 배우는 연습생 · 아티스트 수
function coTrNeedN(s, k) { return coP(s, coT(s).tr.concat(...coT(s).groups.map(g => g.members))).filter(x => has(x, k)).length; }
// 캐스팅 담당자의 조언 (v131): 배우는 사람은 많은데 트레이너가 없거나 약한 분야. 조언대로 구하면 담당자 스카우트만큼 더 나은 지원자가 온다
function coTrAdvice(s) {
  const cd = coStaff(s, 'cast')[0];
  if (!cd) return null;
  let best = null, bv = 0;
  for (const k of CO_TR_FIELDS) { const n = coTrNeedN(s, k), tr = coTrainer(s, k), v = n * (tr ? (1 - teachLv(tr, k) / 100) * 0.25 : 1); if (v > bv) { best = k; bv = v; } }
  return best ? { k: best, who: cd, boost: Math.round(lv(cd, 'scout') / 8) } : null;
}
E({
  id: 'co_hire_tf', cat: '직원 뽑기', title: '어떤 트레이너를 뽑을까?', tag: 'career',
  cond: s => coOn(s),
  text: s => { const a = coTrAdvice(s), k = coTopTier(coT(s)), n = coStaff(s, 'trainer').length; return `트레이너는 연습생과 소속 아티스트를 가르친다. 지금 트레이너 ${n}/${CO_TRAINER_CAP[k]}명: ${coStaff(s, 'trainer').map(x => `${trFieldN(x.co.k)} ${x.name}`).join(', ') || '없음'}${n >= CO_TRAINER_CAP[k] ? '\n\n자리가 꽉 찼다. 새로 뽑으면 그다음에 내보낼 사람을 고른다.' : ''}${a ? `\n\n캐스팅 담당자 ${a.who.name}: "지금은 ${trFieldN(a.k)}부터 구하는 게 좋겠어요. 제가 괜찮은 사람들을 알아봐 뒀어요."` : ''}`; },
  ch: s => { const a = coTrAdvice(s); return CO_TR_FIELDS.map(k => ({ t: trFieldN(k), rec: !!a && a.k === k, h: `이 특기를 가진 연습생·아티스트 ${coTrNeedN(s, k)}명${a && a.k === k ? ' · 캐스팅 담당자 추천' : ''}`, f: s => { fireEvent(s, 'co_hire', { job: 'trainer', k, boost: a && a.k === k ? a.boost : 0 }); return ''; } })).concat([{ t: '그만둔다', f: () => '' }]); },
});
// 트레이너 자리가 넘쳤다: 내보낼 사람을 고른다 (방금 뽑은 사람도 고를 수 있다)
E({
  id: 'co_tr_out', cat: '직원 뽑기', title: '누구를 내보낼까?', tag: 'career',
  cond: s => coOn(s),
  init(s, d) { if (coStaff(s, 'trainer').length <= CO_TRAINER_CAP[coTopTier(coT(s))]) d.skip = true; },
  text: (s, d) => `트레이너 자리가 ${CO_TRAINER_CAP[coTopTier(coT(s))]}명인데 지금 ${coStaff(s, 'trainer').length}명이다. 한 명을 내보내야 한다.`,
  ch: (s, d) => coStaff(s, 'trainer').map(x => ({ t: `${trFieldN(x.co.k)} ${x.name}${x.id === d.new ? ' (방금 뽑은 사람)' : ''}`, h: `${coStaffLine(x)} · 배우는 사람 ${coTrNeedN(s, x.co.k)}명`, f: s => { const r = coFire(s, x); if (coStaff(s, 'trainer').length > CO_TRAINER_CAP[coTopTier(coT(s))]) fireEvent(s, 'co_tr_out', { new: d.new }); return r; } })),
});
// 자동으로 뽑는데 자리가 꽉 찼다: 자동을 끌지 묻는다 (v131)
E({
  id: 'co_auto_full', cat: '자동', title: '자리가 꽉 찼다', tag: 'career', keepPop: true,
  cond: s => coOn(s),
  text: (s, d) => d.k === 'trainer' ? `트레이너 자리가 꽉 찼다 (${coStaff(s, 'trainer').length}/${CO_TRAINER_CAP[coTopTier(coT(s))]}명). 자동으로 트레이너 뽑기를 계속 켜 둘까?` : `${CO_FIELDS[d.k].n} 연습생 자리가 꽉 찼다 (${coTrainees(s, null, d.k).length}/${CO_TR_CAP[coTier(coT(s), d.k)]}명). 자동 오디션을 계속 켜 둘까?`,
  ch: (s, d) => [
    { t: '자동을 끈다', f: s => { coAuto(coT(s)).on[d.k] = false; return d.k === 'trainer' ? '자동으로 트레이너 뽑기를 껐다.' : '자동 오디션을 껐다.'; } },
    { t: '켜 둔다', h: '자리가 나면 다시 자동으로 연다', f: () => '' },
  ],
});
E({
  id: 'co_hire', cat: '직원 뽑기', tag: 'career',
  title: (s, d) => `${d.job === 'trainer' ? trFieldN(d.k) : CO_JOBS[d.job]} 지원자`,
  cond: s => coOn(s),
  init(s, d) { const t = coT(s); d.ids = [0, 1, 2].map(() => coStaffCand(s, t, d.job, d.k, d.boost).id); (t.hireCd = t.hireCd || {})[d.job] = s.t + CO_HIRE_CD; },
  text: (s, d) => { const cur = !CO_MULTI.includes(d.job) && coStaff(s, d.job)[0], same = d.job === 'trainer' ? coStaff(s, 'trainer').filter(x => x.co.k === d.k) : []; return (same.length ? `지금 우리 회사 ${trFieldN(d.k)}: ${same.map(x => `${x.name} (${coStaffLine(x)})`).join(', ')}\n\n` : '') + `${d.job === 'trainer' ? trFieldN(d.k) : CO_JOBS[d.job]} 자리에 세 명이 지원했다.${cur ? `\n\n지금 ${CO_JOBS[d.job]}: ${cur.name} (${coStaffLine(cur)}). 새로 뽑으면 지금 사람은 회사를 떠난다.` : ''}`; },
  ch: (s, d) => d.ids.map(id => s.people[id]).filter(Boolean).map(x => ({ t: `${x.name} (${gNn(x)} · ${pAge(s, x)}세)`, h: coStaffLine(x), f: s => {
    const t = coT(s), old = !CO_MULTI.includes(d.job) ? coStaff(s, d.job)[0] : null;
    coClean(s, d.ids, [x.id]);
    let tail = '';
    if (old) tail = ' ' + coFire(s, old);
    x.co.role = 'staff'; x.co.since = s.t; x.job = d.job === 'trainer' ? trFieldN(d.k) : CO_JOBS[d.job];
    t.staff.push(x.id);
    // 트레이너 자리가 넘치면 바로 내보낼 사람을 고른다 (v131)
    if (d.job === 'trainer' && coStaff(s, 'trainer').length > CO_TRAINER_CAP[coTopTier(t)]) fireEvent(s, 'co_tr_out', { new: x.id });
    return `${x.job} ${josa(x.name, '을를')} 뽑았다. 월급 ${fmtWon(x.co.sal)}.` + tail;
  } })).concat([{ t: '뽑지 않는다', f: s => { coClean(s, d.ids, []); return ''; } }]),
});

// ───── 오디션과 연습생 ─────
// 오디션은 분야마다 3개월에 한 번. 연습생 수는 그 분야 크기만큼
const CO_AUD_KINDS = { music: [['idol', '여', '아이돌 연습생 (여)'], ['idol', '남', '아이돌 연습생 (남)'], ['idol', 'any', '아이돌 연습생 (성별 무관)'], ['band', 'any', '밴드 연습생']], vidol: [['vt', '여', '버츄얼 아이돌 연습생 (여)'], ['vt', '남', '버츄얼 아이돌 연습생 (남)'], ['vt', 'any', '버츄얼 아이돌 연습생 (성별 무관)']] };
function coTrRoom(s, t, f) { return CO_TR_CAP[coTier(t, f)] - coTrainees(s, null, f).length; }
// 그 분야의 오디션이 진행 중인가 (v133). 예전에는 분야를 가리지 않아서, 기획사 오디션(자동)이 돌고 있으면 버츄얼 아이돌 오디션은 늘 '지원자를 추리는 중'이었고,
// 자동으로 여는 창도 같은 이름의 창이 이미 줄에 있으면 조용히 버려졌다
function coAudBusy(s, f) {
  const hit = (id, d) => (id === 'co_aud_pick' && ((d && d.f) || 'music') === f) || (id === 'co_aud' && !!d && coFOfKind(d.kind) === f) || (id === 'co_trn_out' && !!d && d.f === f);
  return s.queue.some(q => hit(q.id, q.d)) || (!!s.pending && hit(s.pending.id, s.pending.d));
}
function coAudWhy(s, f) {
  const t = coT(s), k = coTier(t, f), cd = (t.audCd || {})[f] || 0;
  if (coAudBusy(s, f)) return '지원자를 추리는 중';
  if (cd > s.t) return `${cd - s.t}개월 뒤에 다시 열 수 있다`;
  // 자리가 꽉 차 있어도 오디션은 열 수 있다 (v132): 뽑은 다음에 내보낼 사람을 고른다 (co_trn_out)
  if (t.money < CO_AUD_COST[k]) return '회사 돈이 모자라다';
  return '';
}
E({
  id: 'co_aud_pick', cat: '오디션', title: '어떤 오디션을 열까?', tag: 'career',
  cond: s => coOn(s),
  init(s, d) { d.f = d.f || 'music'; coFix(s, coT(s)); },
  text: (s, d) => { const t = coT(s); return `${CO_FIELDS[d.f].n} 오디션 · 비용 ${fmtWon(CO_AUD_COST[coTier(t, d.f)])} · 지원자는 다음 달에 추려진다.${coStaff(s, 'cast').length ? '' : '\n\n캐스팅 담당자가 없으면 지원자의 실력을 내 눈으로만 봐야 한다.'}`; },
  ch: (s, d) => CO_AUD_KINDS[d.f].map(([kind, g, n]) => ({ t: n, f: s => {
    const t = coT(s);
    coOut(t, CO_AUD_COST[coTier(t, d.f)], '오디션');
    t.audCd[d.f] = s.t + 3;
    queueEv(s, 'co_aud', 1, { kind, g }, true);
    return `「${t.name}」 ${n} 오디션을 열었다.`;
  } })).concat([{ t: '그만둔다', f: () => '' }]),
});
// 오디션 지원자: 회사가 클수록 재능 있는 지원자가 많이 오고, 캐스팅 담당자가 좋을수록 숨은 원석(높은 성장성)을 더 잘 데려온다
function coCand(s, t, kind, g) {
  const f = coFOfKind(kind), tier = coTier(t, f), cd = coStaff(s, 'cast')[0], eye = cd ? lv(cd, 'scout') : 0;
  const a = kind === 'band' ? U.int(15, 24) : kind === 'vt' ? U.int(16, 25) : U.int(12, 19);
  const tal = randTalents();
  const boost = kind === 'band' ? ['music', 'rhythm', 'hands', 'star'] : kind === 'vt' ? ['voice', 'humor', 'express', 'star', 'music'] : ['music', 'voice', 'rhythm', 'looks', 'star', 'athletic'];
  for (const k of boost) if (U.chance(0.35 + tier * 0.12)) tal[k] = Math.min(97, Math.round(tal[k] + U.int(2, 10) + (tier - 1) * 5 + eye / 15));
  const x = makePerson(s, { g, age: a, rel: '업계', job: '연습생 지원자', aff: 40, tal, met: `${t.name} 오디션` });
  const base = 2 + (a - 12) * 1.2 + (tier - 1) * 4, sk = {};
  let part = null;
  if (kind === 'band') { part = U.pick(['vocal', 'guitar', 'guitar', 'bass', 'drum', 'keyboard']); sk[part] = base + 10; if (part !== 'vocal' && U.chance(0.35)) sk.vocal = base; }
  else if (kind === 'vt') {
    // 버츄얼 아이돌: 예능(말솜씨)이 바탕이고, 노래·게임·연기 중 한두 가지를 더 한다
    sk.variety = base + 6;
    for (const k of U.shuffle(['vocal', 'game', 'acting']).slice(0, U.int(1, 2))) sk[k] = base + (k === 'vocal' ? 2 : 0);
  } else {
    const main = U.pick(['vocal', 'dance', 'rap', 'vocal', 'dance']);
    sk.vocal = base + (main === 'vocal' ? 8 : 0); sk.dance = base + (main === 'dance' ? 8 : 0);
    if (main === 'rap' || U.chance(0.3)) sk.rap = base + (main === 'rap' ? 8 : -3);
    if (U.chance(0.4)) sk.variety = base - 4;
  }
  for (const k in sk) {
    const l = Math.round(U.clamp(U.normal(sk[k], 4), 1, 60));
    learnSkill(s, x, k, l); x.sk[k].lv = l; x.sk[k].best = l;
    // 성장성: 큰 회사일수록 원석이 많이 온다 (소형 -6, 중형 -1, 대형 +4)
    const pb = [0, -6, -1, 4][tier];
    let pot = rollPot(x, k) + pb;
    if (eye && U.chance(eye / 110)) pot = Math.max(pot, rollPot(x, k) + pb);
    x.sk[k].pot = Math.round(U.clamp(Math.max(l + 4, pot), 1, 100));
  }
  x.co = { f, role: 'cand', kind, part };
  return x;
}
function coCandLabel(s, x) { return `${x.name} (${gNn(x)} · ${pAge(s, x)}세 · ${x.look}${soulTag(x)}${x.co.part ? ` · ${partN(x.co.part)}` : ''})`; }
// 지원자: 특기 레벨은 범위, 성장성은 5단계. 외모는 보이는 대로, 스타성은 5단계 (내 스타성은 숨기지만 지원자 것은 보인다, 피드백 31)
function coCandSub(s, x) {
  const sk = coSkillsOf(x).map(k => { const v = coViewer(s, 'cast', k); return `${SKILLS[k].n} ${coLvSee(v, x, k)} (성장성 ${potGrade(v, x, k)})`; }).join(' · ');
  return `${sk} · ${x.co.kind === 'vt' ? `목소리 ${talentWord(x.tal.voice)}` : `외모 ${talentWord(x.tal.looks)}`} · 스타성 ${grade5(coViewer(s, 'cast', null), x.tal.star, 'pot')}`;
}
// 소속 연습생·아티스트: 특기 레벨은 정확히(매달 평가한다), 성장성은 계속 5단계
function coMemberSub(s, x) { return coSkillsOf(x).map(k => `${SKILLS[k].n} ${lvi(x, k)} (성장성 ${potGrade(coViewer(s, 'cast', k), x, k)})`).join(' · '); }
// ───── 표로 고르는 창 (v131, FM식) ─────
// 칸 = [정렬에 쓰는 값, 보이는 글]. 정렬 값은 화면에 보이는 것(범위의 가운데 · 5단계 순서)만 쓴다 (숨은 값이 순서로 새지 않게)
function coCellLv(v, x, k, exact) { if (!has(x, k)) return [-1, '-']; if (exact) return [lvi(x, k), String(lvi(x, k))]; const r = lvRange(v, x, k); return [(r[0] + r[1]) / 2, r[0] === r[1] ? String(r[0]) : `${r[0]}~${r[1]}`]; }
function coCellG(word, kind) { return [GRADE_W[kind || 'pot'].indexOf(word), word || '-']; }
function coCellTal(v) { return [v >= 85 ? 4 : v >= 70 ? 3 : v >= 50 ? 2 : v >= 30 ? 1 : 0, talentWord(v)]; }
// 연습생 · 지원자 표: 이름 · 성별 · 나이 · (파트) · 특기마다 레벨과 성장성 · 외모(버츄얼은 목소리) · 스타성. exact: 소속 연습생은 레벨이 정확히 보인다
// v132: 성장성은 따로 칸을 두지 않고 특기 칸에 같이 쓴다 ('보컬 (성장성)' 칸에 '1~27 (높음)'). 줄 세우기는 레벨로 한다
// kind가 없으면(연습생을 내보낼 때처럼 아이돌 · 밴드가 섞인 표) 가진 특기를 모두 칸으로 두고 '종류' 칸을 더한다
function coPplTbl(s, P, kind, exact, on) {
  const mix = !kind, hasPart = P.some(x => x.co.part), allVt = P.length > 0 && P.every(x => x.co.kind === 'vt');
  const ks = mix ? CO_TR_FIELDS.filter(k => P.some(x => coSkillsOf(x).includes(k))) : kind === 'band' ? [...new Set(P.map(x => x.co.part).concat(P.some(x => has(x, 'vocal')) ? ['vocal'] : []))] : kind === 'vt' ? ['variety', 'vocal', 'game', 'acting'] : ['vocal', 'rap', 'dance', 'variety'];
  const vt = kind === 'vt' || (mix && allVt);
  const cols = [['n', '이름'], ['g', '성별'], ['a', '나이']].concat(mix ? [['kd', '종류']] : [], (mix ? hasPart : kind === 'band') ? [['part', '파트']] : [], ks.map(k => [k, `${SKILLS[k].n} (성장성)`]), [['lk', vt ? '목소리' : '외모'], ['st', '스타성']], exact ? [['mo', '연습']] : []);
  const rows = P.map(x => {
    const c = { n: [x.name, x.name + soulTag(x)], g: [gNn(x), gNn(x)], a: [pAge(s, x), `${pAge(s, x)}세`], lk: coCellTal(vt ? x.tal.voice : x.tal.looks), st: coCellG(grade5(coViewer(s, 'cast', null), x.tal.star, 'pot')) };
    if (mix) c.kd = [coKindN(x.co.kind), coKindN(x.co.kind)];
    c.part = x.co.part ? [partN(x.co.part), partN(x.co.part)] : ['', '-'];
    for (const k of ks) { const v = coViewer(s, 'cast', k), l = coCellLv(v, x, k, exact); c[k] = has(x, k) ? [l[0], `${l[1]} (${potGrade(v, x, k)})`] : [-1, '-']; }
    if (exact) c.mo = [s.t - x.co.since, `${s.t - x.co.since}개월`];
    return { k: x.id, on: (on || []).includes(x.id), cells: c };
  });
  // 사람 표는 어디서든 나이순으로 시작한다 (v148: 예전엔 오디션 표만 나이순이고 연습생 내보내기 · 그룹 만들기 · 데뷔조 표는 들어온 순서였다)
  return { cols, rows, sort: ['a', 1] };
}
// 트레이너가 권하는 데뷔 멤버 (v133): 트레이너마다 딱 한 명. 표에서 그 줄에 초록 테두리와 '○○ 트레이너 추천'이 붙는다
// 자기 분야를 더 무겁게 보고, 가르치는 실력이 낮을수록 잘못 본다 (같은 해에는 같은 추천). 돌려주는 값: { 연습생 id: '보컬 트레이너 추천' }
function coTrRecs(s, kind) {
  const L = coTrainees(s, kind), ks = kind === 'band' ? ['vocal', 'guitar', 'bass', 'drum', 'keyboard'] : ['vocal', 'rap', 'dance'], out = {};
  if (L.length < 2) return out;
  for (const tr of coStaff(s, 'trainer').filter(tr => ks.includes(tr.co.k))) {
    const k = tr.co.k, w = 3 + 14 * (1 - U.clamp(teachLv(tr, k), 0, 100) / 100), noise = x => (hashN(tr.id + x.id + calY(s)) % 1001 / 500 - 1) * w;
    const val = kind === 'band' ? x => (x.co.part === k ? lv(x, k) + 20 : lv(x, x.co.part) * 0.6) + noise(x) : x => lv(x, k) * 0.6 + (lv(x, 'vocal') + lv(x, 'dance')) * 0.15 + (x.tal.looks - 50) * 0.1 + (x.tal.star - 50) * 0.08 + noise(x);
    const best = L.slice().sort((a, b) => val(b) - val(a))[0];
    if (best) out[best.id] = (out[best.id] ? out[best.id] + ' · ' : '') + `${trFieldN(k).replace(/ \(.*\)$/, '')} 추천`;
  }
  return out;
}
E({
  id: 'co_aud', cat: '오디션', tag: 'career',
  tbl: (s, d) => Object.assign(coPplTbl(s, d.ids.map(id => s.people[id]).filter(Boolean), d.kind, false, []), { sort: ['a', 1] }),
  title: (s, d) => `${coKindN(d.kind)} 오디션 지원자`,
  cond: s => coOn(s),
  init(s, d) { const t = coT(s); d.ids = Array.from({ length: U.int(4, 6) }, () => coCand(s, t, d.kind, d.g === 'any' ? (U.chance(0.5) ? '여' : '남') : d.g).id); },
  text: (s, d) => { const t = coT(s), f = coFOfKind(d.kind), k = coTier(t, f); return `내 스카우트 ${lvi(me(s), 'scout')}\n\n${coKindN(d.kind)} 오디션에서 ${d.ids.length}명이 최종까지 올라왔다. 계약할 사람을 체크하자.\n\n${CO_FIELDS[f].n} 연습생 ${coTrainees(s, null, f).length}/${CO_TR_CAP[k]}명 · 한 명당 매달 ${fmtWon(coTrCost(t, f))}`; },
  form: (s, d) => d.ids.map(id => s.people[id]).filter(Boolean).map(x => ({ k: x.id, type: 'check', label: coCandLabel(s, x), sub: coCandSub(s, x) })),
  cancel: (s, d) => { coClean(s, d.ids, []); return '이번 오디션에서는 아무도 뽑지 않았다.'; },
  submit(s, d, v) {
    const t = coT(s), pick = d.ids.filter(id => v[id] && s.people[id]);
    const f = coFOfKind(d.kind), room = coTrRoom(s, t, f);
    coClean(s, d.ids, pick);
    if (!pick.length) return { log: '이번 오디션에서는 아무도 뽑지 않았다.' };
    for (const id of pick) { const x = s.people[id]; x.job = '연습생'; x.co.role = 'tr'; x.co.since = s.t; t.tr.push(id); }
    // 자리가 넘치면 바로 내보낼 사람을 고른다 (v132): 예전엔 자리가 없으면 뽑을 수 없었다
    if (pick.length > room) fireEvent(s, 'co_trn_out', { f, n: pick.length - Math.max(0, room), new: pick.slice() });
    return { log: `${josa(pick.map(id => s.people[id].name).join(', '), '과와')} 연습생 계약을 했다.` };
  },
});
// 연습생 자리가 넘쳤다 (v132): 넘친 수만큼 내보낼 사람을 표에서 체크한다. 방금 뽑은 사람도 고를 수 있다
E({
  id: 'co_trn_out', cat: '오디션', title: '누구를 내보낼까?', tag: 'career',
  cond: s => coOn(s),
  init(s, d) { const t = coT(s); d.n = Math.min(d.n, Math.max(0, -coTrRoom(s, t, d.f))); if (d.n <= 0) d.skip = true; },
  text: (s, d) => { const t = coT(s); return `${CO_FIELDS[d.f].n} 연습생 자리는 ${CO_TR_CAP[coTier(t, d.f)]}명인데 지금 ${coTrainees(s, null, d.f).length}명이다. 내보낼 사람 ${d.n}명을 체크하자.`; },
  form: (s, d) => coTrainees(s, null, d.f).map(x => ({ k: x.id, type: 'check', label: coCandLabel(s, x), sub: coMemberSub(s, x) })),
  tbl: (s, d) => { const P = coTrainees(s, null, d.f), T = coPplTbl(s, P, null, true, []); for (const r of T.rows) if ((d.new || []).includes(r.k)) r.cells.n = [r.cells.n[0], r.cells.n[1] + ' (방금 뽑음)']; return T; },
  cancel: (s, d) => { const L = (d.new || []).map(id => s.people[id]).filter(x => x && x.co && x.co.role === 'tr').slice(-d.n); for (const x of L) coRelease(s, x); return L.length ? `자리가 없어 방금 뽑은 ${josa(L.map(x => x.name).join(', '), '을를')} 돌려보냈다.` : ''; },
  submit(s, d, v) {
    const L = coTrainees(s, null, d.f).filter(x => v[x.id] && v[x.id] !== 'false');
    if (L.length !== d.n) return { err: `${d.n}명을 체크해 주세요 (지금 ${L.length}명)` };
    for (const x of L) coRelease(s, x);
    return { log: `연습생 ${josa(L.map(x => x.name).join(', '), '을를')} 내보냈다.` };
  },
});
// 데뷔를 기다리다 지쳐 떠난 연습생 (피드백 31: 기록만이 아니라 창으로). 같은 달에 여럿이면 한 창에 모은다
function coTrLeftLine(x) { return `연습생 ${x.n}(${x.a}세)${josa(x.n, '이가').slice(x.n.length)} 데뷔를 기다리다 지쳐 회사를 떠났다.`; }
E({
  id: 'co_tr_left', cat: '연습생', title: '연습생이 떠났다', tag: 'career',
  cond: s => coOn(s),
  text: (s, d) => d.L.map(coTrLeftLine).join('\n'),
  ch: (s, d) => [{ t: '확인', f: () => d.L.map(coTrLeftLine).join(' ') }],
});
// 연습생 키우기: 트레이너(그 분야 가르치는 실력) · 연습실 장비 · 대표가 직접 가르치기
function coTrainer(s, k) { return coStaff(s, 'trainer').filter(x => x.co.k === k).sort((a, b) => teachLv(b, k) - teachLv(a, k))[0] || null; }
function coTrainMonth(s, t, teach) {
  const p = me(s), eqm = CO_EQ.mult[t.eq || 0], left = [];
  for (const x of coTrainees(s)) {
    for (const k of coSkillsOf(x)) {
      const tr = coTrainer(s, k);
      // v117 밸런스 B: 기본을 조금 올리고, 트레이너 · 대표가 직접 가르치는 효과를 크게 (연습생 1~2년이면 데뷔를 생각해 볼 만큼)
      let base = (k === 'variety' && x.co.kind !== 'vt' ? 1 : 3.5) * (tr ? 1 + teachLv(tr, k) / 30 : 1);
      if (teach && has(p, k)) base += teachLv(p, k) / 12;
      practice(s, x, k, base, eqm);
    }
    // 데뷔를 오래 기다린 연습생은 나이가 차면 떠난다
    const a = pAge(s, x);
    if (a >= (x.co.kind === 'idol' ? 23 : 27) && s.t - x.co.since >= 12 && U.chance(0.08)) {
      t.tr = t.tr.filter(id => id !== x.id); x.co = null; x.job = '전 연습생';
      left.push({ n: x.name, a });
    }
  }
  if (left.length) { const q = s.queue.find(q => q.id === 'co_tr_left'); if (q) q.d.L.push(...left); else queueEv(s, 'co_tr_left', 0, { L: left }, true); }
  // 데뷔조 (v131): 같이 연습하며 합을 맞춘다. 합은 매달 조금씩 올라 1년 반쯤이면 다 찬다. 떠난 연습생은 빠지고, 둘이 안 되면 풀린다
  for (const q of (t.squads || []).slice()) {
    q.ids = q.ids.filter(id => t.tr.includes(id) && s.people[id] && s.people[id].co && s.people[id].co.kind === q.kind);
    if (q.ids.length < 2) { t.squads = t.squads.filter(x => x !== q); addLog(s, `데뷔조 「${q.name}」에 남은 사람이 없어 데뷔조를 풀었다.`, 'career'); continue; }
    q.tw = Math.min(CO_SQ_MAX, (q.tw || 0) + 2.2);
    if (q.tw >= 30 && !q.told) { q.told = 1; queueEv(s, 'co_sq_ready', 0, { kind: q.kind }, true); }
    for (const id of q.ids) { const x = s.people[id], k = q.kind === 'band' ? x.co.part : q.kind === 'vt' ? 'variety' : 'dance'; if (has(x, k)) practice(s, x, k, 1, eqm); }
  }
  for (const x of coStaff(s, 'trainer')) if (U.chance(0.3)) practice(s, x, 'edu', 0.5);
  for (const x of coStaff(s, 'edit')) if (U.chance(0.3)) practice(s, x, 'edit', 0.5);
  // 직원은 65세가 넘으면 은퇴한다
  for (const x of coStaff(s)) if (pAge(s, x) >= 65 && U.chance(0.08)) { const n = x.co.job === 'trainer' ? trFieldN(x.co.k) : CO_JOBS[x.co.job]; t.staff = t.staff.filter(id => id !== x.id); x.co = null; x.job = `은퇴한 ${n}`; addLog(s, `${n} ${josa(x.name, '이가')} 은퇴했다.`, 'career'); }
}
function coRelease(s, x) {
  const t = coT(s);
  t.tr = t.tr.filter(id => id !== x.id); x.co = null; x.job = '전 연습생';
  return `연습생 ${josa(x.name, '을를')} 내보냈다.`;
}

// ───── 그룹 만들기 ─────
function coBandMissing(ids, s) { const have = new Set(ids.map(id => s.people[id].co.part)); return BAND_NEED.filter(k => !have.has(k)); }
function coMakeWhy(s, kind) {
  const t = coT(s), f = coFOfKind(kind), k = coTier(t, f), n = coTrainees(s, kind).length;
  if (hasQ(s, 'co_make') || hasQ(s, 'co_sig') || hasQ(s, 'co_vav')) return kind === 'vt' ? '기수를 데뷔시키는 중' : '그룹을 만드는 중';
  if (coGroupsF(t, f).filter(g => !g.proj).length >= CO_GRP_CAP[k]) return `${coSizeN(t, f)}는 ${kind === 'vt' ? '활동하는 기수를' : '그룹을'} ${CO_GRP_CAP[k]}${kind === 'vt' ? '개' : '팀'}까지 둔다`;
  if (kind === 'band') { if (coBandMissing(coT(s).tr.filter(id => s.people[id] && s.people[id].co && s.people[id].co.kind === 'band'), s).length) return '보컬·기타·베이스·드럼 연습생이 모두 있어야 한다'; return ''; }
  if (kind === 'vt') return n < 1 ? '버츄얼 아이돌 연습생이 있어야 한다' : '';
  return n < 2 ? '아이돌 연습생이 두 명 이상 있어야 한다' : '';
}
// 버츄얼 아이돌 기수 번호 (이 회사의 몇 기)
function coNextGen(t) { return ((t.gen || {}).vidol || 0) + 1; }
E({
  id: 'co_make', cat: '그룹 만들기', tag: 'career',
  tbl: (s, d) => { const T = coPplTbl(s, coTrainees(s, d.kind), d.kind, true, d.ids || []), R = d.kind === 'vt' ? {} : coTrRecs(s, d.kind); for (const r of T.rows) if (R[r.k]) r.rec = R[r.k]; return T; },
  title: (s, d) => d.kind === 'band' ? '밴드 만들기' : d.kind === 'vt' ? '기수 데뷔' : '아이돌 그룹 만들기',
  cond: s => coOn(s),
  init(s, d) { if (d.name) return; d.name = d.kind === 'vt' ? `${coNextGen(coT(s))}기` : newGroupName(s, 0); if (d.kind !== 'band') d.fandom = U.pick(FANDOM_NAMES); },
  text: (s, d) => d.kind === 'band' ? '데뷔시킬 밴드 멤버를 체크하자. 보컬·기타·베이스·드럼이 꼭 있어야 한다 (4~6명).' : d.kind === 'vt' ? '같은 기수로 데뷔시킬 연습생을 체크하자 (1~6명, 한 명이면 솔로 데뷔). RP 이름은 회사가 지어 준다.' : '데뷔시킬 멤버를 체크하자 (2~9명). 포지션은 실력에 맞게 정해진다.',
  form: (s, d) => [{ k: 'name', label: d.kind === 'band' ? '밴드 이름' : d.kind === 'vt' ? '기수 이름' : '그룹 이름', value: d.name, max: 16 }].concat(d.kind === 'band' ? [] : [{ k: 'fandom', label: '팬덤 이름', value: d.fandom, max: 12 }], coTrainees(s, d.kind).map(x => ({ k: x.id, type: 'check', on: (d.ids || []).includes(x.id), label: coCandLabel(s, x), sub: `${coMemberSub(s, x)} · 연습 ${s.t - x.co.since}개월` }))),
  cancel: () => '',
  submit(s, d, v) {
    const t = coT(s), name = (v.name || '').trim(), fandom = (v.fandom || '').trim(), ids = coTrainees(s, d.kind).map(x => x.id).filter(id => v[id] && v[id] !== 'false');
    if (!name) return { err: '이름을 적어 주세요' };
    if (d.kind !== 'band' && !fandom) return { err: '팬덤 이름을 적어 주세요' };
    if (d.kind === 'band') { if (ids.length < 4 || ids.length > 6) return { err: '밴드는 4~6명이에요' }; const miss = coBandMissing(ids, s); if (miss.length) return { err: `${miss.map(partN).join('·')} 파트가 없어요` }; }
    else if (d.kind === 'vt') { if (ids.length < 1 || ids.length > 6) return { err: '한 기수는 1~6명이에요' }; }
    else if (ids.length < 2 || ids.length > 9) return { err: '아이돌 그룹은 2~9명이에요' };
    // v118 UI D3: 밴드 · 아이돌은 바로 만들지 않고 확인 창(직원 한마디 · 사내 데뷔평가)을 거친다
    // v134: 버츄얼 아이돌 기수도 확인 창을 거친다 (바로 데뷔 · 데뷔조로 묶기 · 다시 고르기). 사내 데뷔평가와 직원 한마디는 아이돌 · 밴드만
    fireEvent(s, 'co_make_ok', { kind: d.kind, name, fandom, ids }); return { log: '' };
  },
});
// ───── 데뷔 전 확인 · 사내 데뷔평가 (v118 UI D3) ─────
// ───── 데뷔조 (v131) ─────
// 데뷔 확인 창에서 '데뷔조로 묶어 둔다'를 고르면 그 멤버끼리 같이 연습하며 합(q.tw, 0~CO_SQ_MAX)을 맞춘다. 종류(아이돌 · 밴드)마다 하나
// 합은 숫자로 보이지 않고 말로만 보인다. 데뷔하면 그룹이 그 합을 안고 시작한다 (g.tw0 → 그룹 실력 최대 +10%)
const CO_SQ_MAX = 40;
function coSquad(t, kind) { return (t.squads || []).find(q => q.kind === kind) || null; }
function coSquadTw(t, kind, ids) { const q = coSquad(t, kind); if (!q || !ids.length) return 0; return (q.tw || 0) * ids.filter(id => q.ids.includes(id)).length / ids.length; }
function coTwWord(v) { return v >= 30 ? '합이 잘 맞는다' : v >= 14 ? '손발이 맞아 간다' : '아직 서로 어색하다'; }
function coSquadSet(s, d) { const t = coT(s); t.squads = (t.squads || []).filter(q => q.kind !== d.kind); const old = coSquadTw(t, d.kind, d.ids); t.squads.push({ kind: d.kind, name: d.name, fandom: d.fandom || '', ids: d.ids.slice(), t0: s.t, tw: old }); }
function coSquadSame(t, d) { const q = coSquad(t, d.kind); return !!q && q.ids.length === d.ids.length && d.ids.every(id => q.ids.includes(id)); }
// 데뷔조의 합이 가장 높은 단계('합이 잘 맞는다')가 됐다 (v133): 창으로 알린다
E({
  id: 'co_sq_ready', cat: '데뷔조', title: '데뷔조의 합이 맞기 시작했다', tag: 'career', keepPop: true,
  cond: s => coOn(s),
  init(s, d) { if (!coSquad(coT(s), d.kind)) d.skip = true; },
  text: (s, d) => { const q = coSquad(coT(s), d.kind); return `${coKindN(q.kind)} 데뷔조 「${q.name}」(${coP(s, q.ids).map(x => x.name).join(', ')})가 같이 연습한 지 ${s.t - q.t0}개월이 됐다.\n\n${evG('이제 합이 잘 맞는다.')} 무대에 세워 볼 만해졌다.`; },
  ch: (s, d) => [
    { t: '데뷔시키러 간다', f: s => { const q = coSquad(coT(s), d.kind); if (q && !coMakeWhy(s, q.kind)) fireEvent(s, 'co_make_ok', { kind: q.kind, name: q.name, fandom: q.fandom, ids: q.ids.slice() }); return q ? `데뷔조 「${q.name}」의 합이 잘 맞기 시작했다.` : ''; } },
    { t: '조금 더 지켜본다', f: s => { const q = coSquad(coT(s), d.kind); return q ? `데뷔조 「${q.name}」의 합이 잘 맞기 시작했다. 조금 더 지켜보기로 했다.` : ''; } },
  ],
});
// 고른 멤버로 꾸린 그룹의 실력 (만들기 전이라 임시 그룹으로 잰다). 데뷔조로 맞춘 합도 들어간다
function coTryPower(s, kind, ids) { return coPower(s, { kind, members: ids, pos: kind === 'band' ? {} : assignIdolPos(s, ids), tw0: coSquadTw(coT(s), kind, ids) }); }
// 개별 평가 (v131): 사내 데뷔평가에서 한 명 한 명이 어땠는지 말로만. 요즘 신인 실력대와 견준다
function coEvalEach(s, kind, ids) {
  // 좋은 평은 초록, 나쁜 평은 빨강, 애매한 평은 검정 (v132)
  const bar = coRookieBar(s, kind), w = (n, v, c) => v >= c + 8 ? evG(`${n} 눈에 띈다`) : v >= c - 5 ? `${n} 무난하다` : evB(`${n} 아직 부족하다`);
  return ids.map(id => s.people[id]).filter(Boolean).map(x => {
    const ks = kind === 'band' ? [x.co.part].concat(x.co.part !== 'vocal' && has(x, 'vocal') ? ['vocal'] : []) : ['vocal', 'dance', 'rap'].filter(k => has(x, k));
    const L = ks.map(k => w(SKILLS[k].n, lv(x, k), k === 'rap' ? bar - 5 : k === 'dance' ? bar - 3 : bar));
    if (kind !== 'band') { const lk = `외모 ${talentWord(x.tal.looks)}`; L.push(x.tal.looks >= 70 ? evG(lk) : x.tal.looks < 30 ? evB(lk) : lk); }
    if (x.tal.star >= 68) L.push(evG('무대 체질이다')); else if (x.tal.star < 35) L.push(evB('무대에서 잘 안 보인다'));
    return [`${x.name}${x.co.part ? ` (${partN(x.co.part)})` : ''}`, L.join(' · ')];
  });
}
// 요즘 데뷔하는 신인들 실력대: 해마다 조금씩 다르다 (숫자는 어디에도 보이지 않는다)
function coRookieBar(s, kind) { return (kind === 'band' ? 46 : 44) + hashN('rookie' + calY(s)) % 9 - 4; }
// 한마디 할 사람: 트레이너 · A&R 팀장 중 보는 눈이 가장 좋은 사람, 없으면 나 ('내 눈엔…')
// 보는 눈이 나쁠수록 틀린다. 같은 멤버 · 같은 달이면 같은 말을 한다
function coJudge(s, kind, ids) {
  const ks = kind === 'band' ? BAND_NEED : ['vocal', 'rap', 'dance'], my = lv(me(s), 'scout');
  let who = null, eye = -1;
  for (const x of coStaff(s)) {
    const v = x.co.job === 'trainer' ? teachLv(x, x.co.k) * (ks.includes(x.co.k) ? 1 : 0.6) : x.co.job === 'anr' ? Math.max(lv(x, 'scout'), lv(x, 'compose') * 0.7) : -1;
    if (v > eye) { who = x; eye = v; }
  }
  eye = Math.max(eye, my);
  const w = 3 + 15 * (1 - U.clamp(eye, 0, 100) / 100), r = hashN(ids.slice().sort().join() + s.t) % 1001 / 500 - 1;
  const est = coTryPower(s, kind, ids) + r * w, bar = coRookieBar(s, kind);
  const k = est < bar - 5 ? 0 : est < bar + 7 ? 1 : 2;
  const col = x => k === 0 ? evB(x) : k === 2 ? evG(x) : x;
  if (!who) return `내 눈엔… ${col(['아직 무대에 세우기엔 이르다.', '무대에 설 만은 하다.', '당장 내보내도 되겠다.'][k])}`;
  return `${coStaffN(who)} ${who.name}: ${col(`"${['아직 무대에 세우기엔 일러요.', '무대에 설 만은 해요.', '당장 내보내도 되겠어요.'][k]}"`)}`;
}
function coStaffN(x) { return x.co.job === 'trainer' ? trFieldN(x.co.k) : CO_JOBS[x.co.job]; }
const CO_EVAL_COST = [0, 500e4, 1000e4, 2000e4];
function coEvalCost(t) { return CO_EVAL_COST[coTier(t, 'music')]; }
function coEvalWhy(s, kind) {
  const t = coT(s), L = coTrainees(s, kind);
  if (kind === 'band' ? coBandMissing(L.map(x => x.id), s).length : L.length < 2) return kind === 'band' ? '보컬·기타·베이스·드럼 연습생이 모두 있어야 한다' : '아이돌 연습생이 두 명 이상 있어야 한다';
  if (t.money < coEvalCost(t)) return `회사 돈이 모자란다 (${fmtWon(coEvalCost(t))})`;
  return '';
}
// 테스트 무대 반응 (C1 곡 결과 카드와 같은 틀): 가장 좋은 점 · 가장 아쉬운 점 · 그 밖의 하나
const EVAL_RX = {
  vocal: { g: ['메인보컬 목소리가 시원하게 뻗는다', '노래가 귀에 쏙 들어온다'], b: ['라이브가 아직 불안하다', '고음에서 자꾸 흔들린다'] },
  bvocal: { g: ['보컬이 시원하게 뻗는다', '노래가 귀에 쏙 들어온다'], b: ['보컬이 연주에 묻힌다', '고음에서 자꾸 흔들린다'] },
  rap: { g: ['랩이 귀에 꽂힌다'], b: ['랩이 박자를 못 탄다'] },
  dance: { g: ['칼군무가 딱딱 맞는다', '춤선이 시원하다'], b: ['동선이 자꾸 엉킨다', '춤이 아직 따로 논다'] },
  variety: { g: ['멘트 치는 게 자연스럽다'], b: ['멘트할 때 얼어 있다'] },
  looks: { g: ['무대에 서니 얼굴이 산다', '비주얼 멤버한테 눈이 간다'], b: ['눈에 확 들어오는 멤버가 없다'] },
  star: { g: ['눈을 뗄 수 없는 멤버가 있다'], b: ['무대에서 존재감이 약하다'] },
  guitar: { g: ['기타 솔로에서 환호가 터졌다'], b: ['기타 톤이 아직 거칠다'] },
  bass: { g: ['베이스가 바닥을 단단히 받친다'], b: ['베이스가 자꾸 박자를 놓친다'] },
  drum: { g: ['드럼이 무대를 끌고 간다'], b: ['드럼 템포가 흔들린다'] },
};
function coEvalF(s, kind, ids) {
  const P = ids.map(id => s.people[id]).filter(Boolean), bar = coRookieBar(s, kind), mx = f => Math.max(...P.map(f)), avg = f => P.reduce((a, x) => a + f(x), 0) / P.length;
  const z = (v, c = bar, sd = 14) => (v - c) / sd, F = [];
  const add = (k, v) => { const R = EVAL_RX[k] || { g: [`${partN(k)} 소리가 살아 있다`], b: [`${partN(k)} 소리가 잘 안 들린다`] }; F.push({ z: v, g: R.g, b: R.b }); };
  if (kind === 'band') {
    for (const k of [...new Set(P.map(x => x.co.part))]) { const Q = P.filter(x => x.co.part === k); add(k === 'vocal' ? 'bvocal' : k, z(Q.reduce((a, x) => a + lv(x, k), 0) / Q.length)); }
  } else {
    add('vocal', z(mx(x => lv(x, 'vocal'))));
    if (P.some(x => lv(x, 'rap') >= 5)) add('rap', z(mx(x => lv(x, 'rap')), bar - 5));
    add('dance', z(avg(x => lv(x, 'dance')), bar - 3));
    add('variety', z(avg(x => lv(x, 'variety')), bar - 35));
  }
  add('looks', z(mx(x => x.tal.looks), 74, 12));
  add('star', z(avg(x => x.tal.star), 52, 12));
  return F;
}
function coEvalCard(s, kind, ids) {
  const sc = coTryPower(s, kind, ids) + U.normal(0, 3) - coRookieBar(s, kind);
  const top = sc >= 8 ? '객석이 떠나갈 듯했다.' : sc >= -4 ? '반응이 좋았다.' : '반응이 미지근했다.';
  return { t: '사내 데뷔평가', by: `${coKindN(kind)} 연습생 ${ids.length}명`, top, tp: sc >= 8 ? 1 : sc >= -4 ? 0 : -1, lh: '객석 반응', lines: songReact(coEvalF(s, kind, ids)), fans: [] };
}
// 데뷔 확인 창: 멤버 · 직원 한마디 → 데뷔시킨다 / 사내 데뷔평가부터 / 다시 고른다 / 나중에
// 사내 데뷔평가를 거쳐 온 창(evalDone)이면 고른 결과 앞에 평가 반응을 붙여 기록한다 (중간에 결과 창이 한 번 더 뜨지 않게)
function coMakeOkCh(s, d, evalDone) {
  const t = coT(s), cost = coEvalCost(t), pre = evalDone && d.card ? `사내 데뷔평가(${fmtWon(d.cost || 0)})에서 ${d.card.top} ` : '';
  const L = [{ t: '이대로 데뷔시킨다', f: s => { const ok = d.ids.every(id => s.people[id] && s.people[id].co && s.people[id].co.role === 'tr'); if (!ok) return pre + '그사이 멤버가 바뀌어 데뷔를 미뤘다.'; const g = coMakeGroup(s, coT(s), d.kind, d.name, d.ids, d.fandom); fireEvent(s, d.kind === 'vt' ? 'co_vav' : 'co_sig', { gid: g.id }); return pre + `${coKindN(d.kind)} 「${d.name}」의 멤버를 정했다.`; } }];
  if (!evalDone && d.kind !== 'vt') L.push({ t: '사내 데뷔평가부터 해 본다', h: `비용 ${fmtWon(cost)} (회사 돈) · 테스트 무대로 반응을 본다`, ok: s => coT(s).money >= cost, f: s => { coOut(coT(s), cost, '사내 데뷔평가'); fireEvent(s, 'co_eval_res', Object.assign({}, d, { back: 1, cost })); return ''; } });
  // 데뷔조 (v131): 바로 데뷔시키지 않고 이 멤버끼리 같이 연습시킨다
  if (!coSquadSame(t, d)) L.push({ t: '데뷔조로 묶어 두고 합을 맞추게 한다', h: `이 멤버끼리 같이 연습한다 · 준비되면 연습생 탭에서 데뷔시킨다${coSquad(t, d.kind) ? ' · 지금 데뷔조는 이 멤버로 바뀐다' : ''}`, f: s => { coSquadSet(s, d); return pre + `${d.ids.length}명을 ${coKindN(d.kind)} 데뷔조 「${d.name}」${josa(d.name, '으로').slice(d.name.length)} 묶었다. 이제 같이 연습하며 합을 맞춘다.`; } });
  L.push({ t: '멤버를 다시 고른다', f: s => { fireEvent(s, 'co_make', { kind: d.kind, name: d.name, fandom: d.fandom, ids: d.ids }); return ''; } });
  L.push({ t: '아직 이르다', f: () => pre + `${coKindN(d.kind)} 데뷔를 미뤘다.` });
  return L;
}
function coMakeOkText(s, d) { const t = coT(s), q = coSquad(t, d.kind), tw = coSquadTw(t, d.kind, d.ids); return `「${d.name}」 데뷔 멤버\n${d.ids.map(id => s.people[id]).filter(Boolean).map(x => `· ${x.name} (${pAge(s, x)}세)${x.co.part ? ` ${partN(x.co.part)}` : ''}${d.kind === 'band' ? '' : d.kind === 'vt' ? ` · 목소리 ${talentWord(x.tal.voice)}` : ` · 외모 ${talentWord(x.tal.looks)}`}`).join('\n')}${q && d.ids.some(id => q.ids.includes(id)) ? `\n\n데뷔조로 같이 연습한 지 ${s.t - q.t0}개월 · ${coTwWord(tw)}` : ''}`; }
E({
  id: 'co_make_ok', cat: '그룹 만들기', tag: 'career',
  title: (s, d) => `${coKindN(d.kind)} 데뷔 확인`,
  cond: s => coOn(s),
  text: (s, d) => coMakeOkText(s, d) + (d.kind === 'vt' ? '' : `\n\n${coJudge(s, d.kind, d.ids)}`),
  ch: (s, d) => coMakeOkCh(s, d, false),
});
// 연습생 탭의 '사내 데뷔평가': 무대에 세울 연습생을 고른다 (처음엔 밴드는 파트마다 가장 잘하는 사람, 아이돌은 9명까지 모두 체크)
E({
  id: 'co_eval', cat: '사내 데뷔평가', tag: 'career',
  tbl: (s, d) => coPplTbl(s, coTrainees(s, d.kind), d.kind, true, d.on || []),
  title: (s, d) => `${coKindN(d.kind)} 사내 데뷔평가`,
  cond: s => coOn(s),
  init(s, d) {
    const L = coTrainees(s, d.kind);
    d.on = d.kind === 'band' ? BAND_NEED.map(k => L.filter(x => x.co.part === k).sort((a, b) => lv(b, k) - lv(a, k))[0]).filter(Boolean).map(x => x.id) : L.slice(0, 9).map(x => x.id);
  },
  text: (s, d) => `테스트 무대에 세울 연습생을 체크하자. 비용 ${fmtWon(coEvalCost(coT(s)))} (회사 돈 ${fmtWon(coT(s).money)})`,
  form: (s, d) => coTrainees(s, d.kind).map(x => ({ k: x.id, type: 'check', on: d.on.includes(x.id), label: coCandLabel(s, x), sub: `${coMemberSub(s, x)} · 연습 ${s.t - x.co.since}개월` })),
  cancel: () => '',
  submit(s, d, v) {
    const t = coT(s), ids = coTrainees(s, d.kind).map(x => x.id).filter(id => v[id] && v[id] !== 'false'), cost = coEvalCost(t);
    if (d.kind === 'band') { if (ids.length < 4 || ids.length > 6) return { err: '밴드는 4~6명이에요' }; const miss = coBandMissing(ids, s); if (miss.length) return { err: `${miss.map(partN).join('·')} 파트가 없어요` }; }
    else if (ids.length < 2 || ids.length > 9) return { err: '아이돌 그룹은 2~9명이에요' };
    if (t.money < cost) return { err: `회사 돈이 모자라요 (지금 ${fmtWon(t.money)})` };
    coOut(t, cost, '사내 데뷔평가');
    fireEvent(s, 'co_eval_res', { kind: d.kind, ids, cost });
    return { log: '' };
  },
});
E({
  id: 'co_eval_res', cat: '사내 데뷔평가', tag: 'career', keepPop: s => true,
  title: (s, d) => `${coKindN(d.kind)} 사내 데뷔평가 결과`,
  cond: s => coOn(s),
  init(s, d) { d.card = coEvalCard(s, d.kind, d.ids); d.each = coEvalEach(s, d.kind, d.ids); },
  // 개별 평가 (v131): 작은 버튼을 누르면 한 명 한 명이 어땠는지 작은 창으로
  html: (s, d) => songCardHTML(d.card) + (d.each && typeof popBtnHTML === 'function' ? popBtnHTML('👤 개별 평가', `<div class="bill"><div class="bill-h">👤 개별 평가</div><div class="ev-each">${d.each.map(([n, x]) => `<div><b>${U.esc(n)}</b><span>${typeof evCol === 'function' ? evCol(U.esc(x)) : U.esc(evPlain(x))}</span></div>`).join('')}</div></div>`) : ''),
  text: (s, d) => `${d.card.top} ${d.card.lines.map(evPlain).join(' ')}`,
  ch: (s, d) => d.back ? coMakeOkCh(s, d, true) : [{ t: '확인', f: () => `사내 데뷔평가(${fmtWon(d.cost || 0)})에서 ${d.card.top} ${d.card.lines.map(evPlain).join(' ')}` }],
});
function coMakeGroup(s, t, kind, name, ids, fandom) {
  const P = ids.map(id => s.people[id]);
  const star = P.reduce((a, x) => a + x.tal.star, 0) / P.length;
  const g = { id: 'g' + U.uid(), kind, name, fandom: fandom || U.pick(FANDOM_NAMES), members: ids.slice(), pos: kind === 'band' ? Object.fromEntries(P.map(x => [x.id, partN(x.co.part)])) : kind === 'vt' ? {} : assignIdolPos(s, ids), sig: null, star: Math.round(U.clamp(star + U.normal(0, 6), 10, 98)), f: { kr: 0, jp: 0, us: 0 }, t0: s.t, months: 0, debuted: false, cut: CO_CUT, cEnd: CO_TERM, debt: P.reduce((a, x) => a + (x.co.cost || 0), 0), paid: 0, cbCount: 0, promo: 0, nextCb: 99, cbQ: false, mo: U.normal(0, 4), flops: 0, yearBest: 0, best: 0, peakF: 0, disc: [], aw: [] };
  if (kind === 'vt') { (t.gen = t.gen || {}).vidol = coNextGen(t); g.gen = t.gen.vidol; }
  // 데뷔조로 맞춘 합을 안고 시작한다. 데뷔조 멤버가 데뷔했으니 데뷔조는 푼다 (v131, v134부터 버츄얼 아이돌 기수도)
  { g.tw0 = Math.round(coSquadTw(t, kind, ids)); const q = coSquad(t, kind); if (q && ids.some(id => q.ids.includes(id))) t.squads = t.squads.filter(x => x !== q); }
  for (const x of P) { x.co.role = 'art'; x.co.gid = g.id; x.job = kind === 'band' ? '밴드 멤버' : kind === 'vt' ? '버츄얼 아이돌' : '아이돌'; }
  t.tr = t.tr.filter(id => !ids.includes(id));
  t.groups.push(g);
  (s.usedNames = s.usedNames || []).push(name);
  return g;
}
// ───── 프로젝트 그룹 (v156) ─────
// 데뷔한 아이돌 그룹이 둘 이상이면 여러 그룹에서 멤버를 뽑아 프로젝트 그룹을 만든다 (한 번에 하나, 한 해에 한 번)
// 앨범 한 장(같은 두 창. 전담 프로듀서도 붙일 수 있다) → 활동 두 달 → 흩어진다. 그동안 멤버를 보낸 그룹의 컴백은 기다린다
// 시작 팬은 멤버들의 원래 그룹 팬에서 모이고(보낸 멤버 비율의 35%), 끝나면 늘어난 팬의 절반이 원래 그룹들로 간다
const CO_PROJ_CD = 12;
function coProj(t) { return t.groups.find(g => g.proj) || null; }
function coProjSrc(t) { return t.groups.filter(g => !g.proj && g.kind === 'idol' && g.debuted); }
function coProjOf(t, x) { return t.groups.find(g => !g.proj && g.members.includes(x.id)) || null; }
function coProjWhy(s, t) {
  if (!t.f.music) return '기획사가 있어야 한다';
  const P = coProj(t);
  if (P) return `프로젝트 그룹 「${P.name}」이 활동 중이다`;
  if (hasQ(s, 'co_proj')) return '만드는 중';
  if (coProjSrc(t).length < 2) return '데뷔한 아이돌 그룹이 둘 이상 있어야 한다';
  if (t.projT != null && t.projT > s.t - CO_PROJ_CD) return `${t.projT + CO_PROJ_CD - s.t}개월 뒤에 다시 만들 수 있다`;
  return '';
}
// 멤버를 보낸 그룹: 프로젝트가 끝날 때까지 컴백을 기다린다
function coProjHas(t, g) { return !g.proj && t.groups.some(p => p.proj && p.members.some(id => g.members.includes(id))); }
function coAlbWord(g, debut) { return g && g.proj ? '프로젝트 앨범' : debut ? '데뷔 앨범' : '다음 앨범'; }
function coProjMake(s, t, name, ids) {
  const P = ids.map(id => s.people[id]), from = {};
  for (const x of P) { const o = coProjOf(t, x); if (o) from[x.id] = o.id; }
  const src = [...new Set(Object.values(from))].map(id => coGroup(s, id)).filter(Boolean);
  const f0 = { kr: 0, jp: 0, us: 0 };
  for (const o of src) { const k = ids.filter(id => from[id] === o.id).length / Math.max(1, o.members.length); MK.forEach(m => { f0[m] += Math.round(o.f[m] * k * 0.35); }); }
  const star = P.reduce((a, x) => a + x.tal.star, 0) / P.length;
  const g = { id: 'g' + U.uid(), kind: 'idol', name, fandom: '', members: ids.slice(), pos: assignIdolPos(s, ids), sig: U.pick(src.map(o => o.sig).filter(Boolean)) || s.trend, star: Math.round(U.clamp(star + U.normal(0, 4), 10, 98)), f: Object.assign({}, f0), t0: s.t, months: 0, debuted: false, cut: CO_CUT, cEnd: 9999, debt: 0, paid: 0, cbCount: 0, promo: 0, nextCb: 1, cbQ: false, mo: U.normal(0, 4), flops: 0, yearBest: 0, best: 0, peakF: 0, disc: [], aw: [], tw0: 0, paidOnce: true, proj: { from, src: src.map(o => o.id), f0: Object.assign({}, f0) } };
  t.groups.push(g); t.projT = s.t;
  (s.usedNames = s.usedNames || []).push(name);
  return g;
}
// 흩어질 때: 늘어난 팬의 절반을 멤버를 보낸 그룹들에 나눠 준다
function coProjEnd(s, t, g, why, quiet) {
  const pj = g.proj, n = Math.max(1, Object.keys(pj.from).length), lines = [];
  const grow = {}; MK.forEach(m => { grow[m] = Math.max(0, g.f[m] - pj.f0[m]); });
  for (const id of pj.src) {
    const o = coGroup(s, id); if (!o) continue;
    const k = Object.values(pj.from).filter(x => x === id).length / n; let tot = 0;
    MK.forEach(m => { const v = Math.round(grow[m] * k * 0.5); o.f[m] = U.clamp(o.f[m] + v, 0, FANCAP[m]); tot += v; });
    if (tot > 0) lines.push(`「${o.name}」 팬 ${sgnFans(tot)}`);
  }
  t.groups = t.groups.filter(y => y !== g);
  if (g.debuted) t.past.push({ name: g.name, kind: 'idol', y0: g.debutY || calY(s), y1: calY(s), best: Math.round(g.best), peakF: g.peakF, why: why || '프로젝트 활동 끝', proj: 1 });
  const msg = `프로젝트 그룹 「${g.name}」 ${g.debuted ? '활동을 마쳤다' : '계획을 접었다'}. 멤버들은 원래 그룹으로 돌아갔다.${lines.length ? ` (${lines.join(' · ')})` : ''}`;
  if (!quiet) addLog(s, msg, 'career');
  return msg;
}
E({
  id: 'co_proj', cat: '프로젝트 그룹', title: '프로젝트 그룹 만들기', tag: 'career',
  cond: s => coOn(s),
  init(s, d) { if (coProjWhy(s, coT(s)) && !d.name) { d.skip = true; return; } if (!d.name) d.name = newGroupName(s, 0); },
  text: (s, d) => '여러 그룹에서 멤버를 뽑아 프로젝트 그룹을 만든다 (2~9명, 두 그룹 이상에서). 앨범 한 장을 내고 두 달 활동한 뒤 흩어진다.\n\n시작 팬은 멤버들의 원래 그룹 팬에서 모이고, 잘되면 늘어난 팬 일부가 원래 그룹으로 간다. 그동안 멤버를 보낸 그룹의 컴백은 기다린다.\n\n다음 달에 기획 회의가 열린다. 그 전에 그룹 탭에서 전담 프로듀서를 붙이면 그 사람이 맡는다.',
  form: (s, d) => [{ k: 'name', label: '프로젝트 그룹 이름', value: d.name, max: 16 }].concat(coProjSrc(coT(s)).flatMap(g => coP(s, g.members)).map(x => ({ k: x.id, type: 'check', label: x.name }))),
  tbl: (s, d) => {
    const t = coT(s), P = coProjSrc(t).flatMap(g => coP(s, g.members)), T = coPplTbl(s, P, 'idol', true, []);
    T.cols.splice(3, 0, ['gr', '그룹']); T.ckN = '뽑기';
    for (const r of T.rows) { const o = coProjOf(t, s.people[r.k]); r.cells.gr = [o ? o.name : '', o ? `「${o.name}」 ${(o.pos[r.k] || '').split(' · ')[0]}` : '-']; }
    return T;
  },
  sum: (s, d, v) => { const t = coT(s), ids = coProjSrc(t).flatMap(g => g.members).filter(id => albOn(v, id)), gs = new Set(ids.map(id => (coProjOf(t, s.people[id]) || {}).id)); return `${ids.length}명 · ${gs.size}개 그룹에서`; },
  cancel: () => '',
  submit(s, d, v) {
    const t = coT(s), name = (v.name || '').trim(), ids = coProjSrc(t).flatMap(g => coP(s, g.members)).map(x => x.id).filter(id => albOn(v, id));
    if (!name) return { err: '이름을 적어 주세요' };
    if (ids.length < 2 || ids.length > 9) return { err: '프로젝트 그룹은 2~9명이에요' };
    if (new Set(ids.map(id => (coProjOf(t, s.people[id]) || {}).id)).size < 2) return { err: '두 그룹 이상에서 뽑아 주세요' };
    const g = coProjMake(s, t, name, ids);
    return { log: `프로젝트 그룹 「${g.name}」을 만들었다. ${coP(s, g.members).map(x => `${x.name}(「${(coProjOf(t, x) || {}).name || ''}」)`).join(' · ')}. 다음 달에 기획 회의를 연다.` };
  },
});
E({
  id: 'co_sig', cat: '그룹 만들기', title: s => '대표 컨셉 정하기', tag: 'career',
  cond: s => coOn(s),
  init(s, d) { if (!coGroup(s, d.gid)) d.skip = true; },
  wide: true,
  // v133: 멤버마다 컨셉을 정할 때 보는 것을 모두 표로 (특기 · 외모 · 스타성 · 컨셉마다 보는 재능). 선택지에는 그 컨셉이 무엇을 보는지와 어울리는 정도
  html: (s, d) => {
    const g = coGroup(s, d.gid), P = coP(s, g.members), band = g.kind === 'band', v = coViewer(s, 'cast', null);
    const ks = band ? [...new Set(P.map(x => x.co.part).concat(['vocal', 'rap']))] : ['vocal', 'rap', 'dance', 'variety'], TL = ['express', 'athletic', 'voice', 'aesth', 'verbal'];
    const th = ['이름', '나이', band ? '파트' : '포지션'].concat(ks.map(k => SKILLS[k].n), ['외모', '스타성'], TL.map(k => TALENT_BY[k].n));
    const row = x => [x.name, `${pAge(s, x)}세`, g.pos[x.id] || '-'].concat(ks.map(k => has(x, k) ? String(lvi(x, k)) : '-'), [talentWord(x.tal.looks), grade5(v, x.tal.star, 'pot')], TL.map(k => talentWord(x.tal[k])));
    return `<div class="m-text">${rich(`「${g.name}」의 대표 컨셉을 정하자. 요즘 유행은 ${qIda(s.trend)}. 멤버 평균 나이 ${Math.round(pplAge(s, P) * 10) / 10}세.`)}</div><div class="tbl-wrap"><table class="ev-tbl"><thead><tr>${th.map(x => `<th>${U.esc(x)}</th>`).join('')}</tr></thead><tbody>${P.map(x => `<tr>${row(x).map(c => `<td>${U.esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  },
  text: (s, d) => { const g = coGroup(s, d.gid); return `「${g.name}」 멤버\n${coP(s, g.members).map(x => `· ${x.name} (${pAge(s, x)}세) ${g.pos[x.id]}`).join('\n')}\n\n그룹의 대표 컨셉을 정하자. 요즘 유행은 ${qIda(s.trend)}.`; },
  ch: (s, d) => { const g = coGroup(s, d.gid), P = coP(s, g.members); const see = c => { const F = CONCEPT_FIT[c], R = cFit(s, c, P, 0); const what = F === 'young' ? '어린 나이' : F === 'rap' ? '랩 실력' : F.map(k => TALENT_BY[k].n).join(' · '); const fit = F === 'rap' ? (R.rap >= 30 ? '잘 어울린다' : R.rap >= 15 ? '무난하다' : '안 어울린다') : R.b >= 1 ? '잘 어울린다' : R.b <= -1 ? '안 어울린다' : '무난하다'; return fit; }; return TRENDS.filter(c => cAgeOK(s, P, c, 1)).map(c => ({ t: c, tr: c === s.trend, h: see(c), f: s => { g.sig = c; coMeeting(s, g, false); return `「${g.name}」의 대표 컨셉을 '${c}'${josa(c, '으로').slice(c.length)} 정했다.`; } })); },
});

// ───── 컴백 회의 (v153: 앨범 제작 틀 album.js) ─────
// 대표가 하는 일은 창 두 번이다
// ① 기획 · 데모곡 확보 (co_plan): 컨셉과 곡을 모을 곳을 여러 개 체크한다. 고른 만큼 돈이 든다
// ② 한 달 뒤 선정 (co_pick): A&R 팀장이 추린 다섯 곡에서 실을 세 곡과 타이틀곡을 정한다
// 그 뒤 편곡 · 작사 한 달, 녹음 한 달을 거쳐 앨범이 나온다. A&R 팀장이 없으면 모인 곡을 내가 전부 듣고 고른다
// fromTick: 매달 계산 중(tick)이면 사건을 줄에 세운다 (선택 중에는 바로 띄운다)
function coMeeting(s, g, fromTick) {
  g.cbQ = true; g.nextCb = 99;
  // 전담 프로듀서가 붙어 있으면 그 사람이 정한다 (v155). 이미 추려 둔 다섯 곡이 있으면 다음 달에 거기서 고른다
  const P = coGProd(s, g);
  if (P) { if (g.alb && g.alb.five && g.alb.five.length) { g.alb.auto = s.t + 1; g.alb.prod = P.id; } else coProdPlan(s, g, P); return; }
  if (g.alb) g.alb.auto = 0;
  const id = g.alb && g.alb.five && g.alb.five.length ? 'co_pick' : 'co_plan', d = { gid: g.id, debut: !g.debuted };
  if (fromTick || s.pending) { queueEv(s, id, 0, d, true); qFront(s, [id]); } else fireEvent(s, id, d);
}
function coProdCost(t, g) { return Math.round(CO_PROD[coTier(t, 'music')] * (0.4 + 0.6 * Math.min(1, coGFans(g) / 3e5)) * (g.kind === 'band' ? 0.5 : 1) / 1e5) * 1e5; }
// 프로젝트 그룹은 두 번 미루면 계획을 접는다 (멤버를 보낸 그룹들이 컴백을 기다리고 있어서)
function coLater(s, g) {
  if (g.proj) { g.proj.wait = (g.proj.wait || 0) + 1; if (g.proj.wait >= 2) return coProjEnd(s, coT(s), g, '계획을 접음', true); }
  g.cbQ = false; g.nextCb = 3; return `「${g.name}」 ${g.proj ? '프로젝트 앨범을' : g.debuted ? '컴백을' : '데뷔를'} 석 달 뒤로 미뤘다.`;
}
function coMeetText(s, g, debut) {
  return `「${g.name}」 ${coAlbWord(g, debut)}을 준비할 때다.\n\n${debut ? '' : `그룹 팬 ${fmtFans(coGFans(g))} · `}대표 컨셉 '${g.sig}' · 요즘 유행 '${s.trend}'\n앨범 제작비 ${fmtWon(coProdCost(coT(s), g))} · 회사 돈 ${fmtWon(coT(s).money)}`;
}
// 최근 5곡 배너 (v133): 누르면 작은 창에 그 곡의 컨셉 · 성과 · 평가가 나온다 (카드가 없는 예전 곡은 순위만)
function coLastHTML(s, g) {
  const L = g.disc.slice(-5).reverse();
  if (!L.length || typeof popBtnHTML !== 'function') return '';
  return `<div class="co-last"><span class="hint">최근 ${L.length}곡</span>${L.map(a => popBtnHTML(`🎧 「${a.title}」 · ${a.c}`, a.card ? songCardHTML(Object.assign({}, a.card, { c: a.c, y: a.y })) + (a.mk ? albStepsHTML(a.mk) : '') : `<div class="scard"><div class="sc-top"><span class="sc-t">「${U.esc(a.title)}」</span><span class="sc-by">'${U.esc(a.c)}' 컨셉 · ${a.y}년</span></div><div class="sc-peak${a.peak ? '' : ' out'}">${U.esc(chartText(a.peak))}</div></div>`)).join('')}</div>`;
}
function coMeetHTML(s, d, id) { const g = coGroup(s, d.gid); return `<div class="m-text">${rich(EVENTS[id].text(s, d))}</div>` + (g ? coLastHTML(s, g) : ''); }
function coAlbX(s, g) { const t = coT(s), prod = coProdCost(t, g); return { tier: coTier(t, 'music'), rep: t.f.music.rep, sig: g.sig, mem: coP(s, g.members), prod, budget: Math.max(1000e4, (t.money - prod) * 0.5), inh: coStaff(s, 'prod') }; }
function coAnrLead(s) { return coStaff(s, 'anr').sort((a, b) => scoutLv(b, 'compose') - scoutLv(a, 'compose'))[0] || null; }
// 그 컨셉이 그룹에 어울리는 정도 (대표 컨셉을 정하는 창과 같은 말)
function coFitWord(s, g, c) { return albFit(s, coP(s, g.members), c); }
// ① 기획 · 데모곡 확보 (v153)
E({
  id: 'co_plan', cat: '컴백 회의', tag: 'career',
  title: (s, d) => { const g = coGroup(s, d.gid); return `「${g ? g.name : ''}」 ${coAlbWord(g, d.debut)} 기획`; },
  cond: s => coOn(s),
  init(s, d) { if (!coGroup(s, d.gid)) d.skip = true; },
  html: (s, d) => coMeetHTML(s, d, 'co_plan'),
  text: (s, d) => { const g = coGroup(s, d.gid), j = coAnrLead(s); return coMeetText(s, g, d.debut) + `\n\n컨셉과 곡을 모을 곳을 정하자. 여러 개를 같이 고를 수 있고, 고른 만큼 돈이 든다. 모인 곡은 ${j ? `A&R 팀장 ${josa(j.name, '이가')} 다섯 곡으로 추려 오고,` : '내가 전부 들어 보고,'} 한 달 뒤에 실을 곡을 정한다.`; },
  form: (s, d) => { const g = coGroup(s, d.gid); return albPlanForm(s, coAlbX(s, g), c => coFitWord(s, g, c)); },
  sum: (s, d, v) => { const g = coGroup(s, d.gid), x = coAlbX(s, g), r = albPlanRead(s, x, v), n = ALB_SRC.filter(z => r.src.includes(z.k)).reduce((a, z) => a + albSrcCnt(x, z, r.cs.length), 0); return `컨셉 ${r.cs.length}개 · 데모곡 ${n}곡쯤 · 드는 돈 ${fmtWon(albPlanCost(x, r.cs, r.src))} · 회사 돈 ${fmtWon(coT(s).money)}`; },
  cancel: (s, d) => { const g = coGroup(s, d.gid); return g ? coLater(s, g) : ''; },
  cancelT: (s, d) => d.debut ? '데뷔를 미룬다' : '컴백을 미룬다',
  // 자동 플레이: 대표 컨셉 하나에 외부 공모만 (작곡을 잘하면 내 곡도)
  sim: (s, d) => { const g = coGroup(s, d.gid), v = { s_open: true }; v['c_' + g.sig] = true; if (lv(me(s), 'compose') >= 50) v.s_me = true; return v; },
  submit(s, d, v) {
    const g = coGroup(s, d.gid), t = coT(s), x = coAlbX(s, g), r = albPlanRead(s, x, v);
    if (!r.cs.length) return { err: '컨셉을 하나 이상 골라 주세요' };
    if (!r.src.length) return { err: '곡을 모을 곳을 하나 이상 골라 주세요' };
    const cost = albPlanCost(x, r.cs, r.src);
    if (cost > 0 && t.money < cost) return { err: `회사 돈이 ${fmtWon(cost - t.money)} 모자라요` };
    coOut(t, cost, '기획 · 데모곡'); g.debt += cost;
    x.cs = r.cs; x.src = r.src;
    const demos = albDemos(s, x), j = coAnrLead(s), sc = albScreen(s, x, demos, j);
    g.alb = { cs: r.cs, src: r.src, n: demos.length, five: sc.five, by: j ? j.id : null };
    if (sc.lost) g.alb.lost = { title: sc.lost.title, cid: sc.lost.cid || null, q: sc.lost.q };
    g.cbQ = true; g.nextCb = 99;
    queueEv(s, 'co_pick', 1, { gid: g.id, debut: d.debut }, true);
    return { log: `「${g.name}」 ${coAlbWord(g, d.debut)} 기획을 마쳤다. ${r.cs.map(c => `'${c}'`).join(' · ')} 컨셉으로 데모곡 ${demos.length}곡이 모였다. ${j ? `A&R 팀장 ${josa(j.name, '이가')} 심사한다.` : '내가 직접 들어 본다.'}${cost ? ` (${fmtWon(cost)})` : ''}` };
  },
});
SONG_CB.coT = (s, d, c) => askTitle(s, 'coSelf', { title: songTitle(), what: `'${c}' 컨셉 「${(coGroup(s, d.gid) || {}).name}」 타이틀곡의`, c, gid: d.gid });
TITLE_CB.coSelf = (s, d) => {
  const g = coGroup(s, d.gid);
  if (!g || !coOn(s)) return '';
  const q = lv(me(s), 'compose') * 0.9 + U.normal(0, 5) + cmBonus(s, d.c);
  return coStartAlbum(s, g, { mine: true, c: d.c, title: d.title, q, price: 0 });
};
// 업계 작곡가의 컨셉 숙련도 (처음 볼 때 정한다): 잘하는 컨셉 한두 개는 높고 나머지는 낮다
function coCm(x) {
  if (!x.cm) { x.cm = {}; const top = U.shuffle(TRENDS).slice(0, U.int(1, 2)); for (const c of TRENDS) x.cm[c] = top.includes(c) ? U.int(45, 90) : U.int(0, 40); }
  return x.cm;
}
// ② 선정 (v153): A&R 팀장이 추린 다섯 곡(팀장이 없으면 모인 곡 전부)에서 실을 세 곡을 체크하고 타이틀곡을 하나 찍는다
// 곡마다 작곡가 작곡 레벨(범위) · 완성도(5단계) · 컨셉 · 그 컨셉 숙련도(5단계) · 곡값이 보인다. 보는 눈은 나와 A&R 팀장 중 좋은 쪽
// 곡을 정할 때 드는 돈: 타이틀곡 값 (+ 편곡 · 작사를 밖에 맡기면 그 값). 앨범 제작비는 발매 때 나간다
function coPickCost(s, g, picks, ti, pol) { const x = coAlbX(s, g); return albSongCost(picks, ti) + (pol ? albPolCost(x) : 0); }
function coPickRead(g, v) { const a = g.alb, idx = a.five.map((x, i) => i).filter(i => albOn(v, 'p' + i)), ti = v.ti ? +String(v.ti).slice(1) : -1; return { idx, ti: idx.includes(ti) ? ti : -1, pol: albOn(v, 'pol') }; }
E({
  id: 'co_pick', cat: '컴백 회의', tag: 'career',
  title: (s, d) => { const g = coGroup(s, d.gid); return `「${g ? g.name : ''}」 실을 곡 · 타이틀곡`; },
  cond: s => coOn(s),
  init(s, d) { const g = coGroup(s, d.gid); if (!g || !g.alb || !g.alb.five || !g.alb.five.length) d.skip = true; },
  html: (s, d) => coMeetHTML(s, d, 'co_pick'),
  text: (s, d) => {
    const g = coGroup(s, d.gid), a = g.alb, j = a.by && s.people[a.by], need = Math.min(ALB_PICK, a.five.length);
    return `「${g.name}」 ${coAlbWord(g, d.debut)}에 실을 곡을 정할 차례다.\n\n${j && a.n > a.five.length ? `모인 데모곡 ${a.n}곡 가운데 A&R 팀장 ${josa(j.name, '이가')} ${a.five.length}곡을 추려 왔다.` : `모인 데모곡 ${a.n}곡을 직접 들어 봤다.`} 실을 ${need}곡을 체크하고, 그중 타이틀곡을 하나 찍자.\n\n지금은 타이틀곡 값만 낸다 · 앨범 제작비 ${fmtWon(coProdCost(coT(s), g))}은 발매 때 나간다 · 회사 돈 ${fmtWon(coT(s).money)}`;
  },
  form: (s, d) => { const g = coGroup(s, d.gid); return g.alb.five.map((x, i) => ({ k: 'p' + i, type: 'check', label: x.title })).concat([{ k: 'pol', type: 'opt', after: true, label: '편곡 · 작사를 이름난 사람에게 맡긴다', sub: `${fmtWon(albPolCost(coAlbX(s, g)))} · 곡이 더 다듬어진다` }]); },
  tbl: (s, d) => {
    const g = coGroup(s, d.gid), v = coViewer(s, 'anr', 'compose');
    const rows = g.alb.five.map((x, i) => { const c = x.mine ? me(s) : x.cid && s.people[x.cid], tag = cTag(s, x.c, g.sig); return { k: 'p' + i, tr: x.c === s.trend, sig: x.c === g.sig, cells: {
      t: [x.title, `「${x.title}」`], by: [albBy(s, x), albBy(s, x)], c: [x.c, `${x.c}${tag ? ` (${tag})` : ''}`], lv: c ? coCellLv(v, c, 'compose', !!x.mine || x.src === 'mem' || x.src === 'in') : [-1, '?'],
      q: coCellG(grade5(v, x.q, 'q', 'compose'), 'q'), m: x.m == null ? [-1, '-'] : coCellG(grade5(v, x.m, 'pot', 'compose')), p: [x.price, x.price ? fmtWon(x.price) : '-'] } }; });
    return { cols: [['t', '제목'], ['by', '작곡가'], ['c', '컨셉'], ['lv', '작곡 레벨'], ['q', '완성도'], ['m', '컨셉 숙련도'], ['p', '곡값']], rows, radio: { k: 'ti', n: '타이틀' }, sort: ['q', -1] };
  },
  sum: (s, d, v) => { const g = coGroup(s, d.gid), r = coPickRead(g, v), P = r.idx.map(i => g.alb.five[i]); return `체크 ${r.idx.length}곡${r.ti >= 0 ? ` · 타이틀 「${g.alb.five[r.ti].title}」` : ''} · 지금 드는 돈 ${fmtWon(coPickCost(s, g, P, r.ti >= 0 ? g.alb.five[r.ti] : null, r.pol))} · 회사 돈 ${fmtWon(coT(s).money)}`; },
  // 두 번 미루면 추려 둔 곡들은 다른 회사로 넘어가고, 다음에는 기획부터 다시 한다
  cancel: (s, d) => { const g = coGroup(s, d.gid); if (!g) return ''; const a = g.alb; if (a) { a.wait = (a.wait || 0) + 1; if (a.wait >= 2) g.alb = null; } return coLater(s, g) + (a && !g.alb ? ' 추려 둔 곡들은 다른 회사로 넘어갔다.' : ''); },
  cancelT: (s, d) => d.debut ? '데뷔를 미룬다' : '컴백을 미룬다',
  // 자동 플레이: 싼 곡 세 곡, 그중 하나를 타이틀로
  sim: (s, d) => { const g = coGroup(s, d.gid), F = g.alb.five, v = {}, I = U.shuffle(F.map((x, i) => i).sort((a, b) => F[a].price - F[b].price).slice(0, ALB_PICK)); I.forEach(i => v['p' + i] = true); v.ti = 'p' + I[0]; return v; },
  submit(s, d, v) {
    const g = coGroup(s, d.gid), t = coT(s), a = g.alb, need = Math.min(ALB_PICK, a.five.length), r = coPickRead(g, v);
    if (r.idx.length !== need) return { err: `실을 곡을 ${need}곡 체크해 주세요 (지금 ${r.idx.length}곡)` };
    if (r.ti < 0) return { err: '체크한 곡 가운데 타이틀곡을 하나 찍어 주세요' };
    const cost = coPickCost(s, g, r.idx.map(i => a.five[i]), a.five[r.ti], r.pol);
    if (t.money < cost) return { err: `회사 돈이 ${fmtWon(cost - t.money)} 모자라요` };
    a.sel = { p: r.idx, ti: r.ti, pol: r.pol };
    // 내가 쓴 곡이 타이틀이면 제목을 직접 짓는다
    if (a.five[r.ti].mine) { askTitle(s, 'coAlb', { title: a.five[r.ti].title, what: `「${g.name}」 타이틀곡의`, gid: g.id }); return { log: '' }; }
    return { log: coAlbGo(s, g) };
  },
});
TITLE_CB.coAlb = (s, d) => { const g = coGroup(s, d.gid); if (!g || !coOn(s) || !g.alb || !g.alb.sel) return ''; g.alb.five[g.alb.sel.ti].title = d.title; return coAlbGo(s, g); };
// 선정이 끝나면: 돈을 치르고, 편곡 · 작사 한 달 + 녹음 한 달 뒤에 성적이 나온다. boss: 전담 프로듀서가 정했으면 그 이름 (v155)
function coAlbGo(s, g, boss) {
  const t = coT(s), a = g.alb, x = coAlbX(s, g), picks = a.sel.p.map(i => a.five[i]), ti = a.five[a.sel.ti];
  const songs = albSongCost(picks, ti), polC = a.sel.pol ? albPolCost(x) : 0;
  coOut(t, songs, '곡값'); coOut(t, polC, '편곡 · 작사');
  g.debt += songs + polC;
  for (const d of picks) { const c = d.cid && s.people[d.cid]; if (c && c.ind) { meetAt(s, c, `「${g.name}」 「${d.title}」`, 'agency'); bond(s, c, d === ti ? 3 : 1); const cm = coCm(c); cm[d.c] = Math.min(100, cm[d.c] + (100 - cm[d.c]) * (d === ti ? 0.06 : 0.02)); } }
  const pol = albPolish(s, x, a.sel.pol), side = picks.filter(d => d !== ti);
  for (const id of [pol.aid, pol.lid]) { const c = id && s.people[id]; if (c) { meetAt(s, c, `「${g.name}」 「${ti.title}」`, 'agency'); bond(s, c, 2); } }
  const o = { gid: g.id, mine: !!ti.mine, c: ti.c, title: ti.title, q: ti.q + pol.dq, price: songs, cid: ti.cid || null, side: side.length ? side.reduce((n, d) => n + d.q, 0) / side.length : null, due: x.prod, sub: side.filter(d => d.mine).map(d => d.title), mk: albMk(s, a, picks, ti, pol, boss || '대표') };
  if (a.lost && U.chance(0.6)) { const j = a.by && s.people[a.by]; queueEv(s, 'co_lost', U.int(4, 8), { title: a.lost.title, by: albBy(s, a.lost), q: a.lost.q, who: j ? j.name : '' }, true); }
  g.alb = null; g.cbQ = false; g.nextCb = 99; g.rel = s.t + 2;
  queueEv(s, 'co_res', 2, o, true);
  return `${boss ? `${josa(boss, '이가')} ` : ''}「${g.name}」 ${g.proj ? '프로젝트' : g.debuted ? '컴백' : '데뷔'} 앨범에 실을 곡을 정했다. 타이틀곡은 ${ti.mine ? '내가 쓴' : `${albBy(s, ti)}의`} 「${ti.title}」 ('${ti.c}' 컨셉). 편곡과 녹음을 거쳐 두 달 뒤에 나온다.${songs + polC ? ` (${fmtWon(songs + polC)})` : ''}`;
}
// 놓친 곡 (v153): A&R 팀장이 심사에서 떨어뜨린 곡이 올린 곡들보다 눈에 띄게 좋았을 때, 몇 달 뒤 다른 회사에서 나와 잘된다
E({
  id: 'co_lost', cat: '업계 소식', title: '놓친 곡', tag: 'career',
  cond: s => coOn(s),
  init(s, d) { d.peak = U.clamp(Math.round(34 - (d.q - 55) * 1.6 + U.normal(0, 5)), 1, 50); },
  text: (s, d) => `지난번 심사에서 ${d.who ? `A&R 팀장 ${josa(d.who, '이가')}` : '우리가'} 떨어뜨린 ${josa(`「${d.title}」`, '이가')} 다른 회사 가수의 곡으로 나와 차트 ${d.peak}위에 올랐다. (작곡 ${d.by})`,
  ch: (s, d) => [{ t: '확인', f: () => `심사에서 떨어뜨린 ${josa(`「${d.title}」`, '이가')} 다른 회사에서 나와 차트 ${d.peak}위에 올랐다.` }],
});
// ───── 전담 프로듀서 (v155) ─────
// 사내 프로듀서를 그룹에 붙이면 ① 기획 · ② 데모곡 확보 · ④ 선정을 나 대신 한다. 돈은 회사 돈으로 쓰고, A&R 심사는 그대로 거친다
// 컨셉: 자기 컨셉 숙련도 · 그룹에 어울리는 정도 · 대표 컨셉 · 유행. 곡을 모을 곳: 회사 돈에 맞춰. 곡 고르기: 자기 듣는 귀로
function coFitV(s, g, c) { const w = coFitWord(s, g, c); return w === '잘 어울린다' ? 12 : w === '안 어울린다' ? -25 : w === '나이에 안 맞는다' ? -80 : 0; }
function coProdPlan(s, g, P) {
  const t = coT(s), x = coAlbX(s, g), cm = coCm(P);
  const R = TRENDS.map(c => ({ c, v: cm[c] * 0.4 + coFitV(s, g, c) + (c === g.sig ? 15 : 0) + (c === s.trend ? 10 : 0) + U.normal(0, 6) })).sort((a, b) => b.v - a.v);
  let cs = [R[0].c], src = ['open'].concat(albWriters(x).length ? ['mem'] : [], x.inh.length ? ['in'] : []);
  const cost = k => ALB_SRC.find(z => z.k === k).cost[x.tier], spare = () => t.money - x.prod - albPlanCost(x, cs, src);
  if (R[1].v > R[0].v - 6 && spare() > albPlanFee(x) * 15) cs.push(R[1].c);
  if (spare() > cost('name') * 10) src.push('name');
  if (x.tier >= 2 && spare() > cost('camp') * 12 && U.chance(0.5)) src.push('camp');
  // 돈이 모자라면 돈 드는 것은 다 뺀다
  if (t.money < albPlanCost(x, cs, src)) { cs = cs.slice(0, 1); src = src.filter(k => !cost(k)); }
  const pay = albPlanCost(x, cs, src);
  coOut(t, pay, '기획 · 데모곡'); g.debt += pay;
  x.cs = cs; x.src = src;
  const demos = albDemos(s, x);
  // 프로듀서 자기 곡은 심사 없이 올라간다
  for (const d of demos) if (d.cid === P.id) d.pass = true;
  const j = coAnrLead(s), sc = albScreen(s, x, demos, j);
  g.alb = { cs, src, n: demos.length, five: sc.five, by: j ? j.id : null, auto: s.t + 1, prod: P.id };
  if (sc.lost) g.alb.lost = { title: sc.lost.title, cid: sc.lost.cid || null, q: sc.lost.q };
  addLog(s, `전담 프로듀서 ${josa(P.name, '이가')} 「${g.name}」 ${coAlbWord(g, !g.debuted)}을 기획했다. ${cs.map(c => `'${c}'`).join(' · ')} 컨셉으로 데모곡 ${demos.length}곡을 모았다.${pay ? ` (${fmtWon(pay)})` : ''}`, 'career');
}
// 기획 한 달 뒤: 프로듀서가 다섯 곡에서 세 곡과 타이틀곡을 고른다 (타이틀곡은 회사 형편에 맞는 곡 가운데)
function coProdPick(s, g) {
  const t = coT(s), a = g.alb, P = coGProd(s, g);
  // 그사이 프로듀서를 떼거나 바꿨으면: 바꾼 사람이 다음 달에 고르고, 뗐으면 내가 고른다
  if (!P || P.id !== a.prod) { a.auto = 0; coMeeting(s, g, true); return; }
  const x = coAlbX(s, g), sd = albEarOf(P), fit = c => Math.min(0, coFitV(s, g, c)) * 0.6;
  const R = a.five.map((d, i) => ({ i, d, v: d.q + U.normal(0, sd) + (a.cs.includes(d.c) ? 10 : 0) + fit(d.c) + (d.cid === P.id ? 4 : 0) })).sort((p, q) => q.v - p.v);
  const ok = z => z.d.price <= Math.max(0, t.money - x.prod * 0.5), ti = R.find(ok) || R.slice().sort((p, q) => p.d.price - q.d.price)[0];
  const sel = [ti].concat(R.filter(z => z !== ti).slice(0, ALB_PICK - 1));
  a.sel = { p: sel.map(z => z.i), ti: ti.i, pol: x.tier >= 2 && t.money > albPolCost(x) * 10 + x.prod };
  const cm = coCm(P); cm[ti.d.c] = Math.min(100, cm[ti.d.c] + (100 - cm[ti.d.c]) * 0.04);
  addLog(s, coAlbGo(s, g, `전담 프로듀서 ${P.name}`), 'career');
}
E({
  id: 'co_prod_set', cat: '전담 프로듀서', tag: 'career',
  title: (s, d) => `「${(coGroup(s, d.gid) || {}).name || ''}」 전담 프로듀서`,
  cond: s => coOn(s),
  init(s, d) { if (!coGroup(s, d.gid)) d.skip = true; },
  text: (s, d) => { const g = coGroup(s, d.gid), P = coGProd(s, g); return `「${g.name}」 앨범을 맡길 사내 프로듀서를 정한다.\n\n전담 프로듀서는 앨범마다 컨셉 · 곡을 모을 곳 · 실을 곡과 타이틀곡을 나 대신 정한다. 돈은 회사 돈으로 쓰고, A&R 심사는 그대로 거친다.\n\n지금: ${P ? P.name : '없음 (내가 직접 정한다)'} · 대표 컨셉 '${g.sig}'${g.cbQ && !(g.alb && g.alb.auto) ? '\n\n지금 준비 중인 앨범은 하던 대로 가고, 다음 앨범부터 맡는다.' : ''}`; },
  ch: (s, d) => {
    const g = coGroup(s, d.gid), t = coT(s);
    return coStaff(s, 'prod').map(P => { const o = t.groups.find(y => y.prod === P.id && y !== g); return { t: P.name + (g.prod === P.id ? ' (지금 전담)' : ''), h: coStaffLine(P) + (o ? ` · 지금 「${o.name}」 전담 (옮겨 온다)` : ''), ok: s => g.prod !== P.id, f: s => { if (o) o.prod = null; g.prod = P.id; return `「${g.name}」 전담 프로듀서로 ${josa(P.name, '을를')} 붙였다.${o ? ` 「${o.name}」 앨범은 이제 내가 정한다.` : ''}`; } }; })
      .concat(g.prod ? [{ t: '떼어 낸다', h: '앨범마다 내가 직접 정한다', f: s => { g.prod = null; return `「${g.name}」 전담 프로듀서를 뗐다. 앨범은 내가 직접 정한다.`; } }] : [])
      .concat([{ t: '그대로 둔다', f: () => '' }]);
  },
});
// 예전 세이브에서 제목을 짓던 중이면 예전 방식으로 바로 낸다 (v152까지: 고르자마자 한 달 뒤 발매)
function coStartAlbum(s, g, o) {
  const t = coT(s), prod = coProdCost(t, g);
  coOut(t, prod, '앨범 제작비'); if (o.price) coOut(t, o.price, '곡값');
  g.debt += prod + (o.price || 0);
  g.cbQ = false; g.nextCb = 99;
  let by = '내가 쓴';
  if (o.cid) { const c = s.people[o.cid]; if (c) { by = `${c.name}의`; meetAt(s, c, `「${g.name}」 「${o.title}」`, 'agency'); bond(s, c, 3); const cm = coCm(c); cm[o.c] = Math.min(100, cm[o.c] + (100 - cm[o.c]) * 0.06); } }
  queueEv(s, 'co_res', 1, Object.assign({ gid: g.id }, o), true);
  return `「${g.name}」 ${g.debuted ? '컴백' : '데뷔'} 준비를 시작했다. 타이틀곡은 ${by} 「${o.title}」 ('${o.c}' 컨셉). (제작비 ${fmtWon(prod + (o.price || 0))})`;
}
// 그룹 실력: 아이돌은 포지션(메인보컬·메인래퍼·비주얼)과 멤버 평균, 밴드는 파트 실력 평균과 보컬
function coPower(s, g) {
  const all = coP(s, g.members);
  if (!all.length) return 0;
  const avg = f => all.reduce((a, x) => a + f(x), 0) / all.length;
  // 데뷔조로 맞춘 합 (v131): 최대 +10%
  const twM = 1 + U.clamp(g.tw0 || 0, 0, CO_SQ_MAX) / 400;
  if (g.kind === 'band') return (avg(x => lv(x, x.co.part)) * 0.7 + Math.max(...all.map(x => lv(x, 'vocal'))) * 0.3 + (Math.max(...all.map(x => x.tal.looks)) - 50) * 0.05) * twM;
  const at = n => all.find(x => (g.pos[x.id] || '').startsWith(n));
  const mv = at('메인보컬'), mr = at('메인래퍼'), vs = at('비주얼');
  return twM * ((mv ? lv(mv, 'vocal') : 0) * 0.25 + (mr ? lv(mr, 'rap') : 0) * 0.15 + avg(x => lv(x, 'dance')) * 0.25 + avg(x => Math.max(lv(x, 'vocal'), lv(x, 'rap'))) * 0.25 + avg(x => lv(x, 'variety')) * 0.1 + (vs ? (vs.tal.looks - 50) * 0.15 : 0));
}
// 정산 (내가 아이돌일 때와 같은 방식): 매출의 회사 몫은 늘 회사가 갖는다
// 멤버 몫은 연습생 시절 비용과 앨범 제작비(g.debt)를 다 갚을 때까지 회사에 남고, 그 뒤부터 멤버들에게 나간다
function coSettle(s, t, g, rev) {
  let pay = Math.round(rev * (1 - g.cut));
  if (g.debt > 0) {
    const x = Math.min(g.debt, pay); g.debt -= x; pay -= x;
    if (g.debt <= 0 && !g.paidOnce) { g.paidOnce = true; addLog(s, `「${g.name}」 연습생 시절 비용과 제작비를 다 회수했다. 이제부터 멤버들에게 정산이 나간다.`, 'career'); }
  }
  if (pay > 0) { coOut(t, pay, '멤버 정산'); g.paid += pay; }
  return Math.max(0, pay);
}
function coAlbum(s, g, o) {
  const t = coT(s), F = t.f.music, tier = F.tier, band = g.kind === 'band', p = me(s), debut = !g.debuted;
  // 앨범 제작비는 발매 때 나간다 (v153). 멤버 몫에서 회수할 비용에 더한다
  if (o.due) { coOut(t, o.due, '앨범 제작비'); g.debt += o.due; }
  if (debut) { g.debuted = true; g.debutT = s.t; g.debutY = calY(s); g.f.kr += band ? tier * 1000 + U.int(100, 800) : tier * 3000 + U.int(300, 2000); }
  const yrs = (s.t - g.debutT) / 12;
  const tired = Math.min(IDOL_CURVE.max, Math.max(0, yrs - 3) * IDOL_CURVE.rate), rookie = yrs < 1 ? IDOL_CURVE.rookie : 0;
  // 컨셉 궁합 (v97): 멤버들의 재능 · 나이 · 랩 (밴드는 보컬의 랩)
  const P = coP(s, g.members), cf = cFit(s, o.c, P, yrs);
  if (cf.rap != null && band) { const bv = P.find(x => x.co && x.co.part === 'vocal'); cf.rap = bv ? lv(bv, 'rap') : 0; }
  const sc = songScore(s, { perf: cPerf(coPower(s, g), cf), q: o.q, fans: coGFans(g), tier: 0, trend: o.c === s.trend, bonus: (band ? tier * 4 : IDOL_TIER_B[tier]) + (g.star - 50) * 0.12 + (o.c === g.sig ? 3 : 0) + Math.min(g.cbCount, 6) * 0.6 + g.mo - tired + rookie + cScoreB(cf) });
  g.mo = g.mo * 0.6 + U.normal(0, 4.5);
  const peak = chartFromScore(sc);
  const gain = { kr: fanGainRaw(sc, g.f.kr, 0.4 + tier * 0.1, starCap(g.star, 'kr')), jp: 0, us: 0 };
  if (debut) gain.kr = Math.max(gain.kr, U.int(150, 800));
  const pos = Math.max(0, gain.kr); gain.jp = Math.round(pos * 0.04); gain.us = Math.round(pos * 0.02);
  MK.forEach(m => { g.f[m] = U.clamp(g.f[m] + gain[m], 0, FANCAP[m]); });
  // 음악방송 1위는 팬 투표가 받쳐 줘야 한다 (v131): 팬이 적은 그룹은 곡이 떠도 1위 횟수가 적다 (music.js showWins)
  const wins = band ? 0 : showWins(sc, coGFans(g));
  // 수록곡 (v153): 실린 나머지 곡들이 좋으면 앨범이 조금 더 팔린다
  const albums = Math.round((g.f.kr * U.fl(0.25, 0.45) + g.f.jp * 0.25 + g.f.us * 0.1) * (band ? 0.5 : IDOL_ALBUM_MULT) * (o.side != null ? U.clamp(1 + (o.side - 40) / 250, 0.9, 1.15) : 1));
  // 매출: 앨범 + 음원(차트 밖이어도 점수만큼 조금은 들어온다) + 차트 순위
  const rev = albums * 14000 + Math.pow(Math.max(0, sc - 45), 2) * 10e4 + (peak ? (101 - peak) * 300e4 : 0);
  coIn(t, rev, '앨범·음원');
  const debt0 = g.debt, pay = coSettle(s, t, g, rev), rec = debt0 - g.debt;
  const card = coAlbumCard(s, t, g, o, { sc, peak, wins, gs: gain.kr + gain.jp + gain.us, rev, pay, rec, cfB: cScoreB(cf), tired });
  if (o.mine) { addCatalog(s, o.title, '작곡', sc, 0.7, 'agency'); cmGain(s, o.c, 4); useSkill(s, p, 'compose', 2); addWork(s, { type: '작곡', title: o.title, by: g.name, sc, note: chartText(peak) }); }
  for (const tt of o.sub || []) addCatalog(s, tt, '작곡', sc, 0.25, 'agency');
  // 무대 창 (12-1 틀): 우리 회사 아이돌 그룹의 데뷔 무대 · 1위 후보에 든 음악방송. 나는 무대에 없다 (mi: -1)
  if (!band && typeof liveStage === 'function') card.live = liveStage({ k: 'idol', place: debut && !g.proj ? '데뷔 무대' : '음악방송', t: o.title, g: g.name, fd: g.fandom, c: o.c, cos: g.proj ? 'project' : '', sx: liveSx(P), mem: P.map(x => [callName(x.name), (g.pos[x.id] || '').split(' · ')[0]]), mi: -1,
    z: { perf: (coPower(s, g) - 45) / 18, q: (o.q - 45) / 15, fans: (Math.log10(1 + coGFans(g)) - 4) / 1.2, trend: o.c === s.trend ? 0.7 : -0.5, tw: ((g.tw0 || 0) - 15) / 15, cf: cScoreB(cf) / 4, star: (g.star - 50) / 25, me: -1 }, sc, wins, cand: sc >= 66, debut, key: debut || wins > 0 || sc >= 66, rv: sc >= 66 && !wins && typeof npcStageRival === 'function' ? npcStageRival(s, g.name) : '' });
  const repD = U.clamp((sc - 55) / 6, -2.5, 4) + (peak === 1 ? 2 : 0) + (debut ? 1 : 0);
  // 그룹이 많을수록 앨범 하나가 회사 평판에 주는 영향은 작다
  F.rep = U.clamp(F.rep + repD / Math.sqrt(Math.max(1, t.groups.filter(x => x.debuted).length)), 0, 100);
  // 활동 2달 → 쉬는 2~3달 → 컴백 회의 · 준비 한 달: 5~6달마다 컴백 (턴제 실험 6차)
  // v153: 기획(활동 둘째 달) → 선정 한 달 → 편곡 한 달 → 녹음 한 달. 컴백 간격은 그대로 5~6달
  g.cbCount++; g.promo = 2; g.nextCb = g.proj ? 99 : U.int(1, 2); g.cbQ = false; g.rel = 0;
  g.flops = sc < 50 ? g.flops + 1 : Math.max(0, g.flops - 1);
  g.yearBest = Math.max(g.yearBest, sc); g.best = Math.max(g.best, sc);
  g.peakF = Math.max(g.peakF, coGFans(g)); t.peakF = Math.max(t.peakF, g.peakF);
  g.disc.push({ y: calY(s), title: o.title, c: o.c, sc: Math.round(sc), peak, mine: !!o.mine, card, mk: o.mk || null });
  if (g.disc.length > 30) g.disc.shift();
  if (peak === 1 && !t.no1) { t.no1 = true; milestone(s, `${age(s)}세에 우리 회사 「${g.name}」의 「${o.title}」가 음원 차트 1위를 했다.`); }
  return { sc, peak, wins, albums, gain, rev, pay, repD, debut, cm: comments(sc, ''), card };
}
// 회사 그룹 앨범 결과 카드 (v119): 내 그룹 곡 카드(v118 UI C1)와 같은 틀. 정산서는 회사 쪽에서 본 것
// (멤버 몫에서 연습생 · 제작 비용을 먼저 회수하고, 다 회수한 뒤부터 멤버들에게 나간다)
function coAlbumCard(s, t, g, o, r) {
  const pw = coPower(s, g);
  const F = [g.kind === 'band' ? { z: (pw - 48) / 18, g: ['연주가 탄탄하다', '합주가 귀에 착 붙는다'], b: ['연주가 아직 덜 여물었다', '라이브가 조금 불안하다'] } : { z: (pw - 45) / 18, g: ['퍼포먼스가 눈을 못 떼게 한다', '라이브가 안정적이다'], b: ['라이브가 조금 불안하다', '무대가 아직 덜 여물었다'] },
    RX.q(o.q), RX.fans(coGFans(g), r.gs), RX.trend(o.c === s.trend), RX.cf(r.cfB), RX.promo(t.f.music.tier), { z: (g.star - 50) / 25, g: ['멤버들 얼굴이 화면을 꽉 채운다'], b: ['눈에 확 띄는 멤버가 없다'] }];
  if (r.tired > 1) F.push({ z: -r.tired / 4, g: ['오래 봐도 질리지 않는다'], b: ['비슷한 컨셉이 이어져 조금 익숙하다'] });
  if (o.c === g.sig) F.push({ z: 0.5, g: ['역시 이 그룹다운 컨셉이다'], b: ['늘 하던 컨셉이라 뻔하다'] });
  const mem = Math.round(r.rev * (1 - g.cut)), rows = [['앨범 · 음원 매출', Math.round(r.rev)], [`멤버 몫 (${Math.round((1 - g.cut) * 100)}%)`, -mem]];
  if (r.rec > 0) rows.push(['멤버 몫에서 비용 회수', Math.round(r.rec)]);
  rows.push('-', ['회사에 남는 돈', Math.round(r.rev - r.pay), 1]);
  const note = g.debt > 0 ? `멤버 몫 ${fmtBill(mem)}은 연습생 · 제작 비용을 회수하는 데 들어갔다. 남은 비용 ${fmtWon(g.debt)}.`
    : r.rec > 0 ? `멤버 몫 중 ${fmtBill(r.rec)}으로 연습생 · 제작 비용을 다 회수했다. 멤버들에게 ${fmtBill(r.pay)}이 나갔다.` : `멤버들에게 ${fmtBill(r.pay)}이 나갔다.`;
  return songCardMake({ t: o.title, by: g.name, peak: r.peak, wins: r.wins, fans: [['그룹 팬', r.gs]], bill: { t: `「${o.title}」 앨범 · 음원 정산`, rows, note } }, F, r.sc, g);
}
E({
  // v131: 내가 아이돌일 때처럼 늘 창으로 뜬다 (예전엔 요약에만 남았다). 아이돌 그룹은 무대 창도 먼저 나온다
  id: 'co_res', cat: '앨범 성적', tag: 'career', keepPop: true,
  plio: (s, d) => typeof plioSong === 'function' ? plioSong(s, d, 'co') : null,
  live: (s, d) => d.card && d.card.live,
  title: (s, d) => `「${(coGroup(s, d.gid) || {}).name || ''}」 앨범 성적표`,
  init(s, d) { const g = coGroup(s, d.gid); if (!g || !coOn(s)) { d.skip = true; return; } d.r = coAlbum(s, g, d); d.card = d.r.card; d.up = coTierCheck(s, coT(s)); d.rank = coRankCheck(s, coT(s)); },
  // v119: 순위 · 팬 변화 · 반응 · 정산은 카드에 (예전 세이브의 카드 없는 창은 예전처럼)
  html: (s, d) => d.card && typeof songCardHTML === 'function' ? `<div class="m-text">${rich(EVENTS.co_res.text(s, d))}</div>` + (d.mk ? `<div class="co-last">${popBtnHTML('🎼 제작 과정', albStepsHTML(d.mk))}</div>` : '') + songCardHTML(d.card) + (d.up || d.rank ? `<div class="m-text">${rich([d.up, d.rank].filter(Boolean).join('\n\n'))}</div>` : '') : '',
  text: (s, d) => {
    const g = coGroup(s, d.gid) || { name: '', f: { kr: 0, jp: 0, us: 0 }, debt: 0 }, r = d.r, gs = r.gain.kr + r.gain.jp + r.gain.us;
    if (d.card) return `${g.proj ? '프로젝트' : r.debut ? '데뷔' : '컴백'} 앨범 「${d.title}」 ('${d.c}' 컨셉 · ${d.mine ? '내가 쓴 곡' : d.mk ? `작곡 ${d.mk.pk[0].by}` : '외부 곡'})\n\n앨범 ${r.albums.toLocaleString()}장 · 그룹 팬 ${fmtFans(coGFans(g))}\n회사 평판 ${r.repD >= 0 ? '+' : ''}${Math.round(r.repD * 10) / 10} → ${Math.round(coT(s).f.music.rep)}`;
    let x = `${r.debut ? '데뷔' : '컴백'} 앨범 「${d.title}」 ('${d.c}' 컨셉 · ${d.mine ? '내가 쓴 곡' : '외부 곡'})\n\n${chartText(r.peak)}${g.kind === 'band' ? '' : ` · 음악방송 1위 ${r.wins}회`} · 앨범 ${r.albums.toLocaleString()}장\n그룹 팬 ${sgnFans(gs)} → ${fmtFans(coGFans(g))}\n\n팬 반응: ${r.cm}`;
    x += `\n\n매출 ${fmtWon(r.rev)} · ${r.pay ? `멤버 정산 ${fmtWon(r.pay)}` : `연습생·제작 비용 회수 중 (남은 ${fmtWon(g.debt)})`}\n회사 평판 ${r.repD >= 0 ? '+' : ''}${Math.round(r.repD * 10) / 10} → ${Math.round(coT(s).f.music.rep)}`;
    if (d.up) x += `\n\n${d.up}`;
    if (d.rank) x += `\n\n${d.rank}`;
    return x;
  },
  ch: (s, d) => [{ t: '확인', f: () => `「${(coGroup(s, d.gid) || {}).name || ''}」 「${d.title}」 ${chartText(d.r.peak)}.` }],
});

// ───── 그룹 한 달 ─────
// 앨범 사이에는 행사·광고·콘서트(밴드는 공연) 수입이 들어온다. 영업(대표의 할 일)을 하면 더 들어온다
// 회사 창에 보이는 제작 단계 (v153)
function coAlbStage(s, g) { return g.rel > s.t ? (g.rel - s.t >= 2 ? '편곡 · 작사 중' : '녹음 중') : g.alb && g.alb.five ? g.alb.auto ? '전담 프로듀서가 곡을 고르는 중' : '데모곡 심사 중' : '컴백 준비 중'; }
function coUnstick(s, g) {
  if (!(g.cbQ || g.nextCb >= 90)) return;
  if (g.alb && g.alb.auto) return;
  if (g.proj && g.debuted) return;
  if (['co_plan', 'co_pick', 'co_res', 'co_sig', 'song_concept', 'title_pick'].some(id => hasQ(s, id))) return;
  g.cbQ = false; g.nextCb = 2;
}
function coGroupMonth(s, t, g, sales) {
  g.months++;
  qFront(s, ['co_res']);
  const eqm = CO_EQ.mult[t.eq || 0];
  if (g.proj) { if (coP(s, g.members).length < 2 || (g.debuted && g.promo <= 0 && !g.cbQ && !(g.rel > s.t))) { coProjEnd(s, t, g); return; } }
  else for (const x of coP(s, g.members)) for (const k of coSkillsOf(x)) { const tr = coTrainer(s, k); practice(s, x, k, (k === 'variety' ? 0.4 : 0.9) * (tr ? 1 + teachLv(tr, k) / 80 : 1), eqm); }
  if (coProjHas(t, g) && !g.cbQ && g.nextCb <= 1) g.nextCb = 2;
  // 전담 프로듀서가 기획한 지 한 달: 곡을 고른다 (v155)
  if (g.alb && g.alb.auto && g.alb.auto <= s.t) coProdPick(s, g);
  coUnstick(s, g);
  if (!g.debuted) { if (!g.cbQ && --g.nextCb <= 0) coMeeting(s, g, true); return; }
  // 다음 앨범 기획은 활동 중에 시작한다 (v153: 발매 한두 달 뒤부터)
  if (g.promo > 0) g.promo--;
  if (!g.cbQ && --g.nextCb <= 0) coMeeting(s, g, true);
  MK.forEach(m => { g.f[m] = Math.round(g.f[m] * (g.promo > 0 ? 1 : (s.t - g.debutT) > 84 ? 0.993 : 0.996)); });
  const ages = coP(s, g.members).map(x => pAge(s, x)), avg = ages.reduce((a, b) => a + b, 0) / Math.max(1, ages.length);
  if (avg > 28) { const f = 1 - Math.min(0.02, (avg - 28) * 0.004); MK.forEach(m => { g.f[m] = Math.round(g.f[m] * f); }); }
  // 행사·광고·콘서트(밴드는 공연) 수입: 팬 한 명당 매달 조금씩 (작은 팬덤도 행사로 먹고산다)
  const side = (g.kind === 'band' ? g.f.kr * 150 : g.f.kr * 200 + g.f.jp * 250 + g.f.us * 150) * (sales ? coSalesM(s, 1.3) : 1);
  if (side > 0) { coIn(t, side, g.kind === 'band' ? '공연' : '행사·광고·콘서트'); coSettle(s, t, g, side); }
  if (g.months >= g.cEnd && !g.renewQ) { g.renewQ = true; queueEv(s, 'co_renew', 0, { gid: g.id }, true); }
}
// 연말 가요 시상식: 소속 그룹이 상을 받으면 회사 평판이 오른다 (그해 가장 큰 상 하나만큼: 대상 +5, 본상 +2, 신인상 +2)
function coAwards(s, t) {
  const F = t.f.music, lines = [], live = t.groups.filter(g => g.debuted && g.kind !== 'vt');
  if (!F) return;
  const top = live.slice().sort((a, b) => b.yearBest - a.yearBest)[0];
  const y0 = top ? top.yearBest : 0;
  F.rep += top && y0 >= 86 ? 5 : y0 >= 74 || live.some(g => g.debutY === calY(s) && g.yearBest >= 60) ? 2 : 0;
  for (const g of live) {
    const y = g.yearBest, got = [];
    if (g.debutY === calY(s) && y >= 60) { got.push('신인상'); }
    if (g === top && y >= 86) { got.push('대상'); if (!t.daesang) { t.daesang = true; milestone(s, `${age(s)}세에 우리 회사 ${josa(`「${g.name}」`, '이가')} 연말 가요 시상식 대상을 받았다.`); } }
    else if (y >= 74) got.push('본상');
    for (const n of got) { g.aw.push(`${calY(s)} ${n}`); t.awN++; }
    if (got.length) lines.push(`「${g.name}」 ${got.join('·')}`);
    g.yearBest = 0;
  }
  F.rep = Math.min(100, F.rep);
  if (lines.length) addLog(s, `🏆 연말 가요 시상식에서 우리 회사 ${lines.join(', ')}을 받았다.`, 'career');
}
function coDisband(s, t, g, why, quiet) {
  const vt = g.kind === 'vt';
  for (const x of coP(s, g.members)) { x.job = g.kind === 'band' ? '전 밴드 멤버' : vt ? '전 버츄얼 아이돌' : '전 아이돌'; x.co = null; }
  t.groups = t.groups.filter(y => y !== g);
  t.past.push({ name: g.name, kind: g.kind, y0: g.debutY || calY(s), y1: calY(s), best: Math.round(g.best), peakF: g.peakF, why });
  if (!quiet) addLog(s, `「${g.name}」 ${vt ? '졸업' : '해체'} (${why}).`, 'career');
  return vt ? `「${g.name}」 멤버들이 모두 졸업했다.` : `「${g.name}」${josa(g.name, '이가').slice(g.name.length)} 해체했다.`;
}
E({
  id: 'co_renew', cat: '그룹', title: (s, d) => `「${(coGroup(s, d.gid) || {}).name || ''}」 계약 만료`, tag: 'career',
  cond: s => coOn(s),
  init(s, d) { const g = coGroup(s, d.gid); if (!g) { d.skip = true; return; } d.nc = Math.max(0.4, Math.round((g.cut - 0.15) * 100) / 100); d.bonus = Math.round(Math.max(1000e4, coGFans(g) * 120) * g.members.length / 1e6) * 1e6; },
  text: (s, d) => { const g = coGroup(s, d.gid); return `「${g.name}」 전속 계약이 끝났다. 멤버들이 재계약 조건을 내걸었다.\n\n회사 몫 ${pctN(g.cut)} → ${pctN(d.nc)} · 재계약금 ${fmtWon(d.bonus)} (멤버 ${g.members.length}명) · 5년\n${g.kind === 'vt' ? '기수 구독자' : '그룹 팬'} ${fmtFans(coGFans(g))} · 회사 돈 ${fmtWon(coT(s).money)}`; },
  ch: (s, d) => { const g = coGroup(s, d.gid); return [
    { t: '재계약한다', h: `재계약금 ${fmtWon(d.bonus)}`, ok: s => coT(s).money >= d.bonus, f: s => { const t = coT(s); coOut(t, d.bonus, '재계약금'); g.cut = d.nc; g.cEnd = g.months + 60; g.renewQ = false; return `「${g.name}」${josa(g.name, '과와').slice(g.name.length)} 5년 재계약을 했다. 회사 몫 ${pctN(d.nc)}.`; } },
    { t: g.kind === 'vt' ? '졸업시킨다' : '해체한다', f: s => coDisband(s, coT(s), g, '계약 만료', true) },
  ]; },
});

// ───── 버츄얼 아이돌 기수 (vidol 분야) ─────
// 기수를 데뷔시킬 때 아바타를 고른다 (멤버마다 회사 돈). 데뷔하면 멤버마다 자기 채널로 방송하고 구독자가 따로 는다 (버츄얼 아이돌 직업과 같은 눈금)
// 수입: 방송 후원·멤버십(매달) · 광고·협업(영업을 하면 더) · 굿즈 · 3D 라이브 콘서트. 3D 모델·굿즈·라이브는 대표가 정한다
const CO_VAV = [[2, 'Live2D 아바타', 300e4], [3, '고급 Live2D 아바타', 800e4], [4, '처음부터 3D 모델', 3000e4]];
const CO_V3D = { cost: 3000e4 }, CO_VGOODS = 300e4, CO_VLIVE = { cost: 2e8, min: 20e4 }, CO_VSAT = 300e4;
function coVAppeal(s, t, x) {
  const C = VI_CORP, sk = lv(x, 'variety') * 0.6 + Math.max(lv(x, 'vocal'), lv(x, 'game'), lv(x, 'acting')) * 0.4;
  // 운: 기수마다(g.mo, 같이 뜨거나 같이 묻힌다) · 멤버마다(x.co.luck) 다르다
  const g = coGroup(s, x.co.gid);
  return sk * 0.8 + C.edit + Math.min(3, x.co.av || 2) * C.av + coTier(t, 'vidol') * C.tier + (x.co.d3 ? C.d3 : 0) + (x.tal.star - 50) * 0.3 + (g ? g.mo * 0.75 + U.clamp(g.tw0 || 0, 0, CO_SQ_MAX) / 8 : 0) + (x.co.luck || 0);
}
function coVSubs(s, g) { return coP(s, g.members).reduce((a, x) => a + (x.co.subs || 0), 0); }
function coVName(x) { return x.co.given || x.name; }
// 버츄얼 아이돌 분야 평판: 활동 기수가 많을수록 하나하나의 일로는 덜 오른다
function coVRep(s, t, v) { const n = t.groups.filter(g => g.kind === 'vt' && g.debuted).length; t.f.vidol.rep = Math.min(100, t.f.vidol.rep + v / Math.sqrt(Math.max(1, n))); }
E({
  id: 'co_vav', cat: '기수 데뷔', tag: 'career',
  title: (s, d) => `「${(coGroup(s, d.gid) || {}).name || ''}」 아바타`,
  cond: s => coOn(s),
  init(s, d) { if (!coGroup(s, d.gid)) d.skip = true; },
  text: (s, d) => { const g = coGroup(s, d.gid); return `「${g.name}」 멤버\n${coP(s, g.members).map(x => `· ${x.name} (${pAge(s, x)}세) — ${coMemberSub(s, x)}`).join('\n')}\n\n데뷔할 아바타를 정하자. 좋은 아바타일수록 시청자가 많이 모인다.\n회사 돈 ${fmtWon(coT(s).money)}`; },
  ch: (s, d) => { const g = coGroup(s, d.gid), m = g.members.length, t = coT(s); return CO_VAV.map(([av, n, c]) => ({ t: n, h: `${fmtWon(c)} × ${m}명 = ${fmtWon(c * m)}${t.money >= c * m ? '' : ` · 회사 돈 ${fmtWon(c * m - t.money)} 모자람`}`, f: s => coVDebut(s, coT(s), g, av, c) })); },
});
function coVDebut(s, t, g, av, c) {
  const P = coP(s, g.members), tier = coTier(t, 'vidol');
  coOut(t, c * P.length, '아바타 제작비'); g.debt += c * P.length;
  for (const x of P) {
    x.co.given = vtRpName(x.g); (s.usedNames = s.usedNames || []).push(x.co.given);
    x.co.av = Math.min(3, av); x.co.d3 = av >= 4; x.co.subs = Math.round(tier * 2500 * U.fl(0.7, 1.3)); x.co.peak = x.co.subs; x.co.luck = U.normal(0, 2);
  }
  g.debuted = true; g.debutT = s.t; g.debutY = calY(s); g.f.kr = coVSubs(s, g);
  t.f.vidol.rep = Math.min(100, t.f.vidol.rep + 1);
  if (!t.vfirst) { t.vfirst = true; milestone(s, `${age(s)}세에 우리 회사 첫 버츄얼 아이돌 「${g.name}」${josa(g.name, '이가').slice(g.name.length)} 데뷔했다.`); }
  return `「${g.name}」 데뷔! ${P.map(coVName).join(', ')}${josa(coVName(P[P.length - 1]), '이가').slice(coVName(P[P.length - 1]).length)} 첫 방송을 했다. (아바타 ${fmtWon(c * P.length)})`;
}
function coVGenMonth(s, t, g, sales) {
  g.months++;
  if (!g.debuted) { if (!hasQ(s, 'co_vav') && ++g.nextCb >= 101) { g.nextCb = 99; queueEv(s, 'co_vav', 0, { gid: g.id }, true); } return; }
  const eqm = CO_EQ.mult[t.eq || 0];
  // 한 회사 시청자층은 겹친다: 회사 전체 구독자가 많을수록 멤버 하나가 더 크기 어렵다
  const sat = 1 + t.groups.filter(y => y.kind === 'vt').reduce((a, y) => a + coVSubs(s, y), 0) / CO_VSAT;
  let rev = 0;
  for (const x of coP(s, g.members)) {
    for (const k of coSkillsOf(x)) { const tr = coTrainer(s, k); practice(s, x, k, (k === 'variety' ? 1.5 : 0.8) * (tr ? 1 + teachLv(tr, k) / 80 : 1), eqm); }
    const c = x.co, tg = viTarget(coVAppeal(s, t, x), false) / sat, before = c.subs || 0;
    c.subs = before < tg ? before + Math.round((tg - before) * U.fl(0.02, 0.06) * 1.6 + U.int(3, 20)) : Math.round(before * U.fl(0.99, 1));
    c.peak = Math.max(c.peak || 0, c.subs);
    if (c.subs >= 1000) rev += c.subs * VT_INC * U.fl(0.6, 1.4);
    if (before < 1e5 && c.subs >= 1e5) { addLog(s, `우리 회사 ${josa(coVName(x), '이가')} 구독자 10만 명을 넘었다.`, 'good'); }
    if (before < 1e6 && c.subs >= 1e6) { milestone(s, `${age(s)}세에 우리 회사 ${josa(coVName(x), '이가')} 구독자 100만 명을 넘었다.`); coVRep(s, t, 2); }
  }
  g.f.kr = coVSubs(s, g);
  // 대표 등급에는 기수 구독자의 절반만 센다 (멤버 여럿의 구독자를 더한 수라서)
  g.peakF = Math.max(g.peakF, g.f.kr); t.peakF = Math.max(t.peakF, Math.round(g.peakF * 0.5));
  // 광고·협업: 구독자가 많을수록 (영업을 하면 더)
  rev += g.f.kr * 60 * (sales ? coSalesM(s, 1.3) : 1);
  if (rev > 0) { coIn(t, rev, '방송 후원·멤버십'); coSettle(s, t, g, rev); }
  if (g.months >= g.cEnd && !g.renewQ) { g.renewQ = true; queueEv(s, 'co_renew', 0, { gid: g.id }, true); }
}
// 대표가 정하는 일: 3D 모델 · 굿즈 · 3D 라이브 콘서트 (회사 창 그룹 탭)
function coV3dWho(s, g) { return coP(s, g.members).filter(x => !x.co.d3); }
function coVActs(s, t, g) {
  const A = [], w3 = coV3dWho(s, g), sub = coVSubs(s, g), P = coP(s, g.members);
  if (w3.length) A.push({ t: '3D 모델 만들기', h: `${w3.map(coVName).join(', ')} · ${fmtWon(CO_V3D.cost * w3.length)} · 3D 데뷔 방송 후원이 들어오고 시청자가 는다`, ok: t.money >= CO_V3D.cost * w3.length, why: '회사 돈이 모자라다', btn: '만들기', run: s => {
    coOut(t, CO_V3D.cost * w3.length, '3D 모델'); g.debt += CO_V3D.cost * w3.length;
    let inc = 0; for (const x of w3) { x.co.d3 = true; x.co.subs = Math.round(x.co.subs * 1.1); inc += x.co.subs * U.fl(200, 400); }
    coIn(t, inc, '3D 데뷔 방송'); coSettle(s, t, g, inc); coVRep(s, t, 0.5);
    return `${w3.map(coVName).join(', ')} 3D 데뷔! 후원 ${fmtWon(inc)}.`;
  } });
  const gw = coVGoodsWhy(s, t, g), au = g.auto || {}, line = c => ` · 자동: 회사 돈 ${fmtWon(c + coFixed(s, t) * CO_AUTO_RES)} 이상일 때`;
  A.push({ t: '굿즈 내기', h: `${fmtWon(coVGoodsCost(s, g))} · 구독자가 많을수록 많이 팔린다 · 6개월에 한 번${au.goods ? line(coVGoodsCost(s, g)) : ''}`, why: gw, opts: [
    { btn: '내기', on: true, ok: !gw, run: s => coVGoods(s, t, g) }, coVAutoBtn(g, 'goods')] });
  const lw = coVLiveWhy(s, t, g);
  A.push({ t: '3D 라이브 콘서트', h: `${fmtWon(CO_VLIVE.cost)} · 멤버들의 노래·춤·예능 실력이 좋을수록 잘된다 · 1년에 한 번${au.live ? line(CO_VLIVE.cost) : ''}`, why: lw, opts: [
    { btn: '열기', on: true, ok: !lw, run: s => coVLive(s, t, g) }, coVAutoBtn(g, 'live')] });
  return A;
}
// 기수 굿즈 · 3D 라이브 (피드백 31: 자동으로도 연다. 자동일 때는 창 없이 기록만)
function coVAutoBtn(g, k) { const on = !!(g.auto || {})[k]; return { btn: on ? '🔁 자동 켜짐' : '🔁 자동', on, ok: true, run: () => { (g.auto = g.auto || {})[k] = !on; return ''; } }; }
function coVGoodsCost(s, g) { return CO_VGOODS * coP(s, g.members).length; }
function coVGoodsWhy(s, t, g) { return g.goodsT > s.t ? `${g.goodsT - s.t}개월 뒤에 다시 낼 수 있다` : t.money < coVGoodsCost(s, g) ? '회사 돈이 모자라다' : ''; }
function coVGoods(s, t, g) {
  const c = coVGoodsCost(s, g);
  g.goodsT = s.t + 6; coOut(t, c, '굿즈 제작비');
  const inc = coVSubs(s, g) * U.fl(300, 600) * ((jobTask(s, 'agency') || {}).id === 'sales' && slotsOn(s, 'c_agency') ? coSalesM(s, 1.3) : 1);
  coIn(t, inc, '굿즈'); coSettle(s, t, g, inc);
  return `「${g.name}」 굿즈를 냈다. 매출 ${fmtWon(inc)} (제작비 ${fmtWon(c)}).`;
}
function coVLiveWhy(s, t, g) {
  const P = coP(s, g.members), sub = coVSubs(s, g), all3d = P.every(x => x.co.d3);
  return g.liveT > s.t ? `${g.liveT - s.t}개월 뒤에 다시 열 수 있다` : !all3d ? '멤버 모두 3D 모델이 있어야 한다' : sub < CO_VLIVE.min ? `기수 구독자가 ${fmtFans(CO_VLIVE.min)}을 넘어야 한다` : t.money < CO_VLIVE.cost ? '회사 돈이 모자라다' : '';
}
function coVLive(s, t, g, quiet) {
  const P = coP(s, g.members), sub = coVSubs(s, g);
  {
    g.liveT = s.t + 12; coOut(t, CO_VLIVE.cost, '3D 라이브 제작비');
    const avg = P.reduce((a, x) => a + lv(x, 'vocal') * 0.4 + lv(x, 'dance') * 0.2 + lv(x, 'variety') * 0.4, 0) / P.length;
    const sc = U.clamp(avg + Math.log10(1 + sub) * 4 + U.normal(0, 7) - 5, 0, 100);
    const inc = sub * U.fl(1000, 1600) * (0.6 + sc / 100);
    coIn(t, inc, '3D 라이브'); coSettle(s, t, g, inc);
    for (const x of P) x.co.subs = Math.round(x.co.subs * (sc >= 60 ? U.fl(1.04, 1.1) : U.fl(1, 1.03)));
    coVRep(s, t, sc >= 70 ? 2 : 0.5);
    g.lives = (g.lives || 0) + 1; g.best = Math.max(g.best, sc);
    if (!t.vlive) { t.vlive = true; milestone(s, `${age(s)}세에 우리 회사 「${g.name}」 첫 3D 라이브 콘서트를 열었다.`); }
    const how = sc >= 70 ? '무대가 끝나자 채팅창이 박수로 가득 찼다.' : sc >= 50 ? '무난하게 공연을 마쳤다.' : '멤버들이 긴장해서 실수가 잦았다.';
    if (quiet) return `「${g.name}」 3D 라이브 콘서트를 열었다. ${how} 매출 ${fmtWon(inc)} (제작비 ${fmtWon(CO_VLIVE.cost)}).`;
    return showResult(s, `「${g.name}」 3D 라이브 콘서트`, `${how}\n\n매출 ${fmtWon(inc)} (제작비 ${fmtWon(CO_VLIVE.cost)})`, `「${g.name}」 3D 라이브 콘서트. 매출 ${fmtWon(inc)}.`);
  }
}
// 연말 결산: 버츄얼 아이돌 분야 평판은 가장 큰 기수의 구독자만큼 오른다
function coViYear(s, t) {
  const F = t.f.vidol, L = t.groups.filter(g => g.kind === 'vt' && g.debuted);
  if (!L.length) return;
  const best = Math.max(...L.map(g => coVSubs(s, g)));
  F.rep = U.clamp(F.rep + U.clamp(Math.log10(1 + best) - 4.3, -1.5, 3) * 1.3, 0, 100);
  addRes(s, `🎙️ 버츄얼 아이돌 연말 결산: 가장 큰 기수 구독자 ${fmtFans(best)}.`);
}
// 분야 더하기: 어느 분야든 중형이 되면, 회사 돈으로 다른 분야를 연다 (새 분야는 소형부터)
function coAddWhy(s, t, f) { if (coTopTier(t) < 2) return '어느 분야든 중형이 되어야 더할 수 있다'; if (t.money < CO_ADD_COST) return '회사 돈이 모자라다'; return ''; }
function coAddField(s, t, f) {
  coOut(t, CO_ADD_COST, '분야 더하기');
  t.f[f] = { rep: 10, tier: 1 };
  milestone(s, `${age(s)}세에 「${t.name}」에 ${CO_FIELDS[f].n} 분야를 더했다.`);
  return `「${t.name}」에 ${CO_FIELDS[f].n} 분야를 더했다. ${f === 'mcn' ? '크리에이터 탭에서 영입 제안을 보낼 수 있다.' : '연습생 탭에서 오디션을 열 수 있다.'}`;
}

// ───── MCN (mcn 분야) ─────
// 연습생 대신 이미 활동 중인 업계 스트리머·버튜버에게 영입 제안을 보낸다 (환생 없음: 채널·구독자·이름 그대로)
// 수입: 크리에이터 수익 중 회사 몫 + 광고 영업 수수료(대표가 영업을 하면 더). 편집자 직원이 크리에이터를 맡으면 더 빨리 큰다
// 계약이 끝나면 크리에이터가 남을지 정한다: 계약하는 동안 많이 컸을수록, 회사가 클수록, 회사 몫이 낮을수록 남는다
function coMcnP(s, t, x, cut) {
  const c = Math.log10(Math.max(1000, x.yt.subs));
  return U.clamp(0.6 + (coTier(t, 'mcn') + t.f.mcn.rep / 50 - (c - 3)) * 0.25 - (cut - 0.2) * 2 - (x.yt.mcn ? 0.15 : 0), 0.03, 0.92);
}
function coMcnWhy(s, t) {
  if (hasQ(s, 'co_mscout') || hasQ(s, 'co_mpick')) return '영입 후보를 보는 중';
  if (t.mscoutT > s.t) return `${t.mscoutT - s.t}개월 뒤에 다시 보낼 수 있다`;
  if (coCrs(s).length >= CO_CR_CAP[coTier(t, 'mcn')]) return `${coSizeN(t, 'mcn')}은 크리에이터를 ${CO_CR_CAP[coTier(t, 'mcn')]}명까지 둔다`;
  return '';
}
E({
  id: 'co_mpick', cat: 'MCN', title: '영입 조건', tag: 'career',
  cond: s => coOn(s),
  text: s => `업계 스트리머·버튜버에게 영입 제안을 보낸다. 수익 중 회사 몫을 정하자. 몫이 클수록 회사가 버는 돈은 많지만, 받아들이는 크리에이터는 줄어든다.

회사와 크기 차이가 아주 큰 크리에이터는 몫을 5%씩 다르게 부른다.`,
  ch: s => CO_MCN_CUTS.map(c => ({ t: `회사 몫 ${pctN(c)}`, f: s => { fireEvent(s, 'co_mscout', { cut: c }); return ''; } })).concat([{ t: '그만둔다', f: () => '' }]),
});
function coMcnCand(s, t) {
  const tier = coTier(t, 'mcn');
  const old = people(s, x => x.yt && x.yt.mcn !== 'me' && !x.co && x.alive && x.yt.subs < Math.pow(10, 4.4 + tier * 0.4));
  if (old.length && U.chance(0.3)) return U.pick(old);
  const x = mcnMakeCreator(s, { subs: Math.pow(10, U.fl(3.3, 4.4 + tier * 0.4)) });
  if (U.chance(0.4)) x.yt.mcn = U.pick(mcnAgencies()).id;
  return x;
}
// 크리에이터마다 회사 몫: 대표가 고른 기본 몫에서, 회사 크기와 열 배 넘게 차이 나면 5%씩 바뀐다 (큰 크리에이터는 낮게, 아주 작은 크리에이터는 높게)
function coMcnCut(t, x, base) { const g = mcnGap(x.yt.subs, coTier(t, 'mcn')), adj = g >= 2 ? -(g - 1) : g <= -2 ? -g - 1 : 0; return U.clamp(Math.round((base + adj * 0.05) * 100) / 100, 0.1, 0.4); }
function coCrLabel(s, x) { return `${mcnCrName(x)} · ${x.yt.mode === 'vt' ? '버튜버' : '스트리머'} · ${x.yt.cat} (${x.name} · ${pAge(s, x)}세)`; }
E({
  id: 'co_mscout', cat: 'MCN', title: '영입 후보', tag: 'career',
  tbl: (s, d) => {
    const t = coT(s);
    const rows = d.ids.map(id => s.people[id]).filter(Boolean).map(x => { const cut = coMcnCut(t, x, d.cut), p = coMcnP(s, t, x, cut), tr = mcnTrend(x); return { k: x.id, tr: (x.yt.mode === 'vt' ? '버튜버' : '캠튜버') === s.trendTV.yt, cells: {
      ch: [x.yt.ch, mcnCrName(x)], kind: [x.yt.mode, x.yt.mode === 'vt' ? '버튜버' : '스트리머'], cat: [x.yt.cat, x.yt.cat], who: [x.name, `${x.name} (${pAge(s, x)}세)`], subs: [x.yt.subs, fmtFans(x.yt.subs)], tr: [tr, `${tr >= 0 ? '+' : ''}${tr}%`],
      ag: [x.yt.mcn ? 1 : 0, x.yt.mcn ? (AG[x.yt.mcn] ? AG[x.yt.mcn].n : '다른 MCN') : '없음'], cut: [cut, pctN(cut)], p: [p, fmtPct(p)] } }; });
    return { cols: [['ch', '채널'], ['kind', '종류'], ['cat', '분야'], ['who', '이름'], ['subs', '구독자'], ['tr', '최근 1년'], ['ag', '소속'], ['cut', '회사 몫'], ['p', '받아들일 가능성']], rows };
  },
  cond: s => coOn(s),
  init(s, d) { const t = coT(s), L = []; for (let i = U.int(4, 6); i > 0; i--) { const x = coMcnCand(s, t); if (!L.includes(x.id)) L.push(x.id); } d.ids = L; },
  text: (s, d) => { const t = coT(s); return `영입 제안을 보낼 크리에이터를 체크하자. 기본 회사 몫 ${pctN(d.cut)} · 계약 2년.\n\n크리에이터 ${coCrs(s).length}/${CO_CR_CAP[coTier(t, 'mcn')]}명`; },
  form: (s, d) => { const t = coT(s); return d.ids.map(id => s.people[id]).filter(Boolean).map(x => ({ k: x.id, type: 'check', label: coCrLabel(s, x), tr: (x.yt.mode === 'vt' ? '버튜버' : '캠튜버') === s.trendTV.yt, sub: `구독자 ${fmtFans(x.yt.subs)} · 최근 1년 ${mcnTrend(x) >= 0 ? '+' : ''}${mcnTrend(x)}% · ${x.yt.mcn ? `지금 ${AG[x.yt.mcn] ? AG[x.yt.mcn].n : '다른 MCN'} 소속` : '소속 없음'} · 회사 몫 ${pctN(coMcnCut(t, x, d.cut))} · 받아들일 가능성 ${fmtPct(coMcnP(s, t, x, coMcnCut(t, x, d.cut)))}` })); },
  cancel: () => '이번엔 영입 제안을 보내지 않았다.',
  submit(s, d, v) {
    const t = coT(s), pick = d.ids.filter(id => v[id] && s.people[id]), room = CO_CR_CAP[coTier(t, 'mcn')] - coCrs(s).length;
    if (pick.length > room) return { err: `크리에이터는 ${Math.max(0, room)}명까지 더 둘 수 있어요` };
    if (!pick.length) return { log: '이번엔 영입 제안을 보내지 않았다.' };
    t.mscoutT = s.t + 3;
    const yes = [], no = [];
    for (const id of pick) {
      const x = s.people[id];
      const cut = coMcnCut(t, x, d.cut);
      if (!U.chance(coMcnP(s, t, x, cut))) { no.push(mcnCrName(x)); continue; }
      x.co = { f: 'mcn', role: 'art', kind: 'cr', cut, left: 24, months: 24, since: s.t, subs0: x.yt.subs };
      x.yt.mcn = 'me'; x.yt.peak = Math.max(x.yt.peak || 0, x.yt.subs); t.crs.push(id); yes.push(mcnCrName(x));
      if (x.yt.subs >= 1e6) coVRepF(t, 'mcn', 1.5); else if (x.yt.subs >= 1e5) coVRepF(t, 'mcn', 0.5);
    }
    if (yes.length && !t.mfirst) { t.mfirst = true; milestone(s, `${age(s)}세에 「${t.name}」에 첫 크리에이터 ${yes[0]}${josa(yes[0], '이가').slice(yes[0].length)} 들어왔다.`); }
    return { log: (yes.length ? `${josa(yes.join(', '), '이가')} ${josa(`「${t.name}」`, '과와')} 계약했다.` : '') + (no.length ? ` ${josa(no.join(', '), '은는')} 제안을 거절했다.` : '') };
  },
});
// 분야 평판을 올린다 (그 분야에서 활동하는 사람이 많을수록 하나하나로는 덜 오른다)
function coVRepF(t, f, v) { if (t.f[f]) t.f[f].rep = Math.min(100, t.f[f].rep + v); }
// 편집자: 한 명이 크리에이터 CO_ED_PER명까지 맡는다. 편집 실력이 좋을수록 채널이 더 큰다
function coMcnBoost(s, t) {
  const eds = coStaff(s, 'edit'), n = coCrs(s).length;
  const cov = n ? Math.min(1, eds.length * CO_ED_PER / n) : 0, q = eds.length ? eds.reduce((a, x) => a + lv(x, 'edit'), 0) / eds.length : 0;
  return MCN_HELP.grow[coTier(t, 'mcn')] + cov * U.clamp((q - 30) / 8, 0, 3);
}
function coMcnMonth(s, t, sales) {
  const L = coCrs(s), mult = Math.pow(10, coMcnBoost(s, t) / 24);
  let rev = 0, sum = 0;
  for (const x of L) {
    const y = x.yt, cap = y.mode === 'vt' ? 3e6 : 2e7, tg = Math.min(cap, y.tg * mult), b = y.subs;
    y.subs = b < tg ? b + Math.round((tg - b) * U.fl(0.02, 0.05) + U.int(5, 30)) : Math.round(b * U.fl(0.985, 1));
    y.peak = Math.max(y.peak || 0, y.subs); sum += y.subs;
    rev += mcnCrRev(x) * x.co.cut;
    if (b < 1e6 && y.subs >= 1e6) { milestone(s, `${age(s)}세에 우리 회사 크리에이터 ${josa(mcnCrName(x), '이가')} 구독자 100만 명을 넘었다.`); coVRepF(t, 'mcn', 1.5); }
    else if (b < 1e5 && y.subs >= 1e5) { addLog(s, `우리 회사 크리에이터 ${josa(mcnCrName(x), '이가')} 구독자 10만 명을 넘었다.`, 'good'); coVRepF(t, 'mcn', 0.5); }
    if (--x.co.left <= 0 && !x.co.renewQ) { x.co.renewQ = true; queueEv(s, 'co_mrenew', 0, { id: x.id }, true); }
  }
  if (rev > 0) coIn(t, rev, '크리에이터 수익 몫');
  // 광고 영업 수수료: 소속 크리에이터 구독자가 많을수록 (대표가 영업을 하면 더)
  if (sum > 0) coIn(t, sum * CO_MADS * (sales ? coSalesM(s, 1.5) : 1), '광고 영업 수수료');
  // 대표 등급에는 가장 큰 크리에이터 구독자의 30%와 소속 크리에이터 구독자 합의 5% 중 큰 쪽을 센다
  t.peakF = Math.max(t.peakF, Math.round(Math.max(0, ...L.map(x => x.yt.subs)) * 0.3), Math.round(sum * 0.05));
}
// 연말: 소속 크리에이터 구독자 합만큼 평판이 오른다. 크리에이터마다 기세가 조금씩 바뀐다
function coMcnYear(s, t) {
  const L = coCrs(s), sum = L.reduce((a, x) => a + x.yt.subs, 0);
  for (const x of L) x.yt.tg = Math.round(U.clamp(x.yt.tg * U.fl(0.75, 1.3), 1000, x.yt.mode === 'vt' ? 3e6 : 2e7));
  if (!L.length) return;
  t.f.mcn.rep = U.clamp(t.f.mcn.rep + U.clamp((Math.log10(1 + sum) - 4.8) * 2.2, -2, 3.5), 0, 100);
  addRes(s, `📡 MCN 연말 결산: 크리에이터 ${L.length}명 · 구독자 합 ${fmtFans(sum)}.`);
}
// 계약 만료: 크리에이터가 남을지 정한다 (회사 몫을 낮춰 붙잡을 수 있다)
function coMcnStay(s, t, x, cut) { const g = x.yt.subs / Math.max(1, x.co.subs0); return U.clamp(0.35 + U.clamp((g - 1) * 0.5, -0.3, 0.35) + coTier(t, 'mcn') * 0.08 + t.f.mcn.rep / 200 - (cut - 0.2) * 1.5 - Math.max(0, Math.log10(x.yt.subs) - 5.5) * 0.35, 0.05, 0.95); }
function coMcnRelease(s, t, x, to) { t.crs = t.crs.filter(id => id !== x.id); x.co = null; x.yt.mcn = to || null; }
E({
  id: 'co_mrenew', cat: 'MCN', title: (s, d) => `${mcnCrName(s.people[d.id] || { yt: { ch: '' } })} 계약 만료`, tag: 'career',
  cond: s => coOn(s),
  init(s, d) { const x = s.people[d.id]; if (!x || !x.co || x.co.kind !== 'cr') d.skip = true; },
  text: (s, d) => { const x = s.people[d.id]; return `${mcnCrName(x)} 계약이 끝났다. 계약할 때 구독자 ${fmtFans(x.co.subs0)} → 지금 ${fmtFans(x.yt.subs)}. 지금 회사 몫 ${pctN(x.co.cut)}.\n\n다른 MCN들도 연락하고 있다고 한다.`; },
  ch: (s, d) => { const t = coT(s), x = s.people[d.id], c = x.co.cut, C = [];
    const go = nc => s => { if (U.chance(coMcnStay(s, t, x, nc))) { Object.assign(x.co, { cut: nc, left: 24, months: 24, subs0: x.yt.subs, renewQ: false }); return `${josa(mcnCrName(x), '과와')} 2년 재계약했다. 회사 몫 ${pctN(nc)}.`; } const to = U.pick(mcnAgencies()); coMcnRelease(s, t, x, to.id); return `${josa(mcnCrName(x), '은는')} ${josa(to.n, '으로')} 옮기기로 했다.`; };
    C.push({ t: '같은 조건으로 재계약을 제안한다', h: `남을 가능성 ${fmtPct(coMcnStay(s, t, x, c))}`, f: go(c) });
    if (c > 0.1) { const nc = Math.round((c - 0.05) * 100) / 100; C.push({ t: `회사 몫을 ${pctN(nc)}로 낮춰 제안한다`, h: `남을 가능성 ${fmtPct(coMcnStay(s, t, x, nc))}`, f: go(nc) }); }
    C.push({ t: '계약을 끝낸다', f: s => { coMcnRelease(s, t, x); return `${josa(mcnCrName(x), '과와')}의 계약을 끝냈다.`; } });
    return C; },
});
// 대표가 정하는 일 (크리에이터 탭): 합동 콘텐츠 기획
function coMcnActs(s, t) {
  const L = coCrs(s), w = t.mcollT > s.t ? `${t.mcollT - s.t}개월 뒤에 다시 할 수 있다` : L.length < 2 ? '크리에이터가 두 명 이상 있어야 한다' : t.money < CO_MCOLLAB ? '회사 돈이 모자라다' : '';
  return [{ t: '합동 콘텐츠 기획', h: `${fmtWon(CO_MCOLLAB)} · 소속 크리에이터가 다 함께 나오는 콘텐츠 · 6개월에 한 번`, ok: !w, why: w, btn: '기획', run: s => {
    t.mcollT = s.t + 6; coOut(t, CO_MCOLLAB, '합동 콘텐츠');
    let g = 0; for (const x of L) { const b = x.yt.subs; x.yt.subs = Math.round(b * U.fl(1.03, 1.08)); x.yt.tg = Math.round(x.yt.tg * U.fl(1.01, 1.03)); g += x.yt.subs - b; }
    coVRepF(t, 'mcn', 0.5);
    return `「${t.name}」 크리에이터 ${L.length}명이 함께하는 합동 콘텐츠를 냈다. 구독자 합 ${sgnFans(g)}.`;
  } }, coMcnGoodsAct(s, t), coMcnEventAct(s, t)];
}
// 굿즈 판매: 구독자 5만 명이 넘는 크리에이터 모두의 굿즈를 만든다. 제작비는 회사가 내고, 판 돈은 계약한 몫대로 나눈다 (1년에 한 번)
function coMcnBig(s) { return coCrs(s).filter(x => x.yt.subs >= 5e4); }
function coMcnGoodsAct(s, t) {
  const B = coMcnBig(s), cost = B.length * CO_MGOODS, w = t.mgoodsT > s.t ? `${t.mgoodsT - s.t}개월 뒤에 다시 할 수 있다` : !B.length ? '구독자 5만 명이 넘는 크리에이터가 있어야 한다' : t.money < cost ? '회사 돈이 모자라다' : '';
  return { t: '굿즈 판매', h: `구독자 5만 명이 넘는 크리에이터 ${B.length}명 · 제작비 한 명당 ${fmtWon(CO_MGOODS)} · 1년에 한 번`, ok: !w, why: w, btn: '만들기', run: s => {
    t.mgoodsT = s.t + 12; coOut(t, cost, '굿즈 제작비');
    let u = 0, inc = 0;
    for (const x of B) { const n = mcnGoodsUnits(x.yt.subs, x.yt.mode === 'vt'); u += n; inc += n * MCN_GOODS_PER * x.co.cut; }
    coIn(t, Math.round(inc), '굿즈 판매');
    return `「${t.name}」 크리에이터 ${B.length}명의 굿즈가 ${u.toLocaleString()}개 팔렸다. 회사 몫 ${fmtWon(Math.round(inc))} (제작비 ${fmtWon(cost)}).`;
  } };
}
// 개인 행사: 크리에이터 한 명의 팬미팅을 연다. 대관·진행 비용을 뺀 돈을 몫대로 나누고, 손해가 나면 회사가 떠안는다 (6개월에 한 번)
function coMcnEventAct(s, t) {
  const B = coMcnBig(s), w = t.meventT > s.t ? `${t.meventT - s.t}개월 뒤에 다시 할 수 있다` : !B.length ? '구독자 5만 명이 넘는 크리에이터가 있어야 한다' : t.money < CO_MEVENT_MIN ? '회사 돈이 모자라다' : '';
  return { t: '개인 행사 열기', h: '크리에이터 한 명의 팬미팅을 연다 · 대관·진행 비용은 회사가 먼저 낸다 · 6개월에 한 번', ok: !w, why: w, btn: '고르기', run: s => { fireEvent(s, 'co_mevent', {}); return ''; } };
}
E({
  id: 'co_mevent', cat: 'MCN', title: '누구의 행사를 열까?', tag: 'career',
  cond: s => coOn(s),
  text: s => '팬미팅·토크 콘서트를 열 크리에이터를 고르자. 구독자가 많을수록 사람이 많이 온다. 표 매출에서 대관·진행 비용을 뺀 돈을 계약한 몫대로 나누고, 손해가 나면 회사가 떠안는다.',
  ch: s => { const t = coT(s); return coMcnBig(s).sort((a, b) => b.yt.subs - a.yt.subs).slice(0, 6).map(x => ({ t: `${mcnCrName(x)} · 구독자 ${fmtFans(x.yt.subs)}`, h: `회사 몫 ${pctN(x.co.cut)}`, f: s => {
    t.meventT = s.t + 6;
    const r = mcnEventRoll(x.yt.subs, 1), gain = Math.round(x.yt.subs * U.fl(0.01, 0.03));
    x.yt.subs += gain; x.yt.peak = Math.max(x.yt.peak || 0, x.yt.subs); coVRepF(t, 'mcn', 0.3);
    if (r.net > 0) { const inc = Math.round(r.net * x.co.cut); coIn(t, inc, '개인 행사'); return `${mcnCrName(x)} 팬미팅에 ${r.n.toLocaleString()}명이 왔다. 표 매출 ${fmtWon(r.gross)} · 대관·진행 ${fmtWon(r.cost)} · 회사 몫 ${fmtWon(inc)}. 구독자 ${sgnFans(gain)}.`; }
    coOut(t, -r.net, '개인 행사');
    return `${mcnCrName(x)} 팬미팅에 ${r.n.toLocaleString()}명이 왔다. 표 매출 ${fmtWon(r.gross)} · 대관·진행 ${fmtWon(r.cost)} · 회사 손해 ${fmtWon(-r.net)}. 구독자 ${sgnFans(gain)}.`;
  } })).concat([{ t: '그만둔다', f: () => '' }]); },
});

// ───── 크기·대표 등급 ─────
function coTierCheck(s, t) {
  let out = '';
  for (const f in t.f) {
    const F = t.f[f], nt = coTierOfRep(F.rep, F.tier);
    if (nt === F.tier) continue;
    const up = nt > F.tier; F.tier = nt;
    out = up ? `「${t.name}」${josa(t.name, '이가').slice(t.name.length)} ${TIER_N[nt]} ${josa(CO_FIELDS[f].n, '으로')} 커졌다!` : `「${t.name}」${josa(t.name, '이가')} ${TIER_N[nt]} ${josa(CO_FIELDS[f].n, '으로')} 작아졌다.`;
    if (up) milestone(s, `${age(s)}세에 「${t.name}」${josa(t.name, '을를').slice(t.name.length)} ${TIER_N[nt]} ${josa(CO_FIELDS[f].n, '으로')} 키웠다.`);
    addRes(s, out, up ? 'good' : 'career');
  }
  return out;
}
function coRank(t) {
  const fs = Object.values(t.f), size = fs.reduce((a, F) => a + F.tier, 0), rep = Math.max(...fs.map(F => F.rep)), U2 = CO_RANK_UP;
  for (let k = 6; k >= 1; k--) if ((t.peakF || 0) >= U2.fans[k] && rep >= U2.rep[k] && size >= U2.size[k]) return k;
  return 0;
}
function coRankName(t, k) { return CO_RANK[k]; }
function coRankCheck(s, t) {
  const k = coRank(t);
  if (k <= (t.rankMax || 0)) return '';
  t.rankMax = k;
  if (k < 2) return '';
  const n = coRankName(t, k), o = `「${t.name}」${josa(t.name, '을를').slice(t.name.length)}`;
  if (k >= 4) milestone(s, `${age(s)}세에 ${o} ${josa(n, '으로')} 키웠다.`);
  return `업계에서 ${o} ${josa(n, '으로')} 본다.`;
}

// ───── 대표의 한 달 ─────
// 예전 세이브(6-1) 정리: 오디션 쿨타임은 분야별, 사람마다 분야 표시
function coFix(s, t) {
  if (typeof t.audCd !== 'object' || !t.audCd) t.audCd = { music: t.audCd || 0 };
  t.gen = t.gen || {}; t.crs = t.crs || []; t.vw = t.vw || []; t.vdone = t.vdone || []; t.aw = t.aw || []; t.adone = t.adone || []; t.main = t.main || coFields(t)[0] || 'music';
  for (const x of coP(s, t.tr.concat(...t.groups.map(g => g.members)))) if (!x.co.f) x.co.f = coFOfKind(x.co.kind);
}
// 사업 · 학업 (v95): 회사 운영으로 오르는 평판과 영업으로 느는 수입이 사업 · 학업(모두 강함)에 따라 커진다 (둘의 평균이 0이면 0.8배, 20이면 지금과 같고, 50이면 1.3배)
function coBizF(s) { const p = me(s); return U.clamp(0.8 + jobMix([[lv(p, 'biz'), JS_], [lv(p, 'study'), JS_]]) / 100, 0.8, 1.8); }
function coSalesM(s, base) { return 1 + (base - 1) * coBizF(s); }
function coMonth(s, t) {
  if (t.st !== 'active') return;
  t.lastL = t.L || {}; t.L = {};
  if (calM(s) === 0) { t.lastY = t.Y || {}; t.lastYY = calY(s) - 1; t.Y = {}; }
  t.months++;
  coFix(s, t);
  const p = me(s), n = s.army ? 0 : slotsOn(s, 'c_agency'), task = n ? (jobTask(s, 'agency') || {}).id : null, nf = coFields(t).length;
  if (n) addStress(s, 1.5);
  // 사업 특기: 회사를 차리면 생긴다 (예전 세이브도 여기서 준다). 회사 경영 칸을 넣으면 는다
  if (!has(p, 'biz')) learnSkill(s, p, 'biz');
  if (n) practice(s, p, 'biz', (task === 'teach' ? 0.3 : 0.6) * n);
  // 평판은 가만두면 조금씩 잊힌다. 회사 운영을 하면 오른다 (분야가 여럿이면 나눠서)
  for (const f of coFields(t)) {
    const F = t.f[f];
    if (F.rep > 20) F.rep -= 0.12;
    if (task === 'run') F.rep = Math.min(100, F.rep + 0.25 * coBizF(s) / Math.sqrt(nf));
  }
  if (task === 'teach') { if (!has(p, 'edu')) addLog(s, '연습생들을 직접 가르치다 보니 가르치는 요령이 생겼다.' + learnMe(s, 'edu', null, false, true), 'career'); teach(s, p, 1.2); }
  coOut(t, coOffice(t), '운영비');
  // 연습생 비용: 한 명마다 쌓아 두었다가 데뷔하면 그룹이 갚을 비용(g.debt)이 된다
  for (const x of coTrainees(s)) { const c = coTrCost(t, x.co.f); coOut(t, c, '연습생 비용'); x.co.cost = (x.co.cost || 0) + c; }
  coOut(t, coStaff(s).reduce((a, x) => a + (x.co.sal || 0), 0), '직원 월급');
  coOut(t, CO_EQ.up[t.eq || 0], '연습실 장비');
  coTrainMonth(s, t, task === 'teach');
  for (const g of t.groups.slice()) (g.kind === 'vt' ? coVGenMonth : coGroupMonth)(s, t, g, task === 'sales');
  if (t.f.mcn) coMcnMonth(s, t, task === 'sales');
  if (t.f.video) coVidMonth(s, t, task === 'sales');
  if (t.f.anime) coAniMonth(s, t, task === 'sales');
  if (calM(s) === 11) { coAwards(s, t); if (t.f.vidol) coViYear(s, t); if (t.f.mcn) coMcnYear(s, t); if (t.f.video) coVidYear(s, t); if (t.f.anime) coAniYear(s, t); }
  coTierCheck(s, t);
  const rk = coRankCheck(s, t); if (rk) addLog(s, rk, 'good');
  coAutoMonth(s, t);
  if (t.money < 0 && !hasQ(s, 'co_short')) queueEv(s, 'co_short', 0);
}
// 군 복무 중에도 회사는 돌아간다 (대표의 할 일은 못 한다)
function coArmy(s) { if (coOn(s)) coMonth(s, coT(s)); }

// ───── 직업 정의 ─────
JOB_TASKS.agency = [
  { id: 'run', n: '회사 운영', ic: '🏢', eff: [['회사 평판', '↑', 1], ['사업', '↑', 1], ['스트레스', '↑', 0]] },
  { id: 'teach', n: '연습생 직접 가르치기', ic: '🏋️', show: s => coOn(s) && coTrFields(coT(s)).length > 0, eff: [['연습생 실력', '↑', 1], ['교육', '↑', 1]] },
  { id: 'sales', n: '영업 (행사·광고 잡기)', ic: '🤝', eff: [['행사·광고 수입', '↑', 1], ['사업', '↑', 1], ['스트레스', '↑', 0]] },
];
CAREERS.agency = {
  n: '회사 대표', ic: '🏢',
  desc: '내 회사를 차려 운영한다. 기획사는 연습생을 뽑아 아이돌 그룹이나 밴드로, 버츄얼 아이돌 기획사는 기수로 데뷔시킨다. MCN은 활동 중인 스트리머·버튜버를 영입한다. 영상 제작사는 드라마·영화를, 애니메이션 제작사는 애니메이션을 기획해 만든다. 어느 분야든 중형이 되면 다른 분야를 더할 수 있다. 회사 돈은 내 돈과 따로다.',
  act: { n: '회사 경영', ic: '🏢', g: '직업 활동', eff: [['회사 평판', '↑', 1], ['사업', '↑', 1], ['스트레스', '↑', 0]] },
  panel: 'company', panelN: '🏢 회사 창 열기',
  status(s, t) { if (t.st !== 'active') return t.endNote || ''; return [t.name, coSizesN(t), coTrFields(t).length ? `연습생 ${coTrainees(s).length}명` : '', coGrpCount(t), `회사 돈 ${fmtWon(t.money)}`].filter(Boolean).join(' · '); },
  short(s, t) { return `${t.name} 대표`; },
  seg(s, t) { return `${t.name} 대표`; },
  title(s, t) { const k = Math.max(t.rankMax || 0, t.st === 'active' ? coRank(t) : 0); return k >= 1 ? coRankName(t, k) + ' 대표' : null; },
  contract(s, t) { return t.st === 'active' ? `${t.name} (내 회사)` : ''; },
  emp: true,
  mainSk() { return 'scout'; },
  // 대표의 할 일을 손 놓으면 분야 평판이 떨어진다 (jobIdleMonth)
  idleHit(s, t, v) { for (const f in t.f) t.f[f].rep = Math.max(0, t.f[f].rep - v); },
  info(s, t) {
    const k = coRank(t);
    const R = [['회사', `${t.name} · ${t.founded}년 설립`], ...coFieldRows(t), ['회사 돈', fmtWon(t.money)], ['회사 등급', coRankName(t, Math.max(k, t.rankMax || 0))], ['내 실력', ['biz', 'scout'].filter(x => has(me(s), x)).map(x => `${SKILLS[x].n} ${lvi(me(s), x)}`).join(' · ') || '-'], ['지난달', coSumText(t.lastL)]];
    if (coTrFields(t).length) R.push(['연습생', `${coTrainees(s).length}명`], { h: coGrpWord(t), items: t.groups.map(coGrpLine) });
    if (t.f.mcn) R.push({ h: '크리에이터', items: coCrs(s).map(x => `${mcnCrName(x)} · 구독자 ${fmtFans(x.yt.subs)}`) });
    if (t.f.anime) R.push({ h: '애니', items: (t.aw || []).map(pj => `「${pj.title}」 ${aKindN(pj.kind)} · ${A_STAGE[pj.stage]}`).concat((t.adone || []).slice(-4).reverse().map(w => `${w.y} 「${w.title}」 ${aKindN(w.kind)} · ${w.res}`)) });
    if (t.f.video) R.push({ h: '작품', items: (t.vw || []).map(pj => `「${pj.title}」 ${vKindN(pj.kind)} · ${V_STAGE[pj.stage]}`).concat((t.vdone || []).slice(-4).reverse().map(w => `${w.y} 「${w.title}」 ${vKindN(w.kind)} · ${w.res}`)) });
    return R;
  },
  actions(s, t) { return []; },
  monthly(s, t) { coMonth(s, t); },
};

// 분야별 줄·그룹을 부르는 말: 기획사만 있으면 '그룹', 버츄얼 아이돌 기획사만 있으면 '기수', 둘 다 있으면 '그룹·기수'
function coFieldRows(t) { return coFields(t).map(f => [`${CO_FIELDS[f].ic} ${CO_FIELDS[f].n}`, `평판 ${Math.round(t.f[f].rep)} · ${TIER_N[t.f[f].tier]}`]); }
function coGrpWord(t) { const m = !!t.f.music, v = !!t.f.vidol; return m && v ? '그룹·기수' : v ? '기수' : '그룹'; }
function coGrpCount(t) { const v = t.groups.filter(g => g.kind === 'vt').length, m = t.groups.length - v; return [t.f.music ? `그룹 ${m}팀` : '', t.f.vidol ? `기수 ${v}개` : '', t.f.mcn ? `크리에이터 ${(t.crs || []).length}명` : '', t.f.video ? `작품 ${(t.vdone || []).length}편${(t.vw || []).length ? ` (만드는 중 ${t.vw.length})` : ''}` : '', t.f.anime ? `애니 ${(t.adone || []).length}편${(t.aw || []).length ? ` (만드는 중 ${t.aw.length})` : ''}` : ''].filter(Boolean).join(' · '); }
function coGrpLine(g) { return `「${g.name}」 (${coKindN(g.kind)}) · ${g.debuted ? `${g.kind === 'vt' ? '구독자' : '팬'} ${fmtFans(coGFans(g))}` : '데뷔 준비 중'}`; }

// ───── 회사 창 (맨 위 🏢 회사 버튼) ─────
// MCN만 있는 회사는 연습생·그룹 탭이 없고, MCN이 있으면 크리에이터 탭이 생긴다
function coTabs(t) { const tr = coTrFields(t).length; return [['home', '🏢 회사']].concat(tr ? [['tr', '🌱 연습생'], ['grp', `${t.f.music ? '🎤' : '🎙️'} ${coGrpWord(t)}`]] : [], t.f.mcn ? [['cr', '📡 크리에이터']] : [], t.f.video ? [['vw', '🎬 작품']] : [], t.f.anime ? [['aw', '🎨 애니']] : [], [['staff', '🧑‍💼 직원'], ['auto', '🔁 자동']]); }
function panel_company() {
  const s = S;
  if (!coOn(s)) return '<div class="empty">운영 중인 회사가 없다.</div>';
  const t = coT(s); coFix(s, t);
  const CO_TABS = coTabs(t), tab = CO_TABS.some(x => x[0] === UI.coTab) ? UI.coTab : 'home';
  const cnt = { tr: coTrainees(s).length, grp: t.groups.length, cr: t.crs.length, vw: t.vw.length, aw: t.aw.length, staff: coStaff(s).length, auto: coAutoN(t) };
  let h = `<h2>🏢 ${U.esc(t.name)} <span class="muted" style="font-size:14px">${coSizesN(t)}</span></h2><div class="ap-row pf-tabs">${CO_TABS.map(([k, n]) => `<button class="ap-tab ${tab === k ? 'on' : ''}" data-cotab="${k}">${n}${cnt[k] ? ` <span class="ap-n">${cnt[k]}</span>` : ''}</button>`).join('')}</div>`;
  if (tab === 'tr') return h + coTabTr(s, t);
  if (tab === 'grp') return h + coTabGrp(s, t);
  if (tab === 'cr') return h + coTabCr(s, t);
  if (tab === 'vw') return h + coTabVw(s, t);
  if (tab === 'aw') return h + coTabAw(s, t);
  if (tab === 'staff') return h + coTabStaff(s, t);
  if (tab === 'auto') return h + coTabAuto(s, t);
  return h + coTabHome(s, t);
}
function coLedItems(L) { return Object.entries(L || {}).filter(([k, v]) => v && !CO_IO.includes(k)).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v > 0 ? '+' : '-'}${fmtWon(Math.abs(v))}`); }
function coTabHome(s, t) {
  const rk = Math.max(coRank(t), t.rankMax || 0);
  // 내 회사 소속으로 하는 내 활동 (v105): 비용 · 수익이 회사 돈으로 오간다
  const ownIds = Object.keys(OWN_CO_N).filter(j => ownCo(s, j)), own = ownIds.map(j => CAREERS[j].n);
  let h = infoTable([['회사 돈', fmtWon(t.money)], ...coFieldRows(t), own.length ? ['내 회사 소속 내 활동', `${own.join(' · ')} (비용 · 수익은 회사 돈)`] : null, ['회사 등급', coRankName(t, rk)], ['지난달', coSumText(t.lastL)], [t.lastYY ? `${t.lastYY}년` : '올해', coSumText(t.lastYY ? t.lastY : t.Y)], ['매달 꼭 나가는 돈', fmtWon(coFixed(s, t))], ['넣은 돈 · 꺼낸 돈', `${fmtWon(t.inv)} · ${fmtWon(t.out)}`], coTrFields(t).length ? ['연습실 장비', CO_EQ.n[t.eq || 0]] : null, t.f.music ? ['받은 상', `${t.awN}개`] : null,
    { h: '지난달 돈 흐름', items: coLedItems(t.lastL) }]);
  // 내 회사 소속 내 활동은 눌러서 그 직업 창으로 간다 (v116 버그 11)
  if (ownIds.length) h += `<div class="ap-row">${ownIds.map(j => `<button class="btn sm" data-job="${j}" data-from="company">${jobIc(j)} ${U.esc(jobName(j))} 창 열기</button>`).join('')}</div>`;
  const A = [
    { t: '돈 넣기', h: `내 돈 ${fmtWon(s.money)}`, ok: s.money > 0, btn: '넣기', run: s => { fireEvent(s, 'co_money', { dir: 'in' }); return ''; } },
    { t: '돈 꺼내기', h: `회사 돈 ${fmtWon(t.money)}`, ok: t.money > 0, btn: '꺼내기', run: s => { fireEvent(s, 'co_money', { dir: 'out' }); return ''; } },
  ];
  const e = t.eq || 0;
  if (e < 3 && coTrFields(t).length) A.push({ t: `연습실 장비: ${CO_EQ.n[e + 1]}`, h: `연습생·소속 아티스트 실력이 ${Math.round((CO_EQ.mult[e + 1] - 1) * 100)}% 더 빨리 는다 · ${fmtWon(CO_EQ.cost[e + 1])} · 유지비 월 ${fmtWon(CO_EQ.up[e + 1])}`, ok: t.money >= CO_EQ.cost[e + 1], why: '회사 돈이 모자라다', btn: '들이기', run: s => { coOut(t, CO_EQ.cost[e + 1], '연습실 장비'); t.eq = e + 1; return `「${t.name}」 연습실에 ${CO_EQ.n[e + 1]} 장비를 들였다.`; } });
  for (const f of Object.keys(CO_FIELDS).filter(f => !t.f[f])) {
    const w = coAddWhy(s, t, f);
    A.push({ t: `분야 더하기: ${CO_FIELDS[f].n}`, h: `${CO_FIELDS[f].what} · ${fmtWon(CO_ADD_COST)} · 소형부터 시작`, ok: !w, why: w, btn: '더하기', confirm: `「${t.name}」에 ${CO_FIELDS[f].n} 분야를 더할까요?\n회사 돈 ${fmtWon(CO_ADD_COST)}이 들어요.`, run: s => coAddField(s, t, f) });
  }
  A.push({ t: '회사 정리', h: '소속된 사람은 모두 떠나고, 남은 회사 돈은 내 돈이 된다', ok: true, danger: true, btn: '정리하기', confirm: `정말 「${t.name}」을 정리할까요?\n소속된 사람이 모두 떠나요.`, run: s => coClose(s, '정리') });
  return h + `<div class="sec-h">할 수 있는 일</div>` + A.map(actRow).join('') + (t.hist && t.hist.length ? `<div class="sec-h">예전에 운영한 회사</div>${t.hist.map(x => `<div class="ms">· ${U.esc(x)}</div>`).join('')}` : '');
}
function coTabTr(s, t) {
  const fs = coTrFields(t), multi = fs.length > 1, A = [];
  for (const f of fs) {
    const k = coTier(t, f), aw = coAudWhy(s, f), gs = coGroupsF(t, f).length;
    // 오디션 줄에서 바로 자동을 켜고 끈다 (🔁 자동 탭과 같은 스위치, 피드백 30)
    const AU = coAuto(t), au = !!AU.on[f];
    A.push({ t: multi ? `${CO_FIELDS[f].n} 오디션` : '오디션 열기', h: `${fmtWon(CO_AUD_COST[k])} · 3개월에 한 번 · 연습생 ${coTrainees(s, null, f).length}/${CO_TR_CAP[k]}명${au ? ` · 자동: 회사 돈 ${fmtWon(coAutoAudLine(s, t, f))} 이상일 때` : ''}`, why: aw, opts: [
      { btn: '열기', on: true, ok: !aw, run: s => { fireEvent(s, 'co_aud_pick', { f }); return ''; } },
      { btn: au ? '🔁 자동 켜짐' : '🔁 자동', on: au, ok: true, run: () => { AU.on[f] = !au; return ''; } }] });
    if (f === 'music') {
      const iw = coMakeWhy(s, 'idol'), bw = coMakeWhy(s, 'band');
      A.push({ t: '아이돌 그룹 만들기', h: `아이돌 연습생 ${coTrainees(s, 'idol').length}명 · 그룹 ${gs}/${CO_GRP_CAP[k]}팀`, ok: !iw, why: iw, btn: '만들기', run: s => { fireEvent(s, 'co_make', { kind: 'idol' }); return ''; } });
      A.push({ t: '밴드 만들기', h: `밴드 연습생 ${coTrainees(s, 'band').length}명`, ok: !bw, why: bw, btn: '만들기', run: s => { fireEvent(s, 'co_make', { kind: 'band' }); return ''; } });
      // 데뷔조 (v131): 같이 연습하며 합을 맞추는 중인 멤버들. 준비되면 여기서 데뷔 확인 창으로 간다
      for (const q of (t.squads || []).filter(q => q.kind !== 'vt')) A.push({ t: `${coKindN(q.kind)} 데뷔조 「${q.name}」 · ${q.ids.length}명`, h: `${coP(s, q.ids).map(x => x.name).join(', ')} · 같이 연습한 지 ${s.t - q.t0}개월 · ${coTwWord(q.tw || 0)}`, opts: [
        { btn: '데뷔시키기', on: true, ok: !coMakeWhy(s, q.kind), run: s => { fireEvent(s, 'co_make_ok', { kind: q.kind, name: q.name, fandom: q.fandom, ids: q.ids.slice() }); return ''; } },
        { btn: '무산', ok: true, confirm: `데뷔조 「${q.name}」의 데뷔를 무산시킬까요?\n맞춰 온 합은 사라져요.`, run: s => { t.squads = t.squads.filter(x => x !== q); return `데뷔조 「${q.name}」의 데뷔가 무산됐다.`; } }] });
      // v118 UI D3: 사내 데뷔평가 (테스트 무대 → 객석 반응 3줄)
      const EK = ['idol', 'band'].filter(k => coTrainees(s, k).length);
      if (EK.length) A.push({ t: '사내 데뷔평가', h: `${fmtWon(coEvalCost(t))} (회사 돈) · 테스트 무대로 데뷔할 실력인지 본다`, why: EK.every(k => coEvalWhy(s, k)) ? coEvalWhy(s, EK[0]) : '', opts: EK.map(k => ({ btn: coKindN(k), on: !coEvalWhy(s, k), ok: !coEvalWhy(s, k), run: s => { fireEvent(s, 'co_eval', { kind: k }); return ''; } })) });
    } else if (f === 'vidol') {
      const vw = coMakeWhy(s, 'vt');
      for (const q of (t.squads || []).filter(q => q.kind === 'vt')) A.push({ t: `버츄얼 아이돌 데뷔조 「${q.name}」 · ${q.ids.length}명`, h: `${coP(s, q.ids).map(x => x.name).join(', ')} · 같이 연습한 지 ${s.t - q.t0}개월 · ${coTwWord(q.tw || 0)}`, opts: [
        { btn: '데뷔시키기', on: true, ok: !coMakeWhy(s, 'vt'), run: s => { fireEvent(s, 'co_make_ok', { kind: 'vt', name: q.name, fandom: q.fandom, ids: q.ids.slice() }); return ''; } },
        { btn: '무산', ok: true, confirm: `데뷔조 「${q.name}」의 데뷔를 무산시킬까요?\n맞춰 온 합은 사라져요.`, run: s => { t.squads = t.squads.filter(x => x !== q); return `데뷔조 「${q.name}」의 데뷔가 무산됐다.`; } }] });
      A.push({ t: `${coNextGen(t)}기 데뷔시키기`, h: `버츄얼 아이돌 연습생 ${coTrainees(s, 'vt').length}명 · 활동 기수 ${gs}/${CO_GRP_CAP[k]}개 · 아바타 제작비가 든다`, ok: !vw, why: vw, btn: '정하기', run: s => { fireEvent(s, 'co_make', { kind: 'vt' }); return ''; } });
    }
  }
  let h = `<div class="sec-h">할 수 있는 일</div>` + A.map(actRow).join('');
  const L = coTrainees(s);
  h += `<div class="sec-h">연습생 ${L.length}명 <span class="n">한 명당 매달 ${fs.map(f => `${multi ? CO_FIELDS[f].n + ' ' : ''}${fmtWon(coTrCost(t, f))}`).join(' · ')}</span></div>`;
  if (!L.length) return h + `<div class="muted">아직 연습생이 없다.</div>`;
  return h + L.map(x => actRow({ t: `${coCandLabel(s, x)} · ${coKindN(x.co.kind)}`, h: `${coMemberSub(s, x)} · 연습 ${s.t - x.co.since}개월`, ok: true, danger: true, btn: '내보내기', confirm: `연습생 ${x.name}을 내보낼까요?`, run: s => coRelease(s, x) })).join('');
}
// 그룹 탭 (피드백 31): 그룹 · 밴드 · 기수마다 작은 탭으로 나눈다. 해체·졸업한 그룹은 맨 끝 탭
function coGrpTabN(g) { return `${g.proj ? '🔀' : g.kind === 'band' ? '🎸' : g.kind === 'vt' ? '🎙️' : '🎤'} ${g.kind === 'vt' && g.gen && !g.name.includes(`${g.gen}기`) ? `${g.gen}기 ` : ''}${g.name}`; }
function coTabGrp(s, t) {
  // 내 회사 소속 내 밴드 (v116 버그 11): 회사가 만든 그룹이 아니라 내 밴드 활동(s.tracks.band)이라 맨 앞 '내 밴드' 탭으로 따로 보여 준다
  const myB = ownCo(s, 'band') ? s.tracks.band : null;
  const ids = (myB ? ['mine'] : []).concat(t.groups.map(g => g.id)).concat(t.past.length ? ['past'] : []), sel = ids.includes(UI.coGrp) ? UI.coGrp : ids[0];
  const hasV = t.past.some(x => x.kind === 'vt'), hasM = t.past.some(x => x.kind !== 'vt'), pastN = hasV && hasM ? '해체·졸업' : hasV ? '졸업한 기수' : '해체한 그룹';
  let h = ids.length > 1 ? `<div class="ap-row">` + (myB ? `<button class="ap-tab ${sel === 'mine' ? 'on' : ''}" data-cogrp="mine">🎸 ${U.esc(myB.b.name)} · 내 밴드</button>` : '') + t.groups.map(g => `<button class="ap-tab ${sel === g.id ? 'on' : ''}" data-cogrp="${g.id}">${U.esc(coGrpTabN(g))}</button>`).join('') + (t.past.length ? `<button class="ap-tab ${sel === 'past' ? 'on' : ''}" data-cogrp="past">${pastN}<span class="ap-n">${t.past.length}</span></button>` : '') + `</div>` : '';
  if (myB && sel === 'mine') {
    h += `<div class="sec-h">${U.esc(myB.b.name)} <span class="n">내 밴드 · 비용 · 수익은 회사 돈</span></div>`;
    h += infoTable([['지금', careerStatus(s, 'band')],
      { h: '멤버', items: [`${me(s).name} (나) — ${partN(myB.b.my)}`].concat(bandMembers(s, myB).map(x => `${x.name} (${pAge(s, x)}세) — ${partN(myB.b.part[x.id])}`)) },
      { h: '최근 곡', items: s.works.filter(w => w.type === '밴드 싱글').slice(-5).reverse().map(w => `${w.y} 「${w.title}」${w.note ? ' · ' + w.note : ''}`) }]);
    h += `<div class="ap-row"><button class="btn sm" data-job="band" data-from="company">🎸 밴드 창 열기</button></div>`;
  }
  if (t.f.music) { const pw = coProjWhy(s, t); h += actRow({ t: '🔀 프로젝트 그룹 만들기', h: '여러 그룹에서 멤버를 뽑아 앨범 한 장 · 활동 두 달 · 원래 그룹 팬도 늘 수 있다', ok: !pw, why: pw, btn: '만들기', run: s => { fireEvent(s, 'co_proj', {}); return ''; } }); }
  if (!t.groups.length && !myB) h += `<div class="empty">아직 ${coGrpWord(t) === '기수' ? '데뷔한 기수가 없다. 연습생 탭에서 데뷔시킨다.' : `${coGrpWord(t)}${coGrpWord(t) === '그룹' ? '이' : '가'} 없다. 연습생 탭에서 만든다.`}</div>`;
  for (const g of t.groups) {
    if (g.id !== sel) continue;
    const left = g.cEnd - g.months;
    if (g.kind === 'vt') {
      h += `<div class="sec-h">${U.esc(g.name)} <span class="n">버츄얼 아이돌 · ${g.debuted ? `${g.debutY}년 데뷔` : '데뷔 전'}</span></div>`;
      h += infoTable([['구독자', `${fmtFans(coVSubs(s, g))} (멤버 합)`], ['지금', g.debuted ? `방송 중${g.lives ? ` · 3D 라이브 ${g.lives}번` : ''}` : '아바타 정하는 중'], ['계약', `${Math.max(0, left)}개월 남음 · 회사 몫 ${pctN(g.cut)}`], ['정산', g.debt > 0 ? `연습생·아바타 비용 회수 중 · 남은 ${fmtWon(g.debt)}` : `멤버 정산 누적 ${fmtWon(g.paid)}`],
        { h: '멤버', items: coP(s, g.members).map(x => `${g.debuted ? `${coVName(x)} (${x.name} · ` : `${x.name} (`}${gNn(x)} · ${pAge(s, x)}세)${g.debuted ? ` · 구독자 ${fmtFans(x.co.subs || 0)}${x.co.d3 ? ' · 3D' : ''}` : ''} — ${coMemberSub(s, x)}`) }]);
      if (g.debuted) h += coVActs(s, t, g).map(actRow).join('');
      h += actRow({ t: '졸업시키기', h: '멤버들은 회사를 떠난다', ok: true, danger: true, btn: '졸업', confirm: `정말 「${g.name}」 멤버들을 졸업시킬까요?`, run: s => coDisband(s, coT(s), g, '회사 결정', true) });
      continue;
    }
    const st = !g.debuted ? (g.cbQ ? '데뷔 준비 중' : `데뷔까지 ${Math.max(1, g.nextCb)}개월`) : g.promo > 0 && !(g.cbQ || g.nextCb >= 90) ? '앨범 활동 중' : g.cbQ || g.nextCb >= 90 ? coAlbStage(s, g) : `다음 컴백까지 ${Math.max(1, g.nextCb)}개월`;
    h += `<div class="sec-h">${U.esc(g.name)} <span class="n">${g.proj ? '프로젝트 그룹' : coKindN(g.kind)} · ${g.debuted ? `${g.debutY}년 ${g.proj ? '발매' : '데뷔'}` : g.proj ? '앨범 준비 중' : '데뷔 전'}</span></div>`;
    const GP = coGProd(s, g);
    h += infoTable([['팬', `${fmtFans(coGFans(g))}${g.fandom && g.kind !== 'band' ? ` · 팬덤 '${g.fandom}'` : ''}`], ['지금', st], ['대표 컨셉', g.sig || '-'], ['전담 프로듀서', GP ? `${GP.name} · ${coTopCm(GP)} · 앨범 기획 · 선정을 맡는다` : '없음 · 앨범마다 내가 정한다'],g.proj ? ['프로젝트 그룹', `앨범 한 장 · 활동 두 달 뒤 흩어진다 · 원래 그룹 ${g.proj.src.map(id => coGroup(s, id)).filter(Boolean).map(o => `「${o.name}」`).join(' · ')}`] : ['계약', `${Math.max(0, left)}개월 남음 · 회사 몫 ${pctN(g.cut)}`], ['정산', g.debt > 0 ? `연습생·제작 비용 회수 중 · 남은 ${fmtWon(g.debt)}` : `멤버 정산 누적 ${fmtWon(g.paid)}`],
      { h: '멤버', items: coP(s, g.members).map(x => `${x.name} (${gNn(x)} · ${pAge(s, x)}세) ${g.pos[x.id] || ''}${g.proj && coProjOf(t, x) ? ` · 「${coProjOf(t, x).name}」` : ''} — ${coMemberSub(s, x)}`) },
    ]);
    // 앨범 줄 (v119): 결과 카드가 있는 앨범은 🎧 · 누르면 카드를 다시 본다
    h += `<div class="sec-h">앨범</div>` + (g.disc.length ? g.disc.slice(-5).reverse().map(a => `<div class="ms${a.card ? ' has-card' : ''}"${a.card ? ` data-song="${U.esc(`co|${g.id}|${a.title}`)}"` : ''}>· ${U.esc(`${a.y} 「${a.title}」 '${a.c}' · ${chartText(a.peak)}${a.mine ? ' · 내가 쓴 곡' : ''}`)}${a.card ? ' 🎧' : ''}</div>`).join('') : '<div class="muted">없음</div>');
    if (g.aw.length) h += infoTable([{ h: '받은 상', items: g.aw.slice(-6).reverse() }]);
    const nP = coStaff(s, 'prod').length;
    h += actRow({ t: '전담 프로듀서', h: GP ? `${GP.name} · 바꾸거나 뗄 수 있다` : nP ? '사내 프로듀서를 붙이면 앨범 기획 · 선정을 맡긴다' : '사내 프로듀서가 없다 · 직원 탭에서 뽑는다', ok: nP > 0, why: '사내 프로듀서가 없다', btn: GP ? '바꾸기' : '붙이기', run: s => { fireEvent(s, 'co_prod_set', { gid: g.id }); return ''; } });
    h += g.proj ? actRow({ t: '활동 끝내기', h: '멤버들은 원래 그룹으로 돌아간다', ok: true, danger: true, btn: '끝내기', confirm: `「${g.name}」 활동을 지금 끝낼까요?`, run: s => coProjEnd(s, coT(s), g, '일찍 끝냄', true) })
      : actRow({ t: '해체하기', h: '멤버들은 회사를 떠난다', ok: true, danger: true, btn: '해체', confirm: `정말 「${g.name}」을 해체할까요?`, run: s => coDisband(s, coT(s), g, '회사 결정', true) });
  }
  if (t.past.length && sel === 'past') { h += `<div class="sec-h">${hasV && hasM ? '해체·졸업한 그룹' : hasV ? '졸업한 기수' : '해체한 그룹'}</div>` + t.past.slice().reverse().map(x => `<div class="ms">· 「${U.esc(x.name)}」 ${coKindN(x.kind)} · ${x.y0}~${x.y1} · 가장 많을 때 ${x.kind === 'vt' ? '구독자' : '팬'} ${fmtFans(x.peakF || 0)} · ${U.esc(x.why)}</div>`).join(''); }
  return h;
}
function coTabStaff(s, t) {
  const k = coTopTier(t), rows = [], tr = coTrFields(t).length;
  for (const job of [tr ? 'cast' : '', t.f.music ? 'anr' : '', t.f.video || t.f.anime ? 'pd' : ''].filter(Boolean)) {
    const cur = coStaff(s, job)[0], why = coHireOK(s, job), hire = { btn: cur ? '바꾸기' : '뽑기', ok: !why, run: s => { fireEvent(s, 'co_hire', { job }); return ''; } };
    // 지금 직원이 있으면 한 줄에 '바꾸기'·'내보내기' 두 버튼
    if (cur) rows.push({ t: `${CO_JOBS[job]} · ${cur.name} (${gNn(cur)} · ${pAge(s, cur)}세)`, h: coStaffLine(cur), why, opts: [hire, { btn: '내보내기', ok: true, confirm: `${cur.name}을 내보낼까요?`, run: s => coFire(s, cur) }] });
    else rows.push(Object.assign({ t: CO_JOBS[job], h: job === 'cast' ? '없음 · 오디션 지원자를 내 눈으로만 본다' : job === 'pd' ? '없음 · 작품 기획 때 내 눈으로만 본다' : '없음 · 곡 정보를 내 눈으로만 본다', why }, hire));
  }
  const trs = coStaff(s, 'trainer'), tw = coHireOK(s, 'trainer'), eds = coStaff(s, 'edit');
  // 트레이너 줄에서 바로 자동을 켜고 끈다 (오디션 줄처럼, v131)
  const TA = coAuto(t), ta = !!TA.on.trainer;
  if (tr) rows.push({ t: '트레이너 뽑기', h: `트레이너 ${trs.length}/${CO_TRAINER_CAP[k]}명${trs.length >= CO_TRAINER_CAP[k] ? ' · 꽉 찼다 (뽑은 뒤 내보낼 사람을 고른다)' : ''}`, why: tw, opts: [
    { btn: '뽑기', on: true, ok: !tw, run: s => { fireEvent(s, 'co_hire_tf', {}); return ''; } },
    { btn: ta ? '🔁 자동 켜짐' : '🔁 자동', on: ta, ok: true, run: () => { TA.on.trainer = !ta; return ''; } }] });
  const pds = coStaff(s, 'prod');
  if (t.f.music) { const pw = coHireOK(s, 'prod'); rows.push({ t: '사내 프로듀서 뽑기', h: `사내 프로듀서 ${pds.length}/${CO_GRP_CAP[coTier(t, 'music')]}명 · 그룹에 전담으로 붙이면 앨범 기획 · 선정을 맡는다 · 붙이지 않아도 '사내 제작'으로 곡을 쓴다`, ok: !pw, why: pw, btn: '뽑기', run: s => { fireEvent(s, 'co_hire', { job: 'prod' }); return ''; } }); }
  if (t.f.mcn) { const ew = coHireOK(s, 'edit'); rows.push({ t: '편집자 뽑기', h: `편집자 ${eds.length}/${CO_ED_CAP[coTier(t, 'mcn')]}명 · 한 명이 크리에이터 ${CO_ED_PER}명까지 맡는다`, ok: !ew, why: ew, btn: '뽑기', run: s => { fireEvent(s, 'co_hire', { job: 'edit' }); return ''; } }); }
  let h = `<div class="sec-h">직원 <span class="n">월급 합계 ${fmtWon(coStaff(s).reduce((a, x) => a + x.co.sal, 0))}</span></div>` + rows.map(actRow).join('');
  if (trs.length) h += `<div class="sec-h">트레이너</div>` + trs.map(x => actRow({ t: `${trFieldN(x.co.k)} ${x.name} (${gNn(x)} · ${pAge(s, x)}세)`, h: coStaffLine(x), ok: true, danger: true, btn: '내보내기', confirm: `${x.name}을 내보낼까요?`, run: s => coFire(s, x) })).join('');
  if (pds.length) h += `<div class="sec-h">사내 프로듀서</div>` + pds.map(x => { const g = t.groups.find(y => y.prod === x.id); return actRow({ t: `${x.name} (${gNn(x)} · ${pAge(s, x)}세)${g ? ` · 「${g.name}」 전담` : ''}`, h: coStaffLine(x), ok: true, danger: true, btn: '내보내기', confirm: `${x.name}을 내보낼까요?`, run: s => coFire(s, x) }); }).join('');
  if (eds.length) h += `<div class="sec-h">편집자</div>` + eds.map(x => actRow({ t: `${x.name} (${gNn(x)} · ${pAge(s, x)}세)`, h: coStaffLine(x), ok: true, danger: true, btn: '내보내기', confirm: `${x.name}을 내보낼까요?`, run: s => coFire(s, x) })).join('');
  return h;
}
// 크리에이터 탭 (MCN): 영입 제안 · 합동 콘텐츠 · 소속 크리에이터 목록
function coTabCr(s, t) {
  const L = coCrs(s), w = coMcnWhy(s, t), cap = CO_CR_CAP[coTier(t, 'mcn')];
  const A = [{ t: '영입 제안 보내기', h: `크리에이터 ${L.length}/${cap}명 · 3개월에 한 번`, ok: !w, why: w, btn: '보내기', run: s => { fireEvent(s, 'co_mpick', {}); return ''; } }].concat(coMcnActs(s, t));
  let h = `<div class="sec-h">할 수 있는 일</div>` + A.map(actRow).join('');
  h += `<div class="sec-h">크리에이터 ${L.length}명 <span class="n">구독자 합 ${fmtFans(L.reduce((a, x) => a + x.yt.subs, 0))}</span></div>`;
  if (!L.length) return h + `<div class="muted">아직 소속 크리에이터가 없다.</div>`;
  return h + L.slice().sort((a, b) => b.yt.subs - a.yt.subs).map(x => actRow({ t: coCrLabel(s, x), h: `구독자 ${fmtFans(x.yt.subs)} (계약 뒤 ${sgnFans(x.yt.subs - x.co.subs0)}) · 회사 몫 ${pctN(x.co.cut)} · ${x.co.left > 0 ? `계약 ${x.co.left}개월 남음` : "재계약 이야기 중"}`, ok: true, danger: true, btn: '계약 끝내기', confirm: `${josa(mcnCrName(x), '과와')}의 계약을 끝낼까요?`, run: s => { coMcnRelease(s, t, x); return `${josa(mcnCrName(x), '과와')}의 계약을 끝냈다.`; } })).join('');
}

// ───── 자동 (회사 창 🔁 자동 탭) ─────
// 시작만 대신 한다: 오디션 창·기획 회의·영입 후보 창을 열어 줄 뿐, 누구를 뽑고 무엇을 만들지는 언제나 내가 고른다
// t.auto = { on: { music, vidol, video, anime: 켬/끔, mcn: 고른 회사 몫(0이면 끔) }, nx: { 분야: 다음에 열 수 있는 달 }, want: { video, anime: 작품이 끝나서 기획 회의를 열 차례 }, q: { 분야: 자동으로 열어 둔 창 } }
// 오디션: 3개월마다, 회사 돈이 오디션 비용 + 꼭 나가는 돈 6개월치 이상일 때 · 기획 회의: 작품이 끝날 때마다, 만드는 작품이 없으면 3개월마다 · 영입 후보: 3개월마다
const CO_AUTO_RES = 6;
function coAuto(t) { const A = t.auto = t.auto || {}; A.on = A.on || {}; A.nx = A.nx || {}; A.want = A.want || {}; A.q = A.q || {}; return A; }
function coAutoAudLine(s, t, f) { return CO_AUD_COST[coTier(t, f)] + coFixed(s, t) * CO_AUTO_RES; }
function coVAutoGens(t) { return t.groups.filter(g => g.kind === 'vt' && g.debuted); }
function coAutoN(t) { const A = coAuto(t); return Object.keys(A.on).filter(k => A.on[k] && t.f[k]).length + coVAutoGens(t).reduce((a, g) => a + (g.auto && g.auto.goods ? 1 : 0) + (g.auto && g.auto.live ? 1 : 0), 0); }
// 자동으로 연 창은 내가 답한 달부터 3개월을 센다 (다른 창이 먼저 떠서 늦게 열려도 곧바로 또 열리지 않게)
function coAutoQ(s, A, f, id, d) { A.q[f] = id; A.nx[f] = s.t + 3; queueEv(s, id, 0, d, true); }
function coAutoMonth(s, t) {
  const A = coAuto(t);
  for (const f in A.q) { if (A.q[f] === 'co_aud_pick' ? coAudBusy(s, f) : hasQ(s, A.q[f])) A.nx[f] = s.t + 3; else delete A.q[f]; }
  if (t.money < 0) return;
  // 자리가 꽉 찼으면 자동을 끌지 한 번 묻는다 (v131). 자리가 다시 나면 다음에 꽉 찰 때 또 묻는다
  A.full = A.full || {};
  const fullAsk = (k, full) => { if (!A.on[k] || !full) { A.full[k] = false; return; } if (!A.full[k] && !hasQ(s, 'co_auto_full')) { A.full[k] = true; queueEv(s, 'co_auto_full', 0, { k }); } };
  for (const f of coTrFields(t)) fullAsk(f, coTrRoom(s, t, f) <= 0);
  if (coTrFields(t).length) fullAsk('trainer', coStaff(s, 'trainer').length >= CO_TRAINER_CAP[coTopTier(t)]);
  for (const f of coTrFields(t)) if (A.on[f] && (A.nx[f] || 0) <= s.t && !coAudWhy(s, f) && t.money >= coAutoAudLine(s, t, f)) coAutoQ(s, A, f, 'co_aud_pick', { f });
  // 트레이너 뽑기 (v131): 자리가 비어 있고, 회사 돈이 꼭 나가는 돈 6개월치 이상일 때 3개월마다 '어떤 트레이너를 뽑을까?' 창을 연다
  if (coTrFields(t).length && A.on.trainer && (A.nx.trainer || 0) <= s.t && !coHireOK(s, 'trainer') && t.money >= coFixed(s, t) * CO_AUTO_RES) coAutoQ(s, A, 'trainer', 'co_hire_tf', {});
  for (const [f, L, why, ev] of [['video', t.vw, coVWhy, 'co_vplan'], ['anime', t.aw, coAWhy, 'co_aplan']]) {
    if (!t.f[f] || !A.on[f] || why(s, t)) continue;
    if (A.want[f] || (!L.length && (A.nx[f] || 0) <= s.t)) { A.want[f] = false; coAutoQ(s, A, f, ev, {}); }
  }
  if (t.f.mcn && A.on.mcn && (A.nx.mcn || 0) <= s.t && !coMcnWhy(s, t)) coAutoQ(s, A, 'mcn', 'co_mscout', { cut: A.on.mcn });
  // 기수 굿즈 · 3D 라이브 (피드백 31): 할 수 있게 되고, 회사 돈이 비용 + 꼭 나가는 돈 6개월치 이상이면 바로 한다 (창 없이 기록만)
  for (const g of coVAutoGens(t)) {
    const au = g.auto || {}, res = coFixed(s, t) * CO_AUTO_RES;
    if (au.goods && !coVGoodsWhy(s, t, g) && t.money >= coVGoodsCost(s, g) + res) addRes(s, coVGoods(s, t, g));
    if (au.live && !coVLiveWhy(s, t, g) && t.money >= CO_VLIVE.cost + res) addRes(s, coVLive(s, t, g, true));
  }
}
function coTabAuto(s, t) {
  const A = coAuto(t), R = [], fs = coTrFields(t), multi = fs.length > 1;
  const sw = (k, n, h) => ({ t: n, h, opts: [
    { btn: '켜기', on: !!A.on[k], ok: true, run: () => { A.on[k] = true; return ''; } },
    { btn: '끄기', on: !A.on[k], ok: true, run: () => { A.on[k] = false; return ''; } }] });
  for (const f of fs) R.push(sw(f, `${multi ? CO_FIELDS[f].n + ' ' : ''}오디션`, `3개월마다 · 회사 돈 ${fmtWon(coAutoAudLine(s, t, f))} 이상일 때`));
  if (fs.length) R.push(sw('trainer', '트레이너 뽑기', `3개월마다 (자리가 꽉 차 있어도 면접은 본다) · 회사 돈 ${fmtWon(coFixed(s, t) * CO_AUTO_RES)} 이상일 때`));
  if (t.f.video) R.push(sw('video', '작품 기획 회의', '작품이 끝날 때마다 · 만드는 작품이 없으면 3개월마다'));
  if (t.f.anime) R.push(sw('anime', '애니 기획 회의', '애니가 끝날 때마다 · 만드는 애니가 없으면 3개월마다'));
  if (t.f.mcn) R.push({ t: '영입 후보', h: '3개월마다 · 고른 회사 몫으로 제안', cls: 'act-wrap', opts: [{ btn: '끄기', on: !A.on.mcn, ok: true, run: () => { A.on.mcn = 0; return ''; } }].concat(CO_MCN_CUTS.map(c => ({ btn: `몫 ${pctN(c)}`, on: A.on.mcn === c, ok: true, run: () => { A.on.mcn = c; return ''; } }))) });
  let h = `<div class="sec-h">자동으로 열기</div>` + R.map(actRow).join('');
  // 기수마다 굿즈 · 3D 라이브 (데뷔한 기수만)
  const G = coVAutoGens(t);
  if (G.length) {
    const gsw = (g, k, n, h) => ({ t: n, h, opts: [
      { btn: '켜기', on: !!(g.auto || {})[k], ok: true, run: () => { (g.auto = g.auto || {})[k] = true; return ''; } },
      { btn: '끄기', on: !(g.auto || {})[k], ok: true, run: () => { (g.auto = g.auto || {})[k] = false; return ''; } }] });
    const res = coFixed(s, t) * CO_AUTO_RES;
    h += `<div class="sec-h">기수 활동 자동</div>` + G.map(g => actRow(gsw(g, 'goods', `「${g.name}」 굿즈`, `6개월마다 · 회사 돈 ${fmtWon(coVGoodsCost(s, g) + res)} 이상일 때`)) + actRow(gsw(g, 'live', `「${g.name}」 3D 라이브 콘서트`, `1년마다 · 멤버 모두 3D · 기수 구독자 ${fmtFans(CO_VLIVE.min)} 이상 · 회사 돈 ${fmtWon(CO_VLIVE.cost + res)} 이상일 때`))).join('');
  }
  return h;
}
