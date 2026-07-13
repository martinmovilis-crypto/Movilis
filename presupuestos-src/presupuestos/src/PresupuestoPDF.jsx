import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { HERTZ_LOGO, ICONOS } from "./fotos.js";
import { INSTITUCIONAL, SERVICIOS, fotoDe, pesos, numero, IVA } from "./data.js";

// Colores exactos del PowerPoint
const AMARILLO = "#FFCC00";
const NEGRO = "#1a1a1a";
const GRIS = "#5f5f5f";
const GRIS_CLARO = "#8a8a8a";
const BORDE = "#dcdcdc";

// Tamaño de diapositiva 16:9 igual al PPT (10" x 5.625" = 720 x 405 pt)
const SLIDE = [720, 405];

const s = StyleSheet.create({
  page: {
    paddingTop: 16,
    paddingHorizontal: 34,
    paddingBottom: 14,
    fontSize: 9,
    color: NEGRO,
    fontFamily: "Helvetica",
  },
  // ---- Encabezado de página de cotización ----
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cotizTag: {
    backgroundColor: AMARILLO,
    color: NEGRO,
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    letterSpacing: 1,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  headerRight: { alignItems: "flex-end" },
  logo: { width: 92, height: 33, objectFit: "contain" },
  sucursal: { fontSize: 9, color: GRIS, marginTop: 3, letterSpacing: 2 },
  vehTitulo: { fontFamily: "Helvetica-Bold", fontSize: 20, marginTop: 8, marginBottom: 4 },

  // ---- Cuerpo: columnas ----
  cuerpo: { flexDirection: "row", height: 168 },
  colIzq: { width: "37%", paddingRight: 12, justifyContent: "center" },
  colDer: { width: "63%", alignItems: "center", justifyContent: "center" },
  filaSpec: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  icono: { width: 15, height: 15, objectFit: "contain", marginRight: 9 },
  puntoAmarillo: { width: 8, height: 8, borderRadius: 4, backgroundColor: AMARILLO, marginLeft: 4, marginRight: 12 },
  specLabel: { fontSize: 10, color: "#333" },
  foto: { maxWidth: "100%", maxHeight: 165, objectFit: "contain" },
  fotoVacia: { color: "#c2c2c2", fontSize: 11 },

  // ---- Tabla de precios ----
  tabla: { borderWidth: 1, borderColor: AMARILLO, marginTop: 4 },
  tablaHead: { flexDirection: "row", backgroundColor: AMARILLO },
  th: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: NEGRO,
    paddingVertical: 5,
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: "#e6b800",
  },
  thLast: { borderRightWidth: 0 },
  tablaRow: { flexDirection: "row" },
  td: {
    flex: 1,
    paddingVertical: 6,
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: BORDE,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  tdLast: { borderRightWidth: 0 },
  tdTarifa: { fontSize: 13 },

  // ---- Notas al pie ----
  notas: { flexDirection: "row", marginTop: 7 },
  notaCol: { flex: 1, paddingRight: 14 },
  nota: { fontSize: 7, color: GRIS, marginBottom: 2, lineHeight: 1.3 },
  ivaTag: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: NEGRO,
    backgroundColor: AMARILLO,
    alignSelf: "flex-start",
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginBottom: 3,
  },

  // ---- Portada ----
  portada: { flexGrow: 1, paddingHorizontal: 20 },
  portadaTop: { flexGrow: 1, justifyContent: "center" },
  portadaLogo: { width: 210, height: 74, objectFit: "contain", marginBottom: 24 },
  portadaTitulo: { fontFamily: "Helvetica-Bold", fontSize: 34, lineHeight: 1.1 },
  portadaBarra: { width: 96, height: 6, backgroundColor: AMARILLO, marginVertical: 16 },
  portadaRazon: { fontSize: 13, color: GRIS },
  portadaMeta: { flexDirection: "row", marginTop: 16 },
  metaLabel: { fontSize: 8, color: GRIS_CLARO, textTransform: "uppercase", letterSpacing: 1 },
  metaValor: { fontSize: 12, marginTop: 2 },
  contacto: {
    borderTopWidth: 2,
    borderTopColor: AMARILLO,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  contactoTxt: { fontSize: 8.5, color: GRIS },

  // ---- Página institucional ----
  instHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  instLogo: { width: 88, height: 31, objectFit: "contain" },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 15 },
  parrafo: { fontSize: 10, lineHeight: 1.5, color: "#333", marginBottom: 14 },
  servGrid: { flexDirection: "row", flexWrap: "wrap" },
  servItem: { width: "50%", flexDirection: "row", marginBottom: 10, paddingRight: 16 },
  servBullet: { width: 7, height: 7, borderRadius: 4, backgroundColor: AMARILLO, marginTop: 3, marginRight: 8 },
  servTit: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 1 },
  servDesc: { fontSize: 8.5, color: GRIS, lineHeight: 1.4 },
});

function CabeceraCotizacion({ empresa }) {
  return (
    <View style={s.header}>
      <Text style={s.cotizTag}>COTIZACIÓN</Text>
      <View style={s.headerRight}>
        <Image src={HERTZ_LOGO} style={s.logo} />
        <Text style={s.sucursal}>{(empresa.sucursal || "La Plata").toUpperCase()}</Text>
      </View>
    </View>
  );
}

function filasSpec(v) {
  const f = [];
  if (v.aire_acondicionado) f.push([ICONOS.aire, "Aire acondicionado"]);
  if (v.direccion_asistida) f.push([ICONOS.direccion, "Dirección asistida"]);
  if (v.cierre_centralizado) f.push([ICONOS.cierre, "Cierre centralizado"]);
  if (v.airbag) f.push([ICONOS.airbag, "Airbag"]);
  f.push([ICONOS.personas, `${v.personas} personas`]);
  f.push([ICONOS.transmision, v.transmision]);
  if (v.traccion) f.push([null, v.traccion]);
  return f;
}

function PaginaVehiculo({ v, empresa, vigencia, conIva }) {
  const foto = fotoDe(v);
  const factor = conIva ? 1 + IVA : 1;
  return (
    <Page size={SLIDE} style={s.page}>
      <CabeceraCotizacion empresa={empresa} />
      <Text style={s.vehTitulo}>{v.nombre}</Text>

      <View style={s.cuerpo}>
        <View style={s.colIzq}>
          {filasSpec(v).map(([icono, label], i) => (
            <View key={i} style={s.filaSpec}>
              {icono ? <Image src={icono} style={s.icono} /> : <View style={s.puntoAmarillo} />}
              <Text style={s.specLabel}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={s.colDer}>
          {foto ? <Image src={foto} style={s.foto} /> : <Text style={s.fotoVacia}>Sin foto cargada</Text>}
        </View>
      </View>

      <View style={s.tabla}>
        <View style={s.tablaHead}>
          <Text style={s.th}>Km mensuales</Text>
          <Text style={s.th}>Tarifa mensual</Text>
          <Text style={s.th}>Franquicia Daño</Text>
          <Text style={[s.th, s.thLast]}>Franquicia vuelco</Text>
        </View>
        <View style={s.tablaRow}>
          <Text style={s.td}>{numero(v.km_mensuales)} KM</Text>
          <Text style={[s.td, s.tdTarifa]}>{pesos(v.tarifa_mensual * factor)}</Text>
          <Text style={s.td}>{pesos(v.franquicia_dano * factor)}</Text>
          <Text style={[s.td, s.tdLast]}>{pesos(v.franquicia_vuelco * factor)}</Text>
        </View>
      </View>

      <View style={s.notas}>
        <View style={s.notaCol}>
          <Text style={s.ivaTag}>{conIva ? "PRECIOS CON IVA (21%)" : "PRECIOS SIN IVA"}</Text>
          <Text style={s.nota}>· Cobertura contra todo riesgo con franquicia.</Text>
          <Text style={s.nota}>· Desgaste de cubierta por uso (60.000 km).</Text>
          <Text style={s.nota}>· Mantenimiento preventivo cada 10.000 km.</Text>
        </View>
        <View style={s.notaCol}>
          <Text style={s.nota}>· Asistencia en viaje las 24 horas.</Text>
          <Text style={s.nota}>· Una vez iniciado el contrato, las tarifas tienen un reajuste trimestral.</Text>
          <Text style={s.nota}>· La presente cotización tiene una vigencia de {vigencia} días.</Text>
          <Text style={[s.nota, { marginTop: 3, color: GRIS_CLARO }]}>
            {empresa.email} · {empresa.telefono}
          </Text>
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
          <View style={s.portadaTop}>
            <Image src={HERTZ_LOGO} style={s.portadaLogo} />
            <Text style={s.portadaTitulo}>PRESUPUESTO{"\n"}RENTING A LARGO PLAZO</Text>
            <View style={s.portadaBarra} />
            <Text style={s.portadaRazon}>{empresa.razon}</Text>
            <View style={s.portadaMeta}>
              {cliente ? (
                <View style={{ marginRight: 40 }}>
                  <Text style={s.metaLabel}>Preparado para</Text>
                  <Text style={s.metaValor}>{cliente}</Text>
                </View>
              ) : null}
              <View>
                <Text style={s.metaLabel}>Fecha</Text>
                <Text style={s.metaValor}>{fecha}</Text>
              </View>
            </View>
          </View>
          <View style={s.contacto}>
            <Text style={s.contactoTxt}>
              {empresa.vendedor} · {empresa.email}
            </Text>
            <Text style={s.contactoTxt}>
              {empresa.telefono} · {empresa.direccion}
            </Text>
          </View>
        </View>
      </Page>

      {/* Institucional + servicios */}
      <Page size={SLIDE} style={s.page}>
        <View style={s.instHead}>
          <Text style={s.h2}>Sobre nosotros</Text>
          <Image src={HERTZ_LOGO} style={s.instLogo} />
        </View>
        <Text style={s.parrafo}>{INSTITUCIONAL}</Text>
        <Text style={[s.h2, { marginBottom: 12 }]}>Servicios incluidos</Text>
        <View style={s.servGrid}>
          {SERVICIOS.map((sv, i) => (
            <View key={i} style={s.servItem}>
              <View style={s.servBullet} />
              <View style={{ flex: 1 }}>
                <Text style={s.servTit}>{sv.titulo}</Text>
                <Text style={s.servDesc}>{sv.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </Page>

      {/* Una página por vehículo */}
      {vehiculos.map((v) => (
        <PaginaVehiculo key={v.id || v.nombre} v={v} empresa={empresa} vigencia={vigencia} conIva={conIva} />
      ))}
    </Document>
  );
}
