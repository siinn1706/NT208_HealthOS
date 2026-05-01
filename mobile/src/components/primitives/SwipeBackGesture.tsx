import React from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { runOnJS } from 'react-native-reanimated';

interface SwipeBackGestureProps {
  children: React.ReactNode;
  /** Horizontal distance in px to trigger navigation back */
  threshold?: number;
  /** Disable on screens where horizontal scroll conflicts */
  disabled?: boolean;
}

function goBack() {
  if (router.canGoBack()) router.back();
}

/**
 * Wraps screen content with an edge-swipe-back gesture.
 * Only activates from the left 30px edge to avoid conflicts with horizontal scrolls.
 */
export function SwipeBackGesture({ children, threshold = 80, disabled }: SwipeBackGestureProps) {
  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([threshold, 9999])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (e.translationX > threshold && e.velocityX > 0) {
        runOnJS(goBack)();
      }
    });

  return <GestureDetector gesture={pan}>{children as React.ReactElement}</GestureDetector>;
}
