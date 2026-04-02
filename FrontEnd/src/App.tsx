import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { InvestorDashboard } from "@/pages/InvestorDashboard";
import { Holdings } from "@/pages/Holdings";
import { PoolDetail } from "@/pages/PoolDetail";
import { CowDetail } from "@/pages/CowDetail";
import { Rancher } from "@/pages/Rancher";
import { Login } from "@/pages/Login";
import { SignUp } from "@/pages/SignUp";
import { Admin } from "@/pages/Admin";
import { InvestPage } from "@/pages/InvestPage";
import { FeedlotPage } from "@/pages/FeedlotPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* No-auth investor login shortcuts */}
        <Route path="/login/investor1" element={<Navigate to="/investor/investor1/dashboard" replace />} />
        <Route path="/login/investor2" element={<Navigate to="/investor/investor2/dashboard" replace />} />
        <Route path="/login/investor3" element={<Navigate to="/investor/investor3/dashboard" replace />} />
        <Route path="/login/investor4" element={<Navigate to="/investor/investor4/dashboard" replace />} />
        <Route path="/login/investor5" element={<Navigate to="/investor/investor5/dashboard" replace />} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/investor/investor1/dashboard" replace />} />

        {/* Legacy redirect — old /investor path goes to investor1 dashboard */}
        <Route path="/investor" element={<Navigate to="/investor/investor1/dashboard" replace />} />

        {/* All investor routes — scoped per slug */}
        <Route element={<AppShell />}>
          {/* Dashboard */}
          <Route path="/investor/:slug/dashboard" element={<InvestorDashboard />} />

          {/* Holdings / marketplace — all herds listed */}
          <Route path="/investor/:slug/holdings" element={<Holdings />} />

          {/* Herd detail — investor-specific view */}
          <Route path="/investor/:slug/holdings/:id" element={<PoolDetail />} />

          {/* Cow detail */}
          <Route path="/investor/:slug/cow/:cowId" element={<CowDetail />} />

          {/* Invest page */}
          <Route path="/invest/:herdId" element={<InvestPage />} />

          {/* Non-investor portals */}
          <Route path="/rancher" element={<Rancher />} />
          <Route path="/feedlot" element={<FeedlotPage />} />
          <Route path="/admin" element={<Admin />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
      </Routes>
    </BrowserRouter>
  );
}