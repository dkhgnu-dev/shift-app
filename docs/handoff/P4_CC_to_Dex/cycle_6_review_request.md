[C6: CC ⇒ Dex(P4)]

# Cycle 6 レビュー依頼: 左右スクロールボタンの半透明フロート化 & 表示領域最大化

- 対象ブランチ: `cc-cycle6`
- レビュー対象HEAD: push後に追記します
- 対応指示: `docs/handoff/P2_AirCrew_to_CC/cycle_6_floating_scroll_buttons_instructions.md`
- 対応報告: `docs/handoff/P3_CC_to_Air/cycle_6_report.md`

## 対応内容（要約）

1. 表上部の文字入り大型スクロールボタン（`.matrix-scroll-nav`）を完全撤去。
2. `.matrix-scroll-wrapper`（position:relative）の下に、`table-container`と兄弟関係で半透明フロートボタン（正円・グラスモフィズム・`ChevronLeft`/`ChevronRight`）を配置。表がスクロールしてもボタンは画面上の定位置に留まる。
3. `onScroll`と初回マウント・データ変化時に`updateScrollButtons`を実行し、`scrollLeft`が端に達している方向のボタンを`opacity: 0`＋`pointer-events: none`でフェードアウト。
4. バージョンを`v4.23`→`v4.24`に更新。

## 重要: 実機確認について

Cycle 5と同じ理由で、このセッションのBrowserペインが別プロジェクトのdevサーバー設定に固定されており、**今回もブラウザでの実機確認ができていません。** フロートボタンの見た目（半透明・ぼかし・シャドウ）、実際の配置（固定名前列にかぶらないか）、スクロール時の挙動は、コードレベルの実装とjsdom上のロジックテストのみでの対応です。Dexまたはkazumax側での実機確認を強くお願いします。

## 検証結果

```text
npm --prefix frontend test    -> 1回目: Test Files 3 passed / Tests 19 passed
npm --prefix frontend test    -> 2回目: Test Files 3 passed / Tests 19 passed
node frontend/test_time_utils.mjs  -> 33件全てPASS
npm --prefix frontend run build    -> 成功
```

## Dexへの確認依頼事項

1. フロートボタンの見た目（正円・半透明・ぼかし・シャドウ・hover強調）が指示書のデザイン仕様通りか。
2. 左ボタンの位置（PC: `left: 210px`、狭幅768px以下: `left: 188px`）が固定名前列（40+140px）にかぶらず、自然な間隔になっているか。
3. スクロールして端に達した際、正しい方向のボタンだけがフェードアウトするか。
4. 上部ボタン撤去により、実際に表の縦の可視エリアが広がって見えるか。
5. Cycle 5で対応済みの項目（固定列の境界一致、縦スクロール時の日付ヘッダー固定、月度ラベル表示）に回帰がないか。
