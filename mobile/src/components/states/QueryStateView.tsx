import React from "react";
import type { UseQueryResult, UseInfiniteQueryResult } from "@tanstack/react-query";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";

/**
 * Collapses the universal "pending → error → empty → success" four-state
 * dance into a single component. Replaces the boilerplate that was
 * duplicated across ~20 screens:
 *
 *     {q.isPending ? <LoadingState /> :
 *      q.isError   ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> :
 *      q.data.length === 0 ? <EmptyState title="..." /> :
 *      <RealUi data={q.data} />}
 *
 * Usage:
 *
 *     <QueryStateView
 *       query={remindersQuery}
 *       empty={{ title: t("reminders.noReminders"), action: <AddButton /> }}
 *       isEmpty={(data) => data.length === 0}
 *     >
 *       {(data) => <ReminderList data={data} />}
 *     </QueryStateView>
 *
 * Falls back to a plain LoadingState/ErrorState if `empty` or `isEmpty` are
 * omitted (some screens want to handle empty themselves).
 */

type AnyQuery<T> =
  | UseQueryResult<T>
  | UseInfiniteQueryResult<T>;

interface EmptyConfig {
  title: string;
  body?: string;
  action?: React.ReactNode;
}

interface QueryStateViewProps<T> {
  query: AnyQuery<T>;
  children: (data: T) => React.ReactNode;
  /** Override the loading label text. */
  loadingLabel?: string;
  /** Override the error title text. */
  errorTitle?: string;
  /** Empty-state config + predicate (data is non-null when called). */
  empty?: EmptyConfig;
  isEmpty?: (data: T) => boolean;
}

export function QueryStateView<T>({
  query,
  children,
  loadingLabel,
  errorTitle,
  empty,
  isEmpty,
}: QueryStateViewProps<T>) {
  if (query.isPending) {
    return <LoadingState label={loadingLabel} />;
  }
  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        onRetry={() => query.refetch()}
        title={errorTitle}
      />
    );
  }
  // After isPending && isError checks, query.data is defined.
  const data = query.data as T;
  if (empty && isEmpty && isEmpty(data)) {
    return (
      <EmptyState title={empty.title} body={empty.body} action={empty.action} />
    );
  }
  return <>{children(data)}</>;
}
