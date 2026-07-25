import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Cycle 4: 従業員管理の「デフォルトリセット」ボタンの恒久コンポーネントテスト。
// ブラウザ実機確認がこのセッションで継続して不可なため(Take2〜4と同じ環境制約)、
// 確認ダイアログ経由での24名デフォルト構成へのリセット、およびキャンセル時に
// 何も変わらないことをjsdom上の実イベントで検証する。
// Take2(Dex差戻し)で追加: リセット時に古いgeneratedResultも消えること、
// および従業員管理画面での鍵持ち表示(上位3名のみ)を検証する。
function seedSmallEmployeeList() {
    const small = [
        { name: 'X.X.', type: '準社員', isRS: false, days: 10, shifts: ['①'], requests: '', isKeyHolder: false },
    ];
    window.localStorage.setItem('shift_employees', JSON.stringify(small));
}

function seedGeneratedResult() {
    const result = { matrix: [[]], isWarningDraft: false, hasError: false, warnings: [] };
    window.localStorage.setItem('shift_generatedResult', JSON.stringify(result));
}

beforeEach(() => {
    window.localStorage.clear();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('従業員管理: デフォルトリセットボタン (Cycle4)', () => {
    it('確認ダイアログでOKすると24名のデフォルト構成へリセットされ、古い生成済みシフトも消える', () => {
        seedSmallEmployeeList();
        seedGeneratedResult();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        render(<App />);

        fireEvent.click(screen.getByText('従業員管理'));
        expect(screen.getAllByText('X.X.').length).toBeGreaterThan(0);
        expect(window.localStorage.getItem('shift_generatedResult')).not.toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /デフォルトリセット/ }));

        expect(window.confirm).toHaveBeenCalledTimes(1);
        expect(screen.getAllByText('K.D.').length).toBeGreaterThan(0);
        expect(screen.getAllByText('N.E.').length).toBeGreaterThan(0);
        expect(screen.getAllByText('N.K.').length).toBeGreaterThan(0);
        expect(screen.queryByText('X.X.')).not.toBeInTheDocument();
        // 従業員構成が変わったのに古い生成結果のmatrixが残ると担当者との対応がズレるため、
        // リセット確定時は生成済みシフトも一緒に破棄される(Take2差戻し対応)。
        expect(window.localStorage.getItem('shift_generatedResult')).toBeNull();
    });

    it('確認ダイアログでキャンセルすると従業員リストも生成済みシフトも変更されない', () => {
        seedSmallEmployeeList();
        seedGeneratedResult();
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        render(<App />);

        fireEvent.click(screen.getByText('従業員管理'));
        fireEvent.click(screen.getByRole('button', { name: /デフォルトリセット/ }));

        expect(window.confirm).toHaveBeenCalledTimes(1);
        expect(screen.getAllByText('X.X.').length).toBeGreaterThan(0);
        expect(screen.queryByText('K.D.')).not.toBeInTheDocument();
        expect(window.localStorage.getItem('shift_generatedResult')).not.toBeNull();
    });

    it('従業員管理画面で上位3名(K.D./N.E./N.K.)にのみ鍵持ち表示があり、4番目以降(T.S.等)には表示がない', () => {
        render(<App />);
        fireEvent.click(screen.getByText('従業員管理'));

        expect(screen.getAllByText('🔑 鍵持ち').length).toBe(3);
        expect(screen.getByText('K.D.').closest('td, div').textContent).toContain('鍵持ち');
        expect(screen.getByText('N.E.').closest('td, div').textContent).toContain('鍵持ち');
        expect(screen.getByText('N.K.').closest('td, div').textContent).toContain('鍵持ち');
        expect(screen.getByText('T.S.').closest('td, div').textContent).not.toContain('鍵持ち');
    });
});
