import usePageTitle from '../../hooks/usePageTitle'
import Hero from './sections/Hero'
import Welcome from './sections/Welcome'
import Features from './sections/Features'
import Join from './sections/Join'
import './home.css'

export default function HomePage() {
  usePageTitle(null)
  return (
    <>
      <Hero />
      <Welcome />
      <Features />
      <Join />
    </>
  )
}
