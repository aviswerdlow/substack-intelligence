// import { auth } from '@clerk/nextjs/server';
// import { redirect } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard/nav';
// import { UserButton } from '@clerk/nextjs';
import { Providers } from '@/components/providers';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { KeyboardShortcuts } from '@/components/keyboard/KeyboardShortcuts';
import { AccessibilityProvider, AccessibilityToolbar } from '@/components/accessibility/AccessibilityProvider';
import { MobileNav } from '@/components/mobile/MobileNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TEMPORARILY DISABLED FOR TESTING
  // const { userId } = await auth();

  // if (!userId) {
  //   redirect('/sign-in');
  // }

  return (
    <Providers>
      <AccessibilityProvider>
        <OnboardingProvider>
          <div className="min-h-screen bg-background">
            {/* Skip to content link for accessibility */}
            <a href="#main-content" className="skip-to-content">
              Skip to main content
            </a>
            
            {/* Desktop Header */}
            <header className="hidden lg:block border-b bg-card">
              <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h1 className="text-xl font-semibold">Substack Intelligence</h1>
                  <DashboardNav />
                </div>
                <div className="flex items-center space-x-4">
                  {/* TEMPORARILY DISABLED FOR TESTING */}
                  {/* <UserButton 
                    appearance={{
                      elements: {
                        avatarBox: 'w-8 h-8'
                      }
                    }}
                  /> */}
                  <div className="w-8 h-8 rounded-full bg-gray-400"></div>
                </div>
              </div>
            </header>
            
            {/* Mobile Navigation */}
            <MobileNav />
            
            {/* Main Content */}
            <main 
              id="main-content"
              className="container mx-auto px-4 py-8 lg:py-8 pt-20 lg:pt-8 pb-24 lg:pb-8"
            >
              {children}
            </main>
            
            {/* Global Components */}
            <OnboardingTour />
            <OnboardingChecklist />
            <KeyboardShortcuts />
            <AccessibilityToolbar />
          </div>
        </OnboardingProvider>
      </AccessibilityProvider>
    </Providers>
  );
}