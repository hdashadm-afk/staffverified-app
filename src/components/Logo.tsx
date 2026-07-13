import { Handshake } from 'lucide-react'

// StaffVerified logo mark — Katiwala ecosystem handshake icon
export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <Handshake
      width={size}
      height={size}
      color="#0A1D4D"
      strokeWidth={1.75}
      aria-label="StaffVerified"
    />
  )
}
