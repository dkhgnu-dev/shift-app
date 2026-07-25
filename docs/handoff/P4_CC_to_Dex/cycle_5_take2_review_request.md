[C5 Take2: CC ⇒ Dex(P4)]

# Cycle 5 Take2 再レビュー依頼: マトリクス表 固定バグ修正 & テスト安定化

- 対象ブランチ: `cc-cycle5`
- レビュー対象HEAD: push後に追記します
- 前回レビュー: `docs/handoff/P4_Rollback/cycle_5_take2_request.md`（Dex+デクスクルー差戻し）
- 対応報告: `docs/handoff/P3_CC_to_Dex/cycle_5_take2_report.md`

## 対応内容（要約）

1. 月度ヘッダー: `.month-header-nav .btn { width: auto; flex-shrink: 0; }`を追加し、`.header .btn { width: 100% }`が月移動ボタンを潰していた問題を解消。
2. 固定列の対象誤り: Freeze Panesの対象を`nth-child(1)`（ドラッグ列、left:0）と`nth-child(2)`（氏名列、left:40px）に分離。ダッシュボード表のドラッグセル幅を28px→40pxに統一し、オフセットと一致させた。
3. 縦スクロールで固定されない問題: `.table-container`に`max-height: 70vh; overflow: auto;`を追加し、暗黙のoverflow-y昇格による無意味なsticky基準を解消。
4. 標準テストのタイムアウト: `vitest.config.js`に`testTimeout: 20000`を追加。`npm --prefix frontend test`を連続2回実行し17件全PASSを確認。
5. バージョンを`v4.21`→`v4.22`に更新。

詳細な原因分析はP3報告書を参照してください。

## 重要: 実機確認について

**このセッションでもブラウザ実機確認ができていません。** 従来の環境制約（Browserペインが別プロジェクトのdevサーバー設定に固定される）に加え、今回は対象ポートが別プロセスに占有されていました。またDex差戻し文書の指摘通り、jsdomベースの追加テストはDOM構造（固定対象列に正しいデータが乗っているか）のみを検証しており、**実際のCSS適用・レイアウト・sticky挙動の正しさはjsdomでは検証できません**（`App`コンポーネントテストは`index.css`を読み込んでいないため、`getComputedStyle`で確認しても`position: static`のままであることを確認済みです）。

そのため、月度ヘッダーの1行表示、氏名列・日付ヘッダーの実際の固定挙動、縦横同時スクロール時の透過有無は、**コードレベルの原因分析と修正のみ**で、Dexまたはkazumax側での実機確認を強くお願いします。

## 検証結果

```text
npm --prefix frontend test    -> 1回目: Test Files 3 passed / Tests 17 passed
npm --prefix frontend test    -> 2回目: Test Files 3 passed / Tests 17 passed
node frontend/test_time_utils.mjs  -> 33件全てPASS
npm --prefix frontend run build    -> 成功
```

## Dexへの確認依頼事項

1. 320/375/768/769/1280pxで月度ヘッダー（年月・締め期間・矢印ボタン）が欠けずに1行で表示されるか。
2. 右へ350px以上スクロールしても氏名列が左側に固定され続けるか（空のドラッグ列だけが残る状態になっていないか）。
3. 表を縦へ十分スクロールした際、日付ヘッダーが表の上端に固定されるか。
4. 縦横同時スクロール後、左上・氏名・日付セルの重なり順が正しく、背後が透けないか。
5. `max-height: 70vh`が実際の画面で不自然な余白・高さにならないか。
6. 標準テストが引き続き安定して2回連続PASSするか（環境差での再現性）。
