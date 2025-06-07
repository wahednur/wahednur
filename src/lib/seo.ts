export interface BasicSEO {
  title: string;
  description: string;
  keywords?: string[];
  url: string;
}

const defaultMetadata: BasicSEO = {
  title: "Abdul Wahed Nur | Full Stack Developer",
  description: "Modern web apps with Next.js, MongoDB, Tailwind.",
  keywords: ["Full Stack", "Next.js", "MongoDB"],
  url: "https://yourdomain.com",
};

export default defaultMetadata;
