/**
 * BFF — GET /api/v1/wearables/google/callback?code=&state=
 *
 * Google redirects the user's browser here after consent. The session
 * cookie set at /connect time is still in the browser, so coreProxy
 * forwards the JWT and Core BE can verify the state belongs to this
 * user. Core returns the new ConnectedDevice DTO; the FE component
 * that triggered the connect-flow polls /api/v1/devices to see it.
 *
 * Query string is preserved automatically — coreProxy forwards the
 * incoming URL's search params. No body, no method override needed.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/wearables/google/callback");
}
