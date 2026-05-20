import { Linking } from 'react-native';

/** Opens a URL only if it uses the https: scheme and the device can handle it. Returns false otherwise. */
export async function safeOpenUrl(url: string): Promise<boolean> {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const supported = await Linking.canOpenURL(url);
    if (!supported) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
