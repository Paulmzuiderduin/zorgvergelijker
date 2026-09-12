import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "nodemailer";

const SENDER_ADDRESS = "zorgvergelijker@paulzuiderduin.com";
const TEST_RECIPIENT = SENDER_ADDRESS;

function jsonResponse(body: Record<string, unknown>, status: number) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const expectedToken = Deno.env.get("SMTP_TEST_TOKEN");
  const suppliedToken = request.headers.get("x-test-token");

  if (!expectedToken || !suppliedToken || suppliedToken !== expectedToken) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const host = Deno.env.get("SMTP_HOST");
  const user = Deno.env.get("SMTP_USER");
  const password = Deno.env.get("SMTP_PASSWORD");

  if (!host || !user || !password) {
    console.error("One or more SMTP secrets are missing");
    return jsonResponse({ error: "SMTP is not configured" }, 500);
  }

  if (user.toLowerCase() !== SENDER_ADDRESS) {
    console.error("SMTP_USER does not match the allowed test mailbox");
    return jsonResponse({ error: "SMTP test mailbox is invalid" }, 500);
  }

  const transport = nodemailer.createTransport({
    host,
    port: 465,
    secure: true,
    auth: { user, pass: password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  try {
    await transport.sendMail({
      from: `Zorgvergelijker <${SENDER_ADDRESS}>`,
      to: TEST_RECIPIENT,
      subject: "SMTP-test Zorgvergelijker",
      text: "De rechtstreekse SMTP-verbinding tussen Supabase en mijn.host werkt.",
      html: "<p>De rechtstreekse SMTP-verbinding tussen Supabase en mijn.host werkt.</p>",
    });

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    const smtpError = error as Error & {
      code?: string;
      command?: string;
      responseCode?: number;
      syscall?: string;
    };
    const diagnostic = {
      message: smtpError.message || "Unknown SMTP error",
      code: smtpError.code || null,
      command: smtpError.command || null,
      responseCode: smtpError.responseCode || null,
      syscall: smtpError.syscall || null,
    };

    console.error("SMTP test failed", diagnostic);
    return jsonResponse({ error: "SMTP test failed", diagnostic }, 502);
  } finally {
    transport.close();
  }
});
