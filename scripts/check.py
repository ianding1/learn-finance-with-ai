#!/usr/bin/env python3
"""Deterministic consistency checks for the course. Runs in CI on every pull request.

    python3 scripts/check.py                 run all checks (exit 1 on any error)
    python3 scripts/check.py --update-lock   record the current Chinese sources as translated

Requires PyYAML. See CLAUDE.md for what each check enforces and why.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "src/content/docs"
COURSE = ROOT / "course"
LOCK = COURSE / "translation-lock.json"
LANGS = ["zh", "en"]  # zh is the source language (root locale); others live under docs/<lang>/
SOURCE = "zh"

FORBIDDEN_WORDS = ["学员", "教案", "修订记录", "briefing"]

errors: list[str] = []


def err(where: str, msg: str) -> None:
    errors.append(f"{where}: {msg}")


def rel(p: Path) -> str:
    return str(p.relative_to(ROOT))


def load_yaml(p: Path):
    return yaml.safe_load(p.read_text(encoding="utf-8"))


def sha(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:16]


# ---------------------------------------------------------------- data loading

curriculum = load_yaml(COURSE / "curriculum.yaml")
lessons: list[dict] = []
for stage in curriculum["stages"]:
    for l in stage["lessons"]:
        lessons.append({**l, "order": len(lessons)})
by_id = {l["id"]: l for l in lessons}
concepts: dict = load_yaml(COURSE / "concepts.yaml")
widgets: dict = load_yaml(COURSE / "widgets.yaml")
keys = {p.stem: load_yaml(p) for p in sorted((COURSE / "keys").glob("*.yaml"))}


def doc_path(lang: str, slug_path: str) -> Path:
    return DOCS / (slug_path if lang == SOURCE else f"{lang}/{slug_path}")


def source_docs() -> list[Path]:
    """All source-language pages (relative to docs/), excluding other locale folders."""
    out = []
    for p in sorted(DOCS.rglob("*.md*")):
        r = p.relative_to(DOCS)
        if r.parts[0] in LANGS and r.parts[0] != SOURCE:
            continue
        out.append(r)
    return out


def split_frontmatter(text: str) -> tuple[dict, str]:
    if text.startswith("---"):
        end = text.index("\n---", 3)
        return yaml.safe_load(text[3:end]) or {}, text[end + 4 :]
    return {}, text


# ---------------------------------------------------------------- MDX parsing helpers

MATH = re.compile(r"\$\$([\s\S]+?)\$\$|(?<![\\$])\$([^$\n]+?)\$")
TAG = re.compile(r"<([A-Z][A-Za-z]*)\b([^>]*?)/?>")
ATTR = re.compile(r'(\w+)=(?:"([^"]*)"|\{([^}]*)\})')
HEADING = re.compile(r"^(#{2,4})\s+(.*?)\s*$", re.M)
HEADING_ID = re.compile(r"\[#([a-z0-9][a-z0-9-]*)\]$")
TEXT_ATTRS = {"title", "observe"}


def body_of(text: str) -> str:
    _, body = split_frontmatter(text)
    return "\n".join(line for line in body.split("\n") if not line.startswith("import "))


def strip_code(body: str) -> str:
    return re.sub(r"```[\s\S]*?```", "", body)


def math_list(body: str) -> list[str]:
    return sorted((m.group(1) or m.group(2)).strip() for m in MATH.finditer(strip_code(body)))


def tags(body: str) -> list[tuple[str, dict]]:
    out = []
    for m in TAG.finditer(strip_code(body)):
        attrs = {a.group(1): a.group(2) if a.group(2) is not None else a.group(3) for a in ATTR.finditer(m.group(2))}
        out.append((m.group(1), attrs))
    return out


def heading_ids(body: str, levels=(2, 3, 4)) -> list[str]:
    ids = []
    for m in HEADING.finditer(strip_code(body)):
        if len(m.group(1)) in levels:
            hm = HEADING_ID.search(m.group(2))
            if hm:
                ids.append(hm.group(1))
    return ids


def prose_only(body: str) -> str:
    """Text a reader sees, minus math, code, tags and table rows (for the plain-reference lint)."""
    s = strip_code(body)
    s = MATH.sub(" ", s)
    s = TAG.sub(" ", s)
    s = re.sub(r"</[A-Za-z]+>", " ", s)
    return s


# ---------------------------------------------------------------- 1. curriculum

def check_curriculum():
    seen_ids, seen_slugs = set(), set()
    for l in lessons:
        where = f"course/curriculum.yaml [{l['id']}]"
        if l["id"] in seen_ids:
            err(where, "duplicate lesson id")
        if l["slug"] in seen_slugs:
            err(where, "duplicate slug")
        seen_ids.add(l["id"])
        seen_slugs.add(l["slug"])
        for lang in LANGS:
            if not l.get("title", {}).get(lang):
                err(where, f"missing title.{lang}")
        if l.get("published"):
            for lang in LANGS:
                if not l.get("summary", {}).get(lang):
                    err(where, f"published lesson needs summary.{lang}")
            for f in ("introduces", "uses"):
                if f not in l:
                    err(where, f"published lesson needs '{f}' (use [] if empty)")
            for lang in LANGS:
                p = doc_path(lang, f"lessons/{l['slug']}.mdx")
                if not p.exists():
                    err(where, f"published but {rel(p)} does not exist")
                    continue
                fm, _ = split_frontmatter(p.read_text(encoding="utf-8"))
                if str(fm.get("lesson")) != l["id"]:
                    err(rel(p), f"frontmatter lesson must be \"{l['id']}\"")
    # every lesson page must be a published curriculum entry
    published = {l["slug"] for l in lessons if l.get("published")}
    for lang in LANGS:
        folder = doc_path(lang, "lessons")
        for p in sorted(folder.glob("*.md*")) if folder.exists() else []:
            if p.stem not in published:
                err(rel(p), "lesson page is not marked published in course/curriculum.yaml")


# ---------------------------------------------------------------- 2. concepts and concept order

def order_of(lesson_id: str) -> int:
    return -1 if lesson_id == "prerequisite" else by_id[lesson_id]["order"]


def check_concepts():
    for cid, c in concepts.items():
        where = f"course/concepts.yaml [{cid}]"
        if c.get("defined_in") != "prerequisite" and c.get("defined_in") not in by_id:
            err(where, f"defined_in '{c.get('defined_in')}' is not a lesson id or 'prerequisite'")
        for lang in LANGS:
            if not c.get(lang):
                err(where, f"missing canonical term '{lang}'")

    for l in lessons:
        if not l.get("published"):
            continue
        where = f"course/curriculum.yaml [{l['id']}]"
        for cid in l.get("introduces", []):
            if cid not in concepts:
                err(where, f"introduces unknown concept '{cid}'")
            elif concepts[cid]["defined_in"] != l["id"]:
                err(where, f"introduces '{cid}' but concepts.yaml says it is defined in {concepts[cid]['defined_in']}")
        for cid in l.get("uses", []):
            if cid not in concepts:
                err(where, f"uses unknown concept '{cid}'")
            elif order_of(concepts[cid]["defined_in"]) >= l["order"]:
                err(where, f"uses '{cid}', which is only taught in {concepts[cid]['defined_in']} (not earlier)")
        owned = {cid for cid, c in concepts.items() if c["defined_in"] == l["id"]}
        missing = owned - set(l.get("introduces", []))
        if missing:
            err(where, f"concepts defined in this lesson but not listed in introduces: {sorted(missing)}")

        for lang in LANGS:
            p = doc_path(lang, f"lessons/{l['slug']}.mdx")
            if not p.exists():
                continue
            text = p.read_text(encoding="utf-8")
            defs = re.findall(r'<Def id="([^"]+)">([\s\S]*?)</Def>', text)
            ids = [d[0] for d in defs]
            if sorted(ids) != sorted(set(ids)):
                err(rel(p), "a concept is defined with <Def> more than once")
            if set(ids) != set(l.get("introduces", [])):
                err(rel(p), f"<Def> ids {sorted(set(ids))} must equal introduces {sorted(l.get('introduces', []))}")
            for cid, term in defs:
                if cid in concepts and term.strip().lower() != concepts[cid][lang].lower():
                    err(rel(p), f"<Def id=\"{cid}\"> text '{term.strip()}' must be the canonical term '{concepts[cid][lang]}'")


# ---------------------------------------------------------------- 3. answer keys

def walk_bilingual(node, path: str, fn):
    """Call fn(path, node) for every mapping that has a 'zh' key."""
    if isinstance(node, dict):
        if SOURCE in node:
            fn(path, node)
        for k, v in node.items():
            if k not in LANGS:
                walk_bilingual(v, f"{path}.{k}" if path else str(k), fn)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            label = v.get("id", i) if isinstance(v, dict) else i
            walk_bilingual(v, f"{path}[{label}]", fn)


def check_bilingual(file: str, data):
    def fn(path, node):
        src = node[SOURCE]
        for lang in LANGS:
            v = node.get(lang)
            if v in (None, "", []):
                err(file, f"{path}: missing '{lang}'")
            elif type(v) is not type(src):
                err(file, f"{path}: '{lang}' has a different type from '{SOURCE}'")
            elif isinstance(src, list) and len(v) != len(src):
                err(file, f"{path}: '{lang}' has {len(v)} items, '{SOURCE}' has {len(src)}")

    walk_bilingual(data, "", fn)


def section_of_tags(body: str) -> dict[str, str]:
    """Map each <Check id> to the id of the h2 section that contains it."""
    out, current = {}, ""
    for line in strip_code(body).split("\n"):
        hm = re.match(r"^##\s+.*\[#([a-z0-9-]+)\]\s*$", line)
        if hm:
            current = hm.group(1)
        for cm in re.finditer(r'<Check id="([^"]+)"', line):
            out[cm.group(1)] = current
    return out


def check_keys():
    for lesson_id, key in keys.items():
        file = f"course/keys/{lesson_id}.yaml"
        if lesson_id not in by_id:
            err(file, "no such lesson in curriculum.yaml")
            continue
        l = by_id[lesson_id]
        if str(key.get("lesson")) != lesson_id:
            err(file, f"'lesson' must be \"{lesson_id}\"")
        for f in ("context", "common_errors", "questions"):
            if f not in key:
                err(file, f"missing '{f}'")
        check_bilingual(file, key)
        qids = [q["id"] for q in key.get("questions", [])]
        if len(qids) != len(set(qids)):
            err(file, "duplicate question ids")
        for n, c in enumerate(key.get("context", [])):
            where = f"{file} context[{n}]"
            if not isinstance(c, dict):
                err(where, "each context item must be a mapping with zh/en and optional concepts/questions")
                continue
            for cid in c.get("concepts", []):
                if cid not in concepts:
                    err(where, f"unknown concept '{cid}'")
                elif order_of(concepts[cid]["defined_in"]) > l["order"]:
                    err(where, f"concept '{cid}' is only taught in {concepts[cid]['defined_in']}")
            for qid in c.get("questions", []):
                if qid not in qids:
                    err(where, f"unknown question '{qid}'")
        for n, e in enumerate(key.get("common_errors", [])):
            where = f"{file} common_errors[{n}]"
            if not isinstance(e, dict) or not e.get("questions"):
                err(where, "each common error needs 'questions' (the questions it is relevant to) and zh/en")
                continue
            for qid in e["questions"]:
                if qid not in qids:
                    err(where, f"unknown question '{qid}'")
        for q in key.get("questions", []):
            where = f"{file} [{q['id']}]"
            if q.get("kind") not in ("review", "check", "quiz"):
                err(where, "kind must be review, check or quiz")
            if not isinstance(q.get("points"), (int, float)) or q["points"] <= 0:
                err(where, "points must be a positive number")
            for f in ("question", "answer", "rubric"):
                if f not in q:
                    err(where, f"missing '{f}'")
            if not q.get("concepts"):
                err(where, "concepts must not be empty")
            for cid in q.get("concepts", []):
                if cid not in concepts:
                    err(where, f"unknown concept '{cid}'")
                elif order_of(concepts[cid]["defined_in"]) > l["order"]:
                    err(where, f"tests concept '{cid}', which is only taught in {concepts[cid]['defined_in']}")
            if q.get("kind") in ("review", "check") and not q.get("section"):
                err(where, "review/check questions need 'section' (the h2 id where the question appears)")
            if q.get("kind") == "review":
                older = [c for c in q.get("concepts", []) if c in concepts and order_of(concepts[c]["defined_in"]) >= l["order"]]
                if older:
                    err(where, f"review questions must test earlier lessons; {older} are not from earlier lessons")

        if not l.get("published"):
            continue
        for lang in LANGS:
            p = doc_path(lang, f"lessons/{l['slug']}.mdx")
            if not p.exists():
                continue
            body = body_of(p.read_text(encoding="utf-8"))
            used = [a.get("id") for name, a in tags(body) if name == "Check"]
            for qid in used:
                if used.count(qid) > 1:
                    err(rel(p), f"<Check id=\"{qid}\"> appears more than once")
                q = next((x for x in key["questions"] if x["id"] == qid), None)
                if q is None:
                    err(rel(p), f"<Check id=\"{qid}\"> has no entry in {file}")
                elif q["kind"] == "quiz":
                    err(rel(p), f"<Check id=\"{qid}\"> is a quiz question; quiz questions are shown by <Quiz />")
            for q in key["questions"]:
                if q["kind"] != "quiz" and q["id"] not in used:
                    err(rel(p), f"question {q['id']} in {file} is never shown (add <Check id=\"{q['id']}\" />)")
            has_checks = any(q["kind"] != "quiz" for q in key["questions"])
            n_all = sum(1 for name, _ in tags(body) if name == "CheckAll")
            if has_checks and n_all != 1:
                err(rel(p), "the lesson has review/check questions, so the page must contain <CheckAll /> exactly once")
            has_quiz = any(q["kind"] == "quiz" for q in key["questions"])
            n_quiz = sum(1 for name, _ in tags(body) if name == "Quiz")
            if has_quiz and n_quiz != 1:
                err(rel(p), "the lesson has quiz questions, so the page must contain <Quiz /> exactly once")
            sections = section_of_tags(body)
            for q in key["questions"]:
                if q["kind"] != "quiz" and q["id"] in sections and q.get("section") != sections[q["id"]]:
                    err(rel(p), f"{q['id']} is shown in section '{sections[q['id']]}' but its key says section '{q.get('section')}'")


# ---------------------------------------------------------------- 4. references

def lesson_targets(l: dict) -> dict:
    """Anchors available in a published lesson: heading ids, figure ids, question ids."""
    p = doc_path(SOURCE, f"lessons/{l['slug']}.mdx")
    if not l.get("published") or not p.exists():
        return {"sec": set(), "fig": set(), "check": set()}
    body = body_of(p.read_text(encoding="utf-8"))
    figs = {a.get("id") for name, a in tags(body) if name == "Figure"}
    qs = {q["id"] for q in keys.get(l["id"], {}).get("questions", [])}
    return {"sec": set(heading_ids(body)), "fig": figs, "check": qs}


def check_ref(where: str, target: dict, current: str | None):
    if target.get("concept"):
        if target["concept"] not in concepts:
            err(where, f"reference to unknown concept '{target['concept']}'")
        return
    lid = target.get("lesson") or current
    if not lid:
        err(where, "reference needs a lesson")
        return
    if lid not in by_id:
        err(where, f"reference to unknown lesson '{lid}'")
        return
    l = by_id[lid]
    anchors = lesson_targets(l)
    for kind in ("sec", "fig", "check"):
        if target.get(kind):
            if not l.get("published"):
                err(where, f"{kind} reference into unpublished lesson {lid}")
            elif target[kind] not in anchors[kind]:
                err(where, f"{kind} '{target[kind]}' does not exist in lesson {lid}")


def parse_token(tok: str) -> dict:
    if tok.startswith("concept:"):
        return {"concept": tok[8:]}
    if tok.startswith("check:"):
        return {"check": tok[6:]}
    if tok.startswith("fig:"):
        return {"fig": tok[4:]}
    lesson_id, _, sec = tok.partition("#")
    return {"lesson": lesson_id, "sec": sec or None}


def all_strings(node):
    if isinstance(node, str):
        yield node
    elif isinstance(node, dict):
        for v in node.values():
            yield from all_strings(v)
    elif isinstance(node, list):
        for v in node:
            yield from all_strings(v)


def check_references():
    for lang in LANGS:
        for r in source_docs():
            p = doc_path(lang, str(r))
            if not p.exists():
                continue
            text = p.read_text(encoding="utf-8")
            fm, _ = split_frontmatter(text)
            current = str(fm["lesson"]) if fm.get("lesson") else None
            body = body_of(text)
            for name, a in tags(body):
                if name == "Ref":
                    target = {k: a.get(k) for k in ("lesson", "sec", "fig", "check", "concept") if a.get(k)}
                    check_ref(rel(p), target, current)
            for tok in re.findall(r"\[\[([^\]]+)\]\]", body):
                check_ref(rel(p), parse_token(tok), current)
    for lesson_id, key in keys.items():
        for s in all_strings(key):
            for tok in re.findall(r"\[\[([^\]]+)\]\]", s):
                check_ref(f"course/keys/{lesson_id}.yaml", parse_token(tok), lesson_id)


# ---------------------------------------------------------------- 5. plain-text reference lint

LESSON_IDS = {l["id"] for l in lessons}
PLAIN_PATTERNS = [
    (re.compile(r"[（(]\s*(?:见|参见|see\s+)?(\d+\.\d+)\s*[）)]", re.I), "lesson number in parentheses"),
    (re.compile(r"(?:见|参见|详见|参考)\s*(?:第\s*)?(\d+\.\d+)"), "'见 X.Y'"),
    (re.compile(r"第\s*(\d+(?:\.\d+)?)\s*(?:课|段|节)"), "'第 N 课/段/节'"),
    (re.compile(r"(?:测验)?第\s*(\d+)\s*题"), "'第 N 题'"),
    (re.compile(r"(?:检查题|复习题)\s*([A-Z]\d+)"), "question label"),
    (re.compile(r"\b(?:see|lesson|section|step)\s+(\d+\.\d+)\b", re.I), "'see/lesson X.Y'"),
    (re.compile(r"\bquestion\s+(\d+)\b", re.I), "'question N'"),
    (re.compile(r"\b(?:check|review)\s+([A-Z]\d+)\b"), "question label"),
    (re.compile(r"(?:图|\bFigure)\s*(\d+-\d+)"), "figure number"),
]


def lint_plain(where: str, text: str):
    for line in text.split("\n"):
        if line.lstrip().startswith("|"):
            continue
        for pat, what in PLAIN_PATTERNS:
            for m in pat.finditer(line):
                num = m.group(1)
                if "." in num and num not in LESSON_IDS:
                    continue  # a decimal number such as a probability, not a lesson id
                err(where, f"plain-text reference ({what}): '{m.group(0).strip()}'. Use <Ref .../> or [[...]] instead")


def check_plain_references():
    for lang in LANGS:
        for r in source_docs():
            p = doc_path(lang, str(r))
            if p.exists():
                lint_plain(rel(p), prose_only(body_of(p.read_text(encoding="utf-8"))))
    for lesson_id, key in keys.items():
        for s in all_strings(key):
            lint_plain(f"course/keys/{lesson_id}.yaml", MATH.sub(" ", s))


# ---------------------------------------------------------------- 6. headings and translation parity

def check_structure():
    for r in source_docs():
        is_lesson = r.parts[0] == "lessons"
        versions = {}
        for lang in LANGS:
            p = doc_path(lang, str(r))
            if not p.exists():
                err(rel(doc_path(SOURCE, str(r))), f"missing '{lang}' version {rel(p)}")
                continue
            body = body_of(p.read_text(encoding="utf-8"))
            versions[lang] = (p, body)
            if is_lesson:
                for m in HEADING.finditer(strip_code(body)):
                    if len(m.group(1)) == 2 and not HEADING_ID.search(m.group(2)):
                        err(rel(p), f"h2 '{m.group(2)}' needs an explicit id, e.g. '## Title [#my-id]'")
            ids = heading_ids(body)
            dup = {i for i in ids if ids.count(i) > 1}
            if dup:
                err(rel(p), f"duplicate heading ids {sorted(dup)}")
        if len(versions) < 2:
            continue
        (sp, sb) = versions[SOURCE]
        for lang, (p, b) in versions.items():
            if lang == SOURCE:
                continue
            if heading_ids(sb) != heading_ids(b):
                err(rel(p), f"heading ids differ from {rel(sp)}: {heading_ids(b)} vs {heading_ids(sb)}")
            sig = lambda body: [(n, tuple(sorted((k, v) for k, v in a.items() if k not in TEXT_ATTRS))) for n, a in tags(body)]
            if sig(sb) != sig(b):
                diff = [x for x in sig(sb) if x not in sig(b)] + [x for x in sig(b) if x not in sig(sb)]
                err(rel(p), f"components or their attributes differ from {rel(sp)} (order matters): {diff[:5] or 'order differs'}")
            ms, mt = math_list(sb), math_list(b)
            if ms != mt:
                only_s = [x for x in ms if x not in mt]
                only_t = [x for x in mt if x not in ms]
                err(rel(p), f"formulas differ from {rel(sp)}. Only in {SOURCE}: {only_s[:3]}; only in {lang}: {only_t[:3]}")
    # pages that exist only in a translation
    for lang in LANGS:
        if lang == SOURCE:
            continue
        folder = DOCS / lang
        for p in sorted(folder.rglob("*.md*")) if folder.exists() else []:
            r = p.relative_to(folder)
            if not (DOCS / r).exists():
                err(rel(p), f"no source page {rel(DOCS / r)}")


# ---------------------------------------------------------------- 7. translation lock

def lock_entries() -> dict[str, str]:
    entries = {}
    for r in source_docs():
        entries[f"src/content/docs/{r}"] = sha((DOCS / r).read_text(encoding="utf-8"))
    files = {"course/curriculum.yaml": curriculum, "course/concepts.yaml": concepts}
    files.update({f"course/keys/{k}.yaml": v for k, v in keys.items()})
    for file, data in files.items():
        def fn(path, node, file=file):
            entries[f"{file}#{path}"] = sha(json.dumps(node[SOURCE], ensure_ascii=False))
        walk_bilingual(data, "", fn)
    return dict(sorted(entries.items()))


def check_lock(update: bool):
    current = lock_entries()
    if update:
        LOCK.write_text(json.dumps(current, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"Updated {rel(LOCK)} ({len(current)} entries).")
        return
    locked = json.loads(LOCK.read_text(encoding="utf-8")) if LOCK.exists() else {}
    for k, h in current.items():
        if k not in locked:
            err(k, "new Chinese source text has no translation record. Write the English version, then run `npm run i18n:lock`")
        elif locked[k] != h:
            err(k, "Chinese source changed after the last translation. Update the English version, then run `npm run i18n:lock`")
    for k in locked:
        if k not in current:
            err(k, "stale entry in translation-lock.json. Run `npm run i18n:lock`")


# ---------------------------------------------------------------- 8. numeric answers

def decimals(s: str) -> int:
    return len(s.split(".")[1]) if "." in s else 0


def check_numbers():
    for lesson_id, key in keys.items():
        file = f"course/keys/{lesson_id}.yaml"
        expected = {f"{q['id']}.{name}": (q, str(v)) for q in key["questions"] for name, v in (q.get("expected") or {}).items()}
        script = COURSE / "verify" / f"{lesson_id}.py"
        if not script.exists():
            if expected:
                err(file, f"has expected values but {rel(script)} does not exist")
            continue
        spec = importlib.util.spec_from_file_location(f"verify_{lesson_id.replace('.', '_')}", script)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        results = mod.results()
        for k in results:
            if k not in expected:
                err(rel(script), f"result '{k}' has no matching 'expected' entry in {file}")
        for k, (q, s) in expected.items():
            if k not in results:
                err(file, f"expected '{k}' is not computed by {rel(script)}")
                continue
            if round(float(results[k]), decimals(s)) != float(s):
                err(file, f"expected {k} = {s}, but {rel(script)} computes {results[k]:.6g}")
            for lang in LANGS:
                ans = q["answer"][lang]
                if s not in ans and s.replace("-", "−") not in ans:
                    err(file, f"{q['id']}: the {lang} answer does not contain the value {s} ({k})")


# ---------------------------------------------------------------- 9. widgets

def check_widgets():
    for wid, w in widgets.items():
        comp = ROOT / w["component"]
        if not comp.exists():
            err("course/widgets.yaml", f"{wid}: component {w['component']} does not exist")
            continue
        src = comp.read_text(encoding="utf-8")
        for name, spec in w.get("params", {}).items():
            m = re.search(r"<input[^>]*data-param=\"%s\"[^>]*>" % re.escape(name), src)
            if not m:
                err(w["component"], f"no slider with data-param=\"{name}\" (registered in widgets.yaml)")
                continue
            tag = m.group(0)
            for attr, field in (("min", "min"), ("max", "max"), ("step", "step"), ("value", "default")):
                am = re.search(r'\b%s="([^"]+)"' % attr, tag)
                if not am or float(am.group(1)) != float(spec[field]):
                    err(w["component"], f"slider '{name}' {attr} does not match widgets.yaml ({spec[field]})")
    for lesson_id, key in keys.items():
        for q in key["questions"]:
            wd = q.get("widget")
            if not wd:
                continue
            where = f"course/keys/{lesson_id}.yaml [{q['id']}]"
            if wd.get("id") not in widgets:
                err(where, f"unknown widget '{wd.get('id')}'")
                continue
            params = widgets[wd["id"]]["params"]
            for name, v in (wd.get("set") or {}).items():
                if name not in params:
                    err(where, f"widget '{wd['id']}' has no parameter '{name}'")
                    continue
                spec = params[name]
                steps = (v - spec["min"]) / spec["step"]
                if not (spec["min"] <= v <= spec["max"]) or abs(steps - round(steps)) > 1e-9:
                    err(where, f"value {name}={v} cannot be set on the slider (range {spec['min']}..{spec['max']}, step {spec['step']})")


# ---------------------------------------------------------------- 10. content lint and prompts

def check_lint():
    files = [doc_path(lang, str(r)) for r in source_docs() for lang in LANGS]
    files += [COURSE / f"keys/{k}.yaml" for k in keys]
    for p in files:
        if not p.exists():
            continue
        text = p.read_text(encoding="utf-8")
        for w in FORBIDDEN_WORDS:
            if w in text:
                err(rel(p), f"contains '{w}': remove private teaching notes before publishing")
    # Chinese text uses Chinese quotation marks. Straight quotes next to Chinese characters
    # are turned into wrongly paired curly quotes by Markdown typography.
    straight = re.compile(r'"(?=[\u4e00-\u9fff])|(?<=[\u4e00-\u9fff\u3002\uff0c\uff1f\uff01])"')
    for r in source_docs():
        p = doc_path(SOURCE, str(r))
        if straight.search(prose_only(body_of(p.read_text(encoding="utf-8")))):
            err(rel(p), 'Chinese text contains straight double quotes ("); use “ and ”')
    for lesson_id, key in keys.items():
        def fn(path, node, lesson_id=lesson_id):
            for s in all_strings(node[SOURCE]):
                if straight.search(s):
                    err(f"course/keys/{lesson_id}.yaml", f'{path}: Chinese text contains straight double quotes ("); use “ and ”')
        walk_bilingual(key, "", fn)
    # Chinese text says 提示词, not "prompt".
    for r in source_docs():
        p = doc_path(SOURCE, str(r))
        if re.search(r"prompt", prose_only(body_of(p.read_text(encoding="utf-8"))), re.I):
            err(rel(p), "Chinese text uses 'prompt'; write 提示词")
    for lesson_id, key in keys.items():
        def fn2(path, node, lesson_id=lesson_id):
            for s in all_strings(node[SOURCE]):
                if re.search(r"prompt", s, re.I):
                    err(f"course/keys/{lesson_id}.yaml", f"{path}: Chinese text uses 'prompt'; write 提示词")
        walk_bilingual(key, "", fn2)
    zh_ui = (ROOT / "src/i18n/ui.ts").read_text(encoding="utf-8").split("const en")[0]
    for m in re.finditer(r"^\s*(\w+): '([^']*)'", zh_ui, re.M):
        if re.search(r"prompt", m.group(2), re.I):
            err("src/i18n/ui.ts", f"Chinese UI string '{m.group(1)}' uses 'prompt'; write 提示词")
    prompts = (ROOT / "src/scripts/prompts.ts").read_text(encoding="utf-8")
    for chunk in prompts.split("export function ")[1:]:
        name = chunk.split("(")[0]
        for lang in ("zh", "en"):
            if f"DISCLAIMER.{lang}" not in chunk:
                err("src/scripts/prompts.ts", f"{name}() does not include DISCLAIMER.{lang}")


# ---------------------------------------------------------------- main

def main():
    update = "--update-lock" in sys.argv
    if update:
        check_lock(update=True)
        return 0
    for fn in (
        check_curriculum,
        check_concepts,
        check_keys,
        check_references,
        check_plain_references,
        check_structure,
        check_numbers,
        check_widgets,
        check_lint,
    ):
        fn()
    check_lock(update=False)
    if errors:
        print(f"{len(errors)} problem(s) found:\n")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
