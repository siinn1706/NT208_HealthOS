'use client';

import type { ChangeEventHandler, ReactNode } from 'react';

interface TextInputProps {
  id?: string;
  /** Controlled value — pair with `onChange`. */
  value?: string;
  /** Uncontrolled initial value — do not mix with `value`. */
  defaultValue?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number';
  error?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function TextInput({ id, value, defaultValue, onChange, placeholder, type = 'text', error, leading, trailing }: TextInputProps) {
  const controlled = value !== undefined;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      height: 50,
      padding: '0 14px',
      background: 'var(--card)',
      border: `1px solid ${error ? 'var(--danger, #E54D4D)' : 'var(--border-strong)'}`,
      borderRadius: 12,
    }}>
      {leading && (
        <span style={{ color: 'var(--ink-3)', display: 'flex' }}>{leading}</span>
      )}
      <input
        id={id}
        type={type}
        {...(controlled
          ? { value, onChange: onChange ?? (() => {}) }
          : { defaultValue }
        )}
        placeholder={placeholder}
        style={{
          flex: 1,
          border: 'none',
          background: 'transparent',
          outline: 'none',
          fontSize: 15,
          color: 'var(--ink)',
          fontFamily: 'inherit',
        }}
      />
      {trailing && (
        <span style={{ color: 'var(--ink-3)', display: 'flex' }}>{trailing}</span>
      )}
    </div>
  );
}
