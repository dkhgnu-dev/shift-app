[C7: CC(P3) ⇒ Air/Dex]

# P3 完了報告: Cycle 7 スマホ左固定列極限圧縮・詳細ポップオーバー・PCズーム統合

- 対象ブランチ: `cc-cycle7`
- レビュー対象HEAD: push後に追記します
- 対応指示: `docs/handoff/P2_AirCrew_to_CC/cycle_7_zoom_and_viewport_maximization_instructions.md`

## 実装内容

### 1. スマホ表示時の左固定列の極限圧縮

- `frontend/src/index.css`の`@media (max-width: 768px)`内に、`.drag-col { display: none; }`を追加し、ドラッグハンドル列（1列目・40px）を完全非表示にしました。
- 氏名列（2列目）を`left: 0 !important; width/min-width/max-width: 105px !important;`へ圧縮。`nth-child`セレクタは`display: none`の要素も列数として数え続けるため、ドラッグ列を消しても氏名列は引き続き2列目として正しく指定できています（座標のずれは発生しません）。
- 氏名テキスト（`.name-cell-text`）に`font-size: 0.82rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 95px;`を適用。
- 表ヘッダーの「従業員」表記は、`isMobileView`のときのみ「氏名」に短縮しています（`frontend/src/App.jsx`）。

### 2. 氏名セルタップの詳細ポップオーバー

- `frontend/src/App.jsx`に`selectedEmployeeForDetail`ステートを新設。氏名セル（`.name-col`）に`onClick`を追加し、タップ/クリックで従業員indexをセットします。
- 既存の`.modal-overlay`/`.modal`パターンを再利用した`employee-detail-card`を実装。氏名・属性ラベル（雇用区分・登販・鍵持ち）・出勤日数と累積勤務時間・希望休（あれば）を表示し、オーバーレイクリックまたは閉じるボタンで即座に閉じます。
- スマホでは常時非表示にした「属性・累積実績」のサブ情報（`!isMobileView`条件で従来通り表示継続、スマホ時は完全にレンダリングをスキップ）を、このポップオーバーで補完する形にしました。

### 3. シフトセルの2段表示・余白削減

- `renderCellNode`は既に開始/終了時刻を`<br/>`区切りの2段で表示する実装済みだったため、スマホ向けにCSS側で`font-size: 0.76rem !important; line-height: 1.15 !important; padding: 2px 3px !important;`を`.shift-cell`へ適用し、狭いセルでも文字崩れしないよう調整しました。
- ダッシュボードのテーブルを囲む`.glass-card`に`matrix-glass-card`クラスを追加し、スマホでは`padding: 8px !important;`まで切り詰め、表示エリアを最大化しました。

### 4. スマホ／PCのスクロール操作とズームの住み分け

- **スマホ**: `.matrix-float-btn { display: none !important; }`をスマホ用メディアクエリに追加し、オーバーフロー状況に関わらずフロートスクロールボタンを完全に非表示にしました（指スワイプ専用環境）。
- **PC**: 新規に`zoomLevel`ステート（初期100、10%刻み、50〜150%の範囲）と「➖／{ズーム率}%／➕／100%フィット」のコントロール（`.zoom-controls`、`!isMobileView`時のみ表示）を実装。テーブルへ`style={{ zoom: isMobileView ? '100%' : \`${zoomLevel}%\` }}`を適用し、ズームに応じて実際のレイアウト幅が変化する（`zoom`はChromium/Safari系ブラウザで広くサポートされるCSSプロパティです）ようにしました。
- 既存のオーバーフロー検知（`scrollWidth > clientWidth`によるフロートボタンの表示/非表示、Cycle5/6で実装済み）の再計算エフェクトの依存配列に`zoomLevel`を追加し、ズーム操作後もオーバーフロー判定が更新されるようにしました。

### 5. バージョン更新

ヘッダー（PC用・モバイル用両方）を`v4.25`→`v4.26`に更新しました。

## 変更ファイル

- `frontend/src/App.jsx`
- `frontend/src/index.css`
- `frontend/src/App.cycle7.test.jsx`（新規、恒久コンポーネントテスト）

シフト自動生成ロジック、API/backend/DB、Cycle 5で確定した固定列幅40px・氏名列幅140px（**PC版のみ**。今回スマホ版だけを105pxへ別途上書き）、Cycle 6のフロートボタンのPC側ロジックには（スマホでの完全非表示化以外）触れていません。

## 検証内容

### 1. 自動テスト・ビルド（MUST、連続2回実行）

```text
npm --prefix frontend test    -> 1回目: Test Files 4 passed / Tests 27 passed
npm --prefix frontend test    -> 2回目: Test Files 4 passed / Tests 27 passed
node frontend/test_time_utils.mjs  -> 33件全てPASS
npm --prefix frontend run build    -> 成功
```

### 2. 恒久コンポーネントテスト（新規、DOM構造・状態遷移ロジック）

`frontend/src/App.cycle7.test.jsx`に6件追加しました。

- 氏名セルクリックで詳細ポップオーバーが開き、閉じるボタン／オーバーレイクリックで閉じること。
- スマホ幅（`window.innerWidth = 375`を疑似設定）で表ヘッダーが「氏名」に短縮され、サブ情報（属性・累積実績バッジ）がDOMにレンダリングされないこと。
- PC幅では表ヘッダーが「従業員」のままで、サブ情報が表示されること。
- スマホ幅ではズームコントロール自体がレンダリングされないこと。
- PC幅でズームボタン（➕/➖/100%フィット）をクリックすると、表示中のズーム率テキストが正しく変化すること（100%→110%→120%→110%→100%）。

## ブラウザ実機確認について（継続する制約）

**このセッションでもブラウザでの実機確認ができていません。** Cycle 5〜6と同じ理由で、このセッションのBrowserペインが別プロジェクトのdevサーバー設定に固定されており、今回もあらためて起動を試み、同じ結果を確認しました。

そのため、以下はコードレベルの実装とjsdom上のロジックテストのみでの対応です。Dexまたはkazumax側での実機確認を強くお願いします。

- [ ]（未確認）スマホ375px/768pxで、左固定列が実際に100〜110px程度に収まり、氏名がellipsis表示になっているか。
- [ ]（未確認）ドラッグ列が消えたことで座標ズレ（氏名列や日付列の境界の重複・隙間）が生じていないか。
- [ ]（未確認）氏名タップ時のポップオーバーの実際の見た目・アニメーション。
- [ ]（未確認）スマホでのフロートボタン非表示・指スワイプの操作感。
- [ ]（未確認）PC 1280px以上での、ズーム変更時の実際の座標ズレの有無、`zoom` CSSプロパティの実際のブラウザ挙動（`zoom`は非標準ではあるものの主要ブラウザで広くサポートされていますが、実機での見た目確認が必要です）。
- [ ]（未確認）ブラウザconsoleのerror/warning。

## まだ不安な点・Dexに特に見てほしい点

- `zoom` CSSプロパティによるズーム実装が、実際のブラウザで意図通り機能するか（特にレイアウトへの影響範囲や、sticky列との相互作用）。
- スマホで105px幅に圧縮した氏名列と、消えたドラッグ列の間で、実際に座標のずれ（重複・隙間）が発生していないか。
- 詳細ポップオーバーのデザイン（現在はセンターモーダル、指示書ではドロワー案も許容）が意図に沿っているか。

## Kazumax確認レベル

必須確認。今回もCSS/レイアウトの変更が広範囲かつ実機確認が一切できていないため、Dexまたはkazumax側での実機確認を必ずお願いします。
