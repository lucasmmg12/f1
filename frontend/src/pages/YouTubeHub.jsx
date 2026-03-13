import { useState } from 'react';
import { Youtube, ExternalLink, Play, Search, Star, Users, Radio } from 'lucide-react';

const FEATURED_CHANNEL = {
    name: 'Formula Zeta',
    handle: '@formulazeta',
    url: 'https://www.youtube.com/@formulazeta',
    description: 'El canal oficial de Formula Zeta — Análisis, reacciones en vivo, y todo sobre la Fórmula 1 en español.',
    logo: '/channels4_profile.jpg',
    social: {
        instagram: 'https://www.instagram.com/formulazeta.ok/',
        kick: 'https://kick.com/formulazeta',
    }
};

const F1_CHANNELS = [
    {
        name: 'Formula Zeta',
        handle: '@formulazeta',
        url: 'https://www.youtube.com/@formulazeta',
        logo: '/channels4_profile.jpg',
        featured: true,
        videos: [
            { id: 'latest', title: 'Último video de Formula Zeta', embed: 'https://www.youtube.com/embed?listType=user_uploads&list=formulazeta' },
        ]
    },
    {
        name: 'FORMULA 1',
        handle: '@Formula1',
        url: 'https://www.youtube.com/@Formula1',
        logo: null,
        category: 'Oficial',
        color: '#E10600',
    },
    {
        name: 'Motorsport.com ES',
        handle: '@MotorsportcomES',
        url: 'https://www.youtube.com/@MotorsportcomES',
        logo: null,
        category: 'Motorsport',
        color: '#D32F2F',
    },
    {
        name: 'Sky Sports F1',
        handle: '@SkySportsF1',
        url: 'https://www.youtube.com/@SkySportsF1',
        logo: null,
        category: 'TV/Media',
        color: '#0072C6',
    },
    {
        name: 'Autosport',
        handle: '@autosport',
        url: 'https://www.youtube.com/@autosport',
        logo: null,
        category: 'Motorsport',
        color: '#00A651',
    },
    {
        name: 'The Race',
        handle: '@TheRace',
        url: 'https://www.youtube.com/@TheRace',
        logo: null,
        category: 'Motorsport',
        color: '#1A1A2E',
    },
    {
        name: 'WTF1',
        handle: '@WTF1',
        url: 'https://www.youtube.com/@WTF1',
        logo: null,
        category: 'Fan Media',
        color: '#FF6600',
    },
    {
        name: 'Chain Bear',
        handle: '@chainbear',
        url: 'https://www.youtube.com/@chainbear',
        logo: null,
        category: 'Educational',
        color: '#7B1FA2',
    },
    {
        name: 'Peter Windsor',
        handle: '@PeterWindsorF1',
        url: 'https://www.youtube.com/@PeterWindsorF1',
        logo: null,
        category: 'Expert',
        color: '#455A64',
    },
    {
        name: 'Driver61',
        handle: '@Driver61',
        url: 'https://www.youtube.com/@Driver61',
        logo: null,
        category: 'Educational',
        color: '#0277BD',
    },
    {
        name: 'Aldas',
        handle: '@AaldasF1',
        url: 'https://www.youtube.com/@AaldasF1',
        logo: null,
        category: 'ES',
        color: '#E53935',
    },
    {
        name: 'Lobato & Rosaleny',
        handle: '@Lobato',
        url: 'https://www.youtube.com/@LaraPuntoyComa',
        logo: null,
        category: 'ES',
        color: '#F57C00',
    },
];

// Curated video IDs for initial display
const CURATED_VIDEOS = [
    { channel: 'Formula Zeta', title: 'Canal de Formula Zeta', embedUrl: 'https://www.youtube.com/@formulazeta', isChannel: true },
];

export default function YouTubeHub() {
    const [searchUrl, setSearchUrl] = useState('');
    const [customVideos, setCustomVideos] = useState([]);
    const [activeTab, setActiveTab] = useState('fz'); // 'fz', 'channels', 'custom'

    const extractVideoId = (url) => {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/,
        ];
        for (const p of patterns) {
            const m = url.match(p);
            if (m) return m[1];
        }
        return null;
    };

    const addVideo = () => {
        const id = extractVideoId(searchUrl.trim());
        if (id && !customVideos.includes(id)) {
            setCustomVideos([id, ...customVideos]);
            setSearchUrl('');
        }
    };

    return (
        <div className="px-8 py-6 min-h-screen">
            {/* HEADER */}
            <header className="page-header">
                <div className="flex items-center gap-3">
                    <Youtube className="text-[#FF0000]" size={24} />
                    <h1>YOUTUBE</h1>
                </div>
                <span className="text-[10px] font-mono text-text-muted">Videos y canales de F1</span>
            </header>

            {/* FEATURED CHANNEL — FORMULA ZETA */}
            <div className="glass-card !p-0 mb-6 overflow-hidden">
                <div className="bg-gradient-to-r from-[#E53935] via-[#FF6F00] to-[#E53935] h-2" />
                <div className="p-5 flex items-center gap-5">
                    <img src={FEATURED_CHANNEL.logo} alt={FEATURED_CHANNEL.name}
                        className="w-20 h-20 rounded-2xl object-cover shadow-lg flex-shrink-0 border-2 border-white" />
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-xl font-black text-text-heading" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                {FEATURED_CHANNEL.name}
                            </h2>
                            <Star className="text-[#FF6F00]" size={18} fill="#FF6F00" />
                            <span className="px-2 py-0.5 bg-[#E53935] text-white text-[9px] font-bold rounded-full uppercase">Canal Principal</span>
                        </div>
                        <p className="text-sm text-text-body mb-2">{FEATURED_CHANNEL.description}</p>
                        <div className="flex items-center gap-3">
                            <a href={FEATURED_CHANNEL.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF0000] text-white rounded-lg text-xs font-bold hover:bg-[#CC0000] transition-colors">
                                <Youtube size={14} /> SUSCRIBIRSE
                            </a>
                            <a href={FEATURED_CHANNEL.social.instagram} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E4405F] text-[#E4405F] rounded-lg text-xs font-bold hover:bg-[#E4405F] hover:text-white transition-all">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg>
                                INSTAGRAM
                            </a>
                            <a href={FEATURED_CHANNEL.social.kick} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#53FC18] text-[#53FC18] rounded-lg text-xs font-bold hover:bg-[#53FC18] hover:text-black transition-all">
                                <Radio size={14} /> KICK
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABS */}
            <div className="flex items-center gap-2 mb-5">
                {[
                    { id: 'fz', label: '🎬 Formula Zeta', icon: Play },
                    { id: 'channels', label: '📺 Canales F1', icon: Users },
                    { id: 'custom', label: '🔗 Pegar Video', icon: Search },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all
                            ${activeTab === tab.id
                                ? 'bg-text-heading text-white border-text-heading'
                                : 'bg-white text-text-muted border-border-light hover:border-border-medium'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB: Formula Zeta Videos */}
            {activeTab === 'fz' && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <img src="/channels4_profile.jpg" alt="FZ" className="w-8 h-8 rounded-lg object-cover" />
                        <h2 className="text-base font-black text-text-heading">Videos de Formula Zeta</h2>
                    </div>

                    {/* Formula Zeta Videos — Thumbnail cards (embed disabled by channel) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {[
                            { id: 'NATT4xBHpMs', title: 'ANÁLISIS GP AUSTRALIA de FRANCO COLAPINTO' },
                            { id: '0nJJ0PYVNXU', title: '¿PODIO DE COLAPINTO? Predicciones F1 2026' },
                            { id: 'W4JnpZCq-OE', title: 'Se terminó una etapa' },
                            { id: 'zO5lgK-wd_0', title: '¿Qué TAN BUENO fue CARLOS REUTEMANN?' },
                            { id: 'c-LNBF68QHI', title: 'Mi TIERLIST de PILOTOS F1 temporada 2025' },
                            { id: 'z2xc9nwA0gc', title: '¿Es LANDO NORRIS un MERECIDO CAMPEÓN?' },
                        ].map(video => (
                            <a key={video.id} href={`https://www.youtube.com/watch?v=${video.id}`}
                                target="_blank" rel="noopener noreferrer"
                                className="glass-card !p-0 overflow-hidden group cursor-pointer hover:shadow-lg transition-all">
                                <div className="aspect-video relative bg-black">
                                    <img
                                        src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                                        alt={video.title}
                                        className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                                    />
                                    {/* Play button overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-14 h-14 bg-[#FF0000] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                            <Play size={24} className="text-white ml-1" fill="white" />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-2.5 flex items-center gap-2">
                                    <img src="/channels4_profile.jpg" alt="FZ" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                                    <span className="text-[11px] font-bold text-text-heading truncate group-hover:text-accent-primary transition-colors">{video.title}</span>
                                    <ExternalLink size={10} className="text-text-muted flex-shrink-0 ml-auto" />
                                </div>
                            </a>
                        ))}
                    </div>
                    <div className="flex justify-center mb-4">
                        <a href="https://www.youtube.com/@formulazeta" target="_blank" rel="noopener noreferrer"
                            className="btn-primary flex items-center gap-2 text-xs !px-6 !py-2.5 !bg-[#FF0000] hover:!bg-[#CC0000]">
                            <Youtube size={16} /> VER TODOS LOS VIDEOS EN YOUTUBE
                        </a>
                    </div>

                    {/* Quick links to Formula Zeta */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: '📺 YouTube', url: 'https://www.youtube.com/@formulazeta', color: '#FF0000' },
                            { label: '📸 Instagram', url: 'https://www.instagram.com/formulazeta.ok/', color: '#E4405F' },
                            { label: '🟢 Kick', url: 'https://kick.com/formulazeta', color: '#53FC18' },
                            { label: '🌐 Sitio Web', url: 'https://www.growlabs.lat', color: '#E53935' },
                        ].map(link => (
                            <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                                className="glass-card !p-3 flex items-center gap-3 group cursor-pointer hover:shadow-md transition-all">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: link.color }} />
                                <span className="text-sm font-bold text-text-heading group-hover:text-accent-primary transition-colors">{link.label}</span>
                                <ExternalLink size={12} className="text-text-muted ml-auto" />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB: All F1 Channels */}
            {activeTab === 'channels' && (
                <div>
                    <h2 className="text-base font-black text-text-heading mb-4">Canales de F1 en YouTube</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {F1_CHANNELS.map(ch => (
                            <a key={ch.handle} href={ch.url} target="_blank" rel="noopener noreferrer"
                                className="glass-card !p-4 flex items-center gap-4 group cursor-pointer hover:shadow-md transition-all">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                                    style={{ backgroundColor: ch.featured ? undefined : (ch.color || '#E53935') + '15', border: `2px solid ${ch.color || '#E53935'}30` }}>
                                    {ch.logo ? (
                                        <img src={ch.logo} alt={ch.name} className="w-full h-full object-cover rounded-xl" />
                                    ) : (
                                        <Youtube size={20} style={{ color: ch.color || '#E53935' }} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-text-heading group-hover:text-accent-primary transition-colors truncate">{ch.name}</span>
                                        {ch.featured && <Star size={12} className="text-[#FF6F00] flex-shrink-0" fill="#FF6F00" />}
                                    </div>
                                    <span className="text-[11px] text-text-muted font-mono">{ch.handle}</span>
                                    {ch.category && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded ml-1"
                                            style={{ backgroundColor: (ch.color || '#999') + '15', color: ch.color || '#666' }}>
                                            {ch.category}
                                        </span>
                                    )}
                                </div>
                                <ExternalLink size={14} className="text-text-muted group-hover:text-accent-primary transition-colors flex-shrink-0" />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB: Custom Video Embed */}
            {activeTab === 'custom' && (
                <div>
                    <div className="glass-card !p-4 mb-5">
                        <h2 className="text-sm font-black text-text-heading mb-2">Pegar link de YouTube</h2>
                        <p className="text-xs text-text-muted mb-3">Pegá un link de YouTube y se embede automáticamente acá</p>
                        <div className="flex gap-2">
                            <input type="text" className="ghost-input flex-1 text-xs !font-mono"
                                placeholder="https://www.youtube.com/watch?v=..."
                                value={searchUrl} onChange={e => setSearchUrl(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addVideo()} />
                            <button onClick={addVideo}
                                className="btn-primary flex items-center gap-2 text-xs !px-4 !bg-[#FF0000] hover:!bg-[#CC0000]">
                                <Play size={14} /> AGREGAR
                            </button>
                        </div>
                    </div>

                    {customVideos.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {customVideos.map(id => (
                                <div key={id} className="glass-card !p-0 overflow-hidden">
                                    <div className="aspect-video">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${id}`}
                                            className="w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            title={`Video ${id}`}
                                        />
                                    </div>
                                    <div className="p-2 flex items-center justify-between">
                                        <span className="text-[10px] font-mono text-text-muted">{id}</span>
                                        <button onClick={() => setCustomVideos(customVideos.filter(v => v !== id))}
                                            className="text-text-muted hover:text-accent-red text-xs">×</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 py-16">
                            <Play className="text-border-light" size={56} />
                            <p className="text-text-muted text-xs font-mono text-center">Pegá un link de YouTube arriba para embederlo</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
