import { ArrowRight, Bot, CreditCard, Images, LayoutDashboard, LogOut, Moon, Sparkles, Users } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router";
import CreditBadge from "../components/CreditBadge";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import { logout } from "../features/authSlice";

const features = [
  { icon: Images, title: "AI Photo Studio", text: "Ubah selfie menjadi potret studio, animasi, atau tim superhero." },
  { icon: Users, title: "Virtual Photo Bareng", text: "Masuk ke room, unggah foto masing-masing, lalu tampil berdampingan." },
  { icon: Bot, title: "Chatroom + AI", text: "Diskusikan konsep secara realtime dan minta bantuan prompt dari AI." },
  { icon: CreditCard, title: "Card & Story", text: "Siapkan hasil untuk kartu cetak, feed persegi, atau Instagram Story." },
];

export default function LandingPage() {
  const { authenticated, initialized, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch({ type: "socket/disconnect" });
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[var(--canvas)] text-[var(--text)]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {!initialized ? <span className="h-10 w-32 animate-pulse rounded-xl bg-[var(--surface-2)]" /> : authenticated ? <>
            <CreditBadge />
            <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-500/20"><LayoutDashboard size={16} /><span className="hidden sm:inline">Halo, {user?.name?.split(" ")[0] || "User"}</span><span className="sm:hidden">Dashboard</span></Link>
            <button type="button" onClick={handleLogout} className="grid size-10 place-items-center rounded-xl text-[var(--muted)] hover:bg-red-500/10 hover:text-red-500" aria-label="Keluar"><LogOut size={17} /></button>
          </> : <>
            <Link to="/login" className="hidden rounded-xl px-4 py-2 text-sm font-bold text-[var(--text)] sm:block">Masuk</Link>
            <Link to="/register" className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-500/20">Coba gratis</Link>
          </>}
        </div>
      </header>

      <main>
        <section className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8 lg:pt-24">
          <div className="absolute -left-48 top-12 size-96 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-500"><Sparkles size={16} /> Studio foto tanpa jarak</span>
            <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">
              Foto bareng, <span className="text-orange-500">walau berjauhan.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
              AFKSnap menyatukan satu hingga enam orang ke dalam foto AI yang terasa nyata—lengkap dengan chatroom, credit, dan format siap dibagikan atau dicetak.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to={authenticated ? "/dashboard" : "/register"} className="afksnap-cta-flash inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 font-black text-white shadow-xl shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600">{authenticated ? "Lanjut ke Dashboard" : "Login/Daftar untuk 10 credit"} <ArrowRight size={19} /></Link>
              <a href="#fitur" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-4 font-bold text-[var(--text)]">Lihat fitur</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--muted)]"><span>✓ Tanpa kartu kredit</span><span>✓ Mode demo tersedia</span><span>✓ Dark & light mode</span></div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-8 rounded-full bg-gradient-to-r from-orange-500/20 to-blue-500/20 blur-3xl" />
            <div className="afksnap-float relative rotate-2 overflow-hidden rounded-[2.3rem] border border-white/20 bg-gradient-to-br from-slate-900 via-blue-950 to-orange-900 p-5 shadow-2xl">
              <span className="afksnap-motion-flash pointer-events-none absolute inset-0 z-20 bg-white" />
              <span className="afksnap-shimmer pointer-events-none absolute inset-y-0 -left-1/2 z-10 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <div className="flex items-center justify-between pb-4 text-white"><span className="font-black">AFKSnap Studio</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs">AI preview</span></div>
              <div className="grid aspect-square grid-cols-2 gap-3 overflow-hidden rounded-[1.7rem] bg-white/10 p-3">
                {["A", "F", "K", "S"].map((letter, index) => (
                  <div key={letter} style={{ animationDelay: `${index * 180}ms` }} className={`afksnap-tile grid place-items-center rounded-2xl text-5xl font-black text-white ${["bg-orange-400", "bg-blue-400", "bg-violet-500", "bg-emerald-500"][index]}`}>{letter}</div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-white"><p><span className="block text-xs opacity-60">Preset</span><b>Tim Superhero</b></p><span className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold">Generate</span></div>
            </div>
          </div>
        </section>

        <section id="fitur" className="border-y border-[var(--border)] bg-[var(--surface)] py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="max-w-2xl"><p className="font-black uppercase tracking-[.2em] text-orange-500">Satu ruang kreatif</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">Dari selfie sampai kartu kenangan.</h2></div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-3xl border border-[var(--border)] bg-[var(--canvas)] p-6">
                  <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-orange-500/10 text-orange-500"><Icon /></span>
                  <h3 className="font-black">{title}</h3><p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>© 2026 AFKSnap</span><span className="flex items-center gap-2"><Moon size={14} /> Dibangun dengan React, Redux, Express & Socket.IO</span></footer>
    </div>
  );
}
