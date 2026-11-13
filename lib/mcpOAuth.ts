import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const ISSUER = "https://app.soloten.com";
const RESOURCE = `${ISSUER}/api/mcp`;
const CHATGPT_CLIENT_HOST = "chatgpt.com";
const CHATGPT_STABLE_REDIRECT_URI = "https://chatgpt.com/connector_platform_oauth_redirect";
const OAUTH_CONSENT_CSP = "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https://chatgpt.com/connector_platform_oauth_redirect; base-uri 'none'; frame-ancestors 'none'";

export function isE2eOAuthClient(clientId: string, redirectUri: string) {
  return process.env.NODE_ENV !== "production" && process.env.OAUTH_E2E === "1" && clientId === "oauth-e2e-client" && redirectUri === CHATGPT_STABLE_REDIRECT_URI;
}

export function isRegisteredRedirectUri(redirectUri: string, registeredRedirectUris: unknown): boolean {
  return Array.isArray(registeredRedirectUris) && registeredRedirectUris.some((candidate) => typeof candidate === "string" && candidate === redirectUri);
}

type TokenPayload = {
  typ: "code" | "access" | "refresh";
  exp: number;
  iat: number;
  aud: string;
  user_id?: string;
  supabase_access_token?: string;
  supabase_refresh_token?: string;
  supabase_expires_at?: number;
  scope?: string;
  client_id?: string;
  redirect_uri?: string;
  challenge?: string;
  state?: string;
};

function keyBytes() {
  const value = process.env.MCP_OAUTH_ENCRYPTION_KEY;
  if (!value) throw new Error("MCP_OAUTH_ENCRYPTION_KEY is not configured");
  const decoded = /^[0-9a-f]{64}$/i.test(value)
    ? Uint8Array.from(value.match(/.{2}/g)!, (byte) => parseInt(byte, 16))
    : Uint8Array.from(Buffer.from(value, "base64"));
  if (decoded.length !== 32) throw new Error("MCP OAuth key must be 32 bytes");
  return decoded;
}

function b64url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

export async function sealToken(payload: TokenPayload) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", keyBytes(), "AES-GCM", false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(payload)));
  return `${b64url(iv)}.${b64url(new Uint8Array(encrypted))}`;
}

export async function openToken(token: string, type: TokenPayload["typ"]): Promise<TokenPayload | null> {
  try {
    const [ivPart, cipherPart, extra] = token.split(".");
    if (!ivPart || !cipherPart || extra) return null;
    const key = await crypto.subtle.importKey("raw", keyBytes(), "AES-GCM", false, ["decrypt"]);
    const raw = await crypto.subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(ivPart, "base64url") }, key, Buffer.from(cipherPart, "base64url"));
    const payload = JSON.parse(new TextDecoder().decode(raw)) as TokenPayload;
    if (payload.typ !== type || payload.aud !== RESOURCE || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function validateChatGptClient(clientId: string, redirectUri: string) {
  let url: URL;
  try { url = new URL(clientId); } catch { return false; }
  if (url.protocol !== "https:" || url.hostname !== CHATGPT_CLIENT_HOST || url.username || url.password || url.port || url.search || url.hash) return false;
  const response = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { accept: "application/json" }, cache: "no-store" }).catch(() => null);
  if (!response?.ok) return false;
  const client = await response.json().catch(() => null) as { client_id?: string; redirect_uris?: unknown } | null;
  return client?.client_id === clientId && isRegisteredRedirectUri(redirectUri, client.redirect_uris);
}

export async function refreshSupabaseSession(refreshToken: string) {
  const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session || !data.user) return null;
  return { user: data.user, session: data.session };
}

export { ISSUER, RESOURCE, CHATGPT_STABLE_REDIRECT_URI, OAUTH_CONSENT_CSP };
