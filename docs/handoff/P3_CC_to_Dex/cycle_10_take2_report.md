# P3報告書: Cycle 10 Take2「Dex(P4)差戻し対応」

## 対応した指示書
`docs/handoff/P4_Rollback/cycle_10_take2.md`

## 差戻し内容と対応

### P2-1: ルール設定タブに不要な下部80px余白
- `.main-content`の余白ロジックを、否定形の`.compact-bottom`（ダッシュボードだけ圧縮）から、Dex推奨の**明示クラス**方式へ変更。
- 下部固定バーが実在する**従業員管理タブだけ**に`.has-mobile-bottom-bar`を付与し、`padding-bottom: calc(env(safe-area-inset-bottom, 8px) + 80px)`を確保。
- それ以外（ダッシュボード・ルール設定）は既定で最小余白`padding-bottom: calc(env(safe-area-inset-bottom, 4px) + 4px)`。
- 変更ファイル: `frontend/src/App.jsx`（`main-content`のclassName算出をactiveTab==='employees'基準に変更）、`frontend/src/index.css`

### P2-2: ハンバーガーボタンが32×32px
- `.hamburger-btn`に`width: 44px; height: 44px;`を追加（アイコン自体は変更せず、タップ領域のみ拡大）。
- 実ブラウザ375pxで`getBoundingClientRect()`により44×44pxを実測確認。

### 恒久テストの追加
- 新規ファイル `frontend/src/App.cycle10.test.jsx` を作成し、以下5件を追加:
  1. 768px・ダッシュボード: 下部固定バーなし・ハンバーガー内に3操作あり
  2. 768px・従業員管理: 下部固定バーあり・`.main-content`に`has-mobile-bottom-bar`が付く
  3. 768px・ルール設定: 下部固定バーも余白クラスもなし
  4. 769px以上: PCヘッダーの3操作を維持、下部バー・ドロワー操作は描画されない
  5. `.hamburger-btn`のCSSソース（`index.css`）を直接検証し、width/heightとも44px以上を恒久的に保証（jsdomはレイアウト計算をしないため、コンポーネントレンダリングではなくCSSソース検証で契約を固定）

### cycle_10_report.mdのGit記録訂正
- `docs/handoff/P3_CC_to_Dex/cycle_10_report.md`の「コミット・push: 未実施（ユーザー承認待ち）」という古い記述を、実際にpush済みだった事実（commit `78d28d7` を`origin/cc-cycle10`へpush済み）に訂正した。

### バージョン
- `v4.34` → `v4.35` に更新（App.jsxのヘッダー/サイドバーロゴバッジ2箇所）。

## 変更ファイル
- `frontend/src/App.jsx`
- `frontend/src/index.css`
- `frontend/src/App.cycle10.test.jsx`（新規）
- `docs/handoff/P3_CC_to_Dex/cycle_10_report.md`（Git記録訂正）
- `docs/handoff/CURRENT_STATUS.md`（本Take2完了に合わせて更新予定）

## 触らなかった範囲（指示通り）
- バックエンド、solver、DB、API形式。
- Cycle 9の履歴・セル編集・スワップロジック。
- 従業員管理タブの下部2操作（デフォルトリセット／新規追加）。
- 氏名列82pxと`.matrix-glass-card`の2px余白。

## どう確認したか
- `npx vitest run` を**2回連続実行し、140/140 PASS**（既存135件+Cycle10新規5件、回帰なし）。
  - 1回目: 148.77秒 / 2回目: 179.93秒
- `node frontend/test_time_utils.mjs`: 33/33 PASS
- `npm run build`: PASS
- `git diff --check`: PASS（CRLF/LF警告のみ）
- devサーバーを起動しBrowserで実機確認（375px幅）:
  - ダッシュボード: `mobile-bottom-bar`なし、`main-content`クラス`main-content `（余白クラスなし）、padding-bottom `4px`
  - ルール設定: 同上、`mobile-bottom-bar`なし、padding-bottom `4px`（**修正確認**：Take1では80pxだった不要余白が解消）
  - 従業員管理: `mobile-bottom-bar`あり、`main-content`クラスに`has-mobile-bottom-bar`付与、padding-bottom `80px`
  - `.hamburger-btn`の`getBoundingClientRect()`実測: `width: 44, height: 44`（**修正確認**：Take1の32×32pxから拡大）
  - Browser console: warning/error 0件
- 769px幅（PC）: ヘッダーに3操作ボタンそのまま、`mobile-bottom-bar`・`sidebar-mobile-actions`・ハンバーガーいずれも非存在を確認（PC導線は無変更）
- 確認後、devサーバー・previewは停止済み

## まだ不安な点
- 320px/768pxちょうどの実ブラウザ確認は上記自動テスト(cycle10テストの768px/769px境界テスト)でカバーしているが、Browser実機ズームでの目視は375pxと769pxのみ実施。必要であれば追加確認可能。

## Dexに特に見てほしい点
- `has-mobile-bottom-bar`という明示クラス方式が、Take1の`compact-bottom`（否定形）に対する改善として意図通りか。
- `App.cycle10.test.jsx`のハンバーガー44px契約テストが、CSSソースの正規表現検証という手法（jsdomがレイアウト計算しないための代替手段）で十分な回帰防止力を持つか。

## Git
- ブランチ: `cc-cycle10`
- 前回HEAD（Take1）: `78d28d7`
- 本Take2の実装コミット: 本報告書と同時にcommit予定、push後にHEADを追記する。
- `main`へのmergeは実施しない（指示通り）。
