"use client";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HiOutlineShoppingBag } from "react-icons/hi2";
export default function UserNav() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const p = usePathname();

  // setOpen(false) ousite click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  return (
    <div className="flex items-center gap-3 relative ">
      <button className="text-xl">
        <HiOutlineShoppingBag />
      </button>

      {session?.user ? (
        <button
          ref={buttonRef}
          onClick={() => setOpen(!open)}
          className="user-btn"
        >
          {session?.user?.image ? (
            <Image
              width={40}
              height={40}
              src={session?.user?.image}
              alt={session.user.name}
            />
          ) : (
            <button className="user-btn">
              {session.user.name.slice(0, 1)}
            </button>
          )}
        </button>
      ) : (
        <Link href="/login" className="link">
          Login
        </Link>
      )}

      <div
        ref={menuRef}
        className={`user-d-nav duration-500 ${
          open ? "right-0" : "-right-[1000px]"
        }`}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 w-full">
            {session?.user.image ? (
              <Image
                src={session?.user.image}
                width={48}
                height={48}
                alt={session?.user.name}
              />
            ) : (
              <h1 className="w-12 h-12 rounded-full flex justify-center items-center text-2xl font-bold text-white bg-ws-primary">
                {session?.user.name.slice(0, 1)}
              </h1>
            )}
            <div className="flex flex-col">
              <p>{session?.user.name}</p>
              <small>{session?.user.email}</small>
              <div>
                {" "}
                <small className="bg-ws-primary px-2 py-1.5 text-white rounded capitalize">
                  {session?.user.role}
                </small>
              </div>
            </div>
          </div>
          <hr className="text-gray-400 w-full my-3" />
          <div className="dash-user-nav flex flex-col gap-3">
            <Link
              className={`${p === "/dashboard" ? "active" : ""}`}
              href={"/dashboard"}
            >
              Dashboard
            </Link>
            <Link
              className={`${p === "/dashboard/profile" ? "active" : ""}`}
              href={"/dashboard/profile"}
            >
              Profile
            </Link>
            <Link
              className={`${p === "/dashboard/orders" ? "active" : ""}`}
              href={"/dashboard/orders"}
            >
              My Orders
            </Link>
            <Link
              className={`${p === "/dashboard/notifications" ? "active" : ""}`}
              href={"/dashboard/notifications"}
            >
              Notifications
            </Link>
          </div>
          <hr className="text-gray-400 w-full my-3" />
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="btn btn-filled"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
