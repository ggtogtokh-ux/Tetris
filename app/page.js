'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export default function Home() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')
  const [createdCode, setCreatedCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  function handleCreate() {
    const code = generateRoomCode()
    setCreatedCode(code)
    setCopied(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(createdCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleEnterRoom() {
    if (createdCode) {
      router.push(`/room/${createdCode}?p=1`)
    }
  }

  function handleJoin() {
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) {
      setError('Room code must be 6 characters')
      return
    }
    setError('')
    router.push(`/room/${code}?p=2`)
  }

  function handleJoinInput(e) {
    setJoinCode(e.target.value.toUpperCase().slice(0, 6))
    setError('')
  }

  return (
    <main className="h-screen bg-[#070714] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background grid effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500 rounded-full opacity-5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full opacity-5 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-4">
        {/* Title */}
        <div className="text-center">
          <h1
            className="text-5xl font-black tracking-wider mb-1"
            style={{
              background: 'linear-gradient(135deg, #00ffff, #a855f7, #00ffff)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 20px rgba(0,255,255,0.4))',
            }}
          >
            TETRIS
          </h1>
          <h2
            className="text-2xl font-bold tracking-widest"
            style={{
              background: 'linear-gradient(135deg, #a855f7, #00ffff)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 10px rgba(168,85,247,0.5))',
            }}
          >
            BATTLE
          </h2>
          <p className="text-gray-500 mt-1 text-xs tracking-widest uppercase">
            Real-time 2-player challenge
          </p>
        </div>

        {/* Create Room */}
        <div className="w-full bg-[#0d0d2b] border border-cyan-900 rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="text-cyan-400 font-bold text-sm tracking-wide uppercase">Create a Room</h3>

          {!createdCode ? (
            <button
              onClick={handleCreate}
              className="w-full py-3 rounded-xl font-bold text-lg tracking-wider transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #00ffff22, #a855f722)',
                border: '1px solid #00ffff66',
                color: '#00ffff',
                boxShadow: '0 0 20px rgba(0,255,255,0.15)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0,255,255,0.35)'
                e.currentTarget.style.background = 'linear-gradient(135deg, #00ffff33, #a855f733)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0,255,255,0.15)'
                e.currentTarget.style.background = 'linear-gradient(135deg, #00ffff22, #a855f722)'
              }}
            >
              Generate Room Code
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Room code display */}
              <div
                className="rounded-xl p-4 text-center"
                style={{
                  background: '#070714',
                  border: '1px solid #00ffff44',
                  boxShadow: 'inset 0 0 20px rgba(0,255,255,0.05)',
                }}
              >
                <p className="text-gray-400 text-xs tracking-widest uppercase mb-2">Your Room Code</p>
                <p
                  className="text-4xl font-black tracking-[0.3em]"
                  style={{
                    color: '#00ffff',
                    textShadow: '0 0 20px rgba(0,255,255,0.6)',
                    fontFamily: 'monospace',
                  }}
                >
                  {createdCode}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{
                    background: copied ? '#00ffff22' : '#ffffff11',
                    border: copied ? '1px solid #00ffff' : '1px solid #ffffff22',
                    color: copied ? '#00ffff' : '#ffffff88',
                  }}
                >
                  {copied ? 'Copied' : 'Copy Code'}
                </button>
                <button
                  onClick={handleEnterRoom}
                  className="flex-1 py-2 rounded-xl text-sm font-bold transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #00ffff, #a855f7)',
                    color: '#070714',
                    boxShadow: '0 0 20px rgba(0,255,255,0.3)',
                  }}
                >
                  Enter Room
                </button>
              </div>
              <button
                onClick={() => setCreatedCode('')}
                className="text-gray-500 text-xs hover:text-gray-300 transition-colors"
              >
                Generate new code
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-full flex items-center gap-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-700" />
          <span className="text-gray-600 text-xs font-medium">OR</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-700" />
        </div>

        {/* Join Room */}
        <div className="w-full bg-[#0d0d2b] border border-purple-900 rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="text-purple-400 font-bold text-sm tracking-wide uppercase">Join a Room</h3>

          <input
            type="text"
            value={joinCode}
            onChange={handleJoinInput}
            placeholder="Enter 6-char code"
            maxLength={6}
            className="w-full py-2 px-4 rounded-xl text-center text-lg font-bold tracking-[0.3em] outline-none transition-all duration-200"
            style={{
              background: '#070714',
              border: error ? '1px solid #ff4444' : '1px solid #a855f744',
              color: '#ffffff',
              caretColor: '#a855f7',
              fontFamily: 'monospace',
            }}
            onFocus={e => {
              if (!error) e.currentTarget.style.border = '1px solid #a855f7'
              e.currentTarget.style.boxShadow = '0 0 15px rgba(168,85,247,0.2)'
            }}
            onBlur={e => {
              if (!error) e.currentTarget.style.border = '1px solid #a855f744'
              e.currentTarget.style.boxShadow = 'none'
            }}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={handleJoin}
            disabled={joinCode.length !== 6}
            className="w-full py-2 rounded-xl font-bold text-base tracking-wider transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background:
                joinCode.length === 6
                  ? 'linear-gradient(135deg, #a855f722, #00ffff22)'
                  : '#ffffff0a',
              border: joinCode.length === 6 ? '1px solid #a855f766' : '1px solid #ffffff11',
              color: joinCode.length === 6 ? '#a855f7' : '#ffffff44',
              boxShadow: joinCode.length === 6 ? '0 0 20px rgba(168,85,247,0.15)' : 'none',
            }}
          >
            Join Battle
          </button>
        </div>

        {/* Solo mode */}
        <div className="w-full flex flex-col items-center gap-3">
          <div className="w-full flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-700" />
            <span className="text-gray-500 text-xs font-bold tracking-widest uppercase">Or Play Alone</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-700" />
          </div>
          <button
            onClick={() => router.push('/solo')}
            className="w-full py-3 rounded-xl font-black text-lg tracking-widest transition-all duration-200 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #4ade8022, #00ffff22)',
              border: '1px solid #4ade8066',
              color: '#4ade80',
              boxShadow: '0 0 22px rgba(74,222,128,0.18)',
              letterSpacing: '0.18em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #4ade8033, #00ffff33)'
              e.currentTarget.style.boxShadow = '0 0 35px rgba(74,222,128,0.35)'
              e.currentTarget.style.borderColor = '#4ade80aa'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #4ade8022, #00ffff22)'
              e.currentTarget.style.boxShadow = '0 0 22px rgba(74,222,128,0.18)'
              e.currentTarget.style.borderColor = '#4ade8066'
            }}
          >
            Solo Mode
          </button>
        </div>

      </div>
    </main>
  )
}
