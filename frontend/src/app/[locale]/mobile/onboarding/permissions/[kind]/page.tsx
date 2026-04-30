import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PermissionsScreen } from '@/components/mobile/screens/auth/permissions-screen';
import { isValidPermissionKind } from '@/lib/mobile/permission-kinds';

interface PageProps {
  params: Promise<{ kind: string }>;
}

export default async function MobileOnboardingPermissionsPage({ params }: PageProps) {
  const { kind } = await params;
  if (!isValidPermissionKind(kind)) {
    notFound();
  }
  return (
    <Suspense fallback={null}>
      <PermissionsScreen kind={kind} />
    </Suspense>
  );
}
