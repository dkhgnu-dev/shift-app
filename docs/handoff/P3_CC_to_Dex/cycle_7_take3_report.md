[C7 Take3: CC(P3) ⇒ Dex(P4)]

# P3 完了報告 Take3: Cycle 7 フィット倍率算出方法の修正

- 対象ブランチ: `cc-cycle7`
- レビュー対象HEAD: `6802e0f`（push済み、`b1a993e..6802e0f`）
- 対応した指摘: `docs/handoff/P4_Rollback/cycle_7_take3_request.md`（Dex差戻し、Reviewed HEAD: `233a1ff`）

## 対応内容

### 修正: フィット倍率算出方法（実ブラウザのCSS zoom挙動と不一致だった問題）

**原因**: Take2の`computeFitZoom()`は「`table.scrollWidth`は現在のzoom比率が掛かった値である」という前提のもと、`table.scrollWidth / (zoomLevel / 100)`で自然幅（zoom無適用時の実寸）を逆算していました。しかし実ブラウザでは、`table { min-width: 100%; }`（index.cssで既存指定）の影響もあり、`table.scrollWidth`をCSS zoom適用後の値として単純に扱うことができず、この逆算が自然幅を過大評価していました。結果として、Dexの実機確認で以下の不具合が確認されました。

- 1280pxでフィット済み55%の状態から何らかのボタン操作をすると50%へ縮小する。
- 1280px→1600pxへコンテナを広げると、55%→54%へ**縮小**してしまう（本来は倍率が上がるべき）。

**修正**: `frontend/src/App.jsx`の`computeFitZoom()`を、現在の倍率からの逆算をやめ、**測定の瞬間だけ`table.style.zoom`を`'100%'`へ一時的に戻してから`table.scrollWidth`を読み取り、直後に元のzoom値へ戻す**方式に変更しました。

```js
const computeFitZoom = () => {
    const container = tableContainerRef.current;
    const table = container?.querySelector('table');
    if (!container || !table || !container.clientWidth) return 100;
    const previousZoom = table.style.zoom;
    table.style.zoom = '100%';
    const naturalWidth = table.scrollWidth;
    table.style.zoom = previousZoom;
    if (!naturalWidth) return 100;
    const fit = Math.floor((container.clientWidth / naturalWidth) * 100);
    return Math.max(ZOOM_MIN, Math.min(100, fit));
};
```

この方式では、現在の倍率が何であってもzoomを100%に戻した瞬間の実測値を直接読み取るため、逆算・推測が一切不要になります。React stateを介さない同期的なDOMスタイルの読み書き（設定→読み取り→即座に復元）のため、ユーザーにちらつきが見えることもありません。呼び出し元（自動フィットのエフェクト、「画面にフィット」ボタン）は変更していません。

### バージョン更新

ヘッダー（PC用・モバイル用両方）を`v4.27`→`v4.28`に更新しました。

## 変更ファイル

- `frontend/src/App.jsx`（`computeFitZoom`のロジックのみ変更。呼び出し元・エフェクトの構造は変更なし）
- `frontend/src/App.cycle7.test.jsx`（テストモックとズーム関連テストを全面的に修正。下記参照）

Take2で解消済みのダイアログアクセシビリティ・スマホ行ドラッグ無効化、PC固定列40px/140px、スマホ氏名列105px、スマホのフロートボタン非表示、横スクロールボタンの移動量には触れていません。

## 検証内容

### 標準検証コマンド（連続2回実行）

```text
npm --prefix frontend test    -> 1回目: Test Files 4 passed / Tests 38 passed
npm --prefix frontend test    -> 2回目: Test Files 4 passed / Tests 38 passed
node frontend/test_time_utils.mjs  -> 33件全てPASS
npm --prefix frontend run build    -> 成功
```

### 恒久テストの修正（`App.cycle7.test.jsx`）

指摘の通り、Take2までのモック（`scrollWidth = naturalWidth × 現在のzoom`）は実ブラウザの挙動と一致せず、不具合を検出できていませんでした。Take3では以下のように修正しました。

- `withMockedScrollGeometry`ヘルパーを、**`scrollWidth`(自然幅)をzoomの値に関係なく一定として返す**方式に変更（実ブラウザの実態に合わせた前提）。
- `clientWidth`をテスト内で`setClientWidth()`により動的に変更できるようにし、`resize`イベント発火によるコンテナ幅変化のシミュレーションを可能にしました。
- 追加した恒久テスト（5件、Take3ブロックに整理）:
  1. 初期表示で自然幅とコンテナ幅からフィット倍率を自動計算する（自然幅2000px / コンテナ幅1000px → 50%）。
  2. **フィット済みの状態で「画面にフィット」を再度押しても倍率が変わらない**（Take2の不具合「55%→50%へ縮小」の再発防止）。
  3. 拡大後に「画面にフィット」を押すと、初期と同じフィット倍率へ戻る。
  4. **コンテナが広がるとresizeでフィット倍率が上がり（50%→75%）、狭く戻すと元の倍率へ戻る**（Take2の不具合「1280→1600pxで55%→54%へ縮小」の再発防止）。
  5. 拡大・縮小ボタンでの表示率変化（既存維持）。

## 受入確認との対応

| # | 受入確認 | 検証方法 | 結果 |
|---|---|---|---|
| 1 | 1280px初期表示で倍率約55%・scrollWidth<=clientWidth・ボタン非表示 | コンポーネントテスト（モック値での相当ロジック確認） | PASS（コード上、実際のpx値は実機依存） |
| 2 | フィット済みのまま「画面にフィット」→55%前後を維持し50%へ下がらない | コンポーネントテストで検証（50%→再フィット→50%のまま） | PASS |
| 3 | 手動拡大後に「画面にフィット」→初期と同じフィット倍率へ戻る | コンポーネントテストで検証 | PASS |
| 4 | 1280→1600px resizeで倍率が約55%→約74%へ上がり全月表示を維持 | コンポーネントテストで検証（50%→75%の相当ロジック） | PASS（コード上） |
| 5 | 1600→1280px resizeで初期と同じ約55%へ戻る | コンポーネントテストで検証（75%→50%） | PASS |

## 実機確認について（重要・未実施）

**このセッションでもブラウザでの実機確認ができていません。** Cycle 5〜7と同じ理由で、このセッションのBrowserペインが別プロジェクトのdevサーバー設定に固定されており、今回もあらためて起動を試み、同じ結果を確認しました。

上表の各項目、および320/375/768/769/1280pxそれぞれでの実際の見た目・座標・resize往復時の挙動・console warning/errorの有無は、コードレベルの実装とjsdom上のロジックテストのみでの対応です。特に今回の修正は「`table.style.zoom`を一時的に100%へ戻して測定する」という手法自体が実ブラウザで意図通り機能するかが重要な確認ポイントであり、Dexまたはkazumax側での実機確認を強くお願いします。

## まだ不安な点・Dexに特に見てほしい点

- `table.style.zoom`を同期的に書き換えて測定→復元する手法が、実際のブラウザのレイアウト/レンダリングパイプライン上で確実に「100%時点の値」を返すか（ブラウザによっては同期的なstyle変更後すぐの`scrollWidth`読み取りに、レイアウト再計算のタイミング差が生じる可能性がないか）。
- `table { min-width: 100% }`の影響が、100%測定時にも残っていないか（コンテナより内容が小さい月でも、`min-width:100%`によりscrollWidthがコンテナ幅と同じ値に張り付いてしまい、「収まっている」と「ちょうど100%」を区別できないケースがないか）。

## Kazumax確認レベル

必須確認。今回も実機確認が一切できておらず、かつ実ブラウザ特有のzoom/レイアウト挙動が核心のため、Dexまたはkazumax側での実機確認を必ずお願いします。
