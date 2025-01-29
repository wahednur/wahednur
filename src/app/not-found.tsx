import Image from "next/image";
import Link from "next/link";

export default async function NotFound() {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center space-y-6">
      <Image src="/404.svg" width={800} height={800} alt="404" />
      <h2 className="sec-title">
        Not Found: <span className="text-primary">404</span>
      </h2>
      <p className="title text-danger">Could not find requested resource</p>
      <p className="btn-err">
        <Link href="/">Back to home</Link>
      </p>
    </div>
  );
}
