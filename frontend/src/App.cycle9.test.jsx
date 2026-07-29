import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Cycle9: セル直接編集・スワップ交換・Undo/Redoの恒久コンポーネントテスト。
// Dex P2指示により、24名×31日の巨大DOMを避け、小さな2名×αのfixtureを使う。

function setViewportWidth(width) {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

function seedSmallFixture(matrixOverride) {
    const employees = [
        { name: '太郎', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④', '⑦'], requests: '', targetHours: null },
        { name: '花子', type: '準社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: null },
    ];
    window.localStorage.setItem('shift_employees', JSON.stringify(employees));
    if (matrixOverride) {
        window.localStorage.setItem('shift_generatedResult', JSON.stringify({ matrix: matrixOverride, hasError: false, warnings: [], isWarningDraft: false, violations: [] }));
    }
}

function readMatrix() {
    const raw = window.localStorage.getItem('shift_generatedResult');
    if (!raw) return null;
    return JSON.parse(raw).matrix;
}

// dayCountは実行時の対象期間に依存するため、テストでは十分に大きい固定長で埋めておく。
const DAY_COUNT = 31;
function blankRow() {
    return Array.from({ length: DAY_COUNT }, () => ({}));
}

function getCellButton(rowIndex, dayIndex) {
    const table = document.querySelector('table');
    const row = table.querySelectorAll('tbody tr')[rowIndex];
    // drag-col + name-col の次から日付セルが始まる
    const dayTds = Array.from(row.querySelectorAll('td')).slice(2);
    return dayTds[dayIndex].querySelector('button');
}

// 編集画面内のシフト選択<select>を取得する(現在値に関わらず一意に取得できる)。
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

describe('セル編集画面の入口 (Cycle9)', () => {
    it('透明selectは存在せず、セルにbuttonが1つずつある', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        const table = document.querySelector('table');
        expect(table.querySelectorAll('select').length).toBe(0);
        const firstRow = table.querySelectorAll('tbody tr')[0];
        const dayTds = Array.from(firstRow.querySelectorAll('td')).slice(2);
        dayTds.forEach(td => {
            expect(td.querySelectorAll('button').length).toBe(1);
        });
    });

    it('クリック(マウス)で編集画面が1回だけ開く', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        const btn = getCellButton(0, 0);
        fireEvent.click(btn);
        expect(screen.getAllByText(/太郎.*の勤務を編集/).length).toBe(1);
    });

    it('Enterキー(キーボード)で編集画面が開く', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        const btn = getCellButton(0, 0);
        btn.focus();
        fireEvent.click(btn, { detail: 0 }); // ネイティブbuttonのEnter/Spaceはdetail:0のclickとして発火する
        expect(screen.getByText(/太郎.*の勤務を編集/)).toBeInTheDocument();
    });

    it('8px未満・350ms以内の短タップ(pointerdown/up)で編集画面が開く', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        const btn = getCellButton(0, 0);
        fireEvent.pointerDown(btn, { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerUp(btn, { pointerId: 1, clientX: 102, clientY: 101 });
        expect(screen.getByText(/太郎.*の勤務を編集/)).toBeInTheDocument();
    });

    it('30px横スワイプ(8px以上の移動)では編集画面が開かない', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        const btn = getCellButton(0, 0);
        fireEvent.pointerDown(btn, { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerUp(btn, { pointerId: 1, clientX: 130, clientY: 100 });
        expect(screen.queryByText(/太郎.*の勤務を編集/)).not.toBeInTheDocument();
    });

    it('pointercancelでは編集画面が開かない', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        const btn = getCellButton(0, 0);
        fireEvent.pointerDown(btn, { pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerCancel(btn, { pointerId: 1 });
        fireEvent.pointerUp(btn, { pointerId: 1, clientX: 100, clientY: 100 });
        expect(screen.queryByText(/太郎.*の勤務を編集/)).not.toBeInTheDocument();
    });

    it('768pxはスマホ方式、769pxはPC方式で表示が切り替わる', () => {
        setViewportWidth(768);
        const { unmount } = render(<App />);
        expect(document.querySelector('th.name-col').textContent).toBe('氏名');
        unmount();

        setViewportWidth(769);
        render(<App />);
        expect(document.querySelector('th.name-col').textContent).toBe('従業員');
    });
});

describe('セル編集の保存/キャンセル/空にする (Cycle9)', () => {
    it('保存すると選択したシフトがmatrixへ反映され、Undoが有効になる', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '④' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        expect(readMatrix()[0][0].shift).toBe('④');
        expect(screen.getByRole('button', { name: '元に戻す(Undo)' })).not.toBeDisabled();
    });

    it('キャンセルするとmatrixは変更されない', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '④' } });
        fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

        expect(readMatrix()[0][0]).toEqual({});
    });

    it('同値保存(未設定のまま保存)ではmatrixも履歴も変更しない', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        expect(screen.getByRole('button', { name: '元に戻す(Undo)' })).toBeDisabled();
    });

    it('「セルを空にする」で確定シフトを空セルへ戻せる', () => {
        seedSmallFixture([[{ shift: '④', isFixed: true, isError: false }, ...blankRow().slice(1)], blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.click(screen.getByRole('button', { name: 'セルを空にする' }));

        expect(readMatrix()[0][0]).toEqual({});
    });

    it('注記を保存すると次回開いたときに引き継がれる', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '④' } });
        fireEvent.change(screen.getByPlaceholderText('例: 早退18:00まで'), { target: { value: '早退17:00' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        expect(readMatrix()[0][0].note).toBe('早退17:00');

        fireEvent.click(getCellButton(0, 0));
        expect(screen.getByPlaceholderText('例: 早退18:00まで').value).toBe('早退17:00');
    });
});

describe('自由時間 (Cycle9)', () => {
    it('自由時間を保存すると、shiftMasterへ登録され集計・表示に反映される', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.click(screen.getByRole('checkbox', { name: '自由時間を入力する' }));
        // TimePickerは直接inputを持たないため、中央表示をクリックして4桁入力する
        const timeValues = screen.getAllByTitle('タップして「0930」のように4桁で直接入力');
        fireEvent.click(timeValues[0]);
        fireEvent.change(document.querySelector('.time-picker-input'), { target: { value: '1000' } });
        fireEvent.keyDown(document.querySelector('.time-picker-input'), { key: 'Enter' });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        const cell = readMatrix()[0][0];
        expect(cell.shift).toBe('__custom__10_00_18_00');
    });

    it('不正な自由時間(逆転)は保存を拒否し、編集画面を閉じない', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        vi.spyOn(window, 'alert').mockImplementation(() => {});
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.click(screen.getByRole('checkbox', { name: '自由時間を入力する' }));
        const timeValues = screen.getAllByTitle('タップして「0930」のように4桁で直接入力');
        fireEvent.click(timeValues[1]); // 終了側を開始より前へ設定して逆転させる
        fireEvent.change(document.querySelector('.time-picker-input'), { target: { value: '0800' } });
        fireEvent.keyDown(document.querySelector('.time-picker-input'), { key: 'Enter' });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        expect(window.alert).toHaveBeenCalled();
        expect(screen.getByText(/太郎.*の勤務を編集/)).toBeInTheDocument(); // 編集画面は閉じない
        expect(readMatrix()[0][0]).toEqual({}); // 何も変更されない
    });
});

describe('セル交換 (Cycle9)', () => {
    it('編集画面の「交換」→別セルタップでスワップされる(shift/hours/noteを含む全属性)', () => {
        const row0 = [{ shift: '④', isFixed: true, isError: false }, { shift: '有休', hours: 6, note: 'メモ', isFixed: true, isError: false }, ...blankRow().slice(2)];
        seedSmallFixture([row0, blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.click(screen.getByRole('button', { name: /このシフトを交換/ }));
        expect(screen.getByText(/交換する相手のセルをタップ/)).toBeInTheDocument();

        fireEvent.click(getCellButton(0, 1));

        const matrix = readMatrix();
        expect(matrix[0][0]).toEqual({ shift: '有休', hours: 6, note: 'メモ', isFixed: true, isError: false });
        expect(matrix[0][1]).toEqual({ shift: '④', isFixed: true, isError: false });
    });

    it('同じセルを再タップすると交換をキャンセルする', () => {
        const row0 = [{ shift: '④', isFixed: true, isError: false }, {}, ...blankRow().slice(2)];
        seedSmallFixture([row0, blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.click(screen.getByRole('button', { name: /このシフトを交換/ }));
        fireEvent.click(getCellButton(0, 0)); // 同じセルを再タップ

        expect(screen.queryByText(/交換する相手のセルをタップ/)).not.toBeInTheDocument();
        expect(readMatrix()[0][0].shift).toBe('④'); // 変更されない
    });

    it('PCのdrag&dropでもセルを交換できる(行の並べ替えdragとは別種別)', () => {
        const row0 = [{ shift: '④', isFixed: true, isError: false }, {}, ...blankRow().slice(2)];
        seedSmallFixture([row0, blankRow()]);
        render(<App />);
        const source = getCellButton(0, 0).closest('td');
        const target = getCellButton(0, 1).closest('td');

        fireEvent.dragStart(source, { dataTransfer: { setData: () => {}, effectAllowed: '' } });
        fireEvent.dragOver(target, { dataTransfer: {} });
        fireEvent.drop(target, { dataTransfer: {} });

        const matrix = readMatrix();
        expect(matrix[0][1].shift).toBe('④');
        expect(matrix[0][0]).toEqual({});
    });

    it('ダッシュボードの行ドラッグハンドルで従業員を並べ替えても、セル交換は発生しない(dragKindRefによる種別分離)', () => {
        const row0 = [{ shift: '④', isFixed: true, isError: false }, {}, ...blankRow().slice(2)];
        const row1 = [{ shift: '休', isFixed: true, isError: false }, {}, ...blankRow().slice(2)];
        seedSmallFixture([row0, row1]);
        render(<App />);

        const table = document.querySelector('table');
        const rows = table.querySelectorAll('tbody tr');
        const handle0 = rows[0].querySelector('.drag-handle-compact');

        fireEvent.dragStart(handle0);
        fireEvent.dragEnter(rows[1]);
        fireEvent.dragEnd(handle0);

        const stored = JSON.parse(window.localStorage.getItem('shift_employees'));
        expect(stored[0].name).toBe('花子');
        expect(stored[1].name).toBe('太郎');
        // セルの内容は行ごと一緒に入れ替わる(交換ではなく行順の移動)だけで、
        // 各行内のセル自体が交換(スワップ)されたわけではないことを確認する。
        const matrix = readMatrix();
        expect(matrix[0][0].shift).toBe('休'); // 元row1(花子)の内容がそのまま先頭行へ
        expect(matrix[1][0].shift).toBe('④'); // 元row0(太郎)の内容がそのまま2行目へ
    });

    it('従業員管理タブの行dragでも並べ替えができる(PC版テーブル)', () => {
        seedSmallFixture(null);
        render(<App />);
        fireEvent.click(screen.getByText('従業員管理'));

        const rows = document.querySelectorAll('table tbody tr');
        fireEvent.dragStart(rows[0]);
        fireEvent.dragEnter(rows[1]);
        fireEvent.dragEnd(rows[0]);

        const stored = JSON.parse(window.localStorage.getItem('shift_employees'));
        expect(stored[0].name).toBe('花子');
        expect(stored[1].name).toBe('太郎');
    });
});

describe('Undo/Redo (Cycle9)', () => {
    it('Undo/Redoで状態が正しく往復する', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '④' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));
        expect(readMatrix()[0][0].shift).toBe('④');

        fireEvent.click(screen.getByRole('button', { name: '元に戻す(Undo)' }));
        expect(readMatrix()[0][0]).toEqual({});
        expect(screen.getByRole('button', { name: '元に戻す(Undo)' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'やり直す(Redo)' })).not.toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: 'やり直す(Redo)' }));
        expect(readMatrix()[0][0].shift).toBe('④');
        expect(screen.getByRole('button', { name: 'やり直す(Redo)' })).toBeDisabled();
    });

    it('Undo後に新しい変更を行うとRedoが消える', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '④' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));
        fireEvent.click(screen.getByRole('button', { name: '元に戻す(Undo)' }));
        expect(screen.getByRole('button', { name: 'やり直す(Redo)' })).not.toBeDisabled();

        fireEvent.click(getCellButton(0, 1));
        fireEvent.change(getShiftSelect(), { target: { value: '休' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        expect(screen.getByRole('button', { name: 'やり直す(Redo)' })).toBeDisabled();
    });

    it('Ctrl+Zでundo、Ctrl+Shift+Zでredoできる(input focus中は横取りしない)', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '④' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
        expect(readMatrix()[0][0]).toEqual({});

        fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
        expect(readMatrix()[0][0].shift).toBe('④');
    });

    // 履歴が正確に20件で頭打ちになる境界値そのものは、高速な純粋関数テスト
    // (cycle9Utils.test.jsx「21件目のpushSnapshotで最古の1件が破棄され20件に制限される」)
    // で厳密に検証済み。ここでは24名×31日相当の重いDOM操作を21回繰り返すコストを避け、
    // 実際のUI操作(セル編集の保存)を複数回連続しても履歴が正しく積み上がり、
    // Undoが連続して機能する(結合部分の配線)ことだけを軽量に確認する。
    it('複数回の連続したセル編集後もUndoが連続して正しく機能する(履歴の積み上げ)', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);

        fireEvent.click(getCellButton(0, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '④' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        fireEvent.click(getCellButton(0, 1));
        fireEvent.change(getShiftSelect(), { target: { value: '休' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        fireEvent.click(getCellButton(1, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '④' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        expect(readMatrix()[0][0].shift).toBe('④');
        expect(readMatrix()[0][1].shift).toBe('休');
        expect(readMatrix()[1][0].shift).toBe('④');

        fireEvent.click(screen.getByRole('button', { name: '元に戻す(Undo)' }));
        expect(readMatrix()[1][0]).toEqual({});
        fireEvent.click(screen.getByRole('button', { name: '元に戻す(Undo)' }));
        expect(readMatrix()[0][1]).toEqual({});
        fireEvent.click(screen.getByRole('button', { name: '元に戻す(Undo)' }));
        expect(readMatrix()[0][0]).toEqual({});
        expect(screen.getByRole('button', { name: '元に戻す(Undo)' })).toBeDisabled();
    });
});

describe('生成中(isGenerating)の操作禁止 (Cycle9)', () => {
    it('isGenerating中はセル編集・Undo/Redoができない', async () => {
        seedSmallFixture([blankRow(), blankRow()]);
        const fetchMock = vi.fn(() => new Promise(() => {})); // 応答が返らない = isGenerating継続
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));

        expect(getCellButton(0, 0)).toBeDisabled();
        expect(screen.getByRole('button', { name: '元に戻す(Undo)' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'やり直す(Redo)' })).toBeDisabled();
    });
});

describe('希望休同期 (Cycle9)', () => {
    it('セル編集で希望休を設定するとemployees[].requestsへ反映される', () => {
        seedSmallFixture([blankRow(), blankRow()]);
        render(<App />);
        fireEvent.click(getCellButton(0, 0));
        fireEvent.change(getShiftSelect(), { target: { value: '希望休' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        const stored = JSON.parse(window.localStorage.getItem('shift_employees'));
        expect(stored[0].requests).toBe('1');
    });
});
