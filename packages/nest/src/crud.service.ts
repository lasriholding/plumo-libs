import {
  paginatedResult,
  resolvePagination,
  type PaginatedResult,
} from "./pagination.js"
import {
  buildWhereFromQuery,
  resolveOrder,
  type DefinedResource,
} from "./resource.js"
import type {
  DelegateHost,
  ModelDelegate,
  OrgRow,
} from "./prisma-delegate.js"
import { requireInOrg } from "./require-in-org.js"
import {
  defaultOrgListCache,
  type OrgListCache,
} from "./org-list-cache.js"

/**
 * DRF ModelViewSet analogue — org-scoped CRUD.
 * Subclass only for domain hooks / extra actions.
 */
export class OrgCrudService {
  constructor(
    protected readonly db: DelegateHost,
    protected readonly resource: DefinedResource,
    protected readonly listCache: OrgListCache = defaultOrgListCache,
  ) {}

  protected get delegate(): ModelDelegate {
    const d = this.db[this.resource.model]
    if (!d || typeof d !== "object") {
      throw new Error(`No delegate for model "${this.resource.model}"`)
    }
    return d as ModelDelegate
  }

  async list(
    orgId: string,
    query: Record<string, unknown> = {},
  ): Promise<PaginatedResult<OrgRow>> {
    const load = () => this.loadList(orgId, query)
    const cfg = this.resource.listCache
    if (!cfg) return load()
    return this.listCache.getOrSet(cfg.scope, orgId, query, load, {
      ttlMs: cfg.ttlMs,
    })
  }

  protected async loadList(
    orgId: string,
    query: Record<string, unknown>,
  ): Promise<PaginatedResult<OrgRow>> {
    const { page, limit, skip } = resolvePagination(query)
    const where = {
      ...buildWhereFromQuery(this.resource, orgId, query),
      ...this.extraWhere(orgId, query),
    }
    const orderBy = resolveOrder(this.resource, query as never)

    const [data, total] = await Promise.all([
      this.delegate.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        ...(this.resource.listSelect
          ? { select: this.resource.listSelect }
          : this.resource.include
            ? { include: this.resource.include }
            : {}),
      }),
      this.delegate.count({ where }),
    ])

    return paginatedResult(
      data.map((row) => this.transformListItem(row)),
      total,
      page,
      limit,
    )
  }

  async retrieve(orgId: string, id: number): Promise<OrgRow> {
    const row = await requireInOrg(
      this.delegate,
      orgId,
      id,
      this.resource.notFoundMessage,
    )
    return this.transformDetail(row)
  }

  async create(
    orgId: string,
    data: Record<string, unknown>,
  ): Promise<OrgRow> {
    await this.assertCreate(orgId, data)
    const payload = await this.mapCreateData(orgId, data)
    const row = await this.delegate.create({
      data: { ...payload, orgId },
      ...(this.resource.include ? { include: this.resource.include } : {}),
    })
    this.invalidateListCache(orgId)
    return row
  }

  async update(
    orgId: string,
    id: number,
    data: Record<string, unknown>,
  ): Promise<OrgRow> {
    await this.retrieve(orgId, id)
    await this.assertUpdate(orgId, id, data)
    const payload = await this.mapUpdateData(orgId, id, data)
    const row = await this.delegate.update({
      where: { id },
      data: payload,
      ...(this.resource.include ? { include: this.resource.include } : {}),
    })
    this.invalidateListCache(orgId)
    return row
  }

  async destroy(orgId: string, id: number): Promise<OrgRow> {
    await this.retrieve(orgId, id)
    const row = await this.delegate.delete({ where: { id } })
    this.invalidateListCache(orgId)
    return row
  }

  protected invalidateListCache(orgId: string) {
    const cfg = this.resource.listCache
    if (cfg) this.listCache.invalidate(cfg.scope, orgId)
  }

  protected extraWhere(
    _orgId: string,
    _query: Record<string, unknown>,
  ): Record<string, unknown> {
    return {}
  }

  protected transformListItem(row: OrgRow): OrgRow {
    return row
  }

  protected transformDetail(row: OrgRow): OrgRow {
    return row
  }

  protected async assertCreate(
    _orgId: string,
    _data: Record<string, unknown>,
  ): Promise<void> {}

  protected async assertUpdate(
    _orgId: string,
    _id: number,
    _data: Record<string, unknown>,
  ): Promise<void> {}

  protected async mapCreateData(
    _orgId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return data
  }

  protected async mapUpdateData(
    _orgId: string,
    _id: number,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return data
  }
}
