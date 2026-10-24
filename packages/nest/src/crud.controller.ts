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
  auth?: { orgId?: string | null }
}

/**
 * Optional base controller for org-scoped CRUD.
 *
 * Org resolution order:
 * 1. `req.auth.orgId` (Clerk / AuthGuard — same source as `@OrgId()`)
 * 2. `?orgId=` query (local preview / scripts)
 *
 * Override individual handlers when a route needs different permissions
 * (e.g. looser `findAll` for POS) — re-declare `@Get()` + guards, call `super`.
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
  create(
    @Req() req: AuthLikeRequest,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.service.create(this.resolveOrgId(req, query), body)
  }

  @Get()
  findAll(
    @Req() req: AuthLikeRequest,
    @Query() query: Record<string, unknown>,
  ) {
    const orgId = this.resolveOrgId(req, query)
    const { orgId: _, ...rest } = query
    return this.service.list(orgId, rest)
  }

  @Get(":id")
  findOne(
    @Req() req: AuthLikeRequest,
    @Param("id", ParseIntPipe) id: number,
    @Query() query: Record<string, unknown>,
  ) {
    return this.service.retrieve(this.resolveOrgId(req, query), id)
  }

  @Patch(":id")
  update(
    @Req() req: AuthLikeRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.service.update(this.resolveOrgId(req, query), id, body)
  }

  @Delete(":id")
  remove(
    @Req() req: AuthLikeRequest,
    @Param("id", ParseIntPipe) id: number,
    @Query() query: Record<string, unknown>,
  ) {
    return this.service.destroy(this.resolveOrgId(req, query), id)
  }
}
