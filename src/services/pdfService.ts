import { ContractFormData, Contract } from '../types';
import { calculateYearlyRates, calculateTotalContractValue, formatCurrency, formatCapacity } from '../utils/calculations';

/**
 * PDF Export Service for Bloom Energy Contracts
 * Generates and downloads PDF contracts using browser print functionality
 */

export class PDFService {
  
  /**
   * Generate and download a PDF contract from ContractFormData
   */
  static async exportContractToPDF(formData: ContractFormData): Promise<void>;
  
  /**
   * Generate and download a PDF contract from Contract object
   */
  static async exportContractToPDF(contract: Contract): Promise<void>;
  
  /**
   * Implementation for both overloads
   */
  static async exportContractToPDF(data: ContractFormData | Contract): Promise<void> {
    try {
      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups and try again.');
      }

      // Convert Contract object to ContractFormData if needed
      const formData = this.isContract(data) ? this.convertContractToFormData(data) : data;

      // Calculate financial data
      const yearlyRates = calculateYearlyRates(
        formData.baseRate,
        formData.annualEscalation,
        formData.contractTerm
      );
      const totalValue = calculateTotalContractValue(formData.ratedCapacity, yearlyRates);
      const monthlyPaymentYear1 = (formData.ratedCapacity * formData.baseRate) / 12;

      // Generate HTML content for PDF
      const htmlContent = this.generateContractHTML(formData, {
        yearlyRates,
        totalValue,
        monthlyPaymentYear1
      });

      // Write content to print window
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          
          // Close window after print dialog
          setTimeout(() => {
            printWindow.close();
          }, 500);
        }, 250);
      };

    } catch (error) {
      console.error('PDF export failed:', error);
      throw error;
    }
  }

  /**
   * Type guard to check if data is a Contract object
   */
  private static isContract(data: ContractFormData | Contract): data is Contract {
    return 'id' in data && 'client' in data && 'parameters' in data;
  }

  /**
   * Convert Contract object to ContractFormData format
   */
  private static convertContractToFormData(contract: Contract): ContractFormData {
    return {
      // Basic Information
      customerName: contract.client,
      siteLocation: contract.site,
      orderDate: contract.uploadDate,
      effectiveDate: contract.effectiveDate,
      
      // System Configuration
      solutionType: contract.type,
      ratedCapacity: contract.capacity,
      reliabilityLevel: 99.9, // Default value
      installationType: 'Ground', // Default value
      
      // Financial Parameters
      baseRate: contract.parameters.financial.baseRate,
      annualEscalation: contract.parameters.financial.escalation,
      contractTerm: contract.term,
      microgridAdder: contract.parameters.financial.microgridAdder || 0,
      thermalCycleFee: contract.parameters.financial.thermalCycleFee || 0,
      electricalBudget: contract.parameters.financial.electricalBudget || 0,
      commissioningAllowance: contract.parameters.financial.commissioningAllowance || 0,
      
      // Operating Parameters
      outputWarrantyPercent: contract.parameters.operating.outputWarranty,
      efficiencyWarrantyPercent: contract.parameters.operating.efficiency,
      minDemandKW: contract.parameters.operating.demandRange.min,
      maxDemandKW: contract.parameters.operating.demandRange.max,
      guaranteedCriticalOutput: contract.parameters.operating.criticalOutput,
      includeRECs: false, // Default value
      recType: contract.parameters.technical.recType || '',
      
      // Technical Specifications
      gridParallelVoltage: contract.parameters.technical.voltage,
      numberOfServers: contract.parameters.technical.servers,
      selectedComponents: contract.parameters.technical.components,
      
      // Additional Information
      specialRequirements: contract.notes || ''
    };
  }

  /**
   * Generate HTML content for the contract PDF
   */
  private static generateContractHTML(
    formData: ContractFormData,
    calculations: {
      yearlyRates: any[];
      totalValue: number;
      monthlyPaymentYear1: number;
    }
  ): string {
    const { yearlyRates, totalValue, monthlyPaymentYear1 } = calculations;
    const contractId = `BEC-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    const currentDate = new Date().toLocaleDateString();

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Bloom Energy Contract - ${formData.customerName}</title>
    <style>
        @media print {
            body { margin: 0; }
            .page-break { page-break-before: always; }
        }
        
        body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            border-bottom: 2px solid #059669;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #059669;
            font-size: 28px;
            margin: 0;
        }
        
        .contract-id {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 4px;
            padding: 10px;
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .section h2 {
            color: #059669;
            font-size: 18px;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        @media print {
            .info-grid {
                display: table;
                width: 100%;
            }
            .info-item {
                display: table-row;
            }
            .info-item > div {
                display: table-cell;
                padding: 5px 10px;
                border: 1px solid #ddd;
            }
        }
        
        .info-item {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 12px;
        }
        
        .info-label {
            font-weight: bold;
            color: #374151;
            margin-bottom: 4px;
        }
        
        .info-value {
            color: #6b7280;
        }
        
        .highlight {
            background: #ecfdf5;
            border: 1px solid #10b981;
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
        }
        
        .highlight .amount {
            font-size: 24px;
            font-weight: bold;
            color: #059669;
        }
        
        .rate-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        
        .rate-table th,
        .rate-table td {
            border: 1px solid #d1d5db;
            padding: 8px 12px;
            text-align: left;
        }
        
        .rate-table th {
            background: #f3f4f6;
            font-weight: bold;
        }
        
        .rate-table tr:nth-child(even) {
            background: #f9fafb;
        }
        
        .components {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .component-tag {
            background: #dbeafe;
            color: #1e40af;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            border: 1px solid #93c5fd;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #d1d5db;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
        }
        
        @media print {
            .components { display: block; }
            .component-tag { 
                display: inline-block; 
                margin: 2px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>BLOOM ENERGY CONTRACT</h1>
        <div style="font-size: 16px; color: #6b7280; margin-top: 10px;">
            Power Purchase Agreement & System Configuration
        </div>
    </div>

    <div class="contract-id">
        Contract ID: ${contractId} | Generated: ${currentDate}
    </div>

    <div class="section">
        <h2>Contract Details</h2>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Customer Name</div>
                <div class="info-value">${formData.customerName}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Site Location</div>
                <div class="info-value">${formData.siteLocation}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Order Date</div>
                <div class="info-value">${formData.orderDate}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Effective Date</div>
                <div class="info-value">${formData.effectiveDate}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>System Configuration</h2>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Solution Type</div>
                <div class="info-value">${formData.solutionType}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Rated Capacity</div>
                <div class="info-value">${formatCapacity(formData.ratedCapacity)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Reliability Level</div>
                <div class="info-value">${formData.reliabilityLevel}%</div>
            </div>
            <div class="info-item">
                <div class="info-label">Installation Type</div>
                <div class="info-value">${formData.installationType}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Financial Terms</h2>
        
        <div class="highlight">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 14px; color: #059669; font-weight: bold;">Year 1 Monthly Payment</div>
                    <div class="amount">${formatCurrency(monthlyPaymentYear1)}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 14px; color: #059669; font-weight: bold;">Total Contract Value</div>
                    <div class="amount">${formatCurrency(totalValue)}</div>
                </div>
            </div>
        </div>

        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Base Rate</div>
                <div class="info-value">$${formData.baseRate}/kW</div>
            </div>
            <div class="info-item">
                <div class="info-label">Annual Escalation</div>
                <div class="info-value">${formData.annualEscalation}%</div>
            </div>
            <div class="info-item">
                <div class="info-label">Contract Term</div>
                <div class="info-value">${formData.contractTerm} years</div>
            </div>
            <div class="info-item">
                <div class="info-label">Microgrid Adder</div>
                <div class="info-value">$${formData.microgridAdder}/kW</div>
            </div>
        </div>

        ${formData.thermalCycleFee || formData.electricalBudget || formData.commissioningAllowance ? `
        <h3 style="color: #374151; font-size: 16px; margin: 20px 0 10px 0;">Additional Costs</h3>
        <div class="info-grid">
            ${formData.thermalCycleFee ? `
            <div class="info-item">
                <div class="info-label">Thermal Cycle Fee</div>
                <div class="info-value">${formatCurrency(formData.thermalCycleFee)}</div>
            </div>` : ''}
            ${formData.electricalBudget ? `
            <div class="info-item">
                <div class="info-label">Electrical Budget</div>
                <div class="info-value">${formatCurrency(formData.electricalBudget)}</div>
            </div>` : ''}
            ${formData.commissioningAllowance ? `
            <div class="info-item">
                <div class="info-label">Commissioning Allowance</div>
                <div class="info-value">${formatCurrency(formData.commissioningAllowance)}</div>
            </div>` : ''}
        </div>` : ''}
    </div>

    <div class="section">
        <h2>Rate Progression</h2>
        <table class="rate-table">
            <thead>
                <tr>
                    <th>Year</th>
                    <th>Rate ($/kW)</th>
                    <th>Annual Payment</th>
                </tr>
            </thead>
            <tbody>
                ${yearlyRates.slice(0, 10).map(rate => `
                <tr>
                    <td>Year ${rate.year}</td>
                    <td>$${rate.rate}</td>
                    <td>${formatCurrency(formData.ratedCapacity * rate.amount * 12)}</td>
                </tr>
                `).join('')}
                ${yearlyRates.length > 10 ? `
                <tr>
                    <td colspan="3" style="text-align: center; font-style: italic;">
                        ... and ${yearlyRates.length - 10} more years
                    </td>
                </tr>` : ''}
            </tbody>
        </table>
    </div>

    <div class="page-break"></div>

    <div class="section">
        <h2>Technical Specifications</h2>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Grid Parallel Voltage</div>
                <div class="info-value">${formData.gridParallelVoltage}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Number of Servers</div>
                <div class="info-value">${formData.numberOfServers}</div>
            </div>
        </div>

        <h3 style="color: #374151; font-size: 16px; margin: 20px 0 10px 0;">Selected Components</h3>
        <div class="components">
            ${formData.selectedComponents.map(component => 
              `<span class="component-tag">${component}</span>`
            ).join('')}
        </div>
    </div>

    <div class="section">
        <h2>Operating Parameters</h2>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Output Warranty</div>
                <div class="info-value">${formData.outputWarrantyPercent}%</div>
            </div>
            <div class="info-item">
                <div class="info-label">Efficiency Warranty</div>
                <div class="info-value">${formData.efficiencyWarrantyPercent}%</div>
            </div>
            <div class="info-item">
                <div class="info-label">Minimum Demand</div>
                <div class="info-value">${formData.minDemandKW} kW</div>
            </div>
            <div class="info-item">
                <div class="info-label">Maximum Demand</div>
                <div class="info-value">${formData.maxDemandKW} kW</div>
            </div>
            <div class="info-item">
                <div class="info-label">Critical Output Guarantee</div>
                <div class="info-value">${formData.guaranteedCriticalOutput} kW</div>
            </div>
            ${formData.includeRECs ? `
            <div class="info-item">
                <div class="info-label">REC Type</div>
                <div class="info-value">${formData.recType}</div>
            </div>` : ''}
        </div>
    </div>

    ${formData.specialRequirements ? `
    <div class="section">
        <h2>Special Requirements</h2>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 15px;">
            ${formData.specialRequirements}
        </div>
    </div>` : ''}

    <div class="footer">
        <div>This contract was generated by Bloom Energy Contract Learning & Rules Management System</div>
        <div style="margin-top: 5px;">Generated on ${currentDate} | Contract ID: ${contractId}</div>
    </div>
</body>
</html>`;
  }
}

export default PDFService;