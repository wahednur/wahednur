"use client";

import React from "react";
import ContactForm from "../contact-form/footer-contact-form";

export default function Footer() {
  return (
    <div className="bg-[url('/footer.jpg')] bg-cover bg-center w-full">
      <div className="container">
        <h1 className="sec-title text-center text-wahednur pt-10">
          Contact me
        </h1>
        <div className="flex flex-col md:flex-row justify-between items-center py-10 gap-6">
          <div className="w-full md:w-1/2 text-white">
            <h4 className="title mb-4">Want to Work with Me?</h4>
            <p>
              If you&apos;re looking for a Full Stack MERN Developer who not
              only writes code but also envisions the bigger picture, let’s
              connect! I specialize in crafting seamless, scalable, and
              innovative web applications tailored to your business needs. From
              intuitive interfaces to robust backend systems, I’m here to help
              you unlock your full potential. Whether it’s a custom project or a
              SaaS solution, I’m ready to bring your ideas to life. Let’s build
              something impactful together!
            </p>
          </div>
          <div className="w-full md:w-1/2">
            <ContactForm />
          </div>
        </div>
      </div>
      <div className="bg-wahednur text-white py-4 text-center">
        <p>
          &copy; 2016-{new Date().getFullYear()} @ Abdul Wahed Nur | All Right
          Reserved
        </p>
      </div>
    </div>
  );
}
