import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match root and locale-prefixed routes
    "/",
    "/(vi|en)/:path*",
    // Skip Next.js internals and static files
    "/((?!_next|_vercel|.*\\..*).*)",
  ],
};
