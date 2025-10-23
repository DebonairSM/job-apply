import { getJobsByStatus, updateJobStatus, Job } from '../lib/db.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface CategoryScores {
  coreAzure: number;
  security: number;
  eventDriven: number;
  performance: number;
  devops: number;
  seniority: number;
}

export async function reportCommand(): Promise<void> {
  console.log('📊 Generating job report...\n');

  const jobs = getJobsByStatus('queued');

  if (jobs.length === 0) {
    console.log('⚠️  No queued jobs found to report on.\n');
    return;
  }

  console.log(`   Found ${jobs.length} queued jobs\n`);

  // Generate HTML report
  const html = generateHTML(jobs);

  // Create reports directory if it doesn't exist
  const reportsDir = join(process.cwd(), 'reports');
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `job-report-${timestamp}.html`;
  const filepath = join(reportsDir, filename);

  // Save HTML file
  writeFileSync(filepath, html, 'utf-8');

  // Update job statuses to 'reported'
  for (const job of jobs) {
    updateJobStatus(job.id, 'reported');
  }

  console.log(`✅ Report generated: ${filepath}`);
  console.log(`   Updated ${jobs.length} jobs to 'reported' status\n`);
}

function parseRelativeDate(postedDate: string): number {
  // Convert relative dates like "1 day ago", "2 weeks ago" to timestamps for sorting
  // More recent = higher number (for descending sort)
  const now = Date.now();
  const text = postedDate.toLowerCase();
  
  if (text.includes('just now') || text.includes('minute')) {
    return now;
  }
  if (text.includes('hour')) {
    const hours = parseInt(text) || 1;
    return now - (hours * 60 * 60 * 1000);
  }
  if (text.includes('day')) {
    const days = parseInt(text) || 1;
    return now - (days * 24 * 60 * 60 * 1000);
  }
  if (text.includes('week')) {
    const weeks = parseInt(text) || 1;
    return now - (weeks * 7 * 24 * 60 * 60 * 1000);
  }
  if (text.includes('month')) {
    const months = parseInt(text) || 1;
    return now - (months * 30 * 24 * 60 * 60 * 1000);
  }
  return 0; // Unknown date goes to bottom
}

function generateHTML(jobs: Job[]): string {
  const reportDate = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Sort jobs by posted date (newest first), then by rank (highest first)
  const sortedJobs = [...jobs].sort((a, b) => {
    const dateA = parseRelativeDate(a.posted_date || '');
    const dateB = parseRelativeDate(b.posted_date || '');
    
    // First sort by date (newest first)
    if (dateB !== dateA) {
      return dateB - dateA;
    }
    
    // Then by rank (highest first)
    return (b.rank || 0) - (a.rank || 0);
  });

  const jobRows = sortedJobs.map((job, index) => {
    const categoryScores: CategoryScores = job.category_scores 
      ? JSON.parse(job.category_scores) 
      : { coreAzure: 0, security: 0, eventDriven: 0, performance: 0, devops: 0, seniority: 0 };
    
    const fitReasons: string[] = job.fit_reasons ? JSON.parse(job.fit_reasons) : [];
    const mustHaves: string[] = job.must_haves ? JSON.parse(job.must_haves) : [];
    const blockers: string[] = job.blockers ? JSON.parse(job.blockers) : [];
    const missingKeywords: string[] = job.missing_keywords ? JSON.parse(job.missing_keywords) : [];

    const rankColor = getRankColor(job.rank || 0);
    const typeLabel = job.easy_apply ? 'Easy Apply' : 'External';
    const typeBadge = job.easy_apply 
      ? '<span class="badge badge-easy">Easy Apply</span>' 
      : '<span class="badge badge-external">External</span>';

    return `
      <tr>
        <td data-rank="${job.rank || 0}" data-posted="${job.posted_date || ''}">${index + 1}</td>
        <td>
          <div class="job-title">${escapeHtml(job.title)}</div>
          <div class="job-company">${escapeHtml(job.company)}</div>
          ${job.posted_date ? `<div class="job-posted">Posted: ${escapeHtml(job.posted_date)}</div>` : ''}
        </td>
        <td class="rank-cell">
          <span class="rank-badge" style="background-color: ${rankColor};">${job.rank || 0}</span>
        </td>
        <td>${typeBadge}</td>
        <td>
          <div class="scores-grid">
            <div class="score-item">
              <span class="score-label">Azure:</span>
              <span class="score-value">${categoryScores.coreAzure}</span>
            </div>
            <div class="score-item">
              <span class="score-label">Security:</span>
              <span class="score-value">${categoryScores.security}</span>
            </div>
            <div class="score-item">
              <span class="score-label">Events:</span>
              <span class="score-value">${categoryScores.eventDriven}</span>
            </div>
            <div class="score-item">
              <span class="score-label">Perf:</span>
              <span class="score-value">${categoryScores.performance}</span>
            </div>
            <div class="score-item">
              <span class="score-label">DevOps:</span>
              <span class="score-value">${categoryScores.devops}</span>
            </div>
            <div class="score-item">
              <span class="score-label">Senior:</span>
              <span class="score-value">${categoryScores.seniority}</span>
            </div>
          </div>
        </td>
        <td>
          <div class="details-section">
            ${fitReasons.length > 0 ? `
              <div class="detail-item">
                <strong>Why Good Match:</strong>
                <ul>
                  ${fitReasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            ${mustHaves.length > 0 ? `
              <div class="detail-item">
                <strong>Must-Haves Found:</strong>
                <ul>
                  ${mustHaves.map(m => `<li>${escapeHtml(m)}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            ${blockers.length > 0 ? `
              <div class="detail-item warning">
                <strong>Blockers:</strong>
                <ul>
                  ${blockers.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            ${missingKeywords.length > 0 ? `
              <div class="detail-item">
                <strong>Missing Keywords:</strong>
                <div class="keywords">${missingKeywords.map(k => `<span class="keyword">${escapeHtml(k)}</span>`).join('')}</div>
              </div>
            ` : ''}
          </div>
        </td>
        <td class="link-cell">
          <a href="${escapeHtml(job.url)}" target="_blank" class="job-link">View Job</a>
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Application Report - ${reportDate}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .header {
      border-bottom: 3px solid #0066cc;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    h1 {
      color: #0066cc;
      font-size: 28px;
      margin-bottom: 10px;
    }

    .report-info {
      color: #666;
      font-size: 14px;
    }

    .summary {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 25px;
      display: flex;
      gap: 30px;
      flex-wrap: wrap;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
    }

    .summary-label {
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-value {
      font-size: 24px;
      font-weight: bold;
      color: #0066cc;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    thead {
      background-color: #0066cc;
      color: white;
    }

    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      position: relative;
      color: white;
      background-color: #0066cc;
    }

    th:hover {
      background-color: #0052a3;
      color: white !important;
    }

    th[onclick]::after {
      content: ' ↕';
      opacity: 0.7;
      font-size: 12px;
      margin-left: 4px;
    }
    
    th[onclick]:hover::after {
      opacity: 1;
    }

    td {
      padding: 15px 12px;
      border-bottom: 1px solid #e0e0e0;
      vertical-align: top;
    }

    tr:hover {
      background-color: #f8f9fa;
    }

    tr:hover .job-title {
      color: #333 !important;
    }

    tr:hover .job-company {
      color: #666 !important;
    }

    tr:hover .job-posted {
      color: #6c757d !important;
    }

    tr:hover .score-label {
      color: #666 !important;
    }

    tr:hover .score-value {
      color: #333 !important;
    }

    tr:hover .detail-item strong {
      color: #333 !important;
    }

    tr:hover .detail-item li {
      color: #555 !important;
    }

    tr:hover .keyword {
      color: #495057 !important;
      background-color: #f8f9fa !important;
    }

    .job-title {
      font-weight: 600;
      font-size: 16px;
      color: #333;
      margin-bottom: 4px;
    }

    .job-company {
      color: #666;
      font-size: 14px;
    }

    .job-posted {
      color: #6c757d;
      font-size: 12px;
      margin-top: 4px;
      font-weight: 500;
    }

    .rank-cell {
      text-align: center;
    }

    .rank-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      font-size: 14px;
    }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-easy {
      background-color: #28a745;
      color: white;
    }

    .badge-external {
      background-color: #6c757d;
      color: white;
    }

    .scores-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      font-size: 13px;
    }

    .score-item {
      display: flex;
      justify-content: space-between;
      padding: 4px 8px;
      background-color: #f8f9fa;
      border-radius: 4px;
    }

    .score-label {
      color: #666;
      font-weight: 500;
    }

    .score-value {
      font-weight: bold;
      color: #333;
    }

    .details-section {
      font-size: 13px;
    }

    .detail-item {
      margin-bottom: 12px;
    }

    .detail-item:last-child {
      margin-bottom: 0;
    }

    .detail-item strong {
      display: block;
      margin-bottom: 4px;
      color: #333;
    }

    .detail-item ul {
      margin-left: 20px;
      margin-top: 4px;
    }

    .detail-item li {
      margin-bottom: 2px;
      color: #555;
    }

    .detail-item.warning {
      color: #721c24;
      background-color: #f8d7da;
      padding: 8px;
      border-radius: 4px;
      border-left: 4px solid #dc3545;
    }

    .detail-item.warning strong {
      color: #721c24;
    }

    .keywords {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }

    .keyword {
      background-color: #f8f9fa;
      color: #495057;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
      border: 1px solid #dee2e6;
    }

    .link-cell {
      text-align: center;
    }

    .job-link {
      display: inline-block;
      padding: 8px 16px;
      background-color: #0066cc;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      transition: background-color 0.2s;
    }

    .job-link:hover {
      background-color: #0052a3;
    }

    .footer {
      text-align: center;
      color: #666;
      font-size: 13px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }

    @media print {
      body {
        background-color: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
        padding: 20px;
      }
      
      .job-link {
        background-color: #0066cc !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      tr {
        page-break-inside: avoid;
      }
    }

    @media (max-width: 1200px) {
      .scores-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Job Application Report</h1>
      <div class="report-info">Generated on ${reportDate}</div>
    </div>

    <div class="summary">
      <div class="summary-item">
        <span class="summary-label">Total Jobs</span>
        <span class="summary-value">${jobs.length}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Easy Apply</span>
        <span class="summary-value">${jobs.filter(j => j.easy_apply).length}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">External</span>
        <span class="summary-value">${jobs.filter(j => !j.easy_apply).length}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Avg Score</span>
        <span class="summary-value">${Math.round(jobs.reduce((sum, j) => sum + (j.rank || 0), 0) / jobs.length)}</span>
      </div>
    </div>

    <table id="jobsTable">
      <thead>
        <tr>
          <th onclick="sortTable(0)">#</th>
          <th onclick="sortTable(1)">Job</th>
          <th onclick="sortTable(2)">Rank</th>
          <th onclick="sortTable(3)">Type</th>
          <th>Category Scores</th>
          <th>Details</th>
          <th>Link</th>
        </tr>
      </thead>
      <tbody>
        ${jobRows}
      </tbody>
    </table>

    <div class="footer">
      <p>This report contains ${jobs.length} job opportunities matched to your profile.</p>
      <p>Jobs are sorted by posted date (newest first), then by rank score.</p>
      <p><strong>Note:</strong> Posted dates will only appear for jobs found in recent searches (last 24 hours by default).</p>
      <p>All jobs have been marked as 'reported' in the database.</p>
    </div>
  </div>

  <script>
    function sortTable(columnIndex) {
      const table = document.getElementById('jobsTable');
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      
      // Determine sort direction
      const currentDirection = table.dataset.sortDirection || 'asc';
      const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
      table.dataset.sortDirection = newDirection;
      
      rows.sort((a, b) => {
        let aValue, bValue;
        
        if (columnIndex === 0) {
          // Number column
          aValue = parseInt(a.cells[0].textContent);
          bValue = parseInt(b.cells[0].textContent);
        } else if (columnIndex === 1) {
          // Job title
          aValue = a.cells[1].querySelector('.job-title').textContent.toLowerCase();
          bValue = b.cells[1].querySelector('.job-title').textContent.toLowerCase();
        } else if (columnIndex === 2) {
          // Rank
          aValue = parseInt(a.cells[0].dataset.rank);
          bValue = parseInt(b.cells[0].dataset.rank);
        } else if (columnIndex === 3) {
          // Type
          aValue = a.cells[3].textContent;
          bValue = b.cells[3].textContent;
        }
        
        if (newDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
      
      // Re-append rows in new order
      rows.forEach(row => tbody.appendChild(row));
      
      // Update row numbers
      rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
      });
    }
  </script>
</body>
</html>`;
}

function getRankColor(rank: number): string {
  if (rank >= 80) return '#28a745'; // Green
  if (rank >= 60) return '#17a2b8'; // Blue
  if (rank >= 40) return '#ffc107'; // Yellow
  return '#dc3545'; // Red
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

