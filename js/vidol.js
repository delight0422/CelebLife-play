'use strict';
// ════════ 버츄얼 아이돌 (6-2단계) ════════
// 버츄얼 아이돌 기획사(AGENCIES kind 'vtuber', 이름은 인생마다 CO_POOL에서 바뀐다)에 들어가는 회사 소속 버튜버
// 오디션 합격 → 데뷔 준비(회사가 아바타를 만들고 방송 연습, 같은 기수 동기 4명이 다 모일 때까지) → 동기들과 함께 데뷔 (새 아바타로 다시 태어나는 '환생')
// 데뷔 뒤에는 인터넷 방송이 중심: 개인 방송 · 동기·선배와 합방 · 노래(커버·오리지널) · 3D 데뷔·라이브 · 굿즈 · 후원·멤버십
// 회사가 정하는 일(3D 데뷔·오리지널 곡·기념 방송·3D 라이브·연말 평가)은 알림으로 온다. 내가 골라서 하는 방송(커버곡·내구 방송)은 🎭 활동 지원
// 개인세 버튜버는 지금처럼 스트리머 직업(mode 'vt')에 있다. 회사를 나와 개인세가 되면 다시 환생해 스트리머 직업으로 돌아간다

const VI_TIERS = ['신인 버츄얼 아이돌', '주목받는 버츄얼 아이돌', '인기 버츄얼 아이돌', '간판 버츄얼 아이돌', '톱 버츄얼 아이돌', '버츄얼 아이돌 스타', '전설의 버츄얼 아이돌'];
// 등급 문턱: 가장 많을 때 구독자 (지금 아바타 기준). 맨 위 두 등급은 3D 라이브를 연 적이 있어야 한다
// v99 (8-5): 아티스트는 모두 맨 위 등급에 스타성을 본다. 전설의 버츄얼 아이돌은 스타성 48 이상
const VI_UP = { subs: [0, 1e4, 4e4, 15e4, 40e4, 100e4, 160e4], live: 5, star: 48 };
// 회사 크기별: 회사가 만들어 주는 아바타(VT_AV 번호), 회사가 3D 데뷔를 정하는 구독자, 동기 수
const VI_AV = [0, 2, 3, 3];
const VI_3D = [0, 15e4, 8e4, 5e4];
const VI_LIVE = 20e4;
// 회사 편집팀(클립·썸네일)과 회사 크기가 보태는 매력
const VI_CORP = { edit: 4, tier: 3, av: 3, d3: 4 };
// 구독자가 닿을 수 있는 높이는 시장 크기에 가까울수록 잘 안 오른다 (한국 200만, 일본 400만을 넘지 못한다)
const VI_CAP = { kr: 200e4, jp: 400e4 };

function viT(s) { return s.tracks.vidol; }
function viOn(s) { return trackOn(s, 'vidol'); }
function viAgOf(t) { return AG[t.corp] || { tier: 1, n: t.corpN || '', mkt: 'kr' }; }
function viPeople(s, ids) { return (ids || []).map(id => s.people[id]).filter(p => p && p.alive && p.vi); }
function viMates(s, t) { return viPeople(s, t.mates); }
function viSeniors(s, t) { return viPeople(s, t.seniors); }
function viName(x) { return x.vi ? x.vi.given : x.name; }
// 내 방송의 매력 (스트리머 ytAppeal과 같은 눈금): 내 특기 · 재능 + 회사 편집팀 + 아바타 + 회사 크기 + 3D + 스타성 + 유행
// v95: 예능 · 노래 · 랩 중 잘하는 쪽 · 목소리(강함, 가산점), 끈기(보통, 가산점). 외모는 보지 않는다. 편집은 회사 편집팀이 맡는다
// v100: 고른 방송 컨셉을 스트리머처럼 라이브온 분야 표(YT_FIT, 8-4)대로 더 본다 (게임 방송은 게임, ASMR은 목소리 · 음감 …)
//   분야 특기는 섞고(하나면 강함, 둘이면 보통씩), 분야 재능은 가산점(하나면 강함, 둘이면 보통씩). 영상 편집은 회사 편집팀이 맡아서 뺀다
//   v99의 '노래 · 랩 · 게임 중 가장 잘하는 것'은 되돌렸다 (게임은 게임 방송일 때 분야로 들어간다)
function viSk(s, c) {
  const p = me(s), F = YT_FIT[c] || [], w = F.length > 1 ? JM_ : JS_;
  return jobMix([[lv(p, 'variety'), JS_], [Math.max(lv(p, 'vocal'), lv(p, 'rap')), JS_]].concat(F.filter(k => !TALENT_BY[k] && k !== 'edit').map(k => [lv(p, k), w])))
    + F.filter(k => TALENT_BY[k]).reduce((a, k) => a + talB(p.tal[k], F.length === 1), 0) + talB(p.tal.voice, true) + talB(p.tal.grit, false);
}
// 방송 컨셉 고르는 창: 나한테 잘 맞는 컨셉부터
function viCatSort(s) { return ytCats(true).map((c, i) => [c, viSk(s, c), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(x => x[0]); }
function viAppeal(s, t) {
  const p = me(s), C = VI_CORP;
  const sk = viSk(s, t.cat || '게임 방송');
  return sk * 0.8 - (s.stigma || 0) * 0.25 + C.edit + avQ(t) * C.av + viAgOf(t).tier * C.tier + (t.d3 ? C.d3 : 0) + (p.tal.star - 50) * 0.3 + (s.trendTV.yt === '버튜버' ? 6 : 0);
}
function viTarget(ap, jp) { const raw = Math.pow(10, (ap + YT_REACH) / 16), cap = jp ? VI_CAP.jp : VI_CAP.kr; return raw / (1 + raw / cap); }

// ───── 동기·선배 (업계 사람) ─────
// 같은 회사 버츄얼 아이돌. x.vi = { given: RP 이름, ch: 채널, ag, gen, subs, ap: 매력, d3 }
function viMakeNpc(s, ag, gen, senior) {
  const x = makeIndustry(s, '버튜버', { age: senior ? U.int(21, 32) : U.int(17, 26), aff: senior ? 40 : 50 });
  const given = vtRpName(x.g);
  const sk = lv(x, 'variety') * 0.65 + lv(x, 'vocal') * 0.35, C = VI_CORP;
  const ap = sk * 0.8 + C.edit + VI_AV[ag.tier] * C.av + ag.tier * C.tier + (x.tal.star - 50) * 0.3 + U.normal(0, 4) + (senior ? C.d3 : 0);
  const subs = senior ? Math.round(viTarget(ap, ag.mkt === 'jp') * U.fl(0.5, 1)) : 0;
  x.vi = { given, ch: given, ag: ag.id, gen, subs, ap, d3: !!senior && subs >= VI_3D[ag.tier] };
  (s.usedNames = s.usedNames || []).push(given);
  return x;
}
function viMateMonth(s, x) {
  const v = x.vi, tg = viTarget(v.ap + (v.d3 ? VI_CORP.d3 : 0), (AG[v.ag] || {}).mkt === 'jp');
  if (v.subs < tg) v.subs += Math.round((tg - v.subs) * U.fl(0.02, 0.06) * 1.6 + U.int(3, 20));
  else v.subs = Math.round(v.subs * U.fl(0.99, 1));
  if (!v.d3 && v.subs >= VI_3D[(AG[v.ag] || { tier: 1 }).tier]) v.d3 = true;
}
// 회사의 기수: 내가 14세(버튜버 지원을 할 수 있게 되는 나이)일 때 회사마다 이미 몇 기가 있고(큰 회사일수록 많다),
// 그 뒤로 해마다 1.0~1.4기씩 데뷔한다. 늦게 들어갈수록 기수 번호가 크고 선배가 많다
const VI_GEN_N = 4;   // 한 기수 인원 (나 포함). 동기가 다 모여야 데뷔한다
function viCoInfo(s, ag) {
  const F = s.flags.viCo = s.flags.viCo || {};
  return F[ag.id] = F[ag.id] || { g0: U.int(1, 2) + ag.tier - 1, rate: 0.8 + ag.tier * 0.2 };
}
function viCoGen(s, ag) { const c = viCoInfo(s, ag); return c.g0 + Math.floor(Math.max(0, age(s) - 14) * c.rate); }
// 지금 활동 중인 선배 수: 기수마다 3~4명, 오래된 기수일수록 졸업한 사람이 많다
function viSeniorN(s, ag, gen) {
  const c = viCoInfo(s, ag); let n = 0;
  for (let k = 1; k < gen; k++) n += 3.5 * Math.max(0.2, 1 - (gen - k) / c.rate * 0.06);
  return Math.round(n);
}
// 기수 안 순위: 나와 동기들의 구독자 (1위부터)
function viRank(s, t) { const L = viMates(s, t).map(x => x.vi.subs).concat(t.subs).sort((a, b) => b - a); return { r: L.indexOf(t.subs) + 1, n: L.length }; }

// ───── 오디션 · 계약 ─────
// 아직 채널이 없거나, 개인세로 활동 중인 버튜버만 낼 수 있다 (템퍼링으로 퇴출되면 버튜버 지원은 모두 사라진다)
// 개인세 버튜버가 붙으면 회사 아바타로 다시 데뷔하고, 지금 채널 구독자 일부가 따라온다. 구독자가 많을수록 붙기 쉽다
function viAudOK(s) { return !s.flags.vtBan && !viOn(s) && ((!trackOn(s, 'youtube') && age(s) >= 14) || vtSolo(s)); }
for (const ag of vtAgencies()) JOB_APPLY.push({
  id: 'vidol_aud_' + ag.id, trk: 'vidol', g: '🎙️ 버츄얼 아이돌', get n() { return `${ag.n} 오디션`; }, tag: agTag(ag),
  show: s => viAudOK(s),
  h: s => `합격 가능성 ${fmtPct(vtAudP(s, ag))} · ${vtSolo(s) ? `붙으면 회사 아바타로 다시 데뷔 · 「${s.tracks.youtube.ch}」 구독자는 일부만 따라온다` : '아바타와 데뷔 준비는 회사가 맡는다'}`,
  ok: s => !ytBlock(s) && !agencyContract(s) && !(s.cd['vaud_' + ag.id] > s.t) && !hasQ(s, 'vi_aud') && (!ag.needJp || lv(me(s), 'jp') >= ag.needJp),
  why: s => ytBlock(s) || contractWhy(s) || (s.cd['vaud_' + ag.id] > s.t ? '같은 회사는 1년 뒤에 다시 볼 수 있다' : hasQ(s, 'vi_aud') ? '다른 오디션 결과를 기다리는 중' : '일본어를 더 배워야 한다'),
  run: s => { s.cd['vaud_' + ag.id] = s.t + 12; queueEv(s, 'vi_aud', 1, { ag: ag.id, p: vtAudP(s, ag) }); return `${ag.n} 버츄얼 아이돌 오디션에 지원했다.`; },
});
E({
  id: 'vi_aud', cat: '오디션', title: '버츄얼 아이돌 오디션 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); },
  text: (s, d) => d.pass ? `${AG[d.ag].n}에서 합격 연락이 왔다! 회사가 아바타를 만들어 주고, 같은 기수 동기들과 함께 데뷔한다.` : `${AG[d.ag].n}에서 연락이 오지 않았다.`,
  ch: (s, d) => d.pass ? [
    { t: '계약서를 받아 본다', ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '정산 비율과 계약 기간을 협상할 수 있다', f: s => startNego(s, { kind: 'vidol', ag: d.ag, agN: AG[d.ag].n, months: 48, cut: AG[d.ag].cut, lev: U.clamp((d.p - 0.5) * 0.8 + 0.3, 0.05, 0.8) }) },
    { t: '거절한다', f: () => `${AG[d.ag].n}의 제안을 거절했다.` },
  ] : [{ t: '확인', f: s => `${AG[d.ag].n} 버츄얼 아이돌 오디션에 떨어졌다.` + fx(s, { stress: 3 * pm(s, 'loseStress') }) }],
});
NEGO.vidol = {
  what: d => '버츄얼 아이돌 전속 계약이다. 회사가 아바타를 만들어 주고, 같은 기수 동기들과 함께 데뷔한다.',
  block: s => agencyContract(s) ? contractWhy(s) : '',
  sign: (s, d) => viStart(s, d.ag, d.cut, d.months, 0),
  refuse: (s, d) => `${d.agN}의 버츄얼 아이돌 계약 제안을 거절했다.`,
};
// 회사에 들어가 데뷔 준비를 시작한다. carry: 따라오는 구독자 (개인세 채널·이적)
function viStart(s, agId, cut, months, carry) {
  const ag = AG[agId], y = s.tracks.youtube, old = s.tracks.vidol;
  let note = '';
  if (vtSolo(s)) {
    carry += Math.round(y.subs * VT_CARRY);
    y.st = 'ended'; y.endNote = `개인세 버튜버 「${y.ch}」 · 가장 많을 때 구독자 ${fmtFans(y.peak || y.subs)}`; y.hist = (y.hist || []).concat(y.endNote);
    milestone(s, `${age(s)}세에 개인세 채널 「${y.ch}」을 정리하고 ${ag.n}에 들어갔다.`);
    note = ` 개인세 채널 「${y.ch}」은 정리했다.`;
  }
  s.flags.viGen = s.flags.viGen || {};
  const gen = s.flags.viGen[agId] = Math.max(viCoGen(s, ag), s.flags.viGen[agId] || 0) + 1;
  const t = s.tracks.vidol = { st: 'prep', corp: agId, corpN: ag.n, cut, contract: months, months: 0, prepM: 0, left: 3, gen, av: VI_AV[ag.tier], d3: false, tier: old.tier || 0, lives: old.lives || 0, songs: 0, subs: 0, peak: 0, carry, mates: [], seniors: [], seniorN: viSeniorN(s, ag, gen), jp: ag.mkt === 'jp', sn: null, hist: old.hist || [] };
  // 먼저 붙어서 기다리던 동기가 있을 수 있다
  for (let i = U.int(0, 2); i > 0; i--) viAddMate(s, t, true);
  return `${ag.n} ${gen}기 버츄얼 아이돌로 데뷔를 준비하게 됐다. (${yrs(months)} · 회사 몫 ${pctN(cut)})` + note + ` ${viMateLine(s, t)}`;
}
// 데뷔 준비 중에 동기가 한 명씩 들어온다. 큰 회사일수록 오디션 지원자가 많아 빨리 모인다
function viAddMate(s, t, quiet) {
  const x = viMakeNpc(s, viAgOf(t), t.gen, false);
  t.mates.push(x.id); meetAt(s, x, `${t.corpN} ${t.gen}기 데뷔 준비`, 'vidol', t.corpN);
  if (!quiet) addLog(s, `${t.corpN} ${t.gen}기 동기 ${josa(x.name, '이가')} 들어왔다. (${t.mates.length + 1}/${VI_GEN_N}명)`, 'career');
}
function viMateLine(s, t) { const n = t.mates.length + 1; return n >= VI_GEN_N ? `${t.gen}기 ${VI_GEN_N}명이 다 모였다.` : `${t.gen}기는 지금 ${n}/${VI_GEN_N}명이다. 동기가 다 모이면 데뷔한다.`; }
// 처음 보는 선배: 데뷔할 때 인사한 선배 몇 명부터 알고, 합방을 하며 더 알게 된다 (활동 중인 선배 수까지)
function viAddSenior(s, t) {
  const x = viMakeNpc(s, viAgOf(t), U.int(1, Math.max(1, t.gen - 1)), true);
  t.seniors.push(x.id); meetAt(s, x, `${t.corpN} 선배`, 'vidol', t.corpN);
  return x;
}
// 데뷔 준비가 끝나면: 방송 컨셉 → 채널·RP 이름 → 동기들과 함께 데뷔
E({
  id: 'vi_cat', cat: '데뷔 준비', title: '방송 컨셉', tag: 'career',
  cond: s => viT(s).st === 'prep',
  text: s => `${viT(s).corpN}에서 만든 아바타가 완성됐다. 어떤 방송을 하는 버츄얼 아이돌로 데뷔할까?`,
  ch: s => viCatSort(s).map(c => ({ t: c, h: ytCatH(s, c), f: s => { viT(s).cat = c; fireEvent(s, 'vi_debut', {}); return ''; } })),
});
E({
  id: 'vi_debut', cat: '데뷔', title: '데뷔 방송', tag: 'career',
  cond: s => viT(s).st === 'prep',
  init(s, d) { d.given = vtRpName(me(s).g); },
  text: s => { const t = viT(s); return `${t.corpN} ${t.gen}기 동기들과 함께 데뷔한다. RP 이름(채널 이름)과 팬들이 부를 애칭을 정하자.`; },
  form: (s, d) => [{ k: 'given', label: 'RP 이름 (채널 이름)', value: d.given, max: 12 }, { k: 'nick', label: '애칭 (팬들이 부르는 이름)', value: genNick(s, d.given), max: 12 }],
  submit(s, d, v) {
    const given = (v.given || '').trim();
    if (!given) return { err: 'RP 이름은 비울 수 없어요' };
    // 데뷔 방송을 실시간 창으로 (볼 차례가 아니면 예전처럼 결과만)
    const log = viDebut(s, given, (v.nick || '').trim()), t = viT(s);
    streamShow(s, 'vidol', t.cut, '데뷔 방송', log, viLive(s, t, 'debut'), { gain: t.subs, gainK: '첫 구독자', gainAbs: true });
    return { log: '' };
  },
});
// 실시간 창 (12-3): 라이브 방송 플랫폼. sub: 방송 종류 (debut 데뷔 방송 · d3 3D 공개 · anniv 기념 방송 · concert 3D 라이브 · endure 내구 방송 · grad 졸업 방송)
// 방송 실력(viAppeal)이 채팅 분위기를 정한다. 동기 · 선배가 방송에 들어오기도 한다
function viLive(s, t, sub, o) {
  o = o || {};
  if (typeof liveStage !== 'function') return null;
  const ap = viAppeal(s, t), nick = (t.sn && t.sn.nick) || t.ch;
  const T = { debut: `【데뷔】 처음 뵙겠습니다, ${t.ch}입니다!`, d3: `【3D 공개】 ${t.ch}, 움직입니다`, anniv: `【${o.y || 1}주년】 기념 방송`, concert: `【3D LIVE】 ${t.ch} 콘서트`, endure: '【내구】 24시간 방송', grad: `【졸업】 ${t.ch}의 마지막 방송`, collab: `【합방】 ${t.ch} × ${o.co || ''}` };
  return liveStage({ k: 'stream', place: PF.live.n, t: T[sub], g: t.ch, cn: nick, mem: [[t.ch, '']], mi: 0, key: o.key !== false, sc: o.sc != null ? o.sc : U.clamp(50 + (ap - 55) * 1.5, 0, 100), z: { sk: (ap - 55) / 12 },
    x: { sub, subs: t.subs, nick, co: o.co || '', mgr: true, mates: viMates(s, t).concat(viSeniors(s, t)).slice(0, 4).map(viName), d3: sub === 'd3' || sub === 'concert' || !!t.d3 } });
}
function viDebut(s, given, nick) {
  const t = viT(s), ag = viAgOf(t);
  t.sn = { sur: '', given, nick, self: false };
  (s.usedNames = s.usedNames || []).push(given);
  while (t.mates.length < VI_GEN_N - 1) viAddMate(s, t, true);
  if (t.seniorN == null) t.seniorN = viSeniorN(s, ag, t.gen);
  while (t.seniors.length < Math.min(3, t.seniorN)) viAddSenior(s, t);
  // 첫 구독자: 회사 크기 + 내 팬 일부 + 따라온 구독자
  const start = ag.tier * 2500 + Math.round(s.fans.kr * 0.05) + (t.carry || 0);
  delete t.carry;
  for (const x of viMates(s, t)) x.vi.subs = Math.round(ag.tier * 2500 * U.fl(0.7, 1.3));
  Object.assign(t, { st: 'active', ch: given, cat: t.cat || '게임 방송', subs: start, months: 0, peak: start, debutT: s.t });
  milestone(s, `${age(s)}세에 ${t.corpN} ${t.gen}기 버츄얼 아이돌 ${qn(given, '라는')} 이름으로 데뷔했다.`);
  return `${t.corpN} ${t.gen}기 ${given}${josa(given, '으로').slice(given.length)} 데뷔했다! 동기 ${josa(viMates(s, t).map(viName).join(', '), '과와')} 함께다.${t.seniorN ? ` 활동 중인 선배는 ${t.seniorN}명이다.` : ` ${t.corpN}의 첫 기수다.`} 일정에 버츄얼 아이돌 활동을 넣어야 방송을 한다.`;
}

// ───── 할 일 ─────
JOB_TASKS.vidol = [
  { id: 'stream', n: '개인 방송', ic: '🎙️', eff: [['구독자', '↑', 1], ['컨셉 특기', '↑', 1], ['스트레스', '↑', 0]] },
  { id: 'collab', n: '합방 (동기·선배)', ic: '🤝', eff: [['구독자', '↑', 1], ['예능', '↑', 1], ['동기와 친해짐', '↑', 1]] },
  { id: 'sing', n: '노래 연습 (커버·오리지널 곡)', ic: '🎤', eff: [['보컬', '↑', 1], ['구독자', '↑', 0]] },
];
// 합방 상대: 동기나 선배 중 한 명 (선배는 구독자가 많아 더 많이 넘어온다)
function viCollab(s, t, n) {
  // 아직 모르는 선배가 있으면 가끔 처음 보는 선배와 합방한다
  if (viSeniors(s, t).length < Math.min(12, t.seniorN || 0) && U.chance(0.15)) viAddSenior(s, t);
  const pool = viMates(s, t).concat(viSeniors(s, t));
  if (!pool.length) return;
  const x = U.pick(pool), first = !x.viCo;
  x.viCo = (x.viCo || 0) + 1;
  meetAt(s, x, `${t.corpN} 합방`, 'vidol', t.corpN); bond(s, x, 2);
  const gain = Math.round(x.vi.subs * U.fl(0.002, 0.006) * n * Math.min(1.5, Math.max(0.3, viAppeal(s, t) / 60)));
  t.subs += gain; x.vi.subs += Math.round(t.subs * U.fl(0.001, 0.003) * n);
  // 처음 하는 상대와의 합방은 '중요할 때만'에서도 실시간 창으로 본다 (매달 하는 합방은 창 없이)
  if (first) streamShow(s, 'vidol', t.cut, '합방', `${x.vi.gen < t.gen ? '선배' : '동기'} ${viName(x)}${josa(viName(x), '과와').slice(viName(x).length)} 처음으로 합방을 했다.`, viLive(s, t, 'collab', { co: viName(x) }), { noDon: true, gain, queue: true });
}

// ───── 회사가 정하는 일 (알림) ─────
function viNotice(s, id, d = {}) { if (!hasQ(s, id)) queueEv(s, id, 0, d); }
E({
  id: 'vi_3d', cat: '회사 결정', title: '3D 데뷔', tag: 'career',
  keepPop: (s, d) => typeof liveShow === 'function' && liveShow(d.live), live: (s, d) => d.live, autoNoHtml: true,
  html: (s, d) => `<div class="m-text">${rich(EVENTS.vi_3d.text(s, d).split('\n\n')[0])}</div>` + stResHTML(streamBoxes(d.live, { don: d.inc, gain: Math.round(viT(s).subs * 0.12), more: [['✨', '이제부터', '3D 방송']] })),
  cond: s => viOn(s) && viT(s).st === 'active' && !viT(s).d3,
  init(s, d) { const t = viT(s); d.inc = Math.round(t.subs * U.fl(200, 400) * (1 - t.cut)); d.live = viLive(s, t, 'd3', { sc: 75 }); },
  text: (s, d) => { const t = viT(s); return `구독자 ${fmtFans(t.subs)}. ${t.corpN}에서 3D 모델을 만들어 주기로 했다. 3D 데뷔 방송에 시청자가 몰렸다.\n\n후원 ${fmtWon(d.inc)} · 이제부터 3D로도 방송한다`; },
  ch: (s, d) => [{ t: '확인', f: s => { const t = viT(s); t.d3 = true; t.av = Math.max(t.av, 4); t.subs = Math.round(t.subs * 1.12); earn(s, d.inc, '3D 데뷔 방송 후원'); milestone(s, `${age(s)}세에 「${t.ch}」 3D 데뷔를 했다.`); return `「${t.ch}」 3D 데뷔! 후원 ${fmtWon(d.inc)}.`; } }],
});
// 오리지널 곡 시작 (v154): 회사가 컨셉을 정하고 데모곡을 모아 고른다. 석 달 뒤에 나온다
function viAlbStart(s, t) {
  const ag = viAgOf(t), P = [me(s)], L = TRENDS.filter(x => cAgeOK(s, P, x, 1)), c = U.chance(0.5) && L.includes(s.trend) ? s.trend : U.pick(L.length ? L : TRENDS);
  const r = albNpc(s, { tier: ag.tier || 1, rep: ag.plan != null ? ag.plan : 50, sig: null, mem: [], cs: [c], ok: x => cAgeOK(s, P, x, 1), boss: { sd: 8 }, bossN: t.corpN || '회사', anr: { sd: 8 }, anrN: 'A&R팀', out: 0.3 });
  t.alb = albKeep(s, r, true);
  queueEv(s, 'vi_song', 3, { a: t.alb });
  addLog(s, `${t.corpN}에서 「${t.ch}」의 오리지널 곡 제작에 들어갔다. ('${c}' 컨셉)`, 'career');
}
// 오리지널 곡: 회사가 곡을 받아 와 낸다. 내 보컬이 좋을수록 잘된다 (가창 저작인접권 몫이 조금 들어온다)
E({
  id: 'vi_song', cat: '회사 결정', title: '오리지널 곡 발매', tag: 'career',
  cond: s => viOn(s) && viT(s).st === 'active',
  init(s, d) {
    const t = viT(s), p = me(s), ag = viAgOf(t), a = d.a;
    d.title = a ? a.title : songTitle();
    // v154: 회사가 앨범 제작 틀로 만든 곡 (a). 예전 세이브는 회사 크기만큼의 곡
    d.sc = U.clamp(lv(p, 'vocal') * 0.5 + (a ? a.q : 24 + ag.tier * 7) * 0.35 + Math.log10(1 + t.subs) * 3.2 + (t.d3 ? 3 : 0) + U.normal(0, 7) + 4, 0, 100);
    d.gain = Math.round(Math.max(0, fanGainRaw(d.sc, t.subs, 0.5)) * 0.6);
    if (a) { t.alb = null; t.songT = s.t + U.int(15, 21); }
  },
  html: (s, d) => d.a && d.a.mk ? `<div class="m-text">${rich(EVENTS.vi_song.text(s, d))}</div>` + albBannerHTML(d.a.mk) : '',
  text: (s, d) => { const t = viT(s); return `${t.corpN}에서 「${t.ch}」의 오리지널 곡 「${d.title}」을 냈다.\n\n${chartText(chartFromScore(d.sc))} · 구독자 ${sgnFans(d.gain)}\n반응: ${comments(d.sc, t.sn && t.sn.nick)}`; },
  ch: (s, d) => [{ t: '확인', f: s => { const t = viT(s); t.songs = (t.songs || 0) + 1; t.subs += d.gain; jpopWork(s, 'vidol', d.sc); addCatalog(s, d.title, '가창', d.sc, 0.3, 'vidol'); addWork(s, { type: '오리지널 곡', title: d.title, by: t.ch, sc: d.sc, note: chartText(chartFromScore(d.sc)) }); useSkill(s, me(s), 'vocal', 1); return `오리지널 곡 「${d.title}」 발매. ${chartText(chartFromScore(d.sc))}.`; } }],
});
// 데뷔 기념일: 기수 합동 기념 방송과 기념 굿즈
E({
  id: 'vi_anniv', cat: '회사 결정', title: '데뷔 기념 방송', tag: 'career',
  keepPop: (s, d) => typeof liveShow === 'function' && liveShow(d.live), live: (s, d) => d.live, autoNoHtml: true,
  html: (s, d) => `<div class="m-text">${rich(EVENTS.vi_anniv.text(s, d).split('\n\n')[0])}</div>` + stResHTML(streamBoxes(d.live, { don: d.inc, donK: '굿즈 수입', gain: d.gain })),
  cond: s => viOn(s) && viT(s).st === 'active',
  init(s, d) { const t = viT(s); d.y = Math.round(t.months / 12); d.live = viLive(s, t, 'anniv', { y: d.y, key: d.y === 1 || d.y % 5 === 0 }); d.inc = Math.round(t.subs * U.fl(150, 350) * (1 - t.cut)); d.gain = Math.round(t.subs * U.fl(0.02, 0.06)); },
  text: (s, d) => { const t = viT(s), m = viMates(s, t); return `「${t.ch}」 데뷔 ${d.y}주년. ${m.length ? `${t.gen}기 동기 ${m.map(viName).join(', ')}와 함께 ` : ''}기념 방송을 하고 기념 굿즈를 냈다.\n\n굿즈 수입 ${fmtWon(d.inc)} · 구독자 ${sgnFans(d.gain)}`; },
  ch: (s, d) => [{ t: '확인', f: s => { const t = viT(s); t.subs += d.gain; earn(s, d.inc, '굿즈'); for (const x of viMates(s, t)) { bond(s, x, 2); x.vi.subs = Math.round(x.vi.subs * 1.03); } return `데뷔 ${d.y}주년 기념 방송. 굿즈 수입 ${fmtWon(d.inc)}.`; } }],
});
// 3D 라이브 콘서트: 3D 데뷔를 하고 구독자가 많으면 회사가 연다
E({
  id: 'vi_live', cat: '회사 결정', title: '3D 라이브 콘서트', tag: 'career',
  keepPop: (s, d) => typeof liveShow === 'function' && liveShow(d.live), live: (s, d) => d.live, autoNoHtml: true,
  html: (s, d) => `<div class="m-text">${rich(EVENTS.vi_live.text(s, d).split('\n\n')[0])}</div>` + stResHTML(streamBoxes(d.live, { don: d.inc, donK: '공연 수입', gain: d.gain })),
  cond: s => viOn(s) && viT(s).st === 'active' && viT(s).d3,
  init(s, d) {
    const t = viT(s), p = me(s);
    d.sc = U.clamp(lv(p, 'vocal') * 0.4 + lv(p, 'dance') * 0.2 + lv(p, 'variety') * 0.2 + Math.log10(1 + t.subs) * 4 + U.normal(0, 7), 0, 100);
    d.inc = Math.round(t.subs * U.fl(400, 700) * (0.6 + d.sc / 100) * (1 - t.cut));
    d.gain = Math.round(t.subs * (d.sc >= 60 ? U.fl(0.04, 0.1) : U.fl(0, 0.03)));
    d.live = viLive(s, t, 'concert', { sc: d.sc });
  },
  text: (s, d) => { const t = viT(s); return `${t.corpN}에서 「${t.ch}」 3D 라이브 콘서트를 열었다. ${d.sc >= 70 ? '무대가 끝나자 채팅창이 박수로 가득 찼다.' : d.sc >= 50 ? '무난하게 공연을 마쳤다.' : '긴장해서 실수가 잦았다.'}\n\n수입 ${fmtWon(d.inc)} · 구독자 ${sgnFans(d.gain)}`; },
  ch: (s, d) => [{ t: '확인', f: s => { const t = viT(s); t.lives = (t.lives || 0) + 1; t.subs += d.gain; earn(s, d.inc, '3D 라이브'); useSkill(s, me(s), 'vocal', 1); if (t.lives === 1) milestone(s, `${age(s)}세에 「${t.ch}」 첫 3D 라이브 콘서트를 열었다.`); const up = viTierUp(s, t); return `「${t.ch}」 3D 라이브 콘서트. 수입 ${fmtWon(d.inc)}.` + (up ? ' ' + up : ''); } }],
});

// ───── 내가 골라서 하는 방송 (활동 지원) ─────
function viActWhy(s, key, cd) { if (!viOn(s) || viT(s).st !== 'active') return '데뷔한 버츄얼 아이돌만 할 수 있다'; if (s.cd[key] > s.t) return `${s.cd[key] - s.t}개월 뒤에 다시 할 수 있다`; return ''; }
ACT_APPLY.push({
  id: 'vi_cover', cat: 'video', n: '커버곡 올리기', ic: '🎤',
  show: s => viOn(s),
  h: s => `노래 ${has(me(s), 'vocal') ? lvi(me(s), 'vocal') + '레벨' : '못 함'} · 잘 부를수록 구독자가 는다 · 3개월에 한 번`,
  ok: s => !viActWhy(s, 'viCover') && has(me(s), 'vocal'),
  why: s => viActWhy(s, 'viCover') || '노래를 배워야 한다',
  run: s => {
    const t = viT(s), p = me(s); s.cd.viCover = s.t + 3;
    const sc = U.clamp(lv(p, 'vocal') * 0.7 + Math.log10(1 + t.subs) * 3 + U.normal(0, 8), 0, 100), gain = Math.round(t.subs * (sc >= 70 ? U.fl(0.03, 0.08) : sc >= 50 ? U.fl(0.01, 0.03) : U.fl(0, 0.01)) + sc * 5);
    t.subs += gain; useSkill(s, p, 'vocal', 1);
    return showResult(s, '커버곡', `「${t.ch}」 커버곡을 올렸다. ${sc >= 70 ? '노래 잘한다는 댓글이 쏟아졌다.' : sc >= 50 ? '팬들이 좋아했다.' : '조회수가 아쉬웠다.'}\n\n구독자 ${sgnFans(gain)}`, `커버곡을 올렸다. 구독자 ${sgnFans(gain)}.`, null, null,
      typeof plioSpec === 'function' ? plioSpec({ k: 'cover', t: `【커버】 ${t.ch}`, ch: t.ch, me: (t.sn && t.sn.nick) || t.ch, sc, rv: sc >= 70 ? 2 : sc >= 50 ? 1 : 0, vw: t.subs * (0.15 + sc / 120) }) : null);
  },
});
ACT_APPLY.push({
  id: 'vi_endure', cat: 'video', n: '내구 방송 (24시간)', ic: '⏰',
  show: s => viOn(s),
  h: s => '하루 종일 방송한다 · 구독자와 후원이 크게 들어오지만 몹시 지친다 · 6개월에 한 번',
  ok: s => !viActWhy(s, 'viEndure'),
  why: s => viActWhy(s, 'viEndure'),
  run: s => {
    const t = viT(s); s.cd.viEndure = s.t + 6;
    const gain = Math.round(t.subs * U.fl(0.02, 0.05) + 200), inc = Math.round(t.subs * U.fl(50, 120) * (1 - t.cut));
    t.subs += gain; earn(s, inc, '방송 후원·멤버십', 'vidol'); addStress(s, 12);
    const first = !t.endN; t.endN = (t.endN || 0) + 1; // 첫 내구 방송만 '중요할 때'
    const sp = viLive(s, t, 'endure', { sc: 62, key: first });
    return showResult(s, '내구 방송', `「${t.ch}」 24시간 내구 방송을 했다. 끝날 때쯤엔 목소리가 다 쉬었다.`, `24시간 내구 방송. 구독자 ${sgnFans(gain)}, 후원 ${fmtWon(inc)}.`, sp, streamBoxes(sp, { don: inc, gain, more: [['😵', '스트레스', '+12']] }));
  },
});

// ───── 등급 ─────
function viTierUp(s, t) {
  const k0 = t.tier || 0;
  t.tier = k0;
  while (t.tier < 6 && t.peak >= VI_UP.subs[t.tier + 1] && (t.tier + 1 < VI_UP.live || (t.lives || 0) >= 1) && (t.tier < 5 || me(s).tal.star >= VI_UP.star)) t.tier++;
  if (t.tier === k0) return '';
  if (t.tier >= 4) milestone(s, `${age(s)}세에 ${josa(VI_TIERS[t.tier], '이가')} 되었다.`);
  return `이제 사람들이 나를 '${VI_TIERS[t.tier]}'로 본다.`;
}

// ───── 계약 만료 · 졸업 · 독립 ─────
function viEnd(s, t, why) {
  t.st = 'ended'; t.tamper = null;
  t.endNote = `${t.corpN} ${t.gen}기 「${t.ch}」 · 가장 많을 때 구독자 ${fmtFans(t.peak || t.subs)} · ${why}`;
  t.hist = (t.hist || []).concat(t.endNote);
}
// 개인세로 독립: 아바타는 회사 것이라 무료 툴 아바타로 다시 태어난다 (스트리머 직업의 개인세 버튜버). 구독자 일부가 따라온다
function viGoSolo(s, t) {
  const carry = Math.round(t.subs * 0.35);
  viEnd(s, t, '개인세로 독립');
  const y = s.tracks.youtube;
  s.tracks.youtube = { st: 'prep', mode: 'vt', av: 1, left: 1, corp: null, corpN: '', cut: 0, subs: 0, months: 0, carry, sn: y.sn, hist: y.hist || [] };
  milestone(s, `${age(s)}세에 ${t.corpN}을 나와 개인세 버튜버로 다시 태어났다.`);
  return `${t.corpN}을 나와 개인세 버튜버로 독립하기로 했다. 무료 툴로 새 아바타를 만들고 있다.`;
}
E({
  id: 'vi_contract', cat: '계약', title: '버츄얼 아이돌 계약 만료', tag: 'career',
  cond: s => viOn(s) && viT(s).st === 'active',
  init(s, d) { const t = viT(s), r = viRank(s, t); d.r = r; d.want = t.subs >= 2e4 || r.r <= Math.ceil(r.n / 2); },
  text: (s, d) => { const t = viT(s); return `${josa(t.corpN, '과와')}의 계약이 끝났다. 구독자 ${fmtFans(t.subs)} · ${t.gen}기 ${d.r.n}명 중 ${d.r.r}위.${d.want ? '' : '\n\n회사는 재계약을 원하지 않는다.'}`; },
  ch: (s, d) => { const t = viT(s), tp = t.tamper, C = [];
    if (tp) C.push({ t: `약속대로 ${josa(tp.agN, '으로')} 옮긴다`, h: `회사 몫 ${pctN(tp.cut)} · 계약금 ${fmtWon(tp.bonus)} · 3년 · 새 회사 아바타로 다시 데뷔하고, 구독자 일부가 따라온다`, f: s => {
      const carry = Math.round(t.subs * 0.5), from = t.corpN;
      viEnd(s, t, `${josa(tp.agN, '으로')} 이적`);
      earn(s, tp.bonus, '이적 계약금');
      milestone(s, `${age(s)}세에 ${from}에서 ${josa(tp.agN, '으로')} 옮겼다.`);
      return viStart(s, tp.ag, tp.cut, 36, carry) + ` 계약금 ${fmtWon(tp.bonus)}을 받았다.`;
    } });
    if (d.want) C.push({ t: `${josa(t.corpN, '과와')} 재계약`, h: `회사 몫 ${pctN(Math.max(0.2, t.cut - 0.1))} · 3년`, f: s => { t.tamper = null; t.cut = Math.max(0.2, Math.round((t.cut - 0.1) * 100) / 100); t.months = 0; t.contract = 36; return `${josa(t.corpN, '과와')} 재계약했다.`; } });
    C.push({ t: '개인세로 독립한다', h: '아바타는 회사 것이라 새 아바타로 다시 태어나고, 구독자 일부만 따라온다', f: s => viGoSolo(s, t) });
    C.push({ t: '졸업한다', h: '버츄얼 아이돌 활동을 마친다', f: s => { const live = viLive(s, t, 'grad', { sc: 75 }); viEnd(s, t, '졸업'); milestone(s, `${age(s)}세에 「${t.ch}」 졸업 방송을 했다.`); return streamShow(s, 'vidol', t.cut, '졸업 방송', `「${t.ch}」 졸업 방송을 했다.`, live); } });
    return C; },
});
// 템퍼링: 계약 기간 중에 다른 회사가 몰래 이적을 제안한다. 걸리면 논란이 되고 다시는 버튜버로 데뷔할 수 없다
function viTamperOK(s) { const t = viT(s); return viOn(s) && t.st === 'active' && !t.tamper && t.subs >= 1e4 && t.contract - t.months >= 6 && t.contract - t.months <= 24; }
E({
  id: 'vi_tamper', cd: 24, cat: '제안', title: '몰래 온 제안', tag: 'career',
  p: s => viTamperOK(s) && !s.scandal && !s.hiatus ? 0.02 : 0,
  init(s, d) {
    const t = viT(s), pool = vtAgencies().filter(a => a.id !== t.corp && (!a.needJp || lv(me(s), 'jp') >= a.needJp));
    if (!pool.length) { d.skip = true; return; }
    const ag = U.pick(pool);
    d.ag = ag.id; d.agN = ag.n;
    d.cut = Math.max(0.2, Math.round((t.cut - U.fl(0.08, 0.15)) * 100) / 100);
    d.bonus = Math.max(100e4, Math.round(t.subs * U.fl(20, 40) / 1e5) * 1e5);
  },
  text: (s, d) => { const t = viT(s); return `${d.agN} 쪽 사람이 조용히 연락해 왔다. ${josa(t.corpN, '과와')}의 계약이 끝나면 자기 회사로 오라고 한다. 회사 몫을 ${pctN(d.cut)}로 낮춰 주고, 옮기면 계약금 ${fmtWon(d.bonus)}을 주겠다는 제안이다.\n\n계약 기간 중에 다른 회사와 몰래 이적을 약속하는 건 템퍼링이다. 걸리면 논란이 된다.`; },
  ch: (s, d) => [
    { t: '몰래 약속한다', h: `계약이 끝날 때 ${josa(d.agN, '으로')} 옮길 수 있다 · 그 전에 걸리면 논란`, f: s => { viT(s).tamper = { ag: d.ag, agN: d.agN, cut: d.cut, bonus: d.bonus }; return `${josa(d.agN, '과와')} 계약이 끝나면 옮기기로 몰래 약속했다.`; } },
    { t: '거절한다', f: () => `${d.agN}의 제안을 거절했다.` },
  ],
});
// 템퍼링이 걸렸다: 원래 회사가 계약을 해지하고 채널을 거둬들인다. 소문이 퍼져 다시는 버튜버로 데뷔할 수 없다 (s.flags.vtBan)
function viTamperCaught(s, t) {
  s.flags.tamper = { from: t.corpN, to: t.tamper.agN };
  viEnd(s, t, '템퍼링 논란으로 퇴출');
  milestone(s, `${age(s)}세에 템퍼링 논란으로 ${t.corpN}에서 퇴출됐다.`);
  s.flags.vtBan = true;
  startScandal(s, 'tamper', 'real');
}

// ───── 직업 정의 ─────
CAREERS.vidol = {
  n: '버츄얼 아이돌', ic: '🎙️',
  desc: '버츄얼 아이돌 기획사에 들어가 같은 기수 동기들과 함께 데뷔하는 회사 소속 버튜버. 인터넷 방송이 중심이고, 3D 데뷔·오리지널 곡·라이브는 회사가 정한다.',
  act: { n: '버츄얼 아이돌 활동', ic: '🎙️', g: '직업 활동', eff: [['구독자', '↑', 1], ['예능', '↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) {
    if (t.st === 'prep') return `${t.corpN} ${t.gen}기 데뷔 준비 중 (동기 ${t.mates.length + 1}/${VI_GEN_N}명 · ${t.prepM || 0}개월째)`;
    if (t.st !== 'active') return t.endNote || '';
    const r = viRank(s, t);
    return `${t.corpN} ${t.gen}기 「${t.ch}」 · ${t.cat} · 구독자 ${fmtFans(t.subs)} · 기수 ${r.n}명 중 ${r.r}위${t.d3 ? ' · 3D' : ''}`;
  },
  short(s, t) { return t.st === 'active' ? `버츄얼 아이돌 「${t.ch}」` : '버츄얼 아이돌 데뷔 준비'; },
  seg(s, t) { return t.st === 'active' ? `${t.corpN} ${t.gen}기 「${t.ch}」` : `${t.corpN} 데뷔 준비`; },
  title(s, t) { return t.st !== 'none' && (t.st === 'active' || (t.tier || 0) >= 1) && t.ch ? VI_TIERS[t.tier || 0] : null; },
  contract(s, t) { return t.st === 'active' || t.st === 'prep' ? t.corpN : ''; },
  cLeft(s, t) { return t.st === 'active' ? t.contract - t.months : null; },
  slotOK: (s, t) => t.st === 'active' || t.st === 'prep',
  mainSk(s, t) { return (YT_SK[t.cat] || ['variety'])[0]; },
  info(s, t) {
    if (t.st === 'prep') return [['소속', `${t.corpN} ${t.gen}기 · 회사 몫 ${pctN(t.cut)}`], ['준비', `${t.left > 0 ? `아바타 제작 중 (${t.left}개월 남음)` : '아바타 완성'} · 방송 연습 ${t.prepM || 0}개월째`], ['동기', `${t.mates.length + 1}/${VI_GEN_N}명 (다 모이면 데뷔)`], ['선배', `활동 중 ${t.seniorN || 0}명`],
      t.mates.length ? { h: `${t.gen}기 동기`, items: viMates(s, t).map(x => `${x.name} (${gNn(x)} · ${pAge(s, x)}세)`) } : null];
    const p = me(s), ks = [...new Set((YT_SK[t.cat] || ['variety']).concat('vocal'))].filter(k => has(p, k)), r = viRank(s, t);
    return [['채널', `「${t.ch}」 · ${t.cat}`], ['소속', `${t.corpN} ${t.gen}기 · 회사 몫 ${pctN(t.cut)}`], ['구독자', `${fmtFans(t.subs)} (가장 많을 때 ${fmtFans(t.peak || t.subs)})`], ['기수 안 순위', `${r.n}명 중 ${r.r}위`], ['수입', t.subs < 1000 ? '구독자 1,000명부터 들어온다' : `지난달 ${fmtWon(t.lastInc || 0)} (최근 1년 평균 ${fmtWon(incAvg(t))})`], ['내 실력', ks.map(k => `${SKILLS[k].n} ${lvi(p, k)}`).join(' · ') || '-'], ['아바타', t.d3 ? '3D 모델' : VT_AV[t.av].n], ['오리지널 곡 · 3D 라이브', `${t.songs || 0}곡 · ${t.lives || 0}번${t.alb ? ` · 새 곡 ${albStageW(s, t.alb)}` : ''}`],
      { h: `${t.gen}기 동기`, items: viMates(s, t).map(x => `${viName(x)} · 구독자 ${fmtFans(x.vi.subs)}${x.vi.d3 ? ' · 3D' : ''}${x.viCo ? ` · 합방 ${x.viCo}번` : ''}`) },
      { h: `선배 ${t.seniorN != null ? t.seniorN : viSeniors(s, t).length}명 · 아는 선배 ${viSeniors(s, t).length}명`, items: viSeniors(s, t).map(x => `${viName(x)} (${x.vi.gen}기) · 구독자 ${fmtFans(x.vi.subs)}${x.viCo ? ` · 합방 ${x.viCo}번` : ''}`) }];
  },
  actions(s, t) {
    if (t.st !== 'active') return [];
    return [{ t: '졸업 (버츄얼 아이돌 은퇴)', ok: true, danger: true, confirm: '정말 졸업할까요?\n계약이 남아 있어도 활동을 마쳐요.', run: s => { const live = viLive(s, t, 'grad', { sc: 75 }); viEnd(s, t, '졸업'); milestone(s, `${age(s)}세에 「${t.ch}」 졸업 방송을 했다.`); return streamShow(s, 'vidol', t.cut, '졸업 방송', `「${t.ch}」 졸업 방송을 했다.`, live); } }];
  },
  monthly(s, t) {
    const n = slotsOn(s, 'c_vidol'), task = n ? (jobTask(s, 'vidol') || {}).id : null, p = me(s);
    // 데뷔 준비: 방송 연습만 한다 (할 일에 따라 연습하는 특기가 다르다)
    if (t.st === 'prep') {
      if (n) { practice(s, p, task === 'sing' ? 'vocal' : 'variety', 1.1 * n); if (task === 'stream' && has(p, 'game')) practice(s, p, 'game', 0.5 * n); addStress(s, n); }
      // 아바타는 석 달이면 되지만, 데뷔는 같은 기수 동기가 다 모여야 한다
      t.left = Math.max(0, t.left - 1); t.prepM = (t.prepM || 0) + 1;
      // 1년 반이 넘으면 회사가 서둘러 남은 자리를 채운다
      if (t.mates.length < VI_GEN_N - 1 && U.chance(t.prepM >= 18 ? 0.6 : 0.18 + viAgOf(t).tier * 0.05)) viAddMate(s, t);
      if (t.left <= 0 && t.mates.length >= VI_GEN_N - 1 && !hasQ(s, 'vi_cat') && !hasQ(s, 'vi_debut')) queueEv(s, 'vi_cat', 0);
      return;
    }
    if (t.st !== 'active') return;
    if (t.seniorN == null) t.seniorN = Math.max(viSeniors(s, t).length, viSeniorN(s, viAgOf(t), t.gen));
    t.months++;
    for (const x of viMates(s, t).concat(viSeniors(s, t))) viMateMonth(s, x);
    if (t.tamper && t.months < t.contract && !s.scandal && !s.hiatus && U.chance(VT_TAMPER_CATCH)) { viTamperCaught(s, t); return; }
    if (t.months >= t.contract) { if (!hasQ(s, 'vi_contract')) queueEv(s, 'vi_contract', 0); }
    const mk = t.jp ? 'jp' : 'kr', before = t.subs;
    if (!n) { t.subs = Math.round(t.subs * 0.985); t.lastInc = 0; incPush(t, 0); return; }
    const ks = YT_SK[t.cat] || ['variety', 'variety'];
    let rate = 1;
    if (task === 'collab') { practice(s, p, 'variety', 0.9 * n); rate = 0.75; viCollab(s, t, n); }
    else if (task === 'sing') { if (has(p, 'vocal')) practice(s, p, 'vocal', 1.2 * n); else addLog(s, '노래를 연습하다 보니 노래하는 법이 몸에 붙었다.' + learnMe(s, 'vocal', null, false, true), 'career'); rate = 0.6; }
    else { practice(s, p, ks[0], 1.1 * n); if (ks[1] !== ks[0]) practice(s, p, ks[1], 0.5 * n); }
    addStress(s, 2 * n);
    const tg = viTarget(viAppeal(s, t), t.jp);
    if (t.subs < tg) t.subs += Math.round((tg - t.subs) * U.fl(0.02, 0.06) * Math.min(2, n) * rate + U.int(3, 20));
    else t.subs = Math.round(t.subs * U.fl(0.99, 1.0));
    t.peak = Math.max(t.peak || 0, t.subs);
    s.fans[mk] += Math.round(Math.max(0, t.subs - before) * 0.5 * myRoom(s, mk));
    // 수입: 방송 후원과 멤버십 (회사 몫을 뗀다)
    t.lastInc = t.subs >= 1000 ? Math.round(t.subs * VT_INC * U.fl(0.6, 1.4) * (1 - t.cut)) : 0;
    incPush(t, t.lastInc);
    if (t.lastInc) earn(s, t.lastInc, '방송 후원·멤버십', 'vidol');
    for (const [v, label] of [[1e5, '실버 버튼'], [1e6, '골드 버튼']]) if (before < v && t.subs >= v) { addLog(s, `「${t.ch}」 구독자 ${fmtFans(v)} 돌파! ${label}을 받았다.`, 'good'); milestone(s, `${age(s)}세에 「${t.ch}」 구독자 ${fmtFans(v)}을 넘겼다.`); }
    // 회사가 정하는 일
    const ag = viAgOf(t);
    if (!t.d3 && t.subs >= VI_3D[ag.tier]) viNotice(s, 'vi_3d');
    // 오리지널 곡 (v154): 회사가 1년 반~2년에 한 번, 앨범 제작 틀로 만든다 (기획 → 심사 · 선정 → 편곡 · 녹음, 석 달). 첫 곡은 데뷔 반년 뒤부터
    if (t.months >= 6 && t.songT == null) t.songT = s.t + U.int(3, 9);
    if (t.months >= 6 && !t.alb && !hasQ(s, 'vi_song') && has(p, 'vocal') && t.songT <= s.t) viAlbStart(s, t);
    // 회사 단체곡 (v156, project.js): 동기 전원 · 가끔 회사 전체. 한두 해에 한 번쯤
    else if (has(p, 'vocal') && typeof viUnitMonth === 'function') viUnitMonth(s, t);
    if (t.months % 12 === 0) viNotice(s, 'vi_anniv');
    if (t.d3 && t.subs >= VI_LIVE && !(t.liveT > s.t) && U.chance(0.1)) { t.liveT = s.t + 18; viNotice(s, 'vi_live'); }
    // 연말 회사 평가: 기수 안 순위
    if (calM(s) === 11) { const r = viRank(s, t); addRes(s, `${t.corpN} 연말 평가: ${t.gen}기 ${r.n}명 중 구독자 ${r.r}위 (${fmtFans(t.subs)}).`, r.r === 1 ? 'good' : 'career'); }
    const up = viTierUp(s, t); if (up) addLog(s, up, 'good');
  },
};

// 예전 세이브: 스트리머 직업에 있던 회사 소속 버튜버를 버츄얼 아이돌로 옮긴다
function viMigrate(s) {
  const y = s.tracks.youtube;
  if (!s.tracks.vidol) s.tracks.vidol = { st: 'none' };
  if (!y || !y.corp || !(y.st === 'active' || y.st === 'prep') || s.tracks.vidol.st !== 'none') return;
  const ag = AG[y.corp] || vtAgencies()[0];
  s.flags.viGen = s.flags.viGen || {};
  const gen = s.flags.viGen[ag.id] = Math.max(viCoGen(s, ag), s.flags.viGen[ag.id] || 0) + 1;
  const t = s.tracks.vidol = { st: y.st, corp: ag.id, corpN: ag.n, cut: y.cut || ag.cut, contract: y.contract || 48, months: y.months || 0, left: y.left || 1, gen, av: Math.max(VI_AV[ag.tier], Math.min(4, y.av || 2)), d3: false, tier: 0, lives: 0, songs: 0, ch: y.ch, cat: y.cat, subs: y.subs || 0, peak: y.peak || y.subs || 0, carry: y.carry, mates: [], seniors: [], jp: !!y.jp, tamper: y.tamper || null, sn: y.sn, hist: [] };
  if (t.st === 'active') {
    t.mates = Array.from({ length: 3 }, () => viMakeNpc(s, ag, gen, false).id);
    t.seniors = Array.from({ length: 2 }, () => viMakeNpc(s, ag, U.int(1, gen - 1), true).id); t.seniorN = Math.max(2, viSeniorN(s, ag, gen));
    for (const x of viMates(s, t)) x.vi.subs = Math.round(t.subs * U.fl(0.5, 1.5));
    viTierUp(s, t);
  }
  s.tracks.youtube = { st: 'none', sn: null, hist: y.hist || [] };
  for (const sl of s.slots || []) if (sl.act === 'c_youtube') sl.act = 'c_vidol';
  if (s.jobDo && s.jobDo.youtube) { delete s.jobDo.youtube; s.jobDo.vidol = 'stream'; }
}
