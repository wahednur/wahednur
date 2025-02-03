import React from "react";

export default function HomeSlider() {
  return (
    <div className="w-full aspect-mobile md:aspect-banner bg-[url('/banner.jpg')] bg-cover bg-center">
      <div className="bg-[url('/wahednur.png')] bg-contain w-full h-full bg-no-repeat bg-center lg:bg-right-bottom">
        <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-white font-black">
            Abdul Wahed Nur
          </h1>
          <h2 className="text-heading text-center md:sub-title lg:text-xl  text-wahednur font-bold">
            Full Stack MERN Developer | Feature-Driven Problem Solver
          </h2>
          <div className="grid grid-cols-2 gap-6"></div>
        </div>
      </div>
    </div>
  );
}
