import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Cycle 8: 希望休ランダム自動入力ボタンと、残業・不足時間のリアルタイム過不足カラー
// 警告表示の恒久コンポーネントテスト。実際の色見え・見た目のちらつきはjsdomでは
// 検証できないため、DOM構造・状態遷移・ラベル文言のみを検証する。

function setViewportWidth(width) {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

// 従業員管理タブ(PC表)で、氏名を含む行の編集ボタン(先頭の<button>)をクリックする。
// 呼び出し前に「従業員管理」タブへ切り替えておくこと。
function openEditModalForRow(name) {
    const rows = document.querySelectorAll('table tbody tr');
    const row = Array.from(rows).find(r => r.textContent.includes(name));
    const editBtn = row.querySelectorAll('button')[0];
    fireEvent.click(editBtn);
}

function getTargetHoursInput() {
    return screen.getByPlaceholderText('未設定');
}

// Cycle9: セルがbutton化されたため、matrixの内容はlocalStorageのgeneratedResultから直接読む
// (透明selectのvalueで読む方式は廃止された)。
function readMatrixFromStorage() {
    const raw = window.localStorage.getItem('shift_generatedResult');
    if (!raw) return null;
    return JSON.parse(raw).matrix;
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

// Cycle8 Take2: targetHours未設定がデフォルト(INITIAL_DATAは目標値を持たない)になったため、
// 初期表示は「目標未設定」を検証する。旧「契約日数×8h」ベースの超過/不足判定は廃止された。
describe('目標計上時間との差分表示 (Cycle8 Take2)', () => {
    it('PC幅: targetHours未設定の初期状態では、氏名セル下に「目標未設定」タグが表示される(色分けなし)', () => {
        render(<App />);
        const table = document.querySelector('table');
        const firstRow = table.querySelectorAll('tbody tr')[0];
        const badge = firstRow.querySelector('.staff-stat-badge');
        expect(badge).not.toBeNull();
        expect(badge.textContent).toMatch(/目標未設定/);
        expect(badge.textContent).not.toMatch(/超過|不足|標準/);
    });

    it('スマホ幅: 左固定列の圧縮表示には差分タグが出ず、氏名タップ後のポップオーバー内にのみ「目標未設定」の大きなメーターが表示される', () => {
        setViewportWidth(375);
        render(<App />);
        expect(document.querySelector('.staff-stat-badge')).toBeNull();

        fireEvent.click(screen.getAllByText('K.D.')[0]);
        expect(screen.getByText(/目標計上時間との差分/)).toBeInTheDocument();
        expect(screen.getByText(/目標未設定/)).toBeInTheDocument();
    });

    it('目標時間との差分がちょうど±2hは標準、それより外だけ超過・不足になる(実績64h/目標64hの短時間勤務者を含む)', () => {
        const employees = [
            { name: 'diff0', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: 64 },
            { name: 'diffPlus2', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: 100 },
            { name: 'diffMinus2', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: 100 },
            { name: 'diffPlus2_1', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: 100 },
            { name: 'diffMinus2_1', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: 100 },
        ];
        const cellsFor = (hoursList) => hoursList.map(h => ({ shift: '有休', hours: h, isFixed: true }));
        const matrix = [
            cellsFor([64]), // diff0: 64h - 64h = 0
            cellsFor([24, 24, 24, 24, 6]), // diffPlus2: 102h - 100h = +2 (標準)
            cellsFor([24, 24, 24, 24, 2]), // diffMinus2: 98h - 100h = -2 (標準)
            cellsFor([24, 24, 24, 24, 6.1]), // diffPlus2_1: 102.1h - 100h = +2.1 (超過)
            cellsFor([24, 24, 24, 24, 1.9]), // diffMinus2_1: 97.9h - 100h = -2.1 (不足)
        ];
        window.localStorage.setItem('shift_employees', JSON.stringify(employees));
        window.localStorage.setItem('shift_generatedResult', JSON.stringify({ matrix, hasError: false, warnings: [], isWarningDraft: false, violations: [] }));

        render(<App />);
        const table = document.querySelector('table');
        const rows = table.querySelectorAll('tbody tr');
        expect(rows[0].querySelector('.staff-stat-badge').textContent).toMatch(/標準/);
        expect(rows[1].querySelector('.staff-stat-badge').textContent).toMatch(/標準/);
        expect(rows[2].querySelector('.staff-stat-badge').textContent).toMatch(/標準/);
        expect(rows[3].querySelector('.staff-stat-badge').textContent).toMatch(/超過/);
        expect(rows[4].querySelector('.staff-stat-badge').textContent).toMatch(/不足/);
    });

    it('スマホ詳細でも、不足・標準・超過の代表値がPCと同じ判定・文言になる', () => {
        const employees = [
            { name: 'mobileStandard', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: 100 },
            { name: 'mobileOver', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: 100 },
            { name: 'mobileUnder', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: 100 },
        ];
        const cellsFor = (hoursList) => hoursList.map(h => ({ shift: '有休', hours: h, isFixed: true }));
        const matrix = [
            cellsFor([100]), // 100h - 100h = 0 (標準)
            cellsFor([24, 24, 24, 24, 6.1]), // 102.1h - 100h = +2.1 (超過)
            cellsFor([24, 24, 24, 24, 1.9]), // 97.9h - 100h = -2.1 (不足)
        ];
        window.localStorage.setItem('shift_employees', JSON.stringify(employees));
        window.localStorage.setItem('shift_generatedResult', JSON.stringify({ matrix, hasError: false, warnings: [], isWarningDraft: false, violations: [] }));

        // まずPC幅で各行のバッジ判定を記録する
        setViewportWidth(1280);
        const { unmount } = render(<App />);
        const table = document.querySelector('table');
        const pcRows = table.querySelectorAll('tbody tr');
        const pcLabels = [
            pcRows[0].querySelector('.staff-stat-badge').textContent,
            pcRows[1].querySelector('.staff-stat-badge').textContent,
            pcRows[2].querySelector('.staff-stat-badge').textContent,
        ];
        expect(pcLabels[0]).toMatch(/標準/);
        expect(pcLabels[1]).toMatch(/超過/);
        expect(pcLabels[2]).toMatch(/不足/);
        unmount();

        // 同じデータをスマホ幅で開き、ポップオーバー内の判定・文言がPCと一致することを確認する
        setViewportWidth(375);
        render(<App />);
        fireEvent.click(screen.getAllByText('mobileStandard')[0]);
        expect(screen.getByText(/標準/)).toBeInTheDocument();
        fireEvent.click(screen.getAllByRole('button', { name: '閉じる' })[0]);

        fireEvent.click(screen.getAllByText('mobileOver')[0]);
        expect(screen.getByText(/超過/)).toBeInTheDocument();
        fireEvent.click(screen.getAllByRole('button', { name: '閉じる' })[0]);

        fireEvent.click(screen.getAllByText('mobileUnder')[0]);
        expect(screen.getByText(/不足/)).toBeInTheDocument();
    });

    it('特殊勤務の既定計上時間(8h)も差分計算へ合算される', () => {
        const employees = [
            { name: 'defaultHoursCheck', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: 8 },
        ];
        // hoursを明示しない有休セル -> DEFAULT_SPECIAL_HOURS(8h)が使われるはず
        const matrix = [[{ shift: '有休', isFixed: true }]];
        window.localStorage.setItem('shift_employees', JSON.stringify(employees));
        window.localStorage.setItem('shift_generatedResult', JSON.stringify({ matrix, hasError: false, warnings: [], isWarningDraft: false, violations: [] }));

        render(<App />);
        const table = document.querySelector('table');
        const badge = table.querySelectorAll('tbody tr')[0].querySelector('.staff-stat-badge');
        expect(badge.textContent).toMatch(/標準/); // 8h(実績) - 8h(目標) = 0 -> 標準
    });
});

describe('targetHoursのデータ契約 (Cycle8 Take2)', () => {
    it('既存localStorageのtargetHoursをクラッシュせず安全に正規化する(未設定/数値文字列/0/負数/上限超過/下限未満)、他項目は保持する', () => {
        const employees = [
            { name: 'noField', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '' }, // targetHoursフィールド自体が無い
            { name: 'stringNum', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: '150' },
            { name: 'zeroVal', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: 0 },
            { name: 'negativeVal', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: -10 },
            { name: 'overMax', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: 9999 },
            { name: 'belowMin', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: 0.3 }, // 0.5未満(UIから入力不可能な範囲)も未設定へ
        ];
        window.localStorage.setItem('shift_employees', JSON.stringify(employees));

        expect(() => render(<App />)).not.toThrow();
        fireEvent.click(screen.getByText('従業員管理'));

        openEditModalForRow('noField');
        expect(getTargetHoursInput().value).toBe('');
        expect(screen.getByPlaceholderText('例: 山田 太郎').value).toBe('noField'); // 他項目(氏名)は保持される
        fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

        openEditModalForRow('stringNum');
        expect(getTargetHoursInput().value).toBe('150'); // 数値文字列 -> 数値へ変換
        fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

        openEditModalForRow('zeroVal');
        expect(getTargetHoursInput().value).toBe(''); // 既存保存値の0は互換のため未設定へ
        fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

        openEditModalForRow('negativeVal');
        expect(getTargetHoursInput().value).toBe('');
        fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

        openEditModalForRow('overMax');
        expect(getTargetHoursInput().value).toBe(''); // 744超は未設定へ
        fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

        openEditModalForRow('belowMin');
        expect(getTargetHoursInput().value).toBe(''); // 0.5未満は未設定へ
    });

    it('新規追加モーダルは目標時間が空で、直前に編集した従業員の値を引き継がない', () => {
        const employees = [
            { name: 'hasTarget', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: 200 },
        ];
        window.localStorage.setItem('shift_employees', JSON.stringify(employees));
        render(<App />);
        fireEvent.click(screen.getByText('従業員管理'));

        openEditModalForRow('hasTarget');
        expect(getTargetHoursInput().value).toBe('200');
        fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

        fireEvent.click(screen.getByRole('button', { name: '新規追加' }));
        expect(getTargetHoursInput().value).toBe('');
    });

    it('有効値を保存するとlocalStorageへ反映され、再マウント後も復元される', () => {
        const { unmount } = render(<App />);
        fireEvent.click(screen.getByText('従業員管理'));
        openEditModalForRow('K.D.');
        fireEvent.change(getTargetHoursInput(), { target: { value: '120.5' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        const stored = JSON.parse(window.localStorage.getItem('shift_employees'));
        expect(stored[0].targetHours).toBe(120.5);

        unmount();
        render(<App />);
        fireEvent.click(screen.getByText('従業員管理'));
        openEditModalForRow('K.D.');
        expect(getTargetHoursInput().value).toBe('120.5');
    });

    it('空欄は未設定として保存でき、新規入力の0・負数・744超はエラー表示されモーダルが閉じない。744と小数値は保存できる', () => {
        // 備考: parseStrictNumberは非数値文字列やInfinity相当の入力(例: "1e400")もNaN/非有限として
        // 弾く実装だが、type="number"のinputはブラウザ/jsdomの標準挙動でそのような値を
        // 入力欄側で空文字へ正規化してしまうため、実際のUI経由では到達できない。
        // そのため実UIから到達可能な0・負数・上限超過(744超)の3ケースを検証する。
        vi.spyOn(window, 'alert').mockImplementation(() => {});
        render(<App />);
        fireEvent.click(screen.getByText('従業員管理'));
        fireEvent.click(screen.getByRole('button', { name: '新規追加' }));
        fireEvent.change(screen.getByPlaceholderText('例: 山田 太郎'), { target: { value: 'テスト太郎' } });

        // 空欄のまま保存 -> 未設定としてエラーなく保存できる
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));
        expect(window.alert).not.toHaveBeenCalled();
        expect(screen.queryByText('従業員を追加')).not.toBeInTheDocument();

        const invalidCases = ['0', '-5', '9999'];
        invalidCases.forEach(value => {
            fireEvent.click(screen.getByRole('button', { name: '新規追加' }));
            fireEvent.change(screen.getByPlaceholderText('例: 山田 太郎'), { target: { value: 'エラーケース' } });
            fireEvent.change(getTargetHoursInput(), { target: { value } });
            fireEvent.click(screen.getByRole('button', { name: '保存する' }));
            expect(window.alert).toHaveBeenCalled();
            expect(screen.getByText('従業員を追加')).toBeInTheDocument(); // モーダルは閉じない
            window.alert.mockClear();
            fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
        });

        // 境界値744と小数値0.5は保存できる
        fireEvent.click(screen.getByRole('button', { name: '新規追加' }));
        fireEvent.change(screen.getByPlaceholderText('例: 山田 太郎'), { target: { value: '境界値744' } });
        fireEvent.change(getTargetHoursInput(), { target: { value: '744' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));
        expect(window.alert).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: '新規追加' }));
        fireEvent.change(screen.getByPlaceholderText('例: 山田 太郎'), { target: { value: '境界値0.5' } });
        fireEvent.change(getTargetHoursInput(), { target: { value: '0.5' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));
        expect(window.alert).not.toHaveBeenCalled();

        const stored = JSON.parse(window.localStorage.getItem('shift_employees'));
        expect(stored.find(e => e.name === '境界値744').targetHours).toBe(744);
        expect(stored.find(e => e.name === '境界値0.5').targetHours).toBe(0.5);
    });

    it('targetHoursはバックエンドpayloadに含まれない', async () => {
        const employees = [
            { name: 'payloadCheck', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: 150 },
        ];
        window.localStorage.setItem('shift_employees', JSON.stringify(employees));
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ status: 'SUCCESS', shifts: { emp_0: [] } }),
        });
        vi.stubGlobal('fetch', fetchMock);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /最適化シフトを生成/ }));
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

        const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
        sentBody.employees.forEach(e => {
            expect(e).not.toHaveProperty('targetHours');
        });
    });
});

describe('希望休ランダム入力の空きセル保護・抽選終了保証・不足通知 (Cycle8 Take2)', () => {
    it('通常シフトと特殊シフトの確定セルを保持する(希望休の対象にしない)', () => {
        const employees = [
            { name: 'K.D.', type: '正社員', isRS: true, isKeyHolder: true, days: 23, shifts: ['④', '⑦'], requests: '', targetHours: null },
        ];
        const matrix = [[
            { shift: '④', isError: false, isFixed: false },
            { shift: '有休', hours: 8, isError: false, isFixed: true },
        ]];
        window.localStorage.setItem('shift_employees', JSON.stringify(employees));
        window.localStorage.setItem('shift_generatedResult', JSON.stringify({ matrix, hasError: false, warnings: [], isWarningDraft: false, violations: [] }));
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /希望休ランダム入力/ }));

        const resultMatrix = readMatrixFromStorage();
        expect(resultMatrix[0][0].shift).toBe('④'); // 通常シフトは保護される
        expect(resultMatrix[0][1].shift).toBe('有休'); // 特殊シフトも保護される
    });

    it('十分な空きがある場合、乱数列に依存せず抽選目標数を必ず満たす(Math.randomが常に0を返す不利な乱数列でも)', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.spyOn(Math, 'random').mockReturnValue(0);
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /希望休ランダム入力/ }));

        fireEvent.click(screen.getByText('従業員管理'));
        const rows = document.querySelectorAll('table tbody tr');
        // Math.random=0固定なので、count = floor(0*(max-min+1))+min = min(標準2日/パート5日)になる
        rows.forEach((row, i) => {
            const match = row.textContent.match(/希望休:\s*([\d,\s]+)/);
            expect(match).not.toBeNull();
            const count = match[1].split(',').filter(s => s.trim() !== '').length;
            expect(count).toBe(i < 6 ? 2 : 5); // 乱数運に負けず目標数(min)ちょうどを満たす
        });
    });

    it('マトリクスの希望休とemployees[].requestsの日番号配列が完全一致する(件数だけでなく中身も比較)', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /希望休ランダム入力/ }));

        const matrixRow = readMatrixFromStorage()[0];
        const matrixDays = matrixRow
            .map((cell, d) => ({ value: cell?.shift, day: d + 1 }))
            .filter(x => x.value === '希望休')
            .map(x => x.day)
            .sort((a, b) => a - b);

        fireEvent.click(screen.getByText('従業員管理'));
        const empRows = document.querySelectorAll('table tbody tr');
        const match = empRows[0].textContent.match(/希望休:\s*([\d,\s]+)/);
        const requestDays = match[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);

        expect(requestDays).toEqual(matrixDays); // 件数一致ではなく、日番号の配列そのものが一致すること
    });

    it('空きセル自体が必要数未満の場合だけ、配置可能数までを反映し不足者・目標・実配置数を1件の通知にまとめる(空き0件の全欠経路)', () => {
        const dayCount = 31;
        const fullyBookedRow = Array.from({ length: dayCount }, () => ({ shift: '④', isError: false, isFixed: false }));
        const employees = [
            { name: '空き不足太郎', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: null },
            { name: '空き十分花子', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: null },
        ];
        const matrix = [fullyBookedRow, Array.from({ length: dayCount }, () => ({}))];
        window.localStorage.setItem('shift_employees', JSON.stringify(employees));
        window.localStorage.setItem('shift_generatedResult', JSON.stringify({ matrix, hasError: false, warnings: [], isWarningDraft: false, violations: [] }));

        vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.spyOn(window, 'alert').mockImplementation(() => {});
        // random=0.99 -> floor(0.99*3)+2=4 (正社員系の最大4日を要求させ、空き0との差を明確にする)
        vi.spyOn(Math, 'random').mockReturnValue(0.99);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /希望休ランダム入力/ }));

        expect(window.alert).toHaveBeenCalledTimes(1);
        const message = window.alert.mock.calls[0][0];
        expect(message).toMatch(/空き不足太郎/);
        expect(message).toMatch(/目標4日/);
        expect(message).toMatch(/実際0日/);
        expect(message).not.toMatch(/空き十分花子/); // 不足していない従業員は通知に含めない
    });

    it('空きセルが一部だけある場合(空き2日・目標4日)、配置可能な2日全てがmatrix・requestsへ反映され、通知が目標4日・実際2日になる', () => {
        const dayCount = 31;
        // 先頭2日だけ空き、残り29日は確定シフト(④)で埋まっている
        const partiallyBookedRow = Array.from({ length: dayCount }, (_, d) => (
            d < 2 ? {} : { shift: '④', isError: false, isFixed: false }
        ));
        const employees = [
            { name: '空き部分太郎', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: null },
        ];
        const matrix = [partiallyBookedRow];
        window.localStorage.setItem('shift_employees', JSON.stringify(employees));
        window.localStorage.setItem('shift_generatedResult', JSON.stringify({ matrix, hasError: false, warnings: [], isWarningDraft: false, violations: [] }));

        vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.spyOn(window, 'alert').mockImplementation(() => {});
        // random=0.99 -> floor(0.99*3)+2=4 (正社員系の最大4日を要求させ、空き2日との差を明確にする)
        vi.spyOn(Math, 'random').mockReturnValue(0.99);

        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: /希望休ランダム入力/ }));

        expect(window.alert).toHaveBeenCalledTimes(1);
        const message = window.alert.mock.calls[0][0];
        expect(message).toMatch(/空き部分太郎/);
        expect(message).toMatch(/目標4日/);
        expect(message).toMatch(/実際2日/);

        // 空いていた1・2日目の両方がmatrixへ反映されていること
        const row = readMatrixFromStorage()[0];
        expect(row[0].shift).toBe('希望休');
        expect(row[1].shift).toBe('希望休');
        for (let d = 2; d < row.length; d++) {
            expect(row[d].shift).toBe('④'); // 確定シフトは上書きされない
        }

        // requestsも同じ2日(1,2)と完全一致すること
        fireEvent.click(screen.getByText('従業員管理'));
        const empRow = document.querySelectorAll('table tbody tr')[0];
        const match = empRow.textContent.match(/希望休:\s*([\d,\s]+)/);
        const requestDays = match[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
        expect(requestDays).toEqual([1, 2]);
    });
});

describe('generatedResultの保持/破棄と目標値の非漏洩 (Cycle8 Take2)', () => {
    it('targetHoursだけの編集ではgeneratedResultを保持し、氏名など生成条件の編集では破棄する', () => {
        const employees = [
            { name: 'keepCheck', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: null },
        ];
        window.localStorage.setItem('shift_employees', JSON.stringify(employees));
        window.localStorage.setItem('shift_generatedResult', JSON.stringify({ matrix: [[]], hasError: false, warnings: [], isWarningDraft: false, violations: [] }));

        render(<App />);
        fireEvent.click(screen.getByText('従業員管理'));

        openEditModalForRow('keepCheck');
        fireEvent.change(getTargetHoursInput(), { target: { value: '50' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));
        expect(window.localStorage.getItem('shift_generatedResult')).not.toBeNull(); // targetHoursだけの変更 -> 保持

        openEditModalForRow('keepCheck');
        fireEvent.change(screen.getByPlaceholderText('例: 山田 太郎'), { target: { value: 'renamed' } });
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));
        expect(window.localStorage.getItem('shift_generatedResult')).toBeNull(); // 生成条件(氏名)の変更 -> 破棄
    });

    it('編集キャンセル・雇用区分変更ではtargetHoursが勝手に変わらない', () => {
        const employees = [
            { name: 'noLeak', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: 100 },
        ];
        window.localStorage.setItem('shift_employees', JSON.stringify(employees));
        render(<App />);
        fireEvent.click(screen.getByText('従業員管理'));

        // キャンセル: 変更を試みても保存しない
        openEditModalForRow('noLeak');
        fireEvent.change(getTargetHoursInput(), { target: { value: '999' } });
        fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
        openEditModalForRow('noLeak');
        expect(getTargetHoursInput().value).toBe('100');

        // 雇用区分変更: targetHours入力欄はhandleTypeChangeの影響を受けない
        fireEvent.change(screen.getByDisplayValue('正社員'), { target: { value: '早パート' } });
        expect(getTargetHoursInput().value).toBe('100');
        fireEvent.click(screen.getByRole('button', { name: '保存する' }));

        const stored = JSON.parse(window.localStorage.getItem('shift_employees'));
        expect(stored[0].targetHours).toBe(100);
    });

    it('デフォルトリセットでは全従業員のtargetHoursが未設定になる', () => {
        const employees = [
            { name: 'beforeReset', type: '正社員', isRS: false, isKeyHolder: false, days: 23, shifts: ['④'], requests: '', targetHours: 150 },
        ];
        window.localStorage.setItem('shift_employees', JSON.stringify(employees));
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        render(<App />);
        fireEvent.click(screen.getByText('従業員管理'));
        fireEvent.click(screen.getByRole('button', { name: /デフォルトリセット/ }));

        const stored = JSON.parse(window.localStorage.getItem('shift_employees'));
        stored.forEach(emp => {
            expect(emp.targetHours === null || emp.targetHours === undefined).toBe(true);
        });
    });
});
