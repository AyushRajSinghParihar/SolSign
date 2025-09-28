// [File Begins] apps/backend/src/lib/solana.ts (Definitive Final Version)
import { AnchorProvider, Program, Wallet, BN } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { readFileSync, existsSync } from "fs";
import type { SolsignProgram } from "../solana/idl/solsign_program";
import IDL from "../solana/idl/solsign_program.json";

const getSolanaConnection = () => {
  const rpcUrl = process.env.SOLANA_RPC_ENDPOINT;
  if (!rpcUrl) throw new Error("Solana: SOLANA_RPC_ENDPOINT is not set.");
  const connection = new Connection(rpcUrl, "confirmed");
  const keypairPath = process.env.PAYER_KEYPAIR_PATH;
  if (!keypairPath) throw new Error("Solana: PAYER_KEYPAIR_PATH is not set.");
  if (!existsSync(keypairPath)) {
    throw new Error(`Solana: Keypair file not found at path: ${keypairPath}`);
  }
  const keypairFileContent = readFileSync(keypairPath, "utf-8");
  if (!keypairFileContent) {
    throw new Error(`Solana: Keypair file is empty at path: ${keypairPath}`);
  }
  const payerBytes = JSON.parse(keypairFileContent);
  const payer = Keypair.fromSecretKey(Buffer.from(payerBytes));
  return { connection, payer };
};

const getProgram = () => {
  const { connection, payer } = getSolanaConnection();
  const provider = new AnchorProvider(connection, new Wallet(payer), {
    commitment: "confirmed",
  });
  // Your correct constructor that infers the Program ID from the IDL
  return new Program<SolsignProgram>(IDL as SolsignProgram, provider);
};

interface MintNftArgs {
  docSha256: number[];
  arweaveTx: string;
  parties: PublicKey[];
  signedAt: number;
}

export async function mintDocNftOnChain({
  docSha256,
  arweaveTx,
  parties,
  signedAt,
}: MintNftArgs): Promise<string> {
  const program = getProgram();
  const docNftAccount = Keypair.generate();
  const payer = (program.provider.wallet as Wallet).payer;

  try {
    const txSignature = await program.methods
      .mintDocNft(docSha256, arweaveTx, parties, new BN(signedAt))
      .accounts({
        // --- THE FIX ---
        // 1. Use camelCase names, which the Anchor runtime expects.
        // 2. Use `as any` to bypass the incorrect, auto-generated TypeScript types.
        docNft: docNftAccount.publicKey,
        authority: payer.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      // 3. Explicitly provide the new account as an additional signer.
      // The `payer` is automatically included by the provider.
      .signers([docNftAccount])
      .rpc();
    // --- END OF FIX ---

    console.log(
      `Solana: Successfully minted DocNFT. Transaction: ${txSignature}`
    );
    return txSignature;
  } catch (error) {
    console.error("Error minting DocNFT on-chain:", error);

    let errorMessage = "An unknown error occurred while minting.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    throw new Error(`Failed to mint DocNFT: ${errorMessage}`);
  }
}
