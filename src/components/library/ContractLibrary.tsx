import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, Filter, Download, Eye, Edit, Trash2, Calendar, Building, MapPin } from 'lucide-react';
import { Contract } from '../../types';
import { contractService } from '../../services';
import { formatCurrency, formatCapacity } from '../../utils/calculations';
import { PDFService } from '../../services/pdfService';

interface ContractLibraryProps {
  onNavigate: (view: string, contract?: Contract) => void;
}

export const ContractLibrary: React.FC<ContractLibraryProps> = ({ onNavigate }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [exportingContractId, setExportingContractId] = useState<string | null>(null);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const allContracts = await contractService.getContracts();
      setContracts(allContracts);
    } catch (error) {
      console.error('Failed to load contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = searchTerm === '' || 
      contract.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      contract.status.toLowerCase() === filterStatus.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const handleDeleteContract = async (contractId: string) => {
    if (window.confirm('Are you sure you want to delete this contract?')) {
      try {
        await contractService.deleteContract(contractId);
        await loadContracts(); // Reload the list
      } catch (error) {
        console.error('Failed to delete contract:', error);
        alert('Failed to delete contract. Please try again.');
      }
    }
  };

  const handleExportContract = async (contract: Contract) => {
    try {
      setExportingContractId(contract.id);
      await PDFService.exportContractToPDF(contract);
    } catch (error) {
      console.error('Failed to export contract:', error);
      alert('Failed to export contract. Please try again.');
    } finally {
      setExportingContractId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="absolute inset-0 p-6">
        <div className="w-full">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading contracts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 p-6">
      <div className="w-full space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contract Library</h1>
            <p className="text-gray-600 mt-1">Manage and view all your Bloom Energy contracts</p>
          </div>
          <Button onClick={() => onNavigate('create')} className="bg-green-600 hover:bg-green-700">
            Create New Contract
          </Button>
        </div>

        {/* Search and Filter Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search contracts by name, client, location, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Count */}
        <div className="text-sm text-gray-600">
          Showing {filteredContracts.length} of {contracts.length} contracts
        </div>

        {/* Contracts Grid */}
        {filteredContracts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Building className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {contracts.length === 0 ? 'No contracts found' : 'No contracts match your search'}
              </h3>
              <p className="text-gray-600 mb-4">
                {contracts.length === 0 
                  ? 'Get started by creating your first Bloom Energy contract.'
                  : 'Try adjusting your search terms or filters.'
                }
              </p>
              {contracts.length === 0 && (
                <Button onClick={() => onNavigate('create')} className="bg-green-600 hover:bg-green-700">
                  Create Your First Contract
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContracts.map((contract) => (
              <Card key={contract.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <Badge className={getStatusColor(contract.status)}>
                      {contract.status}
                    </Badge>
                    <div className="text-xs text-gray-500">
                      {contract.id}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{contract.name}</CardTitle>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Client & Location */}
                    <div className="flex items-center text-sm text-gray-600">
                      <Building className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{contract.client}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{contract.site}</span>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-gray-500">Capacity</div>
                        <div className="font-medium">{formatCapacity(contract.capacity)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Term</div>
                        <div className="font-medium">{contract.term} years</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Type</div>
                        <div className="font-medium">{contract.type}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Value</div>
                        <div className="font-medium text-green-600">{formatCurrency(contract.totalValue)}</div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      Created: {contract.uploadDate} | Effective: {contract.effectiveDate}
                    </div>

                    {/* Tags */}
                    {contract.tags && contract.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {contract.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {contract.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{contract.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                          onClick={() => handleDeleteContract(contract.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 px-3"
                        onClick={() => handleExportContract(contract)}
                        disabled={exportingContractId === contract.id}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        {exportingContractId === contract.id ? 'Exporting...' : 'Export'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractLibrary;