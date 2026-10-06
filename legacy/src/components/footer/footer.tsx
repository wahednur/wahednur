"use client";

import Link from "next/link";
import { FaFacebookF } from "react-icons/fa";
import { FaLinkedinIn, FaXTwitter } from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container py-10 px-6 lg:px-0">
        <div className="grid grid-cols-12 gap-6">
          {/* Branding */}
          <div className="col-span-12 md:col-span-4 lg:col-span-3">
            <h2 className="text-xl font-bold">Wahed Nur</h2>
            <p className="text-sm mt-2">
              Empowering businesses with reliable digital solutions since 2012
            </p>
          </div>
          {/* Quick Links */}
          <div className="col-span-6 md:col-span-4 lg:col-span-3">
            <h3 className="font-semibold mb-2">Quick Links</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/" className="hover:underline">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:underline">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:underline">
                  Products
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:underline">
                  About
                </Link>
              </li>
            </ul>
          </div>
          {/* Legal */}
          <div className="col-span-6 md:col-span-4 lg:col-span-3">
            <h3 className="font-semibold mb-2">Legal</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/terms" className="hover:underline">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:underline">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:underline">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
          {/* Contact & Social */}
          <div className="col-span-6 md:col-span-4 lg:col-span-3">
            <h3 className="font-semibold mb-2">Contact</h3>
            <p className="text-sm">
              Email:
              <Link
                href="mailto:wahednur@gmail.com"
                className="hover:underline"
              >
                wahednur@gmail.com
              </Link>
            </p>
            <p className="text-sm">
              Phone:{" "}
              <Link href="tel:+8801917839303" className="hover:underline">
                +88 01917839303
              </Link>
            </p>
            <div className="flex gap-3 mt-3 text-xl">
              <a
                className="flex justify-center items-center p-3 bg-gray-700 hover:bg-ws-primary duration-300"
                href="https://www.linkedin.com/in/wahednur"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaLinkedinIn />
              </a>
              <a
                className="flex justify-center items-center p-3 bg-gray-700 hover:bg-ws-primary duration-300"
                href="https://x.com/wahednur"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaXTwitter />
              </a>
              <a
                className="flex justify-center items-center p-3 bg-gray-700 hover:bg-ws-primary duration-300"
                href="https://www.facebook.com/wahednur"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaFacebookF />
              </a>
            </div>
          </div>
        </div>
      </div>
      {/* Bottom Section */}
      <div className="text-center text-sm text-gray-400 py-4 border-t border-gray-700 w-full bg-gray-700">
        © 2012 - {new Date().getFullYear()} Wahed Nur. All rights reserved.
      </div>
    </footer>
  );
}
