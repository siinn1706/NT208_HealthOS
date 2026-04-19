import React, { useEffect, useState } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PillGroup } from "@/components/ui/PillGroup";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import { useLocale } from "@/i18n";
import {
  getReportPdfDownload,
  getReportPdfStatus,
  requestReportPdf,
  type ReportPdfRequest,
  type ReportPdfSection,
  type ReportPeriod,
} from "@/api/endpoints/reports";
import { ApiError } from "@/api/errors";

const PERIODS: { value: ReportPeriod; key: string }[] = [
  { value: "7d", key: "reports.rangeWeek" },
  { value: "30d", key: "reports.rangeMonth" },
  { value: "90d", key: "reports.rangeQuarter" },
];

const SECTION_OPTIONS: { value: ReportPdfSection; label: string }[] = [
  { value: "summary", label: "Summary" },
  { value: "vitals", label: "Vitals" },
  { value: "metrics", label: "Metrics" },
  { value: "meals", label: "Meals" },
  { value: "goals", label: "Goals" },
  { value: "appointments", label: "Appointments" },
  { value: "reminders", label: "Reminders" },
];

export default function ExportReportScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { locale } = useLocale();
  const { colors, fontWeights, typography, spacing, radius } = useTheme();

  const [period, setPeriod] = useState<ReportPeriod>("30d");
  const [sections, setSections] = useState<Set<ReportPdfSection>>(
    () => new Set<ReportPdfSection>(["summary", "vitals", "metrics"])
  );
  const [requestId, setRequestId] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      requestReportPdf({
        period,
        sections: Array.from(sections),
        locale,
        include_sensitive: false,
      }),
    onSuccess(req) {
      setRequestId(req.id);
      toast.info("Generating PDF...");
    },
    onError(err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't request PDF.");
    },
  });

  const status = useQuery({
    queryKey: ["report-pdf", requestId],
    enabled: !!requestId,
    queryFn: () => getReportPdfStatus(requestId!),
    refetchInterval: (query) => {
      const data = query.state.data as ReportPdfRequest | undefined;
      return data && (data.status === "completed" || data.status === "failed")
        ? false
        : 2_500;
    },
  });

  useEffect(() => {
    if (status.data?.status === "failed") {
      toast.error(status.data.failure_reason ?? "PDF generation failed.");
    }
  }, [status.data?.status, status.data?.failure_reason, toast]);

  const downloadMutation = useMutation({
    mutationFn: () => getReportPdfDownload(requestId!),
    async onSuccess(signed) {
      const ok = await Linking.canOpenURL(signed.url);
      if (!ok) {
        Alert.alert("Couldn't open URL", "Copy this link to a browser:\n\n" + signed.url, [
          { text: "OK" },
        ]);
        return;
      }
      await Linking.openURL(signed.url);
    },
    onError(err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't open download.");
    },
  });

  const toggle = (s: ReportPdfSection) => {
    setSections((cur) => {
      const next = new Set(cur);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const isReady = status.data?.status === "completed";
  const isFailed = status.data?.status === "failed";

  return (
    <ScreenScroll>
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader title="Export PDF report" />

      {!requestId ? (
        <>
          <Card>
            <Text
              style={{
                color: colors.text,
                fontWeight: fontWeights.semibold,
                fontSize: typography.lg.fontSize,
                marginBottom: spacing.sm,
              }}
            >
              Period
            </Text>
            <PillGroup<ReportPeriod>
              accessibilityLabel="Period"
              value={period}
              onChange={setPeriod}
              options={PERIODS.map((opt) => ({
                value: opt.value,
                label: t(opt.key),
              }))}
            />
          </Card>

          <Card>
            <Text
              style={{
                color: colors.text,
                fontWeight: fontWeights.semibold,
                fontSize: typography.lg.fontSize,
                marginBottom: spacing.sm,
              }}
            >
              Sections
            </Text>
            {/* Multi-select chip group — distinct from PillGroup
                (which is single-select). Each chip is a `checkbox`
                with `accessibilityState.checked` so screen readers
                read out which sections are included in the export. */}
            <View
              accessibilityLabel="Sections"
              style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}
            >
              {SECTION_OPTIONS.map((opt) => {
                const active = sections.has(opt.value);
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => toggle(opt.value)}
                    accessibilityRole="checkbox"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ checked: active }}
                    style={{
                      paddingHorizontal: spacing.md,
                      // Match the chat send button's 44dp tap target so
                      // chips don't fail WCAG 2.1 AA touch-target checks.
                      minHeight: 44,
                      justifyContent: "center",
                      borderRadius: radius.pill,
                      backgroundColor: active ? colors.brand : colors.surfaceMuted,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? colors.brandText : colors.text,
                        fontWeight: fontWeights.semibold,
                        fontSize: typography.xs.fontSize,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Button
            onPress={() => submit.mutate()}
            loading={submit.isPending}
            disabled={sections.size === 0}
            fullWidth
          >
            Generate PDF
          </Button>
        </>
      ) : status.isPending ? (
        <Card>
          <LoadingState />
        </Card>
      ) : status.isError ? (
        <Card>
          <ErrorState error={status.error} onRetry={() => status.refetch()} />
        </Card>
      ) : (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
            <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>
              Status
            </Text>
            <Badge tone={isReady ? "success" : isFailed ? "danger" : "info"}>
              {status.data.status}
            </Badge>
          </View>
          {status.data.bytes ? (
            <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize }}>
              {(status.data.bytes / 1024).toFixed(1)} KB
            </Text>
          ) : null}
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            {isReady ? (
              <Button
                onPress={() => downloadMutation.mutate()}
                loading={downloadMutation.isPending}
                fullWidth
              >
                Open download
              </Button>
            ) : null}
            <Button
              onPress={() => {
                setRequestId(null);
                submit.reset();
              }}
              variant="secondary"
              fullWidth
            >
              {isReady || isFailed ? "Generate another" : "Cancel"}
            </Button>
          </View>
        </Card>
      )}
    </ScreenScroll>
  );
}
