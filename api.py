from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import fastf1
import numpy as np
import asyncio
from pydantic import BaseModel
from f1_analyzer import F1PerformanceAnalyzer
from ai_analyzer import analyze_telemetry_comparison, analyze_race_strategy, analyze_qualifying_performance
from db import save_ai_analysis, get_cached_analysis, save_session_info
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="F1 Telemetry API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = F1PerformanceAnalyzer(cache_dir="f1_cache")

# ============================================================
# MODELOS
# ============================================================
class DriverInfo(BaseModel):
    abbreviation: str
    full_name: str
    team: str

class EventInfo(BaseModel):
    round_number: int
    event_name: str
    country: str
    location: str
    event_date: str
    sessions: list[str]

# Fallback grids
F1_GRID = [
    DriverInfo(abbreviation="VER", full_name="Max Verstappen", team="Red Bull Racing"),
    DriverInfo(abbreviation="LAW", full_name="Liam Lawson", team="Red Bull Racing"),
    DriverInfo(abbreviation="HAM", full_name="Lewis Hamilton", team="Ferrari"),
    DriverInfo(abbreviation="LEC", full_name="Charles Leclerc", team="Ferrari"),
    DriverInfo(abbreviation="NOR", full_name="Lando Norris", team="McLaren"),
    DriverInfo(abbreviation="PIA", full_name="Oscar Piastri", team="McLaren"),
    DriverInfo(abbreviation="RUS", full_name="George Russell", team="Mercedes"),
    DriverInfo(abbreviation="ANT", full_name="Kimi Antonelli", team="Mercedes"),
    DriverInfo(abbreviation="ALO", full_name="Fernando Alonso", team="Aston Martin"),
    DriverInfo(abbreviation="STR", full_name="Lance Stroll", team="Aston Martin"),
    DriverInfo(abbreviation="GAS", full_name="Pierre Gasly", team="Alpine"),
    DriverInfo(abbreviation="DOO", full_name="Jack Doohan", team="Alpine"),
    DriverInfo(abbreviation="TSU", full_name="Yuki Tsunoda", team="Racing Bulls"),
    DriverInfo(abbreviation="HAD", full_name="Isack Hadjar", team="Racing Bulls"),
    DriverInfo(abbreviation="HUL", full_name="Nico Hulkenberg", team="Sauber"),
    DriverInfo(abbreviation="BOR", full_name="Gabriel Bortoleto", team="Sauber"),
    DriverInfo(abbreviation="ALB", full_name="Alexander Albon", team="Williams"),
    DriverInfo(abbreviation="SAI", full_name="Carlos Sainz", team="Williams"),
    DriverInfo(abbreviation="OCO", full_name="Esteban Ocon", team="Haas"),
    DriverInfo(abbreviation="BEA", full_name="Oliver Bearman", team="Haas"),
]

FALLBACK_GRIDS = {2025: F1_GRID, 2026: F1_GRID}

# ============================================================
# ENDPOINTS
# ============================================================

@app.get("/api/schedule")
def get_schedule(year: int = Query(2025)):
    try:
        schedule = fastf1.get_event_schedule(year)
        events = []
        for _, row in schedule.iterrows():
            round_num = int(row.get('RoundNumber', 0))
            if round_num == 0:
                continue
            sessions_available = []
            for s_name in ['Session1', 'Session2', 'Session3', 'Session4', 'Session5']:
                s_val = row.get(s_name, '')
                if s_val and str(s_val).strip() and str(s_val) != 'nan':
                    sessions_available.append(str(s_val))
            event_date_raw = row.get('EventDate', '')
            event_date = str(event_date_raw).split(' ')[0] if event_date_raw else ''
            events.append(EventInfo(
                round_number=round_num,
                event_name=str(row.get('EventName', f'Round {round_num}')),
                country=str(row.get('Country', '')),
                location=str(row.get('Location', '')),
                event_date=event_date,
                sessions=sessions_available
            ))
        return {"year": year, "events": events}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/drivers")
def get_drivers(year: int = Query(2024), track: int = Query(1), event_type: str = Query('R')):
    try:
        session = fastf1.get_session(year, track, event_type)
        session.load(telemetry=False, weather=False, messages=False)
        drivers = []
        results = session.results
        if results is not None and len(results) > 0:
            for _, drv in results.iterrows():
                abbr = str(drv.get('Abbreviation', ''))
                if abbr and abbr != '':
                    drivers.append(DriverInfo(
                        abbreviation=abbr,
                        full_name=str(drv.get('FullName', abbr)),
                        team=str(drv.get('TeamName', 'Unknown'))
                    ))
            # Guardar en Supabase
            try:
                event_name = str(session.event.get('EventName', ''))
                save_session_info(year, track, event_type, event_name,
                                  [d.model_dump() for d in drivers])
            except Exception:
                pass

        if len(drivers) == 0 and year in FALLBACK_GRIDS:
            return {"drivers": FALLBACK_GRIDS[year], "source": "fallback"}
        return {"drivers": drivers, "source": "session"}
    except Exception:
        if year in FALLBACK_GRIDS:
            return {"drivers": FALLBACK_GRIDS[year], "source": "fallback"}
        raise


@app.get("/api/laps")
def get_laps_info(year: int = Query(2024), track: int = Query(1), event_type: str = Query('R')):
    try:
        analyzer.load_session(year=year, track=track, event_type=event_type)
        return analyzer.get_session_laps_info()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _extract_driver_stats(telemetry_df) -> dict:
    """Extrae estadísticas clave de un DataFrame de telemetría."""
    try:
        speed = telemetry_df['Speed']
        throttle = telemetry_df['Throttle']
        brake = telemetry_df['Brake']
        drs = telemetry_df['DRS']
        
        return {
            "top_speed": int(speed.max()),
            "avg_speed": int(speed.mean()),
            "min_corner_speed": int(speed.min()),
            "full_throttle_pct": round(float((throttle > 95).sum() / len(throttle) * 100), 1),
            "braking_pct": round(float(brake.astype(bool).sum() / len(brake) * 100), 1),
            "drs_activations": int((drs > 10).sum()),
        }
    except Exception:
        return {}


@app.get("/api/analyze")
def analyze_telemetry(
    drivers: str = Query(...),
    year: int = Query(2024),
    track: int = Query(1),
    event_type: str = Query('R'),
    lap_mode: str = Query('fastest'),
    lap_number: Optional[int] = Query(None),
    lap_start: Optional[int] = Query(None),
    lap_end: Optional[int] = Query(None),
    track_map_driver: Optional[str] = Query(None)
):
    try:
        try:
            analyzer.load_session(year=year, track=track, event_type=event_type)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to load session: {e}")

        driver_list = [d.strip().upper() for d in drivers.split(',') if d.strip()]
        if len(driver_list) < 1:
            raise HTTPException(status_code=400, detail="At least 1 driver required")

        comp_data = analyzer.compare_drivers(
            driver_list, lap_mode=lap_mode,
            lap_number=lap_number, lap_start=lap_start, lap_end=lap_end
        )

        fig_telemetry = analyzer.plot_telemetry_multi(comp_data, show=False)
        bg_t = dict(plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)")
        fig_telemetry.update_layout(**bg_t)

        map_driver = track_map_driver or driver_list[0]
        map_lap_mode = lap_mode if lap_mode in ("fastest", "specific") else "fastest"
        fig_map = analyzer.plot_track_map(map_driver, lap_mode=map_lap_mode, lap_number=lap_number, show=False)
        fig_map.update_layout(plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)")

        # Extraer lap times y stats
        lap_times = {}
        driver_stats = {}
        for drv in driver_list:
            lap_times[drv] = comp_data[drv]["lap_time"]
            driver_stats[drv] = _extract_driver_stats(comp_data[drv]["telemetry"])
            driver_stats[drv]["lap_time"] = comp_data[drv]["lap_time"]

        # Track coordinates for interactive map
        track_coords = None
        try:
            map_drv = track_map_driver or driver_list[0]
            map_lm = lap_mode if lap_mode in ("fastest", "specific") else "fastest"
            _, map_tel = analyzer.get_driver_lap(map_drv, lap_mode=map_lm, lap_number=lap_number)
            # Downsample to ~500 points for performance
            step = max(1, len(map_tel) // 500)
            track_coords = {
                "x": map_tel['X'].values[::step].tolist(),
                "y": map_tel['Y'].values[::step].tolist(),
                "distance": map_tel['Distance'].values[::step].tolist(),
                "speed": map_tel['Speed'].values[::step].tolist(),
            }
        except Exception as e:
            print(f"Track coords error: {e}")

        return {
            "drivers": driver_list,
            "lap_times": lap_times,
            "driver_stats": driver_stats,
            "lap_mode": lap_mode,
            "telemetry_figure_json": fig_telemetry.to_json(),
            "track_map_figure_json": fig_map.to_json(),
            "track_coords": track_coords
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/race-results")
async def get_race_results(
    year: int = Query(2025),
    track: int = Query(1),
    event_type: str = Query('R')
):
    """Returns full race results: classification, fastest laps, pit stops."""
    def _do():
        a = F1PerformanceAnalyzer()
        a.load_session(year=year, track=track, event_type=event_type)
        session = a.session
        results_df = session.results
        laps_df = session.laps

        event_name = str(session.event.get('EventName', f'Round {track}'))
        circuit = str(session.event.get('Location', ''))
        total_laps = int(laps_df['LapNumber'].max()) if len(laps_df) > 0 else 0

        # TEAM COLORS
        TCOLORS = {
            'Red Bull Racing': '#3671C6', 'McLaren': '#FF8000', 'Ferrari': '#E8002D',
            'Mercedes': '#27F4D2', 'Aston Martin': '#229971', 'Alpine': '#FF87BC',
            'Williams': '#64C4FF', 'RB': '#6692FF', 'Haas F1 Team': '#B6BABD',
            'Sauber': '#52E252', 'Kick Sauber': '#52E252', 'Audi': '#E00400',
            'Cadillac F1 Team': '#FFD700',
        }

        # 1. Classification
        classification = []
        if results_df is not None and len(results_df) > 0:
            for _, row in results_df.iterrows():
                try:
                    pos = row.get('Position', None)
                    pos = int(pos) if pos and str(pos) != 'nan' else None
                    status = str(row.get('Status', ''))
                    abbr = str(row.get('Abbreviation', ''))
                    full_name = str(row.get('FullName', abbr))
                    team = str(row.get('TeamName', ''))
                    number = str(row.get('DriverNumber', ''))
                    points = float(row.get('Points', 0)) if str(row.get('Points', '')) != 'nan' else 0
                    grid_pos = int(row.get('GridPosition', 0)) if str(row.get('GridPosition', '')) != 'nan' else 0

                    # Time
                    time_val = row.get('Time', None)
                    time_str = ''
                    gap_str = ''
                    if time_val and str(time_val) != 'NaT' and str(time_val) != 'nan':
                        try:
                            ts = time_val.total_seconds()
                            if pos == 1 or pos is None:
                                hrs = int(ts // 3600)
                                mins = int((ts % 3600) // 60)
                                secs = ts % 60
                                time_str = f"{hrs}:{mins:02d}'{secs:06.3f}"
                            else:
                                gap_str = f"+{ts:.3f}"
                                time_str = gap_str
                        except:
                            time_str = str(time_val)
                    elif 'Lap' in status or 'DNF' in status.upper() or 'Retired' in status:
                        time_str = status

                    # Fastest lap
                    fl_time_str = ''
                    try:
                        drv_laps = laps_df[laps_df['Driver'] == abbr]
                        if len(drv_laps) > 0:
                            fastest = drv_laps.loc[drv_laps['LapTime'].idxmin()]
                            fl_ts = fastest['LapTime'].total_seconds()
                            fl_m = int(fl_ts // 60)
                            fl_s = fl_ts % 60
                            fl_time_str = f"{fl_m}:{fl_s:06.3f}"
                    except:
                        pass

                    classification.append({
                        'position': pos if pos else 'DNF',
                        'abbreviation': abbr,
                        'full_name': full_name,
                        'team': team,
                        'team_color': TCOLORS.get(team, '#FFFFFF'),
                        'number': number,
                        'laps': int(row.get('NumberOfLaps', 0)) if str(row.get('NumberOfLaps', '')) != 'nan' else 0,
                        'time': time_str,
                        'status': status,
                        'points': int(points),
                        'grid_position': grid_pos,
                        'positions_gained': grid_pos - pos if pos and grid_pos else 0,
                        'fastest_lap': fl_time_str,
                    })
                except Exception as ex:
                    print(f"Result row error: {ex}")

        # 2. Fastest Laps ranking
        fastest_laps = []
        try:
            for drv in laps_df['Driver'].unique():
                drv_laps = laps_df[laps_df['Driver'] == drv].dropna(subset=['LapTime'])
                if len(drv_laps) == 0:
                    continue
                best_idx = drv_laps['LapTime'].idxmin()
                best = drv_laps.loc[best_idx]
                ts = best['LapTime'].total_seconds()
                m = int(ts // 60)
                s = ts % 60
                team = str(best.get('Team', ''))
                fastest_laps.append({
                    'abbreviation': drv,
                    'team': team,
                    'team_color': TCOLORS.get(team, '#FFFFFF'),
                    'time': f"{m}:{s:06.3f}",
                    'time_seconds': ts,
                    'lap_number': int(best['LapNumber']),
                })
            fastest_laps.sort(key=lambda x: x['time_seconds'])
            # Add gap to fastest
            if fastest_laps:
                best_time = fastest_laps[0]['time_seconds']
                for i, fl in enumerate(fastest_laps):
                    fl['rank'] = i + 1
                    fl['gap'] = f"+{fl['time_seconds'] - best_time:.3f}" if i > 0 else ''
        except Exception as ex:
            print(f"Fastest laps error: {ex}")

        # 3. Pit stops (from laps data)
        pit_stops = []
        try:
            pit_laps = laps_df[laps_df['PitInTime'].notna() | laps_df['PitOutTime'].notna()]
            for drv in pit_laps['Driver'].unique():
                drv_pits = pit_laps[pit_laps['Driver'] == drv].sort_values('LapNumber')
                stop_num = 1
                for _, pit in drv_pits.iterrows():
                    try:
                        pit_dur = pit.get('PitOutTime', None)
                        pit_in = pit.get('PitInTime', None)
                        duration_str = ''
                        if pit_dur and pit_in and str(pit_dur) != 'NaT' and str(pit_in) != 'NaT':
                            dur = (pit_dur - pit_in).total_seconds()
                            if 0 < dur < 120:
                                duration_str = f"{dur:.3f}s"
                        team = str(pit.get('Team', ''))
                        pit_stops.append({
                            'abbreviation': drv,
                            'team': team,
                            'team_color': TCOLORS.get(team, '#FFFFFF'),
                            'stop_number': stop_num,
                            'lap': int(pit['LapNumber']),
                            'duration': duration_str,
                            'compound': str(pit.get('Compound', '')),
                        })
                        stop_num += 1
                    except:
                        pass
            pit_stops.sort(key=lambda x: (x['abbreviation'], x['stop_number']))
        except Exception as ex:
            print(f"Pit stops error: {ex}")

        # 4. Tire strategy
        tire_stints = []
        try:
            for drv in laps_df['Driver'].unique():
                drv_laps = laps_df[laps_df['Driver'] == drv].sort_values('LapNumber')
                if len(drv_laps) == 0:
                    continue
                stints = []
                current_compound = None
                stint_start = 0
                for _, lap in drv_laps.iterrows():
                    compound = str(lap.get('Compound', 'UNKNOWN'))
                    if compound != current_compound:
                        if current_compound:
                            stints.append({
                                'compound': current_compound,
                                'start_lap': stint_start,
                                'end_lap': int(lap['LapNumber']) - 1,
                                'laps': int(lap['LapNumber']) - 1 - stint_start,
                            })
                        current_compound = compound
                        stint_start = int(lap['LapNumber'])
                if current_compound:
                    stints.append({
                        'compound': current_compound,
                        'start_lap': stint_start,
                        'end_lap': int(drv_laps.iloc[-1]['LapNumber']),
                        'laps': int(drv_laps.iloc[-1]['LapNumber']) - stint_start + 1,
                    })
                team = str(drv_laps.iloc[0].get('Team', ''))
                tire_stints.append({
                    'abbreviation': drv,
                    'team': team,
                    'team_color': TCOLORS.get(team, '#FFFFFF'),
                    'stints': stints,
                })
        except Exception as ex:
            print(f"Tire stints error: {ex}")

        return {
            'event_name': event_name,
            'circuit': circuit,
            'year': year,
            'session_type': event_type,
            'total_laps': total_laps,
            'classification': classification,
            'fastest_laps': fastest_laps,
            'pit_stops': pit_stops,
            'tire_stints': tire_stints,
        }

    try:
        result = await asyncio.to_thread(_do)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cross-year")
async def cross_year_compare(
    driver: str = Query("VER"),
    track: str = Query("Melbourne"),
    event_type: str = Query('R'),
    years: str = Query("2023,2024,2025"),
):
    """Compara el mismo circuito y piloto a través de múltiples años."""
    from plotly.subplots import make_subplots
    import plotly.graph_objects as go

    year_list = [int(y.strip()) for y in years.split(',') if y.strip()]
    if len(year_list) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 years")

    def _do_cross_year():
        from plotly.subplots import make_subplots
        import plotly.graph_objects as go
        local_analyzer = F1PerformanceAnalyzer(cache_dir="f1_cache")

        year_colors = {
            2018: '#6B7280', 2019: '#9CA3AF', 2020: '#D1D5DB', 2021: '#F9FAFB',
            2022: '#F97316', 2023: '#FF3131', 2024: '#00D1FF', 2025: '#FACC15', 2026: '#00FF88'
        }
        lap_times = {}
        all_telemetry = {}

        for yr in year_list:
            try:
                local_analyzer.load_session(year=yr, track=track, event_type=event_type)
                lap, tel = local_analyzer.get_driver_lap(driver, lap_mode="fastest")
                try:
                    lt = lap['LapTime']
                    total_sec = lt.total_seconds()
                    mins = int(total_sec // 60)
                    secs = total_sec % 60
                    lap_times[str(yr)] = f"{mins}:{secs:06.3f}"
                except Exception:
                    lap_times[str(yr)] = "N/A"
                all_telemetry[yr] = tel
            except Exception as e:
                print(f"Failed to load {yr}: {e}")
                lap_times[str(yr)] = "N/A"

        fig = make_subplots(
            rows=3, cols=1, shared_xaxes=True, vertical_spacing=0.05,
            row_heights=[0.6, 0.2, 0.2],
            subplot_titles=("Velocidad (km/h)", "Acelerador (%)", "Freno")
        )
        for yr, tel in all_telemetry.items():
            color = year_colors.get(yr, '#FFFFFF')
            fig.add_trace(go.Scattergl(x=tel['Distance'], y=tel['Speed'], name=str(yr), line=dict(color=color, width=2), legendgroup=str(yr)), row=1, col=1)
            fig.add_trace(go.Scattergl(x=tel['Distance'], y=tel['Throttle'], name=f'{yr} Thr', line=dict(color=color, width=1.5), showlegend=False, legendgroup=str(yr)), row=2, col=1)
            fig.add_trace(go.Scattergl(x=tel['Distance'], y=tel['Brake'].astype(int), name=f'{yr} Brk', line=dict(color=color, width=1.5), showlegend=False, legendgroup=str(yr)), row=3, col=1)

        fig.update_layout(
            template="plotly_dark", height=800, hovermode="x unified",
            title=dict(text=f"Cross-Year: {driver} @ {track}", font=dict(color="#FFFFFF", size=14)),
            font=dict(family="JetBrains Mono, monospace", color="#FFFFFF", size=11),
            hoverlabel=dict(bgcolor="rgba(0,0,0,0.92)", font_size=12, font_color="#FFFFFF", font_family="JetBrains Mono", bordercolor="rgba(255,255,255,0.15)"),
            legend=dict(bgcolor="rgba(0,0,0,0.5)", bordercolor="rgba(255,255,255,0.1)", font=dict(color="#FFFFFF"), orientation="h", yanchor="bottom", y=1.02, x=0),
            margin=dict(l=60, r=20, t=60, b=30),
            plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)"
        )
        fig.update_yaxes(title_text="km/h", row=1, col=1)
        fig.update_yaxes(title_text="%", row=2, col=1)
        fig.update_yaxes(title_text="On/Off", row=3, col=1)
        fig.update_xaxes(title_text="Distancia (m)", row=3, col=1)

        # Track map
        track_map_json = None
        if all_telemetry:
            latest_yr = max(all_telemetry.keys())
            local_analyzer.load_session(year=latest_yr, track=track, event_type=event_type)
            fig_map = local_analyzer.plot_track_map(driver, lap_mode="fastest", show=False)
            fig_map.update_layout(plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)")
            track_map_json = fig_map.to_json()

        valid_times = {}
        for yr_str, t in lap_times.items():
            if t != "N/A":
                parts = t.split(':')
                valid_times[yr_str] = float(parts[0]) * 60 + float(parts[1])
        delta_total = None
        if len(valid_times) >= 2:
            sorted_yrs = sorted(valid_times.keys())
            delta_sec = valid_times[sorted_yrs[-1]] - valid_times[sorted_yrs[0]]
            delta_total = f"{delta_sec:+.3f}s"

        return {
            "driver": driver, "years": year_list, "lap_times": lap_times,
            "delta_total": delta_total,
            "telemetry_figure_json": fig.to_json(),
            "track_map_figure_json": track_map_json
        }

    return await asyncio.to_thread(_do_cross_year)


@app.get("/api/teams")
def get_teams(year: int = Query(2024), track: int = Query(1), event_type: str = Query('R')):
    """Returns a list of unique teams for a session."""
    try:
        session = fastf1.get_session(year, track, event_type)
        session.load(telemetry=False, weather=False, messages=False)
        teams = {}
        if session.results is not None:
            for _, drv in session.results.iterrows():
                team = str(drv.get('TeamName', ''))
                abbr = str(drv.get('Abbreviation', ''))
                if team and abbr:
                    if team not in teams:
                        teams[team] = []
                    teams[team].append(abbr)
        return {"teams": [{"name": t, "drivers": d} for t, d in teams.items()]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/teams-compare")
async def teams_compare(
    teams: str = Query("Ferrari,McLaren"),
    year: int = Query(2024),
    track: int = Query(1),
    event_type: str = Query('R'),
    mode: str = Query("best", description="best or average"),
):
    """Compara escuderías: toma el mejor piloto o promedia ambos."""
    team_list = [t.strip() for t in teams.split(',') if t.strip()]
    if len(team_list) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 teams")

    def _do_teams_compare():
        from plotly.subplots import make_subplots
        import plotly.graph_objects as go
        local_analyzer = F1PerformanceAnalyzer(cache_dir="f1_cache")

        try:
            local_analyzer.load_session(year=year, track=track, event_type=event_type)
        except Exception as e:
            return {"error": f"Failed to load session: {e}"}

        session = local_analyzer.session
        team_drivers = {}
        for _, drv in session.results.iterrows():
            team_name = str(drv.get('TeamName', ''))
            abbr = str(drv.get('Abbreviation', ''))
            if team_name and abbr:
                if team_name not in team_drivers:
                    team_drivers[team_name] = []
                team_drivers[team_name].append(abbr)

        TEAM_COLORS = {
            'Red Bull Racing': '#3671C6', 'Ferrari': '#E8002D', 'McLaren': '#FF8000',
            'Mercedes': '#27F4D2', 'Aston Martin': '#229971', 'Alpine': '#FF87BC',
            'Racing Bulls': '#6692FF', 'Sauber': '#52E252', 'Haas F1 Team': '#B6BABD',
            'Williams': '#64C4FF', 'Kick Sauber': '#52E252', 'RB': '#6692FF',
            'Audi': '#E00400', 'Cadillac F1 Team': '#FFD700',
        }

        results = {}
        for team in team_list:
            matched_team = None
            for tn in team_drivers:
                if team.lower() in tn.lower():
                    matched_team = tn
                    break
            if not matched_team:
                continue

            drivers = team_drivers[matched_team]
            color = TEAM_COLORS.get(matched_team, '#FFFFFF')

            if mode == "best":
                best_time = None
                best_drv = None
                best_tel = None
                for d in drivers:
                    try:
                        lap, tel = local_analyzer.get_driver_lap(d, lap_mode="fastest")
                        lt = lap['LapTime'].total_seconds()
                        if best_time is None or lt < best_time:
                            best_time = lt
                            best_drv = d
                            best_tel = tel
                    except Exception:
                        continue
                if best_tel is not None:
                    try:
                        mins = int(best_time // 60)
                        secs = best_time % 60
                        lap_time_str = f"{mins}:{secs:06.3f}"
                    except:
                        lap_time_str = "N/A"
                    results[matched_team] = {
                        "telemetry": best_tel, "color": color,
                        "driver": best_drv, "lap_time": lap_time_str,
                        "drivers_in_team": drivers
                    }
            else:
                all_tels = []
                for d in drivers:
                    try:
                        _, tel = local_analyzer.get_driver_lap(d, lap_mode="fastest")
                        all_tels.append(tel)
                    except:
                        continue
                if all_tels:
                    min_len = min(len(t) for t in all_tels)
                    avg_speed = np.mean([t['Speed'].values[:min_len] for t in all_tels], axis=0)
                    avg_throttle = np.mean([t['Throttle'].values[:min_len] for t in all_tels], axis=0)
                    avg_brake = np.mean([t['Brake'].astype(float).values[:min_len] for t in all_tels], axis=0)
                    distance = all_tels[0]['Distance'].values[:min_len]
                    best_time = None
                    for d in drivers:
                        try:
                            lap, _ = local_analyzer.get_driver_lap(d, lap_mode="fastest")
                            lt = lap['LapTime'].total_seconds()
                            if best_time is None or lt < best_time:
                                best_time = lt
                        except:
                            pass
                    lap_time_str = "N/A"
                    if best_time:
                        mins = int(best_time // 60)
                        secs = best_time % 60
                        lap_time_str = f"{mins}:{secs:06.3f}"
                    results[matched_team] = {
                        "avg_speed": avg_speed, "avg_throttle": avg_throttle,
                        "avg_brake": avg_brake, "distance": distance,
                        "color": color, "lap_time": lap_time_str,
                        "drivers_in_team": drivers
                    }

        fig = make_subplots(
            rows=3, cols=1, shared_xaxes=True, vertical_spacing=0.05,
            row_heights=[0.6, 0.2, 0.2],
            subplot_titles=("Velocidad (km/h)", "Acelerador (%)", "Freno")
        )
        for team_name, data in results.items():
            color = data["color"]
            label = team_name
            if mode == "best" and "driver" in data:
                label = f"{team_name} ({data['driver']})"
            if mode == "best" and "telemetry" in data:
                tel = data["telemetry"]
                fig.add_trace(go.Scattergl(x=tel['Distance'], y=tel['Speed'], name=label, line=dict(color=color, width=2.5), legendgroup=team_name), row=1, col=1)
                fig.add_trace(go.Scattergl(x=tel['Distance'], y=tel['Throttle'], showlegend=False, line=dict(color=color, width=1.5), legendgroup=team_name), row=2, col=1)
                fig.add_trace(go.Scattergl(x=tel['Distance'], y=tel['Brake'].astype(int), showlegend=False, line=dict(color=color, width=1.5), legendgroup=team_name), row=3, col=1)
            elif "avg_speed" in data:
                fig.add_trace(go.Scattergl(x=data['distance'], y=data['avg_speed'], name=label, line=dict(color=color, width=2.5), legendgroup=team_name), row=1, col=1)
                fig.add_trace(go.Scattergl(x=data['distance'], y=data['avg_throttle'], showlegend=False, line=dict(color=color, width=1.5), legendgroup=team_name), row=2, col=1)
                fig.add_trace(go.Scattergl(x=data['distance'], y=data['avg_brake'], showlegend=False, line=dict(color=color, width=1.5), legendgroup=team_name), row=3, col=1)

        fig.update_layout(
            template="plotly_dark", height=800, hovermode="x unified",
            font=dict(family="JetBrains Mono, monospace", color="#FFFFFF", size=11),
            hoverlabel=dict(bgcolor="rgba(0,0,0,0.92)", font_size=12, font_color="#FFFFFF", font_family="JetBrains Mono"),
            legend=dict(bgcolor="rgba(0,0,0,0.5)", bordercolor="rgba(255,255,255,0.1)", font=dict(color="#FFFFFF", size=13), orientation="h", yanchor="bottom", y=1.02, x=0),
            margin=dict(l=60, r=20, t=40, b=30),
            plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)"
        )
        fig.update_yaxes(title_text="km/h", row=1, col=1)
        fig.update_yaxes(title_text="%", row=2, col=1)
        fig.update_yaxes(title_text="On/Off", row=3, col=1)
        fig.update_xaxes(title_text="Distancia (m)", row=3, col=1)

        lap_times = {t: r["lap_time"] for t, r in results.items()}
        return {
            "teams": list(results.keys()), "mode": mode,
            "lap_times": lap_times, "telemetry_figure_json": fig.to_json()
        }

    result = await asyncio.to_thread(_do_teams_compare)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.get("/api/season-trends")
async def season_trends(
    year: int = Query(2024),
    drivers: str = Query("VER,NOR,LEC"),
    event_type: str = Query('R'),
):
    """Evolución de rendimiento a lo largo de la temporada."""
    driver_list = [d.strip().upper() for d in drivers.split(',') if d.strip()]

    def _do_season_trends():
        local_analyzer = F1PerformanceAnalyzer(cache_dir="f1_cache")
        try:
            schedule = fastf1.get_event_schedule(year)
        except Exception as e:
            return {"error": f"Failed to get schedule: {e}"}

        rounds = []
        for _, ev in schedule.iterrows():
            rn = int(ev.get('RoundNumber', 0))
            if rn < 1:
                continue
            rounds.append({"round": rn, "name": str(ev.get('EventName', f'R{rn}')), "location": str(ev.get('Location', ''))})

        trends_data = {drv: {"lap_times": [], "top_speeds": [], "rounds": [], "round_names": []} for drv in driver_list}

        for rnd in rounds:
            try:
                local_analyzer.load_session(year=year, track=rnd["round"], event_type=event_type)
                for drv in driver_list:
                    try:
                        lap, tel = local_analyzer.get_driver_lap(drv, lap_mode="fastest")
                        lt = lap['LapTime'].total_seconds()
                        top_speed = float(tel['Speed'].max())
                        trends_data[drv]["lap_times"].append(round(lt, 3))
                        trends_data[drv]["top_speeds"].append(round(top_speed, 1))
                        trends_data[drv]["rounds"].append(rnd["round"])
                        trends_data[drv]["round_names"].append(rnd["location"][:3].upper())
                    except Exception:
                        pass
            except Exception:
                continue

        return {
            "year": year, "drivers": driver_list,
            "trends": trends_data,
            "all_rounds": [r["location"][:3].upper() for r in rounds]
        }

    result = await asyncio.to_thread(_do_season_trends)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@app.get("/api/season-trends-fast")
def season_trends_fast(
    year: int = Query(2024),
    drivers: str = Query("VER,NOR,LEC"),
    event_type: str = Query('R'),
):
    """Season Trends usando datos pre-cargados de Supabase (instantáneo)."""
    from db import supabase as db_client
    driver_list = [d.strip().upper() for d in drivers.split(',') if d.strip()]

    try:
        # Get all metrics for this year from DB
        result = db_client.table("f1_race_metrics").select("*").eq(
            "year", year
        ).eq("event_type", event_type).in_(
            "driver", driver_list
        ).order("round_number").execute()

        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=404,
                detail=f"No pre-loaded data for {year}. Run: python preload_data.py --years {year}"
            )

        # Get events for round names
        events = db_client.table("f1_events").select("*").eq("year", year).order("round_number").execute()
        round_names = {}
        all_rounds = []
        for ev in (events.data or []):
            loc = str(ev.get("location", ""))[:3].upper()
            round_names[ev["round_number"]] = loc
            all_rounds.append(loc)

        # Build trends
        trends_data = {drv: {"lap_times": [], "top_speeds": [], "rounds": [], "round_names": []} for drv in driver_list}

        for row in result.data:
            drv = row["driver"]
            if drv in trends_data and row.get("lap_time_seconds"):
                trends_data[drv]["lap_times"].append(round(row["lap_time_seconds"], 3))
                trends_data[drv]["top_speeds"].append(round(row.get("top_speed", 0) or 0, 1))
                trends_data[drv]["rounds"].append(row["round_number"])
                trends_data[drv]["round_names"].append(round_names.get(row["round_number"], f"R{row['round_number']}"))

        return {
            "year": year,
            "drivers": driver_list,
            "trends": trends_data,
            "all_rounds": all_rounds,
            "source": "database"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB query failed: {str(e)}")


@app.get("/api/preload-status")
def preload_status():
    """Verifica qué datos están pre-cargados en la base de datos."""
    from db import supabase as db_client
    try:
        # Count metrics per year
        years_data = {}
        for year in range(2018, 2027):
            result = db_client.table("f1_race_metrics").select("id", count="exact").eq("year", year).execute()
            count = result.count if result.count else 0
            if count > 0:
                years_data[str(year)] = count

        events_count = db_client.table("f1_events").select("id", count="exact").execute()

        return {
            "metrics_per_year": years_data,
            "total_events": events_count.count or 0,
            "years_available": list(years_data.keys()),
            "status": "ready" if years_data else "empty"
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@app.get("/api/ai-analyze")
def ai_analyze(
    drivers: str = Query(...),
    year: int = Query(2024),
    track: int = Query(1),
    event_type: str = Query('R'),
    lap_mode: str = Query('fastest'),
    lap_number: Optional[int] = Query(None),
    lap_start: Optional[int] = Query(None),
    lap_end: Optional[int] = Query(None),
):
    """Endpoint de análisis con IA (OpenAI GPT-4o-mini)."""
    driver_list = [d.strip().upper() for d in drivers.split(',') if d.strip()]
    
    # Intentar obtener análisis cacheado
    analysis_type = "qualifying" if event_type == "Q" else "telemetry"
    try:
        cached = get_cached_analysis(year, track, event_type, driver_list, lap_mode, analysis_type)
        if cached:
            return {"analysis": cached["analysis_text"], "source": "cached"}
    except Exception:
        pass

    # Generar nuevo análisis
    try:
        try:
            analyzer.load_session(year=year, track=track, event_type=event_type)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to load session: {e}")

        comp_data = analyzer.compare_drivers(
            driver_list, lap_mode=lap_mode,
            lap_number=lap_number, lap_start=lap_start, lap_end=lap_end
        )

        # Extraer stats para la IA
        drivers_ai_data = {}
        for drv in driver_list:
            stats = _extract_driver_stats(comp_data[drv]["telemetry"])
            stats["lap_time"] = comp_data[drv]["lap_time"]
            drivers_ai_data[drv] = stats

        event_name = str(analyzer.session.event.get('EventName', f'Round {track}'))

        # Seleccionar tipo de análisis
        if event_type == "Q":
            analysis = analyze_qualifying_performance(drivers_ai_data, event_name, year)
        elif event_type == "R" and lap_mode == "all":
            # Para carrera completa, extraer tiempos por vuelta
            lap_times_data = {}
            for drv in driver_list:
                laps = analyzer.session.laps.pick_driver(drv)
                times = laps['LapTime'].dropna().apply(lambda x: x.total_seconds()).tolist()
                lap_times_data[drv] = times
            analysis = analyze_race_strategy(lap_times_data, event_name, year)
        else:
            session_label = {"R": "Race", "Q": "Qualifying", "FP1": "FP1", "FP2": "FP2", "FP3": "FP3", "S": "Sprint", "SQ": "Sprint Qualifying"}.get(event_type, event_type)
            analysis = analyze_telemetry_comparison(drivers_ai_data, event_name, year, session_label, lap_mode)

        # Guardar en Supabase
        try:
            save_ai_analysis(year, track, event_type, driver_list, lap_mode, analysis, analysis_type)
        except Exception:
            pass

        return {"analysis": analysis, "source": "generated"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/export-report")
async def export_report(request: Request):
    """Genera un PNG de alta resolución con el gráfico y branding."""
    import plotly.graph_objects as go
    from plotly.subplots import make_subplots
    import io
    import base64
    import json

    body = await request.json()
    figure_json = body.get("figure_json", "{}")
    title = body.get("title", "F1 Analysis Report")
    subtitle = body.get("subtitle", "")
    format_type = body.get("format", "16:9")  # 16:9, 1:1, 9:16

    # Dimensions by format
    dims = {
        "16:9": (1920, 1080),
        "1:1": (1080, 1080),
        "9:16": (1080, 1920)
    }
    width, height = dims.get(format_type, (1920, 1080))

    try:
        fig_data = json.loads(figure_json) if isinstance(figure_json, str) else figure_json
        fig = go.Figure(fig_data)

        # Apply premium dark styling
        fig.update_layout(
            width=width, height=height - 120,
            template="plotly_dark",
            font=dict(family="JetBrains Mono, Inter, sans-serif", color="#FFFFFF"),
            plot_bgcolor="rgba(0,0,0,0.95)",
            paper_bgcolor="#000000",
            title=dict(
                text=f"<b>{title}</b><br><span style='font-size:14px;color:#9CA3AF'>{subtitle}</span>",
                font=dict(size=22, color="#FFFFFF"),
                x=0.5, xanchor="center", y=0.98
            ),
            margin=dict(l=80, r=40, t=100, b=60),
        )

        # Add branding watermark
        fig.add_annotation(
            text="F1 ANALYZER PRO • Powered by FastF1 + OpenAI",
            xref="paper", yref="paper",
            x=0.5, y=-0.02, showarrow=False,
            font=dict(size=10, color="rgba(255,255,255,0.3)", family="JetBrains Mono"),
            xanchor="center"
        )

        # Export to PNG
        img_bytes = fig.to_image(format="png", width=width, height=height, scale=2)
        img_base64 = base64.b64encode(img_bytes).decode('utf-8')

        return {"image_base64": img_base64, "width": width, "height": height, "format": format_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

# ============================================================
# NEWS AGGREGATOR — RSS Feeds from F1 sources
# ============================================================

F1_NEWS_SOURCES = [
    # Spanish sources
    {"name": "Motorsport.com ES", "url": "https://lat.motorsport.com/rss/f1/news/", "lang": "es", "logo": "🏁", "category": "Motorsport"},
    {"name": "Marca Motor F1", "url": "https://e00-marca.uecdn.es/rss/motor/formula1.xml", "lang": "es", "logo": "📰", "category": "Prensa Deportiva"},
    {"name": "AS Motor F1", "url": "https://feeds.as.com/mrss-s/pages/as/site/as.com/section/motor/formula-1/portada/", "lang": "es", "logo": "📰", "category": "Prensa Deportiva"},
    {"name": "SoyMotor.com", "url": "https://sfrfrormula1.com/rss/f1/noticias/", "lang": "es", "logo": "🚗", "category": "Especializada"},
    {"name": "ESPN F1 ES", "url": "https://www.espn.com.mx/espn/rss/f1/news", "lang": "es", "logo": "📺", "category": "TV/Media"},
    # English sources
    {"name": "Formula1.com", "url": "https://www.formula1.com/content/fom-website/en/latest/all.xml", "lang": "en", "logo": "🏎️", "category": "Oficial"},
    {"name": "Autosport", "url": "https://www.autosport.com/rss/f1/news/", "lang": "en", "logo": "🏁", "category": "Motorsport"},
    {"name": "The Race", "url": "https://the-race.com/feed/", "lang": "en", "logo": "🏁", "category": "Motorsport"},
    {"name": "Sky Sports F1", "url": "https://www.skysports.com/rss/12040", "lang": "en", "logo": "📺", "category": "TV/Media"},
    {"name": "BBC Sport F1", "url": "https://feeds.bbci.co.uk/sport/formula1/rss.xml", "lang": "en", "logo": "📺", "category": "TV/Media"},
    {"name": "PlanetF1", "url": "https://www.planetf1.com/feed/", "lang": "en", "logo": "🌐", "category": "Fan Media"},
    {"name": "RaceFans", "url": "https://www.racefans.net/feed/", "lang": "en", "logo": "🌐", "category": "Fan Media"},
    {"name": "Motorsport.com EN", "url": "https://www.motorsport.com/rss/f1/news/", "lang": "en", "logo": "🏁", "category": "Motorsport"},
    {"name": "GPFans", "url": "https://www.gpfans.com/en/rss.xml", "lang": "en", "logo": "🌐", "category": "Fan Media"},
    {"name": "Crash.net F1", "url": "https://www.crash.net/rss/f1", "lang": "en", "logo": "🏁", "category": "Motorsport"},
]


@app.get("/api/news")
async def get_f1_news(
    lang: str = Query("all", description="Filter by language: es, en, or all"),
    limit: int = Query(60, description="Max articles to return"),
    category: str = Query("all", description="Filter by category")
):
    """Aggregates F1 news from 15+ RSS feeds (Spanish & English sources)."""
    import feedparser
    from datetime import datetime
    import time as time_module
    from concurrent.futures import ThreadPoolExecutor, as_completed

    sources = F1_NEWS_SOURCES
    if lang != "all":
        sources = [s for s in sources if s["lang"] == lang]
    if category != "all":
        sources = [s for s in sources if s["category"].lower() == category.lower()]

    def fetch_feed(source):
        articles = []
        try:
            feed = feedparser.parse(source["url"])
            for entry in feed.entries[:15]:  # Max 15 per source
                # Parse published date
                pub_date = ""
                pub_timestamp = 0
                try:
                    if hasattr(entry, 'published_parsed') and entry.published_parsed:
                        pub_timestamp = time_module.mktime(entry.published_parsed)
                        dt = datetime.fromtimestamp(pub_timestamp)
                        pub_date = dt.strftime("%Y-%m-%d %H:%M")
                    elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                        pub_timestamp = time_module.mktime(entry.updated_parsed)
                        dt = datetime.fromtimestamp(pub_timestamp)
                        pub_date = dt.strftime("%Y-%m-%d %H:%M")
                except:
                    pass

                # Get image
                image = ""
                try:
                    if hasattr(entry, 'media_content') and entry.media_content:
                        image = entry.media_content[0].get('url', '')
                    elif hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
                        image = entry.media_thumbnail[0].get('url', '')
                    elif hasattr(entry, 'enclosures') and entry.enclosures:
                        for enc in entry.enclosures:
                            if 'image' in enc.get('type', ''):
                                image = enc.get('href', '')
                                break
                except:
                    pass

                # Get summary/description
                summary = ""
                try:
                    if hasattr(entry, 'summary'):
                        # Strip HTML tags
                        import re
                        summary = re.sub(r'<[^>]+>', '', str(entry.summary))[:250]
                except:
                    pass

                articles.append({
                    "title": str(entry.get('title', '')),
                    "link": str(entry.get('link', '')),
                    "summary": summary,
                    "image": image,
                    "published": pub_date,
                    "timestamp": pub_timestamp,
                    "source": source["name"],
                    "source_logo": source["logo"],
                    "lang": source["lang"],
                    "category": source["category"],
                })
        except Exception as e:
            print(f"RSS Error ({source['name']}): {e}")
        return articles

    # Fetch all feeds in parallel
    all_articles = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_feed, src): src for src in sources}
        for future in as_completed(futures):
            try:
                articles = future.result()
                all_articles.extend(articles)
            except:
                pass

    # Sort by timestamp (newest first)
    all_articles.sort(key=lambda x: x.get('timestamp', 0), reverse=True)

    # Deduplicate by title similarity
    seen_titles = set()
    unique_articles = []
    for art in all_articles:
        title_key = art['title'].lower().strip()[:60]
        if title_key not in seen_titles:
            seen_titles.add(title_key)
            unique_articles.append(art)

    # Get source stats
    source_stats = {}
    for art in unique_articles:
        src = art['source']
        if src not in source_stats:
            source_stats[src] = 0
        source_stats[src] += 1

    return {
        "articles": unique_articles[:limit],
        "total": len(unique_articles),
        "sources_fetched": len(sources),
        "source_stats": source_stats
    }

# ============================================================
# TWEETS VIA NITTER RSS (FREE, NO API KEY)
# ============================================================
import re
from html import unescape

NITTER_INSTANCES = [
    "https://nitter.poast.org",
    "https://nitter.privacydev.net",
    "https://nitter.woodland.cafe",
]

def clean_tweet_html(html_text):
    """Strip HTML tags and decode entities from RSS content."""
    text = re.sub(r'<br\s*/?>', '\n', html_text or '')
    text = re.sub(r'<a[^>]*href="([^"]*)"[^>]*>[^<]*</a>', r'\1', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = unescape(text).strip()
    return text

@app.get("/api/tweets")
async def get_tweets(handle: str = Query("F1"), limit: int = Query(10)):
    """Fetch recent tweets from a user via Nitter RSS (free)."""
    import feedparser

    tweets = []

    for instance in NITTER_INSTANCES:
        try:
            rss_url = f"{instance}/{handle}/rss"
            feed = feedparser.parse(rss_url)

            if not feed.entries:
                continue

            for entry in feed.entries[:limit]:
                text = clean_tweet_html(entry.get('description', ''))
                link = entry.get('link', '')
                if 'nitter' in link:
                    link = re.sub(r'https?://[^/]+', 'https://x.com', link)

                published = entry.get('published', '')
                tweets.append({
                    "text": text[:500],
                    "date": published,
                    "link": link,
                    "handle": handle,
                    "author": entry.get('author', f'@{handle}'),
                })

            if tweets:
                break
        except Exception:
            continue

    return {
        "handle": handle,
        "tweets": tweets[:limit],
        "count": len(tweets),
        "source": "nitter_rss"
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
