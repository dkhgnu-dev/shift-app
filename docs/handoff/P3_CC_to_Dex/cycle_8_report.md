[C8: CC(P3) ⇒ Dex(P4)]

# P3 完了報告: Cycle 8「希望休ランダム自動入力」＆「残業・不足時間のリアルタイム過不足カラー警告」

- 対象ブランチ: `cc-cycle8`（`main`から分岐）
- レビュー対象HEAD: `3fd2029`（push済み、`main..cc-cycle8`）
- 対応した指示書: `docs/handoff/P2_AirCrew_to_CC/cycle_8_random_holidays_and_overtime_badge_instructions.md`

**mainへはmergeしないでください（未merge）。**

## 対応内容

### 機能1: 🎲 希望休ランダム自動入力ボタン

`frontend/src/App.jsx`に`randomizeHolidayRequests()`を新設し、ダッシュボードタブの操作ボタン群（`renderActions()`内、「空欄自動作成」の左隣）に紫〜濃紺グラデーションの「🎲 希望休ランダム入力」ボタンを追加しました。

```js
const randomizeHolidayRequests = () => {
    if (!window.confirm('現在の各従業員の「休」設定をクリアして、テスト用のリアルな希望休（「休」）を自動で散りばめますか？')) {
        return;
    }
    const dayCount = periodDates.length;
    const isStandardStaff = (type) => (type || '').includes('社員');
    let currentMatrix = generatedResult ? generatedResult.matrix : null;
    if (!currentMatrix) {
        currentMatrix = employees.map(() => periodDates.map(() => ({})));
    }
    // 既存の希望休/休セルだけをクリアし、それ以外の確定シフトは維持する
    const newMatrix = currentMatrix.map(row => row.map(cell => {
        if (cell && (cell.shift === '希望休' || cell.shift === '休')) return {};
        return cell;
    }));

    const dayLoadCount = new Array(dayCount).fill(0);
    const maxPerDay = Math.max(1, Math.ceil(employees.length * 0.4));

    const newEmployees = employees.map((emp, i) => {
        const min = isStandardStaff(emp.type) ? 2 : 5;
        const max = isStandardStaff(emp.type) ? 4 : 8;
        const count = Math.min(Math.floor(Math.random() * (max - min + 1)) + min, dayCount);
        const chosen = new Set();
        let guard = 0;
        while (chosen.size < count && guard < dayCount * 20) {
            guard++;
            const candidateDay = Math.floor(Math.random() * dayCount);
            if (chosen.has(candidateDay)) continue;
            const existingCell = newMatrix[i][candidateDay];
            if (existingCell && existingCell.shift) continue; // 確定シフトが既にある日は避ける
            if (dayLoadCount[candidateDay] >= maxPerDay && Math.random() < 0.7) continue; // 混雑日は緩めに回避
            chosen.add(candidateDay);
        }
        chosen.forEach(d => {
            newMatrix[i][d] = { shift: '希望休', isError: false, isFixed: true };
            dayLoadCount[d] += 1;
        });
        return { ...emp, requests: serializeRequestDays(Array.from(chosen).map(d => d + 1)) };
    });

    setGeneratedResult(prev => ({ ...(prev || {}), matrix: newMatrix }));
    setEmployees(newEmployees);
};
```

**設計上のポイント**:

1. **既存データの意図せぬ上書き防止**: 実行前に必ず`window.confirm`で確認する（指示書指定の文言通り）。
2. **クリア対象を「休」設定に限定**: 既存matrixのうち`希望休`/`休`セルだけを`{}`へ戻し、それ以外（確定済みの通常シフトや特殊シフト）はそのまま維持する。ランダム配置時も、既に確定シフトが入っている日は候補から除外するため、確定シフトを上書きしない。
3. **人数比の分岐**: `type`に「社員」を含む層（正社員/時間限定社員/準社員）は2〜4日、それ以外（各種パート/ロングパート）は5〜8日をランダムに算出。
4. **1日への偏り抑制（簡易版）**: `dayLoadCount`で各日の割当済み人数を追跡し、既に`employees.length × 0.4`人（切り上げ）を超えている日は70%の確率でスキップして別の日を再抽選する簡易分散ロジックを入れた（指示書の「簡素なチェック」要件に対応、完全な均等分散の保証ではない）。
5. **一括反映**: `updateCell()`を人数分ループ呼び出しすると、各呼び出しがクロージャ内の古い`generatedResult`からmatrixを再構築してしまい、直前の呼び出しの変更が上書きされて消える問題があったため、全従業員分をローカル変数`newMatrix`/`newEmployees`上で組み立ててから、`setGeneratedResult`・`setEmployees`をそれぞれ1回ずつ呼ぶ設計にした。
6. 希望休（cell）と`emp.requests`欄は、既存の`setEmployeeRequestDay`と同じ形式（`serializeRequestDays`）で同期させ、二重管理にならないようにした。

### 機能2: 📊 残業・不足時間のリアルタイム過不足カラー警告メーター

`computeOvertimeDiff(i)` / `renderOvertimeDiffTag(i, size)`を新設し、既存の`computeEmployeeStats(i)`（出勤日数・累積時間の実績計算、変更なし）と組み合わせて表示専用の差分計算・カラー表示を追加しました。

```js
const OVERTIME_DIFF_THRESHOLD = 2.0;
const HOURS_PER_CONTRACT_DAY = 8;
const computeOvertimeDiff = (i) => {
    const emp = employees[i];
    const stats = computeEmployeeStats(i);
    const targetHours = (emp?.days || 0) * HOURS_PER_CONTRACT_DAY;
    const diff = stats.hours - targetHours;
    let status = 'ok';
    if (diff > OVERTIME_DIFF_THRESHOLD) status = 'over';
    else if (diff < -OVERTIME_DIFF_THRESHOLD) status = 'under';
    return { targetHours, diff, status };
};
```

**目標時間の算出方法について（要確認事項）**: 既存データモデルには`contractHours`のような時間ベースの目標フィールドが存在せず、契約日数`emp.days`（例: 23日/20日/16日）のみが保持されています。指示書は「`contractHours`や目標`80.0h`/`160.0h`など、各従業員データが保持する時間目安」と例示していましたが、実データに厳密一致するフィールドがなかったため、**目標時間 = 契約日数 × 8h（1日あたり標準8h換算の目安値）**という近似式を採用しました。実際のシフトは4h〜9.25hまで幅があるため、この8h換算はあくまで目安であり、Dex・Kazumax側で妥当性をご確認いただきたい点です（下記「まだ不安な点」参照）。

**色分け・表示のポイント**:

- 🔴 超過（`diff > +2.0h`）: 文字色`#DC2626`、背景`#FEF2F2`、ラベル例 `+19.5h (超過⚠️)`
- 🔵 不足（`diff < -2.0h`）: 文字色`#2563EB`、背景`#EFF6FF`、ラベル例 `-184.0h (不足)`
- 🟢 標準（`-2.0h`〜`+2.0h`）: 文字色`#059669`、ラベル例 `±1.0h (標準)`
- **PC幅（`!isMobileView`）**: 氏名セル下の`staff-stat-badge`（「16日 / 80.0h」の隣）に小さなインラインタグとして追加。
- **スマホ幅（`isMobileView`）**: 左固定列の圧縮表示には一切追加せず（`staff-stat-badge`自体が`!isMobileView`ブロック内にあり、スマホでは元々非表示）、Cycle7の氏名タップ式ポップオーバー内の「🕒 出勤日数/累積勤務時間」の直下に、大きめのカードスタイルで「【月間目標との差分・残業判定】 +19.5h (超過⚠️)」を表示する。

## バージョン更新

ヘッダー（PC用・モバイル用両方）を`v4.29`→`v4.30`に更新しました。

## 変更ファイル

- `frontend/src/App.jsx`
  - `randomizeHolidayRequests()`の新設とダッシュボード操作ボタンへの追加
  - `computeOvertimeDiff()` / `renderOvertimeDiffTag()`の新設
  - PC氏名セルの`staff-stat-badge`への差分タグ追加
  - スマホ用ポップオーバーへの差分メーター（大）追加
  - バージョン表記 `v4.29` → `v4.30`
- `frontend/src/App.cycle8.test.jsx`（新規、恒久テスト6件）

セルの競合ドラッグ操作、保存方式、シフト自動生成ロジック（バックエンドAPI呼び出し部分）には触れていません。

## 検証内容

### 標準検証コマンド（連続2回実行）

```text
npm --prefix frontend test    -> 1回目: Test Files 5 passed / Tests 48 passed
npm --prefix frontend test    -> 2回目: Test Files 5 passed / Tests 48 passed
node frontend/test_time_utils.mjs  -> 33件全てPASS
npm --prefix frontend run build    -> 成功
git diff --check              -> 問題なし
```

### 追加した恒久テスト（`App.cycle8.test.jsx`、6件）

1. 確認ダイアログでキャンセルすると希望休は変更されない
2. 確認後、正社員系は2〜4日・パート系は5〜8日の希望休がランダムに分散配置される
3. 再度実行すると、既存の希望休がクリアされ新しい配置に置き換わる（累積で増え続けない）
4. PC幅: シフト未割当の初期状態では不足(青)タグが表示される
5. PC幅: 目標時間を超えるシフトを割り当てると超過(赤)警告タグへ切り替わる
6. スマホ幅: 左固定列の圧縮表示には差分タグが出ず、氏名タップ後のポップオーバー内にのみ大きなメーターが表示される

## 受入確認との対応

| # | 受入確認 | 検証方法 | 結果 |
|---|---|---|---|
| 1 | 42件(→48件)すべてPASS・build成功 | 連続2回実行 | PASS |
| 2 | ボタンで全員に休が一斉セット | テスト2・3で分散配置と再実行時の置き換えを検証 | PASS（コード上） |
| 3 | シフト時間増減に応じ差分がリアルタイムに色変化 | テスト4・5で不足→超過の切り替わりを検証 | PASS（コード上） |
| 4 | スマホは左端が極薄のまま、ドロワー内にのみ差分メーター | テスト6で検証 | PASS（コード上） |
| 5 | ブラウザConsoleエラー/警告ゼロ | 実機未確認（下記参照） | 未確認 |

## 実機確認について（重要・未実施）

**このセッションでもブラウザでの実機確認ができていません。** Cycle 5〜7と同じ理由で、このセッションのBrowserペインが別プロジェクトのdevサーバー設定に固定されており、今回もあらためて起動を試みましたが同じ結果でした。ボタンの実際の見た目（グラデーション配色）、タグの色・背景色の実ブラウザでの見え方、Console warning/errorの有無は、コードレベルの実装とjsdom上のロジックテストのみでの対応です。Dexまたはkazumax側での実機確認を強くお願いします。

## まだ不安な点・Dexに特に見てほしい点

1. **目標時間の算出方法（最重要）**: 上述の通り、実データに`contractHours`のような時間ベースのフィールドがなく、`契約日数 × 8h`という近似値を独自に採用しました。実際の目標運用時間の算出方法として妥当か、あるいは別の基準（例: 契約タイプごとの固定時間テーブルを別途新設する等）に置き換えるべきか、ご判断をお願いします。
2. **希望休ランダム入力の分散アルゴリズム**: 「1日に集中しすぎない」ロジックは`maxPerDay`超過時に70%の確率でスキップする簡易版であり、厳密な均等分散ではありません。指示書の「第一に...状態を更新すること」の優先順位に従い、簡易実装にとどめています。
3. **`randomizeHolidayRequests()`の巻き戻し**: 実行後に既存の確定シフト（希望休/休以外）は保持される設計ですが、`希望休`/`休`セル自体は無条件でクリアされるため、手動で個別に設定した希望休も一緒にクリアされます（意図した仕様と理解していますが、念のため確認をお願いします）。

## Kazumax確認レベル

必須確認。今回も実機確認が一切できていないこと、目標時間の算出方法に独自の近似（契約日数×8h）を採用していることの2点について、Dexまたはkazumax側での実機確認・判断を必ずお願いします。
