/** Small line icons for the dashboard tiles. Decorative: the text next to each one says it all. */
const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const paths: Record<string, string> = {
  projects: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  billing: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  documents: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  orders: "M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2",
  subscriptions: "M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2M20 4v5h-5M4 20v-5h5",
  security: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4",
  packages: "M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10",
  arrow: "M5 12h14M13 6l6 6-6 6",
};

export default function Icon({ name }: { name: keyof typeof paths | string }) {
  return (
    <svg {...base}>
      <path d={paths[name] ?? paths.arrow} />
    </svg>
  );
}
