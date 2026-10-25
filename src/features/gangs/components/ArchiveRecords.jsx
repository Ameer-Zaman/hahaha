import { Link } from 'react-router-dom'
import Arrow from '../../../components/ui/Arrow'

/**
 * History and records. The war archive is a later phase; this reserves its place
 * in the page and shows an honest empty ledger in the meantime.
 */
export default function ArchiveRecords() {
  return (
    <section className="records theme-dark section" aria-labelledby="records-title">
      <div className="container records__grid">
        <div>
          <h2 id="records-title" className="records__title">
            History and records
          </h2>
          <p className="lede">
            Wars between gangs will be recorded here with their dates, the families involved
            and the outcome. The record starts when the city opens.
          </p>
        </div>
        <table className="ledger">
          <caption className="visually-hidden">Recorded wars</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Parties</th>
              <th scope="col">Outcome</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={3} className="ledger__empty">
                No wars recorded yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="container records__cta">
        <p className="records__cta-text">Want a place in the story? It starts with an application.</p>
        <Link to="/apply" className="btn btn--primary btn--large">
          Apply now <Arrow />
        </Link>
      </div>
    </section>
  )
}
