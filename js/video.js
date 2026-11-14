'use strict';
// 방송·영상 쪽 직업 (5단계): 배우, 연기 트레이너, 예능인, 스트리머·버튜버, 편집자, 모델 · 브랜드 광고
// 공통 부품: 드라마 장르 유행(s.trendTV.drama), 연말 연기대상(ceremony, music.js의 시상식 창을 같이 쓴다)
// 직업 활동을 하면 관련 특기가 혼자 연습할 때보다 빨리 는다 (직업 경험)

// ════════ 배우 ════════
// v95: 연기(강함)와 외모(보통). 장르마다 다른 것은 8-4단계. 인지도가 큰 배역을 넓혀 준다
function actorScore(s, p = me(s)) { return lv(p, 'acting') * 0.9 + talB(p.tal.looks, false); }
const ACTOR_TIERS = ['단역 배우', '신인 배우', '조연 배우', '주목받는 배우', '주연 배우', '대세 배우', '톱배우'];
// 등급마다 일의 크기 (출연료·오디션·섭외 확률에 곱한다. 예전 5단계의 0~4 눈금)
const ACT_POW = [0, 0.5, 1, 2, 3, 3.5, 4];
// 등급이 오르는 기준 (k번째 칸 → k+1): a 연기 호평일 때 점수, b 호평이 아닐 때 점수, ri 최소 배역(0 단역 1 조연 2 주연), fans 필요한 팬, star 톱배우가 되는 스타성
// (2026-11-07 다시 맞춤: 홍보 예능·대호평이 들어간 뒤 톱배우 4% 안팎)
const ACT_UP = { a: [55, 58, 61, 61, 69, 76], b: [64, 68, 72, 73, 81, 90], ri: [0, 1, 1, 2, 2, 2], fans: [0, 0, 1.5e4, 6e4, 2.5e5, 8e5], star: 57 };
// 등급별로 들어오는 배역 (0 단역 1 조연 2 주연, 고르는 비율)
const ACT_ROLES = [[0, 0, 1], [0, 0, 1, 1], [0, 1, 1, 2], [1, 2, 2], [1, 2, 2], [1, 2, 2], [1, 2, 2, 2]];
const ROLE_N = ['단역', '조연', '주연'];
// 작품 종류: months 촬영 달 수, ep 회차, fee 출연료 배수, air 촬영 끝나고 공개까지 달 수
const PJ_TYPES = {
  web: { n: '웹드라마', months: 2, ep: 8, fee: 0.4, air: 1 },
  drama: { n: '드라마', months: 5, ep: 16, fee: 1, air: 1 },
  ott: { n: 'OTT 시리즈', months: 4, ep: 8, fee: 1.4, air: 2 },
  film: { n: '영화', months: 3, film: true, fee: 1, air: 4 },
  // 뮤직비디오: 아주 가끔 들어온다. 촬영이 짧고 등급은 오르지 않는다
  mv: { n: '뮤직비디오', months: 1, ep: 1, fee: 1, air: 1, mv: true },
};
// 촬영을 마치고 공개까지 걸리는 달 수 (작품 종류마다 다르다: 드라마는 편성, 영화는 후반 작업과 개봉 일정을 기다린다)
const PJ_RELEASE = { short: [1, 2], web: [1, 3], drama: [2, 8], ott: [3, 9], film: [6, 14], mv: [1, 2] };
function airDelay(tk) { const r = PJ_RELEASE[tk] || [1, 3]; return U.int(r[0], r[1]); }
// 영상 제작사: 크기마다 3곳 (피드백 26). con 컨셉은 지금은 이름표뿐
const PROD_COS = [
  { n: '스튜디오 해밀', tier: 3, con: '대작 드라마' }, { n: '그린라이트 픽처스', tier: 3, con: '상업 영화' }, { n: '라임트리 픽처스', tier: 3, con: 'OTT 시리즈' },
  { n: '해든 제작소', tier: 2, con: '장르물' }, { n: '온스크린 픽처스', tier: 2, con: '로맨스' }, { n: '여울필름', tier: 2, con: '작가주의 영화' },
  { n: '프레임원 스튜디오', tier: 1, con: '웹드라마' }, { n: '청춘필름', tier: 1, con: '청춘물' }, { n: '소나기 픽처스', tier: 1, con: '단편·광고' },
];
const PROD_CO = PROD_COS.map(x => x.n);
function prodCoOf(tier) { return U.pick(PROD_COS.filter(x => x.tier === tier)).n; }
function actorAgencies() { return AGENCIES.filter(a => a.kind === 'actor'); }
// 음악 소속사(아이돌 그룹·솔로 계약)에 있으면 연기도 그 회사를 통해서 한다
function musicAgOf(s) { const T = s.tracks; return T.idol.st === 'active' ? T.idol.ag : T.solo.st === 'signed' ? T.solo.ag : null; }
// 성인이 된 뒤(19세~) 출연한 작품 수를 작품 기록에서 센다 (신인상 기준)
function adultActWorks(s) { return (s.works || []).filter(w => ROLE_N.includes(w.by) && w.a >= 19).length; }
// 배우를 시작한다. via: 'agency'(배우 소속사) · 'music'(음악 소속사를 통해) · 'indie'(무소속)
function startActor(s, o = {}) {
  const old = s.tracks.actor, ag = o.ag ? AG[o.ag] : null, via = o.via || (ag ? 'agency' : 'indie');
  // 소속을 옮겨도 지난 출연 기록(성인 출연작 수·공개 대기 작품·신인상 여부)은 그대로 이어진다
  s.tracks.actor = { st: 'active', via, ag: o.ag || null, agN: ag ? ag.n : '', tier: old.tier || 0, works: old.works || 0, adultWorks: Math.max(old.adultWorks || 0, adultActWorks(s)), wait: old.wait || [], leadMs: old.leadMs, cut: via === 'music' ? 0.3 : o.cut != null ? o.cut : ag ? ag.cut : 0, months: 0, contract: via === 'agency' ? (o.months || 48) : 0, proj: null, yearBest: old.yearBest || 0, rookie: old.rookie, sn: old.sn, hist: old.hist || [] };
  if (!old.works && !(old.hist || []).length) milestone(s, `${age(s)}세에 배우의 길에 들어섰다.`);
  if (via === 'agency') return `${josa(ag.n, '과와')} 배우 전속 계약을 했다. (${yrs(s.tracks.actor.contract)} · 회사 몫 ${pctN(s.tracks.actor.cut)})`;
  if (via === 'music') return `${josa(ag.n, '을를')} 통해 연기 활동도 시작했다. 출연료의 30%는 회사 몫이다.`;
  return '소속사 없이 배우 활동을 시작했다. 일정에 배우 활동을 넣어야 오디션 연락이 온다.';
}
function actorBlock(s) {
  if (s.army) return '군 복무 중';
  if (s.tracks.idol.st === 'trainee') return '연습생은 회사 허락 없이 연기 활동을 못 한다';
  return '';
}
// 들어온 작품들 (배역·종류·대본 완성도·오디션 붙을 가능성·출연료)
function genProjects(s, tier, n) {
  const out = [], a = age(s), p = me(s);
  const roles = ACT_ROLES[tier];
  for (let i = 0; i < n; i++) {
    const tk = U.chance(0.04) ? 'mv' : U.pick(tier <= 1 ? ['web', 'web', 'drama', 'film'] : ['web', 'drama', 'drama', 'ott', 'film']), T = PJ_TYPES[tk];
    let ri = U.pick(roles);
    if (a < 19 && ri === 2 && tk !== 'web' && !T.mv) ri = 1;
    if (T.mv) ri = Math.max(1, ri);
    const singer = T.mv ? pickIndustry(s, '가수') : null;
    const genre = T.mv ? `가수 ${singer.name}` : U.chance(0.35) ? s.trendTV.drama : U.pick(DRAMA_TRENDS);
    const demand = (T.mv ? [22, 30, 40] : [22, 38, 54])[ri] + (T.film ? 4 : 0);
    const q = U.int(30, 92);
    const base = [50, 150, 300, 1000, 3000, 5500, 9000][tier] * 1e4 * [0.3, 0.7, 1][ri] * awMul(s, 'actor');
    const fee = Math.round(base * (T.film ? 10 : T.ep) * T.fee / 1e4) * 1e4;
    const sc = actorScore(s) + ACT_POW[tier] * 4 + Math.log10(1 + totalFans(s)) * 2 + pm(s, 'audition', 0);
    const pp = U.clamp(U.sig((sc - demand) / 6), 0.03, 0.95);
    const dir = pickIndustry(s, '연출감독');
    out.push({ title: T.mv ? songTitle() : dramaTitle(genre), tk, ri, genre, demand, q, fee, p: pp, dir: dir.id, co: U.pick(PROD_CO), singer: singer ? singer.id : null, teacher: genre === '학원물' && a >= 40 });
  }
  return out;
}
// 대호평·대혹평 문턱(연기 평 점수)과 대호평 때 팬이 느는 크기
const ACT_BIG = { hi: 33, lo: -18, boom: 1 };
// 잘 됐다/못 됐다 둘로만 나뉘는 일(예능 출연·모델 일)의 대박·대참사: 잘 나온 일 중 일부는 크게 화제가 되고, 못 나온 일 중 일부는 크게 망신을 산다 (p: 잘 나올 가능성)
// 예능에서 한 번 크게 웃기면(잘 나오면) 예능 특기를 바로 얻는다
function varLearn(s, good) { return good && !has(me(s), 'variety') ? learnMe(s, 'variety') : ''; }
function bigRoll(good, p) { return good ? (U.chance(U.clamp(0.06 + (p - 0.5) * 0.3, 0.04, 0.2)) ? 1 : 0) : (U.chance(U.clamp(0.06 + (0.5 - p) * 0.25, 0.03, 0.18)) ? -1 : 0); }
// 연기 평: 연기 실력(배역이 요구하는 수준과의 차이)에 표현력·전달력, 그리고 장르마다 맞는 재능이 보탠다 (GENRE_FIT)
// 판타지는 연기 실력 차이가 더 크게 드러나고, 학원물은 30대에 몰입이 깨진다
function actPerf(s, pj, p = me(s)) {
  const G = GENRE_FIT[pj.genre] || {}, a = age(s);
  let v = (lv(p, 'acting') - pj.demand) * (G.actW || 1) + (p.tal.express - 50) * 0.12 + (p.tal.verbal - 50) * 0.08;
  if (G.tal) v += fitB(p, G.tal);
  // 학원물 (v96): 30대는 학생 역에 몰입이 깨진다. 40세부터는 늘 교사 역이라 깨지지 않는다
  const teach = !!G.young && (pj.teacher || a >= 40);
  const old = !!G.young && !teach && a >= 30;
  if (old) v -= 12;
  return { v, old };
}
function roleTxt(pj) { return `${ROLE_N[pj.ri]}${pj.teacher ? ' (교사 역)' : ''}`; }
function pjLabel(pj) { return `${PJ_TYPES[pj.tk].n} · ${pj.genre} · ${roleTxt(pj)}`; }
// 작품에 붙으면 촬영을 시작한다 (함께 나오는 배우들과 감독을 만난다)
function startProject(s, pj) {
  const t = s.tracks.actor, T = PJ_TYPES[pj.tk];
  const cast = [];
  for (let i = 0, n = T.mv ? 1 : U.int(2, 4); i < n; i++) cast.push(pickIndustry(s, '배우', x => !cast.includes(x)));
  const dir = s.people[pj.dir] || pickIndustry(s, '연출감독');
  for (const c of cast.concat(dir)) meetAt(s, c, `${T.n} 「${pj.title}」`, 'actor');
  if (s.people[pj.singer]) meetAt(s, s.people[pj.singer], `뮤직비디오 「${pj.title}」`, 'actor');
  t.proj = Object.assign({}, pj, { id: 'pj' + U.uid(), left: T.months, cast: cast.map(c => c.id), dir: dir.id });
  if (!t.sn) askStageName(s, 'actor');
  return `${T.n} 「${pj.title}」 ${ROLE_N[pj.ri]}${josa(ROLE_N[pj.ri], '으로').slice(ROLE_N[pj.ri].length)} 캐스팅됐다!${pj.teacher ? ' 학생들을 맡은 교사 역이다.' : ''} ${T.months}개월 동안 촬영한다. 감독은 ${dir.name}.`;
}
// 촬영 끝 (12-3): 마지막 촬영 날의 촬영장을 실시간 창으로 보여 준다. 영화 · OTT · 뮤직비디오는 영화 촬영장, 드라마 · 웹드라마는 야외 촬영
// 주연작이거나 첫 작품이 '중요할 때'. 창을 볼 차례가 아니면 예전처럼 기록 한 줄만 남는다 (요약 창)
function actorWrap(s, t, pj, wait) {
  const p = me(s), T = PJ_TYPES[pj.tk], pf = actPerf(s, pj), v = pf.v + pj.pn, out = pj.tk === 'drama' || pj.tk === 'web';
  const cast = (pj.cast || []).map(id => s.people[id]).filter(Boolean), castAvg = cast.length ? cast.reduce((a, c) => a + lv(c, 'acting'), 0) / cast.length : 40;
  const live = typeof liveStage === 'function' ? liveStage({ k: 'set', vn: out ? 'outdoor' : 'film', place: out ? '야외 촬영' : `${T.n === '영화' ? '영화' : T.n} 촬영장`, t: pj.title, g: actName(s, 'actor'), cn: actCall(s, 'actor'),
    mem: [[actCall(s, 'actor'), ROLE_N[pj.ri]]].concat(cast.slice(0, 4).map(c => [callName(c.name), ''])), mi: 0, key: pj.ri === 2 || !t.works, old: pf.old,
    z: { perf: v / 14, emo: (p.tal.express - 50) / 20, co: (castAvg - 45) / 18, vis: (p.tal.looks - 55) / 20 }, sc: U.clamp(50 + v * 2, 0, 100) }) : null;
  const mood = v > 12 ? evG('감독이 오늘 연기를 크게 칭찬했다.') : v < -5 ? evB('NG가 많아 진땀을 뺐다.') : '무난하게 마무리했다.';
  queueEv(s, 'actor_wrap', 0, { title: pj.title, when: ymLater(s, wait), live, mood }, true);
}
E({
  id: 'actor_wrap', cat: '촬영', title: (s, d) => `「${d.title}」 촬영 끝`, tag: 'career',
  keepPop: (s, d) => typeof liveShow === 'function' && liveShow(d.live),
  live: (s, d) => d.live,
  text: (s, d) => `「${d.title}」 마지막 촬영을 마쳤다. ${d.mood}\n\n${d.when}쯤 공개된다.`,
  ch: (s, d) => [{ t: '확인', f: () => `「${d.title}」 촬영을 마쳤다. ${d.when}쯤 공개된다.` }],
});
CAREERS.actor = {
  n: '배우', ic: '🎬',
  desc: '드라마와 영화에 나온다. 연기가 가장 중요하고, 외모와 인지도가 큰 배역을 넓혀 준다. 작품이 잘되면 조연에서 주연으로 올라간다.',
  act: { n: '배우 활동 (오디션·촬영)', ic: '🎬', g: '직업 활동', eff: [['연기', '↑↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) {
    if (t.st !== 'active') return t.endNote || '';
    return `${ACTOR_TIERS[t.tier]} · ${t.via === 'indie' ? '무소속' : t.agN + ' 소속'} · 출연작 ${t.works}편` + (t.proj ? ` · 「${t.proj.title}」 촬영 중 (${t.proj.left}개월 남음)` : '') + ((t.wait || []).length ? ` · 공개 대기 ${t.wait.length}편` : '');
  },
  short(s, t) { return `배우 ${actName(s, 'actor')}`; },
  seg(s, t) { return `${t.via === 'indie' ? '무소속' : t.agN + ' 소속'} 배우`; },
  title(s, t) { return t.works ? ACTOR_TIERS[t.tier] : null; },
  contract(s, t) { return t.st === 'active' && t.via === 'agency' ? t.agN : ''; },
  cLeft(s, t) { return t.st === 'active' && t.via === 'agency' ? t.contract - t.months : null; },
  mainSk() { return 'acting'; },
  info(s, t) {
    const p = me(s), R = [];
    R.push(['소속', t.via === 'agency' ? `${t.agN} (${TIER_N[AG[t.ag].tier]} 배우 소속사) · 회사 몫 ${pctN(t.cut)}` : t.via === 'music' ? `${josa(t.agN, '을를')} 통해 활동 · 회사 몫 30%` : '무소속']);
    R.push(['등급', ACTOR_TIERS[t.tier]]);
    R.push(['내 실력', ['acting', 'variety'].filter(k => has(p, k)).map(k => `${SKILLS[k].n} ${lvi(p, k)}`).join(' · ') || '-']);
    R.push(['출연작', `${t.works}편`]);
    if (t.proj) R.push({ h: `「${t.proj.title}」 촬영 중 (${t.proj.left}개월 남음)`, items: [`${pjLabel(t.proj)} · 감독 ${(s.people[t.proj.dir] || {}).name || '-'}`].concat(t.proj.cast.map(id => s.people[id]).filter(Boolean).map(x => ({ who: x.id, t: x.name, sub: `연기 ${lvSee(s, x, 'acting')} · ${relWord(x)}` }))) });
    if ((t.wait || []).length) R.push({ h: '공개를 기다리는 작품', items: t.wait.map(w => `「${w.title}」 ${PJ_TYPES[w.tk].n} · ${ROLE_N[w.ri]} · ${ymLater(s, Math.max(0, w.at - s.t))} 공개${w.promo ? ' · 예능에서 홍보함' : ''}`) });
    return R;
  },
  // 촬영 중에는 주연이면 두 칸, 조연·단역이면 한 칸이 묶인다
  locks(s, t) { return t.proj ? Array(Math.min(s.slots.length, t.proj.ri === 2 ? 2 : 1)).fill('c_actor') : []; },
  actions(s, t) {
    if (t.st !== 'active') return [];
    if (t.via === 'agency') { const pen = Math.max(1000e4, Math.max(0, t.contract - t.months) * 60e4 * AG[t.ag].tier); return [{ t: '소속사와 계약 해지', h: `계약이 ${Math.max(0, t.contract - t.months)}개월 남았다 · 위약금 ${fmtWon(pen)} · 해지하면 무소속으로 활동한다`, ok: !t.proj, why: '촬영 중에는 할 수 없다', danger: true, confirm: `${josa(t.agN, '과와')}의 계약을 해지할까요? 위약금 ${fmtWon(pen)}을 물어야 해요.`, run: s => { s.debt += pen; t.hist.push(`${t.agN} (계약 해지)`); t.via = 'indie'; t.ag = null; t.agN = ''; t.cut = 0; t.contract = 0; return '배우 소속사와의 계약을 해지했다. 이제 무소속으로 활동한다.' + fx(s, { rep: -4 }); } }]; }
    return [{ t: '배우 그만두기', ok: !t.proj, why: '촬영 중에는 그만둘 수 없다', danger: true, confirm: '정말 배우 일을 그만둘까요?', run: s => { t.st = 'ended'; t.endNote = `${ACTOR_TIERS[t.tier]}, 출연작 ${t.works}편`; t.hist.push(t.endNote); return '배우 일을 그만뒀다.'; } }];
  },
  monthly(s, t) {
    if (t.st !== 'active') return;
    t.months++;
    if (calM(s) === 11) actorAwards(s, t);
    // 공개를 두 달쯤 앞둔 작품(조연·주연)은 예능에서 홍보 출연 섭외가 온다 (작품마다 한 번)
    for (const w of (t.wait || [])) if (!w.asked && w.ri >= 1 && w.tk !== 'mv' && w.at - s.t <= 2 && !hasQ(s, 'promo_show') && U.chance((0.3 + w.ri * 0.15 + ACT_POW[t.tier] * 0.04) * stigmaMul(s))) { w.asked = true; queueEv(s, 'promo_show', 0, { id: w.id }); }
    // 음악 소속사를 통해 하던 연기는 그 계약이 끝나면 무소속이 된다
    if (t.via === 'music' && !musicAgOf(s)) { t.via = 'indie'; t.ag = null; t.agN = ''; t.cut = 0; }
    const p = me(s), n = slotsOn(s, 'c_actor');
    if (t.proj) {
      // 촬영: 실전 연기로 실력이 빨리 는다. 함께 찍는 사람들과 가까워지거나 부딪힌다
      practice(s, p, 'acting', 1.5 * Math.max(1, n));
      addStress(s, t.proj.ri === 2 ? 4 : 2.5);
      for (const id of t.proj.cast) { const c = s.people[id]; if (c) bond(s, c, U.chance(0.1) ? -U.int(4, 10) : U.int(0, 3)); }
      t.proj.left--;
      if (t.proj.left <= 0) {
        // 촬영을 마치면 작품 종류(플랫폼)에 따라 공개까지 기다린다. 그사이 홍보 예능 섭외가 오기도 한다
        t.proj.id = t.proj.id || 'pj' + U.uid();
        const wait = airDelay(t.proj.tk);
        t.wait = (t.wait || []).concat({ id: t.proj.id, title: t.proj.title, tk: t.proj.tk, ri: t.proj.ri, at: s.t + wait });
        t.proj.pn = U.normal(0, 6);
        queueEv(s, 'actor_res', wait, { pj: t.proj }, true); actorWrap(s, t, t.proj, wait); t.proj = null;
      }
      return;
    }
    if (t.via === 'agency' && t.months >= t.contract) queueEv(s, 'actor_contract', 0);
    // 소속사가 있으면 일정에 넣지 않아도 회사가 작품을 물어 온다 (넣으면 훨씬 자주)
    if (n) { practice(s, p, 'acting', 1.2 * n); useSkill(s, p, 'variety', 0.2 * n); addStress(s, 1.5); }
    if (!n && t.via === 'indie') return;
    const chance = stigmaMul(s) * (0.1 + ACT_POW[t.tier] * 0.03 + (t.via !== 'indie' ? 0.05 : 0) + Math.min(0.12, Math.log10(1 + totalFans(s)) / 45)) * access(s) * (n ? 1 : 0.45) * (0.8 + s.rep / 250) * (0.75 + jpop(s, 'actor') / 200);
    if (!hasQ(s, 'actor_offer') && U.chance(chance)) queueEv(s, 'actor_offer', 0);
    // 이름이 알려지면 제작사가 오디션 없이 배역을 제안한다 (메시지함)
    if (t.tier >= 3 && !s.inbox.some(m => m.kind === 'cast_offer') && U.chance((0.02 + ACT_POW[t.tier] * 0.01) * stigmaMul(s))) { const pj = genProjects(s, t.tier, 1)[0]; pj.ri = Math.max(pj.ri, t.tier >= 4 ? 2 : 1); sendMsg(s, 'cast_offer', { from: pj.co, title: `${PJ_TYPES[pj.tk].n} ${ROLE_N[pj.ri]} 제안`, months: 3, d: { pj } }); }
  },
};
// 배우 소속사 오디션 (직업 지원). v207: 회사 특징 (CO_FOCUS.actor)
function actorAudP(s, ag) { return audP(coFocus(s, 'actor', ag.con, actorScore(s)) + pm(s, 'audition', 0) + (age(s) < 19 ? 4 : 0), ag.thr); }
for (const ag of actorAgencies()) JOB_APPLY.push({
  id: 'actor_' + ag.id, trk: 'actor', g: '🎬 배우', get n() { return `${ag.n} 배우 오디션`; }, get tag() { return agTag(ag); },
  show: s => !(trackOn(s, 'actor') && s.tracks.actor.via === 'agency') && age(s) >= 8 && age(s) <= 40,
  h: s => `합격 가능성 ${fmtPct(actorAudP(s, ag))} · 결과는 다음 달${age(s) < 19 ? ' · 아역 배우로 시작' : ''}`,
  ok: s => !actorBlock(s) && !agencyContract(s) && !(s.cd['aaud_' + ag.id] > s.t) && !hasQ(s, 'actor_aud') && (s.tracks.actor.proj == null),
  why: s => actorBlock(s) || contractWhy(s) || (s.cd['aaud_' + ag.id] > s.t ? '같은 회사는 1년 뒤에 다시 볼 수 있다' : hasQ(s, 'actor_aud') ? '다른 오디션 결과를 기다리는 중' : '촬영 중에는 볼 수 없다'),
  run: s => { const p = actorAudP(s, ag); s.cd['aaud_' + ag.id] = s.t + 12; queueEv(s, 'actor_aud', 1, { ag: ag.id, p }); return `${ag.n} 배우 오디션을 봤다.`; },
});
// 음악 소속사에 있으면 그 회사를 통해 연기를 시작한다
JOB_APPLY.push({
  id: 'actor_music', trk: 'actor', g: '🎬 배우', n: '지금 소속사를 통해 연기 시작하기',
  show: s => !trackOn(s, 'actor') && !!musicAgOf(s),
  h: s => `${AG[musicAgOf(s)].n}가 작품 오디션을 잡아 준다 · 출연료의 30%는 회사 몫`,
  ok: s => !actorBlock(s) && age(s) >= 14 && lv(me(s), 'acting') >= 15,
  why: s => actorBlock(s) || (age(s) < 14 ? '14세부터 할 수 있다' : '연기를 더 배워야 한다'),
  run: s => startActor(s, { ag: musicAgOf(s), via: 'music' }),
});
JOB_APPLY.push({
  id: 'actor_indie', trk: 'actor', g: '🎬 배우', n: '소속사 없이 배우 시작하기',
  show: s => !trackOn(s, 'actor') && !musicAgOf(s),
  h: s => '프로필을 들고 제작사를 돌아다닌다 · 일정에 배우 활동을 넣어야 오디션 연락이 온다',
  ok: s => !actorBlock(s) && !artistContract(s) && age(s) >= 19 && lv(me(s), 'acting') >= 15,
  why: s => actorBlock(s) || artistContractWhy(s) || (age(s) < 19 ? '19세부터 할 수 있다' : '연기를 더 배워야 한다'),
  run: s => startActor(s, {}),
});
NEGO.actor = {
  what: d => '배우 전속 계약이다. 회사가 작품 오디션을 잡아 주고 홍보를 맡는다.',
  block: s => agencyContract(s) ? contractWhy(s) : '',
  sign: (s, d) => startActor(s, { ag: d.ag, via: 'agency', months: d.months, cut: d.cut }),
  refuse: (s, d) => `${d.agN}의 배우 계약 제안을 거절했다.`,
};
E({
  id: 'actor_aud', cat: '오디션', title: '배우 오디션 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); },
  text: (s, d) => d.pass ? `${AG[d.ag].n}에서 전속 계약을 하자는 연락이 왔다!${age(s) < 19 ? ' 아역 배우로 시작한다.' : ''}` : `${AG[d.ag].n}에서 연락이 오지 않았다. 불합격이다.`,
  ch: (s, d) => d.pass ? [
    { t: '계약서를 받아 본다', ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '정산 비율과 계약 기간을 협상할 수 있다', f: s => startNego(s, { kind: 'actor', ag: d.ag, agN: AG[d.ag].n, months: 48 + coLongC(AG[d.ag]), cut: AG[d.ag].cut, lev: U.clamp((d.p - 0.5) * 0.8 + 0.3, 0.05, 0.8) }) },
    { t: '거절한다', f: () => `${AG[d.ag].n}의 계약 제안을 거절했다.` },
  ] : [{ t: '다시 준비한다', f: s => `${AG[d.ag].n} 배우 오디션에 떨어졌다.` + fx(s, { stress: 3 * pm(s, 'loseStress') }) }],
});
E({
  id: 'actor_contract', cat: '계약', title: '배우 계약 만료', tag: 'career',
  cond: s => s.tracks.actor.st === 'active' && s.tracks.actor.via === 'agency',
  init(s, d) { d.stayCut = Math.round(Math.max(0.1, s.tracks.actor.cut - 0.05) * 100) / 100; },
  text: s => { const t = s.tracks.actor; return `${josa(t.agN, '과와')}의 전속 계약이 끝났다. ${ACTOR_TIERS[t.tier]}, 출연작 ${t.works}편.`; },
  ch(s, d) {
    const t = s.tracks.actor;
    return [
      { t: `${josa(t.agN, '과와')} 재계약`, h: `회사 몫 ${pctN(d.stayCut)} · 4년`, f: s => { t.months = 0; t.contract = 48; t.cut = d.stayCut; return `${josa(t.agN, '과와')} 재계약했다.`; } },
      { t: '소속사를 나와 혼자 활동한다', f: s => { t.hist.push(`${t.agN} (계약 만료)`); t.via = 'indie'; t.ag = null; t.agN = ''; t.cut = 0; t.contract = 0; return '소속사를 나와 혼자 활동하기로 했다.'; } },
    ];
  },
});
// 작품 제안: 들어온 작품 중 하나를 골라 오디션을 본다
function projChoices(s, ps, onPass) {
  const tier = trackOn(s, 'actor') ? s.tracks.actor.tier : 0, cut = trackOn(s, 'actor') ? s.tracks.actor.cut : 0;
  return ps.map(pj => ({
    t: `「${pj.title}」 ${pjLabel(pj)}`, tr: pj.genre === s.trendTV.drama,
    h: `붙을 가능성 ${fmtPct(pj.p)} · 출연료 약 ${fmtWon(Math.round(pj.fee * (1 - cut)))} · 촬영 ${PJ_TYPES[pj.tk].months}개월 · ${PJ_TYPES[pj.tk].mv ? '콘티' : '대본'} ${grade5(me(s), pj.q, 'q', 'acting')}`,
    f: s => {
      if (!U.chance(pj.p)) return `「${pj.title}」 오디션에서 떨어졌다.` + fx(s, { stress: 3 * pm(s, 'loseStress') });
      onPass(s);
      return startProject(s, pj) + fx(s, { stress: -3 });
    },
  }));
}
E({
  id: 'actor_offer', cat: '캐스팅', title: '오디션 연락', tag: 'career',
  cond: s => s.tracks.actor.st === 'active' && !s.tracks.actor.proj && !pregMe(s),
  init(s, d) { d.ps = genProjects(s, s.tracks.actor.tier, U.int(2, 3)); },
  text: s => { const t = s.tracks.actor; return `오디션을 보러 오라는 작품이 들어왔다. 하나만 고를 수 있다.\n\n연기 ${lvi(me(s), 'acting')}레벨 · '${ACTOR_TIERS[t.tier]}' · 요즘 드라마 유행 '${s.trendTV.drama}'`; },
  ch: (s, d) => projChoices(s, d.ps, () => {}).concat([{ t: '이번엔 다 넘긴다', f: () => '들어온 작품을 모두 거절했다.' }]),
});
// 드라마·영화 오디션 (활동 지원): 배우가 아니어도 연기를 할 줄 알면 직접 지원한다. 붙으면 배우 일이 시작된다
ACT_APPLY.push({
  id: 'drama_aud', cat: 'video', n: '드라마·영화 오디션', ic: '🎬',
  h: s => '지금 배우를 뽑는 작품 중 하나에 직접 지원한다. 붙으면 촬영을 시작한다.',
  ok: s => !actorBlock(s) && age(s) >= 8 && lv(me(s), 'acting') >= 10 && !(trackOn(s, 'actor') && s.tracks.actor.proj) && !(s.cd.dramaAud > s.t) && (!artistContract(s) || !!musicAgOf(s) || (trackOn(s, 'actor') && s.tracks.actor.via === 'agency')),
  why: s => actorBlock(s) || (age(s) < 8 ? '8세부터 지원할 수 있다' : lv(me(s), 'acting') < 10 ? '연기를 더 배워야 한다' : trackOn(s, 'actor') && s.tracks.actor.proj ? '지금 촬영 중이다' : s.cd.dramaAud > s.t ? '얼마 전에 오디션을 봤다' : artistContractWhy(s)),
  run: s => { s.cd.dramaAud = s.t + 3; fireEvent(s, 'drama_aud', {}); return ''; },
});
E({
  id: 'drama_aud', cat: '활동 지원', title: '드라마·영화 오디션', tag: 'career',
  init(s, d) { d.ps = genProjects(s, trackOn(s, 'actor') ? s.tracks.actor.tier : 0, 3); },
  text: s => `지금 배우를 뽑고 있는 작품들이다. 하나에 지원할 수 있다.\n\n연기 ${lvi(me(s), 'acting')}레벨 · 요즘 드라마 유행 '${s.trendTV.drama}'`,
  // 붙었을 때 아직 배우가 아니면 배우 일을 시작한다 (음악 소속사가 있으면 그 회사를 통해서)
  ch: (s, d) => projChoices(s, d.ps, s => { if (!trackOn(s, 'actor')) startActor(s, musicAgOf(s) ? { ag: musicAgOf(s), via: 'music' } : {}); }).map(c => trackOn(s, 'actor') ? c : Object.assign(c, { nj: 'actor' })).concat([{ t: '그만둔다', f: () => '이번엔 지원하지 않기로 했다.' }]),
});
INBOX.cast_offer = {
  ic: '🎬',
  text: (s, m) => { const pj = m.d.pj; return `${m.from}에서 ${PJ_TYPES[pj.tk].n} 「${pj.title}」 ${ROLE_N[pj.ri]}${pj.teacher ? " (교사)" : ""} 역할을 제안했다. 오디션 없이 바로 들어간다.\n\n${pj.genre} · 출연료 약 ${fmtWon(Math.round(pj.fee * (1 - (s.tracks.actor.cut || 0))))} · 촬영 ${PJ_TYPES[pj.tk].months}개월 · ${PJ_TYPES[pj.tk].mv ? '콘티' : '대본'} ${grade5(me(s), pj.q, 'q', 'acting')}`; },
  ch: (s, m) => [
    { t: '수락한다', ok: s => trackOn(s, 'actor') && !s.tracks.actor.proj, h: !trackOn(s, 'actor') ? '지금은 배우 일을 하고 있지 않다' : s.tracks.actor.proj ? '지금 다른 작품을 찍고 있다' : '', f: s => startProject(s, m.d.pj) },
    { t: '거절한다', f: () => `${m.from}의 배역 제안을 거절했다.` },
  ],
};
// 작품 공개: 성적과 연기 평, 팬과 출연료, 등급 오르기
E({
  id: 'actor_res', cat: '작품 성적', title: '작품 공개', tag: 'career',
  cond: s => true,
  init(s, d) {
    const pj = d.pj, t = s.tracks.actor, p = me(s), T = PJ_TYPES[pj.tk];
    // 공개 대기 목록에서 빼고, 홍보 예능에 나갔으면 성적에 조금 보탠다
    const wt = (t.wait || []).find(x => x.id === pj.id), promo = wt ? wt.promo || 0 : 0;
    t.wait = (t.wait || []).filter(x => x.id !== pj.id);
    const cast = (pj.cast || []).map(id => s.people[id]).filter(Boolean), dir = s.people[pj.dir];
    const castAvg = cast.length ? cast.reduce((a, c) => a + lv(c, 'acting'), 0) / cast.length : 40;
    const sc = U.clamp(pj.q * 0.35 + lv(p, 'acting') * [0.1, 0.2, 0.3][pj.ri] + castAvg * 0.1 + (dir ? lv(dir, 'direct') * 0.08 : 3) + visB(p) * 0.6 + Math.log10(1 + totalFans(s)) * 2.2 + (p.tal.star - 50) * 0.1 + (pj.genre === s.trendTV.drama ? 5 : 0) + promo + [10, 6, 0][pj.ri] + U.normal(0, 7), 0, 100);
    const pf = actPerf(s, pj);
    // 연기 평의 운(pn)은 촬영을 마칠 때 이미 정해 뒀다 (12-3: 촬영장 창이 그 연기를 보여 준다). 예전 세이브의 작품은 여기서 굴린다
    const perf = pf.v + (pj.pn != null ? pj.pn : U.normal(0, 6));
    d.oldSchool = pf.old;
    d.review = perf > ACT_BIG.hi ? '연기 대호평' : perf > 12 ? '연기 호평' : perf > -5 ? '무난한 연기' : perf > ACT_BIG.lo ? '연기 혹평' : '연기 대혹평';
    d.good = /호평/.test(d.review); d.bad = /혹평/.test(d.review);
    d.res = T.mv ? `조회수 ${fmtFans(Math.round(Math.pow(10, 4.5 + sc / 25) * PL_VW)).replace('명', '회')}` : pj.tk === 'drama' ?`최고 시청률 ${U.clamp((sc - 30) / 3.5, 0.6, 32).toFixed(1)}%` : pj.tk === 'web' ? `누적 조회수 ${fmtFans(Math.round(Math.pow(10, 4 + sc / 22))).replace('명', '회')}` : pj.tk === 'ott' ? `OTT 주간 순위 ${sc >= 80 ? '1위' : sc >= 70 ? U.int(2, 5) + '위' : sc >= 58 ? U.int(5, 15) + '위' : '20위 밖'}` : `관객 ${fmtFans(Math.min(1.7e7, Math.round(Math.pow(10, 4.3 + sc / 30))))}`;
    d.gain = Math.max(0, fanGain(s, sc, 'kr', [0.3, 0.8, 1.6][pj.ri] * (T.mv ? 0.4 : 1)));
    s.fans.kr += d.gain; s.fans.jp += Math.round(d.gain * 0.03);
    d.fee = Math.round(pj.fee * (1 - (t.cut || 0)));
    earn(s, d.fee, '출연료');
    t.works++; if (age(s) >= 19) t.adultWorks = (t.adultWorks || 0) + 1;
    const big = d.review === '연기 대호평' ? 1 : d.review === '연기 대혹평' ? -1 : 0;
    t.yearBest = Math.max(t.yearBest || 0, sc + ({ '연기 대호평': 14, '연기 호평': 8, '연기 혹평': -8, '연기 대혹평': -14 })[d.review] || 0);
    // 등급: 좋은 평과 성적이 쌓이면 한 칸씩 오른다. 위로 갈수록 팬과 배역 크기도 따라와야 한다 (ACT_UP)
    const k = t.tier, AU = ACT_UP, fameOK = k < 6 && totalFans(s) >= AU.fans[k] && (k < 5 || p.tal.star >= AU.star);
    d.up = !T.mv && fameOK && pj.ri >= AU.ri[k] && big >= 0 && (sc >= AU.b[k] || (d.good && sc >= AU.a[k]));
    if (d.up) { t.tier++; d.upN = ACTOR_TIERS[t.tier]; }
    // 대호평·대혹평: 작품이 잘될수록(많이 볼수록) 팬과 배우로서의 인기가 크게 움직이고, 이름도 알려진다
    const hot = U.clamp((sc - 30) / 50, 0.1, 1.4) * [0.5, 0.8, 1][pj.ri] * (T.mv ? 0.4 : 1);
    if (big > 0) {
      // 작품이 망해도 본 사람들 사이에서 입소문은 난다: 배역 크기와 지금 팬 수에 맞춘 최소한의 팬
      const room = Math.max(0, 1 - s.fans.kr / FANCAP.kr);
      const floor = (1500 + s.fans.kr * 0.03) * [0.5, 0.8, 1][pj.ri] * (T.mv ? 0.4 : 1) * popSpeed(s) * room;
      d.flop = sc < 45;
      d.boom = Math.round(Math.max(d.gain, fanGain(s, sc, 'kr', 1), 0) * (0.3 + hot * ACT_BIG.boom) + floor);
      s.fans.kr += d.boom; s.fans.jp += Math.round(d.boom * 0.03);
      jpopAdd(s, 'actor', 3 + hot * 8); addFame(s, 1 + hot * 3);
    } else if (big < 0) {
      d.boom = -Math.round(s.fans.kr * Math.min(0.3, 0.04 + hot * 0.14));
      s.fans.kr += d.boom;
      jpopAdd(s, 'actor', -4 - hot * 8); addFame(s, hot * 2);
      if (!T.mv && !s.scandal && U.chance(pj.ri === 2 ? 0.6 : 0.3)) startScandal(s, 'acting', 'perf');
    } else if (d.bad) { jpopAdd(s, 'actor', -3); if (pj.ri === 2 && !T.mv && !s.scandal && U.chance(0.25)) startScandal(s, 'acting', 'perf'); }
    else jpopAdd(s, 'actor', (sc - 50) / 20);
    for (const c of cast.concat(dir ? [dir] : [])) bond(s, c, sc >= 60 ? U.int(3, 8) : U.int(-4, 2));
    d.sc = sc;
    // 방영 · 공개 뒤 반응은 라이브온 팝업에서 (12-3)
    if (typeof plioSpec === 'function') d.plio = plioSpec({ k: T.mv ? 'mv' : 'drama', t: `「${pj.title}」 ${T.mv ? '뮤직비디오' : pj.tk === 'movie' ? '예고편 · 명장면' : '하이라이트'}`, ch: `${T.n} 「${pj.title}」`, me: actName(s, 'actor'), sc, rv: ({ '연기 대호평': 2, '연기 호평': 1, '연기 혹평': -1, '연기 대혹평': -2 })[d.review] || 0, vw: Math.pow(10, (T.mv ? 4.5 : 3.8) + sc / 25) });
    addWork(s, { type: T.n, title: pj.title, by: roleTxt(pj), sc, pay: d.fee, note: `${d.res} · ${d.review}` });
    if (t.works === 1) milestone(s, `${age(s)}세에 ${T.n} ${josa(`「${pj.title}」`, '으로')} 첫 작품에 출연했다.`);
    if (d.up && t.tier >= 4 && !t.leadMs) { t.leadMs = true; milestone(s, `${age(s)}세에 ${josa(`「${pj.title}」`, '으로')} ${josa(ACTOR_TIERS[t.tier], '이가')} 되었다.`); }
  },
  text: (s, d) => `${PJ_TYPES[d.pj.tk].n} 「${d.pj.title}」(${roleTxt(d.pj)})이 공개됐다.\n\n${d.res} · ${d.review}\n한국 팬 ${sgnFans(d.gain + (d.boom || 0))} · 출연료 ${fmtWon(d.fee)}`
    + (d.review === '연기 대호평' ? (d.flop ? `\n\n작품 성적은 아쉬웠지만, 본 사람들 사이에서 '인생 연기'라는 말이 돌았다. 명장면 클립이 조금씩 퍼졌다.` : `\n\n'인생 연기'라는 말이 쏟아졌다. 명장면 클립이 여기저기 퍼졌다.`) : '')
    + (d.review === '연기 대혹평' ? `\n\n연기 장면만 모은 영상이 조롱거리가 됐다. 작품을 본 사람이 많을수록 비웃음도 커졌다.` : d.bad ? '\n\n연기력 논란 기사가 났다.' : '')
    + (d.oldSchool && d.bad ? '\n\n교복 입은 모습이 어색해서 몰입이 안 된다는 말이 많았다.' : '')
    + (d.up ? `\n\n이 작품으로 '${ACTOR_TIERS[s.tracks.actor.tier]}' 소리를 듣게 됐다. 더 큰 배역이 들어올 것이다.` : ''),
  // v174: 결과 창을 인터넷 기사로 (ui.js newsEvHTML). 기사는 사실만, 반응은 댓글(영상 댓글), 얻은 것은 토스트로
  html: (s, d) => d.sc != null && d.res && typeof newsEvHTML === 'function' ? newsEvHTML(s, d, EVENTS.actor_res.news(s, d)) : '',
  news(s, d) {
    const pj = d.pj, T = PJ_TYPES[pj.tk], A = `배우 ${actName(s, 'actor')}`, Q = newsQ(pj.title), rv = d.review, f = (d.gain || 0) + (d.boom || 0), film = pj.tk === 'film';
    const dir = s.people[pj.dir], cast = (pj.cast || []).map(id => s.people[id]).filter(Boolean).slice(0, 2).map(c => c.name), role = ROLE_N[pj.ri];
    const heads = T.mv ? [`${A}, 뮤직비디오 ${Q} 출연…${d.res}`, `뮤직비디오 ${Q} 공개…${A} 출연`]
      : rv === '연기 대호평' ? [`${A}, ${Q}에서 인생 연기…${d.res}`, `${Q} ${A}, 연기로 존재감 입증`]
      : rv === '연기 호평' ? [`${Q} ${A}, 안정적인 연기로 눈길`, `${A}, ${Q} ${josa(role, '으로')} 호평…${d.res}`]
      : rv === '연기 대혹평' ? [`${A}, ${Q} 연기력 논란 확산`, `${Q} ${A} 연기 도마 위에`]
      : rv === '연기 혹평' ? [`${Q} ${A}, 연기력 논란`, `${A}, ${Q}에서 아쉬운 연기`]
      : [`${T.n} ${Q} 공개…${d.res}`, `${A} 출연 ${Q} 공개…${d.res}`];
    const body = [
      `${!T.mv && pj.genre ? pj.genre + ' ' : ''}${T.n} ${josa(Q, '이가')} ${film ? '개봉했다' : '공개됐다'}. ${josa(A, '은는')} 이 작품에서 ${josa(roleTxt(pj), '을를')} 맡았다. ${T.mv ? '뮤직비디오는' : '작품은'} ${newsOut(d.res)}.`,
      [dir ? `연출은 ${dir.name} 감독이 맡았다.` : '', cast.length ? `${josa(cast.join(', '), '이가')} 함께 출연했다.` : ''].filter(Boolean).join(' '),
      rv === '연기 대호평' ? `${A}의 명장면을 모은 영상이 온라인에서 퍼지고 있다.` : rv === '연기 대혹평' ? `${A}의 연기 장면을 모은 영상이 온라인에 돌고 있다.` : '',
    ];
    const ts = [[film ? '🎬' : '📺', d.res, newsTone(d.sc)], ['🎭', rv, d.good ? 'g' : d.bad ? 'b' : ''], ['⭐', `내 팬 ${sgnFans(f)} → ${fmtFans(totalFans(s))}`, f >= 0 ? 'g' : 'b'], d.fee ? ['💰', `출연료 +${fmtWon(d.fee)}`, 'g'] : null].filter(Boolean);
    if (d.up) ts.push(newsUp('배우', d.upN || ACTOR_TIERS[s.tracks.actor.tier]));
    return { who: A, heads, body, sec: film ? '영화' : T.mv ? '가요' : '방송', t: pj.title, sc: d.sc, pl: d.plio, cap: `${Q} ${T.mv ? '뮤직비디오' : film ? '예고편' : '하이라이트'} 속 ${A}`, ts };
  },
  plio: (s, d) => d.plio,
  ch: (s, d) => [{ t: '확인', f: () => `「${d.pj.title}」 공개. ${d.res}, ${d.review}.` }],
});
// 작품 홍보 예능: 공개를 앞둔 작품의 배우들이 함께 예능에 나간다. 재밌게 나오면 작품 성적이 조금 오른다
E({
  id: 'promo_show', cat: '예능 섭외', title: '작품 홍보 출연', tag: 'career',
  cond: s => trackOn(s, 'actor') && !s.hiatus && !pregMe(s),
  init(s, d) {
    const t = s.tracks.actor, w = (t.wait || []).find(x => x.id === d.id);
    if (!w) { d.skip = true; return; }
    d.title = w.title; d.tk = w.tk; d.show = tvShowTitle(U.pick(['토크쇼', '토크쇼', '리얼 버라이어티', '관찰 예능'])); d.bc = U.pick(BROADCASTERS);
    d.fee = [30, 50, 80, 150, 300, 450, 600][t.tier] * 1e4;
    d.p = U.clamp(U.sig((varScore(s) + (me(s).tal.humor - 50) * 0.2 - 22) / 7), 0.1, 0.95);
  },
  text: (s, d) => `${PJ_TYPES[d.tk].n} ${josa(`「${d.title}」`, '이가')} 공개를 앞두고 있다. ${d.bc} 예능 「${d.show}」에서 함께 출연한 배우들과 홍보하러 나와 달라는 섭외가 왔다.`,
  ch: (s, d) => [
    { t: '나가서 작품을 알린다', h: `출연료 ${fmtWon(d.fee)} · 재밌게 나올 가능성 ${fmtPct(d.p)}`, f: s => {
      const t = s.tracks.actor, w = (t.wait || []).find(x => x.id === d.id), good = U.chance(d.p);
      if (w) w.promo = good ? 4 : 1;
      earn(s, d.fee, '예능 출연료');
      useSkill(s, me(s), 'variety', 0.6);
      const gain = Math.round((good ? Math.pow(10, 3 + ACT_POW[t.tier] * 0.3) * U.fl(1, 2) : Math.pow(10, 2 + ACT_POW[t.tier] * 0.25)) * popSpeed(s) * myRoom(s, 'kr'));
      s.fans.kr += gain;
      return `${d.bc} 「${d.show}」에 나가 ${josa(`「${d.title}」`, '을를')} 홍보했다. ${good ? '입담이 터져 클립이 퍼졌다. 작품에 관심이 쏠렸다.' : '무난하게 마쳤다.'}` + fx(s, { fkr: gain, stress: 2 }) + varLearn(s, good);
    } },
    { t: '이번엔 나가지 않는다', f: () => `「${d.title}」 홍보 예능 섭외를 거절했다.` },
  ],
});
// 연말 연기대상: 그해 가장 좋았던 작품 점수로 정한다
function actorAwards(s, t) {
  cereSeen(s, '연기');
  const yb = t.yearBest || 0; t.yearBest = 0;
  if (!yb) return;
  const who = actName(s, 'actor');
  // 성인이 되기 전에는 아역상. 신인상은 성인이 된 뒤 첫 작품 세 편까지 (아역 때 작품은 세지 않는다)
  if (age(s) < 19) { if (yb < 60) return; const won = yb >= 70; if (won) award(s, '연기대상 아역상'); ceremony(s, '연기', who, '아역상', won, 'actor'); return; }
  const newbie = !t.rookie && (t.adultWorks || 0) <= 3;
  let won = null;
  if (newbie && yb >= 66) { t.rookie = true; won = '신인상'; }
  else if (yb >= 95 && t.tier >= 5) won = '대상';
  else if (yb >= 88 && t.tier >= 4) won = '최우수상';
  else if (yb >= 80 && t.tier >= 3) won = '우수상';
  const cat = won || (newbie && yb >= 56 ? '신인상' : yb >= 90 && t.tier >= 4 ? '대상' : yb >= 80 && t.tier >= 3 ? '최우수상' : yb >= 72 && t.tier >= 2 ? '우수상' : null);
  if (!cat) return;
  if (won) award(s, cereName('연기', won));
  ceremony(s, '연기', who, cat, !!won, 'actor');
}

// ════════ 연기 트레이너 ════════
// 배우 소속사에서 신인 배우·지망생에게 연기를 가르친다. 가르치는 실력(교육 60%·연기 40%)이 높을수록 빨리 는다
// 반년마다 평가가 있고, 한 명을 작품 오디션에 추천할 수 있다. 추천이 붙으면 평가가 크게 오른다 (팀장·경력·월급 한도는 트레이너와 같다)
const ATR_SAL = [0, 190, 230, 280];
const ATR_THR = [0, 26, 38, 50];
EMP_N.acttrainer = '연기 트레이너';
// v99 (8-5): 트레이너 계열은 특기로만 면접을 본다 (재능 안 봄)
function atrScore(s) { const p = me(s); return lv(p, 'acting') * 0.6 + eduLv(p) * 0.5; }
// v207: 배우 소속사마다 따로 지원한다 (회사 특징 CO_FOCUS.actTr)
function atrApplyP(s, ag) { return audP(coFocus(s, 'actTr', ag.con, atrScore(s)) + empExpBonus(s, 'acttrainer'), ATR_THR[ag.tier]); }
for (const ag of actorAgencies().filter(a => a.mkt === 'kr')) JOB_APPLY.push({
  id: 'acttrainer_' + ag.id, coKey: ag.id, pos: '연기 트레이너 채용', trk: 'acttrainer', g: '🎭 연기 트레이너', get n() { return `${ag.n} 연기 트레이너 채용`; }, tag: `${TIER_N[ag.tier]} · 월급 ${ATR_SAL[ag.tier]}만 원`,
  show: s => !trackOn(s, 'acttrainer') && age(s) >= 20,
  h: s => lv(me(s), 'acting') >= 30 ? `합격 가능성 ${fmtPct(atrApplyP(s, ag))} · 결과는 다음 달` : '연기가 30레벨 이상이어야 지원할 수 있다',
  ok: s => !s.army && !agencyContract(s) && lv(me(s), 'acting') >= 30 && !hasQ(s, 'atr_res') && !(s.cd['atr_' + ag.id] > s.t),
  why: s => s.army ? '군 복무 중' : agencyContract(s) ? contractWhy(s) : lv(me(s), 'acting') < 30 ? '가르칠 만큼 연기를 잘하지 못한다' : hasQ(s, 'atr_res') ? '결과를 기다리는 중' : '얼마 전에 지원했다 (반년 뒤 다시)',
  run: s => { s.cd['atr_' + ag.id] = s.t + 6; queueEv(s, 'atr_res', 1, { ag: ag.id, p: atrApplyP(s, ag) }); return `${ag.n} 연기 트레이너 채용에 지원했다.`; },
});
E({
  id: 'atr_res', cat: '채용', title: '연기 트레이너 채용 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); d.lead = d.pass && empStartLead(s, 'acttrainer'); d.sal = empStartSal(s, 'acttrainer', ATR_SAL[AG[d.ag].tier] * 1e4, d.lead); },
  text: (s, d) => d.pass ? `${AG[d.ag].n} ${josa('연기 트레이너' + (d.lead ? ' 팀장' : ''), '으로')} 합격했다! 회사가 제시한 월급은 ${fmtWon(d.sal)}.${d.lead ? '\n\n그동안의 경력을 보고 처음부터 팀장 자리를 맡긴다.' : ''}\n\n일정에 '연기 레슨'을 넣으면 신인 배우들을 가르친다.` : `${AG[d.ag].n} 연기 트레이너 채용에 떨어졌다.`,
  ch: (s, d) => d.pass ? [
    { t: '입사 조건을 들어 본다', ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '월급을 협상할 수 있다', f: s => startNego(s, { kind: 'acttrainer', ag: d.ag, agN: AG[d.ag].n, sal: d.sal, lead: d.lead, months: 24, lev: U.clamp((d.p - 0.5) * 0.8 + 0.3, 0.05, 0.8) }) },
    { t: '거절한다', f: () => '연기 트레이너 제안을 거절했다.' },
  ] : [{ t: '확인', f: () => `${AG[d.ag].n} 연기 트레이너 채용에 떨어졌다.` }],
});
// 맡은 신인: 연기 특기에 숨은 한계가 있다. 큰 회사일수록 가능성 있는 신인을 뽑는다
function makeActStudent(s, t) {
  const tb = Math.max(0, (t.tier || 1) - 1);
  const st = makePerson(s, { age: U.int(15, 24), rel: '제자', job: '신인 배우', met: `${t.agN} 신인 (내 제자)`, aff: 45 });
  learnSkill(s, st, 'acting', U.int(8, 22) + tb * 4); st.sk.acting.best = st.sk.acting.lv;
  const x = st.sk.acting;
  x.pot = Math.min(100, Math.max(Math.ceil(x.lv) + 3, Math.round(x.lv + U.int(6, 40) * (0.7 + talFactor(st, 'acting') / 150) + tb * 6)));
  st.ind = true; st.trSince = s.t; st.trPrev = lv(st, 'acting');
  return st.id;
}
function startActTrainer(s, d) {
  const ag = AG[d.ag], tag = learnMe(s, 'edu', null, true), old = s.tracks.acttrainer, lead = !!d.lead;
  const t = s.tracks.acttrainer = { st: 'active', ag: d.ag, agN: ag.n, tier: ag.tier, k: 'acting', months: 0, cEnd: d.months, rep: empStartRep(s, 'acttrainer', lead), lead, everLead: !!old.everLead || lead, debuts: old.debuts || 0, cuts: old.cuts || 0, sal: d.sal, salBase: d.sal, salBase0: lead ? Math.round(d.sal / leadRaise('acttrainer') / 1e5) * 1e5 : d.sal, next: 6, students: [] };
  for (let i = 0; i < 3; i++) t.students.push(makeActStudent(s, t));
  milestone(s, `${age(s)}세에 ${ag.n} 연기 트레이너${lead ? ' 팀장' : ''}가 되었다.`);
  return `${ag.n} 연기 트레이너${lead ? ' 팀장' : ''} 일을 시작했다. 월급 ${fmtWon(d.sal)} · 계약 ${yrs(d.months)}. 맡은 신인은 ${t.students.map(id => s.people[id].name).join(', ')}.` + tag;
}
NEGO.acttrainer = empNego('acttrainer', startActTrainer);
CAREERS.acttrainer = {
  n: '연기 트레이너', ic: '🎭',
  desc: '배우 소속사에서 신인 배우에게 연기를 가르친다. 가르치는 힘은 교육과 연기에서 나온다.',
  act: { n: '연기 레슨 (신인 가르치기)', ic: '🎭', g: '직업 활동', eff: [['교육', '↑↑', 1], ['연기', '↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) { return t.st !== 'active' ? (t.endNote || '') : `${t.agN} 연기 트레이너${t.lead ? ' 팀장' : ''} · 길러 낸 배우 ${t.debuts}명 · 업무 평가 ${Math.round(t.rep)} · 월급 ${fmtWon(t.sal)}`; },
  short() { return '연기 트레이너'; },
  seg(s, t) { return `${t.agN} 연기 트레이너`; },
  title(s, t) { return t.debuts ? '배우를 길러 낸 연기 트레이너' : '연기 트레이너'; },
  contract(s, t) { return t.st === 'active' ? `${t.agN} (연기 트레이너)` : ''; },
  emp: true,
  cLeft(s, t) { return t.st === 'active' && t.cEnd != null ? t.cEnd - t.months : null; },
  mainSk() { return 'edu'; },
  info(s, t) {
    const p = me(s), sts = t.students.map(id => s.people[id]).filter(Boolean);
    return [['회사', `${t.agN} (${TIER_N[t.tier]} 배우 소속사) · 연기 트레이너${t.lead ? ' 팀장' : ''}`], ['월급', fmtWon(t.sal)], ['내 실력', `연기 ${lvi(p, 'acting')} · 교육 ${lvi(p, 'edu')}`], ['업무 평가', `${Math.round(t.rep)}`], ['길러 낸 배우', `${t.debuts}명${t.cuts ? ` · 내보낸 신인 ${t.cuts}명` : ''}`],
      { h: `맡은 신인 (${sts.length}명)`, items: sts.map(x => ({ who: x.id, t: x.name, sub: `${gN(x)} · ${pAge(s, x)}세 · 연기 ${lvi(x, 'acting')}레벨${potTok(p, x, 'acting', true, !canScout(p, 'acting'))} · ${relWord(x)}` })) }];
  },
  actions(s, t) { return t.st === 'active' ? [{ t: '회사 그만두기', h: '직원 계약이라 위약금은 없다', ok: true, danger: true, confirm: '정말 회사를 그만둘까요?', run: s => { const n = t.agN; leaveEmp(s, 'acttrainer', '퇴사'); return `${josa(n, '을를')} 그만뒀다.`; } }] : []; },
  monthly(s, t) {
    if (t.st !== 'active') return;
    t.months++;
    empMonth(s, 'acttrainer', t);
    earn(s, t.sal, '월급', 'acttrainer');
    const n = slotsOn(s, 'c_acttrainer'), p = me(s), sts = t.students.map(id => s.people[id]).filter(Boolean);
    if (n) { teach(s, p, 1.3 * n); useSkill(s, p, 'acting', 0.6 * n); addStress(s, 1.5); }
    for (const x of sts) {
      practice(s, x, 'acting', n ? (1 + teachLv(p, 'acting') / 50) * Math.min(2, n) : 0.3, n ? 1.4 : 1);
      if (n) { bond(s, x, 1); x.contactT = s.t; }
      const sk = x.sk.acting;
      if (n && sk && sk.pot - sk.lv < 3 && sk.pot < 100 && U.chance(0.03 + teachLv(p, 'acting') / 1000)) sk.pot += 1;
    }
    if (!n) empRep(s, 'acttrainer', t, -0.5);
    t.next--;
    if (t.next <= 0 && !hasQ(s, 'atr_eval')) { t.next = 6; queueEv(s, 'atr_eval', 0); }
  },
};
// 반년마다 평가: 실력이 부쩍 는 신인이 있으면 오르고, 덜 키운 신인이 나가면 깎인다. 한 명을 작품 오디션에 추천할 수 있다
E({
  id: 'atr_eval', cat: '연기 트레이너', title: '신인 평가', tag: 'career',
  live: (s, d) => d.live,
  cond: s => trackOn(s, 'acttrainer'),
  init(s, d) {
    const t = s.tracks.acttrainer;
    d.thr = 22 + t.tier * 8; d.cut = []; d.good = 0;
    for (const id of t.students.slice()) {
      const x = s.people[id];
      if (!x) continue;
      if (x.trSince == null) x.trSince = s.t;
      const cur = lv(x, 'acting'), prev = x.trPrev != null ? x.trPrev : cur;
      x.trPrev = cur; (d.gr = d.gr || {})[id] = cur - prev;
      if (cur - prev >= 3) d.good++;
      const stuck = s.t - x.trSince >= 12 && cur - prev < 1.5, old = pAge(s, x) >= 30;
      if (d.cut.length || !(old || (stuck && U.chance(0.7)))) continue;
      const maxed = trMaxed(x, 'acting');
      t.students = t.students.filter(y => y !== id).concat(makeActStudent(s, t));
      const pen = Math.round(5 * (t.lead ? LEAD_MULT : 1));
      if (!maxed) { d.lc = empRep(s, 'acttrainer', t, -5) || d.lc; t.cuts = (t.cuts || 0) + 1; }
      x.job = '배우 지망생'; bond(s, x, -6);
      d.cut.push({ id, maxed, pen, why: old ? '신인으로 키우기엔 나이가 찼다' : '반년 동안 실력이 거의 늘지 않았다', nw: t.students[t.students.length - 1] });
    }
    if (d.good) { const g = Math.min(2, d.good); d.gain = Math.round(g * (t.lead ? LEAD_MULT : 1) * 10) / 10; d.lc = empRep(s, 'acttrainer', t, g) || d.lc; }
    else if (t.lead) { d.leadPen = Math.round(3 * LEAD_MULT); d.lc = empRep(s, 'acttrainer', t, -3) || d.lc; }
    if (t.students.length < trCap(t)) { d.added = makeActStudent(s, t); t.students.push(d.added); }
    d.ids = t.students.filter(id => s.people[id]);
    if (typeof liveEvalSpec === 'function') { d.live = liveEvalSpec(s, d, { act: true, t: t.agN || '', g: '연기', key: !t.evN || d.cut.length > 0 || !!d.lc }); t.evN = (t.evN || 0) + 1; }
  },
  text(s, d) {
    const t = s.tracks.acttrainer, p = me(s);
    const who = x => `${x.name}(${gN(x)} · ${pAge(s, x)}세)`;
    const cutTxt = d.cut.map(c => { const x = s.people[c.id], n = s.people[c.nw]; return `회사가 ${josa(who(x), '을를')} 내보냈다. ${c.why}는 이유다. ` + (c.maxed ? '가진 재능은 다 끌어냈다는 평이라 내 평가는 그대로다.' : `제대로 키우지 못했다는 평을 받았다. (평가 -${c.pen || 5})`) + `\n→ 새 신인 ${josa(who(n), '이가')} 들어왔다.`; }).join('\n\n');
    const goodTxt = d.good ? `\n\n반년 사이 실력이 부쩍 는 신인이 ${d.good}명이다. (평가 +${d.gain})` : d.leadPen ? `\n\n팀장인데 반년 동안 실력이 부쩍 는 신인이 한 명도 없다는 말을 들었다. (평가 -${d.leadPen})` : '';
    const addTxt = d.added && s.people[d.added] ? `\n\n회사가 신인을 한 명 더 맡겼다. ${josa(who(s.people[d.added]), '이가')} 들어왔다. (지금 ${d.ids.length}명)` : '';
    const leadTxt = d.lc === 'up' ? '\n\n그동안의 성과를 인정받아 팀장이 되었다! 월급이 오른다.' : d.lc === 'down' ? '\n\n평가가 떨어져 팀장 자리에서 내려왔다. 월급도 줄었다.' : '';
    const lines = d.ids.map(id => { const x = s.people[id]; return `· ${who(x)} 연기 ${lvi(x, 'acting')}레벨${potTok(p, x, 'acting', true, !canScout(p, 'acting'))} · ${relWord(x)}`; }).join('\n');
    return `${t.agN} 반기 평가 날이다.${cutTxt ? '\n\n' + cutTxt : ''}${goodTxt}${addTxt}${leadTxt}\n\n지금 맡은 신인들:\n${lines}\n\n한 명을 작품 오디션에 추천할 수 있다. 실력이 모자라면 붙지 못한다. 지금 내 평가 ${Math.round(t.rep)}.`;
  },
  ch(s, d) {
    const t = s.tracks.acttrainer;
    return d.ids.map(id => { const x = s.people[id]; const pp = U.clamp(U.sig((lv(x, 'acting') - d.thr - 4) / 5) * 0.75 + t.rep / 500, 0.03, 0.85); return { t: `${josa(`${x.name}(${gN(x)})`, '을를')} 추천한다`, h: `연기 ${lvi(x, 'acting')}레벨 · 붙을 가능성 ${fmtPct(pp)}`, f: s => {
      if (!U.chance(pp)) { const lc = empRep(s, 'acttrainer', t, -2); bond(s, x, -3); return `${josa(x.name, '을를')} 추천했지만 오디션에서 떨어졌다.${lc === 'down' ? ' 평가가 떨어져 팀장 자리에서 내려왔다.' : ''}`; }
      t.debuts++; const lc = empRep(s, 'acttrainer', t, 8); earn(s, t.sal, '캐스팅 성과급');
      x.job = '배우'; bond(s, x, 12); x.fame = U.int(2000, 30000);
      const nw = s.people[makeActStudent(s, t)];
      t.students = t.students.filter(y => y !== id).concat(nw.id);
      if (t.debuts === 1) milestone(s, `${age(s)}세에 가르친 신인 ${josa(x.name, '이가')} 처음으로 작품에 캐스팅됐다.`);
      return `내가 가르친 ${josa(x.name, '이가')} ${U.pick(['드라마', '영화', 'OTT 시리즈'])} 조연에 캐스팅됐다! 새 신인 ${josa(nw.name, '이가')} 들어왔다.${lc === 'up' ? ' 성과를 인정받아 팀장이 되었다!' : ''}` + fx(s, { stress: -6 });
    } }; }).concat([{ t: '이번엔 아무도 추천하지 않는다', f: () => '이번 평가에서는 추천하지 않았다.' }]);
  },
});

// 활동명 정하기 창에 쓰는 직업 이름
Object.assign(CAREER_SHORT, { actor: '배우', variety: '예능인', youtube: '스트리머', model: '모델' });

// ════════ 예능인 ════════
// v95: 예능(강함)과 외모 가산점. 외모는 깎이지 않고, 50보다 낮을수록 가산점이 커진다 (40은 +1, 30은 +3, 20은 +6, 10 이하는 +10)
// 방송사 공채로 시작하거나, 게스트로 이름을 알려 고정 자리를 얻는다
function varLookB(v) { return v >= 50 ? 0 : 10 * Math.pow(Math.min(40, 50 - v) / 40, 1.7); }
function varScore(s, p = me(s)) { return lv(p, 'variety') * 0.85 + varLookB(p.tal.looks); }
// 예능 종류마다 더 보는 것 (v96): 재능은 fitB, 여행 예능의 체력은 타고난 건강 (건강함 66 · 보통 50 · 약한 편 30으로 친다)
const HEALTH_V = { strong: 66, normal: 50, weak: 30 };
function showFit(s, g) { const L = SHOW_FIT[g]; if (!L) return 0; return L[0] === 'health' ? ((HEALTH_V[s.health] || 50) - 50) * 0.2 : fitB(me(s), L); }
const VAR_TIERS = ['신인 예능인', '얼굴 알린 예능인', '게스트 단골', '고정 패널', '메인 MC', '간판 MC', '국민 MC'];
// 등급마다 일의 크기 (출연료·섭외·팬에 곱한다. 예전 5단계의 0~4 눈금)
const VAR_POW = [0, 1, 1.5, 2, 3, 3.5, 4];
// 등급 문턱: pts 쌓인 점수, fans 필요한 팬, star 국민 MC가 되는 스타성
const VAR_UP = { pts: [0, 4, 9, 16, 28, 44, 57], fans: [0, 0, 0, 0, 6e4, 1.5e5, 3e5], star: 46 };
const BROADCASTERS = ['HBS', 'KTN', '누리방송', 'STV'];
// 연예대상 수상 프리미엄은 모든 시상식 공통(music.js awMul·awAddPrem)으로 옮겼다 (피드백 24)
function startVariety(s, o = {}) {
  const old = s.tracks.variety;
  s.tracks.variety = Object.assign({ st: 'active', months: 0, pastM: (old.pastM || 0) + (old.months || 0), tier: old.tier || 0, pts: old.pts || 0, shows: [], gong: null, gongM: 0, yearBest: 0, rookie: old.rookie, sn: old.sn, hist: old.hist || [] }, o);
  if (!old.months && !(old.hist || []).length) milestone(s, `${age(s)}세에 예능인의 길에 들어섰다.`);
}
// 들어온 예능: fixed 고정·게스트, 형식(요즘 예능 유행과 맞으면 잘 나온다), 출연료, 재밌게 나올 가능성
function genShow(s, tier, fixed) {
  const genre = U.chance(0.35) ? s.trendTV.show : U.pick(SHOW_TRENDS);
  const fee = Math.round((fixed ? [100, 300, 450, 700, 1500, 2500, 3500] : [30, 80, 130, 200, 500, 750, 1000])[tier] * awMul(s, 'variety')) * 1e4;
  const p = U.clamp(U.sig((varScore(s) + showFit(s, genre) + pm(s, 'audition', 0) / 2 + (genre === s.trendTV.show ? 4 : 0) - (36 + VAR_POW[tier] * 6)) / 6), 0.05, 0.95);
  return { title: tvShowTitle(genre), bc: U.pick(BROADCASTERS), genre, fixed, fee, p };
}
// 예능 한 번 나가기 (게스트) 또는 고정 합류. 잘 나오면 클립이 퍼지고 예능 점수가 쌓인다
function doShow(s, sh) {
  const t = trackOn(s, 'variety') ? s.tracks.variety : null, tier = t ? t.tier : 0, p = me(s);
  const good = U.chance(sh.p), big = bigRoll(good, sh.p);
  const gain = Math.round((good ? Math.pow(10, 3 + VAR_POW[tier] * 0.4) * U.fl(1, 3) * (big > 0 ? 3 : 1) : Math.pow(10, 2 + VAR_POW[tier] * 0.3)) * popSpeed(s) * myRoom(s, 'kr'));
  if (has(p, 'variety')) practice(s, p, 'variety', 2);
  if (t) {
    if (sh.fixed) t.shows.push({ title: sh.title, bc: sh.bc, genre: sh.genre, fee: sh.fee, reach: Math.round(gain / 20), life: U.int(12, 48), m: 0 });
    if (good) t.pts += (sh.fixed ? 2 : 1) + (big > 0 ? 1 : 0);
    t.yearBest = Math.max(t.yearBest || 0, good ? 70 + VAR_POW[tier] * 4 + (sh.genre === s.trendTV.show ? 4 : 0) + (big > 0 ? 8 : 0) : 45);
  } else if (good) s.flags.varGood = (s.flags.varGood || 0) + 1;
  if (!sh.fixed) earn(s, sh.fee, '예능 출연료');
  addWork(s, { type: '예능', title: sh.title, pay: sh.fixed ? 0 : sh.fee, by: sh.fixed ? '고정' : '게스트', sc: big > 0 ? 85 : good ? 70 : big < 0 ? 30 : 45, note: `${sh.bc} · ${sh.genre}${big > 0 ? ' · 레전드 회차' : good ? ' · 클립이 퍼졌다' : big < 0 ? ' · 노잼 논란' : ''}` });
  const how = big > 0 ? "방송이 크게 터졌다. 내가 나온 장면이 '레전드 회차'로 불리며 클립이 쏟아졌다." : good ? '방송이 재밌게 나와 클립이 퍼졌다.' : big < 0 ? '재미없다는 말이 쏟아졌다. 내 분량이 통째로 놀림거리가 됐다.' : '분량이 별로 없었다.';
  const x = `${sh.bc} 「${sh.title}」에 ${sh.fixed ? '고정 멤버로 합류했다' : '게스트로 나갔다'}. ${how}` + fx(s, { fkr: big < 0 ? -Math.round(s.fans.kr * 0.03) : gain, jp: t ? { variety: big > 0 ? 5 : good ? 2 : big < 0 ? -4 : 0 } : null, pop: t ? 0 : (big > 0 ? 5 : good ? 2 : big < 0 ? -4 : 0) / 2, fame: big > 0 ? 4 : good ? 1 : 0, stress: big < 0 ? 6 : 3 }) + varLearn(s, good);
  // 등급은 방송이 나간 뒤에 오른다 (방송 결과창에 같이 쓴다)
  const up = t ? varTierUp(s, t) : '';
  // 실시간 창 (12-3): 예능 스튜디오 (여행 · 리얼 버라이어티는 야외 촬영). 레전드 회차 · 노잼 · 고정 합류 · 첫 예능이 '중요할 때'
  const out = /여행|리얼/.test(sh.genre), first = !s.works.some(w => w.type === '예능' && w.title !== sh.title);
  const live = typeof liveStage === 'function' ? liveStage({ k: 'show', vn: out ? 'outdoor' : 'studio', place: out ? '야외 촬영' : '예능 스튜디오', t: sh.title, g: sh.bc, cn: callName(p.name), mem: [[callName(p.name), '']].concat(['MC', '고정', '게스트'].slice(0, U.int(2, 3)).map(n => [n, ''])), mi: 0,
    key: big !== 0 || !!sh.fixed || first, big, fixed: sh.fixed, z: { var: (varScore(s) - 45) / 18 }, sc: big > 0 ? 90 : good ? 70 : big < 0 ? 25 : 45 }) : null;
  // 방송이 나간 뒤 반응은 라이브온 팝업에서
  const plio = typeof plioSpec === 'function' ? plioSpec({ k: 'show', t: `「${sh.title}」 ${big > 0 ? '레전드 장면 모음' : '이번 주 클립'}`, ch: sh.bc, me: actName(s, 'variety'), sc: big > 0 ? 90 : good ? 70 : big < 0 ? 25 : 45, rv: big > 0 ? 2 : good ? 1 : big < 0 ? -2 : 0, mul: 1 + VAR_POW[tier] * 0.5 }) : null;
  return showResult(s, `${sh.bc} 「${sh.title}」`, x + (up ? `\n\n${up}` : ''), x + (up ? ` ${up}` : ''), live, null, plio);
}
// 예능인 등급: 쌓인 점수와 팬이 문턱을 넘으면 오른다. 오른 등급을 알리는 문장을 돌려준다 (안 올랐으면 '')
function varTierUp(s, t) {
  const VU = VAR_UP, k0 = t.tier;
  while (t.tier < 6 && t.pts >= VU.pts[t.tier + 1] && totalFans(s) >= VU.fans[t.tier + 1] && (t.tier < 5 || me(s).tal.star >= VU.star)) t.tier++;
  if (t.tier === k0) return '';
  if (t.tier >= 4) milestone(s, `${age(s)}세에 ${josa(VAR_TIERS[t.tier], '이가')} 되었다.`);
  return `이제 사람들이 나를 '${VAR_TIERS[t.tier]}'로 본다.`;
}
// 결과창: 방송·촬영처럼 따로 결과 창이 없던 일의 결과를 창으로 보여 준다. 등급이 오르면 여기에 같이 쓴다 (피드백 17)
// 다른 창(활동명 정하기 등)이 이미 떠 있으면 그다음에 뜬다
// live: 그 일의 실시간 창 (12-3: 예능 녹화). 창을 볼 차례면 결과도 따로 창으로 뜬다
E({ id: 'work_res', cat: '작품 성적', tag: 'career', title: (s, d) => d.title, text: (s, d) => d.text, ch: (s, d) => [{ t: '확인', f: () => d.log }],
  keepPop: (s, d) => typeof liveShow === 'function' && liveShow(d.live), live: (s, d) => d.live, plio: (s, d) => d.plio,
  // 방송 성과(d.boxes: 최고 시청자 · 후원 · 구독자)는 글 아래 상자로 (창 없이 처리될 때는 글만 남긴다)
  autoNoHtml: true, html: (s, d) => d.boxes && d.boxes.length && typeof stResHTML === 'function' ? `<div class="m-text">${rich(d.text)}</div>` + stResHTML(d.boxes) : '' });
function showResult(s, title, text, log, live, boxes, plio) {
  const d = { title, text, log: log || text, live: live || null, boxes: boxes || null, plio: plio || null };
  if (s.pending) queueEv(s, 'work_res', 0, d, true); else fireEvent(s, 'work_res', d);
  return '';
}
function showChoice(s, sh) {
  return { t: `${sh.bc} 「${sh.title}」 · ${sh.genre} · ${sh.fixed ? '고정' : '게스트'}`, tr: sh.genre === s.trendTV.show, h: `출연료 ${sh.fixed ? '매달 ' : ''}${fmtWon(sh.fee)} · 재밌게 나올 가능성 ${fmtPct(sh.p)}`, f: s => doShow(s, sh) };
}
CAREERS.variety = {
  n: '예능인', ic: '😆',
  desc: '방송사 공채로 시작하거나 게스트로 이름을 알려 예능 프로그램에 나간다. 예능 특기가 가장 중요하다. 고정 프로그램이 많을수록 돈과 인지도가 쌓인다.',
  act: { n: '예능 활동 (녹화·아이디어 회의)', ic: '😆', g: '직업 활동', eff: [['예능', '↑↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) {
    if (t.st !== 'active') return t.endNote || '';
    return `${VAR_TIERS[t.tier]}${t.gong ? ' · ' + t.gong : ''} · 고정 프로그램 ${t.shows.length}개` + (t.shows.length ? ` (${t.shows.map(x => '「' + x.title + '」').join(', ')})` : '');
  },
  short(s, t) { return `예능인 ${actName(s, 'variety')}`; },
  seg(s, t) { return t.gong ? `${t.gong} 개그맨` : '예능인'; },
  title(s, t) { return t.tier >= 1 || t.shows.length ? VAR_TIERS[t.tier] : null; },
  mainSk() { return 'variety'; },
  info(s, t) {
    const p = me(s);
    return [['등급', VAR_TIERS[t.tier]], ['내 실력', ['variety', 'acting'].filter(k => has(p, k)).map(k => `${SKILLS[k].n} ${lvi(p, k)}`).join(' · ') || '-'], t.gong ? ['공채', `${t.gong}${t.gongM > 0 ? ` (월급 ${t.gongM}개월 남음)` : ''}`] : null,
      { h: `고정 프로그램 (${t.shows.length}개)`, items: t.shows.length ? t.shows.map(x => `${x.bc} 「${x.title}」 · ${x.genre} · 매달 ${fmtWon(x.fee)} · ${x.m}개월째`) : ['아직 없다'] }].filter(Boolean);
  },
  actions(s, t) { return t.st === 'active' ? [{ t: '예능 활동 그만두기', h: '고정 프로그램에서도 모두 하차한다', ok: true, danger: true, confirm: '정말 예능 활동을 그만둘까요?', run: s => { t.st = 'ended'; t.endNote = VAR_TIERS[t.tier]; t.hist.push(t.endNote); t.shows = []; return '예능 활동을 그만뒀다.'; } }] : []; },
  monthly(s, t) {
    if (t.st !== 'active') return;
    t.months++;
    // 고정 프로그램: 매달 출연료와 인지도. 반년마다 성적을 보고 폐지되거나 막을 내린다
    for (const sh of t.shows.slice()) {
      sh.m++;
      earn(s, sh.fee, '예능 출연료'); workPay(s, sh.title, sh.fee);
      s.fans.kr += Math.round(sh.reach * U.fl(0.5, 1.5) * myRoom(s, 'kr'));
      addStress(s, 1.5);
      if (sh.m % 6 === 0) {
        const sc = (varScore(s) + showFit(s, sh.genre)) * 0.5 + (me(s).tal.star - 50) * 0.2 + VAR_POW[t.tier] * 3 + (sh.genre === s.trendTV.show ? 4 : 0) + U.normal(0, 12) + 6;
        t.yearBest = Math.max(t.yearBest || 0, sc + 20);
        if (sc < 34 + VAR_POW[t.tier] * 5 || sh.m >= sh.life) { t.shows.splice(t.shows.indexOf(sh), 1); addLog(s, `${sh.bc} 「${sh.title}」${sh.m >= sh.life ? '이 막을 내렸다.' : '이 시청률 부진으로 폐지됐다.'}`, 'career'); }
        else t.pts++;
      }
    }
    if (t.gongM > 0) { t.gongM--; earn(s, 100e4, '방송사 공채 월급'); }
    // 등급은 방송 결과창에서 오른다 (varTierUp, doShow)
    if (calM(s) === 11) varAwards(s, t);
    const n = slotsOn(s, 'c_variety'), p = me(s);
    if (n) { practice(s, p, 'variety', 1.2 * n); useSkill(s, p, 'acting', 0.2 * n); addStress(s, 1.5); }
    const chance = stigmaMul(s) * (0.04 + VAR_POW[t.tier] * 0.03 + Math.min(0.1, Math.log10(1 + totalFans(s)) / 50) + (t.gongM > 0 ? 0.05 : 0)) * access(s) * (n ? 1 : 0.3);
    if (!hasQ(s, 'var_offer') && U.chance(chance)) queueEv(s, 'var_offer', 0);
  },
};
function varAwards(s, t) {
  cereSeen(s, '연예');
  const yb = t.yearBest || 0; t.yearBest = 0;
  if (!yb) return;
  const who = actName(s, 'variety'), newbie = !t.rookie && t.months + (t.pastM || 0) <= 24;
  let won = null;
  if (newbie && yb >= 60) { t.rookie = true; won = '신인상'; }
  else if (yb >= 95 && t.tier >= 5) won = '대상';
  else if (yb >= 86 && t.tier >= 4) won = '최우수상';
  else if (yb >= 78 && t.tier >= 3) won = '우수상';
  const cat = won || (newbie && yb >= 50 ? '신인상' : yb >= 88 && t.tier >= 4 ? '대상' : yb >= 78 && t.tier >= 3 ? '최우수상' : yb >= 70 && t.tier >= 2 ? '우수상' : null);
  if (!cat) return;
  if (won) award(s, cereName('연예', won));
  ceremony(s, '연예', who, cat, !!won, 'variety');
}
JOB_APPLY.push({
  id: 'variety_gong', trk: 'variety', g: '😆 예능인', n: '방송사 개그맨 공채 시험',
  show: s => !(trackOn(s, 'variety') && s.tracks.variety.gong) && age(s) >= 19 && age(s) <= 34,
  h: s => `합격 가능성 ${fmtPct(audP(varScore(s) + pm(s, 'audition', 0), 34))} · 결과는 두 달 뒤 · 합격하면 1년 동안 방송국에서 월급이 나온다`,
  ok: s => !s.army && lv(me(s), 'variety') >= 25 && !(s.cd.gong > s.t) && !hasQ(s, 'var_exam'),
  why: s => s.army ? '군 복무 중' : lv(me(s), 'variety') < 25 ? '예능을 더 배워야 한다' : s.cd.gong > s.t ? '공채 시험은 1년에 한 번' : '결과를 기다리는 중',
  run: s => { s.cd.gong = s.t + 12; queueEv(s, 'var_exam', 2, { p: audP(varScore(s) + pm(s, 'audition', 0), 34) }); return '방송사 개그맨 공채 시험을 봤다.'; },
});
JOB_APPLY.push({
  id: 'variety_start', trk: 'variety', g: '😆 예능인', n: '예능인으로 활동 시작하기',
  show: s => !trackOn(s, 'variety'),
  h: s => '방송국과 제작사에 이름을 돌린다 · 일정에 예능 활동을 넣어야 섭외 연락이 온다',
  ok: s => !s.army && age(s) >= 16 && lv(me(s), 'variety') >= 25 && (totalFans(s) >= 5000 || (s.flags.varGood || 0) >= 1),
  why: s => s.army ? '군 복무 중' : age(s) < 16 ? '16세부터 할 수 있다' : lv(me(s), 'variety') < 25 ? '예능을 더 배워야 한다' : '아직 나를 아는 사람이 너무 적다',
  run: s => { startVariety(s); askStageName(s, 'variety'); return '예능인으로 활동을 시작했다.'; },
});
E({
  id: 'var_exam', cat: '공채 시험', title: '공채 시험 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); d.bc = U.pick(BROADCASTERS); d.gi = U.int(28, 40); },
  text: (s, d) => d.pass ? `${d.bc} ${d.gi}기 공채 개그맨 시험에 합격했다! 1년 동안 방송국에서 월급을 받으며 무대에 선다.` : `${d.bc} 공채 개그맨 시험에 떨어졌다.`,
  ch: (s, d) => [{ t: '확인', f: s => { if (!d.pass) return `${d.bc} 공채 시험에 떨어졌다.` + fx(s, { stress: 4 * pm(s, 'loseStress') }); const jb = jobBlock(s, 'variety', ['gong']); if (jb) return `${d.bc} 공채 시험에 붙었지만 들어가지 못했다. ${jb}.`; const t = s.tracks.variety, g = `${d.bc} ${d.gi}기 공채`; if (trackOn(s, 'variety')) Object.assign(t, { gong: g, gongM: 12 }); else startVariety(s, { gong: g, gongM: 12 }); askStageName(s, 'variety', d.bc); milestone(s, `${age(s)}세에 ${d.bc} ${d.gi}기 공채 개그맨이 되었다.`); return `${d.bc} ${d.gi}기 공채 개그맨이 되었다!` + fx(s, { stress: -8 }); } }],
});
// 고정 멤버 자리: 한 번 나가는 게스트와 다르다는 걸 눈에 띄게 (📌 고정 멤버 꼬리표 · 지금 고정 프로그램 수)
function varFixBox(s, sh, more) {
  const n = trackOn(s, 'variety') ? s.tracks.variety.shows.length : 0;
  return `<div class="fix-box"><span class="fix-tag">📌 고정 멤버</span><div class="fix-t">${U.esc(sh.bc)} 「${U.esc(sh.title)}」 · ${U.esc(sh.genre)}</div><div class="fix-h">한 번 나가는 게스트가 아니라 매주 나가는 고정 자리다. 매달 출연료 ${fmtWon(sh.fee)}</div><div class="fix-n">지금 고정 프로그램 ${n}개 · 세 개까지</div></div>` + (more ? `<div class="m-text">${typeof rich === 'function' ? rich(more) : U.esc(more)}</div>` : '');
}
// 예능 섭외: 한 번 나가는 게스트 섭외는 묻지 않고 나간다 (방송 결과는 특별한 일에). 고정 멤버 섭외는 세 개까지라 물어본다 (v88)
E({
  id: 'var_offer', cat: '섭외', tag: 'career',
  title: (s, d) => d.sh && d.sh.fixed ? '📌 예능 고정 멤버 섭외' : '예능 섭외',
  auto: (s, d) => d.sh.fixed ? -1 : 0, autoQuiet: true,
  cond: s => trackOn(s, 'variety'),
  init(s, d) { const t = s.tracks.variety; d.sh = genShow(s, t.tier, ((t.tier >= 1 && U.chance(0.5)) || t.tier >= 3) && t.shows.length < 3); },
  text: (s, d) => `${d.sh.bc} 「${d.sh.title}」(${d.sh.genre})에서 ${d.sh.fixed ? '고정 멤버' : '게스트'} 섭외가 들어왔다.\n\n요즘 예능 유행 '${s.trendTV.show}' · 예능 ${lvi(me(s), 'variety')}레벨`,
  html: (s, d) => d.sh.fixed ? varFixBox(s, d.sh, `요즘 예능 유행 '${s.trendTV.show}' · 예능 ${lvi(me(s), 'variety')}레벨`) : '',
  ch: (s, d) => d.sh.fixed
    ? [Object.assign(showChoice(s, d.sh), { t: '📌 고정 멤버로 합류한다' }), { t: '거절한다', f: () => `「${d.sh.title}」 고정 멤버 섭외를 거절했다.` }]
    : [Object.assign(showChoice(s, d.sh), { t: '출연한다' }), { t: '거절한다', f: () => `「${d.sh.title}」 섭외를 거절했다.` }],
});
// 예능 출연 신청 (활동 지원): 예능인이 아니어도 게스트로 나가 본다. 몇 번 재밌게 나오면 예능 쪽에서 연락이 온다
// 예능에 나가서 잘한 적(재밌게 나온 회차, 아이돌 스케줄 예능에서 크게 웃긴 적)이 있어야 신청할 수 있다 (피드백 17)
function varHit(s) { return !!s.flags.varHit || s.works.some(w => w.type === '예능' && w.sc >= 70); }
ACT_APPLY.push({
  id: 'var_guest', cat: 'video', n: '예능 출연 신청', ic: '😆',
  h: s => '게스트로 나갈 예능을 골라 신청한다. 재밌게 나오면 클립이 퍼지고 팬이 는다.',
  ok: s => !s.army && age(s) >= 10 && varHit(s) && (lv(me(s), 'variety') >= 15 || totalFans(s) >= 1e4) && !(s.cd.varGuest > s.t) && s.tracks.idol.st !== 'trainee',
  why: s => s.army ? '군 복무 중' : age(s) < 10 ? '10세부터 신청할 수 있다' : s.tracks.idol.st === 'trainee' ? '연습생은 회사 허락 없이 방송에 못 나간다' : !varHit(s) ? '예능에서 아직 증명하지 못했다' : s.cd.varGuest > s.t ? '얼마 전에 나갔다' : '예능을 더 배우거나 이름을 알려야 한다',
  run: s => { s.cd.varGuest = s.t + 4; fireEvent(s, 'var_guest', {}); return ''; },
});
E({
  id: 'var_guest', cat: '활동 지원', title: '예능 출연 신청', tag: 'career',
  init(s, d) { const tier = trackOn(s, 'variety') ? s.tracks.variety.tier : 0; d.ss = [0, 1, 2].map(() => genShow(s, tier, false)); },
  text: s => `게스트를 찾는 예능들이다. 하나에 나갈 수 있다.\n\n요즘 예능 유행 '${s.trendTV.show}' · 예능 ${has(me(s), 'variety') ? lvi(me(s), 'variety') + '레벨' : '못 함'}`,
  ch: (s, d) => d.ss.map(sh => showChoice(s, sh)).concat([{ t: '그만둔다', f: () => '이번엔 신청하지 않았다.' }]),
});
// 게스트로 몇 번 재밌게 나오면 고정 자리 제안이 온다 (예능인이 아니면 이때 예능인이 된다)
INBOX.var_fixed = {
  ic: '😆', tag: '📌 고정',
  text: (s, m) => `${m.d.sh.bc} 「${m.d.sh.title}」(${m.d.sh.genre})에서 고정 멤버로 함께하자는 연락이 왔다. 매달 출연료 ${fmtWon(m.d.sh.fee)}.`,
  ch: (s, m) => [
    { t: '📌 고정 멤버로 합류한다', nj: 'variety', ok: s => !(trackOn(s, 'variety') && s.tracks.variety.shows.length >= 3), h: trackOn(s, 'variety') && s.tracks.variety.shows.length >= 3 ? '고정 프로그램이 이미 세 개다' : '', f: s => { if (!trackOn(s, 'variety')) { startVariety(s); askStageName(s, 'variety'); } return doShow(s, Object.assign({}, m.d.sh, { fixed: true, p: Math.max(m.d.sh.p, 0.5) })); } },
    { t: '거절한다', f: () => `「${m.d.sh.title}」 고정 제안을 거절했다.` },
  ],
};
E({
  id: 'var_fixed_gen', cd: 12, cat: '제안', title: '예능 고정 제안',
  p: s => (s.flags.varGood || 0) >= 2 && !trackOn(s, 'variety') ? 0.05 : 0,
  cond: s => !s.inbox.some(m => m.kind === 'var_fixed') && !s.army,
  init(s, d) { const sh = genShow(s, 0, true); sendMsg(s, 'var_fixed', { from: sh.bc, title: '예능 고정 멤버 제안', months: 4, d: { sh } }); s.flags.varGood = 0; d.skip = true; },
});

// ════════ 스트리머 · 버튜버 ════════
// 채널 컨셉(라이브온 유행과 같은 목록)마다 중요한 특기가 다르다. 편집 실력(또는 고용한 편집자)이 영상 완성도를 올린다
// 스트리머는 얼굴이 보여 외모가 보태고, 버튜버는 아바타 품질과 소속사가 처음 시청자 수를 좌우한다
// 구독자가 닿을 수 있는 높이: 10^((매력 + YT_REACH) / 16). 클수록 채널이 크게 자란다
const YT_REACH = 27;
// 한 달 수입: 스트리머는 구독자 × 1~3원 × 칸(최대 2) × YT_INC, 버튜버는 구독자 × VT_INC원 (후원·멤버십)
const YT_INC = 12, VT_INC = 20;
// 채널 분야마다 보는 것 (v96, 8-4 사용자 표). 특기는 채널 점수에 섞고(하나면 강함, 둘이면 각각 보통), 재능은 가산점(하나면 강함, 둘이면 각각 보통)
const YT_FIT = { 먹방: ['variety'], 챌린지: ['dance', 'variety'], 브이로그: ['variety', 'edit'], '게임 방송': ['game', 'variety'], '숏폼 밈': ['variety', 'edit'], ASMR: ['voice', 'music'], 리뷰: ['variety', 'insight'], '커버 영상': ['vocal', 'dance'], 그림: ['art', 'variety'], '단편 애니메이션': ['art', 'direct'] };
// 채널 활동으로 연습하는 특기 두 개 (분야의 특기, 모자라면 예능)
const YT_SK = Object.fromEntries(Object.entries(YT_FIT).map(([c, L]) => { const k = L.filter(x => !TALENT_BY[x]); return [c, [k[0] || 'variety', k[1] || k[0] || 'variety']]; }));
// 컨셉 고르기 목록: 그 분야로 했을 때 채널 점수(내 예능 · 편집 · 분야 특기와 재능)가 높은 것부터 보여 준다
function ytCatAvg(s, c) { const p = me(s), F = YT_FIT[c] || ['variety'], w = F.length > 1 ? JM_ : JS_; return jobMix([[lv(p, 'variety'), JS_], [lv(p, 'edit'), JM_]].concat(F.filter(k => !TALENT_BY[k]).map(k => [lv(p, k), w]))) + F.filter(k => TALENT_BY[k]).reduce((a, k) => a + talB(p.tal[k], F.length === 1), 0); }
function ytCatSort(s, cats) { return cats.map((c, i) => [c, ytCatAvg(s, c), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(x => x[0]); }
function ytCatH(s, c) { const p = me(s); return (YT_FIT[c] || ['variety']).map(k => TALENT_BY[k] ? TALENT_BY[k].n : `${SKILLS[k].n} ${has(p, k) ? lvi(p, k) + '레벨' : '못 함'}`).join(' · '); }
const VT_AV = [null, { n: '무료 툴로 만든 아바타', c: 0, m: 1, q: 1 }, { n: 'Live2D 아바타', c: 300e4, m: 3, q: 2 }, { n: '고급 Live2D 아바타', c: 800e4, m: 4, q: 3 }, { n: '3D 모델', c: 1600e4, m: 5, q: 4 }, { n: '직접 그린 Live2D 아바타', c: 0, m: 4, q: 2, art: 50 }, { n: '직접 그린 고급 아바타', c: 0, m: 5, q: 3, art: 75 }];
function vtAgencies() { return AGENCIES.filter(a => a.kind === 'vtuber'); }
function avQ(t) { return (VT_AV[t.av] || VT_AV[1]).q; }
// 편집 품질: 내 실력, 고용한 편집자(60), MCN 편집팀 담당 편집자의 실력 중 가장 높은 것
function ytEditQ(s, t) { return Math.max(lv(me(s), 'edit'), t.editor ? 60 : 0, t.mcn ? lv(mcnMyEd(s, t), 'edit') : 0); }
// 채널 특기: 예능(강함) · 영상 편집(보통)에 분야의 특기를 섞는다 (v96: 하나면 강함, 둘이면 각각 보통). 영상 편집은 편집자 · MCN 편집팀 실력까지
function ytSkMix(s, t) {
  const p = me(s), F = YT_FIT[t.cat] || ['variety'], w = F.length > 1 ? JM_ : JS_;
  return jobMix([[lv(p, 'variety'), JS_], [ytEditQ(s, t), JM_]].concat(F.filter(k => !TALENT_BY[k]).map(k => [k === 'edit' ? ytEditQ(s, t) : lv(p, k), w])));
}
// 분야가 보는 재능 (ASMR 목소리 · 음감, 리뷰 통찰력): 하나면 강함, 둘이면 각각 보통 가산점
function ytFitTal(s, t) { const p = me(s), F = YT_FIT[t.cat] || []; return F.filter(k => TALENT_BY[k]).reduce((a, k) => a + talB(p.tal[k], F.length === 1), 0); }
// 채널의 매력: 채널 특기 + 끈기(보통, 가산점) + (버튜버: 아바타·소속사) + 스타성 + 유행. 스트리머 외모는 v95에서 뺐다
function ytAppeal(s, t) {
  const p = me(s);
  const look = t.mode === 'vt' ? avQ(t) * 5 + (t.corp ? AG[t.corp].tier * 6 : 0) : 0;
  return ytSkMix(s, t) * 0.95 + ytFitTal(s, t) + talB(p.tal.grit, false) - (s.stigma || 0) * 0.25 + look + (p.tal.star - 50) * 0.3 + ((t.mode === 'vt' ? '버튜버' : '캠튜버') === s.trendTV.yt ? 6 : 0) + MCN_HELP.grow[mcnTierT(s, t)];
}
// 버츄얼 아이돌 합격 (v99, 8-5): 방송 점수(vidol.js viSk)와 같다. 오디션 때는 컨셉을 고르기 전이라 나한테 가장 잘 맞는 컨셉으로 본다 (v100). 연기는 뺐다
function vtScore(s) { return Math.max(...ytCats(true).map(c => viSk(s, c))); }
function ytBlock(s) { return s.army ? '군 복무 중' : s.tracks.idol.st === 'trainee' ? '연습생은 개인 채널을 못 연다' : age(s) < 14 ? '14세부터 할 수 있다' : ''; }
function ytName(t) { return t.mode === 'vt' ? '버튜버' : '스트리머'; }
// 실시간 창 (12-3): 개인세 버튜버도 라이브 방송 플랫폼(라이브온)에서 방송한다. 스트리머(영상)는 해당 없음
// sub: debut 데뷔 방송 · avatar 새 아바타 공개 · mile 구독자 기념 방송 · grad 졸업 방송
// 손님: 내가 아는 버튜버 인물(업계 인물). 없으면 가끔 모르는 버튜버가 들른다 (데뷔 방송은 빼고)
function ytCut(t) { return t.mcn ? t.mcn.cut : t.corp ? t.cut : 0; }
function ytLive(s, t, sub, o) {
  o = o || {};
  if (typeof liveStage !== 'function' || t.mode !== 'vt') return null;
  const ap = ytAppeal(s, t), who = (t.sn && t.sn.given) || t.ch, nick = (t.sn && t.sn.nick) || who;
  const T = { debut: `【데뷔】 처음 뵙겠습니다, ${who}입니다!`, avatar: `【새 아바타 공개】 ${who}, 새 모습으로`, mile: `【구독자 ${o.n || ''} 기념】 고마워요 방송`, grad: `【졸업】 ${who}의 마지막 방송`, collab: `【합방】 ${who} × ${o.co || ''}` };
  const all = typeof npcList === 'function' ? npcList(s, 'vtuber').filter(n => n.ph !== 'rest') : [];
  let mates = all.filter(n => n.kn || n.fol).map(n => n.n);
  if (!mates.length && sub !== 'debut' && all.length && U.chance(0.4)) mates = [U.pick(all).n];
  return liveStage({ k: 'stream', place: PF.live.n, t: T[sub], g: t.ch, cn: nick, mem: [[t.ch, '']], mi: 0, key: o.key !== false, sc: o.sc != null ? o.sc : U.clamp(50 + (ap - 45) * 1.5, 0, 100), z: { sk: (ap - 45) / 12 },
    x: { sx: liveSx([me(s)]), sub, subs: Math.max(300, t.subs || 0), nick, co: o.co || '', cosx: o.coSx || '', mgr: !!t.corp, mates: mates.slice(0, 4), d3: avQ(t) >= 4 } });
}
CAREERS.youtube = {
  n: '스트리머', ic: '▶️',
  desc: '영상을 올리거나(스트리머) 아바타로 인터넷 방송을 한다(개인세 버튜버). 채널 컨셉에 맞는 특기와 편집이 중요하다. 버튜버는 아바타가 처음 시청자 수를 좌우한다. 회사에 들어가는 버튜버는 버츄얼 아이돌이다.',
  act: { n: '채널 활동 (촬영·편집·방송)', ic: '▶️', g: '직업 활동', eff: [['예능', '↑', 1], ['팬', '↑', 1], ['돈', '↑', 0], ['스트레스', '↑', 0]] },
  status(s, t) {
    if (t.st === 'prep') return `버튜버 데뷔 준비 중 · ${VT_AV[t.av].n} 제작 (${t.left}개월 남음)${t.corpN ? ' · ' + t.corpN : ''}`;
    if (t.st !== 'active') return t.endNote || '';
    return `${ytName(t)} 「${t.ch}」 · ${t.cat} · 구독자 ${fmtFans(t.subs)}${t.mcn ? ' · ' + t.mcn.n + ' 소속' : t.corpN ? ' · ' + t.corpN + ' 소속' : ownCo(s, 'youtube') ? ' · ' + ownCoTag(s, 'youtube') : ''}${t.editor ? ' · 편집자 고용 중' : ''}`;
  },
  short(s, t) { return t.st === 'active' ? `${ytName(t)} 「${t.ch}」` : `${ytName(t)} 준비 중`; },
  seg(s, t) { return t.st === 'active' ? `${ytName(t)} 「${t.ch}」${t.corpN ? ` (${t.corpN})` : ''}` : '버튜버 데뷔 준비'; },
  title(s, t) { return t.st !== 'none' && t.ch && (t.peak || t.subs) >= 1e4 ? `${ytName(t)} 「${t.ch}」` : null; },
  contract(s, t) { return t.mcn && t.st === 'active' ? t.mcn.n : t.corp && (t.st === 'active' || t.st === 'prep') ? t.corpN : ''; },
  cLeft(s, t) { return t.mcn && t.st === 'active' ? t.mcn.left : t.corp && t.st === 'active' && t.contract ? t.contract - t.months : null; },
  slotOK: (s, t) => t.st === 'active',
  mainSk(s, t) { return (YT_SK[t.cat] || ['variety'])[0]; },
  info(s, t) {
    const p = me(s), ks = [...new Set(YT_SK[t.cat] || ['variety'])];
    if (t.st === 'prep') return [['준비', `${VT_AV[t.av].n} (${t.left}개월 남음)`], ['소속', t.corpN || '개인세']];
    return [['채널', `「${t.ch}」 · ${t.cat}`], ['방송 타겟', YT_TGT[ytMk(t)].n], ['소속', t.mcn ? `${t.mcn.n} (${TIER_N[mcnTierT(s, t)]} MCN) · MCN 몫 ${pctN(t.mcn.cut)}` : t.corpN ? `${t.corpN} · 회사 몫 ${pctN(t.cut)}` : '개인'], t.mcn ? ['MCN 지원', `광고 연결 · 편집팀 (무료) · 기획·썸네일 · 합작 주선 · 굿즈 · 개인 행사 · 논란 대응`] : null, ['구독자', `${fmtFans(t.subs)} (가장 많을 때 ${fmtFans(t.peak || t.subs)})`], ['수입', t.subs < 1000 ? '구독자 1,000명부터 들어온다' : `지난달 ${fmtWon(t.lastInc || 0)} (최근 1년 평균 ${fmtWon(incAvg(t))})`], ['내 실력', ks.concat('edit').filter((k, i, a) => a.indexOf(k) === i && has(p, k)).map(k => `${SKILLS[k].n} ${lvi(p, k)}`).join(' · ') || '-'], t.mode === 'vt' ? ['아바타', VT_AV[t.av].n] : null, t.mode !== 'vt' && t.vid && typeof plioBtnHTML === 'function' ? { h: '가장 최근 영상', html: plioBtnHTML(t.vid, '이번 달 영상 반응 보기') } : null, ['편집', t.editor ? '편집자 고용 중 (월 150만 원)' : t.mcn ? `${t.mcn.n} 편집팀 (무료) · 담당 ${mcnEdLine(s, mcnMyEd(s, t))}` : '혼자 한다']].filter(Boolean);
  },
  actions(s, t) {
    if (t.st !== 'active') return [];
    const A = [];
    A.push({ t: '방송 타겟 바꾸기', h: `지금 ${YT_TGT[ytMk(t)].n} · 바꾸면 한동안 구독자가 꽤 빠진다`, ok: !t.corp && !(t.tgtT > s.t), why: t.corp ? '회사가 정한다' : '얼마 전에 바꿨다', run: s => { fireEvent(s, 'yt_tgt', { change: true }); return ''; } });
    A.push({ t: '채널 컨셉 바꾸기', h: `지금 '${t.cat}' · 바꾸면 한동안 구독자가 조금 빠진다`, ok: !(t.catT > s.t), why: '얼마 전에 바꿨다', run: s => { fireEvent(s, 'yt_cat', { change: true }); return ''; } });
    A.push(t.editor ? { t: '편집자 내보내기', h: '매달 나가던 150만 원이 없어진다', ok: true, run: s => { t.editor = false; return '편집자와의 계약을 끝냈다. 이제 편집은 혼자 한다.'; } } : { t: '편집자 고용하기', h: t.mcn ? '월 150만 원' : '월 150만 원 · 편집 실력이 모자라도 영상 완성도가 오른다', ok: !t.mcn && s.money >= 150e4, why: t.mcn ? `${t.mcn.n} 편집팀이 무료로 편집해 준다` : '돈이 모자라다', run: s => { t.editor = true; return '영상 편집자를 고용했다.'; } });
    if (t.mode === 'vt' && avQ(t) < 4) { const ni = avQ(t) + 1, nx = VT_AV[ni]; A.push({ t: `아바타 바꾸기: ${nx.n}`, h: fmtWon(nx.c) + (ownCo(s, 'youtube') ? ' (자본금)' : ''), ok: jobMoney(s, 'youtube') >= nx.c, why: `${ownCo(s, 'youtube') ? '회사 ' : ''}돈이 모자라다 (${fmtWon(nx.c)} 필요)`, run: s => { jobPay(s, nx.c, '아바타 교체', 'youtube'); t.av = ni; const b0 = t.subs; t.subs = Math.round(t.subs * 1.05); return streamShow(s, 'youtube', ytCut(t), '새 아바타 공개 방송', `${josa(nx.n, '으로')} 아바타를 바꿨다. 새 아바타 공개 방송에 시청자가 몰렸다.`, ytLive(s, t, 'avatar', { sc: 72 }), { gain: t.subs - b0 }); } }); }
    A.push({ t: t.mode === 'vt' ? '졸업 (버튜버 은퇴)' : '채널 접기', ok: true, danger: true, confirm: t.mode === 'vt' ? '정말 버튜버를 졸업할까요?' : '정말 채널 활동을 그만둘까요?', run: s => { const live = t.mode === 'vt' ? ytLive(s, t, 'grad', { sc: 75 }) : null; t.st = 'ended'; t.endNote = `${ytName(t)} 「${t.ch}」 · 가장 많을 때 구독자 ${fmtFans(t.peak || t.subs)}`; t.hist = (t.hist || []).concat(t.endNote); milestone(s, `${age(s)}세에 ${ytName(t)} 「${t.ch}」 활동을 마쳤다.`); if (t.mode === 'vt') return streamShow(s, 'youtube', ytCut(t), '졸업 방송', `버튜버 「${t.ch}」 졸업 방송을 했다.`, live); return `채널 「${t.ch}」 활동을 그만뒀다.`; } });
    return A;
  },
  monthly(s, t) {
    // 아바타가 다 되면 방송 컨셉부터 고르고(yt_cat), 이어서 채널 이름을 정해 데뷔한다(yt_debut)
    if (t.st === 'prep') { t.left--; if (t.left <= 0 && !hasQ(s, 'yt_debut') && !hasQ(s, 'yt_cat')) queueEv(s, 'yt_cat', 0, { mode: 'vt' }); return; }
    if (t.st !== 'active') return;
    t.months++;
    if (t.editor) jobPay(s, 150e4, '편집자 월급', 'youtube');
    if (t.mcn) mcnMonth(s, t, slotsOn(s, 'c_youtube'));
    if (t.tamper) t.tamper = null;
    const n = slotsOn(s, 'c_youtube'), p = me(s), mk = ytMk(t);
    if (!n) { t.subs = Math.round(t.subs * 0.985); t.lastInc = 0; incPush(t, 0); return; }
    const ks = YT_SK[t.cat] || ['variety', 'variety'];
    practice(s, p, ks[0], 1.1 * n); if (ks[1] !== ks[0]) practice(s, p, ks[1], 0.5 * n); if (!t.editor) useSkill(s, p, 'edit', 0.5 * n);
    addStress(s, 2 * n);
    // 매력으로 정해지는 '닿을 수 있는 구독자 수'를 향해 조금씩 다가간다 (칸을 많이 쓰면 더 빨리)
    const target = Math.min(t.mode === 'vt' ? 3e6 : 2e7, Math.pow(10, (ytAppeal(s, t) + YT_REACH) / 16)) * ytTgtMul(s, t);
    const before = t.subs;
    if (t.subs < target) t.subs += Math.round((target - t.subs) * U.fl(0.02, 0.06) * Math.min(2, n) + U.int(3, 20));
    else t.subs = Math.round(t.subs * U.fl(0.99, 1.0));
    if (t.mode === 'vt' && age(s) > 36) t.subs = Math.round(t.subs * vtAgeFade(age(s)));
    // 이번 달에 올린 영상 (v144): 반응은 라이브온에서 본다. 직업 창에 가장 최근 영상의 배너가 있고, 크게 터지거나 차갑게 식은 달에는 기록에도 남는다
    if (t.mode !== 'vt' && typeof plioSpec === 'function') {
      const dev = U.normal(0, 10), vs = U.clamp(ytAppeal(s, t) + 8 + dev, 0, 100);
      t.vid = plioSpec({ k: 'vlog', t: `【${t.cat}】 ${calM(s) + 1}월 새 영상`, ch: t.ch, me: (t.sn && t.sn.nick) || '', sc: vs, rv: dev >= 12 ? 2 : dev >= 0 ? 1 : dev >= -12 ? 0 : -1, vw: Math.max(40, t.subs * (0.08 + vs / 140)) * (dev >= 15 ? 4 : 1) });
      if (dev >= 15) { const add = Math.round(t.subs * U.fl(0.02, 0.05) + 50); t.subs += add; addLog(s, `「${t.ch}」 이번 달 영상이 알고리즘을 탔다. 조회수가 평소의 몇 배로 뛰었다. (구독자 ${sgnFans(add)})`, 'good'); s.log[s.log.length - 1].pl = t.vid; }
      else if (dev <= -17 && t.subs >= 1000) { addLog(s, `「${t.ch}」 이번 달 영상은 반응이 차가웠다.`, 'career'); s.log[s.log.length - 1].pl = t.vid; }
    }
    t.peak = Math.max(t.peak || 0, t.subs);
    s.fans[mk] += Math.round(Math.max(0, t.subs - before) * 0.5 * myRoom(s, mk));
    // 수입: 스트리머는 조회수 광고 수익, 버튜버는 방송 후원과 멤버십 (소속이면 회사 몫을 뗀다)
    const cut = t.mcn ? t.mcn.cut : t.corp ? t.cut : 0;
    const inc = t.mode === 'vt' ? t.subs * VT_INC * U.fl(0.6, 1.4) : t.subs * U.fl(1, 3) * Math.min(2, n) * YT_INC;
    t.lastInc = t.subs >= 1000 ? Math.round(inc * (1 - cut)) : 0;
    incPush(t, t.lastInc);
    if (t.lastInc) earn(s, t.lastInc, t.mode === 'vt' ? '방송 후원·멤버십' : '라이브온 광고 수익', 'youtube');
    if (before < 1000 && t.subs >= 1000) addLog(s, `「${t.ch}」 구독자가 1,000명을 넘었다. 이제 ${t.mode === 'vt' ? '방송 후원과 멤버십' : '영상 광고'} 수익이 들어온다. (이번 달 ${fmtWon(t.lastInc)})`, 'good');
    ytCareerOffer(s, t);
    for (const [v, label] of [[1e5, '실버 버튼'], [1e6, '골드 버튼'], [1e7, '다이아 버튼']]) if (before < v && t.subs >= v) { jpopAdd(s, 'youtube', 3); addFame(s, 2); addLog(s, `「${t.ch}」 구독자 ${fmtFans(v)} 돌파! ${label}을 받았다.`, 'good'); milestone(s, `${age(s)}세에 「${t.ch}」 구독자 ${fmtFans(v)}을 넘겼다.`);
      // 개인세 버튜버는 기념 방송을 한다 (실시간 창을 볼 차례가 아니면 요약에 한 줄만)
      if (t.mode === 'vt') streamShow(s, 'youtube', ytCut(t), '구독자 기념 방송', `「${t.ch}」 구독자 ${fmtFans(v)} 기념 방송을 했다.`, ytLive(s, t, 'mile', { n: fmtFans(v), sc: 78 }), { queue: true, gain: v, gainK: '구독자', gainAbs: true }); }
  },
};
// 그림 · 단편 애니메이션 채널이 크게 되면(구독자 10만 이상) 가끔 애니 제작사에서 연락이 온다
// 그림 → 작화팀 스카우트 (애니메이터), 단편 애니메이션 → 감독 데뷔 제안 (애니메이션 감독). 거절하면 2년 동안은 다시 안 온다
const YT_OFFER = { min: 1e5, p: 0.012 };
function ytOfferP(t) { return t.subs < YT_OFFER.min ? 0 : YT_OFFER.p * (1 + Math.log10(t.subs / YT_OFFER.min)); }
function ytOfferTier(t) { return t.subs >= 1e6 ? 3 : U.pick([1, 2, 2]); }
function ytCareerOffer(s, t) {
  if (!U.chance(ytOfferP(t))) return;
  const p = me(s);
  if (t.cat === '그림' && lv(p, 'art') >= 30 && !(trackOn(s, 'animator') && s.tracks.animator.mode === 'emp') && !hasQ(s, 'an_scout') && !(s.cd.ytAnim > s.t)) {
    s.cd.ytAnim = s.t + 24; queueEv(s, 'an_scout', 0, { tier: ytOfferTier(t), ch: t.ch });
  }
  if (t.cat === '단편 애니메이션' && lv(p, 'direct') >= 20 && !(trackOn(s, 'adir') && s.tracks.adir.mode !== 'indie') && !hasQ(s, 'adir_debut') && !(s.cd.ytAdir > s.t)) {
    s.cd.ytAdir = s.t + 24; queueEv(s, 'adir_debut', 0, { co: aniCoOf(ytOfferTier(t)).n, ch: t.ch });
  }
}
JOB_APPLY.push({
  id: 'youtube_open', trk: 'youtube', g: '▶️ 스트리머', n: '라이브온 채널 열기',
  show: s => !trackOn(s, 'youtube'),
  h: s => '얼굴을 보이고 영상을 올린다 · 채널 컨셉을 고른다',
  ok: s => !ytBlock(s), why: s => ytBlock(s),
  run: s => { fireEvent(s, 'yt_cat', { mode: 'yt' }); return ''; },
});
VT_AV.forEach((av, i) => { if (!av) return; JOB_APPLY.push({
  id: 'youtube_vt' + i, trk: 'youtube', g: '▶️ 스트리머', n: `버튜버 개인세 준비: ${av.n}`,
  show: s => !s.flags.vtBan && !trackOn(s, 'youtube') && (!av.art || lv(me(s), 'art') >= av.art - 20),
  // 버츄얼 아이돌 기획사 · MCN 대표면 내 회사 소속 버튜버라 아바타 값은 자본금으로 (v105)
  h: s => `${av.c ? fmtWon(av.c) + (ownCoNew(s, 'youtube', true) ? ' (자본금)' : '') : '무료'} · 만드는 데 ${av.m}개월`,
  ok: s => !ytBlock(s) && (ownCoNew(s, 'youtube', true) || s).money >= av.c && (!av.art || lv(me(s), 'art') >= av.art) && !artistContract(s),
  why: s => ytBlock(s) || artistContractWhy(s) || (av.art && lv(me(s), 'art') < av.art ? '그림 실력이 더 필요하다' : `${ownCoNew(s, 'youtube', true) ? '회사 ' : ''}돈이 모자라다 (${fmtWon(av.c)} 필요)`),
  run: s => { const co = ownCoNew(s, 'youtube', true); if (av.c) { if (co) coOut(co, av.c, OWN_CO_N.youtube + ' 비용', co.f && co.f.vidol ? 'vidol' : 'mcn'); else addMoney(s, -av.c, '아바타 제작비'); } const old = s.tracks.youtube; s.tracks.youtube = { st: 'prep', mode: 'vt', av: i, left: av.m, corp: null, corpN: '', cut: 0, subs: 0, months: 0, sn: old.sn, hist: old.hist || [] }; return `${josa(av.n, '을를')} 맡겼다. 버튜버 데뷔 준비를 시작했다.`; },
}); });
// 회사 오디션: 아직 채널이 없거나, 개인세로 활동 중인 버튜버만 낼 수 있다 (회사 소속 버튜버는 못 낸다. 템퍼링으로 퇴출되면 버튜버 지원은 모두 사라진다)
// 개인세 버튜버가 붙으면 회사가 만든 새 아바타로 다시 데뷔하고, 지금 채널 구독자 일부가 따라온다. 구독자가 많을수록 붙기 쉽다
function vtSolo(s) { const t = s.tracks.youtube; return t.st === 'active' && t.mode === 'vt' && !t.corp; }
// v207: 버츄얼 아이돌은 예능이 중요하다 (방송 실력 75% + 예능 25%). 회사 특징 (CO_FOCUS.vtuber)
function vtAudP(s, ag) { const t = s.tracks.youtube; return audP(coFocus(s, 'vtuber', ag.con, vtScore(s) * 0.75 + lv(me(s), 'variety') * 0.25) + pm(s, 'audition', 0) + (vtSolo(s) ? Math.log10(1 + t.subs / 1000) * 4 : 0), ag.thr); }
// 회사 소속 버튜버(버츄얼 아이돌)의 오디션·계약·활동은 js/vidol.js
const VT_CARRY = 0.3, VT_TAMPER_CATCH = 0.03;
// 채널 컨셉 고르기 (라이브온 채널을 열 때 · 버튜버 아바타가 다 됐을 때 · 바꿀 때)
// 바꿀 때는 지금 컨셉을 빼고 보여 주고, '역시 그만둔다'를 고르면 아무것도 잃지 않는다
E({
  id: 'yt_cat', cat: '채널', title: '채널 컨셉', tag: 'career',
  text: (s, d) => `${d.change ? `채널 컨셉을 바꾼다. 지금은 '${s.tracks.youtube.cat}'.` : d.mode === 'vt' ? '아바타가 다 됐다. 어떤 방송을 하는 버튜버로 데뷔할까?' : '어떤 영상을 올리는 채널로 할까?'}`,
  ch: (s, d) => ytCatSort(s, ytCats((d.change ? s.tracks.youtube.mode : d.mode) === 'vt').filter(c => !d.change || c !== s.tracks.youtube.cat)).map(c => { return { t: c, h: ytCatH(s, c), f: s => {
    if (d.change) { const t = s.tracks.youtube; t.cat = c; t.catT = s.t + 12; t.subs = Math.round(t.subs * 0.9); return `채널 컨셉을 '${c}'${josa(c, '으로').slice(c.length)} 바꿨다. 예전 구독자 일부가 떠났다.`; }
    if (d.mode === 'vt') { s.tracks.youtube.cat = c; fireEvent(s, s.tracks.youtube.corp ? 'yt_debut' : 'yt_tgt', { mode: 'vt' }); return ''; }
    fireEvent(s, 'yt_tgt', { mode: 'yt', cat: c }); return '';
  } }; }).concat(d.mode === 'vt' && !d.change ? [] : [{ t: '역시 그만둔다', f: () => '' }]),
});
// v207: 방송 타겟 — 국내 · 일본 · 해외(영어권). 외국은 그 나라 말을 잘해야 고를 수 있다 (40레벨부터)
// 외국은 닿을 수 있는 시청자가 많은 대신, 말을 아주 잘하지 않으면 다 끌어오지 못한다. 회사 소속 버튜버는 회사가 정한다
const YT_TGT = { kr: { n: '국내', mul: 1 }, jp: { n: '일본', mul: 1.4, sk: 'jp' }, us: { n: '해외 (영어권)', mul: 2, sk: 'en' } };
const YT_TGT_LV = 40;
function ytMk(t) { return t.tgt || (t.jp ? 'jp' : 'kr'); }
function ytTgtMul(s, t) { const T = YT_TGT[ytMk(t)]; return T.sk ? T.mul * Math.min(1, 0.4 + lv(me(s), T.sk) / 100) : 1; }
function ytTgtWhy(s, k) { const T = YT_TGT[k]; return T.sk && lv(me(s), T.sk) < YT_TGT_LV ? `${SKILLS[T.sk].n}${josa(SKILLS[T.sk].n, '이가').slice(SKILLS[T.sk].n.length)} ${YT_TGT_LV}레벨 이상이어야 한다` : ''; }
E({
  id: 'yt_tgt', cat: '채널', title: '방송 타겟', tag: 'career',
  text: (s, d) => d.change ? `방송 타겟을 바꾼다. 지금은 ${YT_TGT[ytMk(s.tracks.youtube)].n}.` : '누구를 보고 방송할까? 외국 시청자를 노리면 더 많은 사람에게 닿을 수 있지만, 그 나라 말을 잘해야 한다.',
  ch: (s, d) => Object.entries(YT_TGT).filter(([k]) => !d.change || k !== ytMk(s.tracks.youtube)).map(([k, T]) => { const w = ytTgtWhy(s, k); return { t: T.n, ok: () => !w, h: w || (T.sk ? `${SKILLS[T.sk].n} ${lvi(me(s), T.sk)}레벨` : ''), f: s => {
    if (d.change) { const t = s.tracks.youtube; t.tgt = k; t.jp = k === 'jp'; t.tgtT = s.t + 12; t.subs = Math.round(t.subs * 0.8); return `방송 타겟을 ${josa(T.n, '으로')} 바꿨다. 예전 시청자 일부가 떠났다.`; }
    fireEvent(s, 'yt_debut', { mode: d.mode, cat: d.cat, tgt: k }); return '';
  } }; }).concat(d.change ? [{ t: '그만둔다', f: () => '' }] : d.mode === 'vt' ? [] : [{ t: '역시 그만둔다', f: () => '' }]),
});
// 채널 이름(버튜버는 RP 이름과 애칭까지) 정하고 첫 영상·첫 방송
E({
  id: 'yt_debut', cat: '데뷔', title: '채널 열기', tag: 'career',
  init(s, d) {
    const t = s.tracks.youtube;
    if (!d.mode) d.mode = t.mode || 'vt';
    const sn = t.sn || CAREER_IDS.map(id => s.tracks[id].sn).find(Boolean);
    d.given = d.mode === 'vt' ? vtRpName(me(s).g) : (sn ? sn.sur + sn.given : me(s).name);
    // 버튜버 채널은 RP 이름을 따라간다 (하루노 유이 · 유이 Ch. · 하루노 유이 Ch.)
    d.ch = d.mode === 'yt' ? ytChName(d.cat) : U.pick([d.given, vtGiven(d.given) + ' Ch.', d.given + ' Ch.']);
    d.corp = d.mode === 'vt' && t.corp;
  },
  text: (s, d) => d.mode === 'yt' ? `'${d.cat}' 채널을 연다. 채널 이름을 정하자.` : d.corp ? `${s.tracks.youtube.corpN}에서 만든 아바타가 완성됐다. 채널 이름과 RP 이름을 정하면 데뷔 방송이다.` : `${josa(VT_AV[s.tracks.youtube.av].n, '이가')} 완성됐다. 채널 이름과 RP 이름, 팬들이 부를 애칭을 정하면 데뷔 방송이다.`,
  form: (s, d) => d.mode === 'yt' ? [{ k: 'ch', label: '채널 이름', value: d.ch, max: 14 }] : [{ k: 'ch', label: '채널 이름', value: d.ch, max: 14 }, { k: 'given', label: 'RP 이름', value: d.given, max: 12 }, { k: 'nick', label: '애칭 (팬들이 부르는 이름)', value: genNick(s, d.given), max: 12 }],
  submit(s, d, v) {
    const ch = (v.ch || '').trim();
    if (!ch) return { err: '채널 이름은 비울 수 없어요' };
    if (d.mode === 'yt') {
      const old = s.tracks.youtube;
      s.tracks.youtube = { st: 'active', mode: 'yt', ch, cat: d.cat, tgt: d.tgt || 'kr', jp: d.tgt === 'jp', subs: Math.round(totalFans(s) * 0.05), months: 0, peak: 0, corp: null, cut: 0, sn: old.sn, hist: old.hist || [] };
      milestone(s, `${age(s)}세에 라이브온 채널 ${josa(`「${ch}」`, '을를')} 열었다.`);
      return { log: `라이브온 채널 ${josa(`「${ch}」`, '을를')} 열었다. 일정에 채널 활동을 넣어야 영상을 올린다.` + learnMe(s, 'edit', 1, true) };
    }
    const given = (v.given || '').trim();
    if (!given) return { err: 'RP 이름은 비울 수 없어요' };
    const t = s.tracks.youtube;
    t.sn = { sur: '', given, nick: (v.nick || '').trim(), self: !t.corp };
    // 개인세 때 채널에서 따라온 구독자(carry)도 더한다
    const start = (t.corp ? AG[t.corp].tier * 2500 : 0) + Math.round(s.fans.kr * 0.05) + (t.carry || 0);
    delete t.carry;
    Object.assign(t, { st: 'active', ch, cat: t.cat || (lv(me(s), 'game') > lv(me(s), 'vocal') ? '게임 방송' : '커버 영상'), subs: start, months: 0, peak: start, jp: t.corp ? AG[t.corp].mkt === 'jp' : d.tgt === 'jp', tgt: t.corp ? (AG[t.corp].mkt === 'jp' ? 'jp' : 'kr') : d.tgt || 'kr' });
    milestone(s, `${age(s)}세에 버튜버 ${qn(given, '라는')} 이름으로 「${ch}」 채널을 열고 데뷔했다.`);
    // 데뷔 방송을 실시간 창으로 (볼 차례가 아니면 예전처럼 결과만)
    const log = `버튜버 ${given}(채널 「${ch}」)로 데뷔했다! 일정에 채널 활동을 넣어야 방송을 한다.` + (t.corp ? '' : learnMe(s, 'edit', 1, true));
    streamShow(s, 'youtube', ytCut(t), '데뷔 방송', log, ytLive(s, t, 'debut'), { gain: t.subs, gainK: '첫 구독자', gainAbs: true });
    return { log: '' };
  },
});
// ════════ 편집자 ════════
// 스트리머·제작사의 영상을 편집한다. 혼자 일감을 받거나(프리랜서), 영상 제작사 편집팀에 들어간다(직원)
// 편집 특기가 가장 중요하고, 연출을 할 줄 알면 조금 보탠다
const EDIT_SAL = [0, 210, 250, 300];
const EDIT_THR = [0, 22, 34, 46];
const EDIT_BAR = [0, 45, 50, 55]; // 회사 편집팀 석 달 평가 기준 (크기별)
EMP_N.editor = '편집자';
// 편집 숙련도 (피드백 24): 같은 종류의 영상을 많이 편집할수록 오른다 (0~100, s.emast { yt 라이브온 영상 · show 예능 · drama 드라마 · film 영화 })
// 편집 품질을 올린다 (최대 +5). 창의력이 높으면 빨리 오른다 (곡·각본·연출 숙련도와 같은 셈)
const EM_N = { yt: '라이브온 영상', show: '예능', drama: '드라마', film: '영화' };
function emGet(s, k) { return (s.emast || {})[k] || 0; }
function emGain(s, k, amt) { if (!EM_N[k]) return; const M = s.emast = s.emast || {}, m = M[k] || 0; M[k] = Math.min(100, m + amt * (1 - m / 100) * (0.6 + me(s).tal.creative / 100)); }
function emBonus(s, k) { return EM_N[k] ? (emGet(s, k) - 15) / 17 : 0; }
function emBars(s) { return Object.keys(EM_N).map(k => ({ n: EM_N[k], v: emGet(s, k) })).sort((a, b) => b.v - a.v); }
// 편집 품질 (v95): 영상 편집(강함), 라이브온 · 예능을 편집할 때만 유머 감각(강함, 가산점)
// v96: 드라마 · 영화 편집은 연출 레벨만큼 가산점 (fitB, 레벨 1에 0.1)
function editQ(s, k) { const p = me(s); return lv(p, 'edit') * 0.95 + (k === 'yt' || k === 'show' ? talB(p.tal.humor, true) : k === 'drama' || k === 'film' ? fitB(p, ['direct']) : 0) + emBonus(s, k) + U.normal(0, 7); }
// 편집자 합격 (v99, 8-5): 영상 편집(강함) + 포트폴리오 재능(보통, 가산점). 회사 편집팀은 예술 감각, 라이브온 영상만 맡는 곳(MCN · 크리에이터 전속)은 유머 감각
function editScore(s, yt) { const p = me(s); return lv(p, 'edit') * 0.85 + talB(yt ? p.tal.humor : p.tal.aesth, false); }
// 프리랜서 일감 (피드백 19): m 걸리는 개월, dem 난이도(이보다 잘하면 평판이 오르고 못하면 떨어진다), rw 평판이 움직이는 크기
const EDIT_CLIENTS = [
  { n: '스트리머 채널 영상', fee: 80, rep: 0, m: 1, dem: 22, rw: 0.6, mk: 'yt' },
  { n: '예능 클립 편집', fee: 200, rep: 20, m: 1, dem: 34, rw: 0.9, mk: 'show' },
  { n: '드라마 예고편', fee: 400, rep: 40, m: 2, dem: 46, rw: 1.2, mk: 'drama' },
  { n: '영화 본편 편집', fee: 1500, rep: 65, m: 3, dem: 58, rw: 1.5, mk: 'film' },
];
// 작업 방식: q 품질에 더하는 값, st 스트레스, m 기간을 줄이는 개월
const EDIT_WAYS = [
  { n: '평소대로 한다', h: '스트레스 조금', q: 0, st: 2, m: 0 },
  { n: '밤새 다듬는다', h: '품질 ↑ · 스트레스 많이', q: 8, st: 7, m: 0 },
  { n: '빨리 넘긴다', h: '기간 짧게 · 품질 ↓', q: -7, st: 0, m: 1 },
];
// 내 평소 편집 품질과 일감 난이도를 비교한 말
function editMean(s, k) { const p = me(s); return lv(p, 'edit') * 0.85 + lv(p, 'direct') * 0.1 + emBonus(s, k); }
function editDiffWord(s, dem) { const g = editMean(s) - dem; return g >= 8 ? '여유' : g >= -4 ? '알맞음' : '버거움'; }
// 맡은 일감이 끝나면: 결과가 난이도보다 좋으면 평판이 오르고 못하면 떨어진다. 잘 끝낸 의뢰처는 단골이 된다
function editJobDone(s, t) {
  const j = t.job, w = EDIT_WAYS[j.way || 0], q = editQ(s, j.mk) + w.q, gap = q - j.dem;
  t.job = null; t.jobs++; emGain(s, j.mk, 5);
  const fee = gap < -10 ? Math.round(j.fee * 0.7 / 1e4) * 1e4 : j.fee;
  earn(s, fee, '편집비');
  const r0 = t.rep;
  t.rep = U.clamp(t.rep + U.clamp(gap / 3, -4, 6) * j.rw * 1.2, 0, 100);
  addWork(s, { type: '영상 편집', title: j.n, pay: fee, by: j.who, sc: Math.round(q + 15), note: gap >= 10 ? '호평' : gap >= 0 ? '무난' : '아쉬움' });
  if (t.jobs === 1) milestone(s, `${age(s)}세에 처음으로 영상 편집 일감을 맡았다.`);
  let reg = '';
  t.regs = t.regs || [];
  if (gap >= 5 && !t.regs.some(r => r.who === j.who)) { t.regs.push({ who: j.who, n: j.n }); if (t.regs.length > 6) t.regs.shift(); reg = ` ${josa(j.who, '이가')} 단골이 됐다.`; }
  if (j.rep === 0 && gap >= 10) dedOfferMaybe(s, j.who.replace('스트리머 ', ''));
  const word = gap >= 10 ? '의뢰인이 아주 만족했다' : gap >= 0 ? '좋다는 말을 들었다' : gap >= -10 ? '수정 요청을 받고 겨우 맞췄다' : '수정이 계속되다 편집비가 깎였다';
  addRes(s, `${j.who}의 ${josa(j.n, '을를')} 끝냈다. ${word}. 편집비 ${fmtWon(fee)} · 업계 평판 ${Math.round(r0)} → ${Math.round(t.rep)}.${reg}`);
}
CAREERS.editor = {
  n: '편집자', ic: '🎞️',
  desc: '스트리머·제작사의 영상을 편집한다. 혼자 일감을 받거나, 방송인 한 명의 전담 편집자가 되거나, 영상 제작사 편집팀에 들어간다. 편집이 가장 중요하다.',
  act: { n: '영상 편집 작업', ic: '🎞️', g: '직업 활동', eff: [['영상 편집', '↑↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) { if (t.st !== 'active') return t.endNote || ''; if (t.mode === 'ded') return `「${t.cr.ch}」 전담 편집자 · 구독자 ${fmtFans(t.cr.subs)} · 월급 ${fmtWon(t.sal)}${t.cr.st === 'down' ? ' · 방송 중단' : ''}`; return t.mode === 'emp' ? `${t.agN} 편집팀${t.lead ? ' 팀장' : ''} · 평가 ${Math.round(t.rep)} · 월급 ${fmtWon(t.sal)}` : `프리랜서 편집자 · 맡은 작업 ${t.jobs}건 · 업계 평판 ${Math.round(t.rep)}${t.job ? ' · 작업 중' : ''}`; },
  short(s, t) { return t.mode === 'emp' ? `${t.agN} 편집자` : t.mode === 'ded' ? `「${t.cr.ch}」 전담 편집자` : '프리랜서 편집자'; },
  seg(s, t) { return t.mode === 'emp' ? `${t.agN} 편집팀` : t.mode === 'ded' ? `「${t.cr.ch}」 전담 편집자` : '프리랜서 편집자'; },
  title(s, t) { return t.jobs || t.months ? (t.rep >= 60 ? '이름난 편집자' : '편집자') : null; },
  contract(s, t) { return t.st !== 'active' ? '' : t.mode === 'emp' ? `${t.agN} (편집자)` : t.mode === 'ded' ? `「${t.cr.ch}」 (전담 편집)` : ''; },
  emp: true,
  cLeft(s, t) { return t.st !== 'active' ? null : t.mode === 'emp' && t.cEnd != null ? t.cEnd - t.months : t.mode === 'ded' ? t.dedEnd - t.months : null; },
  mainSk() { return 'edit'; },
  info(s, t) {
    const p = me(s), cr = t.cr, c = cr && s.people[cr.id];
    const how = t.mode === 'emp' ? ['회사', `${t.agN}${t.mcn ? ` (${TIER_N[mcnTierOf(s, t.mcn)]} MCN)` : ''} 편집팀${t.lead ? ' 팀장' : ''} · 월급 ${fmtWon(t.sal)}`] : t.mode === 'ded' ? ['전담 방송인', `${cr.vt ? '버튜버' : '스트리머'} ${c ? c.name : ''} · 「${cr.ch}」 · ${cr.cat} · 구독자 ${fmtFans(cr.subs)}`] : ['일하는 방식', '프리랜서 (일감은 일정에 편집 작업을 넣으면 들어온다)'];
    const R = [how, ['내 실력', ['edit', 'direct'].filter(k => has(p, k)).map(k => `${SKILLS[k].n} ${lvi(p, k)}`).join(' · ')], [t.mode === 'emp' ? '업무 평가' : '업계 평판', `${Math.round(t.rep)}`], ['맡은 작업', `${t.jobs}건`]];
    if (t.mode === 'ded') R.splice(1, 0, ['월급', `${fmtWon(t.sal)}${cr.st === 'down' ? ' (방송이 멈춰 일감이 거의 없다)' : ''}`]);
    R.push({ h: '편집 숙련도', bars: emBars(s) });
    if (t.mode === 'free') R.push(['하는 일', t.job ? `${t.job.who} · ${t.job.n} · ${EDIT_WAYS[t.job.way || 0].n.split(' ')[0]} · ${Math.max(1, t.job.end - s.t)}개월 남음` : '없음'], ['단골', (t.regs || []).map(r => r.who).join(' · ') || '없음']);
    return R;
  },
  actions(s, t) {
    if (t.st !== 'active') return [];
    if (t.mode === 'ded') return [{ t: '전담 계약 끝내기', h: '프리랜서로 돌아간다', ok: true, danger: true, confirm: `「${t.cr.ch}」 전담 계약을 끝낼까요?`, run: s => endDed(s, t, '계약 종료') + ' 이제 프리랜서로 일한다.' }];
    if (t.mode === 'emp') return [{ t: '회사 그만두기', h: '직원 계약이라 위약금은 없다 · 그만두면 프리랜서로 돌아간다', ok: true, danger: true, confirm: '정말 회사를 그만둘까요?', run: s => { const n = t.agN; t.hist = (t.hist || []).concat(`${n} 편집팀 (퇴사)`); t.mode = 'free'; t.agN = ''; t.lead = false; t.mcn = null; return `${josa(n, '을를')} 그만두고 프리랜서로 돌아갔다.`; } }];
    return [{ t: '편집 일 그만두기', ok: true, danger: true, confirm: '정말 편집 일을 그만둘까요?', run: s => { t.st = 'ended'; t.endNote = `편집자 · 작업 ${t.jobs}건`; return '편집 일을 그만뒀다.'; } }];
  },
  monthly(s, t) {
    if (t.st !== 'active') return;
    t.months++;
    const n = slotsOn(s, 'c_editor'), p = me(s);
    if (t.mode === 'emp') {
      empMonth(s, 'editor', t);
      earn(s, t.sal, '월급', 'editor');
      if (!n) { t.idle = (t.idle || 0) + 1; if (t.idle >= 4) { t.idle = 0; empRep(s, 'editor', t, -8); addLog(s, '편집팀에서 요즘 맡은 작업이 밀린다는 말을 들었다.', 'career'); } return; }
      t.idle = 0;
      practice(s, p, 'edit', 1.3 * n); useSkill(s, p, 'direct', 0.2 * n); addStress(s, 2);
      // 석 달마다 맡은 프로그램 편집 반응이 나온다
      // 석 달마다 평가: 편집 품질이 기준보다 높으면 오르고 낮으면 떨어진다. 기준은 회사가 클수록 높다 (소형 45, 중형 50, 대형 55, 팀장이면 +7)
      if (t.months % 3 === 0) {
        const mk = t.mcn ? 'yt' : U.pick(['show', 'drama', 'film']), q = editQ(s, mk), bar = EDIT_BAR[t.tier || 2] + (t.lead ? 7 : 0), r0 = Math.round(t.rep);
        emGain(s, mk, 3);
        t.jobs++; empRep(s, 'editor', t, (q - bar) / 3);
        if (t.mcn && AG[t.mcn]) mcnGrow(s, t.mcn, U.clamp((q - bar) / 8, 0, 1.5) * (t.lead ? 1.5 : 1));
        const word = q >= bar + 12 ? `${t.mcn ? '크리에이터가' : '연출팀이'} 극찬했다` : q >= bar + 4 ? '좋다는 평' : q >= bar - 4 ? '무난하다는 평' : q >= bar - 12 ? '아쉽다는 평' : '다시 손보라는 말을 들었다';
        const ttl = t.mcn ? `${t.agN} 소속 채널 영상` : tvShowTitle();
        addRes(s, `맡은 ${t.mcn ? '소속 채널 영상' : EM_N[mk]} 편집 반응: ${word}. (업무 평가 ${r0} → ${Math.round(t.rep)})`);
        // 12-3 보는 쪽: 내가 편집한 영상의 반응은 라이브온에서
        if (typeof plioSpec === 'function') s.log[s.log.length - 1].pl = plioSpec({ k: mk === 'yt' ? 'vlog' : mk === 'show' ? 'show' : 'drama', t: t.mcn ? ttl : `「${ttl}」 클립`, ch: t.agN, me: '', sc: U.clamp(55 + (q - bar) * 2, 5, 98) });
        addWork(s, { type: '영상 편집', title: ttl, by: t.agN, sc: Math.round(q + 10), note: q >= bar + 4 ? '호평' : q >= bar - 4 ? '무난' : '아쉬움' });
      }
      return;
    }
    if (t.mode === 'ded') { dedMonth(s, t, n); return; }
    if (t.job && s.t >= t.job.end) editJobDone(s, t);
    if (!n) return;
    practice(s, p, 'edit', 1.3 * n); useSkill(s, p, 'direct', 0.2 * n); addStress(s, 1.5);
    // 일감: 맡은 일이 없을 때만. 평판이 낮으면 넉 달에 한 번쯤, 높으면 두 달에 한 번쯤 들어온다
    if (!t.job && !hasQ(s, 'edit_job') && U.chance(Math.min(0.5, (0.25 + t.rep / 400) * (0.7 + access(s) * 0.3) * pm(s, 'network')))) queueEv(s, 'edit_job', 0);
  },
};
function startEditor(s, o = {}) {
  const old = s.tracks.editor;
  s.tracks.editor = Object.assign({ st: 'active', mode: 'free', months: 0, rep: old.rep || 0, jobs: old.jobs || 0, hist: old.hist || [] }, o);
  if (!old.months) milestone(s, `${age(s)}세에 영상 편집자 일을 시작했다.`);
}
JOB_APPLY.push({
  id: 'editor_free', trk: 'editor', g: '🎞️ 편집자', n: '프리랜서 영상 편집자로 시작하기',
  show: s => !trackOn(s, 'editor'),
  h: s => '일정에 편집 작업을 넣으면 스트리머·제작사 일감이 들어온다',
  ok: s => !s.army && age(s) >= 16 && lv(me(s), 'edit') >= 20,
  why: s => s.army ? '군 복무 중' : age(s) < 16 ? '16세부터 할 수 있다' : '영상 편집을 더 배워야 한다',
  run: s => { startEditor(s); return '프리랜서 영상 편집자로 일을 시작했다. 일정에 편집 작업을 넣으면 일감이 들어온다.'; },
});
// v207: 영상 제작사마다 따로 지원한다 (회사 특징 CO_FOCUS.prod)
function editApplyP(s, c) { return audP(coFocus(s, 'prod', c.con, editScore(s)) + empExpBonus(s, 'editor'), EDIT_THR[c.tier]); }
PROD_COS.forEach((x0, i) => { const key = 'prod.' + i; JOB_APPLY.push({
  id: 'editor_p' + i, coKey: key, pos: '편집팀 채용', trk: 'editor', g: '🎞️ 편집자', get n() { return `${coByKey(key).n} 편집팀 채용`; }, get tag() { const c = coByKey(key); return `${TIER_N[c.tier]} · 월급 ${EDIT_SAL[c.tier]}만 원`; },
  show: s => !(trackOn(s, 'editor') && s.tracks.editor.mode === 'emp') && age(s) >= 20,
  h: s => lv(me(s), 'edit') >= 30 ? `합격 가능성 ${fmtPct(editApplyP(s, coByKey(key)))} · 결과는 다음 달` : '영상 편집이 30레벨 이상이어야 지원할 수 있다',
  ok: s => !s.army && !agencyContract(s) && lv(me(s), 'edit') >= 30 && !hasQ(s, 'edit_res') && !(s.cd['edit_' + key] > s.t),
  why: s => s.army ? '군 복무 중' : agencyContract(s) ? contractWhy(s) : lv(me(s), 'edit') < 30 ? '영상 편집을 더 배워야 한다' : hasQ(s, 'edit_res') ? '결과를 기다리는 중' : '얼마 전에 지원했다 (반년 뒤 다시)',
  run: s => { const c = coByKey(key); s.cd['edit_' + key] = s.t + 6; queueEv(s, 'edit_res', 1, { tier: c.tier, co: c.n, p: editApplyP(s, c) }); return `${c.n} 편집팀 채용에 지원했다.`; },
}); });
E({
  id: 'edit_res', cat: '채용', title: '편집팀 채용 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); d.lead = d.pass && empStartLead(s, 'editor'); d.sal = empStartSal(s, 'editor', EDIT_SAL[d.tier] * 1e4, d.lead); },
  text: (s, d) => d.pass ? `${d.co} 편집팀에 ${d.lead ? '팀장으로 ' : ''}합격했다! 회사가 제시한 월급은 ${fmtWon(d.sal)}.${d.lead ? '\n\n그동안의 경력을 보고 처음부터 팀장 자리를 맡긴다.' : ''}` : `${d.co} 편집팀 채용에 떨어졌다.`,
  ch: (s, d) => d.pass ? [
    { t: '입사 조건을 들어 본다', ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '월급을 협상할 수 있다', f: s => startNego(s, { kind: 'editor', agN: d.co, mcn: d.mcn || null, tier: d.tier, sal: d.sal, lead: d.lead, months: 24, lev: U.clamp((d.p - 0.5) * 0.8 + 0.3, 0.05, 0.8) }) },
    { t: '거절한다', f: () => '입사 제안을 거절했다.' },
  ] : [{ t: '확인', f: () => `${d.co} 편집팀 채용에 떨어졌다.` }],
});
NEGO.editor = empNego('editor', (s, d) => {
  const old = s.tracks.editor, lead = !!d.lead;
  startEditor(s, { mode: 'emp', agN: d.agN, mcn: d.mcn || null, tier: d.tier, cEnd: d.months, rep: empStartRep(s, 'editor', lead), lead, everLead: !!old.everLead || lead, sal: d.sal, salBase: d.sal, salBase0: lead ? Math.round(d.sal / leadRaise('editor') / 1e5) * 1e5 : d.sal, idle: 0, months: 0 });
  milestone(s, `${age(s)}세에 ${d.agN} 편집팀에 ${lead ? '팀장으로 ' : ''}들어갔다.`);
  coMeetJob(s, 'editor');
  return `${d.agN} 편집팀에 ${lead ? '팀장으로 ' : ''}입사했다. 월급 ${fmtWon(d.sal)} · 계약 ${yrs(d.months)}.`;
});
// 프리랜서 일감: 두 곳 중 하나를 맡는다. 평판이 오를수록 큰 일감이 들어온다
// 평판이 낮아 받을 수 있는 종류가 하나뿐이면 같은 종류를 두 곳에서 받는다
// 단골 의뢰처가 있으면 반쯤은 한 곳이 단골이다 (편집비 25% 더). 맡으면 작업 방식을 고르고(edit_way), 기간이 끝나면 결과가 나온다(editJobDone)
E({
  id: 'edit_job', cat: '편집 일감', title: '편집 의뢰', tag: 'career',
  cond: s => trackOn(s, 'editor') && s.tracks.editor.mode === 'free' && !s.tracks.editor.job,
  init(s, d) {
    const t = s.tracks.editor, can = EDIT_CLIENTS.filter(c => t.rep >= c.rep - 10), regs = (t.regs || []).filter(r => can.some(c => c.n === r.n));
    const two = can.length >= 2 ? U.shuffle(can).slice(0, 2) : [can[0], can[0]];
    const reg = regs.length && U.chance(0.5) ? U.pick(regs) : null;
    if (reg) two[0] = can.find(c => c.n === reg.n);
    d.js = [];
    two.forEach((c, i) => {
      const isReg = i === 0 && !!reg;
      let who = isReg ? reg.who : null;
      while (!who || d.js.some(j => j.who === who && j.n === c.n)) who = c.rep === 0 ? `스트리머 ${ytNick()}` : U.pick(PROD_CO);
      d.js.push({ n: c.n, mk: c.mk, rep: c.rep, m: c.m, dem: c.dem + U.int(-4, 6), rw: c.rw, reg: isReg, fee: Math.round(c.fee * (1 + t.rep / 50) * (isReg ? 1.25 : 1) * U.fl(0.8, 1.2)) * 1e4, who });
    });
  },
  text: (s, d) => `편집 일감이 ${d.js.length === 1 ? '하나' : '두 개'} 들어왔다. ${d.js.length === 1 ? '맡을지 정하자.' : '하나를 맡을 수 있다.'}\n\n영상 편집 ${lvi(me(s), 'edit')}레벨 · 업계 평판 ${Math.round(s.tracks.editor.rep)}`,
  ch: (s, d) => d.js.map(j => ({ t: `${j.reg ? '단골 · ' : ''}${j.who} · ${j.n}`, h: `편집비 ${fmtWon(j.fee)} · ${j.m}개월 · 난이도 ${editDiffWord(s, j.dem)} · 평판 영향 ${j.rw >= 1.5 ? '큼' : j.rw >= 0.9 ? '보통' : '작음'}`, f: s => { fireEvent(s, 'edit_way', { j }); return ''; } })).concat([{ t: '이번엔 둘 다 넘긴다', f: () => '들어온 일감을 모두 거절했다.' }]),
});
E({
  id: 'edit_way', cat: '편집 일감', title: '작업 방식', tag: 'career',
  cond: s => trackOn(s, 'editor'),
  text: (s, d) => `${d.j.who}의 ${josa(d.j.n, '을를')} 맡기로 했다. ${d.j.m}개월 동안 작업한다. 어떻게 할까?\n\n난이도 ${editDiffWord(s, d.j.dem)} · 영상 편집 ${lvi(me(s), 'edit')}레벨`,
  ch: (s, d) => EDIT_WAYS.filter(w => !w.m || d.j.m > 1).map(w => ({ t: w.n, h: w.h, f: s => {
    const t = s.tracks.editor, m = Math.max(1, d.j.m - w.m);
    t.job = Object.assign({}, d.j, { way: EDIT_WAYS.indexOf(w), end: s.t + m });
    return `${d.j.who}의 ${josa(d.j.n, '을를')} 맡았다. ${m}개월 뒤에 끝난다.` + fx(s, { stress: w.st });
  } })),
});

// ── 스트리머 전담 편집자: 프리랜서와 회사 사이. 방송인 한 명과 계약해 그 채널 영상만 편집한다 ──
// 채널이 클수록 월급이 크고, 내 편집 실력이 채널 성장을 돕는다. 방송인이 논란으로 무너지면 일감이 확 준다
Object.assign(IND_JOBS, {
  '스트리머': { sk: { variety: [20, 70] }, tal: ['express', 'humor', 'star'] },
  '버튜버': { sk: { variety: [20, 70], vocal: [10, 60] }, tal: ['voice', 'humor', 'star'] },
});
function dedPay(subs) { return Math.round(U.clamp(100 + Math.sqrt(subs) * 0.5, 100, 1500)) * 1e4; }
function dedThr(subs) { return 15 + 10 * Math.log10(Math.max(1e3, subs) / 1e3); }
function dedScore(s) { return editScore(s, true) + empExpBonus(s, 'editor') + ((s.tracks.editor || {}).rep || 0) * 0.08; }
// 전담 편집자를 구하는 방송인. size: 구독자 자릿수 (3.5면 3천~3만)
function makeCreator(s, size, ch) {
  const vt = U.chance(0.3), p = makeIndustry(s, vt ? '버튜버' : '스트리머', { age: U.int(20, 36) });
  const subs = Math.round(Math.pow(10, size + U.fl(0, 1)));
  const cat = U.pick(ytCats(vt));
  return { id: p.id, ch: ch || (vt ? vtRpName(p.g) : ytChName(cat)), cat, vt, subs, appeal: 16 * Math.log10(subs) - 15 + U.fl(-2, 5), st: 'ok' };
}
function creatorName(s, cr) { const c = s.people[cr.id]; return `${cr.vt ? '버튜버' : '스트리머'} ${c ? c.name : ''}`; }
function startDed(s, cr, pay) {
  const t = s.tracks.editor;
  if (!trackOn(s, 'editor')) startEditor(s, { mode: 'ded' }); else { t.mode = 'ded'; }
  const e = s.tracks.editor;
  Object.assign(e, { cr, sal: pay, dedEnd: e.months + 12, idle: 0, dm: 0 });
  const c = s.people[cr.id];
  if (c) meetAt(s, c, `「${cr.ch}」 전담 편집 계약`, 'editor');
  milestone(s, `${age(s)}세에 ${creatorName(s, cr)}(「${cr.ch}」)의 전담 편집자가 되었다.`);
  return `${creatorName(s, cr)}의 채널 「${cr.ch}」 전담 편집자가 되었다. 월급 ${fmtWon(pay)} · 1년 계약.`;
}
// 전담 계약을 끝내고 프리랜서로 돌아간다
function endDed(s, t, why) {
  const cr = t.cr;
  t.hist = (t.hist || []).concat(`「${cr.ch}」 전담 편집 (${why})`);
  t.mode = 'free'; t.cr = null; t.sal = 0; t.dedEnd = null;
  return `「${cr.ch}」 전담 편집을 그만뒀다.`;
}
function dedMonth(s, t, n) {
  const cr = t.cr, c = s.people[cr.id], p = me(s);
  if (n) { t.idle = 0; practice(s, p, 'edit', 1.3 * n); useSkill(s, p, 'direct', 0.2 * n); addStress(s, 1.5); emGain(s, 'yt', 0.5 * n); }
  else if (cr.st === 'ok') {
    t.idle = (t.idle || 0) + 1;
    if (t.idle === 3) { if (c) aff(c, -10); addLog(s, `${josa(creatorName(s, cr), "이가")} 요즘 편집본이 늦는다고 서운해한다.`, 'career'); }
    if (t.idle >= 5) { addLog(s, `편집이 계속 밀리자 ${josa(creatorName(s, cr), "이가")} 전담 계약을 끝냈다.`, 'bad'); endDed(s, t, '방송인이 계약 해지'); return; }
  }
  if (cr.st === 'ok') {
    // 내 편집이 좋을수록 채널이 더 크게 자란다
    const q = n ? editQ(s, 'yt') : 35;
    const target = Math.pow(10, (cr.appeal + (q - 50) * 0.15 + 15) / 16);
    cr.subs = Math.max(100, cr.subs + (cr.subs < target ? Math.round((target - cr.subs) * U.fl(0.02, 0.05)) : -Math.round(cr.subs * U.fl(0, 0.01))));
    cr.appeal += U.fl(-0.1, 0.2);
    earn(s, t.sal, '전담 편집 월급');
    t.dm = (t.dm || 0) + 1;
    if (n && t.dm % 6 === 0) { t.jobs++; t.rep = U.clamp(t.rep + (q - 45) / 8, 0, 100); addWork(s, { type: '영상 편집', title: `「${cr.ch}」 영상 반년치`, by: creatorName(s, cr), sc: Math.round(q + 15), note: `구독자 ${fmtFans(cr.subs)}` }); }
    // 방송인이 논란에 휘말리기도 한다 (채널이 클수록 조금 더 자주)
    if (!hasQ(s, 'ded_scandal') && U.chance(0.008 + (cr.subs >= 1e5 ? 0.004 : 0))) queueEv(s, 'ded_scandal', 0);
  } else if (cr.st === 'down') {
    // 방송이 멈춰 편집할 영상이 거의 없다
    earn(s, Math.round(t.sal * 0.25 / 1e4) * 1e4, '전담 편집 월급');
    if (n) { practice(s, p, 'edit', 0.4 * n); }
    if (--cr.left <= 0) queueEv(s, 'ded_back', 0);
  }
  if (t.mode === 'ded' && t.months >= t.dedEnd && cr.st === 'ok') queueEv(s, 'ded_renew', 0);
}
JOB_APPLY.push({
  id: 'editor_ded', trk: 'editor', g: '🎞️ 편집자', n: '스트리머 전담 편집자 구하기', tag: '전담',
  show: s => !(trackOn(s, 'editor') && s.tracks.editor.mode === 'ded') && age(s) >= 17,
  h: s => '전담 편집자를 찾는 방송인 세 명 중 한 명에게 지원한다',
  ok: s => !s.army && lv(me(s), 'edit') >= 25 && !agencyContract(s) && !hasQ(s, 'ded_res') && !(s.cd.dedApply > s.t),
  why: s => s.army ? '군 복무 중' : lv(me(s), 'edit') < 25 ? '영상 편집을 더 배워야 한다' : agencyContract(s) ? contractWhy(s) : hasQ(s, 'ded_res') ? '결과를 기다리는 중' : '얼마 전에 지원했다 (반년 뒤 다시)',
  run: s => { s.cd.dedApply = s.t + 6; fireEvent(s, 'ded_pick', {}); return ''; },
});
E({
  id: 'ded_pick', cat: '구직활동', title: '전담 편집자 구함', tag: 'career',
  init(s, d) { d.cs = [3.4, 4.4, 5.4].map(sz => { const cr = makeCreator(s, sz); return { cr, pay: dedPay(cr.subs), p: audP(dedScore(s), dedThr(cr.subs)) }; }); },
  text: s => `전담 편집자를 찾는 방송인들이 있다. 한 명에게 지원할 수 있다.\n\n영상 편집 ${lvi(me(s), 'edit')}레벨`,
  ch: (s, d) => d.cs.map(x => ({ t: `${creatorName(s, x.cr)} 「${x.cr.ch}」`, tr: (x.cr.vt ? '버튜버' : '캠튜버') === s.trendTV.yt, h: `${x.cr.cat} · 구독자 ${fmtFans(x.cr.subs)} · 월급 ${fmtWon(x.pay)} · 합격 가능성 ${fmtPct(x.p)}`, f: s => { queueEv(s, 'ded_res', 1, x); return `${creatorName(s, x.cr)}의 전담 편집자 자리에 지원했다.`; } })).concat([{ t: '그만둔다', f: () => '이번엔 지원하지 않기로 했다.' }]),
});
E({
  id: 'ded_res', cat: '채용', title: '전담 편집자 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); },
  text: (s, d) => d.pass ? `${creatorName(s, d.cr)}에게서 함께하자는 연락이 왔다! 월급 ${fmtWon(d.pay)}, 1년 계약이다.` : `${josa(creatorName(s, d.cr), "은는")} 다른 편집자를 골랐다.`,
  ch: (s, d) => d.pass ? [
    { t: '계약한다', nj: 'editor', ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '', f: s => startDed(s, d.cr, d.pay) },
    { t: '거절한다', f: () => '전담 편집 제안을 거절했다.' },
  ] : [{ t: '확인', f: () => `${creatorName(s, d.cr)}의 전담 편집자 자리에 떨어졌다.` }],
});
// 프리랜서로 맡은 스트리머 영상이 마음에 들면, 그 스트리머가 전담을 제안하기도 한다 (메시지함)
function dedOfferMaybe(s, ch) {
  if (!U.chance(0.15) || s.inbox.some(m => m.kind === 'ded_offer')) return;
  const cr = makeCreator(s, 3.3, ch); cr.vt = false;
  sendMsg(s, 'ded_offer', { from: `스트리머 「${cr.ch}」`, title: '전담 편집자 제안', months: 3, d: { cr, pay: dedPay(cr.subs) } });
}
INBOX.ded_offer = {
  ic: '🎞️',
  text: (s, m) => `지난번에 영상을 맡겼던 ${josa(creatorName(s, m.d.cr), "이가")} 아예 전담 편집자가 되어 달라고 한다. 채널 「${m.d.cr.ch}」 · ${m.d.cr.cat} · 구독자 ${fmtFans(m.d.cr.subs)}.\n\n월급 ${fmtWon(m.d.pay)} · 1년 계약`,
  ch: (s, m) => [
    { t: '계약한다', ok: s => !agencyContract(s) && trackOn(s, 'editor'), h: !trackOn(s, 'editor') ? '지금은 편집 일을 하고 있지 않다' : agencyContract(s) ? contractWhy(s) : '', f: s => startDed(s, m.d.cr, m.d.pay) },
    { t: '거절한다', f: () => '전담 편집 제안을 거절했다.' },
  ],
};
// 1년마다 재계약: 채널 크기에 맞춰 월급을 다시 정한다
E({
  id: 'ded_renew', cat: '계약', title: '전담 편집 재계약', tag: 'career',
  cond: s => trackOn(s, 'editor') && s.tracks.editor.mode === 'ded' && s.tracks.editor.cr.st === 'ok',
  init(s, d) { const t = s.tracks.editor; d.pay = Math.max(Math.round(t.sal * 0.8 / 1e4) * 1e4, dedPay(t.cr.subs)); },
  text: (s, d) => { const t = s.tracks.editor; return `「${t.cr.ch}」 전담 계약이 끝났다. 구독자는 지금 ${fmtFans(t.cr.subs)}.\n\n${josa(creatorName(s, t.cr), "이가")} 1년 더 함께하자며 월급 ${fmtWon(d.pay)}을 제안했다. (지금 ${fmtWon(t.sal)})`; },
  ch: (s, d) => [
    { t: '재계약한다', f: s => { const t = s.tracks.editor; t.sal = d.pay; t.dedEnd = t.months + 12; return `「${t.cr.ch}」 전담 편집을 1년 더 하기로 했다. 월급 ${fmtWon(d.pay)}.`; } },
    { t: '끝내고 프리랜서로 돌아간다', f: s => endDed(s, s.tracks.editor, '계약 만료') },
  ],
});
// 내가 편집을 맡은 방송인이 논란에 휘말렸다 (지어낸 논란이면 나중에 돌아온다)
E({
  id: 'ded_scandal', cat: '논란', title: '방송인의 논란', tag: 'career',
  cond: s => trackOn(s, 'editor') && s.tracks.editor.mode === 'ded' && s.tracks.editor.cr.st === 'ok',
  init(s, d) {
    const cr = s.tracks.editor.cr;
    d.n = SC[U.pick(['bully', 'attitude', 'oldpost', 'backad', 'rumor'])].n;
    cr.fake = U.chance(0.3); cr.st = 'down'; cr.left = U.int(3, 8); cr.scN = d.n;
    d.drop = cr.fake ? U.fl(0.1, 0.2) : U.fl(0.3, 0.7);
    d.before = cr.subs; cr.subs = Math.round(cr.subs * (1 - d.drop));
  },
  text: (s, d) => { const cr = s.tracks.editor.cr; return `${josa(creatorName(s, cr), "이가")} ${d.n}에 휘말렸다. 「${cr.ch}」 구독자가 ${fmtFans(d.before)}에서 ${fmtFans(cr.subs)}으로 줄었고, 영상 업로드가 멈췄다.\n\n편집할 영상이 거의 없다. 방송이 다시 시작될 때까지 월급도 크게 줄어든다.`; },
  ch: (s, d) => [
    { t: '곁에 남는다', f: s => { const c = s.people[s.tracks.editor.cr.id]; if (c) aff(c, 12); return `${creatorName(s, s.tracks.editor.cr)} 곁에 남기로 했다.`; } },
    { t: '전담 계약을 끝낸다', f: s => endDed(s, s.tracks.editor, '방송인 논란') + ' 이제 프리랜서로 일한다.' },
  ],
});
// 방송인이 돌아오거나, 채널을 접는다
E({
  id: 'ded_back', cat: '논란', title: '방송인의 복귀', tag: 'career',
  cond: s => trackOn(s, 'editor') && s.tracks.editor.mode === 'ded' && s.tracks.editor.cr.st === 'down',
  init(s, d) {
    const t = s.tracks.editor, cr = t.cr;
    d.kind = cr.fake ? 'clear' : U.chance(0.55) ? 'back' : 'quit';
    if (d.kind === 'clear') { cr.st = 'ok'; cr.appeal += 2; cr.subs = Math.round(cr.subs * 1.15); }
    else if (d.kind === 'back') { cr.st = 'ok'; cr.appeal -= 6; }
    d.ch = cr.ch; d.who = creatorName(s, cr);
  },
  text: (s, d) => d.kind === 'clear' ? `${d.who}의 ${josa(s.tracks.editor.cr.scN, "이가")} 사실이 아닌 것으로 밝혀졌다. 「${d.ch}」 방송이 다시 시작됐고, 응원하는 구독자들이 돌아오고 있다.` : d.kind === 'back' ? `${josa(d.who, "이가")} 사과 영상을 올리고 「${d.ch}」 방송을 다시 시작했다. 예전만큼은 아니지만 편집할 영상이 다시 들어온다.` : `${josa(d.who, "이가")} 「${d.ch}」 채널을 접기로 했다. 전담 계약도 여기서 끝난다.`,
  ch: (s, d) => [{ t: '확인', f: s => d.kind === 'quit' ? endDed(s, s.tracks.editor, '채널 폐쇄') + ' 이제 프리랜서로 일한다.' : `「${d.ch}」 편집을 다시 시작했다.` }],
});

// ════════ 모델 ════════
// 화보·광고 촬영·패션쇼를 한다. 외모와 운동신경(재능), 카메라 앞 연기(특기)로 결과가 정해진다
// 어릴수록 일이 많고, 서른이 넘으면 일감이 줄어든다
// v95: 외모 · 운동신경(강함), 연기(보통)
function modelScore(s, p = me(s)) { return jobMix([[p.tal.looks, JS_], [p.tal.athletic, JS_], [lv(p, 'acting'), JM_]]); }
const MODEL_TIERS = ['신인 모델', '피팅 모델', '광고 모델', '화보 모델', '런웨이 모델', '표지 모델', '톱모델'];
// 등급마다 일의 크기 (출연료·일감 확률에 곱한다. 예전 5단계의 0~4 눈금)
const MODEL_POW = [0, 0.5, 1, 2, 3, 3.5, 4];
// 등급 문턱: pts 잘 나온 일 점수, fans 필요한 팬, star 톱모델이 되는 스타성
// (2026-11-07 팬이 두 번 더해지던 것을 고친 뒤 다시 맞춤: 66이면 톱모델 7.2%, 74면 3.4% / 300명)
const MODEL_UP = { pts: [0, 4, 10, 18, 34, 50, 73], fans: [0, 0, 0, 0, 0, 5e4, 1e5], star: 50 };
// fit: 그 일에서 더 보는 것 (v97, 8-4 사용자 표 · fitB)
const MODEL_JOBS = [
  { id: 'fit', n: '쇼핑몰 피팅', min: 0, fee: 40, fame: 0.1, demand: 30, by: 'fas', fit: ['looks'] },
  { id: 'photo', n: '잡지 화보', min: 2, fee: 150, fame: 0.4, demand: 40, by: 'mag', fit: ['express'] },
  { id: 'cf', n: '광고 촬영', min: 1, fee: 400, fame: 0.6, demand: 45, by: 'any', fit: ['acting'] },
  { id: 'show', n: '패션쇼 런웨이', min: 3, fee: 300, fame: 0.8, demand: 50, by: 'fas', fit: ['athletic', 'express'] },
  { id: 'cover', n: '패션지 표지', min: 4, fee: 800, fame: 1.2, demand: 58, by: 'mag', fit: ['looks', 'express'] },
];
// 화보·표지를 맡기는 잡지
// 잡지 (10-8, v115: 6곳 → 18곳)
const MAGS = ['모드 매거진', '시크 위클리', '캔버스 매거진', '더 무드', '루크북 코리아', '스냅 매거진', '룩앤필', '스크랩 노트', '보야지 매거진', '라이크 매거진', '오롯 매거진', '렌즈 매거진',
  '아웃핏 저널', '시즌 매거진', '핀보드', '컬러 칩', '하이라이트 매거진', '뮤즈 매거진'];
function modelClient(j) { return j.by === 'mag' ? U.pick(MAGS) : U.pick(BRANDS.filter(b => j.by === 'any' || b.cat === '패션')).n; }
function modelAgencies() { return AGENCIES.filter(a => a.kind === 'model'); }
function modelAgeAdj(a) { return a < 19 ? 2 : a < 26 ? 4 : a < 30 ? 0 : a < 35 ? -5 : -10; }
function startModel(s, o = {}) {
  const old = s.tracks.model, ag = o.ag ? AG[o.ag] : null;
  s.tracks.model = { st: 'active', ag: o.ag || null, agN: ag ? ag.n : '', cut: o.cut != null ? o.cut : ag ? ag.cut : 0, contract: ag ? (o.months || 36) : 0, months: 0, tier: old.tier || 0, pts: old.pts || 0, jobs: old.jobs || 0, sn: old.sn, hist: old.hist || [] };
  if (!old.jobs && !(old.hist || []).length) milestone(s, `${age(s)}세에 모델 일을 시작했다.`);
  return ag ? `${josa(ag.n, '과와')} 모델 계약을 했다. (${yrs(s.tracks.model.contract)} · 회사 몫 ${pctN(s.tracks.model.cut)})` : '프리랜서 모델로 일을 시작했다. 일정에 모델 활동을 넣어야 일감이 들어온다.';
}
function modelBlock(s) { return s.army ? '군 복무 중' : s.tracks.idol.st === 'trainee' ? '연습생은 회사 허락 없이 따로 활동할 수 없다' : ''; }
CAREERS.model = {
  n: '모델', ic: '📸',
  desc: '화보·광고 촬영·패션쇼를 한다. 외모와 운동신경, 카메라 앞 연기가 중요하다. 어릴수록 일이 많다.',
  act: { n: '모델 활동 (촬영·피팅·워킹)', ic: '📸', g: '직업 활동', eff: [['연기', '↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) { return t.st !== 'active' ? (t.endNote || '') : `${MODEL_TIERS[t.tier]} · ${t.agN ? t.agN + ' 소속' : '프리랜서'} · 한 일 ${t.jobs}건`; },
  short(s, t) { return `모델 ${actName(s, 'model')}`; },
  seg(s, t) { return `${t.agN ? t.agN + ' 소속' : '프리랜서'} 모델`; },
  title(s, t) { return t.jobs ? MODEL_TIERS[t.tier] : null; },
  contract(s, t) { return t.st === 'active' && t.ag ? t.agN : ''; },
  cLeft(s, t) { return t.st === 'active' && t.ag ? t.contract - t.months : null; },
  mainSk() { return 'acting'; },
  info(s, t) { return [['소속', t.agN ? `${t.agN} (${TIER_N[AG[t.ag].tier]} 모델 에이전시) · 회사 몫 ${pctN(t.cut)}` : '프리랜서'], ['등급', MODEL_TIERS[t.tier]], ['한 일', `${t.jobs}건`]]; },
  actions(s, t) {
    if (t.st !== 'active') return [];
    if (t.ag) { const pen = Math.max(500e4, Math.max(0, t.contract - t.months) * 30e4 * AG[t.ag].tier); return [{ t: '에이전시와 계약 해지', h: `계약이 ${Math.max(0, t.contract - t.months)}개월 남았다 · 위약금 ${fmtWon(pen)} · 해지하면 프리랜서로 활동한다`, ok: true, danger: true, confirm: `${josa(t.agN, '과와')}의 계약을 해지할까요? 위약금 ${fmtWon(pen)}을 물어야 해요.`, run: s => { s.debt += pen; t.hist.push(`${t.agN} (계약 해지)`); t.ag = null; t.agN = ''; t.cut = 0; t.contract = 0; return '모델 에이전시와의 계약을 해지했다. 이제 프리랜서로 활동한다.'; } }]; }
    return [{ t: '모델 일 그만두기', ok: true, danger: true, confirm: '정말 모델 일을 그만둘까요?', run: s => { t.st = 'ended'; t.endNote = `${MODEL_TIERS[t.tier]}, 한 일 ${t.jobs}건`; t.hist.push(t.endNote); return '모델 일을 그만뒀다.'; } }];
  },
  monthly(s, t) {
    if (t.st !== 'active') return;
    t.months++;
    if (t.ag && t.months >= t.contract) queueEv(s, 'model_contract', 0);
    const n = slotsOn(s, 'c_model'), p = me(s);
    if (n) { practice(s, p, 'acting', 0.8 * n); addStress(s, 1.5); }
    if (!n && !t.ag) return;
    // 나이가 들수록 일감이 준다. 에이전시가 있으면 일정에 넣지 않아도 가끔 일을 잡아 준다
    const chance = stigmaMul(s) * (0.25 + MODEL_POW[t.tier] * 0.04 + (t.ag ? 0.08 : 0)) * (n ? 1 : 0.4) * Math.max(0.2, 1 + modelAgeAdj(age(s)) / 15) * access(s);
    if (!hasQ(s, 'model_job') && U.chance(chance)) queueEv(s, 'model_job', 0);
  },
};
// v207: 회사 특징 (CO_FOCUS.model). 뷰티 에이전시는 여성 모델 위주로 계약한다
function modelAudP(s, ag) { const p = audP(coFocus(s, 'model', ag.con, modelScore(s)) + modelAgeAdj(age(s)) + pm(s, 'audition', 0), ag.thr); return ag.con === '뷰티' && me(s).g !== '여' ? p * 0.25 : p; }
for (const ag of modelAgencies()) JOB_APPLY.push({
  id: 'model_' + ag.id, trk: 'model', g: '📸 모델', get n() { return `${ag.n} 모델 오디션`; }, get tag() { return agTag(ag); },
  show: s => !(trackOn(s, 'model') && s.tracks.model.ag) && age(s) >= 14 && age(s) <= 32,
  h: s => `합격 가능성 ${fmtPct(modelAudP(s, ag))} · 결과는 다음 달`,
  ok: s => !modelBlock(s) && !agencyContract(s) && !(s.cd['maud_' + ag.id] > s.t) && !hasQ(s, 'model_aud'),
  why: s => modelBlock(s) || contractWhy(s) || (s.cd['maud_' + ag.id] > s.t ? '같은 회사는 1년 뒤에 다시 볼 수 있다' : '다른 오디션 결과를 기다리는 중'),
  run: s => { const p = modelAudP(s, ag); s.cd['maud_' + ag.id] = s.t + 12; queueEv(s, 'model_aud', 1, { ag: ag.id, p }); return `${ag.n} 모델 오디션을 봤다.`; },
});
JOB_APPLY.push({
  id: 'model_free', trk: 'model', g: '📸 모델', n: '프리랜서 모델로 시작하기',
  show: s => !trackOn(s, 'model'),
  h: s => '쇼핑몰 피팅부터 시작한다 · 일정에 모델 활동을 넣어야 일감이 들어온다',
  ok: s => !modelBlock(s) && !artistContract(s) && age(s) >= 16 && modelScore(s) >= 32,
  why: s => modelBlock(s) || artistContractWhy(s) || (age(s) < 16 ? '16세부터 할 수 있다' : '모델로 일하기엔 아직 부족하다'),
  run: s => startModel(s, {}),
});
NEGO.model = {
  what: d => '모델 전속 계약이다. 에이전시가 촬영과 쇼를 잡아 준다.',
  block: s => agencyContract(s) ? contractWhy(s) : '',
  sign: (s, d) => startModel(s, { ag: d.ag, months: d.months, cut: d.cut }),
  refuse: (s, d) => `${d.agN}의 모델 계약 제안을 거절했다.`,
};
E({
  id: 'model_aud', cat: '오디션', title: '모델 오디션 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); },
  text: (s, d) => d.pass ? `${AG[d.ag].n}에서 계약하자는 연락이 왔다!` : `${AG[d.ag].n}에서 연락이 오지 않았다. 불합격이다.`,
  ch: (s, d) => d.pass ? [
    { t: '계약서를 받아 본다', ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '정산 비율과 계약 기간을 협상할 수 있다', f: s => startNego(s, { kind: 'model', ag: d.ag, agN: AG[d.ag].n, months: 36 + coLongC(AG[d.ag]), cut: AG[d.ag].cut, lev: U.clamp((d.p - 0.5) * 0.8 + 0.3, 0.05, 0.8) }) },
    { t: '거절한다', f: () => `${AG[d.ag].n}의 계약 제안을 거절했다.` },
  ] : [{ t: '다시 준비한다', f: s => `${AG[d.ag].n} 모델 오디션에 떨어졌다.` + fx(s, { stress: 3 * pm(s, 'loseStress') }) }],
});
E({
  id: 'model_contract', cat: '계약', title: '모델 계약 만료', tag: 'career',
  cond: s => trackOn(s, 'model') && !!s.tracks.model.ag,
  text: s => { const t = s.tracks.model; return `${josa(t.agN, '과와')}의 계약이 끝났다. ${MODEL_TIERS[t.tier]}, 한 일 ${t.jobs}건.${age(s) >= 30 ? ' 나이가 있어서 에이전시도 재계약을 망설이는 눈치다.' : ''}`; },
  ch: s => { const t = s.tracks.model, p = age(s) < 30 ? 1 : Math.max(0.15, 1 - (age(s) - 29) * 0.15); return [
    { t: `${josa(t.agN, '과와')} 재계약`, h: `3년${p < 1 ? ` · 받아 줄 가능성 ${fmtPct(p)}` : ''}`, f: s => { if (!U.chance(p)) { t.hist.push(`${t.agN} (재계약 불발)`); t.ag = null; t.agN = ''; t.cut = 0; t.contract = 0; return '에이전시가 재계약을 거절했다. 이제 프리랜서로 활동한다.' + fx(s, { stress: 5 }); } t.months = 0; t.contract = 36; return `${josa(t.agN, '과와')} 재계약했다.`; } },
    { t: '에이전시를 나와 프리랜서로 활동한다', f: s => { t.hist.push(`${t.agN} (계약 만료)`); t.ag = null; t.agN = ''; t.cut = 0; t.contract = 0; return '에이전시를 나와 프리랜서로 일하기로 했다.'; } },
  ]; },
});
// 일감 두세 개 중 하나를 맡는다. 등급이 오를수록 큰 일이 들어온다
E({
  id: 'model_job', cat: '모델 일감', title: '촬영 제안', tag: 'career',
  cond: s => trackOn(s, 'model'),
  init(s, d) {
    const t = s.tracks.model, can = MODEL_JOBS.filter(j => j.min <= t.tier);
    d.js = U.shuffle(can).slice(0, Math.min(3, can.length)).map(j => {
      const pp = U.clamp(U.sig((modelScore(s) + fitB(me(s), j.fit) + modelAgeAdj(age(s)) + MODEL_POW[t.tier] * 3 - j.demand) / 6), 0.05, 0.95);
      return { id: j.id, n: j.n, min: j.min, brand: modelClient(j), fee: Math.round(j.fee * (1 + MODEL_POW[t.tier] * 0.6) * U.fl(0.8, 1.2)) * 1e4, p: pp, fame: j.fame };
    });
  },
  text: s => `일감이 들어왔다. 하나를 맡을 수 있다.\n\n'${MODEL_TIERS[s.tracks.model.tier]}' · 연기 ${lvi(me(s), 'acting')}레벨`,
  ch: (s, d) => d.js.map(j => ({ t: `${j.brand} · ${j.n}`, h: `${fmtWon(Math.round(j.fee * (1 - s.tracks.model.cut)))} · 잘 나올 가능성 ${fmtPct(j.p)}`, f: s => {
    const t = s.tracks.model, good = U.chance(j.p), big = bigRoll(good, j.p), pay = Math.round(j.fee * (1 - t.cut));
    earn(s, pay, '모델 출연료'); t.jobs++;
    // (예전엔 팬이 두 번 더해졌다: 같은 양을 한 번에 더한다)
    const gain = big < 0 ? -Math.round(s.fans.kr * 0.02) : 2 * Math.max(0, fanGain(s, good ? 56 + MODEL_POW[t.tier] * 3 : 42, 'kr', j.fame)) * (big > 0 ? 3 : 1);
    const fxt = fx(s, { fkr: gain, jp: { model: big > 0 ? 4 : big < 0 ? -3 : 0 }, fame: big > 0 ? 2 : 0, stress: big < 0 ? 5 : 2 });
    if (good && j.min >= Math.min(4, t.tier) - 1) t.pts += (j.fame >= 0.8 ? 2 : 1) + (big > 0 ? 1 : 0);
    const MU = MODEL_UP;
    let up = false;
    while (t.tier < 6 && t.pts >= MU.pts[t.tier + 1] && totalFans(s) >= MU.fans[t.tier + 1] && (t.tier < 5 || me(s).tal.star >= MU.star)) { t.tier++; up = true; }
    addWork(s, { type: '모델', pay, title: `${j.brand} ${j.n}`, by: MODEL_TIERS[t.tier], sc: big > 0 ? 85 : good ? 70 : big < 0 ? 30 : 45, note: big > 0 ? '화제가 됐다' : good ? '반응이 좋았다' : big < 0 ? '혹평' : '무난' });
    if (up && t.tier >= 4) milestone(s, `${age(s)}세에 ${josa(MODEL_TIERS[t.tier], '이가')} 되었다.`);
    // 패션쇼는 사진이 아니라 워킹 이야기로 (v140)
    const show = j.id === 'show';
    const how = show ? (big > 0 ? '워킹이 크게 화제가 됐다. 쇼가 끝나고도 내 이름이 오르내렸다.' : good ? '워킹이 좋았다는 말을 들었다.' : big < 0 ? '런웨이에서 휘청해 혹평이 돌았다. 브랜드 쪽 표정이 좋지 않았다.' : '무난하게 끝났다.')
      : big > 0 ? '사진이 크게 화제가 됐다. 여기저기서 내 사진을 퍼 갔다.' : good ? '사진이 잘 나와 반응이 좋았다.' : big < 0 ? '사진이 어색하다는 혹평이 돌았다. 브랜드 쪽 표정이 좋지 않았다.' : '무난하게 끝났다.';
    // 실시간 창 (12-3): 런웨이. '중요할 때만'에서는 첫 패션쇼 · 화제나 혹평이 된 쇼 · 등급이 오른 쇼만
    let live = null;
    if (show) {
      const first = !t.shows; t.shows = (t.shows || 0) + 1;
      const tal = me(s).tal, nm = actName(s, 'model');
      if (typeof liveStage === 'function') live = liveStage({ k: 'runway', vn: 'runway', place: '런웨이', t: `${j.brand} 패션쇼`, g: nm, mem: [[nm, '']], mi: 0, key: first || big !== 0 || up, big, sc: big > 0 ? 88 : good ? 72 : big < 0 ? 28 : 48, z: { pose: (tal.express - 50) / 15, vis: (tal.looks - 50) / 15 } });
    }
    // 결과는 결과창으로 (등급이 오르면 같이 쓴다)
    const x = `${j.brand} ${josa(j.n, '을를')} 했다. ${how}` + fxt, upT = up ? `이제 '${MODEL_TIERS[t.tier]}' 소리를 듣는다.` : '';
    return showResult(s, `${j.brand} ${j.n}`, x + (upT ? `\n\n${upT}` : ''), x + (upT ? ` ${upT}` : ''), live);
  } })).concat([{ t: '이번엔 넘긴다', f: () => '들어온 일감을 모두 거절했다.' }]),
});

// ════════ 브랜드 광고 ════════
// 브랜드마다 분야, 원하는 이미지, 브랜드 가치(1~5)가 있다. 이름이 알려지면 광고 제안이 메시지함으로 온다
// 계약 중에는 같은 분야의 다른 브랜드 광고를 못 한다. 계약 중에 이미지가 크게 나빠지면 계약이 끊기고 위약금을 물 수 있다
const BRANDS = [
  { id: 'cos1', n: '플로라 코스메틱', cat: '화장품', img: '청순', v: 4 }, { id: 'cos2', n: '데일리글로우', cat: '화장품', img: '친근', v: 2 }, { id: 'cos3', n: '오브제 뷰티', cat: '화장품', img: '고급', v: 5 },
  { id: 'drk1', n: '청량수', cat: '음료', img: '에너지', v: 2 }, { id: 'drk2', n: '모닝브루 커피', cat: '음료', img: '친근', v: 3 }, { id: 'drk3', n: '스파클링 원', cat: '음료', img: '에너지', v: 4 },
  { id: 'gam1', n: '판타지아 온라인', cat: '게임', img: '에너지', v: 2 }, { id: 'gam2', n: '브릭스톰', cat: '게임', img: '친근', v: 3 }, { id: 'gam3', n: '레전드 아레나', cat: '게임', img: '에너지', v: 4 },
  { id: 'fas1', n: '어반핏', cat: '패션', img: '친근', v: 2 }, { id: 'fas2', n: '스트릿웨이브', cat: '패션', img: '에너지', v: 3 }, { id: 'fas3', n: '메종 블랑', cat: '패션', img: '고급', v: 5 },
  { id: 'fod1', n: '바삭치킨', cat: '식품', img: '친근', v: 2 }, { id: 'fod2', n: '해피라면', cat: '식품', img: '친근', v: 3 }, { id: 'fod3', n: '들녘팜', cat: '식품', img: '신뢰', v: 3 },
  { id: 'tel1', n: '넥스트모바일', cat: '통신', img: '에너지', v: 3 }, { id: 'tel2', n: '케이넷 텔레콤', cat: '통신', img: '신뢰', v: 4 }, { id: 'tel3', n: '유니폰', cat: '통신', img: '신뢰', v: 5 },
];
const BRAND_BY = Object.fromEntries(BRANDS.map(b => [b.id, b]));
// 내 이미지가 그 브랜드가 원하는 이미지와 얼마나 맞는지 (0~100)
function imageFit(s, img) {
  const p = me(s), t = p.tal;
  if (img === '청순') return t.looks * 0.5 + t.express * 0.5;
  if (img === '친근') return lv(p, 'variety') * 0.5 + t.humor * 0.5;
  if (img === '고급') return t.looks * 0.5 + t.voice * 0.5;
  if (img === '에너지') return t.athletic * 0.5 + lv(p, 'dance') * 0.5;
  return s.rep * 0.7 + Math.min(age(s), 50) * 0.6;
}
// 인지도로 닿을 수 있는 브랜드 가치 (피드백 23: 예전 팬 1만 2, 10만 3, 50만 4, 200만 5와 같은 눈금. 논란·예능으로 화제가 되면 잠깐 더 올라간다)
function brandReach(s) { const f = s.fame || 0; return f >= 67 ? 5 : f >= 52 ? 4 : f >= 35 ? 3 : f >= 15 ? 2 : f >= 9.8 ? 1 : 0; }
// MCN 소속이면 MCN이 광고 단가를 올려 준다 (크기마다 10%씩)
function brandFee(s, b) { const f = totalFans(s) + (s.tracks.idol.st === 'active' ? groupFans(s.tracks.idol.g) * 0.2 : 0); return Math.round([0, 800, 2000, 5000, 12000, 30000][b.v] * U.clamp(Math.log10(1 + f) - 3.5, 0.2, 3) / 2 * (0.8 + imageFit(s, b.img) / 250) * (1 + (mcnOf(s) ? mcnTierT(s.tracks.youtube) * 0.1 : 0))) * 1e4; }
function brandCats(s) { return (s.brands || []).map(x => BRAND_BY[x.id].cat); }
// 이름이 알려지면 브랜드가 광고 모델을 제안한다 (이미지가 맞을수록 자주)
E({
  id: 'brand_offer_gen', cat: '제안', title: '광고 제안',
  p: s => brandReach(s) && age(s) >= 14 && (s.stigma || 0) < 30 && !s.hiatus ? 0.02 + brandReach(s) * 0.012 + (trackOn(s, 'model') ? 0.03 : 0) + (mcnOf(s) ? mcnTierT(s, s.tracks.youtube) * 0.01 : 0) : 0,
  cond: s => !s.inbox.some(m => m.kind === 'brand_offer') && !s.army && s.rep >= 30,
  init(s, d) {
    const reach = brandReach(s), have = brandCats(s);
    const pool = BRANDS.filter(b => b.v <= reach && !have.includes(b.cat));
    if (!pool.length) { d.skip = true; return; }
    const b = U.wpick(pool, x => Math.pow(imageFit(s, x.img) / 50, 2) * (1 + x.v * 0.3));
    sendMsg(s, 'brand_offer', { from: b.n, title: `${b.cat} 광고 모델 제안`, months: 3, d: { id: b.id, fee: brandFee(s, b), months: U.pick([6, 12, 12, 24]) } });
    d.skip = true;
  },
});
INBOX.brand_offer = {
  ic: '📺',
  text: (s, m) => { const b = BRAND_BY[m.d.id]; return `${b.n}(${b.cat})에서 광고 모델을 맡아 달라는 제안이 왔다. 원하는 이미지는 '${b.img}'.\n\n모델료 ${fmtWon(m.d.fee)} · 계약 ${yrs(m.d.months)} · 계약하는 동안 다른 ${b.cat} 광고는 못 한다`; },
  ch: (s, m) => { const b = BRAND_BY[m.d.id], taken = brandCats(s).includes(b.cat); return [
    { t: '계약한다', ok: s => !brandCats(s).includes(b.cat), h: taken ? `이미 다른 ${b.cat} 광고를 하고 있다` : '', f: s => { (s.brands = s.brands || []).push({ id: b.id, end: s.t + m.d.months, fee: m.d.fee }); earn(s, m.d.fee, '광고 모델료'); addWork(s, { type: '광고', pay: m.d.fee, title: `${b.n} ${b.cat} 광고`, sc: 60 + b.v * 5, note: `${yrs(m.d.months)} 계약` }); if (!s.flags.firstCF) { s.flags.firstCF = true; milestone(s, `${age(s)}세에 처음으로 ${b.n} 광고 모델이 되었다.`); } return `${b.n} 광고 모델이 되었다. (모델료 ${fmtWon(m.d.fee)})` + fx(s, { pop: 2 + b.v, fkr: Math.round(totalFans(s) * 0.01) }); } },
    { t: '거절한다', f: () => `${b.n}의 광고 제안을 거절했다.` },
  ]; },
};
// 계약이 끝난 광고는 조용히 기록만 남기고 정리한다 (매달 확인)
E({
  id: 'brand_end', fixed: true, cat: '광고',
  cond: s => (s.brands || []).some(x => x.end <= s.t),
  init(s, d) { for (const x of s.brands.filter(x => x.end <= s.t)) addLog(s, `${BRAND_BY[x.id].n} 광고 계약이 끝났다.`, 'career'); s.brands = s.brands.filter(x => x.end > s.t); d.skip = true; },
});
// 광고 계약 중에 평판이나 인기가 크게 떨어지면 브랜드가 계약을 끊는다
E({
  id: 'brand_scandal', cd: 6, cat: '광고', title: '광고 계약 해지', tag: 'career',
  p: s => (s.brands || []).length && (s.rep < 35 || jpopAvg(s) < 25) ? 0.05 : 0,
  cond: s => (s.brands || []).length > 0,
  init(s, d) { const x = U.pick(s.brands); d.id = x.id; d.pen = Math.round(x.fee * U.fl(0.3, 1) / 1e5) * 1e5; },
  text: (s, d) => `요즘 내 이미지가 나빠지자 ${BRAND_BY[d.id].n}에서 광고 계약을 끝내자는 연락이 왔다. 계약서에 따라 위약금 ${fmtWon(d.pen)}을 내야 한다고 한다.`,
  ch: (s, d) => [
    { t: '위약금을 내고 정리한다', f: s => { s.brands = s.brands.filter(x => x.id !== d.id); addMoney(s, -d.pen, '광고 위약금'); return `${BRAND_BY[d.id].n} 광고 계약이 끊겼다. 위약금 ${fmtWon(d.pen)}을 냈다.` + fx(s, { stress: 8, pop: -2 }); } },
    { t: '사과하고 계약을 지켜 달라고 부탁한다', h: '받아 줄 가능성 30%', f: s => { if (U.chance(0.3)) return `${BRAND_BY[d.id].n}에서 한 번만 지켜보기로 했다.` + fx(s, { stress: 4 }); s.brands = s.brands.filter(x => x.id !== d.id); addMoney(s, -d.pen, '광고 위약금'); return `부탁은 받아들여지지 않았다. 위약금 ${fmtWon(d.pen)}을 냈다.` + fx(s, { stress: 10, pop: -3 }); } },
  ],
});
