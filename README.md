# plumo-libs

Shared npm packages for Plumo ERP systems.

## Packages

| Package | Purpose |
|---------|---------|
| `@plumo/money` | Money math, HT/TTC, formatting, French amount-in-words |
| `@plumo/csv` | Build, parse, Excel-FR export, browser download |
| `@plumo/print` | HTML print engine, commercial templates, preview/bulk |
| `@plumo/company-finance` | Generic company balance / ledger / situation (any schema) |
| `@plumo/stock` | Stock movements, adjustments, availability, history planning |
| `@plumo/nest` | DRF-like Nest org-scoped CRUD: resources, filters, approvals, nested |

## Develop

```bash
pnpm install
pnpm build
pnpm smoke
```

`@plumo/nest` also: `pnpm --filter @plumo/nest test`

## Consume

**From GitHub** (subdir; **prebuilt `dist` committed** — no install-time `prepare` / `tsup`):

Packages that ship committed `dist` today: `@plumo/nest`, `@plumo/money`, `@plumo/company-finance`.

```bash
pnpm add github:lasriholding/plumo-libs#path:packages/nest
pnpm add github:lasriholding/plumo-libs#path:packages/money
pnpm add github:lasriholding/plumo-libs#path:packages/company-finance
# …same pattern for csv / print / stock once their dist is committed
```

`@plumo/company-finance` peers `@plumo/money` — add both.

After changing source: `pnpm --filter <pkg> build`, commit updated `dist`, push, then bump consumer lockfiles.

**From GitHub Packages** (after publish):

`.npmrc`:

```
@plumo:registry=https://npm.pkg.github.com
```

```bash
pnpm add @plumo/money @plumo/csv @plumo/print @plumo/nest @plumo/company-finance
```

### money

```ts
import { calcLine, htToTtc, money, amountToFrench, parseMoney } from '@plumo/money'

calcLine({ quantity: 2, unitPrice: 50, taxRate: 20 })
// → { subtotal: 100, taxAmount: 20, total: 120 }
```

### csv

```ts
import { exportToExcelCsv, parseCsv, defineCsvColumns } from '@plumo/csv'

exportToExcelCsv(rows, defineCsvColumns([
  { id: 'name', header: 'Nom', value: r => r.name },
]), { filename: 'clients' })
```

### print

```ts
import { configurePrintSettings, printCommercialDocument } from '@plumo/print'

configurePrintSettings(async () => ({
  margins: { top: 12, right: 12, bottom: 12, left: 12 },
  backgroundUrl: org.docTemplateUrl,
}))

await printCommercialDocument({
  documentType: 'invoice',
  documentNumber: 'FAC-1',
  date: '2026-10-22',
  clientName: 'ACME',
  items: [{ name: 'Service', quantity: 1, unitPrice: 120, total: 120, taxPercent: 20 }],
  subtotal: 100,
  taxAmount: 20,
  totalAmount: 120,
})
```

### nest

Peers: `@nestjs/common`, `class-validator`, `class-transformer`, `reflect-metadata`.

```ts
import {
  defineResource,
  Filter,
  OrgCrudService,
  OrgCrudController,
} from '@plumo/nest'

export const contactResource = defineResource({
  model: 'contact',
  search: ['firstName', 'lastName', 'email'],
  filters: { email: Filter.exact() },
  sortable: ['createdAt', 'firstName'],
  defaultOrder: { createdAt: 'desc' },
})

@Injectable()
export class ContactsService extends OrgCrudService {
  constructor(prisma: PrismaService) {
    super(prisma, contactResource)
  }
}

@Controller('contacts')
export class ContactsController extends OrgCrudController {
  constructor(protected readonly service: ContactsService) {
    super()
  }
}
```

See [`packages/nest/README.md`](packages/nest/README.md) for list modes, approvals, nested CRUD, and cache.
