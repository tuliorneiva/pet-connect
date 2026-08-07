const base = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold";

export function HealthBadges({ upToDate, underTreatment }: {
  upToDate: boolean | null;
  underTreatment: boolean;
}) {
  if (upToDate === null && !underTreatment) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {upToDate === true && (
        <span className={`${base} border-emerald-200 bg-emerald-50 text-emerald-700`}>
          <span aria-hidden="true">✓</span> Vacinação em dia
        </span>
      )}
      {upToDate === false && (
        <span className={`${base} border-amber-200 bg-amber-50 text-amber-700`}>
          Vacinação pendente
        </span>
      )}
      {underTreatment && (
        <span className={`${base} border-amber-200 bg-amber-50 text-amber-700`}>
          Em tratamento
        </span>
      )}
    </div>
  );
}
