# Phase 1: Message Bubble Redesign

## Context Links
- [plan.md](./plan.md)
- Current: `frontend/src/components/dashboard/chat/MessageBubble.tsx` (222 lines)
- Current: `frontend/src/components/dashboard/chat/MessageList.tsx` (158 lines)
- Types: `frontend/src/types/api.ts` (Message interface, line 401)
- Utils: `frontend/src/lib/chat-utils.ts` (shouldGroup, formatDateSeparator)

## Overview
- **Priority:** P1 — this is the visual foundation everything else builds on
- **Status:** Pending
- **Description:** Redesign message bubbles with Telegram-inspired grouping, tail corners, reply preview inside bubble, floating date pills. Timestamp stays below bubble (user preference).

## Key Insights — What Telegram Does Well

### Bubble Shape & Corners
- **Outgoing:** `bg-primary`, right-aligned, rounded corners with **bottom-right tail** (small pointed corner)
- **Incoming:** `bg-secondary`, left-aligned, rounded corners with **bottom-left tail** (small pointed corner)
- Telegram uses ~18px border-radius with the tail corner at ~4px
- Consecutive messages from same sender: tail only on LAST message in group, full rounding on others

### Timestamp Below Bubble (User Decision)
- User prefers keeping timestamp **below the bubble** (current behavior)
- Keep the existing meta row: `time + edited badge + status checkmarks`
- No inline timestamp tricks — avoids fragile layout issues with short/image messages
- This is simpler to implement and maintain

### Message Grouping
- Consecutive messages from same sender within ~60s → grouped (no avatar, tighter spacing)
- Only last message in group shows the avatar + tail
- `py-0.5` between grouped messages, `py-2` between different senders

### Reply Preview Inside Bubble
- Reply block sits INSIDE the bubble, above the message text
- Has a colored left border (2px, sender's color or primary)
- Shows sender name + truncated content (1 line)
- The entire reply block is clickable (jumps to original)
- Background slightly different from bubble (`bg-primary/10` inside outgoing, `bg-background/20` inside incoming)

### Date Separators
- Centered floating pill: `rounded-full bg-background/80 backdrop-blur px-3 py-1`
- Uses relative dates: "Today", "Yesterday", then full date
- **NO sticky positioning** in first pass — simple centered pill only. Sticky can come later if easy with Virtuoso.

## Requirements

### Functional
- [ ] Timestamp stays below bubble (keep current position, just tighten styling)
- [ ] Read status checkmarks stay in meta row below bubble
- [ ] Reply preview renders inside bubble with colored left border
- [ ] Consecutive message grouping with tail only on last message
- [ ] Date separator as floating pill (no sticky)
- [ ] Clicking reply preview jumps to original message

### Non-Functional
- [ ] No layout shifts during message load
- [ ] Virtuoso performance maintained (memo + stable callbacks)
- [ ] Dark mode contrast ratios maintained

## Architecture

### Bubble Layout Structure (New)
```
┌─────────────────────────────────────┐
│ ┌─Reply Preview─────────────────┐   │ ← inside bubble, optional
│ │ ▎ Sender Name                 │   │
│ │ ▎ Truncated original text...  │   │
│ └───────────────────────────────┘   │
│                                     │
│ Message content text here that      │
│ wraps naturally across lines        │
└─────────────────────────────────────┘
                      12:34 ✓✓          ← meta row stays below
```

### Reply Data Model Verification
Before coding, confirm `Message.reply_to` has enough data:
```ts
reply_to?: Pick<Message, "id" | "content" | "sender_id" | "type" | "sender_display_name">;
```
✅ Already has: id (for jump), content (preview text), sender_id + sender_display_name (sender label), type (for image/file fallback)
⚠️ Missing: `is_recalled` on reply_to — need frontend fallback: if content is empty string, treat as recalled/deleted.
**Fallback rule:** `reply_to.content === "" → show italic "Deleted message"` in the reply preview block.

### Corner Radius Logic
```
First in group:  rounded-t-2xl rounded-bl-2xl rounded-br-sm (outgoing)
Middle in group: rounded-l-2xl rounded-r-sm (outgoing)
Last in group:   rounded-b-2xl rounded-tl-2xl rounded-tr-sm (outgoing)
Solo message:    rounded-2xl rounded-br-sm (outgoing)
```
Mirror for incoming (bl ↔ br, tl ↔ tr).

## Related Code Files

### Files to Modify
- `frontend/src/components/dashboard/chat/MessageBubble.tsx` — complete bubble layout restructure
- `frontend/src/components/dashboard/chat/MessageList.tsx` — pass grouping position info (first/middle/last/solo)
- `frontend/src/lib/chat-utils.ts` — add `getGroupPosition()` helper, update `formatDateSeparator()` for relative dates

### Files Unchanged
- `frontend/src/types/api.ts` — Message type already has all needed fields
- `frontend/src/hooks/useChat.ts` — no data model changes needed

## Implementation Steps

### Step 1: Add grouping position utility (chat-utils.ts)
Add `getGroupPosition(prev, current, next)` returning `'solo' | 'first' | 'middle' | 'last'`.
Rules: same sender + within 60s = grouped. Also export corner radius helper.

### Step 2: Update MessageList to pass position
In `itemContent` callback, compute `groupPosition` for each message using prev/next neighbors.
Pass as new prop to `MessageBubble`.

### Step 3: Restructure MessageBubble layout
Major changes:
1. Move timestamp + status INSIDE the bubble `<div>`, as an inline-flex at bottom-right
2. Move reply preview INSIDE the bubble, with colored left border
3. Apply dynamic corner radius based on `groupPosition`
4. Adjust spacing: `py-0.5` for grouped, `py-1.5` for ungrouped
5. Tail (small corner) only on `last` or `solo` position

### Step 4: Restyle date separators
Change from full-width divider with lines to centered floating pill.
Use relative dates: "Today"/"Yesterday"/full date.
No sticky positioning — just a simple centered pill:
```tsx
<div className="flex justify-center my-3">
  <span className="text-[11px] text-muted-foreground bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 shadow-sm">
    {dateSep}
  </span>
</div>
```

### Step 5: Tighten meta row styling
Keep timestamp below bubble but tighten spacing:
- Reduce `mt-0.5` to `mt-px` for a more integrated feel
- Make timestamp `text-[10px]` (already done) with `text-muted-foreground/70` for subtlety
- Keep the existing structure: `time + edited badge + status checkmarks`

## Todo List
- [x] Verify reply_to data model is sufficient (check empty content fallback)
- [x] Add `getGroupPosition()` to chat-utils.ts
- [x] Add corner radius helper to chat-utils.ts
- [x] Update `formatDateSeparator()` for relative dates (Today/Yesterday)
- [x] Update MessageList.tsx — compute + pass groupPosition
- [x] Restructure MessageBubble.tsx — reply preview inside bubble, dynamic corners
- [x] Restyle date separator as floating pill (no sticky)
- [x] Adjust spacing between grouped vs ungrouped messages
- [x] Tighten meta row styling below bubble
- [x] Verify dark mode contrast
- [x] Verify Virtuoso scroll performance

## Success Criteria
- Consecutive same-sender messages within 60s visually grouped with tail on last only
- Reply preview embedded inside bubble with colored left border
- Date separators are floating pills with relative dates
- Deleted/recalled reply targets show italic fallback
- Timestamp stays below bubble (no inline tricks)
- No performance regression

## Risk Assessment
- **Medium:** Inline timestamp with `float-right` can cause layout issues with very short messages → mitigate with `min-width` on bubble
- **Low:** Corner radius logic adds complexity → keep it in a pure utility function, unit-testable
- **Low:** Virtuoso re-render on groupPosition change → `memo` already in place, position is derived from index

## Security Considerations
- No new data exposure — all fields already present in Message type
- Reply preview content already sanitized (plain text, truncated)
