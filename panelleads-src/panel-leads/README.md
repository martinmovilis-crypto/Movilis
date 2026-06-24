# Panel de Leads

App de carga de leads por vendedor con tablero para el jefe. React + Supabase, lista para publicar en Netlify.

---

## ⚠️ Paso obligatorio en Supabase (una sola vez)

El login es por **usuario** (no por email), así que internamente se usa un email sintético tipo `usuario@panel.local`. Para que el registro funcione sin pedir confirmación por correo:

1. Entrá a tu proyecto en **supabase.com**.
2. **Authentication → Sign In / Providers → Email**.
3. **Desactivá "Confirm email"** (Confirmar email) y guardá.

Sin este paso, los usuarios nuevos no van a poder entrar.

---

## Publicar en Netlify (la forma más simple)

### Opción A — Arrastrar y soltar (sin Git)
1. En esta carpeta corré:
   ```
   npm install
   npm run build
   ```
   Se genera la carpeta `dist/`.
2. Entrá a **app.netlify.com → Add new site → Deploy manually**.
3. Arrastrá la carpeta `dist/` a la zona de drop. Listo, te da una URL pública.

> Nota: con esta opción las variables de entorno ya quedan "horneadas" en el build porque están en el archivo `.env`. Funciona perfecto para testear.

### Opción B — Conectado a GitHub (recomendado para seguir trabajando)
1. Subí esta carpeta a un repo de GitHub.
2. En Netlify: **Add new site → Import from Git** y elegí el repo.
3. Netlify detecta `netlify.toml` (build `npm run build`, publish `dist`).
4. En **Site settings → Environment variables** agregá:
   - `VITE_SUPABASE_URL` = `https://pkykdpnhsrwzibmcsygk.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_YA8_ygJS69mG5MM5I9Z1dw_i3eoBGHY`
5. Deploy.

---

## Probar localmente
```
npm install
npm run dev
```
Abre en `http://localhost:5173`.

---

## Cómo lo usan tus compañeros

- **Cada uno se registra** con Nombre, Apellido, Usuario, Contraseña y Función (Ventas o Jefe).
- **Ventas**: pega su lista de leads (email, teléfono o solo nombre), revisa Nombre/Contacto/Medio y confirma. Carga sus interacciones de CRM a mano. Ve su histórico, sin gráficos.
- **Jefe**: ve el tablero con gráficos, el resumen mensual completo, la lista general de todos los leads y descarga el reporte en PDF.

Los datos quedan guardados en Supabase y cada vendedor solo ve los suyos (lo garantiza la seguridad por filas / RLS).

---

## Notas
- La clave `VITE_SUPABASE_ANON_KEY` es **pública** por diseño: la protección real la hacen las políticas RLS de la base. No expongas nunca la `service_role`.
- La inversión de los meses ya está cargada en la base; el jefe puede actualizarla desde el tablero.
