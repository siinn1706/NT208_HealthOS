import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

// Must be called at module level (before component render) so that expo-web-browser
// receives the redirect URL immediately and dismisses the Chrome Custom Tab on Android.
// On iOS this is a no-op since ASWebAuthenticationSession handles it natively.
WebBrowser.maybeCompleteAuthSession();

export default function OAuthCallbackScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
