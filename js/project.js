'use strict';
// ───── 프로젝트 그룹 (v156, 12-4) ─────
// 같은 회사의 여러 그룹(과 솔로 가수)에서 멤버를 뽑아 새 이름으로 한 번만 활동한다: 앨범 한 장(앨범 제작 틀 그대로) → 활동 두 달 → 흩어진다
// 여기 있는 것: 내가 아이돌 멤버 · 회사 소속 솔로일 때(회사가 정하는 일이라 알림으로 온다), 버츄얼 아이돌의 회사 단체곡, 다른 직업이 만나는 프로젝트 그룹 앨범
// 내 회사가 만드는 프로젝트 그룹은 company.js (g.proj)

// ── 내가 뽑힐 때 ──
// 내 인기 · 실력이 좋을수록 잘 뽑힌다. 큰 회사일수록 자주 꾸린다. 한 번 하면 2년은 쉰다
// 아이돌은 활동기가 아니고 다음 앨범 준비 전일 때, 솔로는 다음 신곡까지 석 달 넘게 남았을 때만
const PROJ_P = 0.012;
function projTrack(s) {
  const I = s.tracks.idol, S = s.tracks.solo;
  if (I && I.st === 'active' && I.g) return 'idol';
  if (S && S.st === 'signed' && !S.withGroup) return 'solo';
  return '';
}
function projPickW(s) { const p = me(s); return U.clamp(0.4 + Math.log10(1 + totalFans(s)) / 8 + (Math.max(lv(p, 'vocal'), lv(p, 'rap'), lv(p, 'dance')) - 40) / 60 + (p.tal.star - 50) / 100, 0.3, 2); }
function projMonth(s, k, t) {
  const P = t.proj;
  // 활동 두 달 동안은 원래 일과 겹쳐 조금 더 지친다
  if (P) { if (P.rel && s.t <= P.rel + 2) addStress(s, 2); if (P.rel && s.t > P.rel + 2) { t.proj = null; addLog(s, `프로젝트 그룹 「${P.name}」 활동이 끝났다. 멤버들이 원래 자리로 돌아갔다.`, 'career'); } return; }
  const ag = AG[t.ag];
  if (!ag || s.army || s.hiatus || s.preg || hasQ(s, 'proj_call') || hasQ(s, 'proj_res')) return;
  if ((t.projT != null ? t.projT : -99) > s.t - 24 || t.months < 12) return;
  if (k === 'idol' ? t.promo > 0 || t.alb || t.nextCb < 2 : t.alb || t.nextRel < 3) return;
  // 솔로는 그룹 멤버보다 덜 뽑힌다
  if (U.chance(PROJ_P * (0.5 + ag.tier * 0.5) * projPickW(s) * (k === 'idol' ? 1 : 0.4))) queueEv(s, 'proj_call', 0, { k });
}
// 같은 회사 다른 그룹 멤버 (진짜 인물): 나보다 나이가 많으면 선배, 적으면 후배
function projMate(s, ag, name) {
  const g = newGroupName(s), a = U.clamp(age(s) + U.int(-5, 5), 16, 34), L = 28 + ag.tier * 8 + U.int(0, 18);
  const x = makeMusicMate(s, { age: a, rel: a > age(s) ? '선배' : '후배', job: `아이돌 (「${g}」)`, met: `${ag.n} 프로젝트 그룹 「${name}」`, aff: 35, tal: ['looks', 'star'], sk: { vocal: L, dance: L + U.int(-8, 8), rap: L - U.int(5, 20) } });
  x.pg = { g, f: Math.round([3e3, 3e4, 3e5][ag.tier - 1] * U.fl(0.3, 2)) };
  return x;
}
function projPpl(s, P) { return [me(s)].concat(P.mates.map(id => s.people[id]).filter(Boolean)); }
E({
  id: 'proj_call', cat: '회사 결정', title: '프로젝트 그룹', tag: 'career',
  init(s, d) {
    const t = s.tracks[d.k], ag = t && AG[t.ag];
    if (!ag || projTrack(s) !== d.k || t.proj) { d.skip = true; return; }
    d.name = newGroupName(s);
    d.mates = Array.from({ length: U.int(2, 4) }, () => projMate(s, ag, d.name).id);
    const P = [me(s)].concat(d.mates.map(id => s.people[id])), L = TRENDS.filter(c => cAgeOK(s, P, c, 1));
    d.c = U.chance(0.5) && L.includes(s.trend) ? s.trend : U.pick(L.length ? L : TRENDS);
  },
  text: (s, d) => {
    const t = s.tracks[d.k], M = d.mates.map(id => s.people[id]).filter(Boolean);
    return `${t.agN}에서 여러 그룹 멤버를 모아 프로젝트 그룹 ${josa(`「${d.name}」`, '을를')} 꾸린다. 회사가 나를 넣었다!\n\n멤버: 나${M.map(x => ` · ${x.name} (「${x.pg.g}」 ${x.rel})`).join('')}\n'${d.c}' 컨셉으로 앨범 한 장을 내고 두 달 활동한 뒤 흩어진다.\n\n그동안 ${d.k === 'idol' ? `「${t.g.name}」 컴백은` : '내 신곡은'} 석 달쯤 밀린다.`;
  },
  ch: (s, d) => [
    { t: '함께 해 본다', h: '다른 그룹 선후배와 가까워진다 · 내 팬과 원래 팬이 늘 수 있다', f: s => projJoin(s, d) },
    { t: '빠지고 싶다고 말해 본다', h: '회사가 들어줄지는 모른다', f: s => { if (U.chance(0.45)) { for (const id of d.mates) { const x = s.people[id]; if (x) delete s.people[id]; } return `회사가 이번엔 빼 주기로 했다. ${josa(`「${d.name}」`, '은는')} 다른 멤버로 꾸린다.`; } return '회사는 이미 정해진 일이라고 했다. ' + projJoin(s, d) + fx(s, { stress: 5 }); } },
  ],
});
// 참여: 회사가 앨범을 만든다 (소형은 대표, 중 · 대형은 전담 프로듀서). '자작곡 쓰기 · 가사 쓰기'도 그대로 통한다. 석 달 뒤 발매
function projJoin(s, d) {
  const t = s.tracks[d.k], ag = AG[t.ag] || { tier: t.tier || 1 }, M = d.mates.map(id => s.people[id]).filter(Boolean), PP = [me(s)].concat(M);
  const P = { name: d.name, mates: M.map(x => x.id), c: d.c, at: s.t, k: d.k };
  const who = agProd(s, t.ag, P);
  const r = albNpc(s, { tier: ag.tier, rep: agPlan(t), sig: d.c, mem: M, cs: [d.c], ok: x => cAgeOK(s, PP, x, 1), boss: who.p, bossN: who.n, anr: agAnr(s, t.ag), my: !!t.subSong && has(me(s), 'compose'), lyr: !!t.subLyr && has(me(s), 'lyric') });
  P.a = albKeep(s, r, true);
  t.proj = P; t.projT = s.t;
  if (d.k === 'idol') t.nextCb = Math.max(t.nextCb, 3) + 3; else t.nextRel = Math.max(t.nextRel, 3) + 3;
  for (const x of M) { meetAt(s, x, `프로젝트 그룹 「${d.name}」`, d.k, t.agN); bond(s, x, 3); }
  if (who.p && who.p.ind) meetAt(s, who.p, `프로젝트 그룹 「${d.name}」`, d.k);
  queueEv(s, 'proj_res', 3, { k: d.k }, true);
  return `프로젝트 그룹 「${d.name}」 활동을 시작했다. 연습실에서 처음 보는 선후배들과 합을 맞춘다.`;
}
// 한 장 성적: 멤버들의 실력 · 각자 원래 팬이 모인 만큼 · 곡. 잘되면 내 팬과 원래 그룹 팬이 늘고, 멤버들과 가까워진다
function projRelease(s, t, P) {
  const p = me(s), M = P.mates.map(id => s.people[id]).filter(Boolean), PP = [p].concat(M), ag = AG[t.ag] || { tier: t.tier || 1 }, a = P.a, k = P.k;
  const g = { name: P.name, members: M.map(x => x.id), pos: assignIdolPos(s, PP.map(x => x.id)), tw: 30, star: Math.round(PP.reduce((n, x) => n + x.tal.star, 0) / PP.length) };
  const own = k === 'idol' ? groupFans(t.g) : totalFans(s);
  const fans = Math.round(own * 0.35 + M.reduce((n, x) => n + (x.pg ? x.pg.f : 0), 0) * 0.35);
  const cf = cFit(s, P.c, PP, 2);
  const sc = songScore(s, { perf: cPerf(groupPower(s, g), cf), q: a.q, fans, tier: 0, trend: P.c === s.trend, bonus: (IDOL_TIER_B[ag.tier] || 7) + 2 + (g.star - 50) * 0.12 + cScoreB(cf) });
  const peak = chartFromScore(sc), wins = showWins(sc, fans);
  const G = Math.max(0, fanGainRaw(sc, fans, 0.6 + ag.tier * 0.25, starCap(g.star, 'kr')));
  // 내 팬: 그룹 안에서 나를 좋아하는 몫 (아이돌 앨범과 같은 식). 원래 그룹에는 프로젝트 팬의 일부가 넘어온다
  const share = U.clamp(0.3 + ((p.tal.looks * 0.4 + p.tal.star * 0.3 + Math.max(lv(p, 'vocal'), lv(p, 'rap')) * 0.15 + lv(p, 'dance') * 0.15) - 45) / 80, 0.12, 0.85) * 3 / PP.length;
  const my = Math.round(G * share * myRoom(s, 'kr')), spill = k === 'idol' ? Math.round(G * 0.3) : 0;
  s.fans.kr += my;
  if (spill) t.g.f.kr = U.clamp(t.g.f.kr + spill, 0, FANCAP.kr);
  const albums = Math.round(fans * U.fl(0.2, 0.35) * 1.5);
  const rev = albums * 14000 + (peak ? (101 - peak) * 300e4 : 0);
  const pay = k === 'idol' ? memberIncome(s, t, rev, '프로젝트 앨범 정산', PP.length) : Math.round(rev * (1 - (t.cut || 0.5)) / PP.length);
  if (k !== 'idol' && pay > 0) earn(s, pay, '프로젝트 앨범 정산', k);
  const wrote = albRoyalty(s, a, sc, k).txt;
  for (const x of M) { bond(s, x, sc >= 65 ? 6 : 3); x.pg.f = Math.round(x.pg.f + G * 0.15); }
  cmGain(s, P.c, 3);
  const F = [{ z: (groupPower(s, g) - 45) / 18, g: ['처음 모인 멤버들인데 합이 좋다', '각 그룹 에이스가 모인 무대답다'], b: ['급하게 모인 티가 난다', '멤버끼리 아직 어색하다'] }, RX.q(a.q), RX.fans(fans, G), RX.trend(P.c === s.trend), RX.cf(cScoreB(cf)), { z: (g.star - 50) / 25, g: ['멤버들 얼굴이 화면을 꽉 채운다'], b: ['눈에 확 띄는 멤버가 없다'] }];
  const card = songCardMake({ t: a.title, by: P.name, peak, wins, fans: [['프로젝트 팬', G], ['내 팬', my]].concat(spill ? [[`「${t.g.name}」 팬`, spill]] : []), pay }, F, sc, P);
  if (a.mk) card.mk = a.mk;
  if (typeof liveStage === 'function') card.live = liveStage({ k: 'idol', place: '음악방송', t: a.title, g: P.name, fd: '', c: P.c, cos: 'project', sx: liveSx(PP), mem: PP.map(x => [x.id === s.me ? actCall(s, k) : callName(x.name), (g.pos[x.id] || '').split(' · ')[0]]), mi: 0,
    z: { perf: F[0].z, q: F[1].z, fans: F[2].z, trend: F[3].z, tw: -0.4, cf: F[4].z, star: F[5].z, me: (Math.max(lv(p, 'vocal'), lv(p, 'rap'), lv(p, 'dance')) * 0.6 + p.tal.star * 0.4 - 45) / 18 }, sc, wins, cand: sc >= 66, debut: false, key: true, rv: sc >= 66 && !wins && typeof npcStageRival === 'function' ? npcStageRival(s, P.name) : '' });
  addWork(s, { type: '프로젝트 앨범', title: a.title, by: P.name, sc, pay, note: chartText(peak) + (wins ? ` · 음악방송 1위 ${wins}회` : ''), card });
  (t.projs = t.projs || []).push({ name: P.name, y: calY(s), sc: Math.round(sc), peak });
  P.rel = s.t;
  return { sc, peak, wins, G, my, spill, pay, wrote, card, albums };
}
E({
  id: 'proj_res', cat: '앨범 성적', title: '프로젝트 그룹 성적표', tag: 'career', keepPop: true,
  plio: (s, d) => typeof plioSong === 'function' ? plioSong(s, d, d.k) : null,
  live: (s, d) => d.card && d.card.live,
  init(s, d) { const t = s.tracks[d.k], P = t && t.proj; if (!P || !P.a || P.rel) { d.skip = true; return; } d.r = projRelease(s, t, P); d.card = d.r.card; d.name = P.name; d.title = P.a.title; d.c = P.c; d.mates = P.mates.slice(); },
  // v172 시안: 결과 창을 인터넷 기사로 (ui.js newsEvHTML). 숫자는 토스트로
  html: (s, d) => d.card && typeof newsEvHTML === 'function' ? newsEvHTML(s, d, EVENTS.proj_res.news(s, d)) : '',
  news(s, d) {
    const r = d.r, M = d.mates.map(id => s.people[id]).filter(Boolean), A = `프로젝트 그룹 ${d.name}`, ts = [];
    if (r.my) ts.push(['⭐', `내 팬 ${sgnFans(r.my)}`, r.my >= 0 ? 'g' : 'b']);
    if (r.spill && s.tracks.idol && s.tracks.idol.g) ts.push(['💜', `${s.tracks.idol.g.name} 팬 ${sgnFans(r.spill)}`, 'g']);
    if (r.wrote) ts.push(['✍️', r.wrote, 'g']);
    if (r.pay > 0) ts.push(['💰', `정산금 +${fmtWon(r.pay)}`, 'g']);
    if (M.length) ts.push(['🤝', `${josa(M.map(x => x.name).join(' · '), '과와')} 많이 가까워졌다`, 'g']);
    return { who: A, what: '앨범 타이틀곡', t: d.title, c: d.c, peak: r.peak, wins: r.wins, show: true, albums: r.albums, sc: r.sc,
      end: `${josa(A, '은는')} 두 달 동안 활동한 뒤 흩어진다.`, pl: typeof plioSong === 'function' ? plioSong(s, d, d.k) : null, ts };
  },
  text: (s, d) => { const M = d.mates.map(id => s.people[id]).filter(Boolean); return `프로젝트 그룹 「${d.name}」 「${d.title}」 ('${d.c}' 컨셉)\n\n앨범 ${d.r.albums.toLocaleString()}장 · 내 팬 ${sgnFans(d.r.my)}${d.r.spill ? ` · 「${s.tracks.idol.g.name}」 팬 ${sgnFans(d.r.spill)}` : ''}${d.r.wrote ? `\n\n${d.r.wrote}` : ''}\n\n두 달 활동한 뒤 흩어진다. ${M.length ? `${josa(M.map(x => x.name).join(' · '), '과와')} 많이 가까워졌다.` : ''}`; },
  ch: (s, d) => [{ t: '확인', f: () => `프로젝트 그룹 「${d.name}」 「${d.title}」 ${chartText(d.r.peak)}.` }],
});
// 직업 창 한 줄: 지금 하는 프로젝트 그룹, 또는 지난 프로젝트 그룹들
function projInfoRow(s, t) {
  const P = t.proj;
  if (P) return ['프로젝트 그룹', `「${P.name}」 · ${P.rel ? '활동 중' : '앨범 준비 중'} · ${projPpl(s, P).slice(1).map(x => x.name).join(' · ')}`];
  return (t.projs || []).length ? ['프로젝트 그룹', t.projs.map(x => `「${x.name}」 ${x.y}`).join(' · ')] : null;
}

// ── 버츄얼 아이돌: 회사 단체곡 ──
// 개인 오리지널 곡과 따로 1~2년에 한 번쯤: 동기 전원(가끔 선배까지)이 같이 부른다. 동기 · 선배와 가까워지고 구독자가 조금 는다
function viUnitMonth(s, t) {
  if (t.months < 12 || t.alb || hasQ(s, 'vi_song') || hasQ(s, 'vi_unit') || t.unit) return;
  if (t.unitT == null) { t.unitT = s.t + U.int(6, 18); return; }
  if (t.unitT > s.t) return;
  const ag = viAgOf(t), all = U.chance(0.35) && viSeniors(s, t).length, P = [me(s)].concat(viMates(s, t), all ? viSeniors(s, t).slice(0, 4) : []);
  const L = TRENDS.filter(x => cAgeOK(s, P, x, 1)), c = U.chance(0.5) && L.includes(s.trend) ? s.trend : U.pick(L.length ? L : TRENDS);
  const r = albNpc(s, { tier: ag.tier || 1, rep: ag.plan != null ? ag.plan : 50, sig: null, mem: [], cs: [c], ok: x => cAgeOK(s, P, x, 1), boss: { sd: 8 }, bossN: t.corpN || '회사', anr: { sd: 8 }, anrN: 'A&R팀', out: 0.3 });
  t.unit = { a: albKeep(s, r, true), all: !!all, ids: P.slice(1).map(x => x.id), c };
  queueEv(s, 'vi_unit', 3, {}, true);
  addLog(s, `${t.corpN}에서 ${all ? '회사 전체' : `${t.gen}기 동기`} 단체곡 제작에 들어갔다. ('${c}' 컨셉)`, 'career');
}
E({
  id: 'vi_unit', cat: '회사 결정', title: '단체곡 발매', tag: 'career',
  cond: s => viOn(s) && viT(s).st === 'active',
  init(s, d) {
    const t = viT(s), U0 = t.unit; if (!U0) { d.skip = true; return; }
    const p = me(s), X = U0.ids.map(id => s.people[id]).filter(x => x && x.vi), subs = t.subs + X.reduce((n, x) => n + x.vi.subs, 0);
    d.title = U0.a.title; d.all = U0.all; d.c = U0.c; d.ids = X.map(x => x.id); d.mk = U0.a.mk;
    d.sc = U.clamp(lv(p, 'vocal') * 0.3 + X.reduce((n, x) => n + lv(x, 'vocal'), 0) / Math.max(1, X.length) * 0.2 + U0.a.q * 0.35 + Math.log10(1 + subs) * 3.2 + U.normal(0, 6) + 4, 0, 100);
    // 곡이 묻혀도 같이 부른 사람들의 구독자가 조금은 넘어온다
    d.gain = Math.round(Math.max(0, fanGainRaw(d.sc, t.subs, 0.5)) * 0.35 + X.reduce((n, x) => n + x.vi.subs, 0) * U.fl(0.002, 0.006));
    t.unit = null; t.unitT = s.t + U.int(12, 24);
  },
  html: (s, d) => d.mk ? `<div class="m-text">${rich(EVENTS.vi_unit.text(s, d))}</div>` + albBannerHTML(d.mk) : '',
  text: (s, d) => { const t = viT(s), X = d.ids.map(id => s.people[id]).filter(Boolean); return `${t.corpN} ${d.all ? '소속 버츄얼 아이돌' : `${t.gen}기 동기`} 단체곡 ${josa(`「${d.title}」`, '이가')} 나왔다. 함께 부른 사람: 나 · ${X.map(viName).join(' · ')}\n\n${chartText(chartFromScore(d.sc))} · 구독자 ${sgnFans(d.gain)}\n반응: ${comments(d.sc, t.sn && t.sn.nick)}`; },
  ch: (s, d) => [{ t: '확인', f: s => { const t = viT(s); t.subs += d.gain; for (const id of d.ids) { const x = s.people[id]; if (x && x.vi) { bond(s, x, 3); x.vi.subs = Math.round(x.vi.subs * 1.03); } } jpopWork(s, 'vidol', d.sc); addCatalog(s, d.title, '가창', d.sc, 0.12, 'vidol'); addWork(s, { type: '단체곡', title: d.title, by: t.corpN, sc: d.sc, note: chartText(chartFromScore(d.sc)) }); useSkill(s, me(s), 'vocal', 1); return `단체곡 「${d.title}」 발매. ${chartText(chartFromScore(d.sc))}.`; } }],
});

// ── 다른 직업이 만나는 프로젝트 그룹 앨범 ──
// 프로듀서 의뢰 · A&R 심사 · 작곡가 공모의 가수가 가끔 프로젝트 그룹이다 (여러 그룹에서 모인 멤버들)
const PROJ_ART_P = 0.08;
function projArtist(s, a, p) { if (!U.chance(p != null ? p : PROJ_ART_P)) return a; return Object.assign(a, { name: newGroupName(s), kind: '프로젝트 그룹' }); }
