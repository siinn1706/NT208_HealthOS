# Phase 3: Composer Redesign

## Context Links
- [plan.md](./plan.md) | [phase-02](./phase-02-reply-interaction.md)
- Current: `frontend/src/components/dashboard/chat/MessageInput.tsx` (216 lines)
- Current: `frontend/src/components/dashboard/chat/MessageReplyPreview.tsx` (49 lines)

## Overview
- **Priority:** P2
- **Status:** Pending
- **Description:** Polish the composer/input area with Telegram-inspired layout, smoother reply/edit bars, better button placement, and send-button state transitions

## Key Insights — Telegram Composer Patterns

### Layout
- Telegram desktop: `[attachment] [textarea] [emoji] [send/mic]`
- Current app: `[attachment] [textarea] [emoji] [send]` — already close!
- Key difference: Telegram's send button transitions between states (mic → send when text present)
- Textarea has no visible border until focused — just rounded background
- Auto-grows up to ~6 lines, then scrolls internally

### Reply/Edit Bar
- Slides down from top of composer area with smooth animation
- Colored left border (2px primary)
- Close button clearly visible
- Edit mode: shows pencil icon + "Editing" label, textarea prefilled
- Reply mode: shows reply icon + "Reply to [name]" + content preview

### Send Button
- Transforms from mic/attachment icon to send icon when text is entered
- Smooth scale/rotate animation on transition
- Disabled state when empty: reduced opacity
- Active send: brief scale-down animation (pressed feeling)

### Attachment Area
- Telegram shows attachment menu from bottom on mobile (action sheet style)
- Desktop: popover menu with icon grid
- Current implementation uses popover — keep but polish icons

## Requirements

### Functional
- [ ] Reply bar with slide animation (enter/exit)
- [ ] Edit bar with pencil icon and distinct styling
- [ ] Send button state: disabled when empty, animated on send
- [ ] Textarea auto-resize up to 6 lines (~144px), then internal scroll
- [ ] Focus textarea on reply/edit activation

### Non-Functional
- [ ] Animation durations ≤ 200ms (snappy, not sluggish)
- [ ] No layout shifts when reply/edit bar appears
- [ ] Keyboard submit (Enter) still works

## Architecture

### Composer Layout (New)
```
┌──────────────────────────────────────────────┐
│ ┌─Reply/Edit Bar─────────────────────────┐ X │ ← slides in/out
│ │ ↩ Replying to Sender Name              │   │
│ │   "Preview of original message..."     │   │
│ └────────────────────────────────────────┘   │
├──────────────────────────────────────────────┤
│ [📎] │ Type a message...              │ [😊] [➤] │
│      │                                │          │
└──────────────────────────────────────────────┘
```

## Related Code Files

### Files to Modify
- `frontend/src/components/dashboard/chat/MessageInput.tsx` — restructure layout, add animations
- `frontend/src/components/dashboard/chat/MessageReplyPreview.tsx` — add animation wrapper, icon variants
- `frontend/src/app/globals.css` — add composer transition keyframes (if needed)

## Implementation Steps

### Step 1: Add reply/edit bar animation
Wrap the reply/edit indicator in a height-animating container:
```tsx
<AnimatePresence>
  {(replyTo || editingMessage) && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {/* ReplyPreview or EditBar */}
    </motion.div>
  )}
</AnimatePresence>
```
framer-motion is already a dependency (used in ChatLayout.tsx).

### Step 2: Differentiate reply vs edit bars visually
- Reply: reply icon (↩) + "Replying to [name]" + blue left border
- Edit: pencil icon (✏️) + "Editing message" + amber left border
- Both: truncated content preview, X button to cancel

### Step 3: Send button improvements
- When `value.trim()` is empty → send button has `opacity-40`, `pointer-events-none`
- On send → brief `scale(0.9)` then `scale(1)` animation (CSS transition)
- Edit mode → amber-colored send button (already implemented, keep it)

### Step 4: Textarea polish
- Remove explicit border: `border-transparent` → `border-0`
- Background: `bg-muted` when unfocused, `bg-background` when focused (smooth transition)
- Max height cap at 144px (6 lines * ~24px line height) — currently 120px, increase slightly
- Placeholder text slightly lighter

### Step 5: Auto-focus on reply/edit
Use `useEffect` to focus textarea when `replyTo` or `editingMessage` changes:
```tsx
useEffect(() => {
  if (replyTo || editingMessage) {
    textareaRef.current?.focus();
  }
}, [replyTo, editingMessage]);
```

## Todo List
- [x] Add AnimatePresence wrapper for reply/edit bars
- [x] Create distinct edit bar styling (amber accent, pencil icon)
- [x] Polish send button with disabled state + press animation
- [x] Increase textarea max-height to 144px
- [x] Remove textarea border, use bg transition for focus state
- [x] Auto-focus textarea on reply/edit activation
- [x] Test Enter-to-send still works with AnimatePresence
- [x] Verify emoji picker still opens correctly

## Success Criteria
- Reply/edit bar slides in/out smoothly (no jump/flash)
- Edit mode visually distinct from reply mode
- Send button clearly disabled when empty
- Textarea auto-grows comfortably for multi-line input
- Focus moves to textarea when reply/edit is triggered

## Risk Assessment
- **Low:** AnimatePresence height animation can flicker if content is dynamic → use `layout` prop
- **Low:** Auto-focus may conflict with emoji picker state → only focus when picker is closed

## Security Considerations
- No new data flows — purely visual changes
