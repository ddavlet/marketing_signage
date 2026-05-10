import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Cpu, Monitor } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

// ── helpers ──────────────────────────────────────────────────────────────

function flattenTree(
  nodes: any[],
  depth = 0
): { id: number; name: string; depth: number }[] {
  const out: { id: number; name: string; depth: number }[] = [];
  for (const n of nodes) {
    out.push({ id: n.id, name: n.name, depth });
    if (n.children?.length) out.push(...flattenTree(n.children, depth + 1));
  }
  return out;
}

// ── card ─────────────────────────────────────────────────────────────────

function PendingCard({
  device,
  flatLocations,
  playlists,
  onApproved,
}: {
  device: any;
  flatLocations: { id: number; name: string; depth: number }[];
  playlists: any[];
  onApproved: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [location, setLocation] = useState<string>("");
  const [playlist, setPlaylist] = useState<string>("");

  const approve = useMutation({
    mutationFn: () =>
      api.post(`/api/devices/${device.id}/approve/`, {
        location: location ? Number(location) : null,
        assigned_playlist: playlist ? Number(playlist) : null,
      }),
    onSuccess: () => {
      toast.success(`"${device.name}" approved`);
      onApproved();
    },
    onError: () => toast.error("Approval failed"),
  });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
          <Monitor size={16} className="text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{device.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
            {device.player_version && <span>v{device.player_version}</span>}
            {device.os_info?.pretty_name && (
              <>
                <span className="text-gray-300">·</span>
                <span>{device.os_info.pretty_name}</span>
              </>
            )}
            {device.os_info?.arch && (
              <>
                <span className="text-gray-300">·</span>
                <span>{device.os_info.arch}</span>
              </>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
            <Cpu size={11} />
            <code className="font-mono truncate">{device.hardware_id || "(no hardware id)"}</code>
          </div>
        </div>
        {!expanded && (
          <Button size="sm" onClick={() => setExpanded(true)}>
            Approve
          </Button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Unassigned —</option>
              {flatLocations.map((l) => (
                <option key={l.id} value={l.id}>
                  {"  ".repeat(l.depth)}
                  {l.depth > 0 ? "↳ " : ""}
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Playlist
            </label>
            <select
              value={playlist}
              onChange={(e) => setPlaylist(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— None —</option>
              {playlists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              loading={approve.isPending}
              onClick={() => approve.mutate()}
            >
              <CheckCircle2 size={12} />
              Confirm approval
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────

export default function PendingDevices() {
  const qc = useQueryClient();

  const { data: pendingData, isLoading } = useQuery({
    queryKey: ["devices", "pending"],
    queryFn: () => api.get("/api/devices/pending/").then((r) => r.data),
    refetchInterval: 15_000,
  });
  const { data: locationsData } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.get("/api/locations/").then((r) => r.data),
  });
  const { data: playlistsData } = useQuery({
    queryKey: ["playlists"],
    queryFn: () => api.get("/api/playlists/").then((r) => r.data),
  });

  const pending: any[] = Array.isArray(pendingData) ? pendingData : pendingData?.results ?? [];
  const flatLocations = flattenTree(locationsData?.results ?? []);
  const playlists: any[] = playlistsData?.results ?? [];

  function handleApproved() {
    qc.invalidateQueries({ queryKey: ["devices"] });
    qc.invalidateQueries({ queryKey: ["devices", "pending"] });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-base font-semibold text-gray-900">Pending devices</h1>
        <p className="text-xs text-gray-500 mt-1">
          Devices that have auto-registered but haven't been approved yet.
          Approving assigns a location and playlist; the device starts playing within one sync interval.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Monitor size={20} className="text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">No devices waiting for approval</p>
          <p className="text-xs text-gray-400 mt-1">
            New devices will appear here automatically when they boot and register.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((d) => (
            <PendingCard
              key={d.id}
              device={d}
              flatLocations={flatLocations}
              playlists={playlists}
              onApproved={handleApproved}
            />
          ))}
        </div>
      )}
    </div>
  );
}
