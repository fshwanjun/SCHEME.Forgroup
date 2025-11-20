import { cn } from '@/lib/utils';
import Header from '@/components/Header';

export default function HomeContainer({
  children,
  addClassName,
  isFixed = true,
}: {
  children: React.ReactNode;
  addClassName?: string;
  isFixed?: boolean;
}) {
  return (
    <main className={cn('home-container', addClassName)}>
      <Header isFixed={isFixed} />
      {children}
    </main>
  );
}
