import { useState, useEffect } from 'react';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Activity, GitCompareArrows, Brain, X } from 'lucide-react';
import Hint from '../components/Hint';

const Plot = createPlotlyComponent(Plotly);
const API_URL = "http://localhost:8000";

export default function CrossYear() {
    const [events, setEvents] = useState([]);
    const [selectedTrack, setSelectedTrack] = useState('');
    const [driver, setDriver] = useState('VER');
    const [eventType, setEventType] = useState('R');
    const [selectedYears, setSelectedYears] = useState([2023, 2024, 2025]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [loadingAI, setLoadingAI] = useState(false);

    useEffect(() => {
        fetch(`${API_URL}/api/schedule?year=2024`).then(r => r.json()).then(data => {
            if (data.events) {
                const uniqueTracks = data.events.reduce((acc, ev) => {
                    if (!acc.find(t => t.location === ev.location)) acc.push(ev);
                    return acc;
                }, []);
                setEvents(uniqueTracks);
                setSelectedTrack(uniqueTracks[0]?.location || 'Melbourne');
            }
        }).catch(() => { });
    }, []);

    const toggleYear = (y) => {
        setSelectedYears(prev => prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y].sort());
    };

    const analyze = async () => {
        if (selectedYears.length < 2) return;
        setLoading(true); setError(null); setResult(null); setAiAnalysis(null);
        try {
            const res = await fetch(`${API_URL}/api/cross-year?driver=${driver}&track=${encodeURIComponent(selectedTrack)}&event_type=${eventType}&years=${selectedYears.join(',')}`);
            if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error"); }
            const data = await res.json();
            setResult({
                ...data,
                telemetry_fig: JSON.parse(data.telemetry_figure_json),
                track_map_fig: data.track_map_figure_json ? JSON.parse(data.track_map_figure_json) : null
            });
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    const fetchAI = async () => {
        if (!result) return;
        setLoadingAI(true);
        try {
            const res = await fetch(`${API_URL}/api/ai-analyze?drivers=${driver}&year=${selectedYears[selectedYears.length - 1]}&track=${encodeURIComponent(selectedTrack)}&event_type=${eventType}&lap_mode=fastest`);
            if (res.ok) { const data = await res.json(); setAiAnalysis(data.analysis); }
        } catch { }
        finally { setLoadingAI(false); }
    };

    const yearColors = { 2018: '#78909C', 2019: '#90A4AE', 2020: '#B0BEC5', 2021: '#455A64', 2022: '#F57C00', 2023: '#E53935', 2024: '#0277BD', 2025: '#FFB300', 2026: '#C62828' };

    return (
        <div className="px-8 py-6 min-h-screen">
            <header className="page-header">
                <div className="flex items-center gap-3">
                    <GitCompareArrows className="text-accent-primary" size={24} />
                    <h1>CROSS-YEAR</h1>
                </div>
                <span className="text-[10px] font-mono text-text-muted">Compara generaciones de coches</span>
            </header>

            {/* CONTROLS */}
            <div className="glass-card !p-4 mb-5">
                <div className="flex flex-wrap gap-4 items-end mb-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase tracking-widest text-text-heading font-semibold flex items-center gap-1">Circuito <Hint text="Seleccioná el circuito donde querés comparar el rendimiento a través de los años" /></label>
                        <select className="ghost-input w-48 text-xs" value={selectedTrack} onChange={e => setSelectedTrack(e.target.value)}>
                            {events.map(ev => (
                                <option key={ev.location} value={ev.location}>{ev.location} — {ev.event_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase tracking-widest text-text-heading font-semibold flex items-center gap-1">Piloto <Hint text="Elegí un piloto. El dropdown muestra su historial de equipos para que sepas en qué años corrió y dónde" /></label>
                        <select className="ghost-input w-56 text-xs" value={driver} onChange={e => setDriver(e.target.value)}>
                            {(() => {
                                const DRIVERS = [
                                    // Red Bull / Red Bull Racing
                                    { code: 'VER', name: 'Max Verstappen', teams: [{ team: 'Red Bull Racing', years: '2016-2026' }] },
                                    { code: 'PER', name: 'Sergio Pérez', teams: [{ team: 'Racing Point', years: '2018-2020' }, { team: 'Red Bull Racing', years: '2021-2025' }] },
                                    { code: 'RIC', name: 'Daniel Ricciardo', teams: [{ team: 'Red Bull Racing', years: '2018' }, { team: 'Renault', years: '2019-2020' }, { team: 'McLaren', years: '2021-2022' }, { team: 'AlphaTauri/RB', years: '2023-2024' }] },
                                    { code: 'GAS', name: 'Pierre Gasly', teams: [{ team: 'Toro Rosso', years: '2018-2019' }, { team: 'AlphaTauri', years: '2020-2022' }, { team: 'Alpine', years: '2023-2026' }] },
                                    { code: 'TSU', name: 'Yuki Tsunoda', teams: [{ team: 'AlphaTauri/RB', years: '2021-2025' }, { team: 'Red Bull Racing', years: '2026' }] },
                                    // Ferrari
                                    { code: 'LEC', name: 'Charles Leclerc', teams: [{ team: 'Sauber', years: '2018' }, { team: 'Ferrari', years: '2019-2026' }] },
                                    { code: 'SAI', name: 'Carlos Sainz', teams: [{ team: 'Renault', years: '2018' }, { team: 'McLaren', years: '2019-2020' }, { team: 'Ferrari', years: '2021-2024' }, { team: 'Williams', years: '2025-2026' }] },
                                    { code: 'HAM', name: 'Lewis Hamilton', teams: [{ team: 'Mercedes', years: '2018-2024' }, { team: 'Ferrari', years: '2025-2026' }] },
                                    { code: 'RAI', name: 'Kimi Räikkönen', teams: [{ team: 'Ferrari', years: '2018' }, { team: 'Alfa Romeo', years: '2019-2021' }] },
                                    { code: 'VET', name: 'Sebastian Vettel', teams: [{ team: 'Ferrari', years: '2018-2020' }, { team: 'Aston Martin', years: '2021-2022' }] },
                                    // Mercedes
                                    { code: 'RUS', name: 'George Russell', teams: [{ team: 'Williams', years: '2019-2021' }, { team: 'Mercedes', years: '2022-2026' }] },
                                    { code: 'BOT', name: 'Valtteri Bottas', teams: [{ team: 'Mercedes', years: '2018-2021' }, { team: 'Alfa Romeo', years: '2022-2024' }] },
                                    { code: 'ANT', name: 'Andrea Kimi Antonelli', teams: [{ team: 'Mercedes', years: '2025-2026' }] },
                                    // McLaren
                                    { code: 'NOR', name: 'Lando Norris', teams: [{ team: 'McLaren', years: '2019-2026' }] },
                                    { code: 'PIA', name: 'Oscar Piastri', teams: [{ team: 'McLaren', years: '2023-2026' }] },
                                    // Aston Martin
                                    { code: 'ALO', name: 'Fernando Alonso', teams: [{ team: 'McLaren', years: '2018' }, { team: 'Alpine', years: '2021-2022' }, { team: 'Aston Martin', years: '2023-2026' }] },
                                    { code: 'STR', name: 'Lance Stroll', teams: [{ team: 'Williams', years: '2018' }, { team: 'Racing Point', years: '2019-2020' }, { team: 'Aston Martin', years: '2021-2026' }] },
                                    // Alpine
                                    { code: 'OCO', name: 'Esteban Ocon', teams: [{ team: 'Force India', years: '2018' }, { team: 'Renault', years: '2020' }, { team: 'Alpine', years: '2021-2024' }, { team: 'Haas', years: '2025-2026' }] },
                                    { code: 'DOO', name: 'Jack Doohan', teams: [{ team: 'Alpine', years: '2025-2026' }] },
                                    // Williams
                                    { code: 'ALB', name: 'Alex Albon', teams: [{ team: 'Toro Rosso', years: '2019' }, { team: 'Red Bull Racing', years: '2019-2020' }, { team: 'Williams', years: '2022-2026' }] },
                                    { code: 'COL', name: 'Franco Colapinto', teams: [{ team: 'Williams', years: '2024-2025' }, { team: 'Alpine', years: '2026' }] },
                                    { code: 'LAT', name: 'Nicholas Latifi', teams: [{ team: 'Williams', years: '2020-2022' }] },
                                    // Haas
                                    { code: 'MAG', name: 'Kevin Magnussen', teams: [{ team: 'Haas', years: '2018-2020, 2022-2024' }] },
                                    { code: 'HUL', name: 'Nico Hülkenberg', teams: [{ team: 'Renault', years: '2018-2019' }, { team: 'Haas', years: '2023-2024' }, { team: 'Sauber/Kick Sauber', years: '2025-2026' }] },
                                    { code: 'BEA', name: 'Oliver Bearman', teams: [{ team: 'Haas', years: '2025-2026' }] },
                                    // Sauber / Alfa Romeo
                                    { code: 'ZHO', name: 'Zhou Guanyu', teams: [{ team: 'Alfa Romeo/Sauber', years: '2022-2024' }] },
                                    { code: 'BOR', name: 'Gabriel Bortoleto', teams: [{ team: 'Sauber/Kick Sauber', years: '2025-2026' }] },
                                    // RB / AlphaTauri / Toro Rosso
                                    { code: 'LAW', name: 'Liam Lawson', teams: [{ team: 'AlphaTauri/RB', years: '2023-2025' }, { team: 'Red Bull Racing', years: '2025-2026' }] },
                                    { code: 'HAD', name: 'Isack Hadjar', teams: [{ team: 'RB', years: '2025-2026' }] },
                                    // Retired / Past
                                    { code: 'GRO', name: 'Romain Grosjean', teams: [{ team: 'Haas', years: '2018-2020' }] },
                                    { code: 'KUB', name: 'Robert Kubica', teams: [{ team: 'Williams', years: '2019' }] },
                                    { code: 'GIO', name: 'Antonio Giovinazzi', teams: [{ team: 'Alfa Romeo', years: '2019-2021' }] },
                                    { code: 'MSC', name: 'Mick Schumacher', teams: [{ team: 'Haas', years: '2021-2022' }] },
                                    { code: 'DEV', name: 'Nyck de Vries', teams: [{ team: 'AlphaTauri', years: '2023' }] },
                                    { code: 'SAR', name: 'Logan Sargeant', teams: [{ team: 'Williams', years: '2023-2024' }] },
                                ];
                                return DRIVERS.sort((a, b) => a.name.localeCompare(b.name)).map(d => (
                                    <option key={d.code} value={d.code}>
                                        {d.code} — {d.name} ({d.teams.map(t => t.team).join(', ')})
                                    </option>
                                ));
                            })()}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase tracking-widest text-text-heading font-semibold flex items-center gap-1">Sesión <Hint text="Carrera muestra el ritmo de carrera, Clasificación muestra la vuelta rápida pura" /></label>
                        <select className="ghost-input w-32 text-xs" value={eventType} onChange={e => setEventType(e.target.value)}>
                            <option value="R">Carrera</option>
                            <option value="Q">Clasificación</option>
                            <option value="FP1">Práctica 1</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                    <span className="text-[9px] uppercase tracking-widest text-text-heading font-semibold">Comparar Años:</span>
                    {[2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map(y => (
                        <button key={y} onClick={() => toggleYear(y)}
                            className={`px-3 py-1 rounded-lg font-mono text-xs font-bold border transition-all duration-200
                ${selectedYears.includes(y)
                                    ? 'text-white border-transparent'
                                    : 'text-text-muted border-border-light hover:border-text-muted bg-white'}`}
                            style={selectedYears.includes(y) ? { backgroundColor: yearColors[y], borderColor: yearColors[y] } : {}}>
                            {y}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <button onClick={analyze} disabled={loading || selectedYears.length < 2}
                        className="btn-primary flex items-center gap-2 text-xs !px-5 !py-2">
                        {loading ? <Activity className="animate-spin" size={16} /> : <GitCompareArrows size={16} />}
                        {loading ? "CARGANDO..." : "COMPARAR AÑOS"}
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
                        <h2 className="text-sm font-black text-text-heading flex items-center gap-2"><Brain className="text-accent-purple" size={16} /> Análisis Generacional</h2>
                        <button onClick={() => setAiAnalysis(null)} className="text-text-muted hover:text-text-heading"><X size={14} /></button>
                    </div>
                    <div className="text-text-body text-[13px] leading-relaxed whitespace-pre-wrap">{aiAnalysis}</div>
                </div>
            )}

            {result && (
                <div className="grid grid-cols-12 gap-5">
                    <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
                        <h2 className="text-base font-black text-text-heading">Tiempos por Año</h2>
                        {result.lap_times && Object.entries(result.lap_times).map(([yr, time]) => (
                            <div key={yr} className="glass-card !p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: yearColors[parseInt(yr)] }} />
                                    <span className="font-mono text-sm font-bold text-text-heading">{yr}</span>
                                </div>
                                <span className="font-mono text-lg font-bold" style={{ color: yearColors[parseInt(yr)] }}>{time}</span>
                            </div>
                        ))}
                        {result.delta_total && (
                            <div className="glass-card !p-3 !border-accent-primary/30">
                                <span className="text-[9px] uppercase text-text-muted">Evolución Total</span>
                                <div className="font-mono text-2xl font-bold text-accent-primary">{result.delta_total}</div>
                            </div>
                        )}
                        {result.track_map_fig && (
                            <div className="glass-card !p-1 h-64 overflow-hidden" style={{ background: '#111827' }}>
                                <Plot data={result.track_map_fig.data}
                                    layout={{ ...result.track_map_fig.layout, autosize: true }}
                                    useResizeHandler style={{ width: "100%", height: "100%" }}
                                    config={{ displayModeBar: false }} />
                            </div>
                        )}
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
                    <GitCompareArrows className="text-border-light" size={80} />
                    <p className="text-text-muted font-mono text-sm text-center">
                        Seleccioná un circuito, piloto y al menos 2 años para comparar<br />
                        Luego presioná COMPARAR AÑOS
                    </p>
                </div>
            )}
        </div>
    );
}
