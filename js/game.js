'use strict';
// 게임의 뼈대: 상태 만들기, 한 달 진행, 일정, 사건 고르기, 저장, 인생 결산

let S = null;
const SAVE_KEY = 'celebLife.save.v4';
const HALL_KEY = 'celebLife.hall.v4';
const MK = ['kr', 'jp', 'us'];
const MK_N = { kr: '한국', jp: '일본', us: '미국' };
const EVENTS = {};
function E(def) { EVENTS[def.id] = def; }
// 직업. 단계별로 careers/*.js 에서 채운다. CAREER_PLAN은 진로 창에 보여 줄 전체 목록
const CAREERS = {};
const CAREER_GROUPS = [
  { id: 'artist', n: '🌟 아티스트', subs: [['music', '음악'], ['video', '방송·영상']] },
  // v196: 스태프에 사무직 (A&R 담당자 · 마케터). 백과사전에서 하위 분류도 접고 펼친다
  { id: 'staff', n: '🛠 스태프', subs: [['music', '음악'], ['video', '방송·영상'], ['office', '사무직']] },
  { id: 'biz', n: '🏢 회사 경영', subs: [['biz', '']] },
];
const CAREER_PLAN = [
  { id: 'idol', n: '아이돌', g: 'artist', sub: 'music' },
  { id: 'band', n: '밴드 멤버', g: 'artist', sub: 'music' },
  { id: 'solo', n: '솔로 가수 (보컬형·래퍼형·퍼포먼스형)', g: 'artist', sub: 'music' },
  { id: 'player', n: '솔로 뮤지션 (연주가)', g: 'artist', sub: 'music' },
  // 댄서 (피드백 29): 백댄서와 안무 창작 (js/dancer.js)
  { id: 'dancer', n: '댄서', g: 'artist', sub: 'music' },
  { id: 'actor', n: '배우', g: 'artist', sub: 'video' },
  { id: 'variety', n: '예능인', g: 'artist', sub: 'video' },
  { id: 'youtube', n: '스트리머 (개인세 버튜버 포함)', g: 'artist', sub: 'video' },
  { id: 'vidol', n: '버츄얼 아이돌 (회사 소속 버튜버)', g: 'artist', sub: 'video' },
  // 모델: 특기가 아니라 직업 (5단계). 지원·활동 결과는 외모·운동신경 재능과 연기 특기를 본다
  { id: 'model', n: '모델', g: 'artist', sub: 'video' },
  // 7-1단계 (js/anime.js): 성우 · 애니메이터 · 애니메이션 감독
  { id: 'voice', n: '성우', g: 'artist', sub: 'video' },
  { id: 'composer', n: '작곡가', g: 'staff', sub: 'music' },
  { id: 'lyricist', n: '작사가', g: 'staff', sub: 'music' },
  { id: 'producer', n: '프로듀서', g: 'staff', sub: 'music' },
  { id: 'anr', n: 'A&R 담당자', g: 'staff', sub: 'office' },
  { id: 'trainer', n: '트레이너 (보컬·악기·댄스)', g: 'staff', sub: 'music' },
  // 7-4단계 (js/marketer.js): 기획사 마케팅팀
  { id: 'marketer', n: '마케터', g: 'staff', sub: 'office' },
  { id: 'director', n: '연출감독', g: 'staff', sub: 'video' },
  { id: 'writer', n: '시나리오 작가', g: 'staff', sub: 'video' },
  // 7-2단계 (js/webnovel.js): 웹툰 작가 · 웹소설 작가
  { id: 'webtoon', n: '웹툰 작가', g: 'staff', sub: 'video' },
  { id: 'webnovel', n: '웹소설 작가', g: 'staff', sub: 'video' },
  // 7-3단계 (js/illust.js): 일러스트레이터
  { id: 'illust', n: '일러스트레이터', g: 'staff', sub: 'video' },
  // 7-3단계 (js/prof.js): 교수 (현장 경력 길 · 대학원 길)
  { id: 'prof', n: '교수', g: 'staff', sub: 'office' },
  // 7-4단계 (js/tutor.js): 학원 강사 → 인강 강사 → 1타 강사
  { id: 'tutor', n: '강사 (1타 강사)', g: 'staff', sub: 'office' },
  { id: 'editor', n: '편집자', g: 'staff', sub: 'video' },
  { id: 'acttrainer', n: '연기 트레이너', g: 'staff', sub: 'video' },
  { id: 'animator', n: '애니메이터', g: 'staff', sub: 'video' },
  { id: 'adir', n: '애니메이션 감독', g: 'staff', sub: 'video' },
  // 회사는 하나만: 기획사·버츄얼 아이돌 기획사·MCN·영상 제작사·애니메이션 제작사는 모두 이 회사의 분야다 (js/company.js)
  { id: 'agency', n: '회사 대표', g: 'biz', sub: 'biz' },
];
const CAREER_IDS = CAREER_PLAN.map(c => c.id);

// ───── 기본 조회 ─────
function age(s) { return Math.floor(s.t / 12); }
function calY(s) { return s.birthYear + Math.floor((s.birthMonth + s.t) / 12); }
function calM(s) { return (s.birthMonth + s.t) % 12; }
// 학년 (v117): 3월에 한 학년 오른다. 초1 = 1 … 고3 = 12 (0 이하는 입학 전, 13부터는 졸업한 뒤). 생일이 아니라 태어난 해로 정한다
function schoolYear(s) { return calY(s) - s.birthYear - 6 - (calM(s) < 2 ? 1 : 0); }
// 대학 다니는 중 (3월 입학 전 합격 기간은 빼고)
function inUni(s) { const u = s.edu && s.edu.uni; return !!u && s.t >= (u.st || 0) && s.t < u.end; }
function per(s) { return PERSONA_BY[s.persona]; }
function pm(s, k, def = 1) { const v = per(s).mods[k]; return v == null ? def : v; }
function totalFans(s) { return s.fans.kr + s.fans.jp + s.fans.us; }
function trackOn(s, id) { const t = s.tracks[id]; return !!t && t.st !== 'none' && t.st !== 'ended'; }
function anyTrackActive(s) { return CAREER_IDS.some(id => CAREERS[id] && trackOn(s, id)); }
function isDorm(s) { return CAREER_IDS.some(id => CAREERS[id] && CAREERS[id].dorm && CAREERS[id].dorm(s, s.tracks[id])); }
function access(s) { return isDorm(s) ? 1 : REGION_BY[s.region].access; }
function mom(s) { return s.family.mom ? s.people[s.family.mom] : null; }
function dad(s) { return s.family.dad ? s.people[s.family.dad] : null; }
function parentsAlive(s) { return [mom(s), dad(s)].filter(p => p && p.alive); }
function graduated(s) { return age(s) >= 19 || !!s.edu.graduated; }
// 지금 맺고 있는 소속 계약. 소속 계약은 한 곳하고만 할 수 있다 (직업 파일에서 contract()를 채운다)
// 사람을 뽑고 가르치는 직업(트레이너·연기 트레이너·프로듀서·감독·영화감독·회사 대표)은 스카우트가 없으면 일하면서 생긴다 (한 달 5%)
const SCOUT_JOBS = { trainer: '연습생들을 평가하다 보니', acttrainer: '신인 배우들을 평가하다 보니', producer: '가수들을 고르다 보니', director: '배우 오디션을 보다 보니', agency: '지원자들을 보다 보니' };
// v101 (8-6): 저절로 생기지 않고 '사람 보는 눈' 사건으로 고른다. 거절했거나 특기가 10개면 묻지 않는다
function scoutByWork(s) {
  if (has(me(s), 'scout') || !skAsk(s, 'scout') || hasQ(s, 'scout_work')) return;
  const id = Object.keys(SCOUT_JOBS).find(k => trackOn(s, k) && slotsOn(s, 'c_' + k));
  if (id && U.chance(0.05)) queueEv(s, 'scout_work', 0, { id });
}
function agencyContract(s) {
  for (const id of CAREER_IDS) { const c = CAREERS[id]; if (c && c.contract && trackOn(s, id)) { const n = c.contract(s, s.tracks[id]); if (n) return n; } }
  return '';
}
function contractWhy(s) { if (trackOn(s, 'agency')) return '내 회사를 운영하는 동안에는 다른 회사와 계약할 수 없다'; const c = agencyContract(s); return c ? `지금 ${josa(c, '과와')} 계약 중이라 다른 곳과는 계약할 수 없다` : ''; }
// 아티스트 전속 계약만 (회사 직원 계약은 인디 밴드·인디 가수처럼 혼자 하는 활동을 막지 않는다)
function artistContract(s) {
  for (const id of CAREER_IDS) { const c = CAREERS[id]; if (c && c.contract && !c.emp && trackOn(s, id)) { const n = c.contract(s, s.tracks[id]); if (n) return n; } }
  return '';
}
function artistContractWhy(s) { const c = artistContract(s); return c ? `지금 ${josa(c, '과와')} 전속 계약 중이라 따로 활동할 수 없다` : ''; }

// ───── 겸직 (9단계, v104) ─────
// 직업은 세 개까지 같이 할 수 있다. 기본은 겸직이 되고, 어색한 조합(JOB_RULES)만 막는다
// 이미 하고 있던 조합(예전 세이브)은 그대로 두고, 새로 시작하거나 자리를 바꿀 때만 본다
const JOB_CAP = 3;
const FACE_JOBS = ['idol', 'band', 'solo', 'player', 'dancer', 'actor', 'variety', 'model', 'youtube'];
function jobCount(s) { return CAREER_IDS.filter(id => CAREERS[id] && trackOn(s, id)).length; }
// 직업 하나의 성격 (꼬리표). 지금 하는 직업은 상태에서 읽고, 새로 시작하는 직업은 extra로 성격을 붙인다 (회사 오디션이면 'artist')
//  trainee 연습생 · artist 전속 계약 중인 아티스트 (아이돌 · 회사 밴드 · 회사 솔로 · 소속사 배우 · 에이전시 모델) · face 얼굴이 나오는 일 · vt 개인세 버튜버
//  gong 공채 개그맨 (공채 1년) · grad 대학원 길 · prof2 시간강사 이상 · fullprof 전임교수 (현장 경력 전임 · 대학원 길 조교수 이상)
//  emp 월급 받는 회사 직원 · bcvoice 방송사 전속 성우 · ceo 회사 대표 · cl 작곡 · 작사
function jobTags(s, id, extra) {
  const T = new Set([id]), t = trackOn(s, id) ? s.tracks[id] : null, c = CAREERS[id];
  if (FACE_JOBS.includes(id)) T.add('face');
  if (id === 'composer' || id === 'lyricist') T.add('cl');
  if (id === 'agency') T.add('ceo');
  for (const x of extra || []) T.add(x);
  if (t) {
    if (id === 'agency' && t.hire) T.add('emp');
    if (id === 'idol') T.add(t.st === 'trainee' ? 'trainee' : 'artist');
    if ((id === 'band' || id === 'solo') && t.st === 'signed') T.add('artist');
    if (id === 'actor' && (t.via === 'agency' || t.via === 'music')) T.add('artist');
    if (id === 'model' && t.ag) T.add('artist');
    if (id === 'youtube' && t.mode === 'vt') T.add('vt');
    if (id === 'variety' && t.gongM > 0) T.add('gong');
    if (id === 'voice' && t.mode === 'bc') T.add('bcvoice');
    if (id === 'prof') {
      const g = t.route === 'grad';
      if (g) T.add('grad');
      if ((g && t.tier >= 2) || t.type === 'full') T.add('prof2');
      if ((g && t.tier >= 3) || t.type === 'full') T.add('fullprof');
    }
    if (id !== 'agency' && c && c.emp && c.contract && c.contract(s, t) && t.sal > 0) T.add('emp');
  }
  if (T.has('vt')) T.delete('face');
  return T;
}
const isArtistT = T => T.has('artist');
// [한쪽, 다른 쪽, 막는 이유] — 어느 쪽이 먼저든 같이 할 수 없다
const JOB_RULES = [
  [T => T.has('trainee'), T => !T.has('cl'), '연습생은 작곡 · 작사 말고는 다른 직업을 같이 할 수 없다'],
  [isArtistT, T => T.has('gong'), '전속 계약 중인 아티스트는 공채 개그맨을 같이 할 수 없다'],
  [isArtistT, T => T.has('tutor'), '전속 계약 중인 아티스트는 학원 강사를 같이 할 수 없다'],
  [isArtistT, T => T.has('grad') || T.has('fullprof'), '전속 계약 중인 아티스트는 대학원 · 전임교수를 같이 할 수 없다 (겸임 · 초빙교수는 된다)'],
  [isArtistT, T => T.has('editor') || T.has('animator') || T.has('illust'), '전속 계약 중인 아티스트는 영상 편집 · 애니메이터 · 일러스트 일을 따로 할 수 없다'],
  [isArtistT, T => T.has('producer'), '전속 계약 중인 아티스트는 프로듀서 일을 따로 할 수 없다 (회사가 허락한 프로듀싱 의뢰는 맡을 수 있다)'],
  [T => T.has('vidol'), T => T.has('face') || T.has('voice'), '버츄얼 아이돌은 얼굴이 나오는 일이나 성우 일을 같이 할 수 없다'],
  [T => T.has('fullprof'), T => T.has('tutor'), '전임교수는 학원 강의를 같이 할 수 없다'],
  [T => T.has('emp'), T => T.has('prof2'), '회사에 다니면서 시간강사 · 전임교수를 같이 할 수 없다 (대학원 · 겸임 · 초빙교수는 된다)'],
  [T => T.has('emp'), T => T.has('tutor'), '회사에 다니면서 학원 강사를 같이 할 수 없다'],
  [T => T.has('ceo'), T => T.has('dancer'), '회사 대표는 백댄서 일을 같이 할 수 없다'],
  [T => T.has('bcvoice'), T => T.has('variety') || T.has('actor'), '방송사 전속 성우는 예능 · 배우 일을 같이 할 수 없다'],
];
// 직업 id를 새로 시작하거나(지금 하고 있으면 extra 성격으로 자리를 바꾸거나) 할 수 있는지. 막히면 이유, 되면 ''
function jobBlock(s, id, extra) {
  if (!trackOn(s, id) && jobCount(s) >= JOB_CAP) return `직업은 ${JOB_CAP}개까지라 하나를 그만둬야 새로 할 수 있다`;
  const A = jobTags(s, id, extra);
  for (const o of CAREER_IDS) {
    if (o === id || !CAREERS[o] || !trackOn(s, o)) continue;
    const B = jobTags(s, o);
    for (const [a, b, why] of JOB_RULES) if ((a(A) && b(B)) || (a(B) && b(A))) return why;
  }
  return '';
}
// 사건 · 메시지 선택지에 nj(이 선택지로 시작하는 직업)가 있으면 겸직 규칙을 본다. nm은 그 자리의 성격 꼬리표
// 막히면 그 선택지만 못 누르게 하고 이유를 보여 준다 (거절 같은 다른 선택지가 늘 같이 있는 곳에만 붙인다)
function njGate(s, L) {
  return L.map(c => { if (!c || !c.nj) return c; const w = jobBlock(s, c.nj, c.nm); return w ? Object.assign({}, c, { ok: () => false, h: w }) : c; });
}
// 직업 지원 창의 지원 하나가 어떤 자리인지 (id로 정한다)
const JA_TAGS = [
  [/^(idol_|bandtr_)/, ['trainee']],
  [/^(bandsign_|solo_(?!indie$)|model_(?!free$)|actor_(?!music$|indie$))/, ['artist']],
  [/^(marketer_|anr_|tr_|acttrainer_|pin_|editor_\d|editor_mcn_|animator_\d|adir_ep$|director_ad$|voice_bc_)/, ['emp']],
  [/^voice_bc_/, ['bcvoice']],
  [/^variety_gong$/, ['gong']],
  [/^prof_grad/, ['grad']],
  [/^prof_hire/, ['grad', 'prof2', 'fullprof']],
  [/^prof_full$/, ['prof2', 'fullprof']],
  [/^youtube_vt/, ['vt']],
];
function jaTags(id) { const x = []; for (const [re, tg] of JA_TAGS) if (re.test(id)) x.push(...tg); return x; }
// 활동 지원 중 붙으면 직업이 생기는 것 (그 직업을 아직 안 할 때만 본다)
const AA_JOB = { drama_aud: 'actor' };
function aaBlock(s, a) {
  const trk = AA_JOB[a.id];
  if (trk) return trackOn(s, trk) ? '' : jobBlock(s, trk);
  if (a.id === 'var_guest' && trackOn(s, 'vidol')) return '버츄얼 아이돌은 얼굴이 나오는 방송에 나갈 수 없다';
  return '';
}
// 모든 직업 · 활동 지원에 자숙과 겸직 규칙을 씌운다. 모든 직업 파일이 JOB_APPLY · ACT_APPLY를 채운 뒤 ui.js가 한 번 부른다
// (자숙은 원래 scandal.js에서 씌웠는데, scandal.js보다 뒤에 읽는 직업 파일의 지원은 빠져 있었다)
function gateApplies() {
  if (gateApplies.done) return;
  gateApplies.done = true;
  for (const a of JOB_APPLY.concat(ACT_APPLY)) {
    const ok = a.ok, why = a.why, job = JOB_APPLY.includes(a), ex = jaTags(a.id);
    const jb = s => job ? (a.trk ? jobBlock(s, a.trk, ex) : '') : aaBlock(s, a);
    a.ok = s => !s.hiatus && !jb(s) && (!ok || ok(s));
    a.why = s => s.hiatus ? `자숙 중이다 (${s.hiatus.left}개월 남음)` : jb(s) || (why ? why(s) : '');
  }
}
// 지금부터 m개월 뒤가 몇 년 몇 월인지
function ymLater(s, m) { const tt = s.t + m; return `${s.birthYear + Math.floor((s.birthMonth + tt) / 12)}년 ${(s.birthMonth + tt) % 12 + 1}월`; }
// 계약이 있는 직업만: "계약 2031년 5월까지"
function contractLine(s, id) { const c = CAREERS[id]; if (!c || !c.cLeft || !trackOn(s, id)) return ''; const m = c.cLeft(s, s.tracks[id]); return m == null ? '' : `계약 ${ymLater(s, Math.max(0, m))}까지`; }
function careerStatus(s, id) { const c = CAREERS[id], st = c.status ? c.status(s, s.tracks[id]) : '', cl = contractLine(s, id); return st + (st && cl ? ' · ' : '') + cl; }
// 그 직업 활동과 가장 가까운 특기 하나 ("보컬 34레벨")
function careerSkill(s, id) {
  const c = CAREERS[id];
  if (!c || !c.mainSk || !trackOn(s, id)) return '';
  const k = c.mainSk(s, s.tracks[id]);
  if (!k) return '';
  return has(me(s), k) ? `${SKILLS[k].n} ${lvi(me(s), k)}레벨` : '';
}
function popWord(v) { return v >= 80 ? '국민 호감' : v >= 62 ? '호감' : v >= 42 ? '보통' : v >= 25 ? '비호감' : '안티 많음'; }
function repWord(v) { return v >= 80 ? '모두가 칭찬' : v >= 62 ? '좋은 사람' : v >= 42 ? '무난' : v >= 25 ? '뒷말 있음' : '적이 많음'; }
function wealthWord(w) { return w <= 1 ? '가장 가난한' : w <= 3 ? '형편이 빠듯한' : w <= 6 ? '평범한' : w <= 8 ? '형편이 넉넉한' : '아주 부유한'; }

// ───── 기록 ─────
// v179: 맡긴 일(CEO · 전담 프로듀서)이 남기는 기록은 dl 표시를 붙여 요약 창의 '특별한 일'에 넣지 않는다 (DL_N > 0인 동안)
let DL_N = 0;
function dlRun(fn) { DL_N++; try { return fn(); } finally { DL_N--; } }
function addLog(s, x, k) {
  s.log.push(DL_N > 0 ? { t: s.t, a: age(s), x, k: k || '', dl: 1 } : { t: s.t, a: age(s), x, k: k || '' });
  if (s.log.length > 4000) s.log.splice(0, s.log.length - 4000);
}
function milestone(s, x) { s.ms.push({ a: age(s), x }); }
function msText(m) { return /^(\d+세|\d{4}년|타고난)/.test(m.x) ? m.x : `${m.a}세에 ${m.x}`; }
function award(s, n) { s.awards.push({ n, y: calY(s), a: age(s) }); milestone(s, `${age(s)}세에 ${josa(n, '을를')} 받았다.`); }
// 작품별 수입(w.pay): 출연료·연출료·원고료·정산금·상금·저작권료 등을 모두 '수입'으로 그 작품에 모은다
// 공개 전에 받은 돈은 s.payPend[제목]에 두었다가 작품이 기록될 때 합치고, 공개 뒤에 들어오는 돈(저작권료·판권 등)은 workPay로 더한다
function payPend(s, title, v) { if (!(v > 0) || !title) return; s.payPend = s.payPend || {}; s.payPend[title] = (s.payPend[title] || 0) + Math.round(v); }
function workPay(s, title, v) { if (!(v > 0) || !title) return; for (let i = s.works.length - 1; i >= 0; i--) if (s.works[i].title === title) { s.works[i].pay = (s.works[i].pay || 0) + Math.round(v); return; } }
function addWork(s, w) {
  const pend = (s.payPend || {})[w.title] || 0; if (pend) delete s.payPend[w.title];
  const pay = Math.round((w.pay || 0) + pend);
  s.works.push(Object.assign({ y: calY(s), a: age(s) }, w, { pay: pay || undefined }));
}

// 수치를 바꾸고 "(보컬 +2 · 돈 -3만 원)" 같은 꼬리말을 돌려준다. sk: { 특기: 양 } 은 배운 특기만 오른다
function fx(s, o) {
  const parts = [];
  for (const k in o) {
    const v = o[k];
    if (!v) continue;
    if (k === 'sk') { for (const x in v) { const t = bumpSkill(s, x, v[x]); if (t) parts.push(t); } }
    else if (k === 'pop') { const L = popJobsOn(s); if (L.length) { const d = Math.round(jpopAll(s, v)); if (d) parts.push('인기 ' + sgn(d)); } }
    else if (k === 'jp') { for (const id in v) { const d = Math.round(jpopAdd(s, id, v[id])); if (d) parts.push(`${jobName(id)} 인기 ${sgn(d)}`); } }
    else if (k === 'fame') { const b = s.fame || 0; addFame(s, v); const d = Math.round(s.fame) - Math.round(b); if (d) parts.push('인지도 ' + sgn(d)); }
    else if (k === 'stress' || k === 'rep') {
      let vv = v;
      // 사건으로 오르는 스트레스: 노력파는 더(stressGain), 예민함은 감정 기복이 커서 더(swing)
      if (k === 'stress' && v > 0) vv = v * pm(s, 'stressGain') * pm(s, 'swing');
      const b = s[k]; s[k] = U.clamp(b + vv, 0, 100);
      const d = Math.round(s[k]) - Math.round(b);
      if (d) parts.push({ stress: '스트레스', rep: '평판' }[k] + ' ' + sgn(d));
    } else if (k === 'money') {
      // 고등학교 졸업 전 자잘한 지출은 가족이 낸다 (내 돈은 그대로)
      const fam = v < 0 && !graduated(s) && parentsAlive(s).length;
      addMoney(s, v, v > 0 ? '기타 수입' : '기타 지출');
      parts.push(fam ? '가족이 낸 돈 ' + fmtWon(-v) : '돈 ' + (v > 0 ? '+' : '') + fmtWon(v));
    } else if (k === 'fkr' || k === 'fjp' || k === 'fus') {
      const m = k.slice(1); const b = s.fans[m];
      s.fans[m] = Math.max(0, Math.round(b + v));
      const d = s.fans[m] - b;
      if (d) parts.push(MK_N[m] + ' 팬 ' + (d > 0 ? '+' : '-') + fmtFans(Math.abs(d)));
    } else if (k === 'tal') { for (const t in v) { const p = me(s); const b = p.tal[t]; p.tal[t] = U.clamp(b + v[t], 0, 100); const d = p.tal[t] - b; if (d && !TALENT_BY[t].hidden) parts.push(`${TALENT_BY[t].n} 재능 ${sgn(d)}`); } }
  }
  return parts.length ? ' (' + parts.join(' · ') + ')' : '';
}

let MONEY_TAP = null;
function addMoney(s, v, label, ent) {
  v = Math.round(v);
  // 고등학교 졸업 전 일상 지출은 가족 생활비로 처리한다
  if (v < 0 && !graduated(s) && parentsAlive(s).length && ['기타 지출', '군것질·용품'].includes(label)) { s.mon.familyPaid = (s.mon.familyPaid || 0) - v; return; }
  s.money += v;
  if (v > 0) { s.mon.inc += v; if (ent) { s.mon.ent += v; s.earned += v; s.lastEntT = s.t; } }
  else s.mon.exp += -v;
  if (label) { s.mon.items[label] = (s.mon.items[label] || 0) + v; s.yinc[label] = (s.yinc[label] || 0) + v; }
  // 요약 창의 큰 정산 한 줄 (v118 UI A4): 넘어가는 동안 들어온 돈을 이름별로 모은다. 지난달에도 들어온 돈(월급 · 매달 공연 수입)은 늘 들어오는 돈으로 친다
  if (label && v > 0) { const seen = s.incSeen = s.incSeen || {}, prev = seen[label]; seen[label] = s.t; if (MONEY_TAP) { const o = MONEY_TAP[label] = MONEY_TAP[label] || { v: 0, big: 0, reg: false }; o.v += v; o.big = Math.max(o.big, v); if (prev === s.t - 1) o.reg = true; } }
}
// 직업별 번 돈 (피드백 20): 업계에서 번 돈이 들어올 때 어느 직업으로 번 돈인지도 적는다 (s.jobEarn[직업])
// 직업은 ① earn에 직접 넘긴 것 ② 그 직업에서만 쓰는 돈 이름(EARN_LABEL) ③ 그 직업의 매달 처리 중이면 그 직업(EARN_JOB) 순서로 정한다
// 어느 직업도 아닌 돈(시상식 상금·아르바이트 등)은 '그 밖에'로 보인다. brand·musical은 직업이 아닌 활동 묶음이다
let EARN_JOB = null;
const EARN_LABEL = {
  '단편 상영권 판매': 'director', '부가 판권': 'director', '뮤직비디오 연출': 'director', '광고 연출': 'director',
  '전속 계약금': 'director',
  '원고료': 'writer', '공모전 상금': 'writer', '각본 수정료': 'writer', '2차 판권·굿즈': 'writer',
  '유료 광고 영상': 'youtube', '굿즈 판매': 'youtube', '개인 행사': 'youtube', '라이브온 광고비': 'youtube', '라이브온 광고 수익': 'youtube',
  '페스티벌 출연료': 'band', '공연 정산': 'band', '공연 수입': 'band',
  '음반·음원 정산': 'solo', '일본 공연': 'solo', '오디션 우승 상금': 'solo', '공연·행사': 'solo',
  '세션 연주비': 'player', '독주회 출연료': 'player', '공연·레슨': 'player',
  '작곡 계약금': 'composer', '작사 계약금': 'lyricist',
  '프로듀싱 비용': 'producer', '성과급': 'producer', 'A&R 성과급': 'anr', '데뷔 성과급': 'trainer', '안무비': 'trainer', '캐스팅 성과급': 'acttrainer',
  '예능 출연료': 'variety', '방송사 공채 월급': 'variety', '출연료': 'actor', '편집비': 'editor', '전담 편집 월급': 'editor', '모델 출연료': 'model', '댄서 출연료': 'dancer', '안무 창작료': 'dancer', '작화비': 'animator', '일러스트 작업비': 'illust', '교수 월급': 'prof', '강의료': 'prof', '학원 강의료': 'tutor', '인강 수익': 'tutor', '교재 인세': 'tutor', '마케팅 월급': 'marketer', '마케팅 성과급': 'marketer', '이모티콘 판매 수익': 'illust', '웹툰 원고료': 'webtoon', '웹툰 유료 결제': 'webtoon', '웹툰 판권료': 'webtoon', '웹툰 공모전 상금': 'webtoon', '웹소설 원고료': 'webnovel', '웹소설 유료 결제': 'webnovel', '웹소설 판권료': 'webnovel', '웹소설 공모전 상금': 'webnovel', '애니 연출료': 'adir', '성우 출연료': 'voice',
  '3D 데뷔 방송 후원': 'vidol', '굿즈': 'vidol', '3D 라이브': 'vidol', '이적 계약금': 'vidol',
  '광고 모델료': 'brand', '뮤지컬 출연료': 'musical',
};
const EARN_EXTRA = { brand: '📺 광고 모델', musical: '🎭 뮤지컬' };
// 최근 12달 수입 기록 (직업 창 '수입'의 '최근 1년 평균', 피드백 24)
function incPush(t, v) { (t.incH = t.incH || []).push(Math.round(v || 0)); if (t.incH.length > 12) t.incH.shift(); }
function incAvg(t) { const H = t.incH || []; return H.length ? Math.round(H.reduce((a, b) => a + b, 0) / H.length / 1e4) * 1e4 : 0; }
function jobEarnAdd(s, j, v) { if (!j || !(v > 0)) return; const E = s.jobEarn = s.jobEarn || {}; E[j] = (E[j] || 0) + Math.round(v); }
function earn(s, v, label, job) {
  if (!(v > 0)) return;
  const j = job || EARN_LABEL[label] || EARN_JOB, co = ownCo(s, j);
  // 내 회사 소속 활동이면 수익은 자본금으로 (회사에서 꺼낼 때 '업계에서 번 돈'이 된다)
  if (co) { coIn(co, v, OWN_CO_N[j] + ' 수입', ownCoF(s, j)); return; }
  addMoney(s, v, label, true); jobEarnAdd(s, j, v);
}
// ───── 내 회사 소속 활동 (v105, 9-2) ─────
// 회사 대표가 회사 분야와 같은 아티스트 일을 하면 내 회사 소속으로 친다
//  기획사 → 솔로 가수 · 밴드 · 연주가 / 버츄얼 아이돌 기획사 → 개인세 버튜버 / MCN → 스트리머 · 버튜버
// 그 일의 비용과 수익은 모두 자본금에서 나가고 자본금으로 들어온다. 회사 그룹 · 기수 · 크리에이터 명단에 나를 넣지는 않는다
const OWN_CO_N = { solo: '대표 솔로 활동', band: '대표 밴드 활동', player: '대표 연주 활동', youtube: '대표 채널 활동' };
function ownCoFit(t, job, vt) { if (t.hire) return false; const f = t.f || {}; return job === 'youtube' ? !!(f.mcn || (vt && f.vidol)) : !!OWN_CO_N[job] && !!f.music; }
// 지금 그 일을 내 회사 소속으로 하고 있으면 회사(s.tracks.agency), 아니면 null
function ownCo(s, job) {
  if (!job || !OWN_CO_N[job] || !trackOn(s, 'agency') || !trackOn(s, job)) return null;
  const j = s.tracks[job];
  if (j.st === 'signed' || (job === 'youtube' && (j.mcn || j.corp))) return null;
  return ownCoFit(s.tracks.agency, job, j.mode === 'vt') ? s.tracks.agency : null;
}
// 아직 시작하지 않은 일을 시작할 때 (버튜버 아바타 맞추기)
function ownCoNew(s, job, vt) { return trackOn(s, 'agency') && ownCoFit(s.tracks.agency, job, vt) ? s.tracks.agency : null; }
function ownCoTag(s, job) { const t = ownCo(s, job); return t ? `내 회사 「${t.name}」 소속` : ''; }
// 그 일에 쓸 수 있는 돈 · 그 일의 비용 내기 (내 회사 소속이면 자본금에서)
// 내 회사 소속 활동은 그 분야 회사 돈으로 (v169: 회사마다 자본금): 솔로 · 밴드 · 연주는 기획사, 채널은 MCN (버튜버는 버츄얼 아이돌 기획사가 있으면 거기)
function ownCoF(s, job) { const t = s.tracks.agency || {}, f = t.f || {}; return job === 'youtube' ? (f.vidol && (!f.mcn || (s.tracks.youtube || {}).mode === 'vt') ? 'vidol' : 'mcn') : 'music'; }
function jobMoney(s, job) { const t = ownCo(s, job); return t ? coM(t, ownCoF(s, job)) : s.money; }
function jobPay(s, v, label, job) { const t = ownCo(s, job); if (t) coOut(t, v, OWN_CO_N[job] + ' 비용', ownCoF(s, job)); else addMoney(s, -v, label); }
function addStress(s, v) { if (v > 0) v *= pm(s, 'stressGain'); s.stress = U.clamp(s.stress + v, 0, 100); }
function schoolBonus(s, k) {
  const a = age(s), e = s.edu;
  // 예술고 · 특성화고 학과(1.25)와 고등학교 동아리(1.2)는 서로, 그리고 장비와 곱한다 (v117 동아리)
  const hs = schoolYear(s) >= 10 && !e.graduated;
  let b = 1;
  if (e.hsBonus && hs && e.hsBonus.includes(k)) b *= 1.25;
  if (e.club === k && hs) b *= CLUB_MULT;
  if (b > 1) return b;
  if (inUni(s) && e.uni.bonus.includes(k)) return 1.25;
  return 1;
}

// ───── 이름·제목 ─────
// 지어낸 이름(그룹명·곡 제목·작품 제목)이 이번 인생에서 이미 나온 이름(내 그룹·밴드, 내 작품, 함께 일한 가수)과 겹치지 않게 한다
// 지금 진행 중인 인생은 tick이 기억해 둔다 (NAME_S)
let NAME_S = null;
function nameTaken(n) { const s = NAME_S; return !!s && ((s.usedNames || []).includes(n) || (s.works || []).some(w => w.title === n || w.by === n)); }
function freshName(gen) { let n; for (let i = 0; i < 40; i++) { n = gen(); if (!nameTaken(n)) return n; } return n; }
// 꾸밈말과 낱말이 같은 말을 품거나(새벽 새벽 · Moonlight Moon), 계절이 둘 다 들어가거나(한여름 겨울), 유명한 곡과 같으면 다시 뽑는다
function songPair(A, B) { let a, b, t; for (let i = 0; i < 50; i++) { a = U.pick(A); b = U.pick(B); t = a + ' ' + b; if (!a.includes(b) && !b.includes(a) && !(/봄|여름|가을|겨울/.test(a) && /봄|여름|가을|겨울/.test(b)) && !SONG_BAN.includes(t)) break; } return t; }
// 그룹 이름 + 뒤 글자: JUKEBOXS · MYTHOSS · FIREFLYS · HI-FIS처럼 읽기 어려운 짝은 빼고 고른다
// 뒤에 붙는 숫자는 그룹 인원수와 같고, 앞에 띄어쓰기나 _를 둔다 (STARFALL 5 · STARFALL_5). size 0 = 인원을 아직 모름(숫자 안 붙임), 안 주면 인원이 화면에 안 나오는 다른 회사 그룹이라 4~9명 중 하나
function groupNameRaw(size = U.int(4, 9)) { const b = U.pick(GROUP_NAMES), x = U.pick(GROUP_SUFFIX.filter(x => !(x === 'N' && !size) && !(x === 'S' && /[SXZHYI]$/.test(b)) && !(x === 'X' && /[SX]$/.test(b)))); return b + (x === 'N' ? U.pick([' ', '_']) + size : x); }
function songTitleEn() { return freshName(() => songPair(SONG_EA, SONG_EB)); }
function songTitle() { return freshName(() => U.chance(0.15) ? U.pick(SONG_K) : U.chance(0.47) ? songPair(SONG_A, SONG_B) : songPair(SONG_EA, SONG_EB)); }
// 채널 · 버튜버 이름 (10-5)
function hasBatchim(w) { const c = w.charCodeAt(w.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 > 0; }
// 스트리머 별명: '이'는 받침 있는 말 뒤에만(별이 · 달이), 앞말 끝 글자와 같은 글자는 안 붙인다(토끼토)
function ytNick() { for (let i = 0; i < 30; i++) { const a = U.pick(CH_A), b = U.pick(CH_B), n = a + b; if ((b === '이' && !hasBatchim(a)) || a.endsWith(b) || CH_BAN.includes(n)) continue; return n; } return U.pick(CH_A) + '맨'; }
// 스트리머 채널: 분야를 알면 40%는 분야에 맞는 이름, 나머지는 별명 + TV · 로그 · 채널 · 하우스 · 랩
function ytChName(cat) { return freshName(() => CH_CAT[cat] && U.chance(0.4) ? U.pick(CH_CAT[cat]) : ytNick() + U.pick(CH_SUF)); }
// 버튜버 RP 이름: 일본식 성 + 이름 90%, 한 단어 이름 10%. g('여' · '남')에 맞는 이름을 고른다 (모르면 아무거나)
// 성 + 이름이 통째로 이름난 이름과 같거나, 앞 두 글자가 같으면(하루노 하루 · 히나타 히나) 다시 뽑는다
function vtPool(L, g) { return g === '여' ? L.f.concat(L.u) : g === '남' ? L.m.concat(L.u) : L.f.concat(L.m, L.u); }
function vtRpRaw(g) { const solo = vtPool(VT_SOLO, g), given = vtPool(VT_GIVEN, g); if (U.chance(0.1)) return U.pick(solo); for (let i = 0; i < 30; i++) { const a = U.pick(VT_SUR), b = U.pick(given), n = a + ' ' + b; if (!VT_BAN.includes(n) && a.slice(0, 2) !== b.slice(0, 2)) return n; } return U.pick(solo); }
function vtGiven(n) { return String(n).split(' ').pop(); }
function vtRpName(g) { return freshName(() => vtRpRaw(g)); }
// ───── 회사 이름 (10-7) ─────
// 회사 수 · 등급 · 특징은 그대로 두고, 인생마다 이름만 CO_POOL에서 새로 뽑는다. s.coNames에 '열쇠 → 이름'으로 남긴다
// 예전 세이브(s.coNames 없음)는 처음 이름 그대로. 성우 방송사(VO_BCS) 중 방송사(BROADCASTERS)와 같은 곳은 그 이름을 따라간다
function coSlots() {
  const S = [], add = (k, pool, o, after) => S.push({ k, pool, get: () => o.n, set: n => { o.n = n; if (after) after(n); } });
  for (const a of AGENCIES) add('ag:' + a.id, 'ag_' + a.kind + (a.mkt === 'kr' ? '' : '_' + a.mkt), a);
  PROD_COS.forEach((x, i) => add('prod:' + i, 'prod', x, n => { PROD_CO[i] = n; }));
  ANIME_COS.forEach((x, i) => add('ani:' + i, 'ani', x));
  for (const d of DISTRIBUTORS) add('dist:' + d.id, 'dist_' + d.ch, d);
  BROADCASTERS.forEach((x, i) => S.push({ k: 'bc:' + i, pool: 'bc', get: () => BROADCASTERS[i], set: n => { BROADCASTERS[i] = n; } }));
  for (const id of Object.keys(WB_PLATS)) WB_PLATS[id].forEach((x, i) => add(`plat:${id}:${i}`, 'plat_' + id, x));
  TU_COS.forEach((x, i) => add('tu:' + i, `tu_${x.kind}_${x.tier}`, x));
  // 성우 방송사: 방송사와 처음 이름이 같은 곳은 따로 뽑지 않는다 (coVoLink). 영화 채널 · 키즈 · 애니 채널은 따로
  VO_BCS.forEach((x, i) => { if (!coVoLink(i)) add('vo:' + i, x.con === '영화 채널' ? 'vo_movie' : 'vo_kids', x); });
  // 광고 브랜드 · 대학 (v115). 둘 다 뒤에 읽히는 파일(video.js · prof.js)에 있지만, 이 함수는 게임을 시작하거나 불러올 때만 불린다
  const BC = { 화장품: 'cos', 음료: 'drk', 게임: 'gam', 패션: 'fas', 식품: 'fod', 통신: 'tel' };
  for (const b of BRANDS) add('br:' + b.id, 'br_' + BC[b.cat] + (b.img === '고급' ? '_lux' : ''), b);
  UNIS.forEach((x, i) => add('uni:' + i, ['예술 특성화', '방송·공연'].includes(x.con) ? 'uni_art' : 'uni', x));
  return S;
}
let CO_DEF = null;
// 처음 이름을 한 번만 담아 둔다 (아직 CO_DEF가 없을 때는 성우 방송사 연결을 몰라서 모두 담긴다)
function coDefaults() { if (!CO_DEF) { const D = {}; for (const x of coSlots()) D[x.k] = x.get(); D.vo = VO_BCS.map(v => v.n); CO_DEF = D; } return CO_DEF; }
function coVoLink(i) {
  const D = CO_DEF; if (!D) return null; const n = D.vo[i];
  const b = BROADCASTERS.findIndex((x, j) => D['bc:' + j] === n); return b >= 0 ? 'bc:' + b : null;
}
function rollCoNames(s) {
  coDefaults();
  const by = {}, out = {};
  for (const x of coSlots()) (by[x.pool] = by[x.pool] || []).push(x);
  for (const [p, L] of Object.entries(by)) { const names = U.shuffle((CO_POOL[p] || []).slice()); L.forEach((x, i) => { out[x.k] = names[i] || CO_DEF[x.k]; }); }
  s.coNames = out;
}
function applyCoNames(s) {
  const D = coDefaults(), N = (s && s.coNames) || {}, cur = {};
  for (const x of coSlots()) { const n = N[x.k] || D[x.k]; x.set(n); cur[x.k] = n; }
  VO_BCS.forEach((v, i) => { const k = coVoLink(i); if (k) v.n = cur[k]; });
}
// 예능 제목: 예능 종류(SHOW_TRENDS · 연애 프로그램 · 공부 예능)에 맞는 낱말로. 종류를 모르면 아무 종류나
function tvShowTitle(genre) { const W = SHOW_WORDS[genre] || SHOW_WORDS[U.pick(SHOW_TRENDS)]; return freshName(() => dramaPick(W, SHOW_BAN)); }

// ───── 팬과 인기 ─────
const FANCAP = { kr: 2.5e7, jp: 3e7, us: 6e7 };
// 스타성은 아티스트로 활동할 때 팬이 느는 속도에 영향을 준다 (외모는 얼굴이 보이는 일의 점수에 바로 들어간다: visB)
function popSpeed(s) { return 0.4 + me(s).tal.star / 70; }
function fanGain(s, sc, mk = 'kr', mult = 1) {
  sc = U.clamp(sc, 0, 100);
  const cur = s.fans[mk], cap = FANCAP[mk];
  const raw = Math.pow(10, sc / 18) * mult * popSpeed(s) + cur * ((sc - (45 + Math.log10(1 + cur) * 4)) / 300);
  return Math.round(raw > 0 ? raw * Math.max(0, 1 - cur / cap) : raw);
}
function fanWord(n) { return n < 1000 ? '무명' : n < 1e4 ? '아는 사람만 아는' : n < 1e5 ? '떠오르는' : n < 1e6 ? '인기 있는' : n < 5e6 ? '톱스타' : '국민 스타'; }
// ───── 인지도와 직업별 인기 (피드백 23) ─────
// 인지도(s.fame 0~100): 대중이 나를 얼마나 아는지. 팬 수(아이돌이면 그룹 팬의 20%까지)로 정해지는 바탕에,
// 화제(s.buzz: 논란·예능·큰 흥행·광고 등)가 잠깐 더해진다. 알려질 때는 빠르고 잊힐 때는 천천히 (한 번 알려지면 사람들이 오래 기억한다)
const FAME_PTS = [[2, 0], [3, 5], [4, 15], [5, 35], [6, 60], [6.7, 78], [7.4, 95]];
function fameFans(s) { const t = s.tracks.idol; return totalFans(s) + (t && t.st === 'active' && t.g ? groupFans(t.g) * 0.2 : 0); }
function fameBase(s) {
  const x = Math.log10(1 + fameFans(s)), P = FAME_PTS;
  if (x <= P[0][0]) return 0;
  for (let i = 1; i < P.length; i++) if (x <= P[i][0]) return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * (x - P[i - 1][0]) / (P[i][0] - P[i - 1][0]);
  return 100;
}
function fameMonth(s) { s.buzz = (s.buzz || 0) * 0.9; const tg = U.clamp(fameBase(s) + s.buzz, 0, 100), f = s.fame || 0; s.fame = U.clamp(f + (tg - f) * (tg > f ? 0.3 : 0.03), 0, 100); }
function addFame(s, v) { if (!v) return 0; const b = s.fame || 0; s.fame = U.clamp(b + v, 0, 100); s.buzz = U.clamp((s.buzz || 0) + v, 0, 40); return s.fame - b; }
function fameWord(v) { return v >= 85 ? '모르는 사람 없음' : v >= 65 ? '유명함' : v >= 45 ? '꽤 알려짐' : v >= 25 ? '조금 알려짐' : v >= 8 ? '아는 사람만 앎' : '무명'; }
// 직업별 인기(s.jpop[직업] 0~100, 처음 50): 그 직업으로서 대중이 나를 얼마나 좋아하는지. 배우로는 호감인데 영화감독으로는 비호감일 수도 있다
// 대중 앞에 이름을 걸고 하는 직업만 인기가 있다 (스태프 직업은 업계 평판·업무 평가로 본다)
const POP_JOBS = ['idol', 'band', 'solo', 'player', 'dancer', 'actor', 'variety', 'youtube', 'model', 'vidol', 'director', 'writer', 'voice', 'adir', 'webtoon', 'webnovel'];
function jpop(s, id) { const v = (s.jpop || {})[id]; return v == null ? 50 : v; }
function jpopAdd(s, id, v) { if (!v || !POP_JOBS.includes(id)) return 0; s.jpop = s.jpop || {}; const b = jpop(s, id); s.jpop[id] = U.clamp(b + v, 0, 100); return s.jpop[id] - b; }
function popJobsOn(s) { return POP_JOBS.filter(id => trackOn(s, id)); }
// 지금 하는 모든 직업의 인기 (내 이미지 전체가 걸린 일: 논란, 사생활 기사, 광고 사고 등)
function jpopAll(s, v) { let sum = 0; const L = popJobsOn(s); for (const id of L) sum += jpopAdd(s, id, v); return L.length ? sum / L.length : 0; }
// 작품(앨범·싱글·각본 등) 성적이 그 직업의 인기를 바꾼다: 점수 85면 +2.5, 40이면 −1.25
function jpopWork(s, id, sc) { return jpopAdd(s, id, (sc - 55) / 12); }
function jpopAvg(s) { const L = popJobsOn(s); return L.length ? L.reduce((a, id) => a + jpop(s, id), 0) / L.length : 50; }
// 하는 일의 인기는 매달 조금씩 보통(50)으로 돌아간다
function jpopMonth(s) { for (const id of popJobsOn(s)) { const v = jpop(s, id); s.jpop = s.jpop || {}; s.jpop[id] = v + (50 - v) * 0.008; } }

// ───── 사건 처리 ─────
// 그달에 와 있는 사건 중 이것들을 맨 앞에 세운다 (다른 창이 먼저 떠서 한 달씩 밀리지 않게)
function qFront(s, ids) { for (const id of ids.slice().reverse()) { const i = s.queue.findIndex(q => q.id === id && q.at <= s.t); if (i > 0) s.queue.unshift(s.queue.splice(i, 1)[0]); } }
function queueEv(s, id, delay = 0, d = {}, dup) {
  if (!dup && hasQ(s, id)) return false;
  s.queue.push({ id, at: s.t + delay, d });
  return true;
}
// 창 왼쪽 위 분류 글자 (v186: 함수도 된다, 예: '작품 기획 - 드라마')
function evCat(ev, s, d) { try { return (typeof ev.cat === 'function' ? ev.cat(s, d || {}) : ev.cat) || ''; } catch (e) { return ''; } }
function hasQ(s, id) { return s.queue.some(q => q.id === id) || (s.pending && s.pending.id === id); }
function evAvail(s, ev) {
  // 길거리 캐스팅(ev.cast)은 광역시 이상에서만
  if (ev.cast && !(REGION_BY[s.region] && REGION_BY[s.region].cast)) return false;
  if (ev.once && s.done[ev.id]) return false;
  if (s.cd[ev.id] && s.cd[ev.id] > s.t) return false;
  if (s.army && !ev.army) return false;
  try { return !ev.cond || ev.cond(s); } catch (e) { console.error(ev.id, e); return false; }
}
// ───── 성과의 평가 변화 (턴제 요약 '성과' 칸) ─────
// 평판 · 인지도 · 직업별 인기 · 지금 하는 직업의 평가(업무 평가 · 업계 평판 · 강의 평가)를 결과 앞뒤로 재서 얼마나 바뀌었는지 남긴다 (L.dv)
function evJobN(id) { return id === 'player' ? '연주가' : CAREERS[id].n; }
function evalSnap(s) {
  const o = { 평판: s.rep, 인지도: s.fame || 0 };
  for (const id in (s.jpop || {})) if (CAREERS[id]) o[`${evJobN(id)} 인기`] = s.jpop[id];
  for (const id of CAREER_IDS) { const t = s.tracks[id]; if (CAREERS[id] && trackOn(s, id) && typeof t.rep === 'number') o[`${evJobN(id)} 평가`] = t.rep; }
  return o;
}
function evalDiff(a, b, noJob) { const out = []; for (const k in b) { if (noJob && / 평가$/.test(k)) continue; const d = Math.round(b[k]) - Math.round(a[k] == null ? b[k] : a[k]); if (d) out.push([k, d]); } return out; }
// 사건이 뜰 때 init이 결과를 정하며 바꾼 평가 (뜬 뒤 처리될 때까지 그달의 다른 변화는 넣지 않는다)
let EV_E0 = null;
function dvAdd(A, B) { const m = new Map(A); for (const [k, d] of B) m.set(k, (m.get(k) || 0) + d); return [...m].filter(([, d]) => d); }
// 결과 기록: 직업 활동으로 나온 결과(작화 반응 · 편집 결과 · 연구 실적 등)는 요약에서 '성과' 칸에 들어간다
function addRes(s, x, k) { addLog(s, x, k || 'career'); s.log[s.log.length - 1].r = 1; }
// 직업 한 달 처리 앞뒤로 잰 평가 변화를, 그동안 나온 마지막 결과 기록에 붙인다 (글에 이미 '→'로 적힌 직업 평가는 빼고)
function resDv(s, L0, e0) {
  const i0 = L0 ? s.log.lastIndexOf(L0) + 1 : 0;
  for (let i = s.log.length - 1; i >= i0; i--) {
    const L = s.log[i];
    if (!(L.r || L.k === 'good') || L.dv) continue;
    const dv = evalDiff(e0, evalSnap(s), /→/.test(L.x));
    if (dv.length) L.dv = dv;
    return;
  }
}
// ───── 직업별 팬 (v149) ─────
// 팬은 나라별(s.fans)로 세고, 그 팬을 어느 직업으로 모았는지를 s.jf에 따로 적는다. 합은 늘 전체 팬과 같다 (jfSync)
// 직업의 한 달 일 · 그 직업 사건 · 직업 창에서 누른 일로 바뀐 팬은 그 직업 몫, 어느 직업인지 알 수 없는 것(논란 · 일상 · 인물과의 일)은 '그 밖'(_etc) 몫
// 팬이 저절로 빠질 때(해마다 조금씩 · 나라별 한도)는 모든 몫이 같은 비율로 줄어든다
function jfAdd(s, id, d) { if (!id || !d) return; const J = s.jf = s.jf || {}; J[id] = Math.max(0, (J[id] || 0) + d); }
function jfSync(s) {
  const J = s.jf = s.jf || {}, T = totalFans(s);
  let S = 0; for (const k in J) S += J[k];
  if (S < T) J._etc = (J._etc || 0) + (T - S);
  else if (S > T && S > 0) { const r = T / S; for (const k in J) J[k] *= r; }
}
// 사건이 어느 직업의 일인가: 사건 이름의 앞머리로 가린다. 모르는 직업 사건은, 하는 일이 하나뿐이면 그 일로 본다
const EV_JOB_PRE = [['idol_', 'idol'], ['solo_', 'solo'], ['band_', 'band'], ['player_', 'player'], ['actor_', 'actor'], ['drama_', 'actor'], ['var_', 'variety'], ['tv_', 'variety'], ['model_', 'model'], ['vo_', 'voice'], ['voice_', 'voice'], ['dc_', 'dancer'], ['dancer_', 'dancer'], ['yt_', 'youtube'], ['youtube_', 'youtube'], ['mcn_', 'youtube'], ['vi_', 'vidol'], ['dir_', 'director'], ['script_', 'writer'], ['anr_', 'anr'], ['tr_', 'trainer'], ['atr_', 'acttrainer'], ['prod_', 'producer'], ['il_', 'illust'], ['mk_', 'marketer'], ['pf_', 'prof'], ['prof_', 'prof'], ['tu_', 'tutor'], ['an_', 'animator'], ['adir_', 'adir'], ['co_', 'agency'], ['ded_', 'editor'], ['edit', 'editor']];
function evJobOf(s, id, d) {
  if (/^w_/.test(id)) return d && CAREERS[d.kind] ? d.kind : null;
  if (/^wb_/.test(id)) return d && CAREERS[d.id] ? d.id : null;
  for (const [p, j] of EV_JOB_PRE) if (id.indexOf(p) === 0) return j;
  const ev = EVENTS[id];
  if (ev && ev.tag === 'career') { const on = CAREER_IDS.filter(k => CAREERS[k] && trackOn(s, k)); if (on.length === 1) return on[0]; }
  return null;
}
function fireEvent(s, id, d = {}) {
  const ev = EVENTS[id];
  if (!ev) { console.warn('없는 사건', id); return; }
  const e0 = evalSnap(s);
  // 창이 준비(init)하며 바꾼 것을 따로 적어 둔다 (v129): 그 창을 보기 전에 요약 창에 결과가 새어 나가지 않게 (ui.js turnSumHTML)
  const n0 = s.log.length, tok = U.uid(), ag = s.tracks && s.tracks.agency;
  const pre = { money: s.money, fans: totalFans(s), stress: s.stress, co: ag && typeof ag.money === 'number' ? ag.money : null, grow: typeof growSnap === 'function' ? growSnap(s) : null };
  const tap0 = MONEY_TAP ? Object.fromEntries(Object.entries(MONEY_TAP).map(([k, o]) => [k, o.v])) : null;
  if (ev.init) { ev.init(s, d); jfAdd(s, evJobOf(s, id, d), totalFans(s) - pre.fans); }
  for (let i = n0; i < s.log.length; i++) s.log[i].sp = tok;
  if (tap0) { pre.tap = {}; for (const k in MONEY_TAP) if (MONEY_TAP[k].v !== (tap0[k] || 0)) pre.tap[k] = 1; }
  EV_E0 = { id, dv: evalDiff(e0, evalSnap(s)) };
  // v192: CEO가 맡은 회사의 결과 창(ev.ceoRep)은 띄우지 않고 CEO 보고서에 모은다 (company.js ceoRepAdd)
  if (!d.skip && ev.ceoRep && typeof ceoRepAdd === 'function') { let it = null; try { it = ev.ceoRep(s, d); } catch (e) { console.error('CEO 보고', e); } if (it) { ceoRepAdd(s, it); d.skip = true; } }
  if (d.skip) return;
  // 창을 내려 둔 채 다른 창을 열면(자본금 꺼내기 등), 기다리던 선택을 버리지 않고 대기열 맨 앞에 돌려 둔다 (v116 버그 1: 밴드 '새 곡 준비'가 사라져 곡이 영영 안 나왔다)
  // re: 이미 한 번 뜬 창이라 다시 띄울 때 init을 또 돌리지 않는다 (fireQ · pullBack)
  if (s.pending && s.pending.id !== id) s.queue.unshift({ id: s.pending.id, at: s.t, d: s.pending.d, re: 1 });
  s.pending = { id, d, tok, pre };
  s.done[id] = (s.done[id] || 0) + 1;
  if (ev.cd) s.cd[id] = s.t + ev.cd;
}
let EV_FIXED = null, EV_RAND = null;
function buildEventLists() {
  const all = Object.values(EVENTS);
  EV_FIXED = all.filter(e => e.fixed);
  EV_RAND = all.filter(e => e.p && !e.fixed);
}
// 재능이 높을수록 관련 사건이 자주 일어난다
function talMult(s, ev) {
  if (!ev.tal) return 1;
  const ts = Array.isArray(ev.tal) ? ev.tal : [ev.tal];
  const v = Math.max(...ts.map(t => me(s).tal[t] || 40));
  return Math.pow(v / 50, 2.2);
}
function pickEvent(s) {
  if (!EV_FIXED) buildEventLists();
  // 스트레스 경고는 줄 선 다른 창보다 먼저 띄운다 (v139: 번아웃이 오기 전에 바로 알게)
  if (EVENTS.stress_warn && evAvail(s, EVENTS.stress_warn)) { fireEvent(s, 'stress_warn', {}); if (s.pending) return true; }
  // 차례가 된 창 가운데 가장 오래 기다린 것부터 띄운다 (v133). 예전에는 줄 맨 앞부터라, 앞으로 끼어드는 창(컴백 회의 · 앨범 성적)이 매달 있으면
  // 뒤에 선 창(오디션 · 재계약)이 영영 차례를 못 받았다. 같은 달에 선 창끼리는 줄 순서 그대로다
  const due = () => { let bi = -1; for (let i = 0; i < s.queue.length; i++) if (s.queue[i].at <= s.t && (bi < 0 || s.queue[i].at < s.queue[bi].at)) bi = i; return bi; };
  for (let qi = due(); qi >= 0; qi = due()) {
    const q = s.queue.splice(qi, 1)[0], ev = EVENTS[q.id];
    let ok = !!ev && !(typeof coAutoStale === 'function' && coAutoStale(s, q)); // v181: 자동을 꺼 둔 창은 버린다
    if (ok && ev.cond) { try { ok = ev.cond(s); } catch (e) { ok = false; } }
    if (!ok) continue;
    fireQ(s, q);
    if (s.pending) return true;
  }
  for (const ev of EV_FIXED) if (evAvail(s, ev)) { fireEvent(s, ev.id, {}); if (s.pending) return true; }
  for (const ev of U.shuffle(EV_RAND)) {
    if (!evAvail(s, ev)) continue;
    const p = (typeof ev.p === 'function' ? ev.p(s) : ev.p) * talMult(s, ev);
    if (p > 0 && U.chance(p)) { fireEvent(s, ev.id, {}); if (s.pending) return true; }
  }
  return false;
}
function evChoices(s) { const p = s.pending; if (!p) return []; const ev = EVENTS[p.id]; return ev.ch ? njGate(s, ev.ch(s, p.d) || []) : []; }
function submitForm(s, vals) {
  const p = s.pending;
  if (!p) return '';
  const ev = EVENTS[p.id];
  s.pending = null;
  const jf0 = totalFans(s);
  const r = ev.submit(s, p.d, vals) || {};
  jfAdd(s, evJobOf(s, p.id, p.d), totalFans(s) - jf0);
  applyLocks(s);
  if (r.err) { if (!s.pending) s.pending = p; return r.err; }
  if (r.log) addLog(s, r.log, ev.tag || 'ev');
  autoEvs(s); pullNow(s); pullBack(s); autoEvs(s);
  save(s);
  return '';
}
function cancelForm(s) {
  const p = s.pending;
  if (!p || !EVENTS[p.id].cancel) return;
  s.pending = null;
  const r = EVENTS[p.id].cancel(s, p.d);
  if (r) addLog(s, r, 'ev');
  pullBack(s);
  save(s);
}
// 적는 창 아래 다른 버튼 (v180, ev.fbtn): 확인 · 그만두기 말고 따로 할 일 (배우 섭외 창의 '섭외를 마친다' 등). b.ok === false면 못 누른다
function fbtnRun(s, i) {
  const p = s.pending;
  if (!p) return;
  const ev = EVENTS[p.id], b = (ev.fbtn ? ev.fbtn(s, p.d) || [] : [])[i];
  if (!b || b.ok === false) return;
  s.pending = null;
  const r = b.f ? b.f(s, p.d) : '';
  applyLocks(s);
  if (r) addLog(s, r, ev.tag || 'ev');
  autoEvs(s); pullNow(s); pullBack(s); autoEvs(s);
  save(s);
}
function choose(s, i) {
  const p = s.pending;
  if (!p) return;
  const ev = EVENTS[p.id];
  const c = evChoices(s)[i];
  if (!c || (c.ok && !c.ok(s))) return;
  s.pending = null;
  const jf0 = totalFans(s);
  const r = c.f ? c.f(s, p.d) : '';
  jfAdd(s, evJobOf(s, p.id, p.d), totalFans(s) - jf0);
  applyLocks(s);
  if (r) {
    addLog(s, r, ev.tag || 'ev'); s.log[s.log.length - 1].e = ev.id;
    // 실시간 창이 있던 사건은 기록에 장면(spec)을 남긴다: 요약 창의 '▶ 무대 보기' (12-1)
    if (ev.live) { try { const sp = ev.live(s, p.d); if (sp) s.log[s.log.length - 1].lv = sp; } catch (e) { } }
    // 공개 뒤 반응(라이브온)도 기록에 남긴다: 요약 창 · 걸어온 길의 배너 (12-3)
    if (ev.plio) { try { const pl = ev.plio(s, p.d); if (pl) s.log[s.log.length - 1].pl = pl; } catch (e) { } }
  }
  // 고른 뒤 이어서 생긴 사건도 고를 게 없으면 창 없이 처리한다
  autoEvs(s); pullNow(s); pullBack(s); autoEvs(s);
  save(s);
}
// 턴제 (turn-test): 창을 띄우지 않고 바로 처리하는 사건
// ① 고를 게 하나뿐인 사건 (돌잡이, 입학식, 오디션 결과처럼 무엇을 눌러도 같은 것) ② ev.auto: 답이 정해진 사건 (그 선택지를 고른다)
// ③ ev.noCh: 선택지가 여럿이어도 상황이 바뀌지 않는 알림 (새로 지원할 수 있는 곳)
// 결과는 인생 기록에 남고 진행 요약 창의 '특별한 일'에 제목과 함께 강조된다. ev.autoK가 'flavor'면 '일상'으로 (새 특기를 배웠으면 늘 특별한 일)
// ev.keepPop: 고를 게 없어도 창으로 보여 준다 (시상식 발표처럼 보는 맛이 있는 것). 함수면 그때그때 정한다
const LOG_HTML = new WeakMap();
// 내가 무언가를 정한 바로 그때 띄울 창 (제목 정하기 · 활동명 정하기 · 컨셉 고르기)
// 다른 창이 떠 있어 줄을 섰으면, 다음 달까지 기다리지 않고 앞의 창을 닫자마자 띄운다
// 예: 작곡가로 처음 곡을 팔면 활동명 창이 먼저 뜨고, 제목 창은 그 다음 달로 밀렸다
// 컴백 회의 · 앨범 발매(내 그룹 · 회사 그룹)도 그달에 와 있으면 앞 창에 답하자마자 이어서 뜬다 (그룹이 여럿이어도 한 달씩 밀리지 않게, 턴제 실험 6차)
const NOW_EVS = new Set(['co_aud_pick', 'co_aud', 'co_trn_out', 'co_tr_out', 'co_hire_tf', 'co_renew', 'co_auto_full', 'co_sq_ready', 'dorm_out', 'sk_swap', 'sk_drop', 'slot_up', 'school_start', 'title_pick', 'stage_name', 'song_concept', 'idol_cb', 'idol_cbres', 'co_cb', 'co_song', 'co_res', 'band_fest_play', 'band_arr']);
// 숙소를 나오게 되면 바로 '숙소를 나와야 한다' 창을 띄운다 (v130: 예전엔 다음 달로 넘어가야 떴다). 한 달 진행과 선택 · 행동 뒤에 본다
function dormCheck(s) { const dorm = isDorm(s); if (s.dormWas && !dorm && age(s) >= 19 && !s.army && s.home.mode !== 'alone' && !hasQ(s, 'dorm_out') && !(s.pending && s.pending.id === 'dorm_out')) queueEv(s, 'dorm_out', 0); s.dormWas = dorm; }
function pullNow(s) {
  if (s.dormWas != null) dormCheck(s);
  for (let n = 0; n < 8 && !s.pending && !s.ended; n++) {
    const i = s.queue.findIndex(q => NOW_EVS.has(q.id) && q.at <= s.t);
    if (i < 0) return;
    const q = s.queue.splice(i, 1)[0], ev = EVENTS[q.id];
    if (typeof coAutoStale === 'function' && coAutoStale(s, q)) continue;
    if (!ev) continue;
    if (ev.cond) { let ok = false; try { ok = ev.cond(s); } catch (e) { } if (!ok) continue; }
    fireQ(s, q);
    autoEvs(s);
  }
}
// 대기열 항목 띄우기: 돌려 둔 창(re)은 init 없이 그대로 다시 띄운다
function fireQ(s, q) { if (q.re) s.pending = { id: q.id, d: q.d }; else fireEvent(s, q.id, q.d); }
// 다른 창 때문에 돌려 둔 창은 그 창을 마치자마자 다시 띄운다 (다음 달까지 기다리지 않게)
function pullBack(s) {
  if (s.pending || s.ended) return;
  const i = s.queue.findIndex(q => q.re && q.at <= s.t);
  if (i < 0) return;
  const q = s.queue.splice(i, 1)[0], ev = EVENTS[q.id];
  if (!ev) return;
  if (ev.cond) { let ok = false; try { ok = ev.cond(s); } catch (e) { } if (!ok) return; }
  fireQ(s, q);
}
function autoPick(s, ev, d, C) {
  // v179: 결과 기사(ev.news)는 어떤 경우든 따로 창으로 띄운다
  if (ev.form || ev.news || (typeof ev.keepPop === 'function' ? ev.keepPop(s, d) : ev.keepPop)) return -1;
  if (ev.noCh) return C.length - 1;
  if (ev.auto != null) return typeof ev.auto === 'function' ? ev.auto(s, d) : ev.auto;
  return C.length === 1 ? 0 : -1;
}
function autoEvs(s) {
  for (let n = 0; n < 5 && s.pending && !s.ended; n++) {
    // CEO가 맡은 회사 일이면 창 없이 CEO가 고른다 (v169, company.js ceoTake)
    if (typeof ceoTake === 'function' && ceoTake(s)) continue;
    const p = s.pending, ev = EVENTS[p.id], d = p.d;
    if (!ev) return;
    const C = evChoices(s), i = autoPick(s, ev, d, C), c = C[i];
    if (!c || (c.ok && !c.ok(s))) return;
    const ti = typeof ev.title === 'function' ? ev.title(s, d) : ev.title;
    let tx = '', hh = '';
    try { tx = ev.text ? ev.text(s, d) : ''; hh = ev.html && !ev.autoNoHtml ? ev.html(s, d) : ''; } catch (e) { }
    const k0 = learnedSkills(me(s)).length, e0 = evalSnap(s), dv0 = EV_E0 && EV_E0.id === p.id ? EV_E0.dv : [];
    s.pending = null;
    const jf0 = totalFans(s);
    const r = c.f ? c.f(s, d) : '';
    jfAdd(s, evJobOf(s, p.id, d), totalFans(s) - jf0);
    const dv = dvAdd(dv0, evalDiff(e0, evalSnap(s))).filter(([k]) => !(/→/.test(r || '') && / 평가$/.test(k)));
    applyLocks(s);
    const fresh = learnedSkills(me(s)).length > k0;
    const k = fresh ? '' : typeof ev.autoK === 'function' ? ev.autoK(s, d) : ev.autoK;
    // ev.autoQuiet: 고른 결과가 따로 남는 사건(예능 게스트 → 방송 결과)은 사건 글을 또 남기지 않는다
    const x = ev.noCh ? tx : r || (ev.autoQuiet ? '' : tx);
    if (!x) continue;
    if (k === 'flavor') { addLog(s, x, 'flavor'); continue; }
    addLog(s, x, ev.tag || 'ev');
    const L = s.log[s.log.length - 1];
    const cat = evCat(ev, s, d); L.sp = ti || cat || '알림'; L.c = cat; L.e = ev.id;
    // 창 없이 처리된 결과도 요약 창에서 장면(▶ 무대 보기)과 라이브온 반응을 볼 수 있게 남긴다 (12-3)
    if (ev.live) { try { const sp = ev.live(s, d); if (sp) L.lv = sp; } catch (e) { } }
    if (ev.plio) { try { const pl = ev.plio(s, d); if (pl) L.pl = pl; } catch (e) { } }
    // ev.sub: 기록 아래 작게 덧붙이는 말 (아이돌 정산이 빚 갚는 데 들어갔을 때 남은 비용 등)
    if (ev.sub) { try { const sb = ev.sub(s, d); if (sb) L.sub = sb; } catch (e) { } }
    if (dv.length) L.dv = dv;
    if (hh) LOG_HTML.set(L, hh);
  }
}

// ───── 일정 칸 ─────
// 활동 id: 생활 활동(play rest job), 'p_'+특기(혼자 연습), 'c_'+직업(직업 활동), 시스템(army sick)
// 성인은 세 칸. 전용 밴(생활 → 장비)이 있으면 한 칸 더
// 초1 3월부터 한 칸, 중1 3월부터 두 칸 (v117 학사 일정), 성인(19세)부터 세 칸
function slotCount(s) { const a = age(s), y = schoolYear(s); return a >= 19 ? 3 + (typeof vanOn === 'function' && vanOn(s) ? 1 : 0) : y >= 7 ? 2 : y >= 1 ? 1 : 0; }
function defaultAct(s, i) { const a = age(s); if (a < 19 && i === 0 && has(me(s), 'study')) return 'p_study'; return a < 19 ? 'play' : 'rest'; }
function refreshSlots(s) {
  const n = slotCount(s), n0 = s.slots.length;
  while (s.slots.length < n) s.slots.push({ act: defaultAct(s, s.slots.length), lesson: false, payer: 'family', lock: null, dflt: true });
  // 일정 칸이 늘면(13세 · 19세 · 전용 밴) 알림 창 (v89). 일곱 살에 처음 생길 때는 '이제 일정을 정할 수 있어요' 창이 따로 뜬다
  if (n0 > 0 && s.slots.length > n0) queueEv(s, 'slot_up', 0, { a: n0, b: s.slots.length, van: n0 >= 3 });
  // 밴을 처분하면 늘어난 칸을 뺀다 (맨 뒤 칸부터)
  while (s.slots.length > n && n >= 3) s.slots.pop();
}
function actInfo(id) {
  if (LIFE_ACTS[id]) return LIFE_ACTS[id];
  if (SYS_ACTS[id]) return Object.assign({ sys: true }, SYS_ACTS[id]);
  if (id.startsWith('p_')) {
    const k = id.slice(2), sk = SKILLS[k];
    return { n: sk.p, ic: sk.ic, g: SKILL_CATS.find(c => c.id === sk.cat).n, skill: k, les: sk.les, eff: [[sk.n, '↑', 1], ['스트레스', sk.fun ? '↓' : '↑', sk.fun ? 1 : 0]] };
  }
  if (id.startsWith('c_')) { const c = CAREERS[id.slice(2)]; return c && c.act ? Object.assign({ trk: id.slice(2) }, c.act) : { n: id, ic: '❔' }; }
  return { n: id, ic: '❔' };
}
// ───── 직업 활동 ─────
// 일정에 '직업 활동' 칸(c_직업)을 넣으면 직업 활동 박스의 그 직업 배너에 할 일이 보인다
// 배너 팝업에서 할 일을 골라야 그 칸이 일을 한다 (s.jobDo[직업] = 할 일 id). 할 일은 나중에 직업마다 늘린다 (JOB_TASKS)
// 회사·촬영이 정해 둔 칸(c_직업으로 잠긴 칸)이 있으면 그 일(첫 번째 할 일)을 이미 하고 있는 것이고, 그만둘 수 없다
// 할 일을 안 하면(칸이 없거나, 칸만 있고 할 일을 안 골랐으면) 평가가 크게 떨어진다 (jobIdleMonth)
const JOB_TASKS = {};
function jobTasks(id) { const c = CAREERS[id]; return JOB_TASKS[id] || (c && c.act ? [{ id: 'main', n: c.act.n, ic: c.act.ic, eff: c.act.eff || [] }] : []); }
// 직업 활동 두 갈래 (2026-11-08, 7-4단계부터): auto 직업은 칸만 넣어 두면 자동으로 하는 일(첫 할 일)을 한다. 골라서 하는 일은 그 직업의 picks
// v118 UI B4: 할 일이 하나뿐인 직업은 칸만 넣어 두면 저절로 그 일을 한다 (고를 게 하나뿐인데 '하기'를 눌러야 해서 몇 달씩 놓치던 것)
function jobTask(s, id) {
  const k = (s.jobDo || {})[id], L = jobTasks(id), c = CAREERS[id];
  const x = k && L.find(x => x.id === k);
  if (x) return x;
  if (jobForced(s, id) || (c && c.auto && jobSlots(s, id))) return L[0] || null;
  const V = L.filter(x => !x.show || x.show(s));
  return jobSlots(s, id) && V.length === 1 ? V[0] : null;
}
function jobSlots(s, id) { return s.slots.filter(sl => sl.act === 'c_' + id).length; }
function jobForced(s, id) { return s.slots.filter(sl => sl.act === 'c_' + id && sl.lock === 'c_' + id).length; }
// 같은 직업 활동은 일정에 한 칸만 넣을 수 있다 (0단계). 회사·촬영이 정한 고정 칸은 예외로 지금처럼 두 칸까지 묶인다
// 내가 고른 한 칸은 예전 두 칸만큼 일한다 (JOB_ONE). 고정 칸이 있으면 고정 칸 수 그대로 계산한다
const JOB_ONE = 2;
function jobN(s, id) { const f = jobForced(s, id); if (f) return f; return jobTask(s, id) && jobSlots(s, id) ? JOB_ONE : 0; }
// 같은 직업 활동이 여러 칸에 있으면(고정 칸이 생겼거나 예전 세이브) 하나만 남기고 나머지 칸은 쉬기로 돌린다
function dedupeJobSlots(s) {
  const seen = new Set(s.slots.filter(sl => sl.lock && sl.act.startsWith('c_')).map(sl => sl.act));
  s.slots.forEach((sl, i) => {
    if (sl.lock || !sl.act || !sl.act.startsWith('c_')) return;
    if (seen.has(sl.act)) { sl.act = defaultAct(s, i); sl.lesson = false; } else seen.add(sl.act);
  });
}
// 이 칸(i)에 넣으려는 직업 활동을 다른 칸이 이미 쓰고 있는지
function jobTakenElse(s, i, act) { return act.startsWith('c_') && s.slots.some((sl, j) => j !== i && sl.act === act); }
// 평판(rep)이 있는 직업은 평판이, 없는 직업(배우·가수 등)은 그 직업의 인기가 떨어진다. 첫 달은 봐주고, 손 놓은 달이 길수록 더 떨어진다
const JOB_IDLE = { rep: 2, step: 0.5, max: 4.5, pop: 1.2 };
// 활동 지원 자동 (피드백 24): '자동'을 켜 둔 활동은 다시 지원할 수 있게 되면(기다리는 기간이 끝나면) 저절로 지원한다
function actAutoMonth(s) {
  const A = s.actAuto;
  if (!A || s.pending || typeof ACT_APPLY === 'undefined') return;
  for (const id in A) {
    if (!A[id]) continue;
    const a = ACT_APPLY.find(x => x.id === id);
    if (!a || (a.show && !a.show(s)) || !a.ok(s)) continue;
    const r = a.run(s);
    if (r) addLog(s, '🔁 ' + r, 'career');
    if (s.pending) break;
  }
}
function jobIdleMonth(s) {
  for (const id of CAREER_IDS) {
    const c = CAREERS[id], t = s.tracks[id];
    if (!c || !c.act || !trackOn(s, id)) continue;
    // 일을 했거나, 칸을 받지 못했으면(자숙 · 군 복무 · 고정 일정이 꽉 참) 봐준다. 칸은 있는데 할 일을 안 골랐으면 평가가 떨어진다
    if (jobN(s, id) > 0 || !jobSlots(s, id)) { t.jobIdle = 0; continue; }
    t.jobIdle = (t.jobIdle || 0) + 1;
    if (t.jobIdle < 2) continue;
    const v = Math.min(JOB_IDLE.max, JOB_IDLE.rep + (t.jobIdle - 2) * JOB_IDLE.step);
    if (c.idleHit) c.idleHit(s, t, v);
    else if (typeof t.rep === 'number') { t.rep = Math.max(0, t.rep - v); if (typeof EMP_N !== 'undefined' && EMP_N[id] && t.lead != null) empLeadCheck(s, id, t); }
    else jpopAdd(s, id, -JOB_IDLE.pop);
    if (t.jobIdle === 2) addLog(s, `${c.n} 일을 손 놓고 있다는 말이 돈다. 평가가 떨어지기 시작했다.`, 'career');
  }
}
function actOK(s, id) {
  const a = actInfo(id);
  if (a.sys) return false;
  // 특기 연습은 일정 칸이 생기면(초등학교 입학) 바로 (v121: 예전엔 만 7세부터라 생일이 늦으면 입학하고도 몇 달 연습을 못 했다)
  if (a.skill) return has(me(s), a.skill) && slotCount(s) > 0;
  // 자숙 중에는 직업 활동을 못 한다
  if (a.trk) { const c = CAREERS[a.trk]; return trackOn(s, a.trk) && !s.hiatus && !(c.slotOK && !c.slotOK(s, s.tracks[a.trk])); }
  return age(s) >= (a.min || 0);
}
function availableActs(s) {
  const ids = Object.keys(LIFE_ACTS).concat(SKILL_IDS.map(k => 'p_' + k)).concat(CAREER_IDS.filter(id => CAREERS[id] && CAREERS[id].act).map(id => 'c_' + id));
  return ids.filter(id => actOK(s, id));
}
function wantedLocks(s) {
  if (s.army) return s.slots.map(() => 'army');
  if (s.ill && s.ill.all) return s.slots.map(() => 'sick');
  const L = [];
  for (const id of CAREER_IDS) { const c = CAREERS[id]; if (c && c.locks && trackOn(s, id)) L.push(...c.locks(s, s.tracks[id])); }
  if (s.projects.some(w => w.slot)) L.push('proj');
  if (s.kidTeach) L.push('kidteach');
  if (s.ill && s.ill.rest) L.push('sick');
  // 직업 활동은 늘 고정 (턴제 실험 6차): 하는 직업마다 한 칸. 회사 · 촬영이 이미 그 직업 칸을 잡아 두었으면 더 넣지 않는다 ('+c_직업')
  for (const id of CAREER_IDS) { const c = CAREERS[id]; if (c && c.act && actOK(s, 'c_' + id) && !L.includes('c_' + id)) L.push('+c_' + id); }
  return L;
}
// 학원: 실력이 오를수록 비싸지고(고급 레슨), 일정 수준을 넘으면 학원에서는 더 배울 게 없다
// 학원 등급: 1 일반 학원, 2 명문 학원 (학원비 2.2배, 더 빨리 늘고 더 높은 수준까지 가르친다)
const LES_LV = { 1: { n: '일반 학원', c: 1, mult: 1.5, max: 65 }, 2: { n: '명문 학원', c: 2.2, mult: 1.95, max: 78 } };
const LES_MAX = LES_LV[1].max;
function lesLv(sl) { return sl && sl.lesLv === 2 ? 2 : 1; }
function lesCost(p, k, lvl = 1) { const L = SKILLS[k].les; return L ? Math.round(L.c * (1 + lv(p, k) / 50) * LES_LV[lvl].c / 5) * 5 : 0; }
function lesOK(p, k, lvl = 1) { return !!SKILLS[k].les && lv(p, k) < LES_LV[lvl].max; }
// 고정 일정 (턴제 실험 6차): 군 복무 · 치료 · 회사 연습시간 · 촬영 · 작품 · 아이 가르치기 · 직업 활동이 위 칸부터 들어간다
// 내가 넣어 둔 일정은 덮어쓰지 않고 아래로 밀린다. 칸 밖으로 밀려난 일정(s.slotOver)은 고정 일정이 끝나면 다시 올라온다
// 빈 칸은 기본 일정(어릴 때 놀기 · 성인 쉬기, dflt)으로 채운다. 기본 일정은 밀려난 일정보다 뒤에 선다 (밀려난 일정이 먼저 돌아온다)
function slotMine(sl) { const e = { act: sl.act, lesson: !!sl.lesson, payer: sl.payer || 'family' }; if (sl.lesLv) e.lesLv = sl.lesLv; if (sl.dflt) e.dflt = true; return e; }
function applyLocks(s) {
  const n = s.slots.length, L = wantedLocks(s).slice(0, n), room = n - L.length;
  const mine = [], dflt = [];
  for (const sl of s.slots) {
    // 예전 세이브: 고정 일정에 덮였던 일정(prev)도 내 일정으로 되살린다
    const e = !sl.lock ? slotMine(sl) : sl.prev ? { act: sl.prev, lesson: !!sl.prevLesson, payer: sl.payer || 'family' } : null;
    if (e) (e.dflt ? dflt : mine).push(e);
  }
  // 직업 활동은 늘 고정이라 내 일정에서는 뺀다
  const ok = e => !!e.act && !e.act.startsWith('c_') && actOK(s, e.act);
  const all = mine.concat(s.slotOver || []).filter(ok), show = all.slice(0, room);
  for (const e of dflt) if (show.length < room && ok(e)) show.push(e);
  while (show.length < room) show.push({ act: defaultAct(s, L.length + show.length), lesson: false, payer: 'family', dflt: true });
  s.slotOver = all.slice(room, room + n);
  s.slots = L.map(w => ({ act: w[0] === '+' ? w.slice(1) : w, lock: w, lesson: false, payer: 'family' })).concat(show.map(e => Object.assign(e, { lock: null })));
  dedupeJobSlots(s);
}
// 직업 활동 고정 칸('+c_직업')의 직업 id
function fixedJob(sl) { return sl && sl.lock && sl.lock[0] === '+' ? sl.lock.slice(3) : null; }
// 가족이 대 줄 수 있는 학원 몫 (고등학교 졸업 뒤에는 0, 버튼도 안 보인다)
// 일반 학원은 1, 명문 학원은 2를 쓴다. 성인 전 일정 칸은 많아야 둘(13~18세)이라 학원도 둘까지
// 형편 4~6단계: 일반 1곳 · 7~8단계: 일반 2곳 또는 명문 1곳 · 9~10단계: 명문 2곳. 아래 30%(1~3단계)는 못 보낸다
function familyBudget(s) {
  if (graduated(s) || !parentsAlive(s).length) return 0;
  const w = s.wealth;
  return w >= 9 ? 4 : w >= 7 ? 2 : w >= 4 ? 1 : 0;
}
function famPlanText(b) { return b >= 4 ? '명문 학원 2곳까지' : b >= 2 ? '일반 학원 2곳 또는 명문 학원 1곳' : b >= 1 ? '일반 학원 1곳' : ''; }
function familyWhyNot(s) {
  if (!parentsAlive(s).length) return '학원비를 대 줄 가족이 없다';
  return familyBudget(s) === 0 ? '집안 형편이 어려워 가족이 학원을 보내 줄 수 없다' : `가족이 보내 줄 수 있는 학원은 ${famPlanText(familyBudget(s))}이다`;
}
// i번째 칸을 lvl 등급 학원으로 가족이 대 줄 수 있는지 (다른 칸들이 이미 쓴 몫을 빼고)
function familyCanPay(s, i, lvl = lesLv(s.slots[i])) {
  const b = familyBudget(s);
  if (!b) return false;
  let used = 0;
  s.slots.forEach((sl, j) => { if (j !== i && sl.lesson && sl.payer === 'family' && actInfo(sl.act).les) used += lesLv(sl); });
  return used + lvl <= b;
}
function doActivity(s, sl, i) {
  const a = actInfo(sl.act);
  if (!a || a.trk) return;
  const p = me(s);
  if (sl.act === 'army' || sl.act === 'proj') return;
  if (sl.act === 'sick') { addStress(s, -6); return; }
  if (sl.act === 'kidteach') { kidTeachMonth(s); return; }
  if (a.skill) {
    const k = a.skill, sk = SKILLS[k];
    let lesson = !!(sl.lesson && sk.les);
    // 명문 학원은 일반 학원보다 높은 수준까지 가르친다. 일반 학원을 넘어서면 명문 학원으로만 다닐 수 있다
    let ll = lesLv(sl);
    if (lesson && !lesOK(p, k, ll) && lesOK(p, k, 2)) { sl.lesLv = ll = 2; addLog(s, `${SKILLS[k].n} 실력이 일반 학원 수준을 넘어서 명문 학원으로 옮겼다.`); }
    if (lesson && !lesOK(p, k, ll)) { sl.lesson = false; lesson = false; addLog(s, `${SKILLS[k].n} 실력이 학원에서 배울 수준을 넘어서 ${josa(sk.les.n, '을를')} 그만뒀다. 이제부터는 혼자 연습한다.`); }
    if (lesson) {
      const cost = lesCost(p, k, ll) * 1e4;
      const fam = !graduated(s) && familyCanPay(s, i, ll);
      sl.payer = fam ? 'family' : 'me';
      if (fam) s.mon.familyPaid = (s.mon.familyPaid || 0) + cost;
      else if (s.money >= cost) addMoney(s, -cost, '학원비');
      else { sl.lesson = false; lesson = false; addLog(s, `돈이 모자라 ${josa(sk.les.n, '을를')} 그만뒀다.`); }
    }
    const mult = lesson ? LES_LV[ll].mult * REGION_BY[s.region].lessonMult : 1;
    practice(s, p, k, 1, mult);
    addStress(s, sk.fun ? -1 : 1.5 + (lesson ? 0.5 : 0));
    return;
  }
  if (a.stress) addStress(s, a.stress);
  if (sl.act === 'job') {
    // 알바를 여러 칸에 넣을수록 한 칸당 버는 돈은 줄고 더 지친다 (세 칸을 다 채워도 최저임금 풀타임 정도)
    const nth = s.slots.slice(0, i).filter(x => x.act === 'job' && !x.lock).length;
    const pay = (age(s) >= 19 ? [100, 70, 50] : [50, 35, 25])[Math.min(nth, 2)] * 1e4;
    const tutor = lv(p, 'study') >= 60;
    addMoney(s, pay * (tutor ? 1.3 : 1), tutor ? '과외 아르바이트' : '아르바이트');
    s.mon.job = (s.mon.job || 0) + pay * (tutor ? 1.3 : 1);
    if (nth) addStress(s, 2 * nth);
  }
  if (sl.act === 'play') { const fr = people(s, n => n.rel === '친구' && !(n.far && age(s) < 19)); if (fr.length) { const n = U.pick(fr); aff(n, 1); n.contactT = s.t; } }
}

// ───── 한 달 진행 ─────
function tick(s) {
  NAME_S = s;
  if (s.pending || s.ended) return;
  s.t++;
  s.mon = { inc: 0, exp: 0, ent: 0, items: {}, familyPaid: 0 };
  if (s.t % 12 === 0) onBirthday(s);
  onSchoolMonth(s);
  if (calM(s) === 0) onNewYear(s);
  refreshSlots(s);
  applyLocks(s);
  s.slots.forEach((sl, i) => doActivity(s, sl, i));
  // 학교 수업은 학업을 조금씩 올려 준다. 귀가부는 집에서 공부하는 시간이 있어 더 빨리 오른다
  if (schoolYear(s) >= 1 && !s.edu.graduated && !s.army && has(me(s), 'study')) practice(s, me(s), 'study', s.flags.homeClub ? 0.5 : 0.25);
  if (!s.army) scoutByWork(s);
  if (!s.army) { for (const id of CAREER_IDS) { const c = CAREERS[id]; if (c && trackOn(s, id) && c.monthly) { (s.carM = s.carM || {})[id] = (s.carM[id] || 0) + 1; EARN_JOB = id; const L0 = s.log[s.log.length - 1], e0 = evalSnap(s), jf0 = totalFans(s); try { c.monthly(s, s.tracks[id]); } finally { EARN_JOB = null; } jfAdd(s, id, totalFans(s) - jf0); resDv(s, L0, e0); } } worksMonth(s); jobIdleMonth(s); lateMonth(s); stageMonth(s); }
  // 군 복무 중에도 내 회사는 돌아간다 (대표의 할 일은 못 한다)
  else { armyMonth(s); if (typeof coArmy === 'function') coArmy(s); }
  familyMonth(s);
  uniMonth(s);
  livingMoney(s);
  royalties(s);
  bodyMonth(s);
  decayMonth(s, me(s));
  flavor(s);
  successCheck(s);
  inboxMonth(s);
  scandalMonth(s);
  npcMonth(s); // 업계 인물이 스스로 움직인다 (12-2)
  applyOpenMonth(s);
  careerLogMonth(s);
  // 기획사 숙소 생활이 끝나면(그룹 해체·숙소 졸업 등) 어디서 살지 고른다
  // 내 집(월세·전세·자가)이 이미 있으면 묻지 않고 그 집에서 지낸다 (v89)
  dormCheck(s);
  parEquipMonth(s);
  if (!s.army) { actAutoMonth(s); lifeAutoMonth(s); coMeetMonth(s); if (typeof ceoOfferMonth === 'function') ceoOfferMonth(s); if (typeof pfInvMaybe === 'function') pfInvMaybe(s); }
  pickEvent(s);
  autoEvs(s); pullNow(s);
  s.lastMon = s.mon;
  // 돈 흐름 창의 '1년': 최근 12달의 항목별 수입·지출을 남겨 둔다
  s.monHist = (s.monHist || []).concat([{ t: s.t, items: s.mon.items, fam: s.mon.familyPaid || 0 }]).slice(-12);
  const fade = age(s) >= 50 ? 0.99 : age(s) >= 35 ? 0.993 : 0.996;
  MK.forEach(m => { s.fans[m] = Math.round(s.fans[m] * fade); });
  jfSync(s);
  s.peak.fans = Math.max(s.peak.fans, totalFans(s));
  s.peak.money = Math.max(s.peak.money, s.money);
}

// 학사 일정 (v117): 생일이 아니라 태어난 해 기준으로 3월에 입학 · 진급하고 2월에 졸업한다
// 초1 3월 = 태어난 해 + 7년, 중1 = +13년, 고1 = +16년, 수능 = +18년 11월, 고교 졸업 = +19년 2월, 대학 입학 = +19년 3월
function onSchoolMonth(s) {
  const m = calM(s), y = schoolYear(s), e = s.edu;
  if (m === 2 && y === 7 && !e.midIn) { e.midIn = true; addLog(s, '중학교에 입학했다.'); }
  if (m === 2 && y === 10 && !e.hsIn) { e.hsIn = true; if (!e.hs) e.hs = '일반고'; addLog(s, `${e.hs === '일반고' ? '고등학교' : e.hs}에 입학했다.`); }
  if (m === 10 && y === 12 && !e.graduated) addLog(s, '수능을 봤다.');
  // 고교 졸업 (예전 세이브에서 이미 지난 경우도 여기서 한 번에)
  if (!e.graduated && (y > 12 || (y === 12 && m === 1))) {
    e.graduated = true; addLog(s, '고등학교를 졸업했다.');
    // 부모님 돈으로 다니던 학원은 끊긴다 (피드백 24). 다시 다니려면 내 돈으로
    const cut = s.slots.filter(sl => sl.lesson && sl.payer === 'family' && actInfo(sl.act).les).map(sl => { sl.lesson = false; return actInfo(sl.act).les.n; });
    if (cut.length) addLog(s, `부모님이 이제 학원비는 알아서 내라고 하셨다. ${josa([...new Set(cut)].join('·'), '을를')} 그만뒀다.`);
    for (const sl of s.slots) sl.payer = 'me';
  }
  if (e.uni && e.uni.st != null && s.t === e.uni.st) addLog(s, `${e.uni.n}에 입학했다.`);
}
function onBirthday(s) {
  for (const p of parentsAlive(s)) if (pAge(s, p) >= 70 && U.chance((pAge(s, p) - 68) * 0.02)) queueEv(s, 'parent_loss', 0, { id: p.id }, true);
}
// 라이브온 유행 (피드백 24): 버튜버냐 캠튜버냐. 3~5년에 한 번 바뀐다. 예전 세이브(채널 컨셉 유행)는 둘 중 하나로 바꾼다
function ytTrendCheck(s, flip) {
  const tv = s.trendTV;
  if (!YT_KINDS.includes(tv.yt)) { tv.yt = U.pick(YT_KINDS); tv.ytT = s.t + U.int(36, 60); return; }
  if (tv.ytT == null) tv.ytT = s.t + U.int(36, 60);
  if (flip && s.t >= tv.ytT) {
    tv.yt = YT_KINDS.find(x => x !== tv.yt); tv.ytT = s.t + U.int(36, 60);
    if (trackOn(s, 'youtube') || trackOn(s, 'vidol')) addLog(s, `라이브온 판도가 바뀌었다. 요즘은 ${josa(tv.yt, '이가')} 대세다.`, 'career');
  }
}
function onNewYear(s) {
  // 인생 결산 그래프(12-5): 해마다 [지난해, 그해 끝의 팬, 그때까지 번 돈]을 남긴다. 예전 세이브는 이때부터 쌓인다
  (s.yr = s.yr || []).push([calY(s) - 1, Math.round(totalFans(s)), Math.round(s.earned || 0)]);
  // v165: 내 곡이 바꾼 유행은 한동안 그대로 간다 (music.js hitTrendGo)
  if (U.chance(0.6) && !(s.trendLock > s.t)) s.trend = U.pick(TRENDS.filter(x => x !== s.trend));
  if (!s.trendTV) rollTV(s);
  if (U.chance(0.5)) s.trendTV.drama = U.pick(DRAMA_TRENDS.filter(x => x !== s.trendTV.drama));
  if (U.chance(0.5)) s.trendTV.show = U.pick(SHOW_TRENDS.filter(x => x !== s.trendTV.show));
  ytTrendCheck(s, true);
  if (!s.trendTV.anime || U.chance(0.5)) s.trendTV.anime = U.pick(ANIME_TRENDS.filter(x => x !== s.trendTV.anime));
  if (!s.trendTV.web || U.chance(0.5)) s.trendTV.web = U.pick(ANIME_TRENDS.filter(x => x !== s.trendTV.web));
  // 해마다 순수익을 적어 둔다 (재정 창 연도별 탭, UI 개편 시안)
  (s.yNet = s.yNet || {})[calY(s) - 1] = Object.values(s.yinc || {}).reduce((a, v) => a + v, 0);
  s.lastYinc = s.yinc || {}; s.lastYincY = calY(s) - 1; s.yinc = {};
  peopleYear(s);
  familyYear(s);
  elderYear(s);
  if (typeof mcnYear === 'function') mcnYear(s);
  coTeamYear(s);
}
// 결혼했고 30세가 넘었는데 일이 없거나(구직 중·무직) 아직 학생이면 전업주부로 본다 (피드백 17, 20)
// 무언가를 준비하던 사람(○○ 준비생·지망생)은 대개 다른 일을 찾고, 넷 중 하나만 전업주부가 된다 (피드백 20: 배우자가 전업주부인 경우가 너무 많았다)
const JOBLESS_RE = /구직|무직/, STUDENT_RE = /^(학생|대학생)$/, ASPIRE_RE = /준비생|지망생|취업 준비/;
const SETTLE_JOBS = ['회사원', '공무원', '간호사', '교사', '은행원', '개발자', '디자이너', '카페 사장', '학원 강사', '자영업'];
function homemakerFix(s, n) {
  if (!n || n.id === s.me || n.alive === false) return;
  const wed = n.married || n.rel === '배우자' || ((n.rel === '엄마' || n.rel === '아빠') && !s.family.single);
  if (!wed || pAge(s, n) < 30) return;
  const j = n.job || '';
  if (JOBLESS_RE.test(j) || STUDENT_RE.test(j)) n.job = '전업주부';
  else if (ASPIRE_RE.test(j)) n.job = U.chance(0.25) ? '전업주부' : U.pick(SETTLE_JOBS);
}
// 아이돌 그룹 멤버 · 아이돌 연습생 동기 (밴드는 빼고)
function idolMate(n) { return ['멤버', '전 멤버', '동기'].includes(n.rel) && /아이돌|연습생/.test(n.job || '') && !/밴드/.test((n.job || '') + (n.met || '')); }
// 가족을 부르는 말: 딸 · 아들 · 언니 · 오빠 · 누나 · 형 · 동생
function famCall(s, n) {
  if (n.rel === '자녀') return n.g === '여' ? '딸' : '아들';
  if (pAge(s, n) <= age(s)) return '동생';
  return myGender(s) === '여' ? (n.g === '여' ? '언니' : '오빠') : (n.g === '여' ? '누나' : '형');
}
function peopleYear(s) {
  for (const n of people(s)) {
    const na = pAge(s, n);
    if (!['자녀', '형제자매', '엄마', '아빠', '업계'].includes(n.rel) && !n.ind && n.job === '학생' && na >= 20 && U.chance(0.45)) {
      n.job = U.pick(['회사원', '대학원생', '공무원 준비생', '간호사', '카페 사장', '프리랜서 디자이너', '은행원', '스트리머', '교사', '개발자']);
      const near = n.rel === '연인' || n.rel === '배우자';
      if (near || n.aff >= 40) addLog(s, `${near ? n.rel + ' ' : ''}${josa(n.name, '이가')} ${n.job}${n.job.endsWith('생') ? '이' : ''} 되었${near ? '다.' : '다는 소식을 들었다.'}`, 'news');
    }
    // 결혼: 가족(형제자매 · 자녀)이면 결혼식에 참석하고, 남이면 청첩장이 온다 (미성년자인 나에게는 어른 동료의 청첩장이 오지 않는다)
    // 아이돌 그룹 멤버 · 연습생 동기는 30세 전에 대놓고 결혼하지 않는다. 몰래 결혼했다가 기사로 알려질 수는 있다
    if (!n.married && na >= 27 && !['연인', '배우자', '엄마', '아빠'].includes(n.rel) && U.chance(0.07)) {
      if (idolMate(n) && na < 30) {
        if (U.chance(0.15)) { n.married = true; if (n.aff >= 20) addLog(s, `${n.rel === '멤버' ? '같은 그룹 멤버 ' : ''}${n.name}의 비밀 결혼이 기사로 알려졌다.`, 'news'); }
      } else {
        n.married = true;
        if (['형제자매', '자녀'].includes(n.rel)) addLog(s, `${famCall(s, n)} ${n.name}의 결혼식에 참석했다.`, 'news');
        else if (n.aff >= 45 && age(s) >= 19) addLog(s, `${n.name}에게서 청첩장이 왔다.`, 'news');
      }
    }
    if (s.t - (n.contactT || 0) > 12 && !['배우자', '엄마', '아빠', '자녀', '형제자매', '업계'].includes(n.rel)) aff(n, -3);
    homemakerFix(s, n);
  }
}

// 명절 용돈 (만 원, 집안 형편 1~10단계): 어릴수록 적고(4~7세 절반) 중고등학생은 1.5배. 조금씩 오르내린다
const HOLIDAY_MONEY = [0, 1, 2, 3, 5, 7, 10, 15, 20, 35, 50];
// 나이에 따라 조금씩 늘어난다 (피드백 29): (나이-1)^1.2에 비례한다 (4세는 기준의 0.25배, 12세 1.2배, 18세 2배쯤)
// 4~18세에 받는 돈을 다 더하면 예전(4~7세 절반 · 8~12세 그대로 · 13~18세 1.5배)과 같다
const HOL_K = (() => { let t = 0; for (let a = 4; a <= 18; a++) t += Math.pow(a - 1, 1.2); return 16 / t; })();
function holidayMoney(s) {
  const a = age(s), w = U.clamp(s.wealth || 5, 1, 10), k = HOL_K * Math.pow(Math.max(3, a - 1), 1.2);
  return Math.max(1, Math.round(HOLIDAY_MONEY[w] * k * U.fl(0.8, 1.2) * (parentsAlive(s).length ? 1 : 0.5))) * 1e4;
}
// 명절에 받은 돈은 내 이름으로 된 통장에 모인다 (피드백 30: 어린아이가 큰돈을 들고 다니는 게 아니다)
// 처음 받을 때 통장을 만들고, 그 뒤로는 부모님이 넣어 두신다. 14세부터는 내가 넣는다
function holBankNote(s) {
  const m = mom(s), d = dad(s), who = m && m.alive ? '엄마' : d && d.alive ? '아빠' : '';
  if (!s.flags.bankbook) { s.flags.bankbook = true; return who ? ` ${who}가 내 이름으로 통장을 만들어 주셨다. 명절에 받는 돈은 여기에 모아 두기로 했다.` : ' 내 이름으로 된 통장에 모아 두기로 했다.'; }
  return who && age(s) < 14 ? ` ${who}가 내 통장에 넣어 두셨다.` : ' 내 통장에 넣어 두었다.';
}
function livingMoney(s) {
  const a = age(s), m = calM(s);
  if ((m === 1 || m === 8) && !s.army) {
    const hol = m === 1 ? '설날' : '추석';
    // 명절 용돈 (피드백 26): 4~18세는 설날·추석에 집안 형편만큼 용돈을 받는다. 매달 받는 용돈은 없다
    if (a < 19) { if (a >= 4) { const v = holidayMoney(s); addMoney(s, v, '명절 용돈'); addLog(s, `${hol}에 가족과 시간을 보냈다. ${hol === '설날' ? '세뱃돈' : '용돈'}으로 ${fmtWon(v)}을 받았다.` + holBankNote(s), 'flavor'); } }
    else if (anyTrackActive(s) && totalFans(s) >= 1e5 && U.chance(0.6)) addLog(s, `${hol} 특집 촬영 때문에 본가에 못 갔다.`);
    else if (s.home.mode === 'alone' && parentsAlive(s).length && U.chance(0.5)) addLog(s, `${hol}에 본가에 다녀왔다.` + fx(s, { money: -20e4, stress: -4 }));
  }
  if (s.flags.artFee && schoolYear(s) >= 10 && !s.edu.graduated) addMoney(s, -20e4, '예술고 레슨비');
  // 등록금: 대학은 3월에 들어가서 생일과 상관없다 (v117 학사 일정)
  if (inUni(s) && !s.army) {
    if (s.wealth >= 5 && parentsAlive(s).length) s.mon.familyPaid = (s.mon.familyPaid || 0) + 70e4;
    else { s.debt += 70e4; s.mon.items['학자금 대출'] = (s.mon.items['학자금 대출'] || 0) - 70e4; }
  }
  if (a >= 19 && !s.army) {
    if (!isDorm(s)) housingMonth(s);
  }
  if (s.debt > 0) s.debt += Math.round(s.debt * 0.005);
  if (s.money < 0) { s.debt += -s.money; s.money = 0; }
  if (s.debt > 0 && s.money > 0) {
    const reserve = a >= 19 ? REGION_BY[s.region].rent * 2e4 : 0;
    const pay = Math.min(s.debt, Math.max(0, s.money - reserve));
    if (pay > 0) { s.debt -= pay; s.money -= pay; s.mon.items['빚 갚기'] = (s.mon.items['빚 갚기'] || 0) - pay; }
  }
  s.debtM = s.debt > 3000e4 ? (s.debtM || 0) + 1 : 0;
}
function royalties(s) {
  let sum = 0;
  const by = {};
  // 내 회사 소속으로 낸 곡(c.co)은 회사가 있는 동안 자본금으로 들어간다 (v105)
  const co = trackOn(s, 'agency') ? s.tracks.agency : null;
  let toCo = 0;
  for (const c of s.catalog) {
    workPay(s, c.title, c.m);
    if (c.co && co) toCo += c.m;
    else { sum += c.m; if (c.job) by[c.job] = (by[c.job] || 0) + c.m; }
    c.m = Math.max(c.floor, Math.round(c.m * 0.95));
  }
  if (toCo > 0) coIn(co, toCo, '대표 음원 · 저작권 수익', 'music');
  if (sum > 0) { addMoney(s, sum, '저작권료·음원 수익', true); for (const j in by) jobEarnAdd(s, j, by[j]); }
}
function bodyMonth(s) {
  // 스트레스는 매달 저절로 조금 풀린다 (밝은 성격은 더 빨리)
  // 집이 좁으면 더디게, 넓으면 빨리 풀린다 (v151, life.js homeRest)
  addStress(s, -3 * pm(s, 'stressRegen') * (typeof homeRest === 'function' ? homeRest(s) : 1));
  if (s.stress >= 80) s.hiStressM = (s.hiStressM || 0) + 1;
  else { s.hiStressM = Math.max(0, (s.hiStressM || 0) - 1); s.stressWarned = false; }
  if (s.stress >= 70) s.longStress = (s.longStress || 0) + 1;
  if (s.ill) { s.ill.left--; if (s.ill.left <= 0) { addLog(s, `${s.ill.n}에서 회복했다.`); s.ill = null; } }
  jpopMonth(s); fameMonth(s);
  if (s.stress >= 85 && anyTrackActive(s)) s.rep = U.clamp(s.rep - 0.4, 0, 100);
  else s.rep = U.clamp(s.rep + (60 - s.rep) * 0.004, 0, 100);
  subsMonth(s);
  const p = partner(s);
  // 연인·배우자: 반년 안에 한 번은 데이트하면 가까워지고, 그보다 오래 안 만나면 멀어진다. 결혼하면 배우자 수입이 들어온다
  if (p) {
    const since = s.t - (p.callT != null ? p.callT : (p.dateT != null ? p.dateT : s.t));
    aff(p, (since <= 6 ? 0.4 : since <= 12 ? -0.4 : -1) - (p.trait === 'sensitive' && s.stress > 70 ? 1 : 0));
    p.contactT = s.t;
    if (isSpouse(p)) { const v = spousePay(s, p); if (v > 0) addMoney(s, v, '배우자 수입'); }
  }
}
// 대학 졸업: 4년이 지나면 알려 준다
function uniMonth(s) { const u = s.edu.uni; if (u && !u.done && s.t >= u.end) { u.done = true; queueEv(s, 'uni_grad', 0, {}, true); } }
function armyMonth(s) {
  // 입대할 때 끊기는 지속 관리 (v129). 이미 복무 중이던 예전 세이브도 여기서 끊는다 (v130)
  for (const id in s.subs || {}) if (s.subs[id] && SUBS[id] && !SUBS[id].kids) delete s.subs[id];
  addMoney(s, 100e4, '군 복무 월급');
  s.army.pay = (s.army.pay || 0) + 100e4;
  s.army.left--;
  // 대학을 다니다 입대하면 휴학한다: 복무하는 동안 졸업이 그만큼 늦춰진다 (예전엔 군대에 있는 동안에도 학기가 흘러 22세쯤 졸업해 있었다)
  const u = s.edu.uni;
  if (u && !u.done && s.t < u.end) u.end++;
  s.fans.kr = Math.round(s.fans.kr * 0.993);
  addStress(s, 1);
  // 전역: 들어갈 때와 비교한 상태 창을 띄운다
  if (s.army.left <= 0) { const a = s.army; s.army = null; s.armyDone = true; milestone(s, `${age(s)}세에 군 복무를 마쳤다.`); queueEv(s, 'army_end', 0, { from: a.from || null, pay: a.pay || 0 }, true); }
}
function flavor(s) {
  if (!U.chance(0.28) || s.army) return;
  const c = FLAVOR.filter(f => { try { return f.c(s) && (!f.w || f.w(s) > 0); } catch (e) { return false; } });
  if (!c.length) return;
  const f = U.wpick(c, f => f.w ? f.w(s) : 1);
  addLog(s, f.x + fx(s, f.f || {}), 'flavor');
}
function successCheck(s) {
  if (!s.everSuccess && (s.earned >= 2000e4 || totalFans(s) >= 20000 || s.works.length >= 5 || (s.tracks.agency && (s.tracks.agency.peakF || 0) >= 20000))) {
    s.everSuccess = true;
    milestone(s, `${age(s)}세 무렵, 업계에서 이름이 알려지기 시작했다.`);
  }
  if (s.everSuccess && age(s) >= 19) s.noIncM = s.t - (s.lastEntT != null ? s.lastEntT : s.t);
}

// ───── 새 인생 ─────
function blankState() {
  return {
    v: 4, id: U.uid(), t: 0, birthYear: new Date().getFullYear(), birthMonth: U.int(0, 11),
    people: {}, me: null, family: {}, fans: { kr: 0, jp: 0, us: 0 }, tracks: {}, slots: [],
    log: [], ms: [], works: [], catalog: [], awards: [], flags: {}, cd: {}, queue: [], done: {},
    home: { mode: 'parents', type: null }, edu: { hs: null, hsBonus: null, uni: null, graduated: false }, subs: {}, equip: {},
    money: 0, debt: 0, earned: 0, jobEarn: {}, jobEarn0: 0, everSuccess: false, peak: { fans: 0, money: 0 }, yinc: {},
    mon: { inc: 0, exp: 0, ent: 0, items: {} }, lastMon: null, pending: null, ended: null, gen: 1, inbox: [], projects: [],
    apSeen: {}, careerLog: [], carOn: {}, cmast: {}, clTr: 1, tier7: true,
  };
}
function newLife() {
  const s = blankState();
  rollCoNames(s); applyCoNames(s);
  const r = U.wpick(REGIONS, x => x.w);
  s.region = r.id; s.birthRegion = r.id; s.place = U.pick(r.places); s.birthPlace = s.place;
  s.wealth = U.int(1, 10);
  const jobs = s.wealth <= 3 ? JOBS_LOW : s.wealth <= 7 ? JOBS_MID : JOBS_HIGH;
  const momAge = U.int(26, 38);
  const single = U.chance(0.1);
  const m = makePerson(s, { g: '여', age: momAge, rel: '엄마', aff: 80, job: U.pick(jobs), orient: 's' });
  s.family.mom = m.id; giveHobbies(s, m);
  if (!single) { const d = makePerson(s, { g: '남', age: momAge + U.int(-2, 5), rel: '아빠', aff: 80, job: U.pick(jobs.filter(j => j !== '전업주부')), orient: 's' }); s.family.dad = d.id; giveHobbies(s, d); }
  s.family.single = single;
  s.olderSib = U.wpick([0, 1, 2], x => [45, 40, 15][x]);
  s.youngerSib = 0;
  const g = U.chance(0.5) ? '여' : '남';
  // 나는 아빠 성을 따른다 (엄마 혼자 키우면 엄마 성)
  const p = makePerson(s, { g, name: (dad(s) || m).name.slice(0, 1) + U.pick(g === '여' ? NAMES_F : NAMES_M), age: 0, rel: '나', aff: 100, job: '아기', tal: ensureGift(inheritTalents(m, dad(s), momAge)) });
  s.me = p.id;
  // 위로 형제가 있으면 사람으로 만든다 (친밀도가 있고, 돈을 빌릴 수도 있다)
  { let a = 0; for (let i = 0; i < s.olderSib; i++) { a += U.int(1, 4); makeSib(s, a); } }
  s.persona = pickPersona(p);
  s.health = U.wpick(HEALTHS, h => h.w).id;
  s.stress = 5; s.rep = 60; s.fame = 0; s.buzz = 0; s.jpop = {};
  for (const id of CAREER_IDS) s.tracks[id] = { st: 'none' };
  s.trend = U.pick(TRENDS); rollTV(s);
  s.awPremCut = true;
  return s;
}
// 이름은 주인공 사람 객체에 있다
function myName(s) { return me(s).name; }
function myGender(s) { return me(s).g; }
function startLife(s) {
  const r = REGION_BY[s.region], p = me(s);
  addLog(s, `${s.birthYear}년 ${s.birthMonth + 1}월, ${s.place}의 ${wealthWord(s.wealth)} 집에서 ${p.g === '여' ? '딸' : '아들'}로 태어났다. 이름은 ${p.name}.`, 'birth');
  const sib = s.olderSib ? `위로 ${p.g === '여' ? '언니·오빠' : '형·누나'}가 ${s.olderSib}명 있다. ` : '';
  if (s.family.single || sib) addLog(s, `${s.family.single ? '엄마 혼자 키우는 집이다. ' : ''}${sib}`.trim(), 'birth');
  milestone(s, `${s.birthYear}년, ${s.place}의 ${wealthWord(s.wealth)} 집에서 ${p.g === '여' ? '딸' : '아들'}로 태어났다.`);
  const gf = gifts(p).filter(k => k !== 'looks' && k !== 'star');
  if (gf.length) { const w = gf.map(k => TALENT_BY[k].n).join('·'); milestone(s, `타고난 재능은 ${w}${josa(w, '이').endsWith('이') && josa(w, '이') !== w ? '이었다' : '였다'}.`); }
}

// ───── 저장 ─────
function save(s) { try { if (s) localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* 저장 공간 부족 등 */ } }
function loadSave() {
  try { const j = localStorage.getItem(SAVE_KEY); if (!j) return null; const s = JSON.parse(j); return s && s.v === 4 ? migrate(s) : null; } catch (e) { return null; }
}
// v144: 영상 플랫폼 이름을 지어낸 '라이브온'로, 직업 이름을 '스트리머'로 바꿨다. 예전 세이브에 남은 글 · 직업 이름 · 돈 항목 이름도 한 번에 바꾼다 (값과 열쇠 모두)
function pfRename(o) {
  const A = '유튜브', B = '유튜버', H = '유튜';
  const fix = x => x.split(A).join('라이브온').split(B).join('스트리머');
  const walk = v => {
    if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) { const x = v[i]; if (typeof x === 'string') { if (x.includes(H)) v[i] = fix(x); } else if (x && typeof x === 'object') walk(x); } return; }
    for (const k of Object.keys(v)) {
      const x = v[k];
      if (typeof x === 'string') { if (x.includes(H)) v[k] = fix(x); } else if (x && typeof x === 'object') walk(x);
      if (k.includes(H)) { v[fix(k)] = v[k]; delete v[k]; }
    }
  };
  if (o && typeof o === 'object') walk(o);
  return o;
}
function migrate(s) {
  // v153: 컴백 회의 · 타이틀곡 고르기 창이 기획 창으로 바뀌었다 (줄 서 있던 것 · 떠 있던 것을 옮긴다)
  for (const q of (s.queue || []).concat(s.pending ? [s.pending] : [])) if (q.id === 'co_cb' || q.id === 'co_song') { q.id = 'co_plan'; q.d = { gid: q.d && q.d.gid, debut: !!(q.d && q.d.debut) }; }
  if (!s.pfRen) { pfRename(s); s.pfRen = 1; }
  // v151: 지명을 실제 이름으로 (수원 → 수원시 장안구)
  if (typeof PLACE_OLD !== 'undefined') { if (PLACE_OLD[s.place]) s.place = PLACE_OLD[s.place]; if (PLACE_OLD[s.birthPlace]) s.birthPlace = PLACE_OLD[s.birthPlace]; if (!s.birthPlace && s.birthRegion === s.region) s.birthPlace = s.place; }
  // v149: 직업별 팬. 예전 세이브는 지금 팬을 직업마다 번 돈의 비율로 나눠서 시작한다 (번 돈 기록이 없으면 모두 '그 밖')
  if (!s.jf && s.fans && s.tracks) { s.jf = {}; const T = totalFans(s), E = s.jobEarn || {}, ks = Object.keys(E).filter(k => E[k] > 0 && s.tracks[k]); const sum = ks.reduce((a, k) => a + E[k], 0); if (T > 0 && sum > 0) for (const k of ks) s.jf[k] = T * E[k] / sum; jfSync(s); }
  // 피드백 22: 예전 '영화감독(내 영화 만들기)'을 없앴다. 하던 사람은 영화감독(예전 연출감독) 일로 옮기고, 하던 기획은 접는다
  { const fm = s.tracks.filmmaker;
    if (fm && fm.st !== 'none' && fm.st !== 'ended') {
      const d = s.tracks.director, on = d && d.st !== 'none' && d.st !== 'ended';
      if (on) { d.tier = Math.max(d.tier || 0, fm.tier || 0); d.works = (d.works || 0) + (fm.works || 0); d.rep = Math.max(d.rep || 0, fm.rep || 0); d.pro = true; }
      else s.tracks.director = { st: 'active', mode: 'indie', tier: Math.max(fm.tier || 0, (d && d.tier) || 0), works: (fm.works || 0) + ((d && d.works) || 0), rep: Math.max(fm.rep || 0, (d && d.rep) || 0), hist: (d && d.hist) || [], proj: null, adM: 0, months: 0, co: '', sal: 0, pro: true };
      const pj = fm.pj; fm.st = 'ended'; fm.endNote = '영화감독 (연출감독 일로 옮김)'; fm.pj = null;
      (s.careerLog = s.careerLog || []);
      addLog(s, `'영화감독(내 영화 만들기)' 일이 없어져서 프리랜서 연출감독 일로 옮겼다.${pj && pj.title ? ` 준비하던 「${pj.title}」 기획은 접었다.` : ''}`, 'career');
    }
    for (const sl of s.slots || []) if (sl.act === 'c_filmmaker') { sl.act = trackOn(s, 'director') ? 'c_director' : 'rest'; if (sl.lock) sl.lock = null; }
    if (s.jobDo && s.jobDo.filmmaker) { if (!s.jobDo.director) s.jobDo.director = 'main'; delete s.jobDo.filmmaker; }
    s.queue = (s.queue || []).filter(q => !/^fm_/.test(q.id));
    if (s.pending && /^fm_/.test(s.pending.id)) s.pending = null;
    if (s.jobEarn && s.jobEarn.filmmaker) { s.jobEarn.director = (s.jobEarn.director || 0) + s.jobEarn.filmmaker; delete s.jobEarn.filmmaker; }
  }
  // 피드백 26: 인간관계 트리 뷰. 예전 동료는 만난 곳 글자로 어느 직업이었는지 짐작해 둔다
  for (const id in s.people) { const n = s.people[id]; if (!n.metJob && typeof pplTop === 'function' && pplTop(n) === 'work') n.metJob = metJobGuess(s, n); }
  // 피드백 27: 동료는 그때 내 소속으로 묶는다. 예전 동료는 만난 곳 글자로 알 수 있을 때만 채운다
  for (const id in s.people) { const n = s.people[id]; if (!n.metOrg && typeof pplTop === 'function' && pplTop(n) === 'work') { const o = orgGuess(s, n, n.metJob); if (o) n.metOrg = o; } }
  // 피드백 25: 수상 프리미엄을 60%로 줄였다. 이미 쌓인 것도 한 번만 같은 비율로
  if (!s.awPremCut) { for (const j in (s.awPrem || {})) s.awPrem[j] = Math.round(s.awPrem[j] * 0.6 * 1000) / 1000; s.awPremCut = true; }
  // 피드백 25: MCN 편집팀 사람들 (예전 세이브에서 이미 MCN에 있으면 담당 편집자·팀 동료를 만난 것으로)
  if (typeof mcnMeetOld === 'function') mcnMeetOld(s);
  coMigrateKeys(s);
  // v83: 강사 회사를 학원 · 인강 9곳으로 합쳤다. 없어진 회사에 있던 강사는 같은 종류에서 크기가 가장 가까운 곳으로
  if (typeof tuMigrate === 'function') tuMigrate(s);
  // 피드백 24: 업계 감독의 직업 이름 '영화감독' → '연출감독'
  for (const id in s.people) if (s.people[id].job === '영화감독') s.people[id].job = '연출감독';
  // 피드백 24: 연예대상 프리미엄(varPrem)을 모든 시상식 공통 수상 프리미엄(awPrem)으로
  if (s.varPrem) { s.awPrem = Object.assign({}, s.awPrem, { variety: ((s.awPrem || {}).variety || 0) + s.varPrem }); s.awN = Object.assign({}, s.awN, { variety: s.varAwN || 1 }); }
  delete s.varPrem; delete s.varAwN;
  if (s.trendTV) ytTrendCheck(s, false);
  // 피드백 23: 하나뿐이던 '인기'를 직업별 인기로 나눴다. 하던(했던) 직업은 예전 인기 값에서 시작하고, 인지도는 팬 수로 다시 셈한다
  if (s.fame == null) {
    const old = typeof s.pop === 'number' ? s.pop : 50;
    s.jpop = {}; for (const id of POP_JOBS) { const t = s.tracks[id]; if (t && t.st && t.st !== 'none') s.jpop[id] = old; }
    s.buzz = 0; s.fame = fameBase(s); delete s.pop;
  }
  // 피드백 23: 소속 감독(월급)을 전속 계약(계약금 + 작품마다 연출료)으로 바꿨다. 예전 소속 감독은 남은 계약을 연출료 절반으로 이어 간다
  { const dt = s.tracks.director;
    if (dt && dt.mode === 'staff') { dt.mode = 'excl'; dt.feeR = 0.5; dt.cMonths = 36; dt.bonus = 0; dt.sal = 0; }
    s.queue = (s.queue || []).filter(q => q.id !== 'dir_staff_end');
    if (s.pending && s.pending.id === 'dir_staff_end') s.pending = null;
  }
  // 직업별 번 돈(피드백 20): 예전 세이브는 지금까지 번 돈을 '예전에 번 돈'으로 두고 이제부터 나눠 적는다
  if (!s.jobEarn) { s.jobEarn = {}; s.jobEarn0 = s.earned || 0; }
  // 성적 지향은 모두 이성애 (예전 세이브도)
  for (const id in s.people) s.people[id].orient = 's';
  for (const id in s.people) homemakerFix(s, s.people[id]);
  for (const id of CAREER_IDS) if (!s.tracks[id]) s.tracks[id] = { st: 'none' };
  // 예전 세이브: 스트리머 직업의 회사 소속 버튜버 → 버츄얼 아이돌 (6-2단계)
  if (typeof viMigrate === 'function') viMigrate(s);
  s.subs = s.subs || {}; s.equip = s.equip || {}; s.yinc = s.yinc || {}; s.inbox = s.inbox || []; s.projects = s.projects || [];
  s.cmast = s.cmast || {};
  // 같은 직업 활동은 한 칸만 (0단계): 예전 세이브에 두 칸 이상 들어 있으면 하나만 남긴다
  if (s.slots) dedupeJobSlots(s);
  if (!s.trendTV) rollTV(s);
  // 예전 세이브: 5단계 등급(0~4)을 7단계의 같은 자리로 옮긴다 (예: 예전 '주연 배우' → 지금 '주연 배우')
  if (!s.tier7) {
    s.tier7 = true;
    const M = { actor: [0, 2, 3, 4, 6], variety: [0, 1, 3, 4, 6], model: [0, 1, 3, 4, 6], director: [0, 2, 3, 5, 6], writer: [0, 1, 3, 5, 6] };
    for (const id in M) { const t = s.tracks[id]; if (t && t.tier != null && t.tier >= 0 && t.tier <= 4) t.tier = M[id][t.tier]; }
  }
  // 예전 세이브: 성인이 된 뒤 출연작 수(신인상 기준)가 없으면, 지금 성인이면 출연작 전부를 성인 작품으로 본다
  { const t = s.tracks.actor; if (t && t.works && t.adultWorks == null) t.adultWorks = age(s) >= 19 ? t.works : 0; }
  // 소속을 옮길 때 성인 출연작 수가 지워지던 문제(35세에 신인상): 작품 기록에서 다시 센다
  { const t = s.tracks.actor; if (t && t.works && typeof adultActWorks === 'function') t.adultWorks = Math.max(t.adultWorks || 0, adultActWorks(s)); }
  // 예전 세이브: 신인감독상은 첫 큰 연출작(드라마·OTT·영화)이 나온 뒤 1년만. 작품 기록에서 그때를 찾는다
  { const t = s.tracks.director; if (t && t.works && t.debutT == null) { const w = (s.works || []).find(x => /^(드라마|OTT 시리즈|영화) 연출$/.test(x.type)); if (w) t.debutT = w.a * 12; } }
  // 예전 세이브: 가수 신인상은 처음 데뷔한 해에만. 이미 데뷔했으면 그해를 찾아 둔다 (아이돌은 데뷔 뒤 개월 수로, 솔로·밴드는 첫 싱글 기록으로)
  if (!s.flags.musicDebutY) { const ti = s.tracks.idol, so = s.tracks.solo, b = s.tracks.band, w = (s.works || []).find(x => x.type === '싱글' || x.type === '밴드 싱글'); let y = null; if (ti && ti.g && ti.months != null) y = s.birthYear + Math.floor((s.birthMonth + s.t - ti.months) / 12); if (w && (y == null || w.y < y)) y = w.y; if (y == null && ((so && so.rel) || (b && b.rel))) y = calY(s) - 1; if (y != null) s.flags.musicDebutY = y; }
  // 예전 세이브 (v92): 센스 → 유머 감각 · 통찰력 (각각 센스 ±8), 끈기는 새로 굴린다 (평균 45). 성격 조건 맞추기보다 먼저 한다
  for (const p of Object.values(s.people)) {
    const t = p.tal;
    if (!t) continue;
    const r = v => Math.round(U.clamp(v, 3, 97));
    if (t.sense != null) { if (t.humor == null) t.humor = r(t.sense + U.normal(0, 8)); if (t.insight == null) t.insight = r(t.sense + U.normal(0, 8)); delete t.sense; }
    if (t.grit == null) t.grit = r(U.normal(45, 16));
  }
  // 예전 세이브: 성격과 맞지 않는 재능은 성격에 맞게 올린다 (예민함인데 창의력이 낮았던 경우 등)
  { const P = PERSONA_BY[s.persona], mp = s.people[s.me]; if (P && P.need && mp) for (const [k, v] of Object.entries(P.need)) if ((mp.tal[k] || 0) < v) mp.tal[k] = v; }
  // 예전 세이브: 특기마다 따로 있던 지도 실력(○○ 트레이닝)은 '교육' 특기 하나로 합친다 (가장 높던 레벨로)
  for (const p of Object.values(s.people)) {
    let top = 0;
    for (const k in p.sk) { const x = p.sk[k]; if (x && x.tr) { top = Math.max(top, x.tr.lv || 0); delete x.tr; } }
    if (top >= 1 && !has(p, 'edu')) { learnSkill(s, p, 'edu', Math.round(top)); p.sk.edu.best = p.sk.edu.lv; }
  }
  // 예전 세이브: 경력 기록을 지금까지 남은 기록에서 만든다 (날짜를 모르는 건 '예전 기록'으로)
  if (!s.careerLog) {
    s.careerLog = [];
    for (const id of CAREER_IDS) {
      const t = s.tracks[id], C = CAREERS[id];
      if (!C || !t) continue;
      const notes = (t.hist || []).slice();
      if (t.st === 'ended' && t.endNote && !notes.includes(t.endNote)) notes.push(t.endNote);
      for (const n of notes) s.careerLog.push({ id, ic: C.ic, n, from: null, to: null, end: '' });
    }
  }
  if (!s.carOn) { s.carOn = {}; for (const id of CAREER_IDS) if (CAREERS[id] && trackOn(s, id)) s.carOn[id] = { n: careerSeg(s, id), from: Math.max(0, s.t - (s.tracks[id].months || 0)) }; }
  // 예전 세이브: 경력에 빠진 연습생 시절을 '걸어온 길'에서 찾아 넣는다 (N세에 OO 연습생이 되었다 ~ 데뷔했다)
  if (!s.clTr) {
    s.clTr = 1;
    if (!s.careerLog.some(c => /연습생/.test(c.n) && c.from != null)) {
      const add = []; let open = null;
      for (const m of s.ms) {
        const x = msText(m), a = x.match(/^(\d+)세에 (.+?) (밴드 )?연습생이 되었다/);
        if (a) { if (open) { open.to = +a[1] * 12; add.push(open); } open = { id: 'idol', ic: '💫', n: `${a[2]} ${a[3] ? '밴드 ' : ''}연습생`, from: +a[1] * 12, to: null, end: '' }; continue; }
        if (open && /데뷔했다/.test(x)) { open.to = m.a * 12; open.end = '데뷔'; add.push(open); open = null; }
      }
      if (open && s.tracks.idol.st !== 'trainee') add.push(open);
      // 날짜 없이 남아 있던 같은 회사 연습생 줄은 날짜 있는 줄로 바꾼다
      for (const c of add) { const i = s.careerLog.findIndex(x => x.from == null && x.n.startsWith(c.n)); if (i >= 0) { const r = s.careerLog[i].n.match(/\(([^()]*)\)\s*$/); if (r && !c.end) c.end = r[1]; s.careerLog.splice(i, 1); } }
      if (add.length) s.careerLog = s.careerLog.filter(c => c.from == null).concat(s.careerLog.filter(c => c.from != null).concat(add).sort((a, b) => a.from - b.from));
    }
  }
  if (!s.apSeen) applySeenInit(s);
  // 예전 세이브: 집 전체로 정하던 자녀 교육비 단계를 지금 교육받을 나이의 아이마다 똑같이 나눠 준다
  if (s.subs.kidedu != null) {
    const lvOld = s.subs.kidedu === true ? 2 : (+s.subs.kidedu || 0);
    delete s.subs.kidedu;
    s.kidEdu = s.kidEdu || {};
    if (lvOld) for (const k of kidsInEdu(s)) s.kidEdu[k.id] = lvOld;
  }
  // 예전 세이브: '연기대상 대상' → '연기대상' (연예대상도 같다)
  for (const a of s.awards) a.n = a.n.replace(/^(연기대상|연예대상) 대상$/, '$1');
  for (const m of s.ms) if (typeof m.x === 'string') m.x = m.x.replace(/(연기대상|연예대상) 대상을/, '$1을');
  // 예전 세이브: 혼자 시작하는 일도 알리게 됐다. 지금 이미 할 수 있는 것은 알린 것으로 친다
  if (s.apSeen && !s.flags.apNotify2 && typeof AP_NOTIFY !== 'undefined') { for (const a of jobApplies(s)) if (AP_NOTIFY.has(a.id) && applyOKNow(s, a)) s.apSeen[a.id] = 1; s.flags.apNotify2 = true; }
  // 예전 세이브: 체력을 없앴다. 체력만 올리던 '운동·자기관리' 칸은 '푹 쉬기'로, '식단 관리'는 그만둔다
  delete s.hp; delete s.hpMax;
  if (s.subs) delete s.subs.diet;
  for (const sl of s.slots || []) if (sl.act === 'care') sl.act = 'rest';
  // 예전 세이브: 심리 상담 정기권(켜기·끄기) → 1단계
  if (s.subs.counsel === true) s.subs.counsel = 1;
  // 예전 세이브: 멘탈은 스트레스로 합쳐서 없앴다
  delete s.mental;
  // 예전 세이브: 재능 10개 → 13개. 연기 → 표현력, 필력 → 언어 감각. 새 재능(목소리·손재주·예술 감각)은 비슷한 옛 재능 둘의 평균에 운을 더한다
  // 모델 특기는 직업으로 바뀌어 없앤다
  for (const p of Object.values(s.people)) {
    const t = p.tal || (p.tal = {});
    if (t.express == null) t.express = t.acting != null ? t.acting : 45;
    if (t.verbal == null) t.verbal = t.writing != null ? t.writing : 45;
    const mix = (a, b) => Math.round(U.clamp(((t[a] != null ? t[a] : 45) + (t[b] != null ? t[b] : 45)) / 2 + U.normal(0, 8), 3, 97));
    if (t.voice == null) t.voice = mix('music', 'star');
    if (t.hands == null) t.hands = mix('rhythm', 'intel');
    if (t.aesth == null) t.aesth = mix('creative', 'looks');
    delete t.acting; delete t.writing;
    for (const k of TALENT_IDS) if (t[k] == null) t[k] = 45;
    if (p.sk && p.sk.model) delete p.sk.model;
    if (p.lessons && p.lessons.model) delete p.lessons.model;
  }
  if (s.kidTeach && s.kidTeach.sk === 'model') s.kidTeach = null;
  // 예전 세이브: 형제자매가 숫자로만 있었으면 사람으로 만든다 (위로는 나보다 1~6살 많게, 아래로는 1~6살 어리게)
  if (!people(s, p => p.rel === '형제자매').length && (s.olderSib || s.youngerSib)) {
    const a0 = age(s), g = (s.sibG || []).slice();
    let a = a0; for (let i = 0; i < (s.olderSib || 0); i++) { a += U.int(1, 4); makeSib(s, a); }
    a = a0; for (let i = 0; i < (s.youngerSib || 0); i++) { a -= U.int(1, 4); makeSib(s, Math.max(0, a), g[i]); }
  }
  // 예전 세이브: 성이 다른 형제자매·아빠를 내 성으로 맞춘다 (한 번만)
  // 예전 세이브: 일정에 이미 넣어 둔 직업 활동은 할 일을 고른 것으로 친다
  if (!s.jobDo) { s.jobDo = {}; for (const sl of s.slots || []) if (sl.act && sl.act.startsWith('c_')) s.jobDo[sl.act.slice(2)] = 'main'; }
  if (!s.flags.surFix) { s.flags.surFix = true; const sur = me(s).name.slice(0, 1); for (const p of people(s, x => x.rel === '형제자매' || x.rel === '아빠')) if (p.name.slice(0, 1) !== sur) p.name = sur + p.name.slice(1); }
  // 예전 세이브: 직원 월급 한도의 기준(그 자리를 시작할 때 월급)이 없으면 지금 월급으로
  for (const id of ['anr', 'trainer']) { const t = s.tracks[id]; if (t && t.st === 'active' && !t.salBase) t.salBase = t.sal; }
  (s.slots || []).forEach((sl, i) => { if (sl.prev === 'p_model') sl.prev = null; if (sl.act === 'p_model') { sl.act = defaultAct(s, i); sl.lesson = false; } });
  // 예전 세이브: 이미 네 살이 넘은 아이에게는 자녀 교육비 알림을 다시 띄우지 않는다
  for (const k of (typeof kids === 'function' ? kids(s) : [])) if (kidAge(s, k) >= 4) k.eduTold = true;
  // 회사 이름 (10-7): 이 인생의 회사 이름을 다시 붙인다. 예전 세이브는 처음 이름 그대로
  // v117 장비 정책: 아직 본가에 사는 예전 세이브의 장비는 부모님이 사 주신 장비로 본다 (유지비도 부모님이)
  if (s.eqPar == null) { s.eqPar = {}; if (s.home && s.home.mode !== 'alone') for (const id in s.equip || {}) if (eqLv(s, id) && EQUIP[id] && !EQUIP[id].slot) s.eqPar[id] = true; }
  // v117 학사 일정: 예전 세이브는 생일 때 이미 중 · 고 입학 기록을 남겼다 (3월에 또 남기지 않게)
  if (s.edu && s.edu.midIn == null && s.me && s.people[s.me]) { s.edu.midIn = age(s) >= 13; s.edu.hsIn = age(s) >= 16; }
  // 없앤 사건(v117: 수상한 투자 권유 scam)이 기다리던 세이브는 그 창 · 대기열을 지운다
  if (s.pending && !EVENTS[s.pending.id]) s.pending = null;
  s.queue = (s.queue || []).filter(q => EVENTS[q.id]);
  // v116 버그 1 복구: '새 곡 준비' 창이 다른 창에 덮여 사라진 세이브는 곡 일정이 '대기 중'(99에서 줄어드는 값)에 멈춰 있다. 다음 달에 다시 뜨게 한다
  for (const [id, ev, res] of [['band', 'band_rel', 'band_relres'], ['solo', 'solo_rel', 'solo_relres']]) {
    const t = s.tracks && s.tracks[id];
    if (t && ['indie', 'signed'].includes(t.st) && t.nextRel > 12 && !hasQ(s, ev) && !hasQ(s, res) && !hasQ(s, 'band_arr')) t.nextRel = 1;
  }
  // v117 팀워크: 예전 세이브의 밴드 · 그룹은 같이 활동한 개월 수만큼(60까지) 팀워크를 안고 시작한다
  { const b = s.tracks && s.tracks.band, i = s.tracks && s.tracks.idol;
    if (b && b.b && typeof b.b.tw !== 'number') b.b.tw = Math.min(60, b.months || 0);
    if (i && i.g && typeof i.g.tw !== 'number') i.g.tw = Math.min(60, i.months || 0); }
  applyCoNames(s);
  return s;
}
// ───── 경력: 예전에 했던 일을 기간과 함께 남긴다 ─────
// 매달 직업마다 지금 하는 일의 이름(seg)을 보고, 이름이 바뀌거나(연습생 → 데뷔, 인디 → 소속) 끝나면 지난 경력으로 옮긴다
function careerSeg(s, id) { const C = CAREERS[id], t = s.tracks[id]; return C.seg ? C.seg(s, t) : C.short ? C.short(s, t) : C.n; }
function careerLogMonth(s) {
  s.carOn = s.carOn || {}; s.careerLog = s.careerLog || [];
  for (const id of CAREER_IDS) {
    const C = CAREERS[id];
    if (!C) continue;
    const on = trackOn(s, id), cur = s.carOn[id], seg = on ? careerSeg(s, id) : '';
    if (cur && (!on || cur.n !== seg)) {
      const note = on ? '' : (s.tracks[id].endNote || ''), m = note.match(/\(([^()]*)\)\s*$/);
      // 연습생에서 이름이 바뀌었거나(데뷔) 끝난 메모에 데뷔가 있으면 끝난 까닭은 '데뷔'
      const end = m ? m[1] : (/연습생$/.test(cur.n) && (on || /데뷔/.test(note))) ? '데뷔' : '';
      s.careerLog.push({ id, ic: C.ic, n: cur.n, from: cur.from, to: s.t, end });
      delete s.carOn[id];
    }
    if (on && !s.carOn[id]) s.carOn[id] = { n: seg, from: s.t };
  }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }
function getHall() { try { return pfRename(JSON.parse(localStorage.getItem(HALL_KEY) || '[]')); } catch (e) { return []; } }
function addHall(s, ep) {
  try {
    const h = getHall(), p = me(s);
    h.unshift({ id: s.id, name: p.name, g: p.g, by: s.birthYear, gen: s.gen, kind: ep.kind, retireAge: ep.retireAge, deathAge: ep.deathAge, title: ep.title, summary: ep.summary, lines: ep.lines, peakFans: s.peak.fans, earned: s.earned, awards: s.awards.length, at: Date.now(), soul: soulCard(s, ep) });
    localStorage.setItem(HALL_KEY, JSON.stringify(h.slice(0, 60)));
  } catch (e) { }
  SOULS = null;
}
// 환생 (v91): 인생이 끝날 때 주인공의 영혼 카드를 지난 인생 목록에 함께 남긴다 (다른 세이브에서도, 같은 세이브의 다음 세대에서도 쓴다)
// R: 다시 태어나는 해. 설정상 세상을 떠난 해(은퇴가 아니라 사망) 뒤의 어느 한 해 (1~20년 뒤)
// 남기는 것: 성별 · 외모 · 성격 · 가장 높은 재능 셋 · 가장 잘하던 특기 하나. 이름은 남기지 않는다 (새 이름으로 태어난다)
function soulCard(s, ep) {
  const p = me(s), tal = {};
  for (const x of TALENTS_SHOWN.slice().sort((a, b) => (p.tal[b.id] || 0) - (p.tal[a.id] || 0)).slice(0, 3)) tal[x.id] = p.tal[x.id];
  const k = learnedSkills(p).sort((a, b) => lv(p, b) - lv(p, a))[0];
  return { g: p.g, look: p.look, trait: p.trait, tal, sk: k || null, lv: k ? lvi(p, k) : 0, R: s.birthYear + ep.deathAge + U.int(1, 20) };
}
// 영혼 카드가 있는 지난 인생들 (인생이 끝날 때마다 다시 읽는다)
let SOULS = null;
function soulList() { if (!SOULS) SOULS = getHall().filter(e => e.soul && e.soul.R); return SOULS; }

// ───── 인생 결산 ─────
// 인생 결산의 한줄평 "~한 (직업)" (은퇴·아이에게 넘기기): 지금 하는 일을 먼저 보고, 없으면 해 본 일, 그것도 없으면 회사원
// 직업 칭호가 이미 '~한 무엇'(히트곡을 남긴 보컬, 스타를 길러 낸 트레이너)이면 그대로 쓴다
function lifeTitle(s) {
  const f = Math.max(s.peak.fans || 0, totalFans(s));
  const mod = f >= 1e6 ? '모두가 아는' : f >= 1e5 ? '이름을 알린' : f >= 1e4 ? '조금씩 이름을 알리던' : s.everSuccess ? '묵묵히 일하던' : '꿈을 좇던';
  const on = CAREER_IDS.filter(id => CAREERS[id] && trackOn(s, id));
  const ids = on.length ? on : CAREER_IDS.filter(id => CAREERS[id] && s.tracks[id] && s.tracks[id].st !== 'none');
  const best = on.length && CAREERS[on[0]].title ? CAREERS[on[0]].title(s, s.tracks[on[0]]) : null;
  if (best && /^(히트곡을|스타를|히트곡을 찾아낸) /.test(best)) return best;
  return `${mod} ${ids.length ? CAREERS[ids[0]].n.replace(/ \(.*\)$/, '') : '회사원'}`;
}
// ───── 인생 결산의 칭호 (12-5) ─────
// 주 직업: 등급이 가장 높고 오래 한 일. 칭호는 그 직업의 등급으로 정한다 (맨 위 등급이면 직업마다 다른 이름)
const END_CAT = { idol: 'music', solo: 'music', band: 'music', player: 'music', dancer: 'music', actor: 'screen', variety: 'screen', model: 'screen', voice: 'screen', director: 'screen', writer: 'screen', adir: 'screen', animator: 'screen', youtube: 'stream', vidol: 'stream', webtoon: 'ink', webnovel: 'ink', illust: 'ink', prof: 'teach', tutor: 'teach', trainer: 'teach', acttrainer: 'teach', composer: 'staff', lyricist: 'staff', producer: 'staff', anr: 'staff', editor: 'staff', marketer: 'staff', agency: 'biz' };
const END_TOP = { idol: '시대의 아이콘', solo: '국민 가수', band: '전설의 밴드', player: '연주의 거장', dancer: '춤의 전설', actor: '국민 배우', variety: '국민 MC', model: '런웨이의 전설', voice: '목소리의 장인', director: '거장 감독', writer: '믿고 보는 작가', adir: '애니메이션의 거장', animator: '작화의 신', youtube: '라이브온의 얼굴', vidol: '버츄얼의 전설', webtoon: '웹툰의 신', webnovel: '웹소설의 신', illust: '그림의 장인', prof: '시대의 석학', tutor: '전설의 일타 강사', trainer: '스타 메이커', acttrainer: '배우들의 스승', composer: '히트곡 제조기', lyricist: '노랫말의 장인', producer: '미다스의 손', anr: '히트곡 사냥꾼', editor: '편집의 장인', marketer: '홍보의 귀재', agency: '엔터 업계의 큰손' };
// 마지막 한 줄: 분야와 올라간 높이(hi 4등급 이상 · mid 2~3 · low)에 따라
const END_LINE = {
  music: { hi: '마지막 무대의 조명이 꺼질 때까지 객석의 떼창이 이어졌다.', mid: '작은 공연장에서 마지막 곡을 부르고 마이크를 내려놓았다.', low: '무대에 선 날은 길지 않았지만, 그때 들은 박수는 평생 잊지 않았다.' },
  screen: { hi: '마지막 촬영 날, 스태프 모두가 일어나 박수를 쳤다.', mid: '마지막 작품의 이름 자막이 올라가는 걸 조용히 지켜봤다.', low: '화면에 이름이 크게 걸린 적은 없어도, 현장을 떠나는 발걸음은 가벼웠다.' },
  stream: { hi: '마지막 방송의 채팅창은 고맙다는 말로 끝없이 올라갔다.', mid: '마지막 영상에 오래된 구독자들이 하나둘 댓글을 남겼다.', low: '채널은 조용히 닫았지만, 끝까지 봐 준 몇 사람의 이름은 기억했다.' },
  ink: { hi: '마지막 화가 올라온 날, 독자들은 첫 화부터 다시 읽기 시작했다.', mid: '마지막 원고를 보내고 오랜만에 늦잠을 잤다.', low: '많이 읽히지는 않았어도, 끝까지 쓴 이야기가 서랍에 남았다.' },
  teach: { hi: '마지막 수업이 끝나자 제자들이 강의실을 가득 채웠다.', mid: '마지막 수업을 마치고 칠판을 천천히 지웠다.', low: '가르친 사람은 많지 않았지만, 그중 누군가는 지금도 가끔 안부를 묻는다.' },
  staff: { hi: '이름이 앞에 나선 적은 없어도, 업계 사람들은 누구의 손을 거쳤는지 다 알았다.', mid: '마지막 일을 넘기고 책상을 정리했다.', low: '빛나는 자리는 아니었지만, 맡은 일을 끝까지 해냈다.' },
  biz: { hi: '회사 로비에는 지금도 그 이름이 걸려 있다.', mid: '회사를 다음 사람에게 맡기고 조용히 물러났다.', low: '회사는 크지 못했지만, 함께한 사람들과의 시간은 남았다.' },
};
function endMain(s) {
  let best = null;
  for (const id of CAREER_IDS) {
    const c = CAREERS[id], t = s.tracks[id];
    if (!c || !t || t.st === 'none') continue;
    const k = typeof jobTier === 'function' ? jobTier(s, id) : (t.tier || 0), m = typeof jobMonths === 'function' ? jobMonths(s, id) : (t.months || 0);
    const v = k * 100 + m / 12 + (trackOn(s, id) ? 5 : 0);
    if (!best || v > best.v) best = { id, k, m, v, n: c.n.replace(/ \(.*\)$/, ''), ic: c.ic || '', cat: END_CAT[id] || 'staff' };
  }
  return best;
}
function endTitle(s) {
  if (age(s) < 19) return '꿈을 좇던 아이'; // v185: 성인이 되기 전에 끝나면 (결산 미리 보기 포함)
  const M = endMain(s);
  if (!M) return lifeTitle(s);
  return M.k >= 6 ? (END_TOP[M.id] || `전설의 ${M.n}`) : M.k >= 4 ? `이름을 날린 ${M.n}` : M.k >= 2 ? `자리를 잡은 ${M.n}` : lifeTitle(s);
}
function endLastLine(s, kind, heir) {
  if (kind === 'handoff') return ''; // 아이에게 넘길 때는 아무 말도 쓰지 않는다 (v151, 사용자 결정)
  if (kind === 'fail') { const k = topSkill(s); return (k && FAIL_SKILL_LINE[k]) || '꿈은 접었지만, 무대 뒤에서 누군가의 꿈을 지켰다.'; }
  const M = endMain(s);
  if (!M) return '';
  return END_LINE[M.cat][M.k >= 4 ? 'hi' : M.k >= 2 ? 'mid' : 'low'];
}
// 곁들이는 칭호 (많아야 넷): 숫자로 드러나는 것만
function endBadges(s) {
  const B = [], f = Math.max(s.peak.fans || 0, totalFans(s)), jobs = new Set((s.careerLog || []).map(c => c.id).concat(Object.keys(s.carOn || {}))).size;
  if (f >= 1e6) B.push(['⭐', '밀리언 스타']); else if (f >= 1e5) B.push(['⭐', '이름난 얼굴']);
  if (s.awards.length >= 10) B.push(['🏆', '트로피 수집가']); else if (s.awards.length >= 1) B.push(['🏆', '수상자']);
  if (s.earned >= 1e10) B.push(['💰', '백억 클럽']); else if (s.earned >= 1e9) B.push(['💰', '십억 클럽']);
  if (jobs >= 5) B.push(['🎭', '팔방미인']);
  if (s.works.length >= 100) B.push(['📚', '다작왕']);
  if (kids(s).length >= 3) B.push(['👶', '다둥이 부모']);
  if (age(s) >= 65) B.push(['⏳', '평생 현역']);
  return B.slice(0, 4);
}
function bestTitle(s) {
  for (const id of CAREER_IDS) { const c = CAREERS[id], t = s.tracks[id]; if (c && c.title && t.st !== 'none') { const x = c.title(s, t); if (x) return x; } }
  return '';
}
function topSkill(s) { const p = me(s); return learnedSkills(p).sort((a, b) => lv(p, b) - lv(p, a))[0]; }
function lifeSummary(s) {
  const out = s.ms.map(msText);
  if (s.works.length) out.push('대표작은 ' + s.works.slice().sort((a, b) => (b.sc || 0) - (a.sc || 0)).slice(0, 3).map(w => `「${w.title}」`).join(', ') + '.');
  if (s.awards.length) out.push(`상은 모두 ${s.awards.length}개를 받았다.`);
  const p = partner(s);
  if (p) out.push(`${p.rel === '배우자' ? '배우자' : '연인'} ${josa(p.name, '과와')} 함께였다.`);
  const ks = kids(s);
  if (ks.length) out.push(`자녀: ${ks.map(k => k.name).join(', ')}.`);
  const k = topSkill(s);
  if (k) out.push(`가장 잘했던 건 ${SKILLS[k].n}(${lvi(me(s), k)}레벨)이었다.`);
  out.push(`업계에서 번 돈은 모두 ${fmtWon(s.earned)}, 가장 많을 때 팬은 ${fmtFans(s.peak.fans)}이었다.`);
  return out;
}
// 꿈을 접은 뒤에도 남아 있던 실력 (가장 잘하던 특기 하나)
const FAIL_SKILL_LINE = {
  vocal: '회식 자리 노래방에서 마이크를 잡으면 다들 하던 말을 멈추고 들었다.',
  rap: '운전하다 신호에 걸리면 옛날에 써 둔 가사를 혼자 중얼중얼 뱉어 보곤 했다.',
  dance: '회사 송년회 장기자랑에서 춤을 한 번 췄다가 그 뒤로 몇 년 동안 불려 나갔다.',
  guitar: '주말이면 먼지 쌓인 기타를 꺼내 아무도 없는 거실에서 한 곡씩 쳤다.',
  bass: '동네 직장인 밴드에서 베이스를 맡아 일 년에 한 번 작은 공연을 했다.',
  piano: '명절마다 조카들이 피아노 한 곡만 쳐 달라고 졸랐다.',
  keyboard: '동네 교회 반주를 오래 맡았다.',
  drum: '스트레스가 쌓이면 합주실을 한 시간 빌려 혼자 드럼을 두드렸다.',
  compose: '아무에게도 들려주지 않을 곡을 노트북에 몇백 개나 쌓아 두었다.',
  lyric: '휴대폰 메모장에는 쓰다 만 가사가 계속 쌓여 갔다.',
  script: '서랍 속에는 끝내 아무에게도 보여 주지 않은 시나리오가 몇 편 있었다.',
  direct: '가족 행사가 있을 때마다 카메라를 들고 작은 다큐멘터리를 찍었다.',
  edit: '담당 연예인의 개인 채널 영상은 늘 직접 편집해 줬다.',
  acting: '신인들이 대본 연습을 할 때면 옆에서 상대역을 맞춰 주곤 했다.',
  variety: '어느 자리에 가든 분위기를 띄우는 사람이었다.',
  model: '현장에서 신인들에게 카메라 앞에 서는 법을 몰래 알려 주곤 했다.',
  game: '퇴근하면 게임 한 판으로 하루를 풀었다.',
  study: '꼼꼼한 일정 관리로 회사에서 믿고 맡기는 사람이 되었다.',
  jp: '일본 일정이 잡히면 통역은 늘 내 몫이었다.',
  en: '해외 일정이 잡히면 통역은 늘 내 몫이었다.',
  art: '담당 연예인의 팬 사인회 굿즈 그림을 몰래 그려 주기도 했다.',
  scout: '눈여겨봤던 연습생이 몇 년 뒤 크게 떴을 때, 혼자 조용히 웃었다.',
};
// kind: 'fail' (이룬 것 없이 은퇴 → 매니저로 살다 은퇴), 'retire' (은퇴), 'handoff' (아이가 태어난 때나 열여덟 살이 된 때 아이의 인생으로 넘어감. heir: 그 아이)
function endLife(s, kind, why, heir) {
  if (s.ended) return;
  const a = age(s), pme = me(s);
  const life = (pme.g === '여' ? 86 : 80) + U.normal(0, 6) - (s.longStress || 0) / 40 + (s.health === 'weak' ? -3 : 0);
  const deathAge = Math.round(U.clamp(life, a + 1, 101));
  const cause = deathAge < 60 ? U.pick(['교통사고', '암', '심근경색']) : deathAge < 75 ? U.pick(['암', '심근경색', '뇌졸중']) : U.pick(['노환', '폐렴', '암', '심부전', '치매 합병증']);
  const lines = [];
  const p = partner(s);
  const cur = CAREER_IDS.filter(id => CAREERS[id] && trackOn(s, id)).map(id => CAREERS[id].n.replace(/ \(.*\)$/, '')).join('·');
  // 결산에는 긴 이야기 없이 한줄평(title)만 남긴다 (은퇴·꿈 접기·아이에게 넘기기 모두)
  // 해마다 기록에 마지막 해를 더한다 (그래프의 끝점)
  (s.yr = s.yr || []).push([calY(s), Math.round(totalFans(s)), Math.round(s.earned || 0)]);
  const ep = { kind, retireAge: a, deathAge, cause, lines, title: kind === 'fail' ? '무대 뒤를 지킨 매니저' : endTitle(s), last: endLastLine(s, kind, heir), summary: lifeSummary(s) };
  if (kind === 'handoff') { ep.heir = heir; ep.job = cur || '회사원'; }
  s.ended = ep;
  s.pending = null;
  addLog(s, kind === 'fail' ? '꿈을 접었다.' : kind === 'handoff' ? '이야기를 아이에게 넘겼다.' : '은퇴했다.', 'end');
  addHall(s, ep);
  save(s);
}
