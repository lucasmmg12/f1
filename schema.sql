-- =============================================
-- F1 Performance Analyzer - Schema de Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =============================================

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
    lap_number INT DEFAULT 0,
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

-- Indices
CREATE INDEX IF NOT EXISTS idx_sessions_lookup ON f1_sessions(year, track, event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_lookup ON f1_telemetry_cache(year, track, event_type, driver);
CREATE INDEX IF NOT EXISTS idx_analysis_lookup ON f1_ai_analyses(year, track, event_type);

-- RLS (Row Level Security) - Desactivar para uso interno
ALTER TABLE f1_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE f1_telemetry_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE f1_ai_analyses ENABLE ROW LEVEL SECURITY;

-- Políticas abiertas (service role bypass RLS anyway)
CREATE POLICY "Allow all for service role" ON f1_sessions FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON f1_telemetry_cache FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON f1_ai_analyses FOR ALL USING (true);
