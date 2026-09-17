import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Route, Routes, useLocation } from "react-router";
import LoadingScreen from "./components/LoadingScreen";
import { authInitialized, fetchMe, logout } from "./features/authSlice";
import { fetchBalance } from "./features/walletSlice";
import BaseLayout from "./layout/BaseLayout";
import CreationsPage from "./pages/CreationsPage";
import CreditsPage from "./pages/CreditsPage";
import DashboardPage from "./pages/DashboardPage";
import LandingPage from "./pages/LandingPage";
import InviteRoomPage from "./pages/InviteRoomPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProfilePage from "./pages/ProfilePage";
import UpgradePage from "./pages/UpgradePage";
import RoomPage from "./pages/RoomPage";
import RoomsPage from "./pages/RoomsPage";
import StudioPage from "./pages/StudioPage";
import AdminReportsPage from "./pages/AdminReportsPage";

function ProtectedRoute() {
  const { authenticated, initialized } = useSelector((state) => state.auth);
  const location = useLocation();
  const hasToken = Boolean(localStorage.getItem("access_token"));
  if (hasToken && !initialized) return <LoadingScreen />;
  return authenticated ? <BaseLayout /> : <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
}

function AdminRoute() {
  const user = useSelector((state) => state.auth.user);
  return user?.role === "admin" ? <AdminReportsPage /> : <Navigate to="/dashboard" replace />;
}

function Bootstrap() {
  const dispatch = useDispatch();
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      dispatch(fetchMe()).then((result) => {
        if (fetchMe.fulfilled.match(result)) {
          dispatch(fetchBalance());
          dispatch({ type: "socket/connect" });
        }
      });
    } else dispatch(authInitialized());

    const handleUnauthorized = () => {
      dispatch({ type: "socket/disconnect" });
      dispatch(logout());
    };
    window.addEventListener("afksnap:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("afksnap:unauthorized", handleUnauthorized);
  }, [dispatch]);
  return null;
}

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <Bootstrap />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/rooms/join/:code" element={<InviteRoomPage />} />
          <Route path="/rooms/:roomId" element={<RoomPage />} />
          <Route path="/creations" element={<CreationsPage />} />
          <Route path="/credits" element={<CreditsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/upgrade" element={<UpgradePage />} />
          <Route path="/admin/reports" element={<AdminRoute />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}
