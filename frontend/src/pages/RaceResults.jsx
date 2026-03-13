import { useState, useEffect } from 'react';
import { Trophy, Calendar, Flag, Clock, Fuel, Circle, ChevronDown, ChevronUp, Activity, Zap, ArrowUp, ArrowDown, Minus } from 'lucide-react';

import { API_URL } from '../config';

const COMPOUND_COLORS = {
    'SOFT': '#E53935',
    'MEDIUM': '#FFB300',
    'HARD': '#37474F',
    'INTERMEDIATE': '#2E7D32',
    'WET': '#0277BD',
    'UNKNOWN': '#999',
};

const COMPOUND_SHORT = {
    'SOFT': 'S', 'MEDIUM': 'M', 'HARD': 'H',
    'INTERMEDIATE': 'I', 'WET': 'W', 'UNKNOWN': '?',
};

export default function RaceResults() {
    const [year, setYear] = useState(2025);
    const [events, setEvents] = useState([]);
    const [selectedRound, setSelectedRound] = useState(null);
    const [sessionType, setSessionType] = useState('R');
    const [loading, setLoading] = useState(false);
    const [loadingSchedule, setLoadingSchedule] = useState(false);
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState('race');
    const [error, setError] = useState(null);
    const [showEvents, setShowEvents] = useState(true);

    useEffect(() => { fetchSchedule(year); }, [year]);

    const fetchSchedule = async (y) => {
        setLoadingSchedule(true);
        try {
            const res = await fetch(`${API_URL}/api/schedule?year=${y}`);
            const d = await res.json();
            if (d.events) {
                setEvents(d.events);
                if (d.events.length > 0) setSelectedRound(d.events[0].round_number);
            }
        } catch { } finally { setLoadingSchedule(false); }
    };

    const fetchResults = async () => {
        if (!selectedRound) return;
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API_URL}/api/race-results?year=${year}&track=${selectedRound}&event_type=${sessionType}`);
            if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Error'); }
            setData(await res.json());
            setShowEvents(false);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    const selectedEvent = events.find(e => e.round_number === selectedRound);
    const tabs = [
        { id: 'race', label: 'CARRERA', icon: Trophy },
        { id: 'fastest', label: 'VUELTAS RÁPIDAS', icon: Zap },
        { id: 'pitstops', label: 'PIT STOPS', icon: Fuel },
        { id: 'strategy', label: 'ESTRATEGIA', icon: Flag },
    ];

    return (
        <div className="relative min-h-screen px-8 py-6">
            {/* HEADER */}
            <header className="page-header">
                <div className="flex items-center gap-3">
                    <Trophy className="text-accent-primary" size={24} />
                    <h1>RACE RESULTS</h1>
                </div>
                <span className="font-mono text-[10px] text-text-muted">Resultados completos de carrera</span>
            </header>

            {/* YEAR SELECTOR */}
            <div className="flex gap-2 mb-4">
                {[2023, 2024, 2025, 2026].map(y => (
                    <button key={y} onClick={() => setYear(y)}
                        className={`px-4 py-1.5 rounded-lg font-mono font-bold text-xs transition-all duration-200 border
              ${year === y ? 'bg-accent-primary text-white border-accent-primary' : 'bg-white text-text-body border-border-light hover:border-accent-primary hover:text-accent-primary'}`}
                    >{y}</button>
                ))}
                <button onClick={() => setShowEvents(!showEvents)}
                    className="ml-2 text-text-muted hover:text-text-heading transition-colors text-xs flex items-center gap-1">
                    {showEvents ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {showEvents ? 'Hide' : 'Show'} Events
                </button>
            </div>

            {/* EVENTS GRID */}
            {showEvents && !loadingSchedule && (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5 mb-5">
                    {events.map(ev => (
                        <button key={ev.round_number} onClick={() => { setSelectedRound(ev.round_number); }}
                            className={`glass-card !p-2 text-left cursor-pointer ${selectedRound === ev.round_number ? '!border-accent-primary' : ''}`}>
                            <div className="font-mono text-[9px] text-text-muted">R{ev.round_number}</div>
                            <div className={`text-[11px] font-bold truncate ${selectedRound === ev.round_number ? 'text-accent-primary' : 'text-text-heading'}`}>{ev.location}</div>
                        </button>
                    ))}
                </div>
            )}

            {/* CONTROLS */}
            {selectedEvent && (
                <div className="glass-card !p-4 mb-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Calendar className="text-accent-primary" size={16} />
                            <div>
                                <h2 className="text-sm font-black text-text-heading">{selectedEvent.event_name} — {year}</h2>
                                <span className="text-[10px] text-text-muted font-mono">{selectedEvent.location} · {selectedEvent.event_date}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <select className="ghost-input text-xs w-28" value={sessionType} onChange={e => setSessionType(e.target.value)}>
                                <option value="R">Race</option>
                                <option value="Q">Qualifying</option>
                                <option value="S">Sprint</option>
                            </select>
                            <button onClick={fetchResults} disabled={loading}
                                className="btn-primary flex items-center gap-2 text-xs !px-5 !py-2">
                                {loading ? <Activity className="animate-spin" size={16} /> : <Trophy size={16} />}
                                {loading ? 'LOADING...' : 'LOAD RESULTS'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 rounded-lg border border-accent-red bg-red-50 text-text-heading text-xs">
                    <span className="font-bold text-accent-red">Error:</span> {error}
                </div>
            )}

            {/* TABS */}
            {data && (
                <div className="flex gap-1 mb-4 border-b border-border-light">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 border-b-2 -mb-[1px]
                ${activeTab === tab.id
                                    ? 'text-accent-primary border-accent-primary'
                                    : 'text-text-muted border-transparent hover:text-text-heading hover:border-border-medium'}`}>
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* LOADING */}
            {loading && (
                <div className="flex flex-col items-center gap-3 py-20">
                    <Activity className="animate-spin text-accent-primary" size={40} />
                    <span className="font-mono text-sm text-text-muted">Cargando resultados...</span>
                </div>
            )}

            {/* RACE RESULTS TABLE */}
            {data && !loading && activeTab === 'race' && (
                <div className="glass-card !p-0 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border-light flex items-center justify-between bg-[#FAFAFA]">
                        <div className="flex items-center gap-2">
                            <Trophy className="text-accent-primary" size={16} />
                            <span className="text-sm font-black text-text-heading">{data.event_name}</span>
                            <span className="text-[10px] font-mono text-text-muted ml-2">{data.total_laps} vueltas</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-[9px] uppercase tracking-widest text-text-muted border-b border-border-light bg-[#FAFAFA]">
                                    <th className="px-3 py-2.5 text-center w-12">POS</th>
                                    <th className="px-3 py-2.5 text-left">PILOTO</th>
                                    <th className="px-3 py-2.5 text-center w-12">#</th>
                                    <th className="px-3 py-2.5 text-center">VUELTAS</th>
                                    <th className="px-3 py-2.5 text-right">TIEMPO / GAP</th>
                                    <th className="px-3 py-2.5 text-center">GRID</th>
                                    <th className="px-3 py-2.5 text-center">±</th>
                                    <th className="px-3 py-2.5 text-right">FL</th>
                                    <th className="px-3 py-2.5 text-center w-16">PTS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.classification.map((drv, idx) => {
                                    const isWinner = idx === 0;
                                    const isDNF = drv.position === 'DNF' || drv.status?.includes('Retired');
                                    const gained = drv.positions_gained;
                                    return (
                                        <tr key={drv.abbreviation}
                                            className={`border-b border-border-light/70 transition-all duration-200 hover:bg-[#FAFAFA] group
                        ${isWinner ? 'bg-red-50/50' : ''} ${isDNF ? 'opacity-50' : ''}`}>
                                            <td className="px-3 py-3 text-center">
                                                <span className={`font-mono font-black text-base ${isWinner ? 'text-accent-primary' : isDNF ? 'text-accent-red text-xs' : 'text-text-heading'}`}>
                                                    {drv.position}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-1 h-8 rounded-full" style={{ backgroundColor: drv.team_color }} />
                                                    <div>
                                                        <div className="text-sm font-bold text-text-heading group-hover:text-accent-primary transition-colors">{drv.full_name}</div>
                                                        <div className="text-[10px] text-text-muted">{drv.team}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-center font-mono text-xs text-text-muted">{drv.number}</td>
                                            <td className="px-3 py-3 text-center font-mono text-xs text-text-heading">{drv.laps}</td>
                                            <td className="px-3 py-3 text-right">
                                                <span className={`font-mono text-sm font-bold ${isWinner ? 'text-text-heading' : 'text-[#0277BD]'}`}>
                                                    {drv.time}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-center font-mono text-xs text-text-muted">{drv.grid_position || '-'}</td>
                                            <td className="px-3 py-3 text-center">
                                                {gained > 0 ? (
                                                    <span className="flex items-center justify-center gap-0.5 text-[#2E7D32] font-mono text-xs font-bold">
                                                        <ArrowUp size={10} /> {gained}
                                                    </span>
                                                ) : gained < 0 ? (
                                                    <span className="flex items-center justify-center gap-0.5 text-accent-red font-mono text-xs font-bold">
                                                        <ArrowDown size={10} /> {Math.abs(gained)}
                                                    </span>
                                                ) : (
                                                    <Minus size={10} className="text-text-muted mx-auto" />
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right font-mono text-[11px] text-text-muted">{drv.fastest_lap}</td>
                                            <td className="px-3 py-3 text-center">
                                                {drv.points > 0 && (
                                                    <span className="font-mono font-bold text-sm text-accent-primary">{drv.points}</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* FASTEST LAPS TAB */}
            {data && !loading && activeTab === 'fastest' && (
                <div className="glass-card !p-0 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border-light flex items-center gap-2 bg-[#FAFAFA]">
                        <Zap className="text-accent-primary" size={16} />
                        <span className="text-sm font-black text-text-heading">Vueltas Rápidas</span>
                    </div>
                    <table className="w-full">
                        <thead>
                            <tr className="text-[9px] uppercase tracking-widest text-text-muted border-b border-border-light bg-[#FAFAFA]">
                                <th className="px-3 py-2.5 text-center w-12">#</th>
                                <th className="px-3 py-2.5 text-left">PILOTO</th>
                                <th className="px-3 py-2.5 text-right">TIEMPO</th>
                                <th className="px-3 py-2.5 text-right">GAP</th>
                                <th className="px-3 py-2.5 text-center">VUELTA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.fastest_laps.map((fl, idx) => (
                                <tr key={fl.abbreviation}
                                    className={`border-b border-border-light/70 transition-all duration-200 hover:bg-[#FAFAFA]
                    ${idx === 0 ? 'bg-purple-50/50' : ''}`}>
                                    <td className="px-3 py-3 text-center font-mono font-bold text-text-heading">
                                        {idx === 0 ? <span className="text-accent-purple">1</span> : fl.rank}
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: fl.team_color }} />
                                            <span className="text-sm font-bold text-text-heading">{fl.abbreviation}</span>
                                            <span className="text-[10px] text-text-muted">{fl.team}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <span className={`font-mono text-sm font-bold ${idx === 0 ? 'text-accent-purple' : 'text-text-heading'}`}>
                                            {fl.time}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-right font-mono text-xs text-[#0277BD]">{fl.gap}</td>
                                    <td className="px-3 py-3 text-center font-mono text-xs text-text-muted">L{fl.lap_number}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* PIT STOPS TAB */}
            {data && !loading && activeTab === 'pitstops' && (
                <div className="glass-card !p-0 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border-light flex items-center gap-2 bg-[#FAFAFA]">
                        <Fuel className="text-accent-primary" size={16} />
                        <span className="text-sm font-black text-text-heading">Pit Stops</span>
                    </div>
                    <table className="w-full">
                        <thead>
                            <tr className="text-[9px] uppercase tracking-widest text-text-muted border-b border-border-light bg-[#FAFAFA]">
                                <th className="px-3 py-2.5 text-left">PILOTO</th>
                                <th className="px-3 py-2.5 text-center">PARADA</th>
                                <th className="px-3 py-2.5 text-center">VUELTA</th>
                                <th className="px-3 py-2.5 text-center">COMPUESTO</th>
                                <th className="px-3 py-2.5 text-right">DURACIÓN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.pit_stops.map((ps, idx) => (
                                <tr key={`${ps.abbreviation}-${ps.stop_number}`}
                                    className="border-b border-border-light/70 transition-all duration-200 hover:bg-[#FAFAFA]">
                                    <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-5 rounded-full" style={{ backgroundColor: ps.team_color }} />
                                            <span className="text-xs font-bold text-text-heading">{ps.abbreviation}</span>
                                            <span className="text-[9px] text-text-muted">{ps.team}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-center font-mono text-xs text-text-heading">{ps.stop_number}</td>
                                    <td className="px-3 py-2.5 text-center font-mono text-xs text-text-muted">L{ps.lap}</td>
                                    <td className="px-3 py-2.5 text-center">
                                        {ps.compound && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                                                style={{
                                                    color: COMPOUND_COLORS[ps.compound] || '#999',
                                                    borderColor: `${COMPOUND_COLORS[ps.compound] || '#999'}40`,
                                                    backgroundColor: `${COMPOUND_COLORS[ps.compound] || '#999'}10`,
                                                }}>
                                                <Circle size={6} fill={COMPOUND_COLORS[ps.compound] || '#999'} stroke="none" />
                                                {COMPOUND_SHORT[ps.compound] || ps.compound}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-mono text-xs text-[#0277BD]">{ps.duration}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TIRE STRATEGY TAB */}
            {data && !loading && activeTab === 'strategy' && (
                <div className="glass-card !p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Flag className="text-accent-primary" size={16} />
                        <span className="text-sm font-black text-text-heading">Estrategia de Neumáticos</span>
                        <div className="ml-auto flex items-center gap-3">
                            {['SOFT', 'MEDIUM', 'HARD'].map(c => (
                                <span key={c} className="flex items-center gap-1 text-[10px] font-mono"
                                    style={{ color: COMPOUND_COLORS[c] }}>
                                    <Circle size={8} fill={COMPOUND_COLORS[c]} stroke="none" />
                                    {c}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-1">
                        {data.tire_stints.map(drv => (
                            <div key={drv.abbreviation} className="flex items-center gap-3 py-1.5 border-b border-border-light/50 group hover:bg-[#FAFAFA] transition-all rounded">
                                <div className="w-10 text-right">
                                    <span className="font-mono text-xs font-bold text-text-heading">{drv.abbreviation}</span>
                                </div>
                                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: drv.team_color }} />
                                <div className="flex-1 flex items-center h-7 relative">
                                    {drv.stints.map((stint, idx) => {
                                        const totalLaps = data.total_laps || 57;
                                        const widthPct = (stint.laps / totalLaps) * 100;
                                        const leftPct = ((stint.start_lap - 1) / totalLaps) * 100;
                                        const color = COMPOUND_COLORS[stint.compound] || '#999';
                                        return (
                                            <div key={idx}
                                                className="absolute h-full rounded-sm flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:brightness-110"
                                                style={{
                                                    left: `${leftPct}%`,
                                                    width: `${widthPct}%`,
                                                    backgroundColor: `${color}20`,
                                                    borderLeft: `2px solid ${color}`,
                                                    borderRight: idx === drv.stints.length - 1 ? `2px solid ${color}` : 'none',
                                                }}
                                                title={`${stint.compound}: L${stint.start_lap}-L${stint.end_lap} (${stint.laps} laps)`}>
                                                <span className="text-[9px] font-mono font-bold" style={{ color }}>
                                                    {stint.laps > 3 ? `${COMPOUND_SHORT[stint.compound] || '?'} ${stint.laps}` : COMPOUND_SHORT[stint.compound] || '?'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center mt-2 ml-16 relative h-4">
                        {[0, 10, 20, 30, 40, 50, data.total_laps].filter((v, i, a) => a.indexOf(v) === i).map(lap => (
                            <span key={lap} className="absolute text-[8px] font-mono text-text-muted -translate-x-1/2"
                                style={{ left: `${(lap / (data.total_laps || 57)) * 100}%` }}>
                                {lap}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* EMPTY STATE */}
            {!data && !loading && (
                <div className="flex flex-col items-center gap-3 py-20">
                    <Trophy className="text-border-light" size={56} />
                    <span className="text-text-muted font-mono text-xs">SELECT GP & LOAD RESULTS</span>
                </div>
            )}
        </div>
    );
}
