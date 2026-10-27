#!/usr/bin/env python3
"""Create the Google Scholar citation snapshot used by the website."""

from datetime import datetime, timezone
from html import unescape
import json
import os
from pathlib import Path
import re
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen


SCHOLAR_ID = os.environ.get("GOOGLE_SCHOLAR_ID", "oEvieAoAAAAJ")
PROFILE_URL = (
    "https://scholar.google.com.au/citations"
    f"?hl=en&user={SCHOLAR_ID}&pagesize=100"
)
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "assets/data/google-scholar.json"


def text_only(fragment: str) -> str:
    return unescape(re.sub(r"<[^>]+>", "", fragment)).strip()


request = Request(
    PROFILE_URL,
    headers={
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "Chrome/124 Safari/537.36"
        )
    },
)
with urlopen(request, timeout=30) as response:
    page = response.read().decode("utf-8")

metrics_table = re.search(
    r'<table id="gsc_rsb_st".*?</table>', page, flags=re.DOTALL
)
if not metrics_table:
    raise RuntimeError("Google Scholar metrics table was not found")

metric_rows = re.findall(r"<tr>(.*?)</tr>", metrics_table.group(0), flags=re.DOTALL)
metrics = {}
metric_names = {
    "Citations": "citations",
    "h-index": "h_index",
    "i10-index": "i10_index",
}
for row in metric_rows:
    cells = [
        text_only(cell)
        for cell in re.findall(r"<td[^>]*>(.*?)</td>", row, re.DOTALL)
    ]
    if len(cells) >= 3 and cells[0] in metric_names:
        metrics[metric_names[cells[0]]] = {
            "all": int(cells[1]),
            "since_2021": int(cells[2]),
        }

publications = []
for row in re.findall(r'<tr class="gsc_a_tr">(.*?)</tr>', page, flags=re.DOTALL):
    title_match = re.search(
        r'<a href="([^"]+)" class="gsc_a_at">(.*?)</a>', row, flags=re.DOTALL
    )
    if not title_match:
        continue
    citation_match = re.search(
        r'class="gsc_a_ac[^\"]*"[^>]*>(\d+)</a>', row, flags=re.DOTALL
    )
    year_match = re.search(r'class="gsc_a_h[^\"]*"[^>]*>(\d{4})</span>', row)
    query = parse_qs(urlparse(unescape(title_match.group(1))).query)
    publications.append(
        {
            "title": text_only(title_match.group(2)),
            "citations": int(citation_match.group(1)) if citation_match else 0,
            "year": int(year_match.group(1)) if year_match else None,
            "author_publication_id": query.get("citation_for_view", [""])[0],
        }
    )

if not metrics.get("citations") or not publications:
    raise RuntimeError("Google Scholar returned incomplete profile data")

snapshot = {
    "source": "Google Scholar",
    "profile_url": PROFILE_URL,
    "updated_at": datetime.now(timezone.utc).isoformat(),
    "metrics": metrics,
    "publications": publications,
}
if OUTPUT_PATH.exists():
    previous = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    if (
        previous.get("metrics") == snapshot["metrics"]
        and previous.get("publications") == snapshot["publications"]
    ):
        snapshot["updated_at"] = previous.get("updated_at", snapshot["updated_at"])
OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
OUTPUT_PATH.write_text(
    json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print(
    f"Saved {len(publications)} publications; "
    f"citations={metrics['citations']['all']}, h-index={metrics['h_index']['all']}"
)
