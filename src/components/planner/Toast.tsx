"use client";

import { useEffect, useState } from "react";

export default function Toast({ message }: { message: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="fixed left-1/2 z-[60] bg-[#1c1b19] text-white text-[13.5px] px-4 py-2.5 rounded-full shadow-[0_10px_30px_rgba(28,27,25,0.28)] transition-all duration-300 ease-out"
      style={{
        top: 16,
        transform: `translate(-50%, ${visible ? "0" : "-10px"})`,
        opacity: visible ? 1 : 0,
      }}
    >
      {message}
    </div>
  );
}
