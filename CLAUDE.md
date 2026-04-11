# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository purpose

This is the canonical repository for **Agent Skills**, an open format for packaging procedural knowledge, scripts, and resources that AI agents can discover and use on demand. A skill is just a folder containing a `SKILL.md` file with YAML frontmatter (`name`, `description`, and optional fields) followed by Markdown instructions. See `docs/specification.mdx` for the full spec.

This repo does **not** contain example skills themselves — those live at https://github.com/anthropics/skills. What this repo provides is:

1. The **specification** and documentation site (`docs/`)
2. A Python **reference library + CLI** for validating skills and generating agent prompts (`skills-ref/`)

## Top-level layout

```
agentskills/
├── docs/           # Mintlify documentation site (agentskills.io)
│   └── CLAUDE.md   # Component-specific guidance (Mintlify workflow)
├── skills-ref/     # Python reference library and `skills-ref` CLI
│   └── CLAUDE.md   # Component-specific guidance (uv, ruff, pytest)
├── .claude/        # Claude Code hooks and settings for this repo
├── README.md
└── LICENSE         # Apache 2.0 (code); docs are CC-BY-4.0
```

When working inside `docs/` or `skills-ref/`, read the component-level `CLAUDE.md` there first — it has the concrete commands for that subproject.

## `docs/` — documentation site

Built with [Mintlify](https://mintlify.com). Content is authored as `.mdx` files and published to agentskills.io on push to `main`.

**Key files:**
- `docs/docs.json` — Mintlify config; the navigation (`navigation.pages`) is the source of truth for which pages ship.
- `docs/home.mdx`, `docs/what-are-skills.mdx`, `docs/specification.mdx`, `docs/integrate-skills.mdx` — the four shipped pages (in nav order).
- `docs/snippets/LogoCarousel.jsx` — the adoption carousel on the home page. Many PRs in this repo are logo additions; they touch this file plus `docs/images/logos/`.
- `docs/style.css`, `docs/favicon.svg` — site styling and icon.

**Local development:**
```bash
npm i -g mint          # install the CLI once
cd docs && mint dev    # must run from the dir containing docs.json
```
Preview at `http://localhost:3000`. If the dev server misbehaves, run `mint update`. A page that 404s usually means `mint dev` is running from the wrong directory.

**Adding a new page:** create `docs/<slug>.mdx` and add `"<slug>"` to `navigation.pages` in `docs.json`. Deployment is automatic on merge to `main`.

## `skills-ref/` — Python reference library + CLI

A Python package (`skills_ref`, source under `src/skills_ref/`) exposing:

- `validate(skill_dir)` — full validation; returns a list of error strings (empty = valid).
- `read_properties(skill_dir)` — parse frontmatter into a `SkillProperties` dataclass (parse-level checks only).
- `to_prompt(skill_dirs)` — build the `<available_skills>` XML block for inclusion in a system prompt.
- `find_skill_md(skill_dir)` — locate `SKILL.md` (preferred) or `skill.md`.

A `skills-ref` console script (defined in `pyproject.toml`) exposes three subcommands backed by `src/skills_ref/cli.py`:

```bash
skills-ref validate path/to/skill
skills-ref read-properties path/to/skill   # JSON output
skills-ref to-prompt path/to/skill-a path/to/skill-b
```

All three accept either a skill directory or a direct path to a `SKILL.md` file (the CLI normalizes to the parent directory via `_is_skill_md_file`).

**Module map (`src/skills_ref/`):**
- `models.py` — `SkillProperties` dataclass; `to_dict()` omits `None` fields and the optional `metadata` dict when empty. The `allowed_tools` attribute serializes back to the hyphenated `allowed-tools` key.
- `errors.py` — exception hierarchy: `SkillError` → `ParseError`, `ValidationError`. `ValidationError` carries an `errors` list.
- `parser.py` — `find_skill_md`, `parse_frontmatter` (uses `strictyaml`), and `read_properties`. Parser checks only that `name` and `description` are present and non-empty; it is deliberately lighter than the full validator.
- `validator.py` — the complete spec check. Constants at the top (`MAX_SKILL_NAME_LENGTH=64`, `MAX_DESCRIPTION_LENGTH=1024`, `MAX_COMPATIBILITY_LENGTH=500`) and `ALLOWED_FIELDS = {name, description, license, allowed-tools, metadata, compatibility}` must stay in sync with `docs/specification.mdx`. Names are NFKC-normalized before comparison so the directory name can be in a different Unicode form than the frontmatter.
- `prompt.py` — builds the XML; escapes `name` and `description` with `html.escape` and resolves `skill_dir` to an absolute path before embedding the `<location>`.
- `cli.py` — Click-based CLI. Exit code 1 on any failure; `validate` prints errors to stderr.
- `__init__.py` — public API re-exports plus `__version__`.

**Tests (`tests/`):** pytest, organized by module (`test_parser.py`, `test_prompt.py`, `test_validator.py`). Tests use `tmp_path` to build real skill directories on disk and cover i18n names (Chinese, Russian), NFKC normalization, hyphen rules, length limits, directory/name mismatch, and unknown frontmatter fields. When adding validator rules, mirror this pattern rather than mocking the filesystem.

**Install and run (from `skills-ref/`):**
```bash
uv sync                      # preferred; creates .venv and installs deps
source .venv/bin/activate
# or: python -m venv .venv && source .venv/bin/activate && pip install -e .
```

**Quality gates — run before committing changes under `skills-ref/`:**
```bash
uv run ruff format .
uv run ruff check --fix .
uv run pytest
```

Python ≥ 3.11 is required (see `pyproject.toml`). Runtime deps: `click`, `strictyaml`. Dev deps: `pytest`, `ruff`.

## Spec ↔ implementation coupling

The validator is the executable form of the spec. If you change one, change the other in the same PR:

| Spec rule (`docs/specification.mdx`) | Enforced in (`skills-ref/src/skills_ref/validator.py`) |
|---|---|
| `name` max 64 chars, lowercase, no leading/trailing/consecutive hyphens, matches dir | `_validate_name` + `MAX_SKILL_NAME_LENGTH` |
| `description` max 1024 chars, non-empty | `_validate_description` + `MAX_DESCRIPTION_LENGTH` |
| `compatibility` max 500 chars | `_validate_compatibility` + `MAX_COMPATIBILITY_LENGTH` |
| Allowed frontmatter keys | `ALLOWED_FIELDS` |
| i18n names allowed (Unicode letters + hyphens) | `_validate_name` (NFKC + `str.isalnum`) |

When in doubt, the spec document is canonical; the tests in `tests/test_validator.py` are the second source of truth.

## SKILL.md format (quick reference)

```yaml
---
name: my-skill           # required; kebab-case, matches parent directory
description: What it does and when to use it.   # required
license: Apache-2.0      # optional
compatibility: Requires git and network access  # optional, ≤500 chars
allowed-tools: Bash(git:*) Read                  # optional, experimental
metadata:                                        # optional, string→string map
  author: example-org
  version: "1.0"
---
```

Body is free-form Markdown. Keep `SKILL.md` under ~500 lines and push long reference material into `references/`, runnable code into `scripts/`, and templates/data into `assets/`. Skill authors rely on progressive disclosure: only `name` + `description` are loaded at agent startup, the full body is loaded on activation, and bundled files are loaded on demand.

## Conventions for changes

- **Don't invent new frontmatter fields.** If a real need emerges, update `docs/specification.mdx`, `ALLOWED_FIELDS`, `SkillProperties`, `read_properties`, `to_dict`, and add tests — all in the same change.
- **Logo/adoption PRs** are common and should touch `docs/snippets/LogoCarousel.jsx` and `docs/images/logos/<brand>/...` only. Follow the sizing/centering patterns already in `LogoCarousel.jsx`.
- **Don't push broken spec examples.** Code blocks in `docs/specification.mdx` are user-facing; run anything questionable through `skills-ref validate` mentally (or literally, on a scratch dir).
- **Apache 2.0** is the code license; documentation is **CC-BY-4.0**. Preserve both `LICENSE` files.
- **No secrets, no generated artifacts.** `.gitignore` already excludes IDE and Python build outputs; don't commit `.venv/`, `__pycache__/`, or `.ruff_cache/`.

## Branching

This repo uses standard PR-based development against `main`. Merging to `main` auto-deploys the docs site. Do not force-push to `main`.

## Pointers

- Full spec: `docs/specification.mdx`
- Integration guide: `docs/integrate-skills.mdx`
- Python API surface: `skills-ref/src/skills_ref/__init__.py`
- Example skills (separate repo): https://github.com/anthropics/skills
