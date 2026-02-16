import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Dashboard } from "@/pages/Dashboard";
import { Holdings } from "@/pages/Holdings";
import { PoolDetail } from "@/pages/PoolDetail";
import { CowDetail } from "@/pages/CowDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/investor" element={<Dashboard />} />
          <Route path="/investor/holdings" element={<Holdings />} />
          <Route path="/investor/holdings/:id" element={<PoolDetail />} />
          <Route path="/investor/cows/:cowId" element={<CowDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/investor" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
