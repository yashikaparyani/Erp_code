/**
 * Canonical context resolution for the project/site spine.
 *
 * Every frontend screen resolves context in this order:
 *   record -> linked_site -> linked_project -> linked_tender
 *
 * These helpers normalise that resolution so no page invents its own logic.
 */

// ── Types ──────────────────────────────────────────────────────────────────

/** Minimal fields a backend record may carry. */
export interface SpineFields {
  linked_site?: string | null;
  linked_project?: string | null;
  linked_tender?: string | null;
  /** Legacy free-text field — used only for relink detection. */
  site_name?: string | null;
}

/** Resolved canonical context for a record or route. */
export interface ResolvedContext {
  site: string | null;
  project: string | null;
  tender: string | null;
  /** True when the record has a `site_name` but no real `linked_site`. */
  needsRelink: boolean;
}

/** A route-level context derived from URL params and optional query. */
export interface RouteContext {
  /** Dynamic segment — e.g. the `[name]` in `/projects/[name]`. */
  id: string | null;
  site: string | null;
  project: string | null;
  tender: string | null;
}

// ── Record context resolution ──────────────────────────────────────────────

/**
 * Resolve canonical context from a record's spine fields.
 *
 * Rules (from the rebuild strategy):
 *  - If `linked_site` exists it is authoritative for site context.
 *  - If `linked_project` exists it is authoritative for project context.
 *  - If `linked_tender` exists it is authoritative for tender context.
 *  - If `site_name` is present but `linked_site` is missing the record needs relink.
 */
export function resolveRecordContext(record: SpineFields): ResolvedContext {
  const site = normalise(record.linked_site);
  const project = normalise(record.linked_project);
  const tender = normalise(record.linked_tender);

  const hasSiteNameOnly =
    !site && !!normalise(record.site_name);

  return {
    site,
    project,
    tender,
    needsRelink: hasSiteNameOnly,
  };
}

// ── Route context resolution ───────────────────────────────────────────────

/**
 * Build a `RouteContext` from Next.js `params` and `searchParams`.
 *
 * Typical usage inside a page:
 * ```ts
 * const ctx = resolveRouteContext(params, searchParams);
 * ```
 *
 * Looks for `id` / `name` in params, and `site`, `project`, `tender` in
 * either params or searchParams (params wins).
 */
export function resolveRouteContext(
  params: Record<string, string | string[] | undefined>,
  searchParams?: Record<string, string | string[] | undefined>,
): RouteContext {
  const get = (key: string): string | null => {
    const fromParams = first(params[key]);
    if (fromParams) return fromParams;
    if (searchParams) return first(searchParams[key]);
    return null;
  };

  return {
    id: get('id') ?? get('name'),
    site: get('site') ?? get('linked_site'),
    project: get('project') ?? get('linked_project'),
    tender: get('tender') ?? get('linked_tender'),
  };
}

// ── Derived labels ─────────────────────────────────────────────────────────

/**
 * Human-readable breadcrumb-style label from a resolved context.
 *
 * Examples:
 *  - `"Project ABC / Site 01"`
 *  - `"Tender T-100"` (if only tender is present)
 *  - `"(no context)"` (nothing resolvable)
 */
export function contextLabel(ctx: ResolvedContext | RouteContext): string {
  const parts: string[] = [];
  if ('tender' in ctx && ctx.tender) parts.push(ctx.tender);
  if ('project' in ctx && ctx.project) parts.push(ctx.project);
  if ('site' in ctx && ctx.site) parts.push(ctx.site);

  return parts.length ? parts.join(' / ') : '(no context)';
}

// ── Relink helpers ─────────────────────────────────────────────────────────

/**
 * True when a record should show a "needs relink" badge or warning.
 */
export function isRelinkNeeded(record: SpineFields): boolean {
  return !normalise(record.linked_site) && !!normalise(record.site_name);
}

/**
 * Stable lookup key for legacy records that might only have `site_name`.
 *
 * If a proper `linked_site` exists, use it.
 * Otherwise fall back to a lower-cased `site_name` prefixed with `legacy::`.
 */
export function siteKey(record: SpineFields): string {
  const linked = normalise(record.linked_site);
  if (linked) return linked;
  const name = normalise(record.site_name);
  return name ? `legacy::${name.toLowerCase()}` : '';
}

// ── Parameter filter builder ───────────────────────────────────────────────

/**
 * Build API query-string params from a resolved context.
 *
 * Only includes non-null values.
 * Useful for constructing `/api/xxx?project=...&site=...` URLs.
 */
export function contextToParams(ctx: ResolvedContext | RouteContext): Record<string, string> {
  const out: Record<string, string> = {};
  if (ctx.site) out.site = ctx.site;
  if (ctx.project) out.project = ctx.project;
  if (ctx.tender) out.tender = ctx.tender;
  return out;
}

/**
 * Append context params to a URL path.
 *
 * ```ts
 * contextUrl('/api/surveys', ctx) // "/api/surveys?project=ABC&site=S1"
 * ```
 */
export function contextUrl(
  basePath: string,
  ctx: ResolvedContext | RouteContext,
  extra?: Record<string, string>,
): string {
  const merged = { ...contextToParams(ctx), ...extra };
  const qs = new URLSearchParams(merged).toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

// ── Internal helpers ───────────────────────────────────────────────────────

function normalise(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function first(value: string | string[] | undefined): string | null {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  return normalise(raw);
}
