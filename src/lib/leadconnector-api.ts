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

export function normalizeState(state: string | undefined): string | null {
  if (!state) return null;
  const trimmed = state.trim();
  if (trimmed.length <= 2) return trimmed.toUpperCase();
  return STATE_ABBREVIATIONS[trimmed.toLowerCase()] ?? trimmed;
}
