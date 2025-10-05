import { AuditLog } from '@/types';
import { db, generateId, TABLES } from '../aws/dynamodb';

export class MonitoringService {
  async logAction(
    userId: string | undefined,
    action: string,
    resourceType: string,
    resourceId: string,
    details: Record<string, any> = {},
    ipAddress?: string
  ): Promise<void> {
    const log: AuditLog = {
      logId: generateId('log'),
      userId,
      action,
      resourceType,
      resourceId,
      details,
      timestamp: new Date().toISOString(),
      ipAddress,
    };

    await db.create(TABLES.AUDIT_LOGS, log);
  }

  async getAuditLogs(
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<AuditLog[]> {
    let logs = await db.scan<AuditLog>(TABLES.AUDIT_LOGS);

    // Filter by date range
    logs = logs.filter((log) => {
      const logDate = new Date(log.timestamp);
      return logDate >= new Date(startDate) && logDate <= new Date(endDate);
    });

    // Filter by userId if provided
    if (userId) {
      logs = logs.filter((log) => log.userId === userId);
    }

    return logs.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getResourceAuditLogs(
    resourceType: string,
    resourceId: string
  ): Promise<AuditLog[]> {
    const logs = await db.scan<AuditLog>(
      TABLES.AUDIT_LOGS,
      'resourceType = :resourceType AND resourceId = :resourceId',
      {
        ':resourceType': resourceType,
        ':resourceId': resourceId,
      }
    );

    return logs.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

export const monitoringService = new MonitoringService();

// Middleware for logging API requests
export function withAuditLog(
  handler: Function,
  action: string,
  resourceType: string
) {
  return async (req: any, res: any) => {
    const startTime = Date.now();

    try {
      const result = await handler(req, res);

      const duration = Date.now() - startTime;

      // Log successful action
      await monitoringService.logAction(
        req.user?.userId,
        action,
        resourceType,
        req.params?.id || 'N/A',
        {
          method: req.method,
          duration,
          status: 'success',
        },
        req.ip
      );

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Log failed action
      await monitoringService.logAction(
        req.user?.userId,
        action,
        resourceType,
        req.params?.id || 'N/A',
        {
          method: req.method,
          duration,
          status: 'error',
          error: error.message,
        },
        req.ip
      );

      throw error;
    }
  };
}
