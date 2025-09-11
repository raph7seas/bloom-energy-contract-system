import express from 'express';
import { captureContractInteraction, captureValidationInteraction } from '../middleware/learningMiddleware.js';
import { contractAuditMiddleware, captureOldValues, getEntityByTypeAndId } from '../middleware/audit.js';
import ValidationService from '../services/validationService.js';
import { validate, validateQuery, validateParams, contractIdSchema, searchQuerySchema } from '../middleware/validation.js';

const router = express.Router();
const validationService = new ValidationService();

// Get all contracts with filtering and pagination
router.get('/', 
  validateQuery(searchQuerySchema), 
  async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      systemType, 
      client, 
      search 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where clause
    const where = {};
    if (status) where.status = status;
    if (systemType) where.systemType = systemType;
    if (client) where.client = { contains: client, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { client: { contains: search, mode: 'insensitive' } },
        { site: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [contracts, total] = await Promise.all([
      req.prisma.contract.findMany({
        where,
        include: {
          financial: true,
          technical: true,
          operating: true,
          _count: {
            select: { uploads: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      req.prisma.contract.count({ where })
    ]);

    res.json({
      contracts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});

// Get a single contract by ID
router.get('/:id', 
  validateParams(contractIdSchema), 
  async (req, res) => {
  try {
    const contract = await req.prisma.contract.findUnique({
      where: { id: req.params.id },
      include: {
        financial: true,
        technical: true,
        operating: true,
        uploads: true,
        templates: true
      }
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json(contract);
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: 'Failed to fetch contract' });
  }
});

// Create a new contract
router.post('/', 
  validationService.createMiddleware('contract.create'),
  captureValidationInteraction,
  captureContractInteraction('CONTRACT_CREATE'),
  contractAuditMiddleware,
  async (req, res) => {
  try {
    // Use validated data from middleware
    const contractData = req.validatedData || req.body;
    const {
      name,
      client,
      system,
      financial,
      technical,
      operating,
      status = 'DRAFT'
    } = contractData;

    // Create contract with related data
    const contract = await req.prisma.contract.create({
      data: {
        name,
        client: client.name,
        site: client.address?.city || 'Unknown',
        capacity: system.capacity,
        term: financial.termYears,
        systemType: system.solutionType,
        effectiveDate: new Date(),
        status,
        tags: [],
        financial: financial ? {
          create: {
            baseRate: financial.baseRate,
            microgridAdder: financial.microgridAdder || null,
            escalation: financial.escalation
          }
        } : undefined,
        technical: technical ? {
          create: {
            voltage: technical.voltage,
            servers: 1,
            components: technical.components || []
          }
        } : undefined,
        operating: operating ? {
          create: {
            outputWarranty: operating.outputWarranty,
            efficiency: operating.efficiencyWarranty,
            minDemand: operating.minDemand,
            maxDemand: operating.maxDemand,
            criticalOutput: operating.maxDemand
          }
        } : undefined
      },
      include: {
        financial: true,
        technical: true,
        operating: true
      }
    });

    res.status(201).json(contract);
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ error: 'Failed to create contract' });
  }
});

// Update a contract
router.put('/:id', 
  validateParams(contractIdSchema),
  captureOldValues('CONTRACT', (prisma, id) => prisma.contract.findUnique({ where: { id }, include: { financial: true, technical: true, operating: true } })),
  validationService.createMiddleware('contract.update'),
  captureValidationInteraction,
  captureContractInteraction('CONTRACT_UPDATE'),
  contractAuditMiddleware,
  async (req, res) => {
  try {
    const { id } = req.params;
    // Use validated data from middleware
    const updateData = req.validatedData || req.body;
    
    // Remove nested objects from main update
    const { financial, technical, operating, ...mainData } = updateData;

    // Update main contract data
    const contract = await req.prisma.contract.update({
      where: { id },
      data: {
        ...mainData,
        updatedAt: new Date()
      },
      include: {
        financial: true,
        technical: true,
        operating: true
      }
    });

    // Update financial parameters if provided
    if (financial) {
      await req.prisma.financialParams.upsert({
        where: { contractId: id },
        update: financial,
        create: { ...financial, contractId: id }
      });
    }

    // Update technical parameters if provided
    if (technical) {
      await req.prisma.technicalParams.upsert({
        where: { contractId: id },
        update: technical,
        create: { ...technical, contractId: id }
      });
    }

    // Update operating parameters if provided
    if (operating) {
      await req.prisma.operatingParams.upsert({
        where: { contractId: id },
        update: operating,
        create: { ...operating, contractId: id }
      });
    }

    // Fetch updated contract with all relations
    const updatedContract = await req.prisma.contract.findUnique({
      where: { id },
      include: {
        financial: true,
        technical: true,
        operating: true
      }
    });

    res.json(updatedContract);
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({ error: 'Failed to update contract' });
  }
});

// Delete a contract
router.delete('/:id', 
  validateParams(contractIdSchema),
  captureOldValues('CONTRACT', (prisma, id) => prisma.contract.findUnique({ where: { id }, include: { financial: true, technical: true, operating: true } })),
  contractAuditMiddleware,
  async (req, res) => {
  try {
    await req.prisma.contract.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Contract not found' });
    }
    console.error('Error deleting contract:', error);
    res.status(500).json({ error: 'Failed to delete contract' });
  }
});

// Get contract statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const [
      totalContracts,
      totalValue,
      contractsByStatus,
      contractsByType
    ] = await Promise.all([
      req.prisma.contract.count(),
      req.prisma.contract.aggregate({
        _sum: { totalValue: true }
      }),
      req.prisma.contract.groupBy({
        by: ['status'],
        _count: true
      }),
      req.prisma.contract.groupBy({
        by: ['systemType'],
        _count: true
      })
    ]);

    const averageContractValue = totalContracts > 0 
      ? (totalValue._sum.totalValue || 0) / totalContracts 
      : 0;

    const statusMap = {};
    contractsByStatus.forEach(item => {
      statusMap[item.status] = item._count;
    });

    const typeMap = {};
    contractsByType.forEach(item => {
      typeMap[item.systemType] = item._count;
    });

    res.json({
      totalContracts,
      totalValue: totalValue._sum.totalValue || 0,
      averageContractValue,
      contractsByStatus: statusMap,
      contractsByType: typeMap,
      monthlyGrowth: 0, // TODO: Calculate based on date ranges
      completionRate: 0 // TODO: Calculate completion rate
    });
  } catch (error) {
    console.error('Error fetching contract stats:', error);
    res.status(500).json({ error: 'Failed to fetch contract statistics' });
  }
});

// Bulk operations
router.post('/bulk/create', async (req, res) => {
  try {
    const { contracts } = req.body;
    
    if (!contracts || !Array.isArray(contracts) || contracts.length === 0) {
      return res.status(400).json({ error: 'Contracts array is required' });
    }

    if (contracts.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 contracts allowed per bulk operation' });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < contracts.length; i++) {
      const contractData = contracts[i];
      try {
        const validation = await validationService.validateContract(contractData);
        if (!validation.isValid) {
          errors.push({
            index: i,
            error: 'Validation failed',
            details: validation.errors
          });
          continue;
        }

        const contract = await req.prisma.contract.create({
          data: {
            ...contractData,
            createdBy: req.user?.id,
            // Create related entities if provided
            ...(contractData.financial && {
              financial: { create: contractData.financial }
            }),
            ...(contractData.technical && {
              technical: { create: contractData.technical }
            }),
            ...(contractData.operating && {
              operating: { create: contractData.operating }
            })
          },
          include: {
            financial: true,
            technical: true,
            operating: true
          }
        });

        results.push({
          index: i,
          id: contract.id,
          name: contract.name,
          success: true
        });
      } catch (error) {
        errors.push({
          index: i,
          error: error.message,
          contractName: contractData.name
        });
      }
    }

    res.status(201).json({
      success: true,
      created: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Bulk create error:', error);
    res.status(500).json({ error: 'Failed to bulk create contracts' });
  }
});

router.put('/bulk/update', async (req, res) => {
  try {
    const { updates } = req.body;
    
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array is required' });
    }

    if (updates.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 contracts allowed per bulk update' });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < updates.length; i++) {
      const { id, data } = updates[i];
      
      if (!id || !data) {
        errors.push({
          index: i,
          error: 'Both id and data are required for each update'
        });
        continue;
      }

      try {
        const existingContract = await req.prisma.contract.findUnique({
          where: { id }
        });

        if (!existingContract) {
          errors.push({
            index: i,
            id,
            error: 'Contract not found'
          });
          continue;
        }

        const contract = await req.prisma.contract.update({
          where: { id },
          data: {
            ...data,
            updatedBy: req.user?.id
          },
          include: {
            financial: true,
            technical: true,
            operating: true
          }
        });

        results.push({
          index: i,
          id: contract.id,
          name: contract.name,
          success: true
        });
      } catch (error) {
        errors.push({
          index: i,
          id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      updated: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Failed to bulk update contracts' });
  }
});

router.delete('/bulk/delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Contract IDs array is required' });
    }

    if (ids.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 contracts allowed per bulk delete' });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      
      try {
        const existingContract = await req.prisma.contract.findUnique({
          where: { id }
        });

        if (!existingContract) {
          errors.push({
            index: i,
            id,
            error: 'Contract not found'
          });
          continue;
        }

        await req.prisma.contract.delete({
          where: { id }
        });

        results.push({
          index: i,
          id,
          name: existingContract.name,
          success: true
        });
      } catch (error) {
        errors.push({
          index: i,
          id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      deleted: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Failed to bulk delete contracts' });
  }
});

router.patch('/bulk/status', async (req, res) => {
  try {
    const { ids, status } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Contract IDs array is required' });
    }

    if (!status || !['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'PENDING'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    if (ids.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 contracts allowed per bulk status update' });
    }

    try {
      const updatedContracts = await req.prisma.contract.updateMany({
        where: { id: { in: ids } },
        data: { 
          status,
          updatedBy: req.user?.id,
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        updated: updatedContracts.count,
        status,
        message: `Successfully updated ${updatedContracts.count} contracts to ${status}`
      });
    } catch (error) {
      console.error('Bulk status update error:', error);
      res.status(500).json({ error: 'Failed to bulk update status' });
    }
  } catch (error) {
    console.error('Bulk status update error:', error);
    res.status(500).json({ error: 'Failed to bulk update status' });
  }
});

router.post('/bulk/export', async (req, res) => {
  try {
    const { 
      ids = null, 
      format = 'json',
      includeRelated = true,
      filters = {}
    } = req.body;

    let where = {};
    
    if (ids && Array.isArray(ids)) {
      where.id = { in: ids };
    } else {
      // Apply filters if no specific IDs provided
      if (filters.status) where.status = filters.status;
      if (filters.systemType) where.systemType = filters.systemType;
      if (filters.client) where.client = { contains: filters.client, mode: 'insensitive' };
    }

    const contracts = await req.prisma.contract.findMany({
      where,
      include: includeRelated ? {
        financial: true,
        technical: true,
        operating: true,
        uploads: {
          select: {
            id: true,
            fileName: true,
            originalName: true,
            fileType: true,
            uploadDate: true
          }
        }
      } : false,
      orderBy: { createdAt: 'desc' }
    });

    if (format === 'csv') {
      // Convert to CSV format
      const headers = [
        'id', 'name', 'client', 'site', 'capacity', 'term', 'systemType',
        'status', 'totalValue', 'yearlyRate', 'effectiveDate', 'createdAt'
      ];
      
      let csvContent = headers.join(',') + '\n';
      
      contracts.forEach(contract => {
        const row = [
          contract.id,
          `"${contract.name}"`,
          `"${contract.client}"`,
          `"${contract.site}"`,
          contract.capacity,
          contract.term,
          contract.systemType,
          contract.status,
          contract.totalValue || '',
          contract.yearlyRate || '',
          contract.effectiveDate?.toISOString() || '',
          contract.createdAt.toISOString()
        ];
        csvContent += row.join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="contracts-export-${Date.now()}.csv"`);
      res.send(csvContent);
    } else {
      // Default JSON format
      res.json({
        success: true,
        format,
        count: contracts.length,
        exportedAt: new Date().toISOString(),
        contracts
      });
    }
  } catch (error) {
    console.error('Bulk export error:', error);
    res.status(500).json({ error: 'Failed to export contracts' });
  }
});

export default router;