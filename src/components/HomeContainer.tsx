import { cn } from '@/lib/utils';

export default function HomeContainer({
  children,
  addClassName,
}: {
  children: React.ReactNode;
  addClassName?: string;
  isFixed?: boolean;
}) {
  return <main className={cn('home-container', addClassName)}>{children}</main>;
}
