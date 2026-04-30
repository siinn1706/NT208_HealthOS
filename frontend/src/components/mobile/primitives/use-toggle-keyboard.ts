'use client';

import type { KeyboardEvent } from 'react';

/** Space/Enter keyboard handler for switch-style interactive elements (toggle, radio). */
export function useToggleKeyboard(onToggle: () => void) {
  return function onKeyDown(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggle();
    }
  };
}
