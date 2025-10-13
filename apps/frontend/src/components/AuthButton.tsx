import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState, useRef, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { useAuth } from "../hooks/useAuth";
import bs58 from "bs58";
import { Button } from "./ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

type DecodedToken = {
  sub: string;
  app_metadata: {
    wallet_address: string;
  };
};

export const AuthButton = () => {
  const { connected, publicKey, signMessage, disconnect } = useWallet();
  const { user, setAuth, logout: authLogout } = useAuth();
  const [isSigning, setIsSigning] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const signingInProgress = useRef(false);
  
  const getNonce = trpc.auth.getNonce.useMutation();
  const verifySignature = trpc.auth.verify.useMutation();

  const handleSign = useCallback(async () => {
    console.log("🔵 handleSign called", {
      publicKey: publicKey?.toBase58(),
      hasSignMessage: !!signMessage,
      signingInProgress: signingInProgress.current,
    });

    if (!publicKey || !signMessage) {
      console.log("❌ Missing publicKey or signMessage");
      return;
    }
    
    // Use ref to prevent multiple simultaneous calls
    if (signingInProgress.current) {
      console.log("⚠️ Already signing (in progress), skipping");
      return;
    }
    
    console.log("✅ Starting sign process");
    signingInProgress.current = true;
    setIsSigning(true);
    
    try {
      console.log("📝 Getting nonce...");
      const { nonce } = await getNonce.mutateAsync({
        walletAddress: publicKey.toBase58(),
      });
      console.log("✅ Got nonce:", nonce);
      
      console.log("✍️ Requesting signature from wallet...");
      const signature = await signMessage(new TextEncoder().encode(nonce));
      console.log("✅ Got signature from wallet");
      
      console.log("🔐 Verifying signature...");
      const { token } = await verifySignature.mutateAsync({
        publicKey: publicKey.toBase58(),
        signature: bs58.encode(signature),
        nonce,
      });
      console.log("✅ Signature verified, got token");

      const decoded = jwtDecode<DecodedToken>(token);
      const userToStore = {
        id: decoded.sub,
        wallet_address: decoded.app_metadata.wallet_address,
      };

      console.log("💾 Setting auth state...", userToStore);
      setAuth(token, userToStore);
      
      console.log("🚀 Navigating...");
      // Use setTimeout to ensure state has propagated before navigation
      setTimeout(() => {
        const from = (location.state as any)?.from?.pathname || "/";
        navigate(from, { replace: true });
      }, 100);

    } catch (error) {
      console.error("❌ Sign-in failed", error);
    } finally {
      signingInProgress.current = false;
      setIsSigning(false);
    }
  }, [publicKey, signMessage, getNonce, verifySignature, setAuth, navigate, location]);

  const handleLogout = () => {
    authLogout();
    disconnect();
    signingInProgress.current = false;
  };

  // Auto-sign when wallet connects (only if not already authenticated)
  useEffect(() => {
    console.log("🔄 useEffect triggered", {
      connected,
      hasPublicKey: !!publicKey,
      hasUser: !!user,
      signingInProgress: signingInProgress.current,
    });
    
    if (connected && publicKey && !user && !signingInProgress.current) {
      console.log("✅ Conditions met, calling handleSign");
      handleSign();
    }
  }, [connected, publicKey, user, handleSign]);

  // Reset signing flag when wallet disconnects
  useEffect(() => {
    if (!connected) {
      console.log("🔌 Wallet disconnected, resetting flags");
      signingInProgress.current = false;
    }
  }, [connected]);

  if (!connected) {
    return <WalletMultiButton />;
  }
  if (user) {
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
