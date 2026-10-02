import type { Metadata, Viewport } from "next";
import "./globals.css";
import MotionProvider from "@/components/motion/provider";

export const metadata: Metadata = {
  title: { default: "Travel Planner", template: "%s · Travel Planner" },
  description: "Plan stops, bookings and costs for your trip in one calendar.",
};

export const viewport: Viewport = {
  themeColor: "#f5f5f4",
  viewportFit: "cover",
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
