import type { Arc, Chapter, Character, Ingredient, Recipe, Stage } from './types';
import arcsJson from './arcs.json';
import chaptersJson from './chapters.json';
import charactersJson from './characters.json';
import ingredientsJson from './ingredients.json';
import recipesJson from './recipes.json';
import stagesJson from './stages.json';

export const arcs = arcsJson as Arc[];
export const chapters = chaptersJson as Chapter[];
export const characters = charactersJson as Character[];
export const ingredients = ingredientsJson as Ingredient[];
export const recipes = recipesJson as Recipe[];
export const stages = stagesJson as Stage[];

const byId = <T extends { id: string | number }>(list: T[]) =>
  new Map<T['id'], T>(list.map((x) => [x.id, x]));

export const chapterById = byId(chapters);
export const characterById = byId(characters);
export const ingredientById = byId(ingredients);
export const recipeById = byId(recipes);

export function mustGet<K, V>(map: Map<K, V>, key: K): V {
  const v = map.get(key);
  if (v === undefined) throw new Error(`데이터 없음: ${String(key)}`);
  return v;
}
