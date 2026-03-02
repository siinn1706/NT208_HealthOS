export function TypingIndicator() {
  return (
    <div
      aria-live="polite"
      aria-label="Người dùng đang nhập"
      className="flex items-end gap-1 px-4 py-2"
    >
      <div className="flex items-center gap-1 bg-secondary rounded-2xl rounded-bl-sm px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 bg-muted-foreground rounded-full inline-block animate-bounce"
            style={{ animationDelay: `${i * 150}ms`, animationDuration: "0.8s" }}
          />
        ))}
      </div>
    </div>
  );
}
