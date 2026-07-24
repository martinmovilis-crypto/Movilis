# Landing LUPO — Guía del proyecto

Landing page de **LUPO Rent a Car** (alquiler de autos en Miami y Orlando).
Este documento explica **qué es cada archivo** y **cómo modificar todo** sin
conocimientos técnicos avanzados.

---

## 1. Qué contiene este proyecto

```
lupo-landing/
├── index.html      ← LA PÁGINA COMPLETA (todo está acá adentro)
├── README.md       ← este documento
└── assets/         ← copias sueltas de las imágenes (por si un diseñador las quiere editar)
    ├── logo-lupo-menta.png    (logo verde menta, se usa en modo noche)
    ├── logo-lupo-oscuro.png   (logo oscuro, se usa en modo día)
    ├── favicon.png            (ícono de la pestaña del navegador)
    ├── hero-miami.jpg         (foto aérea de Miami del encabezado)
    └── auto-nissan-sentra.png (única foto de auto ya cargada)
```

> **Importante:** `index.html` es **autocontenido**. Tiene el HTML, los estilos
> (CSS), la programación (JavaScript) y las imágenes **embebidas** adentro del
> mismo archivo. No necesita instalar nada, ni internet, ni un servidor.
> La carpeta `assets/` es solo una comodidad para el diseñador; la página
> **no** la lee (las imágenes ya están dentro del `index.html`).

---

## 2. Cómo verla / probarla

Hacé **doble clic** en `index.html` y se abre en el navegador. Listo.
Para editar el contenido, abrí `index.html` con cualquier editor de texto
(recomendado: **Visual Studio Code**, gratis).

---

## 3. Funciones que ya tiene la página

- **Formulario de cotización** que arma un mensaje y lo abre en **WhatsApp**.
- **Modo día / noche** (botón sol/luna arriba a la derecha), recuerda la elección.
- **6 idiomas** (Español, Inglés, Portugués, Italiano, Francés, Alemán) con
  selector de bandera + código. Detecta el idioma del navegador del visitante.
- **Flota** filtrable por categoría (Sedán, SUV, Minivan, Convertible…).
- Secciones: Hero, Confianza, Flota, Cómo funciona, Por qué Lupo, Reseñas,
  CTA final y Footer.
- Botón flotante de WhatsApp.
- **PWA-ready / responsive**: se adapta a celular, tablet y escritorio.

---

## 4. Cómo cambiar lo más común

Todo se edita dentro de `index.html`. Usá **Buscar** (Ctrl+F) para encontrar
cada cosa.

### 4.1. Número de WhatsApp  ⭐ (lo primero a cambiar)
Buscá:
```js
const WHATSAPP_PHONE = "5491100000000";
```
Reemplazá por el número real, **formato internacional sin `+` ni espacios**.
Ejemplo EE. UU.: `13055551234` · Ejemplo Argentina: `5491155551234`.

### 4.2. Email de contacto
Buscá `hola@lupo.com` y reemplazá por el correo real (aparece 1 vez).

### 4.3. Textos e idiomas
Todos los textos viven en un **diccionario de traducciones** al final del
archivo, dentro de `var I18N = { ... }`. Cada texto tiene los 6 idiomas:
```js
"nav_fleet": {"es": "Flota", "en": "Fleet", "pt": "Frota", "it": "Flotta", "fr": "Flotte", "de": "Flotte"},
```
Para cambiar una frase, editá el idioma que corresponda. **Mantené las comillas
y las comas** tal cual están.

> Los códigos (`nav_fleet`, `hero_h1`, etc.) también aparecen en el HTML como
> `data-i18n="nav_fleet"`. **No los borres**: son los que conectan el texto
> visible con la traducción.

### 4.4. Agregar / quitar / editar un auto
Buscá `<!-- VEHICLES` para llegar a la sección de la flota. Cada auto es un
bloque `<article class="vcard" ...>`. Copiá uno entero para agregar otro, o
borralo para quitarlo. Dentro de cada auto podés cambiar:
- Categoría (`data-cat="sedan"` y la etiqueta visible).
- Nombre y marca (`<h3>Sentra</h3>` / `<span class="vbrand">Nissan</span>`).
- Capacidad, valijas y transmisión (los `vspec`).

### 4.5. Cambiar las fotos de los autos
Hoy 5 de los 6 autos usan **fotos de referencia por internet** (se ven al
publicar online) y el Sentra tiene una foto propia embebida. Para poner las
fotos reales de la flota, reemplazá el `src="..."` de cada `<img>` dentro de
la tarjeta del auto:
- **Opción A (recomendada):** subí la imagen a la web y pegá su URL en el `src`.
- **Opción B:** convertí la imagen a *base64* (buscá "image to base64 online")
  y pegá el resultado en el `src`, como está hecho con el Sentra.

Ideal: fotos horizontales, fondo transparente o limpio, ~900px de ancho.

### 4.6. Cambiar el logo, el favicon o la foto del hero
Están embebidos como base64. Para cambiarlos, convertí la imagen nueva a
base64 y reemplazá el `src` correspondiente:
- Logo menta (modo noche): busca `class="brand-logo brand-mint"`.
- Logo oscuro (modo día): busca `class="brand-logo brand-dark"`.
- Favicon (pestaña): busca `rel="icon"`.
- Foto del hero: busca `alt="Vista aérea de Miami Beach"`.

En `assets/` tenés las imágenes actuales por si el diseñador quiere partir de ellas.

### 4.7. Colores de la marca
Buscá `:root{` cerca del inicio. Ahí están las variables de color del **modo día**:
```css
--mint:#AEF5D9;      /* verde menta principal */
--mint-deep:#15B98A; /* menta oscuro (hover) */
--ink:#071A1A;       /* verde muy oscuro (fondos oscuros) */
--paper:#F2F7F4;     /* fondo claro de la página */
```
Los colores del **modo noche** están en el bloque `:root[data-theme="dark"]{ ... }`.

---

## 5. Cómo publicar la página (deploy)

La página es un solo archivo, así que se puede publicar en cualquier hosting.
Lo más rápido:

1. Entrá a **[app.netlify.com/drop](https://app.netlify.com/drop)**.
2. Arrastrá el archivo `index.html` (o la carpeta `lupo-landing`).
3. Netlify te da una URL pública al instante. Después se puede conectar un
   dominio propio (ej: `www.lupo.com`).

También sirve cualquier otro hosting (Vercel, Hostinger, cPanel, etc.):
solo hay que subir el `index.html`.

---

## 6. Repositorio (control de versiones)

- **Repo:** `martinmovilis-crypto/movilis`
- **Rama de la landing:** `claude/lupo-landing-page-8k8uwc`
- **Ruta:** `lupo-landing/`

El equipo puede clonar el repo y trabajar sobre esa rama, o simplemente
editar el `index.html` que se les entregó y volver a subirlo.

---

## 7. Checklist antes de salir en vivo

- [ ] Reemplazar el **número de WhatsApp** (sección 4.1).
- [ ] Reemplazar el **email** de contacto.
- [ ] Cargar las **fotos reales** de la flota.
- [ ] Revisar los **textos** en cada idioma que vayan a usar.
- [ ] Poner los links reales de **Instagram / Facebook** (busca `aria-label="Instagram"`).
- [ ] Confirmar direcciones/aeropuertos del formulario (opciones de "Retiro/Devolución").
- [ ] Revisar la **atribución de fotos** en el pie de página si cambian las imágenes.

---

*Página desarrollada como landing autocontenida (HTML + CSS + JS en un solo
archivo, sin dependencias). Cualquier equipo con conocimientos básicos de HTML
puede modificarla.*
