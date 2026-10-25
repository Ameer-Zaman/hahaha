import { useEffect } from 'react'
import { site } from '../config/site'

/** Sets the document title as "Page — Community Name". */
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — ${site.name}` : site.name
  }, [title])
}
