import { PrismaClient } from '../../../generated/prisma/index.js';
import { AppError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

class TemplateService {
  async createTemplate(templateData, userId) {
    try {
      const template = await prisma.contractTemplate.create({
        data: {
          name: templateData.name,
          description: templateData.description,
          category: templateData.category,
          isActive: templateData.isActive !== undefined ? templateData.isActive : true,
          formData: templateData.templateData || {},
          createdBy: userId
        }
      });
      
      return template;
    } catch (error) {
      throw new AppError('Failed to create template: ' + error.message);
    }
  }

  async getTemplates(userId, filters = {}) {
    try {
      const where = {};

      // Filter by category if provided
      if (filters.category) {
        where.category = filters.category;
      }


      // Filter by active status
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      // Apply search if provided
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { category: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      const templates = await prisma.contractTemplate.findMany({
        where,
        include: {
          contracts: {
            select: {
              id: true,
              name: true,
              status: true,
              createdAt: true
            },
            take: 5,
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              contracts: true
            }
          }
        },
        orderBy: [
          { usageCount: 'desc' },
          { updatedAt: 'desc' }
        ]
      });

      return templates;
    } catch (error) {
      throw new Error('Failed to retrieve templates: ' + error.message);
    }
  }

  async getTemplateById(templateId) {
    try {
      const template = await prisma.contractTemplate.findUnique({
        where: { id: templateId },
        include: {
          contracts: {
            select: {
              id: true,
              name: true,
              status: true,
              createdAt: true,
              client: true
            },
            take: 10,
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              contracts: true
            }
          }
        }
      });

      if (!template) {
        throw new AppError('Template not found');
      }

      return template;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new Error('Failed to retrieve template: ' + error.message);
    }
  }

  async updateTemplate(templateId, updateData, userId) {
    try {
      const existingTemplate = await prisma.contractTemplate.findUnique({
        where: { id: templateId }
      });

      if (!existingTemplate) {
        throw new AppError('Template not found');
      }

      // Map templateData to formData if present
      const data = { ...updateData };
      if (updateData.templateData) {
        data.formData = updateData.templateData;
        delete data.templateData;
      }

      const template = await prisma.contractTemplate.update({
        where: { id: templateId },
        data: data,
        include: {
          _count: {
            select: {
              contracts: true
            }
          }
        }
      });

      return template;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new Error('Failed to update template: ' + error.message);
    }
  }

  async deleteTemplate(templateId, userId) {
    try {
      const existingTemplate = await prisma.contractTemplate.findUnique({
        where: { id: templateId },
        include: {
          _count: {
            select: {
              contracts: true
            }
          }
        }
      });

      if (!existingTemplate) {
        throw new AppError('Template not found');
      }

      // Check if template has associated contracts
      if (existingTemplate._count.contracts > 0) {
        throw new AppError(
          `Cannot delete template with ${existingTemplate._count.contracts} associated contracts. ` +
          'Archive the template instead or delete associated contracts first.'
        );
      }

      await prisma.contractTemplate.delete({
        where: { id: templateId }
      });

      return { message: 'Template deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new Error('Failed to delete template: ' + error.message);
    }
  }

  async createContractFromTemplate(templateId, customData = {}, userId) {
    try {
      const template = await this.getTemplateById(templateId);

      // Merge template data with custom overrides
      const contractData = {
        ...template.formData,
        ...customData,
        // Ensure we don't override system fields
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined
      };

      // Create the contract
      const contract = await prisma.contract.create({
        data: {
          ...contractData,
          createdBy: userId
        }
      });

      // Update template usage count
      await prisma.contractTemplate.update({
        where: { id: templateId },
        data: {
          usageCount: { increment: 1 },
          lastUsed: new Date()
        }
      });

      return contract;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new Error('Failed to create contract from template: ' + error.message);
    }
  }

  async duplicateTemplate(templateId, newName, userId) {
    try {
      const originalTemplate = await this.getTemplateById(templateId);

      const duplicatedTemplate = await prisma.contractTemplate.create({
        data: {
          name: newName || `${originalTemplate.name} (Copy)`,
          description: originalTemplate.description,
          category: originalTemplate.category,
          formData: originalTemplate.formData,
          isActive: true, // New duplicated templates are active by default
          createdBy: userId
        }
      });

      return duplicatedTemplate;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new Error('Failed to duplicate template: ' + error.message);
    }
  }

  async getTemplateStats() {
    try {
      const stats = await prisma.contractTemplate.aggregate({
        _count: {
          id: true
        },
        _sum: {
          usageCount: true
        }
      });

      const categoryStats = await prisma.contractTemplate.groupBy({
        by: ['category'],
        _count: {
          category: true
        },
        _sum: {
          usageCount: true
        }
      });


      return {
        totalTemplates: stats._count.id,
        totalUsage: stats._sum.usageCount || 0,
        categoryBreakdown: categoryStats
      };
    } catch (error) {
      throw new Error('Failed to get template statistics: ' + error.message);
    }
  }

  async getPopularTemplates(limit = 10) {
    try {
      const popularTemplates = await prisma.contractTemplate.findMany({
        where: {
          isActive: true,
          usageCount: { gt: 0 }
        },
        take: limit,
        orderBy: [
          { usageCount: 'desc' },
          { lastUsed: 'desc' }
        ],
        select: {
          id: true,
          name: true,
          category: true,
          usageCount: true,
          lastUsed: true,
          _count: {
            select: {
              contracts: true
            }
          }
        }
      });

      return popularTemplates;
    } catch (error) {
      throw new Error('Failed to get popular templates: ' + error.message);
    }
  }

  async validateTemplateData(templateData) {
    const errors = [];
    
    // Required fields validation
    if (!templateData.name || templateData.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!templateData.category) {
      errors.push('Template category is required');
    }

    if (!templateData.templateData || typeof templateData.templateData !== 'object') {
      errors.push('Template data must be a valid object');
    }

    // Business logic validation
    if (templateData.templateData) {
      const data = templateData.templateData;
      
      // Validate capacity if provided
      if (data.capacity && (data.capacity <= 0 || data.capacity % 325 !== 0)) {
        errors.push('Capacity must be positive and in multiples of 325 kW');
      }

      // Validate term if provided
      if (data.term && ![5, 10, 15, 20, 25].includes(data.term)) {
        errors.push('Contract term must be 5, 10, 15, 20, or 25 years');
      }

      // Validate yearly rate if provided
      if (data.yearlyRate && (data.yearlyRate < 0.01 || data.yearlyRate > 1.0)) {
        errors.push('Yearly rate must be between 0.01 and 1.0');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default new TemplateService();