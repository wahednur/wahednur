import React from "react";
import { BsChatRightText, BsEnvelope, BsPerson, BsX } from "react-icons/bs";
import { FaRegPaperPlane } from "react-icons/fa6";

interface ContactFormProps {
  setOpen: (open: boolean) => void;
}
export default function ContactForm({ setOpen }: ContactFormProps) {
  return (
    <div className="p-8 bg-blue-50 rounded-lg shadow-lg relative">
      <button
        className="bg-wahednur text-white w-10 h-10 text-2xl hover:bg-hover cursor-pointer duration-300 rounded-full flex justify-center items-center absolute -top-5 -right-3"
        onClick={() => setOpen(false)}
      >
        <BsX />
      </button>
      <h2 className="sub-title text-wahednur mb-5">
        Let’s Build Something Amazing Together!
      </h2>
      <form>
        <div className="frm-grp-row mb-5">
          <span className="icon">
            <BsPerson />
          </span>
          <input
            type="text"
            name="name"
            className="frm-ctr-clr"
            placeholder="Your Name*"
            required
          />
        </div>
        <div className="frm-grp-row mb-5">
          <span className="icon">
            <BsEnvelope />
          </span>
          <input
            type="email"
            name="email"
            className="frm-ctr-clr"
            placeholder="Your Email*"
            required
          />
        </div>
        <div className="frm-grp-row mb-5">
          <span className="icon">
            <BsEnvelope />
          </span>
          <input
            type="text"
            name="subject"
            className="frm-ctr-clr"
            placeholder="Your Subject*"
            required
          />
        </div>
        <div className="frm-grp-row mb-5 relative">
          <span className="icon min-h-full absolute left-0 top-0">
            <BsChatRightText />
          </span>
          <textarea
            className="w-full ml-10 rounded-r-4xl border border-wahednur text-secondary px-5 py-2 outline-0 "
            name="message"
            rows={6}
            placeholder="Your Message*"
          ></textarea>
        </div>
        <div className="text-center w-full flex justify-center items-center ">
          <button className="btn-submit flex items-center gap-2.5">
            <FaRegPaperPlane /> Send Message
          </button>
        </div>
      </form>
    </div>
  );
}
