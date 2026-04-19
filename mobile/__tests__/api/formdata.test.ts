/**
 * Locks in the centralized RN-FormData-Blob cast so that:
 *   1. Every multipart upload goes through ONE seam — the moment React
 *      Native ships proper FormData types, we drop the cast in exactly
 *      one place.
 *   2. The shape we hand to `formData.append` matches what RN's native
 *      multipart layer expects (`{ uri, name, type }`).
 *
 * Why we spy on `append` instead of reading entries back:
 * Node's polyfilled FormData (the one jest gets by default) coerces
 * non-string non-Blob values to `String(v)` before storing them, which
 * loses the object structure on read-back. React Native's FormData
 * preserves the object verbatim and ships it to the multipart encoder.
 * The spy lets us assert the exact value that landed in `append(...)`
 * regardless of which FormData impl runs the test.
 */
import { appendFilePart, type FilePart } from "@/api/formdata";

describe("appendFilePart", () => {
  function makeSpyFormData(): { fd: FormData; calls: [string, unknown][] } {
    const calls: [string, unknown][] = [];
    const fd = {
      append(name: string, value: unknown) {
        calls.push([name, value]);
      },
    } as unknown as FormData;
    return { fd, calls };
  }

  it("appends the file under the given field name with uri/name/type intact", () => {
    const { fd, calls } = makeSpyFormData();
    const file: FilePart = {
      uri: "file:///tmp/meal-1234.jpg",
      name: "meal-1234.jpg",
      type: "image/jpeg",
    };

    appendFilePart(fd, "image", file);

    expect(calls).toHaveLength(1);
    const [name, value] = calls[0]!;
    expect(name).toBe("image");
    // The runtime "value" is the `{ uri, name, type }` object we
    // handed in (RN doesn't wrap it; the cast through Blob is just
    // a TypeScript escape hatch for the standard DOM FormData typing).
    expect(value).toMatchObject({
      uri: "file:///tmp/meal-1234.jpg",
      name: "meal-1234.jpg",
      type: "image/jpeg",
    });
  });

  it("preserves the input keys verbatim — no re-mapping", () => {
    // Guards against an accidental refactor that swaps `name` <->
    // something else and ships an unconstructible multipart part.
    const { fd, calls } = makeSpyFormData();
    appendFilePart(fd, "avatar", {
      uri: "content://media/external/images/123",
      name: "avatar.png",
      type: "image/png",
    });
    const [, value] = calls[0]!;
    expect(Object.keys(value as object).sort()).toEqual(
      ["name", "type", "uri"].sort()
    );
  });

  it("supports multiple parts on the same FormData", () => {
    const { fd, calls } = makeSpyFormData();
    (fd as unknown as { append: (k: string, v: string) => void }).append(
      "name_form",
      "Pho ga"
    );
    appendFilePart(fd, "image", {
      uri: "file:///tmp/a.jpg",
      name: "a.jpg",
      type: "image/jpeg",
    });
    expect(calls.map(([k]) => k)).toEqual(["name_form", "image"]);
  });
});
