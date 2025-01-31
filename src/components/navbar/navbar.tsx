"use client";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BsBell,
  BsBoxes,
  BsCurrencyDollar,
  BsEnvelope,
  BsGear,
  BsHouse,
  BsList,
  BsPersonCircle,
  BsSearch,
  BsSpeedometer,
} from "react-icons/bs";
import Image from "next/image";
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [openMbl, setOpenMbl] = useState(false);

  const menuRef = useRef<null | HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRefMbl = useRef<null | HTMLDivElement>(null);
  const buttonRefMbl = useRef<HTMLButtonElement | null>(null);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
      if (
        menuRefMbl.current &&
        !menuRefMbl.current.contains(target) &&
        buttonRefMbl.current &&
        !buttonRefMbl.current.contains(target)
      ) {
        setOpenMbl(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  return (
    <div>
      <div className=" hidden lg:block border-b shadow-md sticky top-0 left-0 right-0 z-50">
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
              <div className="flex items-center text-xl gap-3">
                <Link className="relative" href="/notification">
                  <BsBell className="inline-block hover:text-primary duration-300" />
                  <span className="absolute -top-1 -right-2 text-[8px] bg-red-500 text-white rounded-full w-4 h-4 flex justify-center items-center">
                    2
                  </span>
                </Link>
                <Link className="relative" href="/message">
                  <BsEnvelope className="inline-block hover:text-primary duration-300" />
                  <span className="absolute -top-1 -right-2 text-[8px] bg-red-500 text-white rounded-full w-4 h-4 flex justify-center items-center">
                    2
                  </span>
                </Link>
              </div>
              <div className="relative">
                <button
                  className="cursor-pointer"
                  ref={buttonRef}
                  onClick={() => setOpen(!open)}
                >
                  <Image
                    src={`/wsadika.png`}
                    width={40}
                    height={40}
                    alt="user"
                  />
                </button>
                <div
                  ref={menuRef}
                  className={`nav-profile duration-500 transition-all ${
                    open ? "right-0 " : "right-[-800px] translate-x-[800px]"
                  }`}
                >
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
                  <div className="flex flex-col profile-nav">
                    <Link href={`/dashboard`}>
                      <BsSpeedometer />
                      Dashboard
                    </Link>
                    <Link href={"/profile"}>
                      <BsPersonCircle /> Profile
                    </Link>
                    <Link href={"/profile"}>
                      <BsBoxes /> Orders
                    </Link>
                    <hr />
                    <Link href={"/settings"}>
                      <BsGear /> Setting
                    </Link>
                    <Link href={"/billing"}>
                      <BsCurrencyDollar /> Billing
                    </Link>
                    <hr />
                    <div className="mt-4 pl-4">
                      <button className="btn inline-block">Logout</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>
      <div className="mbl-nav h-14">
        <nav className="flex items-center justify-between w-full h-full relative">
          <Link href="/" className={`${pathname === "/" ? "active" : ""}`}>
            <BsHouse />
          </Link>
          <button ref={buttonRefMbl} onClick={() => setOpen(!open)}>
            <BsList />
          </button>
          <Link href="">
            <BsSearch />
          </Link>

          <Link href="/notification" className="relative">
            <BsBell />
            <span className="absolute top-2 right-3 text-[8px] bg-red-500 text-white rounded-full w-4 h-4 flex justify-center items-center">
              2
            </span>
          </Link>
          <Link href="/message" className="relative">
            <BsEnvelope />
            <span className="absolute top-2 right-3 text-[8px] bg-red-500 text-white rounded-full w-4 h-4 flex justify-center items-center">
              2
            </span>
          </Link>
          <Link href="/">
            <Image src={`/wsadika.png`} width={40} height={40} alt="user" />
          </Link>
          <div
            ref={menuRefMbl}
            className={`mobile-nav ${open ? "bottom-16" : "translate-y-full"}`}
          >
            <ul>{navList}</ul>
          </div>
        </nav>
      </div>
    </div>
  );
}
