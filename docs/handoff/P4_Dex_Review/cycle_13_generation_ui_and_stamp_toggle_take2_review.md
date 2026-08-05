# Cycle 13 Take2 P4 Review - Approved

## Reviewed Target

- Branch: `cc-cycle13-generation-ui-stamp-toggle`
- Implementation: `181a826`
- Documentation HEAD: `c608d5d`
- Base: `origin/main` (`90d35dd`)
- Version: `v4.49`

## Decision

**P4 approved. Do not merge to `main` as part of this review.**

The four special stamps (`有休`, `応援`, `勉強会`, `店長会`) now create a fixed `hours: 8` cell. `resolveStampHours(shiftId)` has no shift-master argument, so modifying or deleting normal shifts `①` and `③` cannot change this rule. Palette labels remain compact, and the existing cell editor can still change an individual stamped cell after placement.

## Existing 4h Cells

**No automatic migration is required or recommended.**

`shift_generatedResult` is persisted in localStorage and a cell with `hours: 4` can be a deliberate manual edit. The application cannot safely distinguish a deliberately edited 4h cell from a Cycle 13 Take1-created cell. Rewriting all saved 4h special cells would therefore risk changing a user's confirmed data without consent.

- Existing cells keep their saved value, including 4h.
- New taps of the four Cycle 13 stamps always start at 8h.
- A user can correct an older cell through the normal cell editor when needed.

## Constant Decision

**No further constant consolidation is required.**

`SPECIAL_STAMP_DEFAULT_HOURS` is the fixed policy for the four stamp-only options. `DEFAULT_SPECIAL_HOURS` remains the editor/display fallback for the wider existing special-shift set, including legacy records and shifts not offered as stamps. They have the same current numeric value but different responsibilities; merging them would make a future policy change harder to express safely.

## Verification

- Static DIFF review against `9cc5ba5...181a826`: PASS
- `git diff --check`: PASS
- Targeted stamp tests: `67/67` PASS
- Production build: PASS
- CC full-suite report: `254/254` PASS twice
- Version gate report: PASS (`v4.49`)

## Dex Crew Record

- Used: no.
- Reason: this is a small, isolated correction to a previously crew-audited feature. A direct P4 review of the two source files, saved-data behavior, and focused regression suite was faster and sufficient. This choice does not reduce the required verification above.

## Next

Cycle 13 is ready for the normal P5 integration decision. `main` remains unchanged by this P4 review.
