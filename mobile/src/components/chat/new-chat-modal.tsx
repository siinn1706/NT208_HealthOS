import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { ApiState } from '../api/api-state';
import { NewChatUserRow } from './new-chat-user-row';
import { chatService } from '../../api/services';
import type { ChatUserLookupResult, Conversation } from '../../../../shared/api-contracts';

type Mode = 'direct' | 'group';

interface NewChatModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (conversation: Conversation) => void;
}

export function NewChatModal({ visible, onClose, onCreated }: NewChatModalProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [mode, setMode] = useState<Mode>('direct');
  const [query, setQuery] = useState('');
  const [groupTitle, setGroupTitle] = useState('');
  const [results, setResults] = useState<ChatUserLookupResult[]>([]);
  const [selected, setSelected] = useState<ChatUserLookupResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (visible) return;
    setMode('direct');
    setQuery('');
    setGroupTitle('');
    setResults([]);
    setSelected([]);
    setError(null);
    setSearching(false);
    setCreating(false);
  }, [visible]);
  const selectedIds = useMemo(() => new Set(selected.map((user) => user.id)), [selected]);
  async function searchUsers() {
    const text = query.trim();
    if (!text) {
      setResults([]);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      setResults(await chatService.lookupUsers(text));
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : i18n('chat.userSearchError'));
    } finally {
      setSearching(false);
    }
  }

  function toggleSelected(user: ChatUserLookupResult) {
    setSelected((prev) => (
      prev.some((item) => item.id === user.id)
        ? prev.filter((item) => item.id !== user.id)
        : [...prev, user]
    ));
  }

  async function startDirect(user: ChatUserLookupResult) {
    setCreating(true);
    setError(null);
    try {
      onCreated(await chatService.createDirectConversation(user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : i18n('chat.createConversationError'));
    } finally {
      setCreating(false);
    }
  }

  async function startGroup() {
    if (!groupTitle.trim() || selected.length === 0) return;
    setCreating(true);
    setError(null);
    try {
      onCreated(await chatService.createGroupConversation(groupTitle.trim(), selected.map((user) => user.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : i18n('chat.createConversationError'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
          <Text style={[typography.h3, { color: t.ink }]}>{i18n('chat.startNewConversation')}</Text>
          <View style={[styles.modeTabs, { backgroundColor: t.bgElev, borderRadius: t.radius.pill }]}>
            {(['direct', 'group'] as Mode[]).map((tab) => {
              const active = mode === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setMode(tab)}
                  style={[styles.modeTab, { backgroundColor: active ? t.brand : 'transparent', borderRadius: t.radius.pill }]}
                >
                  <Text style={[typography.bodyMed, { color: active ? '#FFF' : t.ink3 }]}>
                    {tab === 'direct' ? i18n('chat.directChat') : i18n('chat.groupChat')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {mode === 'group' && (
            <TextInput
              value={groupTitle}
              onChangeText={setGroupTitle}
              placeholder={i18n('chat.groupTitlePlaceholder')}
              placeholderTextColor={t.ink4}
              style={[styles.input, { color: t.ink, backgroundColor: t.bgElev, borderColor: t.border, borderRadius: t.radius.md }]}
            />
          )}

          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={searchUsers}
              placeholder={i18n('chat.userSearchPlaceholder')}
              placeholderTextColor={t.ink4}
              style={[styles.searchInput, { color: t.ink, backgroundColor: t.bgElev, borderColor: t.border, borderRadius: t.radius.md }]}
            />
            <Button label={searching ? i18n('common.working') : i18n('common.search')} variant="soft" onPress={searchUsers} />
          </View>

          {selected.length > 0 && (
            <View style={styles.selectedRow}>
              {selected.map((user) => (
                <Pressable key={user.id} onPress={() => toggleSelected(user)} style={[styles.chip, { backgroundColor: t.brandSoft, borderRadius: t.radius.pill }]}>
                  <Text style={[typography.caption, { color: t.brand }]}>{user.display_name}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {error && <ApiState title={i18n('chat.createConversationUnavailable')} message={error} />}
          {results.length === 0 && query.trim() && !searching && !error && (
            <Text style={[typography.caption, { color: t.ink3 }]}>{i18n('chat.noUsersFound')}</Text>
          )}

          <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
            {results.map((user) => {
              const picked = selectedIds.has(user.id);
              return (
                <NewChatUserRow
                  key={user.id}
                  user={user}
                  disabled={creating}
                  trailingLabel={mode === 'group' ? (picked ? i18n('common.selected') : i18n('common.add')) : null}
                  trailingActive={picked}
                  onPress={() => (mode === 'direct' ? startDirect(user) : toggleSelected(user))}
                />
              );
            })}
          </ScrollView>

          <View style={styles.actions}>
            <Button label={i18n('common.close')} variant="ghost" onPress={onClose} style={styles.actionBtn} />
            {mode === 'group' && (
              <Button
                label={creating ? i18n('common.working') : i18n('chat.createGroup')}
                variant="solid"
                onPress={startGroup}
                disabled={!groupTitle.trim() || selected.length === 0 || creating}
                style={styles.actionBtn}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet:       { width: '100%', maxHeight: '86%', padding: 18, gap: 12 },
  modeTabs:    { flexDirection: 'row', padding: 3 },
  modeTab:     { flex: 1, alignItems: 'center', paddingVertical: 9 },
  input:       { paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, fontSize: 14, lineHeight: 20 },
  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, fontSize: 14, lineHeight: 20 },
  selectedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:        { paddingHorizontal: 10, paddingVertical: 5 },
  results:     { maxHeight: 280 },
  actions:     { flexDirection: 'row', gap: 10 },
  actionBtn:   { flex: 1 },
});
