import { useQuery } from "@tanstack/react-query";
import { BarChart3, Clock, Monitor, Play } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";

function fmt(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

const RANGES = [
  { label: "Last 24h", hours: 24 },
  { label: "Last 7 days", hours: 168 },
  { label: "Last 30 days", hours: 720 },
  { label: "All time", hours: null },
];

export default function Analytics() {
  const [range, setRange] = useState(RANGES[1]);

  const since = range.hours
    ? new Date(Date.now() - range.hours * 3600_000).toISOString()
    : undefined;

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ["analytics-summary", since],
    queryFn: () => api.get("/api/analytics/summary/", { params: since ? { since } : {} }).then(r => r.data),
  });

  const { data: eventsData, isLoading: evLoading } = useQuery({
    queryKey: ["analytics-plays", since],
    queryFn: () => api.get("/api/analytics/plays/", { params: since ? { since } : {} }).then(r => r.data),
  });

  const events: any[] = eventsData ?? [];
  const topMedia: any[] = summary?.top_media ?? [];
  const byDevice: any[] = summary?.by_device ?? [];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Proof-of-play across all devices</p>
        </div>
        <div className="flex gap-1.5">
          {RANGES.map(r => (
            <button
              key={r.label}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${range.label === r.label ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      {sumLoading ? (
        <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={Play}     label="Total plays"     value={summary?.total_plays?.toLocaleString() ?? "0"}       color="bg-indigo-50 text-indigo-600" />
          <StatCard icon={Clock}    label="Total airtime"   value={fmt(summary?.total_duration_seconds ?? 0)}            color="bg-emerald-50 text-emerald-600" />
          <StatCard icon={Monitor}  label="Active devices"  value={String(byDevice.filter(d => d.plays > 0).length)}    color="bg-amber-50 text-amber-600" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Top media */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <BarChart3 size={14} className="text-indigo-500" />
            <h2 className="text-sm font-semibold text-gray-900">Top media</h2>
          </div>
          {sumLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded-lg" />)}</div>
          ) : topMedia.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No plays recorded yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {topMedia.map((m, i) => {
                const maxPlays = topMedia[0]?.plays ?? 1;
                const pct = Math.round((m.plays / maxPlays) * 100);
                return (
                  <div key={m.media__id} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                        <span className="text-sm text-gray-800 truncate">{m.media__name}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <span className="text-xs text-gray-400">{fmt(m.seconds)}</span>
                        <span className="text-xs font-semibold text-gray-700">{m.plays}×</span>
                      </div>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* By device */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Monitor size={14} className="text-indigo-500" />
            <h2 className="text-sm font-semibold text-gray-900">By device</h2>
          </div>
          {sumLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
          ) : byDevice.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No plays recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Device", "Plays", "Airtime"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {byDevice.map(d => (
                  <tr key={d.device__id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-800">{d.device__name}</td>
                    <td className="px-5 py-3 text-gray-600">{d.plays.toLocaleString()}</td>
                    <td className="px-5 py-3 text-gray-400">{fmt(d.seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent play log */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent plays</h2>
        </div>
        {evLoading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
        ) : events.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No play events in this time range.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Time", "Device", "Media", "Playlist", "Duration"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {events.map((e: any) => (
                <tr key={e.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-xs text-gray-400 tabular-nums whitespace-nowrap">{new Date(e.played_at).toLocaleString()}</td>
                  <td className="px-5 py-3 text-gray-700">{e.device_name}</td>
                  <td className="px-5 py-3 text-gray-800 font-medium truncate max-w-[180px]">{e.media_name}</td>
                  <td className="px-5 py-3 text-gray-500">{e.playlist_name ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-400">{fmt(e.duration_seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
