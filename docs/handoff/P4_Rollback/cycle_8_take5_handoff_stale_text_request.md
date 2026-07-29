# Cycle 8 Take5 - CC文書訂正指示

## 方針

製品コード、テスト、Vitest設定は変更しない。Take3の正式handoffに残る古い`maxForks`前提の現在形記述だけを訂正する。

## 必須修正

1. `docs/handoff/P3_CC_to_Dex/cycle_8_take3_report.md`末尾の「まだ不安な点」2項目を、`maxWorkers: 2`でDex実測済み・最大fork worker 2本・63/63を2周PASSという確定結果へ更新する。
2. `docs/handoff/P4_CC_to_Dex/cycle_8_take3_review_request.md`末尾の確認依頼2番を、Take4で`maxWorkers: 2`へ訂正・Dex実測済みであることが分かる過去形へ更新する。
3. Take3時点の誤りを説明する履歴上の`maxForks`記述は残してよい。現在の設定・懸念であるかのような文章だけをなくす。

## 変更禁止

- `frontend/`配下すべて
- バックエンド・API・solver
- Version表記
- `main`へのmerge

## 完了条件

- 対象2文書の現在形の懸念が`maxWorkers`実測結果へ更新されている
- `git diff --check` PASS
- Take5報告書とレビュー依頼を作成
- `cc-cycle8`へcommit/push
- テスト再実行は不要（コード・設定変更禁止のため）
