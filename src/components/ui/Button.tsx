import { ReactNode } from "react";
import Link from "next/link";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "ghost";
  className?: string;
  onClick?: () => void;
};

export default function Button({
  children,
  href,
  variant = "primary",
  className = "",
  onClick,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-full text-sm font-medium transition-all duration-200 px-6 py-3 cursor-pointer";
  const variants = {
    primary: "bg-white text-[#0D1016] hover:bg-gray-100",
    ghost:
      "bg-white/[0.06] border border-white/[0.12] text-white/75 hover:bg-white/[0.1]",
  };

  const cls = `${base} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button className={cls} onClick={onClick}>
      {children}
    </button>
  );
}
