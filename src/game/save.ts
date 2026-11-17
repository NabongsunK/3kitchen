// 진행도 저장 (localStorage). 저장소를 못 쓰는 환경에서도 게임은 돌아가야 한다.
export interface SaveData {
  unlocked: number; // 플레이 가능한 마지막 스테이지 id
  best: Record<number, { score: number; stars: number }>;
}

const KEY = '3kitchen.save.v1';
export const emptySave = (): SaveData => ({ unlocked: 1, best: {} });

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptySave();
    const d = JSON.parse(raw) as Partial<SaveData>;
    return { unlocked: Math.max(1, Number(d.unlocked) || 1), best: d.best ?? {} };
  } catch {
    return emptySave();
  }
}

export function writeSave(d: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* 저장 실패는 무시 */
  }
}

/** 결과를 반영한 새 저장 데이터. 별 1개 이상이면 다음 스테이지 해금 */
export function recordResult(d: SaveData, stageId: number, score: number, stars: number, lastStage: number): SaveData {
  const prev = d.best[stageId];
  const best = {
    ...d.best,
    [stageId]: { score: Math.max(prev?.score ?? 0, score), stars: Math.max(prev?.stars ?? 0, stars) },
  };
  const unlocked = stars > 0 ? Math.min(lastStage, Math.max(d.unlocked, stageId + 1)) : d.unlocked;
  return { unlocked, best };
}
