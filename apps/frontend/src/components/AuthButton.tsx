import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
import { trpc } from "../lib/trpc";
import { useAuth } from "../hooks/useAuth";
import bs58 from "bs58";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode"; // <-- IMPORT THIS

// Define the shape of the decoded JWT payload
type DecodedToken = {
  sub: string; // This is the user's UUID
  app_metadata: {
    wallet_address: string;
  };
  // ... other JWT fields like exp, aud, etc.
};

export const AuthButton = () => {
  const { connected, publicKey, signMessage, disconnect } = useWallet();
  const { user, setAuth, logout: authLogout } = useAuth(); // <-- Use `user` and `setAuth`
  const [isSigning, setIsSigning] = useState(false);
  const navigate = useNavigate();

  const getNonce = trpc.auth.getNonce.useMutation();
  const verifySignature = trpc.auth.verify.useMutation();

  const handleSign = async () => {
    if (!publicKey || !signMessage) return;

    setIsSigning(true);
    try {
      const { nonce } = await getNonce.mutateAsync({
        walletAddress: publicKey.toBase58(),
      });
      const signature = await signMessage(new TextEncoder().encode(nonce));
      const { token } = await verifySignature.mutateAsync({
        publicKey: publicKey.toBase58(),
        signature: bs58.encode(signature),
        nonce,
      });

      // Decode the JWT to get user info
      const decoded = jwtDecode<DecodedToken>(token);
      const userToStore = {
        id: decoded.sub,
        wallet_address: decoded.app_metadata.wallet_address,
      };

      // Use the new setAuth function
      setAuth(token, userToStore);
      navigate("/");
    } catch (error) {
      console.error("Sign-in failed", error);
    } finally {
      setIsSigning(false);
    }
  };

  const handleLogout = () => {
    authLogout();
    disconnect();
  };

  useEffect(() => {
    // We check for `user` now instead of `token` as the source of truth
    if (connected && !user && !isSigning && !verifySignature.isSuccess) {
      handleSign();
    }
  }, [connected, user]); // <-- Dependency array updated

  if (!connected) {
    return <WalletMultiButton />;
  }

  if (user) {
    // <-- Check for user object
    return (
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Welcome,{" "}
          <span className="font-mono text-foreground">
            {`${user.wallet_address.slice(0, 4)}...${user.wallet_address.slice(-4)}`}
          </span>
        </p>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleSign} disabled={isSigning}>
      {isSigning ? "Verifying in wallet..." : "Verify Wallet to Sign In"}
    </Button>
  );
};
