'use client';
import { useEffect, useMemo } from 'react';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { useSim } from '@/store/useSim';
import '@solana/wallet-adapter-react-ui/styles.css';

const ENDPOINT = process.env.NEXT_PUBLIC_RPC ?? 'https://api.mainnet-beta.solana.com';

function Boot() {
  const boot = useSim((s) => s.boot);
  const setWallet = useSim((s) => s.setWallet);
  const { publicKey } = useWallet();
  useEffect(() => boot(), [boot]);
  useEffect(() => setWallet(publicKey ? publicKey.toBase58() : null), [publicKey, setWallet]);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  // Phantom + Solflare explicitly; Backpack (and any other Wallet Standard wallet) is auto-detected.
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Boot />
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
