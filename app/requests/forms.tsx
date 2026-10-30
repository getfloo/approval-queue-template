"use client";

import { useActionState } from "react";
import { decide, submitRequest, type FormState } from "@/app/actions";
import { CATEGORIES, CATEGORY_LABELS, MAX_TEXT_LENGTH, MAX_TITLE_LENGTH } from "@/lib/request-fields";

const button = "rounded-sm px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60";

function FormError({ state }: { state: FormState }) {
  return state.error ? <p role="alert" className="rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p> : null;
}

export function NewRequestForm() {
  const [state, action, pending] = useActionState(submitRequest, {});
  return (
    <form action={action} className="space-y-5">
      <FormError state={state} />
      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium">Title</label>
        <input id="title" name="title" required maxLength={MAX_TITLE_LENGTH} className="block w-full"
          placeholder="Annual license for the design team" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="mb-1.5 block text-sm font-medium">Category</label>
          <select id="category" name="category" required defaultValue="" className="block w-full">
            <option value="" disabled>Choose one</option>
            {CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="amount" className="mb-1.5 block text-sm font-medium">
            Amount <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="amount" name="amount" type="number" min="0" step="0.01" inputMode="decimal" className="block w-full"
            placeholder="1200" />
          <p className="mt-1 text-xs text-muted">Money, days, seats: whatever fits the request.</p>
        </div>
      </div>
      <div>
        <label htmlFor="justification" className="mb-1.5 block text-sm font-medium">Justification</label>
        <textarea id="justification" name="justification" required maxLength={MAX_TEXT_LENGTH} rows={5}
          className="block w-full resize-y" placeholder="Why it is needed, what it unblocks, and any deadline." />
      </div>
      <button type="submit" disabled={pending} className={`${button} bg-accent hover:bg-accent-hover`}>
        {pending ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}

export function DecisionForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(decide.bind(null, requestId), {});
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <div>
        <label htmlFor="comment" className="mb-1.5 block text-sm font-medium">
          Comment <span className="font-normal text-muted">(required to reject)</span>
        </label>
        <textarea id="comment" name="comment" maxLength={MAX_TEXT_LENGTH} rows={3} className="block w-full resize-y"
          placeholder="Shown to the requester." />
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="submit" name="decision" value="approved" disabled={pending} className={`${button} bg-success hover:opacity-90`}>
          Approve
        </button>
        <button type="submit" name="decision" value="rejected" disabled={pending} className={`${button} bg-danger hover:opacity-90`}>
          Reject
        </button>
      </div>
    </form>
  );
}
