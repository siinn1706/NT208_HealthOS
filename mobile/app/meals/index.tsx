import React from 'react';
import { MealsHubScreen } from '../../src/components/meals/meals-hub-screen';
import { ErrorBoundary } from '../../src/components/error/error-boundary';

export default function MealsIndexRoute() {
  return <ErrorBoundary><MealsHubScreen /></ErrorBoundary>;
}
