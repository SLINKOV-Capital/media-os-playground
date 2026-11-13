import { NextResponse } from "next/server";
import { ISSUER } from "@/lib/mcpOAuth";

export function GET() {
  return NextResponse.json({
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/oauth/authorize`,
    token_endpoint: `${ISSUER}/oauth/token`,
    client_id_metadata_document_supported: true,
    token_endpoint_auth_methods_supported: ["none", "private_key_jwt"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["mediaos:read", "mediaos:write"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    authorization_response_iss_parameter_supported: true,
  }, { headers: { "Cache-Control": "public, max-age=300" } });
}
