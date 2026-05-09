import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CheckCircle2, ExternalLink, Film, Layers, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

// ── helpers ────────────────────────────────────────────────────────────────

function MediaThumb({ item, size = "md" }: { item: any; size?: "sm" | "md" }) {
  const cls = size === "sm"
    ? "w-10 h-10 rounded-lg object-cover flex-shrink-0"
    : "w-full h-full object-cover";

  if (!item) return <div className={cn("bg-gray-100 flex items-center justify-center", size === "sm" ? "w-10 h-10 rounded-lg flex-shrink-0" : "w-full h-full")}><Film size={12} className="text-gray-300" /></div>;

  return item.media_type === "image"
    ? <img src={item.file_url} alt={item.name} className={cls} />
    : <video src={item.file_url} className={cls} muted />;
}

function fmtDuration(sec: number | null | undefined) {
  if (!sec) return "—";
  return sec >= 60 ? `${Math.floor(sec / 60)}m${sec % 60 ? ` ${sec % 60}s` : ""}` : `${sec}s`;
}

// ── main component ──────────────────────────────────────────────────────────

export default function Playlists() {
  const qc = useQueryClient();

  const { data: playlistsData, isLoading } = useQuery({
    queryKey: ["playlists"],
    queryFn: () => api.get("/api/playlists/").then((r) => r.data),
  });
  const { data: mediaData } = useQuery({
    queryKey: ["media"],
    queryFn: () => api.get("/api/media/").then((r) => r.data),
  });

  const [selected, setSelected] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [mediaSearch, setMediaSearch] = useState("");
  const [form, setForm] = useState({ name: "", type: "media_list", external_url: "" });
  // Local duration overrides keyed by item index; cleared when selection changes
  const [durationEdits, setDurationEdits] = useState<Record<number, number | null>>({});

  const playlists: any[] = playlistsData?.results ?? [];
  const allMedia: any[] = mediaData?.results ?? [];
  const filteredMedia = allMedia.filter((m) =>
    m.name.toLowerCase().includes(mediaSearch.toLowerCase())
  );

  // IDs already in the selected playlist
  const inPlaylist = new Set((selected?.items ?? []).map((i: any) => i.media));

  function buildPayload(items: any[], overrides: Record<number, number | null> = {}) {
    return items.map((item: any, idx: number) => ({
      media: item.media,
      duration_seconds: idx in overrides ? overrides[idx] : (item.duration_seconds ?? null),
    }));
  }

  function saveDuration(idx: number, seconds: number | null) {
    if (!selected) return;
    const merged = { ...durationEdits, [idx]: seconds };
    setDurationEdits(merged);
    setItems.mutate(
      { id: selected.id, items: buildPayload(selected.items, merged) },
      { onSuccess: () => toast.success("Duration updated") }
    );
  }

  const create = useMutation({
    mutationFn: (payload: any) => api.post("/api/playlists/", payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["playlists"] });
      setShowForm(false);
      setForm({ name: "", type: "media_list", external_url: "" });
      setSelected(res.data);
      toast.success(`"${res.data.name}" created`);
    },
    onError: () => toast.error("Failed to create playlist"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/playlists/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playlists"] });
      setSelected(null);
      setConfirmDelete(null);
      toast.success("Playlist deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const setItems = useMutation({
    mutationFn: ({ id, items }: { id: number; items: any[] }) =>
      api.put(`/api/playlists/${id}/items/`, items),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["playlists"] });
      setSelected(res.data);
    },
    onError: () => toast.error("Failed to update playlist"),
  });

  function addMedia(media: any) {
    if (!selected) return;
    const next = [...(selected.items ?? []), { media: media.id, duration_seconds: null }];
    setItems.mutate(
      { id: selected.id, items: buildPayload(next) },
      { onSuccess: () => toast.success(`"${media.name}" added`) }
    );
  }

  function removeItem(idx: number) {
    if (!selected) return;
    const next = (selected.items ?? []).filter((_: any, i: number) => i !== idx);
    setItems.mutate(
      { id: selected.id, items: buildPayload(next) },
      { onSuccess: () => toast.success("Item removed") }
    );
  }

  function move(idx: number, dir: -1 | 1) {
    if (!selected) return;
    const items = [...(selected.items ?? [])];
    const [item] = items.splice(idx, 1);
    items.splice(idx + dir, 0, item);
    setItems.mutate({ id: selected.id, items: buildPayload(items) });
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── LEFT: playlist list ── */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Playlists</h1>
            <p className="text-xs text-gray-400 mt-0.5">{playlistsData?.count ?? 0} total</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={12} />
            New
          </Button>
        </div>

        {/* New playlist form */}
        {showForm && (
          <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-3">
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Playlist name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={(e) => e.key === "Enter" && form.name && create.mutate(form)}
            />
            <div className="flex gap-1.5">
              {["media_list", "external_url"].map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    form.type === t ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200"
                  )}
                >
                  {t === "media_list" ? "Media list" : "External URL"}
                </button>
              ))}
            </div>
            {form.type === "external_url" && (
              <input
                value={form.external_url}
                onChange={(e) => setForm((f) => ({ ...f, external_url: e.target.value }))}
                placeholder="https://..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
            <div className="flex gap-1.5">
              <Button size="sm" onClick={() => create.mutate(form)} loading={create.isPending} disabled={!form.name}>
                Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Playlist list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : playlists.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No playlists yet.</div>
          ) : (
            playlists.map((p) => (
              <div
                key={p.id}
                onClick={() => { setSelected(p); setConfirmDelete(null); setMediaSearch(""); setDurationEdits({}); }}
                className={cn(
                  "px-4 py-3.5 border-b border-gray-50 cursor-pointer transition-all",
                  selected?.id === p.id ? "bg-indigo-50 border-l-2 border-l-indigo-500" : "hover:bg-gray-50"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-sm font-medium truncate", selected?.id === p.id ? "text-indigo-700" : "text-gray-800")}>
                    {p.name}
                  </span>
                  <Badge variant={p.type === "external_url" ? "info" : "default"} className="flex-shrink-0">
                    {p.type === "external_url" ? "URL" : `${p.item_count}`}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-gray-400">v{p.version}</span>
                  {confirmDelete === p.id ? (
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => remove.mutate(p.id)} className="text-xs text-red-600 font-medium hover:underline">Delete</button>
                      <span className="text-gray-300">·</span>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: editor ── */}
      {selected ? (
        <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
          {/* Header */}
          <div className="px-6 py-5 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{selected.name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{(selected.items ?? []).length} items · version {selected.version}</p>
            </div>
            {selected.type === "external_url" && (
              <a href={selected.external_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
                <ExternalLink size={13} />
                Open URL
              </a>
            )}
          </div>

          <div className="flex-1 overflow-hidden flex gap-0">
            {selected.type === "external_url" ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <ExternalLink size={32} className="mx-auto text-gray-300" />
                  <p className="text-sm text-gray-500 font-medium">External URL playlist</p>
                  <a href={selected.external_url} className="text-sm text-indigo-600 underline break-all" target="_blank" rel="noreferrer">
                    {selected.external_url}
                  </a>
                </div>
              </div>
            ) : (
              <>
                {/* ── Current items ── */}
                <div className="w-72 flex-shrink-0 flex flex-col border-r border-gray-200 bg-white">
                  <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Queue · {(selected.items ?? []).length} items</p>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {(selected.items ?? []).length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-400">
                        No items yet.<br />Pick media from the right →
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {(selected.items ?? []).map((item: any, i: number) => {
                          const media = item.media_detail;
                          const effectiveDur =
                            i in durationEdits
                              ? (durationEdits[i] ?? item.duration_seconds ?? media?.duration_seconds ?? 10)
                              : (item.duration_seconds ?? media?.duration_seconds ?? 10);
                          const isVideo = media?.media_type === "video";
                          return (
                            <div key={item.id ?? i} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 group">
                              {/* Thumbnail */}
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                <MediaThumb item={media} size="sm" />
                              </div>
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-800 truncate">
                                  {media?.name ?? `Media ${item.media}`}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{media?.media_type}</p>
                              </div>
                              {/* Duration input */}
                              <div className="flex items-center gap-0.5 flex-shrink-0" title={isVideo ? "Duration override for videos" : "Display duration in seconds"}>
                                <input
                                  type="number"
                                  min={1}
                                  max={3600}
                                  value={effectiveDur}
                                  onChange={(e) =>
                                    setDurationEdits((prev) => ({ ...prev, [i]: parseInt(e.target.value) || 1 }))
                                  }
                                  onBlur={(e) => saveDuration(i, parseInt(e.target.value) || 1)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                  }}
                                  className="w-12 text-center text-xs border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                                />
                                <span className="text-[10px] text-gray-400">s</span>
                              </div>
                              {/* Move controls */}
                              <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20">
                                  <ArrowUp size={11} />
                                </button>
                                <button onClick={() => move(i, 1)} disabled={i === (selected.items.length - 1)} className="text-gray-300 hover:text-gray-600 disabled:opacity-20">
                                  <ArrowDown size={11} />
                                </button>
                              </div>
                              <button onClick={() => removeItem(i)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Media picker ── */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3 flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-shrink-0">Add media</p>
                    <div className="relative flex-1 max-w-xs">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={mediaSearch}
                        onChange={(e) => setMediaSearch(e.target.value)}
                        placeholder="Search by name…"
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {filteredMedia.length === 0 ? (
                      <EmptyState icon={Layers} title="No media found" description={mediaSearch ? "Try a different search term." : "Upload media files first."} />
                    ) : (
                      <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                        {filteredMedia.map((m) => {
                          const alreadyIn = inPlaylist.has(m.id);
                          return (
                            <button
                              key={m.id}
                              onClick={() => addMedia(m)}
                              className={cn(
                                "relative group rounded-xl overflow-hidden border text-left transition-all",
                                "hover:shadow-md hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500",
                                alreadyIn ? "border-indigo-200 bg-indigo-50/50" : "border-gray-200 bg-white"
                              )}
                            >
                              {/* Thumbnail */}
                              <div className="relative aspect-video bg-gray-100 overflow-hidden">
                                {m.media_type === "image"
                                  ? <img src={m.file_url} alt={m.name} className="w-full h-full object-cover" />
                                  : <video src={m.file_url} className="w-full h-full object-cover" muted />
                                }
                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/20 transition-colors flex items-center justify-center">
                                  <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                    <Plus size={14} className="text-indigo-600" />
                                  </div>
                                </div>
                                {/* Already-added badge */}
                                {alreadyIn && (
                                  <div className="absolute top-1.5 right-1.5">
                                    <CheckCircle2 size={14} className="text-indigo-500 drop-shadow-sm" />
                                  </div>
                                )}
                                {/* Duration chip */}
                                <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                                  {fmtDuration(m.duration_seconds)}
                                </div>
                                {/* Type chip */}
                                {m.media_type === "video" && (
                                  <div className="absolute top-1.5 left-1.5 bg-black/60 text-white rounded p-0.5">
                                    <Film size={10} />
                                  </div>
                                )}
                              </div>
                              {/* Name */}
                              <div className="px-2.5 py-2">
                                <p className="text-xs font-medium text-gray-800 truncate">{m.name}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <EmptyState
            icon={Layers}
            title="Select a playlist"
            description="Choose a playlist from the left, or create a new one."
            action={<Button onClick={() => setShowForm(true)}><Plus size={14} />New playlist</Button>}
          />
        </div>
      )}
    </div>
  );
}
