// 테이블 행(대문자 스네이크 열 이름)을 코드에서 쓰는 카멜 케이스 객체로 바꾼다.
// 예: { CHR_ID, NAME_KO, FAC_ID } → { chrId, nameKo, facId }

export const toCamel = (column: string): string =>
  column.toLowerCase().replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

export function mapRows<T>(rows: readonly object[]): T[] {
  return rows.map(
    (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [toCamel(k), v])) as T,
  );
}
