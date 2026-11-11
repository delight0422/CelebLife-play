'use strict';
// ════════ 강사 (7-4단계, v83 개편) ════════
// 학원(현장 강의)과 인강은 우열이 아니라 취향 차이다 (2026-11-08 사용자 결정). 어느 쪽에서든 맨 위까지 갈 수 있다
//   학원: 수강생은 교실 크기만큼 · 한 사람당 버는 돈이 많다 · 수업을 안 한 달은 강의료가 없다 · 입소문(강의 평가 · 수능 결과)으로 큰다 · 들어가기 쉽다
//   인강: 수강생이 아주 많이 닿는다 · 한 사람당 버는 돈은 적다 · 매달 최저 보장금(저점이 높다) · 찍어 둔 강의는 계속 팔린다 · 오디션이 어렵다
// 회사 9곳: 학원 5곳(대형 2 · 중형 1 · 소형 2) + 인강 회사 4곳(대형 1 · 중형 2 · 소형 1). 크기마다 3곳
// 학원은 원장, 인강 회사는 담당 PD 한 명만 둔다 (js/work.js 회사 직원 규칙, 열쇠 'acad:이름' · 'ol:이름')
// 직업 활동 두 갈래:
//   자동으로 하는 일 (일정에 '강의' 칸만 넣어 두면): 수업(수강생 · 강의 평가 · 강의료), 12월 수능 결과
//   골라서 하는 일 (칸을 넣은 채로 직업 창에서): 교재 집필, 무료 특강·입시 설명회, 맛보기 강의 영상
// 학업 · 전달력 · 지능을 크게, 예능을 조금 본다. 영어 강사는 영어 특기를, 국어 강사는 작문도 본다
// 전국구 강사부터 예능 게스트, 몇 달짜리 고정 프로그램(연애 프로그램 등), 드라마 특별출연 제안이 온다

const TU_TIERS = ['새내기 강사', '무명 강사', '지역 강사', '전국구 강사', '인기 강사', '1타 강사', '스타 강사'];
const TU_POW = [0, 0.5, 1, 2, 3, 3.5, 4];
// 등급: 쌓인 점수(pts)와 수강생(학원 · 인강 따로)을 둘 다 넘어야 오른다
// 1타 강사는 그 과목에서 수강생이 가장 많은 강사, 스타 강사는 일반 사람들도 아는 강사 (인지도 TU_FAME 이상 + 전달력 52 이상)
const TU_UP = { pts: [0, 1, 3, 8, 16, 26, 85], tal: 'verbal', min: 52 };
const TU_STU = { acad: [0, 15, 40, 120, 400, 1500, 1500], ol: [0, 300, 1500, 6000, 2.5e4, 1e5, 1e5] };
const TU_FAME = 60;
// 과목마다 보는 특기 (무게)
// v96: 사회탐구는 학업 0.6 + 통찰력(재능) 0.4
const TU_SUBJ = { 국어: { study: 0.7, script: 0.3 }, 수학: { study: 1 }, 영어: { en: 0.6, study: 0.4 }, 사회탐구: { study: 0.6, insight: 0.4 }, 과학탐구: { study: 1 } };
const TU_SUBJ_IDS = Object.keys(TU_SUBJ);
const TU_COS = [
  { n: '대치 수석학원', kind: 'acad', tier: 3, con: '최상위권 입시' }, { n: '정점입시학원', kind: 'acad', tier: 3, con: '재수 종합반' },
  { n: '목동 새길학원', kind: 'acad', tier: 2, con: '내신·수능' },
  { n: '별빛보습학원', kind: 'acad', tier: 1, con: '동네 보습' }, { n: '푸른솔교습소', kind: 'acad', tier: 1, con: '소수 정예' },
  { n: '에듀피크', kind: 'ol', tier: 3, con: '수능 전 과목' },
  { n: '수능마루', kind: 'ol', tier: 2, con: '무제한 패스' }, { n: '오늘의 강의', kind: 'ol', tier: 2, con: '모바일 인강' },
  { n: '열공티비', kind: 'ol', tier: 1, con: '단과 위주' },
];
const TU_ACADS = TU_COS.filter(x => x.kind === 'acad'), TU_OLS = TU_COS.filter(x => x.kind === 'ol');
const TU_KIND_N = { acad: '학원', ol: '인강 회사' };
function tuPlace(t) { return TU_COS.find(x => x.n === t.co) || { n: t.co, kind: t.mode, tier: t.coT || 1, con: '' }; }
const TU_FEE = [0, 25, 32, 40]; // 학원 한 달 수강료 (만 원, 학원 크기별)
const TU_CAP = [0, 150, 500, 3500]; // 학원에서 닿을 수 있는 수강생 (교실 크기, 학원 크기별)
const TU_SHARE = 0.4; // 학원 강사 몫 (비율제)
const TU_MIN = 100e4; // 학원 강사 최저 강의료
const TU_OL_FEE = 1e4; // 인강 수강생 한 명이 한 달에 내는 돈
const TU_OL_SHARE = [0, 0.2, 0.25, 0.3]; // 인강 강사 몫 (회사 크기별)
const TU_OL_MG = [0, 150e4, 300e4, 500e4]; // 인강 매달 최저 보장금 (회사 크기별)

function tuSubLv(s, subj) { const p = me(s), W = TU_SUBJ[subj] || TU_SUBJ.수학; return Object.keys(W).reduce((a, k) => a + skOrTal(p, k) * W[k], 0); }
function tuMainSk(subj) { return subj === '영어' ? 'en' : 'study'; }
// 강의 점수 (v95): 과목 실력 · 학업 · 교육(모두 강함, 과목 실력이 학업뿐이면 한 번만) + 과목 숙련도. 0.9배 + 8: 예전 점수 크기와 비슷하게
function tuScore(s, t) { const p = me(s), L = [[tuSubLv(s, t.subj), JS_], [lv(p, 'edu'), JS_]]; if (Object.keys(TU_SUBJ[t.subj] || {}).some(k => k !== 'study')) L.push([lv(p, 'study'), JS_]); return 0.9 * jobMix(L) + 8 + aniMBonus(s, 'tum', t.subj); }
function tuMBars(s) { return TU_SUBJ_IDS.filter(k => aniMGet(s, 'tum', k) >= 1).map(k => ({ n: k, v: aniMGet(s, 'tum', k) })); }
// 수강생이 닿을 수 있는 수. 같은 실력이면 학원과 인강에서 같은 등급 근처에 닿는다
//   학원: 입소문(강의 평가)을 크게 보고, 교실 크기(TU_CAP)를 넘지 못한다
//   인강: 스타성을 조금 보고, 20만 명까지
function tuE(s, t) { return tuScore(s, t) - (s.stigma || 0) * 0.3 + TU_POW[t.tier] + t.coT * 2 + (t.mode === 'ol' ? (t.rep - 50) * 0.1 + (me(s).tal.star - 50) * 0.1 : (t.rep - 50) * 0.2); }
function tuTarget(s, t) { const e = tuE(s, t); return Math.round(t.mode === 'ol' ? Math.min(2e5, Math.pow(10, (e + 5) / 18)) : Math.min(TU_CAP[t.coT], Math.pow(10, (e - 12.9) / 22.7))); }
// 특강 · 영상 · 수능으로 는 수강생은 닿을 수 있는 높이의 1.3배까지만
function tuAdd(s, t, add) { return Math.max(t.stu, Math.min(t.stu + add, Math.round(tuTarget(s, t) * 1.3))); }
function tuPay(s, t) { return t.mode === 'ol' ? Math.max(TU_OL_MG[t.coT], Math.round(t.stu * TU_OL_FEE * TU_OL_SHARE[t.coT] / 1e4) * 1e4) : Math.max(TU_MIN, Math.round(t.stu * TU_FEE[t.coT] * 1e4 * TU_SHARE / 1e4) * 1e4); }
function tuStuNeed(t, k) { return TU_STU[t.mode === 'ol' ? 'ol' : 'acad'][k]; }
function tuTierUp(s, t) { return aniTierUp(s, t, TU_UP, TU_TIERS, k => t.stu >= tuStuNeed(t, k) && (k < 6 || (s.fame || 0) >= TU_FAME)); }
function tuOn(s) { return trackOn(s, 'tutor'); }
function tuStart(s, o) {
  const old = s.tracks.tutor;
  const t = s.tracks.tutor = Object.assign({ st: 'active', mode: 'acad', co: '', coT: 1, subj: '수학', months: 0, tier: old.tier || 0, pts: old.pts || 0, stu: 5, rep: 50, cEnd: 0, books: old.books || [], book: null, tv: null, cd: {}, hist: old.hist || [] }, o);
  if (t.mode === 'ol') { t.cEnd = 36; t.stu = 200; }
  if (!has(me(s), 'edu')) learnMe(s, 'edu', null, false, true);
  coMeetJob(s, 'tutor');
  if (!old.months && !(old.hist || []).length) milestone(s, `${age(s)}세에 ${t.co} ${t.subj} 강사가 되었다.`);
  return t;
}
// 다른 학원 · 인강 회사로 옮긴다. 학원 ↔ 인강은 수강생 규모가 달라서 거의 새로 모은다 (따라오는 사람도 있다)
function tuMove(s, d) {
  const t = s.tracks.tutor, was = t.co, from = t.mode, kind = d.kind || 'ol';
  Object.assign(t, { mode: kind, co: d.co, coT: d.coT, cEnd: kind === 'ol' ? t.months + 36 : 0 });
  t.stu = from !== kind ? Math.max(kind === 'ol' ? 200 : 10, Math.round(tuTarget(s, t) * 0.3)) : kind === 'ol' ? Math.round(t.stu * 1.05) : Math.max(Math.round(t.stu * 0.6), Math.round(tuTarget(s, t) * 0.3));
  if (d.sign) earn(s, d.sign, '인강 계약금', 'tutor');
  coMeetJob(s, 'tutor');
  if (from !== kind) milestone(s, `${age(s)}세에 ${kind === 'ol' ? `${d.co} 인강 강사가 되었다` : `${josa(d.co, '으로')} 옮겨 현장 강의를 시작했다`}.`);
  return `${josa(was, '을를')} 떠나 ${josa(d.co, '으로')} 옮겼다.${kind === 'ol' ? `${d.sign ? ` 계약금 ${fmtWon(d.sign)}.` : ''} 계약 3년.` : ' 따라온 수강생도 있다.'}`;
}
function tuBookTitle(subj) { return freshName(() => `${subj} ${U.pick(['개념', '기출', 'N제', '파이널', '필기 노트', '실전 모의고사'])} ${U.pick(['완성', '정복', '끝장', '바이블', '마스터', '한 권'])}`); }
function tuTerms(kind, coT) { return kind === 'ol' ? `매달 최저 ${fmtWon(TU_OL_MG[coT])} 보장 · 강의 수익의 ${Math.round(TU_OL_SHARE[coT] * 100)}% · 계약 3년` : `수강료 ${TU_FEE[coT]}만 원의 ${Math.round(TU_SHARE * 100)}%`; }

CAREERS.tutor = {
  n: '강사', ic: '👩‍🏫', auto: true,
  desc: '수능 과목을 가르친다. 학원에서 현장 강의를 하든 인강을 찍든 맨 위까지 갈 수 있다. 과목 실력 · 학업 · 교육이 중요하다. 유명해지면 방송에서도 찾는다.',
  act: { n: '강의 (수업·수강생 관리)', ic: '👩‍🏫', g: '직업 활동', eff: [['과목 실력', '↑', 1], ['교육', '↑', 1], ['스트레스', '↑', 0]] },
  autoList(s, t) {
    return [
      { ic: '📚', n: '수업', eff: '수강생 · 강의 평가 · 강의료' },
      { ic: '📝', n: '수능 결과 (12월)', eff: '수강생 성적 · 평판', tag: false },
    ].concat(t.book ? [{ ic: '📖', n: `「${t.book.title}」 집필`, eff: `${t.book.prog}/${t.book.need}개월` }] : [], t.tv ? [{ ic: '📺', n: `${t.tv.bc} 「${t.tv.title}」 고정 출연`, eff: `${t.tv.left}개월 남음 · 매달 ${fmtWon(t.tv.fee)}` }] : []);
  },
  picks(s, t) {
    if (t.st !== 'active') return [];
    const cd = k => (t.cd[k] || 0) > s.t;
    return [
      { t: '📖 교재 집필', h: t.book ? `「${t.book.title}」 쓰는 중` : '6개월 동안 쓴다 · 다 쓰면 교재가 팔린다', ok: !t.book && !cd('book'), why: t.book ? '이미 쓰는 교재가 있다' : '교재를 낸 지 얼마 안 됐다', run: s => tuBookStart(s, t) },
      { t: '🎤 무료 특강·입시 설명회', h: '수강생이 는다 · 스트레스 ↑', ok: !cd('talk'), why: '얼마 전에 했다', run: s => tuTalk(s, t) },
      { t: '🎬 맛보기 강의 영상', h: '플리오·SNS에 올린다 · 인지도 ↑', ok: !cd('vid'), why: '얼마 전에 올렸다', run: s => tuVid(s, t) },
    ];
  },
  status(s, t) { return t.st !== 'active' ? (t.endNote || '') : `${TU_TIERS[t.tier]} · ${t.co} ${t.subj} · 수강생 ${fmtFans(t.stu)} · 강의 평가 ${Math.round(t.rep)}`; },
  short(s, t) { return `${t.subj} 강사`; },
  seg(s, t) { return `${t.co} ${t.subj} 강사`; },
  title(s, t) { return t.months ? TU_TIERS[t.tier] : null; },
  emp: true,
  cLeft(s, t) { return t.st === 'active' && t.mode === 'ol' && t.cEnd ? t.cEnd - t.months : null; },
  mainSk(s, t) { return tuMainSk(t && t.subj); },
  info(s, t) {
    const pl = tuPlace(t);
    const R = [['등급', TU_TIERS[t.tier]], ['일하는 곳', `${t.co} (${TIER_N[t.coT]} ${TU_KIND_N[t.mode]} · ${pl.con})`], ['과목', t.subj], ['수강생', fmtFans(t.stu)], ['강의 평가', `${Math.round(t.rep)}`], ['조건', tuTerms(t.mode, t.coT)], ['지난달 강의료', fmtWon(tuPay(s, t))]];
    if (t.books.length) R.push({ h: '낸 교재', items: t.books.slice(-6).reverse().map(b => `${b.y} 「${b.title}」 · ${b.note}`) });
    R.push({ h: '과목 숙련도', bars: tuMBars(s) });
    return R;
  },
  actions(s, t) {
    if (t.st !== 'active') return [];
    return [{ t: '강사 일 그만두기', ok: true, danger: true, confirm: '정말 강사 일을 그만둘까요?', run: s => { tuEnd(s, t, '그만둠'); return `${josa(t.co, '을를')} 떠났다. 강사 일을 그만뒀다.`; } }];
  },
  monthly(s, t) { tuMonth(s, t); },
};
function tuEnd(s, t, why) { t.st = 'ended'; t.endNote = `${TU_TIERS[t.tier]} · ${t.co} ${t.subj} (${why})`; t.hist.push(t.endNote); t.tv = null; }

// ───── 실시간 창 (12-3): 강의실 ─────
// 학원은 교실(acad), 인강은 촬영 스튜디오(ol), 입시 설명회는 큰 강의실(hall). sub: first 첫 수업 · term 개강 수업 · talk 특강
function tuClass(s, t, sub, o) {
  o = o || {};
  if (typeof liveStage !== 'function') return null;
  const ol = t.mode === 'ol', nm = me(s).name, base = o.sc != null ? o.sc : (sub === 'first' ? tuScore(s, t) * 1.2 : t.rep) + U.normal(0, 5);
  return liveStage({ k: 'class', vn: 'class', place: ol ? '인강 촬영' : sub === 'talk' ? '입시 설명회' : '강의실', t: `${t.co} ${t.subj}`, g: nm, mem: [[nm, '']], mi: 0, key: o.key !== false, sc: U.clamp(base, 0, 100), z: { fun: (me(s).tal.verbal - 50) / 15 }, x: { room: ol ? 'ol' : sub === 'talk' ? 'hall' : 'acad', sub, sign: t.co } });
}
function tuClassBoxes(s, t) { return [['🧑‍🎓', '수강생', fmtFans(t.stu)], ['📝', '강의 평가', `${Math.round(t.rep)}`]]; }
// ───── 한 달 (자동으로 하는 일) ─────
function tuMonth(s, t) {
  if (t.st !== 'active') return;
  t.months++;
  const n = slotsOn(s, 'c_tutor'), p = me(s), ol = t.mode === 'ol';
  if (n) {
    for (const [k, w] of Object.entries(TU_SUBJ[t.subj])) if (has(p, k)) practice(s, p, k, 0.5 * n * w);
    practice(s, p, 'edu', 0.6 * n);
    addStress(s, ol ? 1.8 : 1.5);
    aniMGain(s, 'tum', t.subj, 0.5);
    t.rep = U.clamp(t.rep + (tuScore(s, t) * 1.2 + U.normal(0, 6) - t.rep) * 0.06, 0, 100);
    const tg = tuTarget(s, t), b = t.stu;
    t.stu = Math.max(0, Math.round(t.stu + (tg - t.stu) * U.fl(ol ? 0.03 : 0.05, ol ? 0.07 : 0.1)));
    if (t.stu > b) s.fans.kr += Math.round((t.stu - b) * (ol ? 0.05 : 0.3) * myRoom(s, 'kr'));
    if (t.book && ++t.book.prog >= t.book.need) tuBookDone(s, t);
    // 강의실 창: 첫 수업은 '중요할 때만'에서도, 해마다 3월 개강 수업은 '매번'일 때만
    if (typeof classShow === 'function') {
      // (예전 세이브에서 이미 오래 가르친 사람은 첫 수업 창을 띄우지 않는다)
      if (!t.cls1) { t.cls1 = 1; if (t.months <= 2) classShow(s, '첫 수업', `${t.co}에서 ${t.subj} 첫 수업을 했다.`, tuClass(s, t, 'first'), { boxes: tuClassBoxes(s, t) }); }
      else if (calM(s) === 2) classShow(s, '개강', `${t.co} ${t.subj} 새 학기 수업을 시작했다.`, tuClass(s, t, 'term', { key: false }), { quiet: true, boxes: tuClassBoxes(s, t) });
    }
  } else {
    t.stu = Math.round(t.stu * (ol ? 0.97 : 0.9));
    t.rep = Math.max(0, t.rep - 1);
  }
  // 학원은 수업을 한 달만 강의료를 받고, 인강은 찍어 둔 강의가 계속 팔린다 (최저 보장금도 있다)
  if (n || ol) earn(s, tuPay(s, t), ol ? '인강 수익' : '학원 강의료', 'tutor');
  // 낸 교재: 수강생이 사 간다 (인세). 학원 수강생은 거의 다 사고, 인강 수강생은 일부만 산다
  const buy = ol ? 0.08 : 0.9;
  const roy = t.books.reduce((a, b) => a + t.stu * buy * U.clamp(b.q / 100, 0.1, 0.9) * 1500 * Math.max(0.3, 1 - (calY(s) - b.y) * 0.15), 0);
  if (roy >= 1e4) earn(s, Math.round(roy / 1e4) * 1e4, '교재 인세', 'tutor');
  // 몇 달짜리 고정 프로그램
  if (t.tv) { earn(s, t.tv.fee, '강사 방송 출연료', 'tutor'); addFame(s, 0.4); s.fans.kr += Math.round(800 * myRoom(s, 'kr')); if (--t.tv.left <= 0) { addLog(s, `${t.tv.bc} 「${t.tv.title}」 마지막 회를 찍었다.`, 'career'); t.tv = null; } }
  if (calM(s) === 11 && t.months >= 6 && !hasQ(s, 'tu_sat')) queueEv(s, 'tu_sat', 0);
  if (ol && t.cEnd && t.months >= t.cEnd && !hasQ(s, 'tu_renew')) queueEv(s, 'tu_renew', 0);
  // 이름이 알려지면 다른 학원 · 인강 회사에서 연락이 온다
  if (t.tier >= 2 && U.chance(0.015) && !s.inbox.some(m => m.kind === 'tu_ol')) tuOffer(s, t);
  // 방송 제안 (전국구 강사부터, 학원 · 인강 모두)
  if (n && t.tier >= 3 && !s.army && !s.pending) {
    if (U.chance(0.006 * (t.tier - 2))) queueEv(s, 'tu_tv', 0);
    else if (t.tier >= 4 && !t.tv && U.chance(0.004)) queueEv(s, 'tu_fix', 0);
    else if (t.tier >= 4 && U.chance(0.003)) queueEv(s, 'tu_cameo', 0);
  }
  const up = tuTierUp(s, t); if (up) addLog(s, up, 'good');
}

// ───── 골라서 하는 일 ─────
function tuBookStart(s, t) { t.book = { title: tuBookTitle(t.subj), prog: 0, need: 6 }; return `${t.subj} 교재 ${josa(`「${t.book.title}」`, '을를')} 쓰기 시작했다.`; }
function tuBookDone(s, t) {
  const b = t.book; t.book = null; t.cd.book = s.t + 12;
  const q = Math.round(U.clamp(tuScore(s, t) + lv(me(s), 'script') * 0.15 + U.normal(0, 7), 5, 99));
  const k = q >= 58 ? 2 : q >= 46 ? 1 : 0;
  t.pts += k; aniMGain(s, 'tum', t.subj, 3);
  const note = k === 2 ? '베스트셀러' : k ? '꾸준히 팔림' : '반응 없음';
  t.books.push({ title: b.title, q, y: calY(s), note });
  addWork(s, { type: '교재', title: b.title, sc: q, note });
  const up = tuTierUp(s, t);
  const x = `${t.subj} 교재 ${josa(`「${b.title}」`, '이가')} 나왔다. ${k === 2 ? '수험생 사이에서 필독서로 불리며 서점 순위에 올랐다.' : k ? '수강생들이 꾸준히 사 간다.' : '생각보다 찾는 사람이 적다.'}`;
  return showResult(s, `교재 「${b.title}」`, x + (up ? `\n\n${up}` : ''), x + (up ? ` ${up}` : ''));
}
function tuTalk(s, t) {
  t.cd.talk = s.t + 3;
  const good = U.chance(U.sig((tuScore(s, t) + lv(me(s), 'variety') * 0.2 - 42) / 6));
  const add = Math.round(t.stu * (good ? 0.08 : 0.02) + (good ? 20 : 5));
  t.stu = tuAdd(s, t, add); if (good) t.pts += 0.5;
  addStress(s, 4);
  const x = `${t.mode === 'ol' ? '온라인 무료 특강' : '입시 설명회'}를 열었다. ${good ? '자리가 꽉 찼고, 끝나고 수강 신청이 몰렸다.' : '자리가 듬성듬성했다.'} (수강생 +${fmtFans(add)})` + fx(s, { fame: good ? 1 : 0 });
  const up = tuTierUp(s, t);
  // 특강도 강의실 창으로: '중요할 때만'에서는 첫 특강과 등급이 오른 특강만
  const first = !t.talks; t.talks = (t.talks || 0) + 1;
  return showResult(s, '무료 특강', x + (up ? `\n\n${up}` : ''), x + (up ? ` ${up}` : ''), tuClass(s, t, 'talk', { sc: good ? U.int(62, 88) : U.int(30, 52), key: first || !!up }));
}
function tuVid(s, t) {
  t.cd.vid = s.t + 3;
  const p = me(s), sc = tuScore(s, t) * 0.6 + lv(p, 'variety') * 0.4 + (p.tal.star - 50) * 0.2;
  const good = U.chance(U.sig((sc - 30) / 6)), big = good && U.chance(0.12);
  const add = Math.round(t.stu * (big ? 0.15 : good ? 0.04 : 0.01) + (good ? 10 : 2));
  t.stu = tuAdd(s, t, add); if (big) t.pts += 1;
  const x = `맛보기 강의 영상을 올렸다. ${big ? "명언 같은 한마디가 밈이 되어 여기저기 퍼졌다. '그 강사 누구냐'는 말이 돈다." : good ? '조회수가 꽤 나왔다.' : '조회수가 별로 안 나왔다.'} (수강생 +${fmtFans(add)})` + fx(s, { fame: big ? 4 : good ? 1 : 0, fkr: Math.round((big ? 2e4 : good ? 1500 : 0) * (1 + TU_POW[t.tier] * 0.5) * myRoom(s, 'kr')) });
  const up = tuTierUp(s, t);
  const plio = typeof plioSpec === 'function' ? plioSpec({ k: 'clip', t: `${t.subj} 맛보기 강의`, ch: `${me(s).name} ${t.subj}`, me: me(s).name, sc: big ? 90 : good ? 68 : 40, rv: big ? 2 : good ? 1 : 0, vw: (t.stu * 3 + 2000) * (big ? 30 : good ? 3 : 0.5) }) : null;
  return showResult(s, '맛보기 강의 영상', x + (up ? `\n\n${up}` : ''), x + (up ? ` ${up}` : ''), null, null, plio);
}

// ───── 지원: 학원 3줄 + 인강 회사 3줄 (처음에도, 일하는 중에도) ─────
// 인강 회사 오디션은 합격선이 더 높다
const TU_THR = { acad: [0, 16, 26, 36], ol: [0, 24, 34, 44] };
function tuBestSubj(s) { return TU_SUBJ_IDS.slice().sort((a, b) => tuSubLv(s, b) - tuSubLv(s, a))[0]; }
// v99 (8-5): 트레이너 계열처럼 특기로만 면접을 본다 (전달력 뺌)
function tuApplySc(s) { const p = me(s), t = s.tracks.tutor || {}, on = tuOn(s); return (on ? tuSubLv(s, t.subj) : tuSubLv(s, tuBestSubj(s))) * 0.5 + lv(p, 'edu') * 0.3 + (uniDone(s) ? 4 : 0) + TU_POW[t.tier || 0] * 3 + (on ? (t.rep - 50) * 0.1 : 0); }
function tuSign(s, coT) { return Math.round((300 + coT * 400) * (1 + TU_POW[(s.tracks.tutor || {}).tier || 0] * 0.5)) * 1e4; }
function tuCands(s, kind, tier) { const t = s.tracks.tutor || {}; return TU_COS.filter(x => x.kind === kind && x.tier === tier && !(tuOn(s) && x.n === t.co)); }
for (const kind of ['acad', 'ol']) for (const tier of [3, 2, 1]) JOB_APPLY.push({
  id: (kind === 'ol' ? 'tutor_ol' : 'tutor_') + tier, trk: 'tutor', g: '👩‍🏫 강사', n: kind === 'ol' ? `${TIER_N[tier]} 인강 회사 오디션` : `${TIER_N[tier]} 학원 강사 지원`, tag: tuTerms(kind, tier),
  show: s => (tuOn(s) || age(s) >= 20) && tuCands(s, kind, tier).length > 0,
  h: s => `합격 가능성 ${fmtPct(audP(tuApplySc(s), TU_THR[kind][tier]))} · 결과는 다음 달${tuOn(s) ? ` · 붙으면 ${kind === 'ol' ? '인강 회사로' : '학원을'} 옮긴다` : ''}`,
  ok: s => !s.army && tuSubLv(s, tuOn(s) ? s.tracks.tutor.subj : tuBestSubj(s)) >= 25 && !hasQ(s, 'tu_res') && !(s.cd['tu' + kind + tier] > s.t),
  why: s => s.army ? '군 복무 중' : tuSubLv(s, tuOn(s) ? s.tracks.tutor.subj : tuBestSubj(s)) < 25 ? '가르칠 과목 실력(학업·영어)이 25레벨 이상이어야 한다' : hasQ(s, 'tu_res') ? '결과를 기다리는 중' : '얼마 전에 지원했다',
  run: s => { s.cd['tu' + kind + tier] = s.t + 6; const c = U.pick(tuCands(s, kind, tier)); queueEv(s, 'tu_res', 1, { co: c.n, kind, coT: tier, p: audP(tuApplySc(s), TU_THR[kind][tier]) }); return kind === 'ol' ? `${c.n} 인강 오디션을 봤다. 시범 강의를 찍었다.` : `${c.n} 강사 모집에 지원했다.`; },
});
// 채용 결과 (예전 세이브의 인강 오디션 결과 'tu_ol_res'도 같은 방식으로 받는다)
function tuResEv(id, kind0) {
  E({
    id, cat: '채용', title: (s, d) => (d.kind || kind0) === 'ol' ? '인강 오디션 결과' : '학원 강사 채용 결과', tag: 'career',
    init(s, d) { d.kind = d.kind || kind0; d.pass = U.chance(d.p); if (d.kind === 'ol') d.sign = tuSign(s, d.coT); },
    text: (s, d) => d.pass ? `${d.co}에서 ${d.kind === 'ol' ? '함께 인강을 찍자고' : '강사로 와 달라고'} 한다! ${tuTerms(d.kind, d.coT)}${d.sign ? ` · 계약금 ${fmtWon(d.sign)}` : ''}.${tuOn(s) ? ` ${s.tracks.tutor.subj} 수업을 맡긴다.` : ' 어느 과목을 맡을까?'}` : `${d.co} ${d.kind === 'ol' ? '인강 오디션' : '강사 모집'}에 떨어졌다.`,
    ch: (s, d) => !d.pass ? [{ t: '확인', f: () => `${d.co} ${d.kind === 'ol' ? '인강 오디션' : '강사 모집'}에 떨어졌다.` + fx(s, { stress: 2 }) }]
      : tuOn(s) ? [{ t: '옮긴다', f: s => tuMove(s, d) }, { t: '남는다', f: () => `${d.co}의 제안을 거절했다.` }]
      : TU_SUBJ_IDS.slice().sort((a, b) => tuSubLv(s, b) - tuSubLv(s, a)).map(k => ({ t: k, nj: 'tutor', h: `과목 실력 ${Math.floor(tuSubLv(s, k))}레벨`, f: s => { if (tuOn(s)) return ''; tuStart(s, { mode: d.kind, co: d.co, coT: d.coT, subj: k }); if (d.sign) earn(s, d.sign, '인강 계약금', 'tutor'); return `${d.co} ${k} 강사가 되었다.${d.sign ? ` 계약금 ${fmtWon(d.sign)}.` : ''}`; } })).concat([{ t: '거절한다', f: () => '강사 자리를 거절했다.' }]),
  });
}
tuResEv('tu_res', 'acad');
tuResEv('tu_ol_res', 'ol');
// 연락: 다른 학원 원장이나 인강 회사에서 데려가려고 한다 (학원 ↔ 인강 양쪽)
function tuOffer(s, t) {
  // 같은 종류면 더 큰 곳, 다른 종류면 같은 크기 이상에서만 연락이 온다
  const all = TU_COS.filter(x => x.kind === t.mode ? x.tier > t.coT : x.tier >= t.coT), same = all.filter(x => x.kind === t.mode);
  const L = same.length && U.chance(0.7) ? same : all;
  if (!L.length) return;
  const c = U.pick(L);
  sendMsg(s, 'tu_ol', { from: c.n, title: c.kind === 'ol' ? '인강 계약 제안' : '학원 강사 제안', months: 3, d: { co: c.n, kind: c.kind, coT: c.tier, sign: c.kind === 'ol' ? tuSign(s, c.tier) : 0 } });
}
INBOX.tu_ol = {
  ic: '👩‍🏫',
  text: (s, m) => { const k = m.d.kind || 'ol'; return `${m.from}에서 ${k === 'ol' ? '인강을 찍자는' : '우리 학원에서 가르쳐 달라는'} 연락이 왔다. ${tuTerms(k, m.d.coT)}${m.d.sign ? ` · 계약금 ${fmtWon(m.d.sign)}` : ''}.`; },
  ch: (s, m) => [
    { t: '옮긴다', ok: s => tuOn(s) && s.tracks.tutor.co !== m.d.co, h: tuOn(s) ? '' : '지금은 강사 일을 하지 않는다', f: s => tuMove(s, m.d) },
    { t: '거절한다', f: () => `${m.from}의 제안을 거절했다.` },
  ],
};
// 인강 계약 만료: 강의 매출이 최저 보장금의 1.5배를 넘으면 재계약을 제안한다. 아니면 학원으로 옮기거나 그만둔다
E({
  id: 'tu_renew', cat: '계약', title: '인강 계약 만료', tag: 'career',
  cond: s => tuOn(s) && s.tracks.tutor.mode === 'ol',
  init(s, d) { const t = s.tracks.tutor; d.ok = t.stu * TU_OL_FEE >= TU_OL_MG[t.coT] * 1.5; d.sign = Math.round(tuSign(s, t.coT) * 0.6 / 1e4) * 1e4; },
  text: (s, d) => { const t = s.tracks.tutor; return `${josa(t.co, '과와')}의 계약이 끝났다. 수강생 ${fmtFans(t.stu)}.${d.ok ? ` 회사는 재계약을 원한다. 재계약금 ${fmtWon(d.sign)}.` : ' 회사는 재계약을 원하지 않는다.'}`; },
  ch: (s, d) => {
    const t = s.tracks.tutor, a = U.pick(TU_ACADS.filter(x => x.tier <= Math.max(2, t.coT)));
    const back = { t: '학원으로 옮긴다', h: `${a.n} · ${tuTerms('acad', a.tier)}`, f: s => tuMove(s, { co: a.n, kind: 'acad', coT: a.tier }) };
    const quit = { t: '강사 일을 그만둔다', f: s => { tuEnd(s, t, '계약 만료'); return '강사 일을 그만뒀다.'; } };
    return d.ok ? [{ t: '재계약한다', h: '3년', f: s => { t.cEnd = t.months + 36; earn(s, d.sign, '인강 계약금', 'tutor'); return `${josa(t.co, '과와')} 재계약했다.`; } }, back, quit] : [back, quit];
  },
});

// ───── 자동으로 오는 일 ─────
// 12월: 수능 결과. 학원은 입소문이 커서 수강생이 더 많이 오르내린다
E({
  id: 'tu_sat', cat: '수능', title: '수능 결과', tag: 'career',
  cond: s => tuOn(s),
  init(s, d) {
    const t = s.tracks.tutor, q = tuScore(s, t) + U.normal(0, 8), bar = 40 + TU_POW[t.tier] * 3, w = t.mode === 'ol' ? 0.05 : 0.1;
    d.k = q >= bar + 10 ? 2 : q >= bar ? 1 : q < bar - 10 ? -1 : 0;
    t.pts += Math.max(0, d.k); t.rep = U.clamp(t.rep + d.k * (t.mode === 'ol' ? 3 : 5), 0, 100);
    t.stu = d.k > 0 ? tuAdd(s, t, Math.round(t.stu * d.k * w)) : Math.round(t.stu * (1 + d.k * w));
    if (d.k === 2) addFame(s, 1);
    d.up = tuTierUp(s, t);
  },
  text: (s, d) => { const t = s.tracks.tutor; return `올해 수능 결과가 나왔다. ${d.k === 2 ? `내 수강생들이 ${t.subj}에서 만점을 쏟아냈다. '${josa(t.subj, '은는')} 이 강사'라는 말이 돈다.` : d.k === 1 ? '수강생들 성적이 좋았다. 고맙다는 편지가 몇 통 왔다.' : d.k < 0 ? `올해 ${josa(t.subj, '이가')} 어려웠는데 내 수강생들이 특히 고전했다. 수강평이 싸늘하다.` : '수강생들 성적은 평범했다.'}${d.up ? `\n\n${d.up}` : ''}`; },
  ch: (s, d) => [{ t: '확인', f: () => `수능 결과: ${d.k === 2 ? '아주 좋음' : d.k === 1 ? '좋음' : d.k < 0 ? '아쉬움' : '보통'}.${d.up ? ' ' + d.up : ''}` }],
});
// 방송: 예능 게스트 (예능인과 같은 방식)
E({
  id: 'tu_tv', cat: '섭외', title: '예능 섭외', tag: 'career',
  cond: s => tuOn(s) && !s.army,
  init(s, d) { d.sh = genShow(s, trackOn(s, 'variety') ? s.tracks.variety.tier : 0, false); },
  text: (s, d) => `유명 강사로 이름이 알려지자 ${d.sh.bc} 「${d.sh.title}」(${d.sh.genre})에서 게스트 섭외가 들어왔다.\n\n요즘 예능 유행 '${s.trendTV.show}' · 예능 ${has(me(s), 'variety') ? lvi(me(s), 'variety') + '레벨' : '못 함'}`,
  ch: (s, d) => [Object.assign(showChoice(s, d.sh), { t: '출연한다' }), { t: '거절한다', f: () => `「${d.sh.title}」 섭외를 거절했다.` }],
});
// 몇 달짜리 고정 프로그램 (연애 프로그램 · 공부 예능 · 토크쇼)
const TU_FIX = ['연애 프로그램', '공부 예능', '토크쇼', '여행 예능'];
E({
  id: 'tu_fix', cat: '섭외', title: '고정 출연 제안', tag: 'career',
  cond: s => tuOn(s) && !s.army && !s.tracks.tutor.tv,
  init(s, d) { const t = s.tracks.tutor, genre = U.pick(TU_FIX); d.sh = { title: tvShowTitle(genre), bc: U.pick(BROADCASTERS), genre, left: U.int(3, 6), fee: Math.round(150 + TU_POW[t.tier] * 120) * 1e4 }; },
  text: (s, d) => `${d.sh.bc} 「${d.sh.title}」(${d.sh.genre})에서 ${d.sh.left}개월 동안 고정 패널로 나와 달라고 한다. 매달 출연료 ${fmtWon(d.sh.fee)}.`,
  ch: (s, d) => [{ t: '출연한다', f: s => { s.tracks.tutor.tv = d.sh; addWork(s, { type: '예능', title: d.sh.title, by: '고정', sc: 60, note: `${d.sh.bc} · ${d.sh.genre} · ${d.sh.left}개월` }); return `${d.sh.bc} 「${d.sh.title}」에 고정 패널로 합류했다.` + fx(s, { fame: 2 }); } }, { t: '거절한다', f: () => `「${d.sh.title}」 고정 제안을 거절했다.` }],
});
// 드라마 특별출연 (강사 역)
E({
  id: 'tu_cameo', cat: '섭외', title: '드라마 특별출연', tag: 'career',
  cond: s => tuOn(s) && !s.army,
  init(s, d) { const t = s.tracks.tutor; d.title = dramaTitle(U.pick(DRAMA_TRENDS)); d.bc = U.pick(BROADCASTERS); d.fee = Math.round(300 + TU_POW[t.tier] * 300) * 1e4; },
  text: (s, d) => `${d.bc} 드라마 「${d.title}」에서 학원 강사 역으로 특별출연해 달라고 한다. 한 장면만 찍으면 된다. 출연료 ${fmtWon(d.fee)}.`,
  ch: (s, d) => [{ t: '출연한다', f: s => { earn(s, d.fee, '강사 방송 출연료', 'tutor'); addWork(s, { type: '드라마 특별출연', title: d.title, by: d.bc, sc: 55, pay: d.fee, note: '강사 역' }); if (has(me(s), 'acting')) practice(s, me(s), 'acting', 1); return `드라마 「${d.title}」에 특별출연했다. 짧은 장면이었지만 화제가 됐다.` + fx(s, { fame: 2, fkr: Math.round(5000 * myRoom(s, 'kr')) }); } }, { t: '거절한다', f: () => `드라마 「${d.title}」 특별출연을 거절했다.` }],
});

// ───── 예전 세이브 (v82): 없어진 회사에 있던 강사는 같은 종류에서 크기가 가장 가까운 회사로 옮긴다 ─────
function tuNearCo(kind, tier) { return TU_COS.filter(x => x.kind === kind).sort((a, b) => Math.abs(a.tier - tier) - Math.abs(b.tier - tier))[0]; }
// 회사 이름으로 찾고(크기는 새 목록대로), 없으면 같은 종류에서 크기가 가장 가까운 곳
function tuFixCo(kind, co, coT) { return TU_COS.find(x => x.n === co && x.kind === kind) || tuNearCo(kind, coT || 1); }
function tuMigrate(s) {
  const t = s.tracks && s.tracks.tutor;
  if (t && t.co) { const c = tuFixCo(t.mode === 'ol' ? 'ol' : 'acad', t.co, t.coT); t.co = c.n; t.coT = c.tier; }
  for (const m of s.inbox || []) if (m.kind === 'tu_ol' && m.d) { const c = tuFixCo(m.d.kind || 'ol', m.d.co, m.d.coT); Object.assign(m.d, { co: c.n, coT: c.tier, kind: c.kind }); m.from = c.n; }
  for (const q of (s.queue || []).concat(s.pending ? [s.pending] : [])) if (q.d && q.d.co && (q.id === 'tu_res' || q.id === 'tu_ol_res')) { const c = tuFixCo(q.d.kind || (q.id === 'tu_ol_res' ? 'ol' : 'acad'), q.d.co, q.d.coT); Object.assign(q.d, { co: c.n, coT: c.tier }); }
}
