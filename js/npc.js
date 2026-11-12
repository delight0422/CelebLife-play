'use strict';
// ───── 업계 인물 (12단계 12-2) ─────
// 분야마다 이름 있는 인물(팀)을 8~12명 둔다. 내가 아무것도 안 해도 매달 스스로 움직인다 (컴백 · 출연 · 이적 · 열애설 · 논란 · 공백 · 은퇴, 빈자리는 신인)
// 명단 · 순위표는 화면에 두지 않는다. 내가 알게 된 인물만 인간관계 창 맨 아래 '⭐ 업계 인물'에 나오고, 거기서 '☆ 관심 인물'로 고른 인물의 근황만 요약 창 '📰 소식'에 가끔 나온다
// 라이벌 · 가까운 동료 · 데뷔 동기는 저절로 관심 인물이 된다. 내 활동 분야의 인물은 먼저 다가온다 (협업 제안 · 같은 시기 경쟁 · 응원 · 디스)
// 가벼운 기록(s.npc.L)으로만 둔다. 한 명에 100바이트쯤이라 세이브가 커지지 않는다
// 기록: { id, f: 분야, n: 이름, g: 성별(팀은 ''), by: 태어난 해(팀은 결성한 해), sk: 실력, pop: 인기 0~100, ps: 성격, ph: 시기, pt: 그 시기가 된 달, ag: 소속,
//         fol: 관심 인물, kn: 내가 아는 인물, r: 나와의 사이 -100~100, rk: 'rival' · 'pal' · 'dongi', nt: 마지막으로 소식에 나온 달 }
const NPC_F = {
  idolg: { n: '아이돌 그룹', ic: '💫', trk: ['idol'], cnt: 12, team: true, rel: ['새 미니 앨범으로 컴백했다', '정규 앨범을 냈다', '새 싱글로 돌아왔다'], hit: '음악방송 1위를 했다', clash: '컴백했다' },
  solo: { n: '솔로 가수', ic: '🎤', trk: ['solo'], cnt: 10, rel: ['신곡을 냈다', '새 앨범을 냈다'], hit: '신곡이 차트 상위권에 올랐다', clash: '신곡을 냈다' },
  band: { n: '밴드', ic: '🎸', trk: ['band', 'player'], cnt: 9, team: true, rel: ['새 앨범을 냈다', '단독 공연을 열었다', '페스티벌 무대에 섰다'], hit: '공연이 전석 매진됐다', clash: '새 앨범을 냈다' },
  actor: { n: '배우', ic: '🎬', trk: ['actor'], cnt: 12, rel: ['새 드라마에 캐스팅됐다', '새 영화 촬영에 들어갔다', '새 작품으로 돌아왔다'], hit: '출연작이 크게 흥행했다', clash: '같은 시기에 작품이 공개됐다' },
  variety: { n: '예능인', ic: '😆', trk: ['variety'], cnt: 9, rel: ['새 예능의 고정 출연자가 됐다', '새 프로그램 MC를 맡았다'], hit: '맡은 프로그램이 화제가 됐다', clash: '같은 시간대 프로그램에 나온다' },
  vtuber: { n: '버튜버', ic: '🖥️', trk: ['vidol', 'youtube'], cnt: 10, rel: ['기념 방송을 했다', '새 의상을 공개했다', '3D 라이브를 했다'], hit: '방송 클립이 크게 퍼졌다', clash: '같은 시간에 큰 방송을 잡았다' },
  model: { n: '모델', ic: '👠', trk: ['model'], cnt: 8, rel: ['패션위크 런웨이에 섰다', '잡지 표지를 찍었다', '브랜드 모델이 됐다'], hit: '화보가 화제가 됐다', clash: '같은 쇼에 선다' },
  voice: { n: '성우', ic: '🎙️', trk: ['voice'], cnt: 8, rel: ['새 애니메이션의 주연을 맡았다', '게임 캐릭터 목소리를 맡았다'], hit: '맡은 캐릭터가 큰 인기를 얻었다', clash: '같은 작품 오디션을 봤다' },
  webtoon: { n: '웹툰 작가', ic: '🖌️', trk: ['webtoon', 'illust'], cnt: 8, rel: ['새 연재를 시작했다', '연재작을 완결했다'], hit: '연재작이 요일 1위에 올랐다', clash: '같은 요일에 새 연재를 시작했다' },
  webnovel: { n: '웹소설 작가', ic: '📖', trk: ['webnovel'], cnt: 8, rel: ['새 연재를 시작했다', '연재작을 완결했다'], hit: '연재작이 플랫폼 1위에 올랐다', clash: '같은 날 새 연재를 시작했다' },
};
const NPC_FIDS = Object.keys(NPC_F);
// 성격: 야심(경쟁 · 디스) · 성실(꾸준히 활동) · 사고뭉치(논란 · 열애설) · 다정(응원 · 협업) · 조용함(공백)
const NPC_PS = { amb: '야심가', dil: '성실파', trb: '사고뭉치', kind: '다정한 사람', shy: '조용한 사람' };
const NPC_PH = { rookie: '신인', rise: '떠오르는 중', peak: '전성기', fall: '내리막', rest: '쉬는 중' };
const NPC_AG = ['루멘 엔터', '하늘소리', '블루도어', '스튜디오 온', '모노리스', '페이퍼문', '소속 없음', '소속 없음'];
function npcOn(s) { return !!(s.npc && s.npc.L); }
function npcList(s, f) { return npcOn(s) ? s.npc.L.filter(n => !f || n.f === f) : []; }
function npcBy(s, id) { return npcOn(s) ? s.npc.L.find(n => n.id === id) : null; }
function npcName(s, f) {
  const F = NPC_F[f], g = U.chance(0.5) ? '여' : '남';
  const gen = f === 'idolg' ? () => groupNameRaw(0) : f === 'band' ? () => U.pick(BAND_NAMES) : f === 'vtuber' ? () => vtRpRaw(g) : f === 'webtoon' || f === 'webnovel' ? () => (U.chance(0.5) ? ytNick() : genName(g, calY(s) - 30)) : () => genName(g, calY(s) - U.int(20, 40));
  let n = '';
  for (let i = 0; i < 40; i++) { n = gen(); if (!nameTaken(n) && !s.npc.L.some(x => x.n === n) && n !== me(s).name) break; }
  return { n, g: F.team ? '' : g };
}
// 새 인물. rookie면 막 데뷔한 신인, 아니면 나이 · 시기를 섞는다
function npcMake(s, f, rookie) {
  const F = NPC_F[f], nm = npcName(s, f), y = calY(s);
  const ph = rookie ? 'rookie' : U.wpick(['rookie', 'rise', 'peak', 'fall'], x => ({ rookie: 2, rise: 3, peak: 3, fall: 2 })[x]);
  const sk = Math.round(U.clamp(U.normal(rookie ? 48 : 58, 14), 20, 96));
  const base = { rookie: 12, rise: 38, peak: 68, fall: 45 }[ph];
  const yrs = { rookie: 0, rise: 3, peak: 7, fall: 12 }[ph] + U.int(0, 3);
  const n = { id: 'n' + U.uid(), f, n: nm.n, g: nm.g, by: F.team ? y - yrs : y - yrs - U.int(18, 26), sk, pop: Math.round(U.clamp(base + (sk - 55) * 0.5 + U.normal(0, 8), 2, 98)), ps: U.pick(Object.keys(NPC_PS)), ph, pt: s.t, ag: f === 'webtoon' || f === 'webnovel' ? '' : U.pick(NPC_AG), r: 0 };
  s.npc.L.push(n);
  return n;
}
function npcInit(s) {
  s.npc = { L: [], nm: 0, nc: 0, deb: {} };
  for (const f of NPC_FIDS) for (let i = 0; i < NPC_F[f].cnt; i++) npcMake(s, f, false);
}
// 소식: 관심 인물만, 한 달에 두 줄까지, 같은 인물은 석 달에 한 번 (big이면 늘 나온다)
function npcNews(s, n, x, big, poss) {
  if (!n.fol) return;
  if (s.npc.nm !== s.t) { s.npc.nm = s.t; s.npc.nc = 0; }
  if (!big && (s.npc.nc >= 2 || (n.nt != null && s.t - n.nt < 3))) return;
  s.npc.nc++; n.nt = s.t;
  // poss: "누구의 신곡이 …"처럼 주어가 따로 있는 문장
  addLog(s, `📰 ${NPC_F[n.f].n} ${poss ? n.n + '의' : josa(n.n, '이가')} ${x}`, 'news');
}
function npcPhase(s, n, ph) { n.ph = ph; n.pt = s.t; }
function npcMoveLine(n) { return n.f === 'webtoon' || n.f === 'webnovel' ? '연재 플랫폼을 옮겼다.' : '소속사를 옮겼다.'; }
// 한 달: 인물마다 스스로 움직인다
function npcMonth(s) {
  if (!npcOn(s)) npcInit(s);
  const L = s.npc.L;
  for (const n of L.slice()) {
    const F = NPC_F[n.f], yrs = (s.t - n.pt) / 12, ps = n.ps;
    // 시기가 넘어간다: 신인 → 떠오름 → 전성기 → 내리막 → 은퇴. 실력이 좋으면 전성기가 길다
    if (n.ph === 'rest') { if (U.chance(0.12)) { npcPhase(s, n, n.ph0 || 'rise'); npcNews(s, n, '활동을 다시 시작했다.'); } continue; }
    if (n.ph === 'rookie' && yrs > 1 && U.chance(0.06)) { if (n.sk + U.normal(0, 12) >= 45) npcPhase(s, n, 'rise'); else npcPhase(s, n, 'fall'); }
    else if (n.ph === 'rise' && yrs > 2 && U.chance(0.04)) npcPhase(s, n, n.sk + U.normal(0, 12) >= 50 ? 'peak' : 'fall');
    else if (n.ph === 'peak' && yrs > 3 && U.chance(0.008 + Math.max(0, 80 - n.sk) / 4000)) { npcPhase(s, n, 'fall'); npcNews(s, n, '예전만큼 이름이 들리지 않는다.'); }
    // 인기가 시기를 따라 움직인다
    const tgt = { rookie: 14 + n.sk * 0.15, rise: 30 + n.sk * 0.35, peak: 45 + n.sk * 0.5, fall: 18 + n.sk * 0.2 }[n.ph];
    n.pop = U.clamp(n.pop + (tgt - n.pop) * 0.03 + U.normal(0, 0.6), 1, 99);
    // 은퇴 · 해체: 내리막이 길어지고 인기가 떨어지면. 빈자리는 신인이 채운다
    if (n.ph === 'fall' && yrs > 1 && U.chance(n.pop < 35 ? 0.04 : 0.02)) { npcOut(s, n, F.team ? '해체를 발표했다.' : '은퇴를 발표했다.'); continue; }
    // 활동: 성실파는 자주, 조용한 사람은 드물게
    const act = 0.07 * (ps === 'dil' ? 1.5 : ps === 'shy' ? 0.6 : 1);
    if (U.chance(act)) {
      const hit = U.chance(0.1 + n.sk / 400);
      n.pop = U.clamp(n.pop + (hit ? U.fl(3, 7) : U.fl(0, 2)), 1, 99);
      npcNews(s, n, hit ? F.hit + '.' : U.pick(F.rel) + '.', false, hit && n.f !== 'idolg');
    } else if (U.chance(ps === 'trb' ? 0.012 : 0.003)) {
      const bad = U.chance(ps === 'trb' ? 0.6 : 0.35);
      n.pop = U.clamp(n.pop + (bad ? -U.fl(4, 10) : U.fl(-2, 2)), 1, 99);
      npcNews(s, n, bad ? U.pick(['논란에 휩싸였다.', '구설에 올라 사과문을 냈다.']) : (F.team ? '멤버 한 명의 열애설이 났다.' : '열애설이 났다.'), bad);
      if (bad && U.chance(0.4)) { n.ph0 = n.ph; npcPhase(s, n, 'rest'); }
    } else if (n.ag !== '' && U.chance(ps === 'amb' ? 0.006 : 0.003)) { n.ag = U.pick(NPC_AG.filter(a => a !== n.ag)); npcNews(s, n, npcMoveLine(n)); }
    else if (U.chance(ps === 'shy' ? 0.008 : 0.002)) { n.ph0 = n.ph; npcPhase(s, n, 'rest'); npcNews(s, n, '당분간 활동을 쉰다고 밝혔다.'); }
  }
  // 분야마다 인원을 채운다 (신인 데뷔)
  for (const f of NPC_FIDS) if (npcList(s, f).length < NPC_F[f].cnt && U.chance(0.3)) npcMake(s, f, true);
  npcDebutMates(s);
  npcApproach(s);
}
function npcOut(s, n, line) {
  npcNews(s, n, line, true);
  if (n.rk || n.fol) addLog(s, `${NPC_F[n.f].ic} ${josa(n.n, '이가')} 업계를 떠났다.${n.rk === 'rival' ? ' 오래 겨뤄 온 상대였다.' : n.rk ? ' 가깝게 지내던 사이였다.' : ''}`, 'news');
  s.npc.L.splice(s.npc.L.indexOf(n), 1);
}
// ───── 나와의 사이 ─────
// 내가 지금 활동하는 분야 (아이돌 · 기획사 밴드 연습생은 데뷔한 뒤부터)
function npcMyFields(s) {
  return NPC_FIDS.filter(f => NPC_F[f].trk.some(id => trackOn(s, id) && !(id === 'idol' && s.tracks.idol.st !== 'active')));
}
function npcKnow(n) { n.kn = 1; }
function npcFollow(n, on) { n.fol = on ? 1 : 0; if (on) n.kn = 1; }
function npcRel(s, n, d, rk) {
  n.r = U.clamp((n.r || 0) + d, -100, 100); npcKnow(n);
  if (rk) n.rk = rk; else if (!n.rk && n.r >= 40) n.rk = 'pal'; else if (!n.rk && n.r <= -40) n.rk = 'rival';
  if (n.rk) npcFollow(n, true); // 라이벌 · 가까운 동료 · 동기는 저절로 관심 인물
}
function npcRelWord(n) { return n.rk === 'rival' ? '라이벌' : n.rk === 'dongi' ? '데뷔 동기' : n.rk === 'pal' ? '가까운 동료' : (n.r || 0) >= 15 ? '호의적' : (n.r || 0) <= -15 ? '껄끄러움' : '아는 사이'; }
// 데뷔 동기: 내가 그 분야에서 활동을 시작하면 같은 해 신인 둘이 동기가 된다
function npcDebutMates(s) {
  for (const f of npcMyFields(s)) {
    if (s.npc.deb[f]) continue;
    // 이미 이름이 알려졌거나 다른 분야에서 먼저 데뷔한 사람은 신인들과 동기로 묶이지 않는다 (v130: 경력 차이가 난다)
    const vet = (s.fame || 0) >= 15 || Object.keys(s.npc.deb).length > 0;
    s.npc.deb[f] = calY(s);
    if (vet) continue;
    const R = npcList(s, f).filter(n => n.ph === 'rookie' && s.t - n.pt <= 18);
    while (R.length < 2) R.push(npcMake(s, f, true));
    const M = U.shuffle(R).slice(0, 2);
    for (const n of M) npcRel(s, n, 10, 'dongi');
    addLog(s, `${NPC_F[f].ic} 같은 해에 활동을 시작한 ${M.map(n => n.n).join(', ')}${josa(M[M.length - 1].n, '이가').slice(M[M.length - 1].n.length)} 데뷔 동기로 같이 묶여 불린다.`, 'news');
  }
}
// 내 인지도와 비슷한 급의 인물 (너무 위나 아래는 먼저 다가오지 않는다)
function npcNear(s, f) { const me0 = s.fame || 0; return npcList(s, f).filter(n => n.ph !== 'rest' && Math.abs(n.pop - me0) <= 28); }
// 먼저 다가온다: 1년에 두 번쯤. 성격에 따라 협업 제안 · 응원 · 디스 · 같은 시기 경쟁
function npcApproach(s) {
  const F = npcMyFields(s);
  // 군 복무 · 자숙 · 입원 중에는 맞붙을 일도, 같이 일할 일도 없다 (v129)
  if (s.army || s.hiatus || s.ill) return;
  if (!F.length || (s.cd.npc || 0) > s.t || s.pending || !U.chance(0.16)) return;
  const f = U.pick(F), near = npcNear(s, f);
  if (!near.length) return;
  // 이미 아는 인물이 더 자주 온다
  const n = U.wpick(near, x => 1 + (x.kn ? 2 : 0) + (x.rk ? 3 : 0));
  s.cd.npc = s.t + U.int(4, 8);
  const k = n.rk === 'rival' ? U.wpick(['clash', 'diss'], x => ({ clash: 3, diss: 1 })[x])
    : n.ps === 'kind' || n.rk === 'pal' || n.rk === 'dongi' ? U.wpick(['collab', 'cheer'], x => ({ collab: 2, cheer: 2 })[x])
      : n.ps === 'amb' ? U.wpick(['clash', 'diss', 'collab'], x => ({ clash: 3, diss: 1, collab: 1 })[x])
        : n.ps === 'trb' ? U.wpick(['diss', 'collab', 'clash'], x => ({ diss: 2, collab: 1, clash: 1 })[x])
          : U.wpick(['collab', 'cheer', 'clash'], x => ({ collab: 2, cheer: 1, clash: 2 })[x]);
  npcKnow(n);
  if (k === 'collab') { if (!s.inbox.some(m => m.kind === 'npc_collab')) sendMsg(s, 'npc_collab', { from: n.n, title: npcCollabN(n.f) + ' 제안', months: 4, d: { id: n.id } }); }
  else queueEv(s, 'npc_' + k, 0, { id: n.id });
}
function npcCollabN(f) { return f === 'vtuber' ? '합동 방송' : f === 'idolg' || f === 'solo' || f === 'band' ? '합동 무대' : f === 'actor' || f === 'voice' ? '동반 출연' : f === 'variety' ? '동반 출연' : f === 'model' ? '합동 화보' : '합작'; }
// 같이 일해서 느는 팬: 상대 인기가 높을수록. 크지 않게
function npcFanGain(s, n) { return Math.round((150 + Math.pow(n.pop, 2) * 3) * U.fl(0.6, 1.2) * (typeof popSpeed === 'function' ? popSpeed(s) : 1)); }
INBOX.npc_collab = {
  ic: '🤝',
  text: (s, m) => { const n = npcBy(s, m.d.id); return n ? `${NPC_F[n.f].n} ${n.n}${n.ag && n.ag !== '소속 없음' ? ` (${n.ag})` : ''} 쪽에서 ${npcCollabN(n.f)}${josa(npcCollabN(n.f), '을를').slice(npcCollabN(n.f).length)} 같이 하자는 연락이 왔다.\n\n요즘 ${NPC_PH[n.ph]}인 ${NPC_PS[n.ps]}이다. 나와는 ${npcRelWord(n)}.` : '연락을 준 사람이 그사이 업계를 떠났다.'; },
  ch: (s, m) => {
    const n = npcBy(s, m.d.id);
    if (!n) return [{ t: '확인', f: () => '제안은 없던 일이 됐다.' }];
    return [
      { t: '같이 한다', h: '팬이 조금 늘고 사이가 가까워진다', f: s => { const v = npcFanGain(s, n); npcRel(s, n, 22); n.pop = U.clamp(n.pop + 1, 1, 99); const log = `${n.n}${josa(n.n, '과와').slice(n.n.length)} ${npcCollabN(n.f)}${josa(npcCollabN(n.f), '을를').slice(npcCollabN(n.f).length)} 했다. 서로의 팬들이 반가워했다.` + fx(s, { fkr: v, stress: 3 }); const co = n.f === 'vtuber' ? npcCoLive(s, n) : null; return co ? streamShow(s, co.job, 0, '합동 방송', log, co.sp, { noDon: true, gain: v, gainK: '팬' }) : log; } },
      { t: '정중히 거절한다', f: s => { npcRel(s, n, n.ps === 'amb' ? -8 : -2); return `${n.n}의 ${npcCollabN(n.f)} 제안을 정중히 거절했다.`; } },
    ];
  },
};
// 버튜버 인물과의 합동 방송(합방)은 라이브온 창으로 본다 (v139: '중요할 때만'에서도). 내가 버츄얼 아이돌이거나 개인 버튜버일 때만
function npcCoLive(s, n) {
  if (typeof viLive === 'function' && trackOn(s, 'vidol') && s.tracks.vidol.st === 'active') { const sp = viLive(s, s.tracks.vidol, 'collab', { co: n.n }); return sp ? { job: 'vidol', sp } : null; }
  const t = s.tracks.youtube;
  if (typeof ytLive === 'function' && trackOn(s, 'youtube') && t.st === 'active' && t.mode === 'vt') { const sp = ytLive(s, t, 'collab', { co: n.n }); return sp ? { job: 'youtube', sp } : null; }
  return null;
}
// 응원: 고를 것 없이 요약의 특별한 일에 남는다
E({
  id: 'npc_cheer', cat: '업계', title: '응원을 받았다', tag: 'career', cond: s => npcOn(s),
  init(s, d) { if (!npcBy(s, d.id)) d.skip = true; },
  text: (s, d) => { const n = npcBy(s, d.id); return `${NPC_F[n.f].n} ${josa(n.n, '이가')} ${U.pick(['인터뷰에서 요즘 눈여겨보는 사람으로 내 이름을 말했다.', '자기 채널에 내 작품을 추천했다.', '방송에서 내 이야기를 좋게 꺼냈다.'])}`; },
  ch: (s, d) => [{ t: '고맙다고 연락한다', f: s => { const n = npcBy(s, d.id); npcRel(s, n, 15); return `${josa(n.n, '이가')} 공개적으로 나를 응원해 줬다. 고맙다고 연락했다.` + fx(s, { fkr: Math.round(npcFanGain(s, n) * 0.4) }); } }],
});
// 디스
E({
  id: 'npc_diss', cat: '업계', title: '나를 겨냥한 말', tag: 'career', cond: s => npcOn(s),
  init(s, d) { if (!npcBy(s, d.id)) d.skip = true; },
  text: (s, d) => { const n = npcBy(s, d.id); return `${NPC_F[n.f].n} ${josa(n.n, '이가')} ${U.pick(['방송에서 내 이름을 대지 않고 나를 깎아내리는 말을 했다. 누가 들어도 내 얘기였다.', '인터뷰에서 "요즘 뜨는 사람들은 실력보다 운"이라고 했다. 기사 제목에 내 이름이 붙었다.', '자기 채널에서 내 작품을 비꼬았다.'])}\n\n${NPC_PS[n.ps]}로 알려진 사람이다.`; },
  ch: (s, d) => {
    const n = npcBy(s, d.id);
    return [
      { t: '맞받아친다', h: '화제는 되지만 사이가 틀어진다', f: s => { npcRel(s, n, -30, 'rival'); return `${n.n}의 말을 공개적으로 맞받아쳤다. 사람들이 둘을 라이벌로 부르기 시작했다.` + fx(s, { fame: 2, stress: 5 }); } },
      { t: '웃어넘긴다', f: s => { npcRel(s, n, -6); return `${n.n}의 말을 웃어넘겼다. 어른스럽다는 말을 들었다.` + fx(s, { rep: 1, stress: 2 }); } },
      { t: '따로 연락해 푼다', h: '상대 성격에 따라 풀릴 수도 있다', f: s => { const ok = U.chance(n.ps === 'kind' ? 0.8 : n.ps === 'amb' ? 0.3 : 0.55); npcRel(s, n, ok ? 14 : -10); return ok ? `${n.n}에게 따로 연락했다. 오해였다며 사과를 받았다.` + fx(s, { stress: -2 }) : `${n.n}에게 따로 연락했지만 답이 차가웠다.` + fx(s, { stress: 3 }); } },
    ];
  },
});
// 같은 시기 경쟁
E({
  id: 'npc_clash', cat: '업계', title: '같은 시기에 맞붙었다', tag: 'career', cond: s => npcOn(s),
  init(s, d) { if (!npcBy(s, d.id)) d.skip = true; },
  text: (s, d) => { const n = npcBy(s, d.id); return `${NPC_F[n.f].n} ${josa(n.n, '이가')} 나와 ${NPC_F[n.f].clash}. 사람들이 둘을 나란히 놓고 이야기한다.\n\n상대는 요즘 ${NPC_PH[n.ph]}이다.`; },
  ch: (s, d) => {
    const n = npcBy(s, d.id);
    return [
      { t: '정면으로 겨룬다', h: '이기면 팬이 늘고, 어느 쪽이든 라이벌이 된다', f: s => { const win = U.chance(U.clamp(0.5 + ((s.fame || 0) - n.pop) / 80, 0.15, 0.85)); npcRel(s, n, -12, 'rival'); if (win) n.pop = U.clamp(n.pop - 1, 1, 99); return win ? `${n.n}${josa(n.n, '과와').slice(n.n.length)}의 맞대결에서 내가 더 주목받았다.` + fx(s, { fkr: npcFanGain(s, n), fame: 1, stress: 4 }) : `${n.n}${josa(n.n, '과와').slice(n.n.length)}의 맞대결에서 밀렸다. 다음엔 이기고 싶다.` + fx(s, { stress: 6 }); } },
      { t: '신경 쓰지 않는다', f: s => { npcKnow(n); return `${n.n}${josa(n.n, '과와').slice(n.n.length)} 비교되는 걸 신경 쓰지 않고 내 일을 했다.` + fx(s, { stress: 1 }); } },
      { t: '먼저 응원을 보낸다', f: s => { npcRel(s, n, n.ps === 'amb' ? 4 : 12); return `${n.n}에게 먼저 응원을 보냈다. ${n.ps === 'amb' ? '답은 짧았다.' : '고맙다는 답이 왔다.'}` + fx(s, { rep: 1 }); } },
    ];
  },
});
// 무대 창의 1위 발표에 같이 서는 팀: 실제 업계 인물 이름을 쓰고, 본 인물로 남긴다
function npcStageRival(s, not) {
  const L = npcList(s, 'idolg').filter(n => n.ph !== 'rest' && n.n !== not).sort((a, b) => b.pop - a.pop).slice(0, 5);
  if (!L.length) return '';
  const n = U.pick(L); npcKnow(n);
  return n.n;
}
// ───── 화면: 업계 인물 줄 (직업 창의 업계 인물 탭, 내가 아는 인물만). 인간관계 창에서는 뺐다 (UI 개편 시안) ─────
function npcRowsHTML(s, L) {
  let h = '';
  for (const n of L) {
    const F = NPC_F[n.f];
    h += `<div class="npc nx"><div class="nx-t"><b>${F.ic} ${U.esc(n.n)}</b><span class="hint">${F.n}${n.g ? '' : ''} · ${NPC_PH[n.ph]} · ${NPC_PS[n.ps]}</span></div><div class="nx-b"><span class="chip${n.rk === 'rival' ? ' bad' : ''}">${npcRelWord(n)}</span><button class="btn sm${n.fol ? ' primary' : ''}" data-npcfol="${n.id}">${n.fol ? '★ 관심 인물' : '☆ 관심 인물'}</button></div></div>`;
  }
  return h;
}
