/**
 * Tests for the centralized image-upload preparation helper.
 *
 * Strategy: mock `expo-image-manipulator` to echo back a known temp URI, and
 * mock `expo-file-system` to control the reported file size. We then verify
 * that the helper:
 *   - enforces the correct backend cap per kind (10 MB for meals, 2 MB for avatar)
 *   - aborts cleanly via AbortController
 *   - throws a typed FILE_TOO_LARGE error with the actual size in the message
 *   - returns a payload shape compatible with FormData.append("file", payload)
 */
import { ApiError } from "@/api/errors";
import { discardPreparedImage, prepareImageUpload } from "@/api/uploads";

const fakeTempUri = "file:///tmp/ImageManipulator_xyz.jpg";

jest.mock("expo-image-manipulator", () => ({
  __esModule: true,
  manipulateAsync: jest.fn().mockResolvedValue({ uri: fakeTempUri, width: 1600, height: 900 }),
  SaveFormat: { JPEG: "jpeg", PNG: "png", WEBP: "webp" },
}));

jest.mock("expo-file-system", () => {
  const sizes = new Map<string, number>();
  return {
    __esModule: true,
    getInfoAsync: jest.fn(async (uri: string) => ({
      exists: true,
      isDirectory: false,
      size: sizes.get(uri) ?? 500_000,
      uri,
    })),
    deleteAsync: jest.fn(async () => undefined),
    __setSize(uri: string, size: number) {
      sizes.set(uri, size);
    },
    __reset() {
      sizes.clear();
    },
  };
});

const fs = require("expo-file-system") as {
  __setSize: (uri: string, size: number) => void;
  __reset: () => void;
  deleteAsync: jest.Mock;
};

beforeEach(() => fs.__reset());

describe("prepareImageUpload", () => {
  it("returns a FormData-shaped payload under the meals cap", async () => {
    fs.__setSize(fakeTempUri, 800_000); // 800 KB
    const out = await prepareImageUpload({
      sourceUri: "content://camera/orig.jpg",
      kind: "meal",
    });
    expect(out).toMatchObject({
      uri: fakeTempUri,
      type: "image/jpeg",
      size: 800_000,
    });
    expect(out.name.endsWith(".jpg")).toBe(true);
  });

  it("rejects a meal image > 10 MB with FILE_TOO_LARGE", async () => {
    fs.__setSize(fakeTempUri, 11 * 1024 * 1024);
    try {
      await prepareImageUpload({
        sourceUri: "content://camera/big.jpg",
        kind: "meal",
      });
      fail("expected FILE_TOO_LARGE");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const e = err as ApiError;
      expect(e.code).toBe("FILE_TOO_LARGE");
      expect(e.status).toBe(413);
      expect(e.message).toMatch(/10 MB/);
      expect(e.message).toMatch(/11\.0 MB/);
    }
  });

  it("rejects an avatar image > 2 MB with FILE_TOO_LARGE", async () => {
    fs.__setSize(fakeTempUri, 3 * 1024 * 1024);
    await expect(
      prepareImageUpload({
        sourceUri: "content://camera/avatar-big.jpg",
        kind: "avatar",
      })
    ).rejects.toMatchObject({ code: "FILE_TOO_LARGE", status: 413 });
  });

  it("respects an aborted signal before manipulation", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      prepareImageUpload({
        sourceUri: "x",
        kind: "meal",
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("strips query strings from the resulting filename", async () => {
    const manip = require("expo-image-manipulator");
    manip.manipulateAsync.mockResolvedValueOnce({
      uri: "file:///tmp/abc.jpg?cache_bust=1",
      width: 1600,
      height: 900,
    });
    fs.__setSize("file:///tmp/abc.jpg?cache_bust=1", 100_000);
    const out = await prepareImageUpload({ sourceUri: "x", kind: "meal" });
    expect(out.name).toBe("abc.jpg");
  });

  it("uses the smaller default max width for avatars", async () => {
    fs.__setSize(fakeTempUri, 100_000);
    await prepareImageUpload({ sourceUri: "x", kind: "avatar" });
    const manip = require("expo-image-manipulator").manipulateAsync as jest.Mock;
    const lastCall = manip.mock.calls[manip.mock.calls.length - 1];
    expect(lastCall[1]).toEqual([{ resize: { width: 512 } }]);
  });

  it("uses 1600 max width for meals (analysis-friendly)", async () => {
    fs.__setSize(fakeTempUri, 100_000);
    await prepareImageUpload({ sourceUri: "x", kind: "meal" });
    const manip = require("expo-image-manipulator").manipulateAsync as jest.Mock;
    const lastCall = manip.mock.calls[manip.mock.calls.length - 1];
    expect(lastCall[1]).toEqual([{ resize: { width: 1600 } }]);
  });
});

describe("discardPreparedImage", () => {
  it("calls deleteAsync when the file exists", async () => {
    fs.__setSize(fakeTempUri, 100_000);
    await discardPreparedImage(fakeTempUri);
    expect(fs.deleteAsync).toHaveBeenCalledWith(fakeTempUri, { idempotent: true });
  });

  it("swallows any error", async () => {
    fs.deleteAsync.mockRejectedValueOnce(new Error("noop"));
    await expect(discardPreparedImage(fakeTempUri)).resolves.toBeUndefined();
  });
});
