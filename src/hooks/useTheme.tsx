import { useEffect, useState } from "react";

const KEY = "reseepe_theme";

export const useTheme = () => {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(KEY) === "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem(KEY, "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem(KEY, "light");
    }
  }, [dark]);

  return { dark, toggle: () => setDark((v) => !v), setDark };
};
