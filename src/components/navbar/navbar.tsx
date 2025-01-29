"use client";
import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";
import { BsSearch } from "react-icons/bs";
import Image from "next/image";
export default function Navbar() {
  const pathname = usePathname();
  const navList = (
    <>
      <li>
        <Link href={"/"} className={`${pathname === "/" ? "active" : ""}`}>
          Home
        </Link>
      </li>
      <li>
        <Link
          href={"/about"}
          className={`${pathname === "/about" ? "active" : ""}`}
        >
          About me
        </Link>
      </li>
      <li>
        <Link
          href={"/portfolio"}
          className={`${pathname === "/portfolio" ? "active" : ""}`}
        >
          Portfolio
        </Link>
      </li>
      <li>
        <Link
          href={"/services"}
          className={`${pathname === "/services" ? "active" : ""}`}
        >
          Services
        </Link>
      </li>
      <li>
        <Link
          href={"/shop"}
          className={`${pathname === "/shop" ? "active" : ""}`}
        >
          Shop
        </Link>
      </li>
      <li>
        <Link
          href={"/blog"}
          className={`${pathname === "/blog" ? "active" : ""}`}
        >
          Blog
        </Link>
      </li>
    </>
  );
  return (
    <div className="h-16 border-b shadow-md sticky top-0 left-0 right-0 z-50">
      <div className=" hidden lg:block">
        <div className="container">
          <nav className="flex items-center justify-between h-full">
            <ul className="desk-nav flex items-center h-16">{navList}</ul>
            <div className="desk-nav-right  flex items-center gap-6">
              <button>
                <BsSearch />
              </button>
              <Link className="btn" href={"/login"}>
                Login
              </Link>
              <div className="relative">
                <Image src={`/wsadika.png`} width={40} height={40} alt="user" />
                <div className="absolute top-14 right-0 w-[300px] bg-white border-primary/10 border rounded-lg overflow-hidden pb-6">
                  <div className="bg-primary flex items-center gap-2 text-white py-3 px-4 mb-4">
                    <Image
                      src={`/wsadika.png`}
                      width={40}
                      height={40}
                      alt="user"
                    />
                    <div className="flex flex-col">
                      <p>Abdul Wahed Nur</p>
                      <small>wahednur@gamail.com</small>
                    </div>
                  </div>
                  <div className="px-4">
                    <Link href={`/dashboard`}>Dashboard</Link>
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
