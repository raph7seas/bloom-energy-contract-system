# API Documentation

## Base URL
```
Development: http://localhost:3001/api
Production: https://your-domain.com/api
```

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Response Format
All API responses follow this structure:
```json
{
  "success": true,
  "data": {},
  "error": null,
  "timestamp": "2025-09-10T00:00:00.000Z"
}
```

## Endpoints

### Health & Status
#### GET /health
Get system health status
- **Auth Required**: No
- **Response**: 200 OK
```json
{
  "status": "healthy",
  "timestamp": "2025-09-10T00:00:00.000Z",
  "database": "connected",
  "version": "1.0.0",
  "uptime": 12345.67
}
```

### Authentication
#### POST /auth/register
Register a new user
- **Auth Required**: No
- **Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### POST /auth/login
Authenticate user
- **Auth Required**: No
- **Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```
- **Response**: 200 OK
```json
{
  "token": "jwt_token_here",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "USER"
  }
}
```

### Contracts
#### GET /contracts
List all contracts
- **Auth Required**: Optional
- **Query Parameters**:
  - `page` (default: 1)
  - `limit` (default: 10)
  - `search` (optional)
  - `status` (optional)

#### POST /contracts
Create a new contract
- **Auth Required**: Yes
- **Body**: Contract object with all required fields

#### GET /contracts/:id
Get contract by ID
- **Auth Required**: Optional
- **Response**: Contract object

#### PUT /contracts/:id
Update contract
- **Auth Required**: Yes
- **Body**: Updated contract fields

#### DELETE /contracts/:id
Delete contract
- **Auth Required**: Yes
- **Response**: 204 No Content

### AI Services
#### POST /ai/chat
Chat with AI assistant
- **Auth Required**: Optional
- **Body**:
```json
{
  "message": "Your question here",
  "context": "optional context",
  "modelId": "claude-3-sonnet"
}
```

#### GET /ai/health
Get AI service status
- **Auth Required**: No
- **Response**: AI service health information

#### GET /ai/analytics
Get AI usage analytics
- **Auth Required**: Optional
- **Query Parameters**:
  - `startDate` (optional)
  - `endDate` (optional)
  - `modelId` (optional)

### Rule Management
#### GET /rules
List learned rules
- **Auth Required**: Yes
- **Query Parameters**:
  - `category` (optional)
  - `ruleType` (optional)
  - `minConfidence` (default: 0)
  - `page` (default: 1)
  - `limit` (default: 20)

#### POST /rules/extract/:contractId
Extract rules from contract
- **Auth Required**: Yes
- **Body**:
```json
{
  "options": {
    "categories": ["financial", "technical"],
    "threshold": 0.7
  }
}
```

#### POST /rules/validate/:contractId
Validate contract against rules
- **Auth Required**: Yes
- **Response**: Validation results

#### GET /rules/statistics
Get rule statistics
- **Auth Required**: Yes
- **Response**: Analytics data

### File Upload
#### POST /uploads/single
Upload single file
- **Auth Required**: Optional
- **Content-Type**: multipart/form-data
- **Form Fields**:
  - `file`: File to upload
  - `contractId`: Optional contract ID
  - `description`: Optional description

#### POST /uploads/multiple
Upload multiple files
- **Auth Required**: Optional
- **Content-Type**: multipart/form-data

#### GET /uploads/:id/content
Get extracted file content
- **Auth Required**: Optional
- **Response**: Extracted text and metadata

### Audit & Version Control
#### GET /audit/trail/:entityType/:entityId
Get audit trail for entity
- **Auth Required**: Yes
- **Query Parameters**:
  - `page` (default: 1)
  - `limit` (default: 50)
  - `actions` (optional, comma-separated)
  - `startDate` (optional)
  - `endDate` (optional)

#### GET /audit/versions/:entityType/:entityId
Get version history
- **Auth Required**: Yes
- **Response**: List of versions

#### POST /audit/rollback/:versionId
Rollback to specific version (Admin only)
- **Auth Required**: Yes (Admin)
- **Body**:
```json
{
  "reason": "Reverting incorrect changes"
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400  | Bad Request - Invalid input |
| 401  | Unauthorized - Missing/invalid token |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource not found |
| 409  | Conflict - Duplicate resource |
| 422  | Validation Error - Invalid data |
| 429  | Rate Limited - Too many requests |
| 500  | Internal Server Error |

## Error Response Format
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "details": []
  },
  "timestamp": "2025-09-10T00:00:00.000Z",
  "path": "/api/endpoint",
  "method": "POST"
}
```

## Rate Limits
- Default: 100 requests per 15 minutes per IP
- File uploads: 10 requests per minute
- AI endpoints: 20 requests per minute

## File Upload Limits
- Max file size: 10MB
- Supported formats: PDF, DOCX, DOC, TXT, JSON, JPG, PNG, GIF, WEBP
- Max files per request: 5

## Pagination
Standard pagination format:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```