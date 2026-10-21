import { Fraunces, Inter } from "next/font/google";

/**
 * Editorial celebratory serif for all headings and ceremonial titles.
 * Optical sizing and weight range for celebratory presence.
 */
export const fontHeading = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

/**
 * High-legibility neutral sans for all UI surfaces, inputs, and dense data.
 */
export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
