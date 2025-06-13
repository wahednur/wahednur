"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FaBars } from "react-icons/fa";
import UserNav from "./UserNavbar";

export default function MainNavbar() {
  const [open, setOpen] = useState(false);
  const p = usePathname();
  const navLists = (
    <>
      <li>
        <Link href={"/"} className={`${p === "/" ? "active" : ""}`}>
          Home
        </Link>
      </li>
      <li>
        {" "}
        <Link href={"/about"} className={`${p === "/about" ? "active" : ""}`}>
          About
        </Link>
      </li>
      <li>
        <Link
          href={"/services"}
          className={`${p === "/services" ? "active" : ""}`}
        >
          Services
        </Link>
      </li>
      <li>
        <Link
          href={"/portfolio"}
          className={`${p === "/portfolio" ? "active" : ""}`}
        >
          Portfolio
        </Link>
      </li>
      <li>
        <Link href={"/shop"} className={`${p === "/shop" ? "active" : ""}`}>
          Shop
        </Link>
      </li>
      <li>
        <Link
          href={"/contact"}
          className={`${p === "/contact" ? "active" : ""}`}
        >
          Contact
        </Link>
      </li>
      <li>
        <Link href={"/blog"} className={`${p === "/blog" ? "active" : ""}`}>
          Blog
        </Link>
      </li>
    </>
  );
  return (
    <div>
      <div className="desk-nav border-b border-gray-300 shadow-lg">
        <div className="container">
          <div className="flex items-center justify-between h-12">
            <ul className="flex items-center justify-center">{navLists}</ul>
            <div>
              <UserNav />
            </div>
          </div>
        </div>
      </div>
      <div className="mbl-nav bg-gray-800 text-white py-3">
        <div className="container flex items-center justify-between px-5">
          <button onClick={() => setOpen(!open)}>
            <FaBars />
          </button>
          <div>
            <UserNav />
          </div>
          <ul
            className={`absolute duration-500 top-15 text-white p-5 bg-gray-700 w-[200px] rounded-md ${
              open ? "left-0" : "-left-[250px]"
            }`}
          >
            {navLists}
          </ul>
        </div>
      </div>
    </div>
  );
}
