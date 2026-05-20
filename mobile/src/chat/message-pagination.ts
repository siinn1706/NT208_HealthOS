import type { Message } from '../../../shared/api-contracts';

export function mergeMessagesChronologically(current: Message[], incoming: Message[]) {
  const byId = new Map<string, Message>();
  current.forEach((message) => {
    byId.set(message.id, message);
  });
  incoming.forEach((message) => {
    byId.set(message.id, message);
  });
  return Array.from(byId.values()).sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  );
}
