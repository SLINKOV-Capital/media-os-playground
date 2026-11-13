import { createHash, randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { CHATGPT_STABLE_REDIRECT_URI, isRegisteredRedirectUri, OAUTH_CONSENT_CSP } from "../../lib/mcpOAuth";

const issuer = "https://app.soloten.com";
const resource = `${issuer}/api/mcp`;
const clientId = "oauth-e2e-client";
const redirectUri = CHATGPT_STABLE_REDIRECT_URI;

test("CSP and exact registered redirect URI policy stay narrow", async () => {
  const registeredRedirectUris = [redirectUri];
  expect(isRegisteredRedirectUri(redirectUri, registeredRedirectUris)).toBe(true);
  expect(isRegisteredRedirectUri("https://evil.example/connector_platform_oauth_redirect", registeredRedirectUris)).toBe(false);
  expect(isRegisteredRedirectUri("https://chatgpt.com/connector_platform_oauth_redirect/extra", registeredRedirectUris)).toBe(false);
  expect(isRegisteredRedirectUri(`${redirectUri}?next=https://evil.example`, registeredRedirectUris)).toBe(false);
  expect(isRegisteredRedirectUri("http://chatgpt.com/connector_platform_oauth_redirect", registeredRedirectUris)).toBe(false);
  expect(OAUTH_CONSENT_CSP).toContain(`form-action 'self' ${redirectUri};`);
  expect(OAUTH_CONSENT_CSP).not.toContain("https://chatgpt.com/connector/oauth/");
});

test("consent submits, code exchanges, authorized MCP profile request succeeds", async ({ page, context, request }) => {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(16).toString("hex");
  const authorizeUrl = new URL("/oauth/authorize", "http://127.0.0.1:3017");
  authorizeUrl.search = new URLSearchParams({
    response_type: "code", client_id: clientId, redirect_uri: redirectUri,
    scope: "mediaos:read mediaos:write", code_challenge: challenge,
    code_challenge_method: "S256", resource, state,
  }).toString();
  await context.addCookies([{ name: "oauth-e2e-session", value: "authorized", url: "http://127.0.0.1:3017" }]);

  const network: Array<{ method: string; path: string; status?: number; redirect?: string }> = [];
  const consoleMessages: string[] = [];
  let callbackUrl: URL | null = null;
  const callbackOrigin = new URL(redirectUri).origin;
  const callbackPath = new URL(redirectUri).pathname;
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      if (event.violatedDirective === "form-action") console.error(`CSP ${event.violatedDirective} blockedURI=${event.blockedURI}`);
    });
  });
  page.on("console", (message) => { if (message.type() === "error") consoleMessages.push(message.text().slice(0, 240)); });
  page.on("pageerror", (error) => consoleMessages.push(error.message.slice(0, 240)));
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.origin === "http://127.0.0.1:3017" || (url.origin === callbackOrigin && url.pathname === callbackPath)) network.push({ method: req.method(), path: `${url.origin}${url.pathname}` });
  });
  page.on("response", (res) => {
    const url = new URL(res.url());
    const item = [...network].reverse().find((entry) => entry.path === `${url.origin}${url.pathname}` && entry.status === undefined);
    if (item) {
      item.status = res.status();
      const location = res.headers().location;
      if (location) {
        const target = new URL(location);
        item.redirect = `${target.origin}${target.pathname}`;
      }
    }
  });

  const consentResponse = await page.goto(authorizeUrl.toString());
  expect(consentResponse?.headers()["content-security-policy"]).toBe(OAUTH_CONSENT_CSP);
  await expect(page.getByRole("button", { name: "Разрешить подключение" })).toBeVisible();
  const authorizePostResponse = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/oauth/authorize");
  const callbackRequest = page.waitForRequest((req) => req.method() === "GET" && req.url().startsWith(`${redirectUri}?`));
  const callbackResponse = page.waitForResponse((response) => response.request().method() === "GET" && response.url().startsWith(`${redirectUri}?`));
  await page.getByRole("button", { name: "Разрешить подключение" }).click({ noWaitAfter: true });
  const authorizeResponse = await authorizePostResponse;
  const authorizeStatus = authorizeResponse.status();
  const authorizeFailure = authorizeStatus >= 300 && authorizeStatus < 400 ? "redirect response" : (await authorizeResponse.text()).slice(0, 120);
  expect(authorizeStatus, `POST response=${authorizeFailure}; check=${authorizeResponse.headers()["x-oauth-e2e-failure"] ?? "none"}`).toBe(302);
  const completedCallback = new URL((await callbackRequest).url());
  callbackUrl = completedCallback;
  const callbackHttpStatus = (await callbackResponse).status();
  await page.waitForURL((url) => url.hostname === "chatgpt.com", { timeout: 20_000 });
  expect(new URL(page.url()).hostname).toBe("chatgpt.com");
  expect(completedCallback.searchParams.has("code")).toBe(true);
  expect(completedCallback.searchParams.get("state")).toBe(state);
  expect(completedCallback.searchParams.get("iss")).toBe(issuer);

  const code = completedCallback.searchParams.get("code")!;
  const tokenResponse = await request.post("/oauth/token", {
    headers: { "content-type": "application/x-www-form-urlencoded" },
    form: {
      grant_type: "authorization_code", code, redirect_uri: redirectUri,
      client_id: clientId, code_verifier: verifier, resource,
    },
  });
  const tokenStatus = tokenResponse.status();
  expect(tokenStatus).toBe(200);
  const tokenBody = await tokenResponse.json() as { access_token: string; token_type: string };
  expect(tokenBody.token_type).toBe("Bearer");

  const mcpResponse = await request.post("/api/mcp", {
    headers: { authorization: `Bearer ${tokenBody.access_token}`, "content-type": "application/json", accept: "application/json, text/event-stream" },
    data: { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "oauth-e2e", version: "1.0" } } },
  });
  expect(mcpResponse.status()).toBe(200);
  const mcpBody = await mcpResponse.json();
  expect(mcpBody.result?.serverInfo?.name).toBe("mediaos");
  const toolsListResponse = await request.post("/api/mcp", {
    headers: { authorization: `Bearer ${tokenBody.access_token}`, "content-type": "application/json", accept: "application/json, text/event-stream" },
    data: { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
  });
  expect(toolsListResponse.status()).toBe(200);
  const toolsList = await toolsListResponse.json();
  const publishedTools = (toolsList.result?.tools ?? []).map((tool: { name: string }) => tool.name);
  expect(publishedTools).toEqual(expect.arrayContaining(["get_material", "create_material", "update_material", "link_material", "unlink_material", "archive_work_item", "restore_work_item"]));
  const profileResponse = await request.post("/api/mcp", {
    headers: { authorization: `Bearer ${tokenBody.access_token}`, "content-type": "application/json", accept: "application/json, text/event-stream" },
    data: { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_profile", arguments: {} } },
  });
  expect(profileResponse.status()).toBe(200);
  const profileBody = await profileResponse.json();
  expect(profileBody.result?.structuredContent?.email).toBe("oauth-e2e@example.invalid");

  const report = {
    consentPage: "HTTP 200; button visible",
    authorizePost: network.find((entry) => entry.method === "POST" && entry.path === "/oauth/authorize"),
    callback: { host: completedCallback.host, pathname: completedCallback.pathname, hasCode: true, stateMatched: completedCallback.searchParams.get("state") === state, issuerMatched: completedCallback.searchParams.get("iss") === issuer },
    tokenExchange: { status: tokenStatus, tokenType: tokenBody.token_type },
    mcpInitialize: { status: mcpResponse.status(), server: mcpBody.result.serverInfo.name },
    publishedMaterialTools: publishedTools.filter((name: string) => /material|archive_work_item|restore_work_item/.test(name)),
    mcpAuthorizedRead: { status: profileResponse.status(), tool: "get_profile", syntheticUserReturned: true },
    cspViolations: consoleMessages.filter((message) => /form-action/i.test(message)),
    testCallback: { reached: true, httpStatus: callbackHttpStatus, note: callbackHttpStatus === 403 ? "External callback receiver returned an automated-browser protection response." : "External callback receiver responded." },
    network: network.map(({ method, path, status, redirect }) => ({ method, path, status, redirect })),
    secretsOmitted: true,
  };
  await writeFile("/tmp/mediaos-oauth-e2e-report.json", JSON.stringify(report, null, 2));
  const authorizePost = network.find((entry) => entry.method === "POST" && entry.path === "http://127.0.0.1:3017/oauth/authorize");
  expect(authorizePost?.status).toBe(302);
  expect(authorizePost?.redirect).toBe(redirectUri);
  expect(completedCallback.origin + completedCallback.pathname).toBe(redirectUri);
  expect(consoleMessages.filter((message) => /form-action/i.test(message))).toEqual([]);
});
