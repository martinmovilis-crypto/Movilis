import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { HERTZ_LOGO } from "./fotos.js";
import { INSTITUCIONAL, SERVICIOS, fotoDe, pesos, numero, kmTexto, franquiciaTexto, IVA } from "./data.js";

// Paleta con fuerza: negro + amarillo Hertz
const AMARILLO = "#FFCC00";
const NEGRO = "#141414";
const CARBON = "#1c1c1c";
const PANEL = "#191919";
const GRIS_TXT = "#b4b4b4";
const GRIS_LINEA = "#e2e2e2";
const BLANCO = "#ffffff";

// Diapositiva 16:9 (10" x 5.625" = 720 x 405 pt), igual al PPT
const SLIDE = [720, 405];

const s = StyleSheet.create({
  page: { fontSize: 9, color: NEGRO, fontFamily: "Helvetica", backgroundColor: BLANCO },

  // ---- Barra superior amarilla (full-bleed) ----
  barra: {
    backgroundColor: AMARILLO,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 34,
  },
  barraIzq: { flexDirection: "row", alignItems: "center", flexShrink: 1, paddingRight: 10 },
  barraTitulo: { fontFamily: "Helvetica-Bold", fontSize: 14, letterSpacing: 0.5, color: NEGRO },
  barraCat: {
    marginLeft: 10,
    backgroundColor: NEGRO,
    color: AMARILLO,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    letterSpacing: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  barraDer: { flexDirection: "row", alignItems: "center" },
  logo: { width: 84, height: 30, objectFit: "contain" },
  barraSuc: {
    marginLeft: 12,
    paddingLeft: 12,
    borderLeftWidth: 1.5,
    borderLeftColor: "rgba(0,0,0,0.35)",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: NEGRO,
  },

  // ---- Cuerpo cotización ----
  cuerpo: { flexGrow: 1, paddingHorizontal: 34, paddingTop: 14 },
  vehTitulo: { fontFamily: "Helvetica-Bold", fontSize: 23, color: NEGRO },
  vehLinea: { width: 46, height: 4, backgroundColor: AMARILLO, marginTop: 5, marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  chip: {
    backgroundColor: NEGRO,
    color: BLANCO,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  // Título del auto + notas al costado (para que una nota larga no se meta
  // sobre la imagen del vehículo).
  tituloRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  tituloCol: { flexShrink: 1, paddingRight: 16 },
  notaCol: { width: "42%", borderLeftWidth: 3, borderLeftColor: AMARILLO, paddingLeft: 8, paddingTop: 2 },
  notaLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#8a8a8a", letterSpacing: 1.5, marginBottom: 2 },
  notaTxt: { fontSize: 8.5, color: "#3a3a3a", lineHeight: 1.35 },

  fila: { flexDirection: "row", flexGrow: 1, alignItems: "center" },
  colFoto: { width: "57%", alignItems: "center", justifyContent: "center", paddingRight: 14 },
  foto: { maxWidth: "100%", maxHeight: 178, objectFit: "contain" },
  fotoVacia: { color: "#c2c2c2", fontSize: 11 },

  // ---- Panel de precio (oscuro, protagonista) ----
  panel: { width: "43%", backgroundColor: PANEL, borderRadius: 10, padding: 14, justifyContent: "center" },
  panelLabel: { color: AMARILLO, fontSize: 8.5, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  panelPrecioRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 2 },
  panelPrecio: { color: BLANCO, fontFamily: "Helvetica-Bold", fontSize: 25 },
  panelIva: { color: AMARILLO, fontFamily: "Helvetica-Bold", fontSize: 18, marginLeft: 5, marginBottom: 2 },
  panelIvaIncl: { color: GRIS_TXT, fontSize: 9, marginLeft: 5, marginBottom: 3 },
  panelSub: { color: GRIS_TXT, fontSize: 7.5, marginTop: 3 },
  panelDiv: { height: 3, width: 34, backgroundColor: AMARILLO, marginVertical: 9 },
  panelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  panelRowLabel: { color: GRIS_TXT, fontSize: 8.5 },
  panelRowVal: { color: BLANCO, fontSize: 10, fontFamily: "Helvetica-Bold" },

  // ---- Pie negro (full-bleed) ----
  pie: { backgroundColor: NEGRO, paddingHorizontal: 34, paddingVertical: 9, flexDirection: "row", justifyContent: "space-between" },
  pieCol: { flexShrink: 1, paddingRight: 12 },
  pieTag: { color: AMARILLO, fontFamily: "Helvetica-Bold", fontSize: 8, letterSpacing: 1, marginBottom: 3 },
  pieNota: { color: "#c9c9c9", fontSize: 6.8, lineHeight: 1.35 },
  pieContacto: { color: "#8f8f8f", fontSize: 6.8, textAlign: "right", lineHeight: 1.4 },

  // ---- Portada (clara, estilo PowerPoint) ----
  portada: { flexGrow: 1, backgroundColor: BLANCO, paddingHorizontal: 50, paddingTop: 54, paddingBottom: 40 },
  portadaBarraDer: { position: "absolute", right: 0, top: 0, bottom: 0, width: 11, backgroundColor: AMARILLO },
  portadaTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  portadaTitBlock: { flexShrink: 1, paddingRight: 24 },
  portadaEyebrow: { color: "#8a8a8a", fontFamily: "Helvetica-Bold", fontSize: 13, letterSpacing: 5 },
  portadaTitulo: { color: NEGRO, fontFamily: "Helvetica-Bold", fontSize: 33, lineHeight: 1.06, marginTop: 8 },
  portadaBarra: { width: 84, height: 5, backgroundColor: AMARILLO, marginTop: 16 },
  portadaLogoTop: { width: 158, height: 56, objectFit: "contain", marginTop: 4 },
  portadaLogoEmpresaWrap: {
    position: "absolute",
    right: 50,
    top: 132,
    width: 280,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  portadaLogoEmpresa: { maxWidth: 280, maxHeight: 150, objectFit: "contain" },
  // Bloque vertical: nombre de la empresa arriba y la fecha debajo. Se limita
  // el ancho para que un nombre largo no se meta debajo del logo de la derecha.
  portadaMeta: { marginTop: 30, maxWidth: 320 },
  metaLabel: { color: "#9a9a9a", fontSize: 8.5, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  metaValor: { color: NEGRO, fontSize: 14, marginTop: 3 },
  portadaPie: { borderTopWidth: 1, borderTopColor: GRIS_LINEA, paddingTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  portadaPieSuc: { color: NEGRO, fontFamily: "Helvetica-Bold", fontSize: 11, letterSpacing: 1 },
  portadaPieVend: { color: "#6f6f6f", fontSize: 9, marginTop: 2 },
  portadaPieTxt: { color: "#8a8a8a", fontSize: 9, textAlign: "right", lineHeight: 1.5 },

  // ---- Página institucional ----
  instBody: { flexGrow: 1, paddingHorizontal: 34, paddingTop: 12 },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 15, color: NEGRO },
  h2linea: { width: 40, height: 4, backgroundColor: AMARILLO, marginTop: 4, marginBottom: 8 },
  parrafo: { fontSize: 9.5, lineHeight: 1.45, color: "#333", marginBottom: 12 },
  servGrid: { flexDirection: "row", flexWrap: "wrap" },
  servCard: {
    width: "48%",
    marginRight: "2%",
    marginBottom: 7,
    borderWidth: 1,
    borderColor: GRIS_LINEA,
    borderLeftWidth: 4,
    borderLeftColor: AMARILLO,
    borderRadius: 4,
    padding: 8,
  },
  servTit: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 2, color: NEGRO },
  servDesc: { fontSize: 8.5, color: "#666", lineHeight: 1.4 },
});

function BarraSuperior({ empresa, titulo, categoria }) {
  return (
    <View style={s.barra}>
      <View style={s.barraIzq}>
        <Text style={s.barraTitulo}>{titulo}</Text>
        {categoria ? <Text style={s.barraCat}>CAT. {categoria}</Text> : null}
      </View>
      <View style={s.barraDer}>
        <Image src={HERTZ_LOGO} style={s.logo} />
        <Text style={s.barraSuc}>{(empresa.sucursal || "La Plata").toUpperCase()}</Text>
      </View>
    </View>
  );
}

function chipsSpec(v) {
  const c = [`${v.personas} PERSONAS`, v.transmision.toUpperCase()];
  if (v.traccion) c.push(v.traccion.toUpperCase());
  if (v.aire_acondicionado) c.push("AIRE ACOND.");
  if (v.direccion_asistida) c.push("DIRECCIÓN ASISTIDA");
  if (v.cierre_centralizado) c.push("CIERRE CENTRAL.");
  if (v.airbag) c.push("AIRBAG");
  return c;
}

function PaginaVehiculo({ v, empresa, cliente, vigencia, conIva }) {
  const foto = fotoDe(v);
  const factor = conIva ? 1 + IVA : 1;
  const tituloBarra = (cliente || empresa.razon || "Presupuesto").toUpperCase();
  return (
    <Page size={SLIDE} style={s.page}>
      <BarraSuperior empresa={empresa} titulo={tituloBarra} categoria={v.categoria} />

      <View style={s.cuerpo}>
        <View style={s.tituloRow}>
          <View style={s.tituloCol}>
            <Text style={s.vehTitulo}>{v.nombre}</Text>
            <View style={s.vehLinea} />
          </View>
          {v.notas && String(v.notas).trim() ? (
            <View style={s.notaCol}>
              <Text style={s.notaLabel}>NOTAS</Text>
              <Text style={s.notaTxt}>{String(v.notas).trim()}</Text>
            </View>
          ) : null}
        </View>
        <View style={s.chips}>
          {chipsSpec(v).map((c, i) => (
            <Text key={i} style={s.chip}>{c}</Text>
          ))}
        </View>

        <View style={s.fila}>
          <View style={s.colFoto}>
            {foto ? <Image src={foto} style={s.foto} /> : <Text style={s.fotoVacia}>Sin foto cargada</Text>}
          </View>

          <View style={s.panel}>
            <Text style={s.panelLabel}>TARIFA {(v.periodo || "Mensual").toUpperCase()}</Text>
            <View style={s.panelPrecioRow}>
              <Text style={s.panelPrecio}>{pesos(v.tarifa_mensual * factor)}</Text>
              {conIva ? (
                <Text style={s.panelIvaIncl}>IVA incl.</Text>
              ) : (
                <Text style={s.panelIva}>+ IVA</Text>
              )}
            </View>
            <Text style={s.panelSub}>
              ACTUALIZACIÓN DE LA TARIFA {(v.frecuencia_actualizacion || "Trimestral").toUpperCase()} SEGÚN INDEC
            </Text>
            <View style={s.panelDiv} />
            {v.plazo_meses != null && Number(v.plazo_meses) > 0 ? (
              <View style={s.panelRow}>
                <Text style={s.panelRowLabel}>Plazo del contrato</Text>
                <Text style={s.panelRowVal}>{numero(v.plazo_meses)} meses</Text>
              </View>
            ) : null}
            {v.cantidad_disponible != null && Number(v.cantidad_disponible) > 0 ? (
              <View style={s.panelRow}>
                <Text style={s.panelRowLabel}>Unidades disponibles</Text>
                <Text style={s.panelRowVal}>{numero(v.cantidad_disponible)}</Text>
              </View>
            ) : null}
            <View style={s.panelRow}>
              <Text style={s.panelRowLabel}>Kilómetros por mes</Text>
              <Text style={s.panelRowVal}>{kmTexto(v.km_mensuales)}</Text>
            </View>
            <View style={s.panelRow}>
              <Text style={s.panelRowLabel}>Franquicia por daño</Text>
              <Text style={s.panelRowVal}>{franquiciaTexto(v.franquicia_dano, factor)}</Text>
            </View>
            <View style={[s.panelRow, { marginBottom: 0 }]}>
              <Text style={s.panelRowLabel}>Franquicia por vuelco</Text>
              <Text style={s.panelRowVal}>{franquiciaTexto(v.franquicia_vuelco, factor)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={s.pie}>
        <View style={s.pieCol}>
          <Text style={s.pieTag}>{conIva ? "PRECIOS CON IVA (21%)" : "PRECIOS SIN IVA"}</Text>
          <Text style={s.pieNota}>Cobertura contra todo riesgo con franquicia · Desgaste de cubierta por uso (60.000 km) · Mantenimiento cada 10.000 km · Asistencia en viaje 24 h.</Text>
          <Text style={s.pieNota}>Cotización válida por {vigencia} días desde su emisión.</Text>
        </View>
        <View>
          <Text style={s.pieContacto}>{empresa.vendedor} · {empresa.email}</Text>
          <Text style={s.pieContacto}>{empresa.telefono} · {empresa.direccion}</Text>
        </View>
      </View>
    </Page>
  );
}

export default function PresupuestoPDF({ empresa, cliente, vehiculos, vigencia, conIva, fecha, logoEmpresa }) {
  return (
    <Document title={`Presupuesto ${cliente || ""}`.trim()} author={empresa.razon}>
      {/* Portada (clara, estilo PowerPoint) */}
      <Page size={SLIDE} style={s.page}>
        <View style={s.portada}>
          <View style={s.portadaBarraDer} />
          {logoEmpresa ? (
            <View style={s.portadaLogoEmpresaWrap}>
              <Image src={logoEmpresa} style={s.portadaLogoEmpresa} />
            </View>
          ) : null}
          <View style={s.portadaTop}>
            <View style={s.portadaTitBlock}>
              <Text style={s.portadaEyebrow}>PRESUPUESTO</Text>
              <Text style={s.portadaTitulo}>Renting{"\n"}a largo plazo</Text>
              <View style={s.portadaBarra} />
            </View>
            <Image src={HERTZ_LOGO} style={s.portadaLogoTop} />
          </View>

          <View style={s.portadaMeta}>
            {cliente ? (
              <View style={{ marginBottom: 14 }}>
                <Text style={s.metaLabel}>PREPARADO PARA</Text>
                <Text style={s.metaValor}>{cliente}</Text>
              </View>
            ) : null}
            <View>
              <Text style={s.metaLabel}>FECHA</Text>
              <Text style={s.metaValor}>{fecha}</Text>
            </View>
          </View>

          <View style={{ flexGrow: 1 }} />

          <View style={s.portadaPie}>
            <View>
              <Text style={s.portadaPieSuc}>{empresa.razon}</Text>
              <Text style={s.portadaPieVend}>{empresa.vendedor}</Text>
            </View>
            <View>
              <Text style={s.portadaPieTxt}>{empresa.email} · {empresa.telefono}</Text>
              <Text style={s.portadaPieTxt}>{empresa.direccion}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Institucional + servicios */}
      <Page size={SLIDE} style={s.page}>
        <BarraSuperior empresa={empresa} titulo="RENTING CORPORATIVO" />
        <View style={s.instBody}>
          <Text style={s.h2}>Sobre nosotros</Text>
          <View style={s.h2linea} />
          <Text style={s.parrafo}>{INSTITUCIONAL}</Text>
          <Text style={s.h2}>Servicios incluidos</Text>
          <View style={s.h2linea} />
          <View style={s.servGrid} wrap={false}>
            {SERVICIOS.map((sv, i) => (
              <View key={i} style={s.servCard}>
                <Text style={s.servTit}>{sv.titulo}</Text>
                <Text style={s.servDesc}>{sv.desc}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>

      {/* Una página por vehículo */}
      {vehiculos.map((v) => (
        <PaginaVehiculo key={v.id || v.nombre} v={v} empresa={empresa} cliente={cliente} vigencia={vigencia} conIva={conIva} />
      ))}
    </Document>
  );
}
