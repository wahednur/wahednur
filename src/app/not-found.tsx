import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center vh-height bg-gray-100">
      <h1 className="text-5xl font-bold text-red-600 mb-4">404</h1>
      <h2 className="text-2xl text-gray-700 mb-8">Page Not Found</h2>
      <Link
        href="/"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Go Home
      </Link>
    </div>
  );
}
