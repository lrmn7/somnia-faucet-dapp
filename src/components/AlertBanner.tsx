import Link from "next/link";

export default function AlertBanner() {
  return (
    <div className="text-brand-orange text-sm text-center py-2 px-4">
      🚰 Need test tokens?{" "}
      <Link
        href="/faucet"
        className="text-brand-orange underline font-semibold hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
      >
        Claim here
      </Link>
    </div>
  );
}
