'use strict';
// ════════ 교수 (7-3단계) ════════
// 지금은 틀만 넣는다. 자세한 일은 12단계 직업별 디테일에서 정한다
// 두 길이 있다
//  - 현장 경력 길 (등급 없이 나란히): 겸임교수 · 초빙교수(초빙·객원·특임) · 산학협력중점교수 · 전임교수. 하던 직업의 경력과 등급으로 들어간다
//  - 대학원 길 (등급 7단계): 대학원생 → 박사 → 시간강사 → 조교수 → 부교수 → 정교수 → 석좌교수. 대부분 정교수에서 끝난다
// 학과: 현장 경력 길은 지금까지 한 직업 중 가장 오래 · 높이 한 직업으로 정해지고, 대학원 길은 진학할 때 고른다
// 하는 일 (일정에 '강의·연구'): 강의(학생 강의 평가) · 연구·작품 실적(반년마다) · 제자 키우기(제자가 데뷔하면 소식)
// 대학 9곳 (크기마다 3곳). 대학마다 학과장 한 명이 있다 (js/work.js 회사 직원 규칙, 열쇠 'uni:이름')

const UNIS = [
  { n: '한결대학교', tier: 3, con: '종합대학' }, { n: '새빛예술대학교', tier: 3, con: '예술 특성화' }, { n: '서하대학교', tier: 3, con: '연구 중심' },
  { n: '다온대학교', tier: 2, con: '실기 중심' }, { n: '누리예술대학교', tier: 2, con: '방송·공연' }, { n: '가온대학교', tier: 2, con: '산학 협력' },
  { n: '솔빛대학교', tier: 1, con: '지역 대학' }, { n: '하랑대학교', tier: 1, con: '전문 실기' }, { n: '모아대학교', tier: 1, con: '평생교육' },
];
function uniOf(tier) { return U.pick(UNIS.filter(x => x.tier === tier)); }
function uniTier(n) { const x = UNIS.find(u => u.n === n); return x ? x.tier : 1; }
// 학과: jobs 그 학과로 이어지는 직업, sk 실기·연구 실적에 보는 특기 · 재능 (v96 사용자 표: 둘이면 평균, best는 가장 높은 것 하나), debut 제자가 데뷔하면 갖는 직업
const PF_DEPTS = {
  '실용음악과': { jobs: ['idol', 'band', 'solo', 'player', 'composer', 'lyricist', 'producer', 'trainer', 'anr'], sk: ['vocal', 'rap', 'compose', 'lyric', 'guitar', 'bass', 'piano', 'keyboard', 'drum'], best: true, debut: '가수' },
  '실용무용과': { jobs: ['dancer'], sk: ['dance'], debut: '댄서' },
  '연극영화과': { jobs: ['actor', 'acttrainer'], sk: ['acting', 'direct'], debut: '배우' },
  '모델·패션과': { jobs: ['model'], sk: ['acting', 'athletic'], debut: '모델' },
  '방송연예과': { jobs: ['variety', 'youtube', 'vidol', 'voice'], sk: ['variety', 'acting'], debut: '방송인' },
  '영화영상과': { jobs: ['director', 'writer', 'editor'], sk: ['direct', 'edit'], debut: '영화감독' },
  '애니메이션·만화과': { jobs: ['animator', 'adir', 'webtoon', 'illust'], sk: ['art', 'direct'], debut: '웹툰 작가' },
  '문예창작과': { jobs: ['webnovel'], sk: ['script', 'lyric'], debut: '웹소설 작가' },
  '엔터테인먼트경영과': { jobs: ['agency'], sk: ['biz', 'scout'], debut: '기획사 직원' },
};
function pfDeptOfJob(id) { for (const d in PF_DEPTS) if (PF_DEPTS[d].jobs.includes(id)) return d; return ''; }
function pfDeptSk(s, d) { const p = me(s), D = PF_DEPTS[d] || PF_DEPTS['실용음악과'], v = D.sk.map(k => skOrTal(p, k)); return D.best ? Math.max(0, ...v) : v.reduce((a, x) => a + x, 0) / v.length; }

// ───── 하던 직업의 경력과 등급 ─────
// 그 직업을 한 개월 수 (게임이 매달 센다 s.carM. 예전 세이브는 직업의 months로 어림한다)
function jobMonths(s, id) { const t = s.tracks[id] || {}; return Math.max((s.carM || {})[id] || 0, t.months || 0); }
// 그 직업의 등급 (0~6). 등급이 없는 직업은 어림한다: 유튜버·버츄얼 아이돌은 가장 많을 때 구독자, 나머지는 그 직업의 인기와 인지도
const PF_TIERED = ['actor', 'variety', 'model', 'director', 'writer', 'dancer', 'animator', 'adir', 'voice', 'webtoon', 'webnovel', 'illust'];
function jobTier(s, id) {
  const t = s.tracks[id];
  if (!t || t.st === 'none') return 0;
  if (id === 'composer' || id === 'lyricist') return wTier(t, id, s);
  if (id === 'producer') return pTier(t, s);
  if (id === 'agency') return t.f ? coRank(t) : 0;
  if (PF_TIERED.includes(id)) return t.tier || 0;
  if (id === 'youtube' || id === 'vidol') return U.clamp(Math.floor(Math.log10(1 + (t.peak || t.subs || 0))) - 2, 0, 6);
  return U.clamp(Math.floor(Math.max(0, jpop(s, id) - 40) / 15 + (s.fame || 0) / 30), 0, 6);
}
// 교수로 이어질 내 대표 경력: 연수 + 등급 × 2가 가장 큰 직업
function pfBestJob(s) {
  let best = null;
  for (const id of CAREER_IDS) {
    if (id === 'prof' || !pfDeptOfJob(id)) continue;
    const m = jobMonths(s, id); if (!m) continue;
    const v = m / 12 + jobTier(s, id) * 2;
    if (!best || v > best.v) best = { id, v, years: Math.floor(m / 12), tier: jobTier(s, id), dept: pfDeptOfJob(id) };
  }
  return best;
}
function uniDone(s) { return !!(s.edu.uni && s.edu.uni.done); }

// ───── 직업 ─────
const PF_TIERS = ['대학원생', '박사', '시간강사', '조교수', '부교수', '정교수', '석좌교수'];
const PF_TYPES = { adj: { n: '겸임교수', sal: 120, months: 12 }, inv: { n: '초빙교수', sal: 400, months: 24 }, ind: { n: '산학협력중점교수', sal: 500, months: 36 }, full: { n: '전임교수', sal: 650, months: 0 } };
const PF_SAL = [0, 0, 150, 450, 600, 800, 1200]; // 만 원 (대학원 길 등급별)
const PF_FEE = 80e4; // 대학원 등록금 (한 달)
// 대학원 길 승진: pts 연구·작품 실적, yrs 그 자리에서 보낸 해. 석좌교수는 지능 min 이상
const PF_UP = { pts: [0, 2, 3, 3, 8, 16, 42], yrs: [0, 0, 0, 0, 6, 6, 0], tal: 'intel', min: 52 };
const PF_BAR = [36, 40, 42, 46, 50, 54, 58]; // 실적이 인정받는 기준 (등급별)
function pfTitle(t) { return t.route === 'grad' ? PF_TIERS[t.tier] : PF_TYPES[t.type].n; }
function pfTeaches(t) { return t.route !== 'grad' || t.tier >= 2; }
// 그 분야의 경력 (v95): 그 학과로 이어지는 직업에서 보낸 햇수 × 4 + 등급 × 8 중 가장 높은 것 (0~100). 학과 실기 특기가 더 높으면 그것
function pfCareer(s, d) { const D = PF_DEPTS[d] || PF_DEPTS['실용음악과']; let b = 0; for (const id of D.jobs) if (CAREERS[id]) b = Math.max(b, ((s.carM || {})[id] || 0) / 12 * 4 + jobTier(s, id) * 8); return Math.max(U.clamp(b, 0, 100), pfDeptSk(s, d)); }
// 연구·작품 점수 (v95): 학업 · 그 분야의 경력. 강의 평가: 학업 · 교육 · 그 분야의 경력 (모두 강함)
function pfResearch(s, t) { const p = me(s); return jobMix([[lv(p, 'study'), JS_], [pfCareer(s, t.dept), JS_]]); }
function pfLecture(s, t) { const p = me(s); return jobMix([[lv(p, 'study'), JS_], [lv(p, 'edu'), JS_], [pfCareer(s, t.dept), JS_]]); }
function pfSal(t) { const b = t.route === 'grad' ? PF_SAL[t.tier] : PF_TYPES[t.type].sal; return b ? Math.round(b * (0.85 + (t.uniT || 1) * 0.1)) * 1e4 : 0; }
function pfStart(s, o) {
  const old = s.tracks.prof;
  const t = s.tracks.prof = Object.assign({ st: 'active', route: 'ind', type: 'adj', tier: 0, pts: old.pts || 0, deg: old.deg || '', dept: '', uni: '', uniT: 1, months: 0, stM: 0, rep: 50, cEnd: 0, gradEnd: 0, studs: [], hist: old.hist || [] }, o);
  t.uniT = uniTier(t.uni);
  if (!has(me(s), 'edu')) learnMe(s, 'edu', null, false, true);
  coMeetJob(s, 'prof');
  milestone(s, t.route === 'grad' ? `${age(s)}세에 ${t.uni} 대학원 ${t.dept}에 들어갔다.` : `${age(s)}세에 ${t.uni} ${t.dept} ${pfTitle(t)}가 되었다.`);
  return t;
}
function pfLeave(s, t, note) {
  for (const id of t.studs || []) { const x = s.people[id]; if (x && x.rel === '제자') x.rel = '지인'; }
  t.st = 'ended'; t.endNote = note; t.hist.push(note);
}
CAREERS.prof = {
  n: '교수', ic: '🎓',
  desc: '대학에서 가르친다. 하던 일의 경력으로 겸임 · 초빙 · 산학협력중점 · 전임교수가 되거나, 대학원을 마치고 시간강사부터 조교수 · 부교수 · 정교수로 올라간다. 강의, 연구·작품, 제자 키우기를 한다.',
  act: { n: '강의·연구', ic: '🎓', g: '직업 활동', eff: [['교육', '↑', 1], ['학업', '↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) {
    if (t.st !== 'active') return t.endNote || '';
    const g = t.route === 'grad';
    return `${pfTitle(t)} · ${t.uni} ${t.dept}${g && t.tier === 0 ? ` · ${t.deg ? '박사과정' : '석사과정'} (${Math.max(1, t.gradEnd - s.t)}개월 남음)` : ''}${pfTeaches(t) ? ` · 강의 평가 ${Math.round(t.rep)}` : ''} · 실적 ${t.pts}`;
  },
  short(s, t) { return pfTitle(t); },
  seg(s, t) { return `${t.uni} ${pfTitle(t)}`; },
  title(s, t) { return t.route === 'grad' && t.tier < 2 ? null : pfTitle(t); },
  emp: true,
  cLeft(s, t) { return t.st === 'active' && t.route !== 'grad' && t.cEnd ? t.cEnd - t.months : null; },
  mainSk() { return 'edu'; },
  info(s, t) {
    const R = [['학교', `${t.uni} (${TIER_N[t.uniT]} 대학 · ${(UNIS.find(u => u.n === t.uni) || {}).con || ''}) ${t.dept}`], ['자리', pfTitle(t) + (t.route === 'grad' ? '' : ' (현장 경력)')]];
    const sal = pfSal(t); if (sal) R.push(['월급', fmtWon(sal)]);
    if (t.deg) R.push(['학위', t.deg]);
    // 내 실력 (v131): 강의는 학업 · 교육 · 학과 특기로 한다 (pfLecture). 예전엔 이 줄이 없어서 교육이 쓰이는지 알 수 없었다
    { const p = me(s), D = PF_DEPTS[t.dept] || { sk: [] }, ks = [...new Set(['study', 'edu'].concat(D.sk))].filter(k => SKILLS[k] && has(p, k)); R.push(['내 실력', ks.map(k => `${SKILLS[k].n} ${lvi(p, k)}`).join(' · ') || '-']); }
    if (pfTeaches(t)) R.push(['강의 평가', `${Math.round(t.rep)}`]);
    R.push(['연구·작품 실적', `${t.pts}`]);
    const st = (t.studs || []).map(id => s.people[id]).filter(Boolean);
    if (st.length) R.push(['제자', st.map(p => `${p.name} (${p.job})`).join(' · ')]);
    return R;
  },
  actions(s, t) {
    if (t.st !== 'active') return [];
    const g = t.route === 'grad';
    return [{ t: g && t.tier === 0 ? '대학원 그만두기' : '학교 그만두기', ok: true, danger: true, confirm: '정말 그만둘까요?', run: s => { pfLeave(s, t, `${t.uni} ${pfTitle(t)} (그만둠)`); return `${josa(t.uni, '을를')} 떠났다.`; } }];
  },
  monthly(s, t) { pfMonth(s, t); },
};

// ───── 실시간 창 (12-3): 강의실 ─────
// sub: first 첫 강의 · term 학기 마지막 강의(종강) · last 정년 고별 강의. 강의 점수는 강의 평가(첫 강의는 가르치는 실력)에 그날 운을 더한다
function pfClass(s, t, sub, o) {
  o = o || {};
  if (typeof liveStage !== 'function') return null;
  const base = sub === 'first' ? pfLecture(s, t) * 1.2 : t.rep, nm = me(s).name;
  return liveStage({ k: 'class', vn: 'class', place: '강의실', t: `${t.uni} ${t.dept}`, g: nm, mem: [[nm, '']], mi: 0, key: o.key !== false, sc: U.clamp(base + U.normal(0, 5) + (sub === 'last' ? 8 : 0), 0, 100), z: { fun: (me(s).tal.verbal - 50) / 15 }, x: { room: 'uni', sub, sign: t.uni } });
}
function pfClassBoxes(s, t) { return [['📝', '강의 평가', `${Math.round(t.rep)}`], ['📚', '연구·작품 실적', `${t.pts}`]]; }
// ───── 한 달 ─────
function pfMonth(s, t) {
  if (t.st !== 'active') return;
  const g = t.route === 'grad', n = slotsOn(s, 'c_prof'), p = me(s);
  t.months++; t.stM = (t.stM || 0) + 1;
  if (g && t.tier === 0) addMoney(s, -PF_FEE, '대학원 등록금');
  const sal = pfSal(t); if (sal) earn(s, sal, t.tier >= 3 || !g ? '교수 월급' : '강의료', 'prof');
  // 정년 65세 (겸임 · 초빙은 계약이 끝나면 그만이다)
  if (age(s) >= 65 && !hasQ(s, 'pf_retire') && (g ? t.tier >= 2 : t.type === 'full' || t.type === 'ind')) { queueEv(s, 'pf_retire', 0); return; }
  if (!g && t.cEnd && t.months >= t.cEnd && !hasQ(s, 'pf_renew')) queueEv(s, 'pf_renew', 0);
  if (n) {
    addStress(s, 1.5);
    if (pfTeaches(t)) practice(s, p, 'edu', 0.8 * n);
    if (g) practice(s, p, 'study', 0.6 * n);
    // 강의 평가: 가르치는 실력 × 1.2 쪽으로 조금씩 다가간다
    if (pfTeaches(t)) t.rep = U.clamp(t.rep + (pfLecture(s, t) * 1.2 + U.normal(0, 6) - t.rep) * 0.06, 0, 100);
    // 강의실 창: 첫 강의는 '중요할 때만'에서도, 학기 마지막 강의(6월 · 12월)는 '매번'일 때만
    if (pfTeaches(t) && typeof classShow === 'function') {
      // (예전 세이브에서 이미 오래 가르친 사람은 첫 강의 창을 띄우지 않는다)
      if (!t.lec1) { t.lec1 = 1; if ((t.stM || 0) <= 2) classShow(s, '첫 강의', `${t.uni} ${t.dept}에서 첫 강의를 했다.`, pfClass(s, t, 'first'), { boxes: pfClassBoxes(s, t) }); }
      else if (calM(s) === 5 || calM(s) === 11) classShow(s, '종강', `${t.uni} ${t.dept} 한 학기 강의를 마쳤다.`, pfClass(s, t, 'term', { key: false }), { quiet: true, boxes: pfClassBoxes(s, t) });
    }
    if (t.stM % 6 === 0) pfOutput(s, t);
    if (pfTeaches(t) && (t.studs || []).length < 8 && U.chance(0.035)) pfStudent(s, t);
    if (g && t.tier === 0) t.gw = (t.gw || 0) + 1;
  } else if (pfTeaches(t)) t.rep = Math.max(0, t.rep - 1.5);
  pfStudNews(s, t);
  if (g) pfGradMonth(s, t, n);
}
// 반년마다 연구·작품 실적: 기준을 넘으면 실적 1, 크게 넘으면 2
function pfOutput(s, t) {
  const q = pfResearch(s, t) + t.uniT * 1.5 + U.normal(0, 7), bar = t.route === 'grad' ? PF_BAR[t.tier] : 42;
  if (q < bar) return;
  const k = q >= bar + 12 ? 2 : 1;
  t.pts += k;
  addRes(s, `${t.dept} ${PF_DEPTS[t.dept].sk.some(x => ['art', 'acting', 'dance', 'vocal', 'compose'].includes(x)) ? '작품' : '연구'} 실적이 ${k === 2 ? '학계에서 크게 주목받았다' : '인정받았다'}. (실적 ${t.pts})`, 'career');
  const up = pfPromote(s, t); if (up) addLog(s, up, 'good');
}
function pfStudent(s, t) {
  const d = PF_DEPTS[t.dept], k = d.sk[0];
  const x = makePerson(s, { age: U.int(19, 23), rel: '제자', job: '대학생', aff: 45, met: `${t.uni} ${t.dept} (내 제자)`, skills: { [k]: U.int(15, 35) } });
  x.ind = true;
  (t.studs = t.studs || []).push(x.id);
  addLog(s, `수업에서 눈에 띄는 학생 ${josa(x.name, '을를')} 만났다. 제자로 삼아 따로 봐 주기로 했다.`, 'career');
}
// 제자가 졸업할 나이가 되면 가끔 데뷔 소식이 온다. 데뷔한 제자가 많을수록 강의 평가가 오른다
function pfStudNews(s, t) {
  for (const id of t.studs || []) {
    const x = s.people[id];
    if (!x || x.job !== '대학생' || pAge(s, x) < 22 || !U.chance(0.012)) continue;
    x.job = PF_DEPTS[t.dept].debut; x.fame = U.int(5, 30);
    t.rep = Math.min(100, t.rep + 3);
    addLog(s, `제자 ${josa(x.name, '이가')} ${josa(x.job, '으로')} 데뷔했다! 학교에서도 축하 현수막을 걸었다.`, 'good');
  }
}

// ───── 대학원 길 ─────
function pfGradMonth(s, t, n) {
  // 대학원생: 일정에 강의·연구를 넣은 달만 학위 과정이 나아간다
  if (t.tier === 0) {
    if (!n) t.gradEnd++;
    if (s.t < t.gradEnd || hasQ(s, 'pf_phd')) return;
    if (!t.deg) { t.deg = '석사'; milestone(s, `${age(s)}세에 ${t.uni} ${t.dept} 석사 학위를 받았다.`); queueEv(s, 'pf_phd', 0); return; }
    if (t.pts < PF_UP.pts[1]) { t.gradEnd = s.t + 6; addLog(s, '박사 논문 심사에서 실적이 모자라다는 말을 들었다. 반년 더 연구한다.', 'bad'); return; }
    t.deg = '박사'; t.tier = 1; t.stM = 0;
    milestone(s, `${age(s)}세에 ${t.uni} ${t.dept} 박사 학위를 받았다.`);
    addLog(s, `박사 학위를 받았다! 이제 시간강사 자리를 찾거나 교수 임용에 지원할 수 있다.`, 'good');
    return;
  }
  // 박사: 가끔 시간강사 자리가 들어온다
  if (t.tier === 1 && !hasQ(s, 'pf_lect') && U.chance(0.12)) queueEv(s, 'pf_lect', 0);
  // 조교수 · 부교수 · 정교수: 해마다 승진 심사
  if (t.tier >= 3 && t.stM % 12 === 0) { const up = pfPromote(s, t, true); if (up) addLog(s, up, 'good'); }
}
// 승진: 조교수 → 부교수 → 정교수는 그 자리에서 6년 + 실적, 석좌교수는 실적 + 지능 (해마다 심사, 붙을 가능성 40%)
function pfPromote(s, t, review) {
  if (t.route !== 'grad' || t.tier < 3 || t.tier >= 6) return '';
  const k = t.tier + 1;
  if (t.pts < PF_UP.pts[k] || t.stM < PF_UP.yrs[k] * 12) return '';
  if (k === 6 && (me(s).tal[PF_UP.tal] < PF_UP.min || !review || !U.chance(0.4))) return '';
  t.tier = k; t.stM = 0;
  if (k >= 5) milestone(s, `${age(s)}세에 ${t.uni} ${PF_TIERS[k]}가 되었다.`);
  return `${PF_TIERS[k]}로 승진했다! (${t.uni} ${t.dept})`;
}
E({
  id: 'pf_phd', cat: '대학원', title: '석사 졸업', tag: 'career',
  cond: s => trackOn(s, 'prof') && s.tracks.prof.route === 'grad' && s.tracks.prof.tier === 0,
  text: s => `${s.tracks.prof.uni} ${s.tracks.prof.dept} 석사 과정을 마쳤다. 박사 과정(3년)에 진학할까?`,
  ch: s => [
    { t: '박사 과정에 진학한다', h: `3년 · 등록금 매달 ${fmtWon(PF_FEE)} · 박사 학위를 받으려면 연구·작품 실적이 ${PF_UP.pts[1]} 이상이어야 한다`, f: s => { const t = s.tracks.prof; t.gradEnd = s.t + 36; return '박사 과정에 진학했다.'; } },
    { t: '석사로 마친다', f: s => { pfLeave(s, s.tracks.prof, `${s.tracks.prof.uni} ${s.tracks.prof.dept} 석사`); return '석사 학위를 받고 대학원을 마쳤다.'; } },
  ],
});
E({
  id: 'pf_lect', cat: '강의', title: '시간강사 자리', tag: 'career',
  cond: s => trackOn(s, 'prof') && s.tracks.prof.route === 'grad' && s.tracks.prof.tier === 1,
  init(s, d) { d.uni = uniOf(U.pick([1, 1, 2, 2, 3])).n; },
  text: (s, d) => `${d.uni} ${s.tracks.prof.dept}에서 한 학기 강의를 맡아 달라는 연락이 왔다. 시간강사 자리다. 월급은 ${fmtWon(Math.round(PF_SAL[2] * (0.85 + uniTier(d.uni) * 0.1)) * 1e4)}쯤이다.`,
  ch: (s, d) => [
    { t: '맡는다', nj: 'prof', nm: ['prof2'], f: s => { const t = s.tracks.prof; Object.assign(t, { tier: 2, uni: d.uni, uniT: uniTier(d.uni), stM: 0 }); coMeetJob(s, 'prof'); return `${d.uni} 시간강사가 되었다.`; } },
    { t: '거절한다', f: () => '시간강사 자리를 거절했다.' },
  ],
});
// 대학원 진학: 대학을 졸업했으면 대학 크기마다 지원한다. 붙으면 학과를 고른다
const PF_GRAD_THR = [0, 28, 36, 44];
function pfGradP(s, ut) { const p = me(s), b = pfBestJob(s); return audP(lv(p, 'study') * 0.7 + Math.max(0, ...Object.keys(PF_DEPTS).map(d => pfDeptSk(s, d))) * 0.3 + (p.tal.intel - 50) * 0.2 + (b ? b.tier : 0), PF_GRAD_THR[ut]); }
function pfOn(s) { return trackOn(s, 'prof'); }
for (const ut of [3, 2, 1]) JOB_APPLY.push({
  id: 'prof_grad' + ut, trk: 'prof', g: '🎓 교수', n: `${TIER_N[ut]} 대학 대학원 진학`, tag: `등록금 매달 ${fmtWon(PF_FEE)}`,
  show: s => !pfOn(s) && !!s.edu.uni && age(s) >= 21 && age(s) <= 45 && (s.tracks.prof.deg || '') !== '박사',
  h: s => uniDone(s) ? `합격 가능성 ${fmtPct(pfGradP(s, ut))} · 결과는 다음 달 · 석사 2년 → 박사 3년 → 시간강사 → 교수` : '대학을 졸업해야 지원할 수 있다',
  ok: s => !s.army && uniDone(s) && !hasQ(s, 'pf_grad_res') && !(s.cd['pfg' + ut] > s.t),
  why: s => s.army ? '군 복무 중' : !uniDone(s) ? '대학을 졸업해야 한다' : hasQ(s, 'pf_grad_res') ? '결과를 기다리는 중' : '올해는 이미 지원했다',
  run: s => { s.cd['pfg' + ut] = s.t + 12; queueEv(s, 'pf_grad_res', 1, { ut, uni: uniOf(ut).n, p: pfGradP(s, ut) }); return `${TIER_N[ut]} 대학 대학원에 원서를 냈다.`; },
});
E({
  id: 'pf_grad_res', cat: '대학원', title: '대학원 합격 발표', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); },
  text: (s, d) => d.pass ? `${d.uni} 대학원에 합격했다! 어느 학과에서 공부할까?` : `${d.uni} 대학원에 떨어졌다.`,
  ch: (s, d) => {
    if (!d.pass) return [{ t: '다시 준비한다', f: s => `${d.uni} 대학원에 떨어졌다.` + fx(s, { stress: 3 }) }];
    // 추천 순서: 내 대표 경력의 학과 → 대학 때 학과 → 실기 특기가 높은 학과
    const b = pfBestJob(s), u = s.edu.uni && s.edu.uni.n;
    const L = Object.keys(PF_DEPTS).map((dp, i) => [dp, (b && b.dept === dp ? 1000 : 0) + (u === dp ? 500 : 0) + pfDeptSk(s, dp), i]).sort((a, c) => c[1] - a[1] || a[2] - c[2]);
    return L.map(([dp]) => ({ t: dp, nj: 'prof', nm: ['grad'], h: `실기 특기 ${Math.round(pfDeptSk(s, dp))}레벨${b && b.dept === dp ? ' · 내 경력과 같은 분야' : ''}`, f: s => {
      const old = s.tracks.prof || {};
      pfStart(s, { route: 'grad', tier: 0, uni: d.uni, dept: dp, gradEnd: s.t + (old.deg === '석사' ? 36 : 24) });
      return `${d.uni} 대학원 ${dp}에 들어갔다.`;
    } })).concat([{ t: '가지 않는다', f: () => '대학원에 가지 않기로 했다.' }]);
  },
});
// 교수 임용 (조교수): 박사 · 시간강사가 지원한다. 실적이 많을수록, 강의 평가가 좋을수록 붙기 쉽다
const PF_HIRE_THR = [0, 40, 48, 56];
function pfHireP(s, ut) { const t = s.tracks.prof; return audP(t.pts * 4 + pfResearch(s, t) * 0.5 + (t.tier >= 2 ? t.rep * 0.1 : 0), PF_HIRE_THR[ut]); }
for (const ut of [3, 2, 1]) JOB_APPLY.push({
  id: 'prof_hire' + ut, trk: 'prof', g: '🎓 교수', n: `${TIER_N[ut]} 대학 교수 임용 지원`, tag: `조교수 · 월급 ${PF_SAL[3]}만 원쯤`,
  show: s => pfOn(s) && s.tracks.prof.route === 'grad' && (s.tracks.prof.tier === 1 || s.tracks.prof.tier === 2),
  h: s => `합격 가능성 ${fmtPct(pfHireP(s, ut))} · 결과는 다음 달`,
  ok: s => !s.army && !hasQ(s, 'pf_hire_res') && !(s.cd['pfh' + ut] > s.t),
  why: s => s.army ? '군 복무 중' : hasQ(s, 'pf_hire_res') ? '결과를 기다리는 중' : '올해는 이미 지원했다',
  run: s => { s.cd['pfh' + ut] = s.t + 12; queueEv(s, 'pf_hire_res', 1, { ut, uni: uniOf(ut).n, p: pfHireP(s, ut) }); return `${TIER_N[ut]} 대학 교수 임용에 지원했다.`; },
});
E({
  id: 'pf_hire_res', cat: '임용', title: '교수 임용 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); },
  text: (s, d) => d.pass ? `${d.uni} ${s.tracks.prof.dept} 조교수로 임용됐다!` : `${d.uni} 교수 임용에 떨어졌다.`,
  ch: (s, d) => d.pass ? [
    { t: '부임한다', nj: 'prof', nm: ['prof2', 'fullprof'], f: s => { const t = s.tracks.prof; Object.assign(t, { tier: 3, uni: d.uni, uniT: uniTier(d.uni), stM: 0 }); coMeetJob(s, 'prof'); milestone(s, `${age(s)}세에 ${d.uni} 조교수가 되었다.`); return `${d.uni} ${t.dept} 조교수가 되었다.`; } },
    { t: '거절한다', f: () => `${d.uni}의 임용을 거절했다.` },
  ] : [{ t: '다시 준비한다', f: s => `${d.uni} 교수 임용에 떨어졌다.` + fx(s, { stress: 3 }) }],
});

// ───── 현장 경력 길 ─────
// 겸임교수: 그 분야 5년 이상 + 그 직업 4등급 이상 · 하던 일을 하면서 강의 · 1년 계약
// 산학협력중점교수: 그 분야 15년 이상 + 대학 졸업 · 3년 계약
// 전임교수: 그 분야 10년 이상 + 그 직업 5등급 이상 + 대학 졸업 · 정년까지 (경쟁이 세다)
// 초빙교수: 그 직업 6등급 이상이거나 인지도가 아주 높으면 학교에서 먼저 제안한다 · 2년 계약
const PF_IND = {
  adj: { yrs: 5, tier: 3, uni: false, thr: 30, sc: (s, b) => b.tier * 6 + b.years * 1.5 + lv(me(s), 'edu') * 0.3 },
  ind: { yrs: 15, tier: 0, uni: true, thr: 42, sc: (s, b) => b.years * 2 + b.tier * 4 + lv(me(s), 'edu') * 0.3 },
  full: { yrs: 10, tier: 4, uni: true, thr: 56, sc: (s, b) => b.tier * 7 + b.years + lv(me(s), 'edu') * 0.4 + (s.fame || 0) * 0.2 },
};
function pfIndWhy(s, type) {
  const R = PF_IND[type], b = pfBestJob(s);
  if (!b) return '이어질 현장 경력이 없다';
  if (b.years < R.yrs) return `${jobName(b.id)} 경력이 ${R.yrs}년 이상이어야 한다 (지금 ${b.years}년)`;
  if (b.tier < R.tier) return `${jobName(b.id)} ${R.tier + 1}등급 이상이어야 한다`;
  if (R.uni && !uniDone(s)) return '대학을 졸업해야 한다';
  return '';
}
function pfIndUniT(b) { return U.clamp((b.tier >= 5 ? 3 : b.tier >= 3 ? 2 : 1) + U.int(-1, 0), 1, 3); }
for (const type of ['adj', 'ind', 'full']) JOB_APPLY.push({
  id: 'prof_' + type, trk: 'prof', g: '🎓 교수', n: `${PF_TYPES[type].n} 지원`, tag: type === 'full' ? '정년까지' : `${yrs(PF_TYPES[type].months)} 계약`,
  show: s => !pfOn(s) && age(s) >= 25,
  h: s => { const w = pfIndWhy(s, type), b = pfBestJob(s); return w || `${b.dept} · 합격 가능성 ${fmtPct(audP(PF_IND[type].sc(s, b), PF_IND[type].thr))} · 결과는 다음 달`; },
  ok: s => !s.army && !pfIndWhy(s, type) && !hasQ(s, 'pf_ind_res') && !(s.cd['pfi' + type] > s.t),
  why: s => s.army ? '군 복무 중' : pfIndWhy(s, type) || (hasQ(s, 'pf_ind_res') ? '결과를 기다리는 중' : '올해는 이미 지원했다'),
  run: s => { s.cd['pfi' + type] = s.t + 12; const b = pfBestJob(s); queueEv(s, 'pf_ind_res', 1, { type, dept: b.dept, uni: uniOf(pfIndUniT(b)).n, p: audP(PF_IND[type].sc(s, b), PF_IND[type].thr) }); return `${PF_TYPES[type].n} 자리에 지원했다.`; },
});
function pfIndTake(s, d) {
  const T = PF_TYPES[d.type];
  const t = pfStart(s, { route: 'ind', type: d.type, uni: d.uni, dept: d.dept, cEnd: T.months });
  return `${d.uni} ${d.dept} ${T.n}가 되었다. 월급 ${fmtWon(pfSal(t))}${T.months ? ` · 계약 ${yrs(T.months)}` : ' · 정년까지'}.`;
}
E({
  id: 'pf_ind_res', cat: '임용', title: '교수 임용 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); },
  text: (s, d) => d.pass ? `${d.uni} ${d.dept}에서 ${PF_TYPES[d.type].n}로 와 달라고 한다!` : `${d.uni} ${PF_TYPES[d.type].n} 자리에 떨어졌다.`,
  ch: (s, d) => d.pass ? [{ t: '부임한다', nj: 'prof', nm: d.type === 'full' ? ['prof2', 'fullprof'] : [], ok: s => !pfOn(s), f: s => pfIndTake(s, d) }, { t: '거절한다', f: () => '교수 자리를 거절했다.' }]
    : [{ t: '확인', f: () => `${d.uni} ${PF_TYPES[d.type].n} 자리에 떨어졌다.` }],
});
// 초빙교수 제안 (메시지함): 그 직업 6등급 이상이거나 인지도 60 이상이면 해마다 가끔
function pfInvMaybe(s) {
  if (pfOn(s) || s.army || age(s) < 28 || s.inbox.some(m => m.kind === 'pf_inv') || !U.chance(0.012)) return;
  const b = pfBestJob(s);
  if (!b || !(b.tier >= 5 || (s.fame || 0) >= 60)) return;
  const u = uniOf(b.tier >= 6 || (s.fame || 0) >= 75 ? 3 : U.pick([2, 3]));
  sendMsg(s, 'pf_inv', { from: u.n, title: '초빙교수 제안', months: 3, d: { uni: u.n, dept: b.dept } });
}
INBOX.pf_inv = {
  ic: '🎓',
  text: (s, m) => `${m.from} ${m.d.dept}에서 초빙교수로 와 달라는 연락이 왔다. 그동안의 경력을 학생들에게 가르쳐 달라고 한다. 2년 계약, 월급 ${fmtWon(Math.round(PF_TYPES.inv.sal * (0.85 + uniTier(m.d.uni) * 0.1)) * 1e4)}쯤.`,
  ch: (s, m) => [
    { t: '받아들인다', nj: 'prof', ok: s => !pfOn(s), h: pfOn(s) ? '이미 교수로 일하고 있다' : '', f: s => pfIndTake(s, { type: 'inv', uni: m.d.uni, dept: m.d.dept }) },
    { t: '거절한다', f: () => `${m.from}의 초빙교수 제안을 거절했다.` },
  ],
};
// 계약 만료 (겸임 · 초빙 · 산학협력중점): 강의 평가가 35 이상이면 재계약할 수 있다
E({
  id: 'pf_renew', cat: '계약', title: '교수 계약 만료', tag: 'career',
  cond: s => pfOn(s) && s.tracks.prof.route !== 'grad',
  text: s => { const t = s.tracks.prof; return `${t.uni} ${PF_TYPES[t.type].n} 계약이 끝났다. 강의 평가 ${Math.round(t.rep)}.${t.rep < 35 ? ' 학교는 재계약을 원하지 않는다.' : ''}`; },
  ch: s => {
    const t = s.tracks.prof, T = PF_TYPES[t.type];
    const end = { t: '학교를 떠난다', f: s => { pfLeave(s, t, `${t.uni} ${T.n} (계약 만료)`); return `${josa(t.uni, '을를')} 떠났다.`; } };
    if (t.rep < 35 || age(s) >= 65) return [Object.assign(end, { t: '확인' })];
    return [{ t: '재계약한다', h: yrs(T.months), f: s => { t.cEnd = t.months + T.months; return `${josa(t.uni, '과와')} ${T.n} 재계약을 했다.`; } }, end];
  },
});
E({
  id: 'pf_retire', cat: '정년', title: '정년 퇴임', tag: 'career',
  // 고별 강의를 강의실 창으로 (볼 차례일 때만 창을 띄운다)
  init(s, d) { d.live = pfClass(s, s.tracks.prof, 'last'); },
  keepPop: (s, d) => typeof liveShow === 'function' && liveShow(d.live), live: (s, d) => d.live,
  cond: s => pfOn(s),
  text: s => { const t = s.tracks.prof; return `${t.uni}에서 정년을 맞았다. ${pfTitle(t)}로 마지막 강의를 했다. 제자들이 강의실을 꽉 채웠다.`; },
  ch: () => [{ t: '정년 퇴임한다', f: s => { const t = s.tracks.prof, n = `${t.uni} ${pfTitle(t)} (정년 퇴임 · 명예교수)`; milestone(s, `${age(s)}세에 ${n}.`); pfLeave(s, t, n); return `${t.uni}에서 정년 퇴임했다. 명예교수가 되었다.`; } }],
});
