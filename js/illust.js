'use strict';
// ════════ 일러스트레이터 (7-3단계) ════════
// 지금은 틀만 넣는다. 자세한 일은 12단계 직업별 디테일에서 정한다
// 프리랜서로 일한다. 일정에 일러스트 작업을 넣으면 SNS에 그림을 올려 팔로워가 늘고, 의뢰가 들어오면 하나를 맡는다
// 일: 커미션 · 이모티콘 디자인 · 굿즈 일러스트 · 책 표지 · 콘티 설계 · 캐릭터 디자인 · 버츄얼 아이돌 아바타 디자인
// 일마다 숙련도가 따로 있다 (일러스트 분야 숙련도). 콘티 설계는 연출도 본다
// 팔로워가 많을수록 의뢰가 자주 오고 작업비가 오른다

const IL_TIERS = ['일러스트 지망생', '신인 일러스트레이터', '현역 일러스트레이터', '인기 일러스트레이터', '유명 일러스트레이터', '스타 일러스트레이터', '레전드 일러스트레이터'];
const IL_POW = [0, 0.5, 1, 2, 3, 3.5, 4];
// 등급: 일한 만큼 쌓이는 점수(pts)와 SNS 팔로워(IL_FOL)를 둘 다 넘어야 오른다. 맨 위는 창의력 52 이상
const IL_UP = { pts: [0, 2, 8, 20, 30, 40, 50], tal: 'creative', min: 52 };
const IL_FOL = [0, 0, 1000, 1e4, 4e4, 15e4, 50e4];
// 의뢰: min 맡을 수 있는 등급, fee 작업비(만 원, 이모티콘은 판매 수익이라 0), demand 난이도, by 맡기는 곳, pt 잘하면 받는 등급 점수
// fit: 그 일에서 더 보는 것 (v97, 8-4 사용자 표 · fitB). 아바타 디자인은 창의력을 더 크게 본다
const IL_JOBS = [
  { id: 'comm', n: '커미션', min: 0, fee: 20, demand: 24, by: 'fan', pt: 0.5, fit: ['intel'] },
  { id: 'emoji', n: '이모티콘 디자인', min: 1, fee: 0, demand: 32, by: 'store', pt: 1, fit: ['biz'] },
  { id: 'goods', n: '굿즈 일러스트', min: 1, fee: 120, demand: 34, by: 'idol', pt: 1, fit: ['biz'] },
  { id: 'cover', n: '책 표지', min: 2, fee: 200, demand: 40, by: 'book', pt: 1, fit: ['biz'] },
  { id: 'conti', n: '콘티 설계', min: 2, fee: 300, demand: 42, by: 'prod', pt: 1, fit: ['direct'] },
  { id: 'chara', n: '캐릭터 디자인', min: 3, fee: 800, demand: 50, by: 'game', pt: 2, fit: ['direct'] },
  { id: 'avatar', n: '버츄얼 아이돌 아바타 디자인', min: 3, fee: 1200, demand: 52, by: 'vt', pt: 2, fit: ['creative'] },
];
const IL_FEE_UP = 0.35;

// 작업 점수 (v95): 그림 · 창의력(모두 강함) + 그 일의 숙련도. 일마다 더 보는 것(fit)은 의뢰가 잘 나올 가능성에 더한다 (v97)
function ilScore(s, j) {
  const p = me(s);
  return jobMix([[lv(p, 'art'), JS_], [p.tal.creative, JS_]]) + (j ? aniMBonus(s, 'ilm', j.id) : 0);
}
function ilMBars(s) { return IL_JOBS.filter(j => aniMGet(s, 'ilm', j.id) >= 1).sort((a, b) => aniMGet(s, 'ilm', b.id) - aniMGet(s, 'ilm', a.id)).map(j => ({ n: j.n, v: aniMGet(s, 'ilm', j.id) })); }
function ilTierUp(s, t) { return aniTierUp(s, t, IL_UP, IL_TIERS, k => (t.fol || 0) >= IL_FOL[k]); }
// 팔로워가 닿을 수 있는 높이: 10^((커미션 점수 + 등급 + 스타성 + 12) / 16)
function ilFolTarget(s, t) { return Math.min(3e6, Math.pow(10, (ilScore(s, IL_JOBS[0]) + IL_POW[t.tier] * 2 + (me(s).tal.star - 50) * 0.1 - (s.stigma || 0) * 0.25 + 12) / 16)); }
function ilFolMul(t) { return 1 + Math.log10(1 + (t.fol || 0) / 1000) * 0.3; }
function ilStart(s) {
  const old = s.tracks.illust;
  s.tracks.illust = { st: 'active', months: 0, tier: old.tier || 0, pts: old.pts || 0, jobs: old.jobs || 0, fol: old.fol || 0, hist: old.hist || [] };
  if (!old.jobs && !(old.hist || []).length) milestone(s, `${age(s)}세에 일러스트레이터 일을 시작했다.`);
  return '일러스트레이터로 일을 시작했다. 일정에 일러스트 작업을 넣으면 SNS 팔로워가 늘고 의뢰가 들어온다.';
}
CAREERS.illust = {
  n: '일러스트레이터', ic: '🖍️',
  desc: '그림을 그려 의뢰를 받는다. 커미션, 이모티콘, 굿즈, 책 표지, 콘티, 캐릭터 디자인, 버츄얼 아이돌 아바타까지 그린다. 그림 특기가 가장 중요하다. SNS 팔로워가 많을수록 일이 많이 들어온다.',
  act: { n: '일러스트 작업 (SNS 업로드·의뢰)', ic: '🖍️', g: '직업 활동', eff: [['그림', '↑↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) { return t.st !== 'active' ? (t.endNote || '') : `${IL_TIERS[t.tier]} · 팔로워 ${fmtFans(t.fol)} · 작업 ${t.jobs}건`; },
  short() { return '일러스트레이터'; },
  seg() { return '프리랜서 일러스트레이터'; },
  title(s, t) { return t.jobs ? IL_TIERS[t.tier] : null; },
  mainSk() { return 'art'; },
  info(s, t) { return [['등급', IL_TIERS[t.tier]], ['SNS 팔로워', fmtFans(t.fol)], ['한 일', `${t.jobs}건`], { h: '일러스트 분야 숙련도', bars: ilMBars(s) }]; },
  actions(s, t) {
    if (t.st !== 'active') return [];
    return [{ t: '일러스트레이터 일 그만두기', ok: true, danger: true, confirm: '정말 일러스트레이터 일을 그만둘까요?', run: s => { t.st = 'ended'; t.endNote = `${IL_TIERS[t.tier]}, 작업 ${t.jobs}건 · 팔로워 ${fmtFans(t.fol)}`; t.hist.push(t.endNote); return '일러스트레이터 일을 그만뒀다.'; } }];
  },
  monthly(s, t) {
    if (t.st !== 'active') return;
    t.months++;
    const n = slotsOn(s, 'c_illust'), p = me(s);
    if (!n) { t.fol = Math.round(t.fol * 0.99); return; }
    practice(s, p, 'art', 1.0 * n); addStress(s, 1.5);
    // SNS에 올린 그림으로 팔로워가 는다
    const tg = ilFolTarget(s, t), before = t.fol;
    if (t.fol < tg) t.fol += Math.round((tg - t.fol) * U.fl(0.03, 0.08) + U.int(5, 30));
    const up = ilTierUp(s, t); if (up) addLog(s, up, 'good');
    s.fans.kr += Math.round(Math.max(0, t.fol - before) * 0.2 * myRoom(s, 'kr'));
    if (!hasQ(s, 'il_job') && U.chance(Math.min(0.65, (0.3 + IL_POW[t.tier] * 0.04 + Math.log10(1 + t.fol / 1000) * 0.05) * (0.7 + access(s) * 0.3) * stigmaMul(s)))) {
      // 들어온 의뢰가 하나뿐이면 창 없이 맡아서 하고 결과만 기록에 남긴다 (피드백 30)
      const js = ilOffers(s, t);
      if (js.length === 1) addRes(s, ilDoJob(s, IL_JOBS.find(y => y.id === js[0].id), js[0], true));
      else queueEv(s, 'il_job', 0, { js });
    }
  },
};
JOB_APPLY.push({
  id: 'illust_start', trk: 'illust', g: '🖍️ 일러스트레이터', n: '일러스트레이터로 시작하기',
  show: s => !trackOn(s, 'illust'),
  h: s => 'SNS에 그림을 올리며 커미션부터 받는다',
  ok: s => !s.army && age(s) >= 14 && lv(me(s), 'art') >= 20,
  why: s => s.army ? '군 복무 중' : age(s) < 14 ? '14세부터 할 수 있다' : '그림이 20레벨 이상이어야 한다',
  run: s => ilStart(s),
});

// ───── 의뢰 ─────
function ilClient(s, j) {
  const pick = L => (U.pick(L) || {}).n || '';
  if (j.by === 'fan') return '개인 의뢰인';
  if (j.by === 'store') return '메신저 이모티콘 스토어';
  if (j.by === 'idol') return pick(AGENCIES.filter(a => a.kind === 'music'));
  if (j.by === 'book') return pick(typeof cpList === 'function' ? cpList() : []) || '출판사';
  if (j.by === 'prod') return pick(PROD_COS);
  if (j.by === 'game') return U.chance(0.6) ? pick(BRANDS.filter(b => b.cat === '게임')) : pick(ANIME_COS);
  return pick(vtAgencies());
}
// 의뢰 종류마다 아이콘. 고르는 창에서 종류가 맨 앞에 오고, 큰 일이 위에 온다 (피드백 30)
const IL_IC = { comm: '✏️', emoji: '😊', goods: '🧸', cover: '📚', conti: '🎬', chara: '🎮', avatar: '🎙️' };
function ilOffers(s, t) {
  const can = IL_JOBS.filter(j => j.min <= t.tier);
  return U.shuffle(can).slice(0, Math.min(3, can.length)).sort((a, b) => b.min - a.min || b.demand - a.demand)
    .map(j => ({ id: j.id, who: ilClient(s, j), fee: j.fee ? Math.round(j.fee * (1 + IL_POW[t.tier] * IL_FEE_UP) * ilFolMul(t) * U.fl(0.8, 1.2)) * 1e4 : 0, p: ilJobP(s, j) }));
}
function ilJobP(s, j) { const t = s.tracks.illust; return U.clamp(U.sig((ilScore(s, j) + fitB(me(s), j.fit) + IL_POW[t.tier] * 3 - j.demand) / 6), 0.05, 0.95); }
E({
  id: 'il_job', cat: '일러스트 의뢰', title: '일러스트 의뢰', tag: 'career',
  cond: s => trackOn(s, 'illust'),
  init(s, d) { if (!d.js) d.js = ilOffers(s, s.tracks.illust); },
  text: s => `그림 의뢰가 들어왔다. 하나를 맡을 수 있다.\n\n'${IL_TIERS[s.tracks.illust.tier]}' · 그림 ${lvi(me(s), 'art')}레벨 · 팔로워 ${fmtFans(s.tracks.illust.fol)}`,
  ch: (s, d) => d.js.map(x => { const j = IL_JOBS.find(y => y.id === x.id); return { t: `${IL_IC[j.id] || ''} ${j.n}`, h: `${x.who} · ${x.fee ? fmtWon(x.fee) : '판매 수익'} · 분야 숙련도 ${gauge(aniMGet(s, 'ilm', j.id))} · 잘 나올 가능성 ${fmtPct(x.p)}`, f: s => ilDoJob(s, j, x) }; })
    .concat([{ t: '이번엔 넘긴다', f: () => '들어온 의뢰를 모두 거절했다.' }]),
});
function ilDoJob(s, j, x, quiet) {
  const t = s.tracks.illust, p = me(s), good = U.chance(x.p), big = bigRoll(good, x.p);
  // 이모티콘은 판매 수익: 잘 나오면 많이, 화제가 되면 훨씬 많이 팔린다
  const fee = j.id === 'emoji' ? Math.round((good ? U.int(150, 500) : U.int(20, 100)) * (1 + IL_POW[t.tier] * 0.6) * (big > 0 ? 4 : 1)) * 1e4 : x.fee;
  earn(s, fee, j.id === 'emoji' ? '이모티콘 판매 수익' : '일러스트 작업비', 'illust');
  t.jobs++; aniMGain(s, 'ilm', j.id, good ? 5 : 3); useSkill(s, p, 'art', 1.5); fitUse(s, p, j.fit);
  // 잘된 그림은 팔로워를 늘린다 (닿을 수 있는 높이의 1.5배까지)
  const tg = ilFolTarget(s, t);
  t.fol = Math.round(Math.min(Math.max(t.fol, tg * 1.5), t.fol + (good ? 50 * j.pt + Math.max(0, tg - t.fol) * 0.05 : 0) + (big > 0 ? Math.max(500, tg * 0.15) : 0)));
  const gain = big > 0 ? Math.max(0, fanGain(s, 55 + IL_POW[t.tier] * 3, 'kr', 0.2 + j.pt * 0.2)) : 0;
  const fxt = fx(s, { fkr: gain, stress: big < 0 ? 5 : 2 });
  if (good && j.min >= Math.min(4, t.tier) - 1) t.pts += j.pt + (big > 0 ? 1 : 0);
  const up = ilTierUp(s, t);
  addWork(s, { type: '일러스트', pay: fee, title: `${x.who} ${j.n}`, by: IL_TIERS[t.tier], sc: big > 0 ? 85 : good ? 70 : big < 0 ? 30 : 45, note: big > 0 ? '화제가 됐다' : good ? '반응이 좋았다' : big < 0 ? '혹평' : '무난' });
  const how = j.id === 'emoji'
    ? (big > 0 ? `이모티콘이 대박이 났다! 판매 수익 ${fmtWon(fee)}.` : good ? `이모티콘이 꾸준히 팔렸다. 판매 수익 ${fmtWon(fee)}.` : `이모티콘이 별로 안 팔렸다. 판매 수익 ${fmtWon(fee)}.`)
    : big > 0 ? '내 그림이 SNS에서 크게 퍼졌다. 팔로워가 확 늘었다.' : good ? '의뢰인이 아주 마음에 들어 했다.' : big < 0 ? '수정 요청이 쏟아졌다. 그림체가 맞지 않는다는 말을 들었다.' : '무난하게 넘겼다.';
  const r = `${x.who}의 ${josa(j.n, '을를')} 끝냈다. ${how}` + fxt;
  if (quiet) return `${x.who}의 ${josa(j.n, '을를')} 끝냈다. ${how}${j.id === 'emoji' ? '' : ` 작업비 ${fmtWon(fee)}.`}` + fxt + (up ? ` ${up}` : '');
  // 그림에 대한 반응은 커뮤니티 팝업에서
  const comm = typeof commSpec === 'function' ? commSpec(s, { k: 'illust', bd: '그림 게시판', t: `${x.who} ${j.n}`, me: actName(s, 'illust'), tn: big > 0 ? 'great' : good ? 'good' : big < 0 ? 'bad' : 'meh' }) : null;
  return showResult(s, `${x.who} ${j.n}`, r + (up ? `\n\n${up}` : ''), r + (up ? ` ${up}` : ''), null, null, comm);
}
