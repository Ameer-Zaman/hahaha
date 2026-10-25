import { PageLoader } from '../../../components/ui/Skeleton'

/** The moment it takes the gang archive to arrive: black screen, the pulsing diamond. */
export default function GangsLoading({ label }) {
  return (
    <div className="gangs-wait">
      <PageLoader label={label} />
    </div>
  )
}
