# P4 再レビュー依頼: Cycle 2 Take3差し戻し対応

## Dexへ

`docs/handoff/P4_Rollback/cycle_2_review_take3.md`（仕様追記commit: `15f1fa0`）で確定いただいた仕様に従い、必須修正5点すべてに対応しました。詳細は `docs/handoff/P3_CC_to_Air/cycle_2_implementation_report_take3.md` を参照してください。

## 対応概要

1. **[P1] INFEASIBLEフォールバックを有効なシフトとして返さない**: `shift_solver.py`を`_solve_once(input_data, diagnostic_mode)`構造に全面再構成。通常モードでPhase1がINFEASIBLEの場合、`SUCCESS`/`FEASIBLE_WITH_WARNINGS`は返さず、`status: "INFEASIBLE"`, `shifts: {}`, `violations: [...]`を返すようにしました。診断モード（人数/5-4連勤/7日ルールのみソフト化、固定セル・希望休は絶対に緩めない）で違反箇所を特定し、`allow_warning_draft: true`が明示された場合のみ警告仮シフト（`is_warning_draft: true`）を返します。
2. **[P2] 公休・希望休・有休の扱いを確定仕様へ統一**: 公休を契約勤務日数・勤務時間の算入対象からも除外し、実働連勤上限からも除外（Take2で漏れていたバグを修正）。希望休は元々OFF経由のため既に確定仕様と一致。有休は出勤日数・勤務時間には算入、店舗人員・RS・鍵持ち・実働連勤からは除外（変更なし、確定仕様と一致）。
3. **[P2] 有休ハイブリッド・7日休みルールの実テスト**: Dex指定5パターン（6勤務+OFF許可/7日連勤拒否/4勤務+有休+2勤務拒否/公休を含む7日窓許可/期間末尾の窓）を`test_cycle2_take2.py`に実装。
4. **[P2] ID整合性検証**: 重複employee ID、重複shift ID、予約ID`OFF`の3パターンを検証しエラー化。テスト追加済み。
5. **[P2] 恒久テストの拡張**: バックエンドは`test_cycle2_take2.py`を10関数に拡張。フロントは`frontend/src/timeUtils.js`に純粋関数を切り出し、`frontend/test_time_utils.mjs`（Node実行可能、フレームワーク不要）で24:00境界・特殊時間0/24/25/負数/非数値を含む18チェックを追加しました。

## どう確認したか

- `python -m py_compile backend/main.py backend/models.py backend/shift_solver.py backend/test_solver.py backend/test_cycle2_take2.py` → 成功
- `python backend/test_solver.py` → `Status: SUCCESS`
- `python backend/test_cycle2_take2.py` → `ALL CYCLE2 TAKE2/TAKE3 REGRESSION TESTS PASSED`
- `node frontend/test_time_utils.mjs` → `ALL TIME UTILS REGRESSION TESTS PASSED`
- `npm --prefix frontend run build` → 成功
- ローカルbackend/frontendでブラウザ実機検証: K.D.の1〜7日目を全て手動固定して空欄自動作成を実行 → `INFEASIBLE`で表が更新されず、5連勤超過・7日間ルール違反・契約日数超過・RS不在の具体的な違反一覧が表示されることを確認。「警告付き仮シフトを表示する」ボタンで明示的に切り替えると、専用バナー付きで固定セルを保持したまま仮シフトが表示されることを確認。

## まだ不安な点・Dexに特に見てほしい点

1. **連休上限（連続休みの上限）は診断モードで未ソフト化**: Dexの必須修正リストに明示的な言及がなかったため、正社員2連休/パート4連休の上限は今回も常時ハード制約のままです。この制約のみが原因でINFEASIBLEになった場合、診断モデルもINFEASIBLEになり得るため、詳細な違反理由を出せない汎用フォールバックメッセージになります（クラッシュはしません）。次サイクル候補としてご確認いただきたいです。
2. **診断モードの目的関数の重み付け**: 人数不足/5-4連勤超過/7日間ルール違反の優先度（現在は連勤・7日ルールを人数の3倍優先）は暫定値です。実運用でのフィードバックがあれば調整したいです。

## 変更ファイル

- `backend/shift_solver.py`
- `backend/models.py`（`allow_warning_draft`追加）
- `backend/test_cycle2_take2.py`
- `frontend/src/App.jsx`
- `frontend/src/timeUtils.js`（新規）
- `frontend/test_time_utils.mjs`（新規）

## 変更ブランチ

- `air-cc-dev`（v4.13 -> v4.14）

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
