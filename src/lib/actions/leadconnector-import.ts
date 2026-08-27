"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-user";
import { logJobAudit } from "@/lib/audit";
import {
  contactDisplayName,
  fetchContact,
  fetchEstimateDiagnostic,
  fetchUpcomingEvents,
  isImportableEvent,
  normalizeState,
  type LeadConnectorContact,
} from "@/lib/leadconnector-api";

// Temporary — for confirming how Estimates actually work in LeadConnector
// before building the real "pull Scope of Work from the estimate" feature.
// Safe to delete once that's built; read-only, Admin-only, doesn't touch
// any Fieldwork data.
export async function diagnoseLeadConnectorEstimate(contactId: string) {
  await requireRole("ADMIN");
  try {
    return await fetchEstimateDiagnostic(contactId);
  } catch (err) {
    return {
      status: 0,
      ok: false,
      url: "",
      body: err instanceof Error ? err.message : "Request failed",
    };
  }
}

export type ImportCandidate = {
  eventId: string;
  title: string;
  contactId: string;
  customerName: string;
  address: string | null;
  startTime: string;
  endTime: string;
  status: "new" | "already_imported" | "possible_duplicate" | "time_changed";
  duplicateJobId?: string;
  previousStartTime?: string;
  previousEndTime?: string;
};

export type PreviewResult =
  | { error: string }
  | { candidates: ImportCandidate[] };

// A job for the same LeadConnector contact already exists within this
// window of the proposed appointment time — most likely the same job
// came in earlier through the real-time webhook or was entered by hand.
const DUPLICATE_WINDOW_MS = 12 * 60 * 60 * 1000;

// LeadConnector doesn't re-fire the real-time webhook when an existing
// confirmed appointment is simply rescheduled (its status never changes),
// so an already-imported job can silently drift out of date. A minute of
// slack avoids flagging float from clock/serialization noise.
const TIME_DRIFT_TOLERANCE_MS = 60 * 1000;

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
      select: { id: true, scheduledStart: true, scheduledEnd: true },
    });
    if (existingByExternalId) {
      const startDrifted =
        Math.abs(
          (existingByExternalId.scheduledStart?.getTime() ?? 0) -
            new Date(event.startTime).getTime(),
        ) > TIME_DRIFT_TOLERANCE_MS;
      const endDrifted =
        Math.abs(
          (existingByExternalId.scheduledEnd?.getTime() ?? 0) - new Date(event.endTime).getTime(),
        ) > TIME_DRIFT_TOLERANCE_MS;

      candidates.push({
        eventId: event.id,
        title: event.title,
        contactId: event.contactId,
        customerName: event.title,
        address: event.address ?? null,
        startTime: event.startTime,
        endTime: event.endTime,
        status: startDrifted || endDrifted ? "time_changed" : "already_imported",
        duplicateJobId: existingByExternalId.id,
        previousStartTime: existingByExternalId.scheduledStart?.toISOString(),
        previousEndTime: existingByExternalId.scheduledEnd?.toISOString(),
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
  | { created: number; updated: number; skipped: number; failed: { eventId: string; error: string }[] };

export async function runLeadConnectorImport(eventIds: string[]): Promise<ImportRunResult> {
  const user = await requireRole("ADMIN");

  if (eventIds.length === 0) {
    return { created: 0, updated: 0, skipped: 0, failed: [] };
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
  let updated = 0;
  let skipped = 0;
  const failed: { eventId: string; error: string }[] = [];

  for (const eventId of eventIds) {
    const event = eventsById.get(eventId);
    if (!event || !isImportableEvent(event)) {
      failed.push({ eventId, error: "No longer available from LeadConnector" });
      continue;
    }

    const existing = await db.job.findUnique({ where: { externalId: event.id } });
    if (existing) {
      const newStart = new Date(event.startTime);
      const newEnd = new Date(event.endTime);
      const unchanged =
        existing.scheduledStart?.getTime() === newStart.getTime() &&
        existing.scheduledEnd?.getTime() === newEnd.getTime();
      if (unchanged) {
        skipped++;
        continue;
      }

      try {
        await db.job.update({
          where: { id: existing.id },
          data: { scheduledStart: newStart, scheduledEnd: newEnd },
        });
        await logJobAudit("edited", existing.id, user.id, {
          source: "leadconnector-import",
          reason: "rescheduled in LeadConnector",
        });
        updated++;
      } catch (err) {
        console.error("runLeadConnectorImport: update failed for event", eventId, err);
        failed.push({
          eventId,
          error: err instanceof Error ? err.message : "Could not update job",
        });
      }
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

  if (created > 0 || updated > 0) {
    revalidatePath("/jobs");
    revalidatePath("/schedule");
    revalidatePath("/");
    revalidatePath("/customers");
  }

  return { created, updated, skipped, failed };
}
