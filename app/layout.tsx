import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { AuthInitializer } from "@/components/AuthInitializer";
import { SchemaValidator } from "@/components/SchemaValidator";

export const metadata: Metadata = {
  title: "UniRide Admin",
  description: "Administrative interface for UniRide platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        <SchemaValidator />
        <AuthProvider>
          <AuthInitializer />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
