import './globals.css'

export const metadata = {
  title: 'Tetris Battle',
  description: 'Real-time 2-player Tetris battle',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#070714] text-white min-h-screen">
        {children}
      </body>
    </html>
  )
}
