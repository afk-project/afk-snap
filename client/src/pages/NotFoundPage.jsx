import { Link } from "react-router";

export default function NotFoundPage() {
  return <div className="grid min-h-screen place-items-center bg-[var(--canvas)] px-4 text-center text-[var(--text)]"><div><p className="text-7xl font-black text-orange-500">404</p><h1 className="mt-3 text-2xl font-black">Halaman tidak ditemukan</h1><Link to="/" className="mt-6 inline-block rounded-xl bg-orange-500 px-5 py-3 font-bold text-white">Kembali ke AFKSnap</Link></div></div>;
}
