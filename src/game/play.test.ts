import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Stage } from '../data/types';
import { recipeById, stages } from '../data/index';
import {
  addIngredient, createPlay, discard, isActive, serve, starsFor, update,
  BASE_POINTS, SPEED_BONUS, WRONG_PENALTY,
} from './play';
import { emptySave, recordResult } from './save';

const stage = (over: Partial<Stage> = {}): Stage => ({
  id: 99, name: '테스트', chapter: 1, era: '', year: 184, patience: 10, arrivalGap: 1,
  customers: [{ character: 'liubei', dish: 'kongjuk', line: '' }],
  ...over,
});

/** 손님이 등장할 때까지 진행 */
const arrive = (s: ReturnType<typeof createPlay>) => update(s, 1);

test('정확한 순서로 서빙하면 점수와 속도 보너스를 받는다', () => {
  const s = createPlay(stage());
  arrive(s);
  assert.ok(isActive(s.seats[0]));
  addIngredient(s, 'bean');
  addIngredient(s, 'rice');
  serve(s, recipeById);
  assert.equal(s.served, 1);
  assert.ok(s.score > BASE_POINTS && s.score <= BASE_POINTS + SPEED_BONUS);
  assert.deepEqual(s.pot, []);
});

test('재료 순서가 틀리면 실수로 처리되고 냄비가 비워진다', () => {
  const s = createPlay(stage());
  arrive(s);
  s.score = 50;
  addIngredient(s, 'rice');
  addIngredient(s, 'bean');
  serve(s, recipeById);
  assert.equal(s.served, 0);
  assert.equal(s.mistakes, 1);
  assert.equal(s.score, 50 - WRONG_PENALTY);
  assert.deepEqual(s.pot, []);
});

test('점수는 0 아래로 내려가지 않는다', () => {
  const s = createPlay(stage());
  arrive(s);
  addIngredient(s, 'salt');
  serve(s, recipeById);
  assert.equal(s.score, 0);
});

test('인내심이 다하면 손님이 떠나고 스테이지가 끝난다', () => {
  const s = createPlay(stage({ patience: 2 }));
  arrive(s);
  update(s, 3);
  assert.equal(s.missed, 1);
  update(s, 2);
  assert.ok(s.done);
});

test('숨은 손님은 실수가 없을 때만 등장한다', () => {
  const customers = [
    { character: 'caocao', dish: 'kongjuk', line: '' },
    { character: 'xushao', dish: 'kongjuk', line: '', hidden: true },
  ];
  const clean = createPlay(stage({ customers }));
  for (let i = 0; i < 5; i++) update(clean, 1);
  assert.equal(clean.arrived, 2);

  const messy = createPlay(stage({ customers }));
  arrive(messy);
  addIngredient(messy, 'salt');
  serve(messy, recipeById);
  for (let i = 0; i < 5; i++) update(messy, 1);
  assert.equal(messy.arrived, 1);
});

test('냄비 비우기', () => {
  const s = createPlay(stage());
  addIngredient(s, 'bean');
  discard(s);
  assert.deepEqual(s.pot, []);
});

test('별점 계산', () => {
  assert.equal(starsFor(3, 3, 0), 3);
  assert.equal(starsFor(3, 3, 2), 2);
  assert.equal(starsFor(2, 4, 0), 1);
  assert.equal(starsFor(1, 4, 0), 0);
  assert.equal(starsFor(0, 0, 0), 0);
});

test('클리어하면 다음 스테이지가 열리고 최고 기록이 유지된다', () => {
  let d = recordResult(emptySave(), 1, 300, 2, 5);
  assert.equal(d.unlocked, 2);
  d = recordResult(d, 1, 100, 0, 5);
  assert.deepEqual(d.best[1], { score: 300, stars: 2 });
  assert.equal(d.unlocked, 2);
  assert.equal(recordResult({ unlocked: 5, best: {} }, 5, 1, 1, 5).unlocked, 5);
});

test('모든 스테이지를 실수 없이 깨면 별 3개', () => {
  for (const st of stages) {
    const s = createPlay(st);
    for (let t = 0; t < 600 && !s.done; t++) {
      update(s, 0.25);
      const seat = s.seats[s.target];
      if (isActive(seat)) {
        recipeById.get(seat.customer.dish)!.ingredients.forEach((i) => addIngredient(s, i));
        serve(s, recipeById);
      }
    }
    assert.ok(s.done, `${st.name} 미종료`);
    assert.equal(s.served, s.arrived, st.name);
    assert.equal(starsFor(s.served, s.arrived, s.mistakes), 3, st.name);
  }
});
