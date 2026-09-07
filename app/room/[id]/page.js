import { Suspense } from 'react'
import GameClient from './GameClient'

export default function Page({ params }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070714] flex items-center justify-center text-white">
          Loading...
        </div>
      }
    >
      <GameClient roomId={params.id} />
    </Suspense>
  )
}
