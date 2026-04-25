'use client';

import type { ReactNode } from 'react';

interface TextInputProps {
  value?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number';
  error?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function TextInput({ value, placeholder, type = 'text', error, leading, trailing }: TextInputProps) {
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
        type={type}
        defaultValue={value}
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
