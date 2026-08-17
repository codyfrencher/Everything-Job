"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-user";
import { logJobAudit } from "@/lib/audit";
import {
  contactDisplayName,
  fetchContact,
  fetchUpcomingEvents,
  isImportableEvent,
  normalizeState,
  type LeadConnectorContact,
} from "@/lib/leadconnector-api";

export type ImportCandidate = {
  eventId: string;
  title: string;
  contactId: string;
  customerName: string;
  address: string | null;
  startTime: string;
  endTime: string;
  status: "new" | "already_imported" | "possible_duplicate";
  duplicateJobId?: string;
};

export type PreviewResult =
  | { error: string }
  | { candidates: ImportCandidate[] };

// A job for the same LeadConnector contact already exists within this
// window of the proposed appointment time — most likely the same job
// came in earlier through the real-time webhook or was entered by hand.
const DUPLICATE_WINDOW_MS = 12 * 60 * 60 * 1000;

export async function previewLeadConnectorImport(): Promise<PreviewResult> {
  await requireRole("ADMIN");

  let events;
  try {
    events = await fetchUpcomingEvents();
  } catch (err) {
    console.error("previewLeadConnectorImport: fetch failed", err);
    return { error: err instanceof Error ? err.message : "Could not reach LeadConnector" };
  }

  const importable = events.filter(isImportableEvent);
  const contactCache = new Map<string, LeadConnectorContact | null>();

  const candidates: ImportCandidate[] = [];
  for (const event of importable) {
    const existingByExternalId = await db.job.findUnique({
      where: { externalId: event.id },
      select: { id: true },
    });
    if (existingByExternalId) {
      candidates.push({
        eventId: event.id,
        title: event.title,
        contactId: event.contactId,
        customerName: event.title,
        address: event.address ?? null,
        startTime: event.startTime,
        endTime: event.endTime,
        status: "already_imported",
        duplicateJobId: existingByExternalId.id,
      });
      continue;
    }

    if (!contactCache.has(event.contactId)) {
      contactCache.set(event.contactId, await fetchContact(event.contactId));
    }
    const contact = contactCache.get(event.contactId) ?? null;
    const customerName = contactDisplayName(contact, event.title);

    const eventStart = new Date(event.startTime).getTime();
    const nearbyJob = await db.job.findFirst({
      where: {
        customer: { externalId: event.contactId },
        scheduledStart: {
          gte: new Date(eventStart - DUPLICATE_WINDOW_MS),
          lte: new Date(eventStart + DUPLICATE_WINDOW_MS),
        },
      },
      select: { id: true },
    });

    const address = contact?.address1 || event.address || null;

    candidates.push({
      eventId: event.id,
      title: event.title,
      contactId: event.contactId,
      customerName,
      address,
      startTime: event.startTime,
      endTime: event.endTime,
      status: nearbyJob ? "possible_duplicate" : "new",
      duplicateJobId: nearbyJob?.id,
    });
  }

  candidates.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return { candidates };
}

export type ImportRunResult =
  | { error: string }
  | { created: number; skipped: number; failed: { eventId: string; error: string }[] };

export async function runLeadConnectorImport(eventIds: string[]): Promise<ImportRunResult> {
  const user = await requireRole("ADMIN");

  if (eventIds.length === 0) {
    return { created: 0, skipped: 0, failed: [] };
  }

  let events;
  try {
    events = await fetchUpcomingEvents();
  } catch (err) {
    console.error("runLeadConnectorImport: fetch failed", err);
    return { error: err instanceof Error ? err.message : "Could not reach LeadConnector" };
  }

  const eventsById = new Map(events.map((e) => [e.id, e]));
  let created = 0;
  let skipped = 0;
  const failed: { eventId: string; error: string }[] = [];

  for (const eventId of eventIds) {
    const event = eventsById.get(eventId);
    if (!event || !isImportableEvent(event)) {
      failed.push({ eventId, error: "No longer available from LeadConnector" });
      continue;
    }

    const alreadyImported = await db.job.findUnique({ where: { externalId: event.id } });
    if (alreadyImported) {
      skipped++;
      continue;
    }

    try {
      const contact = await fetchContact(event.contactId);
      const name = contactDisplayName(contact, event.title);
      const state = normalizeState(contact?.state) || "FL";

      const customer = await db.customer.upsert({
        where: { externalId: event.contactId },
        create: {
          externalId: event.contactId,
          name,
          email: contact?.email || null,
          phone: contact?.phone || null,
          street: contact?.address1 || null,
          city: contact?.city || null,
          state,
          zip: contact?.postalCode || null,
          createdById: user.id,
        },
        update: {
          name,
          email: contact?.email || undefined,
          phone: contact?.phone || undefined,
        },
      });

      const job = await db.job.create({
        data: {
          title: event.title,
          customerId: customer.id,
          status: "SCHEDULED",
          scheduledStart: new Date(event.startTime),
          scheduledEnd: new Date(event.endTime),
          street: contact?.address1 || event.address || customer.street,
          city: contact?.city || customer.city,
          state,
          zip: contact?.postalCode || customer.zip,
          externalId: event.id,
        },
      });

      await logJobAudit("created", job.id, user.id, {
        source: "leadconnector-import",
        contactId: event.contactId,
      });

      created++;
    } catch (err) {
      console.error("runLeadConnectorImport: failed for event", eventId, err);
      failed.push({
        eventId,
        error: err instanceof Error ? err.message : "Could not create job",
      });
    }
  }

  if (created > 0) {
    revalidatePath("/jobs");
    revalidatePath("/schedule");
    revalidatePath("/");
    revalidatePath("/customers");
  }

  return { created, skipped, failed };
}
