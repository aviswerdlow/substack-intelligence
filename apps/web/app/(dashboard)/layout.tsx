// import { auth } from '@clerk/nextjs/server';
// import { redirect } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard/nav';
// import { UserButton } from '@clerk/nextjs';
import { Providers } from '@/components/providers';

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
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
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
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </Providers>
  );
}