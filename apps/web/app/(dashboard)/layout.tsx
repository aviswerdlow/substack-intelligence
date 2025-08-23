import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard/nav';
import { UserButton } from '@clerk/nextjs';
import { Providers } from '@/components/providers';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { KeyboardShortcuts } from '@/components/keyboard/KeyboardShortcuts';
import { IntelligenceProvider } from '@/contexts/IntelligenceContext';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
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
                  <UserButton 
                    appearance={{
                      elements: {
                        avatarBox: 'w-8 h-8'
                      }
                    }}
                  />
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