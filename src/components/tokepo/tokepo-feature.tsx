import { useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { connection, sendInstruction, readPda } from "./solana"
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"

interface HistoryRecord {
  player: number
  program: number
  result: number
}

export default function TokepoFeature() {
  const wallet = useWallet()
  const [solBalance, setSolBalance] = useState<number>(0)
  const [credits, setCredits] = useState<number>(0)
  const [score, setScore] = useState<number>(0)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Busca saldo em SOL
  const fetchSolBalance = async () => {
    if (wallet.publicKey) {
      const balance = await connection.getBalance(wallet.publicKey)
      setSolBalance(balance / LAMPORTS_PER_SOL)
    }
  }

  // Busca dados do PDA
  const fetchGameData = async () => {
    if (wallet.publicKey) {
      try {
        const data = await readPda(wallet.publicKey)
        setCredits(data.credits)
        setScore(data.score)
        // histórico mais recente primeiro
        setHistory([...data.history].reverse())
      } catch (err) {
        console.error("Erro lendo PDA:", err)
      }
    }
  }

  useEffect(() => {
    if (wallet.connected) {
      fetchSolBalance()
      fetchGameData()
    }
  }, [wallet.connected])

  const handleBuyCredit = async () => {
    try {
      await sendInstruction(wallet, 0xff) // comprar créditos
      await fetchSolBalance()
      await fetchGameData()
      alert("Créditos comprados!")
    } catch (err) {
      console.error(err)
      alert("Erro ao comprar créditos")
    }
  }

  const handlePlay = async (choice: number) => {
    try {
      await sendInstruction(wallet, choice)
      await fetchSolBalance()
      await fetchGameData()
    } catch (err: any) {
      console.error(err)
      if (err.message.includes("Wallet not connected"))
        alert("Conecte a carteira primeiro!")
      else if (err.message.includes("Custom(1)"))
        alert("Sem créditos!")
      else alert("Erro ao jogar")
    }
  }

  const renderResult = (result: number) => {
    if (result === 0) return "❌ Perdeu"
    if (result === 1) return "🤝 Empate"
    if (result === 2) return "🏆 Venceu"
    return "?"
  }

  // Paginação
  const start = (page - 1) * pageSize
  const paginated = history.slice(start, start + pageSize)
  const totalPages = Math.ceil(history.length / pageSize)

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white">
      <div className="max-w-3xl w-full bg-black/40 backdrop-blur-md p-8 rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-[#14F195]">
          🎮 Jokenpo Solana
        </h1>

        {wallet.connected ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-6">
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <p className="text-sm text-gray-400">Saldo (SOL)</p>
                <p className="text-xl font-bold">
                  {solBalance.toFixed(4)} ◎
                </p>
              </div>
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <p className="text-sm text-gray-400">Créditos</p>
                <p className="text-xl font-bold">{credits}</p>
              </div>
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <p className="text-sm text-gray-400">Score</p>
                <p className="text-xl font-bold">{score}</p>
              </div>
            </div>

            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={handleBuyCredit}
                className="px-4 py-2 rounded-lg bg-[#14F195] text-black font-semibold hover:bg-[#10c67c]"
              >
                Comprar Créditos (0.01 SOL)
              </button>
            </div>

            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={() => handlePlay(0)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500"
              >
                Pedra
              </button>
              <button
                onClick={() => handlePlay(1)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500"
              >
                Papel
              </button>
              <button
                onClick={() => handlePlay(2)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500"
              >
                Tesoura
              </button>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Histórico</h3>
              {history.length === 0 ? (
                <p className="text-gray-400">Nenhuma jogada ainda.</p>
              ) : (
                <>
                  <table className="w-full text-sm border border-gray-700 rounded-lg overflow-hidden">
                    <thead className="bg-gray-800/70">
                      <tr>
                        <th className="px-2 py-2">#</th>
                        <th className="px-2 py-2">Jogador</th>
                        <th className="px-2 py-2">Programa</th>
                        <th className="px-2 py-2">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((h, i) => (
                        <tr
                          key={i}
                          className="odd:bg-gray-900/50 even:bg-gray-800/50"
                        >
                          <td className="px-2 py-2 text-center">
                            {start + i + 1}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {h.player === 0
                              ? "🪨 Pedra"
                              : h.player === 1
                              ? "📄 Papel"
                              : "✂️ Tesoura"}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {h.program === 0
                              ? "🪨 Pedra"
                              : h.program === 1
                              ? "📄 Papel"
                              : "✂️ Tesoura"}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {renderResult(h.result)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Paginação */}
                  <div className="flex justify-between items-center mt-4">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="px-3 py-1 rounded bg-gray-700 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <p>
                      Página {page} de {totalPages}
                    </p>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-3 py-1 rounded bg-gray-700 disabled:opacity-50"
                    >
                      Próxima
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <p className="text-center text-gray-400">
            Conecte sua carteira para jogar.
          </p>
        )}
      </div>
    </div>
  )
}
