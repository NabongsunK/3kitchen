// 테이블(JSON)을 읽어 매퍼로 카멜 케이스로 바꾼 뒤 게임에서 쓰는 모델로 조합한다.
import type {
  ArcRow, Chapter, ChapterCastRow, ChapterFoodHookRow, ChapterRow, Character, CharacterRow,
  FactionRow, IngredientRow, Recipe, RecipeIngredientRow, RecipeRow, Stage, StageCustomerRow, StageRow,
} from './types';
import { mapRows } from './mapper';
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
export const factionRows = mapRows<FactionRow>(factionsTable);
export const arcs = mapRows<ArcRow>(arcsTable);
export const ingredients = mapRows<IngredientRow>(ingredientsTable);
const characterRows = mapRows<CharacterRow>(charactersTable);
const chapterRows = mapRows<ChapterRow>(chaptersTable);
const castRows = mapRows<ChapterCastRow>(chapterCastsTable);
const hookRows = mapRows<ChapterFoodHookRow>(chapterFoodHooksTable);
const recipeRows = mapRows<RecipeRow>(recipesTable);
const recipeIngredientRows = mapRows<RecipeIngredientRow>(recipeIngredientsTable);
const stageRows = mapRows<StageRow>(stagesTable);
const stageCustomerRows = mapRows<StageCustomerRow>(stageCustomersTable);

// 조합 모델
const factionById = index(factionRows, 'facId');

export const characters: Character[] = characterRows.map((c) => ({ ...c, faction: mustGet(factionById, c.facId) }));

export const recipes: Recipe[] = recipeRows.map((r) => ({
  ...r,
  steps: recipeIngredientRows.filter((x) => x.rcpId === r.rcpId).sort((a, b) => a.step - b.step).map((x) => x.ingId),
}));

export const chapters: Chapter[] = chapterRows.map((ch) => ({
  ...ch,
  cast: castRows.filter((x) => x.chpId === ch.chpId).sort(bySort).map((x) => x.chrId),
  foodHooks: hookRows.filter((x) => x.chpId === ch.chpId).sort(bySort).map((x) => x.description),
}));

export const stages: Stage[] = stageRows
  .map((s) => ({ ...s, customers: stageCustomerRows.filter((x) => x.stgId === s.stgId).sort(bySort) }))
  .sort((a, b) => a.stgNo - b.stgNo);

export const characterById = index(characters, 'chrId');
export const chapterById = index(chapters, 'chpId');
export const ingredientById = index(ingredients, 'ingId');
export const recipeById = index(recipes, 'rcpId');
