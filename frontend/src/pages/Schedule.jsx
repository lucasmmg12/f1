import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, MapPin, Flag, ChevronRight, Timer, RefreshCw, Globe } from 'lucide-react';

const API_URL = "http://localhost:8000";

// Country flag emojis
const COUNTRY_FLAGS = {
    'Bahrain': '🇧🇭', 'Saudi Arabia': '🇸🇦', 'Australia': '🇦🇺', 'Japan': '🇯🇵',
    'China': '🇨🇳', 'United States': '🇺🇸', 'USA': '🇺🇸', 'Miami': '🇺🇸',
    'Italy': '🇮🇹', 'Monaco': '🇲🇨', 'Canada': '🇨🇦', 'Spain': '🇪🇸',
    'Austria': '🇦🇹', 'United Kingdom': '🇬🇧', 'Great Britain': '🇬🇧',
    'Hungary': '🇭🇺', 'Belgium': '🇧🇪', 'Netherlands': '🇳🇱', 'The Netherlands': '🇳🇱',
    'Singapore': '🇸🇬', 'Azerbaijan': '🇦🇿', 'Mexico': '🇲🇽',
    'Brazil': '🇧🇷', 'Las Vegas': '🇺🇸', 'Qatar': '🇶🇦',
    'Abu Dhabi': '🇦🇪', 'UAE': '🇦🇪', 'Emilia Romagna': '🇮🇹', 'Portugal': '🇵🇹',
};

const SESSION_LABELS = {
    'Practice 1': 'P1', 'Practice 2': 'P2', 'Practice 3': 'P3',
    'Qualifying': 'QUALY', 'Race': 'RACE', 'Sprint': 'SPRINT',
    'Sprint Qualifying': 'SQ', 'Sprint Shootout': 'SS',
};

const SESSION_COLORS = {
    'Practice 1': '#6B7280', 'Practice 2': '#6B7280', 'Practice 3': '#6B7280',
    'Qualifying': '#F59E0B', 'Race': '#E53935', 'Sprint': '#8B5CF6',
    'Sprint Qualifying': '#8B5CF6', 'Sprint Shootout': '#8B5CF6',
};

function getFlag(country) {
    for (const [key, flag] of Object.entries(COUNTRY_FLAGS)) {
        if (country.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(country.toLowerCase())) {
            return flag;
        }
    }
    return '🏁';
}

function getEventStatus(eventDate) {
    const now = new Date();
    const date = new Date(eventDate);
    const diffMs = date - now;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < -2) return 'over';
    if (diffDays >= -2 && diffDays <= 2) return 'live';
    return 'upcoming';
}

function CountdownTimer({ targetDate, label }) {
    const [timeLeft, setTimeLeft] = useState({});

    useEffect(() => {
        const calc = () => {
            const now = new Date();
            const target = new Date(targetDate);
            const diff = target - now;
            if (diff <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
                return;
            }
            setTimeLeft({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((diff / (1000 * 60)) % 60),
                seconds: Math.floor((diff / 1000) % 60),
                expired: false,
            });
        };
        calc();
        const interval = setInterval(calc, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    if (timeLeft.expired) return <span className="text-xs text-text-muted font-mono">FINALIZADO</span>;

    return (
        <div>
            <div className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mb-1.5">{label}</div>
            <div className="flex items-baseline gap-1">
                {[
                    { val: timeLeft.days, label: 'días' },
                    { val: timeLeft.hours, label: 'hrs' },
                    { val: timeLeft.minutes, label: 'min' },
                    { val: timeLeft.seconds, label: 'seg' },
                ].map((u, i) => (
                    <div key={u.label} className="flex items-baseline gap-0.5">
                        {i > 0 && <span className="text-text-muted text-lg font-light">:</span>}
                        <span className="text-2xl font-black text-text-heading font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {String(u.val).padStart(2, '0')}
                        </span>
                        <span className="text-[9px] text-text-muted font-mono">{u.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function SchedulePage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [year, setYear] = useState(2025);

    const fetchSchedule = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/schedule?year=${year}`);
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setEvents(data.events || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [year]);

    useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

    // Find next event
    const now = new Date();
    const nextEvent = events.find(e => new Date(e.event_date) >= new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000));
    const nextNextEvent = events.find(e => e !== nextEvent && new Date(e.event_date) > new Date(nextEvent?.event_date || now));

    const pastEvents = events.filter(e => getEventStatus(e.event_date) === 'over');
    const upcomingEvents = events.filter(e => getEventStatus(e.event_date) !== 'over');

    return (
        <div className="px-8 py-6 min-h-screen">
            {/* HEADER */}
            <header className="page-header">
                <div className="flex items-center gap-3">
                    <Calendar className="text-accent-primary" size={24} />
                    <h1>CALENDARIO {year}</h1>
                </div>
                <div className="flex items-center gap-3">
                    {[2023, 2024, 2025, 2026].map(y => (
                        <button key={y} onClick={() => setYear(y)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all
                                ${year === y ? 'bg-accent-primary text-white border-accent-primary' : 'bg-white text-text-muted border-border-light hover:border-border-medium'}`}>
                            {y}
                        </button>
                    ))}
                </div>
            </header>

            {/* UP NEXT — Countdown Section */}
            {nextEvent && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    {/* Main countdown */}
                    <div className="lg:col-span-2 glass-card !p-0 overflow-hidden">
                        <div className="bg-gradient-to-r from-[#E53935] to-[#FF6F00] px-5 py-2">
                            <span className="text-white text-[11px] font-bold tracking-widest uppercase">⚡ Próxima Carrera</span>
                        </div>
                        <div className="p-5">
                            <div className="flex items-start gap-4 mb-4">
                                <span className="text-5xl">{getFlag(nextEvent.country)}</span>
                                <div>
                                    <h2 className="text-xl font-black text-text-heading" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                        {nextEvent.event_name}
                                    </h2>
                                    <div className="flex items-center gap-2 text-sm text-text-muted">
                                        <MapPin size={13} /> {nextEvent.location}, {nextEvent.country}
                                        <span className="text-[10px] font-mono ml-2">R{nextEvent.round_number}</span>
                                    </div>
                                </div>
                            </div>
                            <CountdownTimer targetDate={nextEvent.event_date} label="Cuenta regresiva" />

                            {/* Sessions */}
                            <div className="flex flex-wrap gap-2 mt-4">
                                {nextEvent.sessions.map(s => (
                                    <span key={s} className="px-2.5 py-1 rounded-lg text-xs font-bold border"
                                        style={{
                                            color: SESSION_COLORS[s] || '#666',
                                            borderColor: (SESSION_COLORS[s] || '#666') + '40',
                                            backgroundColor: (SESSION_COLORS[s] || '#666') + '10',
                                        }}>
                                        {SESSION_LABELS[s] || s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Next after that */}
                    {nextNextEvent && (
                        <div className="glass-card !p-4">
                            <div className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mb-3">Siguiente</div>
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-3xl">{getFlag(nextNextEvent.country)}</span>
                                <div>
                                    <div className="text-sm font-bold text-text-heading">{nextNextEvent.event_name}</div>
                                    <div className="text-[11px] text-text-muted flex items-center gap-1">
                                        <MapPin size={11} /> {nextNextEvent.location}
                                    </div>
                                </div>
                            </div>
                            <CountdownTimer targetDate={nextNextEvent.event_date} label="Faltan" />
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {nextNextEvent.sessions.map(s => (
                                    <span key={s} className="px-2 py-0.5 rounded text-[9px] font-bold"
                                        style={{ color: SESSION_COLORS[s] || '#666', backgroundColor: (SESSION_COLORS[s] || '#666') + '10' }}>
                                        {SESSION_LABELS[s] || s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {loading && (
                <div className="flex flex-col items-center gap-3 py-20">
                    <RefreshCw className="animate-spin text-accent-primary" size={40} />
                    <span className="font-mono text-sm text-text-muted">Cargando calendario...</span>
                </div>
            )}

            {/* UPCOMING EVENTS */}
            {!loading && upcomingEvents.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-base font-black text-text-heading mb-3 flex items-center gap-2">
                        <Timer size={16} className="text-[#E53935]" /> PRÓXIMOS EVENTOS
                        <span className="text-[10px] font-mono text-text-muted font-normal">({upcomingEvents.length})</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {upcomingEvents.map(event => (
                            <div key={event.round_number} className="glass-card !p-4 group hover:shadow-md transition-all">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-2xl">{getFlag(event.country)}</span>
                                    <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded-full bg-[#F5F5F5]">
                                        R{event.round_number}
                                    </span>
                                </div>
                                <h3 className="text-sm font-bold text-text-heading group-hover:text-accent-primary transition-colors mb-0.5 truncate">
                                    {event.event_name}
                                </h3>
                                <div className="flex items-center gap-1 text-[11px] text-text-muted mb-2">
                                    <MapPin size={10} /> {event.location}
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-text-body mb-2">
                                    <Clock size={10} /> {event.event_date}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {event.sessions.map(s => (
                                        <span key={s} className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                                            style={{ color: SESSION_COLORS[s] || '#666', backgroundColor: (SESSION_COLORS[s] || '#666') + '10' }}>
                                            {SESSION_LABELS[s] || s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PAST EVENTS */}
            {!loading && pastEvents.length > 0 && (
                <div>
                    <h2 className="text-base font-black text-text-heading mb-3 flex items-center gap-2">
                        <Flag size={16} className="text-text-muted" /> EVENTOS FINALIZADOS
                        <span className="text-[10px] font-mono text-text-muted font-normal">({pastEvents.length})</span>
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                        {pastEvents.map(event => (
                            <div key={event.round_number} className="glass-card !p-3 opacity-60 hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">{getFlag(event.country)}</span>
                                    <span className="text-[9px] font-mono text-text-muted">R{event.round_number}</span>
                                </div>
                                <div className="text-xs font-bold text-text-heading truncate">{event.event_name}</div>
                                <div className="text-[10px] text-text-muted">{event.event_date}</div>
                                <span className="text-[8px] text-[#E53935] font-bold uppercase mt-1 inline-block">Finalizado</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* EMPTY */}
            {!loading && events.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-20">
                    <Calendar className="text-border-light" size={56} />
                    <span className="text-text-muted font-mono text-xs">No hay eventos disponibles para {year}</span>
                </div>
            )}
        </div>
    );
}
