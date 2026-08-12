"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-user";
import { customerSchema } from "@/lib/validators";

export type FormState = { error?: string } | undefined;

function parseCustomerForm(formData: FormData) {
  return customerSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    street: formData.get("street"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    notes: formData.get("notes"),
  });
}

export async function createCustomer(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireRole("ADMIN", "DISPATCHER");

  let customer;
  try {
    const data = parseCustomerForm(formData);
    customer = await db.customer.create({
      data: { ...data, createdById: user.id },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? "Invalid customer details" };
    }
    return { error: "Could not create customer" };
  }

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(
  customerId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("ADMIN", "DISPATCHER");

  try {
    const data = parseCustomerForm(formData);
    await db.customer.update({ where: { id: customerId }, data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? "Invalid customer details" };
    }
    return { error: "Could not update customer" };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
}

export async function deleteCustomer(customerId: string) {
  await requireRole("ADMIN", "DISPATCHER");
  await db.customer.delete({ where: { id: customerId } });
  revalidatePath("/customers");
  redirect("/customers");
}
