import { PrismaClient } from './generated/prisma/index.js';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

const uploads = await prisma.uploadedFile.findMany({
  orderBy: { uploadDate: 'desc' },
  take: 10,
  select: {
    fileName: true,
    uploadDate: true,
    extractedData: true
  }
});

console.log('\n📊 Last 10 uploads:\n');
uploads.forEach((u, i) => {
  const hasData = u.extractedData !== null;
  const data = hasData ? (typeof u.extractedData === 'string' ? JSON.parse(u.extractedData) : u.extractedData) : null;

  // Handle both data structures
  const rules = data ? (data.analysis?.extractedRules || data.extractedData?.businessRules || data.businessRules || []).length : 0;
  const structured = data?.structuredExtraction || data?.analysis?.structuredExtraction;

  console.log(`[${i+1}] ${u.fileName.substring(0, 70)}`);
  console.log(`    Date: ${u.uploadDate.toLocaleString()}`);
  console.log(`    Has Data: ${hasData ? 'YES' : 'NO'}`);
  console.log(`    Rules: ${rules}`);

  if (structured) {
    console.log(`    ✅ Doc Type: ${structured.documentType} (${Math.round(structured.confidence * 100)}%)`);
  }
  console.log();
});

await prisma.$disconnect();
