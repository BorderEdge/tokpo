"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js"

export default function TokepoGame() {
  const { publicKey, signTransaction } = useWallet()
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<string[]>([])

  const connection = new Connection("https://api.devnet.solana.com")

  async function play(choice: number) {
    if (!publicKey || !signTransaction) {
      alert("Conecte sua carteira primeiro!")
      return
    }

    setLoading(true)
    try {
      // Exemplo simples: envia 0.001 SOL para si mesmo (substitua pela lógica do seu programa)
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 1000, // 0.000001 SOL
        })
      )

      const signed = await signTransaction(tx)
      const sig = await connection.sendRawTransaction(signed.serialize())
      await connection.confirmTransaction(sig, "processed")

      // resultado fake só pra exemplo
      const outcome = Math.random() > 0.5 ? "Você venceu!" : "Você perdeu!"
      setResult(outcome)
      setHistory((prev) => [`Jogada: ${choice} → ${outcome}`, ...prev])
    } catch (err) {
      console.error(err)
      setResult("Erro ao jogar")
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-950 via-indigo-900 to-black text-white p-6">
      <h1 className="text-4xl font-bold mb-6">Tokepo Game 🎮</h1>

      {!publicKey ? (
        <p className="text-gray-400">Conecte sua carteira para jogar</p>
      ) : (
        <>
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => play(0)}
              className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              disabled={loading}
            >
              Pedra ✊
            </button>
            <button
              onClick={() => play(1)}
              className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              disabled={loading}
            >
              Papel ✋
            </button>
            <button
              onClick={() => play(2)}
              className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              disabled={loading}
            >
              Tesoura ✌
            </button>
          </div>

          {result && <p className="mb-4 text-lg font-semibold">{result}</p>}

          <div className="w-full max-w-md">
            <h2 className="text-xl mb-2">Histórico</h2>
            <ul className="bg-gray-800 rounded-lg divide-y divide-gray-700">
              {history.map((h, i) => (
                <li key={i} className="p-2 text-sm">
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
