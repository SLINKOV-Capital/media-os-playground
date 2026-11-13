import { NextResponse } from "next/server";
import { RESOURCE, ISSUER } from "@/lib/mcpOAuth";

export function GET() {
  return NextResponse.json({
    resource: RESOURCE,
    authorization_servers: [ISSUER],
    scopes_supported: ["mediaos:read", "mediaos:write"],
    resource_documentation: "https://app.soloten.com/api/mcp",
  }, { headers: { "Cache-Control": "public, max-age=300" } });
}
