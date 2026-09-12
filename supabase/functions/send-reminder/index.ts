import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "nodemailer";
import { createClient } from "supabase";

const SITE_URL = "https://zorgvergelijker.paulzuiderduin.com";
const SENDER_ADDRESS = "zorgvergelijker@paulzuiderduin.com";
const CAMPAIGN = "overstapseizoen-2027";
const SEND_NOT_BEFORE = Date.parse("2026-11-13T09:00:00Z");
const SEND_WINDOW_END = Date.parse("2026-11-16T00:00:00Z");
const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 3;
const CLAIM_TIMEOUT_MS = 30 * 60 * 1000;

type Candidate = {
  id: string;
  email: string;
  reminder_attempt_count: number;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const rawKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!url || !rawKeys) throw new Error("Supabase function environment is incomplete");

  const secretKey = JSON.parse(rawKeys).default;
  if (!secretKey) throw new Error("Default Supabase secret key is unavailable");

  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getMailTransport() {
  const host = Deno.env.get("SMTP_HOST");
  const user = Deno.env.get("SMTP_USER");
  const password = Deno.env.get("SMTP_PASSWORD");
  if (!host || !user || !password) throw new Error("SMTP is not configured");
  if (user.toLowerCase() !== SENDER_ADDRESS) throw new Error("Unexpected SMTP sender");

  return nodemailer.createTransport({
    host,
    port: 465,
    secure: true,
    pool: true,
    maxConnections: 2,
    maxMessages: BATCH_SIZE,
    auth: { user, pass: password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

function createToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function reminderEmail(unsubscribeUrl: string) {
  const calculatorUrl = `${SITE_URL}/vergelijker.html?utm_source=zorgvergelijker&utm_medium=email&utm_campaign=${CAMPAIGN}&utm_content=hoofdknop`;
  return {
    subject: "De zorgpremies voor 2027 zijn bekend",
    text: `Tijd om je zorgpolis te vergelijken\n\nJe vroeg ons om een seintje zodra het nieuwe overstapseizoen begint. De nieuwe premies en polisvoorwaarden zijn bekend, dus dit is een goed moment om je verwachte jaarlasten te vergelijken.\n\nNeem je huidige polis en mogelijke alternatieven erbij. Zorgvergelijker helpt je premie, eigen risico en verwachte eigen kosten naast elkaar te zetten.\n\nVergelijk mijn jaarlasten: ${calculatorUrl}\n\nZorgvergelijker is een persoonlijke rekenhulp en geen verzekeringsadvies. Controleer voorwaarden en gecontracteerde zorgverleners altijd bij de verzekeraar.\n\nJe ontvangt geen verdere e-mails. Uitschrijven: ${unsubscribeUrl}`,
    html: `<!doctype html><html lang="nl"><body style="margin:0;background:#ece9df;color:#202922;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">De nieuwe zorgpremies zijn bekend. Vergelijk nu je verwachte jaarlasten.</div><div style="max-width:600px;margin:0 auto;padding:32px 20px"><div style="background:#315c4d;color:#fff;padding:28px"><p style="margin:0 0 12px;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Zorgvergelijker</p><h1 style="margin:0;font-size:30px;line-height:1.15">Tijd om je zorgpolis te vergelijken</h1></div><div style="background:#fbfaf6;padding:28px;border:1px solid #c9c8bd"><p style="font-size:17px;line-height:1.55">Je vroeg ons om een seintje zodra het nieuwe overstapseizoen begint. De nieuwe premies en polisvoorwaarden zijn bekend, dus dit is een goed moment om je verwachte jaarlasten te vergelijken.</p><p style="font-size:16px;line-height:1.55">Neem je huidige polis en mogelijke alternatieven erbij. Zorgvergelijker helpt je premie, eigen risico en verwachte eigen kosten naast elkaar te zetten.</p><p style="margin:30px 0"><a href="${calculatorUrl}" style="display:inline-block;background:#315c4d;color:#fff;padding:15px 22px;text-decoration:none;font-weight:bold;border-radius:2px">Vergelijk mijn jaarlasten</a></p><p style="color:#6d756d;line-height:1.5">Zorgvergelijker is een persoonlijke rekenhulp en geen verzekeringsadvies. Controleer voorwaarden en gecontracteerde zorgverleners altijd bij de verzekeraar.</p><p style="margin-top:28px;font-size:13px;color:#6d756d">Je ontvangt geen verdere e-mails. <a href="${unsubscribeUrl}" style="color:#315c4d">Schrijf je uit</a>.</p></div></div></body></html>`,
  };
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown delivery error";
  return message.replaceAll(/[^\x20-\x7E]/g, " ").slice(0, 500);
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.campaign !== CAMPAIGN) return json({ error: "Unknown campaign" }, 400);

    const nowMs = Date.now();
    if (nowMs < SEND_NOT_BEFORE) return json({ ok: true, status: "not_due", sent: 0 });
    if (nowMs >= SEND_WINDOW_END) return json({ ok: true, status: "closed", sent: 0 });

    const supabase = getAdminClient();
    const now = new Date(nowMs).toISOString();
    const staleClaim = new Date(nowMs - CLAIM_TIMEOUT_MS).toISOString();

    const { error: recoveryError } = await supabase
      .from("waitlist_subscribers")
      .update({ reminder_claimed_at: null })
      .is("reminder_sent_at", null)
      .lt("reminder_claimed_at", staleClaim);
    if (recoveryError) throw recoveryError;

    const { data: candidates, error: candidateError } = await supabase
      .from("waitlist_subscribers")
      .select("id,email,reminder_attempt_count")
      .eq("status", "confirmed")
      .lte("confirmed_at", new Date(SEND_NOT_BEFORE).toISOString())
      .is("reminder_sent_at", null)
      .is("reminder_claimed_at", null)
      .lt("reminder_attempt_count", MAX_ATTEMPTS)
      .order("confirmed_at", { ascending: true })
      .limit(BATCH_SIZE)
      .returns<Candidate[]>();
    if (candidateError) throw candidateError;
    if (!candidates?.length) return json({ ok: true, status: "idle", sent: 0 });

    const transport = getMailTransport();
    let sent = 0;
    let failed = 0;

    try {
      for (const candidate of candidates) {
        const { data: claimed, error: claimError } = await supabase
          .from("waitlist_subscribers")
          .update({
            reminder_claimed_at: now,
            reminder_attempt_count: candidate.reminder_attempt_count + 1,
            reminder_last_error: null,
          })
          .eq("id", candidate.id)
          .eq("status", "confirmed")
          .is("reminder_sent_at", null)
          .is("reminder_claimed_at", null)
          .select("id")
          .maybeSingle();
        if (claimError) throw claimError;
        if (!claimed) continue;

        try {
          const unsubscribeToken = createToken();
          const unsubscribeHash = await hashToken(unsubscribeToken);
          const { data: stillConfirmed, error: tokenError } = await supabase
            .from("waitlist_subscribers")
            .update({ unsubscribe_token_hash: unsubscribeHash, updated_at: now })
            .eq("id", candidate.id)
            .eq("status", "confirmed")
            .eq("reminder_claimed_at", now)
            .select("id")
            .maybeSingle();
          if (tokenError) throw tokenError;
          if (!stillConfirmed) continue;

          const unsubscribeUrl = `${SITE_URL}/uitschrijven.html?token=${encodeURIComponent(unsubscribeToken)}`;
          await transport.sendMail({
            from: `Zorgvergelijker <${SENDER_ADDRESS}>`,
            to: candidate.email,
            replyTo: SENDER_ADDRESS,
            ...reminderEmail(unsubscribeUrl),
          });

          const { error: sentError } = await supabase
            .from("waitlist_subscribers")
            .update({
              reminder_sent_at: new Date().toISOString(),
              reminder_claimed_at: null,
              reminder_last_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", candidate.id);
          if (sentError) throw sentError;

          const { error: logError } = await supabase
            .from("waitlist_email_log")
            .insert({ subscriber_id: candidate.id, kind: "launch_reminder" });
          if (logError) console.error("Reminder sent but delivery log failed", logError);
          sent += 1;
        } catch (error) {
          failed += 1;
          console.error("Reminder delivery failed", { subscriberId: candidate.id, error });
          await supabase
            .from("waitlist_subscribers")
            .update({
              reminder_claimed_at: null,
              reminder_last_error: safeError(error),
              updated_at: new Date().toISOString(),
            })
            .eq("id", candidate.id)
            .is("reminder_sent_at", null);
        }
      }
    } finally {
      transport.close();
    }

    return json({ ok: true, status: "processed", sent, failed });
  } catch (error) {
    console.error("Scheduled reminder failed", error);
    return json({ error: "Reminder processing failed" }, 500);
  }
});
