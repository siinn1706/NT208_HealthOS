import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "./route";

const validFingerprint = Array.from({ length: 32 }, (_, index) => index.toString(16).padStart(2, "0")).join(":");

describe("Android assetlinks route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.ANDROID_APP_LINK_PACKAGE_NAME;
    delete process.env.ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS;
  });

  it("returns Digital Asset Links JSON when signing fingerprints are configured", async () => {
    process.env.ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS = validFingerprint.toLowerCase();

    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("max-age=3600");
    expect(body).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.nt208.healthos",
          sha256_cert_fingerprints: [validFingerprint.toUpperCase()],
        },
      },
    ]);
  });

  it("supports explicit package name and multiple unique fingerprints", async () => {
    const secondFingerprint = Array.from({ length: 32 }, (_, index) => (255 - index).toString(16).padStart(2, "0")).join(":");
    process.env.ANDROID_APP_LINK_PACKAGE_NAME = "com.example.healthos";
    process.env.ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS = `${validFingerprint}, ${secondFingerprint}, ${validFingerprint}`;

    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0].target.package_name).toBe("com.example.healthos");
    expect(body[0].target.sha256_cert_fingerprints).toEqual([
      validFingerprint.toUpperCase(),
      secondFingerprint.toUpperCase(),
    ]);
  });

  it("fails closed when the signing fingerprint env is missing or malformed", async () => {
    expect(GET().status).toBe(503);

    process.env.ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS = "not-a-fingerprint";
    expect(GET().status).toBe(503);
  });

  it("fails closed when the Android package name is malformed", async () => {
    process.env.ANDROID_APP_LINK_PACKAGE_NAME = "bad-package";
    process.env.ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS = validFingerprint;

    expect(GET().status).toBe(503);
  });
});
