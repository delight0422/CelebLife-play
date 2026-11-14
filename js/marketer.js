'use strict';
// ════════ 마케터 (7-4단계) ════════
// 회사 마케팅팀 직원. v207: 기획사만이 아니라 댄스팀 · 대학을 뺀 모든 회사에 마케팅팀이 있다 (MK_K)
// 하는 일 (2026-11-08 사용자가 정한 것): 시장조사와 홍보(플랫폼·방식 정하기), 신그룹 런칭(타겟·컨셉), 광고 기획과 운영(발주·집행), 팬덤 관리, 여론 대응
// 직업 활동 두 갈래:
//   자동으로 하는 일 (일정에 '마케팅 업무' 칸만 넣어 두면): 시장조사(시장 이해도), 팬덤 관리(팬덤 분위기), 발주한 광고 집행
//   골라서 하는 일 (칸을 넣은 채로 직업 창에서): 정기 일정 홍보 계획(컴백 · 새 시즌 등), 신인 · 신작 런칭 기획, 광고 기획
//   여론 대응은 일이 터지면 사건 창에서 바로 고른다 (칸을 안 넣었으면 다른 사람이 맡아 대충 넘어간다)
// 사업 특기가 가장 중요하고, 작문 · 학업 · 스카우트를 조금 본다. 통찰력 · 창의력 · 지능 재능을 본다
// 시장 이해도가 높으면 홍보·런칭을 고를 때 시장조사 결과가 보인다

const MK_TIERS = ['마케팅 인턴', '주니어 마케터', '마케터', '시니어 마케터', '마케팅 팀장', '마케팅 총괄', '마케팅 이사'];
const MK_SAL = [180, 250, 320, 420, 560, 800, 1300]; // 만 원 (중형 회사 기준). 소형 ×0.85 · 대형 ×1.2
const MK_AGM = [0, 0.85, 1, 1.2];
// 승진: 쌓인 성과(pts)와 그 자리에서 보낸 햇수(yrs). 맨 위는 통찰력 52 이상
const MK_UP = { pts: [0, 5, 15, 35, 85, 140, 190], yrs: [0, 1, 2, 2, 3, 3, 3], tal: 'insight', min: 52 };
const MK_TGTS = ['10대', '20대', '글로벌', '코어 팬덤', '대중'];
// 홍보 플랫폼이 잘 먹히는 타겟, 홍보 방식이 잘 맞는 컨셉, 타겟이 좋아하는 컨셉, 광고 매체가 잘 닿는 타겟 (숨긴 규칙. 시장조사를 하면 일부가 보인다)
const MK_PF = { 라이브온: { 글로벌: 4, 대중: 3, '20대': 1 }, '숏폼 (틱톡·릴스)': { '10대': 5, '20대': 2, 대중: 2 }, 인스타그램: { '20대': 5, 글로벌: 2 }, '음악 방송': { 대중: 4, '10대': 2, '코어 팬덤': 1 }, '팬 플랫폼': { '코어 팬덤': 6, 글로벌: 2 } };
const MK_HOW = { 챌린지: ['청량', '큐티', '하이틴', '힙합'], '티저 콘텐츠': ['몽환', '성숙', '강렬'], '라이브 방송': ['큐티', '하이틴', '청량', '레트로'], '오프라인 팝업': ['레트로', '성숙', '몽환', '강렬'] };
const MK_TC = { '10대': ['큐티', '하이틴', '청량'], '20대': ['성숙', '몽환', '레트로'], 글로벌: ['강렬', '힙합', '청량'], '코어 팬덤': ['몽환', '강렬', '성숙'], 대중: ['청량', '레트로', '큐티'] };
const MK_AD = { 'SNS 광고': { '10대': 3, '20대': 4 }, '라이브온 광고': { 글로벌: 3, 대중: 3 }, '옥외 광고 (전광판)': { 대중: 4, '코어 팬덤': 2 }, '지하철 광고': { '20대': 3, '코어 팬덤': 4 } };
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
// 기획사가 아닌 회사의 여론 일
const MK_ISSUES_G = [
  { n: '악성 루머', best: '법적 대응 예고', ok: '사실 확인 후 입장문' },
  { n: '태도 논란 영상', best: '빠른 사과문', ok: '사실 확인 후 입장문' },
  { n: '품질 불만', best: '빠른 사과문', ok: '사실 확인 후 입장문' },
  { n: '팬끼리의 다툼', best: '조용히 지켜보기', ok: '사실 확인 후 입장문' },
  { n: '표절 의혹', best: '사실 확인 후 입장문', ok: '법적 대응 예고' },
];
// ───── v207: 회사 종류마다 마케팅팀이 맡는 것 ─────
// unit 맡은 것 · kinds 그 종류 · cb 정기 일정(기획사의 컴백) · launch 새로 내놓는 것 · debut 내놓는 일 · debutV 내놓았다 · fN 팬을 부르는 말 · rank 성적 순위 · mood 분위기 · cN 컨셉을 부르는 말
// C 컨셉 목록 · TC 타겟이 좋아하는 컨셉 · HOW 홍보 방식에 맞는 컨셉 · pf '음악 방송' 자리의 홍보 플랫폼 · q 이름을 「」로 감싼다(작품) · person 맡은 것이 사람
const MK_DRAMA = { C: ['로맨스', '스릴러', '사극', '코미디', '휴먼'], TC: { '10대': ['로맨스', '코미디'], '20대': ['로맨스', '스릴러'], 글로벌: ['스릴러', '사극'], '코어 팬덤': ['로맨스', '휴먼'], 대중: ['코미디', '휴먼', '사극'] }, HOW: { 챌린지: ['코미디', '로맨스'], '티저 콘텐츠': ['스릴러', '사극'], '라이브 방송': ['코미디', '휴먼'], '오프라인 팝업': ['로맨스', '사극', '휴먼'] } };
const MK_SUBJ = { C: ['국어', '영어', '수학', '과학', '사회'], tgts: ['초등', '중등', '고등', '재수생', '학부모'], TC: { 초등: ['영어', '수학'], 중등: ['수학', '과학'], 고등: ['국어', '수학'], 재수생: ['국어', '수학', '과학'], 학부모: ['영어', '수학'] }, HOW: { 챌린지: ['영어', '사회'], '티저 콘텐츠': ['수학', '과학'], '라이브 방송': ['국어', '영어'], '오프라인 팝업': ['수학', '국어'] },
  PF: { 라이브온: { 고등: 3, 재수생: 3 }, '숏폼 (틱톡·릴스)': { 중등: 4, 고등: 3 }, 인스타그램: { 학부모: 3, 고등: 2 }, '입시 설명회': { 학부모: 5, 재수생: 3 }, '맘카페 · 커뮤니티': { 학부모: 5, 초등: 3 } },
  AD: { 'SNS 광고': { 중등: 3, 고등: 3 }, '라이브온 광고': { 고등: 3, 재수생: 3 }, '옥외 광고 (전광판)': { 학부모: 3, 초등: 2 }, '지하철 광고': { 재수생: 4, 학부모: 2 } } };
const MK_K = {
  music: { unit: '그룹', kinds: ['걸그룹', '보이그룹'], cb: '컴백', launch: '신인 그룹', debut: '데뷔', debutV: '데뷔했다', fN: '팬', mood: '팬덤', cN: '컨셉', comm: true },
  vtuber: { unit: '기수', kinds: ['버츄얼 걸그룹', '버츄얼 보이그룹'], cb: '컴백', launch: '신인 기수', debut: '데뷔', debutV: '데뷔했다', fN: '팬', mood: '팬덤', cN: '컨셉', comm: true },
  actor: Object.assign({ unit: '배우', kinds: ['배우'], cb: '출연작 공개', launch: '신인 배우', debut: '데뷔', debutV: '데뷔했다', fN: '팬', rank: '화제성 순위', mood: '팬덤', cN: '장르', pf: '예능 · 토크쇼 출연', person: true }, MK_DRAMA),
  model: { unit: '모델', kinds: ['모델'], cb: '시즌 캠페인 공개', launch: '신인 모델', debut: '데뷔', debutV: '데뷔했다', fN: '팔로워', rank: '패션 화제성', mood: '팬덤', cN: '컨셉', pf: '패션 위크', person: true,
    C: ['하이패션', '스트릿', '뷰티', '스포티', '클래식'], TC: { '10대': ['스트릿', '스포티'], '20대': ['뷰티', '하이패션'], 글로벌: ['하이패션', '스트릿'], '코어 팬덤': ['뷰티', '클래식'], 대중: ['스포티', '클래식', '뷰티'] }, HOW: { 챌린지: ['스트릿', '스포티'], '티저 콘텐츠': ['하이패션', '클래식'], '라이브 방송': ['뷰티', '스포티'], '오프라인 팝업': ['하이패션', '뷰티', '클래식'] } },
  mcn: { unit: '크리에이터', kinds: ['스트리머', '버튜버'], cb: '대형 콘텐츠 공개', launch: '신인 크리에이터', debut: '첫 방송', debutV: '첫 방송을 했다', fN: '구독자', rank: '인기 급상승', mood: '시청자 반응', cN: '분야', pf: '합동 방송',
    C: ['게임', '먹방', '브이로그', '리뷰', '음악'], TC: { '10대': ['게임', '음악'], '20대': ['브이로그', '리뷰'], 글로벌: ['게임', '음악'], '코어 팬덤': ['게임', '먹방'], 대중: ['먹방', '리뷰', '브이로그'] }, HOW: { 챌린지: ['음악', '먹방'], '티저 콘텐츠': ['게임', '리뷰'], '라이브 방송': ['게임', '먹방', '음악'], '오프라인 팝업': ['브이로그', '리뷰'] } },
  cp: { unit: '연재작', kinds: ['웹툰', '웹소설'], cb: '새 시즌 연재', launch: '신작', debut: '연재 시작', debutV: '연재를 시작했다', fN: '독자', rank: '연재 순위', mood: '독자 반응', cN: '장르', pf: '플랫폼 배너', q: true,
    C: ['로맨스 판타지', '무협', '현대 판타지', '로맨스', '스릴러'], TC: { '10대': ['현대 판타지', '로맨스 판타지'], '20대': ['로맨스', '스릴러'], 글로벌: ['로맨스 판타지', '현대 판타지'], '코어 팬덤': ['무협', '로맨스 판타지'], 대중: ['로맨스', '스릴러', '현대 판타지'] }, HOW: { 챌린지: ['로맨스', '로맨스 판타지'], '티저 콘텐츠': ['스릴러', '무협'], '라이브 방송': ['현대 판타지', '로맨스'], '오프라인 팝업': ['로맨스 판타지', '무협'] } },
  prod: Object.assign({ unit: '작품', kinds: ['드라마', '영화'], cb: '새 시즌 공개', launch: '신작', debut: '공개', debutV: '공개됐다', fN: '시청자', rank: 'OTT 순위', mood: '시청자 반응', cN: '장르', pf: '예고편 · 시사회', q: true }, MK_DRAMA),
  ani: { unit: '작품', kinds: ['TV 애니', '극장판'], cb: '새 시즌 방영', launch: '신작 애니', debut: '방영', debutV: '방영을 시작했다', fN: '시청자', rank: '애니 순위', mood: '시청자 반응', cN: '장르', pf: '예고편 · 시사회', q: true,
    C: ['판타지', '일상', 'SF', '액션', '로맨스'], TC: { '10대': ['액션', '판타지'], '20대': ['일상', '로맨스'], 글로벌: ['SF', '판타지'], '코어 팬덤': ['SF', '액션'], 대중: ['일상', '로맨스', '액션'] }, HOW: { 챌린지: ['일상', '로맨스'], '티저 콘텐츠': ['SF', '액션'], '라이브 방송': ['일상', '판타지'], '오프라인 팝업': ['판타지', '액션', 'SF'] } },
  bc: { unit: '프로그램', kinds: ['예능', '드라마', '교양'], cb: '새 시즌 첫 방송', launch: '새 프로그램', debut: '첫 방송', debutV: '첫 방송을 했다', fN: '시청자', rank: '시청률 순위', mood: '시청자 반응', cN: '장르', pf: '자사 채널 예고', q: true,
    C: ['예능', '드라마', '다큐', '오디션', '토크쇼'], TC: { '10대': ['오디션', '예능'], '20대': ['드라마', '토크쇼'], 글로벌: ['오디션', '드라마'], '코어 팬덤': ['오디션', '드라마'], 대중: ['예능', '다큐', '토크쇼'] }, HOW: { 챌린지: ['예능', '오디션'], '티저 콘텐츠': ['드라마', '다큐'], '라이브 방송': ['토크쇼', '오디션'], '오프라인 팝업': ['드라마', '예능'] } },
  acad: Object.assign({ unit: '강사', kinds: ['강사'], cb: '새 학기 강좌 오픈', launch: '신규 강사', debut: '첫 강의', debutV: '첫 강의를 열었다', fN: '수강생', rank: '수강 신청 순위', mood: '수강생 만족', cN: '과목', person: true }, MK_SUBJ),
  ol: Object.assign({ unit: '강사', kinds: ['인강 강사'], cb: '새 학기 강좌 오픈', launch: '신규 강사', debut: '첫 강의', debutV: '첫 강의를 열었다', fN: '수강생', rank: '인강 순위', mood: '수강생 만족', cN: '과목', person: true }, MK_SUBJ),
};
EMP_N.marketer = '마케팅';

function mkOn(s) { return trackOn(s, 'marketer'); }
function mkKind(t) { return t.kind || (coByKey(t.ag) || {}).kind || 'music'; }
function mkK(t) { return MK_K[mkKind(t)] || MK_K.music; }
function mkMusic(t) { return !!mkK(t).comm; }
function mkC(t) { return mkK(t).C || TRENDS; }
function mkTgts(t) { return mkK(t).tgts || MK_TGTS; }
function mkTC(t) { return mkK(t).TC || MK_TC; }
function mkHOW(t) { return mkK(t).HOW || MK_HOW; }
function mkPF(t) { const K = mkK(t); if (K.PF) return K.PF; if (!K.pf) return MK_PF; const o = {}; for (const [k, v] of Object.entries(MK_PF)) o[k === '음악 방송' ? K.pf : k] = v; return o; }
function mkAD(t) { return mkK(t).AD || MK_AD; }
function mkIssues(t) { return mkMusic(t) ? MK_ISSUES : MK_ISSUES_G; }
// 유행 컨셉은 기획사 · 버츄얼 아이돌 기획사에만
function mkTrend(s, t) { return mkMusic(t) ? s.trend : null; }
// 성적 (순위)
function mkRes(t, peak) { const K = mkK(t); return mkMusic(t) ? chartText(peak) : peak ? `${K.rank} 최고 ${peak}위` : `${K.rank} 100위 밖`; }
// 맡은 것 이름 (작품은 「」) · 뒤에 붙는 조사
function mkGN(t, g) { return mkK(t).q ? `「${g.name}」` : g.name; }
function mkGJ(t, g, j) { return mkGN(t, g) + jo(g.name, j); }
function mkName(s, t) {
  switch (mkKind(t)) {
    case 'actor': case 'model': case 'acad': case 'ol': return genName(U.pick(['남', '여']));
    case 'mcn': return ytChName(U.pick(Object.keys(YT_FIT)));
    case 'cp': case 'ani': return freshName(() => animeTitle(U.pick(ANIME_TRENDS)));
    case 'prod': return freshName(() => dramaTitle(U.pick(['로맨스', '스릴러', '사극', '미스터리', '휴먼 코미디'])));
    case 'bc': return tvShowTitle();
  }
  return newGroupName(s);
}
// 마케팅 실력: 사업(크게) + 작문 · 학업 · 스카우트(조금) + 통찰력 · 창의력 · 지능
// v95: 사업 · 학업(모두 강함)
function mkScore(s) { const p = me(s); return jobMix([[lv(p, 'biz'), JS_], [lv(p, 'study'), JS_]]); }
function mkSalOf(t) { return Math.round(MK_SAL[t.tier] * MK_AGM[t.agT]) * 1e4; }
function mkBar(t) { return 38 + t.tier * 2; }
function mkMood(v) { return v >= 70 ? '아주 좋음' : v >= 55 ? '좋음' : v >= 40 ? '보통' : v >= 25 ? '나쁨' : '아주 나쁨'; }
// v206: 버츄얼 아이돌 기획사 마케팅팀이 맡는 것은 버츄얼 기수. v207: 회사 종류마다 (MK_K)
function mkNewGroup(s, t, o = {}) { const K = mkK(t); return Object.assign({ name: mkName(s, t), kind: U.pick(K.kinds), sig: U.pick(mkC(t)), tgt: U.pick(mkTgts(t)), f: Math.round([3e3, 3e4, 3e5][t.agT - 1] * U.fl(0.5, 2)), mood: U.int(45, 60), next: U.int(2, 8) }, o); }
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
// v207: 해외 쪽 회사는 외국어도 본다 (CO_FOCUS.mk)
function mkApplyP(s, key) { const c = coByKey(key); return audP(coFocus(s, 'mk', c.con, mkApplySc(s)), MK_THR[c.tier]); }
// v206: 회사마다 따로. v207: 댄스팀 · 대학을 뺀 모든 회사 (기획사 · 버츄얼 아이돌 기획사 · 배우 소속사 · 모델 에이전시 · MCN · CP사 · 영상 제작사 · 애니 제작사 · 방송사 · 학원 · 인강 회사). 같은 회사는 반년 뒤 다시
function mkCoKeys() { return AGENCIES.filter(a => a.mkt === 'kr' && MK_K[a.kind]).map(a => a.id).concat(coKeysOf('prod'), coKeysOf('ani'), coKeysOf('vo'), coKeysOf('tu')); }
for (const key of mkCoKeys()) JOB_APPLY.push({
  id: 'marketer_' + key, coKey: key, pos: '마케팅팀 채용', trk: 'marketer', g: '📣 마케터', get n() { return `${coByKey(key).n} 마케팅팀 채용`; }, get tag() { const c = coByKey(key); return `${TIER_N[c.tier]} · 월급 ${Math.round(MK_SAL[0] * MK_AGM[c.tier])}만 원부터`; },
  show: s => !mkOn(s) && age(s) >= 20,
  h: s => `합격 가능성 ${fmtPct(mkApplyP(s, key))} · 결과는 다음 달`,
  ok: s => !s.army && !agencyContract(s) && !hasQ(s, 'mk_res') && !(s.cd['mk_' + key] > s.t),
  why: s => s.army ? '군 복무 중' : agencyContract(s) ? contractWhy(s) : hasQ(s, 'mk_res') ? '결과를 기다리는 중' : '얼마 전에 지원했다 (반년 뒤 다시)',
  run: s => { s.cd['mk_' + key] = s.t + 6; queueEv(s, 'mk_res', 1, { ag: key, p: mkApplyP(s, key) }); return `${coByKey(key).n} 마케팅팀 채용에 지원했다.`; },
});
E({
  id: 'mk_res', cat: '채용', title: '마케팅팀 채용 결과', tag: 'career',
  init(s, d) { const c = coByKey(d.ag); if (!c) { d.skip = true; return; } d.pass = U.chance(d.p); const old = s.tracks.marketer || {}; d.tier = old.tier || 0; d.sal = Math.round(MK_SAL[d.tier] * MK_AGM[c.tier]) * 1e4; d.agN = c.n; },
  text: (s, d) => d.pass ? `${d.agN} 마케팅팀에 합격했다! ${d.tier ? `그동안의 경력을 보고 '${MK_TIERS[d.tier]}' 자리를 맡긴다. ` : ''}회사가 제시한 월급은 ${fmtWon(d.sal)}.` : `${d.agN} 마케팅팀 채용에 떨어졌다.`,
  ch: (s, d) => d.pass ? [
    { t: '입사 조건을 들어 본다', ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '월급을 협상할 수 있다', f: s => startNego(s, { kind: 'marketer', ag: d.ag, agN: d.agN, sal: d.sal, months: 24, lev: U.clamp((d.p - 0.5) * 0.8 + 0.3, 0.05, 0.8) }) },
    { t: '거절한다', f: () => '입사 제안을 거절했다.' },
  ] : [{ t: '확인', f: () => `${d.agN} 마케팅팀 채용에 떨어졌다.` }],
});
function mkStart(s, d) {
  const c = coByKey(d.ag), old = s.tracks.marketer, tag = learnMe(s, 'biz', null, false, true);
  const t = s.tracks.marketer = { st: 'active', ag: d.ag, kind: c.kind, agN: c.n, agT: c.tier, months: 0, tm: 0, cEnd: d.months, tier: old.tier || 0, pts: old.pts || 0, rep: empStartRep(s, 'marketer', false), sal: d.sal, salBase: d.sal, mi: 20, groups: [], cb: null, launch: null, lnext: U.int(18, 40), ad: null, done: old.done || 0, hist: old.hist || [] };
  for (let i = 0; i < 2 + (c.tier >= 3 ? 1 : 0); i++) t.groups.push(mkNewGroup(s, t));
  coMeetJob(s, 'marketer');
  const boss = coTeamPeople(s, c.team + '#mk')[0];
  milestone(s, `${age(s)}세에 ${c.n} 마케팅팀에 들어갔다.`);
  return `${c.n} 마케팅팀에 입사했다. 월급 ${fmtWon(d.sal)} · 계약 ${yrs(d.months)}.${boss ? ` 팀장은 ${boss.name}.` : ''}` + tag;
}
NEGO.marketer = empNego('marketer', mkStart);

CAREERS.marketer = {
  n: '마케터', ic: '📣', auto: true,
  desc: '회사 마케팅팀 직원. 회사가 맡긴 그룹 · 배우 · 작품 · 프로그램 · 강사 등을 알린다. 시장을 조사하고, 정기 일정(컴백 · 새 시즌 등) 홍보와 신인 · 신작 런칭을 기획하고, 광고를 집행하고, 팬과 여론을 관리한다. 사업 특기가 가장 중요하다.',
  act: { n: '마케팅 업무', ic: '📣', g: '직업 활동', eff: [['사업', '↑', 1], ['시장 이해도', '↑', 1], ['스트레스', '↑', 0]] },
  autoList(s, t) {
    const K = mkK(t);
    return [
      { ic: '🔎', n: '시장조사', eff: `시장 이해도 ${Math.round(t.mi)}` },
      { ic: '💬', n: `${K.mood} 관리`, eff: t.groups.map(g => `${mkGN(t, g)} ${mkMood(g.mood)}`).join(' · ') },
    ].concat(t.ad ? [{ ic: '📢', n: `${t.ad.ch} 집행`, eff: `${t.groups[t.ad.gi] ? mkGN(t, t.groups[t.ad.gi]) : ''} · ${t.ad.left}개월 남음` }] : []);
  },
  picks(s, t) {
    if (t.st !== 'active') return [];
    const cg = t.cb && t.groups[t.cb.gi], K = mkK(t);
    return [
      { t: `📅 ${K.cb} 홍보 계획`, h: cg ? `${mkGN(t, cg)} ${K.cb} ${Math.max(0, t.cb.due - s.t)}개월 전${t.cb.plan ? ` · ${t.cb.plan.pf} · ${josa(t.cb.plan.how, '으로')} 정함` : ''}` : `다가오는 ${K.cb} 일정이 없다`, ok: !!cg && !t.cb.plan, why: cg ? '이미 계획을 세웠다' : `다가오는 ${K.cb} 일정이 없다`, run: s => { fireEvent(s, 'mk_promo', {}); return ''; } },
      { t: `🌱 ${K.launch} 런칭 기획`, h: t.launch ? `${K.debut} ${Math.max(0, t.launch.due - s.t)}개월 전${t.launch.plan ? ` · ${t.launch.plan.tgt} · ${josa(`'${t.launch.plan.c}'`, '으로')} 정함` : ''}` : `준비 중인 ${K.launch}${jo(K.launch, '이가')} 없다`, ok: !!t.launch && !t.launch.plan, why: t.launch ? '이미 기획했다' : `준비 중인 ${K.launch}${jo(K.launch, '이가')} 없다`, run: s => { fireEvent(s, 'mk_launch', {}); return ''; } },
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
    const p = me(s), K = mkK(t);
    return [['회사', `${t.agN} (${TIER_N[t.agT]} ${CO_KIND_N[mkKind(t)] || '회사'}) 마케팅팀`], ['자리', MK_TIERS[t.tier]], ['월급', fmtWon(t.sal)], ['내 실력', ['biz', 'script', 'study', 'scout'].filter(k => has(p, k)).map(k => `${SKILLS[k].n} ${lvi(p, k)}`).join(' · ') || '-'], ['업무 평가', `${Math.round(t.rep)}`], ['성과', `${t.pts}`], ['시장 이해도', `${Math.round(t.mi)}`],
      { h: `맡은 ${K.unit}`, items: t.groups.map(g => `${mkGN(t, g)} (${g.kind}) · ${K.fN} ${fmtFans(g.f)} · 타겟 ${g.tgt} · 대표 ${K.cN} '${g.sig}' · ${K.mood} ${mkMood(g.mood)}`) }];
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
  const n = slotsOn(s, 'c_marketer'), p = me(s), sc = mkScore(s), K = mkK(t);
  if (n) {
    practice(s, p, 'biz', 0.6 * n);
    for (const k of ['study', 'scout']) useSkill(s, p, k, 0.15 * n);
    addStress(s, 1.8);
    // 시장조사: 시장 이해도가 닿을 수 있는 높이 쪽으로
    const tg = U.clamp(25 + lv(p, 'study') * 0.3 + lv(p, 'scout') * 0.2 + p.tal.intel * 0.25 + p.tal.insight * 0.15, 0, 100);
    t.mi = U.clamp(t.mi + (tg - t.mi) * 0.12, 0, 100);
  } else if (!pregMe(s)) t.mi = Math.max(0, t.mi - 3);
  // 팬덤 관리: 내가 칸을 넣어 두면 팬덤 분위기가 내 실력만큼 좋아진다
  for (const g of t.groups) g.mood = U.clamp(g.mood + ((n ? 47 + (sc - 38) * 0.8 : 32) + U.normal(0, 5) - g.mood) * 0.15, 0, 100);
  // 광고 집행 (칸을 넣은 달만 나아간다)
  if (t.ad && n && --t.ad.left <= 0 && !hasQ(s, 'mk_ad_res')) queueEv(s, 'mk_ad_res', 0);
  // 회사 일정: 맡은 것마다 정기 일정 (석 달 전에 알려 준다)
  t.groups.forEach((g, gi) => {
    if (--g.next > 3) return;
    if (t.cb && t.cb.gi !== gi) { g.next = 4; return; }
    if (!t.cb) { t.cb = { gi, due: s.t + 3, plan: null }; addLog(s, `회사 일정: ${mkGN(t, g)} ${K.cb}${jo(K.cb, '이가')} 석 달 뒤로 잡혔다.`, 'career'); }
  });
  if (t.cb && s.t >= t.cb.due && !hasQ(s, 'mk_cb_res')) queueEv(s, 'mk_cb_res', 0);
  // 회사 일정: 신인 · 신작 런칭 (넉 달 전에 알려 준다)
  if (!t.launch && t.groups.length < 5 && --t.lnext <= 0) { t.launch = { due: s.t + 4, plan: null }; addLog(s, `회사 일정: 넉 달 뒤 ${K.launch} ${K.debut}.`, 'career'); }
  if (t.launch && s.t >= t.launch.due && !hasQ(s, 'mk_launch_res')) queueEv(s, 'mk_launch_res', 0);
  // 여론: 가끔 일이 터진다 (팬덤 분위기가 나쁘면 자주)
  if (!hasQ(s, 'mk_issue') && !s.pending) {
    const gi = t.groups.findIndex(g => U.chance(0.006 + (g.mood < 35 ? 0.02 : 0)));
    if (gi >= 0) {
      const is = U.pick(mkIssues(t));
      if (n) queueEv(s, 'mk_issue', 0, { gi, n: is.n });
      else { const g = t.groups[gi]; g.mood = Math.max(0, g.mood - 10); t.rep = Math.max(0, t.rep - 3); addLog(s, `${mkGN(t, g)}의 ${josa(is.n, '이가')} 불거졌다. 내가 손을 놓고 있는 사이 다른 팀원이 대충 넘겼다. (업무 평가 -3)`, 'bad'); }
    }
  }
  const up = mkTierUp(s, t); if (up) addLog(s, up, 'good');
  if (t.rep <= 2 && !hasQ(s, 'mk_fire')) queueEv(s, 'mk_fire', 0);
}
function mkHint(s, t, need) { return t.mi >= need; }
// 커뮤니티 반응 (기획사 · 버츄얼 아이돌 기획사만)
function mkPlio(s, d) { const t = s.tracks.marketer; return d.pl !== undefined ? d.pl : (d.pl = typeof commSpec === 'function' && d.g && t && mkMusic(t) ? commSpec(s, { k: 'mk', bd: '아이돌 게시판', t: d.g, tn: d.k === 2 ? 'great' : d.k === 1 ? 'good' : d.plan === null || d.plan === undefined ? 'meh' : 'bad' }) : null); }

// ───── 골라서 하는 일: 정기 일정 홍보 계획 (플랫폼 → 방식) ─────
E({
  id: 'mk_promo', cat: '마케팅', title: s => `${mkK(s.tracks.marketer).cb} 홍보 계획`, tag: 'career',
  init(s, d) { const t = s.tracks.marketer; if (!mkOn(s) || !t.cb || t.cb.plan) d.skip = true; },
  text: s => {
    const t = s.tracks.marketer, K = mkK(t), g = t.groups[t.cb.gi], PF = mkPF(t), best = Object.keys(PF).sort((a, b) => (PF[b][g.tgt] || 0) - (PF[a][g.tgt] || 0))[0];
    return `${mkGN(t, g)}(${g.kind}, ${K.fN} ${fmtFans(g.f)})의 ${K.cb} 홍보를 어디에서 할까?\n\n타겟 ${g.tgt} · 대표 ${K.cN} '${g.sig}'${mkHint(s, t, 50) ? `\n시장조사: ${josa(g.tgt, '은는')} 요즘 ${best}에서 반응이 가장 크다.` : ''}`;
  },
  ch: s => Object.keys(mkPF(s.tracks.marketer)).map(pf => ({ t: pf, f: s => { fireEvent(s, 'mk_promo2', { pf }); return ''; } })),
});
E({
  id: 'mk_promo2', cat: '마케팅', title: '홍보 방식', tag: 'career',
  init(s, d) { const t = s.tracks.marketer; if (!mkOn(s) || !t.cb || t.cb.plan) d.skip = true; },
  text: (s, d) => { const t = s.tracks.marketer, K = mkK(t), g = t.groups[t.cb.gi], H = mkHOW(t), fit = Object.keys(H).filter(h => H[h].includes(g.sig)); return `${d.pf}에서 어떤 방식으로 알릴까?\n\n${mkGN(t, g)} 대표 ${K.cN} '${g.sig}'${mkHint(s, t, 70) && fit.length ? `\n시장조사: '${g.sig}' ${K.cN}${jo(K.cN, '은는')} ${josa(fit.join(' · '), '과와')} 잘 어울린다.` : ''}`; },
  ch: (s, d) => Object.keys(mkHOW(s.tracks.marketer)).map(how => ({ t: how, f: s => {
    const t = s.tracks.marketer, g = t.groups[t.cb.gi], K = mkK(t);
    const q = mkScore(s) + ((mkPF(t)[d.pf] || {})[g.tgt] || 0) + (mkHOW(t)[how].includes(g.sig) ? 4 : 0) + t.mi * 0.08 + U.normal(0, 6);
    t.cb.plan = { pf: d.pf, how, q };
    return `${mkGN(t, g)} ${K.cb} 홍보를 ${d.pf} ${josa(how, '으로')} 하기로 정했다.`;
  } })),
});
E({
  id: 'mk_cb_res', cat: '마케팅', title: s => `${mkK(s.tracks.marketer).cb} 성적`, tag: 'career',
  plio: (s, d) => mkPlio(s, d),
  init(s, d) {
    const t = s.tracks.marketer;
    if (!mkOn(s) || !t.cb) { d.skip = true; return; }
    const g = t.groups[t.cb.gi], plan = t.cb.plan, K = mkK(t); t.cb = null;
    if (!g) { d.skip = true; return; }
    g.next = U.int(6, 10);
    const pb = plan ? U.clamp((plan.q - 40) / 3, -4, 8) : -3;
    const sc = songScore(s, { perf: 20 + t.agT * 8 + U.normal(0, 4), q: boughtQ(t.agT), fans: g.f, tier: t.agT, trend: g.sig === mkTrend(s, t), bonus: pb + (g.mood - 50) / 10 });
    d.peak = chartFromScore(sc); d.g = mkGN(t, g); d.plan = plan; d.res = mkRes(t, d.peak); d.cb = K.cb; d.fN = K.fN;
    const b = g.f; g.f = Math.max(0, g.f + fanGainRaw(sc, g.f, 0.6 + t.agT * 0.2, starCap(60, 'kr'))); d.df = g.f - b;
    d.k = mkEval(s, t, (plan ? plan.q : 25) + (d.peak && d.peak <= 20 ? 5 : 0));
    d.bonus = d.peak && d.peak <= 10 ? t.sal : 0; if (d.bonus) earn(s, d.bonus, '마케팅 성과급', 'marketer');
    t.done++;
    addWork(s, { type: `${K.cb} 홍보`, title: `${d.g} ${K.cb}`, by: plan ? `${plan.pf} · ${plan.how}` : '회사 기본 홍보', sc: Math.round(sc), note: d.res, pay: d.bonus || 0 });
    d.up = mkTierUp(s, t);
  },
  text: (s, d) => `${d.g}의 ${d.cb || '컴백'} 성적이 나왔다. ${d.plan ? `(${d.plan.pf} · ${d.plan.how})` : '(내가 계획을 세우지 않아 회사 기본 홍보로 나갔다)'}\n\n${d.res || chartText(d.peak)} · ${d.fN || '팬'} ${sgnFans(d.df)}\n${d.k === 2 ? '홍보가 크게 먹혔다는 평가를 받았다.' : d.k ? '홍보가 제 몫을 했다는 평가를 받았다.' : '홍보가 아쉬웠다는 말을 들었다.'}${d.bonus ? `\n성과급 ${fmtWon(d.bonus)}` : ''}\n업무 평가 ${Math.round(s.tracks.marketer.rep)}${d.up ? `\n\n🎉 ${d.up}` : ''}`,
  ch: (s, d) => [{ t: '확인', f: () => `${d.g} ${d.cb || '컴백'} ${d.res || chartText(d.peak)}.${d.up ? ' ' + d.up : ''}` }],
});

// ───── 골라서 하는 일: 신인 · 신작 런칭 기획 (타겟 → 컨셉) ─────
E({
  id: 'mk_launch', cat: '마케팅', title: s => `${mkK(s.tracks.marketer).launch} 런칭 기획`, tag: 'career',
  init(s, d) { const t = s.tracks.marketer; if (!mkOn(s) || !t.launch || t.launch.plan) d.skip = true; },
  text: s => { const K = mkK(s.tracks.marketer); return `넉 달 뒤 ${K.debut}할 ${K.launch}의 타겟을 정하자.`; },
  ch: s => mkTgts(s.tracks.marketer).map(tgt => ({ t: tgt, f: s => { fireEvent(s, 'mk_launch2', { tgt }); return ''; } })),
});
E({
  id: 'mk_launch2', cat: '마케팅', title: s => `${mkK(s.tracks.marketer).launch} ${mkK(s.tracks.marketer).cN}`, tag: 'career',
  init(s, d) { const t = s.tracks.marketer; if (!mkOn(s) || !t.launch || t.launch.plan) d.skip = true; },
  text: (s, d) => { const t = s.tracks.marketer, K = mkK(t), tr = mkTrend(s, t); return `타겟은 ${d.tgt}. ${K.debut} ${K.cN}${jo(K.cN, '은는')} 무엇으로 할까?${tr ? `\n\n요즘 유행 ${qIda(tr)}.` : ''}${mkHint(s, t, 60) ? `\n${tr ? '' : '\n'}시장조사: ${josa(d.tgt, '은는')} ${(mkTC(t)[d.tgt] || []).map(c => `'${c}'`).join(' · ')} ${K.cN}${jo(K.cN, '을를')} 좋아한다.` : ''}`; },
  ch: (s, d) => { const t = s.tracks.marketer, tr = mkTrend(s, t); return mkC(t).map(c => ({ t: c, tr: c === tr, f: s => {
    const t = s.tracks.marketer, K = mkK(t);
    const q = mkScore(s) + (c === tr ? 5 : 0) + ((mkTC(t)[d.tgt] || []).includes(c) ? 4 : 0) + t.mi * 0.08 + U.normal(0, 6);
    t.launch.plan = { tgt: d.tgt, c, q };
    return `${K.launch}${jo(K.launch, '을를')} ${d.tgt} 타겟, '${c}' ${K.cN}${jo(K.cN, '으로')} 내보내기로 했다.`;
  } })); },
});
E({
  id: 'mk_launch_res', cat: '마케팅', title: s => `${mkK(s.tracks.marketer).launch} ${mkK(s.tracks.marketer).debut}`, tag: 'career',
  plio: (s, d) => mkPlio(s, d),
  init(s, d) {
    const t = s.tracks.marketer;
    if (!mkOn(s) || !t.launch) { d.skip = true; return; }
    const plan = t.launch.plan, K = mkK(t); t.launch = null; t.lnext = U.int(24, 48);
    const c = plan ? plan.c : U.pick(mkC(t)), tgt = plan ? plan.tgt : U.pick(mkTgts(t));
    const sc = songScore(s, { perf: 20 + t.agT * 8 + U.normal(0, 4), q: boughtQ(t.agT), fans: 0, tier: t.agT, trend: c === mkTrend(s, t), bonus: plan ? U.clamp((plan.q - 40) / 3, -4, 8) : -3 });
    const g = mkNewGroup(s, t, { sig: c, tgt, f: 0, mood: 55, next: U.int(5, 8) });
    g.f = Math.max(500, fanGainRaw(sc, 0, 0.6 + t.agT * 0.2, starCap(60, 'kr')) * 3);
    t.groups.push(g);
    d.g = mkGN(t, g); d.gj = mkGJ(t, g, '이가'); d.peak = chartFromScore(sc); d.f = g.f; d.plan = plan; d.res = mkRes(t, d.peak);
    d.launch = K.launch; d.debutV = K.debutV; d.cN = K.cN; d.fN = K.fN;
    d.k = mkEval(s, t, (plan ? plan.q : 25) + (d.peak && d.peak <= 40 ? 5 : 0));
    t.done++;
    addWork(s, { type: `${K.launch} 런칭`, title: d.g, by: `${tgt} · '${c}'`, sc: Math.round(sc), note: d.res });
    d.up = mkTierUp(s, t);
  },
  text: (s, d) => `${d.launch || '신인 그룹'} ${d.gj || josa(d.g, '이가')} ${d.debutV || '데뷔했다'}. ${d.plan ? `(${d.plan.tgt} 타겟 · '${d.plan.c}' ${d.cN || '컨셉'})` : '(내가 기획하지 않아 회사가 정한 대로 나갔다)'}\n\n${d.res || chartText(d.peak)} · ${d.fN || '팬'} ${fmtFans(d.f)}\n${d.k === 2 ? '올해 최고의 런칭이라는 말을 들었다.' : d.k ? '런칭이 무난하게 자리 잡았다.' : '첫 반응이 조용하다.'}${d.up ? `\n\n🎉 ${d.up}` : ''}`,
  ch: (s, d) => [{ t: '확인', f: () => `${d.launch || '신인 그룹'} ${d.g} ${d.debutV || '데뷔했다'} · ${d.res || chartText(d.peak)}.${d.up ? ' ' + d.up : ''}` }],
});

// ───── 골라서 하는 일: 광고 기획 (매체 → 예산) → 3개월 집행 ─────
E({
  id: 'mk_ad', cat: '마케팅', title: '광고 기획', tag: 'career',
  init(s, d) { const t = s.tracks.marketer; if (!mkOn(s) || t.ad) { d.skip = true; return; } d.gi = U.int(0, t.groups.length - 1); },
  text: (s, d) => { const t = s.tracks.marketer, g = t.groups[d.gi]; return `${mkGN(t, g)}(타겟 ${g.tgt}) 광고를 기획한다. 어느 매체에 낼까?`; },
  ch: (s, d) => Object.keys(mkAD(s.tracks.marketer)).map(ch => ({ t: ch, f: s => { fireEvent(s, 'mk_ad2', { gi: d.gi, ch }); return ''; } })),
});
E({
  id: 'mk_ad2', cat: '마케팅', title: '광고 예산', tag: 'career',
  init(s, d) { const t = s.tracks.marketer; if (!mkOn(s) || t.ad) d.skip = true; },
  text: (s, d) => `${d.ch} 예산은 얼마로 발주할까? 회사 돈으로 낸다. 크게 쓸수록 회사의 기대도 커진다.`,
  ch: (s, d) => MK_BUD.map((b, i) => ({ t: `${b.n} (${fmtWon(b.won * 1e4)})`, f: s => {
    const t = s.tracks.marketer, g = t.groups[d.gi];
    t.ad = { gi: d.gi, ch: d.ch, bud: i, left: 3, q: mkScore(s) + ((mkAD(t)[d.ch] || {})[g.tgt] || 0) + t.mi * 0.08 + U.normal(0, 6) };
    return `${mkGJ(t, g, '을를').replace(/을$|를$/, '')} ${josa(d.ch, '을를')} ${fmtWon(b.won * 1e4)}에 발주했다. 석 달 동안 집행한다.`;
  } })),
});
E({
  id: 'mk_ad_res', cat: '마케팅', title: '광고 결과', tag: 'career',
  plio: (s, d) => mkPlio(s, d),
  init(s, d) {
    const t = s.tracks.marketer;
    if (!mkOn(s) || !t.ad) { d.skip = true; return; }
    const a = t.ad, g = t.groups[a.gi], b = MK_BUD[a.bud]; t.ad = null; t.adCd = s.t + 2;
    if (!g) { d.skip = true; return; }
    const df = Math.max(0, Math.round(g.f * U.clamp((a.q - 35) / 400, -0.02, 0.08) * b.mul + (a.q - 30) * 20 * b.mul));
    g.f += df; d.df = df; d.g = mkGN(t, g); d.ch = a.ch; d.fN = mkK(t).fN;
    d.k = mkEval(s, t, a.q - b.bar); t.done++;
    d.up = mkTierUp(s, t);
  },
  text: (s, d) => `${d.g} ${d.ch} 집행이 끝났다. ${d.fN || '팬'} ${sgnFans(d.df)}.\n${d.k === 2 ? '비용 대비 효과가 아주 좋았다는 평가를 받았다.' : d.k ? '쓴 돈만큼은 했다는 평가를 받았다.' : '돈만 썼다는 말을 들었다.'}${d.up ? `\n\n🎉 ${d.up}` : ''}`,
  ch: (s, d) => [{ t: '확인', f: () => `${d.g} ${d.ch} 결과: ${d.fN || '팬'} ${sgnFans(d.df)}.${d.up ? ' ' + d.up : ''}` }],
});

// ───── 여론 대응 (일이 터지면 바로 고른다) ─────
E({
  id: 'mk_issue', cat: '여론 대응', title: '여론 대응', tag: 'career',
  init(s, d) { const t = s.tracks.marketer; if (!mkOn(s) || !t.groups[d.gi]) d.skip = true; },
  text: (s, d) => { const t = s.tracks.marketer, g = t.groups[d.gi]; return `${mkGN(t, g)}의 ${josa(d.n, '이가')} 커뮤니티에 퍼지고 있다. ${mkK(t).mood} 분위기는 ${mkMood(g.mood)}. 어떻게 대응할까?`; },
  ch: (s, d) => MK_RESP.map(r => ({ t: r, f: s => {
    const t = s.tracks.marketer, g = t.groups[d.gi], L = mkIssues(t), is = L.find(x => x.n === d.n) || MK_ISSUES.concat(MK_ISSUES_G).find(x => x.n === d.n) || L[0];
    const fit = r === is.best ? 15 : r === is.ok ? 5 : -10;
    const sc = mkScore(s) * 0.6 + 18 + fit + t.mi * 0.05 + U.normal(0, 6);
    const k = mkEval(s, t, sc);
    g.mood = U.clamp(g.mood + (k === 2 ? 8 : k ? 3 : -12), 0, 100);
    if (k === 0) g.f = Math.round(g.f * 0.97);
    addStress(s, 3);
    const up = mkTierUp(s, t);
    return `${mkGN(t, g)}의 ${d.n}에 ${josa(r, '으로')} 대응했다. ${k === 2 ? '여론이 빠르게 가라앉았다.' : k ? '큰 탈 없이 넘어갔다.' : `오히려 불이 커졌다. ${mkK(t).fN}들이 화가 났다.`}` + (up ? ` ${up}` : '');
  } })),
});
E({
  id: 'mk_fire', cat: '마케팅', title: '권고사직', tag: 'career',
  cond: s => mkOn(s),
  text: s => `업무 평가가 바닥까지 떨어졌다. 팀장이 조용히 불러 다른 길을 알아보는 게 좋겠다고 한다.`,
  ch: () => [{ t: '짐을 정리한다', f: s => leaveEmp(s, 'marketer', '권고사직') + fx(s, { stress: 8 }) }],
});
