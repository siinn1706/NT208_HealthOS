/**
 * Multipart-upload helpers that are pure (no native imports). The
 * image-manipulator-heavy `prepareImageUpload` flow lives in
 * `./uploads.ts`; that module re-exports `FilePart` + `appendFilePart`
 * for backward compatibility, but lives behind expo native modules and
 * can't be loaded inside Jest without mocks.
 *
 * Splitting the formdata helpers out keeps every endpoint module that
 * only needs to APPEND a file part (meals, users avatar, future chat
 * attachments) free of native-dep transitive imports — it also lets
 * the formdata tests run without a jest mock graph.
 */

/**
 * Shape every multipart-upload endpoint expects for an image part.
 * Endpoint modules declare their input contract in terms of `FilePart`
 * instead of re-declaring `{ uri, name, type }`.
 */
export interface FilePart {
  /** `file://`, `content://`, or any URI accepted by RN fetch. */
  uri: string;
  name: string;
  /** MIME type (`image/jpeg` for JPEG, `image/png` for PNG, etc.). */
  type: string;
}

/**
 * React Native's `FormData.append` lets you pass a `{ uri, name, type }`
 * object directly — the platform layer wraps it into a multipart part
 * with the right Content-Disposition headers. TypeScript's standard DOM
 * `FormData` types don't model this and only accept `Blob | string`, so
 * every call site has to do the same `as unknown as Blob` cast.
 *
 * Centralize the cast (and its rationale) here so endpoint modules can
 * say `appendFilePart(fd, "image", file)` and the cast lives in exactly
 * one place where it can be replaced if RN ever ships proper types.
 */
export function appendFilePart(fd: FormData, name: string, file: FilePart): void {
  fd.append(name, {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);
}
