import React from 'react';
import { AppointmentDetailScreen } from './AppointmentDetailScreen';
import { CreateAppointmentScreen } from './CreateAppointmentScreen';
import { JoinVideoVisitScreen } from './JoinVideoVisitScreen';
import { VisitPrepScreen } from './VisitPrepScreen';
import { MedicalHistoryScreen } from './MedicalHistoryScreen';
import { PrescriptionDetailScreen } from './PrescriptionDetailScreen';
import { AttachmentUploadScreen } from './AttachmentUploadScreen';

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
