import { CORS_HEADERS, json, originOf, resourceMetadata } from "@/lib/oauth";

// RFC 9728. MCP clients ask for /.well-known/oauth-protected-resource/mcp
// first and the bare path second, so both answer.
export function GET(req: Request) {
  return json(resourceMetadata(originOf(req)));
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
