# PROJECT_RULES.md

## プロジェクト概要
* **名称:** Shift-Ag (シフト・アグ)
* **目的:** 小売店・ドラッグストア向けシフト自動生成プラットフォーム

## 技術スタック
* **Frontend:** React + Vite, Vanilla CSS, Lucide Icons, LocalStorage
* **Backend:** FastAPI (Python), Google OR-Tools (CP-SAT Solver)
* **Deployment:** Frontend -> Vercel, Backend -> Render

## 開発・コーディング規約
1. **フロントエンド:**
   * CSS変数を活用した一貫性のあるスタイリング。
   * スマホ表示での崩れを防ぐため、ハンバーガーメニューやレスポンシブ配置を維持する。
   * 画面側の時間表示は「8:15～12:15」のように直感的なテキスト表示とする。
2. **バックエンド:**
   * シフト生成モデル (`shift_solver.py`) の制約ロジックを尊重する。
   * ポートフォリオ検索等の並列処理パラメータを崩さない。
