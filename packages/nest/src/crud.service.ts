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

/**
 * DRF ModelViewSet analogue — org-scoped CRUD.
 * Subclass only for domain hooks / extra actions.
 *
 * List-cache plugin is wired in a later step via optional 3rd ctor arg.
 */
export class OrgCrudService {
  constructor(
    protected readonly db: DelegateHost,
    protected readonly resource: DefinedResource,
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
    return this.loadList(orgId, query)
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
    return this.delegate.create({
      data: { ...payload, orgId },
      ...(this.resource.include ? { include: this.resource.include } : {}),
    })
  }

  async update(
    orgId: string,
    id: number,
    data: Record<string, unknown>,
  ): Promise<OrgRow> {
    await this.retrieve(orgId, id)
    await this.assertUpdate(orgId, id, data)
    const payload = await this.mapUpdateData(orgId, id, data)
    return this.delegate.update({
      where: { id },
      data: payload,
      ...(this.resource.include ? { include: this.resource.include } : {}),
    })
  }

  async destroy(orgId: string, id: number): Promise<OrgRow> {
    await this.retrieve(orgId, id)
    return this.delegate.delete({ where: { id } })
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
