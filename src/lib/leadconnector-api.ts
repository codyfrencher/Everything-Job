// Read-only client for the LeadConnector (GoHighLevel) REST API — used by
// the one-off "import upcoming jobs" tool. Distinct from the inbound
// webhook route: this side calls out to LeadConnector instead of receiving
// pushes from it.

const API_BASE = "https://services.leadconnectorhq.com";
const API_VERSION = "2021-07-28";

// The calendar this business books actual jobs into — same one the
// real-time webhook trigger is filtered to.
export const BWMP_JOBS_CALENDAR_ID = "oAlfZ0QZaHRBmpDJNFfU";

function authHeaders() {
  const token = process.env.LEADCONNECTOR_API_KEY;
  if (!token) {
    throw new Error("LEADCONNECTOR_API_KEY is not configured");
  }
  return {
    Authorization: `Bearer ${token}`,
    Version: API_VERSION,
    Accept: "application/json",
  };
}

function locationId(): string {
  const id = process.env.LEADCONNECTOR_LOCATION_ID;
  if (!id) {
    throw new Error("LEADCONNECTOR_LOCATION_ID is not configured");
  }
  return id;
}

export type LeadConnectorEvent = {
  id: string;
  title: string;
  appointmentStatus: string;
  startTime: string;
  endTime: string;
  contactId: string;
  address?: string;
  deleted?: boolean;
};

export type LeadConnectorContact = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
};

// GoHighLevel appointment statuses that represent a real, still-on job —
// everything else (cancelled, no-show, etc.) shouldn't be imported.
const IMPORTABLE_STATUSES = new Set(["confirmed", "new", "showed"]);

export function isImportableEvent(event: LeadConnectorEvent): boolean {
  return !event.deleted && IMPORTABLE_STATUSES.has(event.appointmentStatus);
}

export async function fetchUpcomingEvents(daysAhead = 365): Promise<LeadConnectorEvent[]> {
  const now = Date.now();
  const future = now + daysAhead * 24 * 60 * 60 * 1000;
  const url = new URL(`${API_BASE}/calendars/events`);
  url.searchParams.set("locationId", locationId());
  url.searchParams.set("calendarId", BWMP_JOBS_CALENDAR_ID);
  url.searchParams.set("startTime", String(now));
  url.searchParams.set("endTime", String(future));

  const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`LeadConnector events request failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { events?: LeadConnectorEvent[] };
  return data.events ?? [];
}

export async function fetchContact(contactId: string): Promise<LeadConnectorContact | null> {
  const res = await fetch(`${API_BASE}/contacts/${contactId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`LeadConnector contact request failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { contact?: LeadConnectorContact };
  return data.contact ?? null;
}

const STATE_ABBREVIATIONS: Record<string, string> = {
  florida: "FL",
  georgia: "GA",
  alabama: "AL",
};

export function contactDisplayName(
  contact: LeadConnectorContact | null,
  fallback: string,
): string {
  const name = [contact?.firstName, contact?.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return name || fallback;
}

type LeadConnectorEstimateItem = {
  name?: string;
  description?: string;
};

type LeadConnectorEstimate = {
  _id: string;
  issueDate?: string;
  items?: LeadConnectorEstimateItem[];
};

// Estimate line-item descriptions are HTML ("<p>...</p>"), but Scope of
// Work is a plain-text field — convert block-level breaks to newlines,
// strip remaining tags, and decode the handful of entities GHL actually
// uses in this content rather than pulling in a full HTML parser for it.
function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function estimateToScopeText(estimate: LeadConnectorEstimate): string | null {
  const parts = (estimate.items ?? [])
    .map((item) => {
      const name = item.name?.trim();
      const description = item.description ? htmlToPlainText(item.description) : "";
      return [name, description].filter(Boolean).join("\n");
    })
    .filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") : null;
}

// A job's customer generally has one active estimate in LeadConnector,
// but the API returns a list — if there's ever more than one, use
// whichever was issued most recently. Estimate lookups are a nice-to-
// have for pre-filling Scope of Work, not a hard requirement, so this
// returns null instead of throwing on any failure — a broken or missing
// estimate should never block a job from being created.
export async function fetchScopeOfWorkFromEstimate(
  contactId: string,
): Promise<string | null> {
  const url = new URL(`${API_BASE}/invoices/estimate/list`);
  url.searchParams.set("altId", locationId());
  url.searchParams.set("altType", "location");
  url.searchParams.set("contactId", contactId);
  url.searchParams.set("limit", "10");
  // Required even for a first page — the API rejects the request
  // outright ("offset must be a string") without it.
  url.searchParams.set("offset", "0");

  try {
    const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });
    if (!res.ok) {
      console.error(
        "fetchScopeOfWorkFromEstimate: request failed",
        res.status,
        await res.text(),
      );
      return null;
    }
    const data = (await res.json()) as { estimates?: LeadConnectorEstimate[] };
    const estimates = data.estimates ?? [];
    if (estimates.length === 0) return null;

    const latest = estimates.reduce((best, current) => {
      const bestTime = best.issueDate ? new Date(best.issueDate).getTime() : 0;
      const currentTime = current.issueDate ? new Date(current.issueDate).getTime() : 0;
      return currentTime > bestTime ? current : best;
    });

    return estimateToScopeText(latest);
  } catch (err) {
    console.error("fetchScopeOfWorkFromEstimate failed", err);
    return null;
  }
}

export function normalizeState(state: string | undefined): string | null {
  if (!state) return null;
  const trimmed = state.trim();
  if (trimmed.length <= 2) return trimmed.toUpperCase();
  return STATE_ABBREVIATIONS[trimmed.toLowerCase()] ?? trimmed;
}
