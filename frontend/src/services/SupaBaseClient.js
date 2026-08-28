// ============================================================================
// Jedina instanca Supabase klijenta u aplikaciji - preko nje idu svi upiti na
// bazu, prijava i pristup pohrani datoteka. Adresa i javni ključ dolaze iz
// varijabli okruženja koje Vite ugrađuje u build, pa se okruženje mijenja bez
// diranja koda. Ključ smije biti javan jer pristup podacima ograničavaju
// sigurnosna pravila baze (RLS), a ne tajnost ključa.
// ============================================================================

import { createClient } from '@supabase/supabase-js'
// Zadane vrijednosti produkcijskog projekta. Koriste se samo ako varijable
// okruzenja nisu postavljene (npr. build bez konfigurisanog okruzenja), da
// aplikacija u tom slucaju ne ostane bez klijenta. Kada su varijable
// postavljene - lokalno kroz .env, na Vercelu kroz Environment Variables -
// one imaju prednost. Vrijednosti smiju biti u kodu jer je rijec o javnoj
// adresi i publishable kljucu, koje ionako sadrzi isporuceni build, a pristup
// podacima ogranicavaju sigurnosna pravila baze (RLS).
const ZADANI_URL = 'https://wizqskgwbrreujyqbext.supabase.co'
const ZADANI_KLJUC = 'sb_publishable_hQ7vwqS-Ch-B964qJP3DAQ_a0bU05Da'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ZADANI_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ZADANI_KLJUC
export const supabase = createClient(supabaseUrl, supabaseAnonKey)