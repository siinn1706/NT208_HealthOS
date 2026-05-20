/* eslint-env jest */
import { mergeMessagesChronologically } from '../chat/message-pagination';
import type { Message } from '../../../shared/api-contracts';

function makeMessage(id: string, createdAt: string, content = id): Message {
  return {
    id,
    conversation_id: 'conv-1',
    sender_id: 'user-1',
    sender_display_name: 'User',
    sender_avatar_url: null,
    sender_kind: 'user',
    client_message_id: null,
    content,
    content_type: 'text',
    attachments: null,
    reply_to_id: null,
    is_recalled: false,
    reactions: [],
    is_pinned: false,
    created_at: createdAt,
    edited_at: null,
  };
}

describe('mergeMessagesChronologically', () => {
  it('merges older page data without dropping existing messages and dedupes overlaps', () => {
    const latestPage = [
      makeMessage('m3', '2026-05-20T12:03:00.000Z', 'current-3'),
      makeMessage('m4', '2026-05-20T12:04:00.000Z', 'current-4'),
    ];
    const olderPage = [
      makeMessage('m1', '2026-05-20T12:01:00.000Z', 'older-1'),
      makeMessage('m2', '2026-05-20T12:02:00.000Z', 'older-2'),
      makeMessage('m3', '2026-05-20T12:03:00.000Z', 'older-3-overlap'),
    ];

    const merged = mergeMessagesChronologically(olderPage, latestPage);

    expect(merged.map((message) => message.id)).toEqual(['m1', 'm2', 'm3', 'm4']);
    expect(merged.find((message) => message.id === 'm3')?.content).toBe('current-3');
  });
});
