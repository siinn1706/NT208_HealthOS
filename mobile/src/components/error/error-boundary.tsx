import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{ fallback?: React.ReactNode }>, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View style={s.wrap}>
          <Text style={s.title}>Something went wrong</Text>
          <Text style={s.body}>{this.state.error?.message ?? 'An unexpected error occurred.'}</Text>
          <Pressable style={s.btn} onPress={() => this.setState({ hasError: false, error: null })}>
            <Text style={s.btnText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  wrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title:   { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  body:    { fontSize: 14, color: '#666', marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  btn:     { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#1965B3', borderRadius: 10 },
  btnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
});
