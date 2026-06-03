'use client';

/**
 * Global error boundary for the entire Next.js app.
 * Catches unhandled errors that escape all nested error.tsx boundaries,
 * including root layout errors. Must render its own <html> and <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'system-ui, sans-serif',
          margin: 0,
          padding: '0 16px',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          Something went wrong
        </h2>
        <p style={{ color: '#666', marginBottom: 24, maxWidth: 400, lineHeight: 1.5 }}>
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={reset}
          style={{
            padding: '10px 24px',
            background: '#1965B3',
            color: '#FFF',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
