import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-6">
          FaceFind
        </h1>
        <p className="text-2xl text-gray-700 mb-4">
          Find Yourself in Every Event
        </p>
        <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
          The easiest way to find and download your photos from events.
          Simply scan your face and instantly access all your pictures.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">📸</div>
            <h3 className="text-xl font-semibold mb-2">Instant Access</h3>
            <p className="text-gray-600">Scan your face to instantly find all your photos from any event</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2">Private & Secure</h3>
            <p className="text-gray-600">Your face data is encrypted and deleted after the event</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
            <p className="text-gray-600">Download all your photos in seconds, no account needed</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Login
          </Link>
          <Link
            href="#"
            className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold"
          >
            Learn More
          </Link>
        </div>

        <div className="mt-16 text-sm text-gray-500">
          <p>For Event Organizers and Photographers</p>
          <Link href="/login" className="text-blue-600 hover:underline">
            Access Your Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
