"use client";

import { useEffect, useState } from "react";

export function BrandIntro() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem("cotai-intro-seen")) return;
    sessionStorage.setItem("cotai-intro-seen", "1");
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 1900);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return <div className="cotai-intro fixed inset-0 z-[100] flex items-center justify-center bg-emerald-700 text-white" aria-hidden="true"><div className="cotai-wordmark relative font-serif text-7xl font-semibold tracking-tight sm:text-9xl"><span className="cotai-c inline-block">C</span><span className="cotai-rest inline-block">ota</span><span className="cotai-i relative inline-block">Í<span className="cotai-leaf absolute -right-1 -top-2 h-3 w-6 rotate-[-30deg] rounded-[100%_0_100%_0] bg-emerald-300 sm:h-4 sm:w-8" /></span></div></div>;
}
