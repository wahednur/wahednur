import ContactForm from "@/components/contact/ContactForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Me - Wahed Nur",
  description:
    "Get in touch with Wahed Nur for your web development projects, consultation, and freelance opportunities.",
  keywords: [
    "Contact",
    "Web Developer",
    "Hire Developer",
    "Next.js Freelancer",
    "Full Stack Developer",
    "Wahed Nur",
  ],
};

export default function ContactPage() {
  return (
    <div className="vh-height bg-gray-50 py-20 px-4">
      <div className="container">
        <div className="flex justify-between gap-10">
          <div className="w-full md:w-1/2">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-800">
                Let’s Work Together
              </h2>
              <p className="text-gray-600">
                I am open to exciting opportunities, collaborations, or any
                freelance projects. Whether you have an idea to build, need help
                improving an existing product, or want a full-stack developer to
                join your team — feel free to reach out.
              </p>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xl font-semibold text-gray-800">Email</h4>
                  <p className="text-blue-600">wahednur@gmail.com</p>
                </div>

                <div>
                  <h4 className="text-xl font-semibold text-gray-800">
                    Location
                  </h4>
                  <p className="text-gray-600">
                    Dhaka, Bangladesh (Working Remotely Worldwide)
                  </p>
                </div>

                <div>
                  <h4 className="text-xl font-semibold text-gray-800">
                    Availability
                  </h4>
                  <p className="text-green-600 font-medium">
                    Currently Open for New Projects
                  </p>
                </div>
              </div>

              <p className="text-gray-500 text-sm">
                You can also connect with me on LinkedIn, GitHub, or directly
                schedule a call to discuss your project in detail.
              </p>
            </div>
          </div>
          <div className="flex-1">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
