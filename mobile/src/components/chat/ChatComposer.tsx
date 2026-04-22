import React from "react";
import { Pressable, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface ChatComposerProps {
  draft: string;
  onChangeDraft: (text: string) => void;
  onSend: () => void;
  onTyping?: () => void;
  editing: boolean;
  editingNotice: string;
  onCancelEdit: () => void;
  cancelLabel: string;
  placeholder: string;
  placeholderColor: string;
  sendLabel: string;
  canSend: boolean;
  inputStyle: StyleProp<TextStyle>;
  sendButtonStyle: StyleProp<ViewStyle>;
  sendTextStyle: StyleProp<TextStyle>;
  sendDisabledTextColor: string;
  noticeStyle?: StyleProp<TextStyle>;
  cancelNoticeStyle?: StyleProp<TextStyle>;
  shellStyle: StyleProp<ViewStyle>;
}

export function ChatComposer({
  draft,
  onChangeDraft,
  onSend,
  onTyping,
  editing,
  editingNotice,
  onCancelEdit,
  cancelLabel,
  placeholder,
  placeholderColor,
  sendLabel,
  canSend,
  inputStyle,
  sendButtonStyle,
  sendTextStyle,
  sendDisabledTextColor,
  noticeStyle,
  cancelNoticeStyle,
  shellStyle,
}: ChatComposerProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[shellStyle, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {editing ? (
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <Text style={[{ flex: 1 }, noticeStyle]}>{editingNotice}</Text>
          <Pressable onPress={onCancelEdit} hitSlop={6}>
            <Text style={cancelNoticeStyle}>{cancelLabel}</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
        <TextInput
          style={inputStyle}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          value={draft}
          onChangeText={(text) => {
            onChangeDraft(text);
            onTyping?.();
          }}
          multiline
        />
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={sendLabel}
          accessibilityState={{ disabled: !canSend }}
          style={sendButtonStyle}
        >
          <Text style={[sendTextStyle, !canSend ? { color: sendDisabledTextColor } : null]}>
            {sendLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
