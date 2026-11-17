// 진행도 저장 (localStorage). 저장소를 못 쓰는 환경에서도 게임은 돌아가야 한다.
export interface SaveData {
  unlocked: number; // 플레이 가능한 마지막 장 번호 (stgNo)
  best: Record<string, { score: number; stars: number }>; // stgId → 최고 기록
}

const KEY = '3kitchen.save.v2';
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

/** 결과를 반영한 새 저장 데이터. 별 1개 이상이면 다음 장 해금 */
export function recordResult(
  d: SaveData, stage: { stgId: string; stgNo: number }, score: number, stars: number, lastStgNo: number,
): SaveData {
  const prev = d.best[stage.stgId];
  const best = {
    ...d.best,
    [stage.stgId]: { score: Math.max(prev?.score ?? 0, score), stars: Math.max(prev?.stars ?? 0, stars) },
  };
  const unlocked = stars > 0 ? Math.min(lastStgNo, Math.max(d.unlocked, stage.stgNo + 1)) : d.unlocked;
  return { unlocked, best };
}
