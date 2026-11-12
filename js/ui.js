'use strict';
// 화면 그리기와 버튼 처리

const $ = (sel, el = document) => el.querySelector(sel);
const UI = { speed: 1, lastSpeed: 1, overlay: null, timer: null, minimized: false, acts: [], onConfirm: null, openCats: {}, openGroups: { artist: true, staff: true, biz: true }, apTab: {}, trk: null, kid: null, pickSlot: null, pickQ: '', logLen: -1, logAge: -1 };
const SPEED_MS = { 1: 1500, 2: 750, 4: 360, 8: 160 };
// 모든 직업 파일을 읽었으니 직업 · 활동 지원에 자숙과 겸직 규칙을 씌운다 (game.js)
gateApplies();

function show(id) { document.querySelectorAll('.screen').forEach(e => e.classList.toggle('hidden', e.id !== id)); }
function nl(t) { return U.esc(t).replace(/\n/g, '<br>'); }
// 사건 글자 꾸미기: WAS(취소선)·NOW(초록색) 표시를 태그로 바꾼다 (inbox.js)
// 평가 색 (v132): \u0005…\u0007 = 좋은 평(초록), \u0006…\u0007 = 나쁜 평(빨강). 표시가 없으면 애매한 평(검정). music.js evG · evB가 붙인다
function evCol(html) { return html.replace(/\u0005([^\u0007]*)\u0007/g, '<span class="ev-g">$1</span>').replace(/\u0006([^\u0007]*)\u0007/g, '<span class="ev-b">$1</span>'); }
function rich(t) { return evCol(nl(t).replace(/\u0001([^\u0002]*)\u0002/g, '<s class="was">$1</s>').replace(/\u0003([^\u0004]*)\u0004/g, '<b class="now">$1</b>')); }
let toastTimer = null;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); }
function askConfirm(text, yes) {
  UI.onConfirm = yes;
  $('#ccard').innerHTML = `<div class="m-text">${nl(text)}</div><div class="choices"><button class="btn primary" data-confirm="1">네</button><button class="btn" data-confirm="0">아니요</button></div>`;
  $('#confirm').classList.remove('hidden');
}
function bar(v, max = 100, cls = '') { return `<div class="bar ${cls}"><i style="width:${U.clamp(v / max * 100, 0, 100)}%"></i></div>`; }

// ───── 시간 흐름 (턴제 실험, turn-test 갈래) ─────
// 실시간으로 흐르지 않는다. '진행'(Space)을 누르면 창(사건)이 뜨거나, 새 메시지가 오거나, 6개월(7세 전에는 1년)이 지날 때까지 한 달씩 넘어간다
// 넘어가는 동안 화면이 어두워지고 가운데에서 날짜가 넘어간다. 멈추면 그 사이 인생 기록을 모은 요약 창이 뜬다 (FM의 지난주 결과처럼)
// 고를 게 없는 사건은 창 없이 바로 처리되어 요약 창의 '특별한 일'에 강조된다 (game.js autoEvs)
const TURN_MS = 230;
// 일정 칸이 생기기 전(초등학교 입학 전)에는 최대 24개월까지 넘어가다 특별한 일(일상이 아닌 기록)이 생기면 멈춘다 (v121: 예전엔 7세까지 제한 없이)
// 초등학교에 들어가 일정을 정할 수 있게 되면 그 달에 멈추고, 그 뒤로는 최대 6개월
function turnMax(s) { return slotCount(s) ? 6 : 24; }
function turnKidSpecial(s, T) { const i = T.last ? s.log.lastIndexOf(T.last) + 1 : 0; return s.log.slice(i).some(x => x.k !== 'flavor'); }
// 예전 실시간 흐름을 부르던 자리(startLoop · kickLoop)는 그대로 두고 아무것도 하지 않는다
function startLoop() { }
function stopLoop() { clearTimeout(UI.timer); }
function kickLoop() { }
function ymOfT(s, t) { const m = s.birthMonth + t; return { y: s.birthYear + Math.floor(m / 12), m: m % 12 + 1 }; }
function turnGo(max) {
  const s = S;
  if (!s || s.ended || UI.turn) return;
  if (s.pending) { UI.minimized = false; showEvent(); return; }
  if (UI.overlay) closePanel();
  const p = me(s);
  // 요약에는 이번에 넘어간 동안 생긴 일만 넣는다 (창에서 고른 결과 · 버튼으로 한 일은 이미 아는 일이라 넣지 않는다)
  UI.turn = { max, kid: !slotCount(s), n: 0, last: s.log[s.log.length - 1] || null, t0: s.t, inbox: new Set(s.inbox.map(m => m.id)), money: s.money, fans: totalFans(s), stress: Math.round(s.stress), g0: growSnap(s), why: '', co: trackOn(s, 'agency') ? s.tracks.agency.money : null, inc: (MONEY_TAP = {}) };
  $('#tcard').innerHTML = turnRunHTML(s);
  $('#turn').classList.remove('hidden');
  UI.timer = setTimeout(turnStep, TURN_MS);
}
function turnStep() {
  const s = S, T = UI.turn;
  if (!s || !T) return;
  // 한 달 진행 중에 오류가 나도 게임이 멈추지 않게 한다 (오류는 콘솔에 남긴다)
  try { tick(s); } catch (e) { console.error('한 달 진행 오류', e); toast('이번 달 계산에 문제가 있어 일부를 건너뛰었어요'); }
  T.n++;
  save(s); render();
  T.why = s.ended ? 'end' : s.pending ? 'ev' : s.inbox.some(m => !T.inbox.has(m.id)) ? 'msg' : T.n >= T.max ? 'max' : T.kid && (slotCount(s) || turnKidSpecial(s, T)) ? 'sp' : '';
  $('#tcard').innerHTML = T.why ? turnSumHTML(s, T) : turnRunHTML(s);
  if (!T.why) UI.timer = setTimeout(turnStep, TURN_MS);
}
// 넘어가는 중: 가운데에 날짜와 몇 번째 달인지
function turnRunHTML(s) {
  const T = UI.turn, d = ymOfT(s, s.t);
  // 7세 전처럼 달 수 제한이 길면 점 대신 몇 달째인지 쓴다
  const pips = T.max <= 12 ? `<div class="tr-pips">${Array.from({ length: T.max }, (_, i) => `<i class="${i < T.n ? 'on' : ''}"></i>`).join('')}</div>` : `<div class="tr-k">${T.n + 1}개월째</div>`;
  // 일상 기록은 생기는 대로 아래에 차례로 쌓인다 (v124). 최근 것이 맨 아래, 이번 달에 생긴 줄은 살짝 떠오른다
  const i0 = T.last ? s.log.lastIndexOf(T.last) + 1 : 0, F = s.log.slice(i0).filter(x => x.k === 'flavor' && x.t > T.t0).slice(-7);
  const feed = `<div class="tr-feed">${F.map(x => `<div class="tr-f${x.t === s.t ? ' new' : ''}"><span class="ts-mo">${ymOfT(s, x.t).m}월</span><span>${nl(x.x)}</span></div>`).join('')}</div>`;
  return `<div class="tr-run"><div class="tr-k">진행 중</div><div class="tr-date">${d.y}년 ${d.m}월</div>${pips}</div>${feed}`;
}
// 요약 창: '✨ 특별한 일'은 칸마다 상자에 나눠 담고(맨 아래는 성장), '☕ 일상'은 펼쳐 둔 트리 뷰
// 칸: 직업 · 성과 · 제안 · 사람 · 학교 · 돈 · 소식 · 기타 · 성장. 기록 종류(k), 사건 분류(c) · 사건(e), 결과 표시(r), 글로 정한다
const TS_CATS = [['job', '💼', '직업'], ['win', '🏆', '성과'], ['offer', '📨', '제안'], ['ppl', '👪', '사람'], ['school', '🏫', '학교'], ['money', '💰', '돈'], ['news', '📰', '소식'], ['etc', '🗂️', '기타'], ['grow', '📈', '성장']];
const TS_BY_C = { 배움: 'grow', 재능: 'grow', 특기: 'grow', '연말 시상식': 'win', '작품 성적': 'win', '음원 성적': 'win', '앨범 성적': 'win', '애니 성적': 'win', 가족: 'ppl', 친구: 'ppl', 연애: 'ppl', 결혼: 'ppl', '첫 돌': 'ppl', 초등학교: 'school', 중학교: 'school', 학교: 'school', '학창 시절': 'school', 진학: 'school', 돈: 'money', 독립: 'money', 알림: 'news', '📝 지원': 'job', 병역: 'news', 캐스팅: 'job', 방송: 'job' };
// 직업 활동의 결과로 뜨는 창 (고를 게 없어 창 없이 처리되면 '성과' 칸)
const TS_RES_EV = new Set(['actor_res', 'work_res', 'dir_res', 'script_res', 'band_relres', 'solo_relres', 'player_relres', 'w_res', 'co_res', 'co_vres', 'co_ares', 'idol_cbres', 'idol_survres', 'tv_audres', 'mask_res', 'mk_cb_res', 'mk_launch_res', 'mk_ad_res', 'anr_out', 'tr_eval', 'atr_eval', 'tu_res', 'tu_ol_res']);
function tsCat(x) {
  const t = x.x, c = x.c || '';
  // 다른 사람 소식 (친구 취업 · 청첩장 · 아이 입학)
  if (x.k === 'news') return 'news';
  // 입학식 · 영어 시간처럼 학교에서 생긴 일은 새 특기를 배웠어도 학교 칸에
  if (TS_BY_C[c] === 'school') return 'school';
  if (/\[새 특기:/.test(t)) return 'grow';
  if (/제안이 왔다|^📨/.test(t)) return 'offer';
  if (x.r || x.k === 'good' || TS_RES_EV.has(x.e) || /🏆|상을 받았|1위|돌파/.test(t)) return 'win';
  if (TS_BY_C[c]) return TS_BY_C[c];
  if (/태어났다|돌아가셨|사귀기 시작|결혼했|헤어졌|이혼했/.test(t)) return 'ppl';
  if (/입학했다|졸업했다/.test(t)) return 'school';
  if (/판도가 바뀌었|대세다/.test(t)) return 'news';
  if (/돈이 모자라|학원비|빚|대출|월세|용돈|세뱃돈/.test(t)) return 'money';
  if (x.k === 'career' || x.k === 'bad') return 'job';
  return 'etc';
}
// 성장: 특기 레벨 · 재능 · 숙련도 · 평판 · 인지도. 넘어가기 전과 뒤를 견줘 오른 것만 '보컬 3→5레벨이 되었다.'처럼 한 줄씩
const TS_MAST = [['cmast', '곡 컨셉'], ['chm', '안무 컨셉'], ['emast', '편집', k => (typeof EM_N !== 'undefined' && EM_N[k]) || k], ['anm', '작화 장르'], ['adm', '애니 연출 장르'], ['tum', '과목'], ['ilm', '일러스트 분야', k => ((typeof IL_JOBS !== 'undefined' && IL_JOBS.find(j => j.id === k)) || { n: k }).n], ['dmast', '연출'], ['smast', '각본']];
function growSnap(s) {
  const p = me(s), o = { sk: {}, tal: {}, m: {}, 평판: Math.round(s.rep), 인지도: Math.round(s.fame || 0) };
  for (const k of learnedSkills(p)) o.sk[k] = lvi(p, k);
  for (const x of TALENTS_SHOWN) o.tal[x.id] = p.tal[x.id];
  for (const [key, n, nm] of TS_MAST) {
    const M = s[key] || {};
    const put = (k, v, name) => { if (v >= 1) o.m[`${key}|${k}`] = { n: `${n} 숙련도 · ${name}`, v: Math.floor(v) }; };
    if (key === 'dmast' || key === 'smast') { for (const k in M.g || {}) put('g' + k, M.g[k], k); for (const k in M.f || {}) put('f' + k, M.f[k], (typeof DIR_PJ !== 'undefined' && DIR_PJ[k]) ? DIR_PJ[k].n : k); }
    else for (const k in M) put(k, M[k], nm ? nm(k) : k);
  }
  return o;
}
function growLines(a, b) {
  const L = [];
  for (const k in b.sk) if (a.sk[k] != null && b.sk[k] > a.sk[k]) L.push(`${SKILLS[k].n} ${a.sk[k]}→${b.sk[k]}레벨이 되었다.`);
  for (const k in b.tal) if (b.tal[k] > a.tal[k]) L.push(`${TALENT_BY[k].n} 재능 ${a.tal[k]}→${b.tal[k]}`);
  for (const k in b.m) { const v0 = a.m[k] ? a.m[k].v : 0; if (b.m[k].v > v0) L.push(`${b.m[k].n} ${v0}→${b.m[k].v}`); }
  for (const k of ['평판', '인지도']) if (b[k] > a[k]) L.push(`${k} ${a[k]}→${b[k]}`);
  return L;
}
function turnSumHTML(s, T) {
  // 아직 안 본 창(사건)이 준비하며 남긴 기록 · 돈 · 팬 · 성장은 그 창을 보기 전에 새어 나가지 않게 한다 (v129, game.js fireEvent의 pre)
  const P = s.pending && s.pending.pre ? s.pending : null, pre = P ? P.pre : null;
  const i = T.last ? s.log.lastIndexOf(T.last) + 1 : 0, L = s.log.slice(i).filter(x => x.t > T.t0 && !(P && x.sp === P.tok)), p = me(s);
  const a = ymOfT(s, T.t0 + 1), b = ymOfT(s, s.t);
  const range = T.n === 1 ? `${b.y}년 ${b.m}월` : `${a.y}년 ${a.m}월 ~ ${a.y === b.y ? '' : b.y + '년 '}${b.m}월`;
  let h = `<div class="ts-h"><div class="ts-t">${T.n === 1 ? '지난달' : T.n === 12 ? '지난 1년' : `지난 ${T.n}개월`}</div><div class="ts-r">${range}</div></div>`;
  // 바뀐 것: 돈 · 팬 · 스트레스
  const dm = (pre ? pre.money : s.money) - T.money, df = (pre ? pre.fans : totalFans(s)) - T.fans, st = Math.round(pre ? pre.stress : s.stress);
  const ch = [`<span class="${dm >= 0 ? 'pos' : 'neg'}">돈 ${dm >= 0 ? '+' : '-'}${fmtWon(Math.abs(dm))}</span>`].concat(df ? [`팬 ${df > 0 ? '+' : '-'}${fmtFans(Math.abs(df))}`] : [], st !== T.stress ? [`스트레스 ${T.stress}→${st}`] : []);
  // 회사 대표면 자본금 변화도 (v118 UI A3)
  if (T.co != null && trackOn(s, 'agency')) { const dc = (pre && pre.co != null ? pre.co : s.tracks.agency.money) - T.co; ch.splice(1, 0, `<span class="${dc >= 0 ? 'pos' : 'neg'}">자본금 ${dc >= 0 ? '+' : '-'}${fmtWon(Math.abs(dc))}</span>`); }
  MONEY_TAP = null;
  h += `<div class="ts-ch">${ch.map(x => `<span class="chip">${x}</span>`).join('')}</div>`;
  // 일상은 같은 문장을 한 요약에 한 번만 (v118 UI A2)
  const main = L.filter(x => x.k !== 'flavor'), flav = L.filter(x => x.k === 'flavor').filter((x, i, A) => A.findIndex(y => y.x === x.x) === i);
  const box = {};
  for (const x of main) (box[tsCat(x)] = box[tsCat(x)] || []).push(x);
  // 성장 칸 맨 아래: 이번에 오른 특기 · 재능 · 숙련도 · 평판 · 인지도 (이번에 처음 배운 특기는 위에 따로 있다)
  const ups = growLines(T.g0, pre && pre.grow ? pre.grow : growSnap(s)).map(x => ({ x, up: true }));
  if (ups.length) (box.grow = box.grow || []).push(...ups);
  // 큰 정산이 들어왔으면 돈 칸에 한 줄 (v118 UI A4): 한 번에 1,000만 원 넘게 들어왔고 매달 들어오는 돈이 아닌 것
  const bigs = Object.entries(T.inc || {}).filter(([k, o]) => !o.reg && o.big >= 1000e4 && !(pre && pre.tap && pre.tap[k])).sort((a, b) => b[1].v - a[1].v).slice(0, 3).map(([k, o]) => ({ x: `💰 ${k} +${fmtWon(o.v)}`, up: true }));
  if (bigs.length) (box.money = box.money || []).unshift(...bigs);
  const mo = T.n > 1;
  h += `<div class="ts-body"><div class="ts-sec">✨ 특별한 일</div>`;
  if (!main.length && !ups.length && !bigs.length) h += `<div class="empty">특별한 일 없이 지나갔다.</div>`;
  for (const [id, ic, n] of TS_CATS) {
    const B = box[id];
    if (!B) continue;
    h += `<div class="ts-box ${id}"><div class="ts-bh">${ic} ${n}</div>` + B.map(x => { const hh = LOG_HTML.get(x), si = x.e ? songIdx(s, x) : -1; return `<div class="ts-i${si !== -1 ? ' ts-song' : ''}"${si !== -1 ? ` data-song="${si}"` : ''}>${mo ? `<span class="ts-mo">${x.up ? '' : ymOfT(s, x.t).m + '월'}</span>` : ''}<span class="ts-x">${hh ? `<div class="ts-html">${hh}</div>` : nl(x.x)}${x.sub ? `<span class="ts-sub">${nl(x.sub)}</span>` : ''}${id === 'win' && x.dv ? `<span class="ts-dv">${x.dv.map(([k, d]) => `<span class="${d > 0 ? 'pos' : 'neg'}">${U.esc(k)} ${d > 0 ? '+' : ''}${d}</span>`).join('')}</span>` : ''}${x.lv ? liveBtnHTML(x.lv, '무대 보기') : ''}${x.pl ? plioBtnHTML(x.pl) : ''}</span></div>`; }).join('') + `</div>`;
  }
  if (flav.length) h += `<details class="ts-more" open><summary>☕ 일상 ${flav.length}건</summary>${flav.map(x => `<div class="ts-i flavor">${mo ? `<span class="ts-mo">${ymOfT(s, x.t).m}월</span>` : ''}<span class="ts-x">${nl(x.x)}</span></div>`).join('')}</details>`;
  h += `</div>`;
  const why = T.why === 'ev' ? '📌 결정할 일이 생겼다' : T.why === 'msg' ? '📨 새 메시지가 왔다' : '';
  if (why) h += `<div class="ts-why">${why}</div>`;
  h += `<div class="choices ts-btns">${T.why === 'msg' ? `<button class="btn" data-turnok="inbox">📨 메시지함 열기</button>` : ''}<button class="btn primary" data-turnok="">확인 <kbd>Space</kbd></button></div>`;
  return h;
}
// 장래희망 발표 (피드백): 정해진 달이 없다. 9세가 된 해에 진행이 멈추면 요약 창 다음에 덧붙여 뜬다
function dreamNow(s) {
  if (s.pending || s.ended || s.done.dream || age(s) < 9 || age(s) > 11) return;
  fireEvent(s, 'dream', {});
}
// 버튼으로 한 일 다음에 생긴 사건: 고를 게 없으면 창 없이 처리하고 알림으로 보여 준다
function actAuto(s) { const n0 = s.log.length; autoEvs(s); pullNow(s); if (s.log.length > n0) toast(s.log[s.log.length - 1].x); }
// 요약 창을 닫는다: 사건이 있으면 사건 창, 인생이 끝났으면 결산, 메시지를 보러 가면 메시지함
function turnClose(next) {
  if (!UI.turn || !UI.turn.why) return;
  UI.turn = null;
  $('#turn').classList.add('hidden');
  if (!S.ended && next !== 'inbox') dreamNow(S);
  render();
  if (S.ended) { showEnding(); return; }
  if (S.pending) { UI.minimized = false; showEvent(); return; }
  if (next === 'inbox') openPanel('inbox');
}

// ───── 첫 화면 ─────
function showTitle() {
  stopLoop(); closeAll();
  const sv = loadSave();
  $('#btn-continue').classList.toggle('hidden', !sv || !!sv.ended);
  if (sv && !sv.ended) $('#continue-info').textContent = `(${sv.people[sv.me].name} · ${age(sv)}세)`;
  show('title-screen');
}
function closeAll() { ['#modal', '#panel', '#confirm', '#turn'].forEach(id => $(id).classList.add('hidden'));  UI.overlay = null; UI.turn = null; clearTimeout(UI.timer); }

// ───── 태어나기 ─────
function showBirth() { S = newLife(); renderBirth(); show('birth-screen'); }
// 탄생 창: 설명 없이 정보만. 위에 이름, 왼쪽에 기본 정보 표, 오른쪽에 재능 막대
function renderBirth() {
  const s = S, p = me(s), r = REGION_BY[s.region], m = mom(s), d = dad(s);
  const gf = gifts(p).filter(k => k !== 'looks' && k !== 'star');
  const pips = `<span class="bp-pips">${Array.from({ length: 10 }, (_, i) => `<i class="${i < s.wealth ? 'on' : ''}"></i>`).join('')}</span>`;
  const rows = [
    ['태어난 곳', U.esc(`${s.place}`)],
    ['집안 형편', `${pips}<span>${U.esc(wealthWord(s.wealth))} 집 · ${s.wealth}/10</span>`],
    ['엄마', m ? U.esc(`${pAge(s, m)}세 · ${m.job}`) : '-'],
    ['아빠', d ? U.esc(`${pAge(s, d)}세 · ${d.job}`) : '없음'],
    ['형제자매', s.olderSib ? `위로 ${s.olderSib}명` : '없음'],
    ['성격', U.esc(PERSONA_BY[s.persona].n)],
    ['건강', U.esc(HEALTH_BY[s.health].n)],
  ];
  // 재능은 수치가 높은 것부터 위에서 아래로 (피드백 19)
  const tals = talSorted(p).map(t => `<div class="bp-tal${p.tal[t.id] >= 70 ? ' gift' : ''}"><span class="bt-n">${t.n}</span>${bar(p.tal[t.id], 100, 'tal')}<b>${p.tal[t.id]}</b></div>`).join('');
  $('#birth-cards').innerHTML = `<div class="bp-top"><div class="bp-name">${U.esc(p.name)}</div><div class="bp-sub">${p.g === '여' ? '여성' : '남성'} · ${s.birthYear}년 ${s.birthMonth + 1}월생</div>${gf.length ? `<div class="bp-gifts">${gf.map(k => `<span>✨ ${TALENT_BY[k].n}</span>`).join('')}</div>` : ''}</div>`
    + `<div class="bp-body"><div class="bp-info">${rows.map(([k, v]) => `<div class="bp-k">${k}</div><div class="bp-v">${v}</div>`).join('')}</div><div class="bp-tals"><div class="bp-h">재능</div>${tals}</div></div>`;
}

// ───── 게임 화면 ─────
function showGame() {
  closeAll(); UI.logLen = -1; UI.minimized = false;
  show('game-screen');
  render();
  if (S.ended) showEnding(); else if (S.pending) showEvent(); else startLoop();
}
function stageLabel(s) {
  const tops = CAREER_IDS.filter(id => CAREERS[id] && trackOn(s, id) && CAREERS[id].short).map(id => CAREERS[id].short(s, s.tracks[id]));
  if (tops.length) return tops.join(' · ');
  const a = age(s);
  if (s.army) return '군 복무 중';
  const y = schoolYear(s);
  if (y < 1 && a < 19) return a < 1 ? '아기' : '유년기';
  if (y < 7) return '초등학생';
  if (y < 10) return '중학생';
  if (!s.edu.graduated && y <= 12) return `고등학생${s.edu.hs && s.edu.hs !== '일반고' ? ' · ' + s.edu.hs : ''}`;
  if (inUni(s)) return `대학생 · ${s.edu.uni.n}`;
  // 결혼했고 30세가 넘었는데 하는 일이 없으면 전업주부
  if (married(s) && a >= 30 && !s.slots.some(sl => sl.act === 'job')) return '전업주부';
  return s.slots.some(sl => sl.act === 'job') ? '아르바이트 중' : '진로를 찾는 중';
}
// 진행 버튼 (v118 UI A1): 선택 창을 내려 둔 동안에는 '선택 대기중'. 누르거나 스페이스를 치면 그 창이 다시 뜬다 (떠 있던 '다시 보기' 버튼은 없앴다)
function goBtnSync() { const b = $('#btn-go'); if (!b) return; const w = !!(S && S.pending && UI.minimized); b.classList.toggle('waiting', w); b.innerHTML = w ? '선택 대기중 <kbd>Space</kbd>' : '진행 ▶ <kbd>Space</kbd>'; }
function render() {
  if (!S) return;
  // 박스 하나를 그리다 오류가 나도 나머지는 그리고 게임은 계속 간다 (오류는 콘솔에 남긴다)
  for (const f of [renderTop, renderSchedule, renderSide]) { try { f(); } catch (e) { console.error('화면 그리기 오류', f.name, e); } }
  $('#ended-bar').classList.toggle('hidden', !S.ended);
  goBtnSync();
}
function renderTop() {
  const s = S, p = me(s);
  $('#t-name').textContent = p.name;
  $('#t-age').textContent = `${age(s)}세`;
  $('#t-stage').textContent = stageLabel(s);
  // 날짜: 연도 글씨 아래에 1~12월 막대 (달이 갈수록 차오르고, 1월이 되면 처음부터)
  // 막대는 한 번만 만들고 너비만 바꾼다 (그래야 부드럽게 차오른다). 1월로 돌아갈 때는 바로 비운다
  const m = calM(s) + 1, dEl = $('#t-date');
  if (!dEl.querySelector('.dt-bar')) dEl.innerHTML = `<span class="dt-y"></span><span class="dt-bar"><i></i></span>`;
  const bar = dEl.querySelector('.dt-bar');
  bar.classList.toggle('reset', !UI.dateM || m < UI.dateM);
  dEl.querySelector('.dt-y').textContent = `${calY(s)}년 ${m}월`;
  dEl.querySelector('.dt-bar i').style.width = `${(m / 12 * 100).toFixed(2)}%`;
  UI.dateM = m;
  $('#btn-applyjob').classList.toggle('hidden', typeof jobApplies !== 'function');
  $('#btn-applyact').classList.toggle('hidden', typeof actApplies !== 'function');
  // 에고서칭: 커뮤니티에서 내 이름을 찾아본다 (일곱 살부터). 메시지함 줄 맨 끝의 작은 배너
  $('#btn-ego').classList.toggle('hidden', !(typeof commNow === 'function' && age(s) >= 7));
  // 메시지함 버튼 (가운데 줄, 인간관계 아래): 안 읽은 제안이 있으면 버튼 오른쪽 위에 빨간 점
  const unread = s.inbox.filter(m => !m.read).length;
  $('#btn-inbox').innerHTML = `📨 메시지함${s.inbox.length ? ` <span class="cnt">${s.inbox.length}</span>` : ''}${unread ? '<i class="rdot"></i>' : ''}`;
}
function markInboxRead(s) { let ch = false; for (const m of s.inbox) if (!m.read) { m.read = true; ch = true; } return ch; }

// 고정된 칸의 이유 (그 칸 바로 아래에 보인다)
function lockWhy(s, lock) {
  if (lock === 'army') return s.army ? `군 복무 중 · 전역까지 ${s.army.left}개월` : '전역';
  if (lock === 'sick') return s.ill ? `${s.ill.n} · ${s.ill.left}개월 쉰다` : '몸을 회복하는 중';
  if (lock === 'kidteach') { const k = s.kidTeach && s.people[s.kidTeach.id]; return k ? `${k.name}에게 ${josa(SKILLS[s.kidTeach.sk].n, '을를')} 가르치는 중 · ${s.kidTeach.left}개월 남음` : '아이를 가르치는 중'; }
  if (lock === 'proj') { const w = s.projects.find(x => x.slot), W = w && WORK_TYPES[w.type]; return W && W.status ? W.status(s, w) : '맡은 작품'; }
  if (lock && lock[0] === '+') return jobName(lock.slice(3));
  if (lock && lock.startsWith('c_')) {
    const id = lock.slice(2), t = s.tracks[id], C = CAREERS[id];
    // 그 일이 방금 끝났으면(데뷔·탈락·탈퇴) 다음 달에 칸이 풀린다. 그 사이에는 이유를 비워 둔다
    if (!C || !trackOn(s, id)) return '';
    if (id === 'idol') return t.st === 'trainee' ? `${t.agN || '기획사'} 연습시간` : !t.g ? '' : t.promo > 0 ? `${t.g.name} 활동기 · ${t.promo}개월 남음` : `${t.g.name} 그룹 일정`;
    if (id === 'actor' && t.proj) return `「${t.proj.title}」 ${ROLE_N[t.proj.ri]} 촬영 중 · ${t.proj.left}개월 남음`;
    if (id === 'director' && t.proj) return `「${t.proj.title}」 연출 · 촬영 ${t.proj.left}개월 남음`;
    return C ? C.n : '';
  }
  return '';
}
// 일정: 좁고 길게
function renderSchedule() {
  const s = S, p = me(s);
  let h = `<div class="card-h">📅 이번 달 일정</div>`;
  if (!s.slots.length) { $('#slots-card').innerHTML = h + `<div class="empty">아직 어려서 하루하루가 저절로 흘러간다. 초등학교에 들어가면 일정을 정할 수 있다.</div>`; return; }
  h += `<div class="hint" style="margin:calc(var(--sp-1) * -1) 0 var(--sp-2)">칸을 누르면 할 일을 바꿀 수 있어요</div>`;
  s.slots.forEach((sl, i) => {
    const a = actInfo(sl.act), locked = !!sl.lock, fj = fixedJob(sl);
    h += `<div class="slot ${locked ? 'locked' : ''}"><div class="slot-no">${i + 1}번 칸${locked ? ' · 고정' : ''}</div>`;
    // 직업 활동은 늘 고정 칸. 할 일을 안 골랐으면 노란 글씨로 알린다 (칸을 누르면 그 직업 창)
    if (fj) { const x = jobTask(s, fj); h += x ? `<div class="lock-why">💼 ${U.esc(jobName(fj))}${x.n !== a.n ? ` · ${U.esc(x.n)}` : ''}</div>` : `<div class="lock-why warn">⚠ 할 일을 골라야 일한다 (칸을 누르면 고른다)</div>`; }
    else if (locked) { const why = lockWhy(s, sl.lock); if (why) h += `<div class="lock-why">🔒 ${U.esc(why)}</div>`; }
    // 특기 연습은 그 특기, 직업 활동은 그 일과 가장 가까운 특기 하나, 아이 가르치기는 아이 특기를 보여 준다
    const kt = sl.act === 'kidteach' && s.kidTeach && s.people[s.kidTeach.id];
    const sub = a.skill ? `${SKILLS[a.skill].n} ${lvi(p, a.skill)}레벨` : a.trk ? careerSkill(s, a.trk) : kt ? `${kt.name} ${SKILLS[s.kidTeach.sk].n} ${lvi(kt, s.kidTeach.sk)}레벨 · ${s.kidTeach.left}개월 남음` : '';
    h += `<div class="slot-top" ${fj ? `data-job="${fj}"` : locked ? '' : `data-pick="${i}"`}><span class="ic">${a.ic || '❔'}</span><span class="nm">${U.esc(a.n)}${sub ? `<br><span class="hint">${U.esc(sub)}</span>` : ''}</span>${fj ? '<span class="chev">›</span>' : locked ? '' : '<span class="chev">▾</span>'}</div>`;
    // 피아노·키보드를 둘 다 배웠으면 연습할 때 다른 쪽도 절반만큼 는다 (작은 화살표)
    const tw = a.skill && SKILL_TWIN[a.skill], eff = a.eff && tw && has(p, tw) ? a.eff.slice(0, 1).concat([[SKILLS[tw].n, '<small class="arr-s">↑</small>', 1]], a.eff.slice(1)) : a.eff;
    if (eff) h += `<div class="chips">${eff.map(([n, v, good]) => `<span class="chip ${good ? '' : 'bad'}">${n} ${v}</span>`).join('')}</div>`;
    if (!locked && a.les && !lesOK(p, a.skill, 2)) h += `<div class="les"><span class="hint">학원에서 배울 수준을 넘어섰다. 이제는 혼자 연습한다.</span></div>`;
    else if (!locked && a.les) {
      // 일반 학원 수준을 넘어서면 명문 학원만 다닐 수 있다
      if (!lesOK(p, a.skill, 1)) sl.lesLv = 2;
      const ll = lesLv(sl);
      h += `<div class="les"><label><input type="checkbox" data-les="${i}" ${sl.lesson ? 'checked' : ''}> ${U.esc(a.les.n)} 다니기</label>`;
      if (sl.lesson) {
        h += `<div class="payer"><button data-leslv="${i}" data-v="1" class="${ll === 1 ? 'on' : ''}" ${lesOK(p, a.skill, 1) ? '' : 'disabled'}>일반 학원 · 월 ${lesCost(p, a.skill, 1)}만</button><button data-leslv="${i}" data-v="2" class="${ll === 2 ? 'on' : ''}">명문 학원 · 월 ${lesCost(p, a.skill, 2)}만</button></div>`;
        // 가족이 보내 줄 수 있으면 가족이, 아니면 내 돈으로 (고르지 않는다, 피드백 24)
        sl.payer = !graduated(s) && familyCanPay(s, i) ? 'family' : 'me';
        if (sl.payer !== 'family' && s.money < lesCost(p, a.skill, ll) * 1e4) h += `<div class="why">지금 가진 돈으로는 학원비가 모자라다</div>`;
      }
      h += `</div>`;
    }
    h += `</div>`;
  });
  // 고정 일정에 밀려 칸 밖으로 나간 일정 (고정 일정이 끝나면 다시 올라온다)
  const over = (s.slotOver || []).filter(e => !e.dflt);
  if (over.length) h += `<div class="slot-over">⤵ 밀려난 일정: ${over.map(e => U.esc(actInfo(e.act).n)).join(' · ')}<br><span class="hint">고정 일정이 끝나면 다시 올라온다</span></div>`;
  $('#slots-card').innerHTML = h;
}

// 걸어온 길 (v89): 인생 기록 전체. 프로필 창의 '걸어온 길' 탭에 있다 (최신순, 나이마다 머리글). 예전의 굵직한 기록(s.ms)은 인생 결산에서만 보여 준다
function lifeLogHTML(s) {
  const items = s.log.slice(-400).reverse();
  let h = '', lastA = -1;
  for (const it of items) {
    if (it.a !== lastA) { lastA = it.a; h += `<div class="log-y">${it.a}세</div>`; }
    h += `<div class="log-i ${it.k}">${nl(it.x)}${it.lv ? `<div>${liveBtnHTML(it.lv, '무대 보기')}</div>` : ''}${it.pl && plioBtnHTML(it.pl) ? `<div>${plioBtnHTML(it.pl)}</div>` : ''}</div>`;
  }
  return `<div class="log-tab">${h || '<div class="empty">아직 기록이 없다.</div>'}</div>`;
}
// 예전 '걸어온 길' 창을 열면 프로필 창의 걸어온 길 탭으로
function panelLifelog() { UI.pfTab = 'log'; UI.overlay = 'profile'; return panelProfile(); }

// 공개 예정 작품: 찍거나 써 두고 공개(발매)를 기다리는 것들. 빨리 나오는 것부터
const WORK_TRKS = ['actor', 'director', 'writer', 'composer', 'lyricist', 'solo', 'band'];
function upcomingWorks(s) {
  const L = [], q = id => s.queue.filter(x => x.id === id);
  const at = (m, title, what) => L.push({ m, title, what, when: `${ymLater(s, Math.max(0, m - s.t))} 공개` });
  const ta = s.tracks.actor;
  if (ta) for (const w of (ta.wait || [])) at(w.at, w.title, `${PJ_TYPES[w.tk].n} · ${ROLE_N[w.ri]}${w.promo ? ' · 예능에서 홍보함' : ''}`);
  for (const x of q('dir_res')) at(x.at, x.d.pj.title, `${DIR_PJ[x.d.pj.tk].n} · ${x.d.pj.writer === 'me' ? '각본·연출' : '연출'}`);
  for (const sc of (s.scripts || []).filter(x => x.st === 'sold' || x.st === 'fixsold')) at(sc.madeAt, sc.title, `${DIR_PJ[sc.tk].n} · ${sc.genre} · ${sc.st === 'fixsold' ? '각본 수정' : '각본'} · ${sc.co}`);
  for (const x of q('w_res')) at(x.at, x.d.title, `${x.d.a.name} ${x.d.main ? '타이틀곡' : '수록곡'} · ${wJob(x.d.kind)}`);
  for (const x of q('solo_relres')) at(x.at, x.d.title, `내 신곡${x.d.self ? ' · 자작곡' : ''}`);
  for (const x of q('band_relres')) if (s.tracks.band && s.tracks.band.b) at(x.at, x.d.title, `밴드 「${s.tracks.band.b.name}」 신곡${x.d.self ? ' · 자작곡' : ''}`);
  // 수락한 페스티벌 무대 (v117 밸런스 C2)
  for (const x of q('band_fest_play')) if (s.tracks.band && s.tracks.band.b) L.push({ m: x.at, title: x.d.from, what: `🗓️ 밴드 「${s.tracks.band.b.name}」 페스티벌 출연 예정`, when: `${ymLater(s, Math.max(0, x.at - s.t))} 첫 주말 출연` });
  return L.sort((a, b) => a.m - b.m);
}
// 공개 예정 작품 창
function panelSoon() {
  const s = S, L = upcomingWorks(s);
  let h = `<h2>🗓️ 공개 예정 작품</h2>`;
  if (!L.length) return h + `<div class="empty">공개를 기다리는 작품이 없다.</div>`;
  return h + `<div class="trks soon-list">${L.map(w => `<div class="trk soon"><b>「${U.esc(w.title)}」</b><div class="st">${U.esc(w.what)}</div><div class="soon-at">${U.esc(w.when)}</div></div>`).join('')}</div>`;
}
// 직업 이름: 진로 목록과 같은 이름 (연주가만 짧게)
// 밴드 연습생(idol 트랙 kind 'band')은 직업 카드 · 창에서 '밴드 연습생' · 🎸로 보인다 (v116 버그 8). 진로 백과사전 설명은 그대로
function jobName(id) { return id === 'player' ? '연주가' : id === 'idol' && idolIsBand(S) ? '밴드 연습생' : CAREERS[id].n; }
function jobIc(id) { return id === 'idol' && idolIsBand(S) ? '🎸' : CAREERS[id].ic || '⭐'; }
// 직업마다 관련 분야의 유행: 직업 창 맨 위에 그 분야 유행만 보인다 (모델은 없음)
const JOB_FIELD = { idol: 'music', band: 'music', solo: 'music', player: 'music', composer: 'music', lyricist: 'music', producer: 'music', anr: 'music', trainer: 'music', dancer: 'music', animator: 'anime', adir: 'anime', voice: 'anime', webtoon: 'web', webnovel: 'web', actor: 'drama', director: 'drama', writer: 'drama', acttrainer: 'drama', variety: 'show', youtube: 'yt', vidol: 'yt', editor: 'yt', agency: 'music' };
function trendRowHTML(s, only) {
  const tv = s.trendTV || {}, T = { music: ['🎵 음악', s.trend], drama: ['📺 드라마', tv.drama], show: ['😆 예능', tv.show], yt: ['▶️ 인터넷 방송', tv.yt], anime: ['🎨 애니', tv.anime], web: ['📖 웹툰·웹소설', tv.web] };
  return `<div class="trend-row"><span class="tr-h">📈 요즘 유행</span>${(only ? [only] : ['music', 'drama', 'show', 'yt']).map(k => `<span class="tr-i">${T[k][0]} '${U.esc(T[k][1] || '-')}'</span>`).join('')}</div>`;
}
// 오른쪽·왼쪽 박스들. 박스 하나를 그리다 오류가 나도 나머지는 그린다 (오류는 콘솔과 UI.drawErr에 남긴다)
function renderSide() {
  for (const f of [renderProfileCard, renderJobsCard, renderPeopleCard, renderStatusCard, renderMoneyCard, renderLifeCard, renderCoCard]) {
    try { f(); } catch (e) { console.error('화면 그리기 오류', f.name, e); (UI.drawErr = UI.drawErr || []).push(`${f.name}: ${e.message}`); }
  }
}
// 학교: 고등학교(3년), 대학 (군 복무 중이면 휴학)
function schoolLine(s) {
  const u = s.edu.uni;
  if (u && s.t < u.end) return [`🎓 ${u.n}`, s.army ? `휴학 중 (군 복무) · 졸업까지 ${u.end - s.t}개월` : `졸업까지 ${u.end - s.t}개월`];
  if (age(s) >= 16 && age(s) < 19 && s.edu.hs) return [`🏫 ${s.edu.hs}`, `졸업까지 ${19 * 12 - s.t}개월`];
  return null;
}
// 신분 (UI 개편 시안): 프로필 박스 첫 줄. 학생 · 군인 같은 신분, 성인이면 하는 직업 이름만 (현황은 빼고)
function idLabel(s) {
  const a = age(s);
  if (s.army) return '군 복무 중';
  const y = schoolYear(s);
  if (y < 1 && a < 19) return a < 1 ? '아기' : '유년기';
  if (y < 7) return '초등학생';
  if (y < 10) return '중학생';
  if (!s.edu.graduated && y <= 12) return `고등학생${s.edu.hs && s.edu.hs !== '일반고' ? ' · ' + s.edu.hs : ''}`;
  if (inUni(s)) return `대학생 · ${s.edu.uni.n}`;
  const jobs = CAREER_IDS.filter(id => CAREERS[id] && trackOn(s, id));
  if (jobs.length) return jobs.map(jobName).join(' · ');
  if (married(s) && a >= 30 && !s.slots.some(sl => sl.act === 'job')) return '전업주부';
  return s.slots.some(sl => sl.act === 'job') ? '아르바이트 중' : '진로를 찾는 중';
}
// 프로필 박스 (UI 개편 시안): 오른쪽 위에 이름 · 나이, 첫 줄에 신분, 아래에 배너 네 개 (기본 정보 · 가족 · 기록 · 재능 및 특기). 박스 자체는 누르지 않는다
const PF_BNS = [['born', '🪪', '프로필'], ['fam', '👪', '가족'], ['rec', '📖', '기록'], ['skills', '🎯', '재능 및 특기']];
function renderProfileCard() {
  const s = S, p = me(s), el = $('#profile-card');
  if (!el) return;
  const sc = schoolLine(s);
  el.innerHTML = `<div class="card-h"><span class="pf-name">👤 ${U.esc(p.name)} <b>${age(s)}세</b></span></div>`
    + `<div class="pf-id">${U.esc(idLabel(s))}${sc && sc[1] ? `<span class="hint"> · ${U.esc(sc[1])}</span>` : ''}</div>`
    + `<div class="pf-tbn">${PF_BNS.map(([k, ic, n]) => k === 'skills' ? `<button class="pf-tb" data-tstab="tal"><span class="pf-ic">${ic}</span> ${n}</button>` : `<button class="pf-tb" data-pftab="${k}"><span class="pf-ic">${ic}</span> ${n}</button>`).join('')}</div>`;
}
// 직업 배너에 보이는 것 (UI 개편 시안): 소속 · 그룹 팬 · 개인 팬 · 인기 · 계약 만료일. 없는 것은 빼고 보여 준다
function jobInfoRows(s, id) { const c = CAREERS[id]; try { return (c.info ? c.info(s, s.tracks[id]) : []).filter(r => Array.isArray(r)); } catch (e) { return []; } }
function jobGroupFans(s, id) {
  const t = s.tracks[id];
  if (id === 'idol' && t.st === 'active' && t.g && t.g.f) return MK.reduce((a, m) => a + (t.g.f[m] || 0), 0);
  if (id === 'band' && t.b && t.b.f != null) return t.b.f;
  return null;
}
function jobFacts(s, id) {
  const R = jobInfoRows(s, id), F = [];
  const org = R.find(r => ['소속', '회사', '일하는 곳'].includes(r[0]));
  if (org && org[1] && org[1] !== '-') F.push(['소속', String(org[1]).split(/ \(| · /)[0]]);
  const gf = jobGroupFans(s, id);
  if (gf != null) F.push(['그룹 팬', fmtFans(gf)]);
  const jf = Math.round((s.jf || {})[id] || 0);
  if (POP_JOBS.includes(id) || jf > 0) F.push(['개인 팬', fmtFans(jf)]);
  if (POP_JOBS.includes(id)) F.push(['인기', popTxt(jpop(s, id))]);
  const cl = contractLine(s, id);
  if (cl) F.push(['계약', cl.replace('계약 ', '')]);
  return F;
}
// 직업 활동 박스: 첫 줄에 요즘 유행, 그 아래 직업마다 배너(누르면 그 직업 창), 그 아래 공개 예정 작품 · 맡은 작품 · 광고 · 스캔들 · 자숙
function renderJobsCard() {
  const s = S, el = $('#jobs-card');
  if (!el) return;
  let h = trendRowHTML(s);
  let any = false;
  for (const id of CAREER_IDS) {
    const c = CAREERS[id];
    if (!c || !trackOn(s, id)) continue;
    any = true;
    // 자동 활동: 일정에 그 직업 칸이 있어야 일한다. 고정된 칸(회사 연습시간 · 촬영)이 있으면 그 일을 이미 하고 있다
    let st = '', cls = '', dot = false;
    if (c.act) {
      const n = jobSlots(s, id), x = jobTask(s, id), f = jobForced(s, id);
      st = !n ? '일정에 빈 칸이 없어 이번 달은 쉰다' : x ? `${f ? '🔒 ' : ''}${x.n}${f > 1 ? ` · 고정 ${f}칸` : ''}` : '할 일을 고르지 않았다 · 평가가 떨어진다';
      cls = !n ? ' off' : !x ? ' bad' : '';
      dot = (!!n && !x) || pickDue(s, id);
    }
    const F = jobFacts(s, id);
    h += `<button class="job-bn${cls}" data-job="${id}">${dot ? '<span class="rdot"></span>' : ''}<span class="jb-top"><span class="sb-ic">${jobIc(id)}</span><span class="sb-t">${U.esc(jobName(id))}</span>${st ? `<span class="jb-auto">${U.esc(st)}</span>` : ''}<span class="sb-n">›</span></span>`
      + (F.length ? `<span class="jb-facts">${F.map(([k, v]) => `<span class="jf"><i>${k}</i>${U.esc(v)}</span>`).join('')}</span>` : '') + `</button>`;
  }
  const soon = upcomingWorks(s);
  if (soon.length || WORK_TRKS.some(id => trackOn(s, id))) h += `<button class="soon-banner" data-soon><span class="sb-ic">🗓️</span><span><span class="sb-t">공개 예정 작품</span><br><span class="sb-s">${soon.length ? `「${U.esc(soon[0].title)}」 ${U.esc(soon[0].when)}` : '기다리는 작품 없음'}</span></span><span class="sb-n">${soon.length}편 ›</span></button>`;
  const rows = [];
  const row = (key, title, st) => rows.push(`<div class="trk" data-trk="${key}"><b>${title}</b><div class="st">${U.esc(st)}</div></div>`);
  s.projects.forEach((w, i) => { const T = WORK_TYPES[w.type]; row('w:' + i, `${T.ic} ${U.esc(T.n)}`, T.status(s, w)); });
  if ((s.brands || []).length) row('brands', '📺 광고 모델', s.brands.map(x => BRAND_BY[x.id].n).join(' · '));
  // 논란 창을 아직 안 봤으면 직업 활동 칸에 미리 띄우지 않는다 (v129)
  if (s.scandal && (s.scandal.resp || s.scandal.seen)) row('scandal', `🔥 ${U.esc(SC[s.scandal.id].n)}`, s.scandal.resp ? '여론을 지켜보는 중' : '대응을 기다리는 중');
  if (s.hiatus) row('hiatus', '🤐 자숙', `${s.hiatus.left}개월 남음 (${ymLater(s, s.hiatus.left)})`);
  if (rows.length) h += `<div class="trks">${rows.join('')}</div>`;
  if (!any && !rows.length) h += `<div class="empty">아직 하는 일이 없다. 📝 직업 지원에서 시작할 수 있다.</div>`;
  el.innerHTML = `<div class="card-h">💼 직업 활동</div><div class="jobs-body">${h}</div>`;
}
// 인간관계 박스: 박스를 누르면 인간관계 창. 안에는 가족 배너와 연인 배너 (결혼하면 가족 배너 하나)
// 가족 배너 글자 조각: 중요한 것부터. 한 줄에 들어가는 만큼만 보인다 (fitLine). 부모님 이름은 빼고 나이만
function famParts(s) {
  const L = [], sp = partner(s), ks = kids(s);
  if (isSpouse(sp)) L.push(`배우자 ${pAge(s, sp)}세`);
  if (ks.length) L.push(`자녀 ${ks.length}명`);
  const par = [mom(s), dad(s)].filter(Boolean);
  if (par.length && !par.some(p => p.alive)) L.push('부모님 돌아가심');
  else for (const p of par) L.push(p.alive ? `${p.rel} ${pAge(s, p)}세` : `${p.rel} 돌아가심`);
  if (s.olderSib || s.youngerSib) L.push(`형제자매 ${s.olderSib + s.youngerSib}명`);
  return L.length ? L : ['없음'];
}
// 한 줄 칸에 조각을 앞에서부터 넣고, 넘치면 뒤 조각부터 뺀다
function fitLine(el) {
  const parts = JSON.parse(el.dataset.parts || '[]');
  for (let n = parts.length; n >= 1; n--) { el.textContent = parts.slice(0, n).join(' · '); if (n === 1 || el.scrollWidth <= el.clientWidth + 1) return; }
}
// 인간관계 박스 (작게, 왼쪽 맨 아래): 박스를 누르면 인간관계 창. 가족·연인 배너는 이름 + 한 줄
function renderPeopleCard() {
  const s = S, el = $('#people-card');
  if (!el) return;
  const pt = partner(s), wed = isSpouse(pt);
  const bn = (k, ic, n, parts) => `<div class="pp-box"><span class="sb-ic">${ic}</span><span class="pp-tx"><span class="sb-t">${n}</span><span class="sb-s pp-line" data-parts="${U.esc(JSON.stringify(parts))}"></span></span></div>`;
  let h = `<div class="card-h">👥 인간관계<span class="bn-arr">›</span></div><div class="pp-bns">` + bn('fam', '👪', '가족', famParts(s));
  if (!wed) h += bn('love', '💕', '연인', pt ? [pt.name, `${pAge(s, pt)}세`, `친밀도 ${Math.round(pt.aff)}`] : ['없음']);
  el.innerHTML = h + `</div>`;
  el.querySelectorAll('.pp-line').forEach(fitLine);
}
// 회사 박스 (UI 개편 시안): 가운데 줄 맨 아래, 남는 높이를 채우는 그릇. 회사는 그 안의 배너 하나 (분야마다 배너가 하나씩 늘어날 자리)
// 자본금 · 지난달 순수익, 적자면 버틸 수 있는 기간. 누르면 회사 창. 회사를 차리기 전에는 사슬로 잠가 둔다
// 회사 박스 안의 회사 배너: 첫 회사(모회사)는 돈 줄 + 규모 줄, 자회사는 분야 규모 줄. 누르면 그 회사 창 (회사마다 따로, UI.coF)
function coFieldFacts(s, t, f) {
  const v = t.groups.filter(g => g.kind === 'vt').length, m = t.groups.length - v, mk = (n, w) => w ? ` (만드는 중 ${w})` : '';
  if (f === 'music') return [['연습생', `${coTrainees(s, null, 'music').length}명`], ['그룹', `${m}팀`]];
  if (f === 'vidol') return [['연습생', `${coTrainees(s, null, 'vidol').length}명`], ['기수', `${v}개`]];
  if (f === 'mcn') return [['크리에이터', `${(t.crs || []).length}명`]];
  if (f === 'video') return [['작품', `${(t.vdone || []).length}편${mk(0, (t.vw || []).length)}`]];
  if (f === 'anime') return [['애니', `${(t.adone || []).length}편${mk(0, (t.aw || []).length)}`]];
  return [];
}
function coBannerHTML(s, t, f, main) {
  const facts = L => `<span class="jb-facts">${L.map(([k, v, c]) => `<span class="jf"><i>${k}</i><span class="${c || ''}">${U.esc(v)}</span></span>`).join('')}</span>`;
  let rows = '';
  if (main) {
    const V = Object.values(t.lastL || {}), net = V.reduce((a, v) => a + v, 0), out = -V.filter(v => v < 0).reduce((a, v) => a + v, 0);
    // 돈 줄: 자본금(그룹 전체) · 지난달 순수익 · (적자면) 버틸 수 있는 기간
    const R = [['자본금', fmtWon(t.money), t.money < 0 ? 'neg' : ''], ['지난달 순수익', `${net >= 0 ? '+' : '-'}${fmtWon(Math.abs(net))}`, net >= 0 ? 'pos' : 'neg']];
    if (net < 0 && out > 0) R.push(['버틸 수 있는 기간', t.money > 0 ? `약 ${Math.floor(t.money / out)}개월` : '바닥났다', 'neg']);
    rows = facts(R) + facts([['등급', coRankName(t, coRank(t))]].concat(coFieldFacts(s, t, f), [['직원', `${coStaff(s, null, f).length}명`]]));
  } else rows = facts([['모회사', t.name]].concat(coFieldFacts(s, t, f), [['직원', `${coStaff(s, null, f).length}명`]]));
  return `<button class="job-bn co-bn" data-cof="${f}"><span class="jb-top"><span class="sb-ic">${CO_FIELDS[f].ic}</span><span class="sb-t">${U.esc(coFName(t, f))}</span><span class="jb-auto">${TIER_N[t.f[f].tier]} ${CO_TYPE_N[f] || CO_FIELDS[f].n}</span><span class="sb-n">›</span></span>${rows}</button>`;
}
// 회사 설립 배너: 첫 회사는 내 현금이 1억 원 이상일 때만 보인다. 자회사는 세울 분야가 남아 있으면 늘 보이고, 조건이 안 되면 잠금 + 빨간 이유
// 아랫줄은 설립 비용만 (절차는 누르면 차례로 나온다)
function coNewBannerHTML(sub, why) {
  const t = sub ? '자회사 설립' : '회사 설립', h = sub ? `설립 비용 ${fmtWon(CO_ADD_COST)} (그룹 자본금)` : `설립 비용 ${fmtWon(CO_SEED)} (내 돈)`;
  return `<button class="co-new${why ? ' chainlk' : ''}"${why ? '' : ` data-cofound="${sub ? 'sub' : 'new'}"`}><span class="co-new-t">＋ ${t}</span><span class="co-new-h">${h}</span>${why ? `<span class="co-why">${U.esc(why)}</span>` : ''}</button>`;
}
function renderCoCard() {
  const s = S, el = $('#co-card');
  if (!el || !s) return;
  const t = trackOn(s, 'agency') ? s.tracks.agency : null;
  el.removeAttribute('data-panel');
  if (!t) {
    // 회사가 없을 때: 현금이 1억 원 이상이면 '회사 설립 가능' 배너, 아니면 잠긴 박스
    if (s.money < CO_SEED) { el.className = 'card co-card chainlk'; el.innerHTML = `<div class="card-h">🏢 회사</div><div class="st">아직 차린 회사가 없다</div>`; return; }
    const w = coFoundWhy(s);
    el.className = 'card co-card'; el.innerHTML = `<div class="card-h">🏢 회사</div>` + coNewBannerHTML(false, w);
    return;
  }
  const fs = coFields(t), main = coMainF(t);
  let h = `<div class="card-h">🏢 회사${fs.length > 1 ? `<span class="sub">「${U.esc(t.name)}」 그룹 · 회사 ${fs.length}곳</span>` : ''}</div>`;
  h += coBannerHTML(s, t, main, true) + fs.filter(f => f !== main).map(f => coBannerHTML(s, t, f, false)).join('');
  if (coSubLeft(t).length) h += coNewBannerHTML(true, coSubWhy(s, t));
  el.className = 'card co-card'; el.innerHTML = h;
}
// 상태: 군 복무·병은 맨 위에 눈에 띄게 (누르면 자세히)
// 집에 따라 바뀌는 배경 (v151): img/bg/ 안에 그림이 있으면 게임 화면 뒤에 깐다. 없으면 지금 바탕 그대로. 원본은 img/home/ 에 두고 python dev/make_bg.py 로 가볍게 줄여 img/bg/ 에 만든다 (v152)
// 그림 이름: parents(본가) · dorm(기획사 숙소) · s(원룸) · m(투룸 · 아파트) · l(넓은 아파트) + .webp
function homeBgKey(s) { if (isDorm(s)) return 'dorm'; const h = s.home || {}; return h.mode !== 'alone' || !h.type ? 'parents' : homeSize(h); }
function homeBgSync() {
  const el = $('#game-screen'); if (!el || !S) return;
  const k = homeBgKey(S); UI.bgOK = UI.bgOK || {};
  const set = () => { const ok = UI.bgOK[homeBgKey(S)] === 1; el.classList.toggle('has-bg', ok); if (ok) el.style.setProperty('--home-bg', `url("img/bg/${homeBgKey(S)}.webp")`); };
  if (UI.bgOK[k] == null) { UI.bgOK[k] = 0; const im = new Image(); im.onload = () => { UI.bgOK[k] = 1; set(); }; im.onerror = () => { UI.bgOK[k] = -1; }; im.src = `img/bg/${k}.webp`; }
  set();
}
// 사건 창 위쪽 띠 그림 (v154 보탬): img/sc/ 의 장면 그림. 원본은 img/scene/ 에 두고 python dev/make_bg.py 로 줄인다
// 사건 이름 → 장면 (사건에 bg: '장면' 또는 (s, d) => '장면' 을 적어도 된다). 그림이 읽힌 것만 쓴다 (없으면 띠 없이 예전 그대로)
const SC_OF = {};
for (const [k, L] of Object.entries({
  // 회의실: 컴백 · 신곡 · 편곡 회의, 프로듀서 · A&R · 마케터의 기획, 계약 이야기
  meeting: ['co_plan', 'co_pick', 'idol_cb', 'band_cb', 'band_arr', 'solo_meet', 'band_meet', 'prod_plan', 'prod_song', 'anr_pick', 'mk_promo', 'mk_launch', 'co_aud_pick', 'co_trn_out', 'contract_nego', 'idol_contract', 'solo_contract', 'band_contract', 'idol_renew', 'idol_jp'],
  // 연습실: 연습생 오디션 · 평가 · 데뷔조 · 방출, 같이 남아서 하는 연습
  practice: ['idol_aud', 'bandtr_pick', 'idol_team', 'idol_cut', 'idol_teamcut', 'team_stay', 'team_flop', 'tr_eval', 'co_eval', 'co_eval_res', 'co_sq_ready', 'co_tr_left', 'dc_aud'],
  // 길거리: 캐스팅
  street: ['child_model'],
  // 음악방송 대기실: 데뷔 날 · 서바이벌 프로그램
  waiting: ['idol_debut', 'band_debut', 'idol_surv'],
  // fansign(팬사인회장)은 v157 팬사인회 사건에서 쓴다
})) for (const id of L) SC_OF[id] = k;
function scLoad() {
  UI.scOK = UI.scOK || {};
  for (const k of ['meeting', 'practice', 'street', 'waiting', 'fansign']) {
    if (UI.scOK[k] != null) continue;
    UI.scOK[k] = 0; const im = new Image(); im.onload = () => { UI.scOK[k] = 1; }; im.onerror = () => { UI.scOK[k] = -1; }; im.src = `img/sc/${k}.webp`;
  }
}
function scBandHTML(id, ev, s, d) {
  scLoad();
  let k = SC_OF[id];
  try { if (ev.bg) k = typeof ev.bg === 'function' ? ev.bg(s, d) : ev.bg; } catch (e) { }
  return k && UI.scOK[k] === 1 ? `<div class="m-scene" style="background-image:linear-gradient(180deg, transparent 50%, var(--card)), url('img/sc/${k}.webp')"></div>` : '';
}
function renderStatusCard() {
  homeBgSync(); scLoad(); // 사건 창 띠 그림도 미리 읽어 둔다
  const s = S;
  let st = `<div class="card-h">❤ 상태</div>`;
  if (s.army) st += `<div class="st-alert" data-trk="army">🪖 군 복무 중 · 전역까지 ${s.army.left}개월</div>`;
  if (s.ill) st += `<div class="st-alert" data-trk="ill">🏥 ${U.esc(s.ill.n)} · 회복까지 ${s.ill.left}개월</div>`;
  st += `<div class="row${s.stress >= 80 ? ' hot' : ''}"><span>스트레스</span><b>${Math.round(s.stress)}</b></div>${bar(s.stress, 100, 'stress')}`;
  st += `<div class="row"><span>팬</span><b>${fmtFans(totalFans(s))}</b></div>`;
  st += `<div class="row"><span>인지도</span><b>${fameWord(s.fame || 0)}</b></div>${bar(s.fame || 0, 100, 'pop')}`;
  st += `<div class="row"><span>평판 (주변 사람)</span><b>${repWord(s.rep)}</b></div>${bar(s.rep, 100, 'rep')}`;
  $('#status-card').innerHTML = st;
}
// 재정: 현금(크게) → 빚 → 지난달 → 맨 아래 총자산(집에 든 내 돈까지). 누르면 재정 창
// 가족이 대 준 돈이 무엇이었는지 (v116 버그 14): 대학 다니는 중이면 등록금, 고교 졸업 전이면 학원비, 그 밖에는 생활비만
function famPaidWhat(s) { return inUni(s) ? '등록금·생활비' : !s.edu.graduated ? '학원비·생활비' : '생활비'; }
function renderMoneyCard() {
  const s = S, lm = s.lastMon || { inc: 0, exp: 0, familyPaid: 0 }, ha = houseAsset(s);
  let m = `<div class="card-h">💰 재정<span class="bn-arr">›</span></div>`;
  m += `<div class="mn-r big"><span>현금</span><b>${fmtWon(s.money)}</b></div>`;
  if (s.debt > 0) m += `<div class="row"><span>빚</span><b class="neg">${fmtWon(s.debt)}</b></div>`;
  if (s.sibLoan) m += `<div class="row"><span>형제자매에게 빌린 돈</span><b class="neg">${fmtWon(s.sibLoan.left)}</b></div>`;
  if (s.friendLoan) m += `<div class="row"><span>${U.esc(s.friendLoan.name)}에게 빌린 돈</span><b class="neg">${fmtWon(s.friendLoan.left)}</b></div>`;
  m += `<div class="row"><span>지난달 들어온 돈</span><b class="pos">+${fmtWon(lm.inc)}</b></div><div class="row"><span>지난달 나간 돈</span><b class="neg">-${fmtWon(lm.exp)}</b></div>`;
  if (lm.familyPaid) m += `<div class="hint">가족이 대 준 돈 ${fmtWon(lm.familyPaid)} (${famPaidWhat(s)})</div>`;
  m += `<div class="mn-r total"><span>총자산 (집 포함)</span><b>${fmtWon(s.money + ha)}</b></div>`;
  const mc = $('#money-card'); if (mc) mc.innerHTML = m;
}
// 특기 순서 (특기 창)
// 레벨이 높은 특기부터, 개수에 안 세는 학업 · 외국어는 맨 뒤
function skOrder(p) { return learnedSkills(p).sort((a, b) => (SK_FREE.includes(a) - SK_FREE.includes(b)) || (p.sk[b].lv - p.sk[a].lv)); }
function skIc(k) { const c = SKILL_CATS.find(c => c.id === SKILLS[k].cat); return c ? c.ic + ' ' : ''; }
// 특기 창: 두 줄로 이름 · 레벨 · 막대. 오래 안 해서 떨어지는 중이면 레벨 옆에 ↓ (설명은 맨 아래 한 줄)
// '그만두기'는 맨 아래 '특기 그만두기'를 누르면 특기마다 나온다
// 재능 및 특기 창 (UI 개편 시안): 재능 탭 · 특기 탭
function panel_skills() {
  const p = me(S), cnt = capCount(p), tab = UI.tsTab === 'sk' ? 'sk' : 'tal';
  return `<h2>🎯 재능 및 특기</h2><div class="ap-row pf-tabs">${[['tal', '✨ 재능', ''], ['sk', '🎯 특기', `<span class="sk-cnt${cnt >= SKILL_CAP ? ' full' : ''}">${cnt}/${SKILL_CAP}</span>`]].map(([t, n, x]) => `<button class="ap-tab ${tab === t ? 'on' : ''}" data-tstab="${t}">${n}${x ? ' ' + x : ''}</button>`).join('')}</div>`
    + (tab === 'tal' ? pfTalTab(p) : skillsTabHTML());
}
function skillsTabHTML() {
  const s = S, p = me(s), ks = skOrder(p);
  const dec = k => s.t - p.sk[k].last > 6, drop = ks.some(k => !SK_FREE.includes(k));
  if (!drop) UI.skDrop = false;
  let h = `<p class="hint">특기는 학업과 외국어를 제외하고 ${SKILL_CAP}개까지 가질 수 있다.</p>`;
  if (!ks.length) return h + `<div class="empty">아직 배운 특기가 없다. 특기는 살면서 만나는 선택지로 처음 배운다.</div>`;
  h += `<div class="sk-grid">` + ks.map(k => { const x = p.sk[k]; return `<div class="sk"><div class="row"><span>${skIc(k)}${SKILLS[k].n}</span><b>${Math.floor(x.lv)}레벨${dec(k) ? '<i class="sk-dn" title="오래 안 해서 조금씩 떨어지는 중">↓</i>' : ''}</b></div>${bar(x.lv, 100)}${UI.skDrop && !SK_FREE.includes(k) ? `<div class="sk-foot"><button class="sk-drop" data-skdrop="${k}">그만두기</button></div>` : ''}</div>`; }).join('') + `</div>`;
  if (ks.some(dec) || drop) h += `<div class="sk-legend">${ks.some(dec) ? '<span><i class="sk-dn">↓</i> 오래 안 해서 조금씩 떨어지는 중</span>' : '<span></span>'}${drop ? `<button class="sk-drop" data-skdropmode>${UI.skDrop ? '그만두기 닫기' : '특기 그만두기'}</button>` : ''}</div>`;
  return h;
}

// ───── 사건 창 ─────
function statLine(s) { return `돈 ${fmtWon(s.money)} · 스트레스 ${Math.round(s.stress)} · 팬 ${fmtFans(totalFans(s))}`; }
// 사건 창을 그리다 오류가 나면 그 사건만 건너뛰고 게임을 이어 간다 (멈춰 버리지 않게)
function showEvent() {
  try { showEventRaw(); }
  catch (e) {
    console.error('사건 창 오류', S && S.pending && S.pending.id, e);
    if (S) S.pending = null;
    $('#modal').classList.add('hidden');
    toast('사건 하나를 띄우지 못해 건너뛰었어요');
    if (S) { save(S); render(); startLoop(); }
  }
}
// 특기 사건: 선택지에서 특기를 처음 배우거나(learnMe) 특기 이야기를 하는(gainH) 사건, 그리고 직접 고르는 '새 특기 배우기'
function isSkillEv(ev) {
  if (ev._sk == null) ev._sk = !!ev.sk || /learnMe|gainH|learnable/.test(String(ev.ch || '') + String(ev.init || '') + String(ev.submit || ''));
  return ev._sk;
}
// 선택지 중 지금 유행하는 것: 이름 옆 꼬리표 (컨셉·장르·예능 형식·라이브온 분야 어디서든)
const TR_BADGE = '<span class="trb">🔥 유행</span>';
// 초록 표시 (v132): 직원이 권한 것은 '추천', 그룹 · 밴드의 대표 컨셉과 같은 것은 '대표 컨셉'
const REC_BADGE = '<span class="trb rec">추천</span>', SIG_BADGE = '<span class="trb rec">대표 컨셉</span>';
function showEventRaw() {
  const s = S;
  if (!s.pending) { $('#modal').classList.add('hidden'); return; }
  if (UI.minimized) { $('#modal').classList.add('hidden'); goBtnSync(); return; }
  goBtnSync();
  if (s.pending.id === 'scandal' && s.scandal) s.scandal.seen = 1;
  const ev = EVENTS[s.pending.id], d = s.pending.d;
  // 실시간 창 (12-1): 결과 창보다 먼저 한 번만 (보고 나면 결과 창이 뜬다). 설정에 따라 건너뛴다
  if (ev.live && !d.lvSeen) {
    d.lvSeen = 1;
    let sp = null; try { sp = ev.live(s, d); } catch (e) { }
    if (sp && liveWant(sp)) { $('#modal').classList.add('hidden'); liveOpen(sp, () => showEvent()); return; }
  }
  if (liveOn()) return;
  const hx = ev.html ? ev.html(s, d) : '';
  UI.res = null;
  let h = `${scBandHTML(s.pending.id, ev, s, d)}<button class="m-min" data-min>창 내리기</button><div class="m-cat">${U.esc(ev.cat || '')}</div><div class="m-title">${U.esc(typeof ev.title === 'function' ? ev.title(s, d) : ev.title)}</div>${hx ? `<div class="m-html">${hx}</div>` : `<div class="m-text">${rich(ev.text(s, d))}</div>`}`;
  // 공개 뒤 반응: 결과 글 아래에 라이브온 배너 (12-3)
  if (ev.plio) { let pl = null; try { pl = ev.plio(s, d); } catch (e) { } const bn = pl ? plioBtnHTML(pl) : ''; if (bn) h += `<div class="pf-row">${bn}</div>`; }
  let T = null; if (ev.tbl) { try { T = ev.tbl(s, d); } catch (e) { console.error('표 오류', s.pending.id, e); T = null; } }
  if (ev.form) {
    // type 'check': 체크 칸 한 줄 (오디션 지원자·그룹 멤버 고르기). 나머지는 글자 적는 칸. 표(tbl)가 있으면 체크 줄은 표로 간다
    h += formFieldsHTML(ev.form(s, d).filter(f => !(T && f.type === 'check') && !f.after));
    if (T) h += evTblHTML(T, true);
    h += formFieldsHTML(ev.form(s, d).filter(f => f.after));
    if (ev.sum) h += `<div class="form-sum" id="form-sum"></div>`;
    h += `<div class="choices"><button class="btn primary" data-submit>확인</button>${ev.cancel ? `<button class="btn" data-cancel>${U.esc(ev.cancelT ? ev.cancelT(s, d) : '그만두기')}</button>` : ''}</div><div class="why" id="form-err"></div>`;
  } else if (T) {
    // 표에서 줄을 고르고 아래 보라색 버튼으로 정한다. 표에 없는 선택지(미루기 등)는 옆에 작은 버튼으로
    const C1 = evChoices(s);
    h += evTblHTML(T, false) + `<div class="choices tbl-btns"><button class="btn primary" data-tgo disabled>${U.esc(T.go || '고른 것으로 한다')}</button>${(T.rest || []).map(i => C1[i] ? `<button class="btn" data-choice="${i}">${U.esc(C1[i].t)}</button>` : '').join('')}</div>`;
  } else {
    const C1 = evChoices(s);
    // 고를 것이 하나뿐이면 결과 창처럼 보라색 버튼 하나 (스페이스바로 넘어간다, v129)
    if (C1.length === 1 && (!C1[0].ok || C1[0].ok(s)) && !C1[0].h && !C1[0].warn) h += `<div class="choices"><button class="btn primary" data-choice="0">${U.esc(C1[0].t)} <kbd>Space</kbd></button></div>`;
    else h += `<div class="choices">` + C1.map((c, i) => { const ok = !c.ok || c.ok(s); return `<button class="choice${c.tr ? ' tr' : ''}${c.rec || c.sig ? ' rec' : ''}" data-choice="${i}" ${ok ? '' : 'disabled'}><div class="t">${U.esc(c.t)}${c.tr ? TR_BADGE : ''}${c.rec ? REC_BADGE : ''}${c.sig ? SIG_BADGE : ''}</div>${c.h ? `<div class="h">${U.esc(c.h)}</div>` : ''}${c.warn ? `<div class="h ch-warn">⚠️ ${U.esc(c.warn)}</div>` : ''}</button>`; }).join('') + `</div>`;
  }
  // 자녀 이야기가 나오는 사건: 오른쪽 아래에 그 아이의 재능을 바로 볼 수 있는 버튼
  const kidId = ev.kid ? ev.kid(s, d) : null, kid = kidId && s.people[kidId];
  // 특기를 고르거나 처음 배우는 사건: 내 프로필(재능·타고난 것)을 바로 볼 수 있는 버튼 (고를 게 하나뿐인 사건에는 없다)
  const myProf = !kid && !ev.form && isSkillEv(ev) && evChoices(s).length >= 2;
  h += `<div class="m-foot"><div class="m-stats">${statLine(s)}</div>${kid ? `<button class="btn sm" data-kid="${kid.id}">👶 ${U.esc(kid.name)} 재능</button>` : myProf ? `<button class="btn sm" data-myprof>👤 내 프로필</button>` : ''}</div>`;
  $('#mcard').className = 'mcard' + (T || ev.wide ? ' wide' : '');
  $('#mcard').innerHTML = h;
  $('#modal').classList.remove('hidden');
  
  // 글자를 적는 창은 바로 적을 수 있게 첫 칸에 커서를 둔다 (Enter로 확인)
  if (ev.form) { const i = $('#mcard input[data-k]:not([type=checkbox]):not([type=radio])'); if (i && FINE_POINTER) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } formSum(); }
  if (ev.onShow) ev.onShow(s, d, $('#mcard'));
}
// ───── 표로 고르는 창 (v131, FM식) ─────
// 사건이 tbl(s, d)를 주면 체크 줄 · 선택지 대신 넓은 표로 보여 준다. 줄 = 고를 것 하나, 칸 = [정렬에 쓰는 값, 보이는 글]
// T = { cols: [[키, 이름]], rows: [{ k: 체크 칸 키(폼) 또는 ci: 선택지 번호, on, tr, ok, cells }], rest: 표 밖에 버튼으로 둘 선택지 번호들, go: 고르는 버튼 글 }
// 칸 이름을 누르면 그 칸으로 줄을 세우고(다시 누르면 거꾸로), 찾기 칸에 적으면 그 글자가 든 줄만 남는다. 줄을 옮기기만 해서 체크는 그대로 남는다
// 사건 창의 적는 칸 · 체크 줄 (v153): head = 묶음 제목(grid면 두세 칸으로), opt = 표가 있어도 그대로 보이는 체크 줄
function formFieldHTML(f) { return f.type === 'won' ? wonFieldHTML(f) : f.type === 'check' || f.type === 'opt' ? `<label class="ck-row"><input type="checkbox" data-k="${f.k}" ${f.on ? 'checked' : ''}><span><span class="ck-t">${U.esc(f.label)}${f.tr ? TR_BADGE : ''}</span>${f.sub ? `<span class="ck-h">${U.esc(f.sub)}</span>` : ''}</span></label>` : `<div class="field"><label>${U.esc(f.label)}</label><input data-k="${f.k}" value="${U.esc(f.value || '')}" maxlength="${f.max || 20}" placeholder="${U.esc(f.ph || '')}"></div>`; }
function formFieldsHTML(F) {
  let h = '', open = false;
  for (const f of F) {
    if (f.type === 'head') { h += (open ? '</div>' : '') + `<div class="ck-head">${U.esc(f.label)}</div><div class="ck-grp${f.grid ? ' grid' : ''}">`; open = true; continue; }
    h += formFieldHTML(f);
  }
  return h + (open ? '</div>' : '');
}
// 지금 창에 적힌 값 (체크 칸은 참 · 거짓, 동그라미 칸은 찍힌 것만)
function formVals() { const vals = {}; document.querySelectorAll('#mcard input[data-k]').forEach(i => { if (i.type === 'radio') { if (i.checked) vals[i.dataset.k] = i.value; } else vals[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.value; }); return vals; }
// 체크할 때마다 바뀌는 합계 줄 (사건의 sum)
function formSum() { const el = $('#form-sum'), p = S && S.pending, ev = p && EVENTS[p.id]; if (!el || !ev || !ev.sum) return; let x = ''; try { x = ev.sum(S, p.d, formVals()) || ''; } catch (e) { } el.textContent = x; }
function evTblHTML(T, form) {
  UI.tblT = T; UI.tblS = null;
  // 처음 정렬 (v134): 오디션은 나이, 타이틀곡은 완성도. 줄 번호(data-ti)는 그대로 두고 그리는 순서만 바꾼다
  const ord = T.rows.map((r, i) => i);
  if (T.sort) { const [sk, sd] = T.sort, val = i => { const c = T.rows[i].cells[sk]; return c ? c[0] : 0; }; ord.sort((a, b) => { const x = val(a), y = val(b); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ko')) * sd; }); UI.tblS = { k: sk, dir: sd }; }
  const th = T.cols.map(([k, n]) => `<th data-tsort="${k}"${T.sort && T.sort[0] === k ? ' class="on"' : ''}>${U.esc(n)}<i>${T.sort && T.sort[0] === k ? (T.sort[1] > 0 ? ' ▲' : ' ▼') : ''}</i></th>`).join('');
  const tr = ord.map(i => [T.rows[i], i]).map(([r, i]) => `<tr data-ti="${i}" class="${r.ok === false ? 'off' : ''}${form && r.on ? ' sel' : ''}${r.rec ? ' rec' : ''}"${form ? '' : ` data-trow="${r.ci}"`}><td class="tc">${form ? `<input type="checkbox" data-k="${r.k}" ${r.on ? 'checked' : ''}>` : '<span class="tdot"></span>'}</td>${form && T.radio ? `<td class="tc"><input type="radio" name="tbl-r" data-k="${T.radio.k}" value="${r.k}"></td>` : ''}` + T.cols.map(([k], j) => { const c = r.cells[k] || ['', '']; return `<td${typeof c[0] === 'number' ? ' class="num"' : ''}>${U.esc(String(c[1]))}${j === 0 && r.tr ? TR_BADGE : ''}${j === 0 && r.sig ? SIG_BADGE : ''}${j === 0 && r.rec ? `<span class="trb rec">${U.esc(r.rec)}</span>` : ''}</td>`; }).join('') + `</tr>`).join('');
  // 추천 묶음 (v132): 버튼을 누르면 그 줄들만 체크된다 (트레이너가 권하는 데뷔 멤버 등)
  const pre = form && T.presets && T.presets.length ? `<div class="tbl-pre">${T.presets.map((p, i) => `<button type="button" class="btn sm rec" data-tpre="${i}">${U.esc(p.n)}</button>`).join('')}</div>` : '';
  return pre + `<div class="tbl-tools"><input class="search" id="tbl-q" placeholder="찾기"><span class="hint">칸 이름을 누르면 그 순서로 줄을 세워요</span></div><div class="tbl-wrap"><table class="ev-tbl" id="ev-tbl"><thead><tr><th class="tc">${form ? T.ckN || (T.radio ? '실을 곡' : '') : ''}</th>${form && T.radio ? `<th class="tc">${U.esc(T.radio.n)}</th>` : ''}${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
}
function evTblSort(k) {
  const T = UI.tblT, tb = $('#ev-tbl tbody');
  if (!T || !tb) return;
  const val = tr => { const c = T.rows[+tr.dataset.ti].cells[k]; return c ? c[0] : ''; }, rows = [...tb.children];
  const num = rows.some(r => typeof val(r) === 'number'), dir = UI.tblS && UI.tblS.k === k ? -UI.tblS.dir : (num ? -1 : 1);
  UI.tblS = { k, dir };
  rows.sort((a, b) => { const x = val(a), y = val(b); return (num ? (+x || 0) - (+y || 0) : String(x).localeCompare(String(y), 'ko')) * dir; }).forEach(r => tb.appendChild(r));
  document.querySelectorAll('#ev-tbl th[data-tsort]').forEach(h => { h.classList.toggle('on', h.dataset.tsort === k); h.querySelector('i').textContent = h.dataset.tsort === k ? (dir > 0 ? ' ▲' : ' ▼') : ''; });
}
function evTblFilter(q) {
  const T = UI.tblT; q = String(q || '').trim();
  if (!T) return;
  document.querySelectorAll('#ev-tbl tbody tr').forEach(tr => { const r = T.rows[+tr.dataset.ti]; tr.style.display = !q || Object.values(r.cells).some(c => String(c[1]).includes(q)) ? '' : 'none'; });
}
// 작은 창에 띄울 글을 버튼에 걸어 둔다 (정산서 버튼처럼 번호로)
function popBtnHTML(label, html) { UI.popMap = UI.popMap || {}; const k = UI.popN = (UI.popN || 0) + 1; UI.popMap[k] = html; delete UI.popMap[k - 200]; return `<button class="lv-re" data-pop="${k}">${U.esc(label)}</button>`; }
// 돈 적는 칸 (v118 UI D4): 천만 원 단위로 적고, 아래 버튼으로 ±1억 · ±10억 (가진 돈까지만). 옆에 'X억 원'으로 읽어 준다
function wonFieldHTML(f) {
  const v = Math.max(0, Math.floor((f.value || 0) / 1e6) / 10), mx = f.max != null ? Math.max(0, Math.floor(f.max / 1e6) / 10) : '';
  return `<div class="field won-f"><label>${U.esc(f.label)} (천만 원)</label><div class="won-row"><input data-k="${f.k}" data-won data-wmax="${mx}" value="${v}" inputmode="decimal" maxlength="8"><span class="won-eq">${v > 0 ? '= ' + fmtWon(wonVal(v)) : ''}</span></div><div class="won-btns">${[-100, -10, 10, 100].map(n => `<button type="button" class="btn sm" data-wonadd="${n}" data-wk="${f.k}">${n < 0 ? '−' : '+'}${Math.abs(n) / 10}억</button>`).join('')}</div></div>`;
}
function wonEq(i) { const e = i.parentNode.querySelector('.won-eq'), w = wonVal(i.value); if (e) e.textContent = w > 0 ? '= ' + fmtWon(w) : ''; }
function wonAdd(k, n) {
  const i = $(`#mcard input[data-k="${k}"]`); if (!i) return;
  let v = (parseFloat(String(i.value).replace(/[^0-9.]/g, '')) || 0) + n;
  const mx = i.dataset.wmax === '' ? Infinity : +i.dataset.wmax;
  v = Math.max(0, Math.min(mx, v));
  i.value = String(Math.round(v * 10) / 10); wonEq(i);
}
// 글자 적는 창에서 Enter = 확인. 한글을 적는 중(조합 중)에 누른 Enter는 조합이 끝난 뒤 확인한다. 두 번 눌리지 않게 0.4초 안의 Enter는 한 번만
function formEnter() {
  const now = Date.now();
  if (now - (UI.enterT || 0) < 400) return;
  const b = $('#mcard [data-submit]');
  if (!b || $('#modal').classList.contains('hidden')) return;
  UI.enterT = now; b.click();
}
function afterChoice() {
  $('#modal').classList.add('hidden');
  render();
  if (S.ended) { showEnding(); return; }
  if (!S.uiOpen) dreamNow(S);
  if (S.pending) { showEvent(); return; }
  // 사건에서 '지원 창 열기' 같은 걸 골랐으면 그 창을 연다
  if (S.uiOpen) { const k = S.uiOpen; delete S.uiOpen; openPanel(k); }
  startLoop();
}
// 팝업에서 고른 결과는 그 팝업에서 바로 보여 준다 (v88): 고른 것 · 그 결과로 생긴 기록(걸어온 길에도 그대로 남는다) · 확인
// 고를 게 둘 이상인 창과 글자를 적는 창만 (확인 하나뿐인 창은 그 창이 곧 결과다)
function logsAfter(s, L0) { const i = L0 ? s.log.lastIndexOf(L0) : -1; return s.log.slice(i + 1); }
function resPre(s) {
  const p = s.pending, ev = p && EVENTS[p.id];
  if (!ev) return null;
  let title = '';
  try { title = typeof ev.title === 'function' ? ev.title(s, p.d) : ev.title; } catch (e) { }
  return { L0: s.log[s.log.length - 1], cat: ev.cat || '', title, form: !!ev.form, noRes: !!ev.noRes, C: ev.form ? [] : evChoices(s) };
}
function resAfter(pre, i) {
  if (!pre || pre.noRes || !S || S.ended || (!pre.form && pre.C.length < 2)) return false;
  const L = logsAfter(S, pre.L0);
  if (!L.length) return false;
  const c = pre.C[i];
  resShow({ cat: pre.cat, title: pre.title, pick: c ? c.t : '', L, next: afterChoice });
  return true;
}
// 결과 한 줄: 새로 배운 특기는 눈에 띄게, [ ] 안의 바뀐 수치는 꼬리표로
function resLine(x) { return rich(x || '').replace(/\[새 특기: ([^\]<]+)\]/g, '<span class="res-new">🌱 새 특기 · $1</span>').replace(/\[([^\]<]+)\]/g, '<span class="res-chip">$1</span>'); }
function resItems(L) { return L.map(x => `<div class="res-i${x.k === 'flavor' ? ' flavor' : ''}">${x.sp ? `<div class="res-sp">${U.esc(x.sp)}</div>` : ''}<div class="res-x">${resLine(x.x)}</div>${x.sub ? `<div class="res-sub">${nl(x.sub)}</div>` : ''}</div>`).join(''); }
function resShow(o) {
  const s = S;
  UI.res = o;
  render();
  const more = !!s.pending && !s.ended;
  let h = `<div class="m-cat">${U.esc(o.cat || '')}</div><div class="m-title">${U.esc(o.title || '결과')}</div>`;
  if (o.pick) h += `<div class="res-pick">✔ ${U.esc(o.pick)}</div>`;
  h += `<div class="res-box">${resItems(o.L)}</div>`;
  h += `<div class="choices"><button class="btn primary" data-resok>${more ? '다음 ▶' : '확인'} <kbd>Space</kbd></button></div>`;
  h += `<div class="m-foot"><div class="m-stats">${statLine(s)}</div></div>`;
  $('#mcard').className = 'mcard res-card';
  $('#mcard').innerHTML = h;
  $('#modal').classList.remove('hidden');
  
  $('#mcard').scrollTop = 0;
}
function resOk() { const o = UI.res; UI.res = null; if (o && o.next) o.next(); }
// 창(직업 지원 · 메시지함 · 생활 등) 안에서 누른 일의 결과: 창 아래쪽에 붙은 띠로 보여 준다. 창을 닫거나 다른 창을 열면 사라진다
function pResHTML() { return UI.pRes && UI.pRes.length ? `<div class="p-res"><button class="p-res-x0" data-presx>✕</button><div class="p-res-h">✔ 방금 한 일</div>${resItems(UI.pRes)}</div>` : ''; }
// 창 안에서 누른 일 다음: 고를 일이 생겼으면 결과를 사건 창에서 먼저 보여 주고(다음 ▶) 그 사건으로, 아니면 창 아래 띠에
function actDone(L0, title, onPend) {
  // 누른 일로 생긴 사건 중 고를 게 없는 것(방송 결과 등)은 창 없이 처리해서 결과에 같이 보여 준다
  autoEvs(S); pullNow(S); save(S);
  const L = logsAfter(S, L0);
  if (S.ended) { closePanel(); stopLoop(); showEnding(); return; }
  if (S.pending) {
    if (onPend) onPend();
    closePanel(); stopLoop();
    if (L.length) resShow({ cat: '', title: title || '결과', L, next: showEvent }); else showEvent();
    return;
  }
  if (UI.overlay) { UI.pRes = L.length ? L : null; renderPanel(); }
  render();
}
// 이어 할 자녀 카드: 재능 수치와 특기를 바로 보여 준다
function heirCard(s, k, noBtn) {
  const gf = gifts(k).filter(x => x !== 'looks' && x !== 'star').map(x => TALENT_BY[x].n);
  const sk = learnedSkills(k).sort((a, b) => lv(k, b) - lv(k, a)).slice(0, 4).map(x => `${SKILLS[x].n} ${lvi(k, x)}`).join(' · ') || '아직 배운 특기가 없다';
  const tal = talSorted(k).map(t => `<div><div class="row"><span>${t.n}</span><b>${k.tal[t.id]}</b></div>${bar(k.tal[t.id], 100, 'tal')}</div>`).join('');
  return `<div class="heir-card"><div class="hc-h"><b>${U.esc(k.name)}</b><span class="muted">${kidAge(s, k)}세 · ${k.g === '여' ? '딸' : '아들'} · ${TRAIT_BY[k.trait].n}</span></div><div class="hc-g">뛰어난 재능: <b>${gf.length ? gf.join(' · ') : '고르게 평범함'}</b></div><div class="tal-grid tal-col" style="grid-template-rows:repeat(${Math.ceil(TALENTS_SHOWN.length / 2)}, auto)">${tal}</div><div class="hc-sk">특기: ${U.esc(sk)}</div>${noBtn ? '' : `<button class="btn primary" data-heir="${k.id}">${U.esc(josa(k.name, '으로'))} 이어 하기</button>`}</div>`;
}
// 인생 결산: 숫자 카드, 마지막 이야기, 받은 상, 대표작, 걸어온 길(나이별), 자녀로 이어 하기
// 엔딩 칭호 옆: '장래희망은 가수가 되는 것이었다' (장래희망 발표를 안 했으면 없음)
function dreamLine(s) {
  const d = s.flags.dream;
  if (!d) return '';
  return d === '없음' ? '장래희망은 없었다' : `장래희망은 ${josa(d, '이가')} 되는 것이었다`;
}
// ───── 인생 결산 창 (12-5) ─────
// 모양은 '사진 무대' 하나로 정했다 (v150, 사용자 결정): 사용자가 만든 무대 그림(img/ending/stage.webp)을 머리에 깔고, 아래는 무대 바닥에서 이어지는 어두운 바탕에 금빛 글씨
// 그래프 자료: 해마다 기록이 있으면 그것, 없으면(예전 세이브) 작품 수입으로 번 돈만 어림한다
function endYears(s) {
  // 팬도 번 돈도 없던 어린 시절은 그래프에서 뺀다 (처음 무언가 생기기 바로 전 해부터)
  if ((s.yr || []).length >= 2) { let L = s.yr.map(([y, f, e]) => ({ y, f, e })); const i0 = L.findIndex(x => x.f > 0 || x.e > 0); L = L.slice(Math.max(0, (i0 < 0 ? L.length - 2 : i0) - 1)); if (L.length >= 2) return { L, fans: true }; }
  const by = {}; for (const w of s.works) if (w.y) by[w.y] = (by[w.y] || 0) + (w.pay || 0);
  const ys = Object.keys(by).map(Number).sort((a, b) => a - b);
  if (ys.length < 2) return null;
  let acc = 0; const L = [];
  for (let y = ys[0]; y <= ys[ys.length - 1]; y++) { acc += by[y] || 0; L.push({ y, f: 0, e: acc }); }
  return { L, fans: false };
}
// 숫자 칸에 들어갈 짧은 돈 (225억 8,347만 원 → 225.8억 원)
function endWon(v) { v = Math.round(v || 0); return v >= 1e12 ? `${(v / 1e12).toFixed(1)}조 원` : v >= 1e8 ? `${(v / 1e8).toFixed(1)}억 원` : v >= 1e4 ? `${Math.round(v / 1e4).toLocaleString()}만 원` : `${v.toLocaleString()}원`; }
function endGraphHTML(s) {
  const D = endYears(s);
  if (!D) return '';
  const L = D.L, W = 600, H = 170, px = 8, py = 14, n = L.length, mf = Math.max(1, ...L.map(x => x.f)), me2 = Math.max(1, ...L.map(x => x.e));
  const X = i => px + (W - px * 2) * (n === 1 ? 0.5 : i / (n - 1)), Y = (v, m) => H - py - (H - py * 2) * (v / m);
  const line = (k, m) => L.map((x, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(x[k], m).toFixed(1)}`).join(' ');
  const area = (k, m) => `${line(k, m)} L${X(n - 1).toFixed(1)} ${H - py} L${X(0).toFixed(1)} ${H - py} Z`;
  const aw = {}; for (const a of s.awards) aw[a.y] = (aw[a.y] || 0) + 1;
  const stars = L.map((x, i) => aw[x.y] ? `<text x="${X(i).toFixed(1)}" y="${H - 1}" class="eg-star" text-anchor="middle">★</text>` : '').join('');
  const ticks = L.map((x, i) => i === 0 || i === n - 1 || (x.y % 10 === 0 && i >= 4 && i <= n - 5) ? `<text x="${X(i).toFixed(1)}" y="11" class="eg-y" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${x.y}</text>` : '').join('');
  return `<section class="en-sec en-graph"><h3>📈 해마다</h3><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="eg">${ticks}`
    + `<path d="${area('e', me2)}" class="eg-ea"/><path d="${line('e', me2)}" class="eg-e"/>` + (D.fans ? `<path d="${line('f', mf)}" class="eg-f"/>` : '') + stars + `</svg>`
    + `<div class="eg-lg">${D.fans ? `<span class="f">팬 (가장 많을 때 ${fmtFans(mf)})</span>` : ''}<span class="e">번 돈 (모두 ${endWon(me2)})</span>${Object.keys(aw).length ? '<span class="s">★ 상을 받은 해</span>' : ''}${D.fans ? '' : '<span class="n">팬 기록은 이번 버전부터 남아요</span>'}</div></section>`;
}
// 인연: 가장 가까웠던 사람들 (가족 · 연인 · 친구 · 동료)과 업계의 라이벌 · 단짝
function endBonds(s) {
  const P = Object.values(s.people).filter(x => x && x.id !== s.me && x.name && (x.aff || 0) >= 55 && x.rel).sort((a, b) => (b.aff || 0) - (a.aff || 0)).slice(0, 5).map(x => ({ n: x.name, r: x.rel, k: 'p' }));
  const N = (s.npc && s.npc.L || []).filter(n => n.rk === 'rival' || n.rk === 'pal').sort((a, b) => Math.abs(b.r || 0) - Math.abs(a.r || 0)).slice(0, 2).map(n => ({ n: n.n, r: n.rk === 'rival' ? '라이벌' : '단짝', k: n.rk }));
  return P.concat(N);
}
function showEnding(preview) {
  stopLoop();
  const s = S;
  if (!s) return;
  // 미리 보기: 지금 은퇴한다면 (끝내지 않고 모양만 본다)
  if (preview === true && !s.ended) UI.endPrev = { kind: 'retire', retireAge: age(s), deathAge: 0, title: endTitle(s), last: endLastLine(s, 'retire'), lines: [], preview: 1 };
  else if (preview !== 'keep') UI.endPrev = null;
  const ep = s.ended || UI.endPrev;
  if (!ep) return;
  const p = me(s), M = endMain(s), handoff = ep.kind === 'handoff', pv = !!ep.preview;
  // 아이가 태어나자마자 넘어간 경우에는 그 아이로만 이어 할 수 있다
  const heirs = ep.heir ? kids(s).filter(k => k.id === ep.heir) : kids(s);
  const jobs = new Set((s.careerLog || []).map(c => c.id).concat(Object.keys(s.carOn || {}))).size;
  const title = ep.title || (pv ? endTitle(s) : ''), last = ep.last != null ? ep.last : '';
  const sub = [M && ep.kind !== 'fail' ? `${M.ic} ${M.n}${CAREERS[M.id].title && CAREERS[M.id].title(s, s.tracks[M.id]) ? ' · ' + CAREERS[M.id].title(s, s.tracks[M.id]) : ''}` : '', dreamLine(s)].filter(Boolean).join(' / ');
  const years = pv ? `${s.birthYear}년생 · 지금 ${age(s)}세 (지금 은퇴한다면)` : `${s.birthYear}년생 · ${handoff ? `${ep.retireAge}세에 아이에게 넘김` : `${ep.retireAge}세 ${ep.kind === 'fail' ? '꿈을 접음' : '은퇴'} · ${ep.deathAge}세에 세상을 떠남`}`;
  const badges = endBadges(s);
  let h = `<div class="en en-cur cv-P th-${ep.kind === 'fail' ? 'none' : M ? M.cat : 'none'} k-${ep.kind}">`;
  h += `<header class="en-hero"><div class="en-kicker">${handoff ? '이야기를 넘기며' : '인생 결산'}</div><div class="en-name">${U.esc(p.name)}</div><div class="en-title">${U.esc(title)}</div>${sub ? `<div class="en-sub">${U.esc(sub)}</div>` : ''}<div class="en-years">${years}</div>`
    + (badges.length ? `<div class="en-badges">${badges.map(([ic, n]) => `<span>${ic} ${n}</span>`).join('')}</div>` : '') + (last ? `<div class="en-last">${U.esc(last)}</div>` : '') + `</header>`;
  h += `<div class="en-body"><div class="en-col1">`;
  const tiles = [['👥', '가장 많을 때 팬', fmtFans(s.peak.fans)], ['💰', '업계에서 번 돈', endWon(s.earned)], ['🏆', '받은 상', `${s.awards.length}개`], ['🎬', '작품', `${s.works.length}개`], ['💼', '해 본 일', `${jobs}가지`], ['👶', '자녀', `${kids(s).length}명`]];
  h += `<section class="en-nums">${tiles.map(([ic, k, v]) => `<div class="en-n"><i>${ic}</i><b>${v}</b><span>${k}</span></div>`).join('')}</section>`;
  if (handoff && heirs.length) h += `<section class="en-sec"><h3>이어 받을 아이</h3><div class="heirs">${heirs.map(k => heirCard(s, k)).join('')}</div></section>`;
  h += endGraphHTML(s);
  const best = s.works.filter(w => w.sc != null).sort((a, b) => b.sc - a.sc).slice(0, 3);
  if (best.length) h += `<section class="en-sec"><h3>🎬 대표작</h3><div class="en-works">${best.map((w, i) => `<div class="en-w${i === 0 ? ' top' : ''}"><div class="en-w-r">${i + 1}</div><div class="en-w-t">「${U.esc(w.title)}」</div><div class="en-w-s">${w.y}년 · ${U.esc(w.type)}${w.by ? ' · ' + U.esc(w.by) : ''}</div>${w.note ? `<div class="en-w-n">${U.esc(w.note)}</div>` : ''}</div>`).join('')}</div></section>`;
  const bonds = endBonds(s);
  if (bonds.length) h += `<section class="en-sec"><h3>🤝 인연</h3><div class="en-bonds">${bonds.map(b => `<div class="en-b ${b.k}"><i style="background:hsl(${hashN(b.n) % 360} 50% 62%)">${U.esc(b.n.slice(0, 1))}</i><div><b>${U.esc(b.n)}</b><span>${U.esc(b.r)}</span></div></div>`).join('')}</div></section>`;
  h += `</div><div class="en-col2">`;
  if (s.awards.length) h += `<section class="en-sec"><h3>🏆 받은 상 ${s.awards.length}개</h3><div class="en-shelf">${s.awards.map(a => `<div class="en-tr"><i>🏆</i><b>${a.y}</b><span>${U.esc(a.n)}</span></div>`).join('')}</div></section>`;
  if (s.ms.length) h += `<section class="en-sec"><h3>📜 걸어온 길</h3><div class="en-tl">${s.ms.map(m => { const x = msText(m), stripped = x.replace(/^\d+세에 /, ''); return `<div class="en-t"><b>${stripped === x && /^(\d{4}년|타고난)/.test(x) ? 0 : m.a}</b><span>${U.esc(stripped)}</span></div>`; }).join('')}</div></section>`;
  h += `</div></div>`;
  if (!handoff && heirs.length && !pv) h += `<section class="en-sec"><h3>👶 자녀로 이어 하기</h3><div class="heirs">${heirs.map(k => heirCard(s, k)).join('')}</div></section>`;
  h += `</div>`;
  h += pv ? `<div class="choices end-btns"><button class="btn primary" data-endclose>닫기</button></div>`
    : `<div class="choices end-btns"><button class="btn primary" id="end-new">다시 태어나기</button><button class="btn" id="end-title">첫 화면으로</button><button class="btn ghost" data-endclose>기록 더 보기</button></div>`;
  $('#mcard').className = 'mcard ending';
  $('#mcard').innerHTML = h;
  $('#modal').classList.remove('hidden');
  $('#modal').scrollTop = 0;
  render();
}

// ───── 패널 ─────
function openPanel(kind) { if (!S && kind !== 'hall' && kind !== 'pastecode') return; if (kind === 'people' && $('#panel').classList.contains('hidden')) UI.pplOpen = {}; UI.overlay = kind; UI.pRes = null; renderPanel(); $('#panel').classList.remove('hidden'); apPlace(); const top0 = () => { $('#pcard').scrollTop = 0; $('#panel').scrollTop = 0; }; top0(); requestAnimationFrame(top0); }
function closePanel() { $('#panel').classList.add('hidden'); UI.overlay = null; UI.skDrop = false; UI.pRes = null; UI.pickSlot = null; if (S) render(); }
// 행동 버튼 한 줄. 버튼이 누를 일은 UI.acts(창) 또는 UI.lacts(오른쪽 생활 카드)에 모아 둔다
function actRow(a) {
  const reg = UI.rowReg || UI.acts, at = UI.rowReg ? 'lact' : 'act';
  const btn = (o, cls) => `<button class="btn sm ${cls}" data-${at}="${reg.push(o) - 1}" ${o.ok ? '' : 'disabled'}>${U.esc(o.btn || (o.danger ? '실행' : '하기'))}</button>`;
  const head = `<div class="a-t">${U.esc(a.t)}${a.tag ? `<span class="tag">${a.tag}</span>` : ''}</div>`;
  // 생활 창처럼 돈(price)·효과(eff)·덧붙임(note)을 나눠 둔 줄: 돈을 가장 크게, 효과는 보통, 덧붙임은 작게
  const body = o => o.price || o.eff || o.note ? `${o.price ? `<div class="lr-price">${U.esc(o.price)}</div>` : ''}${o.eff ? `<div class="lr-eff">${U.esc(o.eff)}</div>` : ''}${o.note ? `<div class="lr-note">${U.esc(o.note)}</div>` : ''}` : (o.h ? `<div class="a-h">${U.esc(o.h)}</div>` : '');
  const lr = a.price || a.eff ? ' lrow' : '';
  // 한 칸에 설명 줄마다 버튼 하나 (장비: 지금 효과 + 처분하기 / 업그레이드)
  if (a.lines) return `<div class="act act-lines${a.lines.some(o => o.price || o.eff) ? ' lrow' : ''}">${head}${a.lines.map(o => `<div class="act-line"><div class="al-txt">${body(o)}${o.run && !o.ok && o.why ? `<div class="a-why">${U.esc(o.why)}</div>` : ''}</div>${o.run ? btn(o, o.danger ? 'danger' : 'primary') : ''}</div>`).join('')}</div>`;
  // 여러 단계 중에서 고르는 줄 (자녀 교육비 없음·약간·보통·많이): 고른 단계가 진하게 보인다. 아이를 고르는 상자가 있으면 그 아래에 둔다
  if (a.opts) {
    const btns = a.opts.map(o => btn(o, o.on ? 'primary' : '')).join('');
    if (a.kidSel) return `<div class="act act-kid${lr}">${head}${body(a)}<div class="kid-sel"><select data-kidedu>${a.kidSel.ks.map(k => `<option value="${k.id}" ${k.id === a.kidSel.cur ? 'selected' : ''}>${U.esc(k.n)}</option>`).join('')}</select><div class="act-opts">${btns}</div></div></div>`;
    return `<div class="act${lr}${a.cls ? ' ' + a.cls : ''}"><div>${head}${body(a)}${a.why ? `<div class="a-why">${U.esc(a.why)}</div>` : ''}</div><div class="act-opts">${btns}</div></div>`;
  }
  return `<div class="act${lr}"><div>${head}${body(a)}${!a.ok && a.why ? `<div class="a-why">${U.esc(a.why)}</div>` : ''}</div>${btn(a, a.danger ? 'danger' : 'primary')}</div>`;
}
function renderPanel() {
  const k = UI.overlay;
  UI.acts = [];
  let h = `<button class="m-close" data-close>✕</button>`;
  const P = { lifelog: panelLifelog, soon: panelSoon, job: panelJob, lifesec: panelLifeSec, money: panelMoney, inbox: panelInbox, trk: panelTrk, kid: panelKid, applyjob: panelApplyJob, applyact: panelApplyAct, pastecode: panelPasteCode, profile: panelProfile, me: panelProfile, family: panelFamily, love: panelLove, career: panelCareer, people: panelPeople, life: panelLife, menu: panelMenu, hall: panelHall, help: panelHelp, pick: panelPick };
  if (P[k]) h += P[k]();
  else if (typeof window['panel_' + k] === 'function') h += window['panel_' + k]();
  h += pResHTML();
  $('#pcard').classList.toggle('wide', k === 'company'); // 회사 창은 넓게 (v131)
  $('#pcard').innerHTML = h;
  apPlace();
  if (k === 'pick') { const q = $('#pick-q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
}
// 일정 칸 고르기: 검색과 설명
function panelPick() {
  const s = S, p = me(s), i = UI.pickSlot, sl = s.slots[i];
  const q = UI.pickQ.trim();
  let h = `<h2>${i + 1}번 칸에서 할 일</h2><input id="pick-q" class="search" placeholder="찾기 (예: 보컬, 쉬기)" value="${U.esc(UI.pickQ)}">`;
  // 같은 직업 활동은 한 칸만: 다른 칸이 이미 넣은 직업 활동은 목록에서 뺀다
  const ids = availableActs(s).filter(id => !id.startsWith('c_'));
  const groups = {};
  for (const id of ids) {
    const a = actInfo(id);
    const desc = a.skill ? `${SKILLS[a.skill].n} ${lvi(p, a.skill)}레벨${a.les ? (lesOK(p, a.skill) ? ` · 학원: ${a.les.n} 월 ${lesCost(p, a.skill)}만 원` : lesOK(p, a.skill, 2) ? ` · 학원: 명문 ${a.les.n} 월 ${lesCost(p, a.skill, 2)}만 원` : ' · 학원에서 배울 수준을 넘어섰다') : ' · 학원 없음'}` : a.trk ? (careerSkill(s, a.trk) || a.d || '') : (a.d || '');
    if (q && !(a.n + desc + (a.g || '')).includes(q)) continue;
    const g = a.trk ? '직업 활동' : a.skill ? `특기 연습 · ${a.g}` : '생활';
    (groups[g] = groups[g] || []).push({ id, a, desc });
  }
  const order = Object.keys(groups).sort((x, y) => (x === '직업 활동' ? -1 : y === '직업 활동' ? 1 : x === '생활' ? 1 : y === '생활' ? -1 : 0));
  for (const g of order) {
    h += `<div class="sec-h">${g}</div>`;
    for (const { id, a, desc } of groups[g]) h += `<button class="pick ${sl.act === id ? 'on' : ''}" data-pickact="${id}"><span class="ic">${a.ic}</span><span><div class="t">${U.esc(a.n)}</div><div class="h">${U.esc(desc)}${a.eff ? ' · ' + a.eff.map(([n, v]) => `${n} ${v}`).join(', ') : ''}</div></span></button>`;
  }
  if (!order.length) h += `<div class="empty">찾는 활동이 없다.</div>`;
  if (!learnedSkills(p).length) h += `<p class="hint">아직 배운 특기가 없어서 연습할 수 있는 게 없다. 특기는 살면서 만나는 선택지로 처음 배운다.</p>`;
  return h;
}
// 메시지함 (제안): 위쪽 메시지함 버튼을 누르면 창으로 연다
function msgHTML(s, m) {
  const left = Math.max(0, m.due - s.t);
  let h = `<div class="msg ${!m.read ? 'new' : ''}"><div class="msg-h"><b>${!m.read ? '<i class="rdot in"></i>' : ''}${INBOX[m.kind].ic || '📨'} ${U.esc(m.title)}${INBOX[m.kind].tag ? `<span class="fix-tag sm">${INBOX[m.kind].tag}</span>` : ''}${!m.read ? '<span class="new-tag">새 제안</span>' : ''}</b><span class="due ${left <= 1 ? 'soon' : ''}">${left ? `기한 ${left}개월 남음` : '이번 달까지'}</span></div>`;
  const ago = s.t - m.at;
  h += `<div class="msg-from">보낸 곳: ${U.esc(m.from)} · ${ago ? `${ago}개월 전` : '이번 달'}에 받음</div>`;
  h += `<div class="msg-d">${nl(INBOX[m.kind].text(s, m))}</div><div class="msg-btns">`;
  msgChoices(s, m).forEach((c, i) => { const ok = !c.ok || c.ok(s); h += `<div class="opt"><button class="btn sm ${i === 0 ? 'primary' : ''}" data-msg="${m.id}" data-mi="${i}" ${ok ? '' : 'disabled'}>${U.esc(c.t)}</button>${c.tr ? TR_BADGE : ''}${c.h ? `<span class="h">${U.esc(c.h)}</span>` : ''}</div>`; });
  return h + `</div></div>`;
}
function inboxPastHTML(s, n) {
  const past = (s.inboxLog || []).slice(-n).reverse();
  if (!past.length) return '';
  return `<div class="sec-h">지난 제안</div>` + past.map(x => {
    const y = s.birthYear + Math.floor((s.birthMonth + x.t) / 12), mo = (s.birthMonth + x.t) % 12 + 1;
    return `<div class="ibx-old"><span class="d">${y}년 ${mo}월</span>${(INBOX[x.kind] && INBOX[x.kind].ic) || '📨'} <b>${U.esc(x.title)}</b> · ${U.esc(x.from)}<div class="r">→ ${U.esc(x.ans)}${x.late ? ' (기한 마지막 날 답함)' : ''}</div></div>`;
  }).join('');
}
function panelInbox() {
  const s = S;
  if (markInboxRead(s)) { save(s); renderTop(); }
  let h = `<h2>📨 메시지함</h2><p class="p-intro">회사·제작사·브랜드 등에서 먼저 보낸 제안이 모인다. 바로 답하지 않아도 되지만, 답장 기한 마지막 날까지 답이 없으면 그때 꼭 골라야 한다.</p>`;
  if (!s.inbox.length) h += `<div class="empty">답장을 기다리는 제안이 없다.</div>`;
  for (const m of s.inbox.slice().sort((a, b) => a.due - b.due)) h += msgHTML(s, m);
  return h + inboxPastHTML(s, 40);
}
// 활동명 (v162): 직업 창 정보 탭 맨 위 한 줄. 내가 직접 정한 이름만 '바꾸기'를 누를 수 있다
function snRowHTML(s, id) {
  const tr = s.tracks[id];
  if (!tr || !tr.sn) return '';
  const sn = tr.sn, self = snSelf(s, id);
  return actRow({ t: '🪪 활동명', h: `지금 '${sn.sur + sn.given}'${sn.nick ? ` · 애칭 '${sn.nick}'` : ''}`, ok: self && !s.pending, why: self ? '지금은 바꿀 수 없다' : '회사가 정해 준 이름이라 바꿀 수 없다', btn: '바꾸기', run: s => { fireEvent(s, 'stage_rename', { trk: id }); return ''; } });
}
// 지원할 수 있는 곳은 합격 가능성이 높은 것부터 (피드백 29). 지금 지원할 수 없는 곳은 그 아래에 원래 차례대로
// 합격 가능성: 그 줄 설명에 적힌 'N%' 중 가장 높은 것 (파트·종류가 여럿이면 가장 잘 붙을 것). 시험 없이 바로 시작하는 곳은 100%
function apP(s, a) {
  if (a.p) return a.p(s);
  const h = (a.h ? a.h(s) : '').replace(/(수익의|몫) \d+%/g, ''), m = h.match(/\d+(?=%)/g);
  return m ? Math.max(...m.map(Number)) / 100 : 1;
}
function apSorted(s, L) {
  const ok = L.filter(a => a.ok(s)), no = L.filter(a => !a.ok(s));
  return ok.map((a, i) => [a, apP(s, a), i]).sort((x, y) => y[1] - x[1] || x[2] - y[2]).map(x => x[0]).concat(no);
}
function panelApplyJob() {
  const s = S, list = jobApplies(s);
  let h = `<h2>📝 직업 지원</h2><p class="p-intro">분야를 누르면 직업이 나오고, 직업을 누르면 그 바로 아래에 지원할 수 있는 곳이 나온다. 직업 옆 숫자는 지금 바로 지원할 수 있는 곳의 수다.<br>직업은 ${JOB_CAP}개까지 같이 할 수 있다.</p>`;
  UI.apjOpen = UI.apjOpen || {};
  if (!list.length) return h + `<div class="empty">지금 나이와 상황에서 지원할 수 있는 직업이 없다.</div>`;
  for (const [cid, cn] of APPLY_CATS) {
    const items = list.filter(a => applyCatOf(a) === cid);
    if (!items.length) continue;
    const okAll = items.filter(a => a.ok(s)).length;
    // 분야: 처음에는 접어 둔다 (직업을 골라 둔 분야는 펼친 채로)
    const sel = UI.apTab[cid], open = UI.apjOpen[cid] != null ? UI.apjOpen[cid] : !!sel;
    h += `<div class="ap-cat"><button class="ap-cat-h ap-tog" data-apjcat="${cid}" data-open="${open ? 1 : 0}">${open ? '▾' : '▸'} ${cn}<span class="hint">${okAll ? `지금 지원 가능 ${okAll}곳` : '지금 바로 지원할 수 있는 곳은 없다'}</span></button>`;
    if (!open) { h += `</div>`; continue; }
    // 직업별 탭: 아티스트 줄, 스태프 줄
    const groups = [];
    for (const a of items) { const gn = a.g || '기타'; let g = groups.find(x => x.n === gn); if (!g) groups.push(g = { n: gn, side: applySideOf(a), items: [] }); g.items.push(a); }
    for (const [side, sn] of [['artist', '아티스트'], ['staff', '스태프'], ['biz', '']]) {
      const gs = groups.filter(g => g.side === side);
      if (!gs.length) continue;
      h += `<div class="ap-row">${sn ? `<span class="ap-side">${sn}</span>` : ''}${gs.map(g => { const n = g.items.filter(a => a.ok(s)).length; return `<button class="ap-tab ${sel === g.n ? 'on' : ''}" data-aptab="${cid}" data-apg="${U.esc(g.n)}">${U.esc(g.n)}${n ? `<span class="ap-n">${n}</span>` : ''}</button>` + (sel === g.n ? `<div class="ap-drop">${apSizeList(s, g)}</div>` : ''); }).join('')}</div>`;
    }
    h += `</div>`;
  }
  return h;
}
// 고른 직업의 목록(ap-drop): 그 탭이 있는 줄(화면에 보이는 한 줄) 바로 아래에, 칸 왼쪽 끝부터. 줄이 어디서 꺾이는지는 그려 본 뒤에 안다
function apPlace() {
  document.querySelectorAll('#pcard .ap-drop').forEach(dp => {
    const row = dp.parentElement, sel = row.querySelector('.ap-tab.on');
    if (!sel) return;
    row.appendChild(dp);
    if (!sel.offsetParent) return;
    const top = sel.getBoundingClientRect().top;
    let last = sel, seen = false;
    for (const b of row.querySelectorAll('.ap-tab')) { if (b === sel) seen = true; if (seen && Math.abs(b.getBoundingClientRect().top - top) < 4) last = b; }
    last.after(dp);
  });
}
window.addEventListener('resize', () => { if (UI.overlay === 'applyjob') apPlace(); });
// 직업 탭 안: 인디(프리랜서)처럼 회사 크기가 없는 곳은 바로 보이고, 회사는 소형 · 중형 · 대형 트리 뷰 아래에 (묶음 안은 원래처럼 합격 가능성 순)
const AP_SZ = ['', '소형', '중형', '대형'];
function apSize(s, a) {
  const m = String(a.tag || '').match(/^(대형|중형|소형)/) || a.n.match(/(대형|중형|소형) /);
  if (m) return m[1];
  let x = a.id.match(/^editor_mcn_(.+)$/);
  if (x) return AP_SZ[mcnTierOf(s, x[1])] || '';
  x = a.id.match(/_contest(\d)$/);
  if (x) return AP_SZ[+x[1]] || '';
  return '';
}
// 크기 묶음 안에서는 꼬리표의 '중형 · '을 뗀다 (묶음 이름과 겹친다)
function apJobRow(s, a, inSz) { const tag = inSz ? String(a.tag || '').replace(/^(대형|중형|소형)( · )?/, '') : a.tag; return actRow({ t: a.n, tag, h: a.h ? a.h(s) : '', ok: !!a.ok(s), why: a.why ? a.why(s) : '', btn: '지원하기', run: a.run }); }
function apSizeList(s, g) {
  const free = g.items.filter(a => !apSize(s, a));
  let h = free.length ? `<div class="ap-list">${apSorted(s, free).map(a => apJobRow(s, a)).join('')}</div>` : '';
  UI.apSz = UI.apSz || {};
  for (const sz of ['소형', '중형', '대형']) {
    const L = g.items.filter(a => apSize(s, a) === sz);
    if (!L.length) continue;
    const key = `${g.n}|${sz}`, open = !!UI.apSz[key], n = L.filter(a => a.ok(s)).length;
    h += `<div class="ap-sub ap-sz"><button class="ap-cat-h ap-tog" data-apsz="${U.esc(key)}" data-open="${open ? 1 : 0}">${open ? '▾' : '▸'} ${sz}<span class="hint">${L.length}곳${n ? ` · 지금 지원 가능 ${n}곳` : ''}</span></button>${open ? `<div class="ap-list">${apSorted(s, L).map(a => apJobRow(s, a, true)).join('')}</div>` : ''}</div>`;
  }
  return h;
}
// 생활 행동 한 줄 (여행): 하기 + 자동 (켜 두면 할 수 있게 될 때마다 저절로 한다, 턴제 실험 6차)
function lifeAutoRow(a) {
  if (!a.autoKey) return actRow(a);
  const s = S, on = !!(s.lifeAuto || {})[a.autoKey];
  return actRow({ t: a.t, price: a.price, eff: a.eff, note: [a.note, on ? a.autoH : ''].filter(Boolean).join(' · '), why: a.ok ? '' : a.why, opts: [
    { btn: a.btn || '하기', on: true, ok: a.ok, run: a.run },
    { btn: on ? '🔁 자동 켜짐' : '🔁 자동', on, ok: true, run: s => { s.lifeAuto = s.lifeAuto || {}; s.lifeAuto[a.autoKey] = !on; return ''; } }] });
}
// 활동 지원 한 줄: 지원하기 + 자동 (켜 두면 다시 지원할 수 있게 될 때마다 저절로 지원한다, 피드백 24)
function actAutoRow(s, a) {
  const ok = !!a.ok(s), on = !!(s.actAuto || {})[a.id];
  return actRow({ t: `${a.ic || ''} ${a.n}`, h: a.h ? a.h(s) : '', why: ok ? '' : (a.why ? a.why(s) : ''), opts: [
    { btn: '지원하기', on: true, ok, run: a.run },
    { btn: on ? '🔁 자동 켜짐' : '🔁 자동', on, ok: true, run: s => { s.actAuto = s.actAuto || {}; s.actAuto[a.id] = !on; return ''; } }] });
}
function panelApplyAct() {
  const s = S, list = actApplies(s);
  let h = `<h2>🎭 활동 지원</h2><p class="p-intro">뮤지컬, 오디션 프로그램처럼 내가 직접 지원해서 나가는 활동이다. 분야별로 모았다.</p>`;
  if (!list.length) return h + `<div class="empty">지금 지원할 수 있는 활동이 없다.</div>`;
  // 분야마다 접었다 펼 수 있다. 처음에는 지금 지원할 수 있는 곳이 있는 분야만 펼쳐 둔다
  UI.actOpen = UI.actOpen || {};
  for (const [cid, cn] of APPLY_CATS) {
    const items = list.filter(a => applyCatOf(a) === cid);
    if (!items.length) continue;
    const okN = items.filter(a => a.ok(s)).length, open = UI.actOpen[cid] != null ? UI.actOpen[cid] : okN > 0;
    h += `<div class="ap-cat"><button class="ap-cat-h ap-tog" data-apcat="${cid}" data-open="${open ? 1 : 0}">${open ? '▾' : '▸'} ${cn}<span class="hint">${okN ? `지금 지원 가능 ${okN}곳` : '지금 바로 지원할 수 있는 곳은 없다'}</span></button>`
      + (open ? items.map(a => actAutoRow(s, a)).join('') : '') + `</div>`;
  }
  return h;
}
// 프로필 창: 프로필 박스를 누르면 뜬다. 탭: 프로필(타고난 것) · 직업 · 재능 · 가족 정보 · 걸어온 길(인생 기록) · 작품 (특기는 특기 박스에서 본다)
// 한 직업에만 해당하는 것(등급·숙련도·내 실력·할 수 있는 일)은 직업 활동 박스의 그 직업 창에 있다
const PF_TABS = [['born', '👤 프로필'], ['job', '💼 직업'], ['tal', '✨ 재능'], ['fam', '👪 가족 정보'], ['log', '📖 걸어온 길'], ['works', '🎬 작품']];
// UI 개편 시안: 프로필 박스의 배너마다 창이 하나씩. 기본 정보 = 타고난 것, 가족 = 가족 정보, 기록 = 작품 + 경력 + 걸어온 길, 재능 및 특기 = 재능 · 특기 탭 (panel_skills)
function panelProfile() {
  const s = S, p = me(s), k = UI.pfTab;
  if (k === 'fam') return `<h2>👪 가족</h2>` + famHTML(s);
  if (k === 'rec' || k === 'log' || k === 'works' || k === 'job') { const tab = UI.recTab === 'log' || (k === 'log' && !UI.recTab) ? 'log' : 'career'; return `<h2>📖 기록</h2><div class="ap-row pf-tabs">${[['career', '💼 경력'], ['log', '📖 걸어온 길']].map(([t, n]) => `<button class="ap-tab ${tab === t ? 'on' : ''}" data-rectab="${t}">${n}</button>`).join('')}</div>` + (tab === 'log' ? lifeLogHTML(s) : pfRecHTML(s)); }
  if (k === 'tal') { UI.tsTab = 'tal'; return panel_skills(); }
  return `<h2>🪪 프로필</h2>` + pfBornTab(s, p);
}
// 기록 창의 경력 탭: 작품(받은 상 포함) → 번 돈 → 지난 경력. 걸어온 길은 따로 탭 (v162)
function pfRecHTML(s) {
  return `<div class="sec-h">🎬 작품${s.works.length ? ` <span class="n">${s.works.length}편</span>` : ''}</div>` + pfWorksTab(s)
    + jobEarnHTML(s) + `<div class="sec-h">💼 지난 경력</div>` + careerTab(s);
}
// 직업 탭: 지금 하는 직업(누르면 그 직업 창)과 지난 경력, 딱 두 가지
function pfJobTab(s) {
  const ids = CAREER_IDS.filter(id => CAREERS[id] && trackOn(s, id));
  const h = `<div class="sec-h">지금 하는 일</div>` + (ids.length ? `<div class="trks pf-jobs">${ids.map(id => `<div class="trk" data-job="${id}" data-from="profile"><b>${jobIc(id)} ${U.esc(jobName(id))}</b>${(s.jobEarn || {})[id] ? ` <span class="hint">번 돈 ${fmtWon(s.jobEarn[id])}</span>` : ''}${CAREERS[id].status ? `<div class="st">${U.esc(careerStatus(s, id))}</div>` : ''}</div>`).join('')}</div>` : `<div class="muted">없음</div>`);
  return h + jobPopHTML(s) + jobEarnHTML(s) + `<div class="sec-h">지난 경력</div>` + careerTab(s);
}
// 직업별 번 돈: 맨 위에 합계, 아래에 직업마다 많이 번 것부터. 어느 직업도 아닌 돈은 '그 밖에', 나눠 적기 전(예전 세이브)에 번 돈은 '예전에 번 돈'
// 직업별 인기: 지금 하는 직업과 예전에 했던 직업 (대중 앞에 이름을 거는 직업만)
// 인기 글자: '45(보통)'
function popTxt(v) { return `${Math.round(v)}(${popWord(v)})`; }
function jobPopHTML(s) {
  const L = POP_JOBS.filter(id => CAREERS[id] && s.tracks[id] && s.tracks[id].st !== 'none');
  if (!L.length) return '';
  return `<div class="sec-h">⭐ 인기</div>` + mastBars(L.map(id => ({ n: jobEarnName(id), tag: trackOn(s, id) ? '' : '예전', down: true, v: jpop(s, id), txt: popTxt(jpop(s, id)) })), 'pop', 'wide');
}
function jobEarnName(j) { return EARN_EXTRA[j] || (CAREERS[j] ? `${jobIc(j)} ${jobName(j)}` : j); }
function jobEarnHTML(s) {
  const E = s.jobEarn || {}, L = Object.keys(E).filter(j => E[j] > 0).map(j => [jobEarnName(j), E[j]]).sort((a, b) => b[1] - a[1]);
  const old = s.jobEarn0 || 0, etc = s.earned - old - L.reduce((a, x) => a + x[1], 0);
  if (etc >= 1e4) L.push(['그 밖에', etc]);
  if (old > 0) L.push(['예전에 번 돈', old]);
  return `<div class="sec-h">💰 번 돈</div><table class="list earn-t"><tr class="sum"><td>합계</td><td>${fmtWon(s.earned)}</td></tr>${L.map(([n, v]) => `<tr><td>${U.esc(n)}</td><td>${fmtWon(v)}</td></tr>`).join('')}</table>`;
}
// 재능을 수치가 높은 것부터: 칸이 두 줄이면 왼쪽 줄 위에서 아래로, 그다음 오른쪽 줄 (tal-col)
function talSorted(p) { return TALENTS_SHOWN.slice().sort((a, b) => p.tal[b.id] - p.tal[a.id]); }
function pfTalTab(p) {
  const gf = gifts(p).filter(k => k !== 'looks' && k !== 'star');
  // 수치가 높은 재능부터, 위에서 아래로: 왼쪽 줄 1~7등, 오른쪽 줄 8~14등 (피드백 18)
  const ts = talSorted(p);
  return `<p class="p-intro">뛰어난 재능: <b>${gf.length ? gf.map(k => TALENT_BY[k].n).join(' · ') : '고르게 평범함'}</b></p><div class="tal-grid tal-col" style="grid-template-rows:repeat(${Math.ceil(ts.length / 2)}, auto)">` + ts.map(t => `<div title="${U.esc(t.d)}"><div class="row"><span>${t.n} <span class="hint">${talentWord(p.tal[t.id])}</span></span><b>${p.tal[t.id]}</b></div>${bar(p.tal[t.id], 100, 'tal')}</div>`).join('') + `</div>`;
}
function pfBornTab(s, p) {
  const r = REGION_BY[s.birthRegion] || REGION_BY[s.region];
  const rows = [['성별', p.g === '여' ? '여성' : '남성'], ['나이', `${age(s)}세 (${s.birthYear}년 ${s.birthMonth + 1}월생)`], ['태어난 곳', `${s.birthPlace || s.place}`], ['성격', `${PERSONA_BY[s.persona].n} — ${PERSONA_BY[s.persona].d}`], ['타고난 건강', `${HEALTH_BY[s.health].n} — ${HEALTH_BY[s.health].d}`], ['인상', p.look]];
  if (s.flags.dream) rows.push(['어릴 적 장래희망', s.flags.dream]);
  if (s.armyExempt) rows.push(['병역', '생계유지 곤란 사유 병역 감면']);
  return `<table class="list">` + rows.map(([k, v]) => `<tr><td style="width:120px;color:var(--muted)">${k}</td><td>${U.esc(v)}</td></tr>`).join('') + `</table>`;
}
// 가족 정보: 집안 형편, 부모님, 형제자매, 배우자·자녀(카드). 프로필의 가족 정보 탭과 가족 배너 창이 같이 쓴다
function famHTML(s) {
  const hw = married(s) ? homeWealth(s) : s.wealth, row = (k, v) => `<tr><td style="width:120px;color:var(--muted)">${k}</td><td>${v}</td></tr>`;
  let h = `<table class="list">` + row('집안 형편', `${wealthWord(hw)} 집 (10단계 중 ${hw})${married(s) ? ` · 나와 배우자 기준 · 태어난 집은 ${wealthWord(s.wealth)} 집` : ''}`);
  if (!graduated(s)) h += row('학원 지원', !parentsAlive(s).length ? '학원비를 대 줄 가족이 없다' : familyBudget(s) ? `가족이 보내 줄 수 있는 학원: ${famPlanText(familyBudget(s))}` : '형편이 어려워 가족이 학원을 보내 주기 어렵다');
  for (const f of [mom(s), dad(s)].filter(Boolean)) h += row(`${f.rel} ${U.esc(f.name)}`, f.alive ? `${pAge(s, f)}세 · ${U.esc(f.job)} · ${skillLine(f, 3, s)}` : '돌아가셨다');
  if (s.family.single) h += row('아빠', '없음 (엄마 혼자 키우신 집)');
  if (s.olderSib || s.youngerSib) h += row('형제자매', sibText(s));
  h += `</table>`;
  const sp = partner(s);
  if (isSpouse(sp)) h += `<div class="sec-h">💍 배우자</div>` + npcCard(s, sp);
  const ks = kids(s);
  if (ks.length) h += `<div class="sec-h">👶 자녀 ${ks.length}명</div>` + ks.map(k => npcCard(s, k) + (s.kidTeach && s.kidTeach.id === k.id ? `<button class="soon-banner" data-trk="kidteach"><span class="sb-ic">👶</span><span><span class="sb-t">${U.esc(k.name)}에게 ${U.esc(SKILLS[s.kidTeach.sk].n)} 가르치는 중</span><br><span class="sb-s">${s.kidTeach.left}개월 남음</span></span><span class="sb-n">›</span></button>` : '')).join('');
  return h;
}
// 가족 배너 창
function panelFamily() { return `<h2>👪 가족</h2>` + contactLeftHTML(S) + famHTML(S); }
// 연인 배너 창: 연인이 있으면 그 사람, 없으면 새로운 만남(성인)
function panelLove() {
  const s = S, pt = partner(s);
  let h = `<h2>💕 연인</h2>`;
  if (pt) return h + contactLeftHTML(s) + npcCard(s, pt);
  h += `<div class="empty">없음</div>`;
  if (age(s) >= 19) h += meetHTML(s);
  return h;
}
function contactLeftHTML(s) { return `<p class="p-intro">${calY(s)}년 ${halfName(s)}에 남은 연락: <b>${Math.max(0, CONTACT_MAX - contactsUsed(s))}번</b></p>`; }
// 형제자매: 동생이 태어날 때 남동생·여동생을 기록해 둔다
function sibText(s) {
  const g = s.sibG || [], m = g.filter(x => x === '남').length, f = g.filter(x => x === '여').length, unk = s.youngerSib - m - f;
  const down = [m ? `남동생 ${m}명` : '', f ? `여동생 ${f}명` : '', unk > 0 ? `동생 ${unk}명` : ''].filter(Boolean).join(', ');
  return [s.olderSib ? `위로 ${s.olderSib}명` : '', down ? `아래로 ${down}` : ''].filter(Boolean).join(' · ');
}
// 자녀 능력 보기: 재능과 특기, 다니는 학원
function panelKid() {
  const s = S, k = s.people[UI.kid];
  if (!k) return `<div class="empty">찾을 수 없다.</div>`;
  let h = `<h2>${k.g === '여' ? '딸' : '아들'} · ${U.esc(k.name)} <span class="muted" style="font-size:var(--fs-3)">${kidAge(s, k)}세</span></h2>`;
  const gf = gifts(k).filter(x => x !== 'looks' && x !== 'star');
  h += `<p class="p-intro">뛰어난 재능: ${gf.length ? gf.map(x => TALENT_BY[x].n).join(' · ') : '고르게 평범함'} · 성격 ${TRAIT_BY[k.trait].n} · 친밀도 ${Math.round(k.aff)}</p>`;
  h += `<div class="sec-h">재능</div><div class="tal-grid tal-col" style="grid-template-rows:repeat(${Math.ceil(TALENTS_SHOWN.length / 2)}, auto)">` + talSorted(k).map(t => `<div title="${U.esc(t.d)}"><div class="row"><span>${t.n} <span class="hint">${talentWord(k.tal[t.id])}</span></span><b>${k.tal[t.id]}</b></div>${bar(k.tal[t.id], 100, 'tal')}</div>`).join('') + `</div>`;
  const ls = learnedSkills(k);
  h += `<div class="sec-h">특기</div>` + (ls.length ? `<table class="list">` + ls.sort((a, b) => lv(k, b) - lv(k, a)).map(x => `<tr><td style="width:110px">${SKILLS[x].n}</td><td><b>${lvi(k, x)}레벨</b></td></tr>`).join('') + `</table>` : `<div class="muted">아직 배운 특기가 없다.</div>`);
  const les = Object.keys(k.lessons || {}).filter(x => k.lessons[x] > s.t);
  const kt = s.kidTeach && s.kidTeach.id === k.id ? s.kidTeach : null;
  if (les.length || kt) h += `<div class="sec-h">배우는 중</div>` + les.map(x => `<div class="ms">${SKILLS[x].les ? SKILLS[x].les.n : SKILLS[x].n + ' 학원'} · ${k.lessons[x] - s.t}개월 남음 · 월 ${SKILLS[x].les ? lesCost(k, x) : 20}만 원</div>`).join('') + (kt ? `<div class="ms">내가 직접 ${josa(SKILLS[kt.sk].n, '을를')} 가르치는 중 · ${kt.left}개월 남음</div>` : '');
  return h;
}
// 정보 표: [이름, 값] 줄은 표로, { h, items } 는 제목 + 목록, { h, bars } 는 제목 + 막대 (숙련도)
// 7등급 직업의 몇 번째 등급인지: 노란 별(채운 별) + 빈 별, 합쳐서 7개
function tierStars(k) { k = U.clamp(Math.round(k), 0, 6); return ` <span class="tstars">${'★'.repeat(k + 1)}<i>${'☆'.repeat(6 - k)}</i></span>`; }
function infoTable(rows) {
  let h = '', tb = [];
  const flush = () => { if (tb.length) h += `<table class="list">` + tb.map(([k, v, st]) => `<tr><td style="width:130px;color:var(--muted)">${U.esc(k)}</td><td>${U.esc(v)}${st != null ? tierStars(st) : ''}</td></tr>`).join('') + `</table>`; tb = []; };
  for (const r of rows) {
    if (!r) continue;
    if (Array.isArray(r)) { tb.push(r); continue; }
    flush();
    if (r.bars) { h += `<div class="sec-h">${U.esc(r.h)}</div>` + mastBars(r.bars); continue; }
    // html: 미리 만든 조각을 그대로 (라이브온 배너 등)
    if (r.html != null) { h += (r.h ? `<div class="sec-h">${U.esc(r.h)}</div>` : '') + r.html; continue; }
    h += `<div class="sec-h">${U.esc(r.h)}</div>` + (r.items.length ? r.items.map(x => `<div class="ms">· ${U.esc(x)}</div>`).join('') : '<div class="muted">없음</div>');
  }
  flush();
  return h;
}
// 막대 목록: 숙련도(0~100)·특기 레벨. 이름(+유행 같은 꼬리표) | 막대(20칸마다 눈금) | 숫자
function mastBars(L, cls = '', wrap = '') {
  if (!L.length) return '<div class="muted">아직 없음</div>';
  return `<div class="mb ${wrap}">${L.map(x => `<div class="mb-r"><span class="mb-n">${U.esc(x.n)}${x.tag ? `<i class="mb-tag${x.down ? ' down' : ''}">${U.esc(x.tag)}</i>` : ''}</span><div class="mb-bar ${cls}"><i style="width:${U.clamp(x.v, 0, 100)}%"></i></div><b>${x.txt != null ? U.esc(x.txt) : Math.floor(x.v)}</b></div>`).join('')}</div>`;
}
// 곡을 직접 만드는 직업은 직업 창에 곡 컨셉 숙련도를, 원고를 쓰는 영화감독은 각본 숙련도를 함께 보여 준다
const SONG_JOBS = ['idol', 'band', 'solo'];
function panelTrk() {
  const s = S, key = UI.trk || '', [k, id] = key.split(':');
  const gone = `<div class="empty">지금은 진행 중이 아니다.</div>`;
  if (k === 'c') { UI.jobId = id; return panelJob(); }
  if (k === 'w') {
    const w = s.projects[+id];
    if (!w) return gone;
    const T = WORK_TYPES[w.type], cast = workPeople(s, w);
    const rows = [['진행', T.status(s, w)], ['끝나는 때', `${ymLater(s, w.left)} (${w.left}개월 남음)`]];
    if (w.co) rows.push(['제작', w.co]);
    if (w.slot) rows.push(['일정', '끝날 때까지 일정 한 칸이 묶인다']);
    if (cast.length) rows.push({ h: '함께하는 사람', items: cast.map(x => `${x.name} (${x.job}) · ${relWord(x)}`) });
    return `<h2>${T.ic} ${U.esc(T.n)}${w.title ? ` 「${U.esc(w.title)}」` : ''}</h2>` + infoTable(rows);
  }
  if (key === 'kidteach') {
    const kt = s.kidTeach, x = kt && s.people[kt.id];
    if (!x) return gone;
    let h = `<h2>👶 ${U.esc(x.name)}에게 ${U.esc(SKILLS[kt.sk].n)} 가르치기</h2>` + infoTable([['남은 기간', `${kt.left}개월 (일정 한 칸이 묶인다)`], [`${x.name}의 ${SKILLS[kt.sk].n}`, `${lvi(x, kt.sk)}레벨`], [`내 ${SKILLS[kt.sk].n}`, `${lvi(me(s), kt.sk)}레벨`], ['내 교육', has(me(s), 'edu') ? `${lvi(me(s), 'edu')}레벨` : '없음']]);
    h += `<div class="sec-h">할 수 있는 일</div>` + actRow({ t: '그만 가르치기', h: '묶여 있던 일정 칸이 다음 달부터 풀린다', ok: true, danger: true, run: s => { s.kidTeach = null; return `${x.name}에게 ${josa(SKILLS[kt.sk].n, '을를')} 가르치는 걸 그만뒀다.`; } }) + actRow({ t: `${x.name} 능력 보기`, ok: true, btn: '보기', run: () => { UI.kid = x.id; UI.overlay = 'kid'; return ''; } });
    return h;
  }
  if (key === 'scandal' && s.scandal) {
    const sc = s.scandal, T = SC[sc.id];
    return `<h2>🔥 ${U.esc(T.n)}</h2>` + infoTable([['시작', `${ymLater(s, sc.t - s.t)}`], ['사람들이 하는 말', scText(T.claim, s)], ['실제로는', T.know[sc.truth]], ['내 대응', sc.resp ? { apo: (T.lab || {}).apo || '사과문', deny: (T.lab || {}).deny || '해명', prove: '증거로 반박', sue: '법적 대응', quiet: '침묵', hiatus: '자숙' }[sc.resp] : '아직 고르지 않았다']]);
  }
  if (key === 'hiatus' && s.hiatus) return `<h2>🤐 자숙</h2>` + infoTable([['까닭', s.hiatus.n], ['끝나는 때', `${ymLater(s, s.hiatus.left)} (${s.hiatus.left}개월 남음)`], ['그동안', '직업 활동과 지원을 할 수 없다']]);
  if (key === 'brands') {
    const B = s.brands || [];
    if (!B.length) return gone;
    return `<h2>📺 광고 모델</h2>` + infoTable(B.map(x => { const b = BRAND_BY[x.id]; return [b.n, `${b.cat} · 모델료 ${fmtWon(x.fee)} · ${ymLater(s, x.end - s.t)}까지`]; }));
  }
  if (key === 'army' && s.army) return `<h2>🪖 군 복무</h2>` + infoTable([['전역', `${ymLater(s, s.army.left)} (${s.army.left}개월 남음)`], ['월급', '100만 원 (생활비는 들지 않는다)'], ['일정', '복무하는 동안 모든 칸이 묶이고 특기를 연습할 수 없다']]);
  if (key === 'ill' && s.ill) return `<h2>🏥 ${U.esc(s.ill.n)}</h2>` + infoTable([['회복', `${s.ill.left}개월 남음`], ['일정', s.ill.all ? '모든 칸이 치료로 묶인다' : '한 칸이 치료로 묶인다']]);
  const p = me(s);
  const bonus = ks => ks.map(x => `${SKILLS[x].n} ${has(p, x) ? lvi(p, x) + '레벨' : '(안 배움)'}`).join(' · ');
  if (key === 'uni' && s.edu.uni) return `<h2>🎓 ${U.esc(s.edu.uni.n)}</h2>` + infoTable([['졸업', `${ymLater(s, s.edu.uni.end - s.t)} (${s.edu.uni.end - s.t}개월 남음)`], ['빨리 느는 특기', bonus(s.edu.uni.bonus)], ['등록금', s.wealth >= 5 && parentsAlive(s).length ? '부모님이 내 주신다' : '학자금 대출 (매달 70만 원씩 빚)']]);
  if (key === 'hs' && s.edu.hs) return `<h2>🏫 ${U.esc(s.edu.hs)}</h2>` + infoTable([['졸업', `${ymLater(s, 19 * 12 - s.t)}`], ['빨리 느는 특기', bonus(s.edu.hsBonus || [])]]);
  const pt = partner(s);
  if (key === 'pt' && pt) return `<h2>${pt.rel === '배우자' ? '💍' : '💕'} ${U.esc(pt.name)}</h2>` + infoTable([['관계', pt.rel], ['나이 · 직업', `${pAge(s, pt)}세 · ${pt.job}`], ['성격', TRAIT_BY[pt.trait].n], ['친밀도', `${Math.round(pt.aff)}`], ['만난 곳', pt.met || '-'], ['특기', skillLine(pt, 3)]]);
  return gone;
}
function panelCareer() {
  const s = S;
  let h = `<h2>🧭 진로 백과사전</h2><p class="p-intro">직업을 얻은 뒤에는 이번 달 일정에서 직업 관련 활동을 할 수 있다. 직업은 여러 개를 같이 할 수 있지만, 소속 계약은 한 번에 한 곳과만 할 수 있다.${agencyContract(s) ? `<br><b>지금 계약:</b> ${U.esc(agencyContract(s))}` : ''}</p>`;
  for (const g of CAREER_GROUPS) {
    const open = UI.openGroups[g.id];
    h += `<div class="sec-h tog" data-grp="${g.id}">${open ? '▾' : '▸'} ${g.n}</div>`;
    if (!open) continue;
    for (const [sub, sn] of g.subs) {
      const list = CAREER_PLAN.filter(c => c.g === g.id && c.sub === sub);
      if (sn) h += `<div class="hint" style="margin:var(--sp-2) 0 2px;font-weight:700">${sn}</div>`;
      for (const c of list) {
        const C = CAREERS[c.id];
        if (!C) { h += `<div class="act"><div><div class="a-t">${U.esc(c.n)}<span class="tag soon">준비 중</span></div><div class="a-h">다음 업데이트에서 열려요${c.soon ? ' · ' + U.esc(c.soon) : ''}</div></div></div>`; continue; }
        const t = s.tracks[c.id];
        // 지금 하는 일은 현황 아래에 그 직업 설명도 함께 보여 준다
        h += `<div class="act" style="border:none;padding-bottom:0"><div><div class="a-t">${C.ic || ''} ${U.esc(C.n)}${trackOn(s, c.id) ? '<span class="tag">진행 중</span>' : ''}</div><div class="a-h">${U.esc(trackOn(s, c.id) && C.status ? careerStatus(s, c.id) : C.desc || '')}</div>${trackOn(s, c.id) && C.status && C.desc ? `<div class="hint">${U.esc(C.desc)}</div>` : ''}${trackOn(s, c.id) ? '' :`<div class="hint">${t.endNote || (C.status && C.status(s, t)) ? U.esc((t.endNote || C.status(s, t)) + ' · ') : ''}${c.id === 'agency' ? '🏢 메인 화면 회사 박스에서 차릴 수 있어요' : '📝 직업 지원에서 시작할 수 있어요'}</div>`}</div></div>`;
        for (const a of (C.actions ? C.actions(s, t) : []).filter(a => !a.danger)) h += actRow(a);
        if (trackOn(s, c.id) && C.actions && C.actions(s, t).some(a => a.danger)) h += `<div class="hint" style="margin:0 0 var(--sp-2)">그만두기·탈퇴는 직업 활동 박스의 그 직업 창 '정보' 탭 맨 아래에서 할 수 있어요</div>`;
      }
    }
  }
  return h;
}
const REL_ORDER = ['배우자', '연인', '자녀', '형제자매', '멤버', '친구', '동료', '제자', '부모님 지인', '동기', '선배', '전 멤버', '지인', '전 연인', '전 배우자'];
// 연락(연락하기·데이트)은 반년(1~6월, 7~12월)마다 네 번까지, 같은 사람에게는 반년에 두 번까지 (턴제 실험: 한 턴이 최대 6개월이라 3개월 2번 → 6개월 4번)
const CONTACT_MAX = 4, CONTACT_PER = 2;
function halfKey(s) { return calY(s) * 2 + Math.floor(calM(s) / 6); }
function halfName(s) { return calM(s) < 6 ? '1~6월' : '7~12월'; }
function contactsUsed(s) { return s.contactH === halfKey(s) ? (s.contactN || 0) : 0; }
function calledN(s, n) { return n.callH === halfKey(s) ? (n.callN || 1) : 0; }
function calledThisHalf(s, n) { return calledN(s, n) >= CONTACT_PER; }
// 인간관계 창의 같은 묶음 안 차례 (v162): 나와의 나이 차이(작은 순) → 친밀도(낮은 순) → 직급(높은 순) → 팀(가나다)
const PPL_RANK = [[/대표|사장|회장/, 9], [/임원|이사|본부장|국장/, 8], [/부장|실장|총괄|수석/, 7], [/팀장|리더|감독|교수|원장/, 6], [/PD|프로듀서|작가|매니저|과장/, 5], [/선배|대리|주임/, 4], [/트레이너|강사|담당자|기자/, 3], [/사원|직원|막내|연습생|인턴|신입/, 1]];
function pplRank(n) { const j = `${n.job || ''} ${n.co && n.co.job ? n.co.job : ''}`; for (const [re, v] of PPL_RANK) if (re.test(j)) return v; return 2; }
function pplCmp(s, a, b) {
  const my = age(s), da = Math.abs(pAge(s, a) - my), db = Math.abs(pAge(s, b) - my);
  if (da !== db) return da - db;
  if (Math.round(a.aff) !== Math.round(b.aff)) return a.aff - b.aff;
  const ra = pplRank(a), rb = pplRank(b);
  if (ra !== rb) return rb - ra;
  const ta = (typeof orgOf === 'function' ? orgOf(s, a) : '') || a.job || '', tb = (typeof orgOf === 'function' ? orgOf(s, b) : '') || b.job || '';
  return ta.localeCompare(tb, 'ko');
}
function panelPeople() {
  const s = S;
  const left = Math.max(0, CONTACT_MAX - contactsUsed(s));
  let h = `<h2>인간관계</h2><p class="p-intro">관계는 살면서 생기는 일들로 바뀐다. 연인·배우자는 반년, 나머지는 1년 넘게 연락하지 않으면 멀어진다.<br><b>${calY(s)}년 ${halfName(s)}에 남은 연락: ${left}번</b></p>`;
  h += `<div class="sec-h">가족</div><div class="npc">`;
  for (const p of [mom(s), dad(s)].filter(Boolean)) h += `<div class="npc-d">${p.rel} ${p.name} · ${p.alive ? `${pAge(s, p)}세 · ${U.esc(p.job)} · ${skillLine(p, 2, s)}` : '돌아가셨다'}</div>`;
  if (s.family.single) h += `<div class="npc-d">엄마 혼자 키우신 집이다.</div>`;
  if (s.olderSib || s.youngerSib) h += `<div class="npc-d">형제자매: ${sibText(s)}</div>`;
  const sp = partner(s);
  if (isSpouse(sp)) h += `<div class="npc-d">배우자 ${U.esc(sp.name)} · ${pAge(s, sp)}세 · ${U.esc(sp.job)} · 친밀도 ${Math.round(sp.aff)}${sp.aff < 35 ? ' · <span class="neg">사이가 식었다</span>' : ''}</div>`;
  if (kids(s).length) h += `<div class="npc-d">자녀: ${kids(s).map(k => `${U.esc(k.name)} (${kidAge(s, k)}세 · ${k.g === '여' ? '딸' : '아들'})`).join(', ')}</div>`;
  h += `</div>`;
  // 새로운 만남: 애인·배우자가 없는 성인만
  if (age(s) >= 19 && !partner(s)) h += meetHTML(s);
  // 묶음 안에서는 친밀도가 높은 사람부터 (가족·연인만 배우자 → 연인 → 자녀 → 형제자매 순서를 먼저 따른다)
  const grp = n => PPL_TOP.findIndex(x => x[0] === pplTop(n)), famR = n => pplTop(n) === 'fam' ? REL_ORDER.indexOf(n.rel) : 0;
  const list = people(s, n => (!['엄마', '아빠', '업계'].includes(n.rel) || coMine(s, n)) && !n.hidden).sort((a, b) => grp(a) - grp(b) || pplCmp(s, a, b));
  if (!list.length) h += `<div class="muted">아직 가까운 사람이 없다.</div>`;
  // 트리 뷰 (피드백 26): 가족·연인 · 친구 · 동료(어느 직업으로 만났나) · 지인(그 사람의 직업)
  UI.pplOpen = UI.pplOpen || {};
  const tog = (key, open, title, n) => `<button class="ap-cat-h ap-tog" data-pgrp="${U.esc(key)}" data-open="${open ? 1 : 0}">${open ? '▾' : '▸'} ${title}<span class="hint">${n}명</span></button>`;
  for (const [k, title] of PPL_TOP) {
    const L = list.filter(n => pplTop(n) === k);
    if (!L.length) continue;
    // 창을 열 때마다 가족·연인만 펼쳐 둔다 (닫으면 펼친 것이 다시 접힌다)
    const open = UI.pplOpen[k] != null ? UI.pplOpen[k] : k === 'fam';
    h += `<div class="ap-cat">` + tog(k, open, title, L.length);
    if (open && (k === 'work' || k === 'know')) {
      const G = {};
      for (const n of L) { const g = k === 'work' ? orgOf(s, n) : (n.job || '기타'); (G[g] = G[g] || []).push(n); }
      // '기타'는 늘 맨 아래 (v134)
      const etc = x => /기타$/.test(x) ? 1 : 0;
      const keys = Object.keys(G).sort((a, b) => etc(a) - etc(b) || G[b].length - G[a].length || a.localeCompare(b));
      for (const g of keys) {
        const key = k + ':' + g, o2 = UI.pplOpen[key] != null ? UI.pplOpen[key] : keys.length === 1;
        h += `<div class="ap-sub">` + tog(key, o2, U.esc(g), G[g].length) + (o2 ? G[g].map(n => npcCard(s, n)).join('') : '') + `</div>`;
      }
    } else if (open) h += L.map(n => npcCard(s, n)).join('');
    h += `</div>`;
  }
  return h;
}
const PPL_TOP = [['fam', '👪 가족·연인'], ['friend', '🤝 친구'], ['work', '💼 동료'], ['know', '🙂 지인']];
// 내 회사 사람인가 (v134): 직원 · 연습생 · 소속 아티스트 · 크리에이터. 지원자는 뺀다
function coMine(s, n) { return !!n.co && !!n.co.role && n.co.role !== 'cand' && typeof coOn === 'function' && coOn(s); }
function pplTop(n) {
  if (n.rel === '업계' && n.co && n.co.role && n.co.role !== 'cand') return 'work';
  if (['배우자', '연인', '자녀', '형제자매', '전 연인', '전 배우자'].includes(n.rel)) return 'fam';
  if (n.rel === '친구') return 'friend';
  if (['동료', '멤버', '전 멤버', '동기', '선배', '제자'].includes(n.rel)) return 'work';
  return 'know';
}
// 동료 묶음 이름 (피드백 27): 만났을 때 내 소속. 앞에 그 직업의 그림 글자를 붙인다 (예: '🎬 라온 액터스', '🎥 연출감독 · 소속 없음')
function orgOf(s, n) {
  const job = relJob(s, n), ic = CAREERS[job] ? CAREERS[job].ic : job === 'musical' ? '🎭' : '📁';
  // 밴드 멤버 · 전 멤버는 만났을 때 소속(기획사)과 상관없이 모두 밴드 묶음으로 (v123)
  const bd = (s.tracks.band || {}).b;
  if (bd && bd.name && ((bd.members || []).includes(n.id) || (['멤버', '전 멤버'].includes(n.rel) && job === 'band'))) return `🎸 밴드 「${bd.name}」`;
  // 될 수 있으면 가장 작은 묶음으로 (v129): 회사보다 그룹. 내 아이돌 그룹 멤버, 내 회사에 속한 그룹 · 밴드의 멤버
  const ig = (s.tracks.idol || {}).g;
  if (ig && ig.name && ((ig.members || []).includes(n.id) || (['멤버', '전 멤버'].includes(n.rel) && job === 'idol'))) return `💫 그룹 「${ig.name}」`;
  if (coMine(s, n) && n.co.role === 'staff') return `🏢 ${coT(s).name} 직원`;
  if (coMine(s, n) && n.co.role === 'tr') return `🌱 ${coT(s).name} 연습생`;
  const cg = coCardGroups(s).find(g => (g.members || []).includes(n.id));
  if (cg) return `${cg.kind === 'band' ? '🎸 밴드' : cg.kind === 'vt' ? '🎙️ 기수' : '💫 그룹'} 「${cg.name}」`;
  if (coMine(s, n)) return `🏢 ${coT(s).name} 소속`;
  // 내 회사 일로 만났지만 회사 소속이 아닌 업계 사람(곡을 준 작곡가 등)은 회사 묶음이 아니라 '기타'로 (v133)
  if (job === 'agency' && !n.co && !/^(전|은퇴한) /.test(n.job || '')) return '📁 기타';
  const o = n.metOrg || orgGuess(s, n, job);
  return o ? `${ic} ${o}` : `${relJobName(job)} 시절`;
}
// 소속을 남기기 전(예전 세이브)에 만난 사람: 관계와 만난 곳 글자로 짐작한다. 모르면 ''
function orgGuess(s, n, job) {
  if (n.coT && coBase(n.coT)) return coBase(n.coT).n;
  if (n.trainee && AG[n.trainee]) return AG[n.trainee].n;
  const m = (n.met || '').match(/^(.+?) (편집팀|연습생 동기|연습생 \(내 제자\)|신인 \(내 제자\)|A&R팀|선배|\d+기 데뷔 준비|합방|합작)$/);
  if (m) return m[1];
  if (['멤버', '전 멤버'].includes(n.rel)) { if (job === 'band') { const b = (s.tracks.band || {}).b; return b && b.name ? `밴드 「${b.name}」` : ''; } return (s.tracks.idol || {}).agN || ''; }
  return '';
}
// 동료가 된 직업: 만날 때 남긴 값(metJob), 없으면 관계와 만난 곳 글자로 짐작한다
const MEET_JOB_N = { musical: '🎭 뮤지컬', etc: '📁 그 밖의 일' };
function relJob(s, n) { return n.metJob || metJobGuess(s, n); }
function relJobName(id) { return CAREERS[id] ? `${CAREERS[id].ic} ${CAREERS[id].n}` : MEET_JOB_N[id] || MEET_JOB_N.etc; }
function metJobGuess(s, n) {
  const m = n.met || '', j = n.job || '', did = id => !!s.tracks[id] && !!s.tracks[id].st && s.tracks[id].st !== 'none';
  if (['멤버', '전 멤버', '동기', '선배'].includes(n.rel)) return /밴드/.test(j + m) ? 'band' : 'idol';
  if (n.rel === '제자') return /배우/.test(j) ? 'acttrainer' : 'trainer';
  if (/뮤지컬/.test(m)) return 'musical';
  if (/A&R/.test(m)) return 'anr';
  if (/합작/.test(m)) return 'youtube';
  if (/기 데뷔 준비|합방|선배$/.test(m)) return 'vidol';
  if (/전담 편집/.test(m)) return 'editor';
  if (/편집팀/.test(m)) return did('youtube') && !did('editor') ? 'youtube' : 'editor';
  if (/뮤직비디오/.test(m)) return 'actor';
  if (/작사 계약/.test(m)) return 'lyricist';
  if (/작곡 계약/.test(m)) return 'composer';
  if (/^「[^」]*」 「/.test(m)) return 'agency';
  if (/「/.test(m)) {
    if (did('actor') && !did('director')) return 'actor';
    if (did('director') && !did('actor')) return 'director';
    return /감독/.test(j) ? 'actor' : did('director') ? 'director' : 'actor';
  }
  return 'etc';
}
// 새로운 만남: 소개팅 앱 · 취미 동호회 · 결혼정보회사 (인간관계 창과 연인 창이 같이 쓴다)
function meetHTML(s) {
  let h = `<div class="sec-h">💞 새로운 만남</div><div class="npc meet-row">`;
  for (const src of ['app', 'club', 'duo']) {
    const M = MEET_SRC[src], why = meetWhy(s, src);
    h += `<div class="opt"><button class="btn sm" data-meet="${src}" ${why ? 'disabled' : ''}>${M.ic} ${M.n} · ${fmtWon(M.c * 1e4)}</button>${why ? `<span class="h">${U.esc(why)}</span>` : ''}</div>`;
  }
  return h + `</div>`;
}
// 사람 카드 한 장: 이름·나이·직업, 친밀도, 연락·데이트·고백·청혼·헤어지기·능력 보기·돈 빌리기
function npcCard(s, n) {
  const love = n.rel === '연인' || n.rel === '배우자', used = contactsUsed(s);
  let h = `<div class="npc"><div class="npc-h"><b>${U.esc(n.name)} <span class="gchip ${n.g === '여' ? 'f' : 'm'}">${n.g === '여' ? '여성' : '남성'}</span> <span class="muted" style="font-weight:500;font-size:var(--fs-2)">${pAge(s, n)}세 · ${U.esc(n.job)}</span></b><span class="rel ${love ? 'love' : ''}">${n.rel}</span></div>`;
  h += `<div class="npc-d">${TRAIT_BY[n.trait].n}${n.soul ? ' · <span class="soul-hint">어딘가 낯익은 얼굴</span>' : ''}${n.met ? ' · ' + U.esc(n.met) : ''}${n.married && !love ? ' · 기혼' : ''}${n.ind ? ` · <b>${relWord(n)}</b>${n.fame >= 1000 ? ' · 팬 ' + fmtFans(n.fame) : ''}` : ''}</div>`;
  if (n.ind || n.rel === '자녀') h += `<div class="npc-d">${scoutLine(s, n)}</div>`;
  h += `<div class="row" style="margin-top:var(--sp-1)"><span>친밀도</span><b>${Math.round(n.aff)}</b></div>${bar(n.aff, 100, 'aff')}`;
  const called = calledThisHalf(s, n), kid = n.rel === '자녀', kidSib = n.rel === '형제자매' && pAge(s, n) < 19;
  // 자녀는 연락·고백 없이 능력만 본다. 형제자매는 그 형제자매가 성인이 된 뒤부터 연락한다
  h += `<div class="npc-btns">`;
  if (!kid && !kidSib) h += `<button class="btn sm" data-npc="${n.id}" data-op="${love ? 'date' : 'call'}" ${used >= CONTACT_MAX || called ? 'disabled' : ''}>${love ? `데이트하기 (${age(s) < 19 ? '1만 원' : '10만 원'})` : '연락하기'}</button>${called ? `<span class="hint">이번 반년(${halfName(s)})에 이미 두 번 ${love ? '만났다' : '연락했다'}</span>` : ''}`;
  if (!kid && !love && !n.married && age(s) >= 14 && !partner(s) && !['전 연인', '전 배우자', '형제자매'].includes(n.rel)) h += `<button class="btn sm" data-npc="${n.id}" data-op="confess">고백하기 · ${confessWord(s, n)}</button>`;
  // 청혼: 사귄 지 3년이 넘은 연인에게만 (둘 다 성인일 때)
  if (n.rel === '연인' && canPropose(s, n)) { const cd = s.cd.propose > s.t; h += `<button class="btn sm" data-npc="${n.id}" data-op="propose" ${cd ? 'disabled' : ''}>청혼하기 · 받아 줄 가능성 ${fmtPct(proposeP(n))}</button>${cd ? `<span class="hint">${ymLater(s, s.cd.propose - s.t)}에 다시 할 수 있다</span>` : ''}`; }
  if (n.rel === '연인') h += `<button class="btn sm danger" data-npc="${n.id}" data-op="break">헤어지기</button>`;
  if (kid) h += `<button class="btn sm" data-kid="${n.id}">능력 보기</button>`;
  // 돈 빌리기: 형제자매(친밀도가 낮으면 안 빌려준다), 아주 가까운 지인(평생 한 번)
  if (n.rel === '형제자매' && age(s) >= 19) { const no = sibLendWhy(s, n); h += `<button class="btn sm" data-npc="${n.id}" data-op="sibborrow" ${no ? 'disabled' : ''}>돈 빌리기 · ${fmtWon(sibLendAmt(s))}</button>${no ? `<span class="hint">${U.esc(no)}</span>` : ''}`; }
  else if (friendLendOK(s, n)) h += `<button class="btn sm" data-npc="${n.id}" data-op="borrow">돈 빌리기 · ${fmtWon(friendLendAmt(n))}</button>`;
  return h + `</div></div>`;
}
// 그 사람의 특기: 레벨은 범위로(가까운 사람은 정확히), 성장성은 내가 스카우트 특기와 그 분야 특기를 가졌을 때만 5단계로 보인다
function scoutLine(s, n) {
  const ks = learnedSkills(n).sort((a, b) => lv(n, b) - lv(n, a)).slice(0, 4);
  if (!ks.length) return '특기 없음';
  const v = me(s);
  return ks.map(k => `${SKILLS[k].n} ${lvSee(s, n, k)}${canScout(v, k) ? ` <span class="hint">(성장성 ${potGrade(v, n, k)})</span>` : ''}`).join(' · ');
}
function npcOp(id, op) {
  const s = S, n = s.people[id];
  if (!n) return;
  const used = contactsUsed(s);
  let r = '';
  if (op === 'call' || op === 'date') {
    if (used >= CONTACT_MAX || calledThisHalf(s, n) || (n.rel === '형제자매' && pAge(s, n) < 19)) return;
    n.callN = calledN(s, n) + 1;
    s.contactH = halfKey(s); s.contactN = used + 1; n.contactT = s.t; n.callT = s.t; n.callH = halfKey(s);
    const kid = age(s) < 19;
    if (op === 'date') { aff(n, kid ? U.int(2, 4) : U.int(4, 8)); r = `${josa(n.name, '과와')} ${kid ? U.pick(['분식집에서 떡볶이를 먹었다', '동네 공원을 같이 걸었다', '편의점에서 컵라면을 나눠 먹었다']) : '데이트를 했다'}.` + fx(s, { money: kid ? -1e4 : -10e4, stress: kid ? -3 : -6 }); }
    else { aff(n, U.int(3, 7) * (n.trait === 'kind' || n.trait === 'chatty' ? 1.3 : n.trait === 'cool' || n.trait === 'blunt' ? 0.7 : 1)); r = `${n.name}에게 연락해 안부를 물었다.` + fx(s, { stress: -2, rep: 0.6 }); }
  } else if (op === 'confess') {
    askConfirm(`${n.name}에게 고백할까요?\n${confessWord(s, n, true)}. 거절당하면 사이가 어색해집니다.`, () => { const x = confess(S, S.people[id]); addLog(S, x, 'ev'); save(S); toast(x); renderPanel(); render(); });
    return;
  } else if (op === 'sibborrow' || op === 'borrow') {
    const sib = op === 'sibborrow', v = sib ? sibLendAmt(s) : friendLendAmt(n);
    if (sib ? sibLendWhy(s, n) : !friendLendOK(s, n)) return;
    askConfirm(`${n.name}에게 ${josa(fmtWon(v), '을를')} 빌릴까요?\n매달 ${fmtWon(sibLoanPay(v))}씩 저절로 갚아요.`, () => { const x = sib ? sibBorrow(S, S.people[id]) : friendBorrow(S, S.people[id]); addLog(S, x, 'ev'); save(S); toast(x); renderPanel(); render(); });
    return;
  } else if (op === 'propose') {
    if (!canPropose(s, n) || s.cd.propose > s.t) return;
    askConfirm(`${n.name}에게 청혼할까요?\n받아 줄 가능성 ${fmtPct(proposeP(n))}. 받아 주면 바로 결혼하고(결혼식 2,000만 원) 두 사람의 재산을 합쳐요.`, () => { const x = propose(S, S.people[id]); addLog(S, x, 'ev'); save(S); toast(x); renderPanel(); render(); });
    return;
  } else if (op === 'break') {
    askConfirm(`${josa(n.name, '과와')} 헤어질까요?`, () => { const x = breakUp(S, S.people[id]); addLog(S, x, 'ev'); save(S); toast(x); renderPanel(); render(); });
    return;
  }
  if (r) { addLog(s, r, 'ev'); save(s); toast(r); }
  renderPanel(); render();
}
// 해마다 순수익 (UI 개편 시안): 올해(지금까지) · 작년, 그리고 해가 바뀔 때 적어 둔 예전 해들 (s.yNet)
function ySum(y) { return Object.values(y || {}).reduce((a, v) => a + v, 0); }
function yearNetHTML(s) {
  const N = Object.assign({}, s.yNet || {});
  if (s.lastYinc && Object.keys(s.lastYinc).length) N[s.lastYincY || calY(s) - 1] = ySum(s.lastYinc);
  N[calY(s)] = ySum(s.yinc);
  const all = Object.keys(N).map(Number).sort((a, b) => b - a), first = Math.min(...all.filter(y => Math.abs(N[y]) >= 1).concat([calY(s)]));
  const ys = all.filter(y => y >= first);
  return `<div class="sec-h">해마다 순수익</div><table class="list y-net">${ys.map(y => `<tr><td>${y}년${y === calY(s) ? ' <span class="hint">(올해 지금까지)</span>' : ''}</td><td class="${N[y] >= 0 ? 'pos' : 'neg'}">${N[y] >= 0 ? '+' : '-'}${fmtWon(Math.abs(N[y]))}</td></tr>`).join('')}</table>`;
}
function incomeTable(title, y) {
  const rows = Object.entries(y || {}).filter(([, v]) => Math.abs(v) >= 1);
  if (!rows.length) return '';
  const inc = rows.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]), exp = rows.filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
  const sum = a => a.reduce((x, [, v]) => x + v, 0);
  const net = sum(rows);
  return `<div class="sec-h">${title} <span class="n ${net >= 0 ? 'pos' : 'neg'}">순수익 ${net >= 0 ? '+' : '-'}${fmtWon(Math.abs(net))}</span></div><div class="two-col"><table class="list"><tr><th>수입</th><th>${fmtWon(sum(inc))}</th></tr>${inc.map(([k, v]) => `<tr><td>${U.esc(k)}</td><td class="pos">+${fmtWon(v)}</td></tr>`).join('')}</table><table class="list"><tr><th>지출</th><th>${fmtWon(-sum(exp))}</th></tr>${exp.slice(0, 12).map(([k, v]) => `<tr><td>${U.esc(k)}</td><td class="neg">${fmtWon(v)}</td></tr>`).join('')}</table></div>`;
}
// 경력: 예전에 했던 일 (지금 하는 일은 빼고, 최근 것부터)
function yrsMo(m) { const y = Math.floor(m / 12), mo = m % 12; return y && mo ? `${y}년 ${mo}개월` : y ? `${y}년` : `${Math.max(1, mo)}개월`; }
function careerTab(s) {
  const L = (s.careerLog || []).slice().reverse();
  if (!L.length) return `<div class="empty">아직 끝난 일이 없다. 그만두거나 계약이 끝난 일이 여기에 남는다.</div>`;
  return `<table class="list"><tr><th>나이</th><th>한 일</th><th>기간</th><th>끝난 까닭</th></tr>` + L.map(c => {
    const dated = c.from != null && c.to != null;
    return `<tr><td style="white-space:nowrap">${dated ? `${Math.floor(c.from / 12)}~${Math.floor(c.to / 12)}세` : '<span class="hint">예전</span>'}</td><td>${c.ic || ''} ${U.esc(c.n)}</td><td style="white-space:nowrap">${dated ? yrsMo(c.to - c.from) : '-'}</td><td>${U.esc(c.end || (dated ? '' : '-'))}</td></tr>`;
  }).join('') + `</table>`;
}
// 직업 창: 직업 활동 박스의 직업 배너(또는 프로필 창의 직업)를 누르면 뜬다
// 맨 위 그 분야의 유행 → 현황 → 할 일(일정의 직업 활동 칸에서 하는 일) → 그 직업 정보(등급·숙련도·내 실력·계약) → 할 수 있는 일
// 직업 창 (UI 개편 시안): 정보 · 소속 · 행동 · 업계 인물 탭
// 직업마다 정보 줄(c.info)을 이름으로 나눈다: 회사 · 그룹 · 팀에 대한 줄은 소속, 나에 대한 줄은 정보
const JOB_TABS = [['info', '📋 정보'], ['grp', '🎤 그룹'], ['org', '🏢 회사'], ['act', '🎬 행동'], ['npc', '⭐ 업계 인물']];
const GRP_ROWS = ['그룹 팬', '밴드 팬', '팀워크', '팬덤 · 대표 컨셉', '대표 컨셉', '팬덤', '기수 안 순위', '동기', '선배', '최근 평가'];
const CO_ROWS = ['소속', '회사', '일하는 곳', '팀장', '고정 일정', '작곡팀', '전담 방송인', 'MCN 지원', '공채'];
const ORG_ROWS = GRP_ROWS.concat(CO_ROWS);
const GRP_HEADS = /^(멤버|연습생 동기|선배)/, ORG_HEADS = GRP_HEADS;
const MONEY_ROWS = ['계약 기간', '정산', '갚을 비용', '쌓인 트레이닝 비용', '월급', '수입', '지난달', '지난달 강의료', '조건', '지금까지 번 돈'];
// 줄 묶음을 소제목 하나 아래에 모은다. 비어 있는 묶음은 빼고
function infoGroups(G) { return G.filter(([, L]) => L.length).map(([h, L]) => `<div class="ig"><div class="ig-h">${h}</div>${infoTable(L)}</div>`).join(''); }
const GROUP_JOBS = ['idol', 'band', 'vidol'];
function jobNpcs(s, id) { return NPC_FIDS.filter(f => NPC_F[f].trk.includes(id)); }
function panelJob() {
  const s = S, id = UI.jobId, c = CAREERS[id], t = s.tracks[id];
  const back = UI.jobFrom === 'profile' ? '<button class="btn sm ghost back-btn" data-pftab="rec">← 기록</button>' : UI.jobFrom === 'company' ? '<button class="btn sm ghost back-btn" data-panel="company">← 회사</button>' : '';
  if (!c || !trackOn(s, id)) return back + '<div class="empty">지금은 하지 않는 일이다.</div>';
  // 정보 줄을 모아서 정보 · 그룹 · 회사로 나눈다
  const ci = c.info ? c.info(s, t) : [], info = [], org = [];
  // 실력은 '내 실력' 한 줄만: 직업 정보에 '내 실력'이 없으면 그 일과 가장 가까운 특기를 '내 실력'으로 넣는다
  if (!ci.some(r => Array.isArray(r) && r[0] === '내 실력')) { const cs = careerSkill(s, id); if (cs) info.push(['내 실력', cs]); }
  // 개인 팬 = 이 일로 모은 팬 (v149): 직업마다 따로 센다. 합친 팬 수는 상태 박스에 있다
  if (POP_JOBS.includes(id)) info.unshift(['인기', popTxt(jpop(s, id))]);
  info.unshift(['개인 팬', fmtFans(Math.round((s.jf || {})[id] || 0))]);
  const cl = contractLine(s, id); if (cl) { const m = c.cLeft(s, t); info.push(['계약 기간', `${cl.replace('계약 ', '')} (${Math.max(0, m)}개월 남음)`]); }
  // 회사 대표는 회사가 곧 소속: 내 실력 · 돈 줄 말고는 모두 회사 탭
  const coOwn = id === 'agency';
  for (const r of ci) {
    if (!r) continue;
    if (Array.isArray(r)) (ORG_ROWS.includes(r[0]) || (coOwn && r[0] !== '내 실력' && !MONEY_ROWS.includes(r[0])) ? org : info).push(r);
    else if (r.bars) (GROUP_JOBS.includes(id) ? org : info).push(r);
    else (ORG_HEADS.test(r.h) || coOwn ? org : info).push(r);
  }
  // 그 일에서 함께 일하는 팀들 = 회사 직원 (피드백 28 · 29): 내가 그 팀 사람이면 '나'도 들어간다
  for (const x of jobTeams(s, id)) org.push({ h: coTeamName(x.tk), items: coTeamItems(s, x.tk, x.me, x.lead) });
  if (SONG_JOBS.includes(id)) (GROUP_JOBS.includes(id) ? org : info).push({ h: '곡 컨셉 숙련도', bars: cmBars(s) });
  // 그 직업으로 지금까지 번 돈은 정보 맨 아래
  info.push(['지금까지 번 돈', fmtWon((s.jobEarn || {})[id] || 0)]);
  // 등급(자리) 칸에는 몇 번째 등급인지 별로 보인다. 교수는 대학원 길에만 등급이 있다
  const tk = id === 'prof' ? (t.route === 'grad' ? t.tier || 0 : null) : typeof t.tier === 'number' ? t.tier : null;
  if (tk != null) { const i = info.findIndex(r => Array.isArray(r) && (r[0] === '등급' || r[0] === '자리')); if (i >= 0) info[i] = [info[i][0], info[i][1], tk]; }
  const isG = r => Array.isArray(r) ? GRP_ROWS.includes(r[0]) : r.bars || GRP_HEADS.test(r.h), grp = org.filter(isG), co = org.filter(r => !isG(r));
  // 탭: 그룹이 없는 직업(배우 등)은 그룹 탭이 없다. 업계 인물이 없는 분야는 업계 인물 탭이 없다
  const tabs = JOB_TABS.filter(([k]) => (k !== 'grp' || grp.length) && (k !== 'npc' || jobNpcs(s, id).length)), tab = tabs.some(x => x[0] === UI.jobTab) ? UI.jobTab : 'info';
  let h = back + `<h2>${jobIc(id)} ${U.esc(jobName(id))}</h2>`;
  if (JOB_FIELD[id]) h += trendRowHTML(s, JOB_FIELD[id]);
  if (c.status) h += `<p class="p-intro">${U.esc(careerStatus(s, id))}</p>`;
  h += `<div class="ap-row pf-tabs">${tabs.map(([k, n]) => `<button class="ap-tab ${tab === k ? 'on' : ''}" data-jobtab="${k}">${n}</button>`).join('')}</div>`;
  if (tab === 'act') return h + jobActTab(s, id);
  if (tab === 'npc') return h + jobNpcTab(s, id);
  if (tab === 'grp') return h + infoTable(grp);
  if (tab === 'org') return h + (co.length ? infoTable(co) : `<div class="empty">소속 없이 혼자 하는 일이다.</div>`);
  const isM = r => Array.isArray(r) && MONEY_ROWS.includes(r[0]), isB = r => !Array.isArray(r) && r.bars;
  // 활동명 (v162): 직업 지원 창이 아니라 여기서만 바꾼다
  const sn = snRowHTML(s, id);
  return h + sn + infoGroups([['⭐ 나', info.filter(r => !isM(r) && !isB(r))], ['📈 숙련도', info.filter(isB)], ['💰 계약 · 돈', info.filter(isM)]]) + (c.desc ? `<p class="hint" style="margin-top:var(--sp-3)">${U.esc(c.desc)}</p>` : '') + jobQuitHTML(s, id);
}
// 탈퇴 · 그만두기 (v163: 정보 탭 맨 아래). 누르면 정말 할지 한 번 묻는다
function jobQuitHTML(s, id) {
  const c = CAREERS[id], Q = (c.actions ? c.actions(s, s.tracks[id]) : []).filter(a => a.danger);
  return Q.length ? `<div class="sec-h">🚪 탈퇴 · 그만두기</div>` + Q.map(a => actRow(a.confirm ? a : Object.assign({}, a, { confirm: `'${a.t}' — 정말 할까요?\n되돌릴 수 없어요.` }))).join('') : '';
}
// 행동 탭: 자동 활동(할 일) → 선택 활동(골라서 하는 일) → 그 밖에 할 수 있는 일
function jobActTab(s, id) {
  const c = CAREERS[id], t = s.tracks[id];
  let h = '';
  // 따로 창이 있는 직업 (회사 대표 → 회사 창)
  if (c.panel) h += `<button class="btn primary" style="margin:var(--sp-1) 0 var(--sp-2)" data-panel="${c.panel}">${U.esc(c.panelN || '창 열기')}</button>`;
  if (c.act) h += jobTaskHTML(s, id);
  const A = c.actions ? c.actions(s, t) : [], other = A.filter(a => !a.danger);
  if (other.length) h += `<div class="sec-h">할 수 있는 일</div>` + other.map(actRow).join('');
  return h || `<div class="empty">지금 할 수 있는 일이 없다.</div>`;
}
// 업계 인물 탭: 그 직업 분야의 업계 인물만 (인간관계 창의 업계 인물과 같은 줄)
function jobNpcTab(s, id) {
  const fs = jobNpcs(s, id), L = npcList(s).filter(n => fs.includes(n.f) && (n.kn || n.fol)).sort((a, b) => (b.fol || 0) - (a.fol || 0) || (b.rk ? 1 : 0) - (a.rk ? 1 : 0) || b.pop - a.pop);
  return L.length ? npcRowsHTML(s, L) : `<div class="empty">아직 알게 된 업계 인물이 없다.</div>`;
}
// 자동 활동 (v162): 지금 하는 것 하나만, 이름과 내용만 보인다 (고정 일정 · 시기 설명은 빼고)
function effTxt(x) { return Array.isArray(x.eff) ? x.eff.map(([k, v]) => `${k} ${v}`).join(' · ') : (x.eff || ''); }
function autoActN(n) { n = String(n || ''); return n.includes('활동') ? n.replace('활동', '자동 활동') : `자동 활동 · ${n}`; }
function actNowRow(x) { return `<div class="act lrow"><div><div class="a-t">${U.esc(`${x.ic || ''} ${autoActN(x.n)}`)}</div><div class="lr-eff">${U.esc(effTxt(x))}</div></div></div>`; }
const ACT_NONE = `<div class="lnote">지금 하는 자동 활동이 없다</div>`;
function jobTaskHTML(s, id) {
  const c = CAREERS[id], n = jobSlots(s, id), cur = jobTask(s, id), f = jobForced(s, id), t = s.tracks[id];
  if (c.auto && !f) return jobAutoHTML(s, id, n);
  const head = '';
  if (f) {
    // 회사 · 촬영이 정한 일: 시기에 따라 바뀌는 직업(아이돌)은 지금 시기의 것 하나
    const AL = c.autoList ? c.autoList(s, t) : null, x = AL ? AL.find(x => x.on) : cur && jobTasks(id).find(y => y.id === cur.id);
    return head + (x ? actNowRow(x) : ACT_NONE) + jobPicksHTML(s, id, true);
  }
  // 할 일이 하나뿐이면 저절로 한다 (v118 UI B4)
  const V = jobTasks(id).filter(x => !x.show || x.show(s));
  if (V.length === 1) return head + (n ? actNowRow(V[0]) : ACT_NONE) + jobPicksHTML(s, id, n > 0);
  // 할 일을 고르는 직업: 고르는 목록 (안 골랐으면 경고만)
  let h = head + (n && !cur ? `<div class="lnote bad">할 일을 고르지 않으면 평가가 크게 떨어진다</div>` : '');
  for (const x of V) {
    const on = !!cur && cur.id === x.id;
    h += actRow({ t: `${x.ic} ${x.n}`, tag: on ? '하는 중' : '', eff: effTxt(x), ok: n > 0 || on, why: '일정에 빈 칸이 없다', btn: on ? '그만하기' : '하기', run: s => { s.jobDo = s.jobDo || {}; if (on) { delete s.jobDo[id]; return `${josa(x.n, '을를')} 그만했다.`; } s.jobDo[id] = x.id; return ''; } });
  }
  return h + jobPicksHTML(s, id, !!cur && n > 0);
}
// 골라서 하는 일 (v117: 밴드 · 아이돌 그룹의 팀 활동). 그 직업 일을 하고 있을 때만 고를 수 있다
// 골라서 한 일은 직업마다 언제 했는지 적어 둔다. 고를 수 있는 일이 있는데 석 달 넘게 하나도 안 했으면 그 직업 배너에 레드닷 (v118 UI B4)
function pickWrap(id, a) { if (!a.run) return a; const r = a.run; return Object.assign({}, a, { run: s => { (s.pickT = s.pickT || {})[id] = s.t; return r(s); } }); }
// v159 켜 두는 일(sw): 하나도 안 켜 뒀을 때, 또는 고를 수 있는 것이 바뀌었을 때(새로 켤 수 있게 됨 · 막힘 · 이름이 바뀜)만 레드닷. 직업 창을 열면 본 것으로 친다
function pickSig(P) { return P.filter(a => a.sw).map(a => `${a.t}:${a.ok ? 1 : 0}:${a.on ? 1 : 0}`).join('|'); }
function pickDue(s, id) {
  const c = CAREERS[id]; if (!c.picks || !jobN(s, id)) return false;
  let P = []; try { P = c.picks(s, s.tracks[id]) || []; } catch (e) { }
  const W = P.filter(a => a.sw);
  if (W.length) {
    if (!W.some(a => a.on) && W.some(a => a.ok)) return true;
    const S0 = s.pickSig = s.pickSig || {}, sg = pickSig(P);
    if (S0[id] == null) S0[id] = sg; // 예전 세이브: 지금 것을 본 것으로 친다
    if (S0[id] !== sg) return true;
  }
  const last = (s.pickT || {})[id];
  return P.some(a => a.ok && !a.sw) && (last == null || s.t - last >= 3);
}
// sec: 그 줄 위에 붙이는 작은 안내 (v157 아이돌: '켜 두면 매달 꾸준히 한다')
function jobPicksHTML(s, id, on) {
  const c = CAREERS[id], P = c.picks ? c.picks(s, s.tracks[id]) : [];
  if (P.some(a => a.sw)) (s.pickSig = s.pickSig || {})[id] = pickSig(P);
  return P.length ? `<div class="sec-h">🖐️ 선택 활동</div>` + P.map(a => (a.sec ? `<div class="lnote">${U.esc(a.sec)}</div>` : '') + actRow(Object.assign({}, pickWrap(id, a), on ? {} : { ok: false, why: '일정에 이 일을 넣어야 할 수 있다' }))).join('') : '';
}
// 직업 활동 두 갈래 (7-4단계부터): 칸만 넣어 두면 자동으로 하는 일 + 칸을 넣은 채로 골라서 하는 일 (c.picks)
function jobAutoHTML(s, id, n) {
  const c = CAREERS[id], t = s.tracks[id];
  // 지금 하는 자동 활동 하나만 (일정에 칸이 없으면 없음)
  const x = n ? (c.autoList ? c.autoList(s, t) : []).find(x => x.tag !== false) : null;
  let h = x ? actNowRow(x) : ACT_NONE;
  const P = c.picks ? c.picks(s, t) : [];
  if (P.some(a => a.sw)) (s.pickSig = s.pickSig || {})[id] = pickSig(P);
  if (P.length) h += `<div class="sec-h">🖐️ 선택 활동</div>` + P.map(a => (a.sec ? `<div class="lnote">${U.esc(a.sec)}</div>` : '') + actRow(Object.assign({}, pickWrap(id, a), n ? {} : { ok: false, why: '일정에 빈 칸이 없다' }))).join('');
  return h;
}
// 프로필의 걸어온 길 탭: 인생 기록 전체 (v89). 받은 상은 작품 탭 아래에
function pfLogTab(s) { return lifeLogHTML(s); }
function pfAwardsHTML(s) { return s.awards.length ? `<div class="sec-h">🏆 받은 상 (${s.awards.length})</div><table class="list"><tr><th>해</th><th>상</th></tr>${s.awards.slice().reverse().map(a => `<tr><td>${a.y}</td><td>${U.esc(a.n)}</td></tr>`).join('')}</table>` : ''; }
// 프로필의 작품 탭: 종류별 편수, 그리고 작품마다 해·종류·제목·성적·수입 (수입은 그 작품으로 들어온 돈을 모두 더한 것)
// ───── 곡 발매 결과 카드 (v118 UI C1) · 정산서 (C2) ─────
// 카드와 정산서는 작은 창(#pop)으로 띄운다. 결과 창 · 작품 탭 · 요약 창 · 재정 창에서 같은 모양
function songCardHTML(c) {
  const fans = (c.fans || []).filter(([, v]) => v).map(([n, v]) => `<span class="${v >= 0 ? 'pos' : 'neg'}">${U.esc(n)} ${sgnFans(v)}</span>`).join(' · ');
  return `<div class="scard"><div class="sc-top"><span class="sc-t">${c.top != null ? U.esc(c.t) : `「${U.esc(c.t)}」`}</span><span class="sc-by">${U.esc(c.by || '')}</span></div>${c.c ? `<div class="sc-c">'${U.esc(c.c)}' 컨셉${c.y ? ` · ${c.y}년` : ''}</div>` : ''}`
    + (c.top != null ? `<div class="sc-peak${c.tp > 0 ? ' ev-g' : c.tp < 0 ? ' ev-b' : ''}">${U.esc(c.top)}</div>` : `<div class="sc-peak${c.peak ? '' : ' out'}">${c.peak ? `최고 ${c.peak}위` : '차트 100위 밖'}${c.wins ? ` · 음악방송 1위 ${c.wins}회` : ''}</div>`)
    + (fans || c.pay != null ? `<div class="sc-fans">${[fans, c.pay != null ? `<span class="sc-pay">정산 ${fmtWon(c.pay)}</span>` : ''].filter(Boolean).join(' · ')}</div>` : '')
    + (c.lines && c.lines.length ? `<div class="sc-h">${U.esc(c.lh || '듣는 사람 반응')}</div>${c.lines.map(x => `<div class="sc-l">${evCol(U.esc(x))}</div>`).join('')}` : '')
    + (c.cmp ? `<div class="sc-cmp${/낫다/.test(c.cmp) ? ' ev-g' : /아쉽다/.test(c.cmp) ? ' ev-b' : ''}">${U.esc(c.cmp)}</div>` : '') + (c.bill ? billBtnHTML(c.bill) : '') + (c.live ? liveBtnHTML(c.live) : '') + `</div>`;
}
function billKey(b) { UI.billMap = UI.billMap || {}; const k = UI.billN = (UI.billN || 0) + 1; UI.billMap[k] = b; delete UI.billMap[k - 400]; return k; }
function billBtnHTML(b) { return `<button class="bill-bn" data-bill="${billKey(b)}">🧾 정산서<span class="bb-t">${U.esc(b.t || '')}</span></button>`; }
function billHTML(b) {
  return `<div class="bill"><div class="bill-h">🧾 ${U.esc(b.t || '정산서')}</div><table>${b.rows.map(r => r === '-' ? '<tr class="sep"><td colspan="2"></td></tr>' : `<tr${r[2] ? ' class="tot"' : ''}><td>${U.esc(r[0])}</td><td>${r[1] < 0 ? '− ' : ''}${fmtBill(r[1])}</td></tr>`).join('')}</table>${b.note ? `<div class="bill-note">${U.esc(b.note)}</div>` : ''}</div>`;
}
// cls: 큰 팝업(라이브온 · 커뮤니티)은 실시간 창과 같은 크기 · 같은 어두운 바탕 ('live-card pf-card')
function popOpen(h, cls) { const c = $('#pop-card'); c.className = 'mcard pop-card' + (cls ? ' ' + cls : ''); c.innerHTML = `<button class="m-close" data-popclose>✕</button>` + h; $('#pop').classList.remove('hidden'); UI.plioOpen = null; }
function popClose() { $('#pop').classList.add('hidden'); UI.plioOpen = null; }
// 요약 창의 발매 줄: 그 곡의 카드 번호 (없으면 -1). 내 회사 그룹 앨범(v119)은 'co|그룹 id|제목'
const SONG_EVS = new Set(['band_relres', 'solo_relres', 'idol_cbres', 'co_res']);
function songIdx(s, x) {
  if (!SONG_EVS.has(x.e)) return -1;
  const T = [...(x.x || '').matchAll(/「([^」]+)」/g)].map(m => m[1]);
  if (!T.length) return -1;
  if (x.e === 'co_res') { const g = coCardGroups(s).find(g => T.includes(g.name)); return g && g.disc.some(a => a.card && T.includes(a.title)) ? `co|${g.id}|${g.disc.slice().reverse().find(a => a.card && T.includes(a.title)).title}` : -1; }
  for (let i = s.works.length - 1; i >= 0; i--) if (s.works[i].card && s.works[i].card.t === T[0]) return i;
  return -1;
}
function coCardGroups(s) { const t = s.tracks && s.tracks.agency; return t && t.groups ? t.groups : []; }
// 카드 찾기: 작품 번호 또는 'co|그룹 id|제목'
function songCardAt(s, k) {
  if (String(k).startsWith('co|')) { const [, gid, ...r] = String(k).split('|'), title = r.join('|'), g = coCardGroups(s).find(g => g.id === gid); const a = g && g.disc.slice().reverse().find(a => a.card && a.title === title); return a ? a.card : null; }
  const w = s.works[+k]; return w && w.card ? w.card : null;
}
function pfWorksTab(s) {
  if (!s.works.length) return `<div class="empty">아직 세상에 나온 작품이 없다.</div>` + pfAwardsHTML(s);
  const cnt = {};
  for (const w of s.works) cnt[w.type] = (cnt[w.type] || 0) + 1;
  return `<div class="chips" style="margin:2px 0 var(--sp-3)">${Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span class="chip">${U.esc(k)} ${v}</span>`).join('')}</div>`
    + `<table class="list"><tr><th>해</th><th>종류</th><th>제목</th><th>성적</th><th>수입</th></tr>${s.works.map((w, i) => [w, i]).reverse().map(([w, i]) => `<tr${w.card ? ` class="has-card" data-song="${i}"` : ''}><td>${w.y}</td><td>${U.esc(w.type)}</td><td>「${U.esc(w.title)}」${w.card ? ' 🎧' : ''}</td><td>${U.esc(w.note || '')}</td><td style="white-space:nowrap">${w.pay ? fmtWon(w.pay) : '-'}</td></tr>`).join('')}</table>` + pfAwardsHTML(s);
}
function homeNow(s) {
  const r = REGION_BY[s.region], hm = s.home, where = `${s.place}`;
  if (isDorm(s)) return { ic: '🏢', k: '기획사 숙소', n: '기획사 숙소', d: '집세가 들지 않는다' };
  if (hm.mode === 'parents') return { ic: '👪', k: '본가', n: `${where} 본가`, d: age(s) >= 19 ? `부모님 집 · 매달 생활비 ${homeBase(s)}만 원과 번 돈의 15%를 보탠다` : '부모님 집' };
  const t = hm.type || 'monthly', z = homeSize(hm), nm = homeName(t, z), mc = homeMonthly(s.region, t, z), eq = ` · 장비 ${SIZE_EQ[z]}개까지 · ${SIZE_REST_N[z]}`;
  if (t === 'monthly') return { ic: '🔑', k: '월세', n: `${where} ${nm}`, d: `보증금 ${fmtWon(hm.deposit || 0)} · 매달 월세·생활비 ${mc}만 원${eq}` };
  if (t === 'jeonse') return { ic: '📄', k: '전세', n: `${where} ${nm}`, d: `전세금 ${fmtWon(hm.deposit || 0)}${hm.loan ? ` (남은 대출 ${fmtWon(hm.loan)})` : ''} · 월세 없음 · 매달 관리비·생활비 ${mc}만 원${hm.loan ? ' + 대출 상환' : ''}${eq}` };
  return { ic: '🏠', k: '매매 (내 집)', n: `${where} ${nm}`, d: `지금 집값 ${fmtWon(hm.value || 0)}${hm.loan ? ` (남은 대출 ${fmtWon(hm.loan)})` : ''} · 매달 관리비·생활비 ${mc}만 원${hm.loan ? ' + 대출 상환' : ''}${eq}` };
}
// 생활: 오른쪽 아래 칸에는 네 묶음(집·지속 관리·장비 설치·기타)의 짧은 요약만 보이고, 누르면 그 묶음의 창이 뜬다 (진행 중인 일과 같은 방식)
// 휴대폰의 생활 버튼 창도 같은 요약 목록을 보여 준다
const LIFE_SECS = [['home', '🏠', '집'], ['subs', '🥗', '지속 관리'], ['equip', '🎛️', '장비 설치'], ['etc', '💉', '기타']];
// 묶음마다 요약: main 굵게 한 줄, sub 작게 한 줄
function lifeSecSum(s, k) {
  if (k === 'home') {
    const hn = homeNow(s), r = REGION_BY[s.region], hm = s.home, t = hm.type || 'monthly';
    const cost = isDorm(s) ? '집세 없음' : hm.mode === 'parents' ? (age(s) >= 19 ? `생활비 월 ${homeBase(s)}만 원 + 번 돈의 15%` : '부모님 집') : t === 'monthly' ? `월세·생활비 월 ${r.rent}만 원` : `관리비·생활비 월 ${Math.round(r.rent * (t === 'jeonse' ? 0.55 : 0.45))}만 원${hm.loan ? ' + 대출 상환' : ''}`;
    const owe = (hm.loan || 0) + Math.max(0, s.debt) + (s.sibLoan ? s.sibLoan.left : 0) + (s.friendLoan ? s.friendLoan.left : 0);
    return { main: hn.n, sub: cost + (owe ? ` · 갚을 돈 ${fmtWon(owe)}` : '') };
  }
  if (k === 'subs') {
    const on = Object.keys(SUBS).filter(id => !SUBS[id].kids && s.subs && s.subs[id]);
    const kidC = subCost(s, 'kidedu'), total = on.reduce((a, id) => a + subCost(s, id), 0) + kidC;
    const names = on.map(id => SUBS[id].n.replace(/ \(.*\)$/, '')).concat(kidC ? ['자녀 교육비'] : []);
    return names.length ? { main: `${names.length}가지 이용 중 · 월 ${total}만 원`, sub: names.join(' · ') } : { main: '이용 중인 관리 없음', sub: '식단 · PT · 피부과 · 상담 등' };
  }
  if (k === 'equip') {
    const have = Object.keys(EQUIP).filter(id => eqLv(s, id));
    const can = Object.keys(EQUIP).filter(id => !eqLv(s, id) && (EQUIP[id].slot ? age(s) >= EQUIP[id].min : EQUIP[id].k.some(x => has(me(s), x) || homeKids(s).some(c => has(c, x))))).length;
    if (have.length) return { main: `${have.length}개 들여놓음 · 유지비 월 ${have.reduce((a, id) => a + eqUp(id, eqLv(s, id)), 0)}만 원`, sub: have.map(id => EQUIP[id].slot ? EQUIP[id].n : `${EQUIP[id].n} ${eqLv(s, id)}단계`).join(' · ') };
    return { main: '들여놓은 장비 없음', sub: can ? `들일 수 있는 장비 ${can}개` : '배운 특기에 맞는 장비가 아직 없다' };
  }
  const surg = Object.keys(SURGERY).filter(id => !s.flags[id]).length;
  const trip = age(s) < 19 ? '여행은 성인이 된 뒤에' : s.cd.trip > s.t ? `여행은 ${s.cd.trip - s.t}개월 뒤에 다시` : '여행 다녀올 수 있음';
  return { main: '특기 배우기 · 시술 · 여행', sub: `${trip} · 남은 시술 ${surg}가지` };
}
function lifeTilesHTML(s) {
  return `<div class="trks life-tiles">` + LIFE_SECS.map(([k, ic, n]) => { const x = lifeSecSum(s, k); return `<div class="trk ltile${ltLock(s, k) ? ' chainlk' : ''}"${ltLock(s, k) ? '' : ` data-lifesec="${k}"`}>${ltDot(s, k)}<b>${ic} ${n}</b><div class="lt-main">${U.esc(x.main)}</div><div class="st">${U.esc(x.sub)}</div></div>`; }).join('') + `</div>`;
}
// 묶음 창의 내용
function lifeSecBody(s, k) {
  const r = REGION_BY[s.region], A = lifeActs(s);
  const rowsOf = f => A.filter(f).map(actRow).join('');
  const sec = (key, title, note, row) => { const rows = A.filter(a => a.sec === key); if (!rows.length) return ''; return `<div class="sec-h">${title}</div>${note ? `<div class="lnote">${note}</div>` : ''}${rows.map(row || actRow).join('')}`; };
  let h = '';
  if (k === 'home') {
    const hn = homeNow(s);
    h += `<div class="home-now big"><span class="hn-ic">${hn.ic}</span><div><div class="hn-k">지금 사는 곳 · ${hn.k}</div><div class="hn-n">${U.esc(hn.n)}</div><div class="hn-d">${U.esc(hn.d)}</div>${houseAsset(s) ? `<div class="hn-a">${houseLabel(s)} <b>${fmtWon(houseAsset(s))}</b> · ${houseNote(s)}</div>` : ''}</div></div>`;
    h += `<div class="lnote">${r.d}. 서울에 가까울수록 오디션·섭외 기회가 많다.</div>`;
    h += sec('loan', '💳 대출 · 빚', '');
    if (age(s) < 19) h += `<div class="sec-h">🏠 이사</div><div class="lnote">성인이 되면(19세) 혼자 나가 살 집을 구할 수 있다.</div>`;
    else {
      h += `<div class="sec-h">🏠 이사</div><div class="lnote">이사하면 지금 집의 보증금·전세금·집값은 돌려받는다</div>`;
      // 월세·전세·매매는 분류(접었다 펴는 칸)로. 처음에는 접혀 있고, 지금 이사할 수 있는 집 수를 보여 준다
      UI.homeOpen = UI.homeOpen || {};
      for (const [ty, title] of [['monthly', '🔑 월세'], ['jeonse', '📄 전세'], ['own', '🏠 매매 (집 사기)']]) {
        const items = A.filter(a => a.sec === 'home' && a.homeType === ty);
        if (!items.length) continue;
        const okN = items.filter(a => a.ok).length, open = !!UI.homeOpen[ty];
        h += `<div class="ap-cat"><button class="ap-cat-h ap-tog" data-homecat="${ty}" data-open="${open ? 1 : 0}">${open ? '▾' : '▸'} ${title}<span class="hint">${okN ? `지금 이사 가능 ${okN}곳` : '지금 이사할 수 있는 곳은 없다'}</span></button>${open ? items.map(actRow).join('') : ''}</div>`;
      }
      const par = rowsOf(a => a.sec === 'home' && a.homeType === 'parents');
      if (par) h += `<div class="home-sub"><div class="home-sub-h">👪 본가</div>${par}</div>`;
    }
  }
  if (k === 'subs') h += A.filter(a => a.sec === 'subs').map(actRow).join('') || '<div class="empty">지금 할 수 있는 관리가 없다.</div>';
  if (k === 'equip') {
    const ag = dormAg(s);
    h += `<div class="lnote">집에 들인 장비 <b>${eqHomeIds(s).length}/${eqCap(s)}개</b> (${s.home.mode === 'parents' || !s.home.type ? '본가' : homeName(s.home.type, homeSize(s.home))}) · 연습실·합주실 대여와 어학 인강은 자리를 차지하지 않는다${homeKids(s).length ? ' · 자녀도 장비의 영향을 받는다.' : ''}</div>`;
    if (ag) h += `<div class="lnote">지금은 ${ag.n} 숙소에 산다. 보컬·작곡·악기·댄스·연기·예능·어학은 기획사 연습실 장비(${ag.eq || 1}단계 · 상승률 +${eqPct(ag.eq || 1)}%)로 연습하고, 집에 들인 장비는 쓰지 못한다.</div>`;
    // 들여놓은 장비는 들여온 순서대로, 그 아래에 아직 안 들인 장비 (v130). 매달 나가는 유지비도 위에 적는다
    const ord = eqOrder(s).map(id => EQUIP[id].n), oi = a => a.lv ? (ord.indexOf(a.t) < 0 ? 99 : ord.indexOf(a.t)) : 100, em = eqMonthly(s);
    if (ord.length) h += `<div class="lnote">장비 유지비 <b>월 ${em.mine}만 원</b>${em.fam ? ` · 부모님이 내 주시는 유지비 월 ${em.fam}만 원` : ''}</div>`;
    h += A.filter(a => a.sec === 'equip').sort((a, b) => oi(a) - oi(b)).map(actRow).join('') || '<div class="empty">배운 특기에 맞는 장비가 아직 없다.</div>';
  }
  if (k === 'etc') h += (sec('learn', '📚 특기 배우기', '') + sec('surgery', '💉 시술 (평생 한 번)', '') + sec('rest', '✈️ 쉬기', '', lifeAutoRow)) || '<div class="empty">지금 할 수 있는 게 없다. 시술은 정해진 나이부터 받을 수 있다.</div>';
  return h;
}
// 생활 창 맨 위: 지금 가진 돈 (턴제 실험 6차)
function lifeCashHTML(s) { return `<div class="life-cash">💰 가진 돈 <b class="${s.money < 0 ? 'neg' : ''}">${fmtWon(s.money)}</b>${s.debt > 0 ? ` <span class="hint">· 빚 ${fmtWon(s.debt)}</span>` : ''}</div>`; }
function panelLife() { UI.lifeFrom = 'panel'; return `<h2>🏠 생활</h2>` + lifeCashHTML(S) + lifeTilesHTML(S); }
// 장비 칸 (v118 UI B2): 들일 수 있기 전(독립 전 · 나이)이고 가진 장비도 없으면 사슬로 잠근다
// 특기를 배워 새로 들일 수 있는 장비가 생기면 오른쪽 위에 레드닷 (장비 창을 열면 꺼진다)
function eqCanIds(s) { return Object.keys(EQUIP).filter(id => !eqLv(s, id) && (EQUIP[id].slot ? age(s) >= EQUIP[id].min : EQUIP[id].k.some(x => has(me(s), x) || homeKids(s).some(c => has(c, x))))); }
function ltLock(s, k) { return k === 'equip' && !Object.keys(EQUIP).some(id => eqLv(s, id)) && !!eqBuyWhy(s) && !dormAg(s); }
// v163: 한 번이라도 가졌던 장비는 본 것으로 친다. 예전에는 독립하면서 부모님 집에 두고 온 장비가 '새로 들일 수 있는 장비'로 다시 잡혀서, 창은 그대로인데 레드닷이 떴다
function ltDot(s, k) {
  if (k !== 'equip' || ltLock(s, k)) return '';
  const L = eqCanIds(s); if (!s.eqSeen) s.eqSeen = L.slice();
  for (const id of Object.keys(s.equip || {})) if (eqLv(s, id) && !s.eqSeen.includes(id)) s.eqSeen.push(id);
  return L.some(id => !s.eqSeen.includes(id)) ? '<span class="rdot"></span>' : '';
}
function panelLifeSec() {
  if (UI.lifeSec === 'equip' && S) S.eqSeen = [...new Set((S.eqSeen || []).concat(eqCanIds(S)))];
  const k = UI.lifeSec || 'home', d = LIFE_SECS.find(x => x[0] === k) || LIFE_SECS[0];
  return `${UI.lifeFrom === 'panel' ? '<button class="btn sm ghost back-btn" data-panel="life">← 생활</button>' : ''}<h2>${d[1]} ${d[2]}</h2>` + lifeCashHTML(S) + lifeSecBody(S, k);
}
// 생활 박스 (UI 개편 시안): 장비 · 집 / 지속 관리 · 기타 네 배너를 사분면으로. 배너에는 짧은 설명만, 누르면 그 묶음 창
const LIFE_Q = [['equip', '🎛️', '장비', '연습 장비 들이기 · 업그레이드'], ['home', '🏠', '집', '이사 · 대출'], ['subs', '🥗', '지속 관리', '식단 · PT · 피부과 · 상담 등'], ['etc', '💉', '기타', '특기 배우기 · 시술 · 여행']];
function renderLifeCard() {
  const el = $('#life-grid');
  if (!el || !S) return;
  const h = LIFE_Q.map(([k, ic, n, d]) => { const lk = ltLock(S, k); return `<div class="lq${lk ? ' chainlk' : ''}"${lk ? '' : ` data-lifesec="${k}"`}>${ltDot(S, k)}<div class="lq-h">${ic} ${n}${lk ? '' : '<span class="bn-arr">›</span>'}</div><div class="lq-d">${U.esc(d)}</div></div>`; }).join('');
  if (h === UI.lifeHTML) return;
  UI.lifeHTML = h; el.innerHTML = h;
}
// ───── 재정 창: 오른쪽 재정 박스를 누르면 뜬다. 지난달(기본) / 최근 1년 / 연도별 ─────
function moneyTable(items) {
  const rows = Object.entries(items || {}).filter(([, v]) => Math.abs(v) >= 1);
  const inc = rows.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]), exp = rows.filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
  const sum = a => a.reduce((x, [, v]) => x + v, 0);
  return { inc, exp, iSum: sum(inc), eSum: -sum(exp) };
}
function panelMoney() {
  const s = S, tab = UI.monTab || 'm', hist = s.monHist || [];
  let items = {}, fam = 0, when = '';
  if (tab === 'm') { const lm = s.lastMon || { items: {} }; items = lm.items || {}; fam = lm.familyPaid || 0; when = '지난달'; }
  else { for (const m of hist) { for (const [k, v] of Object.entries(m.items || {})) items[k] = (items[k] || 0) + v; fam += m.fam || 0; } when = hist.length >= 12 ? '최근 1년' : `최근 ${Math.max(1, hist.length)}개월`; }
  const T = moneyTable(items), net = T.iSum - T.eSum;
  // 탭: 1개월 · 1년(최근 12달) · 연도별(올해와 작년, 예전 기록 창에 있던 표)
  let h = `<div class="pn-head"><h2>💰 재정</h2><div class="seg">${[['m', '1개월'], ['y', '1년'], ['cal', '연도별']].map(([k, n]) => `<button class="ap-tab ${tab === k ? 'on' : ''}" data-montab="${k}">${n}</button>`).join('')}</div></div>`;
  if (tab === 'cal') h += yearNetHTML(s) + (incomeTable(`${calY(s)}년 (올해)`, s.yinc) + incomeTable(`${s.lastYincY || calY(s) - 1}년 (작년)`, s.lastYinc) || '<div class="empty">아직 기록이 없다.</div>');
  else {
    h += `<div class="mon-when">${when}</div>`;
    h += `<div class="mon-sum"><div><div class="ms-k">들어온 돈</div><div class="ms-v pos">+${fmtWon(T.iSum)}</div></div><div><div class="ms-k">나간 돈</div><div class="ms-v neg">-${fmtWon(T.eSum)}</div></div><div><div class="ms-k">남은 돈</div><div class="ms-v ${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : '-'}${fmtWon(Math.abs(net))}</div></div></div>`;
    // 정산서가 있는 수입 줄은 누르면 정산서 (v118 UI C2)
    const list = (arr, cls) => arr.length ? arr.map(([k, v]) => `<div class="mon-row${v > 0 && (s.bills || {})[k] ? ' has-bill' : ''}"${v > 0 && (s.bills || {})[k] ? ` data-bill="${billKey(s.bills[k])}"` : ''}><span>${U.esc(k)}${v > 0 && (s.bills || {})[k] ? ' 🧾' : ''}</span><b class="${cls}">${v > 0 ? '+' : '-'}${fmtWon(Math.abs(v))}</b></div>`).join('') : '<div class="hint">없음</div>';
    h += `<div class="two-col"><div><div class="sec-h">수입</div>${list(T.inc, 'pos')}</div><div><div class="sec-h">지출</div>${list(T.exp, 'neg')}</div></div>`;
    if (fam) h += `<div class="lnote" style="margin-top:var(--sp-2)">가족이 대 준 돈 ${fmtWon(fam)} (${famPaidWhat(s)})</div>`;
  }
  // 지금 상황과 빌리기·갚기
  const owe = [['빚', s.debt], ['주택·전세 대출', s.home.loan || 0], ['형제자매에게 빌린 돈', s.sibLoan ? s.sibLoan.left : 0], [s.friendLoan ? `${s.friendLoan.name}에게 빌린 돈` : '', s.friendLoan ? s.friendLoan.left : 0]].filter(([, v]) => v > 0);
  // 지금 가진 것: 현금, 집에 든 내 돈, 빚, 매달 들어오는 돈, 지금까지 번 돈, 맨 아래 총자산
  const ha = houseAsset(s), roy = s.catalog.reduce((a, c) => a + c.m, 0), sp = partner(s);
  h += `<div class="sec-h">지금</div><div class="mon-row"><span>현금</span><b>${fmtWon(s.money)}</b></div>`;
  if (ha) h += `<div class="mon-row"><span>${houseLabel(s)} <span class="hint">${houseNote(s)}</span></span><b>${fmtWon(ha)}</b></div>`;
  h += owe.map(([k, v]) => `<div class="mon-row"><span>${k}</span><b class="neg">${fmtWon(v)}</b></div>`).join('');
  if (isSpouse(sp)) h += `<div class="mon-row"><span>배우자 수입 <span class="hint">월급 ${fmtWon(spouseIncome(sp))} 중 절반을 집에 보탠다</span></span><b class="pos">매달 약 ${fmtWon(spousePay(s, sp))}</b></div>`;
  if (roy) h += `<div class="mon-row"><span>저작권료·음원 수익 <span class="hint">조금씩 줄어든다</span></span><b class="pos">매달 약 ${fmtWon(roy)}</b></div>`;
  h += `<div class="mon-row"><span>지금까지 업계에서 번 돈</span><b>${fmtWon(s.earned)}</b></div>`;
  h += `<div class="mon-row total"><span>총자산 (집 포함)</span><b>${fmtWon(s.money + ha)}</b></div>`;
  const L = lifeActs(s).filter(a => a.sec === 'loan');
  if (L.length) h += `<div class="sec-h">💳 갚기 · 빌리기</div>` + L.map(actRow).join('');
  return h;
}
// 연예계 은퇴 (v163): 메뉴의 '이 인생을 그만두고 새로 시작'을 대신한다. 성인이 된 뒤에 할 수 있고, 누르면 정말 할지 한 번 묻는다
function retireBtnHTML(s) {
  if (!s || s.ended) return '';
  const ok = age(s) >= 19;
  return `<button class="btn danger" id="m-retire"${ok ? '' : ' disabled'}>🌙 연예계 은퇴${ok ? '' : ' (성인이 된 뒤에)'}</button>`;
}
function panelMenu() {
  return `<h2>메뉴</h2><div class="choices">
    <button class="btn" id="m-copycode">세이브 코드 복사하기 (다른 기기로 옮길 때)</button>
    <button class="btn" data-panel="pastecode">세이브 코드 붙여넣기</button>
    <button class="btn" id="m-export">세이브 파일로 내보내기 (PC에서만)</button>
    <button class="btn" id="m-import">세이브 파일 불러오기</button>
    <button class="btn" data-endprev>인생 결산 창 미리 보기</button>
    <button class="btn" data-logsize="1">인생 기록 글자 크게</button>
    <button class="btn" data-logsize="-1">인생 기록 글자 작게</button>
    <div class="lv-set"><span>실시간 창</span>${LIVE_MODES.map(([k, n]) => `<button class="btn sm${liveMode() === k ? ' primary' : ''}" data-livemode="${k}">${n}</button>`).join('')}</div>
    <button class="btn" data-panel="help">도움말</button>
    <button class="btn" id="m-title">첫 화면으로 (자동 저장됨)</button>
    ${retireBtnHTML(S)}
  </div><p class="hint">키보드: 스페이스바 진행 · 1 한 달 후 · 2 1년 후</p>`;
}
function panelHall() {
  const h = getHall();
  let x = `<h2>지난 인생들</h2>`;
  if (!h.length) return x + `<div class="muted">아직 끝난 인생이 없다.</div>`;
  // 결산 창과 같은 모양의 작은 카드 (v150): 무대 그림 위에 이름 · 칭호, 아래에 숫자 셋
  x += `<div class="hall-list">` + h.map(e => `<div class="hall-c"><div class="hall-top"><div class="hall-n">${U.esc(e.name)}</div>${e.title ? `<div class="hall-t">${U.esc(e.title)}</div>` : ''}<div class="hall-y">${e.by}년생 · ${e.kind === 'handoff' ? `${e.retireAge}세에 아이에게 넘김` : `${e.retireAge}세 ${e.kind === 'fail' ? '꿈을 접음' : '은퇴'} · ${e.deathAge}세에 떠남`}${e.gen > 1 ? ` · ${e.gen}대째` : ''}</div></div>`
    + `<div class="hall-nums"><div><b>${fmtFans(e.peakFans || 0)}</b><span>가장 많을 때 팬</span></div><div><b>${endWon(e.earned || 0)}</b><span>번 돈</span></div><div><b>${e.awards || 0}개</b><span>받은 상</span></div></div></div>`).join('') + `</div>`;
  return x;
}
function panelHelp() {
  return `<h2>도움말</h2>
  <div class="sec-h">재능과 특기</div><div class="ms">재능은 태어날 때 정해지고 거의 안 변해요. 특기는 살면서 만나는 선택지로 처음 배우고, 그다음부터 일정에서 연습하거나 학원에 다니며 레벨을 올려요. 오래 안 하면 천천히 떨어져요. 특기마다 숨은 한계(포텐)가 있어서, 그 근처에 가면 잘 안 늘어요.</div>
  <div class="sec-h">일정</div><div class="ms">초등학교에 들어가면 '📅 이번 달 일정' 칸에서 매달 할 일을 정해요. 고등학교 졸업 전에는 학원비를 가족이 내 줄 수도 있어요(집안 형편에 따라 개수가 달라요).</div>
  <div class="sec-h">직업</div><div class="ms">진로 백과사전에서 직업을 알아볼 수 있어요. 아티스트(앞에 서는 일)와 스태프(뒤에서 만드는 일), 회사 경영으로 나뉘어 있어요.</div>`;
}

// ───── 세이브 코드 (기기 사이에 옮기기) ─────
function saveCode() { return 'CL4:' + btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
function loadCode(code) {
  try {
    code = String(code).trim();
    const j = code.startsWith('CL4:') ? decodeURIComponent(escape(atob(code.slice(4)))) : code;
    const s = JSON.parse(j);
    if (!s || s.v !== 4) return '이 버전의 세이브 코드가 아니에요';
    S = migrate(s); save(S); closePanel(); showGame(); toast('불러왔어요');
    return '';
  } catch (e) { return '코드를 읽지 못했어요. 처음부터 끝까지 빠짐없이 붙여넣었는지 확인해 주세요'; }
}
function copyCode() {
  const code = saveCode();
  const done = () => toast('세이브 코드를 복사했어요. 다른 기기의 메뉴 → 세이브 코드 붙여넣기에 넣으면 돼요');
  const fallback = () => { UI.overlay = 'pastecode'; UI.showCode = code; renderPanel(); $('#panel').classList.remove('hidden'); const t = $('#code-box'); if (t) { t.focus(); t.select(); } };
  try { navigator.clipboard.writeText(code).then(done, fallback); } catch (e) { fallback(); }
}
function panelPasteCode() {
  if (UI.showCode) { const c = UI.showCode; UI.showCode = null; return `<h2>세이브 코드</h2><p class="p-intro">복사가 막혀 있어서 코드를 직접 보여 드려요. 아래 칸을 길게 눌러 전체 선택한 뒤 복사해 주세요.</p><textarea id="code-box" class="search" style="height:160px" readonly>${U.esc(c)}</textarea>`; }
  return `<h2>세이브 코드 붙여넣기</h2><p class="p-intro">다른 기기에서 "세이브 코드 복사하기"로 복사한 코드를 아래 칸에 붙여넣고 불러오기를 눌러요. 지금 하던 인생은 불러온 인생으로 바뀌어요.</p><textarea id="code-in" class="search" style="height:160px" placeholder="CL4:로 시작하는 코드"></textarea><div class="choices"><button class="btn primary" id="m-loadcode">불러오기</button></div><div class="why" id="code-err"></div>`;
}

// ───── 세이브 파일 ─────
function exportSave() {
  const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `연예인으로살아가기_${me(S).name}_${age(S)}세.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function importSave(file) {
  const r = new FileReader();
  r.onload = () => { try { const s = JSON.parse(r.result); if (!s || s.v !== 4) { toast('이 버전의 세이브 파일이 아니에요'); return; } S = migrate(s); save(S); showGame(); toast('불러왔어요'); } catch (e) { toast('파일을 읽지 못했어요'); } };
  r.readAsText(file);
}
function setLogSize(d) {
  const cur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--log-size')) || 14;
  const v = U.clamp(cur + d, 13, 20);
  document.documentElement.style.setProperty('--log-size', v + 'px');
  try { localStorage.setItem('celebLife.logSize', v); } catch (e) { }
}

// ───── 버튼 처리 ─────
document.addEventListener('click', e => {
  // 표 (v131): 칸 이름을 누르면 정렬, 줄을 누르면 고르기 (체크 칸이 있으면 체크)
  const tp0 = e.target.closest('[data-tpre]');
  if (tp0 && UI.tblT && UI.tblT.presets) { const ids = UI.tblT.presets[+tp0.dataset.tpre].ids; document.querySelectorAll('#ev-tbl tbody tr').forEach(tr => { const cb = tr.querySelector('input[type=checkbox]'); if (!cb) return; cb.checked = ids.includes(cb.dataset.k); tr.classList.toggle('sel', cb.checked); }); return; }
  const th0 = e.target.closest('#ev-tbl th[data-tsort]');
  if (th0) { evTblSort(th0.dataset.tsort); return; }
  const row0 = e.target.closest('#ev-tbl tbody tr');
  if (row0) {
    if (row0.classList.contains('off')) return;
    const cb = row0.querySelector('input[type=checkbox]');
    // 타이틀 동그라미를 찍으면 그 줄도 체크된다. 체크를 풀면 동그라미도 풀린다
    if (cb) { const rd = row0.querySelector('input[type=radio]'); if (rd && e.target === rd) cb.checked = true; else if (e.target !== cb) cb.checked = !cb.checked; if (rd && !cb.checked) rd.checked = false; row0.classList.toggle('sel', cb.checked); formSum(); return; }
    document.querySelectorAll('#ev-tbl tr.sel').forEach(x => x.classList.remove('sel')); row0.classList.add('sel');
    const go = $('#mcard [data-tgo]'); if (go) { go.disabled = false; go.dataset.choice = row0.dataset.trow; }
    return;
  }
  const t = e.target.closest('button, [data-pick], [data-cat], [data-grp], [data-apg], [data-trk], [data-job], [data-panel], [data-lifesec], [data-moneycard], [data-song], [data-bill], input[type=checkbox]');
  // 실시간 창 (12-1): 결과 바로 보기 · 다시 보기
  if (t && t.dataset.liveskip != null) { liveClose(); return; }
  if (t && t.dataset.live) { const sp = (UI.liveMap || {})[t.dataset.live]; if (sp) liveOpen(sp, null); return; }
  if (t && t.dataset.livemode) { liveSetMode(t.dataset.livemode); renderPanel(); return; }
  // 곡 결과 카드 · 정산서 작은 창 (v118 UI C1 · C2)
  if (t && t.dataset.popclose != null) { popClose(); return; }
  if (t && t.dataset.plio) { plioToggle(+t.dataset.plio); return; }
  if (t && t.dataset.commnow != null) { const sp = commNow(S); if (!UI.cmNow.key || !(UI.plioMap || {})[UI.cmNow.key]) UI.cmNow.key = plioKey(sp); plioToggle(UI.cmNow.key); return; }
  if (t && t.dataset.bill) { const b = (UI.billMap || {})[t.dataset.bill]; if (b) popOpen(billHTML(b)); return; }
  if (t && t.dataset.song != null && S) { const c = songCardAt(S, t.dataset.song); if (c) popOpen(songCardHTML(c) + (c.mk && typeof albStepsHTML === 'function' ? albStepsHTML(c.mk) : '')); return; }
  if (!t) return;
  if (t.dataset.wonadd) { wonAdd(t.dataset.wk, +t.dataset.wonadd); return; }
  // 이어할 인생이 있으면 먼저 묻는다 (v116 버그 2: 확인 없이 덮어써서 진행 중인 인생이 사라졌다)
  if (t.id === 'btn-new') { const sv = loadSave(); if (sv && !sv.ended) { askConfirm(`진행 중인 인생(${sv.people[sv.me].name} · ${age(sv)}세)이 있어요.\n새로 시작하면 이 인생은 지워져요. 계속할까요?`, showBirth); return; } return showBirth(); }
  if (t.id === 'btn-reroll') { S = newLife(); renderBirth(); return; }
  if (t.id === 'btn-born') { startLife(S); save(S); UI.speed = 1; UI.lastSpeed = 1; showGame(); return; }
  if (t.id === 'btn-continue') { S = loadSave(); if (S) showGame(); return; }
  if (t.id === 'btn-hall') return openPanel('hall');
  if (t.id === 'btn-code-title') { UI.overlay = 'pastecode'; renderPanel(); $('#panel').classList.remove('hidden'); return; }
  if (t.id === 'btn-import-title' || t.id === 'm-import') { $('#file-input').click(); return; }
  if (t.id === 'm-export') return exportSave();
  if (t.id === 'm-copycode') return copyCode();
  if (t.id === 'm-loadcode') { const err = loadCode($('#code-in').value); if (err) $('#code-err').textContent = err; return; }
  if (t.id === 'm-title') { save(S); closePanel(); showTitle(); return; }
  if (t.id === 'm-retire') { if (!S || S.ended || age(S) < 19) return; const fail = !S.everSuccess; askConfirm(`정말 연예계를 은퇴할까요?\n이번 인생이 여기서 정리됩니다.`, () => { closePanel(); endLife(S, fail ? 'fail' : 'retire', ''); save(S); render(); showEnding(); }); return; }
  if (t.id === 'm-newlife') { askConfirm('지금 인생을 그만두고 새로 태어날까요?\n지금 세이브는 지워져요.', () => { clearSave(); closeAll(); showBirth(); }); return; }
  if (t.id === 'btn-ending') return showEnding();
  if (t.id === 'btn-newlife2' || t.id === 'end-new') { clearSave(); closeAll(); showBirth(); return; }
  if (t.id === 'end-title') { closeAll(); showTitle(); return; }
  if (t.dataset.endclose != null) { $('#modal').classList.add('hidden'); UI.endPrev = null; return; }
  // 메뉴의 결산 창 미리 보기
  if (t.dataset.endprev != null) { closePanel(); showEnding(true); return; }
  if (t.dataset.confirm != null) { $('#confirm').classList.add('hidden'); const f = UI.onConfirm; UI.onConfirm = null; if (t.dataset.confirm === '1' && f) f(); return; }
  // 특기 그만두기 (v101 · v102 이름 바뀜): 지금 하는 직업의 대표 특기는 못 그만둔다. 다시 배우면 1레벨부터
  if (t.dataset.pop) { const hh = (UI.popMap || {})[t.dataset.pop]; if (hh) popOpen(hh); return; }
  if (t.dataset.npcfol) { const n = npcBy(S, t.dataset.npcfol); if (n) { npcFollow(n, !n.fol); save(S); renderPanel(); } return; }
  if (t.dataset.skdropmode != null) { UI.skDrop = !UI.skDrop; renderPanel(); return; }
  if (t.dataset.skdrop) {
    const k = t.dataset.skdrop, why = skKeepWhy(S, k), n = SKILLS[k].n;
    if (why) { toast(why); return; }
    askConfirm(`${josa(n, '을를')} 그만둘까요?\n\n${lvi(me(S), k)}레벨이 모두 사라지고, 다시 배우면 1레벨부터예요.`, () => { dropSkill(S, k); save(S); render(); if (UI.overlay === 'skills') renderPanel(); });
    return;
  }
  if (t.id === 'btn-go') { turnGo(turnMax(S)); return; }
  if (t.id === 'btn-month') { turnGo(1); return; }
  if (t.id === 'btn-year') { turnGo(12); return; }
  if (t.dataset.turnok != null) { turnClose(t.dataset.turnok); return; }
  if (t.dataset.panel) { if (t.dataset.panel !== 'help' || !UI.overlay) openPanel(t.dataset.panel); else { UI.overlay = 'help'; renderPanel(); } return; }
  if (t.dataset.close != null) return closePanel();
  if (t.dataset.logsize) return setLogSize(+t.dataset.logsize);
  if (t.dataset.min != null) { UI.minimized = true; showEvent(); return; }

  if (t.dataset.choice != null) {
    // 되돌릴 수 없는 선택(자녀 인생으로 넘어가기 등)은 한 번 더 묻는다 (v130)
    const cc = S.pending ? evChoices(S)[+t.dataset.choice] : null;
    if (cc && cc.confirm && UI.cfOk !== S.pending) { const pd = S.pending; askConfirm(cc.confirm, () => { UI.cfOk = pd; t.click(); UI.cfOk = null; }); return; }
    const pre = resPre(S), ci = +t.dataset.choice; try { choose(S, ci); } catch (e) { console.error('선택 오류', S.pending && S.pending.id, e); S.pending = null; toast('선택을 처리하지 못해 건너뛰었어요'); } if (!resAfter(pre, ci)) afterChoice(); return; }
  if (t.dataset.resok != null) { resOk(); return; }
  if (t.dataset.submit != null) { const vals = formVals(); const pre = resPre(S), err = submitForm(S, vals); if (err) { $('#form-err').textContent = err; return; } if (!resAfter(pre, -1)) afterChoice(); return; }
  if (t.dataset.cancel != null) { cancelForm(S); afterChoice(); return; }
  // 창을 내려 둔 채 패널 버튼으로 새 창(자본금 꺼내기 등)을 열면 그 창은 바로 보여 준다. 내려 둔 창은 대기열에 돌아가 있다가 새 창을 마치면 다시 뜬다 (v116 버그 1)
  if (t.dataset.act != null) { const a = UI.acts[+t.dataset.act]; if (!a || !a.ok) return; const go = () => { const L0 = S.log[S.log.length - 1], p0 = S.pending, jf0 = totalFans(S), jfJ = UI.overlay === 'job' ? UI.jobId : null, r = a.run(S); jfAdd(S, jfJ, totalFans(S) - jf0); applyLocks(S); if (S.pending && S.pending !== p0) UI.minimized = false; if (r) { addLog(S, r, 'ev'); if (!UI.overlay) toast(r); } actAuto(S); save(S); actDone(L0, a.t, () => { if (UI.overlay === 'company') S.uiOpen = 'company'; }); }; if (a.confirm) askConfirm(a.confirm, go); else go(); return; }
  // 오른쪽 생활 카드의 버튼과 탭
  if (t.dataset.lact != null) { const a = (UI.lacts || [])[+t.dataset.lact]; if (!a || !a.ok) return; const go = () => { const L0 = S.log[S.log.length - 1], p0 = S.pending, r = a.run(S); applyLocks(S); if (S.pending && S.pending !== p0) UI.minimized = false; if (r) { addLog(S, r, 'ev'); if (!UI.overlay) toast(r); } actAuto(S); save(S); actDone(L0, a.t); }; if (a.confirm) askConfirm(a.confirm, go); else go(); return; }
  // 오른쪽 생활 칸의 묶음을 누르면 그 묶음 창이 뜬다 (휴대폰 생활 창에서 누르면 그 창이 바뀐다)
  if (t.dataset.lifesec) { UI.lifeSec = t.dataset.lifesec; if (UI.overlay !== 'life') UI.lifeFrom = 'card'; if (UI.overlay) { UI.overlay = 'lifesec'; renderPanel(); } else openPanel('lifesec'); return; }
  // 재정 박스를 누르면 재정 창, 창 안의 1개월·1년·연도별 탭
  if (t.dataset.moneycard != null) { UI.monTab = 'm'; openPanel('money'); return; }
  if (t.dataset.montab) { UI.monTab = t.dataset.montab; renderPanel(); return; }
  if (t.dataset.npc) return npcOp(t.dataset.npc, t.dataset.op);
  if (t.dataset.meet) { if (meetWhy(S, t.dataset.meet)) return; meetStart(S, t.dataset.meet); save(S); if (S.pending) { closePanel(); showEvent(); stopLoop(); } return; }
  if (t.dataset.msg) { const m0 = S.inbox.find(x => x.id === t.dataset.msg), L0 = S.log[S.log.length - 1], r = answerMsg(S, t.dataset.msg, +t.dataset.mi); if (r) { addLog(S, r, 'career'); if (!UI.overlay) toast(r); } actAuto(S); save(S); actDone(L0, m0 ? m0.title : '메시지 답장'); return; }
  if (t.dataset.presx != null) { UI.pRes = null; renderPanel(); return; }
  if (t.dataset.heir) { const ns = continueAs(S, t.dataset.heir); S = ns; save(S); closeAll(); UI.speed = 1; UI.lastSpeed = 1; showGame(); toast(`${me(S).name}의 인생이 시작됐어요`); return; }
  if (t.dataset.pick != null) { UI.pickSlot = +t.dataset.pick; UI.pickQ = ''; openPanel('pick'); return; }
  if (t.dataset.pickact) { const sl = S.slots[UI.pickSlot]; if (t.dataset.pickact.startsWith('c_')) return; sl.act = t.dataset.pickact; sl.lesson = false; delete sl.dflt; save(S); closePanel(); return; }
  if (t.dataset.les != null) { const sl = S.slots[+t.dataset.les]; sl.lesson = t.checked; delete sl.dflt; if (sl.lesson) sl.payer = !graduated(S) && familyCanPay(S, +t.dataset.les) ? 'family' : 'me'; save(S); renderSchedule(); return; }
  if (t.dataset.payer != null) { const sl = S.slots[+t.dataset.payer]; sl.payer = t.dataset.v; save(S); renderSchedule(); return; }
  if (t.dataset.leslv != null) { const i = +t.dataset.leslv, sl = S.slots[i]; sl.lesLv = +t.dataset.v; if (sl.payer === 'family' && !familyCanPay(S, i)) sl.payer = 'me'; save(S); renderSchedule(); return; }
  if (t.dataset.grp) { UI.openGroups[t.dataset.grp] = !UI.openGroups[t.dataset.grp]; renderPanel(); return; }
  if (t.dataset.rectab) { UI.recTab = t.dataset.rectab; renderPanel(); return; }
  if (t.dataset.pftab) { if (t.dataset.pftab === 'rec' && !UI.overlay) UI.recTab = 'career'; UI.pfTab = t.dataset.pftab; if (UI.overlay) { UI.overlay = 'profile'; renderPanel(); } else openPanel('profile'); return; }
  if (t.dataset.cotab) { UI.coTab = t.dataset.cotab; renderPanel(); return; }
  if (t.dataset.cogrp) { UI.coGrp = t.dataset.cogrp; renderPanel(); return; }
  if (t.dataset.fam != null) { openPanel('family'); return; }
  if (t.dataset.love != null) { openPanel('love'); return; }
  if (t.dataset.job) { UI.jobId = t.dataset.job; UI.jobFrom = t.dataset.from || ''; UI.jobTab = 'info'; openPanel('job'); return; }
  if (t.dataset.jobtab) { UI.jobTab = t.dataset.jobtab; renderPanel(); return; }
  if (t.dataset.cof) { UI.coF = t.dataset.cof; UI.coTab = 'home'; UI.coGrp = null; if (UI.overlay) { UI.overlay = 'company'; renderPanel(); } else openPanel('company'); return; }
  if (t.dataset.cofound) { if (S.pending) { UI.minimized = false; showEvent(); return; } fireEvent(S, 'co_new', { sub: t.dataset.cofound === 'sub' }); UI.minimized = false; save(S); showEvent(); return; }
  if (t.dataset.soon != null) { openPanel('soon'); return; }
  if (t.dataset.apjcat) { UI.apjOpen = UI.apjOpen || {}; UI.apjOpen[t.dataset.apjcat] = t.dataset.open !== '1'; renderPanel(); return; }
  if (t.dataset.apcat) { UI.actOpen[t.dataset.apcat] = t.dataset.open !== '1'; renderPanel(); return; }
  if (t.dataset.apsz) { UI.apSz = UI.apSz || {}; UI.apSz[t.dataset.apsz] = t.dataset.open !== '1'; renderPanel(); return; }
  if (t.dataset.homecat) { UI.homeOpen[t.dataset.homecat] = t.dataset.open !== '1'; renderPanel(); return; }
  if (t.dataset.pgrp) { UI.pplOpen[t.dataset.pgrp] = t.dataset.open !== '1'; renderPanel(); return; }
  if (t.dataset.apg) { const c = t.dataset.aptab, g = t.dataset.apg; UI.apTab[c] = UI.apTab[c] === g ? null : g; renderPanel(); return; }
  if (t.dataset.trk) { UI.trk = t.dataset.trk; openPanel('trk'); return; }
  if (t.dataset.myprof != null) { UI.tsTab = 'tal'; if (UI.overlay) { UI.overlay = 'skills'; renderPanel(); } else openPanel('skills'); return; }
  if (t.dataset.tstab) { UI.tsTab = t.dataset.tstab; if (UI.overlay) { UI.overlay = 'skills'; renderPanel(); } else openPanel('skills'); return; }
  if (t.dataset.kid) { UI.kid = t.dataset.kid; if (UI.overlay) { UI.overlay = 'kid'; renderPanel(); } else openPanel('kid'); return; }
});
document.addEventListener('input', e => { if (e.target.id === 'tbl-q') evTblFilter(e.target.value); if (e.target.id === 'pick-q') { UI.pickQ = e.target.value; renderPanel(); } if (e.target.dataset && e.target.dataset.won != null) wonEq(e.target); });
document.addEventListener('compositionend', e => { if (UI.enterComp && e.target.matches && e.target.matches('#mcard input[data-k]')) { UI.enterComp = false; setTimeout(formEnter, 0); } });
// 자녀 교육비: 고른 아이의 단계 버튼을 보여 준다
document.addEventListener('change', e => { if (e.target.closest && e.target.closest('#mcard') && $('#form-sum')) formSum(); if (e.target.dataset && e.target.dataset.kidedu != null) { UI.kidEdu = e.target.value; UI.lifeHTML = null; renderLifeCard(); if (UI.overlay) renderPanel(); } });
$('#file-input').addEventListener('change', e => { const f = e.target.files[0]; if (f) importSave(f); e.target.value = ''; });
// ESC: 맨 위에 떠 있는 창부터 하나씩 닫는다 (확인 창 → 패널 → 사건 창은 잠시 내리기 → 인생 결산은 기록 보기로)
function escClose() {
  if (liveOn()) { liveClose(); return true; }
  if (!$('#pop').classList.contains('hidden')) { popClose(); return true; }
  if (UI.turn) { if (UI.turn.why) turnClose(''); return true; }
  if (!$('#confirm').classList.contains('hidden')) { $('#confirm').classList.add('hidden'); UI.onConfirm = null; return true; }
  if (!$('#panel').classList.contains('hidden')) { closePanel(); return true; }
  if (!$('#modal').classList.contains('hidden')) {
    if (UI.res) { resOk(); return true; }
    if (S && S.ended && !S.pending) { $('#modal').classList.add('hidden'); return true; }
    if (S && S.pending) { UI.minimized = true; showEvent(); return true; }
  }
  return false;
}
// PC에서만: 떠 있는 창의 바깥(어두운 부분)을 누르면 ESC처럼 닫힌다 (휴대폰은 잘못 눌리기 쉬워서 빼 둔다)
const FINE_POINTER = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
let downOnOverlay = null;
document.addEventListener('mousedown', e => { downOnOverlay = e.target.classList && e.target.classList.contains('overlay') ? e.target : null; });
document.addEventListener('click', e => {
  if (!FINE_POINTER || !downOnOverlay || e.target !== downOnOverlay) return;
  const id = e.target.id;
  downOnOverlay = null;
  if (id === 'pop') { popClose(); return; }
  if (id === 'confirm') { $('#confirm').classList.add('hidden'); UI.onConfirm = null; return; }
  if (id === 'panel') { closePanel(); return; }
  if (id === 'modal') {
    if (UI.res) { resOk(); return; }
    if (S && S.ended && !S.pending) { $('#modal').classList.add('hidden'); return; }
    if (S && S.pending) { UI.minimized = true; showEvent(); }
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' || e.code === 'Escape') { if (escClose()) e.preventDefault(); return; }
  // 실시간 창이 떠 있으면 스페이스바 · 엔터 = 결과 바로 보기 (뒤의 창보다 먼저)
  if (liveOn() && (e.code === 'Space' || e.key === 'Enter')) { e.preventDefault(); if (!e.repeat) liveClose(); return; }
  if (UI.res && (e.code === 'Space' || e.key === 'Enter') && !$('#modal').classList.contains('hidden')) { e.preventDefault(); if (!e.repeat && Date.now() - (UI.enterT || 0) > 400) resOk(); return; }
  // 고를 것이 하나뿐인 창(확인 · 알겠어요)과 작은 창(정산서 · 카드)은 스페이스바로 넘긴다 (v123). 입력 칸에서는 안 먹는다
  if (e.code === 'Space' && !(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && $('#confirm').classList.contains('hidden')) {
    if (!$('#pop').classList.contains('hidden')) { e.preventDefault(); if (!e.repeat) popClose(); return; }
    // 표로 고르는 창 (v132): 스페이스바 = 확인 (체크하는 표) · 고른 것으로 정하기 (하나 고르는 표, 줄을 골랐을 때만)
    if (!$('#modal').classList.contains('hidden') && !UI.res && $('#ev-tbl')) { const b = $('#mcard [data-submit]') || $('#mcard [data-tgo]:not([disabled])'); e.preventDefault(); if (b && !e.repeat && Date.now() - (UI.enterT || 0) > 400) { UI.enterT = Date.now(); b.click(); } return; }
    if (!$('#modal').classList.contains('hidden') && !UI.res) {
      const B = $('#ev-tbl') ? [] : [...document.querySelectorAll('#mcard [data-choice]')].filter(b => b.offsetParent !== null);
      if (B.length === 1 && !B[0].disabled && !document.querySelector('#mcard input, #mcard textarea')) { e.preventDefault(); if (!e.repeat && Date.now() - (UI.enterT || 0) > 400) B[0].click(); return; }
    }
  }
  if ((e.key === 'Enter' || e.keyCode === 229) && e.target.matches && e.target.matches('#mcard input[data-k]')) {
    if (e.isComposing || e.keyCode === 229) { if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter') UI.enterComp = true; return; }
    e.preventDefault(); formEnter(); return;
  }
  if (!S || $('#game-screen').classList.contains('hidden') || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (UI.turn) { if (UI.turn.why) turnClose(''); return; }
    if (!$('#modal').classList.contains('hidden') || !$('#confirm').classList.contains('hidden')) return;
    turnGo(turnMax(S));
  }
  // 1 = 1달 후, 2 = 1년 후 (진행 버튼 오른쪽 작은 버튼, UI 개편 시안). 창이 떠 있을 때는 먹지 않는다
  if ((e.code === 'Digit1' || e.code === 'Numpad1' || e.code === 'Digit2' || e.code === 'Numpad2') && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (UI.turn || UI.overlay || liveOn() || !$('#modal').classList.contains('hidden') || !$('#confirm').classList.contains('hidden') || !$('#pop').classList.contains('hidden')) return;
    e.preventDefault();
    turnGo(e.code.endsWith('1') ? 1 : 12);
  }
});
(function init() { try { const v = localStorage.getItem('celebLife.logSize'); if (v) document.documentElement.style.setProperty('--log-size', v + 'px'); } catch (e) { } showTitle(); })();
