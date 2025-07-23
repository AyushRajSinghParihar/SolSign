import { AuthButton } from './components/AuthButton'

function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background text-foreground">
      <div className="container mx-auto flex flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-4xl font-bold">SolSignAI</h1>
        <p className="text-muted-foreground">Your AI-Powered Web3 Document Partner</p>
        <div className="mt-4">
          <AuthButton />
        </div>
      </div>
    </div>
  )
}

export default App
