import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          "/dashboard/", "/admin/", "/onboarding/",
          "/*/dashboard/", "/*/dashboard/*",
          "/*/admin/", "/*/admin/*",
          "/*/admin/forbidden",
          "/*/onboarding/", "/*/onboarding/*",
          "/*/login", "/*/register", "/*/forgot-password", "/*/verify",
          "/*/e", "/*/e/", "/*/e/*",
          "/*/dev/", "/*/dev/*",
          "/*/dashboard/*/print", "/*/dashboard/*/print/*",
          "/cdn-cgi/",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getSiteUrl(),
  };
}
