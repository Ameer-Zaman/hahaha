import usePageTitle from '../../hooks/usePageTitle'
import Reel from './components/Reel'
import { getArchiveFiles } from './gangsModel'
import './gangs.css'

// Static data today; computed once per page load. When the API arrives, swap this for a fetch.
const files = getArchiveFiles()

export default function GangsPage() {
  usePageTitle('Gangs')
  return <Reel files={files} />
}
