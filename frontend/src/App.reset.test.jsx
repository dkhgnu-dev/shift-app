import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Cycle 4: 従業員管理の「デフォルトリセット」ボタンの恒久コンポーネントテスト。
// ブラウザ実機確認がこのセッションで継続して不可なため(Take2〜4と同じ環境制約)、
// 確認ダイアログ経由での24名デフォルト構成へのリセット、およびキャンセル時に
// 何も変わらないことをjsdom上の実イベントで検証する。
function seedSmallEmployeeList() {
    const small = [
        { name: 'X.X.', type: '準社員', isRS: false, days: 10, shifts: ['①'], requests: '', isKeyHolder: false },
    ];
    window.localStorage.setItem('shift_employees', JSON.stringify(small));
}

beforeEach(() => {
    window.localStorage.clear();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('従業員管理: デフォルトリセットボタン (Cycle4)', () => {
    it('確認ダイアログでOKすると24名のデフォルト構成へリセットされる', () => {
        seedSmallEmployeeList();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        render(<App />);

        fireEvent.click(screen.getByText('従業員管理'));
        expect(screen.getAllByText('X.X.').length).toBeGreaterThan(0);

        fireEvent.click(screen.getByRole('button', { name: /デフォルトリセット/ }));

        expect(window.confirm).toHaveBeenCalledTimes(1);
        expect(screen.getAllByText('K.D.').length).toBeGreaterThan(0);
        expect(screen.getAllByText('N.E.').length).toBeGreaterThan(0);
        expect(screen.getAllByText('N.K.').length).toBeGreaterThan(0);
        expect(screen.queryByText('X.X.')).not.toBeInTheDocument();
    });

    it('確認ダイアログでキャンセルすると従業員リストは変更されない', () => {
        seedSmallEmployeeList();
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        render(<App />);

        fireEvent.click(screen.getByText('従業員管理'));
        fireEvent.click(screen.getByRole('button', { name: /デフォルトリセット/ }));

        expect(window.confirm).toHaveBeenCalledTimes(1);
        expect(screen.getAllByText('X.X.').length).toBeGreaterThan(0);
        expect(screen.queryByText('K.D.')).not.toBeInTheDocument();
    });
});
