#!/usr/bin/env python3
"""Trusted CSV bridge for research admin scripts.
Uses Python's standard-library csv module (RFC-style quoted fields, escaped quotes,
CRLF, UTF-8 and empty values). It never implements CSV tokenization itself.
"""
from __future__ import annotations
import csv
import json
import sys


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("usage: csv-bridge.py <input.csv>")
    path = sys.argv[1]
    with open(path, "r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise SystemExit("csv_header_missing")
        rows = []
        for row in reader:
            rows.append({str(key): ("" if value is None else value) for key, value in row.items() if key is not None})
    json.dump({"headers": reader.fieldnames, "rows": rows}, sys.stdout, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
