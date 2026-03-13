import { useState, useEffect } from 'react';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Activity, Users, Brain, X, Shield } from 'lucide-react';

const Plot = createPlotlyComponent(Plotly);
import { API_URL } from '../config';

const TEAM_COLORS = {
    'Red Bull Racing': '#3671C6', 'Ferrari': '#E8002D', 'McLaren': '#FF8000',
    'Mercedes': '#27F4D2', 'Aston Martin': '#229971', 'Alpine': '#FF87BC',
    'Racing Bulls': '#6692FF', 'Sauber': '#52E252', 'Haas F1 Team': '#B6BABD',
    'Williams': '#64C4FF', 'Kick Sauber': '#52E252', 'RB': '#6692FF',
    'Audi': '#E00400', 'Cadillac F1 Team': '#FFD700',
};

export default function TeamsBattle() {
    const [year, setYear] = useState(2025);
    const [events, setEvents] = useState([]);
    const [selectedRound, setSelectedRound] = useState(null);
    const [eventType, setEventType] = useState('R');
    const [availableTeams, setAvailableTeams] = useState([]);
    const [selectedTeams, setSelectedTeams] = useState([]);
    const [mode, setMode] = useState('best');
    const [loading, setLoading] = useState(false);
    const [loadingTeams, setLoadingTeams] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [loadingAI, setLoadingAI] = useState(false);

    useEffect(() => {
        fetch(`${API_URL}/api/schedule?year=${year}`).then(r => r.json()).then(data => {
            if (data.events) {
                setEvents(data.events);
                if (data.events.length > 0) setSelectedRound(data.events[0].round_number);
            }
        }).catch(() => { });
    }, [year]);

    useEffect(() => {
        if (selectedRound) fetchTeams(year, selectedRound, eventType);
    }, [selectedRound, eventType]);

    const fetchTeams = async (y, round, et) => {
        setLoadingTeams(true);
        try {
            const res = await fetch(`${API_URL}/api/teams?year=${y}&track=${round}&event_type=${et}`);
            const data = await res.json();
            if (data.teams) {
                setAvailableTeams(data.teams);
                setSelectedTeams(data.teams.slice(0, 3).map(t => t.name));
            }
        } catch { setAvailableTeams([]); }
        finally { setLoadingTeams(false); }
    };

    const toggleTeam = (name) => {
        setSelectedTeams(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]);
    };

    const analyze = async () => {
        if (selectedTeams.length < 2) return;
        setLoading(true); setError(null); setResult(null); setAiAnalysis(null);
        try {
            const res = await fetch(`${API_URL}/api/teams-compare?teams=${encodeURIComponent(selectedTeams.join(','))}&year=${year}&track=${selectedRound}&event_type=${eventType}&mode=${mode}`);
            if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error"); }
            const data = await res.json();
            setResult({ ...data, telemetry_fig: JSON.parse(data.telemetry_figure_json) });
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    const fetchAI = async () => {
        if (!result) return;
        setLoadingAI(true);
        try {
            const driverList = availableTeams
                .filter(t => selectedTeams.includes(t.name))
                .map(t => t.drivers[0]).join(',');
            const res = await fetch(`${API_URL}/api/ai-analyze?drivers=${driverList}&year=${year}&track=${selectedRound}&event_type=${eventType}&lap_mode=fastest`);
            if (res.ok) { const data = await res.json(); setAiAnalysis(data.analysis); }
        } catch { }
        finally { setLoadingAI(false); }
    };

    return (
        <div className="px-8 py-6 min-h-screen">
            <header className="page-header">
                <div className="flex items-center gap-3">
                    <Users className="text-accent-primary" size={24} />
                    <h1>TEAMS BATTLE</h1>
                </div>
                <span className="text-[10px] font-mono text-text-muted">Constructor head-to-head</span>
            </header>

            <div className="glass-card !p-4 mb-5">
                <div className="flex flex-wrap gap-3 items-end mb-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase tracking-widest text-text-heading font-semibold">Year</label>
                        <div className="flex gap-1">
                            {[2023, 2024, 2025, 2026].map(y => (
                                <button key={y} onClick={() => setYear(y)}
                                    className={`px-3 py-1 rounded-lg font-mono text-xs font-bold border transition-all
                    ${year === y ? 'bg-accent-primary text-white border-accent-primary' : 'text-text-body border-border-light hover:border-accent-primary bg-white'}`}>
                                    {y}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase tracking-widest text-text-heading font-semibold">Event</label>
                        <select className="ghost-input w-44 text-xs" value={selectedRound || ''} onChange={e => setSelectedRound(parseInt(e.target.value))}>
                            {events.map(ev => <option key={ev.round_number} value={ev.round_number}>{ev.location}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase tracking-widest text-text-heading font-semibold">Session</label>
                        <select className="ghost-input w-28 text-xs" value={eventType} onChange={e => setEventType(e.target.value)}>
                            <option value="R">Race</option>
                            <option value="Q">Qualifying</option>
                            <option value="FP1">FP1</option>
                            <option value="FP2">FP2</option>
                            <option value="FP3">FP3</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase tracking-widest text-text-heading font-semibold">Mode</label>
                        <div className="flex gap-1">
                            {['best', 'average'].map(m => (
                                <button key={m} onClick={() => setMode(m)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all capitalize
                    ${mode === m ? 'bg-[#0277BD] text-white border-[#0277BD]' : 'text-text-muted border-border-light hover:text-text-heading bg-white'}`}>
                                    {m === 'best' ? 'Best Driver' : 'Team Avg'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                    <Shield className="text-accent-primary" size={14} />
                    <span className="text-[10px] uppercase tracking-widest text-text-heading font-bold">Select Teams ({selectedTeams.length})</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                    {loadingTeams ? (
                        <div className="flex items-center gap-2 text-accent-primary text-xs font-mono"><Activity className="animate-spin" size={12} /> Loading teams...</div>
                    ) : availableTeams.map(team => {
                        const isSelected = selectedTeams.includes(team.name);
                        const color = TEAM_COLORS[team.name] || '#888888';
                        return (
                            <button key={team.name} onClick={() => toggleTeam(team.name)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all duration-200 ${isSelected ? 'font-bold' : 'opacity-50 hover:opacity-80'}`}
                                style={{ borderColor: color, backgroundColor: isSelected ? `${color}15` : '#FFFFFF' }}>
                                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                                <span className={isSelected ? 'text-text-heading' : 'text-text-muted'}>{team.name}</span>
                                <span className="text-[9px] text-text-muted font-mono">{team.drivers.join(' · ')}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex gap-2">
                    <button onClick={analyze} disabled={loading || selectedTeams.length < 2}
                        className="btn-primary flex items-center gap-2 text-xs !px-5 !py-2">
                        {loading ? <Activity className="animate-spin" size={16} /> : <Users size={16} />}
                        {loading ? "LOADING..." : "COMPARE TEAMS"}
                    </button>
                    {result && (
                        <button onClick={fetchAI} disabled={loadingAI}
                            className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg border border-accent-purple text-accent-purple font-bold uppercase transition-all duration-200 hover:bg-accent-purple hover:text-white">
                            {loadingAI ? <Activity className="animate-spin" size={16} /> : <Brain size={16} />} AI INSIGHT
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-lg border border-accent-red bg-red-50 text-text-heading text-xs">
                    <span className="font-bold text-accent-red">Error:</span> {error}
                </div>
            )}

            {aiAnalysis && (
                <div className="glass-card !p-4 mb-5 !border-accent-purple/30">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-black text-text-heading flex items-center gap-2"><Brain className="text-accent-purple" size={16} /> Constructor Analysis</h2>
                        <button onClick={() => setAiAnalysis(null)} className="text-text-muted hover:text-text-heading"><X size={14} /></button>
                    </div>
                    <div className="text-text-body text-[13px] leading-relaxed whitespace-pre-wrap">{aiAnalysis}</div>
                </div>
            )}

            {result && (
                <div className="grid grid-cols-12 gap-5">
                    <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
                        <h2 className="text-base font-black text-text-heading">
                            Constructor Gap <span className="text-[10px] font-normal text-text-muted">({result.mode})</span>
                        </h2>
                        {result.lap_times && Object.entries(result.lap_times).map(([team, time]) => (
                            <div key={team} className="glass-card !p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: TEAM_COLORS[team] || '#888' }} />
                                    <span className="text-xs font-bold text-text-heading">{team}</span>
                                </div>
                                <span className="font-mono text-xl font-bold" style={{ color: TEAM_COLORS[team] || '#333' }}>{time}</span>
                            </div>
                        ))}
                    </div>
                    <div className="col-span-12 lg:col-span-9">
                        <div className="glass-card min-h-[70vh] flex items-center justify-center !p-2">
                            {result.telemetry_fig ? (
                                <Plot data={result.telemetry_fig.data}
                                    layout={{ ...result.telemetry_fig.layout, autosize: true }}
                                    useResizeHandler style={{ width: "100%", height: "100%" }}
                                    config={{ displayModeBar: true, scrollZoom: true }} />
                            ) : <span className="text-text-muted font-mono text-xs">NO DATA</span>}
                        </div>
                    </div>
                </div>
            )}

            {!result && !loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Users className="text-border-light" size={80} />
                    <p className="text-text-muted font-mono text-sm text-center">
                        Select at least 2 teams and press COMPARE TEAMS
                    </p>
                </div>
            )}
        </div>
    );
}
