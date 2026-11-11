'use strict';
// ════════ 애니메이션 쪽 직업 (7-1단계): 애니메이터 · 애니메이션 감독 · 성우 ════════
// 지금은 틀만 넣는다. 자세한 일은 12단계 직업별 디테일에서 정한다

// ───── 업계 회사: 애니 제작사 · 성우 공채 방송사 (크기마다 3곳, con 컨셉은 지금은 이름표뿐) ─────
// 회사 열쇠는 'ani:이름' · 'bc:이름'. 팀(작화팀 · 연출부 · 성우극회)은 js/work.js의 회사 직원 규칙으로 만든다
const ANIME_COS = [
  { n: '스튜디오 미리내', tier: 3, con: '극장판' }, { n: '블루문 애니메이션', tier: 3, con: 'TV 시리즈' }, { n: '코메트 픽처스', tier: 3, con: '해외 합작' },
  { n: '스튜디오 반디', tier: 2, con: '판타지 액션' }, { n: '모모 애니웍스', tier: 2, con: '일상·코미디' }, { n: '아크라이트 스튜디오', tier: 2, con: 'SF' },
  { n: '스튜디오 조약돌', tier: 1, con: '웹 애니' }, { n: '스케치북 스튜디오', tier: 1, con: '광고·게임 영상' }, { n: '꿈틀 애니메이션', tier: 1, con: '숏폼 애니' },
];
function aniCoOf(tier) { return U.pick(ANIME_COS.filter(x => x.tier === tier)); }
function aniCoTier(n) { const x = ANIME_COS.find(c => c.n === n); return x ? x.tier : 1; }
const VO_BCS = [
  { n: 'HBS', tier: 3, con: '종합 방송' }, { n: 'KTN', tier: 3, con: '외화 더빙' }, { n: '누리방송', tier: 3, con: '다큐멘터리' },
  { n: 'STV', tier: 2, con: '드라마 더빙' }, { n: '팝콘툰 채널', tier: 2, con: '애니 전문' }, { n: '씨네웨이브', tier: 2, con: '영화 채널' },
  { n: '별빛키즈 TV', tier: 1, con: '키즈' }, { n: '퐁당 애니', tier: 1, con: '유아 애니' }, { n: '말랑키즈 TV', tier: 1, con: '교육 애니' },
];
function coTagOf(x) { return `${TIER_N[x.tier]} · ${x.con}`; }
function aniGenre(s) { return U.chance(0.4) && (s.trendTV || {}).anime ? s.trendTV.anime : U.pick(ANIME_TRENDS); }
// 숙련도 (애니 장르마다 따로, 0~100): 그 장르로 일할수록 오르고 창의력이 높으면 빨리 오른다 (곡 컨셉 숙련도와 같은 셈)
function aniMGet(s, key, g) { return ((s[key] || {})[g]) || 0; }
function aniMGain(s, key, g, amt) { if (!g) return; const M = s[key] = s[key] || {}, m = M[g] || 0; M[g] = Math.min(100, m + amt * (1 - m / 100) * (0.6 + me(s).tal.creative / 100)); }
// 사전 조사 (v97): 작품을 쓰기 전에 그 장르를 조사한다. 장르마다 보는 재능(RESEARCH_FIT, 둘이면 평균)에 운을 더해 조사 점수(5~95)가 나온다
// 작품 점수에 (조사 점수 − 50) × 0.2만큼 더한다
function researchDo(s, g) {
  const p = me(s), L = RESEARCH_FIT[g] || [], v = L.length ? L.reduce((a, k) => a + p.tal[k], 0) / L.length : 50;
  const rs = Math.round(U.clamp(v + U.normal(0, 8), 5, 95));
  return { rs, w: rs >= 65 ? '자료를 아주 꼼꼼히 모았다' : rs >= 52 ? '쓸 만한 자료를 충분히 모았다' : rs >= 40 ? '자료가 조금 모자랐다' : '조사가 제대로 되지 않았다' };
}
function researchB(rs) { return rs == null ? 0 : (rs - 50) * 0.2; }
function aniMBonus(s, key, g) { return g ? (aniMGet(s, key, g) - 20) / 8 * 0.6 : 0; }
function aniMBars(s, key) { const tr = (s.trendTV || {}).anime; return ANIME_TRENDS.filter(g => aniMGet(s, key, g) >= 1 || g === tr).sort((a, b) => aniMGet(s, key, b) - aniMGet(s, key, a)).map(g => ({ n: g, v: aniMGet(s, key, g), tag: g === tr ? '유행' : '' })); }
// 등급 올리기 (세 직업 공통): pts 문턱을 넘으면 오른다. 맨 위는 정해진 재능(tal)이 그 값 이상이어야 한다. need(k): 그 등급에 더 필요한 조건
function aniTierUp(s, t, UP, NAMES, need) {
  const k0 = t.tier, p = me(s);
  while (t.tier < 6 && t.pts >= UP.pts[t.tier + 1] && (!UP.fans || totalFans(s) >= UP.fans[t.tier + 1]) && (t.tier < 5 || p.tal[UP.tal] >= UP.min) && (!need || need(t.tier + 1))) t.tier++;
  if (t.tier === k0) return '';
  if (t.tier >= 4) milestone(s, `${age(s)}세에 ${josa(NAMES[t.tier], '이가')} 되었다.`);
  return `이제 업계에서 나를 '${NAMES[t.tier]}'로 부른다.`;
}

// ════════ 애니메이터 ════════
// 그림 특기로 일한다. 동화 → 원화 → 작화감독으로 올라간다
// 애니 제작사 작화팀 직원(월급 · 석 달마다 평가 · 평가가 좋으면 팀장)이거나 프리랜서(일감마다 작화비)다
const ANIM_TIERS = ['신입 애니메이터', '동화 애니메이터', '원화 애니메이터', '베테랑 원화', '작화감독', '총작화감독', '레전드 애니메이터'];
const ANIM_POW = [0, 0.5, 1, 2, 3, 3.5, 4];
// (2026-11-08 애니메이터만 한 인생 200명: 레전드 3.5%)
const ANIM_UP = { pts: [0, 5, 14, 30, 55, 88, 111], tal: 'aesth', min: 55 };
// 일감: min 맡을 수 있는 등급, fee 만 원, fame 이름이 알려지는 정도, demand 난이도, by 맡기는 곳
// fit: 그 일에서 더 보는 것 (v97, 8-4 사용자 표 · fitB). 원화까지는 연출, 작화감독은 영상 편집, 총작화감독은 끈기 · 영상 편집
const ANIM_JOBS = [
  { id: 'dong', n: 'TV 애니 동화', min: 0, fee: 40, fame: 0.02, demand: 28, by: 'ani', fit: ['direct'] },
  { id: 'ad', n: '광고 애니메이션 원화', min: 1, fee: 100, fame: 0.05, demand: 34, by: 'ad', fit: ['direct'] },
  { id: 'key', n: 'TV 애니 원화', min: 2, fee: 150, fame: 0.1, demand: 40, by: 'ani', fit: ['direct'] },
  { id: 'game', n: '게임 컷신 원화', min: 2, fee: 200, fame: 0.1, demand: 42, by: 'game', fit: ['direct'] },
  { id: 'op', n: '오프닝 영상 원화', min: 3, fee: 300, fame: 0.4, demand: 48, by: 'ani', fit: ['direct'] },
  { id: 'sak', n: 'TV 애니 한 화 작화감독', min: 4, fee: 500, fame: 0.5, demand: 52, by: 'ani', fit: ['edit'] },
  { id: 'chief', n: '극장판 총작화감독', min: 5, fee: 1500, fame: 0.9, demand: 58, by: 'ani', fit: ['grit', 'edit'] },
];
// 작화비는 등급이 오를수록 조금씩 오른다 (1 + 등급 무게 × 0.3)
const ANIM_FEE_UP = 0.3;
const ANIM_SAL = [0, 190, 230, 280], ANIM_THR = [0, 24, 34, 44], ANIM_BAR = [0, 42, 48, 54];
EMP_N.animator = '작화';
// v95: 그림 · 창의력 · 끈기(모두 강함) + 장르 숙련도
function animScore(s, g) { const p = me(s), t = p.tal; return jobMix([[lv(p, 'art'), JS_], [t.creative, JS_], [t.grit, JS_]]) + aniMBonus(s, 'anm', g); }
function animApply(s) { return animScore(s) + empExpBonus(s, 'animator') + ANIM_POW[(s.tracks.animator || {}).tier || 0] * 2; }
function anStart(s, o = {}) {
  const old = s.tracks.animator;
  s.tracks.animator = Object.assign({ st: 'active', mode: 'free', months: 0, tier: old.tier || 0, pts: old.pts || 0, jobs: old.jobs || 0, everLead: !!old.everLead, hist: old.hist || [] }, o);
  if (!old.jobs && !(old.hist || []).length) milestone(s, `${age(s)}세에 애니메이터 일을 시작했다.`);
}
// 회사를 나오면 프리랜서로 돌아간다 (직원 계약 공통 코드 leaveEmp가 부른다)
function anLeave(s, why) { const t = s.tracks.animator, n = t.agN; t.hist.push(`${n} 작화팀 (${why})`); t.mode = 'free'; t.lead = false; t.cEnd = null; t.sal = 0; t.agN = ''; return `${josa(n, '을를')} 나왔다. 이제 프리랜서로 일한다.`; }
function anTierUp(s, t) { return aniTierUp(s, t, ANIM_UP, ANIM_TIERS); }
CAREERS.animator = {
  n: '애니메이터', ic: '✏️',
  desc: '애니메이션의 그림을 그린다. 동화부터 시작해 원화, 작화감독으로 올라간다. 애니 제작사 작화팀에 들어가거나 프리랜서로 일한다. 그림 특기가 가장 중요하다.',
  act: { n: '작화 작업', ic: '✏️', g: '직업 활동', eff: [['그림', '↑↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) { return t.st !== 'active' ? (t.endNote || '') : `${ANIM_TIERS[t.tier]} · ${t.mode === 'emp' ? `${t.agN} 작화팀${t.lead ? ' 팀장' : ''} · 평가 ${Math.round(t.rep)}` : '프리랜서'} · 작업 ${t.jobs}건`; },
  short(s, t) { return t.mode === 'emp' ? `${t.agN} 애니메이터` : '애니메이터'; },
  seg(s, t) { return t.mode === 'emp' ? `${t.agN} 작화팀` : '프리랜서 애니메이터'; },
  title(s, t) { return t.jobs ? ANIM_TIERS[t.tier] : null; },
  contract(s, t) { return t.st === 'active' && t.mode === 'emp' ? `${t.agN} (작화팀)` : ''; },
  emp: true,
  cLeft(s, t) { return t.st === 'active' && t.mode === 'emp' && t.cEnd != null ? t.cEnd - t.months : null; },
  mainSk() { return 'art'; },
  info(s, t) {
    const R = [['일하는 곳', t.mode === 'emp' ? `${t.agN} (${TIER_N[t.coTier || 1]} 애니 제작사) 작화팀${t.lead ? ' 팀장' : ''} · 월급 ${fmtWon(t.sal)}` : '프리랜서 (일감마다 작화비)'], ['등급', ANIM_TIERS[t.tier]], ['한 일', `${t.jobs}건`]];
    if (t.mode === 'emp') R.push(['업무 평가', `${Math.round(t.rep)}`]);
    R.push({ h: '작화 장르 숙련도', bars: aniMBars(s, 'anm') });
    return R;
  },
  actions(s, t) {
    if (t.st !== 'active') return [];
    if (t.mode === 'emp') return [{ t: '회사 그만두기', h: '직원 계약이라 위약금은 없다 · 그만두면 프리랜서로 돌아간다', ok: true, danger: true, confirm: '정말 회사를 그만둘까요?', run: s => anLeave(s, '퇴사') }];
    return [{ t: '애니메이터 일 그만두기', ok: true, danger: true, confirm: '정말 애니메이터 일을 그만둘까요?', run: s => { t.st = 'ended'; t.endNote = `${ANIM_TIERS[t.tier]}, 작업 ${t.jobs}건`; t.hist.push(t.endNote); return '애니메이터 일을 그만뒀다.'; } }];
  },
  monthly(s, t) {
    if (t.st !== 'active') return;
    t.months++;
    const n = slotsOn(s, 'c_animator'), p = me(s);
    if (t.mode === 'emp') {
      empMonth(s, 'animator', t);
      earn(s, t.sal, '월급', 'animator');
      if (!n) { t.idle = (t.idle || 0) + 1; if (t.idle >= 4) { t.idle = 0; empRep(s, 'animator', t, -8); addLog(s, '작화팀에서 요즘 맡은 컷이 밀린다는 말을 들었다.', 'career'); } return; }
      t.idle = 0;
      practice(s, p, 'art', 1.3 * n); addStress(s, 2);
      if (t.months % 3 === 0) anEval(s, t);
      return;
    }
    if (!n) return;
    practice(s, p, 'art', 1.0 * n); addStress(s, 1.5);
    if (!hasQ(s, 'an_job') && U.chance(Math.min(0.6, (0.3 + ANIM_POW[t.tier] * 0.04) * (0.7 + access(s) * 0.3) * pm(s, 'network')))) queueEv(s, 'an_job', 0);
    adirDebutMaybe(s);
  },
};
// 회사 작화팀: 석 달마다 맡은 작화의 반응이 나와 평가가 오르내린다. 잘하면 등급 점수도 쌓인다
function anEval(s, t) {
  const g = aniGenre(s), q = animScore(s, g) + ANIM_POW[t.tier] * 2 + U.normal(0, 6), bar = ANIM_BAR[t.coTier || 2] + (t.lead ? 7 : 0), r0 = Math.round(t.rep);
  aniMGain(s, 'anm', g, 3); t.jobs++; empRep(s, 'animator', t, (q - bar) / 3);
  if (q >= bar + 4) t.pts += 1 + (t.lead ? 1 : 0);
  const up = anTierUp(s, t);
  const word = q >= bar + 12 ? '감독이 극찬했다' : q >= bar + 4 ? '좋다는 평' : q >= bar - 4 ? '무난하다는 평' : q >= bar - 12 ? '아쉽다는 평' : '다시 그리라는 말을 들었다';
  addWork(s, { type: '작화', title: animeTitle(g), by: t.agN, sc: Math.round(q + 10), note: `${g} · ${q >= bar + 4 ? '호평' : q >= bar - 4 ? '무난' : '아쉬움'}` });
  addRes(s, `맡은 ${g} 애니 작화 반응: ${word}. (업무 평가 ${r0} → ${Math.round(t.rep)})${up ? ' ' + up : ''}`);
  adirDebutMaybe(s);
}
JOB_APPLY.push({
  id: 'animator_free', trk: 'animator', g: '✏️ 애니메이터', n: '프리랜서 애니메이터로 시작하기',
  show: s => !trackOn(s, 'animator'),
  h: s => '동화 외주부터 시작한다 · 일정에 작화 작업을 넣어야 일감이 들어온다',
  ok: s => !s.army && age(s) >= 16 && lv(me(s), 'art') >= 20,
  why: s => s.army ? '군 복무 중' : age(s) < 16 ? '16세부터 할 수 있다' : '그림이 20레벨 이상이어야 한다',
  run: s => { anStart(s); return '프리랜서 애니메이터로 일을 시작했다. 일정에 작화 작업을 넣어야 일감이 들어온다.'; },
});
for (const tier of [3, 2, 1]) JOB_APPLY.push({
  id: 'animator_' + tier, trk: 'animator', g: '✏️ 애니메이터', n: `${TIER_N[tier]} 애니 제작사 작화팀 채용`, tag: `월급 ${ANIM_SAL[tier]}만 원`,
  show: s => !(trackOn(s, 'animator') && s.tracks.animator.mode === 'emp') && age(s) >= 18,
  h: s => lv(me(s), 'art') >= 30 ? `합격 가능성 ${fmtPct(audP(animApply(s), ANIM_THR[tier]))} · 결과는 다음 달` : '그림이 30레벨 이상이어야 지원할 수 있다',
  ok: s => !s.army && !agencyContract(s) && lv(me(s), 'art') >= 30 && !hasQ(s, 'an_res') && !(s.cd['anim' + tier] > s.t),
  why: s => s.army ? '군 복무 중' : agencyContract(s) ? contractWhy(s) : lv(me(s), 'art') < 30 ? '그림을 더 배워야 한다' : hasQ(s, 'an_res') ? '결과를 기다리는 중' : '얼마 전에 지원했다 (반년 뒤 다시)',
  run: s => { s.cd['anim' + tier] = s.t + 6; queueEv(s, 'an_res', 1, { tier, co: aniCoOf(tier).n, p: audP(animApply(s), ANIM_THR[tier]) }); return `${TIER_N[tier]} 애니 제작사 작화팀 채용에 지원했다.`; },
});
E({
  id: 'an_res', cat: '채용', title: '작화팀 채용 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); d.lead = d.pass && empStartLead(s, 'animator'); d.sal = empStartSal(s, 'animator', ANIM_SAL[d.tier] * 1e4, d.lead); },
  text: (s, d) => d.pass ? `${d.co} 작화팀에 ${d.lead ? '팀장으로 ' : ''}합격했다! 회사가 제시한 월급은 ${fmtWon(d.sal)}.${d.lead ? '\n\n그동안의 경력을 보고 처음부터 팀장 자리를 맡긴다.' : ''}` : `${d.co} 작화팀 채용에 떨어졌다.`,
  ch: (s, d) => d.pass ? anOfferCh(s, d) : [{ t: '확인', f: () => `${d.co} 작화팀 채용에 떨어졌다.` }],
});
function anOfferCh(s, d) {
  return [
    { t: '입사 조건을 들어 본다', ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '월급을 협상할 수 있다', f: s => startNego(s, { kind: 'animator', agN: d.co, tier: d.tier, sal: d.sal, lead: d.lead, months: 24, lev: U.clamp((d.p - 0.5) * 0.8 + 0.3, 0.05, 0.8) }) },
    { t: '거절한다', f: () => '입사 제안을 거절했다.' },
  ];
}
// 그림 플리오 채널이 크게 되면 애니 제작사 작화팀에서 먼저 연락이 온다 (js/video.js ytCareerOffer)
E({
  id: 'an_scout', cat: '제안', title: '작화팀 스카우트', tag: 'career',
  init(s, d) { d.co = aniCoOf(d.tier).n; d.p = 0.75; d.lead = empStartLead(s, 'animator'); d.sal = empStartSal(s, 'animator', ANIM_SAL[d.tier] * 1e4, d.lead); },
  text: (s, d) => `${d.co}에서 채널 「${d.ch}」의 그림을 보고 연락이 왔다. 작화팀에 ${d.lead ? '팀장으로 ' : ''}들어와 달라고 한다. 회사가 제시한 월급은 ${fmtWon(d.sal)}.`,
  ch: (s, d) => anOfferCh(s, d),
});
NEGO.animator = empNego('animator', (s, d) => {
  const old = s.tracks.animator, lead = !!d.lead;
  anStart(s, { mode: 'emp', agN: d.agN, coTier: d.tier, cEnd: d.months, rep: empStartRep(s, 'animator', lead), lead, everLead: !!old.everLead || lead, sal: d.sal, salBase: d.sal, salBase0: lead ? Math.round(d.sal / leadRaise('animator') / 1e5) * 1e5 : d.sal, idle: 0, months: 0 });
  milestone(s, `${age(s)}세에 ${d.agN} 작화팀에 ${lead ? '팀장으로 ' : ''}들어갔다.`);
  coMeetJob(s, 'animator');
  return `${d.agN} 작화팀에 ${lead ? '팀장으로 ' : ''}입사했다. 월급 ${fmtWon(d.sal)} · 계약 ${yrs(d.months)}.`;
});
// 프리랜서 일감: 두세 곳 중 하나를 맡는다. 등급이 오를수록 큰 일이 들어온다
function anClient(s, j) { return j.by === 'ad' ? U.pick(BRANDS).n : j.by === 'game' ? U.pick(BRANDS.filter(b => b.cat === '게임')).n : U.pick(ANIME_COS.filter(x => x.tier <= 1 + Math.ceil(j.min / 2))).n; }
function anJobP(s, j, g) { const t = s.tracks.animator; return U.clamp(U.sig((animScore(s, g) + fitB(me(s), j.fit) + ANIM_POW[t.tier] * 3 + (g === (s.trendTV || {}).anime ? 3 : 0) - j.demand) / 6), 0.05, 0.95); }
E({
  id: 'an_job', cat: '작화 일감', title: '작화 의뢰', tag: 'career',
  cond: s => trackOn(s, 'animator') && s.tracks.animator.mode === 'free',
  init(s, d) {
    const t = s.tracks.animator, can = ANIM_JOBS.filter(j => j.min <= t.tier);
    d.js = U.shuffle(can).slice(0, Math.min(3, can.length)).map(j => { const g = aniGenre(s); return { id: j.id, n: j.n, min: j.min, fame: j.fame, g, who: anClient(s, j), fee: Math.round(j.fee * (1 + ANIM_POW[t.tier] * ANIM_FEE_UP) * U.fl(0.8, 1.2)) * 1e4, p: anJobP(s, j, g) }; });
  },
  text: s => `작화 의뢰가 들어왔다. 하나를 맡을 수 있다.\n\n'${ANIM_TIERS[s.tracks.animator.tier]}' · 그림 ${lvi(me(s), 'art')}레벨`,
  ch: (s, d) => d.js.map(j => ({ t: `${j.who} · ${j.n}`, tr: j.g === (s.trendTV || {}).anime, h: `${fmtWon(j.fee)} · ${j.g} · 장르 숙련도 ${gauge(aniMGet(s, 'anm', j.g))} · 잘 나올 가능성 ${fmtPct(j.p)}`, f: s => anDoJob(s, j) }))
    .concat([{ t: '이번엔 넘긴다', f: () => '들어온 의뢰를 모두 거절했다.' }]),
});
function anDoJob(s, j) {
  const t = s.tracks.animator, p = me(s), good = U.chance(j.p), big = bigRoll(good, j.p);
  earn(s, j.fee, '작화비'); t.jobs++; aniMGain(s, 'anm', j.g, good ? 5 : 3); useSkill(s, p, 'art', 1.5); fitUse(s, p, (ANIM_JOBS.find(x => x.id === j.id) || {}).fit);
  const gain = big > 0 ? Math.max(0, fanGain(s, 60 + ANIM_POW[t.tier] * 3, 'kr', j.fame)) : 0;
  const fxt = fx(s, { fkr: gain, stress: big < 0 ? 5 : 2 });
  if (good && j.min >= Math.min(4, t.tier) - 1) t.pts += (j.fame >= 0.4 ? 2 : 1) + (big > 0 ? 1 : 0);
  const up = anTierUp(s, t);
  addWork(s, { type: '작화', pay: j.fee, title: `${j.who} ${j.n}`, by: ANIM_TIERS[t.tier], sc: big > 0 ? 85 : good ? 70 : big < 0 ? 30 : 45, note: `${j.g} · ${big > 0 ? '작화가 화제가 됐다' : good ? '반응이 좋았다' : big < 0 ? '작화 붕괴 소리를 들었다' : '무난'}` });
  const how = big > 0 ? '내가 그린 장면이 "작화가 미쳤다"며 퍼졌다.' : good ? '컷이 깔끔하다는 말을 들었다.' : big < 0 ? '작화가 무너졌다는 말이 돌았다. 수정 요청이 쏟아졌다.' : '무난하게 넘겼다.';
  const x = `${j.who}의 ${josa(j.n, '을를')} 끝냈다. ${how}` + fxt;
  // 방영 뒤 반응은 플리오에서 (작화 이야기라 내 이름은 나오지 않는다)
  const plio = typeof plioSpec === 'function' ? plioSpec({ k: 'animk', t: `${j.who} ${j.n}`, ch: j.who, me: '', sc: big > 0 ? 88 : good ? 70 : big < 0 ? 30 : 50 }) : null;
  return showResult(s, `${j.who} ${j.n}`, x + (up ? `\n\n${up}` : ''), x + (up ? ` ${up}` : ''), null, null, plio);
}

// ════════ 애니메이션 감독 ════════
// 연출 특기와 그림 특기를 본다. 단편 애니를 직접 만들거나, 애니 제작사 연출부(각 화 연출)에서 시작한다
// 데뷔하면 애니 제작사들이 작품을 맡긴다. 작품 하나를 몇 달~1년 넘게 이끌고, 다 만들면 반응이 나온다
const ADIR_TIERS = ['연출 지망생', '각 화 연출', '신인 감독', '현역 감독', '이름난 감독', '스타 감독', '거장 감독'];
const ADIR_POW = [0, 0.5, 1, 2, 3, 3.5, 4];
// 신인 감독부터는 작품을 하나 이상 이끌어 봐야 한다 (aniTierUp의 need)
// (2026-11-08 애니메이션 감독만 한 인생 200명: 거장 4.0%)
const ADIR_UP = { pts: [0, 2, 5, 10, 18, 28, 40], tal: 'creative', min: 50 };
const ADIR_SAL = 220e4;
// 작품 종류마다 무게: fame 이름이 알려지는 정도, win 잘되면 받는 등급 점수, fee 연출료 기준(만 원), m 걸리는 개월
const ADIR_KIND = { short: { n: '단편 애니', fame: 0.2, win: 2, fee: 0, m: 4 }, web: { n: '웹 애니', fame: 0.4, win: 2, fee: 600, m: 7 }, tv: { n: 'TV 애니', fame: 0.8, win: 4, fee: 6000, m: 14 }, ott: { n: 'OTT 애니', fame: 0.9, win: 4, fee: 8000, m: 15 }, film: { n: '극장판 애니', fame: 1.2, win: 5, fee: 1e4, m: 19 } };
// v95: 그림 · 연출(모두 강함) + 장르 숙련도 (0.8배: 예전 점수 크기와 비슷하게)
function adirScore(s, g) { const p = me(s); return 0.8 * jobMix([[lv(p, 'direct'), JS_], [lv(p, 'art'), JS_]]) + aniMBonus(s, 'adm', g); }
function adirStart(s, o = {}) {
  const old = s.tracks.adir;
  s.tracks.adir = Object.assign({ st: 'active', mode: 'indie', months: 0, tier: old.tier || 0, pts: old.pts || 0, works: old.works || 0, shorts: old.shorts || 0, pj: null, hist: old.hist || [] }, o);
  if (!old.months && !(old.hist || []).length) milestone(s, `${age(s)}세에 애니메이션 연출의 길을 걷기 시작했다.`);
  return s.tracks.adir;
}
function adirTierUp(s, t) { return aniTierUp(s, t, ADIR_UP, ADIR_TIERS, k => k < 2 || t.works >= 1); }
CAREERS.adir = {
  n: '애니메이션 감독', ic: '📽️',
  desc: '애니메이션 한 편을 이끈다. 단편 애니를 직접 만들거나 애니 제작사 연출부에서 시작하고, 데뷔하면 제작사들이 작품을 맡긴다. 연출과 그림을 본다.',
  act: { n: '애니 연출 작업', ic: '📽️', g: '직업 활동', eff: [['연출', '↑↑', 1], ['그림', '↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) {
    if (t.st !== 'active') return t.endNote || '';
    const w = t.pj ? ` · ${t.pj.kind === 'short' ? '단편' : ''}「${t.pj.title}」 만드는 중 (${Math.max(1, t.pj.end - s.t)}개월 남음)` : '';
    return `${ADIR_TIERS[t.tier]} · ${t.mode === 'ep' ? `${t.co} 연출부` : t.mode === 'dir' ? '감독' : '데뷔 전'} · 연출작 ${t.works}편${w}`;
  },
  short(s, t) { return t.mode === 'ep' ? `${t.co} 연출` : '애니메이션 감독'; },
  seg(s, t) { return t.mode === 'ep' ? `${t.co} 연출부` : '애니메이션 감독'; },
  title(s, t) { return t.works || t.shorts || t.months >= 12 ? ADIR_TIERS[t.tier] : null; },
  contract(s, t) { return t.st === 'active' && t.mode === 'ep' ? `${t.co} (연출부)` : ''; },
  emp: true,
  mainSk() { return 'direct'; },
  info(s, t) {
    const R = [['일하는 곳', t.mode === 'ep' ? `${t.co} (${TIER_N[aniCoTier(t.co)]} 애니 제작사) 연출부 · 월급 ${fmtWon(t.sal)}` : t.mode === 'dir' ? '감독 (제작사들이 작품을 맡긴다)' : '데뷔 전 (단편 애니를 만든다)'], ['등급', ADIR_TIERS[t.tier]], ['연출작', `${t.works}편 · 단편 ${t.shorts}편`]];
    if (t.pj) R.push(['만드는 작품', `${ADIR_KIND[t.pj.kind].n} 「${t.pj.title}」 · ${t.pj.g}${t.pj.co ? ` · ${t.pj.co}` : ''} · ${Math.max(1, t.pj.end - s.t)}개월 남음`]);
    R.push({ h: '애니 연출 장르 숙련도', bars: aniMBars(s, 'adm') });
    return R;
  },
  actions(s, t) {
    if (t.st !== 'active') return [];
    if (t.mode === 'ep') return [{ t: '연출부 그만두기', h: '혼자 단편 애니부터 다시 시작한다', ok: true, danger: true, confirm: '연출부를 그만둘까요?', run: s => { t.hist.push(`${t.co} 연출부 (퇴사)`); t.mode = 'indie'; t.co = ''; t.sal = 0; return '연출부를 그만뒀다.'; } }];
    return [{ t: '애니메이션 감독 그만두기', ok: !t.pj, why: '만드는 작품이 끝난 뒤에 그만둘 수 있다', danger: true, confirm: '정말 애니메이션 연출을 그만둘까요?', run: s => { t.st = 'ended'; t.endNote = `${ADIR_TIERS[t.tier]}, 연출작 ${t.works}편`; t.hist.push(t.endNote); return '애니메이션 연출을 그만뒀다.'; } }];
  },
  monthly(s, t) {
    if (t.st !== 'active') return;
    t.months++;
    const n = slotsOn(s, 'c_adir'), p = me(s);
    if (t.mode === 'ep') earn(s, t.sal, '월급', 'adir');
    if (n) { practice(s, p, 'direct', 1.0 * n); useSkill(s, p, 'art', 0.4 * n); addStress(s, t.pj ? 2.5 : 1.5); }
    if (t.pj) {
      if (n) { t.pj.work++; aniMGain(s, 'adm', t.pj.g, 0.8); }
      if (s.t >= t.pj.end) adirDone(s, t);
      return;
    }
    if (t.mode === 'ep') {
      // 연출부: 반년마다 맡은 회차 반응. 실력이 쌓이면 회사가 데뷔작을 맡긴다
      t.epM = (t.epM || 0) + 1;
      if (n && t.epM % 6 === 0) { const g = aniGenre(s), q = adirScore(s, g) + U.normal(0, 6); aniMGain(s, 'adm', g, 2); if (q >= 36) { t.pts += 1; const up = adirTierUp(s, t); addRes(s, `맡은 ${g} 애니 회차 연출이 좋다는 말을 들었다.${up ? ' ' + up : ''}`); } else addRes(s, `맡은 ${g} 애니 회차 연출이 무난하게 나갔다.`); }
      if (n && t.epM >= 12 && lv(p, 'direct') >= 35 && !hasQ(s, 'adir_debut') && U.chance(0.06)) queueEv(s, 'adir_debut', 0, { co: t.co });
      return;
    }
    if (t.mode === 'dir' && !hasQ(s, 'adir_offer') && U.chance((0.06 + ADIR_POW[t.tier] * 0.015) * (n ? 1 : 0.5) * stigmaMul(s))) queueEv(s, 'adir_offer', 0);
    // 데뷔 전: 단편을 만들어 본 적이 있고 연출 실력이 쌓이면, 단편을 본 제작사에서 가끔 데뷔 제안이 온다
    if (t.mode === 'indie' && n && t.shorts && lv(p, 'direct') >= 30 && !hasQ(s, 'adir_debut') && U.chance(0.03)) queueEv(s, 'adir_debut', 0, {});
  },
};
// 단편 애니 (데뷔 전): 내 돈으로 넉 달 동안 만든다. 잘 나오면 영화제에서 상을 받고 제작사의 연락이 온다
const ADIR_SHORT_COST = 300e4;
JOB_APPLY.push({
  id: 'adir_short', trk: 'adir', g: '📽️ 애니메이션 감독', n: '단편 애니메이션 만들기', tag: `제작비 ${fmtWon(ADIR_SHORT_COST)}`,
  show: s => !(trackOn(s, 'adir') && s.tracks.adir.mode !== 'indie'),
  h: s => '넉 달 동안 혼자 단편 애니를 만든다 · 잘 나오면 영화제에 걸리고 제작사에서 연락이 온다 · 일정에 애니 연출 작업을 넣어야 진도가 나간다',
  ok: s => !s.army && age(s) >= 16 && lv(me(s), 'direct') >= 20 && lv(me(s), 'art') >= 20 && s.money >= ADIR_SHORT_COST && !(trackOn(s, 'adir') && s.tracks.adir.pj),
  why: s => s.army ? '군 복무 중' : age(s) < 16 ? '16세부터 할 수 있다' : lv(me(s), 'direct') < 20 || lv(me(s), 'art') < 20 ? '연출과 그림이 20레벨 이상이어야 한다' : trackOn(s, 'adir') && s.tracks.adir.pj ? '만드는 작품이 있다' : '제작비가 모자란다',
  run: s => { const t = trackOn(s, 'adir') ? s.tracks.adir : adirStart(s), g = aniGenre(s); addMoney(s, -ADIR_SHORT_COST, '단편 애니 제작비'); const r = researchDo(s, g); t.pj = { kind: 'short', g, title: animeTitle(g), co: '', coTier: 0, lvl: 0, fee: 0, start: s.t, end: s.t + ADIR_KIND.short.m, work: 0, rs: r.rs }; return `${g} 단편 애니메이션 「${t.pj.title}」을 만들기 시작했다. 사전 조사: ${r.w}.`; },
});
JOB_APPLY.push({
  id: 'adir_ep', trk: 'adir', g: '📽️ 애니메이션 감독', n: '애니 제작사 연출부 지원 (각 화 연출)', tag: `월급 ${fmtWon(ADIR_SAL)}`,
  show: s => !(trackOn(s, 'adir') && s.tracks.adir.mode !== 'indie') && age(s) >= 20,
  h: s => `합격 가능성 ${fmtPct(audP(adirScore(s) + (s.tracks.adir.shorts || 0) * 2, 30))} · 결과는 다음 달 · 월급을 받으며 회차 연출을 배운다`,
  ok: s => !s.army && !agencyContract(s) && lv(me(s), 'direct') >= 25 && !(trackOn(s, 'adir') && s.tracks.adir.pj) && !hasQ(s, 'adir_ep_res') && !(s.cd.adirEp > s.t),
  why: s => s.army ? '군 복무 중' : agencyContract(s) ? contractWhy(s) : lv(me(s), 'direct') < 25 ? '연출이 25레벨 이상이어야 한다' : trackOn(s, 'adir') && s.tracks.adir.pj ? '만드는 작품이 있다' : hasQ(s, 'adir_ep_res') ? '결과를 기다리는 중' : '얼마 전에 지원했다 (반년 뒤 다시)',
  run: s => { s.cd.adirEp = s.t + 6; queueEv(s, 'adir_ep_res', 1, { co: aniCoOf(U.pick([1, 1, 2, 2, 3])).n, p: audP(adirScore(s) + (s.tracks.adir.shorts || 0) * 2, 30) }); return '애니 제작사 연출부에 지원했다.'; },
});
E({
  id: 'adir_ep_res', cat: '채용', title: '연출부 채용 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); },
  text: (s, d) => d.pass ? `${d.co} 연출부에서 회차 연출을 맡아 보자는 연락이 왔다. 월급은 ${fmtWon(ADIR_SAL)}.` : `${d.co} 연출부 채용에 떨어졌다.`,
  ch: (s, d) => d.pass ? [
    { t: '들어간다', nj: 'adir', nm: ['emp'], ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '', f: s => { const t = trackOn(s, 'adir') ? s.tracks.adir : adirStart(s); Object.assign(t, { mode: 'ep', co: d.co, sal: ADIR_SAL, epM: 0 }); coMeetJob(s, 'adir'); return `${d.co} 연출부에 들어갔다.`; } },
    { t: '거절한다', f: () => '연출부 제안을 거절했다.' },
  ] : [{ t: '확인', f: () => `${d.co} 연출부 채용에 떨어졌다.` }],
});
// 데뷔 제안: 연출부에서 실력을 인정받았거나, 단편이 좋은 반응을 얻었거나, 작화감독급 애니메이터가 되었을 때
E({
  id: 'adir_debut', cat: '제안', title: '감독 데뷔 제안', tag: 'career',
  init(s, d) { d.co = d.co || aniCoOf(U.pick([1, 1, 2])).n; d.o = adirMakeOffer(s, 0, d.co); },
  text: (s, d) => `${d.ch ? `채널 「${d.ch}」의 단편 애니메이션을 본 ` : ''}${d.co}에서 ${ADIR_KIND[d.o.kind].n} 「${d.o.title}」(${d.o.g})의 감독을 맡아 달라는 제안이 왔다. 감독 데뷔작이다.\n\n연출료 ${fmtWon(d.o.fee)} · 만드는 데 ${ADIR_KIND[d.o.kind].m}개월`,
  ch: (s, d) => [
    { t: '맡는다', nj: 'adir', ok: s => !(trackOn(s, 'adir') && s.tracks.adir.pj), h: '일정에 애니 연출 작업을 넣어야 작품이 잘 나온다', f: s => { const t = trackOn(s, 'adir') ? s.tracks.adir : adirStart(s); if (t.mode === 'ep') t.hist.push(`${t.co} 연출부 (감독 데뷔)`); Object.assign(t, { mode: 'dir', co: '', sal: 0 }); return adirTake(s, t, d.o); } },
    { t: '아직은 배운다', f: () => '데뷔 제안을 미뤘다.' },
  ],
});
function adirDebutMaybe(s) {
  const a = s.tracks.animator, d = s.tracks.adir;
  if (trackOn(s, 'adir') && d.mode !== 'indie') return;
  if (a && trackOn(s, 'animator') && a.tier >= 4 && lv(me(s), 'direct') >= 20 && !hasQ(s, 'adir_debut') && U.chance(0.015)) queueEv(s, 'adir_debut', 0, { co: a.mode === 'emp' ? a.agN : null });
}
// 작품 제안: 등급이 오를수록 큰 작품, 큰 제작사
function adirMakeOffer(s, tier, co) {
  const kinds = tier <= 2 ? ['web'] : tier === 3 ? ['web', 'tv'] : tier === 4 ? ['tv', 'ott'] : ['tv', 'ott', 'film'];
  const kind = U.pick(kinds), x = co ? ANIME_COS.find(c => c.n === co) || aniCoOf(1) : aniCoOf(U.clamp(1 + Math.floor(tier / 2) + U.int(-1, 0), 1, 3)), g = aniGenre(s), lvl = U.clamp(Math.floor(tier / 2) + U.int(0, 1), 0, 3);
  return { kind, co: x.n, coTier: x.tier, g, lvl, title: animeTitle(g), fee: Math.round(ADIR_KIND[kind].fee * (0.6 + tier * 0.15) * (0.8 + x.tier * 0.15) * U.fl(0.9, 1.1)) * 1e4 };
}
function adirTake(s, t, o) {
  earn(s, Math.round(o.fee / 2), '애니 연출료');
  const r = researchDo(s, o.g);
  t.pj = Object.assign({ start: s.t, end: s.t + ADIR_KIND[o.kind].m, work: 0, rs: r.rs }, o);
  coMeetJob(s, 'adir');
  return `${o.co}의 ${ADIR_KIND[o.kind].n} 「${o.title}」 감독을 맡았다. (연출료 절반 ${fmtWon(Math.round(o.fee / 2))}을 먼저 받았다) ${o.g} 사전 조사: ${r.w}.`;
}
E({
  id: 'adir_offer', cat: '제안', title: '감독 제안', tag: 'career',
  cond: s => trackOn(s, 'adir') && s.tracks.adir.mode === 'dir' && !s.tracks.adir.pj,
  init(s, d) { const t = s.tracks.adir; d.os = [0, 1].map(() => adirMakeOffer(s, t.tier)); },
  text: s => `애니 제작사들이 감독을 찾는다. 하나를 맡을 수 있다.\n\n'${ADIR_TIERS[s.tracks.adir.tier]}' · 연출 ${lvi(me(s), 'direct')} · 그림 ${lvi(me(s), 'art')}`,
  ch: (s, d) => d.os.map(o => ({ t: `${o.co} · ${ADIR_KIND[o.kind].n} 「${o.title}」`, tr: o.g === (s.trendTV || {}).anime, h: `${o.g} · 장르 숙련도 ${gauge(aniMGet(s, 'adm', o.g))} · 제작비 ${['적다', '보통', '넉넉하다', '아주 넉넉하다'][o.lvl]} · 연출료 ${fmtWon(o.fee)} · ${ADIR_KIND[o.kind].m}개월`, f: s => adirTake(s, s.tracks.adir, o) }))
    .concat([{ t: '이번엔 넘긴다', f: () => '들어온 제안을 모두 거절했다.' }]),
});
// 작품 완성: 실력 + 장르 숙련도 + 제작비 + 제작사 크기 + 유행 + 얼마나 붙어 있었나(일정에 넣은 달)
function adirDone(s, t) {
  const pj = t.pj, K = ADIR_KIND[pj.kind], total = Math.max(1, pj.end - pj.start), eff = pj.work / total;
  const sc = adirScore(s, pj.g) + researchB(pj.rs) + pj.lvl * 2.5 + pj.coTier * 2 + (pj.g === (s.trendTV || {}).anime ? 4 : 0) + (eff - 0.7) * 15 + ADIR_POW[t.tier] + U.normal(0, 7);
  t.pj = null;
  const res = sc >= 62 ? 3 : sc >= 52 ? 2 : sc >= 42 ? 1 : 0;
  aniMGain(s, 'adm', pj.g, 5);
  if (pj.kind === 'short') t.shorts++; else { t.works++; earn(s, pj.fee - Math.round(pj.fee / 2), '애니 연출료'); }
  t.pts += [0, 0.5, 1, 1.5][res] * K.win;
  const gain = res ? Math.max(0, fanGain(s, 44 + res * 8, 'kr', K.fame)) : 0;
  const fxt = fx(s, { fkr: gain, jp: { adir: [-4, 0, 2, 5][res] }, fame: res === 3 ? 2 : 0, stress: res ? -2 : 5 });
  const up = adirTierUp(s, t);
  const word = pj.kind === 'short' ? ['아무도 주목하지 않았다', '작은 영화제 상영작에 올랐다', '애니 영화제에서 상을 받았다', '애니 영화제 대상을 받으며 화제가 됐다'][res]
    : ['반응이 차가웠다. 연출이 아쉽다는 말이 많았다', '무난한 반응이었다', '좋은 반응을 얻었다. 연출이 좋다는 말이 돌았다', '크게 흥행했다. 감독 이름이 함께 오르내렸다'][res];
  addWork(s, { type: '애니 연출', title: pj.title, pay: pj.kind === 'short' ? 0 : pj.fee, by: pj.co || '단편', sc: Math.round(U.clamp(sc + 10, 5, 99)), note: `${K.n} · ${pj.g} · ${['아쉬움', '무난', '호평', '흥행'][res]}` });
  if (t.works === 1 && pj.kind !== 'short') milestone(s, `${age(s)}세에 첫 연출작 「${pj.title}」을 내놓았다.`);
  // 단편이 상을 받으면 제작사에서 데뷔 제안이 온다
  if (pj.kind === 'short' && res >= 2 && t.mode === 'indie' && !hasQ(s, 'adir_debut')) queueEv(s, 'adir_debut', 1, {});
  const x = `${K.n} 「${pj.title}」이 공개됐다. ${word}.` + fxt;
  const plio = typeof plioSpec === 'function' ? plioSpec({ k: 'animk', t: `「${pj.title}」 ${pj.kind === 'short' ? '단편 애니' : '본편 클립'}`, ch: pj.co || `${me(s).name} 감독`, me: `${me(s).name} 감독`, sc: U.clamp(sc + 12, 5, 99), rv: [-1, 0, 1, 2][res], mul: pj.kind === 'short' ? 0.3 : 1 }) : null;
  return showResult(s, `「${pj.title}」`, x + (up ? `\n\n${up}` : ''), x + (up ? ` ${up}` : ''), null, null, plio);
}

// ════════ 성우 ════════
// 연기 특기와 목소리 재능을 본다. 방송사 전속 성우 공채로 들어가거나(2년 전속, 월급) 프리랜서로 시작한다
// 일: 애니 배역, 게임 캐릭터, 외화 더빙, 광고·다큐 내레이션
const VO_TIERS = ['신인 성우', '단역 성우', '조연 성우', '주연 성우', '인기 성우', '스타 성우', '레전드 성우'];
const VO_POW = [0, 0.5, 1, 2, 3, 3.5, 4];
// (2026-11-08 성우만 한 인생 200명: 레전드 4.0%)
const VO_UP = { pts: [0, 3, 8, 18, 34, 54, 70], fans: [0, 0, 0, 0, 1e4, 6e4, 1e5], tal: 'star', min: 49 };
// 일은 난이도로만 나눈다 (애니는 단역 < 조연 < 주연). fit: TV 애니는 끈기, 극장판 애니는 스타성을 더 본다 (v97, 8-4 사용자 · fitB)
const VO_JOBS = [
  { id: 'extra', n: '애니 단역', min: 0, fee: 15, fame: 0.05, demand: 28, by: 'ani', fit: ['grit'] },
  { id: 'narr', n: '광고 내레이션', min: 0, fee: 50, fame: 0.05, demand: 30, by: 'ad' },
  { id: 'dub', n: '외화 더빙', min: 1, fee: 60, fame: 0.1, demand: 34, by: 'bc' },
  { id: 'game', n: '게임 캐릭터 목소리', min: 1, fee: 120, fame: 0.3, demand: 38, by: 'game' },
  { id: 'sup', n: '애니 조연', min: 2, fee: 150, fame: 0.3, demand: 42, by: 'ani', fit: ['grit'] },
  { id: 'docu', n: '다큐멘터리 내레이션', min: 3, fee: 200, fame: 0.3, demand: 46, by: 'bc' },
  { id: 'lead', n: '애니 주연', min: 3, fee: 500, fame: 0.8, demand: 50, by: 'ani', fit: ['grit'] },
  { id: 'movie', n: '극장판 애니 주연', min: 5, fee: 1500, fame: 1.2, demand: 56, by: 'ani', fit: ['star'] },
];
const VO_SAL = [0, 180, 210, 250], VO_THR = [0, 32, 40, 48];
// v95: 연기 · 목소리(모두 강함). 외모는 보지 않는다
function voScore(s) { const p = me(s); return jobMix([[lv(p, 'acting'), JS_], [p.tal.voice, JS_]]); }
function voStart(s, o = {}) {
  const old = s.tracks.voice;
  s.tracks.voice = Object.assign({ st: 'active', mode: 'free', months: 0, tier: old.tier || 0, pts: old.pts || 0, jobs: old.jobs || 0, sn: old.sn, hist: old.hist || [] }, o);
  if (!old.jobs && !(old.hist || []).length) milestone(s, `${age(s)}세에 성우 일을 시작했다.`);
  return s.tracks.voice;
}
function voTierUp(s, t) { return aniTierUp(s, t, VO_UP, VO_TIERS); }
CAREERS.voice = {
  n: '성우', ic: '🗣️',
  desc: '목소리로 연기한다. 애니 배역, 게임 캐릭터, 외화 더빙, 광고·다큐 내레이션을 맡는다. 방송사 전속 성우 공채로 들어가거나 프리랜서로 시작한다. 연기 특기와 목소리 재능이 중요하다.',
  act: { n: '녹음 · 발성 연습', ic: '🗣️', g: '직업 활동', eff: [['연기', '↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) { return t.st !== 'active' ? (t.endNote || '') : `${VO_TIERS[t.tier]} · ${t.mode === 'bc' ? `${t.bc} 전속` : '프리랜서'} · 맡은 일 ${t.jobs}건`; },
  short(s, t) { return '성우'; },
  seg(s, t) { return t.mode === 'bc' ? `${t.bc} 전속 성우` : '프리랜서 성우'; },
  title(s, t) { return t.jobs ? VO_TIERS[t.tier] : null; },
  contract(s, t) { return t.st === 'active' && t.mode === 'bc' ? `${t.bc} (전속 성우)` : ''; },
  emp: true,
  cLeft(s, t) { return t.st === 'active' && t.mode === 'bc' ? t.bcEnd - t.months : null; },
  mainSk() { return 'acting'; },
  info(s, t) { return [['소속', t.mode === 'bc' ? `${t.bc} 전속 성우 (${TIER_N[t.bcTier]} 방송사) · 월급 ${fmtWon(t.sal)}` : '프리랜서'], ['등급', VO_TIERS[t.tier]], ['맡은 일', `${t.jobs}건`]]; },
  actions(s, t) {
    if (t.st !== 'active' || t.mode === 'bc') return [];
    return [{ t: '성우 일 그만두기', ok: true, danger: true, confirm: '정말 성우 일을 그만둘까요?', run: s => { t.st = 'ended'; t.endNote = `${VO_TIERS[t.tier]}, 맡은 일 ${t.jobs}건`; t.hist.push(t.endNote); return '성우 일을 그만뒀다.'; } }];
  },
  monthly(s, t) {
    if (t.st !== 'active') return;
    t.months++;
    const n = slotsOn(s, 'c_voice'), p = me(s), bc = t.mode === 'bc';
    if (bc) { earn(s, t.sal, '월급', 'voice'); if (t.months >= t.bcEnd) queueEv(s, 'vo_bc_end', 0); }
    if (n) { practice(s, p, 'acting', 0.8 * n); addStress(s, 1.5); }
    if (!n && !bc) return;
    // 전속 성우는 방송사가 일을 잡아 주어 일정에 넣지 않아도 가끔 일이 들어온다
    const chance = stigmaMul(s) * (0.28 + VO_POW[t.tier] * 0.04 + (bc ? 0.12 : 0)) * (n ? 1 : 0.4) * (0.7 + access(s) * 0.3);
    if (!hasQ(s, 'vo_job') && U.chance(chance)) queueEv(s, 'vo_job', 0);
  },
};
function voAudP(s, x) { return audP(voScore(s) + pm(s, 'audition', 0) + VO_POW[(s.tracks.voice || {}).tier || 0] * 2, VO_THR[x.tier]); }
for (const x of VO_BCS) JOB_APPLY.push({
  id: 'voice_bc_' + VO_BCS.indexOf(x), trk: 'voice', g: '🗣️ 성우', get n() { return `${x.n} 전속 성우 공채`; }, tag: coTagOf(x),
  show: s => !(trackOn(s, 'voice') && s.tracks.voice.mode === 'bc') && age(s) >= 18 && age(s) <= 35,
  h: s => lv(me(s), 'acting') >= 25 ? `합격 가능성 ${fmtPct(voAudP(s, x))} · 결과는 다음 달 · 붙으면 2년 동안 그 방송사 전속 성우로 월급을 받는다` : '연기가 25레벨 이상이어야 지원할 수 있다',
  ok: s => !s.army && !agencyContract(s) && lv(me(s), 'acting') >= 25 && !hasQ(s, 'vo_exam') && !(s.cd['vo_' + x.n] > s.t),
  why: s => s.army ? '군 복무 중' : agencyContract(s) ? contractWhy(s) : lv(me(s), 'acting') < 25 ? '연기를 더 배워야 한다' : hasQ(s, 'vo_exam') ? '결과를 기다리는 중' : '같은 방송사는 1년 뒤에 다시 볼 수 있다',
  run: s => { s.cd['vo_' + x.n] = s.t + 12; queueEv(s, 'vo_exam', 1, { bc: x.n, p: voAudP(s, x) }); return `${x.n} 전속 성우 공채 시험을 봤다.`; },
});
JOB_APPLY.push({
  id: 'voice_free', trk: 'voice', g: '🗣️ 성우', n: '프리랜서 성우로 시작하기',
  show: s => !trackOn(s, 'voice'),
  h: s => '애니 단역과 광고 내레이션부터 시작한다 · 일정에 녹음 · 발성 연습을 넣어야 일이 들어온다',
  ok: s => !s.army && age(s) >= 18 && lv(me(s), 'acting') >= 30,
  why: s => s.army ? '군 복무 중' : age(s) < 18 ? '18세부터 할 수 있다' : '연기가 30레벨 이상이어야 한다',
  run: s => { voStart(s); return '프리랜서 성우로 일을 시작했다. 일정에 녹음 · 발성 연습을 넣어야 일이 들어온다.'; },
});
E({
  id: 'vo_exam', cat: '공채 시험', title: '성우 공채 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); d.gi = U.int(20, 45); },
  text: (s, d) => d.pass ? `${d.bc} ${d.gi}기 전속 성우 공채에 합격했다! 2년 동안 ${d.bc} 전속 성우로 일한다.` : `${d.bc} 전속 성우 공채에 떨어졌다.`,
  ch: (s, d) => d.pass ? [
    { t: '전속 계약을 한다', nj: 'voice', nm: ['emp', 'bcvoice'], ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '', f: s => { const x = VO_BCS.find(b => b.n === d.bc), t = voStart(s, { mode: 'bc', bc: d.bc, bcTier: x.tier, gi: d.gi, sal: VO_SAL[x.tier] * 1e4, bcEnd: (trackOn(s, 'voice') ? s.tracks.voice.months : 0) + 24 }); t.bcEnd = t.months + 24; milestone(s, `${age(s)}세에 ${d.bc} ${d.gi}기 전속 성우가 되었다.`); coMeetJob(s, 'voice'); return `${d.bc} ${d.gi}기 전속 성우가 되었다. 월급 ${fmtWon(t.sal)} · 2년.`; } },
    { t: '거절한다', f: () => '전속 성우 자리를 거절했다.' },
  ] : [{ t: '다시 준비한다', f: s => `${d.bc} 성우 공채에 떨어졌다.` + fx(s, { stress: 3 * pm(s, 'loseStress') }) }],
});
E({
  id: 'vo_bc_end', cat: '계약', title: '전속 기간 끝', tag: 'career',
  cond: s => trackOn(s, 'voice') && s.tracks.voice.mode === 'bc',
  text: s => `${s.tracks.voice.bc} 전속 성우 2년이 끝났다. 이제부터는 프리랜서로 일한다.`,
  ch: () => [{ t: '확인', f: s => { const t = s.tracks.voice; t.hist.push(`${t.bc} ${t.gi}기 전속 성우`); t.mode = 'free'; t.sal = 0; t.bc = ''; return '전속 기간이 끝나 프리랜서 성우가 되었다.'; } }],
});
function voClient(s, j) { return j.by === 'ad' ? U.pick(BRANDS).n : j.by === 'game' ? U.pick(BRANDS.filter(b => b.cat === '게임')).n : j.by === 'bc' ? (s.tracks.voice.mode === 'bc' ? s.tracks.voice.bc : U.pick(VO_BCS).n) : U.pick(ANIME_COS).n; }
function voJobP(s, j) { const t = s.tracks.voice; return U.clamp(U.sig((voScore(s) + fitB(me(s), j.fit) + VO_POW[t.tier] * 3 - j.demand) / 6), 0.05, 0.95); }
E({
  id: 'vo_job', cat: '성우 일감', title: '녹음 제안', tag: 'career',
  cond: s => trackOn(s, 'voice'),
  init(s, d) {
    const t = s.tracks.voice, can = VO_JOBS.filter(j => j.min <= t.tier), bc = t.mode === 'bc';
    d.js = U.shuffle(can).slice(0, Math.min(3, can.length)).map(j => ({ id: j.id, n: j.n, min: j.min, fame: j.fame, who: voClient(s, j), title: j.by === 'ani' ? animeTitle(aniGenre(s)) : '', fee: Math.round(j.fee * (1 + VO_POW[t.tier] * 0.6) * (bc ? 0.5 : 1) * U.fl(0.8, 1.2)) * 1e4, p: voJobP(s, j) }));
  },
  text: s => `녹음 일이 들어왔다. 하나를 맡을 수 있다.\n\n'${VO_TIERS[s.tracks.voice.tier]}' · 연기 ${lvi(me(s), 'acting')}레벨${s.tracks.voice.mode === 'bc' ? ' · 전속 기간이라 출연료는 절반이다' : ''}`,
  ch: (s, d) => d.js.map(j => ({ t: `${j.who}${j.title ? ` 「${j.title}」` : ''} · ${j.n}`, h: `${fmtWon(j.fee)} · 잘 나올 가능성 ${fmtPct(j.p)}`, f: s => voDoJob(s, j) }))
    .concat([{ t: '이번엔 넘긴다', f: () => '들어온 일을 모두 거절했다.' }]),
});
function voDoJob(s, j) {
  const t = s.tracks.voice, p = me(s), good = U.chance(j.p), big = bigRoll(good, j.p);
  earn(s, j.fee, '성우 출연료'); t.jobs++; useSkill(s, p, 'acting', 1.5);
  const gain = big < 0 ? -Math.round(s.fans.kr * 0.01) : 2 * Math.max(0, fanGain(s, good ? 54 + VO_POW[t.tier] * 3 : 40, 'kr', j.fame)) * (big > 0 ? 3 : 1);
  const fxt = fx(s, { fkr: gain, jp: { voice: big > 0 ? 4 : big < 0 ? -3 : good ? 1 : 0 }, fame: big > 0 ? 2 : 0, stress: big < 0 ? 5 : 2 });
  if (good && j.min >= Math.min(4, t.tier) - 1) t.pts += (j.fame >= 0.6 ? 2 : 1) + (big > 0 ? 1 : 0);
  const up = voTierUp(s, t), nm = `${j.who}${j.title ? ` 「${j.title}」` : ''} ${j.n}`;
  addWork(s, { type: '성우', pay: j.fee, title: nm, by: VO_TIERS[t.tier], sc: big > 0 ? 85 : good ? 70 : big < 0 ? 30 : 45, note: big > 0 ? '화제가 됐다' : good ? '반응이 좋았다' : big < 0 ? '혹평' : '무난' });
  const how = big > 0 ? '"목소리가 캐릭터 그 자체"라는 말이 퍼졌다.' : good ? '목소리 연기가 잘 맞는다는 말을 들었다.' : big < 0 ? '캐릭터와 목소리가 안 맞는다는 혹평이 돌았다.' : '무난하게 녹음을 마쳤다.';
  const x = `${josa(nm, '을를')} 녹음했다. ${how}` + fxt;
  // 실시간 창 (12-3): 녹음 부스. '중요할 때만'에서는 첫 녹음 · 첫 애니 주연 · 극장판 주연 · 화제나 혹평 · 등급이 오른 녹음만
  let live = null;
  if (typeof liveStage === 'function') {
    const ani = ['extra', 'sup', 'lead', 'movie'].includes(j.id), kind = ani ? 'ani' : j.id === 'game' ? 'game' : j.id === 'dub' ? 'dub' : 'narr', me0 = actName(s, 'voice');
    const firstLead = j.id === 'lead' && !t.leads; if (j.id === 'lead') t.leads = (t.leads || 0) + 1;
    live = liveStage({ k: 'booth', vn: 'booth', place: '녹음 부스', t: `${j.title || j.who} · ${j.n}`, g: me0, mem: [[me0, '']].concat(ani && j.id !== 'extra' ? [['동료 성우', ''], ['동료 성우', '']] : []), mi: 0,
      key: t.jobs === 1 || firstLead || j.id === 'movie' || big !== 0 || !!up, big, sc: big > 0 ? 88 : good ? 72 : big < 0 ? 28 : 48, z: { voice: (p.tal.voice - 50) / 15 }, x: { kind, title: j.title || j.who } });
  }
  // 애니가 방영된 뒤 반응은 플리오 팝업에서 (애니 배역만)
  const plio = typeof plioSpec === 'function' && ['extra', 'sup', 'lead', 'movie'].includes(j.id) ? plioSpec({ k: 'anime', t: `「${j.title}」 ${j.id === 'movie' ? '극장판 예고편' : '본편 클립'}`, ch: j.who, me: j.id === 'extra' ? '' : actName(s, 'voice'), sc: big > 0 ? 88 : good ? 72 : big < 0 ? 28 : 48, rv: big > 0 ? 2 : good ? 1 : big < 0 ? -2 : 0, mul: j.id === 'movie' ? 3 : j.id === 'extra' ? 0.4 : 1 }) : null;
  return showResult(s, nm, x + (up ? `\n\n${up}` : ''), x + (up ? ` ${up}` : ''), live, null, plio);
}
