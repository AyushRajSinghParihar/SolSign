import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
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

      const decoded = jwtDecode<DecodedToken>(token);
      const userToStore = {
        id: decoded.sub,
        wallet_address: decoded.app_metadata.wallet_address,
      };

      setAuth(token, userToStore);
      
      // After successful login, recall the intended destination from the state.
      const from = (location.state as any)?.from?.pathname || "/";
      // Navigate the user to where they wanted to go.
      navigate(from, { replace: true });

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
    if (connected && !user && !isSigning && !verifySignature.isSuccess) {
      handleSign();
    }
  }, [connected, user]);

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
