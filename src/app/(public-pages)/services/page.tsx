import ServicesContent from "@/components/services/servicesContent";
import defaultMetadata from "@/lib/seo";
import { Metadata } from "next";

export function generateMetadata(): Metadata {
  return {
    title: "Services | Authentic Freelance Web Services | Abdul Wahed Nur",
    description: defaultMetadata.description,
    keywords: defaultMetadata.keywords,
    metadataBase: new URL(defaultMetadata.url),
    openGraph: {
      title: defaultMetadata.title,
      description: defaultMetadata.description,
      url: defaultMetadata.url,
      siteName: defaultMetadata.title,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: defaultMetadata.title,
      description: defaultMetadata.description,
    },
  };
}

export default function ServicesPage() {
  return (
    <div>
      <ServicesContent />
    </div>
  );
}
