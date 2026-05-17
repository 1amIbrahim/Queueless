interface QueueItem {
  id: string
  status: string
  queue_length: number
  estimated_wait_minutes: number
  avg_minutes_per_patient: number
  last_called_number: number
  doctors: {
    id: string
    name: string
    specialty: string
  }
}

const STATUS = {
  open:   { label: 'Open',   cls: 'bg-green-100 text-green-700' },
  paused: { label: 'Paused', cls: 'bg-amber-100 text-amber-700' },
  closed: { label: 'Closed', cls: 'bg-slate-100 text-slate-500' },
} as const

function waitColor(min: number) {
  if (min === 0) return 'text-green-600'
  if (min <= 20) return 'text-green-600'
  if (min <= 45) return 'text-amber-600'
  return 'text-red-600'
}

interface Props {
  queue: QueueItem
  onCallNext?: () => void
  callingNext?: boolean
}

export default function DoctorQueueCard({ queue, onCallNext, callingNext }: Props) {
  const s = STATUS[queue.status as keyof typeof STATUS] ?? STATUS.closed

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-200 hover:shadow-sm transition-all">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="font-semibold text-slate-900">{queue.doctors.name}</p>
          <p className="text-sm text-slate-500 capitalize mt-0.5">{queue.doctors.specialty}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>
          {s.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat
          label="Waiting"
          value={String(queue.queue_length)}
          color="text-slate-900"
        />
        <Stat
          label="Est. Wait"
          value={queue.queue_length === 0 ? 'None' : `~${queue.estimated_wait_minutes}m`}
          color={waitColor(queue.estimated_wait_minutes)}
        />
        <Stat
          label="Now Serving"
          value={queue.last_called_number > 0 ? `#${queue.last_called_number}` : '—'}
          color="text-blue-600"
        />
      </div>

      {onCallNext && queue.status === 'open' && (
        <button
          onClick={onCallNext}
          disabled={callingNext || queue.queue_length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
        >
          {callingNext ? 'Calling…' : queue.queue_length === 0 ? 'Queue Empty' : 'Call Next Patient →'}
        </button>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}
