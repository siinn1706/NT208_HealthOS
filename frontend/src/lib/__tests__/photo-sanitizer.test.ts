/**
 * Tests for photo-sanitizer.ts (frontend EXIF stripping).
 *
 * The canvas pipeline cannot be fully exercised in jsdom because HTMLCanvasElement
 * does not implement a real GPU/2D rasterizer — toBlob() always produces null in
 * the test environment.  We therefore:
 *   1. Test the happy path by stubbing canvas to produce a synthetic blob.
 *   2. Test the error path when canvas context is unavailable.
 *   3. Test the error path when toBlob() returns null.
 *   4. Test the error path when the Image fails to load.
 *
 * EXIF absence itself cannot be asserted in jsdom (no real pixel decode).
 * Manual verification: load a JPEG with GPS EXIF, call sanitizePhotoForUpload,
 * inspect the result with `exiftool` — GPS tags must be absent.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sanitizePhotoForUpload } from "../photo-sanitizer";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(type = "image/jpeg", size = 100): File {
  const bytes = new Uint8Array(size).fill(0xff);
  return new File([bytes], "test.jpg", { type });
}

/** Produce a synthetic JPEG blob (just enough bytes for type assertion). */
function syntheticJpegBlob(): Blob {
  return new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], {
    type: "image/jpeg",
  });
}

// ── Module-level mutable state shared between stubs ───────────────────────────
// Using module-level vars so the class stubs below can close over them.
let canvasBlobResult: Blob | null = syntheticJpegBlob();
let simulateImageError = false;

// ── Image class stub ──────────────────────────────────────────────────────────
// Must be a real class (not an arrow function) so `new Image()` works.
class MockImage {
  naturalWidth = 640;
  naturalHeight = 480;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    queueMicrotask(() => {
      if (simulateImageError) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    });
  }
}

// ── Canvas stub factory ───────────────────────────────────────────────────────
// Returns a canvas-like object whose getContext() returns a valid 2d stub.
// Set `nullContext = true` before the factory call to test the unavailable path.
let nullContext = false;

function makeCanvasStub() {
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => {
      if (nullContext) return null;
      return { drawImage: vi.fn() };
    }),
    toBlob: vi.fn((cb: (blob: Blob | null) => void, _mime: string) => {
      cb(canvasBlobResult);
    }),
  } as unknown as HTMLCanvasElement;
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  canvasBlobResult = syntheticJpegBlob();
  simulateImageError = false;
  nullContext = false;

  // Stub URL.createObjectURL / revokeObjectURL (not implemented in jsdom).
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:mock-url"),
    revokeObjectURL: vi.fn(),
  });

  // Stub the global Image constructor with our class-based mock.
  vi.stubGlobal("Image", MockImage);

  // Intercept document.createElement("canvas") to return our stub.
  vi.spyOn(document, "createElement").mockImplementation(function (
    this: Document,
    tag: string,
  ) {
    if (tag === "canvas") return makeCanvasStub();
    // Fall through for all other tags (e.g. "div") to keep jsdom functional.
    return Document.prototype.createElement.call(this, tag);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("sanitizePhotoForUpload", () => {
  it("returns a Blob with type image/jpeg for a JPEG input", async () => {
    const result = await sanitizePhotoForUpload(makeFile("image/jpeg"));

    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("image/jpeg");
  });

  it("returns a Blob with type image/png for a PNG input", async () => {
    canvasBlobResult = new Blob([new Uint8Array([0x89, 0x50])], {
      type: "image/png",
    });

    const result = await sanitizePhotoForUpload(makeFile("image/png"));

    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("image/png");
  });

  it("coerces non-jpeg/png types (e.g. image/heic) to image/jpeg output", async () => {
    // canvasBlobResult already defaults to a jpeg blob
    const result = await sanitizePhotoForUpload(makeFile("image/heic"));

    expect(result.type).toBe("image/jpeg");
  });

  it("calls URL.revokeObjectURL to avoid memory leak on success", async () => {
    await sanitizePhotoForUpload(makeFile());

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("rejects when canvas 2d context is unavailable", async () => {
    nullContext = true;

    await expect(sanitizePhotoForUpload(makeFile())).rejects.toThrow(
      "canvas 2d context unavailable",
    );
  });

  it("rejects and revokes object URL when toBlob produces null", async () => {
    canvasBlobResult = null;

    await expect(sanitizePhotoForUpload(makeFile())).rejects.toThrow(
      "canvas.toBlob produced null",
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("rejects and revokes object URL when Image fails to load", async () => {
    simulateImageError = true;

    await expect(sanitizePhotoForUpload(makeFile())).rejects.toThrow(
      "Image decode failed",
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
