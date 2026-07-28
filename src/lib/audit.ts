import { prisma } from "./prisma";

type AuditParams = {
  userId: string;
  entityType: string;
  entityId?: string;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
};

export async function writeAuditLog(params: AuditParams) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
      newValue: params.newValue ? JSON.stringify(params.newValue) : null,
    },
  });
}
