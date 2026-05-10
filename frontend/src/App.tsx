import { Route, Routes } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { ProtectedRoute, RoleRoute } from "@/routes";
import Analytics from "@/pages/Analytics";
import Dashboard from "@/pages/Dashboard";
import Devices from "@/pages/Devices";
import Locations from "@/pages/Locations";
import Login from "@/pages/Login";
import Media from "@/pages/Media";
import PendingDevices from "@/pages/PendingDevices";
import Playlists from "@/pages/Playlists";
import Releases from "@/pages/Releases";
import Schedules from "@/pages/Schedules";
import Users from "@/pages/Users";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="media" element={<Media />} />
          <Route path="playlists" element={<Playlists />} />
          <Route path="locations" element={<Locations />} />
          <Route path="devices" element={<Devices />} />
          <Route path="devices/pending" element={<PendingDevices />} />
          <Route path="schedules" element={<Schedules />} />
          <Route path="analytics" element={<Analytics />} />

          {/* Admin only */}
          <Route element={<RoleRoute allow={["admin"]} />}>
            <Route path="users" element={<Users />} />
          </Route>

          {/* Admin + manager */}
          <Route element={<RoleRoute allow={["admin", "manager"]} />}>
            <Route path="releases" element={<Releases />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
