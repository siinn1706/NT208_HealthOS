import React from 'react';
import { CareHubScreen } from '../../src/components/care/care-hub-screen';
import { ErrorBoundary } from '../../src/components/error/error-boundary';
export default function CareTab() { return <ErrorBoundary><CareHubScreen /></ErrorBoundary>; }
