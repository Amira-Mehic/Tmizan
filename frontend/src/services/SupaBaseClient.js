// ============================================================================
// Jedina instanca Supabase klijenta u aplikaciji - preko nje idu svi upiti na
// bazu, prijava i pristup pohrani datoteka. Adresa i javni ključ dolaze iz
// varijabli okruženja koje Vite ugrađuje u build, pa se okruženje mijenja bez
// diranja koda. Ključ smije biti javan jer pristup podacima ograničavaju
// sigurnosna pravila baze (RLS), a ne tajnost ključa.
// ============================================================================

import { createClient } from '@supabase/supabase-js'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseAnonKey)