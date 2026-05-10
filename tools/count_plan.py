#!/usr/bin/env python3
"""
count_plan.py — Vérifie la cohérence du compteur de SVG_PLAN.md.

Compte les `[x]`, `[~]` et `[ ]` du fichier SVG_PLAN.md à la racine,
les regroupe par bloc (A / B / C / D / Z), et compare le total aux
chiffres mentionnés dans la ligne `> **Statut global** : N / M`.

Exit non-zero si le compteur du markdown ne correspond pas au comptage
réel.

Usage :
    python3 tools/count_plan.py
"""

from __future__ import annotations
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PLAN      = REPO_ROOT / "SVG_PLAN.md"

# `- [x] **C13** ...` ou `- [ ] **B07** ...` ou `- [~] **A2** ...`
LINE_RE   = re.compile(r"^\s*-\s*\[([x ~])\]\s+\*\*([A-Z])(\d+)\*\*", re.IGNORECASE)
STATUS_RE = re.compile(r"\*\*Statut global\*\*\s*:\s*(\d+)\s*/\s*(\d+)")


def main() -> int:
    if not PLAN.is_file():
        print(f"erreur: {PLAN} introuvable", file=sys.stderr)
        return 2

    text = PLAN.read_text(encoding="utf-8")

    counts: dict[str, dict[str, int]] = {}  # bloc → {x, ~, ' '}
    for line in text.splitlines():
        m = LINE_RE.match(line)
        if not m:
            continue
        state, bloc, _ = m.groups()
        bucket = counts.setdefault(bloc.upper(), {"x": 0, "~": 0, " ": 0})
        bucket[state.lower()] += 1

    total_x   = sum(c["x"] for c in counts.values())
    total_all = sum(sum(c.values()) for c in counts.values())

    print("Comptage SVG_PLAN.md :\n")
    for bloc in sorted(counts):
        c = counts[bloc]
        n = c["x"] + c["~"] + c[" "]
        print(f"  Bloc {bloc} : {c['x']:>2} ✓  {c['~']:>2} ~  {c[' ']:>2} ☐   ({c['x']}/{n})")
    print(f"\n  TOTAL    : {total_x} / {total_all}")

    m = STATUS_RE.search(text)
    if not m:
        print("\n  ⚠ ligne « Statut global » introuvable.", file=sys.stderr)
        return 1
    decl_x, decl_total = int(m.group(1)), int(m.group(2))
    print(f"  Déclaré  : {decl_x} / {decl_total}")

    drift_x      = decl_x      != total_x
    drift_total  = decl_total  != total_all
    if drift_x or drift_total:
        print("\n  \033[31m✗ DÉRIVE\033[0m :", end=" ")
        msg = []
        if drift_x:     msg.append(f"x déclaré {decl_x} ≠ réel {total_x}")
        if drift_total: msg.append(f"total déclaré {decl_total} ≠ réel {total_all}")
        print(" / ".join(msg))
        return 1

    print("\n  \033[32m✓ cohérent\033[0m")
    return 0


if __name__ == "__main__":
    sys.exit(main())
