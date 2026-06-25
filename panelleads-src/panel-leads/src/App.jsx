import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabaseClient";
import { LOGO } from "./logo";
import * as XLSX from "xlsx";

// ── Exportar a Excel ─────────────────────────────────────────────────
function exportarExcel({ leads, empresas, resumen, conVendedor, archivo }) {
  const wb = XLSX.utils.book_new();
  const leadsRows = (leads || []).map((l) => ({
    Nombre: l.nombre || "", Contacto: l.contacto || "", Medio: MED[l.medio]?.label || l.medio,
    Asesor: l.operador || "", Cotizada: l.cotizada ? "Sí" : "No", ...(conVendedor ? { Vendedor: l.vendedorNombre } : {}), Mes: labelDe(l.mes),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(leadsRows), "Leads");
  if (empresas) {
    const empRows = empresas.map((e) => ({
      Empresa: e.nombre, "Contacto/s": e.contactos || "", CUIT: e.cuit || "",
      Unidades: e.unidades, "Presupuestos nuevos": e.presupuestos_nuevos, ...(conVendedor ? { Vendedor: e.vendedorNombre } : {}),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(empRows), "Empresas activas");
  }
  if (resumen) {
    const r = resumen.map((d) => ({
      Mes: d.label,
      Info: d.info, "Mail corpo": d.mail_corpo, "Waalaxy/FML": d.waalaxy_fml,
      "Tablet part.": d.tablet_part, "Tablet corpo": d.tablet_corpo,
      Corporativos: d.corp, Particulares: d.part, Total: d.total,
      "Interac. CRM": d.crm, Inversión: d.inv,
      "Costo total": d.costo, "Costo particular": d.costoPart, "Costo corpo": d.costoCorp,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r), "Resumen mensual");
  }
  XLSX.writeFile(wb, archivo);
}

// ── Paleta / Temas día-noche ─────────────────────────────────────────
const TEMAS = {
  dia: {
    paper: "#F5F7F9", card: "#FFFFFF", ink: "#16324F", muted: "#6B7585",
    line: "#E3E8EE", blue: "#2563C9", gold: "#C8932B", teal: "#2C9A92", green: "#4FA45C", red: "#C0392B",
    input: "#FFFFFF", loginBg: "linear-gradient(135deg,#E9F1F7 0%,#EAF6EF 100%)", zebra: "#F8FAFC",
  },
  noche: {
    paper: "#0F1822", card: "#17222F", ink: "#E8EDF2", muted: "#90A0B0",
    line: "#27384A", blue: "#5B8DEF", gold: "#E0B25A", teal: "#48C2B6", green: "#5FC06E", red: "#E0685C",
    input: "#0F1822", loginBg: "linear-gradient(135deg,#0F1822 0%,#12211F 100%)", zebra: "#1B2836",
  },
};
let T = TEMAS.dia; // tema actual (App lo reasigna en cada render)
const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// ── Medios (canal por el que se consiguió el lead) ───────────────────
const MEDIOS = [
  { key: "infoRenting",        label: "Info Renting",          grupo: "part", kw: ["info renting", "renting"] },
  { key: "waalax",             label: "LinkedIn / Walaxy-FML", grupo: "corp", kw: ["linkedin seba", "linkedin", "seba", "walaxi/fml", "walaxi", "waalax", "walax", "fml"] },
  { key: "empresasDarwin",     label: "Empresas Darwin",       grupo: "corp", kw: ["empresas darwin", "empresa darwin", "empresas"] },
  { key: "particularesDarwin", label: "Particulares Darwin",   grupo: "part", kw: ["particulares darwin", "particular darwin", "particulares", "darwin"] },
  { key: "emailsDerivar",      label: "Emails Derivar (front)",grupo: "corp", kw: ["emails derivar", "email derivar", "derivar", "front"] },
];
const MED = MEDIOS.reduce((a, c) => ((a[c.key] = c), a), {});
const grupoDe = (k) => MED[k]?.grupo;
const colorDe = (k) => { const g = grupoDe(k); return g === "part" ? T.blue : g === "corp" ? T.gold : T.muted; };
const PART_KEYS = MEDIOS.filter((m) => m.grupo === "part").map((m) => m.key);
const CORP_KEYS = MEDIOS.filter((m) => m.grupo === "corp").map((m) => m.key);

// ── Meses ────────────────────────────────────────────────────────────
function generarMeses() {
  const LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const hoy = new Date();
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + (hoy.getDate() >= 15 ? 1 : 0), 1);
  const result = [];
  let y = 2020, m = 1;
  while (y < fin.getFullYear() || (y === fin.getFullYear() && m <= fin.getMonth() + 1)) {
    result.push({ key: `${y}-${String(m).padStart(2,"0")}`, label: `${LABELS[m-1]} ${y}` });
    if (++m > 12) { m = 1; y++; }
  }
  return result;
}
const MESES = generarMeses();
const MES_ACTUAL = MESES[MESES.length - 1]?.key ?? "2026-06";
// Desde este mes en adelante el tablero cuenta leads reales cargados por los
// vendedores. Los meses anteriores conservan el histórico viejo (reporte_mensual).
const CORTE_REAL = (() => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`; })();
const nf = new Intl.NumberFormat("es-AR");
const cf = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const labelDe = (k) => MESES.find((m) => m.key === k)?.label ?? k;

function contarPorMes(leadsArr) {
  return MESES.map((m) => {
    const ms = leadsArr.filter((l) => l.mes === m.key);
    const o = { key: m.key, label: m.label, total: ms.length };
    MEDIOS.forEach((c) => (o[c.key] = ms.reduce((a, l) => a + (l.medio === c.key ? 1 : 0), 0)));
    o.part = PART_KEYS.reduce((a, k) => a + o[k], 0);
    o.corp = CORP_KEYS.reduce((a, k) => a + o[k], 0);
    o.cotizadas = ms.reduce((a, l) => a + (l.cotizada ? 1 : 0), 0);
    return o;
  });
}

// ── Parser ───────────────────────────────────────────────────────────
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE = /\+?\d[\d\s().-]{6,}\d/;
const FREE = ["gmail", "hotmail", "yahoo", "outlook", "live", "icloud", "proton"];
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function clasificar(line, defMedio) {
  let resto = " " + line + " ";
  const em = resto.match(EMAIL_RE);
  const email = em ? em[0] : "";
  if (email) resto = resto.replace(email, " ");
  const ph = resto.match(PHONE_RE);
  const phone = ph ? ph[0].trim() : "";
  if (phone) resto = resto.replace(ph[0], " ");
  let medio = "", source = "";
  const low = resto.toLowerCase();
  for (const c of MEDIOS) {
    const k = c.kw.find((kw) => low.includes(kw));
    if (k) { medio = c.key; source = "etiqueta"; resto = resto.replace(new RegExp(escRe(k), "i"), " "); break; }
  }
  if (!medio) {
    if (defMedio) { medio = defMedio; source = "defecto"; }
    else {
      const host = (email.split("@")[1] || "").toLowerCase();
      medio = (email && !FREE.some((f) => host.includes(f))) ? "empresasDarwin" : "particularesDarwin";
      source = "auto";
    }
  }
  const nombre = resto.replace(/[,;|/]+/g, " ").replace(/\s+/g, " ").trim();
  const contacto = email ? email.toLowerCase() : phone;
  return { nombre, contacto, medio, source, cotizada: false };
}
function procesar(texto, defMedio) {
  const rows = [];
  const vistos = new Set();
  let ignoradas = 0;
  texto.split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    const r = clasificar(line, defMedio);
    if (!r.nombre && !r.contacto) { ignoradas++; return; }
    const clave = r.contacto || (r.nombre.toLowerCase() + "|" + r.medio);
    if (vistos.has(clave)) return;
    vistos.add(clave);
    rows.push(r);
  });
  return { rows, ignoradas };
}
const EJEMPLO = [
  "Transportes SA, compras@transportes.com.ar, empresas darwin",
  "Juan Pérez  11 2345-6789  particulares darwin",
  "Consulta web, info renting",
  "contacto@constructora.com  linkedin seba",
  "María González (solo nombre)",
  "derivado@frontdesk.com, emails derivar",
].join("\n");

// ── UI helpers ───────────────────────────────────────────────────────
function Card({ children, style, className }) {
  return <div className={className} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, ...style }}>{children}</div>;
}
function Eyebrow({ children }) {
  return <div className="uppercase" style={{ color: T.muted, fontSize: 11, letterSpacing: "0.12em", fontWeight: 600 }}>{children}</div>;
}

// ── App raíz ─────────────────────────────────────────────────────────
export default function App() {
  const [tema, setTema] = useState(() => (typeof localStorage !== "undefined" && localStorage.getItem("leadadmin-tema")) || "dia");
  T = TEMAS[tema] || TEMAS.dia;
  const cambiarTema = () => { const n = tema === "dia" ? "noche" : "dia"; setTema(n); try { localStorage.setItem("leadadmin-tema", n); } catch (e) {} };
  const temaProps = { tema, cambiarTema };

  const [cargando, setCargando] = useState(true);
  const [splash, setSplash] = useState(true);
  const [sesion, setSesion] = useState(null);
  const [datos, setDatos] = useState({ leads: [], inversion: {}, crm: {}, vendedores: [], usuarios: [], empresas: [], reporte: {} });

  useEffect(() => {
    let t = setTimeout(() => setSplash(false), 3000);
    // Reaparece al reabrir la app desde segundo plano (PWA instalada)
    let oculta = Date.now();
    const onVis = () => {
      if (document.visibilityState === "hidden") { oculta = Date.now(); return; }
      // Si estuvo cerrada/oculta más de 30s, mostramos la portada otra vez
      if (Date.now() - oculta > 30000) {
        setSplash(true);
        clearTimeout(t);
        t = setTimeout(() => setSplash(false), 3000);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearTimeout(t); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => manejarSesion(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => manejarSesion(s));
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function manejarSesion(s) {
    if (!s) { setSesion(null); setCargando(false); return; }
    const { data: perfil } = await supabase.from("profiles").select("*").eq("id", s.user.id).single();
    setSesion({ user: s.user, perfil });
    setCargando(false);
  }

  const cargarDatos = useCallback(async () => {
    if (!sesion) return;
    const full = sesion.perfil?.rol === "jefe" || sesion.perfil?.rol === "admin";
    const [{ data: leads }, { data: inv }, { data: crm }, { data: profs }, { data: emp }, { data: rep }] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("inversion").select("*"),
      supabase.from("interacciones_crm").select("*"),
      full ? supabase.from("profiles").select("id,nombre,apellido,usuario,email,rol") : Promise.resolve({ data: [sesion.perfil] }),
      supabase.from("empresas_activas").select("*").order("created_at", { ascending: false }),
      full ? supabase.from("reporte_mensual").select("*") : Promise.resolve({ data: [] }),
    ]);
    const mapaNombre = {};
    (profs || []).forEach((p) => (mapaNombre[p.id] = `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim()));
    const invMap = {}; (inv || []).forEach((r) => (invMap[r.mes] = Number(r.monto)));
    const crmMap = {}; (crm || []).forEach((r) => (crmMap[`${r.vendedor_id}::${r.mes}`] = r.cantidad));
    const repMap = {}; (rep || []).forEach((r) => (repMap[r.mes] = r));
    setDatos({
      leads: (leads || []).map((l) => ({ ...l, vendedorNombre: mapaNombre[l.vendedor_id] || "—" })),
      inversion: invMap, crm: crmMap,
      vendedores: (profs || []).filter((p) => p.rol === "ventas").map((p) => ({ id: p.id, nombre: `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() })),
      usuarios: profs || [],
      empresas: (emp || []).map((e) => ({ ...e, vendedorNombre: mapaNombre[e.vendedor_id] || "—" })),
      reporte: repMap,
    });
  }, [sesion]);
  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  if (splash) return <Splash />;
  if (cargando) return <Centro><p style={{ color: T.muted }}>Cargando…</p></Centro>;
  if (!sesion) return <Login {...temaProps} />;
  if (!sesion.perfil) return <Centro><p style={{ color: T.red }}>No se encontró el perfil del usuario.</p></Centro>;
  const props = { sesion, datos, recargar: cargarDatos, salir: () => supabase.auth.signOut(), ...temaProps };
  const full = sesion.perfil.rol === "jefe" || sesion.perfil.rol === "admin";
  return full ? <PanelJefe {...props} /> : <PanelVentas {...props} />;
}
function Centro({ children }) {
  return <div style={{ fontFamily: FONT, background: T.paper, minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>;
}

function Splash() {
  return (
    <div style={{ fontFamily: FONT, background: "#16324F", minHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24, overflow: "hidden" }}>
      <style>{`
        @keyframes splashPop { 0% { opacity: 0; transform: scale(.6); } 55% { opacity: 1; transform: scale(1.08); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes splashUp { 0% { opacity: 0; transform: translateY(24px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes splashGlow { 0%,100% { text-shadow: 0 0 14px rgba(255,255,255,.25); } 50% { text-shadow: 0 0 26px rgba(255,255,255,.55); } }
      `}</style>
      <img src={LOGO} alt="LeadAdmin" style={{ height: 120, maxWidth: "70%", objectFit: "contain", animation: "splashPop .9s cubic-bezier(.18,.89,.32,1.28) both" }} />
      <div style={{ marginTop: 28, color: "#fff", fontSize: "clamp(30px, 9vw, 64px)", fontWeight: 900, letterSpacing: 1, lineHeight: 1.05, animation: "splashUp .7s ease-out .5s both, splashGlow 2s ease-in-out 1.2s infinite" }}>
        SE PUEDE<br />ALQUILAR
      </div>
    </div>
  );
}

// ── LOGIN ────────────────────────────────────────────────────────────
function Login({ tema, cambiarTema }) {
  const [modo, setModo] = useState("ingresar");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [funcion, setFuncion] = useState("ventas");
  const [asesoresSel, setAsesoresSel] = useState([]);
  const [asesores, setAsesores] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (modo !== "registrar") return;
    supabase.rpc("operadores_disponibles").then(({ data }) => setAsesores(data || []));
  }, [modo]);

  async function ingresar() {
    setBusy(true); setError("");
    let correo = usuario.trim();
    if (!correo.includes("@")) {
      const { data, error } = await supabase.rpc("email_por_usuario", { p_usuario: correo });
      if (error || !data) { setBusy(false); setError("Usuario o contraseña incorrectos."); return; }
      correo = data;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password });
    if (error) setError("Usuario o contraseña incorrectos.");
    setBusy(false);
  }
  async function registrar() {
    const u = usuario.trim().toLowerCase();
    const correo = email.trim().toLowerCase();
    if (!nombre || !apellido || !u || !password || !correo) { setError("Completá todos los campos."); return; }
    if (u.length < 4) { setError("El usuario debe tener al menos 4 caracteres."); return; }
    if (password.length < 4) { setError("La contraseña debe tener al menos 4 caracteres."); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) { setError("Ingresá un email válido."); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "apikey": SUPABASE_ANON_KEY },
        body: JSON.stringify({ nombre: nombre.trim(), apellido: apellido.trim(), usuario: u, email: correo, password, funcion, asesores: funcion === "ventas" ? asesoresSel : [] }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) { setBusy(false); setError(out.error || "No se pudo crear la cuenta."); return; }
    } catch (e) { setBusy(false); setError("No se pudo conectar con el servidor."); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password });
    if (error) setError("Cuenta creada. Probá ingresar con tu usuario.");
    setBusy(false);
  }

  return (
    <div style={{ fontFamily: FONT, color: T.ink, minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: T.loginBg }}>
      <Card style={{ padding: 28, width: "100%", maxWidth: 390, boxShadow: "0 12px 40px rgba(0,0,0,0.12)", position: "relative" }}>
        <button onClick={cambiarTema} title="Cambiar tema" style={{ position: "absolute", top: 16, right: 16, border: `1px solid ${T.line}`, background: "transparent", borderRadius: 8, cursor: "pointer", fontSize: 15, padding: "3px 8px" }}>{tema === "dia" ? "🌙" : "☀️"}</button>
        <img src={LOGO} alt="LeadAdmin" style={{ display: "block", height: 54, margin: "0 auto 8px" }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", textAlign: "center" }}>{modo === "ingresar" ? "Ingresar" : "Crear cuenta"}</h1>
        <div className="mt-5 grid gap-3">
          {modo === "registrar" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre"><Txt value={nombre} onChange={setNombre} /></Field>
              <Field label="Apellido"><Txt value={apellido} onChange={setApellido} /></Field>
            </div>
          )}
          {modo === "registrar" && <Field label="Email (real)"><Txt value={email} onChange={setEmail} type="email" /></Field>}
          <Field label="Usuario"><Txt value={usuario} onChange={setUsuario} /></Field>
          <Field label="Contraseña"><Txt value={password} onChange={setPassword} type="password" /></Field>
          {modo === "registrar" && <p style={{ color: T.muted, fontSize: 11.5, marginTop: -4 }}>Después entrás con tu usuario (no con el email). Mínimo 4 caracteres.</p>}
          {modo === "registrar" && <Field label="Función"><Select value={funcion} onChange={setFuncion} options={[["ventas", "Ventas"], ["jefe", "Jefe"], ["admin", "Administrador"]]} /></Field>}
          {modo === "registrar" && funcion === "ventas" && (
            <Field label="¿Qué asesores sos? (podés elegir varios)">
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 168, overflowY: "auto", border: `1px solid ${T.line}`, borderRadius: 10, padding: 10, background: T.input }}>
                {asesores.length === 0 && <span style={{ color: T.muted, fontSize: 12.5 }}>No hay asesores disponibles para reclamar.</span>}
                {asesores.map((a) => {
                  const checked = asesoresSel.includes(a.operador);
                  return (
                    <label key={a.operador} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: T.ink, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setAsesoresSel((prev) => e.target.checked ? [...prev, a.operador] : prev.filter((x) => x !== a.operador))}
                        style={{ width: 16, height: 16, accentColor: T.blue, cursor: "pointer" }}
                      />
                      <span style={{ fontWeight: 600 }}>{a.operador}</span>
                      <span style={{ color: T.muted }}>· {a.cantidad} leads</span>
                    </label>
                  );
                })}
              </div>
            </Field>
          )}
          {modo === "registrar" && funcion === "ventas" && <p style={{ color: T.muted, fontSize: 11.5, marginTop: -4 }}>Tildá todos los nombres con los que cargaste leads. Esos leads históricos quedan asignados a tu cuenta.</p>}
          {error && <div style={{ color: T.red, fontSize: 13, fontWeight: 600 }}>{error}</div>}
          <button disabled={busy} onClick={() => (modo === "ingresar" ? ingresar() : registrar())} className="py-3" style={{ background: T.blue, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? "…" : modo === "ingresar" ? "Ingresar" : "Registrarme"}</button>
          <button onClick={() => { setModo(modo === "ingresar" ? "registrar" : "ingresar"); setError(""); setAsesoresSel([]); }} style={{ background: "transparent", color: T.muted, border: "none", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>{modo === "ingresar" ? "No tengo cuenta · Registrarme" : "Ya tengo cuenta · Ingresar"}</button>
        </div>
      </Card>
    </div>
  );
}

// ── Barra superior ───────────────────────────────────────────────────
function Topbar({ perfil, salir, tabs, vista, setVista, tema, cambiarTema }) {
  const rolLabel = { jefe: "Jefe", admin: "Administrador", ventas: "Vendedor" }[perfil.rol] || "";
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <img src={LOGO} alt="LeadAdmin" style={{ height: 34 }} />
        <div style={{ borderLeft: `1px solid ${T.line}`, paddingLeft: 12 }}>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{rolLabel}</div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{perfil.nombre} {perfil.apellido}</div>
        </div>
      </div>
      <div className="no-print flex flex-wrap items-center gap-2">
        {tabs && (
          <div className="flex flex-wrap" style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: 4 }}>
            {tabs.map(([k, lbl]) => {
              const on = vista === k;
              return <button key={k} onClick={() => setVista(k)} className="px-4 py-2" style={{ border: "none", cursor: "pointer", borderRadius: 9, fontSize: 13.5, fontWeight: 600, background: on ? T.blue : "transparent", color: on ? "#fff" : T.muted }}>{lbl}</button>;
            })}
          </div>
        )}
        <button onClick={cambiarTema} title="Cambiar tema" style={{ background: "transparent", color: T.ink, border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", padding: "8px 12px" }}>{tema === "dia" ? "🌙" : "☀️"}</button>
        <button onClick={salir} className="px-4 py-2.5" style={{ background: "transparent", color: T.ink, border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Salir</button>
      </div>
    </div>
  );
}

// ── Resumen mensual ──────────────────────────────────────────────────
function ResumenMensual({ filas, extras }) {
  const cols = MEDIOS.map((m) => [m.key, m.label]);
  return (
    <Card style={{ padding: 20, overflowX: "auto" }}>
      <Eyebrow>Resumen mensual</Eyebrow>
      <table className="mt-3 w-full" style={{ borderCollapse: "collapse", fontSize: 12.5, minWidth: 920 }}>
        <thead>
          <tr style={{ color: T.muted, textAlign: "right" }}>
            <th className="py-2 text-left" style={{ fontWeight: 600 }}>Mes</th>
            {cols.map(([k, h]) => <th key={k} className="py-2" style={{ fontWeight: 600, color: colorDe(k) }}>{h}</th>)}
            <th className="py-2" style={{ fontWeight: 700, color: T.gold }}>Corporativos</th>
            <th className="py-2" style={{ fontWeight: 700, color: T.blue }}>Particulares</th>
            <th className="py-2" style={{ fontWeight: 700 }}>Total</th>
            {extras.map((e, i) => <th key={i} className="py-2" style={{ fontWeight: 600 }}>{e.head}</th>)}
          </tr>
        </thead>
        <tbody>
          {filas.map((d) => (
            <tr key={d.key} style={{ borderTop: `1px solid ${T.line}`, textAlign: "right" }}>
              <td className="py-2 text-left" style={{ fontWeight: 600 }}>{d.label}</td>
              {cols.map(([k]) => <td key={k} className="py-2 tabular-nums">{nf.format(d[k])}</td>)}
              <td className="py-2 tabular-nums" style={{ fontWeight: 700, color: T.gold }}>{nf.format(d.corp)}</td>
              <td className="py-2 tabular-nums" style={{ fontWeight: 700, color: T.blue }}>{nf.format(d.part)}</td>
              <td className="py-2 tabular-nums" style={{ fontWeight: 700 }}>{nf.format(d.total)}</td>
              {extras.map((e, i) => <td key={i} className="py-2 tabular-nums" style={e.style}>{e.render(d)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ── Lista de leads ───────────────────────────────────────────────────
function ListaLeads({ filas, conVendedor, onDelete, onSave, tope = 50 }) {
  const [editId, setEditId] = useState(null);
  const [d, setD] = useState({});
  const [pag, setPag] = useState(0);
  const totalPags = Math.max(1, Math.ceil(filas.length / tope));
  useEffect(() => { setPag((p) => Math.min(p, totalPags - 1)); }, [totalPags]);
  const visibles = filas.slice(pag * tope, pag * tope + tope);
  const ei = { width: "100%", border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 12, padding: "3px 5px", fontFamily: FONT, background: T.input, color: T.ink, outline: "none" };
  function abrir(l) { setEditId(l.id); setD({ nombre: l.nombre || "", contacto: l.contacto || "", medio: l.medio, operador: l.operador || "", cotizada: !!l.cotizada, mes: l.mes }); }
  async function guardar() { await onSave(editId, { nombre: d.nombre.trim() || null, contacto: d.contacto.trim() || null, medio: d.medio, operador: (d.operador || "").trim() || null, cotizada: d.cotizada, mes: d.mes }); setEditId(null); }
  const acc = onSave || onDelete;
  return (
    <Card style={{ padding: 20, overflowX: "auto" }}>
      <Eyebrow>Leads</Eyebrow>
      <table className="mt-3 w-full" style={{ borderCollapse: "collapse", fontSize: 13, minWidth: conVendedor ? 760 : 600 }}>
        <thead><tr style={{ color: T.muted, textAlign: "left" }}>
          <th className="py-2" style={{ fontWeight: 600 }}>Nombre</th><th className="py-2" style={{ fontWeight: 600 }}>Contacto</th>
          <th className="py-2" style={{ fontWeight: 600 }}>Medio</th><th className="py-2" style={{ fontWeight: 600 }}>Asesor</th><th className="py-2" style={{ fontWeight: 600 }}>Cotizada</th>
          {conVendedor && <th className="py-2" style={{ fontWeight: 600 }}>Vendedor</th>}<th className="py-2" style={{ fontWeight: 600 }}>Mes</th>
          {acc && <th></th>}
        </tr></thead>
        <tbody>{visibles.map((l) => editId === l.id ? (
          <tr key={l.id} style={{ borderTop: `1px solid ${T.line}` }}>
            <td className="py-2"><input value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} style={ei} /></td>
            <td className="py-2"><input value={d.contacto} onChange={(e) => setD({ ...d, contacto: e.target.value })} style={ei} /></td>
            <td className="py-2"><select value={d.medio} onChange={(e) => setD({ ...d, medio: e.target.value })} style={ei}>{MEDIOS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></td>
            <td className="py-2"><input value={d.operador} onChange={(e) => setD({ ...d, operador: e.target.value })} style={ei} placeholder="—" /></td>
            <td className="py-2"><select value={d.cotizada ? "si" : "no"} onChange={(e) => setD({ ...d, cotizada: e.target.value === "si" })} style={ei}><option value="no">No</option><option value="si">Sí</option></select></td>
            {conVendedor && <td className="py-2" style={{ color: T.muted }}>{l.vendedorNombre}</td>}
            <td className="py-2"><select value={d.mes} onChange={(e) => setD({ ...d, mes: e.target.value })} style={ei}>{MESES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select></td>
            <td className="py-2" style={{ whiteSpace: "nowrap" }}>
              <button onClick={guardar} style={{ border: "none", background: "transparent", color: T.green, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>✓</button>
              <button onClick={() => setEditId(null)} style={{ border: "none", background: "transparent", color: T.muted, cursor: "pointer", fontSize: 14, marginLeft: 4 }}>×</button>
            </td>
          </tr>
        ) : (
          <tr key={l.id} style={{ borderTop: `1px solid ${T.line}` }}>
            <td className="py-2">{l.nombre || <span style={{ color: T.muted }}>—</span>}</td>
            <td className="py-2">{l.contacto || <span style={{ color: T.muted }}>sin contacto</span>}</td>
            <td className="py-2"><span style={{ color: colorDe(l.medio), fontWeight: 600 }}>{MED[l.medio]?.label}</span></td>
            <td className="py-2">{l.operador || <span style={{ color: T.muted }}>—</span>}</td>
            <td className="py-2">{l.cotizada ? <span style={{ color: T.green, fontWeight: 700 }}>Sí</span> : <span style={{ color: T.muted }}>No</span>}</td>
            {conVendedor && <td className="py-2">{l.vendedorNombre}</td>}<td className="py-2">{labelDe(l.mes)}</td>
            {acc && <td className="py-2" style={{ whiteSpace: "nowrap" }}>
              {onSave && <button onClick={() => abrir(l)} style={{ border: "none", background: "transparent", color: T.blue, cursor: "pointer", fontSize: 13 }}>✏️</button>}
              {onDelete && <button onClick={() => onDelete(l.id)} style={{ border: "none", background: "transparent", color: T.red, cursor: "pointer", fontSize: 14, marginLeft: 4 }}>🗑</button>}
            </td>}
          </tr>
        ))}</tbody>
      </table>
      {filas.length > 0 && (
        <div className="mt-3" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ color: T.muted, fontSize: 12.5 }}>
            {nf.format(pag * tope + 1)}–{nf.format(Math.min((pag + 1) * tope, filas.length))} de {nf.format(filas.length)}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setPag(0)} disabled={pag === 0} style={{ border: `1px solid ${T.line}`, background: T.input, color: T.ink, borderRadius: 8, padding: "4px 9px", fontSize: 13, cursor: pag === 0 ? "default" : "pointer", opacity: pag === 0 ? 0.4 : 1 }}>«</button>
            <button onClick={() => setPag(pag - 1)} disabled={pag === 0} style={{ border: `1px solid ${T.line}`, background: T.input, color: T.ink, borderRadius: 8, padding: "4px 11px", fontSize: 13, cursor: pag === 0 ? "default" : "pointer", opacity: pag === 0 ? 0.4 : 1 }}>‹ Anterior</button>
            <span style={{ color: T.muted, fontSize: 12.5, minWidth: 92, textAlign: "center" }}>Página {pag + 1} de {totalPags}</span>
            <button onClick={() => setPag(pag + 1)} disabled={pag >= totalPags - 1} style={{ border: `1px solid ${T.line}`, background: T.input, color: T.ink, borderRadius: 8, padding: "4px 11px", fontSize: 13, cursor: pag >= totalPags - 1 ? "default" : "pointer", opacity: pag >= totalPags - 1 ? 0.4 : 1 }}>Siguiente ›</button>
            <button onClick={() => setPag(totalPags - 1)} disabled={pag >= totalPags - 1} style={{ border: `1px solid ${T.line}`, background: T.input, color: T.ink, borderRadius: 8, padding: "4px 9px", fontSize: 13, cursor: pag >= totalPags - 1 ? "default" : "pointer", opacity: pag >= totalPags - 1 ? 0.4 : 1 }}>»</button>
          </div>
        </div>
      )}
      {filas.length === 0 && <p className="mt-2" style={{ color: T.muted, fontSize: 13 }}>No hay leads con estos filtros.</p>}
    </Card>
  );
}

// ── Tabla de empresas activas ────────────────────────────────────────
function TablaEmpresas({ filas, conVendedor, onDelete, onSave }) {
  const [editId, setEditId] = useState(null);
  const [d, setD] = useState({});
  const ei = { width: "100%", border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 12, padding: "3px 5px", fontFamily: FONT, background: T.input, color: T.ink, outline: "none" };
  function abrir(e) { setEditId(e.id); setD({ nombre: e.nombre || "", contactos: e.contactos || "", cuit: e.cuit || "", unidades: e.unidades, presupuestos_nuevos: e.presupuestos_nuevos }); }
  async function guardar() { await onSave(editId, { nombre: d.nombre.trim(), contactos: d.contactos.trim() || null, cuit: d.cuit.trim() || null, unidades: Number(d.unidades) || 0, presupuestos_nuevos: Number(d.presupuestos_nuevos) || 0 }); setEditId(null); }
  const acc = onSave || onDelete;
  return (
    <Card style={{ padding: 20, overflowX: "auto" }}>
      <Eyebrow>Empresas activas</Eyebrow>
      <table className="mt-3 w-full" style={{ borderCollapse: "collapse", fontSize: 13, minWidth: conVendedor ? 880 : 760 }}>
        <thead><tr style={{ color: T.muted, textAlign: "left" }}>
          <th className="py-2" style={{ fontWeight: 600 }}>Empresa</th><th className="py-2" style={{ fontWeight: 600 }}>Contacto/s</th>
          <th className="py-2" style={{ fontWeight: 600 }}>CUIT</th>
          <th className="py-2" style={{ fontWeight: 600, textAlign: "right" }}>Unidades</th>
          <th className="py-2" style={{ fontWeight: 600, textAlign: "right" }}>Presup. nuevos</th>
          {conVendedor && <th className="py-2" style={{ fontWeight: 600 }}>Vendedor</th>}
          {acc && <th></th>}
        </tr></thead>
        <tbody>{filas.map((e) => editId === e.id ? (
          <tr key={e.id} style={{ borderTop: `1px solid ${T.line}` }}>
            <td className="py-2"><input value={d.nombre} onChange={(x) => setD({ ...d, nombre: x.target.value })} style={ei} /></td>
            <td className="py-2"><input value={d.contactos} onChange={(x) => setD({ ...d, contactos: x.target.value })} style={ei} /></td>
            <td className="py-2"><input value={d.cuit} onChange={(x) => setD({ ...d, cuit: x.target.value })} style={ei} /></td>
            <td className="py-2"><input type="number" value={d.unidades} onChange={(x) => setD({ ...d, unidades: x.target.value })} style={{ ...ei, textAlign: "right" }} /></td>
            <td className="py-2"><input type="number" value={d.presupuestos_nuevos} onChange={(x) => setD({ ...d, presupuestos_nuevos: x.target.value })} style={{ ...ei, textAlign: "right" }} /></td>
            {conVendedor && <td className="py-2" style={{ color: T.muted }}>{e.vendedorNombre}</td>}
            <td className="py-2" style={{ whiteSpace: "nowrap" }}>
              <button onClick={guardar} style={{ border: "none", background: "transparent", color: T.green, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>✓</button>
              <button onClick={() => setEditId(null)} style={{ border: "none", background: "transparent", color: T.muted, cursor: "pointer", fontSize: 14, marginLeft: 4 }}>×</button>
            </td>
          </tr>
        ) : (
          <tr key={e.id} style={{ borderTop: `1px solid ${T.line}` }}>
            <td className="py-2" style={{ fontWeight: 600 }}>{e.nombre}</td>
            <td className="py-2">{e.contactos || <span style={{ color: T.muted }}>—</span>}</td>
            <td className="py-2 tabular-nums">{e.cuit || <span style={{ color: T.muted }}>—</span>}</td>
            <td className="py-2 tabular-nums" style={{ textAlign: "right" }}>{nf.format(e.unidades)}</td>
            <td className="py-2 tabular-nums" style={{ textAlign: "right" }}>{nf.format(e.presupuestos_nuevos)}</td>
            {conVendedor && <td className="py-2">{e.vendedorNombre}</td>}
            {acc && <td className="py-2" style={{ whiteSpace: "nowrap" }}>
              {onSave && <button onClick={() => abrir(e)} style={{ border: "none", background: "transparent", color: T.blue, cursor: "pointer", fontSize: 13 }}>✏️</button>}
              {onDelete && <button onClick={() => onDelete(e.id)} style={{ border: "none", background: "transparent", color: T.red, cursor: "pointer", fontSize: 14, marginLeft: 4 }}>🗑</button>}
            </td>}
          </tr>
        ))}</tbody>
      </table>
      {filas.length === 0 && <p className="mt-2" style={{ color: T.muted, fontSize: 13 }}>Todavía no hay empresas cargadas.</p>}
    </Card>
  );
}

// ── PANEL VENTAS ─────────────────────────────────────────────────────
function PanelVentas({ sesion, datos, recargar, salir, tema, cambiarTema }) {
  const yoId = sesion.user.id;
  const [vista, setVista] = useState("cargar");
  const [mesSel, setMesSel] = useState(MES_ACTUAL);
  const [defMedio, setDefMedio] = useState("");
  const [texto, setTexto] = useState("");
  const [preview, setPreview] = useState([]);
  const [ignoradas, setIgnoradas] = useState(0);
  const [aviso, setAviso] = useState("");
  const [crmInput, setCrmInput] = useState("");
  const [avisoCrm, setAvisoCrm] = useState("");
  const [fHmes, setFHmes] = useState("todos");
  const [busy, setBusy] = useState(false);
  // empresa activa form
  const [emp, setEmp] = useState({ nombre: "", contactos: "", cuit: "", unidades: "", presupuestos_nuevos: "" });
  const [avisoEmp, setAvisoEmp] = useState("");

  function flash(s, m) { s(m); setTimeout(() => s(""), 3500); }
  function onProcesar() {
    const r = procesar(texto, defMedio);
    setPreview(r.rows); setIgnoradas(r.ignoradas);
    if (r.rows.length === 0) flash(setAviso, "No se reconoció ningún lead en el texto.");
  }
  function setCampo(i, campo, val) { setPreview((p) => p.map((row, idx) => idx === i ? { ...row, [campo]: val } : row)); }
  function quitar(i) { setPreview((p) => p.filter((_, idx) => idx !== i)); }
  async function confirmar() {
    if (preview.length === 0) return flash(setAviso, "Primero procesá un texto.");
    setBusy(true);
    const filas = preview.map((p) => ({ nombre: p.nombre || null, contacto: p.contacto || null, medio: p.medio, cotizada: !!p.cotizada, mes: mesSel }));
    const { error } = await supabase.from("leads").insert(filas);
    setBusy(false);
    if (error) return flash(setAviso, "Error al guardar: " + error.message);
    flash(setAviso, `${filas.length} leads cargados · ${labelDe(mesSel)}`);
    setTexto(""); setPreview([]); setIgnoradas(0); recargar();
  }
  async function guardarCrm() {
    if (crmInput === "") return flash(setAvisoCrm, "Ingresá un número.");
    setBusy(true);
    const { error } = await supabase.from("interacciones_crm")
      .upsert({ vendedor_id: yoId, mes: mesSel, cantidad: Number(crmInput) || 0, updated_at: new Date().toISOString() }, { onConflict: "vendedor_id,mes" });
    setBusy(false);
    if (error) return flash(setAvisoCrm, "Error: " + error.message);
    flash(setAvisoCrm, `Interacciones guardadas · ${labelDe(mesSel)}`); recargar();
  }
  async function guardarEmpresa() {
    if (!emp.nombre.trim()) return flash(setAvisoEmp, "Ingresá el nombre de la empresa.");
    setBusy(true);
    const { error } = await supabase.from("empresas_activas").insert({
      nombre: emp.nombre.trim(), contactos: emp.contactos.trim() || null, cuit: emp.cuit.trim() || null,
      unidades: Number(emp.unidades) || 0, presupuestos_nuevos: Number(emp.presupuestos_nuevos) || 0,
    });
    setBusy(false);
    if (error) return flash(setAvisoEmp, "Error: " + error.message);
    flash(setAvisoEmp, "Empresa cargada.");
    setEmp({ nombre: "", contactos: "", cuit: "", unidades: "", presupuestos_nuevos: "" }); recargar();
  }
  async function guardarLeadEdit(id, patch) { const { error } = await supabase.from("leads").update(patch).eq("id", id); if (!error) recargar(); }
  async function guardarEmpresaEdit(id, patch) { const { error } = await supabase.from("empresas_activas").update(patch).eq("id", id); if (!error) recargar(); }
  async function borrarLead(id) { if (!confirm("¿Borrar este lead?")) return; await supabase.from("leads").delete().eq("id", id); recargar(); }
  async function borrarEmpresa(id) { if (!confirm("¿Borrar esta empresa?")) return; await supabase.from("empresas_activas").delete().eq("id", id); recargar(); }

  const previewPart = preview.filter((p) => grupoDe(p.medio) === "part").length;
  const previewCorp = preview.filter((p) => grupoDe(p.medio) === "corp").length;
  const misLeadsMes = datos.leads.filter((l) => l.vendedor_id === yoId && l.mes === mesSel);
  const misCount = useMemo(() => { const c = {}; misLeadsMes.forEach((l) => (c[l.medio] = (c[l.medio] || 0) + 1)); return c; }, [misLeadsMes]);
  const crmActual = datos.crm[`${yoId}::${mesSel}`] ?? "";
  const misLeadsTodos = useMemo(() => datos.leads.filter((l) => l.vendedor_id === yoId), [datos.leads, yoId]);
  const miResumen = useMemo(() => contarPorMes(misLeadsTodos), [misLeadsTodos]);
  const miHistLista = useMemo(() => misLeadsTodos.filter((l) => fHmes === "todos" || l.mes === fHmes), [misLeadsTodos, fHmes]);
  const misEmpresas = datos.empresas.filter((e) => e.vendedor_id === yoId);

  return (
    <div style={{ fontFamily: FONT, background: T.paper, color: T.ink, minHeight: "100%" }}>
      <div className="mx-auto px-4 py-6" style={{ maxWidth: 1080 }}>
        <Topbar perfil={sesion.perfil} salir={salir} tema={tema} cambiarTema={cambiarTema} tabs={[["cargar", "Cargar leads"], ["empresas", "Empresas activas"], ["historico", "Mi histórico"]]} vista={vista} setVista={setVista} />

        {vista === "cargar" && (
          <>
            <div className="mt-4"><Field label="Mes que estás cargando"><div style={{ maxWidth: 220 }}><Select value={mesSel} onChange={setMesSel} options={MESES.map((m) => [m.key, m.label])} /></div></Field></div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Card style={{ padding: 20 }}>
                <Eyebrow>Pegar mis leads</Eyebrow>
                <p className="mt-1" style={{ color: T.muted, fontSize: 12.5 }}>Un lead por línea: email, teléfono o solo nombre, y opcionalmente el medio.</p>
                <div className="mt-3"><Field label="Medio por defecto (si la línea no lo indica)"><Select value={defMedio} onChange={setDefMedio} options={[["", "Adivinar (dominio)"], ...MEDIOS.map((c) => [c.key, c.label])]} /></Field></div>
                <div className="mt-3"><Field label="Leads"><textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={8} placeholder={"Transportes SA, compras@empresa.com, empresas darwin\nJuan 11 2345-6789 particulares darwin"} className="w-full px-3 py-2.5" style={{ border: `1px solid ${T.line}`, borderRadius: 9, fontSize: 13.5, color: T.ink, background: T.input, outline: "none", fontFamily: "ui-monospace, monospace", resize: "vertical" }} /></Field></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={onProcesar} className="py-2.5 px-4" style={{ background: T.blue, color: "#fff", border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Procesar lista</button>
                  <button onClick={() => setTexto(EJEMPLO)} className="py-2.5 px-4" style={{ background: "transparent", color: T.ink, border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Pegar ejemplo</button>
                </div>
                {aviso && <div className="mt-2" style={{ color: T.teal, fontSize: 13, fontWeight: 600 }}>{aviso}</div>}
              </Card>
              <Card style={{ padding: 20 }}>
                <Eyebrow>Vista previa</Eyebrow>
                {preview.length === 0 ? <p className="mt-3" style={{ color: T.muted, fontSize: 13 }}>Revisá Nombre, Contacto, Medio y marcá si la empresa fue cotizada (Sí/No) antes de confirmar.</p> : (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Chip color={T.blue} text={`Particulares: ${previewPart}`} /><Chip color={T.gold} text={`Corporativos: ${previewCorp}`} />
                      {ignoradas > 0 && <Chip color={T.muted} text={`Ignoradas: ${ignoradas}`} />}
                    </div>
                    <div className="mt-3" style={{ maxHeight: 300, overflowY: "auto" }}>
                      <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 12 }}>
                        <thead><tr style={{ color: T.muted, textAlign: "left" }}><th className="py-1" style={{ fontWeight: 600 }}>Nombre</th><th className="py-1" style={{ fontWeight: 600 }}>Contacto</th><th className="py-1" style={{ fontWeight: 600 }}>Medio</th><th className="py-1" style={{ fontWeight: 600 }}>Cotizada</th><th></th></tr></thead>
                        <tbody>{preview.map((p, i) => (
                          <tr key={i} style={{ borderTop: `1px solid ${T.line}` }}>
                            <td className="py-1" style={{ width: 96 }}><input value={p.nombre} onChange={(e) => setCampo(i, "nombre", e.target.value)} placeholder="—" style={{ width: "100%", border: "none", borderBottom: `1px solid ${T.line}`, fontSize: 12, outline: "none", fontFamily: FONT, background: "transparent" }} /></td>
                            <td className="py-1" style={{ width: 96 }}><input value={p.contacto} onChange={(e) => setCampo(i, "contacto", e.target.value)} placeholder="—" style={{ width: "100%", border: "none", borderBottom: `1px solid ${T.line}`, fontSize: 12, outline: "none", fontFamily: FONT, background: "transparent" }} /></td>
                            <td className="py-1"><select value={p.medio} onChange={(e) => setCampo(i, "medio", e.target.value)} style={{ width: "100%", border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 11, color: colorDe(p.medio), fontWeight: 600, background: T.input, fontFamily: FONT, padding: "2px 4px" }}>{MEDIOS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></td>
                            <td className="py-1" style={{ width: 56 }}><select value={p.cotizada ? "si" : "no"} onChange={(e) => setCampo(i, "cotizada", e.target.value === "si")} style={{ width: "100%", border: `1px solid ${T.line}`, borderRadius: 6, fontSize: 11, fontWeight: 600, color: p.cotizada ? T.green : T.muted, background: T.input, fontFamily: FONT, padding: "2px 4px" }}><option value="no">No</option><option value="si">Sí</option></select></td>
                            <td className="py-1" style={{ width: 20 }}><button onClick={() => quitar(i)} style={{ border: "none", background: "transparent", color: T.muted, cursor: "pointer", fontSize: 14 }}>×</button></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <button disabled={busy} onClick={confirmar} className="mt-3 w-full py-3" style={{ background: T.ink, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? "Guardando…" : `Confirmar ${preview.length} leads`}</button>
                  </>
                )}
              </Card>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Card style={{ padding: 20 }}>
                <Eyebrow>Interacciones en CRM · {labelDe(mesSel)}</Eyebrow>
                <p className="mt-1" style={{ color: T.muted, fontSize: 12.5 }}>Cargá a mano cuántas interacciones tuviste en el CRM este mes.</p>
                <div className="mt-3 flex items-end gap-3">
                  <div style={{ flex: "1 1 auto" }}><Field label="Cantidad"><Txt value={crmInput === "" ? String(crmActual) : crmInput} onChange={setCrmInput} type="number" /></Field></div>
                  <button disabled={busy} onClick={guardarCrm} className="py-2.5 px-4" style={{ background: T.teal, color: "#fff", border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>Guardar</button>
                </div>
                {avisoCrm && <div className="mt-2" style={{ color: T.teal, fontSize: 13, fontWeight: 600 }}>{avisoCrm}</div>}
              </Card>
              <Card style={{ padding: 20 }}>
                <Eyebrow>Mis leads · {labelDe(mesSel)}</Eyebrow>
                {misLeadsMes.length === 0 ? <p className="mt-2" style={{ color: T.muted, fontSize: 13 }}>Todavía no cargaste leads este mes.</p> : (
                  <div className="mt-3 flex flex-wrap gap-2">{MEDIOS.filter((c) => misCount[c.key]).map((c) => <Chip key={c.key} color={colorDe(c.key)} text={`${c.label}: ${misCount[c.key]}`} />)}<Chip color={T.ink} text={`Total: ${misLeadsMes.length}`} /></div>
                )}
              </Card>
            </div>
          </>
        )}

        {vista === "empresas" && (
          <div className="mt-5 grid gap-4">
            <Card style={{ padding: 20 }}>
              <Eyebrow>Cargar empresa activa</Eyebrow>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field label="Nombre"><Txt value={emp.nombre} onChange={(v) => setEmp({ ...emp, nombre: v })} /></Field>
                <Field label="Contacto/s"><Txt value={emp.contactos} onChange={(v) => setEmp({ ...emp, contactos: v })} /></Field>
                <Field label="CUIT"><Txt value={emp.cuit} onChange={(v) => setEmp({ ...emp, cuit: v })} /></Field>
                <Field label="Cantidad de unidades alquiladas"><Txt value={emp.unidades} onChange={(v) => setEmp({ ...emp, unidades: v })} type="number" /></Field>
                <Field label="Presupuestos nuevos cotizados"><Txt value={emp.presupuestos_nuevos} onChange={(v) => setEmp({ ...emp, presupuestos_nuevos: v })} type="number" /></Field>
              </div>
              <button disabled={busy} onClick={guardarEmpresa} className="mt-4 py-2.5 px-5" style={{ background: T.blue, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>Guardar empresa</button>
              {avisoEmp && <span className="mt-2" style={{ color: T.teal, fontSize: 13, fontWeight: 600, marginLeft: 12 }}>{avisoEmp}</span>}
            </Card>
            <TablaEmpresas filas={misEmpresas} conVendedor={false} onSave={guardarEmpresaEdit} onDelete={borrarEmpresa} />
          </div>
        )}

        {vista === "historico" && (
          <div className="mt-5 grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span style={{ fontSize: 13, color: T.muted }}>Tu base de datos completa</span>
              <button onClick={() => exportarExcel({ leads: misLeadsTodos, empresas: misEmpresas, conVendedor: false, archivo: `mis-leads.xlsx` })} className="py-2.5 px-4" style={{ background: T.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Descargar Excel</button>
            </div>
            <ResumenMensual filas={miResumen} extras={[
              { head: "Cotizadas", render: (d) => nf.format(d.cotizadas) },
              { head: "Mis interac. CRM", render: (d) => nf.format(datos.crm[`${yoId}::${d.key}`] || 0) },
            ]} />
            <Card style={{ padding: 14 }}>
              <div style={{ maxWidth: 220 }}><Field label="Filtrar por mes"><Select value={fHmes} onChange={setFHmes} options={[["todos", "Todos los meses"], ...MESES.map((m) => [m.key, m.label])]} /></Field></div>
            </Card>
            <ListaLeads filas={miHistLista} conVendedor={false} onSave={guardarLeadEdit} onDelete={borrarLead} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── PANEL JEFE / ADMIN ───────────────────────────────────────────────
function PanelJefe({ sesion, datos, recargar, salir, tema, cambiarTema }) {
  const esAdmin = sesion.perfil.rol === "admin";
  const tip = { background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 12, color: T.ink };
  const [vista, setVista] = useState("tablero");
  const [mesInv, setMesInv] = useState(MES_ACTUAL);
  const [montoInv, setMontoInv] = useState("");
  const [avisoInv, setAvisoInv] = useState("");
  const [reservasInput, setReservasInput] = useState("");
  const [diasInput, setDiasInput] = useState("");
  const [avisoRes, setAvisoRes] = useState("");
  const [fMes, setFMes] = useState("todos");
  const [fMed, setFMed] = useState("todos");
  const [fVend, setFVend] = useState("todos");
  const [fAsesor, setFAsesor] = useState("todos");
  const [graf, setGraf] = useState("part");
  const [busy, setBusy] = useState(false);
  const [avisoU, setAvisoU] = useState("");
  const hoy = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
  function flash(s, m) { s(m); setTimeout(() => s(""), 3500); }

  async function guardarInversion() {
    if (!montoInv) return flash(setAvisoInv, "Ingresá un monto.");
    setBusy(true);
    const { error } = await supabase.from("reporte_mensual").upsert({ mes: mesInv, inversion: Number(montoInv) || 0, updated_at: new Date().toISOString() }, { onConflict: "mes" });
    setBusy(false);
    if (error) return flash(setAvisoInv, "Error: " + error.message);
    flash(setAvisoInv, `Inversión actualizada · ${labelDe(mesInv)}`); setMontoInv(""); recargar();
  }
  async function borrarLead(id) {
    if (!confirm("¿Borrar este lead?")) return;
    await supabase.from("leads").delete().eq("id", id); recargar();
  }
  async function borrarEmpresa(id) {
    if (!confirm("¿Borrar esta empresa?")) return;
    await supabase.from("empresas_activas").delete().eq("id", id); recargar();
  }
  async function guardarReservas() {
    if (!reservasInput && !diasInput) return flash(setAvisoRes, "Ingresá al menos un valor.");
    setBusy(true);
    const patch = { mes: mesInv, updated_at: new Date().toISOString() };
    if (reservasInput) patch.reservas_particulares = Number(reservasInput) || 0;
    if (diasInput) patch.dias_reserva = Number(diasInput) || 0;
    const { error } = await supabase.from("reporte_mensual").upsert(patch, { onConflict: "mes" });
    setBusy(false);
    if (error) return flash(setAvisoRes, "Error: " + error.message);
    flash(setAvisoRes, `Actualizado · ${labelDe(mesInv)}`); setReservasInput(""); setDiasInput(""); recargar();
  }
  async function guardarLeadEdit(id, patch) { await supabase.from("leads").update(patch).eq("id", id); recargar(); }
  async function guardarEmpresaEdit(id, patch) { await supabase.from("empresas_activas").update(patch).eq("id", id); recargar(); }
  async function cambiarRol(id, rol) {
    await supabase.from("profiles").update({ rol }).eq("id", id);
    flash(setAvisoU, "Rol actualizado. La persona lo verá al volver a entrar."); recargar();
  }
  async function borrarUsuario(id, nombre) {
    if (!confirm(`¿Borrar a ${nombre}? Se eliminan también todos sus datos.`)) return;
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/borrar_usuario`, {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "apikey": SUPABASE_ANON_KEY }, body: JSON.stringify({ id }),
    });
    const out = await res.json().catch(() => ({}));
    flash(setAvisoU, res.ok ? "Usuario eliminado." : "Error: " + (out.error || "no se pudo")); recargar();
  }

  const data = useMemo(() => MESES.map((m) => {
    const r = datos.reporte[m.key] || {};
    const inv = Number(r.inversion) || 0;
    // Meses anteriores al corte: se muestra el histórico viejo tal cual estaba
    // cargado (reporte_mensual). Desde el corte en adelante: leads reales.
    if (m.key < CORTE_REAL) {
      const part = Number(r.leads_part) || 0;
      const corp = Number(r.leads_corp) || 0;
      const total = part + corp;
      const crmTotal = datos.vendedores.reduce((a, v) => a + (datos.crm[`${v.id}::${m.key}`] || 0), 0);
      return {
        key: m.key, label: m.label,
        info: part, mail_corpo: 0, waalaxy_fml: corp, tablet_part: 0, tablet_corpo: 0,
        part, corp, total, inv, crm: crmTotal, historico: true,
        costo: total ? Math.round(inv / total) : 0,
        costoPart: part ? Math.round(inv / part) : 0,
        costoCorp: corp ? Math.round(inv / corp) : 0,
      };
    }
    const mesLeads = datos.leads.filter((l) => l.mes === m.key);
    const info       = mesLeads.filter((l) => l.medio === "infoRenting").length;
    const tablet_part = mesLeads.filter((l) => l.medio === "particularesDarwin").length;
    const mail_corpo  = mesLeads.filter((l) => l.medio === "emailsDerivar").length;
    const waalaxy_fml = mesLeads.filter((l) => l.medio === "waalax").length;
    const tablet_corpo = mesLeads.filter((l) => l.medio === "empresasDarwin").length;
    const part = info + tablet_part;
    const corp = mail_corpo + waalaxy_fml + tablet_corpo;
    const total = part + corp;
    const crmTotal = datos.vendedores.reduce((a, v) => a + (datos.crm[`${v.id}::${m.key}`] || 0), 0);
    return {
      key: m.key, label: m.label,
      info, mail_corpo, waalaxy_fml, tablet_part, tablet_corpo,
      part, corp, total, inv, crm: crmTotal,
      costo: total ? Math.round(inv / total) : 0,
      costoPart: part ? Math.round(inv / part) : 0,
      costoCorp: corp ? Math.round(inv / corp) : 0,
    };
  }), [datos]);
  const conMov = data.filter((d) => d.total > 0 || d.inv > 0);
  const ult = conMov[conMov.length - 1] || data[data.length - 1];
  const idxUlt = data.findIndex((d) => d.key === ult.key);
  const prev = idxUlt > 0 ? data[idxUlt - 1] : null;
  const deltaCosto = prev?.costo ? ((ult.costo - prev.costo) / prev.costo) * 100 : 0;
  const totalCotizadas = useMemo(() => datos.leads.reduce((a, l) => a + (l.cotizada ? 1 : 0), 0), [datos.leads]);

  const filtrados = useMemo(() => datos.leads.filter((l) => (fMes === "todos" || l.mes === fMes) && (fMed === "todos" || l.medio === fMed) && (fVend === "todos" || l.vendedor_id === fVend) && (fAsesor === "todos" || l.operador === fAsesor)), [datos.leads, fMes, fMed, fVend, fAsesor]);
  const cotizadasFiltradas = useMemo(() => filtrados.reduce((a, l) => a + (l.cotizada ? 1 : 0), 0), [filtrados]);
  const asesores = useMemo(() => Array.from(new Set(datos.leads.map((l) => l.operador).filter(Boolean))).sort(), [datos.leads]);
  const filtCount = useMemo(() => { const c = {}; filtrados.forEach((l) => (c[l.medio] = (c[l.medio] || 0) + 1)); return c; }, [filtrados]);
  const empFiltradas = useMemo(() => datos.empresas.filter((e) => fVend === "todos" || e.vendedor_id === fVend), [datos.empresas, fVend]);

  const tabs = [["tablero", "Tablero"], ["general", "Leads (general)"], ["empresas", "Empresas activas"]];
  if (esAdmin) tabs.push(["usuarios", "Usuarios"]);

  return (
    <div style={{ fontFamily: FONT, background: T.paper, color: T.ink, minHeight: "100%" }}>
      <style>{`.print-only{display:none;}@media print{@page{margin:14mm;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}body{background:#fff!important;}.no-print{display:none!important;}.print-only{display:block!important;}}`}</style>
      <div className="mx-auto px-4 py-6" style={{ maxWidth: 1200 }}>
        <Topbar perfil={sesion.perfil} salir={salir} tema={tema} cambiarTema={cambiarTema} tabs={tabs} vista={vista} setVista={setVista} />

        {vista === "tablero" && (
          <div className="mt-6 grid gap-4">
            <div className="no-print flex flex-wrap items-center justify-between gap-3">
              <span style={{ fontSize: 13, color: T.muted }}>Reporte de leads · {ult.label}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => exportarExcel({ resumen: conMov, archivo: `reporte-mensual-${ult.key}.xlsx` })} className="py-2.5 px-4" style={{ background: T.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Descargar Excel</button>
                <button onClick={() => window.print()} className="py-2.5 px-4" style={{ background: T.blue, color: "#fff", border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Descargar PDF</button>
              </div>
            </div>
            <div className="print-only" style={{ marginBottom: 6 }}><div style={{ fontSize: 20, fontWeight: 700 }}>LeadAdmin · Reporte</div><div style={{ fontSize: 12, color: T.muted }}>Generado el {hoy} · período {ult.label}</div></div>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Kpi label="Leads del mes" value={nf.format(ult.total)} sub={`${nf.format(ult.part)} part · ${nf.format(ult.corp)} corp`} accent={T.ink} />
              <Kpi label="Costo / lead total" value={cf.format(ult.costo)} sub={ult.label} accent={T.green} delta={prev ? deltaCosto : null} />
              <Kpi label="Costo / lead particular" value={cf.format(ult.costoPart)} sub={`${nf.format(ult.part)} leads`} accent={T.blue} />
              <Kpi label="Costo / lead corporativo" value={cf.format(ult.costoCorp)} sub={`${nf.format(ult.corp)} leads`} accent={T.gold} />
              <Kpi label="Cotizaciones" value={nf.format(totalCotizadas)} sub="total cotizadas" accent={T.teal} />
              {(() => { const r = datos.reporte[ult.key] || {}; const res = Number(r.reservas_particulares) || 0; const dias = Number(r.dias_reserva) || 0; const prom = dias ? (res / dias).toFixed(1) : "—"; return (<><Kpi label="Reservas particulares" value={nf.format(res)} sub={ult.label} accent="#7c3aed" /><Kpi label="Días de reserva" value={nf.format(dias)} sub={ult.label} accent="#db2777" /><Kpi label="Promedio reservas/día" value={prom} sub={dias ? `${nf.format(res)} reservas · ${nf.format(dias)} días` : "Sin datos"} accent="#ea580c" /></>); })()}
            </div>
            <Card className="no-print" style={{ padding: 18 }}>
              <div className="flex flex-wrap items-end gap-3">
                <div style={{ flex: "1 1 160px" }}><Field label="Mes"><Select value={mesInv} onChange={setMesInv} options={MESES.map((m) => [m.key, m.label])} /></Field></div>
                <div style={{ flex: "1 1 200px" }}><Field label="Inversión del mes (ARS)"><Txt value={montoInv} onChange={setMontoInv} type="number" placeholder={String((datos.reporte[mesInv] && datos.reporte[mesInv].inversion) || 0)} /></Field></div>
                <button disabled={busy} onClick={guardarInversion} className="py-3 px-5" style={{ background: T.ink, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>Actualizar inversión</button>
                {avisoInv && <span style={{ color: T.teal, fontSize: 13, fontWeight: 600 }}>{avisoInv}</span>}
              </div>
              <div className="flex flex-wrap items-end gap-3 mt-3" style={{ borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
                <div style={{ flex: "1 1 200px" }}><Field label="Reservas particulares"><Txt value={reservasInput} onChange={setReservasInput} type="number" placeholder={String((datos.reporte[mesInv] && datos.reporte[mesInv].reservas_particulares) || 0)} /></Field></div>
                <div style={{ flex: "1 1 200px" }}><Field label="Días de reserva"><Txt value={diasInput} onChange={setDiasInput} type="number" placeholder={String((datos.reporte[mesInv] && datos.reporte[mesInv].dias_reserva) || 0)} /></Field></div>
                <button disabled={busy} onClick={guardarReservas} className="py-3 px-5" style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>Actualizar reservas</button>
                {avisoRes && <span style={{ color: T.teal, fontSize: 13, fontWeight: 600 }}>{avisoRes}</span>}
              </div>
            </Card>
            <Card style={{ padding: 18 }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2"><span style={{ width: 9, height: 9, borderRadius: 9, background: graf === "inv" ? T.teal : graf === "part" ? T.blue : T.gold, display: "inline-block" }} /><span style={{ fontSize: 13.5, fontWeight: 600 }}>{({ part: "Leads particulares", corp: "Leads corporativos", inv: "Inversión", costo: "Costo por lead" })[graf]}</span></div>
                <div style={{ minWidth: 200 }}><Select value={graf} onChange={setGraf} options={[["part", "Leads particulares"], ["corp", "Leads corporativos"], ["inv", "Inversión"], ["costo", "Costo por lead"]]} /></div>
              </div>
              <div className="mt-3" style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {graf === "part" ? (
                    <LineChart data={data}><CartesianGrid stroke={T.line} vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11, fill: T.muted }} tickLine={false} axisLine={{ stroke: T.line }} /><YAxis tick={{ fontSize: 11, fill: T.muted }} tickLine={false} axisLine={false} width={40} /><Tooltip contentStyle={tip} formatter={(v) => nf.format(v)} /><Line type="monotone" dataKey="part" name="Particulares" stroke={T.blue} strokeWidth={2.5} dot={{ r: 3 }} /></LineChart>
                  ) : graf === "corp" ? (
                    <LineChart data={data}><CartesianGrid stroke={T.line} vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11, fill: T.muted }} tickLine={false} axisLine={{ stroke: T.line }} /><YAxis tick={{ fontSize: 11, fill: T.muted }} tickLine={false} axisLine={false} width={40} /><Tooltip contentStyle={tip} formatter={(v) => nf.format(v)} /><Line type="monotone" dataKey="corp" name="Corporativos" stroke={T.gold} strokeWidth={2.5} dot={{ r: 3 }} /></LineChart>
                  ) : graf === "inv" ? (
                    <BarChart data={data}><CartesianGrid stroke={T.line} vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11, fill: T.muted }} tickLine={false} axisLine={{ stroke: T.line }} /><YAxis tick={{ fontSize: 11, fill: T.muted }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `${Math.round(v / 1e6)}M`} /><Tooltip contentStyle={tip} formatter={(v) => cf.format(v)} /><Bar dataKey="inv" name="Inversión" fill={T.teal} radius={[4, 4, 0, 0]} /></BarChart>
                  ) : (
                    <LineChart data={data}><CartesianGrid stroke={T.line} vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11, fill: T.muted }} tickLine={false} axisLine={{ stroke: T.line }} /><YAxis tick={{ fontSize: 11, fill: T.muted }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip contentStyle={tip} formatter={(v) => cf.format(v)} /><Legend wrapperStyle={{ fontSize: 11 }} /><Line type="monotone" dataKey="costo" name="Total" stroke={T.ink} strokeWidth={2.5} dot={{ r: 2 }} /><Line type="monotone" dataKey="costoPart" name="Particular" stroke={T.blue} strokeWidth={2} dot={{ r: 2 }} /><Line type="monotone" dataKey="costoCorp" name="Corporativo" stroke={T.gold} strokeWidth={2} dot={{ r: 2 }} /></LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </Card>
            <Card style={{ padding: 20, overflowX: "auto" }}>
              <Eyebrow>Resumen mensual (REPORTE)</Eyebrow>
              <style>{`.rep-grid{border-collapse:collapse}.rep-grid th,.rep-grid td{border:1px solid ${T.line};padding:7px 10px}.rep-grid thead th{background:${T.input}}.rep-grid tbody tr:nth-child(even){background:${T.zebra || "transparent"}}`}</style>
              <table className="rep-grid mt-3 w-full" style={{ fontSize: 12, minWidth: 1080 }}>
                <thead>
                  <tr style={{ color: T.muted, textAlign: "right" }}>
                    <th className="py-2 text-left" style={{ fontWeight: 600 }}>Mes</th>
                    <th className="py-2" style={{ fontWeight: 600, color: T.blue }}>Info</th>
                    <th className="py-2" style={{ fontWeight: 600, color: T.gold }}>Mail corpo</th>
                    <th className="py-2" style={{ fontWeight: 600, color: T.gold }}>Waalaxy/FML</th>
                    <th className="py-2" style={{ fontWeight: 600, color: T.blue }}>Tablet part.</th>
                    <th className="py-2" style={{ fontWeight: 600, color: T.gold }}>Tablet corpo</th>
                    <th className="py-2" style={{ fontWeight: 700, color: T.gold }}>Corporativos</th>
                    <th className="py-2" style={{ fontWeight: 700, color: T.blue }}>Particulares</th>
                    <th className="py-2" style={{ fontWeight: 700 }}>Total</th>
                    <th className="py-2" style={{ fontWeight: 600 }}>Interac. CRM</th>
                    <th className="py-2" style={{ fontWeight: 600 }}>Inversión</th>
                    <th className="py-2" style={{ fontWeight: 700 }}>Costo total</th>
                    <th className="py-2" style={{ fontWeight: 600, color: T.blue }}>Costo part.</th>
                    <th className="py-2" style={{ fontWeight: 600, color: T.gold }}>Costo corpo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d) => (
                    <tr key={d.key} style={{ borderTop: `1px solid ${T.line}`, textAlign: "right" }}>
                      <td className="py-2 text-left" style={{ fontWeight: 600 }}>{d.label}</td>
                      <td className="py-2 tabular-nums">{nf.format(d.info)}</td>
                      <td className="py-2 tabular-nums">{nf.format(d.mail_corpo)}</td>
                      <td className="py-2 tabular-nums">{nf.format(d.waalaxy_fml)}</td>
                      <td className="py-2 tabular-nums">{nf.format(d.tablet_part)}</td>
                      <td className="py-2 tabular-nums">{nf.format(d.tablet_corpo)}</td>
                      <td className="py-2 tabular-nums" style={{ fontWeight: 700, color: T.gold }}>{nf.format(d.corp)}</td>
                      <td className="py-2 tabular-nums" style={{ fontWeight: 700, color: T.blue }}>{nf.format(d.part)}</td>
                      <td className="py-2 tabular-nums" style={{ fontWeight: 700 }}>{nf.format(d.total)}</td>
                      <td className="py-2 tabular-nums">{nf.format(d.crm)}</td>
                      <td className="py-2 tabular-nums">{cf.format(d.inv)}</td>
                      <td className="py-2 tabular-nums" style={{ fontWeight: 700 }}>{cf.format(d.costo)}</td>
                      <td className="py-2 tabular-nums" style={{ color: T.blue, fontWeight: 600 }}>{cf.format(d.costoPart)}</td>
                      <td className="py-2 tabular-nums" style={{ color: T.gold, fontWeight: 600 }}>{cf.format(d.costoCorp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {vista === "general" && (
          <div className="mt-6 grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span style={{ fontSize: 13, color: T.muted }}>Base de datos completa (todos los vendedores)</span>
              <button onClick={() => exportarExcel({ leads: datos.leads, empresas: datos.empresas, resumen: data, conVendedor: true, archivo: `leadadmin-base.xlsx` })} className="py-2.5 px-4" style={{ background: T.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Descargar Excel</button>
            </div>
            <Card style={{ padding: 18 }}>
              <div className="flex flex-wrap items-end gap-3">
                <div style={{ flex: "1 1 150px" }}><Field label="Mes"><Select value={fMes} onChange={setFMes} options={[["todos", "Todos"], ...MESES.map((m) => [m.key, m.label])]} /></Field></div>
                <div style={{ flex: "1 1 180px" }}><Field label="Medio"><Select value={fMed} onChange={setFMed} options={[["todos", "Todos"], ...MEDIOS.map((c) => [c.key, c.label])]} /></Field></div>
                <div style={{ flex: "1 1 180px" }}><Field label="Vendedor"><Select value={fVend} onChange={setFVend} options={[["todos", "Todos"], ...datos.vendedores.map((v) => [v.id, v.nombre])]} /></Field></div>
                <div style={{ flex: "1 1 180px" }}><Field label="Asesor"><Select value={fAsesor} onChange={setFAsesor} options={[["todos", "Todos"], ...asesores.map((a) => [a, a])]} /></Field></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">{MEDIOS.filter((c) => filtCount[c.key]).map((c) => <Chip key={c.key} color={colorDe(c.key)} text={`${c.label}: ${nf.format(filtCount[c.key])}`} />)}<Chip color={T.ink} text={`Total: ${nf.format(filtrados.length)}`} /><Chip color={T.teal} text={`Cotizaciones: ${nf.format(cotizadasFiltradas)}`} /></div>
            </Card>

            <Card style={{ padding: 20, overflowX: "auto" }}>
              <Eyebrow>Interacciones de CRM por vendedor</Eyebrow>
              <table className="mt-3 w-full" style={{ borderCollapse: "collapse", fontSize: 12.5, minWidth: 720 }}>
                <thead><tr style={{ color: T.muted, textAlign: "right" }}>
                  <th className="py-2 text-left" style={{ fontWeight: 600 }}>Vendedor</th>
                  {MESES.map((m) => <th key={m.key} className="py-2" style={{ fontWeight: 600 }}>{m.label}</th>)}
                  <th className="py-2" style={{ fontWeight: 700 }}>Total</th>
                </tr></thead>
                <tbody>
                  {datos.vendedores.filter((v) => fVend === "todos" || v.id === fVend).map((v) => {
                    const tot = MESES.reduce((a, m) => a + (datos.crm[`${v.id}::${m.key}`] || 0), 0);
                    return (
                      <tr key={v.id} style={{ borderTop: `1px solid ${T.line}`, textAlign: "right" }}>
                        <td className="py-2 text-left" style={{ fontWeight: 600 }}>{v.nombre}</td>
                        {MESES.map((m) => <td key={m.key} className="py-2 tabular-nums">{nf.format(datos.crm[`${v.id}::${m.key}`] || 0)}</td>)}
                        <td className="py-2 tabular-nums" style={{ fontWeight: 700 }}>{nf.format(tot)}</td>
                      </tr>
                    );
                  })}
                  {datos.vendedores.length === 0 && <tr><td className="py-2" style={{ color: T.muted }}>Sin vendedores todavía.</td></tr>}
                </tbody>
              </table>
            </Card>

            <ListaLeads filas={filtrados} conVendedor={true} onDelete={borrarLead} onSave={guardarLeadEdit} />
          </div>
        )}

        {vista === "empresas" && (
          <div className="mt-6 grid gap-4">
            <div className="grid gap-4 grid-cols-3">
              <Kpi label="Empresas activas" value={nf.format(empFiltradas.length)} sub="total" accent={T.blue} />
              <Kpi label="Unidades alquiladas" value={nf.format(empFiltradas.reduce((a, e) => a + e.unidades, 0))} sub="vehículos" accent={T.teal} />
              <Kpi label="Presup. nuevos" value={nf.format(empFiltradas.reduce((a, e) => a + e.presupuestos_nuevos, 0))} sub="cotizados" accent={T.gold} />
            </div>
            <Card style={{ padding: 14 }}>
              <div style={{ maxWidth: 220 }}><Field label="Filtrar por vendedor"><Select value={fVend} onChange={setFVend} options={[["todos", "Todos"], ...datos.vendedores.map((v) => [v.id, v.nombre])]} /></Field></div>
            </Card>
            <TablaEmpresas filas={empFiltradas} conVendedor={true} onDelete={borrarEmpresa} onSave={guardarEmpresaEdit} />
          </div>
        )}

        {vista === "usuarios" && esAdmin && (
          <div className="mt-6 grid gap-4">
            <Card style={{ padding: 20, overflowX: "auto" }}>
              <Eyebrow>Usuarios</Eyebrow>
              {avisoU && <div className="mt-2" style={{ color: T.teal, fontSize: 13, fontWeight: 600 }}>{avisoU}</div>}
              <table className="mt-3 w-full" style={{ borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
                <thead><tr style={{ color: T.muted, textAlign: "left" }}>
                  <th className="py-2" style={{ fontWeight: 600 }}>Nombre</th><th className="py-2" style={{ fontWeight: 600 }}>Usuario</th>
                  <th className="py-2" style={{ fontWeight: 600 }}>Email</th><th className="py-2" style={{ fontWeight: 600 }}>Rol</th><th></th>
                </tr></thead>
                <tbody>{datos.usuarios.map((u) => (
                  <tr key={u.id} style={{ borderTop: `1px solid ${T.line}` }}>
                    <td className="py-2">{u.nombre} {u.apellido}</td>
                    <td className="py-2">{u.usuario}</td>
                    <td className="py-2" style={{ color: T.muted }}>{u.email}</td>
                    <td className="py-2" style={{ width: 150 }}>
                      <select value={u.rol} disabled={u.id === sesion.user.id} onChange={(e) => cambiarRol(u.id, e.target.value)} style={{ width: "100%", border: `1px solid ${T.line}`, borderRadius: 7, fontSize: 12.5, fontWeight: 600, background: T.input, fontFamily: FONT, padding: "4px 6px" }}>
                        <option value="ventas">Ventas</option><option value="jefe">Jefe</option><option value="admin">Administrador</option>
                      </select>
                    </td>
                    <td className="py-2" style={{ width: 40 }}>{u.id !== sesion.user.id && <button onClick={() => borrarUsuario(u.id, `${u.nombre} ${u.apellido}`)} style={{ border: "none", background: "transparent", color: T.red, cursor: "pointer", fontSize: 14 }}>🗑</button>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componentes chicos ───────────────────────────────────────────────
function Field({ label, children }) {
  return <label className="block"><span style={{ display: "block", fontSize: 11.5, color: T.muted, marginBottom: 5, fontWeight: 600, lineHeight: 1.25 }}>{label}</span>{children}</label>;
}
function Txt({ value, onChange, type, placeholder }) {
  return <input type={type || "text"} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2.5" style={{ border: `1px solid ${T.line}`, borderRadius: 9, fontSize: 14, color: T.ink, background: T.input, outline: "none", fontFamily: FONT }} />;
}
function Select({ value, onChange, options }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2.5" style={{ border: `1px solid ${T.line}`, borderRadius: 9, fontSize: 14, color: T.ink, background: T.input, outline: "none", fontFamily: FONT, cursor: "pointer" }}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
}
function Chip({ color, text }) {
  return <span style={{ background: T.input, border: `1px solid ${T.line}`, borderRadius: 999, padding: "5px 11px", fontSize: 12, fontWeight: 600, color: T.ink, display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 8, background: color }} />{text}</span>;
}
function Kpi({ label, value, sub, accent, delta }) {
  return <Card style={{ padding: 16 }}><div style={{ height: 3, width: 28, background: accent, borderRadius: 3 }} /><div className="mt-3" style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>{label}</div><div className="mt-1 tabular-nums" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>{value}</div><div className="mt-0.5 flex items-center gap-2" style={{ fontSize: 11.5, color: T.muted }}><span>{sub}</span>{delta != null && <span style={{ color: delta <= 0 ? T.teal : T.red, fontWeight: 600 }}>{delta <= 0 ? "▼" : "▲"} {Math.abs(delta).toFixed(0)}%</span>}</div></Card>;
}
function Chart({ title, color, children }) {
  return <Card style={{ padding: 18 }}><div className="flex items-center gap-2"><span style={{ width: 9, height: 9, borderRadius: 9, background: color, display: "inline-block" }} /><span style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</span></div><div className="mt-3" style={{ width: "100%", height: 200 }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></Card>;
}
