#!/usr/bin/env python3
"""Kiểm chứng cú pháp các file migration PostgreSQL bằng pglast (parser thật của PG).

Tách câu theo dấu ';' ở cấp ngoài cùng, tôn trọng:
  - chuỗi đơn '...' (kể cả escape '' và tiền tố E'...')
  - định danh kép "..."
  - khối dollar-quote $$ ... $$ / $tag$ ... $tag$
  - chú thích -- và /* */

Dùng:  python tools/check_sql.py supabase/migrations
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import pglast

DOLLAR_OPEN = re.compile(r"\$[A-Za-z_0-9]*\$")


def split_statements(sql: str) -> list[str]:
    """Tách text SQL thành danh sách câu, giữ nguyên từng ký tự của câu."""
    out: list[str] = []
    buf: list[str] = []
    i, n = 0, len(sql)

    while i < n:
        ch = sql[i]

        # --- chú thích cuối dòng -------------------------------------
        if ch == "-" and sql[i : i + 2] == "--":
            j = sql.find("\n", i)
            j = n if j == -1 else j
            buf.append(sql[i:j])
            i = j
            continue

        # --- chú thích khối ------------------------------------------
        if ch == "/" and sql[i : i + 2] == "/*":
            depth, j = 1, i + 2
            while j < n and depth:
                if sql[j : j + 2] == "/*":
                    depth += 1
                    j += 2
                elif sql[j : j + 2] == "*/":
                    depth -= 1
                    j += 2
                else:
                    j += 1
            buf.append(sql[i:j])
            i = j
            continue

        # --- chuỗi đơn: NHỚ append cả dấu nháy mở ---------------------
        if ch == "'":
            j = i + 1
            while j < n:
                if sql[j] == "'":
                    if j + 1 < n and sql[j + 1] == "'":   # escape ''
                        j += 2
                        continue
                    j += 1                                # bao gồm dấu đóng
                    break
                j += 1
            buf.append(sql[i:j])
            i = j
            continue

        # --- định danh kép -------------------------------------------
        if ch == '"':
            j = sql.find('"', i + 1)
            j = n if j == -1 else j + 1
            buf.append(sql[i:j])
            i = j
            continue

        # --- dollar-quote: nhảy tới tag đóng cùng tên -----------------
        if ch == "$":
            m = DOLLAR_OPEN.match(sql, i)
            if m:
                tag = m.group(0)
                j = sql.find(tag, i + len(tag))
                if j != -1:
                    end = j + len(tag)
                    buf.append(sql[i:end])
                    i = end
                    continue

        # --- dấu tách câu (chỉ khi ở ngoài mọi vùng dẫn xuất) ---------
        if ch == ";":
            stmt = "".join(buf).strip()
            if stmt:
                out.append(stmt)
            buf = []
            i += 1
            continue

        buf.append(ch)
        i += 1

    tail = "".join(buf).strip()
    if tail:
        out.append(tail)
    return out


def check_plpgsql(statements: list[str]) -> list[str]:
    """Parse thân các hàm plpgsql bằng parser PL/pgSQL thật của PostgreSQL."""
    problems = []
    for stmt in statements:
        if "plpgsql" not in stmt.lower():
            continue
        if not re.search(r"\bcreate\s+(or\s+replace\s+)?function\b", stmt, re.I):
            continue  # khối DO / trigger — parser plpgsql không xử lý
        try:
            pglast.parse_plpgsql(stmt)
        except Exception as exc:
            head = " ".join(stmt.split())[:90]
            problems.append(f"  [plpgsql] {exc.__class__.__name__}: {exc}\n            {head}")
    return problems


def main() -> int:
    target = Path(sys.argv[1] if len(sys.argv) > 1 else "supabase/migrations")
    files = sorted(target.glob("*.sql")) if target.is_dir() else [target]
    if not files:
        print(f"Không tìm thấy file SQL nào tại {target}")
        return 1

    total = 0
    for path in files:
        text = path.read_text(encoding="utf-8")
        statements = split_statements(text)
        errors: list[str] = []

        for number, stmt in enumerate(statements, start=1):
            try:
                pglast.parse_sql(stmt)
            except Exception as exc:
                head = " ".join(stmt.split())[:110]
                errors.append(f"  L{number}: {exc.__class__.__name__}: {exc}\n        {head}")

        errors.extend(check_plpgsql(statements))

        flag = "OK  " if not errors else "FAIL"
        print(f"[{flag}] {path.name}: {len(statements)} câu, {len(errors)} lỗi")
        for e in errors:
            print(e)
        total += len(errors)

    print("-" * 64)
    print("TỔNG CỘNG LỖI:", total)
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
