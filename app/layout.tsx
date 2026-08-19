import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'ENGINEERING AUDIT SYSTEM - BOROSIL RENEWABLES LTD.',
  description:
    'Industrial equipment health assessment, checkpoint compliance, and automated action tracking powered by Supabase Cloud Database & Storage.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-slate-50 text-slate-800 min-h-screen font-sans selection:bg-indigo-500 selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
