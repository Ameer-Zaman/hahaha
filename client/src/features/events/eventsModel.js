import { useEffect, useState } from "react";

import { site } from "../../config/site";

/**
 * Helpers shared by the Events list and an event's own page. Times always show in the
 * visitor's own time zone (the panel stores real moments, not local clock times).
 */

const dayFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const shortDayFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});
const zoneFmt = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" });

export const formatDay = (d) => dayFmt.format(new Date(d));
export const formatShortDay = (d) => shortDayFmt.format(new Date(d));
export const formatTime = (d) => timeFmt.format(new Date(d));

/** "GMT+5:30", "BST" … so nobody wonders whose evening it is. */
export function zoneName(d = new Date()) {
  return (
    zoneFmt.formatToParts(new Date(d)).find((p) => p.type === "timeZoneName")
      ?.value ?? ""
  );
}

/** The calendar-tile pieces: day number, month, weekday. */
export function dateTile(d) {
  const date = new Date(d);
  return {
    day: date.getDate(),
    month: date.toLocaleString(undefined, { month: "short" }),
    weekday: date.toLocaleString(undefined, { weekday: "short" }),
  };
}

/** "20:00 – 23:00 GMT+5:30", with the finish only when one was set. */
export function timeRange(e) {
  const start = formatTime(e.startsAt);
  const end = e.endsAt ? formatTime(e.endsAt) : "";
  const sameDay =
    e.endsAt &&
    new Date(e.endsAt).toDateString() === new Date(e.startsAt).toDateString();
  const tail = e.endsAt
    ? sameDay
      ? ` – ${end}`
      : ` – ${formatShortDay(e.endsAt)}, ${end}`
    : "";
  return `${start}${tail} ${zoneName(e.startsAt)}`.trim();
}

export const STATE_LABEL = {
  upcoming: "Coming up",
  live: "On now",
  ended: "Finished",
  cancelled: "Cancelled",
};

/**
 * The state, re-worked out on the visitor's clock: an event that was "coming up" when the
 * data was fetched turns into "on now" at its start time without a reload.
 */
export function liveState(e, now = Date.now()) {
  if (e.state === "cancelled") return "cancelled";
  if (new Date(e.startsAt).getTime() > now) return "upcoming";
  if (new Date(e.endsBy).getTime() > now) return "live";
  return "ended";
}

/** The current time, refreshed every 30 seconds (countdowns, "on now"). */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** "3 days, 4 hours" / "2 hours, 15 minutes" / "12 minutes" until a moment. */
export function untilText(target, now = Date.now()) {
  let mins = Math.max(
    0,
    Math.round((new Date(target).getTime() - now) / 60_000),
  );
  const days = Math.floor(mins / 1440);
  mins -= days * 1440;
  const hours = Math.floor(mins / 60);
  mins -= hours * 60;
  const part = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  if (days)
    return hours
      ? `${part(days, "day")}, ${part(hours, "hour")}`
      : part(days, "day");
  if (hours)
    return mins
      ? `${part(hours, "hour")}, ${part(mins, "minute")}`
      : part(hours, "hour");
  return mins ? part(mins, "minute") : "less than a minute";
}

/** Sorts the list the page shows: on now, then coming up (soonest first), then finished. */
export function groupEvents(events = [], now = Date.now()) {
  const withState = events.map((e) => ({ ...e, state: liveState(e, now) }));
  const soonest = (a, b) => new Date(a.startsAt) - new Date(b.startsAt);
  const live = withState.filter((e) => e.state === "live").sort(soonest);
  const coming = withState
    .filter(
      (e) =>
        e.state === "upcoming" ||
        (e.state === "cancelled" && new Date(e.endsBy) > now),
    )
    .sort(soonest);
  const ahead = [...live, ...coming];
  const past = withState
    .filter(
      (e) =>
        e.state === "ended" ||
        (e.state === "cancelled" && new Date(e.endsBy) <= now),
    )
    .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt));
  // the lead: the featured one if it is still to come, otherwise whatever is next
  const lead =
    ahead.find((e) => e.featured && e.state !== "cancelled") ??
    ahead.find((e) => e.state !== "cancelled") ??
    null;
  return { lead, ahead: ahead.filter((e) => e !== lead), past };
}

/** A stable skyline for an event without a picture, so each one looks like itself. */
export function seedFor(slug = "") {
  let h = 7;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return h;
}

/* ------------------------------------------------------------ calendar file */

const icsDate = (d) =>
  new Date(d)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const icsText = (s = "") =>
  String(s)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/([,;])/g, "\\$1");

/** An .ics file with this one event in it, for "Add to calendar". */
export function calendarFile(e, pageUrl) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${icsText(site.name)}//Events//EN`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.id}@${location.hostname}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(e.startsAt)}`,
    `DTEND:${icsDate(e.endsBy)}`,
    `SUMMARY:${icsText(e.title)}`,
    e.location ? `LOCATION:${icsText(`${e.location} (in the city)`)}` : null,
    `DESCRIPTION:${icsText([e.summary, pageUrl].filter(Boolean).join("\n\n"))}`,
    `URL:${pageUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return new Blob([lines.join("\r\n")], {
    type: "text/calendar;charset=utf-8",
  });
}

export function downloadCalendar(e) {
  const url = URL.createObjectURL(
    calendarFile(e, `${location.origin}/events/${e.id}`),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${e.id}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
