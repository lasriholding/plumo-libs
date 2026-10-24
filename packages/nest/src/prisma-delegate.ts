/** Loose row shape — Prisma models are richer at the call site. */
export type OrgRow = Record<string, unknown> & {
  id: number
  orgId?: string
}

/**
 * Minimal Prisma-like model delegate used by OrgCrudService / requireInOrg.
 * Real `PrismaService.product` etc. satisfy this structurally.
 */
export type ModelDelegate = {
  findFirst(args: {
    where: Record<string, unknown>
    include?: unknown
    select?: unknown
  }): Promise<OrgRow | null>
  findMany(args: {
    where?: Record<string, unknown>
    orderBy?: unknown
    skip?: number
    take?: number
    include?: unknown
    select?: unknown
  }): Promise<OrgRow[]>
  count(args: { where?: Record<string, unknown> }): Promise<number>
  create(args: {
    data: Record<string, unknown>
    include?: unknown
  }): Promise<OrgRow>
  update(args: {
    where: { id: number }
    data: Record<string, unknown>
    include?: unknown
  }): Promise<OrgRow>
  delete(args: { where: { id: number } }): Promise<OrgRow>
}

/** Host that exposes named delegates (PrismaService). */
export type DelegateHost = Record<string, ModelDelegate | unknown>
