# Phase 6: Exit Logging - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Comprehensive logging for installer and /gsdo command that captures transpilation and enhancement results. Provides visibility into what operations were performed, their outcomes, and detailed error/warning information. Logging is separate from core functionality — the installer and /gsdo already work, this phase adds observability.

</domain>

<decisions>
## Implementation Decisions

### Log format and structure
- **Hybrid format**: Markdown structure with embedded JSON blocks for machine-readable data
- **Metadata**: Include success/failure counts per log entry (e.g., "12 commands transpiled, 2 warnings, 0 errors")
- **Detail level**: Per-command details showing each command processed with its result
- **Entry separation**: Horizontal rules (---) between log entries for clear visual separation

### Enhancement output detail
- **Live output**: Show per-command progress during execution (e.g., "Enhancing /gsd:plan-phase... ✓ Done")
- **Summary after completion**: Show commands modified count, types of changes made, and path to gsdo.log
- **Diffs**: No inline diffs in terminal — only show change summary (what type of change happened)
- **Log detail**: gsdo.log contains full command JSON before/after and reasoning for each change

### Log rotation and retention
- **Rotation strategy**: Daily files with sequential numbering (install.log, install.1.log, install.2.log)
- **Timing**: Rotate on first run of each day (daily rotation)
- **Cleanup**: Compress old logs (gzip) before deleting after 7 days
- **Retention**: Keep 7 days of logs (compressed archives for logs older than current)

### Error and warning categorization
- **Severity representation**: Standard log levels (INFO, WARN, ERROR)
- **Categorization rule**: ERROR = command broken (won't work in OpenCode), WARNING = suboptimal (works but could be better)
- **Grouping**: Show errors/warnings inline with each command, not in summary sections
- **Error codes**: Use error codes for categorization (e.g., E001: Template extraction failed, W001: Missing description)

### Claude's Discretion
- Exact error code numbering scheme
- Specific wording of log messages
- JSON structure for machine-readable blocks
- Compression algorithm choice (gzip vs other)
- Terminal color codes for live output (if appropriate)

</decisions>

<specifics>
## Specific Ideas

- Logs should be readable in a text editor without tooling (hence hybrid markdown/JSON approach)
- Per-command progress gives user confidence that work is happening, especially with large command sets
- Error codes make it easier to search logs and debug recurring issues
- Separate logs (install.log vs gsdo.log) because they serve different purposes and audiences

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-exit-logging*
*Context gathered: 2026-01-23*
