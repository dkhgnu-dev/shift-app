import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Cycle11 P2確定仕様(docs/handoff/P2_Dex_to_CC/cycle_11_health_and_collapsible_instructions.md)
// のApp結合契約テスト。純粋関数の網羅はcycle11Utils.test.jsxが担当するため、ここでは
// 「操作連動」(直接編集・スワップ・Undo/Redo・折りたたみ・既存ジェスチャーとの無干渉)だけを
// 最小fixture(2名)で確認する。テスト数を増やすためだけの重複renderはしない。

function setViewportWidth(width) {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

const DAY_COUNT = 31;
function blankRow() {
    return Array.from({ length: DAY_COUNT }, () => ({}));
}

// 先頭N日を通常シフト('④': 8:15～17:30)で埋めた行を作る(6連勤警告の検証用)。
function workingRow(workingDays) {
    return Array.from({ length: DAY_COUNT }, (_, d) => (d < workingDays ? { shift: '④' } : {}));
}

function seedFixture(matrix) {
    const employees = [
        { name: '太郎', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: null },
        { name: '花子', type: '準社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: null },
    ];
    window.localStorage.setItem('shift_employees', JSON.stringify(employees));
    window.localStorage.setItem('shift_generatedResult', JSON.stringify({ matrix, hasError: false, warnings: [], isWarningDraft: false, violations: [] }));
}

function getCellButton(rowIndex, dayIndex) {
    const table = document.querySelector('table');
    const row = table.querySelectorAll('tbody tr')[rowIndex];
    const dayTds = Array.from(row.querySelectorAll('td')).slice(2);
    return dayTds[dayIndex].querySelector('button');
}

function getShiftSelect() {
    return document.querySelector('.modal select');
}

beforeEach(() => {
    window.localStorage.clear();
    setViewportWidth(1280);
});

afterEach(() => {
    setViewportWidth(1280);
    vi.restoreAllMocks();
});

describe('Cycle11: 健全性チェッカー(6連勤・休息不足)のApp結合', () => {
    it('初期matrixで6連勤警告がaria-label/titleに表示される', () => {
        seedFixture([workingRow(6), blankRow()]);
        render(<App />);
        const btn = getCellButton(0, 5);
        expect(btn.getAttribute('aria-label')).toMatch(/現在6日以上の連続勤務中です（連続6日目）/);
        expect(btn.getAttribute('title')).toMatch(/現在6日以上の連続勤務中です/);
    });

    it('直接編集で警告が即時に出る/消える(setStateするeffectを使わない派生計算であること)', () => {
        // 5連勤(day0-4)まで確定済み、day5はまだ空 -> 警告なし
        seedFixture([workingRow(5), blankRow()]);
        render(<App />);
        expect(getCellButton(0, 5).getAttribute('aria-label')).not.toMatch(/連続勤務中/);

        // day5を直接編集して'④'を保存すると6連勤になり、即座に警告が出る
        fireEvent.click(getCellButton(0, 5));
        fireEvent.change(getShiftSelect(), { target: { value: '④' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));
        expect(getCellButton(0, 5).getAttribute('aria-label')).toMatch(/現在6日以上の連続勤務中です/);

        // 「セルを空にする」で解除すると警告も消える
        fireEvent.click(getCellButton(0, 5));
        fireEvent.click(screen.getByRole('button', { name: 'セルを空にする' }));
        expect(getCellButton(0, 5).getAttribute('aria-label')).not.toMatch(/連続勤務中/);
    });

    it('スワップで警告対象が移り、Undo/Redoで元の警告へ戻る', () => {
        seedFixture([workingRow(6), blankRow()]);
        render(<App />);
        expect(getCellButton(0, 5).getAttribute('aria-label')).toMatch(/連続勤務中/);

        // day5(太郎, 6連勤警告あり)と花子のday5(空)を交換 -> 太郎day5は空になり警告が消える
        fireEvent.click(getCellButton(0, 5));
        fireEvent.click(screen.getByRole('button', { name: /このシフトを交換/ }));
        fireEvent.click(getCellButton(1, 5));
        expect(getCellButton(0, 5).getAttribute('aria-label')).not.toMatch(/連続勤務中/);

        // Undoで交換前(6連勤警告あり)へ戻る
        fireEvent.click(screen.getByRole('button', { name: '元に戻す(Undo)' }));
        expect(getCellButton(0, 5).getAttribute('aria-label')).toMatch(/連続勤務中/);

        // Redoで交換後(警告なし)へ戻る
        fireEvent.click(screen.getByRole('button', { name: 'やり直す(Redo)' }));
        expect(getCellButton(0, 5).getAttribute('aria-label')).not.toMatch(/連続勤務中/);
    });

    it('警告バッジが乗っているセルでも短タップで編集画面が開き、横スワイプでは開かない', () => {
        seedFixture([workingRow(6), blankRow()]);
        render(<App />);
        const btn = getCellButton(0, 5);

        fireEvent.pointerDown(btn, { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerUp(btn, { pointerId: 1, clientX: 102, clientY: 101 });
        expect(screen.getByText(/太郎.*の勤務を編集/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '閉じる' }));

        fireEvent.pointerDown(btn, { pointerId: 2, clientX: 100, clientY: 100 });
        fireEvent.pointerUp(btn, { pointerId: 2, clientX: 130, clientY: 100 });
        expect(screen.queryByText(/太郎.*の勤務を編集/)).not.toBeInTheDocument();
    });

    it('セル編集モーダルにもそのセルの警告詳細が表示される', () => {
        seedFixture([workingRow(6), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 5));
        expect(screen.getByText(/現在6日以上の連続勤務中です（連続6日目）/)).toBeInTheDocument();
    });
});

describe('Cycle11: 氏名列の折りたたみのApp結合', () => {
    it('折りたたみbuttonのaria状態とtableのclassが連動し、再展開できる', () => {
        seedFixture([blankRow(), blankRow()]);
        render(<App />);
        const toggle = screen.getByRole('button', { name: '氏名列を折りたたむ' });
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(document.querySelector('table').className).not.toMatch(/name-col-collapsed/);

        fireEvent.click(toggle);
        const collapsedToggle = screen.getByRole('button', { name: '氏名列を展開する' });
        expect(collapsedToggle).toHaveAttribute('aria-expanded', 'false');
        expect(document.querySelector('table').className).toMatch(/name-col-collapsed/);

        fireEvent.click(collapsedToggle);
        expect(screen.getByRole('button', { name: '氏名列を折りたたむ' })).toHaveAttribute('aria-expanded', 'true');
        expect(document.querySelector('table').className).not.toMatch(/name-col-collapsed/);
    });

    it('折りたたみ中も氏名セルから従業員詳細を開ける(表示はうっすら名字ヒントでもアクセシブル名はフルネーム)', () => {
        seedFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: '氏名列を折りたたむ' }));

        const nameCell = screen.getByRole('button', { name: '太郎の詳細を開く' });
        expect(nameCell).toBeInTheDocument();
        fireEvent.click(nameCell);
        expect(screen.getByText(/目標計上時間との差分/)).toBeInTheDocument();
    });

    it('折りたたみ切替後もzoomの復元契約(table.style.zoomが不整合な値のまま残らない)を壊さない', () => {
        seedFixture([blankRow(), blankRow()]);
        render(<App />);
        const table = document.querySelector('table');
        expect(table.style.zoom).toBe('100%');

        fireEvent.click(screen.getByRole('button', { name: '氏名列を折りたたむ' }));
        // 折りたたみ切替でtable幅を再計測するeffectが走っても、最終的にzoomは
        // 一貫した文字列表現に復元されている(try/finallyの契約を壊していない)。
        expect(document.querySelector('table').style.zoom).toBe('100%');
    });

    it('768pxはスマホ、769pxはPCという既存境界を維持する(氏名列ヘッダー文言)', () => {
        seedFixture([blankRow(), blankRow()]);
        setViewportWidth(768);
        const { unmount } = render(<App />);
        expect(document.querySelector('th.name-col').textContent).toBe('氏名');
        unmount();

        setViewportWidth(769);
        render(<App />);
        expect(document.querySelector('th.name-col').textContent).toBe('従業員');
    });
});
