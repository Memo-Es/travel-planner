import type { Metadata } from "next";
import "./globals.css";
import MotionProvider from "@/components/motion/provider";

export const metadata: Metadata = {
  title: "Travel Planner",
  description: "A simple three-column trip planner: trips, calendar, tasks.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
