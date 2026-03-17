import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = "http://localhost:8000";
const api = axios.create({ baseURL: API });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

function useAuth() {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });
  const login = async (correo, password) => {
    const { data } = await api.post("/auth/login", new URLSearchParams({ username: correo, password }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);
    return data;
  };
  const register = async (nombre, correo, password) => {
    const { data } = await api.post("/auth/register", { nombre, correo, password });
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);
    return data;
  };
  const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); };
  return { user, login, register, logout };
}

function useGame() {
  const [categorias, setCategorias] = useState([]);
  const [sesion, setSesion] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [recs, setRecs] = useState([]);

  const cargarCategorias = useCallback(async () => {
    const { data } = await api.get("/categorias");
    setCategorias(data);
  }, []);

  const iniciar = async (categoria_id) => {
    setLoading(true);
    const { data } = await api.post("/sesiones/iniciar", { categoria_id });
    setSesion(data); setResultado(null); setHistorial([]);
    setSelected(null); setStartTime(Date.now()); setRecs([]); setLoading(false);
  };

  const responder = async (opcion_id) => {
    if (resultado || !sesion) return;
    const tiempo_ms = startTime ? Date.now() - startTime : null;
    setSelected(opcion_id);
    const { data } = await api.post(`/sesiones/${sesion.sesion_id}/responder`, { opcion_id, tiempo_ms });
    setResultado(data);
    setSesion(prev => ({ ...prev, puntuacion: data.puntuacion_total, dificultad_actual: data.dificultad_actual, preguntas_respondidas: prev.preguntas_respondidas + 1 }));
    setHistorial(prev => [...prev, { pregunta: sesion.pregunta_actual?.enunciado, correcta: data.es_correcta, puntos: data.puntos_obtenidos, dificultad: sesion.dificultad_actual }]);
    if (data.sesion_completada) {
      try {
        const r = await api.get(`/sesiones/${sesion.sesion_id}/recomendaciones`);
        setRecs(r.data.recomendaciones || []);
      } catch (e) { setRecs([]); }
    }
  };

  const siguiente = async () => {
    if (!sesion) return;
    setLoading(true);
    const { data } = await api.get(`/sesiones/${sesion.sesion_id}/siguiente`);
    setSesion(data); setResultado(null); setSelected(null); setStartTime(Date.now()); setLoading(false);
  };

  const resetGame = () => { setSesion(null); setResultado(null); setHistorial([]); setSelected(null); setRecs([]); };

  return { categorias, sesion, resultado, historial, loading, selected, recs, cargarCategorias, iniciar, responder, siguiente, resetGame };
}

function useAdmin() {
  const [preguntas, setPreguntas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const mostrarMensaje = (texto, tipo = "ok") => { setMensaje({ texto, tipo }); setTimeout(() => setMensaje(null), 3000); };
  const cargarPreguntas = async (categoria_id = null) => {
    setLoading(true);
    const url = categoria_id ? `/preguntas?categoria_id=${categoria_id}` : "/preguntas";
    const { data } = await api.get(url);
    setPreguntas(data); setLoading(false);
  };
  const cargarCategorias = async () => { const { data } = await api.get("/categorias"); setCategorias(data); };
  const crearCategoria = async (nombre, descripcion) => {
    try { await api.post("/categorias", { nombre, descripcion }); await cargarCategorias(); mostrarMensaje("Categoría creada correctamente"); }
    catch (e) { mostrarMensaje(e.response?.data?.detail || "Error al crear categoría", "error"); }
  };
  const eliminarCategoria = async (id) => {
    try { await api.delete(`/categorias/${id}`); await cargarCategorias(); mostrarMensaje("Categoría eliminada"); }
    catch (e) { mostrarMensaje(e.response?.data?.detail || "Error al eliminar", "error"); }
  };
  const crearPregunta = async (datos) => {
    try { await api.post("/preguntas", datos); await cargarPreguntas(); mostrarMensaje("Pregunta creada correctamente"); return true; }
    catch (e) { mostrarMensaje(e.response?.data?.detail || "Error al crear pregunta", "error"); return false; }
  };
  const eliminarPregunta = async (id) => {
    try { await api.delete(`/preguntas/${id}`); await cargarPreguntas(); mostrarMensaje("Pregunta eliminada"); }
    catch (e) { mostrarMensaje(e.response?.data?.detail || "Error al eliminar", "error"); }
  };
  return { preguntas, categorias, loading, mensaje, cargarPreguntas, cargarCategorias, crearCategoria, eliminarCategoria, crearPregunta, eliminarPregunta };
}

function useStats() {
  const [sesiones, setSesiones] = useState([]);
  const [loading, setLoading] = useState(false);
  const cargarSesiones = async () => {
    setLoading(true);
    try { const { data } = await api.get("/estadisticas/mis-sesiones"); setSesiones(data); }
    catch (e) { setSesiones([]); }
    setLoading(false);
  };
  const calcularStats = () => {
    if (sesiones.length === 0) return null;
    const completadas = sesiones.filter(s => s.estado === "completada");
    const totalPuntos = completadas.reduce((a, s) => a + s.puntuacion, 0);
    const totalCorrectas = completadas.reduce((a, s) => a + s.correctas, 0);
    const totalRespondidas = completadas.reduce((a, s) => a + s.respondidas, 0);
    const promedio = completadas.length > 0 ? Math.round(totalPuntos / completadas.length) : 0;
    const precision = totalRespondidas > 0 ? Math.round((totalCorrectas / totalRespondidas) * 100) : 0;
    const maxPuntos = completadas.length > 0 ? Math.max(...completadas.map(s => s.puntuacion)) : 0;
    return { totalSesiones: sesiones.length, completadas: completadas.length, totalPuntos, promedio, precision, maxPuntos };
  };
  return { sesiones, loading, cargarSesiones, calcularStats };
}

const catIcons = { "Programación": "💻", "Matemáticas": "📐", "Historia": "🏛️", "Ciencias": "🔬", "Ciencias Naturales": "🌿", "Inglés": "🌎", "Lenguaje": "📝" };
const getCatIcon = (nombre) => catIcons[nombre] || "📚";
const catColors = [
  { bg: "#ede9fe", border: "#8b5cf6", text: "#5b21b6" },
  { bg: "#dbeafe", border: "#3b82f6", text: "#1d4ed8" },
  { bg: "#dcfce7", border: "#22c55e", text: "#166534" },
  { bg: "#fef9c3", border: "#eab308", text: "#854d0e" },
  { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" },
  { bg: "#e0f2fe", border: "#06b6d4", text: "#0e7490" },
];

function AuthView({ onAuth }) {
  const [modo, setModo] = useState("login");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("admin@quizmaster.com");
  const [password, setPassword] = useState("Admin123");
  const [error, setError] = useState("");
  const { login, register } = onAuth;
  const submit = async (e) => {
    e.preventDefault(); setError("");
    try {
      if (modo === "login") { await login(correo, password); }
      else { if (!nombre.trim()) { setError("El nombre es requerido"); return; } await register(nombre, correo, password); }
    } catch (err) { setError(err.response?.data?.detail || "Error de autenticación"); }
  };
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: "24px", padding: "2.5rem", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "0.5rem" }}>🎯</div>
          <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: "900", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>QuizMaster IA</h1>
          <p style={{ margin: "0.4rem 0 0", color: "#6b7280", fontSize: "0.9rem" }}>Sistema de quizzes adaptativos con IA</p>
        </div>
        <div style={{ display: "flex", background: "#f3f4f6", borderRadius: "12px", padding: "4px", marginBottom: "1.5rem" }}>
          <button style={{ flex: 1, padding: "0.6rem", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem", background: modo === "login" ? "#fff" : "transparent", color: modo === "login" ? "#6366f1" : "#6b7280", boxShadow: modo === "login" ? "0 2px 8px rgba(0,0,0,0.1)" : "none" }} onClick={() => setModo("login")}>Iniciar sesión</button>
          <button style={{ flex: 1, padding: "0.6rem", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem", background: modo === "register" ? "#fff" : "transparent", color: modo === "register" ? "#6366f1" : "#6b7280", boxShadow: modo === "register" ? "0 2px 8px rgba(0,0,0,0.1)" : "none" }} onClick={() => setModo("register")}>Registrarse</button>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {modo === "register" && <input style={s.input} placeholder="👤 Nombre completo" value={nombre} onChange={e => setNombre(e.target.value)} required />}
          <input style={s.input} type="email" placeholder="✉️ Correo electrónico" value={correo} onChange={e => setCorreo(e.target.value)} required />
          <input style={s.input} type="password" placeholder="🔒 Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "0.6rem 1rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "500" }}>⚠️ {error}</div>}
          <button style={{ padding: "0.85rem", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "700", fontSize: "1rem", boxShadow: "0 4px 15px rgba(99,102,241,0.4)" }} type="submit">
            {modo === "login" ? "🚀 Entrar" : "✨ Crear cuenta"}
          </button>
        </form>
        <div style={{ marginTop: "1.25rem", padding: "0.75rem", background: "#f8fafc", borderRadius: "10px", fontSize: "0.78rem", color: "#6b7280" }}>
          <p style={{ margin: "0 0 0.25rem", fontWeight: "600", color: "#374151" }}>Usuarios de prueba:</p>
          <p style={{ margin: "0.1rem 0" }}>👑 Admin: admin@quizmaster.com / Admin123</p>
          <p style={{ margin: "0.1rem 0" }}>🎓 Estudiante: carlos@estudiante.com / Est123</p>
        </div>
      </div>
    </div>
  );
}

function CategoryView({ categorias, onSelect, onLoad, user }) {
  useEffect(() => { onLoad(); }, []);
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";
  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <p style={{ margin: "0 0 0.25rem", color: "#6b7280", fontSize: "0.95rem" }}>{saludo},</p>
        <h2 style={{ margin: 0, fontSize: "1.6rem", fontWeight: "900", color: "#1e1b4b" }}>{user?.nombre} 👋</h2>
        <p style={{ margin: "0.5rem 0 0", color: "#6b7280" }}>¿Qué quieres practicar hoy?</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {categorias.map((c, i) => {
          const col = catColors[i % catColors.length];
          return (
            <div key={c.id} onClick={() => onSelect(c.id)}
              style={{ background: col.bg, borderRadius: "16px", padding: "1.5rem", cursor: "pointer", border: `2px solid ${col.border}20`, transition: "transform 0.15s, box-shadow 0.15s", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{getCatIcon(c.nombre)}</div>
              <h3 style={{ margin: "0 0 0.3rem", fontWeight: "800", color: col.text, fontSize: "1rem" }}>{c.nombre}</h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: col.text, opacity: 0.7 }}>{c.descripcion || "Pon a prueba tu conocimiento"}</p>
              <div style={{ marginTop: "1rem", display: "inline-block", background: col.border, color: "#fff", padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "700" }}>Jugar →</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GameView({ sesion, resultado, selected, loading, onResponder, onSiguiente, onFin, historial, recs }) {
  if (!sesion?.pregunta_actual && sesion?.estado !== "completada") {
    return (
      <div style={{ maxWidth: "600px", margin: "3rem auto", padding: "0 1rem" }}>
        <div style={s.card}>
          <p style={{ color: "#6b7280", textAlign: "center" }}>⚠️ No hay más preguntas disponibles con dificultad <b>{sesion?.dificultad_actual}</b>.</p>
          <button style={s.btnPrimary} onClick={onFin}>Ver resultados</button>
        </div>
      </div>
    );
  }

  if (sesion?.estado === "completada" || resultado?.sesion_completada) {
    const pct = historial.length > 0 ? Math.round((historial.filter(h => h.correcta).length / historial.length) * 100) : 0;
    const emoji = pct >= 70 ? "🏆" : pct >= 40 ? "👍" : "💪";
    const msg = pct >= 70 ? "¡Excelente trabajo!" : pct >= 40 ? "¡Buen intento!" : "¡Sigue practicando!";
    return (
      <div style={{ maxWidth: "600px", margin: "2rem auto", padding: "0 1rem" }}>
        <div style={{ ...s.card, textAlign: "center" }}>
          <div style={{ fontSize: "5rem", marginBottom: "0.5rem" }}>{emoji}</div>
          <h2 style={{ margin: "0 0 0.25rem", color: "#1e1b4b", fontSize: "1.5rem", fontWeight: "900" }}>{msg}</h2>
          <p style={{ color: "#6b7280", margin: "0 0 1.5rem" }}>Sesión completada</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {[
              { label: "Puntuación", value: sesion.puntuacion, icon: "⭐", color: "#6366f1", bg: "#ede9fe" },
              { label: "Correctas", value: `${historial.filter(h => h.correcta).length}/${historial.length}`, icon: "✅", color: "#22c55e", bg: "#dcfce7" },
              { label: "Precisión", value: `${pct}%`, icon: "🎯", color: "#f59e0b", bg: "#fef9c3" },
            ].map((m, i) => (
              <div key={i} style={{ background: m.bg, borderRadius: "14px", padding: "1rem" }}>
                <div style={{ fontSize: "1.5rem" }}>{m.icon}</div>
                <div style={{ fontSize: "1.4rem", fontWeight: "900", color: m.color }}>{m.value}</div>
                <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "0.75rem", marginBottom: "1.25rem", maxHeight: "200px", overflowY: "auto", textAlign: "left" }}>
            {historial.map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.5rem", borderBottom: i < historial.length - 1 ? "1px solid #f0f0f0" : "none", fontSize: "0.83rem" }}>
                <span style={{ width: "20px", textAlign: "center" }}>{h.correcta ? "✅" : "❌"}</span>
                <span style={{ flex: 1, marginLeft: "0.5rem", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#374151" }}>{h.pregunta}</span>
                <span style={{ color: "#9ca3af", fontSize: "0.72rem", marginLeft: "0.5rem" }}>{h.dificultad}</span>
                <span style={{ fontWeight: "700", color: "#6366f1", minWidth: "40px", textAlign: "right" }}>+{h.puntos}</span>
              </div>
            ))}
          </div>
          {recs && recs.length > 0 && (
            <div style={{ marginBottom: "1rem", background: "#ede9fe", borderRadius: "14px", padding: "1rem 1.25rem", textAlign: "left" }}>
              <p style={{ margin: "0 0 0.75rem", fontWeight: "800", color: "#5b21b6", fontSize: "0.95rem" }}>🤖 Recomendaciones del Agente IA</p>
              {recs.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1rem" }}>{i === 0 ? "💡" : i === 1 ? "📚" : "🎯"}</span>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#4c1d95", lineHeight: "1.5" }}>{r.texto}</p>
                </div>
              ))}
            </div>
          )}
          <button style={s.btnPrimary} onClick={onFin}>🎮 Jugar de nuevo</button>
        </div>
      </div>
    );
  }

  const pregunta = sesion.pregunta_actual;
  const difConfig = {
    facil: { color: "#22c55e", bg: "#dcfce7", label: "Fácil" },
    media: { color: "#f59e0b", bg: "#fef9c3", label: "Media" },
    dificil: { color: "#ef4444", bg: "#fee2e2", label: "Difícil" },
  }[sesion.dificultad_actual] || { color: "#6366f1", bg: "#ede9fe", label: "?" };
  const letras = ["A", "B", "C", "D"];

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.3rem" }}>⭐</span>
          <span style={{ fontWeight: "900", color: "#1e1b4b", fontSize: "1.2rem" }}>{sesion.puntuacion}</span>
        </div>
        <span style={{ color: "#6b7280", fontSize: "0.85rem", fontWeight: "500" }}>Pregunta <b>{sesion.preguntas_respondidas + 1}</b> de 10</span>
        <div style={{ background: difConfig.bg, color: difConfig.color, padding: "4px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "700" }}>{difConfig.label}</div>
      </div>
      <div style={{ height: "8px", background: "#e5e7eb", borderRadius: "4px", marginBottom: "1.5rem", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(sesion.preguntas_respondidas / 10) * 100}%`, background: "linear-gradient(90deg, #6366f1, #8b5cf6)", borderRadius: "4px", transition: "width 0.4s" }} />
      </div>
      <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", borderRadius: "20px", padding: "1.75rem", marginBottom: "1rem", boxShadow: "0 8px 32px rgba(30,27,75,0.3)" }}>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>¿Cuál es la respuesta correcta?</p>
        <h2 style={{ margin: 0, color: "#fff", fontSize: "1.15rem", fontWeight: "700", lineHeight: "1.5" }}>{pregunta.enunciado}</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {pregunta.opciones.map((op, i) => {
          let bg = "#fff", border = "#e5e7eb", color = "#374151", shadow = "0 2px 8px rgba(0,0,0,0.06)";
          if (resultado) {
            if (op.id === resultado.respuesta_correcta_id) { bg = "#dcfce7"; border = "#22c55e"; color = "#166534"; shadow = "0 4px 12px rgba(34,197,94,0.2)"; }
            else if (op.id === selected && !resultado.es_correcta) { bg = "#fee2e2"; border = "#ef4444"; color = "#991b1b"; }
          } else if (op.id === selected) { bg = "#ede9fe"; border = "#6366f1"; color = "#4338ca"; shadow = "0 4px 12px rgba(99,102,241,0.2)"; }
          return (
            <button key={op.id}
              style={{ padding: "0.9rem 1rem", borderRadius: "14px", cursor: resultado ? "default" : "pointer", textAlign: "left", fontWeight: "600", fontSize: "0.95rem", fontFamily: "inherit", background: bg, border: `2px solid ${border}`, color, boxShadow: shadow, display: "flex", alignItems: "center", gap: "0.75rem", transition: "all 0.15s" }}
              onClick={() => !resultado && onResponder(op.id)} disabled={!!resultado || loading}>
              <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: border + "33", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "0.8rem", color: border, flexShrink: 0 }}>{letras[i]}</span>
              {op.texto}
            </button>
          );
        })}
      </div>
      {resultado && (
        <div style={{ marginTop: "1rem", padding: "1rem 1.25rem", borderRadius: "14px", background: resultado.es_correcta ? "#dcfce7" : "#fee2e2", border: `2px solid ${resultado.es_correcta ? "#22c55e" : "#ef4444"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontWeight: "800", color: resultado.es_correcta ? "#166534" : "#991b1b", fontSize: "1rem" }}>{resultado.es_correcta ? "✅ ¡Correcto!" : "❌ Incorrecto"}</p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: resultado.es_correcta ? "#166534" : "#991b1b", opacity: 0.8 }}>{resultado.es_correcta ? `+${resultado.puntos_obtenidos} puntos` : "Sigue intentando"}</p>
          </div>
          <button style={{ padding: "0.6rem 1.25rem", background: resultado.es_correcta ? "#22c55e" : "#ef4444", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "0.9rem" }}
            onClick={resultado.sesion_completada ? onFin : onSiguiente}>
            {resultado.sesion_completada ? "Ver resultados →" : "Siguiente →"}
          </button>
        </div>
      )}
    </div>
  );
}

function StatsView({ user }) {
  const { sesiones, loading, cargarSesiones, calcularStats } = useStats();
  useEffect(() => { cargarSesiones(); }, []);
  const stats = calcularStats();
  const medallas = ["🥇", "🥈", "🥉"];
  const formatFecha = (iso) => new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
  const formatTiempo = (iso) => new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  if (loading) return <div style={{ textAlign: "center", padding: "4rem", color: "#6b7280" }}>⏳ Cargando estadísticas...</div>;
  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "2rem 1rem" }}>
      <h2 style={{ textAlign: "center", fontWeight: "900", color: "#1e1b4b", fontSize: "1.5rem", marginBottom: "1.5rem" }}>📊 Mis estadísticas</h2>
      <div style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: "20px", padding: "1.5rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", fontWeight: "900", color: "#fff", flexShrink: 0 }}>
          {user.nombre.charAt(0).toUpperCase()}
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: "900", fontSize: "1.2rem", color: "#fff" }}>{user.nombre}</p>
          <p style={{ margin: "0.2rem 0 0", color: "rgba(255,255,255,0.75)", fontSize: "0.85rem" }}>{user.rol}</p>
        </div>
      </div>
      {stats ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
            {[
              { icon: "🎮", label: "Sesiones", value: stats.totalSesiones, color: "#6366f1", bg: "#ede9fe" },
              { icon: "✅", label: "Completadas", value: stats.completadas, color: "#22c55e", bg: "#dcfce7" },
              { icon: "🎯", label: "Precisión", value: `${stats.precision}%`, color: "#f59e0b", bg: "#fef9c3" },
              { icon: "⭐", label: "Pts totales", value: stats.totalPuntos, color: "#8b5cf6", bg: "#f3e8ff" },
              { icon: "📈", label: "Promedio", value: stats.promedio, color: "#06b6d4", bg: "#e0f2fe" },
              { icon: "🏆", label: "Mejor", value: stats.maxPuntos, color: "#f43f5e", bg: "#ffe4e6" },
            ].map((m, i) => (
              <div key={i} style={{ background: m.bg, borderRadius: "14px", padding: "1rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem" }}>{m.icon}</div>
                <div style={{ fontSize: "1.3rem", fontWeight: "900", color: m.color, marginTop: "0.25rem" }}>{m.value}</div>
                <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: "0.2rem" }}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{ ...s.card, marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <p style={{ margin: 0, fontWeight: "800", color: "#1e1b4b" }}>Nivel de dominio</p>
              <span style={{ fontWeight: "700", color: "#6366f1" }}>{stats.precision}%</span>
            </div>
            <div style={{ height: "12px", background: "#e5e7eb", borderRadius: "6px", overflow: "hidden", marginBottom: "0.5rem" }}>
              <div style={{ height: "100%", width: `${stats.precision}%`, background: stats.precision >= 70 ? "linear-gradient(90deg,#22c55e,#16a34a)" : stats.precision >= 40 ? "linear-gradient(90deg,#f59e0b,#d97706)" : "linear-gradient(90deg,#ef4444,#dc2626)", borderRadius: "6px", transition: "width 0.8s" }} />
            </div>
            <p style={{ margin: 0, fontSize: "0.83rem", color: "#6b7280", textAlign: "center" }}>
              {stats.precision >= 70 ? "🏆 ¡Experto! Dominas el tema" : stats.precision >= 40 ? "📈 Intermedio — sigue practicando" : "💪 Principiante — ¡tú puedes!"}
            </p>
          </div>
          <div style={s.card}>
            <p style={{ margin: "0 0 1rem", fontWeight: "800", color: "#1e1b4b" }}>Últimas sesiones</p>
            {sesiones.map((ses, i) => {
              const pct = ses.respondidas > 0 ? Math.round((ses.correctas / ses.respondidas) * 100) : 0;
              return (
                <div key={ses.id} style={{ padding: "0.85rem", borderRadius: "12px", background: i % 2 === 0 ? "#f8fafc" : "#fff", marginBottom: "0.4rem", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #f0f0f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "1.4rem" }}>{i < 3 && ses.estado === "completada" ? medallas[i] : "🎮"}</span>
                    <div>
                      <p style={{ margin: 0, fontWeight: "700", color: "#1e1b4b", fontSize: "0.88rem" }}>{formatFecha(ses.iniciada_en)} · {formatTiempo(ses.iniciada_en)}</p>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280" }}>{ses.correctas}/{ses.respondidas} correctas · {pct}% precisión</p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontWeight: "900", color: "#6366f1", fontSize: "1.1rem" }}>⭐ {ses.puntuacion}</p>
                    <span style={{ fontSize: "0.72rem", color: ses.estado === "completada" ? "#22c55e" : "#f59e0b", fontWeight: "700" }}>{ses.estado}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ ...s.card, textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>🎮</div>
          <p style={{ color: "#374151", fontWeight: "700", fontSize: "1rem" }}>Aún no tienes estadísticas</p>
          <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>¡Juega tu primera sesión para ver tus resultados!</p>
        </div>
      )}
    </div>
  );
}

function AdminView() {
  const admin = useAdmin();
  const [seccion, setSeccion] = useState("preguntas");
  useEffect(() => { admin.cargarCategorias(); admin.cargarPreguntas(); }, []);
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      {admin.mensaje && (
        <div style={{ position: "fixed", top: "80px", right: "20px", background: admin.mensaje.tipo === "error" ? "#fee2e2" : "#dcfce7", color: admin.mensaje.tipo === "error" ? "#991b1b" : "#166534", padding: "0.75rem 1.25rem", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", fontWeight: "700", zIndex: 100, fontSize: "0.9rem" }}>
          {admin.mensaje.tipo === "error" ? "❌" : "✅"} {admin.mensaje.texto}
        </div>
      )}
      <div style={{ display: "flex", background: "#f3f4f6", borderRadius: "12px", padding: "4px", marginBottom: "1.5rem", width: "fit-content" }}>
        {[["preguntas", "📝 Preguntas"], ["categorias", "📂 Categorías"]].map(([key, label]) => (
          <button key={key} style={{ padding: "0.6rem 1.5rem", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "0.9rem", background: seccion === key ? "#fff" : "transparent", color: seccion === key ? "#6366f1" : "#6b7280", boxShadow: seccion === key ? "0 2px 8px rgba(0,0,0,0.1)" : "none" }} onClick={() => setSeccion(key)}>{label}</button>
        ))}
      </div>
      {seccion === "preguntas" && <AdminPreguntas admin={admin} />}
      {seccion === "categorias" && <AdminCategorias admin={admin} />}
    </div>
  );
}

function AdminPreguntas({ admin }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [enunciado, setEnunciado] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [dificultad, setDificultad] = useState("media");
  const [opciones, setOpciones] = useState([{ texto: "", es_correcta: true }, { texto: "", es_correcta: false }, { texto: "", es_correcta: false }, { texto: "", es_correcta: false }]);
  const [filtro, setFiltro] = useState("");
  const actualizarOpcion = (i, campo, valor) => {
    const nuevas = [...opciones];
    if (campo === "es_correcta") { nuevas.forEach((o, idx) => o.es_correcta = idx === i); }
    else { nuevas[i][campo] = valor; }
    setOpciones([...nuevas]);
  };
  const guardar = async () => {
    if (!enunciado.trim()) { alert("Escribe el enunciado"); return; }
    if (!categoriaId) { alert("Selecciona una categoría"); return; }
    if (opciones.some(o => !o.texto.trim())) { alert("Completa todas las opciones"); return; }
    const ok = await admin.crearPregunta({ enunciado, categoria_id: parseInt(categoriaId), dificultad, opciones: opciones.map((o, i) => ({ texto: o.texto, es_correcta: o.es_correcta, orden: i })) });
    if (ok) { setMostrarForm(false); setEnunciado(""); setOpciones([{ texto: "", es_correcta: true }, { texto: "", es_correcta: false }, { texto: "", es_correcta: false }, { texto: "", es_correcta: false }]); }
  };
  const preguntasFiltradas = filtro ? admin.preguntas.filter(p => p.categoria_id === parseInt(filtro)) : admin.preguntas;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: "#1e1b4b", fontSize: "1.2rem", fontWeight: "800" }}>Banco de preguntas ({preguntasFiltradas.length})</h2>
        <button style={{ ...s.btnPrimary, width: "auto", padding: "0.5rem 1.25rem" }} onClick={() => setMostrarForm(!mostrarForm)}>{mostrarForm ? "✕ Cancelar" : "+ Nueva pregunta"}</button>
      </div>
      <select style={{ ...s.input, marginBottom: "1rem" }} value={filtro} onChange={e => setFiltro(e.target.value)}>
        <option value="">Todas las categorías</option>
        {admin.categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      {mostrarForm && (
        <div style={{ ...s.card, marginBottom: "1.5rem", border: "2px solid #6366f1" }}>
          <h3 style={{ margin: "0 0 1rem", color: "#1e1b4b", fontWeight: "800" }}>Nueva pregunta</h3>
          <textarea style={{ ...s.input, minHeight: "80px", resize: "vertical" }} placeholder="Escribe el enunciado de la pregunta..." value={enunciado} onChange={e => setEnunciado(e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", margin: "0.75rem 0" }}>
            <select style={s.input} value={categoriaId} onChange={e => setCategoriaId(e.target.value)}>
              <option value="">Selecciona categoría</option>
              {admin.categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <select style={s.input} value={dificultad} onChange={e => setDificultad(e.target.value)}>
              <option value="facil">🟢 Fácil (+10 pts)</option>
              <option value="media">🟡 Media (+20 pts)</option>
              <option value="dificil">🔴 Difícil (+30 pts)</option>
            </select>
          </div>
          <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0.5rem 0" }}>Marca el círculo de la respuesta correcta:</p>
          {opciones.map((op, i) => (
            <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
              <input type="radio" name="correcta" checked={op.es_correcta} onChange={() => actualizarOpcion(i, "es_correcta", true)} style={{ accentColor: "#6366f1", width: "18px", height: "18px", cursor: "pointer" }} />
              <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder={`Opción ${["A", "B", "C", "D"][i]}`} value={op.texto} onChange={e => actualizarOpcion(i, "texto", e.target.value)} />
            </div>
          ))}
          <button style={{ ...s.btnPrimary, marginTop: "1rem" }} onClick={guardar}>💾 Guardar pregunta</button>
        </div>
      )}
      {admin.loading ? <p style={{ color: "#6b7280", textAlign: "center", padding: "2rem" }}>⏳ Cargando...</p>
        : preguntasFiltradas.length === 0 ? <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}><div style={{ fontSize: "3rem" }}>📝</div><p>No hay preguntas.</p></div>
        : preguntasFiltradas.map(p => (
          <div key={p.id} style={{ ...s.card, marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, marginRight: "1rem" }}>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                <span style={{ background: "#ede9fe", color: "#6366f1", padding: "3px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "700" }}>{admin.categorias.find(c => c.id === p.categoria_id)?.nombre || "—"}</span>
                <span style={{ background: { facil: "#dcfce7", media: "#fef9c3", dificil: "#fee2e2" }[p.dificultad], color: { facil: "#166534", media: "#854d0e", dificil: "#991b1b" }[p.dificultad], padding: "3px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "700" }}>{p.dificultad}</span>
              </div>
              <p style={{ margin: "0 0 0.5rem", fontWeight: "700", color: "#1e1b4b" }}>{p.enunciado}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {p.opciones.map(o => <span key={o.id} style={{ fontSize: "0.78rem", padding: "3px 10px", borderRadius: "20px", background: "#f3f4f6", color: "#374151" }}>{o.texto}</span>)}
              </div>
            </div>
            <button onClick={() => admin.eliminarPregunta(p.id)} style={{ background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: "10px", padding: "0.5rem 0.85rem", cursor: "pointer", fontWeight: "700", fontSize: "0.85rem", whiteSpace: "nowrap" }}>🗑 Eliminar</button>
          </div>
        ))}
    </div>
  );
}

function AdminCategorias({ admin }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const guardar = async () => {
    if (!nombre.trim()) { alert("Escribe el nombre"); return; }
    await admin.crearCategoria(nombre, descripcion);
    setNombre(""); setDescripcion(""); setMostrarForm(false);
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: "#1e1b4b", fontSize: "1.2rem", fontWeight: "800" }}>Categorías ({admin.categorias.length})</h2>
        <button style={{ ...s.btnPrimary, width: "auto", padding: "0.5rem 1.25rem" }} onClick={() => setMostrarForm(!mostrarForm)}>{mostrarForm ? "✕ Cancelar" : "+ Nueva categoría"}</button>
      </div>
      {mostrarForm && (
        <div style={{ ...s.card, marginBottom: "1.5rem", border: "2px solid #6366f1" }}>
          <h3 style={{ margin: "0 0 1rem", color: "#1e1b4b", fontWeight: "800" }}>Nueva categoría</h3>
          <input style={s.input} placeholder="Nombre de la categoría" value={nombre} onChange={e => setNombre(e.target.value)} />
          <input style={s.input} placeholder="Descripción (opcional)" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
          <button style={{ ...s.btnPrimary, marginTop: "0.5rem" }} onClick={guardar}>💾 Guardar categoría</button>
        </div>
      )}
      {admin.categorias.length === 0 ? <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}><div style={{ fontSize: "3rem" }}>📂</div><p>No hay categorías.</p></div>
        : admin.categorias.map((c, i) => {
          const col = catColors[i % catColors.length];
          return (
            <div key={c.id} style={{ background: col.bg, borderRadius: "14px", padding: "1rem 1.25rem", marginBottom: "0.6rem", display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${col.border}33` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "1.5rem" }}>{getCatIcon(c.nombre)}</span>
                <div>
                  <p style={{ margin: "0 0 0.1rem", fontWeight: "800", color: col.text }}>{c.nombre}</p>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: col.text, opacity: 0.7 }}>{c.descripcion || "Sin descripción"}</p>
                </div>
              </div>
              <button onClick={() => admin.eliminarCategoria(c.id)} style={{ background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: "10px", padding: "0.5rem 0.85rem", cursor: "pointer", fontWeight: "700", fontSize: "0.85rem" }}>🗑</button>
            </div>
          );
        })}
    </div>
  );
}

function Navbar({ user, onLogout, onHome, onAdmin, onStats }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1.5rem", background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", flexWrap: "wrap", gap: "0.5rem", position: "sticky", top: 0, zIndex: 50 }}>
      <span onClick={onHome} style={{ fontWeight: "900", fontSize: "1.1rem", color: "#1e1b4b", cursor: "pointer" }}>🎯 QuizMaster IA</span>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={onStats} style={{ padding: "0.4rem 0.9rem", border: "1.5px solid #e5e7eb", borderRadius: "20px", background: "#fff", cursor: "pointer", color: "#374151", fontWeight: "600", fontSize: "0.85rem" }}>📊 Stats</button>
        {user.rol === "administrador" && <button onClick={onAdmin} style={{ padding: "0.4rem 0.9rem", border: "none", borderRadius: "20px", background: "#ede9fe", cursor: "pointer", color: "#6366f1", fontWeight: "700", fontSize: "0.85rem" }}>⚙️ Admin</button>}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#f8fafc", padding: "0.3rem 0.75rem", borderRadius: "20px" }}>
          <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "800", fontSize: "0.8rem" }}>{user.nombre.charAt(0).toUpperCase()}</div>
          <span style={{ color: "#374151", fontSize: "0.85rem", fontWeight: "600" }}>{user.nombre.split(" ")[0]}</span>
        </div>
        <button onClick={onLogout} style={{ padding: "0.4rem 0.9rem", border: "1.5px solid #fecaca", borderRadius: "20px", background: "#fff", cursor: "pointer", color: "#ef4444", fontWeight: "600", fontSize: "0.85rem" }}>Salir</button>
      </div>
    </div>
  );
}

export default function App() {
  const auth = useAuth();
  const game = useGame();
  const [view, setView] = useState("home");
  if (!auth.user) return <AuthView onAuth={auth} />;
  const goHome = () => { game.resetGame(); setView("home"); };
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Navbar user={auth.user} onLogout={auth.logout} onHome={goHome} onAdmin={() => setView("admin")} onStats={() => setView("stats")} />
      {view === "home" && <CategoryView categorias={game.categorias} onLoad={game.cargarCategorias} user={auth.user} onSelect={async (id) => { await game.iniciar(id); setView("game"); }} />}
      {view === "game" && <GameView sesion={game.sesion} resultado={game.resultado} selected={game.selected} loading={game.loading} historial={game.historial} recs={game.recs} onResponder={game.responder} onSiguiente={game.siguiente} onFin={goHome} />}
      {view === "admin" && <AdminView />}
      {view === "stats" && <StatsView user={auth.user} />}
    </div>
  );
}

const s = {
  input: { padding: "0.75rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: "10px", fontSize: "0.95rem", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", marginBottom: "0.5rem" },
  btnPrimary: { padding: "0.8rem", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "700", fontSize: "1rem", width: "100%", boxShadow: "0 4px 15px rgba(99,102,241,0.35)" },
  card: { background: "#fff", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" },
};
