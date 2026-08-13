import { timingSafeEqual } from "crypto";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { format, parse } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";

import { db } from "@/lib/db";
import { logJobAudit } from "@/lib/audit";
import { assertValidTimeRange } from "@/lib/job-rules";
import { COMPANY_TIME_ZONE } from "@/lib/timezone";

const payloadSchema = z.object({
  contactId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  jobTitle: z.string().optional(),
  jobDescription: z.string().optional(),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
});

// LeadConnector renders an empty merge field as the literal text
// "undefined" rather than an empty string, so that has to be treated
// the same as "no value" alongside actually-blank strings.
function cleanField(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || /^(undefined|null)$/i.test(trimmed)) return null;
  return trimmed;
}

// LeadConnector's appointment start/end time merge fields render as a
// human-readable string in the account's local (Eastern) time, e.g.
// "Tuesday, August 18, 2026 9:00 AM" — not ISO 8601. Parse that shape
// as an Eastern wall-clock time; fall back to native Date parsing for
// anything already in a standard format.
function parseLeadConnectorDate(value: string | undefined): Date | null {
  const cleaned = cleanField(value);
  if (!cleaned) return null;

  const parsed = parse(cleaned, "EEEE, MMMM d, yyyy h:mm a", new Date());
  if (!isNaN(parsed.getTime())) {
    const isoLocal = format(parsed, "yyyy-MM-dd'T'HH:mm:ss");
    return fromZonedTime(isoLocal, COMPANY_TIME_ZONE);
  }

  const fallback = new Date(cleaned);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function isAuthorized(request: Request): boolean {
  const expected = process.env.LEADCONNECTOR_WEBHOOK_SECRET;
  const provided = request.headers.get("x-webhook-secret");
  if (!expected || !provided) return false;

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

export async function POST(request: Request) {
  // Logged unconditionally (before auth/validation) while wiring up the
  // LeadConnector integration, so a misbehaving workflow step is
  // diagnosable from Vercel's function logs regardless of where it fails.
  const rawText = await request.text();
  console.log("leadconnector webhook received:", rawText);

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: "Invalid payload: not valid JSON" }, { status: 400 });
  }

  // LeadConnector nests everything configured in a workflow's Webhook
  // action "Custom Data" section under a top-level customData object,
  // alongside its own standard contact/appointment fields — it's not a
  // flat body. Fall back to the raw body itself so a differently-shaped
  // caller (or a future LeadConnector change) still has a chance to work.
  const customData =
    rawBody && typeof rawBody === "object" && "customData" in rawBody
      ? (rawBody as { customData: unknown }).customData
      : rawBody;

  const parsed = payloadSchema.safeParse(customData);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    // Echoes the caller's own submitted body back alongside the error —
    // only reachable with a valid secret already, and it's the fastest
    // way to see exactly what a misconfigured webhook step actually sent
    // without needing separate server log access.
    return NextResponse.json(
      {
        error: issue
          ? `Invalid payload: "${issue.path.join(".")}" — ${issue.message}`
          : "Invalid payload",
        received: customData,
      },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const email = cleanField(data.email);
  const phone = cleanField(data.phone);
  const street = cleanField(data.street);
  const city = cleanField(data.city);
  const state = cleanField(data.state);
  const zip = cleanField(data.zip);
  const jobTitle = cleanField(data.jobTitle);
  const jobDescription = cleanField(data.jobDescription);

  const scheduledStart = parseLeadConnectorDate(data.scheduledStart);
  const scheduledEnd = parseLeadConnectorDate(data.scheduledEnd);

  const timeError = assertValidTimeRange(scheduledStart, scheduledEnd);
  if (timeError) {
    return NextResponse.json({ error: timeError }, { status: 400 });
  }

  try {
    const customer = await db.customer.upsert({
      where: { externalId: data.contactId },
      create: {
        externalId: data.contactId,
        name: data.name,
        email,
        phone,
        street,
        city,
        state: state || "FL",
        zip,
      },
      update: {
        name: data.name,
        email: email ?? undefined,
        phone: phone ?? undefined,
      },
    });

    const job = await db.job.create({
      data: {
        title: jobTitle || `New lead: ${data.name}`,
        description: jobDescription,
        customerId: customer.id,
        status: scheduledStart ? "SCHEDULED" : "UNSCHEDULED",
        scheduledStart,
        scheduledEnd,
        street: street || customer.street,
        city: city || customer.city,
        state: state || customer.state || "FL",
        zip: zip || customer.zip,
      },
    });

    await logJobAudit("created", job.id, null, {
      source: "leadconnector",
      contactId: data.contactId,
    });

    revalidatePath("/jobs");
    revalidatePath("/schedule");
    revalidatePath("/");

    return NextResponse.json({ jobId: job.id }, { status: 201 });
  } catch (err) {
    console.error("leadconnector webhook failed", err);
    return NextResponse.json({ error: "Could not process webhook" }, { status: 500 });
  }
}
