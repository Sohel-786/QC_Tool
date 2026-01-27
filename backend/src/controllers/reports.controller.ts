import { Request, Response, NextFunction } from 'express';
import { prisma } from '../external-libraries/dbClient';
import { ToolStatus } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

// Helper function to convert data to CSV
const convertToCSV = (data: any[], headers: string[], fields: string[]): string => {
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = fields.map(field => {
      const value = field.split('.').reduce((obj, key) => obj?.[key], row);
      // Escape commas and quotes in CSV
      if (value === null || value === undefined) return '';
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
};

export const getIssuedToolsReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate && endDate) {
      where.issuedAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const issues = await prisma.issue.findMany({
      where,
      include: {
        tool: true,
        division: true,
        issuedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });

    res.json({
      success: true,
      data: issues,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getMissingToolsReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tools = await prisma.tool.findMany({
      where: { status: ToolStatus.MISSING },
      include: {
        issues: true,
      },
      orderBy: { toolName: 'asc' },
    });

    res.json({
      success: true,
      data: tools,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getToolHistoryLedger = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { toolId } = req.params;

    const tool = await prisma.tool.findUnique({
      where: { id: parseInt(toolId) },
    });

    if (!tool) {
      return next(new NotFoundError('Tool not found'));
    }

    const issues = await prisma.issue.findMany({
      where: { toolId: parseInt(toolId) },
      include: {
        division: true,
        issuedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        returns: {
          include: {
            returnedByUser: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        tool,
        history: issues.map((issue) => ({
          issue,
          returns: issue.returns,
        })),
      },
    });
  } catch (error: any) {
    next(error);
  }
};

// Export functions
export const exportIssuedToolsReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate && endDate) {
      where.issuedAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const issues = await prisma.issue.findMany({
      where,
      include: {
        tool: true,
        division: true,
        issuedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });

    const headers = [
      'Issue No',
      'Tool Code',
      'Tool Name',
      'Division',
      'Issued To',
      'Issued By',
      'Status',
      'Issued Date',
      'Remarks'
    ];

    // Transform data for CSV export
    const csvData = issues.map((issue) => ({
      issueNo: issue.issueNo,
      toolCode: issue.tool?.toolCode || 'N/A',
      toolName: issue.tool?.toolName || 'N/A',
      division: issue.division?.name || 'N/A',
      issuedTo: issue.issuedTo || 'N/A',
      issuedBy: issue.issuedByUser
        ? `${issue.issuedByUser.firstName} ${issue.issuedByUser.lastName}`
        : 'N/A',
      status: issue.isReturned ? 'Returned' : 'Active',
      issuedDate: new Date(issue.issuedAt).toLocaleString(),
      remarks: issue.remarks || 'N/A',
    }));

    const fields = [
      'issueNo',
      'toolCode',
      'toolName',
      'division',
      'issuedTo',
      'issuedBy',
      'status',
      'issuedDate',
      'remarks',
    ];

    const csv = convertToCSV(csvData, headers, fields);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="issued-tools-report-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error: any) {
    next(error);
  }
};

export const exportMissingToolsReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tools = await prisma.tool.findMany({
      where: { status: ToolStatus.MISSING },
      include: {
        issues: true,
      },
      orderBy: { toolName: 'asc' },
    });

    const headers = [
      'Tool Code',
      'Tool Name',
      'Description',
      'Status',
      'Total Issues',
      'Created At',
      'Last Updated'
    ];

    // Transform data for CSV export
    const csvData = tools.map((tool) => ({
      toolCode: tool.toolCode,
      toolName: tool.toolName,
      description: tool.description || 'N/A',
      status: tool.status,
      totalIssues: tool.issues?.length || 0,
      createdAt: new Date(tool.createdAt).toLocaleString(),
      updatedAt: new Date(tool.updatedAt).toLocaleString(),
    }));

    const fields = [
      'toolCode',
      'toolName',
      'description',
      'status',
      'totalIssues',
      'createdAt',
      'updatedAt',
    ];

    const csv = convertToCSV(csvData, headers, fields);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="missing-tools-report-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error: any) {
    next(error);
  }
};

export const getAllToolsHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allTools = await prisma.tool.findMany({
      include: {
        issues: {
          include: {
            division: true,
            issuedByUser: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
            returns: {
              include: {
                returnedByUser: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: { issuedAt: 'desc' },
        },
      },
      orderBy: { toolName: 'asc' },
    });

    res.json({
      success: true,
      data: allTools,
    });
  } catch (error: any) {
    next(error);
  }
};

export const exportToolHistoryReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allTools = await prisma.tool.findMany({
      include: {
        issues: {
          include: {
            division: true,
            issuedByUser: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
            returns: {
              include: {
                returnedByUser: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: { issuedAt: 'desc' },
        },
      },
      orderBy: { toolName: 'asc' },
    });

    // Flatten the data for CSV export
    const historyRows: any[] = [];
    for (const tool of allTools) {
      if (tool.issues.length === 0) {
        historyRows.push({
          toolCode: tool.toolCode,
          toolName: tool.toolName,
          issueNo: 'N/A',
          division: 'N/A',
          issuedBy: 'N/A',
          issuedTo: 'N/A',
          issuedDate: 'N/A',
          returnedDate: 'N/A',
          returnedBy: 'N/A',
          status: tool.status,
        });
      } else {
        for (const issue of tool.issues) {
          if (issue.returns.length > 0) {
            for (const return_ of issue.returns) {
              historyRows.push({
                toolCode: tool.toolCode,
                toolName: tool.toolName,
                issueNo: issue.issueNo,
                division: issue.division?.name || 'N/A',
                issuedBy: `${issue.issuedByUser?.firstName || ''} ${issue.issuedByUser?.lastName || ''}`.trim() || 'N/A',
                issuedTo: issue.issuedTo || 'N/A',
                issuedDate: issue.issuedAt,
                returnedDate: return_.returnedAt,
                returnedBy: `${return_.returnedByUser?.firstName || ''} ${return_.returnedByUser?.lastName || ''}`.trim() || 'N/A',
                status: issue.isReturned ? 'Returned' : 'Active',
              });
            }
          } else {
            historyRows.push({
              toolCode: tool.toolCode,
              toolName: tool.toolName,
              issueNo: issue.issueNo,
              division: issue.division?.name || 'N/A',
              issuedBy: `${issue.issuedByUser?.firstName || ''} ${issue.issuedByUser?.lastName || ''}`.trim() || 'N/A',
              issuedTo: issue.issuedTo || 'N/A',
              issuedDate: issue.issuedAt,
              returnedDate: 'N/A',
              returnedBy: 'N/A',
              status: issue.isReturned ? 'Returned' : 'Active',
            });
          }
        }
      }
    }

    const headers = [
      'Tool Code',
      'Tool Name',
      'Issue No',
      'Division',
      'Issued By',
      'Issued To',
      'Issued Date',
      'Returned Date',
      'Returned By',
      'Status'
    ];

    const fields = [
      'toolCode',
      'toolName',
      'issueNo',
      'division',
      'issuedBy',
      'issuedTo',
      'issuedDate',
      'returnedDate',
      'returnedBy',
      'status'
    ];

    const csv = convertToCSV(historyRows, headers, fields);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="tool-history-report-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error: any) {
    next(error);
  }
};
