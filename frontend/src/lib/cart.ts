// The cart lives in this browser only (nothing is sent until checkout). The server prices everything.
const KEY = "wn_cart";
export type Cart = Record<string, number>;

export function readCart(): Cart {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Cart;
    return Object.fromEntries(Object.entries(raw).filter(([, q]) => Number.isInteger(q) && q > 0 && q <= 50));
  } catch {
    return {};
  }
}

export function writeCart(cart: Cart) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("wn-cart"));
  } catch {
    /* private mode: the cart just will not persist */
  }
}

export function addToCart(slug: string, quantity: number, digital: boolean) {
  const cart = readCart();
  cart[slug] = digital ? 1 : Math.min(50, (cart[slug] ?? 0) + quantity);
  writeCart(cart);
}
