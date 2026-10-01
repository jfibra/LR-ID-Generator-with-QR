"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

interface LoadingAnimationProps {
  onComplete: () => void
}

export default function LoadingAnimation({ onComplete }: LoadingAnimationProps) {
  const [step, setStep] = useState(0)
  const steps = [
    "Checking your records...",
    "Verifying Agent...",
    "Extracting your information...",
    "Redirect to ID Generator",
  ]

  useEffect(() => {
    let timer: NodeJS.Timeout

    if (step < steps.length - 1) {
      timer = setTimeout(() => {
        setStep(step + 1)
      }, 250)
    } else {
      timer = setTimeout(() => {
        console.log("Loading animation complete, calling onComplete")
        onComplete()
      }, 250)
    }

    return () => clearTimeout(timer)
  }, [step, steps.length, onComplete])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <div className="w-64 mb-10">
        <Image src="/images/leuterio-logo.png" alt="Leuterio Realty Logo" width={400} height={150} priority />
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center">
        <div className="w-14 h-14 mx-auto mb-6">
          <svg
            className="animate-spin w-full h-full text-red-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>

        <h2 className="text-lg font-bold text-[#003b64] mb-6 tracking-tight">{steps[step]}</h2>

        <div className="space-y-3 text-left">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-3.5 h-3.5 rounded-full mr-3.5 transition-colors duration-300 flex-shrink-0 ${
                  i < step ? "bg-blue-600" : i === step ? "bg-red-600" : "bg-slate-200"
                }`}
              ></div>
              <span
                className={`text-sm transition-colors duration-300 ${
                  i < step ? "text-[#003b64] font-medium" : i === step ? "text-red-600 font-semibold" : "text-slate-400"
                }`}
              >
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
