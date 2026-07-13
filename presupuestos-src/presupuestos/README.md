# Presupuestos Renting · Hertz La Plata

Herramienta para armar presupuestos de alquiler de vehículos a largo plazo y
descargarlos en PDF con la plantilla de la empresa (formato del PowerPoint).

## Qué hace

- **Nuevo presupuesto**: elegís los vehículos desde una galería de fotos, las
  tarifas y los seguros vienen precargados y los podés cambiar para cada
  presupuesto. Genera y descarga el PDF (portada + página institucional +
  una página por vehículo con foto, características y tabla de tarifas).
- **Catálogo y fotos**: base compartida de vehículos. Editás las tarifas base,
  las características y **subís la foto de cada vehículo** para ir armando la
  base entre todo el equipo.
- **Configuración**: datos de la empresa que salen en la portada y el pie del PDF.

## Stack

- React + Vite
- [`@react-pdf/renderer`](https://react-pdf.org) para generar el PDF en el navegador
- Supabase (tabla `renting_vehiculos` para el catálogo, `renting_presupuestos`
  para el historial, y el bucket `renting-fotos` para las imágenes)

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
```

## Configuración de Supabase

Las credenciales están en `src/supabaseClient.js` con respaldo incrustado
(la clave *publishable* es pública por diseño). Para sobreescribirlas, creá un
`.env`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Tablas / storage esperados

- `public.renting_vehiculos` — catálogo de vehículos (precargado con las 6
  unidades del presupuesto original).
- `public.renting_presupuestos` — historial de presupuestos guardados.
- Bucket público `renting-fotos` — fotos subidas desde la app.

## Fotos por defecto

Las fotos de las 6 unidades originales vienen incrustadas en `src/fotos.js`
(optimizadas). Si un vehículo tiene `foto_url` cargada en el catálogo, esa
tiene prioridad; si no, se usa la foto por defecto que coincida con el nombre.

## Deploy

Preparado para Netlify (`netlify.toml`): `base = presupuestos-src/presupuestos`,
build `npm run build`, publish `dist`.
