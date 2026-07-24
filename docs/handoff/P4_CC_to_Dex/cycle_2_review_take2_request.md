# P4 再レビュー依頼: Cycle 2 Take2差し戻し対応

## Dexへ

`docs/handoff/P4_Rollback/cycle_2_review_take2.md`（レビューcommit: `4863652`）で指摘いただいた必須修正7点・仕様確認2点に対応しました。詳細は `docs/handoff/P3_CC_to_Air/cycle_2_implementation_report_take2.md` を参照してください。

## Kazumaxの仕様判断（着手前に確定）

1. **希望休のアーキテクチャ**: テキスト欄（従業員編集モーダル、初回生成前の予約用）は維持。加えてセルで「希望休」を選ぶとテキスト欄(`requests`)と自動同期する一本化を実施し、旧来の「セル側の独立特殊シフト『希望休』」という二重管理自体を廃止しました。
2. **有休の連勤カウント**: ハイブリッドルール。実働連勤上限（5連勤/4連勤）のカウントからは有休を除外する一方、新規に「7日間の窓に真の休み(OFF/公休)が最低1日必要」という法令ハード制約を全雇用形態共通で追加し、有休はこちらでは出勤扱いでカウントします（例:「4連勤+有休+4連勤」の合計9日間・真の休みなしは禁止）。応援・店長会・研修・勉強会は従来通り実働連勤カウントに含めます。

## 必須修正への対応（該当行はTake1レビュー時点のもの、現在の行番号とは異なります）

1. **[P1] INFEASIBLEフォールバックでの固定セル上書き** → `fixed_map`を参照するようフォールバックを書き換え。固定OFF/固定通常/固定特殊いずれも保持。恒久テストに加え、ブラウザ実機でも実際にこの経路を踏んで動作確認済み。
2. **[P1] TimePicker 24:00→00:00** → `Math.min(24, ...)`でクランプする実装に修正。実機で23→▲→24停止、24タップ→24:00維持を確認。
3. **[P1] fixed_assignmentsと強制希望休の優先順位** → Kazumax判断により手動固定優先＋warning表示。実機で衝突を発生させ、警告文言と優先結果を確認済み。
4. **[P2] 不正なfixed_assignmentsの黙殺** → 未知employee/未知shift/期間外day/重複を検証しwarning化。恒久テストで4パターン確認。
5. **[P2] 特殊シフト時間0〜24hの保存時バリデーション** → `applySpecialHours`で範囲外・非数値を保存拒否。実機で30h入力→拒否を確認。
6. **[P2] 表示上の初期時刻とstateの不一致** → `openModal()`のリセット値を`09:00`/`18:00`に修正。実機で無操作のまま追加が機能することを確認。
7. **[P2] 恒久回帰テスト** → `backend/test_cycle2_take2.py`を新規保存。6シナリオ・16アサーション、`python backend/test_cycle2_take2.py`で再実行可能。TimePicker/特殊時間の境界値のみフロントUIロジックのためテスト対象外とし、ブラウザ実機検証で担保。

## 仕様確認事項への対応

- 鍵持ち判定: Dexの判断通り今回は変更なし（次サイクル候補）。
- RS・鍵警告のバックエンドwarnings未反映: 既知の制限として維持。

## どう確認したか

- `python -m py_compile backend/main.py backend/models.py backend/shift_solver.py backend/test_solver.py backend/test_cycle2_take2.py` → 成功
- `python backend/test_solver.py` → `Status: SUCCESS`
- `python backend/test_cycle2_take2.py` → `ALL CYCLE2 TAKE2 REGRESSION TESTS PASSED`
- `npm --prefix frontend run build` → 成功
- ローカルbackend/frontendでブラウザ実機検証（詳細はTake2完了報告参照）

## まだ不安な点・Dexに特に見てほしい点

1. **7日間休み必須ルールの対象範囲**: 全雇用形態共通で一律適用しましたが、雇用形態によって除外すべきケースがないか確認をお願いします。
2. **希望休一本化に伴うUX非対称性**: セル操作は即座にテキスト欄と同期しますが、テキスト欄を直接編集した場合は既存の`saveEmployee`挙動で生成結果が破棄されるため、再生成が必要です。設計として問題ないか意見をいただきたいです。
3. **INFEASIBLEフォールバックへの遷移頻度**: 実機検証で、空欄自動作成中にたった1セルの手動変更でPhase1がINFEASIBLEになるケースに遭遇しました（ほぼ全セル固定＋±1名制約等との衝突と推測）。バグではありませんが、実運用での頻度を留意事項として共有します。

## 変更ファイル

- `backend/shift_solver.py`
- `backend/test_cycle2_take2.py`（新規）
- `frontend/src/App.jsx`

## 変更ブランチ

- `air-cc-dev`（v4.12 -> v4.13）

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
