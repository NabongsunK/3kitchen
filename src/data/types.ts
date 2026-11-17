// 삼국주방 콘텐츠 데이터 타입
// chapters.json / characters.json / arcs.json 의 스키마

/** 세력. 인물이 최종적으로(또는 대표적으로) 속한 진영 */
export type Faction =
  | 'han'          // 한 (조정·관료)
  | 'yellowTurban' // 황건적
  | 'warlord'      // 군웅 (동탁, 원소, 여포, 유표 등)
  | 'wei'          // 위
  | 'shu'          // 촉
  | 'wu'           // 오
  | 'jin'          // 진 (사마염 이후)
  | 'nanman'       // 남만
  | 'other';       // 은사·도사·의원 등

export interface Character {
  id: string;        // 병음 소문자 (예: 'liubei')
  nameKo: string;    // 한글 이름
  nameHanja: string; // 한자 이름
  faction: Faction;
}

/** 원작 삼국지연의 1회 */
export interface Chapter {
  id: number;                // 1~120
  title: [string, string];   // 회목 대구 (모종강본 기준, 번체)
  label: string;             // 게임 표시용 짧은 한글 이름
  year: number;              // 주된 배경 연도 (서기). 원작 서술 순서상 역행할 수 있음
  arc: string;               // arcs.json 의 id
  cast: string[];            // 주요 등장인물 id (characters.json)
  foodHooks?: string[];      // 원작 속 음식·술·연회 장면 (레시피 아이디어용)
}

export interface Ingredient {
  id: string;
  name: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: string[]; // 넣는 순서대로 (ingredients.json id)
}

export interface StageCustomer {
  character: string; // characters.json id
  dish: string;      // recipes.json id
  line: string;      // 주문할 때 하는 말
  hidden?: boolean;  // 이스터에그: 실수 없이 진행했을 때만 등장
}

/** 게임 스테이지. 원작 회차(chapter) 하나를 무대로 삼는다 */
export interface Stage {
  id: number;
  name: string;
  chapter: number;   // chapters.json id
  era: string;       // 연호 표기 (예: '중평 원년')
  year: number;
  patience: number;  // 손님 인내심(초)
  arrivalGap: number; // 손님 등장 간격(초)
  customers: StageCustomer[];
}

/** 업데이트 단위로 묶은 구간 */
export interface Arc {
  id: string;
  name: string;
  chapters: [number, number]; // [시작회, 끝회]
  years: [number, number];
  boss: string;               // 구간 보스 손님 (characters.json id)
}
