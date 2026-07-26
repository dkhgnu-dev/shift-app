[C6 Take2: CC(P3) ⇒ Dex(P4)]

# P3 完了報告 Take2: Cycle 6 フロートボタン重複解消・タブ復帰再計算・アクセシビリティ・テスト隔離

- 対象ブランチ: `cc-cycle6`
- レビュー対象HEAD: push後に追記します
- 対応した指摘: `docs/handoff/P4_Rollback/cycle_6_take2_request.md`（Dex差戻しcommit: `2ec953e`）

## 対応内容

### 必須修正1: 320pxの左右ボタン重複

**原因**: 左ボタンを`left: 210px`、右ボタンを`right: 12px`という固定pxのみで配置していたため、wrapper幅が狭い画面（320px等）では両ボタンの矩形が重なっていました（Dex実測: 37px重複）。

**修正**: `frontend/src/index.css`で、左ボタンの`left`を固定値ではなく`min(希望位置, calc(100% - 右ボタン専有幅 - 自身の幅 - 隙間8px))`という動的なクランプ式に変更しました。

```css
/* PC/広め (デフォルト) */
.matrix-float-btn-right { right: 12px; }
.matrix-float-btn-left { left: min(210px, calc(100% - 46px - 12px - 46px - 8px)); }

/* 768px以下 (ボタンを一回り小さくし、専有幅も再計算) */
.matrix-float-btn { width: 36px; height: 36px; }
.matrix-float-btn-right { right: 8px; }
.matrix-float-btn-left { left: min(188px, calc(100% - 36px - 8px - 36px - 8px)); }
```

この式により、wrapper幅がどれだけ狭くなっても、左ボタンの右端は必ず「右ボタンの左端 − 8px」以下に収まるよう構造的に保証されます（320px時の想定計算では、左右ボタン間に厳密に8pxの隙間が残ります）。ごく狭い画面では、この制約を優先した結果、左ボタンが固定氏名列（40+140=180px）の右端に一部かかる場合がありますが、これは「両ボタンが重ならない」という優先条件を満たすための必要な範囲内の挙動です。

### 必須修正2: タブ復帰時の再計算

**原因**: ダッシュボードは`activeTab === 'dashboard'`の条件付き描画のため、他タブへ移動すると`table-container`ごとアンマウントされ、戻ると新しいDOM（`scrollLeft = 0`）として再マウントされます。既存の`useEffect`の依存配列に`activeTab`が含まれておらず、タブ往復後もボタンの表示状態が離脱前のまま残っていました。

**修正**: `frontend/src/App.jsx`の`updateScrollButtons`を呼ぶ`useEffect`の依存配列に`activeTab`を追加しました。Reactのrefアタッチはコミット後・エフェクト実行前に完了するため、`activeTab`変化時にこのエフェクトが発火すれば、常に最新（または非表示中はnullで早期return）の`table-container`を正しく計測できます。

### 必須修正3: 非表示ボタンのアクセシビリティ

**原因**: 従来は`opacity`と`pointerEvents`のインラインスタイルのみで非表示を表現しており、ポインター操作はブロックされていてもTabフォーカス・Enter/Space実行は可能なままでした。

**修正**: 各フロートボタンに`disabled={!canScrollX}` / `tabIndex={canScrollX ? 0 : -1}` / `aria-hidden={!canScrollX}`を付与しました。`disabled`はネイティブのフォーカス除外・クリック不可・キーボード実行不可を保証し、`aria-hidden`は支援技術のアクセシビリティツリーからも除外します。CSS側は`.matrix-float-btn:disabled { opacity: 0; pointer-events: none; }`に統一しました。

### 必須修正4: テスト隔離

**原因**: `App.matrixScroll.test.jsx`で`HTMLElement.prototype`の`clientWidth`/`scrollWidth`/`scrollLeft`を上書きしたまま、テスト後に元へ戻していませんでした。

**修正**: `Object.getOwnPropertyDescriptor`で元のdescriptorを保存し、`try/finally`で必ず復元するヘルパー関数`withMockedScrollGeometry`を導入しました。実装中に判明した点として、jsdomではこれらのプロパティは`HTMLElement.prototype`自身のプロパティではなく`Element.prototype`側からの継承であるため、素朴に「保存した元のdescriptorをそのままdefinePropertyへ渡す」実装では`undefined`が渡されてエラーになりました。保存したdescriptorが存在しない場合は`delete`で独自定義を取り除き、継承元の挙動へ単純に戻す形に修正し、全テストで復元が確実に行われることを確認しました。

### バージョン更新

ヘッダー（PC用・モバイル用両方）を`v4.24`→`v4.25`に更新しました。

## 変更ファイル

- `frontend/src/index.css`（フロートボタンの動的配置、disabled時のopacity/pointer-events）
- `frontend/src/App.jsx`（`activeTab`を再計算エフェクトの依存に追加、disabled/tabIndex/aria-hiddenの付与）
- `frontend/src/App.matrixScroll.test.jsx`（テスト隔離の修正、恒久テストの追加）

## 検証内容

### 標準検証コマンド（連続2回実行）

```text
npm --prefix frontend test    -> 1回目: Test Files 3 passed / Tests 21 passed
npm --prefix frontend test    -> 2回目: Test Files 3 passed / Tests 21 passed
node frontend/test_time_utils.mjs  -> 33件全てPASS
npm --prefix frontend run build    -> 成功
```

### 恒久テスト（差戻し指示書の「恒久テスト」節に対応）

`frontend/src/App.matrixScroll.test.jsx`のCycle6ブロックに以下を追加・修正しました。

1. **タブ往復後の端状態復元**: 表を右端までスクロールした状態から「従業員管理」タブへ移動→「全体シフト表」タブへ戻ると、新しい`table-container`が正しく再計測され、左が無効化・右が操作可能な初期状態へ戻ることを検証。
2. **非表示ボタンのTab除外**: 無効化されたボタンが`disabled`・`tabindex="-1"`・`aria-hidden="true"`を持つことを検証。
3. **320pxの配置はCSSのbreakpoint（`min()`によるクランプ式）の存在で担保し、実ブラウザ実測が必要**である旨を本報告書に明記（下記「実機確認について」参照）。jsdomでは実レイアウトを計算しないため、この点はコードでは保証できません。
4. **prototype descriptor復元の確認**: 修正後、`withMockedScrollGeometry`を使う4つのテストすべてが正常に完走し、後続テストへの影響がないことを確認しました（テスト実行順序を変えても結果が安定することを、ファイル単体実行・フルスイート実行の両方で確認済み）。

## 実機確認について（重要・未実施）

**このセッションでもブラウザでの実機確認・座標実測ができていません。** Cycle 5 Take3で判明した通り、このセッションのBrowserペインは別プロジェクトのdevサーバー設定に固定されており、今回もあらためて起動を試み、同じ結果を確認しました。

そのため、差戻し指示書の「実ブラウザ受入確認」の各項目は未実施です。

- [ ]（未確認）320/375/768/769/1280pxで、左右ボタンの矩形重複が0pxであること。
- [ ]（未確認）両方向へ実際にクリック・タップして戻れること。
- [ ]（未確認）別タブ往復後の端状態が実機でも正しいこと。
- [ ]（未確認）Cycle 5の固定列境界・日付ヘッダー・月度表示に回帰がないこと。
- [ ]（未確認）ブラウザconsoleにerror/warningが出ないこと。

`min()`によるクランプ式は、CSS仕様上、wrapper幅に関わらず両ボタンの矩形が重ならないことを計算上保証する設計ですが、実際のブラウザでの見た目・境界座標はDexまたはKazumax側での実機確認が必要です。

## まだ不安な点・Dexに特に見てほしい点

- `min()`によるクランプ式が、実際のブラウザ（特にSafari/Firefoxの`calc()`内`min()`サポート）で意図通り計算されるか。
- 極端に狭い画面で左ボタンが固定氏名列に一部かぶる挙動が、実際に見て許容範囲か。
- タブ往復時の再計算が、実機での体感でも違和感なく（ちらつき等なく）動作するか。

## Kazumax確認レベル

必須確認。今回もコードレベルの修正のみで実機確認が一切できていないため、Dexまたはkazumax側で320/375/768/769/1280pxの実機確認を必ずお願いします。
