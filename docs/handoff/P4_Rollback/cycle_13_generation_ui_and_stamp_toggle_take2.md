# Cycle 13 P4 Review - Take2 Required

## Review Target

- Branch: `cc-cycle13-generation-ui-stamp-toggle`
- Code reviewed: `f36d6f4`
- Documentation HEAD: `7b590b8`
- Base: `origin/main` (`v4.47`)
- Review result: **Rollback required**

## Finding

### P1: Special-stamp default hours are 4h instead of the approved 8h

The final product decision is that the four special stamps (`有休`, `応援`, `勉強会`, `店長会`) initially count as shift `③` (`8:15-16:15`), namely **8 hours**. The compact palette label remains only the short name; it must not display the duration.

The current code calculates the initial value from shift `①` (`8:15-12:15`) in [App.jsx](../../frontend/src/App.jsx), so the normal default configuration stores `hours: 4`. The implementation tests intentionally assert the same old behaviour in [App.cycle12.test.jsx](../../frontend/src/App.cycle12.test.jsx). Consequently, employee totals and target-hour warnings are understated whenever these stamps are used.

### Required Take2 changes

1. Make all four special stamps initially create `hours: 8` as a fixed product rule. The approved reference is shift `③` (8:15-16:15), but the implementation must not calculate this value from either `①` or `③`; changing or deleting either normal-shift setting must not change the special-stamp default.
2. Preserve the existing individual cell editor so users can change a stamped special shift's hours after placement.
3. Keep palette labels exactly compact: `有休`, `応援`, `勉強会`, `店長会`; do not append `8h` or a time range.
4. Update or remove the old `①`-derived calculation and its pure tests so the code and tests state the approved 8h rule unambiguously.
5. Replace all Cycle 13 UI expectations of `hours: 4` with the appropriate 8h expectations. Add a table-driven or equivalent regression test covering all four stamps, prove that changing or deleting `①`/`③` does not alter the fixed 8h default, and verify the existing edit-after-stamp path still accepts a user-changed value.
6. Run the full frontend test suite, production build, version gate, and `git diff --check`. Increase the visible app version exactly once because the shipped behaviour changes.

## Checked And Accepted In This Review

- Same-stamp re-tap clears the complete cell object, including notes and custom hours.
- Eraser clears any populated cell before permission checks and is a true no-op on blank cells.
- `希望休` mutations rebuild `employees[].requests`; the existing history snapshots restore both matrix and request state with Undo/Redo.
- The four special stamps bypass normal allowed-shift restrictions, as intended.
- Palette labels for the four special stamps are already short names only.
- `origin/main` is an ancestor of the reviewed code; Cycle 13 remains unmerged.

## Verification Performed By Dex

- Static DIFF review against `origin/main...f36d6f4`
- Changed test assertions and stamp event paths inspected
- `git diff --check origin/main...f36d6f4`: PASS
- Targeted regression tests: `61/61` PASS (`cycle12Utils` and `App.cycle12`)
- Production build: PASS

No other release-blocking finding was identified in this pass.

## Dex Crew Record

- Used: yes. This review changes employee-hour totals and has state/history interactions, so two independent crew checks covered stamp/history logic and UI/input behavior in parallel.
- Result: both checks independently found the same 4h policy mismatch and found no additional release-blocking defect. The P1 instruction above is the consolidated decision.
