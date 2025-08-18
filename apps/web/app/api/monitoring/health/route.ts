import { NextRequest, NextResponse } from 'next/server';
import { ServerErrorHandler } from '@/lib/monitoring/server-error-handler';
import { performDeploymentHealthCheck, checkReadiness, checkLiveness } from '@/lib/deployment/health-checks';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkType = searchParams.get('type') || 'full';
    
    // Handle different types of health checks
    switch (checkType) {
      case 'readiness':
        const readiness = await checkReadiness();
        return NextResponse.json({
          ready: readiness.ready,
          details: readiness.details,
          timestamp: new Date().toISOString()
        }, { 
          status: readiness.ready ? 200 : 503 
        });
        
      case 'liveness':
        const liveness = await checkLiveness();
        return NextResponse.json({
          alive: liveness.alive,
          details: liveness.details,
          timestamp: new Date().toISOString()
        }, { 
          status: liveness.alive ? 200 : 503 
        });
        
      case 'full':
      default:
        // Comprehensive deployment health check
        const healthCheck = await performDeploymentHealthCheck(request);
        
        // Return appropriate status code based on health
        const statusCode = healthCheck.overall === 'healthy' ? 200 : 
                          healthCheck.overall === 'degraded' ? 206 : 503;
        
        return NextResponse.json(healthCheck, { status: statusCode });
    }
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return ServerErrorHandler.handleError(error as Error, {
      apiRoute: '/api/monitoring/health',
      method: 'GET'
    });
  }
}