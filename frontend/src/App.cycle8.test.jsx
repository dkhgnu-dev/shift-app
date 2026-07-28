import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Cycle 8: 希望休ランダム自動入力ボタンと、残業・不足時間のリアルタイム過不足カラー
// 警告表示の恒久コンポーネントテスト。実際の色見え・見た目のちらつきはjsdomでは
// 検証できないため、DOM構造・状態遷移・ラベル文言のみを検証する。

function setViewportWidth(width) {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

beforeEach(() => {
    window.localStorage.clear();
    setViewportWidth(1280);
});

afterEach(() => {
    setViewportWidth(1280);
    vi.restoreAllMocks();
});

describe('希望休ランダム入力ボタン (Cycle8)', () => {
    it('確認ダイアログでキャンセルすると、従業員の希望休は変更されない', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /希望休ランダム入力/ }));
        expect(window.confirm).toHaveBeenCalled();
        fireEvent.click(screen.getByText('従業員管理'));
        expect(screen.queryByText(/希望休: /)).not.toBeInTheDocument();
        expect(screen.queryByText(/休: /)).not.toBeInTheDocument();
    });

    it('確認後、正社員系は2〜4日・パート系は5〜8日の希望休がランダムに分散配置される', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /希望休ランダム入力/ }));

        fireEvent.click(screen.getByText('従業員管理'));
        const rows = document.querySelectorAll('table tbody tr');
        expect(rows.length).toBeGreaterThan(0);

        // INITIAL_DATAの並び: 先頭6名(正社員/時間限定社員/準社員)が標準層、残りがパート層
        rows.forEach((row, i) => {
            const match = row.textContent.match(/希望休:\s*([\d,\s]+)/);
            expect(match).not.toBeNull();
            const count = match[1].split(',').filter(s => s.trim() !== '').length;
            if (i < 6) {
                expect(count).toBeGreaterThanOrEqual(2);
                expect(count).toBeLessThanOrEqual(4);
            } else {
                expect(count).toBeGreaterThanOrEqual(5);
                expect(count).toBeLessThanOrEqual(8);
            }
        });
    });

    it('再度実行すると、既存の希望休がクリアされて新しい配置に置き換わる(累積で増え続けない)', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /希望休ランダム入力/ }));
        fireEvent.click(screen.getByRole('button', { name: /希望休ランダム入力/ }));

        fireEvent.click(screen.getByText('従業員管理'));
        const rows = document.querySelectorAll('table tbody tr');
        rows.forEach((row, i) => {
            const match = row.textContent.match(/希望休:\s*([\d,\s]+)/);
            const count = match[1].split(',').filter(s => s.trim() !== '').length;
            if (i < 6) {
                expect(count).toBeLessThanOrEqual(4);
            } else {
                expect(count).toBeLessThanOrEqual(8);
            }
        });
    });
});

describe('残業・不足時間のリアルタイム過不足カラー警告 (Cycle8)', () => {
    it('PC幅: シフト未割当の初期状態では、氏名セル下に不足(青)タグが表示される', () => {
        render(<App />);
        const table = document.querySelector('table');
        const firstRow = table.querySelectorAll('tbody tr')[0];
        expect(firstRow.textContent).toMatch(/不足/);
        const badge = firstRow.querySelector('.staff-stat-badge');
        expect(badge).not.toBeNull();
        expect(badge.textContent).toMatch(/不足/);
    });

    it('PC幅: 目標時間を超えるシフトを割り当てると、超過(赤)警告タグへ切り替わる', () => {
        render(<App />);
        const table = document.querySelector('table');
        const firstRow = table.querySelectorAll('tbody tr')[0];
        const selects = firstRow.querySelectorAll('select');
        // K.D.(正社員, 契約23日 -> 目標184h)に④(9.25h/日)を22日分割り当てる(203.5h > 184h+2h)
        for (let d = 0; d < 22; d++) {
            fireEvent.change(selects[d], { target: { value: '④' } });
        }
        const badge = firstRow.querySelector('.staff-stat-badge');
        expect(badge.textContent).toMatch(/超過/);
        expect(badge.textContent).not.toMatch(/不足/);
    });

    it('スマホ幅: 左固定列の圧縮表示には差分タグが出ず、氏名タップ後のポップオーバー内にのみ大きなメーターが表示される', () => {
        setViewportWidth(375);
        render(<App />);
        // 圧縮列側(ポップオーバーを開く前)には差分タグ用のバッジ自体が存在しない
        expect(document.querySelector('.staff-stat-badge')).toBeNull();

        fireEvent.click(screen.getAllByText('K.D.')[0]);
        expect(screen.getByText(/月間目標との差分・残業判定/)).toBeInTheDocument();
        expect(screen.getByText(/不足/)).toBeInTheDocument();
    });
});
