import Chat from './components/Chat'

function App() {
  return (
    <div className="h-screen w-full relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.15) 0%, transparent 70%)',
            top: '-200px',
            right: '-100px',
            animation: 'float 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
            bottom: '-150px',
            left: '-100px',
            animation: 'float 25s ease-in-out infinite reverse',
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
            top: '40%',
            left: '60%',
            animation: 'pulse-glow 15s ease-in-out infinite',
          }}
        />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34, 211, 238, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 211, 238, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 h-full flex items-center justify-center p-4">
        <Chat />
      </div>
    </div>
  )
}

export default App
