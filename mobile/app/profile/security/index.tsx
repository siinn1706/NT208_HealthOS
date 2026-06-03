import React from 'react';
import { SecurityScreen } from '../../../src/components/profile/security-screen';
import { ErrorBoundary } from '../../../src/components/error/error-boundary';
export default function SecurityPage() { return <ErrorBoundary><SecurityScreen /></ErrorBoundary>; }
