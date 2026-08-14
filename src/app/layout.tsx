import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";

import prisma from '@/lib/prisma';

export const metadata: Metadata = {
  title: "RemoteUS Matcher",
  description: "AI-powered job automation and tracking for Senior Frontend Engineers",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const availableCount = await prisma.job.count({ where: { status: 'AVAILABLE' } });
  const appliedCount = await prisma.job.count({ where: { status: { notIn: ['AVAILABLE', 'DISCARDED'] } } });

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <Header availableCount={availableCount} appliedCount={appliedCount} />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
