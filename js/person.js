'use strict';
// 사람: 주인공과 가족·친구·업계 사람이 모두 같은 모양을 쓴다 (재능, 특기, 숨은 포텐)

function me(s) { return s.people[s.me]; }
function person(s, id) { return s.people[id]; }
function pAge(s, p) { return calY(s) - p.by; }
function people(s, f) { return Object.values(s.people).filter(p => p.id !== s.me && p.alive && (!f || f(p))); }

// ───── 재능 ─────
function randTalents() {
  const t = {};
  for (const k of TALENT_IDS) t[k] = Math.round(U.clamp(U.normal(45, 16), 3, 97));
  return t;
}
// 아이의 재능: 엄마·아빠를 닮지만 평균을 그대로 물려받지는 않는다 (운과 평균으로 돌아가려는 힘이 섞인다)
// 재능마다 엄마·아빠 평균보다 높을 확률 55%, 낮거나 같을 확률 45%. 차이는 0~25쯤 (평균 9)
// momAge: 낳을 때 엄마 나이. 35세 이상(고령 출산)이면 평균보다 좋을 확률과 나쁠 확률이 뒤바뀐다 (55:45 → 45:55)
function inheritTalents(mom, dad, momAge) {
  const t = {}, up = momAge >= 35 ? 0.45 : 0.55;
  for (const k of TALENT_IDS) {
    const a = mom ? mom.tal[k] : 45, b = dad ? dad.tal[k] : 45, avg = Math.round((a + b) / 2);
    const dv = Math.round(Math.abs(U.normal(0, 11)));
    const v = U.chance(up) ? avg + Math.max(1, dv) : avg - dv;
    t[k] = Math.round(U.clamp(v, 3, 98));
  }
  return t;
}
// 주인공은 적어도 하나는 뛰어난 재능을 갖고 태어난다
function ensureGift(t) {
  // 외모·스타성과, 이어진 특기가 적은 운동신경·표현력은 이 보장에서 뺀다 (이것만 높으면 다른 재능 하나를 더 준다)
  const main = TALENT_IDS.filter(k => !['looks', 'star', 'athletic', 'express'].includes(k));
  if (main.some(k => t[k] >= 70)) return t;
  const k = main.slice().sort((a, b) => t[b] - t[a])[0];
  t[k] = U.int(72, 88);
  return t;
}
function gifts(p) { return TALENT_IDS.filter(k => p.tal[k] >= 70); }

// ───── 특기 ─────
function talFactor(p, k) {
  const w = SKILLS[k].tal;
  let sum = 0, tot = 0;
  for (const t in w) { sum += w[t] * (p.tal[t] || 40); tot += w[t]; }
  return sum / tot;
}
// 사업은 집안 형편이 좋을수록 빨리 는다 (형편 1단계 0.82배 ~ 10단계 1.45배). 결혼했으면 지금 집 형편
function bizRichF(s) { const w = typeof married === 'function' && married(s) ? homeWealth(s) : (s.wealth || 5); return 0.75 + w * 0.07; }
function skillSpeed(p, k) { return 0.35 + talFactor(p, k) / 70; }
function rollPot(p, k) { return Math.round(U.clamp(U.normal(talFactor(p, k) * 0.85 + 18, 10), 12, 100)); }
function has(p, k) { return !!(p && p.sk && p.sk[k]); }
function lv(p, k) { return has(p, k) ? p.sk[k].lv : 0; }
function lvi(p, k) { return Math.floor(lv(p, k)); }
function eduLv(p) { return lv(p, 'edu'); }
// 실제로 가르칠 때의 실력 (v94): 교육과 가르치는 그 특기 반반 (교육을 배우는 속도는 skills.js 재능 표대로)
function teachLv(p, k) { return eduLv(p) * 0.5 + lv(p, k) * 0.5; }
// 직업 기본 활동 점수 (v94, 8단계 직업 표): 특기 · 재능을 [값, 무게]로 받아 강함 1 · 보통 0.5로 가중평균한다 (0~100 크기 그대로)
const JS_ = 1, JM_ = 0.5;
function jobMix(L) { let a = 0, w = 0; for (const [v, k] of L) { a += v * k; w += k; } return w ? a / w : 0; }
// 외모처럼 원래 가산점으로 들어가던 재능: 50에서 벗어난 만큼 강함 0.4 · 보통 0.2 (예전 visB는 0.2)
function talB(v, strong) { return (v - 50) * (strong ? 0.4 : 0.2); }
// 장르 · 분야 · 일 종류마다 더 보는 것 (v96, 8-4 사용자 표). 둘이 적혀 있으면 둘을 각각 작게 본다
// 재능: 50에서 벗어난 만큼 가산점 (하나면 1점에 0.2, 둘이면 0.1씩). 앞에 '-'를 붙이면 낮을수록 좋다 (백댄서의 스타성)
// 특기: 레벨만큼 가산점 (하나면 레벨 1에 0.1, 둘이면 0.05씩). 없으면 0이라 손해는 없다
function fitB(p, L) {
  if (!L || !L.length) return 0;
  let b = 0;
  for (const x of L) { const neg = x[0] === '-', k = neg ? x.slice(1) : x; b += TALENT_BY[k] ? (neg ? 50 - p.tal[k] : p.tal[k] - 50) * 0.2 : lv(p, k) * 0.1; }
  return b / L.length;
}
// 일 종류마다 더 보는 특기(fit)를 이미 갖고 있으면 그 일을 하며 조금 쓴다 (v97)
function fitUse(s, p, L) { for (const k of L || []) if (!TALENT_BY[k] && has(p, k)) useSkill(s, p, k, 0.6); }
// 특기 · 재능 id 하나의 값 (재능은 재능 값, 특기는 레벨)
function skOrTal(p, k) { return TALENT_BY[k] ? p.tal[k] : lv(p, k); }
function learnedSkills(p) { return SKILL_IDS.filter(k => has(p, k)); }
// ───── 특기 개수 제한 (v101, 8-6 사용자) ─────
// 배운 특기는 10개까지. 사건 · 학원으로 새로 배우는 건 막고, 직업에 들어가거나 일하며 꼭 생기는 특기는 넘어도 생긴다
// v102: 학업 · 영어 · 일본어는 개수에 안 센다 (SK_FREE). 특기 칸에서 특기를 그만둘 수 있다
// v102: 특기 하나만 권하는 사건(받기 · 안 받기 둘 중 하나)에서 거절하면 그 사건은 평생 다시 안 나온다.
//       그 특기는 서너 개 중에 고르는 사건이나 '새 특기 배우기'로만 배울 수 있다
const SKILL_CAP = 10, SK_FREE = ['study', 'en', 'jp'];
function capCount(p) { return learnedSkills(p).filter(k => !SK_FREE.includes(k)).length; }
function skRoom(s, k) { return SK_FREE.includes(k) || capCount(me(s)) < SKILL_CAP; }
// 예전 세이브의 s.skNo[k]는 숫자(3년 뒤 달)였다. 이제는 값이 있기만 하면 거절한 것으로 본다
function skDecline(s, k) { if (!has(me(s), k)) (s.skNo = s.skNo || {})[k] = 1; }
function skRefused(s, k) { return !!(s.skNo && s.skNo[k]); }
// 특기 하나만 권하는 사건: 이미 있으면 늘 된다 (그때는 레벨이 오른다). 없으면 자리가 있고 거절한 적이 없어야 한다
// v118 UI E1: 특기가 꽉 찼어도 그만둘 수 있는 특기가 있으면 새 특기를 주는 사건이 나온다 (받으면 '특기 하나를 그만두고 배운다' 창, learnMe)
function skDroppable(s) { return learnedSkills(me(s)).filter(k => !SK_FREE.includes(k) && !skKeepWhy(s, k)); }
function skSwapOK(s, k) { return skRoom(s, k) || skDroppable(s).length > 0; }
function skAsk(s, k) { return has(me(s), k) || (skSwapOK(s, k) && !skRefused(s, k)); }
// 서너 개 중에 고르는 사건: 거절한 특기도 나온다. 자리만 있으면 된다 (꽉 찼으면 하나를 그만두고 배운다)
function skOpen(s, k) { return has(me(s), k) || skSwapOK(s, k); }
// 그만둘 수 없는 특기: 지금 하는 직업의 대표 특기
function skKeepWhy(s, k) { for (const id of CAREER_IDS) { const c = CAREERS[id]; if (c && c.mainSk && trackOn(s, id) && c.mainSk(s, s.tracks[id]) === k) return `지금 하는 ${CAREER_SHORT[id] || c.n || '직업'}의 대표 특기라 그만둘 수 없다`; } return ''; }
function dropSkill(s, k) {
  const p = me(s);
  if (!has(p, k) || SK_FREE.includes(k) || skKeepWhy(s, k)) return;
  delete p.sk[k];
  for (const sl of s.slots || []) if (sl.act === 'p_' + k) { sl.act = 'rest'; delete sl.lesson; delete sl.lesLv; }
  addLog(s, `${SKILLS[k].n} 특기를 그만뒀다.`);
}

// 처음 배우기. 사건(선택지)에서만 부른다. 돌려주는 값: 새로 배웠으면 true
function learnSkill(s, p, k, start) {
  if (has(p, k)) return false;
  let l = start != null ? start : 1;
  const tw = SKILL_TWIN[k];
  if (tw && has(p, tw)) l = Math.max(l, Math.floor(p.sk[tw].lv / 2));
  p.sk[k] = { lv: l, best: l, last: s.t, pot: Math.max(l, rollPot(p, k)) };
  return true;
}
// 처음 배운 걸 기록과 함께 알려 준다 (주인공용)
// 사건 선택지로 이미 가진 특기를 또 얻으면 그 특기가 2레벨 오른다. noBump: 회사에 들어가며 자동으로 갖게 되는 특기처럼 오르지 않는 경우
// force (v101): 직업에 들어가거나 일하며 꼭 생기는 특기. 특기가 10개여도 생긴다 (noBump도 마찬가지)
function learnMe(s, k, start, noBump, force) {
  const p = me(s);
  if (!has(p, k) && !noBump && !force && !skRoom(s, k)) {
    if (!skDroppable(s).length) return ` [특기가 ${SKILL_CAP}개라 새로 배우지 못했다]`;
    queueEv(s, 'sk_swap', 0, { k, start: start == null ? null : start }, true);
    return ` [특기가 ${SKILL_CAP}개다]`;
  }
  if (has(p, k)) {
    if (noBump) return '';
    const sk = p.sk[k], b = lvi(p, k), tw = SKILL_TWIN[k], tb = tw && has(p, tw) ? lvi(p, tw) : 0;
    sk.lv = Math.min(100, sk.lv + 2); sk.best = Math.max(sk.best, sk.lv); sk.pot = Math.max(sk.pot, sk.lv); sk.last = s.t;
    if (tb) { const o = p.sk[tw]; o.lv = Math.min(100, o.lv + 1); o.best = Math.max(o.best, o.lv); o.pot = Math.max(o.pot, o.lv); o.last = s.t; }
    const d = lvi(p, k) - b, td = tb ? lvi(p, tw) - tb : 0;
    return d ? ` [${SKILLS[k].n} +${d}${td ? ` · ${SKILLS[tw].n} +${td}` : ''}]` : '';
  }
  learnSkill(s, p, k, start);
  const l = lvi(p, k);
  return ` [새 특기: ${SKILLS[k].n}${l > 1 ? ` ${l}레벨부터` : ''}]`;
}
// 피아노·키보드처럼 서로 가까운 특기(SKILL_TWIN)는 둘 다 배웠으면 한쪽이 늘 때 다른 쪽도 절반만큼 는다 (그쪽 포텐까지)
function twinGrow(s, p, k, g) {
  const tw = SKILL_TWIN[k];
  if (!tw || !(g > 0) || !has(p, tw)) return;
  const o = p.sk[tw];
  o.lv = Math.min(Math.max(o.pot, o.lv), o.lv + g);
  o.best = Math.max(o.best, o.lv);
  o.last = s.t;
}
function ageMult(s, p, k) {
  const a = p.id === s.me ? age(s) : pAge(s, p);
  const sk = SKILLS[k];
  if (sk.young) return a < 10 ? 0.8 : a < 23 ? 1.1 : a < 30 ? 1 : a < 40 ? 0.75 : 0.55;
  if (sk.lang) return a < 13 ? 1.2 : a < 25 ? 1.05 : a < 40 ? 0.9 : 0.7;
  return a < 10 ? 0.8 : a < 50 ? 1 : 0.8;
}
// 연습. base: 기본 양(혼자 연습 1), mult: 학원이면 1.7 등. 돌려주는 값: 오른 양
function practice(s, p, k, base = 1, mult = 1) {
  if (!has(p, k)) return 0;
  const sk = p.sk[k];
  sk.last = s.t;
  const isMe = p.id === s.me;
  let mood = 1;
  if (isMe) {
    mood = s.stress > 75 ? 0.7 : s.stress > 55 ? 0.88 : 1;
    if (s.ill) mood *= 0.6;
  }
  const dim = Math.pow(Math.max(0, 1 - sk.lv / Math.max(1, sk.pot)), 1.1);
  const per = isMe ? pm(s, 'growth') * (SKILLS[k].create ? pm(s, 'create') : 1) * (k === 'variety' ? pm(s, 'variety') : 1) : 1;
  const school = isMe ? schoolBonus(s, k) * equipBonus(s, k) : homeKid(s, p) ? equipBonus(s, k, true) : 1;
  const rich = k === 'biz' && (isMe || homeKid(s, p)) ? bizRichF(s) : 1;
  const raw = 0.18 * base * mult * skillSpeed(p, k) * ageMult(s, p, k) * mood * per * school * rich, g = raw * dim;
  const before = sk.lv;
  sk.lv = Math.min(sk.pot, sk.lv + g);
  sk.best = Math.max(sk.best, sk.lv);
  twinGrow(s, p, k, (sk.lv - before) / 2);
  // 포텐에 가까워지면 한 번 창으로 알려 준다 (숫자는 보여 주지 않는다). 이미 기다리는 창이 있으면 거기에 더한다
  if (isMe && !sk.capTold && sk.pot - sk.lv < 1.5 && sk.lv >= 8) {
    sk.capTold = true;
    const q = s.queue.find(x => x.id === 'cap_hit');
    if (q) { if (!q.d.ks.includes(k)) q.d.ks.push(k); } else queueEv(s, 'cap_hit', 0, { ks: [k] }, true);
  }
  return sk.lv - before;
}
// 일하면서 특기를 쓴 것 (연습만큼은 아니지만 실력이 떨어지지 않게 된다)
function useSkill(s, p, k, amt = 0.3) { if (has(p, k)) { p.sk[k].last = s.t; if (amt) practice(s, p, k, amt); } }
// 가르치기: 교육 특기가 는다
function teach(s, p, base = 1) { return has(p, 'edu') ? practice(s, p, 'edu', base) : 0; }
// 한 달마다: 오래 안 한 특기는 천천히 떨어진다 (가장 높았던 레벨의 절반 밑으로는 안 내려간다)
function decayMonth(s, p) {
  const a = p.id === s.me ? age(s) : pAge(s, p);
  const m = a >= 40 ? 1.6 : a >= 30 ? 1.2 : 1;
  for (const k in p.sk) {
    const sk = p.sk[k];
    if (s.t - sk.last > 6) sk.lv = Math.max(1, sk.best * 0.5, sk.lv - 0.1 * m);
  }
}
// 사건 효과용: 배운 특기만 조금 올린다
function bumpSkill(s, k, v) { const p = me(s); if (!has(p, k) || !v) return ''; const b = lvi(p, k); if (v > 0) practice(s, p, k, v * 4.5); else p.sk[k].lv = Math.max(1, p.sk[k].lv + v); const d = lvi(p, k) - b; return d ? `${SKILLS[k].n} ${sgn(d)}` : ''; }

// ───── 다른 사람 만들기 ─────
// 이름 목록: 태어난 해(by)에 맞는 시대 목록, 다섯 번에 한 번은 바로 앞뒤 시대 (by를 모르면 요즘 이름)
function givenList(g, by) {
  const L = NAMES_ERA.concat([{ y: Infinity, f: NAMES_F, m: NAMES_M }]);
  let i = by == null ? L.length - 1 : L.findIndex(e => by <= e.y);
  if (U.chance(0.2)) i = U.clamp(i + (U.chance(0.5) ? -1 : 1), 0, L.length - 1);
  return g === '여' ? L[i].f : L[i].m;
}
function genName(g, by) { return U.wpick(SURNAMES, x => x[1])[0] + U.pick(givenList(g, by)); }
function genJpName(g) { return U.pick(JP_SUR) + ' ' + U.pick(g === '여' ? JP_F : JP_M); }
// 한 그룹 안 동명이인 없애기 (AI가 만든 그룹, v163): 앞사람과 이름이 같으면 새 이름을 짓는다 (일본 · 미국식 이름은 그 꼴로). 맨 앞(나)은 그대로
function uniqNames(s, ids) {
  const seen = new Set();
  for (const id of ids) {
    const x = s.people[id]; if (!x) continue;
    for (let i = 0; i < 30 && seen.has(x.name); i++) { const f = x.name.split(' ')[0]; x.name = typeof JP_SUR !== 'undefined' && JP_SUR.includes(f) ? genJpName(x.g) : x.name.includes(' ') ? genUsName(x.g) : genName(x.g, x.by); }
    seen.add(x.name);
  }
}
function genUsName(g) { return U.pick(g === '여' ? US_F : US_M) + ' ' + U.pick(US_SUR); }
// o: { g, name, age, rel, aff, job, tal, skills:{k:lv}, met, trait, look, orient, fame }
function makePerson(s, o = {}) {
  const g = o.g || (U.chance(0.5) ? '여' : '남');
  const id = o.id || 'p' + U.uid();
  const by = o.by != null ? o.by : calY(s) - (o.age != null ? o.age : age(s));
  const p = {
    id, g, name: o.name || (o.mkt === 'jp' ? genJpName(g) : o.mkt === 'us' ? genUsName(g) : genName(g, by)), by,
    rel: o.rel || '친구', aff: o.aff != null ? o.aff : 35, trait: o.trait || U.pick(TRAITS).id,
    look: o.look || U.pick(g === '여' ? LOOKS_F : LOOKS_M), job: o.job || '학생', fame: o.fame || 0,
    met: o.met || '', alive: true, since: s.t, contactT: s.t,
    // 성적 지향은 모두 이성애 (피드백 17: 자녀로 이어 하기가 막히지 않게)
    orient: 's',
    tal: o.tal || randTalents(), sk: {},
  };
  s.people[id] = p;
  if (o.skills) for (const k in o.skills) { learnSkill(s, p, k, o.skills[k]); p.sk[k].best = p.sk[k].lv; }
  soulMaybe(s, p, o);
  return p;
}
// 환생 (v91): 새로 만드는 사람이 지난 인생 주인공의 영혼 카드와 성별이 같고, 그 영혼이 다시 태어나는 해(R)에 태어났으면(1년 차이면 R로 맞춘다) 절반 확률로 그 사람의 환생이 된다
// 가족 · 이름이 정해진 사람(첫사랑 · 단짝 등) · 외국 이름은 빼고, 한 세이브에서 한 영혼은 한 사람으로만. 외모 · 성격이 같고 강했던 재능이 비슷하게 높다. 힌트는 '어딘가 낯익은 얼굴'뿐
const SOUL_SKIP = ['나', '엄마', '아빠', '형제자매', '자녀', '친척', '배우자'];
function soulMaybe(s, p, o) {
  if (typeof soulList !== 'function' || SOUL_SKIP.includes(p.rel) || o.name || o.mkt || !s.people[s.me]) return;
  const c = soulList().filter(e => e.id !== s.id && e.soul.g === p.g && Math.abs(p.by - e.soul.R) <= 1);
  if (!c.length || !U.chance(0.5)) return;
  const used = new Set(Object.values(s.people).filter(x => x.soul).map(x => x.soul));
  const L = c.filter(e => !used.has(e.id));
  if (!L.length) return;
  const e = U.pick(L), so = e.soul;
  p.soul = e.id; p.by = so.R;
  if (so.look) p.look = so.look;
  if (so.trait && TRAIT_BY[so.trait]) p.trait = so.trait;
  for (const k in so.tal || {}) for (const x of (k === 'sense' ? ['humor', 'insight'] : TALENT_BY[k] ? [k] : [])) p.tal[x] = Math.max(p.tal[x] || 0, U.clamp(so.tal[k] - U.int(0, 8), 0, 100));
  // 가장 잘하던 특기는 어릴 때부터 조금 해 봤다 (나이에 맞게, 예전 레벨을 넘지 않게)
  const a = calY(s) - p.by;
  if (so.sk && SKILLS[so.sk] && !p.sk[so.sk] && a >= 8) learnSkill(s, p, so.sk, U.clamp(Math.round((a - 6) * 1.5), 1, Math.max(1, so.lv || 1)));
}
// 환생한 사람에게만 붙는 힌트
function soulTag(p) { return p && p.soul ? ' · 어딘가 낯익은 얼굴' : ''; }
// 그 사람이 상대 성별에게 끌리는지 (동성애자가 아니면 동성 고백은 받아 주지 않는다)
function likes(p, g) { const o = p.orient || 's'; return o === 'b' || (o === 'g' ? p.g === g : p.g !== g); }
function aff(p, d) { p.aff = U.clamp(p.aff + d, 0, 100); }
function partner(s) { return s.partner ? s.people[s.partner] : null; }
function desc(s, p) { return `${p.name} (${p.g === '여' ? '여성' : '남성'} · ${pAge(s, p)}세 · ${p.look} · ${TRAIT_BY[p.trait].n}${soulTag(p)})`; }
function skillLine(p, max = 3, s) {
  const ks = learnedSkills(p).sort((a, b) => lv(p, b) - lv(p, a)).slice(0, max);
  return ks.length ? ks.map(k => `${SKILLS[k].n} ${s ? lvSee(s, p, k) : lvi(p, k)}`).join(' · ') : '특기 없음';
}
// 부모님: 재능이 높은 쪽 취미 특기를 한두 개 가진다 (아이에게 가르쳐 줄 수 있다)
function giveHobbies(s, p) {
  const pool = ['guitar', 'piano', 'drum', 'vocal', 'dance', 'art', 'game', 'en', 'study', 'lyric', 'acting'].filter(k => talFactor(p, k) >= 52);
  const n = U.wpick([0, 1, 2], x => [35, 45, 20][x]);
  for (const k of U.shuffle(pool).slice(0, n)) { learnSkill(s, p, k, Math.round(U.clamp(U.normal(talFactor(p, k) * 0.6, 10), 8, 70))); p.sk[k].best = p.sk[k].lv; }
  for (const k of (JOB_SKILL[p.job] || [])) if (!has(p, k)) { learnSkill(s, p, k, U.int(40, 70)); p.sk[k].best = p.sk[k].lv; }
}
// 재능에 잘 맞는 특기일수록 자주 뽑는다 (선택지에 보여 줄 특기 고르기)
function fitWeight(p, k, pow = 3) { return Math.pow(Math.max(5, talFactor(p, k)) / 45, pow); }
function fitPick(s, list, n, keyOf = x => x[1]) {
  const p = me(s), pool = list.slice(), out = [];
  while (out.length < n && pool.length) { const x = U.wpick(pool, y => fitWeight(p, keyOf(y))); out.push(x); pool.splice(pool.indexOf(x), 1); }
  return list.filter(x => out.includes(x));
}
