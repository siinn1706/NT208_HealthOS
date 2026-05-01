import { Suspense } from 'react';
import { AttachmentUploadScreen } from '@/components/mobile/screens/care/attachment-upload-screen';

export default function MobileCareAttachmentsPage() {
  return (
    <Suspense fallback={null}>
      <AttachmentUploadScreen />
    </Suspense>
  );
}
