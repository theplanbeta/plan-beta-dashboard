#!/usr/bin/env python3
"""
Job scraper for HTML-only sources using LangExtract + Ollama (gemma2:2b).
Extracts structured job listings from web pages and upserts to Postgres.

Usage:
  python3 scripts/scrape-jobs-html.py <url>
  python3 scripts/scrape-jobs-html.py https://www.make-it-in-germany.com/en/working-in-germany/job-listings

Outputs JSON to stdout (for piping) and upserts to the JobPosting table via
the Next.js API when --upsert flag is used.

Requirements:
  pip install langextract
  ollama serve  (with gemma2:2b pulled)
"""

import argparse
import json
import re
import sys
import textwrap
import urllib.request

import langextract as lx


# ── Extraction task definition ────────────────────────────────────────────────

PROMPT = textwrap.dedent("""\
    Extract all job listings from this web page.
    For each job, extract the job title, company name, location (city in Germany),
    and the URL to apply. Extract exactly as written — do not paraphrase.
    If a field is not present, skip it.""")

EXAMPLES = [
    lx.data.ExampleData(
        text="Senior Software Engineer SAP SE Berlin, Germany Apply: https://example.com/apply/123 "
             "Registered Nurse (Krankenpfleger) Charité Hospital Berlin, Germany German B2 required "
             "Apply: https://example.com/apply/456",
        extractions=[
            lx.data.Extraction(
                extraction_class="job",
                extraction_text="Senior Software Engineer",
                attributes={
                    "company": "SAP SE",
                    "location": "Berlin",
                    "apply_url": "https://example.com/apply/123",
                },
            ),
            lx.data.Extraction(
                extraction_class="job",
                extraction_text="Registered Nurse (Krankenpfleger)",
                attributes={
                    "company": "Charité Hospital",
                    "location": "Berlin",
                    "apply_url": "https://example.com/apply/456",
                },
            ),
        ],
    )
]


# ── Profession + German level inference ──────────────────────────────────────


def infer_profession(title: str) -> str:
    t = title.lower()
    if re.search(r"nurs|pflege|krankenschwester", t): return "Nursing"
    if re.search(r"software|developer|devops|frontend|backend|fullstack|data.sci", t): return "IT"
    if re.search(r"engineer|ingenieur|mechanical|electrical|civil", t): return "Engineering"
    if re.search(r"doctor|arzt|physio|therap|medic|health|gesundheit|pharma", t): return "Healthcare"
    if re.search(r"hotel|restaurant|gastro|chef|cook|hospitality", t): return "Hospitality"
    if re.search(r"account|finance|buchhal|steuer|audit", t): return "Accounting"
    if re.search(r"teach|lehrer|tutor|professor|dozent", t): return "Teaching"
    return "Other"


def infer_german_level(text: str) -> str | None:
    t = text.lower()
    for level in ["C2", "C1", "B2", "B1", "A2", "A1"]:
        if level.lower() in t:
            return level
    if "german required" in t or "deutschkenntnisse" in t:
        return "B1"
    if "english only" in t or "no german" in t:
        return "None"
    return None


# ── Fetch HTML and extract ────────────────────────────────────────────────────


def fetch_html(url: str) -> str:
    """Fetch HTML from URL with browser-like headers."""
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def clean_html(html: str) -> str:
    """Strip scripts, styles, nav, footer, SVG, and collapse whitespace.
    Returns a much smaller text payload for the LLM to process."""
    text = html
    # Remove entire blocks of noise
    for pattern in [
        r"<script[\s\S]*?</script>",
        r"<style[\s\S]*?</style>",
        r"<noscript[\s\S]*?</noscript>",
        r"<nav[\s\S]*?</nav>",
        r"<footer[\s\S]*?</footer>",
        r"<header[\s\S]*?</header>",
        r"<svg[\s\S]*?</svg>",
        r"<!--[\s\S]*?-->",
    ]:
        text = re.sub(pattern, " ", text, flags=re.IGNORECASE)
    # Strip all HTML tags but keep text content
    text = re.sub(r"<[^>]+>", " ", text)
    # Decode common HTML entities
    text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    text = text.replace("&nbsp;", " ").replace("&quot;", '"')
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


# Max chars to send to gemma2:2b — tested: 3K works reliably, 6K can fail
MAX_INPUT_CHARS = 4000
# Chunk size for LangExtract — smaller = more reliable with small LLMs
CHUNK_SIZE = 1500


def extract_jobs(url: str, model: str = "gemma2:2b", max_chars: int = MAX_INPUT_CHARS) -> list[dict]:
    """Extract job listings from a URL using LangExtract + Ollama."""
    print(f"[scraper] Fetching {url}...", file=sys.stderr)
    html = fetch_html(url)
    cleaned = clean_html(html)
    truncated = cleaned[:max_chars]
    print(
        f"[scraper] {len(html)} chars HTML → {len(cleaned)} chars clean → "
        f"{len(truncated)} chars sent to {model} (chunk_size={CHUNK_SIZE})",
        file=sys.stderr,
    )

    try:
        result = lx.extract(
            text_or_documents=truncated,
            prompt_description=PROMPT,
            examples=EXAMPLES,
            model_id=model,
            model_url="http://localhost:11434",
            fence_output=False,
            use_schema_constraints=False,
            max_char_buffer=CHUNK_SIZE,
        )
    except Exception as e:
        print(f"[scraper] LangExtract error: {e}", file=sys.stderr)
        # Retry with smaller input on parse failures
        if len(truncated) > 2000:
            print("[scraper] Retrying with smaller input (2000 chars)...", file=sys.stderr)
            try:
                result = lx.extract(
                    text_or_documents=truncated[:2000],
                    prompt_description=PROMPT,
                    examples=EXAMPLES,
                    model_id=model,
                    model_url="http://localhost:11434",
                    fence_output=False,
                    use_schema_constraints=False,
                    max_char_buffer=1000,
                )
            except Exception as e2:
                print(f"[scraper] Retry also failed: {e2}", file=sys.stderr)
                return []
        else:
            return []

    # Parse extractions into structured jobs
    jobs = []
    if not result or not hasattr(result, "extractions"):
        print("[scraper] No extractions returned", file=sys.stderr)
        return jobs

    for ext in result.extractions:
        if ext.extraction_class != "job":
            continue

        title = ext.extraction_text.strip()
        if not title or len(title) > 200:
            continue

        attrs = ext.attributes or {}
        company = attrs.get("company", "Unknown")
        location = attrs.get("location")
        apply_url = attrs.get("apply_url")

        # Skip obvious non-job extractions
        if company and company.lower() in ("none", "null", "n/a"):
            company = "Unknown"

        full_text = f"{title} {company} {location or ''}"

        jobs.append({
            "title": title,
            "company": company,
            "location": location,
            "salaryMin": None,
            "salaryMax": None,
            "currency": "EUR",
            "germanLevel": infer_german_level(full_text),
            "profession": infer_profession(title),
            "jobType": None,
            "requirements": [],
            "applyUrl": apply_url,
            "externalId": f"lx-{hash(title + str(company)) & 0xFFFFFFFF}",
        })

    print(f"[scraper] Extracted {len(jobs)} jobs", file=sys.stderr)
    return jobs


def upsert_to_api(jobs: list[dict], api_base: str, source_id: str, cookie: str):
    """Upsert jobs via the Next.js scrape API — sends pre-extracted jobs."""
    payload = json.dumps({"sourceId": source_id, "jobs": jobs}).encode()
    req = urllib.request.Request(
        f"{api_base}/api/jobs/scrape",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Cookie": cookie,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            print(f"[scraper] Upserted: {result}", file=sys.stderr)
    except Exception as e:
        print(f"[scraper] Upsert failed: {e}", file=sys.stderr)


# ── CLI ───────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Extract jobs from HTML using LangExtract + Ollama")
    parser.add_argument("url", help="URL to scrape")
    parser.add_argument("--model", default="gemma2:2b", help="Ollama model (default: gemma2:2b)")
    parser.add_argument("--max-chars", type=int, default=MAX_INPUT_CHARS, help=f"Max chars to send to LLM (default: {MAX_INPUT_CHARS})")
    parser.add_argument("--upsert", action="store_true", help="Upsert to database via API")
    parser.add_argument("--api-base", default="http://localhost:3000", help="Next.js API base URL")
    parser.add_argument("--source-id", help="JobSource ID for upsert")
    parser.add_argument("--cookie", help="next-auth.session-token cookie value for auth")
    args = parser.parse_args()

    max_chars = args.max_chars
    jobs = extract_jobs(args.url, model=args.model, max_chars=max_chars)

    # Always output JSON to stdout
    print(json.dumps(jobs, indent=2, ensure_ascii=False))

    if args.upsert:
        if not args.source_id or not args.cookie:
            print("[scraper] --source-id and --cookie required for upsert", file=sys.stderr)
            sys.exit(1)
        upsert_to_api(jobs, args.api_base, args.source_id, args.cookie)


if __name__ == "__main__":
    main()
