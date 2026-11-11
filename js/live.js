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
// 결과 창이 따로 없는 일(촬영 끝 · 예능 녹화 · 연주회)을 창으로 띄울지: 실시간 창을 볼 차례일 때만 (설정을 따른다)
function liveShow(sp) { return !!sp && liveWant(sp); }
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
  return { v: 'stage', k: o.k, vn: o.vn || '', nw: o.nw ? 1 : 0, big: o.big || 0, old: o.old ? 1 : 0, fx2: o.fixed ? 1 : 0, x: o.x || null, key: o.key !== false, seed: U.int(1, 2e9), place: o.place || '무대', t: o.t || '', g: o.g || '', cn: o.cn || '', fd: o.fd || '', mem: (o.mem || []).slice(0, 10), mi: o.mi || 0, hue: hashN('hue' + name) % 360, z, sc: Math.round(o.sc || 0), wins: o.wins || 0, rv: o.rv || '', cand: o.cand ? 1 : 0, debut: o.debut ? 1 : 0 };
}

// 같은 곡 무대를 다른 자리에서 한 번 더 (시상식 무대 등): 요인은 그대로, 씨앗만 새로. 1위 발표 · 데뷔 인사는 뺀다
function liveAgain(sp, o) { return Object.assign({}, sp, { seed: U.int(1, 2e9), key: false, wins: 0, cand: 0, debut: 0 }, o || {}); }

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
  const who = cn; // 팬덤 이름은 무대에서 부르지 않는다 (v134: 어느 장면에서 나와도 어색했다)
  const B = [];
  if (sp.k === 'meet') return liveMeet(sp, R, pk, z, lvl, who, mine);
  if (sp.k === 'band' || sp.k === 'player') return liveBand(sp, R, pk, z, lvl, cn, mine);
  if (sp.k === 'stream') return liveStream(sp, R, pk, z, lvl);
  if (sp.k === 'set') return liveSet(sp, R, pk, z, lvl, mine);
  if (sp.k === 'show') return liveTv(sp, R, pk, z, lvl, mine);
  if (sp.k === 'runway') return liveRunway(sp, R, pk, z, lvl, mine);
  if (sp.k === 'booth') return liveBooth(sp, R, pk, z, lvl, mine);
  if (sp.k === 'class') return liveClass(sp, R, pk, z, lvl, mine);
  // 1. 등장: 팬이 많을수록 객석이 크다
  const f = lvl(z('fans'));
  B.push({ cap: `조명이 켜지고 ${josa(g, '이가')} 무대에 선다`, glow: 0.35 + f * 0.15,
    L: f === 2 ? [[`${who}!! ${who}!!`, 'call'], [pk(LV_BIG), 'big'], [pk(LV_BIG), 'big']] : f === 1 ? [[`${cn}!`, 'call'], [pk(['와아!', '꺄아!']), 'big']] : [[pk(['짝… 짝…', '누구야?', '웅성웅성']), 'soft']].concat(sp.debut ? [['신인인가 봐', 'soft']] : []) });
  // 2. 전주 · 응원법: 팬이 모인 팀은 멤버 이름을 차례로 부른다
  if (f >= 1) {
    const names = grp ? sp.mem.map(m => m[0]).slice(0, 7) : [cn, cn];
    B.push({ cap: '전주 · 응원법', glow: 0.55, L: [[names.join('! ') + '!', 'call']].concat(f === 2 ? [[pk(LV_BIG), 'big']] : []) });
  } else B.push({ cap: '전주', glow: 0.4, L: [['……', 'soft'], [`${cn}…!`, 'soft']] });
  // 3. 1절: 무대 실력
  const pv = lvl(z('perf')), lead = grp ? (sp.mem.find(m => /^메인보컬/.test(m[1] || '')) || sp.mem[sp.mi] || [g])[0] : g;
  B.push({ cap: `1절 · ${lead}의 첫 소절`, glow: 0.5 + pv * 0.15,
    L: pv === 2 ? [[pk(['라이브 뭐야!!', '음원 찢었다!!', '와… 소름']), 'big'], [pk(LV_BIG), 'big']] : pv === 1 ? [[pk(['잘한다!', '좋다!']), 'big'], ['짝짝짝', 'soft']] : [[pk(['어…?', '웅성웅성…', '……']), 'bad']] });
  // 4. 후렴: 곡이 좋을수록 떼창
  const qv = lvl(z('q'));
  const ch = qv === 2 ? [['♪ 떼창 ♪', 'sing'], ['♪ ♪ ♪', 'sing'], [pk(['노래 너무 좋아!!', '후렴 미쳤다!!']), 'big']] : qv === 1 ? [['♪ ♪', 'sing'], [pk(['노래 좋네', '좋다!']), 'soft']] : [[pk(['……', '짝… 짝…']), 'soft']];
  if (z('trend') >= 0.5 && R() < 0.6) ch.push(['너무 좋아!!', 'big']);
  B.push({ cap: '후렴', glow: 0.6 + qv * 0.15, L: ch });
  // 5. 하이라이트: 아이돌은 댄스 브레이크(팀워크), 솔로는 무대 장악. 내 파트에서 이름을 부른다
  const hl = [];
  if (grp) { const tv = lvl(z('tw')); if (tv === 2) hl.push(['칼군무!!!', 'big'], ['소름 돋았어!!', 'big']); else if (tv === 0) hl.push(['어어…?', 'bad']); else hl.push(['짝짝짝', 'soft']); }
  else if (pv === 2) hl.push([pk(['무대 장악 미쳤다!!', '눈을 못 떼겠어!!']), 'big']);
  const mv = lvl(z('me'));
  if (mv === 2) hl.push([`${mine}!!!`, 'call'], [`${mine} 사랑해!!`, 'big']); else if (mv === 1) hl.push([`${mine}!`, 'call']);
  if (z('cf') >= 0.5) hl.push(['컨셉 찰떡!!', 'big']); else if (z('cf') <= -0.5) hl.push(['수군수군…', 'bad']);
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
    const rv = sp.rv || pk(LV_RIVALS.filter(x => x !== g));
    B.push({ cap: '1위 발표', glow: 0.3, fx: 'drum', gather: 1, L: [['이번 주 1위는…!', 'mc'], ['제발…!', 'soft'], [`${cn}!! ${cn}!!`, 'call']] });
    if (sp.wins > 0) B.push({ cap: '1위', glow: 1, fx: 'win', gather: 1, L: [[`${g}! 축하합니다!`, 'mc'], ['꺄아아아아!!', 'win'], [`${cn} 1위!!`, 'win'], [pk(['울지 마!!', '축하해!!']), 'big']] });
    else B.push({ cap: '2위', glow: 0.5, gather: 1, lose: 1, L: [[`${rv}! 축하합니다!`, 'mc'], ['아…', 'bad'], ['괜찮아!!', 'call'], ['다음엔 1위!!', 'big']] });
  }
  return B;
}
// ───── 밴드 · 연주가 무대 (12-3) ─────
// 클럽 공연 · 쇼케이스 · 페스티벌(밴드), 연주회(연주가). 응원법 · 1위 발표가 없고, 연주 · 합 · 내 파트 솔로 · 떼창 · 앵콜로 간다
// 요인: perf(연주 실력) · tw(합) · me(내 파트) · q(곡) · fans(우리 팬이 얼마나 왔나) · trend. nw: 우리를 처음 보는 객석 (페스티벌)
const LV_PART = { 보컬: ['🎤', '목소리 미쳤다!!'], 기타: ['🎸', '기타 솔로 미쳤다!!'], 베이스: ['🎸', '베이스 죽인다!!'], 드럼: ['🥁', '드럼 미쳤다!!'], 키보드: ['🎹', '건반 미쳤다!!'], 피아노: ['🎹', '피아노 미쳤다!!'] };
function livePartIc(p) { return (LV_PART[p] || ['🎵'])[0]; }
function liveBand(sp, R, pk, z, lvl, cn, mine) {
  const B = [], solo = sp.k === 'player', part = (sp.mem[sp.mi] || [])[1] || '', f = lvl(z('fans'));
  const clap = ['짝짝짝', '짝짝짝짝!'], big = solo ? ['브라보!!', '와아…!', '대단하다!!'] : LV_BIG;
  // 1. 등장
  B.push({ cap: '등장', glow: 0.35 + f * 0.15, L: sp.nw && f < 2 ? [[pk(['저 밴드 누구야?', '처음 보는 팀인데?']), 'soft'], ['짝… 짝…', 'soft']]
    : f === 2 ? [[`${cn}!! ${cn}!!`, 'call'], [pk(big), 'big'], [pk(big), 'big']] : f === 1 ? [[pk(['와아!', '오오!']), 'big'], [pk(clap), 'soft']] : [[pk(['짝… 짝…', '웅성웅성']), 'soft']] });
  // 2. 첫 곡: 연주 실력
  const pv = lvl(z('perf'));
  B.push({ cap: '첫 곡', glow: 0.5 + pv * 0.15, L: pv === 2 ? [[pk(solo ? ['소리가 다르다!!', '와… 소름'] : ['연주 미쳤다!!', '사운드 뭐야!!', '와… 소름']), 'big'], [pk(big), 'big']] : pv === 1 ? [[pk(['오, 괜찮은데?', '좋다!']), 'soft'], [pk(clap), 'soft']] : [[pk(['어…?', '박자가…', '……']), 'bad']] });
  // 3. 합 (밴드만)
  if (!solo) { const tv = lvl(z('tw')); if (tv === 2) B.push({ cap: '합', glow: 0.65, L: [['합 미쳤다!!', 'big'], ['딱딱 맞네!!', 'big']] }); else if (tv === 0) B.push({ cap: '합', glow: 0.45, L: [['어어…?', 'bad'], ['웅성웅성…', 'bad']] }); }
  // 4. 내 파트
  const mv = lvl(z('me')), pl = (LV_PART[part] || ['', '연주 미쳤다!!'])[1];
  B.push({ cap: '내 파트', glow: 0.7, L: mv === 2 ? [[`${mine}!!!`, 'call'], [pl, 'big']] : mv === 1 ? [[`${mine}!`, 'call'], [pk(clap), 'soft']] : [['……', 'soft'], ['짝… 짝…', 'soft']] });
  // 5. 후렴: 곡이 좋으면 떼창 (연주회는 숨죽여 듣는다)
  const qv = lvl(z('q'));
  const ch = solo ? (qv === 2 ? [['……', 'soft'], ['와…', 'big']] : qv === 1 ? [['……', 'soft']] : [['콜록', 'soft'], ['……', 'soft']])
    : qv === 2 ? [['♪ 떼창 ♪', 'sing'], ['♪ ♪ ♪', 'sing'], [pk(['노래 너무 좋아!!', '후렴 미쳤다!!']), 'big']] : qv === 1 ? [['♪ ♪', 'sing'], ['좋다!', 'soft']] : [['……', 'soft'], ['짝… 짝…', 'soft']];
  if (!solo && z('trend') >= 0.5 && R() < 0.6) ch.push(['너무 좋아!!', 'big']);
  B.push({ cap: '후렴', glow: 0.6 + qv * 0.15, L: ch });
  // 6. 엔딩
  const sc = sp.sc, enc = solo ? '브라보!! 브라보!!' : '앵콜!! 앵콜!!';
  B.push({ cap: '엔딩', glow: sc >= 80 ? 1 : sc >= 65 ? 0.8 : 0.55, L: sc >= 80 ? [[enc, 'call'], [pk(big), 'big'], [pk(big), 'big']] : sc >= 65 ? [['짝짝짝짝짝!!', 'big'], [solo ? '브라보!' : '한 곡 더!!', 'big']] : sc >= 52 ? [[pk(clap), 'soft'], ['수고했어요!', 'soft']] : [['짝짝…', 'soft']] });
  return B;
}
// ───── 세트장 (12-3): 영화 촬영장 · 야외 촬영 (배우) · 예능 스튜디오 (예능인) ─────
// 객석이 없다. 들리는 건 감독(mc: 무대 위 가운데 말풍선)의 '액션 · 컷 · NG · 오케이'와 스태프 · 방청객 소리뿐
// 촬영장 요인: perf(내 연기가 배역에 맞았나) · emo(표현력) · co(상대 배우) · vis(화면발). old: 학원물에 안 어울리는 나이
// clap: 슬레이트를 친다
function liveSet(sp, R, pk, z, lvl, mine) {
  const B = [], pv = lvl(z('perf')), ev = lvl(z('emo')), cv = lvl(z('co'));
  B.push({ cap: '슬레이트', glow: 0.5, clap: 1, L: [['레디— 액션!', 'mc'], ['쉿…', 'soft']] });
  B.push({ cap: '첫 테이크', glow: 0.6, L: pv === 2 ? [['컷! 오케이!!', 'mc'], [pk(['한 번에 갔다!', '와…']), 'big'], ['짝짝짝', 'soft']] : pv === 1 ? [['컷! 한 번만 더 갈게요', 'mc'], ['네!', 'soft']] : [['컷! NG!', 'mc'], [pk(['아…', '대사가…']), 'bad'], ['다시 갑니다!', 'soft']] });
  if (sp.old) B.push({ cap: '모니터', glow: 0.5, L: [['음… 교복이 좀…', 'bad'], ['수군수군…', 'bad']] });
  B.push({ cap: '감정 씬', glow: 0.45, clap: 1, L: ev === 2 && pv >= 1 ? [['액션!', 'mc'], ['……', 'soft'], ['훌쩍…', 'soft'], ['컷… 좋았어요', 'mc']] : ev === 0 || pv === 0 ? [['액션!', 'mc'], ['컷! 감정이 안 올라와요', 'mc'], ['어어…', 'bad']] : [['액션!', 'mc'], ['……', 'soft'], ['컷! 좋아요', 'mc']] });
  B.push({ cap: '같이 찍는 씬', glow: 0.6, clap: 1, L: cv === 2 ? [['액션!', 'mc'], [pk(['호흡 좋다!', '둘이 잘 맞네!']), 'big']] : cv === 0 ? [['액션!', 'mc'], ['대사가 꼬였다…', 'bad'], ['컷! 다시!', 'mc']] : [['액션!', 'mc'], ['컷! 오케이', 'mc']] });
  if (z('vis') >= 0.6) B.push({ cap: '클로즈업', glow: 0.75, L: [['화면 잘 받는다!', 'big'], [`${mine} 얼굴 좀 봐!`, 'call']] });
  const sc = sp.sc;
  B.push({ cap: '마지막 컷', glow: sc >= 74 ? 1 : 0.7, clap: 1, L: [['컷! 수고하셨습니다!', 'mc']].concat(sc >= 74 ? [['오늘 연기 미쳤다!!', 'big'], ['짝짝짝짝짝!!', 'big'], [`${mine}!!`, 'call']] : sc >= 46 ? [['짝짝짝짝!', 'soft'], ['수고하셨습니다!!', 'big']] : [['짝짝…', 'soft'], ['수고하셨습니다…', 'soft']]) });
  return B;
}
// 예능 녹화: 오프닝 → 내 토크 → 코너 → 리액션 → 클로징. big: 1 레전드 회차 · -1 노잼. 웃음소리가 전부다
function liveTv(sp, R, pk, z, lvl, mine) {
  const B = [], good = sp.sc >= 60, big = sp.big || 0, HA = ['하하하하!!', '푸하하!!', '꺄하하하!'];
  B.push({ cap: '오프닝', glow: 0.6, clap: 1, L: [['자, 시작합니다!', 'mc'], ['와아아!', 'big'], ['짝짝짝', 'soft']] });
  B.push({ cap: '내 토크', glow: 0.65, L: big > 0 ? [[pk(HA), 'big'], [pk(HA), 'big'], ['아 진짜 웃겨!!', 'big']] : good ? [[pk(HA), 'big'], ['하하하', 'soft']] : big < 0 ? [['……', 'bad'], ['어…', 'bad']] : [['하… 하하', 'soft'], ['……', 'soft']] });
  B.push({ cap: '코너', glow: 0.7, L: big > 0 ? [['이건 방송 나가면 난리 나겠는데요?', 'mc'], [pk(HA), 'big'], [`${mine}!! ${mine}!!`, 'call']] : good ? [['오, 잘한다!', 'big'], [pk(HA), 'big']] : big < 0 ? [['자… 다음 갈게요', 'mc'], ['에이…', 'bad']] : [['자, 다음!', 'mc'], ['짝짝', 'soft']] });
  if (good && z('var') >= 0.6) B.push({ cap: '리액션', glow: 0.7, L: [['리액션 좋다!', 'big'], ['하하하하!!', 'big']] });
  B.push({ cap: '클로징', glow: big > 0 ? 1 : 0.7, L: [[sp.fx2 ? '다음 주에도 함께해요!' : '오늘 게스트, 고생하셨습니다!', 'mc']].concat(big > 0 ? [['짝짝짝짝짝!!', 'big'], ['또 나와요!!', 'big']] : good ? [['짝짝짝짝!', 'soft'], ['수고했어요!', 'big']] : [['짝짝…', 'soft']]) });
  return B;
}
// ───── 런웨이 (12-3): 모델의 패션쇼 ─────
// 가운데 긴 무대를 걸어 나왔다가 돌아간다. 들리는 건 음악 · 셔터 소리 · 앞줄 객석 · 현장에 온 패션 기자의 한마디(mc)뿐
// 결과(sp.big: 1 화제 · -1 혹평, sp.sc)가 장면을 정하고, 요인 pose(표현력) · vis(외모)가 한 줄씩 보탠다
// walk: 무대 어디쯤 있나 0(뒤) ~ 1(맨 앞) · flash: 플래시 1(드문드문) · 2(터진다)
function liveRunway(sp, R, pk, z, lvl, mine) {
  const B = [], q = sp.big > 0 ? 3 : sp.sc >= 60 ? 2 : sp.big < 0 ? 0 : 1, pv = lvl(z('pose'));
  B.push({ cap: '백스테이지', glow: 0.3, walk: 0, L: [[`다음, ${mine}!`, 'mc'], ['♪ 쿵— 쿵—', 'sing'], ['쉿…', 'soft']] });
  B.push({ cap: '등장', glow: 0.55, walk: 0.3, flash: 1, L: q >= 2 ? [['찰칵 찰칵', 'soft'], ['오…', 'big']] : q === 1 ? [['찰칵', 'soft'], ['……', 'soft']] : [['찰칵…', 'soft'], ['걸음이 좀…', 'bad']] });
  const mid = q === 3 ? [['저 모델 누구야?', 'big'], ['옷이 산다!!', 'big'], ['찰칵 찰칵 찰칵', 'soft']] : q === 2 ? [['오, 좋다', 'soft'], ['찰칵 찰칵', 'soft']] : q === 1 ? [['……', 'soft'], ['찰칵', 'soft']] : [['어어…?', 'bad'], ['방금 휘청했어', 'bad'], ['웅성웅성…', 'bad']];
  if (q >= 2 && z('vis') >= 0.6) mid.push(['얼굴 좀 봐…', 'big']);
  B.push({ cap: '워킹', glow: 0.65, walk: 0.65, flash: q >= 2 ? 1 : 0, L: mid });
  const end = q === 3 ? [['찰칵찰칵찰칵!!', 'big'], ['이쪽 봐 주세요!!', 'call'], ['와…', 'big']] : q === 2 ? [['찰칵찰칵!', 'big'], ['좋아요!', 'soft']] : q === 1 ? [['찰칵', 'soft'], ['……', 'soft']] : [['찰칵…', 'soft'], ['표정이 굳었네', 'bad']];
  if (q >= 2 && pv === 2) end.push(['포즈 미쳤다', 'big']);
  B.push({ cap: '포즈', glow: 0.9, walk: 1, flash: q >= 2 ? 2 : 1, L: end });
  B.push({ cap: '돌아가는 길', glow: 0.6, walk: 0.5, L: [[`기자: "${q === 3 ? '오늘 쇼는 저 모델이 다 했네요' : q === 2 ? '옷을 잘 살렸어요' : q === 1 ? '무난했어요' : '옷보다 실수가 먼저 보였네요'}"`, 'mc']].concat(q >= 2 ? [['끄덕끄덕', 'soft']] : q === 0 ? [['수군수군…', 'bad']] : []) });
  B.push({ cap: '피날레', glow: q >= 2 ? 1 : 0.7, walk: 0.55, gather: 1, flash: q === 3 ? 2 : q === 2 ? 1 : 0, L: [['감사합니다!', 'mc']].concat(q === 3 ? [['짝짝짝짝짝!!', 'big'], ['브라보!!', 'big'], [`${mine}!!`, 'call']] : q === 2 ? [['짝짝짝짝!', 'big'], ['멋졌어요!', 'soft']] : q === 1 ? [['짝짝짝', 'soft']] : [['짝짝…', 'soft']]) });
  return B;
}
// 런웨이 소품: 양옆 앞줄 객석(머리) · 플래시 · 맨 앞 사진 기자
function liveRunwayProps() {
  let h = '';
  for (let r = 0; r < 7; r++) for (const side of [-1, 1]) for (const col of [0, 1]) {
    const off = 15 + r * 4.6 + col * (6 + r * 0.9), sz = 15 + r * 4.5;
    h += `<i class="p-head" style="left:${50 + side * off}%;top:${22 + r * 9.5 + col * 2}%;width:${sz}px;height:${sz}px"></i>`;
  }
  for (let i = 0; i < 12; i++) { const side = i % 2 ? 1 : -1, r = (i * 5) % 7; h += `<b class="p-fl" style="left:${50 + side * (17 + r * 4.6 + (i % 3) * 4)}%;top:${20 + r * 9.5}%;--d:${(i * 0.19) % 0.9}s"></b>`; }
  return `<div class="lv-props">${h}<i class="p-cam l">📸</i><i class="p-cam r">📸</i></div>`;
}
// ───── 녹음 부스 (12-3): 성우의 녹음 ─────
// 마이크 앞에 서서 녹음한다. 왼쪽 유리창 너머에 음향 감독, 오른쪽에 모니터(애니 · 게임 · 외화 · 내레이션 화면)가 있다
// 들리는 건 음향 감독의 말(mc: 큐 · 컷 · 오케이)과 같이 녹음하는 동료 · 스태프 소리뿐. 방영 뒤 반응은 여기 나오지 않는다
// sp.x = { kind: 'ani' · 'game' · 'dub' · 'narr', title: 모니터에 뜰 이름 }. 요인: voice(목소리). rec: 녹음 등이 켜진다 · play: 모니터에 방금 녹음한 장면이 돈다
function liveBooth(sp, R, pk, z, lvl, mine) {
  const B = [], q = sp.big > 0 ? 3 : sp.sc >= 60 ? 2 : sp.big < 0 ? 0 : 1, vv = lvl(z('voice')), narr = (sp.x || {}).kind === 'narr';
  B.push({ cap: '큐 사인', glow: 0.5, rec: 1, L: [['자, 들어갑니다. 큐!', 'mc'], ['쉿…', 'soft']] });
  B.push({ cap: narr ? '첫 문장' : '첫 대사', glow: 0.6, rec: 1, L: q === 3 ? [['와…', 'big'], ['소름 돋았어', 'big'], ['컷! 오케이!!', 'mc']] : q === 2 ? [['오, 좋다', 'soft'], ['컷! 오케이!', 'mc']] : q === 1 ? [['……', 'soft'], ['컷! 한 번만 더 갈게요', 'mc'], ['네!', 'soft']] : [['어…?', 'bad'], ['톤이 좀…', 'bad'], [narr ? '컷! 다시 갈게요. 너무 딱딱해요' : '컷! 다시 갈게요. 캐릭터가 안 보여요', 'mc']] });
  B.push({ cap: narr ? '긴 문단' : '감정 대사', glow: 0.5, rec: 1, L: q >= 2 && vv === 2 ? [['큐!', 'mc'], ['목소리 뭐야…', 'big'], [narr ? '귀에 쏙쏙 들어온다' : '훌쩍…', 'soft'], ['컷! 좋았어요', 'mc']] : q >= 2 ? [['큐!', 'mc'], ['끄덕끄덕', 'soft'], ['컷! 좋아요', 'mc']] : q === 1 ? [['큐!', 'mc'], ['……', 'soft'], ['컷! 이걸로 갈게요', 'mc']] : [['큐!', 'mc'], ['발음이 꼬였다…', 'bad'], ['컷! 다시!', 'mc']] });
  B.push({ cap: '모니터', glow: 0.75, play: 1, L: [['모니터 한번 볼게요', 'mc']].concat(q === 3 ? [[narr ? '화면이 살아나네!' : '캐릭터 그 자체네!', 'big'], ['짝짝짝', 'soft']] : q === 2 ? [[narr ? '화면이랑 잘 붙네요' : '입이 딱 맞네요', 'soft']] : q === 1 ? [['음… 괜찮네요', 'soft']] : [[narr ? '화면이랑 따로 노네…' : '입이 안 맞네…', 'bad'], ['수군수군…', 'bad']]) });
  B.push({ cap: '마무리', glow: q >= 2 ? 1 : 0.7, L: [['수고하셨습니다!', 'mc']].concat(q === 3 ? [['짝짝짝짝짝!!', 'big'], ['다음에도 꼭 같이 해요!', 'big'], [`${mine}!!`, 'call']] : q === 2 ? [['짝짝짝!', 'soft'], ['수고하셨습니다!!', 'big']] : q === 1 ? [['수고하셨습니다', 'soft']] : [['수고하셨습니다…', 'soft']]) });
  return B;
}
function liveBoothProps(sp) {
  const X = sp.x || {}, ic = { ani: '🎞️', game: '🎮', dub: '🎬', narr: '📺' }[X.kind] || '🎞️';
  return `<div class="lv-props"><div class="p-win"><span>🎧</span><span>🎚️</span></div><div class="p-mon"><span>${ic}</span><b>${U.esc(X.title || '')}</b></div><i class="p-rec">REC</i></div>`;
}
// ───── 강의실 (12-3): 교수 · 강사의 수업 ─────
// 칠판 앞에 서서 가르친다. 아래쪽은 학생석(뒤통수). 들리는 건 학생들 소리뿐: 필기 · 감탄 · 질문 · 조는 소리 · 박수
// sp.x = { room: 'uni' 대학 강의실 · 'acad' 학원 교실 · 'hall' 특강 · 설명회 · 'ol' 인강 촬영(학생 없이 카메라 · PD), sub: 'first' 첫 수업 · 'term' 학기 수업 · 'last' 고별 강의 · 'talk' 특강, sign: 간판 }
// sp.sc(강의 점수)가 장면을 정하고, 요인 fun(말솜씨)이 웃음을 보탠다. write: 칠판에 글씨가 써진다 · zz: 조는 학생 1(조금) ~ 3(많이) · rec: 촬영 등
function liveClass(sp, R, pk, z, lvl, mine) {
  const X = sp.x || {}, B = [], sc = sp.sc, q = sc >= 72 ? 3 : sc >= 56 ? 2 : sc >= 42 ? 1 : 0, uni = X.room === 'uni', hon = uni ? '교수님' : '선생님';
  if (X.room === 'ol') {
    // 인강 촬영: 학생이 없다. PD의 말(mc)과 촬영 스태프 소리
    B.push({ cap: '촬영 시작', glow: 0.5, rec: 1, L: [['촬영 들어갑니다. 큐!', 'mc'], ['쉿…', 'soft']] });
    B.push({ cap: '판서', glow: 0.6, rec: 1, write: 1, L: q >= 2 ? [['사각사각', 'soft'], [pk(['오, 설명 좋다', '귀에 쏙쏙 들어오네']), 'soft']] : q === 1 ? [['사각사각', 'soft'], ['……', 'soft']] : [['말이 꼬였다…', 'bad'], ['컷! 다시 갈게요', 'mc']] });
    B.push({ cap: '설명', glow: 0.65, rec: 1, write: 1, L: q === 3 ? [['이 부분은 편집 없이 가도 되겠는데요?', 'mc'], ['끄덕끄덕', 'soft'], ['와…', 'big']] : q === 2 ? [['좋습니다, 계속 갈게요', 'mc'], ['끄덕끄덕', 'soft']] : q === 1 ? [['한 번만 더 갈게요', 'mc'], ['네!', 'soft']] : [['컷! NG!', 'mc'], ['어…', 'bad']] });
    B.push({ cap: '촬영 끝', glow: q >= 2 ? 0.9 : 0.6, write: 1, L: [['컷! 수고하셨습니다!', 'mc']].concat(q === 3 ? [['짝짝짝!', 'big'], ['이번 강의 대박 나겠는데요', 'big']] : q === 2 ? [['짝짝짝', 'soft'], ['수고하셨습니다!', 'soft']] : q === 1 ? [['수고하셨습니다', 'soft']] : [['수고하셨습니다…', 'soft']]) });
    return B;
  }
  const talk = X.sub === 'talk';
  // 1. 수업 시작
  B.push({ cap: '수업 시작', glow: 0.5, L: talk ? (q >= 2 ? [['와글와글', 'big'], ['자리가 없어!', 'soft'], ['뒤에 서서라도 듣자', 'soft']] : [['빈자리가 많네…', 'bad'], ['웅성웅성', 'soft']])
    : X.sub === 'first' ? [['새로 오신 분이래', 'soft'], ['웅성웅성', 'soft']] : X.sub === 'last' ? [['마지막 수업이래…', 'soft'], [`${hon}…`, 'call']] : q >= 2 ? [['안녕하세요!!', 'big'], ['드르륵', 'soft']] : [['드르륵', 'soft'], ['……', 'soft']] });
  // 2. 판서
  B.push({ cap: '판서', glow: 0.6, write: 1, L: q >= 2 ? [['사각사각', 'soft'], ['아하!', 'big'], [pk(['이제 알겠다', '이렇게 쉬운 거였어?']), 'soft']] : q === 1 ? [['사각사각', 'soft'], ['……', 'soft']] : [['어…?', 'bad'], ['무슨 말이지…', 'bad'], ['수군수군…', 'bad']] });
  // 3. 질문
  const ask = q >= 2 ? [['질문 있습니다!', 'call'], ['오… 그렇구나', 'soft']] : q === 1 ? [['……', 'soft'], ['콜록', 'soft']] : [['……', 'soft'], ['하암…', 'bad']];
  if (q >= 2 && z('fun') >= 0.6) ask.push(['하하하하!', 'big']);
  B.push({ cap: '질문', glow: 0.65, write: 1, L: ask });
  // 4. 중반: 못 가르칠수록 조는 학생이 는다
  B.push({ cap: '중반', glow: 0.6, write: 1, zz: q === 3 ? 0 : q === 2 ? 1 : q === 1 ? 2 : 3, L: q === 3 ? [['사각사각', 'soft'], ['필기할 게 너무 많아!', 'big']] : q === 2 ? [['사각사각', 'soft'], ['쿨…', 'soft']] : q === 1 ? [['쿨… 쿨…', 'bad'], ['하암…', 'soft']] : [['쿨… 쿨…', 'bad'], ['드르렁', 'bad'], ['언제 끝나…', 'bad']] });
  // 5. 마무리
  const end = q === 3 ? [['짝짝짝짝짝!!', 'big'], [talk ? '바로 등록할게요!!' : '수업 최고!!', 'big'], [`${hon}!!`, 'call']] : q === 2 ? [['감사합니다!!', 'big'], ['짝짝짝', 'soft']] : q === 1 ? [['수고하셨습니다', 'soft'], ['드르륵', 'soft']] : [['……', 'soft'], ['드르륵… 우르르', 'soft']];
  if (X.sub === 'last') end.push(['그동안 감사했습니다!!', 'big'], ['훌쩍…', 'soft']);
  B.push({ cap: '마무리', glow: q >= 2 ? 1 : 0.65, write: 1, zz: q === 0 ? 2 : 0, L: end });
  return B;
}
// 강의실 소품: 칠판(글씨는 write 때 써진다) · 간판 · 학생석(뒤통수, 조는 표시), 인강은 카메라 · 촬영 등
function liveClassProps(sp) {
  const X = sp.x || {}, ol = X.room === 'ol', rows = X.room === 'hall' ? 3 : 2, per = X.room === 'hall' ? 9 : 7;
  let h = `<div class="p-board">${[62, 78, 48, 70].map((w, i) => `<u style="width:${w}%;--d:${i * 0.35}s"></u>`).join('')}</div>` + (X.sign ? `<div class="p-sign">${U.esc(X.sign)}</div>` : '');
  if (ol) return `<div class="lv-props">${h}<i class="p-rec">REC</i><i class="p-cam l">🎥</i><i class="p-cam r">🎥</i></div>`;
  for (let r = 0; r < rows; r++) for (let c = 0; c < per; c++) {
    const sz = 34 + r * 10, x = (c + 0.5) * (100 / per) + (r % 2 ? 100 / per / 2 - 4 : 0);
    h += `<i class="p-stu" style="left:${x}%;bottom:${(rows - 1 - r) * 11 + 2}%;width:${sz}px;height:${sz}px"><b>💤</b></i>`;
  }
  return `<div class="lv-props">${h}</div>`;
}
// 한 달 진행 중에 생긴 수업 창: 볼 차례면 창으로, 아니면 기록만 남긴다 (o.quiet: 기록도 남기지 않는다. 학기마다 도는 수업)
function classShow(s, title, log, sp, o) {
  o = o || {};
  if (liveShow(sp)) queueEv(s, 'work_res', 0, { title, text: log, log: o.quiet ? '' : log, live: sp, boxes: o.boxes || null }, true);
  else if (!o.quiet) addLog(s, log, 'career');
}
// 세트장 소품 (그림 글자): 조명 · 카메라 · 슬레이트, 야외는 해 · 나무, 스튜디오는 ON AIR
function liveProps(sp) {
  if (sp.k === 'runway') return liveRunwayProps();
  if (sp.k === 'booth') return liveBoothProps(sp);
  if (sp.k === 'class') return liveClassProps(sp);
  if (sp.k !== 'set' && sp.k !== 'show') return '';
  const cam = '<i class="p-cam l">🎥</i><i class="p-cam r">🎥</i>';
  return `<div class="lv-props">` + (sp.vn === 'outdoor' ? '<i class="p-sun">☀️</i><i class="p-tree l">🌳</i><i class="p-tree r">🌲</i>' + cam + '<i class="p-clap">🎬</i>' : sp.vn === 'studio' ? '<i class="p-air">ON AIR</i>' + cam + '<i class="p-clap">🎬</i>' : '<i class="p-light l">💡</i><i class="p-light r">💡</i>' + cam + '<i class="p-clap">🎬</i>') + `</div>`;
}
// ───── 라이브 방송 플랫폼 (12-3): 버튜버 (회사 소속 버츄얼 아이돌 · 개인세 버튜버 모두) ─────
// 지어낸 플랫폼 이름과 대표 색 (사용자가 정함, 2026-11-11). 색은 style.css의 --pf-live · --pf-video와 같다
// live: 라이브 방송 플랫폼(치지직 감성) · video: 영상 플랫폼(유튜브 감성, 팝업은 아직 안 만듦)
const PF = { live: { n: '라이브온', c: '#B8F044' }, video: { n: '플리오', en: 'PLIO', c: '#FF914D' } };
// 왼쪽은 방송 화면(아바타 · LIVE · 시청자 수 · 후원 알림), 오른쪽은 채팅
// 여기서는 채팅이 곧 현장 반응이다. 줄 종류: chat(채팅) · don(후원) · del(매니저가 지운 채팅) · join(다른 방송인이 들어옴)
// sp.x = { sub: 방송 종류(debut · d3 · anniv · concert · endure · avatar 새 아바타 공개 · mile 구독자 기념 · grad 졸업 · collab 합방), co: 합방 상대, mgr: 매니저가 있는지(없으면 '삭제된 채팅'), subs: 구독자, nick: 팬들이 부르는 이름, mates: 들어올 방송인 이름들, d3 }. 요인: sk(방송 실력)
const LV_NICK = ['말랑콩', '새벽두시', '감자튀김', '구름빵', '민트초코', '별사탕', '야근러', '고양이집사', '무지개떡', '초코우유', '졸린곰', '라면물', '콩나물국', '월요병', '귤껍질', '도토리묵', '밤샘러', '솜사탕', '버스기사', '옥수수'];
const LV_CHAT = {
  hi: ['ㅎㅇ', '왔다!!', '하이~', '기다렸어ㅠㅠ', '오늘도 출석', '방송 켰다!!'],
  good: ['ㅋㅋㅋㅋㅋㅋㅋ', '개웃기네ㅋㅋㅋ', '이 사람 찐이다', '클립 따야 됨', '구독 박았다', '아 배 아파ㅋㅋㅋ', '오늘 폼 미쳤다'],
  mid: ['ㅋㅋ', '오', '귀엽다', 'ㅇㅇ', '그렇구나'],
  bad: ['…', '갑분싸', '음…', '오늘은 좀 조용하네', '채팅 느려졌다'],
  debut: ['데뷔 축하해!!', '목소리 뭐야 귀여워', '아바타 예쁘다', '첫 방송부터 본 사람 손', '떨지 마ㅋㅋ', '구독 눌렀어!'],
  d3: ['움직인다!!', '3D 미쳤다', '춤 춰 줘!!', '한 바퀴 돌아 봐', '와 진짜 사람 같아'],
  anniv: ['벌써 이만큼 왔네ㅠㅠ', '처음부터 봤다', '축하해!!', '굿즈 샀어', '앞으로도 오래 보자'],
  concert: ['♪♪♪', '8888888', '라이브 뭐야ㅠㅠ', '앵콜!!', '울고 있다', '야광봉 흔드는 중'],
  endure: ['아직도 해?ㅋㅋ', '자라 좀ㅋㅋ', '목 쉬었어ㅠ', '끝까지 본다', '출근했다 퇴근했는데 아직 방송 중', '화이팅!!'],
  avatar: ['새 아바타 미쳤다', '옷 예쁘다!!', '한 바퀴 돌아 봐', '머리 바뀌었네', '전 모습도 좋았는데 이것도 좋다', '캡처했다'],
  mile: ['축하해!!', '처음부터 봤다ㅠㅠ', '더 올라가자', '버튼 뜯는 것도 보여 줘', '여기까지 오다니', '내가 다 뿌듯하다'],
  grad: ['가지 마ㅠㅠ', '그동안 고마웠어', '잊지 않을게', '울고 있다ㅠㅠ', '어디서든 응원할게', '마지막까지 본다'],
  collab: ['둘이 케미 뭐야ㅋㅋ', '이 조합 찬성', '합방 자주 해 줘', '티키타카 미쳤다', '둘 다 귀엽다', '여기가 맛집이네'],
  don: ['축하해요!', '밥 사 먹어요', '오늘도 고마워요', '응원합니다!!', '목 관리 잘해요'],
};
function liveStream(sp, R, pk, z, lvl) {
  // 졸업 방송은 방송 실력과 상관없이 따뜻하게 보낸다
  const X = sp.x || {}, sub = X.sub || 'stream', sv = Math.max(lvl(z('sk')), sub === 'grad' ? 1 : 0), nick = X.nick || sp.cn || sp.g, B = [];
  // 한 장면 안에서는 같은 채팅 · 같은 닉네임이 겹치지 않게 뽑는다
  const used = {}, uniq = (arr, tag) => { const u = used[tag] = used[tag] || {}; let x = pk(arr); for (let i = 0; i < 8 && u[x]; i++) x = pk(arr); u[x] = 1; return x; };
  const nk = () => uniq(LV_NICK, 'nk'), ch = (pool, n) => Array.from({ length: n }, () => [uniq(LV_CHAT[pool], pool), 'chat', nk()]);
  const base = Math.max(12, Math.round((X.subs || 500) * (0.02 + 0.03 * R()) * (sub === 'debut' || sub === 'd3' || sub === 'concert' || sub === 'grad' ? 2.2 : sub === 'avatar' || sub === 'mile' ? 1.6 : sub === 'collab' ? 1.4 : 1)));
  // 후원 줄의 넷째 값은 금액(만 원): 방송 성과의 '방송 중 후원'을 셀 때 쓴다 (liveStreamStat)
  const don = (won) => [pk(LV_CHAT.don), 'don', `${nk()}님이 ${won}만 원 후원`, won];
  // 채팅을 지우는 사람: 매니저가 있으면 매니저, 혼자 하는 개인 방송이면 그냥 지워진 채팅
  const delT = X.mgr === false ? '삭제된 채팅입니다' : '매니저가 지운 채팅입니다';
  const tone = sv === 2 ? 'good' : sv === 1 ? 'mid' : 'bad', own = LV_CHAT[sub] ? sub : tone;
  // 1. 방송 시작
  B.push({ cap: '방송 시작', glow: 0.5, view: Math.round(base * 0.4), L: (X.co ? [[`${X.co}님과 합방을 시작합니다`, 'join', '']] : []).concat(ch('hi', X.co ? 2 : 3), [[`${nick} 하이~`, 'chat', nk()]]) });
  // 2. 본 방송: 그 방송만의 채팅 + 후원
  B.push({ cap: '본 방송', glow: 0.65, view: Math.round(base * (sv === 0 ? 0.6 : 0.9)), L: ch(own, 3).concat(sv >= 1 ? [don(pk([1, 1, 3, 5]))] : [], sub === 'grad' ? [] : ch(tone, 1)) });
  // 3. 다른 방송인이 들어온다 (동기 · 선배)
  if ((X.mates || []).length && sub !== 'endure' && sub !== 'collab') { const m = pk(X.mates); B.push({ cap: '손님', glow: 0.7, view: Math.round(base * 1.05), L: [[`${m}님이 들어왔습니다`, 'join', ''], [sub === 'grad' ? pk(['마지막이라 보러 왔어', '그동안 수고 많았어', '같이 방송해서 즐거웠어']) : pk(['응원하러 왔어!', '오 잘하는데~?', '나도 끼워 줘ㅋㅋ']), 'chat', m], ['헐 레이드!!', 'chat', nk()], [sub === 'grad' ? '다들 와 줬네ㅠㅠ' : 'ㅋㅋㅋㅋ 합방각', 'chat', nk()]] }); }
  // 4. 분위기: 잘 풀리면 채팅이 터지고, 아니면 매니저가 채팅을 지운다
  B.push({ cap: '중반', glow: sv === 2 ? 0.85 : 0.55, view: Math.round(base * (sv === 2 ? 1.35 : sv === 1 ? 1 : 0.5)), L: sub === 'grad' ? ch('grad', 3).concat([don(pk([5, 10, 30]))]) : sv === 2 ? ch('good', 4).concat([don(pk([5, 10, 10, 30]))]) : sv === 1 ? ch('mid', 2).concat(ch('good', 1), ch(own, 1)) : ch('bad', 2).concat([[delT, 'del', ''], [delT, 'del', '']], ch('mid', 1)) });
  // 5. 마무리
  const sc = sp.sc;
  B.push({ cap: '방송 끝', glow: sc >= 70 ? 1 : 0.6, view: Math.round(base * (sc >= 70 ? 1.5 : sc >= 50 ? 1 : 0.45)), L: (sub === 'grad' ? [don(pk([10, 30, 50])), ['그동안 고마웠어ㅠㅠ', 'chat', nk()], ['잘 가…', 'chat', nk()], [`${nick} 사랑해!!`, 'chat', nk()]] : sc >= 70 ? [don(pk([10, 30, 50])), ['오늘 레전드였다', 'chat', nk()], ['내일도 와!!', 'chat', nk()], [X.co ? '둘 다 수고했어!!' : `${nick} 수고했어!!`, 'chat', nk()]] : sc >= 50 ? [['수고했어~', 'chat', nk()], ['잘 봤어!', 'chat', nk()], ['ㅂㅂ', 'chat', nk()]] : [['ㅂㅂ', 'chat', nk()], ['다음엔 더 재밌게 해 줘', 'chat', nk()]]) });
  return B;
}
function liveStreamHTML(sp) {
  const X = sp.x || {};
  return `<div class="lv-top"><span class="lv-place st-logo">${PF.live.n}</span>${sp.t ? `<span class="lv-t">${U.esc(sp.t)}</span>` : ''}<span class="lv-g">${U.esc(sp.g)}</span></div>`
    + `<div class="st-wrap"><div class="st-video" id="lv-stage" style="--hue:${sp.hue};--glow:0.4"><span class="st-live">LIVE</span><span class="st-view">👁 <b id="st-view">0</b></span>${X.d3 ? '<span class="st-3d">3D</span>' : ''}`
    + `<div class="st-av lm${X.co ? ' duo' : ''}">${liveChar('vt/' + sp.g, sp.hue, 'vt/' + sp.g)}${X.co ? liveChar('vt/' + X.co, hashN('hue' + X.co) % 360, 'vt/' + X.co) : ''}</div><div class="st-don" id="st-don"></div></div>`
    + `<div class="st-chat"><div class="st-chat-h">채팅</div><div class="st-chat-b" id="st-chat"></div></div></div>`
    + `<div class="lv-bar"><i id="lv-bar"></i></div>`
    + `<div class="lv-btns"><button class="btn primary" data-liveskip>결과 바로 보기</button></div>`;
}
// ───── 방송 성과 (결과 창의 상자) ─────
// 방송 한 번의 숫자: 최고 시청자 수와 채팅에 뜬 후원 합계. 장면이 씨앗으로 정해지니 창을 안 봐도 같은 값이다
function liveStreamStat(sp) {
  if (!sp || sp.k !== 'stream') return null;
  const B = liveBeats(sp);
  return { peak: Math.max(...B.map(b => b.view || 0)), don: B.reduce((a, b) => a + b.L.reduce((x, e) => x + (e[1] === 'don' ? (e[3] || 0) : 0), 0), 0) * 1e4 };
}
// 방송 중 후원으로 실제 들어오는 돈: 채팅에 뜬 후원 + 시청자 수만큼의 소액 후원. cut: 회사 몫
function streamDon(sp, cut) { const st = liveStreamStat(sp); return st ? Math.round((st.don + st.peak * U.int(20, 60)) * (1 - (cut || 0)) / 1000) * 1000 : 0; }
// 결과 창에 놓을 상자 목록: 최고 시청자 · 방송 중 후원 · 구독자(팬) 증가 + 그 밖의 것(more: [[아이콘, 이름, 값]])
function streamBoxes(sp, o) {
  o = o || {};
  const st = liveStreamStat(sp), L = [];
  if (st) L.push(['👁', '최고 시청자', st.peak.toLocaleString() + '명']);
  if (o.don != null) L.push(['💰', o.donK || '방송 중 후원', fmtWon(o.don)]);
  if (o.gain != null) L.push(['📈', o.gainK || '구독자', o.gainAbs ? fmtFans(o.gain) : sgnFans(o.gain)]);
  return L.concat(o.more || []);
}
// 상자 하나에 숫자 하나 (글로 늘어놓지 않는다)
function stResHTML(L) { return L && L.length ? `<div class="st-res">${L.map(([ic, k, v]) => `<div class="st-rb"><div class="st-rk">${ic} ${U.esc(k)}</div><div class="st-rv">${U.esc(v)}</div></div>`).join('')}</div>` : ''; }
// 방송 하나를 결과 창으로: 후원을 받고(회사 몫 cut을 뗀다) 성과 상자와 함께 띄운다. 창을 볼 차례면 실시간 창이 먼저 뜬다
// o.noDon: 후원을 따로 치지 않는 방송(합방 등) · o.queue: 한 달 진행 중에 생긴 방송(볼 차례가 아니면 창 없이 기록만 남긴다) · 나머지는 streamBoxes로
function streamShow(s, job, cut, title, log, sp, o) {
  o = o || {};
  const don = o.noDon ? null : streamDon(sp, cut);
  if (don) earn(s, don, '방송 후원·멤버십', job);
  const d = { title, text: log, log: log + (don ? ` 방송 후원 ${fmtWon(don)}.` : ''), live: sp || null, boxes: streamBoxes(sp, Object.assign({}, o, don != null ? { don } : {})) };
  if (o.queue) { if (liveShow(d.live)) queueEv(s, 'work_res', 0, d, true); else addLog(s, d.log, 'career'); return ''; }
  if (s.pending) queueEv(s, 'work_res', 0, d, true); else fireEvent(s, 'work_res', d);
  return '';
}
// 채팅 한 줄 (후원은 방송 화면에도 잠깐 뜬다)
function liveChat(x, k, who) {
  const box = $('#st-chat');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'st-l ' + k;
  el.innerHTML = k === 'del' ? `<i>${U.esc(x)}</i>` : k === 'join' ? `<b>📢 ${U.esc(x)}</b>` : k === 'don' ? `<b>💰 ${U.esc(who)}</b><span>${U.esc(x)}</span>` : `<b style="color:hsl(${hashN(who) % 360} 70% 72%)">${U.esc(who)}</b><span>${U.esc(x)}</span>`;
  box.appendChild(el);
  while (box.children.length > 40) box.firstChild.remove();
  box.scrollTop = box.scrollHeight;
  if (k === 'don') { const d = $('#st-don'); if (d) { d.textContent = `💰 ${who}`; d.classList.remove('in'); void d.offsetWidth; d.classList.add('in'); } }
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
  for (const n of L) { const im = new Image(); im.onload = () => { CH.img[n] = im; if (++CH.n === L.length) { CH.ok = true; chPaintAll(); } }; im.onerror = () => { if (!im.dataset.retry) { im.dataset.retry = 1; im.src = `img/ch/${n}.png`; } }; im.src = (CH_PARTS.data || {})[n] || `img/ch/${n}.png`; }
}
function chHsl(h, s, l) { const a = s * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; }
// 부품 하나를 물들여 ctx에 얹는다. mode: 'fit'(옷 → 그룹 색) · 'hair'(머리색) · ''(그대로)
function chLayer(ctx, name, mode, arg) {
  const im = CH.img[name]; if (!im) return;
  if (!mode) { ctx.drawImage(im, 0, 0); return; }
  const c = CH.tmp || (CH.tmp = document.createElement('canvas')); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d', { willReadFrequently: true }); x.clearRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0);
  // 그림 칸을 읽지 못하는 곳(다른 주소에서 온 그림)에서는 물들이지 않고 그대로 그린다
  let D; try { D = x.getImageData(0, 0, c.width, c.height); } catch (e) { ctx.drawImage(im, 0, 0); return; }
  const d = D.data;
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
  // 아래 막대는 처음부터 끝까지 같은 속도로 찬다 (v130)
  const bar = $('#lv-bar'), tot = LIVE.B.reduce((a, b) => a + liveBeatMs(b), 0);
  if (bar) { bar.style.transition = `width ${tot}ms linear`; void bar.offsetWidth; bar.style.width = '100%'; }
  chLoad(); chPaintAll();
  liveNext();
}
function liveHTML(sp) {
  if (sp.k === 'stream') return liveStreamHTML(sp);
  const fan = U.clamp(((sp.z.fans || 0) + 1.5) / 3, 0, 1), n = 16 + Math.round(fan * 44);
  const sticks = Array.from({ length: n }, (_, i) => `<i style="--d:${(i * 0.137) % 1.2}s;--x:${(i * 37) % 100}%;--y:${(i * 53) % 100}%"></i>`).join('');
  const mem = sp.mem.length ? sp.mem : [[sp.g, '']];
  // 1위 발표 때만 보이는 다른 팀들 (무대 양옆)
  const oth = k => [0, 1, 2].map(i => `<span class="lm" style="--i:${i + k}">${liveChar('rival' + sp.seed + (i + k), (sp.hue + 90 + (k ? 110 : 0)) % 360, 'rival' + sp.seed + k)}</span>`).join('');
  return `<div class="lv-top"><span class="lv-place">${U.esc(sp.place)}</span>${sp.t ? `<span class="lv-t">「${U.esc(sp.t)}」</span>` : ''}<span class="lv-g">${U.esc(sp.g)}</span></div>`
    + `<div class="lv-stage${sp.vn ? ' vn-' + sp.vn : ''}${sp.k === 'set' || sp.k === 'show' || sp.k === 'runway' || sp.k === 'booth' || (sp.k === 'class' && (sp.x || {}).room === 'ol') ? ' mcon' : ''}${sp.k === 'class' ? ' rm-' + ((sp.x || {}).room || 'uni') : ''}" id="lv-stage" style="--hue:${sp.hue};--glow:0.3"><div class="lv-lights"><i></i><i></i><i></i><i></i></div>`
    + `<div class="lv-floor"></div><div class="lv-oth l">${oth(0)}</div><div class="lv-oth r">${oth(3)}</div>`
    + `<div class="lv-mem">${mem.map((m, i) => `<span class="lm${i === sp.mi ? ' me' : ''}" style="--i:${i}">${liveChar(sp.g + '/' + m[0] + i, sp.k === 'set' || sp.k === 'show' || sp.k === 'booth' ? (sp.hue + i * 67) % 360 : sp.hue, sp.k === 'set' || sp.k === 'show' || sp.k === 'booth' ? sp.g + i : sp.g)}<em>${sp.k === 'band' || sp.k === 'player' ? livePartIc(m[1]) + ' ' : ''}${U.esc(m[0])}</em></span>`).join('')}</div>`
    + `<div class="lv-conf">${Array.from({ length: 26 }, (_, i) => `<i style="left:${(i * 41) % 100}%;--d:${(i * 0.17) % 1.4}s;--c:${(i * 67) % 360}"></i>`).join('')}</div>`
    + liveProps(sp)
    + `<div class="lv-crowd">${sticks}</div><div class="lv-bub" id="lv-bub"></div><div class="lv-mc" id="lv-mc"></div></div>`
    + `<div class="lv-bar"><i id="lv-bar"></i></div>`
    + `<div class="lv-btns"><button class="btn primary" data-liveskip>결과 바로 보기</button></div>`;
}
function liveBeatMs(b) { return Math.max(1050, 300 + b.L.length * 260 + 350); }
function liveNext() {
  const L = LIVE;
  if (!L) return;
  L.i++;
  const st = $('#lv-stage');
  if (L.i >= L.B.length) { liveDone(); return; }
  const b = L.B[L.i];
  if (st) { st.style.setProperty('--glow', b.glow); st.classList.remove('fx-drum', 'fx-win'); if (b.fx) st.classList.add('fx-' + b.fx); st.classList.toggle('gather', !!b.gather); st.classList.toggle('lose', !!b.lose); if (b.clap) { st.classList.remove('clap'); void st.offsetWidth; st.classList.add('clap'); } if (b.walk != null) st.style.setProperty('--walk', b.walk); st.classList.toggle('fl1', b.flash === 1); st.classList.toggle('fl2', b.flash === 2); st.classList.toggle('rec', !!b.rec); st.classList.toggle('play', !!b.play); st.classList.toggle('wr', !!b.write); ['zz1', 'zz2', 'zz3'].forEach((c, i) => st.classList.toggle(c, b.zz === i + 1)); }
  if (b.view != null) { const v = $('#st-view'); if (v) v.textContent = b.view.toLocaleString(); }
  b.L.forEach((e, j) => L.tm.push(setTimeout(() => (L.sp.k === 'stream' ? liveChat(e[0], e[1], e[2]) : liveBubble(e[0], e[1])), 120 + j * 260)));
  L.tm.push(setTimeout(liveNext, liveBeatMs(b)));
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
  // 무대가 끝나고 1초 뒤에는 조명 · 캐릭터 · 응원봉이 멈춘다 (v128)
  if (LIVE) { LIVE.tm.push(setTimeout(() => { const st = $('#lv-stage'); if (st) st.classList.add('still'); }, 1000)); LIVE.tm.push(setTimeout(liveClose, 2000)); } // 멈춘 뒤 1초 있다가 저절로 넘어간다 (v129)
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
