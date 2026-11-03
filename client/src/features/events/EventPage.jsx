import { Link, useParams } from "react-router-dom";

import Plate from "../../components/media/Plate";
import Arrow from "../../components/ui/Arrow";
import { Skeleton, SkeletonGroup } from "../../components/ui/Skeleton";
import usePageTitle from "../../hooks/usePageTitle";
import { usePublic } from "../../lib/publicData";
import { StateBadge } from "./EventsPage";
import {
  downloadCalendar,
  formatDay,
  formatTime,
  liveState,
  seedFor,
  timeRange,
  untilText,
  useNow,
  zoneName,
} from "./eventsModel";
import "./events.css";

/** One event: everything about it, and how to take part. */
export default function EventPage() {
  const { slug } = useParams();
  const entry = usePublic(`/events/${encodeURIComponent(slug)}`);
  const now = useNow();
  const event = entry.status === "ok" ? entry.data?.event : null;
  usePageTitle(event?.title ?? "Event");

  if (entry.status === "loading") return <PageSkeleton />;
  if (!event)
    return (
      <NotFound failed={entry.status !== "ok" && entry.status !== "missing"} />
    );
  return (
    <EventView event={{ ...event, state: liveState(event, now) }} now={now} />
  );
}

function EventView({ event: e, now }) {
  const open = e.state === "upcoming" || e.state === "live";
  const paragraphs = e.description
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <article className="evp theme-black" aria-labelledby="evp-title">
      <header className="evp-hero">
        <div className="evp-hero__media" aria-hidden="true">
          <Plate
            image={e.image}
            seed={seedFor(e.id)}
            horizon={0.7}
            priority
            parallax
          />
          <span className="evp-hero__shade" />
        </div>
        <div className="container evp-hero__inner">
          <Link to="/events" className="evp-back">
            <span aria-hidden="true">«</span> All events
          </Link>
          <p className="ev-meta">
            <span className="ev-meta__cat">{e.category}</span>
            <StateBadge event={e} now={now} />
          </p>
          <h1
            id="evp-title"
            className={`evp-title ${e.state === "cancelled" ? "is-cancelled" : ""}`}
          >
            {e.title}
          </h1>
          {e.summary && <p className="evp-summary">{e.summary}</p>}

          <dl className="evp-facts">
            <Fact label="Date">{formatDay(e.startsAt)}</Fact>
            <Fact label="Time">{timeRange(e)}</Fact>
            {e.location && <Fact label="Where">{e.location}</Fact>}
            {e.host && <Fact label="Hosted by">{e.host}</Fact>}
            {e.capacity > 0 && <Fact label="Places">{e.capacity}</Fact>}
          </dl>
        </div>
      </header>

      <Status event={e} now={now} />

      <div className="container evp-body">
        <div className="evp-main">
          {paragraphs.length > 0 && (
            <section className="evp-block" aria-labelledby="evp-about">
              <h2 id="evp-about" className="evp-block__title">
                About
              </h2>
              {paragraphs.map((p, i) => (
                <p key={i} className="evp-text">
                  {p}
                </p>
              ))}
            </section>
          )}

          {e.schedule.length > 0 && (
            <section className="evp-block" aria-labelledby="evp-programme">
              <h2 id="evp-programme" className="evp-block__title">
                Programme
              </h2>
              <ol className="evp-timeline" role="list">
                {e.schedule.map((s, i) => (
                  <li key={i} className="evp-timeline__item">
                    <span className="evp-timeline__time">{s.time || "—"}</span>
                    <span className="evp-timeline__what">{s.item}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {e.requirements.length > 0 && (
            <section className="evp-block" aria-labelledby="evp-need">
              <h2 id="evp-need" className="evp-block__title">
                What you need
              </h2>
              <ul className="evp-checks" role="list">
                {e.requirements.map((r, i) => (
                  <li key={i}>
                    <svg
                      viewBox="0 0 16 16"
                      width="16"
                      height="16"
                      aria-hidden="true"
                    >
                      <path
                        d="m3.5 8.5 3 3 6-7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {r}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {e.prizes.length > 0 && (
            <section className="evp-block" aria-labelledby="evp-prizes">
              <h2 id="evp-prizes" className="evp-block__title">
                Prizes
              </h2>
              <ol className="evp-prizes" role="list">
                {e.prizes.map((p, i) => (
                  <li
                    key={i}
                    className={`evp-prize ${i === 0 ? "is-first" : ""}`}
                  >
                    {p.place && (
                      <span className="evp-prize__place">{p.place}</span>
                    )}
                    <span className="evp-prize__what">{p.prize}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {paragraphs.length === 0 &&
            e.schedule.length === 0 &&
            e.requirements.length === 0 &&
            e.prizes.length === 0 && (
              <p className="evp-text evp-text--muted">
                More details will be posted here closer to the day.
              </p>
            )}
        </div>

        <aside className="evp-aside" aria-label="Take part">
          <div className="evp-card">
            <p className="evp-card__title">Take part</p>
            <p className="evp-card__when">
              <span>{formatDay(e.startsAt)}</span>
              <span>
                {formatTime(e.startsAt)} {zoneName(e.startsAt)}
              </span>
            </p>
            {e.capacity > 0 && (
              <p className="evp-card__line">{e.capacity} places</p>
            )}
            {open && e.signup && (
              <a
                className="btn btn--primary evp-card__btn"
                href={e.signup.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {e.signup.label} <Arrow />
              </a>
            )}
            {open && (
              <button
                type="button"
                className="btn btn--ghost evp-card__btn"
                onClick={() => downloadCalendar(e)}
              >
                Add to calendar
              </button>
            )}
            {open && !e.signup && (
              <p className="evp-card__line">
                No sign-up needed — just be there on time.
              </p>
            )}
            {!open && (
              <p className="evp-card__line">
                {e.state === "cancelled"
                  ? "This event is not going ahead."
                  : "This event has finished."}
              </p>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}

function Fact({ label, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** The one line that says where things stand right now. */
function Status({ event: e, now }) {
  let text;
  if (e.state === "cancelled")
    text = e.statusNote
      ? `Cancelled — ${e.statusNote}`
      : "This event has been cancelled.";
  else if (e.state === "live")
    text = `On now — started at ${formatTime(e.startsAt)}, runs until about ${formatTime(e.endsBy)}.`;
  else if (e.state === "upcoming")
    text = `Starts in ${untilText(e.startsAt, now)}.`;
  else text = "This event has finished.";
  return (
    <div className={`evp-status evp-status--${e.state}`} role="status">
      <div className="container">{text}</div>
    </div>
  );
}

function NotFound({ failed }) {
  return (
    <section
      className="page-head theme-black evp-missing"
      aria-labelledby="evp-missing"
    >
      <div className="container">
        <h1 id="evp-missing" className="page-head__title">
          {failed ? "This event can’t be loaded" : "No event by that name"}
        </h1>
        <p className="lede">
          {failed
            ? "Try again in a moment."
            : "It may have been taken down, or the address is wrong."}
        </p>
        <Link
          to="/events"
          className="btn btn--primary btn--large evp-missing__btn"
        >
          All events <Arrow />
        </Link>
      </div>
    </section>
  );
}

function PageSkeleton() {
  return (
    <SkeletonGroup label="Loading the event" className="evp theme-black">
      <div className="evp-hero evp-hero--skeleton">
        <div className="container evp-hero__inner">
          <Skeleton w="8rem" h="0.9rem" />
          <Skeleton w="60%" h="3.5rem" />
          <Skeleton w="40%" h="1rem" />
        </div>
      </div>
    </SkeletonGroup>
  );
}
