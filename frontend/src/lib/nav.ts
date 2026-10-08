// The site's main links, in one place. Packages, Shop and Blog are on by default; set
// NEXT_PUBLIC_SHOW_PACKAGES / _SHOP / _BLOG to "false" in the website's environment to hide one.
const on = (flag: string | undefined) => flag !== "false";

export type NavItem = { href: string; label: string };

export const mainNav: NavItem[] = [
  { href: "/work", label: "Work" },
  { href: "/services", label: "Services" },
  ...(on(process.env.NEXT_PUBLIC_SHOW_PACKAGES) ? [{ href: "/packages", label: "Packages" }] : []),
  ...(on(process.env.NEXT_PUBLIC_SHOW_SHOP) ? [{ href: "/shop", label: "Shop" }] : []),
  ...(on(process.env.NEXT_PUBLIC_SHOW_BLOG) ? [{ href: "/blog", label: "Blog" }] : []),
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];
