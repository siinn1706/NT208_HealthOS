/**
 * Suspense fallback for the appointments route.
 * Also covers AppointmentsPageClient which uses useSearchParams.
 */
export default function AppointmentsLoading() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '3px solid #e5e7eb',
          borderTopColor: '#1965B3',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
