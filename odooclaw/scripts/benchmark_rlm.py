#!/usr/bin/env python3
import argparse
import json
import random
import re
import statistics
import time
from dataclasses import dataclass
from typing import Dict, List, Tuple

import requests


PARTNERS = [
    "Acme",
    "Globex",
    "Initech",
    "Umbrella",
    "Soylent",
    "Hooli",
    "Stark",
    "Wayne",
]
TARGET_PARTNERS = {"Acme", "Globex", "Initech"}


@dataclass
class Usage:
    prompt_tokens: int = 0
    completion_tokens: int = 0

    @property
    def total_tokens(self) -> int:
        return self.prompt_tokens + self.completion_tokens


@dataclass
class RunResult:
    mode: str
    size: int
    elapsed_s: float
    predicted_value: float
    expected_value: float
    abs_error: float
    exact_match: bool
    usage: Usage
    cost_usd: float


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Benchmark single-pass vs RLM map-reduce for long-context numeric aggregation"
    )
    parser.add_argument(
        "--api-base",
        required=True,
        help="OpenAI-compatible base URL, e.g. https://api.openai.com/v1",
    )
    parser.add_argument("--api-key", required=True, help="API key")
    parser.add_argument("--model", required=True, help="Model name")
    parser.add_argument(
        "--sizes", nargs="+", type=int, default=[100, 500, 2000], help="Dataset sizes"
    )
    parser.add_argument("--repeats", type=int, default=3, help="Runs per size/mode")
    parser.add_argument(
        "--chunk-size", type=int, default=100, help="Chunk size for map-reduce"
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--timeout", type=int, default=90, help="HTTP timeout seconds")
    parser.add_argument(
        "--input-cost-per-1m", type=float, default=0.0, help="USD per 1M input tokens"
    )
    parser.add_argument(
        "--output-cost-per-1m", type=float, default=0.0, help="USD per 1M output tokens"
    )
    parser.add_argument(
        "--max-completion-tokens", type=int, default=256, help="Max completion tokens"
    )
    parser.add_argument(
        "--temperature", type=float, default=0.0, help="Sampling temperature"
    )
    return parser.parse_args()


def make_records(size: int, seed: int) -> List[Dict]:
    rnd = random.Random(seed + size)
    out = []
    for i in range(size):
        partner = rnd.choice(PARTNERS)
        status = rnd.choices(
            ["overdue", "paid", "draft"], weights=[0.30, 0.55, 0.15], k=1
        )[0]
        amount = round(rnd.uniform(50, 2500), 2)
        due_days = rnd.randint(1, 90) if status == "overdue" else 0
        out.append(
            {
                "id": i + 1,
                "partner": partner,
                "status": status,
                "amount_total": amount,
                "due_days": due_days,
            }
        )
    return out


def expected_overdue_sum(records: List[Dict]) -> float:
    total = 0.0
    for r in records:
        if r["partner"] in TARGET_PARTNERS and r["status"] == "overdue":
            total += float(r["amount_total"])
    return round(total, 2)


def extract_number(text: str) -> float:
    matches = re.findall(r"-?\d+(?:\.\d+)?", text.replace(",", ""))
    if not matches:
        raise ValueError("No numeric value found in model response")
    return float(matches[-1])


def estimate_cost(usage: Usage, in_cost_per_1m: float, out_cost_per_1m: float) -> float:
    return (usage.prompt_tokens / 1_000_000.0) * in_cost_per_1m + (
        usage.completion_tokens / 1_000_000.0
    ) * out_cost_per_1m


def chat_completion(
    session: requests.Session,
    api_base: str,
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    timeout: int,
    max_completion_tokens: int,
    temperature: float,
) -> Tuple[str, Usage]:
    url = api_base.rstrip("/") + "/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_completion_tokens,
    }
    headers = {"Authorization": "Bearer " + api_key, "Content-Type": "application/json"}
    r = session.post(url, headers=headers, json=payload, timeout=timeout)
    r.raise_for_status()
    data = r.json()
    text = data["choices"][0]["message"].get("content", "")
    usage_raw = data.get("usage", {})
    usage = Usage(
        prompt_tokens=int(usage_raw.get("prompt_tokens", 0)),
        completion_tokens=int(usage_raw.get("completion_tokens", 0)),
    )
    return text, usage


def run_single_pass(
    session: requests.Session,
    args: argparse.Namespace,
    records: List[Dict],
    expected: float,
) -> RunResult:
    system_prompt = (
        "You are a precise finance calculator. "
        "Read the JSON records and compute exactly the requested aggregate. "
        "Return ONLY the numeric value, with 2 decimals."
    )
    user_prompt = (
        "Task: Sum amount_total for records where status='overdue' AND partner in "
        f"{sorted(TARGET_PARTNERS)}.\n"
        "Records JSON:\n" + json.dumps(records, ensure_ascii=False)
    )

    t0 = time.perf_counter()
    text, usage = chat_completion(
        session,
        args.api_base,
        args.api_key,
        args.model,
        system_prompt,
        user_prompt,
        args.timeout,
        args.max_completion_tokens,
        args.temperature,
    )
    elapsed = time.perf_counter() - t0
    pred = round(extract_number(text), 2)
    err = abs(pred - expected)
    return RunResult(
        mode="single_pass",
        size=len(records),
        elapsed_s=elapsed,
        predicted_value=pred,
        expected_value=expected,
        abs_error=err,
        exact_match=err < 0.01,
        usage=usage,
        cost_usd=estimate_cost(usage, args.input_cost_per_1m, args.output_cost_per_1m),
    )


def chunks(lst: List[Dict], n: int) -> List[List[Dict]]:
    return [lst[i : i + n] for i in range(0, len(lst), n)]


def run_rlm_map_reduce(
    session: requests.Session,
    args: argparse.Namespace,
    records: List[Dict],
    expected: float,
) -> RunResult:
    system_prompt = (
        "You are a precise finance calculator. "
        "Compute exactly and return ONLY a numeric value with 2 decimals."
    )
    total_usage = Usage()
    partials = []

    t0 = time.perf_counter()
    for idx, chunk in enumerate(chunks(records, max(1, args.chunk_size)), start=1):
        user_prompt = (
            f"Chunk {idx}: Sum amount_total where status='overdue' and partner in {sorted(TARGET_PARTNERS)}.\n"
            "Return ONLY the number.\n"
            "Records JSON:\n" + json.dumps(chunk, ensure_ascii=False)
        )
        text, usage = chat_completion(
            session,
            args.api_base,
            args.api_key,
            args.model,
            system_prompt,
            user_prompt,
            args.timeout,
            args.max_completion_tokens,
            args.temperature,
        )
        total_usage.prompt_tokens += usage.prompt_tokens
        total_usage.completion_tokens += usage.completion_tokens
        partials.append(round(extract_number(text), 2))

    reduce_prompt = (
        "You are in Reduce step. Sum all partial values and return ONLY the final number with 2 decimals.\n"
        "Partials JSON: " + json.dumps(partials)
    )
    text, usage = chat_completion(
        session,
        args.api_base,
        args.api_key,
        args.model,
        system_prompt,
        reduce_prompt,
        args.timeout,
        args.max_completion_tokens,
        args.temperature,
    )
    total_usage.prompt_tokens += usage.prompt_tokens
    total_usage.completion_tokens += usage.completion_tokens

    elapsed = time.perf_counter() - t0
    pred = round(extract_number(text), 2)
    err = abs(pred - expected)
    return RunResult(
        mode="rlm_map_reduce",
        size=len(records),
        elapsed_s=elapsed,
        predicted_value=pred,
        expected_value=expected,
        abs_error=err,
        exact_match=err < 0.01,
        usage=total_usage,
        cost_usd=estimate_cost(
            total_usage, args.input_cost_per_1m, args.output_cost_per_1m
        ),
    )


def summarize(results: List[RunResult]) -> List[Dict]:
    groups: Dict[Tuple[str, int], List[RunResult]] = {}
    for r in results:
        groups.setdefault((r.mode, r.size), []).append(r)

    summary = []
    for (mode, size), rows in sorted(groups.items(), key=lambda x: (x[0][1], x[0][0])):
        summary.append(
            {
                "mode": mode,
                "size": size,
                "runs": len(rows),
                "exact_match_rate": round(
                    sum(1 for x in rows if x.exact_match) / len(rows), 3
                ),
                "mean_abs_error": round(statistics.mean(x.abs_error for x in rows), 4),
                "mean_latency_s": round(statistics.mean(x.elapsed_s for x in rows), 3),
                "mean_prompt_tokens": int(
                    statistics.mean(x.usage.prompt_tokens for x in rows)
                ),
                "mean_completion_tokens": int(
                    statistics.mean(x.usage.completion_tokens for x in rows)
                ),
                "mean_total_tokens": int(
                    statistics.mean(x.usage.total_tokens for x in rows)
                ),
                "mean_cost_usd": round(statistics.mean(x.cost_usd for x in rows), 6),
            }
        )
    return summary


def main() -> None:
    args = parse_args()
    session = requests.Session()
    all_results: List[RunResult] = []

    for size in args.sizes:
        records = make_records(size=size, seed=args.seed)
        expected = expected_overdue_sum(records)
        for _ in range(args.repeats):
            all_results.append(run_single_pass(session, args, records, expected))
            all_results.append(run_rlm_map_reduce(session, args, records, expected))

    summary = summarize(all_results)
    print(json.dumps({"summary": summary}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
