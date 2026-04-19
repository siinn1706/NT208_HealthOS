import React, { useEffect, useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import {
  getDataExportDownload,
  getDataExportStatus,
  requestDataExport,
  type DataExportRequest,
} from "@/api/endpoints/account";
import { ApiError } from "@/api/errors";
import { formatDate } from "@/utils/date";

export default function DataExportScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { colors, fontWeights, typography, spacing } = useTheme();

  const [requestId, setRequestId] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: requestDataExport,
    onSuccess(req) {
      setRequestId(req.id);
      toast.info("Building your export...");
    },
    onError(err) {
      if (err instanceof ApiError && err.code === "RATE_LIMITED") {
        toast.error("You can request one export per 24 hours.");
      } else {
        toast.error(err instanceof ApiError ? err.message : "Couldn't request export.");
      }
    },
  });

  const status = useQuery({
    queryKey: ["data-export", requestId],
    enabled: !!requestId,
    queryFn: () => getDataExportStatus(requestId!),
    refetchInterval: (query) => {
      const data = query.state.data as DataExportRequest | undefined;
      return data && (data.status === "completed" || data.status === "failed")
        ? false
        : 3_000;
    },
  });

  useEffect(() => {
    if (status.data?.status === "failed" && status.data.error) {
      toast.error(status.data.error);
    }
  }, [status.data?.status, status.data?.error, toast]);

  const downloadMutation = useMutation({
    mutationFn: () => getDataExportDownload(requestId!),
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
      if (err instanceof ApiError && err.status === 410) {
        toast.error("Download link expired. Request a fresh one.");
      } else {
        toast.error(err instanceof ApiError ? err.message : "Couldn't open download.");
      }
    },
  });

  const isReady = status.data?.status === "completed";
  const isFailed = status.data?.status === "failed";

  return (
    <ScreenScroll>
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader title="Export account data" />

      {!requestId ? (
        <>
          <Card>
            <Text style={{ color: colors.text }}>
              Receive a downloadable archive containing your profile, meals,
              metrics, reminders, and chat history.
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: typography.xs.fontSize,
                marginTop: spacing.sm,
              }}
            >
              Rate-limited to one request per 24 hours. Download links expire 5
              minutes after they are minted.
            </Text>
          </Card>
          <Button
            onPress={() => submit.mutate()}
            loading={submit.isPending}
            fullWidth
          >
            Request export
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
          <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize }}>
            Requested {formatDate(status.data.requested_at, "MMM D, YYYY · HH:mm")}
          </Text>
          {status.data.bytes ? (
            <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize }}>
              {(status.data.bytes / (1024 * 1024)).toFixed(2)} MB
            </Text>
          ) : null}
          {status.data.expires_at ? (
            <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize }}>
              Expires {formatDate(status.data.expires_at, "MMM D, YYYY")}
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
              {isReady || isFailed ? "Done" : "Hide"}
            </Button>
          </View>
        </Card>
      )}
    </ScreenScroll>
  );
}
