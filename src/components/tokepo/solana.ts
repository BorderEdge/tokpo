import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  SystemProgram
} from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey("3tSAgQ3iu5WDo1FsEUg6gQTY8QB17z5SjhVAZasmxyLz");
export const CREDIT_WALLET = new PublicKey("DEr8Y8GG19SSXHBDMcFVvxwrcZxFcihsm3CrQZtkrkbH");

export const connection = new Connection("https://api.devnet.solana.com", "confirmed");
export const DATA_SIZE = 8 + 1 + 1 + 200 * 3;

export async function getPda(publicKey: PublicKey) {
    const [pda] = await PublicKey.findProgramAddress(
        [Buffer.from("score"), publicKey.toBuffer()],
        PROGRAM_ID
    );
    return pda;
}

export async function sendInstruction(
    wallet: any,
    instructionData: number
) {
    if (!wallet.publicKey) throw new Error("Wallet not connected");
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
        data: Buffer.from([instructionData]),
    });

    const tx = new Transaction().add(ix);

    // Definir feePayer e recentBlockhash
    tx.feePayer = wallet.publicKey;
    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = latestBlockhash.blockhash;

    // Assinar e enviar
    const signedTx = await wallet.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(sig, "confirmed");
    return sig;
}

export async function readPda(publicKey: PublicKey) {
    const pda = await getPda(publicKey);
    const accountInfo = await connection.getAccountInfo(pda);
    if (!accountInfo) throw new Error("PDA not found");

    const data = accountInfo.data;
    const score = Number(data.readBigUInt64LE(0));
    const history_len = data[8];
    const credits = data[9];

    const history: { player: number; program: number; result: number }[] = [];
    for (let i = 0; i < history_len; i++) {
        const offset = 10 + i * 3;
        history.push({
            player: data[offset],
            program: data[offset + 1],
            result: data[offset + 2],
        });
    }
    return { score, history_len, credits, history };
}