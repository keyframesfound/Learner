#!/usr/bin/env python3
"""Merge per-page OCR JSON into one clean question bank per year.

    python3 merge.py 2020 2022 2023        # years with an official key
    python3 merge.py --staged 2025         # questions only, no answers yet

Writes <year>.json next to this script: {"year":..,"questions":[{no,prompt,code,
options,answer,percent,level,source}]}
"""
import glob
import json
import os
import re
import sys

LETTERS = "ABCD"
FIXUPS = json.load(open("fixups.json", encoding="utf8"))



def clean(text):
    if text is None:
        return ""
    t = str(text)
    t = t.replace("\u00a0", " ")
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\s*\n\s*", " ", t)
    return t.strip()


def stem_quality(q):
    """A longer stem and four options wins when a question appears twice."""
    opts = q.get("options") or {}
    have = sum(1 for k in LETTERS if clean(opts.get(k)))
    return (have, len(clean(q.get("stem"))))


def collect(year):
    best = {}
    fix = (FIXUPS.get(year) or {})
    for path in sorted(glob.glob(f"ocr/{year}/page-*.json")):
        try:
            data = json.load(open(path, encoding="utf8"))
        except Exception:
            continue
        if (data.get("section") or "").upper() == "B":
            continue
        for q in data.get("questions") or []:
            try:
                no = int(str(q.get("no", "")).strip().rstrip("."))
            except ValueError:
                continue
            if not (1 <= no <= 40):
                continue
            opts = {k: clean((q.get("options") or {}).get(k)) for k in LETTERS}
            if sum(1 for v in opts.values() if v) < 3:
                continue
            rec = {
                "no": no,
                "stem": clean(q.get("stem")),
                "code": [str(line) for line in (q.get("code") or []) if str(line).strip()] or None,
                "options": opts,
                "figure": q.get("figure") or "none",
                "figure_note": clean(q.get("figure_note")),
                "page": os.path.basename(path),
            }
            if not rec["stem"]:
                continue
            if no not in best or stem_quality(rec) > stem_quality(best[no]):
                best[no] = rec

    for no_s, patch in fix.items():
        no = int(no_s)
        rec = best.setdefault(no, {"no": no, "page": "fixup"})
        for key, value in patch.items():
            rec[key] = value
    return best


def level_for(percent):
    if percent is None:
        return "recall"
    if percent >= 70:
        return "recognize"
    if percent >= 45:
        return "recall"
    return "apply"


def main():
    staged = "--staged" in sys.argv
    years = [a for a in sys.argv[1:] if not a.startswith("--")]
    report = []
    for year in years:
        qs = collect(year)
        key = {"answers": {}, "percent": {}}
        if not staged:
            kp = f"keys/{year}.json"
            if not os.path.exists(kp):
                print(f"{year}: no answer key - skipped (use --staged)")
                continue
            key = json.load(open(kp, encoding="utf8"))

        out = []
        dropped = []
        for no in sorted(qs):
            rec = qs[no]
            letter = (key.get("answers") or {}).get(str(no))
            letter = (letter or "").strip().upper()[:1]
            if not staged and letter not in LETTERS:
                report.append(f"{year} Q{no}: no key letter, dropped")
                continue
            pct = (key.get("percent") or {}).get(str(no))
            try:
                pct = int(str(pct).replace("%", "").strip())
            except (TypeError, ValueError):
                pct = None
            item = {
                "no": no,
                "prompt": rec["stem"],
                "options": [rec["options"][k] for k in LETTERS],
                "code": rec["code"],
                "figure": rec["figure"],
                "figure_note": rec["figure_note"],
                "level": level_for(pct) if not staged else "recall",
                "percent": pct,
                "source": f"HKDSE ICT Paper 1 · Section A · {year} · Q{no}",
            }
            if rec.get("figure") == "diagram":
                dropped.append(f"{year} Q{no}: needs the printed diagram")
                continue
            if not staged:
                item["answer"] = LETTERS.index(letter)
            out.append(item)

        dest = f"{year}.json"
        json.dump({"year": year, "staged": staged, "questions": out}, open(dest, "w", encoding="utf8"),
                  ensure_ascii=False, indent=1)
        missing_options = [q["no"] for q in out if any(not o for o in q["options"])]
        missing_code = [q["no"] for q in out if q["figure"] == "diagram"]
        print(f"{year}: {len(out)} questions -> {dest}"
              f" | incomplete options: {missing_options}"
              f" | diagram-only dropped: {dropped}")
        for line in missing_options[:10]:
            report.append(f"{year} Q{line}: fewer than 4 options")
    if report:
        print("\n".join(report))


if __name__ == "__main__":
    main()
