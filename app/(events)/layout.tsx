import RootShell from '@/components/RootShell';
import { PAGES } from '@/lib/pages';

// Event pages borrow the Programming & Events look (same data-page, nav highlight and backdrop).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootShell page={PAGES['Programming-Events']}>{children}</RootShell>;
}
