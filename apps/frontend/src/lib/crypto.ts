import { Buffer } from 'buffer'

// Ensure Buffer is available globally for some libraries that might need it.
window.Buffer = Buffer

// We will use a fixed salt for simplicity in the MVP.
// In a real-world app, this might be user-specific and stored with their profile.
const SALT = 'SolsignAI-is-the-best-app-ever'

/**
 * Derives a cryptographic key from a user's wallet signature.
 * @param signature - The signature from the wallet (as a Uint8Array).
 * @returns A CryptoKey object for AES-GCM encryption/decryption.
 */
async function deriveKeyFromSignature(signature: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    signature.slice(0, 32), // Use the first 32 bytes of the signature for the key material
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(SALT),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Encrypts a JSON object using a derived key.
 * @param key - The CryptoKey derived from the user's signature.
 * @param data - The JSON object to encrypt.
 * @returns A base64 encoded string of the encrypted data.
 */
export async function encryptData(key: CryptoKey, data: object): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12)) // Initialization Vector
  const encodedData = new TextEncoder().encode(JSON.stringify(data))

  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedData,
  )

  const combined = new Uint8Array(iv.length + encryptedContent.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encryptedContent), iv.length)

  return Buffer.from(combined).toString('base64')
}

/**
 * Decrypts a base64 encoded string back into a JSON object.
 * @param key - The CryptoKey derived from the user's signature.
 * @param ciphertext - The base64 encoded encrypted data.
 * @returns The original JSON object.
 */
export async function decryptData<T>(key: CryptoKey, ciphertext: string): Promise<T> {
  const combined = Buffer.from(ciphertext, 'base64')
  const iv = combined.slice(0, 12)
  const encryptedContent = combined.slice(12)

  const decryptedContent = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encryptedContent,
  )

  return JSON.parse(new TextDecoder().decode(decryptedContent)) as T
}

// We will store the derived key in memory to avoid re-deriving it constantly.
let derivedKey: CryptoKey | null = null

/**
 * A hook-like function to manage the encryption key.
 * It ensures the key is derived only once per session.
 */
export const useEncryptionKey = () => {
  const getKey = async (signMessage: (message: Uint8Array) => Promise<Uint8Array>): Promise<CryptoKey> => {
    if (derivedKey) {
      return derivedKey
    }

    // This message is for deriving the key and should be consistent.
    const message = new TextEncoder().encode('Login to SolSignAI to access your encrypted vault.')
    const signature = await signMessage(message)
    const key = await deriveKeyFromSignature(signature)
    derivedKey = key
    return key
  }

  const clearKey = () => {
    derivedKey = null
  }

  return { getKey, clearKey }
}
