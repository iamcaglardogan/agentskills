# Agent Skills

[Agent Skills](https://agentskills.io) are a simple, open format for giving agents new capabilities and expertise.

Skills are folders of instructions, scripts, and resources that agents can discover and use to perform better at specific tasks. Write once, use everywhere.

## Getting Started

- [Documentation](https://agentskills.io) - Guides and tutorials
- [Specification](https://agentskills.io/specification) - Format details
- [Example Skills](https://github.com/anthropics/skills) - See what's possible

This repo contains the specification, documentation, and reference SDK. Also see a list of example skills [here](https://github.com/anthropics/skills).

## Installing skills from GitHub

The [`skills`](skills-cli) CLI installs skills from any GitHub repository:

```bash
npx skills add <owner>/<repo>[/subpath][#ref]
```

For example, `npx skills add anthropics/skills/skills/canvas-design` installs
the `canvas-design` skill into `./skills/canvas-design`. See
[skills-cli/README.md](skills-cli/README.md) for details.

## About

Agent Skills is an open format maintained by [Anthropic](https://anthropic.com) and open to contributions from the community.

## License

Code in this repository is licensed under [Apache 2.0](LICENSE). Documentation is licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). See individual directories for details.