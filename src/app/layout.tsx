import type { Metadata } from "next";
import { fontHeading, fontSans } from "@/lib/fonts";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll-provider";
import { NavigationHeader } from "@/components/navigation-header";
import { Footer } from "@/components/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Utsav — AI Event Co-Planner for Celebrations in India",
  description:
    "Co-plan weddings, milestone birthdays, and community utsavs with transparent budgets and cultural ceremony guides.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontHeading.variable} ${fontSans.variable} h-full`}
    >
      <body className="min-h-full flex flex-col font-sans antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SmoothScrollProvider>
            <NavigationHeader />
            <main className="flex-1 flex flex-col">{children}</main>
            <Footer />
          </SmoothScrollProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
