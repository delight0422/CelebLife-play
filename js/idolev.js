'use strict';
// v157 아이돌: 일하는 방식(자동으로 하는 일 · 골라서 하는 일) + 사건 16개 + 이어지는 사건 두 줄기(전담 프로듀서와의 인연 · 자작곡의 길)
function idT(s) { return s.tracks.idol; }
function idOn(s) { const t = s.tracks.idol; return !!t && t.st === 'active' && !!t.g; }
function idTr(s) { const t = s.tracks.idol; return !!t && t.st === 'trainee' && t.kind !== 'band'; }
function idMates(s, t) { return people(s, x => x.rel === '동기' && x.trainee === t.ag); }
function idMem(s, t) { return t.g.members.map(id => s.people[id]).filter(Boolean); }
function idMain(t) { return t.mkt === 'jp' ? 'jp' : 'kr'; }

// ───── 자동으로 하는 일: 시기에 따라 저절로 바뀐다 ─────
// 활동(발매 뒤 두 달) → 개인 연습(쉬는 동안 · 다음 앨범을 기획 · 심사하는 달) → 활동 준비(편곡 · 작사 · 녹음 · 안무, 발매 전 두 달)
const IDOL_PH = {
  self: { n: '개인 연습', ic: '🎧', g: '직업 활동', h: '내 포지션 ↑↑ · 노래·춤 ↑ · 스트레스 조금 ↑', eff: [['내 포지션', '↑↑', 1], ['노래·춤', '↑', 1], ['스트레스', '↑', 0]] },
  prep: { n: '활동 준비 (녹음·안무·뮤직비디오)', ic: '🎬', g: '직업 활동', h: '노래·춤 ↑↑ · 팀워크 ↑ · 스트레스 ↑', eff: [['노래·춤', '↑↑', 1], ['팀워크', '↑', 1], ['스트레스', '↑', 0]] },
  promo: { n: '활동 (음악방송·스케줄)', ic: '🎤', g: '직업 활동', h: '노래·춤 ↑ · 무대 · 팬 · 스트레스 ↑↑', eff: [['노래·춤', '↑', 1], ['팬', '↑', 1], ['스트레스', '↑↑', 0]] },
};
function idolPhase(s, t) {
  if (!t || t.st !== 'active') return 'tr';
  if (t.promo > 0) return 'promo';
  return t.alb && (t.alb.deb || s.t - t.alb.at >= 1) ? 'prep' : 'self';
}
// 일정 칸 이름도 시기를 따른다 (연습생 · 밴드 연습생은 예전 그대로)
Object.defineProperty(CAREERS.idol, 'act', {
  configurable: true,
  get() { const s = typeof S !== 'undefined' ? S : null; if (idolIsBand(s)) return BAND_TR_ACT; const t = s && s.tracks && s.tracks.idol; return t && t.st === 'active' ? IDOL_PH[idolPhase(s, t)] : IDOL_ACT; },
});
CAREERS.idol.autoList = (s, t) => {
  if (t.st !== 'active') return [{ ic: IDOL_ACT.ic, n: t.kind === 'band' ? '밴드 연습 (합주·트레이닝)' : '연습생 트레이닝', eff: '회사 연습실 · 월말 평가', on: true }];
  const cur = idolPhase(s, t);
  return ['self', 'prep', 'promo'].map(k => ({ ic: IDOL_PH[k].ic, n: IDOL_PH[k].n, eff: IDOL_PH[k].h, on: k === cur }));
};
// 그룹 연습 한 달 (music.js idolActiveMonth에서 부른다). 예전(활동기 1 · 쉬는 기간 1.4)과 평균이 같게
function idolAutoPractice(s, t, n) {
  const p = me(s), ph = idolPhase(s, t), mk = CAREERS.idol.mainSk(s, t);
  for (let i = 0; i < n; i++) for (const k of ['vocal', 'dance', 'rap']) if (has(p, k)) practice(s, p, k, ph === 'promo' ? 1 : ph === 'prep' ? 1.35 : k === mk ? 1.9 : 1.15);
  if (ph === 'prep') twAdd(t.g, 0.8);
  return ph;
}

// ───── 골라서 하는 일: 켜 두면 매달 꾸준히 한다 (두 가지까지, 언제든 바꿀 수 있다) ─────
const IDOL_WAY_MAX = 2;
const IDOL_WAYS = [
  { id: 'song', ic: '🎼', n: '내 곡 내기', f: 'subSong', show: (s, t) => t.st === 'active' && has(me(s), 'compose'), h: s => `다음 앨범 데모곡 모집에 내 곡을 낸다 · 남의 곡과 똑같이 A&R 심사를 받는다 · 작곡 ${lvi(me(s), 'compose')}레벨` },
  { id: 'lyr', ic: '✍️', n: '가사 내기', f: 'subLyr', show: (s, t) => t.st === 'active' && has(me(s), 'lyric'), h: s => `실릴 곡의 가사를 써 보겠다고 한다 · 맡을 작사가보다 잘 쓰면 타이틀곡 · 작사 ${lvi(me(s), 'lyric')}레벨` },
  { id: 'act', ic: '🎭', n: '연기 연습', sk: 'acting', show: () => true, h: (s, t) => `연기 ↑ · 스트레스 조금 ↑${t.st === 'active' ? ' · 연기가 늘면 웹드라마 제안이 온다' : ''}` },
  { id: 'fan', ic: '💬', n: '팬 소통', show: (s, t) => t.st === 'active', h: () => '라이브 방송 · 메시지 · 내 팬 ↑ · 그룹 팬 조금 ↑ · 스트레스 조금 ↑ · 가끔 말실수' },
  { id: 'mate', ic: '🤝', n: t => t.st === 'active' ? '멤버 챙기기' : '동기 챙기기', show: (s, t) => t.st === 'active' || idMates(s, t).length > 0, h: (s, t) => `${t.st === 'active' ? '멤버 사이 ↑ · 팀워크 ↑' : '동기 사이 ↑'} · 스트레스 ↓ · 밥값` },
  { id: 'var', ic: '😆', n: '예능 감 익히기', sk: 'variety', show: () => true, h: (s, t) => `예능 ↑ · 스트레스 조금 ↑${t.st === 'active' ? ' · 개인 예능 섭외가 더 자주 온다' : ''}` },
];
function idolWayN(t, w) { return typeof w.n === 'function' ? w.n(t) : w.n; }
function idolWayOn(t, w) { return w.f ? !!t[w.f] : (t.ways || []).includes(w.id); }
function idolWayHas(t, id) { return (t.ways || []).includes(id); }
function idolWayCnt(s, t) { return IDOL_WAYS.filter(w => w.show(s, t) && idolWayOn(t, w)).length; }
function idolWaySet(s, t, w, v) {
  const nm = idolWayN(t, w);
  if (w.f) t[w.f] = v; else { t.ways = (t.ways || []).filter(x => x !== w.id); if (v) t.ways.push(w.id); }
  const x = v && w.sk && !has(me(s), w.sk) ? learnMe(s, w.sk, 1) : '';
  return v ? `${josa(nm, '을를')} 꾸준히 하기로 했다.${x}` : `${josa(nm, '은는')} 그만하기로 했다.`;
}
function idolPicks(s, t) {
  if (s.army || (t.st !== 'active' && !idTr(s))) return [];
  const n = idolWayCnt(s, t), W = IDOL_WAYS.filter(w => w.show(s, t));
  const A = W.map((w, i) => {
    const on = idolWayOn(t, w), room = !w.sk || has(me(s), w.sk) || skRoom(s, w.sk);
    return { sw: true, sec: i === 0 ? `켜 두면 매달 꾸준히 한다 · ${IDOL_WAY_MAX}가지까지 (지금 ${n}가지)` : '', t: `${w.ic} ${idolWayN(t, w)}`, tag: on ? '켜 둠' : '', h: w.h(s, t), btn: on ? '끄기' : '켜기', ok: on || (n < IDOL_WAY_MAX && room), why: !room ? `특기가 ${SKILL_CAP}개라 ${SKILLS[w.sk].n} 특기를 새로 배울 수 없다` : `${IDOL_WAY_MAX}가지까지만 켜 둘 수 있다 · 하나를 먼저 끈다`, run: s => idolWaySet(s, t, w, !on) };
  });
  // 한 번 하는 일: 외부 레슨 · 게릴라 공연 (칼군무 맞추기는 활동 준비로, 멤버 코칭 · 밥 먹기는 멤버 챙기기로 합쳤다)
  const O = t.st === 'active' ? teamPicks(s, 'idol').filter(a => /레슨|게릴라/.test(a.t)) : [];
  return A.concat(O.map((a, i) => Object.assign({}, a, i === 0 ? { sec: '한 번 하는 일' } : {})));
}
CAREERS.idol.picks = (s, t) => idolPicks(s, t);

// 매달: 켜 둔 일 · 고정 예능 · 매니저 · 트레이너 특훈 (연습생 · 데뷔 뒤 모두)
function idolWaysMonth(s, t) {
  const p = me(s), act = t.st === 'active';
  if (idolWayHas(t, 'act') && has(p, 'acting')) {
    practice(s, p, 'acting', 0.7); addStress(s, 0.8);
    if (act && lv(p, 'acting') >= 25 && !hasQ(s, 'idol_act_offer') && U.chance(0.015 + lv(p, 'acting') / 4000)) queueEv(s, 'idol_act_offer', 0);
  }
  if (idolWayHas(t, 'var') && has(p, 'variety')) { practice(s, p, 'variety', 0.7); addStress(s, 0.8); }
  if (act && idolWayHas(t, 'fan')) {
    const m = idMain(t), f = Math.round((20 + Math.sqrt(groupFans(t.g)) * 0.6) * U.fl(0.6, 1.4) * popSpeed(s) * myRoom(s, m));
    s.fans[m] += f; t.g.f[m] = Math.min(FANCAP[m], t.g.f[m] + Math.round(f * 0.4)); addStress(s, 1);
    if (U.chance(0.012) && !hasQ(s, 'idol_slip')) queueEv(s, 'idol_slip', 0);
  }
  if (idolWayHas(t, 'mate')) {
    const L = act ? idMem(s, t) : idMates(s, t);
    if (L.length) {
      bond(s, U.pick(L), 2); for (const x of L) bond(s, x, 0.4);
      if (act) twAdd(t.g, twOf(t.g) < 80 ? 1 : 0.2);
      addStress(s, -1.5);
      addMoney(s, -Math.min(Math.max(0, s.money), 5e4 * (L.length + 1)), act ? '멤버들과 식사' : '동기들과 식사');
    }
  }
  if (t.trB && t.trB.left > 0) { if (has(p, t.trB.k)) practice(s, p, t.trB.k, 1.2); if (--t.trB.left <= 0) t.trB = null; }
  if (!act) return;
  // 고정 예능 (⑧): 반년 동안 매주 녹화
  const V = t.varFix;
  if (V && V.left > 0) {
    const gf = groupFans(t.g), m = idMain(t);
    if (has(p, 'variety')) practice(s, p, 'variety', 1.5);
    const f = Math.round((250 + gf * 0.002) * U.clamp(0.4 + lv(p, 'variety') / 60, 0.3, 1.6) * popSpeed(s) * myRoom(s, m));
    s.fans[m] += f; addStress(s, 2.5);
    memberIncome(s, t, (400e4 + gf * 6) * awMul(s, 'idol'), '고정 예능 출연료', 1);
    if (--V.left <= 0) { t.varFix = null; t.varN = (t.varN || 0) + 1; addLog(s, `예능 「${V.n}」 고정 출연을 마쳤다.${lv(p, 'variety') >= 45 ? ' 마지막 녹화에서 출연진이 다음 시즌도 같이 하자고 했다.' : ''}`, 'career'); }
  }
  // 매니저 (⑪): 꼼꼼하면 덜 지치고, 무심하면 더 지친다
  if (t.mgrK === '꼼꼼') addStress(s, -0.5); else if (t.mgrK === '무심') addStress(s, 0.5); else if (t.mgrK === '열정') addStress(s, 0.3);
}
// 앨범 성적에 들어가는 이번 한 번의 보탬 (안무 수정 · 내 파트). 쓰고 나면 지운다
function idolTakeB(t) { const r = { st: t.stB || 0, part: U.clamp(t.partB || 0, -0.5, 0.6) }; t.stB = 0; t.partB = 0; return r; }

// ═════════ 연습생 사건 ═════════
// ① 길거리 캐스팅: 청소년 · 광역시 이상. 기획사 명함 / 모델 에이전시 명함 / 수상한 명함
E({
  id: 'idol_street', cat: '캐스팅', title: '길거리 캐스팅', tag: 'career', cast: true, bg: 'street',
  p: s => (s.done.idol_street || 0) >= 2 ? 0 : me(s).tal.looks >= 70 ? 0.012 : me(s).tal.looks >= 55 ? 0.005 : 0,
  cond: s => age(s) >= 13 && age(s) <= 18 && !trackOn(s, 'idol') && !agencyContract(s) && !hasQ(s, 'idol_aud') && !hasQ(s, 'model_aud'),
  init(s, d) {
    d.k = U.wpick(['ag', 'model', 'scam'], x => ({ ag: 45, model: 25, scam: 30 })[x]);
    if (d.k === 'ag') { const L = musicAgencies().filter(a => a.mkt === 'kr'); const a = L.length ? U.wpick(L, x => [0, 5, 3, 1][x.tier] || 1) : null; if (!a) { d.k = 'scam'; } else d.ag = a.id; }
    if (d.k === 'model') { const a = U.pick(modelAgencies()); if (!a) d.k = 'scam'; else d.ag = a.id; }
    d.who = genName(U.chance(0.5) ? '여' : '남', calY(s) - U.int(28, 45));
    d.where = U.pick(['학원 앞 횡단보도', '지하철역 계단', '쇼핑몰 푸드코트', '학교 앞 분식집', '번화가 버스 정류장']);
  },
  text: (s, d) => {
    const a = d.ag && AG[d.ag];
    const card = d.k === 'ag' ? `명함에는 ${a.n} 로고와 '캐스팅팀 ${d.who}'라는 이름, 회사 대표 번호가 찍혀 있다. 검색해 보니 아는 그룹이 소속된 회사다.`
      : d.k === 'model' ? `명함에는 ${a.n} 로고와 '모델 캐스팅 ${d.who}'라는 이름이 있다. 잡지 화보에서 본 모델들이 소속된 에이전시다.`
        : `명함에는 회사 이름 대신 '실장 ${d.who}'와 휴대폰 번호만 적혀 있다. 이름을 검색해도 아무것도 나오지 않는다.`;
    return `${d.where}에서 누군가 말을 걸었다. "혹시 연예인 해 볼 생각 없어요?"\n\n${card}`;
  },
  ch: (s, d) => {
    const go = (wait) => s => {
      if (d.k === 'scam') { queueEv(s, 'idol_scam', wait, { who: d.who }); return '명함에 적힌 번호로 연락해 봤다.'; }
      const a = AG[d.ag];
      if (d.k === 'ag') { const p = U.clamp(idolAudP(s, a) + 0.2 + (me(s).tal.looks - 60) / 200, 0.05, 0.92); s.cd['aud_' + a.id] = s.t + 12; queueEv(s, 'idol_aud', wait, { ag: a.id, p }); return `${a.n} 캐스팅팀의 연락을 받고 오디션을 봤다.`; }
      const p = audP(modelScore(s) + modelAgeAdj(age(s)) + 6, a.thr); s.cd['maud_' + a.id] = s.t + 12; queueEv(s, 'model_aud', wait, { ag: a.id, p }); return `${a.n}에 찾아가 프로필 사진을 찍고 테스트를 봤다.`;
    };
    return [
      { t: '연락해 본다', h: '어떤 곳인지는 가 봐야 안다', f: go(1) },
      { t: '부모님과 먼저 상의한다', ok: s => parentsAlive(s).length > 0, h: '한 달 더 걸린다', f: s => d.k === 'scam' ? '부모님이 명함을 보더니 고개를 저었다. "회사 이름도 없는 데는 안 돼." 연락하지 않았다.' : '부모님과 상의한 뒤 ' + go(2)(s) },
      { t: '그냥 지나간다', f: () => '명함은 가방 속에 넣어 두고 잊어버렸다.' },
    ];
  },
});
E({
  id: 'idol_scam', cat: '캐스팅', title: '수상한 연락', tag: 'career', bg: 'street',
  init(s, d) { d.cost = U.pick([50, 80, 120, 150]) * 1e4; },
  text: (s, d) => `명함의 번호로 연락하자 실장 ${josa(d.who, '이가')} 사무실로 오라고 했다. 상가 2층의 작은 방이었다.\n\n"데뷔하려면 프로필 사진부터 찍어야 해. 촬영비랑 트레이닝 등록비 ${fmtWon(d.cost)}만 먼저 내면 바로 기획사들에 돌려 볼게."`,
  ch: (s, d) => [
    { t: '돈을 낸다', f: s => '돈을 보내고 일주일 뒤, 실장의 번호가 없는 번호로 나왔다. 사기였다.' + fx(s, { money: -d.cost, stress: 10 }) },
    { t: '왜 먼저 돈을 내야 하냐고 묻는다', f: s => '"싫으면 말고"라며 문을 닫았다. 나중에 같은 수법에 당한 사람들 글을 봤다.' + fx(s, { stress: 2 }) },
    { t: '그냥 나온다', f: () => '찜찜해서 그냥 나왔다.' },
  ],
});
// ② 월말 평가 뒤 트레이너 면담: 가장 약한 쪽을 맡은 트레이너(회사 트레이너팀 인물)
E({
  id: 'idol_tr_talk', cat: '연습생', title: '트레이너 면담', tag: 'career', bg: 'practice', p: 0.04, cd: 10,
  cond: s => idTr(s) && idT(s).months >= 3 && !idT(s).team,
  init(s, d) {
    const t = idT(s), p = me(s), L = typeof coTeamPeople === 'function' ? coTeamPeople(s, t.ag + '#tr') : [];
    const ks = ['vocal', 'dance', 'rap'].filter(k => has(p, k)).sort((a, b) => lv(p, a) - lv(p, b));
    d.k = ks[0] || 'vocal';
    const want = { vocal: '보컬', dance: '댄스', rap: '랩' }[d.k], x = L.find(y => (y.job || '').includes(want)) || L[1] || L[0];
    if (!x) { d.skip = true; return; }
    d.tr = x.id; meetAt(s, x, `${t.agN} 연습생`, 'idol');
  },
  text: (s, d) => { const t = idT(s), x = s.people[d.tr]; return `월말 평가가 끝나고 ${x.job} ${josa(x.name, '이가')} 따로 불렀다. 최근 평가 ${t.rank || '-'}위(${t.pool}명 중).\n\n"${SKILLS[d.k].n}이 몇 달째 제자리야. 이대로면 데뷔조는 어려워."`; },
  ch: (s, d) => {
    const t = idT(s), x = s.people[d.tr];
    return [
      { t: '따로 봐 달라고 부탁한다', h: `석 달 동안 ${SKILLS[d.k].n} 특훈 · 스트레스 ↑ · 트레이너와 가까워진다`, f: s => { t.trB = { k: d.k, left: 3 }; bond(s, x, 6); return `${x.name} 트레이너에게 석 달 동안 ${SKILLS[d.k].n} 특훈을 받기로 했다.` + fx(s, { stress: 4 }); } },
      { t: '제 방식대로 해 보겠다고 한다', h: '잘하는 쪽을 더 민다 · 트레이너는 서운해한다', f: s => { const k = CAREERS.idol.mainSk(s, t) || 'vocal'; practice(s, me(s), k, 2); bond(s, x, -5); return `"그럼 결과로 보여 줘." ${x.name} 트레이너가 짧게 말했다.`; } },
      { t: '고개만 끄덕인다', f: () => '알겠다고 대답하고 연습실로 돌아왔다.' },
    ];
  },
});
// ③ 동기의 방출
E({
  id: 'idol_mate_cut', cat: '연습생', title: '동기의 방출', tag: 'career', bg: 'practice', p: 0.025, cd: 14,
  cond: s => idTr(s) && idMates(s, idT(s)).length > 0,
  init(s, d) { const L = idMates(s, idT(s)); d.m = L.sort((a, b) => (lv(a, 'vocal') + lv(a, 'dance')) - (lv(b, 'vocal') + lv(b, 'dance')))[0].id; },
  text: (s, d) => { const t = idT(s), m = s.people[d.m]; return `동기 ${josa(m.name, '이가')} 방출 통보를 받았다. 같이 ${t.agN}에 들어와 ${yrsMo(t.months)}을 버틴 사이다.\n\n오늘 밤 숙소를 나간다고 한다. 짐은 캐리어 하나가 전부다.`; },
  ch: (s, d) => {
    const m = s.people[d.m], out = () => { m.rel = '친구'; m.trainee = null; m.job = '전 연습생'; };
    return [
      { t: '짐 싸는 걸 도와주고 배웅한다', f: s => { out(); bond(s, m, 10); return `${m.name}의 짐을 들어 주고 버스 정류장까지 배웅했다. "너는 꼭 데뷔해." 그 말이 오래 남았다.` + fx(s, { stress: 3 }); } },
      { t: '회사에 한 번만 더 기회를 달라고 말한다', h: '들어줄 가능성은 낮다 · 회사 눈 밖에 날 수도 있다', f: s => { if (U.chance(0.15)) { bond(s, m, 15); return `회사가 ${m.name}에게 석 달을 더 주기로 했다. ${josa(m.name, '이가')} 말없이 나를 안았다.` + fx(s, { stress: 4 }); } out(); bond(s, m, 8); return `실장님은 "남 걱정할 때냐"고만 했다. ${josa(m.name, '은는')} 결국 숙소를 나갔다.` + fx(s, { stress: 6 }); } },
      { t: '모른 척 연습에 집중한다', h: '연습 ↑ · 사이가 멀어진다', f: s => { out(); const k = CAREERS.idol.mainSk(s, idT(s)) || 'vocal'; practice(s, me(s), k, 1.5); bond(s, m, -6); return `인사도 제대로 못 하고 연습실 불을 켰다. 거울 속 내 얼굴이 낯설었다.` + fx(s, { stress: 2 }); } },
    ];
  },
});
// ④ 데뷔조 마지막 한 자리: 데뷔 준비 둘째 달에 가끔. 다음 달 평가로 정한다
E({
  id: 'idol_last_seat', cat: '연습생', title: '마지막 한 자리', tag: 'career', bg: 'practice',
  cond: s => idTr(s) && idT(s).team,
  init(s, d) {
    const t = idT(s), L = idMates(s, t);
    let r = L.length ? U.pick(L) : null;
    if (!r) { const ag = AG[t.ag]; r = makeMusicMate(s, { g: me(s).g, rel: '동기', job: '연습생', met: `${t.agN} 연습생 동기`, mkt: ag.mkt, tal: ['looks', 'star'], sk: { vocal: ag.thr, dance: ag.thr, rap: ag.thr - 10 } }); r.trainee = t.ag; }
    d.r = r.id; d.pb = U.clamp(0.55 + (t.pool * 0.35 - (t.rank || t.pool * 0.3)) / t.pool * 0.8, 0.3, 0.8);
    d.ps = U.clamp(0.35 + (me(s).tal.star + me(s).tal.looks - 110) / 120, 0.2, 0.85);
  },
  text: (s, d) => { const r = s.people[d.r]; return `데뷔조 인원이 한 명 많다. 회사는 다음 달 평가로 마지막 한 자리를 정한다고 했다.\n\n남은 건 나와 ${r.name} 둘뿐이다. 연습실에서 서로 눈을 피한다.`; },
  ch: (s, d) => {
    const r = s.people[d.r], q = (p, how, txt, o) => s => { queueEv(s, 'idol_seat_res', 1, { r: d.r, p, how }, true); return txt + fx(s, o); };
    return [
      { t: '밤새 연습한다', h: `붙을 가능성 ${fmtPct(Math.min(0.92, d.pb + 0.12))} · 스트레스 ↑↑`, f: s => { for (const k of ['vocal', 'dance']) practice(s, me(s), k, 1.5); return q(Math.min(0.92, d.pb + 0.12), 'night', '한 달 동안 연습실에서 살다시피 했다.', { stress: 10 })(s); } },
      { t: `${josa(r.name, '과와')} 같이 연습한다`, h: `붙을 가능성 ${fmtPct(d.pb)} · 누가 붙든 사이는 좋아진다`, f: s => { bond(s, r, 8); return q(d.pb, 'mate', `${josa(r.name, '과와')} 서로 모니터를 해 주며 한 달을 보냈다.`, { stress: 4 })(s); } },
      { t: '내 매력을 보여 줄 무대를 준비한다', h: `붙을 가능성 ${fmtPct(d.ps)} · 외모 · 스타성으로 승부`, f: q(d.ps, 'star', '평가 무대에서 보여 줄 나만의 장면을 준비했다.', { stress: 5 }) },
    ];
  },
});
E({
  id: 'idol_seat_res', cat: '연습생', title: '마지막 한 자리', tag: 'career', bg: 'practice', keepPop: true,
  cond: s => idTr(s) && idT(s).team,
  init(s, d) { d.win = U.chance(d.p); },
  text: (s, d) => { const r = s.people[d.r]; return d.win ? `평가가 끝나고 실장님이 내 이름을 불렀다. 마지막 자리는 내 것이다.\n\n${r ? `${josa(r.name, '은는')} 다시 일반 연습생으로 돌아간다.${d.how === 'mate' ? ' "축하해. 진심이야."' : ' 숙소 복도에서 나를 지나쳐 갔다.'}` : ''}` : `평가가 끝나고 실장님이 ${r ? `${r.name}의` : '다른 연습생의'} 이름을 불렀다. 나는 데뷔조에서 빠진다.\n\n"다음 데뷔조에는 1순위로 넣을게." 실장님이 어깨를 두드렸다.`; },
  ch: (s, d) => [{ t: '확인', f: s => {
    const t = idT(s), r = s.people[d.r];
    if (d.win) { if (r) bond(s, r, d.how === 'mate' ? 4 : -6); return '데뷔조 마지막 한 자리를 지켰다.' + fx(s, { stress: -6 }); }
    t.team = false; t.prep = 0; t.seatLost = true; if (r) bond(s, r, d.how === 'mate' ? 2 : -4);
    milestone(s, `${age(s)}세에 데뷔조 마지막 한 자리를 놓쳤다.`);
    return '데뷔조에서 빠졌다. 다음 데뷔조 1순위라는 말을 들었다.' + fx(s, { stress: 8 * pm(s, 'loseStress') });
  } }],
});

// ═════════ 활동 사건 ═════════
// ⑤ 전담 프로듀서의 지적 (이어지는 사건 ㄱ: 전담 프로듀서와의 인연의 시작)
E({
  id: 'idol_pd_note', cat: '앨범', title: '프로듀서의 지적', tag: 'career', p: 0.06, cd: 12,
  cond: s => idOn(s) && !!idT(s).alb && !idT(s).alb.deb && !idT(s).pdArc,
  init(s, d) { const t = idT(s), w = agProd(s, t.ag, t.g); if (!w.p) { d.skip = true; return; } d.x = w.p.id; d.n = w.n; meetAt(s, w.p, `「${t.g.name}」 앨범`, 'idol'); },
  text: (s, d) => { const t = idT(s); return `녹음실에서 ${josa(d.n, '이가')} 녹음을 멈췄다. "${t.pos.split(' · ')[0]}가 이 정도밖에 안 돼? 다시."\n\n몇 번을 다시 불러도 고개를 젓는다. 부스 밖에서 멤버들이 내 눈치를 본다.`; },
  ch: (s, d) => {
    const t = idT(s), x = s.people[d.x], k = has(me(s), 'rap') && lv(me(s), 'rap') > lv(me(s), 'vocal') ? 'rap' : 'vocal';
    return [
      { t: '밤늦게까지 남아서 연습한다', h: `${SKILLS[k].n} ↑ · 스트레스 ↑ · 프로듀서가 기억할 것이다`, f: s => { practice(s, me(s), k, 2.5); bond(s, x, 6); t.pdArc = { id: x.id, v: 1, st: 1 }; return '모두 퇴근한 뒤에도 부스에 남아 같은 소절을 백 번 넘게 불렀다.' + fx(s, { stress: 6 }); } },
      { t: '"제 스타일도 있어요" 하고 맞선다', h: '속은 시원하다 · 프로듀서와 사이가 나빠진다', f: s => { bond(s, x, -12); t.pdArc = { id: x.id, v: -1, st: 1 }; return `녹음실 공기가 얼어붙었다. ${x.name} 프로듀서는 말없이 다음 멤버를 불렀다.` + fx(s, { stress: -3 }); } },
      { t: '알겠다고만 한다', f: s => '고개를 숙이고 다시 불렀다. 그날 녹음은 늦게 끝났다.' + fx(s, { stress: 3 }) },
    ];
  },
});
// 다음 앨범 · 그다음 앨범을 시작할 때 (music.js idolAlbStart에서 부른다)
function idolArcAlb(s, t) {
  const A = t.pdArc;
  if (!A || !s.people[A.id]) return;
  if (A.st === 1) { A.st = 2; queueEv(s, 'idol_pd_part', 1, {}, true); }
  else if (A.st === 2) { A.st = 3; queueEv(s, 'idol_pd_end', 1, {}, true); }
}
E({
  id: 'idol_pd_part', cat: '앨범', title: '이번 앨범의 내 파트', tag: 'career', bg: 'meeting',
  cond: s => idOn(s) && !!idT(s).pdArc,
  init(s, d) { const t = idT(s), x = s.people[t.pdArc.id]; if (!x) { d.skip = true; return; } d.x = x.id; d.v = t.pdArc.v; },
  text: (s, d) => { const x = s.people[d.x]; return d.v > 0 ? `다음 앨범 파트 분배표가 나왔다. 내 파트가 눈에 띄게 늘었다.\n\n${x.name}: "지난번에 밤늦게까지 남아서 연습하던 거 봤어. 이번엔 네가 이 부분 맡아."` : `다음 앨범 파트 분배표가 나왔다. 내 파트가 줄었다. 후렴 한 줄이 다른 멤버에게 넘어갔다.\n\n녹음실에서 ${x.name}은 나와 눈을 마주치지 않는다.`; },
  ch: (s, d) => {
    const t = idT(s), x = s.people[d.x], k = CAREERS.idol.mainSk(s, t) || 'vocal';
    if (d.v > 0) return [{ t: '기대에 맞춰 준비한다', f: s => { t.partB = (t.partB || 0) + 0.25; bond(s, x, 4); practice(s, me(s), k, 2); return `${x.name} 프로듀서가 이번 앨범에서 내 파트를 늘려 줬다.` + fx(s, { stress: 3 }); } }];
    const ag = AG[t.ag];
    return [
      { t: '먼저 찾아가 사과한다', h: '사이가 풀릴 수 있다', f: s => { bond(s, x, 10); t.pdArc.v = 0.5; t.partB = (t.partB || 0) - 0.1; return `${x.name} 프로듀서를 찾아가 지난 일을 사과했다. "녹음 때 보자." 짧은 대답이 돌아왔다.` + fx(s, { stress: 2 }); } },
      { t: '실력으로 보여 준다', h: '노래 · 춤 ↑ · 파트는 줄어든 그대로', f: s => { t.partB = (t.partB || 0) - 0.2; practice(s, me(s), k, 2.5); return '줄어든 파트를 받아들이고 연습실에 남았다.' + fx(s, { stress: 5 }); } },
    ].concat(ag && ag.tier >= 2 ? [{ t: '회사에 프로듀서를 바꿔 달라고 한다', h: '들어줄 가능성 35% · 안 되면 사이가 더 나빠진다', f: s => { if (U.chance(0.35)) { t.g.prod = null; t.pdArc = null; return '회사가 다음 앨범부터 전담 프로듀서를 바꾸기로 했다. 이번 앨범 파트는 그대로다.' + fx(s, { stress: 2 }); } bond(s, x, -10); t.partB = (t.partB || 0) - 0.25; t.pdArc.v = -1.5; return `회사는 들어주지 않았다. 이 이야기가 ${x.name} 프로듀서 귀에도 들어갔다.` + fx(s, { stress: 7 }); } }] : []);
  },
});
E({
  id: 'idol_pd_end', cat: '앨범', title: '프로듀서와 나', tag: 'career', keepPop: true,
  cond: s => idOn(s) && !!idT(s).pdArc,
  init(s, d) { const t = idT(s), x = s.people[t.pdArc.id]; if (!x) { d.skip = true; t.pdArc = null; return; } d.x = x.id; d.w = t.pdArc.v > 0 && x.aff >= 45 ? 'good' : t.pdArc.v < 0 || x.aff < 25 ? 'bad' : 'mid'; t.pdArc.st = 4; },
  text: (s, d) => { const x = s.people[d.x]; return d.w === 'good' ? `녹음이 끝난 뒤 ${x.name} 프로듀서가 따로 불렀다. USB 하나를 내밀었다.\n\n"네 목소리에 맞춰 쓴 곡이야. 이번 앨범에 네 솔로곡으로 넣자."` : d.w === 'bad' ? `이번 앨범에서 ${x.name} 프로듀서는 내 파트를 거의 다 다른 멤버에게 넘겼다. "톤이 이번 곡이랑 안 맞는다"는 말이 회의에서 나왔다고 한다.\n\n이 사람과는 끝내 맞지 않는 것 같다.` : `${x.name} 프로듀서가 녹음 중에 "요즘 많이 늘었다"고 했다. 처음엔 어렵기만 했던 사람인데, 이제는 녹음실에서 농담도 한다.`; },
  ch: (s, d) => {
    const t = idT(s), x = s.people[d.x], ag = AG[t.ag];
    if (d.w === 'good') return [{ t: '고맙다고 한다', f: s => {
      t.partB = (t.partB || 0) + 0.35; bond(s, x, 8);
      milestone(s, `${age(s)}세에 ${x.name} 프로듀서에게 솔로곡을 받았다.`);
      let r = `${x.name} 프로듀서가 써 준 솔로곡이 다음 앨범에 실린다.`;
      if (!trackOn(s, 'solo') && (lv(me(s), 'vocal') >= 35 || lv(me(s), 'rap') >= 35) && !s.inbox.some(m => m.kind === 'idol_solo')) { sendMsg(s, 'idol_solo', { from: t.agN, title: '솔로 데뷔 제안', months: 8, d: {} }); r += ' 회사에서도 솔로 이야기가 나왔다.'; }
      return r + fx(s, { stress: -6, rep: 1 });
    } }];
    if (d.w === 'mid') return [{ t: '확인', f: s => { bond(s, x, 6); t.partB = (t.partB || 0) + 0.1; return `${x.name} 프로듀서와 서로 인정하는 사이가 됐다.` + fx(s, { stress: -3 }); } }];
    return [
      { t: '참는다', h: '이번 앨범 내 몫이 줄어든다', f: s => { t.partB = (t.partB || 0) - 0.3; return '아무 말 하지 않았다. 무대 위에서 내 자리는 줄었다.' + fx(s, { stress: 8 }); } },
      { t: '회사에 정식으로 문제를 제기한다', h: '가능성 50%', f: s => { if (U.chance(0.5) && ag && ag.tier >= 2) { t.g.prod = null; t.partB = (t.partB || 0) - 0.1; return `회사가 내 말을 들어 줬다. 다음 앨범부터 ${x.name} 프로듀서는 ${josa(`「${t.g.name}」`, '을를')} 맡지 않는다.` + fx(s, { stress: 3 }); } bond(s, x, -10); t.partB = (t.partB || 0) - 0.3; return '회사는 "프로듀서 판단을 믿는다"고만 했다.' + fx(s, { stress: 8, rep: -1 }); } },
    ];
  },
});
// ⑥ 안무가의 안무 수정 (앨범 준비 중)
E({
  id: 'idol_choreo', cat: '앨범', title: '안무 수정', tag: 'career', bg: 'practice', p: 0.04, cd: 12,
  cond: s => idOn(s) && !!idT(s).alb && !idT(s).alb.deb && idT(s).g.members.length > 0,
  init(s, d) { const t = idT(s), c = pickIndustry(s, '안무가'); meetAt(s, c, `「${t.g.name}」 안무`, 'idol'); d.c = c.id; d.m = U.pick(t.g.members); },
  text: (s, d) => { const c = s.people[d.c]; return `안무가 ${josa(c.name, '이가')} 내 파트 안무를 다시 짰다. 박자를 쪼갠 동작이 쉴 틈 없이 이어진다.\n\n"이게 되면 이번 무대 킬링 파트야. 안 되면 원래대로 가고."`; },
  ch: (s, d) => {
    const t = idT(s), c = s.people[d.c], m = s.people[d.m], p = me(s), ok = U.clamp((lv(p, 'dance') - 25) / 40, 0.15, 0.9);
    return [
      { t: '해 보겠다고 한다', h: `해낼 가능성 ${fmtPct(ok)} · 해내면 무대가 산다 · 춤 ↑ · 스트레스 ↑`, f: s => { practice(s, p, 'dance', 2); if (U.chance(ok)) { t.stB = (t.stB || 0) + 3; t.partB = (t.partB || 0) + 0.1; bond(s, c, 6); return `몇 주를 매달린 끝에 새 안무가 몸에 붙었다. ${c.name} 안무가가 엄지를 들었다.` + fx(s, { stress: 6 }); } t.stB = (t.stB || 0) - 1; return '끝내 몸에 붙지 않았다. 무대 직전까지 동선이 꼬였다.' + fx(s, { stress: 8 }); } },
      { t: '원래 안무로 해 달라고 한다', f: s => { bond(s, c, -4); return '원래 안무로 가기로 했다. 안무가는 조금 아쉬운 표정이었다.'; } },
    ].concat(m ? [{ t: `${m.name}에게 넘긴다`, h: '멤버와 가까워진다 · 내 몫은 조금 준다', f: s => { bond(s, m, 8); twAdd(t.g, 2); t.partB = (t.partB || 0) - 0.1; return `그 파트를 춤을 더 잘 추는 ${m.name}에게 넘겼다. ${josa(m.name, '이가')} 고맙다고 했다.`; } }] : []);
  },
});
// ⑦ 음악방송 PD의 엔딩 컷 (활동기)
E({
  id: 'idol_ending', cat: '음악방송', title: '엔딩 컷', tag: 'career', bg: 'waiting', p: 0.06, cd: 10,
  cond: s => idOn(s) && idT(s).promo > 0 && idT(s).g.members.length > 0,
  init(s, d) {
    const t = idT(s), x = makeIndustry(s, '음악방송 PD', { age: U.int(30, 48) }); meetAt(s, x, '음악방송', 'idol'); d.pd = x.id;
    const L = idMem(s, t).sort((a, b) => b.by - a.by); d.m = (L[0] || {}).id;
  },
  text: (s, d) => { const x = s.people[d.pd]; return `음악방송 리허설이 끝나고 PD ${josa(x.name, '이가')} 엔딩 포즈를 누가 할지 정해 오라고 했다.\n\n엔딩 컷은 방송이 끝난 뒤에도 몇 번이고 돈다.`; },
  ch: (s, d) => {
    const t = idT(s), g = t.g, p = me(s), m = s.people[d.m], x = s.people[d.pd];
    const mine = s => { const z = (p.tal.star + p.tal.looks - 100) / 30 + U.normal(0, 0.5), gm = idMain(t);
      if (z > 0.5) { const f = Math.round((500 + groupFans(g) * 0.01) * popSpeed(s) * myRoom(s, gm)); g.f[gm] = Math.min(FANCAP[gm], g.f[gm] + Math.round(f * 0.5)); bond(s, x, 4); return `카메라를 보고 짧게 웃었다. 그 몇 초가 '엔딩 요정'으로 퍼졌다.` + fx(s, { ['f' + gm]: f, fame: 2 }); }
      if (z < -0.4) return '카메라 앞에서 굳어 버렸다. 어색한 엔딩이 그대로 나갔다.' + fx(s, { stress: 4 });
      return '무난하게 엔딩을 마쳤다.' + fx(s, { fame: 1 }); };
    return [
      { t: '내가 한다', h: '스타성 · 외모만큼 화제가 된다', f: s => { if (m) bond(s, U.pick(idMem(s, t)), -2); return mine(s); } },
    ].concat(m ? [{ t: `막내 ${m.name}에게 양보한다`, h: '멤버와 가까워진다 · 팀워크 ↑', f: s => { bond(s, m, 8); twAdd(g, 2); return `엔딩을 ${m.name}에게 양보했다. 방송이 끝나고 ${josa(m.name, '이가')} 꾸벅 인사했다.`; } }] : [])
      .concat([{ t: 'PD님이 정해 주세요', f: s => U.chance(0.35) ? `PD가 나를 골랐다. ` + mine(s) : `PD가 다른 멤버를 골랐다.` }]);
  },
});
// ⑧ 예능 작가의 고정 제안 (쉬는 기간. 예능 감을 익히고 있으면 더 자주)
const VAR_SHOWS = ['아이돌 하우스', '주말엔 출동', '퀴즈 앤 스타', '동네 한 바퀴 투어', '오늘의 셰프', '스튜디오 수다방', '런닝 아이돌', '랜선 캠핑'];
E({
  id: 'idol_var_fix', cat: '스케줄', title: '고정 예능 제안', tag: 'career', cd: 24,
  p: s => { const t = idT(s), v = has(me(s), 'variety') ? lv(me(s), 'variety') : 0; return 0.007 * (idolWayHas(t, 'var') ? 3 : 1) * (v >= 30 ? 1.6 : v >= 15 ? 1 : 0.5); },
  cond: s => idOn(s) && !idT(s).varFix && !(idT(s).promo > 0),
  init(s, d) { const w = makeIndustry(s, '예능 작가', { age: U.int(28, 45) }); meetAt(s, w, '예능', 'idol'); d.w = w.id; d.n = U.pick(VAR_SHOWS); },
  text: (s, d) => { const w = s.people[d.w]; return `예능 작가 ${josa(w.name, '이가')} 연락해 왔다. 예능 「${d.n}」 고정 출연자 자리가 비었는데, 지난번 방송에서 내 리액션이 좋았다고 한다.\n\n반년 동안 매주 녹화한다. 출연료는 회사와 나눈다. 예능 ${has(me(s), 'variety') ? lvi(me(s), 'variety') : 0}레벨.`; },
  ch: (s, d) => {
    const t = idT(s), w = s.people[d.w];
    return [
      { t: '해 본다', h: '여섯 달 · 예능 ↑ · 내 팬 ↑ · 출연료 · 스트레스 ↑', f: s => { t.varFix = { left: 6, n: d.n, w: d.w }; bond(s, w, 5); const x = has(me(s), 'variety') ? '' : learnMe(s, 'variety', 1); milestone(s, `${age(s)}세에 예능 「${d.n}」 고정 출연을 시작했다.`); return `예능 「${d.n}」에 고정으로 나가기로 했다.${x}`; } },
      { t: '그룹 활동에 집중한다', f: s => { bond(s, w, -2); return '고정 예능 제안을 정중히 거절했다.'; } },
    ];
  },
});
// ⑨ 대기실 선배 그룹 인사 (활동기)
E({
  id: 'idol_senior', cat: '음악방송', title: '대기실 인사', tag: 'career', bg: 'waiting', p: 0.03, cd: 12,
  cond: s => idOn(s) && idT(s).promo > 0,
  init(s, d) {
    const gn = newGroupName(s), x = makeMusicMate(s, { g: U.chance(0.5) ? '여' : '남', age: Math.max(18, age(s) + U.int(2, 7)), rel: '선배', job: `아이돌 (「${gn}」)`, met: '음악방송 대기실', aff: 30, tal: ['looks', 'star'], sk: { vocal: 60, dance: 62 } });
    d.x = x.id; d.gn = gn; d.yr = U.int(5, 11); d.warm = U.chance(0.65);
  },
  text: (s, d) => { const x = s.people[d.x]; return `음악방송 대기실 복도에서 선배 그룹 「${d.gn}」의 ${josa(x.name, '과와')} 마주쳤다. 데뷔 ${d.yr}년 차, 이름만 대면 다 아는 그룹이다.`; },
  ch: (s, d) => {
    const x = s.people[d.x];
    return [
      { t: '고개 숙여 인사하고 우리 앨범을 건넨다', f: s => { meetAt(s, x, '음악방송 대기실', 'idol'); if (d.warm) { bond(s, x, 12); return `${josa(x.name, '이가')} 앨범을 받아 들고 "무대 봤어. 잘하더라"며 번호를 알려 줬다.` + fx(s, { stress: -4 }); } bond(s, x, 2); return `${josa(x.name, '은는')} 앨범을 받는 둥 마는 둥 하고 지나갔다.` + fx(s, { stress: 3 }); } },
      { t: '멤버들 뒤에서 조용히 인사만 한다', f: s => { bond(s, x, 1); return '멤버들 뒤에서 조용히 고개를 숙였다.'; } },
    ];
  },
});
// ⑩ 회사 후배 그룹 데뷔 (데뷔 2년 뒤부터)
E({
  id: 'idol_junior', cat: '그룹', title: '후배 그룹 데뷔', tag: 'career', p: 0.012, cd: 30,
  cond: s => idOn(s) && idT(s).months >= 24,
  init(s, d) {
    const t = idT(s), jg = newGroupName(s), x = makeMusicMate(s, { g: U.chance(0.5) ? '여' : '남', age: Math.max(16, age(s) - U.int(3, 7)), rel: '후배', job: `아이돌 (「${jg}」)`, met: `${t.agN} 후배 그룹`, aff: 40, tal: ['looks', 'star'], sk: { vocal: 40, dance: 45 } });
    meetAt(s, x, `${t.agN} 후배 그룹`, 'idol'); d.x = x.id; d.jg = jg; d.late = U.chance(0.4) && !t.alb && t.nextCb < 50;
  },
  text: (s, d) => { const t = idT(s), x = s.people[d.x]; return `${t.agN} 후배 그룹 ${josa(`「${d.jg}」`, '이가')} 다음 달 데뷔한다. 회사가 선배로서 데뷔를 도와 달라고 했다. 리더 ${josa(x.name, '이가')} 긴장한 얼굴로 인사하러 왔다.${d.late ? '\n\n회사 관심이 한동안 후배 쪽으로 쏠릴 것 같다.' : ''}`; },
  ch: (s, d) => {
    const t = idT(s), x = s.people[d.x], late = s => { if (!d.late) return ''; t.nextCb += 1; return ' 회사가 후배 데뷔에 힘을 쏟느라 우리 다음 앨범이 한 달 밀렸다.'; };
    return [
      { t: '데뷔 챌린지 영상을 같이 찍어 준다', h: '내 팬 조금 ↑ · 후배와 가까워진다', f: s => { bond(s, x, 8); const gm = idMain(t), f = Math.round((200 + groupFans(t.g) * 0.002) * popSpeed(s) * myRoom(s, gm)); return `「${d.jg}」 데뷔곡 챌린지를 같이 찍었다.` + late(s) + fx(s, { ['f' + gm]: f, stress: 2 }); } },
      { t: '연습실에서 무대를 봐 준다', h: '후배와 많이 가까워진다 · 스트레스 ↑', f: s => { bond(s, x, 14); if (has(me(s), 'edu')) practice(s, me(s), 'edu', 1); return `밤마다 연습실에 들러 「${d.jg}」 무대를 봐 줬다. ${josa(x.name, '이가')} "선배님 덕분"이라며 몇 번이고 인사했다.` + late(s) + fx(s, { stress: 4 }); } },
      { t: '응원 메시지만 보낸다', f: s => { bond(s, x, 2); return `「${d.jg}」 단톡방에 짧은 응원 메시지를 남겼다.` + late(s); } },
    ];
  },
});
// ⑪ 매니저 교체: 새 매니저 성격에 따라 매달 조금 덜 지치거나 더 지친다
E({
  id: 'idol_manager', cat: '그룹', title: '매니저 교체', tag: 'career', p: 0.008, cd: 36,
  cond: s => idOn(s) && idT(s).months >= 6,
  init(s, d) {
    const t = idT(s), old = t.mgr && s.people[t.mgr], x = makeIndustry(s, '매니저', { age: U.int(25, 38) });
    d.old = old ? old.id : null; d.x = x.id; d.k = U.pick(['꼼꼼', '무심', '열정']); t.mgr = x.id; t.mgrK = d.k; meetAt(s, x, `「${t.g.name}」 매니저`, 'idol');
  },
  text: (s, d) => { const o = d.old && s.people[d.old], x = s.people[d.x]; return `${o ? `매니저 ${josa(o.name, '이가')} 회사를 떠났다.` : '데뷔 때부터 함께한 매니저가 다른 팀으로 옮겼다.'} 새 매니저는 ${x.name}.\n\n${({ 꼼꼼: '스케줄표를 분 단위로 짜 오고, 멤버들 컨디션을 수첩에 적는다.', 무심: '차 안에서 내내 휴대폰만 본다. 스케줄 시간을 자주 헷갈린다.', 열정: '일을 더 따 오겠다며 의욕이 넘친다. 쉬는 날이 줄 것 같다.' })[d.k]}`; },
  ch: (s, d) => {
    const o = d.old && s.people[d.old], x = s.people[d.x];
    return [{ t: '먼저 다가가 친해진다', f: s => { bond(s, x, 8); return `${x.name} 매니저에게 먼저 말을 걸었다. 차 안 공기가 조금 풀렸다.`; } }]
      .concat(o ? [{ t: '예전 매니저에게 고맙다고 연락한다', f: s => { bond(s, o, 8); return `${o.name} 매니저에게 그동안 고마웠다고 메시지를 보냈다. 긴 답장이 왔다.` + fx(s, { stress: -3 }); } }] : [])
      .concat([{ t: '지켜본다', f: () => '새 매니저가 어떤 사람인지 지켜보기로 했다.' }]);
  },
});
// ⑫ 대표와 정산 면담
E({
  id: 'idol_pay_talk', cat: '그룹', title: '정산 면담', tag: 'career', bg: 'meeting', p: 0.01, cd: 24,
  cond: s => idOn(s) && idT(s).months >= 18,
  init(s, d) { const t = idT(s), b = agBoss(s, t.ag); meetAt(s, b, `${t.agN} 대표`, 'idol'); d.b = b.id; },
  text: (s, d) => { const t = idT(s), b = s.people[d.b]; return `대표 ${josa(b.name, '이가')} 정산 면담을 하자고 했다. ${t.debt > 0 ? `정산서에는 아직 갚아야 할 연습생 · 제작 비용 ${fmtWon(t.debt)}이 남아 있다. 숙소비, 의상비, 뮤직비디오 제작비가 줄줄이 적혀 있다.` : `지난 1년 정산서를 받았다. 회사 몫 ${pctN(t.cut)}, 멤버 ${t.g.members.length + 1}명이 나눈다.`}`; },
  ch: (s, d) => {
    const t = idT(s), b = s.people[d.b], p = me(s), gf = groupFans(t.g);
    const pf = U.clamp(0.2 + lv(p, 'study') / 150 + (p.tal.insight - 50) / 150, 0.1, 0.6), pc = U.clamp(U.sig((Math.log10(1 + gf) - 5.3) * 2) * 0.7, 0.05, 0.7);
    return [
      { t: '항목을 하나하나 따져 묻는다', h: `잘못된 걸 찾을 가능성 ${fmtPct(pf)} · 대표와 사이가 나빠질 수 있다`, f: s => {
        if (U.chance(pf)) { bond(s, b, -3); if (t.debt > 0) { const v = Math.round(t.debt * U.fl(0.05, 0.12)); t.debt -= v; return `잘못 들어간 비용을 찾아냈다. 갚을 비용이 ${fmtWon(v)} 줄었다.`; } const v = Math.round((300e4 + gf * 20) / (t.g.members.length + 1) / 1e4) * 1e4; earn(s, v, '정산 오류 환급', 'idol'); return `빠진 수입을 찾아냈다. 회사가 ${fmtWon(v)}을 더 보냈다.`; }
        bond(s, b, -8); return '아무것도 찾지 못했다. 대표의 표정만 굳었다.' + fx(s, { stress: 4 });
      } },
      { t: '회사 몫을 조금 낮춰 달라고 한다', h: `들어줄 가능성 ${fmtPct(pc)} · 그룹이 클수록`, f: s => { if (t.cut > 0.3 && U.chance(pc)) { const c0 = t.cut; t.cut = Math.max(0.3, Math.round((t.cut - 0.05) * 100) / 100); bond(s, b, -2); return `대표가 한참 생각하더니 회사 몫을 ${pctN(c0)}에서 ${pctN(t.cut)}로 낮춰 주기로 했다.`; } bond(s, b, -6); return '"아직은 어렵다"는 대답이 돌아왔다.' + fx(s, { stress: 3 }); } },
      { t: '감사하다고만 한다', f: s => { bond(s, b, 4); return '정산서를 받아 들고 고개를 숙였다.'; } },
    ];
  },
});
// ⑬ 직캠 화제 (활동기, 플리오): 크게 뜨는 '화제의 중심'과 따로, 내 직캠 하나가 퍼진다
E({
  id: 'idol_fancam', cat: '화제', title: '직캠 화제', tag: 'career', cd: 8,
  p: s => idOn(s) && idT(s).promo > 0 ? 0.02 * boomStatMult(boomStageS(s, idT(s)), 40) : 0,
  cond: s => idOn(s) && idT(s).promo > 0,
  init(s, d) {
    const t = idT(s), g = t.g, gm = idMain(t), w = s.works.filter(x => x.by === g.name).slice(-1)[0];
    d.song = w ? w.title : '데뷔곡'; d.sc = Math.round(U.clamp(55 + (boomStageS(s, t) - 35) * 1.2 + U.normal(0, 6), 40, 98)); d.vw = Math.round(Math.pow(10, 3.6 + d.sc / 30));
    d.my = Math.round((600 + groupFans(g) * 0.004) * U.clamp((d.sc - 40) / 30, 0.2, 2) * popSpeed(s) * myRoom(s, gm)); d.gf = Math.round(d.my * 0.6);
    s.fans[gm] += d.my; g.f[gm] = Math.min(FANCAP[gm], g.f[gm] + d.gf);
  },
  plio: (s, d) => d.pl || (d.pl = plioSpec({ k: 'stage', t: `${idT(s).g.name} ${actName(s, 'idol')} 직캠 「${d.song}」`, ch: `${PF.video.n} 직캠`, me: actName(s, 'idol'), sc: d.sc, rv: d.sc >= 75 ? 2 : 1, vw: d.vw, sx: liveSx([me(s)]) })),
  text: (s, d) => `음악방송 「${d.song}」 무대의 내 직캠이 조회수 ${plN(d.vw)}회를 넘겼다. "이 멤버 이름이 뭐예요?" 댓글이 줄을 선다.\n\n내 개인 팬 +${fmtFans(d.my)} · 그룹 팬 +${fmtFans(d.gf)}`,
  ch: (s, d) => [
    { t: '확인', f: () => `내 「${d.song}」 직캠이 ${plN(d.vw)}회를 넘겼다.` },
    { t: '멤버들 직캠도 같이 밀어 달라고 회사에 말한다', h: '멤버들과 가까워진다 · 팀워크 ↑', f: s => { const t = idT(s); for (const m of idMem(s, t)) bond(s, m, 3); twAdd(t.g, 2); return '회사에 멤버들 직캠도 같이 올려 달라고 했다. 멤버들이 고마워했다.'; } },
  ],
});
// ⑭ 연말 합동 무대 (12월, 그룹 팬 3만 명부터)
E({
  id: 'idol_year_stage', cat: '음악방송', title: '연말 합동 무대', tag: 'career', bg: 'waiting',
  cond: s => idOn(s),
  init(s, d) {
    const gn = newGroupName(s), x = makeMusicMate(s, { g: U.chance(0.5) ? '여' : '남', age: Math.max(17, age(s) + U.int(-3, 3)), rel: '업계', job: `아이돌 (「${gn}」)`, met: '연말 가요제 합동 무대', aff: 35, tal: ['looks', 'star'], sk: { vocal: 55, dance: 58 } });
    d.x = x.id; d.gn = gn;
  },
  text: (s, d) => { const x = s.people[d.x]; return `${calY(s)} 연말 가요제에서 다른 회사 아이돌들과 합동 무대를 꾸민다. 나는 「${d.gn}」의 ${josa(x.name, '과와')} 한 무대에 선다.\n\n맞춰 볼 시간은 2주뿐이다.`; },
  ch: (s, d) => {
    const t = idT(s), x = s.people[d.x], p = me(s), z = (Math.max(lv(p, 'vocal'), lv(p, 'rap')) * 0.4 + lv(p, 'dance') * 0.4 + p.tal.star * 0.2 - 45) / 15;
    return [
      { t: '밤새 맞춘다', h: '무대가 잘되면 둘 다 화제가 된다 · 스트레스 ↑', f: s => { meetAt(s, x, '연말 가요제 합동 무대', 'idol'); bond(s, x, 10); const gm = idMain(t); if (z + U.normal(0, 0.6) > 0.3) { const f = Math.round((800 + groupFans(t.g) * 0.008) * popSpeed(s) * myRoom(s, gm)); return `합동 무대 영상이 연말 내내 돌았다. "이 조합 또 보고 싶다"는 댓글이 쏟아졌다.` + fx(s, { ['f' + gm]: f, fame: 2, stress: 6 }); } return '실수 없이 무대를 마쳤다. 연말 무대답게 화려했다.' + fx(s, { stress: 6 }); } },
      { t: '편하게 즐긴다', f: s => { meetAt(s, x, '연말 가요제 합동 무대', 'idol'); bond(s, x, 4); return `${josa(x.name, '과와')} 웃으며 무대를 즐겼다.` + fx(s, { stress: -3 }); } },
    ];
  },
});
// ⑮ 팬사인회의 오랜 팬
E({
  id: 'idol_fansign', cat: '팬', title: '팬사인회', tag: 'career', bg: 'fansign', p: 0.025, cd: 10,
  cond: s => idOn(s) && groupFans(idT(s).g) >= 1e4,
  init(s, d) { d.fan = genName(U.chance(0.7) ? '여' : '남', calY(s) - U.int(16, 34)); d.k = U.pick(['since', 'last', 'sick']); },
  text: (s, d) => { const g = idT(s).g; return `「${g.name}」 팬사인회. 줄 끝에서 ${d.fan} 차례가 왔다.\n\n${({ since: '데뷔 쇼케이스 때부터 왔다고 한다. 그때 사인받은 앨범을 아직 들고 다닌다.', last: '취업 때문에 지방으로 내려가서, 이번이 마지막 팬사인회라고 했다.', sick: '다음 주에 수술을 받는다며, 응원 한마디만 해 달라고 했다.' })[d.k]}`; },
  ch: (s, d) => {
    const g = idT(s).g, gm = idMain(idT(s));
    return [
      { t: '이름을 불러 주며 오래 이야기한다', h: '뒷사람들이 기다린다 · 스트레스 ↓', f: s => { const f = Math.round((100 + groupFans(g) * 0.002) * popSpeed(s) * myRoom(s, gm)); return `${d.fan}의 이름을 부르며 한참 이야기했다. 그날 영상이 팬 커뮤니티에 올라왔다.` + fx(s, { ['f' + gm]: f, stress: -6, rep: 1 }); } },
      { t: '편지를 받아 숙소에서 읽는다', f: s => `${d.fan}의 편지를 숙소에서 몇 번이고 읽었다.` + fx(s, { stress: -4 }) },
      { t: '정해진 시간만큼 이야기한다', f: () => '정해진 시간만큼 웃으며 이야기하고 다음 팬을 맞았다.' },
    ];
  },
});
// ⑯ 재계약 줄다리기: 계약 끝나기 반년 전. 여기서 정한 태도가 계약 만료 창(music.js idol_contract)의 조건에 들어간다
E({
  id: 'idol_renego', cat: '그룹', title: '재계약 이야기', tag: 'career', bg: 'meeting',
  cond: s => idOn(s) && !idT(s).rn,
  init(s, d) { const t = idT(s), b = agBoss(s, t.ag); meetAt(s, b, `${t.agN} 대표`, 'idol'); d.b = b.id; d.bonus = Math.round(Math.min(2e8, 1000e4 * t.tier + groupFans(t.g) * 40) / 1e6) * 1e6; },
  text: (s, d) => { const t = idT(s), b = s.people[d.b]; return `계약 끝까지 반년. 대표 ${josa(b.name, '이가')} 멤버들을 하나씩 불러 재계약 이야기를 꺼냈다.\n\n그룹 팬 ${fmtFans(groupFans(t.g))} · 지금 회사 몫 ${pctN(t.cut)}`; },
  ch: (s, d) => {
    const t = idT(s), b = s.people[d.b], pl = U.clamp(U.sig((Math.log10(1 + groupFans(t.g)) - 5.2) * 2), 0.1, 0.8);
    return [
      { t: '일찍 도장을 찍는다', h: `계약금 ${fmtWon(d.bonus)} · 멤버들이 같이 남기 쉬워진다 · 회사 몫은 조금만 내려간다`, f: s => { t.rn = 'early'; bond(s, b, 6); earn(s, d.bonus, '재계약 계약금', 'idol'); return `가장 먼저 재계약서에 도장을 찍었다. 계약금 ${fmtWon(d.bonus)}.`; } },
      { t: '조건을 끝까지 따져 본다', h: '계약 만료 때 회사 몫이 더 내려간다', f: s => { t.rn = 'hold'; return '"조건을 더 보고 정하겠습니다." 대표가 고개를 끄덕였다.'; } },
      { t: '다른 회사 이야기를 슬쩍 흘린다', h: `통할 가능성 ${fmtPct(pl)} · 통하면 회사 몫이 크게 내려가고, 안 통하면 대표와 틀어진다`, f: s => { if (U.chance(pl)) { t.rn = 'leak'; return '대표의 눈빛이 달라졌다. "조건은 맞춰 볼게."'; } t.rn = 'bad'; bond(s, b, -10); return '"그럼 거기로 가." 대표가 차갑게 말했다.' + fx(s, { stress: 6 }); } },
    ];
  },
});
// 재계약 태도 → 계약 만료 창: 전원이 남을 가능성 · 회사 몫이 내려가는 만큼
const IDOL_RN = { early: { p: 0.06, cut: 0.1 }, hold: { p: 0, cut: 0.2 }, leak: { p: -0.05, cut: 0.25 }, bad: { p: -0.15, cut: 0.1 } };
function idolRnOf(t) { return IDOL_RN[t.rn] || { p: 0, cut: 0.15 }; }

// ═════════ 일하는 방식에서 이어지는 사건 ═════════
E({
  id: 'idol_act_offer', cat: '스케줄', title: '웹드라마 제안', tag: 'career',
  cond: s => idOn(s),
  init(s, d) { d.title = songTitle(); d.role = U.pick([me(s).g === '남' ? '서브 남자 주인공' : '서브 여자 주인공', '주인공의 친구', '전학생', '카페 아르바이트생']); d.ep = U.int(8, 12); },
  text: (s, d) => `웹드라마 「${d.title}」 제작사에서 ${d.role} 역할로 나와 달라는 제안이 왔다. ${d.ep}부작, 촬영은 두 달. 회사가 해 볼지 물었다.\n\n연기 ${lvi(me(s), 'acting')}레벨.`,
  ch: (s, d) => [
    { t: '출연한다', h: '출연료 · 연기 ↑ · 내 팬 ↑ · 스트레스 ↑', f: s => {
      const p = me(s), t = idT(s), g = t.g, gm = idMain(t), sc = Math.round(U.clamp(lv(p, 'acting') * 0.75 + p.tal.looks * 0.15 + p.tal.express * 0.1 + U.normal(0, 7), 10, 95));
      practice(s, p, 'acting', 3);
      const pay = memberIncome(s, t, (800e4 + groupFans(g) * 5) * awMul(s, 'idol'), '드라마 출연료', 1);
      const f = Math.round((300 + groupFans(g) * 0.004) * U.clamp(sc / 55, 0.3, 1.8) * popSpeed(s) * myRoom(s, gm));
      addWork(s, { type: '웹드라마', title: d.title, by: d.role, sc, pay, note: sc >= 65 ? '연기 호평' : sc < 40 ? '연기 혹평' : '' });
      return `웹드라마 「${d.title}」에 ${d.role} 역으로 출연했다. ${sc >= 65 ? '"생각보다 연기를 잘한다"는 반응이 많았다.' : sc < 40 ? '"연기는 아직..."이라는 댓글이 달렸다.' : '무난하게 촬영을 마쳤다.'}` + fx(s, { ['f' + gm]: f, stress: 6, fame: sc >= 65 ? 2 : 1 });
    } },
    { t: '그룹 활동에 집중한다', f: () => '웹드라마 제안을 정중히 거절했다.' },
  ],
});
E({
  id: 'idol_slip', cat: '화제', title: '라이브 방송 말실수', tag: 'career',
  cond: s => idOn(s),
  init(s, d) { d.k = U.pick(['회사가 아직 발표하지 않은 컴백 날짜를 말해 버렸다', '피곤하다며 스케줄 불평을 늘어놓았다', '연애 질문에 어설프게 둘러댔다', '다른 그룹 노래를 따라 부르다 가사를 우스꽝스럽게 바꿨다']); },
  text: (s, d) => `늦은 밤 팬들과 라이브 방송을 하다가 ${d.k}. 방송을 끄고 나서야 아차 싶었다.\n\n벌써 캡처가 돌기 시작했다.`,
  ch: (s, d) => {
    const t = idT(s), gm = idMain(t), loss = r => -Math.round(s.fans[gm] * r), pv = U.clamp(0.3 + (has(me(s), 'variety') ? lv(me(s), 'variety') : 0) / 100 + (me(s).tal.humor - 50) / 150, 0.15, 0.85);
    return [
      { t: '바로 사과 글을 올린다', f: s => '사과 글을 올렸다. 금방 잠잠해졌다.' + fx(s, { ['f' + gm]: loss(0.005), rep: -1, stress: 4 }) },
      { t: '다음 방송에서 웃으며 해명한다', h: `잘 넘어갈 가능성 ${fmtPct(pv)} · 예능감 · 유머`, f: s => U.chance(pv) ? '다음 방송에서 능청스럽게 넘겼다. 오히려 "귀엽다"는 반응이 많았다.' + fx(s, { ['f' + gm]: Math.round(s.fans[gm] * 0.004), stress: 1 }) : '해명이 더 어색했다. 일이 조금 커졌다.' + fx(s, { ['f' + gm]: loss(0.015), rep: -2, stress: 6 }) },
      { t: '아무 말 하지 않는다', h: '묻힐 수도, 커질 수도 있다', f: s => U.chance(0.55) ? '며칠 지나자 다들 잊었다.' : '말이 말을 낳았다. 와글에 긴 글까지 올라왔다.' + fx(s, { ['f' + gm]: loss(0.03), rep: -3, stress: 7 }) },
    ];
  },
});

// ═════════ 이어지는 사건 ㄴ: 자작곡의 길 (내 곡 내기) ═════════
// 심사 탈락 → 수록곡 → 타이틀곡 → 두 번째 타이틀이면 회사가 공동 프로듀서를 맡긴다 (music.js idolAlbMonth: 곡이 정해진 달에 부른다)
function idolMyArc(s, t, a) {
  const my = a && a.mk && a.mk.my; if (!my) return;
  const st = t.myStep || 0, r = my.r;
  if (r === '타이틀곡') t.myTi = (t.myTi || 0) + 1;
  let id = null;
  if ((r === '심사에서 떨어짐' || r === '다섯 곡에 들었지만 빠짐') && st === 0) { id = 'idol_my_cut'; t.myStep = 1; }
  else if (r === '수록곡으로 실림' && st < 2) { id = 'idol_my_side'; t.myStep = 2; }
  else if (r === '타이틀곡' && st < 3) { id = 'idol_my_title'; t.myStep = 3; }
  else if (r === '타이틀곡' && st === 3 && t.myTi >= 2) { id = 'idol_my_prod'; t.myStep = 4; }
  if (id) queueEv(s, id, 0, { t: my.t, r }, true);
}
E({
  id: 'idol_my_cut', cat: '자작곡', title: '내 곡의 심사 결과', tag: 'career', bg: 'meeting',
  cond: s => idOn(s),
  init(s, d) { const x = agAnr(s, idT(s).ag); d.a = x ? x.id : null; if (x) meetAt(s, x, `${idT(s).agN} A&R`, 'idol'); },
  text: (s, d) => { const x = d.a && s.people[d.a]; return `내가 낸 ${josa(`「${d.t}」`, '이가')} ${d.r === '심사에서 떨어짐' ? 'A&R 심사에서 떨어졌다' : '다섯 곡까지 올라갔다가 마지막에 빠졌다'}.${x ? `\n\nA&R 팀장 ${x.name}: "멜로디는 좋은데 후렴이 약해. 다음엔 더 세게 와 봐."` : ''}`; },
  ch: (s, d) => {
    const t = idT(s), x = d.a && s.people[d.a];
    return (x ? [{ t: 'A&R 팀장에게 자세히 묻는다', h: '다음에 내는 곡이 나아진다', f: s => { t.myB = Math.min(6, (t.myB || 0) + 4); bond(s, x, 5); if (has(me(s), 'compose')) practice(s, me(s), 'compose', 1); return `${x.name} 팀장에게 어디가 약했는지 한 시간 넘게 들었다. 수첩이 빼곡해졌다.`; } }] : [])
      .concat([
        { t: '멤버들에게 들려준다', h: '멤버들과 가까워진다 · 스트레스 ↓', f: s => { for (const m of idMem(s, t)) bond(s, m, 3); twAdd(t.g, 1); return '숙소에서 멤버들에게 들려줬다. "이거 왜 떨어졌어?" 다들 내 편을 들었다.' + fx(s, { stress: -3 }); } },
        { t: '한동안 곡 내기를 쉰다', f: s => { t.subSong = false; return '한동안 데모곡을 내지 않기로 했다.'; } },
      ]);
  },
});
E({
  id: 'idol_my_side', cat: '자작곡', title: '첫 수록곡', tag: 'career', bg: 'meeting',
  cond: s => idOn(s),
  text: (s, d) => `내가 쓴 ${josa(`「${d.t}」`, '이가')} 이번 앨범 수록곡으로 실린다! 앨범 크레디트 작곡란에 처음으로 내 이름이 올라간다.\n\n멤버들이 녹음실에서 "작곡가님"이라고 놀린다.`,
  ch: (s, d) => {
    const t = idT(s), n = t.g.members.length + 1, eat = 10e4 * n;
    return [
      { t: '멤버들에게 한턱낸다', h: fmtWon(eat), f: s => { for (const m of idMem(s, t)) bond(s, m, 3); addMoney(s, -Math.min(Math.max(0, s.money), eat), '멤버들에게 한턱'); milestone(s, `${age(s)}세에 내가 쓴 ${josa(`「${d.t}」`, '이가')} 처음으로 앨범에 실렸다.`); return '멤버들에게 고기를 샀다. 다들 "다음엔 타이틀"이라며 잔을 부딪쳤다.' + fx(s, { stress: -4 }); } },
      { t: '다음엔 타이틀을 노린다', h: '작곡 ↑', f: s => { if (has(me(s), 'compose')) practice(s, me(s), 'compose', 2); t.myB = Math.min(6, (t.myB || 0) + 2); milestone(s, `${age(s)}세에 내가 쓴 ${josa(`「${d.t}」`, '이가')} 처음으로 앨범에 실렸다.`); return '기뻐할 새도 없이 다음 곡 작업에 들어갔다.' + fx(s, { stress: 2 }); } },
    ];
  },
});
E({
  id: 'idol_my_title', cat: '자작곡', title: '내 곡이 타이틀곡', tag: 'career', bg: 'meeting', keepPop: true,
  cond: s => idOn(s),
  text: (s, d) => `내가 쓴 ${josa(`「${d.t}」`, '이가')} 이번 앨범 타이틀곡이 됐다. 회의실에서 그 말을 듣는 순간 손이 떨렸다.\n\n이제 「${idT(s).g.name}」 무대에서 내 곡이 울린다.`,
  ch: (s, d) => [{ t: '확인', f: s => { milestone(s, `${age(s)}세에 내가 쓴 ${josa(`「${d.t}」`, '이가')} 「${idT(s).g.name}」 타이틀곡이 됐다.`); return `내가 쓴 ${josa(`「${d.t}」`, '이가')} 타이틀곡이 됐다.` + fx(s, { stress: -5, rep: 1 }); } }],
});
E({
  id: 'idol_my_prod', cat: '자작곡', title: '공동 프로듀서 제안', tag: 'career', bg: 'meeting', keepPop: true,
  cond: s => idOn(s),
  text: (s, d) => `내 곡이 두 번째로 타이틀곡이 되자 회사가 제안을 해 왔다. 다음 앨범부터 공동 프로듀서로 이름을 올려 보자고 한다.\n\n내가 쓴 곡은 심사를 거치지 않고 후보에 오르고, 곡을 고를 때도 내 의견이 크게 들어간다.`,
  ch: (s, d) => {
    const t = idT(s);
    return [
      { t: '맡아 본다', h: '내 곡이 늘 후보에 오른다 · 스트레스 ↑', f: s => { t.selfProd = true; t.subSong = true; milestone(s, `${age(s)}세에 「${t.g.name}」 공동 프로듀서가 됐다.`); return `「${t.g.name}」 앨범에 공동 프로듀서로 참여하게 됐다.` + fx(s, { stress: 4, rep: 2 }); } },
      { t: '아직은 이르다고 한다', f: () => '아직은 곡을 쓰는 데 집중하고 싶다고 했다.' },
    ];
  },
});
