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
function sendAdopt(s, kind, t) {
  const a = makeArtist(s, t.rep), p = me(s);
  const ag = U.pick(musicAgencies().filter(x => x.tier === a.tier && x.mkt === 'kr')) || U.pick(musicAgencies());
  const anr = U.pick(coTeamPeople(s, ag.id + '#anr'));
  const mkt = lv(p, 'jp') >= 20 && U.chance(0.2) ? 'jp' : lv(p, 'en') >= 20 && U.chance(0.15) ? 'us' : 'kr';
  const main = t.best >= 45 && U.chance(0.4);
  const fee = Math.round((kind === 'composer' ? [150, 400, 800] : [80, 150, 300])[a.tier - 1] * 1e4 * (1 + t.rep / 50) * (main ? 1.5 : 1));
  const title = mkt === 'kr' ? songTitle() : songTitleEn();
  // 작곡가는 내가 정한 컨셉으로 쓴 곡이 팔리고, 작사가는 남이 쓴 곡(컨셉은 그때그때)에 가사를 붙인다
  const c = kind === 'composer' && t.cc ? t.cc : U.chance(0.4) ? s.trend : U.pick(TRENDS);
  sendMsg(s, 'w_adopt', { from: `${ag.n} A&R ${anr.name}`, title: `${wJob(kind)} 곡 채택 제안`, months: 6, d: { kind, a, mkt, title, main, fee, anr: anr.id, q: t.best, c } });
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
    desc: kind === 'composer' ? '내가 정한 컨셉으로 곡을 써 두면 기획사가 골라 간다. 채택되면 계약금과 저작권료가 들어온다. 앨범을 통째로 맡는 프로듀서와 달리 곡 한 곡만 쓴다.' : '곡에 가사를 붙인다. 작곡보다 채택이 잦지만 수입은 적다.',
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
      if (U.chance(pp) && !s.inbox.some(m => m.kind === 'w_adopt' && m.d.kind === kind)) sendAdopt(s, kind, t);
      if (!t.team && t.months >= 6 && lv(p, key) >= 30 && U.chance(0.02) && !s.inbox.some(m => m.kind === 'w_team')) sendMsg(s, 'w_team', { from: U.pick(TEAMS), title: `${wJob(kind)}팀 합류 제안`, months: 6, d: { kind } });
    },
  };
}
INBOX.w_adopt = {
  ic: '🎼',
  text: (s, m) => { const d = m.d; return `${d.mkt === 'kr' ? '' : MK_N[d.mkt] + ' '}${d.a.name}(${TIER_N[d.a.tier]} 기획사 ${d.a.kind})의 새 앨범 ${d.main ? '타이틀곡' : '수록곡'}으로 내 ${d.kind === 'composer' ? '곡을' : '가사를'} 쓰고 싶다는 연락이다.${d.c ? ` ('${d.c}' 컨셉${d.c === s.trend ? ' · 유행 중' : ''})` : ''}\n\n계약금 ${fmtWon(d.fee)}` + (s.tracks[d.kind].team ? ' (팀과 나눈다)' : ''); },
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
  return `곡 제목을 ${qro(d.title)} 정했다.`;
};
E({
  id: 'w_res', cat: '음원 성적', title: '참여곡 성적', tag: 'career',
  // 12-3 보는 쪽: 내가 참여한 곡의 무대를 본다. 방영 뒤 반응은 플리오에서
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
    if (typeof liveWatch === 'function') d.live = liveWatch(s, { name: d.a.name, kind: d.a.kind, tier: d.a.tier, title: d.title, sc, peak: d.peak, trend: !!d.c && d.c === s.trend, key: t.songs === 1 || (d.peak && d.peak <= 10) || !!d.up });
    if (typeof plioSpec === 'function') d.pl = plioSpec({ k: 'stagew', t: `${d.a.name} 「${d.title}」 무대`, ch: `${PF.video.n} 뮤직`, me: `${actName(s, d.kind)} ${wN(d.kind)}`, sc, rv: sc >= 80 ? 2 : sc >= 65 ? 1 : 0, vw: Math.pow(10, 3.6 + sc / 22) });
  },
  text: (s, d) => `${d.a.name}의 ${josa(`「${d.title}」`, '이가')} 나왔다. (내가 ${wJob(d.kind)})\n\n${chartText(d.peak)}\n매달 들어올 저작권료 약 ${fmtWon(d.roy)} (조금씩 줄어든다)\n업계 평판 ${Math.round(s.tracks[d.kind].rep)}` + (d.up ? `\n\n🎉 ${wN(d.kind)} 단계가 ${qro(W_TIERS[d.up])} 올랐다!` : ''),
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
// 프로듀서는 남의 앨범 하나를 통째로 맡아 ① 앨범 컨셉 ② 타이틀곡(내 곡이냐 공모로 받은 곡이냐) ③ 녹음 디렉팅을 직접 정한다.
// 프리랜서(mode free): 의뢰를 받아 앨범마다 비용을 받는다. 앨범이 크게 잘되면 그 가수 쪽이 다음 앨범도 맡아 달라고 다시 찾아온다
// 사내 프로듀서(mode in): 기획사 직원으로 월급을 받고, 회사가 소속 그룹의 앨범을 차례로 맡긴다. 크게 잘되면 성과급. 회사를 나오면 프리랜서로 돌아간다
function pinOn(s) { const t = s.tracks.producer; return !!t && t.st === 'active' && t.mode === 'in'; }
CAREERS.producer = {
  n: '프로듀서', ic: '🎛️',
  desc: '남의 앨범 하나를 통째로 맡는다. 앨범 컨셉, 타이틀곡, 녹음 디렉팅을 직접 정한다. 프리랜서는 의뢰마다 비용을 받고, 크게 잘되면 그 가수가 다음 앨범도 맡긴다. 기획사에 들어가면(사내 프로듀서) 월급을 받고 회사 그룹의 앨범을 맡는다. 앨범을 맡으면 석 달 동안 일정 한 칸이 묶인다.',
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
    return [inh ? ['회사', `${t.agN} (${TIER_N[t.tier]} 기획사) 사내 프로듀서`] : ['일하는 방식', '프리랜서 (의뢰는 메시지함으로 온다)'], inh ? ['월급', fmtWon(t.sal)] : null, ['내 실력', ['compose', 'lyric', 'scout', 'vocal', 'rap', 'piano', 'keyboard', 'guitar'].filter(k => has(p, k)).map(k => `${SKILLS[k].n} ${lvi(p, k)}`).join(' · ')], ['단계', P_TIERS[pTier(t, s)]], ['프로듀싱한 앨범', `${t.albums}장 · 히트 ${t.hits}곡`], [inh ? '업무 평가' : '평판', `${Math.round(t.rep)}`], inh ? null : ['단골 가수', (t.clients || []).length ? t.clients.map(a => a.name).join(', ') : '없음'], ['지금 작업', w ? `${w.a.name} 「${w.title}」${w.c ? ` · '${w.c}' 컨셉` : ''} · ${w.left}개월 남음` : inh ? `없음 (다음 앨범은 ${Math.max(1, t.next || 1)}개월쯤 뒤)` : '없음 (의뢰는 메시지함으로 온다)'], { h: '컨셉 숙련도', bars: cmBars(s) }, inh ? { h: '맡은 그룹', items: (t.groups || []).map(g => `${g.name} (${g.kind}) · 팬 ${fmtFans(g.f)} · 대표 컨셉 '${g.sig}'`) } : null].filter(Boolean);
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
      const a = re ? U.pick(t.clients) : Object.assign(makeArtist(s, t.rep), { sig: U.pick(TRENDS) });
      sendMsg(s, 'p_offer', { from: `${a.name} 소속사`, title: re ? '다음 앨범도 맡아 달라는 의뢰' : '앨범 프로듀싱 의뢰', months: 6, d: { a, re, fee: Math.round((a.tier * 1500 + t.rep * 40) * (re ? 1.2 : 1) * 1e4), title: songTitle() } });
    }
  },
};
// 사내 프로듀서: 회사가 소속 그룹 하나의 새 앨범을 맡긴다
function pinAssign(s, t) {
  const gi = U.int(0, t.groups.length - 1), g = t.groups[gi];
  const w = startWork(s, 'produce', { fee: 0, title: songTitle(), a: { name: g.name, kind: g.kind, tier: t.tier, sig: g.sig, gi }, months: 3, slot: true, inh: true });
  queueEv(s, 'prod_plan', 0, { wid: w.id }, true);
  addLog(s, `회사에서 ${g.name}의 새 앨범 「${w.title}」 프로듀싱을 맡겼다.`, 'career');
}
INBOX.p_offer = {
  ic: '🎛️',
  text: (s, m) => `${m.d.re ? `지난 앨범이 크게 잘된 ${m.d.a.name}(${TIER_N[m.d.a.tier]} 기획사 ${m.d.a.kind}) 쪽에서 다음 앨범도 맡아 달라고 한다.` : `${m.d.a.name}(${TIER_N[m.d.a.tier]} 기획사 ${m.d.a.kind})의 새 앨범을 통째로 맡아 달라는 의뢰다.`}\n\n프로듀싱 비용 ${fmtWon(m.d.fee)} · 작업 기간 석 달 (그동안 일정 한 칸이 작업으로 묶인다) · 컨셉·타이틀곡·녹음을 내가 정한다`,
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
// 비용 중 회사 몫은 지금 전속 계약의 회사 몫. 앨범을 만드는 과정(기획 · 타이틀곡 · 녹음)은 프로듀서와 같다
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
  text: (s, d) => `${d.a.name}(${TIER_N[d.a.tier]} 기획사 ${d.a.kind}) 쪽에서 새 앨범을 통째로 맡아 달라는 의뢰가 ${josa(d.agN, '을를')} 거쳐 들어왔다. 회사가 이번 한 번은 허락했다.\n\n프로듀싱 비용 ${fmtWon(d.fee)} · 회사 몫(${pctN(d.cut)})을 빼면 ${fmtWon(d.net)} · 작업 기간 석 달 (그동안 일정 한 칸이 작업으로 묶인다) · 컨셉 · 타이틀곡 · 녹음을 내가 정한다`,
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
// ① 기획: 앨범 컨셉. 유행 컨셉과 그 가수에게 어울리는 컨셉이 성적을 올리고, 내 컨셉 숙련도가 곡 완성도를 올린다
E({
  id: 'prod_plan', cat: '프로듀싱', title: '앨범 기획 회의', tag: 'career',
  init(s, d) { if (!prodW(s, d)) d.skip = true; },
  text: (s, d) => { const w = prodW(s, d); return `${w.inh ? '회사에서 맡긴 ' : ''}${w.a.name}의 새 앨범 「${w.title}」 기획 회의다. 이번 앨범의 컨셉을 정하자.\n\n요즘 유행은 ${qIda(s.trend)}. ${w.a.name}에게 가장 잘 어울리는 컨셉은 ${qIda(w.a.sig)}.`; },
  ch: (s, d) => { const w = prodW(s, d); return TRENDS.map(c => ({ t: c, tr: c === s.trend, h: [`숙련도 ${gauge(cmGet(s, c))} ${Math.floor(cmGet(s, c))}`, c === w.a.sig ? '잘 어울린다' : ''].filter(Boolean).join(' · '), f: s => { w.c = c; cmGain(s, c, 4); return `${w.a.name} 앨범 「${w.title}」의 컨셉을 '${c}'로 정했다.`; } })); },
});
// ② 곡 수집: 타이틀곡. 내가 쓴 곡이면 저작권료를 더 받고, 공모로 받은 곡은 듣는 귀(스카우트)가 좋을수록 완성도가 정확히 보인다
E({
  id: 'prod_song', cat: '프로듀싱', title: '타이틀곡 고르기', tag: 'career',
  init(s, d) {
    const w = prodW(s, d); if (!w) { d.skip = true; return; }
    const c = w.c || w.a.sig;
    d.mine = lv(me(s), 'compose') * 0.9 + cmBonus(s, c) + U.normal(0, 6);
    d.demos = [0, 1].map(() => ({ by: genName(U.chance(0.5) ? '여' : '남', calY(s) - U.int(20, 45)), q: boughtQ(w.a.tier) + 8 + U.normal(0, 9) }));
  },
  text: (s, d) => { const w = prodW(s, d); return `${w.a.name} 앨범 「${w.title}」에 실을 곡이 모였다. 타이틀곡을 정하자.\n\n내 곡을 고르면 저작권료를 더 받는다. 공모로 받은 곡은 듣는 귀(스카우트)가 좋을수록 완성도를 정확히 알아본다.`; },
  ch: (s, d) => { const w = prodW(s, d), p = me(s); return [{ t: '내가 쓴 곡', h: `완성도 ${grade5(p, d.mine, 'q', 'compose')} · 저작권료 더 받음`, f: s => { w.sq = d.mine; w.own = true; cmGain(s, w.c || w.a.sig, 6); useSkill(s, p, 'compose', 2); return `내가 쓴 곡을 ${w.a.name} 앨범의 타이틀곡으로 정했다.`; } }].concat(d.demos.map(x => ({ t: `${x.by} 작곡가의 곡`, h: `완성도 ${grade5(p, x.q, 'q', 'scout')} (내 듣는 귀로 들은 것)`, f: s => { w.sq = x.q; w.own = false; useSkill(s, p, 'scout', 2); return `${x.by} 작곡가의 곡을 ${w.a.name} 앨범의 타이틀곡으로 골랐다.`; } }))); },
});
// ③ 녹음: 무엇에 힘을 쏟을지. 녹음 디렉팅(가수의 장점을 끌어내기)이나 악기·편곡 실력이 녹음 완성도에 더해진다
// v94: 녹음 디렉팅 = 스카우트(강함) + 노래 · 랩 중 잘하는 쪽(보통)
function prodVoc(p) { return jobMix([[lv(p, 'scout'), JS_], [Math.max(lv(p, 'vocal'), lv(p, 'rap')), JM_]]); }
function prodArr(p) { return Math.max(lv(p, 'piano'), lv(p, 'keyboard'), lv(p, 'guitar'), lv(p, 'compose') * 0.6); }
E({
  id: 'prod_rec', cat: '프로듀싱', title: '녹음 디렉팅', tag: 'career',
  init(s, d) { if (!prodW(s, d)) d.skip = true; },
  text: (s, d) => { const w = prodW(s, d); return `${w.a.name} 앨범 「${w.title}」 녹음이 시작됐다. 녹음실에서 무엇에 힘을 쏟을까?`; },
  ch: (s, d) => { const w = prodW(s, d), p = me(s); return [
    { t: '보컬 디렉팅', h: `내 디렉팅 실력(스카우트 · 노래 · 랩, ${Math.round(prodVoc(p))})만큼 녹음이 좋아진다 · 스트레스 ↑`, f: s => { w.rq = 1 + prodVoc(p) * 0.14; for (const k of ['scout', 'vocal', 'rap']) if (has(p, k)) useSkill(s, p, k, 1); return `${w.a.name}의 녹음을 한 소절씩 직접 디렉팅했다.` + fx(s, { stress: 5 }); } },
    { t: '편곡 다듬기', h: `내 악기·작곡 실력(${Math.round(prodArr(p))}레벨)만큼 녹음이 좋아진다 · 스트레스 ↑`, f: s => { w.rq = 1 + prodArr(p) * 0.14; for (const k of ['piano', 'keyboard', 'guitar']) if (has(p, k)) useSkill(s, p, k, 1); return `${w.a.name} 앨범의 편곡을 밤새 다시 손봤다.` + fx(s, { stress: 5 }); } },
    { t: '가수에게 맡긴다', h: '녹음은 그대로 · 힘을 아낀다', f: s => { w.rq = 0; return `${w.a.name}에게 녹음을 맡겼다.`; } },
  ]; },
});
WORK_TYPES.produce = {
  n: '앨범 프로듀싱', ic: '🎛️',
  status: (s, w) => `${w.a.name} 앨범 「${w.title}」${w.c ? ` · '${w.c}' 컨셉` : ''} · ${w.left}개월 남음`,
  monthly(s, w) {
    const p = me(s); useSkill(s, p, 'compose', 1.6); useSkill(s, p, 'lyric', 0.5); for (const k of ['piano', 'keyboard', 'guitar']) if (has(p, k)) useSkill(s, p, k, 0.3); addStress(s, 2.5);
    // 첫 달엔 타이틀곡을, 둘째 달엔 녹음을 정한다. 셋째 달에 앨범이 나온다
    if (w.left === 3) queueEv(s, 'prod_song', 0, { wid: w.id }, true);
    if (w.left === 2) queueEv(s, 'prod_rec', 0, { wid: w.id }, true);
    // 다른 일에 밀려 아직 못 정한 게 있으면 발매를 한 달 미룬다 (최대 석 달)
    if (w.left === 1 && (w.ext || 0) < 3 && (hasQ(s, 'prod_song') || hasQ(s, 'prod_rec') || hasQ(s, 'prod_plan'))) { w.left++; w.ext = (w.ext || 0) + 1; }
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
    const q = (w.sq != null ? w.sq : lv(p, 'compose') * 0.85 + cmBonus(s, c)) + (w.rq || 0) * 0.7 + t.rep * 0.05;
    const sc = songScore(s, { perf: 20 + w.a.tier * 8 + U.normal(0, 4), q, fans, tier: w.a.tier, trend: c === s.trend, bonus: 2 + (c === w.a.sig ? 3 : 0) });
    const peak = chartFromScore(sc);
    // 사내 프로듀서는 판권을 회사가 가져서 저작권료가 적고, 대신 크게 잘되면 성과급이 나온다
    const roy = addCatalog(s, w.title, '프로듀싱', sc, (w.own ? 1.5 : 1) * (w.inh ? 0.5 : 1), 'producer');
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
    return { text: `${w.a.name}의 ${josa(`「${w.title}」`, '이가')} 나왔다. (내가 프로듀싱 · '${c}' 컨셉 · 타이틀곡 ${w.own ? '내 곡' : w.sq != null ? '공모 곡' : '-'})\n\n${chartText(peak)}\n매달 들어올 저작권료 약 ${fmtWon(roy)}\n프로듀서 평판 ${Math.round(t.rep)}` + (bonus ? `\n회사에서 성과급 ${fmtWon(bonus)}을 받았다.` : '') + (fresh ? `\n\n${josa(w.a.name, '이가')} 다음 앨범도 맡기고 싶어 한다. (단골 가수)` : '') + (up ? `\n\n🎉 ${josa(P_TIERS[k1], '으로')} 올라섰다!` : ''), log: `프로듀싱한 ${w.a.name}의 「${w.title}」 ${chartText(peak)}.` + (up ? ` ${josa(P_TIERS[k1], '으로')} 올라섰다.` : '') };
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
for (const tier of [3, 2, 1]) JOB_APPLY.push({
  id: 'pin_' + tier, trk: 'producer', g: '🎛️ 프로듀서', n: `${TIER_N[tier]} 기획사 사내 프로듀서 채용`, tag: `월급 ${PIN_SAL[tier]}만 원`,
  show: s => !pinOn(s) && age(s) >= 20,
  h: s => `합격 가능성 ${fmtPct(audP(pinScore(s) + empExpBonus(s, 'producer'), PIN_THR[tier]))} · 결과는 다음 달 · 회사 소속 그룹의 앨범을 맡는다 · 작곡 실력과 평판을 본다`,
  ok: s => pinReady(s) && !s.army && !agencyContract(s) && !busyWith(s, 'produce') && !hasQ(s, 'pin_res') && !(s.cd['pin' + tier] > s.t),
  why: s => s.army ? '군 복무 중' : agencyContract(s) ? contractWhy(s) : busyWith(s, 'produce') ? '맡은 앨범 작업을 먼저 끝내야 한다' : !pinReady(s) ? `아직 조건이 안 된다 (작곡 ${lvi(me(s), 'compose')}레벨 · 작곡가 평판 ${Math.round(s.tracks.composer.rep || 0)} · 히트 ${s.tracks.composer.hits || 0}곡)` : hasQ(s, 'pin_res') ? '결과를 기다리는 중' : '얼마 전에 지원했다 (반년 뒤 다시)',
  run: s => { s.cd['pin' + tier] = s.t + 6; const ag = U.pick(musicAgencies().filter(a => a.tier === tier && a.mkt === 'kr')); queueEv(s, 'pin_res', 1, { ag: ag.id, p: audP(pinScore(s) + empExpBonus(s, 'producer'), PIN_THR[tier]) }); return `${ag.n} 사내 프로듀서 채용에 지원했다.`; },
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
// 기획사 직원. 작곡가들이 보낸 데모 중에서 소속 그룹에 맞는 곡을 고른다. 고른 곡이 뜨면 성과급을 받는다
// 스카우트 특기가 있으면 데모의 완성도가 범위로 보인다 (스카우트가 높을수록 좁다)
const ANR_SAL = [0, 170, 200, 240];
const ANR_THR = [0, 12, 20, 28];
// v99 (8-5): 스카우트(강함) · 학업(보통, 서류) + 음감(강함, 가산점: '귀') + 면접 통찰력(보통, 가산점). 음악 특기는 음감이 대신 본다
function anrScore(s) { const p = me(s); return jobMix([[lv(p, 'scout'), JS_], [lv(p, 'study'), JM_]]) + talB(p.tal.music, true) + talB(p.tal.insight, false); }
for (const tier of [3, 2, 1]) JOB_APPLY.push({
  id: 'anr_' + tier, trk: 'anr', g: '🎧 A&R 담당자', n: `${TIER_N[tier]} 기획사 A&R 채용`, tag: `월급 ${ANR_SAL[tier]}만 원`,
  show: s => !trackOn(s, 'anr') && age(s) >= 20,
  h: s => `합격 가능성 ${fmtPct(audP(anrScore(s) + empExpBonus(s, 'anr'), ANR_THR[tier]))} · 결과는 다음 달 · 곡을 고르는 안목(스카우트)과 소리를 듣는 귀, 학업을 본다`,
  ok: s => !s.army && !agencyContract(s) && !hasQ(s, 'anr_res') && !(s.cd['anr' + tier] > s.t),
  why: s => s.army ? '군 복무 중' : agencyContract(s) ? contractWhy(s) : hasQ(s, 'anr_res') ? '결과를 기다리는 중' : '얼마 전에 지원했다 (반년 뒤 다시)',
  run: s => { s.cd['anr' + tier] = s.t + 6; const ag = U.pick(musicAgencies().filter(a => a.tier === tier && a.mkt === 'kr')); queueEv(s, 'anr_res', 1, { ag: ag.id, p: audP(anrScore(s) + empExpBonus(s, 'anr'), ANR_THR[tier]) }); return `${ag.n} A&R 채용에 지원했다.`; },
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
  s.tracks.anr = { st: 'active', ag: d.ag, agN: ag.n, tier: ag.tier, months: 0, cEnd: d.months, rep: empStartRep(s, 'anr', lead), lead, everLead: !!old.everLead || lead, picks: old.picks || 0, hits: old.hits || 0, sal: d.sal, salBase: d.sal, salBase0: lead ? Math.round(d.sal / leadRaise('anr') / 1e5) * 1e5 : d.sal, next: U.int(2, 3), idle: 0, groups, boss: pickIndustry(s, 'A&R 담당자').id };
  const boss = s.people[s.tracks.anr.boss]; meetAt(s, boss, `${ag.n} A&R팀`, 'anr'); boss.job = lead ? 'A&R 본부장' : 'A&R 팀장';
  milestone(s, `${age(s)}세에 ${ag.n} A&R ${lead ? '팀장으로 들어갔다' : '담당자가 되었다'}.`);
  return `${ag.n} A&R팀에 ${lead ? '팀장으로 ' : ''}입사했다. 월급 ${fmtWon(d.sal)} · 계약 ${yrs(d.months)}. ${lead ? '본부장' : '팀장'}은 ${boss.name}.` + tag;
}
NEGO.anr = empNego('anr', startAnr);
CAREERS.anr = {
  n: 'A&R 담당자', ic: '🎧',
  desc: '기획사 직원. 데모를 듣고 소속 그룹의 곡을 고른다. 고른 곡이 뜨면 성과급을 받는다. 스카우트가 중요하다.',
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
// 데모 세 곡 중 하나 고르기. 완성도는 숨어 있고 5단계로 보인다 (스카우트가 높을수록 '보통'이 좁아져 더 잘 가려낸다)
function demoGuess(s, q) { return `완성도 ${grade5(me(s), q, 'q', 'compose')}`; }
E({
  id: 'anr_pick', cat: 'A&R', title: '타이틀곡 고르기', tag: 'career',
  cond: s => trackOn(s, 'anr'),
  init(s, d) {
    const t = s.tracks.anr;
    d.gi = U.int(0, t.groups.length - 1);
    for (const g of t.groups) if (!g.sig) g.sig = U.pick(TRENDS);
    const used = [];
    d.demos = [0, 1, 2].map(i => {
      const c = pickIndustry(s, '작곡가', x => !used.includes(x.id)); used.push(c.id);
      const q = Math.round(U.clamp(lv(c, 'compose') * 0.75 + U.normal(0, 10) + 6, 5, 95));
      return { c: c.id, q, title: songTitle(), cn: U.chance(0.35) ? s.trend : U.pick(TRENDS) };
    });
  },
  text: (s, d) => { const t = s.tracks.anr, g = t.groups[d.gi]; return `${t.agN} 소속 ${g.name}(${g.kind}, 팬 ${fmtFans(g.f)})의 다음 앨범 타이틀곡을 골라야 한다. 작곡가들이 보낸 데모가 세 곡 들어왔다.

${g.name}의 대표 컨셉은 '${g.sig}', 요즘 유행은 ${qIda(s.trend)}.`; },
  ch: (s, d) => d.demos.map(x => { const c = s.people[x.c]; return { t: `「${x.title}」 — 작곡 ${c.name}`, tr: x.cn === s.trend, h: `'${x.cn}' 컨셉${cTag(s, x.cn, s.tracks.anr.groups[d.gi].sig) ? ` (${cTag(s, x.cn, s.tracks.anr.groups[d.gi].sig)})` : ''} · 작곡 ${lvSee(s, c, 'compose')}레벨 · 팬 ${fmtFans(c.fame || 0)} · ${demoGuess(s, x.q)}`, f: s => { meetAt(s, c, `「${x.title}」 데모`); bond(s, c, 4); queueEv(s, 'anr_out', 2, { gi: d.gi, q: x.q, c: x.c, title: x.title, cn: x.cn }); return `${s.tracks.anr.groups[d.gi].name}의 타이틀곡으로 ${c.name}의 ${josa(`「${x.title}」`, '을를')} 골랐다.`; } }; }),
});
function anrEar(p) { return jobMix([[lv(p, 'scout'), JS_]]) + talB(p.tal.music, true); }
E({
  id: 'anr_out', cat: 'A&R', title: '고른 곡의 성적', tag: 'career',
  live: (s, d) => d.live, keepPop: (s, d) => typeof liveShow === 'function' && liveShow(d.live), plio: (s, d) => d.pl || null,
  cond: s => trackOn(s, 'anr'),
  init(s, d) {
    const t = s.tracks.anr, g = t.groups[d.gi];
    // v94: 내 듣는 귀(스카우트 강함 + 음감 가산점)가 곡을 다듬는 데 조금 들어간다
    const sc = songScore(s, { perf: 20 + t.tier * 8 + anrEar(me(s)) * 0.15 + U.normal(0, 4), q: d.q, fans: g.f, tier: t.tier, trend: !!d.cn && d.cn === s.trend, bonus: d.cn && d.cn === g.sig ? 3 : 0 });
    d.peak = chartFromScore(sc);
    g.f = Math.max(0, g.f + fanGainRaw(sc, g.f, 0.6 + t.tier * 0.2, starCap(60, 'kr')));
    d.bonus = d.peak && d.peak <= 10 ? t.sal * 2 : d.peak && d.peak <= 40 ? Math.round(t.sal * 0.5 / 1e5) * 1e5 : 0;
    if (d.bonus) earn(s, d.bonus, 'A&R 성과급');
    t.picks++; if (d.peak && d.peak <= 20) t.hits++;
    // 12-3 보는 쪽: 내가 고른 곡의 무대
    if (typeof liveWatch === 'function') d.live = liveWatch(s, { name: g.name, kind: '그룹', tier: Math.max(1, Math.min(3, t.tier)), title: d.title, sc, peak: d.peak, trend: !!d.cn && d.cn === s.trend, key: t.picks === 1 || (d.peak && d.peak <= 10) });
    if (typeof plioSpec === 'function') d.pl = plioSpec({ k: 'stagew', t: `${g.name} 「${d.title}」 무대`, ch: `${PF.video.n} 뮤직`, me: '', sc, vw: Math.pow(10, 3.6 + sc / 22) });
    // 팀장이면 내가 고른 곡의 성적이 팀 평가에 1.8배로 반영된다
    // 팀장은 기대치가 높아서(곡 점수 55가 아니라 62부터 플러스) 웬만한 성적으로는 평가가 오르지 않는다
    d.lead0 = !!t.lead; d.lc = empRep(s, 'anr', t, (sc - (t.lead ? 62 : 55)) / 3);
    const c = s.people[d.c]; if (c) bond(s, c, sc >= 60 ? 6 : -2);
    addWork(s, { type: 'A&R 참여곡', title: d.title, by: g.name, sc, note: chartText(d.peak), pay: d.bonus || 0 });
    d.promo = d.lc === 'up'; d.demote = d.lc === 'down';
    if (t.rep <= 3) d.fired = true;
    d.sc = sc; d.g = g.name;
  },
  text: (s, d) => `내가 고른 ${d.g}의 「${d.title}」 성적이 나왔다.\n\n${chartText(d.peak)}\n${d.bonus ? `성과급 ${fmtWon(d.bonus)}` : '이번엔 성과급이 없다.'}\n업무 평가 ${Math.round(s.tracks.anr.rep)}` + (d.promo ? '\n\n그동안의 성과를 인정받아 팀장이 되었다! 월급이 오른다.' : '') + (d.demote ? '\n\n평가가 떨어져 팀장 자리에서 내려왔다. 월급도 줄었다.' : '') + (d.fired ? '\n\n연달아 성적이 나빠서 회사에서 나가 달라는 이야기를 들었다.' : ''),
  ch: (s, d) => [{ t: '확인', f: s => { if (d.fired) { const t = s.tracks.anr; t.st = 'ended'; t.endNote = `${t.agN} A&R (해고)`; return `${t.agN}에서 해고됐다.` + fx(s, { stress: 10 }); } return `고른 곡 「${d.title}」 (${d.g}) ${chartText(d.peak)}.`; } }],
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
function trFields(s) { return TR_FIELDS.filter(k => lv(me(s), k) >= 30); }
for (const tier of [3, 2, 1]) JOB_APPLY.push({
  id: 'tr_' + tier, trk: 'trainer', g: '🏋️ 트레이너', n: `${TIER_N[tier]} 기획사 트레이너 채용`, tag: `월급 ${TR_SAL[tier]}만 원`,
  show: s => !trackOn(s, 'trainer') && age(s) >= 20,
  h: s => { const f = trFields(s); return f.length ? f.map(k => `${SKILLS[k].n} ${fmtPct(audP(trScore(s, k) + empExpBonus(s, 'trainer'), TR_THR[tier]))}`).join(' · ') + ' · 결과는 다음 달' : '보컬·랩·댄스·악기 중 하나가 30레벨 이상이어야 지원할 수 있다'; },
  ok: s => !s.army && !agencyContract(s) && trFields(s).length && !hasQ(s, 'tr_res') && !(s.cd['tr' + tier] > s.t),
  why: s => s.army ? '군 복무 중' : agencyContract(s) ? contractWhy(s) : !trFields(s).length ? '가르칠 만한 특기가 아직 없다' : hasQ(s, 'tr_res') ? '결과를 기다리는 중' : '얼마 전에 지원했다 (반년 뒤 다시)',
  run: s => { fireEvent(s, 'tr_pick', { tier }); return ''; },
});
E({
  id: 'tr_pick', cat: '채용', title: '무엇을 가르칠까?', tag: 'career',
  text: (s, d) => `${TIER_N[d.tier]} 기획사 트레이너 자리에 지원한다. 어떤 분야를 가르칠까?\n\n그 분야 실력과 교육 특기를 함께 본다.`,
  ch: (s, d) => trFields(s).map(k => { const p = audP(trScore(s, k) + empExpBonus(s, 'trainer'), TR_THR[d.tier]); return { t: trFieldN(k), h: `${SKILLS[k].n} ${lvi(me(s), k)}레벨 · 교육 ${has(me(s), 'edu') ? lvi(me(s), 'edu') + '레벨' : '없음'} · 합격 가능성 ${fmtPct(p)}`, f: s => { s.cd['tr' + d.tier] = s.t + 6; const ag = U.pick(musicAgencies().filter(a => a.tier === d.tier && a.mkt === 'kr')); queueEv(s, 'tr_res', 1, { ag: ag.id, k, p }); return `${ag.n} ${trFieldN(k)} 채용에 지원했다.`; } }; }).concat([{ t: '그만둔다', f: () => '지원하지 않았다.' }]),
});
function makeStudent(s, t) {
  const k = t.k, tb = Math.max(0, (t.tier || 1) - 1);
  const sk = { [k]: U.int(8, 22) + tb * 4 };
  if (k !== 'dance') sk.dance = U.int(5, 15);
  if (k !== 'vocal') sk.vocal = U.int(5, 18);
  const st = makeMusicMate(s, { age: U.int(13, 19), rel: '제자', job: '연습생', met: `${t.agN} 연습생 (내 제자)`, aff: 45, tal: k === 'dance' ? ['rhythm', 'athletic'] : ['music', 'rhythm'], sk });
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
    return [['회사', `${t.agN} (${TIER_N[t.tier]} 기획사) · ${trFieldN(t.k)}${t.lead ? ' 팀장' : ''}`], ['월급', fmtWon(t.sal)], ['내 실력', `${SKILLS[t.k].n} ${lvi(p, t.k)} · 교육 ${lvi(p, 'edu')}`], ['업무 평가', `${Math.round(t.rep)}`], ['길러 낸 연습생', `데뷔 ${t.debuts}명${t.cuts ? ` · 방출 ${t.cuts}명` : ''}`],
      { h: `맡은 연습생 (${sts.length}명)`, items: sts.map(x => `${x.name} (${gN(x)} · ${pAge(s, x)}세) — ${SKILLS[t.k].n} ${lvi(x, t.k)}레벨${canScout(p, t.k) ? ` · 성장성 ${potGrade(p, x, t.k)}` : ''} · 맡은 지 ${Math.max(0, s.t - (x.trSince != null ? x.trSince : s.t))}개월 · ${relWord(x)}`) }].filter(Boolean);
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
    const lines = d.ids.map(id => { const x = s.people[id]; return `· ${who(x)} ${SKILLS[t.k].n} ${lvi(x, t.k)}레벨${canScout(p, t.k) ? ` · 성장성 ${potGrade(p, x, t.k)}` : ''} · ${relWord(x)}`; }).join('\n');
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
