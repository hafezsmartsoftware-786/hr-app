import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listEmployeesAdmin } from "@/backend/functions/employees.functions";
import { useI18n } from "@/lib/i18n";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="bg-brand/20 text-brand font-bold rounded-sm px-0.5">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function GlobalSearch() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const listFn = useServerFn(listEmployeesAdmin);

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", debouncedQuery],
    queryFn: async () => {
      const res = await listFn({ data: { q: debouncedQuery, page: 1, pageSize: 5, sort: "created_at", dir: "desc" } });
      if ((res as any)._error) console.error("SUPABASE OR SEARCH ERROR:", (res as any)._error);
      return res;
    },
    enabled: debouncedQuery.trim().length > 1,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGlobalSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      navigate({ to: "/admin/employees", search: { q: query.trim() } });
      setOpen(false);
      setQuery("");
      e.currentTarget.blur();
    }
  };

  const results = data?.rows || [];
  const showDropdown = open && query.trim().length > 1;

  return (
    <div ref={wrapperRef} className="relative hidden md:block z-50">
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={searchInputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleGlobalSearch}
        placeholder={t("search")}
        className="w-80 rounded-full border border-input bg-card py-2 ps-9 pe-12 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-brand/20 transition-all"
      />
      <div className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        Ctrl K
      </div>

      {showDropdown && (
        <div className="absolute top-[calc(100%+8px)] w-full overflow-hidden rounded-xl border border-border bg-card shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="max-h-[350px] overflow-y-auto p-2">
            {isFetching ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
            ) : results.length > 0 ? (
              <div className="space-y-1">
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Employees</div>
                {results.map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      navigate({ to: "/admin/employees/$id", params: { id: r.id } });
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start transition-colors hover:bg-muted"
                  >
                    <EmployeeAvatar id={r.id} name={r.full_name || "Unknown"} url={r.avatar_url ?? undefined} className="h-8 w-8 rounded-full border border-border/50" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-semibold">
                        <HighlightMatch text={r.full_name || "Unknown"} query={query.trim()} />
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground mt-0.5">
                        {r.position || r.department || "No department"} 
                        {r.emp_code && <> • ID: <HighlightMatch text={r.emp_code} query={query.trim()} /></>}
                        {r.phone && <> • <HighlightMatch text={r.phone} query={query.trim()} /></>}
                        {r.email && <> • <HighlightMatch text={r.email} query={query.trim()} /></>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">No results found for "{query}"</div>
            )}
          </div>
          
          <button 
            onClick={() => { navigate({ to: "/admin/employees", search: { q: query.trim() } }); setOpen(false); setQuery(""); }}
            className="flex w-full items-center justify-between border-t border-border bg-muted/30 px-4 py-3 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group"
          >
            <span>See all matching results</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
}
