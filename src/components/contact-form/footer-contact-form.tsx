import React from "react";

export default function ContactFormFooter() {
  return (
    <div className="w-full">
      <form>
        <div className="flex flex-col gap-6">
          <input
            type="text"
            name="name"
            className="frm-ctr"
            placeholder="Name*"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email*"
            required
            className="frm-ctr"
          />
          <input
            type="text"
            name="subject"
            className="frm-ctr"
            required
            placeholder="Subject*"
          />
          <textarea className="frm-ctr" name="message"></textarea>
          <div className="w-full text-center">
            <button className="btn" type="submit">
              Send Message
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
