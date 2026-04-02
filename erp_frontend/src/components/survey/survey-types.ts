/**
 * Shared types and helpers for Survey pages.
 *
 * Used by both /survey (PM-scoped) and /engineering/survey (engineering-scoped).
 */

import type { SpineFields } from '@/lib/context';

// ── Domain types ───────────────────────────────────────────────────────────

export interface Survey extends SpineFields {
  name: string;
  coordinates?: string;
  surveyed_by?: string;
  survey_date?: string;
  summary?: string;
  status?: string;
  creation?: string;
  modified?: string;
  owner?: string;
  needs_site_relink?: boolean;
}

export interface SiteRecord {
  name: string;
  site_code?: string;
  site_name?: string;
  status?: string;
  linked_project?: string;
  linked_tender?: string;
}

export interface SiteSurveyRow {
  site: SiteRecord;
  latestSurvey: Survey | null;
}

export interface SurveyCreateForm {
  linked_site: string;
  linked_tender: string;
  site_name: string;
  status: string;
  survey_date: string;
  coordinates: string;
  summary: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

export const EMPTY_CREATE_FORM: SurveyCreateForm = {
  linked_site: '',
  linked_tender: '',
  site_name: '',
  status: 'Pending',
  survey_date: '',
  coordinates: '',
  summary: '',
};

export function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Map latest survey to each site by linked_site or legacy site_name key. */
export function buildSiteSurveyRows(sites: SiteRecord[], surveys: Survey[]): SiteSurveyRow[] {
  const latestBySite = new Map<string, Survey>();

  for (const survey of surveys) {
    const key = siteKeyFor(survey.linked_site, survey.site_name);
    const current = latestBySite.get(key);
    const stamp = new Date(survey.survey_date || survey.creation || 0).getTime();
    const currentStamp = current
      ? new Date(current.survey_date || current.creation || 0).getTime()
      : 0;
    if (!current || stamp >= currentStamp) {
      latestBySite.set(key, survey);
    }
  }

  return sites.map((site) => ({
    site,
    latestSurvey:
      latestBySite.get(siteKeyFor(site.name, site.site_name)) ||
      latestBySite.get(siteKeyFor(undefined, site.site_name)) ||
      null,
  }));
}

/** Compute stats from site-survey rows. */
export function computeSurveyStats(rows: SiteSurveyRow[]) {
  return rows.reduce(
    (acc, row) => {
      acc.total += 1;
      const status = row.latestSurvey?.status || 'Pending';
      if (status === 'Completed') acc.completed += 1;
      else if (status === 'In Progress') acc.inProgress += 1;
      else acc.pending += 1;
      return acc;
    },
    { total: 0, completed: 0, inProgress: 0, pending: 0 },
  );
}

/** Pre-fill the create form from a site record. */
export function prefillFromSite(site: SiteRecord): SurveyCreateForm {
  return {
    ...EMPTY_CREATE_FORM,
    linked_site: site.name,
    linked_tender: site.linked_tender || '',
    site_name: site.site_name || '',
  };
}

// ── Internal ───────────────────────────────────────────────────────────────

function siteKeyFor(linkedSite?: string | null, siteName?: string | null): string {
  return linkedSite || `legacy::${(siteName || '').trim().toLowerCase()}`;
}
