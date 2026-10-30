#!/usr/bin/env python3
"""Deterministic consistency checks for the course. Runs in CI on every pull request.

    python3 scripts/check.py                 run all checks (exit 1 on any error)
    python3 scripts/check.py --update-lock   record that all language versions match each other

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
# All languages have the same status. Pages live in docs/<code>/, YAML text under the key <code>.
LANG_CONFIG = json.loads((ROOT / "src/i18n/languages.json").read_text(encoding="utf-8"))
LANGS = [l["code"] for l in LANG_CONFIG["languages"]]
DEFAULT = LANG_CONFIG["default"]
# Structure and formulas of every language version are compared with this one (only for messages).
REF = DEFAULT if DEFAULT in LANGS else LANGS[0]
CHINESE = [l for l in LANGS if l.startswith("zh")]

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
    return DOCS / lang / slug_path


def source_docs() -> list[Path]:
    """Every page (relative to docs/<lang>/) that exists in at least one language."""
    out = set()
    for lang in LANGS:
        folder = DOCS / lang
        out |= {p.relative_to(folder) for p in folder.rglob("*.md*")} if folder.exists() else set()
    for p in DOCS.iterdir():
        if p.name not in LANGS:
            err(rel(p), f"src/content/docs/ may only contain language folders {LANGS} (see src/i18n/languages.json)")
    return sorted(out)


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
    """Call fn(path, node) for every mapping that holds text in one or more languages."""
    if isinstance(node, dict):
        if any(lang in node for lang in LANGS):
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
        present = [lang for lang in LANGS if node.get(lang) not in (None, "", [])]
        for lang in LANGS:
            if lang not in present:
                err(file, f"{path}: missing '{lang}'")
        if not present:
            return
        ref = present[0]
        src = node[ref]
        for lang in present[1:]:
            v = node[lang]
            if type(v) is not type(src):
                err(file, f"{path}: '{lang}' has a different type from '{ref}'")
            elif isinstance(src, list) and len(v) != len(src):
                err(file, f"{path}: '{lang}' has {len(v)} items, '{ref}' has {len(src)}")

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
                err(where, "each context item must be a mapping with text in every language and optional concepts/questions")
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
                err(where, "each common error needs 'questions' (the questions it is relevant to) and text in every language")
                continue
            for qid in e["questions"]:
                if qid not in qids:
                    err(where, f"unknown question '{qid}'")
        for q in key.get("questions", []):
            where = f"{file} [{q['id']}]"
            kind = q.get("kind")
            if l.get("exam"):
                if kind != "quiz":
                    err(where, "questions of a quiz must have kind: quiz")
            elif kind not in ("check", "exercise"):
                err(where, "kind must be check or exercise (quiz questions belong to a quiz)")
            if kind == "quiz":
                if not isinstance(q.get("points"), (int, float)) or q["points"] <= 0:
                    err(where, "quiz questions need positive 'points'")
                if q.get("part") not in ("judge", "problem"):
                    err(where, "quiz questions need part: judge or problem")
                # Difficulty is judged per part: easy_points / hard_points are the points of the parts
                # with a difficulty score of at most 2 / at least 6.
                pts = q.get("points") or 0
                ep, hp = q.get("easy_points"), q.get("hard_points")
                for name, v in (("easy_points", ep), ("hard_points", hp)):
                    if not isinstance(v, (int, float)) or v < 0 or v > pts:
                        err(where, f"quiz questions need {name} between 0 and their points")
                if isinstance(ep, (int, float)) and isinstance(hp, (int, float)) and ep + hp > pts:
                    err(where, "easy_points + hard_points exceed the question's points")
            # Lesson questions (check questions and exercises) are reviewed without scores; only the
            # quizzes after a group of lessons are scored, and they are not in lesson key files.
            if kind in ("check", "exercise"):
                if "points" in q:
                    err(where, f"{kind} questions are not scored: remove 'points'")
                for lang in LANGS:
                    for r in (q.get("rubric") or {}).get(lang, []):
                        if re.search(r"\d+\s*分|\d+\s*points?\b|partial credit|部分分", r):
                            err(where, f"{kind} rubric ({lang}) mentions points: '{r[:40]}'")
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
            if q.get("kind") == "check" and not q.get("section"):
                err(where, "check questions need 'section' (the h2 id where the question appears)")

        if l.get("exam"):
            total = sum(q.get("points") or 0 for q in key.get("questions", []))
            if total != 100:
                err(file, f"quiz points add up to {total}, not 100")
            easy = sum(q.get("easy_points") or 0 for q in key.get("questions", []))
            hard = sum(q.get("hard_points") or 0 for q in key.get("questions", []))
            if easy > 20:
                err(file, f"easy parts (difficulty score 2 or less) add up to {easy} points; at most 20 are allowed")
            if hard < 10:
                err(file, f"hard parts (difficulty score 6 or more) add up to {hard} points; at least 10 are needed")
        if not l.get("published"):
            continue
        for lang in LANGS:
            p = doc_path(lang, f"lessons/{l['slug']}.mdx")
            if not p.exists():
                continue
            body = body_of(p.read_text(encoding="utf-8"))
            if l.get("exam"):
                if sum(1 for name, _ in tags(body) if name == "Quiz") != 1:
                    err(rel(p), "a quiz page must contain <Quiz /> exactly once")
                if any(name in ("Check", "CheckAll", "Exercises") for name, _ in tags(body)):
                    err(rel(p), "a quiz page shows its questions with <Quiz /> only")
                continue
            used = [a.get("id") for name, a in tags(body) if name == "Check"]
            for qid in used:
                if used.count(qid) > 1:
                    err(rel(p), f"<Check id=\"{qid}\"> appears more than once")
                q = next((x for x in key["questions"] if x["id"] == qid), None)
                if q is None:
                    err(rel(p), f"<Check id=\"{qid}\"> has no entry in {file}")
                elif q["kind"] != "check":
                    err(rel(p), f"<Check id=\"{qid}\"> is not a check question")
            for q in key["questions"]:
                if q["kind"] == "check" and q["id"] not in used:
                    err(rel(p), f"question {q['id']} in {file} is never shown (add <Check id=\"{q['id']}\" />)")
            has_checks = any(q["kind"] == "check" for q in key["questions"])
            n_all = sum(1 for name, _ in tags(body) if name == "CheckAll")
            if has_checks and n_all != 1:
                err(rel(p), "the lesson has check questions, so the page must contain <CheckAll /> exactly once")
            has_ex = any(q["kind"] == "exercise" for q in key["questions"])
            n_ex = sum(1 for name, _ in tags(body) if name == "Exercises")
            if has_ex and n_ex != 1:
                err(rel(p), "the lesson has exercises, so the page must contain <Exercises /> exactly once")
            sections = section_of_tags(body)
            for q in key["questions"]:
                if q["kind"] == "check" and q["id"] in sections and q.get("section") != sections[q["id"]]:
                    err(rel(p), f"{q['id']} is shown in section '{sections[q['id']]}' but its key says section '{q.get('section')}'")


# ---------------------------------------------------------------- 4. references

def lesson_targets(l: dict) -> dict:
    """Anchors available in a published lesson: heading ids, figure ids, question ids."""
    p = doc_path(REF, f"lessons/{l['slug']}.mdx")
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
    (re.compile(r"(?:随堂题|辨析题|检查题|复习题)\s*([A-Z]\d+)"), "question label"),
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
    """Every page exists in every language, with the same heading ids, components and formulas."""
    for r in source_docs():
        is_lesson = r.parts[0] == "lessons"
        versions = {}
        for lang in LANGS:
            p = doc_path(lang, str(r))
            if not p.exists():
                err(rel(p), f"missing: the page exists in another language but not in '{lang}'")
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
        ref = REF if REF in versions else next(iter(versions))
        (sp, sb) = versions[ref]
        sig = lambda body: [(n, tuple(sorted((k, v) for k, v in a.items() if k not in TEXT_ATTRS))) for n, a in tags(body)]
        for lang, (p, b) in versions.items():
            if lang == ref:
                continue
            if heading_ids(sb) != heading_ids(b):
                err(rel(p), f"heading ids differ from {rel(sp)}: {heading_ids(b)} vs {heading_ids(sb)}")
            if sig(sb) != sig(b):
                diff = [x for x in sig(sb) if x not in sig(b)] + [x for x in sig(b) if x not in sig(sb)]
                err(rel(p), f"components or their attributes differ from {rel(sp)} (order matters): {diff[:5] or 'order differs'}")
            ms, mt = math_list(sb), math_list(b)
            if ms != mt:
                only_s = [x for x in ms if x not in mt]
                only_t = [x for x in mt if x not in ms]
                err(rel(p), f"formulas differ from {rel(sp)}. Only in {ref}: {only_s[:3]}; only in {lang}: {only_t[:3]}")


# ---------------------------------------------------------------- 7. translation lock

def lock_entries() -> dict[str, dict[str, str]]:
    """Hash of every language version of every translatable unit: a page, or one text field in YAML."""
    entries: dict[str, dict[str, str]] = {}
    for r in source_docs():
        entries[f"src/content/docs/<lang>/{r}"] = {
            lang: sha(doc_path(lang, str(r)).read_text(encoding="utf-8")) for lang in LANGS if doc_path(lang, str(r)).exists()
        }
    files = {"course/curriculum.yaml": curriculum, "course/concepts.yaml": concepts}
    files.update({f"course/keys/{k}.yaml": v for k, v in keys.items()})
    for file, data in files.items():
        def fn(path, node, file=file):
            entries[f"{file}#{path}"] = {lang: sha(json.dumps(node[lang], ensure_ascii=False)) for lang in LANGS if lang in node}
        walk_bilingual(data, "", fn)
    return dict(sorted(entries.items()))


def check_lock(update: bool):
    """The lock records the hashes of all language versions at the moment they were last in sync.

    When one language changes and the others do not, the others need to be updated. Once every
    version says the same thing again, `npm run i18n:lock` records the new state.
    """
    current = lock_entries()
    if update:
        LOCK.write_text(json.dumps(current, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"Updated {rel(LOCK)} ({len(current)} entries, languages {LANGS}).")
        return
    locked = json.loads(LOCK.read_text(encoding="utf-8")) if LOCK.exists() else {}
    hint = "When all language versions say the same thing, run `npm run i18n:lock`"
    for k, hashes in current.items():
        old = locked.get(k)
        if not isinstance(old, dict) or set(old) != set(hashes):
            err(k, f"not recorded for every language in translation-lock.json. {hint}")
            continue
        changed = [lang for lang in LANGS if lang in hashes and hashes[lang] != old[lang]]
        if not changed:
            continue
        others = [lang for lang in LANGS if lang in hashes and lang not in changed]
        if others:
            err(k, f"changed in {changed} since the languages were last in sync; update {others} to match. {hint}")
        else:
            err(k, f"every language version changed. {hint}")
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
            # The answer may write the value with thousands separators ("2,997.75").
            forms = {s, s.replace("-", "−")}
            if abs(float(s)) >= 1000:
                grouped = f"{float(s):,.{decimals(s)}f}"
                forms |= {grouped, grouped.replace("-", "−")}
                # inside LaTeX the separator is written {,}
                forms |= {f.replace(",", "{,}") for f in list(forms)}
            for lang in LANGS:
                ans = q["answer"][lang]
                if not any(f in ans for f in forms):
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
    # Rules for Chinese text (every Chinese variant in languages.json).
    for lang in CHINESE:
        check_chinese(lang)
    check_locales()
    check_widget_labels()


def chinese_texts(lang: str):
    """(where, text, is_mdx) for every piece of text in one Chinese variant."""
    for r in source_docs():
        p = doc_path(lang, str(r))
        if p.exists():
            yield rel(p), body_of(p.read_text(encoding="utf-8")), True
    for lesson_id, key in keys.items():
        found = []
        walk_bilingual(key, "", lambda path, node: found.append((path, node.get(lang))))
        for path, v in found:
            for s in all_strings(v):
                yield f"course/keys/{lesson_id}.yaml {path}", s, False


def check_chinese(lang: str):
    # Straight quotes next to Chinese characters become wrongly paired curly quotes in Markdown.
    straight = re.compile(r'"(?=[\u4e00-\u9fff])|(?<=[\u4e00-\u9fff\u3002\uff0c\uff1f\uff01])"')
    # No space after full-width punctuation. A bold run that ends with full-width punctuation and is
    # followed directly by a Chinese character does not render as bold in Markdown (CommonMark
    # flanking rules), so the punctuation goes after the closing **.
    space_after = re.compile(r"[。，；：！？、]\**[ \t]+\**[\u4e00-\u9fff]")
    bold_punct = re.compile(r"[。，；：！？、]\*\*[\u4e00-\u9fff]")
    for where, text, is_mdx in chinese_texts(lang):
        prose = prose_only(text) if is_mdx else MATH.sub(" ", text)
        if straight.search(prose):
            err(where, 'Chinese text contains straight double quotes ("); use “ and ”')
        # The Chinese word for prompt is 提示词 (Simplified) or 提示詞 (Traditional).
        if re.search(r"prompt", prose, re.I):
            err(where, "Chinese text uses 'prompt'; write 提示词 / 提示詞")
        # Math becomes "x" so that the space after an inline formula is not mistaken for a stray space.
        spaced = MATH.sub("x", strip_code(text))
        for m in space_after.finditer(spaced):
            err(where, f"space after Chinese punctuation: '{m.group(0)}'")
        if not is_mdx:
            continue
        for line in spaced.split("\n"):
            for m in bold_punct.finditer(line):
                # Only a closing ** (an odd number of ** before it on the line) is a problem.
                if line[: m.start() + 1].count("**") % 2 == 1:
                    err(where, f"bold ends with Chinese punctuation before a character, so it will not render; move the punctuation after **: '{m.group(0)}'")


def check_locales():
    """Each language has a locale module with every UI string and prompts that include the disclaimer."""
    types = (ROOT / "src/i18n/types.ts").read_text(encoding="utf-8")
    ui_keys = set(re.findall(r"\|\s*'(\w+)'", types.split("export type UiKey")[1].split(";")[0]))
    folder = ROOT / "src/i18n/locales"
    for f in sorted(folder.glob("*.ts")):
        if f.stem not in LANGS:
            err(rel(f), f"no language '{f.stem}' in src/i18n/languages.json")
    for lang in LANGS:
        f = folder / f"{lang}.ts"
        if not f.exists():
            err(rel(f), f"language '{lang}' needs a locale module (copy another one and translate it)")
            continue
        src = f.read_text(encoding="utf-8")
        ui = src.split("ui: {", 1)[1].split("\n\t},", 1)[0] if "ui: {" in src else ""
        defined = set(re.findall(r"^\t\t(\w+):", ui, re.M))
        for k in sorted(ui_keys - defined):
            err(rel(f), f"missing UI string '{k}'")
        for k in sorted(defined - ui_keys):
            err(rel(f), f"UI string '{k}' is not declared in src/i18n/types.ts (UiKey)")
        if lang in CHINESE:
            for m in re.finditer(r"^\t\t(\w+): '([^']*)'", ui, re.M):
                if re.search(r"prompt", m.group(2), re.I):
                    err(rel(f), f"Chinese UI string '{m.group(1)}' uses 'prompt'; write 提示词 / 提示詞")
        if not re.search(r"const DISCLAIMER\s*=", src):
            err(rel(f), "defines no DISCLAIMER (the statement that the course content is AI-generated)")
        bodies = re.split(r"^\t\t(feedback|quiz|explain)\(", src, flags=re.M)
        found = dict(zip(bodies[1::2], bodies[2::2]))
        for name in ("feedback", "quiz", "explain"):
            if name not in found:
                err(rel(f), f"missing prompt template {name}()")
            elif "${DISCLAIMER}" not in found[name]:
                err(rel(f), f"prompt template {name}() does not include ${{DISCLAIMER}}")


def check_widget_labels():
    """Label tables in widgets (`const L = { <code>: {...}, ... }[lang]`) cover every language."""
    for f in sorted((ROOT / "src/components/widgets").glob("*.astro")):
        src = f.read_text(encoding="utf-8")
        if "const L = {" not in src:
            continue
        table = src.split("const L = {", 1)[1].split("}[lang]", 1)[0]
        defined = set(re.findall(r"^\t'?([a-z][a-z-]*)'?: \{", table, re.M))
        for lang in LANGS:
            if lang not in defined:
                err(rel(f), f"label table has no '{lang}' entry")
        for code in sorted(defined - set(LANGS)):
            err(rel(f), f"label table has '{code}', which is not in src/i18n/languages.json")


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
