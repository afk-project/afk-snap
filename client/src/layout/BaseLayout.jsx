import { Outlet } from "react-router";
import Navbar from "../components/Navbar";
import RouteErrorBoundary from "../components/RouteErrorBoundary";

export default function BaseLayout() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)] transition-colors">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><RouteErrorBoundary><Outlet /></RouteErrorBoundary></main>
    </div>
  );
}
