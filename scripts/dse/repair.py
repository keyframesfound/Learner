#!/usr/bin/env python3
"""Repair exam items whose numbered statements (1)/(2)/(3) were dropped by the page OCR.

The first pass transcribed the stem up to the question mark and the four options, and
lost the numbered statements printed between them — so "(1) and (2) only" pointed at
nothing. This re-reads just those questions from the page image and puts the statements
back into the stem. Options and the answer key are never touched.

    python3 repair.py 2020 2022 2023
"""
import base64
import glob
import json
import os
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

MODEL = "inclusionai/ling-3.0-flash-vl"
KEY = [l.split("=", 1)[1].strip().strip('"').strip("'")
       for l in open(os.path.expanduser("~/.hermes/.env"), encoding="utf8")
       if l.startswith("HERMES_CUSTOM_OPENROUTER_API_KEY=")][0]

PROMPT = """This is a page of a Hong Kong HKDSE ICT multiple-choice paper.

Re-read QUESTION {no} only and return JSON:
{{"no":{no},"stem":"...","statements":["...","..."],"options":{{"A":"...","B":"...","C":"...","D":"..."}}}}

- `stem` is the wording above the numbered statements, ending with the question mark.
- `statements` are the items printed as (1), (2), (3) ... between the stem and the options.
  Transcribe each one exactly, without the leading "(n)" - an empty list if the question has none.
- `options` are A-D exactly as printed. If the options themselves are the only numbered
  list (no separate statements), statements is [].
- Never invent text. If something is unreadable, put "[unreadable]" in that spot.
JSON only, no markdown fences."""


def call(png, no):
    b64 = base64.b64encode(open(png, "rb").read()).decode()
    body = {"model": MODEL, "max_tokens": 2500, "temperature": 0,
            "messages": [{"role": "user", "content": [
                {"type": "text", "text": PROMPT.format(no=no)},
                {"type": "image_url", "image_url": {"url": "data:image/png;base64," + b64}}]}]}
    req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(body).encode(),
        headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json",
                 "HTTP-Referer": "https://ai.ssc.edu.hk", "X-Title": "learner-repair"})
    with urllib.request.urlopen(req, timeout=240) as r:
        txt = json.load(r)["choices"][0]["message"]["content"].strip()
    txt = re.sub(r"^```(?:json)?|```$", "", txt, flags=re.M).strip()
    return json.loads(txt[txt.find("{"):txt.rfind("}") + 1])


def page_for(year, no):
    for path in sorted(glob.glob(f"ocr/{year}/page-*.json")):
        try:
            data = json.load(open(path, encoding="utf8"))
        except Exception:
            continue
        for q in data.get("questions") or []:
            if str(q.get("no", "")).strip().rstrip(".") == str(no):
                n = int(re.search(r"page-(\d+)\.json$", path).group(1))
                for cand in (f"ocr/{year}/png/p-{n:02d}.png", f"ocr/{year}/png/p-{n:03d}.png"):
                    if os.path.exists(cand):
                        return cand
    return None


def needs_fix(item):
    opts = " ".join(item["options"])
    return "(1)" in opts and "(1)" not in item["prompt"]


def main():
    years = sys.argv[1:] or ["2020", "2022", "2023"]
    repairs = {}
    jobs = []
    for year in years:
        bank = json.load(open(f"{year}.json", encoding="utf8"))
        for item in bank["questions"]:
            if needs_fix(item):
                jobs.append((year, item))

    print(f"{len(jobs)} items need their statements")

    def work(job):
        year, item = job
        png = page_for(year, item["no"])
        if not png or not os.path.exists(png):
            print(f"  {year} Q{item['no']}: no page image")
            return
        for attempt in range(3):
            try:
                data = call(png, item["no"])
                stmts = [str(s).strip() for s in (data.get("statements") or []) if str(s).strip()]
                stem = str(data.get("stem") or "").strip()
                if not stem or not stmts:
                    print(f"  {year} Q{item['no']}: model returned no statements")
                    return
                joined = stem.rstrip()
                for i, s in enumerate(stmts, 1):
                    joined += f" ({i}) {s}"
                repairs.setdefault(year, {})[str(item["no"])] = {
                    "prompt": joined,
                    "statements": stmts,
                }
                print(f"  {year} Q{item['no']}: +{len(stmts)} statements")
                return
            except Exception as exc:  # noqa: BLE001
                print(f"  {year} Q{item['no']} attempt {attempt + 1}: {exc}")
                time.sleep(2 * (attempt + 1))

    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(work, jobs))

    for year, items in repairs.items():
        bank = json.load(open(f"{year}.json", encoding="utf8"))
        for item in bank["questions"]:
            fix = items.get(str(item["no"]))
            if fix:
                item["prompt"] = fix["prompt"]
        json.dump(bank, open(f"{year}.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)

    json.dump(repairs, open("repairs.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print(f"patched {sum(len(v) for v in repairs.values())} items")


if __name__ == "__main__":
    main()
