import { site } from '../../../config/site'

/**
 * A ticket-stub summary of the archive's real state — counts come from the data,
 * so it can never claim more than exists.
 */
export default function ArchiveTicket({ summary }) {
  return (
    <div className="ticket" role="group" aria-label="Archive status">
      <div className="ticket__main">
        <p className="ticket__title">The archive</p>
        <dl className="ticket__facts">
          <div>
            <dt>Confirmed files</dt>
            <dd>{summary.confirmed}</dd>
          </div>
          <div>
            <dt>Reserved files</dt>
            <dd>{summary.reserved}</dd>
          </div>
        </dl>
      </div>
      <div className="ticket__stub" aria-hidden="true">
        <span>{site.launch.isLive ? 'Open' : 'Pre-launch'}</span>
      </div>
    </div>
  )
}
