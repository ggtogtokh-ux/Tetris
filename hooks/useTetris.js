'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

// ─── Tetrominoes ────────────────────────────────────────────────────────────

const TETROMINOES = {
  I: {
    color: '#00ffff',
    shapes: [
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
      [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
    ],
  },
  O: {
    color: '#ffff00',
    shapes: [
      [[1,1],[1,1]],
      [[1,1],[1,1]],
      [[1,1],[1,1]],
      [[1,1],[1,1]],
    ],
  },
  T: {
    color: '#a855f7',
    shapes: [
      [[0,1,0],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,1],[0,1,0]],
      [[0,1,0],[1,1,0],[0,1,0]],
    ],
  },
  S: {
    color: '#22c55e',
    shapes: [
      [[0,1,1],[1,1,0],[0,0,0]],
      [[0,1,0],[0,1,1],[0,0,1]],
      [[0,0,0],[0,1,1],[1,1,0]],
      [[1,0,0],[1,1,0],[0,1,0]],
    ],
  },
  Z: {
    color: '#ef4444',
    shapes: [
      [[1,1,0],[0,1,1],[0,0,0]],
      [[0,0,1],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,0],[0,1,1]],
      [[0,1,0],[1,1,0],[1,0,0]],
    ],
  },
  L: {
    color: '#f97316',
    shapes: [
      [[0,0,1],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,0],[0,1,1]],
      [[0,0,0],[1,1,1],[1,0,0]],
      [[1,1,0],[0,1,0],[0,1,0]],
    ],
  },
  J: {
    color: '#3b82f6',
    shapes: [
      [[1,0,0],[1,1,1],[0,0,0]],
      [[0,1,1],[0,1,0],[0,1,0]],
      [[0,0,0],[1,1,1],[0,0,1]],
      [[0,1,0],[0,1,0],[1,1,0]],
    ],
  },
}

const TYPES = Object.keys(TETROMINOES)
const BOARD_W = 10
const BOARD_H = 20

// ─── Helpers ────────────────────────────────────────────────────────────────

function emptyBoard() {
  return Array.from({ length: BOARD_H }, () => Array(BOARD_W).fill(null))
}

function randomPiece() {
  const type = TYPES[Math.floor(Math.random() * TYPES.length)]
  const t = TETROMINOES[type]
  return { type, color: t.color, shape: t.shapes[0], rot: 0, x: 3, y: 0 }
}

function collides(board, piece, dx = 0, dy = 0, shape = null) {
  const s = shape || piece.shape
  for (let r = 0; r < s.length; r++) {
    for (let c = 0; c < s[r].length; c++) {
      if (!s[r][c]) continue
      const nx = piece.x + c + dx
      const ny = piece.y + r + dy
      if (nx < 0 || nx >= BOARD_W || ny >= BOARD_H) return true
      if (ny < 0) continue
      if (board[ny][nx]) return true
    }
  }
  return false
}

function placePiece(board, piece) {
  const newBoard = board.map(row => [...row])
  const { shape, color, x, y } = piece
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue
      const ny = y + r
      const nx = x + c
      if (ny >= 0 && ny < BOARD_H && nx >= 0 && nx < BOARD_W) {
        newBoard[ny][nx] = color
      }
    }
  }
  return newBoard
}

function clearLines(board) {
  const kept = board.filter(row => row.some(cell => !cell))
  const cleared = BOARD_H - kept.length
  const newRows = Array.from({ length: cleared }, () => Array(BOARD_W).fill(null))
  return { board: [...newRows, ...kept], cleared }
}

function gravityMs(lines) {
  // Start 700ms, decreases with lines cleared, min 80ms
  return Math.max(80, 700 - Math.floor(lines / 5) * 50)
}

function getGhostY(board, piece) {
  let ghostY = piece.y
  while (!collides(board, piece, 0, ghostY - piece.y + 1)) {
    ghostY++
  }
  return ghostY
}

function wallKickRotate(board, piece, dir) {
  const t = TETROMINOES[piece.type]
  const newRot = ((piece.rot + dir) + 4) % 4
  const newShape = t.shapes[newRot]
  const offsets = [0, 1, -1, 2, -2]
  for (const dx of offsets) {
    if (!collides(board, piece, dx, 0, newShape)) {
      return { ...piece, shape: newShape, rot: newRot, x: piece.x + dx }
    }
  }
  return null
}

function scoreForLines(count) {
  return [0, 100, 300, 500, 800][count] || 0
}

function garbageForLines(count) {
  // 0 for 1 line, count-1 for 2-3 lines, 4 for tetris
  if (count < 2) return 0
  if (count === 4) return 4
  return count - 1
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useTetris({ active, onGarbage }) {
  // All mutable game state lives in a ref so the game loop never gets stale
  const stateRef = useRef({
    board: emptyBoard(),
    piece: null,
    next: randomPiece(),
    held: null,
    score: 0,
    lines: 0,
    gameOver: false,
  })

  // Refs for callbacks
  const activeRef = useRef(active)
  const onGarbageRef = useRef(onGarbage)
  useEffect(() => { activeRef.current = active }, [active])
  useEffect(() => { onGarbageRef.current = onGarbage }, [onGarbage])

  // Render trigger — increment to force re-render
  const [tick, setTick] = useState(0)
  const renderRef = useRef(setTick)
  renderRef.current = setTick

  const gravityRef = useRef(null)

  // ── Spawn piece ──────────────────────────────────────────────────────────
  const spawnPiece = useCallback(() => {
    const st = stateRef.current
    const piece = { ...st.next }
    // Center spawn
    piece.x = Math.floor((BOARD_W - piece.shape[0].length) / 2)
    piece.y = 0

    if (collides(st.board, piece)) {
      st.gameOver = true
      st.piece = null
      renderRef.current(n => n + 1)
      return false
    }
    st.piece = piece
    st.next = randomPiece()
    renderRef.current(n => n + 1)
    return true
  }, [])

  // ── Lock piece ───────────────────────────────────────────────────────────
  const lockPiece = useCallback(() => {
    const st = stateRef.current
    if (!st.piece) return

    st.board = placePiece(st.board, st.piece)
    st.piece = null

    const { board: newBoard, cleared } = clearLines(st.board)
    st.board = newBoard

    if (cleared > 0) {
      st.score += scoreForLines(cleared)
      st.lines += cleared
      const garbage = garbageForLines(cleared)
      if (garbage > 0 && onGarbageRef.current) {
        onGarbageRef.current(garbage)
      }
    }

    spawnPiece()
  }, [spawnPiece])

  // ── Gravity tick ─────────────────────────────────────────────────────────
  const gravityTick = useCallback(() => {
    const st = stateRef.current
    if (!activeRef.current || st.gameOver || !st.piece) return

    if (!collides(st.board, st.piece, 0, 1)) {
      st.piece = { ...st.piece, y: st.piece.y + 1 }
      renderRef.current(n => n + 1)
    } else {
      lockPiece()
    }
  }, [lockPiece])

  // ── Schedule gravity ─────────────────────────────────────────────────────
  const scheduleGravity = useCallback(() => {
    if (gravityRef.current) clearTimeout(gravityRef.current)
    if (!activeRef.current || stateRef.current.gameOver) return
    const delay = gravityMs(stateRef.current.lines)
    gravityRef.current = setTimeout(() => {
      gravityTick()
      scheduleGravity()
    }, delay)
  }, [gravityTick])

  // ── Start / stop gravity when active changes ─────────────────────────────
  useEffect(() => {
    if (active && !stateRef.current.gameOver) {
      if (!stateRef.current.piece) {
        spawnPiece()
      }
      scheduleGravity()
    } else {
      if (gravityRef.current) clearTimeout(gravityRef.current)
    }
    return () => {
      if (gravityRef.current) clearTimeout(gravityRef.current)
    }
  }, [active, scheduleGravity, spawnPiece])

  // ── Public controls ──────────────────────────────────────────────────────

  const move = useCallback((dx) => {
    const st = stateRef.current
    if (!activeRef.current || st.gameOver || !st.piece) return
    if (!collides(st.board, st.piece, dx, 0)) {
      st.piece = { ...st.piece, x: st.piece.x + dx }
      renderRef.current(n => n + 1)
    }
  }, [])

  const drop = useCallback(() => {
    const st = stateRef.current
    if (!activeRef.current || st.gameOver || !st.piece) return
    if (!collides(st.board, st.piece, 0, 1)) {
      st.piece = { ...st.piece, y: st.piece.y + 1 }
      st.score += 1
      renderRef.current(n => n + 1)
      // Reset gravity timer on soft drop
      scheduleGravity()
    } else {
      lockPiece()
      scheduleGravity()
    }
  }, [lockPiece, scheduleGravity])

  const hardDrop = useCallback(() => {
    const st = stateRef.current
    if (!activeRef.current || st.gameOver || !st.piece) return
    const ghostY = getGhostY(st.board, st.piece)
    const dropped = ghostY - st.piece.y
    st.piece = { ...st.piece, y: ghostY }
    st.score += dropped * 2
    renderRef.current(n => n + 1)
    lockPiece()
    scheduleGravity()
  }, [lockPiece, scheduleGravity])

  const rotate = useCallback(() => {
    const st = stateRef.current
    if (!activeRef.current || st.gameOver || !st.piece) return
    const rotated = wallKickRotate(st.board, st.piece, 1)
    if (rotated) {
      st.piece = rotated
      renderRef.current(n => n + 1)
    }
  }, [])

  const addGarbage = useCallback((count) => {
    const st = stateRef.current
    if (st.gameOver) return
    const gapCol = Math.floor(Math.random() * BOARD_W)
    const garbageRow = Array.from({ length: BOARD_W }, (_, i) =>
      i === gapCol ? null : '#555566'
    )
    const garbageLines = Array.from({ length: count }, () => [...garbageRow])
    // Shift board up by count, drop garbage at bottom
    const newBoard = [...st.board.slice(count), ...garbageLines]
    st.board = newBoard
    renderRef.current(n => n + 1)
  }, [])

  const holdPiece = useCallback(() => {
    const st = stateRef.current
    if (!activeRef.current || st.gameOver || !st.piece) return
    const t = TETROMINOES[st.piece.type]
    const freshPiece = { type: st.piece.type, color: t.color, shape: t.shapes[0], rot: 0, x: 3, y: 0 }
    if (st.held) {
      const swapIn = { ...st.held, x: Math.floor((BOARD_W - st.held.shape[0].length) / 2), y: 0 }
      if (!collides(st.board, swapIn)) {
        st.piece = swapIn
        st.held = freshPiece
        renderRef.current(n => n + 1)
      }
    } else {
      st.held = freshPiece
      st.piece = null
      spawnPiece()
    }
  }, [spawnPiece])

  const reset = useCallback(() => {
    if (gravityRef.current) clearTimeout(gravityRef.current)
    stateRef.current = {
      board: emptyBoard(),
      piece: null,
      next: randomPiece(),
      held: null,
      score: 0,
      lines: 0,
      gameOver: false,
    }
    renderRef.current(n => n + 1)
  }, [])

  // ── Build display board (board + ghost + active piece) ───────────────────
  const st = stateRef.current
  let displayBoard = st.board.map(row => [...row])

  if (st.piece) {
    // Ghost
    const ghostY = getGhostY(st.board, st.piece)
    const ghostColor = st.piece.color + '4d' // 30% opacity suffix, makes 9 chars
    const { shape, x } = st.piece
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue
        const ny = ghostY + r
        const nx = x + c
        if (ny >= 0 && ny < BOARD_H && nx >= 0 && nx < BOARD_W) {
          if (!displayBoard[ny][nx]) {
            displayBoard[ny][nx] = ghostColor
          }
        }
      }
    }

    // Active piece (on top of ghost)
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue
        const ny = st.piece.y + r
        const nx = x + c
        if (ny >= 0 && ny < BOARD_H && nx >= 0 && nx < BOARD_W) {
          displayBoard[ny][nx] = st.piece.color
        }
      }
    }
  }

  return {
    displayBoard,
    next: st.next,
    held: st.held,
    score: st.score,
    lines: st.lines,
    gameOver: st.gameOver,
    move,
    drop,
    hardDrop,
    rotate,
    holdPiece,
    addGarbage,
    reset,
  }
}
