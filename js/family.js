'use strict';
// 대를 이어 하기: 아이 낳기, 아이에게 특기 가르치기, 은퇴 뒤 자녀로 이어 하기
// 아이의 재능은 엄마·아빠의 재능을 닮지만 평균을 그대로 받지는 않는다 (inheritTalents)

function kids(s) { return people(s, p => p.rel === '자녀'); }
function kidAge(s, k) { return pAge(s, k); }
// 그 사람의 재능에 맞는 것일수록 자주 뽑는다
function fitPickFor(p, list, n, keyOf = x => x[1]) {
  const pool = list.slice(), out = [];
  while (out.length < n && pool.length) { const x = U.wpick(pool, y => fitWeight(p, keyOf(y))); out.push(x); pool.splice(pool.indexOf(x), 1); }
  return list.filter(x => out.includes(x));
}
// 아이를 가질 수 있는지는 엄마(나 또는 상대)의 나이로 정한다. 폐경은 48세 이상에서만 온다 (사람마다 48~54세). 그 전에는 늘 가질 수 있다
function menoAge(p) { if (!p.meno) p.meno = U.int(48, 54); return p.meno; }
function ageOf(s, p) { return p.id === s.me ? age(s) : pAge(s, p); }
function momIn(s, other) { return myGender(s) === '여' ? me(s) : (other && other.g === '여' ? other : null); }
function canConceive(s, other) { const m = momIn(s, other); return !!m && ageOf(s, m) < menoAge(m); }
// other: 아이의 다른 부모 (없으면 지금 배우자·연인). o: { g 성별, name 이름 } (내가 지어 준 이름)
function makeChild(s, other, o = {}) {
  const pme = me(s), sp = other || partner(s);
  const momP = pme.g === '여' ? pme : sp, dadP = pme.g === '여' ? sp : pme;
  const g = o.g || (U.chance(0.5) ? '여' : '남');
  const name = o.name || babySur(s, other) + babyGiven(s, g, other);
  const c = makePerson(s, { g, name, age: 0, rel: '자녀', aff: 85, job: '아기', tal: inheritTalents(momP, dadP, momP ? ageOf(s, momP) : 30) });
  c.parents = [pme.id, sp && sp.id].filter(Boolean); c.lessons = {};
  return c;
}
// 아이 이름 추천: 가족(나 · 아이의 다른 부모 · 내 부모님 · 형제자매 · 이미 낳은 아이)과 같은 이름은 빼고 고른다
function babyGiven(s, g, other) {
  const used = new Set([me(s), other || partner(s), mom(s), dad(s)].concat(kids(s), sibs(s)).filter(Boolean).map(p => p.name.slice(1)));
  const all = g === '여' ? NAMES_F : NAMES_M, pool = all.filter(n => !used.has(n));
  return U.pick(pool.length ? pool : all);
}
// 아이의 성: 아빠 쪽 (아빠가 없으면 엄마 성)
function babySur(s, other) { const pme = me(s), sp = other || partner(s), dadP = pme.g === '여' ? sp : pme; return (dadP || pme).name.slice(0, 1); }
// v215: 태교 고르기 — 임신을 알게 된 바로 다음에 뜬다 (결혼한 뒤 · 속도위반 모두). 고른 태교(s.preg.tae)에 따라 태어날 때 그쪽 재능 둘이 오른다 (taeBoost)
E({
  id: 'taegyo', cat: '가족', title: '어떤 태교를 할까', keepPop: true,
  cond: s => !!s.preg && !s.preg.tae,
  text: (s, d) => { const sp = partner(s); return `아이가 태어날 때까지 어떤 태교를 할지 정한다. 고른 태교에 따라 아이가 그쪽 재능을 더 타고난다.\n\n${pregMe(s) ? "태어날 때까지 일정 한 칸이 '태교'로 고정된다. 댄스 · 연기처럼 몸을 크게 쓰는 연습은 쉰다." : `${sp ? sp.name : '배우자'}${sp ? josa(sp.name, '과와').slice(sp.name.length) : '와'} 함께 한다.`}`; },
  ch: (s, d) => TAEGYO.map(x => ({ t: `${x.ic} ${x.n}`, h: `${x.h} · 아이의 ${x.tal.map(k => TALENT_BY[k].n).join(' · ')} ↑`, f: s => { if (s.preg) s.preg.tae = x.id; return `${josa(x.n, '을를')} 하기로 했다.`; } })),
});
// 태어난 아이에게 태교한 쪽 재능을 얹는다 (98까지). 돌려주는 글은 출산 기록 뒤에 붙인다
function taeBoost(s, c) {
  const x = s.preg && TAEGYO_BY[s.preg.tae]; if (!x || !c) return '';
  // 부모 평균보다 낮게 물려받았어도 평균에서 시작해 +8~15 (태교한 티가 나게)
  const PR = (c.parents || []).map(id => s.people[id]).filter(Boolean);
  for (const k of x.tal) { const avg = PR.length ? PR.reduce((n, p) => n + (p.tal[k] || 45), 0) / PR.length : 45; c.tal[k] = Math.round(U.clamp(Math.max(c.tal[k], avg) + U.int(8, 15), 3, 98)); }
  return ` ${x.n} 덕분인지 ${x.tal.map(k => TALENT_BY[k].n).join(' · ')}${josa(TALENT_BY[x.tal[x.tal.length - 1]].n, '이가').slice(TALENT_BY[x.tal[x.tal.length - 1]].n.length)} 남다르다.`;
}
// v214: 임신 소식 — 결혼한 뒤 아이가 생기면(계획했든 아니든) 먼저 이 창이 뜨고, 아홉 달 뒤에 태어난다 (baby, late). 그동안 s.preg
const PREG_M = 9;
E({
  id: 'preg_news', cat: '가족', title: '아이가 생겼다', keepPop: true,
  cond: s => { const sp = partner(s); return isSpouse(sp) && canConceive(s, sp) && !s.preg && !hasQ(s, 'baby') && !hasQ(s, 'oops_birth'); },
  init(s, d) { s.preg = { left: PREG_M, me: myGender(s) === '여' }; queueEv(s, 'baby', PREG_M, { late: true }, true); },
  text: (s, d) => { const sp = partner(s), my = myGender(s) === '여', nth = kids(s).length ? ` ${kids(s).length + 1}번째 아이다.` : '';
    return (my ? `요즘 몸이 이상해서 테스트기를 사 봤다. 선명한 두 줄이 떴다.` : `${sp ? josa(sp.name, '이가') : '아내가'} 할 말이 있다며 테스트기를 내밀었다. 선명한 두 줄이 떠 있었다.`)
      + `\n\n${d.oops ? '피임을 했는데도 ' : ''}아이가 생겼다.${nth} ${ymLater(s, PREG_M)}에 태어난다.` + (my ? '\n\n아이가 태어날 때까지 직업 활동은 쉰다. 연습과 생활은 그대로 할 수 있다.' : ''); },
  ch: (s, d) => [{ t: '확인', f: s => { queueEv(s, 'taegyo', 0, {}, true); qFront(s, ['taegyo']); return `아이가 생겼다. ${ymLater(s, s.preg ? s.preg.left : PREG_M)}에 태어난다.` + fx(s, { stress: d.oops ? 4 : -4 }); } }],
});
// 아이가 생겼다: 성별을 알려 주고 이름을 직접 짓는다 (성은 아빠 쪽으로 정해져 있다). late: 혼전 임신 뒤 결혼해서 몇 달 뒤 태어난 아이
E({
  // noRes: 이름을 정하면 결과 창 없이 바로 '○○의 인생' 창으로 넘어간다 (v139). 스트레스 변화는 그 창에 적는다
  id: 'baby', cd: 12, noRes: true, cat: '가족', title: (s, d) => d.late ? '아이가 태어났다' : '아이가 생겼다',
  // 결혼한 뒤의 아이는 아이 계획(kid_plan)에서 정한다. 예전엔 한 달 3% 우연이었는데, 다른 사건에 밀려 거의 뜨지 않았다
  cond: s => { const sp = partner(s); return (!!sp && canConceive(s, sp)) || !!s.preg; },
  init(s, d) { d.g = U.chance(0.5) ? '여' : '남'; d.sur = babySur(s); d.given = babyGiven(s, d.g); },
  text: (s, d) => { const sp = partner(s), kid = d.g === '여' ? '딸' : '아들', nth = kids(s).length ? ` ${kids(s).length + 1}번째 아이다.` : ''; return (d.late ? `${kid}이 태어났다.${nth}` : `${d.oops ? '피임을 했는데도 ' : ''}${sp ? josa(sp.name, '과와') + ' 사이에 ' : ''}아이가 생겼다. ${kid}이다.${nth}`) + ' 이름을 지어 주자.'; },
  form: (s, d) => [{ k: 'given', label: `이름 (성은 '${d.sur}')`, value: d.given, max: 4 }],
  submit(s, d, v) {
    const given = (v.given || '').trim().replace(/\s+/g, '');
    if (!given) return { err: '이름을 적어 주세요' };
    const c = makeChild(s, null, { g: d.g, name: d.sur + given });
    const tae = taeBoost(s, c);
    s.preg = null;
    milestone(s, `${age(s)}세에 ${c.g === '여' ? '딸' : '아들'} ${josa(c.name, '이가')} 태어났다.`);
    const f = fx(s, { stress: -6 });
    fireEvent(s, 'baby_heir', { id: c.id, fx: f.replace(/[\[\]()]/g, '').trim() });
    return { log: `${c.g === '여' ? '딸' : '아들'}이 태어났다. 이름은 ${c.name}.${tae}` + f };
  },
});
// 자녀로 이어 하기는 아이가 태어난 바로 그때, 아이가 열여덟 살이 될 때(kid_heir18), 또는 내가 은퇴한 뒤에 할 수 있다
// 아이 재능은 글로 늘어놓지 않고, 창 오른쪽 아래 '👶 ○○ 재능' 버튼으로 본다 (아이에게 뭘 시켜 볼까? 창과 같은 버튼)
E({
  id: 'baby_heir', cat: '가족', title: (s, d) => `${s.people[d.id].name}의 인생`, tag: 'ev',
  kid: (s, d) => d.id,
  text: (s, d) => { const k = s.people[d.id]; return `갓 태어난 ${k.g === '여' ? '딸' : '아들'} ${k.name}.${d.fx ? `\n${d.fx}` : ''}\n\n지금 ${k.name}의 인생으로 넘어갈 수 있다. 넘어가면 ${me(s).name}의 이야기는 여기서 끝나고, ${k.name}의 갓난아기 때부터 시작한다. 지금 넘어가지 않으면 ${josa(k.name, '이가')} 열여덟 살이 될 때나 ${josa(me(s).name, '이가')} 은퇴한 뒤에 이어 할 수 있다.`; },
  ch: (s, d) => { const k = s.people[d.id]; return [
    { t: '지금 인생을 계속 산다', f: () => '' },
    { t: `${k.name}의 인생으로 넘어간다`, h: `${me(s).name}의 이야기는 여기서 끝난다`, confirm: `정말 ${k.name}의 인생으로 넘어갈까요?

${me(s).name}의 이야기는 여기서 끝나고, 되돌릴 수 없어요.`, f: s => { endLife(s, 'handoff', '', k.id); return ''; } },
  ]; },
});
// 고등학교 졸업 전까지는 내가 아이에게 특기를 가르치거나 학원에 보낸다 (그게 아이가 특기를 처음 배우는 길이다)
const KID_TEACH = [['피아노', 'piano', 4], ['노래', 'vocal', 4], ['춤', 'dance', 5], ['그림', 'art', 4], ['영어', 'en', 5], ['기타', 'guitar', 8], ['드럼', 'drum', 8], ['연기', 'acting', 7], ['게임', 'game', 7], ['글쓰기', 'script', 9], ['일본어', 'jp', 9], ['작곡', 'compose', 11]];
E({
  id: 'child_teach', cd: 8, cat: '가족', title: '아이에게 뭘 시켜 볼까?',
  p: s => kids(s).some(k => kidAge(s, k) >= 4 && kidAge(s, k) <= 17) ? 0.06 : 0,
  init(s, d) {
    const ks = kids(s).filter(k => kidAge(s, k) >= 4 && kidAge(s, k) <= 17);
    if (!ks.length) { d.skip = true; return; }
    const k = U.pick(ks); d.id = k.id;
    const cand = KID_TEACH.filter(([, sk, mn]) => kidAge(s, k) >= mn && !has(k, sk));
    if (!cand.length) { d.skip = true; return; }
    d.o = fitPickFor(k, cand, 3);
  },
  text: (s, d) => { const k = s.people[d.id]; return `${k.name}(${kidAge(s, k)}세)에게 뭘 시켜 볼까?`; },
  kid: (s, d) => d.id,
  ch(s, d) {
    const k = s.people[d.id], pme = me(s);
    const o = [];
    for (const [n, sk] of d.o) {
      const les = SKILLS[sk].les, cost = les ? lesCost(k, sk) * 1e4 : 20e4;
      // 직접 가르치면 1년 동안 일정 한 칸이 '아이 가르치기'로 묶인다 (군대처럼)
      const busy = s.kidTeach && s.people[s.kidTeach.id];
      if (lv(pme, sk) >= 25) o.push({ t: `${n}${josa(n, '을를').slice(n.length)} 내가 직접 가르친다`, ok: () => !busy, h: busy ? `지금 ${busy.name}에게 ${josa(SKILLS[s.kidTeach.sk].n, '을를')} 가르치고 있다` : '돈은 들지 않는다 · 1년 동안 일정 한 칸이 아이 가르치기로 묶인다', f: s => { learnSkill(s, k, sk); const tag = learnMe(s, 'edu', null, true); aff(k, 4); s.kidTeach = { id: k.id, sk, left: 12 }; return `${k.name}에게 ${josa(SKILLS[sk].n, '을를')} 직접 가르치기 시작했다. 1년 동안 일정 한 칸을 비워 둔다.` + tag; } });
      o.push({ t: `${les ? les.n : n + ' 학원'}에 보낸다`, h: `1년 동안 월 ${fmtWon(cost)}`, f: s => { learnSkill(s, k, sk); k.lessons[sk] = s.t + 12; return `${josa(k.name, '을를')} ${les ? les.n : n + ' 학원'}에 보내기 시작했다.`; } });
    }
    o.push({ t: '그냥 놀게 둔다', f: s => `${k.name}에게는 아직 아무것도 시키지 않기로 했다.` });
    return o;
  },
});
// 아이가 네 살이 되면: 그 아이의 자녀 교육비를 바로 정할 수 있다 (나중에 생활 → 지속 관리에서 바꿀 수 있다)
E({
  id: 'kid_edu_open', cat: '가족', title: '자녀 교육비',
  cond: s => true,
  init(s, d) { const k = s.people[d.id]; if (!k || !k.alive || k.rel !== '자녀' || kidEduOf(s, k) || kidAge(s, k) > 18) { if (k) k.eduTold = true; d.skip = true; } },
  text: (s, d) => { const k = s.people[d.id], ka = kidAge(s, k); return `${ka <= 4 ? `${josa(k.name, '이가')} 네 살이 됐다. 이제` : `${k.name}(${ka}세)에게`} 과외·코칭을 붙여 줄 수 있다.\n\n자녀 교육비를 내면 ${k.name}의 잘하는 특기 세 개가 매달 빨리 는다. 많이 낼수록 더 빨리 는다. 18세까지 내고, 생활 → 지속 관리에서 언제든 바꿀 수 있다.`; },
  kid: (s, d) => d.id,
  // v205: 이 창에 답해야 '알렸다'(eduTold)가 된다. 그 전에 창이 사라져도 다음 달에 다시 뜬다 (familyMonth)
  ch: (s, d) => { const k = s.people[d.id]; return KIDEDU.slice(1).map((e, i) => ({ t: `${e.n} (월 ${e.c}만 원)`, ok: s => s.money >= e.c * 1e4, h: s.money >= e.c * 1e4 ? '' : '지금 가진 돈이 모자라다', f: s => { k.eduTold = true; s.kidEdu = s.kidEdu || {}; s.kidEdu[k.id] = i + 1; return `${k.name}의 자녀 교육비를 '${e.n}'${josa(e.n, '으로').slice(e.n.length)} 정했다. (월 ${e.c}만 원)`; } })).concat([{ t: '지금은 안 한다', h: '생활 → 지속 관리에서 나중에 정할 수 있다', f: () => { k.eduTold = true; return `${k.name}의 자녀 교육비는 나중에 정하기로 했다.`; } }]); },
});
// 자녀 교육비 창이 줄 서 있거나 떠 있는지 (그 아이 몫)
function kidEduQ(s, k) { return s.queue.some(q => q.id === 'kid_edu_open' && q.d && q.d.id === k.id) || !!(s.pending && s.pending.id === 'kid_edu_open' && s.pending.d && s.pending.d.id === k.id); }
// 매달: 자녀 학원비와 양육비
// ───── 아이 계획 (피드백 20) ─────
// 결혼하면 10~16개월마다 배우자와 아이 이야기를 한다 (아이 계획 창). 갖기로 하면 1년 반 동안 매달 아이가 생길 수 있고(엄마 나이가 많을수록 낮다),
// '아직은 아니다'·'갖지 않는다'를 골라도 4%는 피임에 실패해 아이가 생긴다. 갖지 않기로(그만 낳기로) 하면 그 배우자와는 다시 묻지 않고, 해마다 1.5%는 생긴다 (턴제 실험 7차: 5년 뒤 다시 묻던 것 없앰)
const KID_MAX = 5;
function kidPlanOK(s) { const sp = partner(s); return isSpouse(sp) && sp.g !== myGender(s) && age(s) >= 20 && pAge(s, sp) >= 20 && canConceive(s, sp) && kids(s).length < KID_MAX; }
function kidOops(s, p) { if (U.chance(p) && !s.preg && !hasQ(s, 'baby') && !hasQ(s, 'preg_news')) queueEv(s, 'preg_news', U.int(1, 4), { oops: true }); }
function kidPlanMonth(s) {
  const K = s.kidPlan = s.kidPlan || {};
  if (!kidPlanOK(s)) { K.trying = false; return; }
  // v214: 임신 중에는 아이 계획 이야기를 하지 않는다 (속도위반 결혼 뒤 일곱 달도)
  if (s.preg || hasQ(s, 'oops_birth') || hasQ(s, 'preg_news')) return;
  if (K.next == null) { K.next = s.t + U.int(4, 10); return; }
  if (K.trying) {
    const m = momIn(s, partner(s)), ma = ageOf(s, m), p = ma < 35 ? 0.2 : ma < 40 ? 0.12 : 0.05;
    if (hasQ(s, 'baby')) return;
    if (U.chance(p)) { K.trying = false; K.next = s.t + U.int(14, 22) + PREG_M; queueEv(s, 'preg_news', 0); }
    else if (s.t >= K.tryEnd) { K.trying = false; K.next = s.t + U.int(2, 4); K.miss = true; }
    return;
  }
  if (K.stop) { if (calM(s) === 1) kidOops(s, 0.015); return; }
  if (s.t >= K.next && !hasQ(s, 'kid_plan') && !hasQ(s, 'baby')) { K.next = s.t + 6; queueEv(s, 'kid_plan', 0); }
}
E({
  id: 'kid_plan', cat: '가족', title: '아이 계획',
  cond: s => kidPlanOK(s),
  init(s, d) {
    const n = kids(s).length, sp = partner(s);
    d.want = U.chance(n === 0 ? 0.6 : n === 1 ? 0.45 : 0.25) ? 'yes' : U.chance(0.5) ? 'no' : 'any';
    d.miss = !!(s.kidPlan || {}).miss; s.kidPlan.miss = false;
    if (!sp.kidTalk) sp.kidTalk = true;
  },
  text: (s, d) => {
    const sp = partner(s), n = kids(s).length;
    const w = d.want === 'yes' ? (n ? '한 명 더 낳고 싶다고 한다' : '아이를 갖고 싶다고 한다') : d.want === 'no' ? (n ? '지금 아이들로 충분하다고 한다' : '아직은 둘이 지내고 싶다고 한다') : '내 뜻을 따르겠다고 한다';
    return (d.miss ? '아이를 갖기로 한 지 1년 반이 지났지만 아직 소식이 없다.\n\n' : '') + `${josa(sp.name, '과와')} ${n ? `아이를 더 낳을지 이야기했다. 지금 자녀 ${n}명.` : '아이 이야기를 했다.'} ${josa(sp.name, '은는')} ${w}.`;
  },
  ch: (s, d) => {
    const sp = partner(s), n = kids(s).length, K = s.kidPlan;
    const like = (v, x) => { aff(sp, d.want === v ? 4 : d.want === 'any' ? 1 : -4); return x; };
    return [
      { t: n ? '한 명 더 갖자' : '아이를 갖자', h: '아이 한 명마다 19세까지 매달 양육비 40만 원', warn: n === 2 && !inApt(s) ? '셋째를 키우려면 반드시 넓은 집이 필요하다' : '', f: s => { K.stop = false; K.trying = true; K.tryEnd = s.t + 18; return like('yes', `${josa(sp.name, '과와')} 아이를 ${n ? '한 명 더 ' : ''}갖기로 했다.`); } },
      { t: '아직은 아니다', f: s => { K.stop = false; K.next = s.t + U.int(10, 16); kidOops(s, 0.04); return like('no', `${josa(sp.name, '과와')} 아이는 조금 더 있다가 생각하기로 했다.`); } },
      { t: n ? '아이는 이제 그만 낳는다' : '아이는 갖지 않는다', f: s => { K.stop = true; K.next = s.t + 60; kidOops(s, 0.04); return like('no', n ? '아이는 이제 그만 낳기로 했다.' : `${josa(sp.name, '과와')} 아이 없이 둘이 살기로 했다.`); } },
    ];
  },
});
function familyMonth(s) {
  const a = age(s);
  kidPlanMonth(s);
  for (const k of kids(s)) {
    const ka = kidAge(s, k);
    if (ka < 19 && a >= 19) addMoney(s, -40e4, '양육비');
    for (const sk in (k.lessons || {})) {
      if (k.lessons[sk] <= s.t || (SKILLS[sk].les && !lesOK(k, sk))) { delete k.lessons[sk]; continue; }
      const les = SKILLS[sk].les;
      addMoney(s, -(les ? lesCost(k, sk) : 20) * 1e4, '자녀 학원비');
      practice(s, k, sk, 1, 1.5);
    }
    // 자녀 교육비(생활 → 지속 관리, 아이마다 없음·약간·보통·많이)를 내면 4~18세 아이는 잘하는 특기 세 개가 매달 과외만큼 는다
    // v205: 네 살이 넘었는데 아직 자녀 교육비 창에 답하지 않았으면 (예전엔 네 살이 된 해 1월에 한 번만 띄웠다) 창을 띄운다
    if (ka >= 4 && ka <= 17 && !k.eduTold && !kidEduOf(s, k) && !kidEduQ(s, k)) queueEv(s, 'kid_edu_open', 0, { id: k.id }, true);
    const eb = KIDEDU[kidEduOf(s, k)].base;
    if (eb && ka >= 4 && ka <= 18) for (const sk of learnedSkills(k).sort((x, y) => lv(k, y) - lv(k, x)).slice(0, 3)) practice(s, k, sk, eb, 1.5);
    // 성인이 된 자녀는 주인공처럼 매달 세 칸을 연습한다 (잘하는 특기 세 개에 한 칸씩)
    if (ka >= 19) for (const sk of learnedSkills(k).sort((x, y) => lv(k, y) - lv(k, x)).slice(0, 3)) practice(s, k, sk, 1);
  }
}
// 일정 칸 '아이 가르치기': 아이 특기가 학원보다 조금 빨리 늘고, 내 교육 특기도 는다
function kidTeachMonth(s) {
  const kt = s.kidTeach, k = kt && s.people[kt.id], pme = me(s);
  if (!k || !k.alive || kidAge(s, k) >= 19) { s.kidTeach = null; return; }
  // 가르치는 실력: 교육 60%와 내 그 특기 40%
  practice(s, k, kt.sk, 1.2, 1.5 + teachLv(pme, kt.sk) / 100);
  teach(s, pme, 1); useSkill(s, pme, kt.sk, 0.2);
  aff(k, 1); k.contactT = s.t; addStress(s, 1);
  kt.left--;
  if (kt.left <= 0) { addLog(s, `${k.name}에게 ${josa(SKILLS[kt.sk].n, '을를')} 가르친 지 1년이 됐다. 이제 ${k.name} 혼자서도 연습한다. (${SKILLS[kt.sk].n} ${lvi(k, kt.sk)}레벨)`, 'ev'); s.kidTeach = null; }
}
// 해마다: 아이가 크면서 스스로도 배운 걸 연습한다
function familyYear(s) {
  if (typeof sibYear === 'function') sibYear(s);
  for (const k of kids(s)) {
    const ka = kidAge(s, k);
    // 네 살이 되면 자녀 교육비를 정할 수 있다고 알려 준다 (아이마다 한 번, 답할 때까지 · v205: familyMonth)
    if (ka === 7) { learnSkill(s, k, 'study'); k.job = '학생'; addLog(s, `${josa(k.name, '이가')} 초등학교에 입학했다.`, 'news'); }
    if (ka >= 7 && ka < 19) for (const sk of learnedSkills(k)) practice(s, k, sk, 6);
    if (ka === 19) k.job = U.chance(0.5) ? '대학생' : '사회초년생';
    // 열여덟 살이 되면 그 아이의 인생으로 넘어갈 수 있다 (아이마다 한 번)
    if (ka === 18 && !k.heir18 && k.alive !== false) { k.heir18 = true; queueEv(s, 'kid_heir18', 0, { id: k.id }, true); }
  }
}
E({
  id: 'kid_heir18', cat: '가족', title: (s, d) => `열여덟 살 ${s.people[d.id].name}`, tag: 'ev',
  cond: s => !s.ended,
  init(s, d) { const k = s.people[d.id]; if (!k || k.rel !== '자녀' || k.alive === false) d.skip = true; },
  html: (s, d) => { const k = s.people[d.id]; return `<div class="m-text">${rich(`${josa(k.name, '이가')} 열여덟 살이 됐다. 지금 ${k.name}의 인생으로 넘어갈 수 있다. 넘어가면 ${me(s).name}의 이야기는 여기서 끝나고, ${k.name}의 열여덟 살부터 이어진다.`)}</div>` + heirCard(s, k, true); },
  text: (s, d) => { const k = s.people[d.id]; return `${josa(k.name, '이가')} 열여덟 살이 됐다.`; },
  kid: (s, d) => d.id,
  ch: (s, d) => { const k = s.people[d.id]; return [
    { t: '지금 인생을 계속 산다', f: () => '' },
    { t: `${k.name}의 인생으로 넘어간다`, h: `${me(s).name}의 이야기는 여기서 끝난다`, confirm: `정말 ${k.name}의 인생으로 넘어갈까요?

${me(s).name}의 이야기는 여기서 끝나고, 되돌릴 수 없어요.`, f: s => { endLife(s, 'handoff', '', k.id); return ''; } },
  ]; },
});

// ───── 자녀로 이어 하기 ─────
function wealthFromMoney(v) { return v >= 30e8 ? 10 : v >= 10e8 ? 9 : v >= 5e8 ? 8 : v >= 2e8 ? 7 : v >= 1e8 ? 6 : v >= 5e7 ? 5 : v >= 2e7 ? 4 : v >= 0 ? 3 : 2; }
function continueAs(s, kidId) {
  // 아이의 다른 부모: 아이를 함께 낳은 사람 (헤어진 사람이 키운 아이면 그 사람)
  const kid = s.people[kidId], old = me(s), sp = (kid.parents || []).map(id => s.people[id]).find(p => p && p.id !== old.id) || partner(s);
  const sib = kids(s).filter(k => k.id !== kidId);
  const ns = blankState();
  ns.gen = (s.gen || 1) + 1; ns.pkFix = 1;
  ns.people = s.people; ns.me = kid.id;
  kid.rel = '나'; kid.aff = 100;
  const ka = Math.max(0, kidAge(s, kid));
  ns.birthYear = kid.by; ns.birthMonth = calM(s); ns.t = ka * 12;
  ns.region = s.region; ns.birthRegion = s.region; ns.place = s.place; ns.birthPlace = s.place;
  ns.wealth = wealthFromMoney(netWorth(s));
  // 이전 주인공은 엄마나 아빠로 남는다
  old.rel = old.g === '여' ? '엄마' : '아빠'; old.aff = 80; old.job = s.ended ? (s.ended.job || s.ended.title || '은퇴') : '은퇴';
  if (s.ended && s.ended.kind === 'handoff') { old.fame = totalFans(s); old.ind = anyTrackActive(s) || s.everSuccess; }
  if (s.ended) old.diesY = old.by + s.ended.deathAge;
  if (sp) { sp.rel = sp.g === '여' ? '엄마' : '아빠'; sp.aff = 80; }
  const momP = old.g === '여' ? old : (sp && sp.g === '여' ? sp : null), dadP = old.g === '남' ? old : (sp && sp.g === '남' ? sp : null);
  ns.family = { mom: momP ? momP.id : null, dad: dadP ? dadP.id : null, single: !(momP && dadP) };
  // v212: '부모님 지인'은 부모와 아주 가까웠던(친밀도 70 이상) 업계 사람 가운데 가장 가까운 셋까지만. 예전엔 55 이상이면 모두 넘어와서, 아이 인간관계에 부모 또래 연예인이 줄줄이 남았다
  const PK_REL = ['동료', '친구', '동기', '선배', '후배', '지인', '멤버', '전 멤버', '제자', '부모님 지인'];
  const pk = new Set(Object.values(ns.people).filter(p => PK_REL.includes(p.rel) && p.aff >= 70 && p.ind && p.alive !== false && p.id !== kid.id && !(sp && p.id === sp.id)).sort((a, b) => b.aff - a.aff).slice(0, 3).map(p => p.id));
  for (const p of Object.values(ns.people)) {
    if (p.id === kid.id || p.id === old.id || (sp && p.id === sp.id)) continue;
    // 예전 주인공의 형제자매는 이제 친척이라 목록에서 빠진다
    if (p.rel === '형제자매') { p.rel = '친척'; p.hidden = true; continue; }
    if (p.rel === '자녀') { p.rel = '형제자매'; p.aff = 60; continue; }
    // 부모님과 친하던 업계 사람은 '부모님 지인'으로 남는다. 나머지는 다시 모르는 사이가 된다
    if (PK_REL.includes(p.rel)) { if (pk.has(p.id)) { p.rel = '부모님 지인'; p.aff = 35; } else { p.rel = '업계'; p.hidden = !p.ind; } }
    if (['전 연인', '연인', '배우자', '전 배우자'].includes(p.rel)) { p.rel = '업계'; p.hidden = !p.ind; }
  }
  ns.olderSib = sib.filter(k => k.by < kid.by).length; ns.youngerSib = sib.filter(k => k.by >= kid.by).length;
  ns.persona = pickPersona(kid);
  ns.health = U.wpick(HEALTHS, h => h.w).id;
  ns.stress = 5; ns.rep = 60; ns.fame = 0; ns.buzz = 0; ns.jpop = {};
  // v213: 유명한 부모의 아이는 부모 인지도의 60%에서 시작한다. 바닥은 없다 (활동을 안 하면 다른 사람처럼 천천히 잊힌다)
  ns.fame = Math.round((s.fame || 0) * 0.6);
  for (const id of CAREER_IDS) ns.tracks[id] = { st: 'none' };
  ns.trend = s.trend; ns.trendTV = s.trendTV;
  // 같은 세상이 이어지니 회사 이름도 그대로 (v115: 예전엔 빠져서 다시 불러오면 처음 이름으로 돌아갔다)
  ns.coNames = s.coNames; ns.coMod = s.coMod; ns.coGone = s.coGone;
  if (ka >= 19) { ns.edu.graduated = true; ns.money = ns.wealth >= 7 ? 3000e4 : ns.wealth >= 5 ? 1000e4 : 200e4; }
  // 이미 지나간 나이의 정해진 사건은 다시 일어나지 않게 한다
  const passed = { dol: 1, can_schedule: 7, school_start: 7, english_class: 9, jp_class: 13, job_exp: 15, club: 17, hs_choice: 16, college: 19, leave_home: 20, best_friend: 8 };
  for (const [id, a] of Object.entries(passed)) if (ka >= a) ns.done[id] = 1;
  if (ka >= 7 && !has(kid, 'study')) learnSkill(ns, kid, 'study', 5);
  if (ka >= 9 && !has(kid, 'en')) learnSkill(ns, kid, 'en', 3);
  if (ka >= 16 && ka < 19) ns.edu.hs = '일반고';
  const r = REGION_BY[ns.region];
  const handoff = s.ended && s.ended.kind === 'handoff';
  addLog(ns, handoff ? (ka > 0 ? `${old.name}의 ${kid.g === '여' ? '딸' : '아들'} ${kid.name}의 이야기가 ${ka}세부터 이어진다. (${ns.gen}대째)` : `${old.name}의 ${kid.g === '여' ? '딸' : '아들'}로 태어난 ${kid.name}의 이야기가 시작된다. (${ns.gen}대째)`) : `${josa(old.name, '이가')} 은퇴한 뒤, ${old.g === '여' ? '엄마' : '아빠'}의 뒤를 이어 ${kid.name}의 이야기가 시작된다. (${ns.gen}대째)`, 'birth');
  addLog(ns, `${kid.by}년, ${ns.place}에서 ${kid.g === '여' ? '딸' : '아들'}로 태어났다. 지금 ${ka}세.`, 'birth');
  milestone(ns, `${kid.by}년, ${old.name}의 ${kid.g === '여' ? '딸' : '아들'}로 태어났다.`);
  const gf = gifts(kid).filter(k => k !== 'looks' && k !== 'star');
  if (gf.length) { const w = gf.map(k => TALENT_BY[k].n).join('·'); milestone(ns, `타고난 재능은 ${w}${josa(w, '이') !== w ? '이었다' : '였다'}.`); }
  return ns;
}
// 부모님이 된 이전 주인공은 정해진 나이에 세상을 떠난다
function elderYear(s) {
  for (const p of people(s, p => p.diesY)) if (calY(s) >= p.diesY && p.alive) { queueEv(s, 'parent_loss', 0, { id: p.id }, true); p.diesY = null; }
}
