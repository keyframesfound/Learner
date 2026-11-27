#!/usr/bin/env python3
"""OCR a scanned HKDSE paper into structured MCQ JSON, one page per call.

Usage:  python3 extract.py <pdf> <outdir> [first] [last]

Writes <outdir>/page-NNN.json for every page and appends failures to
<outdir>/failures.log. Re-running skips pages already done, so an interrupted
run can be resumed.
"""
import base64
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

MODEL = "inclusionai/ling-3.0-flash-vl"
BASE = "https://openrouter.ai/api/v1/chat/completions"

PROMPT = """You are transcribing ONE page of a Hong Kong HKDSE ICT examination paper (English) into JSON for a revision app.

Return ONLY JSON:
{"section":"A|B|other","questions":[{"no":14,"stem":"...","code":["..."] or null,"options":{"A":"...","B":"...","C":"...","D":"..."},"figure":"none|table|diagram|screenshot","figure_note":""}],"notes":""}

Rules:
- MULTIPLE-CHOICE QUESTIONS ONLY. Section A is multiple choice with four options A. B. C. D. Section B is structured/essay: return {"section":"B","questions":[]}.
- Transcribe text EXACTLY as printed: keep casing, punctuation, units, code syntax, underscores, quotes, subscripts as plain text.
- If the question is introduced by a table / data box printed above it, copy that table into `code` as space-aligned plain-text lines that stay legible in a monospace font, and set figure to "table". The same table must be repeated on every question it introduces.
- A picture, screenshot or diagram that plain text cannot carry: set figure to "diagram" and describe it briefly in figure_note.
- Do NOT invent, complete, translate or fix anything. If an option is cut off at the page edge, transcribe what is visible and say so in notes.
- Skip a question whose stem is not visible on this page (it is continued from the previous page).
- Answer options are labelled A/B/C/D (sometimes lowercase a/b/c/d) - always emit keys "A".."D".
- No commentary and no markdown fences. JSON only."""


def key():
    for line in open(os.path.expanduser("~/.hermes/.env"), encoding="utf8"):
        if line.startswith("HERMES_CUSTOM_OPENROUTER_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("no openrouter key")


KEY = key()


def ocr(png):
    b64 = base64.b64encode(open(png, "rb").read()).decode()
    body = {
        "model": MODEL,
        "max_tokens": 6000,
        "temperature": 0,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": PROMPT},
            {"type": "image_url", "image_url": {"url": "data:image/png;base64," + b64}},
        ]}],
    }
    req = urllib.request.Request(
        BASE, data=json.dumps(body).encode(),
        headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json",
                 "HTTP-Referer": "https://ai.ssc.edu.hk", "X-Title": "learner-import"},
    )
    with urllib.request.urlopen(req, timeout=240) as r:
        return json.load(r)["choices"][0]["message"]["content"]


def parse(text):
    text = text.strip()
    text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.M).strip()
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < 0:
        raise ValueError("no json object in reply")
    return json.loads(text[start:end + 1])


def main():
    pdf, outdir = sys.argv[1], sys.argv[2]
    first = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    last = int(sys.argv[4]) if len(sys.argv) > 4 else 10 ** 6
    os.makedirs(outdir, exist_ok=True)
    pngdir = os.path.join(outdir, "png")
    os.makedirs(pngdir, exist_ok=True)

    subprocess.run(["pdftoppm", "-r", "170", "-png", "-f", str(first), "-l", str(last),
                    pdf, os.path.join(pngdir, "p")], check=True)

    pages = sorted(p for p in os.listdir(pngdir) if p.endswith(".png"))

    def work(name):
        n = int(re.search(r"-(\d+)\.png$", name).group(1))
        out = os.path.join(outdir, "page-%03d.json" % n)
        if os.path.exists(out):
            return
        png = os.path.join(pngdir, name)
        for attempt in range(4):
            try:
                data = parse(ocr(png))
                with open(out, "w", encoding="utf8") as fh:
                    json.dump(data, fh, ensure_ascii=False, indent=1)
                qs = data.get("questions") or []
                print("%s -> %d questions" % (name, len(qs)), flush=True)
                return
            except Exception as exc:  # noqa: BLE001
                print("%s attempt %d failed: %s" % (name, attempt + 1, exc), flush=True)
                if attempt == 3:
                    with open(os.path.join(outdir, "failures.log"), "a") as fh:
                        fh.write("%s\t%s\n" % (name, exc))
                time.sleep(3 * (attempt + 1))

    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(work, pages))


if __name__ == "__main__":
    main()
