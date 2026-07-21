// StaffVerified logo mark — official Dipstify app-icon asset (see katiwala-owner-os-/docs/DIPSTIFY_BRAND_GUIDE.md)
export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/brand/dipstify-app-icon.png"
      alt="StaffVerified"
      width={size}
      height={size}
      className="flex-shrink-0"
      style={{ width: size, height: size }}
    />
  )
}
