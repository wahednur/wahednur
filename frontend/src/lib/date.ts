// Dates are shown in the Bangladesh style, dd/mm/yyyy.
const p2 = (n: number) => String(n).padStart(2, "0");

/** Bangladesh date style: dd/mm/yyyy. A plain date (2026-10-28) is shown as it is; a timestamp in the viewer's own time. */
export function day(iso: string | null | undefined): string {
  if (!iso) return "—";
  if (iso.length <= 10) return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** dd/mm/yyyy hh:mm (24-hour), in the viewer's own time. */
export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${day(iso)} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}
