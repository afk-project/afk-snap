import { ChartNoAxesCombined, Gem, Images, LayoutDashboard, LogOut, Menu, UserRound, Users, X } from "lucide-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, useNavigate } from "react-router";
import { logout } from "../features/authSlice";
import CreditBadge from "./CreditBadge";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/rooms", label: "Rooms", icon: Users },
  { to: "/studio", label: "Studio", icon: Images },
  { to: "/creations", label: "Kreasi", icon: Images },
  { to: "/upgrade", label: "Upgrade", icon: Gem },
  { to: "/profile", label: "Profil", icon: UserRound },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const visibleLinks = user?.role === "admin"
    ? [...links, { to: "/admin/reports", label: "Admin", icon: ChartNoAxesCombined }]
    : links;

  const handleLogout = () => {
    dispatch({ type: "socket/disconnect" });
    dispatch(logout());
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo to="/dashboard" />
        <nav className="hidden items-center gap-1 md:flex">
          {visibleLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  isActive ? "bg-orange-500 text-white" : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                }`
              }
            >
              <Icon size={17} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <CreditBadge />
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="grid size-10 place-items-center rounded-xl text-[var(--muted)] transition hover:bg-red-500/10 hover:text-red-500"
            title={`Keluar dari akun ${user?.name || ""}`}
          >
            <LogOut size={18} />
          </button>
        </div>
        <button className="text-[var(--text)] md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Buka menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="space-y-2 border-t border-[var(--border)] px-4 py-4 md:hidden">
          {visibleLinks.map(({ to, label }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]">
              {label}
            </NavLink>
          ))}
          <div className="flex items-center justify-between pt-2"><CreditBadge /><ThemeToggle /></div>
          <button onClick={handleLogout} className="w-full rounded-xl bg-red-500/10 px-3 py-2 text-left font-semibold text-red-500">Keluar</button>
        </div>
      )}
    </header>
  );
}
