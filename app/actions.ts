"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { syncUser } from "@/db/users";
import { getIdentity } from "@/lib/identity";
import { DecisionInput, InvalidInput, RequestInput, canDecide, createRequest, decideRequest, parse } from "@/lib/requests";

/** What a form shows after a failed submit; a successful submit redirects instead. */
export type FormState = { error?: string };

export async function submitRequest(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getIdentity();
  const amount = String(formData.get("amount") ?? "").trim();
  let id: string;
  try {
    const input = parse(RequestInput, {
      title: formData.get("title"),
      category: formData.get("category"),
      amount: amount === "" ? undefined : Number(amount),
      justification: formData.get("justification"),
    });
    await syncUser(user);
    id = (await createRequest(user, input)).id;
  } catch (error) {
    if (error instanceof InvalidInput) return { error: error.message };
    throw error;
  }
  revalidatePath("/", "layout");
  redirect(`/requests/${id}`);
}

export async function decide(id: string, _state: FormState, formData: FormData): Promise<FormState> {
  const user = await getIdentity();
  // Checked on the server: hiding the form from members is not the permission.
  if (!canDecide(user)) return { error: "Only admins can approve or reject requests." };
  try {
    const result = await decideRequest(user, id, parse(DecisionInput, {
      decision: formData.get("decision"),
      comment: formData.get("comment") ?? "",
    }));
    if (!result) return { error: "This request no longer exists." };
    if (result.alreadyDecided) return { error: `Someone already ${result.request.status} this request.` };
  } catch (error) {
    if (error instanceof InvalidInput) return { error: error.message };
    throw error;
  }
  revalidatePath("/", "layout");
  return {};
}
