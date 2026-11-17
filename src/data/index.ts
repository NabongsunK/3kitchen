// 테이블(JSON)을 읽어 게임에서 쓰는 모델로 조합한다.
import type {
  ArcRow, Chapter, ChapterCastRow, ChapterFoodHookRow, ChapterRow, Character, CharacterRow,
  FactionRow, IngredientRow, Recipe, RecipeIngredientRow, RecipeRow, Stage, StageCustomerRow, StageRow,
} from './types';
import arcsTable from './arcs.json';
import chapterCastsTable from './chapter_casts.json';
import chapterFoodHooksTable from './chapter_food_hooks.json';
import chaptersTable from './chapters.json';
import charactersTable from './characters.json';
import factionsTable from './factions.json';
import ingredientsTable from './ingredients.json';
import recipeIngredientsTable from './recipe_ingredients.json';
import recipesTable from './recipes.json';
import stageCustomersTable from './stage_customers.json';
import stagesTable from './stages.json';

const index = <T, K extends keyof T>(rows: T[], key: K) => new Map(rows.map((r) => [r[key] as string, r]));
const bySort = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder;

export function mustGet<V>(map: Map<string, V>, key: string): V {
  const v = map.get(key);
  if (v === undefined) throw new Error(`데이터 없음: ${key}`);
  return v;
}

// 테이블
export const factionRows = factionsTable as FactionRow[];
export const arcs = arcsTable as ArcRow[];
export const ingredients = ingredientsTable as IngredientRow[];
const characterRows = charactersTable as CharacterRow[];
const chapterRows = chaptersTable as ChapterRow[];
const castRows = chapterCastsTable as ChapterCastRow[];
const hookRows = chapterFoodHooksTable as ChapterFoodHookRow[];
const recipeRows = recipesTable as RecipeRow[];
const recipeIngredientRows = recipeIngredientsTable as RecipeIngredientRow[];
const stageRows = stagesTable as StageRow[];
const stageCustomerRows = stageCustomersTable as StageCustomerRow[];

// 조합 모델
const factionById = index(factionRows, 'facID');

export const characters: Character[] = characterRows.map((c) => ({ ...c, faction: mustGet(factionById, c.facID) }));

export const recipes: Recipe[] = recipeRows.map((r) => ({
  ...r,
  steps: recipeIngredientRows.filter((x) => x.rcpID === r.rcpID).sort((a, b) => a.step - b.step).map((x) => x.ingID),
}));

export const chapters: Chapter[] = chapterRows.map((ch) => ({
  ...ch,
  cast: castRows.filter((x) => x.chpID === ch.chpID).sort(bySort).map((x) => x.chrID),
  foodHooks: hookRows.filter((x) => x.chpID === ch.chpID).sort(bySort).map((x) => x.description),
}));

export const stages: Stage[] = stageRows
  .map((s) => ({ ...s, customers: stageCustomerRows.filter((x) => x.stgID === s.stgID).sort(bySort) }))
  .sort((a, b) => a.stgNo - b.stgNo);

export const characterById = index(characters, 'chrID');
export const chapterById = index(chapters, 'chpID');
export const ingredientById = index(ingredients, 'ingID');
export const recipeById = index(recipes, 'rcpID');
