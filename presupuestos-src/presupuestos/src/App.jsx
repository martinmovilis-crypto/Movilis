import React, { useEffect, useMemo, useState } from "react";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { supabase, BUCKET_FOTOS } from "./supabaseClient.js";
import PresupuestoPDF from "./PresupuestoPDF.jsx";
import {
  cargarEmpresa,
  guardarEmpresa,
  EMPRESA_DEFAULT,
  CATEGORIAS,
  fotoDe,
  slugify,
  pesos,
  vehiculoNuevo,
} from "./data.js";

const hoy = () =>
  new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });

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

export default function App() {
  const [tab, setTab] = useState("presupuesto");
  const [empresa, setEmpresa] = useState(cargarEmpresa());
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
      .order("orden", { ascending: true });
    if (error) setError(error.message);
    else setCatalogo(data || []);
    setCargando(false);
  }

  useEffect(() => {
    refrescarCatalogo();
  }, []);

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
          <button className={tab === "catalogo" ? "on" : ""} onClick={() => setTab("catalogo")}>
            Catálogo y fotos
          </button>
          <button className={tab === "config" ? "on" : ""} onClick={() => setTab("config")}>
            Configuración
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
              <TabPresupuesto empresa={empresa} catalogo={catalogo} />
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
function TabPresupuesto({ empresa, catalogo }) {
  const [cliente, setCliente] = useState("");
  const [fecha] = useState(hoy());
  const [vigencia, setVigencia] = useState(10);
  const [conIva, setConIva] = useState(false);
  const [seleccion, setSeleccion] = useState([]); // copias editables
  const [docProps, setDocProps] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  const idsSel = seleccion.map((v) => v.id);

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

  function generar() {
    const orden = [...seleccion].sort((a, b) => (a.orden || 0) - (b.orden || 0));
    setDocProps({
      empresa,
      cliente,
      vehiculos: orden,
      vigencia: Number(vigencia) || 10,
      conIva,
      fecha,
    });
  }

  async function guardar() {
    setGuardando(true);
    setMsg("");
    const { error } = await supabase.from("renting_presupuestos").insert({
      cliente,
      vendedor: empresa.vendedor,
      sucursal: empresa.sucursal,
      vigencia_dias: Number(vigencia) || 10,
      incluye_iva: conIva,
      items: seleccion.map((v) => ({
        nombre: v.nombre,
        km_mensuales: v.km_mensuales,
        tarifa_mensual: v.tarifa_mensual,
        franquicia_dano: v.franquicia_dano,
        franquicia_vuelco: v.franquicia_vuelco,
      })),
    });
    setGuardando(false);
    setMsg(error ? "Error al guardar: " + error.message : "Presupuesto guardado ✓");
  }

  const nombrePdf =
    "Presupuesto" + (cliente ? " - " + cliente : "") + ".pdf";

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
          <div className="muted small">Fecha: {fecha}</div>
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
            <h3>Tarifas y seguros</h3>
            <p className="muted small">Los valores vienen precargados. Cambialos si necesitás; solo afectan a este presupuesto.</p>
            {seleccion
              .slice()
              .sort((a, b) => (a.orden || 0) - (b.orden || 0))
              .map((v) => (
                <div key={v.id} className="item-edit">
                  <div className="item-head">{v.nombre}</div>
                  <div className="item-grid">
                    <NumFld label="Km mensuales" val={v.km_mensuales} on={(n) => editar(v.id, "km_mensuales", n)} />
                    <NumFld label="Tarifa mensual" val={v.tarifa_mensual} on={(n) => editar(v.id, "tarifa_mensual", n)} money />
                    <NumFld label="Franquicia Daño" val={v.franquicia_dano} on={(n) => editar(v.id, "franquicia_dano", n)} money />
                    <NumFld label="Franquicia vuelco" val={v.franquicia_vuelco} on={(n) => editar(v.id, "franquicia_vuelco", n)} money />
                  </div>
                </div>
              ))}
            <div className="acciones">
              <button className="btn primary" onClick={generar}>Generar PDF</button>
              <button className="btn ghost" onClick={guardar} disabled={guardando}>
                {guardando ? "Guardando…" : "Guardar en historial"}
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
              <PDFDownloadLink document={<PresupuestoPDF {...docProps} />} fileName={nombrePdf} className="btn primary sm">
                {({ loading }) => (loading ? "Preparando…" : "⬇ Descargar PDF")}
              </PDFDownloadLink>
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
      orden: Number(v.orden) || 0,
      personas: Number(v.personas) || 0,
      transmision: v.transmision,
      traccion: v.traccion || null,
      aire_acondicionado: !!v.aire_acondicionado,
      direccion_asistida: !!v.direccion_asistida,
      cierre_centralizado: !!v.cierre_centralizado,
      airbag: !!v.airbag,
      km_mensuales: Number(v.km_mensuales) || 0,
      tarifa_mensual: Number(v.tarifa_mensual) || 0,
      franquicia_dano: Number(v.franquicia_dano) || 0,
      franquicia_vuelco: Number(v.franquicia_vuelco) || 0,
      foto_url: v.foto_url || null,
      // Clave de foto estable: se fija una vez y no cambia al renombrar,
      // así el vehículo no pierde su foto por defecto al editar el nombre.
      foto_slug: v.foto_slug || slugify(v.nombre) || null,
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
            <NumFld label="Km mensuales" val={v.km_mensuales} on={(n) => set("km_mensuales", n)} />
            <NumFld label="Tarifa base" val={v.tarifa_mensual} on={(n) => set("tarifa_mensual", n)} money />
            <NumFld label="Franquicia Daño" val={v.franquicia_dano} on={(n) => set("franquicia_dano", n)} money />
            <NumFld label="Franquicia vuelco" val={v.franquicia_vuelco} on={(n) => set("franquicia_vuelco", n)} money />
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
