# Cycle 9 Dex(P4) 差分レビュー - Take3差し戻し

## 判定

**P4 NG / CC(P3)へTake3差し戻し**

対象:

- branch: `cc-cycle9`
- review HEAD: `1b9787b`
- implementation: `7a3e363..30d4824`
- report update: `30d4824..1b9787b`
- Version: `v4.32`

Take2の7 Findingのうち6件は修正を確認しました。標準テストもDex環境で2回連続PASSしましたが、CCクルーが追加検出した`allowed_shifts`対策に、実際の画面操作で到達できる抜け穴が1件残っています。`main`へmergeしないでください。

## Finding

### P1-1 削除済みシフトIDだけが残ると「全シフト可」へフォールバックする

対象:

- `frontend/src/App.jsx:584`
- `frontend/src/App.jsx:724`
- `backend/shift_solver.py:184`
- `frontend/src/App.cycle9.test.jsx:589`

`resolveAllowedShifts()`は、`employees[].shifts`の配列が非空なら、その内容が現在の`shiftMaster`に存在するかを確認せず、そのまま返しています。

これは報告書にある「通常のUI操作では発生しない状態」ではありません。ルール設定画面の`deleteShiftPattern()`は`shiftMaster`からシフトを削除しますが、そのIDを持つ`employees[].shifts`は更新しません。そのため、次の通常操作で再現できます。

1. 従業員の可能シフトを`④`だけにする。
2. ルール設定で`④`を削除する。
3. 別セルへ自由時間を固定し、「空欄自動作成」を実行する。
4. payloadの`allowed_shifts`は存在しない`④`のまま送られる。
5. solverは有効IDを0件と判定し、「全シフト可」へフォールバックする。
6. `shift_types`へ固定用に含めた自由時間が、別の空欄へ自動配置候補として混入し得る。

CCクルーが見つけた「空=全シフト可」の本質は、元配列の長さではなく、**現在送信する`shift_types`に対する有効IDが0件**であることです。現在のテストは空配列だけを確認しているため、この経路を検出できません。

必須修正:

- `resolveAllowedShifts()`で、現在の通常`shiftMaster`に存在するIDだけへ絞り込む。
- `__custom__`ID、削除済みID、未知IDを除外する。
- 絞り込み後が0件なら、自由時間を除く通常シフトIDを明示してsolverのフォールバックを防ぐ。
- 通常シフト自体が0件なら、生成・空欄自動作成をfetch前に中止して理由を表示する。表・履歴・生成結果は変更せず、処理中表示を確実に解除する。
- 重複IDは1件へ正規化する。
- `employees[].shifts = ['削除済みID']`のケースを恒久テストへ追加する。
- 通常生成と空欄自動作成の両payloadで、`allowed_shifts`が「存在する通常IDのみ・1件以上」になることを確認する。
- 固定自由時間セル自体は`fixed_assignments`の例外で維持し、別セルの候補にはしない。

推奨実装形:

```js
const resolveAllowedShifts = (shifts) => {
    const normalIds = Object.keys(shiftMaster)
        .filter(id => !id.startsWith('__custom__'));
    const normalSet = new Set(normalIds);
    const valid = [...new Set(Array.isArray(shifts) ? shifts : [])]
        .filter(id => normalSet.has(id));
    return valid.length > 0 ? valid : normalIds;
};
```

`deleteShiftPattern()`で従業員側の削除済みIDも整理するとUI表示はより一貫しますが、payload境界の検証は必ず残してください。古いlocalStorageや共同作業で作られた不整合データも安全に扱う必要があるためです。

## 修正補助

### 修正対象

- `frontend/src/App.jsx`の`resolveAllowedShifts()`
- 必要なら`deleteShiftPattern()`
- `frontend/src/App.cycle9.test.jsx`のpayload恒久テスト

### 期待する状態遷移

- 有効な可能シフトがある: その有効IDだけを送る。
- 空配列、削除済みIDだけ、未知IDだけ: 通常シフト一覧を明示して送る。
- 有効IDと未知IDが混在: 有効IDだけを送る。
- 通常シフトが0件: fetchせず安全停止し、表とUndo/Redo履歴を変更しない。
- 固定自由時間: `fixed_assignments`と必要な`shift_types`には残すが、`allowed_shifts`へ入れない。

### 受入確認

1. `shifts=[]`で通常IDのみが明示される。
2. `shifts=['削除済みID']`でも通常IDのみが明示される。
3. `shifts=['④','削除済みID','④']`では、存在する`④`だけが1件送られる。
4. 通常生成と空欄自動作成のどちらにも`__custom__`が`allowed_shifts`として混入しない。
5. 通常シフト0件ではfetchされず、表・生成結果・履歴が変化しない。
6. 標準130件を2回連続PASSし、buildと時刻テストもPASSする。

### 触らない範囲

- バックエンド、solver、DB、API形式は変更しない。
- Take2で閉じた希望休、drag、スワイプ、再試行、focus、fixtureの実装を再設計しない。
- 新機能を追加しない。

## 閉じたFinding

次の6件はコード・差分・テストで修正を確認しました。

- 希望休を生成後と2回目の生成でも保持する。
- Cycle 7/8 fixtureを小型化し、assertionの目的を維持する。
- 従業員管理画面のdragを専用ハンドルへ限定する。
- 往復スワイプの最大移動距離をrefで追跡する。
- INFEASIBLE再試行を最新renderから実行する。
- セルへ`:focus-visible`を表示し、`v4.32`へ更新する。

無関係差分の混入はありません。既知の`AGENTS.md`変更と未追跡共通マニュアル群はレビュー対象commitへ含まれていません。

## Dex検証

```text
npm.cmd --prefix frontend test -- src/App.cycle7.test.jsx src/App.cycle8.test.jsx src/App.cycle9.test.jsx
-> 78/78 PASS、113.93秒

npm.cmd --prefix frontend test
-> 130/130 PASS、195.56秒

npm.cmd --prefix frontend test
-> 130/130 PASS、173.15秒

npm.cmd --prefix frontend run build
-> PASS

npm.cmd --prefix frontend test -- src/utils/time.test.js
-> 33/33 PASS

git diff --check 7a3e363..1b9787b
-> PASS
```

テストは安定PASSしました。CC報告の約113〜114秒よりDex環境では遅いものの、個別20秒timeoutは再現せず、fixture小型化でテスト目的も弱まっていません。

PCブラウザではv4.32、主要UI表示、コンソールエラーなしを確認しました。全幅での最終確認はTake3再レビュー時に行います。

## デクスクルー利用記録

サブレビュー利用: 使用。

- 観点A: テストfixture、専用drag、往復スワイプ、focus、バージョン、無関係差分。
- 観点B: 希望休、自由時間payload、solverフォールバック、非同期状態。
- 統合判断: 既存7 Findingのうち6件は採用してクローズ。`allowed_shifts`の非空・有効0件経路は、DexがUI削除経路とsolver処理を突き合わせてP1として採用。

## Take3出口

- Version: 実装コード修正のため`v4.33`へ更新する。
- CCクルー補助レビュー: 必須。`[]`だけでなく、未知ID・削除済みID・混在・重複を確認する。
- 標準テストを2回連続実行する。
- 時刻テスト、build、`git diff --check`を実行する。
- 完了報告:
  `docs/handoff/P3_CC_to_Dex/cycle_9_interactive_editing_and_history_take3_report.md`
- `cc-cycle9`へcommit/pushし、Dex(P4)へ再レビューを依頼する。
- `main`へはmergeしない。
