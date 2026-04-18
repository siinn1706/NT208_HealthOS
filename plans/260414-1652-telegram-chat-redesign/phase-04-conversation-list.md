# Phase 4: Conversation List Polish

## Context Links
- [plan.md](./plan.md)
- Current: `frontend/src/components/dashboard/chat/ConversationList.tsx` (208 lines)
- Current: `frontend/src/components/dashboard/chat/ConversationItem.tsx` (169 lines)

## Overview
- **Priority:** P3 — secondary polish, reduce or defer if MVP gets heavy
- **Status:** Pending
- **Description:** Polish conversation sidebar to match Telegram's list density, preview formatting, and visual indicators

## Key Insights — Telegram Conversation List Patterns

### Item Layout
- Avatar (48px) | Name + time row | Preview + badges row
- Name is `font-semibold` when unread, `font-medium` when read
- Time is right-aligned, same row as name, `text-xs text-muted`
- Preview shows "You: " prefix for own messages, sender name prefix in groups
- Telegram uses 2-line preview max, truncated with ellipsis

### Unread Badge
- Circular badge, right-aligned below time
- Muted conversations: gray badge instead of primary
- Count: shows exact number up to 99, then "99+"

### Active/Selected State
- Telegram uses a subtle left border accent (3px primary) on the active item
- Background: very subtle primary tint
- Current app uses `bg-primary/10` — close but no left accent bar

### Typing Indicator in List
- When someone is typing in a conversation, preview text changes to "typing…" with animated dots
- This is a nice Telegram touch currently missing

### Delivery Status in Preview
- Outgoing messages show checkmarks in the preview line (sent/delivered/read)
- "✓ Your message here" or "✓✓ Your message here"

## Requirements

### Functional
- [ ] Add left accent bar on active conversation item
- [ ] Show delivery status in preview for own messages
- [ ] Muted conversations: gray unread badge instead of primary
- [ ] Typing indicator text in conversation preview
- [ ] 2-line preview with proper truncation

### Non-Functional
- [ ] List scrolls smoothly with 100+ conversations
- [ ] No layout shift on active state change

## Related Code Files

### Files to Modify
- `frontend/src/components/dashboard/chat/ConversationItem.tsx` — add left accent, delivery status, muted badge color
- `frontend/src/components/dashboard/chat/ConversationList.tsx` — pass typing state per conversation

## Implementation Steps

### Step 1: Active conversation left accent
Add a 3px left border to active item:
```tsx
className={cn(
  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
  isActive
    ? "bg-primary/8 border-l-3 border-l-primary"
    : "hover:bg-secondary"
)}
```

### Step 2: Delivery status in preview
In `getMessagePreview`, prepend checkmark for own outgoing messages:
- sent: `"✓ "`, delivered: `"✓✓ "`, read: `"✓✓ "` (with primary color for read)
- Or use a small icon component inline

### Step 3: Muted badge color
Change unread badge for muted conversations:
```tsx
<span className={cn(
  "min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full flex items-center justify-center",
  conversation.is_muted
    ? "bg-muted-foreground/30 text-muted-foreground"
    : "bg-primary text-primary-foreground"
)}>
```

### Step 4: Typing indicator in list (stretch goal)
If WebSocket provides per-conversation typing state, show "typing…" instead of preview.
This requires threading typing state from ChatWindow/useChatWs back to ConversationList.
**Decision:** Skip for now — would require significant state refactor. Add as TODO comment.

### Step 5: Preview truncation improvement
Ensure preview uses `line-clamp-1` (already truncated via `truncate`). Verify Vietnamese text doesn't break layout.

## Todo List
- [x] Add left accent bar on active ConversationItem
- [x] Show delivery status icon in preview line
- [x] Muted conversations use gray unread badge
- [x] Verify preview truncation with long Vietnamese text
- [x] Add TODO comment for typing-in-list feature

## Success Criteria
- Active conversation clearly highlighted with left accent bar
- Own message previews show delivery status
- Muted conversations visually muted (gray badge)
- No layout issues with long conversation names

## Risk Assessment
- **Low:** Left border + border-radius may look odd → test with `rounded-l-none` on active state or use pseudo-element instead
- **Low:** Delivery status icons in preview add visual noise → keep subtle (text-muted-foreground opacity)

## Security Considerations
- No new data exposure
