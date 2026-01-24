---
type: prompt
name: gsdo
description: Transpile GSD commands to OpenCode format
---

You are transpiling GSD commands from Claude Code format to OpenCode format.

## Your Task

Read each file from `~/.gsdo/copied/*.md`, understand its purpose, and rewrite it for OpenCode compatibility.

## Resources

- Claude Code docs: `~/.gsdo/cache/code.claude.com__*.html`
- OpenCode docs: `~/.gsdo/cache/opencode.ai__*.html`
- Installation log: `~/.gsdo/install.md`

## Steps

1. For each GSD file in `~/.gsdo/copied/`:
   - Read and understand the Claude Code skill structure
   - Review the OpenCode documentation for command patterns
   - Rewrite as an OpenCode command file (markdown with frontmatter)

2. Write each transpiled command to:
   - `~/.config/opencode/command/gsd-[name].md`

3. Log all results to:
   - `~/.gsdo/gsdo.md`

## Important

- Preserve core functionality
- One file at a time
- Keep command names consistent
- Do not remove existing /gsdo command
