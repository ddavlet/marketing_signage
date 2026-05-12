import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  MapPin,
  Monitor,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

// ── helpers ────────────────────────────────────────────────────────────────

/** Flatten the location tree into a list (for dropdowns). */
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

/** Build a map locationId → Device[] from the flat device list. */
function groupByLocation(devices: any[]): Map<number | null, any[]> {
  const map = new Map<number | null, any[]>();
  for (const d of devices) {
    const key = d.location ?? null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }
  return map;
}

// ── sub-components ─────────────────────────────────────────────────────────

function DeviceRow({
  device,
  depth,
  selected,
  onClick,
}: {
  device: any;
  depth: number;
  selected: boolean;
  onClick: () => void;
}) {
  const online = device.status === "online";
  return (
    <div
      onClick={onClick}
      style={{ paddingLeft: `${20 + depth * 20}px` }}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 cursor-pointer border-l-2 transition-all",
        selected
          ? "bg-indigo-50 border-l-indigo-500"
          : "border-l-transparent hover:bg-gray-50"
      )}
    >
      <Monitor
        size={14}
        className={cn("flex-shrink-0", selected ? "text-indigo-500" : "text-gray-400")}
      />
      <span
        className={cn(
          "text-sm flex-1 truncate",
          selected ? "font-semibold text-indigo-700" : "font-medium text-gray-700"
        )}
      >
        {device.name}
      </span>
      <span
        className={cn(
          "w-2 h-2 rounded-full flex-shrink-0",
          online ? "bg-green-500" : "bg-gray-300"
        )}
        title={device.status}
      />
    </div>
  );
}

function LocationGroup({
  location,
  devices,
  depth,
  selectedId,
  onSelect,
}: {
  location: { id: number; name: string } | null;
  devices: any[];
  depth: number;
  selectedId: number | null;
  onSelect: (d: any) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      {/* Location header */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ paddingLeft: `${8 + depth * 20}px` }}
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 select-none"
      >
        <ChevronRight
          size={12}
          className={cn("text-gray-400 transition-transform flex-shrink-0", open && "rotate-90")}
        />
        {location ? (
          <MapPin size={13} className="text-indigo-400 flex-shrink-0" />
        ) : (
          <Monitor size={13} className="text-gray-300 flex-shrink-0" />
        )}
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-1 truncate">
          {location ? location.name : "Unassigned"}
        </span>
        <span className="text-[10px] text-gray-400 flex-shrink-0">{devices.length}</span>
      </div>

      {/* Devices */}
      {open &&
        devices.map((d) => (
          <DeviceRow
            key={d.id}
            device={d}
            depth={depth + 1}
            selected={selectedId === d.id}
            onClick={() => onSelect(d)}
          />
        ))}
    </div>
  );
}

// ── device detail panel ────────────────────────────────────────────────────

function DeviceDetail({
  device,
  flatLocations,
  playlists,
  onUpdate,
}: {
  device: any;
  flatLocations: { id: number; name: string; depth: number }[];
  playlists: any[];
  onUpdate: (updated: any) => void;
}) {
  const [form, setForm] = useState({
    name: device.name,
    location: device.location ?? "",
    assigned_playlist: device.assigned_playlist ?? "",
    sync_interval_seconds: device.sync_interval_seconds ?? 60,
    update_channel: device.update_channel ?? "stable",
    screen_on_time: device.screen_on_time ?? "",
    screen_off_time: device.screen_off_time ?? "",
    timezone: device.timezone ?? "UTC",
    ssh_port: device.ssh_port != null ? String(device.ssh_port) : "",
  });
  const [dirty, setDirty] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [confirmReboot, setConfirmReboot] = useState(false);

  // Reset form when device changes
  useEffect(() => {
    setForm({
      name: device.name,
      location: device.location ?? "",
      assigned_playlist: device.assigned_playlist ?? "",
      sync_interval_seconds: device.sync_interval_seconds ?? 60,
      update_channel: device.update_channel ?? "stable",
      screen_on_time: device.screen_on_time ?? "",
      screen_off_time: device.screen_off_time ?? "",
      timezone: device.timezone ?? "UTC",
      ssh_port: device.ssh_port != null ? String(device.ssh_port) : "",
    });
    setDirty(false);
    setShowKey(false);
    setRevealedKey(null);
    setConfirmRegen(false);
  }, [device.id]);

  const save = useMutation({
    mutationFn: (data: any) => api.patch(`/api/devices/${device.id}/`, data),
    onSuccess: (res) => {
      onUpdate(res.data);
      setDirty(false);
      toast.success("Device updated");
    },
    onError: () => toast.error("Failed to save"),
  });

  const sendCmd = useMutation({
    mutationFn: (kind: string) =>
      api.post(`/api/devices/${device.id}/send-command/`, { kind }),
    onSuccess: (_res, kind) => {
      toast.success(kind === "reboot" ? "Reboot queued" : "Restart queued — device picks up on next heartbeat");
      setConfirmReboot(false);
    },
    onError: () => toast.error("Failed to send command"),
  });

  const regen = useMutation({
    mutationFn: () => api.post(`/api/devices/${device.id}/regenerate-key/`),
    onSuccess: (res) => {
      setRevealedKey(res.data.api_key);
      setConfirmRegen(false);
      setShowKey(true);
      onUpdate(res.data);
      toast.success("API key regenerated");
    },
    onError: () => toast.error("Failed to regenerate key"),
  });

  function handleChange(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
  }

  function handleSave() {
    save.mutate({
      name: form.name,
      location: form.location || null,
      assigned_playlist: form.assigned_playlist || null,
      sync_interval_seconds: Number(form.sync_interval_seconds) || 60,
      update_channel: form.update_channel,
      screen_on_time: form.screen_on_time || null,
      screen_off_time: form.screen_off_time || null,
      timezone: form.timezone || "UTC",
      ssh_port: form.ssh_port ? Number(form.ssh_port) : null,
    });
  }

  const online = device.status === "online";
  const displayKey = revealedKey ?? "••••••••-••••-••••-••••-••••••••••••";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Monitor size={16} className="text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-gray-900 truncate">{device.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", online ? "bg-green-500" : "bg-gray-300")} />
              <span className="text-xs text-gray-500">{device.status}</span>
              {device.last_seen && (
                <span className="text-xs text-gray-400">
                  · last seen {new Date(device.last_seen).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          {dirty && (
            <Button size="sm" onClick={handleSave} loading={save.isPending}>
              <Save size={12} />
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Name
          </label>
          <input
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Location
          </label>
          <div className="relative">
            <MapPin
              size={13}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <select
              value={form.location}
              onChange={(e) => handleChange("location", e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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
        </div>

        {/* Playlist */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Playlist
          </label>
          <select
            value={form.assigned_playlist}
            onChange={(e) => handleChange("assigned_playlist", e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="">— None —</option>
            {playlists.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <hr className="border-gray-100" />

        {/* Player agent settings */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Player agent</p>

          {/* Sync interval + update channel */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Sync interval (s)
              </label>
              <input
                type="number"
                min={10}
                max={3600}
                value={form.sync_interval_seconds}
                onChange={(e) => handleChange("sync_interval_seconds", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Update channel
              </label>
              <div className="flex gap-1.5">
                {["stable", "beta"].map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => handleChange("update_channel", ch)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-xs font-semibold capitalize border transition-all",
                      form.update_channel === ch
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Screen schedule */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Screen schedule <span className="text-gray-400 font-normal">(leave blank = always on)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={form.screen_on_time}
                onChange={(e) => handleChange("screen_on_time", e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-gray-400">→</span>
              <input
                type="time"
                value={form.screen_off_time}
                onChange={(e) => handleChange("screen_off_time", e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Timezone</label>
            <input
              value={form.timezone}
              onChange={(e) => handleChange("timezone", e.target.value)}
              placeholder="UTC"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* SSH / Remote access */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SSH / Remote access</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Reverse tunnel port <span className="text-gray-400 font-normal">(leave blank if not configured)</span>
            </label>
            <input
              type="number"
              min={1}
              max={65535}
              value={form.ssh_port}
              onChange={(e) => handleChange("ssh_port", e.target.value)}
              placeholder="e.g. 2223"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {form.ssh_port && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
              <code className="flex-1 text-xs font-mono text-gray-600 break-all">
                {`ssh -J syrop user@localhost -p ${form.ssh_port}`}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`ssh -J syrop user@localhost -p ${form.ssh_port}`);
                  toast.success("SSH command copied");
                }}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <Copy size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Commands */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Commands</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => sendCmd.mutate("restart_chromium")}
              disabled={sendCmd.isPending}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700 font-medium transition-all disabled:opacity-50"
            >
              <RotateCcw size={14} className="text-indigo-500" />
              Restart Chromium
            </button>
            {confirmReboot ? (
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500 flex-1">Reboot the device OS?</p>
                <Button
                  size="sm"
                  variant="danger"
                  loading={sendCmd.isPending}
                  onClick={() => sendCmd.mutate("reboot")}
                >
                  Confirm reboot
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmReboot(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReboot(true)}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700 font-medium transition-all"
              >
                <Power size={14} className="text-red-400" />
                Reboot device
              </button>
            )}
          </div>
        </div>

        {/* Device info (read-only) */}
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Device info</p>
          {/* Player version */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400 flex-shrink-0">Player version</span>
            <span className="text-xs text-gray-700 font-mono">{device.player_version || "—"}</span>
          </div>
          {/* OS */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400 flex-shrink-0">OS</span>
            <span className="text-xs text-gray-700 text-right">
              {device.os_info?.pretty_name || device.os_info?.id || "—"}
            </span>
          </div>
          {/* Hardware ID with copy */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400 flex-shrink-0">Hardware ID</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs text-gray-700 font-mono truncate max-w-[120px]" title={device.hardware_id}>
                {device.hardware_id ? `${device.hardware_id.slice(0, 8)}…` : "—"}
              </span>
              {device.hardware_id && (
                <button
                  onClick={() => { navigator.clipboard.writeText(device.hardware_id); toast.success("Hardware ID copied"); }}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <Copy size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* API key */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            API key
          </label>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-gray-700 break-all">
                {showKey && revealedKey ? revealedKey : displayKey}
              </code>
              <button
                onClick={() => setShowKey((v) => !v)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                title={showKey ? "Hide" : "Show key (requires regenerate)"}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              {revealedKey && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(revealedKey);
                    toast.success("Key copied");
                  }}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <Copy size={14} />
                </button>
              )}
            </div>

            {revealedKey && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Save this key — it won't be shown again after you leave this page.
              </div>
            )}

            {confirmRegen ? (
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500 flex-1">
                  This will invalidate the current key.
                </p>
                <Button size="sm" variant="danger" loading={regen.isPending} onClick={() => regen.mutate()}>
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmRegen(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setConfirmRegen(true)}>
                <RefreshCw size={12} />
                Regenerate key
              </Button>
            )}
          </div>

          {/* Kiosk URL */}
          <div className="mt-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Kiosk URL
            </label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
              <code className="flex-1 text-xs font-mono text-gray-600 break-all">
                {`${window.location.origin}/player/${device.api_key ?? "…"}/`}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/player/${device.api_key}/`
                  );
                  toast.success("URL copied");
                }}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── register form ───────────────────────────────────────────────────────────

function RegisterForm({
  flatLocations,
  playlists,
  onSuccess,
  onCancel,
}: {
  flatLocations: { id: number; name: string; depth: number }[];
  playlists: any[];
  onSuccess: (device: any) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ name: "", location: "", assigned_playlist: "" });

  const create = useMutation({
    mutationFn: (payload: any) => api.post("/api/devices/", payload),
    onSuccess: (res) => {
      onSuccess(res.data);
      toast.success(`"${res.data.name}" registered`);
    },
    onError: () => toast.error("Failed to register device"),
  });

  return (
    <div className="p-4 border-b border-gray-200 bg-indigo-50 space-y-3">
      <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">New device</p>
      <input
        autoFocus
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        placeholder="Device name"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        onKeyDown={(e) => e.key === "Enter" && form.name && create.mutate({ name: form.name, location: form.location || null, assigned_playlist: form.assigned_playlist || null })}
      />
      <select
        value={form.location}
        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
      >
        <option value="">— Unassigned —</option>
        {flatLocations.map((l) => (
          <option key={l.id} value={l.id}>
            {"  ".repeat(l.depth)}{l.depth > 0 ? "↳ " : ""}{l.name}
          </option>
        ))}
      </select>
      <select
        value={form.assigned_playlist}
        onChange={(e) => setForm((f) => ({ ...f, assigned_playlist: e.target.value }))}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
      >
        <option value="">— No playlist —</option>
        {playlists.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <div className="flex gap-1.5">
        <Button
          size="sm"
          onClick={() => create.mutate({ name: form.name, location: form.location || null, assigned_playlist: form.assigned_playlist || null })}
          loading={create.isPending}
          disabled={!form.name}
        >
          Register
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────

export default function Devices() {
  const qc = useQueryClient();

  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.get("/api/devices/").then((r) => r.data),
    refetchInterval: 30_000,
  });
  const { data: locationsData } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.get("/api/locations/").then((r) => r.data),
  });
  const { data: playlistsData } = useQuery({
    queryKey: ["playlists"],
    queryFn: () => api.get("/api/playlists/").then((r) => r.data),
  });

  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  const devices: any[] = devicesData?.results ?? [];
  const locationTree: any[] = locationsData?.results ?? [];
  const playlists: any[] = playlistsData?.results ?? [];
  const flatLocations = flattenTree(locationTree);
  const byLocation = groupByLocation(devices);

  // When a device is updated, refresh it in the selected state
  function handleDeviceUpdate(updated: any) {
    qc.invalidateQueries({ queryKey: ["devices"] });
    setSelectedDevice(updated);
  }

  // Collect all location IDs that exist in the tree (so we can find truly unassigned)
  const knownLocationIds = new Set(flatLocations.map((l) => l.id));
  const unassigned = devices.filter(
    (d) => d.location === null || d.location === undefined || !knownLocationIds.has(d.location)
  );

  const onlineCount = devices.filter((d) => d.status === "online").length;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── LEFT: tree ── */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        {/* Header */}
        <div className="px-4 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-gray-900">Devices</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {onlineCount} online · {devices.length} total
              </p>
            </div>
            <Button size="sm" onClick={() => { setShowRegister(true); setSelectedDevice(null); }}>
              <Plus size={12} />
              New
            </Button>
          </div>
        </div>

        {/* Register form */}
        {showRegister && (
          <RegisterForm
            flatLocations={flatLocations}
            playlists={playlists}
            onSuccess={(d) => {
              qc.invalidateQueries({ queryKey: ["devices"] });
              setShowRegister(false);
              setSelectedDevice(d);
            }}
            onCancel={() => setShowRegister(false)}
          />
        )}

        {/* Tree */}
        <div className="flex-1 overflow-y-auto py-2">
          {devicesLoading ? (
            <div className="px-4 space-y-2 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className={cn("h-8 rounded-lg", i % 3 === 0 ? "w-full" : "w-4/5 ml-4")} />
              ))}
            </div>
          ) : devices.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No devices yet.
            </div>
          ) : (
            <>
              {/* Locations with their devices */}
              {flatLocations
                .filter((l) => byLocation.has(l.id))
                .map((loc) => (
                  <LocationGroup
                    key={loc.id}
                    location={loc}
                    devices={byLocation.get(loc.id) ?? []}
                    depth={loc.depth}
                    selectedId={selectedDevice?.id ?? null}
                    onSelect={(d) => { setSelectedDevice(d); setShowRegister(false); }}
                  />
                ))}

              {/* Locations with no devices — still show so hierarchy is visible */}
              {flatLocations
                .filter((l) => !byLocation.has(l.id))
                .map((loc) => (
                  <div
                    key={loc.id}
                    style={{ paddingLeft: `${8 + loc.depth * 20}px` }}
                    className="flex items-center gap-2 px-3 py-2 opacity-40 select-none"
                  >
                    <ChevronRight size={12} className="text-gray-300" />
                    <MapPin size={13} className="text-gray-300 flex-shrink-0" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">
                      {loc.name}
                    </span>
                    <span className="text-[10px] text-gray-300">0</span>
                  </div>
                ))}

              {/* Unassigned */}
              {unassigned.length > 0 && (
                <LocationGroup
                  location={null}
                  devices={unassigned}
                  depth={0}
                  selectedId={selectedDevice?.id ?? null}
                  onSelect={(d) => { setSelectedDevice(d); setShowRegister(false); }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT: detail ── */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        {selectedDevice ? (
          <DeviceDetail
            key={selectedDevice.id}
            device={selectedDevice}
            flatLocations={flatLocations}
            playlists={playlists}
            onUpdate={handleDeviceUpdate}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Monitor size={20} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Select a device to manage it</p>
              <p className="text-xs text-gray-400 mt-1">or register a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
