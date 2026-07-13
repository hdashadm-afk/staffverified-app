// StaffVerified logo mark — Brand Blue shield + white verified check
export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="StaffVerified">
      {/* shield/badge */}
      <path
        d="M24 3l16 5v13c0 11-7 19-16 24C15 40 8 32 8 21V8l16-5z"
        fill="#1E3A5F"
      />
      {/* inner highlight */}
      <path
        d="M24 3l16 5v13c0 11-7 19-16 24C15 40 8 32 8 21V8l16-5z"
        fill="url(#g)"
        fillOpacity="0.18"
      />
      {/* verified check */}
      <path
        d="M16.5 24.5l5 5 10-11"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="g" x1="24" y1="3" x2="24" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}
