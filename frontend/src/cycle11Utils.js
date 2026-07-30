// Cycle11: シフト健全性チェッカー(6連勤・休息不足)と氏名折りたたみ用の名字抽出。
// App.jsxのUIコンポーネントとテストの両方から利用する純粋関数群(DOM・イベントに依存しない)。
import { freeTimeToMinutes } from './cycle9Utils';

// 3.1: 特殊シフトのうち、実際に出勤する日として連勤に計上するもの。
const WORKING_SPECIAL = new Set(['応援', '店長会', '研修', '勉強会']);
// 3.1: 特殊シフトのうち、時間集計上は計上されても実出勤日ではなく連勤を切るもの。
const NON_WORKING_SPECIAL = new Set(['希望休', '公休', '有休']);
const OFF_SHIFT = '休';

export const CONSECUTIVE_WARNING_THRESHOLD = 6;
export const REST_WARNING_THRESHOLD_MINUTES = 11 * 60; // 660分 = 11時間

// セルの開始/終了(分)を解析する。特殊シフト・休・希望休・公休・有休・未知ID・
// 時刻不正・shiftMasterに存在しない場合はnull(=判定不能として扱う)。
// 日をまたぐ(終了<=開始)勤務パターンは現行のshiftMaster仕様(同日内完結)では
// 想定されていないため、安全側でnull(判定不能)として扱う(3.3 P3報告参照)。
export function parseShiftRange(cell, shiftMaster) {
    if (!cell || typeof cell.shift !== 'string' || cell.shift === '') return null;
    const shiftId = cell.shift;
    if (shiftId === OFF_SHIFT || NON_WORKING_SPECIAL.has(shiftId) || WORKING_SPECIAL.has(shiftId)) return null;
    const timeStr = shiftMaster ? shiftMaster[shiftId] : undefined;
    if (typeof timeStr !== 'string' || !timeStr.includes('～')) return null;
    // Take2(Dex P4差戻し): "8:15～17:30～不正値"のように区切り文字が複数ある
    // 壊れた文字列は、split()の先頭2要素だけを使うと余分な値を無視して誤って
    // 正常値として受理してしまう(Dex実測で検出)。開始・終了のちょうど2要素
    // だけであることを厳密に確認し、それ以外は判定不能(null)として拒否する。
    const parts = timeStr.split('～');
    if (parts.length !== 2) return null;
    const [startText, endText] = parts;
    const startMin = freeTimeToMinutes(startText);
    const endMin = freeTimeToMinutes(endText);
    if (startMin === null || endMin === null) return null;
    if (endMin <= startMin) return null;
    return { startMin, endMin };
}

// 3.1: そのセルが「勤務日」として連勤に計上されるかどうか。
export function isWorkingCell(cell, shiftMaster) {
    if (!cell || typeof cell.shift !== 'string' || cell.shift === '') return false;
    const shiftId = cell.shift;
    if (shiftId === OFF_SHIFT || NON_WORKING_SPECIAL.has(shiftId)) return false;
    if (WORKING_SPECIAL.has(shiftId)) return true;
    return parseShiftRange(cell, shiftMaster) !== null;
}

// 3.2/3.3: matrix全体を1行=1回走査(O(E*D))して、6連勤警告と休息不足警告を同時に計算する。
// 戻り値は matrix と同じ [employeeIndex][dayIndex] 形状。警告がないセルも
// { consecutiveDays: null, restShortMinutes: null } を返す(存在しないキーで
// アクセスされてもエラーにならないようにするため)。
export function buildHealthAlerts(matrix, shiftMaster, options = {}) {
    const consecutiveThreshold = options.consecutiveThreshold ?? CONSECUTIVE_WARNING_THRESHOLD;
    const restThresholdMinutes = options.restThresholdMinutes ?? REST_WARNING_THRESHOLD_MINUTES;
    if (!Array.isArray(matrix)) return [];

    return matrix.map((row) => {
        const dayCount = Array.isArray(row) ? row.length : 0;
        const rowAlerts = Array.from({ length: dayCount }, () => ({ consecutiveDays: null, restShortMinutes: null }));
        let streak = 0;
        let prevRange = null;
        for (let d = 0; d < dayCount; d++) {
            const cell = row[d];
            const working = isWorkingCell(cell, shiftMaster);
            streak = working ? streak + 1 : 0;
            if (streak >= consecutiveThreshold) {
                rowAlerts[d].consecutiveDays = streak;
            }
            const currRange = parseShiftRange(cell, shiftMaster);
            if (prevRange && currRange) {
                const restMinutes = (24 * 60 - prevRange.endMin) + currRange.startMin;
                if (restMinutes < restThresholdMinutes) {
                    rowAlerts[d].restShortMinutes = restMinutes;
                }
            }
            prevRange = currRange;
        }
        return rowAlerts;
    });
}

// 休息分数を「H時間M分」表記へ整形する(0分の場合は「H時間」)。
export function formatRestMinutesAsLabel(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

// 5.3: 氏名列折りたたみ時の名字ヒント抽出。
// null等は空文字、前後空白除去、半角/全角スペースがあれば最初の語、
// スペースがない名前はUnicode文字単位で先頭最大4文字。
export function extractSurname(name) {
    if (typeof name !== 'string') return '';
    const trimmed = name.trim();
    if (trimmed === '') return '';
    if (/[ 　]/.test(trimmed)) {
        const first = trimmed.split(/[ 　]+/).find(Boolean);
        return first || '';
    }
    return Array.from(trimmed).slice(0, 4).join('');
}
