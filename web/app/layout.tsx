import type { Metadata } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/src/lib/utils";
import { Providers } from './providers';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Heyama Objects',
  description: "Gestionnaire d'objets Heyama",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={cn("font-sans", geist.variable)}>
      <body className="bg-slate-50 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
