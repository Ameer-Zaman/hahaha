import ParallaxScope from '../../../components/ui/ParallaxScope'
import { features } from '../../../content/home'

const REPEAT = 3

/**
 * Two rows of oversized words sliding in opposite directions as the page scrolls.
 * Decorative: the same words are listed as tags in the next section, so this is hidden
 * from assistive technology. Rows rest in place when motion is reduced.
 */
export default function Ticker() {
  const words = features.tags
  const row = (variant) =>
    Array.from({ length: REPEAT }, (_, n) =>
      words.map((word) => (
        <span key={`${variant}-${n}-${word}`} className="ticker__item">
          {word}
          <span className="ticker__diamond" />
        </span>
      )),
    )

  return (
    <ParallaxScope as="section" className="ticker theme-black" aria-hidden="true">
      <div className="ticker__row" data-parallax="x:-4%:-34%">
        {row('a')}
      </div>
      <div className="ticker__row ticker__row--outline" data-parallax="x:-34%:-4%">
        {row('b')}
      </div>
    </ParallaxScope>
  )
}
