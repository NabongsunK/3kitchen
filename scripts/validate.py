"""삼국주방 데이터 검증: python3 scripts/validate.py

규칙
- JSON 파일 하나 = 테이블 하나 (파일 이름 = 테이블 이름)
- 열 이름: 대문자 스네이크 (예: NAME_KO)
- 기본키 이름: 테이블약자_ID (예: CHR_ID), 값: 테이블약자 + 4자리 순번 (1부터 빈틈없이)
- 외래키 이름은 참조 테이블의 기본키 이름과 같다
"""
import json, re, sys
from pathlib import Path

D = Path(__file__).resolve().parent.parent / "src" / "data"

# 테이블 이름 → 약자
TABLES = {
    "factions": "fac", "characters": "chr", "arcs": "arc", "chapters": "chp",
    "chapter_casts": "chc", "chapter_food_hooks": "cfh", "ingredients": "ing",
    "recipes": "rcp", "recipe_ingredients": "rci", "stages": "stg", "stage_customers": "stc",
}
# 기본키가 아닌데 다른 테이블을 가리키는 열 (이름이 기본키와 다른 경우)
EXTRA_FK = {"arcs": {"START_CHP_ID": "chp", "END_CHP_ID": "chp", "BOSS_CHR_ID": "chr"}}
UNIQUE = {"factions": ["CODE"], "characters": ["CODE"], "arcs": ["CODE"], "ingredients": ["CODE"],
          "recipes": ["CODE"], "chapters": ["CHP_NO"], "stages": ["STG_NO"]}
COLUMN = re.compile(r"[A-Z][A-Z0-9]*(_[A-Z0-9]+)*")

errors, warns = [], []
data = {}
for t in TABLES:
    f = D / f"{t}.json"
    if not f.exists():
        errors.append(f"{t}.json 없음")
        continue
    data[t] = json.loads(f.read_text(encoding="utf-8"))
for f in D.glob("*.json"):
    if f.stem not in TABLES:
        warns.append(f"{f.name}: 검증 목록에 없는 테이블")

abbr_to_table = {a: t for t, a in TABLES.items()}
keys = {}
for t, rows in data.items():
    a = TABLES[t]
    pk = f"{a.upper()}_ID"
    for r in rows:
        for col in r:
            if not COLUMN.fullmatch(col):
                errors.append(f"{t}.{col}: 열 이름이 대문자 스네이크가 아님")
    ids = [r.get(pk) for r in rows]
    if any(i is None for i in ids):
        errors.append(f"{t}: 기본키 {pk} 없는 행")
        continue
    expected = [f"{a}{n:04d}" for n in range(1, len(rows) + 1)]
    if ids != expected:
        bad = next(i for i, (x, y) in enumerate(zip(ids, expected)) if x != y) if ids[: len(expected)] != expected else len(ids)
        errors.append(f"{t}: {pk} 값이 {a}0001부터 순번이 아님 (행 {bad + 1}: {ids[bad] if bad < len(ids) else '-'})")
    keys[t] = set(ids)
    for col in UNIQUE.get(t, []):
        vals = [r[col] for r in rows]
        if len(vals) != len(set(vals)):
            errors.append(f"{t}.{col}: 중복")

for t, rows in data.items():
    pk = f"{TABLES[t].upper()}_ID"
    for r in rows:
        for col, v in r.items():
            m = re.fullmatch(r"([A-Z]{3})_ID", col)
            target = None
            if m and col != pk:
                target = abbr_to_table.get(m.group(1).lower())
                if not target:
                    errors.append(f"{t}.{col}: 알 수 없는 테이블 약자")
                    continue
            elif col in EXTRA_FK.get(t, {}):
                target = abbr_to_table[EXTRA_FK[t][col]]
            if target and v not in keys.get(target, set()):
                errors.append(f"{t} {r[pk]}.{col} = {v}: {target}에 없음")

# 업무 규칙
if data.get("chapters"):
    nos = [c["CHP_NO"] for c in data["chapters"]]
    if nos != list(range(1, 121)):
        errors.append("chapters: CHP_NO가 1~120 연속이 아님")
    chp = {c["CHP_ID"]: c for c in data["chapters"]}
    arcs = {a["ARC_ID"]: a for a in data.get("arcs", [])}
    prev = 0
    for c in data["chapters"]:
        a = arcs.get(c["ARC_ID"])
        if a:
            if not chp[a["START_CHP_ID"]]["CHP_NO"] <= c["CHP_NO"] <= chp[a["END_CHP_ID"]]["CHP_NO"]:
                errors.append(f"chapters {c['CHP_ID']}: 구간 {a['ARC_ID']} 범위 밖")
            if not a["START_YEAR"] <= c["YEAR"] <= a["END_YEAR"]:
                errors.append(f"chapters {c['CHP_ID']}: 연도 {c['YEAR']}가 구간 연도 밖")
        if c["YEAR"] < prev:
            warns.append(f"chapters {c['CHP_ID']}: 연도 역행 {prev} → {c['YEAR']} (원작 서술 순서)")
        prev = max(prev, c["YEAR"])
    for s in data.get("stages", []):
        c = chp.get(s["CHP_ID"])
        if c and c["YEAR"] != s["YEAR"]:
            warns.append(f"stages {s['STG_ID']}: 연도 {s['YEAR']} ≠ 원작 {c['CHP_NO']}회 연도 {c['YEAR']}")

if data.get("recipe_ingredients"):
    steps = {}
    for r in data["recipe_ingredients"]:
        steps.setdefault(r["RCP_ID"], []).append((r["STEP"], r["ING_ID"]))
    seqs = []
    for rcp, s in steps.items():
        s.sort()
        if [n for n, _ in s] != list(range(1, len(s) + 1)):
            errors.append(f"recipe_ingredients {rcp}: STEP이 1부터 연속이 아님")
        seqs.append(tuple(i for _, i in s))
    if len(seqs) != len(set(seqs)):
        errors.append("재료 순서가 같은 레시피가 있음")
    for r in data.get("recipes", []):
        if r["RCP_ID"] not in steps:
            errors.append(f"recipes {r['RCP_ID']}: 재료 없음")

used = {r["CHR_ID"] for r in data.get("chapter_casts", [])}
for c in data.get("characters", []):
    if c["CHR_ID"] not in used:
        warns.append(f"characters {c['CHR_ID']}({c['CODE']}): 어느 회차에도 등장하지 않음")

print(" · ".join(f"{t} {len(r)}" for t, r in data.items()))
for w in warns: print("경고:", w)
for e in errors: print("오류:", e)
print("통과" if not errors else f"실패 ({len(errors)}건)")
sys.exit(1 if errors else 0)
