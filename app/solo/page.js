'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTetris } from '../../hooks/useTetris'
import { sndMove, sndRotate, sndLock, sndHardDrop, sndLineClear, sndGameOver } from '../../utils/sounds'

const W = 10
const H = 20
const SIDE_W = 88  // side panel width

// ─── Board ───────────────────────────────────────────────────────────────────

function Board({ board, cellSize }) {
  const width = W * cellSize
  const height = H * cellSize
  return (
    <div
      className="relative shrink-0"
      style={{
        width,
        height,
        background: '#060612',
        border: '1px solid #1e1e4a',
        boxShadow: '0 0 30px rgba(0,255,255,0.08), inset 0 0 30px rgba(0,0,0,0.5)',
      }}
    >
      <svg className="absolute inset-0 pointer-events-none" width={width} height={height} style={{ opacity: 0.08 }}>
        {Array.from({ length: W - 1 }, (_, i) => (
          <line key={`v${i}`} x1={(i+1)*cellSize} y1={0} x2={(i+1)*cellSize} y2={height} stroke="#4488ff" strokeWidth="0.5" />
        ))}
        {Array.from({ length: H - 1 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={(i+1)*cellSize} x2={width} y2={(i+1)*cellSize} stroke="#4488ff" strokeWidth="0.5" />
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
                left: c * cellSize + 1,
                top: r * cellSize + 1,
                width: cellSize - 2,
                height: cellSize - 2,
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

// ─── Mini Piece ───────────────────────────────────────────────────────────────

function MiniPiece({ piece, size = 14 }) {
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

// ─── Side Panel ───────────────────────────────────────────────────────────────

function SidePanel({ held, next, score, lines, level, cellSize }) {
  const miniSize = Math.max(10, Math.round(cellSize * 0.44))
  const box = {
    background: '#0a0a20',
    border: '1px solid #1e1e4a',
    borderRadius: 8,
    padding: '6px 8px',
  }
  const lbl = { color: '#64748b', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }
  return (
    <div style={{ width: SIDE_W, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={box}>
        <p style={lbl}>Hold</p>
        <MiniPiece piece={held} size={miniSize} />
      </div>
      <div style={box}>
        <p style={lbl}>Next</p>
        <MiniPiece piece={next} size={miniSize} />
      </div>
      <div style={box}>
        <p style={lbl}>Score</p>
        <p style={{ color: '#fff', fontWeight: 900, fontSize: 14, textShadow: '0 0 8px rgba(168,85,247,0.7)' }}>{score}</p>
      </div>
      <div style={box}>
        <p style={lbl}>Lines</p>
        <p style={{ color: '#00ffff', fontWeight: 900, fontSize: 14 }}>{lines}</p>
      </div>
      <div style={box}>
        <p style={lbl}>Level</p>
        <p style={{ color: '#4ade80', fontWeight: 900, fontSize: 14 }}>{level}</p>
      </div>
    </div>
  )
}

// ─── Touch Button ─────────────────────────────────────────────────────────────

function TouchBtn({ onPress, color = '#fff', border = '#ffffff22', children }) {
  return (
    <div
      onPointerDown={(e) => { e.preventDefault(); onPress() }}
      style={{
        flex: 1, height: 46, borderRadius: 10,
        background: '#0a0a20', border: `1px solid ${border}`, color,
        fontSize: 20, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none',
        touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SoloPage() {
  const router = useRouter()
  const [phase, setPhase] = useState('idle')
  const [bestScore, setBestScore] = useState(0)
  const [cellSize, setCellSize] = useState(24)
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    function calc() {
      const touch = window.matchMedia('(hover: none)').matches
      setIsTouch(touch)
      const ctrlH = touch ? 116 : 0
      const topBar = 46
      const byW = Math.floor((window.innerWidth - 16 - 10 - SIDE_W) / W)
      const byH = Math.floor((window.innerHeight - topBar - ctrlH - 16) / H)
      setCellSize(Math.max(14, Math.min(byW, byH, 42)))
    }
    calc()
    window.addEventListener('resize', calc, { passive: true })
    return () => window.removeEventListener('resize', calc)
  }, [])

  const { displayBoard, next, held, score, lines, gameOver, move, drop, hardDrop, rotate, holdPiece, reset } = useTetris({
    active: phase === 'playing',
    onGarbage: null,
    onLock: sndLock,
    onLineClear: sndLineClear,
  })

  const start = useCallback(() => {
    reset()
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
        case 'ArrowDown':  e.preventDefault(); drop(); sndMove(); break
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
      className="select-none"
      style={{
        height: '100dvh', overflow: 'hidden', touchAction: 'none',
        background: '#070714', display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,255,0.025) 1px,transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between shrink-0"
        style={{ padding: '8px 16px', borderBottom: '1px solid #1a1a3a', background: '#06060f' }}>
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
      <div className="relative z-10 flex-1 flex items-center justify-center overflow-hidden"
        style={{ gap: 10, padding: '0 8px' }}>
        <Board board={displayBoard} cellSize={cellSize} />
        <SidePanel held={held} next={next} score={score} lines={lines} level={level} cellSize={cellSize} />
      </div>

      {/* Touch controls — mobile only */}
      {isTouch && phase === 'playing' && (
        <div className="relative z-10 shrink-0"
          style={{ padding: '6px 10px 8px', borderTop: '1px solid #1a1a3a', background: '#06060f' }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
            <TouchBtn onPress={() => holdPiece()} color="#facc15" border="#eab30855">
              <span style={{ fontSize: 10, fontWeight: 800 }}>HOLD</span>
            </TouchBtn>
            <TouchBtn onPress={() => { rotate(); sndRotate() }} color="#a855f7" border="#a855f755">↺</TouchBtn>
            <TouchBtn onPress={() => { hardDrop(); sndHardDrop() }} color="#00ffff" border="#00ffff55">⤓</TouchBtn>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <TouchBtn onPress={() => { move(-1); sndMove() }}>←</TouchBtn>
            <TouchBtn onPress={() => { drop(); sndMove() }}>↓</TouchBtn>
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
              {isTouch ? (
                <>
                  <p>Touch buttons to play</p>
                  <p>HOLD button or swipe</p>
                </>
              ) : (
                <>
                  <p>Arrow keys to move and rotate</p>
                  <p>Space = hard drop · C / Shift = hold</p>
                </>
              )}
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
