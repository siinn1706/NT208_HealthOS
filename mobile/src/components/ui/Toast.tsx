import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: string;
  tone: ToastTone;
  title?: string;
  message: string;
}

interface ToastContextValue {
  show: (item: Omit<ToastItem, "id"> & { id?: string }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastContextValue["show"]>(
    (item) => {
      const id = item.id ?? `t-${++counter.current}`;
      setToasts((cur) => [...cur, { ...item, id }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const value: ToastContextValue = {
    show,
    success: (message, title) => show({ tone: "success", message, title }),
    error: (message, title) => show({ tone: "error", message, title }),
    info: (message, title) => show({ tone: "info", message, title }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} />
    </ToastContext.Provider>
  );
}

function ToastHost({ toasts }: { toasts: ToastItem[] }) {
  const { colors, radius, spacing, fontWeights, typography } = useTheme();
  if (toasts.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={styles.host}>
      {toasts.map((t) => {
        const tone =
          t.tone === "success"
            ? { bg: colors.success, text: colors.successText }
            : t.tone === "error"
              ? { bg: colors.danger, text: colors.dangerText }
              : { bg: colors.info, text: colors.infoText };
        return (
          <Animated.View
            key={t.id}
            style={[
              styles.toast,
              {
                backgroundColor: tone.bg,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.sm,
              },
            ]}
          >
            {t.title ? (
              <Text
                style={{
                  color: tone.text,
                  fontWeight: fontWeights.semibold,
                  fontSize: typography.sm.fontSize,
                  marginBottom: 2,
                }}
              >
                {t.title}
              </Text>
            ) : null}
            <Text
              style={{
                color: tone.text,
                fontSize: typography.sm.fontSize,
              }}
            >
              {t.message}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    bottom: 32,
    left: 16,
    right: 16,
  },
  toast: {
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
