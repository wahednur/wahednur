import {
  FaArrowLeft,
  FaArrowRight,
  FaRegBell,
  FaRegEnvelope,
} from "react-icons/fa";
import { IoSearchOutline } from "react-icons/io5";
import UserNav from "../../../components/navbars/UserNavbar";

interface DashTopBarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function DashTopBar({ setOpen, open }: DashTopBarProps) {
  return (
    <div className="flex justify-between gap-6 items-center pl-5 bg-gray-100/60 backdrop-blur-xs border-b py-3 border-b-gray-200">
      <button onClick={() => setOpen(!open)} className="btn btn-filled">
        {open ? <FaArrowRight /> : <FaArrowLeft />}
      </button>{" "}
      <div className="flex items-center flex-1 relative">
        <input
          type="text"
          className="w-full border border-ws-primary/30 px-5 py-2.5 rounded-full outline-ws-primary/70 hover:outline-1 duration-300"
        />
        <button className="absolute right-1 top-[3px] cursor-pointer text-white hover:bg-gray-800 duration-300 flex justify-center items-center bg-ws-primary/70 rounded-full w-10 h-10 border-white ">
          <IoSearchOutline />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center text-xl gap-3">
          <button>
            <FaRegBell />
          </button>
          <button>
            <FaRegEnvelope />
          </button>
        </div>
        <UserNav />
      </div>
    </div>
  );
}
