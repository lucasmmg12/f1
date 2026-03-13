import { useState } from 'react';
import { Activity, FileImage, Download, Monitor, Square, Smartphone, Type } from 'lucide-react';

const API_URL = "http://localhost:8000";

const FORMATS = [
    { id: '16:9', label: '16:9', icon: Monitor, desc: 'TV / Presentación', w: 1920, h: 1080 },
    { id: '1:1', label: '1:1', icon: Square, desc: 'Instagram Post', w: 1080, h: 1080 },
    { id: '9:16', label: '9:16', icon: Smartphone, desc: 'Stories / Reels', w: 1080, h: 1920 },
];

export default function ReportStudio() {
    const [format, setFormat] = useState('16:9');
    const [title, setTitle] = useState('Formula Zeta — Performance Analysis');
    const [subtitle, setSubtitle] = useState('Melbourne 2025 — Race Telemetry');
    const [figureJson, setFigureJson] = useState('');
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState(null);
    const [importSource, setImportSource] = useState('');

    const importFromPage = async (source) => {
        setImportSource(source);
        setError(null);
        try {
            let url = '';
            if (source === 'cross-year') {
                url = `${API_URL}/api/cross-year?driver=VER&track=Melbourne&event_type=R&years=2023,2024,2025`;
            } else if (source === 'teams') {
                url = `${API_URL}/api/teams-compare?teams=Ferrari,McLaren,Red Bull Racing&year=2025&track=1&event_type=R&mode=best`;
            } else if (source === 'telemetry') {
                url = `${API_URL}/api/analyze?drivers=VER,NOR&year=2025&track=1&event_type=R&lap_mode=fastest`;
            }
            if (!url) return;

            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch data");
            const data = await res.json();

            const figJson = data.telemetry_figure_json;
            if (figJson) {
                setFigureJson(figJson);
                setTitle(source === 'cross-year' ? 'Cross-Year Comparison' : source === 'teams' ? 'Constructor Battle' : 'Telemetry Analysis');
            }
        } catch (err) {
            setError(`Import failed: ${err.message}`);
        }
    };

    const generateReport = async () => {
        if (!figureJson) {
            setError("No chart data. Import from a page first.");
            return;
        }
        setLoading(true); setError(null); setPreview(null);
        try {
            const res = await fetch(`${API_URL}/api/export-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ figure_json: figureJson, title, subtitle, format })
            });
            if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Export error"); }
            const data = await res.json();
            setPreview(data);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    const downloadPNG = () => {
        if (!preview) return;
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${preview.image_base64}`;
        link.download = `fz_report_${format.replace(':', 'x')}_${Date.now()}.png`;
        link.click();
    };

    return (
        <div className="px-8 py-6 min-h-screen">
            <header className="page-header">
                <div className="flex items-center gap-3">
                    <FileImage className="text-accent-primary" size={24} />
                    <h1>REPORT STUDIO</h1>
                </div>
                <span className="text-[10px] font-mono text-text-muted">Exportar infografías PNG para TV y redes</span>
            </header>

            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                    <div className="glass-card !p-4">
                        <h2 className="text-xs font-black text-text-heading uppercase tracking-widest mb-3">1. Importar Datos</h2>
                        <div className="flex flex-col gap-2">
                            {[
                                { id: 'telemetry', label: 'Telemetry Lab', desc: 'VER vs NOR — Australia 2025' },
                                { id: 'cross-year', label: 'Cross-Year', desc: 'VER Melbourne 2023-2025' },
                                { id: 'teams', label: 'Teams Battle', desc: 'Ferrari vs McLaren vs RB' },
                            ].map(src => (
                                <button key={src.id} onClick={() => importFromPage(src.id)}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-left text-xs transition-all
                    ${importSource === src.id ? 'border-accent-primary bg-red-50' : 'border-border-light hover:border-border-medium bg-white'}`}>
                                    <div className={`w-2 h-2 rounded-full ${importSource === src.id ? 'bg-accent-primary' : 'bg-border-light'}`} />
                                    <div>
                                        <div className="font-bold text-text-heading">{src.label}</div>
                                        <div className="text-[9px] text-text-muted">{src.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        {figureJson && <div className="mt-2 text-[9px] text-accent-primary font-mono">✓ Chart data loaded ({(figureJson.length / 1024).toFixed(0)}KB)</div>}
                    </div>

                    <div className="glass-card !p-4">
                        <h2 className="text-xs font-black text-text-heading uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Type size={12} /> 2. Texto
                        </h2>
                        <div className="flex flex-col gap-2">
                            <input type="text" className="ghost-input text-xs w-full" placeholder="Título principal"
                                value={title} onChange={e => setTitle(e.target.value)} />
                            <input type="text" className="ghost-input text-xs w-full" placeholder="Subtítulo"
                                value={subtitle} onChange={e => setSubtitle(e.target.value)} />
                        </div>
                    </div>

                    <div className="glass-card !p-4">
                        <h2 className="text-xs font-black text-text-heading uppercase tracking-widest mb-3">3. Formato</h2>
                        <div className="flex gap-2">
                            {FORMATS.map(f => (
                                <button key={f.id} onClick={() => setFormat(f.id)}
                                    className={`flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-xs transition-all
                    ${format === f.id ? 'border-accent-primary bg-red-50 text-accent-primary' : 'border-border-light text-text-muted hover:border-border-medium bg-white'}`}>
                                    <f.icon size={20} />
                                    <span className="font-bold">{f.label}</span>
                                    <span className="text-[8px]">{f.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button onClick={generateReport} disabled={loading || !figureJson}
                        className="btn-primary flex items-center justify-center gap-2 text-sm !py-3 w-full">
                        {loading ? <Activity className="animate-spin" size={18} /> : <FileImage size={18} />}
                        {loading ? "GENERATING..." : "GENERATE REPORT"}
                    </button>
                </div>

                <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
                    {error && (
                        <div className="p-3 rounded-lg border border-accent-red bg-red-50 text-text-heading text-xs">
                            <span className="font-bold text-accent-red">Error:</span> {error}
                        </div>
                    )}

                    {preview ? (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-black text-text-heading">Preview ({preview.width}×{preview.height} @ 2x)</h2>
                                <button onClick={downloadPNG}
                                    className="btn-primary flex items-center gap-2 text-xs !px-5">
                                    <Download size={16} /> DOWNLOAD PNG
                                </button>
                            </div>
                            <div className="glass-card !p-2 flex items-center justify-center overflow-auto" style={{ maxHeight: '75vh' }}>
                                <img src={`data:image/png;base64,${preview.image_base64}`} alt="Report"
                                    className="max-w-full rounded border border-border-light"
                                    style={{ maxHeight: '70vh' }} />
                            </div>
                            <div className="text-[9px] text-text-muted font-mono text-center">
                                Resolución real: {preview.width * 2}×{preview.height * 2}px (Retina) • Formato: {preview.format}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card flex-1 min-h-[60vh] flex flex-col items-center justify-center gap-4">
                            <FileImage className="text-border-light" size={80} />
                            <p className="text-text-muted font-mono text-sm text-center">
                                1. Import data from any page<br />
                                2. Customize title and format<br />
                                3. Press GENERATE REPORT
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
