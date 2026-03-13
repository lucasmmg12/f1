import { useState, useEffect } from 'react';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Activity, TrendingUp, Brain, X, Plus } from 'lucide-react';

const Plot = createPlotlyComponent(Plotly);
const API_URL = "http://localhost:8000";

const DRIVER_COLORS = ['#E53935', '#FF6F00', '#0277BD', '#2E7D32', '#7B1FA2', '#F57C00', '#C2185B', '#00838F', '#5E35B1', '#0097A7'];

export default function SeasonTrends() {
    const [year, setYear] = useState(2024);
    const [drivers, setDrivers] = useState(['VER', 'NOR', 'LEC']);
    const [newDriver, setNewDriver] = useState('');
    const [eventType, setEventType] = useState('R');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [dataSource, setDataSource] = useState(null);

    const addDriver = () => {
        const d = newDriver.trim().toUpperCase();
        if (d && !drivers.includes(d) && d.length === 3) {
            setDrivers([...drivers, d]);
            setNewDriver('');
        }
    };

    const removeDriver = (d) => setDrivers(drivers.filter(x => x !== d));

    const analyze = async () => {
        if (drivers.length < 1) return;
        setLoading(true); setError(null); setResult(null); setDataSource(null);
        const params = `year=${year}&drivers=${drivers.join(',')}&event_type=${eventType}`;
        try {
            const fastRes = await fetch(`${API_URL}/api/season-trends-fast?${params}`);
            if (fastRes.ok) {
                const data = await fastRes.json();
                setResult(data);
                setDataSource('database');
                setLoading(false);
                return;
            }
        } catch (e) { }
        try {
            setDataSource('loading');
            const res = await fetch(`${API_URL}/api/season-trends?${params}`);
            if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error"); }
            const data = await res.json();
            setResult(data);
            setDataSource('fastf1');
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    const buildLapTimeFig = () => {
        if (!result) return null;
        const traces = drivers.map((drv, idx) => {
            const data = result.trends[drv];
            if (!data || data.lap_times.length === 0) return null;
            return {
                x: data.round_names, y: data.lap_times,
                name: drv, type: 'scatter', mode: 'lines+markers',
                line: { color: DRIVER_COLORS[idx % DRIVER_COLORS.length], width: 2.5 },
                marker: { size: 7, color: DRIVER_COLORS[idx % DRIVER_COLORS.length] },
                hovertemplate: `%{x}: %{y:.3f}s<extra>${drv}</extra>`
            };
        }).filter(Boolean);
        return {
            data: traces,
            layout: {
                height: 400,
                title: { text: 'Fastest Lap Time por Ronda', font: { color: '#111827', size: 14, family: 'Outfit' } },
                xaxis: { title: 'Round', color: '#6B7280', gridcolor: '#F3F4F6', linecolor: '#E5E7EB' },
                yaxis: { title: 'Lap Time (s)', color: '#6B7280', gridcolor: '#F3F4F6', autorange: 'reversed', linecolor: '#E5E7EB' },
                font: { family: 'JetBrains Mono, monospace', color: '#4B5563', size: 11 },
                legend: { bgcolor: 'rgba(255,255,255,0.9)', bordercolor: '#E5E7EB', orientation: 'h', y: 1.12 },
                plot_bgcolor: '#FFFFFF', paper_bgcolor: '#FFFFFF',
                hovermode: 'x unified',
                hoverlabel: { bgcolor: '#111827', font: { family: 'JetBrains Mono', color: '#FFF' } },
                margin: { l: 60, r: 20, t: 50, b: 40 }
            }
        };
    };

    const buildTopSpeedFig = () => {
        if (!result) return null;
        const traces = drivers.map((drv, idx) => {
            const data = result.trends[drv];
            if (!data || data.top_speeds.length === 0) return null;
            return {
                x: data.round_names, y: data.top_speeds,
                name: drv, type: 'bar',
                marker: { color: DRIVER_COLORS[idx % DRIVER_COLORS.length], opacity: 0.85 },
                hovertemplate: `%{x}: %{y:.1f} km/h<extra>${drv}</extra>`
            };
        }).filter(Boolean);
        return {
            data: traces,
            layout: {
                height: 350,
                title: { text: 'Top Speed por Ronda', font: { color: '#111827', size: 14, family: 'Outfit' } },
                xaxis: { title: 'Round', color: '#6B7280', gridcolor: '#F3F4F6', linecolor: '#E5E7EB' },
                yaxis: { title: 'km/h', color: '#6B7280', gridcolor: '#F3F4F6', linecolor: '#E5E7EB' },
                font: { family: 'JetBrains Mono, monospace', color: '#4B5563', size: 11 },
                barmode: 'group',
                legend: { bgcolor: 'rgba(255,255,255,0.9)', bordercolor: '#E5E7EB', orientation: 'h', y: 1.12 },
                plot_bgcolor: '#FFFFFF', paper_bgcolor: '#FFFFFF',
                hovermode: 'x unified',
                hoverlabel: { bgcolor: '#111827', font: { family: 'JetBrains Mono', color: '#FFF' } },
                margin: { l: 60, r: 20, t: 50, b: 40 }
            }
        };
    };

    const lapTimeFig = buildLapTimeFig();
    const topSpeedFig = buildTopSpeedFig();

    return (
        <div className="px-8 py-6 min-h-screen">
            <header className="page-header">
                <div className="flex items-center gap-3">
                    <TrendingUp className="text-accent-primary" size={24} />
                    <h1>SEASON TRENDS</h1>
                    {dataSource === 'database' && (
                        <span className="px-2 py-0.5 rounded-full bg-green-50 border border-green-400 text-green-700 text-[9px] font-mono font-bold">⚡ DB INSTANT</span>
                    )}
                    {dataSource === 'fastf1' && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-400 text-blue-700 text-[9px] font-mono font-bold">🔄 LIVE FASTF1</span>
                    )}
                </div>
                <span className="text-[10px] font-mono text-text-muted">Evolución de rendimiento por temporada</span>
            </header>

            <div className="glass-card !p-4 mb-5">
                <div className="flex flex-wrap gap-4 items-end mb-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase tracking-widest text-text-heading font-semibold">Year</label>
                        <div className="flex gap-1">
                            {[2022, 2023, 2024, 2025].map(y => (
                                <button key={y} onClick={() => setYear(y)}
                                    className={`px-3 py-1 rounded-lg font-mono text-xs font-bold border transition-all
                    ${year === y ? 'bg-accent-primary text-white border-accent-primary' : 'text-text-body border-border-light hover:border-accent-primary bg-white'}`}>
                                    {y}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase tracking-widest text-text-heading font-semibold">Session</label>
                        <select className="ghost-input w-28 text-xs" value={eventType} onChange={e => setEventType(e.target.value)}>
                            <option value="R">Race</option>
                            <option value="Q">Qualifying</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-[9px] uppercase tracking-widest text-text-heading font-bold">Drivers:</span>
                    {drivers.map((drv, idx) => (
                        <span key={drv} className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-mono font-bold"
                            style={{ borderColor: DRIVER_COLORS[idx % DRIVER_COLORS.length], color: DRIVER_COLORS[idx % DRIVER_COLORS.length], backgroundColor: `${DRIVER_COLORS[idx % DRIVER_COLORS.length]}10` }}>
                            {drv}
                            <button onClick={() => removeDriver(drv)} className="hover:text-accent-red ml-0.5 opacity-60 hover:opacity-100">×</button>
                        </span>
                    ))}
                    <div className="flex items-center gap-1">
                        <input type="text" className="ghost-input !py-0.5 !px-2 w-16 text-[10px] text-center uppercase" maxLength={3}
                            placeholder="ADD" value={newDriver} onChange={e => setNewDriver(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addDriver()} />
                        <button onClick={addDriver} className="text-accent-primary hover:text-accent-primary/80"><Plus size={14} /></button>
                    </div>
                </div>

                <button onClick={analyze} disabled={loading || drivers.length < 1}
                    className="btn-primary flex items-center gap-2 text-xs !px-5 !py-2">
                    {loading ? <Activity className="animate-spin" size={16} /> : <TrendingUp size={16} />}
                    {loading ? "LOADING ALL ROUNDS... (this takes a few minutes)" : "ANALYZE SEASON"}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-lg border border-accent-red bg-red-50 text-text-heading text-xs">
                    <span className="font-bold text-accent-red">Error:</span> {error}
                </div>
            )}

            {loading && (
                <div className="glass-card !p-8 flex flex-col items-center gap-4">
                    <Activity className="animate-spin text-accent-primary" size={40} />
                    <p className="font-mono text-sm text-text-muted text-center">
                        Cargando datos de todas las rondas de {year}...<br />
                        <span className="text-[10px] text-text-muted">Esto puede tardar 2-5 minutos la primera vez</span>
                    </p>
                </div>
            )}

            {result && (
                <div className="flex flex-col gap-5">
                    {lapTimeFig && (
                        <div className="glass-card !p-3">
                            <Plot data={lapTimeFig.data} layout={lapTimeFig.layout}
                                useResizeHandler style={{ width: "100%", height: "100%" }}
                                config={{ displayModeBar: true, scrollZoom: true }} />
                        </div>
                    )}
                    {topSpeedFig && (
                        <div className="glass-card !p-3">
                            <Plot data={topSpeedFig.data} layout={topSpeedFig.layout}
                                useResizeHandler style={{ width: "100%", height: "100%" }}
                                config={{ displayModeBar: true, scrollZoom: true }} />
                        </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {drivers.map((drv, idx) => {
                            const data = result.trends[drv];
                            if (!data || data.lap_times.length === 0) return null;
                            const bestLap = Math.min(...data.lap_times);
                            const avgLap = data.lap_times.reduce((a, b) => a + b, 0) / data.lap_times.length;
                            const bestSpeed = Math.max(...data.top_speeds);
                            return (
                                <div key={drv} className="glass-card !p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DRIVER_COLORS[idx % DRIVER_COLORS.length] }} />
                                        <span className="font-mono text-sm font-black text-text-heading">{drv}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="text-[10px] text-text-muted">Best Lap: <span className="text-text-heading font-mono">{bestLap.toFixed(3)}s</span></div>
                                        <div className="text-[10px] text-text-muted">Avg Lap: <span className="text-text-heading font-mono">{avgLap.toFixed(3)}s</span></div>
                                        <div className="text-[10px] text-text-muted">Top Speed: <span className="text-text-heading font-mono">{bestSpeed} km/h</span></div>
                                        <div className="text-[10px] text-text-muted">Rounds: <span className="text-text-heading font-mono">{data.rounds.length}</span></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {!result && !loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <TrendingUp className="text-border-light" size={80} />
                    <p className="text-text-muted font-mono text-sm text-center">
                        Select drivers and press ANALYZE SEASON<br />
                        This will load all rounds and may take a few minutes
                    </p>
                </div>
            )}
        </div>
    );
}
