import { FOTOS_DEFAULT, HERTZ_LOGO } from "./fotos.js";

export { HERTZ_LOGO };

// ---- Datos de la empresa (editable en Configuración, se guarda en localStorage) ----
export const EMPRESA_DEFAULT = {
  marca: "Hertz",
  razon: "Hertz La Plata · Grupo Randazzo",
  vendedor: "M. A. Gallegos",
  email: "magallegos@gruporandazzo.com.ar",
  telefono: "(0221) 356-8686",
  direccion: "La Plata · Avenida 44 e/ 142 y 143",
  sucursal: "La Plata",
};

export const CONFIG_KEY = "presupuestos_empresa_v1";

export function cargarEmpresa() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...EMPRESA_DEFAULT, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...EMPRESA_DEFAULT };
}

export function guardarEmpresa(empresa) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(empresa));
}

// Logo de la empresa que va en la portada del PDF (data URI, guardado local).
export const LOGO_KEY = "presupuestos_logo_v1";

export function cargarLogo() {
  try {
    return localStorage.getItem(LOGO_KEY) || null;
  } catch {
    return null;
  }
}

export function guardarLogo(dataUri) {
  try {
    if (dataUri) localStorage.setItem(LOGO_KEY, dataUri);
    else localStorage.removeItem(LOGO_KEY);
  } catch {
    /* ignore */
  }
}

// ---- Servicios incluidos por vehículo (bullets de la cotización) ----
export const SERVICIOS_INCLUIDOS = [
  "Cobertura contra todo riesgo con franquicia",
  "Desgaste de cubierta por uso (60.000 km)",
  "Mantenimiento preventivo cada 10.000 km",
  "Asistencia en viaje las 24 horas",
];

// ---- Texto institucional (portada de servicios) ----
export const INSTITUCIONAL =
  "Hertz es una empresa líder en alquiler de autos presente en más de 150 países, " +
  "con una trayectoria exitosa enfocada en la seguridad, confiabilidad y tecnología. " +
  "La sucursal de Hertz en La Plata ofrece una amplia variedad de vehículos mediante " +
  "la modalidad de renting corporativo para su empresa. Contamos con personal capacitado " +
  "y comprometido en brindar una excelente calidad de servicio.";

export const SERVICIOS = [
  {
    titulo: "Mantenimiento preventivo y correctivo",
    desc: "Llevamos a cabo el mantenimiento de tu flota siguiendo las especificaciones del fabricante, en talleres propios y en una amplia red de servicios en todo el país.",
  },
  {
    titulo: "Vehículo sustituto",
    desc: "Garantizamos acceso a vehículos de reemplazo ante fallas, reparaciones o siniestros para asegurar tu movilidad.",
  },
  {
    titulo: "Gestión de siniestros e infracciones",
    desc: "Asumimos la gestión de las infracciones de tránsito y siniestros de los vehículos en alquiler.",
  },
  {
    titulo: "Cobertura nacional para flotas",
    desc: "Servicio de cobertura que garantiza la operatividad las 24 horas, todos los días del año, en cualquier punto del país.",
  },
  {
    titulo: "Gestión de papeles y seguro",
    desc: "Pago de patentes, grabado de autopartes y gestión del seguro. Nos encargamos de todos los trámites para que alquiles sin preocupaciones.",
  },
];

// ---- Utilidades ----
export function slugify(nombre) {
  return (nombre || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function fotoDe(vehiculo) {
  if (vehiculo?.foto_url) return vehiculo.foto_url;
  // Clave estable de foto: no cambia aunque se renombre el vehículo.
  if (vehiculo?.foto_slug && FOTOS_DEFAULT[vehiculo.foto_slug]) {
    return FOTOS_DEFAULT[vehiculo.foto_slug];
  }
  return FOTOS_DEFAULT[slugify(vehiculo?.nombre)] || null;
}

const nf = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export function pesos(n) {
  const v = Number(n || 0);
  return "$ " + nf.format(Math.round(v));
}

export function numero(n) {
  return nf.format(Number(n || 0));
}

export const IVA = 0.21;

// Vehículo nuevo por defecto para el catálogo
// Categorías de la tarifa (según la tabla interna). Editable en el catálogo.
export const CATEGORIAS = [
  "C", "H", "H1", "K", "K1", "Z", "N1", "M", "S", "L", "J", "U1", "U2", "U3", "U4",
];

// Período de la tarifa (elegible al cotizar).
export const PERIODOS = ["Mensual", "Trimestral", "Cuatrimestral", "Semestral", "Anual"];

// Frecuencia de actualización de la tarifa según INDEC (negociable por empresa).
export const FRECUENCIAS = ["Mensual", "Bimestral", "Trimestral", "Cuatrimestral", "Semestral", "Anual"];

// Plazos de contrato más comunes (en meses). Editable igual por si negocian otro.
export const PLAZOS = [12, 24, 36, 48, 60];

// Opciones de kilómetros mensuales.
export const KM_OPCIONES = ["5000", "3000", "Libre"];

// Etiqueta para el selector: "5.000 km", "3.000 km", "KM LIBRE".
export function kmLabel(k) {
  return String(k).toLowerCase() === "libre" ? "KM LIBRE" : numero(Number(k)) + " km";
}

// Texto de km para el PDF: número -> "5.000 KM"; "Libre" -> "KM LIBRE".
export function kmTexto(km) {
  const s = String(km ?? "").trim();
  if (s === "") return "—";
  if (/^\d+$/.test(s)) return numero(Number(s)) + " KM";
  return s.toLowerCase() === "libre" ? "KM LIBRE" : s.toUpperCase();
}

export function vehiculoNuevo() {
  return {
    nombre: "",
    categoria: "",
    cantidad_disponible: "",
    orden: 99,
    personas: 5,
    transmision: "Manual",
    traccion: "",
    aire_acondicionado: true,
    direccion_asistida: true,
    cierre_centralizado: true,
    airbag: true,
    km_mensuales: "5000",
    tarifa_mensual: 0,
    franquicia_dano: 0,
    franquicia_vuelco: 0,
    foto_url: "",
    foto_slug: "",
    activo: true,
  };
}
