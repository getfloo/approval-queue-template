import Link from "next/link";
import { CATEGORY_LABELS, type Category, type Status } from "@/lib/request-fields";
import type { ApprovalRequest } from "@/lib/requests";

const STATUS_STYLES: Record<Status, string> = {
  pending: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-danger",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status as Status]}`}>
      {status}
    </span>
  );
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category as Category] ?? category;
}

export function formatAmount(amount: number | null): string {
  return amount === null ? "–" : amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatDate(date: Date): string {
  return `${date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC`;
}

/** The request table shared by "My requests" and the admin queue. */
export function RequestTable({ rows, showRequester }: { rows: ApprovalRequest[]; showRequester: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Request</th>
            {showRequester && <th>Requested by</th>}
            <th>Category</th>
            <th className="text-right">Amount</th>
            <th>Status</th>
            <th>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((request) => (
            <tr key={request.id}>
              <td className="min-w-48 max-w-xs">
                <Link href={`/requests/${request.id}`} className="font-medium hover:text-accent">{request.title}</Link>
              </td>
              {showRequester && <td className="whitespace-nowrap">{request.requestedByName}</td>}
              <td className="whitespace-nowrap">{categoryLabel(request.category)}</td>
              <td className="whitespace-nowrap text-right">{formatAmount(request.amount)}</td>
              <td><StatusBadge status={request.status} /></td>
              <td className="whitespace-nowrap text-muted">{formatDate(request.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
