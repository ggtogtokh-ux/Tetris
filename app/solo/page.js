'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTetris } from '../../hooks/useTetris'

const CELL = 28
const W = 10
const H = 20

function Board({ board }) {
  return (
    <div
      className="relative shrink-0"
      style={{
        width: W * CELL,
        height: H * CELL,
        background: '#0a0a1a',
        border: '1px solid #1a1a3a',
        boxShadow: '0 0 40px rgba(0,255,255,0.1)',
      }}
    >
      <svg className="absolute inset-0 pointer-events-none" width={W * CELL} height={H * CELL} style={{ opacity: 0.12 }}>
        {Array.from({ length: W - 1 }, (_, i) => (
          <line key={`v${i}`} x1={(i+1)*CELL} y1={0} x2={(i+1)*CELL} y2={H*CELL} stroke="#334155" strokeWidth="0.5" />
        ))}
        {Array.from({ length: H - 1 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={(i+1)*CELL} x2={W*CELL} y2={(i+1)*CELL} stroke="#334155" strokeWidth="0.5" />
        ))}
      </svg>
      {board.map((row, r) =>
        row.map((cell, c) => {
          if (!cell) return null
          const isGhost = cell.length === 9
          const color = isGhost ? cell.slice(0, 7) : cell
          return (
            <div
              key={`${r}-${c}`}
              style={{
                position: 'absolute',
                left: c * CELL + 1,
                top: r * CELL + 1,
                width: CELL - 2,
                height: CELL - 2,
                background: isGhost ? `${color}33` : color,
                boxShadow: isGhost ? 'none' : `0 0 8px ${color}99`,
                borderRadius: 2,
              }}
            />
          )
        })
      )}
    </div>
  )
}

function NextPiece({ piece }) {
  if (!piece) return null
  const { shape, color } = piece
  const rows = shape.length
  const cols = shape[0].length
  const cs = 22
  return (
    <div style={{ width: 4 * cs, height: 4 * cs, position: 'relative' }}>
      {shape.map((row, r) =>
        row.map((cell, c) => {
          if (!cell) return null
          const offX = Math.floor((4 - cols) / 2)
          const offY = Math.floor((4 - rows) / 2)
          return (
            <div
              key={`${r}-${c}`}
              style={{
                position: 'absolute',
                left: (offX + c) * cs + 1,
                top: (offY + r) * cs + 1,
                width: cs - 2,
                height: cs - 2,
                background: color,
                boxShadow: `0 0 6px ${color}99`,
                borderRadius: 2,
              }}
            />
          )
        })
      )}
    </div>
  )
}

export default function SoloPage() {
  const router = useRouter()
  const [phase, setPhase] = useState('idle') // idle | playing | over
  const [bestScore, setBestScore] = useState(0)

  const { displayBoard, next, held, score, lines, gameOver, move, drop, hardDrop, rotate, holdPiece, reset } = useTetris({
    active: phase === 'playing',
    onGarbage: null,
  })

  const start = useCallback(() => {
    reset()
    setPhase('playing')
  }, [reset])

  useEffect(() => {
    if (gameOver && phase === 'playing') {
      setPhase('over')
      setBestScore(b => Math.max(b, score))
    }
  }, [gameOver, phase, score])

  useEffect(() => {
    if (phase !== 'playing') return
    const onKey = (e) => {
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); move(-1); break
        case 'ArrowRight': e.preventDefault(); move(1);  break
        case 'ArrowDown':  e.preventDefault(); drop();   break
        case 'ArrowUp':    e.preventDefault(); rotate(); break
        case ' ':          e.preventDefault(); hardDrop(); break
        case 'Shift':      e.preventDefault(); holdPiece(); break
        case 'c': case 'C': holdPiece(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, move, drop, rotate, hardDrop])

  const level = Math.floor(lines / 5) + 1

  return (
    <main className="min-h-screen bg-[#070714] flex flex-col items-center justify-start pt-4 pb-4 px-3 relative overflow-hidden select-none">
      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,255,0.03) 1px,transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Header */}
      <div className="relative z-10 w-full max-w-sm flex items-center justify-between mb-4">
        <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Back
        </button>
        <h1 className="text-lg font-black tracking-widest" style={{
          background: 'linear-gradient(135deg,#00ffff,#a855f7)',
          backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          SOLO MODE
        </h1>
        <div className="text-xs text-gray-600">Best: {bestScore}</div>
      </div>

      <div className="relative z-10 flex gap-4 items-start justify-center w-full">
        {/* Board */}
        <Board board={displayBoard} />

        {/* Side panel */}
        <div className="flex flex-col gap-4 min-w-[90px]">
          {/* Hold */}
          <div className="bg-[#0d0d2b] border border-yellow-900/40 rounded-xl p-3">
            <p className="text-gray-500 text-xs tracking-widest uppercase mb-2">Hold</p>
            {held ? <NextPiece piece={held} /> : <div style={{ width: 4*22, height: 4*22 }} />}
          </div>

          {/* Next */}
          <div className="bg-[#0d0d2b] border border-cyan-900/40 rounded-xl p-3">
            <p className="text-gray-500 text-xs tracking-widest uppercase mb-2">Next</p>
            <NextPiece piece={next} />
          </div>

          {/* Score */}
          <div className="bg-[#0d0d2b] border border-purple-900/40 rounded-xl p-3">
            <p className="text-gray-500 text-xs tracking-widest uppercase mb-1">Score</p>
            <p className="text-white font-black text-lg" style={{ textShadow: '0 0 10px rgba(168,85,247,0.6)' }}>{score}</p>
          </div>

          {/* Lines */}
          <div className="bg-[#0d0d2b] border border-cyan-900/40 rounded-xl p-3">
            <p className="text-gray-500 text-xs tracking-widest uppercase mb-1">Lines</p>
            <p className="text-cyan-400 font-black text-lg">{lines}</p>
          </div>

          {/* Level */}
          <div className="bg-[#0d0d2b] border border-green-900/40 rounded-xl p-3">
            <p className="text-gray-500 text-xs tracking-widest uppercase mb-1">Level</p>
            <p className="text-green-400 font-black text-lg">{level}</p>
          </div>
        </div>
      </div>

      {/* Touch controls */}
      {phase === 'playing' && (
        <div className="relative z-10 mt-4 flex flex-col gap-2 w-full max-w-sm">
          <div className="flex justify-center gap-3">
            <button onPointerDown={() => holdPiece()} className="w-20 h-12 rounded-xl font-bold text-yellow-400 text-sm active:scale-95 transition-transform" style={{ background: '#0d0d2b', border: '1px solid #eab30844' }}>Hold</button>
            <button onPointerDown={() => rotate()} className="w-20 h-12 rounded-xl font-bold text-purple-400 text-lg active:scale-95 transition-transform" style={{ background: '#0d0d2b', border: '1px solid #a855f744' }}>↺</button>
            <button onPointerDown={() => hardDrop()} className="w-20 h-12 rounded-xl font-bold text-cyan-400 text-lg active:scale-95 transition-transform" style={{ background: '#0d0d2b', border: '1px solid #00ffff44' }}>⤓</button>
          </div>
          <div className="flex justify-center gap-3">
            <button onPointerDown={() => move(-1)} className="w-20 h-12 rounded-xl font-bold text-white text-xl active:scale-95 transition-transform" style={{ background: '#0d0d2b', border: '1px solid #ffffff22' }}>←</button>
            <button onPointerDown={() => drop()} className="w-20 h-12 rounded-xl font-bold text-white text-xl active:scale-95 transition-transform" style={{ background: '#0d0d2b', border: '1px solid #ffffff22' }}>↓</button>
            <button onPointerDown={() => move(1)} className="w-20 h-12 rounded-xl font-bold text-white text-xl active:scale-95 transition-transform" style={{ background: '#0d0d2b', border: '1px solid #ffffff22' }}>→</button>
          </div>
        </div>
      )}

      {/* Idle overlay */}
      {phase === 'idle' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
          <div className="text-center flex flex-col items-center gap-5 p-8 bg-[#0d0d2b] border border-cyan-900 rounded-2xl">
            <h2 className="text-3xl font-black text-white tracking-wider">SOLO TETRIS</h2>
            <p className="text-gray-400 text-sm">Survive as long as possible</p>
            <div className="text-gray-500 text-xs space-y-1">
              <p>Arrow keys to move / rotate</p>
              <p>Space = hard drop</p>
            </div>
            <button onClick={start} className="px-10 py-3 rounded-xl font-bold text-lg transition-all active:scale-95" style={{
              background: 'linear-gradient(135deg,#00ffff,#a855f7)',
              color: '#070714',
              boxShadow: '0 0 30px rgba(0,255,255,0.3)',
            }}>
              Start
            </button>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {phase === 'over' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75">
          <div className="text-center flex flex-col items-center gap-5 p-8 bg-[#0d0d2b] border border-red-900/60 rounded-2xl min-w-[240px]">
            <h2 className="text-3xl font-black text-white">Game Over</h2>
            <div className="flex flex-col gap-2 w-full">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Score</span>
                <span className="text-white font-bold">{score}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Lines</span>
                <span className="text-cyan-400 font-bold">{lines}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Level</span>
                <span className="text-green-400 font-bold">{level}</span>
              </div>
              {score >= bestScore && score > 0 && (
                <p className="text-yellow-400 text-sm font-bold mt-1">New best score</p>
              )}
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => router.push('/')} className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-400 transition-all active:scale-95" style={{ background: '#ffffff11', border: '1px solid #ffffff22' }}>
                Home
              </button>
              <button onClick={start} className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95" style={{
                background: 'linear-gradient(135deg,#00ffff,#a855f7)',
                color: '#070714',
                boxShadow: '0 0 20px rgba(0,255,255,0.2)',
              }}>
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
