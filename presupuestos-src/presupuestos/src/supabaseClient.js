import { createClient } from "@supabase/supabase-js";

// Proyecto Supabase de la herramienta de presupuestos.
// La clave publishable es pública por diseño (RLS controla el acceso).
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://yxfjsnkvezavprpmlvkg.supabase.co";
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_AFjgzTHguy0Mukwiqh4WnQ_sBzKm3zG";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

export const BUCKET_FOTOS = "renting-fotos";

// "Espacio" de datos: aísla catálogo e historial entre instancias.
// El build normal usa "general" (el del equipo). Una versión independiente se
// compila con VITE_ESPACIO=<otro> y no comparte datos con el resto.
export const ESPACIO = import.meta.env.VITE_ESPACIO || "general";
