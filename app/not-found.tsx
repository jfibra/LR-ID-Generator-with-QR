import Image from "next/image"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <div className="w-64 mb-8">
        <Image src="/images/leuterio-logo.png" alt="Leuterio Realty Logo" width={400} height={150} priority />
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="w-8 h-8 text-red-600"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[#003b64] mb-2">Access Denied</h1>
        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
          You need to login to your Leuterio Realty account and click on the{" "}
          <strong className="text-slate-800">&quot;Generate LR ID&quot;</strong> button on your dashboard to access this
          page.
        </p>

        <a
          href="https://leuteriorealty.com/login"
          className="inline-flex items-center justify-center w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-red-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          target="_blank"
          rel="noopener noreferrer"
        >
          Login to LR Account
        </a>
      </div>
    </div>
  )
}
