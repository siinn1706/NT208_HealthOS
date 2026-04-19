import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const PREF_KEY = "healthos.security.biometric";

export async function biometricSupported(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

export async function getBiometricPreference(): Promise<boolean> {
  try {
    const v = await SecureStore.getItemAsync(PREF_KEY);
    return v === "1";
  } catch {
    return false;
  }
}

export async function setBiometricPreference(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(PREF_KEY, enabled ? "1" : "0");
}

export async function authenticateBiometric(prompt: string): Promise<boolean> {
  const ok = await biometricSupported();
  if (!ok) return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: prompt,
    cancelLabel: "Cancel",
    fallbackLabel: "Use passcode",
    disableDeviceFallback: false,
  });
  return result.success;
}
