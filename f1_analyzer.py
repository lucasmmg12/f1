import os
import numpy as np
import pandas as pd
import fastf1
import fastf1.plotting
from fastf1 import utils
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# Paleta de colores para N pilotos (GrowLabs Ultra-Dark)
DRIVER_COLORS = [
    '#00FF88',  # Neon Green
    '#00D1FF',  # Glacial Cyan
    '#FF3131',  # Electric Red
    '#FACC15',  # Cyber Amber
    '#A855F7',  # Purple
    '#F97316',  # Orange
    '#EC4899',  # Pink
    '#14B8A6',  # Teal
    '#8B5CF6',  # Violet
    '#06B6D4',  # Cyan alt
]

class F1PerformanceAnalyzer:
    """
    Clase principal para analizar la telemetría de Fórmula 1.
    Soporta comparaciones entre N pilotos y filtrado por vueltas.
    """
    def __init__(self, cache_dir: str = "f1_cache"):
        self.cache_dir = cache_dir
        if not os.path.exists(self.cache_dir):
            os.makedirs(self.cache_dir)
        fastf1.Cache.enable_cache(self.cache_dir)
        try:
            fastf1.plotting.setup_mpl(misc_mpl_mods=False, color_scheme='fastf1')
        except Exception:
            pass
        self.session = None

    def load_session(self, year: int, track, event_type: str = 'R') -> None:
        print(f"Cargando sesión: {year} - Evento: {track} - Tipo: {event_type}")
        self.session = fastf1.get_session(year, track, event_type)
        self.session.load(telemetry=True, weather=False, messages=False)

    def get_session_laps_info(self) -> dict:
        """Devuelve info sobre las vueltas disponibles para la sesión actual."""
        if self.session is None:
            return {"total_laps": 0, "drivers": []}
        
        laps = self.session.laps
        total_laps = int(laps['LapNumber'].max()) if len(laps) > 0 else 0
        
        drivers_info = []
        results = self.session.results
        if results is not None and len(results) > 0:
            for _, drv in results.iterrows():
                abbr = str(drv.get('Abbreviation', ''))
                if abbr:
                    drv_laps = laps.pick_driver(abbr)
                    lap_numbers = sorted(drv_laps['LapNumber'].dropna().astype(int).tolist())
                    drivers_info.append({
                        "abbreviation": abbr,
                        "full_name": str(drv.get('FullName', abbr)),
                        "team": str(drv.get('TeamName', '')),
                        "total_laps": len(lap_numbers),
                        "lap_numbers": lap_numbers
                    })
        
        return {
            "total_laps": total_laps,
            "drivers": drivers_info
        }

    def get_driver_lap(self, driver: str, lap_mode: str = "fastest",
                       lap_number: int = None, lap_start: int = None, lap_end: int = None):
        """
        Obtiene la vuelta o telemetría según el modo:
        - "fastest": vuelta más rápida
        - "specific": vuelta específica por número
        - "range": rango de vueltas (concatena telemetría)
        - "all": todas las vueltas de la sesión
        """
        laps = self.session.laps.pick_driver(driver)
        
        if lap_mode == "fastest":
            lap = laps.pick_fastest()
            tel = lap.get_telemetry().add_distance()
            return lap, tel
        
        elif lap_mode == "specific" and lap_number is not None:
            lap = laps[laps['LapNumber'] == lap_number].iloc[0]
            tel = lap.get_telemetry().add_distance()
            return lap, tel
        
        elif lap_mode == "range" and lap_start is not None and lap_end is not None:
            range_laps = laps[(laps['LapNumber'] >= lap_start) & (laps['LapNumber'] <= lap_end)]
            if len(range_laps) == 0:
                raise ValueError(f"No laps found for {driver} in range {lap_start}-{lap_end}")
            # Concatenar telemetría de todas las vueltas en el rango
            all_tel = []
            cumulative_dist = 0
            for _, l in range_laps.iterrows():
                try:
                    t = l.get_telemetry().add_distance()
                    t = t.copy()
                    t['Distance'] = t['Distance'] + cumulative_dist
                    all_tel.append(t)
                    cumulative_dist = t['Distance'].max()
                except Exception:
                    continue
            if not all_tel:
                raise ValueError(f"No telemetry data for {driver}")
            combined_tel = pd.concat(all_tel, ignore_index=True)
            return range_laps.iloc[0], combined_tel
        
        elif lap_mode == "all":
            all_tel = []
            cumulative_dist = 0
            for _, l in laps.iterrows():
                try:
                    t = l.get_telemetry().add_distance()
                    t = t.copy()
                    t['Distance'] = t['Distance'] + cumulative_dist
                    all_tel.append(t)
                    cumulative_dist = t['Distance'].max()
                except Exception:
                    continue
            if not all_tel:
                raise ValueError(f"No telemetry data for {driver}")
            combined_tel = pd.concat(all_tel, ignore_index=True)
            return laps.iloc[0], combined_tel
        
        else:
            # Default: fastest
            lap = laps.pick_fastest()
            tel = lap.get_telemetry().add_distance()
            return lap, tel

    def compare_drivers(self, drivers: list[str], lap_mode: str = "fastest",
                        lap_number: int = None, lap_start: int = None, lap_end: int = None) -> dict:
        """
        Compara N pilotos con filtrado flexible de vueltas.
        """
        if self.session is None:
            raise ValueError("Primero debes cargar una sesión con load_session()")
        
        results = {}
        for i, drv in enumerate(drivers):
            lap, tel = self.get_driver_lap(drv, lap_mode, lap_number, lap_start, lap_end)
            color = DRIVER_COLORS[i % len(DRIVER_COLORS)]
            
            # Intentar obtener color oficial del equipo
            try:
                color = fastf1.plotting.get_driver_color(drv, self.session)
            except Exception:
                pass
            
            # Calcular LapTime
            try:
                lt = lap['LapTime']
                total_sec = lt.total_seconds()
                mins = int(total_sec // 60)
                secs = total_sec % 60
                lap_time_str = f"{mins}:{secs:06.3f}"
            except Exception:
                lap_time_str = "N/A"
            
            results[drv] = {
                "lap": lap,
                "telemetry": tel,
                "color": color,
                "lap_time": lap_time_str,
                "index": i
            }
        
        return results

    def plot_telemetry_multi(self, comp_data: dict, show: bool = False) -> go.Figure:
        """
        Genera gráfico interactivo multieje para N pilotos.
        Incluye Delta Time (ganancia/pérdida acumulada) como 5to subplot.
        """
        drivers = list(comp_data.keys())
        
        fig = make_subplots(
            rows=5, cols=1,
            shared_xaxes=True,
            vertical_spacing=0.03,
            row_heights=[0.35, 0.18, 0.12, 0.12, 0.10],
            subplot_titles=("Velocidad (km/h)", "Delta Time (s)", "Acelerador (%)", "Freno", "DRS")
        )

        # Compute time delta between drivers using distance-based interpolation
        ref_drv = drivers[0]
        ref_tel = comp_data[ref_drv]["telemetry"]
        ref_dist = ref_tel['Distance'].values
        ref_speed = ref_tel['Speed'].values
        
        # Calculate cumulative time for reference driver
        ref_time = np.zeros(len(ref_dist))
        for i in range(1, len(ref_dist)):
            ds = ref_dist[i] - ref_dist[i-1]
            avg_speed = (ref_speed[i] + ref_speed[i-1]) / 2.0
            if avg_speed > 0:
                ref_time[i] = ref_time[i-1] + (ds / (avg_speed / 3.6))
            else:
                ref_time[i] = ref_time[i-1]

        for drv in drivers:
            d = comp_data[drv]
            tel = d["telemetry"]
            color = d["color"]
            
            # Velocidad (use Scatter not ScatterGL for hover events)
            fig.add_trace(go.Scatter(
                x=tel['Distance'], y=tel['Speed'],
                name=f'{drv}', line=dict(color=color, width=2),
                legendgroup=drv, hovertemplate='%{y:.0f} km/h<extra>' + drv + '</extra>'
            ), row=1, col=1)
            
            # Delta Time
            drv_dist = tel['Distance'].values
            drv_speed = tel['Speed'].values
            drv_time = np.zeros(len(drv_dist))
            for i in range(1, len(drv_dist)):
                ds = drv_dist[i] - drv_dist[i-1]
                avg_s = (drv_speed[i] + drv_speed[i-1]) / 2.0
                if avg_s > 0:
                    drv_time[i] = drv_time[i-1] + (ds / (avg_s / 3.6))
                else:
                    drv_time[i] = drv_time[i-1]
            
            # Interpolate reference time at driver distances
            ref_time_interp = np.interp(drv_dist, ref_dist, ref_time)
            delta = drv_time - ref_time_interp  # positive = slower than ref

            fig.add_trace(go.Scatter(
                x=tel['Distance'], y=delta,
                name=f'{drv} Δ', line=dict(color=color, width=2),
                showlegend=False, legendgroup=drv,
                fill='tozeroy' if drv != ref_drv else None,
                fillcolor=f'rgba({int(color.lstrip("#")[0:2], 16)},{int(color.lstrip("#")[2:4], 16)},{int(color.lstrip("#")[4:6], 16)},0.1)' if drv != ref_drv else None,
                hovertemplate='%{y:+.3f}s<extra>' + drv + '</extra>'
            ), row=2, col=1)
            
            # Acelerador
            fig.add_trace(go.Scatter(
                x=tel['Distance'], y=tel['Throttle'],
                name=f'{drv} Throttle', line=dict(color=color, width=1.5),
                showlegend=False, legendgroup=drv,
                hovertemplate='%{y:.0f}%<extra>' + drv + '</extra>'
            ), row=3, col=1)
            
            # Freno
            fig.add_trace(go.Scatter(
                x=tel['Distance'], y=tel['Brake'].astype(int),
                name=f'{drv} Brake', line=dict(color=color, width=1.5),
                showlegend=False, legendgroup=drv
            ), row=4, col=1)
            
            # DRS
            fig.add_trace(go.Scatter(
                x=tel['Distance'], y=tel['DRS'],
                name=f'{drv} DRS', line=dict(color=color, width=1.5),
                showlegend=False, legendgroup=drv
            ), row=5, col=1)

        # Zero line for delta
        fig.add_hline(y=0, row=2, col=1, line=dict(color='rgba(255,255,255,0.3)', width=1, dash='dot'))

        fig.update_layout(
            template="plotly_dark",
            height=1000,
            hovermode="x unified",
            font=dict(family="JetBrains Mono, monospace", color="#FFFFFF", size=11),
            hoverlabel=dict(
                bgcolor="rgba(0, 0, 0, 0.92)",
                font_size=12,
                font_family="JetBrains Mono, monospace",
                font_color="#FFFFFF",
                bordercolor="rgba(255, 255, 255, 0.15)"
            ),
            legend=dict(
                bgcolor="rgba(0, 0, 0, 0.5)",
                bordercolor="rgba(255, 255, 255, 0.1)",
                font=dict(color="#FFFFFF", size=12),
                orientation="h",
                yanchor="bottom", y=1.02, xanchor="left", x=0
            ),
            margin=dict(l=60, r=20, t=40, b=30)
        )

        fig.update_yaxes(title_text="km/h", row=1, col=1)
        fig.update_yaxes(title_text="Δ sec", row=2, col=1, zeroline=True, zerolinecolor='rgba(255,255,255,0.2)')
        fig.update_yaxes(title_text="%", row=3, col=1)
        fig.update_yaxes(title_text="On/Off", row=4, col=1)
        fig.update_yaxes(title_text="DRS", row=5, col=1)
        fig.update_xaxes(title_text="Distancia (m)", row=5, col=1)

        if show:
            fig.show()
        return fig

    def plot_track_map(self, driver: str, lap_mode: str = "fastest",
                       lap_number: int = None, show: bool = False) -> go.Figure:
        """
        Genera un Track Map mejorado con línea continua y gradiente de velocidad.
        """
        if self.session is None:
            raise ValueError("Primero debes cargar una sesión con load_session()")
        
        lap, tel = self.get_driver_lap(driver, lap_mode, lap_number)
        
        x = tel['X'].values
        y = tel['Y'].values
        speed = tel['Speed'].values

        fig = go.Figure()

        # Crear segmentos de línea coloreados por velocidad
        # Usamos muchos segmentos cortos para simular un gradiente continuo
        n_points = len(x)
        step = max(1, n_points // 300)  # ~300 segmentos para rendimiento
        
        for i in range(0, n_points - step, step):
            end = min(i + step + 1, n_points)
            seg_speed = np.mean(speed[i:end])
            
            fig.add_trace(go.Scattergl(
                x=x[i:end], y=y[i:end],
                mode='lines',
                line=dict(
                    width=5,
                    color=self._speed_to_color(seg_speed, speed.min(), speed.max())
                ),
                showlegend=False,
                hoverinfo='text',
                hovertext=f'{seg_speed:.0f} km/h'
            ))

        # Colorbar falsa con scatter invisible
        fig.add_trace(go.Scatter(
            x=[None], y=[None], mode='markers',
            marker=dict(
                size=0.1,
                color=[speed.min(), speed.max()],
                colorscale='Turbo',
                colorbar=dict(
                    title=dict(text="km/h", font=dict(color="#FFFFFF", size=12)),
                    tickfont=dict(color="#9CA3AF", size=10, family="JetBrains Mono"),
                    bgcolor="rgba(0,0,0,0.3)",
                    bordercolor="rgba(255,255,255,0.1)",
                    thickness=15, len=0.8
                ),
                showscale=True
            ),
            showlegend=False
        ))

        fig.update_layout(
            template="plotly_dark",
            xaxis=dict(scaleanchor="y", scaleratio=1, showgrid=False, zeroline=False,
                       showticklabels=False, showline=False),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False, showline=False),
            font=dict(family="JetBrains Mono, monospace", color="#FFFFFF"),
            margin=dict(l=0, r=40, t=10, b=0),
            hoverlabel=dict(
                bgcolor="rgba(0, 0, 0, 0.9)", font_color="#FFFFFF",
                font_family="JetBrains Mono", font_size=12
            )
        )

        if show:
            fig.show()
        return fig

    @staticmethod
    def _speed_to_color(speed: float, min_speed: float, max_speed: float) -> str:
        """Mapea velocidad a un color del colormap Turbo (rojo→amarillo→verde→azul)."""
        if max_speed == min_speed:
            t = 0.5
        else:
            t = (speed - min_speed) / (max_speed - min_speed)
        
        # Turbo colormap aproximado
        turbo_colors = [
            (0.0, (48, 18, 59)),     # Azul oscuro (lento)
            (0.15, (68, 81, 191)),
            (0.25, (33, 145, 140)),   # Teal
            (0.4, (53, 183, 121)),    # Verde
            (0.55, (144, 215, 67)),   # Verde claro
            (0.7, (220, 200, 35)),    # Amarillo
            (0.85, (253, 141, 33)),   # Naranja
            (1.0, (165, 0, 38)),      # Rojo (rápido)
        ]
        
        # Interpolar
        for i in range(len(turbo_colors) - 1):
            t1, c1 = turbo_colors[i]
            t2, c2 = turbo_colors[i + 1]
            if t1 <= t <= t2:
                frac = (t - t1) / (t2 - t1) if t2 != t1 else 0
                r = int(c1[0] + frac * (c2[0] - c1[0]))
                g = int(c1[1] + frac * (c2[1] - c1[1]))
                b = int(c1[2] + frac * (c2[2] - c1[2]))
                return f'rgb({r},{g},{b})'
        
        return f'rgb({turbo_colors[-1][1][0]},{turbo_colors[-1][1][1]},{turbo_colors[-1][1][2]})'
