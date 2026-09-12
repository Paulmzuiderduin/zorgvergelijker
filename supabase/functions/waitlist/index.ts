import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "nodemailer";
import { createClient } from "supabase";

const SITE_URL = "https://zorgvergelijker.paulzuiderduin.com";
const SENDER_ADDRESS = "zorgvergelijker@paulzuiderduin.com";
const CONSENT_VERSION = "reminder-v1-2026-09-12";
const RESEND_COOLDOWN_MS = 15 * 60 * 1000;
const DAILY_EMAIL_LIMIT = 100;
const ALLOWED_ORIGINS = new Set([
  SITE_URL,
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

type Subscriber = {
  id: string;
  status: "pending" | "confirmed" | "unsubscribed";
  confirmation_sent_at: string | null;
};

function responseHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : SITE_URL,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

function json(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(request),
  });
}

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && ALLOWED_ORIGINS.has(origin);
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isValidEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    auth: { user, pass: password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

function confirmationEmail(confirmUrl: string, unsubscribeUrl: string) {
  return {
    subject: "Bevestig je Zorgvergelijker-herinnering",
    text: `Bevestig je inschrijving via ${confirmUrl}\n\nJe ontvangt één herinnering zodra het tijd is om zorgpolissen te vergelijken. Geen nieuwsbrief. Wil je dit niet? Schrijf je uit via ${unsubscribeUrl}`,
    html: `<!doctype html><html lang="nl"><body style="margin:0;background:#ece9df;color:#202922;font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;padding:32px 20px"><div style="background:#315c4d;color:#fff;padding:28px"><p style="margin:0 0 12px;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Zorgvergelijker</p><h1 style="margin:0;font-size:30px">Bevestig je herinnering</h1></div><div style="background:#fbfaf6;padding:28px;border:1px solid #c9c8bd"><p style="font-size:17px;line-height:1.55">Klik op de knop om je inschrijving te bevestigen. Je ontvangt één e-mail zodra het zinvol is om de nieuwe zorgpolissen te vergelijken.</p><p style="margin:28px 0"><a href="${confirmUrl}" style="display:inline-block;background:#315c4d;color:#fff;padding:14px 20px;text-decoration:none;font-weight:bold">Inschrijving bevestigen</a></p><p style="color:#6d756d;line-height:1.5">Geen nieuwsbrief en geen verzekeringsadvies. Je zorgkosten en polisgegevens blijven lokaal in je browser en worden niet gekoppeld aan dit e-mailadres.</p><p style="margin-top:28px;font-size:13px;color:#6d756d">Niet door jou aangevraagd? Je kunt deze e-mail negeren of <a href="${unsubscribeUrl}" style="color:#315c4d">je direct uitschrijven</a>.</p></div></div></body></html>`,
  };
}

async function validateTurnstile(request: Request, token: unknown) {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) throw new Error("Turnstile is not configured");
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;

  const remoteIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const payload: Record<string, string> = { secret, response: token };
  if (remoteIp) payload.remoteip = remoteIp;

  const verification = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!verification.ok) return false;

  const result = await verification.json() as {
    success?: boolean;
    hostname?: string;
    action?: string;
  };
  return result.success === true &&
    result.hostname === "zorgvergelijker.paulzuiderduin.com" &&
    result.action === "waitlist_signup";
}

async function handleSignup(request: Request, body: Record<string, unknown>) {
  const genericSuccess = { ok: true, message: "Controleer je inbox om je inschrijving te bevestigen." };
  const email = normalizeEmail(body.email);
  const consent = body.consent === true;
  const honeypot = typeof body.website === "string" ? body.website.trim() : "";

  if (honeypot) return json(request, genericSuccess);
  if (!isValidEmail(email) || !consent) {
    return json(request, { error: "Vul een geldig e-mailadres in en geef toestemming." }, 400);
  }
  if (!await validateTurnstile(request, body.turnstileToken)) {
    return json(request, { error: "De beveiligingscontrole is niet gelukt. Probeer het opnieuw." }, 400);
  }

  const supabase = getAdminClient();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await supabase
    .from("waitlist_email_log")
    .select("id", { count: "exact", head: true })
    .gte("sent_at", today.toISOString());
  if (countError) throw countError;
  if ((count || 0) >= DAILY_EMAIL_LIMIT) {
    console.error("Daily waitlist email limit reached");
    return json(request, { error: "Inschrijven lukt tijdelijk niet. Probeer het morgen opnieuw." }, 503);
  }

  const { data: existing, error: selectError } = await supabase
    .from("waitlist_subscribers")
    .select("id,status,confirmation_sent_at")
    .eq("email", email)
    .maybeSingle<Subscriber>();
  if (selectError) throw selectError;
  if (existing?.status === "confirmed") return json(request, genericSuccess);

  const lastSentAt = existing?.confirmation_sent_at
    ? new Date(existing.confirmation_sent_at).getTime()
    : 0;
  if (lastSentAt && Date.now() - lastSentAt < RESEND_COOLDOWN_MS) {
    return json(request, genericSuccess);
  }

  const confirmationToken = createToken();
  const unsubscribeToken = createToken();
  const confirmationHash = await hashToken(confirmationToken);
  const unsubscribeHash = await hashToken(unsubscribeToken);
  const now = new Date().toISOString();
  let subscriberId = existing?.id;

  if (existing) {
    const { error } = await supabase
      .from("waitlist_subscribers")
      .update({
        status: "pending",
        confirmation_token_hash: confirmationHash,
        unsubscribe_token_hash: unsubscribeHash,
        consent_version: CONSENT_VERSION,
        consent_at: now,
        confirmation_sent_at: null,
        confirmed_at: null,
        unsubscribed_at: null,
        updated_at: now,
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("waitlist_subscribers")
      .insert({
        email,
        confirmation_token_hash: confirmationHash,
        unsubscribe_token_hash: unsubscribeHash,
        consent_version: CONSENT_VERSION,
        consent_at: now,
      })
      .select("id")
      .single();

    if (error?.code === "23505") return json(request, genericSuccess);
    if (error) throw error;
    subscriberId = data.id;
  }

  const confirmUrl = `${SITE_URL}/bevestigen.html?token=${encodeURIComponent(confirmationToken)}`;
  const unsubscribeUrl = `${SITE_URL}/uitschrijven.html?token=${encodeURIComponent(unsubscribeToken)}`;
  const message = confirmationEmail(confirmUrl, unsubscribeUrl);
  const transport = getMailTransport();

  try {
    await transport.sendMail({
      from: `Zorgvergelijker <${SENDER_ADDRESS}>`,
      to: email,
      replyTo: SENDER_ADDRESS,
      ...message,
    });
  } finally {
    transport.close();
  }

  const { error: updateError } = await supabase
    .from("waitlist_subscribers")
    .update({ confirmation_sent_at: now, updated_at: now })
    .eq("id", subscriberId);
  if (updateError) throw updateError;

  const { error: logError } = await supabase
    .from("waitlist_email_log")
    .insert({ subscriber_id: subscriberId, kind: "confirmation" });
  if (logError) throw logError;

  return json(request, genericSuccess);
}

async function handleTokenAction(request: Request, action: string, body: Record<string, unknown>) {
  const token = typeof body.token === "string" ? body.token : "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return json(request, { error: "Deze link is ongeldig of verlopen." }, 400);
  }

  const supabase = getAdminClient();
  const tokenHash = await hashToken(token);
  const tokenColumn = action === "confirm" ? "confirmation_token_hash" : "unsubscribe_token_hash";
  const { data: subscriber, error: selectError } = await supabase
    .from("waitlist_subscribers")
    .select("id,status")
    .eq(tokenColumn, tokenHash)
    .maybeSingle();
  if (selectError) throw selectError;
  if (!subscriber) return json(request, { error: "Deze link is ongeldig of verlopen." }, 400);

  const now = new Date().toISOString();
  if (action === "confirm") {
    if (subscriber.status === "unsubscribed") {
      return json(request, { error: "Deze inschrijving is uitgeschreven." }, 400);
    }
    if (subscriber.status !== "confirmed") {
      const { error } = await supabase
        .from("waitlist_subscribers")
        .update({ status: "confirmed", confirmed_at: now, updated_at: now })
        .eq("id", subscriber.id);
      if (error) throw error;
    }
    return json(request, { ok: true, status: "confirmed" });
  }

  if (subscriber.status !== "unsubscribed") {
    const { error } = await supabase
      .from("waitlist_subscribers")
      .update({
        status: "unsubscribed",
        reminder_claimed_at: null,
        unsubscribed_at: now,
        updated_at: now,
      })
      .eq("id", subscriber.id);
    if (error) throw error;
  }
  return json(request, { ok: true, status: "unsubscribed" });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: responseHeaders(request) });
  }
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: "Origin not allowed" }, 403);

  try {
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "signup";
    if (action === "signup") return await handleSignup(request, body);
    if (action === "confirm" || action === "unsubscribe") {
      return await handleTokenAction(request, action, body);
    }
    return json(request, { error: "Unknown action" }, 400);
  } catch (error) {
    console.error("Waitlist request failed", error);
    return json(request, { error: "Er ging iets mis. Probeer het later opnieuw." }, 500);
  }
});
