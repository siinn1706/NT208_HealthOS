import React, { memo, useEffect, useRef } from 'react';
import { Image, Pressable, View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconPaperclip } from '../../icons';
import { safeOpenUrl } from '../../utils/safe-url';
import { Sparkline } from '../charts/sparkline';
import { TypingDots } from './typing-dots';

export interface BubbleAttachment {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

interface BubbleProps {
  side: 'ai' | 'me';
  text?: string;
  time?: string;
  attachments?: BubbleAttachment[];
  hasSparkline?: boolean;
  isCaption?: boolean;
  isTyping?: boolean;
  index?: number;
}

export const Bubble = memo(function Bubble({ side, text, time, attachments = [], hasSparkline, isCaption, isTyping, index = 0 }: BubbleProps) {
  const t = useTheme();
  const isMe = side === 'me';

  const bg = isMe ? t.brand : t.card;
  const textColor = isMe ? '#FFF' : t.ink;
  const borderRadius = t.radius.xl;

  // Animate only on first mount; skip re-entrance on re-renders
  const hasEntered = useRef(false);
  const animateIn = !hasEntered.current;
  useEffect(() => { hasEntered.current = true; }, []);

  const cappedDelay = Math.min(index, 5) * 60;

  return (
    <Animated.View
      entering={animateIn ? FadeInDown.delay(cappedDelay).duration(220) : undefined}
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
            {attachments.length > 0 && (
              <View style={styles.attachments}>
                {attachments.map((attachment) => {
                  const isImage = isImageAttachment(attachment);
                  return (
                  <Pressable
                    key={`${attachment.url}-${attachment.name}`}
                    onPress={() => { void safeOpenUrl(attachment.url); }}
                    accessibilityRole="link"
                    accessibilityLabel={`Open ${attachment.name}`}
                    style={[
                      styles.attachment,
                      isImage && styles.imageAttachment,
                      {
                        borderColor: isMe ? 'rgba(255,255,255,0.35)' : t.border,
                        backgroundColor: isMe ? 'rgba(255,255,255,0.12)' : t.bgElev,
                        borderRadius: t.radius.md,
                      },
                    ]}
                  >
                    {isImage ? (
                      <Image source={{ uri: attachment.url }} style={styles.attachmentImage} resizeMode="cover" />
                    ) : (
                      <IconPaperclip size={16} color={isMe ? '#FFF' : t.brand} />
                    )}
                    <View style={isImage ? styles.imageAttachmentMeta : styles.attachmentText}>
                      <Text numberOfLines={1} style={[typography.caption, { color: textColor, fontWeight: '700' }]}>
                        {attachment.name}
                      </Text>
                      <Text numberOfLines={1} style={[typography.micro, { color: isMe ? 'rgba(255,255,255,0.72)' : t.ink3 }]}>
                        {attachment.mimeType} · {formatBytes(attachment.size)}
                      </Text>
                    </View>
                  </Pressable>
                  );
                })}
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
});

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 'size unknown';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageAttachment(attachment: BubbleAttachment) {
  return attachment.mimeType.toLowerCase().startsWith('image/');
}

const styles = StyleSheet.create({
  wrap:           { marginVertical: 4, maxWidth: '82%', alignSelf: 'flex-start' },
  wrapMe:         { alignSelf: 'flex-end' },
  bubble:         { padding: 12 },
  sparkWrap:      { marginTop: 8 },
  attachments:    { marginTop: 10, gap: 8 },
  attachment:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth, padding: 9 },
  imageAttachment: { flexDirection: 'column', alignItems: 'stretch', padding: 0, overflow: 'hidden', gap: 0 },
  attachmentImage: { width: 220, maxWidth: '100%', aspectRatio: 4 / 3 },
  imageAttachmentMeta: { paddingHorizontal: 9, paddingVertical: 7 },
  attachmentText: { flex: 1, minWidth: 0 },
});
