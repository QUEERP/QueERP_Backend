const prisma = require("../config/prisma");

/**
 * Reusable helper to build robust Prisma queries with search, filter, pagination, and sorting.
 * Supports soft-delete filtering and automatic multi-tenancy.
 * 
 * @param {Object} req Express request object
 * @param {Object} options Options for query building
 * @param {Array<string>} options.searchFields Database fields to run case-insensitive search against
 * @param {Object} options.filterFields Specific field mappings for exact/set match filtering
 * @param {Object} options.relations Relations to include in findMany/findFirst
 */
exports.buildPrismaQuery = (req, options = {}) => {
  const { searchFields = [], filterFields = {}, relations = {} } = options;
  const businessId = req.business?.id;

  if (!businessId) {
    throw new Error("Business context required for query");
  }

  // 1. Pagination Params
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // 2. Sorting Params
  const sortBy = req.query.sortBy || "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

  // 3. Base multi-tenant and soft-delete filters
  const where = {
    businessId,
    isDeleted: req.query.includeDeleted === "true" ? undefined : false,
  };

  // 4. Case-Insensitive Global Search
  const search = req.query.search;
  if (search && searchFields.length > 0) {
    where.OR = searchFields.map((field) => ({
      [field]: {
        contains: search,
        mode: "insensitive",
      },
    }));
  }

  // 5. Dynamic exact/enum filtering
  Object.keys(filterFields).forEach((paramName) => {
    const dbField = filterFields[paramName];
    const val = req.query[paramName];

    if (val !== undefined && val !== "") {
      if (val === "true" || val === "false") {
        where[dbField] = val === "true";
      } else if (!isNaN(val) && val.trim() !== "") {
        where[dbField] = Number(val);
      } else {
        where[dbField] = val;
      }
    }
  });

  return {
    queryOptions: {
      where,
      take: limit,
      skip,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: Object.keys(relations).length > 0 ? relations : undefined,
    },
    pagination: {
      page,
      limit,
      skip,
    },
  };
};

/**
 * Creates pagination metadata for API responses.
 */
exports.getPaginationMeta = (totalCount, page, limit) => {
  const totalPages = Math.ceil(totalCount / limit);
  return {
    totalCount,
    totalPages,
    currentPage: page,
    limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Enterprise Auditing & Timeline Logger helper.
 * Automatically handles modular database records for CRM auditing.
 */
exports.logAudit = async (businessId, { userId, action, moduleName, recordId, details = {} }) => {
  try {
    console.log(`[AUDIT LOG] Business: ${businessId} | User: ${userId} | Module: ${moduleName} | Action: ${action} | Record: ${recordId}`, details);
    
    // Future integration point: Write to a central AuditLog table in the database
    // For now, we print to secure server console logs.
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
};
