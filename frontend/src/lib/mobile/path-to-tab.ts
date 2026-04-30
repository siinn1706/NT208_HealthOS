/** Maps a Next.js pathname to the corresponding mobile bottom-tab key. */
export type TabKey = 'home' | 'care' | 'chat' | 'meds' | 'me';

const TAB_PATTERNS: [RegExp, TabKey][] = [
  [/^\/[^/]+\/mobile\/home(\/|$)/, 'home'],
  [/^\/[^/]+\/mobile\/(care|appointments|visit-prep|prescription|medical-history)(\/|$)/, 'care'],
  [/^\/[^/]+\/mobile\/chat(\/|$)/, 'chat'],
  [/^\/[^/]+\/mobile\/(meds|medication)(\/|$)/, 'meds'],
  [/^\/[^/]+\/mobile\/(me|profile|settings)(\/|$)/, 'me'],
];

/** Returns the tab key for a given pathname, or undefined if no tab matches. */
export function pathToTabKey(pathname: string): TabKey | undefined {
  for (const [pattern, key] of TAB_PATTERNS) {
    if (pattern.test(pathname)) return key;
  }
  return undefined;
}
