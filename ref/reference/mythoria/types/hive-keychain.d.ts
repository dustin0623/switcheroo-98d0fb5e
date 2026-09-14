/**
 * types/hive-keychain.d.ts
 * Global augmentation for the Hive Keychain browser extension API.
 */

interface HiveKeychainSignBufferResponse {
  success: boolean;
  result?: string; // The signature (hex string)
  publicKey?: string; // The public key that signed
  error?: string; // Error message if success is false
  message?: string; // Alternative error message field
}

declare global {
  interface Window {
    hive_keychain?: {
      /**
       * Sign an arbitrary buffer with a Hive key (used for authentication).
       * The keychain hashes the message with SHA-256 before signing.
       */
      requestSignBuffer: (
        username: string,
        message: string,
        keyType: "Posting" | "Active" | "Memo",
        callback: (response: HiveKeychainSignBufferResponse) => void
      ) => void;

      /**
       * Transfer HIVE or HBD from one account to another.
       */
      requestTransfer: (
        from: string,
        to: string,
        amount: string,
        memo: string,
        currency: "HIVE" | "HBD",
        callback: (resp: {
          success: boolean;
          result?: { id?: string } | string;
          message?: string;
        }) => void
      ) => void;

      /**
       * Check if the keychain is connected and ready.
       */
      isConnected?: () => boolean;
    };
  }
}

export {};
