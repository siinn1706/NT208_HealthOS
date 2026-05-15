import React from 'react';
import { AppointmentDetailScreen } from './appointment-detail-screen';
import { CreateAppointmentScreen } from './create-appointment-screen';
import { JoinVideoVisitScreen } from './join-video-visit-screen';
import { VisitPrepScreen } from './visit-prep-screen';
import { MedicalHistoryScreen } from './medical-history-screen';
import { PrescriptionDetailScreen } from './prescription-detail-screen';
import { AttachmentUploadScreen } from './attachment-upload-screen';

export type CareDetailKind =
  | 'appointment'
  | 'prep'
  | 'video'
  | 'history'
  | 'create'
  | 'prescription'
  | 'attachments';

interface CareDetailScreenProps {
  kind: CareDetailKind;
}

export function CareDetailScreen({ kind }: CareDetailScreenProps) {
  switch (kind) {
    case 'appointment':  return <AppointmentDetailScreen />;
    case 'create':       return <CreateAppointmentScreen />;
    case 'video':        return <JoinVideoVisitScreen />;
    case 'prep':         return <VisitPrepScreen />;
    case 'history':      return <MedicalHistoryScreen />;
    case 'prescription': return <PrescriptionDetailScreen />;
    case 'attachments':  return <AttachmentUploadScreen />;
  }
}
