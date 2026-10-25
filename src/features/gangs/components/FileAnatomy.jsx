import { fileAnatomy } from '../../../content/gangs'

/**
 * Shows what an opened file will hold, as an empty specimen page with labelled slots.
 * It sets expectations without inventing a single detail.
 */
export default function FileAnatomy() {
  return (
    <section className="anatomy theme-black section" aria-labelledby="anatomy-title">
      <div className="container anatomy__grid">
        <div className="anatomy__text">
          <h2 id="anatomy-title" className="anatomy__title">
            What a file holds
          </h2>
          <dl className="anatomy__list">
            {fileAnatomy.map((item) => (
              <div key={item.field}>
                <dt>{item.field}</dt>
                <dd>{item.detail}</dd>
              </div>
            ))}
          </dl>
        </div>

        <figure className="specimen" aria-label="Empty example of a gang file">
          <div className="specimen__head">
            <span className="specimen__emblem">Emblem</span>
            <div className="specimen__titles">
              <span className="specimen__slot specimen__slot--name">Name</span>
              <span className="specimen__slot specimen__slot--short">Territory</span>
            </div>
          </div>
          <div className="specimen__image">Image</div>
          <div className="specimen__story">
            <span className="specimen__label">Story</span>
            <span className="specimen__line" />
            <span className="specimen__line" />
            <span className="specimen__line specimen__line--short" />
          </div>
          <div className="specimen__record">
            <span className="specimen__label">Record</span>
            <span className="specimen__row" />
            <span className="specimen__row" />
          </div>
          <figcaption className="specimen__caption">An unopened file</figcaption>
        </figure>
      </div>
    </section>
  )
}
