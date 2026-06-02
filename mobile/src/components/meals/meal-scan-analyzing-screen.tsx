import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Image } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconSparkle, IconCheck } from '../../icons';
import { mealService } from '../../api/services';
import type { MealAnalysisStatus } from '../../api/services/meal-service';
import {
  getQueuedMealScanPhoto,
  incrementQueuedMealScanPhotoAttempts,
  isTransientMealScanUploadError,
  removeQueuedMealScanPhoto,
  type MealScanQueuedPhoto,
} from '../../api/services/meal-offline-queue';

type NetState = { isConnected?: boolean | null; isInternetReachable?: boolean | null };

const BG = '#0B0F14';
export const MEAL_SCAN_POLL_INTERVAL_MS = 2500;
export const MEAL_SCAN_MAX_POLL_ATTEMPTS = 24;
const DONE_STATUSES = ['analyzed', 'ready', 'completed', 'done'];
const FAILED_STATUSES = ['failed', 'error'];
const DEFAULT_FAILED_MESSAGE = 'Meal photo analysis failed. Please retake the photo.';
const TIMED_OUT_MESSAGE = 'Meal photo analysis is taking longer than expected. Please check your meal log or retake the photo.';

export function getMealScanPollingError(result: MealAnalysisStatus, attempt: number) {
  const nextStatus = result.status.toLowerCase();
  if (FAILED_STATUSES.includes(nextStatus)) {
    return result.error?.message ?? DEFAULT_FAILED_MESSAGE;
  }
  if (!DONE_STATUSES.includes(nextStatus) && attempt >= MEAL_SCAN_MAX_POLL_ATTEMPTS - 1) {
    return TIMED_OUT_MESSAGE;
  }
  return null;
}

export function getMealScanCancelRoute(canGoBack: boolean) {
  return canGoBack ? null : '/meals/scan';
}

type StageStatus = 'done' | 'active' | 'pending';

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function StageRow({ label, status }: { label: string; status: StageStatus }) {
  const t = useTheme();
  return (
    <View style={[styles.stageRow, { borderBottomColor: 'rgba(0,0,0,0.08)' }]}>
      <View style={[styles.stageIcon, {
        backgroundColor: status === 'done' ? t.success : status === 'active' ? t.brandSoft : t.bgElev,
        borderColor: status === 'pending' ? 'rgba(0,0,0,0.12)' : 'transparent',
        borderWidth: status === 'pending' ? 1 : 0,
      }]}>
        {status === 'done'   && <IconCheck size={14} color="#fff" />}
        {status === 'active' && <ActivityIndicator size="small" color={t.brand} />}
      </View>
      <Text style={[typography.bodyMed, { color: status === 'pending' ? '#888' : '#111', flex: 1 }]}>{label}</Text>
      {status === 'active' && (
        <Text style={[typography.caption, { color: '#3B82F6' }]}>Working…</Text>
      )}
    </View>
  );
}

export function MealScanAnalyzingScreen() {
  const router = useRouter();
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const params = useLocalSearchParams<{
    mealId?: string | string[];
    jobId?: string | string[];
    imageUri?: string | string[];
    queuedMealPhotoId?: string | string[];
  }>();
  const mealId = firstParam(params.mealId);
  const jobId = firstParam(params.jobId);
  const imageUri = firstParam(params.imageUri);
  const queuedMealPhotoId = firstParam(params.queuedMealPhotoId);
  const scanLine = useSharedValue(0);
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState<string | null>(null);
  const [queuedMealPhoto, setQueuedMealPhoto] = useState<MealScanQueuedPhoto | null>(null);
  const isSubmittingRef = useRef(false);

  const done = DONE_STATUSES.includes(status);
  const failed = FAILED_STATUSES.includes(status);
  const statusLabel = error
    ?? (status === 'submitting'
      ? i18n('meals.photoAnalysisSubmitting')
      : status === 'queued'
      ? i18n('meals.photoAnalysisQueued')
      : `Backend status: ${status}`);

  const STAGES: { label: string; status: StageStatus }[] = useMemo(() => {
    if (done) {
      return [
        { label: i18n('meals.detectFood'),       status: 'done' },
        { label: i18n('meals.estimatePortions'), status: 'done' },
        { label: i18n('meals.lookUpNutrition'),  status: 'done' },
        { label: i18n('meals.matchGoals'),       status: 'done' },
      ];
    }
    if (status === 'queued' || status === 'submitting') {
      return [
        { label: i18n('meals.detectFood'),       status: 'active' },
        { label: i18n('meals.estimatePortions'), status: 'pending' },
        { label: i18n('meals.lookUpNutrition'),  status: 'pending' },
        { label: i18n('meals.matchGoals'),       status: 'pending' },
      ];
    }
    if (status === 'pending') {
      return [
        { label: i18n('meals.detectFood'),       status: 'active' },
        { label: i18n('meals.estimatePortions'), status: 'pending' },
        { label: i18n('meals.lookUpNutrition'),  status: 'pending' },
        { label: i18n('meals.matchGoals'),       status: 'pending' },
      ];
    }
    return [
      { label: i18n('meals.detectFood'),       status: 'done' },
      { label: i18n('meals.estimatePortions'), status: 'done' },
      { label: i18n('meals.lookUpNutrition'),  status: failed ? 'pending' : 'active' },
      { label: i18n('meals.matchGoals'),       status: 'pending' },
    ];
  }, [done, failed, i18n, status]);

  useEffect(() => {
    scanLine.value = withRepeat(withTiming(1, { duration: 1600 }), -1, true);
    return () => cancelAnimation(scanLine);
  }, [scanLine]);

  useEffect(() => {
    let cancelled = false;

    async function loadQueuedPhoto() {
      if (!queuedMealPhotoId) return;
      try {
        const queued = await getQueuedMealScanPhoto(queuedMealPhotoId);
        if (cancelled) return;
        if (!queued) {
          setStatus('error');
          setError(i18n('meals.photoAnalysisQueuedNotFound'));
          return;
        }
        setQueuedMealPhoto(queued);
        setStatus('queued');
        setError(i18n('meals.photoAnalysisQueued'));
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Could not load queued photo.');
        }
      }
    }

    void loadQueuedPhoto();
    return () => {
      cancelled = true;
    };
  }, [i18n, queuedMealPhotoId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    function hasConnectivity(state: NetState | null | undefined) {
      return state?.isConnected === true && state?.isInternetReachable !== false;
    }

    async function submitQueuedPhoto(onlineState?: NetState | null) {
      if (!queuedMealPhoto || isSubmittingRef.current || cancelled) return;
      isSubmittingRef.current = true;
      try {
        const network = onlineState ?? (await NetInfo.fetch());
        if (!hasConnectivity(network)) {
          setStatus('queued');
          setError(i18n('meals.photoAnalysisQueued'));
          return;
        }

        setStatus('submitting');
        const analysis = await mealService.analyzePhoto({
          name: queuedMealPhoto.name,
          image: {
            uri: queuedMealPhoto.uri,
            name: queuedMealPhoto.fileName,
            type: queuedMealPhoto.mimeType,
          },
        });
        await removeQueuedMealScanPhoto(queuedMealPhoto.id);
        const resolvedMealId = analysis.meal_id;
        if (!resolvedMealId) {
          setStatus('error');
          setError('Analysis finished, but the backend did not return a meal id.');
          return;
        }
        const nextParams = new URLSearchParams({ mealId: resolvedMealId });
        if (analysis.job_id) {
          nextParams.set('jobId', analysis.job_id);
        }
        if (imageUri) nextParams.set('imageUri', imageUri);
        setQueuedMealPhoto(null);
        router.replace(`/meals/scan-results?${nextParams.toString()}` as never);
      } catch (err) {
        await incrementQueuedMealScanPhotoAttempts(queuedMealPhoto.id).catch(() => undefined);
        if (isTransientMealScanUploadError(err)) {
          setStatus('queued');
          setError(i18n('meals.photoAnalysisQueued'));
        } else {
          await removeQueuedMealScanPhoto(queuedMealPhoto.id).catch(() => undefined);
          setStatus('error');
          setError(err instanceof Error ? err.message : i18n('meals.uploadFailed'));
        }
      } finally {
        isSubmittingRef.current = false;
      }
    }

    async function poll(attempt = 0) {
      if (!mealId && !jobId) {
        setStatus('error');
        setError('Missing meal analysis job.');
        return;
      }
      try {
        const result = jobId
          ? await mealService.analysisStatusByJob(jobId)
          : await mealService.analysisStatus(mealId ?? '');
        if (cancelled) return;
        const nextStatus = result.status.toLowerCase();
        if (DONE_STATUSES.includes(nextStatus)) {
          const resolvedMealId = result.meal_id ?? mealId;
          if (resolvedMealId) {
            const nextParams = new URLSearchParams({ mealId: resolvedMealId });
            if (imageUri) nextParams.set('imageUri', imageUri);
            router.replace(`/meals/scan-results?${nextParams.toString()}` as never);
          } else {
            setStatus('error');
            setError('Analysis finished, but the backend did not return a meal id.');
          }
          return;
        }
        setStatus(nextStatus);
        const terminalError = getMealScanPollingError(result, attempt);
        if (terminalError) {
          if (!FAILED_STATUSES.includes(nextStatus)) setStatus('error');
          setError(terminalError);
          return;
        }
        timer = setTimeout(() => { void poll(attempt + 1); }, MEAL_SCAN_POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        if (isTransientMealScanUploadError(err)) {
          setStatus('error');
          setError(err instanceof Error ? err.message : i18n('meals.uploadFailed'));
          return;
        }
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Could not check analysis status.');
      }
    }

    if (queuedMealPhotoId) {
      if (!queuedMealPhoto) {
        return () => {
          cancelled = true;
          if (timer) clearTimeout(timer);
        };
      }
      void submitQueuedPhoto();
      const unsubscribe = NetInfo.addEventListener((state) => {
        if (!state?.isConnected || state.isInternetReachable === false) return;
        void submitQueuedPhoto(state as NetState);
      });

      return () => {
        cancelled = true;
        unsubscribe();
        if (timer) clearTimeout(timer);
      };
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [imageUri, jobId, mealId, queuedMealPhoto, queuedMealPhotoId, i18n, router]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLine.value * 220 }],
  }));

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar style="light" />

      <View style={styles.photoArea}>
        <View style={styles.photoFrame}>
          {imageUri ? (
            <Image
              testID="meal-scan-analyzing-photo"
              source={{ uri: imageUri }}
              style={styles.photoImage}
              resizeMode="cover"
            />
          ) : (
            <View testID="meal-scan-analyzing-photo-fallback" style={styles.photoFallback}>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.72)', textAlign: 'center' }]}>
                {i18n('meals.photoPreviewUnavailable')}
              </Text>
            </View>
          )}
          <View style={styles.photoScrim} />
        </View>
        <Animated.View style={[styles.scanLine, scanLineStyle]} />
      </View>

      <View style={[styles.sheet, { backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.08)' }]}>
          <View style={[styles.sheetHandle, { backgroundColor: 'rgba(0,0,0,0.12)' }]} />
          <View style={styles.sheetHeader}>
          <View style={styles.headerIconSq}>
            <IconSparkle size={20} color="#fff" />
          </View>
          <Text style={[typography.h3, { color: '#111', marginLeft: 10 }]}>{i18n('meals.analyzingPlate')}</Text>
        </View>
        <Text style={[typography.caption, { color: failed ? t.danger : t.ink3, marginBottom: 10 }]}>
          {statusLabel}
        </Text>
        <View style={styles.stages}>
          {STAGES.map((s) => <StageRow key={s.label} {...s} />)}
        </View>
        <Pressable
          onPress={() => {
            const fallbackRoute = getMealScanCancelRoute(router.canGoBack());
            if (fallbackRoute) {
              router.replace(fallbackRoute as never);
            } else {
              router.back();
            }
          }}
          style={[styles.cancelBtn, { borderColor: 'rgba(0,0,0,0.15)' }]}
        >
          <Text style={[typography.button, { color: '#111' }]}>{i18n('common.cancel')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1 },
  photoArea:      { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoFrame:     { width: 288, height: 220, borderRadius: 20, overflow: 'hidden', backgroundColor: '#111827' },
  photoImage:     { width: '100%', height: '100%' },
  photoFallback:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  photoScrim:     { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(11,15,20,0.24)' },
  scanLine:       { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: 'rgba(34,211,238,0.8)' },
  sheet:          { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 24, paddingBottom: 40 },
  sheetHandle:    { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  // Blue icon square (40x40)
  headerIconSq:   { width: 40, height: 40, borderRadius: 12, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  stages:         { gap: 0, marginBottom: 28 },
  stageRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  stageIcon:      { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  // Full-width outline cancel
  cancelBtn:      { alignItems: 'center', paddingVertical: 14, borderRadius: 100, borderWidth: 1 },
});
