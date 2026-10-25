import { Link } from 'react-router-dom'

import Plate from '../../../components/media/Plate'
import { areas } from '../../../content/home'
import { ruleCategories } from '../../../content/rules'
import { roleGroups } from '../../../content/staff'

/**
 * The site's main areas, each given its own composition rather than a shared card:
 * a split roster, a full-bleed title card, a ledger, and an index.
 */
export default function Areas() {
  return (
    <>
      <Administration />
      <Gangs />
      <Wars />
      <Rules />
    </>
  )
}

function Administration() {
  const a = areas.administration
  return (
    <section className="area-admin theme-light theme-white section" aria-labelledby="area-admin-title">
      <div className="container area-admin__grid">
        <div className="area-admin__text">
          <h2 id="area-admin-title" className="area__title">
            {a.heading}
          </h2>
          <p className="lede">{a.body}</p>
          <Link to={a.to} className="text-link">
            {a.cta}
          </Link>
        </div>
        <ol role="list" className="area-admin__roster" aria-label="Administration structure">
          {roleGroups.map((group) => (
            <li key={group.id} className="area-admin__row">
              <span className="area-admin__portrait" aria-hidden="true" />
              <span className="area-admin__role">{group.title}</span>
              <span className="area-admin__state">Names to be announced</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Gangs() {
  const g = areas.gangs
  return (
    <section className="area-gangs theme-black" aria-labelledby="area-gangs-title">
      <Plate className="area-gangs__plate" seed={88} horizon={0.8} />
      <div className="container area-gangs__content">
        <h2 id="area-gangs-title" className="area-gangs__title">
          {g.heading}
        </h2>
        <p className="area-gangs__body">{g.body}</p>
        <Link to={g.to} className="btn btn--primary btn--large">
          {g.cta}
        </Link>
      </div>
    </section>
  )
}

function Wars() {
  const w = areas.wars
  return (
    <section className="area-wars theme-dark section" aria-labelledby="area-wars-title">
      <div className="container area-wars__grid">
        <div>
          <h2 id="area-wars-title" className="area__title">
            {w.heading}
          </h2>
          <p className="lede">{w.body}</p>
        </div>
        <table className="ledger">
          <caption className="visually-hidden">War archive</caption>
          <thead>
            <tr>
              {w.columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={w.columns.length} className="ledger__empty">
                {w.emptyLabel}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Rules() {
  const r = areas.rules
  return (
    <section className="area-rules theme-light section" aria-labelledby="area-rules-title">
      <div className="container area-rules__grid">
        <div className="area-rules__text">
          <h2 id="area-rules-title" className="area__title">
            {r.heading}
          </h2>
          <p className="lede">{r.body}</p>
          <Link to={r.to} className="text-link">
            {r.cta}
          </Link>
        </div>
        <ul role="list" className="area-rules__index">
          {ruleCategories.map((category) => (
            <li key={category.id}>
              <Link to={`/rules#${category.id}`} className="area-rules__item">
                <span className="area-rules__name">{category.title}</span>
                <span className="area-rules__count">
                  {category.rules.length} {category.rules.length === 1 ? 'rule' : 'rules'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
