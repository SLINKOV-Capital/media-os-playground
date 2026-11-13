import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { ISSUER, isE2eOAuthClient, OAUTH_CONSENT_CSP, RESOURCE, sealToken, validateChatGptClient } from "@/lib/mcpOAuth";

export const dynamic = "force-dynamic";

async function getAuthorizeSession(request: NextRequest) {
  if (process.env.NODE_ENV !== "production" && process.env.OAUTH_E2E === "1" && request.cookies.get("oauth-e2e-session")?.value === "authorized") {
    return {
      user: { id: "00000000-0000-4000-8000-000000000001", email: "oauth-e2e@example.invalid" },
      session: { access_token: "oauth-e2e-access", refresh_token: "oauth-e2e-refresh", expires_at: Math.floor(Date.now() / 1000) + 3600 },
    };
  }
  const supabase = await createClient();
  const [{ data: { user } }, { data: { session } }] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);
  return { user, session };
}

async function validOAuthClient(clientId: string, redirectUri: string) {
  if (isE2eOAuthClient(clientId, redirectUri)) return true;
  return validateChatGptClient(clientId, redirectUri);
}

function consentOrigin(request: NextRequest) {
  if (process.env.NODE_ENV !== "production" && process.env.OAUTH_E2E === "1") return "http://127.0.0.1:3017";
  return ISSUER;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function paramsFrom(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  return {
    responseType: p.get("response_type") ?? "",
    clientId: p.get("client_id") ?? "",
    redirectUri: p.get("redirect_uri") ?? "",
    challenge: p.get("code_challenge") ?? "",
    challengeMethod: p.get("code_challenge_method") ?? "",
    state: p.get("state") ?? "",
    resource: p.get("resource") ?? "",
    scope: p.get("scope") ?? "mediaos:read mediaos:write",
  };
}

export async function GET(request: NextRequest) {
  const params = paramsFrom(request);
  if (params.responseType !== "code" || params.challengeMethod !== "S256" || !params.challenge || !params.state || params.resource !== RESOURCE || !["mediaos:read", "mediaos:read mediaos:write"].includes(params.scope)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!(await validOAuthClient(params.clientId, params.redirectUri))) return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  const { user } = await getAuthorizeSession(request);
  if (!user) {
    const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    return NextResponse.redirect(new URL(`/slinkov-cockpit-login?next=${encodeURIComponent(next)}`, request.url));
  }
  const fields = Object.entries(params).map(([name, value]) => `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`).join("");
  const csrfOrigin = consentOrigin(request);
  const html = `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Подключение MediaOS</title><body style="font:16px system-ui;max-width:560px;margin:12vh auto;padding:24px;color:#171717"><h1>Подключить MediaOS к ChatGPT?</h1><p>ChatGPT получит доступ к вашим проектам, задачам, действиям, связанным документам и материалам в MediaOS.</p><p>Чтение и изменения выполняются от имени <strong>${escapeHtml(user.email ?? "вашей учётной записи")}</strong>. Подтверждение операций также может запрашиваться самим ChatGPT.</p><form method="post" action="/oauth/authorize"><input type="hidden" name="csrf_origin" value="${escapeHtml(csrfOrigin)}">${fields}<button name="consent" value="yes" style="padding:12px 18px">Разрешить подключение</button></form><p><a href="${escapeHtml(params.redirectUri)}?error=access_denied&state=${encodeURIComponent(params.state)}&iss=${encodeURIComponent(ISSUER)}">Отмена</a></p></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": OAUTH_CONSENT_CSP } });
}

export async function POST(request: NextRequest) {
  const expectedOrigin = consentOrigin(request);
  if (request.headers.get("origin") !== expectedOrigin) return new NextResponse("Forbidden", { status: 403, headers: process.env.NODE_ENV !== "production" && process.env.OAUTH_E2E === "1" ? { "X-OAuth-E2E-Failure": "origin-check" } : undefined });
  const form = await request.formData();
  if (form.get("csrf_origin") !== expectedOrigin || form.get("consent") !== "yes") return new NextResponse("Forbidden", { status: 403, headers: process.env.NODE_ENV !== "production" && process.env.OAUTH_E2E === "1" ? { "X-OAuth-E2E-Failure": "csrf-check" } : undefined });
  const params = Object.fromEntries(["responseType", "clientId", "redirectUri", "challenge", "challengeMethod", "state", "resource", "scope"].map((key) => [key, String(form.get(key) ?? "")])) as ReturnType<typeof paramsFrom>;
  if (params.responseType !== "code" || params.challengeMethod !== "S256" || !params.challenge || !params.state || params.resource !== RESOURCE || !(await validOAuthClient(params.clientId, params.redirectUri))) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { user, session } = await getAuthorizeSession(request);
  if (!user || !session?.access_token || !session.refresh_token) return NextResponse.redirect(new URL("/slinkov-cockpit-login", request.url));
  const now = Math.floor(Date.now() / 1000);
  const code = await sealToken({ typ: "code", iat: now, exp: now + 90, aud: RESOURCE, user_id: user.id, supabase_access_token: session.access_token, supabase_refresh_token: session.refresh_token, supabase_expires_at: session.expires_at, client_id: params.clientId, redirect_uri: params.redirectUri, challenge: params.challenge, state: params.state, scope: params.scope });
  const callback = new URL(params.redirectUri);
  callback.searchParams.set("code", code);
  callback.searchParams.set("state", params.state);
  callback.searchParams.set("iss", ISSUER);
  return NextResponse.redirect(callback, 302);
}
