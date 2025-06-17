import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { FaHome, FaTachometerAlt } from "react-icons/fa";
import AdminDashNav from "./admin-nav";
export default function SidebarNav() {
  const { data: session } = useSession();
  return (
    <div className="w-full bg-gray-800 min-h-screen">
      <div className="flex flex-col justify-between h-[calc(100vh-104px)]">
        <div>
          <div>
            <Link
              className="text-white flex items-center gap-3 py-3 px-5 bg-blue-500"
              href={"/"}
            >
              <FaHome /> Back to home
            </Link>
            <p className="bg-ws-primary w-full text-2xl text-white px-5 py-3 flex items-center gap-2">
              <FaTachometerAlt /> Dashboard
            </p>
          </div>
          {session?.user.role === "admin" && <AdminDashNav />}
        </div>
        <div className="px-5">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="btn btn-filled"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
