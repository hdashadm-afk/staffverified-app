// Helium Fuels mark — red sunburst petals around a white "He" core, with the yellow flame.
// Faithful SVG recreation of the official logo (swap for the real asset if desired).
const RED = '#E2231A'
const YELLOW = '#FFE000'

export default function HeliumLogo({ size = 32 }: { size?: number }) {
  const petals = Array.from({ length: 12 })
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="Helium Fuels">
      <g fill={RED}>
        {petals.map((_, i) => (
          <polygon
            key={i}
            points="40.8,3 59.2,3 55.6,21 44.4,21"
            transform={`rotate(${i * 30} 50 50)`}
          />
        ))}
      </g>
      {/* white core */}
      <circle cx="50" cy="50" r="29" fill="#fff" />
      {/* yellow flame cutting in from lower-left */}
      <polygon points="51,54 11,96 43,97" fill={YELLOW} stroke={RED} strokeWidth="1.6" strokeLinejoin="round" />
      {/* He wordmark */}
      <text x="50" y="51" textAnchor="middle" dominantBaseline="central"
        fontSize="30" fontWeight="800" fill={RED} fontFamily="Arial, Helvetica, sans-serif">He</text>
    </svg>
  )
}
