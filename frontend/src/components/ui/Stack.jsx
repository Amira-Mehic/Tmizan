// ============================================================================
// Slaže sadržaj jedno ispod drugog s ujednačenim razmakom.
// ============================================================================

export default function Stack({ children }) {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {children}
    </div>
  )
}