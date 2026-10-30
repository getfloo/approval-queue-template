import { getIdentity } from "@/lib/identity";
import { NewRequestForm } from "../forms";

export const dynamic = "force-dynamic";

export default async function NewRequest() {
  await getIdentity();
  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">New request</h1>
        <p className="mt-2 text-muted">An admin will review it. You can follow its status from your requests.</p>
      </header>
      <NewRequestForm />
    </div>
  );
}
