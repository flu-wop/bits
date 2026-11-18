import RootShell from '@/components/RootShell';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootShell slug="Special-Inquiries">{children}</RootShell>;
}
