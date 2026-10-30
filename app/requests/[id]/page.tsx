import Link from "next/link";
import { notFound } from "next/navigation";
import { getIdentity } from "@/lib/identity";
import { canDecide, getRequest } from "@/lib/requests";
import { StatusBadge, categoryLabel, formatAmount, formatDate } from "../../ui";
import { DecisionForm } from "../forms";

export const dynamic = "force-dynamic";

function TrailEntry({ title, by, at, via, children }: {
  title: string; by: string; at: Date; via: string | null; children?: React.ReactNode;
}) {
  return (
    <li className="border-l-2 pl-4">
      <p className="text-sm"><span className="font-medium">{title}</span> by {by}{via === "api" && <span className="text-muted"> (API key)</span>}</p>
      <time dateTime={at.toISOString()} className="text-xs text-muted">{formatDate(at)}</time>
      {children}
    </li>
  );
}

export default async function RequestPage({ params }: PageProps<"/requests/[id]">) {
  const user = await getIdentity();
  // Members can open only their own requests; anything else is not found.
  const request = await getRequest(user, (await params).id);
  if (!request) notFound();

  return (
    <div className="max-w-3xl">
      <Link href={canDecide(user) ? "/queue" : "/"} className="text-sm text-muted hover:text-ink">
        ← {canDecide(user) ? "Back to the queue" : "Back to your requests"}
      </Link>
      <header className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight wrap-anywhere">{request.title}</h1>
        <StatusBadge status={request.status} />
      </header>

      <dl className="mb-8 grid gap-4 rounded-md border bg-panel p-5 text-sm sm:grid-cols-3">
        <div><dt className="text-muted">Category</dt><dd className="mt-1 font-medium">{categoryLabel(request.category)}</dd></div>
        <div><dt className="text-muted">Amount</dt><dd className="mt-1 font-medium">{formatAmount(request.amount)}</dd></div>
        <div><dt className="text-muted">Requested by</dt><dd className="mt-1 font-medium">{request.requestedByName}</dd></div>
      </dl>

      <section aria-labelledby="justification" className="mb-8">
        <h2 id="justification" className="mb-2 text-lg font-semibold">Justification</h2>
        <p className="whitespace-pre-wrap wrap-anywhere leading-relaxed">{request.justification}</p>
      </section>

      <section aria-labelledby="history" className="mb-8">
        <h2 id="history" className="mb-3 text-lg font-semibold">History</h2>
        <ol className="space-y-4">
          <TrailEntry title="Submitted" by={request.requestedByName} at={request.createdAt} via={request.requestedVia} />
          {request.decidedAt ? (
            <TrailEntry title={request.status === "approved" ? "Approved" : "Rejected"} by={request.decidedByName ?? "api"}
              at={request.decidedAt} via={request.decidedVia}>
              {request.decisionComment && (
                <blockquote className="mt-2 rounded-sm bg-surface px-3 py-2 text-sm whitespace-pre-wrap wrap-anywhere">
                  {request.decisionComment}
                </blockquote>
              )}
            </TrailEntry>
          ) : (
            <li className="border-l-2 border-dashed pl-4 text-sm text-muted">Waiting for an admin to decide.</li>
          )}
        </ol>
      </section>

      {canDecide(user) && request.status === "pending" && (
        <section aria-labelledby="decide" className="rounded-md border bg-panel p-5">
          <h2 id="decide" className="mb-4 text-lg font-semibold">Decide</h2>
          <DecisionForm requestId={request.id} />
        </section>
      )}
    </div>
  );
}
