import { NextResponse } from "next/server";

const DEFAULT_ANDROID_PACKAGE_NAME = "com.nt208.healthos";
const ANDROID_PACKAGE_RE = /^([A-Za-z][A-Za-z0-9_]*\.)+[A-Za-z][A-Za-z0-9_]*$/;
const SHA256_FINGERPRINT_RE = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

function normalizeAndroidPackageName(raw: string | undefined): string | null {
  const value = (raw ?? DEFAULT_ANDROID_PACKAGE_NAME).trim();
  return ANDROID_PACKAGE_RE.test(value) ? value : null;
}

function normalizeSha256Fingerprint(raw: string): string | null {
  const value = raw.trim().toUpperCase();
  return SHA256_FINGERPRINT_RE.test(value) ? value : null;
}

function readSha256Fingerprints(raw: string | undefined): string[] | null {
  const values = (raw ?? "")
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length === 0) return null;

  const normalized = values.map(normalizeSha256Fingerprint);
  return normalized.every((value): value is string => Boolean(value))
    ? Array.from(new Set(normalized))
    : null;
}

function buildAndroidAssetLinks(packageName: string, fingerprints: string[]) {
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}

export function GET() {
  const packageName = normalizeAndroidPackageName(process.env.ANDROID_APP_LINK_PACKAGE_NAME);
  const fingerprints = readSha256Fingerprints(process.env.ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS);
  if (!packageName || !fingerprints) {
    return NextResponse.json(
      {
        error: {
          code: "ANDROID_APP_LINKS_NOT_CONFIGURED",
          message: "Android App Links require a valid package name and SHA-256 signing certificate fingerprint.",
        },
      },
      { status: 503 },
    );
  }

  return NextResponse.json(buildAndroidAssetLinks(packageName, fingerprints), {
    headers: {
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
