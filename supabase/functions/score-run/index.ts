// Edge function `score-run` — worker de scoring asynchrone (ADR-002 §4).
// Appelée à la fin d'un run : valide (anti-triche v1) puis agrège la trace
// en cellules H3 via la fonction SQL `score_run`. L'UX ne dépend jamais
// de cette étape : la trace est déjà peinte côté client.

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const { run_id } = await req.json();
  if (!run_id) {
    return new Response(JSON.stringify({ error: "run_id requis" }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: valid, error: vErr } = await supabase.rpc("validate_run", { p_run_id: run_id });
  if (vErr) return new Response(JSON.stringify({ error: vErr.message }), { status: 500 });
  if (!valid) return new Response(JSON.stringify({ scored: false, reason: "invalidated" }));

  const { error } = await supabase.rpc("score_run", { p_run_id: run_id });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ scored: true }));
});
