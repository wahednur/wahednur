import Link from "next/link";
import { HiOutlineShoppingBag } from "react-icons/hi2";
export default function UserNav() {
  return (
    <div className="flex items-center gap-3">
      <button className="text-xl">
        <HiOutlineShoppingBag />
      </button>
      <Link href={"/login"} className="link">
        Login
      </Link>
    </div>
  );
}
