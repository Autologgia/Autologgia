export const VEHICLE_STATUS_CONFIG: Record<
  string,
  { label: string; badgeBg: string; subtleClasses: string }
> = {
  disponible: {
    label: "Disponible",
    badgeBg: "bg-emerald-500",
    subtleClasses: "bg-emerald-500/15 text-emerald-600",
  },
  en_preparation: {
    label: "En préparation",
    badgeBg: "bg-gray-500",
    subtleClasses: "bg-gray-500/15 text-gray-500",
  },
  reserve: {
    label: "Réservé",
    badgeBg: "bg-sky-500",
    subtleClasses: "bg-sky-500/15 text-sky-600",
  },
  vendu: {
    label: "Vendu",
    badgeBg: "bg-premium-red",
    subtleClasses: "bg-premium-red-soft text-premium-red",
  },
  occasion: {
    label: "Disponible",
    badgeBg: "bg-emerald-500",
    subtleClasses: "bg-emerald-500/15 text-emerald-600",
  },
  neuf: {
    label: "Disponible",
    badgeBg: "bg-emerald-500",
    subtleClasses: "bg-emerald-500/15 text-emerald-600",
  },
};

export function getVehicleStatusInfo(status?: string) {
  return status ? VEHICLE_STATUS_CONFIG[status] ?? null : null;
}
