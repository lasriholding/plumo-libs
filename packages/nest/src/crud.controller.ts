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
  Req,
} from "@nestjs/common"
import type { OrgCrudService } from "./crud.service.js"

/** Minimal request shape — Clerk AuthGuard sets `auth.orgId`. */
export type AuthLikeRequest = {
  auth?: { orgId?: string | null; orgRole?: string | null }
}

/**
 * Optional base controller for org-scoped CRUD.
 *
 * Body/query typed as `any` so subclasses can use concrete DTOs without
 * TS2416 (parameter contravariance).
 *
 * Org resolution order:
 * 1. `req.auth.orgId` (Clerk / AuthGuard)
 * 2. `?orgId=` query (local preview / scripts)
 */
export abstract class OrgCrudController {
  protected abstract readonly service: OrgCrudService

  protected resolveOrgId(
    req: AuthLikeRequest,
    query: Record<string, unknown> = {},
  ): string {
    const fromAuth = req.auth?.orgId
    if (typeof fromAuth === "string" && fromAuth.trim()) {
      return fromAuth.trim()
    }
    const fromQuery = query.orgId
    if (typeof fromQuery === "string" && fromQuery.trim()) {
      return fromQuery.trim()
    }
    throw new BadRequestException("orgId is required")
  }

  @Post()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create(@Req() req: AuthLikeRequest, @Body() body: any, @Query() query: any) {
    return this.service.create(
      this.resolveOrgId(req, query as Record<string, unknown>),
      body as Record<string, unknown>,
    )
  }

  @Get()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findAll(@Req() req: AuthLikeRequest, @Query() query: any) {
    const q = (query ?? {}) as Record<string, unknown>
    const orgId = this.resolveOrgId(req, q)
    const { orgId: _, ...rest } = q
    return this.service.list(orgId, rest)
  }

  @Get(":id")
  findOne(
    @Req() req: AuthLikeRequest,
    @Param("id", ParseIntPipe) id: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Query() query: any,
  ) {
    return this.service.retrieve(
      this.resolveOrgId(req, query as Record<string, unknown>),
      id,
    )
  }

  @Patch(":id")
  update(
    @Req() req: AuthLikeRequest,
    @Param("id", ParseIntPipe) id: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Body() body: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Query() query: any,
  ) {
    return this.service.update(
      this.resolveOrgId(req, query as Record<string, unknown>),
      id,
      body as Record<string, unknown>,
    )
  }

  @Delete(":id")
  remove(
    @Req() req: AuthLikeRequest,
    @Param("id", ParseIntPipe) id: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Query() query: any,
  ) {
    return this.service.destroy(
      this.resolveOrgId(req, query as Record<string, unknown>),
      id,
    )
  }
}
