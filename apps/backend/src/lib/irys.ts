import Irys from "@irys/sdk";
import { readFileSync, existsSync } from "fs";

// Helper function to get the Irys client instance
const getIrys = () => {
  const keypairPath = process.env.PAYER_KEYPAIR_PATH;
  if (!keypairPath) {
    throw new Error("PAYER_KEYPAIR_PATH environment variable not set.");
  }

  // Irys expects the raw private key bytes, so we read the keypair file
  console.log(`Irys: Attempting to read keypair from: ${keypairPath}`);
  if (!existsSync(keypairPath)) {
    throw new Error(`Irys: Keypair file not found at path: ${keypairPath}`);
  }
  const keypairFileContent = readFileSync(keypairPath, "utf-8");
  if (!keypairFileContent) {
    throw new Error(`Irys: Keypair file is empty at path: ${keypairPath}`);
  }
  const solanaKeypair = JSON.parse(keypairFileContent);
  const privateKey = Buffer.from(solanaKeypair);

  // Connect to the Irys Devnet node
  const url = "https://devnet.irys.xyz";
  const providerUrl = process.env.SOLANA_RPC_ENDPOINT;
  const token = "solana";

  const irys = new Irys({
    url,
    token,
    key: privateKey,
    config: { providerUrl },
  });

  console.log(`Connected to Irys devnet node at ${url}`);
  return irys;
};

/**
 * Uploads a file buffer to Arweave via the Irys network.
 * @param fileBuffer - The buffer of the file to upload.
 * @returns The Arweave transaction ID.
 */
export async function uploadToArweave(fileBuffer: Buffer): Promise<string> {
  const irys = getIrys();

  try {
    // Get the price for the upload
    const price = await irys.getPrice(fileBuffer.length);
    console.log(
      `Irys: Upload price for ${fileBuffer.length} bytes is ${price.toString()}`
    );

    // Fund the Irys node. This transaction uses SOL from our payer wallet.
    await irys.fund(price);
    console.log("Irys: Successfully funded node.");

    // Upload the data
    const response = await irys.upload(fileBuffer, {
      tags: [{ name: "Content-Type", value: "application/pdf" }],
    });

    console.log(`Irys: File uploaded successfully with tx ID: ${response.id}`);
    return response.id;
  } catch (e) {
    console.error("Error uploading to Irys:", e);

    let errorMessage = "An unknown error occurred";
    if (e instanceof Error) {
      errorMessage = e.message;
    }

    throw new Error(`Failed to upload to Arweave via Irys: ${errorMessage}`);
  }
}
