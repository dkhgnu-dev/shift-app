# P4 レビュー依頼: Cycle 2（ハイブリッド空欄自動生成 & 特殊シフト & 鍵持ち・資格者・UI最適化）

## Dexへ

Cycle 2の実装が完了しました。今回もいつも通りレビューをお願いします。

## 何をしたか

`docs/handoff/P2_AirCrew_to_CC/cycle_2_hybrid_and_shift_features_instructions.md` に基づき、以下6点を実装しました（version: v4.11 -> v4.12）。詳細は `docs/handoff/P3_CC_to_Air/cycle_2_implementation_report.md` を参照してください。

1. **手動入力セルの優先保護 ＋ 空欄自動作成**（シフト自動生成ロジックに関わる・危険領域）
   - `backend/models.py`: `FixedAssignment(employee_id, day_index, shift_id)` / `ShiftInput.fixed_assignments` を追加。
   - `backend/shift_solver.py`: `fixed_assignments` にある `(employee_id, day_index)` は `model.Add(x[...] == 1)` で強制固定し、それ以外の値をその日について禁止。既存の希望休強制ロジック（`requested_off`）より優先される設計です。
   - `frontend/src/App.jsx`: 新規「空欄自動作成」ボタン（`fillBlanks`）。現在の表内で値が入っているセルを全て`fixed_assignments`として送信し、空欄セルのみ穴埋め。セルを手動編集すると自動的に`isFixed: true`が付き保護される。

2. **特殊シフト（有休/応援/店長会/研修/勉強会/希望休/公休）**（シフト自動生成ロジックに関わる）
   - `ShiftType.is_special` を追加。`build_shift_coverage` で特殊シフトは時間帯カバレッジを持たず、店舗人数・登録販売者カバレッジ計算・鍵持ち判定から自動除外。ソルバーが空欄セルへ自動的に割り当てることはなく、`fixed_assignments`経由でのみ設定可能（＝手動選択のみ）。
   - フロント側は既定8h（0〜24hで手動調整可）を個人の出勤日数・合計時間には計上。

3. **登録販売者スキマ不在検証 ＋ ❌警告**（フロントのみ・バックエンドwarningsには含まれない）
   - 8:15〜24:00の範囲でRS資格者の実働シフトが1分でも途切れる区間を検出し、日付ヘッダー/モバイルバッジに表示。

4. **鍵持ち（isKeyHolder）朝夜ハイライト ＋ 不在❌警告**（フロントのみ）
   - その日の実働者のうち開始最早/終了最遅を開店/閉店担当とみなし、`isKeyHolder`の有無を判定。セル背景を薄オレンジ/薄緑でハイライト。

5. **左側スタッフ欄コンパクト化＋実績バッジ**（UI・低リスク）

6. **ぽちぽちタイムピッカー**（UI・低リスク）

## どう確認したか

- `python -m py_compile backend/main.py backend/models.py backend/shift_solver.py backend/test_solver.py` → 成功
- `python backend/test_solver.py` → `Status: SUCCESS`
- `backend/shift_solver.py`の`fixed_assignments`ロジックについて追加スクリプトで4パターン検証（fixed_assignmentsなしでwarnings_total=0を維持／特殊シフト固定が正しく維持される／allowed_shifts外の値でも固定セルとして強制される／OFF固定が正しく反映される）→ 全てPASS
- `npm --prefix frontend run build` → 成功
- ローカルで`backend`(uvicorn:8000)・`frontend`(vite:5174)を起動し、ブラウザで実機検証：
  - 実店舗24名構成での通常生成が正常動作
  - 鍵持ちフラグ付与→再生成→開閉店担当日のみ警告が消えることを確認
  - セルを「有休」に変更→時間調整モーダル自動表示→4hに変更→保護(isFixed)・個人合計時間の再計算を確認
  - 別セルを空欄化→「空欄自動作成」実行→空欄のみ穴埋めされ、保護済み「有休」セルは変更されないことを確認
  - 上記操作でRS資格者が有休扱いになった日に、RS不在・鍵不在警告が新たに正しく出現することを確認（特殊シフトの店舗集計除外が機能している証跡）
  - モバイル表示(375px)でのカード表示・警告バッジ・タイムピッカー動作を確認

## まだ不安な点・Dexに特に見てほしい点

1. **`fixed_assignments`の優先順位設計**（危険領域）：`fixed_map`にある`(emp.id, d)`は`requested_off`より優先され、かつ「不可シフト禁止」制約より先に評価する構造にしています（`backend/shift_solver.py`の該当ループ）。今回は希望休と手動固定が同一セルで衝突するケースを想定したテストはしておらず、フロント側も現状「希望休入力欄」と「セル手動編集」が別経路のまま残っているため、両者が矛盾する入力をした場合の挙動（希望休が無視される可能性）は未検証です。
2. **特殊シフトを連勤カウントに含めている点**：有休等を取った日も引き続き「勤務扱い」として連勤上限判定に含まれる設計のままです。休みとして扱うべきか業務判断が必要と考えており、あえて変更していません。
3. **鍵持ちの開閉店判定ロジックの単純さ**：「その日の実働シフトの中で開始最早/終了最遅」という機械的な判定のみです。同時刻複数人・「鍵は特定の1人だけ持ち出し可」等の運用ルールがある場合は未対応です。
4. **RS不在・鍵不在警告がバックエンドのwarningsに反映されない**：現状フロント側の表示専用ロジックです。自動生成ロジック自体はRSカバレッジをほぼハード制約寄りで維持しているため通常は警告が出ない設計ですが、`fixed_assignments`で意図的にRS資格者を特殊シフトへ寄せた場合など、フロントの警告とバックエンドの`warnings`が乖離するケースがあり得ます。
5. Cycle 1から持ち越しの既知バグ（`localStorage`初期データ問題、シフトパターン管理一覧の重複表示）は今回もスコープ外のままです。

## 変更ファイル

- `backend/models.py`
- `backend/shift_solver.py`
- `frontend/src/App.jsx`
- `frontend/src/index.css`
- `.claude/launch.json`（ローカル検証用にbackend起動構成を追加。本番動作に影響なし）

## 変更ブランチ

- `air-cc-dev`（コミット `43efe6b`）

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
