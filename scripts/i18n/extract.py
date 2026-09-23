#!/usr/bin/env python3
"""Dev helper: collects every English source string the UI translates.
Writes scripts/i18n/keys.json (a sorted list). Sources:
 - literal first arguments of t("…") / translate(l, "…") / <T s="…" />
 - natural-language string props in admin pages (title/text/label/hint)
 - natural-language strings in data modules that are shown through t(var)
"""
import json, re, glob, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
STR = r'"((?:[^"\\\n]|\\.)*)"'
TPL = r'`((?:[^`\\$]|\\.)*)`'
keys = set()

def unescape(s):
    return json.loads('"' + s + '"') if '\\' in s else s

for f in glob.glob(str(ROOT / "src/**/*.ts*"), recursive=True):
    src = open(f, encoding="utf8").read()
    for m in re.finditer(r'(?<![\w.])t\(\s*' + STR, src):
        keys.add(unescape(m.group(1)))
    for m in re.finditer(r'(?<![\w.])t\(\s*' + TPL, src):
        keys.add(m.group(1))
    for m in re.finditer(r'translate\(\s*\w+,\s*' + STR, src):
        keys.add(unescape(m.group(1)))
    for m in re.finditer(r'<T s=' + STR, src):
        keys.add(unescape(m.group(1)))
    if f.endswith(".tsx"):
        for m in re.finditer(r'\b(?:title|text|label|hint|eyebrow|doneTitle|doneText)=' + STR, src):
            keys.add(unescape(m.group(1)))

# Object-literal string values in UI/data modules are rendered through t(value)
SKIP = ("/lib/assistant/", "/lib/server/", "/app/api/", "/lib/i18n/", "/lib/demo/images.ts", "/lib/types.ts")
CLASSY = re.compile(r"(^|\s)(bg|text|px|py|p|m|mx|my|mt|mb|ms|me|w|h|min|max|grid|flex|rounded|border|ring|from|to|via|shadow|font|gap|inset|top|left|right|bottom|z|opacity|hover|sm|md|lg|xl)[-:]")
def natural(v):
    if not re.search(r"[A-Za-z]{2}", v) or CLASSY.search(v): return False
    if re.match(r"^(https?:|/|#|\.|@|mailto:|tel:)", v) or "{" in v and "}" not in v: return False
    if re.fullmatch(r"[a-z0-9_.:/-]+", v): return False  # ids, slugs, keys
    if re.fullmatch(r"[A-Z0-9_]+", v) and len(v) > 3: return False  # env names
    return True
for f in glob.glob(str(ROOT / "src/**/*.ts*"), recursive=True):
    if any(x in f for x in SKIP):
        continue
    src = open(f, encoding="utf8").read()
    for m in re.finditer(r'\b(\w+)\s*:\s*' + STR, src):
        if m.group(1) in ("className", "id", "slug", "href", "src", "icon", "emoji", "color", "accentColor", "method", "type", "kind", "mode", "code", "value", "phone", "email", "image", "heroImage", "cls", "c", "key", "category", "categoryId", "status", "source", "path", "role", "who", "position", "theme"):
            if m.group(1) not in ("who",): continue
        v = unescape(m.group(2))
        if natural(v): keys.add(v)
    for m in re.finditer(r'\b(\w+)\s*:\s*\[((?:\s*' + STR + r'\s*,?)+)\]', src):
        if m.group(1) in ("aliases", "keywords", "practitionerIds", "subsets", "weight", "matcher"):
            continue
        for v in re.findall(STR, m.group(2)):
            v = unescape(v)
            if natural(v): keys.add(v)
    for m in re.finditer(r'\?\s*' + STR + r'\s*:\s*' + STR, src):
        for v in (m.group(1), m.group(2)):
            v = unescape(v)
            if "t(" in src[max(0, m.start()-30):m.start()] and natural(v): keys.add(v)

# Demo catalog tuples: categories ["id", "Name", "emoji"] and services ["cat", "Name", min, price, "emoji", "Description", …]
cat_src = open(ROOT / "src/lib/demo/clinics.ts", encoding="utf8").read()
for m in re.finditer(r'\[\s*"[a-z_]+"\s*,\s*' + STR + r'\s*,\s*"[^"]*"\s*\]', cat_src):
    keys.add(unescape(m.group(1)))
for m in re.finditer(r'\[\s*"[a-z_]+"\s*,\s*' + STR + r'\s*,\s*\d+\s*,\s*\d+\s*,\s*"[^"]*"\s*,\s*' + STR, cat_src):
    keys.add(unescape(m.group(1))); keys.add(unescape(m.group(2)))

keys = sorted(k for k in keys if k and re.search(r"[A-Za-z]{2}", k))
json.dump(keys, open(ROOT / "scripts/i18n/keys.json", "w"), ensure_ascii=False, indent=0)
print(len(keys), "keys")
