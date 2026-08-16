// ============================================================================
// Responzivna mreža - jedna kolona na telefonu, dvije na tabletu, tri na
// desktopu. Koristi se za liste kartica (džuzevi, sure, objave bloga).
// ============================================================================

export default function Grid({ children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
      {children}
    </div>
  )
}