import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({ title, description, action, icon }: { title: string; description?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-10">
      <div className="mb-3 text-subtle" aria-hidden>{icon ?? <Inbox className="h-8 w-8" strokeWidth={1.5} />}</div>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-md text-[13px] text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
