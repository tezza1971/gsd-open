# Phase 7: Polish - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Installer UX refinement - zero-input execution completing in under 10 seconds with clear visual presentation, actionable error messages, transparent partial success handling, and platform-adaptive command naming. This phase polishes the user-facing experience of running `npx gsd-open`.

</domain>

<decisions>
## Implementation Decisions

### Success Screen Design
- **ASCII art style:** Celebration graphic (party popper, rocket ship, or victory symbol) - fun and energetic
- **Screen content:** Show all three elements:
  - Commands installed count ("Installed 23 GSD commands")
  - Next steps instruction ("Run /gsdo in OpenCode to enhance")
  - Installation summary (detection path, OpenCode path, cache status)
- **Disclaimer tone:** Honest and direct - "This is a best-effort migration. Review commands before use."
- **Color support:** Yes - use green for success, bold for emphasis when terminal supports it

### Error Message Specificity
- **Detail level:** Actionable - show what failed, why, and how to fix
  - Example: "GSD not found at ~/.claude/get-shit-done/. Install GSD first or check path."
- **Technical info:** Always show paths and specifics to help debugging
- **Documentation links:** Include link to specific troubleshooting guide
  - Format: "See troubleshooting: https://github.com/.../docs/troubleshooting.md"
- **Error formatting:** Use severity prefixes (ERROR/WARNING)
  - Example: "ERROR: GSD not found" vs "WARNING: Cache refresh failed"

### Progress Reporting
- **Progress style:** Step-by-step text output
  - Example: "Detecting GSD...\nDetecting OpenCode...\nTranspiling commands..."
- **Default verbosity:** Moderate - show steps with counts
  - Example: "Detected 23 commands\nTranspiling...\nWrote commands.json"
- **Timing display:** Show per-step timing for granular performance visibility
  - Example: "Transpiling... (1.2s)"
- **Verbosity flags:** Support three modes:
  - `--quiet`: Show only final result (for scripts/automation)
  - Normal: Moderate output (default)
  - `--verbose`: Every action logged (full detail)

### Partial Success Handling
- **Display format:** Summary + failed command list
  - Example: "23 succeeded, 2 failed:\n  - /gsd:foo\n  - /gsd:bar"
- **Exit code:** Exit 2 (partial) - distinct from full success (0) and total failure (1)
  - Scripts can differentiate: 0=full success, 1=total failure, 2=partial
- **Retry guidance:** Both retry suggestion AND log reference
  - "Re-run npx gsd-open to retry failed commands"
  - "See ~/.gsdo/install.log for failure details"
- **Success screen:** Modified success screen for partial vs full success
  - Different ASCII art or message indicating partial completion

### Claude's Discretion
- Exact ASCII art design (party popper vs rocket ship vs other celebration graphic)
- Specific color codes and terminal capability detection approach
- Exact wording of troubleshooting guide URL
- Step-by-step progress message formatting details
- Modified success screen design for partial success

</decisions>

<specifics>
## Specific Ideas

- Error messages should feel helpful, not punishing - guide users to resolution
- Progress output should feel responsive - users know something is happening
- Success screen should feel rewarding - celebrate the migration working
- Timing info helps users understand performance (meets <10s requirement)
- Exit code 2 enables sophisticated scripting (detect partial success programmatically)

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 07-polish*
*Context gathered: 2026-01-23*
