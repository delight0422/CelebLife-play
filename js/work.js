'use strict';
// 업계 사람, 작품, 인맥, 스카우트(능력 감정)
// 업계 사람은 한 판 안에서 계속 남는다. 같은 사람을 몇 년 뒤에 또 만날 수 있다.

// 업계 직업별로 갖고 있는 특기 범위와 조금 높은 재능
const IND_JOBS = {
  '뮤지컬 배우': { sk: { vocal: [35, 80], acting: [30, 75], dance: [20, 65] }, tal: ['music', 'voice', 'express'] },
  '뮤지컬 연출가': { sk: { direct: [45, 88], acting: [30, 65] }, tal: ['aesth', 'insight'] },
  '음악감독': { sk: { compose: [45, 85], piano: [40, 85] }, tal: ['music', 'creative'] },
  '안무가': { sk: { dance: [55, 90] }, tal: ['rhythm', 'athletic'] },
  '캐스팅 담당자': { sk: { scout: [30, 88], acting: [10, 50], vocal: [10, 50] }, tal: ['insight'] },
  '배우': { sk: { acting: [35, 85] }, tal: ['express', 'voice', 'looks'] },
  '연출감독': { sk: { direct: [45, 90], script: [30, 75] }, tal: ['aesth', 'insight'] },
  '시나리오 작가': { sk: { script: [40, 88] }, tal: ['verbal', 'creative'] },
  '작곡가': { sk: { compose: [40, 88], piano: [20, 70] }, tal: ['music', 'creative'] },
  '작사가': { sk: { lyric: [40, 88] }, tal: ['verbal', 'creative'] },
  '프로듀서': { sk: { compose: [50, 90], lyric: [30, 70] }, tal: ['music', 'creative'] },
  '보컬 트레이너': { sk: { vocal: [50, 85] }, tal: ['music', 'voice'] },
  '편집자': { sk: { edit: [40, 88] }, tal: ['aesth', 'creative'] },
  '모델': { sk: { acting: [10, 45] }, tal: ['looks', 'athletic', 'express'] },
  '가수': { sk: { vocal: [40, 85], dance: [10, 60] }, tal: ['music', 'voice', 'star'] },
  '예능인': { sk: { variety: [40, 88] }, tal: ['humor', 'verbal'] },
  'A&R 담당자': { sk: { scout: [20, 70], compose: [5, 40] }, tal: ['insight', 'music'] },
  '애니메이션 감독': { sk: { direct: [40, 88], art: [30, 80] }, tal: ['aesth', 'creative'] },
  '애니메이터': { sk: { art: [30, 88] }, tal: ['aesth', 'hands'] },
  '성우': { sk: { acting: [35, 85] }, tal: ['voice', 'express'] },
  '웹툰 작가': { sk: { art: [35, 85], script: [30, 80] }, tal: ['aesth', 'creative'] },
  '웹소설 작가': { sk: { script: [35, 88] }, tal: ['verbal', 'creative'] },
};
// 숫자를 늘 같게 만드는 작은 해시 (화면을 다시 그려도 범위가 흔들리지 않게)
function hashN(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h); }

function makeIndustry(s, job, o = {}) {
  const J = IND_JOBS[job] || { sk: {}, tal: [] };
  const tal = randTalents();
  for (const t of J.tal) tal[t] = Math.min(98, tal[t] + U.int(10, 25));
  const p = makePerson(s, Object.assign({ age: U.int(23, 52), rel: '업계', job, aff: 40, tal, orient: U.wpick(['s', 'g', 'b'], x => ({ s: 90, g: 5, b: 5 })[x]) }, o));
  let top = 0;
  for (const k in J.sk) { const [a, b] = J.sk[k]; const l = U.int(a, b); learnSkill(s, p, k, l); p.sk[k].best = l; p.sk[k].pot = Math.max(l, Math.min(100, l + U.int(0, 15))); top = Math.max(top, l); }
  p.fame = o.fame != null ? o.fame : Math.round(Math.pow(10, 1.5 + top / 30) * U.fl(0.3, 1.5));
  p.ind = true;
  return p;
}
function industry(s, job, f) { return people(s, p => p.job === job && p.ind && !p.coT && (!f || f(p))); }
// 업계 사람 고르기: 이미 아는 업계 사람이 있으면 다시 만나기도 한다
function pickIndustry(s, job, f, reuse = 0.55) {
  const have = industry(s, job, f);
  if (have.length && U.chance(reuse)) return U.pick(have);
  return makeIndustry(s, job);
}

// ───── 회사 직원 (피드백 28 · 29) ─────
// 회사마다 내가 함께 일할 수 있는 팀이 모두 있다 (팀 하나 = 팀장 1 + 직원 3). 내가 그 회사와 처음 얽힐 때 만든다 (안 얽힌 회사는 만들지 않는다)
// 규칙 하나로 정한다 (회사마다 따로 쓴 숫자는 없다):
// · 주 특기: 팀장 = 48 + 크기×10 (소형 58 · 중형 68 · 대형 78), 직원 = 팀장보다 11 · 16 · 21 낮다
// · 같은 종류 · 같은 크기 회사들은 목록 차례대로 0 · +1 · -1을 더한다
// · 관련 재능: 그 특기를 크게 쓰는 재능 둘은 실력×0.6+32 · +27, 조금 쓰는 재능 둘은 +20 · +18
// · 둘째 특기는 주 특기보다 정해진 만큼 낮다 (자리 표의 넷째 칸, 없으면 8). 나이: 팀장 35+크기×3, 직원 29 · 25 · 22 + 크기×2
// · 판마다 각 숫자가 ±2만 흔들린다. 이름 · 겉모습 · 성격 · 나머지 재능은 판마다 새로 뽑는다
// 회사 종류마다 어떤 팀을 둘지, 컨셉에 따라 무엇이 달라질지는 12단계 직업별 디테일에서 다시 정한다
// 자리: [직함, 주 특기, 둘째 특기, 둘째 특기가 낮은 만큼]. 첫 자리가 팀장
const CO_ED = { id: 'ed', n: '편집팀', roles: [['편집팀장', 'edit'], ['편집자', 'edit'], ['편집자', 'edit'], ['편집자', 'edit']] };
const CO_TEAMS = {
  music: [
    { id: 'tr', n: '트레이너팀', roles: [['트레이너 팀장', 'vocal', 'edu'], ['보컬 트레이너', 'vocal', 'edu'], ['댄스 트레이너', 'dance', 'edu'], ['랩 트레이너', 'rap', 'edu']] },
    { id: 'anr', n: 'A&R팀', roles: [['A&R 팀장', 'scout', 'compose', 30], ['A&R 담당자', 'scout', 'compose', 30], ['A&R 담당자', 'scout', 'compose', 30], ['A&R 담당자', 'scout', 'compose', 30]] },
    { id: 'pd', n: '프로듀싱팀', roles: [['총괄 프로듀서', 'compose', 'lyric', 20], ['사내 프로듀서', 'compose', 'lyric', 20], ['사내 프로듀서', 'compose', 'lyric', 20], ['사내 프로듀서', 'compose', 'lyric', 20]] },
    // 7-4단계: 마케팅팀 (마케터)
    { id: 'mk', n: '마케팅팀', roles: [['마케팅 팀장', 'biz', 'script', 20], ['마케터', 'biz'], ['마케터', 'biz'], ['마케터', 'biz']] },
  ],
  actor: [{ id: 'tr', n: '연기 트레이너팀', roles: [['연기 트레이너 팀장', 'acting', 'edu'], ['연기 트레이너', 'acting', 'edu'], ['연기 트레이너', 'acting', 'edu'], ['연기 트레이너', 'acting', 'edu']] }],
  model: [{ id: 'cast', n: '캐스팅팀', roles: [['캐스팅 디렉터', 'scout'], ['캐스팅 담당자', 'scout'], ['캐스팅 담당자', 'scout'], ['캐스팅 담당자', 'scout']] }],
  vtuber: [CO_ED],
  mcn: [CO_ED],
  prod: [CO_ED, { id: 'dir', n: '연출부', roles: [['전속 감독', 'direct', 'script', 20], ['조감독', 'direct'], ['조감독', 'direct'], ['조감독', 'direct']] }],
  // 작곡팀·안무 팀은 팀 자체가 회사다 (이름 뒤에 팀 이름을 붙이지 않는다)
  song: [{ id: 'song', n: '', roles: [['대표 작곡가', 'compose', 'lyric', 15], ['작곡가', 'compose'], ['작곡가', 'compose'], ['작사가', 'lyric']] }],
  dance: [{ id: 'crew', n: '', roles: [['단장', 'dance', 'edu', 15], ['댄서', 'dance'], ['댄서', 'dance'], ['댄서', 'dance']] }],
  // 7-1단계: 애니 제작사(작화팀 · 연출부)와 성우 공채 방송사(성우극회)
  ani: [
    { id: 'key', n: '작화팀', roles: [['작화팀장', 'art'], ['원화 애니메이터', 'art'], ['원화 애니메이터', 'art'], ['원화 애니메이터', 'art']] },
    { id: 'dir', n: '연출부', roles: [['감독', 'direct', 'art', 10], ['연출', 'direct'], ['연출', 'direct'], ['연출', 'direct']] },
  ],
  bc: [{ id: 'vo', n: '성우극회', roles: [['극회장', 'acting', 'variety', 20], ['성우', 'acting'], ['성우', 'acting'], ['성우', 'acting']] }],
  // 7-3단계: 대학은 학과장 한 명만 둔다 (교수끼리 함께 할 일이 적다, 2026-11-08 사용자 결정). ex: 자리에서 물러나면 바뀌는 직함
  uni: [{ id: 'fac', n: '', ex: '교수', roles: [['학과장', 'edu', 'study', 15]] }],
  // 7-4단계: 학원은 원장, 인강 회사는 담당 PD 한 명만 둔다 (대학 학과장과 같은 방식)
  acad: [{ id: 'boss', n: '', ex: '강사', roles: [['원장', 'edu', 'biz', 15]] }],
  ol: [{ id: 'pd', n: '', ex: '콘텐츠 PD', roles: [['담당 PD', 'edit', 'direct', 15]] }],
  // 7-2단계: CP사 (편집부 · 웹툰 어시스턴트팀)
  cp: [
    { id: 'pd', n: '편집부', roles: [['편집장', 'script', 'scout', 20], ['담당 PD', 'script'], ['담당 PD', 'script'], ['담당 PD', 'script']] },
    { id: 'as', n: '어시스턴트팀', roles: [['어시스턴트 팀장', 'art'], ['채색 어시스턴트', 'art'], ['배경 어시스턴트', 'art'], ['선화 어시스턴트', 'art']] },
  ],
};
// 회사 열쇠: 기획사·소속사·MCN·안무 팀·CP사는 AGENCIES의 id, 영상 제작사는 'prod:이름', 작곡팀은 'song:이름', 애니 제작사는 'ani:이름', 성우 공채 방송사는 'bc:이름', 대학은 'uni:이름', 학원은 'acad:이름', 인강 회사는 'ol:이름'
// 팀 열쇠: '회사 열쇠#팀' (예: 'golmok#ed', 'prod:해든 제작소#dir', 'lum#anr')
function coSplit(tk) { tk = String(tk); const i = tk.lastIndexOf('#'); return i < 0 ? [tk, ''] : [tk.slice(0, i), tk.slice(i + 1)]; }
function coKindOf(key) { key = coSplit(key)[0]; const m = key.match(/^(prod|song|ani|bc|uni|acad|ol):/); return m ? m[1] : (AG[key] || {}).kind || ''; }
// 같은 종류 회사들 (차례 = 목록 차례. 작곡팀은 크기가 없어서 차례대로 소형 · 중형 · 대형을 돌려 쓴다)
function coList(kind) {
  if (kind === 'prod') return (typeof PROD_COS !== 'undefined' ? PROD_COS : []).map(x => ({ key: 'prod:' + x.n, n: x.n, tier: x.tier, mkt: 'kr' }));
  if (kind === 'song') return (typeof TEAMS !== 'undefined' ? TEAMS : []).map((n, i) => ({ key: 'song:' + n, n, tier: i % 3 + 1, mkt: 'kr' }));
  if (kind === 'ani') return (typeof ANIME_COS !== 'undefined' ? ANIME_COS : []).map(x => ({ key: 'ani:' + x.n, n: x.n, tier: x.tier, mkt: 'kr' }));
  if (kind === 'bc') return (typeof VO_BCS !== 'undefined' ? VO_BCS : []).map(x => ({ key: 'bc:' + x.n, n: x.n, tier: x.tier, mkt: 'kr' }));
  if (kind === 'uni') return (typeof UNIS !== 'undefined' ? UNIS : []).map(x => ({ key: 'uni:' + x.n, n: x.n, tier: x.tier, mkt: 'kr' }));
  if (kind === 'acad') return (typeof TU_ACADS !== 'undefined' ? TU_ACADS : []).map(x => ({ key: 'acad:' + x.n, n: x.n, tier: x.tier, mkt: 'kr' }));
  if (kind === 'ol') return (typeof TU_OLS !== 'undefined' ? TU_OLS : []).map(x => ({ key: 'ol:' + x.n, n: x.n, tier: x.tier, mkt: 'kr' }));
  return AGENCIES.filter(a => a.kind === kind).map(a => ({ key: a.id, n: a.n, tier: a.tier, mkt: a.mkt }));
}
function coBase(key) { key = coSplit(key)[0]; const kind = coKindOf(key); return CO_TEAMS[kind] ? coList(kind).find(x => x.key === key) || null : null; }
function coTeamDef(tk) { const [k, id] = coSplit(tk); return (CO_TEAMS[coKindOf(k)] || []).find(x => x.id === id) || null; }
function coOfs(key) {
  const b = coBase(key); if (!b) return 0;
  const L = coList(coKindOf(key)).filter(x => x.tier === b.tier).map(x => x.key);
  return [0, 1, -1][Math.max(0, L.indexOf(b.key)) % 3];
}
function coRoleVals(tier, slot) { const lead = 48 + 10 * tier; return { lv: slot ? lead - [0, 11, 16, 21][slot] : lead, age: slot ? [0, 29, 25, 22][slot] + 2 * tier : 35 + 3 * tier }; }
function coHire(s, tk, tier, slot) {
  const R = coTeamDef(tk).roles[slot], k = R[1], v = coRoleVals(tier, slot), o = coOfs(tk), b = coBase(tk), j = () => U.int(-2, 2);
  const tal = randTalents();
  Object.entries(SKILLS[k].tal).sort((x, y) => y[1] - x[1]).forEach(([t], i) => { tal[t] = U.clamp(Math.round((v.lv + o) * 0.6 + [32, 27, 20, 18][i]) + j(), 1, 99); });
  const p = makePerson(s, { age: v.age + j(), rel: '업계', job: R[0], aff: 40, tal, mkt: b ? b.mkt : 'kr' });
  const set = (sk, l) => { learnSkill(s, p, sk, l); Object.assign(p.sk[sk], { lv: l, best: l, pot: Math.min(100, l + 3) }); };
  set(k, U.clamp(v.lv + o + j(), 1, 100));
  if (R[2]) set(R[2], U.clamp(v.lv + o - (R[3] || 8) + j(), 1, 100));
  p.ind = true; p.coT = tk; p.coSk = k; p.fame = 0;
  return p;
}
// 팀 기록 { lead, staff[3] }: MCN 편집팀은 회사가 자라서 크기·평판과 함께 s.mcnCo에, 나머지는 s.coTeam[팀 열쇠]에 둔다
function coTeamRec(s, tk) {
  const [key, id] = coSplit(tk);
  if (coKindOf(key) === 'mcn' && id === 'ed') return mcnCo(s, key);
  const b = coBase(key); if (!b || !coTeamDef(tk)) return null;
  const C = s.coTeam = s.coTeam || {};
  if (!C[tk]) C[tk] = { lead: coHire(s, tk, b.tier, 0).id, staff: coTeamDef(tk).roles.slice(1).map((r, i) => coHire(s, tk, b.tier, i + 1).id) };
  return C[tk];
}
function coTeamPeople(s, tk) { const c = coTeamRec(s, tk); return c ? [c.lead].concat(c.staff).map(x => s.people[x]).filter(Boolean) : []; }
function coStaffSorted(s, c) { return c.staff.map(x => s.people[x]).filter(Boolean).sort((a, b) => lv(b, b.coSk || 'edit') - lv(a, a.coSk || 'edit')); }
function coTeamName(tk) { const b = coBase(tk), d = coTeamDef(tk); return b && d ? b.n + (d.n ? ' ' + d.n : '') : ''; }
// 팀을 떠난 사람은 업계 사람으로 남는다 (팀장이었으면 직원 직함으로)
function coLeaveTeam(p, tk) { if (!p) return; p.coT = null; const d = coTeamDef(tk); if (d && p.job === d.roles[0][0]) p.job = d.roles[1] ? d.roles[1][0] : d.ex || p.job; }
// 해마다: 60세가 넘었거나 세상을 떠난 사람은 같은 자리의 새 사람으로 바뀐다
function coRefill(s, tk, c, tier) {
  const gone = p => !p || !p.alive || pAge(s, p) >= 60;
  if (gone(s.people[c.lead])) { coLeaveTeam(s.people[c.lead], tk); c.lead = coHire(s, tk, tier, 0).id; }
  c.staff = c.staff.map((x, i) => { const p = s.people[x]; if (!gone(p)) return x; coLeaveTeam(p, tk); return coHire(s, tk, tier, Math.min(i + 1, 3)).id; });
}
function coTeamYear(s) { for (const tk in (s.coTeam || {})) { const b = coBase(tk); if (b && coTeamDef(tk)) coRefill(s, tk, s.coTeam[tk], b.tier); } }
// 그 일에서 함께 일하는 팀들: [{ tk 팀 열쇠, me 내가 그 팀 사람이면 내 주 특기, lead 내가 그 팀 팀장인가 }]
function jobTeams(s, id) {
  const t = s.tracks[id];
  if (!t || !trackOn(s, id)) return [];
  const ag = x => x && AG[x] && CO_TEAMS[AG[x].kind] ? x : '';
  const prod = n => n && typeof PROD_COS !== 'undefined' && PROD_COS.some(x => x.n === n) ? 'prod:' + n : '';
  const ani = n => n && typeof ANIME_COS !== 'undefined' && ANIME_COS.some(x => x.n === n) ? 'ani:' + n : '';
  const T = (key, ids, mine) => key ? ids.map(i => ({ tk: key + '#' + i, me: mine && mine[0] === i ? mine[1] : '', lead: !!(mine && mine[0] === i && t.lead) })) : [];
  const MUS = ['tr', 'anr', 'pd'];
  switch (id) {
    case 'idol': return T(ag(t.ag), MUS);
    case 'band': return t.st === 'signed' ? T(ag(t.ag), MUS) : [];
    case 'solo': return t.st === 'signed' && !t.withGroup ? T(ag(t.ag), MUS) : [];
    case 'trainer': return T(ag(t.ag), ['tr'], ['tr', t.k || 'vocal']);
    case 'anr': return T(ag(t.ag), ['anr'], ['anr', 'scout']);
    case 'producer': return t.mode === 'in' ? T(ag(t.ag), ['pd'], ['pd', 'compose']) : [];
    case 'composer': case 'lyricist': return t.team && typeof TEAMS !== 'undefined' && TEAMS.includes(t.team) ? T('song:' + t.team, ['song'], ['song', id === 'composer' ? 'compose' : 'lyric']) : [];
    case 'actor': return t.via === 'agency' ? T(ag(t.ag), ['tr']) : [];
    case 'acttrainer': return T(ag(t.ag), ['tr'], ['tr', 'acting']);
    case 'model': return T(ag(t.ag), ['cast']);
    case 'vidol': return T(ag(t.corp), ['ed']);
    case 'youtube': return t.mcn ? T(ag(t.mcn.id), ['ed']) : [];
    case 'editor': return t.mode === 'emp' ? T(t.mcn ? ag(t.mcn) : prod(t.agN), ['ed'], ['ed', 'edit']) : [];
    case 'director': return t.mode === 'excl' || t.mode === 'ad' ? T(prod(t.co), ['dir', 'ed'], ['dir', 'direct']) : [];
    case 'dancer': return t.crew ? T(ag(t.crew), ['crew'], ['crew', 'dance']) : [];
    case 'animator': return t.mode === 'emp' ? T(ani(t.agN), ['key'], ['key', 'art']) : [];
    case 'adir': return t.mode === 'ep' ? T(ani(t.co), ['dir', 'key'], ['dir', 'direct']) : t.pj && t.pj.co ? T(ani(t.pj.co), ['dir', 'key']) : [];
    case 'voice': return t.mode === 'bc' && VO_BCS.some(x => x.n === t.bc) ? T('bc:' + t.bc, ['vo'], ['vo', 'acting']) : [];
    case 'webtoon': return t.cp ? T(ag(t.cp), ['pd', 'as']) : [];
    case 'webnovel': return t.cp ? T(ag(t.cp), ['pd']) : [];
    case 'prof': return t.uni && UNIS.some(x => x.n === t.uni) ? T('uni:' + t.uni, ['fac'], pfTeaches(t) ? ['fac', 'edu'] : null) : [];
    case 'tutor': return t.co ? T((t.mode === 'ol' ? 'ol:' : 'acad:') + t.co, [t.mode === 'ol' ? 'pd' : 'boss']) : [];
    case 'marketer': return ag(t.ag) ? [{ tk: t.ag + '#mk', me: 'biz', lead: t.tier >= 4 }] : [];
  }
  return [];
}
// 팀 사람 목록 (직업 창): 내가 이 팀에 있으면 '나'도 넣는다. 내가 팀장이면 원래 팀장은 '선임'으로 적는다
// v177: 사람마다 배너 ({ who, t, sub } → infoTable이 배너로 그린다)
function coTeamItems(s, tk, meSk, meLead) {
  const c = coTeamRec(s, tk); if (!c) return [];
  const line = (p, role) => ({ who: p.id, t: `${role || p.job} ${p.name}`, sub: `${SKILLS[p.coSk || 'edit'].n} ${lvSee(s, p, p.coSk || 'edit')}` });
  const lead = s.people[c.lead], out = [], mine = meSk ? `${SKILLS[meSk].n} ${lvi(me(s), meSk)}` : '', d = coTeamDef(tk);
  if (meSk && meLead) out.push({ who: s.me, t: '팀장 나', sub: mine });
  if (lead) out.push(line(lead, meSk && meLead ? `선임 ${d.roles[1] ? d.roles[1][0] : d.ex || lead.job}` : ''));
  if (meSk && !meLead) out.push({ who: s.me, t: '나', sub: mine });
  for (const p of coStaffSorted(s, c)) out.push(line(p));
  return out;
}
// 함께 일하게 되면 팀 사람들이 인간관계(동료)에 들어온다. 스트리머는 MCN 편집팀의 담당 편집자만 만난다 (mcnMonth)
function coMeetJob(s, id) {
  if (id === 'youtube') return;
  for (const x of jobTeams(s, id)) { const b = coBase(x.tk), where = coTeamName(x.tk); for (const p of coTeamPeople(s, x.tk)) if (p.rel === '업계') meetAt(s, p, where, id, b.n); }
}
function coMeetMonth(s) { for (const id of CAREER_IDS) coMeetJob(s, id); }
// 예전 세이브(v75): 회사마다 팀이 하나였을 때의 열쇠를 그 종류의 첫 팀 열쇠로 바꾼다
function coMigrateKeys(s) {
  const fix = k => { if (!k || String(k).includes('#')) return k; const L = CO_TEAMS[coKindOf(k)]; return L ? k + '#' + L[0].id : k; };
  if (s.coTeam) { const C = {}; for (const k in s.coTeam) C[fix(k)] = s.coTeam[k]; s.coTeam = C; }
  // v80 세이브: 대학 교수진(학과장 + 교수 3)을 학과장 한 명으로 줄인다. 빠진 교수는 업계 사람으로 남는다
  for (const k in s.coTeam || {}) { const d = coTeamDef(k), c = s.coTeam[k]; if (d && c.staff && c.staff.length > d.roles.length - 1) { for (const id of c.staff.slice(d.roles.length - 1)) { const p = s.people[id]; if (p) p.coT = null; } c.staff = c.staff.slice(0, d.roles.length - 1); } }
  for (const id in s.people) { const p = s.people[id]; if (p.coT) p.coT = fix(p.coT); }
}

// ───── 인맥 ─────
// 처음 함께 일하면 인간관계에 들어온다
// job: 어느 직업 때문에 만났나. org: 그때 내 소속 (인간관계 창의 '동료' 트리 뷰, 피드백 27). 안 넘기면 그 직업의 지금 소속
function meetAt(s, p, where, job, org) {
  if (p.rel === '업계') { p.rel = '동료'; p.met = where; p.metT = s.t; p.metJob = job || EARN_JOB || null; p.metOrg = org || myOrg(s, p.metJob); }
  p.contactT = s.t;
}
// 그 직업에서 지금 내 소속: 계약한 회사(직업 창의 계약 칸과 같다). 없으면 '배우 · 소속 없음'처럼
function myOrg(s, job) {
  const c = CAREERS[job], t = s.tracks[job];
  if (!c) return '';
  if (c.contract && t) { const x = c.contract(s, t); if (x) { const o = x.replace(/\s*\([^)]*\)$/, ''); return /^「/.test(o) ? o + ' 채널' : o; } }
  if (job === 'band' && t && t.b && t.b.name) return `밴드 「${t.b.name}」`;
  return `${c.n} · 소속 없음`;
}
function bond(s, p, d) { aff(p, d); if (p.aff < 20) p.bad = true; else if (p.aff >= 35) p.bad = false; }
function relWord(p) { return p.bad ? '나쁜 관계' : p.aff >= 70 ? '아주 친함' : p.aff >= 55 ? '친함' : p.aff >= 35 ? '알고 지냄' : '서먹함'; }
// 같이 일하기 쉬운 정도 (-0.5 ~ +0.4). 섭외·캐스팅·합방 확률에 더한다
function relBonus(s, p) { if (!p) return 0; return p.bad ? -0.35 : U.clamp((p.aff - 45) / 100, -0.2, 0.4); }

// ───── 작품 ─────
// 진행 중인 작품은 s.projects. 종류마다 WORK_TYPES에서 월별 진행과 마무리를 정한다
const WORK_TYPES = {};
function startWork(s, type, o) {
  const w = Object.assign({ id: 'w' + U.uid(), type, t0: s.t, left: o.months || 3, cast: [] }, o);
  s.projects.push(w);
  return w;
}
function workPeople(s, w) { return w.cast.map(id => s.people[id]).filter(Boolean); }
function worksMonth(s) {
  for (const w of s.projects.slice()) {
    const T = WORK_TYPES[w.type];
    if (T.monthly) T.monthly(s, w);
    w.left--;
    if (w.left <= 0) { s.projects.splice(s.projects.indexOf(w), 1); queueEv(s, 'work_end', 0, { w }, true); }
  }
}
E({
  id: 'work_end', cat: '작품', tag: 'career',
  title: (s, d) => `「${d.w.title}」 마무리`,
  init(s, d) { d.r = WORK_TYPES[d.w.type].finish(s, d.w); },
  text: (s, d) => d.r.text,
  ch: (s, d) => [{ t: '다음으로', f: () => d.r.log }],
});

// ───── 스카우트 (능력 감정) ─────
// 다른 사람의 특기 레벨은 범위로 보인다. 폭은 보는 눈(스카우트 60%와 그 분야 내 특기 40%)에 따라 40에서 1까지 좁아진다. 정확히 보이는 건 명성뿐이다.
// 나, 가족, 같이 활동하는 멤버, 내가 가르치는 제자는 레벨이 정확히 보인다.
// 성장성(숨은 한계)과 곡 완성도는 5단계로 보인다. 보는 눈이 좋을수록 '보통'의 폭이 좁아진다 (0이면 20~80, 100이면 45~55)
// 보는 눈: 스카우트를 배우는 속도는 재능 표대로 보지만, 실제로 볼 때는 그 분야 내 특기도 함께 본다 (스카우트 60% + 그 특기 40%, 피드백 21)
const SCOUT_W = 0.6;
function scoutLv(viewer, k) { return k ? lv(viewer, 'scout') * SCOUT_W + lv(viewer, k) * (1 - SCOUT_W) : lv(viewer, 'scout'); }
const SEE_CLOSE = ['자녀', '엄마', '아빠', '배우자', '형제자매', '멤버', '제자'];
function seeExact(s, n) { return !n || n.id === s.me || SEE_CLOSE.includes(n.rel); }
function seeW(viewer, k) { return Math.max(1, Math.round(40 - 39 * scoutLv(viewer, k) / 100)); }
function lvRange(viewer, target, k) {
  const w = seeW(viewer, k), cur = Math.floor(lv(target, k));
  let lo = Math.max(1, cur - hashN(target.id + k + viewer.id) % (w + 1)), hi = lo + w;
  if (hi > 100) { lo = Math.max(1, lo - (hi - 100)); hi = 100; }
  return [lo, hi];
}
// 다른 사람의 특기 레벨 글자: 가까운 사람이면 '31', 아니면 '23~49'
function lvSee(s, n, k) { if (seeExact(s, n)) return String(lvi(n, k)); const r = lvRange(me(s), n, k); return r[0] === r[1] ? String(r[0]) : `${r[0]}~${r[1]}`; }
// 성장성은 내가 스카우트 특기와 그 분야 특기를 가졌을 때만 보인다
function canScout(viewer, k) { return has(viewer, 'scout') && has(viewer, k); }
function gradeHW(viewer, k) { return 30 - 25 * U.clamp(scoutLv(viewer, k), 0, 100) / 100; }
const GRADE_W = { pot: ['매우 낮음', '낮음', '보통', '높음', '매우 높음'], q: ['매우 나쁨', '나쁨', '보통', '좋음', '매우 좋음'] };
function grade5(viewer, v, kind = 'pot', k) {
  const hw = gradeHW(viewer, k), lo = 50 - hw, hi = 50 + hw;
  return GRADE_W[kind][v < lo / 2 ? 0 : v < lo ? 1 : v <= hi ? 2 : v <= hi + (100 - hi) / 2 ? 3 : 4];
}
function potGrade(viewer, target, k) { return has(target, k) ? grade5(viewer, target.sk[k].pot, 'pot', k) : ''; }
// v181: 성장성은 글자 대신 다섯 칸 막대 그림으로 보인다. 글 속에 표시(\u0005 등급 \u0006, '?' = 볼 눈이 없다)를 넣으면 그리는 곳에서 막대로 바꾼다 (ui.js potH)
function potTok(viewer, target, k) { const g = potGrade(viewer, target, k); return g ? '\u0005' + GRADE_W.pot.indexOf(g) + '\u0006' : ''; }
const POT_UNK = '\u0005?\u0006';
