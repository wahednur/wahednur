/** Display only: the server worked the numbers out, this only adds the currency sign and commas. */
const SIGN: Record<string, string> = { BDT: "৳", USD: "$" };

export function money(currency: string, value: string | number): string {
  const [whole, frac = "00"] = String(value).split(".");
  const neg = whole.startsWith("-");
  const digits = whole.replace("-", "");
  return `${neg ? "-" : ""}${SIGN[currency] ?? currency + " "}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${(frac + "00").slice(0, 2)}`;
}

export const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "—");
