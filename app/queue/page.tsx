import { getIdentity } from "@/lib/identity";
import { CATEGORIES, CATEGORY_LABELS, STATUSES } from "@/lib/request-fields";
import { ListFilter, canDecide, listRequests } from "@/lib/requests";
import { RequestTable } from "../ui";

export const dynamic = "force-dynamic";

export default async function Queue({ searchParams }: PageProps<"/queue">) {
  const user = await getIdentity();
  if (!canDecide(user)) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center">
        <p className="font-medium">The queue is for admins.</p>
        <p className="mt-1 text-sm text-muted">Ask an admin of this app if you need to review requests.</p>
      </div>
    );
  }

  // The queue opens on pending work; "all" clears the status filter. Unknown values are ignored.
  const params = await searchParams;
  const statusParam = typeof params.status === "string" ? params.status : "pending";
  const parsed = ListFilter.safeParse({
    status: statusParam === "all" ? undefined : statusParam,
    category: typeof params.category === "string" && params.category !== "" ? params.category : undefined,
  });
  const filter = parsed.success ? parsed.data : { status: "pending" as const };
  const rows = await listRequests(user, filter);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Queue</h1>
        <p className="mt-2 text-muted">Every request from your team. Open one to approve or reject it.</p>
      </header>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="status" className="mb-1.5 block text-sm font-medium">Status</label>
          <select id="status" name="status" defaultValue={filter.status ?? "all"}>
            {STATUSES.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}
            <option value="all">All</option>
          </select>
        </div>
        <div>
          <label htmlFor="category" className="mb-1.5 block text-sm font-medium">Category</label>
          <select id="category" name="category" defaultValue={filter.category ?? ""}>
            <option value="">All categories</option>
            {CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}
          </select>
        </div>
        <button type="submit" className="rounded-sm border bg-panel px-4 py-2 text-sm font-medium hover:bg-surface">Filter</button>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <p className="font-medium">{filter.status === "pending" ? "Nothing is waiting for a decision." : "No requests match these filters."}</p>
          <p className="mt-1 text-sm text-muted">New requests from your team show up here as pending.</p>
        </div>
      ) : (
        <RequestTable rows={rows} showRequester />
      )}
    </>
  );
}
