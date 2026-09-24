/**
 * Best-effort notify for the Double Yellow club website to refresh
 * RacketPoint-backed store prices after Admin catalog writes.
 */
export async function notifyClubSiteCatalogChanged(reason: string) {
  const url = (process.env.CLUB_SITE_REVALIDATE_URL ?? '').trim();
  const secret = (process.env.CLUB_SITE_REVALIDATE_SECRET ?? '').trim();

  if (!url || !secret) {
    return { skipped: true as const, reason: 'CLUB_SITE_REVALIDATE_URL/SECRET not configured' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason, source: 'racketpoint' }),
    });

    if (!response.ok) {
      return { skipped: false as const, ok: false as const, status: response.status };
    }

    return { skipped: false as const, ok: true as const, status: response.status };
  } catch (error) {
    return {
      skipped: false as const,
      ok: false as const,
      error: error instanceof Error ? error.message : 'Club site notify failed',
    };
  }
}
