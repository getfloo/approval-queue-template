import Link from "next/link";
import { syncUser } from "@/db/users";
import { getIdentity } from "@/lib/identity";
import { canDecide, listRequests } from "@/lib/requests";
import { RequestTable } from "./ui";

export const dynamic = "force-dynamic";

export default async function MyRequests() {
  const user = await getIdentity();
  await syncUser(user);
  const mine = await listRequests(user, {}, "own");
  const waiting = canDecide(user) ? (await listRequests(user, { status: "pending" })).length : 0;

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your requests</h1>
          <p className="mt-2 text-muted">Everything you have asked for, and where it stands.</p>
        </div>
        <Link href="/requests/new" className="rounded-sm bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover">
          New request
        </Link>
      </header>

      {waiting > 0 && (
        <p className="mb-6 rounded-md border bg-warning-soft px-4 py-3 text-sm text-warning">
          {waiting === 1 ? "1 request is" : `${waiting} requests are`} waiting for a decision.{" "}
          <Link href="/queue" className="font-medium underline">Open the queue</Link>
        </p>
      )}

      {mine.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <p className="font-medium">You have not submitted any requests yet.</p>
          <p className="mt-1 text-sm text-muted">Ask for a discount, a purchase, access to a system, or time off. An admin will approve or reject it.</p>
          <Link href="/requests/new" className="mt-4 inline-block text-sm font-medium text-accent hover:text-accent-hover">Submit your first request</Link>
        </div>
      ) : (
        <RequestTable rows={mine} showRequester={false} />
      )}
    </>
  );
}
