'use strict';
// 인생 사건: 어린 시절, 학창 시절, 성인, 건강, 연애, 인생의 끝
// 특기는 여기 선택지에서만 처음 배운다 (learnMe). ch()는 다시 그릴 때마다 불리므로 무작위 값은 init()에서 정한다.

function pct(p) { return fmtPct(p); }
function friends(s) { return people(s, n => n.rel === '친구'); }
function skN(k) { return SKILLS[k].n; }
// 선택지 설명: 특기를 얻는지는 알려 주지 않는다 (해 보고 알게 된다)
function gainH(s, k, more) { return more || ''; }
// ── 학창 시절 무대·대회·진학 ──
// 또래 기준: 그 나이에 한 분야를 꾸준히 해 온 아이의 보통 레벨 (10세 7, 13세 13, 15세 18, 18세 24쯤)
function peerLv(s) { return U.clamp((age(s) - 7) * 2.2, 2, 32); }
// 무대·시험에서 보여 주는 실력: 특기 레벨에 재능을 조금 얹는다. 안 배운 건 재능만으로 짐작한다
// 고교 · 대학 합격 때 오르는 특기: 그 과에서 보는 특기 중 가진 것 가운데 가장 잘하는 것 (합격에 쓴 특기). 하나도 없으면 fb (v116 버그 9: 드럼으로 붙어도 보컬 · 작곡이 올랐다)
function admitSkill(s, b, fb) { return b.filter(k => has(me(s), k)).sort((x, y) => stageLv(s, y) - stageLv(s, x))[0] || fb; }
function stageLv(s, k) { const p = me(s); return (has(p, k) ? lv(p, k) : 0) + (talFactor(p, k) - 50) / 10; }
// 또래 기준만큼 하면 65% 안팎, 5레벨 차이마다 크게 달라진다. off가 클수록 어려운 곳
function schoolP(s, lvl, off = 0, lo = 0.05) { return U.clamp(U.sig((lvl - peerLv(s) - off + 3) / 5), lo, 0.95); }

// v220: 중 · 고등학생이 일정 칸을 전부 연습 · 일로 채우면(놀기 · 쉬기 칸이 하나도 없으면) 학교에서 생기는 일(좋아하는 사람 · 축제)이 드물어진다
function kidBusy(s) { return age(s) < 19 && schoolYear(s) >= 7 && !s.edu.graduated && s.slots.length > 0 && !s.slots.some(sl => ['play', 'rest', 'sick', 'taegyo'].includes(sl.act)); }
function kidFreeM(s) { return kidBusy(s) ? 0.3 : 1; }
// ── 연애 공통 ──
// 미성년자와 성인 사이의 고백은 받아 주지 않는다 (가능성 0%)
function kidToAdult(s, n) { return age(s) < 19 && pAge(s, n) >= 19; }
// 성인인 내가 미성년자에게 고백할 수는 있지만, 나중에 알려지면 '미성년자 교제 논란'이 터질 수 있다 (minor_out)
function adultToKid(s, n) { return age(s) >= 19 && pAge(s, n) < 19; }
function confessP(s, n) { if (!likes(n, myGender(s)) || kidToAdult(s, n) || adultToKid(s, n)) return 0; return U.clamp(U.sig((n.aff - 62) / 8) * (0.7 + me(s).tal.looks / 150) * (0.85 + s.rep / 400), 0.02, 0.95); }
// 고백 버튼에 붙는 말: 나를 연애 상대로 보지 않는 사람이면 확률 대신 그렇게 보인다고만 쓴다
// v219: 무대 · 방송에 얼굴을 내미는 일을 하거나 연습생이면 고백 버튼에 위험을 알린다
function loveRiskH(s) { return (typeof showbizOn === 'function' && showbizOn(s)) || (s.tracks.idol && s.tracks.idol.st === 'trainee') ? ' · ⚠ 사귀다 알려지면 열애설이 날 수 있다' : ''; }
function confessWord(s, n, long) { return (kidToAdult(s, n) || adultToKid(s, n) ? `${long ? '받아 줄 ' : ''}가능성 0%` : likes(n, myGender(s)) ? `${long ? '받아 줄 ' : ''}가능성 ${fmtPct(confessP(s, n))}` : '나를 연애 상대로 보지 않는 것 같다') + (long && confessP(s, n) > 0 ? loveRiskH(s) : ''); }
function confess(s, n) {
  if (U.chance(confessP(s, n))) {
    n.rel = '연인'; n.dateT = s.t; s.partner = n.id; aff(n, 10);
    milestone(s, `${age(s)}세에 ${josa(n.name, '과와')} 사귀기 시작했다.`);
    return `${n.name}에게 고백했다. ${josa(n.name, '이가')} 같은 마음이었다!` + fx(s, { stress: -10 });
  }
  if (kidToAdult(s, n)) { aff(n, -5); return `${n.name}에게 고백했지만, ${josa(n.name, '은는')} 아직 어린 나를 그런 쪽으로 볼 수 없다고 했다.`; }
  if (adultToKid(s, n)) {
    aff(n, -30);
    // 거절당해도 언젠가 알려질 수 있다
    if (U.chance(0.6)) queueEv(s, 'minor_out', U.int(2, 36), { id: n.id, name: n.name }, true);
    return `${n.name}에게 고백했지만, ${josa(n.name, '은는')} 겁먹은 얼굴로 자리를 피했다.`;
  }
  aff(n, -25);
  if (!likes(n, myGender(s))) return `${n.name}에게 고백했지만, ${josa(n.name, '은는')} 나를 그런 쪽으로 볼 수 없다고 했다. 사이가 어색해졌다.`;
  return `${n.name}에게 고백했지만 거절당했다. 사이가 어색해졌다.`;
}
function breakUp(s, n, why) { n.rel = '전 연인'; aff(n, -20); s.partner = null; return why || `${josa(n.name, '과와')} 헤어졌다.`; }

// ── 결혼: 재산을 합친다 ──
// 배우자 수입(만 원). 매달 월급의 절반이 집으로 들어온다. 업계 사람은 이름값에 따라
// 월급은 세금을 뗀 실수령 (피드백 24: 예전 값은 회사원 130만 원처럼 너무 낮았다). 절반을 집에 보탠다
const SP_PAY = { '회사원': 320, '개발자': 450, '간호사': 340, '교사': 320, '공무원': 300, '은행원': 420, '디자이너': 280, '프리랜서 디자이너': 250, '카페 사장': 260, '대학원생': 80, '공무원 준비생': 0, '학생': 0, '전업주부': 0, '스트리머': 200 };
function spouseIncome(p) { let v = SP_PAY[p.job]; if (v == null) v = p.ind ? Math.round(250 + Math.log10(1 + (p.fame || 0)) * 60) : 300; return v * 1e4; }
function spousePay(s, p) { return Math.round(spouseIncome(p) * 0.5 / 1e4) * 1e4; }
// 결혼할 때 배우자가 모아 둔 돈
function spouseSavings(s, p) { return Math.round(spouseIncome(p) * 12 * U.clamp(pAge(s, p) - 24, 0, 15) * U.fl(0.15, 0.35) / 1e5) * 1e5; }
function isSpouse(p) { return !!p && p.rel === '배우자'; }
// 이혼: 가진 돈의 절반을 나눠 준다
function divorce(s, p, why) {
  const half = Math.round(Math.max(0, s.money) / 2 / 1e4) * 1e4;
  if (half > 0) addMoney(s, -half, '이혼 재산 분할');
  p.rel = '전 배우자'; aff(p, -30); s.partner = null; s.affair = null;
  milestone(s, `${age(s)}세에 ${josa(p.name, '과와')} 이혼했다.`);
  return (why || `${josa(p.name, '과와')} 이혼했다.`) + (half > 0 ? ` 재산을 나눠 ${fmtWon(half)}을 넘겨줬다.` : '');
}

// ── 부모님이 특기를 권하는 사건에서 고를 후보 ──
const KID_SKILLS = { vocal: 4, dance: 4, piano: 4, guitar: 7, drum: 8, keyboard: 7, bass: 10, rap: 10, art: 4, en: 5, jp: 8, study: 6, acting: 7, game: 6, variety: 8, lyric: 9, script: 10, edit: 9, direct: 10 };
// 돌잡이 물건: [이름, id, 이어지는 특기, 덧붙이는 말]. 아이가 고르지 않고, 타고난 재능에 가장 맞는 물건을 잡는다
const DOL_ITEMS = [
  ['마이크', 'mic', 'vocal', '다들 가수가 되겠다며 웃었다.'],
  ['연필', 'pencil', 'study', '친척분들이 공부 잘하겠네 하고 웃으셨다.'],
  ['마우스', 'mouse', 'game', '꼭 붙잡고 놓지 않았다.'],
  ['크레파스', 'brush', 'art', '상 위에 낙서까지 했다.'],
  ['토슈즈', 'shoes', 'dance', '발을 동동 구르며 좋아했다.'],
  ['대본', 'script', 'acting', '대본을 펼쳐 들고 옹알옹알 읽는 시늉을 했다.'],
  ['장난감 피아노', 'piano', 'piano', '건반을 두드리며 깔깔 웃었다.'],
  ['장난감 기타', 'guitar', 'guitar', '줄을 튕기며 신기해했다.'],
  ['영어 그림책', 'abc', 'en', '책장을 넘기며 한참을 들여다봤다.'],
];
// 예전 세이브의 리본(댄스)·거울(연기)도 남겨 둔다
const DOL_SKILL = Object.assign({ ribbon: 'dance', mirror: 'acting' }, Object.fromEntries(DOL_ITEMS.map(x => [x[1], x[2]])));
function parentOffer(s) {
  const p = me(s), a = age(s), dol = DOL_SKILL[s.flags.dol];
  const cands = [];
  for (const k in KID_SKILLS) {
    if (a < KID_SKILLS[k] || has(p, k)) continue;
    const teacher = parentsAlive(s).find(x => has(x, k) && lv(x, k) >= 25);
    let w = fitWeight(p, k, 4) * (dol === k ? 2.5 : 1) * (teacher ? 2 : 1);
    cands.push({ k, w, teacher });
  }
  if (!cands.length) return null;
  const c = U.wpick(cands, x => x.w);
  const who = c.teacher || U.pick(parentsAlive(s));
  const mode = c.teacher ? 'home' : s.wealth >= 4 ? 'academy' : 'free';
  return { k: c.k, who: who.id, mode };
}

// ════════ 어린 시절 ════════
E({
  id: 'dol', fixed: true, once: true, cat: '첫 돌', title: '돌잡이',
  cond: s => s.t >= 12 && s.t < 16,
  // 재능에 가장 맞는 물건을 잡는다 (가장 맞는 것이 둘 이상이면 그중 하나)
  init(s, d) { const p = me(s), sc = DOL_ITEMS.map(x => talFactor(p, x[2]) + U.fl(0, 1)); d.i = sc.indexOf(Math.max(...sc)); },
  text: (s, d) => { const it = DOL_ITEMS[d.i]; return `첫 돌잔치. 상 위에 여러 물건이 놓였다.\n\n돌잡이에서 ${josa(it[0], '을를')} 잡았다! ${it[3]}`; },
  ch: (s, d) => [{ t: '확인', f: s => { const it = DOL_ITEMS[d.i]; s.flags.dol = it[1]; return `돌잡이에서 ${josa(it[0], '을를')} 잡았다. ${it[3]}`; } }],
});
E({
  id: 'sibling', once: true, p: 0.03, cat: '가족', title: '동생이 생겼다',
  cond: s => age(s) >= 2 && age(s) <= 6 && !s.family.single,
  init(s, d) { d.g = U.chance(0.5) ? '여' : '남'; },
  text: (s, d) => `${d.g === '여' ? '여동생' : '남동생'}이 태어났다.`,
  ch: () => [
    { t: '확인', f: (s, d) => { s.youngerSib++; (s.sibG = s.sibG || []).push(d.g); makeSib(s, 0, d.g); return `${d.g === '여' ? '여동생' : '남동생'}이 태어났다.`; } },
  ],
});
// 부모님이 특기를 권한다 (첫 판에서 특기를 처음 배우는 주된 길)
E({
  id: 'par_offer', cd: 10, cat: '가족', title: (s, d) => `${skN(d.k)} 한번 배워 볼래?`,
  p: s => { const a = age(s); return a >= 4 && a <= 12 && parentsAlive(s).length && (s.done.par_offer || 0) < 2 ? 0.025 : 0; },
  init(s, d) { const o = parentOffer(s); if (!o || !skAsk(s, o.k)) { d.skip = true; return; } Object.assign(d, o); },
  text(s, d) {
    const who = s.people[d.who], wn = who.rel, k = d.k;
    if (d.mode === 'home') return `${josa(wn, '이가')} 퇴근하고 나서 ${josa(skN(k), '을를')} 가르쳐 주겠다고 하신다. ${wn}는 ${skN(k)} 실력이 꽤 좋으시다.`;
    if (d.mode === 'academy') return `${josa(wn, '이가')} "${SKILLS[k].les ? SKILLS[k].les.n : skN(k) + ' 학원'}에 다녀 볼래?" 하고 물으신다. 학원비는 집에서 내 주신다고 한다.`;
    return `${josa(wn, '이가')} 주민센터에서 하는 무료 ${skN(k)} 강좌를 알아 오셨다. 한번 다녀 보겠냐고 하신다.`;
  },
  ch: (s, d) => [
    { t: '해 볼래요!', f: s => { const tag = learnMe(s, d.k); if (d.mode === 'home') practice(s, me(s), d.k, 1.5); return `${josa(skN(d.k), '을를')} 배우기 시작했다.${tag}`; } },
    { t: '싫어요, 안 할래요', f: s => { skDecline(s, d.k); return '고개를 저었다. 그냥 노는 게 더 좋다.'; } },
  ],
});
E({
  id: 'kinder_show', once: true, p: 0.03, cat: '어린 시절', title: '유치원 학예회',
  cond: s => age(s) >= 5 && age(s) <= 6,
  text: () => '유치원 학예회에서 연극을 한다. 선생님이 하고 싶은 역할을 물어보셨다.',
  // v101: 특기를 안 받는 '나무 역할'도 고를 수 있다
  ch: s => [
    { t: '주인공 하겠다고 손을 든다', h: gainH(s, 'acting'), f: s => '주인공을 맡아 대사를 다 외웠다. 엄마가 영상을 백 번은 돌려 보셨다.' + learnMe(s, 'acting') },
    { t: '노래 부르는 역할', h: gainH(s, 'vocal'), f: s => '학예회에서 노래를 불렀다.' + learnMe(s, 'vocal') },
    { t: '춤추는 역할', h: gainH(s, 'dance'), f: s => '학예회에서 춤을 췄다.' + learnMe(s, 'dance') },
    { t: '나무 역할을 한다', f: () => '무대 한쪽에서 나무 역할을 했다. 가만히 서 있는 것도 쉽지 않았다.' },
  ],
});
E({
  id: 'child_model', once: true, cat: '캐스팅', title: '아역 모델 제안',
  // 길거리 캐스팅은 광역시 이상에서만 일어난다 (v151)
  cast: true,
  p: s => me(s).tal.looks >= 62 ? 0.006 : 0,
  cond: s => age(s) >= 3 && age(s) <= 9,
  text: () => '엄마와 마트에 갔다가 아동복 브랜드 관계자에게 명함을 받았다. 아역 모델을 해 보지 않겠냐고 한다.',
  ch: s => [
    { t: '해 본다', h: '촬영비 150만 원', f: s => { s.flags.childModel = true; earn(s, 150e4, '아역 모델'); milestone(s, `${age(s)}세에 아동복 모델을 했다.`); return '아동복 카탈로그 모델을 했다. 촬영비 150만 원을 받았다.' + fx(s, { fkr: 300 }); } },
    { t: '아직 어리니까 안 한다', f: () => '아직 어리다며 거절했다.' },
  ],
});
E({
  id: 'kid_fight', once: true, p: 0.03, cat: '어린 시절', title: '친구와 싸웠다',
  cond: s => age(s) >= 5 && age(s) <= 8,
  text: () => '블록 쌓기를 하다가 친구와 크게 싸웠다. 친구가 울고 있다.',
  ch: () => [
    { t: '먼저 사과한다', f: s => '먼저 사과했다. 다음 날 둘은 다시 같이 놀았다.' + fx(s, { rep: 2 }) },
    { t: '선생님께 이른다', f: s => '선생님께 일렀다. 둘 다 혼났다.' + fx(s, { stress: 2 }) },
    { t: '같이 엉엉 운다', f: s => '둘이 같이 엉엉 울었다. 실컷 울고 나니 속이 시원했다.' + fx(s, { stress: -3 }) },
  ],
});

// ════════ 초등학교 ════════
E({
  id: 'can_schedule', fixed: true, once: true, cat: '알림', title: '이제 일정을 정할 수 있어요', keepPop: true,
  cond: s => schoolYear(s) >= 1,
  text: () => '초등학교에 들어갈 때가 되었다. 오늘부터 매달 할 일을 직접 정할 수 있다.\n\n"📅 이번 달 일정"에서 칸을 누르면 할 일을 고를 수 있다. 배운 특기는 거기서 연습하거나 학원에 다닐 수 있다. 아직 아무것도 안 배웠다면 친구와 놀거나 쉬어도 된다.',
  // 입학식은 이 창을 닫자마자 같은 달에 이어서 (v117 학사 일정: 둘 다 초1 3월)
  ch: () => [{ t: '알겠어요', f: s => { queueEv(s, 'school_start', 0); return ''; } }],
});
// 일정 칸이 늘면(13세 · 19세 · 전용 밴) 알림 창으로 알려 준다 (v89). 일곱 살에 처음 생길 때는 위의 창이 알려 준다. 특별한 일에는 남기지 않는다
E({
  id: 'slot_up', cat: '알림', title: '일정 칸이 늘었어요', keepPop: true,
  text: (s, d) => `${d.van ? '전용 밴과 운전기사 덕분에 이동 시간이 줄었다.' : age(s) >= 19 ? '성인이 되었다. 하루를 온전히 내 뜻대로 쓸 수 있다.' : '중학생이 되었다. 혼자 할 수 있는 일이 늘었다.'}\n\n이제 매달 할 일을 ${d.b}칸 정할 수 있다 (${d.a}칸 → ${d.b}칸). "📅 이번 달 일정"에서 새 칸을 눌러 할 일을 고르면 된다.`,
  ch: () => [{ t: '알겠어요', f: () => '' }],
});
E({
  id: 'school_start', fixed: true, once: true, cat: '초등학교', title: '입학식',
  cond: s => schoolYear(s) >= 1 && s.done.can_schedule,
  text: () => '초등학교 입학식 날. 새 책가방이 아직 조금 크다.',
  // 고르는 것과 상관없이 결과가 같아서 알림으로만 보여 준다
  ch: s => [
    { t: '교실로 들어간다', f: s => '초등학교에 입학했다.' + learnMe(s, 'study') + fx(s, { stress: -2 }) },
  ],
});
E({
  id: 'best_friend', fixed: true, once: true, cat: '초등학교', title: '첫 짝꿍',
  cond: s => schoolYear(s) === 1 && calM(s) >= 3,
  init(s, d) { const g0 = myGender(s); d.c = [0, 1].map(() => { const g = U.chance(0.6) ? g0 : (g0 === '여' ? '남' : '여'); return { g, name: genName(g), trait: U.pick(TRAITS).id, look: U.pick(g === '여' ? LOOKS_F : LOOKS_M) }; }); },
  text: (s, d) => '초등학교에서 새 친구들을 만났다. 누구랑 친해질까?\n\n' + d.c.map(c => `· ${c.name} (${c.g === '여' ? '여자아이' : '남자아이'}) — ${TRAIT_BY[c.trait].n}`).join('\n'),
  ch: (s, d) => d.c.map(c => ({ t: c.name, f: s => { makePerson(s, { g: c.g, name: c.name, trait: c.trait, look: c.look, age: age(s), rel: '친구', aff: 55, met: '초등학교 단짝' }); return `${josa(c.name, '과와')} 단짝 친구가 되었다.`; } })),
});
E({
  id: 'after_school', once: true, p: 0.075, cat: '초등학교', title: '방과후 교실',
  cond: s => schoolYear(s) >= 1 && schoolYear(s) <= 3 && s.done.school_start,
  text: s => `학교에서 방과후 교실 신청서를 나눠 줬다. 하나는 무료로 들을 수 있다.${s.wealth <= 3 ? ' 학원 보낼 형편은 안 되니, 엄마가 이거라도 꼭 들으라고 하셨다.' : ''}`,
  init(s, d) { d.o = fitPick(s, [['방과후 합창반', 'vocal'], ['방과후 미술', 'art'], ['방과후 방송댄스', 'dance'], ['방과후 컴퓨터', 'game'], ['방과후 영어', 'en'], ['방과후 피아노', 'piano'], ['방과후 연극놀이', 'acting'], ['방과후 스피치', 'variety']].filter(x => skOpen(s, x[1]) && !has(me(s), x[1])), 3); },
  ch: (s, d) => d.o.map(([t, k]) => ({ t, h: gainH(s, k), f: s => `${josa(t, '을를')} 들었다.` + learnMe(s, k) })).concat([{ t: '아무것도 신청하지 않는다', f: () => '방과후 교실은 신청하지 않았다. 친구들과 운동장에서 놀았다.' }]),
});
E({
  id: 'english_class', fixed: true, once: true, cat: '초등학교', title: '영어 시간',
  cond: s => schoolYear(s) >= 3 && s.done.school_start,
  text: () => '3학년이 되니 영어 수업이 시작됐다.',
  ch: s => [
    { t: '수업을 듣는다', f: s => '영어 수업을 듣기 시작했다.' + learnMe(s, 'en') },
  ],
});
// 중학교에 들어가면 제2외국어로 일본어를 배운다 (이미 할 줄 알면 넘어간다)
E({
  id: 'jp_class', fixed: true, once: true, cat: '중학교', title: '일본어 시간',
  cond: s => schoolYear(s) >= 7 && schoolYear(s) <= 9 && s.done.school_start && !has(me(s), 'jp'),
  text: () => '중학교에 올라오니 제2외국어로 일본어 수업이 생겼다.',
  // v123: 일본어는 특기 수에 안 세니 고르지 않고 그냥 배운다 (v101의 '시간만 채운다'를 없앰)
  ch: s => [{ t: '수업을 듣는다', f: s => '일본어 수업을 듣기 시작했다.' + learnMe(s, 'jp') }],
});
E({
  id: 'gift', once: true, p: 0.0175, cat: '어린 시절', title: '생일 선물',
  cond: s => age(s) >= 8 && age(s) <= 13,
  init(s, d) {
    const all = [['게임기', 'game', 1], ['통기타', 'guitar', 3], ['전자 키보드', 'keyboard', 4], ['스케치북과 색연필 세트', 'art', 1], ['노래방 마이크', 'vocal', 1], ['연습용 드럼 패드', 'drum', 4], ['동화책 쓰기 노트', 'script', 1]];
    d.o = fitPick(s, all.filter(x => s.wealth >= x[2] && skOpen(s, x[1])), 3);
  },
  text: () => '이번 생일 선물로 하나를 고를 수 있다.',
  ch: (s, d) => d.o.map(([n, k]) => ({ t: n, h: gainH(s, k), f: s => `생일 선물로 ${josa(n, '을를')} 받았다.` + learnMe(s, k) + fx(s, { sk: { [k]: 0.5 } }) })).concat([{ t: '용돈으로 받는다', h: '10만 원', f: s => { addMoney(s, 10e4, '생일 용돈'); return '생일 선물 대신 용돈을 받았다. 지갑이 두둑하다.'; } }]),
});
E({
  id: 'talent_show', once: true, p: 0.0125, cat: '학교', title: '학예회 준비',
  cond: s => age(s) >= 8 && age(s) <= 12,
  text: () => '이번 학예회에서 우리 반이 무대를 맡았다. 나는 뭘 할까?',
  init(s, d) { d.o = fitPick(s, [['노래를 부른다', 'vocal'], ['연극 주인공을 한다', 'acting'], ['춤을 춘다', 'dance'], ['사회를 본다', 'variety'], ['무대 배경을 그린다', 'art'], ['피아노 반주를 한다', 'piano']].filter(x => skOpen(s, x[1])), 3); },
  ch(s, d) {
    const o = d.o.map(([n, k]) => {
      const p = schoolP(s, stageLv(s, k), 0, 0.15);
      return { t: n, h: gainH(s, k, `잘될 가능성 ${pct(p)}`), f: s => { const tag = learnMe(s, k); return (U.chance(p) ? `학예회에서 박수를 받았다.` + fx(s, { sk: { [k]: 0.8 }, stress: -4 }) : `학예회에서 실수했다. 얼굴이 빨개졌다.`) + tag; } };
    });
    o.push({ t: '무대 뒤에서 돕는다', f: () => '소품을 나르고 조명을 맞추며 무대 뒤를 도왔다.' });
    return o;
  },
});
E({
  id: 'phone', once: true, p: 0.04, cat: '어린 시절', title: '첫 스마트폰',
  cond: s => age(s) >= (s.wealth <= 2 ? 12 : 10) && age(s) <= 14,
  text: () => '첫 스마트폰이 생겼다! 뭘 제일 먼저 할까?',
  init(s, d) { d.o = fitPick(s, [['노래 커버 영상을 찍어 올린다', 'vocal', '노래 커버 영상을 찍어 올렸다. 조회수 37회.'], ['춤 영상을 보며 따라 한다', 'dance', '틈만 나면 춤 영상을 보며 따라 췄다.'], ['영상을 찍어서 직접 편집해 본다', 'edit', '무료 편집 앱으로 브이로그를 만들어 봤다.'], ['웹소설을 직접 써서 올린다', 'script', '밤마다 이불 속에서 웹소설을 썼다.'], ['게임만 한다', 'game', '게임에 빠졌다.'], ['웃긴 영상을 찍어 친구들한테 보낸다', 'variety', '친구들이 내 영상을 보고 배꼽을 잡았다.']].filter(x => skOpen(s, x[1])), 3); },
  ch: (s, d) => d.o.map(([t, k, x]) => ({ t, h: gainH(s, k), f: s => { if (k === 'vocal') s.flags.cover = true; return x + learnMe(s, k); } })).concat([{ t: '친구들과 메신저만 한다', f: () => '하루 종일 친구들과 메신저를 주고받았다.' }]),
});
E({
  id: 'dream', once: true, cat: '초등학교', title: '장래희망 발표',
  cond: s => age(s) >= 9 && age(s) <= 11,
  text: () => '선생님이 장래희망을 발표해 보라고 하셨다.',
  // 직접 적는다. 효과는 없고 기록(인생 기록·걸어온 길)에만 남는다. 비워 두면 '없음'
  form: () => [{ k: 'dream', label: '장래희망', max: 20, ph: '없음' }],
  submit(s, d, v) {
    const n = (v.dream || '').trim() || '없음';
    s.flags.dream = n;
    milestone(s, `${age(s)}세에 장래희망을 ${qn(n, '라고')} 발표했다.`);
    return { log: `장래희망을 ${qn(n, '라고')} 발표했다.` };
  },
});
E({
  id: 'president', once: true, p: 0.03, cat: '초등학교', title: '반장 선거',
  cond: s => age(s) >= 9 && age(s) <= 12,
  text: () => '반장 선거가 열린다. 나가 볼까?',
  ch(s) {
    const p = U.clamp(0.2 + me(s).tal.humor / 150 + me(s).tal.looks / 400, 0.1, 0.85);
    return [
      { t: '나간다', h: `당선 가능성 ${pct(p)}`, f: s => U.chance(p) ? '반장이 됐다!' + fx(s, { rep: 3, stress: -4 }) : '두 표 차이로 떨어졌다.' + fx(s, { stress: 3 * pm(s, 'loseStress') }) },
      { t: '안 나간다', f: () => '반장 선거는 구경만 했다.' },
    ];
  },
});
E({
  id: 'kid_contest', cd: 24, p: 0.015, cat: '대회', title: '대회 참가자 모집',
  cond: s => age(s) >= 8 && age(s) <= 15 && ['vocal', 'dance', 'piano', 'art'].some(k => lv(me(s), k) >= Math.max(3, peerLv(s) * 0.6)),
  init(s, d) { const k = ['vocal', 'dance', 'piano', 'art'].filter(k => has(me(s), k)).sort((a, b) => lv(me(s), b) - lv(me(s), a))[0]; d.k = k; d.show = (age(s) >= 13 ? { vocal: '청소년 가요제', dance: '청소년 댄스 페스티벌', piano: '학생 피아노 콩쿠르', art: '학생 미술 대회' } : { vocal: '전국 어린이 동요대회', dance: '키즈 댄스 페스티벌', piano: '어린이 피아노 콩쿠르', art: '어린이 미술 대회' })[k]; },
  text: (s, d) => `「${d.show}」 참가자를 모집한다.`,
  ch(s, d) {
    // 또래 기준보다 조금 낮아도 상은 받을 수 있다. 대상은 또래 기준보다 8레벨쯤 높아야 반반
    const st = stageLv(s, d.k) - peerLv(s);
    return [
      { t: '나간다', h: `입상 가능성 ${pct(U.clamp(U.sig((st + 2) / 3), 0.03, 0.97))}`, f: s => { const sc = st + U.normal(0, 5); if (sc >= 8) { milestone(s, `${age(s)}세에 「${d.show}」에서 대상을 받았다.`); earn(s, 50e4, '대회 상금'); return `「${d.show}」에서 대상을 받았다!` + fx(s, { fkr: 1000, stress: -8 }); } if (sc >= -2) return `「${d.show}」에서 장려상을 받았다.` + fx(s, { stress: -4 }); return `「${d.show}」 예선에서 떨어졌다.` + fx(s, { stress: 4 * pm(s, 'loseStress') }); } },
      { t: '안 나간다', f: () => `「${d.show}」에는 나가지 않았다.` },
    ];
  },
});
E({
  id: 'bully_witness', once: true, p: 0.02, cat: '학교', title: '괴롭힘을 목격했다',
  cond: s => age(s) >= 9 && age(s) <= 15,
  text: () => '같은 반 아이가 몇몇에게 괴롭힘을 당하는 걸 봤다.',
  ch: () => [
    { t: '그만하라고 나선다', f: s => { s.flags.brave = true; return '그만하라고 나섰다. 무서웠지만 후회하지 않는다.' + fx(s, { rep: 5, stress: 2 }); } },
    { t: '선생님께 알린다', f: s => '선생님께 알렸다.' + fx(s, { rep: 3 }) },
    { t: '모른 척한다', f: s => '모른 척했다. 그날 밤 잠이 잘 안 왔다.' + fx(s, { stress: 4 }) },
    { t: '친구들 따라 같이 놀린다', f: s => { s.flags.bully = true; return '친구들 사이에 끼어 같이 웃고 놀렸다.' + fx(s, { stress: -2 }); } },
  ],
});
E({
  id: 'transfer', once: true, p: 0.004, cat: '가족', title: '이사',
  cond: s => age(s) >= 8 && age(s) <= 15,
  init(s, d) { d.r = U.wpick(REGIONS.filter(r => r.id !== s.region), r => r.w).id; d.place = U.pick(REGION_BY[d.r].places); },
  text: (s, d) => `부모님 일 때문에 ${josa(d.place, '으로')} 이사를 가게 됐다. 전학을 가야 한다.`,
  ch: (s, d) => [{ t: '새 학교에 적응한다', f: s => {
    // 예전 동네 친구들은 멀어진다: 성인이 되기 전에는 그 친구들과 만나는 사건이 없고, 전학 간 학교에서 새 친구를 사귄다
    for (const n of people(s, n => ['친구', '동기', '선배'].includes(n.rel) && pAge(s, n) < 20)) n.far = true;
    queueEv(s, 'new_friend', U.int(1, 3));
    s.region = d.r; s.birthRegion = d.r; s.place = d.place; s.birthPlace = d.place; return `${josa(d.place, '으로')} 이사했다.` + fx(s, { stress: 6 }); } }],
});

// 이사 뒤: 전학 간 학교에서 새 친구를 사귄다 (성인이 되기 전까지는 예전 동네 친구 대신 이 친구들과 어울린다)
E({
  id: 'new_friend', cat: '학교', title: '전학 간 학교',
  cond: s => age(s) < 19,
  init(s, d) { const g0 = myGender(s); d.c = [0, 1].map(() => { const g = U.chance(0.6) ? g0 : (g0 === '여' ? '남' : '여'); return { g, name: genName(g), trait: U.pick(TRAITS).id, look: U.pick(g === '여' ? LOOKS_F : LOOKS_M) }; }); },
  text: (s, d) => `전학 온 지 얼마 안 됐는데, 반 아이들 몇 명이 먼저 말을 걸어 왔다. 누구랑 친해질까?\n\n` + d.c.map(c => `· ${c.name} (${c.g === '여' ? '여자아이' : '남자아이'}) — ${TRAIT_BY[c.trait].n}`).join('\n'),
  ch: (s, d) => d.c.map(c => ({ t: c.name, f: s => { makePerson(s, { g: c.g, name: c.name, trait: c.trait, look: c.look, age: age(s), rel: '친구', aff: 55, met: `${s.place} 전학 간 학교 친구` }); return `전학 간 학교에서 ${josa(c.name, '과와')} 친구가 되었다.`; } })),
});

// ════════ 재능이 이끄는 사건 (재능이 높을수록 자주 일어난다) ════════
function talentEv(id, tal, k, minA, maxA, title, text, yes, x) {
  E({ id, once: true, p: 0.002, tal, cat: '재능', title, cond: s => age(s) >= minA && age(s) <= maxA && !has(me(s), k) && skAsk(s, k) && learnedSkills(me(s)).length < 8,
    text: () => text, ch: () => [{ t: yes, f: s => x + learnMe(s, k) }, { t: '관심 없다', f: s => { skDecline(s, k); return '그냥 넘겼다.'; } }] });
}
talentEv('class_clown', 'humor', 'variety', 8, 16, '분위기 메이커', '반 친구들이 내 말 한마디에 빵빵 터진다. 담임 선생님이 학급 행사 사회를 맡아 보라고 하신다.', '해 본다', '학급 행사 사회를 봤다. 다들 배꼽을 잡았다.');
talentEv('edit_help', 'aesth', 'edit', 12, 25, '편집 좀 해 줄래?', '친구가 찍어 둔 영상을 편집해 달라고 부탁한다. 컷을 어디서 자르면 재밌을지 이상하게 눈에 잘 보인다.', '편집해 준다', '처음 해 보는 편집인데 친구가 최고라며 좋아했다.');
talentEv('scout_eye', 'insight', 'scout', 17, 40, '될성부른 나무', '친구들이 올린 오디션 영상을 보면 누가 붙을지 신기하게 맞힌다. 친구가 연습생 지원 영상 좀 평가해 달라고 한다.', '꼼꼼히 봐 준다', '친구 영상의 좋은 점과 아쉬운 점을 짚어 줬다. 눈썰미가 있다는 말을 들었다.');
talentEv('write_contest', 'verbal', 'script', 10, 22, '글짓기 대회', '학교 글짓기 대회에서 쓴 이야기를 선생님이 따로 불러 칭찬하셨다. 이야기를 더 길게 써 보라고 하신다.', '이야기를 써 본다', '공책 한 권을 이야기로 채웠다.');
talentEv('poem', 'verbal', 'lyric', 12, 30, '노래 가사 같은 글', '일기장에 쓴 글을 본 친구가 노래 가사 같다고 한다.', '가사를 써 본다', '좋아하는 노래에 내 가사를 붙여 봤다.');
talentEv('beat', 'rhythm', 'drum', 9, 20, '책상 드러머', '책상을 두드리는 박자가 남다르다는 말을 자주 듣는다. 음악실 드럼을 한번 쳐 보라고 한다.', '쳐 본다', '음악실 드럼을 처음 쳐 봤다. 손이 저절로 움직였다.');
talentEv('rap_cypher', 'rhythm', 'rap', 13, 25, '사이퍼', '친구들끼리 즉석 랩 배틀을 하는데, 박자를 타는 게 나만 유난히 자연스럽다.', '나도 끼어든다', '즉석에서 랩을 했다. 다들 소리를 질렀다.');
talentEv('melody', 'creative', 'compose', 11, 28, '머릿속 멜로디', '샤워할 때마다 처음 듣는 멜로디가 머릿속에 떠오른다. 휴대폰에 녹음해 둘까?', '작곡 앱을 깔아 본다', '머릿속 멜로디를 작곡 앱에 옮겨 봤다.');
talentEv('drawing', 'creative', 'art', 6, 20, '낙서 천재', '공책 귀퉁이 낙서를 본 친구들이 그림을 그려 달라고 줄을 선다.', '제대로 그려 본다', '친구들 얼굴을 하나씩 그려 줬다.');
talentEv('stage_actor', 'express', 'acting', 8, 25, '연기 잘하네', '친구들과 장난으로 상황극을 했는데, 지나가던 어른이 연기를 배워 보라고 한다.', '연기를 배워 본다', '동네 청소년 연극 교실에 등록했다.');
talentEv('sing_choir', ['music', 'voice'], 'vocal', 6, 25, '노래 잘한다는 말', '노래방에서 내가 부르면 다들 조용해진다. 친구가 합창단에 같이 들어가자고 한다.', '들어간다', '합창단에 들어가 처음으로 발성을 배웠다.');

// ════════ 중·고등학교 ════════
// 중학교 진로 체험의 날 (v117): 하루 동안 직업 하나를 체험한다. 아직 안 배운 특기를 시작할 수 있을 뿐, 성장 속도는 그대로 (동아리와 다르다)
const JOB_EXPS = [['방송국 견학 · 영상 편집 체험', 'edit'], ['녹음실 · 작곡가 체험', 'compose'], ['작사가 체험', 'lyric'], ['기획사 연습실 · 댄스 체험', 'dance'], ['보컬 트레이너 체험', 'vocal'], ['힙합 레이블 · 래퍼 체험', 'rap'],
  ['실용음악 학원 · 기타 체험', 'guitar'], ['실용음악 학원 · 베이스 체험', 'bass'], ['실용음악 학원 · 드럼 체험', 'drum'], ['실용음악 학원 · 키보드 체험', 'keyboard'], ['피아니스트 체험', 'piano'], ['극단 · 배우 체험', 'acting'],
  ['예능 PD 체험', 'variety'], ['영화감독 체험', 'direct'], ['드라마 작가 체험', 'script'], ['웹툰 작가 체험', 'art'], ['게임 회사 체험', 'game'], ['캐스팅 매니저 체험', 'scout'], ['선생님 체험', 'edu'], ['스타트업 체험', 'biz']];
E({
  id: 'job_exp', fixed: true, once: true, cat: '중학교', title: '진로 체험의 날',
  cond: s => schoolYear(s) >= 7 && schoolYear(s) <= 9 && (schoolYear(s) > 7 || calM(s) >= 8),
  init(s, d) { d.o = fitPick(s, JOB_EXPS.filter(x => !has(me(s), x[1]) && skOpen(s, x[1])), 4); if (!d.o.length) d.skip = true; },
  text: () => '학교에서 진로 체험의 날이 열렸다. 하루 동안 직업 하나를 골라 체험해 볼 수 있다.',
  ch: (s, d) => d.o.map(([t, k]) => ({ t, h: gainH(s, k), f: s => `${josa(t, '을를')} 했다. 생각보다 재밌어서 집에 와서도 계속 해 봤다.` + learnMe(s, k) }))
    .concat([{ t: '구경만 하고 온다', f: () => '진로 체험의 날, 이것저것 구경만 하고 왔다.' }]),
});
// 고등학교 동아리 (v117: 중학교에서 옮겼다): 특기마다 하나씩 (공부는 귀가부도 된다)
// 들어간 동아리의 특기는 고등학교 다니는 동안 CLUB_MULT배 빨리 는다 (학과 · 장비와 곱한다, schoolBonus)
const CLUB_MULT = 1.2;
const CLUBS = [['합창부', 'vocal'], ['힙합 동아리', 'rap'], ['댄스 동아리', 'dance'], ['밴드부 (기타)', 'guitar'], ['밴드부 (베이스)', 'bass'], ['피아노부', 'piano'], ['밴드부 (키보드)', 'keyboard'], ['밴드부 (드럼)', 'drum'], ['작곡 동아리', 'compose'], ['시 창작 동아리', 'lyric'], ['문예부', 'script'], ['영화 동아리', 'direct'], ['방송부', 'edit'], ['연극부', 'acting'], ['개그 동아리', 'variety'], ['e스포츠 동아리', 'game'], ['과학 탐구반', 'study'], ['일본 문화 동아리', 'jp'], ['영어 회화 동아리', 'en'], ['만화부', 'art'], ['심리 탐구 동아리', 'scout'], ['또래 멘토링 동아리', 'edu'], ['창업 동아리', 'biz']];
E({
  id: 'club', fixed: true, once: true, cat: '고등학교', title: '동아리 고르기',
  cond: s => schoolYear(s) >= 10 && !s.edu.graduated && (schoolYear(s) > 10 || calM(s) >= 3),
  text: () => '고등학교 동아리 신청 기간이다. 어디에 들어갈까?\n\n동아리에서 하는 특기는 졸업할 때까지 더 빨리 는다.',
  // v220: 예술고 실용음악과에는 합창부 대신 밴드부 (보컬)이 있다 (다른 학교는 합창부만)
  init(s, d) { const mus = s.edu.hs === '예술고 실용음악과'; d.o = fitPick(s, CLUBS.map(x => mus && x[1] === 'vocal' ? ['밴드부 (보컬)', 'vocal'] : x).filter(x => skOpen(s, x[1])), 5); },
  ch: (s, d) => d.o.map(([t, k]) => ({ t, h: has(me(s), k) ? `${skN(k)} 연습이 더 빨리 는다` : gainH(s, k), f: s => { s.edu.club = k; return `${t.replace(/ \(.*\)/, '')}에 들어갔다.` + learnMe(s, k) + fx(s, { sk: { [k]: 1 } }); } })).concat([{ t: '귀가부', h: '집에 일찍 와서 공부한다 · 학업이 오른다', f: s => { s.flags.homeClub = true; return '동아리는 들지 않았다. 집에 일찍 와서 공부하는 시간이 늘었다.' + fx(s, { sk: { study: 3 } }); } }]),
});
E({
  id: 'anime', once: true, p: 0.003, cat: '학창 시절', title: '애니에 빠졌다', tal: 'intel',
  cond: s => age(s) >= 12 && age(s) <= 17 && !has(me(s), 'jp') && skAsk(s, 'jp'),
  text: () => '친구가 추천해 준 일본 애니메이션에 푹 빠졌다. 자막 없이 보고 싶다.',
  ch: s => [
    { t: '일본어를 공부해 본다', h: gainH(s, 'jp'), f: s => '히라가나부터 외우기 시작했다.' + learnMe(s, 'jp') },
    { t: '그냥 자막으로 본다', f: s => { skDecline(s, 'jp'); return '자막으로 정주행했다.'; } },
  ],
});
E({
  id: 'first_love', once: true, p: s => 0.04 * kidFreeM(s), cat: '학창 시절', title: '좋아하는 사람',
  cond: s => age(s) >= 14 && age(s) <= 18 && !partner(s),
  init(s, d) { const g0 = myGender(s); d.g = g0 === '여' ? '남' : '여'; d.name = genName(d.g); d.trait = U.pick(TRAITS).id; d.look = U.pick(d.g === '여' ? LOOKS_F : LOOKS_M); d.orient = 's'; },
  text: (s, d) => `같은 반 ${d.name}(${d.g === '여' ? '여자' : '남자'})${josa(d.name, '이가').slice(d.name.length)} 자꾸 눈에 들어온다. ${traitLine(d.trait)}`,
  ch(s, d) {
    const fits = likes({ g: d.g, orient: d.orient }, myGender(s));
    const p = fits ? U.clamp(0.3 + me(s).tal.looks / 200 + me(s).tal.humor / 300, 0.1, 0.8) : 0;
    const mk = (rel, a) => makePerson(s, { g: d.g, name: d.name, trait: d.trait, look: d.look, orient: d.orient, age: age(s), rel, aff: a, met: '학창 시절 첫사랑' });
    return [
      { t: '고백한다', h: `받아 줄 가능성 ${pct(p)}${p > 0 ? loveRiskH(s) : ''}`, f: s => { if (U.chance(p)) { const n = mk('연인', 70); n.dateT = s.t; s.partner = n.id; milestone(s, `${age(s)}세에 첫사랑 ${josa(d.name, '과와')} 사귀었다.`); return `${d.name}에게 고백했다. 사귀게 됐다!` + fx(s, { stress: -10 }); } mk('친구', 20); return `${d.name}에게 고백했다가 거절당했다.`; } },
      { t: '마음에 묻어 둔다', f: s => { mk('친구', 40); return '마음은 일기장에만 적어 두었다.' + fx(s, { sk: { lyric: 1 } }); } },
    ];
  },
});
E({
  id: 'festival', cd: 12, p: s => 0.05 * kidFreeM(s), cat: '학교', title: '학교 축제',
  cond: s => (schoolYear(s) >= 7 && !s.edu.graduated) || inUni(s),
  init(s, d) { const un = [['노래로 무대에 선다', 'vocal'], ['춤으로 무대에 선다', 'dance'], ['연극 무대에 선다', 'acting'], ['밴드 공연에 낀다', 'guitar'], ['사회를 본다', 'variety'], ['랩 무대를 한다', 'rap']].filter(x => !has(me(s), x[1]) && skOpen(s, x[1])); d.nw = un.length && learnedSkills(me(s)).length < 8 && U.chance(0.15) ? fitPick(s, un, 1)[0] : null; },
  text: () => '학교 축제가 다가온다. 무대에 설 사람을 찾는다.',
  ch(s, d) {
    const opts = [['노래로 무대에 선다', 'vocal'], ['춤으로 무대에 선다', 'dance'], ['연극 무대에 선다', 'acting'], ['밴드 공연에 낀다', ['guitar', 'bass', 'drum', 'keyboard'].find(k => has(me(s), k)) || 'guitar'], ['사회를 본다', 'variety'], ['랩 무대를 한다', 'rap']];
    const o = opts.filter(([, k]) => has(me(s), k)).map(([n, k]) => {
      const p = schoolP(s, stageLv(s, k));
      return { t: n, h: `반응이 좋을 가능성 ${pct(p)}`, f: s => U.chance(p) ? `축제 무대에서 큰 환호를 받았다.` + fx(s, { sk: { [k]: 1 }, fkr: Math.round(U.int(50, 400) * lv(me(s), k) / 40), stress: -5 }) : `축제 무대에서 실수했다.` };
    });
    const nw = d.nw && !has(me(s), d.nw[1]) ? d.nw : null;
    if (nw) o.push({ t: `${nw[0]} (처음 해 본다)`, h: '친구들이 등 떠밀었다', f: s => '얼떨결에 무대에 올랐다. 떨렸지만 재밌었다.' + learnMe(s, nw[1]) });
    o.push({ t: '구경만 한다', f: () => '축제를 구경하며 놀았다.' });
    return o;
  },
});
E({
  id: 'hs_choice', fixed: true, once: true, cat: '진학', title: '고등학교 진학',
  cond: s => schoolYear(s) === 9 && calM(s) >= 8,
  text: s => '중학교 졸업이 다가온다. 어느 고등학교에 갈까?\n\n예술고나 특성화고에 가면 그 학과에서 배우는 특기(예: 실용음악과는 보컬·악기·작곡)가 1.25배 빨리 는다. 들어가려면 실기 시험을 봐야 한다.' + (s.wealth <= 3 ? '\n\n다만 예술고는 학비와 레슨비가 만만치 않다. 다니는 동안 매달 20만 원이 든다.' : ''),
  ch(s) {
    const best = ks => Math.max(...ks.map(k => stageLv(s, k)));
    const o = [
      ['예술고 실용음악과', ['vocal', 'rap', 'guitar', 'bass', 'piano', 'keyboard', 'drum', 'compose'], 'vocal'],
      ['예술고 연극영화과', ['acting', 'direct', 'script'], 'acting'],
      ['예술고 무용과', ['dance'], 'dance'],
      ['예술고 미술과', ['art'], 'art'],
      ['특성화고 방송영상과', ['edit', 'direct', 'variety'], 'edit'],
    ].map(([n, b, core]) => {
      const pp = schoolP(s, best(b), 0, 0.02);
      return { t: n, h: `합격 가능성 ${pct(pp)} · ${b.map(k => SKILLS[k].n).join('·')} 연습이 빨리 는다 · 떨어지면 일반고`, f: s => { if (U.chance(pp)) { s.edu.hs = n; s.edu.hsBonus = b; if (s.wealth <= 3 && n.startsWith('예술고')) s.flags.artFee = true; milestone(s, `${n}에 진학했다.`); const used = admitSkill(s, b, core); return `${n} 실기 시험에 ${SKILLS[used].n} 실기로 합격했다!` + learnMe(s, used) + (b.includes('direct') && !has(me(s), 'direct') ? learnMe(s, 'direct') : '') + fx(s, { stress: -6 }); } s.edu.hs = '일반고'; return `${n} 실기 시험에 떨어졌다. 일반고에 가게 됐다.` + fx(s, { stress: 5 }); } };
    });
    o.push({ t: '일반고에 간다', f: s => { s.edu.hs = '일반고'; return '집 근처 일반고에 가기로 했다.'; } });
    return o;
  },
});
E({
  // v219: 방학 달(1 · 7 · 8월)에만, 이미 직업(연습생은 빼고)이 있으면 나오지 않는다
  id: 'first_job', once: true, p: 0.15, cat: '학창 시절', title: '첫 아르바이트',
  cond: s => age(s) >= 16 && age(s) <= 18 && [0, 6, 7].includes(calM(s)) && !CAREER_IDS.some(id => trackOn(s, id) && !(id === 'idol' && s.tracks.idol.st === 'trainee')),
  text: () => '방학이다. 편의점 야간 알바 자리가 났다.',
  ch: () => [
    { t: '해 본다', f: s => { earn(s, 90e4, '아르바이트'); return '방학 동안 편의점에서 일했다. 처음으로 내 힘으로 돈을 벌었다.' + fx(s, { stress: 4 }); } },
    { t: '방학엔 쉰다', f: s => '방학 내내 푹 쉬었다.' + fx(s, { stress: -5 }) },
  ],
});
E({
  id: 'college', fixed: true, once: true, cat: '진학', title: '수능과 대학',
  // 수능은 11월, 결과를 보고 대학을 고르는 건 12월 (v117 학사 일정). 다른 창에 밀리면 1~2월에
  cond: s => schoolYear(s) === 12 && (calM(s) === 11 || calM(s) <= 1),
  text: s => `수능이 끝났다. 학업 ${lvi(me(s), 'study')}레벨. 대학에 갈까?` + (s.wealth >= 5 ? '\n\n등록금은 부모님이 내 주신다.' : '\n\n집 형편상 등록금은 학자금 대출(매달 70만 원씩 빚)로 내야 한다.'),
  ch(s) {
    const best = ks => Math.max(...ks.map(k => stageLv(s, k)));
    // 마지막 숫자: 또래 기준(18세 24레벨쯤)보다 얼마나 더 해야 하는지. 학업은 학교 수업만으로도 조금씩 오르니 기준을 따로 낮춘다
    const o = [
      ['실용음악과', ['vocal', 'rap', 'compose', 'guitar', 'bass', 'piano', 'keyboard', 'drum'], 'compose', -1],
      ['연극영화과', ['acting', 'direct', 'script'], 'acting', 0],
      ['방송연예과', ['variety', 'acting'], 'variety', -1],
      ['영상학과', ['edit', 'direct'], 'edit', -3],
      ['문예창작과', ['script', 'lyric'], 'script', -2],
      ['경영학과', ['study', 'scout'], 'scout', null],
      ['일반 대학', ['study', 'en', 'jp'], 'study', null],
    ].map(([n, b, core, off]) => {
      const pp = off != null ? schoolP(s, Math.max(best(b), stageLv(s, 'study') * 0.6), off, 0.03)
        : schoolP(s, stageLv(s, 'study'), n === '경영학과' ? -3 : -6, 0.03);
      return { t: n, h: `합격 가능성 ${pct(pp)} · 4년 동안 ${b.map(k => SKILLS[k].n).join('·')} 연습이 빨리 는다`, f: s => { if (U.chance(pp)) { const st = s.t + (14 - calM(s)) % 12; s.edu.uni = { n, bonus: b, st, end: st + 48 }; milestone(s, `${n}에 합격했다.`); const used = admitSkill(s, b, has(me(s), 'study') && off != null ? 'study' : core); return (off != null && used !== 'study' ? `${n}에 ${SKILLS[used].n} 실기로 합격했다!` : `${n}에 합격했다!`) + learnMe(s, used) + (b.includes('direct') && !has(me(s), 'direct') ? learnMe(s, 'direct') : '') + fx(s, { stress: -6 }); } return `${n}에 떨어졌다. 재수는 하지 않기로 했다.` + fx(s, { stress: 6 }); } };
    });
    o.push({ t: '대학은 가지 않는다', f: () => '대학에 가지 않기로 했다.' });
    return o;
  },
});
// 대학 졸업 알림 (uniMonth가 4년이 지나면 띄운다)
E({
  id: 'uni_grad', cat: '학교', title: '대학 졸업',
  cond: s => !!s.edu.uni,
  text: s => `${josa(s.edu.uni.n, '을를')} 졸업했다! 학사모를 던지며 사진을 찍었다.`,
  ch: () => [{ t: '졸업한다', f: s => { milestone(s, `${age(s)}세에 ${josa(s.edu.uni.n, '을를')} 졸업했다.`); return `${josa(s.edu.uni.n, '을를')} 졸업했다.` + fx(s, { stress: -5 }); } }],
});

// ════════ 성인: 특기를 새로 배우는 길 ════════
const ADULT_CLASS = {
  vocal: '회사 근처 보컬 원데이 클래스', rap: '랩 메이킹 클래스', dance: '동네 방송댄스 동호회', guitar: '통기타 동호회', bass: '베이스 동호회 (초보 환영)',
  piano: '어른 피아노 교실', keyboard: '실용음악 키보드 입문반', drum: '드럼 체험 레슨', compose: '작곡 프로그램 입문 강의', lyric: '작사 원데이 클래스',
  script: '시나리오 쓰기 모임', direct: '단편영화 만들기 워크숍', edit: '영상 편집 무료 강의', acting: '직장인 연기 동아리', variety: '스피치 모임',
  game: '친구들의 게임 모임', jp: '일본어 회화 모임', en: '영어 회화 스터디', art: '드로잉 동호회', scout: '오디션 심사 보조 아르바이트',
};
E({
  id: 'adult_class', cd: 24, p: 0.0175, cat: '배움', title: '새로 배워 볼까?',
  cond: s => age(s) >= 19 && !s.army,
  init(s, d) {
    const p = me(s), c = SKILL_IDS.filter(k => !has(p, k) && ADULT_CLASS[k] && skAsk(s, k));
    if (!c.length) { d.skip = true; return; }
    d.k = U.wpick(c, k => fitWeight(p, k, 4));
    d.fee = d.k === 'scout' ? 0 : U.pick([0, 5, 10, 15]) * 1e4;
  },
  text: (s, d) => d.k === 'scout' ? '기획사에서 오디션 심사 보조 아르바이트를 구한다는 글을 봤다. 지원자 영상을 보며 점수를 매기는 일이다.' : `'${ADULT_CLASS[d.k]}'에서 사람을 모집한다는 글을 봤다.${d.fee ? ` 월 회비 ${fmtWon(d.fee)}.` : ' 무료라고 한다.'}`,
  ch: (s, d) => [
    { t: '해 본다', h: d.fee ? `첫 달 회비 ${fmtWon(d.fee)}` : '', f: s => { if (d.fee) addMoney(s, -d.fee, '모임 회비'); return `'${ADULT_CLASS[d.k]}'에 나가기 시작했다.` + learnMe(s, d.k); } },
    { t: '관심 없다', f: s => { skDecline(s, d.k); return '그냥 넘겼다.'; } },
  ],
});
// 생활 창의 '새 특기 배우기': 아직 안 배운 특기를 골라 학원에 등록한다 (등록비는 그 학원 한 달 치)
function learnable(s) { const p = me(s); return SKILL_IDS.filter(k => !has(p, k) && ADULT_CLASS[k] && SKILLS[k].les && skRoom(s, k)); }
E({
  id: 'learn_pick', cat: '배움', title: '새 특기 배우기',
  cond: s => true,
  text: () => '어떤 걸 배워 볼까?',
  ch: s => learnable(s).map(k => { const L = SKILLS[k].les, fee = Math.round(L.c * (REGION_BY[s.region].lessonMult || 1)) * 1e4; return { t: `${SKILLS[k].ic} ${SKILLS[k].n}`, h: `${L.n} · 등록비 ${fmtWon(fee)}`, ok: s => s.money >= fee, f: s => { addMoney(s, -fee, '학원 등록비'); s.cd.learn = s.t + 3; return `${L.n}에 등록했다.` + learnMe(s, k); } }; }).concat([{ t: '그만두기', f: () => '' }]),
});
// ───── 스카우트를 배우는 길 (피드백 21: 일하지 않으면 거의 못 배웠다) ─────
// 새 특기 배우기(캐스팅 실무 강좌), 성인 배움 사건(오디션 심사 보조 아르바이트), 아래 세 사건, 사람을 보는 직업(scoutByWork)
const PERF_SK = ['vocal', 'rap', 'dance', 'acting', 'variety', 'guitar', 'bass', 'drum', 'piano', 'keyboard', 'compose'];
// 친구의 오디션 영상을 봐 준다 (내가 할 줄 아는 분야)
E({
  id: 'scout_friend', cd: 24, p: 0.015, cat: '배움', title: '네 눈엔 어때?', tal: ['insight', 'intel'],
  cond: s => age(s) >= 14 && !s.army && !has(me(s), 'scout') && skAsk(s, 'scout') && PERF_SK.some(k => lv(me(s), k) >= 15),
  init(s, d) {
    const fr = people(s, n => ['친구', '동기', '선배', '동료', '후배'].includes(n.rel) && !(n.far && age(s) < 19));
    d.id = fr.length ? U.pick(fr).id : null; d.k = U.pick(PERF_SK.filter(k => lv(me(s), k) >= 15));
  },
  text: (s, d) => `${d.id ? `${s.people[d.id].rel} ${josa(s.people[d.id].name, '이가')}` : '아는 동생이'} 오디션에 낼 ${SKILLS[d.k].n} 영상을 보내왔다. 어디가 부족한지 솔직하게 말해 달라고 한다.`,
  ch: (s, d) => [
    { t: '하나하나 짚어 준다', f: s => { if (d.id) aff(s.people[d.id], 4); return '영상을 몇 번이나 돌려 보며 잘한 점과 아쉬운 점을 적어 줬다.' + learnMe(s, 'scout'); } },
    { t: '좋다고만 해 준다', f: s => { if (d.id) aff(s.people[d.id], 1); skDecline(s, 'scout'); return '좋다고 응원만 해 줬다.'; } },
  ],
});
// 소속사 신인 오디션 심사석에 앉아 본다 (전속 계약 중인 아티스트)
E({
  id: 'scout_panel', cd: 24, p: 0.02, cat: '배움', title: '오디션 심사 자리',
  cond: s => age(s) >= 17 && !s.army && !has(me(s), 'scout') && skAsk(s, 'scout') && !!artistContract(s),
  init(s, d) { d.ag = artistContract(s); },
  text: (s, d) => `${josa(d.ag, '이가')} 신인 오디션을 연다. 선배로서 심사석 뒤에 앉아 지원자들을 같이 봐 달라고 한다.`,
  ch: (s, d) => [
    { t: '같이 본다', f: s => '하루 종일 지원자들을 보며 점수를 매겼다. 누가 될지 조금씩 보이기 시작했다.' + learnMe(s, 'scout') + fx(s, { stress: 2 }) },
    { t: '연습이 바쁘다고 한다', f: s => { skDecline(s, 'scout'); return '연습이 바쁘다며 사양했다.'; } },
  ],
});
// 이름이 알려지면 오디션 프로그램 심사위원 섭외가 온다 (스카우트가 있으면 더 는다)
const JUDGE_SHOWS = ['스타 오디션 K', '라이징 스테이지', '넥스트 아이콘', '데뷔의 문', '원석을 찾아라', '골든 마이크',
  '꿈의 오디션', '한 소절의 기적', '무대 위의 신인', '첫 번째 마이크', '다음 스타를 찾아서', '오디션 로드'];
E({
  id: 'judge_guest', cd: 36, p: 0.01, cat: '방송', title: '심사위원 섭외',
  cond: s => age(s) >= 22 && !s.army && totalFans(s) >= 2e5 && !s.hiatus && !pregMe(s),
  init(s, d) { d.show = U.pick(JUDGE_SHOWS); d.fee = Math.round((300 + Math.min(1700, totalFans(s) / 2000)) / 10) * 10 * 1e4; },
  text: (s, d) => `오디션 프로그램 「${d.show}」에서 심사위원으로 나와 달라고 한다. 출연료 ${fmtWon(d.fee)}.`,
  ch: (s, d) => [
    { t: '나간다', f: s => { earn(s, d.fee, '심사위원 출연료'); return `「${d.show}」 심사위원석에 앉았다. 참가자들의 무대를 하나하나 평가했다.` + learnMe(s, 'scout') + fx(s, { pop: 3, fame: 3, fkr: Math.round(totalFans(s) * 0.01), stress: 3 }); } },
    { t: '거절한다', f: () => `「${d.show}」 심사위원 섭외를 거절했다.` },
  ],
});
// 사람을 뽑는 직업을 하다 보면 사람 보는 눈이 트인다 (v101: 예전엔 저절로 생겼는데 이제 고른다. game.js scoutByWork)
E({
  id: 'scout_work', cat: '배움', title: '사람 보는 눈',
  text: (s, d) => `${SCOUT_JOBS[d.id] || '사람들을 보다 보니'} 누가 잘될지 조금씩 보이기 시작했다. 사람 보는 눈을 제대로 길러 볼까?`,
  ch: (s, d) => [
    { t: '길러 본다', f: s => '사람을 보는 눈을 기르기로 했다.' + learnMe(s, 'scout') },
    { t: '내 일에만 집중한다', f: s => { skDecline(s, 'scout'); return '사람 보는 일은 다른 사람에게 맡기기로 했다.'; } },
  ],
});
// 교육 특기: 누가 가르쳐 달라고 할 때 처음 생긴다
E({
  id: 'teach_ask', cd: 18, p: 0.015, cat: '배움', title: '가르쳐 줄 수 있어?', autoK: 'flavor',
  cond: s => age(s) >= 14 && skAsk(s, 'edu') && learnedSkills(me(s)).some(k => k !== 'edu' && lv(me(s), k) >= 20),
  init(s, d) { const ks = learnedSkills(me(s)).filter(k => k !== 'edu' && lv(me(s), k) >= 20); d.k = U.pick(ks); d.who = U.pick(['동생', '후배', '친구 동생', '옆집 아이']); },
  text: (s, d) => `${josa(d.who, '이가')} ${josa(skN(d.k), '을를')} 좀 가르쳐 달라고 한다.`,
  ch: (s, d) => [
    { t: '가르쳐 준다', f: s => { const tag = learnMe(s, 'edu'); useSkill(s, me(s), d.k, 0.3); return `${d.who}에게 ${josa(skN(d.k), '을를')} 가르쳐 줬다. 가르치는 것도 생각보다 재밌다.${tag}`; } },
    { t: '바쁘다고 거절한다', f: s => { skDecline(s, 'edu'); return '바쁘다며 거절했다.'; } },
  ],
});
// 인생의 뮤즈: 재능이 조금 바뀌는 드문 큰 사건
E({
  id: 'muse', once: true, p: 0.002, cat: '인생', title: '인생의 뮤즈',
  cond: s => age(s) >= 15 && age(s) <= 40,
  init(s, d) { d.t = U.pick(['music', 'creative', 'express', 'verbal']); },
  text: (s, d) => ({ music: '우연히 들어간 작은 공연장에서 들은 노래가 머리를 떠나지 않는다. 음악이 이렇게 사람을 흔들 수 있구나.', creative: '여행지에서 본 풍경을 잊을 수가 없다. 뭔가를 만들고 싶어 손이 근질거린다.', express: '극장에서 본 연극 한 편에 펑펑 울었다. 배우의 눈빛이 아직도 생생하다.', verbal: '헌책방에서 산 소설 한 권을 밤새 읽었다. 나도 이런 이야기를 쓰고 싶다.' })[d.t],
  ch: (s, d) => [{ t: '이 마음을 오래 간직한다', f: s => { milestone(s, `${age(s)}세에 인생을 바꾼 ${({ music: '노래', creative: '풍경', express: '연극', verbal: '소설' })[d.t]}를 만났다.`); return EVENTS.muse.text(s, d) + ' 그날 이후로 세상이 조금 다르게 보였다.' + fx(s, { tal: { [d.t]: 5 }, stress: -5 }); } }],
});

// 특기가 숨은 한계(포텐) 가까이 가면 창으로 한 번 알려 준다 (person.js practice). 같은 달에 여럿이면 한 창에 모은다. 숫자는 보여 주지 않는다
E({
  id: 'cap_hit', cat: '특기', title: '재능의 벽',
  cond: s => true,
  text: (s, d) => `요즘 ${d.ks.map(k => SKILLS[k].n).join('·')} 실력이 예전처럼 잘 늘지 않는다.`,
  ch: (s, d) => [{ t: '확인', f: () => `요즘 ${d.ks.map(k => SKILLS[k].n).join('·')} 실력이 예전처럼 잘 늘지 않는다.` }],
});

// ════════ 성인 · 생활 ════════
// 본가에 오래 붙어 있으면 부모님이 독립을 권한다. 한 번은 생활비를 더 내고 버틸 수 있지만, 두 번째엔 나가야 한다
E({
  id: 'home_out', cd: 12, cat: '독립', title: '이제 나가 살 때가 됐다',
  p: s => s.home.mode === 'parents' && !isDorm(s) && !s.army && age(s) >= 26 && parentsAlive(s).length ? (s.flags.homeWarned ? 0.06 : 0.015 + (age(s) - 26) * 0.01) : 0,
  text: s => {
    const who = parentsAlive(s).length > 1 ? '부모님' : parentsAlive(s)[0].rel;
    return s.flags.homeWarned ? `${josa(who, '이가')} 이번에는 단호하시다. 다음 달까지 방을 구해서 나가라고 하신다.` : `저녁을 먹다가 ${josa(who, '이가')} 조심스럽게 말을 꺼내셨다. "너도 이제 나가서 살 때가 되지 않았니?"`;
  },
  ch(s) {
    const r = REGION_BY[s.region], inSeoul = s.region === 'seoul' || s.region === 'gangnam';
    const go = (rid, x) => s => { const t = moveTo(s, rid, 'monthly'); s.flags.kickedOut = !!s.flags.homeWarned; milestone(s, `${age(s)}세에 본가를 나와 ${s.place}에서 자취를 시작했다.`); return x + ' ' + t; };
    const o = [
      { t: `${s.place}에서 월세 원룸을 구한다`, h: `보증금 ${HOUSE[s.region].dep}만 원 · 월세·생활비 월 ${r.rent}만 원 · 돈이 모자라면 빚이 된다`, f: go(s.region, '짐을 싸서 본가를 나왔다.') },
    ];
    if (!inSeoul) o.push({ t: '이참에 서울로 올라간다', h: `보증금 ${HOUSE.seoul.dep}만 원 · 월세·생활비 월 ${REGION_BY.seoul.rent}만 원 · 기획사와 방송국이 가깝다`, f: go('seoul', '이참에 서울로 올라왔다.') });
    if (!s.flags.homeWarned) o.push({ t: '생활비를 더 내고 조금만 더 있겠다고 한다', h: '앞으로 생활비 월 30만 원 더 · 다음에 또 말이 나오면 그때는 나가야 한다', f: s => { s.flags.homeWarned = true; s.flags.homeFeeUp = true; return '생활비를 더 내기로 하고 조금만 더 있기로 했다. 집 안 공기가 조금 어색해졌다.' + fx(s, { stress: 5 }); } });
    return o;
  },
});
E({
  id: 'leave_home', fixed: true, once: true, cat: '독립', title: '어디서 살까?',
  // 이 사건 전에 이미 나가 살아 봤으면(월세·전세·내 집) 다시 묻지 않는다
  cond: s => age(s) === 19 && s.t % 12 >= 1 && !isDorm(s) && s.home.mode !== 'alone' && !s.flags.livedAlone,
  text: s => { const r = REGION_BY[s.region]; return `성인이 됐다. 이제 어디서 살지 정해야 한다.\n\n지금 사는 곳은 ${s.place}. ${r.d}.`; },
  ch(s) {
    const r = REGION_BY[s.region], inSeoul = s.region === 'seoul' || s.region === 'gangnam';
    // 이미 서울에 살면 '서울로 올라가기'는 보여 주지 않는다 (같은 말이 두 번 나오지 않게)
    return [
      { t: '본가에 남는다', h: `생활비 월 ${homeBase(s)}만 원과 번 돈의 15% 보태기 · 나이가 들수록 더 보탠다`, f: s => { s.home.mode = 'parents'; return '본가에 남기로 했다.'; } },
      inSeoul ? null : { t: '서울로 올라가 월세 원룸을 구한다', h: `보증금 ${HOUSE.seoul.dep}만 원 · 월세·생활비 월 ${REGION_BY.seoul.rent}만 원 · 기획사와 방송국이 가깝다 · 돈이 모자라면 빚이 된다`, f: s => { const x = moveTo(s, 'seoul', 'monthly'); milestone(s, `${age(s)}세에 서울 ${s.place}에서 자취를 시작했다.`); return x; } },
      { t: `${s.place}에서 월세 원룸을 구한다`, h: `보증금 ${HOUSE[s.region].dep}만 원 · 월세·생활비 월 ${r.rent}만 원`, f: s => moveTo(s, s.region, 'monthly') },
    ].filter(Boolean);
  },
});
// 기획사 숙소를 나올 때: 본가로 갈지, 집을 새로 구할지 고른다
E({
  id: 'dorm_out', cat: '독립', title: '숙소를 나와야 한다', tag: 'career',
  // 내 집(월세·전세·자가)이 이미 있으면 묻지 않는다 (그 집으로 돌아간다, v89)
  cond: s => !isDorm(s) && age(s) >= 19 && s.home.mode !== 'alone',
  text: s => { const r = REGION_BY[s.region]; return `${married(s) ? '결혼했으니 기획사 숙소를 나와 가족과 살 집을 구해야 한다.' : '기획사 숙소 생활이 끝났다. 짐을 싸서 나가야 한다.'} 이제 어디서 살까?\n\n지금 지내는 곳은 ${s.place}. ${r.d}.`; },
  ch(s) {
    const r = REGION_BY[s.region], inSeoul = s.region === 'seoul' || s.region === 'gangnam', canHome = parentsAlive(s).length && !s.flags.kickedOut;
    const o = [], hm = s.home, own = hm.mode === 'alone', hn = own ? homeNow(s) : null;
    if (own && (!needApt(s) || inApt(s))) o.push({ t: `원래 내 집으로 간다 (${hn.n})`, h: hn.d, f: () => `숙소를 나와 ${josa(hn.n, '으로')} 돌아갔다.` });
    // 결혼했으면 본가로 돌아가지 않고 둘이 살 집을 구한다
    if (!isSpouse(partner(s))) o.push({ t: '본가로 내려간다', ok: () => canHome, h: canHome ? `${s.birthPlace || '본가'} · 생활비 월 ${homeBase(s)}만 원과 번 돈의 15% 보태기` : (parentsAlive(s).length ? '부모님이 다시 들어오는 건 반대하신다' : '돌아갈 본가가 없다'), f: s => { moveHomeParents(s); return '숙소를 나와 본가로 돌아갔다.'; } });
    // 결혼했으면 원룸 대신 투룸
    const sz = needApt(s) ? 'l' : isSpouse(partner(s)) ? 'm' : 's', mn = homeName('monthly', sz);
    if (!(own && hm.type === 'monthly')) o.push({ t: `${s.place}에서 ${josa(mn, '을를')} 구한다`, h: `보증금 ${fmtWon(homeNeed(s.region, 'monthly', sz))} · 월세·생활비 월 ${homeMonthly(s.region, 'monthly', sz)}만 원 · 돈이 모자라면 빚이 된다`, f: s => { const x = moveTo(s, s.region, 'monthly', sz); milestone(s, `${age(s)}세에 숙소를 나와 ${s.place}에서 자취를 시작했다.`); return x; } });
    if (!inSeoul) o.push({ t: `서울에서 ${josa(mn, '을를')} 구한다`, h: `보증금 ${fmtWon(homeNeed('seoul', 'monthly', sz))} · 월세·생활비 월 ${homeMonthly('seoul', 'monthly', sz)}만 원 · 기획사와 방송국이 가깝다`, f: s => { const x = moveTo(s, 'seoul', 'monthly', sz); milestone(s, `${age(s)}세에 숙소를 나와 서울 ${s.place}에서 자취를 시작했다.`); return x; } });
    return o;
  },
});
function startArmy(s) {
  const p = me(s), sk = {};
  for (const k of learnedSkills(p)) sk[k] = lvi(p, k);
  s.army = { left: 18, pay: 0, from: { sk, money: s.money, fans: totalFans(s), stress: Math.round(s.stress) } };
  // 지속 관리(PT · 피부과 · 상담 · 매니저 등)는 군대에서 쓸 일이 없어 모두 끊긴다 (v129). 자녀 교육비는 그대로
  const cut = Object.keys(s.subs || {}).filter(id => s.subs[id] && SUBS[id] && !SUBS[id].kids);
  for (const id of cut) delete s.subs[id];
  const u = s.edu.uni, leave = u && !u.done && s.t < u.end;
  milestone(s, `${age(s)}세에 입대했다.`); return `입대했다. 머리를 짧게 잘랐다.${leave ? ` ${josa(u.n, '은는')} 휴학했다.` : ''}${cut.length ? ` 이용하던 지속 관리(${cut.map(id => SUBS[id].n).join(' · ')})는 모두 끊었다.` : ''}` + fx(s, { stress: 6 }); }
// 전역 상태 창: 들어갈 때 → 지금 (돈·팬·스트레스·특기)
E({
  id: 'army_end', cat: '병역', title: '전역',
  cond: s => true,
  text: s => '18개월의 군 복무를 마치고 부대 정문을 나섰다. 오랜만에 사회의 공기를 마셨다.',
  html(s, d) {
    const f = d.from, p = me(s);
    const row = (n, a, b, fmt, good) => { const df = b - a, cls = !df ? '' : (df > 0) === good ? 'pos' : 'neg'; return `<div class="st-row"><span>${n}</span><b>${fmt(a)} → <span class="${cls}">${fmt(b)}</span></b></div>`; };
    let h = `<div class="m-text">${rich(EVENTS.army_end.text(s, d))}</div><div class="st-box"><div class="st-h">🪖 전역 날 상태</div>`;
    if (f) {
      h += row('돈', f.money, s.money, fmtWon, true) + (d.pay ? `<div class="st-row sub"><span>받은 월급</span><b>${fmtWon(d.pay)}</b></div>` : '');
      if (f.fans || totalFans(s)) h += row('팬', f.fans, totalFans(s), fmtFans, true);
      h += row('스트레스', f.stress, Math.round(s.stress), x => x, false);
      const ks = Object.keys(f.sk).filter(k => has(p, k)).sort((a, b) => (lvi(p, a) - f.sk[a]) - (lvi(p, b) - f.sk[b]));
      if (ks.length) h += `<div class="st-h2">특기</div>` + ks.map(k => row(SKILLS[k].n, f.sk[k], lvi(p, k), x => x, true)).join('');
    } else h += `<div class="st-row"><span>돈</span><b>${fmtWon(s.money)}</b></div><div class="st-row"><span>스트레스</span><b>${Math.round(s.stress)}</b></div>`;
    return h + `</div>`;
  },
  ch: () => [{ t: '확인', f: s => { const u = s.edu.uni; return '전역했다. 오랜만에 사회의 공기를 마셨다.' + (u && !u.done && s.t < u.end ? ` ${josa(u.n, '으로')} 복학한다.` : ''); } }],
});
// 생계유지 곤란 사유 병역 감면: 집안 형편이 가장 어려운 집(10단계 중 1)이면 처음 입대 이야기가 나올 때 대신 뜬다
function armyExemptOK(s) { return s.wealth <= 1; }
E({
  id: 'army_exempt', fixed: true, cat: '병역', title: '병역 감면',
  cond: s => myGender(s) === '남' && !s.armyDone && !s.army && armyExemptOK(s) && age(s) >= 20 && (s.t % 12 === 0 || age(s) >= 28),
  text: () => '병무청에서 통지서가 왔다. 집안 형편이 어려워 내가 가족의 생계를 책임져야 한다는 사정이 인정됐다.\n\n생계유지 곤란 사유로 병역이 감면됐다. 군대에 가지 않는다.',
  ch: () => [{ t: '확인', f: s => { s.armyDone = true; s.armyExempt = true; milestone(s, `${age(s)}세에 생계유지 곤란 사유로 병역을 감면받았다.`); return '생계유지 곤란 사유로 병역을 감면받았다.'; } }],
});
E({
  id: 'army_q', fixed: true, cat: '병역', title: '입대 시기',
  cond: s => myGender(s) === '남' && !s.armyDone && !s.army && !armyExemptOK(s) && age(s) >= 20 && age(s) <= 27 && s.t % 12 === 0,
  text: s => '병역 의무를 마쳐야 한다. 28세가 되면 더는 미룰 수 없다. 군 복무는 18개월이고, 그동안 일과 연습은 멈춘다. 특기도 조금씩 떨어진다.' + (s.edu.uni && !s.edu.uni.done && s.t < s.edu.uni.end ? '\n\n대학은 휴학하고, 전역하면 복학한다.' : '') + (anyTrackActive(s) ? '\n\n활동 중에 입대하면 팬이 조금씩 줄어든다.' : ''),
  ch: () => [{ t: '지금 입대한다', f: s => startArmy(s) }, { t: '1년 더 미룬다', f: () => '입대를 1년 미뤘다.' }],
});
E({
  id: 'army_force', fixed: true, cat: '병역', title: '입영 통지서',
  cond: s => myGender(s) === '남' && !s.armyDone && !s.army && !armyExemptOK(s) && age(s) >= 28,
  text: () => '입영 통지서가 날아왔다. 더는 미룰 수 없다.',
  ch: () => [{ t: '입대한다', f: s => startArmy(s) }],
});
E({
  id: 'side_job', cd: 24, cat: '돈', title: '단기 알바 소개',
  p: s => age(s) >= 19 && s.money < 100e4 ? 0.03 : 0,
  text: () => '지인이 주말 행사 스태프 단기 알바를 소개해 줬다. 2주에 150만 원.',
  ch: () => [
    { t: '한다', f: s => '행사장에서 2주 동안 박스를 날랐다.' + fx(s, { money: 150e4, stress: 6 }) },
    { t: '안 한다', f: () => '알바 제안을 거절했다.' },
  ],
});
E({
  id: 'parents_money', cd: 24, cat: '가족', title: '부모님 생활비',
  p: s => age(s) >= 22 && s.wealth <= 4 && parentsAlive(s).length ? 0.02 : 0,
  text: () => '부모님 형편이 많이 어렵다. 조심스럽게 생활비 이야기를 꺼내셨다.',
  ch: s => [
    { t: '200만 원 보내 드린다', ok: s => s.money >= 200e4, h: s.money >= 200e4 ? '' : '돈이 모자라다', f: s => '부모님께 200만 원을 보내 드렸다.' + fx(s, { money: -200e4, stress: -3 }) },
    { t: '형편이 되는 만큼 보낸다', f: s => { const v = Math.min(s.money, 50e4); return v > 0 ? `부모님께 ${fmtWon(v)}을 보내 드렸다.` + fx(s, { money: -v }) : '보낼 돈이 없었다. 죄송하다는 말밖에 못 했다.' + fx(s, { stress: 5 }); } },
    { t: '지금은 어렵다고 말씀드린다', f: s => '지금은 어렵다고 말씀드렸다.' + fx(s, { stress: 4 }) },
  ],
});
E({
  id: 'family_sick', once: true, p: 0.003, cat: '가족', title: '가족이 쓰러졌다',
  cond: s => age(s) >= 25 && parentsAlive(s).length,
  init(s, d) { d.id = U.pick(parentsAlive(s)).id; },
  text: (s, d) => `새벽에 전화가 왔다. ${josa(s.people[d.id].rel, '이가')} 쓰러지셨다고 한다. 수술비가 필요하다.`,
  ch: s => [
    { t: '병원비를 댄다', h: '500만 원 · 모자라면 빚이 된다', f: (s, d) => `병원비를 댔다. ${josa(s.people[d.id].rel, '은는')} 무사히 회복하셨다.` + fx(s, { money: -500e4, stress: 5 }) },
    { t: '형제들과 나눈다', ok: s => s.olderSib + s.youngerSib > 0, h: s.olderSib + s.youngerSib > 0 ? '150만 원' : '형제가 없다', f: (s, d) => `형제들과 병원비를 나눠 냈다. ${josa(s.people[d.id].rel, '은는')} 무사히 회복하셨다.` + fx(s, { money: -150e4, stress: 3 }) },
  ],
});
E({
  id: 'parent_loss', cat: '가족', title: '이별',
  cond: (s) => parentsAlive(s).length > 0,
  init(s, d) { if (!d.id || !s.people[d.id] || !s.people[d.id].alive) { const a = parentsAlive(s); if (!a.length) { d.skip = true; return; } d.id = U.pick(a).id; } },
  text: (s, d) => { const p = s.people[d.id]; return `${josa(p.rel, '이가')} 돌아가셨다. 향년 ${pAge(s, p)}세.`; },
  ch: (s, d) => [{ t: '…', f: s => { const p = s.people[d.id]; const a = pAge(s, p); p.alive = false; milestone(s, `${age(s)}세에 ${josa(p.rel, '을를')} 떠나보냈다.`); return `${josa(p.rel, '이가')} 돌아가셨다. 향년 ${a}세. ${josa(p.rel, '을를')} 떠나보냈다.` + fx(s, { stress: 10 }); } }],
});

// ════════ 몸과 마음 ════════
// 스트레스 경고: 80을 넘을 때마다 한 번 (80 아래로 내려갔다가 다시 넘으면 또 뜬다. bodyMonth에서 다시 켠다)
// v139: 80을 넘은 그 달에 진행을 끊고 창으로 띄운다 (다른 창보다 먼저. pickEvent 맨 앞). 번아웃은 80이 넘는 달이 넉 달 이어져야 오니까 늘 경고가 먼저다
E({
  id: 'stress_warn', fixed: true, keepPop: true, cat: '몸과 마음', title: '⚠ 스트레스 경고',
  cond: s => s.stress >= 80 && !s.stressWarned && age(s) >= 7,
  init(s) { s.stressWarned = true; },
  text: s => `스트레스가 ${Math.round(s.stress)}까지 쌓였다.\n\n· 80이 넘는 달이 이어지면 번아웃이 올 수 있다\n· 85가 넘으면 일하는 동안 평판이 조금씩 떨어진다\n· 70이 넘는 달이 길어질수록 수명이 줄어든다`,
  ch: () => [{ t: '확인', f: () => '' }],
});
E({
  id: 'burnout', cd: 18, cat: '몸과 마음', title: '번아웃',
  p: s => s.hiStressM >= 4 ? 0.25 : 0,
  cond: s => !s.ill && age(s) >= 13,
  text: s => `요즘 아무것도 하기 싫다. 잠도 안 오고, 연습실 문 앞에서 숨이 막힌다.\n\n원인: 몇 달째 스트레스가 80을 넘었다 (지금 ${Math.round(s.stress)}).`,
  ch: () => [
    { t: '상담 치료를 받으며 일정을 줄인다', h: '80만 원 · 넉 달 동안 한 칸이 치료로 고정된다', f: s => { s.ill = { n: '번아웃', left: 4, rest: true }; s.hiStressM = 0; return '상담 치료를 받기 시작했다.' + fx(s, { money: -80e4, stress: -15 }); } },
    { t: '석 달 동안 모든 걸 멈추고 쉰다', h: '모든 일정이 쉬기로 바뀐다 · 회복이 빠르다', f: s => { s.ill = { n: '번아웃', left: 3, rest: true, all: true }; s.hiStressM = 0; return '모든 걸 멈추고 쉬기로 했다.' + fx(s, { stress: -40 }); } },
    { t: '버틴다', h: '치료하지 않으면 점점 나빠진다', f: s => '괜찮은 척 버텼다.' + fx(s, { stress: 8 }) },
  ],
});
E({
  id: 'collapse', cd: 12, cat: '몸과 마음', title: '쓰러졌다',
  // 번아웃을 버티고 계속 무리하면: 여덟 달 넘게 스트레스 80 이상, 지금 90 이상
  p: s => !s.ill && s.hiStressM >= 8 && s.stress >= 90 ? 0.2 : 0,
  cond: s => age(s) >= 13,
  text: s => `연습 도중 눈앞이 하얘지더니 그대로 쓰러졌다. 눈을 떠 보니 병원이었다.\n\n원인: 여덟 달 넘게 스트레스가 80을 넘었고, 지금은 ${Math.round(s.stress)}까지 쌓였다.`,
  ch: () => [{ t: '입원한다', h: '200만 원 · 두 달 동안 모든 일정이 멈춘다', f: s => { s.ill = { n: '과로', left: 2, rest: true, all: true }; s.hiStressM = 0; return '두 달 동안 입원해 쉬었다.' + fx(s, { money: -200e4, stress: -30 }); } }],
});
E({
  id: 'nodule', cd: 24, cat: '몸과 마음', title: '목이 이상하다',
  p: s => s.slots.some(sl => sl.act === 'p_vocal' || sl.act === 'p_rap') && s.stress > 70 ? 0.03 : 0,
  cond: s => !s.ill && age(s) >= 13,
  text: s => `노래할 때 고음이 갈라진다. 이비인후과에서 성대 결절 진단을 받았다.\n\n원인: 지친 상태(스트레스 ${Math.round(s.stress)})로 노래를 많이 했다.`,
  ch: () => [
    { t: '수술을 받는다', h: '300만 원 · 두 달 쉰다 · 확실히 낫는다', f: s => { s.ill = { n: '성대 결절 수술', left: 2, rest: true }; return '성대 결절 수술을 받았다.' + fx(s, { money: -300e4 }); } },
    { t: '쉬면서 관리한다', h: '석 달 동안 실력이 잘 안 는다', f: s => { s.ill = { n: '성대 결절', left: 3 }; return '목을 아끼며 관리하기로 했다.'; } },
    { t: '무시하고 계속 부른다', h: '보컬이 떨어질 수 있다', f: s => U.chance(0.5) ? '무리해서 불렀다. 목소리가 예전 같지 않다.' + fx(s, { sk: { vocal: -5 }, stress: 5 }) : '다행히 크게 나빠지지는 않았다.' },
  ],
});
E({
  id: 'injury', cd: 24, cat: '몸과 마음', title: '부상',
  p: s => s.slots.some(sl => sl.act === 'p_dance') && s.stress > 70 ? 0.04 : 0,
  cond: s => !s.ill && age(s) >= 10,
  text: s => `춤 연습을 하다가 발목을 접질렸다. 병원에서는 인대가 늘어났다고 한다.\n\n원인: 지친 상태(스트레스 ${Math.round(s.stress)})로 무리하게 연습했다.`,
  ch: () => [
    { t: '깁스하고 쉰다', h: '두 달 동안 한 칸이 치료로 고정된다', f: s => { s.ill = { n: '발목 부상', left: 2, rest: true }; return '깁스를 하고 쉬었다.' + fx(s, { money: -50e4 }); } },
    { t: '테이핑하고 계속한다', h: '더 크게 다칠 수 있다', f: s => U.chance(0.4) ? '무리하다 더 크게 다쳤다.' + (s.ill = { n: '발목 재부상', left: 4, rest: true }, fx(s, { money: -150e4, stress: 6 })) : '다행히 괜찮았다.' },
  ],
});

// ════════ 친구와 연애 ════════
E({
  id: 'friend_call', cd: 6, p: 0.035, cat: '친구', title: '친구의 연락', auto: 0, autoK: (s, d) => d.blind ? '' : 'flavor',
  // 이사로 멀어진 예전 동네 친구(far)는 성인이 되기 전에는 연락이 오지 않는다
  cond: s => people(s, n => ['친구', '동기', '선배', '동료'].includes(n.rel) && n.aff >= 20 && !(n.far && age(s) < 19)).length > 0,
  init(s, d) {
    const pool = people(s, n => ['친구', '동기', '선배', '동료'].includes(n.rel) && n.aff >= 20 && !(n.far && age(s) < 19));
    if (!pool.length) { d.skip = true; return; }
    d.id = U.pick(pool).id; d.kid = age(s) < 19;
    d.plan = U.pick(d.kid ? ['방과 후에 떡볶이 먹으러 가자고 한다', '주말에 같이 코인노래방 가자고 한다', '같이 숙제하자며 집에 놀러 오라고 한다', '시험 끝나면 같이 영화 보자고 한다'] : ['밥 한번 먹자고 한다', '주말에 술 한잔하자고 한다', '요즘 힘든 일이 있다며 이야기 좀 들어 달라고 한다']);
  },
  text: (s, d) => { const n = s.people[d.id]; if (d.kid) return `친구 ${josa(n.name, '이가')} ${d.plan}.`; return `${n.rel} ${n.name}에게서 오랜만에 연락이 왔다. 요즘 ${josa(n.job, '으로')} 지낸다고 한다. ${d.plan}.`; },
  ch: (s, d) => [
    { t: d.kid ? '같이 간다' : '만나러 간다', f: s => {
      const n = s.people[d.id]; aff(n, 8); n.contactT = s.t;
      if (d.kid) return `${josa(n.name, '과와')} 신나게 놀았다.` + fx(s, { stress: -6 });
      // 애인이 없으면 가끔 그 친구가 소개팅을 시켜 준다. 한 번 들어오면 3년 동안은 다시 들어오지 않는다 (내가 고른 새로운 만남은 따로)
      const blind = !partner(s) && !(s.cd.blind > s.t) && U.chance(0.25) && queueEv(s, 'meet_pick', 1, { src: 'friend', by: n.id });
      if (blind) { s.cd.blind = s.t + 36; d.blind = true; }
      return `${josa(n.name, '과와')} 밤늦게까지 이야기를 나눴다.` + (blind ? ` 헤어질 때 ${josa(n.name, '이가')} "너 요즘 만나는 사람 없지? 괜찮은 사람 있는데 소개해 줄까?" 하고 물었다.` : '') + fx(s, { stress: -6, money: -3e4, rep: 1 });
    } },
    { t: d.kid ? '오늘은 못 간다고 한다' : '다음에 보자고 한다', f: s => { aff(s.people[d.id], -4); return `${s.people[d.id].name}에게 ${d.kid ? '오늘은 못 간다고' : '다음에 보자고'} 했다.`; } },
  ],
});
E({
  id: 'love_npc', cd: 24, cat: '연애', title: '설레는 사람',
  p: s => !partner(s) && age(s) >= 19 ? 0.015 : 0,
  init(s, d) {
    const g0 = myGender(s);
    const cand = people(s, n => ['친구', '동료', '동기', '선배'].includes(n.rel) && n.aff >= 55 && likes(n, g0) && !n.married);
    if (cand.length && U.chance(0.6)) { d.id = U.pick(cand).id; d.old = true; return; }
    const g = g0 === '여' ? '남' : '여';
    const job = U.pick(['회사원', '대학원생', '카페 사장', '간호사', '개발자', '디자이너', '공무원']);
    const n = makePerson(s, { g, orient: 's', age: age(s) + U.int(-3, 4), rel: '지인', job, aff: 50, met: '친구 소개로 만난 사람' });
    d.id = n.id;
  },
  text: (s, d) => { const n = s.people[d.id]; return `${d.old ? '오래 알던' : '최근 알게 된'} ${n.job} ${n.name}(${n.g === '여' ? '여성' : '남성'})${josa(n.name, '이가').slice(n.name.length)} 자꾸 생각난다. ${traitLine(n.trait)}`; },
  ch(s, d) {
    const n = s.people[d.id];
    return [
      { t: '고백한다', h: confessWord(s, n, true), f: s => confess(s, s.people[d.id]) },
      { t: '조금 더 가까워진 뒤에', f: s => { aff(s.people[d.id], 6); return `${s.people[d.id].name}에게 먼저 밥을 사며 조금씩 가까워졌다.`; } },
      { t: '마음을 접는다', f: () => '마음을 접기로 했다.' },
    ];
  },
});
// ── 고백을 받는다 (피드백 21): 나를 좋아하던 사람이 먼저 고백한다. 외모·스타성이 높을수록 자주 ──
// 아는 사람 중 나를 연애 상대로 볼 수 있고 친한 사람(친밀도 50 이상)이 먼저, 없으면 학교·일터에서 나를 지켜보던 사람
function crushCands(s) {
  const g0 = myGender(s);
  return people(s, n => ['친구', '동료', '동기', '선배', '지인', '멤버'].includes(n.rel) && n.alive !== false && !n.hidden && n.aff >= 50 && likes(n, g0) && !n.married && !kidToAdult(s, n) && !adultToKid(s, n) && Math.abs(pAge(s, n) - age(s)) <= 12);
}
E({
  id: 'confessed', cd: 18, cat: '연애', title: '고백', tal: ['looks', 'star'],
  p: s => !partner(s) && age(s) >= 14 && !s.army ? 0.012 : 0,
  init(s, d) {
    const cand = crushCands(s);
    if (cand.length && U.chance(0.6)) { d.id = U.pick(cand).id; d.old = true; return; }
    const g0 = myGender(s), g = g0 === '여' ? '남' : '여', a = age(s), kid = a < 19;
    const job = kid ? '학생' : U.pick(MEET_JOBS.concat(['스태프', '방송 작가', '매니저']));
    const met = kid ? U.pick(['옆 반 학생', '같은 학원 학생', '같은 반 친구']) : U.pick(['일하며 알게 된 사람', '단골 카페에서 알게 된 사람', '친구의 친구']);
    const n = makePerson(s, { g, orient: 's', age: kid ? a + U.int(-1, 1) : a + U.int(-4, 4), rel: '지인', job, aff: 55, met });
    d.id = n.id;
  },
  text: (s, d) => {
    const n = s.people[d.id], kid = age(s) < 19;
    const who = d.old ? `${n.rel} ${n.name}` : `${n.met} ${n.name}`;
    const how = kid ? '수업이 끝나고 잠깐 이야기 좀 하자더니, 얼굴이 빨개져서 나를 좋아한다고 했다.' : '할 말이 있다며 따로 불러내더니, 오래전부터 좋아했다고 고백했다.';
    return `${josa(who, '이가')} ${how}\n\n${n.name} · ${pAge(s, n)}세 · ${n.job} · ${TRAIT_BY[n.trait].n}${soulTag(n)}`;
  },
  ch: (s, d) => {
    const n = s.people[d.id];
    return [
      { t: '사귄다', f: s => { n.rel = '연인'; n.dateT = s.t; n.hidden = false; s.partner = n.id; aff(n, 12); n.contactT = s.t; milestone(s, `${age(s)}세에 ${josa(n.name, '과와')} 사귀기 시작했다.`); return `${n.name}의 고백을 받아 줬다. 오늘부터 1일이다.` + fx(s, { stress: -10 }); } },
      { t: '조금 더 알아 가고 싶다고 한다', f: s => { aff(n, 4); n.contactT = s.t; if (!d.old) n.rel = '지인'; return `${n.name}에게 아직은 잘 모르겠다고, 조금 더 알아 가고 싶다고 했다.`; } },
      { t: '거절한다', f: s => { aff(n, d.old ? -15 : -5); return `${n.name}의 고백을 정중히 거절했다.` + (d.old ? ' 사이가 조금 어색해졌다.' : ''); } },
    ];
  },
});
// ── 연예계 활동 중 다른 아이돌이 다가온다 (v89): 먼저 고백하거나, 관심을 보이며 연락을 이어 온다 ──
// 연예계 활동: 무대·방송에 얼굴을 내미는 일 (아이돌 활동 · 가수 · 밴드 · 배우 · 예능 · 모델). 상대도 아이돌이라 사귀면 열애설이 날 수 있다 (scandal.js)
function showbizOn(s) { return (typeof isIdol === 'function' && isIdol(s)) || ['solo', 'band', 'actor', 'variety', 'model'].some(id => trackOn(s, id) && !['forming', 'trainee', 'prep'].includes(s.tracks[id].st)); }
function showbizPlace(s) {
  if ((typeof isIdol === 'function' && isIdol(s)) || ['solo', 'band'].some(id => trackOn(s, id))) return U.pick(['음악방송 대기실에서 자주 마주치던', '연말 무대 리허설에서 처음 인사한', '같은 음악 페스티벌에 나간']);
  if (trackOn(s, 'actor')) return U.pick(['드라마에 함께 출연한', '같은 촬영장에 있던']);
  if (trackOn(s, 'variety')) return U.pick(['예능 프로그램에 같이 나온', '예능 녹화장에서 자주 마주치던']);
  return U.pick(['같은 화보를 찍은', '패션쇼 무대 뒤에서 인사한']);
}
E({
  id: 'star_crush', cd: 24, cat: '연애', tal: ['looks', 'star'],
  title: (s, d) => d.kind === 'confess' ? '아이돌의 고백' : '아이돌의 연락',
  p: s => !partner(s) && age(s) >= 17 && !s.army && showbizOn(s) ? 0.02 : 0,
  init(s, d) {
    const a = age(s), g0 = myGender(s), g = meetGender(s), kid = a < 19;
    d.grp = groupNameRaw();
    const n = makePerson(s, { g, orient: g === g0 ? 'g' : U.pick(['s', 's', 'b']), age: kid ? U.clamp(a + U.int(-1, 1), 16, 18) : Math.max(19, a + U.int(-4, 4)), rel: '지인', job: `「${d.grp}」 멤버`, aff: 55, met: `${showbizPlace(s)} 「${d.grp}」 멤버` });
    n.idol = true; n.grp = d.grp;
    d.id = n.id; d.kind = U.chance(0.45) ? 'confess' : 'dm';
  },
  text: (s, d) => {
    const n = s.people[d.id], hard = typeof datingLv === 'function' && datingLv(s) === 'hard';
    const head = d.kind === 'confess'
      ? `${n.met} ${josa(n.name, '이가')} 스케줄이 끝난 뒤 잠깐 이야기 좀 하자더니, 처음 봤을 때부터 좋아했다고 고백했다.`
      : `${n.met} ${n.name}에게서 SNS 메시지가 왔다. "요즘 활동 잘 보고 있어요!"로 시작한 대화가 며칠째 이어지고 있다. 아무래도 나한테 관심이 있는 눈치다.`;
    return head + `\n\n${n.name} · ${pAge(s, n)}세 · 「${d.grp}」 멤버 · ${TRAIT_BY[n.trait].n}${soulTag(n)}` + (hard ? '\n\n아이돌끼리의 연애는 들키면 열애설이 크게 날 수 있다.' : '');
  },
  ch: (s, d) => {
    const n = s.people[d.id];
    if (d.kind === 'confess') return [
      { t: '사귄다', f: s => { n.rel = '연인'; n.dateT = s.t; n.hidden = false; s.partner = n.id; aff(n, 12); n.contactT = s.t; milestone(s, `${age(s)}세에 아이돌 ${josa(n.name, '과와')} 사귀기 시작했다.`); return `${n.name}의 고백을 받아 줬다. 오늘부터 1일이다. 당분간은 둘만의 비밀이다.` + fx(s, { stress: -10 }); } },
      { t: '조금 더 알아 가고 싶다고 한다', f: s => { aff(n, 4); n.contactT = s.t; return `${n.name}에게 아직은 잘 모르겠다고, 조금 더 알아 가고 싶다고 했다.`; } },
      { t: '거절한다', f: s => { aff(n, -8); return `${n.name}의 고백을 정중히 거절했다. 다음에 마주치면 조금 어색할 것 같다.`; } },
    ];
    return [
      { t: '연락을 이어 간다', f: s => { n.aff = Math.max(n.aff, 62); n.contactT = s.t; return `${josa(n.name, '과와')} 매일 연락을 주고받기 시작했다. 묘한 기류가 흐른다.` + fx(s, { stress: -3 }); } },
      { t: '내가 먼저 고백한다', h: confessWord(s, n, true), f: s => confess(s, n) },
      { t: '선을 긋는다', f: s => { aff(n, -6); return `${n.name}에게 좋은 동료로 지내자고 선을 그었다.`; } },
    ];
  },
});
// ── 새로운 만남 (인간관계 창): 소개팅 앱 · 취미 동호회 · 결혼정보회사, 그리고 친구가 시켜 주는 소개팅 ──
// 후보 중 한 사람을 만나 보고, 첫 만남이 잘되면 '썸' 상대(친밀도 58~70)로 인간관계에 남는다. 고백은 인간관계 창이나 '설레는 사람' 사건에서 한다
Object.assign(SP_PAY, { '의사': 1000, '변호사': 800, '회계사': 600, '약사': 550, '대기업 회사원': 480, '스타트업 대표': 400 });
const MEET_JOBS = ['회사원', '대학원생', '카페 사장', '간호사', '개발자', '디자이너', '공무원', '은행원', '교사', '프리랜서 디자이너'];
// c: 비용(만 원), cd: 다시 할 수 있을 때까지 개월, min: 나이, k: 후보 수
const MEET_SRC = {
  app: { n: '소개팅 앱', ic: '📱', c: 3, cd: 2, min: 19, k: 3, met: '소개팅 앱에서 만난 사람', jobs: MEET_JOBS },
  club: { n: '취미 동호회', ic: '🎳', c: 5, cd: 3, min: 19, k: 2, met: '동호회에서 만난 사람', jobs: MEET_JOBS },
  duo: { n: '결혼정보회사', ic: '💍', c: 300, cd: 6, min: 28, k: 3, met: '결혼정보회사 소개로 만난 사람', jobs: ['의사', '변호사', '회계사', '약사', '대기업 회사원', '은행원', '공무원', '교사', '스타트업 대표'] },
  friend: { n: '친구 소개', ic: '🤝', c: 0, cd: 0, min: 19, k: 1, met: '친구 소개로 만난 사람', jobs: MEET_JOBS },
};
function meetWhy(s, src) {
  const M = MEET_SRC[src];
  if (partner(s)) return '지금 만나는 사람이 있다';
  if (s.pending) return '지금 일어난 일을 먼저 처리해야 한다';
  if (age(s) < M.min) return `${M.min}세부터`;
  if (s.cd['meet_' + src] > s.t) return `${s.cd['meet_' + src] - s.t}개월 뒤에 다시`;
  if (s.money < M.c * 1e4) return '돈이 모자라다';
  return '';
}
// 만날 사람의 성별: 내 성적 지향을 따른다
function meetGender(s) { const p = me(s), g = p.g, other = g === '여' ? '남' : '여', o = p.orient || 's'; return o === 'g' ? g : o === 'b' ? U.pick([g, other]) : other; }
function meetStart(s, src, by) {
  const M = MEET_SRC[src];
  if (M.c) addMoney(s, -M.c * 1e4, M.n);
  if (M.cd) s.cd['meet_' + src] = s.t + M.cd;
  fireEvent(s, 'meet_pick', { src, by });
  return '';
}
// 첫 만남이 잘될 가능성: 내 외모와 평판, 상대 성격, 그리고 운
function meetChem(s, n) {
  const p = me(s);
  return U.clamp(0.4 + (p.tal.looks - 50) / 150 + (s.rep - 50) / 300 + (['kind', 'calm', 'chatty'].includes(n.trait) ? 0.08 : ['blunt', 'sensitive', 'perfect'].includes(n.trait) ? -0.06 : 0), 0.12, 0.85);
}
function meetClean(s, d, keep) { for (const id of d.ids || []) if (id !== keep && s.people[id] && s.people[id].hidden) delete s.people[id]; }
E({
  id: 'meet_pick', cat: '연애', title: '새로운 만남',
  cond: s => !partner(s) && age(s) >= 19,
  init(s, d) {
    const M = MEET_SRC[d.src], by = d.by && s.people[d.by], g = myGender(s);
    d.met = d.src === 'friend' && by ? `${by.name} 소개로 만난 사람` : M.met;
    d.ids = [];
    for (let i = 0; i < M.k; i++) {
      const mg = meetGender(s);
      const n = makePerson(s, { g: mg, orient: mg === g ? 'g' : U.pick(['s', 's', 'b']), age: Math.max(19, age(s) + U.int(-4, 4)), rel: '지인', job: U.pick(M.jobs), aff: 40, met: d.met });
      n.hidden = true; d.ids.push(n.id);
    }
  },
  text: (s, d) => {
    const by = d.by && s.people[d.by];
    return d.src === 'friend' ? `${by ? josa(by.name, '이가') : '친구가'} 아는 사람을 소개해 주겠다고 한다. 한번 만나 볼까?`
      : d.src === 'app' ? '소개팅 앱에서 대화가 잘 통한 사람들이다. 누구를 만나 볼까?'
      : d.src === 'duo' ? '결혼정보회사에서 세 사람을 소개해 줬다. 누구를 만나 볼까?'
      : '동호회에서 자주 마주치는 사람들이 있다. 누구에게 먼저 말을 걸어 볼까?';
  },
  ch: (s, d) => d.ids.filter(id => s.people[id]).map(id => {
    const n = s.people[id];
    return { t: `${n.name} · ${pAge(s, n)}세 · ${n.job}`, h: `${n.g === '여' ? '여성' : '남성'} · ${TRAIT_BY[n.trait].n} · ${n.look}${soulTag(n)}`, f: s => {
      meetClean(s, d, n.id);
      if (U.chance(meetChem(s, n))) { n.hidden = false; n.aff = U.int(58, 70); n.contactT = s.t; return `${josa(n.name, '과와')} 만났다. 이야기가 잘 통해서 시간 가는 줄 몰랐다. 다음에 또 보기로 했다.` + fx(s, { stress: -5 }); }
      delete s.people[n.id];
      return `${josa(n.name, '과와')} 만났지만 어색한 분위기로 끝났다. 다시 연락은 오지 않았다.` + fx(s, { stress: 2 });
    } };
  }).concat([{ t: d.src === 'friend' ? '거절한다' : '이번엔 만나지 않는다', f: s => { meetClean(s, d, null); return d.src === 'friend' ? '소개팅은 사양했다.' : '이번엔 아무도 만나지 않았다.'; } }]),
});
E({
  id: 'marriage', cd: 12, cat: '연애', title: '결혼 이야기',
  p: s => { const p = partner(s); return p && p.rel === '연인' && s.t - (p.dateT || s.t) >= 24 && age(s) >= 27 && p.aff >= 70 ? 0.06 : 0; },
  text: s => `${josa(partner(s).name, '과와')} 만난 지 ${Math.floor((s.t - partner(s).dateT) / 12)}년. 결혼 이야기가 나왔다.`,
  ch: () => [
    { t: '결혼한다', h: '결혼식 2,000만 원 · 결혼하면 두 사람의 재산을 합친다', f: s => marryNow(s) },
    { t: '아직은 아니다', f: s => { aff(partner(s), -6); return '결혼은 조금 더 생각해 보자고 했다.'; } },
  ],
});
// 결혼: 연인을 배우자로, 재산을 합치고, 본가에 살면 신혼집을 구한다. wedding: 결혼식 비용
function marryNow(s, wedding = 2000e4, why) {
  const p = partner(s), wasDorm = isDorm(s); p.rel = '배우자'; aff(p, 10); s.marriedT = s.t; p.callT = s.t; homemakerFix(s, p); s.kidPlan = {};
  milestone(s, `${age(s)}세에 ${josa(p.name, '과와')} 결혼했다.`);
  const sv = spouseSavings(s, p);
  if (sv > 0) addMoney(s, sv, '배우자 재산 합침');
  // 결혼하면 본가에서 나와 둘이 살 집을 구한다 (지금 사는 동네 월세 투룸부터. 생활 창에서 옮길 수 있다). 원룸에 살고 있었으면 이사할 집을 고른다 (home_wed)
  let mv = '';
  // 기획사 숙소에 살다 결혼하면 숙소를 나와 신혼집으로 간다 (숙소를 나올 때 묻는 창은 다시 띄우지 않는다)
  if (s.home.mode === 'parents' && !isDorm(s) && !s.army) { moveTo(s, s.region, 'monthly', 'm'); mv = ` ${wasDorm ? '기획사 숙소' : '본가'}에서 나와 ${s.place}에 신혼집(${homeName('monthly', 'm')})을 구했다.`; if (wasDorm) s.dormWas = false; }
  else if (s.home.mode === 'alone' && homeSize(s.home) === 's' && !isDorm(s) && !s.army) queueEv(s, 'home_wed', 0);
  let tm = ''; { const it = s.tracks.idol; if (it && it.st === 'trainee' && it.team) { it.team = false; it.prep = 0; tm = ` 결혼 소식을 들은 ${it.agN}에서 나를 데뷔조에서 뺐다.`; } }
  return (why || `${josa(p.name, '과와')} 결혼했다!`) + tm + (sv > 0 ? ` 두 사람의 재산을 합쳤다. (${josa(p.name, '이가')} 모아 둔 돈 ${fmtWon(sv)})` : '') + mv + fx(s, { money: -wedding, stress: -12 });
}
// 결혼하면 원룸(작은 집)에서 살 수 없다: 같은 동네의 둘이 살 집(투룸·아파트)으로 옮긴다. 월세 투룸은 돈이 모자라도 고를 수 있다 (빚이 된다)
E({
  id: 'home_wed', cat: '결혼', title: '둘이 살 집',
  cond: s => married(s) && (s.home.mode === 'parents' || (s.home.mode === 'alone' && homeSize(s.home) === 's')) && !isDorm(s) && !s.army && !needApt(s),
  text: s => `${josa(partner(s).name, '과와')} 둘이 살기에 ${s.home.mode === 'parents' ? '본가는 불편하다. 둘이 살 집을 구하자' : '지금 원룸은 너무 좁다. 이사할 집을 고르자'}.\n\n지금 사는 곳은 ${s.place}.`,
  ch: s => ['monthly', 'jeonse', 'own'].map(type => {
    const need = homeNeed(s.region, type, 'm'), mc = homeMonthly(s.region, type, 'm'), nm = homeName(type, 'm'), back = Math.max(0, houseAsset(s));
    return { t: `${josa(nm, '으로')} 옮긴다`, h: `${type === 'monthly' ? `보증금 ${fmtWon(need)}` : `내 돈 ${fmtWon(need)} · 나머지는 대출`} · 매달 ${mc}만 원${type === 'monthly' ? ' · 돈이 모자라면 빚이 된다' : ''}`, ok: type === 'monthly' ? undefined : s => s.money + back >= need, f: s => moveTo(s, s.region, type, 'm') };
  }),
});
// 자녀가 셋이 되면 아파트로 옮겨야 한다 (피드백 24): 월세 넓은 아파트는 돈이 모자라도 고를 수 있다 (빚이 된다)
const KID_APT = [['monthly', 'l'], ['jeonse', 'm'], ['own', 'm']];
E({
  id: 'home_kids', cat: '가족', title: '아이 셋과 살 집',
  cond: s => needApt(s) && !inApt(s) && !isDorm(s) && !s.army,
  text: s => `아이가 셋이 되니 지금 집은 너무 좁다. 아파트로 이사해야 한다.\n\n지금 사는 곳은 ${s.place}.`,
  ch: s => KID_APT.map(([type, size]) => {
    const need = homeNeed(s.region, type, size), mc = homeMonthly(s.region, type, size), nm = homeName(type, size), back = Math.max(0, houseAsset(s));
    return { t: `${josa(nm, '으로')} 옮긴다`, h: `${type === 'monthly' ? `보증금 ${fmtWon(need)}` : `내 돈 ${fmtWon(need)} · 나머지는 대출`} · 매달 ${mc}만 원${type === 'monthly' ? ' · 돈이 모자라면 빚이 된다' : ''}`, ok: type === 'monthly' ? undefined : s => s.money + back >= need, f: s => moveTo(s, s.region, type, size) };
  }),
});
// 청혼 (인간관계 창): 사귄 지 3년이 넘은 연인에게. 친밀도 50이면 0%, 100이면 100%
const PROPOSE_YEARS = 3;
function canPropose(s, n) { return !!n && n.rel === '연인' && s.partner === n.id && age(s) >= 19 && pAge(s, n) >= 19 && s.t - (n.dateT || s.t) >= PROPOSE_YEARS * 12 && !s.army; }
function proposeP(n) { return U.clamp((n.aff - 50) / 50, 0, 1); }
function propose(s, n) {
  if (U.chance(proposeP(n))) return marryNow(s, 2000e4, `${n.name}에게 청혼했다. ${josa(n.name, '이가')} 눈물을 글썽이며 고개를 끄덕였다. 결혼했다!`);
  s.cd.propose = s.t + 12; aff(n, -8);
  return `${n.name}에게 청혼했지만, ${josa(n.name, '은는')} 아직 결혼은 생각하지 않는다고 했다. 분위기가 조금 어색해졌다.` + fx(s, { stress: 6 });
}

// ── 속도위반: 결혼 전에 아이가 생겼다 ──
// 결혼하면 몇 달 뒤 아이가 태어난다. 결혼하지 않겠다고 하면 이름이 알려진 사람은 바로 논란이 된다
E({
  id: 'oops_baby', cd: 24, cat: '연애', title: '두 줄',
  p: s => { const p = partner(s); return p && p.rel === '연인' && p.g !== myGender(s) && age(s) >= 20 && pAge(s, p) >= 20 && canConceive(s, p) && s.t - (p.dateT || s.t) >= 6 && kids(s).length < 3 && !s.preg && !hasQ(s, 'baby') && !hasQ(s, 'oops_birth') && !hasQ(s, 'preg_news') ? 0.004 : 0; },
  init(s, d) { const p = partner(s); if (!p) { d.skip = true; return; } d.id = p.id; d.fame = scFame(s) >= 3000 || anyTrackActive(s); },
  text: (s, d) => { const p = s.people[d.id]; return myGender(s) === '여' ? `요즘 몸이 이상해서 테스트기를 사 봤다. 선명한 두 줄이 떴다. ${p.name}의 아이다.` : `${josa(p.name, '이가')} 할 말이 있다며 테스트기를 내밀었다. 선명한 두 줄이 떠 있었다.`; },
  ch: (s, d) => {
    const p = s.people[d.id];
    return [
      { t: '결혼한다', h: '결혼식 1,000만 원 · 결혼하면 두 사람의 재산을 합친다 · 아이는 일곱 달쯤 뒤에 태어난다', f: s => {
        const x = marryNow(s, 1000e4, `서둘러 ${josa(p.name, '과와')} 결혼했다. 작은 결혼식을 올렸다.`);
        queueEv(s, 'oops_birth', 7, {}, true);
        s.preg = { left: 7, me: myGender(s) === '여' };
        if (pregMe(s)) queueEv(s, 'taegyo', 0, {}, true); else taeSpouse(s); // v216: 배우자가 임신했으면 태교는 배우자가 정한다 (v217: 말은 하지 않는다)
        // 이름이 알려진 사람이면 '속도위반 결혼' 기사가 난다. 아이돌·버튜버는 팬이 많이 떠난다
        let news = '';
        if (d.fame) {
          const dl = datingLv(s), frac = { hard: 0.18, mid: 0.05, soft: 0 }[dl];
          const loss = {}; for (const m of MK) loss['f' + m] = -Math.round(s.fans[m] * frac);
          news = `\n\n'속도위반 결혼' 기사가 났다. ${dl === 'hard' ? '팬 커뮤니티가 크게 술렁였다.' : dl === 'mid' ? '놀랐다는 반응과 축하가 섞였다.' : '축하한다는 댓글이 대부분이었다.'}` + fx(s, Object.assign({ pop: dl === 'soft' ? 2 : -Math.round(frac * 30), fame: 3 }, loss));
        }
        return x + news;
      } },
      { t: '결혼하지 않는다', f: s => {
        breakUp(s, p, '');
        s.flags.oopsLeft = { id: p.id, t: s.t };
        // 아이는 상대가 키운다. 나는 매달 양육비를 보낸다 (자녀로 남는다)
        queueEv(s, 'oops_birth', 7, { ex: p.id }, true);
        if (myGender(s) === '여') { s.preg = { left: 7, me: true }; queueEv(s, 'taegyo', 0, {}, true); }
        const x = myGender(s) === '여' ? `${josa(p.name, '과와')} 헤어졌다. 아이는 낳은 뒤 ${josa(p.name, '이가')} 데려가 키우기로 했다.` : `${josa(p.name, '과와')} 헤어졌다. 아이는 ${josa(p.name, '이가')} 혼자 낳아 키우겠다고 했다.`;
        if (d.fame && !s.scandal) { startScandal(s, 'oops', 'real'); return x; }
        return x + fx(s, { rep: -8, stress: 10 });
      } },
    ];
  },
});
E({
  id: 'oops_birth', cat: '가족', title: '아이가 태어났다',
  cond: s => true,
  init(s, d) {
    const ex = d.ex && s.people[d.ex];
    // 결혼해서 낳은 아이는 내가 이름을 짓는다 (baby 창). 헤어진 상대가 혼자 낳아 키우는 아이는 그쪽이 짓는다
    if (!d.ex) { d.skip = true; fireEvent(s, 'baby', { late: true }); return; }
    const c = makeChild(s, ex || null);
    taeBoost(s, c); // 임신 상태를 지우기 전에 (고른 태교를 본다)
    s.preg = null;
    d.id = c.id;
    if (ex) { c.withEx = ex.id; aff(c, -35); }
    milestone(s, `${age(s)}세에 ${c.g === '여' ? '딸' : '아들'} ${josa(c.name, '이가')} 태어났다.`);
  },
  text: (s, d) => { const c = s.people[d.id], ex = d.ex && s.people[d.ex]; return ex ? (myGender(s) === '여' ? `${c.g === '여' ? '딸' : '아들'}을 낳았다. 이름은 ${c.name}. 약속대로 ${josa(ex.name, '이가')} 데려가 키우고, 나는 매달 양육비를 보내기로 했다.` : `${josa(ex.name, '이가')} ${c.g === '여' ? '딸' : '아들'}을 낳았다는 소식을 들었다. 이름은 ${c.name}. 매달 양육비를 보내기로 했다.`) : `${c.g === '여' ? '딸' : '아들'}이 태어났다. 이름은 ${c.name}.`; },
  kid: (s, d) => d.id,
  ch: (s, d) => [{ t: '확인', f: s => { const c = s.people[d.id]; if (!d.ex) fireEvent(s, 'baby_heir', { id: c.id }); return d.ex ? `${c.name}의 양육비를 보내기 시작했다.` : `${c.g === '여' ? '딸' : '아들'} ${josa(c.name, '이가')} 태어났다.` + fx(s, { stress: -6 }); } }],
});
// 결혼 생활이 식으면(친밀도가 낮으면) 불륜 사건이 생긴다
E({
  id: 'affair', cd: 36, cat: '결혼', title: '흔들리는 결혼',
  p: s => { const p = partner(s); return isSpouse(p) && p.aff < 35 && !s.affair ? 0.025 : 0; },
  init(s, d) {
    if (!isSpouse(partner(s))) { d.skip = true; return; }
    if (U.chance(0.55)) { d.sp = true; return; }
    const g = partner(s).g;
    const n = makePerson(s, { g, orient: g === myGender(s) ? 'g' : 's', age: age(s) + U.int(-6, 3), rel: '지인', job: U.pick(['배우', '모델', '스타일리스트', '방송 작가', '매니저', '작곡가']), aff: 55, met: '일하며 알게 된 사람' });
    d.id = n.id;
  },
  text: (s, d) => { const p = partner(s); if (d.sp) return `배우자 ${p.name}의 휴대폰에 낯선 이름으로 온 메시지가 떠 있었다. 몇 달째 다른 사람을 만나고 있었다.`; const n = s.people[d.id]; return `${josa(p.name, '과와')}의 사이가 식어 가던 무렵, 일하며 알게 된 ${n.job} ${josa(n.name, '이가')} 자꾸 따로 만나자고 연락해 온다.`; },
  ch(s, d) {
    if (d.sp) return [
      { t: '이혼한다', h: '가진 돈의 절반을 나눈다', f: s => divorce(s, partner(s)) + fx(s, { stress: 15 }) },
      { t: '한 번만 용서한다', f: s => { aff(partner(s), 20); return `${josa(partner(s).name, '을를')} 한 번만 용서하기로 했다.` + fx(s, { stress: 8 }); } },
      { t: '모른 척한다', f: s => '아무것도 못 본 척했다.' + fx(s, { stress: 12 }) },
    ];
    const n = s.people[d.id];
    return [
      { t: '선을 넘는다', f: s => { s.affair = { id: n.id, t: s.t }; aff(n, 15); n.contactT = s.t; return `${josa(n.name, '과와')} 몰래 만나기 시작했다.` + fx(s, { stress: -6 }); } },
      { t: '선을 긋는다', f: s => { aff(n, -10); return `${n.name}에게 더 이상 연락하지 말라고 했다.`; } },
      { t: '배우자와 여행을 떠난다', h: '200만 원', ok: s => s.money >= 200e4, f: s => { aff(partner(s), 18); return `${josa(partner(s).name, '과와')} 둘이서 여행을 다녀왔다.` + fx(s, { money: -200e4, stress: -8 }); } },
    ];
  },
});
// 몰래 만나던 사람이 있으면 언젠가 들킨다. 이름이 알려졌으면 기사까지 난다
E({
  id: 'affair_out', cd: 6, cat: '결혼', title: '들킨 관계',
  p: s => s.affair && isSpouse(partner(s)) ? 0.06 : 0,
  init(s, d) {
    if (!s.affair || !isSpouse(partner(s))) { s.affair = null; d.skip = true; return; }
    d.press = totalFans(s) >= 1e4 && U.chance(0.6);
    // 기사가 나면 논란이 된다 (대응은 다음 창에서 고른다)
    if (d.press && !s.scandal) startScandal(s, 'affair', 'real');
  },
  text: (s, d) => { const n = s.people[s.affair.id]; return `${josa(partner(s).name, '이가')} ${josa(n ? n.name : '그 사람', '과와')}의 일을 알게 됐다.` + (d.press ? '\n\n누군가 찍은 사진이 기자에게 넘어가 불륜 기사까지 났다.' : ''); },
  ch: () => [
    { t: '용서를 빈다', h: '받아 줄 가능성 25%', f: s => { const p = partner(s); s.affair = null; if (U.chance(0.25)) { aff(p, 5); return `${josa(p.name, '이가')} 마지막으로 한 번만 믿어 보겠다고 했다.` + fx(s, { stress: 10 }); } return divorce(s, p, `용서를 빌었지만 ${josa(p.name, '은는')} 이혼을 원했다.`) + fx(s, { stress: 15 }); } },
    { t: '이혼한다', h: '가진 돈의 절반을 나눈다', f: s => divorce(s, partner(s)) + fx(s, { stress: 10 }) },
  ],
});
E({
  id: 'breakup', cd: 6, cat: '연애', title: '이별의 기척',
  p: s => { const p = partner(s); return p && p.rel === '연인' && p.aff < 30 ? 0.2 : 0; },
  text: s => `${partner(s).name}의 연락이 뜸해졌다. 만나서 할 말이 있다고 한다.`,
  ch: () => [
    { t: '붙잡는다', h: '다시 잘해 볼 가능성 30%', f: s => { const p = partner(s); if (U.chance(0.3)) { aff(p, 20); return `${josa(p.name, '과와')} 다시 잘해 보기로 했다.`; } return breakUp(s, p, `붙잡았지만 ${josa(p.name, '과와')} 헤어졌다.`); } },
    { t: '받아들인다', f: s => breakUp(s, partner(s)) + fx(s, { sk: { lyric: 1 } }) },
  ],
});

// ════════ 인생의 끝 ════════
E({
  id: 'reality_wall', fixed: true, cat: '인생', title: '현실의 벽',
  cond: s => age(s) >= 30 && age(s) < 40 && s.t % 12 === 0 && !s.everSuccess,
  text: s => `${age(s)}세. 아직 업계에서 이렇다 할 성과가 없다. 번 돈 ${fmtWon(s.earned)}, 팬 ${fmtFans(totalFans(s))}.\n\n주변에서는 이제 현실을 보라고 한다. 꿈을 접으면 남은 인생은 기획사 매니저로 일하며 살게 된다.`,
  ch: () => [
    { t: '그래도 계속 도전한다', f: s => '그래도 한 번 더 해 보기로 했다.' + fx(s, { stress: 8 }) },
    { t: '꿈을 접는다', h: '이번 인생이 여기서 정리된다', f: s => { endLife(s, 'fail', ''); return ''; } },
  ],
});
E({
  id: 'last_wall', fixed: true, cat: '인생', title: '마지막 결정',
  cond: s => age(s) >= 40 && !s.everSuccess,
  text: () => '마흔이 됐다. 오디션도, 작품도, 무대도 이제는 나를 기다려 주지 않는다.',
  ch: () => [{ t: '꿈을 접는다', f: s => { endLife(s, 'fail', '마흔이 되도록 기회가 오지 않았다.'); return ''; } }],
});
// 빚더미에서 빌리기: 빌린 돈으로 빚을 먼저 갚는다. 빚이 3,000만 원을 넘긴 채여도 1년은 다시 독촉받지 않는다
function bankruptPay(s, x) { const v = Math.min(s.debt, Math.max(0, s.money)); if (v > 0) { addMoney(s, -v, '빚 갚기'); s.debt -= v; } s.debtM = 0; const add = v > 0 ? ` 빌린 돈으로 빚 ${josa(fmtWon(v), '을를')} 먼저 갚았다.` : ''; return x.replace(/( \([^()]*\))?$/, m => add + m); }
function bankruptSib(s) {
  const b = bestSib(s), no = sibLendWhy(s, b), v = sibLendAmt(s);
  return { t: b ? `${b.name}에게 돈을 빌린다` : '형제자매에게 돈을 빌린다', ok: () => !no, h: no || `형제자매 · ${fmtWon(v)} · 이자 없이 매달 ${fmtWon(sibLoanPay(v))}씩 갚는다`, f: s => bankruptPay(s, sibBorrow(s, b)) };
}
function bankruptFriend(s) {
  const L = people(s, x => x.alive !== false && !x.hidden && !['형제자매', '엄마', '아빠', '자녀', '연인', '배우자'].includes(x.rel)).sort((a, b) => b.aff - a.aff);
  const n = L.find(x => friendLendOK(s, x)) || L[0];
  const ok = !!n && friendLendOK(s, n);
  return { t: ok ? `${n.name}에게 돈을 빌린다` : '친구에게 돈을 빌린다', ok: () => ok, h: ok ? `${n.rel} · ${fmtWon(friendLendAmt(n))} · 이자 없이 매달 ${fmtWon(sibLoanPay(friendLendAmt(n)))}씩 갚는다` : s.friendLoan ? '지난번에 빌린 돈을 아직 갚는 중이다' : '선뜻 빌려줄 만큼 가까운 사람이 없다', f: s => bankruptPay(s, friendBorrow(s, n)) };
}
E({
  id: 'bankrupt', fixed: true, cat: '돈', title: '빚더미',
  cond: s => s.debtM >= 12,
  text: s => `빚이 ${fmtWon(s.debt)} 쌓였다. 1년 넘게 3,000만 원을 넘긴 채다. 독촉 전화가 하루에도 몇 통씩 온다.`,
  ch: s => [
    bankruptSib(s), bankruptFriend(s),
    { t: '개인회생을 신청한다', ok: s => !s.flags.rehab, h: s.flags.rehab ? '개인회생은 이미 한 번 받았다' : '빚이 크게 줄지만 평판이 떨어진다 · 평생 한 번' + (trackOn(s, 'agency') ? ' · 내 회사는 정리해야 한다' : ''), f: s => { s.flags.rehab = true; const co = trackOn(s, 'agency') ? coClose(s, '개인회생') + ' ' : ''; s.debt = Math.round(s.debt * 0.3); s.debtM = 0; return co + '개인회생을 신청했다. 빚이 크게 줄었다.' + fx(s, { rep: -8, stress: 5 }); } },
    { t: '꿈을 접고 빚부터 갚는다', h: '이번 인생이 여기서 정리된다', f: s => { endLife(s, s.everSuccess ? 'retire' : 'fail', '빚을 갚기 위해서였다.'); return ''; } },
  ],
});
E({
  id: 'forgotten', fixed: true, cat: '인생', title: '잊혀 가는 이름',
  // 아이돌 그룹 활동 중이면 정산(빚 갚기 중)이 없어도 나오지 않는다
  cond: s => s.everSuccess && s.noIncM >= 36 && s.t % 12 === 0 && s.tracks.idol.st !== 'active' && !trackOn(s, 'agency'),
  text: () => '3년 넘게 업계에서 들어온 돈이 없다. 사람들은 이제 나를 "그때 그 사람"으로 기억한다.',
  ch: () => [
    { t: '재기를 노린다', f: s => { s.lastEntT = s.t - 24; return '다시 일어서 보기로 했다.' + fx(s, { stress: 5 }); } },
    { t: '은퇴한다', h: '이번 인생이 여기서 정리된다', f: s => { endLife(s, 'retire', ''); return ''; } },
  ],
});
// 60세부터 5년에 한 번 은퇴 권유를 받는다 (60·65·70세…, 아티스트·스태프 모두. 일을 하고 있어도 나온다. 피드백 29: 50세 → 60세)
// 그 나이가 된 해 안에 꼭 한 번 나온다 (그달에 다른 사건이 먼저 뜨면 다음 달에)
const RETIRE_AGE = 60, RETIRE_GAP = 5;
function isStaffNow(s) { return CAREER_PLAN.some(c => c.g === 'staff' && CAREERS[c.id] && trackOn(s, c.id)); }
E({
  id: 'retire_ask', fixed: true, cat: '인생', title: '은퇴 권유',
  cond: s => s.everSuccess && age(s) >= RETIRE_AGE && (s.retAskA == null || age(s) >= s.retAskA + RETIRE_GAP),
  init(s) { s.retAskA = age(s); },
  text: s => {
    const a = age(s), stage = isStaffNow(s) ? '현장' : '무대';
    return `${a}세. ` + (a < 65 ? `주변에서 이제 ${stage}을 내려올 때가 되지 않았냐는 이야기가 나온다.` : a < 70 ? `같이 일하던 사람들은 대부분 ${stage}을 떠났다. 조심스럽게 은퇴 이야기를 꺼내는 사람이 늘었다.` : '같이 일하던 사람들이 하나둘 은퇴했다. 이제 내 차례가 아니냐는 말을 자주 듣는다.');
  },
  ch: () => [{ t: '아직 할 수 있다', f: () => '아직은 이 일이 좋다.' }, { t: '은퇴한다', h: '이번 인생이 여기서 정리된다', f: s => { endLife(s, 'retire', ''); return ''; } }],
});

// ───── 특기가 꽉 찼을 때 새 특기 (v118 UI E1) ─────
// 새 특기를 주는 사건에서 특기가 10개면 이 창이 이어서 뜬다: 하나를 그만두고 배울지, 배우지 않을지
// 그만둘 수 없는 특기: 지금 하는 직업의 대표 특기 · 학업 · 외국어 (skKeepWhy · SK_FREE)
E({
  id: 'sk_swap', cat: '특기', title: '특기가 꽉 찼다', tag: 'ev',
  init(s, d) { if (has(me(s), d.k)) d.skip = true; },
  text: (s, d) => `${josa(SKILLS[d.k].n, '을를')} 새로 배울 수 있다.\n그런데 특기가 벌써 ${SKILL_CAP}개다. (학업 · 외국어 빼고)`,
  ch: (s, d) => {
    const no = { t: '배우지 않는다', f: () => `${josa(SKILLS[d.k].n, '은는')} 배우지 않기로 했다.` };
    if (skRoom(s, d.k)) return [{ t: '배운다', f: s => `${josa(SKILLS[d.k].n, '을를')} 배우기 시작했다.` + learnMe(s, d.k, d.start) }, no];
    return [{ t: '특기 하나를 그만두고 배운다', h: '그만둔 특기는 나중에 다시 배우면 1레벨부터', ok: s => skDroppable(s).length > 0, f: s => { fireEvent(s, 'sk_drop', { k: d.k, start: d.start }); return ''; } }, no];
  },
});
E({
  id: 'sk_drop', cat: '특기', title: '그만둘 특기 고르기', tag: 'ev',
  init(s, d) { if (has(me(s), d.k)) d.skip = true; },
  text: (s, d) => `${josa(SKILLS[d.k].n, '을를')} 배우는 대신 그만둘 특기를 고르자.`,
  ch: (s, d) => {
    const p = me(s), L = learnedSkills(p).filter(k => !SK_FREE.includes(k)).sort((a, b) => lv(p, a) - lv(p, b));
    return L.map(k => { const why = skKeepWhy(s, k); return { t: `${SKILLS[k].n} ${lvi(p, k)}레벨`, h: why, ok: () => !why, f: s => { dropSkill(s, k); return `${SKILLS[k].n} 대신 ${josa(SKILLS[d.k].n, '을를')} 배우기로 했다.` + learnMe(s, d.k, d.start); } }; })
      .concat([{ t: '그만두지 않는다', f: () => `${josa(SKILLS[d.k].n, '은는')} 배우지 않기로 했다.` }]);
  },
});

// ───── 고향 섭외 (v151) ─────
// 이름이 알려지면 태어난 곳에서 연락이 온다: 노래 · 연주하는 사람은 고향 축제 무대, 그 밖의 사람은 고향 홍보대사. 지금 고향 쪽에 살면 더 자주 온다
// 고향 이름: '부산광역시 해운대구' → 해운대구 · '포항시 남구' → 포항시 · '해남군' → 해남군
function homeTown(s) { const P = String(s.birthPlace || '').split(' '); return /특별시$|광역시$/.test(P[0]) && P[1] ? P[1] : P[0] || ''; }
// 고향 무대에 같이 갈 그룹 (v163): 활동 중인 아이돌 그룹 · 밴드. 솔로 가수 · 연주가로 활동하면 혼자 간다
function homeGrp(s) {
  const ti = trackOn(s, 'idol') && s.tracks.idol.st === 'active' && s.tracks.idol.g ? s.tracks.idol : null;
  if (ti) return { k: 'idol', t: ti, g: ti.g, nm: ti.g.name, mem: ti.g.members.map(id => s.people[id]).filter(x => x && x.alive) };
  const tb = trackOn(s, 'band') && s.tracks.band.b && ['indie', 'signed'].includes(s.tracks.band.st) ? s.tracks.band : null;
  if (tb) return { k: 'band', t: tb, g: tb.b, nm: tb.b.name, mem: bandMembers(s, tb).filter(x => x.alive) };
  return null;
}
// 그룹 무대 장면 (고향 무대). hf: 반응이 모이는 사람의 자리 (0 = 나)
function homeGrpLive(s, G, place, hf) {
  const z = { fans: 1.6, perf: 0.8, q: 0.6, tw: 0.6, me: 1.6 };
  if (G.k === 'band') return bandLive(s, G.t, { vn: 'fest', place, t: '고향 무대', key: true, sc: 86, hf, z });
  const P = idolPpl(s, G.g);
  return liveStage({ k: 'idol', vn: 'fest', place, t: '고향 무대', g: G.nm, fd: G.g.fandom, sx: liveSx(P), mem: P.map(x => [x.id === s.me ? actCall(s, 'idol') : callName(x.name), (G.g.pos[x.id] || '').split(' · ')[0]]), mi: 0, hf, key: true, sc: 86, z });
}
// 그룹 팬 늘리기 (아이돌 그룹은 나라별, 밴드는 한 수)
function homeGrpFans(G, n) { if (G.k === 'band') G.g.f = (G.g.f || 0) + n; else G.g.f.kr += n; }
// 사람의 고향 (멤버는 처음 물어볼 때 정해 둔다): 사는 사람 비율대로 지역을 고르고 그 안의 동네
function personTown(s, x) {
  if (!x.home) { const R = U.wpick(REGIONS, r => r.w); x.home = U.pick(R.places); }
  const P = String(x.home).split(' ');
  return /특별시$|광역시$/.test(P[0]) && P[1] ? P[1] : P[0] || '';
}
E({
  id: 'home_call', cd: 18, cat: '섭외', title: '고향에서 온 연락', tag: 'career',
  p: s => (0.004 + (s.fame || 0) / 100 * 0.012) * (s.region === s.birthRegion ? 1.5 : 1),
  cond: s => age(s) >= 16 && (s.fame || 0) >= 20 && !!homeTown(s) && !/^서울/.test(s.birthPlace || '') && !s.army && !s.hiatus && !pregMe(s) && !s.scandal,
  init(s, d) {
    d.town = homeTown(s);
    // 솔로 가수 · 연주가로 활동하면 혼자, 아니면 활동 중인 그룹 전체가 간다 (v163). 그룹 없는 연습생은 예전처럼 혼자
    const solo = ['solo', 'player'].find(id => CAREERS[id] && trackOn(s, id)), G = !solo ? homeGrp(s) : null;
    d.stage = solo || (G ? G.k : ['idol', 'band'].find(id => CAREERS[id] && trackOn(s, id)) || '');
    d.grp = G ? G.k : '';
    d.fee = Math.round((200 + (s.fame || 0) * 40) * U.fl(0.8, 1.3) * (G ? 1.5 : 1)) * 1e4;
  },
  text: (s, d) => { const G = d.grp ? homeGrp(s) : null; return G ? `고향 ${d.town}에서 연락이 왔다. 올해 ${d.town} 축제 무대에 ${josa(G.nm, '을를')} 초대하고 싶다고 한다. "우리 동네가 낳은 스타"라며 ${me(s).name} 얼굴이 들어간 현수막도 걸겠다고 한다.`
    : d.stage ? `고향 ${d.town}에서 연락이 왔다. 올해 ${d.town} 축제 무대에 서 달라고 한다. "우리 동네가 낳은 스타"라며 현수막도 걸겠다고 한다.` : `고향 ${d.town}에서 연락이 왔다. ${d.town} 홍보대사를 맡아 달라고 한다. "우리 동네의 자랑"이라고 한다.`; },
  ch: (s, d) => [
    { t: d.grp ? '멤버들과 고향 축제 무대에 선다' : d.stage ? '고향 축제 무대에 선다' : '홍보대사를 맡는다', h: `${fmtWon(d.fee)} · 고향 사람들이 반긴다`, f: s => {
      earn(s, d.fee, d.stage ? '행사 출연료' : '홍보대사 사례비', d.stage || undefined);
      const G = d.grp ? homeGrp(s) : null;
      const gain = Math.round(Math.max(200, fanGain(s, 68, 'kr', 0.4)) * (d.stage ? 1.5 : 0.8));
      if (G) homeGrpFans(G, Math.round(gain * 0.6));
      const log = (G ? `${josa(G.nm, '과와')} 고향 ${d.town} 축제 무대에 섰다. 객석이 온통 내 이름을 불렀다.` : d.stage ? `고향 ${d.town} 축제 무대에 섰다. 객석이 온통 아는 얼굴 같았다.` : `고향 ${d.town} 홍보대사가 됐다. 동네 어귀에 내 얼굴이 걸렸다.`) + fx(s, { fkr: gain, rep: 2, stress: d.stage ? 2 : -2 });
      if (!d.stage || typeof liveStage !== 'function') return log;
      // 고향 무대는 실시간 창으로: 처음 보는 객석이 아니라 모두가 내 편이다. 그룹이면 반응은 나에게 모인다
      if (G) return showResult(s, `${d.town} 축제`, log, log, homeGrpLive(s, G, `${d.town} 축제`, 0));
      const nm = actName(s, d.stage);
      return showResult(s, `${d.town} 축제`, log, log, liveStage({ k: 'solo', vn: 'fest', mic: d.stage !== 'player', place: `${d.town} 축제`, t: '고향 무대', g: nm, cn: typeof callName === 'function' ? callName(nm) : nm, mem: [[nm, '']], mi: 0, key: true, sc: 86, z: { fans: 1.6, perf: 0.8, q: 0.6, me: 1.2 } }));
    } },
    { t: '정중히 거절한다', f: s => `고향 ${d.town}의 제안을 정중히 거절했다.` },
  ],
});
// 멤버 고향 무대 (v163): 우리 그룹 멤버의 고향 축제에서 섭외가 온다. 그룹 전체가 가고, 반응은 그 멤버에게 모인다
E({
  id: 'member_home', cd: 24, cat: '섭외', title: '멤버 고향에서 온 연락', tag: 'career',
  p: s => 0.005 + (s.fame || 0) / 100 * 0.01,
  cond: s => age(s) >= 16 && !s.army && !s.hiatus && !pregMe(s) && !s.scandal && !!homeGrp(s) && homeGrp(s).mem.length > 0,
  init(s, d) {
    const G = homeGrp(s), x = U.pick(G.mem);
    d.mid = x.id; d.town = personTown(s, x);
    d.fee = Math.round((150 + (s.fame || 0) * 30) * U.fl(0.8, 1.3)) * 1e4;
  },
  text: (s, d) => { const G = homeGrp(s), x = s.people[d.mid]; return `${x.name}의 고향 ${d.town}에서 연락이 왔다. 올해 ${d.town} 축제 무대에 ${josa(G.nm, '이가')} 와 달라고 한다. "우리 동네가 낳은 스타"라며 ${x.name} 얼굴이 들어간 현수막도 걸겠다고 한다.`; },
  ch: (s, d) => [
    { t: '다 같이 간다', h: `${fmtWon(d.fee)} · ${s.people[d.mid] ? s.people[d.mid].name : '멤버'}와 사이가 가까워진다`, f: s => {
      const G = homeGrp(s), x = s.people[d.mid];
      if (!G || !x) return '';
      earn(s, d.fee, '행사 출연료', G.k);
      homeGrpFans(G, Math.round(Math.max(150, fanGain(s, 60, 'kr', 0.3))));
      x.aff = Math.min(100, (x.aff || 50) + 6);
      const log = `${x.name}의 고향 ${d.town} 축제 무대에 ${josa(G.nm, '이가')} 섰다. 객석이 온통 ${x.name}의 이름을 불렀다. ${x.name}의 눈가가 촉촉해졌다.` + fx(s, { rep: 1, stress: 1 });
      if (typeof liveStage !== 'function') return log;
      // 반응이 모이는 자리: 무대에서 그 멤버의 자리 (나는 맨 앞 0)
      const P = G.k === 'band' ? [me(s)].concat(bandMembers(s, G.t)) : idolPpl(s, G.g), hf = Math.max(0, P.findIndex(p => p.id === x.id));
      return showResult(s, `${d.town} 축제`, log, log, homeGrpLive(s, G, `${d.town} 축제`, hf));
    } },
    { t: '이번엔 거절한다', f: s => `${s.people[d.mid] ? s.people[d.mid].name + '의 ' : ''}고향 ${d.town}의 제안을 정중히 거절했다.` },
  ],
});
// ───── v221: 사춘기 · 학원 친구 · 학창 시절 추억 ─────
// 중 · 고등학생이 놀 틈 없이(kidBusy) 오래 지내면 먼저 낌새가 보이고(WANDER_WARN개월째에 창으로 경고), 그래도 쉬지 않으면 WANDER_AT개월째에 1년 동안 방황한다 (평생 한 번)
// 놀기 · 쉬기 칸을 넣으면 쌓인 달이 한 달에 두 달씩 줄어든다
const WANDER_WARN = 24, WANDER_AT = 30;
function kidLesson(s) { return s.slots.filter(sl => sl.lesson && actInfo(sl.act).les); }
function kidMonth(s) {
  const p = me(s);
  if (age(s) >= 19 || schoolYear(s) < 1 || s.edu.graduated) return;
  // 학창 시절에 친구와 놀면 통찰력 · 유머 감각이 아주 조금 자라고(12년 내내 놀아도 6쯤) 추억이 쌓인다
  // 재능은 정수로만 오른다: 놀 때마다 조금씩 모아 두었다가(s.talAcc) 1이 차면 +1 (두 해 남짓에 1)
  if (s.slots.some(sl => sl.act === 'play')) { const A = s.talAcc = s.talAcc || {}; for (const k of ['insight', 'humor']) { A[k] = (A[k] || 0) + 0.04; if (A[k] >= 1) { A[k] -= 1; if (p.tal[k] < 100) p.tal[k] = Math.min(100, Math.round(p.tal[k]) + 1); } } s.memo = (s.memo || 0) + 1; }
  if (s.wandered || s.ill) return;
  if (!kidBusy(s)) { if (s.busyM) s.busyM = Math.max(0, s.busyM - 2); return; }
  if (!s.slots.some(sl => !sl.lock)) return; // 칸이 전부 고정(연습생 · 촬영 · 활동기)이라 쉴 칸을 넣을 수 없는 달은 세지 않는다
  s.busyM = (s.busyM || 0) + 1;
  // 경고는 한 해에 한 번까지 (쉬었다 다시 바빠져 같은 달수로 돌아와도 또 띄우지 않게)
  if (s.busyM === WANDER_WARN && !(s.pubWarnT > s.t - 12) && !hasQ(s, 'puberty_warn')) { s.pubWarnT = s.t; queueEv(s, 'puberty_warn', 0, {}, true); }
  else if (s.busyM >= WANDER_AT && !hasQ(s, 'puberty')) queueEv(s, 'puberty', 0, {}, true);
}
E({
  id: 'puberty_warn', cat: '사춘기', title: '요즘 좀 이상하다', keepPop: true,
  cond: s => age(s) < 19,
  text: () => `요즘 부쩍 말수가 줄었다. 연습을 하다가도 멍하니 서 있고, 친구들이 놀러 간 이야기를 하면 혼자 창밖만 본다. 마음 놓고 놀아 본 게 언제인지 기억도 나지 않는다.\n\n이대로 숨 돌릴 틈 없이 지내면 머지않아 크게 엇나갈 것 같다. 일정에 '친구와 놀기'나 '푹 쉬기'를 한 칸 넣어 두면 차츰 나아진다.`,
  ch: () => [{ t: '알겠다', f: () => '쉴 틈이 없어 마음이 지쳐 간다. 이대로면 머지않아 크게 엇나갈 것 같다.' }],
});
E({
  id: 'puberty', cat: '사춘기', title: '다 그만두고 싶다', keepPop: true,
  cond: s => age(s) < 19,
  init(s, d) { if (s.wandered || s.ill || (s.busyM || 0) < WANDER_AT - 2) { d.skip = true; return; } s.wandered = true; s.busyM = 0; s.ill = { n: '사춘기 방황', left: 12, rest: true, all: true, wander: true }; },
  text: () => `어느 날 아침, 가방을 메고 나와서는 학원에도 연습실에도 가지 않았다. 다음 날도, 그다음 날도 마찬가지였다. "나는 왜 이걸 하고 있지?" 하는 생각이 머리를 떠나지 않는다.\n\n앞으로 1년 동안 모든 일정이 멈춘다.`,
  ch: () => [{ t: '…', f: () => '모든 걸 내려놓고 방황하기 시작했다. 1년 동안 모든 일정이 멈춘다.' }],
});
// 학원 친구: 학원에 다니는 학생에게 가끔 생긴다
E({
  id: 'acad_friend', cd: 30, p: 0.03, cat: '학원', title: '학원 친구',
  cond: s => age(s) < 19 && schoolYear(s) >= 1 && !s.edu.graduated && !s.ill && kidLesson(s).length > 0 && people(s, n => n.acad).length < 3,
  init(s, d) { const g0 = myGender(s); d.k = actInfo(U.pick(kidLesson(s)).act).skill; d.g = U.chance(0.65) ? g0 : (g0 === '여' ? '남' : '여'); d.name = genName(d.g); d.trait = U.pick(TRAITS).id; d.look = U.pick(d.g === '여' ? LOOKS_F : LOOKS_M); },
  text: (s, d) => `${SKILLS[d.k].les.n}에서 같은 반 ${josa(d.name, '과와')} 자주 마주친다. 쉬는 시간마다 붙어 다니다 보니 어느새 친해졌다.`,
  ch: (s, d) => [{ t: '친구가 생겼다', f: s => { const n = makePerson(s, { g: d.g, name: d.name, trait: d.trait, look: d.look, age: age(s), rel: '친구', aff: 50, met: `${SKILLS[d.k].les.n} 친구` }); if (n) n.acad = d.k; return `${SKILLS[d.k].les.n}에서 ${josa(d.name, '과와')} 친구가 되었다.`; } }],
});
// 학원 빠지고 놀자는 친구
E({
  id: 'acad_skip', cd: 9, p: 0.05, cat: '학원', title: '오늘만 빠지자',
  cond: s => age(s) < 19 && schoolYear(s) >= 4 && !s.edu.graduated && !s.ill && kidLesson(s).length > 0 && people(s, n => n.rel === '친구' && !n.far).length > 0,
  init(s, d) { const F = people(s, n => n.rel === '친구' && !n.far), A = F.filter(x => x.acad); d.id = U.pick(A.length ? A : F).id; d.k = actInfo(U.pick(kidLesson(s)).act).skill; },
  text: (s, d) => { const n = s.people[d.id]; return `${SKILLS[d.k].les.n}에 가는 길에 ${josa(n.name, '이가')} 팔을 잡아끈다. "오늘 하루만 빠지자. 떡볶이 먹고 노래방 가자."`; },
  ch: (s, d) => { const n = s.people[d.id]; return [
    { t: '따라간다', h: '스트레스 ↓ · 친구와 가까워진다', f: s => { aff(n, 6); n.contactT = s.t; s.memo = (s.memo || 0) + 6; const caught = U.chance(0.25); return `${josa(n.name, '과와')} 학원을 빠지고 해가 질 때까지 놀았다.` + (caught ? ' 집에 오니 학원에서 전화가 와 있었다. 한참 혼났다.' : ' 오래 기억에 남을 하루였다.') + fx(s, { stress: caught ? -4 : -9 }); } },
    { t: '학원에 간다', f: s => { aff(n, -1); return `${n.name}에게 다음에 가자고 하고 학원에 갔다.`; } },
  ]; },
});
// 학창 시절 추억(s.memo: 친구와 논 달 · 학원을 빠지고 논 날): 놀아 본 만큼 성인이 된 뒤 이야깃거리와 인연이 된다
function memoP(s) { return Math.min(1, (s.memo || 0) / 120); }
E({
  id: 'school_story', cd: 30, p: s => 0.02 * memoP(s), cat: '추억', title: '학창 시절 이야기',
  cond: s => age(s) >= 20 && (s.memo || 0) >= 30 && typeof showbizOn === 'function' && showbizOn(s) && !s.army && !s.hiatus,
  init(s, d) { d.lyr = has(me(s), 'lyric') && U.chance(0.5); d.g = Math.round((60 + Math.sqrt(totalFans(s)) * 1.2) * U.fl(0.7, 1.3) * popSpeed(s) * myRoom(s, 'kr')); },
  text: (s, d) => d.lyr ? '가사를 쓰다 막혀서 학창 시절 일기를 꺼냈다. 학원을 빠지고 친구와 놀던 날, 해 질 녘 운동장 같은 기억들이 그대로 가사가 됐다.' : '라이브 방송에서 학창 시절 이야기를 꺼냈다. 친구들과 몰려다니던 이야기에 댓글 창이 웃음으로 가득 찼다. "의외로 평범하게 놀았네"라는 반응이 많다.',
  ch: (s, d) => [{ t: '그때가 좋았다', f: s => { if (d.lyr) { practice(s, me(s), 'lyric', 3); return '학창 시절 기억을 가사로 옮겼다. 작사 실력이 늘었다.'; } return '학창 시절 이야기가 팬들 사이에서 화제가 됐다.' + fx(s, { fkr: d.g, stress: -2 }); } }],
});
E({
  id: 'alumni', cd: 96, p: s => 0.012 * memoP(s), cat: '추억', title: '오랜만의 연락',
  cond: s => age(s) >= 23 && (s.memo || 0) >= 30 && typeof showbizOn === 'function' && showbizOn(s) && !s.army,
  init(s, d) {
    const F = people(s, n => n.rel === '친구' && !n.ind && !n.alum && !n.trainee && Math.abs(pAge(s, n) - age(s)) <= 2 && (n.acad || /초등학교|학원|학창|학교|동아리/.test(n.met || '')));
    const n = F.length ? U.pick(F) : makePerson(s, { age: age(s), rel: '친구', aff: 40, met: '학창 시절 친구' });
    d.id = n.id; d.job = U.pick(['방송 작가', '연예부 기자', '라디오 PD', '잡지 에디터']); n.alum = true; if (!n.job || /학생/.test(n.job)) n.job = d.job; else d.job = n.job;
  },
  text: (s, d) => { const n = s.people[d.id]; return `학창 시절 같이 놀던 ${josa(n.name, '이가')} 오랜만에 연락을 해 왔다. 지금은 ${josa(d.job, '으로')} 일한다고 한다. "네 이야기를 주변에 좀 해도 괜찮지?"`; },
  ch: (s, d) => { const n = s.people[d.id]; return [{ t: '반갑게 만난다', f: s => { aff(n, 8); n.contactT = s.t; return `${josa(d.job, '이가')} 된 ${josa(n.name, '과와')} 오랜만에 만났다. 덕분에 나를 좋게 본 이야기가 퍼졌다.` + fx(s, { fame: 1, rep: 2 }); } }]; },
});
