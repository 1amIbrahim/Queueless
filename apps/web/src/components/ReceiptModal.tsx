import { useEffect, useRef } from 'react'

interface ReceiptData {
  tokenNumber: number
  doctorName: string
  hospitalName: string
  specialty: string
  estimatedWait: number
  position: number
  tokenId: string
}

interface Props {
  data: ReceiptData
  onClose: () => void
}

export default function ReceiptModal({ data, onClose }: Props) {
  const trackerUrl = `${window.location.origin}/track/${data.tokenId}`
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handlePrint = () => window.print()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Success header */}
        <div className="bg-blue-600 px-6 py-5 text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-2xl">✓</span>
          </div>
          <p className="text-white font-semibold">Token Issued Successfully</p>
        </div>

        {/* Receipt body */}
        <div ref={printRef} className="px-6 py-5">
          {/* Token number */}
          <div className="text-center mb-5 pb-5 border-b border-dashed border-slate-200">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Token Number</p>
            <p className="text-7xl font-black text-blue-600">#{data.tokenNumber}</p>
          </div>

          {/* Details */}
          <div className="space-y-3 mb-5">
            <Row label="Doctor" value={data.doctorName} />
            <Row label="Specialty" value={data.specialty} />
            <Row label="Hospital" value={data.hospitalName} />
            <Row label="Position" value={`${data.position} in queue`} />
            <Row label="Est. Wait" value={`~${data.estimatedWait} min`} highlight />
          </div>

          {/* QR code area */}
          <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
            <p className="text-xs text-slate-500 mb-2 font-medium">Track live position — scan or visit:</p>
            <p className="text-xs text-blue-600 font-mono break-all">{trackerUrl}</p>
          </div>

          <p className="text-center text-xs text-slate-400 mt-4">
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            Print Receipt
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            Issue Another
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-blue-600' : 'text-slate-800'}`}>{value}</span>
    </div>
  )
}
