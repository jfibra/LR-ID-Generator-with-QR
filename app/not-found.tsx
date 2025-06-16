import Image from "next/image"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-64 mb-8">
        <Image src="/images/leuterio-logo.png" alt="Leuterio Realty Logo" width={400} height={150} priority />
      </div>

      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-2">Access Denied</h1>
        <div className="w-16 h-16 mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="w-full h-full text-red-600"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <p className="text-gray-700 mb-6">
          You need to login to your Leuterio Realty account and click on the "Generate LR ID" button on your dashboard
          to access this page.
        </p>
        <a
          href="https://leuteriorealty.com/login"
          className="inline-block px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Login to LR Account
        </a>
      </div>
    </div>
  )
}
