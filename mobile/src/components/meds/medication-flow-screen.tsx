import React from 'react';
import { MedicationDetailScreen }   from './medication-detail-screen';
import { TakeMedConfirmScreen }     from './take-med-confirm-screen';
import { MissedDoseScreen }         from './missed-dose-screen';
import { AddMedicationScreen }      from './add-medication-screen';
import { EditMedicationScreen }     from './edit-medication-screen';
import { ImportMedicationScreen }   from './import-medication-screen';
import { RefillLogScreen }          from './refill-log-screen';
import { PauseMedScreen }           from './pause-med-screen';
import { ArchiveMedScreen }         from './archive-med-screen';
import { MedicationHistoryScreen }  from './medication-history-screen';

export type MedicationFlowKind =
  | 'detail' | 'add'     | 'archive' | 'edit'
  | 'history' | 'import' | 'pause'   | 'refill'
  | 'take'   | 'missed';

interface MedicationFlowScreenProps {
  kind: MedicationFlowKind;
}

export function MedicationFlowScreen({ kind }: MedicationFlowScreenProps) {
  switch (kind) {
    case 'detail':  return <MedicationDetailScreen />;
    case 'take':    return <TakeMedConfirmScreen />;
    case 'missed':  return <MissedDoseScreen />;
    case 'add':     return <AddMedicationScreen />;
    case 'edit':    return <EditMedicationScreen />;
    case 'import':  return <ImportMedicationScreen />;
    case 'refill':  return <RefillLogScreen />;
    case 'pause':   return <PauseMedScreen />;
    case 'archive': return <ArchiveMedScreen />;
    case 'history': return <MedicationHistoryScreen />;
  }
}
