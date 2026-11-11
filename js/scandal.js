'use strict';
// 논란: 이름이 알려지면 가끔 논란에 휘말린다. 진짜인 것도, 반만 맞는 것도, 지어낸 것도 있다
// 나는 진실을 알고, 어떻게 대응하느냐(사과·해명·증거·법적 대응·침묵·자숙)에 따라 결과가 갈린다
// s.scandal: 지금 진행 중인 논란 { id, truth: fake|half|real|perf, resp, t }
// s.hiatus: 자숙 { left, n } — 그동안 직업 활동과 지원을 못 한다
// s.stigma: 남은 꼬리표 (0~100). 매달 조금씩 옅어지고, 그동안 섭외·광고가 줄어든다

// 이름값: 내 팬 + 그룹 팬의 일부
function scFame(s) { return totalFans(s) + (s.tracks.idol && s.tracks.idol.st === 'active' ? groupFans(s.tracks.idol.g) * 0.2 : 0); }
// 꼬리표·자숙이 있으면 섭외와 제안이 준다 (0~1)
function stigmaMul(s) { return s.hiatus ? 0 : 1 - Math.min(0.8, (s.stigma || 0) / 100); }
function isIdol(s) { return s.tracks.idol && s.tracks.idol.st === 'active'; }
// 열애설이 얼마나 치명적인지: 아이돌·버튜버 hard, 배우·모델 soft, 그 밖 mid
function datingLv(s) {
  if (isIdol(s) || (trackOn(s, 'youtube') && s.tracks.youtube.mode === 'vt') || trackOn(s, 'vidol')) return 'hard';
  if (trackOn(s, 'actor') || trackOn(s, 'model')) return 'soft';
  return 'mid';
}
// 열애 상대가 누구인지 (v90): 아이돌(다른 아이돌 · 우리 그룹 멤버) · 그 밖의 연예인 · 비연예인
function partnerKind(s) {
  const p = partner(s);
  if (!p) return '';
  const g = s.tracks.idol && s.tracks.idol.g;
  if (p.idol || p.job === '아이돌' || /「.+」 멤버/.test(p.job || '') || (g && (g.members || []).includes(p.id))) return 'idol';
  if (/배우|가수|모델|예능인|스트리머|버튜버|밴드 멤버|래퍼|댄서/.test(p.job || '')) return 'celeb';
  return 'normal';
}
// 진짜 열애설의 파장에 곱하는 값: 상대가 아이돌이면 2배, 비연예인이면 절반 (4배 차이). 사진 속 사람이 친구일 뿐인 열애설은 그대로
function datingMul(s) { return ({ idol: 2, celeb: 1, normal: 0.5 })[partnerKind(s)] || 1; }
function staffOn(s) { return ['trainer', 'acttrainer', 'anr', 'director', 'writer'].some(id => trackOn(s, id)); }
function memberAffAvg(s) { const g = s.tracks.idol.g, m = g.members.map(id => s.people[id]).filter(Boolean); return m.length ? m.reduce((a, x) => a + x.aff, 0) / m.length : 60; }
function madeSongs(s) { return ['composer', 'producer', 'solo', 'band'].some(id => trackOn(s, id)); }

// 논란 종류. who: 걸릴 수 있는지, w: 얼마나 자주, truth: 진실, sev: 무게(1~3)
// claim: 사람들이 하는 말, know: 실제로는 어떤지 (claim 바로 뒤에 이어 붙는 문장), lab: 대응 버튼 이름 바꾸기, soft: 잘못은 아닌 일(열애·신상)
const SC = {
  bully: {
    n: '학폭 의혹', who: s => scFame(s) >= 1e4, w: s => s.flags.bully ? 3 : 1, truth: s => s.flags.bully ? 'real' : 'fake', sev: 3,
    claim: '중학교 동창이라는 사람이 인터넷에 글을 올렸다. 내가 학교에서 자기를 괴롭혔다는 내용이다.',
    know: { fake: '하지만 같은 반이었던 적도 없는 사람이다. 글에 나온 일은 전혀 기억에 없다.', real: '그 글을 읽자 기억이 떠올랐다. 그때 친구들과 어울려 그 애를 놀렸던 게 맞다.' },
  },
  dating: {
    n: '열애설', soft: true, who: s => scFame(s) >= 5000 && !(partner(s) && isSpouse(partner(s))), w: s => (datingLv(s) === 'hard' ? 3 : 1) * (partner(s) ? 2 : 1),
    truth: s => partner(s) ? 'real' : 'fake', sev: s => ({ hard: 3, mid: 1, soft: 0.5 })[datingLv(s)] * datingMul(s),
    claim: s => { const k = partnerKind(s), p = partner(s); return `연예 매체가 내가 ${p ? (k === 'idol' ? `아이돌 ${josa(p.name, '과와')}` : josa(p.name, '과와')) : '한 사람과'} 함께 있는 사진을 올리며 열애설을 냈다.` + (k === 'idol' ? ' 아이돌끼리의 열애라 두 팬덤이 함께 들끓었다. 기사가 쏟아졌다.' : k === 'normal' ? ' 상대가 일반인이라 사진 속 얼굴은 가려져 있다.' : ''); },
    know: { fake: '사진 속 사람은 오래 알고 지낸 친구다. 같이 밥을 먹었을 뿐이다.', real: '사진은 진짜다. 조용히 만나 온 사이다.' },
    lab: { apo: '열애를 인정한다', deny: '친한 사이일 뿐이라고 한다', hiatus: '사과하고 잠시 쉰다 (자숙)' },
  },
  attitude: {
    n: '태도 논란', who: s => scFame(s) >= 1e4, w: s => s.stress >= 70 ? 2 : 1,
    truth: s => s.stress >= 70 && U.chance(0.6) ? 'real' : U.chance(0.7) ? 'half' : 'fake', sev: 2,
    claim: '촬영장에서 내가 스태프에게 짜증을 내는 듯한 영상이 퍼졌다.',
    know: { fake: '하지만 영상 속 사람은 내가 아니다. 뒷모습이 닮았을 뿐이다.', half: '앞뒤가 잘린 영상이다. 실제로는 서로 장난을 주고받던 중이었다.', real: '그날 너무 지쳐서 스태프에게 날카롭게 군 건 사실이다.' },
  },
  oldpost: {
    n: '과거 발언 논란', who: s => scFame(s) >= 2e4 && age(s) >= 18, w: () => 1, truth: () => U.chance(0.55) ? 'real' : 'fake', sev: 2,
    claim: '내가 학생 때 SNS에 썼다는 거친 글 캡처가 퍼졌다.',
    know: { fake: '하지만 이런 글을 쓴 적이 없다. 캡처가 조작됐다.', real: '어릴 때 생각 없이 쓴 글이 맞다.' },
  },
  rumor: {
    n: '사생활 루머', who: s => scFame(s) >= 5e4, w: () => 1, truth: () => 'fake', sev: 2,
    claim: '나에 대한 찌라시가 단톡방을 타고 퍼졌다. 사생활이 문란하다는 내용이다.',
    know: { fake: '물론 전혀 사실이 아니다. 누가 지어낸 이야기다.' },
  },
  fakephoto: {
    n: '합성 사진 유포', who: s => scFame(s) >= 1e5, w: () => 0.6, truth: () => 'fake', sev: 2,
    claim: '내 얼굴을 합성한 민망한 사진이 진짜처럼 퍼지고 있다.',
    know: { fake: '찍은 적도 없는 사진이다.' },
  },
  // ── 직업별 ──
  lipsync: {
    n: '립싱크 논란', who: s => isIdol(s) || (s.tracks.solo && s.tracks.solo.st === 'signed'), w: () => 1.2,
    truth: s => lv(me(s), 'vocal') < 35 ? 'real' : U.chance(0.5) ? 'half' : 'fake', sev: 1,
    claim: '음악방송 무대 영상을 두고 립싱크였다는 말이 돌았다.',
    know: { fake: '하지만 그날은 라이브로 불렀다. 음향 사고로 그렇게 들렸을 뿐이다.', half: '사실 격한 안무 부분에만 녹음된 목소리를 깔았다.', real: '라이브에 자신이 없어 녹음된 노래를 튼 게 맞다.' },
  },
  feud: {
    n: '멤버 불화설', who: s => isIdol(s), w: s => memberAffAvg(s) < 40 ? 3 : 1, truth: s => memberAffAvg(s) < 40 ? 'real' : 'fake', sev: 1,
    claim: '방송에서 내가 멤버들과 눈도 안 마주친다는 영상이 돌며 불화설이 났다.',
    know: { fake: '하지만 멤버들과 사이는 좋다. 그날은 다들 지쳐 있었을 뿐이다.', real: '요즘 멤버들과 사이가 정말 안 좋은 건 사실이다.' },
  },
  plagiarism: {
    n: '표절 의혹', who: s => madeSongs(s), w: () => 1, truth: () => U.chance(0.15) ? 'real' : U.chance(0.6) ? 'half' : 'fake', sev: 2,
    claim: '내가 만든 곡이 외국 노래와 비슷하다는 비교 영상이 올라왔다.',
    know: { fake: '하지만 전혀 다른 곡이다. 흔한 코드 진행 하나가 겹칠 뿐이다.', half: '그 노래를 즐겨 듣긴 했다. 나도 모르게 비슷해졌을 수도 있다.', real: '마감에 쫓겨 그 노래를 많이 따라 한 게 맞다.' },
  },
  acting: {
    n: '발연기 논란', who: () => false, truth: () => 'perf', sev: 1, noFight: true,
    claim: '주연을 맡은 작품에서 내 연기가 어색하다는 혹평이 쏟아졌다. 연기 장면만 모은 영상이 조롱거리가 됐다.',
    know: { perf: '나도 다시 보니 부족했다.' },
    lab: { apo: '부족했다고 인정하고 연기 수업을 받는다', hiatus: '사과하고 잠시 쉰다 (자숙)' },
  },
  joke: {
    n: '선 넘은 발언', who: s => trackOn(s, 'variety'), w: () => 1.5, truth: () => U.chance(0.6) ? 'real' : 'half', sev: 2,
    claim: '예능에서 한 농담이 선을 넘었다는 비판이 나왔다.',
    know: { half: '하지만 편집으로 앞뒤 맥락이 잘렸다. 실제로는 웃으며 넘어간 장면이다.', real: '분위기에 취해 하면 안 될 말을 한 건 맞다.' },
  },
  backad: {
    n: '뒷광고 논란', who: s => trackOn(s, 'youtube') && s.tracks.youtube.st === 'active', w: s => s.flags.backAd ? 6 : 0.5,
    truth: s => s.flags.backAd ? 'real' : 'fake', sev: 2,
    claim: '광고를 받고도 광고라고 밝히지 않았다는 폭로 영상이 올라왔다.',
    know: { fake: '하지만 광고는 모두 밝혔다. 그 물건은 직접 산 것이다.', real: '돈을 더 받고 광고라는 걸 숨긴 게 맞다.' },
  },
  leak: {
    n: '신상 유출', soft: true, who: s => (trackOn(s, 'youtube') && s.tracks.youtube.mode === 'vt' && s.tracks.youtube.st === 'active') || (trackOn(s, 'vidol') && s.tracks.vidol.st === 'active'), w: () => 1, truth: () => 'half', sev: 1,
    claim: '버튜버 뒤에 있는 내 얼굴과 이름을 찾아냈다는 글이 퍼졌다.',
    know: { half: '글 속 사람은 내가 맞다. 하지만 정체를 숨긴 게 잘못은 아니다.' },
    lab: { apo: '담담하게 인정한다', deny: '나와 상관없는 사람이라고 한다' },
  },
  gapjil: {
    n: '갑질 의혹', who: s => ['trainer', 'acttrainer', 'anr'].some(id => trackOn(s, id)), w: () => 1, truth: () => U.chance(0.5) ? 'half' : 'fake', sev: 1,
    claim: '내가 가르치던 연습생이었다는 사람이 내가 폭언을 했다고 폭로했다.',
    know: { fake: '하지만 그런 말을 한 적이 없다.', half: '엄하게 혼낸 적은 있다. 폭언까지는 아니었다.' },
  },
  setabuse: {
    n: '촬영장 갑질 의혹', who: s => trackOn(s, 'director') && s.tracks.director.works > 0, w: s => s.stress >= 70 ? 2 : 1,
    truth: s => s.stress >= 70 && U.chance(0.5) ? 'real' : U.chance(0.5) ? 'half' : 'fake', sev: 2,
    claim: '내 작품 스태프였다는 사람이 촬영장에서 내가 폭언을 일삼았다고 폭로했다.',
    know: { fake: '하지만 그 사람과는 말 한마디 나눈 기억이 없다.', half: '촬영이 밀려 언성을 높인 적은 있다. 폭언까지는 아니었다.', real: '마감에 쫓겨 스태프들에게 심한 말을 한 게 맞다.' },
  },
  scriptplag: {
    n: '각본 표절 의혹', who: s => (trackOn(s, 'writer') && s.tracks.writer.made > 0) || (trackOn(s, 'director') && s.tracks.director.works > 0) && (s.scripts || []).some(x => x.st === 'mine'), w: () => 1,
    truth: () => U.chance(0.15) ? 'real' : U.chance(0.55) ? 'half' : 'fake', sev: 2,
    claim: '내가 쓴 작품의 줄거리가 한 웹소설과 똑같다는 비교 글이 퍼졌다.',
    know: { fake: '하지만 그 웹소설은 읽어 본 적도 없다. 흔한 설정이 겹칠 뿐이다.', half: '예전에 읽은 적은 있다. 나도 모르게 비슷해졌을 수도 있다.', real: '그 웹소설의 이야기를 많이 가져다 쓴 게 맞다.' },
  },
  // 끈기 (v93): 일정에 자꾸 늦거나(lateMonth) 연재를 자주 쉬면(webnovel.js wbMonth). 게임 안 조건으로만 난다
  late: {
    n: '상습 지각 논란', who: () => false, truth: () => 'real', sev: 1, noFight: true,
    claim: '일하는 현장에 번번이 늦게 나타난다는 목격담이 쏟아졌다. 함께 일하는 사람들이 한참씩 기다렸다는 이야기까지 나왔다.',
    know: { real: '요즘 일정에 자주 늦은 건 사실이다.' },
    lab: { apo: '늦은 일을 인정하고 사과한다' },
  },
  serial: {
    n: '잦은 휴재 논란', who: () => false, truth: () => 'real', sev: 1, noFight: true,
    claim: s => { const f = s.flags.serialSc || {}; return `${f.kind || '연재작'} 「${f.title || '내 작품'}」의 잦은 휴재에 독자들이 들끓었다. 돈을 내고 보던 독자들이 환불을 요구하고 있다.`; },
    know: { real: '요즘 마감을 자주 못 지킨 건 사실이다.' },
    lab: { apo: '독자들에게 사과하고 연재 일정을 지키겠다고 약속한다' },
  },
  // 속도위반: 아이가 생겼는데 결혼하지 않겠다고 하면 (events.js oops_baby)
  oops: {
    n: '혼전 임신 논란', who: () => false, truth: () => 'real', sev: 3, noFight: true,
    claim: s => { const o = s.flags.oopsLeft && s.people[s.flags.oopsLeft.id]; return `${o ? josa(o.name, '과와') + '의' : '연인과의'} 사이에 아이가 생겼는데 내가 결혼을 거부하고 떠났다는 폭로 글이 올라왔다.`; },
    know: { real: '결혼하지 않기로 한 건 사실이다.' },
    lab: { apo: '책임을 다하겠다고 사과한다' },
  },
  // 성인이 된 뒤 미성년자에게 고백한 일이 알려지면 (events.js minor_out)
  minor: {
    n: '미성년자 교제 논란', who: () => false, truth: () => 'real', sev: 3, noFight: true,
    claim: s => { const m = s.flags.minorConf; return `내가 성인이 된 뒤 미성년자${m ? `인 ${m.name}` : ''}에게 사귀자고 고백했다는 폭로 글이 올라왔다. 주고받은 메시지 캡처까지 퍼졌다.`; },
    know: { real: '고백한 건 사실이다.' },
    lab: { apo: '잘못을 인정하고 사과한다' },
  },
  // 템퍼링: 회사 소속 버튜버가 계약 중에 다른 회사와 몰래 이적을 약속했다가 걸리면 (video.js vt_tamper)
  tamper: {
    n: '템퍼링 논란', who: () => false, truth: () => 'real', sev: 2, noFight: true,
    claim: s => { const x = s.flags.tamper || {}; return `내가 ${x.from ? josa(x.from, '과와') + '의 ' : ''}계약 기간 중에 ${x.to || '다른 회사'} 쪽과 몰래 이적을 약속했다는 보도가 나왔다. 주고받은 메시지 캡처까지 퍼졌다.`; },
    know: { real: '몰래 약속한 건 사실이다. 그 회사도 없던 일로 하자며 연락을 끊었다.\n\n회사는 바로 계약을 해지하고 채널을 거둬들였다. 업계에 소문이 다 퍼져서, 이제 다시는 버튜버로 데뷔할 수 없다.' },
    lab: { apo: '잘못을 인정하고 사과한다' },
  },
  affair: {
    n: '불륜 보도', who: () => false, truth: () => 'real', sev: 3,
    claim: '누군가 찍은 사진이 기자에게 넘어가 불륜 기사가 났다.',
    know: { real: '변명할 말이 없다. 사실이다.' },
  },
};
function scSev(s, T) { return typeof T.sev === 'function' ? T.sev(s) : T.sev; }
function scText(v, s) { return typeof v === 'function' ? v(s) : v; }
// 논란의 무게에 곱하는 이름값 (팬 1만 1.15배 · 100만 2배 · 1,000만 2.5배)
function scFameMul(s) { return 1 + Math.log10(1 + scFame(s) / 1e4) / 2; }
// 소속사(회사)가 있으면 법적 대응 비용을 회사가 낸다
function scAgency(s) { return agencyContract(s); }
const SC_SUE = 1000e4, SC_PROVE = 300e4;
function hiatusMonths(s, T) { return 2 + scSev(s, T) * 2; }

// 논란을 시작한다 (무작위로, 또는 다른 사건이 불러서)
function startScandal(s, id, truth) {
  const T = SC[id];
  s.scandal = { id, truth: truth || T.truth(s), t: s.t };
  queueEv(s, 'scandal', 0, {}, true);
}
// 지각 (v93): 끈기가 낮으면 일정이 잡힌 달에 가끔 늦는다 (끈기 50 이상은 늦지 않는다)
// 혼자 하는 일(플리오 · 글 · 그림 · 작곡 · 작사 · 회사 대표)은 늦을 데가 없어서 뺀다. 12개월 안에 세 번이면, 이름이 알려졌으면 지각 논란
const LATE_AT = { actor: '촬영장', model: '촬영장', director: '촬영장', variety: '녹화장', voice: '녹음실', producer: '녹음실', idol: '리허설', band: '공연 리허설', solo: '리허설', player: '리허설', dancer: '리허설', vidol: '', anr: '회의', marketer: '회의', editor: '회의', animator: '회의', adir: '회의', trainer: '수업', acttrainer: '수업', prof: '강의', tutor: '강의' };
function lateP(s) { const g = me(s).tal.grit; return g >= 50 ? 0 : 0.18 * Math.pow((50 - g) / 50, 1.5); }
function lateMonth(s) {
  if (s.hiatus || age(s) < 14) return;
  const L = Object.keys(LATE_AT).filter(id => CAREERS[id] && trackOn(s, id) && jobN(s, id) > 0);
  if (!L.length || !U.chance(lateP(s))) return;
  const id = U.pick(L), t = s.tracks[id], at = LATE_AT[id];
  if (typeof t.rep === 'number') t.rep = Math.max(0, t.rep - 1.5); else jpopAdd(s, id, -0.8);
  addLog(s, at ? `${at}에 늦었다. ` + U.pick(['함께 일하는 사람들이 한참 기다렸다.', '다들 말은 안 했지만 분위기가 싸늘했다.', '사과는 했지만 눈치가 보였다.']) : '방송을 약속한 시간보다 한참 늦게 켰다. 기다리던 시청자들이 하나둘 나갔다.', 'bad');
  s.lateT = (s.lateT || []).filter(x => x > s.t - 12).concat(s.t);
  if (s.lateT.length < 3) return;
  s.lateT = [];
  // 지각 논란은 한 번 나면 2년 동안은 다시 나지 않는다 (그사이 지각은 기록만)
  if (scFame(s) >= 3000 && !s.scandal && !(s.cd.lateSc > s.t)) { s.cd.lateSc = s.t + 24; startScandal(s, 'late', 'real'); }
  else addLog(s, '또 늦으면 곤란하다는 말을 들었다.', 'bad');
}
// 이름이 알려질수록 가끔 논란이 터진다 (스태프는 아주 가끔)
E({
  id: 'scandal_gen', cat: '논란',
  p: s => {
    if (s.scandal || s.hiatus || s.army || age(s) < 15 || s.cd.scGen > s.t) return 0;
    const f = scFame(s);
    return f >= 5000 ? Math.min(0.012, 0.003 + 0.003 * Math.log10(1 + f / 1e4)) : staffOn(s) ? 0.002 : 0;
  },
  init(s, d) {
    const can = Object.keys(SC).filter(id => { try { return SC[id].who(s); } catch (e) { return false; } });
    if (!can.length) { d.skip = true; return; }
    startScandal(s, U.wpick(can, id => SC[id].w(s)));
    s.cd.scGen = s.t + 12;
    d.skip = true;
  },
});
// 미성년자에게 고백했던 일이 알려진다: 이름이 알려졌으면 논란, 아니면 주변 평판이 떨어진다
E({
  id: 'minor_out', cat: '논란', title: '퍼진 소문',
  cond: s => true,
  init(s, d) {
    if (s.scandal || s.hiatus) { queueEv(s, 'minor_out', 6, d, true); d.skip = true; return; }
    if (scFame(s) >= 3000 || anyTrackActive(s)) { s.flags.minorConf = { id: d.id, name: d.name, t: s.t }; startScandal(s, 'minor', 'real'); d.skip = true; }
  },
  text: (s, d) => `${d.name}에게 고백했던 일이 주변에 알려졌다. 미성년자에게 고백한 어른이라는 말이 돌면서, 사람들의 눈길이 싸늘해졌다.`,
  ch: () => [{ t: '확인', f: s => '미성년자에게 고백했던 일이 알려졌다.' + fx(s, { rep: -15, stress: 12 }) }],
});
// 논란이 터졌다: 대응을 고른다
E({
  id: 'scandal', cat: '논란', tag: 'career',
  // 커뮤니티에서 어떤 말이 도는지 볼 수 있다 (진짜인지 아닌지는 여기서도 알 수 없다)
  plio: s => s.scandal && typeof commSpec === 'function' ? (s.scandal.cm || (s.scandal.cm = commSpec(s, { k: 'scandal', bd: '이슈 게시판', t: SC[s.scandal.id].n, me: me(s).name, tn: 'meh' }))) : null,
  cond: s => !!s.scandal && !s.scandal.resp,
  title: s => s.scandal ? SC[s.scandal.id].n : '논란',
  text: s => { const sc = s.scandal, T = SC[sc.id]; return `${scText(T.claim, s)} 기사와 댓글이 쏟아지고 있다. ${T.know[sc.truth]}`; },
  ch: s => {
    const sc = s.scandal, T = SC[sc.id], L = T.lab || {}, ag = scAgency(s), m = hiatusMonths(s, T);
    // 상습 지각 논란에 사과하거나 자숙하면 마음을 고쳐먹는다: 성실성 재능이 조금 오른다 (v129)
    const go = (resp, delay, log) => s => { sc.resp = resp; if (sc.id === 'late' && (resp === 'apo' || resp === 'hiatus')) { const p = me(s); p.tal.grit = Math.min(98, p.tal.grit + (resp === 'hiatus' ? U.int(5, 8) : U.int(3, 5))); } queueEv(s, 'scandal_res', delay, {}, true); return log; };
    const C = [
      { t: L.apo || '사과문을 낸다', f: go('apo', 1, `${T.n}에 대해 ${L.apo ? '입장을 밝혔다.' : '사과문을 올렸다.'}`) },
      { t: L.deny || '사실이 아니라고 해명한다', f: go('deny', 1, `${T.n}에 대해 사실이 아니라는 입장문을 냈다.`) },
    ];
    if (!T.noFight && sc.truth !== 'real') C.push({ t: '증거를 모아 반박한다', h: `비용 ${fmtWon(SC_PROVE)}${s.money >= SC_PROVE ? '' : ' · 돈이 모자라다'}`, ok: s => s.money >= SC_PROVE, f: s => { addMoney(s, -SC_PROVE, '논란 대응 비용'); return go('prove', 2, '증거를 모으기 시작했다. 대화 기록과 사진, 함께 있던 사람들의 말을 찾는다.')(s); } });
    if (!T.noFight && !T.soft) C.push({ t: '법적 대응을 한다', h: ag ? '비용은 회사가 낸다' : `변호사 비용 ${fmtWon(SC_SUE)}${s.money >= SC_SUE ? '' : ' · 돈이 모자라다'}`, ok: s => !!ag || s.money >= SC_SUE, f: s => { if (!ag) addMoney(s, -SC_SUE, '변호사 비용'); return go('sue', 2, '고소장을 냈다. 허위 사실을 퍼뜨린 사람을 법으로 다투겠다고 밝혔다.')(s); } });
    C.push({ t: '아무 말도 하지 않는다', f: go('quiet', 1, '아무 말도 하지 않고 지나가길 기다렸다.') });
    C.push({ t: L.hiatus || '사과하고 활동을 멈춘다 (자숙)', h: `${m}개월 동안 직업 활동을 할 수 없다`, f: s => { s.hiatus = { left: m, n: T.n }; dropShows(s); return go('hiatus', 1, `사과문을 올리고 ${m}개월 동안 활동을 멈추기로 했다.`)(s); } });
    return C;
  },
});
// 자숙하거나 크게 무너지면 고정 예능에서 내려온다
function dropShows(s) {
  const t = s.tracks.variety;
  if (!trackOn(s, 'variety') || !t.shows.length) return '';
  const n = t.shows.length; t.shows = [];
  return ` 고정 프로그램 ${n}개에서 하차했다.`;
}
// 대응의 결과: [곱할 무게, 결과 종류]. clear: 결백이 밝혀짐, calm: 잠잠해짐, bad: 더 나빠짐, exposed: 거짓말이 들통남
function scOutcome(s, sc, T) {
  const tr = sc.truth, r = sc.resp, p = me(s);
  const talk = U.clamp((p.tal.verbal + p.tal.insight) / 200 + 0.1, 0.2, 0.8);
  if (tr === 'fake') return {
    apo: [1.2, 'bad'], deny: U.chance(0.5) ? [0, 'clear'] : [0.5, 'calm'], prove: U.chance(0.75) ? [0, 'clear'] : [0.5, 'calm'],
    sue: U.chance(0.85) ? [0, 'clear'] : [0.5, 'calm'], quiet: [0.6, 'calm'], hiatus: [0.5, 'calm'],
  }[r];
  if (tr === 'half') return {
    apo: [T.soft ? 0.3 : 0.5, 'calm'], deny: U.chance(talk) ? [0.2, 'calm'] : [1.1, 'bad'], prove: U.chance(0.55) ? [0.15, 'calm'] : [0.9, 'bad'],
    sue: U.chance(0.35) ? [0.3, 'calm'] : [1.6, 'bad'], quiet: [0.8, 'calm'], hiatus: [0.4, 'calm'],
  }[r];
  if (tr === 'perf') return { apo: [0.5, 'calm'], deny: [1.4, 'bad'], quiet: [1, 'calm'], hiatus: [0.6, 'calm'] }[r];
  // 진짜 열애: 아이돌·버튜버는 팬이 크게 떠나고, 배우·모델은 축하받는 편이다
  if (sc.id === 'dating') {
    const dl = datingLv(s), ex = U.chance(0.65);
    return ({
      hard: { apo: [0.9, 'calm'], deny: ex ? [2, 'exposed'] : [0.5, 'calm'], quiet: [1, 'bad'], hiatus: [0.5, 'calm'] },
      mid: { apo: [0.3, 'calm'], deny: ex ? [1.6, 'exposed'] : [0.3, 'calm'], quiet: [0.6, 'calm'], hiatus: [0.3, 'calm'] },
      soft: { apo: [0, 'calm'], deny: ex ? [1.2, 'exposed'] : [0.2, 'calm'], quiet: [0.3, 'calm'], hiatus: [0.3, 'calm'] },
    })[dl][r] || [1, 'calm'];
  }
  // 진짜인 일
  const soft = T.soft && !isIdol(s);
  return {
    apo: [soft ? 0.2 : 0.65, 'calm'], deny: U.chance(0.65) ? [2, 'exposed'] : [0.5, 'calm'],
    sue: U.chance(0.8) ? [2.6, 'exposed'] : [0.5, 'calm'], quiet: [1, 'bad'], hiatus: [0.4, 'calm'],
  }[r];
}
// 결과 반영. 돌려주는 값: 결과 문장 + 바뀐 수치
function scApply(s, sc, T, mult, kind) {
  const fm = scFameMul(s), dmg = scSev(s, T) * fm * mult;
  let x = '';
  if (kind === 'clear') {
    s.stigma = 0;
    const comp = sc.resp === 'sue' ? Math.round(U.int(10, 50) * fm) * 100e4 : 0;
    if (comp) earn(s, comp, '명예훼손 합의금');
    milestone(s, `${age(s)}세에 ${T.n}에 휘말렸지만 사실이 아닌 것으로 밝혀졌다.`);
    return `${comp ? `합의금 ${fmtWon(comp)}을 받았다. ` : ''}` + fx(s, { rep: 5, pop: 3, fkr: Math.round(s.fans.kr * 0.03), stress: -6 });
  }
  if (dmg <= 0) return '';
  const frac = Math.min(0.6, dmg * 0.05);
  const loss = {}; for (const m of MK) loss['f' + m] = -Math.round(s.fans[m] * frac);
  x += fx(s, Object.assign({ rep: -Math.round(dmg * 4), pop: -Math.round(dmg * 4), fame: Math.round(dmg * 3), stress: Math.round(dmg * 4 / pm(s, 'criticRes')) }, loss));
  s.stigma = Math.min(100, Math.max(s.stigma || 0, Math.round(dmg * 7)));
  // 채널·그룹도 같이 흔들린다
  // MCN 소속이면 MCN이 대응을 도와 구독자 피해가 줄어든다
  if (trackOn(s, 'youtube') && s.tracks.youtube.subs) { const sh = MCN_HELP.shield[mcnTierT(s, s.tracks.youtube)]; s.tracks.youtube.subs = Math.round(s.tracks.youtube.subs * (1 - frac * (1 - sh))); if (sh) x += ` ${josa(s.tracks.youtube.mcn.n, '이가')} 대응을 도와 구독자 피해가 줄었다.`; }
  if (trackOn(s, 'vidol') && s.tracks.vidol.subs) s.tracks.vidol.subs = Math.round(s.tracks.vidol.subs * (1 - frac));
  if (isIdol(s)) {
    const g = s.tracks.idol.g;
    for (const m of MK) g.f[m] = Math.round(g.f[m] * (1 - frac * 0.4));
    for (const id of g.members) { const n = s.people[id]; if (n) aff(n, -Math.round(dmg)); }
  }
  // 크게 무너지면: 광고가 끊기고, 고정 예능에서 내려오고, 들어와 있던 배역 제안이 사라진다
  if (dmg >= 5) {
    for (const b of (s.brands || [])) { const pen = Math.round(b.fee * 0.5 / 1e5) * 1e5; addMoney(s, -pen, '광고 위약금'); x += ` ${BRAND_BY[b.id].n} 광고가 끊겼다(위약금 ${fmtWon(pen)}).`; }
    s.brands = [];
    x += dropShows(s);
    s.inbox = s.inbox.filter(m => !['cast_offer', 'brand_offer', 'var_fixed'].includes(m.kind));
  }
  // 아주 크게 무너지면 배우·모델 소속사가 계약을 끝낸다 (회사의 결정)
  if (dmg >= 9 && (sc.truth === 'real' || kind === 'exposed')) {
    for (const id of ['actor', 'model']) {
      const t = s.tracks[id];
      if (trackOn(s, id) && t.ag && (id !== 'actor' || t.via === 'agency')) { x += ` ${josa(t.agN, '이가')} 전속 계약을 끝내겠다고 알려 왔다.`; t.hist.push(`${t.agN} (계약 해지)`); t.ag = null; t.agN = ''; t.cut = 0; t.contract = 0; if (id === 'actor') t.via = 'indie'; }
    }
  }
  if (dmg >= 8) milestone(s, `${age(s)}세에 ${T.n}${kind === 'exposed' ? '(거짓 해명이 들통남)' : ''}으로 크게 무너졌다.`);
  return x;
}
E({
  id: 'scandal_res', cat: '논란', tag: 'career',
  cond: s => !!s.scandal && !!s.scandal.resp,
  title: (s, d) => `${SC[d.id].n} 그 뒤`,
  init(s, d) {
    const sc = s.scandal, T = SC[sc.id], [mult, kind] = scOutcome(s, sc, T);
    d.id = sc.id; d.kind = kind; d.truth = sc.truth; d.resp = sc.resp; d.dl = sc.id === 'dating' ? datingLv(s) : '';
    d.fx = scApply(s, sc, T, mult, kind);
    if (sc.truth === 'perf' && sc.resp === 'apo') d.fx += fx(s, { sk: { acting: 3 } });
    if (sc.id === 'backad') s.flags.backAd = false;
    s.scHist = (s.scHist || []).concat({ t: sc.t, id: sc.id, truth: sc.truth, resp: sc.resp, kind });
    s.scandal = null;
  },
  text: (s, d) => {
    const T = SC[d.id], r = d.resp, tr = d.truth;
    const line = d.kind === 'clear' ? ({ deny: '해명 뒤에 함께 있던 사람들이 내 말을 뒷받침해 줬다. 처음 글을 올린 사람이 글을 지우고 사과했다.', prove: '모은 증거를 공개하자 여론이 단번에 뒤집혔다. 사람들이 오히려 나를 걱정해 줬다.', sue: '수사 결과 허위로 밝혀졌다. 처음 퍼뜨린 사람이 공개 사과를 했다.' })[r] || '사실이 아닌 것으로 밝혀졌다.'
      : d.kind === 'exposed' ? (r === 'sue' ? '수사 과정에서 오히려 사실이라는 증거가 나왔다. 거짓말로 고소까지 했다는 비난이 쏟아졌다.' : '해명과 다른 증거가 나왔다. 거짓말까지 했다는 비난이 쏟아졌다.')
      : d.id === 'dating' && tr === 'real' && r === 'apo' ? ({ hard: '열애를 인정하자 팬들이 크게 반발했다. 팬 커뮤니티에 탈덕 인증 글이 줄을 이었다.', mid: '담담하게 밝히자 아쉬워하는 팬도, 응원하는 팬도 있었다.', soft: '열애를 인정하자 축하한다는 반응이 대부분이었다.' })[d.dl]
      : d.kind === 'bad' ? (tr === 'fake' && r === 'apo' ? (d.id === 'dating' ? '사귀지도 않는 사람과의 열애를 인정한 꼴이 됐다.' : '하지 않은 일을 사과한 꼴이 됐다. 사람들은 사실로 받아들였다.') : r === 'quiet' ? '아무 말도 하지 않자 사람들은 사실이라고 믿었다.' : r === 'sue' ? '반쯤은 맞는 이야기에 고소부터 하자 오히려 반감을 샀다.' : r === 'deny' && tr === 'perf' ? '변명처럼 들렸다. 비웃음만 더 커졌다.' : '해명이 잘 먹히지 않았다. 논란이 더 커졌다.')
      : r === 'hiatus' ? '자숙하겠다는 말에 비난이 조금씩 잦아들었다.' : r === 'apo' ? (T.soft ? '담담하게 밝히자 오히려 응원하는 사람도 많았다.' : '진심으로 사과하자 비난이 차츰 잦아들었다.') : r === 'quiet' ? '시간이 지나며 조금씩 잊혀 갔다. 다만 말은 여전히 남아 있다.' : '논란이 조금씩 가라앉았다.';
    return `${line}${d.fx ? '\n\n' + d.fx.trim() : ''}`;
  },
  // 창 없이 넘어가도 무슨 일이 있었는지 알 수 있게 설명 한 줄과 바뀐 수치를 함께 남긴다 (턴제 실험 7차)
  ch: (s, d) => [{ t: '확인', f: () => { const tx = EVENTS.scandal_res.text(s, d).replace(/\n+/g, ' ').trim(), head = d.kind === 'clear' ? '결백이 밝혀졌다' : d.kind === 'exposed' ? '거짓 해명이 들통났다' : d.kind === 'bad' ? '논란이 커졌다' : '논란이 가라앉았다'; return `${SC[d.id].n}: ${tx.includes('논란이') ? '' : head + '. '}${tx}`; } }],
});
// 자숙이 끝났다 (회사·업계가 다시 부르기 시작한다)
E({
  id: 'hiatus_end', cat: '논란', title: '활동 재개', tag: 'career',
  cond: s => true,
  text: (s, d) => `${d.n} 때문에 멈췄던 활동을 다시 시작할 수 있게 됐다.`,
  ch: () => [{ t: '조심스럽게 돌아간다', f: s => '자숙을 마치고 활동을 다시 시작했다.' + fx(s, { stress: -5 }) }],
});
// 매달: 자숙 기간이 줄고 꼬리표가 옅어진다 (game.js tick에서 부른다)
function scandalMonth(s) {
  if (s.hiatus) { s.hiatus.left--; if (s.hiatus.left <= 0) { queueEv(s, 'hiatus_end', 0, { n: s.hiatus.n }, true); s.hiatus = null; } }
  if (s.stigma > 0) s.stigma = Math.max(0, s.stigma - 1.5);
}

// ── 논란의 씨앗: 내가 고른 일이 나중에 논란이 된다 ──
// 뒷광고: 광고라는 걸 숨기면 돈을 더 준다는 제안
E({
  id: 'yt_backad_offer', cd: 24, cat: '광고 제안', title: '조건이 붙은 광고',
  p: s => trackOn(s, 'youtube') && s.tracks.youtube.st === 'active' && s.tracks.youtube.subs >= 1e4 && !s.flags.backAd ? 0.02 : 0,
  init(s, d) { const t = s.tracks.youtube; d.b = U.pick(BRANDS).n; d.fee = Math.round(Math.max(100e4, t.subs * 30) / 1e5) * 1e5; },
  text: (s, d) => `${d.b}에서 영상 하나에 제품을 넣어 달라는 광고 제안이 왔다. 광고비는 ${fmtWon(d.fee)}.\n\n담당자가 슬쩍 덧붙인다. "광고라고 밝히지 않으면 절반을 더 드릴게요."`,
  ch: (s, d) => [
    { t: '광고라고 밝힌다', h: fmtWon(d.fee), f: s => { earn(s, d.fee, '플리오 광고비'); return `${d.b} 광고 영상을 올렸다. '유료 광고 포함'이라고 적었다.`; } },
    { t: '밝히지 않는다', h: fmtWon(Math.round(d.fee * 1.5)), f: s => { earn(s, Math.round(d.fee * 1.5), '플리오 광고비'); s.flags.backAd = true; return `${d.b} 제품을 직접 산 것처럼 영상에 넣었다.`; } },
    { t: '거절한다', f: () => `${d.b}의 광고 제안을 거절했다.` },
  ],
});

// ── 자숙 중에는 직업 활동과 지원을 못 한다 ──
// v104: 모든 직업 파일을 읽은 뒤 겸직 규칙과 함께 씌운다 (game.js gateApplies, ui.js에서 부른다)
