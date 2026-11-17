// 코드로 그리는 픽셀 아트. 외부 이미지 에셋 없이 동작한다.
import type { Faction } from '../data/types';
import type { Mood } from './play';

type Ctx = CanvasRenderingContext2D;
interface Sprite { rows: string[]; pal: Record<string, string> }

export function drawSprite(ctx: Ctx, sp: Sprite, x: number, y: number, scale: number): void {
  sp.rows.forEach((row, ry) => {
    [...row].forEach((ch, rx) => {
      const c = sp.pal[ch];
      if (!c) return;
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x + rx * scale), Math.round(y + ry * scale), Math.ceil(scale), Math.ceil(scale));
    });
  });
}

export const ICON_SIZE = 10;

export const ICONS: Record<string, Sprite> = {
  bean: {
    pal: { a: '#5b3a1e', b: '#c9a35a' },
    rows: ['..........', '...aa.....', '..abba....', '..abba.aa.', '...aa.abba', '......abba', '..aa...aa.', '.abba.....', '.abba.....', '..aa......'],
  },
  rice: {
    pal: { w: '#f4f1e6', b: '#8a4b2a', d: '#5a2e18' },
    rows: ['..........', '...wwww...', '..wwwwww..', '.wwwwwwww.', '.bbbbbbbb.', '.bbbbbbbb.', '..bbbbbb..', '...bbbb...', '...dddd...', '..........'],
  },
  peach: {
    pal: { p: '#f4a0a8', r: '#e0707e', g: '#5a9a3a' },
    rows: ['.....gg...', '....gg....', '..pppppp..', '.pppppppp.', 'pppprppppp', 'pppprppppp', 'pppprppppp', '.pppppppp.', '..pppppp..', '..........'],
  },
  wine: {
    pal: { c: '#c9a35a', d: '#6b7f8e', l: '#a8bcc8' },
    rows: ['...cccc...', '...dddd...', '....dd....', '..dddddd..', '.dddddddd.', '.ddlddddd.', '.ddlddddd.', '.dddddddd.', '..dddddd..', '..........'],
  },
  honey: {
    pal: { k: '#b0503a', y: '#e8b030', h: '#fbe08a' },
    rows: ['..........', '..kkkkkk..', '...yyyy...', '..yyyyyy..', '.yyhyyyyy.', '.yyhyyyyy.', '.yyyyyyyy.', '.yyyyyyyy.', '..yyyyyy..', '..........'],
  },
  plum: {
    pal: { g: '#6fae3f', l: '#b6e07a', b: '#5b3a1e' },
    rows: ['.....b....', '....b.....', '...gggg...', '..gggggg..', '.gglggggg.', '.gglggggg.', '.gggggggg.', '..gggggg..', '...gggg...', '..........'],
  },
  salt: {
    pal: { w: '#f4f1e6', s: '#c8c8c8', d: '#8a4b2a' },
    rows: ['..........', '..........', '....ww....', '...wwww...', '..wwwsww..', '.wwwwwwsw.', 'wwswwwwwww', 'dddddddddd', '..........', '..........'],
  },
  meat: {
    pal: { m: '#c0392b', f: '#e88a7a', x: '#f0e6d0' },
    rows: ['..........', '.....mmm..', '....mmmmm.', '...mmmfmm.', '...mmmmmm.', '..xmmmmm..', '.xx.mmm...', 'xx........', '.x........', '..........'],
  },
  // 완성 요리
  kongjuk: {
    pal: { c: '#e6d3a3', e: '#a9894f', b: '#8a4b2a', d: '#5a2e18' },
    rows: ['..........', '..........', '..cccccc..', '.cceccecc.', 'bbbbbbbbbb', '.bbbbbbbb.', '..bbbbbb..', '...dddd...', '..........', '..........'],
  },
  peachwine: {
    pal: { s: '#b88a3a', p: '#f4a0a8' },
    rows: ['..........', '.ssssssss.', '.spppppps.', '.spppppps.', '..spppps..', '...ssss...', '....ss....', '....ss....', '..ssssss..', '..........'],
  },
  plumpickle: {
    pal: { j: '#c8b890', g: '#6fae3f', k: '#6b4a2a' },
    rows: ['..........', '..kkkkkk..', '.jjjjjjjj.', '.jgjjgjjj.', '.jjjgjjgj.', '.jgjjjgjj.', '.jjjjjjjj.', '..jjjjjj..', '..........', '..........'],
  },
  skewer: {
    pal: { m: '#c0392b', f: '#e88a7a', x: '#c9a35a' },
    rows: ['.........x', '........x.', '......mmx.', '.....mfm..', '....mmm...', '...mfm....', '..mmm.....', '..xm......', '.x........', 'x.........'],
  },
};

// ---------- 손님 초상 (16 x 20 격자) ----------

type Head = 'topknot' | 'crown' | 'helmet' | 'band' | 'scarf' | 'hood';
type Beard = 'none' | 'short' | 'long' | 'bushy';

interface Look {
  robe: string;
  skin: string;
  hair: string;
  beard: Beard;
  head: Head;
  headColor: string;
}

export const FACTION_COLOR: Record<Faction, string> = {
  han: '#a8842e',
  yellowTurban: '#c0a030',
  warlord: '#6a5a7a',
  wei: '#3a5a9a',
  shu: '#3f8f4f',
  wu: '#b03a2e',
  jin: '#5a4a8a',
  nanman: '#8a5a2a',
  other: '#7a7a6a',
};

export const FACTION_NAME: Record<Faction, string> = {
  han: '한', yellowTurban: '황건적', warlord: '군웅', wei: '위', shu: '촉', wu: '오', jin: '진', nanman: '남만', other: '재야',
};

const LOOKS: Record<string, Partial<Look>> = {
  liubei: { beard: 'short', head: 'crown', headColor: '#2a2a2a' },
  guanyu: { skin: '#b8473a', beard: 'long', head: 'scarf', headColor: '#2f6a3a', robe: '#2f7a3f' },
  zhangfei: { skin: '#7a5a48', beard: 'bushy', head: 'band', headColor: '#1a1a1a' },
  zhangjiao: { hair: '#8a8a8a', beard: 'long', head: 'band', headColor: '#f0d030' },
  caocao: { beard: 'short', head: 'crown', headColor: '#1a1a2a' },
  dongzhuo: { skin: '#d8a080', beard: 'bushy', head: 'crown', headColor: '#c9a020' },
  lubu: { head: 'helmet', headColor: '#8a2a2a' },
  sunjian: { beard: 'short', head: 'helmet', headColor: '#a0302a' },
  hejin: { beard: 'short', head: 'crown', headColor: '#4a3a2a' },
  yuanshao: { beard: 'short', head: 'crown', headColor: '#c9a020' },
  wangyun: { hair: '#9a9a9a', beard: 'long', head: 'crown', headColor: '#3a3a3a' },
  xushao: { hair: '#9a9a9a', beard: 'long', head: 'hood', headColor: '#5a5a4a' },
};

function lookFor(id: string, faction: Faction): Look {
  return {
    robe: FACTION_COLOR[faction],
    skin: '#e8c09a',
    hair: '#2a2018',
    beard: 'none',
    head: 'topknot',
    headColor: '#2a2018',
    ...LOOKS[id],
  };
}

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

export const PORTRAIT_W = 16;
export const PORTRAIT_H = 20;

export function drawPortrait(ctx: Ctx, id: string, faction: Faction, mood: Mood, x: number, y: number, s: number): void {
  const L = lookFor(id, faction);
  const r = (c: string, x0: number, y0: number, x1: number, y1: number) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + x0 * s, y + y0 * s, (x1 - x0) * s, (y1 - y0) * s);
  };
  // 몸과 옷
  r(L.robe, 2, 14, 14, 20);
  r(shade(L.robe, 0.7), 2, 19, 14, 20);
  r(shade(L.robe, 1.3), 6, 14, 7, 18);
  r(shade(L.robe, 1.3), 9, 14, 10, 18);
  r(L.skin, 7, 12, 9, 14);
  // 얼굴과 머리
  r(L.hair, 4, 3, 12, 5);
  r(L.skin, 4, 5, 12, 12);
  r(L.hair, 4, 5, 5, 8);
  r(L.hair, 11, 5, 12, 8);
  r(shade(L.skin, 0.85), 4, 11, 12, 12);
  // 눈
  const eye = '#1a1410';
  if (mood === 'happy') {
    r(eye, 6, 7, 7, 8); r(eye, 5, 8, 6, 9); r(eye, 7, 8, 8, 9);
    r(eye, 9, 7, 10, 8); r(eye, 8, 8, 9, 9); r(eye, 10, 8, 11, 9);
  } else {
    r(eye, 6, 7, 7, 9); r(eye, 9, 7, 10, 9);
    if (mood === 'angry') { r(eye, 5, 6, 7, 7); r(eye, 9, 6, 11, 7); }
  }
  // 입
  const mouth = '#7a2a20';
  if (mood === 'happy') { r(mouth, 6, 9, 7, 10); r(mouth, 7, 10, 9, 11); r(mouth, 9, 9, 10, 10); }
  else if (mood === 'angry') { r(mouth, 6, 10, 10, 11); }
  else r(mouth, 7, 10, 9, 11);
  // 수염
  if (L.beard === 'short') { r(L.hair, 6, 11, 10, 13); }
  if (L.beard === 'long') { r(L.hair, 5, 11, 11, 13); r(L.hair, 6, 13, 10, 16); r(L.hair, 7, 16, 9, 17); }
  if (L.beard === 'bushy') { r(L.hair, 4, 9, 6, 13); r(L.hair, 10, 9, 12, 13); r(L.hair, 5, 11, 11, 14); }
  if (L.beard !== 'none') r(mouth, 7, 10, 9, 11);
  // 머리 장식
  switch (L.head) {
    case 'topknot': r(L.hair, 7, 1, 9, 3); r('#c9a35a', 6, 2, 10, 3); break;
    case 'crown': r(L.headColor, 5, 1, 11, 4); r(shade(L.headColor, 1.4), 7, 0, 9, 1); break;
    case 'helmet': r(L.headColor, 3, 2, 13, 5); r(shade(L.headColor, 0.6), 3, 5, 4, 9); r(shade(L.headColor, 0.6), 12, 5, 13, 9); r('#d84a3a', 7, 0, 9, 2); break;
    case 'band': r(L.headColor, 4, 4, 12, 5); r(L.headColor, 12, 4, 14, 6); break;
    case 'scarf': r(L.headColor, 3, 2, 13, 5); r(L.headColor, 3, 5, 4, 10); r(L.headColor, 12, 5, 13, 10); break;
    case 'hood': r(L.headColor, 3, 2, 13, 5); r(L.headColor, 3, 5, 4, 13); r(L.headColor, 12, 5, 13, 13); break;
  }
}

/** 별 (7x7) */
export function drawStar(ctx: Ctx, x: number, y: number, s: number, on: boolean): void {
  drawSprite(ctx, {
    pal: { y: on ? '#f8d040' : '#4a3a2a', o: on ? '#c08020' : '#2a2018' },
    rows: ['...y...', '...y...', 'yyyyyyy', '.yyyyy.', '..yoy..', '.yy.yy.', '.y...y.'],
  }, x, y, s);
}
