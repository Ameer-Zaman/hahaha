import { Link } from "react-router-dom";

import Plate from "../../components/media/Plate";
import Arrow from "../../components/ui/Arrow";
import ParallaxScope from "../../components/ui/ParallaxScope";
import ParallaxWord from "../../components/ui/ParallaxWord";
import { Skeleton, SkeletonGroup } from "../../components/ui/Skeleton";
import { communityLinks } from "../../config/site";
import usePageTitle from "../../hooks/usePageTitle";
import { usePublic } from "../../lib/publicData";
import {
  dateTile,
  formatDay,
  groupEvents,
  seedFor,
  STATE_LABEL,
  timeRange,
  untilText,
  useNow,
} from "./eventsModel";
import "./events.css";

const DISCORD = communityLinks.find((l) => l.id === "discord")?.url;

/**
 * Events — what the server is hosting. The featured (or next) event leads; then everything
 * still to come; then what has already happened. Only published and cancelled events ever
 * reach the website.
 */
export default function EventsPage() {
  usePageTitle("Events");
  const entry = usePublic("/events");
  const now = useNow();

  return (
    <>
      <ParallaxScope
        as="section"
        className="page-head page-head--word theme-dark"
        aria-labelledby="events-title"
      >
        <ParallaxWord
          text="Events"
          motion="x:6%:-10%"
          className="page-head__word"
        />
        <div className="container">
          <h1 id="events-title" className="page-head__title">
            Events
          </h1>
          <p className="lede">
            Races, heists, tournaments and nights out — what the city is
            hosting, when, and how to take part.
          </p>
        </div>
      </ParallaxScope>

      <div className="ev theme-black">
        <div className="container">
          {entry.status === "loading" && <ListSkeleton />}
          {(entry.status === "error" || entry.status === "off") && (
            <p className="ev-note" role="status">
              The events list can’t be loaded right now. Try again in a moment
              {DISCORD ? ", or check the Discord" : ""}.
            </p>
          )}
          {entry.status === "ok" && (
            <Board events={entry.data?.events ?? []} now={now} />
          )}
        </div>
      </div>
    </>
  );
}

function Board({ events, now }) {
  const { lead, ahead, past } = groupEvents(events, now);

  if (!lead && ahead.length === 0 && past.length === 0) {
    return (
      <div className="ev-empty">
        <p className="ev-empty__title">No events announced yet</p>
        <p className="ev-empty__body">
          When the team schedules something — a race, a heist night, a
          tournament — it shows up here with the date, the details and how to
          join.
        </p>
        {DISCORD && (
          <a
            className="btn btn--ghost"
            href={DISCORD}
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow the Discord for news <Arrow />
          </a>
        )}
      </div>
    );
  }

  return (
    <>
      {lead && <Lead event={lead} now={now} />}

      {ahead.length > 0 && (
        <section className="ev-section" aria-labelledby="ev-ahead">
          <h2 id="ev-ahead" className="ev-section__title">
            {lead ? "Also coming up" : "Coming up"}
            <span className="ev-section__count">{ahead.length}</span>
          </h2>
          <ol className="ev-list" role="list">
            {ahead.map((e) => (
              <li key={e.id}>
                <EventRow event={e} now={now} />
              </li>
            ))}
          </ol>
        </section>
      )}

      {!lead && ahead.length === 0 && (
        <p className="ev-note">
          Nothing on the calendar right now — the next event will show up here
          as soon as it is announced.
        </p>
      )}

      {past.length > 0 && (
        <section
          className="ev-section ev-section--past"
          aria-labelledby="ev-past"
        >
          <h2 id="ev-past" className="ev-section__title">
            Past events
            <span className="ev-section__count">{past.length}</span>
          </h2>
          <ol className="ev-list ev-list--past" role="list">
            {past.map((e) => (
              <li key={e.id}>
                <EventRow event={e} now={now} compact />
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

/** The badge: "On now", "Starts in 2 days, 4 hours", "Cancelled", "Finished". */
export function StateBadge({ event, now }) {
  if (event.state === "upcoming") {
    return (
      <span className="ev-badge ev-badge--upcoming">
        Starts in {untilText(event.startsAt, now)}
      </span>
    );
  }
  return (
    <span className={`ev-badge ev-badge--${event.state}`}>
      {event.state === "live" && (
        <span className="ev-badge__pulse" aria-hidden="true" />
      )}
      {STATE_LABEL[event.state]}
    </span>
  );
}

/** The featured or next event, large. */
function Lead({ event: e, now }) {
  return (
    <article className="ev-lead" aria-labelledby={`lead-${e.id}`}>
      <Link
        to={`/events/${e.id}`}
        className="ev-lead__media"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Plate image={e.image} seed={seedFor(e.id)} horizon={0.72} priority />
        <span className="ev-lead__shade" />
      </Link>
      <div className="ev-lead__body">
        <p className="ev-meta">
          <span className="ev-meta__cat">
            {e.featured
              ? `Featured · ${e.category}`
              : `Next up · ${e.category}`}
          </span>
          <StateBadge event={e} now={now} />
        </p>
        <h2 id={`lead-${e.id}`} className="ev-lead__title">
          <Link to={`/events/${e.id}`}>{e.title}</Link>
        </h2>
        <dl className="ev-facts">
          <div>
            <dt>Date</dt>
            <dd>{formatDay(e.startsAt)}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{timeRange(e)}</dd>
          </div>
          {e.location && (
            <div>
              <dt>Where</dt>
              <dd>{e.location}</dd>
            </div>
          )}
        </dl>
        {e.summary && <p className="ev-lead__summary">{e.summary}</p>}
        <div className="ev-lead__actions">
          <Link to={`/events/${e.id}`} className="btn btn--primary">
            Event details <Arrow />
          </Link>
          {e.signup && (
            <a
              className="btn btn--ghost"
              href={e.signup.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {e.signup.label}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

/** One event in the list: a date tile, what and where, and its state. The whole row links. */
function EventRow({ event: e, now, compact = false }) {
  const tile = dateTile(e.startsAt);
  return (
    <Link
      to={`/events/${e.id}`}
      className={`ev-row ${compact ? "ev-row--compact" : ""} ${e.state === "cancelled" ? "is-cancelled" : ""}`}
    >
      <span className="ev-tile" aria-hidden="true">
        <span className="ev-tile__month">{tile.month}</span>
        <span className="ev-tile__day">{tile.day}</span>
        <span className="ev-tile__weekday">{tile.weekday}</span>
      </span>
      <span className="ev-row__main">
        <span className="ev-row__meta">
          {e.category} · {timeRange(e)}
        </span>
        <span className="ev-row__title">{e.title}</span>
        {(e.location || e.host) && (
          <span className="ev-row__where">
            {[e.location, e.host && `Hosted by ${e.host}`]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
        {!compact && e.summary && (
          <span className="ev-row__summary">{e.summary}</span>
        )}
        <span className="visually-hidden">{formatDay(e.startsAt)}.</span>
      </span>
      <span className="ev-row__side">
        <StateBadge event={e} now={now} />
        <span className="ev-row__arrow" aria-hidden="true">
          <Arrow />
        </span>
      </span>
    </Link>
  );
}

function ListSkeleton() {
  return (
    <SkeletonGroup label="Loading events">
      <div className="ev-lead ev-lead--skeleton">
        <Skeleton w="100%" h="100%" radius={16} />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="ev-skel-row">
          <Skeleton w="4.5rem" h="4.5rem" radius={12} />
          <div style={{ flex: 1, display: "grid", gap: "0.6rem" }}>
            <Skeleton w="30%" h="0.8rem" />
            <Skeleton w={`${60 - i * 8}%`} h="1.3rem" />
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}
