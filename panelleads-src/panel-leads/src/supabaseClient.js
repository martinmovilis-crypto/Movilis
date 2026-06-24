import { createClient } from "@supabase/supabase-js";

// Respaldo incrustado (la clave publishable es pública por diseño). Si hay .env, manda el .env.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://pkykdpnhsrwzibmcsygk.supabase.co";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_YA8_ygJS69mG5MM5I9Z1dw_i3eoBGHY";
const url = SUPABASE_URL;
const key = SUPABASE_ANON_KEY;

// El login es por usuario, pero Supabase Auth usa email: armamos un email sintético.
export const DOMINIO = "panel-leads.app";
export const emailDeUsuario = (usuario) => `${usuario.trim().toLowerCase()}@${DOMINIO}`;

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage, storageKey: "leadadmin-auth" },
});
