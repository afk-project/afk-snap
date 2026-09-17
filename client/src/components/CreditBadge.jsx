import { Coins } from "lucide-react";
import { Link } from "react-router";
import { useSelector } from "react-redux";

export default function CreditBadge() {
  const balance = useSelector((state) => state.wallet.balance);
  return (
    <Link
      to="/credits"
      className="inline-flex items-center gap-2 rounded-xl border border-orange-300/40 bg-orange-500/10 px-3 py-2 text-sm font-bold text-orange-500"
    >
      <Coins size={17} /> {balance} credit
    </Link>
  );
}
