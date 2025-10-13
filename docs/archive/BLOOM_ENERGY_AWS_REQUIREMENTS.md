# AWS Infrastructure Requirements Document
## Bloom Energy Contract Learning & Rules Management System

---

**Document Version:** 1.0
**Date:** September 2024
**Classification:** Confidential
**Prepared For:** Bloom Energy IT Infrastructure Team

---

## Executive Summary

This document outlines the complete AWS infrastructure requirements for deploying the Bloom Energy Contract Learning & Rules Management System within Bloom Energy's secure AWS environment. The system is designed to operate entirely within your ZScaler-protected network perimeter, with no data leaving the secure environment.

**Key Requirements:**
- Full AWS infrastructure within Bloom Energy's existing AWS Organization
- GitHub Enterprise repository for source code management
- AWS Bedrock or Anthropic Claude API access for AI capabilities
- Complete isolation within VPC with ZScaler integration
- No external data egress except to approved AI services

---

## 1. AWS Account & Organization Requirements

### 1.1 AWS Account Setup
```
Required:
- Dedicated AWS Account within Bloom Energy Organization
- Account Alias: bloom-energy-contracts-prod
- Region: us-west-2 (primary), us-east-1 (DR)
- Support Plan: Business or Enterprise
```

### 1.2 IAM Requirements
```
Service Accounts Needed:
1. bloom-contracts-deploy (CI/CD deployment)
2. bloom-contracts-app (Application runtime)
3. bloom-contracts-admin (Administrative access)
4. bloom-contracts-readonly (Monitoring/audit)
```

### 1.3 AWS Service Quotas
```
Minimum Quotas Required:
- VPC: 2
- ECS Tasks: 50
- RDS Instances: 3
- S3 Buckets: 10
- Lambda Functions: 20
- NAT Gateways: 4
```

---

## 2. Core AWS Services Requirements

### 2.1 Compute Services

#### Amazon ECS (Elastic Container Service)
```yaml
Service: ECS Fargate
Purpose: Container orchestration for application
Configuration:
  - Cluster Name: bloom-energy-contracts-cluster
  - Task Definition:
    - CPU: 2 vCPU minimum
    - Memory: 4 GB minimum
  - Service:
    - Desired Count: 2 (HA configuration)
    - Auto-scaling: 2-10 tasks based on CPU/Memory
  - Container Registry: Amazon ECR
    - Repository: bloom-energy-contracts
    - Lifecycle Policy: Keep last 10 images
```

#### AWS Lambda (Optional for async processing)
```yaml
Functions Needed:
  - contract-analyzer
  - document-processor
  - rule-extractor
Runtime: Node.js 20.x
Memory: 1024 MB
Timeout: 15 minutes
```

### 2.2 Database Services

#### Amazon RDS PostgreSQL
```yaml
Service: RDS for PostgreSQL
Version: 15.x
Configuration:
  Production:
    - Instance Class: db.r6g.xlarge
    - Storage: 500 GB SSD (gp3)
    - Multi-AZ: Yes
    - Backup Retention: 30 days
    - Encryption: AWS KMS (Customer Managed Key)
  Development:
    - Instance Class: db.t4g.medium
    - Storage: 100 GB SSD (gp3)
    - Multi-AZ: No
    - Backup Retention: 7 days
```

#### Amazon ElastiCache Redis
```yaml
Service: ElastiCache for Redis
Version: 7.x
Configuration:
  - Node Type: cache.r6g.large
  - Number of Nodes: 2 (Primary + Replica)
  - Automatic Failover: Enabled
  - Encryption: In-transit and at-rest
  - Backup Retention: 7 days
```

### 2.3 Storage Services

#### Amazon S3
```yaml
Buckets Required:
  1. bloom-energy-contracts-documents
     - Purpose: Document storage
     - Versioning: Enabled
     - Encryption: SSE-KMS
     - Lifecycle: Archive after 90 days

  2. bloom-energy-contracts-backups
     - Purpose: Database backups
     - Versioning: Enabled
     - Lifecycle: Delete after 90 days

  3. bloom-energy-contracts-logs
     - Purpose: Application logs
     - Lifecycle: Delete after 30 days

  4. bloom-energy-contracts-static
     - Purpose: Static assets (if needed)
     - CloudFront: Optional
```

### 2.4 Networking Services

#### Amazon VPC
```yaml
VPC Configuration:
  CIDR: 10.100.0.0/16

  Subnets:
    Private (Application):
      - us-west-2a: 10.100.1.0/24
      - us-west-2b: 10.100.2.0/24

    Private (Database):
      - us-west-2a: 10.100.10.0/24
      - us-west-2b: 10.100.11.0/24

    Public (NAT/ALB):
      - us-west-2a: 10.100.100.0/24
      - us-west-2b: 10.100.101.0/24

  NAT Gateways: 2 (one per AZ)
  Internet Gateway: 1
  VPC Endpoints:
    - S3
    - ECR
    - Secrets Manager
    - Bedrock (if available)
```

#### Application Load Balancer
```yaml
ALB Configuration:
  - Type: Application Load Balancer
  - Scheme: Internal (within VPC only)
  - Target Groups:
    - Protocol: HTTP
    - Port: 4003
    - Health Check: /api/health
  - SSL Certificate: AWS Certificate Manager
  - WAF: AWS WAF with OWASP rules
```

---

## 3. AI/ML Services Requirements

### 3.1 PRIMARY OPTION: AWS Bedrock (Recommended for ZScaler Environment)
```yaml
Service: AWS Bedrock
Models Required:
  - Anthropic Claude 3.5 Sonnet
  - Anthropic Claude 3 Haiku (for cost optimization)

Configuration:
  - VPC Endpoint: Required for private access
  - Model Access: Request access to Anthropic models
  - Guardrails: Configure content filtering
  - Usage Limits: Set monthly token limits

Estimated Usage:
  - Requests/Month: 10,000-50,000
  - Tokens/Month: 50M-200M
  - Cost Estimate: $2,000-$8,000/month
```

### 3.2 ALTERNATIVE: Anthropic Claude API (Direct)
```yaml
Service: Anthropic Claude API
Requirements:
  - API Key: Provided by Anthropic
  - Firewall Rules: Whitelist api.anthropic.com
  - Proxy Configuration: Through ZScaler

Security:
  - Store API Key in AWS Secrets Manager
  - Rotate keys quarterly
  - Monitor usage via CloudWatch
```

### 3.3 Document Processing (AWS Textract)
```yaml
Service: AWS Textract
Features Required:
  - Text Detection
  - Table Extraction
  - Form Extraction
  - Layout Analysis

Configuration:
  - Synchronous Processing: Documents < 10MB
  - Asynchronous Processing: Documents > 10MB
  - S3 Integration: Required for async
  - SNS Topics: For completion notifications
```

---

## 4. Security & Compliance Services

### 4.1 AWS Security Services
```yaml
Required Services:
  AWS KMS:
    - Customer Managed Keys for encryption
    - Key Rotation: Annual

  AWS Secrets Manager:
    - Database Credentials
    - API Keys
    - JWT Secrets
    - Automatic Rotation: 90 days

  AWS CloudTrail:
    - All API calls logging
    - S3 bucket for logs
    - CloudWatch integration

  AWS GuardDuty:
    - Threat detection
    - Anomaly detection
    - Integration with Security Hub

  AWS Security Hub:
    - Centralized security findings
    - Compliance checks
    - CIS Benchmarks
```

### 4.2 Network Security
```yaml
Security Groups:
  1. ALB Security Group:
     - Inbound: 443 from Bloom Energy network
     - Outbound: 4003 to App Security Group

  2. App Security Group:
     - Inbound: 4003 from ALB
     - Outbound:
       - 5432 to RDS
       - 6379 to Redis
       - 443 to Internet (via NAT)

  3. RDS Security Group:
     - Inbound: 5432 from App Security Group
     - Outbound: None

  4. Redis Security Group:
     - Inbound: 6379 from App Security Group
     - Outbound: None

NACLs:
  - Default deny all
  - Explicit allow for required traffic
```

### 4.3 ZScaler Integration
```yaml
Requirements from Bloom Energy:
  - ZScaler Cloud Connector configuration
  - SSL Inspection certificates
  - Proxy settings for outbound traffic
  - Whitelist for:
    - api.anthropic.com
    - *.amazonaws.com (for AWS services)
    - github.com (for CI/CD)
```

---

## 5. GitHub Enterprise Requirements

### 5.1 Repository Setup
```yaml
Organization: BloomEnergy
Repository: contract-rules-engine
Branch Protection:
  - main branch: Protected
  - Require PR reviews: 2 approvals
  - Require status checks
  - Dismiss stale reviews

Teams:
  - bloom-contracts-developers (Write access)
  - bloom-contracts-admins (Admin access)
  - bloom-contracts-readonly (Read access)
```

### 5.2 GitHub Actions Requirements
```yaml
Runners:
  - Self-hosted runners in AWS (recommended)
  - OR GitHub-hosted runners with AWS access

Secrets Required:
  - AWS_ACCOUNT_ID
  - AWS_ROLE_ARN (for OIDC)
  - ECR_REGISTRY
  - SONAR_TOKEN (if using SonarQube)

Workflows:
  - CI: On every PR
  - CD: On merge to main
  - Security Scanning: Daily
  - Dependency Updates: Weekly
```

### 5.3 GitHub Advanced Security
```yaml
Features Required:
  - Code scanning (CodeQL)
  - Secret scanning
  - Dependency scanning
  - Security advisories
  - Branch protection rules
```

---

## 6. Monitoring & Observability

### 6.1 Amazon CloudWatch
```yaml
Metrics:
  - Custom application metrics
  - API latency and error rates
  - Database connection pool
  - AI API usage and costs

Alarms:
  - High error rate (>5%)
  - High latency (>2s)
  - Database CPU (>80%)
  - AI API failures
  - Cost threshold exceeded

Log Groups:
  - /aws/ecs/bloom-contracts
  - /aws/lambda/contract-processor
  - /aws/rds/bloom-contracts

Dashboards:
  - Application Performance
  - Infrastructure Health
  - AI Usage & Costs
  - Security Events
```

### 6.2 AWS X-Ray
```yaml
Configuration:
  - Service Map: Full application tracing
  - Sampling Rate: 10% (adjustable)
  - Trace retention: 30 days
  - Integration: ECS, Lambda, RDS
```

---

## 7. Backup & Disaster Recovery

### 7.1 AWS Backup
```yaml
Backup Plan:
  RDS:
    - Daily snapshots
    - Retention: 30 days
    - Cross-region copy to us-east-1

  S3:
    - Cross-region replication
    - Versioning enabled

  EBS Volumes:
    - Daily snapshots
    - Retention: 7 days
```

### 7.2 Disaster Recovery Strategy
```yaml
RPO: 1 hour
RTO: 4 hours

DR Configuration:
  - Backup Region: us-east-1
  - Database: Read replica in DR region
  - S3: Cross-region replication
  - Route 53: Health checks and failover
```

---

## 8. DevOps & CI/CD Pipeline

### 8.1 AWS CodePipeline (Alternative to GitHub Actions)
```yaml
Pipeline Stages:
  1. Source:
     - GitHub Enterprise webhook

  2. Build:
     - AWS CodeBuild
     - Docker image creation
     - Unit tests
     - Security scanning

  3. Test:
     - Integration tests
     - Load testing
     - Security testing

  4. Deploy to Staging:
     - ECS Blue/Green deployment
     - Smoke tests

  5. Approval:
     - Manual approval gate

  6. Deploy to Production:
     - ECS Blue/Green deployment
     - Health checks
```

### 8.2 Infrastructure as Code
```yaml
AWS CDK or Terraform:
  - All infrastructure defined as code
  - Version controlled in Git
  - Automated deployment via pipeline
  - Environment separation (dev/staging/prod)
```

---

## 9. Cost Estimation

### 9.1 Monthly AWS Costs (Estimated)

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| **ECS Fargate** | 2 tasks × 2vCPU × 4GB | $150 |
| **RDS PostgreSQL** | db.r6g.xlarge Multi-AZ | $850 |
| **ElastiCache Redis** | cache.r6g.large × 2 nodes | $320 |
| **S3 Storage** | 1TB storage + requests | $50 |
| **Data Transfer** | 500GB/month | $45 |
| **ALB** | 1 ALB + traffic | $30 |
| **NAT Gateway** | 2 NAT Gateways | $90 |
| **CloudWatch** | Logs, metrics, dashboards | $100 |
| **Secrets Manager** | 20 secrets | $20 |
| **AWS Backup** | Snapshots and storage | $50 |
| **AWS Bedrock** | 100M tokens/month | $3,000 |
| **AWS Textract** | 10,000 pages/month | $150 |
| **AWS WAF** | Rules and requests | $30 |
| **VPC Endpoints** | 5 endpoints | $35 |
| **AWS KMS** | Keys and requests | $10 |
| **AWS X-Ray** | Traces | $25 |
| **Contingency** | 20% buffer | $981 |
| **TOTAL ESTIMATED** | | **~$5,886/month** |

*Note: Costs will vary based on actual usage, especially for AI services*

---

## 10. Access Requirements from Development Team

### 10.1 AWS Console Access
```yaml
Required IAM Permissions:
  Developers:
    - Read access to all services
    - Write access to development environment
    - No production write access

  DevOps:
    - Full access to development
    - Limited write access to production
    - CloudWatch and X-Ray full access

  Support:
    - Read-only access
    - CloudWatch dashboard access
    - Support case management
```

### 10.2 Programmatic Access
```yaml
API Keys/Credentials Needed:
  - AWS CLI credentials (temporary via SSO)
  - GitHub Personal Access Tokens
  - Docker Registry credentials
  - Monitoring dashboard access
```

### 10.3 VPN/Network Access
```yaml
Requirements:
  - VPN access to Bloom Energy network
  - ZScaler client configuration
  - SSH bastion host (if needed)
  - Database proxy access for debugging
```

---

## 11. Implementation Timeline

### Phase 1: Foundation 
- [ ] AWS account provisioning
- [ ] VPC and network setup
- [ ] IAM roles and policies
- [ ] GitHub Enterprise repository
- [ ] Basic security configuration

### Phase 2: Core Infrastructure 
- [ ] RDS PostgreSQL setup
- [ ] ElastiCache Redis setup
- [ ] S3 buckets configuration
- [ ] ECS cluster setup
- [ ] ALB configuration

### Phase 3: AI/ML Integration 
- [ ] AWS Bedrock setup OR Anthropic API integration
- [ ] AWS Textract configuration
- [ ] VPC endpoints for AI services
- [ ] Cost monitoring setup

### Phase 4: Application Deployment 
- [ ] Container registry setup
- [ ] CI/CD pipeline configuration
- [ ] Application deployment
- [ ] Health checks and monitoring
- [ ] Security scanning setup

### Phase 5: Production Readiness 
- [ ] Load testing
- [ ] Security audit
- [ ] Disaster recovery testing
- [ ] Documentation completion
- [ ] Training and handover

---

## 12. Action Items for Bloom Energy IT

### Immediate Actions Required:

1. **AWS Account Setup**
   - Create dedicated AWS account
   - Configure AWS Organizations
   - Set up AWS SSO

2. **Network Configuration**
   - Configure ZScaler for AWS access
   - Whitelist required domains
   - Set up VPN access for development team

3. **GitHub Enterprise**
   - Create organization and repository
   - Configure teams and permissions
   - Enable GitHub Advanced Security

4. **AI Services Decision**
   - Choose between AWS Bedrock or Anthropic API
   - Provision API keys or enable Bedrock
   - Set usage limits and monitoring

5. **Access Provisioning**
   - Create IAM users/roles for team
   - Provide temporary credentials
   - Set up monitoring access

6. **Security Review**
   - Review security requirements
   - Configure compliance policies
   - Set up audit logging

---

## 13. Support & Maintenance

### 13.1 AWS Support
```yaml
Recommended Support Plan: Business or Enterprise
Benefits:
  - 24/7 technical support
  - Architecture reviews
  - Cost optimization reviews
  - Security best practices
```

### 13.2 Ongoing Maintenance
```yaml
Monthly Tasks:
  - Security patches
  - Cost optimization review
  - Performance tuning
  - Backup verification

Quarterly Tasks:
  - Security audit
  - Disaster recovery test
  - Capacity planning
  - Architecture review
```

---

## 14. Compliance & Regulatory

### 14.1 Compliance Requirements
```yaml
Standards to Meet:
  - SOC 2 Type II
  - ISO 27001
  - GDPR (if applicable)
  - Industry-specific regulations

AWS Compliance Services:
  - AWS Artifact for compliance reports
  - AWS Config for compliance monitoring
  - AWS Audit Manager for audit preparation
```

### 14.2 Data Governance
```yaml
Data Classification:
  - Contracts: Highly Confidential
  - Customer Data: Confidential
  - System Logs: Internal Use

Data Retention:
  - Production Data: 7 years
  - Backups: 90 days
  - Logs: 30 days
  - Audit Trails: 7 years
```

---

## 15. Contact Information

### Development Team Contacts:
```
Project Lead: [To be provided]
Technical Lead: [To be provided]
DevOps Lead: [To be provided]
Security Lead: [To be provided]
```

### Bloom Energy IT Contacts:
```
AWS Account Owner: [To be assigned]
Network Administrator: [To be assigned]
Security Team Lead: [To be assigned]
GitHub Administrator: [To be assigned]
```

---

## Appendix A: Security Checklist

- [ ] All data encrypted at rest (KMS)
- [ ] All data encrypted in transit (TLS 1.2+)
- [ ] No hard-coded credentials
- [ ] Secrets in AWS Secrets Manager
- [ ] VPC with private subnets
- [ ] Security groups properly configured
- [ ] WAF rules implemented
- [ ] CloudTrail logging enabled
- [ ] GuardDuty activated
- [ ] Security Hub configured
- [ ] Backup encryption enabled
- [ ] MFA for all human users
- [ ] Least privilege IAM policies
- [ ] Regular security scanning
- [ ] Incident response plan documented

---

## Appendix B: Useful AWS Documentation Links

1. [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
2. [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)
3. [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
4. [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
5. [AWS Cost Optimization](https://aws.amazon.com/cost-optimization/)

---

## Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Bloom Energy IT Manager | | | |
| Bloom Energy Security Lead | | | |
| Development Team Lead | | | |
| AWS Solutions Architect | | | |

---

**END OF DOCUMENT**

*This document contains confidential information and is proprietary to Bloom Energy Corporation.*