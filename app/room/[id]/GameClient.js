'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTetris } from '../../../hooks/useTetris'
import { useRoom } from '../../../hooks/useRoom'

// ─── Board Renderer ──────────────────────────────────────────────────────────

function TetrisBoard({ board, cellSize, dimmed = false }) {
  const W = 10
  const H = 20
  const width = W * cellSize
  const height = H * cellSize

  return (
    <div
      className="relative shrink-0"
      style={{
        width,
        height,
        background: '#0a0a1a',
        border: '1px solid #1a1a3a',
        boxShadow: dimmed ? 'none' : '0 0 30px rgba(0,255,255,0.08)',
      }}
    >
      {/* Grid lines */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={width}
        height={height}
        style={{ opacity: 0.15 }}
      >
        {Array.from({ length: W - 1 }, (_, i) => (
          <line
            key={`v${i}`}
            x1={(i + 1) * cellSize}
            y1={0}
            x2={(i + 1) * cellSize}
            y2={height}
            stroke="#334155"
            strokeWidth="0.5"
          />
        ))}
        {Array.from({ length: H - 1 }, (_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={(i + 1) * cellSize}
            x2={width}
            y2={(i + 1) * cellSize}
            stroke="#334155"
            strokeWidth="0.5"
          />
        ))}
      </svg>

      {/* Cells */}
      {board.map((row, r) =>
        row.map((cell, c) => {
          if (!cell) return null
          const isGhost = cell.length === 9 // ghost color has 2-char opacity suffix
          const displayColor = isGhost ? cell.slice(0, 7) : cell

          return (
            <div
              key={`${r}-${c}`}
              style={{
                position: 'absolute',
                left: c * cellSize + 1,
                top: r * cellSize + 1,
                width: cellSize - 2,
                height: cellSize - 2,
                background: isGhost
                  ? `${displayColor}33`
                  : displayColor,
                boxShadow: isGhost
                  ? 'none'
                  : `0 0 ${Math.max(4, cellSize * 0.3)}px ${displayColor}88`,
                borderRadius: 1,
                opacity: dimmed ? 0.4 : 1,
              }}
            />
          )
        })
      )}
    </div>
  )
}

// ─── Next Piece Preview ──────────────────────────────────────────────────────

function NextPiece({ piece }) {
  if (!piece) return null
  const size = 20
  const rows = piece.shape.length
  const cols = piece.shape[0].length

  return (
    <div
      style={{
        width: 4 * size + 8,
        height: 4 * size + 8,
        background: '#0a0a1a',
        border: '1px solid #1a1a3a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        padding: 4,
      }}
    >
      <div style={{ position: 'relative', width: cols * size, height: rows * size }}>
        {piece.shape.map((row, r) =>
          row.map((cell, c) => {
            if (!cell) return null
            return (
              <div
                key={`${r}-${c}`}
                style={{
                  position: 'absolute',
                  left: c * size + 1,
                  top: r * size + 1,
                  width: size - 2,
                  height: size - 2,
                  background: piece.color,
                  boxShadow: `0 0 6px ${piece.color}88`,
                  borderRadius: 1,
                }}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Touch Button ────────────────────────────────────────────────────────────

function TouchBtn({ onPress, children, wide = false, color = '#00ffff' }) {
  const handleTouch = useCallback(
    (e) => {
      e.preventDefault()
      onPress()
    },
    [onPress]
  )

  return (
    <button
      onTouchStart={handleTouch}
      onMouseDown={handleTouch}
      className="no-select select-none"
      style={{
        flex: wide ? 2 : 1,
        padding: '12px 8px',
        borderRadius: 10,
        background: `${color}15`,
        border: `1px solid ${color}44`,
        color,
        fontSize: 20,
        fontWeight: 'bold',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'manipulation',
      }}
    >
      {children}
    </button>
  )
}

// ─── Countdown display ───────────────────────────────────────────────────────

function CountdownOverlay({ value }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(7,7,20,0.85)' }}
    >
      <div
        key={value}
        style={{
          fontSize: 120,
          fontWeight: 900,
          background:
            value === 'GO'
              ? 'linear-gradient(135deg, #00ffff, #22c55e)'
              : 'linear-gradient(135deg, #00ffff, #a855f7)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 30px rgba(0,255,255,0.6))',
          animation: 'countPop 0.5s ease-out',
        }}
      >
        {value}
      </div>
      <style>{`
        @keyframes countPop {
          0% { transform: scale(1.8); opacity: 0; }
          60% { transform: scale(0.95); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── Format timer ────────────────────────────────────────────────────────────

function formatTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GameClient({ roomId }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const playerNum = searchParams.get('p') || '2'

  // Phase: 'waiting' | 'countdown' | 'playing' | 'ended'
  const [phase, setPhase] = useState('waiting')
  const [countdownVal, setCountdownVal] = useState(3)
  const [timeLeft, setTimeLeft] = useState(120_000)
  const [opponentBoard, setOpponentBoard] = useState(
    Array.from({ length: 20 }, () => Array(10).fill(null))
  )
  const [opponentScore, setOpponentScore] = useState(0)
  const [winner, setWinner] = useState(null) // 'me' | 'opponent'
  const [myFinalScore, setMyFinalScore] = useState(0)
  const [oppFinalScore, setOppFinalScore] = useState(0)
  const [opponentConnected, setOpponentConnected] = useState(false)
  const [copied, setCopied] = useState(false)

  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])

  const timerRef = useRef(null)
  const boardSendRef = useRef(null)
  const startTimeRef = useRef(null)

  // ── Garbage callback (called from useTetris when we clear lines) ──────────
  const garbageRef = useRef(null)
  const handleGarbage = useCallback((count) => {
    if (garbageRef.current) garbageRef.current(count)
  }, [])

  // ── Tetris engine ─────────────────────────────────────────────────────────
  const {
    displayBoard,
    next,
    score,
    lines,
    gameOver,
    move,
    drop,
    hardDrop,
    rotate,
    addGarbage,
    reset,
  } = useTetris({
    active: phase === 'playing',
    onGarbage: handleGarbage,
  })

  const scoreRef = useRef(score)
  useEffect(() => { scoreRef.current = score }, [score])

  // ── Room hook ─────────────────────────────────────────────────────────────
  const opponentConnectedFiredRef = useRef(false)

  const roomCallbacks = {
    onOpponentConnected: () => {
      setOpponentConnected(true)
      if (playerNum === '1' && !opponentConnectedFiredRef.current) {
        opponentConnectedFiredRef.current = true
        // Wait 500ms then broadcast start
        setTimeout(() => {
          const startAt = Date.now() + 3500
          broadcastStartRef.current?.(startAt)
          beginCountdown(startAt)
        }, 500)
      }
    },
    onOpponentBoard: (board, oppScore) => {
      setOpponentBoard(board)
      setOpponentScore(oppScore)
    },
    onGarbageReceived: (count) => {
      if (phaseRef.current === 'playing') {
        addGarbage(count)
      }
    },
    onGameStart: (startAt) => {
      if (playerNum !== '1') {
        beginCountdown(startAt)
      }
    },
    onOpponentGameOver: (oppScore) => {
      if (phaseRef.current !== 'playing') return
      setOppFinalScore(oppScore)
      setMyFinalScore(scoreRef.current)
      setWinner('me')
      endGame()
    },
  }

  const { sendBoard, sendGarbage, broadcastStart, broadcastGameOver } = useRoom(
    roomId,
    playerNum,
    roomCallbacks
  )

  // Store refs so callbacks can access latest values
  const broadcastStartRef = useRef(broadcastStart)
  const sendGarbageRef = useRef(sendGarbage)
  const broadcastGameOverRef = useRef(broadcastGameOver)
  useEffect(() => { broadcastStartRef.current = broadcastStart }, [broadcastStart])
  useEffect(() => { sendGarbageRef.current = sendGarbage }, [sendGarbage])
  useEffect(() => { broadcastGameOverRef.current = broadcastGameOver }, [broadcastGameOver])

  // Wire garbage callback into sendGarbage
  useEffect(() => {
    garbageRef.current = (count) => {
      const opp = playerNum === '1' ? '2' : '1'
      sendGarbageRef.current?.(count, opp)
    }
  }, [playerNum])

  // ── Countdown logic ───────────────────────────────────────────────────────
  function beginCountdown(startAt) {
    setPhase('countdown')
    const now = Date.now()
    const totalMs = startAt - now // ~3500ms

    const steps = [
      { label: 3, delay: 0 },
      { label: 2, delay: totalMs * 0.28 },
      { label: 1, delay: totalMs * 0.57 },
      { label: 'GO', delay: totalMs * 0.86 },
    ]

    steps.forEach(({ label, delay }) => {
      setTimeout(() => setCountdownVal(label), delay)
    })

    const msUntilStart = startAt - Date.now()
    setTimeout(() => {
      if (phaseRef.current !== 'ended') {
        setPhase('playing')
        startTimeRef.current = Date.now()
        startTimer()
      }
    }, Math.max(0, msUntilStart))
  }

  // ── Game timer ────────────────────────────────────────────────────────────
  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    const endTime = Date.now() + 120_000
    timerRef.current = setInterval(() => {
      const remaining = endTime - Date.now()
      setTimeLeft(remaining)
      if (remaining <= 0) {
        clearInterval(timerRef.current)
        if (phaseRef.current === 'playing') {
          // Timer ended — compare scores
          const myScore = scoreRef.current
          setMyFinalScore(myScore)
          setWinner(myScore >= opponentScore ? 'me' : 'opponent')
          endGame()
        }
      }
    }, 100)
  }

  function endGame() {
    if (timerRef.current) clearInterval(timerRef.current)
    if (boardSendRef.current) clearInterval(boardSendRef.current)
    setPhase('ended')
  }

  // ── Board broadcast ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'playing') {
      boardSendRef.current = setInterval(() => {
        sendBoard(displayBoard, scoreRef.current, lines)
      }, 150)
    } else {
      if (boardSendRef.current) clearInterval(boardSendRef.current)
    }
    return () => {
      if (boardSendRef.current) clearInterval(boardSendRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── Detect game over from engine ──────────────────────────────────────────
  useEffect(() => {
    if (gameOver && phase === 'playing') {
      const myScore = scoreRef.current
      broadcastGameOverRef.current?.(myScore)
      setMyFinalScore(myScore)
      setOppFinalScore(opponentScore)
      setWinner('opponent')
      endGame()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver, phase])

  // ── Keyboard controls ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (phaseRef.current !== 'playing') return
      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); move(-1); break
        case 'ArrowRight': e.preventDefault(); move(1); break
        case 'ArrowUp': e.preventDefault(); rotate(); break
        case 'ArrowDown': e.preventDefault(); drop(); break
        case ' ': e.preventDefault(); hardDrop(); break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [move, rotate, drop, hardDrop])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (boardSendRef.current) clearInterval(boardSendRef.current)
    }
  }, [])

  // ── Play Again ────────────────────────────────────────────────────────────
  function handlePlayAgain() {
    router.push('/')
  }

  // ── Copy room code ────────────────────────────────────────────────────────
  function handleCopy() {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // ── WAITING SCREEN ────────────────────────────────────────────────────────
  if (phase === 'waiting') {
    return (
      <main className="min-h-screen bg-[#070714] flex flex-col items-center justify-center px-4 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm w-full">
          <div className="text-center">
            <h1
              className="text-4xl font-black tracking-widest"
              style={{
                background: 'linear-gradient(135deg, #00ffff, #a855f7)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 15px rgba(0,255,255,0.4))',
              }}
            >
              TETRIS BATTLE
            </h1>
          </div>

          {playerNum === '1' ? (
            <>
              <div
                className="w-full rounded-2xl p-6 flex flex-col items-center gap-4"
                style={{
                  background: '#0d0d2b',
                  border: '1px solid #00ffff33',
                }}
              >
                <p className="text-gray-400 text-sm tracking-widest uppercase">Your Room Code</p>
                <p
                  className="text-5xl font-black tracking-[0.3em] font-mono"
                  style={{
                    color: '#00ffff',
                    textShadow: '0 0 20px rgba(0,255,255,0.7)',
                  }}
                >
                  {roomId}
                </p>
                <button
                  onClick={handleCopy}
                  className="px-6 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: copied ? '#00ffff22' : '#ffffff11',
                    border: copied ? '1px solid #00ffff' : '1px solid #ffffff22',
                    color: copied ? '#00ffff' : '#ffffff88',
                  }}
                >
                  {copied ? 'Copied' : 'Copy Code'}
                </button>
              </div>

              <div className="flex flex-col items-center gap-3">
                {/* Animated dots */}
                <div className="flex gap-2">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: '#00ffff',
                        boxShadow: '0 0 8px #00ffff',
                        animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
                <p className="text-gray-400 text-sm">Waiting for opponent to join...</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#a855f7',
                      boxShadow: '0 0 8px #a855f7',
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
              <p className="text-gray-400 text-sm">Joining room {roomId}...</p>
              {opponentConnected && (
                <p className="text-cyan-400 text-sm">Connected. Game starting soon...</p>
              )}
            </div>
          )}

          <button
            onClick={() => router.push('/')}
            className="text-gray-600 text-sm hover:text-gray-400 transition-colors"
          >
            Back to lobby
          </button>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </main>
    )
  }

  // ── ENDED SCREEN ──────────────────────────────────────────────────────────
  if (phase === 'ended') {
    const iWon = winner === 'me'
    return (
      <main className="min-h-screen bg-[#070714] flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div
          className="absolute top-0 left-0 right-0 h-96 pointer-events-none"
          style={{
            background: iWon
              ? 'radial-gradient(ellipse at top, rgba(0,255,255,0.12) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at top, rgba(168,85,247,0.08) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm w-full text-center">
          <div>
            <p className="text-gray-400 text-sm tracking-widest uppercase mb-2">
              {iWon ? 'Victory' : 'Defeat'}
            </p>
            <h2
              className="text-6xl font-black"
              style={{
                background: iWon
                  ? 'linear-gradient(135deg, #00ffff, #22c55e)'
                  : 'linear-gradient(135deg, #a855f7, #ef4444)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: `drop-shadow(0 0 20px ${iWon ? 'rgba(0,255,255,0.5)' : 'rgba(168,85,247,0.5)'})`,
              }}
            >
              {iWon ? 'YOU WIN' : 'YOU LOSE'}
            </h2>
          </div>

          <div
            className="w-full rounded-2xl p-6 flex justify-around"
            style={{ background: '#0d0d2b', border: '1px solid #1a1a3a' }}
          >
            <div className="flex flex-col items-center gap-1">
              <p className="text-gray-500 text-xs uppercase tracking-widest">Your Score</p>
              <p
                className="text-4xl font-black"
                style={{ color: '#00ffff', textShadow: '0 0 15px rgba(0,255,255,0.5)' }}
              >
                {myFinalScore}
              </p>
            </div>
            <div className="w-px bg-gray-800" />
            <div className="flex flex-col items-center gap-1">
              <p className="text-gray-500 text-xs uppercase tracking-widest">Opponent</p>
              <p className="text-4xl font-black text-gray-400">
                {oppFinalScore}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={handlePlayAgain}
              className="w-full py-4 rounded-xl font-bold text-lg tracking-wider transition-all"
              style={{
                background: 'linear-gradient(135deg, #00ffff22, #a855f722)',
                border: '1px solid #00ffff66',
                color: '#00ffff',
                boxShadow: '0 0 20px rgba(0,255,255,0.15)',
              }}
            >
              Play Again
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── PLAYING / COUNTDOWN ───────────────────────────────────────────────────
  const isPlaying = phase === 'playing'
  const isCountdown = phase === 'countdown'
  const timerWarning = timeLeft < 30_000

  return (
    <main
      className="min-h-screen bg-[#070714] flex flex-col items-center justify-between select-none"
      style={{ touchAction: 'none', overflow: 'hidden', maxHeight: '100dvh' }}
    >
      {/* ── Top bar: timer + scores ── */}
      <div
        className="w-full flex items-center justify-between px-4 py-2 shrink-0"
        style={{
          background: '#0a0a1a',
          borderBottom: '1px solid #1a1a3a',
        }}
      >
        <div className="flex flex-col items-start">
          <span className="text-gray-500 text-xs uppercase tracking-widest">You</span>
          <span
            className="text-xl font-black font-mono"
            style={{ color: '#00ffff', textShadow: '0 0 10px rgba(0,255,255,0.5)' }}
          >
            {score}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-gray-500 text-xs uppercase tracking-widest mb-0.5">Time</span>
          <span
            className="text-2xl font-black font-mono"
            style={{
              color: timerWarning ? '#ef4444' : '#ffffff',
              textShadow: timerWarning ? '0 0 15px rgba(239,68,68,0.6)' : 'none',
              transition: 'color 0.3s',
            }}
          >
            {formatTime(timeLeft)}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-gray-500 text-xs uppercase tracking-widest">Opponent</span>
          <span className="text-xl font-black font-mono text-gray-400">
            {opponentScore}
          </span>
        </div>
      </div>

      {/* ── Boards area ── */}
      <div
        className="flex items-start justify-center gap-3 px-3 py-2 relative"
        style={{ flexGrow: 1, overflow: 'hidden' }}
      >
        {/* My board + next piece */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <TetrisBoard board={displayBoard} cellSize={26} />
            {isCountdown && <CountdownOverlay value={countdownVal} />}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-xs uppercase tracking-widest">Next</span>
            <NextPiece piece={next} />
          </div>
        </div>

        {/* Opponent board */}
        <div className="flex flex-col items-center gap-2 pt-1">
          <TetrisBoard board={opponentBoard} cellSize={14} dimmed={!isPlaying} />
          <span className="text-gray-600 text-xs uppercase tracking-widest">Opponent</span>
        </div>
      </div>

      {/* ── Touch controls ── */}
      <div
        className="w-full flex flex-col gap-2 px-4 pb-4 pt-2 shrink-0"
        style={{
          background: '#0a0a1a',
          borderTop: '1px solid #1a1a3a',
        }}
      >
        {/* Row 1: Rotate + Hard Drop */}
        <div className="flex gap-2">
          <TouchBtn onPress={rotate} color="#a855f7">↺ Rotate</TouchBtn>
          <TouchBtn onPress={hardDrop} color="#00ffff">⬇ Hard Drop</TouchBtn>
        </div>

        {/* Row 2: Left + Soft Drop + Right */}
        <div className="flex gap-2">
          <TouchBtn onPress={() => move(-1)} color="#3b82f6">← Left</TouchBtn>
          <TouchBtn onPress={drop} color="#22c55e">▽ Soft Drop</TouchBtn>
          <TouchBtn onPress={() => move(1)} color="#3b82f6">→ Right</TouchBtn>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </main>
  )
}
