import { Handshake } from 'lucide-react'

// StaffVerified logo mark — Katiwala handshake icon in a bordered app-icon tile
export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border-2 flex-shrink-0"
      style={{ width: size, height: size, borderColor: '#0A1D4D' }}
      aria-label="StaffVerified"
    >
      <Handshake width={size * 0.6} height={size * 0.6} color="#0A1D4D" strokeWidth={1.75} />
    </div>
  )
}
