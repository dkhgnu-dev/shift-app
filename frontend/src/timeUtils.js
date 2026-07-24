// TimePicker(ぽちぽちタイムピッカー)と特殊シフト時間入力の検証ロジックを
// 純粋関数として切り出したもの。App.jsxのUIコンポーネントとNode実行可能な
// テスト(test_time_utils.mjs)の両方から利用する。

export const MAX_TIME_PICKER_HOUR = 24;

// 時(hour)を変更する際の丸め込み。24時到達時は分を0に固定し、範囲外は0〜maxHourへクランプする。
// 「24を%24で丸めて0にしてしまう」バグ(Cycle2 Take2で修正)を再発させないための唯一の実装箇所。
export function computeHourChange(m, requestedHour, maxHour = MAX_TIME_PICKER_HOUR) {
    const nnh = Math.max(0, Math.min(maxHour, requestedHour));
    const nnm = nnh === maxHour ? 0 : m;
    return { h: nnh, m: nnm };
}

// 分(minute)を変更する際の丸め込み・繰り上げ/繰り下げ処理。24:00の分は常に0に固定する。
export function computeMinuteChange(h, requestedMinute, maxHour = MAX_TIME_PICKER_HOUR) {
    if (h === maxHour) return { h, m: 0 };
    let nnh = h;
    let nnm = requestedMinute;
    if (nnm >= 60) {
        nnm -= 60;
        nnh = Math.min(maxHour, nnh + 1);
        if (nnh === maxHour) nnm = 0;
    }
    if (nnm < 0) {
        nnm += 60;
        nnh = Math.max(0, nnh - 1);
    }
    return { h: nnh, m: nnm };
}

export function formatTime(h, m) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// parseFloatは"8abc"のような末尾に不正な文字が付いた値も8として受理してしまうため、
// 厳密な数値表現(先頭の空白トリムのみ許容)だけを受け付ける。全体が数値でなければNaN。
export function parseStrictNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    if (typeof value !== 'string') return NaN;
    const trimmed = value.trim();
    if (trimmed === '' || !/^-?\d+(\.\d+)?$/.test(trimmed)) return NaN;
    return Number(trimmed);
}

// 特殊シフト(有休等)の勤務時間として保存してよい値か検証する。0〜24の厳密な数値のみ許可。
export function isValidSpecialHours(value) {
    const parsed = parseStrictNumber(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 24;
}
