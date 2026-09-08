let _ctx = null

function ctx() {
  if (_ctx) return _ctx
  try { _ctx = new (window.AudioContext || window.webkitAudioContext)() } catch (_) {}
  return _ctx
}

function tone(freq, dur, type = 'sine', vol = 0.35) {
  const c = ctx()
  if (!c) return
  try {
    if (c.state === 'suspended') c.resume()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, c.currentTime)
    gain.gain.setValueAtTime(vol, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur)
    osc.start(c.currentTime)
    osc.stop(c.currentTime + dur)
  } catch (_) {}
}

export function sndMove()     { tone(220, 0.04, 'sine', 0.22) }
export function sndRotate()   { tone(380, 0.08, 'sine', 0.28) }
export function sndLock()     { tone(110, 0.14, 'sine', 0.45) }
export function sndHardDrop() {
  tone(300, 0.03, 'sine', 0.45)
  setTimeout(() => tone(140, 0.12, 'sine', 0.55), 35)
}
export function sndLineClear(n) {
  const notes = [523, 659, 784, 1047]
  for (let i = 0; i < Math.min(n, 4); i++) {
    setTimeout(() => tone(notes[i], 0.18, 'sine', 0.6), i * 70)
  }
}
export function sndGameOver() {
  [440, 349, 261, 196].forEach((f, i) =>
    setTimeout(() => tone(f, 0.32, 'sawtooth', 0.3), i * 210)
  )
}
