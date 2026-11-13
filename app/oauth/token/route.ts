import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { ISSUER, isE2eOAuthClient, RESOURCE, openToken, refreshSupabaseSession, sealToken, validateChatGptClient } from "@/lib/mcpOAuth";
import { jwtVerify, createRemoteJWKSet } from "jose";

export const dynamic = "force-dynamic";

async function validOAuthClient(clientId: string, redirectUri: string) {
  if (isE2eOAuthClient(clientId, redirectUri)) return true;
  return validateChatGptClient(clientId, redirectUri);
}

async function validateSupabaseUser(accessToken: string, expectedUserId: string) {
  if (process.env.NODE_ENV !== "production" && process.env.OAUTH_E2E === "1" && accessToken === "oauth-e2e-access" && expectedUserId === "00000000-0000-4000-8000-000000000001") {
    return true;
  }
  const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  return !error && user?.id === expectedUserId;
}

async function clientAssertionValid(form: URLSearchParams, clientId: string) {
  const assertion = form.get("client_assertion");
  if (!assertion) return !form.has("client_assertion_type");
  if (form.get("client_assertion_type") !== "urn:ietf:params:oauth:client-assertion-type:jwt-bearer") return false;
  try {
    const jwks = createRemoteJWKSet(new URL("https://chatgpt.com/oauth/jwks.json"));
    const { payload, protectedHeader } = await jwtVerify(assertion, jwks, { algorithms: ["RS256"], audience: `${ISSUER}/oauth/token` });
    return protectedHeader.alg === "RS256" && payload.iss === clientId && payload.sub === clientId;
  } catch { return false; }
}

async function tokenResponse(userId: string, accessToken: string, refreshToken: string, scope: string, accessExpiresAt?: number) {
  const now = Math.floor(Date.now() / 1000);
  const accessExp = Math.min(accessExpiresAt ?? now + 900, now + 900);
  const access_token = await sealToken({ typ: "access", iat: now, exp: accessExp, aud: RESOURCE, user_id: userId, supabase_access_token: accessToken, scope });
  const refresh_token = await sealToken({ typ: "refresh", iat: now, exp: now + 60 * 60 * 24 * 30, aud: RESOURCE, user_id: userId, supabase_refresh_token: refreshToken, scope });
  return NextResponse.json({ access_token, token_type: "Bearer", expires_in: Math.max(1, accessExp - now), refresh_token, scope }, { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
}

export async function POST(request: NextRequest) {
  const form = new URLSearchParams(await request.text());
  const grantType = form.get("grant_type");
  if (grantType === "authorization_code") {
    const code = form.get("code") ?? "";
    const redirectUri = form.get("redirect_uri") ?? "";
    const clientId = form.get("client_id") ?? "";
    const resource = form.get("resource") ?? "";
    const verifier = form.get("code_verifier") ?? "";
    if (resource !== RESOURCE || !verifier || !(await validOAuthClient(clientId, redirectUri)) || !(await clientAssertionValid(form, clientId))) return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    const payload = await openToken(code, "code");
    const challenge = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))).toString("base64url");
    if (!payload || payload.client_id !== clientId || payload.redirect_uri !== redirectUri || payload.challenge !== challenge || payload.aud !== resource || !payload.supabase_access_token || !payload.supabase_refresh_token || !payload.user_id) return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    if (!(await validateSupabaseUser(payload.supabase_access_token, payload.user_id))) return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    return tokenResponse(payload.user_id, payload.supabase_access_token, payload.supabase_refresh_token, payload.scope ?? "mediaos:read mediaos:write", payload.supabase_expires_at);
  }
  if (grantType === "refresh_token") {
    const clientId = form.get("client_id") ?? "";
    const resource = form.get("resource") ?? "";
    const refreshPayload = await openToken(form.get("refresh_token") ?? "", "refresh");
    if (resource !== RESOURCE || !refreshPayload?.user_id || !refreshPayload.supabase_refresh_token || !(await clientAssertionValid(form, clientId))) return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    const session = await refreshSupabaseSession(refreshPayload.supabase_refresh_token);
    if (!session || session.user.id !== refreshPayload.user_id) return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    return tokenResponse(session.user.id, session.session.access_token, session.session.refresh_token, refreshPayload.scope ?? "mediaos:read mediaos:write", session.session.expires_at);
  }
  return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
}
