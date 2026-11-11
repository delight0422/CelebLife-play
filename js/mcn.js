'use strict';
// ════════ MCN (6-3단계) ════════
// 유튜버와 개인세 버튜버를 관리하는 회사 (AGENCIES kind 'mcn'). 들어가도 채널·구독자·이름은 그대로다 (환생 없음). 소속만 생긴다: s.tracks.youtube.mcn
// MCN이 해 주는 일: 광고·협찬 연결 · 편집 지원 · 성장 지원(기획·썸네일) · 같은 MCN 크리에이터와 합작 주선 · 굿즈 판매 · 개인 행사 · 논란 대응
// MCN 몫은 보통 20~30%, 5% 단위 (mcnCutFor). MCN과 채널의 크기 차이가 아주 클 때만 그 밖으로 나간다. 계약 2~3년, 끝나면 재계약하거나 나간다 (나가도 채널은 그대로)
// 내가 차리는 MCN(회사 대표)은 js/company.js의 분야 'mcn'. 업계 크리에이터(mcnMakeCreator)는 양쪽이 같이 쓴다

// MCN 크기별 도움: 성장(채널 매력에 더한다) · 유료 광고 영상 · 논란 피해를 줄이는 몫
// 편집은 MCN 편집팀의 실제 사람이 맡는다 (피드백 24: 무료 · 피드백 25: 정해진 사람들)
const MCN_HELP = { grow: [0, 2, 3.5, 5], ppl: [0, 0.15, 0.25, 0.35], shield: [0, 0.15, 0.25, 0.35] };
function mcnAgencies() { return AGENCIES.filter(a => a.kind === 'mcn'); }
// MCN 크기는 판마다 따로 자란다 (s.mcnCo[id].tier). 아직 한 번도 얽힌 적 없는 MCN은 처음 크기 그대로
function mcnTierOf(s, id) { return s && s.mcnCo && s.mcnCo[id] ? s.mcnCo[id].tier : (AG[id] || { tier: 1 }).tier; }
function mcnTierT(s, t) { return t && t.mcn ? mcnTierOf(s, t.mcn.id) : 0; }

// ───── MCN 편집팀 (피드백 25 · 28) ─────
// MCN마다 팀장 1명과 편집자 3명이 있다. 실력은 모든 회사 직원과 같은 규칙으로 정한다 (js/work.js의 회사 직원)
// 회사 평판 0~100: 소형 15 · 중형 45 · 대형 75에서 시작해 35를 넘으면 중형, 65를 넘으면 대형이 된다
// 내 채널이 그 MCN의 보통 크리에이터(소형 2만 · 중형 10만 · 대형 50만)보다 크게 크거나, 내가 그 편집팀에서 잘하면 오른다
const MCN_REP0 = [0, 15, 45, 75], MCN_NORM = [0, 2e4, 1e5, 5e5];
function mcnTierFor(rep) { return rep >= 65 ? 3 : rep >= 35 ? 2 : 1; }
// 그 MCN의 이번 판 상태 (처음 얽힐 때 만든다. 정해진 값으로 만드니 언제 만들어도 같다)
function mcnCo(s, id) {
  const C = s.mcnCo = s.mcnCo || {};
  if (!C[id]) {
    const k = (AG[id] || { tier: 1 }).tier;
    C[id] = { tier: k, rep: MCN_REP0[k], lead: coHire(s, id + '#ed', k, 0).id, staff: [1, 2, 3].map(i => coHire(s, id + '#ed', k, i).id) };
  }
  return C[id];
}
function mcnTeam(s, id) { const c = mcnCo(s, id); return [c.lead].concat(c.staff).map(x => s.people[x]).filter(Boolean); }
function mcnStaffSorted(s, c) { return coStaffSorted(s, c); }
// 내 채널 담당 편집자: 그 MCN의 보통 크리에이터보다 다섯 배 넘게 크면 팀장이, 아니면 가장 잘하는 편집자가 맡는다
// 팀장이 한 번 맡으면 세 배 밑으로 떨어질 때까지는 그대로 맡는다 (구독자가 오르내릴 때마다 바뀌지 않게)
function mcnMyEd(s, t) {
  if (!t || !t.mcn) return null;
  const c = mcnCo(s, t.mcn.id), L = mcnStaffSorted(s, c), lead = s.people[c.lead];
  const big = t.subs >= MCN_NORM[c.tier] * (t.mcn.ed && t.mcn.ed === c.lead ? 3 : 5);
  return (big && lead) || L[0] || lead || null;
}
function mcnEdLine(s, p) { return p ? `${p.name} (영상 편집 ${lvSee(s, p, 'edit')})` : ''; }
function mcnEdHere(s, id) { const e = s.tracks.editor; return !!e && trackOn(s, 'editor') && e.mode === 'emp' && e.mcn === id; }
// 회사가 자란다: 평판이 문턱을 넘으면 한 단계 커지고, 그 크기에 맞는 새 팀장과 편집자가 들어온다
// 원래 팀장은 편집자로 남고, 가장 덜 잘하는 두 사람이 나간다 (팀은 늘 팀장 1 + 편집자 3)
function mcnGrow(s, id, v) {
  if (!(v > 0)) return;
  const c = mcnCo(s, id); c.rep = U.clamp(c.rep + v, 0, 100);
  const nt = mcnTierFor(c.rep);
  if (nt <= c.tier) return;
  c.tier = nt;
  const old = s.people[c.lead], lead = coHire(s, id + '#ed', nt, 0), top = coHire(s, id + '#ed', nt, 1);
  const L = mcnStaffSorted(s, c);
  if (old) { old.job = '편집자'; L.push(old); }
  L.push(top); L.sort((a, b) => lv(b, 'edit') - lv(a, 'edit'));
  for (const p of L.slice(3)) coLeaveTeam(p, id + '#ed');
  c.staff = L.slice(0, 3).map(p => p.id); c.lead = lead.id;
  const ag = AG[id], mine = !!mcnOf(s) && mcnOf(s).id === id, ed = mcnEdHere(s, id);
  if (!mine && !ed) return;
  if (ed) { s.tracks.editor.tier = nt; meetAt(s, lead, `${ag.n} 편집팀`, 'editor', ag.n); if (c.staff.includes(top.id)) meetAt(s, top, `${ag.n} 편집팀`, 'editor', ag.n); }
  const nw = c.staff.includes(top.id) ? `새 팀장 ${josa(lead.name, '과와')} 편집자 ${top.name}` : `새 팀장 ${lead.name}`;
  addLog(s, `${josa(ag.n, '이가')} ${TIER_N[nt]} MCN으로 컸다. 편집팀에 ${josa(nw, '이가')} 들어왔다.`, 'career');
}
// 해마다: 60세가 넘었거나 세상을 떠난 사람은 같은 자리의 새 사람으로 바뀐다
function mcnYear(s) { for (const id in (s.mcnCo || {})) coRefill(s, id + '#ed', s.mcnCo[id], s.mcnCo[id].tier); }
// 예전 세이브에서 이미 MCN에 있으면 담당 편집자를 만난 것으로 (편집팀 직원이면 coMeetMonth가 팀을 만나게 한다)
function mcnMeetOld(s) {
  const y = s.tracks && s.tracks.youtube;
  if (y && y.mcn && trackOn(s, 'youtube') && !y.mcn.ed) { const ed = mcnMyEd(s, y); if (ed) { meetAt(s, ed, `${y.mcn.n} 편집팀`, 'youtube', y.mcn.n); y.mcn.ed = ed.id; } }
}
function mcnOf(s) { const t = s.tracks.youtube; return trackOn(s, 'youtube') && t.st === 'active' && t.mcn ? t.mcn : null; }
// MCN 몫: 그 크기 MCN의 보통 크리에이터(소형 2만 · 중형 10만 · 대형 50만)보다 채널이 크면 낮고 작으면 높다
// 보통은 20~30%. 열 배 넘게 차이가 날 때만 15%·35%처럼 그 밖으로 나간다 (10~40%)
function mcnGap(subs, tier) { return Math.round((Math.log10(Math.max(1, subs)) - (4.3 + (tier - 1) * 0.7)) * 1.3); }
function mcnCutFor(subs, tier) { return U.clamp(Math.round((0.25 - mcnGap(subs, tier) * 0.05) * 100) / 100, 0.1, 0.4); }
function mcnCutMe(s, ag) { return mcnCutFor(s.tracks.youtube.subs, mcnTierOf(s, ag.id)); }

// ───── 업계 크리에이터 (유튜버·버튜버) ─────
// x.yt = { ch: 채널, cat, mode: yt|vt, subs, tg: 혼자 크면 닿을 구독자, mcn: 소속 MCN id 또는 내 회사 'me' }
function mcnMakeCreator(s, o = {}) {
  const vt = o.vt != null ? o.vt : U.chance(0.3);
  const x = makeIndustry(s, vt ? '버튜버' : '유튜버', { age: U.int(18, 34), aff: 40 });
  const cat = U.pick(ytCats(vt)), ch = vt ? vtRpName(x.g) : ytChName(cat);
  (s.usedNames = s.usedNames || []).push(ch);
  const subs = Math.round(o.subs || Math.pow(10, U.fl(3, 4.5)));
  x.yt = { ch, cat, mode: vt ? 'vt' : 'yt', subs, peak: subs, tg: Math.round(subs * U.fl(0.6, 2.5)), mcn: o.mcn || null };
  return x;
}
function mcnCrName(x) { return `「${x.yt.ch}」`; }
// 한 달 수익 (크리에이터 전체 몫): 유튜버는 광고 수익, 버튜버는 후원·멤버십
function mcnCrRev(x) { const y = x.yt; if (y.subs < 1000) return 0; return y.mode === 'vt' ? y.subs * VT_INC * U.fl(0.6, 1.4) : y.subs * U.fl(1, 3) * 2 * YT_INC; }
// 최근 1년 구독자 변화 (누구나 볼 수 있는 숫자): 혼자 클 수 있는 높이가 지금보다 높으면 오르는 중
function mcnTrend(x) { const y = x.yt; return Math.round(U.clamp((y.tg / Math.max(1, y.subs) - 1) * 40, -25, 150) + (hashN(y.ch) % 11) - 5); }

// ───── 가입 신청 · 영입 제안 ─────
function mcnBlock(s) {
  const t = s.tracks.youtube;
  if (!trackOn(s, 'youtube') || t.st !== 'active') return '채널을 운영하는 유튜버·개인세 버튜버만 들어갈 수 있다';
  if (t.mcn) return `지금 ${josa(t.mcn.n, '과와')} 계약 중이다`;
  if (agencyContract(s)) return contractWhy(s);
  return '';
}
function mcnJoinP(s, ag) { return U.clamp(0.3 + Math.log10(Math.max(1, s.tracks.youtube.subs) / ag.min) * 0.45, 0.08, 0.95); }
for (const ag of mcnAgencies()) JOB_APPLY.push({
  id: 'mcn_join_' + ag.id, trk: 'youtube', g: '▶️ 유튜버', get n() { return `${ag.n} 가입 신청 (MCN)`; }, get tag() { return agTag(ag, mcnTierOf(S, ag.id)); },
  show: s => trackOn(s, 'youtube') && s.tracks.youtube.st === 'active' && !s.tracks.youtube.mcn,
  h: s => `구독자 ${fmtFans(ag.min)}부터 · 수익의 ${pctN(mcnCutMe(s, ag))}를 MCN이 가져간다${s.tracks.youtube.subs >= ag.min ? ` · 받아 줄 가능성 ${fmtPct(mcnJoinP(s, ag))}` : ''} · 결과는 다음 달`,
  ok: s => !mcnBlock(s) && s.tracks.youtube.subs >= ag.min && !(s.cd['mcn_' + ag.id] > s.t) && !hasQ(s, 'mcn_res'),
  why: s => mcnBlock(s) || (s.tracks.youtube.subs < ag.min ? `구독자가 ${fmtFans(ag.min)}을 넘어야 한다` : s.cd['mcn_' + ag.id] > s.t ? '같은 MCN은 1년 뒤에 다시 신청할 수 있다' : '다른 MCN 결과를 기다리는 중'),
  run: s => { s.cd['mcn_' + ag.id] = s.t + 12; queueEv(s, 'mcn_res', 1, { ag: ag.id, p: mcnJoinP(s, ag) }); return `${ag.n}에 가입 신청을 했다.`; },
});
// MCN 편집팀 (피드백 24): 편집자가 MCN에 들어가 소속 유튜버·버튜버 영상을 편집한다 (영상 제작사 편집팀과 같은 직원 계약)
for (const ag of mcnAgencies()) JOB_APPLY.push({
  id: 'editor_mcn_' + ag.id, trk: 'editor', g: '🎞️ 편집자', get n() { return `${ag.n} 편집팀 채용 (MCN)`; }, get tag() { return `월급 ${EDIT_SAL[mcnTierOf(S, ag.id)]}만 원`; },
  show: s => !(trackOn(s, 'editor') && s.tracks.editor.mode === 'emp') && age(s) >= 20,
  h: s => lv(me(s), 'edit') >= 30 ? `소속 유튜버·버튜버 영상을 편집한다 · 합격 가능성 ${fmtPct(audP(editScore(s, true) + empExpBonus(s, 'editor'), EDIT_THR[mcnTierOf(s, ag.id)]))} · 결과는 다음 달` : '영상 편집이 30레벨 이상이어야 지원할 수 있다',
  ok: s => !s.army && !agencyContract(s) && lv(me(s), 'edit') >= 30 && !hasQ(s, 'edit_res') && !(s.cd['editm_' + ag.id] > s.t),
  why: s => s.army ? '군 복무 중' : agencyContract(s) ? contractWhy(s) : lv(me(s), 'edit') < 30 ? '영상 편집을 더 배워야 한다' : hasQ(s, 'edit_res') ? '결과를 기다리는 중' : '얼마 전에 지원했다 (반년 뒤 다시)',
  run: s => { s.cd['editm_' + ag.id] = s.t + 6; { const k = mcnTierOf(s, ag.id); queueEv(s, 'edit_res', 1, { tier: k, co: ag.n, mcn: ag.id, p: audP(editScore(s, true) + empExpBonus(s, 'editor'), EDIT_THR[k]) }); } return `${ag.n} 편집팀 채용에 지원했다.`; },
});
function mcnNego(s, ag, o = {}) { return startNego(s, Object.assign({ kind: 'mcn', ag: ag.id, agN: ag.n, months: mcnTierOf(s, ag.id) === 3 ? 36 : 24, cut: mcnCutMe(s, ag), cutStep: 0.05, cutMin: 0.1, lev: U.clamp(Math.log10(1 + s.tracks.youtube.subs / ag.min) * 0.3 + 0.15, 0.05, 0.8) }, o)); }
E({
  id: 'mcn_res', cat: 'MCN', title: 'MCN 가입 신청 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p) && !mcnBlock(s); },
  text: (s, d) => d.pass ? `${AG[d.ag].n}에서 함께하자는 연락이 왔다. 채널과 구독자는 그대로이고, 광고 연결·편집·기획·굿즈·행사를 도와준다.` : `${AG[d.ag].n}에서 아직은 함께하기 어렵다는 답이 왔다.`,
  ch: (s, d) => d.pass ? [
    { t: '계약서를 받아 본다', f: s => mcnNego(s, AG[d.ag]) },
    { t: '거절한다', f: () => `${AG[d.ag].n}의 제안을 거절했다.` },
  ] : [{ t: '확인', f: () => `${AG[d.ag].n} 가입 신청이 받아들여지지 않았다.` }],
});
NEGO.mcn = {
  what: d => 'MCN 전속 계약이다. 채널과 구독자, 이름은 그대로다. 광고·협찬 연결, 편집, 기획, 굿즈 판매, 개인 행사를 도와주고 수익의 일부를 가져간다.',
  block: (s, d) => d.renew ? '' : mcnBlock(s),
  sign: (s, d) => d.renew ? mcnRenew(s, d) : mcnJoin(s, d.ag, d.cut, d.months),
  refuse: (s, d) => d.renew ? mcnLeave(s, '재계약 안 함') : `${d.agN}의 계약 제안을 거절했다.`,
  lost: (s, d) => d.renew ? `${d.agN}에서 재계약 이야기를 없던 일로 하자고 했다. ` + mcnLeave(s, '재계약 결렬') : `${d.agN}에서 계약 이야기를 없던 일로 하자고 했다.`,
};
function mcnJoin(s, agId, cut, months) {
  const t = s.tracks.youtube, ag = AG[agId];
  t.mcn = { id: agId, n: ag.n, cut, left: months, months, since: s.t, subs0: t.subs };
  // MCN 편집팀이 편집을 맡으니 따로 고용하던 편집자는 내보낸다 (피드백 24)
  const ed = t.editor; t.editor = false;
  // 담당 편집자를 만난다 (피드백 25)
  const who = mcnMyEd(s, t); if (who) { meetAt(s, who, `${ag.n} 편집팀`, 'youtube', ag.n); t.mcn.ed = who.id; }
  milestone(s, `${age(s)}세에 ${josa(`「${t.ch}」`, '으로')} ${ag.n}(MCN)에 들어갔다.`);
  return `${josa(`${ag.n}(MCN)`, '과와')} ${yrs(months)} 계약했다. 채널은 그대로이고, 수익의 ${pctN(cut)}를 MCN이 가져간다.${who ? ` 편집은 편집팀의 ${josa(who.name, '이가')} 맡는다.` : ''}${ed ? ' 따로 고용하던 편집자와의 계약은 끝냈다.' : ''}`;
}
function mcnRenew(s, d) { const m = s.tracks.youtube.mcn; if (!m) return ''; m.cut = d.cut; m.left = d.months; m.months = d.months; m.subs0 = s.tracks.youtube.subs; m.endQ = false; return `${josa(d.agN, '과와')} ${yrs(d.months)} 재계약했다. MCN 몫 ${pctN(d.cut)}.`; }
function mcnLeave(s, why) {
  const t = s.tracks.youtube, m = t.mcn;
  if (!m) return '';
  t.mcn = null; t.mcnHist = (t.mcnHist || []).concat(`${m.n} (${why})`);
  return `${m.n}에서 나왔다. 「${t.ch}」 채널은 그대로다.`;
}
// 구독자가 늘면 MCN이 먼저 영입을 제안한다 (메시지함)
E({
  id: 'mcn_offer_gen', cat: '제안', title: 'MCN 영입 제안',
  p: s => !mcnBlock(s) && s.tracks.youtube.subs >= 5000 && !s.inbox.some(m => m.kind === 'mcn_offer') ? 0.03 : 0,
  init(s, d) {
    const subs = s.tracks.youtube.subs, pool = mcnAgencies().filter(a => subs >= a.min * 1.5);
    if (!pool.length) { d.skip = true; return; }
    const ag = U.wpick(pool, a => mcnTierOf(s, a.id));
    sendMsg(s, 'mcn_offer', { from: ag.n, title: 'MCN 영입 제안', months: 3, d: { ag: ag.id, cut: Math.max(0.1, Math.round((mcnCutMe(s, ag) - 0.05) * 100) / 100) } });
    d.skip = true;
  },
});
INBOX.mcn_offer = {
  ic: '📡',
  text: (s, m) => { const ag = AG[m.d.ag]; return `${ag.n}(${TIER_N[mcnTierOf(s, ag.id)]} MCN)에서 「${s.tracks.youtube.ch}」 채널을 함께 키워 보자는 제안이 왔다. 채널과 구독자는 그대로이고, 광고·편집·기획·굿즈·행사를 도와준다.\n\nMCN 몫 ${pctN(m.d.cut)} (가입 신청보다 낮다)`; },
  ch: (s, m) => { const ag = AG[m.d.ag]; return [
    { t: '계약서를 받아 본다', ok: s => !mcnBlock(s), h: mcnBlock(s), f: s => mcnNego(s, ag, { cut: m.d.cut }) },
    { t: '거절한다', f: () => `${ag.n}의 영입 제안을 거절했다.` },
  ]; },
};

// ───── 소속 중 한 달 (유튜버 직업의 monthly에서 부른다) ─────
// 계약 기간이 줄고, MCN이 잡아 온 유료 광고 영상(PPL) 수익이 가끔 들어온다 (MCN 몫을 뗀다)
function mcnMonth(s, t, n) {
  const m = t.mcn, k = mcnTierT(s, t);
  m.left--;
  // 내 채널이 그 MCN의 보통 크리에이터보다 크면 MCN이 자란다 (열 배면 한 달에 0.6)
  mcnGrow(s, m.id, Math.log10(Math.max(1, t.subs) / MCN_NORM[k]) * 0.6);
  // 담당 편집자가 바뀌면(채널이 커져 팀장이 맡거나, 회사가 커져 사람이 바뀌면) 알려 주고 새 담당을 만난다
  const ed = mcnMyEd(s, t);
  if (ed && m.ed !== ed.id) {
    if (m.ed) addLog(s, `${m.n} 편집팀에서 이제 ${josa(ed.name, '이가')} 「${t.ch}」 편집을 맡는다.`, 'career');
    m.ed = ed.id; meetAt(s, ed, `${m.n} 편집팀`, 'youtube', m.n);
  }
  if (m.left <= 0 && !m.endQ) { m.endQ = true; queueEv(s, 'mcn_end', 0); }
  if (n && t.subs >= 3000 && U.chance(MCN_HELP.ppl[k])) {
    const fee = Math.round(t.subs * U.fl(4, 10) * (1 + k * 0.3) * (1 - m.cut) / 1e4) * 1e4;
    if (fee > 0) { earn(s, fee, '유료 광고 영상'); addLog(s, `${m.n}에서 잡아 온 유료 광고 영상을 올렸다. (${fmtWon(fee)})`, 'career'); }
  }
}
E({
  id: 'mcn_end', cat: '계약', title: 'MCN 계약 만료', tag: 'career',
  cond: s => !!mcnOf(s),
  init(s, d) {
    const t = s.tracks.youtube, m = t.mcn, ag = AG[m.id] || { min: 0, tier: 1 }; d.want = t.subs >= ag.min * 0.7 || t.subs > m.subs0 * 1.2; d.grow = t.subs - m.subs0;
    // 채널이 컸으면 더 큰 MCN이 데려가겠다고 연락해 온다
    const big = mcnAgencies().filter(a => mcnTierOf(s, a.id) > mcnTierOf(s, m.id) && t.subs >= a.min * 1.5);
    if (big.length && U.chance(0.6)) d.alt = U.pick(big).id;
  },
  text: (s, d) => { const t = s.tracks.youtube, m = t.mcn, a = d.alt && AG[d.alt]; return `${josa(m.n, '과와')}의 계약이 끝났다. 계약할 때 구독자 ${fmtFans(m.subs0)} → 지금 ${fmtFans(t.subs)} (${sgnFans(d.grow)}).${d.want ? '' : '\n\nMCN은 재계약을 원하지 않는다.'}${a ? `\n\n${a.n}(${TIER_N[a.tier]} MCN)에서도 영입 제안이 왔다.` : ''}\n\n나가도 채널과 구독자는 그대로다.`; },
  ch: (s, d) => { const m = s.tracks.youtube.mcn, ag = AG[m.id], C = [];
    if (d.want && ag) C.push({ t: '재계약 조건을 들어 본다', f: s => mcnNego(s, ag, { renew: true, cut: mcnCutMe(s, ag), months: m.months }) });
    if (d.alt && AG[d.alt]) { const a = AG[d.alt], cut = mcnCutMe(s, a); C.push({ t: `${josa(a.n, '으로')} 옮긴다`, h: `${TIER_N[mcnTierOf(s, a.id)]} MCN · MCN 몫 ${pctN(cut)}`, f: s => { const x = mcnLeave(s, '이적'); return (x + ' ' + (mcnNego(s, a, { cut }) || '')).trim(); } }); }
    C.push({ t: '나간다', h: '채널과 구독자는 그대로다', f: s => mcnLeave(s, '계약 만료') });
    return C; },
});

// ───── 합작 영상 (활동 지원) ─────
// MCN이 같은 소속 크리에이터와 합작을 잡아 준다. 상대 구독자가 많을수록 많이 넘어온다
function mcnMates(s, id) { return people(s, x => x.yt && x.yt.mcn === id && x.alive); }
ACT_APPLY.push({
  id: 'mcn_collab', cat: 'video', n: 'MCN 합작 영상', ic: '🤝',
  show: s => !!mcnOf(s),
  h: s => `${josa((mcnOf(s) || {}).n || 'MCN', '이가')} 같은 소속 크리에이터와 합작을 잡아 준다 · 4개월에 한 번`,
  ok: s => !!mcnOf(s) && !(s.cd.mcnCo > s.t),
  why: s => !mcnOf(s) ? 'MCN 소속이어야 한다' : `${s.cd.mcnCo - s.t}개월 뒤에 다시 할 수 있다`,
  run: s => {
    const t = s.tracks.youtube, m = t.mcn; s.cd.mcnCo = s.t + 4;
    let L = mcnMates(s, m.id);
    if (L.length < 4 || U.chance(0.3)) { const x = mcnMakeCreator(s, { mcn: m.id, subs: Math.max(2000, t.subs * U.fl(0.3, 3)), vt: t.mode === 'vt' ? U.chance(0.7) : U.chance(0.2) }); L = [x]; }
    const x = U.pick(L), y = x.yt;
    meetAt(s, x, `${m.n} 합작`, 'youtube', m.n); bond(s, x, 3);
    const gain = Math.round(y.subs * U.fl(0.005, 0.02) * Math.min(1.5, Math.max(0.4, ytAppeal(s, t) / 55)) + 100);
    t.subs += gain; y.subs += Math.round(t.subs * U.fl(0.005, 0.015));
    t.peak = Math.max(t.peak || 0, t.subs);
    return showResult(s, 'MCN 합작 영상', `${josa(m.n, '이가')} 잡아 준 합작으로 ${y.mode === 'vt' ? '버튜버' : '유튜버'} ${josa(mcnCrName(x), '과와')} 함께 영상을 찍었다. (상대 구독자 ${fmtFans(y.subs)})\n\n구독자 ${sgnFans(gain)}`, `${josa(mcnCrName(x), '과와')} 합작 영상. 구독자 ${sgnFans(gain)}.`, null, null,
      typeof plioSpec === 'function' ? (sc => plioSpec({ k: 'collab', t: `${t.ch} × ${mcnCrName(x)}`, ch: t.ch, me: (t.sn && t.sn.nick) || t.ch, sc, rv: sc >= 72 ? 2 : sc >= 55 ? 1 : 0, vw: (t.subs + y.subs) * U.fl(0.1, 0.4) }))(U.clamp(ytAppeal(s, t) + 12 + U.normal(0, 7), 0, 100)) : null);
  },
});

// ───── 굿즈 판매 · 개인 행사 (활동 지원) ─────
// MCN이 굿즈를 만들어 팔아 주고, 팬미팅·토크 콘서트 같은 개인 행사를 열어 준다. 번 돈은 계약한 몫대로 나눈다
// 굿즈: 구독자의 0.2~0.6%가 산다 (버튜버 팬은 1.5배). 한 개에 남는 돈 1만 5천 원
// 행사: 구독자의 0.3~0.8%가 온다 (최대 2만 명). 표값 5만 원, 대관·진행 비용은 표 매출의 40% + 500만 원. 손해가 나면 MCN이 떠안는다
const MCN_GOODS_PER = 1.5e4, MCN_TICKET = 5e4;
function mcnGoodsUnits(subs, vt) { return Math.round(subs * U.fl(0.002, 0.006) * (vt ? 1.5 : 1)); }
function mcnEventRoll(subs, mult) { const n = Math.min(20000, Math.round(subs * U.fl(0.003, 0.008) * mult)), gross = n * MCN_TICKET, cost = Math.round(gross * 0.4 + 500e4); return { n, gross, cost, net: gross - cost }; }
ACT_APPLY.push({
  id: 'mcn_goods', cat: 'video', n: 'MCN 굿즈 판매', ic: '🛍️',
  show: s => !!mcnOf(s),
  h: s => `${josa((mcnOf(s) || {}).n || 'MCN', '이가')} 내 채널 굿즈를 만들어 팔아 준다 · 구독자 1만 명부터 · 6개월에 한 번`,
  ok: s => !!mcnOf(s) && s.tracks.youtube.subs >= 1e4 && !(s.cd.mcnGoods > s.t),
  why: s => !mcnOf(s) ? 'MCN 소속이어야 한다' : s.tracks.youtube.subs < 1e4 ? '구독자가 1만 명을 넘어야 한다' : `${s.cd.mcnGoods - s.t}개월 뒤에 다시 할 수 있다`,
  run: s => {
    const t = s.tracks.youtube, m = t.mcn; s.cd.mcnGoods = s.t + 6;
    const u = mcnGoodsUnits(t.subs, t.mode === 'vt'), pay = Math.round(u * MCN_GOODS_PER * (1 - m.cut) / 1e4) * 1e4;
    earn(s, pay, '굿즈 판매');
    return showResult(s, 'MCN 굿즈 판매', `${josa(m.n, '이가')} 만든 「${t.ch}」 굿즈가 ${u.toLocaleString()}개 팔렸다.\n\n내 몫 ${fmtWon(pay)} (MCN 몫 ${pctN(m.cut)}를 뗐다)`, `「${t.ch}」 굿즈 ${u.toLocaleString()}개 판매. 내 몫 ${fmtWon(pay)}.`);
  },
});
ACT_APPLY.push({
  id: 'mcn_event', cat: 'video', n: 'MCN 개인 행사', ic: '🎪',
  show: s => !!mcnOf(s),
  h: s => `${josa((mcnOf(s) || {}).n || 'MCN', '이가')} 팬미팅·토크 콘서트를 열어 준다 · 구독자 5만 명부터 · 1년에 한 번`,
  ok: s => !!mcnOf(s) && s.tracks.youtube.subs >= 5e4 && !(s.cd.mcnEv > s.t),
  why: s => !mcnOf(s) ? 'MCN 소속이어야 한다' : s.tracks.youtube.subs < 5e4 ? '구독자가 5만 명을 넘어야 한다' : `${s.cd.mcnEv - s.t}개월 뒤에 다시 할 수 있다`,
  run: s => {
    const t = s.tracks.youtube, m = t.mcn; s.cd.mcnEv = s.t + 12;
    // 예능 실력이 좋을수록, MCN이 클수록 사람이 많이 온다
    const r = mcnEventRoll(t.subs, (0.7 + lv(me(s), 'variety') / 150) * (1 + mcnTierT(s, t) * 0.1));
    const pay = Math.max(0, Math.round(r.net * (1 - m.cut) / 1e4) * 1e4), gain = Math.round(t.subs * U.fl(0.01, 0.03));
    earn(s, pay, '개인 행사');
    t.subs += gain; t.peak = Math.max(t.peak || 0, t.subs);
    const money = pay > 0 ? `내 몫 ${fmtWon(pay)} (MCN 몫 ${pctN(m.cut)}를 뗐다)` : `남는 돈이 없어 내 몫은 없다. 손해는 ${josa(m.n, '이가')} 떠안았다.`;
    return showResult(s, 'MCN 개인 행사', `${josa(m.n, '이가')} 연 「${t.ch}」 팬미팅에 ${r.n.toLocaleString()}명이 왔다.\n\n표 매출 ${fmtWon(r.gross)} · 대관·진행 ${fmtWon(r.cost)}\n${money}\n\n구독자 ${sgnFans(gain)}` + fx(s, { stress: 6 }), `「${t.ch}」 팬미팅 ${r.n.toLocaleString()}명. ${pay > 0 ? `내 몫 ${fmtWon(pay)}` : '내 몫 없음'} · 구독자 ${sgnFans(gain)}.`);
  },
});
