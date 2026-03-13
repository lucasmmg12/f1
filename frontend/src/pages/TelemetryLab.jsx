import { useState, useEffect, useRef, useCallback } from 'react';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Activity, Calendar, Users, Gauge, X, Filter, Brain, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import InteractiveTrackMap from '../components/InteractiveTrackMap';
import Hint from '../components/Hint';

const Plot = createPlotlyComponent(Plotly);
import { API_URL } from '../config';

export default function TelemetryLab() {
  const [year, setYear] = useState(2025);
  const [events, setEvents] = useState([]);
  const [selectedRound, setSelectedRound] = useState(null);
  const [eventType, setEventType] = useState("FP1");
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [trackMapDriver, setTrackMapDriver] = useState("");
  const [lapMode, setLapMode] = useState("fastest");
  const [lapNumber, setLapNumber] = useState(1);
  const [lapStart, setLapStart] = useState(1);
  const [lapEnd, setLapEnd] = useState(5);
  const [loading, setLoading] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [telemetryData, setTelemetryData] = useState(null);
  const [error, setError] = useState(null);

  // AI
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showEvents, setShowEvents] = useState(true);

  // Track map hover sync
  const [hoverDistance, setHoverDistance] = useState(null);
  const trackMapContainerRef = useRef(null);
  const plotContainerRef = useRef(null);
  const [trackMapSize, setTrackMapSize] = useState({ width: 400, height: 300 });

  // Observe track map container size
  useEffect(() => {
    const el = trackMapContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setTrackMapSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [telemetryData]);

  // Direct Plotly DOM event listener
  useEffect(() => {
    const container = plotContainerRef.current;
    if (!container || !telemetryData) return;

    let plotDiv = null;
    let throttleTimer = null;
    let cleanedUp = false;

    const onHover = (data) => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => { throttleTimer = null; }, 25);
      if (data?.points?.length > 0) {
        const xVal = data.points[0].x;
        if (xVal !== undefined && xVal !== null) {
          const num = typeof xVal === 'number' ? xVal : parseFloat(xVal);
          if (!isNaN(num)) setHoverDistance(num);
        }
      }
    };
    const onUnhover = () => setHoverDistance(null);

    const tryBind = () => {
      if (cleanedUp) return;
      plotDiv = container.querySelector('.js-plotly-plot');
      if (plotDiv && plotDiv.on) {
        plotDiv.on('plotly_hover', onHover);
        plotDiv.on('plotly_unhover', onUnhover);
      } else {
        setTimeout(tryBind, 300);
      }
    };
    setTimeout(tryBind, 500);

    return () => {
      cleanedUp = true;
      if (plotDiv && plotDiv.removeAllListeners) {
        plotDiv.removeAllListeners('plotly_hover');
        plotDiv.removeAllListeners('plotly_unhover');
      }
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [telemetryData]);

  const handleTelemetryHover = useCallback((event) => {
    if (!event?.points?.length) return;
    const xVal = event.points[0].x;
    if (xVal !== undefined && xVal !== null) {
      const num = typeof xVal === 'number' ? xVal : parseFloat(xVal);
      if (!isNaN(num)) setHoverDistance(num);
    }
  }, []);

  const handleTelemetryUnhover = useCallback(() => {
    setHoverDistance(null);
  }, []);

  useEffect(() => { fetchSchedule(year); }, [year]);
  useEffect(() => { if (selectedRound) fetchDrivers(year, selectedRound, eventType); }, [selectedRound, eventType]);

  const fetchSchedule = async (y) => {
    setLoadingSchedule(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/schedule?year=${y}`);
      const data = await res.json();
      if (data.events) {
        setEvents(data.events);
        if (data.events.length > 0) setSelectedRound(data.events[0].round_number);
      }
    } catch (err) { setError(`Error: ${err.message}`); }
    finally { setLoadingSchedule(false); }
  };

  const fetchDrivers = async (y, round, et) => {
    setLoadingDrivers(true);
    try {
      const res = await fetch(`${API_URL}/api/drivers?year=${y}&track=${round}&event_type=${et}`);
      const data = await res.json();
      if (data.drivers && data.drivers.length > 0) {
        setAvailableDrivers(data.drivers);
        setSelectedDrivers([data.drivers[0]?.abbreviation, data.drivers[1]?.abbreviation].filter(Boolean));
        setTrackMapDriver(data.drivers[0]?.abbreviation || "");
      }
    } catch { setAvailableDrivers([]); }
    finally { setLoadingDrivers(false); }
  };

  const addDriver = (abbr) => {
    if (abbr && !selectedDrivers.includes(abbr)) setSelectedDrivers([...selectedDrivers, abbr]);
  };
  const removeDriver = (abbr) => {
    const next = selectedDrivers.filter(d => d !== abbr);
    setSelectedDrivers(next);
    if (trackMapDriver === abbr) setTrackMapDriver(next[0] || "");
  };

  const fetchTelemetry = async () => {
    if (selectedDrivers.length < 1 || !selectedRound) return;
    setLoading(true); setError(null); setAiAnalysis(null);
    try {
      let url = `${API_URL}/api/analyze?drivers=${selectedDrivers.join(',')}&year=${year}&track=${selectedRound}&event_type=${eventType}&lap_mode=${lapMode}`;
      if (lapMode === "specific") url += `&lap_number=${lapNumber}`;
      if (lapMode === "range") url += `&lap_start=${lapStart}&lap_end=${lapEnd}`;
      if (trackMapDriver) url += `&track_map_driver=${trackMapDriver}`;
      const res = await fetch(url);
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "API Error"); }
      const data = await res.json();
      setTelemetryData({
        ...data,
        telemetry_fig: JSON.parse(data.telemetry_figure_json),
        track_map_fig: JSON.parse(data.track_map_figure_json),
        track_coords: data.track_coords
      });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const fetchAIAnalysis = async () => {
    if (selectedDrivers.length < 1) return;
    setLoadingAI(true); setShowAI(true);
    try {
      let url = `${API_URL}/api/ai-analyze?drivers=${selectedDrivers.join(',')}&year=${year}&track=${selectedRound}&event_type=${eventType}&lap_mode=${lapMode}`;
      if (lapMode === "specific") url += `&lap_number=${lapNumber}`;
      if (lapMode === "range") url += `&lap_start=${lapStart}&lap_end=${lapEnd}`;
      const res = await fetch(url);
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "AI Error"); }
      const data = await res.json();
      setAiAnalysis(data);
    } catch (err) { setError(`AI: ${err.message}`); }
    finally { setLoadingAI(false); }
  };

  const selectedEvent = events.find(e => e.round_number === selectedRound);
  const driverColors = ['#E53935', '#FF6F00', '#0277BD', '#2E7D32', '#7B1FA2', '#F57C00', '#C2185B', '#00838F', '#5E35B1', '#0097A7'];
  const getDriverInfo = (abbr) => availableDrivers.find(d => d.abbreviation === abbr);

  return (
    <div className="relative min-h-screen px-8 py-6">

      {/* HEADER */}
      <header className="page-header">
        <div className="flex items-center gap-3">
          <Gauge className="text-accent-primary" size={24} />
          <h1>TELEMETRY LAB</h1>
        </div>
        <span className="font-mono text-[10px] text-text-muted">Comparación de telemetría en tiempo real</span>
      </header>

      {/* YEAR */}
      <div className="flex gap-2 mb-4">
        {[2023, 2024, 2025, 2026].map(y => (
          <button key={y} onClick={() => setYear(y)}
            className={`px-4 py-1.5 rounded-lg font-mono font-bold text-xs transition-all duration-200 border
              ${year === y ? 'bg-accent-primary text-white border-accent-primary' : 'bg-white text-text-body border-border-light hover:border-accent-primary hover:text-accent-primary'}`}
          >{y}</button>
        ))}
        <button onClick={() => setShowEvents(!showEvents)}
          className="ml-2 text-text-muted hover:text-text-heading transition-colors text-xs flex items-center gap-1">
          {showEvents ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {showEvents ? 'Ocultar' : 'Ver'} Eventos
        </button>
      </div>

      {/* EVENTS */}
      {showEvents && !loadingSchedule && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5 mb-5">
          {events.map(ev => (
            <button key={ev.round_number} onClick={() => { setSelectedRound(ev.round_number); setShowEvents(false); }}
              className={`glass-card !p-2 text-left cursor-pointer ${selectedRound === ev.round_number ? '!border-accent-primary' : ''}`}>
              <div className="font-mono text-[9px] text-text-muted">R{ev.round_number}</div>
              <div className={`text-[11px] font-bold truncate ${selectedRound === ev.round_number ? 'text-accent-primary' : 'text-text-heading'}`}>{ev.location}</div>
            </button>
          ))}
        </div>
      )}
      {loadingSchedule && <div className="flex items-center gap-2 text-accent-primary mb-4"><Activity className="animate-spin" size={16} /><span className="font-mono text-xs">Loading...</span></div>}

      {/* CONTROLS */}
      {selectedEvent && (
        <div className="glass-card !p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="text-accent-primary" size={14} />
            <h2 className="text-sm font-black text-text-heading">{selectedEvent.event_name} — {year}</h2>
            <span className="ml-auto font-mono text-[10px] text-text-muted">{selectedEvent.event_date}</span>
          </div>

          <div className="flex flex-wrap gap-3 items-end mb-3">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase tracking-widest text-text-heading font-semibold flex items-center gap-1">Sesión <Hint text="Elegí qué sesión analizar: Carrera, Clasificación, Prácticas o Sprint" /></label>
              <select className="ghost-input w-36 text-xs" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                <option value="R">Carrera</option>
                <option value="Q">Clasificación</option>
                <option value="FP1">FP1</option>
                <option value="FP2">FP2</option>
                <option value="FP3">FP3</option>
                <option value="S">Sprint</option>
                <option value="SQ">Sprint Quali</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase tracking-widest text-text-heading font-semibold flex items-center gap-1"><Filter size={9} /> Modo de Vuelta <Hint text="Fastest: la vuelta más rápida. Specific: una vuelta específica. Range: rango de vueltas. All: todas las vueltas" /></label>
              <select className="ghost-input w-32 text-xs" value={lapMode} onChange={(e) => setLapMode(e.target.value)}>
                <option value="fastest">Más Rápida</option>
                <option value="specific">Vuelta Específica</option>
                <option value="range">Rango de Vueltas</option>
                <option value="all">Todas las Vueltas</option>
              </select>
            </div>

            {lapMode === "specific" && (
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase tracking-widest text-text-heading font-semibold">Vuelta #</label>
                <input type="number" min={1} className="ghost-input w-16 text-xs text-center"
                  value={lapNumber} onChange={(e) => setLapNumber(parseInt(e.target.value) || 1)} />
              </div>
            )}
            {lapMode === "range" && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase tracking-widest text-text-heading font-semibold">Desde</label>
                  <input type="number" min={1} className="ghost-input w-16 text-xs text-center"
                    value={lapStart} onChange={(e) => setLapStart(parseInt(e.target.value) || 1)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase tracking-widest text-text-heading font-semibold">Hasta</label>
                  <input type="number" min={1} className="ghost-input w-16 text-xs text-center"
                    value={lapEnd} onChange={(e) => setLapEnd(parseInt(e.target.value) || 5)} />
                </div>
              </>
            )}

            <div className="ml-auto flex gap-2">
              <button onClick={fetchTelemetry} disabled={loading || selectedDrivers.length < 1}
                className="btn-primary flex items-center gap-2 text-xs !px-5 !py-2">
                {loading ? <Activity className="animate-spin" size={16} /> : <Gauge size={16} />}
                {loading ? "..." : "ANALIZAR"}
              </button>
              <button onClick={fetchAIAnalysis} disabled={loadingAI || selectedDrivers.length < 1}
                className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg border border-accent-purple text-accent-purple font-bold uppercase transition-all duration-200 hover:bg-accent-purple hover:text-white"
                style={loadingAI ? { opacity: 0.5 } : {}}>
                {loadingAI ? <Activity className="animate-spin" size={16} /> : <Brain size={16} />}
                AI INSIGHT
              </button>
            </div>
          </div>

          {/* DRIVERS */}
          <div className="border-t border-border-light pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Users className="text-accent-primary" size={13} />
              <span className="text-[10px] uppercase tracking-widest text-text-heading font-bold">Drivers ({selectedDrivers.length})</span>
              <span className="text-[9px] text-text-muted ml-1">Track Map:</span>
              {selectedDrivers.map((abbr, idx) => (
                <button key={abbr} onClick={() => setTrackMapDriver(abbr)}
                  className={`font-mono text-[10px] px-2 py-0.5 rounded-full border transition-all ${trackMapDriver === abbr ? 'text-white font-bold' : 'text-text-body'}`}
                  style={{ borderColor: driverColors[idx % driverColors.length], backgroundColor: trackMapDriver === abbr ? driverColors[idx % driverColors.length] : 'transparent' }}
                >{abbr}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedDrivers.map((abbr, idx) => {
                const info = getDriverInfo(abbr);
                return (
                  <div key={abbr} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs"
                    style={{ borderColor: driverColors[idx % driverColors.length], backgroundColor: `${driverColors[idx % driverColors.length]}10` }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: driverColors[idx % driverColors.length] }} />
                    <span className="font-mono font-bold text-text-heading text-[11px]">{abbr}</span>
                    {info && <span className="text-[9px] text-text-muted">{info.team}</span>}
                    <button onClick={() => removeDriver(abbr)} className="text-text-muted hover:text-accent-red"><X size={10} /></button>
                  </div>
                );
              })}
              {availableDrivers.length > 0 && (
                <select className="ghost-input !py-0.5 !px-2 text-[10px] w-40" value=""
                  onChange={(e) => { addDriver(e.target.value); e.target.value = ""; }}>
                  <option value="">+ Add driver...</option>
                  {availableDrivers.filter(d => !selectedDrivers.includes(d.abbreviation)).map(d => (
                    <option key={d.abbreviation} value={d.abbreviation}>{d.abbreviation} — {d.full_name}</option>
                  ))}
                </select>
              )}
            </div>
            {loadingDrivers && <div className="flex items-center gap-1 text-accent-primary mt-1 text-[10px] font-mono"><Activity className="animate-spin" size={10} /> Loading...</div>}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-accent-red bg-red-50 text-text-heading text-xs">
          <span className="font-bold text-accent-red">Error:</span> {error}
        </div>
      )}

      {/* AI ANALYSIS PANEL */}
      {showAI && (
        <div className="glass-card !p-4 mb-5 !border-accent-purple/30">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-text-heading flex items-center gap-2">
              <Brain className="text-accent-purple" size={18} /> AI Performance Analysis
              {aiAnalysis?.source === "cached" && <span className="text-[9px] font-normal text-text-muted ml-2">(cached)</span>}
            </h2>
            <button onClick={() => setShowAI(false)} className="text-text-muted hover:text-text-heading"><X size={16} /></button>
          </div>
          {loadingAI ? (
            <div className="flex items-center gap-3 py-8 justify-center">
              <Brain className="animate-pulse text-accent-purple" size={28} />
              <span className="font-mono text-sm text-text-muted">Analizando telemetría con GPT-4o...</span>
            </div>
          ) : aiAnalysis ? (
            <div className="prose prose-sm max-w-none text-text-body leading-relaxed text-[13px]"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(aiAnalysis.analysis) }} />
          ) : null}
        </div>
      )}

      {/* MAIN GRID */}
      <div className="grid grid-cols-12 gap-5">
        {/* LEFT */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
          <h2 className="text-base font-black text-text-heading">Lap Times</h2>
          {telemetryData && telemetryData.lap_times ? (
            Object.entries(telemetryData.lap_times).map(([drv, time], idx) => (
              <div key={drv} className="glass-card flex flex-col gap-1 !p-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: driverColors[idx % driverColors.length] }} />
                  <span className="text-[9px] uppercase tracking-widest text-text-muted">{drv}</span>
                  {getDriverInfo(drv)?.team && <span className="text-[8px] text-text-muted/60">· {getDriverInfo(drv).team}</span>}
                </div>
                <span className="font-mono text-xl font-bold" style={{ color: driverColors[idx % driverColors.length] }}>{time}</span>
                {telemetryData.driver_stats && telemetryData.driver_stats[drv] && (
                  <div className="flex gap-2 mt-1">
                    <div className="text-[9px] text-text-muted">
                      <span className="text-text-heading font-mono">{telemetryData.driver_stats[drv].top_speed}</span> km/h top
                    </div>
                    <div className="text-[9px] text-text-muted">
                      <span className="text-text-heading font-mono">{telemetryData.driver_stats[drv].full_throttle_pct}%</span> WOT
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="glass-card !p-3"><span className="text-[10px] text-text-muted font-mono">NO DATA</span></div>
          )}

          <h2 className="text-base font-black text-text-heading mt-1 flex items-center gap-2">
            Track Map
            {hoverDistance !== null && (
              <span className="text-[9px] font-mono font-normal text-accent-primary animate-pulse">
                {Math.round(hoverDistance)}m
              </span>
            )}
          </h2>
          <div ref={trackMapContainerRef} className="glass-card !p-2 h-80 flex items-center justify-center overflow-hidden" style={{ background: '#111827' }}>
            {loading ? <Activity className="animate-spin text-accent-primary" size={24} />
              : telemetryData?.track_coords ? (
                <InteractiveTrackMap
                  trackCoords={telemetryData.track_coords}
                  hoverDistance={hoverDistance}
                  width={trackMapSize.width - 16}
                  height={trackMapSize.height - 16}
                />
              ) : telemetryData?.track_map_fig ? (
                <Plot data={telemetryData.track_map_fig.data}
                  layout={{ ...telemetryData.track_map_fig.layout, autosize: true }}
                  useResizeHandler style={{ width: "100%", height: "100%" }}
                  config={{ displayModeBar: false }} />
              ) : <span className="text-white/30 font-mono text-[9px]">NO DATA</span>}
          </div>
        </div>

        {/* RIGHT */}
        <div className="col-span-12 lg:col-span-9 flex flex-col">
          <h2 className="text-base font-black text-text-heading mb-3">
            Telemetry
            {telemetryData && <span className="text-[10px] font-normal text-text-muted ml-2">{telemetryData.lap_mode}</span>}
          </h2>
          <div ref={plotContainerRef} className="glass-card flex-1 min-h-[70vh] flex items-center justify-center !p-1">
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <Activity className="animate-spin text-accent-primary" size={36} />
                <span className="font-mono text-[11px] text-text-muted">Processing...</span>
              </div>
            ) : telemetryData?.telemetry_fig ? (
              <Plot data={telemetryData.telemetry_fig.data}
                layout={{ ...telemetryData.telemetry_fig.layout, autosize: true }}
                useResizeHandler style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: true, scrollZoom: true }}
                onHover={handleTelemetryHover}
                onUnhover={handleTelemetryUnhover} />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Gauge className="text-border-light" size={48} />
                <span className="text-text-muted font-mono text-[10px]">SELECT DRIVERS & ANALYZE</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Simple markdown to HTML formatter */
function formatMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/### (.*)/g, '<h3 class="text-text-heading font-bold text-sm mt-3 mb-1">$1</h3>')
    .replace(/## (.*)/g, '<h2 class="text-text-heading font-bold text-base mt-4 mb-2">$1</h2>')
    .replace(/# (.*)/g, '<h1 class="text-text-heading font-bold text-lg mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-text-heading">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="font-mono text-accent-primary bg-red-50 px-1 rounded text-[12px]">$1</code>')
    .replace(/- (.*)/g, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/g, '<br/>');
}
