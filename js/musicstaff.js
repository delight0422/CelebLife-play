'use strict';
// 음악 쪽 스태프: 작곡가, 작사가, 프로듀서, A&R 담당자, 트레이너(보컬·랩·악기·댄스. 댄스 트레이너는 안무도 짠다)
// 곡 채택·프로듀싱·세션·안무 같은 일감은 메시지함으로 온다

// ════════ 작곡가 · 작사가 ════════
const W_TIERS = ['지망생', '신인 작가', '현역 작가', '이름 있는 작가', '히트메이커', '스타 작가', '레전드'];
// 등급: 히트곡(차트 20위 안)이 쌓여 오른다. 1칸은 곡이 한 번이라도 채택되면. 레전드는 상위 4% 정도
// 레전드 재능 조건 (v99, 8-5): 작곡가 음감 52, 작사가 예술 감각 52 (s를 넘길 때만 본다)
const W_UP = { hits: [0, 0, 4, 10, 16, 24], top: { composer: 33, lyricist: 33 }, tal: { composer: 'music', lyricist: 'aesth' }, min: 52 };
const TEAMS = ['모노톤 사운드', '그루브노트 팩토리', '세시반 크루', '레몬트리 스튜디오', '스카이라인 뮤직랩'];
function wTier(t, kind, s) { const h = t.hits || 0; if (h >= (W_UP.top[kind] || 35) && (!s || !W_UP.tal[kind] || me(s).tal[W_UP.tal[kind]] >= W_UP.min)) return 6; for (let k = 5; k >= 2; k--) if (h >= W_UP.hits[k]) return k; return t.songs > 0 ? 1 : 0; }
function wKey(kind) { return kind === 'composer' ? 'compose' : 'lyric'; }
function wN(kind) { return kind === 'composer' ? '작곡가' : '작사가'; }
function wJob(kind) { return kind === 'composer' ? '작곡' : '작사'; }
// o (v155 작곡가 공모): 뽑힌 공모의 가수 · 회사 · 타이틀 여부 · 컨셉 · 낸 곡 완성도
function sendAdopt(s, kind, t, o) {
  o = o || {};
  const a = o.a || makeArtist(s, t.rep), p = me(s);
  const ag = (o.ag && AG[o.ag]) || U.pick(musicAgencies().filter(x => x.tier === a.tier && x.mkt === 'kr')) || U.pick(musicAgencies());
  const anr = (o.anr && s.people[o.anr]) || U.pick(coTeamPeople(s, ag.id + '#anr'));
  const mkt = o.a ? 'kr' : lv(p, 'jp') >= 20 && U.chance(0.2) ? 'jp' : lv(p, 'en') >= 20 && U.chance(0.15) ? 'us' : 'kr';
  const main = o.main != null ? o.main : t.best >= 45 && U.chance(0.4);
  const fee = Math.round((kind === 'composer' ? [150, 400, 800] : [80, 150, 300])[a.tier - 1] * 1e4 * (1 + t.rep / 50) * (main ? 1.5 : 1));
  const title = mkt === 'kr' ? songTitle() : songTitleEn();
  // 작곡가는 내가 정한 컨셉으로 쓴 곡이 팔리고, 작사가는 남이 쓴 곡(컨셉은 그때그때)에 가사를 붙인다
  const c = o.c || (kind === 'composer' && t.cc ? t.cc : U.chance(0.4) ? s.trend : U.pick(TRENDS));
  sendMsg(s, 'w_adopt', { from: `${ag.n} A&R ${anr.name}`, title: `${wJob(kind)} 곡 채택 제안`, months: 6, d: { kind, a, mkt, title, main, fee, anr: anr.id, q: o.q != null ? o.q : t.best, c, sub: o.a ? (o.name ? 'name' : 'open') : '' } });
}
// ───── 작곡가의 공모 · 지명 의뢰 (v155, 앨범 제작 틀 album.js) ─────
// 기획사 앨범 공모에 데모곡을 낸다. 내 곡도 다른 곡들과 똑같이 ③ A&R 심사(다섯 곡) → ④ 선정(세 곡 + 타이틀)을 거친다
// 결과는 한 달 뒤(심사) · 두 달 뒤(선정 → 채택 제안) 차례로 안다. 이름이 나면(이름 있는 작가부터) 지명 의뢰도 온다
const W_SUB = 2.4;
// 공모에 내는 곡의 완성도: 요즘 쓴 곡 가운데 가장 나은 곡(t.best)에서 이만큼 (예전 채택 수 · 곡 점수에 맞춘 값)
const W_ADJ = -6;
// 경쟁하는 다른 데모곡 (사람은 만들지 않는다): 회사가 클수록 이름난 작곡가의 곡이 많고, 작은 회사에는 아껴 둔 곡을 주지 않는다
function wGhost(x, kind) {
  const L = kind === 'name' ? U.int(45, 85) : U.chance(kind === 'camp' ? 0.5 : 0.25 + x.tier * 0.17) ? U.int(35, 80) : U.int(18, 44);
  const c = kind === 'open' && U.chance(0.5) ? U.pick(TRENDS) : U.pick(x.cs), m = U.int(0, 90);
  const q0 = U.clamp(L * 0.6 + (m - 30) / 6 + U.normal(0, 7) + 4 + (kind === 'name' ? 2 : kind === 'camp' ? 1 : 0), 5, 90), qc = 40 + x.tier * 10 + x.rep / 8;
  return { q: Math.round(q0 > qc ? qc + (q0 - qc) * 0.3 : q0), c, price: 0, title: '', src: kind };
}
// 내 곡이 어디까지 가는가: main 타이틀 · side 수록곡 · five 다섯 곡엔 들었지만 빠짐 · cut 심사에서 떨어짐
function wCompete(s, x, my, anr, boss) {
  const demos = [my];
  for (const z of ALB_SRC) if (['open', 'name', 'camp'].includes(z.k) && x.src.includes(z.k)) { const n = Math.max(1, albSrcCnt(x, z, 1) + (z.k === 'open' ? U.int(-1, 1) : 0)); for (let i = 0; i < n; i++) demos.push(wGhost(x, z.k)); }
  const five = albScreen(s, x, demos, anr).five, sd = albEarOf(boss);
  const picks = five.map(y => ({ y, v: y.q + U.normal(0, sd) + (x.cs.includes(y.c) ? 10 : 0) })).sort((a, b) => b.v - a.v).slice(0, ALB_PICK).map(z => z.y);
  return picks[0] === my ? 'main' : picks.includes(my) ? 'side' : five.includes(my) ? 'five' : 'cut';
}
function wSubmit(s, t, o) {
  o = o || {};
  const a = o.a || projArtist(s, makeArtist(s, t.rep)), ag = (o.ag && AG[o.ag]) || U.pick(musicAgencies().filter(x => x.tier === a.tier && x.mkt === 'kr')) || U.pick(musicAgencies());
  const c = o.c || (U.chance(0.6) && t.cc ? t.cc : U.chance(0.5) ? s.trend : U.pick(TRENDS));
  const x = { tier: a.tier, rep: 20 + a.tier * 15, cs: [c], src: ['open'].concat(o.name || (a.tier >= 2 && U.chance(a.tier >= 3 ? 0.8 : 0.5)) ? ['name'] : [], a.tier >= 3 && U.chance(0.4) ? ['camp'] : []), budget: null };
  const anr = agAnr(s, ag.id), boss = agProd(s, ag.id, {}).p, q = o.q != null ? o.q : t.best + W_ADJ;
  const r = wCompete(s, x, { w: 1, q, c: o.c || t.cc || c, price: 0, title: '', src: o.name ? 'name' : 'open' }, anr || { sd: 8 }, boss);
  (t.subs = t.subs || []).push({ at: s.t, a, ag: ag.id, anr: anr ? anr.id : null, c, q, r, name: !!o.name });
  if (!o.name) addLog(s, `${ag.n} ${a.name} 앨범 공모('${c}' 컨셉)에 데모곡을 냈다.`, 'career');
}
// 낸 곡의 소식: 한 달 뒤 심사 결과, 두 달 뒤 선정 결과 (뽑혔으면 채택 제안이 온다)
function wSubTick(s, t) {
  for (const x of (t.subs || []).slice()) {
    const k = s.t - x.at, ag = AG[x.ag] || { n: '' }, w = `${ag.n} ${x.a.name} 앨범${x.name ? ' 지명 의뢰' : ' 공모'}에 낸 곡`;
    if (k >= 1 && !x.l1) { x.l1 = 1; addLog(s, x.r === 'cut' ? `${josa(w, '이가')} A&R 심사에서 떨어졌다.` : `${josa(w, '이가')} A&R 심사를 통과해 다섯 곡에 들었다!`, 'career'); if (x.r === 'cut') t.subs.splice(t.subs.indexOf(x), 1); continue; }
    if (k >= 2 && x.l1) { t.subs.splice(t.subs.indexOf(x), 1); if (x.r === 'five') addLog(s, `${w}은 아쉽게도 실을 세 곡에 들지 못했다.`, 'career'); else sendAdopt(s, 'composer', t, { a: x.a, ag: x.ag, anr: x.anr, main: x.r === 'main', c: x.c, q: x.q, name: x.name }); }
  }
}
INBOX.w_name = {
  ic: '📝',
  text: (s, m) => `${AG[m.d.ag] ? AG[m.d.ag].n + ' ' : ''}${m.d.a.name}(${TIER_N[m.d.a.tier]} 기획사 ${m.d.a.kind}) 앨범에 '${m.d.c}' 컨셉 곡을 써 달라는 지명 의뢰다.${m.d.c === s.trend ? ' (유행 중)' : ''}\n\n이름난 작곡가 몇 명에게만 따로 부탁한 것이라 공모보다 유리하다. 그래도 곡은 다른 곡들과 같이 A&R 심사를 거친다.\n\n의뢰비 ${fmtWon(m.d.fee)} (실리지 않아도 받는다) · 내 '${m.d.c}' 숙련도 ${Math.floor(cmGet(s, m.d.c))}`,
  ch: (s, m) => [
    { t: '곡을 써 준다', ok: s => trackOn(s, 'composer'), h: '작곡이 조금 늘고 그 컨셉 숙련도가 오른다 · 스트레스 ↑', f: s => { const t = s.tracks.composer, p = me(s), d = m.d; earn(s, d.fee * (t.team ? 0.7 : 1), '지명 의뢰비'); const q = lv(p, 'compose') * 0.9 + cmBonus(s, d.c) + U.normal(0, 5) + (t.team ? 4 : 0); useSkill(s, p, 'compose', 2); cmGain(s, d.c, 4); wSubmit(s, t, { a: d.a, ag: d.ag, c: d.c, q, name: true }); return `${d.a.name} 앨범에 '${d.c}' 컨셉 곡을 써서 보냈다.` + fx(s, { stress: 3 }); } },
    { t: '거절한다', f: () => '지명 의뢰를 거절했다.' },
  ],
};
function wNameMsg(s, t) {
  const a = makeArtist(s, Math.max(t.rep, 40)), ag = U.pick(musicAgencies().filter(x => x.tier === a.tier && x.mkt === 'kr')) || U.pick(musicAgencies());
  const c = U.chance(0.5) ? t.cc || s.trend : U.chance(0.5) ? s.trend : U.pick(TRENDS);
  sendMsg(s, 'w_name', { from: `${ag.n} ${a.name} 앨범`, title: '곡 지명 의뢰', months: 2, d: { a, ag: ag.id, c, fee: Math.round([100, 250, 500][a.tier - 1] * (1 + t.rep / 60)) * 1e4 } });
}
// 작곡가가 앞으로 쓸 곡의 컨셉
SONG_CB.comp = (s, d, c) => { s.tracks.composer.cc = c; return `앞으로 '${c}' 컨셉으로 곡을 쓰기로 했다.`; };
for (const kind of ['composer', 'lyricist']) {
  const key = wKey(kind), nm = wN(kind);
  JOB_APPLY.push({
    id: kind + '_start', trk: kind, g: kind === 'composer' ? '🎼 작곡가' : '✍️ 작사가', n: `${nm}로 활동 시작`, show: s => !trackOn(s, kind),
    h: s => `곡을 써서 돌린다. 채택되면 계약금과 저작권료가 들어온다 · 채택 제안은 메시지함으로 온다 · 지금 ${SKILLS[key].n} ${has(me(s), key) ? lvi(me(s), key) + '레벨' : '못 함'}`,
    ok: s => lv(me(s), key) >= 15 && age(s) >= 14 && !s.army,
    why: s => s.army ? '군 복무 중' : age(s) < 14 ? '14세부터 할 수 있다' : `${SKILLS[key].n}${josa(SKILLS[key].n, '이가').slice(SKILLS[key].n.length)} 15레벨 이상이어야 한다`,
    run: s => { const old = s.tracks[kind]; s.tracks[kind] = { st: 'active', months: 0, rep: old.rep || 0, songs: old.songs || 0, hits: old.hits || 0, best: 0, team: null, sn: old.sn, cc: old.cc || null }; if (!old.songs) milestone(s, `${age(s)}세에 ${nm}의 길을 걷기 시작했다.`); if (kind === 'composer') pickConcept(s, { cb: 'comp', what: '앞으로 쓸 곡들의', cur: old.cc || null }); return `${nm}로 활동을 시작했다. 일정에 '${CAREERS[kind].act.n}'를 넣어야 곡을 쓴다.`; },
  });
  CAREERS[kind] = {
    n: nm, ic: kind === 'composer' ? '🎼' : '✍️',
    desc: kind === 'composer' ? '내가 정한 컨셉으로 곡을 써서 기획사 앨범 공모에 낸다. 내 곡도 다른 곡들과 똑같이 A&R 심사와 선정을 거치고, 뽑히면 계약금과 저작권료가 들어온다. 이름이 나면 지명 의뢰도 온다. 앨범을 통째로 맡는 프로듀서와 달리 곡 한 곡만 쓴다.' : '앨범에 실을 곡이 정해지면 편곡 · 작사 단계에서 가사를 맡는다. 작곡보다 의뢰가 잦지만 수입은 적다.',
    act: { n: kind === 'composer' ? '곡 쓰기' : '가사 쓰기', ic: kind === 'composer' ? '🎼' : '✍️', g: '직업 활동', eff: [[SKILLS[key].n, '↑↑', 1], ['채택 기회', '↑', 1], ['스트레스', '↑', 0]] },
    status(s, t) { return t.st !== 'active' ? (t.songs ? `채택 ${t.songs}곡 · 활동 쉬는 중` : '') : `${W_TIERS[wTier(t, kind, s)]} · 채택 ${t.songs}곡 · 히트 ${t.hits}곡 · 업계 평판 ${Math.round(t.rep)}` + (t.team ? ` · ${t.team} 소속` : ''); },
    short(s, t) { return nm; },
    title(s, t) { return t.songs ? (t.hits ? `히트곡 ${t.hits}개의 ${nm}` : nm) : null; },
    mainSk() { return key; },
    info(s, t) {
      const p = me(s);
      const R = [['내 실력', [key, kind === 'composer' ? 'lyric' : 'compose'].concat(kind === 'composer' ? ['piano', 'keyboard', 'guitar'] : []).filter(k => has(p, k)).map(k => `${SKILLS[k].n} ${lvi(p, k)}`).join(' · ')], ['단계', W_TIERS[wTier(t, kind, s)]], ['채택된 곡', `${t.songs}곡 · 히트 ${t.hits}곡`], ['업계 평판', `${Math.round(t.rep)}`], ['작곡팀', t.team ? `${t.team} (수익의 30%를 나눈다)` : '없음 (혼자 작업)']];
      if (kind === 'composer') R.push(['쓰는 컨셉', t.cc ? `'${t.cc}'${t.cc === s.trend ? ' (유행 중)' : ''} · 요즘 유행 '${s.trend}'` : '아직 안 정함']);
      R.push({ h: '컨셉 숙련도', bars: cmBars(s) });
      return R;
    },
    actions(s, t) {
      if (t.st !== 'active') return [];
      const A = [];
      if (kind === 'composer') A.push({ t: '쓰는 컨셉 바꾸기', h: `지금 '${t.cc || '-'}' · 요즘 유행 '${s.trend}'`, ok: true, btn: '바꾸기', run: s => pickConcept(s, { cb: 'comp', what: '앞으로 쓸 곡들의', cur: t.cc }) });
      A.push({ t: `${nm} 그만두기`, ok: true, danger: true, run: s => { t.st = 'ended'; return `${nm} 일을 그만뒀다.`; } });
      return A;
    },
    monthly(s, t) {
      if (t.st !== 'active') return;
      t.months++;
      const n = slotsOn(s, 'c_' + kind), p = me(s);
      if (kind === 'composer') wSubTick(s, t);
      if (!n) { t.best *= 0.98; return; }
      // 곡을 계속 쓰면서 실력이 는다
      practice(s, p, key, 1.3 * n, 1);
      if (kind === 'composer') for (const k of ['piano', 'keyboard', 'guitar']) if (has(p, k)) useSkill(s, p, k, 0.2);
      addStress(s, 1);
      // 작곡가: 정한 컨셉으로 곡을 쓰며 그 컨셉 숙련도가 오른다. 유행하는 컨셉일수록 채택이 잦다
      if (kind === 'composer' && !t.cc) t.cc = s.trend;
      const cb = kind === 'composer' ? cmBonus(s, t.cc) : 0;
      if (kind === 'composer') cmGain(s, t.cc, 0.8 * n);
      const q = lv(p, key) * 0.9 + U.normal(0, 7) + (t.team ? 4 : 0) + cb;
      t.best = Math.max(t.best * 0.97, q);
      const pp = U.sig((t.best - (28 + U.normal(0, 5))) / 6) * (0.04 + t.rep / 900 + (t.team ? 0.025 : 0)) * (0.7 + access(s) * 0.3) * (kind === 'lyricist' ? 1.3 : 1) * (kind === 'composer' && t.cc === s.trend ? 1.3 : 1) * pm(s, 'network') * Math.min(1.5, n);
      // 작곡가는 공모에 곡을 내고 심사 · 선정을 거쳐 채택 제안이 온다 (v155). 작사가는 편곡 · 작사 단계의 가사 의뢰가 온다
      if (kind === 'composer') { if (U.chance(pp * W_SUB) && (t.subs || []).length < 2 && !s.inbox.some(m => m.kind === 'w_adopt' && m.d.kind === kind)) wSubmit(s, t); if (wTier(t, kind, s) >= 3 && U.chance(0.012 * (wTier(t, kind, s) - 2) * pm(s, 'network')) && !s.inbox.some(m => m.kind === 'w_name')) wNameMsg(s, t); }
      else if (U.chance(pp) && !s.inbox.some(m => m.kind === 'w_adopt' && m.d.kind === kind)) sendAdopt(s, kind, t);
      if (!t.team && t.months >= 6 && lv(p, key) >= 30 && U.chance(0.02) && !s.inbox.some(m => m.kind === 'w_team')) sendMsg(s, 'w_team', { from: U.pick(TEAMS), title: `${wJob(kind)}팀 합류 제안`, months: 6, d: { kind } });
    },
  };
}
INBOX.w_adopt = {
  ic: '🎼',
  text: (s, m) => { const d = m.d; return (d.sub ? `${d.sub === 'name' ? '지명 의뢰로' : '공모에'} 냈던 내 곡이 A&R 심사를 거쳐 ${d.a.name}(${TIER_N[d.a.tier]} 기획사 ${d.a.kind}) 새 앨범의 ${d.main ? '타이틀곡' : '수록곡'}으로 뽑혔다! 계약하자는 연락이다.` : d.kind === 'lyricist' ? `${d.a.name}(${TIER_N[d.a.tier]} 기획사 ${d.a.kind}) 새 앨범에 실을 곡이 정해져 편곡 · 작사 단계에 들어갔다. ${d.main ? '타이틀곡' : '수록곡'} 가사를 맡아 달라는 의뢰다.` : `${d.mkt === 'kr' ? '' : MK_N[d.mkt] + ' '}${d.a.name}(${TIER_N[d.a.tier]} 기획사 ${d.a.kind})의 새 앨범 ${d.main ? '타이틀곡' : '수록곡'}으로 내 곡을 쓰고 싶다는 연락이다.`) + `${d.c ? ` ('${d.c}' 컨셉${d.c === s.trend ? ' · 유행 중' : ''})` : ''}\n\n계약금 ${fmtWon(d.fee)}` + (s.tracks[d.kind].team ? ' (팀과 나눈다)' : ''); },
  ch: (s, m) => [
    // 계약하면 곡 제목을 직접 정한다 (TITLE_CB.wsong에서 발매를 잡는다)
    { t: '계약한다', ok: s => trackOn(s, m.d.kind), h: '발매 두 달 뒤 성적이 나온다', f: s => { const d = m.d, t = s.tracks[d.kind]; t.songs++; earn(s, d.fee * (t.team ? 0.7 : 1), `${wJob(d.kind)} 계약금`); if (!t.sn) askStageName(s, d.kind); askTitle(s, 'wsong', Object.assign({}, d, { what: `${d.a.name}에게 넘길 ${d.kind === 'composer' ? '곡' : '가사를 쓴 곡'}의` })); return `${d.a.name} ${d.main ? '타이틀곡' : '수록곡'} ${wJob(d.kind)} 계약을 했다.`; } },
    { t: '더 좋은 곳을 기다린다', f: () => '채택 제안을 거절했다. 더 좋은 자리에 주고 싶다.' },
  ],
};
TITLE_CB.wsong = (s, d) => {
  const anr = s.people[d.anr]; if (anr) { meetAt(s, anr, `「${d.title}」 ${wJob(d.kind)} 계약`, d.kind); bond(s, anr, 4); }
  delete d.cb; delete d.what;
  queueEv(s, 'w_res', 2, d, true);
  // ⑤ 편곡 · 작사 단계에서 가끔 수정 요청이 온다 (v155)
  if (U.chance(d.kind === 'composer' ? 0.3 : 0.2)) queueEv(s, 'w_fix', 1, { title: d.title, kind: d.kind, anr: d.anr, a: d.a.name, main: !!d.main }, true);
  return `곡 제목을 ${qro(d.title)} 정했다.`;
};
// 수정 요청 (v155): 편곡 · 작사 단계에서 A&R 담당자가 곡을 고쳐 달라고 한다. 고친 만큼 나갈 곡(w_res)이 달라진다
function wFixRes(s, d) { return s.queue.find(e => e.id === 'w_res' && e.d && e.d.title === d.title); }
E({
  id: 'w_fix', cat: '수정 요청', title: '수정 요청', tag: 'career',
  init(s, d) { if (!wFixRes(s, d)) d.skip = true; d.what = d.kind === 'composer' ? U.pick(['후렴을 더 세게', '도입부를 짧게', '브리지를 새로', '템포를 조금 빠르게']) : U.pick(['후렴 가사를 더 쉽게', '첫 소절을 더 강하게', '영어 가사를 줄이게', '제목이 들어간 줄을 더 또렷하게']); },
  text: (s, d) => { const a = s.people[d.anr]; return `${d.a} 앨범 ${d.main ? '타이틀곡' : '수록곡'} ${josa(`「${d.title}」`, '이가')} 편곡 · 작사 단계에 들어갔다. ${a ? `A&R ${josa(a.name, '이가')}` : 'A&R 담당자가'} 연락해 ${d.what} 고쳐 달라고 한다.`; },
  ch: (s, d) => {
    const p = me(s), k = wKey(d.kind), a = s.people[d.anr], R = wFixRes(s, d);
    const bump = v => { if (R) R.d.q += v; };
    return [
      { t: '요청대로 고친다', h: `곡이 조금 다듬어진다 · 스트레스 ↑`, f: s => { bump(U.fl(0, 3)); useSkill(s, p, k, 1.5); if (a) bond(s, a, 2); return `${josa(`「${d.title}」`, '을를')} 요청대로 고쳤다.` + fx(s, { stress: 4 }); } },
      { t: '내 생각을 설명하고 설득한다', h: `내 ${SKILLS[k].n} 실력만큼 설득될 가능성이 크다`, f: s => { const ok = U.chance(U.clamp(0.25 + lv(p, k) / 150, 0.2, 0.85)); bump(ok ? U.fl(1, 4) : U.fl(-2, 0)); if (a) bond(s, a, ok ? 3 : -2); return ok ? `${josa(`「${d.title}」`, '은는')} 내 생각대로 가기로 했다. A&R도 들어 보더니 좋다고 했다.` : `설득하지 못하고 반쯤 고쳤다. 곡이 조금 어정쩡해졌다.` + fx(s, { stress: 3 }); } },
      { t: '그대로 두자고 버틴다', h: '곡은 그대로 · 사이가 나빠지고, 수록곡으로 밀릴 수도 있다', f: s => { if (a) bond(s, a, -4); if (R && R.d.main && U.chance(0.3)) { R.d.main = false; return `${josa(`「${d.title}」`, '을를')} 그대로 두자고 버텼다. 결국 타이틀곡에서 수록곡으로 밀렸다.`; } return `${josa(`「${d.title}」`, '을를')} 그대로 두자고 버텼다. 회사도 결국 받아들였다.`; } },
    ];
  },
});
E({
  id: 'w_res', cat: '음원 성적', title: '참여곡 성적', tag: 'career',
  // 12-3 보는 쪽: 내가 참여한 곡의 무대를 본다. 방영 뒤 반응은 라이브온에서
  live: (s, d) => d.live, keepPop: (s, d) => typeof liveShow === 'function' && liveShow(d.live), plio: (s, d) => d.pl || null,
  init(s, d) {
    const t = s.tracks[d.kind], nm = wJob(d.kind);
    const fans = [5e3, 5e4, 5e5][d.a.tier - 1] * U.fl(0.5, 2);
    // 작사가는 그 곡 컨셉의 숙련도만큼 가사가 좋아지고, 숙련도가 오른다 (피드백 24. 작곡가는 곡을 쓸 때 이미 반영된다)
    const ly = d.kind === 'lyricist' && d.c;
    const sc = songScore(s, { perf: 20 + d.a.tier * 8 + U.normal(0, 4), q: d.q + (ly ? cmBonus(s, d.c) * 0.5 : 0), fans, tier: d.a.tier, trend: !!d.c && d.c === s.trend, bonus: d.main ? 3 : 0 });
    d.peak = chartFromScore(sc);
    const mult = (d.kind === 'composer' ? (d.main ? 0.9 : 0.4) : (d.main ? 0.5 : 0.25)) * (t.team ? 0.7 : 1) * (d.mkt === 'us' ? 1.6 : d.mkt === 'jp' ? 1.2 : 1);
    d.roy = addCatalog(s, d.title, nm, sc, mult, d.kind);
    if (ly) cmGain(s, d.c, 3);
    const k0 = wTier(t, d.kind, s);
    if (d.peak && d.peak <= 20) t.hits++;
    // 단계가 오르면 결과 창에 알리고, 높은 단계는 인생 기록에 남긴다
    const k1 = wTier(t, d.kind, s); d.up = k1 > k0 ? k1 : 0;
    if (d.up && k1 >= 4) milestone(s, `${age(s)}세에 ${wN(d.kind)}로서 ${josa(W_TIERS[k1], '이가')} 되었다.`);
    t.rep = U.clamp(t.rep + (sc - 55) / 6 + (d.peak && d.peak <= 10 ? 4 : 0), 0, 100);
    addWork(s, { type: `${nm} 참여곡`, title: d.title, by: d.a.name, sc, note: chartText(d.peak), pay: Math.round((d.fee || 0) * (t.team ? 0.7 : 1)) });
    if (d.peak && d.peak <= 10 && !t.hitMs) { t.hitMs = true; milestone(s, `${age(s)}세에 ${nm}한 ${josa(`「${d.title}」`, '이가')} 차트 ${d.peak}위에 올랐다.`); }
    if (t.songs === 1) milestone(s, `${age(s)}세에 ${nm}한 곡이 처음으로 앨범에 실렸다 (${d.a.name} 「${d.title}」).`);
    const anr = s.people[d.anr]; if (anr) bond(s, anr, sc >= 60 ? 5 : 0);
    d.sc = sc;
    if (typeof liveWatch === 'function') d.live = liveWatch(s, { name: d.a.name, kind: d.a.kind, tier: d.a.tier, title: d.title, c: d.c, sc, peak: d.peak, trend: !!d.c && d.c === s.trend, key: t.songs === 1 || (d.peak && d.peak <= 10) || !!d.up });
    if (typeof plioSpec === 'function') d.pl = plioSpec({ k: 'stagew', t: `${d.a.name} 「${d.title}」 무대`, ch: `${PF.video.n} 뮤직`, me: `${actName(s, d.kind)} ${wN(d.kind)}`, sc, rv: sc >= 80 ? 2 : sc >= 65 ? 1 : 0, vw: Math.pow(10, 3.6 + sc / 22), one: d.a.kind === '솔로 가수' });
  },
  text: (s, d) => `${d.a.name}의 ${josa(`「${d.title}」`, '이가')} 나왔다. (내가 ${wJob(d.kind)})\n\n${chartText(d.peak)}\n매달 들어올 저작권료 약 ${fmtWon(d.roy)} (조금씩 줄어든다)\n업계 평판 ${Math.round(s.tracks[d.kind].rep)}` + (d.up ? `\n\n🎉 ${wN(d.kind)} 단계가 ${qro(W_TIERS[d.up])} 올랐다!` : ''),
  // v174: 결과 창을 인터넷 기사로 (ui.js newsEvHTML). 그 가수의 곡 기사 속에 내 이름이 한 줄 나온다
  html: (s, d) => d.sc != null && d.a && typeof newsEvHTML === 'function' ? newsEvHTML(s, d, EVENTS.w_res.news(s, d)) : '',
  news(s, d) {
    const k = d.a.kind, A = `${k === '솔로 가수' ? '가수' : k} ${d.a.name}`, t = s.tracks[d.kind] || {};
    const ts = [['🎧', `매달 들어올 저작권료 약 ${fmtWon(d.roy)}`, 'g'], ['📈', `업계 평판 → ${Math.round(t.rep || 0)}`, newsTone(d.sc)]];
    if (d.up) ts.push(['🏅', `${wN(d.kind)} 단계 ↑ · ${W_TIERS[d.up]}`, 'g']);
    return { who: A, solo: k === '솔로 가수', what: d.main ? '새 타이틀곡' : '새 앨범 수록곡', t: d.title, c: d.c, peak: d.peak, wins: 0, show: k !== '밴드', sc: d.sc,
      by: `${josa(wJob(d.kind), '은는')} ${actName(s, d.kind)} ${josa(wN(d.kind), '이가')} 맡았다.`, pl: d.pl || null, live: d.live, ts };
  },
  ch: (s, d) => [{ t: '확인', f: () => `${wJob(d.kind)} 참여곡 「${d.title}」 (${d.a.name}) ${chartText(d.peak)}.` + (d.up ? ` ${wN(d.kind)} 단계가 ${qro(W_TIERS[d.up])} 올랐다.` : '') }],
});
INBOX.w_team = {
  ic: '👥',
  text: (s, m) => `${wJob(m.d.kind)}팀 「${m.from}」에서 같이 일하자고 연락이 왔다. 팀에 들어가면 곡이 채택될 가능성이 크게 오르지만, 수익의 30%는 팀과 나눈다.`,
  ch: (s, m) => [
    { t: '합류한다', ok: s => trackOn(s, m.d.kind), f: s => { s.tracks[m.d.kind].team = m.from; return `${wJob(m.d.kind)}팀 「${m.from}」에 합류했다.`; } },
    { t: '혼자 하겠다', f: () => '혼자 작업하기로 했다.' },
  ],
};

// ════════ 프로듀서 ════════
const P_TIERS = ['신인 프로듀서', '현역 프로듀서', '실력파 프로듀서', '유명 프로듀서', '스타 프로듀서', '톱 프로듀서', '업계 거물'];
// 등급: 프로듀싱한 앨범 수(위쪽은 히트도 함께)로 오른다. 업계 거물은 상위 4% 정도
// 업계 거물 재능 조건 (v99, 8-5): 통찰력 52 (s를 넘길 때만 본다)
const P_UP = { albums: [0, 1, 3, 6, 10, 14, 18], hits: [0, 0, 0, 0, 1, 4, 9], min: 52 };
function pTier(t, s) { for (let k = 6; k >= 1; k--) if ((t.albums || 0) >= P_UP.albums[k] && (t.hits || 0) >= P_UP.hits[k] && (k < 6 || !s || me(s).tal.insight >= P_UP.min)) return k; return 0; }
function producerReady(s) {
  const p = me(s), c = s.tracks.composer;
  return lv(p, 'compose') >= 40 && ((c.rep || 0) >= 30 || (c.hits || 0) >= 2 || (lv(p, 'compose') >= 50 && totalFans(s) >= 5e4));
}
JOB_APPLY.push({
  id: 'producer_start', trk: 'producer', g: '🎛️ 프로듀서', n: '프로듀서로 나서기', show: s => !trackOn(s, 'producer'),
  h: s => '앨범 전체를 맡아 만든다 · 작곡 40레벨 이상에, 작곡가로 평판 30을 쌓았거나 히트곡이 2곡 있어야 한다 (가수 출신이면 작곡 50레벨 + 팬 5만으로 대신할 수 있다)',
  ok: s => producerReady(s) && !s.army,
  why: s => s.army ? '군 복무 중' : `아직 조건이 안 된다 (작곡 ${lvi(me(s), 'compose')}레벨 · 작곡가 평판 ${Math.round(s.tracks.composer.rep || 0)} · 히트 ${s.tracks.composer.hits || 0}곡)`,
  run: s => { const old = s.tracks.producer; s.tracks.producer = { st: 'active', months: 0, rep: Math.max(10, (s.tracks.composer.rep || 0) * 0.6, old.rep || 0), albums: old.albums || 0, hits: old.hits || 0, sn: old.sn }; milestone(s, `${age(s)}세에 프로듀서로 나섰다.`); askStageName(s, 'producer'); return '프로듀서로 나섰다. 앨범 의뢰는 메시지함으로 온다.'; },
});
// 작곡가와 다른 점: 작곡가는 곡 한 곡을 써 두고 기획사가 골라 가기를 기다린다.
// 프로듀서는 남의 앨범 하나를 통째로 맡아 대표와 같은 일을 한다: ① 기획 · ② 데모곡 확보 → ④ 실을 곡 세 곡 + 타이틀곡 (v155, 앨범 제작 틀).
// 프리랜서(mode free): 의뢰를 받아 앨범마다 비용을 받는다. 앨범이 크게 잘되면 그 가수 쪽이 다음 앨범도 맡아 달라고 다시 찾아온다
// 사내 프로듀서(mode in): 기획사 직원으로 월급을 받고, 회사가 소속 그룹의 앨범을 차례로 맡긴다. 크게 잘되면 성과급. 회사를 나오면 프리랜서로 돌아간다
function pinOn(s) { const t = s.tracks.producer; return !!t && t.st === 'active' && t.mode === 'in'; }
CAREERS.producer = {
  n: '프로듀서', ic: '🎛️',
  desc: '남의 앨범 하나를 통째로 맡는다. 앨범 컨셉, 곡을 모을 곳, 실을 곡과 타이틀곡을 직접 정한다. 프리랜서는 의뢰마다 비용을 받고, 크게 잘되면 그 가수가 다음 앨범도 맡긴다. 기획사에 들어가면(사내 프로듀서) 월급을 받고 회사 그룹의 앨범을 맡는다. 앨범을 맡으면 석 달 동안 일정 한 칸이 묶인다.',
  act: { n: '곡 작업·프로듀싱 영업', ic: '🎛️', g: '직업 활동', eff: [['작곡', '↑↑', 1], ['의뢰 기회', '↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) { const w = s.projects.find(x => x.type === 'produce'); return t.st !== 'active' ? '' : `${t.mode === 'in' ? `${t.agN} 사내 프로듀서 · ` : ''}${P_TIERS[pTier(t, s)]} · 프로듀싱 앨범 ${t.albums}장 · 평판 ${Math.round(t.rep)}` + (t.mode === 'in' ? ` · 월급 ${fmtWon(t.sal)}` : '') + (w ? ` · ${w.a.name} 앨범 작업 중` : ''); },
  short(s, t) { return t && t.mode === 'in' ? `${t.agN} 프로듀서` : '프로듀서'; },
  title(s, t) { return t.albums ? P_TIERS[pTier(t, s)] : null; },
  contract(s, t) { return t.st === 'active' && t.mode === 'in' ? `${t.agN} (사내 프로듀서)` : ''; },
  emp: true,
  cLeft(s, t) { return t.st === 'active' && t.mode === 'in' && t.cEnd != null ? t.cEnd - t.months : null; },
  mainSk() { return 'compose'; },
  info(s, t) {
    const p = me(s), w = s.projects.find(x => x.type === 'produce'), inh = t.mode === 'in';
    return [inh ? ['회사', `${t.agN} (${TIER_N[t.tier]} 기획사) 사내 프로듀서`] : ['일하는 방식', '프리랜서 (의뢰는 메시지함으로 온다)'], inh ? ['월급', fmtWon(t.sal)] : null, ['내 실력', ['compose', 'lyric', 'scout', 'vocal', 'rap', 'piano', 'keyboard', 'guitar'].filter(k => has(p, k)).map(k => `${SKILLS[k].n} ${lvi(p, k)}`).join(' · ')], ['단계', P_TIERS[pTier(t, s)]], ['프로듀싱한 앨범', `${t.albums}장 · 히트 ${t.hits}곡`], [inh ? '업무 평가' : '평판', `${Math.round(t.rep)}`], inh ? null : ['단골 가수', (t.clients || []).length ? t.clients.map(a => a.name).join(', ') : '없음'], ['지금 작업', w ? `${w.a.name} 「${w.title}」${w.c ? ` · '${w.c}' 컨셉` : ''} · ${w.left}개월 남음` : inh ? `없음 (다음 앨범은 ${Math.max(1, t.next || 1)}개월쯤 뒤)` : '없음 (의뢰는 메시지함으로 온다)'], { h: '컨셉 숙련도', bars: cmBars(s) }, inh ? { h: '전담 그룹', items: (t.groups || []).slice(0, pinOwn(s, t)).map(g => `${g.name} (${g.kind}) · 팬 ${fmtFans(g.f)} · 대표 컨셉 '${g.sig}'`) } : null].filter(Boolean);
  },
  actions(s, t) {
    if (t.st !== 'active') return [];
    if (t.mode === 'in') return [{ t: '회사 그만두기', h: '직원 계약이라 위약금은 없다 · 나오면 프리랜서 프로듀서로 일한다', ok: !busyWith(s, 'produce'), why: '작업 중인 앨범이 있다', danger: true, confirm: '정말 회사를 그만둘까요?\n프리랜서 프로듀서로 돌아가요.', run: s => leaveEmp(s, 'producer', '퇴사') }];
    return [{ t: '프로듀서 그만두기', ok: !busyWith(s, 'produce'), why: '작업 중인 앨범이 있다', danger: true, run: s => { t.st = 'ended'; return '프로듀서 일을 그만뒀다.'; } }];
  },
  monthly(s, t) {
    if (t.st !== 'active') return;
    t.months++;
    const n = slotsOn(s, 'c_producer'), p = me(s);
    if (n) { practice(s, p, 'compose', 1.1 * n, 1); useSkill(s, p, 'lyric', 0.3 * n); addStress(s, 1.5); }
    if (t.mode === 'in') {
      empMonth(s, 'producer', t);
      earn(s, t.sal, '월급', 'producer');
      // 회사가 소속 그룹의 앨범을 차례로 맡긴다 (석 달 작업 + 너댓 달 쉬고)
      if (!busyWith(s, 'produce') && --t.next <= 0) { t.next = U.int(4, 7); pinAssign(s, t); }
      return;
    }
    if (!busyWith(s, 'produce') && !s.inbox.some(m => m.kind === 'p_offer') && U.chance((0.025 + t.rep / 800) * pm(s, 'network') * (n ? 1.4 : 0.5))) {
      // 단골 가수가 있으면 셋 중 한 번은 그쪽에서 다시 맡긴다 (비용을 더 쳐 준다)
      const re = (t.clients || []).length && U.chance(0.35);
      const a = re ? U.pick(t.clients) : projArtist(s, Object.assign(makeArtist(s, t.rep), { sig: U.pick(TRENDS) }));
      sendMsg(s, 'p_offer', { from: `${a.name} 소속사`, title: re ? '다음 앨범도 맡아 달라는 의뢰' : '앨범 프로듀싱 의뢰', months: 6, d: { a, re, fee: Math.round((a.tier * 1500 + t.rep * 40) * (re ? 1.2 : 1) * 1e4), title: songTitle() } });
    }
  },
};
// 사내 프로듀서: 회사가 전담 그룹의 새 앨범을 맡긴다 (v155: 처음엔 한 그룹, 실력파 프로듀서가 되면 두 그룹을 번갈아)
function pinOwn(s, t) { return pTier(t, s) >= 2 ? t.groups.length : 1; }
function pinAssign(s, t) {
  const own = pinOwn(s, t), gi = own > 1 && t.lastGi === 0 ? 1 : 0, g = t.groups[gi];
  t.lastGi = gi;
  const w = startWork(s, 'produce', { fee: 0, title: songTitle(), a: { name: g.name, kind: g.kind, tier: t.tier, sig: g.sig, gi }, months: 3, slot: true, inh: true });
  queueEv(s, 'prod_plan', 0, { wid: w.id }, true);
  addLog(s, `회사에서 ${g.name}의 새 앨범 「${w.title}」 프로듀싱을 맡겼다.`, 'career');
}
INBOX.p_offer = {
  ic: '🎛️',
  text: (s, m) => `${m.d.re ? `지난 앨범이 크게 잘된 ${m.d.a.name}(${TIER_N[m.d.a.tier]} 기획사 ${m.d.a.kind}) 쪽에서 다음 앨범도 맡아 달라고 한다.` : `${m.d.a.name}(${TIER_N[m.d.a.tier]} 기획사 ${m.d.a.kind})의 새 앨범을 통째로 맡아 달라는 의뢰다.`}\n\n프로듀싱 비용 ${fmtWon(m.d.fee)} · 앨범 예산 ${fmtWon(PROD_BUD[m.d.a.tier])}쯤 (곡 모으기 · 타이틀곡 값 · 편곡 맡기기) · 작업 기간 석 달 (그동안 일정 한 칸이 작업으로 묶인다) · 컨셉 · 곡을 모을 곳 · 실을 곡과 타이틀곡을 내가 정한다`,
  ch: (s, m) => [
    { t: '맡는다', ok: s => trackOn(s, 'producer') && !pinOn(s) && !busyWith(s, 'produce'), h: pinOn(s) ? '회사 소속이라 다른 곳 의뢰는 맡을 수 없다' : busyWith(s, 'produce') ? '이미 작업 중인 앨범이 있다' : '', f: s => {
      earn(s, m.d.fee, '프로듀싱 비용');
      const a = Object.assign({}, m.d.a); if (!a.sig) a.sig = U.pick(TRENDS);
      const w = startWork(s, 'produce', { fee: m.d.fee, title: m.d.title, a, months: 3, slot: true });
      if (s.pending) queueEv(s, 'prod_plan', 0, { wid: w.id }, true); else fireEvent(s, 'prod_plan', { wid: w.id });
      return `${m.d.a.name}의 앨범 「${m.d.title}」 프로듀싱을 맡았다.`;
    } },
    { t: '거절한다', f: () => '프로듀싱 의뢰를 거절했다.' },
  ],
};
// 회사가 허락한 프로듀싱 의뢰 (v104, 9단계 겸직): 전속 계약 중인 아티스트는 프로듀서 일을 따로 못 하지만,
// 프로듀서가 될 만한 실력(producerReady)이 있으면 가끔 회사를 거쳐 의뢰가 들어온다. 직업이 아니라 한 번씩 맡는 일이다
// 비용 중 회사 몫은 지금 전속 계약의 회사 몫. 앨범을 만드는 과정(기획 · 데모곡 확보 · 실을 곡 고르기)은 프로듀서와 같다
function sideProdAg(s) {
  for (const id of ['idol', 'solo', 'band', 'actor', 'model']) if (trackOn(s, id) && jobTags(s, id).has('artist')) { const t = s.tracks[id]; return { agN: t.agN || '회사', cut: t.cut != null ? t.cut : 0.3 }; }
  return null;
}
E({
  id: 'p_side', cd: 12, cat: '프로듀싱 의뢰', title: '회사가 허락한 프로듀싱 의뢰', tag: 'career',
  p: s => !s.army && !s.hiatus && !trackOn(s, 'producer') && !busyWith(s, 'produce') && sideProdAg(s) && producerReady(s) ? 0.03 : 0,
  init(s, d) {
    const t = s.tracks.producer, rep = t.rep != null ? t.rep : 10, g = sideProdAg(s) || { agN: '회사', cut: 0.3 };
    d.agN = g.agN; d.cut = g.cut; d.title = songTitle();
    d.a = Object.assign(makeArtist(s, rep), { sig: U.pick(TRENDS) });
    d.fee = Math.round((d.a.tier * 1500 + rep * 40) * 1e4 / 1e5) * 1e5;
    d.net = Math.round(d.fee * (1 - d.cut) / 1e5) * 1e5;
  },
  text: (s, d) => `${d.a.name}(${TIER_N[d.a.tier]} 기획사 ${d.a.kind}) 쪽에서 새 앨범을 통째로 맡아 달라는 의뢰가 ${josa(d.agN, '을를')} 거쳐 들어왔다. 회사가 이번 한 번은 허락했다.\n\n프로듀싱 비용 ${fmtWon(d.fee)} · 회사 몫(${pctN(d.cut)})을 빼면 ${fmtWon(d.net)} · 작업 기간 석 달 (그동안 일정 한 칸이 작업으로 묶인다) · 컨셉 · 곡을 모을 곳 · 실을 곡과 타이틀곡을 내가 정한다`,
  ch: (s, d) => [
    { t: '맡는다', ok: s => !busyWith(s, 'produce'), h: busyWith(s, 'produce') ? '이미 작업 중인 앨범이 있다' : '', f: s => {
      earn(s, d.net, '프로듀싱 비용');
      const w = startWork(s, 'produce', { fee: d.net, title: d.title, a: d.a, months: 3, slot: true, side: true });
      if (s.pending) queueEv(s, 'prod_plan', 0, { wid: w.id }, true); else fireEvent(s, 'prod_plan', { wid: w.id });
      return `${d.a.name}의 앨범 「${d.title}」 프로듀싱을 맡았다.`;
    } },
    { t: '거절한다', f: () => '프로듀싱 의뢰를 거절했다.' },
  ],
});
function prodW(s, d) { const w = s.projects.find(x => x.id === d.wid); if (w && !w.a.sig) w.a.sig = U.pick(TRENDS); return w; }
// ───── 프로듀서의 두 창 (v155, 앨범 제작 틀 album.js) ─────
// 맡은 앨범 한 장에 한해 대표와 같은 일을 한다: ① 기획 · ② 데모곡 확보 (한 창) → 한 달 뒤 ④ 실을 곡 세 곡 + 타이틀곡 (A&R 팀장이 추린 다섯 곡에서)
// 돈은 그 가수 쪽이 준 앨범 예산에서 나간다 (곡을 모으는 데 · 타이틀곡 값 · 편곡 · 작사 맡기기). 녹음 디렉팅 창은 없어졌다 (녹음은 고를 것 없는 한 달)
// 편곡 · 작사를 맡기지 않으면 내가 직접 다듬는다 (내 악기 · 작곡 실력만큼)
const PROD_BUD = [0, 1500e4, 5000e4, 12000e4];
// 타이틀곡 완성도를 예전 평균(곡 점수 70쯤)에 맞추는 값 (v155 기준선)
const PROD_ADJ = 9;
function prodBud(w) { if (!w.bud) w.bud = Math.round(PROD_BUD[w.a.tier] * U.fl(0.8, 1.3) / 1e6) * 1e6; return w.bud; }
function prodLeft(w) { return prodBud(w) - ((w.alb && w.alb.spent) || 0); }
function prodX(s, w) { const A = w.alb || {}; return { tier: w.a.tier, rep: 20 + w.a.tier * 15, sig: w.a.sig, mem: [], prod: 0, budget: Math.max(300e4, prodLeft(w)), cs: A.cs || [w.c || w.a.sig], src: A.src || ['open'] }; }
// 곡을 심사하는 A&R 팀장: 사내 프로듀서면 우리 회사 A&R팀장, 프리랜서면 그 가수 회사 사람 (처음 볼 때 정한다)
function prodAnr(s, w) {
  let p = w.anr && s.people[w.anr];
  if (!p || !p.alive) { const t = s.tracks.producer, L = w.inh && t.ag && typeof coTeamPeople === 'function' ? coTeamPeople(s, t.ag + '#anr') : []; p = L[0] || pickIndustry(s, 'A&R 담당자'); w.anr = p.id; }
  return p;
}
function prodFit(s, w, c) { return c === w.a.sig ? '잘 어울린다' : ''; }
// 모인 곡을 A&R 팀장이 다섯 곡으로 추린다 (내가 쓴 곡은 심사 없이 올라간다)
function prodCollect(s, w, cs, src, spent) {
  const x = prodX(s, w); x.cs = cs; x.src = src; x.budget = Math.max(300e4, prodBud(w) - spent);
  const demos = albDemos(s, x), j = prodAnr(s, w), sc = albScreen(s, x, demos, j);
  w.alb = { cs, src, n: demos.length, five: sc.five, by: j.id, spent };
  if (sc.lost) w.alb.lost = { title: sc.lost.title, by: albBy(s, sc.lost), q: sc.lost.q };
  w.c = cs[0];
  return demos.length;
}
E({
  id: 'prod_plan', cat: '프로듀싱', title: '앨범 기획 · 데모곡 확보', tag: 'career',
  init(s, d) { const w = prodW(s, d); if (!w || (w.alb && w.alb.five)) d.skip = true; },
  text: (s, d) => { const w = prodW(s, d), j = prodAnr(s, w); return `${w.inh ? '회사에서 맡긴 ' : ''}${w.a.name}의 새 앨범 「${w.title}」 기획 회의다. 컨셉과 곡을 모을 곳을 정하자. 여러 개를 같이 고를 수 있고, 돈은 앨범 예산에서 나간다.\n\n요즘 유행 '${s.trend}' · ${w.a.name}의 대표 컨셉 '${w.a.sig}'\n앨범 예산 ${fmtWon(prodBud(w))} (곡을 모으는 데 · 타이틀곡 값 · 편곡 · 작사 맡기기)\n\n모인 곡은 A&R 팀장 ${josa(j.name, '이가')} 다섯 곡으로 추리고, 다음 달에 실을 곡을 정한다.`; },
  card: 'plan-card', // v208
  form: (s, d) => { const w = prodW(s, d), x = prodX(s, w); x.def = w.a.sig; return albPlanForm(s, x, c => [prodFit(s, w, c), `내 숙련도 ${Math.floor(cmGet(s, c))}`].filter(Boolean).join(' · ')); },
  sum: (s, d, v) => { const w = prodW(s, d), x = prodX(s, w), r = albPlanRead(s, x, v), n = ALB_SRC.filter(z => r.src.includes(z.k)).reduce((a, z) => a + albSrcCnt(x, z, r.cs.length), 0); return `컨셉 ${r.cs.length}개 · 데모곡 ${n}곡쯤 · 드는 돈 ${fmtWon(albPlanCost(x, r.cs, r.src))} · 앨범 예산 ${fmtWon(prodBud(w))}`; },
  // 자동 플레이: 대표 컨셉에 외부 공모, 예산이 넉넉하면 지명 의뢰, 작곡을 잘하면 내 곡도
  sim: (s, d) => { const w = prodW(s, d), x = prodX(s, w), v = { s_open: true }; v['c_' + w.a.sig] = true; if (ALB_SRC.find(z => z.k === 'name').cost[x.tier] * 2.5 < prodBud(w)) v.s_name = true; if (lv(me(s), 'compose') >= 45) v.s_me = true; return v; },
  submit(s, d, v) {
    const w = prodW(s, d), x = prodX(s, w), r = albPlanRead(s, x, v), p = me(s);
    if (!r.cs.length) return { err: '컨셉을 하나 이상 골라 주세요' };
    if (!r.src.length) return { err: '곡을 모을 곳을 하나 이상 골라 주세요' };
    const cost = albPlanCost(x, r.cs, r.src);
    if (cost > prodBud(w)) return { err: `앨범 예산이 ${fmtWon(cost - prodBud(w))} 모자라요` };
    for (const c of r.cs) cmGain(s, c, 4 / r.cs.length);
    if (r.src.includes('me')) { useSkill(s, p, 'compose', 2); cmGain(s, r.cs[0], 3); }
    const n = prodCollect(s, w, r.cs, r.src, cost), j = s.people[w.alb.by];
    return { log: `${w.a.name} 앨범 「${w.title}」 기획을 마쳤다. ${r.cs.map(c => `'${c}'`).join(' · ')} 컨셉으로 데모곡 ${n}곡이 모였다. A&R 팀장 ${josa(j.name, '이가')} 심사한다.${cost ? ` (예산에서 ${fmtWon(cost)})` : ''}` };
  },
});
// ④ 실을 곡 · 타이틀곡: A&R 팀장이 추린 다섯 곡에서 세 곡을 체크하고 타이틀곡을 하나 찍는다. 곡 정보는 내 듣는 귀만큼 보인다
function prodPickRead(w, v) { const F = w.alb.five, idx = F.map((x, i) => i).filter(i => albOn(v, 'p' + i)), ti = v.ti ? +String(v.ti).slice(1) : -1; return { idx, ti: idx.includes(ti) ? ti : -1, pol: albPolRead(v) }; }
function prodPickCost(s, w, r) { const F = w.alb.five; return (r.ti >= 0 ? albSongCost(null, F[r.ti]) : 0) + albPolPay(s, prodX(s, w), r.pol); }
// 편곡자 · 작사가 후보 (v165): 앨범마다 한 번 정해 둔다. 지난번 맡긴 사람은 늘 후보에 (s.prodPol)
function prodPolC(s, w) { return w.alb.polC || (w.alb.polC = albPolCands(s, s.prodPol)); }
// 맡긴 쪽은 그 사람 실력, 안 맡긴 쪽은 내가 직접 (편곡은 악기 · 작곡, 작사는 작사 실력)
function prodPol(s, p, sel) {
  const a = sel.arr && s.people[sel.arr], l = sel.lyr && s.people[sel.lyr];
  const da = a ? U.clamp(0.25 + lv(a, 'compose') * 0.02 + U.normal(0, 0.35), 0.5, 2.5) : U.clamp(0.3 + prodArr(p) * 0.03 + U.normal(0, 0.4), 0, 2.8);
  const dl = l ? U.clamp(0.25 + lv(l, 'lyric') * 0.015 + U.normal(0, 0.35), 0.5, 2) : U.clamp(0.1 + (has(p, 'lyric') ? lv(p, 'lyric') * 0.006 : 0) + U.normal(0, 0.2), 0, 0.8);
  return { dq: da + dl, arr: a ? a.name : '나', lyr: l ? l.name : '나', aid: a ? a.id : null, lid: l ? l.id : null };
}
// 내가 직접 편곡 · 작사로 다듬을 때 (악기 · 작곡 실력)
function prodSelfDq(p) { return U.clamp(0.4 + prodArr(p) * 0.03 + (has(p, 'lyric') ? lv(p, 'lyric') * 0.006 : 0) + U.normal(0, 0.5), 0, 3.5); }
E({
  id: 'prod_song', cat: '프로듀싱', title: '실을 곡 · 타이틀곡', tag: 'career',
  init(s, d) {
    const w = prodW(s, d); if (!w) { d.skip = true; return; }
    if (w.alb && w.alb.sel) { d.skip = true; return; }
    // 예전 세이브 · 기획 창을 못 거친 앨범: 대표 컨셉 하나에 외부 공모로 모은다
    if (!w.alb || !w.alb.five) prodCollect(s, w, [w.c || w.a.sig], ['open'].concat(has(me(s), 'compose') ? ['me'] : []), 0);
  },
  text: (s, d) => { const w = prodW(s, d), a = w.alb, j = s.people[a.by], need = Math.min(ALB_PICK, a.five.length); return `${w.a.name} 앨범 「${w.title}」에 실을 곡을 정할 차례다.\n\n모인 데모곡 ${a.n}곡 가운데 ${j ? `A&R 팀장 ${josa(j.name, '이가')}` : 'A&R팀이'} ${a.five.length}곡을 추려 왔다. 실을 ${need}곡을 체크하고, 그중 타이틀곡을 하나 찍자. 내 곡을 타이틀로 하면 저작권료를 더 받는다.\n\n남은 앨범 예산 ${fmtWon(prodLeft(w))} · 타이틀곡 값과 편곡 · 작사를 맡길 때 드는 돈이 여기서 나간다. 맡기지 않으면 내가 직접 다듬는다 (내 편곡 실력 ${Math.round(prodArr(me(s)))}).`; },
  form: (s, d) => { const w = prodW(s, d), p = me(s); return w.alb.five.map((x, i) => ({ k: 'p' + i, type: 'check', label: x.title })).concat(albPolFields(s, prodX(s, w), prodPolC(s, w), s.prodPol, { arr: [{ v: '', label: '내가 직접 편곡한다', sub: '악기 · 작곡 실력만큼 다듬어진다' }], lyr: [{ v: '', label: '내가 직접 다듬는다', sub: has(p, 'lyric') ? `작사 ${lvi(p, 'lyric')}레벨` : '작사를 못 해서 조금만 다듬어진다' }] }, () => p)); },
  tbl: (s, d) => {
    const w = prodW(s, d), v = me(s);
    const rows = w.alb.five.map((x, i) => { const c = x.mine ? v : x.cid && s.people[x.cid], tag = cTag(s, x.c, w.a.sig); return { k: 'p' + i, tr: x.c === s.trend, sig: x.c === w.a.sig, cells: {
      t: [x.title, `「${x.title}」`], by: [albBy(s, x), albBy(s, x)], c: [x.c, `${x.c}${tag ? ` (${tag})` : ''}`], lv: c ? coCellLv(v, c, 'compose', !!x.mine) : [-1, '?'],
      q: coCellG(grade5(v, x.q, 'q', 'compose'), 'q'), m: x.m == null ? [-1, '-'] : coCellG(grade5(v, x.m, 'pot', 'compose')), p: [x.price, x.price ? fmtWon(x.price) : '-'] } }; });
    return { cols: [['t', '제목'], ['by', '작곡가'], ['c', '컨셉'], ['lv', '작곡 레벨'], ['q', '완성도'], ['m', '컨셉 숙련도'], ['p', '곡값']], rows, radio: { k: 'ti', n: '타이틀' }, sort: ['q', -1] };
  },
  sum: (s, d, v) => { const w = prodW(s, d), r = prodPickRead(w, v); return `체크 ${r.idx.length}곡${r.ti >= 0 ? ` · 타이틀 「${w.alb.five[r.ti].title}」` : ''} · 드는 돈 ${fmtWon(prodPickCost(s, w, r))} · 남은 예산 ${fmtWon(prodLeft(w))}`; },
  // 자동 플레이: 내 귀로 들은 완성도가 좋은 곡부터, 타이틀은 예산 안에서
  sim: (s, d) => {
    const w = prodW(s, d), F = w.alb.five, need = Math.min(ALB_PICK, F.length), g = i => GRADE_W.q.indexOf(grade5(me(s), F[i].q, 'q', 'compose')) + (F[i].c === w.a.sig ? 0.5 : 0) + U.fl(0, 0.8);
    const I = F.map((x, i) => i).sort((a, b) => g(b) - g(a)), ti = I.find(i => F[i].price <= prodLeft(w)) ?? I.slice().sort((a, b) => F[a].price - F[b].price)[0];
    const v = { ti: 'p' + ti }; [ti].concat(I.filter(i => i !== ti)).slice(0, need).forEach(i => v['p' + i] = true);
    if (prodLeft(w) - F[ti].price > albPolCost(prodX(s, w)) * 1.5 && prodArr(me(s)) < 45) v.arr = prodPolC(s, w).arr[0] || '';
    return v;
  },
  submit(s, d, v) {
    const w = prodW(s, d), a = w.alb, p = me(s), need = Math.min(ALB_PICK, a.five.length), r = prodPickRead(w, v);
    if (r.idx.length !== need) return { err: `실을 곡을 ${need}곡 체크해 주세요 (지금 ${r.idx.length}곡)` };
    if (r.ti < 0) return { err: '체크한 곡 가운데 타이틀곡을 하나 찍어 주세요' };
    const cost = prodPickCost(s, w, r);
    if (cost > prodLeft(w)) return { err: `앨범 예산이 ${fmtWon(cost - prodLeft(w))} 모자라요` };
    const picks = r.idx.map(i => a.five[i]), ti = a.five[r.ti], x = prodX(s, w);
    const pol = r.pol.arr || r.pol.lyr ? prodPol(s, p, r.pol) : { dq: prodSelfDq(p), arr: '나', lyr: '나' };
    if (!r.pol.arr) for (const k of ['piano', 'keyboard', 'guitar']) if (has(p, k)) useSkill(s, p, k, 1);
    if (!r.pol.lyr && has(p, 'lyric')) useSkill(s, p, 'lyric', 1);
    a.spent += cost; a.sel = { p: r.idx, ti: r.ti, pol: r.pol }; s.prodPol = Object.assign({}, r.pol);
    for (const y of picks) { const c = y.cid && s.people[y.cid]; if (c && c.ind) { meetAt(s, c, `${w.a.name} 「${y.title}」`, 'producer'); bond(s, c, y === ti ? 3 : 1); } }
    for (const id of [pol.aid, pol.lid]) { const c = id && s.people[id]; if (c) { meetAt(s, c, `${w.a.name} 「${ti.title}」`, 'producer'); bond(s, c, 2); } }
    if (ti.mine) { cmGain(s, ti.c, 6); useSkill(s, p, 'compose', 2); } else useSkill(s, p, 'scout', 2);
    const side = picks.filter(y => y !== ti);
    w.sq = ti.q + pol.dq; w.own = !!ti.mine; w.c = ti.c; w.tt = ti.title; w.side = side.length ? side.reduce((n, y) => n + y.q, 0) / side.length : null;
    w.sub = side.filter(y => y.mine).map(y => y.title);
    w.mk = albMk(s, a, picks, ti, pol, '나');
    if (a.lost && U.chance(0.5)) queueEv(s, 'prod_lost', U.int(3, 6), { title: a.lost.title, by: a.lost.by, q: a.lost.q, a: w.a.name }, true);
    return { log: `${w.a.name} 앨범 「${w.title}」에 실을 곡을 정했다. 타이틀곡은 ${ti.mine ? '내가 쓴' : `${albBy(s, ti)}의`} 「${ti.title}」 ('${ti.c}' 컨셉). ${r.pol.arr || r.pol.lyr ? `${pol.arr === '나' ? '편곡은 내가 직접 한다' : `편곡은 ${pol.arr}에게 맡겼다`}. ${pol.lyr === '나' ? '작사는 내가 다듬는다' : `작사는 ${pol.lyr}에게 맡겼다`}.` : '편곡 · 작사는 내가 직접 다듬는다.'}` };
  },
});
// 심사에서 떨어진 곡이 다른 가수 곡으로 나와 잘됐다 (내 탓은 아니지만 아쉽다)
E({
  id: 'prod_lost', cat: '업계 소식', title: '놓친 곡', tag: 'career',
  init(s, d) { d.peak = U.clamp(Math.round(34 - (d.q - 55) * 1.6 + U.normal(0, 5)), 1, 50); },
  text: (s, d) => `${d.a} 앨범 심사에서 A&R팀이 떨어뜨린 ${josa(`「${d.title}」`, '이가')} 다른 가수의 곡으로 나와 차트 ${d.peak}위에 올랐다. (작곡 ${d.by})`,
  ch: (s, d) => [{ t: '확인', f: () => `${d.a} 앨범 심사에서 떨어진 ${josa(`「${d.title}」`, '이가')} 다른 곳에서 나와 차트 ${d.peak}위에 올랐다.` }],
});
// 프로듀서의 편곡 실력: 악기 또는 작곡
function prodVoc(p) { return jobMix([[lv(p, 'scout'), JS_], [Math.max(lv(p, 'vocal'), lv(p, 'rap')), JM_]]); }
function prodArr(p) { return Math.max(lv(p, 'piano'), lv(p, 'keyboard'), lv(p, 'guitar'), lv(p, 'compose') * 0.6); }
// 예전 세이브에 남은 녹음 디렉팅 창은 건너뛴다 (v155: 녹음은 고를 것 없는 한 달)
E({ id: 'prod_rec', cat: '프로듀싱', title: '녹음', tag: 'career', init(s, d) { d.skip = true; }, text: () => '', ch: () => [{ t: '확인', f: () => '' }] });
WORK_TYPES.produce = {
  n: '앨범 프로듀싱', ic: '🎛️',
  status: (s, w) => `${w.a.name} 앨범 「${w.title}」${w.c ? ` · '${w.c}' 컨셉` : ''} · ${w.left}개월 남음`,
  monthly(s, w) {
    const p = me(s); useSkill(s, p, 'compose', 1.6); useSkill(s, p, 'lyric', 0.5); for (const k of ['piano', 'keyboard', 'guitar']) if (has(p, k)) useSkill(s, p, k, 0.3); addStress(s, 2.5);
    // 첫 달엔 실을 곡을 정한다 → 편곡 · 작사 한 달 → 녹음 한 달 → 앨범이 나온다 (v155: 녹음 디렉팅 창은 없어졌다)
    if (w.left === 3) queueEv(s, 'prod_song', 0, { wid: w.id }, true);
    // 다른 일에 밀려 아직 못 정한 게 있으면 발매를 한 달 미룬다 (최대 석 달)
    if (w.left === 1 && (w.ext || 0) < 3 && (hasQ(s, 'prod_song') || hasQ(s, 'prod_plan'))) { w.left++; w.ext = (w.ext || 0) + 1; }
  },
  finish(s, w) {
    const t = s.tracks.producer, p = me(s), c = w.c || w.a.sig;
    // 회사가 허락한 의뢰(w.side): 프로듀서 직업이 없어도 앨범 수 · 히트 · 평판은 남겨 둔다 (나중에 프로듀서가 되면 이어진다)
    if (t.rep == null) t.rep = 10;
    t.albums = t.albums || 0; t.hits = t.hits || 0;
    const k0 = pTier(t, s);
    // 사내 프로듀서가 맡은 회사 그룹이면 그 그룹의 팬 수로 셈하고, 앨범이 잘되면 그 그룹 팬이 는다
    const g = w.inh && t.groups ? t.groups[w.a.gi] : null;
    const fans = g ? g.f : [5e3, 5e4, 5e5][w.a.tier - 1] * U.fl(0.5, 2);
    // v155: 타이틀곡 완성도 + 편곡 · 작사 (w.mk가 있으면 새 틀. 예전 세이브는 예전 식에 녹음 디렉팅 값)
    const q = w.mk ? w.sq + PROD_ADJ + t.rep * 0.05 : (w.sq != null ? w.sq : lv(p, 'compose') * 0.85 + cmBonus(s, c)) + (w.rq || 0) * 0.7 + t.rep * 0.05;
    const sc = songScore(s, { perf: 20 + w.a.tier * 8 + U.normal(0, 4), q, fans, tier: w.a.tier, trend: c === s.trend, bonus: 2 + (c === w.a.sig ? 3 : 0) });
    const peak = chartFromScore(sc);
    // 사내 프로듀서는 판권을 회사가 가져서 저작권료가 적고, 대신 크게 잘되면 성과급이 나온다
    const roy = addCatalog(s, w.title, '프로듀싱', sc, (w.own ? 1.5 : 1) * (w.inh ? 0.5 : 1), 'producer') + (w.sub || []).reduce((m, tt) => m + addCatalog(s, tt, '작곡', sc, 0.25, 'producer'), 0);
    if (g) g.f = Math.max(0, g.f + fanGainRaw(sc, g.f, 0.6 + w.a.tier * 0.2, starCap(60, 'kr')));
    const bonus = w.inh && t.mode === 'in' && peak && peak <= 10 ? Math.round(t.sal * (peak <= 3 ? 4 : 2)) : 0;
    if (bonus) earn(s, bonus, '성과급');
    t.albums++; if (peak && peak <= 10) t.hits++;
    t.rep = U.clamp(t.rep + (sc - 55) / 6, 0, 100);
    // 크게 잘되면 그 가수가 단골이 된다
    const fresh = !w.inh && !w.side && peak && peak <= 10 && !(t.clients || []).some(a => a.name === w.a.name);
    if (fresh) t.clients = (t.clients || []).concat([w.a]).slice(-4);
    addWork(s, { type: '프로듀싱 앨범', title: w.title, by: w.a.name, sc, note: chartText(peak) + (c ? ` · '${c}'` : ''), pay: (w.fee || 0) + bonus });
    if (t.albums === 1) milestone(s, `${age(s)}세에 처음으로 앨범을 프로듀싱했다 (${w.a.name} 「${w.title}」).`);
    if (peak && peak <= 5 && !t.hitMs) { t.hitMs = true; milestone(s, `${age(s)}세에 프로듀싱한 ${josa(`「${w.title}」`, '이가')} 차트 ${peak}위에 올랐다.`); }
    const k1 = pTier(t, s), up = !w.side && k1 > k0;
    if (up && k1 >= 4) milestone(s, `${age(s)}세에 ${josa(P_TIERS[k1], '이가')} 되었다.`);
    return { text: `${w.a.name}의 ${josa(`「${w.title}」`, '이가')} 나왔다. (내가 프로듀싱 · '${c}' 컨셉 · 타이틀곡 ${w.tt ? `「${w.tt}」 ${w.own ? '내 곡' : `작곡 ${w.mk.pk[0].by}`}` : w.own ? '내 곡' : w.sq != null ? '공모 곡' : '-'})${w.mk && w.mk.pk.length > 1 ? `\n실린 곡: ${w.mk.pk.map(x => `「${x.t}」 ${x.by}`).join(' · ')}` : ''}\n\n${chartText(peak)}\n매달 들어올 저작권료 약 ${fmtWon(roy)}\n프로듀서 평판 ${Math.round(t.rep)}` + (bonus ? `\n회사에서 성과급 ${fmtWon(bonus)}을 받았다.` : '') + (fresh ? `\n\n${josa(w.a.name, '이가')} 다음 앨범도 맡기고 싶어 한다. (단골 가수)` : '') + (up ? `\n\n🎉 ${josa(P_TIERS[k1], '으로')} 올라섰다!` : ''), log: `프로듀싱한 ${w.a.name}의 「${w.title}」 ${chartText(peak)}.` + (up ? ` ${josa(P_TIERS[k1], '으로')} 올라섰다.` : '') };
  },
};

// ════════ 회사 직원 계약 (A&R·트레이너 공통) ════════
// 2년 계약. 끝나면 회사가 그동안의 평가를 보고 재계약을 제안하거나(월급을 협상할 수 있다) 내보낸다
// 직원 계약은 다른 회사와 계약하는 것만 막고, 혼자 하는 활동(인디 밴드·인디 가수 등)은 막지 않는다
const EMP_N = { anr: 'A&R', trainer: '트레이너', producer: '사내 프로듀서' };
const EMP_KEEP = 15;
// 월급이 오를 수 있는 끝: 그 자리(직원·팀장)를 시작할 때 받은 월급의 2.2배. 팀장이 되면 팀장 첫 월급이 새 기준이 된다
function empSalCap(t) { return Math.round((t.salBase || t.sal) * 2.2 / 1e5) * 1e5; }
function empMonth(s, kind, t) { if (t.cEnd == null) t.cEnd = t.months + 12; if (t.months >= t.cEnd) queueEv(s, 'emp_renew', 0, { kind }); }
// 팀장: 평가 70을 넘으면 팀장이 되고(월급이 오른다), 40 밑으로 떨어지면 내려온다
// 팀장은 책임이 크다: 내 성과가 팀 평가에 1.8배로 반영된다 (오를 때도 떨어질 때도)
const LEAD_UP = 70, LEAD_DOWN = 40, LEAD_MULT = 1.8;
function leadRaise(kind) { return 1.3; }
function empRep(s, kind, t, v) { t.rep = U.clamp(t.rep + v * (t.lead ? LEAD_MULT : 1), 0, 100); return empLeadCheck(s, kind, t); }
function empLeadCheck(s, kind, t) {
  if (!t.lead && t.rep >= LEAD_UP) {
    t.lead = true; t.everLead = true; t.salBase0 = t.salBase || t.sal; t.sal = Math.round(t.sal * leadRaise(kind) / 1e5) * 1e5; t.salBase = t.sal;
    const b = s.people[t.boss]; if (b && kind === 'anr') b.job = 'A&R 본부장';
    milestone(s, `${age(s)}세에 ${t.agN} ${EMP_N[kind]} 팀장이 되었다.`);
    addLog(s, `${t.agN} ${EMP_N[kind]} 팀장이 되었다! 월급이 ${fmtWon(t.sal)}으로 올랐다.`, 'good');
    return 'up';
  }
  if (t.lead && t.rep < LEAD_DOWN) {
    t.lead = false; t.sal = Math.round(t.sal / leadRaise(kind) / 1e5) * 1e5; t.salBase = t.salBase0 || t.sal;
    addLog(s, `평가가 떨어져 ${t.agN} ${EMP_N[kind]} 팀장 자리에서 내려왔다. 월급도 ${fmtWon(t.sal)}으로 줄었다.`, 'career');
    return 'down';
  }
  return '';
}
// 경력: 예전에 같은 일을 한 기간(개월)과 성과. 채용될 때 더 좋게 봐 주고, 오래 했거나 팀장을 해 봤으면 처음부터 팀장으로 들어간다
function empExpMonths(s, kind) { return (s.careerLog || []).filter(c => c.id === kind && c.from != null && c.to != null).reduce((a, c) => a + Math.max(0, c.to - c.from), 0); }
function empExpBonus(s, kind) { const t = s.tracks[kind] || {}; return Math.min(10, empExpMonths(s, kind) / 12 * 1.5 + (kind === 'anr' ? (t.hits || 0) * 0.8 : (t.debuts || 0)) + (t.everLead ? 3 : 0)); }
function empStartLead(s, kind) { return !!(s.tracks[kind] || {}).everLead || empExpMonths(s, kind) >= 60; }
// 처음 월급: 경력 1년마다 5% 더 (최대 30%), 팀장으로 들어가면 팀장 월급
function empStartSal(s, kind, base, lead) { return Math.round(base * (1 + Math.min(0.3, empExpMonths(s, kind) / 12 * 0.05)) * (lead ? leadRaise(kind) : 1) / 1e5) * 1e5; }
function empStartRep(s, kind, lead) { const r = 20 + Math.min(25, empExpMonths(s, kind) / 12 * 4); return lead ? Math.max(r, 50) : r; }
function leaveEmp(s, kind, why) {
  // 사내 프로듀서는 회사를 나와도 프로듀서 일은 이어 간다 (프리랜서로)
  if (kind === 'producer') return pinLeave(s, why);
  // 애니메이터는 회사를 나와도 프리랜서로 이어 간다
  if (kind === 'animator') return anLeave(s, why);
  const t = s.tracks[kind];
  t.st = 'ended'; t.endNote = `${t.agN} ${EMP_N[kind]} (${why})`;
  if (t.students) for (const id of t.students) { const x = s.people[id]; if (x && x.rel === '제자') x.rel = '지인'; }
  return `${josa(t.agN, '을를')} 나왔다.`;
}
function renewEmp(s, kind, d) {
  const t = s.tracks[kind];
  t.sal = d.sal; t.cEnd = t.months + d.months;
  return `${josa(t.agN, '과와')} 재계약했다. (월급 ${fmtWon(d.sal)} · ${yrs(d.months)})`;
}
function empNego(kind, start) {
  return {
    what: d => d.renew ? `그동안의 평가(${Math.round(d.rep)})를 보고 월급을 정했다. (지금 월급 ${fmtWon(d.cur)})` : `${EMP_N[kind]} 직원 계약이다. 계약 기간이 끝나면 그동안의 평가를 보고 재계약한다.`,
    block: (s, d) => !d.renew && agencyContract(s) ? contractWhy(s) : '',
    sign: (s, d) => d.renew ? renewEmp(s, kind, d) : start(s, d),
    refuse: (s, d) => d.renew ? leaveEmp(s, kind, '재계약 안 함') : '입사 제안을 거절했다.',
    lost: (s, d) => d.renew ? `${josa(d.agN, '이가')} 재계약 제안을 거둬들였다. 계약 기간이 끝나 회사를 나오게 됐다.` + (leaveEmp(s, kind, '재계약 불발'), '') + fx(s, { stress: 5 }) : `${d.agN}에서 채용을 없던 일로 했다.` + fx(s, { stress: 5 }),
  };
}
E({
  id: 'emp_renew', cat: '계약', title: '직원 계약 만료', tag: 'career',
  init(s, d) {
    const t = s.tracks[d.kind];
    if (!trackOn(s, d.kind) || t.cEnd == null || t.months < t.cEnd) { d.skip = true; return; }
    d.rep = t.rep;
    if (t.rep >= EMP_KEEP) {
      // 평가가 좋을수록 월급을 많이 올려 준다. 조건은 협상할 수 있다
      const up = t.rep >= 70 ? 0.1 : t.rep >= 45 ? 0.06 : 0.03, cap = empSalCap(t);
      d.skip = true;
      startNego(s, { kind: d.kind, renew: true, ag: t.ag, agN: t.agN, rep: t.rep, cur: t.sal, salCap: cap, sal: Math.min(Math.max(t.sal, cap), Math.round(t.sal * (1 + up) / 1e5) * 1e5), months: 24, lev: U.clamp(t.rep / 100, 0.1, 0.9) });
    }
  },
  text: (s, d) => { const t = s.tracks[d.kind]; return `${josa(t.agN, '과와')}의 계약 기간이 끝났다. 회사는 재계약하지 않기로 했다. 그동안의 평가가 ${Math.round(d.rep)}에 그쳤다는 이유다.\n\n다른 회사에 다시 지원할 수 있다.`; },
  ch: (s, d) => [{ t: '짐을 정리한다', f: s => leaveEmp(s, d.kind, '재계약 안 됨') + fx(s, { stress: 6 }) }],
});

// ════════ 사내 프로듀서 (기획사 소속 프로듀서) ════════
// A&R처럼 2년 직원 계약. 월급을 받고, 회사가 소속 그룹 둘의 앨범을 차례로 맡긴다 (pinAssign)
// 앨범 하나하나는 프리랜서와 똑같이 컨셉·타이틀곡·녹음을 정한다. 저작권료는 절반, 차트 10위 안이면 월급 2배(3위 안이면 4배) 성과급
// 재계약은 프로듀서 평판으로 본다. 회사를 나오면 프리랜서 프로듀서로 돌아간다
const PIN_SAL = [0, 250, 350, 500];
const PIN_THR = [0, 28, 38, 48];
// v99 (8-5): 작곡(강함) · 스카우트(보통) + 평판 · 앨범 수 + 면접 통찰력(보통, 가산점). 작사 · 악기는 뺐다
function pinScore(s) { const p = me(s), t = s.tracks.producer || {}; return jobMix([[lv(p, 'compose'), JS_], [lv(p, 'scout'), JM_]]) + Math.max(t.rep || 0, (s.tracks.composer.rep || 0) * 0.6) * 0.25 + Math.min(10, (t.albums || 0) * 1.5) + talB(p.tal.insight, false); }
function pinReady(s) { return producerReady(s) || (s.tracks.producer.albums || 0) > 0; }
// v206: 회사마다 따로 (구직활동 회사별 보기에서 그 회사 아래에). 같은 회사는 반년 뒤 다시
function staffAgs(kinds) { return AGENCIES.filter(a => kinds.includes(a.kind) && a.mkt === 'kr'); }
for (const ag of staffAgs(['music'])) JOB_APPLY.push({
  id: 'pin_' + ag.id, trk: 'producer', g: '🎛️ 프로듀서', get n() { return `${ag.n} 사내 프로듀서 채용`; }, tag: `${TIER_N[ag.tier]} · 월급 ${PIN_SAL[ag.tier]}만 원`,
  show: s => !pinOn(s) && age(s) >= 20,
  h: s => `합격 가능성 ${fmtPct(audP(coFocus(s, 'pin', ag.con, pinScore(s)) + empExpBonus(s, 'producer'), PIN_THR[ag.tier]))} · 결과는 다음 달 · 회사 소속 그룹의 앨범을 맡는다 · 작곡 실력과 평판을 본다`,
  ok: s => pinReady(s) && !s.army && !agencyContract(s) && !busyWith(s, 'produce') && !hasQ(s, 'pin_res') && !(s.cd['pin_' + ag.id] > s.t),
  why: s => s.army ? '군 복무 중' : agencyContract(s) ? contractWhy(s) : busyWith(s, 'produce') ? '맡은 앨범 작업을 먼저 끝내야 한다' : !pinReady(s) ? `아직 조건이 안 된다 (작곡 ${lvi(me(s), 'compose')}레벨 · 작곡가 평판 ${Math.round(s.tracks.composer.rep || 0)} · 히트 ${s.tracks.composer.hits || 0}곡)` : hasQ(s, 'pin_res') ? '결과를 기다리는 중' : '얼마 전에 지원했다 (반년 뒤 다시)',
  run: s => { s.cd['pin_' + ag.id] = s.t + 6; queueEv(s, 'pin_res', 1, { ag: ag.id, p: audP(coFocus(s, 'pin', ag.con, pinScore(s)) + empExpBonus(s, 'producer'), PIN_THR[ag.tier]) }); return `${ag.n} 사내 프로듀서 채용에 지원했다.`; },
});
E({
  id: 'pin_res', cat: '채용', title: '사내 프로듀서 채용 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); d.sal = empStartSal(s, 'producer', PIN_SAL[AG[d.ag].tier] * 1e4, false); },
  text: (s, d) => d.pass ? `${AG[d.ag].n} 사내 프로듀서로 합격했다! 회사가 제시한 월급은 ${fmtWon(d.sal)}.\n\n회사가 소속 그룹의 앨범을 차례로 맡긴다. 앨범이 크게 잘되면 성과급이 나온다.` : `${AG[d.ag].n} 사내 프로듀서 채용에 떨어졌다.`,
  ch: (s, d) => d.pass ? [
    { t: '입사 조건을 들어 본다', ok: s => !agencyContract(s) && !busyWith(s, 'produce'), h: agencyContract(s) ? contractWhy(s) : busyWith(s, 'produce') ? '맡은 앨범 작업을 먼저 끝내야 한다' : '월급을 협상할 수 있다', f: s => startNego(s, { kind: 'producer', ag: d.ag, agN: AG[d.ag].n, sal: d.sal, months: 24, lev: U.clamp((d.p - 0.5) * 0.8 + 0.3, 0.05, 0.8) }) },
    { t: '거절한다', f: () => '입사 제안을 거절했다.' },
  ] : [{ t: '확인', f: () => `${AG[d.ag].n} 사내 프로듀서 채용에 떨어졌다.` }],
});
function startPin(s, d) {
  const ag = AG[d.ag], old = s.tracks.producer || { st: 'none' }, was = trackOn(s, 'producer');
  const groups = [0, 1].map(() => ({ name: newGroupName(s), kind: U.pick(['걸그룹', '보이그룹']), sig: U.pick(TRENDS), f: Math.round([3e3, 3e4, 3e5][ag.tier - 1] * U.fl(0.5, 2)) }));
  const t = s.tracks.producer = Object.assign({}, old, { st: 'active', mode: 'in', ag: d.ag, agN: ag.n, tier: ag.tier, months: was ? old.months || 0 : 0, rep: Math.max(10, old.rep || 0, (s.tracks.composer.rep || 0) * 0.6), albums: old.albums || 0, hits: old.hits || 0, sal: d.sal, salBase: d.sal, groups, next: 2 });
  t.cEnd = t.months + d.months;
  milestone(s, `${age(s)}세에 ${ag.n} 사내 프로듀서가 되었다.`);
  if (!t.sn) askStageName(s, 'producer');
  return `${ag.n}에 사내 프로듀서로 입사했다. 월급 ${fmtWon(d.sal)} · 계약 ${yrs(d.months)}. 맡은 그룹은 ${groups.map(g => g.name).join('·')}.`;
}
NEGO.producer = empNego('producer', startPin);
function pinLeave(s, why) {
  const t = s.tracks.producer, n = t.agN;
  t.mode = 'free'; t.pastAg = (t.pastAg || []).concat(`${n} 사내 프로듀서 (${why})`);
  for (const k of ['ag', 'agN', 'tier', 'cEnd', 'sal', 'salBase', 'groups', 'next']) delete t[k];
  return `${josa(n, '을를')} 나왔다. 이제 프리랜서 프로듀서로 일한다.`;
}

// ════════ A&R 담당자 ════════
// 기획사 직원. 작곡가들이 보낸 데모를 팀이 나눠 듣고 다섯 곡으로 추린다 (v155: 앨범 제작 틀의 ③ 심사). 내가 올린 곡이 뜨면 성과급을 받는다
// 스카우트 특기가 있으면 데모의 완성도가 범위로 보인다 (스카우트가 높을수록 좁다)
const ANR_SAL = [0, 170, 200, 240];
const ANR_THR = [0, 12, 20, 28];
// v99 (8-5): 스카우트(강함) · 학업(보통, 서류) + 음감(강함, 가산점: '귀') + 면접 통찰력(보통, 가산점). 음악 특기는 음감이 대신 본다
function anrScore(s) { const p = me(s); return jobMix([[lv(p, 'scout'), JS_], [lv(p, 'study'), JM_]]) + talB(p.tal.music, true) + talB(p.tal.insight, false); }
for (const ag of staffAgs(['music'])) JOB_APPLY.push({
  id: 'anr_' + ag.id, trk: 'anr', g: '🎧 A&R 담당자', get n() { return `${ag.n} A&R 채용`; }, tag: `${TIER_N[ag.tier]} · 월급 ${ANR_SAL[ag.tier]}만 원`,
  show: s => !trackOn(s, 'anr') && age(s) >= 20,
  h: s => `합격 가능성 ${fmtPct(audP(anrScore(s) + empExpBonus(s, 'anr'), ANR_THR[ag.tier]))} · 결과는 다음 달 · 곡을 고르는 안목(스카우트)과 소리를 듣는 귀, 학업을 본다`,
  ok: s => !s.army && !agencyContract(s) && !hasQ(s, 'anr_res') && !(s.cd['anr_' + ag.id] > s.t),
  why: s => s.army ? '군 복무 중' : agencyContract(s) ? contractWhy(s) : hasQ(s, 'anr_res') ? '결과를 기다리는 중' : '얼마 전에 지원했다 (반년 뒤 다시)',
  run: s => { s.cd['anr_' + ag.id] = s.t + 6; queueEv(s, 'anr_res', 1, { ag: ag.id, p: audP(anrScore(s) + empExpBonus(s, 'anr'), ANR_THR[ag.tier]) }); return `${ag.n} A&R 채용에 지원했다.`; },
});
E({
  id: 'anr_res', cat: '채용', title: 'A&R 채용 결과', tag: 'career',
  // 경력이 길거나 팀장을 해 봤으면 처음부터 팀장 자리로 뽑는다
  init(s, d) { d.pass = U.chance(d.p); d.lead = d.pass && empStartLead(s, 'anr'); d.sal = empStartSal(s, 'anr', ANR_SAL[AG[d.ag].tier] * 1e4, d.lead); },
  text: (s, d) => d.pass ? `${AG[d.ag].n} A&R팀에 ${d.lead ? '팀장으로 ' : ''}합격했다! 회사가 제시한 월급은 ${fmtWon(d.sal)}.${d.lead ? '\n\n그동안의 경력을 보고 처음부터 팀장 자리를 맡긴다.' : ''}\n\n일정에 'A&R 업무'를 넣으면 데모곡을 듣고 소속 그룹에 맞는 곡을 고른다.` : `${AG[d.ag].n} A&R 채용에 떨어졌다.`,
  ch: (s, d) => d.pass ? [
    { t: '입사 조건을 들어 본다', ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '월급을 협상할 수 있다', f: s => startNego(s, { kind: 'anr', ag: d.ag, agN: AG[d.ag].n, sal: d.sal, lead: d.lead, months: 24, lev: U.clamp((d.p - 0.5) * 0.8 + 0.3, 0.05, 0.8) }) },
    { t: '거절한다', f: () => '입사 제안을 거절했다.' },
  ] : [{ t: '확인', f: () => `${AG[d.ag].n} A&R 채용에 떨어졌다.` }],
});
function startAnr(s, d) {
  const ag = AG[d.ag], tag = learnMe(s, 'scout', null, false, true);
  const groups = [0, 1].map(() => ({ name: newGroupName(s), kind: U.pick(['걸그룹', '보이그룹']), sig: U.pick(TRENDS), f: Math.round([3e3, 3e4, 3e5][ag.tier - 1] * U.fl(0.5, 2)) }));
  const old = s.tracks.anr, lead = !!d.lead;
  s.tracks.anr = { st: 'active', ag: d.ag, agN: ag.n, tier: ag.tier, months: 0, cEnd: d.months, rep: empStartRep(s, 'anr', lead), lead, everLead: !!old.everLead || lead, picks: old.picks || 0, hits: old.hits || 0, sal: d.sal, salBase: d.sal, salBase0: lead ? Math.round(d.sal / leadRaise('anr') / 1e5) * 1e5 : d.sal, next: U.int(2, 3), idle: 0, groups, boss: ((!lead && typeof coTeamPeople === 'function' ? coTeamPeople(s, d.ag + '#anr')[0] : null) || pickIndustry(s, 'A&R 담당자')).id };
  const boss = s.people[s.tracks.anr.boss]; meetAt(s, boss, `${ag.n} A&R팀`, 'anr'); boss.job = lead ? 'A&R 본부장' : 'A&R 팀장';
  milestone(s, `${age(s)}세에 ${ag.n} A&R ${lead ? '팀장으로 들어갔다' : '담당자가 되었다'}.`);
  return `${ag.n} A&R팀에 ${lead ? '팀장으로 ' : ''}입사했다. 월급 ${fmtWon(d.sal)} · 계약 ${yrs(d.months)}. ${lead ? '본부장' : '팀장'}은 ${boss.name}.` + tag;
}
NEGO.anr = empNego('anr', startAnr);
CAREERS.anr = {
  n: 'A&R 담당자', ic: '🎧',
  desc: '기획사 직원. 그룹 앨범에 모인 데모곡을 팀이 나눠 듣는다. 팀원은 내 몫에서 좋은 곡을 골라 팀장에게 올리고, 팀장은 다섯 곡을 확정한다. 내가 올린 곡이 타이틀이 되어 뜨면 성과급을 받는다. 스카우트가 중요하다.',
  act: { n: 'A&R 업무 (데모 듣기·곡 찾기)', ic: '🎧', g: '직업 활동', eff: [['스카우트', '↑↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) { return t.st !== 'active' ? (t.endNote || '') : `${t.agN} A&R${t.lead ? ' 팀장' : ''} · 고른 곡 ${t.picks}곡 · 히트 ${t.hits}곡 · 업무 평가 ${Math.round(t.rep)} · 월급 ${fmtWon(t.sal)}`; },
  short(s, t) { return `${t.agN} A&R`; },
  title(s, t) { return t.picks ? (t.hits >= 3 ? '히트곡을 찾아낸 A&R' : 'A&R 담당자') : null; },
  contract(s, t) { return t.st === 'active' ? `${t.agN} (A&R 직원)` : ''; },
  emp: true,
  cLeft(s, t) { return t.st === 'active' && t.cEnd != null ? t.cEnd - t.months : null; },
  mainSk() { return 'scout'; },
  info(s, t) {
    const p = me(s), boss = s.people[t.boss];
    return [['회사', `${t.agN} (${TIER_N[t.tier]} 기획사) A&R${t.lead ? ' 팀장' : ''}`], ['월급', fmtWon(t.sal)], ['내 실력', ['scout', 'compose', 'lyric', 'study'].filter(k => has(p, k)).map(k => `${SKILLS[k].n} ${lvi(p, k)}`).join(' · ')], ['업무 평가', `${Math.round(t.rep)}`], ['고른 곡', `${t.picks}곡 · 히트 ${t.hits}곡`], boss ? [t.lead ? '본부장' : '팀장', `${boss.name} · ${relWord(boss)}`] : ['팀장', '-'], { h: '맡은 그룹', items: t.groups.map(g => `${g.name} (${g.kind}) · 팬 ${fmtFans(g.f)}${g.sig ? ` · 대표 컨셉 '${g.sig}'` : ''}`) }].filter(Boolean);
  },
  actions(s, t) { return t.st === 'active' ? [{ t: '회사 그만두기', h: '직원 계약이라 위약금은 없다', ok: true, danger: true, confirm: '정말 회사를 그만둘까요?', run: s => { t.st = 'ended'; t.endNote = `${t.agN} A&R (퇴사)`; return `${josa(t.agN, '을를')} 그만뒀다.`; } }] : []; },
  monthly(s, t) {
    if (t.st !== 'active') return;
    t.months++;
    empMonth(s, 'anr', t);
    earn(s, t.sal, '월급', 'anr');
    const n = slotsOn(s, 'c_anr'), p = me(s);
    if (!n) { t.idle++; if (t.idle >= 4) { t.idle = 0; queueEv(s, 'anr_warn', 0); } return; }
    t.idle = 0;
    practice(s, p, 'scout', 1.2 * n, 1);
    for (const k of ['compose', 'lyric']) useSkill(s, p, k, 0.2 * n);
    addStress(s, 2);
    t.next--;
    if (t.next <= 0 && !hasQ(s, 'anr_pick') && !hasQ(s, 'anr_out')) { t.next = U.int(3, 5); queueEv(s, 'anr_pick', 0); }
  },
};
E({
  id: 'anr_warn', cat: 'A&R', title: s => s.tracks.anr.lead ? '본부장의 잔소리' : '팀장의 잔소리', tag: 'career',
  cond: s => trackOn(s, 'anr'),
  text: s => s.tracks.anr.lead ? `본부장이 불렀다. 팀장이 요즘 데모를 하나도 안 듣는 것 같다고 한다. 팀장이 손을 놓으면 팀 전체가 흔들린다. 일정에 'A&R 업무'를 넣어야 일을 한다.` : `팀장이 불렀다. 요즘 데모를 하나도 안 듣는 것 같다고 한다. 일정에 'A&R 업무'를 넣어야 일을 한다.`,
  ch: () => [{ t: '죄송합니다', f: s => { const t = s.tracks.anr; empRep(s, 'anr', t, -8); if (t.rep <= 0) { t.st = 'ended'; t.endNote = `${t.agN} A&R (해고)`; return '결국 회사에서 나가 달라는 통보를 받았다.' + fx(s, { stress: 10 }); } return '다음부터 잘하겠다고 했다.' + fx(s, { stress: 4 }); } }],
});
// 데모곡 완성도는 숨어 있고 5단계로 보인다 (스카우트가 높을수록 '보통'이 좁아져 더 잘 가려낸다)
function demoGuess(s, q) { return `완성도 ${grade5(me(s), q, 'q', 'compose')}`; }
// ───── A&R 심사 (v155, 앨범 제작 틀 album.js) ─────
// 그룹 앨범 하나에 모인 데모곡을 A&R팀이 나눠 듣는다
//   팀원(나): 내 몫으로 온 묶음에서 두 곡을 팀장에게 올린다 → 팀장(인물)이 팀원들이 올린 곡에서 다섯 곡을 확정한다
//   팀장(나): 팀원들이 올린 곡(열 곡쯤)에서 다섯 곡을 확정한다
// 그 뒤 그 그룹을 맡은 사람(소형 회사는 대표, 중 · 대형은 전담 프로듀서)이 세 곡과 타이틀곡을 고른다
// 내가 올린 곡이 타이틀이 되어 잘되면 성과급 · 평가가 오르고, 내가 떨어뜨린 곡이 다른 데서 히트하면 평가가 내려간다
const ANR_UP = 2, ANR_POOL = 10;
// 곡 점수를 예전 평균에 맞추는 값 (v155 기준선)
const ANR_ADJ = 9;
function anrTeam(s, t) { return AG[t.ag] && typeof coTeamPeople === 'function' ? coTeamPeople(s, t.ag + '#anr') : []; }
// 확정하는 팀장 (내가 팀원일 때). 팀이 없는 예전 세이브는 t.boss
function anrLeadP(s, t) { return t.lead ? null : anrTeam(s, t)[0] || s.people[t.boss] || null; }
// 같이 듣는 팀원들 (내가 팀장이면 원래 팀장은 선임으로 팀원 자리에)
function anrMates(s, t) { const L = anrTeam(s, t); return t.lead ? L : L.slice(1); }
// 이번 앨범: 그룹 · 컨셉 · 곡을 모은 곳 · 모인 곡을 정해 두고, 팀원들 몫을 나눈다
function anrSetup(s, d) {
  const t = s.tracks.anr;
  d.gi = d.gi != null && t.groups[d.gi] ? d.gi : U.int(0, t.groups.length - 1);
  for (const g of t.groups) if (!g.sig) g.sig = U.pick(TRENDS);
  // 가끔은 여러 그룹에서 멤버를 모은 프로젝트 그룹의 앨범이다 (v156)
  if (!d.pg && U.chance(0.1)) d.pg = { name: newGroupName(s), kind: '프로젝트 그룹', sig: U.pick(TRENDS), f: Math.round(t.groups.reduce((a, y) => a + y.f, 0) * 0.3) };
  const g = anrG(s, d), c = U.chance(0.6) ? g.sig : U.chance(0.6) ? s.trend : U.pick(TRENDS);
  const src = ['open'].concat(t.tier >= 2 && U.chance(t.tier >= 3 ? 0.8 : 0.5) ? ['name'] : [], t.tier >= 3 && U.chance(0.4) ? ['camp'] : []);
  const x = { tier: t.tier, rep: 20 + t.tier * 15, sig: g.sig, mem: [], cs: [c], src, budget: null };
  const demos = U.shuffle(albDemos(s, x)), mates = anrMates(s, t), m = mates.length + 1;
  d.cs = x.cs; d.src = src; d.n = demos.length;
  d.mates = mates.map(p => p.id);
  if (t.lead) {
    // 팀원들이 저마다 몫에서 고른 곡이 올라온다 (열 곡쯤)
    const per = Math.max(2, Math.ceil(ANR_POOL / Math.max(1, mates.length)));
    d.list = []; d.drop = [];
    mates.forEach((p, i) => { const B = demos.filter((y, j) => j % mates.length === i), up = anrHear(B, p, x).slice(0, per); for (const y of up) y.up = p.id; d.list.push(...up); d.drop.push(...B.filter(y => !up.includes(y))); });
    if (!mates.length) { d.list = demos.slice(0, ANR_POOL); d.drop = demos.slice(ANR_POOL); }
  } else {
    // 내 몫: 고르게 나누되 너무 적거나 많지 않게
    const k = U.clamp(Math.round(demos.length / m), 4, 8);
    d.list = demos.slice(0, k); d.rest = demos.slice(k);
  }
  return d;
}
// 그 사람의 귀로 들은 순서 (좋게 들린 곡부터)
function anrG(s, d) { return d.pg || s.tracks.anr.groups[d.gi]; }
function anrHear(B, p, x) { const sd = albEarOf(p); return B.map(y => ({ y, v: y.q + U.normal(0, sd) + (x.cs.includes(y.c) ? 3 : 0) })).sort((a, b) => b.v - a.v).map(z => z.y); }
function anrNeed(s, d) { return s.tracks.anr.lead ? Math.min(ALB_KEEP, d.list.length) : Math.min(ANR_UP, d.list.length); }
function anrRead(d, v) { return d.list.map((y, i) => i).filter(i => albOn(v, 'p' + i)); }
E({
  id: 'anr_pick', cat: 'A&R', tag: 'career',
  title: s => s.tracks.anr && s.tracks.anr.lead ? '다섯 곡 확정' : '데모곡 심사',
  cond: s => trackOn(s, 'anr'),
  init(s, d) { if (!trackOn(s, 'anr') || !(s.tracks.anr.groups || []).length) { d.skip = true; return; } anrSetup(s, d); },
  text: (s, d) => {
    if (!d.list) anrSetup(s, d);
    const t = s.tracks.anr, g = anrG(s, d), L = anrLeadP(s, t), boss = agProd(s, t.ag, g).n, need = anrNeed(s, d);
    const head = d.pg ? `${t.agN}에서 소속 그룹들의 멤버를 모아 프로젝트 그룹 「${g.name}」을 꾸렸다 (원래 팬 ${fmtFans(g.f)}). 앨범 한 장에 '${d.cs[0]}' 컨셉으로 데모곡 ${d.n}곡이 모였다.` : `${t.agN} 소속 ${g.name}(${g.kind}, 팬 ${fmtFans(g.f)})의 다음 앨범에 '${d.cs[0]}' 컨셉으로 데모곡 ${d.n}곡이 모였다.`;
    const tail = `\n\n${g.name}의 대표 컨셉 '${g.sig}' · 요즘 유행 '${s.trend}'`;
    if (t.lead) return `${head} 팀원들이 나눠 듣고 ${d.list.length}곡을 올려 왔다. 팀장인 내가 다섯 곡을 확정하자.\n\n${josa(boss, '이가')} 그중 세 곡과 타이틀곡을 고른다. 팀장은 기대치가 높다: 다섯 곡 모두 내 책임이다.` + tail;
    return `${head} 팀원들이 나눠 듣는다. 내 몫으로 온 ${d.list.length}곡 가운데 팀장 ${L ? L.name : ''}에게 올릴 ${need}곡을 체크하자.\n\n팀장이 팀원들이 올린 곡에서 다섯 곡을 확정하고, ${josa(boss, '이가')} 그중 세 곡과 타이틀곡을 고른다. 내가 올린 곡이 타이틀이 되어 잘되면 성과급을 받는다.` + tail;
  },
  form: (s, d) => { if (!d.list) anrSetup(s, d); return d.list.map((y, i) => ({ k: 'p' + i, type: 'check', label: y.title })); },
  tbl: (s, d) => {
    if (!d.list) anrSetup(s, d);
    const v = me(s), g = anrG(s, d);
    const rows = d.list.map((y, i) => { const c = y.cid && s.people[y.cid], up = y.up && s.people[y.up], tag = cTag(s, y.c, g.sig); return { k: 'p' + i, tr: y.c === s.trend, sig: y.c === g.sig, cells: Object.assign({
      t: [y.title, `「${y.title}」`], by: [albBy(s, y), albBy(s, y)], c: [y.c, `${y.c}${tag ? ` (${tag})` : ''}`], lv: c ? coCellLv(v, c, 'compose', false) : [-1, '?'],
      q: coCellG(grade5(v, y.q, 'q', 'compose'), 'q'), m: y.m == null ? [-1, '-'] : coCellG(grade5(v, y.m, 'pot', 'compose')), p: [y.price, y.price ? fmtWon(y.price) : '-'] }, s.tracks.anr.lead ? { up: [up ? up.name : '', up ? up.name : '-'] } : {}) }; });
    return { cols: [['t', '제목'], ['by', '작곡가'], ['c', '컨셉'], ['lv', '작곡 레벨'], ['q', '완성도'], ['m', '컨셉 숙련도'], ['p', '곡값']].concat(s.tracks.anr.lead ? [['up', '올린 팀원']] : []), rows, sort: ['q', -1], ckN: s.tracks.anr.lead ? '확정' : '올릴 곡' };
  },
  sum: (s, d, v) => `체크 ${anrRead(d, v).length}곡 / ${anrNeed(s, d)}곡`,
  // 자동 플레이: 내 귀로 들은 완성도가 좋은 곡부터
  sim: (s, d) => { const g = anrG(s, d), f = i => GRADE_W.q.indexOf(grade5(me(s), d.list[i].q, 'q', 'compose')) + (d.list[i].c === g.sig ? 0.4 : 0) + U.fl(0, 0.9), v = {}; d.list.map((y, i) => i).sort((a, b) => f(b) - f(a)).slice(0, anrNeed(s, d)).forEach(i => v['p' + i] = true); return v; },
  submit(s, d, v) {
    const t = s.tracks.anr, p = me(s), need = anrNeed(s, d), I = anrRead(d, v);
    if (I.length !== need) return { err: `${need}곡을 체크해 주세요 (지금 ${I.length}곡)` };
    const g = anrG(s, d), x = { tier: t.tier, rep: 20 + t.tier * 15, sig: g.sig, mem: [], cs: d.cs, src: d.src, budget: null };
    const mine = I.map(i => d.list[i]), L = anrLeadP(s, t);
    useSkill(s, p, 'scout', 2);
    let five, all, lost = null;
    if (t.lead) { five = mine; all = d.list.concat(d.drop || []); }
    else {
      // 다른 팀원들도 저마다 몫에서 두 곡씩 올리고, 팀장이 올라온 곡에서 다섯 곡을 확정한다
      const mates = (d.mates || []).map(id => s.people[id]).filter(Boolean), rest = d.rest || [], up = mine.slice();
      mates.forEach((q, i) => up.push(...anrHear(rest.filter((y, j) => j % mates.length === i), q, x).slice(0, ANR_UP)));
      five = albScreen(s, x, up, L || { sd: 8 }).five; all = d.list.concat(rest);
    }
    // 놓친 곡: 다섯 곡에 못 든 곡이 눈에 띄게 좋았을 때. 내 손에서 떨어졌으면 내 탓이다
    const out = all.filter(y => !five.includes(y)).sort((a, b) => b.q - a.q)[0], top = Math.max(...five.map(y => y.q));
    if (out && out.q >= 55 && out.q > top + 4) lost = { title: out.title, by: albBy(s, out), q: out.q, my: t.lead || d.list.includes(out) && !mine.includes(out) };
    // ④ 그 그룹을 맡은 사람이 세 곡 + 타이틀곡을 고른다
    const B = agProd(s, t.ag, g), sd = albEarOf(B.p);
    const picks = five.map(y => ({ y, v: y.q + U.normal(0, sd) + (d.cs.includes(y.c) ? 10 : 0) })).sort((a, b) => b.v - a.v).slice(0, ALB_PICK).map(z => z.y);
    const ti = picks[0], pol = albPolish(s, x, U.chance([0, 0, 0.4, 0.8][t.tier] || 0));
    const mk = albMk(s, { cs: d.cs, src: d.src, n: d.n, five, by: L ? L.id : null, byN: t.lead ? 'A&R 팀장 나' : '' }, picks, ti, pol, B.n);
    const my = { ti: mine.includes(ti), in: mine.filter(y => picks.includes(y)).length, five: mine.filter(y => five.includes(y)).length };
    mk.my = { t: (mine.find(y => y === ti) || mine.find(y => picks.includes(y)) || mine.find(y => five.includes(y)) || mine[0]).title, r: my.ti ? '타이틀곡' : my.in ? '수록곡으로 실림' : my.five ? '다섯 곡에 들었지만 빠짐' : '팀장 심사에서 떨어짐' };
    for (const y of mine) { const c = y.cid && s.people[y.cid]; if (c && c.ind) { meetAt(s, c, `「${y.title}」 데모`, 'anr'); bond(s, c, picks.includes(y) ? 4 : 1); } }
    if (lost && U.chance(0.6)) queueEv(s, 'anr_lost', U.int(3, 7), Object.assign({ g: g.name }, lost), true);
    queueEv(s, 'anr_out', 2, { gi: d.gi, pg: d.pg || null, q: ti.q + pol.dq + ANR_ADJ, c: ti.cid || null, title: ti.title, cn: ti.c, mk, my, boss: B.n }, true);
    const R = t.lead ? `${g.name} 다음 앨범의 다섯 곡을 확정했다.` : `내 몫에서 ${josa(mine.map(y => `「${y.title}」`).join(' · '), '을를')} 팀장에게 올렸다. 팀장 ${L ? josa(L.name, '이가') : '이'} 다섯 곡을 확정했다${my.five ? ` (내가 올린 곡 ${my.five}곡이 들었다)` : ' (내가 올린 곡은 빠졌다)'}.`;
    return { log: `${R} ${josa(B.n, '이가')} 고른 타이틀곡은 「${ti.title}」 (작곡 ${albBy(s, ti)}).${!t.lead && my.ti ? ' 내가 올린 곡이다!' : ''}` };
  },
});
function anrEar(p) { return jobMix([[lv(p, 'scout'), JS_]]) + talB(p.tal.music, true); }
// 다섯 곡에 못 들었던 곡이 다른 회사에서 나와 잘됐다. 내가 떨어뜨렸으면 평가가 조금 내려간다
E({
  id: 'anr_lost', cat: 'A&R', title: '놓친 곡', tag: 'career',
  cond: s => trackOn(s, 'anr'),
  init(s, d) { d.peak = U.clamp(Math.round(34 - (d.q - 55) * 1.6 + U.normal(0, 5)), 1, 50); if (d.my) empRep(s, 'anr', s.tracks.anr, -3); },
  text: (s, d) => `${d.g} 앨범 심사에서 ${d.my ? '내가' : '팀이'} 떨어뜨린 ${josa(`「${d.title}」`, '이가')} 다른 회사 가수의 곡으로 나와 차트 ${d.peak}위에 올랐다. (작곡 ${d.by})${d.my ? `\n\n${s.tracks.anr.lead ? '본부장' : '팀장'}이 지나가며 한마디 했다. 업무 평가가 조금 내려갔다.` : ''}`,
  ch: (s, d) => [{ t: '확인', f: () => `${d.my ? '내가' : '팀이'} 떨어뜨린 ${josa(`「${d.title}」`, '이가')} 다른 회사에서 나와 차트 ${d.peak}위에 올랐다.` }],
});
E({
  id: 'anr_out', cat: 'A&R', title: '앨범 성적', tag: 'career',
  live: (s, d) => d.live, keepPop: (s, d) => typeof liveShow === 'function' && liveShow(d.live), plio: (s, d) => d.pl || null,
  cond: s => trackOn(s, 'anr'),
  init(s, d) {
    const t = s.tracks.anr, g = anrG(s, d);
    // v94: 내 듣는 귀(스카우트 강함 + 음감 가산점)가 곡을 다듬는 데 조금 들어간다
    const sc = songScore(s, { perf: 20 + t.tier * 8 + anrEar(me(s)) * 0.15 + U.normal(0, 4), q: d.q, fans: g.f, tier: t.tier, trend: !!d.cn && d.cn === s.trend, bonus: d.cn && d.cn === g.sig ? 3 : 0 });
    d.peak = chartFromScore(sc);
    g.f = Math.max(0, g.f + fanGainRaw(sc, g.f, 0.6 + t.tier * 0.2, starCap(60, 'kr')));
    // v155: 내가 올린 곡이 얼마나 갔는지만큼 내 몫 (팀장은 다섯 곡이 다 내 책임. 예전 세이브는 내가 고른 곡)
    const my = d.my || { ti: true, in: 1, five: 1 }, w = t.lead || my.ti ? 1 : my.in ? 0.6 : my.five ? 0.4 : 0.25;
    const full = d.peak && d.peak <= 10 ? t.sal * 2 : d.peak && d.peak <= 40 ? Math.round(t.sal * 0.5 / 1e5) * 1e5 : 0;
    d.bonus = t.lead || my.ti ? full : my.in ? Math.round(full * 0.4 / 1e5) * 1e5 : 0;
    if (d.bonus) earn(s, d.bonus, 'A&R 성과급');
    t.picks++; if (d.peak && d.peak <= 20 && (t.lead || my.ti || my.in)) t.hits++;
    // 12-3 보는 쪽: 우리 팀이 고른 곡의 무대
    if (typeof liveWatch === 'function') d.live = liveWatch(s, { name: g.name, kind: '그룹', tier: Math.max(1, Math.min(3, t.tier)), title: d.title, c: d.cn, sc, peak: d.peak, trend: !!d.cn && d.cn === s.trend, key: t.picks === 1 || (d.peak && d.peak <= 10) });
    if (typeof plioSpec === 'function') d.pl = plioSpec({ k: 'stagew', t: `${g.name} 「${d.title}」 무대`, ch: `${PF.video.n} 뮤직`, me: '', sc, vw: Math.pow(10, 3.6 + sc / 22) });
    // 팀장이면 성적이 팀 평가에 1.8배로 반영된다. 팀장은 기대치가 높아서(곡 점수 55가 아니라 62부터 플러스) 웬만한 성적으로는 평가가 오르지 않는다
    d.lead0 = !!t.lead; d.lc = empRep(s, 'anr', t, (sc - (t.lead ? 62 : 55)) / 3 * w);
    const c = s.people[d.c]; if (c) bond(s, c, sc >= 60 ? 6 : -2);
    addWork(s, { type: 'A&R 참여곡', title: d.title, by: g.name, sc, note: chartText(d.peak), pay: d.bonus || 0 });
    d.promo = d.lc === 'up'; d.demote = d.lc === 'down';
    if (t.rep <= 3) d.fired = true;
    d.sc = sc; d.g = g.name;
  },
  html: (s, d) => d.mk ? `<div class="m-text">${rich(EVENTS.anr_out.text(s, d))}</div>` + albBannerHTML(d.mk) : '',
  text: (s, d) => `${d.mk ? `${d.g}의 새 앨범이 나왔다. 타이틀곡 「${d.title}」 (${josa(d.boss || '', '이가')} 골랐다 · 내가 올린 곡 ${d.mk.my ? `「${d.mk.my.t}」: ${d.mk.my.r}` : '-'})` : `내가 고른 ${d.g}의 「${d.title}」 성적이 나왔다.`}\n\n${chartText(d.peak)}\n${d.bonus ? `성과급 ${fmtWon(d.bonus)}` : '이번엔 성과급이 없다.'}\n업무 평가 ${Math.round(s.tracks.anr.rep)}` + (d.promo ? '\n\n그동안의 성과를 인정받아 팀장이 되었다! 월급이 오른다.' : '') + (d.demote ? '\n\n평가가 떨어져 팀장 자리에서 내려왔다. 월급도 줄었다.' : '') + (d.fired ? '\n\n연달아 성적이 나빠서 회사에서 나가 달라는 이야기를 들었다.' : ''),
  ch: (s, d) => [{ t: '확인', f: s => { if (d.fired) { const t = s.tracks.anr; t.st = 'ended'; t.endNote = `${t.agN} A&R (해고)`; return `${t.agN}에서 해고됐다.` + fx(s, { stress: 10 }); } return `${d.g} 「${d.title}」 ${chartText(d.peak)}.`; } }],
});

// ════════ 트레이너 ════════
// 기획사에서 연습생을 가르친다. 내 교육 특기가 높을수록 연습생이 빨리 는다
// 댄스 트레이너는 안무가 일도 같이 한다 (안무 의뢰가 메시지함으로 온다)
// 큰 회사일수록 들어가기 어렵다: 특기만 높고 가르쳐 본 적이 없으면 대형은 거의 안 된다 (작은 곳에서 교육을 쌓고 옮긴다)
const TR_FIELDS = ['vocal', 'rap', 'dance', 'guitar', 'bass', 'piano', 'keyboard', 'drum'];
const TR_SAL = [0, 200, 240, 290];
const TR_THR = [0, 28, 40, 52];
// v99 (8-5): 트레이너 계열은 특기로만 면접을 본다 (재능 안 봄)
function trScore(s, k) { const p = me(s); return lv(p, k) * 0.6 + eduLv(p) * 0.5; }
function trFieldN(k) { return k === 'dance' ? '댄스 트레이너 (안무가)' : `${SKILLS[k].n} 트레이너`; }
// v206: 버츄얼 아이돌 기획사 트레이너는 보컬 · 댄스만 가르친다. v207: 버츄얼은 예능이 중요해서 예능 트레이너도 뽑는다
function trFieldsOf(ag) { return ag && ag.kind === 'vtuber' ? ['vocal', 'dance', 'variety'] : TR_FIELDS; }
function trFields(s, ag) { return trFieldsOf(ag).filter(k => lv(me(s), k) >= 30); }
// v207: 그 회사가 특화한 분야 트레이너는 붙기 쉽다 (coTrFocusB)
function trApplyP(s, ag, k) { return audP(trScore(s, k) + empExpBonus(s, 'trainer') + coTrFocusB(ag, k), TR_THR[ag.tier]); }
for (const ag of staffAgs(['music', 'vtuber'])) JOB_APPLY.push({
  id: 'tr_' + ag.id, trk: 'trainer', g: '🏋️ 트레이너', get n() { return `${ag.n} 트레이너 채용`; }, tag: `${TIER_N[ag.tier]} · 월급 ${TR_SAL[ag.tier]}만 원`,
  show: s => !trackOn(s, 'trainer') && age(s) >= 20,
  h: s => { const f = trFields(s, ag); return f.length ? f.map(k => `${SKILLS[k].n} ${fmtPct(trApplyP(s, ag, k))}`).join(' · ') + ' · 결과는 다음 달' : (ag.kind === 'vtuber' ? '보컬·댄스·예능' : '보컬·랩·댄스·악기') + ' 중 하나가 30레벨 이상이어야 지원할 수 있다'; },
  ok: s => !s.army && !agencyContract(s) && trFields(s, ag).length && !hasQ(s, 'tr_res') && !(s.cd['tr_' + ag.id] > s.t),
  why: s => s.army ? '군 복무 중' : agencyContract(s) ? contractWhy(s) : !trFields(s, ag).length ? '가르칠 만한 특기가 아직 없다' : hasQ(s, 'tr_res') ? '결과를 기다리는 중' : '얼마 전에 지원했다 (반년 뒤 다시)',
  run: s => { fireEvent(s, 'tr_pick', { ag: ag.id, tier: ag.tier }); return ''; },
});
E({
  id: 'tr_pick', cat: '채용', title: '무엇을 가르칠까?', tag: 'career',
  // v206: 회사를 정하고 지원한다 (d.ag). 예전 세이브의 창(d.tier만)은 그 크기의 기획사 아무 곳
  init(s, d) { if (!d.ag) { const L = staffAgs(['music']).filter(a => a.tier === d.tier); d.ag = (U.pick(L) || staffAgs(['music'])[0]).id; } d.tier = AG[d.ag].tier; },
  text: (s, d) => `${AG[d.ag].n} 트레이너 자리에 지원한다. 어떤 분야를 가르칠까?\n\n그 분야 실력과 교육 특기를 함께 본다.`,
  ch: (s, d) => trFields(s, AG[d.ag]).map(k => { const p = trApplyP(s, AG[d.ag], k); return { t: trFieldN(k), h: `${SKILLS[k].n} ${lvi(me(s), k)}레벨 · 교육 ${has(me(s), 'edu') ? lvi(me(s), 'edu') + '레벨' : '없음'} · 합격 가능성 ${fmtPct(p)}`, f: s => { s.cd['tr_' + d.ag] = s.t + 6; queueEv(s, 'tr_res', 1, { ag: d.ag, k, p }); return `${AG[d.ag].n} ${trFieldN(k)} 채용에 지원했다.`; } }; }).concat([{ t: '그만둔다', f: () => '지원하지 않았다.' }]),
});
function makeStudent(s, t) {
  const k = t.k, tb = Math.max(0, (t.tier || 1) - 1);
  const sk = { [k]: U.int(8, 22) + tb * 4 };
  if (k !== 'dance') sk.dance = U.int(5, 15);
  if (k !== 'vocal') sk.vocal = U.int(5, 18);
  const st = makeMusicMate(s, { age: U.int(13, 19), rel: '제자', job: '연습생', met: `${t.agN} 연습생 (내 제자)`, aff: 45, tal: k === 'dance' ? ['rhythm', 'athletic'] : k === 'variety' ? ['humor', 'verbal'] : ['music', 'rhythm'], sk });
  // 큰 회사일수록 가능성 있는 연습생을 뽑는다 (한계는 숨어 있다)
  const x = st.sk[k];
  x.pot = Math.min(100, Math.max(Math.ceil(x.lv) + 3, Math.round(x.lv + U.int(6, 40) * (0.7 + talFactor(st, k) / 150) + tb * 6)));
  st.trSince = s.t; st.trPrev = lv(st, k);
  return st.id;
}
// 맡을 수 있는 연습생 수: 평가가 오를수록 회사가 더 맡긴다 (3명에서 5명까지)
function trCap(t) { return Math.min(5, 3 + (t.rep >= 45) + (t.rep >= 65)); }
// 가진 재능을 다 끌어냈는지: 숨은 한계의 90%까지 왔거나 한계까지 2.5레벨 안쪽
function trMaxed(x, k) { const sk = x.sk[k]; return !!sk && (sk.lv >= sk.pot * 0.9 || sk.pot - sk.lv < 2.5); }
function gN(x) { return x.g === '여' ? '여' : '남'; }
E({
  id: 'tr_res', cat: '채용', title: '트레이너 채용 결과', tag: 'career',
  // 경력이 길거나 팀장을 해 봤으면 처음부터 트레이닝팀 팀장 자리로 뽑는다
  init(s, d) { d.pass = U.chance(d.p); d.lead = d.pass && empStartLead(s, 'trainer'); d.sal = empStartSal(s, 'trainer', TR_SAL[AG[d.ag].tier] * 1e4, d.lead); },
  text: (s, d) => d.pass ? `${AG[d.ag].n} ${trFieldN(d.k)}${d.lead ? ' 팀장' : ''}으로 합격했다! 회사가 제시한 월급은 ${fmtWon(d.sal)}.${d.lead ? '\n\n그동안의 경력을 보고 처음부터 트레이닝팀 팀장 자리를 맡긴다.' : ''}\n\n일정에 '레슨'을 넣으면 연습생들을 가르친다.` : `${AG[d.ag].n} 트레이너 채용에 떨어졌다.`,
  ch: (s, d) => d.pass ? [
    { t: '입사 조건을 들어 본다', ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '월급을 협상할 수 있다', f: s => startNego(s, { kind: 'trainer', ag: d.ag, agN: AG[d.ag].n, k: d.k, sal: d.sal, lead: d.lead, months: 24, lev: U.clamp((d.p - 0.5) * 0.8 + 0.3, 0.05, 0.8) }) },
    { t: '거절한다', f: () => '트레이너 제안을 거절했다.' },
  ] : [{ t: '확인', f: () => `${AG[d.ag].n} 트레이너 채용에 떨어졌다.` }],
});
function startTrainer(s, d) {
  const ag = AG[d.ag];
  const tag = learnMe(s, 'edu', null, true);
  const old = s.tracks.trainer, lead = !!d.lead;
  const t = s.tracks.trainer = { st: 'active', ag: d.ag, agN: ag.n, tier: ag.tier, k: d.k, months: 0, cEnd: d.months, rep: empStartRep(s, 'trainer', lead), lead, everLead: !!old.everLead || lead, debuts: old.debuts || 0, cuts: old.cuts || 0, sal: d.sal, salBase: d.sal, salBase0: lead ? Math.round(d.sal / leadRaise('trainer') / 1e5) * 1e5 : d.sal, next: 6, students: [] };
  for (let i = 0; i < 3; i++) t.students.push(makeStudent(s, t));
  milestone(s, `${age(s)}세에 ${ag.n} ${josa(trFieldN(d.k) + (lead ? ' 팀장' : ''), '이가')} 되었다.`);
  return `${ag.n} ${trFieldN(d.k)}${lead ? ' 팀장' : ''} 일을 시작했다. 월급 ${fmtWon(d.sal)} · 계약 ${yrs(d.months)}. 맡은 연습생은 ${t.students.map(id => `${s.people[id].name}(${gN(s.people[id])})`).join(', ')}.` + tag;
}
NEGO.trainer = empNego('trainer', startTrainer);
CAREERS.trainer = {
  n: '트레이너', ic: '🏋️',
  desc: '기획사 연습생에게 보컬·랩·악기·댄스를 가르친다. 교육이 중요하다. 댄스 트레이너는 안무도 짠다.',
  act: { n: '레슨 (연습생 가르치기)', ic: '🏋️', g: '직업 활동', eff: [['교육', '↑↑', 1], ['내 특기', '↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) { return t.st !== 'active' ? (t.endNote || '') : `${t.agN} ${trFieldN(t.k)}${t.lead ? ' 팀장' : ''} · 가르친 연습생 데뷔 ${t.debuts}명 · 업무 평가 ${Math.round(t.rep)} · 월급 ${fmtWon(t.sal)}`; },
  short(s, t) { return trFieldN(t.k); },
  seg(s, t) { return `${t.agN} ${trFieldN(t.k)}`; },
  title(s, t) { return t.debuts ? `스타를 길러 낸 ${trFieldN(t.k)}` : trFieldN(t.k); },
  contract(s, t) { return t.st === 'active' ? `${t.agN} (트레이너)` : ''; },
  emp: true,
  cLeft(s, t) { return t.st === 'active' && t.cEnd != null ? t.cEnd - t.months : null; },
  mainSk(s, t) { return 'edu'; },
  info(s, t) {
    const p = me(s), sts = t.students.map(id => s.people[id]).filter(Boolean);
    return [['회사', `${t.agN} (${TIER_N[t.tier]} ${CO_KIND_N[(AG[t.ag] || {}).kind] || '기획사'}) · ${trFieldN(t.k)}${t.lead ? ' 팀장' : ''}`], ['월급', fmtWon(t.sal)], ['내 실력', `${SKILLS[t.k].n} ${lvi(p, t.k)} · 교육 ${lvi(p, 'edu')}`], ['업무 평가', `${Math.round(t.rep)}`], ['길러 낸 연습생', `데뷔 ${t.debuts}명${t.cuts ? ` · 방출 ${t.cuts}명` : ''}`],
      { h: `맡은 연습생 (${sts.length}명)`, items: sts.map(x => ({ who: x.id, t: x.name, sub: `${gN(x)} · ${pAge(s, x)}세 · ${SKILLS[t.k].n} ${lvi(x, t.k)}레벨${potTok(p, x, t.k, true, !canScout(p, t.k))} · 맡은 지 ${Math.max(0, s.t - (x.trSince != null ? x.trSince : s.t))}개월 · ${relWord(x)}` })) }].filter(Boolean);
  },
  actions(s, t) { return t.st === 'active' ? [{ t: '회사 그만두기', h: '직원 계약이라 위약금은 없다', ok: true, danger: true, confirm: '정말 회사를 그만둘까요?', run: s => { const n = t.agN; leaveEmp(s, 'trainer', '퇴사'); return `${josa(n, '을를')} 그만뒀다.`; } }] : []; },
  monthly(s, t) {
    if (t.st !== 'active') return;
    t.months++;
    empMonth(s, 'trainer', t);
    earn(s, t.sal, '월급', 'trainer');
    const n = slotsOn(s, 'c_trainer'), p = me(s);
    const sts = t.students.map(id => s.people[id]).filter(Boolean);
    // 가르치는 만큼 교육 특기가 늘고, 시범을 보이며 내 실력도 유지된다
    if (n) { teach(s, p, 1.3 * n); useSkill(s, p, t.k, 0.6 * n); addStress(s, 1.5); }
    for (const x of sts) {
      // 레슨: 가르치는 실력(교육 60%·그 특기 40%)이 높고 레슨 칸이 많을수록 빨리 는다 (학원 수업 정도). 레슨을 안 하면 혼자 조금씩만 는다
      practice(s, x, t.k, n ? (1 + teachLv(p, t.k) / 50) * Math.min(2, n) : 0.3, n ? 1.4 : 1);
      if (n) { bond(s, x, 1); x.contactT = s.t; }
      // 가르치는 실력이 높으면 한계에 부딪힌 연습생도 아주 조금씩 더 끌어올린다
      const sk = x.sk[t.k];
      if (n && sk && sk.pot - sk.lv < 3 && sk.pot < 100 && U.chance(0.03 + teachLv(p, t.k) / 1000)) sk.pot += 1;
    }
    if (!n) empRep(s, 'trainer', t, -0.5);
    t.next--;
    if (t.next <= 0 && !hasQ(s, 'tr_eval')) { t.next = 6; queueEv(s, 'tr_eval', 0); }
    if (t.k === 'dance' && U.chance(0.03 + t.rep / 800) && !s.inbox.some(m => m.kind === 'choreo')) { const a = makeArtist(s, t.rep); sendMsg(s, 'choreo', { from: `${a.name} 소속사`, title: '안무 의뢰', months: 6, d: { a, fee: Math.round((150 + a.tier * 200 + t.rep * 5) * 1e4) } }); }
  },
};
// 반년마다 연습생 평가: 한 명을 데뷔조에 추천할 수 있다
E({
  id: 'tr_eval', cat: '트레이너', title: '연습생 평가', tag: 'career',
  // 12-3 보는 쪽: 평가단 앞에 선 제자들을 먼저 보고, 그다음 누구를 추천할지 고른다
  live: (s, d) => d.live,
  cond: s => trackOn(s, 'trainer'),
  init(s, d) {
    const t = s.tracks.trainer;
    d.thr = AG[t.ag].thr; d.cut = []; d.good = 0;
    // 회사의 방출: 1년 넘게 맡았는데 반년 동안 거의 늘지 않았거나, 데뷔하기엔 나이가 찬 연습생은 내보낸다.
    // 가진 재능을 다 끌어냈다면 트레이너 탓이 아니라서 평가는 그대로, 덜 키웠으면 평가가 깎인다
    for (const id of t.students.slice()) {
      const x = s.people[id];
      if (!x) continue;
      if (x.trSince == null) x.trSince = s.t;
      const cur = lv(x, t.k), prev = x.trPrev != null ? x.trPrev : cur;
      x.trPrev = cur; (d.gr = d.gr || {})[id] = cur - prev;
      if (cur - prev >= 3) d.good++;
      const stuck = s.t - x.trSince >= 12 && cur - prev < 1.5, old = pAge(s, x) >= 23;
      if (d.cut.length || !(old || (stuck && U.chance(0.7)))) continue; // 한 번 평가에 한 명까지만 내보낸다
      const maxed = trMaxed(x, t.k);
      t.students = t.students.filter(y => y !== id).concat(makeStudent(s, t));
      const pen = Math.round(5 * (t.lead ? LEAD_MULT : 1));
      if (!maxed) { d.lc = empRep(s, 'trainer', t, -5) || d.lc; t.cuts = (t.cuts || 0) + 1; }
      x.job = '전 연습생'; bond(s, x, -6);
      d.cut.push({ id, maxed, pen, why: old ? '데뷔하기엔 나이가 찼다' : '반년 동안 실력이 거의 늘지 않았다', nw: t.students[t.students.length - 1] });
    }
    // 반년 사이 실력이 부쩍 는 연습생이 있으면 평가가 오른다
    if (d.good) { const g = Math.min(2, d.good); d.gain = Math.round(g * (t.lead ? LEAD_MULT : 1) * 10) / 10; d.lc = empRep(s, 'trainer', t, g) || d.lc; }
    // 팀장은 기대치가 높다: 반년 동안 실력이 부쩍 는 연습생이 한 명도 없으면 평가가 깎인다
    else if (t.lead) { d.leadPen = Math.round(3 * LEAD_MULT); d.lc = empRep(s, 'trainer', t, -3) || d.lc; }
    d.lead = !!t.lead;
    // 잘 가르치면 회사가 연습생을 더 맡긴다
    if (t.students.length < trCap(t)) { d.added = makeStudent(s, t); t.students.push(d.added); }
    d.ids = t.students.filter(id => s.people[id]);
    if (typeof liveEvalSpec === 'function') { d.live = liveEvalSpec(s, d, { t: t.agN || '', g: SKILLS[t.k].n, key: !t.evN || d.cut.length > 0 || !!d.lc }); t.evN = (t.evN || 0) + 1; }
  },
  text(s, d) {
    const t = s.tracks.trainer, p = me(s);
    const who = x => `${x.name}(${gN(x)} · ${pAge(s, x)}세)`;
    const cutTxt = d.cut.map(c => { const x = s.people[c.id], n = s.people[c.nw]; return `회사가 ${josa(who(x), '을를')} 방출했다. ${c.why}는 이유다. ` + (c.maxed ? '가진 재능은 다 끌어냈다는 평이라 내 평가는 그대로다.' : `제대로 키우지 못했다는 평을 받았다. (평가 -${c.pen || 5})`) + `\n→ 새 연습생 ${josa(who(n), '이가')} 들어왔다.`; }).join('\n\n');
    const goodTxt = d.good ? `\n\n반년 사이 실력이 부쩍 는 연습생이 ${d.good}명이다. (평가 +${d.gain})` : d.leadPen ? `\n\n팀장인데 반년 동안 실력이 부쩍 는 연습생이 한 명도 없다는 말을 들었다. (평가 -${d.leadPen})` : '';
    const addTxt = d.added && s.people[d.added] ? `\n\n회사가 연습생을 한 명 더 맡겼다. ${josa(who(s.people[d.added]), '이가')} 들어왔다. (지금 ${d.ids.length}명)` : '';
    const lines = d.ids.map(id => { const x = s.people[id]; return `· ${who(x)} ${SKILLS[t.k].n} ${lvi(x, t.k)}레벨${potTok(p, x, t.k, true, !canScout(p, t.k))} · ${relWord(x)}`; }).join('\n');
    const leadTxt = d.lc === 'up' ? '\n\n그동안의 성과를 인정받아 트레이닝팀 팀장이 되었다! 월급이 오른다.' : d.lc === 'down' ? '\n\n평가가 떨어져 팀장 자리에서 내려왔다. 월급도 줄었다.' : '';
    return `${t.agN} 반기 평가 날이다.${cutTxt ? '\n\n' + cutTxt : ''}${goodTxt}${addTxt}${leadTxt}\n\n지금 맡은 연습생들:\n${lines}\n\n한 명을 데뷔조에 추천할 수 있다. 실력이 모자라면 회사가 받아 주지 않는다. 지금 내 평가 ${Math.round(t.rep)}.`;
  },
  ch(s, d) {
    const t = s.tracks.trainer;
    return d.ids.map(id => { const x = s.people[id]; const pp = U.clamp(U.sig((lv(x, t.k) - d.thr - 4) / 5) * 0.75 + t.rep / 500, 0.03, 0.85); return { t: `${josa(`${x.name}(${gN(x)})`, '을를')} 추천한다`, h: `${SKILLS[t.k].n} ${lvi(x, t.k)}레벨 · 받아들여질 가능성 ${fmtPct(pp)}`, f: s => {
      if (!U.chance(pp)) { const lc = empRep(s, 'trainer', t, -2); bond(s, x, -3); return `${josa(x.name, '을를')} 추천했지만 회사는 아직 이르다고 했다.${lc === 'down' ? ' 평가가 떨어져 팀장 자리에서 내려왔다.' : ''}`; }
      t.debuts++; const lc = empRep(s, 'trainer', t, 8); earn(s, t.sal, '데뷔 성과급');
      x.job = '아이돌'; bond(s, x, 12); x.fame = U.int(2000, 30000);
      const nw = s.people[makeStudent(s, t)];
      t.students = t.students.filter(y => y !== id).concat(nw.id);
      if (t.debuts === 1) milestone(s, `${age(s)}세에 가르친 연습생 ${josa(x.name, '이가')} 처음으로 데뷔했다.`);
      return `내가 가르친 ${josa(x.name, '이가')} 데뷔조에 들어갔다! 새 연습생 ${josa(`${nw.name}(${gN(nw)})`, '이가')} 들어왔다.${lc === 'up' ? ' 성과를 인정받아 트레이닝팀 팀장이 되었다!' : ''}` + fx(s, { stress: -6 });
    } }; }).concat([{ t: '이번엔 아무도 추천하지 않는다', f: () => '이번 평가에서는 추천하지 않았다.' }]);
  },
});
INBOX.choreo = {
  ic: '🩰',
  text: (s, m) => `${m.d.a.name}(${TIER_N[m.d.a.tier]} 기획사 ${m.d.a.kind})의 다음 활동곡 안무를 짜 달라는 의뢰다. 안무비 ${fmtWon(m.d.fee)}.`,
  ch: (s, m) => [
    { t: '맡는다', ok: s => trackOn(s, 'trainer'), f: s => { const t = s.tracks.trainer, p = me(s); const q = lv(p, 'dance') * 0.6 + p.tal.creative * 0.3 + U.normal(0, 8); earn(s, m.d.fee, '안무비'); useSkill(s, p, 'dance', 2.5); empRep(s, 'trainer', t, (q - 40) / 5); addWork(s, { type: '안무', pay: m.d.fee, title: songTitle(), by: m.d.a.name, sc: Math.round(q + 15), note: q >= 50 ? '안무가 화제가 됐다' : '무난한 안무' }); if (q >= 50 && !t.choreoMs) { t.choreoMs = true; milestone(s, `${age(s)}세에 짠 ${m.d.a.name}의 안무가 화제가 됐다.`); } return `${m.d.a.name}의 안무를 짰다.${q >= 50 ? ' 챌린지 영상이 쏟아졌다.' : ''}` + fx(s, { stress: 3 }); } },
    { t: '거절한다', f: () => '안무 의뢰를 거절했다.' },
  ],
};
