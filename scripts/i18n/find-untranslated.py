#!/usr/bin/env python3
"""Dev helper: lists JSX text/attributes that still look like untranslated English."""
import re, sys
ATTR = re.compile(r'\b(placeholder|aria-label|title|alt|label|text|message)="([^"{}]*[A-Za-z]{3}[^"{}]*)"')
for path in sys.argv[1:]:
    for n, line in enumerate(open(path), 1):
        l = line.rstrip("\n")
        if l.strip().startswith(("//", "*", "/*", "import")) or "className=" in l and not re.search(r'>[^<>{}]*[A-Za-z]{3}[^<>{}]*<', l) and not ATTR.search(l):
            continue
        hits = [m.group(0) for m in ATTR.finditer(l) if m.group(1) not in ("title",) or " " in m.group(2)]
        for m in re.finditer(r'>([^<>{}]*[A-Za-z]{3}[^<>{}]*)<', l):
            if not m.group(1).strip().startswith(("{", "(")):
                hits.append(m.group(1).strip())
        stripped = l.strip()
        if re.match(r"^[A-Z][^<>{}=;]*[a-z][^<>{}=;]*$", stripped) and not stripped.endswith((",", ";", "(")):
            hits.append(stripped)
        # text around an expression: "text {expr} text"
        if re.match(r"^\s*[^<{/\s][^<>]*\{[^}]+\}[^<>]*$", l) and re.search(r"[A-Za-z]{3}", re.sub(r"\{[^}]*\}", "", l)) and "=>" not in l and "t(" not in l and not l.strip().startswith(("return", "const", "if", "case")):
            hits.append(stripped)
        if hits:
            print(f"{path}:{n}: {' | '.join(hits)[:160]}")
