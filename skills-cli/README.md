# skills

A small CLI for installing [Agent Skills](https://agentskills.io) from GitHub
repositories.

> **Note:** This package is intended for demonstration purposes alongside the
> [skills-ref](../skills-ref) reference library. It is not meant for production
> use.

## Quick start

Install a skill from a public GitHub repo without installing the package
globally:

```bash
npx skills add <owner>/<repo>
```

For example:

```bash
# Install a skill that lives at the root of a repo
npx skills add my-org/my-skill

# Install a skill that lives in a subdirectory
npx skills add anthropics/skills/skills/canvas-design

# Pin to a specific branch, tag, or commit
npx skills add my-org/my-skill#v1.2.0

# Install into a custom directory and overwrite an existing copy
npx skills add my-org/my-skill --dir ./.skills --force
```

By default skills are installed into `./skills/<skill-name>/` relative to the
current working directory.

## Usage

```
skills <command> [options]

Commands:
  add <owner/repo>[/subpath][#ref]   Install a skill from a GitHub repo

Options for "add":
  --dir <path>     Directory to install the skill into (default: ./skills)
  --ref <name>     Git ref (branch, tag, or commit) to fetch
  --force          Overwrite an existing skill of the same name

Other:
  -h, --help       Show this help
  -v, --version    Show version
```

### Source format

The source argument identifies a skill on GitHub:

| Form                                  | Meaning                                                        |
| ------------------------------------- | -------------------------------------------------------------- |
| `owner/repo`                          | Skill at the root of `owner/repo`'s default branch             |
| `owner/repo#ref`                      | Skill at the root of `owner/repo`, pinned to `ref`             |
| `owner/repo/sub/path`                 | Skill at `sub/path` within the repo's default branch           |
| `owner/repo/sub/path#ref`             | Skill at `sub/path`, pinned to `ref`                           |

A `--ref <name>` flag, if provided, takes precedence over a `#ref` suffix.

### What "installing" does

1. Downloads the repo tarball from `codeload.github.com` (no `git` required).
2. Locates the skill directory (root of the repo, or the requested subpath).
3. Validates that it contains a `SKILL.md` with valid required frontmatter
   (`name`, `description`).
4. Copies the skill directory to `<dir>/<name>/`, where `<name>` is the
   skill's declared name.

The CLI refuses to overwrite an existing skill directory unless `--force` is
passed.

### Authentication

Public repositories require no authentication. To install from a private
repo, set the `GITHUB_TOKEN` environment variable to a token with `repo`
scope; it is sent only to `api.github.com` when looking up the default
branch (the tarball download itself uses the token-less `codeload`
endpoint, so private downloads should pass `--ref` to skip the API call):

```bash
GITHUB_TOKEN=ghp_… npx skills add my-org/private-skill --ref main
```

## Requirements

- Node.js ≥ 18 (uses the built-in global `fetch`).
- `tar` available on `PATH` (preinstalled on macOS, Linux, and Windows 10+).

## Development

```bash
cd skills-cli
node --test test
```

The package has no runtime dependencies.

## License

Apache 2.0
