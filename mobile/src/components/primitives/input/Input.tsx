import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AlertTriangle, Check } from 'lucide-react-native';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helper?: string;
  valid?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  trailingText?: string;
  onTrailingPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  error,
  helper,
  valid,
  leadingIcon,
  trailingIcon,
  trailingText,
  onTrailingPress,
  disabled,
  style,
  ...rest
}: InputProps) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const borderColor = error
    ? t.danger
    : focused
    ? t.brand
    : t.border;

  const accessLabel = rest.accessibilityLabel ?? label;

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text style={[typography.caption, styles.label, { color: error ? t.danger : t.ink3 }]}>
          {label}
        </Text>
      )}
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.row,
          {
            borderColor,
            borderRadius: t.radius.md,
            backgroundColor: disabled ? t.bgElev : t.card,
            borderWidth: focused || !!error ? 1.5 : 1,
          },
        ]}
      >
        {leadingIcon && <View style={styles.iconLeft}>{leadingIcon}</View>}
        <TextInput
          ref={inputRef}
          {...rest}
          editable={!disabled}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          placeholderTextColor={t.ink4}
          accessibilityLabel={accessLabel}
          accessibilityState={{ disabled: !!disabled, selected: focused }}
          accessibilityHint={error ?? helper}
          style={[
            typography.body,
            styles.input,
            { color: disabled ? t.ink4 : t.ink },
          ]}
        />
        {trailingText ? (
          <Pressable
            onPress={onTrailingPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={trailingText}
            style={styles.trailingTextWrap}
          >
            <Text style={[typography.caption, { color: t.brand, fontFamily: 'Inter_600SemiBold' }]}>
              {trailingText}
            </Text>
          </Pressable>
        ) : valid && !error ? (
          <View style={styles.iconRight}>
            <Check size={16} color={t.success} />
          </View>
        ) : trailingIcon ? (
          <View style={styles.iconRight}>{trailingIcon}</View>
        ) : null}
      </Pressable>
      {error ? (
        <View style={styles.helperRow}>
          <AlertTriangle size={13} color={t.danger} style={styles.helperIcon} />
          <Text style={[typography.caption, { color: t.danger }]}>{error}</Text>
        </View>
      ) : helper ? (
        <Text style={[typography.caption, styles.helperText, { color: t.ink3 }]}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:          { gap: 4 },
  label:            { marginBottom: 2 },
  row:              { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  iconLeft:         { paddingLeft: 12 },
  iconRight:        { paddingRight: 12 },
  trailingTextWrap: { paddingRight: 14, paddingVertical: 4 },
  input:            { flex: 1, height: 48, paddingHorizontal: 12 },
  helperRow:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  helperIcon:       { marginTop: 1 },
  helperText:       { marginTop: 4 },
});
