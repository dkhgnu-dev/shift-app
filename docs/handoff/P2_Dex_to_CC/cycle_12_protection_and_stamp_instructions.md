# [C12: Dex(P2) ⇒ CC(P3)] 手動配置保護・スタンプモード 最終実装指示書

## 0. P2判定

Air設計の方向性は採用する。ただし、次の安全条件をすべて実装・検証することをCycle 12の必須条件とする。

- 通常生成で保護するのは「手動由来または由来不明の入力済みセル」だけとし、`isFixed:false`の自動生成セルは再最適化できること。
- 固定値に不整合が1件でもある場合は、そのセルだけを無視して続行せず、表を更新しないfail-closedとすること。
- バックエンド応答からシフトIDを戻すだけでなく、保護セルの元オブジェクトを丸ごと再合成し、`hours` / `note` / `isFixed` / `isError` / `希望休`表示を失わないこと。
- v4.38の未評価差分にある日別上限値の持ち越し、不完全な祝日判定、特殊シフトの時間帯均等化混入を同時に解消すること。

### 対象基点

- branch: `cc-cycle12-stamp-and-protect`
- P1 Blueprint: `docs/handoff/P1_Air_Blueprint/cycle_12_shift_protection_and_stamp_mode.md`
- P2作成時HEAD: `cfcd3a561a23bac2befa45c6b49dbc100f4fbbd1`
- 画面version: `v4.38`
- 未評価差分: `4755975` / `550d0ba`

## 1. 変更範囲

### 主な変更候補

- `frontend/src/App.jsx`
- `frontend/src/cycle12Utils.js`（純粋関数を分離する場合）
- `frontend/src/App.cycle12.test.jsx`
- `frontend/src/cycle12Utils.test.jsx`
- `frontend/src/index.css`
- `backend/models.py`
- `backend/shift_solver.py`
- `backend/requirements.txt`
- `backend/test_cycle12.py`または同等の新規回帰テスト
- `docs/handoff/CURRENT_STATUS.md`
- `docs/handoff/P3_CC_to_Dex/cycle_12_protection_and_stamp_report.md`

### 触らない範囲

- API URL、デプロイ先、永続化形式を変えない。
- Cycle 9のUndo/Redo 20件上限、スワップ、希望休同期を別方式へ作り直さない。
- Cycle 7のズーム、Cycle 11の氏名列折りたたみ・健全性警告を変えない。
- 自動生成の既存制約を「固定セルを通すため」に緩めない。矛盾時はINFEASIBLEで停止する。
- `pool:'forks'`、`maxWorkers:2`、`testTimeout:20000`を変更しない。

## 2. 通常生成の手動セル保護

### 2.1 保護対象の判定

共通の純粋関数で保護セルを抽出する。

- 通常の「最適化シフトを生成」:
  - `cell.shift` が存在し、`cell.isFixed !== false` のセルだけを保護する。
  - `isFixed:true` は手動セルとして保護する。
  - `isFixed:false` は自動生成由来として再生成を許可する。
  - 古いlocalStorageの `isFixed`未設定セルは、データ損失防止を優先して保護する。
- 「空欄自動作成」:
  - 現行仕様どおり、値が入った全セルを保護する。

この2つの判定を混ぜない。

### 2.2 payload

- `generateShift()`の `fixed_assignments: []` を廃止し、2.1で抽出した保護セルを送る。
- `休` / `希望休` は `OFF` として送る。
- `__custom__`固定セルは、`fillBlanks()`と同じく参照中IDを `buildShiftTypesPayload(referencedCustomIds)` へ含める。
- 保護セル抽出結果はfetch開始時にスナップショット化し、応答処理で同じ座標・同じ元オブジェクトを使う。
- 保護セルの重複座標を生成しない。

### 2.3 応答の反映

- SUCCESS / FEASIBLE_WITH_WARNINGSのどちらでも、バックエンドのmatrix構築後に、保護座標は生成開始時の元セルオブジェクトで上書き再合成する。
- `shift` だけでなく、`hours` / `note` / `isFixed` / `isError` 等の全属性を保持する。
- `希望休`は表示上も `希望休`のまま保持し、`buildRequestsFromMatrix()`後の `employees[].requests` と完全一致させる。
- INFEASIBLE / HTTPエラー / JSONエラー / 通信例外では、matrix、employees、generatedResult付随情報、Undo/Redoを一切変更しない。
- 生成成功時だけ1履歴として `commitHistory()` を通す。

### 2.4 生成中の状態競合防止

- `isGenerating`中は月変更、リセット、従業員追加/編集/削除、ルール/シフトマスター変更、セル編集、スタンプ、スワップ、Undo/Redoを無効化する。
- 連打等で複数要求が返っても、最新の要求だけが反映できるrequest tokenまたは同等のガードを設ける。
- 生成開始時にスタンプモード、セル編集、swap待ち、dragを解除する。

## 3. バックエンド固定制約のfail-closed化

- 現行の `model.Add(x[(e_idx, d, fixed_s_idx)] == 1)` は維持する。通常・診断・警告付き仮シフト・Phase1 FEASIBLEフォールバックでも絶対に緩めない。
- 以下の `fixed_assignments` 不整合はwarningで無視せず入力エラーにする。
  - 未知employee ID
  - 期間外day index
  - 未知/削除済みshift ID
  - 同一employee/dayの重複
- 固定非OFFと強制希望休が同一セルで衝突した場合も、「後勝ち」や「手動優先」で続行せず入力不整合として停止する。通常UIは `buildRequestsFromMatrix()` で衝突を解消してから送ること。
- 入力エラー時はHTTP 4xxまたは同等の明確な失敗応答とし、`shifts` を返さない。フロントは理由を表示し、現在表を保持する。
- Pydanticのリスト初期値は、可能な範囲で `Field(default_factory=list)` にし、共有可変デフォルトを避ける。

## 4. v4.38未評価差分の必須是正

### 4.1 土日祝50%以上出勤

- 分母は現行仕様どおり、payloadに含まれる全従業員 `len(employees)` とする。
- `base_max_allowed` を日ごとに `day_max` へコピーし、土日祝で引き上げるのは当日の `day_max` だけとする。共通の `max_allowed` をloop内で書き換えない。
- 50%制約と固定セルが矛盾したらINFEASIBLEとし、固定セルを緩めない。
- 祝日判定は不完全な手書き `is_japanese_holiday()` を延命せず、PyPIの `jpholiday==1.0.3`（Python >=3.9）を `backend/requirements.txt` に固定追加し、`jpholiday.is_holiday(date)` を使う。
- 国民の休日、連続祝日後の振替休日、通常日をテストする。

### 4.2 時間帯均等化

- 現行の正確な仕様は「早番数と遅番数の差を抑える」であり、MIDは中立とする。「早・中・遅の3区分を完全均等」とは書かない。
- `is_special:true` の有休・公休・応援・研修等をEARLY/LATE集計から除外する。
- 固定された通常勤務シフトは集計に含める。
- EARLY/MID/LATEの境界時刻と特殊シフト除外を純粋関数テストで固定する。

## 5. スタンプモード

### 5.1 状態モデル

最低限、次を分離する。

- `stampModeEnabled: boolean`
- `activeStamp: null | { shiftId, label, ...必要な安全属性 }`

モードON時はactive stampが必ず明示されること。パレット候補は次に限定する。

- 現在存在する通常シフト
- `休`
- `希望休`
- 現在のmatrixまたはshiftMasterで実在する有効な `__custom__`自由時間

勤務時間入力が必要な特殊シフトは、属性欠落を防ぐためCycle 12のスタンプ候補に含めない。

### 5.2 一回のスタンプ

- 既存の `classifyPointerUp()` を共通利用し、有効な短タップの `pointerup` でのみ1セルを更新する。
- `pointermove`中は塗らない。8px以上の最大移動、350ms超過、pointercancel、複数指、pointer ID不一致は破棄する。往復スワイプも最大距離で破棄する。
- キーボードのEnter/Spaceによる `click(detail===0)` でも同じスタンプを1回実行する。通常モードでは従来どおりエディターを開く。
- スタンプで書いたセルは `isFixed:true` にする。
- 同じシフトを同じセルへ重ねた場合はno-opとし、matrix、履歴、Redo、noteを変更しない。
- 異なる値へスタンプした場合は、1セルの変更を1履歴として `commitHistory()` に通す。
- スタンプ後は `buildRequestsFromMatrix()` を通し、希望休と `employees[].requests` を即時一致させる。
- `generatedResult`全体をnullにせず、matrixと既存付随情報を維持する。
- 通常シフトは対象従業員の有効な許可シフトだけ塗れる。許可外の場合は変更せず理由を表示する。`resolveAllowedShifts()`と異なる判定を新たに捏造しない。

### 5.3 操作の排他

- スタンプONへ切り替えるときにセルエディター、swap待ち、セルdrag、行drag、pointer追跡を解除する。
- スタンプON中はセルエディターを開かない、swapを開始・確定しない、PCセルdragを開始しない。セルの `draggable` もfalseにする。
- Undo/Redo後は連続入力性を優先し、スタンプモードとactive stampを維持してよい。
- 月変更、タブ変更、自動生成開始、従業員構成変更、デフォルトリセットではスタンプモードを終了する。
- active stampに選択中のshift IDがルール設定で削除されたら、active stampをnullにしてモードを安全停止する。

### 5.4 UI・アクセシビリティ

- 既存Lucideの `Paintbrush` 等を使い、独自SVGや絵文字だけの操作子にしない。
- モードトグルに `aria-pressed`、パレット各候補に意味のあるラベル、現在の筆に `aria-live` または同等の通知を持たせる。
- 選択中の筆とスタンプ対象は色だけでなく、文字・枠・状態属性でも判別できるようにする。
- 320 / 375 / 768pxでタップ対象を44px以上にし、パレットは折り返しまたは独立した横スクロールで表の幅を押し広げない。
- PC・スマホとも、表の固定列、ズーム、左右フロートボタンと重ねない。

## 6. 必須自動テスト

### 6.1 フロントエンド

1. 通常生成payloadに `isFixed:true`の通常シフト、休、希望休、自由時間が固定割当として入る。
2. `isFixed:false`の自動生成セルは通常生成payloadの固定割当に入らない。
3. `isFixed`未設定の旧セルは安全側で保護される。
4. 保護された `shift/hours/note/isFixed/isError` がSUCCESSと警告付き仮シフトで完全一致する。
5. INFEASIBLE / HTTPエラー / 通信例外でmatrix、generatedResult、employees、Undo/Redoが不変。
6. 短タップは1回だけスタンプし、横スワイプ、往復スワイプ、pointercancel、複数指では不変。
7. スタンプON中にモーダル、swap、セルdragが発火しない。
8. 連続3セルが3履歴となり、Undoで1セルずつ戻り、Redoで同じ順序に復元する。
9. 同値スタンプで履歴とRedoを増減しない。
10. 希望休スタンプとUndo/Redoで `employees[].requests` が常に一致する。
11. 通常シフト0件でも `休` / `希望休` スタンプは使え、自動生成は従来どおりfetchせず停止する。
12. 生成中の構成変更と古い応答反映を防ぐ。
13. キーボード操作、`aria-pressed`、現在の筆ラベルを確認する。

テストは小さいfixtureと純粋関数を主体にし、不要な24名×31日DOM操作を増やさない。

### 6.2 バックエンド

1. 固定通常シフト、OFF、特殊シフト、自由時間が通常・診断モードで保持される。
2. 未知employee、期間外day、未知shift、重複固定はすべてfail-closed。
3. 固定非OFFと強制希望休の衝突はfail-closed。
4. Phase1 FEASIBLE、Phase2失敗のフォールバックでも固定値が不変。
5. 土日祝は切り上げ50%以上となり、その後の平日に `day_max` が漏れない。
6. 通常祝日、振替休日、国民の休日、非祝日の境界を確認する。
7. 特殊シフトがEARLY/LATE差分へ入らない。
8. EARLY/MID/LATE境界と、MIDを早遅差分に含めない現行仕様を確認する。

## 7. 手動・ビルド・速度検証

CCは少なくとも以下を実行する。

```text
npm.cmd --prefix frontend test -- --run
node frontend/test_time_utils.mjs
npm.cmd --prefix frontend run build
python -u backend/test_solver.py
python -u backend/test_cycle2_take2.py
python -u backend/test_cycle12.py
node scripts/check_version_gate.mjs <Cycle12実装前のbase commit>
git diff --check
git status --short --branch
```

- Cycle 12対象テストは2回連続PASSさせる。
- フロントエンド全テストはタイムアウト0件で完了させる。
- Dex基準確認で `backend/test_solver.py` はSUCCESS。`backend/test_cycle2_take2.py` は全check PASSを表示したが、プロセス終了が300秒を超えた。CCはPASS表示だけで「高速完了」と扱わず、テストを小型化・分割するか、正式な実行上限と実測時間をP3に記録する。
- 実機UIは 320 / 375 / 768 / 769 / 1280px でパレット、表、固定列、横スワイプ、ズームを確認する。
- 実機確認ができない場合は「未実施」と明記し、実施済みと書かない。

## 8. CCクルー利用判断

**CCクルー利用: 必須**

理由: フロントエンドのpayload・タッチ・履歴と、バックエンドのCP-SAT・祝日・既存v4.38制約が同時に変更されるため。

CCクルーに次を分担させる。

1. 固定セル抽出、payload、応答再合成、失敗経路の独立レビュー。
2. CP-SAT固定制約、fail-closed、土日祝day max、特殊シフト除外の独立レビュー。
3. スタンプ・pointer・swap・drag・Undo/Redoテストの独立レビュー。

P3報告に「CCクルー補助レビュー結果」を設け、指摘、採否、修正commit、残余リスクを要約する。CCクルーはDex(P4)の代替ではない。

## 9. version・Git・完了報告

- 実装開始直前とmerge直前に最新mainの画面versionを再確認する。
- mainが `v4.38` のままなら、Cycle 12は `v4.39` へ一度だけ更新する。mainが進んでいたら勝手に採番せず停止する。
- `frontend/src/App.jsx` のPC/スマホ2か所と `CURRENT_STATUS.md` を一致させる。
- `frontend/package.json` の `0.0.0` は変えない。
- branchは `cc-cycle12-stamp-and-protect`。mainへはmergeしない。
- `git add .`は使わず、対象ファイルだけをstageする。
- 既存の `AGENTS.md` 変更、`.cursorrules`、`CLAUDE.md`、`docs/manual_legacy/` は今回のcommitに含めない。
- P3報告を `docs/handoff/P3_CC_to_Dex/cycle_12_protection_and_stamp_report.md` に保存する。
- P3報告に変更前/後version、対象HEAD、全変更ファイル、テスト実測時間、CCクルー結果、未実施確認、残余リスクを記載する。

## 10. Dex(P4)の受入基準

Dexは次をすべて確認する。

- 手動・由来不明セルが完全保持され、自動生成セルは再最適化できる。
- 不正な固定データは一部無視されず安全停止する。
- INFEASIBLE・警告仮シフト・通信失敗で保護対象が変化しない。
- スタンプは短タップのみで原子的に動き、スワイプ・swap・dragと干渉しない。
- v4.38の3指摘（day max、祝日、特殊シフト）が回帰テスト付きで解消される。
- 全テスト、build、version gate、diff checkがPASSする。
- 範囲外差分、未追跡混入、mainへの先行mergeがない。

## 11. デクスクルー統合結果

サブレビュー利用判断: **使用**。理由: バックエンド制約とフロントのタッチ/履歴を独立した複数視点で確認する必要があるため。

- デクスクルーA: 固定割当、CP-SAT、v4.38未評価制約を監査。固定無送信、不正固定の部分無視、day max持ち越し、祝日欠落、特殊シフト混入を指摘。すべて採用。
- デクスクルーB: 保護対象の由来判定、応答再合成、スタンプとpointer/swap/drag/Undoの排他を監査。すべて採用。
- Dex最終判断: 両結果を実コードで再確認し、本指示書の必須条件として統合した。
- 残余リスク: UI座標と実際のタッチ感はブラウザ実機確認が必要。新規祝日依存関係はRender buildでも確認する。
