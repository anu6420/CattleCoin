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

        {/* Investor routes — scoped per slug */}
        <Route element={<AppShell />}>
          <Route path="/investor/:slug/dashboard" element={<InvestorDashboard />} />
          <Route path="/investor/:slug/holdings" element={<Holdings />} />
          <Route path="/investor/holdings/:id" element={<PoolDetail />} />
          <Route path="/investor/cow/:cowId" element={<CowDetail />} />
          <Route path="/invest/:herdId" element={<InvestPage />} />
          <Route path="/rancher" element={<Rancher />} />
          <Route path="/admin" element={<Admin />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
      </Routes>
    </BrowserRouter>
  );
}
