import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Input, type InputProps } from "./Input";
import { useTheme } from "@/theme";

export function PasswordField(props: InputProps) {
  const [hidden, setHidden] = useState(true);
  const { colors, fontWeights } = useTheme();
  return (
    <Input
      {...props}
      secureTextEntry={hidden}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="password"
      textContentType="password"
      rightAdornment={
        <Pressable
          onPress={() => setHidden((h) => !h)}
          accessibilityRole="button"
          accessibilityLabel={hidden ? "Show password" : "Hide password"}
          hitSlop={8}
        >
          <View>
            <Text
              style={{
                color: colors.brand,
                fontWeight: fontWeights.semibold,
                fontSize: 12,
                paddingHorizontal: 4,
              }}
            >
              {hidden ? "SHOW" : "HIDE"}
            </Text>
          </View>
        </Pressable>
      }
    />
  );
}
