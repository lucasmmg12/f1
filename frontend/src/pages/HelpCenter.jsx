import { useState } from 'react';
import {
    HelpCircle, Gauge, Trophy, GitCompareArrows, Users, TrendingUp,
    Calendar, Newspaper, Youtube, FileImage, ChevronDown, ChevronRight,
    Zap, MousePointer, Info, CheckCircle2
} from 'lucide-react';

const XIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const HELP_SECTIONS = [
    {
        id: 'telemetry',
        icon: Gauge,
        title: 'Telemetría',
        color: '#E53935',
        subtitle: 'Comparar pilotos vuelta a vuelta',
        description: 'Compará la telemetría de dos pilotos en cualquier sesión de F1. Analizá velocidad, aceleración, frenada, marchas y posición en pista.',
        steps: [
            { step: '1', text: 'Seleccioná el año y el Gran Premio que querés analizar' },
            { step: '2', text: 'Elegí la sesión (Carrera, Clasificación o Práctica)' },
            { step: '3', text: 'Seleccioná los dos pilotos a comparar usando los selectores de piloto' },
            { step: '4', text: 'Elegí el modo de vuelta: "Fastest" (vuelta más rápida) o un número de vuelta específico' },
            { step: '5', text: 'Presioná "COMPARAR" para generar los gráficos de telemetría' },
        ],
        tips: [
            'Podés usar el botón "AI INSIGHT" después de comparar para obtener un análisis automático con inteligencia artificial',
            'El mapa de pista interactivo muestra la diferencia de velocidad entre pilotos en cada sector',
            'Los gráficos son interactivos: podés hacer zoom, pan y ver valores exactos al pasar el mouse',
        ],
    },
    {
        id: 'results',
        icon: Trophy,
        title: 'Resultados',
        color: '#E53935',
        subtitle: 'Clasificación y estrategia de carrera',
        description: 'Consultá los resultados completos de cualquier Gran Premio desde 2023. Incluye posiciones finales, vueltas más rápidas, paradas en boxes y estrategia de neumáticos.',
        steps: [
            { step: '1', text: 'Seleccioná el año con los botones de año (2023-2026)' },
            { step: '2', text: 'Hacé click en el Gran Premio que querés ver' },
            { step: '3', text: 'Elegí la sesión (Carrera, Clasificación, Sprint, etc.)' },
            { step: '4', text: 'Presioná "LOAD RESULTS" para cargar los datos' },
        ],
        tips: [
            'Los datos provienen directamente de la API oficial de FastF1',
            'Podés ver las estrategias de neumáticos de cada piloto',
            'Las paradas en boxes muestran la duración exacta de cada parada',
        ],
    },
    {
        id: 'cross-year',
        icon: GitCompareArrows,
        title: 'Comparar Años',
        color: '#F57C00',
        subtitle: 'Compará generaciones de coches',
        description: 'Compará cómo un mismo piloto rindió en el mismo circuito a lo largo de diferentes años. Ideal para ver la evolución tecnológica de los coches de F1.',
        steps: [
            { step: '1', text: 'Seleccioná el circuito del dropdown' },
            { step: '2', text: 'Elegí el piloto — el dropdown muestra su historial de equipos (ej: SAI en Ferrari 2021-2024, Williams 2025-2026)' },
            { step: '3', text: 'Seleccioná la sesión (Carrera, Clasificación o Práctica 1)' },
            { step: '4', text: 'Activá los años que querés comparar (mínimo 2)' },
            { step: '5', text: 'Presioná "COMPARAR AÑOS" para ver la telemetría superpuesta' },
        ],
        tips: [
            'El piloto debe haber participado en el circuito en los años seleccionados',
            'Es especialmente interesante comparar 2022 vs 2021 para ver el efecto del cambio de regulaciones',
            'Usá "AI INSIGHT" para un análisis automático de la evolución del rendimiento',
        ],
    },
    {
        id: 'teams',
        icon: Users,
        title: 'Escuderías',
        color: '#1565C0',
        subtitle: 'Comparar constructores',
        description: 'Compará el rendimiento de dos equipos/constructores en una misma carrera. Analizá las diferencias de velocidad, downforce y estrategia entre escuderías.',
        steps: [
            { step: '1', text: 'Seleccioná el año y el Gran Premio' },
            { step: '2', text: 'Elegí los dos equipos a comparar' },
            { step: '3', text: 'El sistema compara automáticamente los mejores pilotos de cada equipo' },
        ],
        tips: [
            'Útil para ver las diferencias filosóficas de diseño entre los equipos',
            'Compará equipos rivales directos como Ferrari vs McLaren o Red Bull vs Mercedes',
        ],
    },
    {
        id: 'trends',
        icon: TrendingUp,
        title: 'Tendencias',
        color: '#2E7D32',
        subtitle: 'Gráficos de evolución',
        description: 'Visualizá la evolución del rendimiento a lo largo de una temporada. Gráficos de posiciones, puntos acumulados y tiempos de vuelta por carrera.',
        steps: [
            { step: '1', text: 'Seleccioná el año de la temporada' },
            { step: '2', text: 'Elegí el tipo de gráfico (posiciones, puntos, tiempos)' },
            { step: '3', text: 'Los datos se cargan automáticamente' },
        ],
        tips: [
            'Ideal para ver la batalla por el campeonato a lo largo de la temporada',
            'Los gráficos son interactivos: podés ocultar/mostrar pilotos haciendo click en la leyenda',
        ],
    },
    {
        id: 'schedule',
        icon: Calendar,
        title: 'Calendario',
        color: '#6A1B9A',
        subtitle: 'Próximas carreras',
        description: 'Consultá el calendario completo de la temporada con cuenta regresiva en tiempo real. Incluye todas las sesiones: prácticas, clasificación, sprint y carrera.',
        steps: [
            { step: '1', text: 'Seleccioná el año arriba (2023-2026)' },
            { step: '2', text: 'Verás los próximos eventos con cuenta regresiva' },
            { step: '3', text: 'Hacé scroll para ver los eventos pasados' },
        ],
        tips: [
            'La cuenta regresiva se actualiza en tiempo real',
            'Cada evento muestra la bandera del país y las sesiones programadas',
        ],
    },
    {
        id: 'news',
        icon: Newspaper,
        title: 'Noticias',
        color: '#00695C',
        subtitle: 'F1 noticias en vivo',
        description: 'Agregador de noticias de más de 15 fuentes oficiales de F1 en español e inglés. Las noticias se actualizan automáticamente desde feeds RSS.',
        steps: [
            { step: '1', text: 'Las noticias se cargan automáticamente al entrar' },
            { step: '2', text: 'Usá los filtros para ver noticias de una fuente específica' },
            { step: '3', text: 'Usá el buscador para encontrar noticias por palabra clave' },
            { step: '4', text: 'Clickeá en una noticia para abrirla en la fuente original' },
        ],
        tips: [
            'Fuentes incluyen: Motorsport.com, ESPN F1, AS Motor, Marca Motor, F1.com y más',
            'Las noticias se ordenan por fecha (más recientes primero)',
        ],
    },
    {
        id: 'youtube',
        icon: Youtube,
        title: 'YouTube',
        color: '#FF0000',
        subtitle: 'Videos de F1',
        description: 'Hub de videos de Formula Zeta y otros canales de F1. Accedé rápidamente a los últimos videos, análisis y reacciones.',
        steps: [
            { step: '1', text: 'La pestaña principal muestra los videos más recientes de Formula Zeta' },
            { step: '2', text: 'Clickeá en una miniatura para ver el video en YouTube' },
            { step: '3', text: 'En "Canales F1" encontrás un directorio de canales de F1' },
            { step: '4', text: 'En "Pegar Video" podés embeber cualquier video de YouTube por URL' },
        ],
        tips: [
            'Los videos abren directamente en YouTube en una nueva pestaña',
            'El directorio de canales incluye canales oficiales y de fans',
        ],
    },
    {
        id: 'twitter',
        icon: XIcon,
        title: 'X / Twitter',
        color: '#000000',
        subtitle: 'Tweets de F1',
        description: 'Directorio de cuentas oficiales de F1 en X/Twitter. Seguí a pilotos, equipos, periodistas y la FIA. Accedé a trending topics y búsquedas rápidas.',
        steps: [
            { step: '1', text: 'Seleccioná una cuenta de la lista izquierda para ver su perfil' },
            { step: '2', text: 'Usá los filtros de categoría (Oficial, Equipos, Pilotos, Media)' },
            { step: '3', text: 'Clickeá en hashtags trending para buscar en X directamente' },
            { step: '4', text: 'Usá las búsquedas rápidas para encontrar temas específicos' },
        ],
        tips: [
            'Los hashtags más populares se actualizan manualmente con los trending de cada GP',
            'La búsqueda abre X directamente con los resultados filtrados',
            'Clickeá "Abrir en X" para ir al perfil completo de cualquier cuenta',
        ],
    },
    {
        id: 'reports',
        icon: FileImage,
        title: 'Reportes',
        color: '#37474F',
        subtitle: 'Exportar PNG',
        description: 'Generá reportes visuales en formato PNG de cualquier análisis. Ideal para compartir en redes sociales o guardar como referencia.',
        steps: [
            { step: '1', text: 'Primero realizá un análisis en Telemetría o Comparar Años' },
            { step: '2', text: 'Andá a la sección Reportes' },
            { step: '3', text: 'Seleccioná el formato y presioná "Exportar"' },
        ],
        tips: [
            'Los reportes incluyen gráficos de telemetría y mapa de pista',
            'Ideal para compartir análisis en Instagram, Twitter o foros de F1',
        ],
    },
];

function AccordionItem({ section, isOpen, onToggle }) {
    const Icon = section.icon;
    return (
        <div className={`glass-card !p-0 overflow-hidden transition-all ${isOpen ? '!border-accent-primary/40 shadow-sm' : ''}`}>
            <button onClick={onToggle}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50/50 transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: section.color + '12', border: `2px solid ${section.color}30` }}>
                    <Icon size={18} style={{ color: section.color }} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-text-heading">{section.title}</h3>
                    <p className="text-[10px] text-text-muted">{section.subtitle}</p>
                </div>
                {isOpen ? <ChevronDown size={16} className="text-accent-primary" /> : <ChevronRight size={16} className="text-text-muted" />}
            </button>

            {isOpen && (
                <div className="px-4 pb-4 border-t border-border-light/50">
                    {/* Description */}
                    <p className="text-[12px] text-text-body leading-relaxed mt-3 mb-4">{section.description}</p>

                    {/* Steps */}
                    <div className="mb-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <MousePointer size={12} className="text-accent-primary" />
                            <span className="text-[10px] uppercase tracking-widest text-text-heading font-bold">Cómo usar</span>
                        </div>
                        <div className="space-y-1.5">
                            {section.steps.map((s, i) => (
                                <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-gray-50/80">
                                    <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
                                        style={{ backgroundColor: section.color }}>
                                        {s.step}
                                    </span>
                                    <span className="text-[11px] text-text-body leading-relaxed">{s.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tips */}
                    <div>
                        <div className="flex items-center gap-1.5 mb-2">
                            <Zap size={12} className="text-[#FF6F00]" />
                            <span className="text-[10px] uppercase tracking-widest text-text-heading font-bold">Tips</span>
                        </div>
                        <div className="space-y-1">
                            {section.tips.map((tip, i) => (
                                <div key={i} className="flex items-start gap-2 px-3 py-1.5">
                                    <CheckCircle2 size={11} className="text-green-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-[11px] text-text-muted leading-relaxed">{tip}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function HelpCenter() {
    const [openSection, setOpenSection] = useState('telemetry');

    return (
        <div className="px-8 py-6 min-h-screen">
            <header className="page-header">
                <div className="flex items-center gap-3">
                    <HelpCircle className="text-accent-primary" size={24} />
                    <h1>CENTRO DE AYUDA</h1>
                </div>
                <span className="text-[10px] font-mono text-text-muted">Guía completa de Formula Zeta Analyzer</span>
            </header>

            {/* Quick intro */}
            <div className="glass-card !p-5 mb-6 !border-accent-primary/20">
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-accent-primary/10 flex-shrink-0">
                        <img src="/channels4_profile.jpg" alt="FZ" className="w-10 h-10 rounded-lg object-cover" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-text-heading mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Bienvenido a Formula Zeta Analyzer v2.0
                        </h2>
                        <p className="text-[12px] text-text-body leading-relaxed">
                            Esta herramienta te permite analizar telemetría, resultados, estrategias y tendencias de la Fórmula 1
                            desde 2018 hasta 2026. Seleccioná cualquier sección de abajo para aprender cómo usarla.
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                                <Info size={10} className="text-[#1D9BF0]" />
                                {HELP_SECTIONS.length} secciones disponibles
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                                <Zap size={10} className="text-[#FF6F00]" />
                                Datos desde temporada 2018
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sections */}
            <div className="space-y-2">
                {HELP_SECTIONS.map(section => (
                    <AccordionItem
                        key={section.id}
                        section={section}
                        isOpen={openSection === section.id}
                        onToggle={() => setOpenSection(openSection === section.id ? null : section.id)}
                    />
                ))}
            </div>

            {/* Footer */}
            <div className="text-center mt-8 py-4">
                <p className="text-[11px] text-text-muted">
                    ¿Tenés dudas o sugerencias? Contactanos en{' '}
                    <a href="https://www.instagram.com/formulazeta.ok/" target="_blank" rel="noopener noreferrer"
                        className="text-accent-primary font-bold hover:underline">@formulazeta.ok</a>
                </p>
            </div>
        </div>
    );
}
