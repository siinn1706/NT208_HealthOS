export function useGreeting(name?: string): string {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  return name ? `Good ${part}, ${name}` : `Good ${part}`;
}
