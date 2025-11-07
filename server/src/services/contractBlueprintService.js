/**
 * Contract Blueprint Service
 * Minimal stub implementation for building contract blueprints
 */

/**
 * Builds a contract blueprint from form data
 * @param {Object} formData - Contract form data
 * @returns {Object} Contract blueprint
 */
export function buildContractBlueprint(formData) {
  if (!formData) {
    return null;
  }

  // Simple blueprint structure
  return {
    id: formData.id || null,
    name: formData.name || formData.customerName || '',
    client: formData.client || formData.customerName || '',
    site: formData.site || formData.siteLocation || '',
    capacity: formData.capacity || formData.ratedCapacity || 0,
    term: formData.term || formData.contractTerm || 0,
    type: formData.type || formData.solutionType || '',
    effectiveDate: formData.effectiveDate || new Date().toISOString(),
    status: formData.status || 'draft',
    parameters: {
      financial: {
        baseRate: formData.baseRate || 0,
        escalation: formData.escalation || formData.annualEscalation || 0,
        invoiceFrequency: formData.invoiceFrequency || 'monthly',
        paymentTerms: formData.paymentTerms || 'net 30'
      },
      technical: {
        voltage: formData.voltage || formData.gridParallelVoltage || '',
        servers: formData.servers || formData.numberOfServers || 0,
        components: formData.components || formData.selectedComponents || []
      },
      operating: {
        outputWarranty: formData.outputWarranty || formData.outputWarrantyPercent || 0,
        efficiency: formData.efficiency || formData.efficiencyWarrantyPercent || 0
      }
    }
  };
}

export default {
  buildContractBlueprint
};
