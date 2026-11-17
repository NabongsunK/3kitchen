"""삼국주방 콘텐츠 데이터 검증: python3 scripts/validate.py"""
import json, sys
from pathlib import Path

D = Path(__file__).resolve().parent.parent / "src" / "data"
chapters = json.loads((D / "chapters.json").read_text(encoding="utf-8"))
chars = json.loads((D / "characters.json").read_text(encoding="utf-8"))
arcs = json.loads((D / "arcs.json").read_text(encoding="utf-8"))

errors, warns = [], []
FACTIONS = {"han", "yellowTurban", "warlord", "wei", "shu", "wu", "jin", "nanman", "other"}

ids = [c["id"] for c in chars]
if len(ids) != len(set(ids)):
    errors.append("인물 id 중복")
char_ids = set(ids)
for c in chars:
    if c["faction"] not in FACTIONS:
        errors.append(f"{c['id']}: 알 수 없는 세력 {c['faction']}")

if [c["id"] for c in chapters] != list(range(1, 121)):
    errors.append("회차 id가 1~120 연속이 아님")

arc_by_id = {a["id"]: a for a in arcs}
expected = 1
for a in arcs:
    s, e = a["chapters"]
    if s != expected:
        errors.append(f"구간 {a['id']} 시작 {s}, 기대값 {expected}")
    expected = e + 1
    if a["boss"] not in char_ids:
        errors.append(f"구간 {a['id']} 보스 {a['boss']} 없음")
if expected != 121:
    errors.append("구간이 120회까지 덮지 않음")

used, prev_year = set(), 0
for ch in chapters:
    n = ch["id"]
    if len(ch["title"]) != 2 or not all(ch["title"]):
        errors.append(f"{n}회: 회목이 대구 2개가 아님")
    a = arc_by_id.get(ch["arc"])
    if not a:
        errors.append(f"{n}회: 구간 {ch['arc']} 없음")
    else:
        if not a["chapters"][0] <= n <= a["chapters"][1]:
            errors.append(f"{n}회: 구간 {a['id']} 범위 밖")
        if not a["years"][0] <= ch["year"] <= a["years"][1]:
            errors.append(f"{n}회: 연도 {ch['year']}가 구간 연도 {a['years']} 밖")
    for cid in ch["cast"]:
        if cid not in char_ids:
            errors.append(f"{n}회: 인물 {cid} 없음")
        used.add(cid)
    if len(ch["cast"]) != len(set(ch["cast"])):
        errors.append(f"{n}회: 등장인물 중복")
    if ch["year"] < prev_year:
        warns.append(f"{n}회: 연도 역행 {prev_year} → {ch['year']} (원작 서술 순서)")
    prev_year = max(prev_year, ch["year"])

ingredients = {i["id"] for i in json.loads((D / "ingredients.json").read_text(encoding="utf-8"))}
recipes = json.loads((D / "recipes.json").read_text(encoding="utf-8"))
recipe_ids = {r["id"] for r in recipes}
stages = json.loads((D / "stages.json").read_text(encoding="utf-8"))
for r in recipes:
    for i in r["ingredients"]:
        if i not in ingredients:
            errors.append(f"레시피 {r['id']}: 재료 {i} 없음")
if len({tuple(r["ingredients"]) for r in recipes}) != len(recipes):
    errors.append("재료 순서가 같은 레시피가 있음")
chapter_by_id = {c["id"]: c for c in chapters}
for st in stages:
    ch = chapter_by_id.get(st["chapter"])
    if not ch:
        errors.append(f"스테이지 {st['id']}: 원작 {st['chapter']}회 없음")
    elif ch["year"] != st["year"]:
        warns.append(f"스테이지 {st['id']}: 연도 {st['year']} ≠ 원작 {ch['id']}회 연도 {ch['year']}")
    for c in st["customers"]:
        if c["character"] not in char_ids:
            errors.append(f"스테이지 {st['id']}: 인물 {c['character']} 없음")
        if c["dish"] not in recipe_ids:
            errors.append(f"스테이지 {st['id']}: 요리 {c['dish']} 없음")

for cid in sorted(char_ids - used):
    warns.append(f"인물 {cid}: 어느 회차에도 등장하지 않음")

first = {}
for ch in chapters:
    for cid in ch["cast"]:
        first.setdefault(cid, ch["id"])

print(f"회차 {len(chapters)} · 인물 {len(chars)} · 구간 {len(arcs)} · 음식 장면 {sum(len(c.get('foodHooks', [])) for c in chapters)}")
for w in warns: print("경고:", w)
for e in errors: print("오류:", e)
print("통과" if not errors else f"실패 ({len(errors)}건)")
sys.exit(1 if errors else 0)
