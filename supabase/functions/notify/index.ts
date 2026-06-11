// Edge function `notify` — envoie des push Expo (iOS via APNs, Android via FCM,
// routés par le service Expo Push). Appelée par la base (send_push → pg_net) sur
// les événements de jeu. Résout les tokens des destinataires puis POST par lots
// vers l'API Expo Push.
//
// Auth : pas de JWT (verify_jwt=false) ; on valide un secret partagé
// `x-notify-secret` (défini côté DB dans app_config et côté fonction via la
// variable d'env NOTIFY_SECRET). Si NOTIFY_SECRET n'est pas défini, la
// vérification est ignorée (à configurer avant la prod).

import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = Deno.env.get("NOTIFY_SECRET");

type Body = { user_ids?: string[]; title?: string; body?: string; data?: Record<string, unknown> };

Deno.serve(async (req) => {
  if (SECRET && req.headers.get("x-notify-secret") !== SECRET) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  let payload: Body;
  try { payload = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "bad json" }), { status: 400 }); }

  const { user_ids, title, body, data } = payload;
  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }));
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: rows, error } = await supabase
    .from("device_tokens").select("token").in("user_id", user_ids);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const messages = (rows ?? [])
    .map((r) => r.token as string)
    .filter((to) => typeof to === "string" && to.startsWith("ExponentPushToken"))
    .map((to) => ({ to, sound: "default", title, body, data: data ?? {} }));

  if (messages.length === 0) return new Response(JSON.stringify({ sent: 0 }));

  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(batch),
    });
    if (res.ok) sent += batch.length;
  }

  return new Response(JSON.stringify({ sent }));
});
