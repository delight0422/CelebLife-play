'use strict';
// ════════ 영상 제작사 (6-4단계) ════════
// 회사 대표의 분야 'video' (js/company.js). 웹드라마·드라마·OTT 시리즈·영화를 기획해서 만든다
// 만드는 순서 (v180): 무엇을 만들지(종류 · 장르) → 어느 IP로(오리지널 · 후속작 · 웹툰 · 웹소설) → 어느 작품으로 → 감독 → 주연 → 조연(성별 조건 · 4명 이상) → 제작비 → 거는 곳(배급사·방송사·플랫폼) → 제작 시작 창 → 촬영 준비 → 촬영 → 후반 작업 → 공개
// 각본은 완성도 5단계, 감독·배우의 실력은 범위로 보인다 (나와 기획 PD 중 더 잘 보는 사람의 눈). 배우의 인기(팬 수)는 정확히 보인다
// 각본료·연출료·출연료는 작품을 시작할 때 한꺼번에 내고, 제작비는 촬영 준비·촬영 동안 달마다 나눠 낸다
// 수입은 공개할 때 한꺼번에 들어온다: 영화는 극장(배급 수수료를 뗀다)·VOD·해외, 드라마는 방영권·간접광고·해외, OTT는 제작비에 이윤을 얹어 받고, 웹드라마는 플랫폼 구매비·조회수

// 작품 종류: bud 제작비(저예산·보통·대작·블록버스터), prep 촬영 준비 · shoot 촬영 · post 후반 작업(개월), cast/star 출연료(기본 + 팬 1명당), dir 연출료 기본, script 각본료 기본, w 평판 무게, hit 대표 등급에 세는 크기
const V_KIND = {
  web: { n: '웹드라마', ch: 'web', bud: [1e8, 3e8, 8e8, 15e8], prep: 1, shoot: 2, post: 1, cast: 300e4, star: 150, dir: 500e4, script: 500e4, demand: 25, w: 0.8, hit: 0.3 },
  drama: { n: '드라마', ch: 'tv', bud: [20e8, 60e8, 150e8, 300e8], prep: 2, shoot: 5, post: 2, cast: 5000e4, star: 5000, dir: 1e8, script: 1.5e8, demand: 40, w: 1, hit: 1 },
  ott: { n: 'OTT 시리즈', ch: 'ott', bud: [10e8, 40e8, 120e8, 250e8], prep: 2, shoot: 4, post: 3, cast: 5000e4, star: 6000, dir: 1.2e8, script: 2e8, demand: 45, w: 0.9, hit: 0.9 },
  film: { n: '영화', ch: 'film', bud: [5e8, 40e8, 120e8, 250e8], prep: 2, shoot: 4, post: 4, cast: 3000e4, star: 8000, dir: 1e8, script: 1e8, demand: 45, w: 1, hit: 1 },
};
const V_BUD_N = ['저예산', '보통', '대작', '블록버스터'];
const V_BUD_SC = [-3, 0, 2, 3]; // 제작비가 화면에 보태는 점수 (볼거리)
const V_WEB_VIEW = [0.5, 1, 1.4, 1.8];
// 거는 곳: 영화는 배급사, 드라마는 방송사(공중파·케이블), OTT 시리즈는 유료 플랫폼, 웹드라마는 무료 플랫폼
const V_CH_N = { film: '배급사', tv: '방송사', ott: '유료 플랫폼', web: '무료 플랫폼' };
const V_CH_S = { film: '배급사', tv: '방송사', ott: '플랫폼', web: '플랫폼' };
function vChLabel(D) { return `${D.g || TIER_N[D.tier]} ${V_CH_N[D.ch]}`; }
// 거는 곳 크기별: fee 수수료, pow 상영관·편성 힘(관객·시청률·방영권에 곱한다), promo 홍보 힘(점수에 더한다), margin OTT가 제작비에 얹어 주는 이윤
const DIST_T = [null, { fee: 0.12, pow: 0.8, promo: 0, margin: 1.05 }, { fee: 0.18, pow: 1, promo: 1, margin: 1.1 }, { fee: 0.25, pow: 1.25, promo: 2, margin: 1.15 }];
const CO_V_CAP = [0, 1, 2, 3]; // 함께 만들 수 있는 작품 수 (크기별)
// 기획 회의 사건들 (영상·애니가 같이 쓴다: 한 번에 한 회의만)
const CO_V_CHAIN = ['co_vplan', 'co_vip', 'co_vpick', 'co_vscript', 'co_vdir', 'co_vcast', 'co_vbud', 'co_vdist', 'co_vgo', 'co_aplan', 'co_asrc', 'co_adir', 'co_akey', 'co_ateam'];
const CO_VAD = [0, 3000e4, 8000e4, 2e8]; // 광고·뮤직비디오 제작 의뢰 금액 (크기별)
const V_STAGE = { prep: '촬영 준비 중', shoot: '촬영 중', post: '후반 작업 중' };

function coVTier(t) { return coTier(t, 'video'); }
// 계획 P의 분야('video' · 'anime')와 작품 종류 정보. 배우(성우) 섭외 · 제작비 · 거는 곳 단계는 두 분야가 같이 쓴다
function coPF(P) { return P.f || 'video'; }
function coPK(P) { return (P.f === 'anime' ? A_KIND : V_KIND)[P.kind]; }
function coPShoot(P, l) { const V = coPK(P); return V.shoot + (P.f !== 'anime' && P.kind === 'film' && l >= 2 ? 1 : 0); }
// 영상 · 애니 제작사는 기획 PD가 따로다 (회사마다 직원, v161). f = 그 작품을 만드는 회사
function coVView(s, k, f) { return coViewer(s, 'pd', k, f); }
function vKindN(k) { return V_KIND[k].n; }
// 새 작품 기획을 지금 할 수 없는 이유
function coVWhy(s, t) {
  if (CO_V_CHAIN.some(id => hasQ(s, id))) return '기획 회의 중';
  if ((t.vw || []).length >= CO_V_CAP[coVTier(t)]) return `${coSizeN(t, 'video')}는 작품을 ${CO_V_CAP[coVTier(t)]}편까지 함께 만든다`;
  return '';
}
// 후속작을 만들 수 있는 작품 (회사가 가진 IP): 시리즈의 가장 최근 작품이 잘 안됐거나(55점 아래), 5편까지 나왔거나, OTT 오리지널(판권은 OTT 것)이면 안 된다
function coVIps(t) {
  const last = {};
  for (const w of t.vdone || []) if (!last[w.ip] || w.n > last[w.ip].n) last[w.ip] = w;
  return Object.values(last).filter(w => w.kind !== 'ott' && w.sc >= 55 && w.n < 5);
}
function coVSeqTitle(w) { return w.kind === 'drama' ? `${w.base} 시즌${w.n + 1}` : `${w.base} ${w.n + 1}`; }

// ───── 작품 기획 순서 (v180, 영상 · 애니가 같이 쓴다) ─────
// 무엇을 만들까(종류 · 장르) → 어느 IP로(오리지널 · 후속작 · 웹툰 원작 · 웹소설 원작) → 어느 작품으로(표) → 스태프(감독 · 애니는 작화감독 · 원화)
//   → 주연(2명까지 한꺼번에) → 조연(몇 명이든 한꺼번에) → 제작비 → 거는 곳 → 제작 시작 창(co_vgo)
// 기획 중에 고르는 창은 결과 창을 따로 띄우지 않고 위쪽 토스트로 알린다 (noRes 'toast', ui.js resAfter)
// 배우(성우) 성별 조건: 주연 1~2명과 조연을 합쳐 4명, 남녀 수는 작품마다 다르다 (예: 주연 남1 여1 · 조연 남1 여1 / 주연 남2 · 조연 여2 / 주연 남1 · 조연 여3)
function coCastNeed() {
  const ln = U.chance(0.55) ? 2 : 1, sp = n => { const m = U.int(0, n); return { m, f: n - m }; };
  return { lead: ln === 2 ? U.wpick([{ m: 1, f: 1 }, { m: 2, f: 0 }, { m: 0, f: 2 }], x => x.m === 1 ? 3 : 1) : sp(1), sup: sp(4 - ln) };
}
const CO_NEED0 = { lead: { m: 0, f: 0 }, sup: { m: 0, f: 0 } }; // 예전 세이브에서 만들던 작품: 성별 조건 없이 4명 이상
function coNeedTxt(n) { return [n.m ? `남${n.m}` : '', n.f ? `여${n.f}` : ''].filter(Boolean).join(' ') || '-'; }
function coCastG(s, P, role) { const o = { m: 0, f: 0 }; for (const c of coVCast(P)) if (c.role === role && s.people[c.id]) o[gNn(s.people[c.id]) === '여' ? 'f' : 'm']++; return o; }
function coNeedLack(G, n) { return { m: Math.max(0, n.m - G.m), f: Math.max(0, n.f - G.f) }; }
function coCastLack(s, P, role) { return coNeedLack(coCastG(s, P, role), (P.need || CO_NEED0)[role]); }
function coLackTxt(lk, nn) { return [lk.m ? `남자 ${nn} ${lk.m}명` : '', lk.f ? `여자 ${nn} ${lk.f}명` : ''].filter(Boolean).join(' · '); }
function coLeadMet(s, P) { const lk = coCastLack(s, P, 'lead'); return coVCast(P).some(c => c.role === 'lead') && !lk.m && !lk.f; }
function coCastMet(s, P) { const lk = coCastLack(s, P, 'sup'); return coLeadMet(s, P) && !lk.m && !lk.f && coVCast(P).length >= CO_V_CAST.min; }
function coPKindN(P) { return coPK(P).n; }
// 1. 무엇을 만들까: 종류와 장르 (장르는 정하지 않고 여러 장르를 볼 수도 있다)
function coPlanForm(s, f) {
  const t = coT(s), ani = f === 'anime', KS = ani ? A_KIND : V_KIND, k = coTier(t, f), tr = ani ? (s.trendTV || {}).anime : s.trendTV.drama, F = [{ type: 'head', label: '무엇을 만들까', grid: true }];
  Object.keys(KS).forEach((kk, i) => { const K = KS[kk]; F.push({ k: 'kind', type: 'radio', v: kk, on: i === 0, label: K.n, sub: `제작비 ${fmtWon(K.bud[0])}~${fmtWon(K.bud[k])} · ${ani ? `만드는 데 ${K.prep + K.shoot + K.post}개월` : `준비·촬영 ${K.prep + K.shoot}개월`} · ${V_CH_N[K.ch]}` }); });
  F.push({ type: 'head', label: '장르', grid: true }, { k: 'gen', type: 'radio', v: '', on: true, label: '정하지 않는다', sub: '여러 장르를 보고 고른다' });
  for (const g of ani ? ANIME_TRENDS : DRAMA_TRENDS) F.push({ k: 'gen', type: 'radio', v: g, label: g === tr ? `${g} 🔥` : g, sub: g === tr ? '지금 유행' : '' });
  return F;
}
function coPlanSubmit(s, f, v) {
  const KS = f === 'anime' ? A_KIND : V_KIND;
  if (!KS[v.kind]) return { err: '무엇을 만들지 골라 주세요' };
  const P = { kind: v.kind, genre: v.gen || '', need: coCastNeed() };
  if (f === 'anime') P.f = 'anime';
  if (v.ceoIp) P.ceoIp = v.ceoIp;
  fireEvent(s, 'co_vip', { P });
  return {};
}
E({
  id: 'co_vplan', cat: '작품 기획', title: '무엇을 만들까?', tag: 'career', noRes: 'toast',
  cond: s => coOn(s) && !!coT(s).f.video,
  text: s => { const t = coT(s); return `다음 작품을 기획한다. 무엇을 만들지, 어떤 장르로 할지 고른다.\n\n${coSizeN(t, 'video')} · 자본금 ${fmtWon(coM(t, 'video'))} · 고를 수 있는 제작비 ${V_BUD_N.slice(0, coVTier(t) + 1).join('·')}`; },
  form: s => coPlanForm(s, 'video'),
  submitT: () => '다음 ▶',
  submit: (s, d, v) => coPlanSubmit(s, 'video', v),
  cancel: () => '', cancelT: () => '그만둔다',
});
// 2. 어느 IP로 만들까: 후속작은 우리 회사 작품 중 고른 종류와 같은 것만
function coSeqOpts(s, P) {
  const t = coT(s);
  if (P.f === 'anime') return coAIps(t).filter(o => o.kind === P.kind).map(o => ({ title: o.title, seq: Object.assign({}, o.seq, { title: o.title }), from: o.from }));
  return coVIps(t).filter(w => w.kind === P.kind).map(w => ({ title: coVSeqTitle(w), seq: { ip: w.ip, n: w.n + 1, prevSc: w.sc, prevDir: w.dir, prevLead: w.lead, base: w.base, genre: w.genre, title: coVSeqTitle(w) }, from: w }));
}
// 다 써 둔 내 원고: 영상은 같은 종류로 쓴 것만, 애니는 아무거나
function coMyOrig(s, P) { return myScripts(s).filter(x => x.st === 'done' && (P.f === 'anime' || x.tk === P.kind)); }
function coMyWb(s, P, sn) { return wbMyWorks(s).filter(w => w.sn === sn && !w[P.f === 'anime' ? 'anime' : 'video']); }
E({
  id: 'co_vip', cat: '작품 기획', title: '어느 IP로 만들까?', tag: 'career', noRes: 'toast',
  cond: s => coOn(s),
  text: (s, d) => { const P = d.P; return `${josa(`${coPKindN(P)}${P.genre ? ` · ${P.genre}` : ''}`, '을를')} 무엇으로 만들까? 새 이야기로 만들거나, 우리 회사 작품의 후속작을 만들거나, 웹툰 · 웹소설 판권을 사서 만든다.`; },
  ch: (s, d) => {
    const P = d.P, ani = P.f === 'anime', sq = coSeqOpts(s, P), mine = coMyOrig(s, P).length, go = ip => s => { P.ip = ip; fireEvent(s, 'co_vpick', { P }); return ''; };
    const wb = sn => { const n = coMyWb(s, P, sn).length; return `${sn} 판권을 사서 만든다 · 원작 독자가 기대를 보탠다${n ? ` · 내 ${sn} ${n}편` : ''}`; };
    return [
      { t: '오리지널', h: `시나리오 작가가 새로 쓴 ${ani ? '기획안' : '각본'}을 산다${mine ? ` · 다 써 둔 내 원고 ${mine}편` : ''}`, f: go('orig') },
      { t: '후속작', h: sq.length ? `우리 회사 ${coPKindN(P)} ${sq.length}편 · 저번 작품 팬들이 기다린다 (장르는 저번 그대로)` : `이어 만들 만한 우리 회사 ${josa(coPKindN(P), '이가')} 아직 없다`, ok: () => sq.length > 0, f: go('seq') },
      { t: '웹툰 원작', h: wb('웹툰'), f: go('toon') },
      { t: '웹소설 원작', h: wb('웹소설'), f: go('novel') },
      { t: '그만둔다', f: () => '작품 기획을 접었다.' },
    ];
  },
});
// 3. 어느 작품으로 할까: 고른 IP의 작품을 표로 (시장에 나온 것 · 우리 회사 후속작 · 내 원고 · 내 웹툰 · 웹소설)
function coVRightsPrice(kind, fans, q) { return Math.round(V_KIND[kind].script * 0.8 * Math.sqrt(fans / 1e5) * (0.6 + q / 100) * U.fl(0.85, 1.15) / 1e6) * 1e6; }
E({
  id: 'co_vpick', cat: '작품 기획', title: '어느 작품으로 할까?', tag: 'career', noRes: 'toast',
  cond: s => coOn(s),
  init(s, d) {
    if (d.ms) return;
    const P = d.P, ani = P.f === 'anime', k = coTier(coT(s), coPF(P)), G = ani ? ANIME_TRENDS : DRAMA_TRENDS, tr = (ani ? (s.trendTV || {}).anime : s.trendTV.drama) || U.pick(G);
    const L = d.ms = [], gen = i => P.genre || (i === 0 && U.chance(0.5) ? tr : U.pick(G)), ttl = g => ani ? animeTitle(g) : dramaTitle(g), fresh = y => !L.some(m => m.w === y.id);
    const sp = q => ani ? coAScriptPrice(P.kind, q) : coVScriptPrice(P.kind, q), sq = w => U.clamp(Math.round(lv(w, 'script') * 0.6 + U.int(5, 40) + k * 2), 10, 95);
    if (P.ip === 'seq') for (const o of coSeqOpts(s, P)) { const w = pickIndustry(s, '시나리오 작가', fresh), q = sq(w); L.push({ title: o.title, genre: o.seq.genre, q, w: w.id, price: sp(q), seq: o.seq, prev: `「${o.from.title}」 ${o.from.res}` }); }
    else if (P.ip === 'toon' || P.ip === 'novel') {
      const sn = P.ip === 'toon' ? '웹툰' : '웹소설';
      for (let i = 0; i < 4; i++) {
        const g = gen(i), w = pickIndustry(s, sn + ' 작가', fresh, 0.3), fans = Math.round(Math.pow(10, U.fl(4.3, 6.5)) / 1e3) * 1e3, q = U.clamp(Math.round(lv(w, 'script') * 0.5 + U.int(10, 40) + (Math.log10(fans) - 5) * 4), 10, 95);
        L.push({ src: sn, title: ttl(g), genre: g, q, w: w.id, fans, price: ani ? coARightsPrice(P.kind, fans, q) : coVRightsPrice(P.kind, fans, q) });
      }
      // 내가 완결한 웹툰 · 웹소설 (js/webnovel.js): 판권료가 없다 (드라마 · 영화는 각색료만)
      for (const w of coMyWb(s, P, sn)) L.push({ src: sn, mine: 1, title: w.title, genre: ani ? w.g : WB_DRAMA_G[w.g] || '로맨스', q: w.q, w: 'me', wbId: w.id, fans: w.peak, price: ani ? 0 : Math.round(coVScriptPrice(P.kind, w.q) * 0.5 / 1e6) * 1e6 });
    } else {
      for (let i = 0; i < 4; i++) { const g = gen(i), w = pickIndustry(s, '시나리오 작가', fresh), q = sq(w); L.push({ title: ttl(g), genre: g, q, w: w.id, price: sp(q) }); }
      for (const sc of coMyOrig(s, P)) L.push({ mine: 1, title: sc.title, genre: sc.genre, q: sc.q, w: 'me', scId: sc.id, price: 0 });
    }
  },
  tbl(s, d) { return Object.assign(chPplTbl(s, this.ch(s, d), [['t', '제목'], ['src', '종류'], ['gen', '장르'], ['q', d.P.f === 'anime' ? '이야기' : '각본'], ['w', '작가'], ['fans', '원작 독자'], ['prev', '저번 작품'], ['price', '값']], '이 작품으로 한다'), { sort: ['q', -1] }); },
  text: (s, d) => { const P = d.P, v = coVView(s, 'script', P.f); return `${CO_IP_N[P.ip] || ''} ${coPKindN(P)}${P.genre && P.ip !== 'seq' ? ` · ${P.genre}` : ''} — 어느 작품으로 할까?${P.ip === 'seq' ? ' 후속작은 시나리오 작가가 이어서 쓴다.' : ''}\n\n${P.f === 'anime' ? '이야기' : '각본'} 보는 눈: ${v.id === s.me ? '내 눈' : `기획 PD ${v.name}`}`; },
  ch: (s, d) => {
    const P = d.P, ani = P.f === 'anime', v = coVView(s, 'script', P.f), tr = ani ? (s.trendTV || {}).anime : s.trendTV.drama, C = [];
    for (const m of d.ms) {
      const w = m.w === 'me' ? me(s) : s.people[m.w], wn = m.w === 'me' ? '나' : w ? `${w.name} 작가` : '-', gr = m.mine ? myScriptGrade(s, m.q) : grade5(v, m.q, 'q', 'script');
      const kind = m.mine ? `내 ${m.src || '원고'}` : m.src || (m.seq ? `${m.seq.n}편째` : ani ? '오리지널 기획안' : '오리지널 각본');
      C.push({ row: { t: [m.title, `「${m.title}」`], src: [kind, kind], gen: [m.genre, m.genre], q: coCellG(gr, 'q'), w: [wn, wn], fans: [m.fans || 0, m.fans ? fmtFans(m.fans) : '-'], prev: [m.prev || '', m.prev || '-'], price: [m.price, m.price ? fmtWon(m.price) : '-'] }, tr: m.genre === tr, t: `「${m.title}」 ${m.genre} · ${kind}`, h: m.price ? fmtWon(m.price) : '', f: s => {
        Object.assign(P, { title: m.title, genre: m.genre, q: m.q, writer: m.wbId ? null : m.w, price: m.price, scId: m.scId, wbId: m.wbId, lic: !!m.src, src: m.src ? { kind: m.src, fans: m.fans } : m.seq ? m.seq.src || null : null });
        if (m.seq) P.seq = m.seq;
        fireEvent(s, ani ? 'co_adir' : 'co_vdir', { P }); return '';
      } });
    }
    return C.concat([{ t: '다른 IP를 고른다', f: s => { fireEvent(s, 'co_vip', { P }); return ''; } }, { t: '그만둔다', f: () => '작품 기획을 접었다.' }]);
  },
});
const CO_IP_N = { orig: '오리지널', seq: '후속작', toon: '웹툰 원작', novel: '웹소설 원작' };

// ───── 2. 각본 ─────
// 시장에 나온 각본 3편 (후속작이면 같은 장르·제목으로 쓴 각본) · 서랍 속 다 써 둔 내 원고 (새 작품만)
function coVScriptPrice(kind, q) { return Math.round(V_KIND[kind].script * (0.6 + q / 100) * U.fl(0.8, 1.2) / 1e6) * 1e6; }
E({
  id: 'co_vscript', cat: '작품 기획', title: '각본 고르기', tag: 'career', noRes: 'toast',
  cond: s => coOn(s),
  init(s, d) {
    const P = d.P, t = coT(s);
    d.ms = [];
    for (let i = 0; i < 3; i++) {
      const genre = P.seq ? P.seq.genre : i === 0 && U.chance(0.5) ? s.trendTV.drama : U.pick(DRAMA_TRENDS), w = pickIndustry(s, '시나리오 작가');
      const q = U.clamp(Math.round(lv(w, 'script') * 0.6 + U.int(5, 40) + coVTier(t) * 2), 10, 95);
      d.ms.push({ title: P.seq ? P.seq.title : dramaTitle(genre), genre, q, w: w.id, price: coVScriptPrice(P.kind, q) });
    }
  },
  // v178: 곡 고르기처럼 표로 (내 원고 · 내 웹툰 · 웹소설은 표 아래 버튼)
  tbl(s, d) { return Object.assign(chPplTbl(s, this.ch(s, d), [['t', '제목'], ['gen', '장르'], ['q', '각본'], ['w', '작가'], ['price', '각본료']], '이 각본으로 한다'), { sort: ['q', -1] }); },
  text: (s, d) => `${d.P.seq ? `「${d.P.seq.title}」` : `새 ${vKindN(d.P.kind)}`} 각본을 고른다.\n\n각본 보는 눈: ${coVView(s, 'script', d.P.f).id === s.me ? '내 눈' : `기획 PD ${coVView(s, 'script', d.P.f).name}`}`,
  ch: (s, d) => {
    const P = d.P, v = coVView(s, 'script', d.P.f), C = [];
    for (const m of d.ms) { const w = s.people[m.w]; C.push({ row: { t: [m.title, `「${m.title}」`], gen: [m.genre, m.genre], q: coCellG(grade5(v, m.q, 'q', 'script'), 'q'), w: [w ? w.name : '-', w ? `${w.name} 작가` : '-'], price: [m.price, fmtWon(m.price)] }, t: `「${m.title}」 ${m.genre} · 각본 ${grade5(v, m.q, 'q', 'script')}`, tr: m.genre === s.trendTV.drama, h: `${w ? w.name : '-'} 작가 · 각본료 ${fmtWon(m.price)}`, f: s => { Object.assign(P, { title: m.title, genre: m.genre, q: m.q, writer: m.w, price: m.price }); fireEvent(s, 'co_vdir', { P }); return ''; } }); }
    if (!P.seq) for (const sc of myScripts(s).filter(x => x.st === 'done' && x.tk === P.kind)) C.push({ t: `내 원고 「${sc.title}」 ${sc.genre} · 완성도 ${myScriptGrade(s, sc.q)}`, tr: sc.genre === s.trendTV.drama, h: '내가 쓴 원고', f: s => { Object.assign(P, { title: sc.title, genre: sc.genre, q: sc.q, writer: 'me', scId: sc.id, price: 0 }); fireEvent(s, 'co_vdir', { P }); return ''; } });
    // 내가 완결한 웹툰·웹소설 (js/webnovel.js): 원작료 없이 각색료만 낸다
    if (!P.seq) for (const w of wbMyWorks(s).filter(x => !x.video)) { const g = WB_DRAMA_G[w.g] || '로맨스', price = Math.round(coVScriptPrice(P.kind, w.q) * 0.5 / 1e6) * 1e6; C.push({ t: `내 ${w.sn} 「${w.title}」 원작 · ${g}`, tr: g === s.trendTV.drama, h: `독자 ${fmtFans(w.peak)} · 각색료 ${fmtWon(price)}`, f: s => { Object.assign(P, { title: w.title, genre: g, q: w.q, writer: null, wbId: w.id, price }); fireEvent(s, 'co_vdir', { P }); return ''; } }); }
    return C.concat([{ t: '그만둔다', f: () => '작품 기획을 접었다.' }]);
  },
});

// ───── 3. 감독 ─────
function coVDirFee(kind, x) { return Math.round((V_KIND[kind].dir * (0.5 + lv(x, 'direct') / 80) + (x.fame || 0) * V_KIND[kind].star * 0.3) * U.fl(0.9, 1.1) / 1e6) * 1e6; }
// 섭외 가능성: 각본이 좋을수록, 회사가 클수록·평판이 좋을수록 쉽다. 이름난 감독, 실력 좋은 감독일수록 까다롭다
function coVHireP(s, t, P, x, k, sup) {
  const star = Math.log10(1 + (x.fame || 0)), f = coPF(P), F = t.f[f];
  return U.clamp(U.sig((P.q * 0.4 + coTier(t, f) * 7 + F.rep * 0.15 + (P.lvlHint || 0) + (sup ? 10 : 0) - star * 6 - lv(x, k) * 0.15 + 16) / 7) + relBonus(s, x), 0.05, 0.95);
}
// v178: 감독 · 배우 · 성우 · 작화감독 섭외도 오디션처럼 표로 (company.js chPplTbl): 이름 · 성별 · 나이 · 실력(보는 눈의 범위) · 팬 · 돈 · 섭외 가능성 · 관계 · 비고
const CO_PJ_COLS = Object.fromEntries([['direct', '연출', '연출료'], ['acting', '연기', '출연료'], ['art', '그림', '계약금']].map(([k, n, fee]) => [k, [[k, n], ['fame', '팬'], ['fee', fee], ['p', '섭외 가능성'], ['rel', '관계'], ['nt', '비고']]]));
function coPjRow(s, x, v, ks, c, feeN, nt) { return Object.assign(pplCells(s, x, v, ks), { fee: [c.fee, fmtWon(c.fee)], p: [c.p == null ? 1 : c.p, c.p == null ? '꼭 해 준다' : fmtPct(c.p)], nt: [nt ? 1 : 0, nt || ''] }); }
E({
  id: 'co_vdir', cat: '작품 기획', title: '감독 섭외', tag: 'career', noRes: 'toast',
  cond: s => coOn(s),
  init(s, d) {
    if (d.c) return;
    const P = d.P, t = coT(s), L = [];
    const back = P.seq && s.people[P.seq.prevDir];
    if (back && back.alive !== false) L.push(back);
    while (L.length < 3) L.push(pickIndustry(s, '연출감독', y => !L.includes(y), 0.4));
    d.c = L.map(x => ({ id: x.id, fee: Math.round(coVDirFee(P.kind, x) * (back === x ? 1.3 : 1) / 1e6) * 1e6, p: coVHireP(s, t, P, x, 'direct'), back: back === x }));
  },
  text: (s, d) => `「${d.P.title}」 감독을 섭외한다.${d.no ? `\n\n${d.no}` : ''}\n\n연출 보는 눈: ${coVView(s, 'direct', d.P.f).id === s.me ? '내 눈' : `기획 PD ${coVView(s, 'direct', d.P.f).name}`}`,
  tbl(s, d) { return chPplTbl(s, this.ch(s, d), PPL_COLS.concat(CO_PJ_COLS.direct), '섭외 제안을 한다'); },
  ch: (s, d) => {
    const P = d.P, v = coVView(s, 'direct', d.P.f), C = d.c.filter(c => s.people[c.id]).map(c => {
      const x = s.people[c.id];
      return { pid: x.id, row: coPjRow(s, x, v, ['direct'], c, '연출료', c.back ? '저번 감독' : ''), t: `${x.name} 감독 — 연출 ${coLvSee(v, x, 'direct')} · 팬 ${fmtFans(x.fame || 0)}${c.back ? ' · 저번 감독' : ''}`, h: `연출료 ${fmtWon(c.fee)} · 섭외 가능성 ${fmtPct(c.p)} · ${relWord(x)}`, f: s => {
        if (U.chance(c.p)) { Object.assign(P, { dir: x.id, dirFee: c.fee }); fireEvent(s, 'co_vcast', { P }); return `${josa(x.name, '이가')} 「${P.title}」 연출을 맡기로 했다.`; }
        fireEvent(s, 'co_vdir', { P, c: d.c.filter(y => y.id !== c.id), no: `${josa(x.name, '이가')} 거절했다. 다른 감독을 찾아본다.` });
        return `${josa(x.name, '이가')} 「${P.title}」 연출 제안을 거절했다.`;
      } };
    });
    if (has(me(s), 'direct')) C.push({ t: `내가 연출한다 — 연출 ${lvi(me(s), 'direct')}`, h: '촬영하는 동안 스트레스가 쌓인다', f: s => { Object.assign(P, { dir: "me", dirFee: 0 }); fireEvent(s, "co_vcast", { P }); return `${josa(`「${P.title}」`, "은는")} 내가 직접 연출하기로 했다.`; } });
    return C.concat([{ t: '그만둔다', f: () => '작품 기획을 접었다.' }]);
  },
});

// ───── 4. 주연 · 조연 (애니는 성우) ─────
// 주연 1~2명과 조연을 합쳐 4명 이상, 작품마다 정한 성별 조건(P.need)을 채워야 마칠 수 있다. 4명을 넘기면 자본금이 출연료를 감당하는 만큼 더 쓸 수 있다 (v180: 조연은 몇 명이든)
const CO_V_CAST = { min: 4, max: 8, leads: 2 };
function coVCastFee(P, x, role) { const V = coPK(P); return Math.round((V.cast + (x.fame || 0) * V.star) * (role === 'sup' ? 0.4 : 1) * U.fl(0.9, 1.1) / 1e6) * 1e6; }
// 섭외한 배우 목록 (예전 세이브에서 만들던 작품은 주연·조연 한 명씩)
function coVCast(P) { return P.cast || [{ id: P.lead, role: 'lead', fee: P.leadFee || 0 }, { id: P.sup, role: 'sup', fee: P.supFee || 0 }].filter(c => c.id); }
function coVCastFees(P) { return coVCast(P).reduce((a, c) => a + (c.fee || 0), 0); }
function coVCastN(s, P, role) { return coVCast(P).filter(c => c.role === role).map(c => (s.people[c.id] || {}).name || '-').join('·'); }
function coVCastLine(s, P) { const sp = coVCastN(s, P, 'sup'); return `주연 ${coVCastN(s, P, 'lead') || '-'}${sp ? ` · 조연 ${sp}` : ''}`; }
// 작품 줄의 사람 칩 (v177): 감독 · 작화감독 · 원화 · 주연 · 조연을 누르면 그 사람 정보 창
function coPjPpl(s, P) { const L = []; const add = (id, r) => { if (id && id !== 'me' && s.people[id]) L.push({ id, lab: `${r} ${s.people[id].name}` }); }; add(P.dir, '감독'); add(P.key, '작화감독'); for (const id of P.team || []) add(id, '원화'); for (const c of coVCast(P)) add(c.id, c.role === 'lead' ? '주연' : '조연'); return L; }
// v180: 주연을 먼저 확정하고 조연으로 넘어간다. 표에서 여러 명을 체크해 한꺼번에 제안한다 (주연은 2명까지, 조연은 몇 명이든)
// 성별 조건(P.need)을 채워야 다음으로 넘어간다. 신인 줄은 체크하면 그때 사람을 만든다 (꼭 해 준다)
function coRookieFee(P, role) { return Math.round(coPK(P).cast * (role === 'lead' ? 0.3 : 0.15) / 1e5) * 1e5; }
// 후보: 주연 6명 · 조연 8명, 남녀가 고르게. keep = 지난번에 제안하지 않은 후보 (그대로 두고 모자란 만큼 새로 찾는다)
function coCastCands(s, t, P, role, keep) {
  const used = coVCast(P).map(c => c.id), job = P.f === 'anime' ? '성우' : '배우', L = (keep || []).map(c => s.people[c.id]).filter(Boolean), N = role === 'lead' ? 6 : 8;
  const back = role === 'lead' && !keep && P.seq && !used.includes(P.seq.prevLead) && s.people[P.seq.prevLead];
  if (back && back.alive !== false) L.push(back);
  const ok = y => y.alive !== false && y.id !== s.me && !used.includes(y.id) && !L.includes(y);
  const known = keep ? [] : people(s, x => x.job === job && ok(x) && has(x, 'acting'));
  if (known.length) L.push(U.pick(known));
  const pickG = g => { const have = industry(s, job, y => gNn(y) === g && ok(y)); return have.length && U.chance(0.35) ? U.pick(have) : makeIndustry(s, job, { g }); };
  while (L.length < N) { const nm = L.filter(x => gNn(x) === '남').length, nf = L.length - nm; L.push(pickG(nm < nf ? '남' : nf < nm ? '여' : U.pick(['남', '여']))); }
  return L.map(x => (keep || []).find(c => c.id === x.id) || { id: x.id, fee: Math.round(coVCastFee(P, x, role) * (back === x ? 1.3 : 1) / 1e5) * 1e5, p: coVHireP(s, t, P, x, 'acting', role === 'sup'), back: back === x });
}
const CO_RK = ['newm0', 'newm1', 'newf0', 'newf1'];
E({
  id: 'co_vcast', cat: '캐스팅', title: (s, d) => `${d.role === 'sup' ? '조연' : '주연'} ${d.P.f === 'anime' ? '성우' : '배우'} 섭외`, tag: 'career', noRes: 'toast',
  cond: s => coOn(s),
  init(s, d) {
    const P = d.P;
    if (!P.cast) P.cast = [];
    if (!P.need) P.need = CO_NEED0;
    if (!d.role) d.role = coLeadMet(s, P) ? 'sup' : 'lead';
    if (!d.c) d.c = coCastCands(s, coT(s), P, d.role);
  },
  text: (s, d) => {
    const P = d.P, lead = d.role === 'lead', nn = P.f === 'anime' ? '성우' : '배우', v = coVView(s, 'acting', P.f), lk = coLackTxt(coCastLack(s, P, d.role), nn), n = coVCast(P).length;
    return `「${P.title}」 ${lead ? '주연' : '조연'} ${nn}를 섭외한다. 여러 명을 체크해 한꺼번에 제안할 수 있다${lead ? ` (주연은 ${CO_V_CAST.leads}명까지)` : ''}.`
      + `\n\n이 작품에 필요한 ${nn}: 주연 ${coNeedTxt((P.need || CO_NEED0).lead)} · 조연 ${coNeedTxt((P.need || CO_NEED0).sup)}${lk ? `\n아직 모자란 ${lead ? '주연' : '조연'}: ${lk}` : ''}`
      + `${n ? `\n섭외한 ${nn} ${n}명: ${coVCastLine(s, P)} · 출연료 ${fmtWon(coVCastFees(P))}` : ''}${!lead && n >= CO_V_CAST.min ? `\n${CO_V_CAST.min}명을 넘겨 더 쓰려면 자본금이 출연료를 감당해야 한다 (자본금 ${fmtWon(coM(coT(s), coPF(P)))})` : ''}`
      + `${d.no ? `\n\n${d.no}` : ''}\n\n연기 보는 눈: ${v.id === s.me ? '내 눈' : `기획 PD ${v.name}`}`;
  },
  form: () => [],
  tbl(s, d) {
    const P = d.P, v = coVView(s, 'acting', P.f), lead = d.role === 'lead', nn = P.f === 'anime' ? '성우' : '배우', nf = coRookieFee(P, d.role);
    const rows = d.c.filter(c => s.people[c.id]).map(c => ({ k: c.id, cells: coPjRow(s, s.people[c.id], v, ['acting'], c, '출연료', c.back ? '저번 주연' : '') }));
    for (const k of CO_RK) { const g = k[3] === 'f' ? '여' : '남'; rows.push({ k, cells: { n: [`~신인${k}`, `신인 ${nn} (${g})`], g: [g, g], a: [23, '19~27세'], acting: [-1, '?'], fame: [0, '-'], fee: [nf, fmtWon(nf)], p: [1, '꼭 해 준다'], rel: ['', '-'], nt: [1, '처음 보는 신인'] } }); }
    return { cols: PPL_COLS.concat(CO_PJ_COLS.acting.map(c => c[0] === 'fee' ? ['fee', '출연료'] : c)), rows, sort: ['acting', -1], cnt: { n: lead ? '고른 주연' : '고른 조연', min: 0, max: lead ? CO_V_CAST.leads - coVCast(P).filter(c => c.role === 'lead').length : 0 } };
  },
  submitT: () => '섭외 제안을 한다',
  // 조연 단계: 성별 조건을 다 채우면 '섭외를 마친다'가 초록색으로 켜진다
  fbtn: (s, d) => {
    if (d.role !== 'sup') return [];
    const P = d.P, nn = P.f === 'anime' ? '성우' : '배우', ok = coCastMet(s, P), lk = coLackTxt(coCastLack(s, P, 'sup'), nn);
    return [{ t: '섭외를 마친다', go: true, ok, h: ok ? `${nn} ${coVCast(P).length}명 · 출연료 ${fmtWon(coVCastFees(P))}` : lk ? `조연 ${lk}이 더 필요하다` : `${nn}를 ${CO_V_CAST.min}명 이상 섭외해야 한다`, f: s => { fireEvent(s, 'co_vbud', { P }); return ''; } }];
  },
  cancel: () => '작품 기획을 접었다.', cancelT: () => '그만둔다',
  submit(s, d, v) {
    const t = coT(s), P = d.P, role = d.role, lead = role === 'lead', ani = P.f === 'anime', nn = ani ? '성우' : '배우', roleN = lead ? '주연' : '조연', f = coPF(P);
    const pick = d.c.filter(c => v[c.id] && s.people[c.id]), nk = Object.keys(v).filter(k => /^new[mf]\d$/.test(k) && v[k]), n = pick.length + nk.length;
    if (!n) return { err: `제안할 ${nn}를 체크해 주세요` };
    const leads = coVCast(P).filter(c => c.role === 'lead').length;
    if (lead && leads + n > CO_V_CAST.leads) return { err: `주연은 ${CO_V_CAST.leads}명까지예요${leads ? ` (이미 ${leads}명)` : ''}` };
    // 성별 조건: 이번에 제안한 사람이 다 받아 준다고 쳐도 모자라면 다시 고른다
    const G = coCastG(s, P, role); for (const c of pick) G[gNn(s.people[c.id]) === '여' ? 'f' : 'm']++; for (const k of nk) G[k[3]]++;
    const lk = coLackTxt(coNeedLack(G, (P.need || CO_NEED0)[role]), nn);
    if (lk) return { err: `${roleN}에 ${lk}이 더 필요해요` };
    const rf = coRookieFee(P, role), fee = pick.reduce((a, c) => a + c.fee, 0) + nk.length * rf;
    if (coVCast(P).length + n > CO_V_CAST.min && coM(t, f) < coVUpfront(P) + fee) return { err: `자본금이 모자라요 (이번 출연료 ${fmtWon(fee)} · 지금까지 낼 돈 ${fmtWon(coVUpfront(P))} · 자본금 ${fmtWon(coM(t, f))})` };
    const yes = [], no = [];
    for (const c of pick) { const x = s.people[c.id]; if (U.chance(c.p)) { P.cast.push({ id: x.id, role, fee: c.fee }); yes.push(x.name); } else no.push(x.name); }
    for (const k of nk) { const x = makeIndustry(s, nn, { age: U.int(19, 27), fame: U.int(20, 300), g: k[3] === 'f' ? '여' : '남' }); P.cast.push({ id: x.id, role, fee: rf }); yes.push('신인 ' + x.name); }
    if (!P.lead) { const c = P.cast.find(c => c.role === 'lead'); if (c) P.lead = c.id; }
    const rest = d.c.filter(c => !pick.includes(c)), nt = no.length ? `${josa(no.join('·'), '이가')} 거절했다. 다른 ${nn}를 찾아본다.` : '';
    if (lead && coLeadMet(s, P)) fireEvent(s, 'co_vcast', { P, role: 'sup' });
    else fireEvent(s, 'co_vcast', { P, role, c: coCastCands(s, t, P, role, rest), no: nt });
    return { log: [yes.length ? `${josa(yes.join('·'), '이가')} 「${P.title}」 ${roleN}${ani ? ' 목소리를' : '을'} 맡기로 했다.` : '', no.length ? `${josa(no.join('·'), '은는')} ${roleN} 제안을 거절했다.` : ''].filter(Boolean).join(' ') };
  },
});

// ───── 5. 제작비 ─────
// 시작할 때 한꺼번에 내는 돈: 각본료(원작 판권)·연출료·출연료 (애니는 작화감독·원화 계약금도)
function coVUpfront(P) { return (P.price || 0) + (P.dirFee || 0) + coVCastFees(P) + (P.keyFee || 0) + (P.teamFee || 0); }
E({
  id: 'co_vbud', cat: '작품 기획', title: '제작비 정하기', tag: 'career', noRes: 'toast',
  cond: s => coOn(s),
  text: (s, d) => { const t = coT(s), P = d.P; return P.f === 'anime'
    ? `「${P.title}」에 제작비를 얼마나 쓸까? 동화·채색·배경·CG, 음악과 녹음에 쓰는 돈이다. 많이 쓸수록 작화가 좋아지지만, 본전을 찾으려면 더 많이 벌어야 한다.\n\n시작할 때 낼 돈: 원작·연출·작화팀·성우 ${fmtWon(coVUpfront(P))} · 자본금 ${fmtWon(coM(t, coPF(P)))}`
    : `「${P.title}」에 제작비를 얼마나 쓸까? 세트·장소·의상, 촬영 장비와 스태프, CG·음악·편집에 쓰는 돈이다. 많이 쓸수록 볼거리가 좋아지지만, 본전을 찾으려면 더 많이 벌어야 한다.\n\n시작할 때 낼 돈: 각본료·연출료·출연료 ${fmtWon(coVUpfront(P))} · 자본금 ${fmtWon(coM(t, coPF(P)))}`; },
  ch: (s, d) => {
    const t = coT(s), P = d.P, V = coPK(P), ani = P.f === 'anime', C = [];
    for (let l = 0; l <= coTier(t, coPF(P)); l++) { const m = V.prep + coPShoot(P, l); C.push({ t: `${(ani ? A_BUD_N : V_BUD_N)[l]} · 제작비 ${fmtWon(V.bud[l])}`, h: `${ani ? '기획·작화' : '준비·촬영'} ${m}개월 동안 달마다 ${fmtWon(Math.round(V.bud[l] / m / 1e4) * 1e4)}`, f: s => { Object.assign(P, { lvl: l, bud: V.bud[l] }); fireEvent(s, 'co_vdist', { P }); return ''; } }); }
    return C.concat([{ t: '그만둔다', f: () => '작품 기획을 접었다.' }]);
  },
});

// ───── 6. 거는 곳 (배급사 · 방송사 · 플랫폼) ─────
// 받아 줄 가능성: 각본·감독·주연을 정확히 보고 작품이 얼마나 될지 가늠한다. 큰 곳일수록 까다롭다
function coVEst(s, P) { const dir = P.dir === 'me' ? me(s) : s.people[P.dir], lead = s.people[P.lead]; return P.q * 0.28 + (dir ? lv(dir, 'direct') : 40) * 0.32 + (lead ? lv(lead, 'acting') : 35) * 0.1 + (lead ? Math.log10(1 + (lead.fame || 0)) : 1) + coASrcHype(P) + V_BUD_SC[P.lvl] + 9; }
function coVDistP(s, t, P, D) { return U.clamp(U.sig(((P.f === 'anime' ? coAEst(s, P) : coVEst(s, P)) - 55 + P.lvl * 4 + (coTier(t, coPF(P)) - 1) * 4 - (D.tier - 1) * 8 + 6) / 6), 0.05, 0.97); }
E({
  id: 'co_vdist', cat: '작품 기획', title: (s, d) => `${V_CH_S[coPK(d.P).ch]} 정하기`, tag: 'career', noRes: 'toast',
  cond: s => coOn(s),
  init(s, d) { if (!d.ids) d.ids = DISTRIBUTORS.filter(D => D.ch === coPK(d.P).ch).map(D => D.id); },
  text: (s, d) => { const P = d.P; return `${josa(`「${P.title}」`, "을를")} 어디에 걸까? ${V_CH_N[coPK(P).ch]}마다 수수료와 힘이 다르다. 큰 곳일수록 많이 보여 주고 홍보도 세게 하지만, 수수료가 높고 작은 작품은 거절하기도 한다.${d.no ? `\n\n${d.no}` : ''}`; },
  ch: (s, d) => {
    const t = coT(s), P = d.P;
    return d.ids.map(id => DIST[id]).map(D => {
      const T = DIST_T[D.tier], p = coVDistP(s, t, P, D), ott = D.ch === 'ott';
      return { t: `${D.n} (${vChLabel(D)})`, h: `${ott ? `제작비에 이윤 ${Math.round((T.margin - 1) * 100)}%를 얹어 산다` : `수수료 ${Math.round(T.fee * 100)}% · ${D.ch === 'film' ? '상영관' : D.ch === 'tv' ? '편성' : '노출'} ${'★'.repeat(D.tier)}`} · 홍보 ${'★'.repeat(D.tier)} · 받아 줄 가능성 ${fmtPct(p)}`, f: s => {
        if (U.chance(p)) { const msg = (P.f === 'anime' ? coAStart : coVStart)(s, t, Object.assign(P, { dist: D.id })), L = (P.f === 'anime' ? t.aw : t.vw) || []; fireEvent(s, 'co_vgo', { f: coPF(P), id: (L[L.length - 1] || {}).id, msg }); return ''; }
        const rest = d.ids.filter(x => x !== D.id);
        if (!rest.length) return `${josa(D.n, '이가')} ${josa(`「${P.title}」`, "을를")} 거절했다. 받아 줄 곳이 없어 기획을 접었다.` + fx(s, { stress: 4 });
        fireEvent(s, 'co_vdist', { P, ids: rest, no: `${josa(D.n, '이가')} 거절했다.` });
        return `${josa(D.n, '이가')} ${josa(`「${P.title}」`, "을를")} 거절했다.`;
      } };
    }).concat([{ t: '그만둔다', f: () => '작품 기획을 접었다.' }]);
  },
});
// 작품 시작: 각본료·연출료·출연료를 내고, 함께할 사람들을 만난다
function coVStart(s, t, P) {
  const V = V_KIND[P.kind], up = coVUpfront(P);
  coAuto(t).want.video = false;
  coOut(t, P.price || 0, P.lic ? '원작 판권' : '각본료', 'video'); coOut(t, P.dirFee || 0, '연출료', 'video'); coOut(t, coVCastFees(P), '출연료', 'video');
  if (P.scId) { const sc = myScripts(s).find(x => x.id === P.scId); if (sc) sc.st = 'mine'; }
  if (P.wbId) wbMark(s, P.wbId, 'video');
  const where = `${V.n} 「${P.title}」`;
  for (const id of [P.writer, P.dir, ...coVCast(P).map(c => c.id)]) { const x = id && id !== 'me' && s.people[id]; if (x) meetAt(s, x, where, 'agency'); }
  const shoot = V.shoot + (P.kind === 'film' && P.lvl >= 2 ? 1 : 0);
  const pj = Object.assign({}, P, { id: 'v' + U.uid(), stage: 'prep', left: V.prep, shootN: shoot, paidB: 0, perM: Math.ceil(P.bud / (V.prep + shoot) / 1e4) * 1e4, up, t0: s.t });
  (t.vw = t.vw || []).push(pj);
  return `「${P.title}」 제작을 시작했다! ${josa(DIST[P.dist].n, '과와')} 손잡았다. 각본료·연출료·출연료 ${fmtWon(up)}을 냈고, 제작비 ${fmtWon(P.bud)}은 ${V.prep + shoot}개월 동안 나눠 낸다.`;
}
// 제작 중단: 들인 돈은 돌려받지 못한다
function coVDrop(s, t, pj) { t.vw = t.vw.filter(x => x !== pj); coVRepF(t, 'video', -2); return `「${pj.title}」 제작을 중단했다. 들인 돈은 돌려받지 못한다.`; }
// ───── 제작 시작 창 (v180) ─────
// 거는 곳까지 정하면 보통 사건 창과 다른 모양의 창을 띄운다: 슬레이트(애니는 물감 띠)가 탁 닫히고, 제목 · 함께하는 사람 · 돈 · 공개까지 남은 일정을 한 장에
// d = { f: 'video' | 'anime', id: 작품 id, msg: 시작 글 }. CEO가 맡은 회사면 CEO가 그냥 닫는다 (기록만)
function coGoHTML(s, d) {
  const t = coT(s), ani = d.f === 'anime', pj = ((ani ? t.aw : t.vw) || []).find(x => x.id === d.id);
  if (!pj) return `<div class="go-wrap"><div class="go-msg">${U.esc(d.msg || '')}</div></div>`;
  const K = (ani ? A_KIND : V_KIND)[pj.kind], D = DIST[pj.dist], nm = id => id === 'me' ? me(s).name : (s.people[id] || {}).name || '';
  const chip = (id, lab) => { const x = id && id !== 'me' && s.people[id]; return x ? pchipHTML(x, lab) : id === 'me' ? `<span class="pchip me">${U.esc(lab)}</span>` : ''; };
  const cast = r => coVCast(pj).filter(c => c.role === r).map(c => chip(c.id, nm(c.id))).join('');
  const st = ani ? ['기획·콘티', '작화', '녹음·후반'] : ['촬영 준비', '촬영', '후반 작업'], mo = [K.prep, pj.shootN, K.post], tot = mo[0] + mo[1] + mo[2], ym = ymOfT(s, s.t + tot);
  const ipN = pj.seq ? `${pj.seq.n}편째` : pj.src ? `${pj.src.kind} 원작` : '오리지널';
  const cell = (k, v) => v ? `<div class="go-c"><b>${U.esc(k)}</b><div>${v}</div></div>` : '';
  const writer = pj.writer === 'me' ? `<span class="pchip me">${U.esc(me(s).name)} (나)</span>` : pj.wbId ? `<span class="pchip me">${U.esc(me(s).name)} (내 ${U.esc(pj.src ? pj.src.kind : '원작')})</span>` : chip(pj.writer, nm(pj.writer));
  return `<div class="go-wrap${ani ? ' ani' : ''}"><div class="go-slate"><i></i></div>`
    + `<div class="go-head"><span class="go-badge">${ani ? '🎨 제작 시작' : '🎬 크랭크인'}</span><span class="go-co">${U.esc(coFName(t, d.f))}</span></div>`
    + `<div class="go-title">「${U.esc(pj.title)}」</div>`
    + `<div class="go-tags">${[K.n, pj.genre, ipN, `${(ani ? A_BUD_N : V_BUD_N)[pj.lvl]} 제작비`].filter(Boolean).map(x => `<span>${U.esc(x)}</span>`).join('')}</div>`
    + `<div class="go-grid">${cell(ani ? '감독' : '감독', pj.dir === 'me' ? `<span class="pchip me">${U.esc(me(s).name)} (나)</span>` : chip(pj.dir, nm(pj.dir)))}${cell(pj.lic ? '원작' : ani ? '기획안' : '각본', writer)}${ani ? cell('작화감독', chip(pj.key, nm(pj.key))) + cell('원화', `${(pj.team || []).length}명`) : ''}${cell(ani ? '주연 성우' : '주연', cast('lead'))}${cell(ani ? '조연 성우' : '조연', cast('sup'))}</div>`
    + `<div class="go-money"><div><b>${U.esc(V_CH_S[D.ch])}</b>${U.esc(D.n)}</div><div><b>제작비</b>${fmtWon(pj.bud)}</div><div><b>먼저 낸 돈</b>${fmtWon(pj.up)}</div><div><b>자본금</b>${fmtWon(coM(t, d.f))}</div></div>`
    + `<div class="go-tl">${st.map((n, i) => `<div class="go-seg s${i}" style="flex:${mo[i]}"><span>${U.esc(n)}</span><em>${mo[i]}개월</em></div>`).join('')}<div class="go-end">🎉 공개<br><b>${ym.y}년 ${ym.m}월</b></div></div>`
    + `</div>`;
}
E({
  id: 'co_vgo', cat: '제작 시작', title: (s, d) => d.f === 'anime' ? '애니 제작 시작' : '작품 제작 시작', tag: 'career', keepPop: true, card: 'go-card',
  cond: s => coOn(s),
  text: (s, d) => d.msg || '',
  html: (s, d) => coGoHTML(s, d),
  ch: (s, d) => [{ t: d.f === 'anime' ? '좋아, 시작하자!' : '레디, 액션!', f: () => d.msg || '' }],
});

// ───── 한 달 ─────
function coVidMonth(s, t, sales) {
  const p = me(s);
  for (const pj of t.vw.slice()) {
    if (pj.stage === 'prep' || pj.stage === 'shoot') { const m = Math.min(pj.perM, pj.bud - pj.paidB); if (m > 0) { coOut(t, m, '제작비', 'video'); pj.paidB += m; } }
    if (pj.stage === 'shoot' && pj.dir === 'me') { practice(s, p, 'direct', 1.2); addStress(s, 2); }
    if (--pj.left > 0) continue;
    if (pj.stage === 'prep') { pj.stage = 'shoot'; pj.left = pj.shootN; addLog(s, `🎬 「${pj.title}」 촬영을 시작했다. ${pj.left}개월 동안 찍는다.`, 'career'); }
    else if (pj.stage === 'shoot') { pj.stage = 'post'; pj.left = V_KIND[pj.kind].post; addLog(s, `🎬 「${pj.title}」 촬영을 마쳤다. 후반 작업에 들어간다.`, 'career'); }
    else { t.vw = t.vw.filter(x => x !== pj); queueEv(s, 'co_vres', 0, { pj }, true); }
  }
  // 광고·뮤직비디오 제작 의뢰 (대표가 영업을 하면 더 자주)
  const k = coVTier(t);
  if (!s.inbox.some(m => m.kind === 'co_vad') && U.chance((0.03 + k * 0.02) * (sales ? coSalesM(s, 1.5) : 1))) {
    const mv = U.chance(0.35), b = U.pick(BRANDS), fee = Math.round(CO_VAD[k] * U.fl(0.7, 1.3) / 1e6) * 1e6;
    sendMsg(s, 'co_vad', { from: mv ? '음반 기획사' : b.n, title: mv ? '뮤직비디오 제작 의뢰' : '광고 제작 의뢰', months: 2, d: { what: mv ? '새 뮤직비디오' : `${b.cat} 광고`, fee } });
  }
}
// 제작 의뢰 글 (v179): 받는 회사 · 받는 돈 · 드는 돈 · 회사에 남는 돈 · 지금 자본금을 한눈에
function coAdText(s, m, f, verb) {
  const t = coOn(s) ? coT(s) : null, fee = m.d.fee, r = v => Math.round(fee * v / 1e5) * 1e5;
  return `${m.from}에서 ${m.d.what} 제작을 맡아 달라고 한다.\n\n받는 돈 ${fmtWon(fee)} · ${verb} 데 드는 돈 ${fmtWon(r(0.55))}~${fmtWon(r(0.75))}\n회사에 남는 돈 ${fmtWon(r(0.25))}~${fmtWon(r(0.45))} (보통 ${fmtWon(r(0.35))})${t && t.f[f] ? `\n지금 「${coFName(t, f)}」 자본금 ${fmtWon(coM(t, f))}` : ''}`;
}
function coAdTo(s, f, n) { const t = coOn(s) ? coT(s) : null; return t && t.f[f] ? `「${coFName(t, f)}」 (내 ${n})` : `내 ${n} (지금은 없음)`; }
INBOX.co_vad = {
  ic: '🎬',
  to: s => coAdTo(s, 'video', '영상 제작사'),
  text: (s, m) => coAdText(s, m, 'video', '찍는'),
  ch: (s, m) => [
    { t: '맡는다', ok: s => coOn(s) && !!coT(s).f.video, h: coOn(s) && coT(s).f.video ? '' : '영상 제작사를 운영하고 있어야 한다', f: s => { const t = coT(s), cost = Math.round(m.d.fee * U.fl(0.55, 0.75) / 1e5) * 1e5; coIn(t, m.d.fee, '광고·뮤직비디오 제작', 'video'); coOut(t, cost, '광고·뮤직비디오 제작비', 'video'); coVRepF(t, 'video', 0.3); return `「${t.name}」에서 ${m.from} ${josa(m.d.what, '을를')} 만들었다. 남은 돈 ${fmtWon(m.d.fee - cost)}.`; } },
    { t: '거절한다', f: () => `${m.from}의 제작 의뢰를 거절했다.` },
  ],
};

// ───── 공개 ─────
// 배우(성우) 점수: 주연 연기 평균, 잘하는 조연 두 명의 연기 평균, 화제성(주연 팬은 다, 조연 팬은 1/4), 5명째부터 한 명마다 조금씩 (다 합쳐 3까지)
function coCastSc(s, pj) {
  const cast = coVCast(pj).map(c => ({ x: s.people[c.id], role: c.role })).filter(c => c.x);
  const act = c => lv(c.x, 'acting'), mean = A => A.reduce((a, c) => a + act(c), 0) / A.length;
  const leads = cast.filter(c => c.role === 'lead'), sups = cast.filter(c => c.role === 'sup').sort((a, b) => act(b) - act(a));
  return {
    leads, la: leads.length ? mean(leads) : 35, sa: sups.length ? mean(sups.slice(0, 2)) : 35,
    star: Math.log10(1 + cast.reduce((a, c) => a + (c.x.fame || 0) * (c.role === 'lead' ? 1 : 0.25), 0)),
    ens: Math.min(3, cast.slice(CO_V_CAST.min).reduce((a, c) => a + 0.3 + act(c) / 100, 0)),
  };
}
function coVScore(s, t, pj) {
  const dir = pj.dir === 'me' ? me(s) : s.people[pj.dir], { leads, la, sa, star, ens } = coCastSc(s, pj);
  const dl = dir ? lv(dir, 'direct') + (pj.dir === 'me' ? (me(s).tal.aesth - 50) * 0.1 : 0) : 40;
  let hype = 0;
  // 후속작: 전작이 잘됐을수록 기대가 크지만, 여러 편 이어질수록 질린다. 전작 감독·주연이 돌아오면 반응이 좋다
  hype = coASrcHype(pj);
  if (pj.seq) hype += U.clamp((pj.seq.prevSc - 60) / 4, -4, 5) - 3 * Math.max(0, pj.seq.n - 2) + (pj.dir === pj.seq.prevDir ? 1.5 : 0) + (leads.some(c => c.x.id === pj.seq.prevLead) ? 1.5 : 0);
  return U.clamp(dl * 0.32 + pj.q * 0.28 + la * 0.1 + sa * 0.05 + star + ens + V_BUD_SC[pj.lvl] + coVTier(t) + DIST_T[DIST[pj.dist].tier].promo + (pj.genre === s.trendTV.drama ? 4 : 0) + hype - 1 + U.normal(0, 7), 0, 100);
}
// 수입 (회사로 들어오는 돈). 점수 62가 대략 본전이고, 12점 오를 때마다 극장·해외 쪽 수입이 두 배가 된다 (네 배까지)
function coVRev(s, t, pj, sc) {
  const B = pj.bud, D = DIST[pj.dist], T = DIST_T[D.tier], r = Math.min(4, Math.pow(2, (sc - 62) / 12)), L = [];
  const seqF = pj.seq ? 1 + U.clamp((pj.seq.prevSc - 60) / 40, 0, 0.5) * (pj.seq.n === 2 ? 1 : 0.6) : 1;
  let res;
  if (pj.kind === 'film') {
    const aud = Math.min(1.7e7, Math.round(B / FM_TICKET * r * T.pow * seqF / 100) * 100);
    res = `관객 ${fmtFans(aud)}`;
    L.push([`극장 수익 (배급 수수료 ${Math.round(T.fee * 100)}% 뗌)`, aud * FM_TICKET * (1 - T.fee)], ['VOD·해외 판매', B * 0.2 * Math.min(r, 3)]);
  } else if (pj.kind === 'drama') {
    res = filmRes('drama', sc + (T.pow - 1) * 10);
    L.push(['방영권', B * 0.6 * T.pow], ['간접광고', B * 0.1], [`해외·OTT 판매 (수수료 ${Math.round(T.fee * 100)}% 뗌)`, B * 0.45 * Math.min(r, 3) * seqF * (1 - T.fee)]);
  } else if (pj.kind === 'ott') {
    res = filmRes('ott', sc);
    L.push([`OTT 구매 (제작비·출연료 + 이윤 ${Math.round((T.margin - 1) * 100)}%)`, (B + pj.up) * T.margin]);
    if (sc >= 75) L.push(['흥행 보너스', B * 0.1 * (sc - 75) / 5]);
  } else {
    const views = Math.round(Math.pow(10, 4 + sc / 22) * T.pow * V_WEB_VIEW[pj.lvl] * seqF);
    res = `누적 조회수 ${fmtFans(views).replace('명', '회')}`;
    L.push(['플랫폼 구매', B * 0.75], [`조회수 광고 수익 (수수료 ${Math.round(T.fee * 100)}% 뗌)`, views * 30 * (1 - T.fee)]);
  }
  for (const x of L) x[1] = Math.round(x[1] / 1e5) * 1e5;
  return { L, res, total: L.reduce((a, x) => a + x[1], 0) };
}
E({
  id: 'co_vres', cat: '작품 성적', title: '우리 회사 작품 공개', tag: 'career',
  plio: (s, d) => d.pl !== undefined ? d.pl : (d.pl = typeof plioSpec === 'function' ? plioSpec({ k: 'film', t: `「${d.pj.title}」 하이라이트`, ch: coT(s).name, me: d.pj.dir === 'me' ? `${me(s).name} 감독` : '', sc: d.sc, rv: plioRv(d.review) }) : null),
  cond: s => coOn(s),
  init(s, d) {
    const t = coT(s), pj = d.pj, V = V_KIND[pj.kind], p = me(s);
    const sc = d.sc = coVScore(s, t, pj), R = coVRev(s, t, pj, sc);
    d.res = R.res; d.L = R.L; d.rev = R.total; d.cost = pj.bud + pj.up; d.profit = d.rev - d.cost;
    for (const [n, v] of R.L) coIn(t, v, n, 'video');
    if (pj.dir === 'me') d.review = dirReview(dirPerf(p, V.demand));
    // 평판: 점수가 52보다 높으면 오르고 낮으면 떨어진다 (작품이 클수록 크게)
    const dr = d.rd = U.clamp((sc - 52) / 3, -5, 8) * V.w;
    t.f.video.rep = U.clamp(t.f.video.rep + dr, 0, 100);
    // 대표 등급에 세는 흥행 크기: 대형 제작사의 드라마·영화가 점수 80이면 50만, 88이면 126만 (소형은 절반, 중형은 3/4)
    const hit = Math.round(Math.pow(10, 1.7 + sc / 20) * V.hit * [0, 0.5, 0.75, 1][coVTier(t)]);
    t.peakF = Math.max(t.peakF || 0, hit);
    if (pj.kind !== 'web' && sc > ((t.vyBest || {}).sc || 0)) t.vyBest = { sc, title: pj.title, kind: pj.kind };
    const ip = pj.seq ? pj.seq.ip : pj.id, n = pj.seq ? pj.seq.n : 1;
    t.vdone.push({ id: pj.id, ip, n, title: pj.title, base: pj.seq ? pj.seq.base : pj.title, kind: pj.kind, genre: pj.genre, sc: Math.round(sc), dir: pj.dir, lead: pj.lead, y: calY(s), res: d.res, profit: d.profit });
    coAuto(t).want.video = true;
    for (const id of [pj.dir, ...coVCast(pj).map(c => c.id)]) { const x = id && id !== 'me' && s.people[id]; if (x) bond(s, x, sc >= 60 ? U.int(2, 6) : U.int(-4, 1)); }
    addWork(s, { type: `${V.n} 제작`, title: pj.title, by: pj.dir === 'me' ? '제작·연출' : '제작', sc, note: `${t.name} · ${d.res}`, pay: 0 });
    if (pj.writer === 'me') d.wup = writerCredit(s, { title: pj.title, tk: pj.kind }, sc);
    if (!t.vfirst) { t.vfirst = true; milestone(s, `${age(s)}세에 「${t.name}」의 첫 작품 ${V.n} ${josa(`「${pj.title}」`, '을를')} 공개했다.`); }
    if (pj.kind === 'film' && sc >= 80 && !t.vhit) { t.vhit = true; milestone(s, `${age(s)}세에 우리 회사 영화 ${josa(`「${pj.title}」`, '이가')} ${d.res}을 모았다.`); }
  },
  text: (s, d) => { const pj = d.pj, D = DIST[pj.dist]; return `${vKindN(pj.kind)} ${josa(`「${pj.title}」`, '이가')} ${D.ch === 'film' ? `${D.n.replace(/ ?배급$/, '')} 배급으로 개봉했다` : D.ch === 'tv' ? `${D.n}에서 방영됐다` : `${D.n}에서 공개됐다`}.\n\n${d.res}${d.review ? ` · ${d.review}` : ''}\n\n${d.L.map(([n, v]) => `· ${n} ${fmtWon(v)}`).join('\n')}\n들어온 돈 ${fmtWon(d.rev)} · 쓴 돈 ${fmtWon(d.cost)} (제작비 ${fmtWon(pj.bud)} + 각본·연출·출연료 ${fmtWon(pj.up)})\n${d.profit >= 0 ? `남은 돈 ${fmtWon(d.profit)}` : `손해 ${fmtWon(-d.profit)}`}` + wupText(s, d); },
  // v174: 결과 창을 인터넷 기사로 (ui.js newsEvHTML). 들어온 돈 · 쓴 돈은 정산서로
  html: (s, d) => d.sc != null && d.L && typeof newsEvHTML === 'function' ? newsEvHTML(s, d, coWorkNews(s, d, 'video')) : '',
  news: (s, d) => coWorkNews(s, d, 'video'),
  ch: (s, d) => [{ t: '확인', f: () => `「${d.pj.title}」 공개. ${d.res} · ${d.profit >= 0 ? `남은 돈 ${fmtWon(d.profit)}` : `손해 ${fmtWon(-d.profit)}`}.` }],
});
// 우리 회사 작품(드라마 · 영화 · 애니) 기사 (v174): f 'video' 또는 'anime'
function coWorkNews(s, d, f) {
  const t = coT(s), pj = d.pj, an = f === 'anime', D = DIST[pj.dist] || { n: '', ch: 'web' }, K = an ? aKindN(pj.kind) : vKindN(pj.kind), co = coFName(t, f), Q = newsQ(pj.title), R = d.res;
  const dn = pj.dir === 'me' ? '' : (s.people[pj.dir] || {}).name, lead = coVCastN(s, pj, 'lead'), hit = d.sc >= 75, low = d.sc < 45, film = D.ch === 'film';
  const heads = hit ? [`${co} 제작 ${Q}, ${R}`, `${Q} ${R}…${co} 웃었다`] : low ? [`${co} 제작 ${Q}, ${R}에 그쳐`, `${co}의 ${Q}…아쉬운 성적`] : [`${co} 제작 ${K} ${Q} 공개…${R}`, `${K} ${Q}, ${R}`];
  const body = [
    `${josa(co, '이가')} 제작한 ${pj.genre ? pj.genre + ' ' : ''}${K} ${josa(Q, '이가')} ${film ? `${D.n.replace(/ ?배급$/, '')} 배급으로 개봉했다` : D.ch === 'tv' ? `${D.n}에서 방영됐다` : `${D.n}에서 공개됐다`}. 작품은 ${newsOut(R)}.`,
    [pj.dir === 'me' ? `연출은 ${me(s).name} 대표가 직접 맡았다.` : dn ? `연출은 ${dn} 감독이 맡았다.` : '', pj.writer === 'me' ? `각본도 ${me(s).name} 대표가 썼다.` : '', lead && lead !== '-' ? `${an ? '주인공 목소리는' : '주연은'} ${josa(lead, '이가')} 맡았다.` : '', pj.seq && pj.seq.n > 1 ? `${josa(Q, '은는')} ${pj.seq.base ? `'${pj.seq.base}'의 ` : ''}${pj.seq.n}번째 이야기다.` : ''].filter(Boolean).join(' '),
  ];
  const ts = [[an ? '🎨' : '🎬', R, newsTone(d.sc)]];
  if (d.review) ts.push(['🎥', d.review, /호평/.test(d.review) ? 'g' : /혹평/.test(d.review) ? 'b' : '']);
  ts.push(['💰', d.profit >= 0 ? `회사에 남은 돈 +${fmtWon(d.profit)}` : `손해 −${fmtWon(-d.profit)}`, d.profit >= 0 ? 'g' : 'b']);
  if (d.rd != null) ts.push(['🏢', `회사 평판 ${d.rd >= 0 ? '+' : ''}${Math.round(d.rd * 10) / 10} → ${Math.round(t.f[f].rep)}`, d.rd >= 0 ? 'g' : 'b']);
  if (d.wup && s.tracks.writer) ts.push(newsUp('작가', WRITER_TIERS[s.tracks.writer.tier]));
  const bill = { t: `${pj.title} 정산`, rows: d.L.map(([n, v]) => [n, v]).concat(['-', ['제작비', -pj.bud], [an ? '원작·연출·작화팀·성우' : '각본·연출·출연료', -pj.up], '-', [d.profit >= 0 ? '남은 돈' : '손해', d.profit, true]]) };
  return { who: co, heads, body, sec: an ? '애니' : film ? '영화' : '방송', t: pj.title, sc: d.sc, pl: EVENTS[an ? 'co_ares' : 'co_vres'].plio(s, d), cap: `${Q}의 한 장면`, bill, ts };
}
// 연말: 올해 공개한 작품 중 가장 잘된 작품이 시상식 작품상을 받으면 회사 평판이 오른다
function coVidYear(s, t) {
  const b = t.vyBest; t.vyBest = null;
  if (!b) return;
  const show = b.kind === 'film' ? '영화상' : '드라마 시상식';
  if (b.sc >= 80) { t.awN++; t.f.video.rep = Math.min(100, t.f.video.rep + 3); award(s, `${show} 작품상 「${b.title}」 (제작)`); addLog(s, `🏆 연말 ${show}에서 우리 회사 ${josa(`「${b.title}」`, '이가')} 작품상을 받았다.`, 'good'); }
  else if (b.sc >= 72) addLog(s, `연말 ${show}에서 우리 회사 ${josa(`「${b.title}」`, "이가")} 작품상 후보에 올랐다.`, 'career');
}

// ───── 회사 창: 🎬 작품 탭 ─────
// 공개 예정 (v181): 만드는 중인 작품이 공개되기까지 남은 달 · 공개 달. 만든 작품 칸 맨 위에 '공개 예정'으로 보인다
function coPjLeft(pj, K) { return pj.stage === 'prep' ? pj.left + pj.shootN + K.post : pj.stage === 'shoot' ? pj.left + K.post : pj.left; }
function coRelYM(s, pj, KS) { const y = ymOfT(s, s.t + coPjLeft(pj, KS[pj.kind])); return `${y.y}년 ${y.m}월`; }
function coPjRelLines(s, L, KS, ST) { return (L || []).map(pj => { const K = KS[pj.kind], n = coPjLeft(pj, K), ym = ymOfT(s, s.t + n); return { n, h: `<div class="ms rel">· <b>${ym.y}년 ${ym.m}월 공개 예정</b> 「${U.esc(pj.title)}」 ${U.esc(K.n)} · ${U.esc(ST[pj.stage])} · ${n}개월 남음</div>` }; }).sort((a, b) => a.n - b.n).map(x => x.h).join(''); }
function coTabVw(s, t) {
  // v178: 오디션 줄처럼 이 줄에서 바로 자동을 켜고 끈다
  const w = coVWhy(s, t), A = [{ t: '새 작품 기획', h: `함께 만드는 작품 ${t.vw.length}/${CO_V_CAP[coVTier(t)]}편 · 자본금 ${fmtWon(coM(t, 'video'))}${coAuto(t).on.video ? ' · 자동: 작품이 끝날 때마다 기획 회의를 연다' : ''}`, why: w, opts: [{ btn: '기획', on: true, ok: !w, run: s => { fireEvent(s, 'co_vplan', {}); return ''; } }, coAutoSw(t, 'video')] }];
  let h = `<div class="sec-h">할 수 있는 일</div>` + A.map(actRow).join('');
  h += `<div class="sec-h">만드는 중 ${t.vw.length}편</div>`;
  if (!t.vw.length) h += `<div class="muted">지금 만드는 작품이 없다.</div>`;
  for (const pj of t.vw) {
    const dir = pj.dir === 'me' ? '나' : (s.people[pj.dir] || {}).name || '-', lead = coVCastN(s, pj, 'lead') || '-';
    h += actRow({ ppl: coPjPpl(s, pj), t: `「${pj.title}」 · ${vKindN(pj.kind)} ${V_BUD_N[pj.lvl]}`, h: `${V_STAGE[pj.stage]} (${pj.stage === 'post' ? `${pj.left}개월 뒤 공개` : `${pj.left}개월 남음`}) · 감독 ${dir} · 주연 ${lead} · ${DIST[pj.dist].n} · 낸 제작비 ${fmtWon(pj.paidB)}/${fmtWon(pj.bud)}`, ok: true, danger: true, btn: '중단', confirm: `「${pj.title}」 제작을 중단할까요?\n들인 돈은 돌려받지 못해요.`, run: s => coVDrop(s, t, pj) });
  }
  const D = (t.vdone || []).slice().reverse();
  if (D.length || t.vw.length) h += `<div class="sec-h">만든 작품 ${D.length}편${t.vw.length ? ` <span class="n">공개 예정 ${t.vw.length}편</span>` : ''}</div>` + coPjRelLines(s, t.vw, V_KIND, V_STAGE) + D.slice(0, 12).map(w => `<div class="ms">· ${w.y} 「${U.esc(w.title)}」 ${vKindN(w.kind)} · ${U.esc(w.res)} · ${w.profit >= 0 ? `남은 돈 ${fmtWon(w.profit)}` : `손해 ${fmtWon(-w.profit)}`}</div>`).join('');
  return h;
}

// ════════ 애니메이션 제작사 (6-5단계) ════════
// 회사 대표의 분야 'anime'. 웹 애니·TV 애니·OTT 애니·극장판 애니를 기획해서 만든다
// 만드는 순서 (v180): 무엇을 만들지(종류 · 장르) → 어느 IP로(오리지널 · 다음 기 · 극장판 · 웹툰 · 웹소설) → 어느 작품으로 → 애니메이션 감독 → 작화감독 → 원화 애니메이터(3명 이상)
//   → 주연 성우 → 조연 성우(co_vcast) → 제작비(co_vbud) → 거는 곳(co_vdist) → 제작 시작 창(co_vgo) → 기획·콘티 → 작화 → 녹음·후반 작업 → 공개
// 수입은 공개할 때 한꺼번에: 방영권·극장·OTT 구매·조회수, 해외 판매, 굿즈·캐릭터 라이선스 (애니는 굿즈가 크다)
// 종류: bud 제작비 4단계, prep 기획·콘티 · shoot 작화 · post 녹음·후반 작업(개월), cast/star 성우 출연료(기본 + 팬 1명당), dir 연출료 기본, key 작화감독 계약금, anim 원화 한 명 계약금,
//   script 오리지널 기획안 값, rights 원작 판권 기본값(독자 10만 명), w 평판 무게, hit 대표 등급에 세는 크기, goods 굿즈 무게
const A_KIND = {
  web: { n: '웹 애니', ch: 'web', bud: [1e8, 2.5e8, 5e8, 9e8], prep: 2, shoot: 4, post: 1, cast: 150e4, star: 40, dir: 600e4, key: 400e4, anim: 150e4, script: 400e4, rights: 1000e4, demand: 30, w: 0.8, hit: 0.25, goods: 0.08 },
  tv: { n: 'TV 애니', ch: 'tv', bud: [10e8, 25e8, 50e8, 90e8], prep: 3, shoot: 9, post: 2, cast: 1500e4, star: 300, dir: 8000e4, key: 4000e4, anim: 1500e4, script: 6000e4, rights: 4000e4, demand: 40, w: 1, hit: 0.6, goods: 0.25 },
  ott: { n: 'OTT 애니', ch: 'ott', bud: [15e8, 35e8, 70e8, 120e8], prep: 3, shoot: 10, post: 2, cast: 2000e4, star: 400, dir: 1e8, key: 5000e4, anim: 2000e4, script: 8000e4, rights: 6000e4, demand: 45, w: 0.9, hit: 0.6, goods: 0.05 },
  film: { n: '극장판 애니', ch: 'film', bud: [10e8, 30e8, 60e8, 120e8], prep: 4, shoot: 12, post: 3, cast: 2500e4, star: 800, dir: 1.2e8, key: 6000e4, anim: 2500e4, script: 8000e4, rights: 6000e4, demand: 45, w: 1, hit: 0.75, goods: 0.12 },
};
const A_BUD_N = ['저예산', '보통', '고퀄리티', '최고 퀄리티'];
const A_STAGE = { prep: '기획·콘티 중', shoot: '작화 중', post: '녹음·후반 작업 중' };
const CO_A_TEAM = { min: 3, max: 8 }; // 원화 애니메이터: 3명 이상, 3명을 넘기면 자본금이 계약금을 감당하는 만큼 8명까지
const CO_AAD = [0, 2000e4, 5000e4, 1.5e8]; // 광고 애니메이션·게임 영상 의뢰 금액 (크기별)
function aKindN(k) { return A_KIND[k].n; }
function coATier(t) { return coTier(t, 'anime'); }
function coAWhy(s, t) {
  if (CO_V_CHAIN.some(id => hasQ(s, id))) return '기획 회의 중';
  if ((t.aw || []).length >= CO_V_CAP[coATier(t)]) return `${coSizeN(t, 'anime')}는 애니를 ${CO_V_CAP[coATier(t)]}편까지 함께 만든다`;
  return '';
}
// 원작 팬(웹툰·웹소설 독자)이 보태는 기대: 독자 10만 명 +0.8, 100만 명 +2.4 (최대 4). 다음 기·극장판은 절반
function coASrcHype(P) { return P.src && P.src.fans ? U.clamp((Math.log10(P.src.fans) - 4.5) * 1.6, 0, 4) * (P.seq ? 0.5 : 1) : 0; }
// 후속작을 만들 수 있는 IP: 시리즈(웹·TV)는 마지막 기가 55점 이상이면 다음 기, 가장 잘된 편이 65점 이상이면 극장판(세 편까지)
// OTT 오리지널은 판권이 OTT 것이라 안 되고, 한 IP는 여섯 편까지
function coAIps(t) {
  const by = {}, C = [];
  for (const w of t.adone || []) (by[w.ip] = by[w.ip] || []).push(w);
  for (const ip in by) {
    const L = by[ip].sort((a, b) => a.n - b.n), first = L[0], last = L[L.length - 1];
    if (first.kind === 'ott' || L.length >= 6) continue;
    const ser = L.filter(w => w.kind !== 'film'), films = L.filter(w => w.kind === 'film'), best = Math.max(...L.map(w => w.sc)), ls = ser[ser.length - 1];
    const seq = { ip, n: L.length + 1, prevSc: last.sc, prevDir: last.dir, prevLead: last.lead, base: first.base, genre: first.genre, src: first.src || null };
    if (ls && ls.sc >= 55) C.push({ kind: ls.kind, title: `${first.base} ${ser.length + 1}기`, seq, from: ls });
    if (best >= 65 && films.length < 3) C.push({ kind: 'film', title: first.kind === 'film' ? `${first.base} ${films.length + 1}` : `극장판 ${first.base}${films.length ? ` ${films.length + 1}` : ''}`, seq, from: last });
  }
  return C;
}

// v180: 영상 제작사와 같은 순서 (종류 · 장르 → IP → 작품 → 감독 · 작화감독 · 원화 → 주연 → 조연 → 제작비 → 거는 곳)
E({
  id: 'co_aplan', cat: '애니 기획', title: '무엇을 만들까?', tag: 'career', noRes: 'toast',
  cond: s => coOn(s) && !!coT(s).f.anime,
  text: s => { const t = coT(s); return `다음 애니를 기획한다. 무엇을 만들지, 어떤 장르로 할지 고른다. 다음 기 · 극장판은 다음 단계에서 '후속작'으로 고른다.\n\n${coSizeN(t, 'anime')} · 자본금 ${fmtWon(coM(t, 'anime'))} · 고를 수 있는 제작비 ${A_BUD_N.slice(0, coATier(t) + 1).join('·')}`; },
  form: s => coPlanForm(s, 'anime'),
  submitT: () => '다음 ▶',
  submit: (s, d, v) => coPlanSubmit(s, 'anime', v),
  cancel: () => '', cancelT: () => '그만둔다',
});

// ───── 2. 원작 ─────
// 새 작품: 오리지널 기획안 2편(시나리오 작가) · 웹툰·웹소설 판권 3편(독자 수는 정확히, 이야기는 5단계) · 서랍 속 다 써 둔 내 원고
// 다음 기·극장판: 같은 이야기를 이어 쓸 구성안 3편
function coAScriptPrice(kind, q) { return Math.round(A_KIND[kind].script * (0.6 + q / 100) * U.fl(0.8, 1.2) / 1e5) * 1e5; }
function coARightsPrice(kind, fans, q) { return Math.round(A_KIND[kind].rights * Math.sqrt(fans / 1e5) * (0.6 + q / 100) * U.fl(0.85, 1.15) / 1e5) * 1e5; }
E({
  id: 'co_asrc', cat: '애니 기획', title: (s, d) => d.P.seq ? '구성안 고르기' : '원작 고르기', tag: 'career', noRes: 'toast',
  cond: s => coOn(s),
  // v178: 곡 고르기처럼 표로 (내 원고 · 내 웹툰 · 웹소설은 표 아래 버튼)
  tbl(s, d) { return Object.assign(chPplTbl(s, this.ch(s, d), [['t', '제목'], ['src', '종류'], ['gen', '장르'], ['q', '이야기'], ['w', '작가'], ['fans', '원작 독자'], ['price', '값']], '이 원작으로 한다'), { sort: ['q', -1] }); },
  init(s, d) {
    const P = d.P, k = coATier(coT(s)), tr = (s.trendTV || {}).anime || U.pick(ANIME_TRENDS);
    d.ms = [];
    for (let i = 0; i < (P.seq ? 3 : 2); i++) {
      const genre = P.seq ? P.seq.genre : i === 0 && U.chance(0.5) ? tr : U.pick(ANIME_TRENDS), w = pickIndustry(s, '시나리오 작가', y => !d.ms.some(m => m.w === y.id));
      const q = U.clamp(Math.round(lv(w, 'script') * 0.6 + U.int(5, 40) + k * 2), 10, 95);
      d.ms.push({ src: '', title: P.seq ? P.seq.title : animeTitle(genre), genre, q, w: w.id, price: coAScriptPrice(P.kind, q) });
    }
    if (!P.seq) for (let i = 0; i < 3; i++) {
      const wt = U.chance(0.6), genre = i === 0 && U.chance(0.4) ? tr : U.pick(ANIME_TRENDS), w = pickIndustry(s, wt ? '웹툰 작가' : '웹소설 작가', y => !d.ms.some(m => m.w === y.id), 0.3);
      const fans = Math.round(Math.pow(10, U.fl(4.3, 6.5)) / 1e3) * 1e3, q = U.clamp(Math.round(lv(w, 'script') * 0.5 + U.int(10, 40) + (Math.log10(fans) - 5) * 4), 10, 95);
      d.ms.push({ src: wt ? '웹툰' : '웹소설', title: animeTitle(genre), genre, q, w: w.id, fans, price: coARightsPrice(P.kind, fans, q) });
    }
  },
  text: (s, d) => { const v = coVView(s, 'script', d.P.f); return `${d.P.seq ? `「${d.P.seq.title}」 이야기를 이어 쓸 구성안을 고른다.` : `새 ${aKindN(d.P.kind)}의 원작을 고른다. 오리지널 기획안을 사거나, 웹툰·웹소설 판권을 사거나, 다 써 둔 내 원고를 쓴다.`}\n\n이야기 보는 눈: ${v.id === s.me ? '내 눈' : `기획 PD ${v.name}`}`; },
  ch: (s, d) => {
    const P = d.P, v = coVView(s, 'script', d.P.f), C = [];
    for (const m of d.ms) {
      const w = s.people[m.w], lic = !!m.src;
      C.push({ row: { src: [lic ? m.src : '오리지널', lic ? `${m.src} 원작` : P.seq ? '구성안' : '오리지널 기획안'], t: [m.title, `「${m.title}」`], gen: [m.genre, m.genre], q: coCellG(grade5(v, m.q, 'q', 'script'), 'q'), w: [w ? w.name : '-', w ? `${w.name} 작가` : '-'], fans: [m.fans || 0, m.fans ? fmtFans(m.fans) : '-'], price: [m.price, fmtWon(m.price)] }, t: `${lic ? m.src : P.seq ? '구성안' : '오리지널'} 「${m.title}」 ${m.genre} · 이야기 ${grade5(v, m.q, 'q', 'script')}`, tr: m.genre === (s.trendTV || {}).anime, h: `${w ? w.name : '-'} 작가${lic ? ` · 독자 ${fmtFans(m.fans)}` : ''} · ${lic ? '판권료' : '값'} ${fmtWon(m.price)}`, f: s => {
        Object.assign(P, { title: m.title, genre: m.genre, q: m.q, writer: m.w, price: m.price, lic, src: lic ? { kind: m.src, fans: m.fans } : P.seq ? P.seq.src : null });
        fireEvent(s, 'co_adir', { P }); return '';
      } });
    }
    if (!P.seq) for (const sc of myScripts(s).filter(x => x.st === 'done')) C.push({ t: `내 원고 「${sc.title}」 ${sc.genre} · 완성도 ${myScriptGrade(s, sc.q)}`, h: '내가 쓴 원고', f: s => { Object.assign(P, { title: sc.title, genre: sc.genre, q: sc.q, writer: 'me', scId: sc.id, price: 0, src: null }); fireEvent(s, 'co_adir', { P }); return ''; } });
    // 내가 완결한 웹툰·웹소설 (js/webnovel.js): 판권료가 들지 않고, 원작 독자가 기대를 보탠다
    if (!P.seq) for (const w of wbMyWorks(s).filter(x => !x.anime)) C.push({ t: `내 ${w.sn} 「${w.title}」 ${w.g}`, tr: w.g === (s.trendTV || {}).anime, h: `독자 ${fmtFans(w.peak)}`, f: s => { Object.assign(P, { title: w.title, genre: w.g, q: w.q, writer: null, wbId: w.id, price: 0, lic: true, src: { kind: w.sn, fans: w.peak } }); fireEvent(s, 'co_adir', { P }); return ''; } });
    return C.concat([{ t: '그만둔다', f: () => '애니 기획을 접었다.' }]);
  },
});

// ───── 3. 애니메이션 감독 ─────
function coADirFee(kind, x) { const A = A_KIND[kind]; return Math.round((A.dir * (0.5 + lv(x, 'direct') / 80) + (x.fame || 0) * A.star * 0.3) * U.fl(0.9, 1.1) / 1e5) * 1e5; }
E({
  id: 'co_adir', cat: '애니 기획', title: '애니메이션 감독 섭외', tag: 'career', noRes: 'toast',
  cond: s => coOn(s),
  init(s, d) {
    if (d.c) return;
    const P = d.P, t = coT(s), L = [], back = P.seq && P.seq.prevDir !== 'me' && s.people[P.seq.prevDir];
    if (back && back.alive !== false) L.push(back);
    while (L.length < 3) L.push(pickIndustry(s, '애니메이션 감독', y => !L.includes(y), 0.4));
    d.c = L.map(x => ({ id: x.id, fee: Math.round(coADirFee(P.kind, x) * (back === x ? 1.3 : 1) / 1e5) * 1e5, p: coVHireP(s, t, P, x, 'direct'), back: back === x }));
  },
  text: (s, d) => { const v = coVView(s, 'direct', d.P.f); return `「${d.P.title}」 감독을 섭외한다. 감독은 연출과 그림을 같이 본다.${d.no ? `\n\n${d.no}` : ''}\n\n연출 보는 눈: ${v.id === s.me ? '내 눈' : `기획 PD ${v.name}`}`; },
  tbl(s, d) { return chPplTbl(s, this.ch(s, d), PPL_COLS.concat([['direct', '연출'], ['art', '그림']], CO_PJ_COLS.direct.slice(1)), '섭외 제안을 한다'); },
  ch: (s, d) => {
    const P = d.P, v = coVView(s, 'direct', d.P.f), va = coVView(s, 'art', d.P.f), p = me(s), C = d.c.filter(c => s.people[c.id]).map(c => {
      const x = s.people[c.id];
      return { pid: x.id, row: Object.assign(coPjRow(s, x, v, ['direct'], c, '연출료', c.back ? '저번 감독' : ''), { art: pplCells(s, x, va, ['art']).art }), t: `${x.name} 감독 — 연출 ${coLvSee(v, x, 'direct')} · 그림 ${coLvSee(va, x, 'art')} · 팬 ${fmtFans(x.fame || 0)}${c.back ? ' · 저번 감독' : ''}`, h: `연출료 ${fmtWon(c.fee)} · 섭외 가능성 ${fmtPct(c.p)} · ${relWord(x)}`, f: s => {
        if (U.chance(c.p)) { Object.assign(P, { dir: x.id, dirFee: c.fee }); fireEvent(s, 'co_akey', { P }); return `${josa(x.name, '이가')} 「${P.title}」 감독을 맡기로 했다.`; }
        fireEvent(s, 'co_adir', { P, c: d.c.filter(y => y.id !== c.id), no: `${josa(x.name, '이가')} 거절했다. 다른 감독을 찾아본다.` });
        return `${josa(x.name, '이가')} 「${P.title}」 감독 제안을 거절했다.`;
      } };
    });
    if (has(p, 'direct')) C.push({ t: `내가 감독한다 — 연출 ${lvi(p, 'direct')}${has(p, 'art') ? ` · 그림 ${lvi(p, 'art')}` : ''}`, h: '작화하는 동안 스트레스가 쌓인다', f: s => { Object.assign(P, { dir: 'me', dirFee: 0 }); fireEvent(s, 'co_akey', { P }); return `${josa(`「${P.title}」`, '은는')} 내가 직접 감독하기로 했다.`; } });
    return C.concat([{ t: '그만둔다', f: () => '애니 기획을 접었다.' }]);
  },
});

// ───── 4. 작화팀: 작화감독 → 원화 애니메이터 ─────
function coAKeyFee(kind, x) { return Math.round(A_KIND[kind].key * (0.5 + lv(x, 'art') / 80) * U.fl(0.9, 1.1) / 1e5) * 1e5; }
function coAAnimFee(kind, x) { return Math.round(A_KIND[kind].anim * (0.5 + lv(x, 'art') / 100) * U.fl(0.9, 1.1) / 1e5) * 1e5; }
E({
  id: 'co_akey', cat: '애니 기획', title: '작화감독 섭외', tag: 'career', noRes: 'toast',
  cond: s => coOn(s),
  init(s, d) {
    if (d.c) return;
    const P = d.P, t = coT(s), L = [];
    while (L.length < 3) L.push(pickIndustry(s, '애니메이터', y => !L.includes(y), 0.4));
    d.c = L.map(x => ({ id: x.id, fee: coAKeyFee(P.kind, x), p: coVHireP(s, t, P, x, 'art') }));
  },
  tbl(s, d) { return chPplTbl(s, this.ch(s, d), PPL_COLS.concat(CO_PJ_COLS.art), '섭외 제안을 한다'); },
  text: (s, d) => { const v = coVView(s, 'art', d.P.f); return `「${d.P.title}」 작화를 이끌 작화감독을 섭외한다.${d.no ? `\n\n${d.no}` : ''}\n\n그림 보는 눈: ${v.id === s.me ? '내 눈' : `기획 PD ${v.name}`}`; },
  ch: (s, d) => {
    const P = d.P, v = coVView(s, 'art', d.P.f), nf = Math.round(A_KIND[P.kind].key * 0.4 / 1e5) * 1e5;
    return d.c.filter(c => s.people[c.id]).map(c => {
      const x = s.people[c.id];
      return { pid: x.id, row: coPjRow(s, x, v, ['art'], c, '계약금', ''), t: `${x.name} — 그림 ${coLvSee(v, x, 'art')} · 팬 ${fmtFans(x.fame || 0)}`, h: `계약금 ${fmtWon(c.fee)} · 섭외 가능성 ${fmtPct(c.p)} · ${relWord(x)}`, f: s => {
        if (U.chance(c.p)) { Object.assign(P, { key: x.id, keyFee: c.fee }); fireEvent(s, 'co_ateam', { P }); return `${josa(x.name, '이가')} 「${P.title}」 작화감독을 맡기로 했다.`; }
        fireEvent(s, 'co_akey', { P, c: d.c.filter(y => y.id !== c.id), no: `${josa(x.name, '이가')} 거절했다. 다른 작화감독을 찾아본다.` });
        return `${josa(x.name, '이가')} 「${P.title}」 작화감독 제안을 거절했다.`;
      } };
    }).concat([{ t: '젊은 작화감독을 쓴다', h: `계약금 ${fmtWon(nf)} · 꼭 해 준다`, f: s => {
      const x = makeIndustry(s, '애니메이터', { age: U.int(26, 33), fame: U.int(10, 200) }), l = Math.min(lv(x, 'art'), U.int(30, 52));
      x.sk.art.lv = x.sk.art.best = l;
      Object.assign(P, { key: x.id, keyFee: nf }); fireEvent(s, 'co_ateam', { P });
      return `${josa(x.name, '이가')} 「${P.title}」 작화감독을 맡기로 했다.`;
    } }, { t: '그만둔다', f: () => '애니 기획을 접었다.' }]);
  },
});
E({
  id: 'co_ateam', cat: '애니 기획', title: '원화 애니메이터 모으기', tag: 'career', noRes: 'toast',
  cond: s => coOn(s),
  init(s, d) {
    const P = d.P, L = [];
    while (L.length < 7) L.push(pickIndustry(s, '애니메이터', y => !L.includes(y) && y.id !== P.key, 0.4));
    d.c = L.map(x => ({ id: x.id, fee: coAAnimFee(P.kind, x) }));
  },
  text: (s, d) => { const t = coT(s), v = coVView(s, 'art', d.P.f); return `「${d.P.title}」 원화를 그릴 애니메이터를 ${CO_A_TEAM.min}명 이상 체크하자 (${CO_A_TEAM.max}명까지). ${CO_A_TEAM.min}명을 넘기면 자본금이 계약금을 감당해야 한다.\n\n지금까지 낼 돈 ${fmtWon(coVUpfront(d.P))} · 자본금 ${fmtWon(coM(t, 'anime'))}\n그림 보는 눈: ${v.id === s.me ? '내 눈' : `기획 PD ${v.name}`}`; },
  form: (s, d) => { const v = coVView(s, 'art', d.P.f); return d.c.filter(c => s.people[c.id]).map(c => { const x = s.people[c.id]; return { k: x.id, type: 'check', label: `${x.name} — 그림 ${coLvSee(v, x, 'art')}`, sub: `계약금 ${fmtWon(c.fee)} · ${relWord(x)}` }; }); },
  // v178: 오디션처럼 표로 (체크 · 정렬 · 고른 인원수)
  tbl: (s, d) => { const v = coVView(s, 'art', d.P.f); return { cols: PPL_COLS.concat([['art', '그림'], ['fame', '팬'], ['fee', '계약금'], ['rel', '관계']]), rows: d.c.filter(c => s.people[c.id]).map(c => { const x = s.people[c.id]; return { k: x.id, cells: Object.assign(pplCells(s, x, v, ['art']), { fee: [c.fee, fmtWon(c.fee)] }) }; }), sort: ['art', -1], cnt: { n: '고른 애니메이터', min: CO_A_TEAM.min, max: CO_A_TEAM.max } }; },
  cancel: () => '애니 기획을 접었다.',
  submit(s, d, v) {
    const t = coT(s), P = d.P, pick = d.c.filter(c => v[c.id] && s.people[c.id]), fee = pick.reduce((a, c) => a + c.fee, 0);
    if (pick.length < CO_A_TEAM.min) return { err: `원화 애니메이터를 ${CO_A_TEAM.min}명 이상 체크해 주세요` };
    if (pick.length > CO_A_TEAM.max) return { err: `${CO_A_TEAM.max}명까지 뽑을 수 있어요` };
    if (pick.length > CO_A_TEAM.min && coM(t, 'anime') < coVUpfront(P) + fee) return { err: `자본금이 모자라요 (계약금 ${fmtWon(fee)} · 자본금 ${fmtWon(coM(t, 'anime'))})` };
    Object.assign(P, { team: pick.map(c => c.id), teamFee: fee });
    fireEvent(s, 'co_vcast', { P });
    return { log: `「${P.title}」 원화 애니메이터 ${pick.length}명을 모았다. (계약금 ${fmtWon(fee)})` };
  },
});

// ───── 거는 곳이 받아 줄 가능성 (co_vdist가 쓴다) ─────
function coAEst(s, P) {
  const dir = P.dir === 'me' ? me(s) : s.people[P.dir], key = s.people[P.key], lead = s.people[P.lead];
  return P.q * 0.26 + (dir ? lv(dir, 'direct') * 0.75 + lv(dir, 'art') * 0.25 : 40) * 0.24 + (key ? lv(key, 'art') : 35) * 0.16 + 35 * 0.08 + (lead ? lv(lead, 'acting') : 35) * 0.05 + coASrcHype(P) + V_BUD_SC[P.lvl] + 7;
}
// 작품 시작: 원작료(각본료)·연출료·작화팀 계약금·성우 출연료를 내고, 감독·작화감독·작가·주연 성우를 만난다
function coAStart(s, t, P) {
  const A = A_KIND[P.kind], up = coVUpfront(P);
  coAuto(t).want.anime = false;
  coOut(t, P.price || 0, P.lic ? '원작 판권' : '각본료', 'anime'); coOut(t, P.dirFee || 0, '연출료', 'anime'); coOut(t, (P.keyFee || 0) + (P.teamFee || 0), '작화팀 계약금', 'anime'); coOut(t, coVCastFees(P), '성우 출연료', 'anime');
  if (P.scId) { const sc = myScripts(s).find(x => x.id === P.scId); if (sc) sc.st = 'mine'; }
  if (P.wbId) wbMark(s, P.wbId, 'anime');
  const where = `${A.n} 「${P.title}」`;
  for (const id of [P.writer, P.dir, P.key, ...coVCast(P).filter(c => c.role === 'lead').map(c => c.id)]) { const x = id && id !== 'me' && s.people[id]; if (x) meetAt(s, x, where, 'agency'); }
  const pj = Object.assign({}, P, { id: 'a' + U.uid(), stage: 'prep', left: A.prep, shootN: A.shoot, paidB: 0, perM: Math.ceil(P.bud / (A.prep + A.shoot) / 1e4) * 1e4, up, t0: s.t });
  (t.aw = t.aw || []).push(pj);
  return `「${P.title}」 제작을 시작했다! ${josa(DIST[P.dist].n, '과와')} 손잡았다. 원작·연출·작화팀·성우에 ${fmtWon(up)}을 냈고, 제작비 ${fmtWon(P.bud)}은 ${A.prep + A.shoot}개월 동안 나눠 낸다.`;
}
function coADrop(s, t, pj) { t.aw = t.aw.filter(x => x !== pj); coVRepF(t, 'anime', -2); return `「${pj.title}」 제작을 중단했다. 들인 돈은 돌려받지 못한다.`; }

// ───── 한 달 ─────
function coAniMonth(s, t, sales) {
  const p = me(s);
  for (const pj of t.aw.slice()) {
    if (pj.stage === 'prep' || pj.stage === 'shoot') { const m = Math.min(pj.perM, pj.bud - pj.paidB); if (m > 0) { coOut(t, m, '제작비', 'anime'); pj.paidB += m; } }
    if (pj.stage === 'shoot' && pj.dir === 'me') { practice(s, p, 'direct', 1); if (has(p, 'art')) practice(s, p, 'art', 0.6); addStress(s, 1.5); }
    if (--pj.left > 0) continue;
    if (pj.stage === 'prep') { pj.stage = 'shoot'; pj.left = pj.shootN; addLog(s, `🎨 「${pj.title}」 작화에 들어갔다. ${pj.left}개월 동안 그린다.`, 'career'); }
    else if (pj.stage === 'shoot') { pj.stage = 'post'; pj.left = A_KIND[pj.kind].post; addLog(s, `🎨 「${pj.title}」 작화를 마쳤다. 녹음과 후반 작업에 들어간다.`, 'career'); }
    else { t.aw = t.aw.filter(x => x !== pj); queueEv(s, 'co_ares', 0, { pj }, true); }
  }
  // 광고 애니메이션·게임 영상 제작 의뢰 (대표가 영업을 하면 더 자주)
  const k = coATier(t);
  if (!s.inbox.some(m => m.kind === 'co_aad') && U.chance((0.025 + k * 0.015) * (sales ? coSalesM(s, 1.5) : 1))) {
    const g = U.chance(0.4), b = U.pick(BRANDS), fee = Math.round(CO_AAD[k] * U.fl(0.7, 1.3) / 1e6) * 1e6;
    sendMsg(s, 'co_aad', { from: g ? '게임 회사' : b.n, title: g ? '게임 애니메이션 의뢰' : '광고 애니메이션 의뢰', months: 2, d: { what: g ? '게임 오프닝 애니메이션' : `${b.cat} 광고 애니메이션`, fee } });
  }
}
INBOX.co_aad = {
  ic: '🎨',
  to: s => coAdTo(s, 'anime', '애니메이션 제작사'),
  text: (s, m) => coAdText(s, m, 'anime', '만드는'),
  ch: (s, m) => [
    { t: '맡는다', ok: s => coOn(s) && !!coT(s).f.anime, h: coOn(s) && coT(s).f.anime ? '' : '애니메이션 제작사를 운영하고 있어야 한다', f: s => { const t = coT(s), cost = Math.round(m.d.fee * U.fl(0.55, 0.75) / 1e5) * 1e5; coIn(t, m.d.fee, '광고·게임 애니메이션 제작', 'anime'); coOut(t, cost, '광고·게임 애니메이션 제작비', 'anime'); coVRepF(t, 'anime', 0.3); return `「${t.name}」에서 ${m.from} ${josa(m.d.what, '을를')} 만들었다. 남은 돈 ${fmtWon(m.d.fee - cost)}.`; } },
    { t: '거절한다', f: () => `${m.from}의 제작 의뢰를 거절했다.` },
  ],
};

// ───── 공개 ─────
// 점수: 감독(연출·그림) · 작화감독 · 원화팀(평균 그림, 4명째부터 한 명마다 +0.6, 최대 3) · 이야기 · 성우 · 제작비 · 회사 크기 · 홍보 · 유행 장르 · 원작 팬 · 후속작 기대
function coAScore(s, t, pj) {
  const p = me(s), dir = pj.dir === 'me' ? p : s.people[pj.dir], key = s.people[pj.key], team = (pj.team || []).map(id => s.people[id]).filter(Boolean), { leads, la, sa, star, ens } = coCastSc(s, pj);
  const dl = dir ? lv(dir, 'direct') * 0.75 + lv(dir, 'art') * 0.25 + (pj.dir === 'me' ? (p.tal.aesth - 50) * 0.1 : 0) : 40;
  const ka = key ? lv(key, 'art') : 35, ta = team.length ? team.reduce((a, x) => a + lv(x, 'art'), 0) / team.length : 30, tb = Math.min(3, Math.max(0, team.length - CO_A_TEAM.min) * 0.6);
  let hype = coASrcHype(pj);
  if (pj.seq) hype += U.clamp((pj.seq.prevSc - 60) / 4, -4, 5) - 3 * Math.max(0, pj.seq.n - 2) + (pj.dir === pj.seq.prevDir ? 1.5 : 0) + (leads.some(c => c.x.id === pj.seq.prevLead) ? 1.5 : 0);
  return U.clamp(dl * 0.24 + ka * 0.16 + ta * 0.08 + tb + pj.q * 0.26 + la * 0.05 + sa * 0.03 + star * 0.6 + ens + V_BUD_SC[pj.lvl] + coATier(t) + DIST_T[DIST[pj.dist].tier].promo + (pj.genre === (s.trendTV || {}).anime ? 4 : 0) + hype - 2 + U.normal(0, 7), 0, 100);
}
// 수입 (회사로 들어오는 돈). 점수 62가 대략 본전, 12점 오를 때마다 해외·극장·굿즈 쪽 수입이 두 배 (세 배까지, 극장 관객은 500만까지). 굿즈는 원작 팬이 많을수록 더 팔린다 (최대 1.3배)
function coARev(s, t, pj, sc) {
  const B = pj.bud, A = A_KIND[pj.kind], D = DIST[pj.dist], T = DIST_T[D.tier], r = Math.min(4, Math.pow(2, (sc - 62) / 12)), L = [];
  const seqF = pj.seq ? 1 + U.clamp((pj.seq.prevSc - 60) / 40, 0, 0.5) * (pj.seq.n === 2 ? 1 : 0.6) : 1;
  const srcF = pj.src && pj.src.fans ? 1 + U.clamp(Math.log10(pj.src.fans) - 5, 0, 1) * 0.3 : 1;
  let res;
  if (pj.kind === 'film') {
    const aud = Math.min(4e6, Math.round(B / FM_TICKET * Math.min(r, 3) * T.pow * seqF * 0.85 / 100) * 100);
    res = `관객 ${fmtFans(aud)}`;
    L.push([`극장 수익 (배급 수수료 ${Math.round(T.fee * 100)}% 뗌)`, aud * FM_TICKET * (1 - T.fee)], ['VOD·해외 판매', B * 0.2 * Math.min(r, 3)]);
  } else if (pj.kind === 'tv') {
    res = `최고 시청률 ${U.clamp((sc - 35) / 6, 0.3, 9).toFixed(1)}%`;
    L.push(['방영권', B * 0.35 * T.pow], [`해외·OTT 판매 (수수료 ${Math.round(T.fee * 100)}% 뗌)`, B * 0.45 * Math.min(r, 3) * seqF * (1 - T.fee)]);
  } else if (pj.kind === 'ott') {
    res = filmRes('ott', sc);
    L.push([`OTT 구매 (제작비·계약금 + 이윤 ${Math.round((T.margin - 1) * 100)}%)`, (B + pj.up) * T.margin]);
    if (sc >= 75) L.push(['흥행 보너스', B * 0.1 * (sc - 75) / 5]);
  } else {
    const views = Math.round(Math.pow(10, 4 + sc / 22) * T.pow * V_WEB_VIEW[pj.lvl] * seqF);
    res = `누적 조회수 ${fmtFans(views).replace('명', '회')}`;
    L.push(['플랫폼 구매', B * 0.7], [`조회수 광고 수익 (수수료 ${Math.round(T.fee * 100)}% 뗌)`, views * 30 * (1 - T.fee)]);
  }
  L.push(['굿즈·캐릭터 라이선스', B * A.goods * Math.min(r, 3) * srcF]);
  for (const x of L) x[1] = Math.round(x[1] / 1e5) * 1e5;
  return { L, res, total: L.reduce((a, x) => a + x[1], 0) };
}
E({
  id: 'co_ares', cat: '애니 성적', title: '우리 회사 애니 공개', tag: 'career',
  plio: (s, d) => d.pl !== undefined ? d.pl : (d.pl = typeof plioSpec === 'function' ? plioSpec({ k: 'animk', t: `「${d.pj.title}」 본편 클립`, ch: coT(s).name, me: d.pj.dir === 'me' ? `${me(s).name} 감독` : '', sc: d.sc, rv: plioRv(d.review) }) : null),
  cond: s => coOn(s),
  init(s, d) {
    const t = coT(s), pj = d.pj, A = A_KIND[pj.kind], p = me(s);
    const sc = d.sc = coAScore(s, t, pj), R = coARev(s, t, pj, sc);
    d.res = R.res; d.L = R.L; d.rev = R.total; d.cost = pj.bud + pj.up; d.profit = d.rev - d.cost;
    for (const [n, v] of R.L) coIn(t, v, n, 'anime');
    if (pj.dir === 'me') d.review = dirReview(dirPerf(p, A.demand));
    // 평판: 점수가 52보다 높으면 오르고 낮으면 떨어진다 (작품이 클수록 크게)
    d.rd = U.clamp((sc - 52) / 3, -5, 8) * A.w;
    t.f.anime.rep = U.clamp(t.f.anime.rep + d.rd, 0, 100);
    // 대표 등급에 세는 흥행 크기 (소형은 절반, 중형은 3/4): 대형 제작사의 극장판이 점수 88이면 75만, 94면 150만 (드라마·영화보다 작게 센다)
    t.peakF = Math.max(t.peakF || 0, Math.round(Math.pow(10, 1.6 + sc / 20) * A.hit * [0, 0.5, 0.75, 1][coATier(t)]));
    if (pj.kind !== 'web' && sc > ((t.ayBest || {}).sc || 0)) t.ayBest = { sc, title: pj.title };
    const ip = pj.seq ? pj.seq.ip : pj.id, n = pj.seq ? pj.seq.n : 1;
    t.adone.push({ id: pj.id, ip, n, title: pj.title, base: pj.seq ? pj.seq.base : pj.title, kind: pj.kind, genre: pj.genre, src: pj.src || null, sc: Math.round(sc), dir: pj.dir, lead: pj.lead, y: calY(s), res: d.res, profit: d.profit });
    coAuto(t).want.anime = true;
    for (const id of [pj.dir, pj.key, ...coVCast(pj).filter(c => c.role === 'lead').map(c => c.id)]) { const x = id && id !== 'me' && s.people[id]; if (x) bond(s, x, sc >= 60 ? U.int(2, 6) : U.int(-4, 1)); }
    addWork(s, { type: `${A.n} 제작`, title: pj.title, by: pj.dir === 'me' ? '제작·감독' : '제작', sc, note: `${t.name} · ${d.res}`, pay: 0 });
    if (pj.writer === 'me') d.wup = writerCredit(s, { title: pj.title, tk: { web: 'web', tv: 'drama', ott: 'ott', film: 'film' }[pj.kind], typeN: A.n, note: d.res }, sc);
    if (!t.afirst) { t.afirst = true; milestone(s, `${age(s)}세에 「${t.name}」의 첫 애니 ${josa(`「${pj.title}」`, '을를')} 공개했다.`); }
    if (pj.kind === 'film' && sc >= 80 && !t.ahit) { t.ahit = true; milestone(s, `${age(s)}세에 우리 회사 극장판 애니 ${josa(`「${pj.title}」`, '이가')} ${d.res}을 모았다.`); }
  },
  text: (s, d) => { const pj = d.pj, D = DIST[pj.dist]; return `${aKindN(pj.kind)} ${josa(`「${pj.title}」`, '이가')} ${D.ch === 'film' ? `${D.n.replace(/ ?배급$/, '')} 배급으로 개봉했다` : D.ch === 'tv' ? `${D.n}에서 방영됐다` : `${D.n}에서 공개됐다`}.\n\n${d.res}${d.review ? ` · ${d.review}` : ''}\n\n${d.L.map(([n, v]) => `· ${n} ${fmtWon(v)}`).join('\n')}\n들어온 돈 ${fmtWon(d.rev)} · 쓴 돈 ${fmtWon(d.cost)} (제작비 ${fmtWon(pj.bud)} + 원작·연출·작화팀·성우 ${fmtWon(pj.up)})\n${d.profit >= 0 ? `남은 돈 ${fmtWon(d.profit)}` : `손해 ${fmtWon(-d.profit)}`}` + wupText(s, d); },
  // v174: 결과 창을 인터넷 기사로 (studio.js coWorkNews)
  html: (s, d) => d.sc != null && d.L && typeof newsEvHTML === 'function' ? newsEvHTML(s, d, coWorkNews(s, d, 'anime')) : '',
  news: (s, d) => coWorkNews(s, d, 'anime'),
  ch: (s, d) => [{ t: '확인', f: () => `「${d.pj.title}」 공개. ${d.res} · ${d.profit >= 0 ? `남은 돈 ${fmtWon(d.profit)}` : `손해 ${fmtWon(-d.profit)}`}.` }],
});
// 연말: 올해 공개한 애니(웹 애니 빼고) 중 가장 잘된 작품이 애니메이션 대상을 받으면 회사 평판이 오른다
function coAniYear(s, t) {
  const b = t.ayBest; t.ayBest = null;
  if (!b) return;
  if (b.sc >= 80) { t.awN++; t.f.anime.rep = Math.min(100, t.f.anime.rep + 3); award(s, `애니메이션 대상 「${b.title}」 (제작)`); addLog(s, `🏆 연말 애니메이션 시상식에서 우리 회사 ${josa(`「${b.title}」`, '이가')} 대상을 받았다.`, 'good'); }
  else if (b.sc >= 72) addLog(s, `연말 애니메이션 시상식에서 우리 회사 ${josa(`「${b.title}」`, '이가')} 대상 후보에 올랐다.`, 'career');
}

// ───── 회사 창: 🎨 애니 탭 ─────
function coTabAw(s, t) {
  // v178: 오디션 줄처럼 이 줄에서 바로 자동을 켜고 끈다
  const w = coAWhy(s, t), A = [{ t: '새 애니 기획', h: `함께 만드는 애니 ${t.aw.length}/${CO_V_CAP[coATier(t)]}편 · 자본금 ${fmtWon(coM(t, 'anime'))}${coAuto(t).on.anime ? ' · 자동: 애니가 끝날 때마다 기획 회의를 연다' : ''}`, why: w, opts: [{ btn: '기획', on: true, ok: !w, run: s => { fireEvent(s, 'co_aplan', {}); return ''; } }, coAutoSw(t, 'anime')] }];
  let h = `<div class="sec-h">할 수 있는 일</div>` + A.map(actRow).join('');
  h += `<div class="sec-h">만드는 중 ${t.aw.length}편</div>`;
  if (!t.aw.length) h += `<div class="muted">지금 만드는 애니가 없다.</div>`;
  for (const pj of t.aw) {
    const nm = id => id === 'me' ? '나' : (s.people[id] || {}).name || '-';
    h += actRow({ ppl: coPjPpl(s, pj), t: `「${pj.title}」 · ${aKindN(pj.kind)} ${A_BUD_N[pj.lvl]}`, h: `${A_STAGE[pj.stage]} (${pj.stage === 'post' ? `${pj.left}개월 뒤 공개` : `${pj.left}개월 남음`}) · 감독 ${nm(pj.dir)} · 작화감독 ${nm(pj.key)} · 원화 ${(pj.team || []).length}명 · 주연 ${coVCastN(s, pj, 'lead') || '-'} · ${DIST[pj.dist].n} · 낸 제작비 ${fmtWon(pj.paidB)}/${fmtWon(pj.bud)}`, ok: true, danger: true, btn: '중단', confirm: `「${pj.title}」 제작을 중단할까요?\n들인 돈은 돌려받지 못해요.`, run: s => coADrop(s, t, pj) });
  }
  const D = (t.adone || []).slice().reverse();
  if (D.length || t.aw.length) h += `<div class="sec-h">만든 애니 ${D.length}편${t.aw.length ? ` <span class="n">공개 예정 ${t.aw.length}편</span>` : ''}</div>` + coPjRelLines(s, t.aw, A_KIND, A_STAGE) + D.slice(0, 12).map(w => `<div class="ms">· ${w.y} 「${U.esc(w.title)}」 ${aKindN(w.kind)}${w.src ? ` · ${w.src.kind} 원작` : ''} · ${U.esc(w.res)} · ${w.profit >= 0 ? `남은 돈 ${fmtWon(w.profit)}` : `손해 ${fmtWon(-w.profit)}`}</div>`).join('');
  return h;
}
