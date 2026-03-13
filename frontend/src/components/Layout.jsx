import { NavLink, Outlet } from 'react-router-dom';
import { Gauge, GitCompareArrows, Users, TrendingUp, FileImage, ChevronLeft, ChevronRight, Trophy, Newspaper, Youtube, Calendar, HelpCircle } from 'lucide-react';
import { useState } from 'react';

// X/Twitter icon (not in Lucide)
const XTwitterIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const NAV_ITEMS = [
    { to: '/', icon: Gauge, label: 'Telemetría', desc: 'Comparar pilotos' },
    { to: '/results', icon: Trophy, label: 'Resultados', desc: 'Clasificación y estrategia' },
    { to: '/cross-year', icon: GitCompareArrows, label: 'Comparar Años', desc: 'Comparar generaciones' },
    { to: '/teams', icon: Users, label: 'Escuderías', desc: 'Comparar constructores' },
    { to: '/trends', icon: TrendingUp, label: 'Tendencias', desc: 'Gráficos de evolución' },
    { to: '/schedule', icon: Calendar, label: 'Calendario', desc: 'Próximas carreras' },
    { to: '/news', icon: Newspaper, label: 'Noticias', desc: 'F1 noticias en vivo' },
    { to: '/youtube', icon: Youtube, label: 'YouTube', desc: 'Videos F1' },
    { to: '/twitter', icon: XTwitterIcon, label: 'X / Twitter', desc: 'Tweets de F1' },
    { to: '/reports', icon: FileImage, label: 'Reportes', desc: 'Exportar PNG' },
];

const SOCIALS = [
    {
        href: 'https://www.youtube.com/@formulazeta', icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" /><polygon fill="#0A0A0A" points="9.545,15.568 15.818,12 9.545,8.432" /></svg>
        ), label: 'YouTube'
    },
    {
        href: 'https://www.instagram.com/formulazeta.ok/', icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg>
        ), label: 'Instagram'
    },
    {
        href: 'https://kick.com/formulazeta', icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M1.2 0C.54 0 0 .54 0 1.2v21.6C0 23.46.54 24 1.2 24h6V14.4h2.4L14.4 24h8.4l-6-12 6-12h-8.4l-4.8 9.6H7.2V0H1.2z" /></svg>
        ), label: 'Kick'
    },
];

export default function Layout() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="flex min-h-screen bg-bg-main">
            {/* SIDEBAR */}
            <aside className={`fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}
                style={{ background: '#0A0A0A' }}>

                {/* Logo — Real image */}
                <div className={`flex items-center gap-3 px-4 py-4 ${collapsed ? 'justify-center' : ''}`}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <img src="/channels4_profile.jpg" alt="Formula Zeta"
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <div className="text-[12px] font-black text-white tracking-[0.15em] leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>FORMULA ZETA</div>
                            <div className="text-[10px] text-[#E53935] font-mono font-medium">ANALYZER v2.0</div>
                        </div>
                    )}
                </div>

                {/* Nav Items */}
                <nav className="flex-1 py-4 flex flex-col gap-0.5 px-2 overflow-y-auto">
                    {NAV_ITEMS.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                ${isActive
                                    ? 'bg-white/10 text-white'
                                    : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'}`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <div className="relative flex-shrink-0">
                                        <item.icon size={18} />
                                        {isActive && (
                                            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[#E53935]" />
                                        )}
                                    </div>
                                    {!collapsed && (
                                        <div className="overflow-hidden">
                                            <div className="text-[13px] font-semibold truncate">{item.label}</div>
                                            <div className="text-[10px] text-[#6B7280] truncate">{item.desc}</div>
                                        </div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Social Links */}
                {!collapsed && (
                    <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="text-[9px] uppercase tracking-widest text-[#6B7280] mb-2 font-semibold">Síguenos</div>
                        <div className="flex items-center gap-3">
                            {SOCIALS.map(s => (
                                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                                    className="text-[#6B7280] hover:text-white transition-colors" title={s.label}>
                                    {s.icon}
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Help Link */}
                {!collapsed && (
                    <div className="px-4 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <NavLink to="/help"
                            className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all
                                ${isActive ? 'text-white bg-white/10' : 'text-[#6B7280] hover:text-white hover:bg-white/5'}`}>
                            <HelpCircle size={14} />
                            <span>Ayuda</span>
                        </NavLink>
                    </div>
                )}
                {/* Footer — Grow Labs */}
                <div className={`py-3 text-center ${collapsed ? 'px-1' : 'px-4'}`}
                    style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    {collapsed ? (
                        <a href="https://www.growlabs.lat" target="_blank" rel="noopener noreferrer"
                            className="text-[8px] text-[#6B7280] hover:text-[#E53935] transition-colors font-mono">GL</a>
                    ) : (
                        <a href="https://www.growlabs.lat" target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-[#6B7280] hover:text-[#E53935] transition-colors font-mono">
                            Hecho por <span className="font-bold text-[#9CA3AF] hover:text-[#E53935]">Grow Labs</span>
                        </a>
                    )}
                </div>

                {/* Collapse Button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center justify-center py-3 text-[#6B7280] hover:text-white transition-colors"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
                >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </aside>

            {/* MAIN CONTENT */}
            <main className={`flex-1 transition-all duration-300 bg-[#FAFAFA] ${collapsed ? 'ml-16' : 'ml-56'}`}>
                <Outlet />
            </main>
        </div>
    );
}
