import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type DbGame = {
  id: number;
  name: string;
  released: string;
  background_image: string;
  developers: string;
  added: number;
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) {
    return client;
  }

  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  client = createClient(url, key);
  return client;
}
