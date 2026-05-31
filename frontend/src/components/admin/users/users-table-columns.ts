export const ALL_COLUMNS = [
  { key: "user", label: "User", hideable: false },
  { key: "email", label: "Email" },
  { key: "status", label: "Status" },
  { key: "role", label: "Role" },
  { key: "subscription", label: "Subscription" },
  { key: "created_at", label: "Created" },
  { key: "last_seen_at", label: "Last seen" },
  { key: "actions", label: "", hideable: false },
] as const;

export const DEFAULT_VISIBLE = new Set(ALL_COLUMNS.map((c) => c.key));
