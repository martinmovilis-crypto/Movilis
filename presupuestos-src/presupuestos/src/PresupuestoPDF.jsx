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
import { INSTITUCIONAL, SERVICIOS, fotoDe, pesos, numero, IVA } from "./data.js";

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
  barraTitulo: { fontFamily: "Helvetica-Bold", fontSize: 16, letterSpacing: 3, color: NEGRO },
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

  fila: { flexDirection: "row", flexGrow: 1 },
  colFoto: { width: "54%", alignItems: "center", justifyContent: "center", paddingRight: 16 },
  foto: { maxWidth: "100%", maxHeight: 178, objectFit: "contain" },
  fotoVacia: { color: "#c2c2c2", fontSize: 11 },

  // ---- Panel de precio (oscuro, protagonista) ----
  panel: { width: "46%", backgroundColor: PANEL, borderRadius: 12, padding: 18, justifyContent: "center" },
  panelLabel: { color: AMARILLO, fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  panelPrecio: { color: BLANCO, fontFamily: "Helvetica-Bold", fontSize: 34, marginTop: 2 },
  panelSub: { color: GRIS_TXT, fontSize: 8, marginTop: 1 },
  panelDiv: { height: 3, width: 40, backgroundColor: AMARILLO, marginVertical: 12 },
  panelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 7 },
  panelRowLabel: { color: GRIS_TXT, fontSize: 9 },
  panelRowVal: { color: BLANCO, fontSize: 11, fontFamily: "Helvetica-Bold" },

  // ---- Pie negro (full-bleed) ----
  pie: { backgroundColor: NEGRO, paddingHorizontal: 34, paddingVertical: 9, flexDirection: "row", justifyContent: "space-between" },
  pieCol: { flexShrink: 1, paddingRight: 12 },
  pieTag: { color: AMARILLO, fontFamily: "Helvetica-Bold", fontSize: 8, letterSpacing: 1, marginBottom: 3 },
  pieNota: { color: "#c9c9c9", fontSize: 6.8, lineHeight: 1.35 },
  pieContacto: { color: "#8f8f8f", fontSize: 6.8, textAlign: "right", lineHeight: 1.4 },

  // ---- Portada (fondo negro) ----
  portada: { flexGrow: 1, backgroundColor: NEGRO },
  portadaLogoBand: { backgroundColor: AMARILLO, height: 78, justifyContent: "center", paddingHorizontal: 46 },
  portadaLogo: { width: 150, height: 52, objectFit: "contain" },
  portadaBody: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 46 },
  portadaEyebrow: { color: AMARILLO, fontFamily: "Helvetica-Bold", fontSize: 13, letterSpacing: 4 },
  portadaTitulo: { color: BLANCO, fontFamily: "Helvetica-Bold", fontSize: 40, lineHeight: 1.05, marginTop: 6 },
  portadaBarra: { width: 90, height: 6, backgroundColor: AMARILLO, marginTop: 18, marginBottom: 18 },
  portadaRazon: { color: GRIS_TXT, fontSize: 13 },
  portadaMeta: { flexDirection: "row", marginTop: 20 },
  metaLabel: { color: AMARILLO, fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  metaValor: { color: BLANCO, fontSize: 13, marginTop: 3 },
  portadaPie: { backgroundColor: AMARILLO, paddingHorizontal: 46, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between" },
  portadaPieTxt: { color: NEGRO, fontSize: 8.5, fontFamily: "Helvetica-Bold" },

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

function BarraSuperior({ empresa, titulo }) {
  return (
    <View style={s.barra}>
      <Text style={s.barraTitulo}>{titulo}</Text>
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

function PaginaVehiculo({ v, empresa, vigencia, conIva }) {
  const foto = fotoDe(v);
  const factor = conIva ? 1 + IVA : 1;
  return (
    <Page size={SLIDE} style={s.page}>
      <BarraSuperior empresa={empresa} titulo="COTIZACIÓN" />

      <View style={s.cuerpo}>
        <Text style={s.vehTitulo}>{v.nombre}</Text>
        <View style={s.vehLinea} />
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
            <Text style={s.panelLabel}>TARIFA MENSUAL</Text>
            <Text style={s.panelPrecio}>{pesos(v.tarifa_mensual * factor)}</Text>
            <Text style={s.panelSub}>{conIva ? "IVA (21%) incluido" : "+ IVA · reajuste trimestral"}</Text>
            <View style={s.panelDiv} />
            <View style={s.panelRow}>
              <Text style={s.panelRowLabel}>Kilómetros por mes</Text>
              <Text style={s.panelRowVal}>{numero(v.km_mensuales)} KM</Text>
            </View>
            <View style={s.panelRow}>
              <Text style={s.panelRowLabel}>Franquicia por daño</Text>
              <Text style={s.panelRowVal}>{pesos(v.franquicia_dano * factor)}</Text>
            </View>
            <View style={[s.panelRow, { marginBottom: 0 }]}>
              <Text style={s.panelRowLabel}>Franquicia por vuelco</Text>
              <Text style={s.panelRowVal}>{pesos(v.franquicia_vuelco * factor)}</Text>
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

export default function PresupuestoPDF({ empresa, cliente, vehiculos, vigencia, conIva, fecha }) {
  return (
    <Document title={`Presupuesto ${cliente || ""}`.trim()} author={empresa.razon}>
      {/* Portada */}
      <Page size={SLIDE} style={s.page}>
        <View style={s.portada}>
          <View style={s.portadaLogoBand}>
            <Image src={HERTZ_LOGO} style={s.portadaLogo} />
          </View>
          <View style={s.portadaBody}>
            <Text style={s.portadaEyebrow}>PRESUPUESTO</Text>
            <Text style={s.portadaTitulo}>RENTING{"\n"}A LARGO PLAZO</Text>
            <View style={s.portadaBarra} />
            <Text style={s.portadaRazon}>{empresa.razon}</Text>
            <View style={s.portadaMeta}>
              {cliente ? (
                <View style={{ marginRight: 46 }}>
                  <Text style={s.metaLabel}>PREPARADO PARA</Text>
                  <Text style={s.metaValor}>{cliente}</Text>
                </View>
              ) : null}
              <View>
                <Text style={s.metaLabel}>FECHA</Text>
                <Text style={s.metaValor}>{fecha}</Text>
              </View>
            </View>
          </View>
          <View style={s.portadaPie}>
            <Text style={s.portadaPieTxt}>{empresa.vendedor} · {empresa.email}</Text>
            <Text style={s.portadaPieTxt}>{empresa.telefono} · {empresa.direccion}</Text>
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
        <PaginaVehiculo key={v.id || v.nombre} v={v} empresa={empresa} vigencia={vigencia} conIva={conIva} />
      ))}
    </Document>
  );
}
