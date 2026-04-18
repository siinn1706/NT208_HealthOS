# Phase 5: Message Actions & Micro-Interactions

## Context Links
- [plan.md](./plan.md) | [phase-01](./phase-01-message-bubble-redesign.md)
- Current: `frontend/src/components/dashboard/chat/MessageActions.tsx` (212 lines)
- Current: `frontend/src/components/dashboard/chat/MessageReactions.tsx` (70 lines)
- Current: `frontend/src/components/dashboard/chat/PinnedMessages.tsx` (74 lines)
- Current: `frontend/src/components/dashboard/chat/TypingIndicator.tsx` (19 lines)

## Overview
- **Priority:** P3 — secondary polish, reduce or defer if MVP gets heavy
- **Status:** Pending
- **Description:** Polish message actions (hover menu, reactions), pinned message bar, typing indicator, and add micro-interactions for send/receive/react

## Key Insights — Telegram Action Patterns

### Message Actions (Desktop)
- On hover: show a small floating toolbar ABOVE the bubble (not beside it)
- Toolbar: `[😊 react] [↩ reply] [⋯ more]` — 3 buttons max
- "More" opens full context menu (reply, copy, edit, pin, forward, delete)
- Current app positions actions to the LEFT/RIGHT of the bubble → move above

### Quick Reactions
- Telegram shows a floating reaction bar above the context menu
- 6 preset emojis + "+" to open full picker
- On tap: reaction animates onto the bubble bottom with a scale-bounce effect
- Current app uses a popover from a smiley button → simplify to inline bar

### Pinned Message Bar
- Telegram shows a thin bar below the header with pinned message preview
- Click → scrolls to pinned message
- Multiple pins: shows counter + chevron to cycle through
- Current implementation is decent — just polish styling

### Typing Indicator
- Telegram shows 3 animated dots inside a "ghost bubble" (same shape as incoming message)
- Includes the typing user's avatar
- Current implementation is close but uses `rounded-bl-sm` style already

### Send Animation
- Message bubble appears with a subtle slide-up + fade-in
- Received messages: subtle slide-in from left

## Requirements

### Functional
- [ ] Move action toolbar above bubble (not beside it)
- [ ] Quick reaction bar: 6 emojis inline above context menu
- [ ] Pinned bar: thinner, more compact styling
- [ ] Typing indicator: include avatar placeholder
- [ ] Message appear animation (slide-up for sent, slide-in for received)

### Non-Functional
- [ ] Action toolbar must not overflow viewport edges
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Reaction animations use CSS transforms (GPU-accelerated)

## Related Code Files

### Files to Modify
- `frontend/src/components/dashboard/chat/MessageActions.tsx` — reposition above bubble, inline reaction bar
- `frontend/src/components/dashboard/chat/MessageReactions.tsx` — minor polish
- `frontend/src/components/dashboard/chat/PinnedMessages.tsx` — compact styling
- `frontend/src/components/dashboard/chat/TypingIndicator.tsx` — add avatar slot
- `frontend/src/components/dashboard/chat/MessageBubble.tsx` — action toolbar position change
- `frontend/src/app/globals.css` — message appear animations

## Implementation Steps

### Step 1: Reposition action toolbar above bubble
Move from `absolute top-1/2 -translate-y-1/2 -left-24/-right-24` to `absolute -top-8 right-0` (outgoing) or `absolute -top-8 left-0` (incoming).
```tsx
<div className={cn(
  "absolute -top-9 z-10 flex items-center gap-0.5 px-1 py-0.5",
  "bg-background/90 backdrop-blur-sm border border-border rounded-lg shadow-sm",
  "opacity-0 group-hover:opacity-100 transition-opacity",
  isOwn ? "right-0" : "left-0"
)}>
  {/* Quick reactions inline */}
  {QUICK_REACTIONS.map(emoji => (
    <button key={emoji} onClick={() => onReact(emoji)} className="text-base hover:scale-125 transition-transform p-0.5">
      {emoji}
    </button>
  ))}
  <div className="w-px h-4 bg-border mx-0.5" />
  <button onClick={onReply}><Reply className="w-3.5 h-3.5" /></button>
  <DropdownMenu>{/* more actions */}</DropdownMenu>
</div>
```

### Step 2: Inline quick reactions (remove separate popover)
Instead of a separate popover trigger for reactions, show 5-6 popular emojis directly in the action bar. The "more" dropdown still contains full action list.

### Step 3: Compact pinned bar
Reduce padding, use `text-[11px]`, single line with ellipsis:
```tsx
<div className="flex items-center gap-2 px-4 py-1.5 border-b bg-secondary/30">
  <Pin className="w-3 h-3 text-primary flex-shrink-0" />
  <button onClick={onJump} className="flex-1 min-w-0 text-[11px] truncate text-left hover:text-primary transition-colors">
    <span className="font-medium text-primary">{senderName}:</span> {content}
  </button>
  {count > 1 && <span className="text-[10px] text-muted-foreground">{idx}/{count}</span>}
</div>
```

### Step 4: Typing indicator with avatar
Add avatar placeholder to match incoming message bubble shape:
```tsx
<div className="flex items-end gap-2 px-4 py-1">
  <div className="w-8 h-8 rounded-full bg-secondary animate-pulse" />
  <div className="bg-secondary rounded-2xl rounded-bl-sm px-4 py-2.5">
    {/* 3 bouncing dots */}
  </div>
</div>
```

### Step 5: Message appear animations
Add to globals.css:
```css
@keyframes msg-slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes msg-slide-in {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}
```
Apply via Virtuoso's item wrapper — only on new messages (not on initial load or scroll-back).
**Trade-off:** This is tricky with Virtuoso — may skip if too complex. Mark as stretch goal.

## Todo List
- [x] Reposition action toolbar above bubble
- [x] Inline quick reactions in action bar
- [x] Reduce "more" dropdown to essential actions only (Reply moved to direct button)
- [x] Compact pinned message bar styling
- [x] Keyboard accessibility: `group-focus-within:opacity-100` on toolbar
- [x] Fix overflow-visible on bubble container so toolbar renders above bubble
- [ ] Typing indicator with avatar placeholder (deferred — stretch goal)
- [ ] Add message appear CSS animations (deferred — stretch per plan)

## Success Criteria
- Action toolbar appears above bubble on hover
- Quick reactions accessible in one click (no popover needed)
- Pinned bar is compact and clickable
- Typing indicator looks like a "ghost bubble"
- All animations respect reduced-motion preference

## Risk Assessment
- **Medium:** Action toolbar above first message may overflow above viewport → add bottom-position fallback or use Floating UI for auto-placement
- **Low:** Inline reactions increase action bar width → limit to 5 emojis
- **Low:** Message appear animations with Virtuoso can cause jank → mark as stretch goal

## Security Considerations
- No new data exposure
