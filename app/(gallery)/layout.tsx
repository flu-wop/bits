import RootShell from '@/components/RootShell';
import { GALLERY } from '@/lib/pages';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootShell page={GALLERY}>{children}</RootShell>;
}
