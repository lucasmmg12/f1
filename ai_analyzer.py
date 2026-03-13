"""
Módulo de análisis inteligente con OpenAI GPT-4.
Analiza telemetría, estrategia, rendimiento de pilotos y genera insights.
"""
import os
import json
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """Eres un Senior Data Scientist especializado en telemetría de Fórmula 1 y análisis de rendimiento de pilotos.
Tu trabajo es analizar datos de telemetría y proporcionar insights profundos, accionables y técnicos.

REGLAS:
- Responde siempre en español.
- Usa terminología técnica de F1 (apex, understeer, oversteer, DRS zones, braking points, traction zones, etc.).
- Estructura tu análisis con secciones claras usando emojis y markdown.
- Incluye comparaciones numéricas precisas cuando los datos lo permitan.
- Prioriza insights que un ingeniero de pista encontraría valiosos.
- Sé conciso pero profundo. Máximo 600 palabras."""


def analyze_telemetry_comparison(
    drivers_data: dict, 
    event_name: str, 
    year: int, 
    session_type: str,
    lap_mode: str
) -> str:
    """
    Analiza la comparación de telemetría entre N pilotos.
    drivers_data: { "VER": {"lap_time": "1:16.206", "top_speed": 330, "avg_speed": 210, ...}, ... }
    """
    # Construir resumen de datos para el prompt
    data_summary = f"**Evento:** {event_name} {year} - Sesión: {session_type} | Modo: {lap_mode}\n\n"
    
    for drv, info in drivers_data.items():
        data_summary += f"**{drv}:**\n"
        data_summary += f"  - Tiempo de vuelta: {info.get('lap_time', 'N/A')}\n"
        data_summary += f"  - Velocidad máxima: {info.get('top_speed', 'N/A')} km/h\n"
        data_summary += f"  - Velocidad promedio: {info.get('avg_speed', 'N/A')} km/h\n"
        data_summary += f"  - % Acelerador a fondo (>95%): {info.get('full_throttle_pct', 'N/A')}%\n"
        data_summary += f"  - % Frenado total: {info.get('braking_pct', 'N/A')}%\n"
        data_summary += f"  - Zonas DRS activadas: {info.get('drs_activations', 'N/A')}\n"
        data_summary += f"  - Velocidad mínima en curva: {info.get('min_corner_speed', 'N/A')} km/h\n\n"

    user_prompt = f"""Analiza la siguiente comparación de telemetría de F1:

{data_summary}

Proporciona un análisis profundo que cubra:
1. 🏎️ **Resumen General** - Quién fue más rápido y por qué
2. 🔴 **Puntos de Frenado** - Diferencias en técnica de frenado
3. 💨 **Velocidad en Rectas** - Análisis de velocidad punta y eficiencia aerodinámica
4. 🔄 **Paso por Curva** - Cornering speed y grip mecánico
5. ⚡ **Tracción y Aceleración** - Salida de curvas y manejo del acelerador
6. 🎯 **Conclusión Estratégica** - Recomendaciones para mejorar rendimiento"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=1500
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error en análisis de IA: {str(e)}"


def analyze_race_strategy(
    drivers_lap_times: dict,
    event_name: str,
    year: int
) -> str:
    """
    Analiza la estrategia de carrera basándose en los tiempos por vuelta.
    drivers_lap_times: { "VER": [90.1, 89.5, 89.2, ...], "LEC": [...], ... }
    """
    data_summary = f"**Evento:** {event_name} {year} - Carrera\n\n"
    
    for drv, times in drivers_lap_times.items():
        if times and len(times) > 0:
            avg = sum(times) / len(times)
            best = min(times)
            worst = max(times)
            data_summary += f"**{drv}:** {len(times)} vueltas\n"
            data_summary += f"  - Mejor: {best:.3f}s | Peor: {worst:.3f}s | Promedio: {avg:.3f}s\n"
            data_summary += f"  - Degradación est.: {times[-1] - times[0]:.3f}s (primera vs última)\n\n"

    user_prompt = f"""Analiza la estrategia de carrera basándote en estos tiempos por vuelta:

{data_summary}

Cubre:
1. 🏁 **Ritmo de Carrera** - Quién tuvo mejor pace y consistencia
2. 🛞 **Degradación de Neumáticos** - Patrones de desgaste visibles
3. 🔧 **Ventanas de Pit Stop** - Momentos óptimos para parar según la degradación
4. 📊 **Consistencia** - Dispersión de tiempos y manejo de tráfico
5. 🎯 **Veredicto** - Quién ejecutó mejor estrategia"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=1500
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error en análisis de IA: {str(e)}"


def analyze_qualifying_performance(
    drivers_data: dict,
    event_name: str,
    year: int
) -> str:
    """Análisis específico de rendimiento en clasificación."""
    data_summary = f"**Evento:** {event_name} {year} - Qualifying\n\n"
    
    for drv, info in drivers_data.items():
        data_summary += f"**{drv}:** Tiempo: {info.get('lap_time', 'N/A')}\n"
        data_summary += f"  - Top Speed: {info.get('top_speed', 'N/A')} km/h\n"
        data_summary += f"  - Full Throttle: {info.get('full_throttle_pct', 'N/A')}%\n\n"

    user_prompt = f"""Analiza el rendimiento de clasificación:

{data_summary}

Cubre:
1. 🏆 **Posiciones de Parrilla** - Quién extrajo más del coche
2. ⏱️ **Sector Analysis** - Dónde se ganó/perdió tiempo
3. 🌡️ **Setup Insights** - Qué sugiere la telemetría sobre la configuración del auto
4. 🔮 **Predicción de Carrera** - Cómo impactará en la carrera"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=1200
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error en análisis de IA: {str(e)}"
