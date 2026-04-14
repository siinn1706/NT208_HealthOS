---
title: "Telegram-Inspired Chat UI Redesign"
description: "Redesign chat UI with Telegram-inspired message bubbles, reply UX, composer, and interaction patterns"
status: in-progress
priority: P1
effort: 16h
branch: chat-ui
tags: [frontend, ui-ux, chat, redesign]
created: 2026-04-14
---

# Telegram-Inspired Chat UI Redesign

## Overview

Redesign the existing chat feature to adopt Telegram's strongest UX patterns — cleaner bubble hierarchy, polished reply interaction, better composer ergonomics, and smoother micro-interactions — while preserving the existing architecture and component boundaries.

## Product Understanding

The chat serves two use cases in this health app:
1. **Patient-to-patient** direct messaging (peer support, community)
2. **AI assistant** conversation (HealthOS AI for health queries)

**Assumptions:**
- Text-heavy conversations (health discussions, questions)
- Reply-to is important (referencing prior medical context)
- Mobile and desktop usage equally important
- No voice messages or video calls currently

## Phases

### Core MVP
| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Message bubble redesign | Completed | 4h | [phase-01](./phase-01-message-bubble-redesign.md) |
| 2 | Reply interaction overhaul | Completed | 3h | [phase-02](./phase-02-reply-interaction.md) |
| 3 | Composer redesign | Completed | 2.5h | [phase-03](./phase-03-composer-redesign.md) |
| 6 | Responsive & accessibility pass | Completed | 2h | [phase-06](./phase-06-responsive-a11y.md) |

### Secondary Polish
| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 4 | Conversation list polish | Completed | 2h | [phase-04](./phase-04-conversation-list.md) |
| 5 | Message actions & micro-interactions | Pending | 2.5h | [phase-05](./phase-05-actions-and-polish.md) |

## Dependencies

### Core MVP path
- Phase 1 → standalone (start here)
- Phase 2 → depends on Phase 1
- Phase 3 → depends on Phase 2
- Phase 6 → depends on Phases 1-3

### Secondary polish
- Phase 4 → standalone, optional if implementation budget is tight
- Phase 5 → depends on Phase 1, optional if implementation budget is tight

**Implementation rule:** If scope gets heavy, ship Phases 1 + 2 + 3 + 6 first. Phases 4 + 5 can be reduced or deferred.

## Key Architectural Decisions

1. **Smallest practical refactor** — reuse existing components, avoid giant rewrites
2. **Reply preview embedded inside bubble** (Telegram-inspired)
3. **Desktop reply button first**; mobile swipe-to-reply is stretch goal only
4. **Timestamp stays below bubble** (user preference, more robust)
5. **Simple floating date pill** only — no sticky separator in first pass
6. **Verify reply data model before coding**; use smallest frontend-safe fallback if needed
7. **Use CSS animation + `animationend` cleanup** for jump highlight
8. **Clean up debug agent logs** in ChatLayout.tsx and ChatWindow.tsx
