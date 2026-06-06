# Admin Management System - Documentation

## Overview

The Admin Management System provides comprehensive role-based access control (RBAC) with three administrative roles and one standard user role:

- **Super Admin**: Full access to all features including admin management
- **Manager**: Can manage most features except cannot manage Super Admins
- **Counter**: Can manage orders, tables, payments, and waiters
- **Waiter**: Can only create and manage orders

## Role Permissions

### Super Admin
- ✅ Manage Admins (create, update, delete all roles)
- ✅ Manage Waiters
- ✅ View Audit Logs
- ✅ Manage Orders
- ✅ Manage Menu
- ✅ Manage Tables
- ✅ Process Payments
- ✅ View Reports

### Manager
- ✅ Manage Waiters
- ✅ View Audit Logs
- ✅ Manage Orders
- ✅ Manage Menu
- ✅ Manage Tables
- ✅ Process Payments
- ✅ View Reports
- ❌ Cannot manage Super Admins
- ❌ Can only manage or demote Manager/Counter roles

### Counter
- ✅ Manage Waiters
- ✅ Manage Orders
- ✅ Manage Tables
- ✅ Process Payments
- ❌ Cannot manage any admin roles
- ❌ Cannot view admin-only features

### Waiter
- ✅ Manage Orders
- ❌ Cannot manage other users
- ❌ Cannot access admin features

## API Endpoints

### User Management

#### List Users
```
GET /api/users
```

Query Parameters:
- `role` (optional): Filter by role (SUPER_ADMIN, MANAGER, COUNTER, WAITER)

Response:
```json
[
  {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "John Doe",
    "role": "SUPER_ADMIN",
    "isActive": true,
    "restaurantId": "default",
    "createdAt": "2026-05-17T00:00:00Z",
    "updatedAt": "2026-05-17T00:00:00Z"
  }
]
```

#### Create User/Admin
```
POST /api/users
```

Request Body:
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "pin": "1234",
  "role": "MANAGER"
}
```

Response:
```json
{
  "id": "uuid",
  "email": "newuser@example.com",
  "name": "New User",
  "role": "MANAGER",
  "isActive": true,
  "restaurantId": "default",
  "createdAt": "2026-05-17T00:00:00Z"
}
```

#### Get User
```
GET /api/users/{userId}
```

Response:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "WAITER",
  "isActive": true,
  "restaurantId": "default",
  "createdAt": "2026-05-17T00:00:00Z",
  "updatedAt": "2026-05-17T00:00:00Z"
}
```

#### Update User
```
PUT /api/users/{userId}
```

Request Body (all fields optional):
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "pin": "5678",
  "role": "COUNTER",
  "isActive": false
}
```

Response: Updated user object

#### Delete User
```
DELETE /api/users/{userId}
```

Response:
```json
{
  "success": true
}
```

### Audit Logs

#### Get Admin Audit Logs
```
GET /api/admin/audit-logs
```

Query Parameters:
- `adminId` (optional): Filter by admin who performed action
- `targetId` (optional): Filter by target user
- `limit` (optional, default: 100, max: 500): Number of records
- `offset` (optional, default: 0): Pagination offset

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "adminId": "admin-uuid",
      "action": "CREATE_ADMIN",
      "targetId": "target-uuid",
      "targetRole": "MANAGER",
      "changes": "{...}",
      "details": "Created new admin: John Doe (john@example.com) with role MANAGER",
      "timestamp": "2026-05-17T00:00:00Z",
      "admin": {
        "id": "admin-uuid",
        "name": "Super Admin",
        "email": "superadmin@example.com",
        "role": "SUPER_ADMIN"
      }
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0
  }
}
```

### Admin Management Stats
```
GET /api/admin/stats
```

Response:
```json
{
  "admins": [
    {
      "role": "SUPER_ADMIN",
      "count": 1,
      "description": "Super Admin - Full access to all features"
    },
    {
      "role": "MANAGER",
      "count": 2,
      "description": "Manager - Can manage all users except Super Admin, and all features except admin management"
    }
  ],
  "waiters": {
    "total": 10,
    "active": 8,
    "inactive": 2
  },
  "recentAuditLogs": [...]
}
```

## Audit Log Actions

The system logs the following admin actions:

- `CREATE_ADMIN`: Admin created a new admin user
- `UPDATE_ADMIN`: Admin updated another admin's details
- `DELETE_ADMIN`: Admin deleted another admin
- `DEACTIVATE_ADMIN`: Admin deactivated another admin
- `ACTIVATE_ADMIN`: Admin activated another admin
- `CREATE_WAITER`: Admin created a new waiter
- `UPDATE_WAITER`: Admin updated a waiter's details
- `DELETE_WAITER`: Admin deleted a waiter
- `DEACTIVATE_WAITER`: Admin deactivated a waiter
- `ACTIVATE_WAITER`: Admin activated a waiter

## Usage Examples

### Creating a Super Admin
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "email": "superadmin@example.com",
    "name": "Super Admin",
    "pin": "0000",
    "role": "SUPER_ADMIN"
  }'
```

### Listing All Admins
```bash
curl -X GET "http://localhost:3000/api/users?role=MANAGER" \
  -H "Authorization: Bearer <token>"
```

### Deactivating a User
```bash
curl -X PUT http://localhost:3000/api/users/<userId> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"isActive": false}'
```

### Viewing Admin Audit Logs
```bash
curl -X GET "http://localhost:3000/api/admin/audit-logs?limit=50&offset=0" \
  -H "Authorization: Bearer <token>"
```

## Validation Rules

### Email
- Required
- Must be a valid email format
- Must be unique across the system

### PIN
- Required
- Must be exactly 4 digits
- Must contain only numeric characters

### Name
- Required
- Minimum 2 characters
- Maximum 100 characters

### Role
- Must be one of: SUPER_ADMIN, MANAGER, COUNTER, WAITER
- Only Super Admin can create Super Admin and Manager roles
- Only Manager and Super Admin can create Counter and Waiter roles

## Security Features

1. **Role-Based Access Control (RBAC)**: Strict permission checks for all admin operations
2. **Audit Logging**: All admin actions are logged with details about what changed
3. **PIN Protection**: 4-digit PINs for user authentication
4. **Self-Protection**: Users cannot deactivate or delete themselves
5. **Hierarchical Role Management**: Lower roles cannot manage higher roles
6. **Change Tracking**: All modifications are tracked with before/after states

## Error Responses

### 401 Unauthorized
```json
{ "error": "Unauthorized" }
```

### 403 Forbidden
```json
{ "error": "Forbidden: You don't have permission to..." }
```

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": ["Email already exists", "PIN must be exactly 4 digits"]
}
```

### 404 Not Found
```json
{ "error": "User not found" }
```

### 409 Conflict
```json
{ "error": "Email already exists" }
```

## Implementation Details

### Files Created/Modified

1. **Database Schema** (`prisma/schema.prisma`)
   - Added `AdminAuditLog` model for tracking admin actions
   - Updated `User` model role field documentation

2. **Admin Audit** (`lib/admin/audit.ts`)
   - Functions for logging admin actions
   - Queries for retrieving audit logs

3. **RBAC** (`lib/admin/rbac.ts`)
   - Permission checking functions
   - Role descriptions and permissions mapping

4. **Validation** (`lib/admin/validation.ts`)
   - Input validation for admin operations
   - Email, PIN, and role validators

5. **API Routes**
   - `/api/users` - User CRUD operations
   - `/api/users/{userId}` - Individual user management
   - `/api/admin/audit-logs` - View admin audit logs
   - `/api/admin/stats` - Admin management statistics

## Best Practices

1. **Always log admin actions**: Use the audit logging functions when performing admin operations
2. **Validate input**: Use validation functions before processing user input
3. **Check permissions first**: Always verify user has required permissions before performing operations
4. **Use role hierarchies**: When checking permissions, consider role hierarchy
5. **Track changes**: Log what changed and why for better auditability
6. **Protect self**: Never allow users to deactivate or delete themselves
7. **Secure PINs**: Never log actual PINs, use placeholders in audit logs
