import HomeSlider from "@/components/home/slider/home-slider";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wahed Nur | Full stack developer",
  description:
    "Innovative MERN Developer | SaaS Visionary | Feature-Driven Problem Solver",
};
export default function Home() {
  return (
    <div>
      <HomeSlider />
    </div>
  );
}
