export interface ShortlistCsvRow {
  handle: string;
  name: string;
  city: string;
  state: string;
  niche: string;
  platform: string;
  email: string;
  followers: number;
  engagementRate: number;
  avgReelViews: number;
  assignedFeeINR: number | string;
  notes: string;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function generateShortlistCsv(rows: ShortlistCsvRow[]): string {
  const headers = [
    'Handle',
    'Creator Name',
    'Platform',
    'Niche',
    'City',
    'State',
    'Business Email',
    'Followers',
    'Engagement Rate (%)',
    'Avg Reel Views',
    'Assigned Fee (INR)',
    'Deliverable Notes'
  ];

  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map((r) =>
    [
      r.handle,
      r.name,
      r.platform,
      r.niche,
      r.city,
      r.state,
      r.email,
      r.followers,
      `${r.engagementRate}%`,
      r.avgReelViews,
      r.assignedFeeINR,
      r.notes
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  // Prepend UTF-8 BOM for clean formatting in Microsoft Excel and Windows apps
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}
