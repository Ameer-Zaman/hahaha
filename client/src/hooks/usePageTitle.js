import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { SITE_URL, clip, fullTitle, pageFor } from '../config/seo'

/** Find or make a <meta>/<link> in the head and set one attribute on it. */
function setHead(selector, make, attr, value) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = make()
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}
const meta = (key, name, value) =>
  setHead(
    `meta[${key}="${name}"]`,
    () => {
      const m = document.createElement('meta')
      m.setAttribute(key, name)
      return m
    },
    'content',
    value,
  )

/**
 * Sets the document title as "Page — Community Name", and keeps what search engines and link
 * previews read (description, canonical address, Open Graph) in step with the page shown.
 * `description` is optional: pages listed in config/seo.js have their own.
 */
export default function usePageTitle(title, description) {
  const { pathname } = useLocation()
  useEffect(() => {
    const text = fullTitle(title)
    document.title = text
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/'
    const url = SITE_URL + (path === '/' ? '/' : path)
    const desc = clip(description || pageFor(path)?.description || pageFor('/').description)
    meta('name', 'description', desc)
    meta('property', 'og:title', text)
    meta('property', 'og:description', desc)
    meta('property', 'og:url', url)
    meta('name', 'twitter:title', text)
    meta('name', 'twitter:description', desc)
    setHead(
      'link[rel="canonical"]',
      () => {
        const l = document.createElement('link')
        l.rel = 'canonical'
        return l
      },
      'href',
      url,
    )
  }, [title, description, pathname])
}
