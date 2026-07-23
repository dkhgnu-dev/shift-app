import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Users, Settings, Plus, X, Edit, Trash2, AlertCircle, Wand2, Menu, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';

const SHIFT_MASTER = {
    '①': '8:15～12:15', '②': '8:15～14:15', '③': '8:15～16:15',
    '④': '8:15～17:30', '⑤': '11:00～19:00', '⑥': '14:00～19:00', '⑦': '15:30～24:00', '⑧': '17:00～24:00',
    '⑨': '17:00～22:00', '⑩': '19:00～24:00', '⑪': '21:00～24:00'
};

// 特殊シフト: 個人の出勤日数・時間には計上するが、店舗人数・登録販売者・鍵持ち集計からは除外する
const SPECIAL_SHIFTS = ['有休', '応援', '店長会', '研修', '勉強会', '希望休', '公休'];
// 希望休/公休は時間0扱い（実質「休」と同じ）。有休/応援/店長会/研修/勉強会は既定8h計上
const SPECIAL_OFF_LIKE = new Set(['希望休', '公休']);
const DEFAULT_SPECIAL_HOURS = 8;
const BUSINESS_START_LABEL = '8:15';
const BUSINESS_END_LABEL = '24:00';

const timeToMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};
const minToLabel = (mins) => {
    const m = ((mins % 1440) + 1440) % 1440;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h === 0 ? 24 : h}:${String(mm).padStart(2, '0')}`;
};

// 前月16日〜当月15日締めの対象期間（Dateの配列）を返す
const getPeriodDates = (year, month) => {
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth < 1) { prevMonth = 12; prevYear -= 1; }
    const start = new Date(prevYear, prevMonth - 1, 16);
    const end = new Date(year, month - 1, 15);
    const dayCount = Math.round((end - start) / 86400000) + 1;
    return Array.from({ length: dayCount }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
};

const formatDateLabel = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
const toISODate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const safeParse = (raw, fallback) => {
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(raw);
        return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (e) {
        return fallback;
    }
};

const DEFAULT_DAYS = {
    '正社員': 23, '時間限定社員': 23, '準社員': 23,
    '早パート': 16, '中パート': 16, '遅パート': 16, 
    '早ロングパート': 20, '中ロングパート': 20, '遅ロングパート': 20
};

const INITIAL_DATA = [
    { name: 'K.D.', type: '正社員', isRS: true, days: 23, shifts: ['④', '⑦'], requests: '', isKeyHolder: false },
    { name: 'N.E.', type: '時間限定社員', isRS: true, days: 23, shifts: ['④'], requests: '', isKeyHolder: false },
    { name: 'N.K.', type: '正社員', isRS: true, days: 23, shifts: ['④', '⑦'], requests: '', isKeyHolder: false },
    { name: 'T.S.', type: '準社員', isRS: false, days: 23, shifts: ['④'], requests: '', isKeyHolder: false },
    { name: 'S.M.', type: '準社員', isRS: false, days: 23, shifts: ['④'], requests: '', isKeyHolder: false },
    { name: 'J.R.', type: '準社員', isRS: false, days: 23, shifts: ['⑦'], requests: '', isKeyHolder: false },
    { name: 'O.T.', type: '早ロングパート', isRS: false, days: 20, shifts: ['③'], requests: '', isKeyHolder: false },
    { name: 'K.T.', type: '早ロングパート', isRS: false, days: 20, shifts: ['③'], requests: '', isKeyHolder: false },
    { name: 'T.Y.', type: '中ロングパート', isRS: false, days: 20, shifts: ['⑤'], requests: '', isKeyHolder: false },
    { name: 'T.M.(1)', type: '遅ロングパート', isRS: false, days: 20, shifts: ['⑧'], requests: '', isKeyHolder: false },
    { name: 'O.K.', type: '早パート', isRS: false, days: 16, shifts: ['②'], requests: '', isKeyHolder: false },
    { name: 'T.M.(2)', type: '早パート', isRS: false, days: 16, shifts: ['①'], requests: '', isKeyHolder: false },
    { name: 'I.K.(1)', type: '早パート', isRS: false, days: 16, shifts: ['①'], requests: '', isKeyHolder: false },
    { name: 'M.T.', type: '早パート', isRS: false, days: 16, shifts: ['①'], requests: '', isKeyHolder: false },
    { name: 'H.M.', type: '早パート', isRS: false, days: 16, shifts: ['①'], requests: '', isKeyHolder: false },
    { name: 'Y.M.', type: '中パート', isRS: false, days: 16, shifts: ['⑥'], requests: '', isKeyHolder: false },
    { name: 'Y.I.', type: '遅パート', isRS: false, days: 16, shifts: ['⑨'], requests: '', isKeyHolder: false },
    { name: 'K.Y.', type: '遅パート', isRS: false, days: 16, shifts: ['⑨'], requests: '', isKeyHolder: false },
    { name: 'M.R.', type: '遅パート', isRS: false, days: 16, shifts: ['⑨'], requests: '', isKeyHolder: false },
    { name: 'O.Y.', type: '遅パート', isRS: false, days: 16, shifts: ['⑩'], requests: '', isKeyHolder: false },
    { name: 'I.H.', type: '遅パート', isRS: false, days: 16, shifts: ['⑩'], requests: '', isKeyHolder: false },
    { name: 'T.A.', type: '遅パート', isRS: false, days: 16, shifts: ['⑩'], requests: '', isKeyHolder: false },
    { name: 'I.K.(2)', type: '遅パート', isRS: false, days: 16, shifts: ['⑪'], requests: '', isKeyHolder: false },
    { name: 'N.H.', type: '遅パート', isRS: false, days: 16, shifts: ['⑪'], requests: '', isKeyHolder: false },
];

// ぽちぽちタイムピッカー: ▲▼刻み調整 + 時/分の数字タップで手打ち不要に設定
function TimePicker({ value, onChange }) {
    const [h, m] = (value && value.includes(':')) ? value.split(':').map(Number) : [9, 0];
    const setH = (nh) => {
        const nnh = ((nh % 24) + 24) % 24;
        onChange(`${String(nnh).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    };
    const setM = (nm) => {
        let nnh = h, nnm = nm;
        if (nnm >= 60) { nnm -= 60; nnh = (nnh + 1) % 24; }
        if (nnm < 0) { nnm += 60; nnh = (nnh - 1 + 24) % 24; }
        onChange(`${String(nnh).padStart(2, '0')}:${String(nnm).padStart(2, '0')}`);
    };
    const HOUR_OPTIONS = Array.from({ length: 19 }, (_, i) => i + 6); // 6時～24時
    const MIN_OPTIONS = [0, 15, 30, 45];

    return (
        <div className="time-picker">
            <div className="time-picker-display">
                <div className="time-picker-col">
                    <button type="button" className="time-picker-step" onClick={() => setH(h + 1)}><ArrowUp size={14} /></button>
                    <div className="time-picker-value">{String(h).padStart(2, '0')}</div>
                    <button type="button" className="time-picker-step" onClick={() => setH(h - 1)}><ArrowDown size={14} /></button>
                </div>
                <div className="time-picker-colon">:</div>
                <div className="time-picker-col">
                    <button type="button" className="time-picker-step" onClick={() => setM(m + 30)}><ArrowUp size={14} /></button>
                    <div className="time-picker-value">{String(m).padStart(2, '0')}</div>
                    <button type="button" className="time-picker-step" onClick={() => setM(m - 30)}><ArrowDown size={14} /></button>
                </div>
            </div>
            <div className="time-picker-quick-row">
                {HOUR_OPTIONS.map(ho => (
                    <button type="button" key={ho} className={`time-picker-tap ${h === ho ? 'active' : ''}`} onClick={() => setH(ho)}>{ho}</button>
                ))}
            </div>
            <div className="time-picker-quick-row">
                {MIN_OPTIONS.map(mo => (
                    <button type="button" key={mo} className={`time-picker-tap ${m === mo ? 'active' : ''}`} onClick={() => setM(mo)}>{String(mo).padStart(2, '0')}</button>
                ))}
            </div>
        </div>
    );
}

export default function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [employees, setEmployees] = useState(() => safeParse(localStorage.getItem('shift_employees'), INITIAL_DATA));
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedResult, setGeneratedResult] = useState(() => safeParse(localStorage.getItem('shift_generatedResult'), null));
    const [showModal, setShowModal] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);

    // シフトパターンマスター（カスタムシフト対応）
    const [shiftMaster, setShiftMaster] = useState(() => {
        const saved = safeParse(localStorage.getItem('shift_custom_master'), null);
        return (saved && typeof saved === 'object') ? saved : SHIFT_MASTER;
    });

    useEffect(() => {
        localStorage.setItem('shift_custom_master', JSON.stringify(shiftMaster));
    }, [shiftMaster]);

    // Settings State
    const [thickDays, setThickDays] = useState(() => safeParse(localStorage.getItem('shift_thickDays'), []));
    const [weekdayRanks, setWeekdayRanks] = useState(() => safeParse(localStorage.getItem('shift_weekdayRanks'), { 6: 1, 5: 2, 1: 3, 2: 4, 4: 5, 3: 6, 0: 7 }));
    const [weekdayMinStaff, setWeekdayMinStaff] = useState(() => safeParse(localStorage.getItem('shift_weekdayMinStaff'), { 6: 0, 5: 0, 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }));

    useEffect(() => {
        localStorage.setItem('shift_weekdayRanks', JSON.stringify(weekdayRanks));
    }, [weekdayRanks]);

    useEffect(() => {
        localStorage.setItem('shift_weekdayMinStaff', JSON.stringify(weekdayMinStaff));
    }, [weekdayMinStaff]);

    // Date State
    const [currentYear, setCurrentYear] = useState(() => {
        const saved = localStorage.getItem('shift_year');
        return saved ? parseInt(saved, 10) : new Date().getFullYear();
    });
    const [currentMonth, setCurrentMonth] = useState(() => {
        const saved = localStorage.getItem('shift_month');
        return saved ? parseInt(saved, 10) : new Date().getMonth() + 1;
    });

    useEffect(() => {
        localStorage.setItem('shift_year', currentYear);
        localStorage.setItem('shift_month', currentMonth);
    }, [currentYear, currentMonth]);

    const changeMonth = (offset) => {
        let newMonth = currentMonth + offset;
        let newYear = currentYear;
        if (newMonth > 12) { newMonth = 1; newYear++; }
        if (newMonth < 1) { newMonth = 12; newYear--; }
        setCurrentYear(newYear);
        setCurrentMonth(newMonth);
        setGeneratedResult(null);
    };
    
    // Mobile View State
    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [selectedDateIndex, setSelectedDateIndex] = useState(0);

    // Drag and Drop
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);
    
    const handleSort = () => {
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            let _employees = [...employees];
            const draggedItemContent = _employees.splice(dragItem.current, 1)[0];
            _employees.splice(dragOverItem.current, 0, draggedItemContent);
            setEmployees(_employees);
            
            if (generatedResult) {
                let _matrix = [...generatedResult.matrix];
                const draggedMatrixContent = _matrix.splice(dragItem.current, 1)[0];
                _matrix.splice(dragOverItem.current, 0, draggedMatrixContent);
                setGeneratedResult({...generatedResult, matrix: _matrix});
            }
        }
        dragItem.current = null;
        dragOverItem.current = null;
    };

    const moveEmployee = (index, direction) => {
        if (direction === -1 && index === 0) return;
        if (direction === 1 && index === employees.length - 1) return;
        
        const newIndex = index + direction;
        
        let _employees = [...employees];
        const item = _employees.splice(index, 1)[0];
        _employees.splice(newIndex, 0, item);
        setEmployees(_employees);
        
        if (generatedResult) {
            let _matrix = [...generatedResult.matrix];
            const matrixItem = _matrix.splice(index, 1)[0];
            _matrix.splice(newIndex, 0, matrixItem);
            setGeneratedResult({...generatedResult, matrix: _matrix});
        }
    };

    useEffect(() => {
        localStorage.setItem('shift_employees', JSON.stringify(employees));
    }, [employees]);

    useEffect(() => {
        if (generatedResult) {
            localStorage.setItem('shift_generatedResult', JSON.stringify(generatedResult));
        } else {
            localStorage.removeItem('shift_generatedResult');
        }
    }, [generatedResult]);

    useEffect(() => {
        localStorage.setItem('shift_thickDays', JSON.stringify(thickDays));
    }, [thickDays]);

    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // Modal Form State
    const [empName, setEmpName] = useState('');
    const [empType, setEmpType] = useState('正社員');
    const [empRS, setEmpRS] = useState(false);
    const [empIsKeyHolder, setEmpIsKeyHolder] = useState(false);
    const [empDays, setEmpDays] = useState(23);
    const [empRequests, setEmpRequests] = useState('');
    const [selectedShifts, setSelectedShifts] = useState(['④', '⑦']);

    // 特殊シフト(有休等)の勤務時間編集モーダル
    const [specialHoursModal, setSpecialHoursModal] = useState(null); // { i, d, hours } | null

    // 自由時間指定（従業員編集モーダル用）
    const [useCustomTime, setUseCustomTime] = useState(false);
    const [customStartTime, setCustomStartTime] = useState('09:00');
    const [customEndTime, setCustomEndTime] = useState('18:00');

    const addCustomShiftToEmployee = () => {
        if (!customStartTime || !customEndTime) return;
        const timeStr = `${customStartTime}～${customEndTime}`;
        setShiftMaster(prev => ({ ...prev, [timeStr]: timeStr }));
        setSelectedShifts(prev => prev.includes(timeStr) ? prev : [...prev, timeStr]);
        setCustomStartTime('09:00');
        setCustomEndTime('18:00');
    };

    // シフトパターン管理（ルール設定タブ用）
    const [newShiftName, setNewShiftName] = useState('');
    const [newShiftStart, setNewShiftStart] = useState('09:00');
    const [newShiftEnd, setNewShiftEnd] = useState('18:00');

    const addShiftPattern = () => {
        if (!newShiftName || !newShiftStart || !newShiftEnd) return;
        setShiftMaster(prev => ({ ...prev, [newShiftName]: `${newShiftStart}～${newShiftEnd}` }));
        setNewShiftName('');
        setNewShiftStart('09:00');
        setNewShiftEnd('18:00');
    };

    const deleteShiftPattern = (id) => {
        const newMaster = { ...shiftMaster };
        delete newMaster[id];
        setShiftMaster(newMaster);
    };

    const handleTypeChange = (type, updateDays = true) => {
        setEmpType(type);
        if (updateDays) setEmpDays(DEFAULT_DAYS[type]);
        
        if (type === '正社員') setSelectedShifts(['④', '⑦']);
        else if (type === '時間限定社員' || type === '準社員') {
            if (!selectedShifts.includes('④') && !selectedShifts.includes('⑦')) setSelectedShifts(['④']);
            else if (selectedShifts.length > 1) setSelectedShifts([selectedShifts[0]]);
        }
        else if (type === '早パート') setSelectedShifts(['①']);
        else if (type === '早ロングパート') setSelectedShifts(['③']);
        else if (type === '中パート') setSelectedShifts(['⑥']);
        else if (type === '中ロングパート') setSelectedShifts(['⑤']);
        else if (type === '遅パート') setSelectedShifts(['⑨']);
        else if (type === '遅ロングパート') setSelectedShifts(['⑧']);
    };

    const openModal = (index = null) => {
        if (index !== null) {
            const emp = employees[index];
            setEditingIndex(index);
            setEmpName(emp.name);
            setEmpType(emp.type);
            setEmpRS(emp.isRS);
            setEmpIsKeyHolder(!!emp.isKeyHolder);
            setEmpDays(emp.days);
            setEmpRequests(emp.requests || '');
            setSelectedShifts([...emp.shifts]);
        } else {
            setEditingIndex(null);
            setEmpName('');
            setEmpRS(false);
            setEmpIsKeyHolder(false);
            setEmpRequests('');
            handleTypeChange('正社員', true);
        }
        setUseCustomTime(false);
        setCustomStartTime('');
        setCustomEndTime('');
        setShowModal(true);
    };

    const saveEmployee = () => {
        const emp = {
            name: empName || '名称未設定',
            type: empType,
            isRS: empRS,
            isKeyHolder: empIsKeyHolder,
            days: parseInt(empDays, 10),
            shifts: [...selectedShifts],
            requests: empRequests
        };
        const newData = [...employees];
        if (editingIndex !== null) newData[editingIndex] = emp;
        else newData.push(emp);
        
        setEmployees(newData);
        setShowModal(false);
        setGeneratedResult(null); // Reset result since data changed
    };

    const deleteEmployee = (index) => {
        if(window.confirm(`「${employees[index].name}」を削除してもよろしいですか？`)) {
            const newData = [...employees];
            newData.splice(index, 1);
            setEmployees(newData);
            setGeneratedResult(null);
        }
    };

    const API_URL = 'https://shift-app-rw01.onrender.com/api/generate_shift';

    const buildShiftTypesPayload = () => {
        const realShifts = Object.entries(shiftMaster).map(([id, timeStr]) => {
            const [start, end] = timeStr.split('～');
            return { id, start_time: start, end_time: end, is_special: false };
        });
        const specialShifts = SPECIAL_SHIFTS.map(id => ({ id, start_time: '0:00', end_time: '0:00', is_special: true }));
        return [...realShifts, ...specialShifts];
    };

    const buildRequestsOff = (periodDatesForSubmit) => {
        let allRequestsOff = [];
        employees.forEach((e, idx) => {
            if (e.requests) {
                const days = e.requests.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                days.forEach(day => {
                    const dateObj = periodDatesForSubmit[day - 1];
                    if (dateObj) {
                        allRequestsOff.push({
                            employee_id: `emp_${idx}`,
                            date: toISODate(dateObj)
                        });
                    }
                });
            }
        });
        return allRequestsOff;
    };

    const generateShift = async () => {
        setIsGenerating(true);
        setGeneratedResult(null);

        try {
            const periodDatesForSubmit = getPeriodDates(currentYear, currentMonth);
            const payload = {
                year: currentYear,
                month: currentMonth,
                employees: employees.map((e, idx) => ({
                    id: `emp_${idx}`,
                    name: e.name,
                    employment_type: e.type,
                    contract_days: e.days,
                    is_registered_seller: e.isRS,
                    allowed_shifts: e.shifts
                })),
                shift_types: buildShiftTypesPayload(),
                requests_off: buildRequestsOff(periodDatesForSubmit),
                thick_staffing_days: thickDays,
                weekday_ranks: weekdayRanks,
                weekday_min_staff: weekdayMinStaff,
                fixed_assignments: []
            };

            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok && (data.status === "SUCCESS" || data.status === "FEASIBLE_WITH_WARNINGS")) {
                const newMatrix = employees.map((emp, idx) => {
                    const empShifts = data.shifts[`emp_${idx}`] || [];
                    return empShifts.map(s => ({ shift: s, isError: false, isFixed: false }));
                });
                setGeneratedResult({
                    matrix: newMatrix,
                    hasError: data.status === "FEASIBLE_WITH_WARNINGS",
                    warnings: data.warnings || []
                });
            } else {
                alert("シフト生成に失敗しました: \n" + (data.detail || data.message || "制約が厳しすぎるため解が見つかりませんでした。希望休や登録販売者の数を見直してください。"));
            }
        } catch (e) {
            alert("通信エラーが発生しました: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // 「空欄自動作成」: 既に値が入っているセル(手動編集/前回生成結果)はそのまま固定し、
    // 空欄セルのみをバックエンドへ送って穴埋めする
    const fillBlanks = async () => {
        if (!generatedResult) return;
        setIsGenerating(true);

        try {
            const periodDatesForSubmit = getPeriodDates(currentYear, currentMonth);
            let fixedAssignments = [];
            employees.forEach((e, idx) => {
                generatedResult.matrix[idx].forEach((cell, d) => {
                    if (cell && cell.shift) {
                        fixedAssignments.push({
                            employee_id: `emp_${idx}`,
                            day_index: d,
                            shift_id: cell.shift === '休' ? 'OFF' : cell.shift
                        });
                    }
                });
            });

            const payload = {
                year: currentYear,
                month: currentMonth,
                employees: employees.map((e, idx) => ({
                    id: `emp_${idx}`,
                    name: e.name,
                    employment_type: e.type,
                    contract_days: e.days,
                    is_registered_seller: e.isRS,
                    allowed_shifts: e.shifts
                })),
                shift_types: buildShiftTypesPayload(),
                requests_off: buildRequestsOff(periodDatesForSubmit),
                thick_staffing_days: thickDays,
                weekday_ranks: weekdayRanks,
                weekday_min_staff: weekdayMinStaff,
                fixed_assignments: fixedAssignments
            };

            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok && (data.status === "SUCCESS" || data.status === "FEASIBLE_WITH_WARNINGS")) {
                const newMatrix = employees.map((emp, idx) => {
                    const empShifts = data.shifts[`emp_${idx}`] || [];
                    return generatedResult.matrix[idx].map((cell, d) => {
                        if (cell && cell.shift) return cell; // 保護セルはそのまま維持
                        const s = empShifts[d];
                        return { shift: s === undefined ? '休' : s, isError: false, isFixed: false };
                    });
                });
                setGeneratedResult({
                    matrix: newMatrix,
                    hasError: data.status === "FEASIBLE_WITH_WARNINGS",
                    warnings: data.warnings || []
                });
            } else {
                alert("空欄自動作成に失敗しました: \n" + (data.detail || data.message || "制約が厳しすぎるため解が見つかりませんでした。"));
            }
        } catch (e) {
            alert("通信エラーが発生しました: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // セルを手動編集した際、自動的に「保護」状態にする（空欄自動作成で上書きされない）
    // value === '' の場合は保護解除（空欄自動作成の対象に戻す）
    const updateCell = (i, d, value) => {
        const newMatrix = [...generatedResult.matrix];
        const prevCell = newMatrix[i][d];
        const isSpecial = SPECIAL_SHIFTS.includes(value) && !SPECIAL_OFF_LIKE.has(value);
        newMatrix[i][d] = {
            shift: value,
            isError: false,
            isFixed: value !== '',
            hours: isSpecial ? (prevCell && prevCell.hours ? prevCell.hours : DEFAULT_SPECIAL_HOURS) : undefined
        };
        setGeneratedResult({ ...generatedResult, matrix: newMatrix });
        if (isSpecial) {
            setSpecialHoursModal({ i, d, hours: newMatrix[i][d].hours });
        }
    };

    const applySpecialHours = () => {
        if (!specialHoursModal) return;
        const { i, d, hours } = specialHoursModal;
        const newMatrix = [...generatedResult.matrix];
        newMatrix[i][d] = { ...newMatrix[i][d], hours: parseFloat(hours) || 0 };
        setGeneratedResult({ ...generatedResult, matrix: newMatrix });
        setSpecialHoursModal(null);
    };

    // 従業員1名分の出勤日数・合計時間（特殊シフトも規定通り集計）
    const computeEmployeeStats = (i) => {
        if (!generatedResult || !generatedResult.matrix[i]) return { days: 0, hours: 0 };
        let days = 0, hours = 0;
        generatedResult.matrix[i].forEach(cell => {
            if (!cell || !cell.shift) return;
            if (cell.shift === '休') return;
            if (SPECIAL_SHIFTS.includes(cell.shift)) {
                if (SPECIAL_OFF_LIKE.has(cell.shift)) return;
                days += 1;
                hours += (cell.hours ?? DEFAULT_SPECIAL_HOURS);
                return;
            }
            const timeStr = shiftMaster[cell.shift];
            if (timeStr && timeStr.includes('～')) {
                const [s, e] = timeStr.split('～');
                hours += (timeToMin(e) - timeToMin(s)) / 60;
            }
            days += 1;
        });
        return { days, hours };
    };

    // 指定日の「登録販売者スキマ不在」と「開店/閉店の鍵持ち充足」を判定
    const analyzeDay = (d) => {
        if (!generatedResult) return { gaps: [], openerOk: true, closerOk: true, minStart: null, maxEnd: null, openerIdx: [], closerIdx: [] };
        const businessStart = timeToMin(BUSINESS_START_LABEL);
        const businessEnd = timeToMin(BUSINESS_END_LABEL);
        let rsIntervals = [];
        let allIntervals = [];
        employees.forEach((emp, i) => {
            const cell = generatedResult.matrix[i] ? generatedResult.matrix[i][d] : null;
            if (!cell || !cell.shift || cell.shift === '休' || SPECIAL_SHIFTS.includes(cell.shift)) return;
            const timeStr = shiftMaster[cell.shift];
            if (!timeStr || !timeStr.includes('～')) return;
            const [s, e] = timeStr.split('～');
            const range = [timeToMin(s), timeToMin(e)];
            allIntervals.push({ idx: i, range });
            if (emp.isRS) rsIntervals.push(range);
        });

        rsIntervals.sort((a, b) => a[0] - b[0]);
        let gaps = [];
        let cursor = businessStart;
        rsIntervals.forEach(([s, e]) => {
            if (s > cursor) gaps.push([cursor, Math.min(s, businessEnd)]);
            cursor = Math.max(cursor, e);
        });
        if (cursor < businessEnd) gaps.push([cursor, businessEnd]);
        gaps = gaps.filter(([s, e]) => e > s);

        let openerOk = true, closerOk = true, minStart = null, maxEnd = null, openerIdx = [], closerIdx = [];
        if (allIntervals.length > 0) {
            minStart = Math.min(...allIntervals.map(x => x.range[0]));
            maxEnd = Math.max(...allIntervals.map(x => x.range[1]));
            const openers = allIntervals.filter(x => x.range[0] === minStart);
            const closers = allIntervals.filter(x => x.range[1] === maxEnd);
            openerIdx = openers.map(x => x.idx);
            closerIdx = closers.map(x => x.idx);
            openerOk = openers.some(x => employees[x.idx] && employees[x.idx].isKeyHolder);
            closerOk = closers.some(x => employees[x.idx] && employees[x.idx].isKeyHolder);
        }
        return { gaps, openerOk, closerOk, minStart, maxEnd, openerIdx, closerIdx };
    };

    const periodDates = getPeriodDates(currentYear, currentMonth);
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayAnalyses = generatedResult ? periodDates.map((_, d) => analyzeDay(d)) : [];

    const renderCellNode = (cell) => {
        if (!cell || !cell.shift) return <>－</>;
        if (cell.shift === '休' || SPECIAL_OFF_LIKE.has(cell.shift)) return <>{cell.shift === '休' ? '休' : cell.shift}</>;
        if (SPECIAL_SHIFTS.includes(cell.shift)) {
            return <>{cell.shift}<br />{cell.hours ?? DEFAULT_SPECIAL_HOURS}h</>;
        }
        const shiftText = shiftMaster[cell.shift] || cell.shift;
        const lines = shiftText.includes('～') ? shiftText.split('～') : [shiftText];
        return lines.length === 2 ? <>{lines[0]}<br />~{lines[1]}</> : <>{cell.shift}</>;
    };

    const cellClassName = (emp, cell, empIdx, d) => {
        let cssClass = 'shift-cell ';
        if (!cell || !cell.shift) cssClass += 'off';
        else if (cell.shift === '休' || SPECIAL_OFF_LIKE.has(cell.shift)) cssClass += 'off';
        else if (SPECIAL_SHIFTS.includes(cell.shift)) cssClass += 'special';
        else if (emp.isRS) cssClass += 'rs';
        else cssClass += 'normal';
        if (cell && cell.isError) cssClass += ' error';
        if (cell && cell.isFixed) cssClass += ' fixed';
        const da = dayAnalyses[d];
        if (da) {
            if (da.openerIdx.includes(empIdx)) cssClass += ' key-open';
            if (da.closerIdx.includes(empIdx)) cssClass += ' key-close';
        }
        return cssClass;
    };

    return (
        <div style={{display: 'flex', width: '100%', minHeight: '100vh'}}>
            {/* Mobile Header */}
            {isMobileView && (
                <div className="mobile-header">
                    <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(true)}>
                        <Menu size={24} />
                    </button>
                    <div className="logo" style={{display: 'flex', alignItems: 'center'}}><Calendar size={20} /><span style={{fontSize: '0.75rem', marginLeft: '6px', background: '#EEF2FF', color: '#4F46E5', padding: '2px 6px', borderRadius: '4px', fontWeight: 600}}>v4.12</span></div>
                </div>
            )}

            {/* Sidebar Overlay (Mobile) */}
            {isMobileView && isMobileMenuOpen && (
                <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            {/* Sidebar */}
            <div className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="logo pc-only" style={{display: 'flex', alignItems: 'center'}}><Calendar style={{color:'var(--primary)'}}/> Shift-Ag <span style={{fontSize: '0.75rem', marginLeft: '8px', background: '#EEF2FF', color: '#4F46E5', padding: '2px 6px', borderRadius: '4px', fontWeight: 600}}>v4.12</span></div>
                <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false);}}>
                    <Calendar size={18} /> 全体シフト表
                </div>
                <div className={`nav-item ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => {setActiveTab('employees'); setIsMobileMenuOpen(false);}}>
                    <Users size={18} /> 従業員管理
                </div>
                <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => {setActiveTab('settings'); setIsMobileMenuOpen(false);}}>
                    <Settings size={18} /> ルール設定
                </div>
            </div>

            {/* Main Content */}
            <div className="main-content">
                {activeTab === 'dashboard' && (
                    <div className="tab-content active">
                        <div className="header">
                            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    <button className="btn outline" style={{padding: '4px 8px'}} onClick={() => changeMonth(-1)}>&lt;</button>
                                    <div>
                                        <h1 style={{margin: 0}}>{currentYear}年{currentMonth}月度</h1>
                                        <div style={{fontSize: '0.8rem', color: 'var(--text-sub)'}}>{formatDateLabel(periodDates[0])}〜{formatDateLabel(periodDates[periodDates.length - 1])} 締め</div>
                                    </div>
                                    <button className="btn outline" style={{padding: '4px 8px'}} onClick={() => changeMonth(1)}>&gt;</button>
                                </div>
                            </div>
                            <div style={{display: 'flex', gap: '8px'}}>
                                {generatedResult && (
                                    <button className="btn outline" onClick={fillBlanks} disabled={isGenerating}>
                                        <Wand2 size={16}/> 空欄自動作成
                                    </button>
                                )}
                                <button className="btn" onClick={generateShift} disabled={isGenerating}>
                                    <Wand2 size={16}/> 最適化シフトを生成
                                </button>
                            </div>
                        </div>

                        {!generatedResult && !isGenerating && (
                            <div className="glass-card" style={{textAlign: 'center', padding: '80px 20px'}}>
                                <Calendar size={48} color="#CBD5E1" style={{marginBottom:'16px'}}/>
                                <h2 style={{color: 'var(--text-sub)', fontWeight: 500}}>右上のボタンからシフトを生成してください</h2>
                            </div>
                        )}

                        {generatedResult && (
                            <>
                                {generatedResult.hasError && generatedResult.warnings && generatedResult.warnings.length > 0 && (
                                    <div className="warning-panel" style={{display: 'block', marginBottom: '16px'}}>
                                        <div className="warning-title"><AlertCircle size={18}/> 【AIシフト作成・自動診断アドバイス】</div>
                                        {generatedResult.warnings.map((warn, wIdx) => (
                                            <div key={wIdx} className="warning-item" style={{marginTop: '8px', fontSize: '0.9rem'}}>
                                                <div className="warning-msg">{warn}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '16px'}}>
                                    <button className="btn outline" onClick={() => setIsMobileView(!isMobileView)}>
                                        {isMobileView ? '💻 PCビューで表示' : '📱 スマホビューで表示'}
                                    </button>
                                </div>

                                {isMobileView ? (
                                    <div className="glass-card" style={{padding: '16px'}}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', background: '#F8FAFC', padding: '12px', borderRadius: '8px'}}>
                                            <button className="btn outline" style={{padding: '6px 12px'}} onClick={() => setSelectedDateIndex(Math.max(0, selectedDateIndex - 1))}>&lt;</button>
                                            <h3 style={{margin: 0, fontSize: '1.2rem', color: 'var(--primary)'}}>{formatDateLabel(periodDates[selectedDateIndex])} ({dayNames[periodDates[selectedDateIndex].getDay()]})</h3>
                                            <button className="btn outline" style={{padding: '6px 12px'}} onClick={() => setSelectedDateIndex(Math.min(periodDates.length - 1, selectedDateIndex + 1))}>&gt;</button>
                                        </div>
                                        {dayAnalyses[selectedDateIndex] && (
                                            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px'}}>
                                                {dayAnalyses[selectedDateIndex].gaps.length > 0 && (
                                                    <span className="day-alert-badge" title={dayAnalyses[selectedDateIndex].gaps.map(g => `${minToLabel(g[0])}～${minToLabel(g[1])}`).join(', ')}>❌ 登販不在あり</span>
                                                )}
                                                {!dayAnalyses[selectedDateIndex].openerOk && dayAnalyses[selectedDateIndex].minStart !== null && (
                                                    <span className="day-alert-badge">❌ 朝鍵不在</span>
                                                )}
                                                {!dayAnalyses[selectedDateIndex].closerOk && dayAnalyses[selectedDateIndex].maxEnd !== null && (
                                                    <span className="day-alert-badge">❌ 夜鍵不在</span>
                                                )}
                                            </div>
                                        )}
                                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                            {employees.map((emp, i) => {
                                                const cell = generatedResult.matrix[i][selectedDateIndex];
                                                const cssClass = cellClassName(emp, cell, i, selectedDateIndex);
                                                const stats = computeEmployeeStats(i);
                                                const isSpecialEditable = cell && SPECIAL_SHIFTS.includes(cell.shift) && !SPECIAL_OFF_LIKE.has(cell.shift);

                                                return (
                                                    <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB'}}>
                                                        <div>
                                                            <div style={{fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)'}}>{emp.name}</div>
                                                            <div style={{fontSize: '0.75rem', color: '#6B7280', marginTop: '4px'}}>{emp.isRS ? <span style={{background:'#D1FAE5', color:'#065F46', padding:'2px 4px', borderRadius:'4px', marginRight:'4px'}}>登販</span> : ''}{emp.isKeyHolder ? <span style={{marginRight:'4px'}}>🔑</span> : ''} {emp.type}</div>
                                                            <div className="staff-stat-badge">{stats.days}日 / {stats.hours.toFixed(1)}h</div>
                                                        </div>
                                                        <div style={{width: '60px', position: 'relative'}}>
                                                            <div className={cssClass} style={{ pointerEvents: 'none', textAlign: 'center', fontSize: '0.8rem', padding: '6px', borderRadius: '4px', lineHeight: '1.2' }}>
                                                                {renderCellNode(cell)}
                                                            </div>
                                                            <select
                                                                value={cell.shift || ''}
                                                                style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', appearance: 'none', zIndex: 1}}
                                                                onChange={(e) => updateCell(i, selectedDateIndex, e.target.value)}
                                                            >
                                                                <option value="">－ (未設定)</option>
                                                                <option value="休">休</option>
                                                                {emp.shifts.map(s => <option key={s} value={s}>{shiftMaster[s] || s}</option>)}
                                                                <optgroup label="特殊シフト">
                                                                    {SPECIAL_SHIFTS.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                                                                </optgroup>
                                                            </select>
                                                            {isSpecialEditable && (
                                                                <button type="button" className="hours-edit-btn" style={{zIndex: 2}}
                                                                    onClick={(ev) => { ev.stopPropagation(); setSpecialHoursModal({ i, d: selectedDateIndex, hours: cell.hours ?? DEFAULT_SPECIAL_HOURS }); }}>✎</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="glass-card" style={{padding: '16px'}}>
                                        <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th style={{width: '40px'}}></th>
                                                    <th>従業員</th>
                                                    {periodDates.map((d, i) => {
                                                        const dow = d.getDay();
                                                        const cls = dow === 0 ? 'sun' : dow === 6 ? 'sat' : '';
                                                        const da = dayAnalyses[i];
                                                        return (
                                                            <th key={i}>
                                                                {formatDateLabel(d)}<span className={`day-label ${cls}`}>({dayNames[dow]})</span>
                                                                {da && da.gaps.length > 0 && (
                                                                    <div className="day-alert" title={da.gaps.map(g => `${minToLabel(g[0])}～${minToLabel(g[1])}`).join(', ')}>❌登販</div>
                                                                )}
                                                                {da && !da.openerOk && da.minStart !== null && <div className="day-alert">❌朝鍵</div>}
                                                                {da && !da.closerOk && da.maxEnd !== null && <div className="day-alert">❌夜鍵</div>}
                                                            </th>
                                                        )
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {employees.map((emp, i) => {
                                                    const shortType = emp.type.replace('パート', 'パ').replace('ロング', 'L').substring(0,4);
                                                    return (
                                                        <tr 
                                                            key={i}
                                                            draggable 
                                                            onDragStart={() => dragItem.current = i} 
                                                            onDragEnter={() => dragOverItem.current = i} 
                                                            onDragEnd={handleSort} 
                                                            onDragOver={(e) => e.preventDefault()}
                                                        >
                                                            <td style={{width: '28px', textAlign: 'center', color: '#9CA3AF'}}>
                                                                <span className="drag-handle-compact">⋮⋮</span>
                                                            </td>
                                                            <td>
                                                                <div style={{fontWeight:600}}>{emp.name}</div>
                                                                <div style={{fontSize:'0.7rem', color:'#9CA3AF'}}>{emp.isRS ? '登販/' : ''}{emp.isKeyHolder ? '🔑/' : ''}{shortType}</div>
                                                                <div className="staff-stat-badge">{(() => { const st = computeEmployeeStats(i); return `${st.days}日 / ${st.hours.toFixed(1)}h`; })()}</div>
                                                            </td>
                                                            {generatedResult.matrix[i].map((cell, d) => {
                                                                const cssClass = cellClassName(emp, cell, i, d);
                                                                const isSpecialEditable = cell && SPECIAL_SHIFTS.includes(cell.shift) && !SPECIAL_OFF_LIKE.has(cell.shift);

                                                                return (
                                                                    <td key={d} style={{position: 'relative', width: '50px'}}>
                                                                        <div className={cssClass} style={{ pointerEvents: 'none', textAlign: 'center', fontSize: '0.75rem', padding: '4px', borderRadius: '4px', lineHeight: '1.2', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                                            {renderCellNode(cell)}
                                                                        </div>
                                                                        <select
                                                                            value={cell.shift || ''}
                                                                            style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', appearance: 'none', zIndex: 1}}
                                                                            onChange={(e) => updateCell(i, d, e.target.value)}
                                                                        >
                                                                            <option value="">－ (未設定)</option>
                                                                            <option value="休">休</option>
                                                                            {emp.shifts.map(s => <option key={s} value={s}>{shiftMaster[s] || s}</option>)}
                                                                            <optgroup label="特殊シフト">
                                                                                {SPECIAL_SHIFTS.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                                                                            </optgroup>
                                                                        </select>
                                                                        {isSpecialEditable && (
                                                                            <button type="button" className="hours-edit-btn" style={{zIndex: 2}}
                                                                                onClick={(ev) => { ev.stopPropagation(); setSpecialHoursModal({ i, d, hours: cell.hours ?? DEFAULT_SPECIAL_HOURS }); }}>✎</button>
                                                                        )}
                                                                    </td>
                                                                )
                                                            })}
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="tab-content active">
                        <div className="header">
                            <div>
                                <h1>店舗・ルール設定</h1>
                                <p style={{color: 'var(--text-sub)', marginTop: '4px'}}>シフト自動生成時にAIが考慮する「曜日ごとの目標出勤人数」を設定します</p>
                            </div>
                        </div>
                        <div className="glass-card">
                            <h3 style={{marginBottom: '16px', color: 'var(--text-main)'}}>曜日ごとの出勤優先順位（1位〜7位）</h3>
                            <p style={{fontSize: '0.85rem', color: 'var(--text-sub)', marginBottom: '16px'}}>
                                ※曜日の優先度を1位（最優先で人を手厚くしたい）〜7位（最も少なくて良い）で設定できます。<br/>
                                AIが全体の出勤人数の平準化（バランス）を第一に保ちながら、この順位通りに人数を調整します。
                            </p>
                            <div style={{display: 'grid', gridTemplateColumns: isMobileView ? 'repeat(2, 1fr)' : 'repeat(7, 1fr)', gap: '10px', marginBottom: '24px'}}>
                                {[
                                    { key: 6, name: '日曜日' },
                                    { key: 0, name: '月曜日' },
                                    { key: 1, name: '火曜日' },
                                    { key: 2, name: '水曜日' },
                                    { key: 3, name: '木曜日' },
                                    { key: 4, name: '金曜日' },
                                    { key: 5, name: '土曜日' },
                                ].map(d => (
                                    <div key={d.key} style={{background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB', textAlign: 'center'}}>
                                        <div style={{fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px'}}>{d.name}</div>
                                        <select
                                            value={weekdayRanks[d.key] ?? 4}
                                            style={{width: '100%', padding: '6px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #CBD5E1', cursor: 'pointer', textAlign: 'center'}}
                                            onChange={(e) => setWeekdayRanks({...weekdayRanks, [d.key]: parseInt(e.target.value, 10)})}
                                        >
                                            {[1, 2, 3, 4, 5, 6, 7].map(r => (
                                                <option key={r} value={r}>
                                                    {r}位 {r === 1 ? '(最高)' : r === 7 ? '(最低)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <h3 style={{marginBottom: '16px', color: 'var(--text-main)'}}>曜日ごとの最低出勤人数（個別設定）</h3>
                            <p style={{fontSize: '0.85rem', color: 'var(--text-sub)', marginBottom: '16px'}}>
                                ※各曜日で「必ず〇名以上出勤させる」最低人数を設定できます。0 は制限なし。上限（平均+1名）を超えた場合は自動調整されます。
                            </p>
                            <div style={{display: 'grid', gridTemplateColumns: isMobileView ? 'repeat(2, 1fr)' : 'repeat(7, 1fr)', gap: '10px', marginBottom: '24px'}}>
                                {[
                                    { key: 6, name: '日曜日' },
                                    { key: 0, name: '月曜日' },
                                    { key: 1, name: '火曜日' },
                                    { key: 2, name: '水曜日' },
                                    { key: 3, name: '木曜日' },
                                    { key: 4, name: '金曜日' },
                                    { key: 5, name: '土曜日' },
                                ].map(d => (
                                    <div key={d.key} style={{background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB', textAlign: 'center'}}>
                                        <div style={{fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px'}}>{d.name}</div>
                                        <input
                                            type="number"
                                            min="0"
                                            max="30"
                                            value={weekdayMinStaff[d.key] ?? 0}
                                            style={{width: '100%', padding: '6px', fontSize: '0.9rem', borderRadius: '6px', border: '1px solid #CBD5E1', textAlign: 'center'}}
                                            onChange={(e) => setWeekdayMinStaff({...weekdayMinStaff, [d.key]: parseInt(e.target.value, 10) || 0})}
                                        />
                                        <div style={{fontSize: '0.75rem', color: 'var(--text-sub)', marginTop: '4px'}}>{(weekdayMinStaff[d.key] ?? 0) === 0 ? '制限なし' : `最低 ${weekdayMinStaff[d.key]}名`}</div>
                                    </div>
                                ))}
                            </div>

                            <h3 style={{marginBottom: '16px', color: 'var(--text-main)'}}>人員を厚くしたい日（追加の個別指定）</h3>
                            <p style={{fontSize: '0.85rem', color: 'var(--text-sub)', marginBottom: '12px'}}>※特売日などで通常よりシフトを手厚くしたい日付を選択してください。（複数選択可・{formatDateLabel(periodDates[0])}〜{formatDateLabel(periodDates[periodDates.length - 1])}の対象期間）</p>
                            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                                {periodDates.map((d, i) => {
                                    const day = i + 1;
                                    const isSelected = thickDays.includes(day);
                                    return (
                                        <button
                                            key={day}
                                            className={`shift-badge-toggle ${isSelected ? 'selected' : ''}`}
                                            style={{width: '50px', textAlign: 'center', padding: '8px'}}
                                            onClick={() => {
                                                if(isSelected) setThickDays(thickDays.filter(x => x !== day));
                                                else setThickDays([...thickDays, day]);
                                            }}
                                        >
                                            {formatDateLabel(d)}
                                        </button>
                                    )
                                })}
                            </div>

                            <div style={{marginTop: '24px', fontSize: '0.88rem', color: 'var(--text-sub)', background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB', lineHeight: 1.7}}>
                                <strong style={{color: 'var(--primary)', fontSize: '0.95rem', display: 'block', marginBottom: '8px'}}>🤖 AI自動最適化ルール（現在適用中の一覧）</strong>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                    <div><strong style={{color: 'var(--text-main)'}}>【絶対禁止・絶対遵守ルール（ハード制約）】</strong></div>
                                    <div style={{paddingLeft: '12px'}}>
                                        ・<strong>希望休の絶対厳守：</strong> 申請された希望休は100%絶対に休みに設定します（連休制限の対象からも除外）。<br/>
                                        ・<strong>連勤上限（社員5連勤/パート等4連勤）：</strong> 正社員・準社員は最大5連勤まで、パート・アルバイト等は最大4連勤までに厳しく制限します。<br/>
                                        ・<strong>連休制限（社員最大2連休/パート最大3連休）：</strong> 正社員・準社員は自動割り当てでの3連休以上を絶対禁止（最大2連休）、パート等は自動5連休以上を絶対禁止します。<br/>
                                        ・<strong>登録販売者の絶対配置：</strong> 営業時間（8:15～24:00）の全時間帯で登録販売者を1名以上確実に配置します。<br/>
                                        ・<strong>契約日数の厳守：</strong> 従業員ごとの契約日数に合わせてぴったり割り当てます。<br/>
                                        ・<strong>1日の出勤上限：</strong> どんな日でも総従業員数の70%以下（例: 10人なら最大7人）に自動制限します。<br/>
                                        ・<strong>出勤人数の厳格平準化（平均±1名制限）：</strong> 全員の契約日数から1日の平均人数を自動計算し、全曜日の出勤人数を「平均±1名以内」に強制固定します（10人対2人等の極端な偏りは絶対発生しません）。
                                    </div>
                                    <div style={{marginTop: '6px'}}><strong style={{color: 'var(--text-main)'}}>【自動評価・イベントルール（ソフト制約）】</strong></div>
                                    <div style={{paddingLeft: '12px'}}>
                                        ・<strong>連勤・連休のソフト抑制：</strong> 社員の5連勤・パートの4連勤・パートの4連休はペナルティ加算により極力回避します。<br/>
                                        ・<strong>曜日優先順位による人員配分（最大1名差）：</strong><br/>
                                        &nbsp;&nbsp;🥇 1位〜2位（上位）： 平均 +1名 / ⚪ 3位〜5位（中位）： 平均ピタリ / 🔴 6位〜7位（下位）： 平均 -1名<br/>
                                        ・<strong>月末の抽選会・大抽選会：</strong> 通常月は対象期間末4日間、7月・12月は「大抽選会」として末5日間の人員を自動的に手厚く配分します。<br/>
                                        ・<strong>人員を厚くしたい日：</strong> カレンダーで個別選択された特売日等の人員を優先配分します。<br/>
                                        ・<strong>営業時間：</strong> 8:15～24:00 で固定計算しています。
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card">
                            <h3 style={{marginBottom: '16px', color: 'var(--text-main)'}}>シフトパターン管理（カスタム追加）</h3>
                            <p style={{fontSize: '0.85rem', color: 'var(--text-sub)', marginBottom: '12px'}}>「中番」など独自のシフトパターンを追加・削除できます。追加したパターンは従業員編集で選択できるようになります。</p>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px'}}>
                                {Object.entries(shiftMaster).map(([id, timeStr]) => (
                                    <div key={id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E5E7EB'}}>
                                        <span><strong>{id}</strong> : {timeStr}</span>
                                        <button className="btn danger" style={{padding: '4px 8px'}} onClick={() => deleteShiftPattern(id)}><Trash2 size={14}/></button>
                                    </div>
                                ))}
                            </div>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                                <input type="text" className="form-control" style={{width: '200px'}} placeholder="パターン名 (例: 中番)" value={newShiftName} onChange={e => setNewShiftName(e.target.value)}/>
                                <div style={{display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap'}}>
                                    <TimePicker value={newShiftStart || '09:00'} onChange={setNewShiftStart} />
                                    <span style={{paddingTop: '10px'}}>～</span>
                                    <TimePicker value={newShiftEnd || '18:00'} onChange={setNewShiftEnd} />
                                    <button className="btn" style={{alignSelf: 'flex-start', marginTop: '10px'}} onClick={addShiftPattern}><Plus size={16}/> 追加</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'employees' && (
                    <div className="tab-content active">
                        <div className="header">
                            <div>
                                <h1>従業員管理</h1>
                                <p style={{color: 'var(--text-sub)', marginTop: '4px'}}>スタッフの追加・編集・削除</p>
                            </div>
                            <button className="btn" onClick={() => openModal()}><Plus size={16}/> 新規追加</button>
                        </div>
                        <div className="glass-card" style={{padding: isMobileView ? '0' : '0', overflow: 'hidden', background: isMobileView ? 'transparent' : 'var(--glass-bg)', border: isMobileView ? 'none' : '', boxShadow: isMobileView ? 'none' : ''}}>
                            {isMobileView ? (
                                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                                    {employees.map((emp, i) => (
                                        <div key={i} style={{background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'}}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                                                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                                    <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                                        <button className="btn outline" style={{padding: '2px 4px'}} onClick={() => moveEmployee(i, -1)} disabled={i === 0}><ArrowUp size={16}/></button>
                                                        <button className="btn outline" style={{padding: '2px 4px'}} onClick={() => moveEmployee(i, 1)} disabled={i === employees.length - 1}><ArrowDown size={16}/></button>
                                                    </div>
                                                    <div style={{fontWeight: 700, fontSize: '1.1rem'}}>{emp.name}</div>
                                                </div>
                                                <div>{emp.isRS && <span style={{background: '#D1FAE5', color: '#065F46', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600}}>登販</span>}</div>
                                            </div>
                                            <div style={{display: 'flex', gap: '8px', marginBottom: '12px'}}>
                                                <span style={{background: '#F3F4F6', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem'}}>{emp.type}</span>
                                                <span style={{background: '#F3F4F6', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem'}}>契約: {emp.days}日</span>
                                            </div>
                                            <div style={{marginBottom: '16px'}}>
                                                <div style={{fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '4px'}}>可能シフト / 希望休:</div>
                                                <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center'}}>
                                                    {emp.shifts.map(s => <span key={s} style={{background:'#DBEAFE', color:'#1E40AF', padding:'4px 6px', borderRadius:'4px', fontSize:'0.8rem'}}>{s}</span>)}
                                                    {emp.requests && <span style={{fontSize: '0.8rem', color: '#DC2626', background: '#FEE2E2', padding: '4px 6px', borderRadius: '4px', marginLeft: '4px'}}>休: {emp.requests}</span>}
                                                </div>
                                            </div>
                                            <div style={{display: 'flex', gap: '8px', borderTop: '1px solid #E5E7EB', paddingTop: '12px'}}>
                                                <button className="btn outline" style={{flex: 1, padding: '8px', justifyContent: 'center'}} onClick={() => openModal(i)}><Edit size={16}/> 編集</button>
                                                <button className="btn danger" style={{flex: 1, padding: '8px', justifyContent: 'center'}} onClick={() => deleteEmployee(i)}><Trash2 size={16}/> 削除</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <table style={{width: '100%', minWidth: 'unset'}}>
                                    <thead style={{background: '#F8FAFC'}}>
                                        <tr>
                                            <th style={{width: '40px'}}></th>
                                            <th style={{position: 'static', textAlign: 'left', padding: '16px'}}>氏名</th>
                                            <th style={{position: 'static', textAlign: 'left'}}>雇用区分</th>
                                            <th style={{position: 'static', textAlign: 'center'}}>登録販売者</th>
                                            <th style={{position: 'static', textAlign: 'center'}}>契約日数</th>
                                            <th style={{position: 'static', textAlign: 'left'}}>可能シフト (時間帯)</th>
                                            <th style={{position: 'static', textAlign: 'center', width: '140px'}}>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.map((emp, i) => (
                                            <tr 
                                                key={i}
                                                draggable 
                                                onDragStart={() => dragItem.current = i} 
                                                onDragEnter={() => dragOverItem.current = i} 
                                                onDragEnd={handleSort} 
                                                onDragOver={(e) => e.preventDefault()}
                                            >
                                                <td style={{width: '40px', textAlign: 'center', color: '#9CA3AF', cursor: 'grab'}}>
                                                    <GripVertical size={16} className="drag-handle" />
                                                </td>
                                                <td style={{position: 'static', textAlign: 'left', padding: '16px', fontWeight: 600}}>{emp.name}</td>
                                                <td style={{position: 'static', textAlign: 'left'}}>{emp.type}</td>
                                                <td style={{position: 'static', textAlign: 'center'}}>
                                                    {emp.isRS ? <span style={{background: '#D1FAE5', color: '#065F46', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600}}>あり</span> : <span style={{color: 'var(--text-sub)'}}>なし</span>}
                                                </td>
                                                <td style={{position: 'static', textAlign: 'center'}}>{emp.days}日</td>
                                                <td style={{position: 'static', textAlign: 'left', lineHeight: 1.6}}>
                                                    {emp.shifts.map(s => <span key={s} style={{display:'inline-block', background:'#F3F4F6', padding:'2px 6px', borderRadius:'4px', fontSize:'0.8rem', margin:'2px'}}>{shiftMaster[s] && shiftMaster[s] !== s ? `${s} ${shiftMaster[s]}` : s}</span>)}
                                                    {emp.requests && <div style={{color: '#DC2626', fontSize: '0.85rem', marginTop: '4px', fontWeight: 500}}>希望休: {emp.requests}</div>}
                                                </td>
                                                <td style={{position: 'static', textAlign: 'center'}}>
                                                    <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                                        <button className="btn outline" style={{padding: '6px'}} onClick={() => openModal(i)}><Edit size={16}/></button>
                                                        <button className="btn danger" style={{padding: '6px'}} onClick={() => deleteEmployee(i)}><Trash2 size={16}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                            <h2>{editingIndex !== null ? '従業員を編集' : '従業員を追加'}</h2>
                            <X style={{cursor:'pointer', color: 'var(--text-sub)'}} onClick={() => setShowModal(false)}/>
                        </div>
                        
                        <div className="form-group">
                            <label>氏名</label>
                            <input type="text" className="form-control" value={empName} onChange={e => setEmpName(e.target.value)} placeholder="例: 山田 太郎"/>
                        </div>
                        
                        <div className="form-group">
                            <label>雇用区分</label>
                            <select className="form-control" value={empType} onChange={e => handleTypeChange(e.target.value)}>
                                {Object.keys(DEFAULT_DAYS).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="form-group" style={{marginTop: '24px', marginBottom: '12px'}}>
                            <label className="checkbox-label">
                                <input type="checkbox" checked={empRS} onChange={e => setEmpRS(e.target.checked)}/>
                                登録販売者資格あり
                            </label>
                        </div>

                        <div className="form-group" style={{marginBottom: '24px'}}>
                            <label className="checkbox-label">
                                <input type="checkbox" checked={empIsKeyHolder} onChange={e => setEmpIsKeyHolder(e.target.checked)}/>
                                🔑 鍵持ち（開店・閉店対応可）
                            </label>
                        </div>

                        <div className="form-group">
                            <label>希望休 (日付のみをカンマ区切りで入力)</label>
                            <input type="text" className="form-control" value={empRequests} onChange={e => setEmpRequests(e.target.value)} placeholder="例: 1, 15, 20"/>
                            <div style={{fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '4px'}}>※数字のみで入力してください</div>
                        </div>

                        <div className="form-group" style={{marginTop: '24px'}}>
                            <label>契約日数 (月間)</label>
                            <input type="number" className="form-control" value={empDays} onChange={e => setEmpDays(e.target.value)}/>
                        </div>

                        <div className="form-group">
                            <label>勤務可能シフト設定</label>
                            <div style={{background: '#F8FAFC', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px'}}>
                                {empType === '正社員' && (
                                    <>
                                        <div style={{fontWeight: 600, marginBottom: '4px'}}>正社員の固定シフト（切替可）</div>
                                        <div style={{fontSize: '0.9rem', color: 'var(--text-sub)'}}>・ ④ {SHIFT_MASTER['④']}<br/>・ ⑦ {SHIFT_MASTER['⑦']}</div>
                                    </>
                                )}
                                {['時間限定社員', '準社員'].includes(empType) && (
                                    <>
                                        <div style={{fontWeight: 600, marginBottom: '8px'}}>固定シフトを選択してください</div>
                                        <select className="form-control" value={selectedShifts[0]} onChange={e => setSelectedShifts([e.target.value])}>
                                            <option value="④">④ {SHIFT_MASTER['④']} (固定)</option>
                                            <option value="⑦">⑦ {SHIFT_MASTER['⑦']} (固定)</option>
                                        </select>
                                    </>
                                )}
                                {empType === '早パート' && (
                                    <>
                                        <div style={{fontWeight: 600, marginBottom: '8px'}}>固定シフトを選択してください</div>
                                        <select className="form-control" value={selectedShifts[0]} onChange={e => setSelectedShifts([e.target.value])}>
                                            <option value="①">① {SHIFT_MASTER['①']} (固定)</option>
                                            <option value="②">② {SHIFT_MASTER['②']} (固定)</option>
                                        </select>
                                    </>
                                )}
                                {empType === '早ロングパート' && (
                                    <>
                                        <div style={{fontWeight: 600, marginBottom: '4px'}}>早ロングパート固定シフト</div>
                                        <div style={{fontSize: '0.9rem', color: 'var(--text-sub)'}}>・ ③ {SHIFT_MASTER['③']}</div>
                                    </>
                                )}
                                {empType === '中パート' && (
                                    <>
                                        <div style={{fontWeight: 600, marginBottom: '4px'}}>中パート固定シフト</div>
                                        <div style={{fontSize: '0.9rem', color: 'var(--text-sub)'}}>・ ⑥ {SHIFT_MASTER['⑥']}</div>
                                    </>
                                )}
                                {empType === '中ロングパート' && (
                                    <>
                                        <div style={{fontWeight: 600, marginBottom: '4px'}}>中ロングパート固定シフト</div>
                                        <div style={{fontSize: '0.9rem', color: 'var(--text-sub)'}}>・ ⑤ {SHIFT_MASTER['⑤']}</div>
                                    </>
                                )}
                                {empType === '遅パート' && (
                                    <>
                                        <div style={{fontWeight: 600, marginBottom: '8px'}}>固定シフトを選択してください</div>
                                        <select className="form-control" value={selectedShifts[0]} onChange={e => setSelectedShifts([e.target.value])}>
                                            <option value="⑨">⑨ {SHIFT_MASTER['⑨']} (固定)</option>
                                            <option value="⑩">⑩ {SHIFT_MASTER['⑩']} (固定)</option>
                                            <option value="⑪">⑪ {SHIFT_MASTER['⑪']} (固定)</option>
                                        </select>
                                    </>
                                )}
                                {empType === '遅ロングパート' && (
                                    <>
                                        <div style={{fontWeight: 600, marginBottom: '4px'}}>遅ロングパート固定シフト</div>
                                        <div style={{fontSize: '0.9rem', color: 'var(--text-sub)'}}>・ ⑧ {SHIFT_MASTER['⑧']}</div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="checkbox-label">
                                <input type="checkbox" checked={useCustomTime} onChange={e => setUseCustomTime(e.target.checked)}/>
                                自由時間を入力
                            </label>
                            {useCustomTime && (
                                <div style={{marginTop: '8px'}}>
                                    <div style={{display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap'}}>
                                        <TimePicker value={customStartTime || '09:00'} onChange={setCustomStartTime} />
                                        <span style={{paddingTop: '10px'}}>～</span>
                                        <TimePicker value={customEndTime || '18:00'} onChange={setCustomEndTime} />
                                    </div>
                                    <button type="button" className="btn outline" style={{whiteSpace: 'nowrap', marginTop: '8px'}} onClick={addCustomShiftToEmployee}>この時間を追加</button>
                                </div>
                            )}
                            {selectedShifts.length > 0 && (
                                <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px'}}>
                                    {selectedShifts.map(s => (
                                        <span key={s} style={{background: '#EEF2FF', color: '#4338CA', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                                            {shiftMaster[s] || s}
                                            <X size={12} style={{cursor: 'pointer'}} onClick={() => setSelectedShifts(selectedShifts.filter(x => x !== s))}/>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px'}}>
                            <button className="btn outline" onClick={() => setShowModal(false)}>キャンセル</button>
                            <button className="btn" onClick={saveEmployee}>保存する</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 特殊シフト勤務時間 編集モーダル */}
            {specialHoursModal && (
                <div className="modal-overlay" onClick={() => setSpecialHoursModal(null)}>
                    <div className="modal" style={{maxWidth: '320px'}} onClick={e => e.stopPropagation()}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                            <h2 style={{fontSize: '1.1rem'}}>勤務時間を調整</h2>
                            <X style={{cursor:'pointer', color: 'var(--text-sub)'}} onClick={() => setSpecialHoursModal(null)}/>
                        </div>
                        <div className="form-group">
                            <label>個人時間として計上する時間数 (h)</label>
                            <input
                                type="number" min="0" max="24" step="0.5" className="form-control"
                                value={specialHoursModal.hours}
                                onChange={e => setSpecialHoursModal({...specialHoursModal, hours: e.target.value})}
                            />
                        </div>
                        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px'}}>
                            <button className="btn outline" onClick={() => setSpecialHoursModal(null)}>キャンセル</button>
                            <button className="btn" onClick={applySpecialHours}>保存する</button>
                        </div>
                    </div>
                </div>
            )}

            {isGenerating && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <h2 style={{color: 'var(--primary)'}}>最適化を実行中...</h2>
                </div>
            )}
        </div>
    );
}
