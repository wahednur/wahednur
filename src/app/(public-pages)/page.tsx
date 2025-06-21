import Banner from "@/components/banners/banner";
import HomeAbout from "@/components/home/HoemAbout";
import defaultMetadata from "@/lib/seo";
import { Metadata } from "next";
import JobServicesSection from "../../components/services/JobServicesSection";
import MySkills from "../../components/skills/MySkills";

export function generateMetadata(): Metadata {
  return {
    title: defaultMetadata.title,
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

export default function Home() {
  return (
    <div className="-mt-5">
      <Banner />
      <div>
        <HomeAbout />
      </div>
      <div className="container py-10 lg:py-20">
        <MySkills />
      </div>
      <div className="bg-gray-200">
        <div className="container py-10 lg:py-20">
          <JobServicesSection />
        </div>
      </div>
    </div>
  );
}
