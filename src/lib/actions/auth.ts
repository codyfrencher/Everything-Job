"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";

export type LoginState = { error?: string } | undefined;

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

async function getClientIp(): Promise<string | null> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headerList.get("x-real-ip");
}

async function isRateLimited(email: string, ip: string | null) {
  const since = new Date(Date.now() - WINDOW_MS);
  const count = await db.loginAttempt.count({
    where: {
      success: false,
      createdAt: { gte: since },
      OR: [{ email }, ...(ip ? [{ ip }] : [])],
    },
  });
  return count >= MAX_ATTEMPTS;
}

function safeRedirectTarget(value: FormDataEntryValue | null): string {
  const target = String(value ?? "");
  // Only ever follow a same-site relative path — a leading "//" or "/\"
  // would be browser-interpreted as protocol-relative and hand the
  // post-login redirect to an arbitrary external host.
  if (target.startsWith("/") && !target.startsWith("//") && !target.startsWith("/\\")) {
    return target;
  }
  return "/";
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const ip = await getClientIp();
  const redirectTo = safeRedirectTarget(formData.get("callbackUrl"));

  if (await isRateLimited(email, ip)) {
    return { error: "Too many attempts, try again shortly" };
  }

  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirectTo,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      await db.loginAttempt.create({ data: { email, ip, success: false } });
      return { error: "Invalid email or password" };
    }
    // signIn throws Next's redirect signal on success — let it propagate.
    throw err;
  }
}
