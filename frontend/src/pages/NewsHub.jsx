import { useState, useEffect, useCallback } from 'react';
import { Newspaper, RefreshCw, Globe, ExternalLink, Clock, Filter, Search, ChevronDown, Zap } from 'lucide-react';

const API_URL = "http://localhost:8000";

const LANG_OPTIONS = [
    { id: 'all', label: 'Todas', flag: '🌐' },
    { id: 'es', label: 'Español', flag: '🇪🇸' },
    { id: 'en', label: 'English', flag: '🇬🇧' },
];

const CATEGORY_OPTIONS = [
    { id: 'all', label: 'Todas' },
    { id: 'Oficial', label: '🏎️ Oficial' },
    { id: 'Motorsport', label: '🏁 Motorsport' },
    { id: 'TV/Media', label: '📺 TV/Media' },
    { id: 'Prensa Deportiva', label: '📰 Prensa' },
    { id: 'Fan Media', label: '🌐 Fan Media' },
    { id: 'Especializada', label: '🚗 Especializada' },
];

const SOURCE_COLORS = {
    'Formula1.com': '#E10600',
    'Motorsport.com ES': '#D32F2F',
    'Motorsport.com EN': '#D32F2F',
    'Autosport': '#00A651',
    'The Race': '#1A1A2E',
    'Sky Sports F1': '#0072C6',
    'BBC Sport F1': '#BB1919',
    'Marca Motor F1': '#E81E1E',
    'AS Motor F1': '#CF211A',
    'ESPN F1 ES': '#CC0A00',
    'SoyMotor.com': '#FF6600',
    'PlanetF1': '#FF7700',
    'RaceFans': '#3498DB',
    'GPFans': '#1B5E20',
    'Crash.net F1': '#FF4444',
};

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr.replace(' ', 'T'));
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'ahora';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`;
    return dateStr.split(' ')[0];
}

export default function NewsHub() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lang, setLang] = useState('all');
    const [category, setCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sourceStats, setSourceStats] = useState({});
    const [total, setTotal] = useState(0);
    const [sourcesCount, setSourcesCount] = useState(0);
    const [expandedArticle, setExpandedArticle] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    const fetchNews = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ lang, limit: '80', category });
            const res = await fetch(`${API_URL}/api/news?${params}`);
            if (!res.ok) throw new Error('Failed to fetch news');
            const data = await res.json();
            setArticles(data.articles || []);
            setSourceStats(data.source_stats || {});
            setTotal(data.total || 0);
            setSourcesCount(data.sources_fetched || 0);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [lang, category]);

    useEffect(() => { fetchNews(); }, [fetchNews]);

    const filteredArticles = articles.filter(art => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return art.title.toLowerCase().includes(q) || art.summary?.toLowerCase().includes(q) || art.source.toLowerCase().includes(q);
    });

    const featuredArticle = filteredArticles[0];
    const restArticles = filteredArticles.slice(1);

    return (
        <div className="px-8 py-6 min-h-screen">
            {/* HEADER */}
            <header className="page-header">
                <div className="flex items-center gap-3">
                    <Newspaper className="text-accent-primary" size={24} />
                    <h1>NEWS HUB</h1>
                    <span className="text-[10px] font-mono text-text-muted ml-2">
                        {total} artículos · {sourcesCount} fuentes
                    </span>
                </div>
                <button onClick={fetchNews} disabled={loading}
                    className="flex items-center gap-2 text-xs font-bold text-text-muted hover:text-accent-primary transition-colors">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'CARGANDO...' : 'REFRESH'}
                </button>
            </header>

            {/* FILTERS BAR */}
            <div className="glass-card !p-3 mb-5">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Language Filter */}
                    <div className="flex items-center gap-1">
                        <Globe size={13} className="text-text-muted" />
                        {LANG_OPTIONS.map(l => (
                            <button key={l.id} onClick={() => setLang(l.id)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all
                                    ${lang === l.id ? 'bg-accent-primary text-white border-accent-primary' : 'bg-white text-text-muted border-border-light hover:border-border-medium'}`}>
                                {l.flag} {l.label}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-6 bg-border-light" />

                    {/* Category Filter */}
                    <div className="flex items-center gap-1">
                        <Filter size={13} className="text-text-muted" />
                        <div className="flex gap-1 overflow-x-auto">
                            {CATEGORY_OPTIONS.map(c => (
                                <button key={c.id} onClick={() => setCategory(c.id)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all whitespace-nowrap
                                        ${category === c.id ? 'bg-[#0277BD] text-white border-[#0277BD]' : 'bg-white text-text-muted border-border-light hover:border-border-medium'}`}>
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="w-px h-6 bg-border-light" />

                    {/* Search */}
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <Search size={14} className="text-text-muted" />
                        <input type="text" placeholder="Buscar noticias..."
                            className="ghost-input !py-1 !px-2 flex-1 text-xs !font-sans"
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>

                    {/* View toggle */}
                    <div className="flex gap-1">
                        <button onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-text-heading text-white' : 'text-text-muted hover:text-text-heading'}`}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="0" width="6" height="6" rx="1" fill="currentColor" /><rect x="8" y="0" width="6" height="6" rx="1" fill="currentColor" /><rect x="0" y="8" width="6" height="6" rx="1" fill="currentColor" /><rect x="8" y="8" width="6" height="6" rx="1" fill="currentColor" /></svg>
                        </button>
                        <button onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-text-heading text-white' : 'text-text-muted hover:text-text-heading'}`}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="0" width="14" height="3" rx="1" fill="currentColor" /><rect x="0" y="5.5" width="14" height="3" rx="1" fill="currentColor" /><rect x="0" y="11" width="14" height="3" rx="1" fill="currentColor" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* SOURCE STATS */}
            {Object.keys(sourceStats).length > 0 && (
                <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                    {Object.entries(sourceStats).sort((a, b) => b[1] - a[1]).map(([src, count]) => (
                        <span key={src} className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono whitespace-nowrap"
                            style={{ borderColor: `${SOURCE_COLORS[src] || '#999'}40`, color: SOURCE_COLORS[src] || '#666', backgroundColor: `${SOURCE_COLORS[src] || '#999'}08` }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[src] || '#999' }} />
                            {src} ({count})
                        </span>
                    ))}
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 rounded-lg border border-accent-red bg-red-50 text-text-heading text-xs">
                    <span className="font-bold text-accent-red">Error:</span> {error}
                </div>
            )}

            {/* LOADING */}
            {loading && (
                <div className="flex flex-col items-center gap-3 py-20">
                    <RefreshCw className="animate-spin text-accent-primary" size={40} />
                    <span className="font-mono text-sm text-text-muted">Cargando noticias de {sourcesCount} fuentes...</span>
                </div>
            )}

            {/* FEATURED ARTICLE */}
            {!loading && featuredArticle && viewMode === 'grid' && (
                <a href={featuredArticle.link} target="_blank" rel="noopener noreferrer"
                    className="block glass-card !p-0 mb-5 overflow-hidden group cursor-pointer">
                    <div className="grid grid-cols-12 gap-0">
                        {featuredArticle.image && (
                            <div className="col-span-12 md:col-span-5 h-64 md:h-full overflow-hidden">
                                <img src={featuredArticle.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                        )}
                        <div className={`${featuredArticle.image ? 'col-span-12 md:col-span-7' : 'col-span-12'} p-6 flex flex-col justify-center`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                                    style={{ backgroundColor: SOURCE_COLORS[featuredArticle.source] || '#E53935' }}>
                                    {featuredArticle.source}
                                </span>
                                <span className="text-[10px] text-text-muted flex items-center gap-1">
                                    <Clock size={10} /> {timeAgo(featuredArticle.published)}
                                </span>
                                <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-[#F5F5F5]">
                                    {featuredArticle.lang === 'es' ? '🇪🇸' : '🇬🇧'} {featuredArticle.category}
                                </span>
                            </div>
                            <h2 className="text-xl font-black text-text-heading leading-tight group-hover:text-accent-primary transition-colors mb-2"
                                style={{ fontFamily: 'Outfit, sans-serif' }}>
                                {featuredArticle.title}
                            </h2>
                            {featuredArticle.summary && (
                                <p className="text-sm text-text-body leading-relaxed line-clamp-3">{featuredArticle.summary}</p>
                            )}
                            <div className="flex items-center gap-1 mt-3 text-accent-primary text-xs font-bold">
                                Leer más <ExternalLink size={12} />
                            </div>
                        </div>
                    </div>
                </a>
            )}

            {/* ARTICLES GRID */}
            {!loading && viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {restArticles.map((art, idx) => (
                        <a key={`${art.link}-${idx}`} href={art.link} target="_blank" rel="noopener noreferrer"
                            className="glass-card !p-0 overflow-hidden group cursor-pointer flex flex-col">
                            {art.image && (
                                <div className="h-40 overflow-hidden">
                                    <img src={art.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        onError={e => e.target.style.display = 'none'} />
                                </div>
                            )}
                            <div className="p-3 flex flex-col flex-1">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: SOURCE_COLORS[art.source] || '#999' }} />
                                    <span className="text-[9px] font-bold truncate" style={{ color: SOURCE_COLORS[art.source] || '#666' }}>
                                        {art.source}
                                    </span>
                                    <span className="text-[9px] text-text-muted ml-auto flex-shrink-0">
                                        {timeAgo(art.published)}
                                    </span>
                                </div>
                                <h3 className="text-sm font-bold text-text-heading leading-snug group-hover:text-accent-primary transition-colors line-clamp-3 flex-1">
                                    {art.title}
                                </h3>
                                {art.summary && (
                                    <p className="text-[11px] text-text-muted leading-relaxed mt-1.5 line-clamp-2">{art.summary}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border-light">
                                    <span className="text-[9px] text-text-muted px-1.5 py-0.5 rounded bg-[#F5F5F5]">
                                        {art.lang === 'es' ? '🇪🇸 ES' : '🇬🇧 EN'}
                                    </span>
                                    <span className="text-[9px] text-text-muted">{art.category}</span>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            )}

            {/* ARTICLES LIST */}
            {!loading && viewMode === 'list' && (
                <div className="flex flex-col gap-2">
                    {filteredArticles.map((art, idx) => (
                        <a key={`${art.link}-${idx}`} href={art.link} target="_blank" rel="noopener noreferrer"
                            className="glass-card !p-3 group cursor-pointer flex items-start gap-4">
                            {art.image && (
                                <div className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                    <img src={art.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        onError={e => e.target.parentElement.style.display = 'none'} />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: SOURCE_COLORS[art.source] || '#999' }} />
                                    <span className="text-[10px] font-bold" style={{ color: SOURCE_COLORS[art.source] || '#666' }}>
                                        {art.source}
                                    </span>
                                    <span className="text-[9px] text-text-muted">{art.lang === 'es' ? '🇪🇸' : '🇬🇧'}</span>
                                    <span className="text-[9px] text-text-muted">{art.category}</span>
                                    <span className="text-[9px] text-text-muted ml-auto flex items-center gap-1">
                                        <Clock size={9} /> {timeAgo(art.published)}
                                    </span>
                                </div>
                                <h3 className="text-sm font-bold text-text-heading group-hover:text-accent-primary transition-colors truncate">
                                    {art.title}
                                </h3>
                                {art.summary && (
                                    <p className="text-[11px] text-text-muted truncate">{art.summary}</p>
                                )}
                            </div>
                            <ExternalLink size={14} className="text-text-muted group-hover:text-accent-primary transition-colors mt-1 flex-shrink-0" />
                        </a>
                    ))}
                </div>
            )}

            {/* EMPTY */}
            {!loading && filteredArticles.length === 0 && !error && (
                <div className="flex flex-col items-center gap-3 py-20">
                    <Newspaper className="text-border-light" size={56} />
                    <span className="text-text-muted font-mono text-xs">No se encontraron noticias</span>
                </div>
            )}
        </div>
    );
}
