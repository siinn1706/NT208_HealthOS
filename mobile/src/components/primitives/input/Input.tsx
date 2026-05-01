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
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  error,
  leadingIcon,
  trailingIcon,
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
            borderWidth: focused ? 1.5 : 1,
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
          style={[
            typography.body,
            styles.input,
            { color: disabled ? t.ink4 : t.ink },
          ]}
        />
        {trailingIcon && <View style={styles.iconRight}>{trailingIcon}</View>}
      </Pressable>
      {error && (
        <Text style={[typography.caption, styles.errorText, { color: t.danger }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:   { gap: 4 },
  label:     { marginBottom: 2 },
  row:       { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  iconLeft:  { paddingLeft: 12 },
  iconRight: { paddingRight: 12 },
  input:     { flex: 1, height: 48, paddingHorizontal: 12 },
  errorText: { marginTop: 2 },
});
