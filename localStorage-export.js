/**
 * Bloom Energy Contract System - LocalStorage Export Utility
 * 
 * This script helps users export their localStorage data from the browser
 * so it can be migrated to the PostgreSQL database.
 * 
 * USAGE:
 * 1. Open your browser's Developer Tools (F12)
 * 2. Go to the Console tab
 * 3. Navigate to the Bloom Energy Contract System in your browser
 * 4. Copy and paste this entire script into the console and press Enter
 * 5. The script will download your data as a JSON file
 * 
 * Alternatively, copy the JSON data from the console and save it manually.
 */

(function exportBloomEnergyData() {
  console.log('🚀 Bloom Energy Contract System - LocalStorage Export');
  console.log('===============================================');
  
  try {
    // Extract all localStorage data for Bloom Energy Contract System
    const exportData = {};
    let hasData = false;
    
    // Check for contracts
    const contractsKey = 'bloom-contracts';
    const contractsData = localStorage.getItem(contractsKey);
    if (contractsData) {
      try {
        exportData.contracts = JSON.parse(contractsData);
        console.log(`✅ Found ${exportData.contracts.length} contracts`);
        hasData = true;
      } catch (error) {
        console.warn('⚠️  Could not parse contracts data:', error);
      }
    } else {
      console.log('ℹ️  No contracts found in localStorage');
      exportData.contracts = [];
    }
    
    // Check for templates
    const templatesKey = 'bloom-templates';
    const templatesData = localStorage.getItem(templatesKey);
    if (templatesData) {
      try {
        exportData.templates = JSON.parse(templatesData);
        console.log(`✅ Found ${exportData.templates.length} templates`);
        hasData = true;
      } catch (error) {
        console.warn('⚠️  Could not parse templates data:', error);
      }
    } else {
      console.log('ℹ️  No templates found in localStorage');
      exportData.templates = [];
    }
    
    // Check for learned rules
    const rulesKey = 'bloom-learned-rules';
    const rulesData = localStorage.getItem(rulesKey);
    if (rulesData) {
      try {
        exportData.learnedRules = JSON.parse(rulesData);
        console.log(`✅ Found ${exportData.learnedRules.length} learned rules`);
        hasData = true;
      } catch (error) {
        console.warn('⚠️  Could not parse learned rules data:', error);
      }
    } else {
      console.log('ℹ️  No learned rules found in localStorage');
      exportData.learnedRules = [];
    }
    
    // Check for other relevant data
    const otherKeys = [
      'bloom-settings',
      'bloom-user-preferences',
      'bloom-ai-interactions',
      'bloom-validation-rules',
      'bloom-contract-templates'
    ];
    
    otherKeys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          exportData[key.replace('bloom-', '')] = parsed;
          console.log(`✅ Found additional data: ${key}`);
          hasData = true;
        } catch (error) {
          console.warn(`⚠️  Could not parse ${key}:`, error);
        }
      }
    });
    
    if (!hasData) {
      console.log('❌ No Bloom Energy data found in localStorage');
      console.log('Make sure you are on the correct website and have used the application.');
      return;
    }
    
    // Add metadata
    exportData.exportMetadata = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'localStorage',
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    // Convert to JSON
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Display in console for manual copy
    console.log('\n📋 Your data is ready! You can:');
    console.log('1. Use the downloadable file (if supported by your browser)');
    console.log('2. Copy the JSON data below and save it to a file\n');
    
    console.log('=== JSON DATA START ===');
    console.log(jsonString);
    console.log('=== JSON DATA END ===');
    
    // Try to trigger automatic download
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bloom-energy-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('💾 File download started! Check your downloads folder.');
    } catch (error) {
      console.log('⚠️  Automatic download not available. Please copy the JSON data above manually.');
    }
    
    // Show summary
    console.log('\n📊 Export Summary:');
    console.log(`- Contracts: ${exportData.contracts.length}`);
    console.log(`- Templates: ${exportData.templates.length}`);
    console.log(`- Learned Rules: ${exportData.learnedRules.length}`);
    console.log(`- Export Date: ${exportData.exportMetadata.timestamp}`);
    
    // Instructions for next steps
    console.log('\n🔄 Next Steps:');
    console.log('1. Save the JSON data to a file (if not auto-downloaded)');
    console.log('2. Run the migration script on your server:');
    console.log('   npm run migrate');
    console.log('3. Follow the prompts to import your data');
    
    return exportData;
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    console.log('Please try refreshing the page and running the script again.');
    return null;
  }
})();

// Alternative function for manual use
window.exportBloomEnergyData = function() {
  console.log('Running Bloom Energy data export...');
  return exportBloomEnergyData();
};

console.log('\n💡 Tip: You can run this script again anytime by typing: exportBloomEnergyData()');