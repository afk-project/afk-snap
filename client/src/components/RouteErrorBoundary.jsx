import { Component } from "react";
import { useLocation } from "react-router";

class Boundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("AFKSnap page error", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center text-[var(--text)]">
        <h1 className="text-2xl font-black">Halaman mengalami error</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{this.state.error.message || "Terjadi kesalahan pada tampilan."}</p>
        <div className="mt-5 flex justify-center gap-3"><button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-orange-500 px-5 py-3 font-black text-white">Muat ulang</button><button type="button" onClick={() => { window.location.href = "/rooms"; }} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 font-black">Kembali ke Rooms</button></div>
      </section>
    );
  }
}

export default function RouteErrorBoundary({ children }) {
  const location = useLocation();
  return <Boundary key={location.pathname}>{children}</Boundary>;
}
