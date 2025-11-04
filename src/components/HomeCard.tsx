interface HomeCardProps {
  children: React.ReactNode;
}

export default function HomeCard({ children }: HomeCardProps) {
  return <div className="home-card w-full h-full">{children}</div>;
}
