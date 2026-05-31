import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { Input } from '../primitives/input/input';
import type { ChatAttachmentInput } from '../../api/services/chat-service';

const MAX_ATTACHMENT_SIZE = 104_857_600;

interface AttachmentLinkModalProps {
  visible: boolean;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (attachment: ChatAttachmentInput, caption: string) => Promise<void> | void;
}

function parseSizeBytes(value: string) {
  if (!value.trim()) return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_ATTACHMENT_SIZE) return null;
  return parsed;
}

function validateHttpsUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function AttachmentLinkModal({
  visible,
  submitting,
  error,
  onClose,
  onSubmit,
}: AttachmentLinkModalProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [mimeType, setMimeType] = useState('application/pdf');
  const [caption, setCaption] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setValidationError(null);
      setUrl('');
      setName('');
      setSize('');
      setMimeType('application/pdf');
      setCaption('');
    }
  }, [visible]);

  async function handleSubmit() {
    const trimmedUrl = url.trim();
    const trimmedName = name.trim();
    const trimmedMime = mimeType.trim() || 'application/octet-stream';
    const parsedSize = parseSizeBytes(size);

    if (!validateHttpsUrl(trimmedUrl)) {
      setValidationError(i18n('chat.attachmentHttpsError'));
      return;
    }
    if (!trimmedName) {
      setValidationError(i18n('chat.attachmentNameRequired'));
      return;
    }
    if (parsedSize === null) {
      setValidationError(i18n('chat.attachmentSizeError'));
      return;
    }
    setValidationError(null);
    await onSubmit({
      url: trimmedUrl,
      name: trimmedName,
      size: parsedSize,
      mime_type: trimmedMime,
    }, caption.trim());
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
          <Text style={[typography.h3, { color: t.ink }]}>{i18n('chat.attachLink')}</Text>
          <Text style={[typography.caption, styles.copy, { color: t.ink3 }]}>
            {i18n('chat.attachLinkHelper')}
          </Text>
          <Input
            label={i18n('chat.attachmentUrl')}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://example.com/report.pdf"
            style={styles.field}
          />
          <Input
            label={i18n('chat.attachmentName')}
            value={name}
            onChangeText={setName}
            placeholder="Lab report.pdf"
            maxLength={255}
            style={styles.field}
          />
          <Input
            label={i18n('chat.attachmentMimeType')}
            value={mimeType}
            onChangeText={setMimeType}
            autoCapitalize="none"
            placeholder="application/pdf"
            maxLength={128}
            style={styles.field}
          />
          <Input
            label={i18n('chat.attachmentSizeBytes')}
            value={size}
            onChangeText={setSize}
            keyboardType="number-pad"
            placeholder="0"
            helper={i18n('chat.attachmentSizeHelper')}
            style={styles.field}
          />
          <Input
            label={i18n('chat.attachmentMessage')}
            value={caption}
            onChangeText={setCaption}
            placeholder={i18n('chat.attachmentMessagePlaceholder')}
            maxLength={1000}
            style={styles.field}
          />
          {(validationError || error) && (
            <Text style={[typography.caption, styles.error, { color: t.danger }]}>
              {validationError ?? error}
            </Text>
          )}
          <View style={styles.actions}>
            <Button label={i18n('common.cancel')} variant="ghost" onPress={onClose} disabled={submitting} style={styles.action} />
            <Button label={i18n('chat.send')} onPress={handleSubmit} loading={submitting} style={styles.action} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  sheet:   { padding: 20 },
  copy:    { marginTop: 4, marginBottom: 12 },
  field:   { marginTop: 10 },
  error:   { marginTop: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  action:  { flex: 1 },
});
