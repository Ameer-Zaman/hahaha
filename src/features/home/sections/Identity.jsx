import { identity } from '../../../content/home'

export default function Identity() {
  return (
    <section className="identity theme-light section" aria-labelledby="identity-title">
      <div className="container identity__grid">
        <h2 id="identity-title" className="identity__title">
          {identity.heading}
        </h2>
        <div className="identity__body">
          {identity.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <dl className="identity__principles">
          {identity.principles.map((item) => (
            <div key={item.term} className="identity__principle">
              <dt>{item.term}</dt>
              <dd>{item.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
