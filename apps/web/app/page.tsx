import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Zap, TrendingUp, Clock, Target } from 'lucide-react'
import Link from 'next/link'
import { AuthButtons, AuthCTA } from '@/components/auth-buttons'

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <div className="flex items-center justify-center mb-6">
          <Zap className="h-12 w-12 text-primary mr-3" />
          <h1 className="text-4xl font-bold tracking-tight">Substack Intelligence</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Transform cultural commentary into actionable investment intelligence. 
          Automated daily insights from 26+ tastemakers.
        </p>
        <AuthButtons />
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <Card>
          <CardHeader>
            <Clock className="h-8 w-8 text-primary mb-2" />
            <CardTitle>96% Time Savings</CardTitle>
            <CardDescription>
              5 hours weekly → 10 minutes daily
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Automated processing of 26 Substack newsletters with AI-powered company extraction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Target className="h-8 w-8 text-primary mb-2" />
            <CardTitle>95% Capture Rate</CardTitle>
            <CardDescription>
              Never miss a mention again
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Advanced LLM analysis with confidence scoring and two-stage verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <TrendingUp className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Cultural Intelligence</CardTitle>
            <CardDescription>
              Early signals from tastemakers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Identify culturally-resonant brands before mainstream recognition
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Ready to Get Started?</CardTitle>
            <CardDescription>
              Sign in to access your personalized intelligence dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthCTA />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}