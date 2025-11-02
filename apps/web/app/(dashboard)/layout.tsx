import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard/nav';
import { Providers } from '@/components/providers';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { KeyboardShortcuts } from '@/components/keyboard/KeyboardShortcuts';
import { IntelligenceProvider } from '@/contexts/IntelligenceContext';
import { authOptions } from '@/lib/auth';
import { SessionAccountControls } from '@/components/auth/SessionAccountControls';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <Providers>
      <IntelligenceProvider>
        <OnboardingProvider>
          <div className="min-h-screen bg-background">
            <header className="border-b bg-card">
              <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h1 className="text-xl font-semibold">Substack Intelligence</h1>
                  <DashboardNav />
                </div>
                <div className="flex items-center space-x-4">
                  <SessionAccountControls user={session.user} />
                </div>
              </div>
            </header>
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
            
            {/* Global Components */}
            <OnboardingTour />
            <OnboardingChecklist />
            <KeyboardShortcuts />
          </div>
        </OnboardingProvider>
      </IntelligenceProvider>
    </Providers>
  );
}
