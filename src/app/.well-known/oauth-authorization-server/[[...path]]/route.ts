import { CORS_HEADERS, authServerMetadata, json, originOf } from "@/lib/oauth";

// RFC 8414, at the bare path and with a path suffix, for clients that add
// the resource's path to it.
export function GET(req: Request) {
  return json(authServerMetadata(originOf(req)));
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
