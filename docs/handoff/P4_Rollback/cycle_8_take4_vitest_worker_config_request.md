# Cycle 8 Take4 - CC差戻し指示

## 方針

Vitest 4.1.10で有効なworker上限へ訂正する。製品コードとCycle 8テスト本体は変更しない。`main`へはmergeしない。

## 必須修正

1. `frontend/vitest.config.js`の`maxForks: 2`を`maxWorkers: 2`へ変更する。
2. Vitest 4の標準poolは`forks`であるため、「既定threadsからforksへ変更した」というコードコメントを訂正する。
3. Take3 P3報告書とP4レビュー依頼に残る同じ説明を訂正し、Take4報告書では「forksを明示し、maxWorkersで同時workerを2へ制限した」と記録する。
4. 標準の全フロントテストを2周連続実行し、63/63 PASS、所要時間、異常終了なしを報告する。

## 変更禁止

- `frontend/src/App.jsx`
- `frontend/src/App.cycle8.test.jsx`
- バックエンド・API・solver
- `v4.30`のversion表記
- `main`へのmerge

## 完了条件

- `maxWorkers: 2`が設定され、`maxForks`が残っていない
- 標準テスト63件を2周連続PASS
- time utils 33/33 PASS
- production build PASS
- `git diff --check` PASS
- Take4報告書とレビュー依頼を作成
- `cc-cycle8`へcommit/pushし、`main`は未統合
