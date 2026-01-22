---
phase: 03-gsdo-command
plan: 02
subsystem: llm-enhancement
tags: [llm, anthropic, openai, prompt-engineering, enhancement]
requires: [03-01]
provides:
  - LLM client with OpenCode model detection
  - Per-command enhancement with focused prompts
  - Conservative fix application
tech-stack:
  added: []
  patterns:
    - Direct API calls (no SDK dependencies)
    - Retry logic with exponential backoff
    - Markdown code fence parsing
    - Graceful degradation pattern
key-files:
  created:
    - src/lib/enhancer/llm-client.ts
    - src/lib/enhancer/llm-client.test.ts
    - src/lib/enhancer/enhancer.ts
    - src/lib/enhancer/enhancer.test.ts
  modified: []
decisions:
  - decision: Use direct API calls instead of SDK dependencies
    rationale: Zero external dependencies, full control over requests
    phase: 03-02
  - decision: Retry once with exponential backoff on API failures
    rationale: Balances reliability with avoiding rate limits
    phase: 03-02
  - decision: Parse both markdown-fenced and plain JSON responses
    rationale: LLMs sometimes wrap JSON in code fences despite instructions
    phase: 03-02
  - decision: Process commands sequentially with 500ms delay
    rationale: Avoid rate limiting from LLM providers
    phase: 03-02
duration: 6min
completed: 2026-01-22
---

# Phase 3 Plan 2: LLM Enhancement Logic Summary

**One-liner:** Direct API integration for Anthropic/OpenAI with focused per-command enhancement prompts

## What Was Built

### LLM Client (`llm-client.ts`)
- **Model Detection:** Automatically detects OpenCode's configured LLM (settings.json or config.json)
- **Provider Support:** Anthropic Messages API and OpenAI Chat Completions API
- **Direct API Calls:** Uses Node.js built-in fetch (no SDK dependencies)
- **Retry Logic:** 1 retry with exponential backoff (1 second delay)
- **Error Handling:** Clear, actionable error messages when model not configured or API key missing

### Enhancement Logic (`enhancer.ts`)
- **Focused Prompts:** Builds context-rich prompts for each command individually
- **Context Includes:**
  - Current command JSON structure
  - Original GSD markdown source
  - Relevant install.log excerpts (warnings/errors)
  - OpenCode documentation excerpts
- **Conservative Philosophy:** Fix naming, references, parameters, templates (no restructuring)
- **Response Parsing:** Handles markdown code fences and plain JSON
- **Change Tracking:** Identifies specific improvements made (name, description, template)
- **Batch Processing:** `enhanceAllCommands` filters to gsd-* commands only, processes sequentially
- **Graceful Failure:** Individual command failures don't stop the batch

## Technical Implementation

### LLM Client Architecture

**Anthropic API Call:**
```typescript
POST https://api.anthropic.com/v1/messages
Headers: x-api-key, anthropic-version: 2023-06-01
Body: { model, max_tokens: 4096, messages: [...] }
```

**OpenAI API Call:**
```typescript
POST https://api.openai.com/v1/chat/completions
Headers: Authorization: Bearer <key>
Body: { model, messages: [...], max_tokens: 4096 }
```

**Retry Flow:**
1. Try API call
2. On failure: wait 1 second
3. Retry once
4. On persistent failure: throw error

### Enhancement Prompt Structure

```
CURRENT COMMAND (JSON): { name, description, promptTemplate }
ORIGINAL GSD SOURCE: (full markdown)
RELEVANT INSTALL LOG EXCERPTS: (warnings/errors for this command)
OPENCODE DOCUMENTATION: (schema, best practices)

ENHANCEMENT INSTRUCTIONS:
1. Fix broken GSD-specific references
2. Improve descriptions
3. Add missing parameters
4. Fix naming inconsistencies
5. Improve template clarity

DO NOT: Remove, merge, restructure, or change core functionality

Return ONLY JSON: { "name": "...", "description": "...", "promptTemplate": "..." }
```

### Response Parsing

Handles two formats:
1. **Markdown code fence:** ` ```json\n{...}\n``` `
2. **Plain JSON:** `{...}`

Regex: `/```(?:json)?\s*([\s\S]*?)```/`

### Batch Enhancement Flow

```typescript
1. Filter commands.filter(cmd => cmd.name.startsWith('gsd-'))
2. For each command sequentially:
   a. Load GSD source (gsd-name -> gsd:name.md)
   b. Build prompt with all context
   c. Call LLM (with internal retry)
   d. Parse response
   e. Identify changes
   f. Delay 500ms before next command
3. Return all results (successes and failures)
```

## Test Coverage

### LLM Client Tests (15 tests)
- Model detection from various config formats
- API calls for both Anthropic and OpenAI
- Retry logic on failures
- Error handling for missing keys and unsupported providers
- Prompt inclusion in request body

### Enhancement Tests (13 tests)
- Prompt building with all context
- Response parsing (code fences and plain JSON)
- Graceful handling of missing GSD source
- Retry with refined prompt on failure
- Error results on persistent failures
- Change identification
- Filename conversion (gsd-name -> gsd:name.md)
- Filtering to gsd-* commands only
- Sequential processing
- Partial success pattern

**Total: 78 tests passing** (across entire codebase)

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

### 1. Direct API Calls vs. SDK Dependencies
**Decision:** Use fetch directly instead of official SDKs

**Why:**
- Zero external dependencies (aligns with project philosophy)
- Full control over request/response handling
- Simpler implementation (no version conflicts)
- Built-in fetch available in Node 20+

### 2. Retry Strategy
**Decision:** Retry once with 1-second exponential backoff

**Why:**
- Handles transient API failures (network hiccups, brief rate limits)
- Doesn't aggressively retry (avoids rate limit escalation)
- Simple implementation (no complex backoff calculation)

### 3. Markdown Code Fence Parsing
**Decision:** Parse both fenced and plain JSON responses

**Why:**
- LLMs often wrap JSON in code fences despite "return only JSON" instructions
- Graceful handling improves reliability
- Regex-based extraction is simple and robust

### 4. Sequential Command Processing
**Decision:** Process commands one at a time with 500ms delay

**Why:**
- Avoid rate limiting from LLM providers
- Predictable behavior (easier to debug)
- Simple implementation (no concurrency complexity)

## Integration Points

### Upstream Dependencies
- **03-01 (Enhancement Engine Core):** Provides `EnhancementContext` and `EnhancementResult` types
- **OpenCode config:** Reads settings.json or config.json for model configuration
- **Environment variables:** `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` for authentication

### Downstream Usage
- **03-03 (CLI Integration):** Will call `enhanceAllCommands` from CLI command
- **Future phases:** Enhancement logic ready for production use

## Next Phase Readiness

**Ready for 03-03 (CLI Integration):**
- LLM client fully functional with model detection
- Enhancement logic processes commands and returns results
- Error handling allows graceful degradation
- Test coverage validates all paths

**Blockers/Concerns:**
None. Enhancement logic is production-ready.

**Known Limitations:**
- Only supports Anthropic and OpenAI providers (can extend to others if needed)
- Sequential processing may be slow for large command sets (acceptable for initial version)
- 4096 max_tokens limit (sufficient for command enhancement)

## Performance Notes

**Execution Time:** 6 minutes (2 tasks, 2 commits)
**Test Suite:** 78 tests passing (28 new tests added)
**Commit Strategy:** Atomic per-task commits (llm-client, enhancer)

**LLM API Timing (estimated):**
- Model detection: <1ms (file read + JSON parse)
- Single API call: ~1-3 seconds (network + LLM inference)
- Retry delay: 1 second
- Inter-command delay: 500ms

**For 50 GSD commands:**
- Estimated time: 50 × 2s + 49 × 0.5s = ~125 seconds (~2 minutes)

## Files Changed

### Created
- `src/lib/enhancer/llm-client.ts` (224 lines) - LLM integration
- `src/lib/enhancer/llm-client.test.ts` (327 lines) - LLM client tests
- `src/lib/enhancer/enhancer.ts` (297 lines) - Enhancement logic
- `src/lib/enhancer/enhancer.test.ts` (401 lines) - Enhancement tests

### Modified
None

## Commits

1. **3727216** - `feat(03-02): create LLM client with OpenCode model detection`
   - Detect OpenCode's LLM configuration from settings.json or config.json
   - Support Anthropic and OpenAI providers via direct API calls
   - Implement retry logic with exponential backoff (1 retry)
   - Comprehensive test suite validates model detection and API calling

2. **6853594** - `feat(03-02): create per-command enhancement logic`
   - Build focused prompts with all context (command, GSD source, install.log, docs)
   - Parse LLM responses (handle code fences and plain JSON)
   - Identify changes made by LLM (name, description, template)
   - Graceful failure handling (individual command failures don't stop batch)
   - Filter to only gsd-* commands (preserve existing OpenCode commands)
   - Comprehensive test suite validates prompt building and error handling
