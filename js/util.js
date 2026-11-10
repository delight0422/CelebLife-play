'use strict';
// 공통 도구: 난수, 숫자 표시, 조사 붙이기

const U = {
  int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  fl: (a, b) => a + Math.random() * (b - a),
  pick: arr => arr[Math.floor(Math.random() * arr.length)],
  chance: p => Math.random() < p,
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  normal(mean = 0, sd = 1) {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  },
  wpick(list, wf) {
    const ws = list.map(wf);
    let x = Math.random() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) { x -= ws[i]; if (x <= 0) return list[i]; }
    return list[list.length - 1];
  },
  shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  },
  sig: x => 1 / (1 + Math.exp(-x)),
  uid: () => Math.random().toString(36).slice(2, 9),
  // 표준정규분포 누적확률
  phi(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
  },
  esc: s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
};

function fmtWon(n) {
  const neg = n < 0;
  n = Math.abs(Math.round(n));
  let s;
  if (n >= 1e8) {
    const e = Math.floor(n / 1e8), m = Math.floor((n % 1e8) / 1e4);
    s = e.toLocaleString() + '억' + (m ? ' ' + m.toLocaleString() + '만' : '') + ' 원';
  } else if (n >= 1e4) {
    const m = n / 1e4;
    s = (m >= 100 ? Math.round(m).toLocaleString() : (Math.round(m * 10) / 10).toLocaleString()) + '만 원';
  } else s = n.toLocaleString() + '원';
  return (neg ? '-' : '') + s;
}

function fmtFans(n) {
  n = Math.round(n);
  if (n < 1e4) return n.toLocaleString() + '명';
  if (n < 1e8) {
    const m = n / 1e4;
    return (m >= 100 ? Math.round(m).toLocaleString() : (Math.round(m * 10) / 10).toLocaleString()) + '만 명';
  }
  return (Math.round(n / 1e7) / 10).toLocaleString() + '억 명';
}

function fmtPct(p) { return Math.round(U.clamp(p, 0, 1) * 100) + '%'; }

function chanceWord(p) {
  if (p >= 0.9) return '거의 확실';
  if (p >= 0.65) return '높은 편';
  if (p >= 0.4) return '반반쯤';
  if (p >= 0.15) return '낮은 편';
  return '매우 낮음';
}

function sgn(n) { return (n > 0 ? '+' : '') + n; }

// 받침에 맞춰 조사를 붙인다. t: '이가' '은는' '을를' '과와' '으로' '이'(이에요/예요 앞)
function josa(word, t) {
  word = String(word);
  // 「제목」, 이름 (일본) 처럼 끝에 붙은 괄호·따옴표는 빼고 받침을 본다
  const base = word.replace(/\s*\([^)]*\)\s*$/, '').replace(/[」』'"\]\)\s]+$/, '') || word;
  const ch = base.charCodeAt(base.length - 1);
  let has = false, rieul = false;
  if (ch >= 0xAC00 && ch <= 0xD7A3) { const j = (ch - 0xAC00) % 28; has = j > 0; rieul = j === 8; }
  else has = /[136780LMNRlmnr]$/.test(base);
  const m = {
    '이가': has ? '이' : '가', '은는': has ? '은' : '는', '을를': has ? '을' : '를',
    '과와': has ? '과' : '와', '으로': (has && !rieul) ? '으로' : '로', '이': has ? '이' : '',
    '아야': has ? '아' : '야',
  };
  return word + m[t];
}
