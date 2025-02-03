import Link from "next/link";
import React from "react";
import { BsMouse } from "react-icons/bs";

export default function HomeSlider() {
  return (
    <div className="w-full aspect-mobile md:aspect-banner bg-[url('/banner.jpg')] bg-cover bg-center relative">
      <div className="bg-[url('/wahednur.png')] bg-contain w-full h-full bg-no-repeat bg-bottom lg:bg-right-bottom">
        <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-white font-black">
            Abdul Wahed Nur
          </h1>
          <h2 className="text-heading text-center md:sub-title lg:text-xl  text-success font-bold">
            Full Stack MERN Developer | Feature-Driven Problem Solver
          </h2>
          <div className="grid grid-cols-2 gap-6 mt-10">
            <Link href={`/about`} className="btn-gdn">
              About Me
            </Link>
            <Link href={`/portfolio`} className="btn-outline">
              Portfolio
            </Link>
            <Link href={`/contact`} className="btn-outline">
              Contact Me
            </Link>
            <Link href={`/services`} className="btn-gdn">
              Services
            </Link>
          </div>
          <div className="flex justify-center items-center absolute bottom-10 left-auto">
            <a
              href="#about"
              className="cursor-pointer animate-bounce text-wahednur text-2xl"
            >
              <BsMouse />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
