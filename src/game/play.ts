// 한 스테이지의 진행 상태와 규칙. DOM과 무관한 순수 로직이라 테스트할 수 있다.
import type { Recipe, Stage, StageCustomer } from '../data/types';

export const SEAT_COUNT = 3;
export const POT_LIMIT = 5;
export const BASE_POINTS = 100;
export const SPEED_BONUS = 50;
export const WRONG_PENALTY = 20;
export const WRONG_PATIENCE_LOSS = 3;
const LEAVE_DELAY = 1.2;

export const LINES = {
  happy: '맛이 일품이로다!',
  wrong: '이게 무슨 맛인가!',
  left: '너무 늦소. 그만 가겠소.',
};

export type Mood = 'wait' | 'happy' | 'angry';

export interface Seat {
  customer: StageCustomer;
  patience: number;
  maxPatience: number;
  mood: Mood;
  say: string;
  /** 떠나는 중이면 남은 초, 머무는 중이면 -1 */
  leaveIn: number;
}

export type PlayEvent =
  | { kind: 'arrive'; seat: number }
  | { kind: 'served'; seat: number; points: number }
  | { kind: 'wrong'; seat: number }
  | { kind: 'left'; seat: number };

export interface PlayState {
  stage: Stage;
  queue: StageCustomer[];
  seats: (Seat | null)[];
  target: number;
  pot: string[];
  score: number;
  served: number;
  missed: number;
  mistakes: number;
  /** 실제로 등장한 손님 수 (숨은 손님 포함 여부에 따라 달라짐) */
  arrived: number;
  time: number;
  nextArrival: number;
  done: boolean;
  events: PlayEvent[];
}

export function createPlay(stage: Stage): PlayState {
  return {
    stage,
    queue: [...stage.customers],
    seats: Array(SEAT_COUNT).fill(null),
    target: 0,
    pot: [],
    score: 0,
    served: 0,
    missed: 0,
    mistakes: 0,
    arrived: 0,
    time: 0,
    nextArrival: 0.6,
    done: false,
    events: [],
  };
}

export const isActive = (seat: Seat | null): seat is Seat => !!seat && seat.leaveIn < 0;

/** 숨은 손님은 실수·놓침 없이 왔을 때만 등장한다 */
function nextCustomer(s: PlayState): StageCustomer | undefined {
  while (s.queue.length) {
    const c = s.queue.shift()!;
    if (!c.hidden || (s.mistakes === 0 && s.missed === 0)) return c;
  }
  return undefined;
}

export function update(s: PlayState, dt: number): void {
  if (s.done) return;
  s.time += dt;

  s.seats.forEach((seat, i) => {
    if (!seat) return;
    if (seat.leaveIn >= 0) {
      seat.leaveIn -= dt;
      if (seat.leaveIn <= 0) s.seats[i] = null;
      return;
    }
    seat.patience -= dt;
    if (seat.patience <= 0) {
      seat.patience = 0;
      seat.mood = 'angry';
      seat.say = LINES.left;
      seat.leaveIn = LEAVE_DELAY;
      s.missed++;
      s.events.push({ kind: 'left', seat: i });
    }
  });

  s.nextArrival -= dt;
  if (s.nextArrival <= 0 && s.queue.length) {
    const free = s.seats.findIndex((x) => x === null);
    if (free >= 0) {
      const c = nextCustomer(s);
      if (c) {
        s.seats[free] = {
          customer: c,
          patience: s.stage.patience,
          maxPatience: s.stage.patience,
          mood: 'wait',
          say: c.line,
          leaveIn: -1,
        };
        s.arrived++;
        s.events.push({ kind: 'arrive', seat: free });
      }
      s.nextArrival = s.stage.arrivalGap;
    }
  }

  if (!isActive(s.seats[s.target])) {
    const first = s.seats.findIndex(isActive);
    if (first >= 0) s.target = first;
  }

  s.done = s.queue.length === 0 && s.seats.every((x) => x === null);
}

export function addIngredient(s: PlayState, id: string): void {
  if (!s.done && s.pot.length < POT_LIMIT) s.pot.push(id);
}

export function discard(s: PlayState): void {
  s.pot = [];
}

export function selectSeat(s: PlayState, i: number): void {
  if (isActive(s.seats[i])) s.target = i;
}

export function cycleTarget(s: PlayState, dir: 1 | -1): void {
  for (let k = 1; k <= SEAT_COUNT; k++) {
    const i = (s.target + dir * k + SEAT_COUNT * 2) % SEAT_COUNT;
    if (isActive(s.seats[i])) {
      s.target = i;
      return;
    }
  }
}

export const matches = (recipe: Recipe, pot: string[]) =>
  recipe.ingredients.length === pot.length && recipe.ingredients.every((x, i) => x === pot[i]);

export function serve(s: PlayState, recipes: Map<string, Recipe>): void {
  const seat = s.seats[s.target];
  if (!isActive(seat) || s.pot.length === 0) return;
  const recipe = recipes.get(seat.customer.dish);
  if (recipe && matches(recipe, s.pot)) {
    const points = BASE_POINTS + Math.round((SPEED_BONUS * seat.patience) / seat.maxPatience);
    s.score += points;
    s.served++;
    seat.mood = 'happy';
    seat.say = LINES.happy;
    seat.leaveIn = LEAVE_DELAY;
    s.events.push({ kind: 'served', seat: s.target, points });
  } else {
    s.mistakes++;
    s.score = Math.max(0, s.score - WRONG_PENALTY);
    seat.patience = Math.max(0.1, seat.patience - WRONG_PATIENCE_LOSS);
    seat.mood = 'angry';
    seat.say = LINES.wrong;
    s.events.push({ kind: 'wrong', seat: s.target });
  }
  s.pot = [];
}

/** 0~3. 0이면 실패 */
export function starsFor(served: number, total: number, mistakes: number): number {
  if (total === 0) return 0;
  if (served === total) return mistakes === 0 ? 3 : 2;
  return served * 2 >= total ? 1 : 0;
}
