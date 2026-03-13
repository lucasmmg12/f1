"""
F1 Historical Data Pre-Download & Database Population Script
=============================================================
Descarga TODOS los datos históricos de F1 (2018-2025) al cache local
y almacena métricas procesadas en Supabase para consultas instantáneas.

Uso:
    python preload_data.py                    # Todo (2018-2025)
    python preload_data.py --years 2024 2025  # Solo años específicos
    python preload_data.py --sessions R       # Solo Races
    python preload_data.py --db-only          # Solo poblar DB (ya cacheado)
"""

import os
import sys
import json
import time
import argparse
import traceback
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

import fastf1
import numpy as np
from supabase import create_client

# ─── Config ────────────────────────────────────────────────────────
CACHE_DIR = "f1_cache"
fastf1.Cache.enable_cache(CACHE_DIR)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Años con datos de telemetría completa en FastF1
AVAILABLE_YEARS = list(range(2018, 2026))
SESSION_TYPES = {
    'R': 'Race',
    'Q': 'Qualifying',
}

# ─── SQL Schema ────────────────────────────────────────────────────
SCHEMA_SQL = """
-- ============================================================
-- EJECUTAR EN SUPABASE SQL EDITOR (una sola vez)
-- ============================================================

-- Tabla de métricas procesadas por piloto/ronda
CREATE TABLE IF NOT EXISTS f1_race_metrics (
    id BIGSERIAL PRIMARY KEY,
    year INT NOT NULL,
    round_number INT NOT NULL,
    event_name TEXT,
    location TEXT,
    event_type TEXT NOT NULL DEFAULT 'R',
    driver TEXT NOT NULL,
    team TEXT,
    lap_time_seconds FLOAT,
    lap_time_str TEXT,
    top_speed FLOAT,
    avg_speed FLOAT,
    position INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, round_number, event_type, driver)
);

-- Tabla de info de eventos/rondas
CREATE TABLE IF NOT EXISTS f1_events (
    id BIGSERIAL PRIMARY KEY,
    year INT NOT NULL,
    round_number INT NOT NULL,
    event_name TEXT,
    location TEXT,
    country TEXT,
    event_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, round_number)
);

-- Tabla de equipos por temporada
CREATE TABLE IF NOT EXISTS f1_team_standings (
    id BIGSERIAL PRIMARY KEY,
    year INT NOT NULL,
    round_number INT NOT NULL,
    team TEXT NOT NULL,
    driver TEXT NOT NULL,
    driver_full_name TEXT,
    team_color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, round_number, driver)
);

-- Índices para queries rápidas
CREATE INDEX IF NOT EXISTS idx_race_metrics_year ON f1_race_metrics(year);
CREATE INDEX IF NOT EXISTS idx_race_metrics_driver ON f1_race_metrics(driver);
CREATE INDEX IF NOT EXISTS idx_race_metrics_lookup ON f1_race_metrics(year, round_number, event_type);
CREATE INDEX IF NOT EXISTS idx_race_metrics_season ON f1_race_metrics(year, driver, event_type);
CREATE INDEX IF NOT EXISTS idx_events_year ON f1_events(year);
CREATE INDEX IF NOT EXISTS idx_team_standings_year ON f1_team_standings(year);
"""


def print_banner():
    print("""
╔══════════════════════════════════════════════════════════╗
║          F1 ANALYZER PRO — DATA PRE-LOADER v1.0         ║
║     Download & Process Historical F1 Data (2018-2025)   ║
╚══════════════════════════════════════════════════════════╝
    """)


def print_schema():
    """Imprime el SQL que hay que ejecutar en Supabase."""
    print("=" * 60)
    print("PASO 1: Ejecutar este SQL en Supabase SQL Editor")
    print("=" * 60)
    print(SCHEMA_SQL)
    print("=" * 60)


def save_event_to_db(year, round_num, event_name, location, country, event_date):
    """Guarda info del evento en Supabase."""
    try:
        data = {
            "year": year,
            "round_number": round_num,
            "event_name": event_name,
            "location": location,
            "country": country,
            "event_date": str(event_date) if event_date else None
        }
        supabase.table("f1_events").upsert(
            data, on_conflict="year,round_number"
        ).execute()
    except Exception as e:
        print(f"    ⚠ DB event save error: {e}")


def save_metrics_to_db(year, round_num, event_name, location, event_type, driver, team, 
                       lap_time_sec, lap_time_str, top_speed, avg_speed, position):
    """Guarda métricas procesadas en Supabase."""
    try:
        data = {
            "year": year,
            "round_number": round_num,
            "event_name": event_name,
            "location": location,
            "event_type": event_type,
            "driver": driver,
            "team": team,
            "lap_time_seconds": round(lap_time_sec, 3) if lap_time_sec else None,
            "lap_time_str": lap_time_str,
            "top_speed": round(top_speed, 1) if top_speed else None,
            "avg_speed": round(avg_speed, 1) if avg_speed else None,
            "position": position
        }
        supabase.table("f1_race_metrics").upsert(
            data, on_conflict="year,round_number,event_type,driver"
        ).execute()
    except Exception as e:
        print(f"    ⚠ DB metrics save error: {e}")


def save_team_standing(year, round_num, team, driver, driver_full_name, team_color):
    """Guarda info de equipo/piloto por ronda."""
    try:
        data = {
            "year": year,
            "round_number": round_num,
            "team": team,
            "driver": driver,
            "driver_full_name": driver_full_name,
            "team_color": team_color
        }
        supabase.table("f1_team_standings").upsert(
            data, on_conflict="year,round_number,driver"
        ).execute()
    except Exception as e:
        print(f"    ⚠ DB team save error: {e}")


def process_session(year, round_num, event_name, location, country, event_date, 
                    event_type, save_to_db=True):
    """Descarga y procesa una sesión específica."""
    try:
        session = fastf1.get_session(year, round_num, event_type)
        session.load()

        if save_to_db:
            save_event_to_db(year, round_num, event_name, location, country, event_date)

        # Process each driver
        drivers_processed = 0
        for _, drv_info in session.results.iterrows():
            driver = str(drv_info.get('Abbreviation', ''))
            team = str(drv_info.get('TeamName', ''))
            full_name = str(drv_info.get('FullName', ''))
            position = int(drv_info.get('Position', 0)) if drv_info.get('Position') else None
            team_color = str(drv_info.get('TeamColor', ''))

            if not driver:
                continue

            # Get fastest lap
            lap_time_sec = None
            lap_time_str = None
            top_speed = None
            avg_speed = None

            try:
                driver_laps = session.laps.pick_driver(driver)
                if driver_laps is not None and len(driver_laps) > 0:
                    fastest = driver_laps.pick_fastest()
                    if fastest is not None and hasattr(fastest, 'LapTime') and fastest['LapTime'] is not None:
                        lt = fastest['LapTime']
                        lap_time_sec = lt.total_seconds()
                        mins = int(lap_time_sec // 60)
                        secs = lap_time_sec % 60
                        lap_time_str = f"{mins}:{secs:06.3f}"

                        # Telemetry for top speed
                        try:
                            tel = fastest.get_telemetry()
                            if tel is not None and len(tel) > 0:
                                top_speed = float(tel['Speed'].max())
                                avg_speed = float(tel['Speed'].mean())
                        except:
                            pass
            except Exception as e:
                pass

            if save_to_db:
                save_metrics_to_db(
                    year, round_num, event_name, location, event_type,
                    driver, team, lap_time_sec, lap_time_str, top_speed, avg_speed, position
                )
                save_team_standing(year, round_num, team, driver, full_name, team_color)

            drivers_processed += 1

        return drivers_processed

    except Exception as e:
        print(f"    ✗ Error: {str(e)[:80]}")
        return 0


def preload_year(year, session_types, save_to_db=True):
    """Procesa todas las rondas de un año."""
    print(f"\n{'='*60}")
    print(f"  📅 AÑO {year}")
    print(f"{'='*60}")

    try:
        schedule = fastf1.get_event_schedule(year)
    except Exception as e:
        print(f"  ✗ Error obteniendo calendario {year}: {e}")
        return 0

    total_sessions = 0
    total_drivers = 0

    for _, event in schedule.iterrows():
        round_num = int(event.get('RoundNumber', 0))
        if round_num < 1:
            continue

        event_name = str(event.get('EventName', f'Round {round_num}'))
        location = str(event.get('Location', ''))
        country = str(event.get('Country', ''))
        event_date = event.get('EventDate', None)

        for et_code, et_name in session_types.items():
            print(f"  R{round_num:02d} {location:<20} {et_name:<12}", end="", flush=True)
            start = time.time()

            drivers = process_session(
                year, round_num, event_name, location, country, event_date,
                et_code, save_to_db
            )

            elapsed = time.time() - start
            if drivers > 0:
                print(f" ✓ {drivers} drivers ({elapsed:.1f}s)")
                total_sessions += 1
                total_drivers += drivers
            else:
                print(f" ✗ no data ({elapsed:.1f}s)")

    print(f"\n  📊 {year} completado: {total_sessions} sesiones, {total_drivers} registros")
    return total_sessions


def main():
    parser = argparse.ArgumentParser(description="F1 Data Pre-Loader")
    parser.add_argument('--years', nargs='+', type=int, default=None,
                       help='Años a procesar (default: 2018-2025)')
    parser.add_argument('--sessions', nargs='+', default=['R', 'Q'],
                       help='Tipos de sesión: R (Race), Q (Qualifying)')
    parser.add_argument('--db-only', action='store_true',
                       help='Solo poblar DB (asume cache ya existe)')
    parser.add_argument('--schema', action='store_true',
                       help='Solo mostrar SQL schema')
    parser.add_argument('--no-db', action='store_true',
                       help='Solo descargar al cache, sin guardar en DB')
    args = parser.parse_args()

    print_banner()

    if args.schema:
        print_schema()
        return

    years = args.years or AVAILABLE_YEARS
    session_types = {k: v for k, v in SESSION_TYPES.items() if k in args.sessions}
    save_to_db = not args.no_db

    print(f"  📆 Años: {years}")
    print(f"  🏎️  Sesiones: {list(session_types.values())}")
    print(f"  💾 Cache: {os.path.abspath(CACHE_DIR)}")
    print(f"  🗄️  Supabase: {'✓ Activado' if save_to_db else '✗ Desactivado'}")
    print(f"  ⏰ Inicio: {datetime.now().strftime('%H:%M:%S')}")

    if save_to_db:
        print(f"\n  ⚠️  Asegurate de haber ejecutado el SQL schema en Supabase primero!")
        print(f"     Ejecutá: python preload_data.py --schema")

    total = 0
    start_time = time.time()

    for year in years:
        total += preload_year(year, session_types, save_to_db)

    elapsed_total = time.time() - start_time
    mins = int(elapsed_total // 60)
    secs = int(elapsed_total % 60)

    print(f"\n{'='*60}")
    print(f"  ✅ COMPLETADO: {total} sesiones procesadas en {mins}m {secs}s")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
