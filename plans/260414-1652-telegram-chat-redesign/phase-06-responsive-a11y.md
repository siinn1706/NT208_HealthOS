# Phase 6: Responsive & Accessibility Pass

## Context Links
- [plan.md](./plan.md) | All previous phases
- Current: `frontend/src/components/dashboard/chat/ChatLayout.tsx` (263 lines)
- Design guidelines: `docs/design-guidelines.md` — breakpoints, a11y requirements

## Overview
- **Priority:** P1 — core MVP final pass
- **Status:** Pending
- **Description:** Final MVP pass — responsive behavior, accessibility, Esc cancel flow, debug log cleanup, reduced motion compliance.

## Key Areas

### Mobile Responsiveness
- **Bubble max-width:** 85% on mobile (currently 70%) — Telegram uses ~85% on mobile, ~65% on desktop
- **Action toolbar:** Switch from hover to long-press on touch devices
- **Swipe-to-reply:** Already implemented in Phase 2, verify threshold
- **Composer:** Full width, attachment/emoji buttons sized for touch (min 44px tap target)
- **Conversation list:** Full-screen on mobile, hidden when conversation open (already implemented)

### Desktop Enhancements
- **Hover states:** Smooth transitions, no flicker
- **Keyboard shortcuts:** Enter to send, Shift+Enter for newline, Esc to cancel reply/edit
- **Context menu:** Right-click on message shows native-feel context menu

### Accessibility
- **ARIA roles:** MessageList uses `role="log"` (already set), verify `aria-live="polite"`
- **Screen reader:** New messages announced, reply context included
- **Focus management:** When reply/edit activated, focus moves to textarea
- **Keyboard navigation:** Tab through action buttons, Enter to activate
- **Color contrast:** Inline timestamp inside bubble must meet 4.5:1 against bubble background
- **Reduced motion:** All animations respect `prefers-reduced-motion` (check framer-motion + CSS)

## Requirements

### Functional
- [x] Bubble max-width: 85% mobile, 65% desktop
- [x] Long-press for actions on mobile (instead of hover)
- [x] Keyboard shortcuts: Esc cancels reply/edit
- [x] All interactive elements have aria-labels
- [x] Inline timestamp contrast meets WCAG AA

### Non-Functional
- [x] Touch targets >= 44px x 44px
- [x] No horizontal overflow on mobile
- [x] Page weight increase < 5KB (no new heavy dependencies)

## Related Code Files

### Files to Modify
- `frontend/src/components/dashboard/chat/MessageBubble.tsx` — responsive max-width, long-press
- `frontend/src/components/dashboard/chat/MessageActions.tsx` — long-press trigger for mobile
- `frontend/src/components/dashboard/chat/MessageInput.tsx` — touch target sizes, Esc handling
- `frontend/src/components/dashboard/chat/ChatLayout.tsx` — clean up debug agent logs
- `frontend/src/components/dashboard/chat/ChatWindow.tsx` — clean up debug agent logs, Esc handler
- `frontend/src/app/globals.css` — reduced motion media queries

## Implementation Steps

### Step 1: Responsive bubble width
```tsx
<div className={cn("relative max-w-[85%] md:max-w-[65%] flex flex-col", isOwn && "items-end")}>
```

### Step 2: Long-press for actions on mobile
Create a `useLongPress(callback, delay=500)` hook or use the existing touch detection.
On long-press: show the action toolbar (same as hover but triggered differently).
On desktop: hover shows toolbar (existing behavior).

### Step 3: Keyboard shortcut: Esc to cancel
In MessageInput or ChatWindow, add keydown listener:
```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (editingMessage) onCancelEdit();
      else if (replyTo) onCancelReply();
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [editingMessage, replyTo, onCancelEdit, onCancelReply]);
```

### Step 4: ARIA and contrast audit
- Verify all buttons have `aria-label`
- Verify inline timestamp color has sufficient contrast:
  - Outgoing (primary bg): white/light text at 60% opacity → check contrast
  - Incoming (secondary bg): muted-foreground → check contrast
  - If insufficient: increase opacity or use dedicated timestamp color
- Add `aria-label` to date separator pills
- Verify `role="log"` and `aria-live="polite"` on MessageList

### Step 5: Clean up debug agent logs
Remove all `#region agent log` blocks from:
- ChatLayout.tsx (lines 28-89)
- ChatWindow.tsx (lines 173-191)

These are diagnostic fetch calls to `127.0.0.1:7381` that shouldn't be in production.

### Step 6: Reduced motion check
Ensure all new CSS animations have:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-msg-highlight,
  .animate-msg-slide-up,
  .animate-msg-slide-in {
    animation: none;
  }
}
```
Verify framer-motion's `useReducedMotion()` hook is used (already present in ChatLayout).

## Todo List
- [x] Set responsive bubble max-width (85% mobile, 65% desktop)
- [x] Add long-press handler for mobile action trigger
- [x] Add Esc keyboard shortcut for cancel reply/edit
- [x] Audit all buttons for aria-labels
- [x] Verify inline timestamp contrast ratios
- [x] Clean up debug agent logs in ChatLayout.tsx and ChatWindow.tsx
- [x] Add reduced-motion media queries for new animations
- [x] Verify touch targets ≥ 44px on composer buttons
- [x] Test on mobile viewport (375px width)
- [x] Test keyboard-only navigation flow

## Success Criteria
- Chat is fully usable on 375px width mobile screen
- All interactive elements keyboard-accessible
- No WCAG AA contrast violations
- Debug logs removed from production code
- Reduced motion preference respected everywhere

## Risk Assessment
- **Low:** Long-press conflicts with text selection on mobile → use preventDefault carefully, only on bubble container not on text
- **Low:** Removing debug logs is straightforward but verify no regressions in auth flow

## Security Considerations
- Removing debug agent logs eliminates unnecessary network calls to localhost diagnostic endpoints
- No new data exposure
