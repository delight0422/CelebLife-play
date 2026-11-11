'use strict';
// ════════ 마케터 (7-4단계) ════════
// 기획사 마케팅팀 직원. 지금은 틀만 넣는다 (자세한 일은 12단계 직업별 디테일)
// 하는 일 (2026-11-08 사용자가 정한 것): 시장조사와 홍보(플랫폼·방식 정하기), 신그룹 런칭(타겟·컨셉), 광고 기획과 운영(발주·집행), 팬덤 관리, 여론 대응
// 직업 활동 두 갈래:
//   자동으로 하는 일 (일정에 '마케팅 업무' 칸만 넣어 두면): 시장조사(시장 이해도), 팬덤 관리(팬덤 분위기), 발주한 광고 집행
//   골라서 하는 일 (칸을 넣은 채로 직업 창에서): 컴백 홍보 계획, 신그룹 런칭 기획, 광고 기획
//   여론 대응은 일이 터지면 사건 창에서 바로 고른다 (칸을 안 넣었으면 다른 사람이 맡아 대충 넘어간다)
// 사업 특기가 가장 중요하고, 작문 · 학업 · 스카우트를 조금 본다. 통찰력 · 창의력 · 지능 재능을 본다
// 시장 이해도가 높으면 홍보·런칭을 고를 때 시장조사 결과가 보인다

const MK_TIERS = ['마케팅 인턴', '주니어 마케터', '마케터', '시니어 마케터', '마케팅 팀장', '마케팅 총괄', '마케팅 이사'];
const MK_SAL = [180, 250, 320, 420, 560, 800, 1300]; // 만 원 (중형 기획사 기준). 소형 ×0.85 · 대형 ×1.2
const MK_AGM = [0, 0.85, 1, 1.2];
// 승진: 쌓인 성과(pts)와 그 자리에서 보낸 햇수(yrs). 맨 위는 통찰력 52 이상
const MK_UP = { pts: [0, 5, 15, 35, 85, 140, 190], yrs: [0, 1, 2, 2, 3, 3, 3], tal: 'insight', min: 52 };
const MK_TGTS = ['10대', '20대', '글로벌', '코어 팬덤', '대중'];
// 홍보 플랫폼이 잘 먹히는 타겟, 홍보 방식이 잘 맞는 컨셉, 타겟이 좋아하는 컨셉, 광고 매체가 잘 닿는 타겟 (숨긴 규칙. 시장조사를 하면 일부가 보인다)
const MK_PF = { 플리오: { 글로벌: 4, 대중: 3, '20대': 1 }, '숏폼 (틱톡·릴스)': { '10대': 5, '20대': 2, 대중: 2 }, 인스타그램: { '20대': 5, 글로벌: 2 }, '음악 방송': { 대중: 4, '10대': 2, '코어 팬덤': 1 }, '팬 플랫폼': { '코어 팬덤': 6, 글로벌: 2 } };
const MK_HOW = { 챌린지: ['청량', '큐티', '하이틴', '힙합'], '티저 콘텐츠': ['몽환', '성숙', '강렬'], '라이브 방송': ['큐티', '하이틴', '청량', '레트로'], '오프라인 팝업': ['레트로', '성숙', '몽환', '강렬'] };
const MK_TC = { '10대': ['큐티', '하이틴', '청량'], '20대': ['성숙', '몽환', '레트로'], 글로벌: ['강렬', '힙합', '청량'], '코어 팬덤': ['몽환', '강렬', '성숙'], 대중: ['청량', '레트로', '큐티'] };
const MK_AD = { 'SNS 광고': { '10대': 3, '20대': 4 }, '플리오 광고': { 글로벌: 3, 대중: 3 }, '옥외 광고 (전광판)': { 대중: 4, '코어 팬덤': 2 }, '지하철 광고': { '20대': 3, '코어 팬덤': 4 } };
const MK_BUD = [{ n: '작게', won: 2000, mul: 1, bar: 0 }, { n: '보통', won: 5000, mul: 2, bar: 2 }, { n: '크게', won: 15000, mul: 4, bar: 5 }];
// 여론 대응: 일마다 가장 좋은 대응(best)과 무난한 대응(ok)
const MK_RESP = ['빠른 사과문', '사실 확인 후 입장문', '법적 대응 예고', '조용히 지켜보기'];
const MK_ISSUES = [
  { n: '멤버를 둘러싼 악성 루머', best: '법적 대응 예고', ok: '사실 확인 후 입장문' },
  { n: '무대 뒤 태도 논란 영상', best: '빠른 사과문', ok: '사실 확인 후 입장문' },
  { n: '굿즈 품질 불만', best: '빠른 사과문', ok: '사실 확인 후 입장문' },
  { n: '팬덤끼리의 다툼', best: '조용히 지켜보기', ok: '사실 확인 후 입장문' },
  { n: '신곡 표절 의혹', best: '사실 확인 후 입장문', ok: '법적 대응 예고' },
];
EMP_N.marketer = '마케팅';

function mkOn(s) { return trackOn(s, 'marketer'); }
// 마케팅 실력: 사업(크게) + 작문 · 학업 · 스카우트(조금) + 통찰력 · 창의력 · 지능
// v95: 사업 · 학업(모두 강함)
function mkScore(s) { const p = me(s); return jobMix([[lv(p, 'biz'), JS_], [lv(p, 'study'), JS_]]); }
function mkSalOf(t) { return Math.round(MK_SAL[t.tier] * MK_AGM[t.agT]) * 1e4; }
function mkBar(t) { return 38 + t.tier * 2; }
function mkMood(v) { return v >= 70 ? '아주 좋음' : v >= 55 ? '좋음' : v >= 40 ? '보통' : v >= 25 ? '나쁨' : '아주 나쁨'; }
function mkNewGroup(s, t, o = {}) { return Object.assign({ name: newGroupName(s), kind: U.pick(['걸그룹', '보이그룹']), sig: U.pick(TRENDS), tgt: U.pick(MK_TGTS), f: Math.round([3e3, 3e4, 3e5][t.agT - 1] * U.fl(0.5, 2)), mood: U.int(45, 60), next: U.int(2, 8) }, o); }
// 성과 평가: 기준(자리마다 오른다)을 넘으면 성과 1, 크게 넘으면 2. 업무 평가도 함께 오르내린다
function mkEval(s, t, sc) { const bar = mkBar(t), k = sc >= bar + 10 ? 2 : sc >= bar ? 1 : 0; t.pts += k; t.rep = U.clamp(t.rep + (sc - bar) / 3, 0, 100); return k; }
// 승진: 한 번에 한 자리씩
function mkTierUp(s, t) {
  const k = t.tier + 1;
  if (k > 6 || t.pts < MK_UP.pts[k] || t.tm < MK_UP.yrs[k] * 12 || (k === 6 && me(s).tal[MK_UP.tal] < MK_UP.min) || t.rep < 40) return '';
  t.tier = k; t.tm = 0; t.sal = Math.max(t.sal, mkSalOf(t)); t.salBase = t.sal;
  if (k >= 4) milestone(s, `${age(s)}세에 ${t.agN} ${josa(MK_TIERS[k], '이가')} 되었다.`);
  return `${josa(MK_TIERS[k], '으로')} 승진했다! 월급이 ${fmtWon(t.sal)}으로 올랐다.`;
}

// ───── 입사 ─────
const MK_THR = [0, 18, 26, 34];
// v99 (8-5): 면접에서 통찰력(보통, 가산점)
function mkApplySc(s) { return mkScore(s) + (uniDone(s) ? 4 : 0) + empExpBonus(s, 'marketer') + ((s.tracks.marketer || {}).tier || 0) * 2 + talB(me(s).tal.insight, false); }
for (const tier of [3, 2, 1]) JOB_APPLY.push({
  id: 'marketer_' + tier, trk: 'marketer', g: '📣 마케터', n: `${TIER_N[tier]} 기획사 마케팅팀 채용`, tag: `월급 ${Math.round(MK_SAL[0] * MK_AGM[tier])}만 원부터`,
  show: s => !mkOn(s) && age(s) >= 20,
  h: s => `합격 가능성 ${fmtPct(audP(mkApplySc(s), MK_THR[tier]))} · 결과는 다음 달`,
  ok: s => !s.army && !agencyContract(s) && !hasQ(s, 'mk_res') && !(s.cd['mk' + tier] > s.t),
  why: s => s.army ? '군 복무 중' : agencyContract(s) ? contractWhy(s) : hasQ(s, 'mk_res') ? '결과를 기다리는 중' : '얼마 전에 지원했다 (반년 뒤 다시)',
  run: s => { s.cd['mk' + tier] = s.t + 6; const ag = U.pick(musicAgencies().filter(a => a.tier === tier && a.mkt === 'kr')); queueEv(s, 'mk_res', 1, { ag: ag.id, p: audP(mkApplySc(s), MK_THR[tier]) }); return `${ag.n} 마케팅팀 채용에 지원했다.`; },
});
E({
  id: 'mk_res', cat: '채용', title: '마케팅팀 채용 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); const old = s.tracks.marketer || {}; d.tier = old.tier || 0; d.sal = Math.round(MK_SAL[d.tier] * MK_AGM[AG[d.ag].tier]) * 1e4; },
  text: (s, d) => d.pass ? `${AG[d.ag].n} 마케팅팀에 합격했다! ${d.tier ? `그동안의 경력을 보고 '${MK_TIERS[d.tier]}' 자리를 맡긴다. ` : ''}회사가 제시한 월급은 ${fmtWon(d.sal)}.` : `${AG[d.ag].n} 마케팅팀 채용에 떨어졌다.`,
  ch: (s, d) => d.pass ? [
    { t: '입사 조건을 들어 본다', ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '월급을 협상할 수 있다', f: s => startNego(s, { kind: 'marketer', ag: d.ag, agN: AG[d.ag].n, sal: d.sal, months: 24, lev: U.clamp((d.p - 0.5) * 0.8 + 0.3, 0.05, 0.8) }) },
    { t: '거절한다', f: () => '입사 제안을 거절했다.' },
  ] : [{ t: '확인', f: () => `${AG[d.ag].n} 마케팅팀 채용에 떨어졌다.` }],
});
function mkStart(s, d) {
  const ag = AG[d.ag], old = s.tracks.marketer, tag = learnMe(s, 'biz', null, false, true);
  const t = s.tracks.marketer = { st: 'active', ag: d.ag, agN: ag.n, agT: ag.tier, months: 0, tm: 0, cEnd: d.months, tier: old.tier || 0, pts: old.pts || 0, rep: empStartRep(s, 'marketer', false), sal: d.sal, salBase: d.sal, mi: 20, groups: [], cb: null, launch: null, lnext: U.int(18, 40), ad: null, done: old.done || 0, hist: old.hist || [] };
  for (let i = 0; i < 2 + (ag.tier >= 3 ? 1 : 0); i++) t.groups.push(mkNewGroup(s, t));
  coMeetJob(s, 'marketer');
  const boss = coTeamPeople(s, t.ag + '#mk')[0];
  milestone(s, `${age(s)}세에 ${ag.n} 마케팅팀에 들어갔다.`);
  return `${ag.n} 마케팅팀에 입사했다. 월급 ${fmtWon(d.sal)} · 계약 ${yrs(d.months)}.${boss ? ` 팀장은 ${boss.name}.` : ''}` + tag;
}
NEGO.marketer = empNego('marketer', mkStart);

CAREERS.marketer = {
  n: '마케터', ic: '📣', auto: true,
  desc: '기획사 마케팅팀 직원. 시장을 조사하고, 컴백 홍보와 신그룹 런칭을 기획하고, 광고를 집행하고, 팬덤과 여론을 관리한다. 사업 특기가 가장 중요하다.',
  act: { n: '마케팅 업무', ic: '📣', g: '직업 활동', eff: [['사업', '↑', 1], ['시장 이해도', '↑', 1], ['스트레스', '↑', 0]] },
  autoList(s, t) {
    return [
      { ic: '🔎', n: '시장조사', eff: `시장 이해도 ${Math.round(t.mi)}` },
      { ic: '💬', n: '팬덤 관리', eff: t.groups.map(g => `${g.name} ${mkMood(g.mood)}`).join(' · ') },
    ].concat(t.ad ? [{ ic: '📢', n: `${t.ad.ch} 집행`, eff: `${t.groups[t.ad.gi] ? t.groups[t.ad.gi].name : ''} · ${t.ad.left}개월 남음` }] : []);
  },
  picks(s, t) {
    if (t.st !== 'active') return [];
    const cg = t.cb && t.groups[t.cb.gi];
    return [
      { t: '📅 컴백 홍보 계획', h: cg ? `${cg.name} 컴백 ${Math.max(0, t.cb.due - s.t)}개월 전${t.cb.plan ? ` · ${t.cb.plan.pf} · ${josa(t.cb.plan.how, '으로')} 정함` : ''}` : '다가오는 컴백이 없다', ok: !!cg && !t.cb.plan, why: cg ? '이미 계획을 세웠다' : '다가오는 컴백이 없다', run: s => { fireEvent(s, 'mk_promo', {}); return ''; } },
      { t: '🌱 신그룹 런칭 기획', h: t.launch ? `데뷔 ${Math.max(0, t.launch.due - s.t)}개월 전${t.launch.plan ? ` · ${t.launch.plan.tgt} · ${josa(`'${t.launch.plan.c}'`, '으로')} 정함` : ''}` : '준비 중인 신인 그룹이 없다', ok: !!t.launch && !t.launch.plan, why: t.launch ? '이미 기획했다' : '준비 중인 신인 그룹이 없다', run: s => { fireEvent(s, 'mk_launch', {}); return ''; } },
      { t: '📢 광고 기획', h: t.ad ? `${t.ad.ch} 집행 중` : '매체와 예산을 정해 발주한다 · 3개월 집행', ok: !t.ad && !(t.adCd > s.t), why: t.ad ? '집행 중인 광고가 있다' : '얼마 전에 광고를 했다', run: s => { fireEvent(s, 'mk_ad', {}); return ''; } },
    ];
  },
  status(s, t) { return t.st !== 'active' ? (t.endNote || '') : `${t.agN} ${MK_TIERS[t.tier]} · 업무 평가 ${Math.round(t.rep)} · 성과 ${t.pts} · 월급 ${fmtWon(t.sal)}`; },
  short(s, t) { return `${t.agN} ${MK_TIERS[t.tier]}`; },
  seg(s, t) { return `${t.agN} 마케팅팀`; },
  title(s, t) { return t.months ? MK_TIERS[t.tier] : null; },
  contract(s, t) { return t.st === 'active' ? `${t.agN} (마케팅팀 직원)` : ''; },
  emp: true,
  cLeft(s, t) { return t.st === 'active' && t.cEnd != null ? t.cEnd - t.months : null; },
  mainSk() { return 'biz'; },
  info(s, t) {
    const p = me(s);
    return [['회사', `${t.agN} (${TIER_N[t.agT]} 기획사) 마케팅팀`], ['자리', MK_TIERS[t.tier]], ['월급', fmtWon(t.sal)], ['내 실력', ['biz', 'script', 'study', 'scout'].filter(k => has(p, k)).map(k => `${SKILLS[k].n} ${lvi(p, k)}`).join(' · ') || '-'], ['업무 평가', `${Math.round(t.rep)}`], ['성과', `${t.pts}`], ['시장 이해도', `${Math.round(t.mi)}`],
      { h: '맡은 그룹', items: t.groups.map(g => `${g.name} (${g.kind}) · 팬 ${fmtFans(g.f)} · 타겟 ${g.tgt} · 대표 컨셉 '${g.sig}' · 팬덤 ${mkMood(g.mood)}`) }];
  },
  actions(s, t) { return t.st === 'active' ? [{ t: '회사 그만두기', h: '직원 계약이라 위약금은 없다', ok: true, danger: true, confirm: '정말 회사를 그만둘까요?', run: s => { t.st = 'ended'; t.endNote = `${t.agN} ${MK_TIERS[t.tier]} (퇴사)`; t.hist.push(t.endNote); return `${josa(t.agN, '을를')} 그만뒀다.`; } }] : []; },
  monthly(s, t) { mkMonth(s, t); },
};

// ───── 한 달 (자동으로 하는 일 + 회사 일정) ─────
function mkMonth(s, t) {
  if (t.st !== 'active') return;
  t.months++; t.tm++;
  empMonth(s, 'marketer', t);
  earn(s, t.sal, '마케팅 월급', 'marketer');
  const n = slotsOn(s, 'c_marketer'), p = me(s), sc = mkScore(s);
  if (n) {
    practice(s, p, 'biz', 0.6 * n);
    for (const k of ['study', 'scout']) useSkill(s, p, k, 0.15 * n);
    addStress(s, 1.8);
    // 시장조사: 시장 이해도가 닿을 수 있는 높이 쪽으로
    const tg = U.clamp(25 + lv(p, 'study') * 0.3 + lv(p, 'scout') * 0.2 + p.tal.intel * 0.25 + p.tal.insight * 0.15, 0, 100);
    t.mi = U.clamp(t.mi + (tg - t.mi) * 0.12, 0, 100);
  } else t.mi = Math.max(0, t.mi - 3);
  // 팬덤 관리: 내가 칸을 넣어 두면 팬덤 분위기가 내 실력만큼 좋아진다
  for (const g of t.groups) g.mood = U.clamp(g.mood + ((n ? 47 + (sc - 38) * 0.8 : 32) + U.normal(0, 5) - g.mood) * 0.15, 0, 100);
  // 광고 집행 (칸을 넣은 달만 나아간다)
  if (t.ad && n && --t.ad.left <= 0 && !hasQ(s, 'mk_ad_res')) queueEv(s, 'mk_ad_res', 0);
  // 회사 일정: 그룹마다 컴백 (석 달 전에 알려 준다)
  t.groups.forEach((g, gi) => {
    if (--g.next > 3) return;
    if (t.cb && t.cb.gi !== gi) { g.next = 4; return; }
    if (!t.cb) { t.cb = { gi, due: s.t + 3, plan: null }; addLog(s, `회사 일정: ${g.name} 컴백이 석 달 뒤로 잡혔다.`, 'career'); }
  });
  if (t.cb && s.t >= t.cb.due && !hasQ(s, 'mk_cb_res')) queueEv(s, 'mk_cb_res', 0);
  // 회사 일정: 신인 그룹 런칭 (넉 달 전에 알려 준다)
  if (!t.launch && t.groups.length < 5 && --t.lnext <= 0) { t.launch = { due: s.t + 4, plan: null }; addLog(s, '회사 일정: 넉 달 뒤 신인 그룹이 데뷔한다.', 'career'); }
  if (t.launch && s.t >= t.launch.due && !hasQ(s, 'mk_launch_res')) queueEv(s, 'mk_launch_res', 0);
  // 여론: 가끔 일이 터진다 (팬덤 분위기가 나쁘면 자주)
  if (!hasQ(s, 'mk_issue') && !s.pending) {
    const gi = t.groups.findIndex(g => U.chance(0.006 + (g.mood < 35 ? 0.02 : 0)));
    if (gi >= 0) {
      const is = U.pick(MK_ISSUES);
      if (n) queueEv(s, 'mk_issue', 0, { gi, n: is.n });
      else { const g = t.groups[gi]; g.mood = Math.max(0, g.mood - 10); t.rep = Math.max(0, t.rep - 3); addLog(s, `${g.name}의 ${josa(is.n, '이가')} 불거졌다. 내가 손을 놓고 있는 사이 다른 팀원이 대충 넘겼다. (업무 평가 -3)`, 'bad'); }
    }
  }
  const up = mkTierUp(s, t); if (up) addLog(s, up, 'good');
  if (t.rep <= 2 && !hasQ(s, 'mk_fire')) queueEv(s, 'mk_fire', 0);
}
function mkHint(s, t, need) { return t.mi >= need; }

// ───── 골라서 하는 일: 컴백 홍보 계획 (플랫폼 → 방식) ─────
E({
  id: 'mk_promo', cat: '마케팅', title: '컴백 홍보 계획', tag: 'career',
  init(s, d) { const t = s.tracks.marketer; if (!mkOn(s) || !t.cb || t.cb.plan) d.skip = true; },
  text: s => {
    const t = s.tracks.marketer, g = t.groups[t.cb.gi], best = Object.keys(MK_PF).sort((a, b) => (MK_PF[b][g.tgt] || 0) - (MK_PF[a][g.tgt] || 0))[0];
    return `${g.name}(${g.kind}, 팬 ${fmtFans(g.f)})의 컴백 홍보를 어디에서 할까?\n\n타겟 ${g.tgt} · 대표 컨셉 '${g.sig}'${mkHint(s, t, 50) ? `\n시장조사: ${josa(g.tgt, '은는')} 요즘 ${best}에서 반응이 가장 크다.` : ''}`;
  },
  ch: s => Object.keys(MK_PF).map(pf => ({ t: pf, f: s => { fireEvent(s, 'mk_promo2', { pf }); return ''; } })),
});
E({
  id: 'mk_promo2', cat: '마케팅', title: '홍보 방식', tag: 'career',
  init(s, d) { const t = s.tracks.marketer; if (!mkOn(s) || !t.cb || t.cb.plan) d.skip = true; },
  text: (s, d) => { const t = s.tracks.marketer, g = t.groups[t.cb.gi], fit = Object.keys(MK_HOW).filter(h => MK_HOW[h].includes(g.sig)); return `${d.pf}에서 어떤 방식으로 알릴까?\n\n${g.name} 대표 컨셉 '${g.sig}'${mkHint(s, t, 70) && fit.length ? `\n시장조사: '${g.sig}' 컨셉은 ${josa(fit.join(' · '), '과와')} 잘 어울린다.` : ''}`; },
  ch: (s, d) => Object.keys(MK_HOW).map(how => ({ t: how, f: s => {
    const t = s.tracks.marketer, g = t.groups[t.cb.gi];
    const q = mkScore(s) + (MK_PF[d.pf][g.tgt] || 0) + (MK_HOW[how].includes(g.sig) ? 4 : 0) + t.mi * 0.08 + U.normal(0, 6);
    t.cb.plan = { pf: d.pf, how, q };
    return `${g.name} 컴백 홍보를 ${d.pf} ${josa(how, '으로')} 하기로 정했다.`;
  } })),
});
E({
  id: 'mk_cb_res', cat: '마케팅', title: '컴백 성적', tag: 'career',
  plio: (s, d) => d.pl !== undefined ? d.pl : (d.pl = typeof commSpec === 'function' && d.g ? commSpec(s, { k: 'mk', bd: '아이돌 게시판', t: d.g, tn: d.k === 2 ? 'great' : d.k === 1 ? 'good' : d.plan === null || d.plan === undefined ? 'meh' : 'bad' }) : null),
  init(s, d) {
    const t = s.tracks.marketer;
    if (!mkOn(s) || !t.cb) { d.skip = true; return; }
    const g = t.groups[t.cb.gi], plan = t.cb.plan; t.cb = null;
    if (!g) { d.skip = true; return; }
    g.next = U.int(6, 10);
    const pb = plan ? U.clamp((plan.q - 40) / 3, -4, 8) : -3;
    const sc = songScore(s, { perf: 20 + t.agT * 8 + U.normal(0, 4), q: boughtQ(t.agT), fans: g.f, tier: t.agT, trend: g.sig === s.trend, bonus: pb + (g.mood - 50) / 10 });
    d.peak = chartFromScore(sc); d.g = g.name; d.plan = plan;
    const b = g.f; g.f = Math.max(0, g.f + fanGainRaw(sc, g.f, 0.6 + t.agT * 0.2, starCap(60, 'kr'))); d.df = g.f - b;
    d.k = mkEval(s, t, (plan ? plan.q : 25) + (d.peak && d.peak <= 20 ? 5 : 0));
    d.bonus = d.peak && d.peak <= 10 ? t.sal : 0; if (d.bonus) earn(s, d.bonus, '마케팅 성과급', 'marketer');
    t.done++;
    addWork(s, { type: '컴백 홍보', title: `${g.name} 컴백`, by: plan ? `${plan.pf} · ${plan.how}` : '회사 기본 홍보', sc: Math.round(sc), note: chartText(d.peak), pay: d.bonus || 0 });
    d.up = mkTierUp(s, t);
  },
  text: (s, d) => `${d.g}의 컴백 성적이 나왔다. ${d.plan ? `(${d.plan.pf} · ${d.plan.how})` : '(내가 계획을 세우지 않아 회사 기본 홍보로 나갔다)'}\n\n${chartText(d.peak)} · 팬 ${sgnFans(d.df)}\n${d.k === 2 ? '홍보가 크게 먹혔다는 평가를 받았다.' : d.k ? '홍보가 제 몫을 했다는 평가를 받았다.' : '홍보가 아쉬웠다는 말을 들었다.'}${d.bonus ? `\n성과급 ${fmtWon(d.bonus)}` : ''}\n업무 평가 ${Math.round(s.tracks.marketer.rep)}${d.up ? `\n\n🎉 ${d.up}` : ''}`,
  ch: (s, d) => [{ t: '확인', f: () => `${d.g} 컴백 ${chartText(d.peak)}.${d.up ? ' ' + d.up : ''}` }],
});

// ───── 골라서 하는 일: 신그룹 런칭 기획 (타겟 → 컨셉) ─────
E({
  id: 'mk_launch', cat: '마케팅', title: '신그룹 런칭 기획', tag: 'career',
  init(s, d) { const t = s.tracks.marketer; if (!mkOn(s) || !t.launch || t.launch.plan) d.skip = true; },
  text: s => `넉 달 뒤 데뷔할 신인 그룹의 타겟을 정하자.`,
  ch: s => MK_TGTS.map(tgt => ({ t: tgt, f: s => { fireEvent(s, 'mk_launch2', { tgt }); return ''; } })),
});
E({
  id: 'mk_launch2', cat: '마케팅', title: '신그룹 컨셉', tag: 'career',
  init(s, d) { const t = s.tracks.marketer; if (!mkOn(s) || !t.launch || t.launch.plan) d.skip = true; },
  text: (s, d) => { const t = s.tracks.marketer; return `타겟은 ${d.tgt}. 데뷔 컨셉은 무엇으로 할까?\n\n요즘 유행 ${qIda(s.trend)}.${mkHint(s, t, 60) ? `\n시장조사: ${josa(d.tgt, '은는')} ${MK_TC[d.tgt].map(c => `'${c}'`).join(' · ')} 컨셉을 좋아한다.` : ''}`; },
  ch: (s, d) => TRENDS.map(c => ({ t: c, tr: c === s.trend, f: s => {
    const t = s.tracks.marketer;
    const q = mkScore(s) + (c === s.trend ? 5 : 0) + (MK_TC[d.tgt].includes(c) ? 4 : 0) + t.mi * 0.08 + U.normal(0, 6);
    t.launch.plan = { tgt: d.tgt, c, q };
    return `신인 그룹을 ${d.tgt} 타겟, '${c}' 컨셉으로 내보내기로 했다.`;
  } })),
});
E({
  id: 'mk_launch_res', cat: '마케팅', title: '신인 그룹 데뷔', tag: 'career',
  plio: (s, d) => d.pl !== undefined ? d.pl : (d.pl = typeof commSpec === 'function' && d.g ? commSpec(s, { k: 'mk', bd: '아이돌 게시판', t: d.g, tn: d.k === 2 ? 'great' : d.k === 1 ? 'good' : d.plan === null || d.plan === undefined ? 'meh' : 'bad' }) : null),
  init(s, d) {
    const t = s.tracks.marketer;
    if (!mkOn(s) || !t.launch) { d.skip = true; return; }
    const plan = t.launch.plan; t.launch = null; t.lnext = U.int(24, 48);
    const c = plan ? plan.c : U.pick(TRENDS), tgt = plan ? plan.tgt : U.pick(MK_TGTS);
    const sc = songScore(s, { perf: 20 + t.agT * 8 + U.normal(0, 4), q: boughtQ(t.agT), fans: 0, tier: t.agT, trend: c === s.trend, bonus: plan ? U.clamp((plan.q - 40) / 3, -4, 8) : -3 });
    const g = mkNewGroup(s, t, { sig: c, tgt, f: 0, mood: 55, next: U.int(5, 8) });
    g.f = Math.max(500, fanGainRaw(sc, 0, 0.6 + t.agT * 0.2, starCap(60, 'kr')) * 3);
    t.groups.push(g);
    d.g = g.name; d.peak = chartFromScore(sc); d.f = g.f; d.plan = plan;
    d.k = mkEval(s, t, (plan ? plan.q : 25) + (d.peak && d.peak <= 40 ? 5 : 0));
    t.done++;
    addWork(s, { type: '신그룹 런칭', title: g.name, by: `${tgt} · '${c}'`, sc: Math.round(sc), note: chartText(d.peak) });
    d.up = mkTierUp(s, t);
  },
  text: (s, d) => `신인 그룹 ${josa(d.g, '이가')} 데뷔했다. ${d.plan ? `(${d.plan.tgt} 타겟 · '${d.plan.c}' 컨셉)` : '(내가 기획하지 않아 회사가 정한 대로 나갔다)'}\n\n데뷔곡 ${chartText(d.peak)} · 팬 ${fmtFans(d.f)}\n${d.k === 2 ? '올해 최고의 신인 런칭이라는 말을 들었다.' : d.k ? '런칭이 무난하게 자리 잡았다.' : '데뷔 반응이 조용하다.'}${d.up ? `\n\n🎉 ${d.up}` : ''}`,
  ch: (s, d) => [{ t: '확인', f: () => `신인 그룹 ${d.g} 데뷔 · ${chartText(d.peak)}.${d.up ? ' ' + d.up : ''}` }],
});

// ───── 골라서 하는 일: 광고 기획 (매체 → 예산) → 3개월 집행 ─────
E({
  id: 'mk_ad', cat: '마케팅', title: '광고 기획', tag: 'career',
  init(s, d) { const t = s.tracks.marketer; if (!mkOn(s) || t.ad) { d.skip = true; return; } d.gi = U.int(0, t.groups.length - 1); },
  text: (s, d) => { const t = s.tracks.marketer, g = t.groups[d.gi]; return `${g.name}(타겟 ${g.tgt}) 광고를 기획한다. 어느 매체에 낼까?`; },
  ch: (s, d) => Object.keys(MK_AD).map(ch => ({ t: ch, f: s => { fireEvent(s, 'mk_ad2', { gi: d.gi, ch }); return ''; } })),
});
E({
  id: 'mk_ad2', cat: '마케팅', title: '광고 예산', tag: 'career',
  init(s, d) { const t = s.tracks.marketer; if (!mkOn(s) || t.ad) d.skip = true; },
  text: (s, d) => `${d.ch} 예산은 얼마로 발주할까? 회사 돈으로 낸다. 크게 쓸수록 회사의 기대도 커진다.`,
  ch: (s, d) => MK_BUD.map((b, i) => ({ t: `${b.n} (${fmtWon(b.won * 1e4)})`, f: s => {
    const t = s.tracks.marketer, g = t.groups[d.gi];
    t.ad = { gi: d.gi, ch: d.ch, bud: i, left: 3, q: mkScore(s) + (MK_AD[d.ch][g.tgt] || 0) + t.mi * 0.08 + U.normal(0, 6) };
    return `${g.name} ${josa(d.ch, '을를')} ${fmtWon(b.won * 1e4)}에 발주했다. 석 달 동안 집행한다.`;
  } })),
});
E({
  id: 'mk_ad_res', cat: '마케팅', title: '광고 결과', tag: 'career',
  plio: (s, d) => d.pl !== undefined ? d.pl : (d.pl = typeof commSpec === 'function' && d.g ? commSpec(s, { k: 'mk', bd: '아이돌 게시판', t: d.g, tn: d.k === 2 ? 'great' : d.k === 1 ? 'good' : d.plan === null || d.plan === undefined ? 'meh' : 'bad' }) : null),
  init(s, d) {
    const t = s.tracks.marketer;
    if (!mkOn(s) || !t.ad) { d.skip = true; return; }
    const a = t.ad, g = t.groups[a.gi], b = MK_BUD[a.bud]; t.ad = null; t.adCd = s.t + 2;
    if (!g) { d.skip = true; return; }
    const df = Math.max(0, Math.round(g.f * U.clamp((a.q - 35) / 400, -0.02, 0.08) * b.mul + (a.q - 30) * 20 * b.mul));
    g.f += df; d.df = df; d.g = g.name; d.ch = a.ch;
    d.k = mkEval(s, t, a.q - b.bar); t.done++;
    d.up = mkTierUp(s, t);
  },
  text: (s, d) => `${d.g} ${d.ch} 집행이 끝났다. 팬 ${sgnFans(d.df)}.\n${d.k === 2 ? '비용 대비 효과가 아주 좋았다는 평가를 받았다.' : d.k ? '쓴 돈만큼은 했다는 평가를 받았다.' : '돈만 썼다는 말을 들었다.'}${d.up ? `\n\n🎉 ${d.up}` : ''}`,
  ch: (s, d) => [{ t: '확인', f: () => `${d.g} ${d.ch} 결과: 팬 ${sgnFans(d.df)}.${d.up ? ' ' + d.up : ''}` }],
});

// ───── 여론 대응 (일이 터지면 바로 고른다) ─────
E({
  id: 'mk_issue', cat: '여론 대응', title: '여론 대응', tag: 'career',
  init(s, d) { const t = s.tracks.marketer; if (!mkOn(s) || !t.groups[d.gi]) d.skip = true; },
  text: (s, d) => { const t = s.tracks.marketer, g = t.groups[d.gi]; return `${g.name}의 ${josa(d.n, '이가')} 커뮤니티에 퍼지고 있다. 팬덤 분위기는 ${mkMood(g.mood)}. 어떻게 대응할까?`; },
  ch: (s, d) => MK_RESP.map(r => ({ t: r, f: s => {
    const t = s.tracks.marketer, g = t.groups[d.gi], is = MK_ISSUES.find(x => x.n === d.n) || MK_ISSUES[0];
    const fit = r === is.best ? 15 : r === is.ok ? 5 : -10;
    const sc = mkScore(s) * 0.6 + 18 + fit + t.mi * 0.05 + U.normal(0, 6);
    const k = mkEval(s, t, sc);
    g.mood = U.clamp(g.mood + (k === 2 ? 8 : k ? 3 : -12), 0, 100);
    if (k === 0) g.f = Math.round(g.f * 0.97);
    addStress(s, 3);
    const up = mkTierUp(s, t);
    return `${g.name}의 ${d.n}에 ${josa(r, '으로')} 대응했다. ${k === 2 ? '여론이 빠르게 가라앉았다.' : k ? '큰 탈 없이 넘어갔다.' : '오히려 불이 커졌다. 팬들이 화가 났다.'}` + (up ? ` ${up}` : '');
  } })),
});
E({
  id: 'mk_fire', cat: '마케팅', title: '권고사직', tag: 'career',
  cond: s => mkOn(s),
  text: s => `업무 평가가 바닥까지 떨어졌다. 팀장이 조용히 불러 다른 길을 알아보는 게 좋겠다고 한다.`,
  ch: () => [{ t: '짐을 정리한다', f: s => leaveEmp(s, 'marketer', '권고사직') + fx(s, { stress: 8 }) }],
});
