const prisma = require("../config/prisma");
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");

// Helper function to build PDF table
const buildPDF = (res, title, headers, colWidths, dataRows) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  doc.fontSize(20).text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(1.5);
  
  if (dataRows.length === 0) {
    doc.fontSize(12).text("No data available.", { align: 'center' });
    doc.end();
    return;
  }

  const tableTop = doc.y;
  let currentX = 30;
  doc.font('Helvetica-Bold').fontSize(10);
  headers.forEach((h, i) => {
    doc.text(h, currentX, tableTop, { width: colWidths[i] });
    currentX += colWidths[i] + 10;
  });
  
  let currentY = tableTop + 20;
  doc.font('Helvetica').fontSize(9);
  
  dataRows.forEach(row => {
    if (currentY > 500) {
      doc.addPage();
      currentY = 30;
    }
    currentX = 30;
    row.forEach((text, i) => {
      doc.text(String(text || '-'), currentX, currentY, { width: colWidths[i] });
      currentX += colWidths[i] + 10;
    });
    currentY += 20;
  });

  doc.end();
};

const sendExcel = (res, filename, sheetName, data) => {
  if (data.length === 0) {
    data = [{ Message: "No data available" }];
  }
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  res.send(buffer);
};

exports.exportPlanningExcel = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { businessId: req.business.id },
      include: { customer: true, projectManager: true }
    });
    const data = projects.map(p => ({
      "Project Code": p.projectCode,
      "Name": p.projectName,
      "Customer": p.customer?.name || p.customer?.company || 'N/A',
      "Manager": p.projectManager?.name || 'N/A',
      "Status": p.status,
      "Priority": p.priority,
      "Budget": p.budget,
      "Progress": `${p.completionPercentage || 0}%`,
      "Start Date": p.startDate ? new Date(p.startDate).toLocaleDateString() : '-',
      "End Date": p.endDate ? new Date(p.endDate).toLocaleDateString() : '-'
    }));
    sendExcel(res, "Planning", "Global_Plan", data);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportPlanningPDF = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { businessId: req.business.id },
      include: { customer: true, projectManager: true }
    });
    const headers = ['Code', 'Project Name', 'Customer', 'Manager', 'Status', 'Budget', 'Progress'];
    const widths = [60, 150, 120, 100, 70, 70, 60];
    const rows = projects.map(p => [
      p.projectCode, p.projectName, p.customer?.name || p.customer?.company || '-', p.projectManager?.name || '-',
      p.status, `$${(p.budget || 0).toLocaleString()}`, `${p.completionPercentage || 0}%`
    ]);
    res.setHeader('Content-Disposition', `attachment; filename=Planning_${new Date().toISOString().split('T')[0]}.pdf`);
    buildPDF(res, 'Global Planning Report', headers, widths, rows);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportTasksExcel = async (req, res) => {
  try {
    const tasks = await prisma.projectTask.findMany({
      where: { businessId: req.business.id },
      include: { project: true, assignee: true }
    });
    const data = tasks.map(t => ({
      "Code": t.taskCode,
      "Task": t.title,
      "Project": t.project?.projectName,
      "Assignee": t.assignee?.name,
      "Status": t.status,
      "Priority": t.priority,
      "Due": t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'
    }));
    sendExcel(res, "Tasks", "Tasks", data);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportTasksPDF = async (req, res) => {
  try {
    const tasks = await prisma.projectTask.findMany({
      where: { businessId: req.business.id },
      include: { project: true, assignee: true }
    });
    const headers = ['Code', 'Task', 'Project', 'Assignee', 'Status', 'Priority', 'Due'];
    const widths = [60, 150, 120, 100, 70, 70, 70];
    const rows = tasks.map(t => [
      t.taskCode, t.title, t.project?.projectName, t.assignee?.name, t.status, t.priority, t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'
    ]);
    res.setHeader('Content-Disposition', `attachment; filename=Tasks_${new Date().toISOString().split('T')[0]}.pdf`);
    buildPDF(res, 'Project Tasks Report', headers, widths, rows);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportMilestonesExcel = async (req, res) => {
  try {
    const milestones = await prisma.projectMilestone.findMany({
      where: { businessId: req.business.id },
      include: { project: true, owner: true }
    });
    const data = milestones.map(m => ({
      "Milestone": m.title,
      "Project": m.project?.projectName,
      "Owner": m.owner?.name,
      "Status": m.status,
      "Target Date": m.targetDate ? new Date(m.targetDate).toLocaleDateString() : '-'
    }));
    sendExcel(res, "Milestones", "Milestones", data);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportMilestonesPDF = async (req, res) => {
  try {
    const milestones = await prisma.projectMilestone.findMany({
      where: { businessId: req.business.id },
      include: { project: true, owner: true }
    });
    const headers = ['Milestone', 'Project', 'Owner', 'Status', 'Target Date'];
    const widths = [200, 150, 120, 100, 100];
    const rows = milestones.map(m => [
      m.title, m.project?.projectName, m.owner?.name, m.status, m.targetDate ? new Date(m.targetDate).toLocaleDateString() : '-'
    ]);
    res.setHeader('Content-Disposition', `attachment; filename=Milestones_${new Date().toISOString().split('T')[0]}.pdf`);
    buildPDF(res, 'Project Milestones Report', headers, widths, rows);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportTimesheetsExcel = async (req, res) => {
  try {
    const timesheets = await prisma.timeEntry.findMany({
      where: { businessId: req.business.id },
      include: { project: { include: { projectManager: true } }, task: true, employee: true }
    });
    const data = timesheets.map(ts => ({
      "Employee": ts.employee?.name || ts.employee?.firstName || 'Unknown',
      "Department": ts.employee?.department || '-',
      "Project": ts.project?.projectName || '-',
      "Task": ts.task?.title || '-',
      "Date": ts.date ? new Date(ts.date).toLocaleDateString() : '-',
      "Hours": ts.hours,
      "Overtime": ts.overtime || 0,
      "Billable": ts.billable ? 'Yes' : 'No',
      "Manager": ts.project?.projectManager?.name || 'Unassigned',
      "Status": ts.status
    }));
    sendExcel(res, "Timesheets", "Timesheets", data);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportTimesheetsPDF = async (req, res) => {
  try {
    const timesheets = await prisma.timeEntry.findMany({
      where: { businessId: req.business.id },
      include: { project: { include: { projectManager: true } }, task: true, employee: true }
    });
    const headers = ['Employee', 'Project', 'Task', 'Date', 'Hrs', 'OT', 'Billable', 'Manager', 'Status'];
    const widths = [90, 100, 100, 60, 30, 30, 40, 70, 60];
    const rows = timesheets.map(ts => [
      ts.employee?.name || ts.employee?.firstName || 'Unknown',
      ts.project?.projectName || '-',
      ts.task?.title || '-',
      ts.date ? new Date(ts.date).toLocaleDateString() : '-',
      ts.hours,
      ts.overtime || 0,
      ts.billable ? 'Yes' : 'No',
      ts.project?.projectManager?.name || '-',
      ts.status
    ]);
    res.setHeader('Content-Disposition', `attachment; filename=Timesheets_${new Date().toISOString().split('T')[0]}.pdf`);
    buildPDF(res, 'Timesheets Report', headers, widths, rows);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportIssuesExcel = async (req, res) => {
  try {
    const issues = await prisma.projectIssue.findMany({
      where: { businessId: req.business.id },
      include: { project: true, assignee: true, reporter: true }
    });
    const data = issues.map(iss => ({
      "Issue Code": iss.issueCode || '-',
      "Title": iss.title,
      "Project": iss.project?.projectName || '-',
      "Module": iss.module || '-',
      "Reported By": iss.reporter?.name || iss.reporter?.firstName || '-',
      "Assigned To": iss.assignee?.name || iss.assignee?.firstName || '-',
      "Severity": iss.severity || '-',
      "Priority": iss.priority || '-',
      "Status": iss.status,
      "Created Date": iss.createdAt ? new Date(iss.createdAt).toLocaleDateString() : '-',
      "Due Date": iss.dueDate ? new Date(iss.dueDate).toLocaleDateString() : '-'
    }));
    sendExcel(res, "Issues", "Issues", data);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportIssuesPDF = async (req, res) => {
  try {
    const issues = await prisma.projectIssue.findMany({
      where: { businessId: req.business.id },
      include: { project: true, assignee: true, reporter: true }
    });
    const headers = ['Code', 'Title', 'Project', 'Reporter', 'Assignee', 'Sev', 'Priority', 'Status', 'Due Date'];
    const widths = [50, 100, 100, 70, 70, 40, 50, 60, 60];
    const rows = issues.map(iss => [
      iss.issueCode || '-',
      iss.title,
      iss.project?.projectName || '-',
      iss.reporter?.name || iss.reporter?.firstName || '-',
      iss.assignee?.name || iss.assignee?.firstName || '-',
      iss.severity || '-',
      iss.priority || '-',
      iss.status,
      iss.dueDate ? new Date(iss.dueDate).toLocaleDateString() : '-'
    ]);
    res.setHeader('Content-Disposition', `attachment; filename=Issues_${new Date().toISOString().split('T')[0]}.pdf`);
    buildPDF(res, 'Global Issues Report', headers, widths, rows);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportChangeRequestsExcel = async (req, res) => {
  try {
    const { search, projectId, customerId, priority, impact, status, approvalStatus } = req.query;
    
    let whereClause = { businessId: req.business.id };
    if (projectId) whereClause.projectId = projectId;
    if (priority) whereClause.priority = { equals: priority, mode: 'insensitive' };
    if (impact) whereClause.impact = { equals: impact, mode: 'insensitive' };
    if (status) whereClause.status = { equals: status, mode: 'insensitive' };
    if (approvalStatus) whereClause.approvalStatus = { equals: approvalStatus, mode: 'insensitive' };
    
    if (search) {
      whereClause.OR = [
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // For customerId filtering, we need to filter via Project relation in Prisma
    if (customerId) {
      whereClause.project = { customerId };
    }

    const changeRequests = await prisma.projectChangeRequest.findMany({
      where: whereClause,
      include: { project: { include: { customer: true } }, requestedBy: true, assignedTo: true }
    });
    const data = changeRequests.map(cr => ({
      "Request No.": cr.requestNumber || '-',
      "Title": cr.title || '-',
      "Project": cr.project?.projectName || '-',
      "Customer": cr.project?.customer?.name || '-',
      "Requested By": cr.requestedBy?.name || cr.requestedBy?.firstName || '-',
      "Assigned To": cr.assignedTo?.name || cr.assignedTo?.firstName || '-',
      "Priority": cr.priority || '-',
      "Impact": cr.impact || '-',
      "Status": cr.status,
      "Approval Status": cr.approvalStatus || '-',
      "Requested Date": cr.createdAt ? new Date(cr.createdAt).toLocaleDateString() : '-',
      "Last Updated": cr.updatedAt ? new Date(cr.updatedAt).toLocaleDateString() : '-'
    }));
    sendExcel(res, "ChangeRequests", "ChangeRequests", data);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportChangeRequestsPDF = async (req, res) => {
  try {
    const { search, projectId, customerId, priority, impact, status, approvalStatus } = req.query;
    
    let whereClause = { businessId: req.business.id };
    if (projectId) whereClause.projectId = projectId;
    if (priority) whereClause.priority = { equals: priority, mode: 'insensitive' };
    if (impact) whereClause.impact = { equals: impact, mode: 'insensitive' };
    if (status) whereClause.status = { equals: status, mode: 'insensitive' };
    if (approvalStatus) whereClause.approvalStatus = { equals: approvalStatus, mode: 'insensitive' };
    
    if (search) {
      whereClause.OR = [
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (customerId) {
      whereClause.project = { customerId };
    }

    const changeRequests = await prisma.projectChangeRequest.findMany({
      where: whereClause,
      include: { project: true, requestedBy: true, assignedTo: true }
    });
    const headers = ['Req No', 'Title', 'Project', 'Requester', 'Priority', 'Status', 'Approval'];
    const widths = [60, 100, 100, 80, 60, 60, 80];
    const rows = changeRequests.map(cr => [
      cr.requestNumber || '-',
      cr.title || '-',
      cr.project?.projectName || '-',
      cr.requestedBy?.name || cr.requestedBy?.firstName || '-',
      cr.priority || '-',
      cr.status,
      cr.approvalStatus || '-'
    ]);
    res.setHeader('Content-Disposition', `attachment; filename=ChangeRequests_${new Date().toISOString().split('T')[0]}.pdf`);
    buildPDF(res, 'Change Requests Report', headers, widths, rows);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportBudgetsExcel = async (req, res) => {
  try {
    const { search, customerId, projectManagerId, department } = req.query;
    
    let whereClause = { businessId: req.business.id };
    if (customerId) whereClause.project = { customerId };
    if (projectManagerId) whereClause.project = { ...whereClause.project, projectManagerId };
    if (department) whereClause.department = { equals: department, mode: 'insensitive' };
    
    if (search) {
      whereClause.OR = [
        { budgetCode: { contains: search, mode: 'insensitive' } },
        { 'project.projectCode': { contains: search, mode: 'insensitive' } },
        { 'project.projectName': { contains: search, mode: 'insensitive' } }
      ];
    }

    const budgets = await prisma.projectBudget.findMany({
      where: whereClause,
      include: {
        project: {
          include: {
            expenses: { select: { amount: true, status: true } },
            purchaseOrders: { select: { totalAmount: true, status: true } }
          }
        },
        customer: true,
        projectManager: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const data = budgets.map(b => {
      const actualCost = b.project?.expenses?.filter(e => e.status === 'APPROVED' || e.status === 'PAID').reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const committedCost = b.project?.purchaseOrders?.filter(po => po.status !== 'CANCELLED').reduce((sum, po) => sum + (po.totalAmount || 0), 0) || 0;
      
      const utilized = actualCost + committedCost;
      const budget = b.approvedBudget || 0;
      const remaining = budget - utilized;
      const utilizationPercent = budget > 0 ? (utilized / budget) * 100 : 0;
      
      let computedStatus = b.status || "ACTIVE";
      if (budget > 0 && computedStatus !== 'COMPLETED') {
        if (utilizationPercent > 100) computedStatus = "OVER_BUDGET";
        else if (utilizationPercent >= 81) computedStatus = "AT_RISK";
        else computedStatus = "ON_TRACK";
      }

      return {
        "Budget Code": b.budgetCode || '-',
        "Project": b.project ? `${b.project.projectCode} - ${b.project.projectName}` : '-',
        "Customer": b.customer?.name || '-',
        "Manager": b.projectManager?.name || b.projectManager?.firstName || '-',
        "Department": b.department || '-',
        "Approved Budget": budget.toFixed(2),
        "Actual Cost": actualCost.toFixed(2),
        "Committed Cost": committedCost.toFixed(2),
        "Remaining": remaining.toFixed(2),
        "Variance": remaining.toFixed(2),
        "Utilization %": `${utilizationPercent.toFixed(2)}%`,
        "Status": computedStatus.replace('_', ' ')
      };
    });

    sendExcel(res, "Budgets", "Budgets", data);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportBudgetsPDF = async (req, res) => {
  try {
    const { search, customerId, projectManagerId, department } = req.query;
    
    let whereClause = { businessId: req.business.id };
    if (customerId) whereClause.project = { customerId };
    if (projectManagerId) whereClause.project = { ...whereClause.project, projectManagerId };
    if (department) whereClause.department = { equals: department, mode: 'insensitive' };
    
    if (search) {
      whereClause.OR = [
        { budgetCode: { contains: search, mode: 'insensitive' } },
        { 'project.projectCode': { contains: search, mode: 'insensitive' } },
        { 'project.projectName': { contains: search, mode: 'insensitive' } }
      ];
    }

    const budgets = await prisma.projectBudget.findMany({
      where: whereClause,
      include: {
        project: {
          include: {
            expenses: { select: { amount: true, status: true } },
            purchaseOrders: { select: { totalAmount: true, status: true } }
          }
        },
        customer: true,
        projectManager: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const headers = ['Budget Code', 'Project', 'Customer', 'Budget', 'Utilized', 'Remaining', 'Status'];
    const widths = [70, 100, 80, 60, 60, 60, 60];
    
    const rows = budgets.map(b => {
      const actualCost = b.project?.expenses?.filter(e => e.status === 'APPROVED' || e.status === 'PAID').reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const committedCost = b.project?.purchaseOrders?.filter(po => po.status !== 'CANCELLED').reduce((sum, po) => sum + (po.totalAmount || 0), 0) || 0;
      
      const utilized = actualCost + committedCost;
      const budget = b.approvedBudget || 0;
      const remaining = budget - utilized;
      const utilizationPercent = budget > 0 ? (utilized / budget) * 100 : 0;
      
      let computedStatus = b.status || "ACTIVE";
      if (budget > 0 && computedStatus !== 'COMPLETED') {
        if (utilizationPercent > 100) computedStatus = "OVER_BUDGET";
        else if (utilizationPercent >= 81) computedStatus = "AT_RISK";
        else computedStatus = "ON_TRACK";
      }

      return [
        b.budgetCode || '-',
        b.project?.projectName || '-',
        b.customer?.name || '-',
        budget.toFixed(2),
        utilized.toFixed(2),
        remaining.toFixed(2),
        computedStatus.replace('_', ' ')
      ];
    });

    res.setHeader('Content-Disposition', `attachment; filename=Budgets_${new Date().toISOString().split('T')[0]}.pdf`);
    buildPDF(res, 'Project Budgets Report', headers, widths, rows);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportExpensesExcel = async (req, res) => {
  try {
    const { search, projectId, employeeId, category, status } = req.query;
    
    let whereClause = { businessId: req.business.id };
    if (projectId) whereClause.projectId = projectId;
    if (employeeId) whereClause.employeeId = employeeId;
    if (category) whereClause.category = { equals: category, mode: 'insensitive' };
    if (status) whereClause.status = status;
    
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { 'project.projectName': { contains: search, mode: 'insensitive' } }
      ];
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        project: true,
        employee: true,
        vendor: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const data = expenses.map(e => ({
      "Title": e.title,
      "Project": e.project?.projectName || '-',
      "Employee": e.employee?.name || '-',
      "Vendor": e.vendor?.name || '-',
      "Category": e.category || '-',
      "Amount": (e.amount || 0).toFixed(2),
      "Date": e.date ? new Date(e.date).toLocaleDateString() : '-',
      "Status": e.status || 'Draft'
    }));

    sendExcel(res, "Expenses", "Expenses", data);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportExpensesPDF = async (req, res) => {
  try {
    const { search, projectId, employeeId, category, status } = req.query;
    
    let whereClause = { businessId: req.business.id };
    if (projectId) whereClause.projectId = projectId;
    if (employeeId) whereClause.employeeId = employeeId;
    if (category) whereClause.category = { equals: category, mode: 'insensitive' };
    if (status) whereClause.status = status;
    
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { 'project.projectName': { contains: search, mode: 'insensitive' } }
      ];
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        project: true,
        employee: true,
        vendor: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const headers = ['Title', 'Project', 'Employee', 'Category', 'Amount', 'Date', 'Status'];
    const widths = [100, 80, 80, 60, 50, 50, 60];
    
    const rows = expenses.map(e => [
      e.title,
      e.project?.projectName || '-',
      e.employee?.name || '-',
      e.category || '-',
      (e.amount || 0).toFixed(2),
      e.date ? new Date(e.date).toLocaleDateString() : '-',
      e.status || 'Draft'
    ]);

    res.setHeader('Content-Disposition', `attachment; filename=Expenses_${new Date().toISOString().split('T')[0]}.pdf`);
    buildPDF(res, 'Expenses Report', headers, widths, rows);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportBillingExcel = async (req, res) => {
  try {
    const { search, status, customerId } = req.query;
    let whereClause = { businessId: req.business.id, isDeleted: false };
    if (status) whereClause.status = status;
    if (customerId) whereClause.customerId = customerId;
    if (search) {
      whereClause.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { 'customer.name': { contains: search, mode: 'insensitive' } },
        { 'project.projectName': { contains: search, mode: 'insensitive' } }
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: { customer: true, project: true },
      orderBy: { createdAt: 'desc' }
    });

    const data = invoices.map(i => ({
      "Invoice #": i.invoiceNumber,
      "Customer": i.customer?.name || '-',
      "Project": i.project?.projectName || '-',
      "Date": i.invoiceDate ? new Date(i.invoiceDate).toLocaleDateString() : '-',
      "Due Date": i.dueDate ? new Date(i.dueDate).toLocaleDateString() : '-',
      "Amount": (i.grandTotal || 0).toFixed(2),
      "Status": i.status
    }));

    sendExcel(res, "Billing", "Invoices", data);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportBillingPDF = async (req, res) => {
  try {
    const { search, status, customerId } = req.query;
    let whereClause = { businessId: req.business.id, isDeleted: false };
    if (status) whereClause.status = status;
    if (customerId) whereClause.customerId = customerId;
    if (search) {
      whereClause.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { 'customer.name': { contains: search, mode: 'insensitive' } },
        { 'project.projectName': { contains: search, mode: 'insensitive' } }
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: { customer: true, project: true },
      orderBy: { createdAt: 'desc' }
    });

    const headers = ['Invoice #', 'Customer', 'Project', 'Date', 'Amount', 'Status'];
    const widths = [80, 100, 100, 70, 70, 70];
    const rows = invoices.map(i => [
      i.invoiceNumber,
      i.customer?.name || '-',
      i.project?.projectName || '-',
      i.invoiceDate ? new Date(i.invoiceDate).toLocaleDateString() : '-',
      (i.grandTotal || 0).toFixed(2),
      i.status
    ]);

    res.setHeader('Content-Disposition', `attachment; filename=Billing_${new Date().toISOString().split('T')[0]}.pdf`);
    buildPDF(res, 'Billing Report', headers, widths, rows);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportProfitabilityExcel = async (req, res) => {
  try {
    const { search } = req.query;
    let whereClause = { businessId: req.business.id };
    if (search) {
      whereClause.OR = [
        { projectName: { contains: search, mode: 'insensitive' } },
        { projectCode: { contains: search, mode: 'insensitive' } }
      ];
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: { customer: true, projectManager: true },
      orderBy: { createdAt: 'desc' }
    });

    const data = projects.map(p => {
      const revenue = p.collectedRevenue || 0;
      const cost = p.actualCost || 0;
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      let health = "Healthy";
      if (margin < 0) health = "Loss";
      else if (margin <= 15) health = "Critical";
      else if (margin <= 30) health = "Warning";
      
      return {
        "Project": p.projectName,
        "Customer": p.customer?.name || '-',
        "Manager": p.projectManager?.name || '-',
        "Revenue": revenue.toFixed(2),
        "Cost": cost.toFixed(2),
        "Gross Profit": profit.toFixed(2),
        "Margin %": margin.toFixed(2) + '%',
        "Health": health
      };
    });

    sendExcel(res, "Profitability", "Profitability", data);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportProfitabilityPDF = async (req, res) => {
  try {
    const { search } = req.query;
    let whereClause = { businessId: req.business.id };
    if (search) {
      whereClause.OR = [
        { projectName: { contains: search, mode: 'insensitive' } },
        { projectCode: { contains: search, mode: 'insensitive' } }
      ];
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: { customer: true, projectManager: true },
      orderBy: { createdAt: 'desc' }
    });

    const headers = ['Project', 'Customer', 'Revenue', 'Cost', 'Profit', 'Margin', 'Health'];
    const widths = [100, 80, 60, 60, 60, 50, 60];
    
    const rows = projects.map(p => {
      const revenue = p.collectedRevenue || 0;
      const cost = p.actualCost || 0;
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      let health = "Healthy";
      if (margin < 0) health = "Loss";
      else if (margin <= 15) health = "Critical";
      else if (margin <= 30) health = "Warning";
      
      return [
        p.projectName,
        p.customer?.name || '-',
        revenue.toFixed(2),
        cost.toFixed(2),
        profit.toFixed(2),
        margin.toFixed(2) + '%',
        health
      ];
    });

    res.setHeader('Content-Disposition', `attachment; filename=Profitability_${new Date().toISOString().split('T')[0]}.pdf`);
    buildPDF(res, 'Profitability Analysis', headers, widths, rows);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportReportExcel = async (req, res) => {
  try {
    const { reportType, startDate, endDate, projectId, customerId, status } = req.query;
    const bId = req.business.id;
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    let data = [];
    let sheetName = 'Report';

    if (reportType === 'expenses') {
      sheetName = 'Expenses';
      const expenses = await prisma.expense.findMany({
        where: { businessId: bId, ...(projectId ? { projectId } : {}), ...(status ? { status } : {}), ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}) },
        include: { project: true, employee: true, vendor: true }
      });
      data = expenses.map(e => ({ 'Title': e.title, 'Project': e.project?.projectName || '-', 'Employee': e.employee?.name || '-', 'Category': e.category, 'Amount': e.amount, 'Date': e.date ? new Date(e.date).toLocaleDateString() : '-', 'Status': e.status }));
    } else if (reportType === 'billing') {
      sheetName = 'Invoices';
      const invoices = await prisma.invoice.findMany({
        where: { businessId: bId, isDeleted: false, ...(customerId ? { customerId } : {}), ...(status ? { status } : {}) },
        include: { customer: true, project: true }
      });
      data = invoices.map(i => ({ 'Invoice #': i.invoiceNumber, 'Customer': i.customer?.name || '-', 'Project': i.project?.projectName || '-', 'Amount': i.grandTotal, 'Status': i.status }));
    } else if (reportType === 'issues') {
      sheetName = 'Issues';
      const issues = await prisma.projectIssue.findMany({
        where: { businessId: bId, ...(projectId ? { projectId } : {}), ...(status ? { status } : {}) },
        include: { project: true }
      });
      data = issues.map(i => ({ 'Title': i.title, 'Project': i.project?.projectName || '-', 'Priority': i.priority, 'Status': i.status, 'Created': new Date(i.createdAt).toLocaleDateString() }));
    } else {
      sheetName = 'Projects';
      const projects = await prisma.project.findMany({
        where: { businessId: bId, ...(status ? { status } : {}), ...(customerId ? { customerId } : {}) },
        include: { customer: true, projectManager: true }
      });
      data = projects.map(p => ({
        'Project': p.projectName, 'Code': p.projectCode, 'Customer': p.customer?.name || '-',
        'Manager': p.projectManager?.name || '-', 'Status': p.status,
        'Budget': p.budget, 'Revenue': p.collectedRevenue, 'Cost': p.actualCost,
        'Profit': (p.collectedRevenue || 0) - (p.actualCost || 0)
      }));
    }

    sendExcel(res, sheetName, sheetName, data);
  } catch (err) { res.status(500).send(err.message); }
};

exports.exportReportPDF = async (req, res) => {
  try {
    const { reportType } = req.query;
    const bId = req.business.id;

    let headers, widths, rows;
    let title = 'Project Report';

    if (reportType === 'expenses') {
      title = 'Expenses Report';
      const expenses = await prisma.expense.findMany({ where: { businessId: bId }, include: { project: true, employee: true } });
      headers = ['Title', 'Project', 'Employee', 'Category', 'Amount', 'Status'];
      widths = [100, 80, 80, 60, 50, 60];
      rows = expenses.map(e => [e.title, e.project?.projectName || '-', e.employee?.name || '-', e.category, String(e.amount), e.status]);
    } else {
      title = 'Projects Report';
      const projects = await prisma.project.findMany({ where: { businessId: bId }, include: { customer: true } });
      headers = ['Project', 'Customer', 'Status', 'Budget', 'Revenue', 'Profit'];
      widths = [110, 90, 70, 60, 60, 60];
      rows = projects.map(p => [p.projectName, p.customer?.name || '-', p.status, String(p.budget || 0), String(p.collectedRevenue || 0), String((p.collectedRevenue || 0) - (p.actualCost || 0))]);
    }

    res.setHeader('Content-Disposition', `attachment; filename=Report_${reportType || 'projects'}_${new Date().toISOString().split('T')[0]}.pdf`);
    buildPDF(res, title, headers, widths, rows);
  } catch (err) { res.status(500).send(err.message); }
};

