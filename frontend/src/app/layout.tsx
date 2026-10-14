import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "BELLSGALLERY",
  description: "A clean, minimalist e-commerce store with Virtual Fitting Room.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                var observer = new MutationObserver(function(mutations) {
                  for (var i = 0; i < mutations.length; i++) {
                    var m = mutations[i];
                    if (m.type === 'attributes' && (m.attributeName === 'bis_skin_checked' || m.attributeName === 'bis_register' || (m.attributeName && m.attributeName.indexOf('__processed_') === 0))) {
                      m.target.removeAttribute(m.attributeName);
                    }
                  }
                });
                observer.observe(document.documentElement, { attributes: true, subtree: true });
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans flex flex-col min-h-screen`} suppressHydrationWarning>
        <AuthProvider>
          <CartProvider>
            <Header />
            <main className="flex-grow pt-16">
              {children}
            </main>
            <Footer />
            <AuthModal />
          </CartProvider>
        </AuthProvider>
        <Script 
          src={
            process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true'
              ? "https://app.midtrans.com/snap/snap.js"
              : "https://app.sandbox.midtrans.com/snap/snap.js"
          } 
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''}
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
