'use client'

import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * useRoom — Supabase Realtime room management
 *
 * @param {string} roomId        - 6-char room code
 * @param {string|number} playerNum - '1' or '2'
 * @param {object} callbacks
 *   onOpponentBoard(board, score, lines)
 *   onGarbageReceived(count)
 *   onGameStart(startAt)
 *   onOpponentGameOver(score)
 *   onOpponentConnected()
 */
export function useRoom(roomId, playerNum, callbacks) {
  const channelRef = useRef(null)
  const callbacksRef = useRef(callbacks)
  const boardIntervalRef = useRef(null)
  const playerNumStr = String(playerNum)
  const opponentNum = playerNumStr === '1' ? '2' : '1'

  useEffect(() => { callbacksRef.current = callbacks }, [callbacks])

  useEffect(() => {
    if (!roomId) return

    const channel = supabase.channel(`tetris-room-${roomId}`, {
      config: {
        presence: { key: `player-${playerNumStr}` },
        broadcast: { self: false },
      },
    })

    channelRef.current = channel

    // ── Presence ────────────────────────────────────────────────────────────
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const keys = Object.keys(state)
      const hasOpponent = keys.some(k => k.includes(`player-${opponentNum}`))
      if (hasOpponent && callbacksRef.current?.onOpponentConnected) {
        callbacksRef.current.onOpponentConnected()
      }
    })

    channel.on('presence', { event: 'join' }, ({ key }) => {
      if (key.includes(`player-${opponentNum}`) && callbacksRef.current?.onOpponentConnected) {
        callbacksRef.current.onOpponentConnected()
      }
    })

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      // Could handle disconnect here if needed
    })

    // ── Broadcast: board sync ────────────────────────────────────────────────
    channel.on('broadcast', { event: 'board' }, ({ payload }) => {
      if (String(payload.player) === opponentNum) {
        callbacksRef.current?.onOpponentBoard?.(payload.board, payload.score, payload.lines)
      }
    })

    // ── Broadcast: garbage ───────────────────────────────────────────────────
    channel.on('broadcast', { event: 'garbage' }, ({ payload }) => {
      if (String(payload.target) === playerNumStr) {
        callbacksRef.current?.onGarbageReceived?.(payload.count)
      }
    })

    // ── Broadcast: start ─────────────────────────────────────────────────────
    channel.on('broadcast', { event: 'start' }, ({ payload }) => {
      callbacksRef.current?.onGameStart?.(payload.startAt)
    })

    // ── Broadcast: gameover ──────────────────────────────────────────────────
    channel.on('broadcast', { event: 'gameover' }, ({ payload }) => {
      if (String(payload.player) === opponentNum) {
        callbacksRef.current?.onOpponentGameOver?.(payload.score)
      }
    })

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ player: playerNumStr })
      }
    })

    return () => {
      if (boardIntervalRef.current) clearInterval(boardIntervalRef.current)
      channel.unsubscribe()
    }
  }, [roomId, playerNumStr, opponentNum])

  // ── Public API ─────────────────────────────────────────────────────────────

  const sendBoard = useCallback((board, score, lines) => {
    const ch = channelRef.current
    if (!ch) return
    ch.send({
      type: 'broadcast',
      event: 'board',
      payload: { player: playerNumStr, board, score, lines },
    })
  }, [playerNumStr])

  const sendGarbage = useCallback((count, targetPlayer) => {
    const ch = channelRef.current
    if (!ch) return
    ch.send({
      type: 'broadcast',
      event: 'garbage',
      payload: { target: String(targetPlayer), count },
    })
  }, [])

  const broadcastStart = useCallback((startAt) => {
    const ch = channelRef.current
    if (!ch) return
    ch.send({
      type: 'broadcast',
      event: 'start',
      payload: { startAt },
    })
  }, [])

  const broadcastGameOver = useCallback((score) => {
    const ch = channelRef.current
    if (!ch) return
    ch.send({
      type: 'broadcast',
      event: 'gameover',
      payload: { player: playerNumStr, score },
    })
  }, [playerNumStr])

  return {
    sendBoard,
    sendGarbage,
    broadcastStart,
    broadcastGameOver,
  }
}
