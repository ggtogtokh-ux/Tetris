'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTetris } from '../../hooks/useTetris'
import { sndMove, sndRotate, sndLock, sndHardDrop, sndLineClear, sndGameOver } from '../../utils/sounds'

const CELL = 24
const W = 10
const H = 20

function Board({ board }) {
  return (
    <div
      className="relative shrink-0"
      style={{
        width: W * CELL,
        height: H * CELL,
        background: '#060612',
        border: '1px solid #1e1e4a',
        boxShadow: '0 0 30px rgba(0,255,255,0.08), inset 0 0 30px rgba(0,0,0,0.5)',
      }}
    >
      {/* Grid lines */}
      <svg className="absolute inset-0 pointer-events-none" width={W * CELL} height={H * CELL} style={{ opacity: 0.08 }}>
        {Array.from({ length: W - 1 }, (_, i) => (
          <line key={`v${i}`} x1={(i+1)*CELL} y1={0} x2={(i+1)*CELL} y2={H*CELL} stroke="#4488ff" strokeWidth="0.5" />
        ))}
        {Array.from({ length: H - 1 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={(i+1)*CELL} x2={W*CELL} y2={(i+1)*CELL} stroke="#4488ff" strokeWidth="0.5" />
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
                background: isGhost ? 'transparent' : color,
                border: isGhost ? `1px solid ${color}66` : 'none',
                boxShadow: isGhost ? 'none' : `0 0 7px ${color}88, inset 0 1px 0 rgba(255,255,255,0.25)`,
                borderRadius: 2,
              }}
            />
          )
        })
      )}
    </div>
  )
}

function MiniPiece({ piece, size = 16 }) {
  if (!piece) return <div style={{ width: 4 * size, height: 3 * size }} />
  const { shape, color } = piece
  const rows = shape.length
  const cols = shape[0].length
  return (
    <div style={{ width: 4 * size, height: 3 * size, position: 'relative' }}>
      {shape.map((row, r) =>
        row.map((cell, c) => {
          if (!cell) return null
          const offX = Math.floor((4 - cols) / 2)
          const offY = Math.floor((3 - rows) / 2)
          return (
            <div
              key={`${r}-${c}`}
              style={{
                position: 'absolute',
                left: (offX + c) * size + 1,
                top: (offY + r) * size + 1,
                width: size - 2,
                height: size - 2,
                background: color,
                boxShadow: `0 0 5px ${color}99`,
                borderRadius: 2,
              }}
            />
          )
        })
      )}
    </div>
  )
}

function SidePanel({ held, next, score, lines, level }) {
  const box = {
    background: '#0a0a20',
    border: '1px solid #1e1e4a',
    borderRadius: 10,
    padding: '8px 10px',
  }
  return (
    <div className="flex flex-col gap-2" style={{ width: 80 }}>
      {/* Hold */}
      <div style={box}>
        <p style={{ color: '#64748b', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Hold</p>
        <MiniPiece piece={held} size={15} />
      </div>

      {/* Next */}
      <div style={box}>
        <p style={{ color: '#64748b', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Next</p>
        <MiniPiece piece={next} size={15} />
      </div>

      {/* Score */}
      <div style={box}>
        <p style={{ color: '#64748b', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Score</p>
        <p style={{ color: '#fff', fontWeight: 900, fontSize: 15, textShadow: '0 0 8px rgba(168,85,247,0.7)' }}>{score}</p>
      </div>

      {/* Lines */}
      <div style={box}>
        <p style={{ color: '#64748b', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Lines</p>
        <p style={{ color: '#00ffff', fontWeight: 900, fontSize: 15 }}>{lines}</p>
      </div>

      {/* Level */}
      <div style={box}>
        <p style={{ color: '#64748b', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Level</p>
        <p style={{ color: '#4ade80', fontWeight: 900, fontSize: 15 }}>{level}</p>
      </div>
    </div>
  )
}

const btnBase = {
  background: '#0a0a20',
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  cursor: 'pointer',
  transition: 'transform 0.08s',
  active: { transform: 'scale(0.92)' },
}

function TouchBtn({ onPress, color = '#fff', border = '#ffffff22', children, wide = false }) {
  return (
    <div
      onPointerDown={(e) => { e.preventDefault(); onPress() }}
      style={{
        ...btnBase,
        width: wide ? 90 : 72,
        height: 48,
        border: `1px solid ${border}`,
        color,
        fontSize: 20,
        fontWeight: 700,
      }}
    >
      {children}
    </div>
  )
}

export default function SoloPage() {
  const router = useRouter()
  const [phase, setPhase] = useState('idle')
  const [bestScore, setBestScore] = useState(0)
  const prevLinesRef = useRef(0)

  const { displayBoard, next, held, score, lines, gameOver, move, drop, hardDrop, rotate, holdPiece, reset } = useTetris({
    active: phase === 'playing',
    onGarbage: null,
    onLock: sndLock,
    onLineClear: sndLineClear,
  })

  const start = useCallback(() => {
    reset()
    prevLinesRef.current = 0
    setPhase('playing')
  }, [reset])

  useEffect(() => {
    if (gameOver && phase === 'playing') {
      setPhase('over')
      setBestScore(b => Math.max(b, score))
      sndGameOver()
    }
  }, [gameOver, phase, score])

  useEffect(() => {
    if (phase !== 'playing') return
    const onKey = (e) => {
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); move(-1); sndMove(); break
        case 'ArrowRight': e.preventDefault(); move(1);  sndMove(); break
        case 'ArrowDown':  e.preventDefault(); drop();   break
        case 'ArrowUp':    e.preventDefault(); rotate(); sndRotate(); break
        case ' ':          e.preventDefault(); hardDrop(); sndHardDrop(); break
        case 'Shift': case 'c': case 'C': e.preventDefault(); holdPiece(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, move, drop, rotate, hardDrop, holdPiece])

  const level = Math.floor(lines / 5) + 1

  return (
    <main
      className="min-h-screen flex flex-col items-center select-none"
      style={{ background: '#070714', paddingTop: 8, paddingBottom: 8 }}
    >
      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,255,0.025) 1px,transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      {/* Header */}
      <div className="relative z-10 w-full flex items-center justify-between px-4 mb-3" style={{ maxWidth: 400 }}>
        <button
          onClick={() => router.push('/')}
          style={{ color: '#475569', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← Back
        </button>
        <h1 style={{
          fontSize: 15, fontWeight: 900, letterSpacing: '0.2em',
          background: 'linear-gradient(135deg,#00ffff,#a855f7)',
          backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          SOLO MODE
        </h1>
        <div style={{ color: '#475569', fontSize: 12 }}>Best: {bestScore}</div>
      </div>

      {/* Game area */}
      <div className="relative z-10 flex gap-3 items-start justify-center px-2">
        <Board board={displayBoard} />
        <SidePanel held={held} next={next} score={score} lines={lines} level={level} />
      </div>

      {/* Touch controls */}
      {phase === 'playing' && (
        <div className="relative z-10 mt-3 flex flex-col gap-2 items-center">
          <div className="flex gap-2">
            <TouchBtn onPress={() => { holdPiece() }} color="#facc15" border="#eab30855">
              <span style={{ fontSize: 11, fontWeight: 700 }}>HOLD</span>
            </TouchBtn>
            <TouchBtn onPress={() => { rotate(); sndRotate() }} color="#a855f7" border="#a855f755">↺</TouchBtn>
            <TouchBtn onPress={() => { hardDrop(); sndHardDrop() }} color="#00ffff" border="#00ffff55">⤓</TouchBtn>
          </div>
          <div className="flex gap-2">
            <TouchBtn onPress={() => { move(-1); sndMove() }}>←</TouchBtn>
            <TouchBtn onPress={() => drop()}>↓</TouchBtn>
            <TouchBtn onPress={() => { move(1); sndMove() }}>→</TouchBtn>
          </div>
        </div>
      )}

      {/* Idle overlay */}
      {phase === 'idle' && (
        <div className="fixed inset-0 z-20 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="flex flex-col items-center gap-5 p-8 text-center" style={{
            background: '#0d0d2b', border: '1px solid #1e3a5f', borderRadius: 20,
          }}>
            <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 900, letterSpacing: '0.1em' }}>SOLO TETRIS</h2>
            <p style={{ color: '#64748b', fontSize: 13 }}>Survive as long as possible</p>
            <div style={{ color: '#475569', fontSize: 12, lineHeight: 1.8 }}>
              <p>Arrow keys / touch buttons</p>
              <p>Space = hard drop · Shift = hold</p>
            </div>
            <button
              onClick={start}
              style={{
                padding: '12px 40px', borderRadius: 14, fontWeight: 700, fontSize: 17,
                background: 'linear-gradient(135deg,#00ffff,#a855f7)',
                color: '#070714', border: 'none', cursor: 'pointer',
                boxShadow: '0 0 25px rgba(0,255,255,0.3)',
              }}
            >
              Start
            </button>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {phase === 'over' && (
        <div className="fixed inset-0 z-20 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.82)' }}>
          <div className="flex flex-col items-center gap-4 p-7" style={{
            background: '#0d0d2b', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 20, minWidth: 230,
          }}>
            <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 900 }}>Game Over</h2>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Score', score, '#fff'],
                ['Lines', lines, '#00ffff'],
                ['Level', level, '#4ade80'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: '#64748b' }}>{label}</span>
                  <span style={{ color, fontWeight: 700 }}>{val}</span>
                </div>
              ))}
              {score > 0 && score >= bestScore && (
                <p style={{ color: '#facc15', fontSize: 13, fontWeight: 700, textAlign: 'center', marginTop: 4 }}>
                  New best score
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button
                onClick={() => router.push('/')}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 12, fontWeight: 700, fontSize: 13,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#94a3b8', cursor: 'pointer',
                }}
              >
                Home
              </button>
              <button
                onClick={start}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 12, fontWeight: 700, fontSize: 13,
                  background: 'linear-gradient(135deg,#00ffff,#a855f7)',
                  color: '#070714', border: 'none', cursor: 'pointer',
                  boxShadow: '0 0 18px rgba(0,255,255,0.2)',
                }}
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
