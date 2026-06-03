import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { ApiState } from '../api/api-state';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { visitBriefService } from '../../api/services';
import type { VisitBriefDetail } from '../../types/api';
import { useTranslation } from 'react-i18next';
import { bucketLabel, canFinalizeBrief, normalizeVisitType, templateToQuestion } from './visit-brief-prep-state';

interface Props {
  appointmentId: string;
  appointmentLabel?: string | null;
  appointmentVisitType?: string | null;
}

export function VisitBriefPrepCard({ appointmentId, appointmentLabel, appointmentVisitType }: Props) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [briefOverride, setBriefOverride] = useState<VisitBriefDetail | null>(null);
  const [concernText, setConcernText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const queryKey = queryKeys.visitBriefForAppointment(appointmentId);
  const loadBrief = useCallback(() => visitBriefService.findAttachedToAppointment(appointmentId), [appointmentId]);
  const briefQuery = useApiQuery<VisitBriefDetail | null>(queryKey, loadBrief, { enabled: Boolean(appointmentId) });
  const brief = briefOverride ?? briefQuery.data;
  const isDraft = brief?.status === 'draft';
  const canFinalize = canFinalizeBrief(brief);

  useEffect(() => {
    setBriefOverride(null);
    setConcernText('');
    setBusy(null);
    setMessage(null);
    setError(null);
  }, [appointmentId]);

  const stats = useMemo(() => ({
    symptoms: brief?.symptoms.length ?? 0,
    questions: brief?.question_set?.questions.length ?? 0,
    route: bucketLabel(brief?.latest_triage?.bucket),
  }), [brief]);

  function applyBrief(next: VisitBriefDetail, nextMessage: string) {
    setBriefOverride(next);
    setMessage(nextMessage);
    setError(null);
    invalidateApiQuery(queryKey);
  }

  async function runAction(name: string, action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(name);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Visit brief action failed.');
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }

  function createBrief() {
    return runAction('create', async () => {
      const existing = await visitBriefService.findAttachedToAppointment(appointmentId);
      if (existing) {
        applyBrief(existing, 'Clinical brief already exists.');
        return;
      }
      const created = await visitBriefService.create({
        visit_type: normalizeVisitType(appointmentVisitType),
        title: appointmentLabel ? `Visit prep: ${appointmentLabel}` : 'Visit prep',
        attach_to_appointment_id: appointmentId,
      });
      applyBrief(created, 'Clinical brief created.');
    });
  }

  function addConcern() {
    return runAction('concern', async () => {
      if (!brief) return;
      const concern = concernText.trim();
      if (!concern) {
        setError('Enter the main concern first.');
        return;
      }
      await visitBriefService.addSymptom(brief.id, { concern_text: concern, concern_category: 'other' });
      const fresh = await visitBriefService.get(brief.id);
      setConcernText('');
      applyBrief(fresh, 'Concern saved.');
    });
  }

  function addSuggestedQuestions() {
    return runAction('questions', async () => {
      if (!brief) return;
      const templates = await visitBriefService.suggestedQuestions(brief.id, { visitType: brief.visit_type });
      const questions = templates.slice(0, 10).map(templateToQuestion);
      if (questions.length === 0) {
        setMessage('No suggested questions found.');
        return;
      }
      const questionSet = await visitBriefService.replaceQuestions(brief.id, questions);
      applyBrief({ ...brief, question_set: questionSet }, 'Suggested questions saved.');
    });
  }

  function routeNow() {
    return runAction('route', async () => {
      if (!brief) return;
      const latest = await visitBriefService.routeNow(brief.id);
      applyBrief({ ...brief, latest_triage: latest }, 'Routing updated.');
    });
  }

  function finalizeBrief() {
    return runAction('finalize', async () => {
      if (!brief) return;
      const finalized = await visitBriefService.finalize(brief.id);
      applyBrief(finalized, 'Clinical brief finalized.');
    });
  }

  return (
    <View style={[s.card, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg }]}>
      <Text style={[typography.h3, { color: t.ink }]}>Clinical visit brief</Text>
      {briefQuery.isLoading && !brief && <ApiState title="Loading clinical brief" loading />}
      {briefQuery.error && !brief && (
        <ApiState
          title="Clinical brief unavailable"
          message={briefQuery.error.message}
          actionLabel="Retry"
          onAction={briefQuery.reload}
        />
      )}

      {!brief && !briefQuery.isLoading ? (
        <>
          <Text style={[typography.body, { color: t.ink3 }]}>Prepare concerns, questions, routing, and final handoff for this appointment.</Text>
          <Button label={i18n('care.createBrief')} onPress={createBrief} loading={busy === 'create'} disabled={!appointmentId || Boolean(busy)} />
        </>
      ) : null}

      {brief ? (
        <>
          <View style={s.stats}>
            <Text style={[typography.caption, { color: t.ink3 }]}>Status: {brief.status} · Rev {brief.revision}</Text>
            <Text style={[typography.caption, { color: t.ink3 }]}>Concerns: {stats.symptoms} · Questions: {stats.questions}</Text>
            <Text style={[typography.caption, { color: t.ink3 }]}>Route: {stats.route}</Text>
          </View>

          {isDraft && (
            <View style={s.concernBox}>
              <TextInput
                value={concernText}
                onChangeText={setConcernText}
                placeholder="Main concern"
                placeholderTextColor={t.ink3}
                style={[s.input, { borderColor: t.border, color: t.ink, borderRadius: t.radius.md }]}
                editable={!busy}
              />
              <Button label={i18n('care.addConcern')} variant="soft" onPress={addConcern} loading={busy === 'concern'} disabled={Boolean(busy)} />
            </View>
          )}

          <View style={s.actions}>
            <Button label={i18n('care.questions')} variant="ghost" size="sm" onPress={addSuggestedQuestions} loading={busy === 'questions'} disabled={!isDraft || Boolean(busy)} accessibilityLabel="Add suggested questions" />
            <Button label={i18n('care.routeNow')} variant="ghost" size="sm" onPress={routeNow} loading={busy === 'route'} disabled={Boolean(busy)} />
            <Button label={i18n('care.finalize')} variant="solid" size="sm" onPress={finalizeBrief} loading={busy === 'finalize'} disabled={!isDraft || !canFinalize || Boolean(busy)} />
          </View>
          {isDraft && !canFinalize && (
            <Text style={[typography.caption, { color: t.ink3 }]}>Add one concern and one question before finalizing.</Text>
          )}
        </>
      ) : null}

      {message && <ApiState title={message} />}
      {error && <ApiState title="Visit brief action failed" message={error} />}
    </View>
  );
}

const s = StyleSheet.create({
  card:       { borderWidth: 1, padding: 16, gap: 12 },
  stats:      { gap: 4 },
  concernBox: { gap: 8 },
  input:      { minHeight: 44, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  actions:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
