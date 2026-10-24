import {
  BadRequestException,
  Body,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common"
import type { OrgCrudService } from "./crud.service.js"

/**
 * Optional base controller for pure CRUD modules.
 * Concrete controllers set `@Controller` + auth and inject the service.
 *
 * Modules with extra routes (convert, stock) keep a hand-written controller
 * that still calls `OrgCrudService` — same as DRF `@action`.
 *
 * Override `resolveOrgId` to use Clerk `@OrgId()` instead of query params.
 */
export abstract class OrgCrudController {
  protected abstract readonly service: OrgCrudService

  /**
   * Default: `?orgId=`. Real API subclasses typically ignore this and pass
   * `@OrgId()` into overridden handlers, or override this method.
   */
  protected resolveOrgId(query: Record<string, unknown>): string {
    const id = query.orgId
    if (typeof id === "string" && id.trim()) return id.trim()
    throw new BadRequestException("orgId is required")
  }

  @Post()
  create(
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.service.create(this.resolveOrgId(query), body)
  }

  @Get()
  findAll(@Query() query: Record<string, unknown>) {
    const orgId = this.resolveOrgId(query)
    const { orgId: _, ...rest } = query
    return this.service.list(orgId, rest)
  }

  @Get(":id")
  findOne(
    @Param("id", ParseIntPipe) id: number,
    @Query() query: Record<string, unknown>,
  ) {
    return this.service.retrieve(this.resolveOrgId(query), id)
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.service.update(this.resolveOrgId(query), id, body)
  }

  @Delete(":id")
  remove(
    @Param("id", ParseIntPipe) id: number,
    @Query() query: Record<string, unknown>,
  ) {
    return this.service.destroy(this.resolveOrgId(query), id)
  }
}
