import type data from '@/data/siteData.json';
type Show = (typeof data.upcomingShows)[number];

export function ShowCard({ show, compact = false }: { show: Show; compact?: boolean }) {
  return (
    <article className="show-card">
      <div className="show-header">
        <span className="date-pill">{show.displayDate}</span>
        {show.ticketUrl ? (
          <a className="button small" href={show.ticketUrl} target="_blank" rel="noopener noreferrer">
            Buy Tickets
          </a>
        ) : (
          <span className="button small ghost">Details soon</span>
        )}
      </div>
      <h3>{show.title}</h3>
      <p className="venue">
        {show.venue} · {show.city}, {show.region}
      </p>
      {show.time && <p className="time">{show.time}</p>}
      {!compact && show.notes && <p className="notes">{show.notes}</p>}
    </article>
  );
}
