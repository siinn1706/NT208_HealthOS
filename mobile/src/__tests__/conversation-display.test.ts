/* eslint-env jest */
import { getConversationDisplay } from '../chat/conversation-display';

const makeParticipant = (overrides = {}) => ({
  id: 'u1',
  display_name: 'Alice',
  role: 'doctor',
  is_online: true,
  ...overrides,
});

describe('getConversationDisplay', () => {
  it('returns fallback display when conversation is null', () => {
    const result = getConversationDisplay(null, 'u1');
    expect(result.title).toBe('Conversation');
    expect(result.subtitle).toBe('Loading conversation');
    expect(result.isAi).toBe(false);
    expect(result.isOnline).toBe(false);
  });

  it('returns fallback display when conversation is undefined', () => {
    const result = getConversationDisplay(undefined, 'u1');
    expect(result.title).toBe('Conversation');
  });

  it('uses conversation title when present', () => {
    const conversation = {
      type: 'direct',
      title: 'Support Thread',
      participants: [makeParticipant()],
    } as any;
    const result = getConversationDisplay(conversation, 'u2');
    expect(result.title).toBe('Support Thread');
  });

  it('uses peer display_name when no title', () => {
    const conversation = {
      type: 'direct',
      title: null,
      participants: [
        makeParticipant({ id: 'u1', display_name: 'Alice' }),
        makeParticipant({ id: 'u2', display_name: 'Bob' }),
      ],
    } as any;
    const result = getConversationDisplay(conversation, 'u2');
    expect(result.title).toBe('Alice');
  });

  it('uses HealthOS AI title for ai conversation with no title', () => {
    const conversation = {
      type: 'ai',
      title: null,
      participants: [],
    } as any;
    const result = getConversationDisplay(conversation, 'u1');
    expect(result.title).toBe('HealthOS AI');
    expect(result.isAi).toBe(true);
    expect(result.isOnline).toBe(true);
  });

  it('subtitle is Never medical advice for ai type', () => {
    const conversation = {
      type: 'ai',
      title: null,
      participants: [],
    } as any;
    const result = getConversationDisplay(conversation, 'u1');
    expect(result.subtitle).toBe('Never medical advice');
  });

  it('subtitle shows member count for group type', () => {
    const conversation = {
      type: 'group',
      title: null,
      participants: [makeParticipant(), makeParticipant({ id: 'u2' }), makeParticipant({ id: 'u3' })],
    } as any;
    const result = getConversationDisplay(conversation, 'u99');
    expect(result.subtitle).toContain('3 members');
  });

  it('subtitle is Direct chat when peer has no role', () => {
    const conversation = {
      type: 'direct',
      title: null,
      participants: [makeParticipant({ id: 'u1', role: null })],
    } as any;
    const result = getConversationDisplay(conversation, 'u2');
    expect(result.subtitle).toBe('Direct chat');
  });

  it('labelizes peer role for subtitle', () => {
    const conversation = {
      type: 'direct',
      title: null,
      participants: [makeParticipant({ id: 'u1', role: 'head_nurse' })],
    } as any;
    const result = getConversationDisplay(conversation, 'u2');
    expect(result.subtitle).toBe('Head Nurse');
  });

  it('peer is_online propagates to isOnline', () => {
    const conversation = {
      type: 'direct',
      title: null,
      participants: [makeParticipant({ id: 'u1', is_online: false })],
    } as any;
    const result = getConversationDisplay(conversation, 'u2');
    expect(result.isOnline).toBe(false);
  });
});
