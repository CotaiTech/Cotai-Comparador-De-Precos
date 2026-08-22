import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "CotaÍ | Compare supermercados",
  description: "Compare sua lista de compras entre supermercados e encontre a melhor economia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
