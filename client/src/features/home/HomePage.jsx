import usePageTitle from '../../hooks/usePageTitle'
import Hero from './sections/Hero'
import Welcome from './sections/Welcome'
import Ticker from './sections/Ticker'
import Features from './sections/Features'
import Join from './sections/Join'
import './home.css'

export default function HomePage() {
  usePageTitle(null)
  return (
    <>
      <Hero />
      <Welcome />
      <Ticker />
      <Features />
      <Join />
    </>
  )
}
