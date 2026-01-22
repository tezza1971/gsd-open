# GSD for Hobos (gfh)

> "A context-migration utility for the computationally impoverished."

**GSD for Hobos (GFH)** is a trans-platform context transporter. It takes the
high-end context engineering of
[Get Shit Done (GSD)](https://github.com/glittercowboy/get-shit-done) and
transpiles it for "economy-class" AI platforms.

When your Claude Code token usage looks like a phone number and you're staring
down a rate-limit lockout, `gfh` ensures your fallback tools have been briefed
on your mission. And if you're stone broke and can't afford Claude Code at all?
This is your gateway to structured context engineering.

## Are you lost?

If you're not in the hobo class, and you landed here by mistake, go and visit
[GSD on bags.fm](https://bags.fm/$glittercowboy) and help Lex do GSD fulltime so
we can all benefit.

## The Workflow

1. **The Hobo Manifesto:** You agree to the disclaimer. This is expectations
   management and a courtesy to the OG GSD author.
2. **GSD Detection:** Finds your GSD installation at `~/.claude/` (or asks where
   you stashed it). Checks freshness and offers to update if needed.
3. **Platform Detection:** Scans your system for supported hobo-tier platforms.
4. **Transpilation:** Parses your GSD context files into an intermediate
   representation, then transforms them into your target platform's format.
   Detects conflicts, backs up existing configs, asks before overwriting.
5. **The Hobo Report:** A shortfall analysis showing what migrated and what
   features were too "high-society" for your fallback tools.
6. **LLM Enhancement (Optional):** If you've got spare change for tokens, you
   can run an optional LLM pass to improve the transpilation. Provide an
   OpenAI-compatible API key (used in-memory, then discarded) and iterate until
   you're satisfied. No API key? We'll tip you on running a local LLM.

## Supported Targets

| Rank | Platform        | Status       | Notes                                                |
| ---- | --------------- | ------------ | ---------------------------------------------------- |
| 1    | **OpenCode**    | **v1 (MVP)** | The gold standard for low-overhead productivity.     |
| 2    | **Antigravity** | v2 Planned   | High capability, low cost.                           |
| 3    | **Cursor**      | v2 Planned   | For the hobo who found a $20 bill on the sidewalk.   |
| 4    | **Windsurf**    | v2 Planned   | Flow-state friendly.                                 |
| 5    | **ChatLLM**     | v2 Planned   | The ultimate fallback.                               |
| ?    | **VS Code**     | Researching  | Can it handle slash commands? We're looking into it. |

## Documentation

Full documentation is available in the [`docs/`](./docs/) folder:

| Guide | Description |
|-------|-------------|
| [API Keys](./docs/api-keys.md) | Environment variables for LLM enhancement |
| [CLI Reference](./docs/cli-reference.md) | All commands, flags, and exit codes |
| [LLM Enhancement](./docs/llm-enhancement.md) | Optional AI-powered refinement |
| [Transpilation](./docs/transpilation.md) | How GSD becomes OpenCode |
| [Troubleshooting](./docs/troubleshooting.md) | Common issues and solutions |

## Usage

Run via npx:

```bash
npx gsd-for-hobos
```

### Options

```
--help         Show usage information
--version      Show current version
--dry-run      Preview changes without writing anything
--quiet        Suppress output (except errors)
-v, --verbose  Verbose mode for debugging
--detect       Run detection only (skip transpilation)
--no-enhance   Skip LLM enhancement prompt
```

### Transpile Subcommand

```bash
gfh transpile [options]

Options:
  --force       Force re-transpilation even if unchanged
  --no-backup   Skip backup (dangerous)
  --no-enhance  Skip LLM enhancement prompt
```

### Exit Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 0    | Success — transpilation complete     |
| 1    | Warnings — partial success           |
| 2+   | Errors — something went wrong        |

## LLM Enhancement

After transpilation, gfh can optionally enhance results using an LLM. Set one of these environment variables:

| Provider | Environment Variable |
|----------|---------------------|
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Azure OpenAI | `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT` |

See [API Keys Guide](./docs/api-keys.md) for complete setup instructions.

No API key? gfh will suggest local LLM alternatives (Ollama, LM Studio, llama.cpp).

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  ALGORITHMIC PASS (always runs)                     │
│  - Quiet transpilation                              │
│  - Basic shortfall report                           │
└─────────────────────────────────────────────────────┘
                        ↓
          "Want to enhance with LLM?"
                        ↓
┌─────────────────────────────────────────────────────┐
│  LLM PASS (optional)                                │
│  - Reviews algorithmic attempt                      │
│  - Interactive refinement loop                      │
│  - Richer final report                              │
└─────────────────────────────────────────────────────┘
```

## Development Status

This project is under active development. See `.planning/ROADMAP.md` for the
current status and phase breakdown.

**Current phase:** Phase 5 - LLM Enhancement (final phase)
**Requirements:** 28 total across 5 phases
**Progress:** Phases 1-4 complete, Phase 5 in verification

## License

MIT

## Contribute

If you find a bug or have a feature request, please open an issue or submit a
pull request.

## Acknowledgments

- [Get Shit Done (GSD)](https://github.com/glittercowboy/get-shit-done) — The OG
- [OpenCode](https://opencode.ai/) — v1 target platform
