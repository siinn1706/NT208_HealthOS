import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Sparkline } from '../charts/Sparkline';
import { TypingDots } from './TypingDots';

interface BubbleProps {
  side: 'ai' | 'me';
  text?: string;
  time?: string;
  hasSparkline?: boolean;
  isCaption?: boolean;
  isTyping?: boolean;
  index?: number;
}

export function Bubble({ side, text, time, hasSparkline, isCaption, isTyping, index = 0 }: BubbleProps) {
  const t = useTheme();
  const isMe = side === 'me';

  const bg = isMe ? t.brand : t.card;
  const textColor = isMe ? '#FFF' : t.ink;
  const borderRadius = t.radius.xl;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(220)}
      style={[styles.wrap, isMe && styles.wrapMe]}
    >
      <View
        style={[
          styles.bubble,
          { backgroundColor: bg, borderRadius },
          isMe
            ? { borderBottomRightRadius: 4 }
            : { borderBottomLeftRadius: 4, borderColor: t.border, borderWidth: StyleSheet.hairlineWidth },
          isCaption && { backgroundColor: t.bgElev },
        ]}
      >
        {isTyping ? (
          <TypingDots />
        ) : (
          <>
            {text && (
              <Text style={[typography.body, { color: isCaption ? t.ink3 : textColor }]}>
                {text}
              </Text>
            )}
            {hasSparkline && (
              <View style={styles.sparkWrap}>
                <Sparkline data={[72, 70, 74, 71, 68, 67, 68]} color={t.brand} width={160} height={40} />
              </View>
            )}
          </>
        )}
      </View>
      {time && (
        <Text style={[typography.micro, { color: t.ink4, marginTop: 4, alignSelf: isMe ? 'flex-end' : 'flex-start' }]}>
          {time}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap:      { marginVertical: 4, maxWidth: '82%', alignSelf: 'flex-start' },
  wrapMe:    { alignSelf: 'flex-end' },
  bubble:    { padding: 12 },
  sparkWrap: { marginTop: 8 },
});
