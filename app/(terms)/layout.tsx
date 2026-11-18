import RootShell from '@/components/RootShell';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootShell slug="terms">{children}</RootShell>;
}
