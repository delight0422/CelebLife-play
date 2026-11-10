'use strict';
// 재능(타고나는 것)과 특기(배워서 레벨을 올리는 것)

const TALENTS = [
  { id: 'music', n: '음감', d: '소리에 대한 이해도' },
  { id: 'rhythm', n: '리듬감', d: '박자를 따라가거나 다루는 능력' },
  { id: 'voice', n: '목소리', d: '타고난 음색과 톤' },
  { id: 'athletic', n: '운동신경', d: '몸 전체를 적절하고 정밀하게 제어하는 능력' },
  { id: 'hands', n: '손재주', d: '손으로 하는 작업을 수행하는 능력' },
  { id: 'express', n: '표현력', d: '말과 글이 아닌 방식으로 감정을 전달하는 능력' },
  // v92: 언어 감각 → 전달력 (id는 그대로 verbal)
  { id: 'verbal', n: '전달력', d: '말과 글을 통해 사실 또는 감정을 전달하는 능력' },
  { id: 'aesth', n: '예술 감각', d: '감성적이고 아름다운 것을 창작하는 능력' },
  { id: 'creative', n: '창의력', d: '새롭고 참신한 것을 만드는 능력' },
  { id: 'intel', n: '지능', d: '무언가를 배우고 활용하는 능력' },
  // v92: 센스 → 유머 감각 + 통찰력으로 나누고, 끈기를 새로 넣었다 (보이는 재능 14개)
  { id: 'humor', n: '유머 감각', d: '상황을 유쾌하게 만드는 능력' },
  { id: 'insight', n: '통찰력', d: '사람 또는 상황을 꿰뚫어보는 능력' },
  { id: 'grit', n: '성실성', d: '무언가를 성실하게 수행하는 능력' },
  { id: 'looks', n: '외모', d: '얼굴, 체형, 분위기 등 외적인 아름다움' },
  // 스타성은 숨긴 재능이다 (피드백 30): 계산에는 그대로 쓰지만 화면 어디에도 보이지 않는다
  { id: 'star', n: '스타성', d: '사람을 끌어당기는 힘', hidden: true },
];
const TALENT_BY = Object.fromEntries(TALENTS.map(t => [t.id, t]));
const TALENT_IDS = TALENTS.map(t => t.id);
const TALENTS_SHOWN = TALENTS.filter(t => !t.hidden);
function talentWord(v) { return v >= 85 ? '타고남' : v >= 70 ? '뛰어남' : v >= 50 ? '괜찮음' : v >= 30 ? '보통' : '부족'; }

// 특기 계열 (특기 창에서 묶어 보여 준다)
const SKILL_CATS = [
  { id: 'music', n: '음악', ic: '🎤' },
  { id: 'inst', n: '악기', ic: '🎸' },
  { id: 'prod', n: '프로듀싱', ic: '🎛️' },
  { id: 'broad', n: '방송활동', ic: '📺' },
  { id: 'acad', n: '학문', ic: '📚' },
  { id: 'etc', n: '기타', ic: '✨' },
];

// tal: 재능 무게 (v92: 강함 1 · 보통 0.6 · 약함 0.3)
// p: 혼자 연습할 때 일정 이름. les: 학원 (이름, 월 비용 만 원). ic: 아이콘
// young: 어릴수록 빨리 느는 특기(true), lang: 외국어(어릴 때 유리)
const SKILLS = {
  vocal: { n: '보컬', cat: 'music', ic: '🎤', tal: { music: 1, voice: 1, express: 0.6, rhythm: 0.3 }, p: '노래 연습', les: { n: '보컬 학원', c: 30 }, young: true },
  rap: { n: '랩', cat: 'music', ic: '🎙️', tal: { rhythm: 1, verbal: 1, voice: 0.6, express: 0.3 }, p: '랩 연습', les: { n: '랩 레슨', c: 30 }, young: true },
  dance: { n: '댄스', cat: 'music', ic: '💃', tal: { athletic: 1, rhythm: 1, express: 0.6, creative: 0.3 }, p: '춤 연습', les: { n: '댄스 학원', c: 25 }, young: true },
  guitar: { n: '기타', cat: 'inst', ic: '🎸', tal: { music: 1, hands: 1, rhythm: 0.6, express: 0.3 }, p: '기타 연습', les: { n: '기타 학원', c: 25 } },
  bass: { n: '베이스', cat: 'inst', ic: '🎸', tal: { rhythm: 1, hands: 1, music: 0.6, express: 0.3 }, p: '베이스 연습', les: { n: '베이스 학원', c: 25 } },
  piano: { n: '피아노', cat: 'inst', ic: '🎹', tal: { music: 1, hands: 1, rhythm: 0.6, express: 0.3 }, p: '피아노 연습', les: { n: '피아노 학원', c: 20 } },
  keyboard: { n: '키보드', cat: 'inst', ic: '🎹', tal: { music: 1, hands: 1, rhythm: 0.6, express: 0.3 }, p: '키보드 연습', les: { n: '실용음악 학원 (키보드)', c: 25 } },
  drum: { n: '드럼', cat: 'inst', ic: '🥁', tal: { rhythm: 1, hands: 1, athletic: 0.6, intel: 0.3 }, p: '드럼 연습', les: { n: '드럼 학원', c: 30 } },
  compose: { n: '작곡', cat: 'prod', ic: '🎼', tal: { music: 1, aesth: 1, creative: 0.6, express: 0.3 }, p: '작곡 공부', les: { n: '작곡 레슨', c: 40 }, create: true },
  lyric: { n: '작사', cat: 'prod', ic: '✍️', tal: { verbal: 1, aesth: 1, creative: 0.6, rhythm: 0.3 }, p: '작사 연습', les: { n: '작사 아카데미', c: 30 }, create: true },
  // 특기 이름은 '작문' (0단계). 작품을 가리키는 '각본'(시나리오)이라는 말은 그대로 쓴다
  script: { n: '작문', cat: 'prod', ic: '📜', tal: { verbal: 1, creative: 1, intel: 0.6, aesth: 0.3 }, p: '시나리오 쓰기', les: { n: '시나리오 아카데미', c: 35 }, create: true },
  direct: { n: '연출', cat: 'prod', ic: '🎬', tal: { aesth: 1, express: 1, creative: 0.6, verbal: 0.3 }, p: '단편 영상 찍어 보기', les: { n: '영화 연출 워크숍', c: 40 }, create: true },
  edit: { n: '영상 편집', cat: 'prod', ic: '🎞️', tal: { aesth: 1, creative: 1, express: 0.6, intel: 0.3 }, p: '영상 편집 연습', les: { n: '영상 편집 학원', c: 30 } },
  acting: { n: '연기', cat: 'broad', ic: '🎭', tal: { verbal: 1, express: 1, voice: 0.6, athletic: 0.3 }, p: '연기 연습', les: { n: '연기 학원', c: 35 } },
  variety: { n: '예능', cat: 'broad', ic: '😆', tal: { verbal: 1, humor: 1, express: 0.6, creative: 0.3 }, p: '끼 기르기', les: { n: '스피치·MC 학원', c: 30 } },
  game: { n: '게임', cat: 'etc', ic: '🎮', tal: { hands: 1, insight: 1, intel: 0.6, grit: 0.3 }, p: '게임하기', les: { n: '게임 아카데미', c: 30 }, fun: true },
  study: { n: '학업', cat: 'acad', ic: '📚', tal: { intel: 1, grit: 1, insight: 0.6, verbal: 0.3 }, p: '공부', les: { n: '종합 학원', c: 40 } },
  jp: { n: '일본어', cat: 'acad', ic: '🗾', tal: { intel: 1, grit: 1, verbal: 0.6, insight: 0.3 }, p: '일본어 공부', les: { n: '일본어 학원', c: 20 }, lang: true },
  en: { n: '영어', cat: 'acad', ic: '🗽', tal: { intel: 1, grit: 1, verbal: 0.6, insight: 0.3 }, p: '영어 공부', les: { n: '영어 학원', c: 25 }, lang: true },
  art: { n: '그림', cat: 'etc', ic: '🎨', tal: { aesth: 1, hands: 1, creative: 0.6, express: 0.3 }, p: '그림 그리기', les: { n: '미술 학원', c: 30 }, fun: true },
  // 스카우트·교육: 배우는 속도는 위 재능만 본다. 실제로 보거나 가르칠 때는 그 분야 특기도 함께 본다 (work.js scoutLv, 트레이너·아이 가르치기)
  scout: { n: '스카우트', cat: 'etc', ic: '🔍', tal: { insight: 1, intel: 1, grit: 0.3 }, p: '오디션 영상 보며 안목 기르기', les: { n: '캐스팅 실무 강좌', c: 30 } },
  // 교육: 남을 가르치는 실력 (트레이너·아이 가르치기). 가르칠수록 는다
  edu: { n: '교육', cat: 'etc', ic: '🧑‍🏫', tal: { verbal: 1, insight: 1, intel: 0.6, grit: 0.3 }, p: '교육법 개선', les: { n: '강사 양성 과정', c: 30 } },
  // 사업: 회사 대표가 쓴다 (회사 운영·영업). 집안 형편이 좋을수록 빨리 는다 (person.js bizRichF). 나중에 다른 직업에서도 쓸 수 있다
  biz: { n: '사업', cat: 'etc', ic: '💼', tal: { insight: 1, intel: 1, creative: 0.6, verbal: 0.3 }, p: '경영 공부', les: { n: '경영 아카데미', c: 40 } },
};
const SKILL_IDS = Object.keys(SKILLS);
// 서로 비슷해서 하나를 알면 다른 하나를 절반에서 시작하는 특기
const SKILL_TWIN = { piano: 'keyboard', keyboard: 'piano' };
function skillTalentText(k) {
  const t = SKILLS[k].tal;
  const by = (a, b) => Object.keys(t).filter(x => t[x] >= a && t[x] < b && !TALENT_BY[x].hidden).map(x => TALENT_BY[x].n);
  const big = by(1, 9), mid = by(0.5, 1), small = by(0.2, 0.5);
  return big.join('·') + (mid.length ? ` (보통: ${mid.join('·')})` : '') + (small.length ? ` (약함: ${small.join('·')})` : '');
}
