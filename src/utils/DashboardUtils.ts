import type { Json } from "@/supabase/client";

export const DASHBOARD_PERIODS = [7, 30] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export type ContactActivityPoint = {
  date: string;
  active_contacts: number;
  new_contacts: number;
};

export type MessageActivityPoint = {
  date: string;
  sent: number;
  received: number;
};

export type TeamSnapshotMember = {
  id: string;
  name: string;
  picture: string | null;
  assigned: number;
  open: number;
  closed: number;
};

function isRecord(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberValue(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringValue(value: Json | undefined) {
  return typeof value === "string" ? value : "";
}

export function parseContactActivity(value: Json): ContactActivityPoint[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isRecord).map((point) => ({
    date: stringValue(point.date),
    active_contacts: numberValue(point.active_contacts),
    new_contacts: numberValue(point.new_contacts),
  }));
}

export function parseMessageActivity(value: Json): MessageActivityPoint[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isRecord).map((point) => ({
    date: stringValue(point.date),
    sent: numberValue(point.sent),
    received: numberValue(point.received),
  }));
}

export function parseTeamSnapshot(value: Json): TeamSnapshotMember[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isRecord).map((member) => ({
    id: stringValue(member.id),
    name: stringValue(member.name),
    picture: typeof member.picture === "string" ? member.picture : null,
    assigned: numberValue(member.assigned),
    open: numberValue(member.open),
    closed: numberValue(member.closed),
  }));
}

export function isDashboardWorkspacePath(pathname: string) {
  return pathname === "/dashboard" || pathname === "/dashboard/";
}
