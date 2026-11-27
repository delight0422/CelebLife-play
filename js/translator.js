'use strict';
// ════════ 번역가 (v250) ════════
// 작품 · 콘텐츠를 다른 나라 말로 옮긴다. 지금은 뼈대만 넣는다 — 다른 직업의 해외 진출에 번역가를 잇는 일은 나중 버전에서 한다 (그때 trQual을 쓴다)
// 번역 특기는 따로 없다 (2026-11-27 사용자 결정): 그 외국어 특기 레벨 + 분야마다 다른 재능(TR_FIELD)으로 품질이 정해진다
// 일하는 길 두 가지 (편집자 · 애니메이터처럼 한 직업의 두 방식):
//   회사 직원 (mode 'emp'): 중형 · 대형 기획사 · MCN · CP사 · 영상 제작사 · 애니 제작사 · 방송사 (TL_CO). 월급 · 2년 계약 · 석 달마다 평가 · 승진 (마케터와 같은 직원형)
//   프리랜서 (mode 'free'): 의뢰를 하나씩 받는다. 의뢰는 제안 창으로 오거나, 직업 창 '지원' 탭의 번역 공고에 지원해서 딴다. 의뢰를 맡은 동안에만 일정 한 칸을 쓴다 (slotOK)
// 회사를 나오면(퇴사 · 재계약 안 됨 · 권고사직 · 회사 폐업) 일이 끝나지 않고 프리랜서로 돌아간다 (tlLeave — musicstaff.js leaveEmp가 부른다)
// 이름: 지시서가 정한 trQual · TR_FIELD만 tr로 시작하고, 나머지는 tl · TL_ 로 시작한다 (tr · TR_ 은 트레이너가 쓴다 — musicstaff.js). 사건 이름도 tl_ (game.js EV_JOB_PRE)

const TL_LANGS = ['en', 'jp'];
// 분야마다 번역의 맛을 가르는 재능. 가사 → 리듬감, 유튜브 영상 → 유머 감각은 사용자가 정했다 (게임 안에서 유튜브는 '라이브온'이다). 나머지는 임시로 정했다 (나중에 사용자가 손본다)
// 이름 안에서는 가운뎃점을 붙여 쓴다 (의뢰 줄에서 ' · '로 이어 붙이기 때문에)
const TR_FIELD = {
  lyric: { n: '가사', tal: 'rhythm' }, // 음절 수와 박자에 맞아야 부를 수 있다
  video: { n: '라이브온·예능 영상', tal: 'humor' }, // 농담과 말장난을 그 나라 말로 살린다
  novel: { n: '웹소설', tal: 'verbal' }, // 긴 글을 술술 읽히게 옮긴다
  toon: { n: '웹툰', tal: 'creative' }, // 말풍선에 맞춰 줄이고 효과음 · 말장난을 새로 짓는다
  drama: { n: '드라마·영화 자막', tal: 'insight' }, // 짧은 자막 한 줄에 대사의 속뜻과 사람 사이를 담는다
  anime: { n: '애니메이션 대본', tal: 'express' }, // 성우가 연기할 대사라 캐릭터의 감정과 말맛을 살린다
  game: { n: '게임', tal: 'grit' }, // 분량이 많고 용어를 끝까지 똑같이 맞춰야 한다
};
// 번역 품질 0~100 (화면에는 식도 숫자도 보이지 않는다. 난이도 글 · 가능성 %에만 드러난다)
//   top × (외국어 레벨 ÷ 100)^pow × (1 + tal × ((재능 ÷ 100)² − 0.25))
//   외국어 레벨이 주된 축이고 갈수록 기울기가 커진다 (재능 50 기준: 25레벨 11 · 40레벨 22 · 60레벨 40 · 80레벨 61 · 100레벨 85)
//   재능은 50이면 그대로, 낮으면 깎고 높으면 올린다 (20이면 ×0.90 · 70이면 ×1.12 · 90이면 ×1.28). 재능도 곡선이다
// p는 주인공이 아니어도 된다 (나중에 회사 번역가 · 프리랜서 번역가 NPC의 품질도 이 함수로 잰다)
const TL_Q = { top: 85, pow: 1.5, tal: 0.5 };
function trQual(p, lang, field) {
  const F = TR_FIELD[field], L = U.clamp(lv(p, lang), 0, 100) / 100, T = U.clamp(F && p && p.tal ? p.tal[F.tal] || 0 : 50, 0, 100) / 100;
  return U.clamp(TL_Q.top * Math.pow(L, TL_Q.pow) * (1 + TL_Q.tal * (T * T - 0.25)), 0, 100);
}
const TL_LUCK = 5; // 일 하나의 결과에 섞이는 운 (표준편차)

// 등급 (0~6): 두 방식이 같은 등급을 쓴다. 프리랜서는 업계에서 부르는 이름(TL_TIERS), 회사에서는 자리(TL_POS)
const TL_TIERS = ['새내기 번역가', '신인 번역가', '현역 번역가', '실력파 번역가', '이름난 번역가', '스타 번역가', '번역의 거장'];
const TL_POS = ['번역 인턴', '주니어 번역가', '번역가', '시니어 번역가', '번역 팀장', '번역 총괄', '해외사업 이사'];
const TL_SAL = [180, 240, 300, 390, 510, 720, 1100]; // 만 원 (중형 회사 기준). 대형 ×1.2
const TL_AGM = [0, 0.85, 1, 1.2];
// 등급 올리기: 쌓인 성과(pts)를 넘고, 회사에서는 그 자리에서 보낸 햇수(yrs) · 업무 평가 40 이상, 프리랜서는 업계 평판(rep)을 넘어야 한다. 맨 위는 전달력 52 이상
const TL_UP = { pts: [0, 4, 12, 30, 70, 115, 165], yrs: [0, 1, 2, 2, 3, 3, 3], rep: [0, 0, 15, 30, 45, 60, 78], tal: 'verbal', min: 52 };
// 회사 평가 기준 (자리마다 오른다. 대형은 +3): 번역 품질이 이보다 높으면 성과가 쌓이고 평가가 오른다
const TL_BAR = [15, 20, 26, 33, 40, 48, 56];
const TL_NEED = { free: 25, emp: 35 }; // 시작하는 데 필요한 외국어 레벨 (영어 · 일본어 중 높은 쪽)
const TL_THR = [0, 16, 24, 34]; // 회사 채용 합격선 (그 회사 분야의 번역 품질로 본다)
const TL_PRAC = 0.7; // 번역하는 달에 그 외국어가 느는 양 (칸 무게마다)
// 회사 종류마다 번역하는 분야 (그 회사 콘텐츠). 둘이면 평가 때마다 하나를 본다
const TL_CO = { music: ['lyric'], mcn: ['video'], cp: ['novel', 'toon'], prod: ['drama'], ani: ['anime'], bc: ['drama', 'video'] };
EMP_N.translator = '번역';

function tlOn(s) { return trackOn(s, 'translator'); }
function tlEmp(s) { return tlOn(s) && s.tracks.translator.mode === 'emp'; }
// 지금 의뢰를 새로 맡을 수 있는가 (프리랜서이고 맡은 의뢰가 없다)
function tlFreeIdle(s) { return tlOn(s) && s.tracks.translator.mode === 'free' && !s.tracks.translator.job; }
function tlBest(p) { return lv(p, 'jp') > lv(p, 'en') ? 'jp' : 'en'; }
function tlLv(p) { return Math.max(lv(p, 'en'), lv(p, 'jp')); }
function tlLangs(p) { return TL_LANGS.filter(k => has(p, k)).map(k => `${SKILLS[k].n} ${lvi(p, k)}`).join(' · '); }
function tlTierN(t) { return (t.mode === 'emp' ? TL_POS : TL_TIERS)[t.tier || 0]; }
function tlCoFields(t) { return TL_CO[t.kind || (coByKey(t.ag) || {}).kind] || ['video']; }
function tlFieldsN(t) { return tlCoFields(t).map(f => TR_FIELD[f].n).join(' · '); }
function tlSalAt(tier, agT) { return Math.round(TL_SAL[tier] * TL_AGM[agT || 2]) * 1e4; }
function tlBar(t) { return TL_BAR[t.tier] + ((t.agT || 2) - 2) * 3; }
function tlTierUp(s, t) {
  const k = t.tier + 1, emp = t.mode === 'emp';
  if (k > 6 || t.pts < TL_UP.pts[k] || (k === 6 && me(s).tal[TL_UP.tal] < TL_UP.min)) return '';
  if (emp ? ((t.tm || 0) < TL_UP.yrs[k] * 12 || t.rep < 40) : t.rep < TL_UP.rep[k]) return '';
  t.tier = k; t.tm = 0;
  if (emp) { t.sal = Math.max(t.sal, tlSalAt(k, t.agT)); t.salBase = t.sal; }
  if (k >= 4) milestone(s, `${age(s)}세에 ${emp ? `${t.agN} ` : ''}${josa(tlTierN(t), '이가')} 되었다.`);
  return emp ? `${josa(TL_POS[k], '으로')} 승진했다! 월급이 ${fmtWon(t.sal)}으로 올랐다.` : `이제 업계에서 나를 ${josa(`'${TL_TIERS[k]}'`, '으로')} 부른다.`;
}

// ───── 시작: 프리랜서 ─────
function tlStartFree(s) {
  const old = s.tracks.translator || {}, rep0 = old.mode === 'free' ? old.rep || 0 : old.frep || 0;
  s.tracks.translator = { st: 'active', mode: 'free', months: 0, tm: 0, tier: old.tier || 0, pts: old.pts || 0, rep: Math.max(rep0, (old.tier || 0) * 8), frep: 0, job: null, jobs: old.jobs || 0, done: old.done || 0, hist: old.hist || [] };
  if (!old.months && !(old.hist || []).length) milestone(s, `${age(s)}세에 번역 일을 시작했다.`);
  return '프리랜서 번역가로 일을 시작했다. 의뢰가 들어오기를 기다리거나, 직업 창 지원 탭에서 번역 공고에 지원한다.';
}
JOB_APPLY.push({
  id: 'translator_free', trk: 'translator', g: '🔤 번역가', n: '프리랜서 번역가로 시작하기',
  show: s => !tlOn(s),
  h: s => '의뢰를 하나씩 받아 번역한다 · 의뢰를 맡은 동안에만 일정 한 칸을 쓴다',
  ok: s => !s.army && age(s) >= 18 && tlLv(me(s)) >= TL_NEED.free,
  why: s => s.army ? '군 복무 중' : age(s) < 18 ? '18세부터 할 수 있다' : `영어나 일본어가 ${TL_NEED.free}레벨 이상이어야 한다`,
  run: s => tlStartFree(s),
});

// ───── 시작: 회사 번역가 채용 ─────
// 해외로 내보낼 콘텐츠가 있는 회사 가운데 중형 · 대형만 번역가를 따로 둔다 (소형 회사는 프리랜서에게 맡긴다). 같은 회사는 반년 뒤 다시
function tlCoKeys() { return AGENCIES.filter(a => a.mkt === 'kr' && TL_CO[a.kind]).map(a => a.id).concat(coKeysOf('prod'), coKeysOf('ani'), coKeysOf('vo')).filter(k => coByKey(k).tier >= 2); }
// 합격 점수: 그 회사 분야의 번역 품질(잘하는 쪽 외국어) + 대학 졸업 · 경력 · 등급
function tlApplySc(s, c) { const p = me(s), F = TL_CO[c.kind] || ['video'], lang = tlBest(p); return F.reduce((a, f) => a + trQual(p, lang, f), 0) / F.length + (uniDone(s) ? 3 : 0) + empExpBonus(s, 'translator') + ((s.tracks.translator || {}).tier || 0) * 2; }
function tlApplyP(s, key) { const c = coByKey(key); return audP(tlApplySc(s, c), TL_THR[c.tier]); }
for (const key of tlCoKeys()) JOB_APPLY.push({
  id: 'translator_' + key, coKey: key, pos: '번역가 채용', trk: 'translator', g: '🔤 번역가', get n() { return `${coByKey(key).n} 번역가 채용`; }, get tag() { const c = coByKey(key); return `${TIER_N[c.tier]} · 월급 ${Math.round(TL_SAL[0] * TL_AGM[c.tier])}만 원부터`; },
  show: s => !tlEmp(s) && age(s) >= 20,
  h: s => tlLv(me(s)) >= TL_NEED.emp ? `합격 가능성 ${fmtPct(tlApplyP(s, key))} · 결과는 다음 달 · ${TL_CO[coByKey(key).kind].map(f => TR_FIELD[f].n).join(' · ')} 번역을 맡는다` : `영어나 일본어가 ${TL_NEED.emp}레벨 이상이어야 지원할 수 있다`,
  ok: s => !s.army && !agencyContract(s) && tlLv(me(s)) >= TL_NEED.emp && !hasQ(s, 'tl_res') && !(s.cd['tlc_' + key] > s.t),
  why: s => s.army ? '군 복무 중' : agencyContract(s) ? contractWhy(s) : tlLv(me(s)) < TL_NEED.emp ? `영어나 일본어가 ${TL_NEED.emp}레벨 이상이어야 한다` : hasQ(s, 'tl_res') ? '결과를 기다리는 중' : '얼마 전에 지원했다 (반년 뒤 다시)',
  run: s => { const c = coByKey(key); s.cd['tlc_' + key] = s.t + 6; queueEv(s, 'tl_res', 1, { ag: key, co: c.n, p: tlApplyP(s, key) }); return `${c.n} 번역가 채용에 지원했다.`; },
});
E({
  id: 'tl_res', cat: '채용', title: '번역가 채용 결과', tag: 'career',
  init(s, d) { const c = coByKey(d.ag); if (!c) { d.skip = true; return; } d.pass = U.chance(d.p); d.tier = (s.tracks.translator || {}).tier || 0; d.sal = tlSalAt(d.tier, c.tier); d.agN = c.n; },
  text: (s, d) => d.pass ? `${d.agN}에 번역가로 합격했다! ${d.tier ? `그동안의 경력을 보고 '${TL_POS[d.tier]}' 자리를 맡긴다. ` : ''}회사가 제시한 월급은 ${fmtWon(d.sal)}.` : `${d.agN} 번역가 채용에 떨어졌다.`,
  ch: (s, d) => d.pass ? [
    { t: '입사 조건을 들어 본다', ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '월급을 협상할 수 있다', f: s => startNego(s, { kind: 'translator', ag: d.ag, agN: d.agN, sal: d.sal, months: 24, lev: U.clamp((d.p - 0.5) * 0.8 + 0.3, 0.05, 0.8) }) },
    { t: '거절한다', f: () => '입사 제안을 거절했다.' },
  ] : [{ t: '확인', f: () => `${d.agN} 번역가 채용에 떨어졌다.` }],
});
function tlStart(s, d) {
  const c = coByKey(d.ag), old = s.tracks.translator || {}, was = trackOn(s, 'translator'), m0 = was ? old.months || 0 : 0;
  // 프리랜서로 일하다 들어가면: 맡고 있던 의뢰는 넘기고, 업계 평판은 따로 적어 둔다 (회사를 나오면 되찾는다)
  const drop = was && old.job ? ' 맡고 있던 의뢰는 다른 번역가에게 넘겼다.' : '';
  const frep = Math.max(0, (old.mode === 'free' ? old.rep || 0 : old.frep || 0) - (drop ? 3 : 0));
  s.inbox = s.inbox.filter(m => m.kind !== 'tl_offer'); // 답하지 않은 번역 의뢰는 없던 일이 된다
  const t = s.tracks.translator = { st: 'active', mode: 'emp', ag: d.ag, kind: c.kind, agN: c.n, agT: c.tier, months: m0, tm: 0, cEnd: m0 + d.months, tier: old.tier || 0, pts: old.pts || 0, rep: empStartRep(s, 'translator', false), frep, sal: d.sal, salBase: d.sal, rv: 0, job: null, jobs: old.jobs || 0, done: old.done || 0, hist: old.hist || [] };
  coMeetJob(s, 'translator');
  milestone(s, `${age(s)}세에 ${c.n} 번역가가 되었다.`);
  return `${c.n}에 번역가로 입사했다. ${tlFieldsN(t)} 번역을 맡는다. 월급 ${fmtWon(d.sal)} · 계약 ${yrs(d.months)}.` + drop;
}
NEGO.translator = empNego('translator', tlStart);
// 회사를 나온다: 번역 일은 프리랜서로 이어 간다. 프리랜서 때의 업계 평판을 되찾는다 (자리가 높았으면 그만큼은 쳐 준다)
function tlLeave(s, why) {
  const t = s.tracks.translator, n = t.agN;
  (t.hist = t.hist || []).push(`${n} ${TL_POS[t.tier]} (${why})`);
  Object.assign(t, { mode: 'free', ag: null, agN: '', agT: 0, kind: '', sal: 0, salBase: 0, cEnd: null, rv: 0, job: null, rep: Math.max(t.frep || 0, t.tier * 8), frep: 0 });
  return `${josa(n, '을를')} 나왔다. 이제 프리랜서 번역가로 일한다.`;
}

CAREERS.translator = {
  n: '번역가', ic: '🔤', auto: true,
  desc: '작품과 콘텐츠를 다른 나라 말로 옮긴다. 회사에 들어가 그 회사 콘텐츠를 맡거나, 프리랜서로 의뢰를 하나씩 받는다. 영어 · 일본어 실력이 가장 중요하고, 분야마다 다른 재능이 번역의 맛을 가른다 (가사는 리듬감, 라이브온·예능 영상은 유머 감각).',
  act: { n: '번역 작업', ic: '🔤', g: '직업 활동', eff: [['외국어', '↑', 1], ['스트레스', '↑', 0]] },
  // 프리랜서는 의뢰를 맡은 동안에만 일정 칸을 쓴다
  slotOK: (s, t) => t.mode === 'emp' || !!t.job,
  autoList(s, t) {
    if (t.mode === 'emp') return [{ ic: '🔤', n: `${tlFieldsN(t)} 번역`, eff: `${SKILLS[tlBest(me(s))].n} ↑ · 석 달마다 평가` }];
    const j = t.job;
    return j ? [{ ic: '🔤', n: `${j.who} ${j.n}`, eff: `${SKILLS[j.lang].n} ↑ · ${j.left}개월 남음` }] : [];
  },
  status(s, t) {
    if (t.st !== 'active') return t.endNote || '';
    return t.mode === 'emp' ? `${t.agN} ${TL_POS[t.tier]} · 업무 평가 ${Math.round(t.rep)} · 월급 ${fmtWon(t.sal)}` : `프리랜서 ${TL_TIERS[t.tier]} · 업계 평판 ${Math.round(t.rep)} · 끝낸 의뢰 ${t.jobs || 0}건 · ${t.job ? `번역 중 (${t.job.left}개월 남음)` : '의뢰를 기다리는 중'}`;
  },
  short(s, t) { return t.mode === 'emp' ? `${t.agN} ${TL_POS[t.tier]}` : '프리랜서 번역가'; },
  seg(s, t) { return t.mode === 'emp' ? `${t.agN} 번역가` : '프리랜서 번역가'; },
  title(s, t) { return t.months || t.jobs ? tlTierN(t) : null; },
  contract(s, t) { return t.st === 'active' && t.mode === 'emp' ? `${t.agN} (번역가)` : ''; },
  emp: true,
  cLeft(s, t) { return t.st === 'active' && t.mode === 'emp' && t.cEnd != null ? t.cEnd - t.months : null; },
  // 지금 쓰는 외국어: 맡은 의뢰의 말, 없으면 더 잘하는 쪽
  mainSk(s, t) { return t && t.job && t.job.lang ? t.job.lang : tlBest(me(s)); },
  info(s, t) {
    const p = me(s), emp = t.mode === 'emp', j = t.job;
    const R = emp
      ? [['회사', `${t.agN} (${TIER_N[t.agT]} ${CO_KIND_N[t.kind] || '회사'})`], ['자리', TL_POS[t.tier]], ['일하는 방식', `${t.agN} 직원 (월급 · 석 달마다 평가)`], ['맡은 일', `${tlFieldsN(t)} 번역`], ['월급', fmtWon(t.sal)]]
      : [['등급', TL_TIERS[t.tier]], ['일하는 방식', '프리랜서 (의뢰마다 보수를 받는다)'], ['맡은 의뢰', j ? `${j.who} · ${j.n} · ${SKILLS[j.lang].n} · ${j.left}개월 남음 · 보수 ${fmtWon(j.fee)}` : '없음']];
    R.push(['내 실력', tlLangs(p) || '-'], [emp ? '업무 평가' : '업계 평판', `${Math.round(t.rep)}`], ['끝낸 의뢰', `${t.jobs || 0}건`]);
    return R;
  },
  actions(s, t) {
    if (t.st !== 'active') return [];
    if (t.mode === 'emp') return [{ t: '회사 그만두기', h: '직원 계약이라 위약금은 없다 · 그만두면 프리랜서로 돌아간다', ok: true, danger: true, confirm: '정말 회사를 그만둘까요?', run: s => tlLeave(s, '퇴사') }];
    return [{ t: '번역 일 그만두기', h: t.job ? '맡은 의뢰는 끝내지 못하고 넘긴다' : '', ok: true, danger: true, confirm: '정말 번역 일을 그만둘까요?', run: s => { t.st = 'ended'; t.job = null; s.inbox = s.inbox.filter(m => m.kind !== 'tl_offer'); t.endNote = `${TL_TIERS[t.tier]} · 끝낸 의뢰 ${t.jobs || 0}건 (그만둠)`; (t.hist = t.hist || []).push(t.endNote); return '번역 일을 그만뒀다.'; } }];
  },
  monthly(s, t) { tlMonth(s, t); },
};

// ───── 한 달 ─────
function tlMonth(s, t) {
  if (t.st !== 'active') return;
  t.months++;
  const p = me(s), n = slotsOn(s, 'c_translator');
  // 번역가로 일하는 동안에는 외국어가 떨어지지 않는다 (쓰는 말은 아래에서 따로 는다)
  for (const k of TL_LANGS) useSkill(s, p, k, 0);
  if (t.mode === 'emp') {
    t.tm = (t.tm || 0) + 1;
    empMonth(s, 'translator', t);
    earn(s, t.sal, '번역 월급', 'translator');
    // 일정 칸을 받지 못한 달(자숙 · 임신 · 병)은 봐준다: 평가도 석 달 주기도 멈춘다
    if (n) {
      practice(s, p, tlBest(p), TL_PRAC * n); addStress(s, 1.6);
      t.rv = (t.rv || 0) + 1;
      if (t.rv >= 3) { t.rv = 0; tlReview(s, t); }
    }
    if (t.rep <= 2 && !hasQ(s, 'tl_fire')) queueEv(s, 'tl_fire', 0);
    return;
  }
  const j = t.job;
  if (j) {
    // 맡은 의뢰: 일정 칸이 있는 달에만 나아간다 (칸을 받지 못한 달은 기다려 준다)
    if (n) { practice(s, p, j.lang, TL_PRAC * n); addStress(s, 1.6); if (--j.left <= 0) tlJobDone(s, t); }
    return;
  }
  // 의뢰 제안: 맡은 일이 없을 때만. 업계 평판이 높을수록 자주 온다 (평판 0이면 열 달에 여섯 번쯤, 35부터는 거의 달마다)
  if (!s.hiatus && !pregMe(s) && !hasQ(s, 'tl_find') && !hasQ(s, 'tl_find_res') && !s.inbox.some(m => m.kind === 'tl_offer') && U.chance(Math.min(0.95, (0.6 + t.rep / 100) * pm(s, 'network')))) tlOffer(s, t);
}
// 회사: 석 달마다 평가. 그 회사 분야의 번역 품질이 자리 기준(tlBar)보다 높으면 성과가 쌓이고 평가가 오른다
// 기준에 조금 못 미치면 평가가 조금씩만 내려간다 (승진한 자리가 버거워도 곧바로 쫓겨나지 않게). 크게 못 미칠 때만 많이 내려간다
function tlReview(s, t) {
  const p = me(s), f = U.pick(tlCoFields(t)), q = trQual(p, tlBest(p), f) + U.normal(0, TL_LUCK), bar = tlBar(t), r0 = Math.round(t.rep);
  const k = q >= bar + 10 ? 2 : q >= bar ? 1 : 0;
  t.pts += k; t.done = (t.done || 0) + 1;
  t.rep = U.clamp(t.rep + (q >= bar ? U.clamp((q - bar) / 3, 0, 5) : q >= bar - 10 ? -1 : -4), 0, 100);
  const word = k === 2 ? '손댈 곳이 없다는 말을 들었다' : k ? '매끄럽게 읽힌다는 말을 들었다' : q >= bar - 10 ? '어색한 곳이 있어 여러 번 고쳤다' : '오역이 나와 처음부터 다시 손봤다';
  addRes(s, `맡은 ${TR_FIELD[f].n} 번역 평가: ${word}. (업무 평가 ${r0} → ${Math.round(t.rep)})`);
  const up = tlTierUp(s, t); if (up) addLog(s, up, 'good');
}
E({
  id: 'tl_fire', cat: '번역', title: '권고사직', tag: 'career',
  cond: s => tlEmp(s),
  text: s => '업무 평가가 바닥까지 떨어졌다. 팀장이 조용히 불러 다른 길을 알아보는 게 좋겠다고 한다.',
  ch: () => [{ t: '짐을 정리한다', f: s => leaveEmp(s, 'translator', '권고사직') + fx(s, { stress: 8 }) }],
});

// ───── 프리랜서 의뢰 ─────
// f 분야, by 맡기는 곳, rep 이 평판쯤부터 들어온다, m 걸리는 개월, fee 보수(만 원), dem 난이도(번역 품질이 이보다 높으면 잘 끝난다), rw 평판이 움직이는 크기, pt 잘하면 쌓이는 성과
// 평판 순서대로 적는다 (tlOffer · tlPosts가 뒤쪽을 고른다)
const TL_JOBS = [
  { id: 'yt', f: 'video', n: '라이브온 영상 자막', by: 'yt', rep: 0, m: 1, fee: 180, dem: 9, rw: 0.6, pt: 0.5 },
  { id: 'single', f: 'lyric', n: '싱글 가사 번역', by: 'label', rep: 0, m: 1, fee: 200, dem: 11, rw: 0.6, pt: 0.5 },
  { id: 'toon', f: 'toon', n: '웹툰 한 시즌 번역', by: 'cp', rep: 10, m: 2, fee: 620, dem: 20, rw: 0.8, pt: 1 },
  { id: 'novel', f: 'novel', n: '웹소설 100화 번역', by: 'cp', rep: 18, m: 3, fee: 1050, dem: 25, rw: 0.9, pt: 1 },
  { id: 'show', f: 'video', n: '예능 프로그램 자막', by: 'bc', rep: 26, m: 2, fee: 950, dem: 31, rw: 1, pt: 1 },
  { id: 'album', f: 'lyric', n: '정규 앨범 가사 번역', by: 'label', rep: 32, m: 1, fee: 780, dem: 36, rw: 1, pt: 1 },
  { id: 'anime', f: 'anime', n: 'TV 애니 대본 번역', by: 'ani', rep: 38, m: 3, fee: 1750, dem: 40, rw: 1.1, pt: 1.5 },
  { id: 'drama', f: 'drama', n: '드라마 자막 번역', by: 'prod', rep: 46, m: 3, fee: 2300, dem: 46, rw: 1.2, pt: 1.5 },
  { id: 'game', f: 'game', n: '게임 현지화', by: 'game', rep: 55, m: 4, fee: 4600, dem: 52, rw: 1.3, pt: 2 },
  { id: 'film', f: 'drama', n: '영화 자막 번역', by: 'prod', rep: 65, m: 2, fee: 3600, dem: 59, rw: 1.5, pt: 2 },
  { id: 'saga', f: 'novel', n: '인기 웹소설 전권 번역', by: 'cp', rep: 72, m: 5, fee: 8600, dem: 64, rw: 1.5, pt: 2.5 },
];
function tlClient(by) {
  const pick = L => (U.pick(L) || {}).n || '';
  switch (by) {
    case 'yt': return `스트리머 ${ytNick()}`;
    case 'label': return pick(AGENCIES.filter(a => a.kind === 'music' && a.mkt === 'kr')) || '기획사';
    case 'cp': return pick(AGENCIES.filter(a => a.kind === 'cp')) || 'CP사';
    case 'bc': return pick(VO_BCS) || '방송사';
    case 'ani': return pick(ANIME_COS) || '애니 제작사';
    case 'prod': return pick(PROD_COS) || '영상 제작사';
    case 'game': return pick(BRANDS.filter(b => b.cat === '게임')) || '게임 회사';
  }
  return '의뢰처';
}
// 의뢰 하나를 만든다. 말은 내가 할 줄 아는 외국어 가운데 (잘하는 쪽이 더 자주), 보수는 등급이 오를수록 조금씩 오른다
function tlMakeJob(s, t, tpl) {
  const p = me(s), L = TL_LANGS.filter(k => lv(p, k) >= 20), lang = L.length ? U.wpick(L, k => lv(p, k)) : tlBest(p);
  return { id: tpl.id, f: tpl.f, n: tpl.n, lang, who: tlClient(tpl.by), m: tpl.m, left: tpl.m, rep: tpl.rep, dem: tpl.dem + U.int(-2, 3), rw: tpl.rw, pt: tpl.pt, fee: Math.round(tpl.fee * (1 + t.tier * 0.1) * U.fl(0.85, 1.2) / 5) * 5e4 };
}
// 내 번역 품질과 의뢰 난이도를 비교한 말 (숫자는 보여 주지 않는다)
function tlDiffWord(s, j) { const g = trQual(me(s), j.lang, j.f) - j.dem; return g >= 8 ? '여유' : g >= -3 ? '알맞음' : '버거움'; }
function tlJobLine(s, j) { return `${TR_FIELD[j.f].n} · ${SKILLS[j.lang].n} · ${j.m}개월 · 보수 ${fmtWon(j.fee)} · 난이도 ${tlDiffWord(s, j)}`; }
function tlTake(s, j) {
  if (!tlFreeIdle(s)) return '지금은 의뢰를 맡을 수 없다.';
  s.tracks.translator.job = Object.assign({}, j, { left: j.m });
  return `${j.who}의 ${josa(j.n, '을를')} 맡았다. ${j.m}개월 동안 번역한다.`;
}
// 제안 창으로 오는 의뢰: 지금 평판으로 받을 수 있는 것 가운데 큰 쪽 넷에서 하나
function tlOffer(s, t) {
  const can = TL_JOBS.filter(x => x.rep <= t.rep + 5).slice(-4), j = tlMakeJob(s, t, U.pick(can));
  sendMsg(s, 'tl_offer', { from: j.who, title: '번역 의뢰', months: 3, d: { j } });
}
INBOX.tl_offer = {
  ic: '🔤',
  text: (s, m) => `${m.from}에서 ${josa(m.d.j.n, '을를')} 맡아 달라고 한다.\n\n${tlJobLine(s, m.d.j)}`,
  ch: (s, m) => [
    { t: '맡는다', ok: s => tlFreeIdle(s), h: tlFreeIdle(s) ? `${m.d.j.m}개월 동안 일정 한 칸을 쓴다` : '지금은 의뢰를 맡을 수 없다', f: s => tlTake(s, m.d.j) },
    { t: '거절한다', f: () => `${m.from}의 번역 의뢰를 거절했다.` },
  ],
};
// 직업 창 '지원' 탭: 번역 공고에 지원한다 (game.js AA_OWN 주인 'translator'). 지금 평판보다 조금 큰 일에도 지원할 수 있다 (뽑힐 가능성은 낮다)
function tlPosts(s, t) { return U.shuffle(TL_JOBS.filter(x => x.rep <= t.rep + 20).slice(-5)).slice(0, 3).sort((a, b) => b.rep - a.rep).map(x => tlMakeJob(s, t, x)); }
function tlPostP(s, j) { const t = s.tracks.translator; return U.clamp(U.sig((trQual(me(s), j.lang, j.f) - j.dem + (t.rep - j.rep) * 0.1 + 3) / 5), 0.05, 0.95); }
function tlFindWhy(s) {
  const t = s.tracks.translator || {};
  return !tlOn(s) || t.mode !== 'free' ? '프리랜서 번역가일 때만 지원할 수 있다' : t.job ? '맡은 의뢰를 먼저 끝내야 한다' : hasQ(s, 'tl_find_res') ? '결과를 기다리는 중이다' : s.inbox.some(m => m.kind === 'tl_offer') ? '들어온 의뢰에 먼저 답해야 한다' : s.cd.tlFind > s.t ? '얼마 전에 지원했다' : '';
}
ACT_APPLY.push({
  id: 'tl_find', cat: 'office', n: '번역 공고 지원', ic: '📮',
  show: s => tlOn(s) && s.tracks.translator.mode === 'free',
  h: s => '번역가를 찾는 공고 가운데 한 곳을 골라 지원한다 · 결과는 다음 달',
  ok: s => !tlFindWhy(s) && !hasQ(s, 'tl_find'), why: s => tlFindWhy(s),
  run: s => { fireEvent(s, 'tl_find', {}); return ''; },
});
E({
  id: 'tl_find', cat: '지원', title: '번역 공고', tag: 'career',
  init(s, d) { if (!tlFreeIdle(s)) { d.skip = true; return; } d.js = tlPosts(s, s.tracks.translator); for (const j of d.js) j.p = tlPostP(s, j); },
  text: (s, d) => `번역가를 찾는 공고를 살펴봤다. 한 곳에 지원할 수 있다.\n\n${tlLangs(me(s))} · 업계 평판 ${Math.round(s.tracks.translator.rep)}`,
  ch: (s, d) => d.js.map(j => ({ t: `${j.who} · ${j.n}`, h: `${tlJobLine(s, j)} · 뽑힐 가능성 ${fmtPct(j.p)}`, f: s => { s.cd.tlFind = s.t + 2; queueEv(s, 'tl_find_res', 1, { j, co: j.who, p: j.p }); return `${j.who}의 ${j.n} 공고에 지원했다.`; } }))
    .concat([{ t: '이번엔 지원하지 않는다', f: () => '번역 공고를 살펴보기만 했다.' }]),
});
E({
  id: 'tl_find_res', cat: '지원', title: '번역 공고 결과', tag: 'career',
  init(s, d) { if (!d.j || !tlFreeIdle(s)) { d.skip = true; return; } d.pass = U.chance(d.p); },
  text: (s, d) => d.pass ? `${d.j.who}에서 ${josa(d.j.n, '을를')} 맡기겠다고 한다!\n\n${tlJobLine(s, d.j)}` : `${d.j.who}의 ${d.j.n} 공고에서 떨어졌다. 다른 번역가가 뽑혔다.`,
  ch: (s, d) => d.pass ? [
    { t: '맡는다', ok: s => tlFreeIdle(s), h: tlFreeIdle(s) ? `${d.j.m}개월 동안 일정 한 칸을 쓴다` : '지금은 의뢰를 맡을 수 없다', f: s => tlTake(s, d.j) },
    { t: '거절한다', f: () => `${d.j.who}의 번역 의뢰를 거절했다.` },
  ] : [{ t: '확인', f: s => `${d.j.who}의 ${d.j.n} 공고에서 떨어졌다.` + fx(s, { stress: 2 }) }],
});
// 의뢰가 끝나면: 번역 품질(trQual + 운)이 난이도보다 높으면 평판과 성과가 오르고, 못 미치면 평판이 내려간다. 크게 못 미치면 보수도 깎인다
// 평판은 보수에도 든다: 아주 잘 끝내면 평판만큼 웃돈을 받는다 (평판 80이면 보수의 20%)
function tlJobDone(s, t) {
  const j = t.job, p = me(s), gap = trQual(p, j.lang, j.f) + U.normal(0, TL_LUCK) - j.dem, k = gap >= 10 ? 2 : gap >= 0 ? 1 : gap >= -10 ? 0 : -1, r0 = t.rep;
  t.job = null; t.jobs = (t.jobs || 0) + 1;
  const pay = k < 0 ? Math.round(j.fee * 0.7 / 1e4) * 1e4 : k === 2 ? j.fee + Math.round(j.fee * r0 / 400 / 1e4) * 1e4 : j.fee;
  earn(s, pay, '번역료', 'translator');
  t.rep = U.clamp(t.rep + U.clamp(gap / 3, -4, 6) * j.rw, 0, 100);
  if (k > 0) t.pts += k * j.pt;
  if (t.jobs === 1) milestone(s, `${age(s)}세에 처음으로 번역 의뢰를 끝냈다.`);
  addWork(s, { type: '번역', title: `${j.who} ${j.n}`, by: SKILLS[j.lang].n, sc: k === 2 ? 85 : k === 1 ? 70 : k === 0 ? 50 : 30, pay, note: k === 2 ? '호평' : k === 1 ? '무난' : k === 0 ? '아쉬움' : '혹평' });
  const word = k === 2 ? `의뢰처가 아주 만족했다. 다음에도 맡기고 싶다고 한다.${pay > j.fee ? ' 웃돈도 얹어 줬다.' : ''}` : k === 1 ? '고칠 곳이 거의 없이 넘겼다.' : k === 0 ? '어색한 문장이 많다는 말을 듣고 여러 번 고쳤다.' : '오역이 여러 군데 나와 보수가 깎였다.';
  const up = tlTierUp(s, t);
  const x = `${j.who}의 ${josa(j.n, '을를')} 끝냈다. ${word}`, tail = `보수 ${fmtWon(pay)} · 업계 평판 ${Math.round(r0)} → ${Math.round(t.rep)}`;
  showResult(s, `${j.who} ${j.n}`, `${x}\n\n${tail}` + (up ? `\n\n${up}` : ''), `${x} (${tail})` + (up ? ` ${up}` : ''));
}
