import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Star, Search, Hash, TrendingUp, MessageCircle, Users, RefreshCw, Clock } from 'lucide-react';

import { API_URL } from '../config';

const XIcon = ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const F1_ACCOUNTS = [
    { handle: 'F1', name: 'Formula 1', category: 'Oficial', color: '#E10600', featured: true, desc: 'Cuenta oficial de la Fórmula 1' },
    { handle: 'FIA', name: 'FIA', category: 'Oficial', color: '#003399', desc: 'Federación Internacional del Automóvil' },
    { handle: 'ScuderiaFerrari', name: 'Scuderia Ferrari', category: 'Equipos', color: '#DC0000', desc: 'Equipo más emblemático de la F1' },
    { handle: 'McLarenF1', name: 'McLaren F1', category: 'Equipos', color: '#FF8700', desc: 'Campeones de constructores 2024' },
    { handle: 'redbullracing', name: 'Red Bull Racing', category: 'Equipos', color: '#3671C6', desc: 'Escudería de Max Verstappen' },
    { handle: 'MercedesAMGF1', name: 'Mercedes-AMG F1', category: 'Equipos', color: '#27F4D2', desc: 'El equipo de George Russell' },
    { handle: 'AstonMartinF1', name: 'Aston Martin F1', category: 'Equipos', color: '#006F62', desc: 'El equipo de Fernando Alonso' },
    { handle: 'AlpineF1Team', name: 'Alpine F1 Team', category: 'Equipos', color: '#0090FF', desc: 'Equipo francés de Fórmula 1' },
    { handle: 'WilliamsRacing', name: 'Williams Racing', category: 'Equipos', color: '#64C4FF', desc: 'Equipo histórico desde 1977' },
    { handle: 'HaasF1Team', name: 'Haas F1 Team', category: 'Equipos', color: '#B6BABD', desc: 'Único equipo americano en F1' },
    { handle: 'FranColapworking', name: 'Franco Colapinto', category: 'Pilotos', color: '#64C4FF', featured: true, desc: '🇦🇷 Piloto argentino en F1' },
    { handle: 'Max33Verstappen', name: 'Max Verstappen', category: 'Pilotos', color: '#3671C6', desc: '🇳🇱 4x Campeón del Mundo' },
    { handle: 'LewisHamilton', name: 'Lewis Hamilton', category: 'Pilotos', color: '#DC0000', desc: '🇬🇧 7x Campeón, ahora en Ferrari' },
    { handle: 'Charles_Leclerc', name: 'Charles Leclerc', category: 'Pilotos', color: '#DC0000', desc: '🇲🇨 Piloto de Scuderia Ferrari' },
    { handle: 'LandoNorris', name: 'Lando Norris', category: 'Pilotos', color: '#FF8700', desc: '🇬🇧 Campeón 2025, McLaren' },
    { handle: 'Carlossainz55', name: 'Carlos Sainz', category: 'Pilotos', color: '#64C4FF', desc: '🇪🇸 Piloto de Williams Racing' },
    { handle: 'OscarPiastri', name: 'Oscar Piastri', category: 'Pilotos', color: '#FF8700', desc: '🇦🇺 Piloto de McLaren' },
    { handle: 'alo_oficial', name: 'Fernando Alonso', category: 'Pilotos', color: '#006F62', desc: '🇪🇸 2x Campeón, Aston Martin' },
    { handle: 'AlbertFabrega', name: 'Albert Fàbrega', category: 'Media', color: '#E53935', desc: 'Periodista español, pit lane reporter' },
    { handle: 'ChrisMedlandF1', name: 'Chris Medland', category: 'Media', color: '#9CA3AF', desc: 'Periodista de Racer.com' },
    { handle: 'LukeSmithF1', name: 'Luke Smith', category: 'Media', color: '#9CA3AF', desc: 'Periodista de The Athletic' },
];

const CATEGORIES = ['Todos', 'Oficial', 'Equipos', 'Pilotos', 'Media'];

const TRENDING_TOPICS = [
    { tag: '#F1', desc: 'Fórmula 1' },
    { tag: '#Formula1', desc: 'Global' },
    { tag: '#Colapinto', desc: 'Franco Colapinto' },
    { tag: '#ForzaFerrari', desc: 'Ferrari' },
    { tag: '#Verstappen', desc: 'Max' },
    { tag: '#McLaren', desc: 'McLaren' },
    { tag: '#F1Sprint', desc: 'Sprint' },
    { tag: '#Hamilton', desc: 'Lewis' },
    { tag: '#Norris', desc: 'Lando' },
    { tag: '#Alonso', desc: 'Fernando' },
];

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
}

function TweetCard({ tweet, accountColor }) {
    return (
        <a href={tweet.link} target="_blank" rel="noopener noreferrer"
            className="glass-card !p-4 group cursor-pointer hover:shadow-md transition-all block">
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: accountColor + '12', border: `2px solid ${accountColor}30` }}>
                    <XIcon size={14} style={{ color: accountColor }} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-text-heading">@{tweet.handle}</span>
                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                            <Clock size={9} /> {timeAgo(tweet.date)}
                        </span>
                        <ExternalLink size={9} className="text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[12px] text-text-body leading-relaxed whitespace-pre-line line-clamp-4">
                        {tweet.text}
                    </p>
                </div>
            </div>
        </a>
    );
}

export default function TwitterHub() {
    const [categoryFilter, setCategoryFilter] = useState('Todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAccount, setSelectedAccount] = useState(F1_ACCOUNTS[0]);
    const [tweets, setTweets] = useState([]);
    const [loadingTweets, setLoadingTweets] = useState(false);
    const [tweetsError, setTweetsError] = useState(false);

    const fetchTweets = useCallback(async (handle) => {
        setLoadingTweets(true);
        setTweetsError(false);
        try {
            const res = await fetch(`${API_URL}/api/tweets?handle=${handle}&limit=8`);
            if (!res.ok) throw new Error('failed');
            const data = await res.json();
            setTweets(data.tweets || []);
            if (data.tweets.length === 0) setTweetsError(true);
        } catch {
            setTweetsError(true);
            setTweets([]);
        } finally {
            setLoadingTweets(false);
        }
    }, []);

    useEffect(() => {
        fetchTweets(selectedAccount.handle);
    }, [selectedAccount, fetchTweets]);

    const filteredAccounts = F1_ACCOUNTS.filter(acc => {
        const matchCategory = categoryFilter === 'Todos' || acc.category === categoryFilter;
        const matchSearch = !searchQuery ||
            acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            acc.handle.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCategory && matchSearch;
    });

    return (
        <div className="px-8 py-6 min-h-screen">
            {/* HEADER */}
            <header className="page-header">
                <div className="flex items-center gap-3">
                    <XIcon size={22} className="text-text-heading" />
                    <h1>X / TWITTER</h1>
                </div>
                <span className="text-[10px] font-mono text-text-muted">Tweets y hilos de F1 en tiempo real</span>
            </header>

            {/* TRENDING HASHTAGS */}
            <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={13} className="text-[#1D9BF0]" />
                    <span className="text-[10px] font-black text-text-heading uppercase tracking-widest">Trending</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {TRENDING_TOPICS.map(topic => (
                        <a key={topic.tag} href={`https://x.com/search?q=${encodeURIComponent(topic.tag)}&f=live`}
                            target="_blank" rel="noopener noreferrer"
                            className="group flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border-light bg-white hover:border-[#1D9BF0] hover:bg-[#1D9BF0]/5 transition-all">
                            <Hash size={10} className="text-[#1D9BF0]" />
                            <span className="text-[10px] font-bold text-text-heading group-hover:text-[#1D9BF0] transition-colors">{topic.tag.replace('#', '')}</span>
                        </a>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* LEFT — Account Selector */}
                <div className="lg:col-span-4 xl:col-span-3">
                    {/* Search */}
                    <div className="glass-card !p-2.5 mb-3">
                        <div className="relative">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input type="text" className="ghost-input !pl-8 text-xs w-full"
                                placeholder="Buscar cuenta..."
                                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                    </div>

                    {/* Category Filters */}
                    <div className="flex flex-wrap gap-1 mb-3">
                        {CATEGORIES.map(cat => (
                            <button key={cat} onClick={() => setCategoryFilter(cat)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all
                                    ${categoryFilter === cat
                                        ? 'bg-text-heading text-white border-text-heading'
                                        : 'bg-white text-text-muted border-border-light hover:border-border-medium'}`}>
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Account List */}
                    <div className="space-y-1 max-h-[calc(100vh-350px)] overflow-y-auto pr-1">
                        {filteredAccounts.map(acc => (
                            <button key={acc.handle} onClick={() => setSelectedAccount(acc)}
                                className={`w-full glass-card !p-2.5 flex items-center gap-2.5 text-left transition-all cursor-pointer
                                    ${selectedAccount.handle === acc.handle ? '!border-accent-primary shadow-sm' : 'hover:shadow-sm'}`}>
                                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: acc.color + '12', border: `1.5px solid ${acc.color}35` }}>
                                    <XIcon size={11} style={{ color: acc.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                        <span className={`text-[11px] font-bold truncate ${selectedAccount.handle === acc.handle ? 'text-accent-primary' : 'text-text-heading'}`}>
                                            {acc.name}
                                        </span>
                                        {acc.featured && <Star size={9} className="text-[#FF6F00] flex-shrink-0" fill="#FF6F00" />}
                                    </div>
                                    <span className="text-[9px] text-text-muted font-mono">@{acc.handle}</span>
                                </div>
                                <span className="text-[7px] px-1 py-0.5 rounded font-bold flex-shrink-0"
                                    style={{ backgroundColor: acc.color + '10', color: acc.color }}>
                                    {acc.category}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* RIGHT — Tweet Preview */}
                <div className="lg:col-span-8 xl:col-span-9">
                    {/* Selected Account Header */}
                    <div className="glass-card !p-4 mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: selectedAccount.color + '12', border: `2px solid ${selectedAccount.color}35` }}>
                                    <XIcon size={20} style={{ color: selectedAccount.color }} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-black text-text-heading" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                            {selectedAccount.name}
                                        </h2>
                                        {selectedAccount.featured && (
                                            <span className="px-1.5 py-0.5 bg-[#E53935] text-white text-[8px] font-bold rounded-full">DESTACADO</span>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-text-muted font-mono">@{selectedAccount.handle} · {selectedAccount.desc}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => fetchTweets(selectedAccount.handle)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 border border-border-light text-text-muted rounded-lg text-[10px] font-bold hover:border-border-medium transition-all">
                                    <RefreshCw size={11} className={loadingTweets ? 'animate-spin' : ''} /> Recargar
                                </button>
                                <a href={`https://x.com/${selectedAccount.handle}`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-[10px] font-bold hover:bg-gray-800 transition-colors">
                                    <XIcon size={12} className="text-white" /> Abrir en X <ExternalLink size={9} />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Tweet Feed */}
                    {loadingTweets && (
                        <div className="flex flex-col items-center gap-3 py-16">
                            <RefreshCw className="animate-spin text-[#1D9BF0]" size={32} />
                            <span className="text-xs font-mono text-text-muted">Cargando tweets de @{selectedAccount.handle}...</span>
                        </div>
                    )}

                    {!loadingTweets && tweets.length > 0 && (
                        <div className="space-y-2">
                            {tweets.map((tweet, i) => (
                                <TweetCard key={i} tweet={tweet} accountColor={selectedAccount.color} />
                            ))}
                            <div className="flex justify-center pt-2">
                                <a href={`https://x.com/${selectedAccount.handle}`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors">
                                    <XIcon size={14} className="text-white" /> Ver más en X <ExternalLink size={10} />
                                </a>
                            </div>
                        </div>
                    )}

                    {!loadingTweets && tweetsError && (
                        <div className="glass-card !p-6">
                            <div className="text-center mb-4">
                                <XIcon size={40} className="text-border-light mx-auto mb-3" />
                                <p className="text-sm font-bold text-text-heading mb-1">No se pudieron cargar los tweets</p>
                                <p className="text-xs text-text-muted mb-4">Los servidores RSS están temporalmente inaccesibles. Podés ver los tweets directamente en X.</p>
                            </div>

                            {/* Fallback: Direct links */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <a href={`https://x.com/${selectedAccount.handle}`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border-light hover:border-[#1D9BF0] hover:bg-[#1D9BF0]/5 transition-all group">
                                    <XIcon size={16} style={{ color: selectedAccount.color }} />
                                    <div>
                                        <span className="text-xs font-bold text-text-heading group-hover:text-[#1D9BF0]">Ver perfil de @{selectedAccount.handle}</span>
                                        <div className="text-[9px] text-text-muted">Últimos tweets y respuestas</div>
                                    </div>
                                    <ExternalLink size={10} className="text-text-muted ml-auto" />
                                </a>
                                <a href={`https://x.com/search?q=from%3A${selectedAccount.handle}&f=live`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border-light hover:border-[#1D9BF0] hover:bg-[#1D9BF0]/5 transition-all group">
                                    <Search size={16} className="text-[#1D9BF0]" />
                                    <div>
                                        <span className="text-xs font-bold text-text-heading group-hover:text-[#1D9BF0]">Buscar tweets</span>
                                        <div className="text-[9px] text-text-muted">Tweets recientes de esta cuenta</div>
                                    </div>
                                    <ExternalLink size={10} className="text-text-muted ml-auto" />
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Quick Search Shortcuts */}
                    <div className="mt-6 glass-card !p-4">
                        <div className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mb-2">Búsquedas rápidas en X</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                            {[
                                { q: 'F1 lang:es', label: '🇪🇸 F1 en español' },
                                { q: 'Colapinto F1', label: '🇦🇷 Colapinto' },
                                { q: 'F1 penalty stewards', label: '⚖️ Penalizaciones' },
                                { q: 'F1 transfer rumor', label: '🔄 Rumores fichajes' },
                                { q: 'F1 crash incident', label: '💥 Incidentes' },
                                { q: 'F1 2026 regulations', label: '📋 Reglamento 2026' },
                                { q: '#F1 qualifying pole', label: '🏁 Clasificación' },
                                { q: 'F1 strategy tyres', label: '🔧 Estrategia' },
                            ].map(item => (
                                <a key={item.q} href={`https://x.com/search?q=${encodeURIComponent(item.q)}&f=live`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-border-light hover:border-[#1D9BF0] hover:shadow-sm transition-all group">
                                    <span className="text-[10px] font-bold text-text-heading group-hover:text-[#1D9BF0] transition-colors">{item.label}</span>
                                    <ExternalLink size={8} className="text-text-muted ml-auto" />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
