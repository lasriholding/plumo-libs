import { ConflictException } from "@nestjs/common"

/** Duck-typed Prisma P2002 (no generated client import in the kit). */
export type PrismaUniqueLike = {
  code: string
  meta?: { target?: string | string[] }
}

export function isPrismaUnique(error: unknown): error is PrismaUniqueLike {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as PrismaUniqueLike).code === "P2002"
  )
}

export function prismaUniqueFields(error: unknown): string[] {
  if (!isPrismaUnique(error)) return []
  const target = error.meta?.target
  if (Array.isArray(target)) return target.map(String)
  if (typeof target === "string") return [target]
  return []
}

/**
 * If `error` is Prisma P2002, throw ConflictException with a field-specific
 * message. Otherwise return (caller should rethrow).
 */
export function mapPrismaUnique(
  error: unknown,
  messages: Record<string, string>,
  fallback = "Unique constraint violation",
): void {
  if (!isPrismaUnique(error)) return

  const fields = prismaUniqueFields(error)
  for (const field of fields) {
    for (const [key, message] of Object.entries(messages)) {
      if (field === key || field.includes(key)) {
        throw new ConflictException(message)
      }
    }
  }
  throw new ConflictException(fallback)
}

/** Build a P2002-shaped error (tests / in-memory stores). */
export function prismaUniqueError(fields: string[]): PrismaUniqueLike & Error {
  const err = new Error(
    `Unique constraint failed on the fields: (${fields.join(", ")})`,
  ) as Error & PrismaUniqueLike
  err.code = "P2002"
  err.meta = { target: fields }
  return err
}
