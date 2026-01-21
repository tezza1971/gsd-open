# gsd-for-hobos (gfh)

## What This Is

A Node.js CLI tool (`npx gsd-for-hobos`) that transpiles GSD context engineering from Claude Code into cheaper/free AI platforms. Built for developers who have the brain of a 20x engineer but the budget of a hobo — either rate-limited on Claude Code and needing a fallback NOW, or stone broke and wanting a taste of structured context engineering without the Claude Code price tag.

## Core Value

Frictionless fallback that just works when you hit the wall. Run one command, get set up on OpenCode (and later, other platforms) with your GSD context — no decisions, no friction, honest expectations.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Display Hobo Manifesto disclaimer/agreement screen at launch
- [ ] Detect GSD installation at `~/.claude/`, prompt for location if not found
- [ ] Check GSD freshness and offer to update/install if needed
- [ ] Detect OpenCode installation on user's system
- [ ] Transpile GSD context files to OpenCode configuration format
- [ ] Generate algorithmic shortfall report (which GSD commands aren't portable)
- [ ] Offer optional LLM enhancement pass with OpenAI-compatible API key
- [ ] LLM pass: review algorithmic attempt, improve transpilation, interactive loop
- [ ] If no API key: tip user to run local LLM and exit gracefully
- [ ] Output final report to console
- [ ] Offer to save markdown version of report locally
- [ ] Quiet execution (no prompts during transpilation work)
- [ ] Satirical hobo-themed tone throughout

### Out of Scope

- Cursor support — deferred to v2
- Windsurf support — deferred to v2
- Antigravity support — deferred to v2
- ChatLLM support — deferred to v2
- VS Code support — experimental/research needed, deferred
- Perfect feature parity — this is "best effort," not a replacement
- Storing API keys — used in-memory only, then discarded
- Automated GSD updates without user consent — always ask first

## Context

**Reference project:** [get-shit-done](https://github.com/glittercowboy/get-shit-done) by glittercowboy — the OG GSD context engineering system for Claude Code. This tool exists to extend GSD's reach to developers who can't always afford Claude Code's rate limits or subscription.

**Target users:**
1. **The Rate-Limited** — Has Claude Code, loves GSD, just hit the usage wall. Needs a fallback NOW to keep working.
2. **The Stone Broke** — Can't afford Claude Code at all. Wants to experience structured context engineering on free/cheap alternatives.

**GSD location:** Standard install is `~/.claude/`. Tool defaults there, asks user if not found.

**Two-pass architecture:**
1. **Algorithmic pass** (always runs) — Quiet transpilation, basic shortfall report
2. **LLM pass** (optional) — User provides OpenAI-compatible API key, interactive refinement loop, richer final report

**Tone:** Satirical, utilitarian, hobo-themed metaphors. "Scavenging for configs," "boarding the freight train," "spare change for tokens." The Hobo Manifesto is both humor and genuine expectation management.

## Constraints

- **Tech stack**: Node.js, minimal dependencies (fs/promises, path, child_process built-ins), inquirer/prompts for CLI interaction
- **Distribution**: npx-executable (package.json with `bin` field)
- **MVP platform**: OpenCode only — other platforms are future scope
- **No secrets stored**: API keys used in-memory, never persisted
- **Respect for GSD**: Disclaimer acknowledges original author, sets expectations about "best effort" nature

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| OpenCode as sole MVP target | Focus beats sprawl. Nail one platform before expanding. | — Pending |
| Two-pass (algorithmic + LLM) | Algorithmic gives baseline for free, LLM enhances for those who have API access | — Pending |
| Hobo Manifesto stays | Expectation management + courtesy to OG GSD author + brand identity | — Pending |
| API keys in-memory only | Privacy/security for users, no persistence of secrets | — Pending |
| Local LLM tip as fallback | Stone broke users can still get enhanced reports without paying for API | — Pending |

---
*Last updated: 2025-01-21 after initialization*
