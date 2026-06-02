/**
 * Tests for frontend/src/lib/attachment-trust.ts
 *
 * Covers: URL scheme validation, host allowlist enforcement, MIME normalisation,
 * filename sanitization, and AI-context prompt-injection wrapping.
 */

import {
  sanitizeAttachmentForRender,
  sanitizeFilename,
  sanitizeFilenameForAiContext,
} from "../../lib/attachment-trust";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid attachment with safe defaults. */
function att(overrides: Partial<{ url: string; name: string; mime: string }> = {}) {
  return {
    url: "https://cdn.example.com/photo.jpg",
    name: "photo.jpg",
    mime: "image/jpeg",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// sanitizeAttachmentForRender — URL validation
// ---------------------------------------------------------------------------

describe("sanitizeAttachmentForRender — URL validation", () => {
  it("returns null for http:// URLs", () => {
    expect(sanitizeAttachmentForRender(att({ url: "http://cdn.example.com/photo.jpg" }))).toBeNull();
  });

  it("returns null for data: URLs", () => {
    expect(sanitizeAttachmentForRender(att({ url: "data:text/html,<script>alert(1)</script>" }))).toBeNull();
  });

  it("returns null for javascript: URLs", () => {
    expect(sanitizeAttachmentForRender(att({ url: "javascript:alert(1)" }))).toBeNull();
  });

  it("returns null for blob: URLs", () => {
    expect(sanitizeAttachmentForRender(att({ url: "blob:https://example.com/abc" }))).toBeNull();
  });

  it("returns null for empty string URLs", () => {
    expect(sanitizeAttachmentForRender(att({ url: "" }))).toBeNull();
  });

  it("returns a SafeAttachment for a valid https:// URL", () => {
    const result = sanitizeAttachmentForRender(att());
    expect(result).not.toBeNull();
    expect(result!.url).toBe("https://cdn.example.com/photo.jpg");
  });
});

// ---------------------------------------------------------------------------
// sanitizeAttachmentForRender — host allowlist
// ---------------------------------------------------------------------------

describe("sanitizeAttachmentForRender — host allowlist", () => {
  const originalEnv = process.env.NEXT_PUBLIC_CDN_ALLOWED_HOSTS;

  afterEach(() => {
    // Restore env after each test — module-level constant won't recompute, but
    // this guards against leaking between other describe blocks.
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_CDN_ALLOWED_HOSTS;
    } else {
      process.env.NEXT_PUBLIC_CDN_ALLOWED_HOSTS = originalEnv;
    }
  });

  it("allows any https:// host when ALLOWED_HOSTS is empty (default)", () => {
    // The module was imported with an empty env var, so ALLOWED_HOSTS.size === 0.
    const result = sanitizeAttachmentForRender(att({ url: "https://any-host.com/img.jpg" }));
    expect(result).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// sanitizeAttachmentForRender — MIME normalisation
// ---------------------------------------------------------------------------

describe("sanitizeAttachmentForRender — MIME normalisation", () => {
  it("preserves image/jpeg MIME and marks as previewable", () => {
    const result = sanitizeAttachmentForRender(att({ mime: "image/jpeg" }));
    expect(result!.mime).toBe("image/jpeg");
    expect(result!.previewable).toBe(true);
  });

  it("preserves image/png MIME and marks as previewable", () => {
    const result = sanitizeAttachmentForRender(att({ mime: "image/png" }));
    expect(result!.mime).toBe("image/png");
    expect(result!.previewable).toBe(true);
  });

  it("preserves application/pdf MIME but marks as not previewable", () => {
    const result = sanitizeAttachmentForRender(att({ mime: "application/pdf" }));
    expect(result!.mime).toBe("application/pdf");
    expect(result!.previewable).toBe(false);
  });

  it("replaces unknown MIME with application/octet-stream", () => {
    const result = sanitizeAttachmentForRender(att({ mime: "application/x-custom-type" }));
    expect(result!.mime).toBe("application/octet-stream");
    expect(result!.previewable).toBe(false);
  });

  it("replaces image/svg+xml with application/octet-stream (SVG can carry JS)", () => {
    const result = sanitizeAttachmentForRender(att({ mime: "image/svg+xml" }));
    expect(result!.mime).toBe("application/octet-stream");
    expect(result!.previewable).toBe(false);
  });

  it("replaces text/html with application/octet-stream", () => {
    const result = sanitizeAttachmentForRender(att({ mime: "text/html" }));
    expect(result!.mime).toBe("application/octet-stream");
  });
});

// ---------------------------------------------------------------------------
// sanitizeFilename
// ---------------------------------------------------------------------------

describe("sanitizeFilename", () => {
  it("strips control characters (0x00–0x1F)", () => {
    expect(sanitizeFilename("file\x00name.jpg")).toBe("filename.jpg");
    expect(sanitizeFilename("file\x1fname.jpg")).toBe("filename.jpg");
  });

  it("strips DEL character (0x7F)", () => {
    expect(sanitizeFilename("file\x7fname.jpg")).toBe("filename.jpg");
  });

  it("strips forward slashes (path separator)", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("..etcpasswd");
  });

  it("strips backslashes (Windows path separator)", () => {
    expect(sanitizeFilename("..\\..\\windows\\system32")).toBe("....windowssystem32");
  });

  it("truncates names longer than 128 characters", () => {
    const long = "a".repeat(200);
    expect(sanitizeFilename(long)).toHaveLength(128);
  });

  it("returns 'attachment' for empty or all-stripped names", () => {
    expect(sanitizeFilename("")).toBe("attachment");
    expect(sanitizeFilename("\x00\x01\x02")).toBe("attachment");
  });

  it("preserves normal filenames unchanged", () => {
    expect(sanitizeFilename("report 2024.pdf")).toBe("report 2024.pdf");
    expect(sanitizeFilename("photo-final (1).jpg")).toBe("photo-final (1).jpg");
  });
});

// ---------------------------------------------------------------------------
// sanitizeFilenameForAiContext
// ---------------------------------------------------------------------------

describe("sanitizeFilenameForAiContext", () => {
  it("wraps the sanitized name in <<UNTRUSTED filename='...'>>", () => {
    const result = sanitizeFilenameForAiContext("photo.jpg");
    expect(result).toBe('<<UNTRUSTED filename="photo.jpg">>');
  });

  it("sanitizes the filename before wrapping (strips control chars)", () => {
    const result = sanitizeFilenameForAiContext("evil\x00file.jpg");
    expect(result).toBe('<<UNTRUSTED filename="evilfile.jpg">>');
  });

  it("wraps the 'attachment' fallback when name is empty", () => {
    const result = sanitizeFilenameForAiContext("");
    expect(result).toBe('<<UNTRUSTED filename="attachment">>');
  });

  it("truncates long filenames inside the wrapper", () => {
    const long = "a".repeat(200);
    const result = sanitizeFilenameForAiContext(long);
    // Should be <<UNTRUSTED filename="<128 a's>">>
    expect(result).toContain("<<UNTRUSTED");
    expect(result.length).toBeLessThan(200);
    // The filename part should be exactly 128 chars
    const match = result.match(/filename="([^"]+)"/);
    expect(match![1]).toHaveLength(128);
  });
});
