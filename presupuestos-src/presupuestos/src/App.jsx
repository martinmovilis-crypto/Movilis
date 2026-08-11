import React, { useEffect, useMemo, useState } from "react";
import { PDFViewer, pdf } from "@react-pdf/renderer";
import { supabase, BUCKET_FOTOS, ESPACIO } from "./supabaseClient.js";
import PresupuestoPDF from "./PresupuestoPDF.jsx";
import {
  cargarEmpresa,
  guardarEmpresa,
  cargarLogo,
  guardarLogo,
  EMPRESA_DEFAULT,
  CATEGORIAS,
  PERIODOS,
  FRECUENCIAS,
  PLAZOS,
  KM_OPCIONES,
  kmLabel,
  fotoDe,
  slugify,
  pesos,
  vehiculoNuevo,
} from "./data.js";

// Fecha corta tipo 06/06/26 (día/mes/año de 2 dígitos).
const hoy = () =>
  new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

const fmtFecha = (iso) => {
  try {
    return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return "";
  }
};

// Tema claro / oscuro (día / noche). Se guarda por computadora.
const TEMA_KEY = "presupuestos_tema_v1";
function cargarTema() {
  try {
    return localStorage.getItem(TEMA_KEY) === "oscuro" ? "oscuro" : "claro";
  } catch {
    return "claro";
  }
}

// Dispara la descarga de un Blob como archivo.
function bajarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Convierte un logo a data URI PNG (preserva transparencia), redimensionado.
function convertirLogoPng(file, maxW = 600) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const escala = Math.min(1, maxW / img.width || 1);
        const w = Math.max(1, Math.round(img.width * escala));
        const h = Math.max(1, Math.round(img.height * escala));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Convierte cualquier imagen (incluido AVIF/WebP) a un Blob JPEG, redimensionada.
// El PDF sólo admite JPEG/PNG, así que unificamos todo a JPEG.
function convertirAJpeg(file, maxW = 1100, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const escala = Math.min(1, maxW / img.width || 1);
        const w = Math.max(1, Math.round(img.width * escala));
        const h = Math.max(1, Math.round(img.height * escala));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("encode"))),
          "image/jpeg",
          quality
        );
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Carga una imagen (URL remota o data URI) y la devuelve como data URI JPEG.
// El PDF sólo dibuja JPEG/PNG y no baja imágenes remotas de forma confiable:
// por eso, al generar, incrustamos cada foto ya convertida. El navegador sí
// sabe decodificar AVIF/WebP, así que esto arregla también las fotos viejas.
function urlAJpegDataUri(url, maxW = 1000, quality = 0.82) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const escala = Math.min(1, maxW / img.width || 1);
        const w = Math.max(1, Math.round(img.width * escala));
        const h = Math.max(1, Math.round(img.height * escala));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    // Cache-buster: fuerza una descarga "con CORS" y evita reutilizar una
    // respuesta cacheada sin cabeceras CORS (que ensuciaría el canvas).
    const sep = url.includes("?") ? "&" : "?";
    img.src = url + sep + "cbpdf=" + Date.now();
  });
}

export default function App() {
  const [tab, setTab] = useState("presupuesto");
  const [tema, setTema] = useState(cargarTema());
  const [empresa, setEmpresa] = useState(cargarEmpresa());

  // Aplica el tema (día/noche) al documento y lo recuerda.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema === "oscuro" ? "dark" : "light");
    try {
      localStorage.setItem(TEMA_KEY, tema);
    } catch {
      /* ignore */
    }
  }, [tema]);
  const [logoEmpresa, setLogoEmpresa] = useState(cargarLogo());
  const [catalogo, setCatalogo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // No togglear "cargando" en refrescos: eso desmontaría las solapas y se
  // perdería el presupuesto en curso. Sólo la carga inicial muestra el loader.
  async function refrescarCatalogo() {
    const { data, error } = await supabase
      .from("renting_vehiculos")
      .select("*")
      .eq("activo", true)
      .eq("espacio", ESPACIO)
      .order("orden", { ascending: true });
    if (error) setError(error.message);
    else setCatalogo(data || []);
    setCargando(false);
  }

  // Historial de cotizaciones. Cada vendedor ve SOLO las suyas: se filtra por
  // el nombre de vendedor cargado en Configuración.
  const [historial, setHistorial] = useState([]);
  async function cargarHistorial() {
    const vend = (empresa.vendedor || "").trim();
    let query = supabase
      .from("renting_presupuestos")
      .select("*")
      .eq("espacio", ESPACIO)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (vend) query = query.eq("vendedor", vend);
    const { data } = await query;
    setHistorial(data || []);
  }

  useEffect(() => {
    refrescarCatalogo();
  }, []);

  // Recarga el historial al inicio y cada vez que cambia el vendedor (Config).
  useEffect(() => {
    cargarHistorial();
  }, [empresa.vendedor]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">Hertz</span>
          <span className="brand-sub">Cotizador Renting Corporativo</span>
        </div>
        <nav className="tabs">
          <button className={tab === "presupuesto" ? "on" : ""} onClick={() => setTab("presupuesto")}>
            Nuevo presupuesto
          </button>
          <button className={tab === "historial" ? "on" : ""} onClick={() => setTab("historial")}>
            Historial
          </button>
          <button className={tab === "catalogo" ? "on" : ""} onClick={() => setTab("catalogo")}>
            Catálogo y fotos
          </button>
          <button className={tab === "config" ? "on" : ""} onClick={() => setTab("config")}>
            Configuración
          </button>
          <button
            className="tema-btn"
            onClick={() => setTema((t) => (t === "oscuro" ? "claro" : "oscuro"))}
            title="Cambiar entre tema día y noche"
          >
            {tema === "oscuro" ? "☀ Día" : "🌙 Noche"}
          </button>
        </nav>
      </header>

      {error ? <div className="banner error">⚠ {error}</div> : null}

      <main className="main">
        {cargando ? (
          <div className="loading">Cargando catálogo…</div>
        ) : (
          <>
            {/* Las 3 solapas quedan montadas y se muestran/ocultan: así el
                presupuesto en curso no se pierde al cambiar de solapa. */}
            <div style={{ display: tab === "presupuesto" ? "block" : "none" }}>
              <TabPresupuesto
                empresa={empresa}
                catalogo={catalogo}
                logoEmpresa={logoEmpresa}
                setLogoEmpresa={setLogoEmpresa}
                onDescarga={cargarHistorial}
              />
            </div>
            <div style={{ display: tab === "historial" ? "block" : "none" }}>
              <TabHistorial
                historial={historial}
                empresa={empresa}
                logoEmpresa={logoEmpresa}
                recargar={cargarHistorial}
              />
            </div>
            <div style={{ display: tab === "catalogo" ? "block" : "none" }}>
              <TabCatalogo catalogo={catalogo} onCambio={refrescarCatalogo} />
            </div>
            <div style={{ display: tab === "config" ? "block" : "none" }}>
              <TabConfig empresa={empresa} setEmpresa={setEmpresa} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* NUEVO PRESUPUESTO                                                   */
/* ------------------------------------------------------------------ */
function TabPresupuesto({ empresa, catalogo, logoEmpresa, setLogoEmpresa, onDescarga }) {
  const [cliente, setCliente] = useState("");
  const [vigencia, setVigencia] = useState(10);
  const [conIva, setConIva] = useState(false);
  const [seleccion, setSeleccion] = useState([]); // copias editables
  const [docProps, setDocProps] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [msg, setMsg] = useState("");
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  const idsSel = seleccion.map((v) => v.id);

  async function subirLogo(file) {
    if (!file) return;
    setSubiendoLogo(true);
    try {
      const dataUri = await convertirLogoPng(file);
      setLogoEmpresa(dataUri);
      guardarLogo(dataUri);
      setDocProps((d) => (d ? { ...d, logoEmpresa: dataUri } : d));
    } catch {
      /* ignore */
    } finally {
      setSubiendoLogo(false);
    }
  }

  function quitarLogo() {
    setLogoEmpresa(null);
    guardarLogo(null);
    setDocProps((d) => (d ? { ...d, logoEmpresa: null } : d));
  }

  function toggle(v) {
    setDocProps(null);
    if (idsSel.includes(v.id)) {
      setSeleccion((s) => s.filter((x) => x.id !== v.id));
    } else {
      setSeleccion((s) => [...s, { ...v }]);
    }
  }

  function editar(id, campo, valor) {
    setDocProps(null);
    setSeleccion((s) => s.map((v) => (v.id === id ? { ...v, [campo]: valor } : v)));
  }

  async function generar() {
    setGenerando(true);
    setDocProps(null);
    const orden = [...seleccion].sort((a, b) => (a.orden || 0) - (b.orden || 0));
    // Incrustamos cada foto ya convertida a JPEG (data URI) para que el PDF
    // la muestre siempre, sin importar el formato (AVIF/WebP) ni el origen.
    const vehiculos = await Promise.all(
      orden.map(async (v) => {
        const src = fotoDe(v);
        if (src && /^https?:/i.test(src)) {
          const dataUri = await urlAJpegDataUri(src);
          return { ...v, foto_url: dataUri };
        }
        return { ...v }; // ya es data URI (default embebido) o sin foto
      })
    );
    setDocProps({
      empresa,
      cliente,
      vehiculos,
      vigencia: Number(vigencia) || 10,
      conIva,
      // La fecha se calcula en el momento de generar, no al abrir la app,
      // así siempre queda la del día actual aunque la página quede abierta.
      fecha: hoy(),
      logoEmpresa,
    });
    setGenerando(false);
  }

  // Registra la descarga en el historial (últimas cotizaciones).
  async function registrarDescarga() {
    try {
      await supabase.from("renting_presupuestos").insert({
        cliente,
        vendedor: empresa.vendedor,
        sucursal: empresa.sucursal,
        espacio: ESPACIO,
        vigencia_dias: Number(vigencia) || 10,
        incluye_iva: conIva,
        fecha_texto: docProps?.fecha || hoy(),
        items: seleccion.map((v) => ({
          id: v.id,
          nombre: v.nombre,
          categoria: v.categoria || null,
          periodo: v.periodo || "Mensual",
          frecuencia_actualizacion: v.frecuencia_actualizacion || "Trimestral",
          plazo_meses: v.plazo_meses ?? null,
          personas: v.personas,
          transmision: v.transmision,
          traccion: v.traccion || null,
          aire_acondicionado: !!v.aire_acondicionado,
          direccion_asistida: !!v.direccion_asistida,
          cierre_centralizado: !!v.cierre_centralizado,
          airbag: !!v.airbag,
          km_mensuales: v.km_mensuales,
          tarifa_mensual: v.tarifa_mensual,
          franquicia_dano: v.franquicia_dano,
          franquicia_vuelco: v.franquicia_vuelco,
          notas: v.notas || null,
          cantidad_disponible: v.cantidad_disponible ?? null,
          foto_url: v.foto_url || null,
          foto_slug: v.foto_slug || null,
        })),
      });
    } catch {
      /* si falla el registro, la descarga igual se hizo */
    }
  }

  const nombrePdf = "Presupuesto" + (cliente ? " - " + cliente : "") + ".pdf";

  async function descargar() {
    if (!docProps) return;
    setDescargando(true);
    try {
      const blob = await pdf(<PresupuestoPDF {...docProps} />).toBlob();
      bajarBlob(blob, nombrePdf);
      await registrarDescarga();
      onDescarga && onDescarga();
      setMsg("Cotización descargada y guardada en el Historial ✓");
    } catch (e) {
      setMsg("No se pudo descargar el PDF.");
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="grid2">
      <section className="col">
        <div className="card">
          <h3>Datos del presupuesto</h3>
          <label className="fld">
            <span>Cliente</span>
            <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre de la empresa / cliente" />
          </label>
          <div className="row">
            <label className="fld">
              <span>Vigencia (días)</span>
              <input type="number" value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
            </label>
            <label className="fld fld-check">
              <input type="checkbox" checked={conIva} onChange={(e) => setConIva(e.target.checked)} />
              <span>Aplicar IVA (21%)</span>
            </label>
          </div>
          <div className="muted small">Fecha: {hoy()}</div>
        </div>

        <div className="card">
          <h3>Elegí los vehículos</h3>
          <div className="galeria">
            {catalogo.map((v) => {
              const activo = idsSel.includes(v.id);
              const foto = fotoDe(v);
              return (
                <button key={v.id} className={"veh-card" + (activo ? " sel" : "")} onClick={() => toggle(v)} type="button">
                  <div className="veh-foto">
                    {foto ? <img src={foto} alt={v.nombre} /> : <div className="veh-noimg">Sin foto</div>}
                    {v.categoria ? <span className="veh-cat">{v.categoria}</span> : null}
                    {activo ? <span className="veh-check">✓</span> : null}
                  </div>
                  <div className="veh-nombre">{v.nombre}</div>
                  <div className="veh-precio">{pesos(v.tarifa_mensual)}/mes</div>
                </button>
              );
            })}
          </div>
          {catalogo.length === 0 ? <p className="muted">No hay vehículos. Cargalos en “Catálogo y fotos”.</p> : null}
        </div>

        {seleccion.length > 0 && (
          <div className="card">
            <h3>Datos, tarifas y seguros</h3>
            <p className="muted small">Podés editar todo (categoría, datos y precios). Los cambios son solo para este presupuesto, no tocan el catálogo.</p>
            <datalist id="cat-list-pres">
              {CATEGORIAS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <datalist id="plazos-list">
              {PLAZOS.map((p) => (
                <option key={p} value={p}>{p} meses</option>
              ))}
            </datalist>
            {seleccion
              .slice()
              .sort((a, b) => (a.orden || 0) - (b.orden || 0))
              .map((v) => (
                <div key={v.id} className="item-edit">
                  <div className="item-head-row">
                    <input
                      className="item-nombre"
                      value={v.nombre}
                      onChange={(e) => editar(v.id, "nombre", e.target.value)}
                    />
                    <input
                      className="item-cat"
                      list="cat-list-pres"
                      value={v.categoria || ""}
                      onChange={(e) => editar(v.id, "categoria", e.target.value.toUpperCase())}
                      placeholder="Cat"
                      title="Categoría"
                    />
                  </div>
                  <div className="row item-specs">
                    <label className="fld sm-fld">
                      <span>Personas</span>
                      <input type="number" value={v.personas} onChange={(e) => editar(v.id, "personas", Number(e.target.value) || 0)} />
                    </label>
                    <label className="fld">
                      <span>Transmisión</span>
                      <select value={v.transmision} onChange={(e) => editar(v.id, "transmision", e.target.value)}>
                        <option>Manual</option>
                        <option>Automática</option>
                      </select>
                    </label>
                    <label className="fld">
                      <span>Tracción</span>
                      <input value={v.traccion || ""} onChange={(e) => editar(v.id, "traccion", e.target.value)} placeholder="4x4 (opcional)" />
                    </label>
                  </div>
                  <div className="chips-check">
                    {[
                      ["aire_acondicionado", "Aire acondicionado"],
                      ["direccion_asistida", "Dirección asistida"],
                      ["cierre_centralizado", "Cierre centralizado"],
                      ["airbag", "Airbag"],
                    ].map(([k, lbl]) => (
                      <label key={k} className={"chip-check" + (v[k] ? " on" : "")}>
                        <input type="checkbox" checked={!!v[k]} onChange={(e) => editar(v.id, k, e.target.checked)} />
                        {lbl}
                      </label>
                    ))}
                  </div>
                  <div className="row item-specs">
                    <label className="fld">
                      <span>Período de la tarifa</span>
                      <select value={v.periodo || "Mensual"} onChange={(e) => editar(v.id, "periodo", e.target.value)}>
                        {PERIODOS.map((pd) => (
                          <option key={pd}>{pd}</option>
                        ))}
                      </select>
                    </label>
                    <label className="fld sm-fld">
                      <span>Plazo (meses)</span>
                      <input
                        type="number"
                        list="plazos-list"
                        value={v.plazo_meses ?? ""}
                        onChange={(e) => editar(v.id, "plazo_meses", e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Elegí…"
                      />
                    </label>
                    <label className="fld sm-fld">
                      <span>Cant. disponible</span>
                      <input
                        type="number"
                        value={v.cantidad_disponible ?? ""}
                        onChange={(e) => editar(v.id, "cantidad_disponible", e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="—"
                      />
                    </label>
                  </div>
                  <div className="row item-specs">
                    <label className="fld">
                      <span>Actualización de tarifa (INDEC)</span>
                      <select
                        value={v.frecuencia_actualizacion || "Trimestral"}
                        onChange={(e) => editar(v.id, "frecuencia_actualizacion", e.target.value)}
                      >
                        {FRECUENCIAS.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="item-grid">
                    <label className="fld">
                      <span>Km mensuales</span>
                      <select
                        value={String(v.km_mensuales ?? "5000")}
                        onChange={(e) => editar(v.id, "km_mensuales", e.target.value)}
                      >
                        {!KM_OPCIONES.includes(String(v.km_mensuales ?? "5000")) ? (
                          <option value={String(v.km_mensuales)}>{kmLabel(v.km_mensuales)}</option>
                        ) : null}
                        {KM_OPCIONES.map((k) => (
                          <option key={k} value={k}>{kmLabel(k)}</option>
                        ))}
                      </select>
                    </label>
                    <NumFld label={"Tarifa " + (v.periodo || "Mensual").toLowerCase()} val={v.tarifa_mensual} on={(n) => editar(v.id, "tarifa_mensual", n)} money />
                    <FranqFld label="Franquicia Daño" val={v.franquicia_dano} on={(x) => editar(v.id, "franquicia_dano", x)} />
                    <FranqFld label="Franquicia vuelco" val={v.franquicia_vuelco} on={(x) => editar(v.id, "franquicia_vuelco", x)} />
                  </div>
                  <label className="fld">
                    <span>Notas / observaciones (opcional)</span>
                    <textarea
                      className="notas-area"
                      value={v.notas || ""}
                      onChange={(e) => editar(v.id, "notas", e.target.value)}
                      placeholder="Ej: incluye porta-equipaje, GPS, rotulado de la unidad…"
                      rows={2}
                    />
                  </label>
                </div>
              ))}
            <div className="acciones">
              <button className="btn primary" onClick={generar} disabled={generando}>
                {generando ? "Generando…" : "Generar PDF"}
              </button>
              {msg ? <span className="muted small">{msg}</span> : null}
            </div>
          </div>
        )}
      </section>

      <section className="col">
        <div className="card preview-card">
          <div className="preview-head">
            <h3>Vista previa</h3>
            {docProps ? (
              <button className="btn primary sm" onClick={descargar} disabled={descargando}>
                {descargando ? "Preparando…" : "⬇ Descargar PDF"}
              </button>
            ) : null}
          </div>
          {docProps ? (
            <PDFViewer className="pdf-viewer" showToolbar={false}>
              <PresupuestoPDF {...docProps} />
            </PDFViewer>
          ) : (
            <div className="preview-empty">
              <p>Elegí vehículos, ajustá las tarifas y tocá <b>Generar PDF</b> para ver el presupuesto.</p>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Logo de la empresa (portada del PDF)</h3>
          <p className="muted small">Aparece en la portada del presupuesto. Se guarda en esta computadora.</p>
          <div className="logo-uploader">
            <div className="logo-preview">
              {logoEmpresa ? <img src={logoEmpresa} alt="Logo de la empresa" /> : <span className="muted small">Sin logo</span>}
            </div>
            <div className="logo-actions">
              <label className="btn ghost sm file-btn">
                {subiendoLogo ? "Cargando…" : logoEmpresa ? "📷 Cambiar logo" : "📷 Subir logo"}
                <input type="file" accept="image/*" hidden onChange={(e) => subirLogo(e.target.files?.[0])} />
              </label>
              {logoEmpresa ? (
                <button className="btn ghost sm" onClick={quitarLogo}>Quitar</button>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function NumFld({ label, val, on, money }) {
  return (
    <label className="fld">
      <span>{label}</span>
      <div className="num-wrap">
        {money ? <i>$</i> : null}
        <input
          type="number"
          value={val ?? 0}
          onChange={(e) => on(e.target.value === "" ? 0 : Number(e.target.value))}
        />
      </div>
    </label>
  );
}

// Campo de franquicia: acepta un monto en pesos (ej: 500000) o un
// porcentaje (ej: 3%). Se guarda como texto para permitir ambos.
function FranqFld({ label, val, on }) {
  return (
    <label className="fld">
      <span>{label}</span>
      <input
        value={val ?? ""}
        onChange={(e) => on(e.target.value)}
        placeholder="$ monto o 3%"
      />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* HISTORIAL DE COTIZACIONES                                          */
/* ------------------------------------------------------------------ */
function TabHistorial({ historial, empresa, logoEmpresa, recargar }) {
  const [descargandoId, setDescargandoId] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  async function descargarHistorial(rec) {
    setDescargandoId(rec.id);
    try {
      const items = Array.isArray(rec.items) ? rec.items : [];
      const vehiculos = await Promise.all(
        items.map(async (v) => {
          const src = fotoDe(v);
          if (src && /^https?:/i.test(src)) return { ...v, foto_url: await urlAJpegDataUri(src) };
          return { ...v };
        })
      );
      const doc = (
        <PresupuestoPDF
          empresa={empresa}
          cliente={rec.cliente || ""}
          vehiculos={vehiculos}
          vigencia={rec.vigencia_dias || 10}
          conIva={!!rec.incluye_iva}
          fecha={rec.fecha_texto || fmtFecha(rec.created_at)}
          logoEmpresa={logoEmpresa}
        />
      );
      const blob = await pdf(doc).toBlob();
      bajarBlob(blob, "Presupuesto" + (rec.cliente ? " - " + rec.cliente : "") + ".pdf");
    } catch (e) {
      /* ignore */
    } finally {
      setDescargandoId(null);
    }
  }

  const q = busqueda.trim().toLowerCase();
  const lista = q
    ? historial.filter((rec) => {
        const items = Array.isArray(rec.items) ? rec.items : [];
        const texto = (rec.cliente || "") + " " + items.map((i) => i.nombre).join(" ") + " " + (rec.vendedor || "");
        return texto.toLowerCase().includes(q);
      })
    : historial;

  return (
    <div className="historial">
      <div className="cat-head">
        <div>
          <h2>Mis cotizaciones</h2>
          <p className="muted">
            Tus cotizaciones descargadas (vendedor: <b>{empresa.vendedor || "sin nombre"}</b>). Cada uno ve solo las suyas
            — cambiá tu nombre en <b>Configuración</b>. Podés volver a descargar cualquiera.
          </p>
        </div>
        <button className="btn ghost" onClick={recargar}>↻ Actualizar</button>
      </div>

      <div className="card" style={{ padding: 12 }}>
        <input
          className="hist-buscar"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente, vehículo o vendedor…"
        />
      </div>

      {lista.length === 0 ? (
        <div className="card">
          <p className="muted">
            {historial.length === 0
              ? "Todavía no hay cotizaciones. Cuando descargues un PDF, se guarda acá automáticamente."
              : "No hay resultados para la búsqueda."}
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="hist-list">
            {lista.map((rec) => {
              const items = Array.isArray(rec.items) ? rec.items : [];
              return (
                <div key={rec.id} className="hist-item">
                  <div className="hist-info">
                    <div className="hist-cliente">{rec.cliente || "Sin cliente"}</div>
                    <div className="hist-meta">
                      {fmtFecha(rec.created_at)}
                      {rec.vendedor ? " · " + rec.vendedor : ""} · {items.length} vehículo{items.length === 1 ? "" : "s"}
                    </div>
                    {items.length ? (
                      <div className="hist-veh">{items.map((i) => i.nombre).join(" · ")}</div>
                    ) : null}
                  </div>
                  <button
                    className="btn ghost sm"
                    onClick={() => descargarHistorial(rec)}
                    disabled={descargandoId === rec.id}
                    title="Volver a descargar este PDF"
                  >
                    {descargandoId === rec.id ? "…" : "⬇ PDF"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CATÁLOGO Y FOTOS                                                    */
/* ------------------------------------------------------------------ */
function TabCatalogo({ catalogo, onCambio }) {
  const [nuevo, setNuevo] = useState(false);
  return (
    <div className="catalogo">
      <div className="cat-head">
        <div>
          <h2>Catálogo de vehículos</h2>
          <p className="muted">
            Editá las tarifas base y subí la foto de cada vehículo. Se comparte con todo el equipo y queda como base para los próximos presupuestos.
          </p>
        </div>
        <button className="btn primary" onClick={() => setNuevo(true)}>+ Agregar vehículo</button>
      </div>

      {nuevo && (
        <VehiculoEditor
          inicial={vehiculoNuevo()}
          onGuardado={() => {
            setNuevo(false);
            onCambio();
          }}
          onCancelar={() => setNuevo(false)}
          esNuevo
        />
      )}

      <div className="cat-list">
        {catalogo.map((v) => (
          <VehiculoEditor key={v.id} inicial={v} onGuardado={onCambio} />
        ))}
      </div>
    </div>
  );
}

function VehiculoEditor({ inicial, onGuardado, onCancelar, esNuevo }) {
  const [v, setV] = useState(inicial);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");
  const foto = fotoDe(v);

  function set(campo, valor) {
    setV((prev) => ({ ...prev, [campo]: valor }));
  }

  async function subirFoto(file) {
    if (!file) return;
    setSubiendo(true);
    setMsg("");
    let blob;
    try {
      // Convertimos siempre a JPEG: el PDF (y algunos navegadores) no soportan
      // AVIF/WebP. Así toda foto queda en un formato universal.
      blob = await convertirAJpeg(file);
    } catch (e) {
      setSubiendo(false);
      setMsg("No se pudo procesar la imagen. Probá con otra.");
      return;
    }
    const base = slugify(v.nombre || "vehiculo") || "vehiculo";
    const path = `${base}-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET_FOTOS)
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (upErr) {
      setSubiendo(false);
      setMsg("Error al subir: " + upErr.message);
      return;
    }
    const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(path);
    set("foto_url", data.publicUrl);
    setSubiendo(false);
    setMsg("Foto cargada ✓ (acordate de Guardar)");
  }

  async function guardar() {
    if (!v.nombre.trim()) {
      setMsg("Poné un nombre al vehículo.");
      return;
    }
    setGuardando(true);
    setMsg("");
    const payload = {
      nombre: v.nombre.trim(),
      categoria: (v.categoria || "").trim() || null,
      cantidad_disponible:
        v.cantidad_disponible === "" || v.cantidad_disponible == null
          ? null
          : Number(v.cantidad_disponible),
      orden: Number(v.orden) || 0,
      personas: Number(v.personas) || 0,
      transmision: v.transmision,
      traccion: v.traccion || null,
      aire_acondicionado: !!v.aire_acondicionado,
      direccion_asistida: !!v.direccion_asistida,
      cierre_centralizado: !!v.cierre_centralizado,
      airbag: !!v.airbag,
      km_mensuales: String(v.km_mensuales ?? "").trim() || "5000",
      tarifa_mensual: Number(v.tarifa_mensual) || 0,
      franquicia_dano: String(v.franquicia_dano ?? "").trim() || null,
      franquicia_vuelco: String(v.franquicia_vuelco ?? "").trim() || null,
      foto_url: v.foto_url || null,
      // Clave de foto estable: se fija una vez y no cambia al renombrar,
      // así el vehículo no pierde su foto por defecto al editar el nombre.
      foto_slug: v.foto_slug || slugify(v.nombre) || null,
      espacio: ESPACIO,
      activo: true,
    };
    let error;
    if (v.id) {
      ({ error } = await supabase.from("renting_vehiculos").update(payload).eq("id", v.id));
    } else {
      ({ error } = await supabase.from("renting_vehiculos").insert(payload));
    }
    setGuardando(false);
    if (error) setMsg("Error: " + error.message);
    else onGuardado();
  }

  async function eliminar() {
    if (!confirm(`¿Quitar "${v.nombre}" del catálogo?`)) return;
    await supabase.from("renting_vehiculos").update({ activo: false }).eq("id", v.id);
    onGuardado();
  }

  return (
    <div className={"card veh-editor" + (esNuevo ? " nuevo" : "")}>
      <div className="veh-editor-grid">
        <div className="veh-editor-foto">
          <div className="veh-foto lg">
            {foto ? <img src={foto} alt={v.nombre} /> : <div className="veh-noimg">Sin foto</div>}
          </div>
          <label className="btn ghost sm file-btn">
            {subiendo ? "Subiendo…" : "📷 Subir / cambiar foto"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => subirFoto(e.target.files?.[0])}
            />
          </label>
        </div>

        <div className="veh-editor-campos">
          <div className="row">
            <label className="fld grow">
              <span>Nombre del vehículo</span>
              <input value={v.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Renault Kwid" />
            </label>
            <label className="fld sm-fld">
              <span>Categoría</span>
              <input
                list="categorias-list"
                value={v.categoria || ""}
                onChange={(e) => set("categoria", e.target.value.toUpperCase())}
                placeholder="Ej: M, S, J…"
              />
            </label>
            <label className="fld sm-fld">
              <span>Cant. disponible</span>
              <input
                type="number"
                value={v.cantidad_disponible ?? ""}
                onChange={(e) => set("cantidad_disponible", e.target.value)}
                placeholder="—"
              />
            </label>
            <label className="fld sm-fld">
              <span>Orden</span>
              <input type="number" value={v.orden} onChange={(e) => set("orden", e.target.value)} />
            </label>
          </div>
          <datalist id="categorias-list">
            {CATEGORIAS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          <div className="row">
            <label className="fld sm-fld">
              <span>Personas</span>
              <input type="number" value={v.personas} onChange={(e) => set("personas", e.target.value)} />
            </label>
            <label className="fld">
              <span>Transmisión</span>
              <select value={v.transmision} onChange={(e) => set("transmision", e.target.value)}>
                <option>Manual</option>
                <option>Automática</option>
              </select>
            </label>
            <label className="fld">
              <span>Tracción</span>
              <input value={v.traccion || ""} onChange={(e) => set("traccion", e.target.value)} placeholder="4x4 (opcional)" />
            </label>
          </div>

          <div className="chips-check">
            {[
              ["aire_acondicionado", "Aire acondicionado"],
              ["direccion_asistida", "Dirección asistida"],
              ["cierre_centralizado", "Cierre centralizado"],
              ["airbag", "Airbag"],
            ].map(([k, lbl]) => (
              <label key={k} className={"chip-check" + (v[k] ? " on" : "")}>
                <input type="checkbox" checked={!!v[k]} onChange={(e) => set(k, e.target.checked)} />
                {lbl}
              </label>
            ))}
          </div>

          <div className="item-grid">
            <label className="fld">
              <span>Km mensuales</span>
              <select
                value={String(v.km_mensuales ?? "5000")}
                onChange={(e) => set("km_mensuales", e.target.value)}
              >
                {!KM_OPCIONES.includes(String(v.km_mensuales ?? "5000")) ? (
                  <option value={String(v.km_mensuales)}>{kmLabel(v.km_mensuales)}</option>
                ) : null}
                {KM_OPCIONES.map((k) => (
                  <option key={k} value={k}>{kmLabel(k)}</option>
                ))}
              </select>
            </label>
            <NumFld label="Tarifa base" val={v.tarifa_mensual} on={(n) => set("tarifa_mensual", n)} money />
            <FranqFld label="Franquicia Daño" val={v.franquicia_dano} on={(x) => set("franquicia_dano", x)} />
            <FranqFld label="Franquicia vuelco" val={v.franquicia_vuelco} on={(x) => set("franquicia_vuelco", x)} />
          </div>

          <div className="acciones">
            <button className="btn primary" onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            {esNuevo ? (
              <button className="btn ghost" onClick={onCancelar}>Cancelar</button>
            ) : (
              <button className="btn danger-ghost" onClick={eliminar}>Quitar</button>
            )}
            {msg ? <span className="muted small">{msg}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CONFIGURACIÓN                                                       */
/* ------------------------------------------------------------------ */
function TabConfig({ empresa, setEmpresa }) {
  const [e, setE] = useState(empresa);
  const [msg, setMsg] = useState("");
  function set(k, val) {
    setE((p) => ({ ...p, [k]: val }));
  }
  function guardar() {
    guardarEmpresa(e);
    setEmpresa(e);
    setMsg("Configuración guardada ✓");
  }
  return (
    <div className="config">
      <div className="card">
        <h2>Configuración</h2>
        <p className="muted">Estos datos aparecen en la portada y el pie del PDF.</p>
        {[
          ["razon", "Razón / encabezado"],
          ["vendedor", "Vendedor"],
          ["email", "Email"],
          ["telefono", "Teléfono"],
          ["direccion", "Dirección"],
          ["sucursal", "Sucursal"],
        ].map(([k, lbl]) => (
          <label key={k} className="fld">
            <span>{lbl}</span>
            <input value={e[k] || ""} onChange={(ev) => set(k, ev.target.value)} />
          </label>
        ))}
        <div className="acciones">
          <button className="btn primary" onClick={guardar}>Guardar</button>
          <button className="btn ghost" onClick={() => setE({ ...EMPRESA_DEFAULT })}>Restaurar valores</button>
          {msg ? <span className="muted small">{msg}</span> : null}
        </div>
      </div>
    </div>
  );
}
