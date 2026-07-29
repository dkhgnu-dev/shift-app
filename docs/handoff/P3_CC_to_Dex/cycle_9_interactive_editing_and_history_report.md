[C9: CC(P3) ⇒ Dex(P4)]

# P3 完了報告: Cycle 9「ダイレクトセル調整＆スワップ入れ替え・Undo/Redo履歴」

- 対象ブランチ: `cc-cycle9`
- レビュー対象HEAD: `4c5f268`（push済み、`86f1a59..4c5f268`）
- 対応した指示書: `docs/handoff/P2_Dex_to_CC/cycle_9_interactive_and_history_instructions.md`（Air Blueprint `docs/handoff/P1_Air_Blueprint/cycle_9_interactive_editing_and_history_blueprint.md` を統合済み）

**`main`へはmergeしていません。バージョンは`v4.30`→`v4.31`へ1回だけ更新しました。**

## 対応内容

### 1. セル編集UI（透明select廃止）

- 各セルの透明`<select>`を廃止し、`<button type="button">`（aria-label に従業員名・日付・現在のシフトを含む）へ置き換え。
- 短タップ・クリック・Enter/Spaceで編集画面（モーダル）を開く。編集画面には既存シフト選択・自由時間の開始/終了・注記・セルを空にする・このシフトを交換・保存/キャンセルを配置。
- シフトを選んだ時点ではstateを変更せず、「保存」で1回だけ確定。キャンセル・不正入力・同値保存ではセルも履歴も変更しない（`saveCellDraft`/`cellsAreEquivalent`）。
- 既存の特殊シフト時間編集（旧`specialHoursModal`）も同じdraftへ統合し、別モーダルを廃止。

### 2. 自由時間

- `cycle9Utils.js`の`buildFreeTimeShiftId(start, end)`で安定したID（例: `__custom__10_00_15_00`）を生成し、`shiftMaster`へ登録。セルの`shift`にはそのIDを保存し、同じ時間帯は同じIDを再利用する。
- 入力条件（`00:00 <= start < end <= 24:00`、開始に`24:00`は不可）は`isValidFreeTimeRange`で検証。既存の`TimePicker`/`timeUtils`をそのまま再利用し、時刻計算を重複実装していない。
- `buildShiftTypesPayload()`は既に`shiftMaster`の全エントリを`shift_types`へ送る設計だったため、自由時間IDも追加実装なしで空欄自動作成・最適化生成のpayloadへ自動的に含まれる。
- 集計表示（`computeEmployeeStats`）・登録販売者判定・朝鍵/夜鍵判定は既存の`shiftMaster[cell.shift]`参照ロジックをそのまま使うため、自由時間でも正しく反映される。

### 3. PCドラッグ＆ドロップ / スマホ2点タップ交換

- 行全体の`draggable`を廃止し、従業員並べ替えは左固定列の専用ハンドル（`.drag-handle-compact`）だけをdraggableにした。
- `dragKindRef`（`'employee' | 'cell'`）で行dragとセルdragの種別を分離。セルdragは各セルに`draggable`/`onDragStart`/`onDragOver`/`onDrop`/`onDragEnd`を持たせ、`cellDragSourceRef`で交換元座標を保持。
- スマホ・キーボード共通の「交換待ち」方式（`swapPending`）: 編集画面の「🔄 このシフトを交換」で交換元を選ぶと編集画面を閉じて待機バーを表示し、次の有効なタップ/クリック/Enter・Spaceを交換先とする。同じセルの再タップはキャンセル。月変更・タブ変更・生成開始・従業員構成変更・リセット・Undo/Redoで交換待ちを解除（`closeInteractiveState`）。
- セル交換は`swapMatrixCells`でセルオブジェクト全体（`shift`/`hours`/`note`/`isFixed`/`isError`）を交換する。

### 4. Undo/Redo履歴エンジン

- `cycle9Utils.js`にメモリ内のみの履歴スタック純粋関数（`pushSnapshot`/`undoStep`/`redoStep`、最大20件）を実装。localStorageへは保存せず、再読込で履歴0件に戻る。
- `commitHistory(label, applyFn)`共通関数を新設し、以下すべての操作がこれを1回ずつ経由する: セル編集・空にする・セル交換・希望休ランダム入力・行の並べ替え（PCドラッグ・従業員管理タブの行drag・モバイル上下ボタン）・最適化シフト生成の成功・空欄自動作成の成功。
- 1回のユーザー操作につき履歴は1件だけ。通信開始時には記録せず、成功レスポンス適用の直前にのみ記録。通信失敗・INFEASIBLE・キャンセル・不正入力・同値保存では履歴を変更しない。
- 履歴クリア: 月変更・デフォルトリセット・従業員の追加/削除/編集・シフトマスターの手動構成変更（`addShiftPattern`/`deleteShiftPattern`）で`clearHistory()`を呼ぶ。
- ツールバーに「↩ 戻る」「↪ 進む」ボタンを設置し、`Ctrl/Cmd+Z`（Undo）・`Ctrl/Cmd+Shift+Z`または`Ctrl+Y`（Redo）に対応。`input`/`textarea`/`select`/`contenteditable`内やセル編集draft入力中はブラウザ標準Undoを横取りしない。`isGenerating`中はセル編集・交換・Undo/Redo・行並べ替え（下記CCクルー指摘で追加対応）を無効化する。

### 5. 希望休同期の一本化

- `buildRequestsFromMatrix(matrix, employees)`を新設し、旧来の増分更新関数（`setEmployeeRequestDay`/`parseRequestDays`/`serializeRequestDays`）を削除。セル編集・交換・希望休ランダム入力・最適化生成成功・空欄自動作成成功のすべてで、表示中matrixの「希望休」セルから`employees[].requests`を再構築する単一の共通関数に統一した。

## CCクルー補助レビュー結果（利用: 必須指定に対応、実施済み）

Dex指示（CCクルー利用: 必須）に従い、実装完了後にCCクルー（サブエージェント）を使用し、以下3観点でレビューさせました。

1. タップ・スワイプ・セルdrag・行dragのイベント競合、768/769境界、キーボード操作
2. Undo/Redoの原子性、希望休同期、自由時間shiftMaster、非同期成功・失敗・no-op
3. テストの偽陽性、実行時間、既存Cycle 7/8回帰、無関係ファイル混入

**採用した指摘（2件、いずれも実害のある回帰・バグ）**:

1. **従業員管理タブ（PC版）の行ドラッグ並べ替えが機能しなくなっていた**: `frontend/src/App.jsx`の従業員管理タブのテーブル行`<tr draggable ...>`が`dragKindRef.current = 'employee'`を設定しておらず、`handleSort`の`dragKindRef.current === 'employee'`ガードにより並べ替えが常にno-opになっていました。`dragKindRef`を設定するよう修正し、恒久テスト「従業員管理タブの行dragでも並べ替えができる」を追加しました。
2. **従業員の並べ替え操作に`isGenerating`ガードが無かった**: ダッシュボードの行ドラッグハンドル・従業員管理タブの行drag・モバイル版の上下矢印ボタン（`moveEmployee`）が、生成中でも操作可能になっていました。`isGenerating`中はこれらをすべて無効化（`draggable={!isGenerating}`・ボタンの`disabled`・`handleSort`/`moveEmployee`内の早期return）するよう修正しました。

**不採用の指摘**: なし。

これらの指摘はいずれも修正後、追加した恒久テストで実際に検証（修正前は失敗することも確認済み）しています。

## 変更ファイル

- `frontend/src/App.jsx`（本体: セル編集UI、Undo/Redo、drag種別分離、自由時間、希望休同期の一本化、バージョン更新）
- `frontend/src/cycle9Utils.js`（新規、Cycle9用純粋関数モジュール）
- `frontend/src/cycle9Utils.test.jsx`（新規、純粋関数の恒久テスト31件）
- `frontend/src/App.cycle9.test.jsx`（新規、コンポーネントの恒久テスト25件）
- `frontend/src/App.cycle7.test.jsx`（行の`draggable`判定をtr直接からハンドル要素へ更新。Cycle9のアーキテクチャ変更に伴う既存テストの追従）
- `frontend/src/App.cycle8.test.jsx`（透明select廃止に伴い、select経由の状態読み取りをlocalStorageのgeneratedResult直接読み取りへ変更。3箇所）

バックエンド・API・DB・締め日・従業員初期データ・自動生成制約・Cycle 7の固定列/ズーム/スクロール設計・Cycle 8の目標時間/希望休ランダム入力の仕様には触れていません。

## 検証内容

### 標準検証コマンド（連続2回実行）

```text
npm --prefix frontend test    -> 1回目: Test Files 7 passed / Tests 119 passed（約171秒）
npm --prefix frontend test    -> 2回目: Test Files 7 passed / Tests 119 passed（約177秒）
node frontend/test_time_utils.mjs  -> 33件全てPASS
npm --prefix frontend run build    -> 成功
git diff --check              -> 問題なし
```

`pool: 'forks'`, `maxWorkers: 2`, `testTimeout: 20000`はCycle8 Take4の設定のまま変更していません。

### Cycle9の恒久テスト（56件、24名×31日の巨大DOMは使わず小さなfixtureで実装）

- `cycle9Utils.test.jsx`（31件）: `classifyPointerUp`の短タップ/スワイプ判定境界値、`buildFreeTimeShiftId`/`isValidFreeTimeRange`、`buildCellForSave`の正規化（注記トリム・40文字制限）、`buildRequestsFromMatrix`、`swapMatrixCells`（イミュータブル性含む）、Undo/Redo履歴スタック（20件上限・undo/redo往復）。
- `App.cycle9.test.jsx`（25件）: 透明select不在の確認、マウス/キーボード/短タップでの編集画面オープン、8px以上のスワイプ・pointercancelでの非オープン、768/769px境界、保存/キャンセル/空にする/同値保存no-op、注記の永続化、自由時間の保存とバリデーション、編集画面経由のセル交換とキャンセル、PCのdrag\&dropでのセル交換、**行ドラッグとセル交換の種別分離（ダッシュボード・従業員管理タブ双方、CCクルー指摘の回帰修正を検証）**、Undo/Redoの往復・Redo消去・キーボードショートカット・複数回の履歴積み上げ、生成中の操作禁止、希望休同期。

### 必須テスト20項目との対応

P2指示書9節の1〜20項目のうち、1〜14・16〜20は`App.cycle9.test.jsx`/`cycle9Utils.test.jsx`で直接検証しています。15番目「21回の変更で履歴が20件に制限される」は、境界値そのものを`cycle9Utils.test.jsx`の純粋関数テスト（`pushSnapshot`を21回呼び出し20件に制限されることを検証）で厳密に確認し、コンポーネントテスト側は24名×31日相当の重いUI操作を21回繰り返すコストを避けるため、複数回の連続したセル編集でUndoが正しく積み上がることを確認する軽量な結合テストに留めています（詳細は`App.cycle9.test.jsx`のコメント参照）。

## 実機確認について（重要・未実施）

**このセッションでもブラウザでの実機確認ができていません。** Cycle 5〜8を通じて継続している既知の制約（このセッションのBrowserペインが別プロジェクトのdevサーバー設定に固定される）を、今回も`preview_start`で改めて確認しましたが、表示されたのは全く別のアプリ（「シフトカレンダー」、従業員名「田中太郎」「鈴木花子」等、本プロジェクトとは無関係のUI文言）でした。

以下はコードレベルの実装とjsdom上のコンポーネントテストのみでの対応であり、実機確認ができていません。Dexまたはkazumax側での実機確認を強くお願いします。

- 320/375/768/769/1280pxでの横スワイプ・短タップ・クリック・Enter/Space操作の実際の見た目とちらつきの有無
- スマホ2点交換・PCドラッグ交換の実際の操作感
- 自由時間・注記の保存/再読込/Undo/Redoの実際の挙動
- 行並べ替えとセル交換が実際に干渉しないこと
- 希望休の色・ランダム入力の維持
- 左固定列・左右スクロールボタン・PCズームが崩れていないこと
- タップ領域の重なり・文字切れの有無
- Console error/warningの有無

## まだ不安な点・Dexに特に見てほしい点

1. **`App.cycle7.test.jsx`の「拡大・縮小ボタンで表示中のズーム率が変化する」テストが、標準の一括実行（`pool:'forks', maxWorkers:2`）で断続的にtimeout(20000ms)する**: このセッション環境では、単独実行だと約16〜17秒で安定してPASSしますが、他の重いテストファイルと並列実行される標準コマンドでは、2回に1回程度の頻度で20秒の壁を超えてtimeoutすることがありました（今回の最終確認では連続2回ともPASSしましたが、それ以前の試行では失敗する回もありました）。Cycle9でセルごとのボタン化・pointer/dragハンドラの追加により、24名×31日のマトリクス全体の再描画コストが実質的に増えたことが一因と考えられます。指示書により`testTimeout`の延長は行っていません。日付ラベルの計算を列ごとに1回へ集約する軽量化（`dayLabels`のホイスト）は実施済みですが、大きな改善には至っていません。より根本的な対策（行単位の`React.memo`化等）は変更範囲・リスクの観点からこのサイクルでは見送りました。Dex環境でも同様の断続的timeoutが発生するか確認いただき、発生する場合は次サイクルでの本格的なレンダリング最適化をご検討ください。
2. **CCクルー指摘の2件の回帰修正**（従業員管理タブの行ドラッグ、`isGenerating`中の並べ替えブロック）は、レビュー前の実装に実際に存在していた不具合でした。同種の見落とし（イベントハンドラの一部だけに新しいref/ガードを付け忘れる）が他にないか、Dex側でも重点的にご確認いただけると安心です。
3. **希望休同期を全操作で共通化した影響範囲**: `generateShift`（最適化シフト生成、フル再生成）の成功後にも`buildRequestsFromMatrix`を適用しています。バックエンドは希望休を内部的に「休」へ変換して返す（`shift_solver.py`で確認済み）ため、フル再生成後は画面上の「希望休」マーカーが「休」に変わり、`employees[].requests`もそれに合わせて空になります（＝希望休は「消費される」設計）。これはP2指示書6節「画面と次回生成payloadが完全一致する」という原則に忠実な実装ですが、運用上「希望休を出した従業員が次回も同じ希望休を維持できない」という体験変化になるため、意図した仕様か確認をお願いします。

## Kazumax確認レベル

必須確認。今回も実機確認が一切できていないこと、CCクルーが実装済みの機能に実害のある回帰を2件発見したこと、希望休の「消費」動作について仕様確認が必要なことから、Dexまたはkazumax側での確認を必ずお願いします。
