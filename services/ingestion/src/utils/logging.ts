// Stub logging utilities for ingestion service
// In production, these should be replaced with proper logging infrastructure

export const axiomLogger = {
  async logEmailEvent(event: string, data: any) {
    console.log(`[Email Event] ${event}:`, data);
  },
  
  async logError(error: Error, context: any) {
    console.error(`[Error] ${error.message}:`, context);
  },
  
  async logHealthCheck(service: string, status: string, data: any) {
    console.log(`[Health Check] ${service} - ${status}:`, data);
  },
  
  async logDatabaseEvent(event: string, data: any) {
    console.log(`[Database Event] ${event}:`, data);
  },
  
  async logBusinessMetric(metric: string, value: number, data: any) {
    console.log(`[Business Metric] ${metric}: ${value}`, data);
  }
};