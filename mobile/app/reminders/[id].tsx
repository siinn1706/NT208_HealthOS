import React from 'react';
import { ReminderDetailScreen } from '../../src/components/reminders/reminder-detail-screen';
import { ErrorBoundary } from '../../src/components/error/error-boundary';
export default function ReminderDetailRoute() { return <ErrorBoundary><ReminderDetailScreen /></ErrorBoundary>; }
