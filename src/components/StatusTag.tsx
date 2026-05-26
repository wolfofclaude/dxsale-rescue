import type { LockStatus } from "@/lib/chain";

const STYLES: Record<string, string> = {
  RECOVERABLE: "bg-brand/20 text-brand",
  locked: "bg-warn/20 text-warn",
  empty: "bg-edge text-gray-400",
  "withdrawn-flag": "bg-warn/20 text-warn",
  review: "bg-warn/20 text-warn",
  skip: "bg-edge text-gray-400",
  error: "bg-danger/20 text-danger",
};

const LABELS: Record<string, string> = {
  RECOVERABLE: "Recoverable now",
  locked: "Still locked",
  empty: "Empty / withdrawn",
  "withdrawn-flag": "Needs review",
  review: "Unknown template",
  skip: "Not a lock",
  error: "Error",
};

export function StatusTag({ status }: { status: LockStatus }) {
  return (
    <span className={`tag ${STYLES[status] || "bg-edge text-gray-400"}`}>
      {LABELS[status] || status}
    </span>
  );
}
