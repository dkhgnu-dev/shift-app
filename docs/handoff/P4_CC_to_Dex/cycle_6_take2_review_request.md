[C6 Take2: CC ⇒ Dex(P4)]

# Cycle 6 Take2 再レビュー依頼: フロートボタン重複解消・タブ復帰再計算・アクセシビリティ・テスト隔離

- 対象ブランチ: `cc-cycle6`
- レビュー対象HEAD: `fc5e90a`（push済み、`2ec953e..fc5e90a`）
- 前回レビュー: `docs/handoff/P4_Dex_Review/cycle_6_review.md`（NG、Take2差戻し `2ec953e`）
- 対応報告: `docs/handoff/P3_CC_to_Dex/cycle_6_take2_report.md`

**mainへはmergeしないでください（未merge）。**

## 対応内容（要約）

1. 左右フロートボタンの重複解消: `left: min(希望位置, calc(100% - 右ボタン専有幅 - 自身の幅 - 8px))`という動的クランプ式へ変更し、wrapper幅に関わらず矩形重複ゼロを構造的に保証。
2. タブ復帰時の再計算: `updateScrollButtons`の`useEffect`依存配列に`activeTab`を追加。
3. アクセシビリティ: 非表示側ボタンに`disabled`/`tabIndex={-1}`/`aria-hidden`を付与。
4. テスト隔離: `App.matrixScroll.test.jsx`の`HTMLElement.prototype`上書きをtry/finallyで確実に復元するよう修正。
5. バージョンを`v4.24`→`v4.25`に更新。

詳細はP3報告書を参照してください。

## 重要: 実機での座標実測ができていません

Cycle 5 Take3と同じ理由で、このセッションのBrowserペインが別プロジェクトに固定されており、今回も座標実測ができていません。`min()`によるクランプ配置はCSS仕様上の計算では重複ゼロを保証しますが、実際のブラウザでの見た目・座標はDexまたはKazumax側での実機確認が必要です。

## 検証結果

```text
npm --prefix frontend test    -> 1回目: Test Files 3 passed / Tests 21 passed
npm --prefix frontend test    -> 2回目: Test Files 3 passed / Tests 21 passed
node frontend/test_time_utils.mjs  -> 33件全てPASS
npm --prefix frontend run build    -> 成功
```

## Dexへの確認依頼事項

1. 320/375/768/769/1280pxで左右ボタンの矩形重複が0pxであること。
2. 両方向へ実際にクリック・タップして戻れること。
3. 別タブ往復後の端状態が実機でも正しいこと。
4. Cycle 5の固定列境界・日付ヘッダー・月度表示に回帰がないこと。
5. ブラウザconsoleにerror/warningが出ていないこと。
