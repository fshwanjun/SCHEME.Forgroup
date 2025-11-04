import { cn } from "@/util/cn";

export default function Homecontainer({ children, addClassName }: { children: React.ReactNode, addClassName?: string }) {
  return (
    <main className={cn("home-container mx-auto px-[var(--x-padding)] pt-[calc(var(--header-height)+20px)] pb-10 overflow-hidden inset-0", addClassName)}>{children}</main>
  )
}