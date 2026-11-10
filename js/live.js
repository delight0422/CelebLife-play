'use strict';
// ───── 실시간 창 (12단계 12-1) ─────
// 결과는 먼저 계산한다 (밸런스 그대로). 이 창은 그 결과에 이르는 과정을 몇 초 동안 보여 준다. 보기만 한다 ('결과 바로 보기')
// 장면은 '씨앗 + 요인'(spec)만으로 다시 만든다. 같은 spec이면 같은 장면이라 다시 보기도 같다 (세이브에는 spec만 남는다)
// spec = { v: 장소 틀('stage'), k: 종류('idol' · 'solo' · 'meet'), key: 중요한 순간인가, seed, place: 장소 이름, t: 곡 제목, g: 그룹 · 활동명, fd: 팬덤,
//          mem: [[이름, 포지션]], mi: 나의 자리, hue: 응원봉 색, z: 요인(perf · q · fans · tw · cf · trend · star · me · var), sc: 점수, wins: 음악방송 1위, cand: 1위 후보, debut }
// 무대에서는 객석의 함성 · 응원법 · 떼창만 보인다 (댓글은 12-3의 영상 플랫폼 팝업에서)

// 언제 띄울까: 매번 / 중요할 때만(기본) / 안 보기. 이 기기에만 남는 설정이다
const LIVE_MODES = [['all', '매번'], ['key', '중요할 때만'], ['off', '안 보기']];
function liveMode() { try { return localStorage.getItem('celebLife.live') || 'key'; } catch (e) { return 'key'; } }
function liveSetMode(m) { try { localStorage.setItem('celebLife.live', m); } catch (e) { } }
function liveWant(sp) { const m = liveMode(); return !!sp && m !== 'off' && (m === 'all' || !!sp.key); }
// 씨앗으로 도는 작은 난수 (같은 씨앗이면 같은 장면)
function liveRng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// 팬들이 부르는 이름: 세 글자 이름은 성을 뗀다 (김하린 → 하린)
function callName(n) { n = String(n || ''); return n.length >= 3 ? n.slice(1) : n; }
// 내 활동명을 팬이 부르는 이름: 활동명(예명 · 본명)이 세 글자 이상이면 앞 글자를 뗀다
function actCall(s, trk) { return callName(actName(s, trk)); }
// 무대 spec 만들기 (결과를 계산한 자리에서 부른다)
function liveStage(o) {
  const z = {};
  for (const k in o.z || {}) if (isFinite(o.z[k])) z[k] = Math.round(o.z[k] * 100) / 100;
  const name = o.g || o.t || '';
  return { v: 'stage', k: o.k, key: o.key !== false, seed: U.int(1, 2e9), place: o.place || '무대', t: o.t || '', g: o.g || '', cn: o.cn || '', fd: o.fd || '', mem: (o.mem || []).slice(0, 10), mi: o.mi || 0, hue: hashN('hue' + name) % 360, z, sc: Math.round(o.sc || 0), wins: o.wins || 0, cand: o.cand ? 1 : 0, debut: o.debut ? 1 : 0 };
}

// 같은 곡 무대를 다른 자리에서 한 번 더 (시상식 무대 등): 요인은 그대로, 씨앗만 새로. 1위 발표 · 데뷔 인사는 뺀다
function liveAgain(sp, o) { return Object.assign({}, sp, { seed: U.int(1, 2e9), key: true, wins: 0, cand: 0, debut: 0 }, o || {}); }

// ───── 장면 만들기 ─────
// 박자(beat)마다 { cap: 자막, L: [[말, 종류]], glow: 조명 세기 0~1, fx: 'drum' · 'win' }
// 말 종류: big(함성) · call(응원법 · 이름 부르기) · sing(떼창) · soft(조용한 반응) · bad(아쉬운 반응) · win(1위)
const LV_BIG = ['꺄아아아악!', '와아아아아!', '미쳤다!!', '대박!!', '어떡해!!', '와아아!!'];
function liveBeats(sp) {
  const R = liveRng(sp.seed), pk = a => a[Math.floor(R() * a.length)], z = k => sp.z[k] || 0;
  const lvl = v => v >= 0.6 ? 2 : v >= -0.25 ? 1 : 0;
  const g = sp.g, fd = sp.fd, grp = sp.k === 'idol' || sp.k === 'meet';
  const mine = sp.mem[sp.mi] ? sp.mem[sp.mi][0] : (sp.cn || g), cn = sp.cn || g;
  const who = fd || cn;
  const B = [];
  if (sp.k === 'meet') return liveMeet(sp, R, pk, z, lvl, who, mine);
  // 1. 등장: 팬이 많을수록 객석이 크다
  const f = lvl(z('fans'));
  B.push({ cap: `조명이 켜지고 ${josa(g, '이가')} 무대에 선다`, glow: 0.35 + f * 0.15,
    L: f === 2 ? [[`${who}!! ${who}!!`, 'call'], [pk(LV_BIG), 'big'], [pk(LV_BIG), 'big']] : f === 1 ? [[`${cn}!`, 'call'], [pk(['와아!', '꺄아!']), 'big']] : [[pk(['(드문드문 박수)', '누구야?', '(웅성웅성)']), 'soft']].concat(sp.debut ? [['신인인가 봐', 'soft']] : []) });
  // 2. 전주 · 응원법: 팬이 모인 팀은 멤버 이름을 차례로 부른다
  if (f >= 1) {
    const names = grp ? sp.mem.map(m => m[0]).slice(0, 7) : [cn, cn];
    B.push({ cap: '전주 · 응원법', glow: 0.55, L: [[names.join('! ') + '!' + (fd ? ` ${fd}!` : ''), 'call']].concat(f === 2 ? [[pk(LV_BIG), 'big']] : []) });
  } else B.push({ cap: '전주', glow: 0.4, L: [['(응원법을 아는 사람이 몇 없다)', 'soft']] });
  // 3. 1절: 무대 실력
  const pv = lvl(z('perf')), lead = grp ? (sp.mem.find(m => /^메인보컬/.test(m[1] || '')) || sp.mem[sp.mi] || [g])[0] : g;
  B.push({ cap: `1절 · ${lead}의 첫 소절`, glow: 0.5 + pv * 0.15,
    L: pv === 2 ? [[pk(['라이브 뭐야!!', '음원 찢었다!!', '와… 소름']), 'big'], [pk(LV_BIG), 'big']] : pv === 1 ? [[pk(['잘한다!', '좋다!']), 'big'], ['(박수)', 'soft']] : [[pk(['어…?', '(음이 흔들리자 객석이 술렁인다)', '(객석이 잠깐 조용해진다)']), 'bad']] });
  // 4. 후렴: 곡이 좋을수록 떼창
  const qv = lvl(z('q'));
  const ch = qv === 2 ? [['♪ 떼창 ♪', 'sing'], ['♪ ♪ ♪', 'sing'], [pk(['노래 너무 좋아!!', '후렴 미쳤다!!']), 'big']] : qv === 1 ? [['♪ ♪', 'sing'], [pk(['노래 좋네', '좋다!']), 'soft']] : [[pk(['(조용히 듣는다)', '(박수가 띄엄띄엄 나온다)']), 'soft']];
  if (z('trend') >= 0.5 && R() < 0.6) ch.push(['요즘 노래다!!', 'big']);
  B.push({ cap: '후렴', glow: 0.6 + qv * 0.15, L: ch });
  // 5. 하이라이트: 아이돌은 댄스 브레이크(팀워크), 솔로는 무대 장악. 내 파트에서 이름을 부른다
  const hl = [];
  if (grp) { const tv = lvl(z('tw')); if (tv === 2) hl.push(['칼군무!!!', 'big'], ['소름 돋았어!!', 'big']); else if (tv === 0) hl.push(['(동선이 엉키자 박수가 끊긴다)', 'bad']); else hl.push(['(박수)', 'soft']); }
  else if (pv === 2) hl.push([pk(['무대 장악 미쳤다!!', '눈을 못 떼겠어!!']), 'big']);
  const mv = lvl(z('me'));
  if (mv === 2) hl.push([`${mine}!!!`, 'call'], [`${mine} 사랑해!!`, 'big']); else if (mv === 1) hl.push([`${mine}!`, 'call']);
  if (z('cf') >= 0.5) hl.push(['콘셉트 찰떡!!', 'big']); else if (z('cf') <= -0.5) hl.push(['(콘셉트가 어색하다는 수군거림)', 'bad']);
  if (z('star') >= 0.6) hl.push(['비주얼 뭐야!!', 'big']);
  if (!hl.length) hl.push(['(박수)', 'soft']);
  B.push({ cap: grp ? '댄스 브레이크' : '하이라이트', glow: 0.75, L: hl });
  // 6. 엔딩: 점수
  const sc = sp.sc, end = sc >= 80 ? [['앙코르!! 앙코르!!', 'call'], [pk(LV_BIG), 'big'], [pk(LV_BIG), 'big']] : sc >= 65 ? [['(큰 박수)', 'soft'], ['수고했어!!', 'big']] : sc >= 52 ? [['(박수)', 'soft'], ['고생했어!', 'soft']] : [['(의례적인 박수)', 'soft']];
  if (sp.debut && sc >= 52) end.push(['데뷔 축하해!!', 'big']);
  B.push({ cap: '엔딩 포즈', glow: sc >= 80 ? 1 : sc >= 65 ? 0.8 : 0.55, L: end });
  // 7. 1위 발표 (음악방송): 1위를 했거나 후보에 올랐을 때만. 아슬아슬하면 긴장
  if (sp.wins > 0 || sp.cand) {
    B.push({ cap: '이번 주 1위 후보 발표', glow: 0.25, fx: 'drum', L: [['(숨죽인 객석)', 'soft'], ['두근두근…', 'soft']] });
    if (sp.wins > 0) B.push({ cap: `1위 · ${g}`, glow: 1, fx: 'win', L: [['꺄아아아아!!', 'win'], [`${cn} 1위!!`, 'win'], [pk(['울지 마!!', '축하해!!']), 'big']] });
    else B.push({ cap: '1위는 다른 팀에게', glow: 0.45, L: [['아…', 'bad'], ['괜찮아!!', 'call'], ['다음엔 1위!!', 'big']] });
  }
  return B;
}
// 팬미팅: 토크(예능) · 노래 · 게임 · 편지 · 끝인사
function liveMeet(sp, R, pk, z, lvl, who, mine) {
  const g = sp.g, B = [];
  B.push({ cap: `${who} 앞에 ${josa(`「${g}」`, '이가')} 선다`, glow: 0.6, L: [[`${who}!! ${who}!!`, 'call'], [pk(LV_BIG), 'big']] });
  const vv = lvl(z('var'));
  B.push({ cap: '토크', glow: 0.55, L: vv === 2 ? [['하하하하하!!', 'big'], ['(빵 터진 객석)', 'big']] : vv === 1 ? [['(웃음)', 'soft'], [`${mine} 귀여워!!`, 'call']] : [['(어색한 웃음)', 'soft']] });
  const pv = lvl(z('perf'));
  B.push({ cap: '노래', glow: 0.65, L: pv >= 1 ? [['♪ 떼창 ♪', 'sing'], ['♪ ♪', 'sing']] : [['(조용히 듣는다)', 'soft'], ['♪', 'sing']] });
  B.push({ cap: '게임', glow: 0.6, L: [['이겨라!!', 'call'], [`${mine} 화이팅!!`, 'call'], ['(웃음바다)', 'soft']] });
  B.push({ cap: '편지 읽기', glow: 0.4, L: [['(훌쩍)', 'soft'], ['울지 마!!', 'big'], [`${sp.cn || g} 사랑해!!`, 'call']] });
  B.push({ cap: '끝인사', glow: 0.85, L: [['또 와!!', 'big'], ['사랑해!!', 'big'], [`${who}!! ${who}!!`, 'call']] });
  return B;
}

// ───── 창 ─────
// 실시간 창은 사건 창 위에 뜬다. 끝나거나 '결과 바로 보기'를 누르면 end를 부른다 (다시 보기는 end 없이 그냥 닫힌다)
let LIVE = null;
function liveOpen(sp, end) {
  liveStop();
  LIVE = { sp, B: liveBeats(sp), i: -1, tm: [], slot: 0, end: end || null };
  $('#live-card').innerHTML = liveHTML(sp);
  $('#live').classList.remove('hidden');
  liveNext();
}
function liveHTML(sp) {
  const fan = U.clamp(((sp.z.fans || 0) + 1.5) / 3, 0, 1), n = 16 + Math.round(fan * 44);
  const sticks = Array.from({ length: n }, (_, i) => `<i style="--d:${(i * 0.137) % 1.2}s;--x:${(i * 37) % 100}%;--y:${(i * 53) % 100}%"></i>`).join('');
  const mem = sp.mem.length ? sp.mem : [[sp.g, '']];
  return `<div class="lv-top"><span class="lv-place">${U.esc(sp.place)}</span>${sp.t ? `<span class="lv-t">「${U.esc(sp.t)}」</span>` : ''}<span class="lv-g">${U.esc(sp.g)}</span></div>`
    + `<div class="lv-stage" id="lv-stage" style="--hue:${sp.hue};--glow:0.3"><div class="lv-lights"><i></i><i></i><i></i><i></i></div>`
    + `<div class="lv-floor"><div class="lv-mem">${mem.map((m, i) => `<span class="lm${i === sp.mi ? ' me' : ''}">${U.esc(m[0])}</span>`).join('')}</div></div>`
    + `<div class="lv-crowd">${sticks}</div><div class="lv-bub" id="lv-bub"></div></div>`
    + `<div class="lv-cap" id="lv-cap"></div><div class="lv-pips">${LIVE.B.map(() => '<i></i>').join('')}</div>`
    + `<div class="lv-btns"><button class="btn primary" data-liveskip>결과 바로 보기</button></div>`;
}
function liveNext() {
  const L = LIVE;
  if (!L) return;
  L.i++;
  const st = $('#lv-stage'), pips = document.querySelectorAll('.lv-pips i');
  if (L.i >= L.B.length) { liveDone(); return; }
  const b = L.B[L.i];
  pips.forEach((p, j) => p.classList.toggle('on', j <= L.i));
  if (st) { st.style.setProperty('--glow', b.glow); st.classList.remove('fx-drum', 'fx-win'); if (b.fx) st.classList.add('fx-' + b.fx); }
  const cap = $('#lv-cap'); if (cap) { cap.textContent = b.cap; cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in'); }
  b.L.forEach(([x, k], j) => L.tm.push(setTimeout(() => liveBubble(x, k), 180 + j * 360)));
  L.tm.push(setTimeout(liveNext, Math.max(1500, 520 + b.L.length * 360 + 600)));
}
function liveBubble(x, k) {
  const box = $('#lv-bub');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'lb ' + k;
  el.textContent = x;
  // 겹치지 않게 자리 8칸(4줄 × 왼쪽 · 오른쪽)을 돌려 쓴다. 한 바퀴(약 2.9초)가 말이 떠 있는 시간(2.6초)보다 길다
  const SL = [[0, 0], [2, 1], [1, 0], [3, 1], [0, 1], [2, 0], [1, 1], [3, 0]];
  const [row, side] = SL[(LIVE ? LIVE.slot++ : 0) % SL.length];
  el.style.top = (5 + row * 11.5) + '%';
  el.style.visibility = 'hidden';
  box.appendChild(el);
  const W = box.clientWidth, w = el.offsetWidth, r = Math.random();
  const x0 = w > W * 0.48 ? (W - w) / 2 : side ? W / 2 + r * Math.max(0, W / 2 - w - W * 0.03) : W * 0.03 + r * Math.max(0, W / 2 - w - W * 0.03);
  el.style.left = Math.max(0, x0) + 'px';
  el.style.visibility = '';
  setTimeout(() => el.remove(), 2600);
}
function liveDone() {
  const b = document.querySelector('#live-card [data-liveskip]');
  if (b) { b.textContent = LIVE && LIVE.end ? '결과 보기 ▶' : '닫기'; }
}
function liveStop() { if (LIVE) LIVE.tm.forEach(clearTimeout); }
function liveOn() { return !!LIVE && !$('#live').classList.contains('hidden'); }
function liveClose() {
  liveStop();
  const f = LIVE && LIVE.end;
  LIVE = null;
  $('#live').classList.add('hidden');
  $('#live-card').innerHTML = '';
  if (f) f();
}
// 다시 보기 단추: 카드 · 요약 줄에 spec을 걸어 둔다 (bill처럼 번호로)
function liveKey(sp) { UI.liveMap = UI.liveMap || {}; const k = UI.liveN = (UI.liveN || 0) + 1; UI.liveMap[k] = sp; delete UI.liveMap[k - 400]; return k; }
function liveBtnHTML(sp, label) { return sp ? `<button class="lv-re" data-live="${liveKey(sp)}">▶ ${U.esc(label || '무대 다시 보기')}</button>` : ''; }
