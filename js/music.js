'use strict';
// 음악 쪽 아티스트: 아이돌, 밴드 멤버, 솔로 가수(보컬형·래퍼형·퍼포먼스형), 솔로 뮤지션(연주가)
// 공통 부품: 오디션 확률, 차트·저작권료, 팬 반응 댓글, 활동명, 영입 제안(메시지함)
// 직업 활동을 하면 관련 특기가 혼자 연습할 때보다 빨리 는다 (직업 경험)

// ───── 공통 ─────
function audP(score, thr) { return U.clamp(U.sig((score - thr) / 5), 0.01, 0.97); }
function musicAgencies() { return AGENCIES.filter(a => a.kind === 'music'); }
function langOK(s, ag) { const p = me(s); return (!ag.needJp || lv(p, 'jp') >= ag.needJp) && (!ag.needEn || lv(p, 'en') >= ag.needEn); }
function langMult(p, k) { return 0.3 + lv(p, k) / 60; }
function langWhy(ag) { return ag.needJp ? `일본어 ${ag.needJp}레벨 이상 필요` : ag.needEn ? `영어 ${ag.needEn}레벨 이상 필요` : ''; }
function sgnFans(n) { return (n >= 0 ? '+' : '-') + fmtFans(Math.abs(n)); }
// 직업 활동 칸(c_직업)은 할 일을 골랐을 때만 일한다 (game.js jobN)
function slotsOn(s, act) { return act.startsWith('c_') ? jobN(s, act.slice(2)) : s.slots.filter(sl => sl.act === act).length; }
// 얼굴이 보이는 일(아이돌·가수·배우·모델 등)에서 외모가 바로 보태는 점수. -10 ~ +10쯤
// 스타성은 여기 들어가지 않고, 아티스트로 활동할 때 팬이 느는 속도(popSpeed)에 들어간다
function visB(p) { return (p.tal.looks - 50) * 0.2; }
function myRoom(s, mk) { return Math.max(0, 1 - s.fans[mk] / FANCAP[mk]); }
// 그룹·밴드처럼 나 말고 '팀'의 팬을 늘릴 때 (스타성 한계 cap 안에서)
function fanGainRaw(sc, cur, mult = 1, cap = 2.5e7) {
  sc = U.clamp(sc, 0, 100);
  const raw = Math.pow(10, sc / 18) * mult + cur * ((sc - (45 + Math.log10(1 + cur) * 4)) / 300);
  return Math.round(raw > 0 ? raw * Math.max(0, 1 - cur / cap) : raw);
}
function starCap(star, mk) { return FANCAP[mk] * (0.01 + 0.99 * Math.pow(U.clamp(star, 1, 100) / 100, 2.5)); }

// 차트와 저작권료
function chartFromScore(sc) {
  if (sc >= 90) return 1;
  if (sc >= 82) return U.int(1, 5);
  if (sc >= 74) return U.int(4, 15);
  if (sc >= 66) return U.int(12, 40);
  if (sc >= 58) return U.int(35, 100);
  return null;
}
function chartText(peak) { return peak ? `음원 차트 최고 ${peak}위` : '음원 차트 100위 밖'; }
function royaltyFromScore(sc, mult) { return Math.round(Math.pow(Math.max(0, sc - 42), 2.2) * 800 * mult); }
// 같은 곡에 가창·작곡처럼 여러 몫이 있으면 한 줄로 합친다. 매달 5%씩 줄고, 처음의 4% 밑으로는 안 떨어진다
function addCatalog(s, title, kind, sc, mult, job) {
  const m = royaltyFromScore(sc, mult);
  if (m <= 0) return 0;
  const c = s.catalog.find(x => x.title === title && s.t - x.t <= 3);
  if (c) { c.m += m; c.m0 += m; c.floor += Math.round(m * 0.04); if (!c.kind.split('·').includes(kind)) c.kind += '·' + kind; return m; }
  const j = job || EARN_JOB || null;
  s.catalog.push({ title, kind, m, m0: m, floor: Math.round(m * 0.04), t: s.t, job: j, co: ownCo(s, j) ? 1 : 0 });
  return m;
}
// 노래 한 곡의 성적 점수 (0~100). perf: 무대에 서는 사람들의 실력, q: 곡 완성도, fans: 지금 팬, tier: 회사 크기
function songScore(s, o) {
  return U.clamp(o.perf * 0.5 + o.q * 0.35 + Math.log10(1 + o.fans) * 3.2 + (o.tier || 0) * 4 + (o.trend ? 5 : 0) + (o.bonus || 0) + U.normal(0, 7) + 4, 0, 100);
}
// 음악방송 1위 횟수 (v131): 곡 점수가 높아도 팬 투표가 받쳐 줘야 한다. 그룹 팬 2만 명 아래는 한 번까지, 10만 명 아래는 세 번까지
function showWins(sc, fans) { const w = sc >= 75 ? U.int(1, Math.max(1, Math.round((sc - 70) / 3))) : (sc >= 70 && U.chance(0.3) ? 1 : 0); return Math.min(w, fans < 2e4 ? 1 : fans < 1e5 ? 3 : 99); }
// 회사나 남이 써 준 곡의 완성도
function boughtQ(tier) { return 24 + tier * 7 + U.normal(0, 7); }

// ───── 곡 컨셉과 컨셉 숙련도 ─────
// 컨셉은 TRENDS(청량·강렬·큐티…)와 같은 목록이다. 해마다 유행 컨셉(s.trend)가 바뀌고, 그룹마다 대표 컨셉(sig)가 있다
// 내가 곡을 쓸 때 컨셉을 고른다. 같은 컨셉으로 많이 쓸수록 숙련도(0~100)가 올라 곡 완성도가 좋아진다
function cmGet(s, c) { return (s.cmast && s.cmast[c]) || 0; }
function cmGain(s, c, amt) { if (!c) return; s.cmast = s.cmast || {}; const m = cmGet(s, c); s.cmast[c] = Math.min(100, m + amt * (1 - m / 100) * (0.6 + me(s).tal.creative / 100)); }
function cmBonus(s, c) { return (cmGet(s, c) - 20) / 8; }
function cmLine(s) { const L = TRENDS.filter(c => cmGet(s, c) >= 1).sort((a, b) => cmGet(s, b) - cmGet(s, a)); return L.length ? L.map(c => `${c} ${Math.floor(cmGet(s, c))}`).join(' · ') : '아직 없음'; }
// 직업 창의 숙련도 막대: 1 이상인 컨셉과 지금 유행하는 컨셉 (높은 것부터)
function cmBars(s) { return TRENDS.filter(c => cmGet(s, c) >= 1 || c === s.trend).sort((a, b) => cmGet(s, b) - cmGet(s, a)).map(c => ({ n: c, v: cmGet(s, c), tag: c === s.trend ? '유행' : '' })); }
// 선택지 글자 안의 작은 막대 (5칸): 숙련도 52 → ▰▰▰▱▱
function gauge(v) { const n = Math.round(U.clamp(v, 0, 100) / 20); return '▰'.repeat(n) + '▱'.repeat(5 - n); }
// ───── 컨셉 궁합 (v97, 8-4 사용자 표) ─────
// 무대에 서는 사람들(ppl)의 재능 · 나이 · 랩을 본다. b: 곡 점수에 더하는 것, half: 나이와 안 맞아 반응이 반토막, rap: 판정에 넣을 평균 랩 레벨
// 재능: 평균이 50에서 벗어난 만큼 (하나면 1점에 0.2, 둘이면 0.1씩)
// 큐티 · 하이틴: 평균 나이 25세 이상이면 반토막. 그 아래에서도 어릴수록 조금 낫다 (21세 0, 17세 +4, 24세 −3)
// 레트로 (v98): 예술 감각 + 데뷔 연차 yrs. 오래 활동한 가수일수록 '추억' 반응이 조금 더 (4년 0, 6년 +1, 8년 +2, 10년부터 +3). 신인은 손해 없음
function pplAge(s, ppl) { return ppl.reduce((a, x) => a + (x.id === s.me ? age(s) : pAge(s, x)), 0) / ppl.length; }
function cFit(s, c, ppl, yrs) {
  const F = CONCEPT_FIT[c], R = { b: 0, half: false, rap: null, nost: 0 };
  if (!F || !ppl || !ppl.length) return R;
  if (F === 'young') { const A = pplAge(s, ppl); R.b = U.clamp(21 - A, -4, 4); R.half = A >= 25; }
  else if (F === 'rap') R.rap = ppl.reduce((a, x) => a + lv(x, 'rap'), 0) / ppl.length;
  else R.b = F.reduce((a, k) => a + (ppl.reduce((x, y) => x + (y.tal[k] || 50), 0) / ppl.length - 50) * 0.2, 0) / F.length;
  if (c === '레트로' && yrs) { R.nost = U.clamp((yrs - 4) * 0.5, 0, 3); R.b += R.nost; }
  return R;
}
// 가수 연차 (v98): 내가 가수로 무대에 선 개월 수 s.stageM (아이돌 데뷔 뒤 · 솔로 · 밴드 활동. 연습생과 밴드 멤버 모으기는 빼고, 한 달에 한 번만 센다)
function onStage(s) { const T = s.tracks; return !!(T.idol && T.idol.st === 'active') || ['solo', 'band'].some(k => T[k] && (T[k].st === 'indie' || T[k].st === 'signed')); }
// 예전 세이브: 솔로 · 밴드를 한 개월 수와 지금 아이돌 그룹의 데뷔 뒤 개월 수로 어림한다
function stageGuess(s) { const M = s.carM || {}, T = s.tracks; return (M.solo || 0) + (M.band || 0) + (T.idol && T.idol.st === 'active' ? T.idol.months || 0 : 0); }
function stageMonth(s) { if (s.stageM == null) s.stageM = stageGuess(s); if (onStage(s)) s.stageM++; }
function stageYrs(s) { return (s.stageM != null ? s.stageM : stageGuess(s)) / 12; }
// 반토막: 팬이 느는 반응이 반으로 줄 만큼 곡 점수를 깎는다 (점수 자체를 반으로 하면 팬이 크게 빠진다)
const C_HALF = 6;
function cScoreB(R) { return R.b - (R.half ? C_HALF : 0); }
// 힙합: 무대에 서는 사람의 랩을 실력에 보통으로 섞는다
function cPerf(perf, R) { return R.rap == null ? perf : jobMix([[perf, JS_], [R.rap, JM_]]); }
// 나이와 맞는 컨셉인가 (반토막이 아닌가). pad: 회사가 고를 때는 1살 여유를 둔다 (준비하는 사이 25세를 넘기지 않게)
function cAgeOK(s, ppl, c, pad = 0) { if (CONCEPT_FIT[c] !== 'young' || !ppl.length) return true; return pplAge(s, ppl) + pad < 25; }
function cNote(s, R, title) {
  if (R.half) addLog(s, `「${title}」 컨셉이 나이와 어울리지 않는다는 말이 많았다. 반응이 반토막 났다.`, 'bad');
  if (R.nost >= 2) addLog(s, `「${title}」 오래 활동한 가수의 레트로라 추억이 떠오른다는 반응이 많았다.`, 'good');
}
// '청량'이다 / '큐티'다 처럼 따옴표 낱말 뒤 '이다'
function qIda(w) { return `'${w}'` + josa(w, '이').slice(w.length) + '다'; }
function cTag(s, c, sig) { return sig && c === sig ? '그룹 대표 컨셉' : ''; }
// 컨셉 고르기 창. d.cb: 고른 뒤에 할 일(SONG_CB), d.what: 무엇을 쓰는지, d.sig: 어울리는 대표 컨셉
const SONG_CB = {};
function pickConcept(s, d) { if (s.pending) queueEv(s, 'song_concept', 0, d, true); else fireEvent(s, 'song_concept', d); return ''; }
// 그 곡으로 무대에 서는 사람들 (솔로 · 밴드 · 내 회사 그룹). 작곡가처럼 남에게 주는 곡은 모른다(null)
function cPplOf(s, d) { return d.cb === 'solo' || d.cb === 'soloT' ? [me(s)] : d.cb === 'band' || d.cb === 'bandT' || d.cb === 'bandQ' ? [me(s)].concat(bandMembers(s, s.tracks.band)) : d.cb === 'coT' && typeof coGroup === 'function' && coGroup(s, d.gid) ? coP(s, coGroup(s, d.gid).members) : null; }
E({
  id: 'song_concept', cat: '곡 작업', title: '어떤 컨셉으로 쓸까?', tag: 'career',
  cond: s => true,
  text: (s, d) => `${d.what} 컨셉을 정하자. 요즘 유행은 ${qIda(s.trend)}.${d.sig ? ` ${d.sigN || '우리'}의 대표 컨셉은 ${qIda(d.sig)}.` : ''}`,
  ch: (s, d) => { const P = cPplOf(s, d); return TRENDS.map(c => ({ t: c, tr: c === s.trend, sig: !!d.sig && c === d.sig, h: `숙련도 ${gauge(cmGet(s, c))} ${Math.floor(cmGet(s, c))}${cTag(s, c, d.sig) ? ' · ' + cTag(s, c, d.sig) : ''}${d.cur === c ? ' · 지금 컨셉' : ''}${P && !cAgeOK(s, P, c) ? ' · 나이와 안 맞아 반응이 반토막' : ''}`, f: s => SONG_CB[d.cb](s, d, c) })); },
});
// 제목 짓기: 내가 저작권을 가진 창작물(내가 쓴 곡·가사·원고)은 제목을 직접 정한다. 처음에는 무작위로 추천한 제목이 들어 있다
// d: { cb: TITLE_CB 이름, title: 추천 제목, what: '○○의' (창 문장에 쓴다) } — 정한 제목은 d.title에 들어간 채로 TITLE_CB에 넘어간다
const TITLE_CB = {};
function askTitle(s, cb, d) { d.cb = cb; if (s.pending) queueEv(s, 'title_pick', 0, d, true); else fireEvent(s, 'title_pick', d); return ''; }
E({
  id: 'title_pick', cat: '제목 짓기', title: '제목 정하기', tag: 'career',
  cond: s => true,
  text: (s, d) => `${d.what} 제목을 정하자.`,
  form: (s, d) => [{ k: 'title', label: '제목', value: d.title, max: 24 }],
  submit(s, d, v) {
    const t = (v.title || '').trim().replace(/[「」]/g, '');
    if (!t) return { err: '제목은 비울 수 없어요' };
    d.title = t;
    return { log: TITLE_CB[d.cb](s, d) };
  },
});

const COMMENTS = {
  great: ['이번 노래 진짜 미쳤다', '1위 축하해!!', '무한 반복 중', '드디어 대중픽', '연말 무대 다 휩쓸자', '길거리에서 이 노래만 나온다'],
  good: ['수록곡까지 다 좋다', '컨셉 찰떡', '역주행 가자', '무대 보고 입덕함', '음색 미쳤다'],
  meh: ['타이틀 좀 아쉽다', '회사 일 좀 해라', '홍보가 너무 없어', '그래도 무대는 좋았어', '다음엔 더 잘될 거야'],
  bad: ['이번엔 좀...', '컨셉 누가 정했냐', '팬들만 듣는 노래', '다음엔 잘하자', '노래는 좋은데 왜 안 뜨지'],
};
const NICK_COMMENTS = {
  great: ['{n} 오늘도 미쳤다', '우리 {n} 1위 축하해', '{n} 없으면 못 살아'],
  good: ['{n} 파트 너무 좋아', '{n} 표정 뭐야', '{n} 많이 늘었다'],
  meh: ['{n} 분량 더 줘라', '{n}만 보고 산다', '{n} 고생했어'],
  bad: ['그래도 {n} 최고였어', '{n} 울지 마', '{n} 다음엔 꼭 잘될 거야'],
};
// ───── 정산서 (v118 UI C2) ─────
// 돈이 걸린 결과마다 표로: 받은 돈 → 회사 몫 → 밴드 · 그룹 몫 → 다른 멤버 몫 → 내 몫. 내 몫에서 갚을 비용(t.debt)을 먼저 갚는다
// 가장 최근 정산서를 t.lastBill과 s.bills[돈 이름]에 둔다 (결과 창의 '🧾 정산서', 재정 창의 수입 줄에서 다시 본다)
const BILL_WHAT = { '공연 정산': '공연 수익', '공연 수입': '공연 수익', '앨범·음원 정산': '앨범 · 음원 매출', '음반·음원 정산': '음반 · 음원 매출', '페스티벌 출연료': '출연료', '행사·광고·콘서트': '행사 · 광고 · 콘서트 매출' };
function billRows(o) {
  const n = Math.max(1, o.n || 1), cut = o.cut || 0, team = o.rev * (1 - cut), R = [[BILL_WHAT[o.what] || o.what, o.rev]];
  if (cut > 0) R.push([`회사 몫 (${Math.round(cut * 100)}%)`, -o.rev * cut], '-', [n > 1 ? `${o.team || '팀'} 몫` : '내 몫', team, n > 1 ? 0 : 1]);
  if (n > 1) R.push([`다른 멤버 몫 (${n - 1}명)`, -team * (n - 1) / n], '-', [`내 몫 (${n}명 중 1명)`, team / n, 1]);
  return R;
}
function billPay(s, o) {
  const R = billRows(o), mine = Math.max(0, R[R.length - 1][1]), t = o.t;
  let share = mine, pay = 0;
  if (t && t.debt > 0 && share > 0) { pay = Math.min(t.debt, share); t.debt -= pay; share -= pay; }
  // 비용을 한 번 다 갚은 뒤(firstPay)에는 '빚을 갚았다'가 아니라 이번 비용을 제외했다고만 쓴다 (v124)
  const done = !!t && !!t.firstPay, cn = o.costN || '제작 비용';
  const note = !pay ? '' : done ? (share > 0 ? `${cn} ${fmtBill(pay)}을 제외한 ${fmtBill(share)}이 정산됐다.` : `내 몫 ${fmtBill(mine)}은 모두 ${cn}에 들어갔다. 다음 정산에서 제외할 비용 ${fmtWon(t.debt)}.`) : share > 0 ? `내 몫 ${fmtBill(mine)} 중 ${fmtBill(pay)}은 남은 비용을 갚는 데 들어갔다. 이걸로 비용을 다 갚았다.` : `내 몫 ${fmtBill(mine)}은 ${o.costN || '제작 비용'}을 갚는 데 들어갔다. 남은 비용 ${fmtWon(t.debt)}.`;
  const bill = { t: o.title || o.what, rows: R, note };
  if (t) t.lastBill = bill;
  (s.bills = s.bills || {})[o.what] = bill;
  if (share > 0) earn(s, share, o.what, o.job);
  return { share, pay, mine, bill };
}
// 정산서 숫자: 1억 원 밑은 만 원 아래 한 자리까지 (38.6만 원)
function fmtBill(v) { const m = Math.round(Math.abs(v) / 1e3) / 10; return Math.abs(v) >= 1e8 ? fmtWon(Math.abs(v)) : `${m.toLocaleString()}만 원`; }
// 연습생 · 제작 비용을 다 갚은 순간 (v118 UI C4): 기분 좋은 순간이라 창으로
function debtClear(s, k, t) {
  milestone(s, `${age(s)}세에 처음으로 ${k === 'band' ? '밴드' : '그룹'} 정산을 받았다.`);
  queueEv(s, 'debt_clear', 0, { fromTr: k !== 'band' || !!t.fromTr }, true);
}
E({
  id: 'debt_clear', cat: '정산', title: '비용을 다 갚았다!', tag: 'career', keepPop: true,
  text: (s, d) => `${d.fromTr ? '연습생 시절 비용과 ' : ''}앨범 제작비를 다 갚았다. 이제부터는 정산금이 내 손에 들어온다!`,
  ch: (s, d) => [{ t: '드디어!', f: () => `${d.fromTr ? '연습생 시절 비용과 ' : ''}앨범 제작비를 다 갚았다. 이제부터 정산이 들어온다!` }],
});

// ───── 유행을 바꾼 곡 (v165) ─────
// 유행이 아닌 컨셉으로 낸 내 그룹 곡(내 회사 그룹 포함)이 차트 최고 1위 + 음악방송 1위 6회 이상이면, 그 컨셉이 새 유행이 될 수 있다
// v166: 확률은 6회에 50%, 6회를 넘는 1위 한 번마다 8%씩 (9회 74% · 12회 98%). v167: 솔로도 음악방송에 나가서 해당된다. 밴드는 해당 없음
// 한 번 바뀌면 2년 동안은 다시 일어나지 않고, 1년 동안은 유행이 저절로 바뀌지 않는다 (s.trendLock)
function hitTrendP(peak, wins) { return peak === 1 && wins >= 6 ? Math.min(1, 0.5 + 0.08 * (wins - 6)) : 0; }
function hitTrend(s, c, peak, wins) {
  if (!c || c === s.trend || !TRENDS.includes(c) || (s.cd.hitTr || 0) > s.t) return false;
  const p = hitTrendP(peak, wins || 0);
  return p > 0 && U.chance(p);
}
function hitTrendGo(s, c, title, by) {
  const old = s.trend;
  s.trend = c; s.trendLock = s.t + 12; s.cd.hitTr = s.t + 24;
  queueEv(s, 'trend_hit', 0, { c, old, title, by }, true);
}
E({
  id: 'trend_hit', cat: '음원 성적', title: '유행을 바꾼 곡', tag: 'career', keepPop: true,
  text: (s, d) => `${d.by}의 ${josa(`「${d.title}」`, '이가')} 크게 히트하면서 차트 판도가 바뀌었다.\n\n요즘 차트에는 '${d.c}' 컨셉 곡이 쏟아지고, 다른 기획사들도 앞다투어 '${d.c}' 컨셉 앨범을 준비한다고 한다. 얼마 전까지 유행이던 '${d.old}' 컨셉은 한물간 분위기다.\n\n'${d.c}' 유행을 연 사람들로 이름이 오르내린다.`,
  ch: (s, d) => [{ t: '확인', f: s => { cmGain(s, d.c, 6); return `${josa(`「${d.title}」`, '이가')} 유행을 바꿨다. 요즘 유행은 '${d.c}' 컨셉이다.` + fx(s, { fame: 3, rep: 1 }); } }],
});

// ───── 곡 발매 결과 카드 (v118 UI C1) ─────
// 결과 창 맨 위 카드: 제목 · 최고 순위 · 팬 변화 · 듣는 사람 반응 3줄 · 지난 곡과 비교 · 정산서. s.works의 card로 남아 작품 탭 · 요약 창에서 다시 본다
// 반응 3줄: 점수에 들어간 것 중 가장 좋은 것, 가장 아쉬운 것, 그 밖 하나를 사람 말로. 숫자 · 강점 / 약점 표시는 없고 순서도 섞는다
// 반응 재료: z(좋을수록 큼, 대략 -1~1), g(좋을 때 말), b(아쉬울 때 말)
const RX = {
  q: q => ({ z: (q - 40) / 15, g: ['멜로디가 귀에 착 감긴다', '후렴이 하루 종일 맴돈다'], b: ['곡이 조금 밋밋하다', '어디서 들어 본 듯한 곡이다'] }),
  // 팬: 팬이 많을수록 좋게 보지만, 이번에 팬이 오히려 줄었으면 늘 아쉬운 쪽
  fans: (f, gain) => gain < 0 ? { z: -0.6, g: ['그래도 남은 팬들은 끝까지 들어 준다'], b: ['팬들 반응도 예전 같지 않다', '기존 팬들도 고개를 갸웃한다'] } : { z: (Math.log10(1 + f) - 4) / 1.2, g: ['기다리던 팬들이 바로 반응했다', '나오자마자 팬들이 여기저기 퍼 날랐다'], b: ['아직 아는 사람이 적다', '들어 볼 사람한테까지 닿지를 않는다'] },
  // v165: fresh면 유행이 아니던 곡이 크게 떠서 유행을 바꾼 것. '결이 다르다' 대신 신선하다는 말
  trend: (on, fresh) => fresh ? { z: 0.8, g: ['요즘 이런 노래가 없었는데 신선하다', '다들 비슷한 노래만 낼 때 혼자 튄다', '처음 듣는 느낌인데 자꾸 생각난다'], b: ['요즘 이런 노래가 없었는데 신선하다'] } : { z: on ? 0.7 : -0.5, g: ['요즘 듣는 노래랑 결이 맞는다'], b: ['요즘 듣는 노래랑은 결이 다르다'] },
  tw: tw => ({ z: (tw - 50) / 40, g: ['합이 착착 맞는다', '서로 숨소리까지 맞춘 느낌이다'], b: ['합이 조금 어긋난다', '각자 따로 노는 느낌이다'] }),
  cf: b => ({ z: b / 4, g: ['컨셉이 잘 어울린다'], b: ['컨셉이 안 맞는 것 같다'] }),
  promo: tier => ({ z: (tier - 1.2) / 1.2, g: ['홍보가 제대로 됐다'], b: ['어디서 나왔는지 모르는 사람이 많다'] }),
};
// 평가 색 표시 (v132): 좋은 평은 초록, 나쁜 평은 빨강, 애매한 평은 표시 없이 검정. 화면(ui.js evCol · rich)이 색으로 바꾼다. 기록에 넣을 때는 evPlain으로 뗀다
function evG(x) { return '\u0005' + x + '\u0007'; }
function evB(x) { return '\u0006' + x + '\u0007'; }
function evPlain(x) { return String(x).replace(/[\u0005\u0006\u0007]/g, ''); }
function songReact(F) {
  F = F.filter(f => f && isFinite(f.z));
  if (!F.length) return [];
  const S = F.slice().sort((a, b) => b.z - a.z), say = f => { const x = `"${U.pick(f.z >= 0 ? f.g : f.b)}"`; return f.z >= 0.25 ? evG(x) : f.z <= -0.25 ? evB(x) : x; };
  const L = [say(S[0])];
  if (S.length > 1) L.push(say(S[S.length - 1]));
  if (S.length > 2) L.push(say(U.pick(S.slice(1, -1))));
  return U.shuffle(L);
}
// 쓴소리 한 줄 (댓글 모니터링에서 '쓴소리까지 다 본다'를 고르면 카드에 더해진다)
// 위 반응에 이미 나온 말은 다시 쓰지 않는다 (남은 말이 없으면 쓴소리만)
function songHarsh(F, used) { const f = F.filter(f => f && isFinite(f.z)).sort((a, b) => a.z - b.z)[0], tail = U.pick(['솔직히 실망이다', '이번 건 그냥 넘길게', '전 곡이 더 나았다', '이걸 왜 냈는지 모르겠다']); const seen = (used || []).map(evPlain), left = f ? f.b.filter(x => !seen.includes(`"${x}"`)) : []; return `"${left.length ? `${U.pick(left)}. ${tail}` : tail}"`; }
// 지난 곡과 비교 (o.prevSc에 이번 점수를 남긴다)
function songCmp(o, sc) { const p = o.prevSc; o.prevSc = sc; return p == null ? '' : sc - p >= 4 ? '지난 곡보다 반응이 낫다' : sc - p <= -4 ? '지난 곡보다 반응이 아쉽다' : '지난 곡과 반응이 비슷하다'; }
function songCardMake(o, F, sc, prevHolder) { const L = songReact(F); return { t: o.t, by: o.by || '', peak: o.peak || 0, wins: o.wins || 0, fans: o.fans || [], lines: L, cmp: songCmp(prevHolder, sc), harsh: songHarsh(F, L), bill: o.bill || null, pay: o.pay != null ? Math.round(o.pay) : null }; }
// 카드가 있는 결과 창 (v119): html이 있으면 창에 본문(text)이 안 나오므로 본문을 카드 위에 붙인다 (v118에서 본문이 빠져 있었다)
function cardText(s, d) { const p = s.pending, ev = p && p.d === d ? EVENTS[p.id] : null; return ev && typeof rich === 'function' ? `<div class="m-text">${rich(ev.text(s, d))}</div>` : ''; }
// 결과 창 선택지: 댓글 모니터링
// 쓴소리까지 다 보면 (v131): 스트레스가 크게 오르고(예전의 7~8배), 대신 절반 확률로 그 직업의 대표 특기가 1레벨 오른다
function harshGain(s, job) {
  const c = CAREERS[job], k = c && c.mainSk ? c.mainSk(s, s.tracks[job]) : null, p = me(s);
  if (!k || !has(p, k) || !U.chance(0.5)) return '';
  const sk = p.sk[k]; sk.lv = Math.min(100, sk.lv + 1); sk.best = Math.max(sk.best || 0, sk.lv); sk.pot = Math.max(sk.pot || 0, sk.lv); sk.last = s.t;
  return ` 아픈 말을 곱씹으며 연습했다. (${SKILLS[k].n} +1레벨)`;
}
function songCommentCh(s, d, line, job) {
  const add = x0 => { const x = evB(x0); d.card.lines.push(x); const w = s.works.slice().reverse().find(w => w.card && w.card.t === d.card.t); if (w && w.card !== d.card) w.card.lines.push(x); };
  return [
    { t: '쓴소리까지 다 본다', f: s => { if (d.card && d.card.harsh) add(d.card.harsh); return line + (d.card && d.card.harsh ? ` 아픈 댓글도 봤다. ${d.card.harsh}` : '') + harshGain(s, job) + fx(s, { stress: 30 }); } },
    { t: '좋은 댓글만 본다', f: s => line + fx(s, { stress: -3 }) },
    { t: '댓글은 안 본다', f: () => line },
  ];
}
function comments(sc, nick) {
  const k = sc >= 80 ? 'great' : sc >= 65 ? 'good' : sc >= 52 ? 'meh' : 'bad';
  const list = U.shuffle(COMMENTS[k]).slice(0, 2);
  if (nick) list[U.int(0, 1)] = U.pick(NICK_COMMENTS[k]).replace('{n}', nick);
  return list.map(c => `"${c}"`).join(' ');
}

// ───── 활동명(예명)과 애칭 ─────
// 직업마다 따로 정한다. 정하지 않았으면 본명을 쓴다
const CAREER_SHORT = { idol: '아이돌', band: '밴드 멤버', solo: '가수', player: '연주가', composer: '작곡가', lyricist: '작사가', producer: '프로듀서' };
function actName(s, trk) { const sn = s.tracks[trk] && s.tracks[trk].sn; return sn && (sn.sur + sn.given) ? sn.sur + sn.given : me(s).name; }
function actNick(s, trk) { const sn = s.tracks[trk] && s.tracks[trk].sn; return sn && sn.nick ? sn.nick : ''; }
// '하린'이라는 / '수아'라는 처럼 따옴표 이름 뒤 조사
function qn(w, after) { return `'${w}'` + josa(w, '이').slice(w.length) + after; }
function qro(w) { return `'${w}'` + josa(w, '으로').slice(w.length); }
const LOOK_NICK = { '강아지상': '댕댕이', '고양이상': '냥이', '토끼상': '토끼', '여우상': '여우', '곰돌이상': '곰돌이', '앳된 인상': '아기', '소년 같은 인상': '소년' };
function genNick(s, given) {
  // 버튜버 RP 이름(하루노 유이)은 이름 쪽으로만 애칭을 만든다. '이'로 끝나면 '이이' 대신 '유이쨩'
  given = vtGiven(given);
  const p = me(s), last = given.slice(-1);
  const out = [last === '이' ? `${given}쨩` : last + last, josa(given, '이')];
  const ln = LOOK_NICK[p.look];
  if (ln) out.push(ln === '아기' || ln === '소년' ? `${ln} ${given}` : `${given}${ln}`);
  out.push(p.g === '여' ? U.pick([`${given} 공주`, `요정 ${given}`, `${last}뿅`]) : U.pick([`${given} 왕자`, `댕${last}`, `${last}뭉이`]));
  return U.pick([...new Set(out)]);
}
// 활동명 바꾸기: 내가 직접 정한 활동명만 바꿀 수 있다 (회사가 정해 준 이름은 못 바꾼다)
// 예전 세이브에는 누가 정했는지 기록이 없어서, 회사와 데뷔한 음악 쪽(아이돌·밴드·솔로)만 회사가 정한 걸로 본다
function snSelf(s, id) {
  const t = s.tracks[id];
  if (!t || !t.sn) return false;
  if (t.sn.self != null) return t.sn.self;
  return !(['idol', 'band', 'solo'].includes(id) && t.ag);
}
E({
  id: 'stage_rename', cat: '활동명', title: '활동명 바꾸기', tag: 'career',
  init(s, d) { d.old = Object.assign({}, s.tracks[d.trk].sn); },
  text: (s, d) => `${CAREER_SHORT[d.trk] || '활동'} 활동명을 바꾼다. 지금 활동명은 ${qn(d.old.sur + d.old.given, '다')}.`,
  form: (s, d) => [
    { k: 'sur', label: '성 (활동명)', value: d.old.sur, max: 4, ph: '비워 두면 이름만 쓴다' },
    { k: 'given', label: '이름 (활동명)', value: d.old.given, max: 10 },
    { k: 'nick', label: '애칭 (팬들이 부르는 이름)', value: d.old.nick || '', max: 12 },
  ],
  cancel: () => '활동명을 그대로 쓰기로 했다.',
  submit(s, d, v) {
    const sur = (v.sur || '').trim(), given = (v.given || '').trim(), nick = (v.nick || '').trim();
    if (!given) return { err: '이름 칸은 비울 수 없어요' };
    const t = s.tracks[d.trk];
    if (!t) return {};
    const before = d.old.sur + d.old.given, nm = sur + given;
    t.sn = { sur, given, nick, self: true };
    if (nm !== before) milestone(s, `${age(s)}세에 활동명을 '${before}'에서 ${qro(nm)} 바꿨다.`);
    return { log: nm !== before ? `활동명을 '${before}'에서 ${qro(nm)} 바꿨다.${nick ? ` 팬들은 나를 ${qn(nick, '라고')} 부른다.` : ''}` : (nick ? `애칭을 ${qro(nick)} 바꿨다.` : '활동명을 그대로 쓰기로 했다.') };
  },
});
// 회사와 데뷔하면 회사가 정해 주고(by), 혼자 시작하면 직접 정한다
function askStageName(s, trk, by) {
  const t = s.tracks[trk];
  if (!t || t.sn) return;
  const other = CAREER_IDS.filter(id => id !== trk).map(id => s.tracks[id].sn).find(Boolean);
  const name = me(s).name, given = name.slice(1);
  if (by) {
    if (other) { t.sn = Object.assign({}, other, { self: false }); return; }
    const nm = trk === 'idol' ? given : U.chance(0.5) ? given : name;
    t.sn = { sur: nm === name ? name.slice(0, 1) : '', given: nm === name ? given : nm, nick: genNick(s, nm === name ? given : nm), self: false };
    const full = t.sn.sur + t.sn.given, nk = t.sn.nick;
    addLog(s, `${by}에서 활동명을 ${qro(full)} 정해 줬다. 팬들은 ${qn(nk, '라고')} 부르기 시작했다.`, 'career');
    milestone(s, `${age(s)}세부터 ${qn(full, '라는')} 활동명을 썼다.`);
    return;
  }
  if (s.pending) queueEv(s, 'stage_name', 0, { trk });
  else fireEvent(s, 'stage_name', { trk });
}
E({
  id: 'stage_name', cat: '활동명', title: '활동명 정하기', tag: 'career',
  init(s, d) {
    const name = me(s).name;
    const other = CAREER_IDS.filter(id => id !== d.trk).map(id => s.tracks[id].sn).find(Boolean);
    d.dv = other ? Object.assign({}, other) : { sur: name.slice(0, 1), given: name.slice(1), nick: genNick(s, name.slice(1)) };
  },
  text: (s, d) => `${josa(CAREER_SHORT[d.trk] || '활동', '으로')} 쓸 이름(활동명)을 정하자. 본명은 ${josa(me(s).name, '이')}다. 성은 비워 둬도 된다.\n\n애칭은 팬들이 나를 부르는 이름이다. 팬 반응 댓글에 나온다.`,
  form: (s, d) => [
    { k: 'sur', label: '성 (활동명)', value: d.dv.sur, max: 4, ph: '비워 두면 이름만 쓴다' },
    { k: 'given', label: '이름 (활동명)', value: d.dv.given, max: 10 },
    { k: 'nick', label: '애칭 (팬들이 부르는 이름)', value: d.dv.nick || '', max: 12 },
  ],
  submit(s, d, v) {
    const sur = (v.sur || '').trim(), given = (v.given || '').trim(), nick = (v.nick || '').trim();
    if (!given) return { err: '이름 칸은 비울 수 없어요' };
    const t = s.tracks[d.trk];
    if (!t) return {};
    t.sn = { sur, given, nick, self: true };
    const nm = sur + given;
    milestone(s, `${age(s)}세에 ${qn(nm, '라는')} 이름으로 ${CAREER_SHORT[d.trk]} 활동을 시작했다${nick ? ` (팬들은 ${qn(nick, '라고')} 불렀다)` : ''}.`);
    return { log: `${qn(nm, '라는')} 이름으로 활동하기로 했다.${nick ? ` 팬들은 나를 ${qn(nick, '라고')} 부른다.` : ''}` };
  },
});

// 함께 활동할 사람 (아이돌 멤버·연습생 동기·밴드 멤버·제자). 업계 사람으로 계속 남는다
// main: 가장 잘하는 특기. base: 평균 레벨
function makeMusicMate(s, o) {
  const tal = randTalents();
  for (const t of o.tal || []) tal[t] = Math.min(98, tal[t] + U.int(8, 22));
  const p = makePerson(s, { g: o.g, age: Math.max(13, o.age != null ? o.age : age(s) + U.int(-3, 3)), rel: o.rel, job: o.job, aff: o.aff != null ? o.aff : 35, tal, met: o.met, mkt: o.mkt });
  for (const k in o.sk) {
    const l = Math.round(U.clamp(U.normal(o.sk[k], 6), 3, 92));
    learnSkill(s, p, k, l); p.sk[k].best = l; p.sk[k].pot = Math.min(100, Math.max(l, Math.round(l + U.int(4, 30) * (0.6 + talFactor(p, k) / 110))));
  }
  p.ind = true; p.contactT = s.t;
  return p;
}
// 상대도 같이 일하면서 실력이 는다
function mateGrow(s, p, k, amt) { if (p && has(p, k)) practice(s, p, k, amt); }

// ───── 영입 제안 (메시지함) ─────
// 소속 없이 활동하는데 팬이 모이면 회사들이 먼저 연락한다
function scoutOffer(s, kind) {
  const f = totalFans(s);
  const maxTier = f >= 1e6 ? 3 : f >= 1e5 ? 2 : f >= 8000 ? 1 : 0;
  if (!maxTier) return null;
  const pool = musicAgencies().filter(a => a.tier <= maxTier && langOK(s, a) && (kind !== 'band' || a.mkt === 'kr'));
  if (!pool.length) return null;
  const a = U.shuffle(pool).sort((x, y) => y.tier - x.tier)[0];
  return { ag: a.id, bonus: Math.round((f * U.fl(15, 45) + a.tier * 800e4) / 1e5) * 1e5, cut: Math.round(U.clamp(a.cut - (maxTier - a.tier) * 0.05 - (f >= 1e6 ? 0.15 : f >= 1e5 ? 0.08 : 0), 0.25, 0.7) * 100) / 100, months: U.pick([36, 48, 60]) };
}
INBOX.ag_offer = {
  ic: '🤝',
  text: (s, m) => { const a = AG[m.d.ag]; return `${a.n}(${TIER_N[a.tier]} 기획사)에서 ${m.d.kind === 'band' ? '우리 밴드와' : '솔로 가수로'} 전속 계약을 하고 싶다는 연락이 왔다.\n\n계약금 ${fmtWon(m.d.bonus)} · 회사 몫 ${pctN(m.d.cut)} · ${yrs(m.d.months)} 계약`; },
  ch: (s, m) => [
    { t: '계약 조건을 들어 본다', ok: s => !agencyContract(s) && trackOn(s, m.d.kind), h: agencyContract(s) ? contractWhy(s) : !trackOn(s, m.d.kind) ? '지금은 그 활동을 하고 있지 않다' : '계약서를 보고 조건을 협상할 수 있다 · 회사가 홍보와 제작비를 맡는다', f: s => startNego(s, { kind: m.d.kind, ag: m.d.ag, agN: AG[m.d.ag].n, months: m.d.months, cut: m.d.cut, bonus: m.d.bonus, type: m.d.kind === 'solo' ? s.tracks.solo.type : null, lev: U.clamp(Math.log10(1 + totalFans(s)) / 7, 0.2, 0.9) }) },
    { t: '거절한다', f: s => `${AG[m.d.ag].n}의 영입 제안을 거절했다.` },
  ],
};
function maybeScout(s, kind) {
  if (agencyContract(s) || s.inbox.some(m => m.kind === 'ag_offer') || s.cd.agOffer > s.t) return;
  const o = scoutOffer(s, kind);
  if (!o) return;
  o.kind = kind;
  s.cd.agOffer = s.t + 12;
  sendMsg(s, 'ag_offer', { from: AG[o.ag].n, title: '전속 계약 제안', months: 6, d: o });
}

// 연말 시상식 (음악 직업 공통). best: 올해 가장 좋았던 점수, who: 상 이름 뒤에 붙일 말
// 받으면 상을 남기고, 후보에만 올라도 시상식 창(award_show)에 나온다. 한 해에 여러 직업이 후보면 한 창에 모은다
// 가수 신인상은 데뷔한 해에만: 아이돌 그룹·솔로·밴드 중 처음 데뷔한 해(s.flags.musicDebutY). 그 뒤로는 어떤 형태로 다시 데뷔해도 신인이 아니다
function musicRookie(s, debuted) { if (debuted && !s.flags.musicDebutY) s.flags.musicDebutY = calY(s); return !!s.flags.musicDebutY && s.flags.musicDebutY === calY(s); }
function musicAwards(s, t, who, rookie, job) {
  cereSeen(s, '가요');
  const yb = t.yearBest || 0; t.yearBest = 0;
  if (!yb) return;
  const newbie = rookie && !t.rookie;
  let won = null;
  if (newbie && yb >= 60) { t.rookie = true; won = '신인상'; }
  else if (yb >= 90 && totalFans(s) >= 1e6) won = '대상';
  else if (yb >= 80) won = '본상';
  const cat = won || (newbie && yb >= 50 ? '신인상' : yb >= 85 ? '대상' : yb >= 70 ? '본상' : null);
  if (!cat) return;
  if (won) award(s, `연말 시상식 ${won} (${who})`);
  ceremony(s, '가요', who, cat, !!won, job);
}
// 연말 시상식 창에 올릴 줄 (show: 가요·연기·연예). 한 해에 여러 시상식 후보면 한 창에 모은다
const CERE_N = { 가요: '연말 가요 시상식', 연기: '연기대상', 연예: '연예대상' };
// 상을 받았을 때 사건 창 위쪽 띠: 받은 상 이름을 '○○상을 받았다!'로 크게 쓰고, 트로피가 흔들리고 꽃가루가 떨어진다
function awardBanner(sub, names) {
  const last = names[names.length - 1], list = names.slice(0, -1).map(x => x + ', ').join('') + josa(last, '을를');
  let conf = '';
  for (let i = 0; i < 30; i++) conf += `<i style="left:${U.int(0, 98)}%;animation-delay:${U.fl(0, 2).toFixed(2)}s;animation-duration:${U.fl(1.8, 3.4).toFixed(2)}s;background:${U.pick(['#ffd34d', '#ff6fa8', '#7dd3fc', '#c4b5fd', '#4ade80', '#ffffff'])}"></i>`;
  return `<div class="aw-top win"><div class="aw-conf">${conf}</div><div class="aw-trophy">🏆</div><div class="aw-tx"><div class="aw-y">${U.esc(sub)}</div><div class="aw-t">${U.esc(list)} 받았습니다!</div></div></div>`;
}
// 상 이름: 연기대상·연예대상의 '대상'은 시상식 이름 그대로 쓴다 ('연기대상 대상' → '연기대상')
function cereName(show, cat) { return (show === '연기' || show === '연예') && cat === '대상' ? CERE_N[show] : `${CERE_N[show]} ${cat}`; }
function cereWinList(d) { const n = d.rows.filter(r => r.won).map(r => cereName(r.show, r.cat)), last = n.pop(); return n.map(x => x + ', ').join('') + josa(last, '을를'); }
// 아티스트로 활동하는 해에는 후보에 오르지 못해도 연말 시상식 창이 뜬다 (해마다 12월, musicAwards·actorAwards·varAwards가 부른다)
function cereSeen(s, show) {
  if (!s.cere || s.cere.y !== calY(s)) s.cere = { y: calY(s), rows: [] };
  if (!(s.cere.seen || []).includes(show)) s.cere.seen = (s.cere.seen || []).concat(show);
  queueEv(s, 'award_show', 0);
}
// 받은 상마다 늘어나는 팬(지금 팬의 비율 + 1,000명). 크지 않게
const AW_FAN = { 대상: 0.05, 작품상: 0.05, 최우수상: 0.03, 감독상: 0.03, 본상: 0.03, 우수상: 0.02, 각본상: 0.02, 신인상: 0.02, 신인감독상: 0.02, 아역상: 0.02 };
// 수상 프리미엄 (피드백 24): 어느 시상식이든 상을 받으면 상금 대신 그 분야 보수에 프리미엄이 쌓인다 (예전 연예대상 방식을 모든 시상식에)
// 피드백 25: 화면에는 보여 주지 않고(숨긴 규칙), 크기를 예전의 60% 정도로 줄였다
// s.awPrem[직업] 더해진 배율, s.awN[직업] 받은 상 수. 보수를 정하는 곳마다 awMul(s, 직업)을 곱한다
const AW_PREM = { 신인상: 0.02, 아역상: 0.02, 신인감독상: 0.02, 우수상: 0.03, 본상: 0.03, 각본상: 0.035, 최우수상: 0.05, 감독상: 0.05, 대상: 0.07, 작품상: 0.07 };
const AW_PAY_N = { variety: '예능 출연료', actor: '출연료', director: '연출료', writer: '원고료', idol: '행사·광고·방송 수입', band: '공연 수입', solo: '공연·행사 수입', player: '세션 연주비' };
function awMul(s, job) { return 1 + ((s.awPrem || {})[job] || 0); }
function awAddPrem(s, job, v) {
  const m0 = awMul(s, job);
  s.awPrem = s.awPrem || {}; s.awN = s.awN || {};
  s.awPrem[job] = (s.awPrem[job] || 0) + v; s.awN[job] = (s.awN[job] || 0) + 1;
  // 예능: 지금 하는 고정 프로그램 출연료도 같은 비율로 올려 준다
  const t = s.tracks.variety;
  if (job === 'variety' && t && t.shows) for (const sh of t.shows) sh.fee = Math.round(sh.fee * awMul(s, job) / m0 / 1e4) * 1e4;
}
// 시상식 창의 프리미엄 (예전 세이브에 떠 있던 창은 예능 출연료 숫자 하나였다)
function awPremOf(d) { return typeof d.prem === 'number' ? (d.prem ? { variety: d.prem } : {}) : (d.prem || {}); }
// 시상식 줄이 어느 직업의 상인지 (예전 세이브의 줄에는 직업이 없다)
function cereJob(s, r) { return r.job || (r.show === '연예' ? 'variety' : r.show === '연기' ? 'actor' : r.show === '영화' ? (r.cat === '각본상' ? 'writer' : 'director') : ['idol', 'band', 'solo', 'player'].find(id => trackOn(s, id)) || 'solo'); }
function ceremony(s, show, who, cat, won, job) {
  if (!s.cere || s.cere.y !== calY(s)) s.cere = { y: calY(s), rows: [] };
  s.cere.rows.push({ show, who, cat, won: !!won, job });
  queueEv(s, 'award_show', 0);
}
// 시상식 후보로 함께 오르는 다른 사람들 (지어낸 이름). 가요는 가수·그룹, 연기·연예는 사람 이름
function fakeNominees(s, n, not, show) {
  const out = [];
  while (out.length < n) { const x = freshName(() => show && show !== '가요' ? genName(U.chance(0.5) ? '여' : '남', calY(s) - U.int(20, 45)) : U.chance(0.5) ? groupNameRaw() : U.chance(0.5) ? U.pick(BAND_NAMES) : genName(U.chance(0.5) ? '여' : '남', calY(s) - U.int(20, 45))); if (x !== not && !out.includes(x)) out.push(x); }
  return out;
}
E({
  // 후보에 오른 해만 발표 창을 띄운다. 후보에도 못 들면 창 없이 요약의 특별한 일에만 남는다 (턴제 실험 7차)
  id: 'award_show', cat: '연말 시상식', tag: 'career', keepPop: (s, d) => !!(d.rows && d.rows.length), autoNoHtml: true,
  live: (s, d) => d.live,
  cond: s => true,
  init(s, d) {
    if (!s.cere || (!s.cere.rows.length && !(s.cere.seen || []).length)) { d.skip = true; return; }
    d.y = s.cere.y;
    const order = { 대상: 0, 작품상: 0, 최우수상: 1, 감독상: 1, 본상: 2, 각본상: 2, 우수상: 3, 신인상: 4, 신인감독상: 4, 아역상: 5 }, so = { 가요: 0, 연기: 1, 연예: 2, 영화: 3 };
    d.rows = s.cere.rows.slice().sort((a, b) => (so[a.show || '가요'] - so[b.show || '가요']) || (order[a.cat] - order[b.cat])).map(r => {
      const show = r.show || '가요', others = fakeNominees(s, 4, r.who, show), noms = U.shuffle(others.concat(r.who));
      return { show, who: r.who, cat: r.cat, won: r.won, job: cereJob(s, r), noms, winner: r.won ? r.who : U.pick(others) };
    });
    d.shows = [...new Set(d.rows.map(r => r.show).concat(s.cere.seen || []))].sort((a, b) => so[a] - so[b]);
    d.won = d.rows.some(r => r.won);
    // 상을 받으면 그 분야 보수에 프리미엄이 붙고(받을 때마다 쌓인다, AW_PREM) 팬이 는다. 받는 건 확인을 누를 때 (피드백 17·18·24)
    d.fans = 0; d.prem = {};
    for (const r of d.rows) if (r.won) {
      d.prem[r.job] = (d.prem[r.job] || 0) + (AW_PREM[r.cat] || 0.02);
      d.fans += Math.round(totalFans(s) * (AW_FAN[r.cat] || 0.02) + 1000);
    }
    // 실시간 창 (12-1): 가수 · 아이돌로 가요 시상식 후보에 오르면, 상 발표 전에 최근 곡 무대를 시상식에서 한 번 더 한다
    const mr = d.rows.find(r => r.show === '가요' && (r.job === 'idol' || r.job === 'solo'));
    const mw = mr && s.works.slice().reverse().find(w => w.card && w.card.live && w.card.live.k === mr.job && w.y >= d.y - 1);
    if (mw) d.live = liveAgain(mw.card.live, { place: CERE_N[mr.show] });
    s.cere = null;
  },
  // 제목에는 결과를 쓰지 않는다 (발표 전까지 모른다)
  title: (s, d) => d.shows && d.shows.length === 1 ? CERE_N[d.shows[0]] : '올해의 시상식',
  text: (s, d) => (d.rows.length ? d.rows.map(r => `[${CERE_N[r.show]}] ${r.cat} 후보: ${r.noms.join(', ')}\n→ ${r.won ? `${r.who} 수상!` : `수상은 ${r.winner}.`}`).join('\n\n') + '\n\n' : '') + (d.won ? `${cereWinList(d)} 받았습니다!` : '올해는 어떤 상도 받지 못했습니다...'),
  html(s, d) {
    const wins = d.rows.filter(r => r.won), sub = `${d.y} ${d.shows.map(x => CERE_N[x]).join(' · ')}`, open = !!d.revealed;
    // 발표 전: 2~3초 동안 후보만 보인다. 발표 뒤: 받은 상은 위쪽 띠에 크게 쓰고 꽃가루를 날린다
    let h = `<div class="aw">`;
    if (!open) h += `<div class="aw-top drum"><div class="aw-trophy">🥁</div><div><div class="aw-y">${sub}</div><div class="aw-t">수상자 발표<span class="aw-dots"><i>.</i><i>.</i><i>.</i></span></div></div></div>`;
    else if (wins.length) h += awardBanner(sub, wins.map(r => cereName(r.show, r.cat)));
    else h += `<div class="aw-top lose"><div class="aw-trophy">🎤</div><div><div class="aw-y">${sub}</div><div class="aw-t">올해는 어떤 상도 받지 못했습니다...</div></div></div>`;
    if (open && d.fans) h += `<div class="aw-none">${[d.prize ? `상금 ${fmtWon(d.prize)}` : ''].concat(`팬 +${fmtFans(d.fans)}`).filter(Boolean).join(' · ')}</div>`;
    if (open && !d.rows.length) h += `<div class="aw-none">올해는 ${d.shows.map(x => CERE_N[x]).join(' · ')}에서 수상 후보에도 들지 못했다.</div>`;
    for (const r of d.rows) {
      h += `<div class="aw-cat ${open && r.won ? 'won' : ''}"><div class="aw-cat-h"><span class="aw-badge ${r.cat === '대상' || r.cat === '작품상' ? 'gold' : r.cat === '신인상' || r.cat === '신인감독상' || r.cat === '아역상' ? 'new' : 'silver'}">${d.shows.length > 1 ? cereName(r.show, r.cat) : r.cat}</span>${!open ? '' : r.won ? '<b class="aw-res win">🏆 수상</b>' : '<span class="aw-res">수상 못 함</span>'}</div><div class="aw-noms">`;
      h += r.noms.map(n => { const w = open && n === r.winner; return `<span class="aw-nom ${w ? 'win' : ''} ${n === r.who ? 'me' : ''}">${w ? '🏆 ' : ''}${U.esc(n)}${n === r.who ? ' (나)' : ''}</span>`; }).join('');
      h += `</div></div>`;
    }
    return h + `</div>`;
  },
  // 창이 뜨면 2.1초 뒤에 결과를 보여 준다. 결과가 나오기 전에는 확인 버튼을 숨긴다
  onShow(s, d, card) {
    if (d.revealed || typeof UI === 'undefined') return;
    card.classList.add('aw-waiting');
    if (UI.awWait === d) return;
    UI.awWait = d;
    setTimeout(() => {
      if (UI.awWait !== d) return;
      UI.awWait = null; d.revealed = true;
      if (!S || !S.pending || S.pending.d !== d) return;
      showEventRaw();
    }, 2100);
  },
  ch: (s, d) => [{ t: '확인', f: s => { const P = awPremOf(d); if (d.prize) earn(s, d.prize, '시상식 상금'); for (const j in P) awAddPrem(s, j, P[j]); return (d.rows.length ? `${d.y} ` + d.rows.map(r => `${cereName(r.show, r.cat)} ${r.won ? '수상' : '후보'} (${r.who})`).join(' · ') + '.' : `올해는 ${d.shows.map(x => CERE_N[x]).join(' · ')}에서 수상 후보에도 들지 못했다.`) + (d.prize ? ` 상금 ${fmtWon(d.prize)}.` : '') + (d.fans ? fx(s, { fkr: d.fans }) : ''); } }],
});

// ════════ 아이돌 ════════
// 노래(또는 랩) · 춤 · 외모가 모두 강함이다 (v94). 어릴수록 유리하다
function idolScore(s, p = me(s)) { return jobMix([[Math.max(lv(p, 'vocal'), lv(p, 'rap')), JS_], [lv(p, 'dance'), JS_]]) + talB(p.tal.looks, true); }
function idolAgeAdj(a) { return a <= 13 ? 5 : a <= 16 ? 3 : a <= 19 ? 0 : a <= 21 ? -4 : -9; }
// 아이돌 재능 (v99, 8-5): 외모 · 스타성 · 리듬감은 강함, 음감 · 목소리 · 운동신경 · 표현력(무대 표정)은 보통 (0~100)
function idolTal(p) { const t = p.tal; return (t.looks + t.star + t.rhythm + (t.music + t.voice + t.athletic + t.express) * 0.5) / 5; }
// 오디션 점수: 회사 크기와 상관없이 어릴수록 재능(가능성)을, 나이가 들수록 지금 실력(특기)을 본다
// 재능은 특기 점수와 같은 눈금으로 바꾼다 (재능 45 → 20점, 55 → 35점, 65 → 50점)
function idolTalPts(p) { return 20 + (idolTal(p) - 45) * 1.5; }
function idolTalW(a) { return a <= 12 ? 0.75 : a <= 14 ? 0.6 : a <= 16 ? 0.45 : a <= 18 ? 0.3 : a <= 20 ? 0.15 : 0; }
function idolAudScore(s) { const w = idolTalW(age(s)); return idolScore(s) * (1 - w) + idolTalPts(me(s)) * w; }
// 오디션 합격률: 문턱 -2, 나이 보너스는 절반만
function idolAudP(s, ag) { return audP(idolAudScore(s) + idolAgeAdj(age(s)) * 0.5 + pm(s, 'audition', 0), ag.thr - 2); }
// 연습생 월말평가는 특기만 본다. 대신 어린 연습생은 방출·계약 만료를 잘 당하지 않는다 (idolYouth)
const IDOL_EVAL_OFF = [0, 6, 3, 3];
// 어린 연습생 보호: 1이면 보통, 0이면 방출되지 않는다
function idolYouth(a) { return a < 17 ? 0 : a < 19 ? 0.4 : 1; }
function idolBar(s, t) { return AG[t.ag].thr + IDOL_EVAL_OFF[t.tier] - Math.max(0, 17 - age(s)) * 6 + Math.min(3, t.months * 0.1); }
function groupFans(g) { return g.f.kr + g.f.jp + g.f.us; }
function idolBlock(s, band) {
  const a = age(s), p = me(s);
  if (s.army) return '군 복무 중';
  if (contractWhy(s)) return contractWhy(s);
  if (a < (band ? 13 : 11)) return `${band ? 13 : 11}세부터 지원할 수 있다`;
  if (a > 24) return '연습생 오디션은 24세까지만 볼 수 있다';
  if (hasQ(s, 'idol_aud')) return '다른 오디션 결과를 기다리는 중';
  if (!band && !['vocal', 'rap', 'dance'].some(k => has(p, k))) return '노래·랩·춤 중 하나는 할 줄 알아야 한다';
  return '';
}
for (const ag of musicAgencies().filter(a => !a.soloOnly)) JOB_APPLY.push({
  id: 'idol_' + ag.id, trk: 'idol', g: '💫 아이돌', get n() { return `${ag.n} 아이돌 오디션`; }, tag: agTag(ag),
  show: s => !trackOn(s, 'idol') && age(s) >= 10 && age(s) <= 26,
  h: s => `합격 가능성 ${fmtPct(idolAudP(s, ag))} · 결과는 다음 달 · 붙으면 연습생이 되어 숙소에서 지낸다`,
  ok: s => !idolBlock(s) && !(s.cd['aud_' + ag.id] > s.t) && langOK(s, ag),
  why: s => idolBlock(s) || (s.cd['aud_' + ag.id] > s.t ? '같은 회사는 1년 뒤에 다시 볼 수 있다' : langWhy(ag)),
  run: s => { s.cd['aud_' + ag.id] = s.t + 12; queueEv(s, 'idol_aud', 1, { ag: ag.id, p: idolAudP(s, ag) }); return `${ag.n} 아이돌 오디션을 봤다.`; },
});
// 기획사 밴드 연습생: 회사가 밴드 데뷔조를 꾸린다 (이때만 멤버를 회사가 채워 준다)
// v99 (8-5): 그 파트 특기 + 그 파트를 빨리 배우는 재능(강함 재능 둘). 아이돌처럼 어릴수록 재능을 더 본다. 외모 · 예능은 안 본다
function bandTrTal(p, k) { const T = Object.entries(SKILLS[k].tal).filter(([, w]) => w >= 1).map(([x]) => p.tal[x] || 50); return T.reduce((a, x) => a + x, 0) / T.length; }
function bandTrScore(s, k) { const p = me(s), w = idolTalW(age(s)); return lv(p, k) * (1 - w) + (20 + (bandTrTal(p, k) - 45) * 1.5) * w; }
function bandTrParts(s) { return BAND_PARTS.map(x => x[0]).filter(k => lv(me(s), k) >= 12); }
for (const ag of musicAgencies().filter(a => a.mkt === 'kr' && a.tier <= 2)) JOB_APPLY.push({
  id: 'bandtr_' + ag.id, trk: 'band', g: '🎸 밴드 멤버', get n() { return `${ag.n} 밴드 연습생 오디션`; }, tag: agTag(ag),
  show: s => !trackOn(s, 'idol') && !trackOn(s, 'band') && age(s) >= 13 && age(s) <= 26,
  h: s => { const ps = bandTrParts(s); return (ps.length ? ps.map(k => `${partN(k)} ${fmtPct(audP(bandTrScore(s, k) + idolAgeAdj(age(s)) * 0.5, ag.thr - 2))}`).join(' · ') + ' · ' : '') + '붙으면 연습생이 되고, 회사가 밴드 데뷔조를 꾸린다'; },
  ok: s => !idolBlock(s, true) && bandTrParts(s).length && !(s.cd['aud_' + ag.id] > s.t),
  why: s => idolBlock(s, true) || (!bandTrParts(s).length ? '보컬이나 악기 하나는 12레벨 이상이어야 한다' : '같은 회사는 1년 뒤에 다시 볼 수 있다'),
  run: s => { fireEvent(s, 'bandtr_pick', { ag: ag.id }); return ''; },
});
E({
  id: 'bandtr_pick', cat: '오디션', title: '어떤 파트로 오디션을 볼까?', tag: 'career',
  text: (s, d) => `${AG[d.ag].n} 밴드 연습생 오디션. 어떤 파트로 볼까?`,
  ch: (s, d) => bandTrParts(s).map(k => { const p = audP(bandTrScore(s, k) + idolAgeAdj(age(s)) * 0.5, AG[d.ag].thr - 2); return { t: `${partN(k)} (${lvi(me(s), k)}레벨)`, h: `합격 가능성 ${fmtPct(p)} · 결과는 다음 달`, f: s => { s.cd['aud_' + d.ag] = s.t + 12; queueEv(s, 'idol_aud', 1, { ag: d.ag, p, kind: 'band', part: k }); return `${AG[d.ag].n} 밴드 연습생 오디션을 ${partN(k)}${josa(partN(k), '으로').slice(partN(k).length)} 봤다.`; } }; }).concat([{ t: '그만둔다', f: () => '오디션을 보지 않기로 했다.' }]),
});
function traineeScore(s, t) { return t.kind === 'band' ? bandTrScore(s, t.part) : idolScore(s); }
// 첫 연습생 계약: 17세가 될 때까지 (17세가 넘어서 들어오면 1년). 그 뒤로는 1년마다 재계약을 통보받는다
function trFirstMonths(s) { return Math.max(12, 17 * 12 - s.t); }
function trContractText(s) { const m = trFirstMonths(s), y = Math.floor(m / 12), mo = m % 12; return m > 12 ? `17세까지(${y ? y + '년' : ''}${y && mo ? ' ' : ''}${mo ? mo + '개월' : ''}), 그 뒤로는 1년씩` : '1년씩'; }
function startTrainee(s, agId, o = {}) {
  const ag = AG[agId], p = me(s);
  s.tracks.idol = { st: 'trainee', kind: o.kind || 'idol', part: o.part || null, ag: agId, agN: ag.n, tier: ag.tier, cut: o.cut != null ? o.cut : ag.cut, gMonths: o.months || 84, mkt: ag.mkt, months: 0, cEnd: trFirstMonths(s), fails: 0, rank: 0, pool: U.int(18, 30), team: false, prep: 0, debt: 0, hist: s.tracks.idol.hist || [], sn: s.tracks.idol.sn };
  for (let i = 0; i < 3; i++) {
    let n;
    if (o.kind === 'band') { const k = U.pick(BAND_PARTS.map(x => x[0]).filter(x => x !== o.part)); n = makeMusicMate(s, { g: U.chance(0.5) ? '여' : '남', rel: '동기', job: '밴드 연습생', met: `${ag.n} 연습생 동기`, mkt: ag.mkt, tal: ['music', 'rhythm', 'hands'], sk: { [k]: ag.thr + 6 } }); n.part = k; }
    else { const main = U.pick(['vocal', 'vocal', 'dance', 'rap']); n = makeMusicMate(s, { g: p.g, rel: '동기', job: '연습생', met: `${ag.n} 연습생 동기`, mkt: ag.mkt, tal: ['music', 'voice', 'rhythm', 'looks'], sk: { vocal: ag.thr + (main === 'vocal' ? 8 : -2), dance: ag.thr + (main === 'dance' ? 8 : -2), rap: main === 'rap' ? ag.thr + 8 : ag.thr - 10 } }); }
    n.trainee = agId; n.metOrg = ag.n;
  }
  milestone(s, `${age(s)}세에 ${ag.n} ${o.kind === 'band' ? '밴드 ' : ''}연습생이 되었다.`);
  // 아이돌 연습생은 들어가자마자 보컬·랩 중 재능이 더 맞는 쪽과 댄스 트레이닝을 받는다 (없던 특기면 새로 생긴다)
  const vk = talFactor(p, 'vocal') >= talFactor(p, 'rap') ? 'vocal' : 'rap';
  const tag = o.kind === 'band' ? '' : learnMe(s, vk, null, true) + learnMe(s, 'dance', null, true);
  return `${ag.n} ${o.kind === 'band' ? `밴드 연습생(${partN(o.part)})` : '연습생'}이 되었다. 숙소 생활이 시작됐다. 일정 ${age(s) < 19 ? '한 칸이 회사 연습시간으로 고정된다 (19세부터 두 칸)' : '두 칸이 회사 연습시간으로 고정된다'}. 연습생 계약은 ${trContractText(s)}이다.` + tag;
}
NEGO.idol = {
  what: d => `${d.k2 === 'band' ? '밴드 ' : ''}연습생 계약이다. 데뷔하면 그대로 ${d.k2 === 'band' ? '밴드' : '그룹'} 전속 계약으로 이어진다.`,
  block: s => agencyContract(s) ? contractWhy(s) : '',
  sign: (s, d) => startTrainee(s, d.ag, { kind: d.k2, part: d.part, months: d.months, cut: d.cut }),
  refuse: (s, d) => `${d.agN} 연습생 제안을 거절했다.`,
};
function quitTrainee(s, why) {
  const t = s.tracks.idol;
  for (const n of people(s, n => n.rel === '동기' && n.trainee === t.ag)) { n.rel = '친구'; n.trainee = null; }
  t.st = 'ended'; t.endNote = `${t.agN} 연습생 (${why})`; t.hist.push(t.endNote);
}
function endGroup(s, why) {
  const t = s.tracks.idol;
  if (t.g) {
    for (const id of t.g.members) { const n = s.people[id]; if (n && n.rel === '멤버') n.rel = '전 멤버'; }
    t.endNote = `${t.g.name} (${why})`;
    milestone(s, `${age(s)}세에 ${t.g.name} 활동을 마쳤다 (${why}).`);
  }
  t.hist.push(t.endNote || why);
  t.st = 'ended';
}
// 밴드 연습생(idol 트랙 kind 'band')의 고정 칸 · 직업 활동은 밴드 연습으로 보인다 (v116 버그 8). 연습 효과는 원래도 내 파트 위주(idolMonth)
const IDOL_ACT = { n: '아이돌 활동 (트레이닝·무대)', ic: '💫', g: '직업 활동', eff: [['노래·춤', '↑↑', 1], ['스트레스', '↑', 0]] };
const BAND_TR_ACT = { n: '밴드 연습 (합주·트레이닝)', ic: '🎸', g: '직업 활동', eff: [['내 파트', '↑↑', 1], ['스트레스', '↑', 0]] };
function idolIsBand(s) { const t = s && s.tracks && s.tracks.idol; return !!t && t.kind === 'band' && t.st === 'trainee'; }
CAREERS.idol = {
  n: '아이돌', ic: '💫',
  desc: '기획사 연습생으로 들어가 그룹으로 데뷔한다. 노래·랩·춤·외모가 중요하다. 연습생 비용과 앨범 제작비를 다 갚은 뒤부터 정산을 받는다.',
  get act() { return idolIsBand(typeof S !== 'undefined' ? S : null) ? BAND_TR_ACT : IDOL_ACT; },
  status(s, t) {
    if (t.st === 'trainee') return `${t.agN} ${t.kind === 'band' ? `밴드 연습생(${partN(t.part)})` : '연습생'} · ${t.months}개월 차 · 최근 평가 ${t.rank || '-'}위/${t.pool}명` + (t.team ? ` · 데뷔조 (데뷔까지 약 ${Math.max(1, 6 - t.prep)}개월)` : '');
    if (t.st === 'active') return `${t.g.name} · ${t.pos} · 데뷔 ${Math.floor(t.months / 12) + 1}년 차 · 그룹 팬 ${fmtFans(groupFans(t.g))}` + (t.promo > 0 ? ' · 활동 중' : t.alb ? ' · 앨범 준비 중' : '') + (t.debt > 0 ? ` · 갚을 비용 ${fmtWon(t.debt)}` : '');
    return t.endNote || '';
  },
  short(s, t) { return t.st === 'trainee' ? `${t.agN} 연습생` : t.st === 'active' ? `${t.g.name} 멤버` : ''; },
  title(s, t) { return t.g ? `${t.g.name}의 멤버` : null; },
  contract(s, t) { return t.st === 'trainee' || t.st === 'active' ? t.agN : ''; },
  // 팀 활동 (v117 밸런스 A3): 데뷔한 그룹만
  picks(s, t) { return teamPicks(s, 'idol'); },
  cLeft(s, t) { return t.st === 'trainee' ? t.cEnd - t.months : t.st === 'active' ? t.contract - t.months : null; },
  // 일정 칸에 보여 줄 특기: 밴드 연습생은 내 파트, 그룹은 포지션, 연습생은 가장 잘하는 것
  mainSk(s, t) {
    if (t.kind === 'band' && t.part) return t.part;
    const pos = t.pos || '';
    if (pos.includes('래퍼')) return 'rap';
    if (pos.includes('댄서')) return 'dance';
    if (pos.includes('보컬')) return 'vocal';
    return ['vocal', 'rap', 'dance'].filter(k => has(me(s), k)).sort((a, b) => lv(me(s), b) - lv(me(s), a))[0] || null;
  },
  info(s, t) {
    const p = me(s), R = [];
    R.push(['회사', `${t.agN} (${TIER_N[t.tier]} 기획사)`]);
    R.push(['내 실력', ['vocal', 'rap', 'dance'].concat(t.part && !['vocal'].includes(t.part) ? [t.part] : []).filter(k => has(p, k)).map(k => `${SKILLS[k].n} ${lvi(p, k)}`).join(' · ') || '-']);
    R.push(['정산', `회사 몫 ${pctN(t.cut)}${t.st === 'trainee' ? ` · 데뷔하면 그룹 계약 ${yrs(t.gMonths || 84)}` : ''}`]);
    // 회사가 고정하는 일정 칸: 연습생은 18세까지 1칸, 19세부터 2칸 · 데뷔 뒤에는 평소 1칸, 활동기 2칸
    R.push(['고정 일정', t.st === 'trainee' ? `연습시간 ${age(s) < 19 ? 1 : 2}칸 (18세까지 1칸, 19세부터 2칸)` : `그룹 일정 ${t.promo > 0 ? 2 : 1}칸 (평소 1칸, 활동기 2칸)`]);
    if (t.debt > 0) R.push([t.st === 'trainee' ? '쌓인 트레이닝 비용' : '갚을 비용', `${fmtWon(t.debt)} (데뷔한 뒤 번 돈에서 먼저 갚는다)`]);
    if (t.st === 'trainee') {
      R.push(['최근 평가', `${t.rank || '-'}위 (${t.pool}명 중)${t.team ? ' · 데뷔조' : ''}`]);
      const mates = people(s, x => x.rel === '동기' && x.trainee === t.ag);
      if (mates.length) R.push({ h: '연습생 동기', items: mates.map(x => `${x.name} (${x.g === '여' ? '여' : '남'} · ${pAge(s, x)}세) — ${relWord(x)}${soulTag(x)}`) });
    } else if (t.st === 'active') {
      const g = t.g;
      R.push(['그룹 팬', MK.map(m => `${MK_N[m]} ${fmtFans(g.f[m])}`).join(' · ')]);
      R.push(['팀워크', twWord(g)]);
      R.push(['팬덤 · 대표 컨셉', `${g.fandom} · ${g.sig}`]);
      // 이번 앨범 (v154): 어느 단계인지, 누가 맡았는지
      if (t.alb) R.push(['이번 앨범', `${albStageW(s, t.alb)} · ${t.alb.mk ? t.alb.mk.boss : ''}`]);
      { const pr = typeof projInfoRow === 'function' && projInfoRow(s, t); if (pr) R.push(pr); }
      R.push({ h: '멤버', items: [`나 — ${t.pos}`].concat(g.members.map(id => s.people[id]).filter(Boolean).map(x => `${x.name} (${pAge(s, x)}세) ${g.pos[x.id] || ''} — ${relWord(x)}${soulTag(x)}`)) });
    }
    return R;
  },
  // 아이돌은 연습생 때도, 그룹 활동 중에도 늘 숙소에서 함께 산다 (그룹이 끝나야 나온다)
  // 연습생 · 활동 중인 아이돌은 기획사 숙소에 산다. 결혼하면 숙소를 나와 가족과 산다 (턴제 실험 6차: 숙소에서 아이 셋을 키우던 것 고침)
  // 숙소를 나와 내 집(월세·전세·자가)이 생겼으면 다시 숙소에 들어가지 않는다 (v89: 집을 산 뒤에 '숙소를 나와야 한다'가 또 뜨던 것)
  dorm(s, t) { return (t.st === 'trainee' || t.st === 'active') && !married(s) && s.home.mode !== 'alone'; },
  // 연습생은 트레이닝으로, 데뷔하면 활동기에 더 많이 묶인다
  locks(s, t) {
    const n = s.slots.length;
    if (t.st === 'trainee') return Array(Math.min(n, age(s) < 19 ? 1 : 2)).fill('c_idol');
    if (t.st === 'active') return Array(Math.min(n, t.promo > 0 ? 2 : 1)).fill('c_idol');
    return [];
  },
  actions(s, t) {
    if (t.st === 'trainee') return [{ t: '연습생 그만두기', h: '기획사를 나온다. 다른 회사 오디션은 다시 볼 수 있다', ok: true, danger: true, confirm: '정말 연습생을 그만둘까요?', run: s => { const n = t.agN; quitTrainee(s, '스스로 그만둠'); return `${n} 연습생을 그만뒀다.`; } }];
    if (t.st === 'active') {
      const left = Math.max(0, t.contract - t.months), pen = Math.round(left * 200e4 * t.tier);
      // v157: 내 곡 내기 · 가사 내기는 골라서 하는 일로 옮겼다 (idolev.js)
      return [].concat([{ t: '그룹 탈퇴', h: `계약이 ${left}개월 남았다 · 위약금 약 ${fmtWon(pen)} · 팬들 반응이 나쁘다`, ok: true, danger: true, confirm: '정말 그룹을 탈퇴할까요?', run: s => { s.debt += pen; const r = '그룹을 탈퇴했다.' + fx(s, { pop: -10, rep: -5, fkr: -Math.round(s.fans.kr * 0.3) }); endGroup(s, '탈퇴'); return r; } }]);
    }
    return [];
  },
  monthly(s, t) {
    if (t.st === 'trainee') idolTraineeMonth(s, t);
    else if (t.st === 'active') idolActiveMonth(s, t);
  },
};
function idolTraineeMonth(s, t) {
  t.months++;
  if (age(s) >= 19 && !t.adult) { t.adult = true; if (t.months > 1) addLog(s, `성인이 돼서 ${t.agN} 연습시간이 일정 두 칸으로 늘었다.`, 'career'); }
  t.debt += [0, 80, 140, 220][t.tier] * 1e4;
  // 회사 트레이닝: 고정된 칸마다 노래·춤·랩이 함께 는다 (혼자 연습보다 훨씬 빠르다)
  const p = me(s), n = slotsOn(s, 'c_idol'), mult = 1.45 + t.tier * 0.15;
  const ks = t.kind === 'band' ? [t.part, 'vocal'] : ['vocal', 'dance', 'rap'];
  for (let i = 0; i < n; i++) for (const k of ks) if (has(p, k)) practice(s, p, k, t.kind === 'band' ? (k === t.part ? 1 : 0.3) : 1.0, mult);
  for (const m of people(s, x => x.trainee === t.ag)) for (const k of (m.part ? [m.part] : ['vocal', 'dance', 'rap'])) { matePot(m, k); mateGrow(s, m, k, 1); }
  addStress(s, 2.5);
  // v157: 켜 둔 일(연기 · 예능 · 동기 챙기기) · 트레이너 특훈 (idolev.js)
  if (typeof idolWaysMonth === 'function') idolWaysMonth(s, t);
  const band = t.kind === 'band';
  const mine = (band ? traineeScore(s, t) + idolAgeAdj(age(s)) * 0.5 : idolScore(s)) + pm(s, 'audition', 0) + U.normal(0, 3);
  // 아이돌 연습생 기준: 17세 전에는 같은 나이 또래와 비교한다 (한 살 어릴 때마다 6점 낮게). 오래 있어도 기준은 3점까지만 오른다
  const mean = band ? AG[t.ag].thr + 4 + t.months * 0.18 : idolBar(s, t);
  // 월말평가는 매달 보지만, 보여 주는 순위와 데뷔조 선발은 3개월 평균 순위로 한다
  const rk = U.clamp(Math.round(t.pool * (1 - U.sig((mine - mean) / 5))) + 1, 1, t.pool);
  t.rks = (t.rks || []).concat(rk).slice(-3);
  if (t.months % 3 === 0) {
    t.rank = Math.round(t.rks.reduce((a, x) => a + x, 0) / t.rks.length);
    addRes(s, `${t.agN} 월말평가 3개월 평균 ${t.rank}위 (${t.pool}명 중).`);
    // 데뷔조 마지막 한 자리를 놓쳤으면(v157) 다음 데뷔조 1순위
    if (!t.team && t.months >= 9 && (t.kind === 'band' || age(s) >= 15) && (t.rank <= Math.max(6, t.pool * 0.35) || t.seatLost) && U.chance(t.seatLost ? 0.9 : 0.45) && !hasQ(s, 'idol_team')) queueEv(s, 'idol_team', 0);
  }
  if (t.team) {
    t.prep++;
    // v157: 데뷔조 인원이 한 명 많을 때가 있다 (마지막 한 자리)
    if (t.prep === 2 && t.kind !== 'band' && !t.seatQ && U.chance(0.3)) { t.seatQ = true; queueEv(s, 'idol_last_seat', 0); }
    // 중간 점검: 데뷔조 안에서도 순위가 밀리면 빠지고, 회사 사정으로 데뷔가 통째로 무산되기도 한다
    if (t.prep === 3 && !hasQ(s, 'idol_teamcut')) {
      if (t.rank > t.pool * 0.4 && U.chance(0.5)) queueEv(s, 'idol_teamcut', 0, { why: 'rank' });
      else if (U.chance(0.12)) queueEv(s, 'idol_teamcut', 0, { why: 'scrap' });
    }
    if (t.prep >= 6) queueEv(s, t.kind === 'band' ? 'band_debut' : 'idol_debut', 0);
    return;
  }
  // 연습생 계약(첫 계약은 17세까지, 그 뒤로는 1년씩)이 끝나면 회사가 연장하거나 내보낸다. 오래 하위권이거나 나이가 차면 중간에 내보내기도 한다
  if (t.months >= t.cEnd) queueEv(s, 'idol_renew', 0);
  else if ((t.months >= 24 && t.rank > t.pool * 0.7 && U.chance(0.03 * idolYouth(age(s)))) || (age(s) >= 25 && U.chance(0.12)) || (t.fails >= 2 && t.months >= 30 && U.chance(0.06 * idolYouth(age(s))))) queueEv(s, 'idol_cut', 0);
  // 서바이벌 출연은 회사가 정해서 알려 준다
  if (t.kind !== 'band' && !t.surv && t.months >= 6 && U.chance(0.015)) { t.surv = true; queueEv(s, 'idol_surv', 0); }
}
function idolActiveMonth(s, t) {
  t.months++;
  // 앨범 회의 · 앨범 발매는 그달 다른 일보다 먼저 (다른 창이 먼저 떠서 컴백이 한 달씩 밀리지 않게)
  qFront(s, ['idol_cbres', 'idol_cb']);
  const g = t.g, p = me(s), n = slotsOn(s, 'c_idol');
  // 그룹 연습으로 노래·춤·랩이 는다. v157: 자동으로 하는 일이 시기에 따라 바뀐다 — 활동(무대·스케줄) · 개인 연습(내 포지션 위주) · 활동 준비(녹음·안무, 팀워크도) (idolev.js)
  const ph = idolAutoPractice(s, t, n);
  // 멤버도 같이 큰다 (v117 밸런스 A). 같이 활동한 시간만큼 팀워크가 조금씩
  const tmI = teamOf(s, 'idol'); if (tmI) teamGrow(s, tmI, 1);
  twAdd(g, twOf(g) < 60 ? 0.5 : -0.3); // 그냥 같이 지내는 것만으로는 60까지. 그 위는 팀 활동 · 사건으로 올리고, 손을 놓으면 천천히 내려온다
  if (t.promo > 0) { t.promo--; addStress(s, 4 * pm(s, 'crowdStress')); }
  else {
    addStress(s, ph === 'prep' ? 2 : 1.5);
    // 앨범과 앨범 사이: 회사가 잡아 주는 광고·예능·화보·팬미팅·라디오 스케줄 (v154: 다음 앨범을 만드는 동안에도 온다. 오는 횟수는 예전과 같게. v157: 일을 잘 따 오는 매니저면 조금 더)
    if (!hasQ(s, 'idol_side') && U.chance(IDOL_SIDE_P * (t.mgrK === '열정' ? 1.3 : 1))) queueEv(s, 'idol_side', 0);
  }
  // v157: 켜 둔 일 · 고정 예능 · 매니저 (idolev.js)
  idolWaysMonth(s, t);
  // 다음 앨범 (v154 앨범 제작 틀): 활동 둘째 · 셋째 달에 회사가 기획을 시작하고, 심사 · 선정 → 편곡 · 작사 → 녹음을 거쳐 석 달 뒤에 나온다 (컴백 간격은 그대로 5~6달)
  if (t.alb) idolAlbMonth(s, t);
  else if (--t.nextCb <= 0 && !hasQ(s, 'idol_cbres') && !hasQ(s, 'idol_cb')) idolNextComeback(s, t);
  // 프로젝트 그룹 (v156): 회사가 여러 그룹 멤버를 모아 한 번 활동시킨다 (project.js)
  if (typeof projMonth === 'function') projMonth(s, 'idol', t);
  MK.forEach(m => { g.f[m] = Math.round(g.f[m] * (t.promo > 0 ? 1 : t.months > 84 ? 0.993 : 0.996)); });
  // 멤버 평균 나이가 28세를 넘으면 인기가 꾸준히 떨어진다 (한 살 많을수록 더)
  const ga = groupAges(s, g);
  if (ga.avg > 28) {
    const f = 1 - Math.min(0.02, (ga.avg - 28) * 0.004);
    MK.forEach(m => { g.f[m] = Math.round(g.f[m] * f); });
    jpopAdd(s, 'idol', -0.1);
    if (!t.oldTold) { t.oldTold = true; addLog(s, `「${g.name}」 멤버 평균 나이가 28세를 넘었다. 요즘 반응이 예전 같지 않다.`, 'career'); }
  }
  // 대표 컨셉이 나이와 안 맞으면 회사가 바꾼다 (v97: 큐티 · 하이틴은 평균 25세 이상이면 반토막. v98부터 레트로는 나이를 안 본다)
  if (!cAgeOK(s, idolPpl(s, g), g.sig, 1) && !hasQ(s, 'idol_sig')) queueEv(s, 'idol_sig', 0);
  if (t.buzz > 0) t.buzz--;
  idolBoomCheck(s, t);
  // 행사·광고·콘서트는 어느 정도 알려진 그룹부터 들어온다
  memberIncome(s, t, (Math.max(0, g.f.kr - 2e4) * 70 + Math.max(0, g.f.jp - 1e4) * 100 + Math.max(0, g.f.us - 1e4) * 80) * awMul(s, 'idol'), '행사·광고·콘서트');
  const gf = groupFans(g);
  if (!t.jpDebut && t.months >= 18 && (t.tier >= 2 || g.f.jp > 2e4) && U.chance(0.04)) queueEv(s, 'idol_jp', 0);
  if (!t.usDebut && gf > 1.5e6 && U.chance(0.03)) queueEv(s, 'idol_us', 0);
  // 해체 위기는 v158부터 앨범을 낼 때 회사가 평가한다 (idolev.js idolReview)
  if (t.months >= t.contract) queueEv(s, 'idol_contract', 0);
  // v157: 계약 끝나기 반년 전 재계약 이야기 · 12월 연말 합동 무대
  else if (t.contract - t.months === 6 && !t.rn && !hasQ(s, 'idol_renego')) queueEv(s, 'idol_renego', 0);
  if (calM(s) === 11 && gf >= 5e4 && U.chance(0.2) && !hasQ(s, 'idol_year_stage')) queueEv(s, 'idol_year_stage', 0);
  if (!trackOn(s, 'solo') && t.months >= 30 && (lv(p, 'vocal') >= 40 || lv(p, 'rap') >= 40) && U.chance(0.015) && !s.inbox.some(m => m.kind === 'idol_solo')) sendMsg(s, 'idol_solo', { from: t.agN, title: '솔로 데뷔 제안', months: 8, d: {} });
  if (calM(s) === 11) musicAwards(s, t, g.name, musicRookie(s, true), 'idol');
}
// 스케줄 알림이 오는 가능성 (활동기가 아닌 달마다). 예전(앨범 사이 한 달에 30%)과 한 해 횟수가 같게
const IDOL_SIDE_P = 0.045;
// ───── 남의 회사 앨범 (v154: 앨범 제작 틀 album.js) ─────
// 소형 회사는 대표가, 중 · 대형 회사는 그룹(가수)마다 붙은 전담 프로듀서가 기획 · 데모곡 확보 · 선정을 하고, 회사 A&R 팀장이 심사한다
// 소형 회사 대표 (회사마다 한 명. 처음 볼 때 만든다)
function agBoss(s, agId) {
  const B = s.agBoss = s.agBoss || {};
  let p = B[agId] && s.people[B[agId]];
  if (!p || !p.alive || pAge(s, p) >= 68) {
    p = makeIndustry(s, '프로듀서', { age: U.int(38, 56) }); p.job = '대표';
    const l = U.int(25, 60); learnSkill(s, p, 'scout', l); p.sk.scout.best = l; p.sk.scout.pot = l;
    B[agId] = p.id;
  }
  return p;
}
function agAnr(s, agId) { const L = AG[agId] && typeof coTeamPeople === 'function' ? coTeamPeople(s, agId + '#anr') : []; return L[0] || null; }
// 그 가수를 맡는 사람: 소형 회사는 대표, 중 · 대형은 프로듀싱팀의 한 사람을 전담으로 붙인다 (o.prod에 남겨 다음 앨범도 같은 사람이 맡는다)
function agProd(s, agId, o) {
  const ag = AG[agId];
  if (!ag || ag.tier <= 1) { const p = ag ? agBoss(s, agId) : null; return { p, n: p ? `대표 ${p.name}` : '대표' }; }
  const tk = agId + '#pd';
  let p = o.prod && s.people[o.prod];
  if (!p || !p.alive || p.coT !== tk) { const L = coTeamPeople(s, tk); p = U.pick(L.length > 1 ? L.slice(1) : L) || null; o.prod = p ? p.id : null; }
  return { p, n: p ? `전담 프로듀서 ${p.name}` : '전담 프로듀서' };
}
// 아이돌 그룹 앨범을 시작한다: 회사가 ①~④를 정하고, 편곡 · 작사 한 달 + 녹음 한 달 뒤(데뷔 앨범은 한 달 뒤)에 성적표가 온다
function idolAlbStart(s, t, c, debut) {
  const g = t.g, ag = AG[t.ag] || { tier: t.tier || 1 }, P = idolPpl(s, g), who = agProd(s, t.ag, g);
  // v157: 자작곡의 길 — 심사 피드백을 들었으면 내 곡이 조금 나아지고(myB), 공동 프로듀서면 내 곡은 늘 후보에 오른다(myPass)
  const r = albNpc(s, { tier: ag.tier, rep: agPlan(t), sig: g.sig, mem: P.slice(1), cs: [c], ok: debut ? x => x === c : x => cAgeOK(s, P, x, 1), boss: who.p, bossN: who.n, anr: agAnr(s, t.ag), my: !!t.subSong && has(me(s), 'compose'), lyr: !!t.subLyr && has(me(s), 'lyric'), myB: t.myB || 0, myPass: !!t.selfProd });
  const a = albKeep(s, r, true);
  if (debut) a.deb = 1;
  else if (typeof idolArcAlb === 'function') idolArcAlb(s, t); // 전담 프로듀서와의 인연 (다음 앨범 · 그다음 앨범)
  t.alb = a; t.nextCb = 99;
  if (who.p && who.p.ind) meetAt(s, who.p, `「${g.name}」 ${debut ? '데뷔 앨범' : '앨범'}`, 'idol');
  queueEv(s, 'idol_cbres', debut ? 1 : 3, { c: a.c, debut: !!debut, a });
  return a;
}
// 앨범을 만드는 동안: 곡이 정해진 달에 소식 (내 곡 · 가사가 어떻게 됐는지). 성적표가 사라졌으면 다음 앨범으로
function idolAlbMonth(s, t) {
  const a = t.alb, k = s.t - a.at;
  if (k === 1 && !a.deb && !a.told) { a.told = true; addLog(s, albNewsLine(s, a, `「${t.g.name}」 다음 앨범에 실을`), 'career'); if (typeof idolMyArc === 'function') idolMyArc(s, t, a); }
  if (k > 6 && !hasQ(s, 'idol_cbres')) { t.alb = null; t.nextCb = 1; }
}
// '자작곡 쓰기 · 가사 쓰기' (v154): 켜 두면 다음 앨범부터 내 곡이 데모곡 모집에 들어가 남의 곡과 똑같이 심사를 받고, 실린 곡의 가사를 맡을 수도 있다
function songSubActs(s, t) {
  const p = me(s), A = [];
  if (has(p, 'compose')) A.push({ t: '🎼 자작곡 쓰기', sw: true, on: !!t.subSong, tag: t.subSong ? '켜 둠' : '', h: `다음 앨범 데모곡 모집에 내 곡을 낸다 · 남의 곡과 똑같이 A&R 심사를 받는다 · 작곡 ${lvi(p, 'compose')}레벨`, btn: t.subSong ? '끄기' : '켜기', ok: true, run: s => { t.subSong = !t.subSong; return t.subSong ? '다음 앨범부터 데모곡 모집에 내 곡을 내기로 했다.' : '데모곡 모집에 내 곡을 내지 않기로 했다.'; } });
  if (has(p, 'lyric')) A.push({ t: '✍️ 가사 쓰기', sw: true, on: !!t.subLyr, tag: t.subLyr ? '켜 둠' : '', h: `실릴 곡의 가사를 써 보겠다고 한다 · 맡을 작사가보다 잘 쓰면 타이틀곡, 조금 모자라면 수록곡 · 작사 ${lvi(p, 'lyric')}레벨`, btn: t.subLyr ? '끄기' : '켜기', ok: true, run: s => { t.subLyr = !t.subLyr; return t.subLyr ? '다음 앨범부터 가사를 써 보겠다고 했다.' : '가사는 내지 않기로 했다.'; } });
  return A;
}
// 그룹 나이: 나를 포함한 멤버 평균 나이와 막내 나이
function groupAges(s, g) { const a = [age(s)].concat(g.members.map(id => s.people[id]).filter(Boolean).map(x => pAge(s, x))); return { avg: a.reduce((x, y) => x + y, 0) / a.length, min: Math.min(...a) }; }
E({
  id: 'idol_sig', cat: '그룹', title: '대표 컨셉 변경', tag: 'career',
  cond: s => s.tracks.idol.st === 'active' && !cAgeOK(s, idolPpl(s, s.tracks.idol.g), s.tracks.idol.g.sig, 1),
  init(s, d) { const g = s.tracks.idol.g, P = idolPpl(s, g); d.old = g.sig; d.young = CONCEPT_FIT[g.sig] === 'young'; d.nw = U.pick(TRENDS.filter(x => cAgeOK(s, P, x, 1))); g.sig = d.nw; },
  text: (s, d) => `${d.young ? '멤버 평균 나이가 스물다섯에 가까워지자' : '아직 멤버들이 어려서'}, 회사가 「${s.tracks.idol.g.name}」의 대표 컨셉을 '${d.old}'에서 ${qro(d.nw)} 바꾸기로 했다. 다음 앨범부터 새 컨셉에 맞춰 간다.`,
  ch: (s, d) => [{ t: '확인', f: () => `그룹 대표 컨셉이 '${d.old}'에서 ${qro(d.nw)} 바뀌었다.` }],
});
// ───── 앨범과 앨범 사이 스케줄 (회사가 잡아 주는 일, 알림) ─────
// 광고는 어느 정도 알려진 그룹부터, 팬미팅은 팬이 모인 그룹부터 들어온다. 정산은 나간 사람끼리 나누고, 연습생·제작 비용을 먼저 갚는다
// 팬미팅 말고는 그 일에 맞는 멤버 몇 명만 나간다 (sc: 그 일에 필요한 능력 점수, take: 나가는 사람 수, 0이면 전원)
// 내 점수가 멤버들 사이에서 밀리면 이번 스케줄에서는 빠진다 (빠지면 알림 없이 기록에만 남는다)
const CF_ITEMS = ['음료', '화장품', '통신사', '치킨', '모바일 게임', '스포츠 브랜드', '아이스크림', '편의점'];
const SHOW_KINDS = ['게임 예능', '먹방 예능', '토크쇼', '여행 예능', '아이돌 체육대회'];
const IDOL_SIDE = [
  // 광고: 외모와 연기(카메라 앞 연기). 그룹 전체 광고도, 몇 명만 찍는 광고도 있다
  { id: 'cf', n: '광고 촬영', w: g => groupFans(g) >= 5e4 ? 1 + Math.min(2, groupFans(g) / 5e5) : 0, take: () => U.pick([0, 1, 2, 3]), sc: x => x.tal.looks * 0.6 + lv(x, 'acting') * 0.4 + (x.tal.star - 50) * 0.2 },
  // 예능: 예능 특기와 유머 감각. 두세 명이 나간다
  { id: 'show', n: '예능 출연', w: () => 1.4, take: () => U.int(2, 3), sc: x => lv(x, 'variety') + (x.tal.humor - 50) * 0.3 },
  // 화보: 외모와 표현력. 전원이 찍기도, 두세 명만 찍기도 한다
  { id: 'photo', n: '화보 촬영', w: () => 1, take: () => U.pick([0, 2, 3]), sc: x => x.tal.looks * 0.7 + x.tal.express * 0.3 },
  // 팬미팅: 전원
  { id: 'meet', n: '팬미팅', w: g => groupFans(g) >= 2e4 ? 1 : 0, take: () => 0, sc: () => 0 },
  // 라디오·자체 콘텐츠: 라이브로 부를 노래나 입담. 두세 명이 나간다
  { id: 'radio', n: '라디오·자체 콘텐츠', w: () => 0.8, take: () => U.int(2, 3), sc: x => Math.max(lv(x, 'vocal'), lv(x, 'variety')) },
];
// 이번 스케줄에 나갈 사람 (나를 포함한 멤버 중 점수 높은 순, 회사 판단이라 조금 운이 섞인다). 점수는 정수로 반올림하고, 같으면 나를 먼저 뽑는다
function sideCast(s, g, kind) {
  const all = [s.me].concat(g.members.filter(id => s.people[id] && s.people[id].alive !== false));
  const take = kind.take();
  if (!take || take >= all.length) return all;
  return all.map(id => ({ id, v: Math.round(kind.sc(s.people[id]) + U.normal(0, 4)) })).sort((a, b) => b.v - a.v || (a.id === s.me ? -1 : b.id === s.me ? 1 : 0)).slice(0, take).map(x => x.id);
}
E({
  id: 'idol_side', cat: '스케줄', tag: 'career',
  live: (s, d) => d.live,
  title: (s, d) => d.n || '스케줄',
  cond: s => s.tracks.idol.st === 'active' && !(s.tracks.idol.promo > 0),
  init(s, d) {
    const t = s.tracks.idol, g = t.g, p = me(s), gf = groupFans(g), main = t.mkt === 'jp' ? 'jp' : 'kr';
    // v157: 예능 감을 익히고 있으면 예능 섭외가 두 배
    const K = U.wpick(IDOL_SIDE, x => x.w(g) * (x.id === 'show' && (t.ways || []).includes('var') ? 2 : 1)), k = K.id;
    const cast = sideCast(s, g, K), n = cast.length, whole = n === g.members.length + 1;
    const others = cast.filter(id => id !== s.me).map(id => s.people[id].name);
    d.n = K.n;
    // 내가 빠졌으면 기록에만 남긴다
    if (!cast.includes(s.me)) { addLog(s, `${K.n}에는 ${others.join('·')}${josa(others[others.length - 1], '이가').slice(others[others.length - 1].length)} 나갔다. 나는 이번에는 빠졌다.`, 'career'); d.skip = true; return; }
    const who = whole ? `「${g.name}」 멤버 전원` : others.length ? `나와 ${others.join('·')}` : '나 혼자';
    // 누가 나갔는지 (조사까지 붙인 말). 나 혼자면 조사 없이
    const whoS = others.length || whole ? josa(who, '이가') : who;
    const debt0 = t.debt;
    let pay = 0, fans = 0, gfan = 0, fxo = {}, line = '';
    if (k === 'cf') {
      const item = U.pick(CF_ITEMS);
      pay = memberIncome(s, t, (3000e4 + gf * 300) * (whole ? 1 : 0.6) * awMul(s, 'idol'), '광고 정산', n);
      fans = Math.round((300 + gf * 0.004) * (whole ? 1 : 1.6) * popSpeed(s) * myRoom(s, main));
      fxo = { jp: { idol: whole ? 2 : 3 }, fame: whole ? 1 : 2, stress: 3 };
      line = `${whoS} ${item} 광고 모델이 됐다. 하루 종일 같은 장면을 수십 번 찍었다.`;
    } else if (k === 'show') {
      const kind = U.pick(SHOW_KINDS), sk = K.sc(p);
      if (has(p, 'variety')) practice(s, p, 'variety', 2.5);
      pay = memberIncome(s, t, (400e4 + gf * 15) * n / (g.members.length + 1) * awMul(s, 'idol'), '방송 출연료', n);
      fans = Math.round((200 + gf * 0.006) * U.clamp(0.4 + sk / 60, 0.3, 1.6) * popSpeed(s) * myRoom(s, main));
      fxo = { jp: { idol: sk >= 40 ? 2 : 1 }, fame: sk >= 45 ? 3 : 1, stress: 4 };
      line = `${whoS} 그룹을 대표해 ${kind}에 나갔다.` + (sk >= 45 ? ' 내 한마디에 녹화장이 뒤집혔다. 방송이 나간 뒤 내 이름이 검색어에 올랐다.' : sk >= 25 ? ' 무난하게 분량을 챙겼다.' : ' 긴장해서 말을 거의 못 했다. 편집으로 분량이 많이 잘렸다.');
      if (sk >= 45) s.flags.varHit = true;
      line += varLearn(s, sk >= 45);
    } else if (k === 'photo') {
      pay = memberIncome(s, t, (800e4 + gf * 40) * (whole ? 1 : 0.7) * awMul(s, 'idol'), '화보 정산', n);
      fans = Math.round((150 + gf * 0.003) * (whole ? 1 : 1.5) * U.clamp(0.4 + (p.tal.looks - 30) / 60, 0.3, 1.6) * popSpeed(s) * myRoom(s, main));
      fxo = { jp: { idol: 1 }, stress: 2 };
      line = `${whoS} ${U.pick(['패션 잡지', '뷰티 잡지', '남성지', '여성지'])} 화보를 찍었다.` + (p.tal.looks >= 70 ? ' 내 단독 컷이 표지로 뽑혔다.' : '');
    } else if (k === 'meet') {
      pay = memberIncome(s, t, gf * 1200, '팬미팅 정산');
      gfan = Math.round(gf * U.fl(0.01, 0.03));
      g.f[main] = Math.min(FANCAP[main], g.f[main] + gfan);
      fxo = { stress: 4, rep: 1 };
      line = `「${g.name}」 팬미팅을 열었다. ${g.fandom} 앞에서 노래하고, 게임을 하고, 편지를 읽었다.`;
      // 실시간 창 (12-1): 팬미팅 (토크는 내 예능 · 유머, 노래는 그룹 실력)
      d.live = liveStage({ k: 'meet', place: '팬미팅', g: g.name, fd: g.fandom, sx: liveSx(idolPpl(s, g)), mem: idolPpl(s, g).map(x => [x.id === s.me ? actCall(s, 'idol') : callName(x.name), '']), mi: 0,
        z: { fans: (Math.log10(1 + gf) - 4) / 1.2, var: (lv(p, 'variety') + (p.tal.humor - 50) * 0.3 - 35) / 20, perf: (groupPower(s, g) - 45) / 18, star: (g.star - 50) / 25 }, sc: 70 });
    } else {
      if (has(p, 'variety')) practice(s, p, 'variety', 1);
      if (has(p, 'vocal')) useSkill(s, p, 'vocal', 0.5);
      pay = memberIncome(s, t, (150e4 + gf * 5) * n / (g.members.length + 1) * awMul(s, 'idol'), '방송 출연료', n);
      fans = Math.round((80 + gf * 0.002) * popSpeed(s) * myRoom(s, main));
      fxo = { stress: 1 };
      line = `${whoS} ` + U.pick(['라디오 게스트로 나가 라이브를 부르고 수다를 떨었다.', '그룹 자체 콘텐츠를 찍었다. 숙소에서 하루를 보내는 브이로그다.', '음악 방송 MC 대타로 한 주를 채웠다.']);
    }
    const paid = pay > 0 ? `내 몫 ${fmtWon(pay)}` : debt0 > 0 ? '정산금은 연습생·제작 비용을 갚는 데 들어갔다' : '';
    d.txt = line + `\n\n` + [fans ? `내 개인 팬 +${fmtFans(fans)}` : '', gfan ? `그룹 팬 +${fmtFans(gfan)}` : '', paid].filter(Boolean).join(' · ');
    // 특별한 일에도 정산 · 팬 · 그룹 팬을 함께 남긴다 (v89: 자체 콘텐츠처럼 스트레스만 남던 것). 빚을 갚느라 정산이 없으면 남은 비용을 작게
    if (fans) fxo['f' + main] = fans;
    const fxs = fx(s, fxo), ex = [pay > 0 ? `정산 ${fmtWon(pay)}` : '', gfan ? `그룹 팬 +${fmtFans(gfan)}` : ''].filter(Boolean);
    d.log = `${d.n}: ${line.split('. ')[0].replace(/\.$/, '')}.` + (ex.length ? ` (${ex.concat(fxs ? [fxs.slice(2, -1)] : []).join(' · ')})` : fxs);
    d.sub = pay <= 0 && debt0 > 0 && t.debt > 0 ? `정산금은 연습생·제작 비용을 갚는 데 들어갔다 · 남은 비용 ${fmtWon(t.debt)}` : '';
  },
  text: (s, d) => d.txt,
  sub: (s, d) => d.sub || '',
  ch: (s, d) => [{ t: '확인', f: () => d.log }],
});
// ───── 떡상: 무대·직캠 바이럴, 밈 ─────
// 작은 그룹이 사건 하나로 크게 뜨는 경우. 그룹 팬 30만 아래, 데뷔 6개월 뒤부터, 그룹마다 한 번
// 확률은 내 스탯과 회사 기획력(숨은 값)으로 정해진다. 터지면 팬이 크게 늘고, 예전 곡이 역주행하고, 2년 동안 화제성 보너스가 붙어 줄어든다
const BOOM_H = 0.00055;
function agPlan(t) { const a = AG[t.ag]; return a && a.plan != null ? a.plan : 50; }
function boomPlanMult(plan) { return 0.25 + 1.5 * Math.pow(plan / 100, 2); }
// 점수가 기준(상위 4분의 1쯤)보다 4점 높을 때마다 확률 2배 (최대 3배)
function boomStatMult(x, mid) { return Math.min(3, Math.pow(2, (x - mid) / 4)); }
// 무대·직캠: 내 춤·노래, 외모·스타성, 그룹 무대 실력
function boomStageS(s, t) { const p = me(s); return lv(p, 'dance') * 0.4 + Math.max(lv(p, 'vocal'), lv(p, 'rap')) * 0.3 + (p.tal.looks - 50) * 0.3 + (p.tal.star - 50) * 0.3 + groupPower(s, t.g) * 0.3; }
// 밈: 내 예능감·유머 감각·스타성 (말 한마디, 개인 채널, 예능 출연이 퍼진다)
function boomMemeS(s, t) { const p = me(s); return 25 + lv(p, 'variety') * 0.5 + (p.tal.humor - 50) * 0.6 + (p.tal.star - 50) * 0.4 + (p.tal.looks - 50) * 0.2; }
function idolBoomCheck(s, t) {
  if (t.boomed || t.months < 6 || groupFans(t.g) >= 3e5 || hasQ(s, 'idol_boom')) return;
  const pl = boomPlanMult(agPlan(t));
  if (U.chance(BOOM_H * boomStatMult(boomStageS(s, t), 43) * pl * (t.promo > 0 ? 1.5 : 0.75))) queueEv(s, 'idol_boom', 0, { kind: 'stage' });
  else if (U.chance(BOOM_H * boomStatMult(boomMemeS(s, t), 32) * pl)) queueEv(s, 'idol_boom', 0, { kind: 'meme' });
}
const BOOM_TEXT = {
  stage: [
    '음악방송 직캠 하나가 SNS에서 퍼졌다. 내 표정과 춤선만 따로 잘라 낸 영상이 몇백만 번 돌았다.',
    '비 오는 야외 무대에서 몇 번이고 미끄러지면서도 끝까지 해낸 영상이 퍼졌다. "이 그룹 누구냐"는 글이 쏟아졌다.',
    '대학 축제 무대 직캠이 알고리즘을 탔다. 댓글 창에 "여기서 입덕합니다"가 줄을 섰다.',
  ],
  meme: [
    '예능에서 무심코 한 말 한마디가 밈이 됐다. 다들 따라 하는 사이 우리 노래까지 같이 퍼졌다.',
    '고향 말투로 외친 한마디가 담긴 영상이 퍼져 밈이 됐다. 사람들이 "이 사람 노래도 하냐"며 우리 곡을 찾아 듣기 시작했다.',
    '멤버 개인 채널에 올린 영상이 퍼지면서 멤버들 캐릭터가 화제가 됐다. 사람들이 예전 앨범까지 찾아 듣기 시작했다.',
  ],
};
E({
  id: 'idol_boom', cat: '화제', title: '화제의 중심', tag: 'career',
  cond: s => s.tracks.idol.st === 'active',
  init(s, d) {
    const t = s.tracks.idol, g = t.g;
    t.boomed = true;
    d.v = U.pick(BOOM_TEXT[d.kind]);
    // 역주행할 곡: 그룹 곡 중 가장 좋았던 것
    const best = s.works.filter(w => w.by === g.name && w.sc != null).sort((a, b) => b.sc - a.sc)[0];
    // 터지는 크기: 무대·직캠은 무대 실력, 밈은 예전 곡이 얼마나 좋았는지(좋은 음악이 받쳐 줘야 오래 간다). 기획력이 좋으면 회사가 기회를 더 잘 살린다
    const base = d.kind === 'stage' ? (boomStageS(s, t) - 28) / 22 : ((best ? best.sc : 50) - 45) / 35 * 0.7 + (boomMemeS(s, t) - 15) / 30 * 0.3;
    const mag = U.clamp(base + (agPlan(t) - 50) / 200, 0.15, 1);
    const main = t.mkt === 'jp' ? 'jp' : 'kr', gf = groupFans(g);
    d.add = Math.round(Math.max(gf * (1.5 + 3 * mag), 3e4 + 15e4 * mag) * U.fl(0.8, 1.2));
    g.f[main] = Math.min(FANCAP[main], g.f[main] + d.add);
    d.gf = groupFans(g);
    // 직캠은 나를 보고, 밈은 나 때문에 들어온 팬이 많다
    d.my = Math.round(d.add * (d.kind === 'stage' ? 0.35 : 0.3) * myRoom(s, main));
    s.fans[main] += d.my;
    if (best) {
      d.song = best.title; d.ago = calY(s) - best.y;
      d.peak = chartFromScore(U.clamp(best.sc + 2 + mag * 12 + U.normal(0, 4), 0, 100));
      if (d.peak) d.pay = memberIncome(s, t, (101 - d.peak) * 600e4, '역주행 음원 정산');
      if (d.peak === 1 && !s.flags.no1) { s.flags.no1 = true; milestone(s, `${age(s)}세에 ${g.name}의 ${josa(`「${best.title}」`, '이가')} 역주행해 음원 차트 1위에 올랐다.`); }
    }
    t.buzz = 24; t.buzzB = 4 + mag * 6;
    milestone(s, `${age(s)}세에 ${d.kind === 'stage' ? '무대 영상' : '밈'}으로 「${g.name}」이 크게 화제가 됐다.`);
  },
  text(s, d) {
    const g = s.tracks.idol.g, t = s.tracks.idol;
    let x = `${d.v}\n\n그룹 팬 +${fmtFans(d.add)} → ${fmtFans(d.gf)} · 내 개인 팬 +${fmtFans(d.my)}`;
    if (d.song) x += `\n${d.ago >= 1 ? `${d.ago}년 전에 낸 ` : ''}「${d.song}」${josa(d.song, '이가').slice(d.song.length)} 역주행했다. ${chartText(d.peak)}.`;
    if (d.pay) x += `\n역주행 정산금 ${fmtWon(d.pay)}.`;
    else if (d.peak && t.debt > 0) x += `\n아직 갚아야 할 연습생·제작 비용이 ${fmtWon(t.debt)} 남아 이번 정산금은 비용을 갚는 데 들어갔다.`;
    return x + `\n\n한동안 「${g.name}」${josa(g.name, '이가').slice(g.name.length)} 어디서나 화제다. 이 관심이 다음 앨범까지 이어질지는 지금부터다.`;
  },
  ch: () => [{ t: '이 기회를 놓치지 않는다', f: s => `「${s.tracks.idol.g.name}」${josa(s.tracks.idol.g.name, '이가').slice(s.tracks.idol.g.name.length)} 화제가 됐다.` + fx(s, { jp: { idol: 10 }, fame: 8, rep: 3 }) }],
});
// 정산: 회사 몫을 떼고 멤버 수로 나눈다. 연습생 비용과 제작비를 다 갚기 전에는 빚부터 갚는다
// n: 나눠 갖는 사람 수 (스케줄에 일부만 나가면 나간 사람끼리 나눈다. 없으면 멤버 전원)
// 정산서를 남긴다 (v118 UI C2). 비용을 다 갚는 순간은 창으로 (C4)
function memberIncome(s, t, rev, label, n) {
  if (!(rev > 0)) return 0;
  const r = billPay(s, { t, rev, cut: t.cut, n: n || t.g.members.length + 1, team: '그룹', what: label, job: 'idol', costN: '연습생 · 제작 비용' });
  if (r.pay > 0 && t.debt <= 0 && !t.firstPay) { t.firstPay = true; debtClear(s, 'idol', t); }
  return r.share;
}
// 포지션: 메인보컬·메인래퍼·비주얼은 꼭 한 명씩. 나머지는 잘하는 쪽으로
function assignIdolPos(s, ids) {
  const P = id => s.people[id], left = ids.slice(), pos = {};
  const take = (name, f) => { if (!left.length) return; const b = left.slice().sort((a, c) => f(P(c)) - f(P(a)))[0]; pos[b] = name; left.splice(left.indexOf(b), 1); };
  take('메인보컬', x => lv(x, 'vocal'));
  take('메인래퍼', x => lv(x, 'rap') + lv(x, 'dance') * 0.1);
  take('비주얼', x => x.tal.looks);
  take('메인댄서', x => lv(x, 'dance'));
  for (const id of left) { const x = P(id); pos[id] = lv(x, 'vocal') >= lv(x, 'dance') && lv(x, 'vocal') >= lv(x, 'rap') ? (U.chance(0.5) ? '리드보컬' : '서브보컬') : lv(x, 'rap') > lv(x, 'dance') ? '서브래퍼' : '리드댄서'; }
  const byAge = ids.slice().sort((a, b) => P(a).by - P(b).by);
  pos[byAge[0]] += ' · 리더'; pos[byAge[byAge.length - 1]] += ' · 막내';
  return pos;
}
// 그룹 실력: 주인공이 절반(50%)을 차지하고, 나머지 절반은 다른 멤버들이 똑같이 나눈다 (내가 잘하면 그룹이 같이 산다)
function groupPower(s, g) {
  const all = [s.me].concat(g.members).map(id => s.people[id]).filter(Boolean);
  const at = name => all.find(x => (g.pos[x.id] || '').startsWith(name));
  const mine = s.people[s.me], others = all.filter(x => x.id !== s.me);
  const avg = f => !others.length ? f(mine) : f(mine) * 0.5 + others.reduce((a, x) => a + f(x), 0) / others.length * 0.5;
  const mv = at('메인보컬'), mr = at('메인래퍼'), vs = at('비주얼');
  // v117: 팀워크만큼 0.8~1.2배
  return ((mv ? lv(mv, 'vocal') : 0) * 0.25 + (mr ? lv(mr, 'rap') : 0) * 0.15 + avg(x => lv(x, 'dance')) * 0.25 + avg(x => Math.max(lv(x, 'vocal'), lv(x, 'rap'))) * 0.25 + avg(x => lv(x, 'variety')) * 0.1 + (vs ? (vs.tal.looks - 50) * 0.15 : 0)) * twMul(g);
}
function newGroupName(s, size) {
  const used = new Set(s.usedNames || []);
  let n, tries = 0;
  do { n = groupNameRaw(size); tries++; } while ((used.has(n) || nameTaken(n)) && tries < 30);
  (s.usedNames = s.usedNames || []).push(n);
  return n;
}
// 내가 속한 아이돌 그룹의 멤버들 (나 포함)
function idolPpl(s, g) { return [me(s)].concat(g.members.map(id => s.people[id]).filter(Boolean)); }
// 그룹 나이에 맞지 않는 컨셉(반토막 나는 것)는 대표 컨셉으로, 대표 컨셉도 안 맞으면 맞는 것 중에서 고른다 (v97)
function fitConcept(s, g, c) { const P = idolPpl(s, g); return cAgeOK(s, P, c, 1) ? c : cAgeOK(s, P, g.sig, 1) ? g.sig : U.pick(TRENDS.filter(x => cAgeOK(s, P, x, 1))); }
function makeGroup(s, t, surv) {
  const ag = AG[t.ag], p = me(s);
  const size = U.int(4, 7), ids = [];
  for (const n of people(s, n => n.rel === '동기' && n.trainee === t.ag && n.g === p.g)) if (ids.length < size - 1 && U.chance(0.6)) ids.push(n.id);
  while (ids.length < size - 1) {
    const main = U.pick(['vocal', 'dance', 'rap', 'vocal']);
    ids.push(makeMusicMate(s, { g: p.g, rel: '멤버', job: '아이돌', met: '같은 그룹 멤버', mkt: ag.mkt, tal: ['music', 'voice', 'rhythm', 'looks', 'star'], sk: { vocal: ag.thr + (main === 'vocal' ? 10 : 0), dance: ag.thr + (main === 'dance' ? 10 : 0), rap: main === 'rap' ? ag.thr + 10 : ag.thr - 8, variety: ag.thr - 12 } }).id);
  }
  for (const id of ids) { const n = s.people[id]; n.rel = '멤버'; n.job = '아이돌'; n.trainee = null; n.aff = Math.max(n.aff, 40); n.metOrg = ag.n; }
  const all = [s.me].concat(ids);
  uniqNames(s, all); // 같은 그룹에 동명이인은 없다 (v163)
  const star = Math.round(all.reduce((a, id) => a + s.people[id].tal.star, 0) / all.length + U.normal(0, 6));
  return { tw: surv ? 20 : 30, name: newGroupName(s, all.length), fandom: U.pick(FANDOM_NAMES), members: ids, pos: assignIdolPos(s, all), mo: U.normal(0, 4) + (agPlan(t) - 50) * 0.04, sig: U.pick(TRENDS.filter(x => cAgeOK(s, all.map(id => s.people[id]).filter(Boolean), x, 1))), star: U.clamp(star, 10, 98), f: { kr: 0, jp: 0, us: 0 }, base: ag.tier * 3000 + U.int(300, 2000) + (surv || 0) };
}
// 아이돌 곡 점수에 붙는 회사 크기 보너스 (다른 직업은 등급×4 그대로). 소형과 중형보다 중형과 대형 차이가 훨씬 크다
const IDOL_TIER_B = [0, 7, 9, 13];
// 앨범 점수 흐름 조절: 신인 관심(데뷔 첫해), 대중 피로도(3년 뒤 해마다, 최대)
const IDOL_CURVE = { rookie: 3.2, rate: 0.5, max: 3.2 };
const IDOL_ALBUM_MULT = 1.9;
// a: 회사가 만든 앨범 (v154 album.js albKeep). 없으면(예전 세이브) 예전처럼 회사 크기만큼의 곡
function idolRelease(s, t, c, debut, a) {
  const g = t.g, gf = groupFans(g), p = me(s);
  const q = (a ? a.q : boughtQ(t.tier)) + (t.anrQ || 0) + (agPlan(t) - 50) * 0.08;
  const buzz = t.buzz > 0 ? (t.buzzB || 0) * t.buzz / 24 : 0;
  // 그룹 흐름(숨은 값): 앨범마다 조금씩 바뀐다. 좋은 흐름이 몇 앨범 이어지기도, 나쁜 흐름이 이어지기도 한다 (데뷔 때부터 그룹마다 다르다)
  if (g.mo == null) g.mo = U.normal(0, 4);
  // 대중 피로도: 데뷔 3년이 지나면 해마다 반응이 조금씩 무뎌진다 (최대 IDOL_CURVE.max). 오래 버티려면 실력과 흐름이 받쳐 줘야 한다
  const tired = Math.min(IDOL_CURVE.max, Math.max(0, t.months / 12 - 3) * IDOL_CURVE.rate);
  // 신인 관심: 데뷔 첫해에는 새 그룹이라는 것만으로 조금 더 봐 준다
  const rookie = t.months < 12 ? IDOL_CURVE.rookie : 0;
  // 회사 크기 보너스는 아이돌만 따로
  // 컨셉 궁합 (v97): 멤버들의 재능 · 나이 · 랩
  const cf = cFit(s, c, [p].concat(g.members.map(id => s.people[id]).filter(Boolean)), stageYrs(s));
  // v157: 이번 한 번의 보탬 — 안무 수정(무대) · 내 파트가 늘거나 줄었으면 내 몫 (idolev.js)
  const ob = typeof idolTakeB === 'function' ? idolTakeB(t) : { st: 0, part: 0 };
  const sc = songScore(s, { perf: cPerf(groupPower(s, g), cf), q, fans: gf, tier: 0, trend: c === s.trend, bonus: IDOL_TIER_B[t.tier] + (g.star - 50) * 0.12 + (c === g.sig ? 3 : 0) + Math.min(t.cbCount, 6) * 0.6 + buzz + g.mo - tired + rookie + cScoreB(cf) + ob.st });
  g.mo = g.mo * 0.6 + U.normal(0, 4.5);
  const peak = chartFromScore(sc);
  jpopWork(s, 'idol', sc);
  const main = t.mkt === 'jp' ? 'jp' : 'kr';
  const gain = { kr: 0, jp: 0, us: 0 };
  gain[main] = fanGainRaw(sc, g.f[main], 0.6 + t.tier * 0.25, starCap(g.star, main));
  if (debut) gain[main] = Math.max(gain[main], U.int(150, 800));
  const pos = Math.max(0, gain[main]);
  // 진출한 나라에서는 그 나라 말을 잘할수록 반응이 커진다 (말을 못 하면 0.3배, 30레벨 0.8배, 60레벨 1.3배, 100레벨 2배쯤)
  if (main === 'kr') gain.jp = t.jpDebut ? Math.round(fanGainRaw(sc - 3, g.f.jp, 0.5, starCap(g.star, 'jp')) * langMult(p, 'jp')) : Math.round(pos * 0.04);
  else gain.kr = Math.round(pos * 0.05);
  gain.us = t.usDebut ? Math.round(fanGainRaw(sc - 6, g.f.us, 0.5, starCap(g.star, 'us')) * langMult(p, 'en')) : Math.round(pos * 0.02);
  MK.forEach(m => { g.f[m] = U.clamp(g.f[m] + gain[m], 0, FANCAP[m]); });
  const wins = showWins(sc, groupFans(g)), ht = hitTrend(s, c, peak, wins);
  // 내 개인 팬 (v94): 외모 · 스타성, 그리고 노래(랩) · 춤 실력이 좋을수록 그룹 팬 중에서 나를 좋아하는 사람이 많다
  const share = U.clamp(0.3 + ((p.tal.looks * 0.4 + p.tal.star * 0.3 + Math.max(lv(p, 'vocal'), lv(p, 'rap')) * 0.15 + lv(p, 'dance') * 0.15) - 45) / 80, 0.12, 0.85) * 3 / (g.members.length + 1) * (1 + ob.part);
  const my = {};
  MK.forEach(m => { my[m] = Math.round(Math.max(0, gain[m]) * share * myRoom(s, m)); s.fans[m] += my[m]; });
  const title = a ? a.title : songTitle();
  cNote(s, cf, title);
  // 앨범 판매량: 앨범 간격이 길어서(6~9달) 한 번 낼 때 팬들이 여러 장씩 산다 (IDOL_ALBUM_MULT). v154: 수록곡이 좋으면 조금 더 팔린다 (평균이면 그대로)
  const sideM = a && a.side != null ? U.clamp(1 + (a.side + (ALB_NPC_ADJ[t.tier] || 0) - (16 + t.tier * 7)) / 250, 0.9, 1.15) : 1;
  const albums = Math.round((g.f.kr * U.fl(0.25, 0.45) + g.f.jp * 0.25 + g.f.us * 0.1) * IDOL_ALBUM_MULT * sideM);
  // 앨범 제작비: 아직 작은 그룹에는 회사도 돈을 덜 쓴다 (그룹 팬 30만 명이 되면 다 쓴다)
  t.debt += [0, 1.2e8, 2.5e8, 4e8][t.tier] * (0.45 + 0.55 * Math.min(1, gf / 3e5)) / (g.members.length + 1);
  const pay = memberIncome(s, t, albums * 14000 + (peak ? (101 - peak) * 400e4 : 0), '앨범·음원 정산');
  // 내 곡 · 가사 (v154): 예전에는 주사위로 이름이 올랐다. 이제 '자작곡 쓰기 · 가사 쓰기'를 켜 두고 심사 · 선정을 거쳐 실려야 한다
  const wrote = a ? albRoyalty(s, a, sc, 'idol').txt : '';
  // 그 컨셉으로 활동하는 것만으로도 컨셉 숙련도가 조금 오른다 (직접 작곡의 30%)
  cmGain(s, c, 3);
  // 활동기 2달 · 쉬는 2~3달: 5~6달에 한 번 컴백 (쉬는 동안 광고·예능 같은 다른 스케줄이 들어온다)
  // v154: 발매 뒤 2~3달째(활동 둘째 달이나 그다음 달)에 다음 앨범 기획이 시작되고, 석 달 뒤에 나온다
  t.cbCount++; t.promo = 2; t.nextCb = U.int(2, 3); t.alb = null;
  t.flops = sc < 50 ? (t.flops || 0) + 1 : Math.max(0, (t.flops || 0) - 1);
  // v158 회사 평가: 최근 두 앨범이 회사 기대에 못 미치면 해체 이야기가 나온다 (idolev.js)
  idolReview(s, t, sc, debut);
  t.yearBest = Math.max(t.yearBest || 0, sc);
  // 발매 결과 카드 (v118 UI C1): 무대 실력 · 곡 · 팬 · 유행 · 팀워크 · 컨셉 궁합 · 스타성 · 피로도 · 대표 컨셉
  if (t.lastBill) t.lastBill.t = `「${title}」 앨범 · 음원 정산`;
  const F = [{ z: (groupPower(s, g) - 45) / 18, g: ['퍼포먼스가 눈을 못 떼게 한다', '라이브가 안정적이다'], b: ['라이브가 조금 불안하다', '무대가 아직 덜 여물었다'] }, RX.q(q), RX.fans(gf, gain.kr + gain.jp + gain.us), RX.trend(c === s.trend, ht), RX.tw(twOf(g)), RX.cf(cScoreB(cf)), { z: (g.star - 50) / 25, g: ['멤버들 얼굴이 화면을 꽉 채운다'], b: ['눈에 확 띄는 멤버가 없다'] }];
  if (tired > 1) F.push({ z: -tired / 4, g: ['오래 봐도 질리지 않는다'], b: ['비슷한 컨셉이 이어져 조금 익숙하다'] });
  if (c === g.sig) F.push({ z: 0.5, g: ['역시 이 그룹다운 컨셉이다'], b: ['늘 하던 컨셉이라 뻔하다'] });
  const card = songCardMake({ t: title, by: g.name, peak, wins, fans: [['그룹 팬', gain.kr + gain.jp + gain.us], ['내 팬', my.kr + my.jp + my.us]], pay, bill: pay > 0 || t.debt > 0 ? t.lastBill : null }, F, sc, g);
  if (a && a.mk) card.mk = a.mk; // 제작 과정 (v154): 성적표 · 작품 탭에서 본다
  if (ht) hitTrendGo(s, c, title, g.name);
  // 실시간 창 (12-1): 데뷔 무대 · 컴백 첫 음악방송. 카드와 같은 요인으로 장면을 만든다 (내 몫: 내 실력 · 스타성)
  card.live = liveStage({ k: 'idol', place: debut ? '데뷔 무대' : '음악방송', t: title, g: g.name, fd: g.fandom, c, sx: liveSx(idolPpl(s, g)), mem: idolPpl(s, g).map(x => [x.id === s.me ? actCall(s, 'idol') : callName(x.name), (g.pos[x.id] || '').split(' · ')[0]]), mi: 0,
    z: { perf: F[0].z, q: F[1].z, fans: F[2].z, trend: F[3].z, tw: F[4].z, cf: F[5].z, star: F[6].z, me: (Math.max(lv(p, 'vocal'), lv(p, 'rap'), lv(p, 'dance')) * 0.6 + p.tal.star * 0.4 - 45) / 18 }, sc, wins, cand: sc >= 66, debut, key: !!debut || wins > 0 || sc >= 66, rv: sc >= 66 && !wins ? npcStageRival(s, g.name) : '' });
  addWork(s, { type: debut ? '데뷔 앨범' : '앨범', title, by: g.name, sc, pay, note: chartText(peak) + (wins ? ` · 음악방송 1위 ${wins}회` : ''), card });
  if (peak === 1 && !s.flags.no1) { s.flags.no1 = true; milestone(s, `${age(s)}세에 ${g.name}의 ${josa(`「${title}」`, '으로')} 음원 차트 1위를 했다.`); }
  for (const id of g.members) { const m = s.people[id]; if (m) bond(s, m, sc >= 65 ? 3 : 1); }
  return { sc, peak, wins, albums, gain, my, pay, title, cm: comments(sc, actNick(s, 'idol')), wrote, debt: t.debt, card };
}
E({
  id: 'idol_aud', cat: '오디션', title: (s, d) => d.kind === 'band' ? '밴드 연습생 오디션 결과' : '아이돌 오디션 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); },
  text(s, d) {
    const ag = AG[d.ag];
    if (!d.pass) return `${ag.n}에서 끝내 연락이 오지 않았다. 불합격이다.`;
    return `${ag.n} ${d.kind === 'band' ? '밴드 연습생 ' : ''}오디션에 합격했다! 연습생 계약서를 받았다. (${trContractText(s)})\n\n연습생이 되면 숙소에서 지내고, 일정 ${age(s) < 19 ? '한 칸' : '두 칸'}이 회사 트레이닝으로 고정된다. 트레이닝 비용은 데뷔한 뒤 번 돈에서 먼저 갚는다.\n계약 기간 안에 데뷔조에 들지 못하면 회사가 내보낼 수 있다.`;
  },
  ch(s, d) {
    const ag = AG[d.ag];
    if (!d.pass) return [{ t: '다시 준비한다', f: s => `${ag.n} 오디션에 떨어졌다.` + fx(s, { stress: 4 * pm(s, 'loseStress') }) }];
    return [
      { t: '계약서를 받아 본다', ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '정산 비율과 데뷔 뒤 계약 기간을 협상할 수 있다', f: s => startNego(s, { kind: 'idol', ag: d.ag, agN: ag.n, months: 84, cut: ag.cut, k2: d.kind, part: d.part, trC: trContractText(s), lev: U.clamp((d.p - 0.5) * 0.8 + 0.15, 0.05, 0.6) }) },
      { t: '거절한다', f: () => `${ag.n} 연습생 제안을 거절했다.` },
    ];
  },
});
E({
  id: 'idol_team', cat: '연습생', title: '데뷔조 발탁', tag: 'career', keepPop: true, // v123: 요약에만 남기지 않고 창으로
  cond: s => s.tracks.idol.st === 'trainee',
  text: s => { const t = s.tracks.idol; return `${t.agN}에서 새 ${t.kind === 'band' ? '밴드' : '그룹'} 데뷔조를 꾸린다. 최근 평가 ${t.rank}위로 이름이 올랐다.\n\n이제 반년쯤 데뷔 준비에 들어간다. 준비 중에도 평가가 밀리면 빠질 수 있다.`; },
  ch: () => [{ t: '열심히 하겠습니다', f: s => { const t = s.tracks.idol; t.team = true; t.prep = 0; t.seatLost = false; t.seatQ = false; return '데뷔조에 들어갔다!' + fx(s, { stress: -4 }); } }],
});
// 방출: 회사가 정해서 알려 준다 (연습생은 고를 수 없다)
function releaseTrainee(s, why) {
  const t = s.tracks.idol, n = t.agN;
  const mates = people(s, x => x.rel === '동기' && x.trainee === t.ag);
  quitTrainee(s, '방출');
  for (const m of mates) aff(m, 5);
  return `${n} 연습생 생활이 끝났다. ${why}숙소 짐을 챙겨 나왔다.${mates.length ? ` 동기 ${mates.map(m => m.name).join(', ')}${josa(mates[mates.length - 1].name, '이가').slice(mates[mates.length - 1].name.length)} 배웅해 줬다.` : ''}` + fx(s, { stress: 8 * pm(s, 'loseStress') });
}
E({
  id: 'idol_cut', cat: '연습생', title: '방출 통보', tag: 'career',
  cond: s => s.tracks.idol.st === 'trainee' && !s.tracks.idol.team,
  text: s => { const t = s.tracks.idol; return `${t.agN}에서 연습생 계약을 끝내기로 했다는 통보를 받았다. 최근 평가는 ${t.rank}위(${t.pool}명 중)였고, ${age(s) >= 24 ? '데뷔하기엔 나이가 많다는' : t.fails ? '데뷔 기회를 놓친 게 벌써 여러 번이라는' : '성장이 더디다는'} 말이 돌아왔다.\n\n다른 회사 오디션은 다시 볼 수 있다.`; },
  ch: () => [{ t: '짐을 싼다', f: s => releaseTrainee(s, '') }],
});
E({
  id: 'idol_renew', cat: '연습생', title: '연습생 계약 만료', tag: 'career',
  cond: s => s.tracks.idol.st === 'trainee' && !s.tracks.idol.team,
  // 어린 연습생은 순위가 낮아도 회사가 더 지켜본다 (17세 미만은 늘 연장, 17~18세는 하위 15%만 내보낸다)
  init(s, d) { const t = s.tracks.idol, a = age(s), line = a < 17 ? 1 : a < 19 ? 0.85 : 0.6; d.keep = t.rank <= t.pool * line && a < 24 && t.fails < 3; d.young = d.keep && t.rank > t.pool * 0.6; },
  text: (s, d) => { const t = s.tracks.idol; return `${t.agN} 연습생 계약 기간이 끝났다. (들어온 지 ${yrsMo(t.months)}) 최근 평가 ${t.rank}위(${t.pool}명 중).\n\n` + (d.keep ? (d.young ? '순위는 아쉽지만 아직 어리니 회사는 1년 더 지켜보기로 했다.' : '회사는 1년 더 지켜보기로 했다.') : '회사는 계약을 연장하지 않기로 했다. 다른 회사 오디션은 다시 볼 수 있다.'); },
  ch: (s, d) => d.keep ? [{ t: '1년 더 해 본다', f: s => { s.tracks.idol.cEnd += 12; return '연습생 계약이 1년 연장됐다.' + fx(s, { stress: 4 }); } }] : [{ t: '짐을 싼다', f: s => releaseTrainee(s, '계약 기간 안에 데뷔하지 못했다. ') }],
});
// 데뷔조에서 빠지거나 데뷔 자체가 무산되는 경우
E({
  id: 'idol_teamcut', cat: '연습생', title: '데뷔 무산', tag: 'career',
  cond: s => s.tracks.idol.st === 'trainee' && s.tracks.idol.team,
  text: (s, d) => { const t = s.tracks.idol; return d.why === 'rank' ? `데뷔조 중간 점검에서 내 이름이 빠졌다. 최근 평가가 ${t.rank}위로 밀렸다는 이유였다.\n\n다시 일반 연습생으로 돌아간다.` : `회사 사정으로 이번 ${t.kind === 'band' ? '밴드' : '그룹'} 데뷔 프로젝트가 통째로 무산됐다. 데뷔조가 흩어졌다.\n\n다시 일반 연습생으로 돌아간다.`; },
  ch: () => [{ t: '다시 시작한다', f: s => { const t = s.tracks.idol; t.team = false; t.prep = 0; t.fails = (t.fails || 0) + 1; milestone(s, `${age(s)}세에 데뷔 직전에 데뷔가 무산됐다.`); return '데뷔가 무산됐다. 다시 연습생으로 돌아갔다.' + fx(s, { stress: 6 * pm(s, 'loseStress') }); } }],
});
const SURV_SHOWS = ['별의 계단', '데뷔 카운트다운', '라스트 스테이지', '스타트 라인', '아이돌 런웨이', '데뷔 티켓',
  '센터를 찾아라', '아홉 개의 의자', '꿈의 데뷔조', '스테이지 제로', '마지막 한 자리', '데뷔 직행열차'];
// 서바이벌 출연은 회사가 정해서 연습생에게 알려 준다
E({
  id: 'idol_surv', cat: '연습생', title: '서바이벌 프로그램 출연', tag: 'career',
  init(s, d) { d.show = U.pick(SURV_SHOWS); },
  cond: s => s.tracks.idol.st === 'trainee',
  text: (s, d) => `${s.tracks.idol.agN}에서 데뷔 서바이벌 「${d.show}」에 연습생 몇 명을 내보내기로 했다. 명단에 내 이름이 있다.\n\n최종 7위 안에 들면 바로 데뷔한다. 떨어져도 얼굴은 알릴 수 있지만, 순위가 낮으면 상처도 크다. 결과는 석 달 뒤.`,
  ch: (s, d) => [{ t: '준비한다', f: s => { queueEv(s, 'idol_survres', 3, { show: d.show }); return `회사 결정으로 데뷔 서바이벌 프로그램 「${d.show}」에 나가게 됐다. 최종 7위 안에 들면 바로 데뷔한다. 결과는 석 달 뒤.` + fx(s, { stress: 8 }); } }],
});
E({
  id: 'idol_survres', cat: '서바이벌', title: '서바이벌 최종 순위', tag: 'career',
  init(s, d) {
    const p = me(s);
    const sc = idolScore(s) * 0.7 + lv(p, 'variety') * 0.15 + (p.tal.looks - 50) * 0.15 + (p.tal.star - 50) * 0.15 + pm(s, 'audition', 0) + U.normal(0, 6);
    d.rank = sc >= 40 ? U.int(1, 3) : sc >= 32 ? U.int(4, 9) : sc >= 25 ? U.int(10, 20) : sc >= 18 ? U.int(21, 40) : U.int(41, 80);
    if (s.tracks.idol.st !== 'trainee') d.rank = Math.max(d.rank, 8);
    d.fans = Math.round(300000 / Math.pow(d.rank, 1.1) * popSpeed(s));
    s.fans.kr += d.fans;
    // 방송에 얼굴이 나가서 이름이 알려진다 (순위가 높을수록 더)
    addFame(s, d.rank <= 3 ? 8 : d.rank <= 9 ? 5 : d.rank <= 20 ? 3 : d.rank <= 40 ? 2 : 1);
  },
  text: (s, d) => `「${d.show}」 최종 순위 ${d.rank}위.\n\n${d.rank <= 7 ? '데뷔 멤버에 들었다! 이름이 불리는 순간 다리가 풀렸다.' : '데뷔 멤버에는 들지 못했다.'}\n방송 덕분에 팬이 ${fmtFans(d.fans)} 생겼다.`,
  ch: (s, d) => [{
    t: '확인', f: s => {
      milestone(s, `${age(s)}세에 서바이벌 「${d.show}」에서 최종 ${d.rank}위를 했다.`);
      const fan = ` 방송 덕분에 팬이 ${fmtFans(d.fans)} 생겼다.`;
      if (d.rank <= 7) { const t = s.tracks.idol; t.team = true; t.prep = 6; queueEv(s, 'idol_debut', 0, { surv: d.fans }); return `데뷔 서바이벌 「${d.show}」 최종 ${d.rank}위로 데뷔가 확정됐다!` + fan; }
      return `데뷔 서바이벌 「${d.show}」 최종 ${d.rank}위. 데뷔 멤버에는 들지 못했다.` + fan + fx(s, { stress: d.rank <= 20 ? -3 : 8 * pm(s, 'loseStress') });
    },
  }],
});
E({
  id: 'idol_debut', cat: '데뷔', title: '드디어 데뷔', tag: 'career', keepPop: true,
  cond: s => s.tracks.idol.st === 'trainee',
  init(s, d) { d.g = makeGroup(s, s.tracks.idol, d.surv); d.c = fitConcept(s, d.g, U.chance(0.6) ? s.trend : d.g.sig); },
  text(s, d) {
    const t = s.tracks.idol, g = d.g;
    const lines = g.members.map(id => { const n = s.people[id]; return `· ${n.name} (${pAge(s, n)}세) ${g.pos[id]}${soulTag(n)}`; }).join('\n');
    return `${t.agN}의 새 ${me(s).g === '여' ? '걸그룹' : '보이그룹'} ${josa(`「${g.name}」`, '으로')} 데뷔한다!\n\n멤버 ${g.members.length + 1}명\n· 나 (${age(s)}세) ${g.pos[s.me]}\n${lines}\n\n포지션은 회사가 정했다.\n팬덤 이름은 '${g.fandom}', 그룹 대표 컨셉은 '${g.sig}'. 데뷔곡 컨셉은 '${d.c}'${josa(d.c, '이').slice(d.c.length)}다.${d.c === s.trend ? ' 요즘 유행하는 컨셉이다.' : ''}`;
  },
  ch: (s, d) => [{
    t: '데뷔 무대에 선다',
    f: s => {
      const t = s.tracks.idol;
      musicRookie(s, true);
      Object.assign(t, { st: 'active', g: d.g, pos: d.g.pos[s.me], months: 0, contract: t.gMonths || 84, promo: 0, nextCb: 99, cbCount: 0, flops: 0, yearBest: 0, firstPay: false, jpDebut: t.mkt === 'jp', usDebut: false });
      const main = t.mkt === 'jp' ? 'jp' : 'kr';
      t.g.f[main] = d.g.base + Math.round(s.fans[main] * 0.5);
      for (const n of people(s, n => n.rel === '동기' && n.trainee === t.ag)) { n.rel = '친구'; n.trainee = null; }
      milestone(s, `${age(s)}세에 「${d.g.name}」의 ${josa(d.g.pos[s.me].split(' · ')[0], '으로')} 데뷔했다.`);
      idolAlbStart(s, t, d.c, true); // v154: 데뷔 앨범도 회사가 앨범 제작 틀로 만든다 (데뷔 준비 동안 해 둔 것)
      askStageName(s, 'idol', t.agN);
      return `「${d.g.name}」 ${josa(d.g.pos[s.me].split(' · ')[0], '으로')} 데뷔 무대에 섰다! 데뷔곡은 '${d.c}' 컨셉.`;
    },
  }],
});
// 다음 컴백: 컨셉은 회사가 정하고, 그룹이 충분히 커지면 의견을 낼 수 있다
function idolSay(s, t) { return groupFans(t.g) >= 3e5 || t.months >= 48; }
function idolNextComeback(s, t) {
  const c = fitConcept(s, t.g, U.chance(0.55) ? s.trend : t.g.sig);
  t.nextCb = 99;
  // 회의는 그달 다른 일보다 먼저 뜬다 (한 달 밀리면 컴백이 6달을 넘는다)
  if (idolSay(s, t)) { if (queueEv(s, 'idol_cb', 0, { c })) s.queue.unshift(s.queue.pop()); return; }
  const a = idolAlbStart(s, t, c);
  addLog(s, `${josa(a.mk.boss, '이가')} 「${t.g.name}」 다음 앨범을 '${c}' 컨셉으로 기획했다. 데모곡을 모아 A&R 심사를 시작한다.`, 'career');
}
E({
  id: 'idol_cb', cat: '컴백', title: '컴백 회의', tag: 'career',
  cond: s => s.tracks.idol.st === 'active',
  init(s, d) { const g = s.tracks.idol.g; d.alt = U.shuffle(TRENDS.filter(x => x !== d.c && fitConcept(s, g, x) === x)).slice(0, 2); d.p = U.clamp(0.3 + Math.log10(1 + groupFans(g)) / 20 + (s.rep - 50) / 200, 0.2, 0.85); },
  text(s, d) { const g = s.tracks.idol.g; return `「${g.name}」의 다음 앨범 회의가 열렸다. ${josa(agProd(s, s.tracks.idol.ag, g).n, '은는')} '${d.c}' 컨셉을 생각하고 있다. 요즘 차트에선 '${s.trend}' 컨셉이 강세고, 우리 그룹 대표 컨셉은 '${g.sig}'${josa(g.sig, '이').slice(g.sig.length)}다.\n\n그룹이 커진 만큼 멤버들도 의견을 낼 수 있다.`; },
  ch(s, d) {
    const g = s.tracks.idol.g;
    // v154: 컨셉이 정해지면 회사가 데모곡을 모아 심사 · 선정을 하고, 석 달 뒤에 앨범이 나온다
    const go = c => { const t = s.tracks.idol; if (t.st === 'active' && !t.alb && !hasQ(s, 'idol_cbres')) idolAlbStart(s, t, c); };
    const C = [{ t: `회사 뜻대로 '${d.c}' 컨셉으로 간다`, tr: d.c === s.trend, f: s => { go(d.c); return `'${d.c}' 컨셉으로 다음 앨범 준비를 시작했다.`; } }];
    d.alt.forEach(c => C.push({ t: `'${c}' 컨셉을 제안한다`, tr: c === s.trend, sig: c === g.sig, h: `받아들여질 가능성 ${fmtPct(d.p)}${c === g.sig ? ' · 그룹에 잘 어울린다' : ''}`, f: s => { const ok = U.chance(d.p); go(ok ? c : d.c); return ok ? `내 의견대로 '${c}' 컨셉으로 가기로 했다.` : `제안은 받아들여지지 않았다. '${d.c}' 컨셉으로 간다.`; } }));
    return C;
  },
});
E({
  id: 'idol_cbres', cat: '앨범 성적', title: '앨범 성적표', tag: 'career',
  plio: (s, d) => typeof plioSong === 'function' ? plioSong(s, d, 'idol') : null,
  live: (s, d) => d.card && d.card.live,
  init(s, d) { const t = s.tracks.idol; if (t.st !== 'active') { d.skip = true; return; } d.r = idolRelease(s, t, d.c, d.debut, d.a || null); d.card = d.r.card; teamRel(s, 'idol', t, d.r.peak, !d.r.peak || d.r.peak > 60); },
  // v154: 성적표 위에 '제작 과정' 배너
  html: (s, d) => d.card && typeof songCardHTML === 'function' ? cardText(s, d) + albBannerHTML(d.card.mk) + songCardHTML(d.card) : '',
  text(s, d) {
    const r = d.r, g = s.tracks.idol.g;
    const my = MK.filter(m => r.my[m]).map(m => `${MK_N[m]} ${sgnFans(r.my[m])}`).join(' · ') || '변화 없음';
    // 진출한 나라의 반응과 내 그 나라 말 실력
    const t = s.tracks.idol, p = me(s), abroad = [];
    if (t.jpDebut && t.mkt !== 'jp') abroad.push(`일본 ${sgnFans(r.gain.jp)} (내 일본어 ${has(p, 'jp') ? lvi(p, 'jp') + '레벨' : '못 함'})`);
    if (t.usDebut) abroad.push(`미국 ${sgnFans(r.gain.us)} (내 영어 ${has(p, 'en') ? lvi(p, 'en') + '레벨' : '못 함'})`);
    // 순위 · 팬 변화 · 반응은 카드에 있다 (v118 UI C1). 예전 세이브의 카드 없는 창은 예전처럼
    let x = d.card ? `${d.debut ? '데뷔' : '컴백'} 앨범 「${r.title}」 ('${d.c}' 컨셉)\n\n앨범 ${r.albums.toLocaleString()}장 · 그룹 팬 ${fmtFans(groupFans(g))}${abroad.length ? `\n해외 그룹 팬: ${abroad.join(' · ')}` : ''}`
      : `${d.debut ? '데뷔' : '컴백'} 앨범 「${r.title}」 ('${d.c}' 컨셉)\n\n${chartText(r.peak)} · 음악방송 1위 ${r.wins}회 · 앨범 ${r.albums.toLocaleString()}장\n그룹 팬 ${sgnFans(r.gain.kr + r.gain.jp + r.gain.us)} → ${fmtFans(groupFans(g))}${abroad.length ? `\n해외 그룹 팬: ${abroad.join(' · ')}` : ''}\n내 개인 팬 ${my}\n\n팬 반응: ${r.cm}`;
    if (r.wrote) x += `\n\n${r.wrote}`;
    if (d.card && d.card.bill && d.card.bill.note) return x + `\n\n${d.card.bill.note}`;
    x += r.debt > 0 ?`\n\n아직 갚아야 할 연습생·제작 비용이 ${fmtWon(r.debt)} 남아 이번 활동 정산금은 없다.` : `\n\n이번 앨범 정산금 ${fmtWon(r.pay)}.`;
    return x;
  },
  // 빚을 갚느라 정산금이 없으면 남은 비용을 특별한 일에 작게 (v89)
  sub: (s, d) => d.r && d.r.debt > 0 ? `이번 활동 정산금은 연습생·제작 비용을 갚는 데 들어갔다 · 남은 비용 ${fmtWon(d.r.debt)}` : '',
  // 댓글 모니터링 (v118 UI C1)
  ch: (s, d) => songCommentCh(s, d, `「${d.r.title}」 활동을 했다. ${chartText(d.r.peak)}${d.r.wins ? `, 음악방송 1위 ${d.r.wins}회` : ''}.` + (d.r.debt > 0 || !(d.r.pay > 0) ? '' : ` 정산금 ${fmtWon(d.r.pay)}.`) + (d.r.wrote ? ' ' + d.r.wrote : ''), 'idol'),
});
E({
  id: 'idol_jp', cat: '해외 진출', title: '일본 데뷔 결정', tag: 'career',
  cond: s => s.tracks.idol.st === 'active',
  text: s => `회사가 「${s.tracks.idol.g.name}」의 일본 데뷔를 결정했다. 일본 활동을 하면 일본 팬이 크게 늘 수 있다.\n\n내 일본어는 ${has(me(s), 'jp') ? lvi(me(s), 'jp') + '레벨' : '할 줄 모른다'}.`,
  ch: () => [
    { t: '일본 활동을 준비한다', h: '일정이 빡빡해진다', f: s => { const t = s.tracks.idol, g = t.g; t.jpDebut = true; const add = Math.round((2e4 + groupFans(g) * 0.05) * langMult(me(s), 'jp')); g.f.jp += add; const tag = learnMe(s, 'jp', 1, true); useSkill(s, me(s), 'jp', 2); milestone(s, `${age(s)}세에 ${josa(`「${g.name}」`, '으로')} 일본 데뷔를 했다.`); return `「${g.name}」 일본 데뷔 싱글을 냈다.` + fx(s, { fjp: Math.round(add * 0.3), stress: 6 }) + tag; } },
  ],
});
E({
  id: 'idol_us', cat: '해외 진출', title: '미국 진출 결정', tag: 'career',
  cond: s => s.tracks.idol.st === 'active',
  text: s => `「${s.tracks.idol.g.name}」의 인기가 미국까지 번졌다. 회사가 현지 레이블과 손잡고 영어 싱글을 내기로 했다.\n\n내 영어는 ${has(me(s), 'en') ? lvi(me(s), 'en') + '레벨' : '할 줄 모른다'}.`,
  ch: () => [
    { t: '미국 활동을 준비한다', f: s => { const t = s.tracks.idol, g = t.g; t.usDebut = true; const add = Math.round((5e4 + groupFans(g) * 0.04) * langMult(me(s), 'en')); g.f.us += add; const tag = learnMe(s, 'en', 1, true); useSkill(s, me(s), 'en', 2); milestone(s, `${age(s)}세에 ${josa(`「${g.name}」`, '으로')} 미국에 진출했다.`); return '미국 데뷔 싱글을 냈다. 빌보드 차트에 이름이 올랐다.' + fx(s, { fus: Math.round(add * 0.3), stress: 8 }) + tag; } },
  ],
});
// v158: 앨범을 낼 때 회사가 평가해서 꺼낸다 (idolev.js idolReview). 회사 크기마다 기대와 참을성이 다르다. 끝나면 다른 회사 제안이 올 수 있다
E({
  id: 'idol_disband', cat: '그룹', title: '그룹 해체 위기', tag: 'career', bg: 'meeting',
  cond: s => s.tracks.idol.st === 'active',
  init(s, d) { const t = s.tracks.idol, b = agBoss(s, t.ag); meetAt(s, b, `${t.agN} 대표`, 'idol'); d.b = b.id; },
  text: (s, d) => {
    const t = s.tracks.idol, b = d.b && s.people[d.b], who = b ? `대표 ${josa(b.name, '이가')}` : '회사에서';
    if (d.last) return `마지막 기회라던 앨범도 기대에 못 미쳤다. ${who} 더는 어렵다고 했다.\n\n「${t.g.name}」 활동은 여기까지다.`;
    return `「${t.g.name}」의 최근 앨범 성적이 회사 기대에 못 미쳤다. ${who} 멤버들을 불러 그룹 활동을 정리하자고 했다.\n\n${t.tier === 1 ? '작은 회사라 앨범을 낼수록 빚이 쌓인다고 한다.' : '회사는 곧 데뷔할 신인 그룹에 힘을 싣기로 했다고 한다.'} 그룹 팬 ${fmtFans(groupFans(t.g))}.`;
  },
  ch: (s, d) => {
    const t = s.tracks.idol, mf = s.fans.kr + s.fans.jp + s.fans.us;
    const end = (x, st) => { endGroup(s, '해체'); idolMoveQ(s); return x + fx(s, { stress: st }); };
    if (d.last) return [{ t: '받아들인다', f: s => end('그룹이 해체됐다. 멤버들과 숙소에서 마지막 밤을 보냈다.', 8) }];
    // 내 팬이 많을수록 회사가 한 번 더 들어준다
    const pp = U.clamp(0.2 + Math.log10(1 + mf) * 0.03, 0.2, 0.45);
    return [
      { t: '받아들인다', f: s => end('그룹이 해체됐다.', 6) },
      { t: '한 번만 더 해 보자고 설득한다', h: `받아 줄 가능성 ${fmtPct(pp)} · 받아 주면 다음 앨범이 마지막 기회다`, f: s => { if (U.chance(pp)) { t.lastCh = true; return '마지막 기회를 얻었다. 다음 앨범에 모든 걸 걸어야 한다.' + fx(s, { stress: 10 }); } return end('설득은 실패했다. 그룹이 해체됐다.', 10); } },
    ];
  },
});
E({
  id: 'idol_contract', cat: '그룹', title: '계약 만료', tag: 'career',
  cond: s => s.tracks.idol.st === 'active',
  text: s => { const t = s.tracks.idol, ga = groupAges(s, t.g); return `「${t.g.name}」의 계약 기간이 끝났다. 데뷔 ${Math.floor(t.months / 12)}년 차, 그룹 팬 ${fmtFans(groupFans(t.g))}, 멤버 평균 ${Math.round(ga.avg)}세.\n\n멤버들도 각자 생각이 있다.${ga.avg > 28 ? ' 다들 나이가 있어서 각자 다른 길을 생각하는 눈치다.' : ''}`; },
  ch(s) {
    const t = s.tracks.idol;
    // v157: 반년 전 재계약 이야기에서 정한 태도 (idolev.js idolRnOf): 남을 가능성 · 회사 몫이 내려가는 만큼
    // v158: 전원 잔류 · 몇 명만 잔류(줄어든 채로 계속) · 해체 세 갈래 (idolev.js idolRenewP · idolRenew). 멤버 평균 나이가 28세를 넘으면 한 살마다 크게 준다
    const rn = idolRnOf(t), cut1 = Math.max(0.3, Math.round((t.cut - rn.cut) * 100) / 100), P = idolRenewP(s, t);
    return [
      // 재계약 조건 숫자와 남은 빚 (v118 UI C5)
      { t: '재계약한다', h: `멤버 전원이 남을 가능성 ${fmtPct(P.pa)} · 몇 명만 남아 계속할 가능성 ${fmtPct(P.pc - P.pa)} · 회사 몫 ${pctN(t.cut)} → ${pctN(cut1)} · 4년 (${ymLater(s, Math.max(0, t.contract + 48 - t.months))}까지)${t.debt > 0 ? ` · 남은 빚 ${fmtWon(t.debt)}은 정산에서 갚는다` : ''}`, f: s => idolRenew(s, t, P.pa, P.pc, cut1) },
      { t: '그룹은 정리하고 솔로로 회사에 남는다', h: '같은 회사 소속 솔로 가수가 된다', f: s => { const ag = t.ag; endGroup(s, '계약 만료로 해체'); return startSoloSigned(s, ag, { type: bestSoloType(s) }); } },
      { t: '재계약하지 않고 떠난다', h: '그룹은 남은 멤버들이 정한다 · 다른 회사에서 제안이 올 수 있다', f: s => { const n = t.g.name; endGroup(s, '재계약 안 함'); idolMoveQ(s); return `「${n}」 재계약서에 도장을 찍지 않았다. 숙소 짐을 챙겨 나왔다.`; } },
    ];
  },
});
INBOX.idol_solo = {
  ic: '🎙️',
  text: (s, m) => `회사에서 그룹 활동과 따로 솔로 앨범을 내 보자고 한다. ${({ rap: '랩', perf: '춤과 무대', vocal: '보컬' })[bestSoloType(s)]} 실력을 눈여겨봤다고 한다.`,
  ch: (s, m) => [
    { t: '솔로 앨범을 낸다', nj: 'solo', nm: ['artist'], ok: s => s.tracks.idol.st === 'active' && !trackOn(s, 'solo'), h: '그룹과 함께 솔로 가수로도 활동한다', f: s => startSoloSigned(s, s.tracks.idol.ag, { type: bestSoloType(s), withGroup: true }) },
    { t: '그룹에 집중한다', f: () => '솔로 데뷔 제안은 거절했다.' },
  ],
};
E({
  id: 'idol_conflict', cat: '그룹', title: '멤버 사이의 냉기', tag: 'career', cd: 12, p: 0.02,
  // v117: 밴드에서도 난다. 어떻게 푸느냐에 따라 팀워크가 오르내린다
  cond: s => myTeams(s).some(x => x.mem.length >= 2),
  init(s, d) { const tm = U.pick(myTeams(s).filter(x => x.mem.length >= 2)), m = U.shuffle(tm.mem.map(x => x.id)); d.k = tm.k; d.a = m[0]; d.b = m[1]; },
  text: (s, d) => { const a = s.people[d.a], b = s.people[d.b]; return `요즘 ${josa(a.name, '과와')} ${b.name} 사이가 냉랭하다. 연습실 공기가 무겁다. ${josa(a.name, '은는')} ${TRAIT_BY[a.trait].n}, ${josa(b.name, '은는')} ${TRAIT_BY[b.trait].n} 성격이다.`; },
  ch(s, d) {
    const a = s.people[d.a], b = s.people[d.b], tw = v => { const tm = teamOf(s, d.k || 'idol'); if (tm) twAdd(tm.o, v); };
    const p = U.clamp(0.35 + lv(me(s), 'variety') / 150 + (me(s).tal.insight - 50) / 200, 0.2, 0.9);
    return [
      { t: '둘 사이를 중재한다', h: `잘 풀릴 가능성 ${fmtPct(p)}`, f: s => { if (U.chance(p)) { bond(s, a, 8); bond(s, b, 8); tw(3); return `${josa(a.name, '과와')} ${b.name} 사이를 풀어 줬다. 둘 다 고맙다고 했다.` + fx(s, { stress: 2 }); } bond(s, a, -4); bond(s, b, -4); tw(-4); return '중재하려다 오히려 둘 다 서운해했다.' + fx(s, { stress: 6 }); } },
      { t: `${a.name} 편을 든다`, f: s => { bond(s, a, 10); bond(s, b, -15); tw(-6); return `${a.name} 편을 들었다. ${josa(b.name, '과와')}는 서먹해졌다.`; } },
      { t: '모른 척한다', f: s => { tw(-3); return '모른 척했다. 시간이 지나면 풀리겠지.' + fx(s, { stress: 3 }); } },
    ];
  },
});

// ════════ 팀워크 · 멤버 성장 (v117 밸런스 A) ════════
// 팀워크(0~100): 밴드는 t.b.tw, 아이돌 그룹은 g.tw. 무대 · 곡 점수의 실력(bandPower · groupPower)에 0.8~1.2배로 들어간다
// 같이 활동하면 조금씩, 팀 활동(골라서 하는 일) · 팀 사건의 좋은 선택으로 많이 오른다. 멤버가 바뀌거나 다투거나 오래 쉬면 내려간다
function twOf(o) { return o && typeof o.tw === 'number' ? o.tw : 50; }
function twMul(o) { return 0.8 + 0.4 * twOf(o) / 100; }
function twAdd(o, v) { if (o) o.tw = U.clamp(twOf(o) + v, 0, 100); }
// 직업 창에 보이는 말 (숫자는 보이지 않는다)
function twWord(o) { const v = twOf(o); return v < 25 ? '아직 서먹하다' : v < 45 ? '조금씩 맞아 간다' : v < 65 ? '손발이 맞는다' : v < 85 ? '척척 맞는다' : '눈빛만 봐도 안다'; }
// 지금 같이 활동하는 팀: 공연하는 밴드, 데뷔한 아이돌 그룹
function myTeams(s) {
  const L = [], b = s.tracks.band, i = s.tracks.idol;
  if (b && b.b && ['indie', 'signed'].includes(b.st)) L.push({ k: 'band', t: b, o: b.b, nm: `밴드 「${b.b.name}」`, mem: bandMembers(s, b), part: m => b.b.part[m.id], my: b.b.my });
  if (i && i.g && i.st === 'active') L.push({ k: 'idol', t: i, o: i.g, nm: `「${i.g.name}」`, mem: i.g.members.map(id => s.people[id]).filter(Boolean), part: m => idolMain(i.g, m), my: 'dance' });
  return L;
}
function teamOf(s, k) { return myTeams(s).find(x => x.k === k) || null; }
// 곡 성적을 기억해 둔다 (멤버 의욕). 흥행에 실패하면 가끔 '가라앉은 연습실' 사건이 다음 달에 난다
function teamRel(s, k, t, peak, flop) {
  t.lastRelT = s.t; t.lastPeak = peak || 0; t.relFlops = flop ? (t.relFlops || 0) + 1 : 0; // 아이돌 트랙의 flops(해체 위기용)와 따로
  const tm = teamOf(s, k);
  if (flop && tm && tm.mem.length && U.chance(0.5) && !hasQ(s, 'team_flop')) queueEv(s, 'team_flop', 1, { k });
}
function idolMain(g, m) { const p = (g.pos || {})[m.id] || ''; return p.includes('래퍼') ? 'rap' : p.includes('댄서') ? 'dance' : 'vocal'; }
// 멤버의 의욕: 슬럼프 · 사이가 틀어짐 · 연달아 흥행 실패 · 먹고살 걱정이면 0.6, 친하거나 최근 성적이 좋거나 힘을 받았으면 1.2
function mateMot(s, tm, m) {
  const t = tm.t, recent = t.lastRelT != null && s.t - t.lastRelT <= 12;
  const worry = tm.k === 'band' && t.st === 'indie' && t.months >= 36 && t.b.f < 2000;
  if ((m.slumpT || 0) > s.t || m.aff < 30 || (recent && (t.relFlops || 0) >= 2) || worry) return 0.6;
  if (m.aff >= 65 || (recent && t.lastPeak && t.lastPeak <= 50) || (m.motT || 0) > s.t) return 1.2;
  return 1;
}
// 멤버도 나처럼 재능만큼 클 여지가 있다 (예전에는 들어올 때 실력에서 조금 위가 끝이라 몇 년을 해도 거의 안 컸다)
function matePot(m, k) { const o = m && m.sk && m.sk[k]; if (!o || o.potUp) return; o.potUp = 1; o.pot = Math.min(100, Math.max(o.pot, rollPot(m, k), Math.round(o.lv + 10))); }
// 멤버 연습에 붙는 회사 몫: 내 회사 소속이면 내 회사 연습실 · 트레이너, 기획사 소속이면 그 회사 연습실 (밴드 악기 트레이너는 따로 없다: 외부 레슨)
function mateEqM(s, tm, k) {
  const own = tm.k === 'band' ? ownCo(s, 'band') : null;
  if (own) { const tr = typeof coTrainer === 'function' ? coTrainer(s, k, 'music') : null; return (typeof coEqM === 'function' ? coEqM(own, k) : 1) * (tr ? 1 + teachLv(tr, k) / 50 : 1); }
  const ag = tm.t.ag && AG[tm.t.ag];
  return ag && AG_EQ.some(id => EQUIP[id].k.includes(k)) ? 1 + eqPct(ag.eq || 1) / 100 : 1;
}
// 멤버들이 한 달 동안 큰다. 밴드는 맡은 파트, 아이돌은 노래 · 춤 · 랩 (주 포지션이 더 많이). 외부 레슨을 다니는 동안은 더
function teamGrow(s, tm, base) {
  const les = (tm.t.lesT || 0) > s.t ? 1.5 : 0;
  for (const m of tm.mem) {
    const mot = mateMot(s, tm, m), main = tm.part(m);
    for (const k of tm.k === 'band' ? [main] : ['vocal', 'dance', 'rap']) {
      if (!has(m, k)) continue;
      matePot(m, k);
      practice(s, m, k, (base + (k === main ? les : 0)) * mot * (k === main ? 1 : 0.6), mateEqM(s, tm, k));
    }
    if (tm.k === 'band' && has(m, 'compose') && U.chance(0.3)) { matePot(m, 'compose'); practice(s, m, 'compose', 0.5 * mot); }
    m.contactT = s.t;
  }
}
// 팀 활동 (골라서 하는 일): 직업 창에서 고른다. 하나마다 몇 달에 한 번
function teamPicks(s, k) {
  const tm = teamOf(s, k);
  if (!tm || s.army || !tm.mem.length) return [];
  const t = tm.t, band = k === 'band', n = tm.mem.length;
  const cd = id => ((t.tcd || {})[id] || 0) > s.t, use = (id, m) => { (t.tcd = t.tcd || {})[id] = s.t + m; };
  const lesC = 50e4 * n * 3, eat = 10e4 * (n + 1);
  return [
    { t: band ? '🎸 추가 합주' : '💃 칼군무 맞추기', h: '팀워크 ↑↑ · 멤버 실력 ↑ · 스트레스 ↑', ok: !cd('extra'), why: '얼마 전에 했다', run: s => {
      use('extra', 2); teamGrow(s, tm, 1.5); practice(s, me(s), tm.my, 0.8); twAdd(tm.o, 4);
      return `${tm.nm} 멤버들과 ${band ? '밤늦게까지 합주를 더 했다' : '칼군무를 맞추느라 연습실 불이 꺼지지 않았다'}.` + fx(s, { stress: 6 });
    } },
    { t: '🧑‍🏫 멤버 코칭', h: '멤버 한 명을 골라 봐 준다 · 친밀도 ↑', ok: !cd('coach'), why: '얼마 전에 했다', run: s => { fireEvent(s, 'team_coach', { k }); return ''; } },
    { t: band ? '🎼 외부 레슨 보내기' : '🎼 외부 보컬 · 댄스 레슨', h: `멤버 모두 석 달 · ${fmtWon(lesC)} · 멤버 실력 ↑`, ok: !cd('lesson') && s.money >= lesC, why: cd('lesson') ? '레슨을 다니는 중이다' : '돈이 모자라다', run: s => {
      use('lesson', 3); t.lesT = s.t + 3; addMoney(s, -lesC, '멤버 외부 레슨');
      return `멤버들을 석 달 동안 외부 레슨에 보냈다. (${fmtWon(lesC)})`;
    } },
    { t: band ? '🎤 버스킹' : '📣 게릴라 공연', h: '팬 ↑ · 팀워크 ↑ · 스트레스 ↑', ok: !cd('busk'), why: '얼마 전에 했다', run: s => {
      use('busk', 3); twAdd(tm.o, 2);
      const pw = band ? bandPower(s, t) : groupPower(s, t.g), g = Math.max(20, Math.round(Math.pow(10, U.clamp(pw, 0, 100) / 20) * U.fl(0.6, 1.4) * access(s) * (band ? 1 : 2)));
      if (band) t.b.f += g; else t.g.f.kr += g;
      return `${band ? '길거리에서 버스킹을 했다' : '예고 없이 게릴라 공연을 열었다'}. 지나가던 사람들이 걸음을 멈췄다. ${band ? '밴드' : '그룹'} 팬 ${sgnFans(g)}.` + fx(s, { fkr: Math.round(g * 0.35), stress: 3 });
    } },
    { t: '🍜 멤버들과 시간 보내기', h: `밥 한 끼 · ${fmtWon(eat)} · 친밀도 ↑ · 팀워크 ↑ · 스트레스 ↓`, ok: !cd('hang') && s.money >= eat, why: cd('hang') ? '얼마 전에 했다' : '돈이 모자라다', run: s => {
      use('hang', 1); addMoney(s, -eat, '멤버들과 식사'); for (const m of tm.mem) bond(s, m, 3); twAdd(tm.o, 1.5);
      return `연습을 일찍 끝내고 멤버들과 밥을 먹으며 수다를 떨었다.` + fx(s, { stress: -6 });
    } },
  ];
}
E({
  id: 'team_coach', cat: '팀', title: '멤버 코칭', tag: 'career',
  init(s, d) { if (!teamOf(s, d.k)) d.skip = true; },
  text: (s, d) => `누구를 봐 줄까?`,
  ch(s, d) {
    const tm = teamOf(s, d.k), p = me(s);
    if (!tm) return [{ t: '확인', f: () => '' }];
    return tm.mem.map(m => {
      const k = tm.part(m);
      return { t: `${m.name} (${partN(k)})`, h: `${partN(k)} ${lvSee(s, m, k)}레벨 · ${relWord(m)}`, f: s => {
        (tm.t.tcd = tm.t.tcd || {}).coach = s.t + 2;
        matePot(m, k);
        const g = practice(s, m, k, 2 * (1 + teachLv(p, k) / 20) * mateMot(s, tm, m));
        bond(s, m, 4); twAdd(tm.o, 1); teach(s, p, 0.6);
        return `${m.name}의 ${josa(partN(k), '을를')} 봐 줬다. ${g >= 0.5 ? '눈에 띄게 좋아졌다.' : g >= 0.2 ? '조금 나아졌다.' : '내가 가르치기엔 한계가 있었다.'}` + fx(s, { stress: 2 });
      } };
    }).concat([{ t: '다음에 한다', f: () => '' }]);
  },
});
// 팀 사건 (모두 선택지가 있다)
function teamPickRand(s, min = 1) { const L = myTeams(s).filter(x => x.mem.length >= min); return L.length ? U.pick(L) : null; }
E({
  id: 'team_stay', cat: '팀', title: '같이 남아서 연습할래?', tag: 'career', cd: 8, p: 0.03,
  cond: s => !s.army && myTeams(s).some(x => x.mem.length),
  init(s, d) { const tm = teamPickRand(s); if (!tm) { d.skip = true; return; } d.k = tm.k; d.id = U.pick(tm.mem).id; },
  text: (s, d) => { const m = s.people[d.id]; return `연습이 끝나고 다들 짐을 챙기는데, ${josa(m.name, '이가')} 슬쩍 다가온다. "오늘 좀 더 맞춰 보고 갈래?"`; },
  ch(s, d) {
    const tm = teamOf(s, d.k), m = s.people[d.id];
    return [
      { t: '같이 남는다', f: s => { if (tm) { matePot(m, tm.part(m)); practice(s, m, tm.part(m), 2 * mateMot(s, tm, m)); practice(s, me(s), tm.my, 0.6); twAdd(tm.o, 3); } bond(s, m, 5); return `${josa(m.name, '과와')} 늦게까지 남아 연습했다.` + fx(s, { stress: 3 }); } },
      { t: '오늘은 먼저 간다', f: s => { bond(s, m, -2); return `오늘은 먼저 들어갔다. ${josa(m.name, '은는')} 혼자 남았다.` + fx(s, { stress: -2 }); } },
    ];
  },
});
E({
  id: 'team_slump', cat: '팀', title: '멤버의 슬럼프', tag: 'career', cd: 12, p: 0.02,
  cond: s => !s.army && myTeams(s).some(x => x.mem.length),
  init(s, d) { const tm = teamPickRand(s); if (!tm) { d.skip = true; return; } const m = U.pick(tm.mem); d.k = tm.k; d.id = m.id; m.slumpT = s.t + 6; },
  text: (s, d) => { const m = s.people[d.id]; return `요즘 ${josa(m.name, '이가')} 영 힘이 없다. 연습에 나와도 멍하니 있다가 실수를 반복한다.`; },
  ch(s, d) {
    const tm = teamOf(s, d.k), m = s.people[d.id], tw = v => { if (tm) twAdd(tm.o, v); };
    const p = U.clamp(0.35 + m.aff / 200, 0.2, 0.75);
    return [
      { t: '이야기를 들어 준다', f: s => { m.slumpT = 0; bond(s, m, 6); tw(2); return `${josa(m.name, '과와')} 오래 이야기를 나눴다. 조금 후련해 보인다.` + fx(s, { stress: 2 }); } },
      { t: '잠깐 쉬게 한다', f: s => { m.slumpT = s.t + 1; bond(s, m, 3); tw(-1); return `${josa(m.name, '은는')} 한동안 쉬기로 했다.`; } },
      { t: '다그친다', h: `다시 정신을 차릴 가능성 ${fmtPct(p)}`, f: s => { if (U.chance(p)) { m.slumpT = 0; if (tm) practice(s, m, tm.part(m), 2); bond(s, m, -4); return `${josa(m.name, '이가')} 이를 악물고 다시 연습에 매달렸다.`; } bond(s, m, -10); tw(-4); return `${josa(m.name, '은는')} 더 움츠러들었다. 연습실 분위기가 싸늘해졌다.` + fx(s, { stress: 3 }); } },
    ];
  },
});
E({
  id: 'team_flop', cat: '팀', title: '가라앉은 연습실', tag: 'career',
  init(s, d) { if (!teamOf(s, d.k)) d.skip = true; },
  text: (s, d) => `이번 곡 반응이 기대에 못 미쳤다. 연습실에 아무도 먼저 말을 꺼내지 않는다.`,
  ch(s, d) {
    const tm = teamOf(s, d.k), n = tm ? tm.mem.length : 0, eat = 10e4 * (n + 1);
    return [
      { t: '연습을 더 하자', f: s => { if (tm) { teamGrow(s, tm, 1); twAdd(tm.o, 3); for (const m of tm.mem) bond(s, m, -1); } return '다시 연습부터 하자고 했다. 다들 말없이 악기를 잡았다.' + fx(s, { stress: 5 }); } },
      { t: '같이 밥 먹으며 푼다', h: fmtWon(eat), ok: s => s.money >= eat, f: s => { addMoney(s, -eat, '멤버들과 식사'); if (tm) { twAdd(tm.o, 4); for (const m of tm.mem) { bond(s, m, 3); m.motT = s.t + 3; } } return '다 같이 고기를 구우며 털어 냈다. 다음엔 잘하자고 잔을 부딪쳤다.' + fx(s, { stress: -3 }); } },
      { t: '각자 쉬자', f: s => { if (tm) twAdd(tm.o, -2); return '한동안 각자 쉬기로 했다.' + fx(s, { stress: -6 }); } },
    ];
  },
});
E({
  id: 'team_camp', cat: '팀', title: '합숙 캠프', tag: 'career', cd: 18, p: 0.015,
  cond: s => !s.army && myTeams(s).some(x => x.mem.length && x.t.ag),
  init(s, d) { const L = myTeams(s).filter(x => x.mem.length && x.t.ag); if (!L.length) { d.skip = true; return; } d.k = U.pick(L).k; },
  text: (s, d) => { const tm = teamOf(s, d.k); return `회사가 ${tm ? tm.nm : '팀'} 멤버들끼리 한 달 동안 합숙 캠프를 떠나 보라고 한다. 아침부터 밤까지 같이 연습하고 같이 지낸다.`; },
  ch(s, d) {
    const tm = teamOf(s, d.k);
    return [
      { t: '참가한다', f: s => { if (tm) { teamGrow(s, tm, 2); practice(s, me(s), tm.my, 1.5); twAdd(tm.o, 12); const t = tm.t; t.tcd = t.tcd || {}; for (const x of ['extra', 'busk', 'hang']) t.tcd[x] = Math.max(t.tcd[x] || 0, s.t + 2); } return '한 달 동안 합숙했다. 서로 눈빛만 봐도 다음 박자를 안다.' + fx(s, { stress: 8 }); } },
      { t: '빠진다', f: s => { if (tm) { twAdd(tm.o, -3); for (const m of tm.mem) bond(s, m, -3); } return '나는 캠프에 빠졌다. 멤버들은 조금 서운한 눈치다.'; } },
    ];
  },
});
E({
  id: 'team_open', cat: '팀', title: '선배 공연 오프닝 무대', tag: 'career', cd: 12, p: 0.015,
  cond: s => !s.army && myTeams(s).some(x => x.mem.length),
  init(s, d) { const tm = teamPickRand(s); if (!tm) { d.skip = true; return; } d.k = tm.k; d.who = U.pick(['10년 차 선배 밴드', '대선배 가수', '요즘 잘나가는 선배 그룹', '전설적인 록 밴드']); },
  text: (s, d) => { const tm = teamOf(s, d.k); return `${d.who}의 단독 공연 오프닝 무대에 ${tm ? tm.nm : '우리'}를 세우고 싶다는 연락이 왔다. 출연료는 거의 없다.`; },
  ch(s, d) {
    const tm = teamOf(s, d.k);
    return [
      { t: '무대에 선다', f: s => {
        if (!tm) return '';
        const band = tm.k === 'band', pw = band ? bandPower(s, tm.t) : groupPower(s, tm.t.g), g = Math.max(50, Math.round(Math.pow(10, U.clamp(pw + U.normal(0, 6) + 10, 0, 100) / 20) * (band ? 1 : 2)));
        if (band) tm.t.b.f += g; else tm.t.g.f.kr += g;
        twAdd(tm.o, 2); for (const m of tm.mem) m.motT = s.t + 6;
        return `${d.who}의 오프닝 무대에 섰다. 큰 무대를 겪고 나니 멤버들 눈빛이 달라졌다. ${band ? '밴드' : '그룹'} 팬 ${sgnFans(g)}.` + fx(s, { fkr: Math.round(g * 0.35), stress: 3 });
      } },
      { t: '사양한다', f: s => '오프닝 무대는 사양했다.' },
    ];
  },
});
// 아이돌 그룹만: 숙소 갈등 · 파트 분배 갈등
E({
  id: 'idol_dorm_clash', cat: '그룹', title: '숙소 갈등', tag: 'career', cd: 18, p: 0.015,
  cond: s => !!teamOf(s, 'idol') && teamOf(s, 'idol').mem.length >= 2 && isDorm(s),
  init(s, d) { const m = U.shuffle(teamOf(s, 'idol').mem); d.a = m[0].id; d.b = m[1].id; d.why = U.pick(['방 배정', '씻는 순서', '밤늦게 켜 두는 불', '청소 당번']); },
  text: (s, d) => { const a = s.people[d.a], b = s.people[d.b]; return `숙소에서 ${josa(a.name, '과와')} ${b.name} 사이에 ${d.why} 문제로 언성이 높아졌다. 다들 눈치만 본다.`; },
  ch(s, d) {
    const tm = teamOf(s, 'idol'), a = s.people[d.a], b = s.people[d.b], tw = v => { if (tm) twAdd(tm.o, v); };
    const p = U.clamp(0.35 + (me(s).tal.insight - 50) / 150 + lv(me(s), 'variety') / 200, 0.2, 0.85);
    return [
      { t: '내가 양보한다', f: s => { bond(s, a, 5); bond(s, b, 5); tw(3); return '내가 한발 물러서서 정리했다. 둘 다 머쓱해했다.' + fx(s, { stress: 4 }); } },
      { t: '생활 규칙을 정하자고 한다', h: `잘 풀릴 가능성 ${fmtPct(p)}`, f: s => { if (U.chance(p)) { tw(5); bond(s, a, 3); bond(s, b, 3); return '다 같이 숙소 규칙을 정했다. 한결 편해졌다.'; } tw(-2); bond(s, a, -2); bond(s, b, -2); return '규칙을 정하자고 했다가 오히려 말다툼이 길어졌다.' + fx(s, { stress: 3 }); } },
      { t: '신경 쓰지 않는다', f: s => { tw(-3); bond(s, a, -3); bond(s, b, -3); return '못 들은 척 방에 들어갔다. 숙소 공기가 며칠째 무겁다.' + fx(s, { stress: -2 }); } },
    ];
  },
});
E({
  id: 'idol_part_clash', cat: '그룹', title: '파트 분배', tag: 'career', cd: 12, p: 0.015,
  cond: s => !!teamOf(s, 'idol') && teamOf(s, 'idol').mem.length >= 1,
  init(s, d) { d.id = U.pick(teamOf(s, 'idol').mem).id; },
  text: (s, d) => { const m = s.people[d.id]; return `새 곡 파트 분배를 두고 ${josa(m.name, '이가')} 서운함을 털어놓는다. 자기 파트가 너무 적다고, 센터에 한 번쯤은 서 보고 싶다고 한다.`; },
  ch(s, d) {
    const tm = teamOf(s, 'idol'), m = s.people[d.id], tw = v => { if (tm) twAdd(tm.o, v); };
    return [
      { t: '내 파트를 나눠 준다', f: s => { bond(s, m, 8); tw(4); m.motT = s.t + 6; return `내 파트 일부를 ${m.name}에게 넘겼다. ${josa(m.name, '은는')} 눈이 반짝였다.`; } },
      { t: '회사 결정에 맡긴다', f: s => { tw(-2); bond(s, m, -2); return '회사가 정한 대로 가자고 했다.'; } },
      { t: '센터는 내가 하겠다고 한다', f: s => { bond(s, m, -8); tw(-5); return `센터는 내가 서겠다고 했다. ${josa(m.name, '과와')} 사이가 어색해졌다.` + fx(s, { fame: 1, stress: 2 }); } },
    ];
  },
});

// ════════ 밴드 멤버 ════════
// 보컬·기타·베이스·드럼은 꼭 한 명씩 있어야 하고, 키보드는 있어도 되고 없어도 된다
// 직접 만든 밴드는 멤버를 하나하나 구한다 (구인 글, 아는 사람에게 부탁). 기획사가 밴드 데뷔조를 꾸릴 때만 회사가 멤버를 채운다
const BAND_PARTS = [['vocal', '보컬'], ['guitar', '기타'], ['bass', '베이스'], ['drum', '드럼'], ['keyboard', '키보드']];
const BAND_NEED = ['vocal', 'guitar', 'bass', 'drum'];
function partN(k) { return (BAND_PARTS.find(x => x[0] === k) || [k, SKILLS[k].n])[1]; }
function myBandParts(s, min) { return BAND_PARTS.filter(([k]) => lv(me(s), k) >= min).map(x => x[0]); }
function bandBlock(s, min = 8) {
  if (s.army) return '군 복무 중';
  if (age(s) < 14) return '14세부터 할 수 있다';
  if (trackOn(s, 'band')) return '이미 밴드를 하고 있다';
  if (artistContractWhy(s)) return artistContractWhy(s);
  if (!myBandParts(s, min).length) return `보컬·기타·베이스·드럼·키보드 중 하나는 ${min}레벨 이상이어야 한다`;
  return '';
}
function bandMembers(s, t) { return t.b.members.map(id => s.people[id]).filter(Boolean); }
// 아직 비어 있는 꼭 필요한 파트
function bandMissing(t) { const have = new Set([t.b.my].concat(Object.values(t.b.part))); return BAND_NEED.filter(k => !have.has(k)); }
function bandHasKeys(t) { return t.b.my === 'keyboard' || Object.values(t.b.part).includes('keyboard'); }
// 밴드 실력: 보컬이 가장 크게 보이고, 나머지는 파트 실력의 평균. 빈 파트가 있으면 크게 깎인다
function bandPower(s, t) {
  const all = [me(s)].concat(bandMembers(s, t));
  const pl = x => lv(x, x.id === s.me ? t.b.my : t.b.part[x.id]);
  const voc = all.find(x => (x.id === s.me ? t.b.my : t.b.part[x.id]) === 'vocal');
  const others = all.filter(x => x !== voc);
  // v94: 각자 파트 실력만 본다 (보컬 담당의 외모는 뺐다)
  const pw = (voc ? lv(voc, 'vocal') : 0) * 0.35 + (others.reduce((a, x) => a + pl(x), 0) / Math.max(1, others.length)) * 0.65;
  return pw * (bandMissing(t).length ? 0.6 : 1) * twMul(t.b); // v117: 팀워크만큼 0.8~1.2배
}
function bandMate(s, k, base, o = {}) {
  return makeMusicMate(s, { rel: o.rel || '멤버', job: o.job || '밴드 멤버', met: o.met || '같은 밴드 멤버', aff: 45, tal: k === 'vocal' ? ['music', 'star'] : ['music', 'rhythm'], sk: Object.assign({ [k]: base }, U.chance(0.3) ? { compose: base - 6 } : {}) });
}
// 멤버 한 명이 들어온다. 꼭 필요한 파트가 다 차면 밴드가 결성된다
function addBandMember(s, x, k, how) {
  const t = s.tracks.band;
  x.rel = '멤버'; x.job = '밴드 멤버'; x.met = `밴드 「${t.b.name}」 (${how})`; x.contactT = s.t; x.aff = Math.max(x.aff, 45); x.hidden = false;
  if (t.st !== 'forming') twAdd(t.b, -15); // 새 멤버와는 처음부터 다시 맞춰야 한다 (v117)
  t.b.members.push(x.id); t.b.part[x.id] = k;
  let r = `${josa(x.name, '이가')} 밴드 「${t.b.name}」의 ${josa(partN(k), '으로')} 들어왔다.`;
  const miss = bandMissing(t);
  if (t.st === 'forming' && !miss.length) {
    t.st = 'indie'; t.nextRel = U.int(4, 7);
    milestone(s, `${age(s)}세에 밴드 ${josa(`「${t.b.name}」`, '을를')} 결성했다.`);
    r += ' 멤버가 다 모였다! 이제 공연을 할 수 있다.';
  } else if (miss.length) r += ` 아직 ${miss.map(partN).join('·')} 자리가 비어 있다.`;
  return r;
}
// 부탁을 들어줄 가능성: 친할수록 높다
function bandAskP(s, x) { return U.clamp(0.15 + (x.aff - 40) / 60 + (s.rep - 50) / 300, 0.05, 0.9); }
JOB_APPLY.push({
  id: 'band_make', trk: 'band', g: '🎸 밴드 멤버', n: '밴드 만들기', show: s => !trackOn(s, 'band'),
  h: s => '내 파트와 밴드 이름을 정하고, 나머지 멤버는 구인 글이나 아는 사람에게 부탁해서 직접 모은다 · 보컬·기타·베이스·드럼이 다 모여야 공연을 할 수 있다',
  ok: s => !bandBlock(s), why: s => bandBlock(s),
  run: s => { fireEvent(s, 'band_form', { join: false }); return ''; },
});
JOB_APPLY.push({
  id: 'band_join', trk: 'band', g: '🎸 밴드 멤버', n: '인디 밴드 구인 공고에 지원', show: s => !trackOn(s, 'band'),
  h: s => '멤버가 다 갖춰져 이미 공연을 하고 있는 밴드의 빈자리에 들어간다 · 팬이 조금 있는 상태로 시작한다 · 결과는 다음 달',
  ok: s => !bandBlock(s, 18) && !hasQ(s, 'band_join_res'), why: s => bandBlock(s, 18) || '결과를 기다리는 중',
  run: s => { fireEvent(s, 'band_form', { join: true }); return ''; },
});
// 인디 밴드: 영입 제안을 기다리지 않고 기획사에 데모를 보내 전속 계약을 노린다
function bandSignScore(s) { const t = s.tracks.band; return bandPower(s, t) + Math.log10(1 + t.b.f) * 2.5 - 10; }
for (const ag of musicAgencies().filter(a => a.mkt === 'kr')) JOB_APPLY.push({
  id: 'bandsign_' + ag.id, trk: 'band', g: '🎸 밴드 멤버', get n() { return `${ag.n}에 밴드 데모 보내기`; }, tag: TIER_N[ag.tier],
  show: s => s.tracks.band.st === 'indie',
  h: s => `인디 밴드로 기획사 전속 계약을 노린다 · 밴드 실력과 밴드 팬을 본다 · 합격 가능성 ${fmtPct(audP(bandSignScore(s), ag.thr))} · 결과는 다음 달`,
  ok: s => !s.army && !agencyContract(s) && !bandMissing(s.tracks.band).length && !hasQ(s, 'band_sign_res') && !(s.cd['bsign_' + ag.id] > s.t),
  why: s => s.army ? '군 복무 중' : agencyContract(s) ? contractWhy(s) : bandMissing(s.tracks.band).length ? '멤버가 다 모여야 한다' : hasQ(s, 'band_sign_res') ? '다른 회사의 답을 기다리는 중' : '같은 회사에는 1년 뒤에 다시 보낼 수 있다',
  run: s => { s.cd['bsign_' + ag.id] = s.t + 12; queueEv(s, 'band_sign_res', 1, { ag: ag.id, p: audP(bandSignScore(s), ag.thr) }); return `${ag.n}에 밴드 「${s.tracks.band.b.name}」의 데모를 보냈다.`; },
});
E({
  id: 'band_sign_res', cat: '밴드', title: '데모를 보낸 회사의 답', tag: 'career',
  init(s, d) { if (s.tracks.band.st !== 'indie') { d.skip = true; return; } d.pass = U.chance(d.p); },
  text: (s, d) => d.pass ? `${AG[d.ag].n}에서 밴드 ${josa(`「${s.tracks.band.b.name}」`, '과와')} 전속 계약을 하고 싶다는 연락이 왔다!` : `${AG[d.ag].n}에서 답이 오지 않았다.`,
  ch: (s, d) => d.pass ? [
    { t: '계약 조건을 들어 본다', ok: s => !agencyContract(s) && s.tracks.band.st === 'indie', h: agencyContract(s) ? contractWhy(s) : '정산 비율과 계약 기간을 협상할 수 있다', f: s => startNego(s, { kind: 'band', ag: d.ag, agN: AG[d.ag].n, months: 48, cut: AG[d.ag].cut, lev: U.clamp((d.p - 0.5) * 0.8 + 0.3, 0.05, 0.8) }) },
    { t: '거절한다', f: () => `${AG[d.ag].n}의 계약 제안을 거절했다.` },
  ] : [{ t: '다음에 다시', f: () => `${AG[d.ag].n}에서 답이 오지 않았다.` }],
});
E({
  id: 'band_form', cat: '밴드', title: '내가 맡을 파트', tag: 'career',
  init(s, d) { d.parts = myBandParts(s, d.join ? 18 : 8); },
  text: (s, d) => d.join ? '구인 공고가 난 밴드들이 있다. 어떤 파트로 지원할까?' : '밴드를 만들자. 나는 어떤 파트를 맡을까? 나머지 파트는 구인 글을 올리거나 아는 사람에게 부탁해서 직접 모은다.',
  ch: (s, d) => d.parts.map(k => ({
    t: `${partN(k)} (${lvi(me(s), k)}레벨)`,
    f: s => {
      if (d.join) { const p = U.clamp(U.sig((lv(me(s), k) - 24) / 5), 0.1, 0.9); queueEv(s, 'band_join_res', 1, { k, p }); return `인디 밴드 ${partN(k)} 자리에 지원했다.`; }
      fireEvent(s, 'band_name', { k, join: false }); return '';
    },
  })).concat([{ t: '그만둔다', f: () => '밴드는 다음에 하기로 했다.' }]),
});
E({
  id: 'band_join_res', cat: '밴드', title: '밴드 오디션 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); },
  text: (s, d) => d.pass ? `지원한 밴드에서 같이 하자는 연락이 왔다! ${partN(d.k)} 자리다.` : '지원한 밴드들에서 연락이 오지 않았다.',
  ch: (s, d) => d.pass ? [{ t: '합류한다', f: s => { fireEvent(s, 'band_name', { k: d.k, join: true }); return ''; } }] : [{ t: '다음에 다시', f: () => '밴드 오디션에 떨어졌다.' }],
});
// 이름을 정한다. 직접 만든 밴드는 이름만 정하고 멤버는 진로 창에서 모은다. 합류한 밴드는 이미 멤버와 이름이 있다
E({
  id: 'band_name', cat: '밴드', title: '밴드 결성', tag: 'career',
  init(s, d) {
    d.mem = [];
    if (d.join) for (const k of BAND_NEED.concat(U.chance(0.45) ? ['keyboard'] : [])) if (k !== d.k) { const m = bandMate(s, k, U.int(22, 32), { rel: '업계' }); d.mem.push([m.id, k]); }
    const used = new Set(s.usedNames || []);
    d.names = U.shuffle(BAND_NAMES.filter(n => !used.has(n))).slice(0, d.join ? 1 : 3);
    if (!d.names.length) d.names = [U.pick(BAND_NAMES) + ' ' + U.int(2, 9)];
  },
  text: (s, d) => d.join ? `밴드 「${d.names[0]}」에 ${josa(partN(d.k), '으로')} 들어가게 됐다.\n\n` + d.mem.map(([id, k]) => { const m = s.people[id]; return `· ${partN(k)}: ${m.name} (${pAge(s, m)}세) — ${skillLine(m, 2, s)}`; }).join('\n') : `나는 ${partN(d.k)} 담당. 먼저 밴드 이름을 정하자.\n\n나머지 멤버(${BAND_NEED.filter(k => k !== d.k).map(partN).join('·')}${d.k === 'keyboard' ? '' : ', 있으면 키보드'})는 이름을 정한 다음 🧭 진로 창에서 구인 글을 올리거나 아는 사람에게 부탁해서 모은다.`,
  ch: (s, d) => { const jb = !trackOn(s, 'band') && jobBlock(s, 'band'); return jb ? [{ t: '확인', f: () => `${jb}. 밴드는 하지 못했다.` }] : d.names.map(n => ({ t: d.join ? '첫 합주에 간다' : `「${n}」`, f: s => startBand(s, d, n) })); },
});
function startBand(s, d, name) {
  (s.usedNames = s.usedNames || []).push(name);
  const part = {};
  // 이미 있는 밴드에 들어가면(AI가 만든 밴드) 동명이인이 없게 (v163)
  if (d.join) uniqNames(s, [s.me].concat(d.mem.map(x => x[0])));
  for (const [id, k] of d.mem) { const m = s.people[id]; m.rel = '멤버'; m.job = '밴드 멤버'; m.met = `밴드 「${name}」`; m.hidden = false; part[id] = k; }
  const old = s.tracks.band;
  const full = d.mem.length > 0;
  s.tracks.band = { st: full ? 'indie' : 'forming', b: { name, members: d.mem.map(x => x[0]), part, my: d.k, f: d.join ? U.int(200, 900) : 0, tw: d.join ? U.int(25, 40) : 20 }, months: 0, rel: 0, nextRel: U.int(4, 7), idle: 0, cut: 0, tier: 0, ag: null, agN: '', bestPeak: null, yearBest: 0, hist: old.hist || [], sn: old.sn };
  milestone(s, `${age(s)}세에 밴드 「${name}」의 ${josa(partN(d.k), '으로')} 활동을 시작했다.`);
  if (!full) return `밴드 ${josa(`「${name}」`, '을를')} 만들었다. 나는 ${partN(d.k)} 담당. 🧭 진로 창에서 멤버를 모아야 공연을 할 수 있다.`;
  return `밴드 「${name}」 ${partN(d.k)} 멤버가 됐다. 일정에 '밴드 활동'을 넣어야 합주와 공연을 한다.`;
}
// 구인 글을 보고 연락해 온 지원자 중에서 고른다
E({
  id: 'band_cands', cat: '밴드', title: '구인 글을 보고 연락이 왔다', tag: 'career',
  cond: s => trackOn(s, 'band'),
  init(s, d) {
    const t = s.tracks.band;
    const n = Math.min(3, U.int(1, 3) + (access(s) >= 0.9 ? 1 : 0));
    const base = 10 + Math.log10(1 + t.b.f) * 3 + (t.st === 'signed' ? 8 : 0);
    d.c = [];
    for (let i = 0; i < n; i++) d.c.push(bandMate(s, d.k, base + U.normal(0, 6), { rel: '업계', job: '밴드 지망생', met: '밴드 구인 글' }).id);
  },
  text: (s, d) => `${partN(d.k)} 구인 글을 보고 ${d.c.length}명이 연락해 왔다. 누구와 같이 할까?\n\n` + d.c.map(id => { const m = s.people[id]; return `· ${m.name} (${pAge(s, m)}세 · ${TRAIT_BY[m.trait].n}) — ${partN(d.k)} ${lvSee(s, m, d.k)}레벨${canScout(me(s), d.k) ? ` · 성장성 ${potGrade(me(s), m, d.k)}` : ''}${has(m, 'compose') ? ` · 작곡 ${lvSee(s, m, 'compose')}레벨` : ''}`; }).join('\n'),
  ch: (s, d) => d.c.map(id => { const m = s.people[id]; return { t: `${josa(m.name, '과와')} 같이 한다`, ok: s => trackOn(s, 'band') && (bandMissing(s.tracks.band).includes(d.k) || (d.k === 'keyboard' && !bandHasKeys(s.tracks.band))), f: s => addBandMember(s, m, d.k, '구인 글') }; }).concat([{ t: '마음에 드는 사람이 없다', f: () => '이번 지원자들과는 함께하지 않기로 했다.' }]),
});
// 기획사가 꾸린 밴드 데뷔조 (이때만 회사가 멤버를 채운다)
E({
  id: 'band_debut', cat: '데뷔', title: '밴드로 데뷔', tag: 'career', keepPop: true,
  cond: s => s.tracks.idol.st === 'trainee' && s.tracks.idol.kind === 'band',
  init(s, d) {
    const t = s.tracks.idol, ag = AG[t.ag];
    d.mem = [];
    for (const k of BAND_NEED.concat(U.chance(0.5) ? ['keyboard'] : []).filter(k => k !== t.part)) {
      const mate = people(s, x => x.trainee === t.ag && x.part === k && !d.mem.some(m => m[0] === x.id))[0];
      d.mem.push([(mate || bandMate(s, k, ag.thr + 6, { rel: '업계', met: `${ag.n} 밴드 데뷔조` })).id, k]);
    }
    const used = new Set(s.usedNames || []);
    d.name = U.pick(BAND_NAMES.filter(n => !used.has(n))) || U.pick(BAND_NAMES) + ' ' + U.int(2, 9);
  },
  text: (s, d) => { const t = s.tracks.idol; return `${t.agN}의 새 밴드 ${josa(`「${d.name}」`, '으로')} 데뷔한다! 멤버는 회사가 꾸렸다.\n\n· 나 (${age(s)}세) ${partN(t.part)}\n` + d.mem.map(([id, k]) => { const m = s.people[id]; return `· ${m.name} (${pAge(s, m)}세) ${partN(k)} — ${skillLine(m, 2, s)}`; }).join('\n'); },
  ch: (s, d) => [{ t: '데뷔 무대에 선다', f: s => {
    const t = s.tracks.idol, ag = AG[t.ag];
    for (const x of people(s, x => x.rel === '동기' && x.trainee === t.ag && !d.mem.some(m => m[0] === x.id))) { x.rel = '친구'; x.trainee = null; }
    for (const [id] of d.mem) s.people[id].trainee = null;
    startBand(s, { k: t.part, mem: d.mem }, d.name);
    // 연습생 계약 때 정한 정산 비율 · 그룹 계약 기간을 그대로 (v116 버그 6: 회사 기본값 · 5년으로 돌아갔다)
    Object.assign(s.tracks.band, { st: 'signed', ag: t.ag, agN: ag.n, tier: ag.tier, cut: t.cut != null ? t.cut : ag.cut, contract: t.gMonths || 84, cm: 0, nextRel: 99, debt: t.debt || 0, fromTr: true, firstPay: false });
    s.tracks.band.b.tw = Math.min(50, 20 + Math.floor((t.months || 0) / 2)); // 데뷔조로 같이 연습한 만큼 팀워크를 안고 시작한다 (v117)
    t.debt = 0;
    s.tracks.band.b.f = ag.tier * U.int(1500, 4000);
    t.st = 'ended'; t.endNote = `${ag.n} 연습생 → 밴드 ${josa(`「${d.name}」`, '으로')} 데뷔`; t.hist.push(t.endNote);
    queueEv(s, 'band_relres', 1, { q: boughtQ(ag.tier), self: false, title: songTitle(), debut: true, c: U.chance(0.5) ? s.trend : U.pick(TRENDS) });
    milestone(s, `${age(s)}세에 ${ag.n} 밴드 「${d.name}」의 ${josa(partN(t.part), '으로')} 데뷔했다.`);
    askStageName(s, 'band', ag.n);
    return `밴드 「${d.name}」 ${partN(t.part)} 멤버로 데뷔 무대에 섰다!`;
  } }],
});
function endBand(s, why) {
  const t = s.tracks.band;
  for (const m of bandMembers(s, t)) if (m.rel === '멤버') m.rel = '전 멤버';
  t.endNote = `밴드 「${t.b.name}」 (${why})`; t.hist.push(t.endNote); t.st = 'ended';
  milestone(s, `${age(s)}세에 밴드 「${t.b.name}」 활동을 마쳤다 (${why}).`);
}
function signBand(s, o) {
  const t = s.tracks.band, ag = AG[o.ag];
  Object.assign(t, { st: 'signed', ag: o.ag, agN: ag.n, tier: ag.tier, cut: o.cut, contract: o.months, cm: 0, debt: 0, fromTr: false, firstPay: false });
  milestone(s, `${age(s)}세에 밴드 ${josa(`「${t.b.name}」`, '이가')} ${josa(ag.n, '과와')} 계약했다.`);
  return `밴드 ${josa(`「${t.b.name}」`, '이가')} ${josa(ag.n, '과와')} 계약했다. (${yrs(o.months)} · 회사 몫 ${pctN(o.cut)}) 이제 회사가 앨범과 홍보를 맡는다.`;
}
NEGO.band = {
  what: '밴드 전속 계약이다. 회사가 앨범과 홍보를 맡는다.',
  block: s => agencyContract(s) ? contractWhy(s) : !trackOn(s, 'band') ? '지금은 밴드 활동을 하고 있지 않다' : '',
  sign: (s, d) => { if (d.bonus) earn(s, d.bonus, '전속 계약금', 'band'); return signBand(s, d); },
  refuse: (s, d) => `${d.agN}의 영입 제안을 거절했다.`,
};
// 계약을 중간에 깨면 남은 기간만큼 위약금을 문다 (밴드는 인디로 돌아간다)
function bandBreakPen(t) { return Math.max(500e4, Math.max(0, t.contract - t.cm) * 50e4 * t.tier); }
// 기획사 밴드 정산 (아이돌과 같은 방식): 회사 몫을 떼고 멤버 수로 나눈다. 연습생 비용과 제작비를 다 갚기 전에는 비용부터 갚는다
const BAND_PROD = [0, 0.4e8, 0.8e8, 1.3e8];
// 정산서를 남긴다 (v118 UI C2). 비용을 다 갚는 순간은 창으로 (C4)
function bandIncome(s, t, rev, label) {
  const n = bandMembers(s, t).length + 1;
  t.gross = Math.max(0, Math.round(rev * (1 - t.cut) / n));
  if (!(rev > 0)) return 0;
  const r = billPay(s, { t, rev, cut: t.cut, n, team: '밴드', what: label, job: 'band', costN: `${t.fromTr ? '연습생 · ' : ''}제작 비용` });
  if (r.pay > 0 && t.debt <= 0 && !t.firstPay) { t.firstPay = true; debtClear(s, 'band', t); }
  return r.share;
}
CAREERS.band = {
  n: '밴드 멤버', ic: '🎸',
  // 기획사 연습생에서 데뷔한 밴드는 아이돌처럼 숙소에 산다 (v116 버그 5: 데뷔하는 순간 본가로 돌아갔다). 어른이 되어 인디 밴드로 계약한 밴드(fromTr 없음)는 그대로
  dorm(s, t) { return t.st === 'signed' && !!t.fromTr && !!t.ag && !married(s) && s.home.mode !== 'alone'; },
  desc: '밴드에서 한 파트를 맡는다. 보컬·기타·베이스·드럼이 한 명씩 있어야 공연할 수 있다. 기획사 소속이면 연습생 비용과 앨범 제작비를 다 갚은 뒤부터 정산을 받는다.',
  act: { n: '밴드 활동 (합주·공연)', ic: '🎸', g: '직업 활동', eff: [['내 파트', '↑↑', 1], ['팬', '↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) {
    if (t.st === 'ended' || t.st === 'none') return t.endNote || '';
    const miss = bandMissing(t).map(partN).join('·');
    if (t.st === 'forming') return `밴드 「${t.b.name}」 ${partN(t.b.my)} · 멤버 모으는 중 (필요: ${miss}) · 진로 창에서 모은다`;
    return `밴드 「${t.b.name}」 ${partN(t.b.my)} · ${t.st === 'signed' ? `${t.agN} 소속` : ownCoTag(s, 'band') || '인디'} · 밴드 팬 ${fmtFans(t.b.f)} · 발표곡 ${t.rel}곡${t.st === 'signed' && t.debt > 0 ? ` · 갚을 비용 ${fmtWon(t.debt)}` : ''}` + (miss ? ` · ${miss} 자리 비어 있음` : t.alb || t.nextRel > 12 || musRelQ(s, 'band') ? ' · 새 곡 준비 중' : t.nextRel > 0 ? ` · 다음 곡까지 ${t.nextRel}개월` : '');
  },
  short(s, t) { return `밴드 「${t.b.name}」`; },
  seg(s, t) { return `밴드 「${t.b.name}」 ${partN(t.b.my)}${t.st === 'signed' ? ` · ${t.agN} 소속` : ''}`; },
  title(s, t) { return t.b && t.st !== 'forming' && t.rel ? `밴드 「${t.b.name}」의 ${partN(t.b.my)}` : null; },
  contract(s, t) { return t.st === 'signed' ? t.agN : ''; },
  cLeft(s, t) { return t.st === 'signed' ? t.contract - t.cm : null; },
  mainSk(s, t) { return t.b ? t.b.my : null; },
  // 팀 활동 (v117 밸런스 A3): 직업 창의 '골라서 하는 일'
  picks(s, t) { return teamPicks(s, 'band'); },
  info(s, t) {
    const R = [];
    R.push(['소속', t.st === 'signed' ? `${t.agN} (${TIER_N[t.tier]} 기획사) · 회사 몫 ${pctN(t.cut)}` : t.st === 'forming' ? '아직 결성 전' : '인디']);
    if (t.st === 'signed' && t.debt > 0) R.push(['갚을 비용', fmtWon(t.debt)]);
    R.push(['밴드 팬', fmtFans(t.b.f)]);
    if (t.st !== 'forming') R.push(['팀워크', twWord(t.b)]);
    R.push(['발표곡', `${t.rel}곡${t.bestPeak ? ` · 최고 ${t.bestPeak}위` : ''}`]);
    if (t.alb) R.push(['이번 새 곡', t.alb.at != null ? `${albStageW(s, t.alb)}${t.alb.mk ? ` · ${t.alb.mk.boss}` : ''}` : '실을 곡을 정할 차례']);
    const miss = bandMissing(t);
    R.push({ h: '멤버', items: [`${partN(t.b.my)}: 나 (${lvi(me(s), t.b.my)}레벨)`].concat(bandMembers(s, t).map(x => `${partN(t.b.part[x.id])}: ${x.name} (${x.g === '여' ? '여' : '남'} · ${pAge(s, x)}세) — ${partN(t.b.part[x.id])} ${lvi(x, t.b.part[x.id])}레벨 · ${relWord(x)}`)).concat(miss.map(k => `${partN(k)}: 비어 있음`)) });
    return R;
  },
  actions(s, t) {
    if (!['forming', 'indie', 'signed'].includes(t.st)) return [];
    const A = [], miss = bandMissing(t);
    if (t.st === 'signed') A.push(...songSubActs(s, t));
    if (t.st === 'signed') { const pen = bandBreakPen(t); A.push({ t: '회사와 계약 해지', h: `계약이 ${Math.max(0, t.contract - t.cm)}개월 남았다 · 위약금 ${fmtWon(pen)} · 밴드는 인디로 돌아간다`, ok: true, danger: true, confirm: `${josa(t.agN, '과와')}의 계약을 해지할까요? 위약금 ${fmtWon(pen)}을 물어야 해요.`, run: s => { s.debt += pen; const n = t.agN; t.hist.push(`${n} (계약 해지)`); t.st = 'indie'; t.ag = null; t.agN = ''; t.tier = 0; t.cut = 0; t.nextRel = U.int(3, 6); return `${josa(n, '과와')}의 계약을 해지했다. 밴드는 다시 인디가 됐다.` + fx(s, { rep: -3 }); } }); }
    const want = miss.concat(!bandHasKeys(t) ? ['keyboard'] : []);
    for (const k of want) A.push({ t: `${partN(k)} 구인 글 올리기${miss.includes(k) ? '' : ' (있으면 좋다)'}`, h: '다음 달에 지원자들이 연락해 온다 · 실력과 사람을 보고 고른다', ok: !hasQ(s, 'band_cands'), why: '다른 구인 글의 지원자를 기다리는 중', run: s => { queueEv(s, 'band_cands', 1, { k }); return `밴드 ${partN(k)} 구인 글을 올렸다.`; } });
    // 아는 사람 중에 비어 있는 파트를 할 줄 아는 사람에게 부탁한다 (같은 사람에게는 반년에 한 번)
    const cand = people(s, x => ['친구', '동료', '동기', '선배', '지인', '전 멤버', '제자'].includes(x.rel) && !x.hidden && want.some(k => lv(x, k) >= 8) && !(x.bandAskT > s.t - 6)).sort((a, b) => b.aff - a.aff).slice(0, 4);
    for (const x of cand) {
      const k = want.filter(k => lv(x, k) >= 8).sort((a, b) => lv(x, b) - lv(x, a))[0], p = bandAskP(s, x);
      A.push({ t: `${x.name}에게 ${josa(partN(k), '을를')} 맡아 달라고 하기`, h: `${x.rel} · ${partN(k)} ${lvSee(s, x, k)}레벨 · ${relWord(x)} · 들어줄 가능성 ${fmtPct(p)}`, ok: true, run: s => { x.bandAskT = s.t; if (U.chance(p)) return addBandMember(s, x, k, '아는 사이'); aff(x, -3); return `${x.name}에게 같이 하자고 했지만, 지금은 어렵다며 거절했다.`; } });
    }
    if (t.st === 'forming') A.push({ t: '밴드 만들기 그만두기', ok: true, danger: true, run: s => { for (const m of bandMembers(s, t)) { m.rel = '친구'; } t.st = 'ended'; t.endNote = `밴드 「${t.b.name}」 (결성 전에 그만둠)`; t.hist.push(t.endNote); return '밴드 만들기를 그만뒀다.'; } });
    else A.push({ t: '밴드 그만두기', h: t.st === 'signed' ? `계약 중에 나가면 위약금 ${fmtWon(1000e4 * t.tier)}` : '멤버들에게 미안하지만 혼자 나온다', ok: true, danger: true, confirm: '정말 밴드를 그만둘까요?', run: s => { if (t.st === 'signed') s.debt += 1000e4 * t.tier; endBand(s, '탈퇴'); return '밴드를 그만뒀다.'; } });
    return A;
  },
  monthly(s, t) {
    if (!['forming', 'indie', 'signed'].includes(t.st)) return;
    qFront(s, ['band_fest_play']); // 페스티벌 무대는 그달에 바로 (다른 창이 밀려 있어도 늦지 않게)
    t.months++;
    const n = slotsOn(s, 'c_band'), p = me(s), mem = bandMembers(s, t);
    // 멤버를 모으는 동안에는 혼자 또는 모인 멤버끼리 연습만 한다
    if (t.st === 'forming') {
      if (n) { practice(s, p, t.b.my, 1 * n, 1); for (const m of mem) { matePot(m, t.b.part[m.id]); practice(s, m, t.b.part[m.id], 0.6); m.contactT = s.t; } twAdd(t.b, 0.3); }
      if (t.months === 12) addLog(s, `밴드 「${t.b.name}」 멤버를 1년째 모으는 중이다. 아직 ${bandMissing(t).map(partN).join('·')} 자리가 비어 있다.`, 'career');
      return;
    }
    if (calM(s) === 11) musicAwards(s, t, t.b.name, musicRookie(s, t.rel > 0), 'band');
    if (t.st === 'signed') { t.cm++; if (t.cm >= t.contract) queueEv(s, 'band_contract', 0); }
    if (!n && t.st === 'indie') { t.idle++; twAdd(t.b, -1); if (t.idle >= 6) queueEv(s, 'band_idle', 0); return; }
    t.idle = 0;
    // 합주: 내 파트가 빨리 늘고 멤버들도 같이 는다
    practice(s, p, t.b.my, 1.3 * Math.max(1, n), 1);
    if (has(p, 'compose') && U.chance(0.3)) useSkill(s, p, 'compose', 0.5);
    // 멤버도 같이 큰다 (v117 밸런스 A: 재능 · 나이 · 의욕 · 회사 연습실만큼). 같이 활동한 시간만큼 팀워크가 조금씩, 가끔 티격태격하면 조금 내려간다
    const tmB = teamOf(s, 'band'); if (tmB) teamGrow(s, tmB, 1);
    twAdd(t.b, twOf(t.b) < 60 ? 0.5 : -0.3); // 그냥 같이 지내는 것만으로는 60까지. 그 위는 팀 활동 · 사건으로 올리고, 손을 놓으면 천천히 내려온다
    for (const m of mem) { if (U.chance(0.1)) { bond(s, m, -U.int(3, 8)); twAdd(t.b, -1); } else bond(s, m, U.int(0, 2)); }
    // 클럽 공연: 팬이 조금씩 는다
    const pw = bandPower(s, t);
    const g = Math.max(0, Math.round((pw - 6) * U.fl(1.2, 3) * (1 + Math.log10(1 + t.b.f) / 3) * access(s) * (t.st === 'signed' ? 1.8 : 1) * Math.max(1, n) * Math.max(0, 1 - t.b.f / starCap(55, 'kr'))));
    t.b.f += g; s.fans.kr += Math.round(g * 0.35 * popSpeed(s) * myRoom(s, 'kr'));
    if (t.b.f >= 300) { const live = (45e4 + Math.min(t.b.f, 2e4) * 180 + Math.max(0, t.b.f - 2e4) * 270) * awMul(s, 'band'); if (t.st === 'signed') bandIncome(s, t, live, '공연 정산'); else earn(s, Math.round(live / (mem.length + 1)), '공연 수입'); }
    addStress(s, 2 * pm(s, 'crowdStress'));
    t.nextRel--;
    musAlbMonth(s, 'band'); // v154: 인디는 새 곡 기획 창, 회사 소속은 새 곡 회의
    if (t.st === 'indie' && t.b.f >= 3000 && U.chance(0.04)) maybeScout(s, 'band');
    // 페스티벌 섭외 (v117 밸런스 C2): 페스티벌마다 열리는 달이 정해져 있고, 섭외는 2~4달 전에 온다. 답장 기한은 페스티벌 한 달 전
    if (t.b.f >= 1500 && t.festY !== calY(s) && U.chance(0.15) && !s.inbox.some(m => m.kind === 'band_fest') && !hasQ(s, 'band_fest_play')) {
      const c = BAND_FESTS.filter(x => x.m - calM(s) >= 2 && x.m - calM(s) <= 4 && t.b.f >= x.minF);
      if (c.length) { const x = U.pick(c); t.festY = calY(s); sendMsg(s, 'band_fest', { from: x.n, title: `${x.m + 1}월 페스티벌 섭외`, months: x.m - calM(s) - 1, d: { festM: x.m, mult: x.mult, fee: Math.round((100 + t.b.f / 50) * (0.5 + 0.5 * x.mult)) * 1e4 } }); }
    }
    // 나가겠다는 멤버 (v123): 사이가 틀어졌거나(친밀도 35 아래) 밴드가 먹고살기 힘들 때만(인디 · 팬 5,000명 아래). 잘되는 밴드에서 '먹고살려고' 나가지 않는다
    if (mem.length && t.months >= 24 && (mem.some(m => m.aff < 35) || (t.st === 'indie' && t.b.f < 5000)) && U.chance(0.008)) queueEv(s, 'band_leave', 0);
  },
};
E({
  id: 'band_idle', cat: '밴드', title: '합주에 안 나온 지 오래됐다', tag: 'career',
  cond: s => s.tracks.band.st === 'indie',
  text: s => `반년 넘게 밴드 「${s.tracks.band.b.name}」 합주에 나가지 않았다. 멤버들 단톡방이 조용하다. 다들 서운해하는 눈치다.`,
  ch: () => [
    { t: '다시 열심히 하겠다고 한다', h: '일정에 밴드 활동을 넣어야 한다', f: s => { s.tracks.band.idle = -6; for (const m of bandMembers(s, s.tracks.band)) bond(s, m, -3); return '다시 열심히 하겠다고 했다.'; } },
    { t: '밴드를 정리한다', f: s => { endBand(s, '활동 중단'); return '밴드를 정리했다.'; } },
  ],
});
// 곡 내기: 밴드 안에서 작곡을 가장 잘하는 사람이 곡을 쓴다
E({
  id: 'band_rel', cat: '밴드', title: '새 곡 준비', tag: 'career',
  cond: s => trackOn(s, 'band'),
  init(s, d) {
    const t = s.tracks.band;
    const all = [me(s)].concat(bandMembers(s, t)).filter(x => has(x, 'compose'));
    d.w = all.sort((a, b) => lv(b, 'compose') - lv(a, 'compose'))[0] || null;
    d.title = songTitle();
  },
  text: (s, d) => { const t = s.tracks.band; return `밴드 「${t.b.name}」 새 곡을 낼 때가 됐다.${d.w ? ` 작곡은 ${d.w.id === s.me ? '내가' : josa(d.w.name, '이가')} 할 수 있다 (작곡 ${lvi(d.w, 'compose')}레벨).` : ' 멤버 중에 작곡을 할 줄 아는 사람이 없다.'}` + (t.st === 'signed' ? `\n${josa(t.agN, '이가')} 제작비를 댄다.` : ownCo(s, 'band') ? `\n녹음비 중 내 몫은 내 회사 ${josa(`「${ownCo(s, 'band').name}」`, '이가')} 낸다.` : '\n인디라서 녹음비는 멤버들이 나눠 낸다.'); },
  ch(s, d) {
    const t = s.tracks.band, signed = t.st === 'signed', cost = signed ? 0 : 40e4;
    const o = [];
    // 컨셉 (v116 버그 7): 멤버 자작곡 · 산 곡은 컨셉 고르기 창(bandQ), 기획사가 구해 온 곡은 컨셉 회의(band_cb). 예전엔 내가 쓴 곡만 컨셉이 있었다
    if (d.w) o.push({ t: '자작곡으로 낸다', h: `${d.w.id === s.me ? '내가' : josa(d.w.name, '이가')} 곡을 쓴다${cost ? ' · 녹음비 ' + fmtWon(cost) : ''}`, ok: s => jobMoney(s, 'band') >= cost, f: s => { if (cost) jobPay(s, cost, '녹음비', 'band'); if (d.w.id === s.me) { useSkill(s, me(s), 'compose', 2); return pickConcept(s, { cb: 'bandT', what: `밴드 「${t.b.name}」 자작곡의`, title: d.title }); } const q = lv(d.w, 'compose') * 0.9 + U.normal(0, 6); return pickConcept(s, { cb: 'bandQ', what: `${josa(d.w.name, '이가')} 쓴 밴드 새 곡 「${d.title}」의`, title: d.title, q, w: d.w.name }); } });
    o.push({ t: signed ? '회사가 구해 온 곡으로 낸다' : '아는 작곡가에게 곡을 받는다', h: signed ? '컨셉은 회사와 회의해서 정한다' : '곡값 150만 원', ok: s => signed || jobMoney(s, 'band') >= 150e4, f: s => {
      const x = { q: boughtQ(t.tier), title: d.title };
      if (signed) { if (s.pending) queueEv(s, 'band_cb', 0, x, true); else fireEvent(s, 'band_cb', x); return ''; }
      jobPay(s, 150e4, '곡 구입비', 'band');
      return pickConcept(s, Object.assign(x, { cb: 'bandQ', what: `밴드 새 곡 「${d.title}」의` }));
    } });
    o.push({ t: '이번엔 공연만 한다', h: '석 달 뒤에 다시', f: s => { t.nextRel = 3; return '새 곡은 미루고 공연에 집중하기로 했다.'; } });
    return o;
  },
});
// 컨셉을 먼저 고르고 제목을 짓는다
SONG_CB.bandT = (s, d, c) => askTitle(s, 'bandSelf', { title: d.title, what: `'${c}' 컨셉 ${d.what}`, c });
TITLE_CB.bandSelf = (s, d) => d.c ? SONG_CB.band(s, d, d.c) : (pickConcept(s, { cb: 'band', what: `밴드 자작곡 「${d.title}」의`, title: d.title }), `밴드 자작곡 「${d.title}」 작업을 시작했다.`);
SONG_CB.band = (s, d, c) => {
  const q = lv(me(s), 'compose') * 0.9 + U.normal(0, 6) + cmBonus(s, c);
  cmGain(s, c, 10);
  queueEv(s, 'band_arr', 0, { q, self: true, title: d.title, w: me(s).name, c }); // 편곡 회의를 거쳐 다음 달에 나온다 (v118)
  return `'${c}' 컨셉으로 밴드 자작곡 ${josa(`「${d.title}」`, '을를')} 썼다.`;
};
// 멤버 자작곡 · 산 곡: 고른 컨셉으로 녹음한다 (숙련도만큼 곡이 나아지는 건 내가 쓴 곡과 같다)
SONG_CB.bandQ = (s, d, c) => {
  queueEv(s, 'band_arr', 0, { q: d.q + cmBonus(s, c), self: false, title: d.title, w: d.w, c });
  return `'${c}' 컨셉으로 밴드 새 곡 ${josa(`「${d.title}」`, '을를')} 녹음하기 시작했다.`;
};
// 기획사 밴드가 회사가 구해 온 곡을 낼 때: 아이돌 컴백 회의처럼 회사 컨셉으로 가거나 다른 컨셉을 제안한다
E({
  id: 'band_cb', cat: '밴드', title: '새 곡 컨셉 회의', tag: 'career',
  cond: s => s.tracks.band.st === 'signed',
  init(s, d) {
    const t = s.tracks.band;
    d.c = U.chance(0.5) ? s.trend : U.pick(TRENDS);
    d.alt = U.shuffle(TRENDS.filter(x => x !== d.c)).slice(0, 2);
    d.p = U.clamp(0.3 + Math.log10(1 + t.b.f) / 20 + (s.rep - 50) / 200, 0.2, 0.85);
  },
  text: (s, d) => `${josa(s.tracks.band.agN, '이가')} 구해 온 새 곡 「${d.title}」 회의가 열렸다. 회사는 '${d.c}' 컨셉으로 가려고 한다. 요즘 차트에선 '${s.trend}' 컨셉이 강세다.`,
  ch(s, d) {
    const go = (s, c) => queueEv(s, 'band_arr', 0, { q: d.q + cmBonus(s, c), self: false, title: d.title, c });
    const C = [{ t: `회사 뜻대로 '${d.c}' 컨셉으로 간다`, tr: d.c === s.trend, h: `숙련도 ${gauge(cmGet(s, d.c))} ${Math.floor(cmGet(s, d.c))}`, f: s => { go(s, d.c); return `'${d.c}' 컨셉으로 새 곡 「${d.title}」 녹음을 시작했다.`; } }];
    d.alt.forEach(c => C.push({ t: `'${c}' 컨셉을 제안한다`, tr: c === s.trend, h: `받아들여질 가능성 ${fmtPct(d.p)} · 숙련도 ${gauge(cmGet(s, c))} ${Math.floor(cmGet(s, c))}`, f: s => { const ok = U.chance(d.p); go(s, ok ? c : d.c); return ok ? `내 의견대로 '${c}' 컨셉으로 새 곡 ${josa(`「${d.title}」`, '을를')} 녹음하기로 했다.` : `제안은 받아들여지지 않았다. 회사 뜻대로 '${d.c}' 컨셉으로 간다.`; } }));
    return C;
  },
});
E({
  id: 'band_relres', cat: '음원 성적', title: '밴드 새 곡 성적', tag: 'career',
  plio: (s, d) => typeof plioSong === 'function' ? plioSong(s, d, 'band') : null,
  live: (s, d) => d.card && d.card.live,
  init(s, d) {
    const t = s.tracks.band;
    if (!trackOn(s, 'band')) { d.skip = true; return; }
    // 컨셉 궁합 (v97): 멤버들의 재능 · 나이, 힙합은 보컬의 랩
    const bp = [me(s)].concat(bandMembers(s, t)), cf = cFit(s, d.c, bp, stageYrs(s)), bv = bp.find(x => (x.id === s.me ? t.b.my : t.b.part[x.id]) === 'vocal');
    if (cf.rap != null) cf.rap = bv ? lv(bv, 'rap') : 0;
    const sc = songScore(s, { perf: cPerf(bandPower(s, t), cf), q: d.q, fans: t.b.f, tier: t.tier, trend: !!d.c && d.c === s.trend, bonus: (d.self ? 3 : 0) + cScoreB(cf) + bandArrB(s, t, d) });
    cNote(s, cf, d.title);
    d.peak = chartFromScore(sc); d.ht = false; // 밴드는 음악방송 1위가 없어 유행을 바꾸지 않는다 (v166)
    jpopWork(s, 'band', sc);
    d.gain = fanGainRaw(sc, t.b.f, t.st === 'signed' ? 1 : 0.6, starCap(60, 'kr'));
    t.b.f = Math.max(0, t.b.f + d.gain);
    // 흥행 실패: 소속사가 있는데 차트에 못 들었거나, 인디인데 팬이 오히려 줄었을 때 (멤버 의욕 · '가라앉은 연습실')
    teamRel(s, 'band', t, d.peak, !d.peak && (t.st === 'signed' || d.gain <= 0));
    const my = Math.round(Math.max(0, d.gain) * 0.35 * popSpeed(s) * myRoom(s, 'kr')); s.fans.kr += my; d.my = my;
    const share = 1 / (bandMembers(s, t).length + 1);
    d.roy = addCatalog(s, d.title, '연주', sc, (t.st === 'signed' ? 0.6 : 1) * share * 1.5, 'band') + (d.self ? addCatalog(s, d.title, '작곡', sc, 0.8, 'band') : 0) + (d.lyr ? addCatalog(s, d.title, '작사', sc, 0.35, 'band') : 0);
    // v154: 수록곡에 실린 내 곡 · 가사
    if (d.a) { const r = albRoyalty(s, d.a, sc, 'band', true); d.roy += r.m; d.side = r.txt; }
    if (t.st === 'signed') {
      d.signed = true; d.fromTr = !!t.fromTr;
      t.debt = (t.debt || 0) + BAND_PROD[t.tier] * (0.45 + 0.55 * Math.min(1, t.b.f / 1e5)) / (bandMembers(s, t).length + 1);
      const albums = Math.round(t.b.f * U.fl(0.15, 0.3));
      d.pay = bandIncome(s, t, albums * 14000 + (d.peak ? (101 - d.peak) * 250e4 : 0), '앨범·음원 정산'); d.debt = t.debt; d.gross = t.gross;
      if (t.lastBill) { t.lastBill.t = `「${d.title}」 앨범 · 음원 정산`; d.bill = t.lastBill; }
    }
    if (d.c) cmGain(s, d.c, 3); // 아이돌처럼 그 컨셉으로 활동만 해도 숙련도 +3 (v116 버그 7)
    // v154: 다음 곡 기획은 3~6달 뒤 (기획 → 선정 → 편곡 · 녹음이 석 달 걸려서, 곡 간격은 예전처럼 6~9달)
    t.rel++; musicRookie(s, true); t.nextRel = U.int(3, 6); t.alb = null; t.yearBest = Math.max(t.yearBest || 0, sc);
    if (d.peak && (!t.bestPeak || d.peak < t.bestPeak)) t.bestPeak = d.peak;
    // 발매 결과 카드 (v118 UI C1)
    d.card = songCardMake({ t: d.title, by: `밴드 「${t.b.name}」`, peak: d.peak, fans: [['밴드 팬', d.gain], ['내 팬', my]], pay: d.pay, bill: d.bill }, bandReactF(s, t, d, cf), sc, t);
    if (d.ht) hitTrendGo(s, d.c, d.title, `밴드 「${t.b.name}」`);
    if (d.mk) d.card.mk = d.mk;
    // 무대 창 (12-3): 인디는 클럽 공연, 소속사가 있으면 쇼케이스. 첫 곡이거나 차트에 든 곡이 '중요할 때'
    d.card.live = bandLive(s, t, { vn: t.st === 'signed' ? 'hall' : 'club', place: t.st === 'signed' ? '쇼케이스' : '클럽 공연', t: d.title, sc, key: t.rel === 1 || !!d.peak, z: { q: (d.q - 45) / 15, trend: d.c && d.c === s.trend ? 0.7 : -0.5 } });
    addWork(s, { type: '밴드 싱글', title: d.title, by: `「${t.b.name}」`, sc, note: chartText(d.peak) + (d.self ? ' · 자작곡' : ''), card: d.card });
    if (t.rel === 1) milestone(s, `${age(s)}세에 밴드 「${t.b.name}」의 첫 곡 ${josa(`「${d.title}」`, '을를')} 냈다.`);
    if (d.peak && d.peak <= 10 && !t.hitMs) { t.hitMs = true; milestone(s, `${age(s)}세에 밴드 「${t.b.name}」의 ${josa(`「${d.title}」`, '이가')} 차트 ${d.peak}위에 올랐다.`); }
    for (const m of bandMembers(s, t)) bond(s, m, sc >= 60 ? 4 : 0);
    d.sc = sc; d.cm = comments(sc, actNick(s, 'band'));
  },
  html: (s, d) => d.card && typeof songCardHTML === 'function' ? cardText(s, d) + albBannerHTML(d.card.mk) + songCardHTML(d.card) : '',
  // 순위 · 팬 · 반응은 카드에 있다. 본문에는 곡 정보와 앞으로 들어올 돈만 (예전 세이브의 카드 없는 창은 예전처럼)
  text: (s, d) => `밴드 「${s.tracks.band.b.name}」의 ${josa(`「${d.title}」`, '이가')} 나왔다.${d.w || d.c ? ` (${[d.w ? `작곡 ${d.self ? '나' : d.w}` : '', d.c ? `'${d.c}' 컨셉` : ''].filter(Boolean).join(' · ')})` : ''}${d.c && d.c === s.trend ? ' 요즘 유행하는 컨셉이다.' : ''}${d.side ? ` ${d.side}` : ''}${d.card ? '' : `\n\n${chartText(d.peak)}\n밴드 팬 ${sgnFans(d.gain)} · 내 팬 +${fmtFans(d.my)}`}${d.roy >= 1e4 ? `\n\n매달 들어올 음원 수익 약 ${fmtWon(d.roy)} (조금씩 줄어든다)` : '\n'}${d.bill ? (d.bill.note ? `\n${d.bill.note}` : `\n이번 앨범 정산금 ${fmtWon(d.pay)}.`) : d.signed ? (d.debt > 0 ? `\n이번 앨범 정산금 ${fmtWon(d.gross)}은 ${d.fromTr ? '연습생·' : ''}제작 비용을 갚는 데 들어갔다. 남은 비용 ${fmtWon(d.debt)}` : `\n이번 앨범 정산금 ${fmtWon(d.pay)}`) : ''}${d.card ? '' : `\n\n반응: ${d.cm}`}`,
  // 댓글 모니터링 (v118 UI C1)
  ch: (s, d) => songCommentCh(s, d, `밴드 새 곡 ${josa(`「${d.title}」`, '을를')} 냈다. ${chartText(d.peak)}.`, 'band'),
});
// 편곡 회의 (v118 UI C1): 곡을 내기 전에 편곡 방향을 정한다. 고른 방향이 점수(숨은 값)와 발매 결과 카드의 반응에 나온다
E({
  id: 'band_arr', cat: '밴드', title: '편곡 회의', tag: 'career',
  init(s, d) { if (!trackOn(s, 'band') || !s.tracks.band.b) d.skip = true; },
  text: (s, d) => `「${d.title}」 편곡 방향을 정할 차례다. 멤버들이 내 얼굴을 쳐다본다.`,
  ch(s, d) {
    const t = s.tracks.band, my = t.b.my;
    // v154: 앨범 제작 틀로 온 곡은 편곡 한 달 + 녹음 한 달 뒤에 나온다
    const go = (a, x) => s => { queueEv(s, 'band_relres', d.alb ? 2 : 1, Object.assign({}, d, { arr: a }), true); return `「${d.title}」 ${x}`; };
    const C = [];
    if (my !== 'vocal') C.push({ t: `내 ${josa(partN(my), '을를')} 앞에 세운다`, f: go('me', `편곡은 ${josa(partN(my), '을를')} 앞에 세우기로 했다.`) });
    C.push({ t: '보컬 중심으로 간다', f: go('voc', '편곡은 보컬 중심으로 가기로 했다.') }, { t: '요즘 유행 쪽으로 다듬는다', f: go('trend', '편곡을 요즘 유행 쪽으로 다듬기로 했다.') }, { t: '우리 색을 고수한다', f: go('own', '편곡은 우리 색 그대로 가기로 했다.') });
    return C;
  },
});
// 편곡 방향이 점수에 주는 것 (숨은 값): 내 파트 · 보컬을 앞에 세우면 그 실력이 밴드 평균보다 좋을수록, 유행 쪽은 유행 컨셉이 아닐 때 (팬이 많으면 덜), 우리 색은 팀워크 · 팬이 많을수록
function bandPl(s, t, x) { return x.id === s.me ? t.b.my : t.b.part[x.id]; }
function bandArrB(s, t, d) {
  if (!d.arr) return 0;
  const all = [me(s)].concat(bandMembers(s, t)), avg = all.reduce((a, x) => a + lv(x, bandPl(s, t, x)), 0) / all.length, voc = all.find(x => bandPl(s, t, x) === 'vocal');
  if (d.arr === 'me') return U.clamp((lv(me(s), t.b.my) - avg) / 5, -4, 4);
  if (d.arr === 'voc') return U.clamp(((voc ? lv(voc, 'vocal') : 0) - avg) / 5, -4, 4);
  if (d.arr === 'trend') return d.c === s.trend ? 0.5 : 2.5 - (t.b.f >= 2e4 ? 1.5 : 0);
  return U.clamp((twOf(t.b) - 50) / 20 + (t.b.f >= 1e4 ? 1.5 : 0), -2, 4);
}
// 밴드 곡 반응 재료: 가장 잘하는 파트 · 가장 처지는 파트 · 곡 · 팬 · 유행 · 팀워크 · 홍보 · 컨셉 궁합 · 편곡 방향
// 무대 창 (12-3): 밴드 무대. vn: 장소 모양 (club 클럽 · hall 쇼케이스 · fest 페스티벌). 내가 맨 앞(mi 0)
function bandLive(s, t, o) {
  const p = me(s), mem = [[actCall(s, 'band'), partN(t.b.my)]].concat(bandMembers(s, t).map(x => [callName(x.name), partN(t.b.part[x.id])]));
  return liveStage(Object.assign({ k: 'band', g: t.b.name, cn: t.b.name, mem, mi: 0, sx: liveSx([p].concat(bandMembers(s, t))) }, o, { z: Object.assign({ perf: (bandPower(s, t) - 45) / 18, tw: (twOf(t.b) - 50) / 20, me: (lv(p, t.b.my) - 45) / 18, fans: (Math.log10(1 + t.b.f) - 3.4) / 0.9 }, o.z || {}) }));
}
function bandReactF(s, t, d, cf) {
  const L = [me(s)].concat(bandMembers(s, t)).map(x => ({ k: bandPl(s, t, x), v: lv(x, bandPl(s, t, x)) })).sort((a, b) => b.v - a.v), hi = L[0], lo = L[L.length - 1];
  const F = [
    { z: (hi.v - 45) / 18, g: hi.k === 'vocal' ? ['보컬이 곡을 꽉 채운다', '보컬 목소리가 귀에 확 들어온다'] : [`${partN(hi.k)} 사운드가 꽉 찼다`, `${partN(hi.k)} 연주가 귀에 확 들어온다`], b: ['연주가 전체적으로 아직 서툴다'] },
    { z: (lo.v - 32) / 15, g: ['빠지는 파트 없이 고르다'], b: [`${josa(partN(lo.k), '이가')} 조금 힘에 부친다`, `${josa(partN(lo.k), '이가')} 다른 파트를 못 따라간다`] },
    RX.q(d.q), RX.fans(t.b.f, d.gain), RX.trend(!!d.c && d.c === s.trend, d.ht), RX.tw(twOf(t.b)), RX.promo(t.tier || 0), cf ? RX.cf(cScoreB(cf)) : null,
  ];
  const ab = bandArrB(s, t, d), mp = partN(t.b.my);
  if (d.arr) F.push({ z: ab / 3, g: { me: [`${josa(mp, '이가')} 앞에 나온 편곡이 시원하다`], voc: ['보컬을 살린 편곡이 귀에 쏙 들어온다'], trend: ['요즘 감성으로 잘 다듬었다'], own: ['역시 이 밴드다운 소리다'] }[d.arr], b: { me: [`${josa(mp, '이가')} 너무 앞에 나와 노래가 묻힌다`], voc: ['보컬만 덩그러니 남은 느낌이다'], trend: ['유행 따라가다 이 밴드 색이 흐려졌다'], own: ['늘 듣던 그 소리라 좀 지루하다'] }[d.arr] });
  return F;
}
INBOX.band_fest = {
  ic: '🎪',
  text: (s, m) => `「${m.from}」에서 밴드 ${josa(`「${(s.tracks.band.b || {}).name || ''}」`, '을를')} 섭외하고 싶다고 한다. ${m.d.festM != null ? `${m.d.festM + 1}월 첫 주말 · ` : ''}출연료 ${fmtWon(m.d.fee)}. ${(m.d.mult || 1) >= 1.5 ? '큰 무대라 새 팬을 모으기 좋다.' : '아담한 무대지만 처음 보는 관객을 만날 수 있다.'}`,
  ch: (s, m) => [
    // 나간다 = 그 자리에서 공연하지 않고, 페스티벌 달에 무대에 서는 일정으로 잡는다. (예전 세이브의 날짜 없는 섭외는 바로 공연)
    { t: '나간다', ok: s => trackOn(s, 'band') && !s.army && (m.d.festM == null || calM(s) <= m.d.festM), f: s => {
      const d = { from: m.from, fee: m.d.fee, mult: m.d.mult || 1, festM: m.d.festM };
      if (m.d.festM == null || m.d.festM <= calM(s)) { bandFestPlay(s, d); return `「${m.from}」 무대에 섰다.${d.fx}`; }
      queueEv(s, 'band_fest_play', Math.max(0, m.d.festM - calM(s)), d);
      return `「${m.from}」 ${m.d.festM + 1}월 무대에 서기로 했다.`;
    } },
    { t: '거절한다', f: s => `「${m.from}」 섭외를 거절했다.` },
  ],
};
// 페스티벌: 열리는 달(calM) · 규모(mult: 새로 반하는 관객 수에 곱함) · 섭외가 올 만한 밴드 팬 수
const BAND_FESTS = [
  { n: '숲속 뮤직 캠프', m: 5, mult: 0.8, minF: 1500 },
  { n: '바다 음악축제', m: 6, mult: 1.2, minF: 3000 },
  { n: '한여름 록 페스티벌', m: 7, mult: 2.0, minF: 1e4 },
  { n: '도시의 밤 페스티벌', m: 8, mult: 1.5, minF: 5000 },
];
// 페스티벌 무대 (v117 밸런스 C1): 관객 대부분이 아직 우리 팬이 아니라서, 기존 팬 반응 없이 새로 반한 사람만 센다 (최소 100명)
function bandFestPlay(s, d) {
  const t = s.tracks.band, sc = U.clamp(bandPower(s, t) + U.normal(0, 8) + 20, 0, 100);
  const g = Math.max(100, Math.round(Math.pow(10, sc / 18) * (d.mult || 1) * Math.max(0, 1 - t.b.f / starCap(60, 'kr'))));
  t.b.f += g;
  // 정산서 (v118 UI C2): 소속사가 있으면 회사 몫을 떼고, 멤버끼리 나눈다
  d.pay = Math.round(t.st === 'signed' ? bandIncome(s, t, d.fee, '페스티벌 출연료') : billPay(s, { rev: d.fee, n: bandMembers(s, t).length + 1, team: '밴드', what: '페스티벌 출연료', job: 'band' }).share) || 0;
  d.bill = Object.assign({}, s.bills['페스티벌 출연료'], { t: `「${d.from}」 출연료` });
  for (const x of bandMembers(s, t)) bond(s, x, 3);
  // 밴드 팬과 내 팬을 둘 다 보여 준다 (v118 UI C3)
  const my = Math.round(g * 0.35);
  s.fans.kr += my;
  d.sc = sc; d.g = g; d.my = my;
  // 무대 창 (12-3): 페스티벌. 객석 대부분이 우리를 처음 본다 (nw). 객석 크기는 페스티벌 크기만큼
  d.live = bandLive(s, t, { vn: 'fest', place: d.from, t: '', sc, nw: t.b.f < 5e4, z: { q: (sc - 60) / 15, fans: t.b.f >= 5e4 ? 1 : 0.5 } });
  d.say = sc >= 80 ? '객석이 떠나갈 듯했다.' : sc >= 60 ? '반응이 좋았다.' : '반응이 미지근했다.';
  d.fx = ` ${d.say} (밴드 팬 ${sgnFans(g)} · 내 팬 +${fmtFans(my)} · 정산 ${fmtWon(d.pay)})`;
}
E({
  id: 'band_fest_play', cat: '밴드', title: (s, d) => `「${d.from}」 무대`, tag: 'career', keepPop: s => true,
  live: (s, d) => d.cancel ? null : d.live,
  init(s, d) { if (!trackOn(s, 'band') || s.army || !s.tracks.band.b) { d.cancel = true; return; } bandFestPlay(s, d); },
  html: (s, d) => d.bill && typeof billBtnHTML === 'function' ? cardText(s, d) + billBtnHTML(d.bill) + (d.live && typeof liveBtnHTML === 'function' ? ' ' + liveBtnHTML(d.live) : '') : '',
  text: (s, d) => d.cancel ? `밴드가 활동을 쉬게 되어 「${d.from}」 무대에 서지 못했다. 주최 측에 출연 취소를 알렸다.`
    : `「${d.from}」 무대에 섰다. ${d.sc >= 80 ? evG(d.say || '') : d.sc < 60 ? evB(d.say || '') : d.say || ''}\n\n밴드 팬 ${sgnFans(d.g)} · 내 팬 +${fmtFans(d.my || 0)}${d.pay != null ? ` · 정산 ${fmtWon(d.pay)}` : ''}${d.bill && d.bill.note ? `\n\n${d.bill.note}` : ''}`,
  ch: (s, d) => [{ t: '확인', f: () => d.cancel ? `「${d.from}」 출연을 취소했다.` : `「${d.from}」 무대에 섰다.${d.fx}` }],
});
E({
  id: 'band_leave', cat: '밴드', title: '멤버가 나가겠다고 한다', tag: 'career',
  cond: s => trackOn(s, 'band') && bandMembers(s, s.tracks.band).length > 0,
  init(s, d) { const t = s.tracks.band; const m = bandMembers(s, t).sort((a, b) => a.aff - b.aff)[0]; d.id = m.id; d.k = t.b.part[m.id]; },
  text: (s, d) => { const m = s.people[d.id]; return `${partN(d.k)} ${josa(m.name, '이가')} 밴드를 나가겠다고 한다. ${m.aff < 35 ? '요즘 사이가 좋지 않았다.' : '먹고살 길을 찾아야 한다고 한다.'}`; },
  ch(s, d) {
    const m = s.people[d.id], t = s.tracks.band;
    const p = U.clamp(0.2 + m.aff / 150 + (s.rep - 50) / 200, 0.1, 0.8);
    // 나간 자리는 자동으로 채워지지 않는다. 진로 창에서 다시 구해야 한다
    const leave = s => { t.b.members = t.b.members.filter(x => x !== d.id); delete t.b.part[d.id]; m.rel = '전 멤버'; twAdd(t.b, -10); return `${josa(m.name, '이가')} 밴드를 나갔다. ${partN(d.k)} 자리가 비었다.${BAND_NEED.includes(d.k) ? ' 새 멤버를 구하기 전까지는 공연이 예전 같지 않고, 새 곡도 낼 수 없다.' : ''}`; };
    return [
      { t: '붙잡는다', h: `남아 줄 가능성 ${fmtPct(p)}`, f: s => { if (U.chance(p)) { bond(s, m, 10); return `${josa(m.name, '이가')} 조금 더 해 보기로 했다.`; } return '붙잡지 못했다. ' + leave(s); } },
      { t: '보내 준다', h: '진로 창에서 새 멤버를 구해야 한다', f: s => leave(s) },
    ];
  },
});
E({
  id: 'band_contract', cat: '밴드', title: '밴드 계약 만료', tag: 'career',
  cond: s => s.tracks.band.st === 'signed',
  text: s => { const t = s.tracks.band; return `밴드 ${josa(`「${t.b.name}」`, '과와')} ${t.agN}의 계약이 끝났다. 밴드 팬 ${fmtFans(t.b.f)}.${t.debt > 0 ? ` 아직 갚을 비용이 ${fmtWon(t.debt)} 남아 있다.` : ''}`; },
  // 재계약 조건 숫자와 남은 빚 (v118 UI C5): 솔로 재계약처럼 회사 몫 % · 계약 끝나는 달을 보여 준다
  ch: s => {
    const t = s.tracks.band, nc = Math.max(0.25, t.cut - 0.1), end = ymLater(s, 48);
    return [
      { t: '재계약한다', h: `회사 몫 ${pctN(t.cut)} → ${pctN(nc)} · 4년 (${end}까지)${t.debt > 0 ? ` · 남은 빚 ${fmtWon(t.debt)}은 정산에서 갚는다` : ''}`, f: s => { const c0 = t.cut; t.cm = 0; t.contract = 48; t.cut = nc; return `${josa(t.agN, '과와')} 재계약했다. 회사 몫 ${pctN(c0)} → ${pctN(nc)}, 계약 ${end}까지.`; } },
      { t: '회사를 나와 다시 인디로', h: t.debt > 0 ? `남은 빚 ${fmtWon(t.debt)}은 갚지 않는다` : '', f: s => { const ag = t.agN; t.st = 'indie'; t.ag = null; t.agN = ''; t.tier = 0; t.cut = 0; t.debt = 0; return `${josa(ag, '을를')} 나와 다시 인디 밴드가 됐다.`; } },
    ];
  },
});

// ════════ 솔로 가수 (보컬형·래퍼형·퍼포먼스형) ════════
// v94: 보컬형은 보컬(강함) · 댄스(보통), 래퍼형은 랩(강함) · 댄스(보통), 퍼포먼스형은 댄스(강함) · 노래 · 랩 중 잘하는 쪽(보통). 셋 다 외모(보통)
// 0.85배: 오디션 · 신곡 점수 크기가 예전과 비슷하게
function soloScore(s, type) { const p = me(s); return 0.85 * jobMix(type === 'rap' ? [[lv(p, 'rap'), JS_], [lv(p, 'dance'), JM_]] : type === 'perf' ? [[lv(p, 'dance'), JS_], [Math.max(lv(p, 'vocal'), lv(p, 'rap')), JM_]] : [[lv(p, 'vocal'), JS_], [lv(p, 'dance'), JM_]]) + talB(p.tal.looks, false); }
// 솔로 가수 종류: [종류, 이름, 고를 때 이름]. 퍼포먼스형은 춤에 노래나 랩 하나가 있어야 한다
const SOLO_TYPES = [['vocal', '보컬형', '보컬형 (노래)'], ['rap', '래퍼형', '래퍼형 (랩)'], ['perf', '퍼포먼스형', '퍼포먼스형 (춤과 노래·랩)']];
function soloTypeOK(s, type) { const p = me(s); return type === 'perf' ? has(p, 'dance') && (has(p, 'vocal') || has(p, 'rap')) : has(p, type); }
// 지금 실력으로 가장 점수가 잘 나오는 종류 (그룹에서 솔로로 나설 때 회사가 정한다)
function bestSoloType(s) { return SOLO_TYPES.map(x => x[0]).filter(k => soloTypeOK(s, k)).sort((a, b) => soloScore(s, b) - soloScore(s, a))[0] || 'vocal'; }
// 퍼포먼스형이 무대에서 함께 쓰는 노래·랩 (둘 중 잘하는 쪽)
function perfVoice(p) { return lv(p, 'rap') > lv(p, 'vocal') ? 'rap' : 'vocal'; }
// 솔로 신곡의 음반·음원 판매 정산: 팬 중 사는 비율(최소~최대), 차트 순위 한 칸당 음원 수익
const SOLO_SALE = { lo: 0.017, hi: 0.027, chart: 60e4 };
function soloMain(t) { return t.type === 'rap' ? 'rap' : t.type === 'perf' ? 'dance' : 'vocal'; }
function soloTypeN(type) { return type === 'rap' ? '래퍼' : type === 'perf' ? '퍼포머' : '보컬'; }
function soloBlock(s) {
  const a = age(s);
  if (s.army) return '군 복무 중';
  if (artistContractWhy(s) && !(s.tracks.idol.st === 'active')) return artistContractWhy(s);
  if (a < 15) return '15세부터 지원할 수 있다';
  if (!has(me(s), 'vocal') && !has(me(s), 'rap')) return '노래나 랩을 할 줄 알아야 한다';
  return '';
}
for (const ag of musicAgencies()) JOB_APPLY.push({
  id: 'solo_' + ag.id, trk: 'solo', g: '🎙️ 솔로 가수', get n() { return `${ag.n} 솔로 오디션`; }, tag: TIER_N[ag.tier],
  show: s => (!trackOn(s, 'solo') || s.tracks.solo.st === 'indie') && age(s) >= 14 && age(s) <= 32,
  h: s => SOLO_TYPES.filter(([k]) => soloTypeOK(s, k)).map(([k, n]) => `${n} ${fmtPct(audP(soloScore(s, k) + pm(s, 'audition', 0) + (age(s) <= 22 ? 2 : -3), ag.thr - 4))}`).concat(['결과는 다음 달']).join(' · '),
  ok: s => !soloBlock(s) && !agencyContract(s) && age(s) <= 30 && !(s.cd['saud_' + ag.id] > s.t) && langOK(s, ag) && !hasQ(s, 'solo_aud'),
  why: s => soloBlock(s) || contractWhy(s) || (age(s) > 30 ? '솔로 오디션은 30세까지만 볼 수 있다' : s.cd['saud_' + ag.id] > s.t ? '같은 회사는 1년 뒤에 다시 볼 수 있다' : hasQ(s, 'solo_aud') ? '다른 오디션 결과를 기다리는 중' : langWhy(ag)),
  run: s => { fireEvent(s, 'solo_pick', { ag: ag.id }); return ''; },
});
JOB_APPLY.push({
  id: 'solo_indie', trk: 'solo', g: '🎙️ 솔로 가수', n: '인디 가수로 시작하기', show: s => !trackOn(s, 'solo'),
  h: s => '버스킹과 공연으로 혼자 팬을 모은다 · 곡을 낼 때 제작비는 내 돈으로 낸다 · 이름이 알려지면 기획사에서 연락이 온다',
  ok: s => !soloBlock(s) && !artistContract(s) && Math.max(lv(me(s), 'vocal'), lv(me(s), 'rap')) >= 12,
  why: s => soloBlock(s) || artistContractWhy(s) || '보컬이나 랩이 12레벨 이상이어야 한다',
  run: s => { fireEvent(s, 'solo_pick', { indie: true }); return ''; },
});
E({
  id: 'solo_pick', cat: '솔로 가수', title: '어떤 가수가 될까?', tag: 'career',
  text: (s, d) => d.indie ? '혼자 무대에 서 보자. 노래로 갈까, 랩으로 갈까, 춤과 무대로 갈까?' : `${AG[d.ag].n} 솔로 오디션. 무엇으로 오디션을 볼까?`,
  ch(s, d) {
    const p = me(s), ag = d.ag ? AG[d.ag] : null;
    return SOLO_TYPES.filter(([type]) => soloTypeOK(s, type)).map(([type, , n]) => { const k = type === 'perf' ? 'dance' : type;
      const pp = ag ? audP(soloScore(s, type) + pm(s, 'audition', 0) + (age(s) <= 22 ? 2 : -3), ag.thr - 4) : 0;
      return { t: n, h: `${SKILLS[k].n} ${lvi(p, k)}레벨` + (type === 'perf' ? ` · ${SKILLS[perfVoice(p)].n} ${lvi(p, perfVoice(p))}레벨` : '') + (ag ? ` · 합격 가능성 ${fmtPct(pp)}` : ''), f: s => {
        if (d.indie) { const old = s.tracks.solo; s.tracks.solo = { st: 'indie', type, months: 0, rel: old.rel || 0, nextRel: 3, bestPeak: old.bestPeak || null, yearBest: 0, mkt: 'kr', cut: 0, tier: 0, sn: old.sn, hist: old.hist || [] }; milestone(s, `${age(s)}세에 인디 ${soloTypeN(type)}${josa(soloTypeN(type), '으로').slice(soloTypeN(type).length)} 활동을 시작했다.`); return `인디 ${soloTypeN(type)}${josa(soloTypeN(type), '으로').slice(soloTypeN(type).length)} 활동을 시작했다. 일정에 '가수 활동'을 넣어야 공연을 한다.`; }
        s.cd['saud_' + d.ag] = s.t + 12; queueEv(s, 'solo_aud', 1, { ag: d.ag, p: pp, type }); return `${ag.n} 솔로 오디션을 ${josa(type === 'rap' ? '랩' : type === 'perf' ? '퍼포먼스' : '노래', '으로')} 봤다.`;
      } };
    }).concat([{ t: '그만둔다', f: () => '다음에 하기로 했다.' }]);
  },
});
function startSoloSigned(s, agId, o = {}) {
  const ag = AG[agId], old = s.tracks.solo;
  const type = o.type || old.type || bestSoloType(s);
  s.tracks.solo = { st: 'signed', type, ag: agId, agN: ag.n, tier: ag.tier, cut: o.cut || ag.cut, mkt: ag.mkt, months: 0, contract: o.months || 60, rel: old.rel || 0, nextRel: 2, bestPeak: old.bestPeak || null, yearBest: 0, sn: old.sn || s.tracks.idol.sn, hist: old.hist || [], withGroup: !!o.withGroup };
  milestone(s, `${age(s)}세에 ${josa(ag.n, '과와')} 솔로 ${soloTypeN(type)} 계약을 했다.`);
  askStageName(s, 'solo', ag.n);
  return `${josa(ag.n, '과와')} 솔로 ${soloTypeN(type)} 계약을 했다. (${yrs(o.months || 60)} · 회사 몫 ${pctN(s.tracks.solo.cut)})`;
}
NEGO.solo = {
  what: d => `솔로 ${soloTypeN(d.type)} 전속 계약이다. 회사가 곡과 홍보, 제작비를 맡는다.`,
  block: s => agencyContract(s) ? contractWhy(s) : '',
  sign: (s, d) => { if (d.bonus) earn(s, d.bonus, '전속 계약금', 'solo'); return startSoloSigned(s, d.ag, { type: d.type, months: d.months, cut: d.cut }); },
  refuse: (s, d) => `${d.agN}의 계약 제안을 거절했다.`,
};
// 솔로 계약을 맺을 때 쓰는 협상 시작 (오디션 합격·오디션 프로그램·영입 제안)
function soloNego(s, agId, type, lev, extra) { const ag = AG[agId]; return startNego(s, Object.assign({ kind: 'solo', ag: agId, agN: ag.n, type, months: 60, cut: ag.cut, lev }, extra || {})); }
E({
  id: 'solo_aud', cat: '오디션', title: '솔로 오디션 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); },
  text: (s, d) => d.pass ? `${AG[d.ag].n}에서 솔로 ${soloTypeN(d.type)}${josa(soloTypeN(d.type), '으로').slice(soloTypeN(d.type).length)} 계약하자는 연락이 왔다!` : `${AG[d.ag].n}에서 연락이 오지 않았다. 불합격이다.`,
  ch: (s, d) => d.pass ? [
    { t: '계약서를 받아 본다', ok: s => !agencyContract(s), h: agencyContract(s) ? contractWhy(s) : '정산 비율과 계약 기간을 협상할 수 있다', f: s => soloNego(s, d.ag, d.type, U.clamp((d.p - 0.5) * 0.9 + 0.3, 0.05, 0.8)) },
    { t: '거절한다', f: () => `${AG[d.ag].n}의 계약 제안을 거절했다.` },
  ] : [{ t: '다시 준비한다', f: s => `${AG[d.ag].n} 솔로 오디션에 떨어졌다.` + fx(s, { stress: 4 * pm(s, 'loseStress') }) }],
});
CAREERS.solo = {
  n: '솔로 가수', ic: '🎙️',
  desc: '혼자 무대에 서는 가수. 보컬형은 보컬, 래퍼형은 랩이 가장 중요하고 다음이 춤이다. 퍼포먼스형은 춤이 가장 중요하고 다음이 노래·랩 중 잘하는 쪽이다. 외모도 조금 본다. 인디로 시작하거나 기획사와 계약한다.',
  act: { n: '가수 활동 (공연·녹음)', ic: '🎙️', g: '직업 활동', eff: [['노래·랩', '↑↑', 1], ['팬', '↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) {
    if (t.st === 'ended' || t.st === 'none') return t.endNote || '';
    return `${t.st === 'indie' ? ownCoTag(s, 'solo') || '인디' : `${t.agN} 소속`} 솔로 ${soloTypeN(t.type)} · 발표곡 ${t.rel}곡` + (t.bestPeak ? ` · 최고 ${t.bestPeak}위` : '') + (t.alb || t.nextRel > 12 || musRelQ(s, 'solo') ? ' · 신곡 준비 중' : t.nextRel > 0 ? ` · 다음 곡까지 ${t.nextRel}개월` : '');
  },
  short(s, t) { return `${t.st === 'indie' && !ownCo(s, 'solo') ? '인디 ' : ''}${soloTypeN(t.type)} ${actName(s, 'solo')}`; },
  seg(s, t) { return `${t.st === 'indie' ? (ownCo(s, 'solo') ? `「${ownCo(s, 'solo').name}」 소속` : '인디') : t.agN + ' 소속'} 솔로 ${soloTypeN(t.type)}`; },
  title(s, t) { return t.rel ? (t.bestPeak && t.bestPeak <= 10 ? `히트곡을 남긴 ${soloTypeN(t.type)}` : `솔로 ${soloTypeN(t.type)}`) : null; },
  contract(s, t) { return t.st === 'signed' && !t.withGroup ? t.agN : ''; },
  cLeft(s, t) { return t.st === 'signed' && !t.withGroup ? t.contract - t.months : null; },
  mainSk(s, t) { return soloMain(t); },
  info(s, t) {
    const p = me(s), R = [];
    R.push(['소속', t.st === 'signed' ? `${t.agN} (${TIER_N[t.tier]} 기획사) · 회사 몫 ${pctN(t.cut)}${t.withGroup ? ' · 그룹 활동과 함께' : ''}` : '인디 (제작비는 내 돈)']);
    R.push(['내 실력', [soloMain(t)].concat(t.type === 'perf' ? [perfVoice(p)] : []).concat(['compose', 'lyric', 'variety']).filter(k => has(p, k)).map(k => `${SKILLS[k].n} ${lvi(p, k)}`).join(' · ')]);
    R.push(['팬', MK.filter(m => s.fans[m]).map(m => `${MK_N[m]} ${fmtFans(s.fans[m])}`).join(' · ') || '0명']);
    R.push(['발표곡', `${t.rel}곡${t.bestPeak ? ` · 최고 ${t.bestPeak}위` : ''}`]);
    if (t.alb) R.push(['이번 신곡', t.alb.at != null ? `${albStageW(s, t.alb)}${t.alb.mk ? ` · ${t.alb.mk.boss}` : ''}` : '실을 곡을 정할 차례']);
    { const pr = typeof projInfoRow === 'function' && projInfoRow(s, t); if (pr) R.push(pr); }
    return R;
  },
  actions(s, t) {
    if (t.st === 'indie') return [{ t: '가수 활동 그만두기', ok: true, danger: true, confirm: '정말 가수 활동을 그만둘까요?', run: s => { t.st = 'ended'; t.endNote = `인디 ${soloTypeN(t.type)} 활동 종료`; t.hist.push(t.endNote); return '가수 활동을 그만뒀다.'; } }];
    if (t.st === 'signed' && !t.withGroup) { const pen = Math.max(1000e4, (t.contract - t.months) * 100e4 * t.tier); return songSubActs(s, t).concat([{ t: '회사와 계약 해지', h: `계약이 ${Math.max(0, t.contract - t.months)}개월 남았다 · 위약금 ${fmtWon(pen)} · 해지하면 인디 가수로 활동한다`, ok: true, danger: true, confirm: `${josa(t.agN, '과와')}의 계약을 해지할까요? 위약금 ${fmtWon(pen)}을 물어야 해요.`, run: s => { s.debt += pen; const n = t.agN; t.hist.push(`${n} (계약 해지)`); t.st = 'indie'; t.ag = null; t.agN = ''; t.cut = 0; t.tier = 0; t.nextRel = 3; s.cd.agOffer = s.t + 12; return `${josa(n, '과와')}의 솔로 계약을 해지했다. 이제 인디로 활동한다.` + fx(s, { rep: -5 }); } }]); }
    return t.st === 'signed' ? songSubActs(s, t) : [];
  },
  monthly(s, t) {
    if (t.st !== 'indie' && t.st !== 'signed') return;
    t.months++;
    if (calM(s) === 11) musicAwards(s, t, actName(s, 'solo'), musicRookie(s, t.rel > 0), 'solo');
    if (t.withGroup && s.tracks.idol.st !== 'active') t.withGroup = false;
    // 45세가 넘으면 인기가 꾸준히 떨어진다 (한 살 많을수록 더)
    if (age(s) > 45) { const fd = 1 - Math.min(0.02, (age(s) - 45) * 0.004); MK.forEach(m => { s.fans[m] = Math.round(s.fans[m] * fd); }); jpopAdd(s, 'solo', -0.1); if (!t.oldTold) { t.oldTold = true; addLog(s, '마흔다섯을 넘기자 요즘 노래 반응이 예전 같지 않다.', 'career'); } }
    const n = slotsOn(s, 'c_solo'), p = me(s), mk = t.mkt || 'kr';
    if (t.st === 'signed' && t.months >= t.contract && !t.withGroup) queueEv(s, 'solo_contract', 0);
    if (!n && t.st !== 'signed') return;
    // 공연·녹음으로 노래(랩)가 빨리 늘고, 래퍼는 가사도 쓴다
    if (n) { practice(s, p, soloMain(t), 1.3 * n, 1); if (t.type === 'rap') useSkill(s, p, 'lyric', 0.5 * n); if (t.type === 'perf') useSkill(s, p, perfVoice(p), 0.5 * n); useSkill(s, p, 'variety', 0.2 * n); }
    const perf = soloScore(s, t.type);
    const g = Math.max(0, Math.round((perf - 6) * U.fl(1.5, 4) * (1 + Math.log10(1 + s.fans[mk]) / 3) * (t.st === 'signed' ? 1.4 + t.tier * 0.2 : 1) * access(s) * Math.max(0.6, n) * popSpeed(s) * myRoom(s, mk)));
    s.fans[mk] += g;
    if (s.fans[mk] >= 1500) earn(s, Math.round((Math.max(0, s.fans[mk] - 5000) * 22 + Math.min(s.fans[mk], 5000) * 8) * (1 - t.cut) * awMul(s, 'solo')), '공연·행사');
    addStress(s, 2 * pm(s, 'crowdStress'));
    if (!(s.tracks.idol.st === 'active' && s.tracks.idol.promo > 0)) t.nextRel--;
    musAlbMonth(s, 'solo'); // v154: 인디는 신곡 기획 창, 회사 소속은 신곡 회의
    if (t.st === 'signed' && !t.withGroup && typeof projMonth === 'function') projMonth(s, 'solo', t);
    if (t.st === 'indie' && s.fans.kr >= 8000 && U.chance(0.04)) maybeScout(s, 'solo');
    if (!t.jp && lv(p, 'jp') >= 25 && s.fans.kr >= 3e4 && U.chance(0.02)) queueEv(s, 'solo_jp', 0);
    if (!t.us && lv(p, 'en') >= 32 && totalFans(s) >= 5e5 && U.chance(0.015)) queueEv(s, 'solo_us', 0);
  },
};
// 새 곡: 자작곡, 가사만 직접 쓰기(래퍼), 남의 곡 받기
E({
  id: 'solo_rel', cat: '신곡', title: '솔로 신곡 준비', tag: 'career',
  cond: s => s.tracks.solo.st === 'indie' || s.tracks.solo.st === 'signed',
  init(s, d) { d.title = songTitle(); },
  text: s => { const t = s.tracks.solo, p = me(s); return `솔로 가수로 새 노래를 낼 때가 됐다. 어떤 곡으로 갈까?\n\n${SKILLS[soloMain(t)].n} ${lvi(p, soloMain(t))}레벨 · 작곡 ${has(p, 'compose') ? lvi(p, 'compose') + '레벨' : '못 함'} · 작사 ${has(p, 'lyric') ? lvi(p, 'lyric') + '레벨' : '못 함'} · 요즘 유행 '${s.trend}'` + (t.st === 'signed' ? `\n${josa(t.agN, '이가')} 제작비를 댄다.` : ownCo(s, 'solo') ? `\n내 회사 ${josa(`「${ownCo(s, 'solo').name}」`, '이가')} 제작비를 대고, 수익도 회사로 들어간다.` : '\n인디라서 제작비는 내 돈으로 낸다.'); },
  ch(s, d) {
    const t = s.tracks.solo, signed = t.st === 'signed', p = me(s);
    const selfCost = signed ? 0 : 50e4, buyCost = signed ? 0 : 300e4;
    const go = (q, self, lyr, msg) => s => { queueEv(s, 'solo_relres', 1, { q, self, lyr, title: d.title }); if (!t.sn) askStageName(s, 'solo'); return msg; };
    const o = [];
    if (lv(p, 'compose') >= 20) o.push({ t: '자작곡으로 낸다', h: `완성도는 작곡 실력에 달렸다 · 컨셉을 고른다 · 저작권료도 ${ownCo(s, 'solo') ? '회사' : '내'} 몫${selfCost ? ' · 제작비 ' + fmtWon(selfCost) : ''}`, ok: s => jobMoney(s, 'solo') >= selfCost, f: s => { if (selfCost) jobPay(s, selfCost, '음원 제작비', 'solo'); useSkill(s, p, 'compose', 2); pickConcept(s, { cb: 'soloT', title: d.title, what: '자작곡의', lyr: lv(p, 'lyric') >= 15 }); if (!t.sn) askStageName(s, 'solo'); return ''; } });
    if (t.type === 'rap' && lv(p, 'lyric') >= 15) o.push({ t: '비트를 받고 가사는 직접 쓴다', h: `가사는 작사 실력에 달렸다${buyCost ? ' · 비트값 ' + fmtWon(buyCost / 2) : ''}`, ok: s => jobMoney(s, 'solo') >= buyCost / 2, f: s => { if (buyCost) jobPay(s, buyCost / 2, '비트 구입비', 'solo'); useSkill(s, p, 'lyric', 2); askTitle(s, 'soloLyr', { title: d.title, what: '직접 가사를 쓴 신곡의', q: (boughtQ(t.tier) + lv(p, 'lyric')) / 2 + 3 }); if (!t.sn) askStageName(s, 'solo'); return ''; } });
    o.push({ t: signed ? '회사가 구해 온 곡으로 낸다' : '작곡가에게 곡을 사서 낸다', h: buyCost ? '곡값 ' + fmtWon(buyCost) : '곡 완성도는 회사 크기에 따라 다르다', ok: s => jobMoney(s, 'solo') >= buyCost, f: s => { if (buyCost) jobPay(s, buyCost, '곡 구입비', 'solo'); return go(boughtQ(t.tier || 1), false, false, `새 노래 「${d.title}」 녹음을 시작했다.`)(s); } });
    o.push({ t: '이번엔 넘긴다', h: '석 달 뒤에 다시', f: s => { t.nextRel = 3; return '신곡 발표를 미뤘다.'; } });
    return o;
  },
});
// 컨셉을 먼저 고르고 제목을 짓는다
SONG_CB.soloT = (s, d, c) => askTitle(s, 'soloSelf', { title: d.title, what: `'${c}' 컨셉 ${d.what}`, lyr: d.lyr, c });
TITLE_CB.soloSelf = (s, d) => d.c ? SONG_CB.solo(s, d, d.c) : (pickConcept(s, { cb: 'solo', what: `자작곡 「${d.title}」의`, title: d.title, lyr: d.lyr }), `자작곡 「${d.title}」 작업을 시작했다.`);
TITLE_CB.soloLyr = (s, d) => { queueEv(s, 'solo_relres', 1, { q: d.q, self: false, lyr: true, title: d.title }); return `직접 쓴 가사로 「${d.title}」 녹음을 시작했다.`; };
// 자작곡: 컨셉을 고르면 숙련도만큼 완성도가 달라지고, 그 컨셉 숙련도가 오른다
SONG_CB.solo = (s, d, c) => {
  const p = me(s), q = lv(p, 'compose') * 0.9 + U.normal(0, 5) + cmBonus(s, c);
  cmGain(s, c, 10);
  queueEv(s, 'solo_relres', 1, { q, self: true, lyr: d.lyr, title: d.title, c });
  return `'${c}' 컨셉으로 자작곡 ${josa(`「${d.title}」`, '을를')} 썼다.`;
};
E({
  id: 'solo_relres', cat: '음원 성적', title: '솔로 신곡 성적', tag: 'career',
  plio: (s, d) => typeof plioSong === 'function' ? plioSong(s, d, 'solo') : null,
  live: (s, d) => d.card && d.card.live,
  init(s, d) {
    const t = s.tracks.solo;
    if (t.st !== 'indie' && t.st !== 'signed') { d.skip = true; return; }
    const mk = t.mkt || 'kr', signed = t.st === 'signed', p = me(s);
    // 컨셉 궁합 (v97): 내 재능 · 나이 · 랩
    const cf = cFit(s, d.c, [p], stageYrs(s));
    const sc = songScore(s, { perf: cPerf(soloScore(s, t.type), cf), q: d.q, fans: totalFans(s), tier: signed ? t.tier : 0, trend: (d.tr = d.c ? d.c === s.trend : U.chance(0.3)), bonus: (d.self ? 3 : 0) + (p.tal.star - 50) * 0.12 + cScoreB(cf) });
    cNote(s, cf, d.title);
    // v167: 솔로도 아이돌처럼 음악방송에 나가 1위를 한다 (팬이 적으면 1위 횟수가 적다). 유행을 바꾸는 조건도 아이돌과 같다
    d.peak = chartFromScore(sc); d.wins = showWins(sc, totalFans(s)); d.ht = hitTrend(s, d.c, d.peak, d.wins);
    jpopWork(s, 'solo', sc);
    d.gain = Math.round(fanGain(s, sc, mk, signed ? 1.1 : 0.7) * myRoom(s, mk));
    s.fans[mk] = Math.max(0, s.fans[mk] + d.gain);
    if (mk === 'kr') s.fans.jp += Math.round(Math.max(0, d.gain) * 0.03);
    d.roy = addCatalog(s, d.title, t.type === 'rap' ? '랩' : '가창', sc, signed ? 0.6 : 1.0, 'solo') + (d.self ? addCatalog(s, d.title, '작곡', sc, 0.8, 'solo') : 0) + (d.lyr ? addCatalog(s, d.title, '작사', sc, 0.35, 'solo') : 0);
    // v154: 수록곡에 실린 내 곡 · 가사
    if (d.a) { const r = albRoyalty(s, d.a, sc, 'solo', true); d.roy += r.m; d.side = r.txt; }
    // 음반·음원 판매 정산: 팬 일부가 음반을 사고(아이돌 앨범보다 적게), 차트에 오르면 음원 수익이 붙는다. 소속이면 회사 몫을 뗀다
    const buyers = Math.round(totalFans(s) * U.fl(SOLO_SALE.lo, SOLO_SALE.hi));
    // 정산서 (v118 UI C2)
    const gross = buyers * 14000 + (d.peak ? (101 - d.peak) * SOLO_SALE.chart : 0);
    d.sale = 0;
    if (gross > 0) { const r = billPay(s, { rev: gross, cut: signed ? t.cut : 0, n: 1, what: '음반·음원 정산', job: 'solo', title: `「${d.title}」 음반 · 음원 정산` }); d.sale = Math.round(r.share); d.bill = r.bill; }
    t.rel++; musicRookie(s, true); t.nextRel = U.int(3, 6); t.alb = null; t.yearBest = Math.max(t.yearBest || 0, sc);
    if (d.peak && (!t.bestPeak || d.peak < t.bestPeak)) t.bestPeak = d.peak;
    // 발매 결과 카드 (v118 UI C1): 내 노래 · 랩 · 무대, 곡, 팬, 유행, 컨셉 궁합, 홍보
    const sp = soloScore(s, t.type), ty = t.type === 'rap' ? 'rap' : t.type === 'perf' ? 'perf' : 'vocal';
    const F = [{ z: (sp - 45) / 18, g: { vocal: ['목소리가 곡을 꽉 채운다', '노래 실력이 확실하다'], rap: ['랩이 귀에 꽂힌다', '플로우가 살아 있다'], perf: ['퍼포먼스가 눈을 못 떼게 한다', '무대 장악력이 대단하다'] }[ty], b: { vocal: ['노래가 곡을 다 못 받쳐 준다'], rap: ['랩이 조금 어설프다'], perf: ['무대가 아직 덜 여물었다'] }[ty] },
      RX.q(d.q), RX.fans(totalFans(s), d.gain), RX.trend(!!d.tr, d.ht), RX.cf(cScoreB(cf)), RX.promo(signed ? t.tier : 0)];
    d.card = songCardMake({ t: d.title, by: actName(s, 'solo'), peak: d.peak, wins: d.wins, fans: [['내 팬', d.gain]], pay: gross > 0 ? d.sale : null, bill: d.bill }, F, sc, t);
    if (d.mk) d.card.mk = d.mk;
    if (d.ht) hitTrendGo(s, d.c, d.title, actName(s, 'solo'));
    // 실시간 창 (12-1): 데뷔 무대 · 컴백 음악방송. v167: 1위 후보에 들면 1위 발표 장면도 (아이돌과 같다)
    d.card.live = liveStage({ k: 'solo', c: d.c, mic: 1, key: t.rel === 1 || d.wins > 0 || sc >= 66, place: t.rel === 1 ? '데뷔 무대' : '음악방송', t: d.title, g: actName(s, 'solo'), cn: actCall(s, 'solo'), mem: [[actCall(s, 'solo'), '']], mi: 0,
      z: { perf: F[0].z, q: F[1].z, fans: F[2].z, trend: F[3].z, cf: F[4].z, star: (p.tal.star - 50) / 25, me: F[0].z }, sc, wins: d.wins, cand: sc >= 66 ? 1 : 0, rv: sc >= 66 && !d.wins ? npcStageRival(s, actName(s, 'solo')) : '', debut: t.rel === 1 });
    addWork(s, { type: '싱글', title: d.title, by: actName(s, 'solo'), sc, pay: d.sale || 0, note: chartText(d.peak) + (d.wins ? ` · 음악방송 1위 ${d.wins}회` : '') + (d.self ? ' · 자작곡' : ''), card: d.card });
    if (t.rel === 1) milestone(s, `${age(s)}세에 첫 솔로곡 ${josa(`「${d.title}」`, '을를')} 냈다.`);
    if (d.peak && d.peak <= 10 && !t.hitMs) { t.hitMs = true; milestone(s, `${age(s)}세에 ${josa(`「${d.title}」`, '으로')} 음원 차트 ${d.peak}위에 올랐다.`); }
    d.sc = sc; d.cm = comments(sc, actNick(s, 'solo'));
  },
  html: (s, d) => d.card && typeof songCardHTML === 'function' ? cardText(s, d) + albBannerHTML(d.card.mk) + songCardHTML(d.card) : '',
  text: (s, d) => `「${d.title}」${d.self ? ` (자작곡${d.c ? ` · '${d.c}' 컨셉` : ''})` : d.w && d.c ? ` (작곡 ${d.w} · '${d.c}' 컨셉)` : ''} 성적이 나왔다.${d.side ? ` ${d.side}` : ''}${d.c && d.c === s.trend ? ' 요즘 유행하는 컨셉이다.' : ''}${d.card ? '' : `\n\n${chartText(d.peak)}${d.wins ? ` · 음악방송 1위 ${d.wins}회` : ''}\n팬 ${sgnFans(d.gain)}`}${d.sale ? `\n\n음반·음원 정산 ${fmtWon(d.sale)}` : ''}\n매달 들어올 음원·저작권 수익 약 ${fmtWon(d.roy)} (조금씩 줄어든다)${d.card ? '' : `\n\n반응: ${d.cm}`}`,
  ch: (s, d) => songCommentCh(s, d, `${josa(`「${d.title}」`, '을를')} 발표했다. ${chartText(d.peak)}${d.wins ? `, 음악방송 1위 ${d.wins}회` : ''}.`, 'solo'),
});
E({
  id: 'solo_contract', cat: '계약', title: '솔로 계약 만료', tag: 'career',
  cond: s => s.tracks.solo.st === 'signed',
  init(s, d) { d.stayCut = Math.round(Math.max(0.25, s.tracks.solo.cut - 0.1) * 100) / 100; },
  text: s => { const t = s.tracks.solo; return `${josa(t.agN, '과와')}의 솔로 계약이 끝났다. 발표곡 ${t.rel}곡, 팬 ${fmtFans(totalFans(s))}.\n\n회사를 나오면 이름이 알려진 만큼 다른 회사에서 연락이 올 수도 있다.${age(s) >= 45 ? ' 다만 나이가 있어서 회사도 재계약을 망설이는 눈치다.' : ''}`; },
  ch(s, d) {
    const t = s.tracks.solo;
    // 45세부터는 회사가 재계약을 망설인다 (한 살마다 받아 줄 가능성이 준다)
    const p = age(s) < 45 ? 1 : Math.max(0.15, 1 - (age(s) - 44) * 0.15);
    return [
      { t: `${josa(t.agN, '과와')} 재계약`, h: `회사 몫 ${Math.round(d.stayCut * 100)}%로 낮춰 준다 · 4년${p < 1 ? ` · 회사가 받아 줄 가능성 ${fmtPct(p)}` : ''}`, f: s => { if (!U.chance(p)) { t.hist.push(`${t.agN} (재계약 불발)`); t.st = 'indie'; t.ag = null; t.agN = ''; t.cut = 0; t.tier = 0; t.nextRel = 3; return '회사가 재계약을 거절했다. 이제 인디로 활동한다.' + fx(s, { stress: 6 }); } t.months = 0; t.contract = 48; t.cut = d.stayCut; return `${josa(t.agN, '과와')} 재계약했다.`; } },
      { t: '회사를 나와 인디로 활동한다', f: s => { t.hist.push(`${t.agN} (계약 만료)`); t.st = 'indie'; t.ag = null; t.agN = ''; t.cut = 0; t.tier = 0; t.nextRel = 3; s.cd.agOffer = s.t + 2; return '회사를 나와 혼자 음악을 하기로 했다.'; } },
    ];
  },
});
E({
  id: 'solo_jp', cat: '해외 진출', title: '일본 투어 제안', tag: 'career',
  cond: s => trackOn(s, 'solo'),
  text: s => `일본 공연 기획사에서 소극장 투어를 해 보자는 연락이 왔다. 일본어는 ${lvi(me(s), 'jp')}레벨.`,
  ch: () => [
    { t: '일본 투어를 간다', f: s => { s.tracks.solo.jp = true; const add = Math.round((5000 + s.fans.kr * 0.1) * (0.5 + lv(me(s), 'jp') / 100)); earn(s, add * 3000, '일본 공연'); useSkill(s, me(s), 'jp', 2); milestone(s, `${age(s)}세에 일본 투어를 했다.`); return '일본 투어를 다녀왔다.' + fx(s, { fjp: add, stress: 6 }); } },
    { t: '거절한다', f: () => '일본 투어는 다음으로 미뤘다.' },
  ],
});
E({
  id: 'solo_us', cat: '해외 진출', title: '미국 레이블 제안', tag: 'career',
  cond: s => trackOn(s, 'solo'),
  text: s => `미국 레이블에서 영어 싱글을 내 보자고 한다. 영어는 ${lvi(me(s), 'en')}레벨.`,
  ch: () => [
    { t: '미국 싱글을 낸다', f: s => { s.tracks.solo.us = true; const add = Math.round((3e4 + totalFans(s) * 0.05) * (0.4 + lv(me(s), 'en') / 100)); useSkill(s, me(s), 'en', 2); milestone(s, `${age(s)}세에 미국 싱글을 냈다.`); return '미국 싱글을 냈다.' + fx(s, { fus: add, stress: 6 }); } },
    { t: '거절한다', f: () => '미국 진출 제안을 거절했다.' },
  ],
});
// 오디션 프로그램 (활동 지원): 노래로 겨루는 것과 랩으로 겨루는 것이 따로 있다
const TV_AUD = { vocal: ['별의 무대', '싱어 게이트', '보이스 로드', '노래의 탄생'], rap: ['라임 로드', '비트 위의 왕', '스트릿 마이크', '랩 그라운드'] };
function tvAudWhy(s, k) {
  if (s.army) return '군 복무 중';
  if (age(s) < 15 || age(s) > 32) return '15~32세만 나갈 수 있다';
  if (artistContract(s)) return artistContractWhy(s);
  if (s.cd['tvAud_' + k] > s.t) return '1년에 한 번만 나갈 수 있다';
  if (hasQ(s, 'tv_audres')) return '다른 오디션 프로그램 결과를 기다리는 중';
  if (lv(me(s), k) < 15) return `${SKILLS[k].n}${josa(SKILLS[k].n, '이가').slice(SKILLS[k].n.length)} 15레벨 이상이어야 한다`;
  return '';
}
for (const k of ['vocal', 'rap']) ACT_APPLY.push({
  id: 'tv_aud_' + k, cat: 'music', n: k === 'rap' ? '오디션 프로그램 (랩)' : '오디션 프로그램 (노래)', ic: '📺',
  h: s => `${k === 'rap' ? '랩' : '노래'} 실력으로 겨루는 방송이다. 높이 올라가면 팬이 크게 늘고 기획사에서 계약 제안이 온다 · 결과는 두 달 뒤 · 지금 ${SKILLS[k].n} ${has(me(s), k) ? lvi(me(s), k) + '레벨' : '못 함'}`,
  ok: s => !tvAudWhy(s, k), why: s => tvAudWhy(s, k),
  run: s => { const show = U.pick(TV_AUD[k]); s.cd['tvAud_' + k] = s.t + 12; queueEv(s, 'tv_audres', 2, { show, type: k }); return `오디션 프로그램 「${show}」에 ${josa(k === 'rap' ? '랩' : '노래', '으로')} 지원했다.` + fx(s, { stress: 5 }); },
});
// 예전 세이브에 남아 있을 수 있는 지원 창 (지금은 쓰지 않는다)
E({
  id: 'tv_aud', cat: '오디션 프로그램', title: '오디션 프로그램 지원', tag: 'career',
  init(s, d) { d.show = U.pick(TV_AUD.vocal); },
  text: (s, d) => `오디션 프로그램 「${d.show}」 참가자를 모집한다. 무엇으로 나갈까?\n\n무대 매너(예능)와 외모도 본다.`,
  ch: (s, d) => [['vocal', '노래로 나간다'], ['rap', '랩으로 나간다']].filter(([k]) => has(me(s), k)).map(([k, n]) => ({ t: n, h: `${SKILLS[k].n} ${lvi(me(s), k)}레벨`, f: s => { s.cd.tvAud = s.t + 12; queueEv(s, 'tv_audres', 2, { show: d.show, type: k }); return `「${d.show}」에 ${josa(k === 'rap' ? '랩' : '노래', '으로')} 지원했다.` + fx(s, { stress: 5 }); } })).concat([{ t: '그만둔다', f: () => '이번엔 나가지 않기로 했다.' }]),
});
E({
  id: 'tv_audres', cat: '오디션 프로그램', title: '오디션 프로그램 결과', tag: 'career',
  init(s, d) {
    const p = me(s);
    const sc = soloScore(s, d.type) + lv(p, 'variety') * 0.1 + (p.tal.star - 50) * 0.1 + pm(s, 'audition', 0) + U.normal(0, 6);
    d.res = sc >= 42 ? '우승' : sc >= 35 ? 'TOP 3' : sc >= 28 ? 'TOP 10' : sc >= 20 ? '중간 탈락' : '첫 회 탈락';
    d.fans = Math.round({ '우승': 250000, 'TOP 3': 120000, 'TOP 10': 40000, '중간 탈락': 6000, '첫 회 탈락': 400 }[d.res] * popSpeed(s));
    s.fans.kr += d.fans;
    useSkill(s, p, d.type, 3);
    d.ag = U.pick(musicAgencies().filter(a => a.mkt === 'kr' && a.tier >= (d.res === '우승' ? 2 : 1))).id;
  },
  text: (s, d) => `「${d.show}」 결과: ${d.res}.\n\n방송 덕분에 팬이 ${fmtFans(d.fans)} 늘었다.` + (d.res === '우승' || d.res === 'TOP 3' ? `\n\n${AG[d.ag].n}에서 솔로 ${soloTypeN(d.type)} 계약을 제안했다.` : ''),
  ch(s, d) {
    const after = s => milestone(s, `${age(s)}세에 오디션 프로그램 「${d.show}」에서 ${d.res}${josa(d.res, '을를').slice(d.res.length)} 했다.`);
    if ((d.res === '우승' || d.res === 'TOP 3') && !artistContract(s)) return [
      { t: '계약 조건을 들어 본다', h: '정산 비율과 계약 기간을 협상할 수 있다', f: s => { after(s); if (d.res === '우승') earn(s, 1e8, '오디션 우승 상금'); soloNego(s, d.ag, d.type, d.res === '우승' ? 0.75 : 0.5); return `「${d.show}」 ${d.res}.`; } },
      { t: '거절한다', f: s => { after(s); if (d.res === '우승') earn(s, 1e8, '오디션 우승 상금'); return `「${d.show}」 ${d.res}. 계약 제안은 거절했다.`; } },
    ];
    return [{ t: '확인', f: s => { after(s); return `「${d.show}」 ${d.res}.` + fx(s, { stress: d.fans >= 3e4 ? -6 : 5 }); } }];
  },
});

// 가면을 쓰고 노래로만 겨루는 프로그램 (활동 지원). 이미 이름이 알려진 사람이 스스로 나간다
const MASK_SHOWS = ['얼굴 없는 무대', '가면 속 목소리', '목소리만 들려요', '가면 뒤의 가수', '정체를 밝혀라', '숨은 목소리 찾기'];
const MASKS = ['해바라기', '고양이 집사', '달빛 토끼', '붉은 장미', '눈사람', '등대지기', '종이비행기', '꿀벌 기사', '구름 위 산책'];
function maskWhy(s) {
  const p = me(s);
  if (s.army) return '군 복무 중';
  if (age(s) < 16) return '16세부터 나갈 수 있다';
  if (totalFans(s) < 5000) return '이름이 어느 정도 알려진 사람만 섭외한다 (팬 5천 명 이상)';
  if (lv(p, 'vocal') < 20) return '보컬이 20레벨 이상이어야 한다';
  if (s.cd.mask > s.t) return '1년에 한 번만 나갈 수 있다';
  if (hasQ(s, 'mask_res')) return '방송을 기다리는 중이다';
  return '';
}
ACT_APPLY.push({
  id: 'mask', cat: 'music', n: '가면 쓰고 노래하는 대결 프로그램', ic: '🎭',
  h: s => '정체를 숨기고 노래 실력으로만 겨룬다. 오래 살아남을수록, 정체가 뜻밖일수록 화제가 된다 · 방송은 두 달 뒤',
  ok: s => !maskWhy(s), why: s => maskWhy(s),
  run: s => { const show = U.pick(MASK_SHOWS), mask = U.pick(MASKS); s.cd.mask = s.t + 12; queueEv(s, 'mask_res', 2, { show, mask }); useSkill(s, me(s), 'vocal', 1); return `「${show}」에 나가기로 했다. 가면은 '${mask}'.`; },
});
E({
  id: 'mask_res', cat: '활동 지원', title: s => '가면을 벗는 순간', tag: 'career',
  init(s, d) {
    const p = me(s);
    const sc = lv(p, 'vocal') * 0.8 + lv(p, 'variety') * 0.1 + U.normal(0, 6);
    d.round = sc >= 52 ? 5 : sc >= 44 ? 4 : sc >= 36 ? 3 : sc >= 28 ? 2 : 1;
    // 노래로 알려진 사람이 아닐수록 정체가 공개될 때 더 놀란다
    const singer = ['idol', 'solo', 'band'].some(id => trackOn(s, id));
    d.surprise = !singer;
    const base = [0, 800, 2500, 6000, 15000, 40000][d.round] * (d.surprise ? 1.6 : 1) * (0.6 + Math.log10(1 + totalFans(s)) / 8);
    d.fans = Math.round(base * popSpeed(s) * myRoom(s, 'kr'));
    s.fans.kr += d.fans;
    useSkill(s, p, 'vocal', d.round);
    if (d.round === 5) milestone(s, `${age(s)}세에 「${d.show}」에서 최종 우승을 차지했다.`);
  },
  text: (s, d) => `「${d.show}」 방송. '${d.mask}' 가면을 쓰고 무대에 섰다.\n\n${d.round === 5 ? '끝까지 살아남아 왕좌에 올랐다! 몇 주 동안 가면을 지켰다.' : `${d.round}라운드에서 떨어졌다.`} 가면을 벗자 ${d.surprise ? '객석이 술렁였다. 노래를 이렇게 잘하는 줄 아무도 몰랐다.' : '반가운 탄성이 터졌다.'}\n\n새 팬 ${fmtFans(d.fans)}`,
  ch: (s, d) => [{ t: '확인', f: s => `「${d.show}」에 '${d.mask}' 가면을 쓰고 나갔다. ${d.round === 5 ? '최종 우승!' : `${d.round}라운드 탈락.`}` + fx(s, { pop: d.round >= 3 ? 3 : 1, fame: d.round >= 3 ? 4 : 1, stress: d.round >= 3 ? -5 : -1 }) }],
});

// ════════ 솔로 뮤지션 (연주가) ════════
// 악기 하나로 활동한다. 공연, 연주 앨범, 다른 가수의 녹음에 세션으로 참여하기
const INSTS = ['guitar', 'bass', 'piano', 'keyboard', 'drum'];
function playerBlock(s) {
  if (s.army) return '군 복무 중';
  if (age(s) < 14) return '14세부터 할 수 있다';
  if (!INSTS.some(k => lv(me(s), k) >= 15)) return '악기 하나는 15레벨 이상이어야 한다';
  return '';
}
JOB_APPLY.push({
  id: 'player_start', trk: 'player', g: '🎹 솔로 뮤지션 (연주가)', n: '연주가로 활동 시작', show: s => !trackOn(s, 'player'),
  h: s => '악기 하나로 공연하고 연주 앨범을 낸다 · 실력이 쌓이면 다른 가수의 녹음 세션 의뢰가 메시지함으로 온다',
  ok: s => !playerBlock(s), why: s => playerBlock(s),
  run: s => { fireEvent(s, 'player_pick', {}); return ''; },
});
E({
  id: 'player_pick', cat: '연주가', title: '어떤 악기로 활동할까?', tag: 'career',
  text: () => '연주가로 무대에 서 보자. 어떤 악기로 활동할까?',
  ch: s => INSTS.filter(k => lv(me(s), k) >= 15).map(k => ({ t: `${SKILLS[k].n} (${lvi(me(s), k)}레벨)`, f: s => { const old = s.tracks.player; s.tracks.player = { st: 'active', inst: k, months: 0, rel: old.rel || 0, nextRel: U.int(6, 9), rep: old.rep || 5, sessions: old.sessions || 0, bestPeak: old.bestPeak || null, yearBest: 0, sn: old.sn, hist: old.hist || [] }; milestone(s, `${age(s)}세에 ${SKILLS[k].n} 연주가로 활동을 시작했다.`); return `${SKILLS[k].n} 연주가로 활동을 시작했다. 일정에 '연주 활동'을 넣어야 공연을 한다.`; } })).concat([{ t: '그만둔다', f: () => '다음에 하기로 했다.' }]),
});
CAREERS.player = {
  n: '솔로 뮤지션 (연주가)', ic: '🎹',
  desc: '악기 하나로 활동하는 연주가. 다른 가수의 녹음에 세션으로도 참여한다.',
  act: { n: '연주 활동 (공연·연습)', ic: '🎹', g: '직업 활동', eff: [['내 악기', '↑↑', 1], ['팬', '↑', 1], ['스트레스', '↑', 0]] },
  status(s, t) { if (t.st !== 'active') return t.endNote || ''; return `${SKILLS[t.inst].n} 연주가${ownCo(s, 'player') ? ` · ${ownCoTag(s, 'player')}` : ''} · 연주 앨범 ${t.rel}장 · 세션 ${t.sessions}번 · 업계 평판 ${Math.round(t.rep)}`; },
  short(s, t) { return `${SKILLS[t.inst].n} 연주가`; },
  title(s, t) { return t.rel || t.sessions ? `${SKILLS[t.inst].n} 연주가` : null; },
  mainSk(s, t) { return t.inst; },
  info(s, t) { const p = me(s); return [['내 실력', [t.inst, 'compose'].filter(k => has(p, k)).map(k => `${SKILLS[k].n} ${lvi(p, k)}`).join(' · ')], ['팬', fmtFans(totalFans(s))], ['연주 앨범', `${t.rel}장${t.bestPeak ? ` · 최고 ${t.bestPeak}위` : ''}`], ['세션 참여', `${t.sessions}번`], ['업계 평판', `${Math.round(t.rep)}`]]; },
  actions(s, t) { return t.st === 'active' ? [{ t: '연주가 활동 그만두기', ok: true, danger: true, confirm: '정말 연주가 활동을 그만둘까요?', run: s => { t.st = 'ended'; t.endNote = `${SKILLS[t.inst].n} 연주가 활동 종료`; t.hist.push(t.endNote); return '연주가 활동을 그만뒀다.'; } }] : []; },
  monthly(s, t) {
    if (t.st !== 'active') return;
    t.months++;
    if (calM(s) === 11) musicAwards(s, t, actName(s, 'player'), false, 'player');
    const n = slotsOn(s, 'c_player'), p = me(s);
    // 세션 의뢰는 실력과 평판이 쌓이면 일정과 상관없이 온다
    if (lv(p, t.inst) >= 25 && U.chance(0.02 + t.rep / 900) && !s.inbox.some(m => m.kind === 'session')) {
      const a = makeArtist(s, t.rep);
      sendMsg(s, 'session', { from: `${a.name} 앨범 제작팀`, title: `${SKILLS[t.inst].n} 세션 의뢰`, months: 6, d: { a, fee: Math.round((30 + a.tier * 40 + t.rep * 2) * awMul(s, 'player') * 1e4) } });
    }
    if (!n) return;
    practice(s, p, t.inst, 1.4 * n, 1);
    const lvl = lv(p, t.inst), pf = lvl + talB(p.tal.looks, false);
    const g = Math.max(0, Math.round((pf - 12) * U.fl(0.8, 2.5) * (1 + Math.log10(1 + s.fans.kr) / 3) * access(s) * n * popSpeed(s) * 0.7 * myRoom(s, 'kr')));
    s.fans.kr += g;
    earn(s, Math.round((15 + Math.max(0, pf)) * 1e4 * (0.4 + Math.min(1.2, s.fans.kr / 5e4)) * (1 + (n - 1) * 0.4)), '공연·레슨');
    addStress(s, 1.5);
    t.rep = U.clamp(t.rep + (lvl - 30) / 200, 0, 100);
    t.nextRel--;
    if (t.nextRel <= 0 && !hasQ(s, 'player_relres')) { t.nextRel = U.int(8, 12); const title = U.pick(['피아노 소품집', '밤의 연주', '현 위의 계절', '리듬 노트', '손끝의 기록', '조용한 방', '즉흥 일기']) + (t.rel ? ` ${t.rel + 1}` : ''); queueEv(s, 'player_relres', 1, { title }); addLog(s, `연주 앨범 「${title}」 녹음을 시작했다.`, 'career'); }
    if ((t.inst === 'piano' || t.inst === 'keyboard') && lvl >= 55 && U.chance(0.01) && !s.inbox.some(m => m.kind === 'recital')) sendMsg(s, 'recital', { from: U.pick(['예술의 숲 콘서트홀', '한강 아트센터', '별빛 문화재단']), title: '독주회 제안', months: 8, d: { fee: Math.round((300 + lvl * 10) * 1e4) } });
  },
};
// 남의 노래를 부르는 가수나 그룹 (작곡·작사·세션·프로듀싱 의뢰에 쓴다)
function makeArtist(s, rep) {
  const tier = U.wpick([1, 2, 3], w => [6, 3, 1 + rep / 15][w - 1]);
  const kind = U.pick(['걸그룹', '보이그룹', '솔로 가수', '밴드']);
  const name = freshName(() => kind === '솔로 가수' ? genName(U.chance(0.5) ? '여' : '남', calY(s) - U.int(20, 45)) : kind === '밴드' ? U.pick(BAND_NAMES) : groupNameRaw());
  return { name, kind, tier };
}
INBOX.session = {
  ic: '🎚️',
  text: (s, m) => `${m.d.a.name}(${TIER_N[m.d.a.tier]} 기획사 ${m.d.a.kind})의 새 앨범 녹음에 ${SKILLS[s.tracks.player.inst || 'guitar'].n} 세션으로 참여해 달라는 의뢰다. 보수 ${fmtWon(m.d.fee)}.`,
  ch: (s, m) => [
    { t: '참여한다', ok: s => trackOn(s, 'player'), f: s => { const t = s.tracks.player; earn(s, m.d.fee, '세션 연주비'); t.sessions++; t.rep = U.clamp(t.rep + 1 + m.d.a.tier * 0.5, 0, 100); useSkill(s, me(s), t.inst, 2); addWork(s, { type: '세션 참여', pay: m.d.fee, title: songTitle(), by: m.d.a.name, sc: 50, note: `${SKILLS[t.inst].n} 세션` }); return `${m.d.a.name} 앨범에 ${SKILLS[t.inst].n} 세션으로 참여했다.` + fx(s, { stress: 2 }); } },
    { t: '거절한다', f: s => '세션 의뢰를 거절했다.' },
  ],
};
INBOX.recital = {
  ic: '🎼',
  text: (s, m) => `「${m.from}」에서 단독 독주회를 열어 보자고 한다. 출연료 ${fmtWon(m.d.fee)}. 준비하는 동안 연습량이 많아진다.`,
  ch: (s, m) => [
    { t: '연다', ok: s => trackOn(s, 'player'), f: s => { const t = s.tracks.player; const lvl = lv(me(s), t.inst); const good = lvl + U.normal(0, 8) >= 58; earn(s, m.d.fee, '독주회 출연료'); practice(s, me(s), t.inst, 3, 1); t.rep = U.clamp(t.rep + (good ? 6 : 1), 0, 100); addWork(s, { type: '독주회', pay: m.d.fee, title: m.from, sc: good ? 75 : 55, note: good ? '기립 박수' : '무난한 공연' }); if (good) milestone(s, `${age(s)}세에 「${m.from}」에서 독주회를 열었다.`); return good ? '독주회가 끝나자 관객들이 일어서서 박수를 쳤다.' + fx(s, { fkr: U.int(800, 3000), stress: -6 }) : '독주회를 무사히 마쳤다.' + fx(s, { fkr: U.int(100, 600) }); } },
    { t: '거절한다', f: () => '독주회 제안을 거절했다.' },
  ],
};
E({
  // 중요한 연주회(첫 앨범 · 반응이 좋았을 때)는 요약에만 남기지 않고 창으로 (무대 창이 먼저 뜬다)
  id: 'player_relres', cat: '음원 성적', title: '연주 앨범 성적', tag: 'career', keepPop: (s, d) => !!(d.live && d.live.key),
  plio: (s, d) => typeof plioSong === 'function' ? plioSong(s, d, 'player') : null,
  live: (s, d) => d.live,
  init(s, d) {
    const t = s.tracks.player;
    if (t.st !== 'active') { d.skip = true; return; }
    const p = me(s);
    const sc = songScore(s, { perf: lv(p, t.inst), q: lv(p, 'compose') * 0.6 + lv(p, t.inst) * 0.4, fans: s.fans.kr, tier: 0, bonus: t.rep * 0.05 - 6 });
    d.peak = sc >= 66 ? chartFromScore(sc) : null;
    jpopWork(s, 'player', sc);
    d.gain = Math.round(Math.max(0, fanGain(s, sc, 'kr', 0.5)) * myRoom(s, 'kr'));
    s.fans.kr += d.gain;
    d.roy = addCatalog(s, d.title, '연주', sc, 0.7, 'player');
    t.rel++; t.yearBest = Math.max(t.yearBest || 0, sc - 8);
    t.rep = U.clamp(t.rep + (sc - 50) / 6, 0, 100);
    addWork(s, { type: '연주 앨범', title: d.title, by: actName(s, 'player'), sc, note: d.peak ? chartText(d.peak) : sc >= 60 ? '평론가 호평' : '조용히 나왔다' });
    if (t.rel === 1) milestone(s, `${age(s)}세에 첫 연주 앨범 ${josa(`「${d.title}」`, '을를')} 냈다.`);
    d.sc = sc;
    // 무대 창 (12-3): 발매 기념 연주회
    d.live = liveStage({ k: 'player', vn: 'hall', place: '연주회', t: d.title, g: actName(s, 'player'), cn: actCall(s, 'player'), mem: [[actCall(s, 'player'), partN(t.inst)]], mi: 0, sc, key: t.rel === 1 || sc >= 66,
      z: { perf: (lv(p, t.inst) - 45) / 18, me: (lv(p, t.inst) - 45) / 18, q: (lv(p, 'compose') * 0.6 + lv(p, t.inst) * 0.4 - 45) / 15, fans: (Math.log10(1 + s.fans.kr) - 3.6) / 0.9 } });
  },
  text: (s, d) => `연주 앨범 ${josa(`「${d.title}」`, '이가')} 나왔다.\n\n${d.peak ? chartText(d.peak) : d.sc >= 60 ? '차트에는 못 올랐지만 평론가들이 좋게 봤다.' : '크게 알려지지는 않았다.'}\n팬 +${fmtFans(d.gain)} · 매달 들어올 음원 수익 약 ${fmtWon(d.roy)}`,
  ch: (s, d) => [{ t: '확인', f: () => `연주 앨범 ${josa(`「${d.title}」`, '을를')} 냈다.` }],
});

// ════════ 솔로 · 밴드 앨범 (v154: 앨범 제작 틀 album.js) ════════
// 회사 소속: 신곡 회의(회사가 컨셉을 정해 오고 나는 제안할 수 있다) → 회사(대표 · 전담 프로듀서 · A&R 팀장)가 나머지를 한다. '자작곡 쓰기 · 가사 쓰기'를 켜 두면 내 곡도 심사를 받는다
// 회사 없음(인디 · 내 회사 소속): 내가 대표 역할로 ① 기획 · 데모곡 확보 → 한 달 뒤 ② 곡 선정을 직접 한다. A&R 팀이 없어 모인 곡을 내가 전부 듣는다 (내 회사면 회사 A&R 팀장이 추린다)
// 밴드는 곡이 정해지면 편곡 회의(band_arr)를 거친다. 다음 곡 기획은 발매 3~6달 뒤, 기획에서 발매까지 석 달
function musPpl(s, k) { return k === 'band' ? [me(s)].concat(bandMembers(s, s.tracks.band)) : [me(s)]; }
function musFans(s, k) { return k === 'band' ? s.tracks.band.b.f : totalFans(s); }
function musRelQ(s, k) { return (k === 'band' ? ['band_rel', 'band_relres', 'band_arr', 'band_cb', 'band_plan', 'band_sel', 'band_meet'] : ['solo_rel', 'solo_relres', 'solo_plan', 'solo_sel', 'solo_meet']).some(id => hasQ(s, id) || (s.pending && s.pending.id === id)); }
// 매달: 다음 곡 차례가 되면 기획 창(인디) · 신곡 회의(회사 소속), 미뤄 둔 선정이 있으면 선정 창을 다시 띄운다. 회사가 곡을 정한 달에는 소식을 남긴다
function musAlbMonth(s, k) {
  const t = s.tracks[k];
  if (t.alb && t.alb.five && t.alb.at == null && t.st === 'signed') t.alb = null; // 인디 때 모아 둔 곡은 회사와 계약하면 없던 일로
  const a = t.alb;
  if (a && a.at != null) {
    if (a.npc && s.t - a.at === 1 && !a.told) { a.told = true; addLog(s, albNewsLine(s, a, k === 'band' ? `밴드 「${t.b.name}」 새 앨범에 실을` : '다음 솔로 신곡에 실을'), 'career'); }
    if (s.t - a.at > 6 && !musRelQ(s, k)) t.alb = null;
    return;
  }
  if (t.nextRel > 0 || musRelQ(s, k) || (k === 'band' && bandMissing(t).length)) return;
  t.nextRel = 99;
  queueEv(s, a && a.five ? k + '_sel' : t.st === 'signed' ? k + '_meet' : k + '_plan', 0, {});
}
// 회사 소속: 컨셉이 정해지면 회사가 데모곡 모집 · 심사 · 선정을 하고 석 달 뒤에 나온다 (밴드는 한 달 뒤 편곡 회의를 거친다)
function musAlbStart(s, k, c) {
  const t = s.tracks[k], ag = AG[t.ag] || { tier: t.tier || 1, plan: 50 }, P = musPpl(s, k), who = agProd(s, t.ag, k === 'band' ? t.b : t);
  const r = albNpc(s, { tier: ag.tier, rep: ag.plan != null ? ag.plan : 50, sig: null, mem: P.slice(1), cs: [c], ok: x => cAgeOK(s, P, x, 1), boss: who.p, bossN: who.n, anr: agAnr(s, t.ag), fav: 6, my: !!t.subSong && has(me(s), 'compose'), lyr: !!t.subLyr && has(me(s), 'lyric') });
  const a = albKeep(s, r, true);
  t.alb = a;
  if (who.p && who.p.ind) meetAt(s, who.p, k === 'band' ? `밴드 「${t.b.name}」 앨범` : '솔로 신곡', k);
  const o = { q: a.q, self: a.mine, lyr: a.lyrT, title: a.title, c: a.c, w: a.w, mk: a.mk, a, alb: 1 };
  if (k === 'band') queueEv(s, 'band_arr', 1, o, true); else queueEv(s, 'solo_relres', 3, o, true);
  return a;
}
for (const k of ['solo', 'band']) E({
  id: k + '_meet', cat: k === 'band' ? '밴드' : '신곡', title: k === 'band' ? '새 곡 회의' : '솔로 신곡 회의', tag: 'career',
  cond: s => s.tracks[k].st === 'signed',
  init(s, d) {
    const t = s.tracks[k], P = musPpl(s, k), L = TRENDS.filter(c => cAgeOK(s, P, c, 1));
    d.c = U.chance(0.5) && L.includes(s.trend) ? s.trend : U.pick(L.length ? L : TRENDS);
    d.alt = U.shuffle(L.filter(x => x !== d.c)).slice(0, 2);
    d.p = U.clamp(0.3 + Math.log10(1 + musFans(s, k)) / 20 + (s.rep - 50) / 200, 0.2, 0.85);
    d.who = agProd(s, t.ag, k === 'band' ? t.b : t).n;
  },
  text: (s, d) => `${k === 'band' ? `밴드 「${s.tracks.band.b.name}」의 다음 앨범` : '다음 솔로 신곡'} 회의가 열렸다. ${josa(d.who, '은는')} '${d.c}' 컨셉으로 가려고 한다. 요즘 차트에선 '${s.trend}' 컨셉이 강세다.\n\n컨셉이 정해지면 회사가 데모곡을 모아 A&R 심사를 하고, 실을 곡을 정해 편곡 · 녹음을 거친다. 석 달쯤 걸린다.${s.tracks[k].subSong ? ' 내 곡도 데모곡 모집에 낸다.' : ''}`,
  ch(s, d) {
    const go = c => { if (s.tracks[k].st === 'signed' && !s.tracks[k].alb) musAlbStart(s, k, c); };
    const nm = k === 'band' ? '새 곡' : '솔로 신곡';
    const C = [{ t: `회사 뜻대로 '${d.c}' 컨셉으로 간다`, tr: d.c === s.trend, h: `숙련도 ${gauge(cmGet(s, d.c))} ${Math.floor(cmGet(s, d.c))}`, f: s => { go(d.c); return `'${d.c}' 컨셉으로 ${nm} 준비를 시작했다.`; } }];
    d.alt.forEach(c => C.push({ t: `'${c}' 컨셉을 제안한다`, tr: c === s.trend, h: `받아들여질 가능성 ${fmtPct(d.p)} · 숙련도 ${gauge(cmGet(s, c))} ${Math.floor(cmGet(s, c))}`, f: s => { const ok = U.chance(d.p); go(ok ? c : d.c); return ok ? `내 의견대로 '${c}' 컨셉으로 가기로 했다.` : `제안은 받아들여지지 않았다. 회사 뜻대로 '${d.c}' 컨셉으로 간다.`; } }));
    return C;
  },
});
// ── 인디 · 내 회사 소속: 내가 대표 역할 ──
// 제작비 (곡을 정할 때 낸다): 인디 · 내 회사 크기 차례
const MY_ALB_PROD = { solo: [80e4, 800e4, 1500e4, 2500e4], band: [60e4, 600e4, 1200e4, 2000e4] };
function myAlbX(s, k) {
  const co = ownCo(s, k), tier = co ? coTier(co, 'music') : 0, prod = MY_ALB_PROD[k][tier], P = musPpl(s, k);
  // 처음부터 체크해 둘 컨셉: 내가 잘 아는 컨셉 · 나에게 어울리는 컨셉 · 유행 컨셉 순으로 따진다
  const fitN = c => ({ '잘 어울린다': 20, '무난하다': 10, '나이에 안 맞는다': -50 })[albFit(s, P, c)] || 0, val = c => cmGet(s, c) + fitN(c) + (c === s.trend ? 5 : 0);
  const def = TRENDS.slice().sort((a, b) => val(b) - val(a))[0] || s.trend;
  return { tier, rep: co ? co.f.music.rep : s.rep, sig: null, def, mem: P.slice(1), prod, budget: Math.max(100e4, (jobMoney(s, k) - prod) * 0.5) };
}
function myAlbJudge(s, k) { return ownCo(s, k) && typeof coAnrLead === 'function' ? coAnrLead(s) : null; }
function myMoneyN(s, k) { return ownCo(s, k) ? '자본금' : '내 돈'; }
function myAlbFit(s, k, c) { return albFit(s, musPpl(s, k), c) + (has(me(s), 'compose') ? ` · 내 숙련도 ${gauge(cmGet(s, c))}` : ''); }
function myPickRead(a, v) { const idx = a.five.map((x, i) => i).filter(i => albOn(v, 'p' + i)), ti = v.ti ? +String(v.ti).slice(1) : -1, pol = albPolRead(v); return { idx, ti: idx.includes(ti) ? ti : -1, pol, ly: pol.lyr === 'me' }; }
function myPickCost(s, x, ti, pol) { return (ti ? ti.price || 0 : 0) + albPolPay(s, x, pol) + x.prod; }
// 편곡자 · 작사가 후보 (v165, 앨범마다 한 번 정해 둔다). 작사는 내가 직접 쓸 수도 있다 (작사 특기)
function myPolC(s, k) { const t = s.tracks[k]; return t.alb.polC || (t.alb.polC = albPolCands(s, t.lastPol)); }
function myPolFields(s, k) {
  const p = me(s), co = ownCo(s, k) && typeof coPolBase === 'function', v = co && typeof coViewer === 'function' ? sk => coViewer(s, 'anr', sk, 'music') : () => p;
  // v166: 내 회사 소속이면 사내 프로듀서에게 맡기거나 '회사에서'(사내 프로듀서들이 같이) 할 수 있다
  const B = co ? coPolBase(s) : { arr: [{ v: '', label: '따로 맡기지 않는다', sub: '돈 안 듦 · 조금만 다듬어진다' }], lyr: [{ v: '', label: '따로 맡기지 않는다', sub: '돈 안 듦 · 조금만 다듬어진다' }] };
  if (has(p, 'lyric')) B.lyr.splice(1, 0, { v: 'me', label: '타이틀곡 가사는 내가 쓴다', sub: `작사 ${lvi(p, 'lyric')}레벨 · 실력만큼 곡이 달라지고, 작사 저작권료 몫이 생긴다` });
  return albPolFields(s, myAlbX(s, k), myPolC(s, k), s.tracks[k].lastPol, B, v);
}
function myAlbTbl(s, k) {
  const a = s.tracks[k].alb, v = ownCo(s, k) && typeof coViewer === 'function' ? coViewer(s, 'anr', 'compose', 'music') : me(s);
  const rows = a.five.map((x, i) => { const c = x.mine ? me(s) : x.cid && s.people[x.cid]; return { k: 'p' + i, tr: x.c === s.trend, cells: {
    t: [x.title, `「${x.title}」`], by: [albBy(s, x), albBy(s, x)], c: [x.c, x.c], lv: c ? coCellLv(v, c, 'compose', !!x.mine || x.src === 'mem') : [-1, '?'],
    q: coCellG(grade5(v, x.q, 'q', 'compose'), 'q'), m: x.m == null ? [-1, '-'] : coCellG(grade5(v, x.m, 'pot', 'compose')), p: [x.price, x.price ? fmtWon(x.price) : '-'] } }; });
  return { cols: [['t', '제목'], ['by', '작곡가'], ['c', '컨셉'], ['lv', '작곡 레벨'], ['q', '완성도'], ['m', '컨셉 숙련도'], ['p', '곡값']], rows, radio: { k: 'ti', n: '타이틀' }, sort: ['q', -1] };
}
function myAlbHead(s, k) {
  const t = s.tracks[k], p = me(s), co = ownCo(s, k);
  return `${k === 'band' ? `밴드 「${t.b.name}」 새 곡을` : '솔로 가수로 새 노래를'} 낼 때가 됐다.\n\n작곡 ${has(p, 'compose') ? lvi(p, 'compose') + '레벨' : '못 함'} · 작사 ${has(p, 'lyric') ? lvi(p, 'lyric') + '레벨' : '못 함'} · 요즘 유행 '${s.trend}'\n` + (co ? `내 회사 ${josa(`「${co.name}」`, '이가')} 비용을 대고, 수익도 회사로 들어간다.` : '인디라서 비용은 내 돈으로 낸다.');
}
// 곡을 정하면: 돈을 치르고, 작곡가들을 만나고, 편곡 · 작사를 거쳐 두 달 뒤에 나온다 (밴드는 편곡 회의를 먼저)
function myAlbGo(s, k) {
  const t = s.tracks[k], a = t.alb, x = myAlbX(s, k), p = me(s), picks = a.sel.p.map(i => a.five[i]), ti = a.five[a.sel.ti];
  const cost = myPickCost(s, x, ti, a.sel.pol);
  jobPay(s, cost, k === 'band' ? '밴드 새 곡 제작비' : '신곡 제작비', k);
  for (const d of picks) { const c = d.cid && s.people[d.cid]; if (c && c.ind) { meetAt(s, c, `「${d.title}」`, k); bond(s, c, d === ti ? 3 : 1); const cm = coCm(c); cm[d.c] = Math.min(100, cm[d.c] + (100 - cm[d.c]) * (d === ti ? 0.06 : 0.02)); } }
  x.cs = a.cs; x.src = a.src;
  const sp = a.sel.pol, T = sp && typeof sp === 'object' && ownCo(s, k) && typeof coProdTeam === 'function' ? coProdTeam(s) : null;
  const pol = albPolish(s, x, T ? Object.assign({}, sp, { arrLv: sp.arr ? 0 : T.arr, lyrLv: sp.lyr ? 0 : T.lyr }) : sp);
  // 타이틀곡 가사를 내가 쓰면: 내 작사 실력만큼 곡이 달라지고, 작사 저작권료 몫이 생긴다
  if (a.sel.ly) { pol.dq += U.clamp((lv(p, 'lyric') - 35) * 0.05, -2, 2.5); useSkill(s, p, 'lyric', 2); pol.lyr = '나'; }
  const mk = albMk(s, a, picks, ti, pol, '나');
  if (a.sel.ly) { const z = mk.pk.find(q => q.ti); if (z) z.ly = '나'; }
  const side = picks.filter(d => d !== ti);
  const keep = { at: s.t - 1, q: ti.q + pol.dq, side: side.length ? side.reduce((n, d) => n + d.q, 0) / side.length : null, c: ti.c, title: ti.title, cid: ti.cid || null, w: albBy(s, ti), mine: !!ti.mine, sub: side.filter(d => d.mine).map(d => d.title), lyrT: !!a.sel.ly, lyrS: [], mk };
  t.alb = keep;
  if (k === 'solo' && !t.sn) askStageName(s, 'solo');
  const o = { q: keep.q, self: keep.mine, lyr: keep.lyrT, title: ti.title, c: ti.c, w: keep.w, mk, a: keep, alb: 1 };
  if (k === 'band') queueEv(s, 'band_arr', 0, o, true); else queueEv(s, 'solo_relres', 2, o, true);
  return `${k === 'band' ? `밴드 「${t.b.name}」 새 곡에` : '솔로 신곡에'} 실을 곡을 정했다. 타이틀곡은 ${ti.mine ? '내가 쓴' : `${albBy(s, ti)}의`} 「${ti.title}」 ('${ti.c}' 컨셉). ${k === 'band' ? '편곡 회의를 하고' : '편곡과'} 녹음을 거쳐 두 달 뒤에 나온다. (${fmtWon(cost)})`;
}
TITLE_CB.myAlb = (s, d) => { const t = s.tracks[d.k]; if (!trackOn(s, d.k) || !t.alb || !t.alb.sel) return ''; t.alb.five[t.alb.sel.ti].title = d.title; return myAlbGo(s, d.k); };
for (const k of ['solo', 'band']) {
  const nm = k === 'band' ? '새 곡' : '솔로 신곡', cat = k === 'band' ? '밴드' : '신곡';
  const live = s => trackOn(s, k) && s.tracks[k].st !== 'signed' && (k !== 'band' || !!s.tracks.band.b);
  // ① 기획 · 데모곡 확보
  E({
    id: k + '_plan', cat, tag: 'career', title: k === 'band' ? '밴드 새 곡 기획' : '솔로 신곡 기획',
    cond: live,
    init(s, d) { if (!live(s)) d.skip = true; },
    text: (s, d) => { const j = myAlbJudge(s, k); return myAlbHead(s, k) + `\n\n컨셉과 곡을 모을 곳을 정하자. 여러 개를 같이 고를 수 있고, 고른 만큼 돈이 든다. ${j ? `모인 곡은 A&R 팀장 ${josa(j.name, '이가')} 다섯 곡으로 추려 오고,` : '회사가 없어 A&R 팀도 없다. 모인 곡은 내가 전부 들어 보고,'} 한 달 뒤에 실을 곡을 정한다.`; },
    form: (s, d) => { const x = myAlbX(s, k); x.last = s.tracks[k].lastPlan; return albPlanForm(s, x, c => myAlbFit(s, k, c)); },
    sum: (s, d, v) => { const x = myAlbX(s, k), r = albPlanRead(s, x, v), n = ALB_SRC.filter(z => r.src.includes(z.k)).reduce((a, z) => a + albSrcCnt(x, z, r.cs.length), 0); return `컨셉 ${r.cs.length}개 · 데모곡 ${n}곡쯤 · 드는 돈 ${fmtWon(albPlanCost(x, r.cs, r.src))} · ${myMoneyN(s, k)} ${fmtWon(jobMoney(s, k))}`; },
    cancel: (s, d) => { s.tracks[k].nextRel = 3; return `${nm}은 석 달 뒤로 미뤘다.`; },
    cancelT: () => '이번엔 넘긴다',
    // 자동 플레이: 처음 체크된 컨셉 하나에 외부 공모 (작곡을 하면 내 곡도)
    sim: (s, d) => { const x = myAlbX(s, k), v = { s_open: true }; v['c_' + x.def] = true; if (lv(me(s), 'compose') >= 20) v.s_me = true; if (albWriters(x).length) v.s_mem = true; return v; },
    submit(s, d, v) {
      const t = s.tracks[k], x = myAlbX(s, k), r = albPlanRead(s, x, v);
      if (!r.cs.length) return { err: '컨셉을 하나 이상 골라 주세요' };
      if (!r.src.length) return { err: '곡을 모을 곳을 하나 이상 골라 주세요' };
      const cost = albPlanCost(x, r.cs, r.src);
      if (cost > 0 && jobMoney(s, k) < cost) return { err: `${myMoneyN(s, k)}이 ${fmtWon(cost - jobMoney(s, k))} 모자라요` };
      if (cost > 0) jobPay(s, cost, '기획 · 데모곡', k);
      t.lastPlan = { cs: r.cs.slice(), src: r.src.slice() }; // v165: 다음 기획에 그대로 체크해 둔다
      x.cs = r.cs; x.src = r.src;
      const demos = albDemos(s, x), j = myAlbJudge(s, k), sc = albScreen(s, x, demos, j), my = demos.find(z => z.mine);
      if (my) { useSkill(s, me(s), 'compose', 2); cmGain(s, my.c, 10); }
      t.alb = { cs: r.cs, src: r.src, n: demos.length, five: sc.five, by: j ? j.id : null };
      queueEv(s, k + '_sel', 1, {}, true);
      return { log: `${k === 'band' ? `밴드 「${t.b.name}」 ` : ''}${nm} 기획을 마쳤다. ${r.cs.map(c => `'${c}'`).join(' · ')} 컨셉으로 데모곡 ${demos.length}곡이 모였다.${my ? ' 나도 한 곡 썼다.' : ''}${cost ? ` (${fmtWon(cost)})` : ''}` };
    },
  });
  // ② 곡 선정: 실을 세 곡 + 타이틀곡, 편곡 · 작사를 맡길지, 타이틀곡 가사를 내가 쓸지
  E({
    id: k + '_sel', cat, tag: 'career', title: k === 'band' ? '밴드 새 곡 · 실을 곡 정하기' : '솔로 신곡 · 실을 곡 정하기',
    cond: live,
    init(s, d) { const a = s.tracks[k].alb; if (!live(s) || !a || !a.five || !a.five.length || a.at != null) { d.skip = true; return; } myPolC(s, k); },
    text: (s, d) => {
      const a = s.tracks[k].alb, j = a.by && s.people[a.by], need = Math.min(ALB_PICK, a.five.length), x = myAlbX(s, k);
      return `${nm}에 실을 곡을 정할 차례다.\n\n${j && a.n > a.five.length ? `모인 데모곡 ${a.n}곡 가운데 A&R 팀장 ${josa(j.name, '이가')} ${a.five.length}곡을 추려 왔다.` : `모인 데모곡 ${a.n}곡을 직접 들어 봤다.`} 실을 ${need}곡을 체크하고, 그중 타이틀곡을 하나 찍자.\n\n타이틀곡 값과 제작비(${fmtWon(x.prod)})가 든다 · ${myMoneyN(s, k)} ${fmtWon(jobMoney(s, k))}`;
    },
    form: (s, d) => s.tracks[k].alb.five.map((z, i) => ({ k: 'p' + i, type: 'check', label: z.title })).concat(myPolFields(s, k)),
    tbl: (s, d) => myAlbTbl(s, k),
    sum: (s, d, v) => { const a = s.tracks[k].alb, r = myPickRead(a, v), x = myAlbX(s, k); return `체크 ${r.idx.length}곡${r.ti >= 0 ? ` · 타이틀 「${a.five[r.ti].title}」` : ''} · 드는 돈 ${fmtWon(myPickCost(s, x, r.ti >= 0 ? a.five[r.ti] : null, r.pol))} · ${myMoneyN(s, k)} ${fmtWon(jobMoney(s, k))}`; },
    // 두 번 미루면 모아 둔 곡들은 다른 가수에게 넘어가고, 다음에는 기획부터 다시 한다
    cancel: (s, d) => { const t = s.tracks[k], a = t.alb; t.nextRel = 3; if (a) { a.wait = (a.wait || 0) + 1; if (a.wait >= 2) t.alb = null; } return `${nm}은 석 달 뒤로 미뤘다.` + (a && !t.alb ? ' 모아 둔 곡들은 다른 가수에게 넘어갔다.' : ''); },
    cancelT: () => '이번엔 넘긴다',
    // 자동 플레이: 내 곡 · 싼 곡부터 세 곡, 맨 앞 곡을 타이틀로
    sim: (s, d) => { const F = s.tracks[k].alb.five, I = F.map((x, i) => i).sort((p, q) => (F[q].mine ? 1 : 0) - (F[p].mine ? 1 : 0) || F[p].price - F[q].price).slice(0, ALB_PICK), v = {}; I.forEach(i => v['p' + i] = true); v.ti = 'p' + I[0]; if (lv(me(s), 'lyric') >= 30) v.lyr = 'me'; return v; },
    submit(s, d, v) {
      const t = s.tracks[k], a = t.alb, need = Math.min(ALB_PICK, a.five.length), r = myPickRead(a, v), x = myAlbX(s, k);
      if (r.idx.length !== need) return { err: `실을 곡을 ${need}곡 체크해 주세요 (지금 ${r.idx.length}곡)` };
      if (r.ti < 0) return { err: '체크한 곡 가운데 타이틀곡을 하나 찍어 주세요' };
      const cost = myPickCost(s, x, a.five[r.ti], r.pol);
      if (jobMoney(s, k) < cost) return { err: `${myMoneyN(s, k)}이 ${fmtWon(cost - jobMoney(s, k))} 모자라요` };
      a.sel = { p: r.idx, ti: r.ti, pol: r.pol, ly: r.ly }; t.lastPol = Object.assign({}, r.pol);
      // 내가 쓴 곡이 타이틀이면 제목을 직접 짓는다
      if (a.five[r.ti].mine) { askTitle(s, 'myAlb', { title: a.five[r.ti].title, what: `${nm} 타이틀곡의`, k }); return { log: '' }; }
      return { log: myAlbGo(s, k) };
    },
  });
}
