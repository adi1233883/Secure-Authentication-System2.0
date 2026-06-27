const reportService = require('../services/report.service');

async function securityReport(req, res, next) {
  try {
    await reportService.streamUserSecurityReport(req.user.id, res);
  } catch (err) {
    next(err);
  }
}

async function loginActivityExport(req, res, next) {
  try {
    await reportService.streamLoginActivityCsv(req.user.id, res);
  } catch (err) {
    next(err);
  }
}

async function adminFullReport(req, res, next) {
  try {
    await reportService.streamAdminFullReport(res);
  } catch (err) {
    next(err);
  }
}

module.exports = { securityReport, loginActivityExport, adminFullReport };
