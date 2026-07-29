# P4 DIFF Review - Cycle 8 Take3

## 判定

**P4 NG（Vitest設定と説明の訂正のみ）。製品ロジックと追加テストは承認可能だが、意図したworker上限が有効になっていないためTake4へ差し戻す。**

レビュー対象:

- Branch: `cc-cycle8`
- Target HEAD: `859c99e`
- Implementation commit: `68726cf`
- Base: `280947c`

## Finding

### [P1] Vitest 4.1.10で`maxForks: 2`は認識されない

対象:

- `frontend/vitest.config.js:17-23`
- `docs/handoff/P3_CC_to_Dex/cycle_8_take3_report.md`
- `docs/handoff/P4_CC_to_Dex/cycle_8_take3_review_request.md`

このリポジトリのVitestは4.1.10であり、CLIヘルプとインストール済み型定義ではworker上限の設定名は`maxWorkers`である。`maxForks`は定義されておらず、現在の値は無視される。

また、Vitest 4.1.10の標準poolはすでに`forks`である。したがって「既定のthreadsからforksへ変更してメモリ問題を解消した」という原因説明も成立しない。

標準テストはDex環境で63/63を2回連続完走したが、これは`maxForks: 2`で同時プロセス数を制限した結果ではない。現在のままでは、環境によって意図した最大2 workerが保証されない。

修正:

```js
pool: 'forks',
maxWorkers: 2,
```

コードコメント、P3報告書、P4レビュー依頼も、Vitest 4の実仕様に合わせて訂正すること。

## Take2指摘への対応確認

- matrixとrequestsの日番号配列を直接`toEqual`: OK。件数だけの偽陽性を防げる
- PC・スマホの不足・標準・超過: OK。代表値を双方で検証
- 空き2日・目標4日の部分不足: OK。matrix、requests、通知、既存シフト保持を検証
- `frontend/src/App.jsx`: 差分なし
- バックエンド・API・solver: 差分なし
- Version: `v4.30`維持

## 独立検証

- `npm.cmd --prefix frontend test` 1周目: 63/63 PASS、約146秒
- `npm.cmd --prefix frontend test` 2周目: 63/63 PASS、約149秒
- time utils: 33/33 PASS
- production build: PASS
- `git diff --check 280947c..859c99e`: PASS
- `git diff --exit-code 280947c..859c99e -- frontend/src/App.jsx`: PASS（差分なし）
- Vitest CLI: `pool`既定値は`forks`、`maxWorkers`あり、`maxForks`なし
- PC実機: `v4.30`、全体シフト表の表示を確認
- 375px実機: 画面横はみ出しなし、console warning/error 0件

## デクスクルー利用記録

- 利用判断: 使用
- 理由: テスト安定化設定、メモリ対策、偽陽性の再監査を並行して確認するため
- 観点: Vitest v4設定契約、追加テスト3件の実効性、範囲外変更
- 採用: `maxForks`無効、標準poolの説明誤り
- 不採用: なし
- 最終責任・判定: Dex

## Kazumax確認レベル

**現時点では確認不要。** 製品UIの問題ではなく、CCがテスト設定と報告説明だけを訂正する。
