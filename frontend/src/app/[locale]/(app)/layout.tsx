import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Replace with real session/user fetch from BFF
  const userName = "Nguyễn Văn A";
  const alertCount = 2;

  return (
    <DashboardShell userName={userName} alertCount={alertCount}>
      {children}
    </DashboardShell>
  );
}
