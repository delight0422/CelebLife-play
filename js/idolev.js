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
  get() { const s = typeof S !== 'undefined' ? S : null; if (idolIsBand(s)) return BAND_TR_ACT; if (idolIsSoloTr(s)) return SOLO_TR_ACT; const t = s && s.tracks && s.tracks.idol; return t && t.st === 'active' ? IDOL_PH[idolPhase(s, t)] : IDOL_ACT; },
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
  // v159: 여섯 가지가 늘 보인다. 지금 할 수 없는 것은 막힌 채로 이유(no)를 보여 준다
  { id: 'song', ic: '🎼', n: '자작곡 쓰기', f: 'subSong', show: (s, t) => t.st === 'active' && has(me(s), 'compose'), no: (s, t) => t.st !== 'active' ? '데뷔한 뒤에 할 수 있다' : '작곡 특기가 있어야 한다', h: s => has(me(s), 'compose') ? `다음 앨범 데모곡 모집에 내 곡을 낸다 · 남의 곡과 똑같이 A&R 심사를 받는다 · 작곡 ${lvi(me(s), 'compose')}레벨` : '다음 앨범 데모곡 모집에 내 곡을 낸다 · 남의 곡과 똑같이 A&R 심사를 받는다' },
  { id: 'lyr', ic: '✍️', n: '가사 쓰기', f: 'subLyr', show: (s, t) => t.st === 'active' && has(me(s), 'lyric'), no: (s, t) => t.st !== 'active' ? '데뷔한 뒤에 할 수 있다' : '작사 특기가 있어야 한다', h: s => has(me(s), 'lyric') ? `실릴 곡의 가사를 써 보겠다고 한다 · 맡을 작사가보다 잘 쓰면 타이틀곡 · 작사 ${lvi(me(s), 'lyric')}레벨` : '실릴 곡의 가사를 써 보겠다고 한다 · 맡을 작사가보다 잘 쓰면 타이틀곡' },
  { id: 'act', ic: '🎭', n: '연기 연습', sk: 'acting', show: () => true, h: (s, t) => `연기 ↑ · 스트레스 조금 ↑${t.st === 'active' ? ' · 연기가 늘면 웹드라마 제안이 온다' : ''}` },
  { id: 'fan', ic: '💬', n: '팬 소통', show: (s, t) => t.st === 'active', no: () => '데뷔한 뒤에 할 수 있다', h: () => '라이브 방송 · 메시지 · 내 팬 ↑ · 그룹 팬 조금 ↑ · 스트레스 조금 ↑ · 가끔 말실수' },
  { id: 'mate', ic: '🤝', n: t => t.st === 'active' ? '멤버 챙기기' : '동기 챙기기', show: (s, t) => t.st === 'active' || idMates(s, t).length > 0, no: () => '같이 지내는 동기가 없다', h: (s, t) => { const n = (t.st === 'active' ? idMem(s, t) : idMates(s, t)).length; return `💸 매달 밥값 ${fmtWon(5e4 * (n + 1))}이 나간다 (한 사람에 5만 원) · ${t.st === 'active' ? '멤버 사이 ↑ · 팀워크 ↑' : '동기 사이 ↑'} · 스트레스 ↓`; } },
  { id: 'var', ic: '😆', n: '예능 감 익히기', sk: 'variety', show: () => true, h: (s, t) => `예능 ↑ · 스트레스 조금 ↑${t.st === 'active' ? ' · 개인 예능 섭외가 더 자주 온다' : ''}` },
];
function idolWayN(t, w) { return typeof w.n === 'function' ? w.n(t) : w.n; }
function idolWayOn(t, w) { return w.f ? !!t[w.f] : (t.ways || []).includes(w.id); }
function idolWayHas(t, id) { return (t.ways || []).includes(id); }
function idolWayCnt(s, t) { return IDOL_WAYS.filter(w => idolWayOn(t, w)).length; }
function idolWaySet(s, t, w, v) {
  const nm = idolWayN(t, w);
  if (w.f) t[w.f] = v; else { t.ways = (t.ways || []).filter(x => x !== w.id); if (v) t.ways.push(w.id); }
  const x = v && w.sk && !has(me(s), w.sk) ? learnMe(s, w.sk, 1) : '';
  return v ? `${josa(nm, '을를')} 꾸준히 하기로 했다.${x}` : `${josa(nm, '은는')} 그만하기로 했다.`;
}
function idolPicks(s, t) {
  if (s.army || (t.st !== 'active' && !idTr(s))) return [];
  const n = idolWayCnt(s, t);
  // v159: '한 번 하는 일'(외부 레슨 · 게릴라 공연)은 뺐다 (사용자 결정: 직업 창에는 켜 두는 일만. 한 번 하는 일이 필요하면 활동 지원으로 — v238부터는 직업 창 '지원' 탭)
  return IDOL_WAYS.map((w, i) => {
    const can = w.show(s, t), on = idolWayOn(t, w), room = !w.sk || has(me(s), w.sk) || skRoom(s, w.sk);
    return { sw: true, on, sec: i === 0 ? `매달 꾸준히 한다 · ${IDOL_WAY_MAX}가지까지 (지금 ${n}가지)` : '', t: `${w.ic} ${idolWayN(t, w)}`, tag: on ? (can ? '켜 둠' : `켜 둠 · 쉬는 중 (${w.no(s, t)})`) : '', h: w.h(s, t), btn: on ? '끄기' : '켜기', ok: on || (can && n < IDOL_WAY_MAX && room), why: !can ? w.no(s, t) : !room ? `특기가 ${SKILL_CAP}개라 ${SKILLS[w.sk].n} 특기를 새로 배울 수 없다` : `${IDOL_WAY_MAX}가지까지만 켜 둘 수 있다 · 하나를 먼저 끈다`, run: s => idolWaySet(s, t, w, !on) };
  });
}
CAREERS.idol.picks = (s, t) => idolPicks(s, t);
// v220: 솔로 가수의 선택 활동을 아이돌처럼 — 자작곡 쓰기 · 가사 쓰기가 늘 보이고(못 하면 까닭과 함께 막힌 채로), 커버 영상 올리기를 더했다. 두 가지까지
const SOLO_WAYS = [
  { id: 'song', ic: '🎼', n: '자작곡 쓰기', f: 'subSong', show: (s, t) => t.st === 'signed' && has(me(s), 'compose'), no: (s, t) => t.st !== 'signed' ? '인디는 신곡 기획에서 내 곡을 바로 고른다' : '작곡 특기가 있어야 한다', h: s => has(me(s), 'compose') ? `다음 신곡 데모곡 모집에 내 곡을 낸다 · 남의 곡과 똑같이 A&R 심사를 받는다 · 작곡 ${lvi(me(s), 'compose')}레벨` : '다음 신곡 데모곡 모집에 내 곡을 낸다 · 남의 곡과 똑같이 A&R 심사를 받는다' },
  { id: 'lyr', ic: '✍️', n: '가사 쓰기', f: 'subLyr', show: (s, t) => t.st === 'signed' && has(me(s), 'lyric'), no: (s, t) => t.st !== 'signed' ? '인디는 신곡 기획에서 가사를 바로 맡는다' : '작사 특기가 있어야 한다', h: s => has(me(s), 'lyric') ? `실릴 곡의 가사를 써 보겠다고 한다 · 맡을 작사가보다 잘 쓰면 타이틀곡 · 작사 ${lvi(me(s), 'lyric')}레벨` : '실릴 곡의 가사를 써 보겠다고 한다 · 맡을 작사가보다 잘 쓰면 타이틀곡' },
  { id: 'cover', ic: '🎧', n: '커버 영상 올리기', show: () => true, h: () => '노래(랩) 조금 ↑ · 내 팬 조금 ↑ · 가끔 영상이 퍼진다 · 스트레스 조금 ↑' },
  { id: 'act', ic: '🎭', n: '연기 연습', sk: 'acting', show: () => true, h: () => '연기 ↑ · 스트레스 조금 ↑' },
  { id: 'fan', ic: '💬', n: '팬 소통', show: () => true, h: () => '라이브 방송 · 메시지 · 내 팬 ↑ · 스트레스 조금 ↑' },
  { id: 'var', ic: '😆', n: '예능 감 익히기', sk: 'variety', show: () => true, h: () => '예능 ↑ · 스트레스 조금 ↑' },
];
function soloPicks(s, t) {
  if (s.army || (t.st !== 'indie' && t.st !== 'signed') || t.withGroup) return [];
  if (t.st !== 'signed') t.subSong = t.subLyr = false; // v245: 예전 세이브 — 회사를 나왔는데 켜진 채 남은 것
  const n = SOLO_WAYS.filter(w => idolWayOn(t, w)).length;
  return SOLO_WAYS.map((w, i) => {
    const can = w.show(s, t), on = idolWayOn(t, w), room = !w.sk || has(me(s), w.sk) || skRoom(s, w.sk);
    return { sw: true, on, sec: i === 0 ? `매달 꾸준히 한다 · ${IDOL_WAY_MAX}가지까지 (지금 ${n}가지)` : '', t: `${w.ic} ${w.n}`, tag: on ? (can ? '켜 둠' : `켜 둠 · 쉬는 중 (${w.no(s, t)})`) : '', h: w.h(s, t), btn: on ? '끄기' : '켜기', ok: on || (can && n < IDOL_WAY_MAX && room), why: !can ? w.no(s, t) : !room ? `특기가 ${SKILL_CAP}개라 ${SKILLS[w.sk].n} 특기를 새로 배울 수 없다` : `${IDOL_WAY_MAX}가지까지만 켜 둘 수 있다 · 하나를 먼저 끈다`, run: s => idolWaySet(s, t, w, !on) };
  });
}
CAREERS.solo.picks = (s, t) => soloPicks(s, t);
function soloWaysMonth(s, t) {
  if ((t.st !== 'indie' && t.st !== 'signed') || t.withGroup) return;
  if (!jobN(s, 'solo')) return; // 일정에 가수 일이 없는 달(자숙 · 임신 등)은 쉰다
  const p = me(s);
  if (idolWayHas(t, 'act') && has(p, 'acting')) { practice(s, p, 'acting', 0.7); addStress(s, 0.8); }
  if (idolWayHas(t, 'var') && has(p, 'variety')) { practice(s, p, 'variety', 0.7); addStress(s, 0.8); }
  if (idolWayHas(t, 'fan')) { s.fans.kr += Math.round((20 + Math.sqrt(totalFans(s)) * 0.6) * U.fl(0.6, 1.4) * popSpeed(s) * myRoom(s, 'kr')); addStress(s, 1); }
  // 커버 영상: 노래(랩)가 조금 늘고 팬이 조금 는다. 가끔(한 해에 한 번쯤) 영상이 퍼진다
  if (idolWayHas(t, 'cover')) {
    const k = soloVoice(t, p), base = (10 + Math.sqrt(totalFans(s)) * 0.35) * U.fl(0.6, 1.4) * popSpeed(s) * myRoom(s, 'kr');
    practice(s, p, k, 0.4); addStress(s, 0.8);
    if (U.chance(0.02 + lv(p, k) / 2500)) { const g = Math.round(base * U.fl(8, 20)); s.fans.kr += g; addLog(s, `올린 커버 영상이 크게 퍼졌다. ${U.pick(['"원곡보다 좋다"는 댓글이 달렸다.', '"이 목소리 누구냐"는 댓글이 줄줄이 달렸다.', '원곡을 부른 가수의 팬들까지 찾아와 칭찬을 남겼다.', '추천 영상에 올라 조회수가 하루 만에 몇 배로 뛰었다.', '짧게 잘라 낸 영상이 여기저기로 퍼져 나갔다.'])} (한국 팬 +${fmtFans(g)})`, 'good'); }
    else s.fans.kr += Math.round(base);
  }
}

// ───── v245: 밴드 멤버 — 자동 활동(시기에 따라 저절로 바뀐다) + 켜 두는 일 (아이돌 · 솔로 가수와 같은 틀) ─────
// 멤버 모으는 중(form) → 결성한 뒤에는 세 시기: 활동(새 곡을 낸 뒤 두 달) → 합주 · 클럽 공연(다음 곡을 기다리는 평소) → 새 곡 작업(기획 · 선정 · 편곡 · 녹음 석 달)
const BAND_ACT = CAREERS.band.act; // 밴드를 하지 않을 때의 기본 이름 (music.js)
const BAND_PH = {
  form: { n: '멤버 모으며 연습', ic: '🎸', g: '직업 활동', h: '내 파트 ↑ · 모인 멤버 ↑', eff: [['내 파트', '↑', 1], ['모인 멤버', '↑', 1]] },
  jam: { n: '합주 · 클럽 공연', ic: '🎸', g: '직업 활동', h: '내 파트 ↑↑ · 밴드 팬 ↑ · 스트레스 조금 ↑', eff: [['내 파트', '↑↑', 1], ['밴드 팬', '↑', 1], ['스트레스', '조금 ↑', 0]] },
  prep: { n: '새 곡 작업 (편곡 · 녹음)', ic: '🎚️', g: '직업 활동', h: '내 파트 ↑ · 팀워크 ↑ · 스트레스 ↑', eff: [['내 파트', '↑', 1], ['팀워크', '↑', 1], ['스트레스', '↑', 0]] },
  promo: { n: '활동 (공연 · 방송)', ic: '🎤', g: '직업 활동', h: '밴드 팬 ↑↑ · 내 파트 ↑ · 스트레스 ↑↑', eff: [['밴드 팬', '↑↑', 1], ['내 파트', '↑', 1], ['스트레스', '↑↑', 0]] },
};
// 시기마다 달라지는 숫자 (music.js CAREERS.band.monthly가 쓴다): pr 내 파트 연습 · fan 클럽 공연으로 느는 팬의 배율 · st 스트레스 · tw 팀워크
//   한 주기 = 활동 2달 → 합주 (N-2)달 → 새 곡 작업 3달. N은 곡을 낸 뒤 다음 기획까지의 3~6달(고르게 뽑아 평균 4.5달)이라 한 주기는 6~9달(평균 7.5달): 활동 2 · 합주 2.5 · 새 곡 작업 3
//   연습     (2 × 1.0  + 2.5 × 1.6 + 3 × 1.25) / 7.5 = 1.3 (예전 1.3)
//   팬       (2 × 1.45 + 2.5 × 1.0 + 3 × 0.7 ) / 7.5 = 1.0 (예전 1)
//   스트레스 (2 × 3.0  + 2.5 × 1.2 + 3 × 2.0 ) / 7.5 = 2.0 (예전 2)
//   팀워크는 새 곡 작업 석 달 동안 0.6씩 더 오른다 (한 주기에 +1.8 — 예전에 없던 몫)
const BAND_PH_M = { jam: { pr: 1.6, fan: 1, st: 1.2, tw: 0 }, prep: { pr: 1.25, fan: 0.7, st: 2, tw: 0.6 }, promo: { pr: 1, fan: 1.45, st: 3, tw: 0 } };
// now: 어느 달을 기준으로 볼지. 화면은 이번 달(s.t), 매달 계산은 지난달(s.t - 1 — 지난달 화면에 보이던 시기가 이번 달에 한 일이다)
function bandPhase(s, t, now) {
  if (!t || t.st === 'forming') return 'form';
  if (t.lastRelT != null && (now == null ? s.t : now) - t.lastRelT < 2) return 'promo';
  return t.alb || musRelQ(s, 'band') ? 'prep' : 'jam';
}
function bandPhM(s, t, now) { return BAND_PH_M[bandPhase(s, t, now)] || BAND_PH_M.jam; }
// 일정 칸 이름도 시기를 따른다 (일정 칸 id는 c_band 그대로. 밴드 연습생은 idol 트랙이라 BAND_TR_ACT 그대로)
Object.defineProperty(CAREERS.band, 'act', {
  configurable: true,
  get() { const s = typeof S !== 'undefined' ? S : null, t = s && s.tracks && s.tracks.band; return t && t.b && ['forming', 'indie', 'signed'].includes(t.st) ? BAND_PH[bandPhase(s, t)] : BAND_ACT; },
});
CAREERS.band.autoList = (s, t) => {
  if (t.st === 'forming') return [{ ic: BAND_PH.form.ic, n: BAND_PH.form.n, eff: BAND_PH.form.h, on: true }];
  const cur = bandPhase(s, t);
  return ['jam', 'prep', 'promo'].map(k => ({ ic: BAND_PH[k].ic, n: BAND_PH[k].n, eff: BAND_PH[k].h, on: k === cur }));
};
// 켜 두는 일 여섯 가지 (두 가지까지, 언제든 바꾼다). 예전에는 한 번 누르는 팀 활동(music.js teamPicks)이었다. 여섯 가지가 늘 보이고, 지금 못 하는 것은 막힌 채로 까닭(no)을 보여 준다
//   메인 화면 단추는 여섯 개를 넘으면 앞의 다섯만 보이니, 인디 · 결성 중에도 켤 수 있는 일을 앞에 둔다. 자작곡 · 가사 쓰기는 예전 '할 수 있는 일'(songSubActs)에서 옮겼다 (t.subSong · t.subLyr 그대로). 나머지는 t.ways에 적는다 (예전 세이브에는 없다 = 아무것도 안 켬)
const BAND_WAYS = [
  { id: 'jam', ic: '🎸', n: '추가 합주', show: (s, t) => bandMembers(s, t).length > 0, no: () => '같이 할 멤버가 없다', h: () => '팀워크 ↑↑ · 멤버 실력 ↑ · 스트레스 ↑' },
  { id: 'busk', ic: '🎤', n: '버스킹', show: (s, t) => t.st !== 'forming' && !bandMissing(t).length, no: () => '멤버가 다 모여야 한다', h: () => '밴드 팬 ↑ · 내 팬 조금 ↑ · 팀워크 조금 ↑ · 스트레스 ↑ · 가끔 영상이 퍼진다' },
  { id: 'coach', ic: '🧑‍🏫', n: '멤버 봐 주기', show: (s, t) => bandMembers(s, t).length > 0, no: () => '같이 할 멤버가 없다', h: s => `매달 실력이 가장 처지는 멤버를 봐 준다 · 그 멤버 실력 ↑ · 친밀도 ↑${has(me(s), 'edu') ? ' · 교육 ↑' : ''}` },
  { id: 'mate', ic: '🤝', n: '멤버 챙기기', show: (s, t) => bandMembers(s, t).length > 0, no: () => '같이 할 멤버가 없다', h: (s, t) => `💸 매달 밥값 ${fmtWon(5e4 * (bandMembers(s, t).length + 1))}이 나간다 (한 사람에 5만 원) · 멤버 사이 ↑ · 팀워크 ↑ · 스트레스 ↓` },
  { id: 'song', ic: '🎼', n: '자작곡 쓰기', f: 'subSong', show: (s, t) => t.st === 'signed' && has(me(s), 'compose'), no: (s, t) => t.st === 'forming' ? '멤버가 다 모여야 한다' : t.st !== 'signed' ? '인디는 새 곡 기획에서 내 곡을 바로 고른다' : '작곡 특기가 있어야 한다', h: s => has(me(s), 'compose') ? `다음 새 곡 데모곡 모집에 내 곡을 낸다 · 남의 곡과 똑같이 A&R 심사를 받는다 · 작곡 ${lvi(me(s), 'compose')}레벨` : '다음 새 곡 데모곡 모집에 내 곡을 낸다 · 남의 곡과 똑같이 A&R 심사를 받는다' },
  { id: 'lyr', ic: '✍️', n: '가사 쓰기', f: 'subLyr', show: (s, t) => t.st === 'signed' && has(me(s), 'lyric'), no: (s, t) => t.st === 'forming' ? '멤버가 다 모여야 한다' : t.st !== 'signed' ? '인디는 새 곡 기획에서 가사를 바로 맡는다' : '작사 특기가 있어야 한다', h: s => has(me(s), 'lyric') ? `실릴 곡의 가사를 써 보겠다고 한다 · 맡을 작사가보다 잘 쓰면 타이틀곡 · 작사 ${lvi(me(s), 'lyric')}레벨` : '실릴 곡의 가사를 써 보겠다고 한다 · 맡을 작사가보다 잘 쓰면 타이틀곡' },
];
function bandPicks(s, t) {
  if (s.army || !t.b || !['forming', 'indie', 'signed'].includes(t.st)) return [];
  if (t.st !== 'signed') t.subSong = t.subLyr = false; // 예전 세이브: 회사를 나왔는데 켜진 채 남은 것
  const n = BAND_WAYS.filter(w => idolWayOn(t, w)).length;
  return BAND_WAYS.map((w, i) => {
    const can = w.show(s, t), on = idolWayOn(t, w);
    return { sw: true, on, sec: i === 0 ? `매달 꾸준히 한다 · ${IDOL_WAY_MAX}가지까지 (지금 ${n}가지)` : '', t: `${w.ic} ${w.n}`, tag: on ? (can ? '켜 둠' : `켜 둠 · 쉬는 중 (${w.no(s, t)})`) : '', h: w.h(s, t), btn: on ? '끄기' : '켜기', ok: on || (can && n < IDOL_WAY_MAX), why: !can ? w.no(s, t) : `${IDOL_WAY_MAX}가지까지만 켜 둘 수 있다 · 하나를 먼저 끈다`, run: s => idolWaySet(s, t, w, !on) };
  });
}
// 팀 틀 (music.js myTeams와 같은 모양). 멤버를 모으는 동안에도 쓴다 (myTeams는 결성한 뒤의 밴드만 돌려준다)
function bandTm(s, t) { return { k: 'band', t, o: t.b, nm: `밴드 「${t.b.name}」`, mem: bandMembers(s, t), part: m => t.b.part[m.id], my: t.b.my }; }
// 멤버 봐 주기: 내가 가르치는 실력(교육 + 그 파트 — teachLv)이 높을수록 갈수록 가파르게 는다. 0이면 1배 · 20이면 1.7배 · 40이면 3배 · 60이면 4.7배 · 80이면 6.7배 · 100이면 9배
//   (예전 멤버 코칭은 일직선이었다: 1 + 레벨/20 → 20이면 2배 · 40이면 3배 · 60이면 4배 · 80이면 5배 · 100이면 6배)
function bandCoachM(tl) { return 1 + 8 * Math.pow(U.clamp(tl, 0, 100) / 100, 1.5); }
// 버스킹 영상이 크게 퍼질 가능성 (한 달): 밴드 실력이 좋을수록 갈수록 가파르게. 실력 30이면 4.7% · 50이면 6% · 70이면 7.9% · 90이면 10.5% (한 해에 0.6~1.3번)
function bandBuskBigP(pw) { return 0.04 + 0.08 * Math.pow(U.clamp(pw, 0, 100) / 100, 2); }
// 매달: 켜 둔 일 (music.js CAREERS.band.monthly에서 부른다). 그달 일정에 밴드 칸이 없으면 쉰다
function bandWaysMonth(s, t) {
  if (!t.b || !['forming', 'indie', 'signed'].includes(t.st) || !slotsOn(s, 'c_band')) return;
  const p = me(s), tm = bandTm(s, t), mem = tm.mem;
  // 추가 합주: 예전 한 번 누르기(두 달에 한 번: 멤버 연습 1.5 · 내 연습 0.8 · 팀워크 +4 · 스트레스 +6)를 한 달 몫으로. 레슨 몫은 평소 합주에서 이미 받았으니 다시 더하지 않는다
  if (idolWayHas(t, 'jam') && mem.length) { teamGrow(s, tm, 0.6, true); practice(s, p, t.b.my, 0.4); twAdd(t.b, 1.5); addStress(s, 2.5); }
  // 버스킹: 예전 한 번 누르기(석 달에 한 번)의 팬 공식을 한 달 몫으로 — 평소 달은 1/4, 영상이 크게 퍼진 달은 그 4~8배 (평균하면 1/3쯤). 내 팬은 그 35%
  if (idolWayHas(t, 'busk') && t.st !== 'forming' && !bandMissing(t).length) {
    const pw = U.clamp(bandPower(s, t), 0, 100), big = U.chance(bandBuskBigP(pw));
    // 클럽 공연처럼 밴드 팬이 많을수록 덜 는다 (팬 상한 starCap)
    const g = Math.round(Math.max(5, Math.pow(10, pw / 20) * U.fl(0.6, 1.4) * access(s) * 0.25 * (big ? U.fl(4, 8) : 1)) * Math.max(0, 1 - t.b.f / starCap(55, 'kr')));
    t.b.f += g; s.fans.kr += Math.round(g * 0.35 * myRoom(s, 'kr')); twAdd(t.b, 0.7); addStress(s, 1.5);
    if (big && g >= 30) addLog(s, `버스킹을 찍은 영상이 크게 퍼졌다. ${U.pick(['지나가던 사람이 올린 영상이 하루 만에 여기저기로 퍼져 나갔다.', '"길에서 이런 연주를 듣다니"라는 댓글이 줄줄이 달렸다.', '"이 밴드 이름이 뭐냐"고 묻는 글이 잇따라 올라왔다.', '짧게 잘라 낸 영상이 추천 영상에 올라 조회수가 크게 뛰었다.', '영상을 보고 다음 버스킹 자리를 묻는 사람들이 생겼다.'])} (밴드 팬 +${fmtFans(g)})`, 'good');
  }
  // 멤버 봐 주기: 맡은 파트 실력이 가장 처지는 멤버 (같으면 덜 친한 쪽). 예전 멤버 코칭(두 달에 한 번)의 한 달 몫
  if (idolWayHas(t, 'coach') && mem.length) {
    const m = mem.slice().sort((a, b) => lvi(a, tm.part(a)) - lvi(b, tm.part(b)) || a.aff - b.aff)[0], k = tm.part(m);
    matePot(m, k); practice(s, m, k, bandCoachM(teachLv(p, k)) * mateMot(s, tm, m));
    bond(s, m, 2); twAdd(t.b, 0.5); teach(s, p, 0.3); addStress(s, 1);
  }
  // 멤버 챙기기: 아이돌의 멤버 챙기기와 같다 (밥값은 한 사람에 5만 원, 가진 돈만큼만)
  if (idolWayHas(t, 'mate') && mem.length) {
    bond(s, U.pick(mem), 2); for (const x of mem) bond(s, x, 0.4);
    twAdd(t.b, twOf(t.b) < 80 ? 1 : 0.2); addStress(s, -1.5);
    addMoney(s, -Math.min(Math.max(0, s.money), 5e4 * (mem.length + 1)), '멤버들과 식사');
  }
}

// ───── v246: 밴드 단독 공연 (솔로 가수의 단독 공연과 같은 흐름) ─────
// 발표곡 2곡 · 밴드 팬 1,500명부터, 한 해에 한 번 (거절하면 반년 뒤). 공연장을 정하고(band_concert) 다음 달에 무대에 선다(band_concertres). 공연장은 솔로와 같은 사다리(SOLO_VENUE)
//   올 만한 사람: 밴드 팬의 18%쯤(대중 호감도 50일 때. 호감도 0이면 0.6배 · 100이면 1.4배) — 300석 라이브 클럽은 팬 1,500명에 90%가 차고 1,700명쯤이면 매진, 4만 석 돔은 팬 22만 명쯤이어야 매진
//   표값은 공연장이 클수록 비싸다 (라이브 클럽 4.4만 원 → 돔 9.9만 원). 예매 수수료 10%를 뗀다
//   돈은 멤버끼리 나눈다. 회사 소속: 대관 · 무대 비용은 회사가 내고, 그 비용을 뺀 나머지를 정산한다 (music.js bandIncome — 회사 몫 → 멤버 수로 나눔 → 갚을 비용. 적자는 회사가 진다)
//                        인디: 비용을 멤버끼리 똑같이 나눠 먼저 내고(내 몫만 내 돈에서 나간다), 표값도 똑같이 나눈다 (music.js billPay). 취소되면 먼저 낸 내 몫을 돌려받는다
//   새로 적는 값: t.liveT(다음에 다시 이야기할 달) · t.liveN(단독 공연을 한 횟수). 예전 세이브에는 없다 (없으면 0). 소속 ↔ 인디가 바뀌어도 이어 간다
const BAND_TICKET = [44000, 55000, 66000, 77000, 88000, 99000]; // SOLO_VENUE 차례대로
const BAND_LIVE_GAP = 12, BAND_LIVE_REL = 2, BAND_LIVE_FANS = 1500, BAND_LIVE_RATE = 0.18;
function bandOn(s) { const t = s.tracks.band; return !!t && !!t.b && (t.st === 'indie' || t.st === 'signed'); }
function bandDemand(s, t) { return t.b.f * BAND_LIVE_RATE * (0.6 + jpop(s, 'band') / 100 * 0.8); }
// 무대에 설 수 없는 때: 밴드를 쉬거나 그만뒀다 · 군 복무 · 자숙 · 아픔 · 임신 · 꼭 있어야 하는 파트가 비었다
function bandLiveNo(s, t) { return !bandOn(s) || !!s.army || !!s.hiatus || !!s.ill || pregMe(s) || bandMissing(t).length > 0; }
// 올 사람 수에 맞는 공연장 (자리가 올 사람의 1.15배를 넘지 않는 가장 큰 곳)
function bandVenue0(dm) { let v0 = 0; SOLO_VENUE.forEach((V, i) => { if (V.seat <= dm * 1.15) v0 = i; }); return v0; }
// 열기의 바탕: 밴드 실력이 좋을수록 갈수록 가파르게. 실력 30이면 43 · 50이면 54 · 70이면 67 · 90이면 82 · 100이면 90 (일직선이면 30 → 51 · 50 → 62 · 70 → 73 · 90 → 84)
function bandHeatBase(pw) { return 34 + 56 * Math.pow(U.clamp(pw, 0, 100) / 100, 1.5); }
// 먼저 낸 대관비 내 몫 돌려받기 (내 회사 소속이면 회사 돈으로)
function bandLiveBack(s, d) { if (!d.cost) return; const co = ownCo(s, 'band'); if (co) coIn(co, d.cost, '단독 공연 대관비 환불', ownCoF(s, 'band')); else addMoney(s, d.cost, '단독 공연 대관비 환불'); d.back = d.cost; d.cost = 0; }
// 매달 (music.js CAREERS.band.monthly에서 부른다): 단독 공연 이야기가 나온다
// v247: 이어지는 사건의 뒷일(bandArcMonth) · 단골 클럽 정기 공연(bandRegMonth) · 지방 투어 · 선배 밴드 공연의 오프닝 제의도 여기서 본다 (아래 'v247: 밴드 사건')
//   단독 공연 · 지방 투어 · 오프닝 무대는 같은 때에 겹치지 않게, 이야기가 오가는 것이 하나라도 있으면 다른 것은 꺼내지 않는다 (BAND_BIG_EVS)
function bandExtraMonth(s, t) {
  bandArcMonth(s, t);
  if (bandLiveNo(s, t) || !slotsOn(s, 'c_band')) return;
  bandRegMonth(s, t);
  if (BAND_BIG_EVS.some(id => hasQ(s, id))) return;
  if ((t.rel || 0) >= BAND_LIVE_REL && t.b.f >= BAND_LIVE_FANS && !((t.liveT || 0) > s.t) && U.chance(0.25)) { queueEv(s, 'band_concert', 0, {}); return; }
  // 지방 투어: 다음 달에 서기로 한 무대(페스티벌)가 있으면 꺼내지 않는다
  if ((t.rel || 0) >= BAND_TOUR_REL && t.b.f >= BAND_TOUR_FANS && !((t.tourT || 0) > s.t) && !bandStageAt(s, s.t + 1) && U.chance(BAND_TOUR_P)) { queueEv(s, 'band_tour', 0, {}); return; }
  // 선배 밴드: 만난 지 석 달이 지나고 사이가 가까우면(BAND_SEN_AFF) 그 밴드 공연의 오프닝 무대 제의가 온다
  const A = t.b.sen, x = A && A.st === 1 && s.t - A.t >= 3 ? bandPerson(s, A.id) : null;
  if (x && x.aff >= BAND_SEN_AFF && !bandStageAt(s, s.t + 1) && U.chance(0.2)) { A.st = 2; queueEv(s, 'band_senior_open', 0, {}); }
}
E({
  id: 'band_concert', cat: '단독 공연', title: '밴드 단독 공연을 열까?', tag: 'career',
  bg: s => s.tracks.band.st === 'signed' ? 'meeting' : 'jamroom',
  cond: s => bandOn(s),
  // d.cv: 회사가 잡을 공연장 (올 사람 수에 맞는 곳. 가끔 몸을 사려 한 단계 작은 곳, 자리가 1.7배 안쪽이면 가끔 욕심을 내 한 단계 큰 곳 — 솔로와 같다)
  init(s, d) { const t = s.tracks.band; d.dm = Math.round(bandDemand(s, t)); d.nth = (t.liveN || 0) + 1; d.v0 = bandVenue0(d.dm); const up = SOLO_VENUE[d.v0 + 1]; d.cv = U.clamp(d.v0 + (up && up.seat <= d.dm * 1.7 && U.chance(0.25) ? 1 : U.chance(0.15) ? -1 : 0), 0, SOLO_VENUE.length - 1); },
  text: (s, d) => {
    const t = s.tracks.band, n = bandMembers(s, t).length + 1, nth = d.nth === 1 ? '첫' : `${d.nth}번째`, co = ownCo(s, 'band');
    return t.st === 'signed' ? `${josa(t.agN, '이가')} 밴드 「${t.b.name}」의 ${nth} 단독 공연을 기획하려 한다. 발표곡 ${t.rel}곡, 밴드 팬 ${fmtFans(t.b.f)}.\n\n공연장과 규모는 회사가 정한다. 대관과 무대 비용을 뺀 수익을 회사와 나누고, 밴드 몫은 멤버 ${n}명이 똑같이 나눈다.${t.debt > 0 ? ' 내 몫은 갚을 비용부터 갚는다.' : ''}`
      : `밴드 「${t.b.name}」의 이름을 건 ${nth} 단독 공연을 열 때가 됐다. 발표곡 ${t.rel}곡, 밴드 팬 ${fmtFans(t.b.f)}.\n\n공연장이 클수록 많이 벌 수 있지만, 자리가 비면 분위기가 식는다. 대관과 무대 비용은 멤버 ${n}명이 똑같이 나눠 먼저 내고, 표값도 똑같이 나눈다.${co ? ` 내 몫은 내 회사 ${josa(`「${co.name}」`, '이가')} 낸다.` : ''}`;
  },
  ch(s, d) {
    const t = s.tracks.band, n = bandMembers(s, t).length + 1;
    const later = { h: '반년 뒤에 다시 이야기한다', f: s => { t.liveT = s.t + 6; return '밴드 단독 공연은 다음으로 미뤘다.'; } };
    // 회사 소속이면 공연장은 회사가 정하고, 나는 할지 말지만 답한다 (인디 · 내 회사 소속은 멤버들과 고른다)
    if (t.st === 'signed') { const vi = SOLO_VENUE[d.cv] ? d.cv : 0, V = SOLO_VENUE[vi]; return [
      { t: '하겠다고 한다', h: '공연장은 회사가 잡는다 · 다음 달에 무대에 선다', f: s => { t.liveT = s.t + BAND_LIVE_GAP; queueEv(s, 'band_concertres', 1, { v: vi, signed: true, cut: t.cut || 0, cost: 0 }, true); return `${josa(t.agN, '이가')} ${V.n}(${V.seat.toLocaleString()}석)을 잡았다. 다음 달에 밴드 단독 공연 무대에 선다.`; } },
      Object.assign({ t: '이번엔 하지 않겠다고 한다' }, later),
    ]; }
    const v0 = d.v0 != null ? d.v0 : bandVenue0(d.dm);
    const C = [v0 - 1, v0, v0 + 1].filter(i => i >= 0 && i < SOLO_VENUE.length).map(i => {
      const V = SOLO_VENUE[i], r = d.dm / V.seat, my = Math.round(V.cost / n);
      return { t: `${V.n} (${V.seat.toLocaleString()}석)`, h: `${r >= 1.15 ? '자리가 모자랄 듯하다' : r >= 0.9 ? '자리를 거의 채울 듯하다' : r >= 0.7 ? '자리가 조금 빌 듯하다' : r >= 0.5 ? '자리가 꽤 빌 듯하다' : '절반도 못 채울 듯하다'} · 비용 ${fmtWon(V.cost)} 가운데 내 몫 ${fmtWon(my)}`, ok: s => jobMoney(s, 'band') >= my,
        f: s => { jobPay(s, my, '단독 공연 대관 · 무대', 'band'); t.liveT = s.t + BAND_LIVE_GAP; queueEv(s, 'band_concertres', 1, { v: i, signed: false, cut: 0, cost: my }, true); return `${V.n}에서 밴드 단독 공연을 열기로 했다. 다음 달에 무대에 선다.`; } };
    });
    C.push(Object.assign({ t: '이번엔 열지 않는다' }, later));
    return C;
  },
});
E({
  id: 'band_concertres', cat: '단독 공연', title: '밴드 단독 공연', tag: 'career', keepPop: true,
  live: (s, d) => d.live,
  init(s, d) {
    const t = s.tracks.band;
    // 그사이 무대에 설 수 없게 됐으면(밴드를 그만둠 · 입대 · 자숙 · 병 · 임신 · 빈 파트) 공연은 취소된다. 먼저 낸 내 몫은 돌려받고, 반년 뒤에 다시 이야기한다
    if (!t || bandLiveNo(s, t)) { const miss = bandOn(s) && bandMissing(t).length > 0; d.skip = true; bandLiveBack(s, d); if (bandOn(s)) t.liveT = s.t + 6; addLog(s, `잡아 둔 밴드 단독 공연이 취소됐다.${miss ? ' 멤버 자리가 비어 무대에 설 수 없었다.' : ''}${d.back ? ' 먼저 낸 대관비는 돌려받았다.' : ''}`, 'career'); return; }
    const p = me(s), mem = bandMembers(s, t), n = mem.length + 1, vi = SOLO_VENUE[d.v] ? d.v : 0, V = SOLO_VENUE[vi], booked = !!d.signed, big = V.seat >= 5000;
    d.vn = V.n; d.seat = V.seat;
    d.sold = Math.max(1, Math.round(Math.min(V.seat, bandDemand(s, t) * U.fl(0.85, 1.15)))); d.fill = d.sold / V.seat;
    // 열기: 밴드 실력(곡선) · 합 · 대중 호감도 · 자리가 찬 만큼 · 내 스타성. 몹시 지쳐 있으면 깎인다
    d.heat = Math.round(U.clamp(bandHeatBase(bandPower(s, t)) + (twOf(t.b) - 50) * 0.08 + (jpop(s, 'band') - 50) * 0.15 + (d.fill - 0.75) * 24 + (p.tal.star - 50) * 0.06 - (s.stress >= 70 ? 5 : 0) + U.normal(0, 5), 5, 100));
    // 표값에서 예매 수수료 10%를 뗀다. 회사가 잡은 공연은 비용을 뺀 나머지를 정산하고(적자는 회사가 진다), 멤버끼리 잡은 공연은 비용을 먼저 냈으니 표값을 그대로 나눈다
    const tix = Math.round(d.sold * (BAND_TICKET[vi] || BAND_TICKET[0]) * 0.9);
    let bill = null;
    if (booked) {
      const rev = Math.max(0, tix - V.cost);
      d.lost = !(rev > 0);
      // 잡을 때는 소속이었는데 그사이 회사를 나왔으면, 잡아 준 회사가 그때 약속한 몫을 가져간다
      if (t.st === 'signed') { d.pay = bandIncome(s, t, rev, '단독 공연') || 0; bill = rev > 0 ? t.lastBill : null; }
      else { const r = rev > 0 ? billPay(s, { rev, cut: d.cut || 0, n, team: '밴드', what: '단독 공연', job: 'band' }) : null; d.pay = r ? r.share : 0; bill = r ? r.bill : null; }
      d.net = d.pay;
      if (bill) { bill.rows[0][0] = '공연 수익'; bill.rows.unshift(['티켓 판매', bill.rows[0][1] + V.cost], ['대관 · 무대 비용', -V.cost], '-'); }
    } else {
      const r = billPay(s, { rev: tix, n, team: '밴드', what: '단독 공연', job: 'band' });
      d.pay = r.share; bill = r.bill; d.net = Math.round(d.pay - (d.cost || 0));
      bill.rows[0][0] = '티켓 판매';
      if (d.cost > 0) bill.note = `먼저 낸 대관 · 무대 비용 내 몫 ${fmtBill(d.cost)}을 빼면 ${d.net >= 0 ? `${fmtBill(d.net)}이 남는다` : `${fmtBill(-d.net)} 적자다`}.`;
    }
    if (bill) { bill.t = `${V.n} 단독 공연 정산`; d.bill = bill; }
    // 팬: 밴드 팬이 늘고, 내 팬은 그 35% (다른 밴드 팬 증가와 같다). 팬 상한(starCap)에 가까울수록 덜 는다
    d.gain = Math.round(Math.max(0, d.sold * (d.heat - 50) / 40) * Math.max(0, 1 - t.b.f / starCap(60, 'kr'))); t.b.f += d.gain;
    d.my = Math.round(d.gain * 0.35 * myRoom(s, 'kr')); s.fans.kr += d.my;
    // 객석을 절반도 못 채우면 열기와 상관없이 대중 호감도가 크게 떨어지고, 스트레스가 크게 오른다 (솔로와 같다)
    d.empty = d.fill < 0.5;
    d.pop = jpopAdd(s, 'band', d.empty ? -U.fl(3, 5) : d.heat >= 82 ? U.fl(3, 5) : d.heat >= 67 ? U.fl(1.5, 3) : d.heat >= 52 ? 0.8 : -0.5);
    t.liveN = (t.liveN || 0) + 1; t.liveT = s.t + BAND_LIVE_GAP;
    practice(s, p, t.b.my, 2, 1); teamGrow(s, bandTm(s, t), 1, true); addStress(s, d.empty ? 22 : 8);
    // 큰 무대를 같이 치르면 멤버들과 가까워지고 손발이 맞는다 (객석이 텅 비면 가라앉는다)
    for (const m of mem) bond(s, m, d.empty ? 0 : d.heat >= 82 ? 5 : 3);
    twAdd(t.b, d.empty ? -2 : d.heat >= 67 ? 3 : 1);
    addWork(s, { type: '단독 공연', title: V.n, by: `「${t.b.name}」`, sc: d.heat, pay: d.pay || 0, note: `관객 ${d.sold.toLocaleString()}명 · ${soloHeatW(d.heat)}` });
    if (t.liveN === 1) milestone(s, `${age(s)}세에 밴드 「${t.b.name}」의 첫 단독 공연을 ${V.n}에서 열었다.`);
    // 무대 창: 라이브 클럽 · 소극장은 클럽 사진, 중극장 홀은 홀 사진, 5,000석부터는 콘서트 사진. 후렴 반응(q)은 공연 열기를, 객석(fans)은 자리가 찬 만큼을 따른다
    d.live = bandLive(s, t, { vn: V.seat < 2000 ? 'club' : '', ph: V.seat < 2000 ? 'soloclub' : big ? 'concert' : 'solohall', cos: t.st === 'signed' || big ? 'rock' : 'indie', place: V.n, t: '단독 공연', key: true, sc: d.heat, z: { q: (d.heat - 57) / 20, fans: d.fill * 2 - 1 } });
  },
  html: (s, d) => d.bill && typeof billBtnHTML === 'function' ? cardText(s, d) + billBtnHTML(d.bill) + (d.live && typeof liveBtnHTML === 'function' ? ' ' + liveBtnHTML(d.live) : '') : '',
  text: (s, d) => {
    const t = s.tracks.band, money = d.signed ? (d.pay > 0 ? `정산 +${fmtWon(d.pay)}` : d.lost ? '정산금 없음 (비용이 표값보다 컸다)' : '정산금 없음') : d.net > 0 ? `내 몫 공연 수익 +${fmtWon(d.net)}` : d.net < 0 ? `내 몫 공연 적자 ${fmtWon(-d.net)}` : '';
    const fl = [money, d.gain > 0 ? `밴드 팬 +${fmtFans(d.gain)}` : '', d.my > 0 ? `내 팬 +${fmtFans(d.my)}` : '', d.pop > 0.3 ? '대중 호감도 ↑' : d.pop < -0.3 ? '대중 호감도 ↓' : '', d.empty ? '스트레스 ↑↑' : ''].filter(Boolean).join(' · ');
    return `밴드 「${t.b.name}」의 ${d.vn} 단독 공연을 마쳤다. 관객 ${d.sold.toLocaleString()}명${d.fill >= 0.98 ? ' · 매진' : ` (${d.seat.toLocaleString()}석 가운데 ${Math.round(d.fill * 100)}%)`}. ${soloHeatW(d.heat)}.${d.empty ? '\n\n객석이 절반도 차지 않았다. 무대에서 내려온 멤버들도 말이 없다.' : ''}${fl ? `\n\n${fl}` : ''}${d.signed && d.bill && d.bill.note ? `\n\n${d.bill.note}` : ''}`;
  },
  ch: (s, d) => [{ t: '확인', f: () => `${d.vn}에서 밴드 단독 공연을 했다. 관객 ${d.sold.toLocaleString()}명, ${soloHeatW(d.heat)}.${d.empty ? ' 객석이 절반도 차지 않아 마음이 무겁다.' : ''}` }],
});

// ═════════ v247: 밴드 사건 ═════════
// 이어지는 줄기 넷: ㄱ 선배 밴드 (band_senior → band_senior_open → band_senior_openres) · ㄴ 멤버 갈등 (band_fight → band_fight_end)
//                  ㄷ 음악성 차이 (band_dir → band_dir_res 또는 band_dir_leave) · ㄹ 지방 투어 (band_tour → band_tour_res)
// 하나짜리: 후배 밴드 (band_junior) · 솔로 제의 (band_solo) · 단골 클럽 정기 공연 (band_club_reg) · 생계 고민 (band_job). 페스티벌 메인 무대(t.festUp)는 music.js에 있다
// 줄기의 상태는 밴드(t.b) 아래에 둔다 — 밴드를 새로 만들면 처음부터다. 예전 세이브에는 없다 (없으면 아무 일도 없다)
//   t.b.sen   { id 선배, nid 업계 밴드, bn 밴드 이름, st 1 알게 됨 · 2 오프닝 제의가 옴 · 3 무대를 잡음, t 달 } · t.b.senLast 지난번에 만난 업계 밴드 (바로 또 만나지 않게)
//   t.b.fight { a, b, t } 다툰 두 사람 (나와 다퉜으면 b 없음). 뒷일(band_fight_end)이 뜨면 지운다
//   t.b.dir   { m 멤버, k 방향, st 1 다음 곡을 그 방향으로 · 2 지금 색을 지킴 · 3 · 4 뒷일 창을 기다림, t 달, rel 그때 발표곡 수 }
//   t.b.reg   { left 남은 달, cn 클럽, x 사장, pay 한 번 출연료, g 그동안 는 팬, t 시작한 달 }
//   t.b.soloT 솔로 계약을 한 달 (그 뒤 1년 반은 다툼이 잦다) · t.soloAsk 솔로 제의를 다시 할 달 · t.tourT 투어 이야기를 다시 할 달 · t.tourN 투어를 돈 횟수
// 얼마나 자주 (조건이 맞는 달마다): 선배 5% · 다툼 4.5~12% · 음악성 5% · 후배 2% · 솔로 제의 1.2~4.2% · 정기 공연 6% · 생계 3%. 투어는 한 해에 한 번 (이야기가 나올 수 있는 달마다 15%)
//   아이돌 사건과 비슷한 크기다. 줄 선 창(새 곡 기획 · 선정 · 편곡 · 성적)이 있는 달에는 무작위 사건이 뜨지 않아서(game.js pickEvent), 뒷일 창 · 투어까지 쳐도 새 창은 여섯 달에 하나쯤이다 (간단히 흉내 낸 계산)
//   원래 있던 창(페스티벌 · 단독 공연 · 탈퇴 · 팀 사건)과 합치면 두 달 남짓에 하나. 더 자주 · 드물게는 각 사건의 p와 BAND_TOUR_P로 맞춘다
// 사건이 뜰 수 있는 때: 결성한 밴드 · 그달 일정에 밴드 활동이 있다 · 군 복무 · 자숙 · 아픔 · 임신 중이 아니다. 빈 파트는 사건마다 따로 본다 (무대에 서는 일은 bandLiveNo)
function bandEvOn(s) { return bandOn(s) && !s.army && !s.hiatus && !s.ill && !pregMe(s) && slotsOn(s, 'c_band') > 0; }
function bandEvFull(s) { return bandEvOn(s) && !bandMissing(s.tracks.band).length; }
// 아직 같이 하는 멤버인가 (나갔거나 세상을 떠났으면 null) · 아직 연락이 닿는 사람인가
function bandMemOf(s, t, id) { const m = id ? s.people[id] : null; return m && m.alive && t.b.members.includes(id) ? m : null; }
function bandPerson(s, id) { const x = id ? s.people[id] : null; return x && x.alive ? x : null; }
function bandMatesAll(s, t, dAff, dTw) { for (const m of bandMembers(s, t)) bond(s, m, dAff); if (dTw) twAdd(t.b, dTw); }
// 한 달 클럽 공연으로 느는 팬(music.js CAREERS.band.monthly의 가운데 값)을 잣대로 쓴다: 투어 · 합동 공연 · 정기 공연으로 느는 팬은 이 값의 몇 배로 정한다 (지방을 도는 일이라 사는 곳은 보지 않는다)
function bandFanM(s, t) { return Math.max(0, (bandPower(s, t) - 6) * 2.1 * (1 + Math.log10(1 + t.b.f) / 3) * (t.st === 'signed' ? 1.8 : 1) * Math.max(0, 1 - t.b.f / starCap(55, 'kr'))); }
function bandFansAdd(s, t, g) { g = Math.max(0, Math.round(g)); t.b.f += g; const my = Math.round(g * 0.35 * popSpeed(s) * myRoom(s, 'kr')); s.fans.kr += my; return my; }
// 같은 달에 무대가 둘 겹치지 않게: 그달에 서기로 한 무대가 있는가 · 단독 공연 · 지방 투어 · 선배 공연 오프닝 이야기가 오가는 중인가
const BAND_BIG_EVS = ['band_concert', 'band_concertres', 'band_tour', 'band_tour_res', 'band_senior_open', 'band_senior_openres'];
function bandStageAt(s, at) { return s.queue.some(q => q.at === at && (BAND_BIG_EVS.includes(q.id) || q.id === 'band_fest_play')); }

// ───── ㄱ 선배 밴드 ─────
// 업계 밴드(npc.js) 가운데 나보다 이름이 알려지고 먼저 결성한 팀의 멤버 한 명을 알게 된다. 석 달 뒤부터, 사이가 가까우면(40부터) 그 밴드 공연의 오프닝 무대 제의가 온다
//   먼저 다가가 이야기가 잘 풀리면 +14(처음 30 → 44), 공연 영상을 보여 주면 밴드 실력만큼 +7~16(실력 60부터 40을 넘는다), 인사만 하면 +1. 그 뒤 연락하며 가까워져도 된다. 2년이 지나도록 소식이 없으면 인연은 거기까지
const BAND_SEN_AFF = 40;
function bandSenPool(s, t) {
  const f = s.fame || 0, y0 = calY(s) - Math.floor((t.months || 0) / 12), last = (t.b.sen || {}).nid;
  return npcList(s, 'band').filter(n => n.ph !== 'rest' && n.ph !== 'rookie' && n.pop >= f + 8 && n.by <= y0 && n.n !== t.b.name && n.id !== last && n.id !== t.b.senLast);
}
// 먼저 다가갔을 때 이야기가 잘 풀릴 가능성: 전달력 · 유머 감각이 좋을수록 갈수록 가파르게 (둘의 평균 30이면 49% · 50이면 55% · 70이면 65% · 90이면 77%. 외향적이면 8%p 더, 내향적이면 5%p 덜)
function bandSenTalkP(s) { const p = me(s), q = U.clamp((p.tal.verbal + p.tal.humor) / 200, 0, 1); return U.clamp(0.45 + 0.4 * q * q + (s.persona === 'outgoing' ? 0.08 : s.persona === 'introvert' ? -0.05 : 0), 0.3, 0.9); }
// 오프닝 무대의 열기: 단독 공연과 같은 바탕(bandHeatBase)에서, 객석이 우리를 처음 보는 만큼 조금 낮게 시작한다
// 그 객석에서 우리 팬이 되는 비율: 열기가 높을수록 갈수록 가파르게 (열기 50이면 8% · 65면 16% · 80이면 29% · 95면 48%) — 2,000석이면 140명 · 280명 · 520명 · 860명쯤
function bandOpenConv(h) { return 0.05 + 0.5 * Math.pow(U.clamp((h - 35) / 65, 0, 1), 2); }
E({
  id: 'band_senior', cat: '밴드', title: '선배 밴드', tag: 'career', bg: 'waiting', p: 0.05, cd: 18,
  cond: s => { const t = s.tracks.band; return bandEvFull(s) && (t.rel || 0) >= 1 && !(t.b.sen && t.b.sen.st >= 1 && t.b.sen.st <= 3) && bandSenPool(s, t).length > 0; },
  init(s, d) {
    const t = s.tracks.band, n = U.pick(bandSenPool(s, t));
    if (!n) { d.skip = true; return; }
    const k = U.chance(0.5) ? t.b.my : U.pick(BAND_NEED);
    d.fest = calM(s) >= 5 && calM(s) <= 8;
    const x = makeMusicMate(s, { age: Math.max(22, age(s) + U.int(2, 9)), rel: '선배', job: `밴드 「${n.n}」`, met: d.fest ? '페스티벌 대기실' : '공연장 대기실', aff: 30, tal: k === 'vocal' ? ['music', 'star'] : ['music', 'rhythm'], sk: { [k]: 50 + n.sk * 0.4 } });
    npcKnow(n);
    d.x = x.id; d.nid = n.id; d.bn = n.n; d.k = k; d.yr = Math.max(2, calY(s) - n.by + 1); d.big = n.pop >= 70 ? 2 : n.pop >= 45 ? 1 : 0;
  },
  text: (s, d) => { const x = s.people[d.x]; return `${d.fest ? '페스티벌 무대 뒤 대기 천막에서' : '합동 공연이 잡힌 공연장 대기실에서'} 선배 밴드 「${d.bn}」의 ${partN(d.k)} ${josa(x.name, '과와')} 마주쳤다. 결성 ${d.yr}년 차, ${['이 바닥에서 오래 버텨 온 밴드다', '단독 공연을 열면 표가 금방 동나는 밴드다', '페스티벌 포스터 맨 윗줄에 이름이 오르는 밴드다'][d.big]}.\n\n${josa(x.name, '은는')} 멤버들과 이야기하다 말고 이쪽을 한번 쳐다봤다.`; },
  ch: (s, d) => {
    const t = s.tracks.band, x = s.people[d.x], n = npcBy(s, d.nid);
    const met = s => { meetAt(s, x, d.fest ? '페스티벌 대기실' : '공연장 대기실', 'band'); t.b.sen = { id: x.id, nid: d.nid, bn: d.bn, st: 1, t: s.t }; t.b.senLast = d.nid; };
    return [
      { t: '먼저 다가가 이야기를 나눈다', h: '선배와 가까워질 수 있다', f: s => {
        met(s);
        if (U.chance(bandSenTalkP(s))) { bond(s, x, 14); if (n) npcRel(s, n, 6); return `${josa(x.name, '은는')} 한참 이야기를 들어 주더니 번호를 알려 줬다. "공연 잡히면 불러. 보러 갈게."` + fx(s, { stress: -3 }); }
        bond(s, x, 4); if (n) npcRel(s, n, 2); return `${josa(x.name, '은는')} 짧게 대답하고는 무대 준비를 하러 갔다. 그래도 밴드 이름은 기억해 준 것 같다.`;
      } },
      { t: '우리 공연 영상을 보여 주며 조언을 구한다', h: '내 파트 ↑ · 멤버 실력 ↑ · 연주가 좋을수록 눈여겨본다', f: s => {
        met(s);
        const pw = U.clamp(bandPower(s, t), 0, 100);
        practice(s, me(s), t.b.my, 2); teamGrow(s, bandTm(s, t), 0.8, true); twAdd(t.b, 1);
        bond(s, x, 7 + 9 * Math.pow(pw / 100, 2)); if (n) npcRel(s, n, 4);
        return `휴대폰으로 우리 공연 영상을 보여 줬다. ${josa(x.name, '은는')} 끝까지 보더니 ${pw >= 60 ? '"합이 좋네. 후렴 들어갈 때 드럼만 조금 더 눌러 봐."' : '"악기끼리 서로를 안 듣고 있어. 합주를 녹음해서 다 같이 들어 봐."'}`;
      } },
      { t: '가볍게 인사만 한다', f: s => { met(s); bond(s, x, 1); return `「${d.bn}」 멤버들에게 고개 숙여 인사하고 우리 자리로 돌아왔다.`; } },
    ];
  },
});
E({
  id: 'band_senior_open', cat: '밴드', title: '오프닝 무대 제의', tag: 'career', bg: 'waiting',
  cond: s => bandOn(s),
  init(s, d) {
    const t = s.tracks.band, A = t.b.sen, x = A && A.st === 2 ? bandPerson(s, A.id) : null, n = A ? npcBy(s, A.nid) : null;
    // 선배와 연락이 끊겼거나 그 밴드가 해체했으면 없던 일이 된다. 지금 무대에 설 수 없으면(빈 파트 · 아픔 등) 이야기는 다음으로 미뤄진다
    if (!x || !n) { d.skip = true; t.b.sen = null; return; }
    if (bandLiveNo(s, t) || n.ph === 'rest' || bandStageAt(s, s.t + 1)) { d.skip = true; A.st = 1; A.t = s.t; return; }
    d.x = x.id; d.bn = A.bn; d.v = n.pop >= 80 ? 4 : n.pop >= 60 ? 3 : 2; // 선배 밴드가 클수록 큰 공연장 (중극장 홀 · 대형 공연장 · 체육관)
    d.fee = Math.round(SOLO_VENUE[d.v].seat * 600 / 1e5) * 1e5;
  },
  text: (s, d) => {
    const t = s.tracks.band, x = s.people[d.x], V = SOLO_VENUE[d.v], n = bandMembers(s, t).length + 1;
    return `${x.name} 선배에게서 연락이 왔다. 다음 달 「${d.bn}」의 ${V.n} 공연(${V.seat.toLocaleString()}석)에서 오프닝 무대를 맡아 달라고 한다. "너희 무대, 우리 관객한테도 보여 주고 싶어."\n\n객석 대부분은 밴드 ${josa(`「${t.b.name}」`, '을를')} 처음 보는 사람들이다. 세 곡을 연주한다. 출연료는 ${fmtWon(d.fee)}, ${t.st === 'signed' ? `${josa(t.agN, '과와')} 나눈 뒤 밴드 몫을 멤버 ${n}명이 똑같이 나눈다` : `멤버 ${n}명이 똑같이 나눈다`}.`;
  },
  ch: (s, d) => {
    const t = s.tracks.band, x = s.people[d.x], A = t.b.sen || {};
    return [
      { t: '오프닝 무대에 선다', h: '다음 달에 무대에 선다 · 처음 보는 관객을 팬으로 만들 기회다', ok: s => !bandLiveNo(s, t), f: s => { A.st = 3; bond(s, x, 3); queueEv(s, 'band_senior_openres', 1, { x: d.x, bn: d.bn, v: d.v, fee: d.fee }, true); return `「${d.bn}」 공연의 오프닝 무대를 맡기로 했다. 다음 달에 무대에 선다.`; } },
      { t: '일정이 안 맞는다고 한다', f: s => { t.b.sen = null; bond(s, x, -3); return `${x.name} 선배에게 이번에는 일정이 안 맞는다고 했다. 선배는 아쉬워했다.`; } },
    ];
  },
});
E({
  id: 'band_senior_openres', cat: '밴드', title: (s, d) => `「${d.bn}」 공연 오프닝`, tag: 'career', keepPop: true,
  cond: s => trackOn(s, 'band'),
  live: (s, d) => d.live,
  init(s, d) {
    const t = s.tracks.band;
    if (bandOn(s)) t.b.sen = null; // 줄기는 여기서 끝난다 (다음에는 다른 선배 밴드를 만난다)
    if (!t || bandLiveNo(s, t)) { d.skip = true; addLog(s, `「${d.bn}」 공연의 오프닝 무대에는 서지 못했다.${bandOn(s) && bandMissing(t).length ? ' 멤버 자리가 비어 무대에 설 수 없었다.' : ''}`, 'career'); return; }
    const p = me(s), mem = bandMembers(s, t), n = mem.length + 1, V = SOLO_VENUE[d.v] || SOLO_VENUE[2], x = bandPerson(s, d.x), big = V.seat >= 5000;
    d.vn = V.n; d.seat = V.seat;
    // 열기: 밴드 실력(곡선) · 합 · 내 스타성. 객석이 우리를 처음 보는 만큼 4 낮게 시작하고, 몹시 지쳐 있으면 더 깎인다
    d.heat = Math.round(U.clamp(bandHeatBase(bandPower(s, t)) - 4 + (twOf(t.b) - 50) * 0.08 + (p.tal.star - 50) * 0.06 - (s.stress >= 70 ? 5 : 0) + U.normal(0, 6), 5, 100));
    // 팬: 객석의 일부가 우리 팬이 된다 (bandOpenConv). 팬 상한(starCap)에 가까울수록 덜 는다
    d.gain = Math.round(V.seat * 0.9 * bandOpenConv(d.heat) * Math.max(0, 1 - t.b.f / starCap(60, 'kr'))); t.b.f += d.gain;
    d.my = Math.round(d.gain * 0.35 * myRoom(s, 'kr')); s.fans.kr += d.my;
    // 출연료: 소속은 회사 몫을 떼고(갚을 비용이 있으면 먼저 갚는다), 인디는 멤버끼리 똑같이 나눈다
    let bill = null;
    if (t.st === 'signed') { d.signed = true; d.pay = bandIncome(s, t, d.fee, '오프닝 출연료') || 0; bill = t.lastBill; }
    else { const r = billPay(s, { rev: d.fee, n, team: '밴드', what: '오프닝 출연료', job: 'band' }); d.pay = r.share; bill = r.bill; }
    if (bill) { bill.t = `「${d.bn}」 공연 오프닝 출연료`; d.bill = bill; }
    d.pop = jpopAdd(s, 'band', d.heat >= 82 ? U.fl(1.5, 3) : d.heat >= 67 ? 1 : d.heat >= 52 ? 0.3 : -0.5);
    practice(s, p, t.b.my, 1.5, 1); teamGrow(s, bandTm(s, t), 0.8, true); addStress(s, 6);
    for (const m of mem) bond(s, m, d.heat >= 67 ? 4 : 2);
    twAdd(t.b, d.heat >= 67 ? 3 : 1);
    if (x) bond(s, x, d.heat >= 67 ? 7 : 2);
    const nb = npcList(s, 'band').find(q => q.n === d.bn); if (nb) npcRel(s, nb, d.heat >= 67 ? 8 : 3);
    d.xn = x ? x.name : '';
    milestone(s, `${age(s)}세에 밴드 ${josa(`「${t.b.name}」`, '으로')} 「${d.bn}」 ${V.n} 공연의 오프닝 무대에 섰다.`);
    // 무대 창: 중요한 순간이라 연다. 객석은 우리를 처음 본다(nw). 중극장 홀은 홀 사진, 5,000석부터는 콘서트 사진
    d.live = bandLive(s, t, { vn: '', ph: big ? 'concert' : 'solohall', cos: t.st === 'signed' || big ? 'rock' : 'indie', place: `「${d.bn}」 공연 오프닝`, t: '', key: true, nw: true, sc: d.heat, z: { q: (d.heat - 57) / 20, fans: 0.5 } });
  },
  html: (s, d) => d.bill && typeof billBtnHTML === 'function' ? cardText(s, d) + billBtnHTML(d.bill) + (d.live && typeof liveBtnHTML === 'function' ? ' ' + liveBtnHTML(d.live) : '') : '',
  text: (s, d) => {
    const fl = [d.pay > 0 ? `${d.signed ? '정산' : '내 몫 출연료'} +${fmtWon(d.pay)}` : d.signed ? '정산금 없음' : '', d.gain > 0 ? `밴드 팬 +${fmtFans(d.gain)}` : '', d.my > 0 ? `내 팬 +${fmtFans(d.my)}` : '', d.pop > 0.3 ? '대중 호감도 ↑' : d.pop < -0.3 ? '대중 호감도 ↓' : ''].filter(Boolean).join(' · ');
    return `「${d.bn}」 ${d.vn} 공연의 오프닝 무대에 섰다. ${d.seat.toLocaleString()}석을 채운 관객 대부분이 우리를 처음 봤다. ${soloHeatW(d.heat)}.${d.xn ? `\n\n${d.heat >= 67 ? `무대에서 내려오자 ${d.xn} 선배가 어깨를 두드렸다. "잘하더라. 다음에 또 같이 하자."` : `무대에서 내려오자 ${d.xn} 선배가 물을 건넸다. "큰 무대는 원래 처음이 제일 어려워."`}` : ''}${fl ? `\n\n${fl}` : ''}${d.signed && d.bill && d.bill.note ? `\n\n${d.bill.note}` : ''}`;
  },
  ch: (s, d) => [{ t: '확인', f: () => `「${d.bn}」 ${d.vn} 공연의 오프닝 무대에 섰다. ${soloHeatW(d.heat)}.` }],
});

// ───── ㄴ 멤버 갈등 ─────
// 멤버 둘이(또는 한 멤버와 내가) 크게 다툰다. 어떻게 하느냐에 따라 두 달 뒤 화해 · 앙금 · 한 명이 나가겠다고 함으로 갈린다
// 다툼이 날 가능성 (한 달): 손발이 안 맞거나 사이가 틀어진 멤버가 있을수록 갈수록 가파르게. 솔로 계약을 한 지 1년 반 안이면 1.5배
//   팀워크 60부터 1배 · 45면 1.1배 · 30이면 1.5배 · 15면 2.1배 · 0이면 3배 / 가장 서먹한 멤버와의 사이 50부터 1배 · 35면 1.1배 · 20이면 1.5배 · 5면 2.2배 (바탕 4.5%, 12%까지)
function bandFightP(s, t) {
  const mem = bandMembers(s, t), low = mem.length ? Math.min(...mem.map(m => m.aff)) : 50;
  const twM = 1 + 2 * Math.pow(U.clamp((60 - twOf(t.b)) / 60, 0, 1), 2), affM = 1 + 1.5 * Math.pow(U.clamp((50 - low) / 50, 0, 1), 2);
  return Math.min(0.12, 0.045 * twM * affM * (t.b.soloT != null && s.t - t.b.soloT <= 18 ? 1.5 : 1));
}
// 이야기를 들어 줬을 때 잘 풀릴 가능성: 내가 그 멤버들과 가깝고 사람을 잘 읽을수록 갈수록 가파르게 (사이 · 통찰력을 6:4로 섞은 값이 30이면 39% · 50이면 46% · 70이면 57% · 90이면 71%. 외향적이면 5%p 더)
function bandTalkP(s, L) { const q = U.clamp((L.reduce((a, m) => a + m.aff, 0) / L.length * 0.6 + me(s).tal.insight * 0.4) / 100, 0, 1); return U.clamp(0.35 + 0.45 * q * q + (s.persona === 'outgoing' ? 0.05 : 0), 0.2, 0.85); }
// 다툰 뒤 나가겠다고 할 가능성: 나와의 사이가 50 아래로 틀어져 있을 때만, 나쁠수록 갈수록 가파르게 (사이 40이면 1% · 30이면 5% · 20이면 11% · 10이면 19% · 0이면 30%)
//   이야기를 들어 줬으면 절반, 내버려 뒀으면 1.3배, 편을 들었으면 반대쪽 멤버가 1.2배 (편을 들 때 그 멤버와의 사이가 이미 내려갔다). 사이가 괜찮은 멤버는 다퉜다고 나가지 않는다
function bandQuitP(m) { return 0.3 * Math.pow(U.clamp((50 - m.aff) / 50, 0, 1), 2); }
// 붙잡았을 때 남아 줄 가능성: 사이가 가까울수록 갈수록 가파르게 + 내 전달력 (사이 10이면 24% · 25면 30% · 40이면 41% · 55면 58%, 전달력 50일 때. 전달력 90이면 6%p 더)
function bandHoldP(s, m) { return U.clamp(0.2 + 0.75 * Math.pow(U.clamp(m.aff, 0, 100) / 80, 2) + 0.1 * Math.pow(me(s).tal.verbal / 100, 2), 0.1, 0.85); }
const BAND_FIGHT_WHY = {
  // [멤버 둘이 다퉜을 때 (a, b 이름), 한 멤버와 내가 다퉜을 때 (a 이름)]
  time: [(a, b) => `${josa(b, '이가')} 요즘 합주에 자꾸 빠지는 걸 두고 ${josa(a, '이가')} 참다못해 한마디 한 것이 시작이었다.`, a => `내가 합주 시간을 더 늘리자고 하자 ${josa(a, '이가')} "지금도 벅차다"며 맞받은 것이 시작이었다.`],
  money: [(a, b) => `지난 공연 수입을 어떻게 나눌지를 두고 ${josa(a, '과와')} ${b} 사이에 말이 오가다 목소리가 높아졌다.`, a => `공연 수입에서 연습실 비용을 먼저 떼자는 내 말에 ${josa(a, '이가')} 얼굴을 붉혔다.`],
  late: [(a, b) => `${josa(b, '이가')} 또 한 시간을 늦자 ${josa(a, '이가')} 악기를 내려놓고 쏘아붙였다.`, a => `${josa(a, '이가')} 또 한 시간을 늦은 걸 두고 내가 한마디 한 것이 시작이었다.`],
  miss: [(a, b) => `지난 공연에서 박자가 무너진 게 누구 탓이냐를 두고 ${josa(a, '과와')} ${b} 사이에 말이 오가다 목소리가 높아졌다.`, a => `지난 공연에서 내가 틀린 부분을 ${josa(a, '이가')} 멤버들 앞에서 하나하나 짚은 것이 시작이었다.`],
};
E({
  id: 'band_fight', cat: '밴드', title: '합주실의 큰 소리', tag: 'career', bg: 'jamroom', cd: 10,
  p: s => bandFightP(s, s.tracks.band),
  cond: s => { const t = s.tracks.band; return bandEvOn(s) && bandMembers(s, t).length > 0 && !t.b.fight && !hasQ(s, 'band_fight_end') && !hasQ(s, 'band_leave') && !((s.cd.idol_conflict || 0) > s.t + 4); },
  init(s, d) {
    const t = s.tracks.band, mem = bandMembers(s, t);
    // 사이가 서먹한 멤버일수록 다툼에 끼기 쉽다. 멤버가 둘 이상이면 열에 일곱은 멤버끼리, 나머지는 그 멤버와 내가 다툰다
    const a = U.wpick(mem, m => 20 + Math.max(0, 80 - m.aff)), rest = mem.filter(m => m !== a);
    d.a = a.id; d.b = rest.length && U.chance(0.7) ? U.pick(rest).id : null;
    d.why = U.pick(t.st === 'indie' ? ['time', 'money', 'late', 'miss'] : ['time', 'late', 'miss']);
    s.cd.idol_conflict = Math.max(s.cd.idol_conflict || 0, s.t + 8); // 비슷한 사건('멤버 사이의 냉기')이 바로 이어 뜨지 않게
  },
  text: (s, d) => {
    const t = s.tracks.band, a = s.people[d.a], b = d.b ? s.people[d.b] : null, W = BAND_FIGHT_WHY[d.why] || BAND_FIGHT_WHY.time;
    return b ? `합주가 끝나기도 전에 ${partN(t.b.part[a.id])} ${josa(a.name, '과와')} ${partN(t.b.part[b.id])} ${josa(b.name, '이가')} 크게 다퉜다. ${W[0](a.name, b.name)}\n\n${josa(a.name, '은는')} 악기를 챙겨 먼저 나가 버렸고, 합주실에는 무거운 공기만 남았다.`
      : `합주 중에 ${partN(t.b.part[a.id])} ${josa(a.name, '과와')} 크게 부딪쳤다. ${W[1](a.name)}\n\n다른 멤버들은 악기만 만지작거리고, ${josa(a.name, '은는')} 나와 눈을 마주치지 않는다.`;
  },
  ch: (s, d) => {
    const t = s.tracks.band, a = s.people[d.a], b = d.b ? s.people[d.b] : null;
    const go = (s, how, side, p) => { t.b.fight = { a: d.a, b: d.b, t: s.t }; queueEv(s, 'band_fight_end', 2, { a: d.a, b: d.b, how, side: side || '', p: p || 0 }, true); };
    if (b) return [
      { t: '둘을 불러 이야기를 듣는다', h: '둘과 가까울수록, 사람을 잘 읽을수록 잘 풀린다 · 스트레스 ↑', f: s => { go(s, 'talk', '', bandTalkP(s, [a, b])); return `${josa(a.name, '과와')} ${josa(b.name, '을를')} 따로 불러 늦게까지 이야기를 들었다.` + fx(s, { stress: 4 }); } },
      { t: `${a.name} 편을 든다`, h: `${josa(a.name, '과와')} 가까워진다 · ${josa(b.name, '과와')}는 멀어진다`, f: s => { bond(s, a, 8); bond(s, b, -12); twAdd(t.b, -3); go(s, 'side', 'a'); return `${a.name} 편을 들었다. ${josa(b.name, '은는')} 아무 말 없이 합주실을 나갔다.`; } },
      { t: `${b.name} 편을 든다`, h: `${josa(b.name, '과와')} 가까워진다 · ${josa(a.name, '과와')}는 멀어진다`, f: s => { bond(s, b, 8); bond(s, a, -12); twAdd(t.b, -3); go(s, 'side', 'b'); return `${b.name} 편을 들었다. ${josa(a.name, '은는')} 한참 말이 없었다.`; } },
      { t: '시간이 해결하게 둔다', f: s => { twAdd(t.b, -2); go(s, 'wait'); return '둘 사이의 일은 둘이 풀도록 두기로 했다.' + fx(s, { stress: 2 }); } },
    ];
    return [
      { t: '먼저 찾아가 이야기한다', h: '사이가 가까울수록, 사람을 잘 읽을수록 잘 풀린다 · 스트레스 ↑', f: s => { go(s, 'talk', '', bandTalkP(s, [a])); return `합주가 끝나고 ${a.name}에게 따로 이야기하자고 했다. 늦게까지 서로 할 말을 했다.` + fx(s, { stress: 4 }); } },
      { t: '내 생각을 굽히지 않는다', h: `${josa(a.name, '과와')} 멀어진다`, f: s => { bond(s, a, -10); twAdd(t.b, -3); go(s, 'side', 'me'); return `${a.name}에게 내 생각은 변함없다고 했다. 합주는 일찍 끝났다.` + fx(s, { stress: -2 }); } },
      { t: '시간이 해결하게 둔다', f: s => { twAdd(t.b, -2); go(s, 'wait'); return '당분간 그 이야기는 꺼내지 않기로 했다.' + fx(s, { stress: 2 }); } },
    ];
  },
});
E({
  id: 'band_fight_end', cat: '밴드', title: (s, d) => d.out === 'good' ? '다시 맞는 합' : d.out === 'leave' ? '멤버가 나가겠다고 한다' : '남은 앙금', tag: 'career', bg: 'jamroom', keepPop: true,
  cond: s => bandOn(s),
  init(s, d) {
    const t = s.tracks.band, a = bandMemOf(s, t, d.a), b = d.b ? bandMemOf(s, t, d.b) : null;
    t.b.fight = null;
    if (!a || (d.b && !b)) { d.skip = true; return; } // 그사이 한 사람이 밴드를 떠났다
    // 나가겠다고 할 수 있는 사람: 편을 들었으면 반대쪽 멤버, 아니면 나와 더 서먹한 쪽
    const risk = d.side === 'a' ? b : d.side === 'b' || !b ? a : a.aff <= b.aff ? a : b;
    const pq = bandQuitP(risk) * (d.how === 'talk' ? 0.5 : d.how === 'wait' ? 1.3 : 1.2);
    const pg = d.how === 'talk' ? d.p || 0.4 : d.how === 'side' ? 0.25 : 0.2 + 0.3 * Math.pow(twOf(t.b) / 100, 2);
    d.out = U.chance(pq) ? 'leave' : U.chance(pg) ? 'good' : 'grudge';
    d.lv = risk.id; d.k = t.b.part[risk.id];
  },
  text: (s, d) => {
    const a = s.people[d.a], b = d.b ? s.people[d.b] : null, m = s.people[d.lv];
    if (d.out === 'leave') return `합주가 끝나고 ${partN(d.k)} ${josa(m.name, '이가')} 잠깐 남아 달라고 했다. "그날 이후로 합주실에 오는 게 즐겁지가 않아. 나, 밴드를 나가려고 해."`;
    if (b) return d.out === 'good' ? (d.how === 'talk' ? `늦게까지 이야기를 들어 준 그날 뒤로 ${josa(a.name, '과와')} ${josa(b.name, '은는')} 조금씩 말을 섞기 시작했다. 오늘 합주에서는 둘이 먼저 농담을 주고받았다.` : `한동안 필요한 말만 하던 ${josa(a.name, '과와')} ${josa(b.name, '이가')} 오늘은 합주가 끝나고 둘이 밥을 먹으러 갔다. 돌아와서는 아무 일 없었다는 듯 다음 곡을 맞췄다.`)
      : `${josa(a.name, '과와')} ${josa(b.name, '은는')} 겉으로는 아무 일 없는 듯 합주를 한다. 하지만 서로 필요한 말만 하고, 곡이 끝나면 각자 휴대폰만 본다.`;
    return d.out === 'good' ? `${josa(a.name, '과와')} 다툰 뒤 한동안 서먹했지만, 오늘 합주가 끝나고 ${josa(a.name, '이가')} 먼저 말을 걸어 왔다. "그날은 나도 말이 심했어."`
      : `${josa(a.name, '과와')}는 그날 이후로 합주 때 필요한 말만 한다. 눈이 마주치면 서로 먼저 피한다.`;
  },
  ch: (s, d) => {
    const t = s.tracks.band, a = s.people[d.a], b = d.b ? s.people[d.b] : null, m = s.people[d.lv], L = b ? [a, b] : [a];
    if (d.out === 'good') return [{ t: '확인', f: s => { twAdd(t.b, d.how === 'talk' ? 8 : 6); for (const x of L) bond(s, x, b ? 5 : 8); return (b ? `${josa(a.name, '과와')} ${josa(b.name, '이가')} 화해했다.` : `${josa(a.name, '과와')} 화해했다.`) + ' 합주실 공기가 다시 풀렸다.' + fx(s, { stress: -3 }); } }];
    if (d.out === 'grudge') return [{ t: '확인', f: s => { twAdd(t.b, -3); for (const x of L) bond(s, x, -2); return (b ? `${josa(a.name, '과와')} ${b.name} 사이에는 앙금이 남았다.` : `${josa(a.name, '과와')}의 사이에는 앙금이 남았다.`) + fx(s, { stress: 2 }); } }];
    return [
      { t: '붙잡는다', h: '사이가 가까울수록 마음을 돌리기 쉽다', f: s => { if (bandMemOf(s, t, d.lv) && U.chance(bandHoldP(s, m))) { bond(s, m, 10); twAdd(t.b, -2); return `${josa(m.name, '이가')} 한참 말이 없다가, 조금 더 해 보겠다고 했다.`; } return '붙잡지 못했다. ' + bandMemOut(s, t, m); } },
      { t: '보내 준다', h: "직업 창 '그룹' 탭에서 새 멤버를 구해야 한다", f: s => bandMemOut(s, t, m) },
    ];
  },
});

// ───── ㄷ 음악성 차이 ─────
// 작곡을 하는 멤버(없으면 아무 멤버)가 밴드 색을 바꾸자고 한다. 새 곡 작업 중에는 뜨지 않는다 ('다음 곡'이 지금 만드는 곡과 헷갈리지 않게)
//   그 방향으로 → 다음 새 곡이 나온 다음 달에 반응이 갈린다 (band_dir_res: 그 곡 점수에 운을 얹어 새 팬이 늘거나 · 엇갈리거나 · 오래된 팬이 아쉬워한다)
//   지금 색을 지킨다 → 그 멤버와 멀어지고, 넉 달 뒤부터 사이가 35 아래면 자기 음악을 하러 나가겠다고 한다 (band_dir_leave). 1년이 지나면 서운함도 가라앉는다
//   따로 해 보라고 한다 → 그 멤버가 반년 동안 의욕을 낸다(music.js mateMot). 팀워크는 조금 내려간다
const BAND_DIR = {
  heavy: { n: '무겁고 거친 소리', q: '기타를 더 낮게 깔고, 지금보다 훨씬 무겁게.' },
  pop: { n: '따라 부르기 쉬운 소리', q: '후렴을 더 쉽게, 처음 듣는 사람도 따라 부를 수 있게.' },
  elec: { n: '전자음을 섞은 소리', q: '신시사이저랑 전자 드럼을 섞어서, 요즘 소리로.' },
  acou: { n: '힘을 뺀 어쿠스틱 소리', q: '힘을 빼고, 통기타랑 목소리가 들리게.' },
};
const BAND_DIR_AFF = 35;
E({
  id: 'band_dir', cat: '밴드', title: '밴드의 색', tag: 'career', bg: 'jamroom', p: 0.05, cd: 24,
  cond: s => { const t = s.tracks.band; return bandEvFull(s) && (t.rel || 0) >= 1 && !t.b.dir && bandPhase(s, t) !== 'prep' && !hasQ(s, 'band_leave'); },
  init(s, d) {
    const t = s.tracks.band, mem = bandMembers(s, t), w = mem.filter(m => has(m, 'compose')).sort((a, b) => lv(b, 'compose') - lv(a, 'compose'))[0] || U.pick(mem);
    if (!w) { d.skip = true; return; }
    d.m = w.id; d.k = U.pick(Object.keys(BAND_DIR));
  },
  text: (s, d) => { const t = s.tracks.band, w = s.people[d.m]; return `합주가 끝나고 ${partN(t.b.part[w.id])} ${josa(w.name, '이가')} 휴대폰으로 데모 하나를 들려줬다. "우리 다음 곡은 이런 쪽으로 가 보면 어때? ${BAND_DIR[d.k].q}"\n\n지금까지 해 온 밴드 「${t.b.name}」의 색과는 꽤 다르다. 다른 멤버들은 내 얼굴만 본다.`; },
  ch: (s, d) => {
    const t = s.tracks.band, w = s.people[d.m];
    return [
      { t: '다음 곡은 그 방향으로 해 본다', h: `${josa(w.name, '과와')} 가까워진다 · 새 곡 반응이 갈릴 수 있다`, f: s => { bond(s, w, 8); t.b.dir = { m: d.m, k: d.k, st: 1, t: s.t, rel: t.rel || 0 }; return `다음 곡은 ${w.name}의 말대로 ${josa(BAND_DIR[d.k].n, '으로')} 가 보기로 했다.`; } },
      { t: '지금 색을 지킨다', h: `${josa(w.name, '이가')} 서운해한다`, f: s => { bond(s, w, ['ambition', 'perfect', 'sensitive'].includes(w.trait) ? -12 : -8); t.b.dir = { m: d.m, k: d.k, st: 2, t: s.t, rel: t.rel || 0 }; return `우리 색을 지키자고 했다. ${josa(w.name, '은는')} 알겠다고 했지만 데모를 끄는 손이 느렸다.`; } },
      { t: '그 곡은 따로 해 보라고 한다', h: `${josa(w.name, '과와')} 가까워진다 · 팀워크 조금 ↓`, f: s => { bond(s, w, 6); twAdd(t.b, -3); w.motT = s.t + 6; if (has(w, 'compose')) practice(s, w, 'compose', 2); return `${w.name}에게 그 곡은 밴드 밖에서 따로 내 보라고 했다. ${josa(w.name, '은는')} 눈을 반짝였지만, 합주에 쓰는 시간은 조금 줄 것 같다.`; } },
    ];
  },
});
E({
  id: 'band_dir_res', cat: '밴드', title: '달라진 소리', tag: 'career', bg: 'jamroom', keepPop: true,
  cond: s => bandOn(s),
  init(s, d) {
    const t = s.tracks.band, D = t.b.dir, w = D ? bandMemOf(s, t, D.m) : null;
    t.b.dir = null;
    if (!D || !w) { d.skip = true; return; }
    const wk = s.works.slice().reverse().find(x => x.type === '밴드 싱글' && x.by === `「${t.b.name}」`);
    d.m = w.id; d.k = D.k; d.title = wk ? wk.title : ''; d.sc = wk ? wk.sc : 55;
    // 곡이 좋았으면 새 소리가 통하고, 아니면 오래된 팬이 아쉬워한다. 운이 조금 섞인다 (점수 ± 8)
    const r = d.sc + U.normal(0, 8), f0 = t.b.f;
    d.out = r >= 62 ? 'new' : r >= 48 ? 'mix' : 'old';
    if (d.out === 'old') { const lost = Math.round(t.b.f * U.fl(0.01, 0.03)); t.b.f -= lost; s.fans.kr = Math.max(0, s.fans.kr - Math.round(lost * 0.2)); d.gain = -lost; }
    else { const g = Math.round(bandFanM(s, t) * (d.out === 'new' ? U.fl(1.5, 2.5) : U.fl(0.3, 0.7))); d.my = bandFansAdd(s, t, g); d.gain = t.b.f - f0; }
    if (d.out === 'new') jpopAdd(s, 'band', 1);
  },
  text: (s, d) => {
    const w = s.people[d.m], ti = d.title ? `새 곡 「${d.title}」` : '새 곡', D = BAND_DIR[d.k] || BAND_DIR.pop;
    const body = d.out === 'new' ? `${ti}의 ${josa(D.n, '이가')} 통했다. 공연장에 처음 보는 얼굴이 눈에 띄게 늘었고, 새 곡 전주가 나오면 객석이 먼저 반응한다.`
      : d.out === 'mix' ? `${ti}의 ${D.n}에는 반응이 엇갈린다. 새 곡을 듣고 처음 온 관객이 있는가 하면, 공연이 끝나고 예전 곡을 더 해 달라는 오래된 팬도 있다.`
        : `${ti}의 ${josa(D.n, '은는')} 오래된 팬들에게 낯설었다. 공연이 끝나고 "예전 소리가 좋았는데"라는 말이 들렸고, 늘 맨 앞줄에 서던 얼굴 몇이 보이지 않는다.`;
    return `${body}\n\n${josa(w.name, '은는')} ${d.out === 'old' ? '말수가 줄었다. 그래도 자기 말을 들어 준 것만은 잊지 않겠다고 했다.' : '합주실에 가장 먼저 와서 다음 데모를 만지고 있다.'}\n\n밴드 팬 ${sgnFans(d.gain || 0)}${d.my > 0 ? ` · 내 팬 +${fmtFans(d.my)}` : ''}`;
  },
  ch: (s, d) => {
    const t = s.tracks.band, w = s.people[d.m];
    return [{ t: '확인', f: s => { bond(s, w, d.out === 'new' ? 6 : d.out === 'mix' ? 4 : 2); twAdd(t.b, d.out === 'new' ? 2 : d.out === 'old' ? -1 : 0); return d.out === 'new' ? `${w.name}의 말대로 바꾼 소리가 통했다. 새 팬이 늘었다.` : d.out === 'mix' ? '바꾼 소리에 반응이 엇갈렸다.' : '바꾼 소리를 오래된 팬들이 아쉬워했다.'; } }];
  },
});
E({
  id: 'band_dir_leave', cat: '밴드', title: '자기 음악을 하고 싶다고 한다', tag: 'career', bg: 'jamroom',
  cond: s => bandOn(s),
  init(s, d) { const t = s.tracks.band, D = t.b.dir, w = D ? bandMemOf(s, t, D.m) : null; t.b.dir = null; if (!D || !w) { d.skip = true; return; } d.m = w.id; d.k = D.k; d.pk = t.b.part[w.id]; },
  text: (s, d) => { const w = s.people[d.m]; return `합주가 끝나고 ${partN(d.pk)} ${josa(w.name, '이가')} 잠깐 남아 달라고 했다. "나, 내 음악을 해 보고 싶어. 여기서는 내가 하고 싶은 소리를 못 낼 것 같아."\n\n지난번 데모 이야기를 접은 뒤로 ${josa(w.name, '은는')} 줄곧 말이 없었다.`; },
  ch: (s, d) => {
    const t = s.tracks.band, w = s.people[d.m], D = BAND_DIR[d.k] || BAND_DIR.pop;
    return [
      { t: '다음 곡은 네 방향으로 해 보자고 붙잡는다', h: '사이가 가까울수록 마음을 돌리기 쉽다 · 남으면 다음 곡은 그 방향으로 간다', f: s => {
        if (bandMemOf(s, t, d.m) && U.chance(bandHoldP(s, w))) { bond(s, w, 12); t.b.dir = { m: d.m, k: d.k, st: 1, t: s.t, rel: t.rel || 0 }; return `${josa(w.name, '은는')} 한참 생각하더니 고개를 끄덕였다. 다음 곡은 ${josa(D.n, '으로')} 가 보기로 했다.`; }
        return '마음을 돌리지 못했다. ' + bandMemOut(s, t, w);
      } },
      { t: '보내 준다', h: "직업 창 '그룹' 탭에서 새 멤버를 구해야 한다", f: s => { bond(s, w, 5); return `${w.name}의 음악을 응원한다고 했다. ` + bandMemOut(s, t, w); } },
    ];
  },
});

// ───── ㄹ 지방 투어 ─────
// 발표곡 1곡 · 밴드 팬 500명부터 (단독 공연보다 조금 일찍), 한 해에 한 번 (거절하면 반년 뒤). 지방 서너 곳을 일주일 동안 돌고 다음 달에 결과가 나온다 (band_tour_res). 무대 창은 열지 않는다
//   공연장은 올 사람 수에 맞춘다 (bandTourV): 지방 클럽(120석)이 바탕이고, 자리가 65%는 찰 듯해야(BAND_TOUR_FILL — 우리 팬 + 단골 손님) 소극장(500석) · 공연장(1,500석)으로 올라간다
//     대중 호감도 50일 때 소극장은 밴드 팬 1만 6천 명쯤부터(2만 5천 명이면 거의 찬다), 공연장은 5만 3천 명쯤부터(8만 명이면 거의 찬다). 호감도가 낮으면 더 많아야 한다. 한 곳에 찾아오는 우리 팬은 밴드 팬의 1.8%쯤 (대중 호감도 50일 때 — 단독 공연의 열에 하나)이고, 여기에 그 공연장의 단골 손님이 조금 더 온다 (클럽은 자리의 10~30%)
//   인디: 승합차 · 기름 · 숙소 · 대관 비용을 멤버끼리 똑같이 나눠 먼저 내고(내 몫만 내 돈에서), 표값도 똑같이 나눈다. 팬이 적으면 표값이 비용을 겨우 메운다 (세 곳 180만 원을 넷이 나누면 내 몫 45만 원. 팬 500명이면 한 곳에 5만 원쯤 남거나 밑지고, 1,500명이면 40만 원쯤 · 4,000명이면 130만 원쯤 남는다)
//   회사 소속: 비용은 회사가 내고, 비용을 뺀 나머지를 정산한다 (적자는 회사가 진다). 단독 공연과 같은 틀
//   팬: 한 곳마다 한 달 클럽 공연으로 느는 팬(bandFanM)의 0.9배에 그날 열기를 곱한다 (열기 48이면 0.6배 · 60이면 1배 · 75면 1.5배 · 84부터 1.8배) — 네 곳을 무난히 돌면 넉 달 치쯤
const BAND_TOUR_CITY = ['부산', '대구', '광주', '대전'], BAND_TOUR_CITY2 = ['전주', '울산', '청주', '춘천', '창원'];
// seat 자리 · cost 한 곳에 드는 돈(차 · 기름 · 숙소 · 대관) · tk 표값 · wk 그 공연장 단골 손님 (자리에 대한 비율, 가장 적을 때 ~ 많을 때)
const BAND_TOUR_V = [{ n: '클럽', seat: 120, cost: 60e4, tk: 22000, wk: [0.1, 0.3] }, { n: '소극장', seat: 500, cost: 250e4, tk: 44000, wk: [0.03, 0.1] }, { n: '공연장', seat: 1500, cost: 2000e4, tk: 66000, wk: [0, 0.03] }];
const BAND_TOUR_GAP = 12, BAND_TOUR_REL = 1, BAND_TOUR_FANS = 500, BAND_TOUR_RATE = 0.018, BAND_TOUR_P = 0.15, BAND_TOUR_FANM = 0.9, BAND_TOUR_FILL = 0.65;
// 한 곳의 예상 채움 (올 만한 우리 팬 + 그 공연장 단골 손님의 가운데 값) · 그 채움이 BAND_TOUR_FILL을 넘는 가장 큰 공연장 (없으면 클럽)
function bandTourFill(s, t, V) { return bandTourDemand(s, t) / V.seat + (V.wk[0] + V.wk[1]) / 2; }
function bandTourV(s, t) { let vi = 0; BAND_TOUR_V.forEach((V, i) => { if (bandTourFill(s, t, V) >= BAND_TOUR_FILL) vi = i; }); return vi; }
function bandTourDemand(s, t) { return t.b.f * BAND_TOUR_RATE * (0.6 + jpop(s, 'band') / 100 * 0.8); }
function bandTourBack(s, d) { if (!d.cost) return; const co = ownCo(s, 'band'); if (co) coIn(co, d.cost, '지방 투어 비용 환불', ownCoF(s, 'band')); else addMoney(s, d.cost, '지방 투어 비용 환불'); d.back = d.cost; d.cost = 0; }
E({
  id: 'band_tour', cat: '투어', title: '지방 투어를 돌까?', tag: 'career', bg: 'van',
  cond: s => bandOn(s),
  init(s, d) {
    const t = s.tracks.band;
    if (bandLiveNo(s, t)) { d.skip = true; return; }
    d.vi = bandTourV(s, t);
    // 사는 곳은 뺀다. 클럽 투어는 세 곳, 그보다 크면 네 곳. 가끔 한 곳은 다른 도시로 바뀐다
    const home = c => (s.place || '').indexOf(c) === 0, n = d.vi === 0 ? 3 : 4;
    let C = U.shuffle(BAND_TOUR_CITY.filter(c => !home(c))).slice(0, n);
    const X = U.shuffle(BAND_TOUR_CITY2.filter(c => !home(c)));
    while (C.length < n && X.length) C.push(X.pop());
    if (X.length && U.chance(0.4)) C[C.length - 1] = X.pop();
    const V = BAND_TOUR_V[d.vi];
    d.cities = C; d.tot = V.cost * C.length; d.r = bandTourFill(s, t, V);
  },
  text: (s, d) => {
    const t = s.tracks.band, n = bandMembers(s, t).length + 1, V = BAND_TOUR_V[d.vi], co = ownCo(s, 'band'), C = d.cities.join(' · ');
    return t.st === 'signed' ? `${josa(t.agN, '이가')} 밴드 「${t.b.name}」의 지방 투어를 잡으려 한다. ${C} — ${V.n} ${d.cities.length}곳을 일주일 동안 돈다.\n\n차와 숙소, 대관은 회사가 맡는다. 그 비용을 뺀 수익을 회사와 나누고, 밴드 몫은 멤버 ${n}명이 똑같이 나눈다.${t.debt > 0 ? ' 내 몫은 갚을 비용부터 갚는다.' : ''}`
      : `지방 ${V.n} 몇 곳에서 밴드 ${josa(`「${t.b.name}」`, '을를')} 불러 주겠다는 연락이 모였다. ${C} — ${d.cities.length}곳을 일주일 동안 도는 일정이다.\n\n승합차를 빌려 악기를 싣고 멤버들이 돌아가며 운전한다. 차와 기름, 숙소, 대관 비용은 멤버 ${n}명이 똑같이 나눠 먼저 내고, 표값도 똑같이 나눈다.${co ? ` 내 몫은 내 회사 ${josa(`「${co.name}」`, '이가')} 낸다.` : ''}`;
  },
  ch(s, d) {
    const t = s.tracks.band, n = bandMembers(s, t).length + 1, my = Math.round(d.tot / n);
    const seat = d.r >= 0.9 ? '가는 곳마다 자리를 거의 채울 듯하다' : d.r >= 0.6 ? '자리가 조금씩 빌 듯하다' : d.r >= 0.4 ? '자리가 절반쯤 찰 듯하다' : '객석이 한산할 듯하다';
    const go = (s, x) => { t.tourT = s.t + BAND_TOUR_GAP; queueEv(s, 'band_tour_res', 1, Object.assign({ vi: d.vi, cities: d.cities, tot: d.tot }, x), true); return `${josa(d.cities.join(' · '), '을를')} 도는 지방 투어를 잡았다. 다음 달에 떠난다.`; };
    const later = { t: '이번엔 가지 않는다', h: '반년 뒤에 다시 이야기한다', f: s => { t.tourT = s.t + 6; return '지방 투어는 다음으로 미뤘다.'; } };
    if (t.st === 'signed') return [{ t: '가겠다고 한다', h: `${seat} · 다음 달에 떠난다 · 스트레스 ↑`, ok: s => !bandLiveNo(s, t), f: s => go(s, { signed: true, cut: t.cut || 0, cost: 0 }) }, Object.assign({}, later, { t: '이번엔 가지 않겠다고 한다' })];
    return [{ t: '간다', h: `${seat} · 비용 ${fmtWon(d.tot)} 가운데 내 몫 ${fmtWon(my)} · 다음 달에 떠난다 · 스트레스 ↑`, ok: s => !bandLiveNo(s, t) && jobMoney(s, 'band') >= my, f: s => { jobPay(s, my, '지방 투어 비용', 'band'); return go(s, { signed: false, cut: 0, cost: my }); } }, later];
  },
});
E({
  id: 'band_tour_res', cat: '투어', title: '지방 투어', tag: 'career', bg: 'van', keepPop: true,
  init(s, d) {
    const t = s.tracks.band;
    // 그사이 무대에 설 수 없게 됐으면 투어는 취소된다. 먼저 낸 내 몫은 돌려받고, 반년 뒤에 다시 이야기한다 (단독 공연과 같다)
    if (!t || bandLiveNo(s, t)) { const miss = bandOn(s) && bandMissing(t).length > 0; d.skip = true; bandTourBack(s, d); if (bandOn(s)) t.tourT = s.t + 6; addLog(s, `잡아 둔 지방 투어가 취소됐다.${miss ? ' 멤버 자리가 비어 무대에 설 수 없었다.' : ''}${d.back ? ' 먼저 낸 비용은 돌려받았다.' : ''}`, 'career'); return; }
    const p = me(s), mem = bandMembers(s, t), n = mem.length + 1, V = BAND_TOUR_V[d.vi] || BAND_TOUR_V[0], C = d.cities, booked = !!d.signed, pw = bandPower(s, t), last = C.length - 1;
    // 길 위에서 생긴 일 하나: 차가 퍼짐(직접 모는 인디만. 회사가 잡은 투어는 길이 막힘) · 휴게소의 밤 · 찾아온 지방 팬 · 멤버의 감기
    d.road = U.wpick(['van', 'talk', 'fan', 'cold'], k => ({ van: 25, talk: 30, fan: 30, cold: 15 })[k]);
    if (d.road === 'van' && booked) d.road = 'jam';
    const dm = bandTourDemand(s, t), M = bandFanM(s, t);
    let sold = 0, heat = 0, gain = 0;
    d.rows = C.map((c, i) => {
      const so = Math.max(1, Math.round(Math.min(V.seat, dm * U.fl(0.6, 1.4) + V.seat * U.fl(V.wk[0], V.wk[1]))));
      const h = Math.round(U.clamp(bandHeatBase(pw) + (twOf(t.b) - 50) * 0.08 + (so / V.seat - 0.6) * 12 - (s.stress >= 70 ? 4 : 0) - (d.road === 'jam' && i === 0 ? 6 : 0) - (d.road === 'cold' && i === last ? 7 : 0) + U.normal(0, 6), 5, 100));
      sold += so; heat += h; gain += M * BAND_TOUR_FANM * U.clamp((h - 30) / 30, 0.2, 1.8);
      return [c, so, h, Math.round(so / V.seat * 100)];
    });
    d.sold = sold; d.heat = Math.round(heat / C.length);
    if (d.road === 'fan') gain += M * 0.4;
    if (d.road === 'van') { d.rep = Math.round(U.int(20, 45) * 1e4 / n / 1e3) * 1e3; jobPay(s, d.rep, '투어 차량 수리', 'band'); }
    if (d.road === 'cold') { const m = U.pick(mem); if (m) { d.sick = m.id; bond(s, m, 3); } else d.road = 'talk'; }
    // 표값에서 예매 수수료 10%를 뗀다. 회사가 잡은 투어는 비용을 뺀 나머지를 정산하고(적자는 회사가 진다), 멤버끼리 잡은 투어는 비용을 먼저 냈으니 표값을 그대로 나눈다
    const tix = Math.round(sold * V.tk * 0.9);
    let bill = null;
    if (booked) {
      const rev = Math.max(0, tix - d.tot);
      d.lost = !(rev > 0);
      // 잡을 때는 소속이었는데 그사이 회사를 나왔으면, 잡아 준 회사가 그때 약속한 몫을 가져간다
      if (t.st === 'signed') { d.pay = bandIncome(s, t, rev, '지방 투어') || 0; bill = rev > 0 ? t.lastBill : null; }
      else { const r = rev > 0 ? billPay(s, { rev, cut: d.cut || 0, n, team: '밴드', what: '지방 투어', job: 'band' }) : null; d.pay = r ? r.share : 0; bill = r ? r.bill : null; }
      d.net = d.pay;
      if (bill) { bill.rows[0][0] = '투어 수익'; bill.rows.unshift(['티켓 판매', bill.rows[0][1] + d.tot], ['차 · 숙소 · 대관 비용', -d.tot], '-'); }
    } else {
      const r = billPay(s, { rev: tix, n, team: '밴드', what: '지방 투어', job: 'band' });
      d.pay = r.share; bill = r.bill; d.net = Math.round(d.pay - (d.cost || 0) - (d.rep || 0));
      bill.rows[0][0] = '티켓 판매';
      if (d.cost > 0) bill.note = `먼저 낸 투어 비용 내 몫 ${fmtBill(d.cost)}${d.rep ? ` · 차 수리비 내 몫 ${fmtBill(d.rep)}` : ''}을 빼면 ${d.net >= 0 ? `${fmtBill(d.net)}이 남는다` : `${fmtBill(-d.net)} 적자다`}.`;
    }
    if (bill) { bill.t = '지방 투어 정산'; d.bill = bill; }
    const f0 = t.b.f; d.my = bandFansAdd(s, t, gain); d.gain = t.b.f - f0;
    d.pop = jpopAdd(s, 'band', d.heat >= 75 ? 1.5 : d.heat >= 60 ? 0.6 : d.heat >= 48 ? 0 : -0.3);
    t.tourN = (t.tourN || 0) + 1; t.tourT = s.t + BAND_TOUR_GAP;
    practice(s, p, t.b.my, 2, 1); teamGrow(s, bandTm(s, t), 1, true); addStress(s, d.road === 'fan' ? 6 : 10);
    // 일주일을 같이 먹고 자면 가까워지고 손발이 맞는다. 휴게소에서 밤새 이야기한 투어는 더
    for (const m of mem) bond(s, m, d.road === 'talk' ? 8 : 3);
    twAdd(t.b, d.road === 'talk' ? 6 : 3);
    if (t.tourN === 1) milestone(s, `${age(s)}세에 밴드 「${t.b.name}」의 첫 지방 투어를 돌았다.`);
  },
  html: (s, d) => d.bill && typeof billBtnHTML === 'function' ? cardText(s, d) + billBtnHTML(d.bill) : '',
  text: (s, d) => {
    const t = s.tracks.band, C = d.cities, last = C[C.length - 1], sick = d.sick && s.people[d.sick];
    const road = d.road === 'van' ? `${josa(C[Math.min(1, C.length - 1)], '으로')} 가는 고속도로에서 승합차가 퍼졌다. 견인차를 부르고 정비소에서 반나절을 보냈다. (수리비 내 몫 ${fmtWon(d.rep || 0)})`
      : d.road === 'jam' ? `${josa(C[0], '으로')} 가는 길이 사고로 막혀, 첫날은 리허설도 못 하고 무대에 올랐다.`
        : d.road === 'fan' ? `${last} 공연에는 손수 만든 현수막을 든 사람들이 맨 앞줄에 서 있었다. 첫 곡 때부터 듣고 있었다고 했다.`
          : d.road === 'cold' && sick ? `투어 중에 ${josa(sick.name, '이가')} 감기에 걸려 마지막 ${last} 무대는 힘에 부쳤다. 그래도 끝까지 자리를 지켰다.`
            : '돌아오는 길, 휴게소 주차장에서 멤버들과 밤새 이야기를 나눴다. 밴드를 처음 시작하던 때 이야기까지 나왔다.';
    const money = d.signed ? (d.pay > 0 ? `정산 +${fmtWon(d.pay)}` : d.lost ? '정산금 없음 (비용이 표값보다 컸다)' : '정산금 없음') : d.net > 0 ? `내 몫 투어 수익 +${fmtWon(d.net)}` : d.net < 0 ? `내 몫 투어 적자 ${fmtWon(-d.net)}` : '';
    const fl = [money, d.gain > 0 ? `밴드 팬 +${fmtFans(d.gain)}` : '', d.my > 0 ? `내 팬 +${fmtFans(d.my)}` : '', d.pop > 0.3 ? '대중 호감도 ↑' : d.pop < -0.3 ? '대중 호감도 ↓' : '', '팀워크 ↑', '스트레스 ↑'].filter(Boolean).join(' · ');
    return `밴드 「${t.b.name}」의 지방 투어를 마쳤다. 일주일 동안 ${C.length}곳을 돌았다.\n\n${d.rows.map(r => `· ${r[0]} — ${r[3] >= 98 ? '자리가 꽉 찼다' : r[3] >= 75 ? '자리를 거의 채웠다' : r[3] >= 45 ? '자리가 절반쯤 찼다' : '객석이 한산했다'} · ${soloHeatW(r[2])}`).join('\n')}\n\n${road}\n\n${fl}${d.signed && d.bill && d.bill.note ? `\n\n${d.bill.note}` : ''}`;
  },
  ch: (s, d) => [{ t: '확인', f: () => `밴드 지방 투어를 마쳤다. ${d.cities.join(' · ')} ${d.cities.length}곳을 돌았다.` }],
});

// ───── 하나짜리 사건 ─────
// 후배 밴드: 밴드를 4년 넘게 했고 발표곡 3곡 · 밴드 팬 5,000명부터. 업계 밴드(npc.js)의 신인이 있으면 그 팀, 없으면 새 이름
E({
  id: 'band_junior', cat: '밴드', title: '후배 밴드', tag: 'career', bg: 'jamroom', p: 0.02, cd: 30,
  cond: s => { const t = s.tracks.band; return bandEvFull(s) && (t.months || 0) >= 48 && (t.rel || 0) >= 3 && t.b.f >= 5000; },
  init(s, d) {
    const t = s.tracks.band, L = npcList(s, 'band').filter(n => n.ph === 'rookie' && n.n !== t.b.name), n = L.length ? U.pick(L) : null;
    if (n) { d.nid = n.id; d.jn = n.n; npcKnow(n); }
    else { const used = new Set(npcList(s, 'band').map(x => x.n).concat(s.usedNames || [], [t.b.name])); d.jn = U.shuffle(BAND_NAMES.filter(x => !used.has(x)))[0] || U.pick(BAND_NAMES) + ' ' + U.int(2, 9); }
    d.k = U.pick(BAND_NEED);
    const x = makeMusicMate(s, { age: Math.max(18, age(s) - U.int(3, 8)), rel: '후배', job: `밴드 「${d.jn}」`, met: '합주실에서 만난 후배 밴드', aff: 40, tal: d.k === 'vocal' ? ['music', 'star'] : ['music', 'rhythm'], sk: { [d.k]: 38, compose: 28 } });
    meetAt(s, x, '합주실에서 만난 후배 밴드', 'band'); d.x = x.id;
  },
  text: (s, d) => { const x = s.people[d.x]; return `합주실 복도에서 후배 밴드 「${d.jn}」의 ${partN(d.k)} ${josa(x.name, '이가')} 기다리고 있었다. "선배님 공연을 보고 밴드를 시작했어요."\n\n손에는 데모가 든 USB가 들려 있다. 한번 들어 봐 달라고, 괜찮다면 클럽에서 합동 공연도 같이 해 달라고 한다.`; },
  ch: (s, d) => {
    const t = s.tracks.band, x = s.people[d.x], p = me(s), n = d.nid ? npcBy(s, d.nid) : null;
    return [
      { t: '합동 공연을 한다', h: '밴드 팬 조금 ↑ · 후배와 많이 가까워진다 · 스트레스 ↑', ok: s => !bandLiveNo(s, t), f: s => { const f0 = t.b.f; bandFansAdd(s, t, bandFanM(s, t) * 0.5); bond(s, x, 12); twAdd(t.b, 1); jpopAdd(s, 'band', 0.4); if (n) npcRel(s, n, 8); return `${josa(`「${d.jn}」`, '과와')} 클럽에서 합동 공연을 했다. 앵콜은 두 밴드가 한 무대에 올라 같이 연주했다. (밴드 팬 +${fmtFans(t.b.f - f0)})` + fx(s, { stress: 4 }); } },
      { t: '데모를 들어 준다', h: `후배와 가까워진다${has(p, 'edu') ? ' · 교육 ↑' : ''}`, f: s => { bond(s, x, 8); teach(s, p, 1); if (has(p, 'compose')) useSkill(s, p, 'compose', 0.5); if (n) npcRel(s, n, 4); return `데모를 끝까지 듣고 좋은 점과 아쉬운 점을 하나씩 짚어 줬다. ${josa(x.name, '은는')} 수첩에 받아 적었다.`; } },
      { t: '정중히 거절한다', f: s => { bond(s, x, -1); return '지금은 우리 일정만으로도 벅차다고 정중히 말했다.'; } },
    ];
  },
});
// 솔로 제의: 밴드를 3년 넘게 했고 발표곡 2곡부터, 내가 보컬이거나 스타성이 70부터. 노래나 랩이 30레벨은 돼야 한다. 스타성이 높을수록 갈수록 자주 (50이면 한 달 2% · 70이면 2.7% · 90이면 3.6%)
//   회사 소속(내 팬 5,000명부터): 같은 회사가 밴드와 같이 솔로 앨범을 내자고 한다 (아이돌의 '솔로 앨범을 낸다'와 같은 틀 — startSoloSigned withGroup. music.js CAREERS.solo.monthly가 밴드도 본다)
//   인디(내 팬 8,000명부터 · 다른 전속 계약이나 내 회사가 없을 때만): 다른 기획사가 솔로 전속 계약을 제안한다 (조건은 영입 제안과 같은 scoutOffer). 밴드를 하면서 계약하거나, 밴드를 떠나 솔로로 간다
//   거절하면 멤버들과 가까워지고 2년 동안 다시 묻지 않는다 (t.soloAsk). 밴드를 하면서 받으면 멤버들이 서운해하고, 1년 반 동안 다툼이 잦다 (t.b.soloT → bandFightP)
//   겸직: 직업 3개 한도 · 전속 아티스트 규칙(game.js jobBlock)을 본다. 받을 수 있는 길이 하나도 없으면 제의도 오지 않는다
// 밴드를 떠나 솔로로 갈 때의 겸직 규칙: 밴드를 그만둔 셈 치고 본다
function bandSoloWhy(s, leave) { const t = s.tracks.band, st = t.st; if (leave) t.st = 'ended'; try { return jobBlock(s, 'solo', ['artist']); } finally { t.st = st; } }
function bandSoloOk(s) {
  const t = s.tracks.band, p = me(s);
  if (!bandEvOn(s) || trackOn(s, 'solo') || (t.soloAsk || 0) > s.t || (t.months || 0) < 36 || (t.rel || 0) < 2) return false;
  if (age(s) < 15 || Math.max(lv(p, 'vocal'), lv(p, 'rap')) < 30 || !(t.b.my === 'vocal' || p.tal.star >= 70)) return false;
  if (t.st === 'signed') return !!AG[t.ag] && totalFans(s) >= 5000 && !jobBlock(s, 'solo', ['artist']);
  return totalFans(s) >= 8000 && !contractWhy(s) && (!jobBlock(s, 'solo', ['artist']) || !bandSoloWhy(s, true));
}
E({
  id: 'band_solo', cat: '밴드', title: '솔로 제의', tag: 'career', bg: 'meeting', cd: 12,
  p: s => 0.012 + 0.03 * Math.pow(me(s).tal.star / 100, 2),
  cond: s => bandSoloOk(s),
  init(s, d) {
    const t = s.tracks.band;
    d.type = bestSoloType(s);
    if (t.st === 'signed') { const b = agBoss(s, t.ag); meetAt(s, b, `${t.agN} 대표`, 'band'); d.sg = 1; d.ag = t.ag; d.x = b.id; return; }
    const o = scoutOffer(s, 'solo');
    if (!o) { d.skip = true; return; }
    const x = pickIndustry(s, 'A&R 담당자'); meetAt(s, x, `${AG[o.ag].n} A&R`, 'band');
    d.ag = o.ag; d.bonus = o.bonus; d.cut = o.cut; d.months = o.months; d.x = x.id;
  },
  text: (s, d) => {
    const t = s.tracks.band, x = s.people[d.x], ty = soloTypeN(d.type), wh = d.type === 'rap' ? '랩만 따로 듣고 싶다는' : d.type === 'perf' ? '무대만 따로 보고 싶다는' : '목소리만 따로 듣고 싶다는';
    return d.sg ? `${t.agN} 대표 ${josa(x.name, '이가')} 나만 따로 불렀다. "밴드는 밴드대로 가고, 네 이름으로 앨범을 한 장 내 보자. 네 ${wh} 사람이 많아."\n\n밴드 「${t.b.name}」 활동은 그대로 하면서, 같은 회사 솔로 ${josa(ty, '으로')}도 활동하게 된다. 멤버들이 어떻게 받아들일지는 모르겠다.`
      : `공연이 끝나고 ${AG[d.ag].n}(${TIER_N[AG[d.ag].tier]} 기획사)의 A&R 담당자 ${josa(x.name, '이가')} 명함을 내밀었다. "밴드 말고, 혼자서 저희와 계약해 보지 않겠어요? ${wh} 사람이 많습니다."\n\n솔로 ${ty} 전속 계약 · 계약금 ${fmtWon(d.bonus)} · 회사 몫 ${pctN(d.cut)} · ${yrs(d.months)}. 밴드 ${josa(`「${t.b.name}」`, '을를')} 하면서 솔로 활동을 같이 해도 되고, 밴드를 떠나 솔로에만 집중해도 된다고 한다.`;
  },
  ch: (s, d) => {
    const t = s.tracks.band, no = { t: '밴드에 집중한다', h: '멤버들과 가까워진다 · 한동안 다시 권하지 않는다', f: s => { t.soloAsk = s.t + 24; bandMatesAll(s, t, 4, 2); return '솔로 제의는 사양했다. 이야기를 전해 들은 멤버들이 말없이 어깨를 쳤다.'; } };
    const sign = (s, o) => { if (d.bonus && !d.sg) earn(s, d.bonus, '전속 계약금', 'solo'); t.soloAsk = s.t + 24; return startSoloSigned(s, d.ag, o); };
    if (d.sg) return [
      { t: '솔로 앨범을 낸다', nj: 'solo', nm: ['artist'], ok: s => bandOn(s) && t.st === 'signed' && t.ag === d.ag && !trackOn(s, 'solo'), h: '밴드와 함께 솔로 가수로도 활동한다 · 멤버들이 서운해할 수 있다', f: s => { bandMatesAll(s, t, -6, -5); t.b.soloT = s.t; return sign(s, { type: d.type, withGroup: true }) + ' 멤버들은 축하한다고 했지만 표정이 밝지만은 않았다.'; } },
      no,
    ];
    const w0 = contractWhy(s), w1 = w0 || bandSoloWhy(s, true), nm = `밴드 「${t.b.name}」`;
    return [
      { t: '밴드를 하면서 솔로 계약을 한다', nj: 'solo', nm: ['artist'], ok: s => bandOn(s) && !contractWhy(s) && !trackOn(s, 'solo'), h: w0 || `계약금 ${fmtWon(d.bonus)} · 멤버들이 서운해할 수 있다`, f: s => { bandMatesAll(s, t, -8, -6); t.b.soloT = s.t; return sign(s, { type: d.type, months: d.months, cut: d.cut }) + ' 멤버들은 축하한다고 했지만 표정이 밝지만은 않았다.'; } },
      { t: '밴드를 떠나 솔로로 계약한다', ok: s => bandOn(s) && !contractWhy(s) && !trackOn(s, 'solo') && !bandSoloWhy(s, true), h: w1 || `계약금 ${fmtWon(d.bonus)} · ${josa(nm, '을를')} 그만둔다`, f: s => { bandMatesAll(s, t, -10, 0); endBand(s, '솔로 전향'); return `${josa(nm, '을를')} 떠났다. ` + sign(s, { type: d.type, months: d.months, cut: d.cut }); } },
      no,
    ];
  },
});
// 단골 클럽 정기 공연: 인디 초반(밴드 팬 1,500명 아래). 받으면 반년 동안 매달 작은 출연료와 팬이 조금 (bandRegMonth). 무대에 설 수 없는 달은 쉬고, 열 달이 지나도록 못 채우면 흐지부지 끝난다
const BAND_CLUBS = ['클럽 모퉁이', '라이브하우스 파랑', '지하 이층', '클럽 스피커', '라이브하우스 온도', '클럽 새벽두시'];
const BAND_REG_M = 6, BAND_REG_PAY = 30e4;
E({
  id: 'band_club_reg', cat: '밴드', title: '단골 클럽의 제안', tag: 'career', bg: 'jamroom', p: 0.06, cd: 24,
  cond: s => { const t = s.tracks.band; return bandEvFull(s) && t.st === 'indie' && (t.months || 0) >= 3 && t.b.f < 1500 && !t.b.reg; },
  init(s, d) { const x = pickIndustry(s, '클럽 사장'); meetAt(s, x, '라이브 클럽', 'band'); d.x = x.id; d.cn = U.pick(BAND_CLUBS); d.pay = BAND_REG_PAY; },
  text: (s, d) => { const t = s.tracks.band, x = s.people[d.x], n = bandMembers(s, t).length + 1; return `공연이 끝나고 「${d.cn}」 사장 ${josa(x.name, '이가')} 음료를 건네며 말했다. "너희, 매달 마지막 금요일에 우리 무대를 맡아 볼래? 올 때마다 손님이 조금씩 붙는 게 보여."\n\n반년 동안 매달 한 번 정기 공연을 한다. 출연료는 한 번에 ${fmtWon(d.pay)}, 멤버 ${n}명이 똑같이 나눈다.`; },
  ch: (s, d) => {
    const t = s.tracks.band, x = s.people[d.x];
    return [
      { t: '정기 공연을 맡는다', h: '반년 동안 매달 공연 수입 조금 · 밴드 팬 조금 ↑ · 스트레스 조금 ↑', f: s => { t.b.reg = { left: BAND_REG_M, cn: d.cn, x: d.x, pay: d.pay, g: 0, t: s.t }; bond(s, x, 5); return `「${d.cn}」에서 반년 동안 매달 정기 공연을 하기로 했다.`; } },
      { t: '아직은 여러 무대를 돌고 싶다고 한다', f: s => { bond(s, x, -1); return `「${d.cn}」 정기 공연 제안은 사양했다.`; } },
    ];
  },
});
function bandRegMonth(s, t) {
  const R = t.b.reg;
  if (!R || !(R.left > 0)) return;
  const n = bandMembers(s, t).length + 1, f0 = t.b.f;
  earn(s, Math.round(R.pay / n * coldPayM(s, 'band')), '공연 수입', 'band');
  bandFansAdd(s, t, bandFanM(s, t) * 0.25); R.g = (R.g || 0) + (t.b.f - f0);
  addStress(s, 1);
  if (--R.left > 0) return;
  const x = bandPerson(s, R.x); if (x) bond(s, x, 4);
  addLog(s, `「${R.cn}」 정기 공연 반년을 마쳤다. 마지막 날에는 단골들이 맨 앞줄을 채웠다. (그동안 밴드 팬 +${fmtFans(R.g)})`, 'career');
  t.b.reg = null;
}
// 생계 고민: 인디이고 밴드 팬이 3,000명 아래일 때, 결성 1년 뒤부터. 나이가 많은 멤버일수록 먼저 흔들린다. 운으로 나가지 않는다 — 내가 붙잡지 않을 때만 나간다
E({
  id: 'band_job', cat: '밴드', title: '먹고사는 문제', tag: 'career', bg: 'jamroom', p: 0.03, cd: 18,
  cond: s => { const t = s.tracks.band; return bandEvFull(s) && t.st === 'indie' && (t.months || 0) >= 12 && t.b.f < 3000 && !hasQ(s, 'band_leave') && !hasQ(s, 'band_fight_end'); },
  init(s, d) { const t = s.tracks.band, m = U.wpick(bandMembers(s, t), x => Math.max(1, pAge(s, x) - 18)); d.id = m.id; d.k = t.b.part[m.id]; d.amt = U.pick([50e4, 80e4, 100e4]); },
  text: (s, d) => { const m = s.people[d.id]; return `합주가 끝나고 ${partN(d.k)} ${josa(m.name, '이가')} 어렵게 말을 꺼냈다. "요즘 알바를 두 개 뛰는데도 월세가 밀려. 밴드를 계속해도 되는 건지 모르겠어."\n\n공연 수입만으로는 멤버 누구도 먹고살기 어렵다.`; },
  ch: (s, d) => {
    const t = s.tracks.band, m = s.people[d.id];
    return [
      { t: '내 돈을 조금 나눠 준다', h: `${fmtWon(d.amt)} · ${josa(m.name, '과와')} 많이 가까워진다`, ok: s => s.money >= d.amt, f: s => { addMoney(s, -d.amt, '멤버 생활비 보탬'); bond(s, m, 12); m.motT = s.t + 6; return `${m.name}에게 ${josa(fmtWon(d.amt), '을를')} 건넸다. ${josa(m.name, '은는')} 한참 받지 않다가, 꼭 갚겠다며 받아 들었다.`; } },
      { t: '같이 알바 자리를 알아봐 준다', h: `${josa(m.name, '과와')} 가까워진다 · 한동안 ${josa(m.name, '은는')} 연습할 시간이 준다`, f: s => { bond(s, m, 7); m.slumpT = s.t + 3; return `${josa(m.name, '과와')} 합주 시간과 겹치지 않는 일자리를 같이 알아봤다. 당분간은 일에 치여 연습할 시간이 줄 것 같다.` + fx(s, { stress: 2 }); } },
      { t: '붙잡지 않는다', h: "직업 창 '그룹' 탭에서 새 멤버를 구해야 한다", f: s => `${m.name}에게 무리하지 말라고 했다. ` + bandMemOut(s, t, m) },
    ];
  },
});
// 매달 (bandExtraMonth에서 부른다): 이어지는 사건의 뒷일. 무대에 설 수 없는 달에도 본다
function bandArcMonth(s, t) {
  const B = t.b;
  // 선배 밴드: 연락이 끊겼거나 2년이 지나도록 소식이 없으면 인연은 거기까지. 제의 창 · 무대가 사라졌으면(밴드를 쉬는 동안 등) 반년 뒤에 지운다
  const A = B.sen;
  if (A && (!bandPerson(s, A.id) || s.t - A.t > (A.st === 1 ? 24 : 6) && !hasQ(s, 'band_senior_open') && !hasQ(s, 'band_senior_openres'))) B.sen = null;
  // 멤버 갈등: 뒷일 창이 사라졌으면 지운다
  if (B.fight && s.t - B.fight.t > 4 && !hasQ(s, 'band_fight_end')) B.fight = null;
  // 음악성 차이: 그 방향으로 가기로 했으면 다음 새 곡이 나온 다음 달에 반응이 온다 (1년 반이 지나도록 곡이 안 나오면 없던 일). 색을 지켰으면 넉 달 뒤부터, 사이가 틀어져 있으면 나가겠다고 한다
  const D = B.dir;
  if (D) {
    const w = bandMemOf(s, t, D.m);
    if (!w) B.dir = null;
    else if (D.st === 1) { if ((t.rel || 0) > D.rel) { D.st = 3; D.t = s.t; queueEv(s, 'band_dir_res', 0, {}); } else if (s.t - D.t > 18) B.dir = null; }
    else if (D.st === 2) { if (s.t - D.t > 12) B.dir = null; else if (s.t - D.t >= 4 && w.aff < BAND_DIR_AFF && !hasQ(s, 'band_leave') && U.chance(0.25)) { D.st = 4; D.t = s.t; queueEv(s, 'band_dir_leave', 0, {}); } }
    else if (s.t - D.t > 4 && !hasQ(s, 'band_dir_res') && !hasQ(s, 'band_dir_leave')) B.dir = null;
  }
  // 정기 공연: 인디가 아니게 됐으면 그만둔다. 무대에 못 서는 달이 길어져 열 달이 지나면 흐지부지 끝난다
  const R = B.reg;
  if (R && (t.st !== 'indie' || s.t - R.t > BAND_REG_M + 4)) { addLog(s, t.st !== 'indie' ? `회사 소속이 되면서 「${R.cn}」 정기 공연은 그만두게 됐다.` : `「${R.cn}」 정기 공연은 흐지부지 끝났다.`, 'career'); B.reg = null; }
}

// ───── v220: 솔로 가수의 OST · 피처링 · 단독 공연 ─────
// 첫 곡을 낸 뒤부터. OST · 피처링은 메시지함으로 제안이 오고, 받으면 한두 달 뒤 성적 창이 뜬다. 성적이 좋을수록 팬과 인기가 더 오른다
// 단독 공연은 2년에 한 번 (발표곡 5곡 · 팬 3만 명부터. v234: 예전 3곡 · 2만 명). 공연장 크기를 고르고 다음 달에 무대에 선다
// v228: OST · 피처링으로 느는 팬을 조금 줄였다 (OST 0.8배 · 피처링 0.72배쯤). 대중 호감도가 높을수록 제안이 잦다 (game.js offerPopM)
const SOLO_VENUE = [
  { n: '라이브 클럽', seat: 300, cost: 600e4 },
  { n: '소극장', seat: 800, cost: 2500e4 },
  { n: '중극장 홀', seat: 2000, cost: 8000e4 },
  { n: '대형 공연장', seat: 5000, cost: 1.8e8 },
  { n: '체육관', seat: 10000, cost: 3.6e8 },
  { n: '돔 경기장', seat: 40000, cost: 14e8 },
];
const SOLO_TICKET = 77000, SOLO_LIVE_GAP = 24, SOLO_LIVE_REL = 5, SOLO_LIVE_FANS = 3e4, SOLO_LIVE_RATE = 0.022;
function soloOn(s) { const t = s.tracks.solo; return !!t && (t.st === 'indie' || t.st === 'signed'); }
function soloVoice(t, p) { return t.type === 'rap' ? 'rap' : t.type === 'perf' ? perfVoice(p) : 'vocal'; }
// 회사 소속이면 회사 몫을 뗀 내 몫
function soloShare(t, v) { return Math.round(v * (1 - (t.st === 'signed' ? t.cut || 0 : 0))); }
// 단독 공연에 올 만한 사람 수: 팬의 2.2%쯤(대중 호감도 50일 때), 호감도가 좋으면 더 (v234: 예전 3.5% → 2.2%. 같은 공연장을 채우려면 팬이 1.6배쯤 있어야 한다)
function soloDemand(s, t) { return totalFans(s) * SOLO_LIVE_RATE * (0.6 + jpop(s, 'solo') / 100 * 0.8); }
// 먼저 낸 대관비 돌려받기 (내 회사 소속이면 회사 돈으로)
function soloLiveBack(s, d) { if (!d.cost) return; const co = ownCo(s, 'solo'); if (co) coIn(co, d.cost, '단독 공연 대관비 환불', ownCoF(s, 'solo')); else addMoney(s, d.cost, '단독 공연 대관비 환불'); d.back = d.cost; d.cost = 0; }
function soloHeatW(h) { return h >= 82 ? '공연장이 터질 듯했다' : h >= 67 ? '분위기가 뜨거웠다' : h >= 52 ? '무난하게 즐겼다' : '분위기가 좀처럼 달아오르지 않았다'; }
// v230: 피처링을 청해 오는 가수 — 나보다 인기 있는 가수는 내 대중 호감도가 높아야 연락해 온다
//   내 인지도보다 얼마나 높은 가수까지 오는가(featUp): 호감도 35 아래 +4 · 50 +8 · 70 +18 · 85부터 +28 (예전에는 호감도와 상관없이 늘 +28). 가까운 동료 · 데뷔 동기는 10 더 (그래도 npcNear의 +28까지)
function featUp(s) { return 4 + 24 * Math.pow(U.clamp((jpop(s, 'solo') - 35) / 50, 0, 1), 1.5); }
function featFrom(s) { const f = s.fame || 0, up = featUp(s); return npcNear(s, 'solo').concat(npcNear(s, 'band')).filter(n => n.rk !== 'rival' && n.pop - f <= up + (n.rk === 'pal' || n.rk === 'dongi' ? 10 : 0)); }
// v230: 드라마 OST는 드라마 쪽에서 곡(드라마 장르 → 곡 분위기)을 먼저 정하고 부를 사람을 찾는다. 그 분위기의 숙련도가 높을수록 나에게 올 가능성이 크다
//   ostFitM: 숙련도 0이면 0.85배 · 12면 1.2배 · 25면 1.8배 · 35면 2.4배 · 44부터 3배 (갈수록 가파르게). 숙련도가 흔한 만큼(1위 20 · 2위 10 · 3위 5)이면 평균 1배쯤이라 전체 제안 수는 예전과 비슷하다
function ostConcept(genre) { const G = typeof OST_G !== 'undefined' ? OST_G[genre] : null; return U.pick(G ? G.c : TRENDS); }
function ostFitM(s, c) { return U.clamp(0.85 + 0.35 * Math.pow(cmGet(s, c) / 12, 1.4), 0.85, 3); }
function soloExtraMonth(s, t) {
  if (!soloOn(s) || t.withGroup || !t.rel || s.army || s.hiatus || s.ill || pregMe(s) || !jobN(s, 'solo')) return;
  const p = me(s), fans = totalFans(s), fame = s.fame || 0, X = t.xcd = t.xcd || {};
  // v221: OST · 피처링은 신곡을 준비하지 않을 때만 온다 (다음 곡까지 날짜를 세는 동안). 받으면 다음 신곡이 한 달 밀린다 (soloRelPush)
  const free = !t.alb && t.nextRel > 1 && t.nextRel < 90 && !musRelQ(s, 'solo');
  // OST: 노래하는 가수(래퍼형은 빼고), 보컬 35레벨 · 팬 5천 명부터. 이름이 알려질수록, 그리고 OST를 많이 부르고 잘될수록 자주 (쉬는 간격도 10개월 → 4개월까지 짧아진다)
  // v230: 드라마와 곡 분위기(c)가 먼저 정해지고, 그 곡을 부를 사람으로 내가 뽑히는지는 그 분위기의 숙련도에 달렸다 (ostFitM)
  if (free && t.type !== 'rap' && lv(p, 'vocal') >= 35 && fans >= 5000 && !(X.ost > s.t) && !s.inbox.some(m => m.kind === 'solo_ost') && !hasQ(s, 'solo_ostres')) {
    const genre = s.trendTV && U.chance(0.4) ? s.trendTV.drama : U.pick(DRAMA_TRENDS), c = ostConcept(genre);
    if (U.chance((0.02 + Math.min(0.03, fame / 2000) + Math.min(0.06, (t.ostN || 0) * 0.005 + (t.ostHit || 0) * 0.012)) * offerPopM(s, 'solo') * ostFitM(s, c))) {
      const drama = dramaTitle(genre), big = U.chance(U.clamp(0.1 + fame / 150, 0.1, 0.6));
      X.ost = s.t + Math.max(4, 10 - (t.ostN || 0) - (t.ostHit || 0));
      sendMsg(s, 'solo_ost', { from: `드라마 「${drama}」 제작진`, title: 'OST 가창 제안', months: 3, d: { drama, genre, c, big, fee: Math.round((100 + lv(p, 'vocal') * 4 + fame * 10) * (big ? 1.8 : 1) * coldPayM(s, 'solo')) * 1e4 } });
    }
  }
  // 피처링: 팬 3천 명부터. 내 인지도와 비슷한 급의 솔로 가수 · 밴드에서 온다 (아이돌 그룹에서는 오지 않는다). 아는 사이면, 그리고 피처링을 많이 하고 잘될수록 자주
  // v230: 나보다 인기 있는 가수는 내 대중 호감도가 높아야 온다 (featFrom)
  if (free && fans >= 3000 && !(X.feat > s.t) && !s.inbox.some(m => m.kind === 'solo_feat') && !hasQ(s, 'solo_featres') && typeof npcNear === 'function' && npcOn(s) && U.chance((0.025 + Math.min(0.05, (t.featN || 0) * 0.004 + (t.featHit || 0) * 0.01)) * offerPopM(s, 'solo'))) {
    const L = featFrom(s);
    if (L.length) { const n = U.wpick(L, x => 1 + (x.kn ? 2 : 0) + (x.rk ? 3 : 0)); X.feat = s.t + Math.max(4, 8 - (t.featN || 0) - (t.featHit || 0)); npcKnow(n); sendMsg(s, 'solo_feat', { from: n.n, title: '피처링 제안', months: 3, d: { id: n.id, fee: Math.round((50 + lv(p, soloVoice(t, p)) * 2 + fame * 5) * coldPayM(s, 'solo')) * 1e4 } }); }
  }
  // 단독 공연: 발표곡 5곡 · 팬 3만 명부터, 2년에 한 번
  if (t.rel >= SOLO_LIVE_REL && fans >= SOLO_LIVE_FANS && !(t.liveT > s.t) && !hasQ(s, 'solo_concert') && !hasQ(s, 'solo_concertres') && U.chance(0.25)) queueEv(s, 'solo_concert', 0, {});
}
function soloRelCan(t) { return !!t && !t.alb && t.nextRel > 0 && t.nextRel < 90; }
function soloRelPush(t) { if (soloRelCan(t)) t.nextRel++; }
function soloFxLine(d) { return [d.gain > 0 ? `${MK_N[d.mk || 'kr']} 팬 +${fmtFans(d.gain)}` : '', d.pop > 0.3 ? '대중 호감도 ↑' : d.pop < -0.3 ? '대중 호감도 ↓' : '', d.roy >= 1e4 ? `매달 들어올 음원 수익 약 ${fmtWon(d.roy)}` : ''].filter(Boolean).join(' · '); }
INBOX.solo_ost = {
  ic: '🎬',
  // v230: 곡 분위기를 알려 준다. 그 분위기 숙련도가 20을 넘으면 그래서 연락이 왔다는 말도
  text: (s, m) => `${m.d.big ? '기대작으로 꼽히는 ' : ''}${m.d.genre} 드라마 「${m.d.drama}」의 OST를 불러 달라는 제안이다.${m.d.c ? ` '${m.d.c}' 분위기의 곡${cmGet(s, m.d.c) >= 20 ? '이고, 이런 곡을 잘 부르는 가수를 찾다가 나에게 연락했다고 한다' : '이다'}.` : ''} 가창료 ${fmtWon(soloShare(s.tracks.solo, m.d.fee))}.\n\n드라마가 잘되면 OST도 같이 뜬다.`,
  ch: (s, m) => [
    { t: '부른다', ok: s => soloOn(s) && !s.army && !s.hiatus, h: '두 달 뒤 드라마와 함께 공개된다 · 곡이 잘되면 팬과 대중 호감도가 오른다' + (soloRelCan(s.tracks.solo) ? ' · 다음 신곡이 한 달 늦어진다' : ''), f: s => { const t = s.tracks.solo, pay = soloShare(t, m.d.fee); soloRelPush(t); earn(s, pay, 'OST 가창료', 'solo'); useSkill(s, me(s), 'vocal', 2); queueEv(s, 'solo_ostres', 2, { drama: m.d.drama, genre: m.d.genre, big: m.d.big, pay, title: ostTitle(m.d.genre, m.d.c), sg: t.st === 'signed' }, true); return `드라마 「${m.d.drama}」 OST를 녹음했다. 두 달 뒤 드라마와 함께 공개된다.` + fx(s, { stress: 2 }); } },
    { t: '거절한다', f: () => 'OST 제안을 거절했다.' },
  ],
};
E({
  id: 'solo_ostres', cat: 'OST', title: 'OST 성적', tag: 'career', keepPop: true,
  init(s, d) {
    const t = s.tracks.solo; // v221: 녹음한 곡은 그사이 가수를 그만뒀어도 나오고, 작품 기록에 남는다
    const p = me(s), mk = t.mkt || 'kr';
    // 드라마 흥행 (기대작 · 유행 장르면 조금 유리) + 내 노래. 팬이 많으면 조금 더
    d.hit = U.normal(d.big ? 0.5 : 0, 1) + (s.trendTV && d.genre === s.trendTV.drama ? 0.4 : 0);
    const sc = U.clamp(30 + lv(p, 'vocal') * 0.5 + (p.tal.voice - 50) * 0.1 + d.hit * 7 + Math.log10(1 + totalFans(s)) * 1.6 + U.normal(0, 5), 0, 100);
    d.sc = Math.round(sc); d.peak = chartFromScore(sc);
    d.mk = mk; d.gain = Math.round(Math.max(0, fanGain(s, sc, mk, 0.5)) * 0.8 * myRoom(s, mk)); s.fans[mk] += d.gain;
    d.pop = jpopAdd(s, 'solo', Math.max(0, (sc - 55) / 10));
    d.roy = addCatalog(s, d.title, 'OST 가창', sc, (d.sg != null ? d.sg : t.st === 'signed') ? 0.18 : 0.3, 'solo');
    if (sc >= 74) addFame(s, 1);
    t.ostN = (t.ostN || 0) + 1; if (sc >= 74) t.ostHit = (t.ostHit || 0) + 1;
    addWork(s, { type: 'OST', title: d.title, by: actName(s, 'solo'), sc: d.sc, pay: d.pay || 0, note: `드라마 「${d.drama}」 · ${chartText(d.peak)}` });
    if (d.peak && d.peak <= 10 && !t.ostMs) { t.ostMs = true; milestone(s, `${age(s)}세에 드라마 「${d.drama}」 OST ${josa(`「${d.title}」`, '으로')} 음원 차트 ${d.peak}위에 올랐다.`); }
  },
  text: (s, d) => { const fl = soloFxLine(d); return `${d.genre} 드라마 ${josa(`「${d.drama}」`, '이가')} ${d.hit >= 0.8 ? '큰 화제를 모으고 있다' : d.hit >= -0.4 ? '무난하게 방영되고 있다' : '별 화제 없이 방영되고 있다'}. 내가 부른 OST 「${d.title}」 — ${chartText(d.peak)}.${d.sc >= 74 ? ' 명장면마다 흘러나와 노래도 같이 떴다.' : d.sc < 58 ? ' 노래도 크게 알려지지 못했다.' : ''}${fl ? `\n\n${fl}` : ''}`; },
  ch: (s, d) => [{ t: '확인', f: () => `드라마 「${d.drama}」 OST ${josa(`「${d.title}」`, '이가')} 공개됐다. ${chartText(d.peak)}.` }],
});
INBOX.solo_feat = {
  ic: '🎤',
  text: (s, m) => { const n = npcBy(s, m.d.id); return n ? `${NPC_F[n.f].n} ${n.n} 쪽에서 신곡에 피처링으로 참여해 달라는 연락이 왔다. 참여료 ${fmtWon(soloShare(s.tracks.solo, m.d.fee))}.\n\n나와의 관계: ${npcRelWord(n)}` : '연락을 준 쪽이 그사이 활동을 접었다.'; },
  ch: (s, m) => {
    const n = npcBy(s, m.d.id);
    if (!n) return [{ t: '확인', f: () => '제안은 없던 일이 됐다.' }];
    return [
      { t: '참여한다', ok: s => soloOn(s) && !s.army && !s.hiatus, h: '다음 달에 곡이 나온다 · 곡이 잘되면 팬과 대중 호감도가 오른다' + (soloRelCan(s.tracks.solo) ? ' · 다음 신곡이 한 달 늦어진다' : ''), f: s => { const t = s.tracks.solo, pay = soloShare(t, m.d.fee); soloRelPush(t); earn(s, pay, '피처링 참여료', 'solo'); npcRel(s, n, 12); useSkill(s, me(s), soloVoice(t, me(s)), 1.5); queueEv(s, 'solo_featres', 1, { id: n.id, nn: n.n, pay, title: songTitle(), sg: t.st === 'signed' }, true); return `${n.n}의 신곡 피처링을 녹음했다. 다음 달에 나온다.` + fx(s, { stress: 2 }); } },
      { t: '정중히 거절한다', f: s => { npcRel(s, n, n.ps === 'amb' ? -6 : -2); return `${n.n}의 피처링 제안을 정중히 거절했다.`; } },
    ];
  },
};
E({
  id: 'solo_featres', cat: '피처링', title: '피처링 곡 성적', tag: 'career', keepPop: true,
  init(s, d) {
    const t = s.tracks.solo;
    const p = me(s), mk = t.mkt || 'kr', n = npcBy(s, d.id), pop = n ? n.pop : 30, sk = n ? n.sk : 50;
    // 곡 주인의 실력 · 인기가 크고, 내 노래(랩)가 보탠다
    const sc = U.clamp(22 + sk * 0.35 + pop * 0.3 + lv(p, soloVoice(t, p)) * 0.2 + U.normal(0, 6), 0, 100);
    d.sc = Math.round(sc); d.peak = chartFromScore(sc);
    d.mk = mk; d.gain = Math.round(npcFanGain(s, { pop }) * (0.3 + Math.max(0, sc - 45) / 35) * myRoom(s, mk)); s.fans[mk] += d.gain;
    d.pop = jpopAdd(s, 'solo', Math.max(0, (sc - 55) / 12));
    d.roy = addCatalog(s, d.title, '피처링', sc, (d.sg != null ? d.sg : t.st === 'signed') ? 0.09 : 0.15, 'solo');
    if (n) { if (sc >= 70) n.pop = U.clamp(n.pop + 2, 1, 99); if (sc >= 66) npcRel(s, n, 8); }
    t.featN = (t.featN || 0) + 1; if (sc >= 74) t.featHit = (t.featHit || 0) + 1;
    addWork(s, { type: '피처링', title: d.title, by: d.nn, sc: d.sc, pay: d.pay || 0, note: chartText(d.peak) });
  },
  text: (s, d) => { const fl = soloFxLine(d); return `내가 피처링한 ${d.nn}의 신곡 ${josa(`「${d.title}」`, '이가')} 나왔다. ${chartText(d.peak)}.${d.sc >= 74 ? ' "피처링이 곡을 살렸다"는 말이 많다.' : d.sc < 58 ? ' 곡이 크게 알려지지는 못했다.' : ''}${fl ? `\n\n${fl}` : ''}`; },
  ch: (s, d) => [{ t: '확인', f: () => `${d.nn}의 신곡 「${d.title}」에 피처링으로 참여했다. ${chartText(d.peak)}.` }],
});
E({
  id: 'solo_concert', cat: '단독 공연', title: '단독 공연을 열까?', tag: 'career',
  cond: s => soloOn(s),
  // d.cv: 회사가 잡을 공연장 (올 사람 수에 맞는 곳. 가끔 몸을 사려 한 단계 작은 곳, 자리가 1.7배 안쪽이면 가끔 욕심을 내 한 단계 큰 곳)
  init(s, d) { const t = s.tracks.solo; d.dm = Math.round(soloDemand(s, t)); d.nth = (t.liveN || 0) + 1; let v0 = 0; SOLO_VENUE.forEach((V, i) => { if (V.seat <= d.dm * 1.15) v0 = i; }); const up = SOLO_VENUE[v0 + 1]; d.cv = U.clamp(v0 + (up && up.seat <= d.dm * 1.7 && U.chance(0.25) ? 1 : U.chance(0.15) ? -1 : 0), 0, SOLO_VENUE.length - 1); },
  text: (s, d) => { const t = s.tracks.solo, signed = t.st === 'signed'; return signed ? `${josa(t.agN, '이가')} ${d.nth === 1 ? '첫' : `${d.nth}번째`} 단독 공연을 기획하려 한다. 발표곡 ${t.rel}곡, 팬 ${fmtFans(totalFans(s))}.\n\n공연장과 규모는 회사가 정한다. 대관과 무대 비용을 뺀 수익을 회사와 나눈다.` : `내 이름을 건 ${d.nth === 1 ? '첫' : `${d.nth}번째`} 단독 공연을 열 때가 됐다. 발표곡 ${t.rel}곡, 팬 ${fmtFans(totalFans(s))}.\n\n공연장이 클수록 많이 벌 수 있지만, 자리가 비면 분위기가 식는다. 대관과 무대 비용은 내 돈으로 먼저 낸다.`; },
  ch(s, d) {
    const t = s.tracks.solo, signed = t.st === 'signed';
    // v221: 회사 소속이면 공연장은 회사가 정하고, 나는 기획 전에 할지 말지만 답한다 (인디 · 내 회사 소속은 내가 고른다)
    if (signed) { const V = SOLO_VENUE[d.cv != null ? d.cv : SOLO_VENUE.reduce((b, x, i) => x.seat <= d.dm * 1.15 ? i : b, 0)]; return [
      { t: '하겠다고 한다', h: '공연장은 회사가 잡는다 · 다음 달에 무대에 선다', f: s => { t.liveT = s.t + SOLO_LIVE_GAP; queueEv(s, 'solo_concertres', 1, { v: SOLO_VENUE.indexOf(V), signed, cut: t.cut || 0, cost: 0 }, true); return `${josa(t.agN, '이가')} ${V.n}(${V.seat.toLocaleString()}석)을 잡았다. 다음 달에 무대에 선다.`; } },
      { t: '이번엔 하지 않겠다고 한다', h: '1년 뒤에 다시 이야기한다', f: s => { t.liveT = s.t + 12; return '단독 공연은 다음으로 미뤘다.'; } },
    ]; }
    let v0 = 0; SOLO_VENUE.forEach((V, i) => { if (V.seat <= d.dm * 1.15) v0 = i; });
    const C = [v0 - 1, v0, v0 + 1].filter(i => i >= 0 && i < SOLO_VENUE.length).map(i => {
      const V = SOLO_VENUE[i], r = d.dm / V.seat, cost = signed ? 0 : V.cost;
      return { t: `${V.n} (${V.seat.toLocaleString()}석)`, h: `${r >= 1.15 ? '자리가 모자랄 듯하다' : r >= 0.9 ? '자리를 거의 채울 듯하다' : r >= 0.7 ? '자리가 조금 빌 듯하다' : r >= 0.5 ? '자리가 꽤 빌 듯하다' : '절반도 못 채울 듯하다'}${cost ? ` · 비용 ${fmtWon(cost)}` : ''}`, ok: s => jobMoney(s, 'solo') >= cost,
        f: s => { if (cost) jobPay(s, cost, '단독 공연 대관 · 무대', 'solo'); t.liveT = s.t + SOLO_LIVE_GAP; queueEv(s, 'solo_concertres', 1, { v: i, signed, cut: signed ? t.cut || 0 : 0, cost }, true); return `${V.n}에서 단독 공연을 열기로 했다. 다음 달에 무대에 선다.`; } };
    });
    C.push({ t: '이번엔 열지 않는다', h: '1년 뒤에 다시 이야기한다', f: s => { t.liveT = s.t + 12; return '단독 공연은 다음으로 미뤘다.'; } });
    return C;
  },
});
E({
  id: 'solo_concertres', cat: '단독 공연', title: '단독 공연', tag: 'career', keepPop: true,
  live: (s, d) => d.live,
  init(s, d) {
    const t = s.tracks.solo;
    // 그사이 가수를 그만뒀거나 무대에 설 수 없게 됐으면(입대 · 자숙 · 병 · 임신) 공연은 취소된다. 먼저 낸 대관비는 돌려받고, 반년 뒤에 다시 이야기한다
    if (!soloOn(s) || s.army || s.hiatus || s.ill || pregMe(s)) { d.skip = true; soloLiveBack(s, d); if (soloOn(s)) t.liveT = s.t + 6; addLog(s, `잡아 둔 단독 공연이 취소됐다.${d.back ? ' 대관비는 돌려받았다.' : ''}`, 'career'); return; }
    const p = me(s), V = SOLO_VENUE[d.v] || SOLO_VENUE[0], mk = t.mkt || 'kr', signed = d.signed != null ? !!d.signed : t.st === 'signed', cut = d.cut != null ? d.cut : signed ? t.cut || 0 : 0, perf = soloScore(s, t.type);
    d.vn = V.n; d.seat = V.seat;
    d.sold = Math.max(1, Math.round(Math.min(V.seat, soloDemand(s, t) * U.fl(0.85, 1.15)))); d.fill = d.sold / V.seat;
    // 열기: 무대 실력 · 인기 · 자리가 찬 만큼 · 스타성. 몹시 지쳐 있으면 깎인다
    d.heat = Math.round(U.clamp(28 + perf * 0.7 + (jpop(s, 'solo') - 50) * 0.15 + (d.fill - 0.75) * 24 + (p.tal.star - 50) * 0.12 - (s.stress >= 70 ? 5 : 0) + U.normal(0, 5), 5, 100));
    // 티켓값에서 예매 수수료 10%를 뗀다. 회사 소속은 비용을 뺀 나머지에서 회사 몫을 떼고(적자는 회사가 진다), 인디는 비용을 먼저 냈으니 티켓값이 그대로 들어온다
    const rev = d.sold * SOLO_TICKET * 0.9 * coldPayM(s, 'solo'); // v237: 업계 냉대 — 들어오는 돈이 적다
    d.pay = signed ? Math.round(Math.max(0, rev - V.cost) * (1 - cut)) : Math.round(rev);
    d.net = signed ? d.pay : Math.round(rev - (d.cost != null ? d.cost : V.cost));
    if (d.pay > 0) earn(s, d.pay, '단독 공연', 'solo');
    d.mk = mk; d.gain = Math.round(Math.max(0, d.sold * (d.heat - 50) / 40) * myRoom(s, mk)); s.fans[mk] += d.gain;
    // v235: 객석을 절반도 못 채우면 열기와 상관없이 대중 호감도가 크게 떨어지고(-3~-5), 스트레스가 크게 오른다 (보통 +8 → +22)
    d.empty = d.fill < 0.5;
    d.pop = jpopAdd(s, 'solo', d.empty ? -U.fl(3, 5) : d.heat >= 82 ? U.fl(3, 5) : d.heat >= 67 ? U.fl(1.5, 3) : d.heat >= 52 ? 0.8 : -0.5);
    t.liveN = (t.liveN || 0) + 1; t.liveT = s.t + SOLO_LIVE_GAP;
    practice(s, p, soloMain(t), 2, 1); addStress(s, d.empty ? 22 : 8);
    addWork(s, { type: '단독 공연', title: V.n, by: actName(s, 'solo'), sc: d.heat, pay: d.pay || 0, note: `관객 ${d.sold.toLocaleString()}명 · ${soloHeatW(d.heat)}` });
    if (t.liveN === 1) milestone(s, `${age(s)}세에 ${V.n}에서 첫 단독 공연을 열었다.`);
    const z = (perf - 45) / 18;
    d.live = liveStage({ k: 'solo', c: s.trend, mic: 1, key: true, place: V.n, ph: SOLO_VENUE.indexOf(V) <= 1 ? 'soloclub' : SOLO_VENUE.indexOf(V) <= 3 ? 'solohall' : 'concert', t: '단독 공연', g: actName(s, 'solo'), cn: actCall(s, 'solo'), mem: [[actCall(s, 'solo'), '']], mi: 0, z: { perf: z, me: z, q: (d.heat - 57) / 20, fans: d.fill * 2 - 1, star: (p.tal.star - 50) / 25 }, sc: d.heat, wins: 0, cand: 0, debut: false }); // v228: 후렴 반응(q)은 공연 열기를 따라간다 (예전엔 값이 없어 열기가 낮아도 늘 '좋다!'였다)
  },
  text: (s, d) => { const t = s.tracks.solo, fl = [d.net > 0 ? `공연 수익 +${fmtWon(d.net)}` : d.net < 0 ? `공연 적자 ${fmtWon(-d.net)}` : '', soloFxLine(d)].filter(Boolean).join(' · '); return `${d.vn} 단독 공연을 마쳤다. 관객 ${d.sold.toLocaleString()}명${d.fill >= 0.98 ? ' · 매진' : ` (${d.seat.toLocaleString()}석 가운데 ${Math.round(d.fill * 100)}%)`}. ${soloHeatW(d.heat)}.${d.empty ? '\n\n객석이 절반도 차지 않았다. 빈자리가 자꾸 눈에 밟힌다.' : ''}${fl || d.empty ? `\n\n${[fl, d.empty ? '스트레스 ↑↑' : ''].filter(Boolean).join(' · ')}` : ''}`; },
  ch: (s, d) => [{ t: '확인', f: () => `${d.vn}에서 단독 공연을 했다. 관객 ${d.sold.toLocaleString()}명, ${soloHeatW(d.heat)}.${d.empty ? ' 객석이 절반도 차지 않아 마음이 무겁다.' : ''}` }],
});

// 매달: 켜 둔 일 · 고정 예능 · 매니저 · 트레이너 특훈 (연습생 · 데뷔 뒤 모두)
function idolWaysMonth(s, t) {
  const p = me(s), act = t.st === 'active';
  if (idolWayHas(t, 'act') && has(p, 'acting')) {
    practice(s, p, 'acting', 0.7); addStress(s, 0.8);
    if (act && lv(p, 'acting') >= 25 && !hasQ(s, 'idol_act_offer') && U.chance((0.015 + lv(p, 'acting') / 4000) * coldOfferM(s, 'idol'))) queueEv(s, 'idol_act_offer', 0);
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
  cond: s => idTr(s) && idT(s).kind !== 'solo' && idT(s).months >= 3 && !idT(s).team,
  init(s, d) {
    const t = idT(s), p = me(s), L = typeof coTeamPeople === 'function' ? coTeamPeople(s, t.ag + '#tr') : [];
    const ks = ['vocal', 'dance', 'rap'].filter(k => has(p, k)).sort((a, b) => lv(p, a) - lv(p, b));
    d.k = ks[0] || 'vocal';
    const want = { vocal: '보컬', dance: '댄스', rap: '랩' }[d.k], x = L.find(y => (y.job || '').includes(want)) || L[1] || L[0];
    if (!x) { d.skip = true; return; }
    d.tr = x.id; meetAt(s, x, `${t.agN} 연습생`, 'idol');
  },
  text: (s, d) => { const t = idT(s), x = s.people[d.tr]; return `월말 평가가 끝나고 ${x.job} ${josa(x.name, '이가')} 따로 불렀다. 최근 평가 ${t.rank || '-'}위(${t.pool}명 중).\n\n"${josa(SKILLS[d.k].n, '이가')} 몇 달째 제자리야. 이대로면 데뷔조는 어려워."`; },
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
  text: (s, d) => { const t = idT(s); return `녹음실에서 ${josa(d.n, '이가')} 녹음을 멈췄다. "${josa(t.pos.split(' · ')[0], '이가')} 이 정도밖에 안 돼? 다시."\n\n몇 번을 다시 불러도 고개를 젓는다. 부스 밖에서 멤버들이 내 눈치를 본다.`; },
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
  text: (s, d) => { const x = s.people[d.x]; return d.v > 0 ? `다음 앨범 파트 분배표가 나왔다. 내 파트가 눈에 띄게 늘었다.\n\n${x.name}: "지난번에 밤늦게까지 남아서 연습하던 거 봤어. 이번엔 네가 이 부분 맡아."` : `다음 앨범 파트 분배표가 나왔다. 내 파트가 줄었다. 후렴 한 줄이 다른 멤버에게 넘어갔다.\n\n녹음실에서 ${josa(x.name, '은는')} 나와 눈을 마주치지 않는다.`; },
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
      if (!trackOn(s, 'solo') && (lv(me(s), 'vocal') >= 35 || lv(me(s), 'rap') >= 35) && !s.inbox.some(m => m.kind === 'idol_solo')) { if (sendMsg(s, 'idol_solo', { from: t.agN, title: '솔로 데뷔 제안', months: 8, d: {} })) r += ' 회사에서도 솔로 이야기가 나왔다.'; }
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
// ⑬ 직캠 화제 (활동기, 라이브온): 크게 뜨는 '화제의 중심'과 따로, 내 직캠 하나가 퍼진다
E({
  id: 'idol_fancam', cat: '화제', title: '직캠 화제', tag: 'career', cd: 8,
  p: s => idOn(s) && idT(s).promo > 0 ? 0.02 * boomStatMult(boomStageS(s, idT(s)), 40) : 0,
  cond: s => idOn(s) && idT(s).promo > 0,
  init(s, d) {
    const t = idT(s), g = t.g, gm = idMain(t), w = s.works.filter(x => x.by === g.name).slice(-1)[0];
    d.song = w ? w.title : '데뷔곡'; d.sc = Math.round(U.clamp(55 + (boomStageS(s, t) - 35) * 1.2 + U.normal(0, 6), 40, 98)); d.vw = Math.round(Math.pow(10, 3.6 + d.sc / 30) * PL_VW); // v159: 라이브온 조회수와 같게 (PL_VW)
    d.my = Math.round((600 + groupFans(g) * 0.004) * U.clamp((d.sc - 40) / 30, 0.2, 2) * popSpeed(s) * myRoom(s, gm)); d.gf = Math.round(d.my * 0.6);
    s.fans[gm] += d.my; g.f[gm] = Math.min(FANCAP[gm], g.f[gm] + d.gf);
  },
  plio: (s, d) => d.pl || (d.pl = plioSpec({ k: 'stage', t: `${idT(s).g.name} ${actName(s, 'idol')} 직캠 「${d.song}」`, ch: `${PF.video.n} 직캠`, me: actName(s, 'idol'), sc: d.sc, rv: d.sc >= 75 ? 2 : 1, vw: d.vw / PL_VW, sx: liveSx([me(s)]) })),
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

// ═════════ v158 밸런스: 해체 · 재계약 · 이적 ═════════
// 들어가기는 어렵고 버티기는 너무 쉬웠다 (자동 플레이 300명: 첫 계약 7년 안에 끝나는 그룹 1%, 10년 넘게 가는 그룹 73%).
// 회사 평가: 넷째 앨범부터(v159, 예전 셋째), 최근 두 앨범 점수 평균이 회사 기대에 못 미치면 회사가 해체를 꺼낸다 (숨은 값).
// 소형 회사는 기대가 낮아도 참을성이 적고, 대형 회사는 기대가 높아도 오래 기다려 준다 → 첫 계약 안에 소형 절반 · 중형 15% · 대형 5%쯤 끝난다
const IDOL_BAR = [0, 58, 62, 74], IDOL_CUT_P = [0, 0.2, 0.2, 0.15];
// music.js idolRelease에서 앨범을 낼 때마다 부른다
function idolReview(s, t, sc, debut) {
  t.scs = (t.scs || []).concat(Math.round(sc)).slice(-2);
  if (debut || !t.g || hasQ(s, 'idol_disband')) return;
  const bar = IDOL_BAR[t.tier] || 60;
  // 설득해서 얻은 마지막 기회: 이번 앨범 하나로 정해진다
  if (t.lastCh) {
    t.lastCh = false;
    if (sc < bar) queueEv(s, 'idol_disband', 3, { last: true });
    else addLog(s, `마지막 기회라던 앨범이 기대를 넘겼다. 「${t.g.name}」 활동이 이어진다.`, 'career');
    return;
  }
  // v159: 넷째 앨범부터 보고, 활동이 끝나고 한 달 더 지나서 꺼낸다 (예전: 셋째 앨범 · 두 달 뒤 — 너무 빨랐다)
  if (t.cbCount >= 4 && t.scs.length === 2 && (t.scs[0] + t.scs[1]) / 2 < bar && U.chance(IDOL_CUT_P[t.tier] || 0.2)) queueEv(s, 'idol_disband', 3);
}
// 그룹이 끝나면 (해체 · 재계약 불발 · 재계약 안 함) 다른 회사에서 제안이 올 수 있다: 새 그룹으로 다시 데뷔(26세까지) · 솔로 계약
function idolMoveOffers(s) {
  const t = s.tracks.idol, p = me(s), a = age(s), mf = s.fans.kr + s.fans.jp + s.fans.us, jt = jobTier(s, 'idol');
  // 아직 다른 계약에 묶여 있으면 (그룹과 같이 하던 솔로 계약 · 배우 소속사 · 내 회사) 제안이 오지 않는다
  if (trackOn(s, 'agency') || agencyContract(s) || (trackOn(s, 'solo') && s.tracks.solo.st === 'signed')) return [];
  // 내 팬 · 등급이 클수록 큰 회사에서 연락이 온다
  const top = mf >= 3e5 || jt >= 4 ? 3 : mf >= 4e4 || jt >= 2 ? 2 : 1;
  const P = AGENCIES.filter(x => x.kind === 'music' && x.id !== t.ag && !x.soloOnly && x.mkt !== 'us' && x.tier <= top && (x.mkt !== 'jp' || lv(p, 'jp') >= (x.needJp || 0)));
  const near = L => L.filter(x => x.tier >= top - 1), out = [];
  if (a <= 26 && U.chance(0.25 + top * 0.1)) { const L = near(P); if (L.length) out.push({ ag: U.pick(L).id, k: 'group' }); }
  if (!trackOn(s, 'solo') && (has(p, 'vocal') || has(p, 'rap')) && U.chance(0.15 + top * 0.15)) { const L = near(P).filter(x => !out.some(o => o.ag === x.id)); if (L.length) out.push({ ag: U.pick(L).id, k: 'solo', type: bestSoloType(s) }); }
  return out;
}
function idolMoveQ(s) {
  const o = idolMoveOffers(s);
  if (o.length) queueEv(s, 'idol_move', 1, { o });
}
E({
  id: 'idol_move', cat: '이적', title: '다른 회사의 제안', tag: 'career', bg: 'meeting',
  cond: s => s.tracks.idol.st === 'ended',
  text: (s, d) => `그룹 활동이 끝났다는 기사가 난 뒤로 다른 회사에서 연락이 왔다.\n\n` + d.o.map(o => `· ${AG[o.ag].n} (${TIER_N[AG[o.ag].tier]} 기획사) — ${o.k === 'group' ? '새 그룹으로 다시 데뷔하자고 한다' : `솔로 ${josa(soloTypeN(o.type), '으로')} 계약하자고 한다`}`).join('\n'),
  ch: (s, d) => d.o.map(o => {
    const ag = AG[o.ag], why = contractWhy(s);
    if (o.k === 'group') return { t: `${ag.n}의 새 그룹으로 다시 데뷔한다`, ok: s => !agencyContract(s) && !trackOn(s, 'agency'), h: why || `숙소에 들어가 석 달쯤 데뷔 준비 · 그룹 계약 5년 · 회사 몫 ${pctN(idolRedebutCut(ag))}`, f: s => idolRedebut(s, o.ag) };
    return { t: `${josa(ag.n, '과와')} 솔로 계약을 한다`, ok: s => !agencyContract(s) && !trackOn(s, 'agency') && !trackOn(s, 'solo'), h: why || '계약 조건은 협상할 수 있다', f: s => soloNego(s, o.ag, o.type || bestSoloType(s), 0.4) };
  }).concat([{ t: '지금은 쉬면서 생각한다', f: () => '제안은 고맙게 듣고, 당분간은 쉬면서 생각하기로 했다.' }]),
});
function idolRedebutCut(ag) { return Math.max(0.3, Math.round((ag.cut - 0.05) * 100) / 100); }
// 다시 데뷔: 데뷔조로 바로 들어가 석 달 뒤 새 그룹으로 데뷔한다 (연습생 평가 · 방출 없이)
function idolRedebut(s, agId) {
  const ag = AG[agId], old = s.tracks.idol;
  s.tracks.idol = { st: 'trainee', kind: 'idol', part: null, ag: agId, agN: ag.n, tier: ag.tier, cut: idolRedebutCut(ag), gMonths: 60, mkt: ag.mkt, months: 0, cEnd: 999, fails: 0, rank: 1, pool: U.int(18, 30), team: true, prep: 3, debt: 0, hist: old.hist || [], sn: old.sn, redeb: true };
  milestone(s, `${age(s)}세에 ${ag.n}에서 새 그룹으로 다시 데뷔하기로 했다.`);
  return `${ag.n}에서 새 그룹으로 다시 데뷔하기로 했다. 숙소에 들어가 석 달쯤 데뷔 준비를 한다. (그룹 계약 5년 · 회사 몫 ${pctN(s.tracks.idol.cut)})`;
}
// 재계약: 전원이 남거나, 몇 명만 남아 줄어든 채로 계속하거나, 해체된다
// pc: 그룹이 이어질 가능성 (그룹 팬 40만 명쯤이면 반반) · pa: 그중 전원이 남을 가능성 (그룹이 클수록)
// v192: 평균 30세가 넘으면 그룹이 이어질 가능성이 크게 준다 · 30세가 넘은 멤버가 있을수록 전원이 남기 어렵다
function idolRenewP(s, t) {
  const ga = groupAges(s, t.g), L = Math.log10(1 + groupFans(t.g)), rn = idolRnOf(t), n30 = idMem(s, t).filter(x => pAge(s, x) >= 30).length;
  const am = ga.avg <= 28 ? 1 : ga.avg <= 30 ? 1 - (ga.avg - 28) * 0.15 : Math.max(0.08, 0.7 - (ga.avg - 30) * 0.2);
  const pc = U.clamp(U.sig((L - 5.6) * 2) * am + rn.p, 0.05, 0.9);
  return { pc, pa: pc * U.clamp(0.3 + 0.5 * U.sig((L - 6) * 2), 0.3, 0.8) * Math.pow(0.6, n30) };
}
// v192: 몇 명만 남을 때 누가 떠나는가: 나이가 많을수록 · 그룹 안에서 실력이 높을수록 떠나기 쉽다 (music.js idolStayP)
function idolLeavers(s, t, M, k) {
  const all = M.concat([me(s)]), avgPw = all.reduce((a, x) => a + idolMemPow(x), 0) / all.length, fans = groupFans(t.g);
  const W = M.map(x => ({ x, w: 1.05 - idolStayP(pAge(s, x), idolMemPow(x), avgPw, fans) })), out = [];
  while (out.length < k && W.length) { let r = Math.random() * W.reduce((a, o) => a + o.w, 0), i = 0; while (i < W.length - 1 && (r -= W[i].w) > 0) i++; out.push(W.splice(i, 1)[0].x); }
  return out;
}
function idolRenew(s, t, pa, pc, cut1) {
  const g = t.g, r = Math.random(), M = idMem(s, t), c0 = t.cut;
  t.rn = null;
  if (r < pa || (r < pc && !M.length)) {
    t.contract += 48; t.cut = cut1;
    milestone(s, `${age(s)}세에 「${g.name}」 멤버 전원이 재계약했다.`);
    return `멤버 전원 재계약! 그룹이 계속된다. 회사 몫 ${pctN(c0)} → ${pctN(t.cut)}, 계약 ${ymLater(s, Math.max(0, t.contract - t.months))}까지.` + fx(s, { stress: -10 });
  }
  if (r < pc && M.length >= 2) {
    // 몇 명만 남는다: 떠난 멤버 몫만큼 팬이 떠나고, 파트를 다시 나누느라 팀워크가 흔들린다
    const k = U.int(1, Math.max(1, Math.floor(M.length / 2))), out = idolLeavers(s, t, M, k);
    for (const x of out) { x.rel = '전 멤버'; g.members = g.members.filter(id => id !== x.id); delete g.pos[x.id]; bond(s, x, 2); }
    const keep = 1 - 0.5 * k / (M.length + 1);
    MK.forEach(m => { g.f[m] = Math.round(g.f[m] * keep); });
    twAdd(g, -10);
    g.pos = assignIdolPos(s, [s.me].concat(g.members)); t.pos = g.pos[s.me];
    t.contract += 48; t.cut = cut1;
    const nm = out.map(x => x.name).join(', ');
    milestone(s, `${age(s)}세에 「${g.name}」 ${g.members.length + 1}명이 재계약했다.`);
    return `${josa(nm, '은는')} 재계약하지 않고 떠났다. 「${g.name}」 ${g.members.length + 1}명이 남아 계속한다. 그룹 팬 ${Math.round((1 - keep) * 100)}%쯤이 함께 떠났다. 파트를 다시 나눴다 — 내 포지션은 ${t.pos}.\n\n회사 몫 ${pctN(c0)} → ${pctN(t.cut)}, 계약 ${ymLater(s, Math.max(0, t.contract - t.months))}까지.` + fx(s, { stress: 4 });
  }
  endGroup(s, '계약 만료로 해체'); idolMoveQ(s);
  return '멤버 절반 넘게 떠나기로 했다. 그룹은 사실상 해체됐다.' + fx(s, { stress: 6 });
}
// ───── v222: 솔로 연습생 · 데뷔 갈래 ─────
// 기획사 솔로 오디션에 붙으면 아이돌 연습생과 같은 틀(idol 트랙, kind 'solo', stype = 솔로 유형)로 들어간다. 데뷔조는 없고, 실력이 차면 회사가 솔로 데뷔를 정한다 (music.js idolTraineeMonth)
// 갈래: 아이돌 연습생에게 솔로 데뷔를 권하기도 하고(idol_tosolo), 솔로 연습생에게 그룹 데뷔조 자리를 권하기도 한다(solo_togroup)
function idolIsSoloTr(s) { const t = s && s.tracks && s.tracks.idol; return !!t && t.kind === 'solo' && t.st === 'trainee'; }
function soloTypeAs(type) { const n = soloTypeN(type); return n + josa(n, '으로').slice(n.length); }
// 연습생을 마치고 같은 회사에서 솔로로 데뷔한다. 쌓인 트레이닝 비용은 솔로 정산에서 먼저 갚는다 (billPay)
function soloDebutFromTr(s, type) {
  const t = s.tracks.idol, ag = t.ag, debt = t.debt || 0, months = t.kind === 'solo' ? t.gMonths || 60 : Math.min(t.gMonths || 60, 60), cut = t.cut;
  for (const n of people(s, n => n.rel === '동기' && n.trainee === t.ag)) { n.rel = '친구'; n.trainee = null; }
  t.st = 'ended'; t.endNote = `${t.agN} 연습생 (솔로 데뷔)`; t.hist.push(t.endNote);
  const r = startSoloSigned(s, ag, { type, months, cut });
  s.tracks.solo.debt = debt; s.tracks.solo.fromTr = true;
  milestone(s, `${age(s)}세에 연습생을 마치고 솔로 ${soloTypeAs(type)} 데뷔했다.`);
  return r || '';
}
E({
  id: 'solo_trdebut', cat: '데뷔', title: '솔로 데뷔 확정', tag: 'career', keepPop: true,
  cond: s => idolIsSoloTr(s),
  text: s => { const t = s.tracks.idol; return `${t.agN}에서 나를 불렀다. "이제 혼자 무대에 세워도 되겠다."\n\n솔로 ${soloTypeAs(t.stype)} 데뷔가 정해졌다. (연습생 ${yrsMo(t.months)} · 최근 평가 ${t.rank}위)${t.debt > 0 ? ` 그동안 쌓인 트레이닝 비용 ${fmtWon(t.debt)}은 음반 · 음원 정산에서 먼저 갚는다.` : ''}`; },
  ch: () => [{ t: '드디어 데뷔다', f: s => soloDebutFromTr(s, s.tracks.idol.stype || bestSoloType(s)) + fx(s, { stress: -6 }) }],
});
E({
  id: 'idol_tosolo', cat: '연습생', title: '솔로 데뷔 제안', tag: 'career',
  cond: s => idTr(s) && idT(s).kind === 'idol' && !idT(s).team,
  init(s, d) { d.type = bestSoloType(s); },
  text: (s, d) => { const t = s.tracks.idol; return `${t.agN} 신인개발팀에서 따로 불렀다. "그룹 데뷔조에는 자리가 잘 안 맞는데, 혼자서는 충분히 설 수 있을 것 같아. 솔로 ${soloTypeAs(d.type)} 데뷔해 볼래?"\n\n받으면 연습생을 마치고 곧바로 솔로 데뷔 준비에 들어간다.`; },
  ch: (s, d) => [
    { t: '솔로로 데뷔한다', f: s => soloDebutFromTr(s, d.type) },
    { t: '그룹 데뷔를 기다린다', h: '1년 뒤에 다시 이야기할 수 있다', f: s => { s.tracks.idol.soloAsk = s.t + 12; return '솔로 제안을 사양하고 그룹 데뷔를 기다리기로 했다.'; } },
  ],
});
E({
  id: 'solo_togroup', cat: '연습생', title: '그룹 데뷔조 제안', tag: 'career',
  cond: s => idolIsSoloTr(s) && !married(s),
  text: s => { const t = s.tracks.idol; return `${t.agN}에서 새 그룹 데뷔조를 꾸리는데 한 자리가 비었다고 한다. "솔로 데뷔가 계속 미뤄지고 있잖아. 네 얼굴이면 그룹에서도 바로 눈에 띌 거야. 그룹으로 먼저 데뷔해 보지 않을래?"\n\n받으면 데뷔조에 들어가 반년쯤 준비한 뒤 그룹으로 데뷔한다. 계약도 그룹 전속 계약(${yrs(84)})으로 바뀐다.`; },
  ch: () => [
    { t: '데뷔조에 들어간다', h: '데뷔조에서 빠지게 되면 다시 솔로 준비로 돌아온다', f: s => { const t = s.tracks.idol; t.kind = 'idol'; t.wasSolo = true; t.gMonths = Math.max(t.gMonths || 0, 84); t.team = true; t.prep = 0; t.seatLost = false; t.seatQ = false; return '솔로 준비를 접고 그룹 데뷔조에 들어갔다!' + fx(s, { stress: -4 }); } },
    { t: '솔로 준비를 계속한다', h: '한동안 다시 권하지 않는다', f: s => { s.tracks.idol.grpAsk = s.t + 18; return '그룹 제안을 사양하고 솔로 준비를 계속하기로 했다.'; } },
  ],
});
