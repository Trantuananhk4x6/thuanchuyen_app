import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thuận Chuyến – AI Routing",
  description: "Nền tảng ghép chuyến xe liên tỉnh thế hệ mới, tối ưu lộ trình bằng AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Prevent theme flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('td-theme');
                  var preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
                  document.documentElement.setAttribute('data-theme', saved || preferred);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <div className="bg-grid" aria-hidden="true" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
