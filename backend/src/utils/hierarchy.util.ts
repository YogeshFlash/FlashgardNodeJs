export async function resolveTransferPath(tx: any, fromOrgId: string, toOrgId: string): Promise<string[]> {
  if (fromOrgId === toOrgId) return [toOrgId];

  const path: string[] = [];
  let currentOrgId: string | null = toOrgId;
  let safetyCounter = 0;

  while (currentOrgId && safetyCounter < 20) {
    path.unshift(currentOrgId);
    if (currentOrgId === fromOrgId) {
      return path; // Found the path, e.g., [fromOrgId, childId, toOrgId]
    }
    
    // Fetch parent
    const org: any = await tx.organization.findUnique({
      where: { id: currentOrgId },
      select: { parentId: true }
    });
    
    currentOrgId = org?.parentId || null;
    safetyCounter++;
  }

  // If we exit the loop and haven't returned, fromOrgId is NOT an ancestor of toOrgId.
  // Fallback to direct transfer.
  return [fromOrgId, toOrgId];
}
