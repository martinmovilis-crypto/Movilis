import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import {
  HERTZ_LOGO,
  SERVICIOS_INCLUIDOS,
  INSTITUCIONAL,
  SERVICIOS,
  fotoDe,
  pesos,
  numero,
  IVA,
} from "./data.js";

const AMARILLO = "#FFD100";
const NEGRO = "#1a1a1a";
const GRIS = "#666666";
const BORDE = "#e4e4e4";
const CLARO = "#f6f6f6";

const s = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 54,
    paddingHorizontal: 40,
    fontSize: 10,
    color: NEGRO,
    fontFamily: "Helvetica",
  },
  // Encabezado
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  logo: { width: 96, height: 34, objectFit: "contain" },
  headerTag: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: NEGRO,
    letterSpacing: 1,
  },
  barra: { height: 4, backgroundColor: AMARILLO, marginBottom: 16, borderRadius: 2 },
  // Portada
  portadaWrap: { flexGrow: 1, justifyContent: "center" },
  portadaLogo: { width: 190, height: 66, objectFit: "contain", marginBottom: 26 },
  portadaTitulo: { fontFamily: "Helvetica-Bold", fontSize: 30, lineHeight: 1.15 },
  portadaSub: { fontSize: 14, color: GRIS, marginTop: 6 },
  portadaAmarillo: { width: 90, height: 6, backgroundColor: AMARILLO, marginVertical: 20 },
  portadaCliente: { fontSize: 12, marginTop: 4 },
  portadaClienteLabel: { color: GRIS, fontSize: 9, textTransform: "uppercase", letterSpacing: 1 },
  // Bloques de texto
  h2: { fontFamily: "Helvetica-Bold", fontSize: 16, marginBottom: 10 },
  parrafo: { fontSize: 11, lineHeight: 1.6, color: "#333", marginBottom: 12 },
  servicio: { flexDirection: "row", marginBottom: 12 },
  servicioBullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: AMARILLO, marginTop: 3, marginRight: 10 },
  servicioTitulo: { fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 2 },
  servicioDesc: { fontSize: 10, color: GRIS, lineHeight: 1.5 },
  // Cotización de vehículo
  vehTitulo: { fontFamily: "Helvetica-Bold", fontSize: 22, marginBottom: 2 },
  vehSub: { fontSize: 10, color: GRIS, letterSpacing: 1, marginBottom: 10 },
  fotoWrap: {
    backgroundColor: CLARO,
    borderRadius: 8,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    padding: 8,
  },
  foto: { maxWidth: "100%", maxHeight: 184, objectFit: "contain" },
  fotoPlaceholder: { color: "#bbb", fontSize: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", marginBottom: 14 },
  chip: {
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 9,
    marginRight: 6,
    marginBottom: 6,
    fontSize: 9,
    color: "#333",
  },
  incluye: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16 },
  incluyeItem: { flexDirection: "row", width: "50%", marginBottom: 5, paddingRight: 8 },
  incluyeCheck: { color: "#0a8f3c", fontFamily: "Helvetica-Bold", marginRight: 5, fontSize: 10 },
  incluyeText: { fontSize: 9.5, color: "#333", flex: 1 },
  // Tabla de precios
  tabla: { borderWidth: 1, borderColor: BORDE, borderRadius: 6, overflow: "hidden" },
  tablaHead: { flexDirection: "row", backgroundColor: NEGRO },
  tablaHeadCell: {
    flex: 1,
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    padding: 8,
    textAlign: "center",
  },
  tablaRow: { flexDirection: "row" },
  tablaCell: { flex: 1, padding: 10, textAlign: "center", borderRightWidth: 1, borderRightColor: BORDE },
  tablaCellLast: { borderRightWidth: 0 },
  tablaValor: { fontFamily: "Helvetica-Bold", fontSize: 13 },
  tablaTarifa: { fontFamily: "Helvetica-Bold", fontSize: 15, color: NEGRO },
  notas: { marginTop: 16 },
  precioTag: {
    alignSelf: "flex-start",
    backgroundColor: AMARILLO,
    color: NEGRO,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 8,
  },
  nota: { fontSize: 8.5, color: GRIS, marginBottom: 2 },
  // Pie
  footer: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: BORDE,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7.5, color: "#999" },
});

function Encabezado({ empresa }) {
  return (
    <>
      <View style={s.header} fixed>
        <Image src={HERTZ_LOGO} style={s.logo} />
        <Text style={s.headerTag}>COTIZACIÓN · {(empresa.sucursal || "La Plata").toUpperCase()}</Text>
      </View>
      <View style={s.barra} fixed />
    </>
  );
}

function Pie({ empresa }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{empresa.razon}</Text>
      <Text style={s.footerText}>
        {empresa.email} · {empresa.telefono} · {empresa.direccion}
      </Text>
    </View>
  );
}

function specChips(v) {
  const chips = [`${v.personas} personas`, v.transmision];
  if (v.traccion) chips.push(v.traccion);
  if (v.aire_acondicionado) chips.push("Aire acondicionado");
  if (v.direccion_asistida) chips.push("Dirección asistida");
  if (v.cierre_centralizado) chips.push("Cierre centralizado");
  if (v.airbag) chips.push("Airbag");
  return chips;
}

function PaginaVehiculo({ v, empresa, vigencia, conIva }) {
  const foto = fotoDe(v);
  const factor = conIva ? 1 + IVA : 1;
  return (
    <Page size="A4" style={s.page} wrap={false}>
      <Encabezado empresa={empresa} />
      <Text style={s.vehTitulo}>{v.nombre}</Text>
      <Text style={s.vehSub}>RENTING A LARGO PLAZO</Text>

      <View style={s.fotoWrap}>
        {foto ? (
          <Image src={foto} style={s.foto} />
        ) : (
          <Text style={s.fotoPlaceholder}>Sin foto cargada</Text>
        )}
      </View>

      <View style={s.chips}>
        {specChips(v).map((c, i) => (
          <Text key={i} style={s.chip}>
            {c}
          </Text>
        ))}
      </View>

      <View style={s.incluye}>
        {SERVICIOS_INCLUIDOS.map((it, i) => (
          <View key={i} style={s.incluyeItem}>
            <Text style={s.incluyeCheck}>✓</Text>
            <Text style={s.incluyeText}>{it}</Text>
          </View>
        ))}
      </View>

      <View style={s.tabla}>
        <View style={s.tablaHead}>
          <Text style={s.tablaHeadCell}>Km mensuales</Text>
          <Text style={s.tablaHeadCell}>Tarifa mensual</Text>
          <Text style={s.tablaHeadCell}>Franquicia Daño</Text>
          <Text style={s.tablaHeadCell}>Franquicia vuelco</Text>
        </View>
        <View style={s.tablaRow}>
          <Text style={[s.tablaCell, s.tablaValor]}>{numero(v.km_mensuales)} KM</Text>
          <Text style={[s.tablaCell, s.tablaTarifa]}>{pesos(v.tarifa_mensual * factor)}</Text>
          <Text style={[s.tablaCell, s.tablaValor]}>{pesos(v.franquicia_dano * factor)}</Text>
          <Text style={[s.tablaCell, s.tablaCellLast, s.tablaValor]}>{pesos(v.franquicia_vuelco * factor)}</Text>
        </View>
      </View>

      <View style={s.notas}>
        <Text style={s.precioTag}>{conIva ? "PRECIOS CON IVA (21%)" : "PRECIOS SIN IVA"}</Text>
        <Text style={s.nota}>· Cobertura contra todo riesgo con franquicia. Asistencia en viaje las 24 horas.</Text>
        <Text style={s.nota}>· Una vez iniciado el contrato, las tarifas tienen un reajuste trimestral.</Text>
        <Text style={s.nota}>· La presente cotización tiene una vigencia de {vigencia} días.</Text>
      </View>

      <Pie empresa={empresa} />
    </Page>
  );
}

export default function PresupuestoPDF({ empresa, cliente, vehiculos, vigencia, conIva, fecha }) {
  return (
    <Document title={`Presupuesto ${cliente || ""}`.trim()} author={empresa.razon}>
      {/* Portada */}
      <Page size="A4" style={s.page}>
        <View style={s.portadaWrap}>
          <Image src={HERTZ_LOGO} style={s.portadaLogo} />
          <Text style={s.portadaTitulo}>Presupuesto{"\n"}Renting a largo plazo</Text>
          <Text style={s.portadaSub}>{empresa.razon}</Text>
          <View style={s.portadaAmarillo} />
          {cliente ? (
            <View style={{ marginBottom: 10 }}>
              <Text style={s.portadaClienteLabel}>Preparado para</Text>
              <Text style={s.portadaCliente}>{cliente}</Text>
            </View>
          ) : null}
          <Text style={s.portadaClienteLabel}>Fecha</Text>
          <Text style={s.portadaCliente}>{fecha}</Text>
          <View style={{ marginTop: 24 }}>
            <Text style={s.footerText}>
              {empresa.vendedor} · {empresa.email}
            </Text>
            <Text style={s.footerText}>
              {empresa.telefono} · {empresa.direccion}
            </Text>
          </View>
        </View>
      </Page>

      {/* Institucional + servicios */}
      <Page size="A4" style={s.page}>
        <Encabezado empresa={empresa} />
        <Text style={s.h2}>Sobre nosotros</Text>
        <Text style={s.parrafo}>{INSTITUCIONAL}</Text>
        <Text style={s.h2}>Servicios incluidos</Text>
        {SERVICIOS.map((sv, i) => (
          <View key={i} style={s.servicio}>
            <View style={s.servicioBullet} />
            <View style={{ flex: 1 }}>
              <Text style={s.servicioTitulo}>{sv.titulo}</Text>
              <Text style={s.servicioDesc}>{sv.desc}</Text>
            </View>
          </View>
        ))}
        <Pie empresa={empresa} />
      </Page>

      {/* Una página por vehículo */}
      {vehiculos.map((v) => (
        <PaginaVehiculo
          key={v.id || v.nombre}
          v={v}
          empresa={empresa}
          vigencia={vigencia}
          conIva={conIva}
        />
      ))}
    </Document>
  );
}
