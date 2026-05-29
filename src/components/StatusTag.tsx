import type { LockStatus } from "@/lib/chain";

// Minimal dot + label. Recoverable reads bright; everything else recedes.
const DOT: Record<string, string> = {
  RECOVERABLE: "bg-gray-50",
  locked: "bg-gray-500",
  empty: "bg-gray-700",
  "withdrawn-flag": "bg-gray-500",
  review: "bg-gray-500",
  skip: "bg-gray-700",
  error: "bg-danger",
};
const TEXT: Record<string, string> = {
  RECOVERABLE: "text-gray-100",
  locked: "text-gray-400",
  empty: "text-gray-500",
  "withdrawn-flag": "text-gray-400",
  review: "text-gray-400",
  skip: "text-gray-500",
  error: "text-danger",
};
const LABELS: Record<string, string> = {
  RECOVERABLE: "Recoverable",
  locked: "Locked",
  empty: "Empty",
  "withdrawn-flag": "Review",
  review: "Review",
  skip: "Not a lock",
  error: "Error",
};

export function StatusTag({ status }: { status: LockStatus }) {
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap text-xs ${TEXT[status] || "text-gray-400"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status] || "bg-gray-500"}`} />
      {LABELS[status] || status}
    </span>
  );
}
