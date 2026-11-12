'use strict';
// 제안(메시지함)과 지원(직업 지원·활동 지원)
// 제안: 회사·제작사·브랜드·방송인이 나한테 먼저 보낸 것. 바로 답하지 않아도 되고, 기한 마지막 날까지 답이 없으면 그때 대답을 고르게 한다.
// 지원: 내가 할 수 있는 곳을 전부 보여 준다. 직업 지원(이력서·기획사 오디션)과 활동 지원(뮤지컬·오디션 프로그램 등).

// ───── 메시지함 ─────
// INBOX[kind] = { ic, text(s,m), ch(s,m) → [{ t, h, ok, f }] }
const INBOX = {};
function sendMsg(s, kind, o) {
  const m = Object.assign({ id: 'm' + U.uid(), kind, at: s.t, due: s.t + (o.months || 6), read: false }, o);
  s.inbox.push(m);
  addLog(s, `📨 ${m.from}에게서 제안이 왔다. (${m.title})`, 'career');
  return m;
}
// 답장을 기다리는 제안 수
function inboxCount(s) { return s.inbox.length; }
function msgChoices(s, m) { return njGate(s, INBOX[m.kind].ch(s, m) || []); }
// 메시지에 답하기. 돌려주는 값: 기록 문장
function answerMsg(s, id, i) {
  const m = s.inbox.find(x => x.id === id);
  if (!m) return '';
  const c = msgChoices(s, m)[i];
  if (!c || (c.ok && !c.ok(s))) return '';
  s.inbox.splice(s.inbox.indexOf(m), 1);
  // 지난 제안: 메시지함 아래에 무엇을 골랐는지 남겨 둔다
  s.inboxLog = s.inboxLog || [];
  s.inboxLog.push({ t: s.t, kind: m.kind, title: m.title, from: m.from, ans: c.t, late: !!m.forced });
  if (s.inboxLog.length > 40) s.inboxLog.shift();
  return c.f(s, m) || '';
}
// 기한 마지막 날: 답하지 않은 제안은 대답을 고르는 창을 띄운다
function inboxMonth(s) {
  for (const m of s.inbox) if (m.due <= s.t && !m.forced) { m.forced = true; queueEv(s, 'inbox_due', 0, { id: m.id }, true); }
}
E({
  id: 'inbox_due', cat: '📨 답장 기한', tag: 'career',
  cond: s => true,
  init(s, d) { if (!s.inbox.find(m => m.id === d.id)) d.skip = true; },
  title: (s, d) => { const m = s.inbox.find(x => x.id === d.id); return m ? m.title : '제안'; },
  text: (s, d) => { const m = s.inbox.find(x => x.id === d.id); return `답장 기한이 오늘까지다. ${m.from}에서 온 제안에 답해야 한다.\n\n` + INBOX[m.kind].text(s, m); },
  ch: (s, d) => { const m = s.inbox.find(x => x.id === d.id); if (!m) return [{ t: '확인', f: () => '' }]; return msgChoices(s, m).map((c, i) => ({ t: c.t, h: c.h, ok: c.ok, f: s => answerMsg(s, d.id, i) })); },
});

// ───── 지원 ─────
// 항목: { id, n, ic, h(s), ok(s), why(s), run(s) }
// 직업 지원 항목은 trk(직업 id)로 분야(음악·방송·영상·회사)와 아티스트·스태프를 정하고, 활동 지원 항목은 cat으로 분야를 정한다
const JOB_APPLY = [];
const ACT_APPLY = [];
const APPLY_CATS = [['music', '🎵 음악'], ['video', '🎬 방송·영상'], ['biz', '🏢 회사 경영']];
function applyCatOf(a) { if (a.cat) return a.cat; const c = CAREER_PLAN.find(x => x.id === a.trk); return c ? c.sub : 'music'; }
function applySideOf(a) { const c = CAREER_PLAN.find(x => x.id === a.trk); return c ? c.g : 'artist'; }
function jobApplies(s) { return JOB_APPLY.filter(a => !a.show || a.show(s)); }
function actApplies(s) { return ACT_APPLY.filter(a => !a.show || a.show(s)); }
function busyWith(s, type) { return s.projects.some(w => w.type === type); }
// 오디션·채용·활동 지원이 처음으로 지원 가능해지면 알려 준다 (한 곳마다 한 번만)
// 혼자 시작하는 일도 처음 할 수 있게 되면 알린다 (돈만 있으면 되는 버튜버 아바타·밴드 데모처럼 자주 바뀌는 것은 뺀다)
const AP_NOTIFY = new Set(['band_make', 'band_join', 'solo_indie', 'player_start', 'composer_start', 'lyricist_start', 'producer_start', 'actor_music', 'actor_indie', 'variety_start', 'editor_free', 'model_free', 'director_short', 'writer_start', 'webtoon_free', 'webnovel_free', 'illust_start', 'prof_adj']);
function isAudition(a) { return ACT_APPLY.includes(a) || /오디션|채용/.test(a.n) || AP_NOTIFY.has(a.id); }
function applyOKNow(s, a) { try { return !!a.ok(s); } catch (e) { return false; } }
// 예전 세이브: 이미 지원할 수 있는 곳은 알린 것으로 친다
function applySeenInit(s) { s.apSeen = {}; for (const a of jobApplies(s).concat(actApplies(s))) if (isAudition(a) && applyOKNow(s, a)) s.apSeen[a.id] = 1; }
function applyOpenMonth(s) {
  if (!s.apSeen) { applySeenInit(s); return; }
  if (s.army) return;
  const fresh = [];
  for (const a of jobApplies(s).concat(actApplies(s))) if (!s.apSeen[a.id] && isAudition(a) && applyOKNow(s, a)) { s.apSeen[a.id] = 1; fresh.push(a.id); }
  if (!fresh.length) return;
  const q = s.queue.find(x => x.id === 'ap_open');
  if (q) q.d.ids = q.d.ids.concat(fresh); else queueEv(s, 'ap_open', 0, { ids: fresh });
}
function apOpenGroups(s, d) {
  const all = JOB_APPLY.concat(ACT_APPLY), groups = [];
  for (const id of d.ids) {
    const a = all.find(x => x.id === id);
    if (!a) continue;
    const gn = a.g || `${a.ic || ''} ${a.n}`.trim();
    let g = groups.find(x => x.n === gn);
    if (!g) groups.push(g = { n: gn, act: ACT_APPLY.includes(a), items: [], p: 0 });
    g.items.push(a.n);
    let p = 0; try { p = typeof apP === 'function' ? apP(s, a) : 0; } catch (e) { }
    g.p = Math.max(g.p, p || 0);
  }
  groups.sort((a, b) => b.p - a.p);
  for (const g of groups) g.line = g.items.length === 1 ? `· ${g.act ? g.n : `${g.n} — ${g.items[0]}`}` : `· ${g.n} — ${g.items.length}곳 (${g.items.slice(0, 3).join(', ')}${g.items.length > 3 ? ' 등' : ''})`;
  return groups;
}
E({
  id: 'ap_open', cat: '📝 지원', title: '새로 지원할 수 있는 곳', tag: 'career', noCh: true,
  cond: s => true,
  // v118 UI D1: 묶음을 합격 가능성(그 묶음에서 가장 높은 곳) 높은 순으로, 가능성은 숫자 없이 막대로만 (html)
  text(s, d) { return `이제 지원할 수 있는 곳이 생겼다.\n\n${apOpenGroups(s, d).map(g => g.line).join('\n')}`; },
  html(s, d) {
    const G = apOpenGroups(s, d);
    return `<div class="apo"><div class="apo-h">이제 지원할 수 있는 곳이 생겼다.</div>${G.map(g => `<div class="apo-r"><span class="apo-n">${U.esc(g.line.slice(2))}</span><span class="apo-bar ${g.p >= 0.6 ? 'hi' : g.p >= 0.25 ? 'mid' : 'lo'}"><i style="width:${Math.max(4, Math.round(g.p * 100))}%"></i></span></div>`).join('')}</div>`;
  },
  ch: (s, d) => {
    const act = d.ids.some(id => ACT_APPLY.some(a => a.id === id)), job = d.ids.some(id => JOB_APPLY.some(a => a.id === id));
    const o = [];
    if (job) o.push({ t: '📝 구직활동 창 열기', f: s => { s.uiOpen = 'applyjob'; return ''; } });
    if (act) o.push({ t: '🎭 활동 지원 창 열기', f: s => { s.uiOpen = 'applyact'; return ''; } });
    o.push({ t: '확인', f: () => '' });
    return o;
  },
});

// ───── 계약 협상 ─────
// 계약서를 받으면 그대로 계약하거나, 한 가지씩 더 좋은 조건을 요구할 수 있다
// 요구가 받아들여지지 않으면 원래 조건으로 돌아오지만, 회사가 제안을 거둬들이기도 한다
// d: { kind, ag, agN, months, cut, sal, bonus, lev(협상력 0~1), tried: [], renew }
// NEGO[kind] = { what(d), block(s,d) → 막힌 이유, sign(s,d), refuse(s,d), lost(s,d) } — 각 직업 파일에서 채운다
const NEGO = {};
function pctN(x) { return Math.round(x * 100) + '%'; }
function yrs(m) { return m % 12 ? `${m}개월` : `${m / 12}년`; }
function negoP(d) { return U.clamp(0.12 + d.lev * 0.6 - d.tried.length * 0.08, 0.05, 0.85); }
function negoRisk(d) { return U.clamp(0.3 - d.lev * 0.25 + d.tried.length * 0.08, 0.04, 0.45); }
// 사건 창 글자 꾸미기: 바뀌기 전 조건은 취소선, 바뀐 조건은 초록색
function WAS(x) { return '\u0001' + x + '\u0002'; }
function NOW(x) { return '\u0003' + x + '\u0004'; }
// 처음 받은 조건(d.orig)과 달라진 건 '처음 조건(취소선) → 바뀐 조건(초록)'으로 보여 준다
function negoTerms(d) {
  const o = d.orig || d, L = [];
  const v = (a, b, f) => a == null || f(a) === f(b) ? f(b) : `${WAS(f(a))} → ${NOW(f(b))}`;
  if (d.sal) L.push(`월급 ${v(o.sal, d.sal, fmtWon)}`);
  if (d.months) L.push(d.kind === 'idol' ? `데뷔하면 그룹 전속 계약 ${v(o.months, d.months, yrs)} (연습생 계약은 ${d.trC || '17세까지, 그 뒤로는 1년씩'})` : `계약 기간 ${v(o.months, d.months, yrs)}`);
  if (d.cut != null) L.push(`벌어들인 돈 중 회사 몫 ${v(o.cut, d.cut, pctN)} · 내 몫 ${v(o.cut == null ? null : 1 - o.cut, 1 - d.cut, pctN)}${d.kind === 'idol' || d.kind === 'band' ? ' (내 몫은 멤버 수대로 나눈다)' : ''}`);
  if (d.bonus) L.push(`계약금 ${v(o.bonus, d.bonus, fmtWon)} (한 번에)`);
  if (d.feeR != null) L.push(`작품마다 연출료 프리랜서의 ${v(o.feeR, d.feeR, pctN)}${d.pjFee ? ` (데뷔작 약 ${fmtWon(Math.round(d.pjFee * d.feeR / 1e5) * 1e5)})` : ''}`);
  return L.map(x => '· ' + x).join('\n');
}
// 지금 요구할 수 있는 것 (한 번 요구한 건 다시 못 한다)
function negoAsks(d) {
  // 한 가지만 협상할 수 있는 계약 (영화감독 전속 계약): 한 번 요구하면 끝
  if (d.oneAsk && d.tried.length) return [];
  const A = [];
  // 회사 몫을 낮춰 달라고 한다: 보통 10%씩 20%까지 (MCN은 5%씩 10%까지: d.cutStep · d.cutMin)
  const cMin = d.cutMin != null ? d.cutMin : 0.2, cStep = d.cutStep || 0.1;
  if (d.cut != null && d.cut > cMin) A.push({ k: 'cut', t: '내 몫을 더 달라고 한다', to: x => { x.cut = Math.max(cMin, Math.round((x.cut - cStep) * 100) / 100); }, done: x => `회사 몫을 ${pctN(x.cut)}로 낮추기로 했다.` });
  if (d.months && d.months > (d.mMin || (d.kind === 'idol' ? 60 : 24))) A.push({ k: 'months', t: '계약 기간을 줄여 달라고 한다', to: x => { x.months -= x.kind === 'idol' ? 24 : 12; }, done: x => `계약 기간을 ${josa(yrs(x.months), '으로')} 줄이기로 했다.` });
  if (d.mMax && d.months < d.mMax) A.push({ k: 'mUp', t: '계약 기간을 늘려 달라고 한다', to: x => { x.months += 12; }, done: x => `계약 기간을 ${josa(yrs(x.months), '으로')} 늘리기로 했다.` });
  if (d.sal && !(d.salCap && d.sal >= d.salCap)) A.push({ k: 'sal', t: '월급을 올려 달라고 한다', to: x => { x.sal = Math.min(x.salCap || Infinity, Math.round(x.sal * 1.15 / 1e5) * 1e5); }, done: x => `월급을 ${josa(fmtWon(x.sal), '으로')} 올리기로 했다.` });
  if (d.bonus) A.push({ k: 'bonus', t: '계약금을 올려 달라고 한다', to: x => { x.bonus = Math.round(x.bonus * 1.3 / 1e5) * 1e5; }, done: x => `계약금을 ${josa(fmtWon(x.bonus), '으로')} 올리기로 했다.` });
  if (d.feeR != null && d.feeR < 1) A.push({ k: 'feeR', t: '연출료를 올려 달라고 한다', to: x => { x.feeR = Math.min(1, Math.round((x.feeR + 0.15) * 100) / 100); }, done: x => `연출료를 프리랜서의 ${josa(pctN(x.feeR), '으로')} 올리기로 했다.` });
  return A.filter(a => !d.tried.includes(a.k));
}
// 계약서로 시작하는 직업 (v104 겸직): 재계약이 아니면 그 직업 · 자리로 겸직 규칙을 본다
const NEGO_JOB = { idol: ['idol', 'trainee'], band: ['band', 'artist'], solo: ['solo', 'artist'], actor: ['actor', 'artist'], model: ['model', 'artist'], vidol: ['vidol'], dancer: ['dancer'], director: ['director'], mcn: ['youtube'], marketer: ['marketer', 'emp'], anr: ['anr', 'emp'], trainer: ['trainer', 'emp'], acttrainer: ['acttrainer', 'emp'], producer: ['producer', 'emp'], editor: ['editor', 'emp'], animator: ['animator', 'emp'] };
function negoJobWhy(s, d) { if (d.renew) return ''; const x = d.kind === 'wbcp' ? [d.id] : NEGO_JOB[d.kind]; return x && x[0] ? jobBlock(s, x[0], x.slice(1)) : ''; }
function startNego(s, d) { const x = Object.assign({ tried: [], lev: 0.3 }, d); x.orig = x.orig || { sal: x.sal, months: x.months, cut: x.cut, bonus: x.bonus }; fireEvent(s, 'contract_nego', x); return ''; }
E({
  id: 'contract_nego', cat: '계약', title: (s, d) => d.renew ? '재계약 조건' : '계약 조건', tag: 'career',
  text: (s, d) => { const N = NEGO[d.kind]; return (d.note ? d.note + '\n\n' : '') + (d.tried.length ? `${d.agN}의 ${d.renew ? '재계약' : '계약'} 조건이 이렇게 됐다.` : `${d.agN}에서 ${d.renew ? '재계약 조건을' : '계약서를'} 내밀었다. ${typeof N.what === 'function' ? N.what(d) : N.what}`) + `\n\n${negoTerms(d)}` + (d.oneAsk && d.tried.length ? '' : `\n\n${d.oneAsk ? '조건 중 한 가지만 원하는 쪽으로 바꿔 달라고 할 수 있다' : '마음에 들지 않는 조건은 한 가지씩 바꿔 달라고 할 수 있다'}. 요구가 받아들여지지 않으면 원래 조건으로 돌아오지만, 회사가 제안을 거둬들일 수도 있다.`); },
  ch(s, d) {
    const N = NEGO[d.kind], why = negoJobWhy(s, d) || (N.block ? N.block(s, d) : '');
    const o = [{ t: d.renew ? '이 조건으로 재계약한다' : '이 조건으로 계약한다', ok: () => !why, h: why, f: s => N.sign(s, d) }];
    for (const a of negoAsks(d)) {
      const p = negoP(d), r = negoRisk(d);
      o.push({ t: a.t, ok: () => !why, h: `받아들여질 가능성 ${fmtPct(p)} · 안 되면 회사가 제안을 거둬들일 가능성 ${fmtPct(r)}`, f: s => {
        const nd = Object.assign({}, d, { tried: d.tried.concat(a.k) });
        if (U.chance(p)) { a.to(nd); if (N.retune) N.retune(nd, a.k); nd.note = NOW('요구가 받아들여졌다! ' + a.done(nd)); fireEvent(s, 'contract_nego', nd); return a.done(nd); }
        // 회사가 제안을 거둬들이면 창으로 분명히 알려 준다
        if (U.chance(r)) { const msg = N.lost ? N.lost(s, d) : `${d.agN}에서 계약 이야기를 없던 일로 하자고 했다.` + fx(s, { stress: 5 }); fireEvent(s, 'nego_lost', { msg, renew: !!d.renew }); return msg; }
        nd.note = `요구가 받아들여지지 않았다. ${josa(d.agN, '은는')} 그 조건은 바꿀 수 없다고 했다.`;
        fireEvent(s, 'contract_nego', nd);
        return `${josa(d.agN, '은는')} 그 조건은 바꿀 수 없다고 했다.`;
      } });
    }
    o.push({ t: d.renew ? '재계약하지 않는다' : '계약하지 않는다', f: s => N.refuse ? N.refuse(s, d) : `${d.agN}의 계약 제안을 거절했다.` });
    return o;
  },
});

// 회사가 계약(재계약) 제안을 거둬들였을 때 알려 주는 창
E({
  id: 'nego_lost', cat: '계약', title: (s, d) => d.renew ? '재계약 취소' : '계약 취소', tag: 'career',
  text: (s, d) => d.msg,
  ch: () => [{ t: '확인', f: () => '' }],
});

// ════════ 뮤지컬 (활동 지원) ════════
// 보컬과 연기가 각각 일정 레벨을 넘어야 지원할 수 있다. 인지도를 올리는 데 좋다
const MUSICAL_ROLES = [
  { id: 'ens', n: '앙상블', vocal: 20, acting: 15, fee: 150, fame: 0.6, lines: '합창과 군무' },
  { id: 'sup', n: '조연', vocal: 35, acting: 30, fee: 500, fame: 1, lines: '솔로 넘버 한 곡' },
  { id: 'lead', n: '주연', vocal: 50, acting: 45, fee: 1500, fame: 1.6, lines: '극 전체를 이끈다' },
];
// 뮤지컬 제목 (10-8, v115): 드라마 제목과 같은 방식(dramaPick). 꾸밈말 a · 낱말 n · 틀 p, 가끔 통째 제목 k. 실제 작품 · 이름난 제목은 MUSICAL_BAN으로 막는다
const MUSICAL_WORDS = {
  a: ['그날의', '마지막', '빛나는', '붉은', '푸른', '잊혀진', '하얀', '작은', '영원한', '잠든', '춤추는', '꿈꾸는', '사라진', '겨울의', '여름밤의', '은빛', '황금빛', '첫눈 오는', '길 잃은', '오래된'],
  n: ['정원', '바다', '기차', '골목', '서커스', '시계탑', '등대', '극장', '왕국', '편지', '무도회', '오르골', '피아노', '거리', '우체국', '섬', '카페', '별', '다리', '호텔', '축제', '회전목마', '정거장', '숲', '항구', '광장'],
  p: ['{a} {n}', '{a} {n}', '{n}의 노래', '오페라 {n}', '{n} 이야기', '{n}의 밤', '안녕, {n}', '{n}의 왈츠', '{n} 앞에서', '{n}를 기억해', '{n}와 {m}', '{n} 블루스', '{n} 랩소디', '{n}에 비가 내리면', '{n}의 주인', '어느 {n}의 기억', '{n}는 노래한다'],
  k: ['달빛 오케스트라', '별을 세는 밤', '세 번째 커튼콜', '구름 위의 왈츠', '마지막 무대', '여름의 끝에서', '안녕, 나의 극장', '바람이 머무는 곳', '해 질 녘 세레나데', '소년과 피아노', '그림자 서커스', '푸른 새벽의 노래'],
};
const MUSICAL_BAN = ['바다 이야기', '비밀의 정원', '겨울의 왕국', '마지막 왕국', '그날의 바다', '바다의 노래', '오페라 극장', '하얀 거리', '작은 정원', '별의 노래'];
function musicalTitle() { return freshName(() => dramaPick(MUSICAL_WORDS, MUSICAL_BAN)); }
// v99 (8-5): 보컬 · 연기 강함, 댄스 보통, 표현력 보통(가산점). 무대는 객석에서 멀리 보여서 외모 대신 표현력을 본다
function musicalScore(s) { const p = me(s); return jobMix([[lv(p, 'vocal'), JS_], [lv(p, 'acting'), JS_], [lv(p, 'dance'), JM_]]) + talB(p.tal.express, false); }
function roleOK(s, r) { const p = me(s); return lv(p, 'vocal') >= r.vocal && lv(p, 'acting') >= r.acting; }
function musicalPass(s, r) { const sc = musicalScore(s) - (r.vocal * 0.5 + r.acting * 0.4); return U.clamp(0.35 + sc / 30 + Math.log10(1 + totalFans(s)) * 0.03 + pm(s, 'audition', 0) / 100, 0.05, 0.92); }
ACT_APPLY.push({
  id: 'musical', cat: 'music', n: '뮤지컬 오디션', ic: '🎭',
  h: s => '노래와 연기를 함께 보는 오디션이다. 붙으면 넉 달 동안 연습하고 공연한다. 인지도를 올리기 좋다.',
  ok: s => age(s) >= 15 && MUSICAL_ROLES.some(r => roleOK(s, r)) && !busyWith(s, 'musical') && !hasQ(s, 'musical_res') && !(s.cd.musicalAud > s.t),
  why: s => age(s) < 15 ? '15세부터 지원할 수 있다' : busyWith(s, 'musical') ? '지금 뮤지컬을 하고 있다' : hasQ(s, 'musical_res') ? '결과를 기다리는 중이다' : s.cd.musicalAud > s.t ? '얼마 전에 오디션을 봤다' : '아직 노래와 연기 실력이 오디션을 보기엔 모자라다',
  run: s => { fireEvent(s, 'musical_aud', {}); return ''; },
});
// 뮤지컬 제작사·극단
const MUSICAL_CO = ['극단 들꽃', '스테이지원', '일곱빛 컴퍼니', '하늘극장 제작소', '커튼콜 뮤지컬', '극단 물결', '오버추어 컴퍼니', '앙코르 프로덕션', '피날레 뮤지컬', '극단 등불',
  '무대공방 아리', '스포트라이트 컴퍼니', '극단 동틀녘', '아리아 씨어터', '백스테이지 컴퍼니', '앙상블 스테이지'];
E({
  id: 'musical_aud', cat: '활동 지원', title: '뮤지컬 오디션', tag: 'career',
  init(s, d) { d.title = musicalTitle(); d.co = U.pick(MUSICAL_CO); },
  text: (s, d) => `${d.co}에서 새 뮤지컬 「${d.title}」 배우를 뽑는다. 어떤 역할에 지원할까?`,
  ch: (s, d) => MUSICAL_ROLES.map(r => ({ t: `${r.n} (${r.lines})`, ok: s => roleOK(s, r), h: roleOK(s, r) ? `붙을 가능성 ${fmtPct(musicalPass(s, r))}` : '노래와 연기 실력이 더 필요하다', f: s => { s.cd.musicalAud = s.t + 6; queueEv(s, 'musical_res', 1, { r: r.id, title: d.title, co: d.co, p: musicalPass(s, r) }); return `${d.co}의 뮤지컬 「${d.title}」 ${r.n} 오디션을 봤다.`; } })).concat([{ t: '그만둔다', f: () => '이번 오디션은 보지 않기로 했다.' }]),
});
E({
  id: 'musical_res', cat: '활동 지원', title: '뮤지컬 오디션 결과', tag: 'career',
  init(s, d) { d.pass = U.chance(d.p); },
  text: (s, d) => d.pass ? `「${d.title}」 ${MUSICAL_ROLES.find(r => r.id === d.r).n} 오디션에 붙었다!` : `「${d.title}」 오디션에 떨어졌다.`,
  ch: (s, d) => d.pass ? [{ t: '연습에 들어간다', f: s => startMusical(s, d.r, d.title, d.co) }] : [{ t: '다음에 다시', f: s => '다음 기회를 노리기로 했다.' + fx(s, { stress: 3 * pm(s, 'loseStress') }) }],
});
function startMusical(s, roleId, title, co) {
  const r = MUSICAL_ROLES.find(x => x.id === roleId);
  const w = startWork(s, 'musical', { title, role: roleId, co, months: 4, slot: true });
  const cast = [];
  for (let i = 0; i < U.int(3, 5); i++) cast.push(pickIndustry(s, '뮤지컬 배우', p => !cast.includes(p)));
  cast.push(pickIndustry(s, '뮤지컬 연출가')); cast.push(pickIndustry(s, '음악감독'));
  w.cast = cast.map(p => p.id);
  for (const p of cast) meetAt(s, p, `뮤지컬 「${title}」`, 'musical', co || '');
  milestone(s, `${age(s)}세에 뮤지컬 「${title}」에 ${r.n}${josa(r.n, '으로').slice(r.n.length)} 섰다.`);
  return `뮤지컬 「${title}」 ${josa(r.n, '으로')} 연습을 시작했다. 연출은 ${cast[cast.length - 2].name}, 음악감독은 ${cast[cast.length - 1].name}.`;
}
WORK_TYPES.musical = {
  n: '뮤지컬', ic: '🎭',
  status: (s, w) => `「${w.title}」 ${MUSICAL_ROLES.find(r => r.id === w.role).n} · ${w.left > 2 ? `연습 중 (첫 공연까지 ${w.left - 2}개월)` : `공연 중 (막공까지 ${w.left}개월)`}`,
  // 작품을 하는 동안 실력이 실전으로 는다 (직업 경험)
  monthly(s, w) {
    const p = me(s);
    useSkill(s, p, 'vocal', 3); useSkill(s, p, 'acting', 2.5); useSkill(s, p, 'dance', 1.2);
    addStress(s, w.left > 2 ? 3 : 5);
    // 같이 연습하며 조금씩 친해진다. 가끔 부딪힌다
    for (const c of workPeople(s, w)) bond(s, c, U.chance(0.12) ? -U.int(4, 10) : U.int(0, 3));
    if (U.chance(0.12)) { const c = U.pick(workPeople(s, w)); bond(s, c, -12); addLog(s, `연습실에서 ${josa(c.name, '과와')} 동선 문제로 크게 부딪혔다.`); }
  },
  finish(s, w) {
    const r = MUSICAL_ROLES.find(x => x.id === w.role), cast = workPeople(s, w);
    const castAvg = cast.reduce((a, c) => a + Math.max(lv(c, 'vocal'), lv(c, 'direct'), lv(c, 'compose')), 0) / Math.max(1, cast.length);
    const sc = U.clamp(musicalScore(s) * 0.55 + castAvg * 0.45 + U.normal(0, 7), 0, 100);
    // 평 다섯 단계: 대호평이면 재관람 열풍으로 팬이 크게 늘고, 대혹평이면 팬이 떠난다
    const lvR = sc >= 85 ? 2 : sc >= 68 ? 1 : sc >= 48 ? 0 : sc >= 35 ? -1 : -2;
    const fans = lvR < -1 ? -Math.round(s.fans.kr * 0.03) : Math.round(Math.max(0, fanGain(s, sc, 'kr', r.fame)) * (lvR > 1 ? 2.5 : 1));
    const fee = Math.round(r.fee * 1e4 * (1 + Math.log10(1 + totalFans(s)) * 0.15));
    earn(s, fee, '뮤지컬 출연료');
    s.fans.kr = Math.max(0, s.fans.kr + fans);
    const review = { 2: '평단과 관객의 극찬이 쏟아졌다. 다시 보러 오는 관객이 줄을 섰다', 1: '좋은 평을 받았다', 0: '무난하다는 평을 받았다', '-1': '아쉽다는 평이 많았다', '-2': '혹평이 쏟아졌다. 공연이 이어질수록 객석이 비어 갔다' }[lvR];
    for (const c of cast) bond(s, c, sc >= 60 ? U.int(4, 10) : U.int(-6, 3));
    jpopAll(s, (sc - 50) / 15 + (lvR > 1 ? 4 : lvR < -1 ? -4 : 0)); if (lvR > 0) addFame(s, lvR * 1.5);
    addWork(s, { type: '뮤지컬', title: w.title, sc, pay: fee, note: `${r.n} · ${{ 2: '대호평', 1: '호평', 0: '무난', '-1': '아쉬움', '-2': '대혹평' }[lvR]}` });
    if (sc >= 65) s.flags.musicalGood = (s.flags.musicalGood || 0) + 1;
    const best = cast.slice().sort((a, b) => b.aff - a.aff)[0];
    const text = `뮤지컬 「${w.title}」의 마지막 공연이 끝났다. ${review}.\n\n출연료 ${fmtWon(fee)} · 팬 ${sgnFans(fans)}\n${best ? `${josa(best.name, '과와')} 가장 가까워졌다.` : ''}`;
    return { text, log: `뮤지컬 「${w.title}」 ${r.n} — ${review}. (출연료 +${fmtWon(fee)} · 팬 ${sgnFans(fans)})` };
  },
};
// 잘 해낸 적이 있거나 이름이 알려지면 제작사가 먼저 역할을 제안한다 (메시지함)
INBOX.musical_offer = {
  ic: '🎭',
  text: (s, m) => `뮤지컬 「${m.d.title}」 ${MUSICAL_ROLES.find(r => r.id === m.d.r).n} 역할을 맡아 달라는 제안이다. 오디션 없이 바로 들어갈 수 있다.`,
  ch: (s, m) => [
    { t: '수락한다', ok: s => !busyWith(s, 'musical'), h: busyWith(s, 'musical') ? '지금 다른 뮤지컬을 하고 있다' : '넉 달 동안 연습하고 공연한다', f: s => startMusical(s, m.d.r, m.d.title, m.from) },
    { t: '거절한다', f: s => `${m.from}의 뮤지컬 제안을 거절했다.` },
  ],
};
E({
  id: 'musical_offer_gen', cd: 18, cat: '제안', title: '뮤지컬 제안',
  p: s => (s.flags.musicalGood || 0) > 0 || totalFans(s) >= 20000 ? 0.04 : 0,
  // 해낼 수 있는 배역이 하나라도 있어야 제안이 온다 (노래·연기가 앙상블 기준에 못 미치면 오지 않는다)
  cond: s => age(s) >= 16 && !busyWith(s, 'musical') && !s.inbox.some(m => m.kind === 'musical_offer') && MUSICAL_ROLES.some(r => roleOK(s, r)),
  init(s, d) {
    const r = [...MUSICAL_ROLES].reverse().find(r => roleOK(s, r));
    if (!r) { d.skip = true; return; }
    sendMsg(s, 'musical_offer', { from: U.pick(MUSICAL_CO), title: `뮤지컬 ${r.n} 제안`, months: 6, d: { r: r.id, title: musicalTitle() } });
    s.cd.musical_offer_gen = s.t + 18;
    d.skip = true;
  },
});
