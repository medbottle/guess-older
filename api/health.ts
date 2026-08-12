import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(
  _req: VercelRequest,
  res: VercelResponse
) {
  res.status(200).json({
    ok: true,
    hasIgdb: Boolean(
      process.env.IGDB_CLIENT_ID && process.env.IGDB_CLIENT_SECRET,
    ),
    hasSupabase: Boolean(
      process.env.SUPABASE_URL &&
        (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY),
    ),
  });
}
