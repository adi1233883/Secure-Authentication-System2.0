// Report service — generates PDF security reports using PDFKit.
// PDFKit streams a PDF directly to an HTTP response (or file/buffer), which
// is the standard approach for on-demand, data-driven PDFs in a Node app.

const PDFDocument = require('pdfkit');
const userModel = require('../models/user.model');
const loginLogModel = require('../models/loginLog.model');
const alertModel = require('../models/alert.model');

const COLORS = {
  heading: '#0B0F19',
  accent: '#3B82F6',
  text: '#1f2937',
  muted: '#6b7280',
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#d97706',
};

function scoreLabel(score) {
  if (score == null) return 'Not set';
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Strong';
  if (score >= 40) return 'Fair';
  return 'Weak';
}

function statusColor(status) {
  if (status === 'success') return COLORS.success;
  if (status === 'failed_locked') return COLORS.danger;
  return COLORS.warning;
}

function drawHeader(doc, title, subtitle) {
  doc.fillColor(COLORS.heading).fontSize(20).font('Helvetica-Bold').text(title, { align: 'left' });
  doc.fillColor(COLORS.muted).fontSize(10).font('Helvetica').text(subtitle, { align: 'left' });
  doc.moveDown(0.5);
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(doc.x, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);
}

function drawSectionTitle(doc, text) {
  doc.moveDown(0.5);
  doc.fillColor(COLORS.accent).fontSize(13).font('Helvetica-Bold').text(text);
  doc.moveDown(0.3);
}

function drawKeyValue(doc, label, value) {
  doc.fillColor(COLORS.muted).fontSize(10).font('Helvetica').text(label, { continued: true });
  doc.fillColor(COLORS.text).font('Helvetica-Bold').text(`  ${value}`);
}

/**
 * Streams a per-user security report PDF directly to an Express response.
 */
async function streamUserSecurityReport(userId, res) {
  const user = await userModel.findById(userId);
  const recentLogins = await loginLogModel.findByUser(userId, { limit: 15 });
  const alerts = await alertModel.findByUser(userId, { limit: 10 });

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="security-report-${user.id}.pdf"`);
  doc.pipe(res);

  drawHeader(doc, 'Personal Security Report', `Generated on ${new Date().toLocaleString()}`);

  drawSectionTitle(doc, 'Account Information');
  drawKeyValue(doc, 'Name:', user.full_name);
  drawKeyValue(doc, 'Email:', user.email);
  drawKeyValue(doc, 'Role:', user.role);
  drawKeyValue(doc, 'Email Verified:', user.is_verified ? 'Yes' : 'No');
  drawKeyValue(doc, 'Member Since:', new Date(user.created_at).toLocaleDateString());
  doc.moveDown(0.5);

  drawSectionTitle(doc, 'Security Score Summary');
  drawKeyValue(doc, 'Password Strength Score:', `${user.password_score ?? 'N/A'} / 100 (${scoreLabel(user.password_score)})`);
  drawKeyValue(doc, 'Last Login:', user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'N/A');
  drawKeyValue(doc, 'Last Login IP:', user.last_login_ip || 'N/A');
  doc.moveDown(0.5);

  drawSectionTitle(doc, 'Recent Login History');
  if (recentLogins.length === 0) {
    doc.fillColor(COLORS.muted).fontSize(10).text('No login history available.');
  } else {
    recentLogins.forEach((log) => {
      doc.fillColor(statusColor(log.status)).fontSize(9).font('Helvetica-Bold').text(`${log.status.replace(/_/g, ' ').toUpperCase()}`, { continued: true });
      doc.fillColor(COLORS.text).font('Helvetica').text(`  —  ${new Date(log.created_at).toLocaleString()}  —  IP: ${log.ip_address}${log.is_suspicious ? '  [SUSPICIOUS]' : ''}`);
    });
  }
  doc.moveDown(0.5);

  drawSectionTitle(doc, 'Security Alerts');
  if (alerts.length === 0) {
    doc.fillColor(COLORS.muted).fontSize(10).text('No security alerts on record.');
  } else {
    alerts.forEach((alert) => {
      doc.fillColor(COLORS.text).fontSize(9).font('Helvetica-Bold').text(`[${alert.severity.toUpperCase()}] ${alert.alert_type.replace(/_/g, ' ')}`);
      doc.fillColor(COLORS.muted).font('Helvetica').text(`${alert.message} (${new Date(alert.created_at).toLocaleString()})`);
      doc.moveDown(0.2);
    });
  }

  doc.moveDown(1);
  doc.fillColor(COLORS.muted).fontSize(8).text('This report was generated automatically by the Secure Authentication System.', { align: 'center' });

  doc.end();
}

/**
 * Streams a CSV export of full login history (lighter-weight alternative
 * to a PDF for raw data — easy to open in Excel/Sheets).
 */
async function streamLoginActivityCsv(userId, res) {
  const logs = await loginLogModel.findByUser(userId, { limit: 1000 });

  const header = 'Date,Status,IP Address,User Agent,Suspicious\n';
  const rows = logs
    .map((l) => [
      new Date(l.created_at).toISOString(),
      l.status,
      l.ip_address,
      `"${(l.user_agent || '').replace(/"/g, '""')}"`,
      l.is_suspicious ? 'Yes' : 'No',
    ].join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="login-activity-${userId}.csv"`);
  res.send(header + rows);
}

/**
 * Admin-only: org-wide PDF report covering all users and incidents.
 */
async function streamAdminFullReport(res) {
  const totalUsers = await userModel.countAll();
  const lockedAccounts = await userModel.countLocked();
  const recentLogs = await loginLogModel.findAll({ limit: 30 });

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="organization-security-report.pdf"');
  doc.pipe(res);

  drawHeader(doc, 'Organization Security Report', `Generated on ${new Date().toLocaleString()}`);

  drawSectionTitle(doc, 'Overview');
  drawKeyValue(doc, 'Total Users:', totalUsers);
  drawKeyValue(doc, 'Currently Locked Accounts:', lockedAccounts);
  doc.moveDown(0.5);

  drawSectionTitle(doc, 'Recent Login Activity (most recent 30)');
  recentLogs.forEach((log) => {
    doc.fillColor(statusColor(log.status)).fontSize(9).font('Helvetica-Bold').text(`${log.status.replace(/_/g, ' ').toUpperCase()}`, { continued: true });
    doc.fillColor(COLORS.text).font('Helvetica').text(`  —  ${log.email_attempted}  —  ${new Date(log.created_at).toLocaleString()}  —  IP: ${log.ip_address}${log.is_suspicious ? '  [SUSPICIOUS]' : ''}`);
  });

  doc.moveDown(1);
  doc.fillColor(COLORS.muted).fontSize(8).text('This report was generated automatically by the Secure Authentication System.', { align: 'center' });

  doc.end();
}

module.exports = { streamUserSecurityReport, streamLoginActivityCsv, streamAdminFullReport };
