// 화면 전환, 그리기, 입력 처리
import { arcs, chapterById, characterById, ingredientById, ingredients, mustGet, recipeById, recipes, stages } from '../data/index';
import type { Stage } from '../data/types';
import * as P from './play';
import { loadSave, recordResult, writeSave, type SaveData } from './save';
import { drawPortrait, drawSprite, drawStar, FACTION_COLOR, ICONS, PORTRAIT_H, PORTRAIT_W } from './sprites';

export const W = 640;
export const H = 360;
const FONT = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

const C = {
  ink: '#f4e8d0',
  dim: '#b8a48a',
  dark: '#1b1410',
  panel: '#2a1c14',
  panelEdge: '#5a3a24',
  gold: '#f8d040',
  red: '#e0503a',
  green: '#7ac85a',
};

type Scene = 'title' | 'select' | 'intro' | 'play' | 'result';
interface Rect { x: number; y: number; w: number; h: number }
interface Hit extends Rect { onClick: () => void }
interface Floater { text: string; x: number; y: number; t: number; color: string }
interface Result { score: number; stars: number; best: number; newBest: boolean; hiddenVisited: boolean }

const SEAT_X = [120, 320, 520];
const PS = 4; // 초상 배율
const PORTRAIT_Y = 92;
const LAST_STAGE = stages[stages.length - 1].stgNo;

const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export class App {
  scene: Scene = 'title';
  save: SaveData = loadSave();
  stage: Stage = stages[0];
  play: P.PlayState | null = null;
  showRecipes = false;
  paused = false;
  doneTimer = 0;
  result: Result | null = null;
  hits: Hit[] = [];
  floaters: Floater[] = [];
  t = 0;

  constructor(private ctx: CanvasRenderingContext2D) {}

  // ---------- 진행 ----------

  openStage(st: Stage): void {
    if (st.stgNo > this.save.unlocked) return;
    this.stage = st;
    this.scene = 'intro';
  }

  start(): void {
    this.play = P.createPlay(this.stage);
    this.showRecipes = false;
    this.paused = false;
    this.doneTimer = 0;
    this.floaters = [];
    this.scene = 'play';
  }

  finish(p: P.PlayState): void {
    const stars = P.starsFor(p.served, p.arrived, p.mistakes);
    const prev = this.save.best[this.stage.stgID]?.score ?? 0;
    this.save = recordResult(this.save, this.stage, p.score, stars, LAST_STAGE);
    writeSave(this.save);
    const hiddenCount = this.stage.customers.filter((c) => c.hidden).length;
    this.result = {
      score: p.score,
      stars,
      best: Math.max(prev, p.score),
      newBest: p.score > prev,
      hiddenVisited: hiddenCount > 0 && p.arrived === this.stage.customers.length,
    };
    this.scene = 'result';
  }

  nextStage(): Stage | undefined {
    return stages.find((s) => s.stgNo === this.stage.stgNo + 1);
  }

  update(dt: number): void {
    this.t += dt;
    this.floaters = this.floaters.filter((f) => (f.t += dt) < 1.2);
    const p = this.play;
    if (this.scene !== 'play' || !p || this.paused || this.showRecipes) return;
    P.update(p, dt);
    for (const e of p.events) {
      const x = SEAT_X[e.seat];
      if (e.kind === 'served') this.floaters.push({ text: `+${e.points}`, x, y: PORTRAIT_Y, t: 0, color: C.green });
      if (e.kind === 'wrong') this.floaters.push({ text: `-${P.WRONG_PENALTY}`, x, y: PORTRAIT_Y, t: 0, color: C.red });
      if (e.kind === 'left') this.floaters.push({ text: '놓침', x, y: PORTRAIT_Y, t: 0, color: C.dim });
    }
    p.events = [];
    if (p.done && (this.doneTimer += dt) > 0.6) this.finish(p);
  }

  // ---------- 입력 ----------

  click(x: number, y: number): void {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      if (inside(this.hits[i], x, y)) {
        this.hits[i].onClick();
        return;
      }
    }
  }

  key(k: string): void {
    const p = this.play;
    switch (this.scene) {
      case 'title':
        if (k === 'Enter' || k === ' ') this.scene = 'select';
        break;
      case 'select': {
        const n = Number(k);
        if (n >= 1 && n <= stages.length) this.openStage(stages[n - 1]);
        if (k === 'Enter') this.openStage(stages[Math.min(this.save.unlocked, stages.length) - 1]);
        if (k === 'Escape') this.scene = 'title';
        break;
      }
      case 'intro':
        if (k === 'Enter' || k === ' ') this.start();
        if (k === 'Escape') this.scene = 'select';
        break;
      case 'play':
        if (!p) break;
        if (this.paused) {
          if (k === 'Escape' || k === 'Enter') this.paused = false;
          if (k === 'q' || k === 'Q') this.scene = 'select';
          break;
        }
        if (this.showRecipes) {
          if (k === 'r' || k === 'R' || k === 'Escape' || k === 'Enter') this.showRecipes = false;
          break;
        }
        if (k >= '1' && k <= String(ingredients.length)) P.addIngredient(p, ingredients[Number(k) - 1].ingID);
        if (k === 'Backspace' || k === 'x' || k === 'X') P.discard(p);
        if (k === 'Enter' || k === ' ') P.serve(p, recipeById);
        if (k === 'ArrowLeft') P.cycleTarget(p, -1);
        if (k === 'ArrowRight' || k === 'Tab') P.cycleTarget(p, 1);
        if (k === 'r' || k === 'R') this.showRecipes = true;
        if (k === 'Escape') this.paused = true;
        break;
      case 'result': {
        const next = this.nextStage();
        if (k === 'Enter') {
          if (this.result && this.result.stars > 0 && next) this.openStage(next);
          else this.start();
        }
        if (k === 'r' || k === 'R') this.start();
        if (k === 'Escape') this.scene = 'select';
        break;
      }
    }
  }

  // ---------- 그리기 도구 ----------

  text(s: string, x: number, y: number, size = 14, color = C.ink, align: CanvasTextAlign = 'left', bold = false): void {
    const c = this.ctx;
    c.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
    c.textAlign = align;
    c.textBaseline = 'middle';
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.fillText(s, x + 1, y + 1);
    c.fillStyle = color;
    c.fillText(s, x, y);
  }

  wrap(s: string, maxW: number, size: number): string[] {
    const c = this.ctx;
    c.font = `${size}px ${FONT}`;
    const lines: string[] = [];
    let cur = '';
    for (const ch of s) {
      if (c.measureText(cur + ch).width > maxW && cur) {
        lines.push(cur);
        cur = ch.trim() ? ch : '';
      } else cur += ch;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  box(r: Rect, fill = C.panel, edge = C.panelEdge): void {
    const c = this.ctx;
    c.fillStyle = edge;
    c.fillRect(r.x, r.y, r.w, r.h);
    c.fillStyle = fill;
    c.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  }

  button(r: Rect, label: string, onClick: () => void, opt: { primary?: boolean; disabled?: boolean; size?: number } = {}): void {
    const fill = opt.disabled ? '#3a2e26' : opt.primary ? '#a0402a' : '#5a3a24';
    this.box({ ...r, h: r.h }, fill, '#120c08');
    const c = this.ctx;
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.fillRect(r.x + 2, r.y + 2, r.w - 4, 3);
    this.text(label, r.x + r.w / 2, r.y + r.h / 2 + 1, opt.size ?? 14, opt.disabled ? '#7a6a5a' : C.ink, 'center', true);
    if (!opt.disabled) this.hits.push({ ...r, onClick });
  }

  /** code로 아이콘 그리기 */
  icon(code: string, x: number, y: number, s: number): void {
    const sp = ICONS[code];
    if (sp) drawSprite(this.ctx, sp, x, y, s);
  }

  room(): void {
    const c = this.ctx;
    c.fillStyle = '#4a2a1a';
    c.fillRect(0, 0, W, H);
    // 벽 판자
    for (let x = 0; x < W; x += 40) {
      c.fillStyle = x % 80 ? '#52301e' : '#4a2a1a';
      c.fillRect(x, 0, 40, 200);
    }
    // 격자 창
    for (const wx of [24, 556]) {
      c.fillStyle = '#2a1810';
      c.fillRect(wx, 40, 60, 80);
      c.fillStyle = '#3a5a6a';
      c.fillRect(wx + 4, 44, 52, 72);
      c.fillStyle = '#2a1810';
      for (let i = 1; i < 4; i++) c.fillRect(wx + 4 + i * 13, 44, 2, 72);
      for (let i = 1; i < 4; i++) c.fillRect(wx + 4, 44 + i * 18, 52, 2);
    }
    // 등롱
    for (const lx of [220, 420]) {
      const sway = Math.sin(this.t * 1.5 + lx) * 2;
      c.fillStyle = '#1a1008';
      c.fillRect(lx, 28, 2, 10);
      c.fillStyle = '#c0302a';
      c.fillRect(lx - 9 + sway, 38, 20, 22);
      c.fillStyle = '#e8603a';
      c.fillRect(lx - 5 + sway, 40, 6, 18);
      c.fillStyle = '#f0c040';
      c.fillRect(lx - 9 + sway, 36, 20, 3);
      c.fillRect(lx - 9 + sway, 59, 20, 3);
    }
    // 카운터
    c.fillStyle = '#7a4a28';
    c.fillRect(0, 200, W, 26);
    c.fillStyle = '#a0683a';
    c.fillRect(0, 200, W, 5);
    c.fillStyle = '#5a321a';
    c.fillRect(0, 222, W, 4);
  }

  dim(a = 0.6): void {
    this.ctx.fillStyle = `rgba(10,6,4,${a})`;
    this.ctx.fillRect(0, 0, W, H);
  }

  // ---------- 화면 ----------

  draw(): void {
    this.hits = [];
    this.ctx.imageSmoothingEnabled = false;
    switch (this.scene) {
      case 'title': this.drawTitle(); break;
      case 'select': this.drawSelect(); break;
      case 'intro': this.drawIntro(); break;
      case 'play': this.drawPlay(); break;
      case 'result': this.drawResult(); break;
    }
  }

  drawTitle(): void {
    this.room();
    ['liubei', 'guanyu', 'zhangfei'].forEach((code, i) => {
      drawPortrait(this.ctx, code, 'shu', 'happy', SEAT_X[i] - 32, PORTRAIT_Y + 30, PS);
    });
    this.dim(0.35);
    this.box({ x: 150, y: 34, w: 340, h: 130 });
    this.text('삼국주방', W / 2, 74, 44, C.gold, 'center', true);
    this.text('三 國 廚 房', W / 2, 114, 18, C.ink, 'center');
    this.text('삼국지연의 120회의 손님에게 요리를 대접하라', W / 2, 142, 13, C.dim, 'center');
    this.button({ x: 245, y: 290, w: 150, h: 40 }, '시작하기', () => { this.scene = 'select'; }, { primary: true, size: 16 });
    this.text('키보드: 1~8 재료 · Enter 서빙 · ← → 손님 선택 · R 레시피', W / 2, 345, 11, C.dim, 'center');
  }

  drawSelect(): void {
    this.room();
    this.dim(0.55);
    this.text('장 선택', 40, 26, 20, C.gold, 'left', true);
    this.button({ x: 520, y: 10, w: 100, h: 30 }, '처음으로', () => { this.scene = 'title'; }, { size: 12 });
    stages.forEach((st, i) => {
      const r = { x: 40, y: 50 + i * 54, w: 560, h: 48 };
      const locked = st.stgNo > this.save.unlocked;
      const ch = mustGet(chapterById, st.chpID);
      this.box(r, locked ? '#221812' : C.panel, locked ? '#3a2a1e' : C.panelEdge);
      this.text(`제${st.stgNo}장  ${st.name}`, r.x + 16, r.y + 17, 16, locked ? '#6a5a4a' : C.ink, 'left', true);
      this.text(`${st.era} (${st.year}년) · 원작 제${ch.chpNo}회 「${ch.label}」`, r.x + 16, r.y + 36, 11, locked ? '#5a4a3a' : C.dim);
      if (locked) {
        this.text('잠김', r.x + r.w - 20, r.y + 24, 13, '#6a5a4a', 'right');
      } else {
        const best = this.save.best[st.stgID];
        for (let k = 0; k < 3; k++) drawStar(this.ctx, r.x + 400 + k * 26, r.y + 8, 3, (best?.stars ?? 0) > k);
        this.text(best ? `최고 ${best.score}` : '도전 전', r.x + r.w - 16, r.y + 36, 11, C.dim, 'right');
        this.hits.push({ ...r, onClick: () => this.openStage(st) });
      }
    });
    const reached = mustGet(chapterById, stages[stages.length - 1].chpID);
    const arc = arcs.find((a) => mustGet(chapterById, a.startChpID).chpNo <= reached.chpNo && reached.chpNo <= mustGet(chapterById, a.endChpID).chpNo);
    this.text(`원작 120회 중 제${reached.chpNo}회까지 공개 · 현재 구간: ${arc?.name ?? ''}`, W / 2, 342, 11, C.dim, 'center');
  }

  drawIntro(): void {
    const st = this.stage;
    const ch = mustGet(chapterById, st.chpID);
    this.room();
    this.dim(0.6);
    this.box({ x: 40, y: 16, w: 560, h: 328 });
    this.text(`제${st.stgNo}장  ${st.name}`, W / 2, 44, 24, C.gold, 'center', true);
    this.text(`${st.era} (${st.year}년) · 원작 제${ch.chpNo}회`, W / 2, 72, 12, C.dim, 'center');
    this.text(`${ch.titleFirst}　${ch.titleSecond}`, W / 2, 94, 14, C.ink, 'center');

    const visible = st.customers.filter((c) => !c.hidden);
    const seen = new Set<string>();
    const guests = visible.filter((c) => !seen.has(c.chrID) && seen.add(c.chrID));
    const gw = 76;
    const gx = W / 2 - (guests.length * gw) / 2;
    guests.forEach((g, i) => {
      const who = mustGet(characterById, g.chrID);
      const x = gx + i * gw + (gw - PORTRAIT_W * 3) / 2;
      drawPortrait(this.ctx, who.code, who.faction.code, 'wait', x, 112, 3);
      this.text(who.nameKo, x + 24, 182, 12, C.ink, 'center', true);
      this.text(who.faction.name, x + 24, 197, 10, FACTION_COLOR[who.faction.code], 'center');
    });

    const dishes = [...new Set(st.customers.map((c) => c.rcpID))];
    dishes.forEach((rcpID, i) => this.recipeRow(rcpID, 120, 222 + i * 22, 1.8));
    this.button({ x: 245, y: 296, w: 150, h: 36 }, '영업 시작', () => this.start(), { primary: true, size: 15 });
    this.button({ x: 56, y: 300, w: 80, h: 28 }, '뒤로', () => { this.scene = 'select'; }, { size: 12 });
  }

  recipeRow(rcpID: string, x: number, y: number, s: number): void {
    const r = mustGet(recipeById, rcpID);
    const sz = 10 * s;
    this.icon(r.code, x, y - sz / 2, s);
    this.text(r.name, x + sz + 8, y, 13, C.ink, 'left', true);
    r.steps.forEach((ingID, i) => {
      const ing = mustGet(ingredientById, ingID);
      const ix = x + 150 + i * (sz + 60);
      if (i > 0) this.text('→', ix - 10, y, 12, C.dim, 'center');
      this.icon(ing.code, ix, y - sz / 2, s);
      this.text(ing.name, ix + sz + 2, y, 10, C.dim);
    });
  }

  drawPlay(): void {
    const p = this.play;
    if (!p) return;
    const c = this.ctx;
    this.room();

    // 상단 바
    c.fillStyle = C.panel;
    c.fillRect(0, 0, W, 28);
    this.text(`제${this.stage.stgNo}장 ${this.stage.name}`, 10, 14, 13, C.gold, 'left', true);
    this.text(`점수 ${p.score}`, 200, 14, 13, C.ink, 'left', true);
    this.text(`대접 ${p.served} · 놓침 ${p.missed} · 실수 ${p.mistakes}`, 290, 14, 11, C.dim);
    this.button({ x: 478, y: 3, w: 78, h: 22 }, '레시피 R', () => { this.showRecipes = true; }, { size: 11 });
    this.button({ x: 560, y: 3, w: 76, h: 22 }, '멈춤 Esc', () => { this.paused = true; }, { size: 11 });

    // 손님
    p.seats.forEach((seat, i) => this.drawSeat(p, seat, i));

    // 하단 패널
    c.fillStyle = C.dark;
    c.fillRect(0, 226, W, H - 226);
    this.box({ x: 10, y: 232, w: 244, h: 70 });
    this.text(`냄비 (${p.pot.length}/${P.POT_LIMIT})`, 20, 245, 11, C.dim);
    p.pot.forEach((ingID, k) => this.icon(mustGet(ingredientById, ingID).code, 22 + k * 45, 258, 3));
    if (!p.pot.length) this.text('재료를 순서대로 넣으세요', 132, 275, 12, '#6a5a4a', 'center');
    this.button({ x: 10, y: 308, w: 116, h: 44 }, '버리기 X', () => P.discard(p), { size: 13 });
    this.button({ x: 132, y: 308, w: 122, h: 44 }, '서빙 Enter', () => P.serve(p, recipeById), { primary: true, size: 14 });

    ingredients.forEach((g, k) => {
      const r = { x: 262 + (k % 4) * 94, y: 232 + Math.floor(k / 4) * 62, w: 90, h: 58 };
      this.box(r, '#3a2618', '#120c08');
      this.icon(g.code, r.x + 8, r.y + 14, 3);
      this.text(g.name, r.x + 62, r.y + 32, 13, C.ink, 'center', true);
      this.text(String(k + 1), r.x + r.w - 8, r.y + 11, 10, C.dim, 'right');
      this.hits.push({ ...r, onClick: () => P.addIngredient(p, g.ingID) });
    });

    // 떠오르는 점수
    for (const f of this.floaters) this.text(f.text, f.x, f.y - f.t * 30, 16, f.color, 'center', true);

    if (this.showRecipes) this.drawRecipeBook();
    if (this.paused) {
      this.dim(0.7);
      this.text('잠시 멈춤', W / 2, 130, 26, C.gold, 'center', true);
      this.button({ x: 245, y: 170, w: 150, h: 38 }, '계속하기', () => { this.paused = false; }, { primary: true });
      this.button({ x: 245, y: 218, w: 150, h: 38 }, '그만두기 Q', () => { this.scene = 'select'; });
    }
  }

  drawSeat(p: P.PlayState, seat: P.Seat | null, i: number): void {
    const c = this.ctx;
    const cx = SEAT_X[i];
    const area = { x: cx - 95, y: 30, w: 190, h: 168 };
    if (!seat) {
      this.text('빈 자리', cx, 150, 12, 'rgba(244,232,208,0.25)', 'center');
      return;
    }
    const who = mustGet(characterById, seat.customer.chrID);
    const leaving = seat.leaveIn >= 0;
    c.save();
    if (leaving) c.globalAlpha = Math.max(0, seat.leaveIn / 1.2);

    const targeted = i === p.target && !leaving;
    if (targeted) {
      c.fillStyle = C.gold;
      const fx = cx - PORTRAIT_W * PS / 2 - 6;
      c.fillRect(fx, PORTRAIT_Y - 4, PORTRAIT_W * PS + 12, 3);
      c.fillRect(fx, PORTRAIT_Y + PORTRAIT_H * PS - 2, PORTRAIT_W * PS + 12, 3);
      c.fillRect(fx, PORTRAIT_Y - 4, 3, PORTRAIT_H * PS + 5);
      c.fillRect(fx + PORTRAIT_W * PS + 9, PORTRAIT_Y - 4, 3, PORTRAIT_H * PS + 5);
    }
    const bob = seat.mood === 'happy' ? Math.abs(Math.sin(this.t * 10)) * -3 : seat.mood === 'angry' ? Math.sin(this.t * 40) * 1.5 : 0;
    drawPortrait(c, who.code, who.faction.code, seat.mood, cx - (PORTRAIT_W * PS) / 2 + (seat.mood === 'angry' ? bob : 0), PORTRAIT_Y + (seat.mood === 'happy' ? bob : 0), PS);

    // 말풍선
    const b = { x: cx - 92, y: 32, w: 184, h: 54 };
    this.box(b, '#f4e8d0', '#2a1c14');
    c.fillStyle = '#f4e8d0';
    c.fillRect(cx - 4, b.y + b.h - 2, 8, 5);
    const recipe = mustGet(recipeById, seat.customer.rcpID);
    this.icon(recipe.code, b.x + 6, b.y + 5, 1.8);
    c.font = `bold 12px ${FONT}`;
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillStyle = '#5a1a10';
    c.fillText(recipe.name, b.x + 28, b.y + 14);
    if (this.stage.stgNo === 1) {
      recipe.steps.forEach((ingID, k) => this.icon(mustGet(ingredientById, ingID).code, b.x + b.w - 8 - (recipe.steps.length - k) * 17, b.y + 6, 1.5));
    }
    c.font = `11px ${FONT}`;
    c.fillStyle = seat.mood === 'angry' ? '#a02a1a' : '#3a2a1e';
    this.wrap(seat.say, b.w - 14, 11).slice(0, 2).forEach((line, k) => c.fillText(line, b.x + 7, b.y + 31 + k * 13));

    // 이름표와 인내심
    this.text(`${who.nameKo} · ${who.faction.name}`, cx, 180, 12, C.ink, 'center', true);
    const ratio = seat.patience / seat.maxPatience;
    c.fillStyle = '#1a1008';
    c.fillRect(cx - 50, 189, 100, 7);
    c.fillStyle = ratio > 0.5 ? C.green : ratio > 0.25 ? C.gold : C.red;
    c.fillRect(cx - 49, 190, 98 * ratio, 5);
    c.restore();

    if (!leaving) this.hits.push({ ...area, onClick: () => P.selectSeat(p, i) });
  }

  drawRecipeBook(): void {
    this.dim(0.75);
    this.box({ x: 70, y: 40, w: 500, h: 280 });
    this.text('레시피', W / 2, 66, 20, C.gold, 'center', true);
    recipes.forEach((r, i) => this.recipeRow(r.rcpID, 100, 110 + i * 40, 2.2));
    this.button({ x: 255, y: 272, w: 130, h: 34 }, '닫기 R', () => { this.showRecipes = false; }, { primary: true });
    this.hits.unshift({ x: 0, y: 0, w: W, h: H, onClick: () => {} }); // 뒤 클릭 막기
  }

  drawResult(): void {
    const r = this.result;
    if (!r) return;
    this.room();
    this.dim(0.65);
    this.box({ x: 120, y: 30, w: 400, h: 300 });
    const cleared = r.stars > 0;
    this.text(cleared ? '영업 성공!' : '영업 실패…', W / 2, 62, 26, cleared ? C.gold : C.red, 'center', true);
    for (let k = 0; k < 3; k++) drawStar(this.ctx, W / 2 - 80 + k * 56, 88, 6, r.stars > k);
    this.text(`점수 ${r.score}`, W / 2, 152, 20, C.ink, 'center', true);
    this.text(r.newBest ? '최고 기록 갱신!' : `최고 기록 ${r.best}`, W / 2, 176, 12, r.newBest ? C.green : C.dim, 'center');
    const p = this.play;
    if (p) this.text(`대접 ${p.served}/${p.arrived} · 실수 ${p.mistakes}`, W / 2, 198, 12, C.dim, 'center');
    if (r.hiddenVisited) this.text('숨은 손님이 다녀갔습니다!', W / 2, 220, 12, C.gold, 'center', true);
    else if (!cleared) this.text('손님 절반 이상을 대접하면 다음 장이 열립니다', W / 2, 220, 11, C.dim, 'center');

    const next = this.nextStage();
    this.button({ x: 140, y: 270, w: 110, h: 40 }, '다시하기', () => this.start());
    this.button({ x: 265, y: 270, w: 110, h: 40 }, '목록', () => { this.scene = 'select'; });
    this.button({ x: 390, y: 270, w: 110, h: 40 }, '다음 장', () => next && this.openStage(next), { primary: true, disabled: !cleared || !next });
  }
}
