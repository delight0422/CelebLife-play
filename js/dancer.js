'use strict';
// ════════ 댄서 (피드백 29) ════════
// 가수 무대 · 뮤직비디오 · 콘서트에서 백댄서로 춤추고, 곡에 맞는 안무를 만든다. 이름이 알려지면 가끔 예능에도 나간다
// 프리랜서로 시작하거나 안무 팀(AGENCIES kind 'dance')의 입단 오디션을 본다. 일을 잘하면 안무 팀에서 먼저 연락이 온다
// 백댄서는 댄스 특기, 안무 창작은 댄스 특기와 창의력 · 예술 감각, 그 컨셉의 안무 숙련도를 본다 (v94)
const DANCER_TIERS = ['신인 댄서', '현역 댄서', '실력파 댄서', '메인 댄서', '이름난 댄서', '스타 댄서', '레전드 댄서'];
// 등급마다 일의 크기 (보수 · 일감 확률 · 잘 나올 가능성에 곱한다)
const DANCER_POW = [0, 0.5, 1, 2, 3, 3.5, 4];
// 등급 문턱: pts 잘 해낸 일 점수, fans 필요한 팬, star 레전드가 되는 스타성 (2026-11-08 댄서만 한 인생 240명: 레전드 3.8%)
const DANCER_UP = { pts: [0, 4, 10, 20, 38, 60, 84], fans: [0, 0, 0, 0, 1e4, 8e4, 1.5e5], star: 50 };
// 일감: kind back 백댄서(특별 무대도 댄스 점수) · cho 안무 창작. min 맡을 수 있는 등급, fee 만 원, fame 이름이 알려지는 정도, demand 난이도
// fit: 그 일에서 더 보는 것 (v97, 8-4 사용자 표 · fitB). 백댄서는 스타성이 낮을수록(메인 무대의 관심을 가져오면 안 된다), 특별 무대(댄서가 주인공)는 높을수록 좋다
const DANCER_JOBS = [
  { id: 'mb', n: '음악방송 백댄서', kind: 'back', min: 0, fee: 25, fame: 0.1, demand: 30, fit: ['-star'] },
  { id: 'mv', n: '뮤직비디오 백댄서', kind: 'back', min: 0, fee: 40, fame: 0.15, demand: 33, fit: ['-star'] },
  { id: 'tour', n: '콘서트 투어 백댄서', kind: 'back', min: 2, fee: 250, fame: 0.3, demand: 42, fit: ['-star'] },
  { id: 'award', n: '시상식 특별 무대', kind: 'back', min: 3, fee: 300, fame: 0.7, demand: 50, fit: ['star'] },
  { id: 'side', n: '수록곡 안무 창작', kind: 'cho', min: 1, fee: 150, fame: 0.3, demand: 40, fit: ['creative'] },
  { id: 'title', n: '타이틀곡 안무 창작', kind: 'cho', min: 3, fee: 600, fame: 0.8, demand: 52, fit: ['creative'] },
];
function dancerCrews() { return AGENCIES.filter(a => a.kind === 'dance'); }
// 백댄서는 20대가 가장 좋고 서른다섯이 넘으면 일이 준다. 안무 창작은 나이를 덜 탄다
function dancerAgeAdj(a) { return a < 18 ? 0 : a < 30 ? 3 : a < 35 ? 0 : a < 40 ? -4 : -9; }
function dancerScore(s, kind, c) {
  const p = me(s), t = p.tal;
  // v94: 안무 창작은 댄스 · 창의력 · 예술 감각(모두 강함)과 컨셉 숙련도, 백댄서는 댄스만 (처음 댄서의 점수 크기가 예전과 비슷하게 0.8배 + 10)
  return kind === 'cho' ? jobMix([[lv(p, 'dance'), JS_], [t.creative, JS_], [t.aesth, JS_]]) + (c ? chBonus(s, c) * 0.6 : 0)
    : lv(p, 'dance') * 0.8 + 10;
}
function dancerBlock(s) { return s.army ? '군 복무 중' : s.tracks.idol.st === 'trainee' ? '연습생은 회사 허락 없이 따로 활동할 수 없다' : ''; }

// ───── 안무 컨셉 숙련도 ─────
// 곡 컨셉(TRENDS)마다 따로다. 그 컨셉 안무를 만들수록 오르고, 창의력이 높으면 빨리 오른다 (곡 컨셉 숙련도와 같은 방식)
function chGet(s, c) { return (s.chm && s.chm[c]) || 0; }
function chGain(s, c, amt) { if (!c) return; s.chm = s.chm || {}; const m = chGet(s, c); s.chm[c] = Math.min(100, m + amt * (1 - m / 100) * (0.6 + me(s).tal.creative / 100)); }
function chBonus(s, c) { return (chGet(s, c) - 20) / 8; }
function chBars(s) { return TRENDS.filter(c => chGet(s, c) >= 1 || c === s.trend).sort((a, b) => chGet(s, b) - chGet(s, a)).map(c => ({ n: c, v: chGet(s, c), tag: c === s.trend ? '유행' : '' })); }

// 안무가 (v140): 서른다섯이 넘은 메인 댄서 이상은 안무 팀에 '안무가'로 남는다 (t.lead). 무대보다 안무를 만드는 자리라 나이 때문에 재계약이 막히지 않는다
// 그 아래 등급은 서른다섯 뒤로 팀 제안이 오지 않는다 (예전엔 '입단 → 2년 뒤 재계약 불발 → 또 다른 팀 제안'이 되풀이됐다)
const DC_LEAD = { age: 35, tier: 3 };
function dcLeadOK(s, t) { return age(s) >= DC_LEAD.age && t.tier >= DC_LEAD.tier; }
function dcStart(s, o = {}) {
  const old = s.tracks.dancer, ag = o.crew ? AG[o.crew] : null;
  const t = s.tracks.dancer = { st: 'active', crew: o.crew || null, crewN: ag ? ag.n : '', cut: o.cut != null ? o.cut : ag ? ag.cut : 0, contract: ag ? (o.months || 24) : 0, months: 0, tier: old.tier || 0, pts: old.pts || 0, jobs: old.jobs || 0, back: old.back || 0, cho: old.cho || 0, sn: old.sn, hist: old.hist || [] };
  if (!old.jobs && !(old.hist || []).length) milestone(s, `${age(s)}세에 댄서 일을 시작했다.`);
  if (ag) { coMeetJob(s, 'dancer'); t.lead = dcLeadOK(s, t); return `${ag.n}에 ${t.lead ? '안무가로 ' : ''}들어갔다. (계약 ${yrs(t.contract)} · 팀 몫 ${pctN(t.cut)})`; }
  return '프리랜서 댄서로 일을 시작했다. 일정에 댄스 활동을 넣어야 일이 들어온다.';
}
function dcLeave(t) { t.crew = null; t.crewN = ''; t.cut = 0; t.contract = 0; t.lead = false; }
CAREERS.dancer = {
  n: '댄서', ic: '🕺',
  desc: '가수 무대와 뮤직비디오에서 백댄서로 춤추고, 곡에 맞는 안무를 만든다. 댄스 특기가 가장 중요하고, 안무를 만들 때는 창의력과 예술 감각도 본다. 이름이 알려지면 예능에도 나간다.',
  act: { n: '댄스 활동 (연습·리허설)', ic: '🕺', g: '직업 활동', eff: [['댄스', '↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) { return t.st !== 'active' ? (t.endNote || '') : `${DANCER_TIERS[t.tier]} · ${t.crew ? t.crewN + (t.lead ? ' 안무가' : ' 소속') : '프리랜서'} · 백댄서 ${t.back}번 · 안무 ${t.cho}곡`; },
  short(s, t) { return '댄서'; },
  seg(s, t) { return t.crew && t.lead ? `${t.crewN} 안무가` : `${t.crew ? t.crewN + ' 소속' : '프리랜서'} 댄서`; },
  title(s, t) { return t.jobs ? DANCER_TIERS[t.tier] : null; },
  contract(s, t) { return t.st === 'active' && t.crew ? t.crewN : ''; },
  cLeft(s, t) { return t.st === 'active' && t.crew ? t.contract - t.months : null; },
  mainSk() { return 'dance'; },
  info(s, t) {
    return [['소속', t.crew ? `${t.crewN} (${TIER_N[AG[t.crew].tier]} 안무 팀)${t.lead ? ' 안무가' : ''} · 팀 몫 ${pctN(t.cut)}` : '프리랜서'], ['등급', DANCER_TIERS[t.tier]], ['한 일', `백댄서 ${t.back}번 · 안무 ${t.cho}곡`],
      { h: '안무 컨셉 숙련도', bars: chBars(s) }];
  },
  actions(s, t) {
    if (t.st !== 'active') return [];
    if (t.crew) {
      const left = Math.max(0, t.contract - t.months), pen = Math.max(300e4, left * 20e4 * AG[t.crew].tier);
      return [{ t: '안무 팀 계약 해지', h: `계약이 ${left}개월 남았다 · 위약금 ${fmtWon(pen)} · 해지하면 프리랜서로 일한다`, ok: true, danger: true, confirm: `${josa(t.crewN, '과와')}의 계약을 해지할까요? 위약금 ${fmtWon(pen)}을 물어야 해요.`, run: s => { s.debt += pen; t.hist.push(`${t.crewN} (계약 해지)`); dcLeave(t); return '안무 팀과의 계약을 해지했다. 이제 프리랜서로 일한다.'; } }];
    }
    return [{ t: '댄서 일 그만두기', ok: true, danger: true, confirm: '정말 댄서 일을 그만둘까요?', run: s => { t.st = 'ended'; t.endNote = `${DANCER_TIERS[t.tier]}, 백댄서 ${t.back}번 · 안무 ${t.cho}곡`; t.hist.push(t.endNote); return '댄서 일을 그만뒀다.'; } }];
  },
  monthly(s, t) {
    if (t.st !== 'active') return;
    t.months++;
    if (t.crew && t.months >= t.contract) queueEv(s, 'dc_contract', 0);
    const n = slotsOn(s, 'c_dancer'), p = me(s);
    if (n) { practice(s, p, 'dance', 0.8 * n); addStress(s, 1.5); }
    if (!n && !t.crew) return;
    // 안무 팀에 있으면 일정에 넣지 않아도 팀이 가끔 일을 잡아 준다
    const chance = stigmaMul(s) * (0.3 + DANCER_POW[t.tier] * 0.04 + (t.crew ? 0.1 : 0)) * (n ? 1 : 0.4) * (t.lead ? 1 : Math.max(0.3, 1 + dancerAgeAdj(age(s)) / 15)) * access(s);
    if (!hasQ(s, 'dc_job') && U.chance(chance)) queueEv(s, 'dc_job', 0);
    // 이름이 알려지면 가끔 예능 섭외가 온다
    if (n && t.tier >= 2 && !s.army && !hasQ(s, 'dc_var') && U.chance(0.004 + t.tier * 0.004)) queueEv(s, 'dc_var', 0);
    // 프리랜서로 일을 잘하면 안무 팀에서 같이 하자는 연락이 온다
    if (n && !t.crew && t.jobs >= 3 && (age(s) < DC_LEAD.age || dcLeadOK(s, t)) && !agencyContract(s) && !s.inbox.some(m => m.kind === 'dc_offer') && U.chance(0.02 + t.tier * 0.006)) dcOffer(s);
  },
};

// ───── 지원 · 입단 ─────
function dcAudP(s, ag) { const t = s.tracks.dancer; return audP(dancerScore(s, 'back') + dancerAgeAdj(age(s)) + pm(s, 'audition', 0) + (trackOn(s, 'dancer') ? DANCER_POW[t.tier] * 2 : 0), ag.thr); }
for (const ag of dancerCrews()) JOB_APPLY.push({
  id: 'dancer_' + ag.id, trk: 'dancer', g: '🕺 댄서', get n() { return `${ag.n} 입단 오디션`; }, tag: agTag(ag),
  show: s => !(trackOn(s, 'dancer') && s.tracks.dancer.crew) && age(s) >= 15 && age(s) <= 35,
  h: s => `합격 가능성 ${fmtPct(dcAudP(s, ag))} · 결과는 다음 달`,
  ok: s => !dancerBlock(s) && !agencyContract(s) && !(s.cd['daud_' + ag.id] > s.t) && !hasQ(s, 'dc_aud'),
  why: s => dancerBlock(s) || contractWhy(s) || (s.cd['daud_' + ag.id] > s.t ? '같은 팀은 1년 뒤에 다시 볼 수 있다' : '다른 오디션 결과를 기다리는 중'),
  run: s => { s.cd['daud_' + ag.id] = s.t + 12; queueEv(s, 'dc_aud', 1, { ag: ag.id, p: dcAudP(s, ag) }); return `${ag.n} 입단 오디션을 봤다.`; },
});
JOB_APPLY.push({
  id: 'dancer_free', trk: 'dancer', g: '🕺 댄서', n: '프리랜서 댄서로 시작하기',
  show: s => !trackOn(s, 'dancer'),
  h: s => '음악방송·뮤직비디오 백댄서부터 시작한다 · 일정에 댄스 활동을 넣어야 일이 들어온다',
  ok: s => !dancerBlock(s) && !artistContract(s) && age(s) >= 15 && lv(me(s), 'dance') >= 25,
  why: s => dancerBlock(s) || artistContractWhy(s) || (age(s) < 15 ? '15세부터 할 수 있다' : '댄스가 25레벨 이상이어야 한다'),
  run: s => dcStart(s, {}),
});
NEGO.dancer = {
  what: d => '안무 팀 전속 계약이다. 팀이 무대와 안무 일을 잡아 주고, 보수의 일부를 팀 몫으로 가져간다.',
  block: s => agencyContract(s) ? contractWhy(s) : '',
  sign: (s, d) => dcStart(s, { crew: d.ag, months: d.months, cut: d.cut }),
  refuse: (s, d) => `${d.agN}의 계약 제안을 거절했다.`,
};
function dcNego(s, ag, lev) { return startNego(s, { kind: 'dancer', ag: ag.id, agN: ag.n, months: 24, cut: ag.cut, lev }); }
E({
  id: 'dc_aud', cat: '오디션', title: '입단 오디션 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); },
  text: (s, d) => d.pass ? `${AG[d.ag].n}에서 같이 하자는 연락이 왔다!` : `${AG[d.ag].n}에서 연락이 오지 않았다. 불합격이다.`,
  ch: (s, d) => d.pass ? [
    { t: '계약서를 받아 본다', ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '팀 몫과 계약 기간을 협상할 수 있다', f: s => dcNego(s, AG[d.ag], U.clamp((d.p - 0.5) * 0.8 + 0.3, 0.05, 0.8)) },
    { t: '거절한다', f: () => `${AG[d.ag].n}의 입단 제안을 거절했다.` },
  ] : [{ t: '다시 준비한다', f: s => `${AG[d.ag].n} 입단 오디션에 떨어졌다.` + fx(s, { stress: 3 * pm(s, 'loseStress') }) }],
});
// 안무 팀이 먼저 보내는 제안: 등급이 높을수록 큰 팀에서 온다
function dcOffer(s) {
  const t = s.tracks.dancer, top = Math.min(3, 1 + Math.floor(t.tier / 2));
  const L = dancerCrews().filter(a => a.tier <= top && a.tier >= top - 1);
  const ag = U.pick(L.length ? L : dancerCrews());
  sendMsg(s, 'dc_offer', { from: ag.n, title: '팀 합류 제안', months: 4, d: { ag: ag.id } });
}
INBOX.dc_offer = {
  ic: '🕺',
  text: (s, m) => { const ag = AG[m.d.ag]; return `${ag.n}(${agTag(ag)} 안무 팀)에서 ${trackOn(s, 'dancer') && dcLeadOK(s, s.tracks.dancer) ? '안무가로 와 달라는' : '같이 하자는'} 연락이 왔다. 팀에 들어가면 팀이 무대와 안무 일을 잡아 주지만, 보수의 ${pctN(ag.cut)}는 팀 몫이다.`; },
  ch: (s, m) => [
    { t: '계약서를 받아 본다', ok: s => trackOn(s, 'dancer') && !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '', f: s => dcNego(s, AG[m.d.ag], 0.5) },
    { t: '거절한다', f: () => `${AG[m.d.ag].n}의 제안을 거절했다.` },
  ],
};
E({
  id: 'dc_contract', cat: '계약', title: '안무 팀 계약 만료', tag: 'career',
  cond: s => trackOn(s, 'dancer') && !!s.tracks.dancer.crew,
  text: s => { const t = s.tracks.dancer; return `${josa(t.crewN, '과와')}의 계약이 끝났다. ${DANCER_TIERS[t.tier]}, 백댄서 ${t.back}번 · 안무 ${t.cho}곡.${dcLeadOK(s, t) ? ' 팀에서는 이제 무대보다 안무를 맡는 안무가로 남아 달라고 한다.' : age(s) >= 35 ? ' 나이가 있어서 팀도 재계약을 망설이는 눈치다.' : ''}`; },
  ch: s => {
    const t = s.tracks.dancer, lead = dcLeadOK(s, t), p = age(s) < 35 || lead ? 1 : Math.max(0.15, 1 - (age(s) - 34) * 0.12);
    return [
      { t: `${josa(t.crewN, '과와')} ${lead ? '안무가로 ' : ''}재계약`, h: `2년${p < 1 ? ` · 받아 줄 가능성 ${fmtPct(p)}` : ''}`, f: s => { if (!U.chance(p)) { t.hist.push(`${t.crewN} (재계약 불발)`); dcLeave(t); return '팀이 재계약을 거절했다. 이제 프리랜서로 일한다.' + fx(s, { stress: 5 }); } t.months = 0; t.contract = 24; t.lead = lead; return `${josa(t.crewN, '과와')} ${lead ? '안무가로 ' : ''}재계약했다.`; } },
      { t: '팀을 나와 프리랜서로 일한다', f: s => { t.hist.push(`${t.crewN} (계약 만료)`); dcLeave(t); return '안무 팀을 나와 프리랜서로 일하기로 했다.'; } },
    ];
  },
});

// ───── 일감 ─────
// 무대에 함께 서는 가수 (밴드는 백댄서를 잘 쓰지 않아서 뺀다)
function dcClient(s, t) { let a; for (let i = 0; i < 6; i++) { a = makeArtist(s, t.tier * 12); if (a.kind !== '밴드') break; } if (a.kind === '밴드') a.kind = '솔로 가수'; return a; }
function dcJobP(s, j, c) {
  const t = s.tracks.dancer, sc = dancerScore(s, j.kind, c) + fitB(me(s), j.fit) + (j.kind === 'back' ? dancerAgeAdj(age(s)) : age(s) >= 50 ? -3 : 0) + DANCER_POW[t.tier] * 3 + (c && c === s.trend ? 3 : 0);
  return U.clamp(U.sig((sc - j.demand) / 6), 0.05, 0.95);
}
// 일감 두세 개 중 하나를 맡는다. 등급이 오를수록 큰 일이 들어온다
E({
  id: 'dc_job', cat: '댄서 일감', title: '일 제안', tag: 'career',
  cond: s => trackOn(s, 'dancer'),
  init(s, d) {
    // 안무가는 안무 창작 일만 받는다
    const t = s.tracks.dancer, can = DANCER_JOBS.filter(j => j.min <= t.tier && (!t.lead || j.kind === 'cho'));
    d.js = U.shuffle(can).slice(0, Math.min(3, can.length)).map(j => {
      const a = dcClient(s, t), c = j.kind === 'cho' ? (U.chance(0.4) ? s.trend : U.pick(TRENDS)) : null;
      return { id: j.id, n: j.n, kind: j.kind, min: j.min, who: a.name, c, fee: Math.round(j.fee * (1 + DANCER_POW[t.tier] * 0.6) * U.fl(0.8, 1.2)) * 1e4, p: dcJobP(s, j, c), fame: j.fame };
    });
  },
  text: s => `일이 들어왔다. 하나를 맡을 수 있다.\n\n'${DANCER_TIERS[s.tracks.dancer.tier]}' · 댄스 ${lvi(me(s), 'dance')}레벨`,
  ch: (s, d) => d.js.map(j => ({ t: `${j.who} · ${j.n}`, tr: !!j.c && j.c === s.trend, h: `${fmtWon(Math.round(j.fee * (1 - s.tracks.dancer.cut)))} · ${j.c ? `컨셉 '${j.c}' · 안무 숙련도 ${gauge(chGet(s, j.c))} · ` : ''}잘 나올 가능성 ${fmtPct(j.p)}`, f: s => dcDoJob(s, j) }))
    .concat([{ t: '이번엔 넘긴다', f: () => '들어온 일을 모두 거절했다.' }]),
});
function dcTierUp(s, t) {
  const DU = DANCER_UP, k0 = t.tier;
  while (t.tier < 6 && t.pts >= DU.pts[t.tier + 1] && totalFans(s) >= DU.fans[t.tier + 1] && (t.tier < 5 || me(s).tal.star >= DU.star)) t.tier++;
  if (t.tier === k0) return '';
  if (t.tier >= 4) milestone(s, `${age(s)}세에 ${josa(DANCER_TIERS[t.tier], '이가')} 되었다.`);
  return `이제 사람들이 나를 '${DANCER_TIERS[t.tier]}'로 부른다.`;
}
function dcDoJob(s, j) {
  const t = s.tracks.dancer, p = me(s), good = U.chance(j.p), big = bigRoll(good, j.p), pay = Math.round(j.fee * (1 - t.cut)), cho = j.kind === 'cho';
  earn(s, pay, cho ? '안무 창작료' : '댄서 출연료'); t.jobs++;
  if (cho) { t.cho++; chGain(s, j.c, good ? 5 : 3); useSkill(s, p, 'dance', 2); } else { t.back++; practice(s, p, 'dance', 1); }
  const gain = big < 0 ? -Math.round(s.fans.kr * 0.02) : 2 * Math.max(0, fanGain(s, good ? 56 + DANCER_POW[t.tier] * 3 : 42, 'kr', j.fame)) * (big > 0 ? 3 : 1);
  const fxt = fx(s, { fkr: gain, jp: { dancer: big > 0 ? 4 : big < 0 ? -3 : good ? 1 : 0 }, fame: big > 0 ? 2 : 0, stress: big < 0 ? 5 : 2 });
  if (good && j.min >= Math.min(4, t.tier) - 1) t.pts += (j.fame >= 0.6 ? 2 : 1) + (big > 0 ? 1 : 0);
  const up = dcTierUp(s, t);
  addWork(s, { type: cho ? '안무' : '댄서', pay, title: `${j.who} ${j.n}`, by: DANCER_TIERS[t.tier], sc: big > 0 ? 85 : good ? 70 : big < 0 ? 30 : 45, note: (j.c ? `${j.c} · ` : '') + (big > 0 ? '화제가 됐다' : good ? '반응이 좋았다' : big < 0 ? '혹평' : '무난') });
  const how = cho ? (big > 0 ? '내가 만든 안무가 챌린지로 번져 여기저기서 따라 췄다.' : good ? '안무가 곡과 잘 맞는다는 말을 들었다.' : big < 0 ? '안무가 곡과 안 어울린다는 혹평이 돌았다.' : '무난한 안무로 마무리했다.')
    : (big > 0 ? '무대 직캠이 퍼져 "저 댄서 누구냐"는 말이 돌았다.' : good ? '무대가 깔끔하게 끝났다. 다음에도 불러 주겠다는 말을 들었다.' : big < 0 ? '동선을 틀려 무대가 꼬였다. 현장 분위기가 싸늘했다.' : '무난하게 끝났다.');
  const x = `${j.who} ${josa(j.n, '을를')} 했다. ${how}` + fxt;
  return showResult(s, `${j.who} ${j.n}`, x + (up ? `\n\n${up}` : ''), x + (up ? ` ${up}` : ''));
}
// 가끔 예능 섭외 (예능인 일과 같은 방식으로 나간다. 재밌게 나오면 예능 쪽에서 고정 제안이 오기도 한다)
E({
  id: 'dc_var', cat: '섭외', title: '예능 섭외', tag: 'career',
  cond: s => trackOn(s, 'dancer') && !s.army,
  init(s, d) { d.sh = genShow(s, trackOn(s, 'variety') ? s.tracks.variety.tier : 0, false); },
  text: (s, d) => `춤 잘 추는 댄서로 이름이 알려지자 ${d.sh.bc} 「${d.sh.title}」(${d.sh.genre})에서 게스트 섭외가 들어왔다.\n\n요즘 예능 유행 '${s.trendTV.show}' · 예능 ${has(me(s), 'variety') ? lvi(me(s), 'variety') + '레벨' : '못 함'}`,
  ch: (s, d) => [Object.assign(showChoice(s, d.sh), { t: '출연한다' }), { t: '거절한다', f: () => `「${d.sh.title}」 섭외를 거절했다.` }],
});
