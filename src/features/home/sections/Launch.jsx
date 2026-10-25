import { Link } from 'react-router-dom'

import Arrow from '../../../components/ui/Arrow'
import ParallaxScope from '../../../components/ui/ParallaxScope'
import ParallaxWord from '../../../components/ui/ParallaxWord'
import { launch } from '../../../content/home'

/** Floating diamonds at different depths — nearer ones are larger and move further. */
const DIAMONDS = [
  { top: '18%', left: '9%', size: '0.6rem', motion: 'y:30:-30' },
  { top: '64%', left: '15%', size: '1.1rem', motion: 'y:90:-90', solid: true },
  { top: '30%', left: '84%', size: '0.8rem', motion: 'y:50:-50' },
  { top: '72%', left: '78%', size: '1.5rem', motion: 'y:140:-140' },
  { top: '10%', left: '62%', size: '0.5rem', motion: 'y:20:-20', solid: true },
]

export default function Launch() {
  return (
    <ParallaxScope as="section" className="launch theme-dark section" aria-labelledby="launch-title">
      <ParallaxWord text="Day one" motion="x:-12%:4%" className="launch__word" />
      {DIAMONDS.map((d) => (
        <span
          key={`${d.top}-${d.left}`}
          className={`float-diamond ${d.solid ? 'float-diamond--solid' : ''}`}
          style={{ top: d.top, left: d.left, '--size': d.size }}
          aria-hidden="true"
          data-parallax={d.motion}
        />
      ))}

      <div className="container launch__inner">
        <p className="eyebrow">{launch.eyebrow}</p>
        <h2 id="launch-title" className="launch__title">
          {launch.title.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>
        <p className="launch__body">{launch.body}</p>
        <Link to="/apply" className="btn btn--primary btn--large">
          {launch.cta} <Arrow />
        </Link>
      </div>
    </ParallaxScope>
  )
}
