import React from 'react';
import { MedicationDetailScreen }   from './MedicationDetailScreen';
import { TakeMedConfirmScreen }     from './TakeMedConfirmScreen';
import { MissedDoseScreen }         from './MissedDoseScreen';
import { AddMedicationScreen }      from './AddMedicationScreen';
import { EditMedicationScreen }     from './EditMedicationScreen';
import { ImportMedicationScreen }   from './ImportMedicationScreen';
import { RefillLogScreen }          from './RefillLogScreen';
import { PauseMedScreen }           from './PauseMedScreen';
import { ArchiveMedScreen }         from './ArchiveMedScreen';
import { MedicationHistoryScreen }  from './MedicationHistoryScreen';

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
