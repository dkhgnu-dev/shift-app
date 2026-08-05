# Cycle 13 P4 Review - Return for Take2

## Target

- Branch: `cc-cycle13-generation-ui-stamp-toggle`
- Reviewed HEAD: `7b590b87112a58f6a07bf01ec65e8770315ade12`
- Implementation commit: `f36d6f4`
- Base: `origin/main` (`90d35dd`)
- Version: `v4.48`

## Decision

**P4 return required. Do not merge into main.**

## Finding

### P1 - Special shift stamps use 4h instead of the confirmed 8h

Kazumax confirmed that `有休`, `応援`, `勉強会`, and `店長会` must use the initial value equivalent to shift `③` (`8:15-16:15`, 8h). The implementation calculates hours from shift `①`, which is normally 4h.

- `frontend/src/App.jsx:1201-1204` calls `computeEarlyShiftHours(shiftMaster, DEFAULT_SPECIAL_HOURS)`.
- `frontend/src/cycle12Utils.js:100-118` reads shift `①`, so the default master returns 4.
- `frontend/src/App.cycle12.test.jsx:602-631` explicitly expects 4h.
- `frontend/src/cycle12Utils.test.jsx:168-180` and `:183-189` encode the same old 4h policy.

This causes a real total-hours error for every newly stamped special shift.

## Required Take2

1. Make all four special stamps create `{ hours: 8 }` regardless of the current setting for shift `①` or `③`.
2. Keep the palette labels short: `有休`, `応援`, `勉強会`, `店長会`. Do not add the hours to the button labels.
3. Remove the obsolete `①`-derived calculation/import if it is no longer used.
4. Replace the 4h assertions with tests that cover all four stamps at 8h.
5. Add a regression test proving that changing or deleting shift `③` does not alter the special-stamp default (the policy is fixed 8h, not a live shift-master calculation).
6. Preserve the existing behaviors: same-stamp toggle clear, eraser clear, request synchronization, Undo/Redo, keyboard/pointer behavior, and individual post-stamp editing.
7. Bump the implementation version from v4.48 and update `CURRENT_STATUS.md`.

## Checks Performed

- `git diff --check origin/main...HEAD`: PASS
- `npx vitest run src/cycle12Utils.test.jsx src/App.cycle12.test.jsx`: 61/61 PASS
- `npm.cmd run build`: PASS

The passing tests do not clear the finding because they assert the obsolete 4h behavior.

## Crew B Result

Generation UI structure, palette labels, fullscreen/inert handling, and pointer/keyboard coverage were reviewed. No separate blocking issue was found in those areas. Browser visual verification remains a non-blocking residual test gap.

## Merge Status

`main` is unchanged. This branch must remain unmerged until Take2 passes P4.
