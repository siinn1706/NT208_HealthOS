# Phase 2: Reply Interaction Overhaul

## Context Links
- [plan.md](./plan.md) | [phase-01](./phase-01-message-bubble-redesign.md)
- Current: `frontend/src/components/dashboard/chat/MessageReplyPreview.tsx` (49 lines)
- Current: `frontend/src/components/dashboard/chat/ChatWindow.tsx` (363 lines)
- Current: `frontend/src/components/dashboard/chat/MessageList.tsx` (158 lines)

## Overview
- **Priority:** P1
- **Status:** Pending
- **Description:** Overhaul reply UX to match Telegram — swipe-to-reply gesture, scroll-to-original with highlight, improved reply preview inside composer

## Key Insights — Telegram Reply Patterns

### Triggering Reply
- **Desktop (core):** Hover → click reply icon in action bar. Implement first.
- **Mobile (stretch goal):** Swipe right on a message → reply mode activates. Only add if it doesn't conflict with browser back gesture. Not a hard requirement.
- Both methods set the reply target and focus the composer

### Reply Preview in Composer
- Thin bar above input with colored left border (2px)
- Shows: sender name (bold, primary color) + truncated content
- Close button (X) on the right
- Smooth slide-down animation when activated
- The current `MessageReplyPreview.tsx` already does this reasonably well

### Reply Block Inside Sent Message
- Renders INSIDE the bubble (handled in Phase 1)
- Clicking it scrolls to the original message + highlights it briefly
- If original is deleted/recalled: shows "Deleted message" in italic

### Scroll-to-Original Behavior
- Smooth scroll to the referenced message
- Brief highlight animation: golden/primary glow fade (1.5s)
- If message is above the viewport: scroll up, highlight, then user can scroll back
- If message is not loaded (paginated): show "Message not found" toast

## Requirements

### Functional
- [ ] Desktop reply button in action toolbar
- [ ] Click reply-preview inside bubble → scroll to original + highlight
- [ ] Highlight animation on jumped-to message (golden pulse, CSS-driven)
- [ ] Handle deleted/recalled original → show italic fallback text
- [ ] Swipe-to-reply on mobile (stretch goal only)

### Non-Functional
- [ ] Highlight animation uses CSS + `animationend` cleanup (no timer-heavy logic)
- [ ] Swipe gesture, if implemented, must not conflict with browser back
- [ ] Touch gesture has >10px threshold to avoid accidental triggers

## Architecture

### Desktop-First Reply Flow
```
Desktop flow:
1. Hover message
2. Click reply icon in action toolbar
3. Set reply target in ChatWindow state
4. Focus composer
5. Composer shows "Replying to…" state
```

### Mobile Swipe-to-Reply (Stretch Goal)
Only implement if low-risk after core MVP is done.
```
Touch flow:
1. touchstart → record startX, startY, messageId
2. touchmove → if deltaX > 10px AND deltaX > deltaY → begin swipe
3. Visual: translate message bubble right by deltaX (capped at 80px)
4. Show reply icon emerging from left edge
5. touchend → if deltaX >= 60px → trigger onReply(msg)
6. Animate bubble back to x=0
```

Use a custom hook `useSwipeToReply(ref, onReply)` only if implemented.

### Scroll-to-Message + Highlight
```
1. User clicks reply preview inside bubble
2. Call messageListRef.jumpToMessage(replyToId)
3. Virtuoso scrolls to index (already implemented)
4. Add CSS class `msg-highlight` to target element
5. CSS: `@keyframes highlight-pulse { 0% { background-color: ... } 100% { background-color: transparent } }`
6. Remove class on `animationend`
```

## Related Code Files

### Files to Modify
- `frontend/src/components/dashboard/chat/MessageBubble.tsx` — add click handler on reply preview, swipe gesture host
- `frontend/src/components/dashboard/chat/MessageList.tsx` — enhance `jumpToMessage` with highlight
- `frontend/src/components/dashboard/chat/MessageReplyPreview.tsx` — minor styling tweaks
- `frontend/src/components/dashboard/chat/ChatWindow.tsx` — wire up reply-preview-click → jump

### Files to Create
- `frontend/src/hooks/use-swipe-to-reply.ts` — touch gesture hook

## Implementation Steps

### Step 1: Implement desktop-first reply flow
- Ensure reply action in `MessageActions.tsx` is easy to discover and kept in the core MVP
- In `ChatWindow.tsx`, keep `replyTo` as the single source of truth
- Focus composer immediately after reply activation

### Step 2: Add click-to-jump on reply preview
- In MessageBubble's reply preview block, add `onClick={() => onJumpToReply?.(message.reply_to.id)}`
- Thread new `onJumpToReply` prop from MessageList → MessageBubble
- In ChatWindow, wire `handleJump` to the new prop

### Step 3: Enhance jumpToMessage with highlight
- After `scrollToIndex`, set a highlight state: `highlightedMessageId`
- In `itemContent`, apply CSS class `animate-msg-highlight` when `msg.id === highlightedMessageId`
- Clear via `animationend`, not timeout-heavy logic

### Step 4: Add highlight CSS animation
```css
@keyframes msg-highlight {
  0% { background-color: hsl(var(--primary) / 0.15); }
  100% { background-color: transparent; }
}
.animate-msg-highlight {
  animation: msg-highlight 1.5s ease-out forwards;
  border-radius: 0.75rem;
}
```

### Step 5: Handle deleted/missing reply target
- If `message.reply_to` exists but content is empty → show italic "Deleted message"
- If jumpToMessage can't find the target index → show toast "Message not available"

### Step 6: Swipe-to-reply (stretch goal)
Only after desktop reply flow is complete and stable.
- Create `use-swipe-to-reply.ts` hook
- Test carefully against browser edge-swipe/back gesture
- Skip entirely if it introduces UX risk

## Todo List
- [x] Implement desktop reply button flow first
- [x] Add `onJumpToReply` prop chain (ChatWindow → MessageList → MessageBubble)
- [x] Enhance `jumpToMessage` with CSS highlight animation
- [x] Add `animate-msg-highlight` CSS keyframe to globals.css
- [x] Use `animationend` cleanup for highlight state
- [x] Handle deleted/recalled reply targets gracefully
- [x] (Stretch) Create `use-swipe-to-reply.ts` hook
- [x] (Stretch) Test swipe threshold on mobile viewport
- [x] (Stretch) Test that swipe doesn't conflict with browser back gesture

## Success Criteria
- Swiping right on a message activates reply (mobile)
- Clicking reply preview inside a bubble scrolls to original with visible highlight
- Highlight fades out after ~1.5s
- Deleted reply targets show fallback text, not broken UI
- No accidental swipe triggers during normal scrolling

## Risk Assessment
- **Medium:** Swipe gesture conflicts with browser back (iOS Safari) → mitigate with Y-axis threshold and minimum 10px X before activating
- **Low:** Virtuoso index lookup for jump may fail if message is outside loaded range → show toast fallback
- **Low:** Touch devices vary in sensitivity → make threshold configurable via hook options

## Security Considerations
- No new data exposure
- Reply preview content already truncated and sanitized
