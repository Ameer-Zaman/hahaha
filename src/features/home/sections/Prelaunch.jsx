import { Link } from 'react-router-dom'

import { prelaunch } from '../../../content/home'

export default function Prelaunch() {
  return (
    <section className="prelaunch theme-light theme-white section" aria-labelledby="prelaunch-title">
      <div className="container">
        <h2 id="prelaunch-title" className="prelaunch__title">
          {prelaunch.heading}
        </h2>
        <p className="lede prelaunch__lede">{prelaunch.body}</p>

        <ol className="prelaunch__steps">
          {prelaunch.steps.map((step, index) => (
            <li key={step.title} className="prelaunch__step">
              <span className="prelaunch__num" aria-hidden="true">
                {index + 1}
              </span>
              <h3 className="prelaunch__step-title">{step.title}</h3>
              <p className="prelaunch__step-detail">{step.detail}</p>
            </li>
          ))}
        </ol>

        <Link to="/apply" className="btn btn--primary btn--large">
          {prelaunch.cta}
        </Link>
      </div>
    </section>
  )
}
