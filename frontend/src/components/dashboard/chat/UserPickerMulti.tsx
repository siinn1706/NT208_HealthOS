"use client";

import { useState, useCallback, useRef } from "react";
import { X, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { bffFetch } from "@/lib/api-client";
import type { ChatParticipant } from "@/types/api";

interface UserPickerMultiProps {
  selected: ChatParticipant[];
  onChange: (users: ChatParticipant[]) => void;
  max?: number;
  excludeIds?: string[];
}

interface UserSearchResult {
  id?: string;
  user_id?: string;
  display_name: string;
  avatar_url: string | null;
  email: string;
  is_online?: boolean;
  last_seen?: string | null;
}

function normalizeSearchResults(users: UserSearchResult[]): ChatParticipant[] {
  const seen = new Set<string>();
  const normalized: ChatParticipant[] = [];

  for (const user of users) {
    const userId = user.user_id ?? user.id;
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    normalized.push({
      user_id: userId,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      email: user.email,
      is_online: user.is_online ?? false,
      last_seen: user.last_seen ?? null,
    });
  }

  return normalized;
}

export function UserPickerMulti({ selected, onChange, max = 50, excludeIds = [] }: UserPickerMultiProps) {
  const t = useTranslations("chat.group");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChatParticipant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await bffFetch<{ data: UserSearchResult[] }>(
          `/api/v1/chat/users/search?q=${encodeURIComponent(q)}&limit=10`
        );
        setResults(normalizeSearchResults(res.data ?? []));
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  }, []);

  const handleQueryChange = (v: string) => {
    setQuery(v);
    search(v);
  };

  const pick = (user: ChatParticipant) => {
    if (selected.length >= max) return;
    if (selected.some((u) => u.user_id === user.user_id)) return;
    onChange([...selected, user]);
    setQuery("");
    setResults([]);
  };

  const remove = (userId: string) => onChange(selected.filter((u) => u.user_id !== userId));

  const filteredResults = results.filter(
    (r) => !selected.some((s) => s.user_id === r.user_id) && !excludeIds.includes(r.user_id)
  );

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((u) => (
            <span
              key={u.user_id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-sm"
            >
              {u.display_name}
              <button
                type="button"
                onClick={() => remove(u.user_id)}
                className="hover:text-destructive transition-colors"
                aria-label={`Remove ${u.display_name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder={t("addMembers")}
          className="pl-9 h-9 text-sm"
          disabled={selected.length >= max}
          autoComplete="off"
        />
      </div>

      {/* Dropdown results */}
      {(filteredResults.length > 0 || isSearching) && (
        <div className="rounded-lg border bg-popover shadow-md overflow-hidden">
          {isSearching && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
          )}
          {filteredResults.map((u) => (
            <button
              key={u.user_id}
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              onClick={() => pick(u)}
            >
              <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium shrink-0">
                {u.display_name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="font-medium truncate">{u.display_name}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
