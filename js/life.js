'use strict';
// 생활: 집(월세·전세·매매), 매달 돈이 드는 관리, 한 번 들여놓는 장비, 한 번뿐인 시술

// 지역별 집값 (만 원). dep: 월세 보증금, jeonse: 전세금, buy: 아파트 값
const HOUSE = {
  gangnam: { dep: 1000, jeonse: 45000, buy: 250000 },
  seoul: { dep: 500, jeonse: 25000, buy: 120000 },
  metro: { dep: 500, jeonse: 18000, buy: 60000 },
  city: { dep: 300, jeonse: 12000, buy: 40000 },
  town: { dep: 300, jeonse: 8000, buy: 25000 },
  rural: { dep: 200, jeonse: 5000, buy: 15000 },
};
// 집 크기: 작은 집(s)·중간 집(m)·큰 집(l). 클수록 비싸고 매달 드는 돈도 많지만, 장비를 더 들일 수 있다 (2·4·6개)
// 이름: 작은 집은 원룸, 중간 집은 월세면 투룸·전세·매매면 아파트, 큰 집은 넓은 아파트 (예전 '오피스텔'은 원룸과 같은 작은 집이라 원룸으로 합쳤다)
const HOME_SIZES = ['s', 'm', 'l'];
const HOME_KIND = { monthly: { s: '원룸', m: '투룸', l: '넓은 아파트' }, jeonse: { s: '원룸', m: '아파트', l: '넓은 아파트' }, own: { s: '원룸', m: '아파트', l: '넓은 아파트' } };
const SIZE_EQ = { s: 2, m: 4, l: 6 };
// 값 배수: 월세 보증금·전세금은 작은 집이 기준, 매매는 HOUSE.buy(아파트 값)가 중간 집
// v151: 원룸을 사는 값은 아파트 값의 절반이 아니라 5분의 1 (서울 원룸 6억 → 2억 4천, 강남 12억 5천 → 5억)
const SIZE_PRICE = { monthly: { s: 1, m: 2, l: 5 }, jeonse: { s: 1, m: 2.2, l: 4.5 }, own: { s: 0.2, m: 1, l: 2.2 } };
// 집 크기와 스트레스 (v151): 좁은 집은 스트레스가 더디게 풀리고 넓은 집은 빨리 풀린다. 위치와는 상관없다. 본가는 보통, 기획사 숙소는 조금 더디다
const SIZE_REST = { s: 0.6, m: 1, l: 1.5 };
const SIZE_REST_N = { s: '스트레스가 더디게 풀린다', m: '스트레스가 보통으로 풀린다', l: '스트레스가 빨리 풀린다' };
function homeRest(s) { const h = s.home || {}; if (typeof isDorm === 'function' && isDorm(s)) return 0.8; if (s.army) return 1; if (h.mode !== 'alone' || !h.type) return 1; return SIZE_REST[homeSize(h)] || 1; }
// 이사 갈 동네: 지금 사는 계열이면 지금 동네, 고향 계열이면 고향, 그 밖에는 처음 정한 동네를 기억해 둔다 (집 창을 열 때마다 이름이 바뀌지 않게)
function mvPlace(s, rid) { if (rid === s.region) return s.place; if (rid === s.birthRegion && s.birthPlace) return s.birthPlace; s.mvP = s.mvP || {}; return s.mvP[rid] || (s.mvP[rid] = U.pick(REGION_BY[rid].places)); }
// 매달 드는 돈(월세·관리비·생활비) 배수
const SIZE_COST = { s: 1, m: 1.5, l: 2.5 };
// 예전 세이브: 크기가 없으면 월세·전세는 작은 집, 매매(내 아파트)는 중간 집
function homeSize(h) { return h.size || (h.type === 'own' ? 'm' : 's'); }
function homeName(type, size) { return `${type === 'monthly' ? '월세' : type === 'jeonse' ? '전세' : '내'} ${HOME_KIND[type][size]}`; }
function homePrice(rid, type, size) { const p = HOUSE[rid]; return Math.round((type === 'monthly' ? p.dep : type === 'jeonse' ? p.jeonse : p.buy) * SIZE_PRICE[type][size]); } // 만 원
function homeMonthly(rid, type, size) { return Math.round(REGION_BY[rid].rent * (type === 'monthly' ? 1 : type === 'jeonse' ? 0.55 : 0.45) * SIZE_COST[size]); } // 만 원
// 자녀가 셋 이상이면 아파트(전세·매매 중간 집, 넓은 아파트)에 살아야 한다 (피드백 24). 원룸·투룸은 안 된다
function needApt(s) { return typeof kids === 'function' && kids(s).length >= 3; }
function isAptHome(type, size) { return HOME_KIND[type][size].includes('아파트'); }
function inApt(s) { const h = s.home; return h.mode === 'alone' && isAptHome(h.type || 'monthly', homeSize(h)); }
function ownHouse(s) { return s.home.mode === 'alone' && s.home.type === 'own'; }

// 매달 돈이 드는 관리 (켜고 끌 수 있다). c: 월 비용(만 원)
const SUBS = {
  pt: { n: '개인 PT 트레이너', c: 80, d: '외모가 조금씩 오른다 · 관리하는 동안 외모가 조금씩 좋아지고, 그만두면 천천히 돌아간다', looks: true },
  skin: { n: '피부과 정기 관리', c: 40, d: '외모가 조금씩 좋아지고, 활동 중이면 하는 일의 인기도 조금씩 오른다 · 관리하는 동안 외모가 조금씩 좋아지고, 그만두면 천천히 돌아간다', looks: true },
  counsel: { n: '심리 상담', c: 30, d: '스트레스가 빨리 풀린다', lvs: true },
  // 아티스트(무대·화면에 서는 일)만: 개인 매니저 / 스태프(뒤에서 만드는 일)만: 업무 어시스턴트
  manager: { n: '개인 매니저 고용', c: 300, d: '스트레스가 덜 쌓이고 하는 일의 인기가 조금씩 오른다', min: 19, side: 'artist' },
  assist: { n: '업무 어시스턴트 고용', c: 200, d: '스트레스가 덜 쌓인다 · 자료 정리·일정 관리를 맡긴다', min: 19, side: 'staff' },
  // 자녀 교육비: 아이가 생긴 뒤에 보인다. 4~18세 아이마다 따로 정한다 (s.kidEdu). 아이의 특기가 빨리 는다 (familyMonth)
  kidedu: { n: '자녀 교육비 (과외·코칭)', c: 50, d: '아이의 잘하는 특기 세 개가 빨리 는다', kids: true },
};
const SIDE_N = { artist: '아티스트', staff: '스태프' };
// 지금 아티스트·스태프 일을 하고 있는지 (진로 창의 분류)
function sideNow(s, side) { return CAREER_PLAN.some(c => c.g === side && CAREERS[c.id] && trackOn(s, c.id)); }
// 자녀 교육비 단계: 없음·약간·보통·많이. c: 아이 한 명당 월 비용(만 원), base: 매달 잘하는 특기 세 개에 붙는 과외 양
// 심리 상담 단계: 단계가 높을수록 자주 받고 스트레스가 더 빨리 풀린다 (s.subs.counsel = 0~3)
const COUNSEL = [{ n: '안 함', c: 0, v: 0 }, { n: '1단계', c: 30, v: 1 }, { n: '2단계', c: 60, v: 1.7 }, { n: '3단계', c: 100, v: 2.5 }];
function counselLv(s) { const v = s.subs && s.subs.counsel; return v === true ? 1 : U.clamp(+v || 0, 0, 3); }
const KIDEDU = [{ n: '없음', c: 0, base: 0 }, { n: '약간', c: 50, base: 0.85 }, { n: '보통', c: 100, base: 1.65 }, { n: '많이', c: 200, base: 2.4 }];
function kidEduOf(s, k) { return ((s.kidEdu || {})[k.id]) || 0; }
// 관리(PT·피부과)로 오른 외모: 관리하는 동안 3개월에 1씩 올라 관리마다 3까지, 그만두면 같은 빠르기로 돌아간다
const CARE_LOOKS_MAX = 3;
function careLooksMonth(s) {
  const c = s.careLk = s.careLk || { pt: 0, skin: 0, on: 0 }, p = me(s);
  for (const id of ['pt', 'skin']) c[id] = U.clamp((c[id] || 0) + (s.subs && s.subs[id] ? 1 / 3 : -1 / 3), 0, CARE_LOOKS_MAX);
  const want = Math.floor(c.pt + 1e-6) + Math.floor(c.skin + 1e-6);
  let d = want - (c.on || 0);
  if (d > 0) d = Math.min(d, 100 - p.tal.looks);
  if (d) { p.tal.looks += d; c.on = (c.on || 0) + d; }
}

// 한 번 들여놓는 장비 (설치비 + 매달 유지비). k: 상승률이 오르는 특기 (그 특기를 배워야 보인다)
// 단계: 1단계 +25%, 업그레이드할 때마다 효과 2배(+50%, +100%), 업그레이드 값과 유지비는 단계마다 3배
const EQUIP = {
  acting: { n: '셀프테이프 촬영·연기 연습 세트', c: 250, up: 5, k: ['acting'], d: '카메라·조명·전신 거울. 연기 연습' },
  booth: { n: '집 방음 보컬 부스', c: 800, up: 10, k: ['vocal', 'rap'], d: '보컬·랩 연습' },
  studio: { n: '홈 레코딩 작업실', c: 1500, up: 20, k: ['compose', 'lyric'], d: '작곡·작사 연습' },
  room: { n: '합주실 장기 대여', c: 200, up: 40, k: ['guitar', 'bass', 'piano', 'keyboard', 'drum'], d: '악기 연습', out: true },
  dance: { n: '댄스 연습실 장기 대여', c: 300, up: 60, k: ['dance'], d: '댄스 연습', out: true },
  gaming: { n: '게이밍 장비 세트', c: 400, up: 5, k: ['game'], d: '게임 연습' },
  editpc: { n: '영상 작업용 PC', c: 350, up: 3, k: ['edit', 'direct'], d: '영상 편집·연출 연습' },
  tablet: { n: '드로잉 태블릿', c: 150, up: 2, k: ['art'], d: '그림 연습' },
  teachkit: { n: '강의 녹화 장비·교재 세트', c: 200, up: 4, k: ['edu'], d: '카메라·마이크·교재. 교육 연습' },
  scoutmon: { n: '오디션 영상 분석 모니터', c: 300, up: 4, k: ['scout'], d: '여러 화면에 영상을 띄워 비교한다. 스카우트 연습' },
  writing: { n: '집필 작업실', c: 250, up: 8, k: ['script'], d: '조용한 작업 공간, 집필용 노트북과 작법 프로그램. 작문 연습' },
  talk: { n: '토크·MC 연습 세트', c: 150, up: 3, k: ['variety'], d: '카메라·마이크·프롬프터. 예능 연습' },
  lang: { n: '어학 인강 이용권·전자사전', c: 100, up: 3, k: ['jp', 'en'], d: '원어민 화상 수업과 인강. 일본어·영어 연습', out: true },
  desk: { n: '공부방 꾸미기', c: 80, up: 2, k: ['study'], d: '책상·조명·인강 이용권. 학업 연습' },
  bizkit: { n: '경영 분석 프로그램·경제지 구독', c: 200, up: 4, k: ['biz'], d: '재무 분석 프로그램과 경제지 · 경영 강의 이용권. 사업 연습' },
};
// 전용 밴과 운전기사: 이동 시간이 줄어 일정 칸이 하나 늘어난다. 단계가 없고, 값은 가장 비싼 장비를 처음부터 끝 단계까지 올리는 값보다 비싸다
const VAN_ID = 'van';
EQUIP[VAN_ID] = { n: '전용 밴과 운전기사', slot: true, k: [], up: 300, min: 19, d: '넓은 승합차와 전담 운전기사. 이동하며 쉬고 준비할 수 있다', c: Math.ceil(Math.max(...Object.values(EQUIP).map(x => x.c * (1 + 3 + 9))) * 1.08 / 1000) * 1000 };
function vanOn(s) { return !!eqLv(s, VAN_ID) && age(s) >= 19; }
// rest: 쉬어야 하는 달 (0이면 바로 일상), risk: 부작용 확률 (0이면 없음)
const SURGERY = {
  laser: { n: '피부 레이저 시술', c: 150, v: 2, risk: 0, rest: 0, min: 16 },
  eyelid: { n: '쌍꺼풀 수술', c: 300, v: 5, risk: 0.05, rest: 1, min: 18 },
  nose: { n: '코 성형', c: 600, v: 6, risk: 0.07, rest: 1, min: 19 },
  contour: { n: '윤곽 수술', c: 1200, v: 9, risk: 0.08, rest: 2, min: 19 },
};

// 장비 단계 (예전 세이브의 true는 1단계)
const EQ_MAX = 3;
function eqLv(s, id) { const v = (s.equip || {})[id]; return v === true ? 1 : (v || 0); }
function eqPct(lv) { return lv ? 25 * Math.pow(2, lv - 1) : 0; }
function eqUp(id, lv) { return EQUIP[id].up * Math.pow(3, Math.max(0, lv - 1)); }
function eqCost(id, lv) { return EQUIP[id].c * Math.pow(3, lv); } // lv단계에서 다음 단계로 (0이면 처음 들여놓기)
// 집에 들일 수 있는 장비 수: 집 크기에 따라 (작은 집 2 · 중간 집 4 · 큰 집 6, 본가는 집안 형편에 따라 2/4/6)
// 연습실·합주실 장기 대여와 인강 이용권(out)은 집 밖이라 세지 않는다. 밴은 일정 칸 장비라 세지 않는다
function eqCap(s) { const h = s.home; if (h.mode === 'parents' || !h.type) return s.wealth <= 3 ? 2 : s.wealth <= 7 ? 4 : 6; return SIZE_EQ[homeSize(h)]; }
function eqHomeIds(s) { return Object.keys(EQUIP).filter(id => !EQUIP[id].slot && !EQUIP[id].out && eqLv(s, id)); }
// 좁은 집으로 옮기면 둘 자리가 없는 장비를 처분한다 (값이 싼 장비부터). 돌려주는 값: 처분한 장비 이름들
function eqFit(s) {
  const out = [], ids = eqHomeIds(s).sort((a, b) => EQUIP[a].c * Math.pow(3, eqLv(s, a)) - EQUIP[b].c * Math.pow(3, eqLv(s, b)));
  while (ids.length > eqCap(s)) { const id = ids.shift(); delete s.equip[id]; out.push(EQUIP[id].n); }
  return out;
}
function eqFitText(s) { const x = eqFit(s); return x.length ? ` 집이 좁아 ${josa(x.join('·'), '을를')} 처분했다.` : ''; }
// 장비는 독립한 뒤에 직접 들인다 (v117 장비 정책, 사용자 결정: 독립하지 않은 성인도 못 산다). 독립할 때 장비는 다 들고 나간다 (s.equip는 집이 아니라 나에게 붙어 있다)
// 들여놓은 순서 (v130): 장비 창 · 장비 박스에서 이 순서로 보인다. 처분하면 빠지고, 새로 들이면 맨 뒤에 붙는다
function eqOrder(s) {
  const have = Object.keys(EQUIP).filter(id => eqLv(s, id));
  s.eqOrd = (s.eqOrd || []).filter(id => have.includes(id)).concat(have.filter(id => !(s.eqOrd || []).includes(id)));
  return s.eqOrd;
}
// 내가 매달 내는 장비 유지비 (만 원). 본가에 사는 동안 부모님이 지원해 주신 장비는 부모님이 낸다
function eqMonthly(s) { let mine = 0, fam = 0; for (const id of eqOrder(s)) { const v = eqUp(id, eqLv(s, id)); if ((s.eqPar || {})[id] && s.home.mode !== 'alone') fam += v; else mine += v; } return { mine, fam }; }
function eqBuyWhy(s) { return s.home.mode === 'alone' ? '' : '독립한 뒤에 직접 들일 수 있다'; }
// 본가에 사는 동안: 한 특기를 여섯 달 넘게 일정에 넣으면, 부모님이 그 특기 쪽 장비를 가끔 사 주신다 (집안 형편에 따라 확률 · 값이 다르다)
// s.eqRun: 특기마다 일정에 연달아 넣은 달 수, s.eqPar: 부모님이 지원해 주신 장비(본가에 사는 동안 유지비도 부모님이 낸다), s.eqGift: 한 번 지원해 주신 장비
function parEqP(w) { return w <= 3 ? 0.04 : w <= 6 ? 0.1 : 0.18; }
function parEqMax(w) { return w <= 3 ? 200 : w <= 6 ? 500 : 2000; }
function parEquipMonth(s) {
  const run = s.eqRun = s.eqRun || {}, now = new Set(s.slots.filter(sl => sl.act && sl.act.startsWith('p_')).map(sl => sl.act.slice(2)));
  for (const k of Object.keys(run)) if (!now.has(k)) delete run[k];
  for (const k of now) run[k] = (run[k] || 0) + 1;
  if (s.home.mode === 'alone' || isDorm(s) || s.army || !parentsAlive(s).length || hasQ(s, 'par_equip')) return;
  const gift = s.eqGift || {}, w = s.wealth || 3;
  const L = Object.keys(EQUIP).filter(id => { const x = EQUIP[id]; return !x.slot && !eqLv(s, id) && !gift[id] && x.c <= parEqMax(w) && (x.out || eqHomeIds(s).length < eqCap(s)) && x.k.some(k => (run[k] || 0) >= 6 && has(me(s), k)); });
  if (!L.length || !U.chance(parEqP(w))) return;
  const id = U.pick(L), k = EQUIP[id].k.filter(k => (run[k] || 0) >= 6).sort((a, b) => run[b] - run[a])[0];
  queueEv(s, 'par_equip', 0, { id, k, who: U.pick(parentsAlive(s)).id });
}
E({
  id: 'par_equip', cat: '가족', title: '부모님의 선물',
  cond: s => s.home.mode !== 'alone' && !isDorm(s),
  init(s, d) { if (eqLv(s, d.id) || !s.people[d.who]) d.skip = true; },
  text: (s, d) => { const x = EQUIP[d.id], w = s.people[d.who].rel; return `${josa(w, '이가')} 내가 ${josa(skN(d.k), '을를')} 꾸준히 연습하는 걸 보시고 ${josa(x.n, '을를')} ${x.out ? '끊어' : '들여놓아'} 주셨다.`; },
  ch: (s, d) => [{ t: '감사히 쓴다', f: s => {
    const x = EQUIP[d.id];
    s.equip[d.id] = 1; (s.eqPar = s.eqPar || {})[d.id] = true; (s.eqGift = s.eqGift || {})[d.id] = true;
    s.mon.familyPaid = (s.mon.familyPaid || 0) + x.c * 1e4;
    return `${josa(s.people[d.who].rel, '이가')} ${josa(x.n, '을를')} 마련해 주셨다.`;
  } }],
});
// 기획사 숙소에 사는 동안에는 집 장비 대신 기획사 연습실 장비를 쓴다 (기획사마다 단계가 다르다: AGENCIES의 eq)
// 기획사에 있는 장비: 보컬 부스·작업실·합주실·댄스 연습실·연기 세트·토크 세트·어학 수업. 그 밖의 내 장비(게임·그림 등)는 숙소에서 못 쓴다
const AG_EQ = ['booth', 'studio', 'room', 'dance', 'acting', 'talk', 'lang'];
// 숙소를 주는 기획사: 아이돌 · 밴드 연습생(idol 트랙)이나 연습생에서 데뷔한 기획사 밴드(band 트랙, v116 버그 5)
function dormAg(s) { if (!isDorm(s)) return null; const t = [s.tracks.idol, s.tracks.band].find(x => x && x.ag && ['trainee', 'active', 'signed'].includes(x.st)); return t && AG[t.ag] ? AG[t.ag] : null; }
function equipLv(s, id) { const ag = dormAg(s); if (ag) return AG_EQ.includes(id) ? (ag.eq || 1) : 0; return eqLv(s, id); }
// kid: 같이 사는 자녀는 집 장비를 그대로 쓴다
function equipBonus(s, k, kid) {
  let b = 1;
  for (const id in EQUIP) { const l = kid ? eqLv(s, id) : equipLv(s, id); if (l && EQUIP[id].k.includes(k)) b = Math.max(b, 1 + eqPct(l) / 100); }
  return b;
}
// 같이 사는 자녀(19세까지)도 집에 들여놓은 장비로 연습한다
function homeKid(s, p) { return p.rel === '자녀' && p.alive !== false && pAge(s, p) < 20; }
function homeKids(s) { return typeof kids === 'function' ? kids(s).filter(k => homeKid(s, k)) : []; }
function houseAsset(s) { const h = s.home; return (h.deposit || 0) + (h.value || 0) - (h.loan || 0); }
function netWorth(s) { return s.money - s.debt + houseAsset(s); }
// 결혼한 뒤의 집안 형편: 재산을 합친 나와 배우자의 순자산과 최근 1년 수입(3년 치로 셈)으로 본다 (10단계)
function married(s) { return typeof isSpouse === 'function' && isSpouse(partner(s)); }
// 내가 느끼는 형편: 본가에 살면 부모님 형편도 함께 본다 (돈 걱정하는 일상 문구에 쓴다)
function feelRich(s) { const w = homeWealth(s); return s.home && s.home.mode === 'parents' ? Math.max(w, s.wealth) : w; }
function homeWealth(s) {
  const yr = (s.monHist || []).reduce((a, m) => a + Object.values(m.items || {}).reduce((x, v) => x + Math.max(0, v), 0), 0);
  const v = netWorth(s) + yr * 3, cut = [0, 5e7, 1.5e8, 3e8, 6e8, 1e9, 2e9, 4e9, 1e10];
  return 1 + cut.filter(c => v >= c).length;
}
// 집에 들어가 있는 내 돈의 이름: 이사하거나 팔면 돌려받는다
function houseLabel(s) { const t = s.home.type; return t === 'own' ? '내 집 값' : t === 'jeonse' ? '전세 보증금' : '월세 보증금'; }
function houseNote(s) { const h = s.home; return (h.loan ? '대출을 뺀 금액 · ' : '') + (h.type === 'own' ? '집을 팔면 돌려받는다' : '이사 나갈 때 돌려받는다'); }

// 매달 집 관련 비용 (기획사 숙소에 살 때는 들지 않는다)
// 본가에 살 때 보태는 생활비: 나이가 들수록 늘고, 번 돈의 15%도 함께 보탠다 (최대 100만 원)
function homeBase(s) { const a = age(s), poor = s.wealth <= 3; return (a < 23 ? (poor ? 50 : 25) : a < 27 ? (poor ? 60 : 40) : (poor ? 80 : 60)) + (s.flags.homeFeeUp ? 30 : 0); }
function homeFee(s) { return homeBase(s) * 1e4 + Math.min(100e4, Math.round(((s.mon.ent || 0) + (s.mon.job || 0)) * 0.15 / 1e4) * 1e4); }
function housingMonth(s) {
  const h = s.home, r = REGION_BY[s.region];
  // 결혼했는데 원룸에 살면 둘이 살 집으로 옮긴다 (events.js home_wed)
  // 자녀가 셋이면 아파트로 옮긴다 (events.js home_kids). 원룸에 사는 부부도 이걸로 함께 옮긴다
  // 결혼했는데 본가에 살면(숙소 · 군대에서 돌아왔을 때) 둘이 살 집을 구한다. 숙소를 막 나온 달은 숙소 창(dorm_out)이 먼저 묻는다
  const free = !isDorm(s) && !s.army && !s.dormWas && !hasQ(s, 'dorm_out');
  if (needApt(s) && !inApt(s) && free) { if (!hasQ(s, 'home_kids')) queueEv(s, 'home_kids', 0); }
  else if (married(s) && (h.mode === 'parents' || (h.mode === 'alone' && homeSize(h) === 's')) && free && !hasQ(s, 'home_wed')) queueEv(s, 'home_wed', 0);
  if (h.mode === 'parents' && parentsAlive(s).length) { addMoney(s, -homeFee(s), '생활비 보태기'); if (age(s) >= 28) addStress(s, 0.6); return; }
  const type = h.type || 'monthly', mc = homeMonthly(s.region, type, homeSize(h));
  addMoney(s, -mc * 1e4, type === 'monthly' ? '월세·생활비' : '관리비·생활비');
  if (type === 'own') h.value = Math.round((h.value || 0) * 1.0025);
  if (h.loan > 0) {
    const pay = Math.min(h.loan, Math.round(h.loan * 0.004) + 30e4);
    addMoney(s, -(pay + Math.round(h.loan * 0.0035)), '주택 대출 상환');
    h.loan -= pay;
  }
}
// 자녀 교육비를 받을 수 있는 아이 (4~18세)
function kidsInEdu(s) { return typeof kids === 'function' ? kids(s).filter(k => kidAge(s, k) >= 4 && kidAge(s, k) <= 18) : []; }
// 매달 관리 비용 (만 원). 자녀 교육비는 아이마다 정한 단계를 더한다
function subCost(s, id) { return id === 'kidedu' ? kidsInEdu(s).reduce((a, k) => a + KIDEDU[kidEduOf(s, k)].c, 0) : id === 'counsel' ? COUNSEL[counselLv(s)].c : SUBS[id].c; }
// 관리·장비 유지비와 효과
function subsMonth(s) {
  const sb = s.subs || {}, eq = s.equip || {};
  for (const id in sb) {
    if (!sb[id] || !SUBS[id] || SUBS[id].kids) continue;
    // 개인 매니저는 아티스트, 업무 어시스턴트는 스태프로 일할 때만 쓴다
    const side = SUBS[id].side;
    if (side && !sideNow(s, side)) { sb[id] = false; addLog(s, `${SIDE_N[side]} 일을 하지 않게 되어 ${josa(SUBS[id].n, '을를')} 그만뒀다.`); continue; }
    const c = subCost(s, id) * 1e4;
    if (s.money < c) { sb[id] = false; addLog(s, `돈이 모자라 ${josa(SUBS[id].n, '을를')} 그만뒀다.`); continue; }
    addMoney(s, -c, SUBS[id].n);
    if (id === 'skin' && anyTrackActive(s)) jpopAll(s, 0.05);
    if (id === 'counsel') addStress(s, -COUNSEL[counselLv(s)].v);
    if (id === 'manager') { addStress(s, -2); if (anyTrackActive(s)) jpopAll(s, 0.08); }
    if (id === 'assist') addStress(s, -2.8);
  }
  careLooksMonth(s);
  sibLoanMonth(s);
  // 자녀 교육비: 아이마다 정한 단계만큼 낸다. 19세가 되면 끝나고, 돈이 모자라면 그 아이 몫은 그만둔다
  const ke = s.kidEdu || {};
  for (const id of Object.keys(ke)) {
    const k = s.people[id];
    if (!ke[id] || !k || !k.alive || k.rel !== '자녀') { delete ke[id]; continue; }
    if (kidAge(s, k) > 18) { delete ke[id]; addLog(s, `${josa(k.name, '이가')} 다 커서 자녀 교육비를 그만 냈다.`); continue; }
    if (kidAge(s, k) < 4) continue;
    const c = KIDEDU[ke[id]].c * 1e4;
    if (s.money < c) { delete ke[id]; addLog(s, `돈이 모자라 ${k.name}의 자녀 교육비를 그만 냈다.`); continue; }
    addMoney(s, -c, '자녀 교육비');
  }
  // 부모님이 사 주신 장비는 본가에 사는 동안 유지비도 부모님이 낸다 (v117 장비 정책). 독립하면 들고 나가서 내가 낸다
  for (const id in eq) { const l = eqLv(s, id); if (!l || !EQUIP[id]) continue; const v = eqUp(id, l) * 1e4; if ((s.eqPar || {})[id] && s.home.mode !== 'alone') s.mon.familyPaid = (s.mon.familyPaid || 0) + v; else addMoney(s, -v, '장비 유지비'); }
}

// 이사: 지금 집을 정리하고(보증금·집값을 돌려받고) 새 집으로 옮긴다
function leaveHome(s) {
  const h = s.home;
  let back = (h.deposit || 0) + (h.value || 0) - (h.loan || 0);
  if (back > 0) addMoney(s, back, '집 정리 (보증금·집값)');
  else if (back < 0) s.debt += -back;
  h.deposit = 0; h.value = 0; h.loan = 0;
}
// 이사할 때 내 돈으로 내는 몫 (월세 보증금 전부, 전세금 20%, 집값 30%. 나머지는 대출)
function homeNeed(rid, type, size) { const v = homePrice(rid, type, size); return (type === 'monthly' ? v : Math.round(v * (type === 'jeonse' ? 0.2 : 0.3))) * 1e4; }
// 크기를 정하지 않으면 작은 집(원룸). 결혼했으면 원룸에서 살 수 없어서 중간 집(투룸·아파트)
function moveTo(s, regionId, type, size) {
  size = size || (needApt(s) ? (type === 'monthly' ? 'l' : 'm') : married(s) ? 'm' : 's');
  const r = REGION_BY[regionId], v = homePrice(regionId, type, size) * 1e4, need = homeNeed(regionId, type, size);
  leaveHome(s);
  const h = s.home;
  h.mode = 'alone'; h.type = type; h.size = size; s.flags.livedAlone = true;
  if (type === 'monthly') { addMoney(s, -need, '월세 보증금'); h.deposit = need; }
  if (type === 'jeonse') { addMoney(s, -need, '전세금 (내 돈)'); h.deposit = v; h.loan = v - need; }
  if (type === 'own') { addMoney(s, -need, '집값 (내 돈)'); h.value = v; h.loan = v - need; }
  if (s.region !== regionId) { const pl = mvPlace(s, regionId); s.region = regionId; s.place = pl; }
  if (type === 'own') milestone(s, `${age(s)}세에 ${s.place}에 내 집(${HOME_KIND.own[size]})을 마련했다.`);
  return `${josa(s.place, '으로')} 이사했다. (${homeName(type, size)})` + eqFitText(s);
}
function moveHomeParents(s) {
  leaveHome(s);
  s.home.mode = 'parents'; s.home.type = null; s.home.size = null;
  s.region = s.birthRegion; s.place = s.birthPlace || s.place;
  return '본가로 돌아갔다.' + eqFitText(s);
}

// 생활 창에 보일 행동들. sec: 어느 창에 넣을지 (집 = home·loan, 지속 관리 = subs, 장비 설치 = equip, 기타 = surgery·rest)
// 한 줄 모양: t 이름(굵게), price 돈(가장 눈에 띄게), eff 효과, note 덧붙이는 말(작게)
function lifeActs(s) {
  const A = [], a = age(s), h = s.home;
  const canMove = a >= 19 && !isDorm(s) && !s.army;
  const why = s.army ? '군 복무 중' : isDorm(s) ? '지금은 기획사 숙소에 산다' : '성인이 된 뒤에 할 수 있다';
  const targets = [s.region];
  if (s.region !== 'seoul') targets.push('seoul');
  if (s.region !== 'gangnam') targets.push('gangnam');
  // 고향으로 내려가는 길도 열어 둔다 (v151)
  if (s.birthRegion && !targets.includes(s.birthRegion)) targets.push(s.birthRegion);
  const nEq = eqHomeIds(s).length;
  for (const type of ['monthly', 'jeonse', 'own']) for (const rid of targets) for (const size of HOME_SIZES) {
    const r = REGION_BY[rid], v = homePrice(rid, type, size) * 1e4, need = homeNeed(rid, type, size), monthly = homeMonthly(rid, type, size), nm = homeName(type, size);
    const here = rid === s.region && h.mode === 'alone' && h.type === type && homeSize(h) === size && !isDorm(s);
    const eqTxt = `장비 ${SIZE_EQ[size]}개까지 · ${SIZE_REST_N[size]}`, pn = mvPlace(s, rid);
    const lose = !here && nEq > SIZE_EQ[size] ? ` · 지금 장비 ${nEq}개 중 ${nEq - SIZE_EQ[size]}개는 둘 자리가 없어 처분한다` : '';
    const info = type === 'monthly' ? { price: `보증금 ${fmtWon(need)}`, eff: `매달 월세·생활비 ${monthly}만 원 · ${eqTxt}`, note: lose.slice(3) }
      : type === 'jeonse' ? { price: `전세금 ${fmtWon(v)} · 내 돈 ${fmtWon(need)}`, eff: `월세 없음 · 매달 관리비·생활비 ${monthly}만 원 + 대출 상환 · ${eqTxt}`, note: `전세금 중 내 돈(20%)을 뺀 나머지는 대출 · 나갈 때 전세금을 돌려받는다${lose}` }
        : { price: `집값 ${fmtWon(v)} · 내 돈 ${fmtWon(need)}`, eff: `매달 관리비·생활비 ${monthly}만 원 + 대출 상환 · ${eqTxt}`, note: `집값 중 내 돈(30%)을 뺀 나머지는 대출 · 집값이 조금씩 오르고, 팔 때 돌려받는다${lose}` };
    const back = houseAsset(s);
    if (here) { A.push(Object.assign({ sec: 'home', homeType: type, t: `${pn} ${nm}`, tag: '지금 사는 집', ok: false, why: '', btn: '사는 중', run: () => '' }, info)); continue; }
    if (size === 's' && married(s)) continue; // 결혼하면 원룸에서 살 수 없다
    if (needApt(s) && !isAptHome(type, size)) continue; // 자녀가 셋이면 아파트에서 산다
    if (rid !== s.region) info.note = r.d + (info.note ? ` · ${info.note}` : '');
    A.push(Object.assign({ sec: 'home', homeType: type, t: `${pn} ${nm}`, ok: canMove && s.money + Math.max(0, back) >= need, why: canMove ? `돈이 모자라다 (${fmtWon(need)} 필요)` : why, btn: '이사', run: s => moveTo(s, rid, type, size) }, info));
  }
  // 집 팔기 (내 집): 판 돈으로 남은 대출을 갚고 나머지를 받은 뒤, 같은 동네 월세 원룸(결혼했으면 투룸)으로 옮긴다
  if (h.mode === 'alone' && h.type === 'own') {
    const sz = needApt(s) ? 'l' : married(s) ? 'm' : 's', mn = homeName('monthly', sz), dep = homeNeed(s.region, 'monthly', sz), got = houseAsset(s);
    A.push({ sec: 'home', homeType: 'own', t: '집 팔기', price: `받는 돈 ${fmtWon(got)}`, eff: `지금 집값 ${fmtWon(h.value || 0)}${h.loan ? ` · 남은 대출 ${fmtWon(h.loan)}을 먼저 갚는다` : ''}`, note: `같은 동네 ${josa(mn, '으로')} 옮긴다 (보증금 ${fmtWon(dep)})`, ok: !s.army && s.money + got >= dep, why: s.army ? '군 복무 중' : '돈이 모자라다', danger: true, btn: '팔기', confirm: `집을 팔까요?\n${josa(fmtWon(got), '을를')} 받고 같은 동네 ${josa(mn, '으로')} 옮겨요.`, run: s => { const g = houseAsset(s); moveTo(s, s.region, 'monthly', sz); return `집을 팔아 ${josa(fmtWon(g), '을를')} 받았다. 같은 동네 ${josa(mn, '으로')} 옮겼다.`; } });
  }
  // 대출·빚 한 번에 갚기, 형제자매에게 빌리기
  if (h.loan > 0) A.push({ sec: 'loan', t: `${h.type === 'own' ? '주택' : '전세'} 대출 한 번에 갚기`, price: `남은 대출 ${fmtWon(h.loan)}`, eff: '다 갚으면 매달 나가던 대출 상환이 없어진다', ok: s.money >= h.loan, why: `돈이 모자라다 (${fmtWon(h.loan)} 필요)`, btn: '갚기', confirm: `남은 대출 ${josa(fmtWon(h.loan), '을를')} 한 번에 갚을까요?`, run: s => { const v = s.home.loan; addMoney(s, -v, '대출 한 번에 갚기'); s.home.loan = 0; return `남은 대출 ${josa(fmtWon(v), '을를')} 다 갚았다.`; } });
  if (s.debt > 0) A.push({ sec: 'loan', t: '빚 한 번에 갚기', price: `남은 빚 ${fmtWon(s.debt)}`, eff: '빚은 매달 이자가 붙는다', ok: s.money >= s.debt, why: `돈이 모자라다 (${fmtWon(s.debt)} 필요)`, btn: '갚기', confirm: `남은 빚 ${josa(fmtWon(s.debt), '을를')} 한 번에 갚을까요?`, run: s => { const v = s.debt; addMoney(s, -v, '빚 갚기'); s.debt = 0; return `남은 빚 ${josa(fmtWon(v), '을를')} 다 갚았다.`; } });
  if (s.sibLoan) A.push({ sec: 'loan', t: '형제자매에게 빌린 돈 한 번에 갚기', price: `남은 돈 ${fmtWon(s.sibLoan.left)}`, eff: `지금은 매달 ${fmtWon(s.sibLoan.pay)}씩 저절로 갚는 중`, ok: s.money >= s.sibLoan.left, why: '돈이 모자라다', btn: '갚기', run: s => { const v = s.sibLoan.left; addMoney(s, -v, '형제자매에게 갚은 돈'); s.sibLoan = null; s.cd.sibLoan = s.t + 12; return `형제자매에게 빌린 ${josa(fmtWon(v), '을를')} 다 갚았다.`; } });
  if (s.friendLoan) A.push({ sec: 'loan', t: `${s.friendLoan.name}에게 빌린 돈 한 번에 갚기`, price: `남은 돈 ${fmtWon(s.friendLoan.left)}`, eff: `지금은 매달 ${fmtWon(s.friendLoan.pay)}씩 저절로 갚는 중`, ok: s.money >= s.friendLoan.left, why: '돈이 모자라다', btn: '갚기', run: s => { const L = s.friendLoan; addMoney(s, -L.left, `${L.name}에게 갚은 돈`); s.friendLoan = null; return `${L.name}에게 빌린 ${josa(fmtWon(L.left), '을를')} 다 갚았다.`; } });
  // 형제자매에게 빌리기: 가장 가까운 형제에게 빌린다
  { const b = bestSib(s); if (a >= 19 && b) { const v = sibLendAmt(s), no = sibLendWhy(s, b); A.push({ sec: 'loan', t: `${b.name}에게 돈 빌리기`, price: fmtWon(v), eff: `형제자매 · 이자 없음 · 매달 ${fmtWon(sibLoanPay(v))}씩 저절로 갚는다`, ok: !no, why: no, btn: '빌리기', confirm: `${b.name}에게 ${josa(fmtWon(v), '을를')} 빌릴까요?\n매달 ${fmtWon(sibLoanPay(v))}씩 저절로 갚아요.`, run: s => sibBorrow(s, b) }); } }
  if (h.mode === 'alone' && parentsAlive(s).length) A.push({ sec: 'home', homeType: 'parents', t: '본가로 돌아가기', price: `생활비 월 ${homeBase(s)}만 원`, eff: `${josa(s.birthPlace || '본가', '으로')} 돌아간다 · 번 돈의 15%도 보탠다`, note: houseAsset(s) ? `지금 집은 정리한다 (${fmtWon(houseAsset(s))} 돌려받음)` : '', ok: canMove && !s.flags.kickedOut && !needApt(s) && !married(s), why: s.flags.kickedOut ? '부모님이 다시 들어오는 건 반대하신다' : needApt(s) ? '아이가 셋이라 아파트에서 살아야 한다' : married(s) ? '결혼했으면 둘이 살 집에서 산다' : why, btn: '돌아가기', run: moveHomeParents });

  for (const [id, x] of Object.entries(SUBS)) {
    const on = !!(s.subs && s.subs[id]);
    const [eff, note] = x.d.split(' · ');
    if (s.army && !x.kids) continue; // 군 복무 중에는 지속 관리를 쓸 수 없다 (v129)
    // 자녀 교육비는 아이가 생긴 뒤에만 보인다. 아이를 골라 없음·약간·보통·많이 중에서 정한다
    if (x.kids) {
      if (!(typeof kids === 'function' && kids(s).length)) continue;
      const ks = kidsInEdu(s).sort((p, q) => p.by - q.by), total = subCost(s, id);
      const row = { sec: 'subs', t: x.n, tag: total ? '내는 중' : '', price: total ? `월 ${total}만 원` : '아이마다 월 50만~200만 원', eff: x.d, note: `아이마다 약간 월 ${KIDEDU[1].c}만 · 보통 ${KIDEDU[2].c}만 · 많이 ${KIDEDU[3].c}만 원 · 4~18세`, ok: true };
      if (!ks.length) { A.push(Object.assign(row, { why: '교육받을 나이(4~18세)의 아이가 없다', opts: [] })); continue; }
      const sel = ks.find(k => k.id === (typeof UI !== 'undefined' && UI.kidEdu)) || ks[0], cur = kidEduOf(s, sel);
      const opts = KIDEDU.map((e, lv) => ({ btn: e.n, on: lv === cur, ok: lv === cur || lv === 0 || s.money >= e.c * 1e4, run: s => { if (lv === cur) return ''; s.kidEdu = s.kidEdu || {}; if (lv) s.kidEdu[sel.id] = lv; else delete s.kidEdu[sel.id]; return lv ? `${sel.name}의 자녀 교육비를 '${e.n}'${josa(e.n, '으로').slice(e.n.length)} 정했다. (월 ${e.c}만 원)` : `${sel.name}의 자녀 교육비를 그만 냈다.`; } }));
      A.push(Object.assign(row, { kidSel: { ks: ks.map(k => ({ id: k.id, n: `${k.name} (${kidAge(s, k)}세) · ${KIDEDU[kidEduOf(s, k)].n}` })), cur: sel.id }, opts }));
      continue;
    }
    // 심리 상담: 안 함·1단계·2단계·3단계 중에서 고른다
    if (x.lvs) {
      const cur = counselLv(s), young = a < (x.min || 14);
      const opts = COUNSEL.map((e, lv) => ({ btn: e.n, on: lv === cur, ok: lv === cur || lv === 0 || (!young && s.money >= e.c * 1e4), run: s => { if (lv === cur) return ''; s.subs[id] = lv; return lv ? `${josa(x.n, '을를')} ${e.n}${josa(e.n, '으로').slice(e.n.length)} 받기로 했다. (월 ${e.c}만 원)` : `${josa(x.n, '을를')} 그만뒀다.`; } }));
      if (young && !cur) continue; // v118 UI B3: 나이가 안 되는 항목은 목록에서 숨긴다
      A.push({ sec: 'subs', t: x.n, tag: cur ? COUNSEL[cur].n : '', price: cur ? `월 ${COUNSEL[cur].c}만 원` : `월 ${COUNSEL[1].c}만~${COUNSEL[3].c}만 원`, eff, note: `1단계 월 ${COUNSEL[1].c}만 · 2단계 ${COUNSEL[2].c}만 · 3단계 ${COUNSEL[3].c}만 원`, ok: true, why: young ? `${x.min || 14}세부터` : '', opts });
      continue;
    }
    // 개인 매니저는 아티스트, 업무 어시스턴트는 스태프로 일하는 동안만 보인다
    if (x.side && !on && !sideNow(s, x.side)) continue;
    if (!on && a < (x.min || 14)) continue;
    const cost = subCost(s, id);
    A.push({ sec: 'subs', t: x.n, tag: on ? '이용 중' : '', price: `월 ${x.c}만 원`, eff, note: note || '', ok: on || (a >= (x.min || 14) && s.money >= cost * 1e4), why: a < (x.min || 14) ? `${x.min || 14}세부터` : '돈이 모자라다', btn: on ? '그만두기' : '시작하기', danger: on, run: s => { s.subs[id] = !on; return on ? `${josa(x.n, '을를')} 그만뒀다.` : `${josa(x.n, '을를')} 시작했다.`; } });
  }
  for (const [id, x] of Object.entries(EQUIP)) {
    const l = eqLv(s, id);
    // 일정 칸을 늘리는 장비: 단계 없이 들여놓기·처분하기만 있다
    if (x.slot) {
      if (l) A.push({ sec: 'equip', lv: 0.5, t: x.n, tag: '이용 중', price: '일정 한 칸 더', eff: `유지비 월 ${x.up}만 원`, note: x.d, ok: true, btn: '처분하기', danger: true, confirm: `${josa(x.n, '을를')} 처분할까요?\n일정 칸이 하나 줄고, 들인 돈은 돌려받지 못해요.`, run: s => { s.equip[id] = 0; refreshSlots(s); return `${josa(x.n, '을를')} 처분했다. 일정 칸이 하나 줄었다.`; } });
      else if (a >= x.min) A.push({ sec: 'equip', t: x.n, price: `설치 ${fmtWon(x.c * 1e4)}`, eff: '일정 한 칸 더', note: `${x.d} · 유지비 월 ${x.up}만 원`, ok: !eqBuyWhy(s) && a >= x.min && s.money >= x.c * 1e4, why: eqBuyWhy(s) || (a < x.min ? `${x.min}세부터` : '돈이 모자라다'), btn: '들여놓기', run: s => { addMoney(s, -x.c * 1e4, x.n); s.equip[id] = 1; refreshSlots(s); return `${josa(x.n, '을를')} 들여놓았다. 이제 한 달에 일정을 하나 더 할 수 있다.`; } });
      continue;
    }
    // 내가 배운 특기이거나, 같이 사는 자녀가 배운 특기면 보인다
    const kidUse = homeKids(s).some(c => x.k.some(k => has(c, k)));
    if (!l && !x.k.some(k => has(me(s), k)) && !kidUse) continue;
    const parts = x.d.split('. '), what = parts.pop().replace(/ 연습$/, ''), gear = parts.join('. ');
    if (l) {
      // 들여놓은 장비는 한 칸: 첫 줄은 지금 효과와 처분하기, 둘째 줄은 업그레이드 (3단계 +100%가 끝)
      // 독립 전에 부모님이 지원해 주신 장비는 처분할 수 없다 (v123): 버튼 없이 한 줄만. 독립하면 내 것이라 처분할 수 있다
      const par = (s.eqPar || {})[id] && s.home.mode !== 'alone';
      const lines = [par ? { price: `${what} 상승률 +${eqPct(l)}%`, eff: '부모님이 지원해 주셨다 · 유지비도 부모님이 낸다' } : { price: `${what} 상승률 +${eqPct(l)}%`, eff: `유지비 월 ${eqUp(id, l)}만 원`, ok: true, btn: '처분하기', danger: true, confirm: `${josa(x.n, '을를')} 처분할까요?\n들인 돈은 돌려받지 못해요.`, run: s => { s.equip[id] = 0; if (s.eqPar) delete s.eqPar[id]; return `${josa(x.n, '을를')} 처분했다.`; } }];
      if (l < EQ_MAX) { const c = eqCost(id, l) * 1e4; lines.push({ price: `업그레이드 ${fmtWon(c)}`, eff: `상승률 +${eqPct(l)}% → +${eqPct(l + 1)}% · 유지비 월 ${eqUp(id, l)}만 → ${eqUp(id, l + 1)}만 원`, ok: !eqBuyWhy(s) && s.money >= c, why: eqBuyWhy(s) || '돈이 모자라다', btn: '업그레이드', run: s => { addMoney(s, -c, `${x.n} 업그레이드`); s.equip[id] = l + 1; return `${josa(x.n, '을를')} ${l + 1}단계로 업그레이드했다. (상승률 +${eqPct(l + 1)}%)`; } }); }
      else lines.push({ eff: '가장 높은 단계다' });
      A.push({ sec: 'equip', lv: l, t: x.n, tag: `${l}단계${par ? ' · 부모님이 지원해 주심' : ''}`, lines });
      continue;
    }
    A.push({ sec: 'equip', t: x.n, price: `설치 ${fmtWon(x.c * 1e4)}`, eff: `${what} 상승률 +${eqPct(1)}%`, note: `${gear ? gear + ' · ' : ''}유지비 월 ${x.up}만 원`, ok: !eqBuyWhy(s) && s.money >= x.c * 1e4 && (x.out || eqHomeIds(s).length < eqCap(s)), why: eqBuyWhy(s) ? eqBuyWhy(s) : !x.out && eqHomeIds(s).length >= eqCap(s) ? `집에 자리가 없다 (지금 집은 ${eqCap(s)}개까지)` : '돈이 모자라다', btn: '들여놓기', run: s => { addMoney(s, -x.c * 1e4, x.n); s.equip[id] = 1; return `${josa(x.n, '을를')} 들여놓았다.`; } });
  }
  for (const [id, x] of Object.entries(SURGERY)) {
    if (s.flags[id] || a < x.min) continue;
    const safe = !x.risk && !x.rest;
    A.push({ sec: 'surgery', t: x.n, price: fmtWon(x.c * 1e4), eff: `외모 재능 +${x.v}`, note: `${x.rest ? `${x.rest}개월 쉰다` : '쉬지 않아도 된다'} · ${x.risk ? `부작용 ${Math.round(x.risk * 100)}%` : '부작용 없음'} · 평생 한 번`, ok: a >= x.min && s.money >= x.c * 1e4 && !s.ill, why: a < x.min ? `${x.min}세부터` : s.ill ? '몸이 회복된 뒤에 할 수 있다' : '돈이 모자라다', danger: !safe, btn: safe ? '받기' : '수술받기', run: s => {
      addMoney(s, -x.c * 1e4, safe ? '시술' : '수술'); s.flags[id] = true;
      if (x.rest) s.ill = { n: '수술 회복', left: x.rest, rest: true };
      if (U.chance(x.risk)) return `${x.n} 결과가 마음에 들지 않는다. 한동안 거울을 보기 싫었다.` + fx(s, { tal: { looks: -3 } });
      return `${josa(x.n, '을를')} 받았다.` + fx(s, { tal: { looks: x.v } });
    } });
  }
  // 새 특기 배우기: 성인이 되면 아직 안 배운 특기를 직접 골라 학원에 등록할 수 있다 (석 달에 한 번)
  if (a >= 19) { const left = learnable(s);
    A.push({ sec: 'learn', t: '새 특기 배우기', price: '학원비 한 달 치', eff: '아직 안 배운 특기를 골라 학원에 등록한다', note: '석 달에 한 번', ok: a >= 19 && !s.army && left.length > 0 && !(s.cd.learn > s.t), why: a < 19 ? '성인이 된 뒤에' : s.army ? '군 복무 중' : !left.length && !skRoom(s) ? `특기가 ${SKILL_CAP}개다. 특기 칸에서 하나를 그만둬야 새로 배울 수 있다` : !left.length ? '배울 수 있는 특기를 다 배웠다' : `${s.cd.learn - s.t}개월 뒤에 다시`, btn: '고르기', run: s => { fireEvent(s, 'learn_pick', {}); return ''; } }); }
  if (a >= 19) A.push({ sec: 'rest', autoKey: 'trip', autoMin: 450e4, autoH: '켜 두면 반년마다, 가진 돈이 450만 원 이상일 때 저절로 다녀온다', t: '여행 다녀오기', price: '150만 원', eff: '스트레스가 크게 풀린다', note: '반년에 한 번', ok: a >= 19 && s.money >= 150e4 && !(s.cd.trip > s.t) && !s.army, why: a < 19 ? '성인이 된 뒤에' : s.cd.trip > s.t ? '얼마 전에 다녀왔다' : '돈이 모자라다', btn: '다녀오기', run: s => { s.cd.trip = s.t + 6; return U.pick(['제주도', '부산', '오사카', '방콕', '강릉']) + '에 다녀왔다.' + fx(s, { money: -150e4, stress: -35 }); } });
  return A;
}

// 생활 자동 (턴제 실험 6차): '🔁 자동'을 켜 둔 생활 행동(여행)은 할 수 있게 되면 저절로 한다
function lifeAutoMonth(s) {
  const on = s.lifeAuto || {};
  if (!Object.keys(on).some(k => on[k]) || s.pending) return;
  for (const a of lifeActs(s)) if (a.autoKey && on[a.autoKey] && a.ok && !(a.autoMin && s.money < a.autoMin)) { const r = a.run(s); if (r) addLog(s, '🔁 ' + r, 'flavor'); }
}

// ───── 돈 빌리기 ─────
// 형제자매: 성인이고 가진 돈이 1,000만 원 밑이거나 빚이 있을 때. 친밀도가 SIB_LEND_AFF 아래인 형제는 빌려주지 않고, 빌리면 그 형제와 친밀도가 떨어진다
// 빌려주는 돈은 집안 형편에 따라 다르다 (형제가 둘 이상이면 1.5배)
// 지인(가족·연인이 아닌 사람): 친밀도 100일 때만, 평생 한 번 (화면에 조건은 따로 적지 않는다)
// 어느 쪽이든 이자는 없고 매달 빌린 돈의 5%(최소 20만 원)씩 저절로 갚는다
const SIB_LEND_AFF = 40, SIB_LEND_HURT = 12, FRIEND_LEND_HURT = 10;
function sibs(s) { return people(s, p => p.rel === '형제자매'); }
function sibCount(s) { return sibs(s).length; }
// 돈을 빌릴 수 있는 형제자매는 스무 살 이상만 (v116 버그 10: 16세 동생에게 1,500만 원을 빌릴 수 있었다)
function bestSib(s) { return sibs(s).filter(x => pAge(s, x) >= 20).sort((a, b) => b.aff - a.aff)[0] || null; }
function sibLendAmt(s) { const w = s.wealth || 3; return (w >= 9 ? 3000 : w >= 7 ? 1500 : w >= 4 ? 500 : 200) * 1e4 * (sibCount(s) >= 2 ? 1.5 : 1); }
function sibLoanPay(v) { return Math.max(20e4, Math.round(v * 0.05 / 1e4) * 1e4); }
// 빌릴 수 없는 까닭 (빌릴 수 있으면 빈 글자). b: 빌려줄 형제 (없으면 가장 가까운 형제)
function sibLendWhy(s, b) {
  b = b || bestSib(s);
  if (!b) return '돈을 빌릴 만한 형제자매가 없다';
  if (pAge(s, b) < 20) return b.by > me(s).by ? '아직 어린 동생이다' : '아직 스무 살이 안 됐다';
  if (age(s) < 19) return '성인이 된 뒤에';
  if (s.sibLoan) return '지난번에 빌린 돈을 아직 갚는 중이다';
  if (s.cd.sibLoan > s.t) return '얼마 전에 다 갚았다';
  if (s.money >= 1000e4 && s.debt <= 0) return '돈이 넉넉할 때는 빌릴 수 없다';
  if (b.aff < SIB_LEND_AFF) return `${josa(b.name, '은는')} 빌려줄 만큼 가깝지 않다`;
  return '';
}
function sibBorrow(s, b) {
  b = b || bestSib(s);
  const v = sibLendAmt(s);
  addMoney(s, v, '형제자매에게 빌린 돈');
  s.sibLoan = { left: v, pay: sibLoanPay(v), from: b.id };
  aff(b, -SIB_LEND_HURT);
  return `${b.name}에게 ${josa(fmtWon(v), '을를')} 빌렸다. 매달 ${fmtWon(s.sibLoan.pay)}씩 갚기로 했다.` + fx(s, { stress: 2 });
}
// 지인에게 빌리기 (가족·연인·배우자·자녀가 아닌 사람)
function friendLendAmt(n) { return (n.ind ? 3000 : 1000) * 1e4; }
function friendLendOK(s, n) { return age(s) >= 19 && pAge(s, n) > 25 && n.aff >= 100 && !s.flags.friendLoan && !s.friendLoan && !['형제자매', '엄마', '아빠', '자녀', '연인', '배우자'].includes(n.rel); }
function friendBorrow(s, n) {
  const v = friendLendAmt(n);
  addMoney(s, v, `${n.name}에게 빌린 돈`);
  s.friendLoan = { left: v, pay: sibLoanPay(v), from: n.id, name: n.name };
  s.flags.friendLoan = true;
  aff(n, -FRIEND_LEND_HURT);
  return `${n.name}에게 ${josa(fmtWon(v), '을를')} 빌렸다. 매달 ${fmtWon(s.friendLoan.pay)}씩 갚기로 했다.` + fx(s, { stress: 2 });
}
// 매달: 돈이 있으면 빌린 돈을 조금씩 갚는다 (돈이 모자란 달은 넘어간다)
function sibLoanMonth(s) {
  for (const key of ['sibLoan', 'friendLoan']) {
    const L = s[key];
    if (!L) continue;
    const pay = Math.min(L.left, L.pay);
    if (s.money < pay) continue;
    addMoney(s, -pay, key === 'sibLoan' ? '형제자매에게 갚은 돈' : `${L.name}에게 갚은 돈`);
    L.left -= pay;
    if (L.left <= 0) { s[key] = null; if (key === 'sibLoan') s.cd.sibLoan = s.t + 12; addLog(s, key === 'sibLoan' ? '형제자매에게 빌린 돈을 다 갚았다.' : `${L.name}에게 빌린 돈을 다 갚았다.`); }
  }
}
// ───── 형제자매: 태어날 때 위로 형제가 있으면 사람으로 만든다 (동생은 태어날 때 만든다) ─────
function sibJob(s, a) { return a < 7 ? '아이' : a < 19 ? '학생' : a < 23 && U.chance(0.5) ? '대학생' : U.pick(s.wealth <= 3 ? JOBS_LOW : s.wealth <= 7 ? JOBS_MID : JOBS_HIGH); }
function makeSib(s, a, g) {
  // 형제자매는 나와 성이 같다
  const sg = g || (U.chance(0.5) ? '여' : '남');
  const n = makePerson(s, { g: sg, name: me(s).name.slice(0, 1) + U.pick(sg === '여' ? NAMES_F : NAMES_M), age: Math.max(0, a), rel: '형제자매', aff: U.int(55, 80), job: sibJob(s, a), tal: inheritTalents(mom(s), dad(s)), met: '가족' });
  n.contactT = s.t;
  return n;
}
// 해마다: 형제자매의 직업이 나이에 맞게 바뀐다
function sibYear(s) {
  for (const n of sibs(s)) { const a = pAge(s, n); if ((n.job === '아이' && a >= 7) || (n.job === '학생' && a >= 19) || (n.job === '대학생' && a >= 24)) n.job = sibJob(s, a); }
}
