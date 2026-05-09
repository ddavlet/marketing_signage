import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL   = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const PRESETS = [
  { label: "Weekdays",  days: [0,1,2,3,4] },
  { label: "Weekend",   days: [5,6] },
  { label: "Every day", days: [0,1,2,3,4,5,6] },
];

function DayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="flex gap-1">
      {DAY_LABELS.map((d, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(value.includes(i) ? value.filter(x => x !== i) : [...value, i])}
          className={cn(
            "w-9 h-8 rounded-lg text-xs font-semibold transition-all",
            value.includes(i)
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          )}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

function ScheduleRow({ s, onDelete }: { s: any; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const activeDays = (s.days_of_week as number[]).map(d => DAY_LABELS[d]).join(", ");

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{s.label || s.playlist_name || `Playlist ${s.playlist}`}</span>
          {!s.is_active && <Badge variant="warning">inactive</Badge>}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{activeDays} · {s.start_time.slice(0,5)} – {s.end_time.slice(0,5)}</p>
      </div>
      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {confirm ? (
          <>
            <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
          </>
        ) : (
          <button onClick={() => setConfirm(true)} className="text-gray-300 hover:text-red-500 p-1 transition-colors">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  device: "",
  playlist: "",
  label: "",
  days_of_week: [0,1,2,3,4] as number[],
  start_time: "09:00",
  end_time: "17:00",
  priority: 0,
  is_active: true,
};

export default function Schedules() {
  const qc = useQueryClient();
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: devicesData } = useQuery({ queryKey: ["devices"], queryFn: () => api.get("/api/devices/").then(r => r.data) });
  const { data: playlistsData } = useQuery({ queryKey: ["playlists"], queryFn: () => api.get("/api/playlists/").then(r => r.data) });
  const { data: schedulesData, isLoading } = useQuery({
    queryKey: ["schedules", selectedDevice],
    queryFn: () => api.get("/api/schedules/", { params: selectedDevice ? { device: selectedDevice } : {} }).then(r => r.data),
  });

  const devices: any[]   = devicesData?.results ?? [];
  const playlists: any[] = playlistsData?.results ?? [];
  const schedules: any[] = schedulesData?.results ?? [];

  const create = useMutation({
    mutationFn: (payload: any) => api.post("/api/schedules/", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
      setShowForm(false);
      setForm({ ...EMPTY_FORM, device: selectedDevice });
      toast.success("Schedule created");
    },
    onError: () => toast.error("Failed to create schedule"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/schedules/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["schedules"] }); toast.success("Schedule deleted"); },
    onError: () => toast.error("Failed to delete schedule"),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedules</h1>
          <p className="text-sm text-gray-500 mt-0.5">Assign playlists to devices by time of day</p>
        </div>
        <Button onClick={() => { setShowForm(true); setForm({ ...EMPTY_FORM, device: selectedDevice }); }}>
          <Plus size={14} />
          New schedule
        </Button>
      </div>

      {/* Device filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 font-medium">Device:</span>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedDevice("")}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", !selectedDevice ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}
          >
            All
          </button>
          {devices.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDevice(String(d.id))}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", selectedDevice === String(d.id) ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">New schedule</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Device</label>
              <select value={form.device} onChange={e => setForm(f => ({ ...f, device: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— choose —</option>
                {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Playlist</label>
              <select value={form.playlist} onChange={e => setForm(f => ({ ...f, playlist: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— choose —</option>
                {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Label <span className="text-gray-400">(optional)</span></label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Morning show, Lunch…" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Priority <span className="text-gray-400">(higher wins on overlap)</span></label>
              <input type="number" min={0} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Days */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <label className="block text-xs font-medium text-gray-600">Days</label>
              <div className="flex gap-1.5">
                {PRESETS.map(p => (
                  <button key={p.label} type="button" onClick={() => setForm(f => ({ ...f, days_of_week: p.days }))}
                    className="text-[10px] px-2 py-0.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <DayPicker value={form.days_of_week} onChange={days => setForm(f => ({ ...f, days_of_week: days }))} />
          </div>

          {/* Time range */}
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Start time</label>
              <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <span className="text-gray-400 mt-5">→</span>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">End time</label>
              <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={() => create.mutate({ ...form, days_of_week: form.days_of_week, start_time: form.start_time + ':00', end_time: form.end_time + ':00' })} loading={create.isPending} disabled={!form.device || !form.playlist || !form.days_of_week.length}>
              Create
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : schedules.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No schedules yet"
          description="Create a schedule to show different playlists at different times of day."
          action={<Button onClick={() => setShowForm(true)}><Plus size={14} />New schedule</Button>}
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-50">
          {schedules.map(s => (
            <ScheduleRow key={s.id} s={s} onDelete={() => remove.mutate(s.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
