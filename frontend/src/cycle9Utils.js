// Cycle9: セル直接編集・スワップ交換・Undo/Redo履歴のための純粋関数群。
// App.jsxのUIコンポーネントとテストの両方から利用する（DOM・イベントに依存しない）。

// --- Pointer Events: 短タップ/スワイプ判定 ---
export const TAP_MAX_DURATION_MS = 350;
export const TAP_MAX_DISTANCE_PX = 8;

// pointerup時点の状況から、短タップとして扱ってよいかを判定する。
// 8px以上の移動、pointercancel、複数指、別pointerへの切替のいずれかがあれば'discard'。
export function classifyPointerUp({ distancePx, durationMs, wasCancelled, hadMultiplePointers, pointerIdMismatch }) {
    if (wasCancelled || hadMultiplePointers || pointerIdMismatch) return 'discard';
    if (!Number.isFinite(distancePx) || distancePx >= TAP_MAX_DISTANCE_PX) return 'discard';
    if (!Number.isFinite(durationMs) || durationMs > TAP_MAX_DURATION_MS) return 'discard';
    return 'tap';
}

// --- 自由時間: 安定したshiftMaster用ID ---
export function buildFreeTimeShiftId(start, end) {
    const safe = (t) => String(t).replace(':', '_');
    return `__custom__${safe(start)}_${safe(end)}`;
}

// "HH:MM"を分へ変換する。"24:00"は1440として許可する。不正な形式はnull。
export function freeTimeToMinutes(text) {
    if (typeof text !== 'string' || !/^\d{1,2}:\d{2}$/.test(text)) return null;
    const [hStr, mStr] = text.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    if (m < 0 || m > 59) return null;
    if (h < 0 || h > 24) return null;
    if (h === 24 && m !== 0) return null;
    return h * 60 + m;
}

// 自由時間の入力条件: 00:00 <= start < end <= 24:00。開始に24:00は不可。
export function isValidFreeTimeRange(startText, endText) {
    const s = freeTimeToMinutes(startText);
    const e = freeTimeToMinutes(endText);
    if (s === null || e === null) return false;
    if (s >= 24 * 60) return false; // 開始時刻の24:00は不可
    if (e <= 0 || e > 24 * 60) return false;
    return s < e;
}

// --- セル保存時の正規化 ---
// mode: 'empty' | 'normal' | 'special'
// 通常シフトへ戻した場合は古いhoursを残さない。注記は前後空白除去・最大40文字。
export function buildCellForSave({ mode, shiftId, hours, note }) {
    if (mode === 'empty') return {};
    const trimmedNote = (note || '').trim().slice(0, 40);
    const cell = { shift: shiftId, isFixed: true, isError: false };
    if (trimmedNote) cell.note = trimmedNote;
    if (mode === 'special' && Number.isFinite(hours)) cell.hours = hours;
    return cell;
}

// --- 希望休同期: matrixの「希望休」セルからemployees[].requestsを再構築する共通関数 ---
export function buildRequestsFromMatrix(matrix, employees) {
    return employees.map((emp, i) => {
        const row = (matrix && matrix[i]) || [];
        const days = [];
        row.forEach((cell, d) => {
            if (cell && cell.shift === '希望休') days.push(d + 1);
        });
        const uniqueSorted = Array.from(new Set(days)).sort((a, b) => a - b);
        return { ...emp, requests: uniqueSorted.join(', ') };
    });
}

// --- セル交換: セルオブジェクト全体を交換する ---
export function swapMatrixCells(matrix, i1, d1, i2, d2) {
    const newMatrix = matrix.map(row => [...row]);
    const a = newMatrix[i1] && newMatrix[i1][d1] ? newMatrix[i1][d1] : {};
    const b = newMatrix[i2] && newMatrix[i2][d2] ? newMatrix[i2][d2] : {};
    if (!newMatrix[i1]) newMatrix[i1] = [];
    if (!newMatrix[i2]) newMatrix[i2] = [];
    newMatrix[i1][d1] = b;
    newMatrix[i2][d2] = a;
    return newMatrix;
}

// --- Undo/Redo履歴スタック ---
export const HISTORY_MAX_SIZE = 20;

// 新しいスナップショットを末尾へ追加し、上限を超えたら最古を破棄する。
export function pushSnapshot(pastStack, snapshot, maxSize = HISTORY_MAX_SIZE) {
    const next = [...pastStack, snapshot];
    if (next.length > maxSize) next.shift();
    return next;
}

// Undo: pastの最後を復元対象として取り出し、現在の状態をfutureの先頭へ積む。
export function undoStep(past, future, currentSnapshot) {
    if (!past || past.length === 0) return null;
    const restored = past[past.length - 1];
    const newPast = past.slice(0, -1);
    const newFuture = [currentSnapshot, ...(future || [])];
    return { past: newPast, future: newFuture, restored };
}

// Redo: futureの先頭を復元対象として取り出し、現在の状態をpastへ積む。
export function redoStep(past, future, currentSnapshot) {
    if (!future || future.length === 0) return null;
    const restored = future[0];
    const newFuture = future.slice(1);
    const newPast = pushSnapshot(past || [], currentSnapshot);
    return { past: newPast, future: newFuture, restored };
}
