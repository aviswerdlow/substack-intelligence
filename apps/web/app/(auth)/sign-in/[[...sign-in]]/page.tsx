import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Welcome to Substack Intelligence</h1>
          <p className="text-muted-foreground mt-2">
            Sign in with Google to automatically connect your Gmail for newsletter processing
          </p>
        </div>
        <SignIn 
          appearance={{
            elements: {
              formButtonPrimary: 'bg-primary hover:bg-primary/90',
              card: 'shadow-lg',
              socialButtonsBlockButton: 'bg-blue-600 hover:bg-blue-700 text-white',
              socialButtonsBlockButtonText: 'font-medium',
            },
            layout: {
              socialButtonsPlacement: 'top',
              socialButtonsVariant: 'blockButton',
            }
          }}
          // Force Google OAuth as preferred method
          routing="hash"
          redirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}