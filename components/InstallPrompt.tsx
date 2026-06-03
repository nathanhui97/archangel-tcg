'use client'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsIOS(ios)
    setIsInstalled(standalone)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (isInstalled || dismissed || (!deferredPrompt && !isIOS)) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-gray-800 border border-gray-700 rounded-2xl p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-semibold text-white text-sm">Install ArchangelTCG</p>
          {isIOS ? (
            <p className="text-gray-400 text-xs mt-1">
              Tap <strong className="text-gray-300">Share</strong> then{' '}
              <strong className="text-gray-300">"Add to Home Screen"</strong> to install.
              Push notifications require the installed app.
            </p>
          ) : (
            <p className="text-gray-400 text-xs mt-1">
              Add to your home screen for the best experience.
            </p>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-500 hover:text-gray-300 text-lg leading-none mt-0.5"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {!isIOS && deferredPrompt && (
        <button
          onClick={async () => {
            if (!deferredPrompt) return
            await deferredPrompt.prompt()
            setDeferredPrompt(null)
          }}
          className="mt-3 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          Add to Home Screen
        </button>
      )}
    </div>
  )
}
