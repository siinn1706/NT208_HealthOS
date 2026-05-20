/** Returns the URI only if it uses https:, otherwise returns null. */
export function safeImageUri(uri: string | null | undefined): string | null {
  if (!uri) return null;
  try {
    const u = new URL(uri);
    if (u.protocol !== 'https:') return null;
    return uri;
  } catch {
    return null;
  }
}
