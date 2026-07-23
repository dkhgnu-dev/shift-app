import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Users, Settings, Plus, X, Edit, Trash2, AlertCircle, Wand2, Menu, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';

const SHIFT_MASTER = {
    '①': '8:15～12:15', '②': '8:15～14:15', '③': '8:15～16:15',
    '④': '8:15～17:30', '⑤': '11:00～19:00', '⑥': '14:00～19:00', '⑦': '15:30～24:00', '⑧': '17:00～24:00',
    '⑨': '17:00～22:00', '⑩': '19:00～24:00', '⑪': '21:00～24:00'
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
    { name: '田中 太郎', type: '正社員', isRS: true, days: 23, shifts: ['④', '⑦'], requests: '' },
    { name: '鈴木 花子', type: '時間限定社員', isRS: true, days: 23, shifts: ['⑦'], requests: '10, 11' },
    { name: '佐藤 次郎', type: '準社員', isRS: false, days: 23, shifts: ['④'], requests: '' },
    { name: '高橋 三郎', type: '早パート', isRS: false, days: 16, shifts: ['①'], requests: '' },
    { name: '伊藤 四郎', type: '遅パート', isRS: false, days: 16, shifts: ['⑨'], requests: '' },
    { name: '渡辺 五郎', type: '遅ロングパート', isRS: false, days: 20, shifts: ['⑧'], requests: '' },
    { name: '山本 六郎', type: '早ロングパート', isRS: false, days: 20, shifts: ['③'], requests: '' },
];

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
    const [empDays, setEmpDays] = useState(23);
    const [empRequests, setEmpRequests] = useState('');
    const [selectedShifts, setSelectedShifts] = useState(['④', '⑦']);

    // 自由時間指定（従業員編集モーダル用）
    const [useCustomTime, setUseCustomTime] = useState(false);
    const [customStartTime, setCustomStartTime] = useState('');
    const [customEndTime, setCustomEndTime] = useState('');

    const addCustomShiftToEmployee = () => {
        if (!customStartTime || !customEndTime) return;
        const timeStr = `${customStartTime}～${customEndTime}`;
        setShiftMaster(prev => ({ ...prev, [timeStr]: timeStr }));
        setSelectedShifts(prev => prev.includes(timeStr) ? prev : [...prev, timeStr]);
        setCustomStartTime('');
        setCustomEndTime('');
    };

    // シフトパターン管理（ルール設定タブ用）
    const [newShiftName, setNewShiftName] = useState('');
    const [newShiftStart, setNewShiftStart] = useState('');
    const [newShiftEnd, setNewShiftEnd] = useState('');

    const addShiftPattern = () => {
        if (!newShiftName || !newShiftStart || !newShiftEnd) return;
        setShiftMaster(prev => ({ ...prev, [newShiftName]: `${newShiftStart}～${newShiftEnd}` }));
        setNewShiftName('');
        setNewShiftStart('');
        setNewShiftEnd('');
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
            setEmpDays(emp.days);
            setEmpRequests(emp.requests || '');
            setSelectedShifts([...emp.shifts]);
        } else {
            setEditingIndex(null);
            setEmpName('');
            setEmpRS(false);
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

    const generateShift = async () => {
        setIsGenerating(true);
        setGeneratedResult(null);

        try {
            const shiftTypes = Object.entries(shiftMaster).map(([id, timeStr]) => {
                const [start, end] = timeStr.split('～');
                return { id, start_time: start, end_time: end };
            });

            const periodDatesForSubmit = getPeriodDates(currentYear, currentMonth);
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

            const payload = {
                year: currentYear,
                month: currentMonth,
                employees: employees.map((e, idx) => ({
                    id: `emp_${idx}`,
                    name: e.name,
                    contract_days: e.days,
                    is_registered_seller: e.isRS,
                    allowed_shifts: e.shifts
                })),
                shift_types: shiftTypes,
                requests_off: allRequestsOff,
                thick_staffing_days: thickDays
            };

            const res = await fetch('https://shift-app-rw01.onrender.com/api/generate_shift', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            
            if (res.ok && data.status === "SUCCESS") {
                const newMatrix = employees.map((emp, idx) => {
                    const empShifts = data.shifts[`emp_${idx}`] || [];
                    return empShifts.map(s => ({ shift: s, isError: false }));
                });
                setGeneratedResult({ matrix: newMatrix, hasError: false });
            } else {
                alert("シフト生成に失敗しました: \n" + (data.detail || data.message || "制約が厳しすぎるため解が見つかりませんでした。希望休や登録販売者の数を見直してください。"));
            }
        } catch (e) {
            alert("通信エラーが発生しました: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const periodDates = getPeriodDates(currentYear, currentMonth);
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

    return (
        <div style={{display: 'flex', width: '100%', minHeight: '100vh'}}>
            {/* Mobile Header */}
            {isMobileView && (
                <div className="mobile-header">
                    <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(true)}>
                        <Menu size={24} />
                    </button>
                    <div className="logo"><Calendar size={20} /></div>
                </div>
            )}
            
            {/* Sidebar Overlay (Mobile) */}
            {isMobileView && isMobileMenuOpen && (
                <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            {/* Sidebar */}
            <div className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="logo pc-only"><Calendar style={{color:'var(--primary)'}}/> Shift-Ag</div>
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
                            <button className="btn" onClick={generateShift} disabled={isGenerating}>
                                <Wand2 size={16}/> 最適化シフトを生成
                            </button>
                        </div>

                        {!generatedResult && !isGenerating && (
                            <div className="glass-card" style={{textAlign: 'center', padding: '80px 20px'}}>
                                <Calendar size={48} color="#CBD5E1" style={{marginBottom:'16px'}}/>
                                <h2 style={{color: 'var(--text-sub)', fontWeight: 500}}>右上のボタンからシフトを生成してください</h2>
                            </div>
                        )}

                        {generatedResult && (
                            <>
                                {generatedResult.hasError && (
                                    <div className="warning-panel" style={{display: 'block'}}>
                                        <div className="warning-title"><AlertCircle size={18}/> 未完成シフト：制約違反が検出されました</div>
                                        <div className="warning-item">
                                            <div className="warning-msg">⚠️ 8月3日(土) 19:00～24:00 登録販売者不足</div>
                                            <div className="suggestion-box">
                                                <div><strong>💡 AIの提案:</strong> 出勤予定の資格なしスタッフと休みの登販スタッフを入れ替えますか？</div>
                                                <button className="btn outline" style={{fontSize: '0.8rem', padding: '4px 8px'}}>入れ替える</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '16px'}}>
                                    <button className="btn outline" onClick={() => setIsMobileView(!isMobileView)}>
                                        {isMobileView ? '💻 PCビューで表示' : '📱 スマホビューで表示'}
                                    </button>
                                </div>

                                {isMobileView ? (
                                    <div className="glass-card" style={{padding: '16px'}}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: '#F8FAFC', padding: '12px', borderRadius: '8px'}}>
                                            <button className="btn outline" style={{padding: '6px 12px'}} onClick={() => setSelectedDateIndex(Math.max(0, selectedDateIndex - 1))}>&lt;</button>
                                            <h3 style={{margin: 0, fontSize: '1.2rem', color: 'var(--primary)'}}>{formatDateLabel(periodDates[selectedDateIndex])} ({dayNames[periodDates[selectedDateIndex].getDay()]})</h3>
                                            <button className="btn outline" style={{padding: '6px 12px'}} onClick={() => setSelectedDateIndex(Math.min(periodDates.length - 1, selectedDateIndex + 1))}>&gt;</button>
                                        </div>
                                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                            {employees.map((emp, i) => {
                                                const cell = generatedResult.matrix[i][selectedDateIndex];
                                                let cssClass = 'shift-cell ';
                                                if (cell.shift === '休') cssClass += 'off';
                                                else if (emp.isRS) cssClass += 'rs';
                                                else cssClass += 'normal';
                                                if (cell.isError) cssClass += ' error';
                                                
                                                return (
                                                    <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB'}}>
                                                        <div>
                                                            <div style={{fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)'}}>{emp.name}</div>
                                                            <div style={{fontSize: '0.75rem', color: '#6B7280', marginTop: '4px'}}>{emp.isRS ? <span style={{background:'#D1FAE5', color:'#065F46', padding:'2px 4px', borderRadius:'4px', marginRight:'4px'}}>登販</span> : ''} {emp.type}</div>
                                                        </div>
                                                        <div style={{width: '60px', position: 'relative'}}>
                                                            <div className={cssClass} style={{ pointerEvents: 'none', textAlign: 'center', fontSize: '0.8rem', padding: '6px', borderRadius: '4px', lineHeight: '1.2' }}>
                                                                {(() => {
                                                                    const shiftText = cell.shift === '休' ? '休' : (shiftMaster[cell.shift] || cell.shift);
                                                                    const lines = shiftText.includes('～') ? shiftText.split('～') : [shiftText];
                                                                    return lines.length === 2 ? <>{lines[0]}<br/>~{lines[1]}</> : <>{cell.shift}</>;
                                                                })()}
                                                            </div>
                                                            <select
                                                                value={cell.shift}
                                                                style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', appearance: 'none'}}
                                                                onChange={(e) => {
                                                                    const newMatrix = [...generatedResult.matrix];
                                                                    newMatrix[i][selectedDateIndex].shift = e.target.value;
                                                                    setGeneratedResult({...generatedResult, matrix: newMatrix});
                                                                }}
                                                            >
                                                                <option value="休">休</option>
                                                                {emp.shifts.map(s => <option key={s} value={s}>{shiftMaster[s] || s}</option>)}
                                                            </select>
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
                                                        return (
                                                            <th key={i}>{formatDateLabel(d)}<span className={`day-label ${cls}`}>({dayNames[dow]})</span></th>
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
                                                            <td style={{width: '40px', textAlign: 'center', color: '#9CA3AF'}}>
                                                                <GripVertical size={16} className="drag-handle" />
                                                            </td>
                                                            <td>
                                                                <div style={{fontWeight:600}}>{emp.name}</div>
                                                                <div style={{fontSize:'0.7rem', color:'#9CA3AF'}}>{emp.isRS ? '登販/' : ''}{shortType}</div>
                                                            </td>
                                                            {generatedResult.matrix[i].map((cell, d) => {
                                                                let cssClass = 'shift-cell ';
                                                                if (cell.shift === '休') cssClass += 'off';
                                                                else if (emp.isRS) cssClass += 'rs';
                                                                else cssClass += 'normal';
                                                                
                                                                if (cell.isError) cssClass += ' error';
                                                                
                                                                const shiftText = cell.shift === '休' ? '休' : (shiftMaster[cell.shift] || cell.shift);
                                                                const lines = shiftText.includes('～') ? shiftText.split('～') : [shiftText];

                                                                return (
                                                                    <td key={d} style={{position: 'relative', width: '50px'}}>
                                                                        <div className={cssClass} style={{ pointerEvents: 'none', textAlign: 'center', fontSize: '0.75rem', padding: '4px', borderRadius: '4px', lineHeight: '1.2', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                                            {lines.length === 2 ? (
                                                                                <>{lines[0]}<br/>~{lines[1]}</>
                                                                            ) : (
                                                                                <>{cell.shift}</>
                                                                            )}
                                                                        </div>
                                                                        <select 
                                                                            value={cell.shift}
                                                                            style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', appearance: 'none'}}
                                                                            onChange={(e) => {
                                                                                const newMatrix = [...generatedResult.matrix];
                                                                                newMatrix[i][d].shift = e.target.value;
                                                                                setGeneratedResult({...generatedResult, matrix: newMatrix});
                                                                            }}
                                                                        >
                                                                            <option value="休">休</option>
                                                                            {emp.shifts.map(s => <option key={s} value={s}>{shiftMaster[s] || s}</option>)}
                                                                        </select>
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
                            <h3 style={{marginBottom: '16px', color: 'var(--text-main)'}}>AIの基本最適化ルール（固定）</h3>
                            <div style={{background: '#F8FAFC', padding: '16px', border: '1px solid #E5E7EB', borderRadius: '8px', marginBottom: '24px', fontSize: '0.95rem', lineHeight: 1.6}}>
                                <strong>【曜日別・時間帯の配置優先度】</strong><br/>
                                <span style={{color:'var(--primary)', fontWeight:600}}>・日曜日：</span> 出勤人数が最も多くなるようにシフトを組む<br/>
                                <span style={{color:'var(--primary)', fontWeight:600}}>・月曜日：</span> 出勤人数が最も少なくなるようにシフトを組む<br/>
                                <span style={{color:'var(--primary)', fontWeight:600}}>・火曜日・水曜日：</span> 14時までの時間帯（早番）の人員を厚くする<br/>
                                <span style={{color:'var(--primary)', fontWeight:600}}>・土曜日：</span> 19時以降の時間帯（遅番）の人員を厚くする<br/>
                                <span style={{color:'var(--primary)', fontWeight:600}}>・月末4日間：</span> 全体的に人員を厚くする
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

                            <div style={{marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-sub)', background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px dashed #CBD5E1'}}>
                                <strong style={{color: 'var(--text-main)'}}>💡 その他の設定について</strong><br/>
                                ・<strong>従業員数・登録販売者数</strong>：従業員管理タブで登録したデータからAIが自動的に読み取ります。<br/>
                                ・<strong>営業時間</strong>：8:15～24:00 でシステムに固定されています。
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
                            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center'}}>
                                <input type="text" className="form-control" style={{width: '140px'}} placeholder="パターン名 (例: 中番)" value={newShiftName} onChange={e => setNewShiftName(e.target.value)}/>
                                <input type="time" className="form-control" style={{width: '140px'}} value={newShiftStart} onChange={e => setNewShiftStart(e.target.value)}/>
                                <span>～</span>
                                <input type="time" className="form-control" style={{width: '140px'}} value={newShiftEnd} onChange={e => setNewShiftEnd(e.target.value)}/>
                                <button className="btn" onClick={addShiftPattern}><Plus size={16}/> 追加</button>
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

                        <div className="form-group" style={{marginTop: '24px', marginBottom: '24px'}}>
                            <label className="checkbox-label">
                                <input type="checkbox" checked={empRS} onChange={e => setEmpRS(e.target.checked)}/>
                                登録販売者資格あり
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
                                <div style={{display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px'}}>
                                    <input type="time" className="form-control" value={customStartTime} onChange={e => setCustomStartTime(e.target.value)}/>
                                    <span>～</span>
                                    <input type="time" className="form-control" value={customEndTime} onChange={e => setCustomEndTime(e.target.value)}/>
                                    <button type="button" className="btn outline" style={{whiteSpace: 'nowrap'}} onClick={addCustomShiftToEmployee}>追加</button>
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

            {isGenerating && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <h2 style={{color: 'var(--primary)'}}>最適化を実行中...</h2>
                </div>
            )}
        </div>
    );
}
