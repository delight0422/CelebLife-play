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
// 1위 발표 때 같이 서는 다른 팀 이름 (지어낸 이름)
const LV_RIVALS = ['NOVA9', '루나틱', 'BLUEHOUR', '하이틴즈', 'METEOR', '온새미로', 'PRISMA', '새벽세시'];
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
    L: f === 2 ? [[`${who}!! ${who}!!`, 'call'], [pk(LV_BIG), 'big'], [pk(LV_BIG), 'big']] : f === 1 ? [[`${cn}!`, 'call'], [pk(['와아!', '꺄아!']), 'big']] : [[pk(['짝… 짝…', '누구야?', '웅성웅성']), 'soft']].concat(sp.debut ? [['신인인가 봐', 'soft']] : []) });
  // 2. 전주 · 응원법: 팬이 모인 팀은 멤버 이름을 차례로 부른다
  if (f >= 1) {
    const names = grp ? sp.mem.map(m => m[0]).slice(0, 7) : [cn, cn];
    B.push({ cap: '전주 · 응원법', glow: 0.55, L: [[names.join('! ') + '!' + (fd ? ` ${fd}!` : ''), 'call']].concat(f === 2 ? [[pk(LV_BIG), 'big']] : []) });
  } else B.push({ cap: '전주', glow: 0.4, L: [['……', 'soft'], [`${cn}…!`, 'soft']] });
  // 3. 1절: 무대 실력
  const pv = lvl(z('perf')), lead = grp ? (sp.mem.find(m => /^메인보컬/.test(m[1] || '')) || sp.mem[sp.mi] || [g])[0] : g;
  B.push({ cap: `1절 · ${lead}의 첫 소절`, glow: 0.5 + pv * 0.15,
    L: pv === 2 ? [[pk(['라이브 뭐야!!', '음원 찢었다!!', '와… 소름']), 'big'], [pk(LV_BIG), 'big']] : pv === 1 ? [[pk(['잘한다!', '좋다!']), 'big'], ['짝짝짝', 'soft']] : [[pk(['어…?', '웅성웅성…', '……']), 'bad']] });
  // 4. 후렴: 곡이 좋을수록 떼창
  const qv = lvl(z('q'));
  const ch = qv === 2 ? [['♪ 떼창 ♪', 'sing'], ['♪ ♪ ♪', 'sing'], [pk(['노래 너무 좋아!!', '후렴 미쳤다!!']), 'big']] : qv === 1 ? [['♪ ♪', 'sing'], [pk(['노래 좋네', '좋다!']), 'soft']] : [[pk(['……', '짝… 짝…']), 'soft']];
  if (z('trend') >= 0.5 && R() < 0.6) ch.push(['요즘 노래다!!', 'big']);
  B.push({ cap: '후렴', glow: 0.6 + qv * 0.15, L: ch });
  // 5. 하이라이트: 아이돌은 댄스 브레이크(팀워크), 솔로는 무대 장악. 내 파트에서 이름을 부른다
  const hl = [];
  if (grp) { const tv = lvl(z('tw')); if (tv === 2) hl.push(['칼군무!!!', 'big'], ['소름 돋았어!!', 'big']); else if (tv === 0) hl.push(['어어…?', 'bad']); else hl.push(['짝짝짝', 'soft']); }
  else if (pv === 2) hl.push([pk(['무대 장악 미쳤다!!', '눈을 못 떼겠어!!']), 'big']);
  const mv = lvl(z('me'));
  if (mv === 2) hl.push([`${mine}!!!`, 'call'], [`${mine} 사랑해!!`, 'big']); else if (mv === 1) hl.push([`${mine}!`, 'call']);
  if (z('cf') >= 0.5) hl.push(['콘셉트 찰떡!!', 'big']); else if (z('cf') <= -0.5) hl.push(['수군수군…', 'bad']);
  if (z('star') >= 0.6) hl.push(['비주얼 뭐야!!', 'big']);
  if (!hl.length) hl.push(['짝짝짝', 'soft']);
  B.push({ cap: grp ? '댄스 브레이크' : '하이라이트', glow: 0.75, L: hl });
  // 6. 엔딩: 점수
  const sc = sp.sc, end = sc >= 80 ? [['앙코르!! 앙코르!!', 'call'], [pk(LV_BIG), 'big'], [pk(LV_BIG), 'big']] : sc >= 65 ? [['짝짝짝짝짝!!', 'big'], ['수고했어!!', 'big']] : sc >= 52 ? [['짝짝짝', 'soft'], ['고생했어!', 'soft']] : [['짝짝…', 'soft']];
  if (sp.debut && sc >= 52) end.push(['데뷔 축하해!!', 'big']);
  B.push({ cap: '엔딩 포즈', glow: sc >= 80 ? 1 : sc >= 65 ? 0.8 : 0.55, L: end });
  // 7. 1위 발표 (음악방송): 1위를 했거나 후보에 올랐을 때만. 아슬아슬하면 긴장
  if (sp.wins > 0 || sp.cand) {
    // 무대 위에 출연 팀이 다 모여 선 채로 발표한다 (v124). MC 말(mc)은 무대 위 가운데에 뜬다
    const rv = pk(LV_RIVALS.filter(x => x !== g));
    B.push({ cap: '1위 발표', glow: 0.3, fx: 'drum', gather: 1, L: [['이번 주 1위는…!', 'mc'], ['제발…!', 'soft'], [`${cn}!! ${cn}!!`, 'call']] });
    if (sp.wins > 0) B.push({ cap: '1위', glow: 1, fx: 'win', gather: 1, L: [[`${g}! 축하합니다!`, 'mc'], ['꺄아아아아!!', 'win'], [`${cn} 1위!!`, 'win'], [pk(['울지 마!!', '축하해!!']), 'big']] });
    else B.push({ cap: '2위', glow: 0.5, gather: 1, lose: 1, L: [[`${rv}! 축하합니다!`, 'mc'], ['아…', 'bad'], ['괜찮아!!', 'call'], ['다음엔 1위!!', 'big']] });
  }
  return B;
}
// 팬미팅: 토크(예능) · 노래 · 게임 · 편지 · 끝인사
function liveMeet(sp, R, pk, z, lvl, who, mine) {
  const g = sp.g, B = [];
  B.push({ cap: `${who} 앞에 ${josa(`「${g}」`, '이가')} 선다`, glow: 0.6, L: [[`${who}!! ${who}!!`, 'call'], [pk(LV_BIG), 'big']] });
  const vv = lvl(z('var'));
  B.push({ cap: '토크', glow: 0.55, L: vv === 2 ? [['하하하하하!!', 'big'], ['푸하하하!!', 'big']] : vv === 1 ? [['하하하', 'soft'], [`${mine} 귀여워!!`, 'call']] : [['하… 하하…', 'soft']] });
  const pv = lvl(z('perf'));
  B.push({ cap: '노래', glow: 0.65, L: pv >= 1 ? [['♪ 떼창 ♪', 'sing'], ['♪ ♪', 'sing']] : [['……', 'soft'], ['♪', 'sing']] });
  B.push({ cap: '게임', glow: 0.6, L: [['이겨라!!', 'call'], [`${mine} 화이팅!!`, 'call'], ['꺄하하하!', 'big']] });
  B.push({ cap: '편지 읽기', glow: 0.4, L: [['훌쩍…', 'soft'], ['울지 마!!', 'big'], [`${sp.cn || g} 사랑해!!`, 'call']] });
  B.push({ cap: '끝인사', glow: 0.85, L: [['또 와!!', 'big'], ['사랑해!!', 'big'], [`${who}!! ${who}!!`, 'call']] });
  return B;
}

// ───── 도트 캐릭터 ─────
// 그림 파일 없이 12×16칸 도트로 그린다. 이름(씨앗)마다 머리 모양 · 머리색 · 피부색이 정해지고, 옷은 그룹 색이다
const LV_HAIR = ['#2b2330', '#4a3326', '#7a4e2d', '#c9a45c', '#e8d9b0', '#d96a9a', '#6f8fe0', '#b9b4c9', '#8e3b46'];
const LV_SKIN = ['#ffe0c4', '#f6cfa8', '#eab98f'];
function liveSprite(key, hue) {
  const h = hashN('sp' + key), hair = LV_HAIR[h % LV_HAIR.length], skin = LV_SKIN[(h >> 4) % LV_SKIN.length], st = (h >> 7) % 3;
  const fit = `hsl(${hue} 70% 62%)`, fit2 = `hsl(${hue} 60% 46%)`, leg = '#2c2740', shoe = '#f4f1fa';
  const r = (x, y, w, hh, c) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="${c}"/>`;
  let p = r(3, 0, 6, 1, hair) + r(2, 1, 8, 2, hair) + r(2, 3, 1, 2, hair) + r(9, 3, 1, 2, hair) + r(3, 3, 6, 4, skin) + r(4, 7, 4, 1, skin) + r(3, 3, st === 1 ? 6 : 3, 1, hair);
  if (st >= 1) p += r(2, 5, 1, st === 2 ? 5 : 2, hair) + r(9, 5, 1, st === 2 ? 5 : 2, hair); // 단발 · 긴 머리
  p += r(4, 4, 1, 1, '#2b2330') + r(7, 4, 1, 1, '#2b2330') + r(5, 6, 2, 1, '#e58a8a');
  p += r(3, 8, 6, 4, fit) + r(2, 8, 1, 3, fit2) + r(9, 8, 1, 3, fit2) + r(2, 11, 1, 1, skin) + r(9, 11, 1, 1, skin) + r(5, 8, 2, 1, '#fff');
  p += r(4, 12, 2, 3, leg) + r(6, 12, 2, 3, leg) + r(3, 15, 3, 1, shoe) + r(6, 15, 3, 1, shoe);
  return `<svg class="lv-sp" viewBox="0 0 12 16" shape-rendering="crispEdges" aria-hidden="true">${p}</svg>`;
}

// ───── 그림 캐릭터 (v125) ─────
// img/ch/의 부품(몸 · 뒷머리 · 얼굴 · 앞머리)을 겹쳐 그린다. 회색 옷은 그룹 색, 회색 머리는 머리색으로 물들인다
// 부품 목록은 js/chparts.js(CH_PARTS). 그림이 없거나 아직 안 읽혔으면 위의 도트 캐릭터가 그대로 보인다
const CH = { img: {}, n: 0, ok: false, started: false };
const CH_HAIR = [[52, 44, 58], [52, 44, 58], [84, 58, 44], [84, 58, 44], [128, 84, 52], [196, 160, 96], [226, 210, 170], [222, 112, 160], [116, 148, 228], [186, 180, 204], [150, 66, 78], [108, 176, 150]];
function chLoad() {
  if (CH.started || typeof CH_PARTS === 'undefined') return;
  CH.started = true;
  const L = CH_PARTS.body.concat(CH_PARTS.face, ...CH_PARTS.hair.map(h => [h + '_b', h + '_f']));
  for (const n of L) { const im = new Image(); im.onload = () => { CH.img[n] = im; if (++CH.n === L.length) { CH.ok = true; chPaintAll(); } }; im.src = `img/ch/${n}.png`; }
}
function chHsl(h, s, l) { const a = s * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; }
// 부품 하나를 물들여 ctx에 얹는다. mode: 'fit'(옷 → 그룹 색) · 'hair'(머리색) · ''(그대로)
function chLayer(ctx, name, mode, arg) {
  const im = CH.img[name]; if (!im) return;
  if (!mode) { ctx.drawImage(im, 0, 0); return; }
  const c = CH.tmp || (CH.tmp = document.createElement('canvas')); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d', { willReadFrequently: true }); x.clearRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0);
  const D = x.getImageData(0, 0, c.width, c.height), d = D.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), L = (r + g + b) / 3;
    if (mx - mn > 26 || L < 42) continue; // 살색 · 볼터치 같은 색 있는 칸과 검은 외곽선은 그대로
    if (mode === 'fit') { if (L > 236) continue; const q = chHsl(arg, 0.62, 0.1 + 0.72 * L / 255); d[i] = q[0]; d[i + 1] = q[1]; d[i + 2] = q[2]; }
    else { const k = L <= 150 ? L / 150 : 1, w = L <= 150 ? 0 : (L - 150) / 105 * 0.75; for (let j = 0; j < 3; j++) d[i + j] = Math.round(arg[j] * k + (255 - arg[j] * k) * w); }
  }
  x.putImageData(D, 0, 0); ctx.drawImage(c, 0, 0);
}
// 캐릭터 하나: 이름(key)마다 머리 모양 · 머리색 · 얼굴, 그룹(gkey)마다 옷
function chPaint(cv) {
  const key = cv.dataset.ch, h = hashN('sp' + key), g = hashN('fit' + cv.dataset.g), P = CH_PARTS;
  const hair = P.hair[h % P.hair.length], face = P.face[(h >> 5) % P.face.length], body = P.body[g % P.body.length], hc = CH_HAIR[(h >> 9) % CH_HAIR.length];
  const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height);
  chLayer(ctx, hair + '_b', 'hair', hc); chLayer(ctx, body, 'fit', +cv.dataset.hue); chLayer(ctx, face, ''); chLayer(ctx, hair + '_f', 'hair', hc);
  cv.parentNode.classList.add('on');
}
function chPaintAll() { if (CH.ok) document.querySelectorAll('canvas.lv-chc').forEach(chPaint); }
// 무대에 세울 캐릭터 하나의 HTML: 그림이 준비되면 그림, 아니면 도트
function liveChar(key, hue, gkey) {
  if (typeof CH_PARTS === 'undefined') return liveSprite(key, hue);
  return `<span class="lv-ch">${liveSprite(key, hue)}<canvas class="lv-chc" width="${CH_PARTS.w}" height="${CH_PARTS.h}" data-ch="${U.esc(key)}" data-g="${U.esc(gkey)}" data-hue="${hue}"></canvas></span>`;
}

// ───── 창 ─────
// 실시간 창은 사건 창 위에 뜬다. 끝나거나 '결과 바로 보기'를 누르면 end를 부른다 (다시 보기는 end 없이 그냥 닫힌다)
let LIVE = null;
function liveOpen(sp, end) {
  liveStop();
  LIVE = { sp, B: liveBeats(sp), i: -1, tm: [], slot: 0, end: end || null };
  $('#live-card').innerHTML = liveHTML(sp);
  $('#live').classList.remove('hidden');
  chLoad(); chPaintAll();
  liveNext();
}
function liveHTML(sp) {
  const fan = U.clamp(((sp.z.fans || 0) + 1.5) / 3, 0, 1), n = 16 + Math.round(fan * 44);
  const sticks = Array.from({ length: n }, (_, i) => `<i style="--d:${(i * 0.137) % 1.2}s;--x:${(i * 37) % 100}%;--y:${(i * 53) % 100}%"></i>`).join('');
  const mem = sp.mem.length ? sp.mem : [[sp.g, '']];
  // 1위 발표 때만 보이는 다른 팀들 (무대 양옆)
  const oth = k => [0, 1, 2].map(i => `<span class="lm" style="--i:${i + k}">${liveChar('rival' + sp.seed + (i + k), (sp.hue + 90 + (k ? 110 : 0)) % 360, 'rival' + sp.seed + k)}</span>`).join('');
  return `<div class="lv-top"><span class="lv-place">${U.esc(sp.place)}</span>${sp.t ? `<span class="lv-t">「${U.esc(sp.t)}」</span>` : ''}<span class="lv-g">${U.esc(sp.g)}</span></div>`
    + `<div class="lv-stage" id="lv-stage" style="--hue:${sp.hue};--glow:0.3"><div class="lv-lights"><i></i><i></i><i></i><i></i></div>`
    + `<div class="lv-floor"></div><div class="lv-oth l">${oth(0)}</div><div class="lv-oth r">${oth(3)}</div>`
    + `<div class="lv-mem">${mem.map((m, i) => `<span class="lm${i === sp.mi ? ' me' : ''}" style="--i:${i}">${liveChar(sp.g + '/' + m[0] + i, sp.hue, sp.g)}<em>${U.esc(m[0])}</em></span>`).join('')}</div>`
    + `<div class="lv-conf">${Array.from({ length: 26 }, (_, i) => `<i style="left:${(i * 41) % 100}%;--d:${(i * 0.17) % 1.4}s;--c:${(i * 67) % 360}"></i>`).join('')}</div>`
    + `<div class="lv-crowd">${sticks}</div><div class="lv-bub" id="lv-bub"></div><div class="lv-mc" id="lv-mc"></div></div>`
    + `<div class="lv-pips">${LIVE.B.map(() => '<i></i>').join('')}</div>`
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
  if (st) { st.style.setProperty('--glow', b.glow); st.classList.remove('fx-drum', 'fx-win'); if (b.fx) st.classList.add('fx-' + b.fx); st.classList.toggle('gather', !!b.gather); st.classList.toggle('lose', !!b.lose); }
  b.L.forEach(([x, k], j) => L.tm.push(setTimeout(() => liveBubble(x, k), 180 + j * 360)));
  L.tm.push(setTimeout(liveNext, Math.max(1500, 520 + b.L.length * 360 + 600)));
}
function liveBubble(x, k) {
  const box = $('#lv-bub');
  if (!box) return;
  if (k === 'mc') { const m = $('#lv-mc'); if (m) { m.textContent = x; m.classList.remove('in'); void m.offsetWidth; m.classList.add('in'); } return; }
  const el = document.createElement('div');
  el.className = 'lb ' + k;
  el.textContent = x;
  // 겹치지 않게 자리 8칸(4줄 × 왼쪽 · 오른쪽)을 돌려 쓴다. 한 바퀴(약 2.9초)가 말이 떠 있는 시간(2.6초)보다 길다
  const SL = [[0, 0], [2, 1], [1, 0], [3, 1], [0, 1], [2, 0], [1, 1], [3, 0]];
  const [row, side] = SL[(LIVE ? LIVE.slot++ : 0) % SL.length];
  el.style.top = (14 + row * 8) + '%';
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
