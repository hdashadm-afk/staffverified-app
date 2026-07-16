// StaffVerified logo mark — official Katiwala app-icon asset (see katiwala-owner-os-/docs/BRAND_GUIDE.md §2)
export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/brand/katiwala-app-icon.png"
      alt="StaffVerified"
      width={size}
      height={size}
      className="flex-shrink-0"
      style={{ width: size, height: size }}
    />
  )
}
