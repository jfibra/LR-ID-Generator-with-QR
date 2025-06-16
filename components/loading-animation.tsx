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
      }, 1500)
    } else {
      // When we reach the last step, wait a moment and then call onComplete
      timer = setTimeout(() => {
        console.log("Loading animation complete, calling onComplete")
        onComplete()
      }, 1500)
    }

    return () => clearTimeout(timer)
  }, [step, steps.length, onComplete])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-64 mb-12">
        <Image src="/images/leuterio-logo.png" alt="Leuterio Realty Logo" width={400} height={150} priority />
      </div>

      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="w-16 h-16 mx-auto mb-8">
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

        <div className="text-center">
          <p className="text-xl font-medium text-gray-800 mb-6">{steps[step]}</p>
          <div className="space-y-3">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center">
                <div
                  className={`w-3 h-3 rounded-full mr-3 transition-colors duration-300 ${
                    i < step ? "bg-green-500" : i === step ? "bg-red-600" : "bg-gray-300"
                  }`}
                ></div>
                <span
                  className={`text-sm transition-colors duration-300 ${
                    i < step ? "text-green-600" : i === step ? "text-gray-800 font-medium" : "text-gray-400"
                  }`}
                >
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
