import FactionState from '../../components/ui/FactionState'
import usePageTitle from '../../hooks/usePageTitle'
import Reel from './components/Reel'
import GangsLoading from './components/GangsLoading'
import { useGangFiles } from './gangsModel'
import './gangs.css'

export default function GangsPage() {
  usePageTitle('Gangs')
  const { ready, state, source, files, retry } = useGangFiles()
  // The reel's length is fixed when it mounts, so it waits (a few seconds at most) for the
  // API's answer instead of spinning through the built-in list and then swapping it.
  if (!ready) return <GangsLoading label="Loading gangs" />
  if (state === 'empty') return <FactionState kind="empty" faction="gangs" />
  if (state === 'error') return <FactionState kind="error" faction="gangs" onRetry={retry} />
  return <Reel key={source} files={files} />
}
