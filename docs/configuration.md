# Configuration Guide

GSD Open uses a multi-level configuration system with global user settings and project-specific output.

## Directory Overview

```
~/.gsdo/                           # Global user configuration
└── transforms.json                # Custom transform rule overrides

~/.cache/                          # Cached data
└── docs-opencode/                 # OpenCode documentation cache
    └── opencode-docs.cache        # Cached schema docs (24hr TTL)

.opencode/                         # Project-specific OpenCode config
├── agents.json                    # Transpiled agents
├── commands.json                  # Transpiled commands
├── models.json                    # Model configurations
├── settings.json                  # General settings
├── llm-rules.json                 # LLM-generated enhancement rules
└── gsdo-manifest.json             # Transpilation metadata
```

## Global Configuration

### ~/.gsdo/transforms.json

Custom transform rules that override the defaults. These apply to all transpilation operations.

**Structure:**

```json
{
  "version": "1.0",
  "description": "Custom transform rules",
  "agents": {
    "fieldMappings": {
      "customField": "mappedField"
    },
    "defaults": {
      "temperature": 0.8
    }
  }
}
```

**When to use:**
- You want consistent custom mappings across all projects
- You've found better default values for certain fields
- You need project-agnostic transform behavior

**Location rationale:** Global config belongs in `~/.gsdo/` because it represents your personal preferences that should apply regardless of which project you're working on.

## Project-Specific Configuration

### .opencode/llm-rules.json

LLM-generated enhancement rules created during the optional LLM enhancement pass.

**Structure:**

```json
{
  "rules": [
    {
      "field": "agent.description",
      "category": "platform",
      "suggestion": "Infer description from system prompt"
    }
  ]
}
```

**When created:**
- During LLM enhancement when you provide refinement suggestions
- Appends new rules each enhancement session
- Sorted by field name for deterministic output

**Location rationale:** Project-specific in `.opencode/` because these rules are generated based on the specific GSD context you're transpiling for this project.

### .opencode/gsdo-manifest.json

Transpilation metadata for idempotency checking.

**Structure:**

```json
{
  "version": "1.0",
  "lastRun": {
    "timestamp": "2026-01-22T06:51:47.000Z",
    "sourceHash": "abc123...",
    "outputHash": "def456...",
    "backup": {
      "location": ".opencode-backup/2026-01-22T06-51-47",
      "timestamp": "2026-01-22T06:51:47.000Z"
    }
  },
  "mappings": []
}
```

**Purpose:**
- Tracks source and output hashes to skip unnecessary re-transpilation
- Records backup locations
- Enables `--force` flag to bypass idempotency

## Cache Configuration

### ~/.cache/docs-opencode/

Platform-specific documentation cache for LLM enhancement.

**Location:** `~/.cache/docs-{platform}/`
- `docs-opencode/` - OpenCode documentation (current)
- `docs-antigravity/` - Antigravity documentation (planned)
- `docs-cursor/` - Cursor documentation (planned)

**TTL:** 24 hours (86400 seconds)

**Purpose:**
- Caches fetched documentation to avoid repeated GitHub requests
- Automatically refreshes when expired
- Centralized in home directory for access from any working directory

**Management:**

```bash
# Clear OpenCode docs cache
rm -rf ~/.cache/docs-opencode/

# Clear all gsdo caches
rm -rf ~/.cache/docs-*/
```

## Environment Variables

GSD Open does not store API keys in configuration files. All API keys must be provided via environment variables:

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | OpenAI API access for LLM enhancement |
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | Google Gemini API access |
| `ANTHROPIC_API_KEY` | Anthropic Claude API access |
| `OPENROUTER_API_KEY` | OpenRouter API access |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL |
| `AZURE_OPENAI_DEPLOYMENT` | Azure deployment name |

See [API Keys Guide](./api-keys.md) for detailed setup instructions.

## Configuration Precedence

When resolving configuration, gsdo uses this precedence (highest to lowest):

1. **Command-line flags** - Override everything
2. **Environment variables** - API keys, endpoints
3. **User overrides** - `~/.gsdo/transforms.json`
4. **LLM-generated rules** - `.opencode/llm-rules.json` (project-specific)
5. **Default rules** - Built-in `transform-rules.json`

## Best Practices

### Global vs Project Configuration

**Use `~/.gsdo/` for:**
- Personal preferences that apply everywhere
- Custom field mappings you always want
- Default value overrides

**Use `.opencode/` for:**
- Project-specific LLM enhancements
- Transpilation output and metadata
- Anything that shouldn't be shared across projects

### Cache Management

- Cache is automatically managed with TTL
- Only clear cache if you need to force refresh docs
- Cache is per-platform to support multi-platform future

### Security

- Never commit `.env` files with API keys
- Never store API keys in config files
- API keys are used in-memory only during enhancement
- All config files in this guide are safe to commit (no secrets)

## Migration from Previous Versions

If you have config from the old `gsd-for-hobos`:

```bash
# Rename global config directory
mv ~/.gfh ~/.gsdo

# Update cache location (old cache can be deleted)
rm -rf .cache/llm-docs/
# New cache will be created at ~/.cache/docs-opencode/

# Update manifest files in projects
cd your-project
mv .opencode/.gfh-manifest.json .opencode/.gsdo-manifest.json
```

---

*Back to: [Documentation Home](./README.md)*
