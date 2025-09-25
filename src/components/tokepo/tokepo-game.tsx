// src/components/tokepo/tokepo-game.tsx
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { PROGRAM_ID, CREDIT_WALLET, readPda } from "./solana";

interface HistoryRecord {
  player: number;
  program: number;
  result: number;
}

const PAGE_SIZE = 10;

export default function TokepoGame() {
  const wallet = useWallet();
  const [solBalance, setSolBalance] = useState<number>(0);
  const [credits, setCredits] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [txLog, setTxLog] = useState<string>("");

  const connection = new Connection(
    "https://crimson-withered-aura.solana-devnet.quiknode.pro/d77410756a6a1e3b01afdb3a3d008812c6bba779/",
    "confirmed"
  );

  // Atualiza saldo SOL
  const fetchSolBalance = async () => {
    if (wallet.publicKey) {
      const balance = await connection.getBalance(wallet.publicKey);
      setSolBalance(balance / 1_000_000_000);
    }
  };

  // Atualiza dados do PDA
  const fetchGameData = async () => {
    if (wallet.publicKey) {
      try {
        const data = await readPda(wallet.publicKey);
        setCredits(data.credits);
        setScore(data.score);
        setHistory(data.history.reverse()); // Mais recente primeiro
      } catch (err) {
        console.error("Erro lendo PDA:", err);
      }
    }
  };

  const refreshAllData = async () => {
    setLoading(true);
    await Promise.all([fetchSolBalance(), fetchGameData()]);
    setLoading(false);
  };

  useEffect(() => {
    if (wallet.connected) {
      refreshAllData();
    }
  }, [wallet.connected]);

  const getPda = async (publicKey: PublicKey) => {
    const [pda] = await PublicKey.findProgramAddress(
      [Buffer.from("score"), publicKey.toBuffer()],
    PROGRAM_ID
    );
    return pda;
  };

  const play = async (choice: number) => {
    if (!wallet.publicKey || !wallet.signTransaction) return alert("Conecte a carteira!");

    setLoading(true);
    setTxLog("");

    try {
      const pda = await getPda(wallet.publicKey);

      const keys = [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: pda, isSigner: false, isWritable: true },
        { pubkey: CREDIT_WALLET, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      ];

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys,
        data: Buffer.from([choice]),
      });

      const tx = new Transaction().add(ix);
      tx.feePayer = wallet.publicKey;
      const latestBlockhash = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = latestBlockhash.blockhash;

      const signed = await wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, "confirmed");

      setTxLog(sig);
      await refreshAllData();
    } catch (err: any) {
      console.error(err);
      alert("Erro ao jogar: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const renderResult = (result: number) => {
    if (result === 0) return "Loss";
    if (result === 1) return "Draw";
    if (result === 2) return "Win";
    return "?";
  };

  const totalPages = Math.ceil(history.length / PAGE_SIZE);
  const currentHistory = history.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-cyan-800 text-white p-4">
      <h1 className="text-3xl font-bold mb-4">Jokenpo Solana</h1>

      {wallet.connected ? (
        <div className="w-full max-w-3xl bg-gray-900 bg-opacity-70 p-6 rounded-xl shadow-lg">
          <div className="flex justify-between mb-4">
            <p><strong>SALDO SOL:</strong> {solBalance.toFixed(4)}</p>
            <p><strong>CRÉDITOS:</strong> {credits}</p>
            <p><strong>SCORE:</strong> {score}</p>
          </div>

          <div className="flex justify-center space-x-4 mb-4">
            <button
              onClick={() => play(0)}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
            >Pedra</button>
            <button
              onClick={() => play(1)}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm"
            >Papel</button>
            <button
              onClick={() => play(2)}
              disabled={loading}
              className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-md text-sm"
            >Tesoura</button>
          </div>

          <div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse border border-gray-600 mb-2">
              <thead>
                <tr className="bg-gray-700">
                  <th className="px-2 py-1 border border-gray-600">#</th>
                  <th className="px-2 py-1 border border-gray-600">Player</th>
                  <th className="px-2 py-1 border border-gray-600">Program</th>
                  <th className="px-2 py-1 border border-gray-600">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {currentHistory.map((h, i) => (
                  <tr key={i} className="text-center border border-gray-600">
                    <td className="px-2 py-1">{i + 1 + currentPage * PAGE_SIZE}</td>
                    <td className="px-2 py-1">{h.player === 0 ? "Pedra" : h.player === 1 ? "Papel" : "Tesoura"}</td>
                    <td className="px-2 py-1">{h.program === 0 ? "Pedra" : h.program === 1 ? "Papel" : "Tesoura"}</td>
                    <td className="px-2 py-1">{renderResult(h.result)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex justify-center space-x-2 mb-2">
            <button
              onClick={() => setCurrentPage(Math.max(currentPage - 1, 0))}
              disabled={currentPage === 0}
              className="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-sm"
            >Anterior</button>
            <span className="text-sm self-center">{currentPage + 1} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages - 1))}
              disabled={currentPage === totalPages - 1}
              className="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-sm"
            >Próximo</button>
          </div>

          {/* Log da transação */}
          {txLog && (
            <div className="bg-gray-800 p-2 rounded text-sm break-all">
              <strong>Última transação:</strong> {txLog}
            </div>
          )}
        </div>
      ) : (
        <p className="text-lg text-center">Conecte sua carteira para jogar</p>
      )}
    </div>
  );
}
