---
type: prompt
name: gsdo
description: Transpile GSD commands to OpenCode format
---

You are transpiling GSD workflow commands from Claude Code skill format to OpenCode command format.

## Your Task

Read each file from `~/.gsdo/copied/*.md`, understand its purpose, and rewrite it for OpenCode compatibility while **preserving operational detail**.

## Resources

- Claude Code docs: `~/.gsdo/cache/docs/code.claude.com__*.html`
- OpenCode docs: `~/.gsdo/cache/docs/opencode.ai__*.html`
- Installation log: `~/.gsdo/install.md`

## OpenCode Command Format

**Frontmatter (required):**
```yaml
---
description: Brief one-line description
agent: agent-name-if-applicable  # optional
---
```

**Body features:**
- `$ARGUMENTS` - all command arguments (e.g., `/gsd-plan 5` → `$ARGUMENTS` = `5`)
- `$1`, `$2`, `$3` - positional arguments
- `@filepath` - include file content in prompt
- `` !`command` `` - inject shell command output into prompt

## Transpilation Rules

### 1. Structure Conversion

| Claude Code (Source) | OpenCode (Target) |
|---------------------|-------------------|
| `<purpose>` tag | Opening paragraph after H1 |
| `<process><step>` tags | Numbered ## sections with clear instructions |
| `<required_reading>` with `@path` | Keep `@path` syntax (OpenCode supports it) |
| `<success_criteria>` | Final ## Success Criteria checklist |
| `<philosophy>` / `<core_principle>` | ## Philosophy or ## Core Principle section |

### 2. Detail Preservation (CRITICAL)

**PRESERVE these elements - do NOT summarize away:**

- **File paths exactly**: `.planning/ROADMAP.md`, `.planning/phases/XX-name/`, `STATE.md`, etc.
- **Bash commands for state checking**: Keep commands that read project state
- **Decision trees**: If source has if/then logic, preserve as conditional instructions
- **Output templates**: Keep markdown templates the LLM should generate
- **Error handling**: Keep instructions for edge cases and failures
- **Next step suggestions**: Commands like `/gsd:plan-phase $1`

**Target output length:**
- Simple commands: 800-1500 bytes
- Complex workflows: 2000-4000 bytes
- Never compress below 60% of conceptual content

### 3. Argument Handling

When source references phase numbers, arguments, etc.:
```markdown
# Source mentions: "Phase number from argument"
# Target uses: `$1` or `$ARGUMENTS`

Phase: $1
Read `.planning/ROADMAP.md` and find phase $1.
```

### 4. Dynamic Context

For commands that need current project state, use shell injection:
```markdown
## Current State
!`cat .planning/STATE.md 2>/dev/null || echo "No STATE.md found"`

## Roadmap
!`cat .planning/ROADMAP.md 2>/dev/null | head -100`
```

### 5. File References

Convert Claude Code references:
- `@~/.claude/get-shit-done/references/file.md` → Remove (OpenCode won't have these)
- Project-local files → Keep as `@.planning/ROADMAP.md`

## Example Transpilation

**Source (Claude Code):**
```markdown
<purpose>
Execute a phase by running all plans in sequence.
</purpose>

<process>
<step name="load_state">
Read STATE.md and ROADMAP.md to find current phase.
```bash
cat .planning/STATE.md
```
</step>
<step name="find_plans">
List plans in phase directory...
</step>
</process>
```

**Target (OpenCode):**
```markdown
---
description: Execute all plans in a phase sequentially
agent: gsd-executor
---

# Execute Phase

Execute phase $1 by running all plans in sequence with atomic commits.

## Current Project State
!`cat .planning/STATE.md 2>/dev/null`

## Process

### 1. Load State
Read STATE.md and ROADMAP.md to find current phase status.

```bash
cat .planning/STATE.md
cat .planning/ROADMAP.md | grep -A5 "Phase $1"
```

### 2. Find Plans
List all PLAN.md files in `.planning/phases/$1-*/`:
```bash
ls .planning/phases/*-*/*-PLAN.md 2>/dev/null | sort
```
...
```

## Steps

1. For each GSD file in `~/.gsdo/copied/`:
   - Read the full source file
   - Identify: purpose, process steps, file paths, bash commands, output templates
   - Preserve operational detail while converting structure
   - Write as OpenCode command with proper frontmatter

2. Write each transpiled command to:
   - `~/.config/opencode/command/gsd-[name].md`

3. Log all results to:
   - `~/.gsdo/gsdo.md`

## Quality Checklist (per command)

Before writing each command, verify:
- [ ] Description is clear and specific
- [ ] File paths preserved exactly (`.planning/`, `STATE.md`, etc.)
- [ ] Key bash commands included (state checks, file discovery)
- [ ] Decision logic preserved (if/then as conditional sections)
- [ ] Output templates kept (markdown structures to generate)
- [ ] Arguments use `$1`/`$ARGUMENTS` where applicable
- [ ] Reasonable length (not over-compressed)

## Important

- Preserve core functionality AND operational detail
- One file at a time
- Keep command names consistent (gsd-[original-name].md)
- Do not modify existing /gsdo command
