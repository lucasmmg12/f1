"""
Módulo de persistencia en Supabase para cachear sesiones de F1.
Evita llamadas repetidas a la API de FastF1 para sesiones ya completadas.
"""
import os
import json
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def init_tables():
    """
    Crea las tablas necesarias en Supabase via SQL.
    Ejecutar una vez para inicializar el schema.
    """
    # Supabase no permite DDL desde el client directamente.
    # Las tablas se crean via el dashboard o SQL Editor.
    # Dejamos documentado el schema aquí:
    schema = """
    -- Ejecutar en Supabase SQL Editor:

    CREATE TABLE IF NOT EXISTS f1_sessions (
        id BIGSERIAL PRIMARY KEY,
        year INT NOT NULL,
        track INT NOT NULL,
        event_type TEXT NOT NULL,
        event_name TEXT,
        drivers_json JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(year, track, event_type)
    );

    CREATE TABLE IF NOT EXISTS f1_telemetry_cache (
        id BIGSERIAL PRIMARY KEY,
        year INT NOT NULL,
        track INT NOT NULL,
        event_type TEXT NOT NULL,
        driver TEXT NOT NULL,
        lap_mode TEXT NOT NULL DEFAULT 'fastest',
        lap_number INT,
        telemetry_json JSONB,
        lap_time TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(year, track, event_type, driver, lap_mode, lap_number)
    );

    CREATE TABLE IF NOT EXISTS f1_ai_analyses (
        id BIGSERIAL PRIMARY KEY,
        year INT NOT NULL,
        track INT NOT NULL,
        event_type TEXT NOT NULL,
        drivers TEXT[] NOT NULL,
        lap_mode TEXT NOT NULL DEFAULT 'fastest',
        analysis_text TEXT NOT NULL,
        analysis_type TEXT DEFAULT 'general',
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indices para performance
    CREATE INDEX IF NOT EXISTS idx_sessions_lookup ON f1_sessions(year, track, event_type);
    CREATE INDEX IF NOT EXISTS idx_telemetry_lookup ON f1_telemetry_cache(year, track, event_type, driver);
    CREATE INDEX IF NOT EXISTS idx_analysis_lookup ON f1_ai_analyses(year, track, event_type);
    """
    print("Schema SQL para crear en Supabase Dashboard:")
    print(schema)
    return schema


def save_session_info(year: int, track: int, event_type: str, event_name: str, drivers_data: list):
    """Guarda info de sesión en Supabase."""
    try:
        data = {
            "year": year,
            "track": track,
            "event_type": event_type,
            "event_name": event_name,
            "drivers_json": drivers_data
        }
        result = supabase.table("f1_sessions").upsert(
            data, on_conflict="year,track,event_type"
        ).execute()
        return result.data
    except Exception as e:
        print(f"Error saving session: {e}")
        return None


def get_cached_session(year: int, track: int, event_type: str):
    """Busca una sesión cacheada en Supabase."""
    try:
        result = supabase.table("f1_sessions").select("*").eq(
            "year", year).eq("track", track).eq("event_type", event_type).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    except Exception as e:
        print(f"Error reading session cache: {e}")
        return None


def save_telemetry_cache(year: int, track: int, event_type: str, driver: str,
                         lap_mode: str, lap_number: int, telemetry_data: dict, lap_time: str):
    """Guarda telemetría procesada en Supabase para evitar recalcular."""
    try:
        data = {
            "year": year,
            "track": track,
            "event_type": event_type,
            "driver": driver,
            "lap_mode": lap_mode,
            "lap_number": lap_number if lap_number else 0,
            "telemetry_json": telemetry_data,
            "lap_time": lap_time
        }
        result = supabase.table("f1_telemetry_cache").upsert(
            data, on_conflict="year,track,event_type,driver,lap_mode,lap_number"
        ).execute()
        return result.data
    except Exception as e:
        print(f"Error saving telemetry cache: {e}")
        return None


def get_cached_telemetry(year: int, track: int, event_type: str, driver: str,
                         lap_mode: str, lap_number: int = 0):
    """Busca telemetría cacheada."""
    try:
        result = supabase.table("f1_telemetry_cache").select("*").eq(
            "year", year).eq("track", track).eq("event_type", event_type).eq(
            "driver", driver).eq("lap_mode", lap_mode).eq("lap_number", lap_number or 0).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    except Exception as e:
        print(f"Error reading telemetry cache: {e}")
        return None


def save_ai_analysis(year: int, track: int, event_type: str, drivers: list,
                     lap_mode: str, analysis_text: str, analysis_type: str = "general"):
    """Guarda un análisis de IA en la base de datos."""
    try:
        data = {
            "year": year,
            "track": track,
            "event_type": event_type,
            "drivers": drivers,
            "lap_mode": lap_mode,
            "analysis_text": analysis_text,
            "analysis_type": analysis_type
        }
        result = supabase.table("f1_ai_analyses").insert(data).execute()
        return result.data
    except Exception as e:
        print(f"Error saving AI analysis: {e}")
        return None


def get_cached_analysis(year: int, track: int, event_type: str, drivers: list,
                        lap_mode: str, analysis_type: str = "general"):
    """Busca un análisis previo con los mismos parámetros."""
    try:
        result = supabase.table("f1_ai_analyses").select("*").eq(
            "year", year).eq("track", track).eq("event_type", event_type).eq(
            "lap_mode", lap_mode).eq("analysis_type", analysis_type).contains(
            "drivers", drivers).order("created_at", desc=True).limit(1).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    except Exception as e:
        print(f"Error reading AI analysis cache: {e}")
        return None
