import dash
from dash import dcc, html, Input, Output, State
import plotly.graph_objects as go
import time
from f1_analyzer import F1PerformanceAnalyzer

app = dash.Dash(__name__, title="F1 Performance Analyzer", update_title=None)
server = app.server

# Inicializar y precargar sesión para acelerar (opción C seleccionada antes)
analyzer = F1PerformanceAnalyzer(cache_dir="f1_cache")

print("Precargando sesión por defecto (Ej: 2026 Bahrain L1 / Test)... Puede tardar la primera vez")
try:
    # Como 2026 no existen los datos oficiales, por seguridad forzamos a 2024 para mostrar un gráfico 100% real funcional en el layout:
    analyzer.load_session(year=2024, track=1, event_type='R')
except Exception as e:
    print(f"Aviso de carga inicial: {e}")

# Diseño de la UI
app.layout = html.Div(className="dashboard-container", children=[
    
    # === HEADER ===
    html.Header(className="header", children=[
        html.H1("F1 PERFORMANCE ANALYZER", className="logo-text"),
        html.Div(className="status-indicator", children=[
            html.Div(className="glow-dot"),
            html.Span("Data Source: Cached (2024 GP 1 - Demo)")
        ])
    ]),
    
    # === CONTROLES / FILTERS ===
    html.Div(className="controls-row", children=[
        html.Div(className="control-group", children=[
            html.Label("Event (Year / Track)", className="control-label"),
            dcc.Dropdown(
                id='session-dropdown',
                options=[
                    {'label': 'Bahrain GP (Date 1)', 'value': '1'}
                ],
                value='1',
                clearable=False,
                className="dropdown-dark"
            )
        ]),
        html.Div(className="control-group", children=[
            html.Label("Session Type", className="control-label"),
            dcc.Dropdown(
                id='event-type-dropdown',
                options=[
                    {'label': 'Race (R)', 'value': 'R'},
                    {'label': 'Qualifying (Q)', 'value': 'Q'}
                ],
                value='R',
                clearable=False,
                className="dropdown-dark"
            )
        ]),
        html.Div(className="control-group", children=[
            html.Label("Driver 1", className="control-label"),
            dcc.Input(id='driver-1-input', type='text', value="VER", className="input-dark", maxLength=3)
        ]),
        html.Div(className="control-group", children=[
            html.Label("Driver 2", className="control-label"),
            dcc.Input(id='driver-2-input', type='text', value="LEC", className="input-dark", maxLength=3)
        ]),
        html.Button("ANALYZE", id="analyze-btn", className="btn-primary", n_clicks=0)
    ]),
    
    # === MAIN CONTENT AREA (12 Columns) ===
    html.Div(className="main-grid", children=[
        
        # COLUMNA IZQUIERDA (30%) - SCORECARDS & TRACK MAP
        html.Div(className="left-column", children=[
            html.H2("Key Performance Metrics", className="section-title"),
            html.Div(id="kpi-container", children=[
                html.Div(className="scorecard", children=[
                    html.Div("Fastest Lap (Driver 1)", className="scorecard-title"),
                    html.Div("--:--.---", id="kpi-lap1", className="scorecard-value")
                ]),
                html.Div(className="scorecard", children=[
                    html.Div("Fastest Lap (Driver 2)", className="scorecard-title"),
                    html.Div("--:--.---", id="kpi-lap2", className="scorecard-value accentuate-cyan")
                ]),
                html.Div(className="scorecard", children=[
                    html.Div("Delta Time", className="scorecard-title"),
                    html.Div("+0.000s", id="kpi-delta", className="scorecard-value accentuate-red")
                ])
            ]),
            
            html.H2("Track Map (Cornering Speed)", className="section-title map-title"),
            html.Div(className="glass-container map-container", children=[
                dcc.Loading(
                    type="circle",
                    color="#00FF88",
                    children=[
                        dcc.Graph(id='track-map-graph', config={'displayModeBar': False}, style={"height": "100%"})
                    ]
                )
            ])
        ]),
        
        # COLUMNA DERECHA (70%) - MULTI-AXIS CHART
        html.Div(className="right-column", children=[
            html.H2("Velocidad & Time Delta", className="section-title"),
            html.Div(className="glass-container chart-container", children=[
                dcc.Loading(
                    type="dot",
                    color="#00FF88",
                    children=[
                        dcc.Graph(id='telemetry-graph', config={'displayModeBar': True}, style={"height": "100%"})
                    ]
                )
            ])
        ])
    ])
])

@app.callback(
    [Output('telemetry-graph', 'figure'),
     Output('track-map-graph', 'figure'),
     Output('kpi-lap1', 'children'),
     Output('kpi-lap2', 'children')],
    [Input('analyze-btn', 'n_clicks')],
    [State('driver-1-input', 'value'),
     State('driver-2-input', 'value'),
     State('session-dropdown', 'value'),
     State('event-type-dropdown', 'value')]
)
def update_dashboard(n_clicks, d1, d2, track, event_type):
    d1 = d1.upper()
    d2 = d2.upper()
    
    # Grafo vacío por defecto
    empty_fig = go.Figure().update_layout(template="plotly_dark", plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)")
    
    try:
        # Aseguramos session
        if analyzer.session is None:
            analyzer.load_session(year=2024, track=int(track), event_type=event_type)
            
        data = analyzer.compare_fastest_laps(d1, d2)
        fig_telemetry = analyzer.plot_telemetry_comparison(data, show=False)
        fig_map = analyzer.plot_track_map(d1, show=False)
        
        # Ajustamos gráficas al diseño Ultra-Dark
        bg_transparent = dict(plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)")
        fig_telemetry.update_layout(**bg_transparent, margin=dict(l=10, r=10, t=30, b=10))
        fig_map.update_layout(**bg_transparent, margin=dict(l=0, r=0, t=0, b=0))

        # LapTimes limpios
        lap1_str = str(data["lap_d1"]["LapTime"]).split('.')[-2][-8:] + '.' + str(data["lap_d1"]["LapTime"]).split('.')[-1][:3]
        lap2_str = str(data["lap_d2"]["LapTime"]).split('.')[-2][-8:] + '.' + str(data["lap_d2"]["LapTime"]).split('.')[-1][:3]
        
        return fig_telemetry, fig_map, f"{lap1_str}", f"{lap2_str}"
    
    except Exception as e:
        print(f"Error generando gráficas: {e}")
        return empty_fig, empty_fig, "ERROR", "ERROR"

if __name__ == '__main__':
    # Arrancamos en puerto 8050
    app.run_server(debug=True, port=8050)
