import type { Metadata } from 'next';
import { Syne, Space_Mono, DM_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';

const syne = Syne({ subsets: ['latin'], variable: '--font-display', weight: ['400','600','700','800'] });
const spaceMono = Space_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400','700'] });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans', weight: ['300','400','500','600'] });

export const metadata: Metadata = {
  title: 'StockLens — Investment Analytics',
  description: 'Análisis técnico y fundamental de acciones en tiempo real',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={`${syne.variable} ${spaceMono.variable} ${dmSans.variable} font-sans bg-bg-primary text-text-primary antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
