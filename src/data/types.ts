// 삼국주방 데이터 타입
//
// JSON 파일 하나 = 테이블 하나 (파일 이름 = 테이블 이름).
// 테이블 열 이름은 대문자 스네이크 (예: CHR_ID, NAME_KO).
// 기본키: 테이블약자_ID (예: CHR_ID), 값: 테이블약자 + 4자리 순번 (예: chr0001).
// 외래키는 참조하는 테이블의 기본키 이름을 그대로 쓴다.
//
// 아래 타입은 매퍼(mapper.ts)가 카멜 케이스로 바꾼 뒤의 모양이다 (CHR_ID → chrId).

// ---------- 테이블 행 ----------

/** factions (fac): 세력 */
export interface FactionRow { facId: string; code: string; name: string }

/** characters (chr): 인물. 순번은 원작 첫 등장 순서 */
export interface CharacterRow { chrId: string; code: string; nameKo: string; nameHanja: string; facId: string }

/** arcs (arc): 업데이트 단위로 묶은 원작 구간 */
export interface ArcRow {
  arcId: string; code: string; name: string;
  startChpId: string; endChpId: string; startYear: number; endYear: number;
  bossChrId: string;
}

/** chapters (chp): 원작 120회. 회목은 모종강본 기준 */
export interface ChapterRow {
  chpId: string; chpNo: number; titleFirst: string; titleSecond: string;
  label: string; year: number; arcId: string;
}

/** chapter_casts (chc): 회차별 주요 등장인물 */
export interface ChapterCastRow { chcId: string; chpId: string; chrId: string; sortOrder: number }

/** chapter_food_hooks (cfh): 원작 속 음식·술·연회 장면 */
export interface ChapterFoodHookRow { cfhId: string; chpId: string; description: string; sortOrder: number }

/** ingredients (ing): 재료 */
export interface IngredientRow { ingId: string; code: string; name: string }

/** recipes (rcp): 요리 */
export interface RecipeRow { rcpId: string; code: string; name: string }

/** recipe_ingredients (rci): 요리에 넣는 재료와 순서 */
export interface RecipeIngredientRow { rciId: string; rcpId: string; ingId: string; step: number }

/** stages (stg): 게임 장. 원작 회차 하나를 무대로 삼는다 */
export interface StageRow {
  stgId: string; stgNo: number; name: string; chpId: string;
  era: string; year: number; patience: number; arrivalGap: number;
}

/** stage_customers (stc): 장별 손님, 주문, 대사 */
export interface StageCustomerRow {
  stcId: string; stgId: string; chrId: string; rcpId: string;
  line: string; hidden: boolean; sortOrder: number;
}

// ---------- 게임에서 쓰는 조합 모델 ----------

export interface Character extends CharacterRow { faction: FactionRow }

export interface Recipe extends RecipeRow {
  /** 넣는 순서대로 ingId */
  steps: string[];
}

export interface Chapter extends ChapterRow {
  cast: string[];      // chrId
  foodHooks: string[];
}

export type StageCustomer = StageCustomerRow;

export interface Stage extends StageRow {
  customers: StageCustomer[];
}
