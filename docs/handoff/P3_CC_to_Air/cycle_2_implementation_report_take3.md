# P3 Take3完了報告: Cycle 2 差し戻し対応

## 対応した指示

- `docs/handoff/P4_Rollback/cycle_2_review_take3.md`（Dex P4 Take3差し戻し、レビューHEAD: `2c49529`、仕様追記commit: `15f1fa0`）

## version

```text
version: v4.13 -> v4.14
```

## Kazumax確定仕様（今回は確認不要として明示済みのため、そのまま実装）

1. **公休・希望休**: 出勤日数、勤務時間、店舗人員、RS、鍵持ち、実働連勤、7日間休みルールの全てで「休み」として扱う。
2. **有休**: 出勤日数・勤務時間には勤務と同じ扱いで計上するが、店舗人員・RS・鍵持ち・実働連勤には数えない（7日間休みルールでは出勤扱い＝これはCycle2 Take2から継続）。
3. **INFEASIBLE時**: 通常出力を停止し、現在の表を更新せず、条件未達の箇所と理由を人が読める形で表示する。利用者が明示的に選んだ場合だけ、違反一覧付きの警告仮シフトを表示できる。固定セルや希望休は黙って変更しない。

## 必須修正への対応

### 1. [P1] INFEASIBLEフォールバックを有効なシフトとして返さない → 対応済み

`backend/shift_solver.py`を全面的に再構成し、`_solve_once(input_data, diagnostic_mode)`として通常モード/診断モードを切り替えられる構造にしました。

- **通常モード**（`diagnostic_mode=False`）: 人数上限(±1名)、5/4連勤の実働上限、7日間休みルールはハード制約のまま。Phase1がINFEASIBLEの場合、**もう「基本仮シフト」を構築して`FEASIBLE_WITH_WARNINGS`を返すことはしません**。
- **診断モード**（`diagnostic_mode=True`）: 上記3種の制約にスラック変数を与えてソフト化し、どの日・どの従業員のどの条件が何日/何名分満たせないかを特定できるようにしました。固定セル(`fixed_assignments`)と希望休(`requests_off`)の強制は診断モードでも一切緩めません（黙って変更して解消することを防ぐため）。
- 通常モードでINFEASIBLEになった場合、内部的に診断モードを自動的に再実行して違反理由を抽出し、`allow_warning_draft`（新規リクエストフィールド、既定`false`）に応じて以下いずれかを返します。
  - `allow_warning_draft=false`（既定）: `status: "INFEASIBLE"`, `shifts: {}`（表は返さない）, `violations: [...]`（具体的な違反一覧）, `message`。
  - `allow_warning_draft=true`: `status: "FEASIBLE_WITH_WARNINGS"`, `is_warning_draft: true`, 診断モードの仮シフト, `violations: [...]`。固定セルはこの仮シフトでも保持されます。

`frontend/src/App.jsx`側もこれに合わせて全面対応しました（詳細は下記フロント対応参照）。

### 2. [P2] 公休・希望休・有休の扱いを確定仕様へ統一する → 対応済み

- `rest_indices`（真の休み＝OFF・公休）を、契約勤務日数の算入対象からも除外するよう`working_days`の計算式を修正（`s_idx not in rest_indices`）。これにより公休・希望休は勤務日数・勤務時間に一切算入されなくなりました。
- `real_work_indices`（5/4連勤の実働上限カウント対象）から、有休に加えて公休も除外するよう修正（Take2時点では公休が漏れていたバグを修正）。
- 7日間休みルールの`rest_indices`は元々OFF・公休のみを対象としており、有休は出勤扱いのまま（変更なし、確定仕様と一致）。

### 3. [P2] 新設の有休ハイブリッド・7日休みルールを実テストする → 対応済み

`test_cycle2_take2.py`に`test_seven_day_rest_rule_scenarios()`を新規追加し、Dex指定の5パターンをすべて実行可能なテストとして実装しました。

1. 6勤務+OFF（休みを中間に挟む形）は許可される
2. 7日連続勤務（真の休みなし）はデフォルトでINFEASIBLE
3. 4勤務+有休+2勤務（真の休みなし）はINFEASIBLE
4. 途中に公休がある7日窓は許可される
5. 期間末尾（30日期間の最後の7日間）を含む窓も同様にINFEASIBLE

### 4. [P2] 前回指摘したID整合性検証を完了する → 対応済み

`_validate_input()`を新設し、`solve_shift()`の最初で以下を検証するようにしました。不正な場合は`ValueError`（`main.py`の既存try/exceptにより理由付きの500エラーとして返る）。

- 重複employee ID
- 重複shift ID
- 予約済みID`OFF`をshift_typesに含めようとした場合

`test_cycle2_take2.py`に`test_id_integrity_validation()`を追加し、3パターンとも例外が発生し、かつ理由が特定できるメッセージであることを確認しました。

### 5. [P2] 恒久テストを前回要件まで拡張する → 対応済み

- バックエンド: `test_cycle2_take2.py`を全面拡張（10関数・30チェック超）。
- フロントエンド: `frontend/src/timeUtils.js`を新設し、TimePickerの時刻計算（`computeHourChange`/`computeMinuteChange`/`formatTime`）と特殊シフト時間の範囲検証（`isValidSpecialHours`）を純粋関数として切り出しました。`App.jsx`の`TimePicker`コンポーネントと`applySpecialHours`はこの共通実装を呼び出すよう変更済みです。
- `frontend/test_time_utils.mjs`を新規作成し、Node単体で実行可能な回帰テスト（24:00境界、0/24/25/負数/非数値の特殊時間境界など18チェック）を追加しました。フレームワーク非依存で、プロジェクト既存の`backend/test_solver.py`と同じ「シンプルスクリプト」方針に合わせています。

## フロントエンド対応（INFEASIBLE/警告仮シフトのUI）

- `generateShift`/`fillBlanks`を`(allowWarningDraft = false)`引数付きに変更し、`allow_warning_draft`をペイロードへ送信するようにしました。ボタンの`onClick`はイベントオブジェクトが誤って引数に渡らないよう`() => generateShift()`の形に修正済みです（この修正をしないと、クリックイベント自体が`allowWarningDraft`として送信されてしまう不具合になるところでした）。
- `status: "INFEASIBLE"`受信時は`setGeneratedResult`を一切呼ばず、新設の`infeasibleInfo`状態に違反一覧を保存して専用パネルに表示します。パネルには「閉じる」と「違反一覧を確認のうえ、警告付き仮シフトを表示する」の2ボタンを設置し、後者を押した場合のみ`allow_warning_draft: true`で再度APIを呼びます。
- `is_warning_draft: true`の応答を受け取った場合は、通常の完成シフトと明確に区別できるよう、赤ストライプ・破線の専用バナー（「⚠️ これは警告付き仮シフトです」）と違反一覧を常時表示します。

## 検証内容

1. `python -m py_compile backend/main.py backend/models.py backend/shift_solver.py backend/test_solver.py backend/test_cycle2_take2.py` → 成功
2. `python backend/test_solver.py` → `Status: SUCCESS`
3. `python backend/test_cycle2_take2.py` → `ALL CYCLE2 TAKE2/TAKE3 REGRESSION TESTS PASSED`
4. `node frontend/test_time_utils.mjs` → `ALL TIME UTILS REGRESSION TESTS PASSED`
5. `npm --prefix frontend run build` → 成功
6. ローカルbackend(8000)/frontend(5174)を起動し、ブラウザ実機で以下を確認（検証後、本番APIのURLへ復元済み）:
   - 通常生成（`最適化シフトを生成`）が引き続き正常動作
   - K.D.の1〜7日目を全て手動固定(④)して「空欄自動作成」を実行 → `status: INFEASIBLE`となり、表が更新されず、5連勤超過・7日間休みルール違反・契約日数超過・RS不在の具体的な違反一覧（日付・従業員名・不足/超過日数付き）がパネル表示されることを確認
   - 「警告付き仮シフトを表示する」ボタンを押す → `⚠️ これは警告付き仮シフトです`バナーに切り替わり、固定した7日間の④が黙って変更されずそのまま保持されていることを確認

## まだ不安な点・Dexに特に見てほしい点

1. **連休上限（連続休みの上限）は診断モードで未ソフト化**: Dexの指摘リストに明示的に含まれていなかったため、連休上限（正社員2連休/パート4連休）は今回も常時ハード制約のままです。この制約単体が原因でINFEASIBLEになった場合、診断モデルもINFEASIBLEになり得るため、`"警告付き仮シフトも作成できませんでした"`という汎用メッセージにフォールバックします（クラッシュはしませんが、詳細な違反理由は出せません）。次サイクルで必要なら連休上限もソフト化candidateとして検討したいです。
2. **診断モードの目的関数の重み付け**: 「人数不足」「5/4連勤超過」「7日間ルール違反」の間で、どれを優先的に解消するかという重み（現在は5/4連勤と7日間ルールを人数より3倍優先）は暫定値です。実際の店舗運用でどの違反を先に見せたいか、Kazumax・友達のフィードバックがあれば調整したいです。
3. **INFEASIBLE時のUI**: 現在はチャット的な一覧パネル＋2ボタンのシンプルな実装です。実際に友達に使ってもらい、文言や導線がわかりやすいか確認いただけると安心です。

## 変更ファイル

- `backend/shift_solver.py`（診断モデル・INFEASIBLE分岐・公休/希望休/有休の確定仕様反映・ID検証）
- `backend/test_cycle2_take2.py`（10関数・恒久テスト拡張）
- `frontend/src/App.jsx`（INFEASIBLE/警告仮シフトのUI、allow_warning_draft送信、purefunction利用）
- `frontend/src/timeUtils.js`（新規: TimePicker/特殊時間検証の純粋関数）
- `frontend/test_time_utils.mjs`（新規: Node実行可能な恒久テスト）
- `backend/models.py`（`allow_warning_draft`フィールド追加）

## Kazumax確認レベル

確認不要（Dexの判定通り、INFEASIBLE時の停止UXと公休・希望休・有休の計算上の扱いはKazumaxが確定済みのため）。
