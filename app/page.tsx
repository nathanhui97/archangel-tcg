import InstallPrompt from '@/components/InstallPrompt'

export default function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6">
      <div className="text-center space-y-3 mb-12">
        <div className="flex justify-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.svg" alt="ArchangelTCG" className="w-24 h-24" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">ArchangelTCG</h1>
        <p className="text-gray-400 text-lg">Trade cards with local players</p>
        <p className="text-gray-500 text-sm">Gundam Card Game</p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <a
          href="/auth/login"
          className="block w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-center py-3 rounded-xl font-semibold transition-colors"
        >
          Sign In
        </a>
        <a
          href="/auth/signup"
          className="block w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-white text-center py-3 rounded-xl font-semibold transition-colors"
        >
          Create Account
        </a>
      </div>

      <InstallPrompt />
    </main>
  )
}
