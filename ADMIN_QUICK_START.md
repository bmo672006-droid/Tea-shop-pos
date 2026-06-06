# Admin Management - Quick Start Guide

## What Was Added

A complete Admin Management system for pos-admin with role-based access control and comprehensive audit logging.

## Quick Facts

- **3 Admin Roles**: Super Admin, Manager, Counter
- **1 User Role**: Waiter
- **Audit Logging**: Every admin action is tracked with details
- **Role Hierarchy**: Super Admin > Manager > Counter > Waiter
- **RBAC**: Strict permission checks on all operations

## Role Capabilities Summary

| Feature | Super Admin | Manager | Counter | Waiter |
|---------|------------|---------|---------|--------|
| Create Admins | ✅ | ✅* | ❌ | ❌ |
| Manage Waiters | ✅ | ✅ | ✅ | ❌ |
| View Audit Logs | ✅ | ✅ | ❌ | ❌ |
| Process Payments | ✅ | ✅ | ✅ | ❌ |
| Manage Orders | ✅ | ✅ | ✅ | ✅ |

\* Manager can only create Manager and Counter admins, not Super Admin

## Database Changes

Added `AdminAuditLog` table to track:
- Who performed the action
- What action was performed
- Which user was affected
- What changed
- When it happened

## API Endpoints

### Create Admin
```bash
POST /api/users
{
  "email": "manager@example.com",
  "name": "John Manager",
  "pin": "1234",
  "role": "MANAGER"
}
```

### List Users
```bash
GET /api/users?role=WAITER
```

### Update User
```bash
PUT /api/users/{userId}
{
  "name": "Updated Name",
  "isActive": true
}
```

### Delete User
```bash
DELETE /api/users/{userId}
```

### View Audit Logs
```bash
GET /api/admin/audit-logs?limit=50&offset=0
```

### Get Admin Stats
```bash
GET /api/admin/stats
```

## Frontend Usage

### Using the Client Service
```typescript
import { userApi, auditApi, adminApi } from '@lib/admin/client';
import { useSession } from 'next-auth/react';

// In your component
const { data: session } = useSession();

// List all waiters
const waiters = await userApi.listWaiters(session?.user?.token);

// Create new admin
const newAdmin = await userApi.createUser({
  email: 'admin@example.com',
  name: 'New Admin',
  pin: '5678',
  role: 'MANAGER'
}, session?.user?.token);

// Deactivate user
await userApi.deactivateUser(userId, session?.user?.token);

// Get audit logs
const { data: logs } = await auditApi.getAuditLogs({
  limit: 50,
  token: session?.user?.token
});
```

### Using React Hooks
```typescript
import { useAdminUsers, useAuditLogs, useAdminStats } from '@lib/admin/hooks';

export function AdminDashboard() {
  const { users, createUser, deleteUser, loading } = useAdminUsers(token);
  const { logs, refresh: refreshLogs } = useAuditLogs({}, token);
  const { stats } = useAdminStats(token);

  return (
    <div>
      {/* Render users, logs, stats */}
    </div>
  );
}
```

## Key Features

### 1. Comprehensive Audit Logging
Every admin action is logged:
- CREATE_ADMIN / CREATE_WAITER
- UPDATE_ADMIN / UPDATE_WAITER
- DELETE_ADMIN / DELETE_WAITER
- ACTIVATE_ADMIN / ACTIVATE_WAITER
- DEACTIVATE_ADMIN / DEACTIVATE_WAITER

### 2. Role-Based Access Control
- Super Admins can manage all admins
- Managers can manage Managers and Counters (not Super Admins)
- Counters can only manage Waiters
- Waiters have no management capabilities

### 3. Data Validation
All inputs are validated:
- Email format validation
- PIN must be exactly 4 digits
- Name must be 2-100 characters
- Role must be valid

### 4. Self-Protection
- Users cannot deactivate themselves
- Users cannot delete themselves
- Prevents accidental self-lockout

### 5. Change Tracking
All modifications track:
- What was changed
- When it was changed
- Who changed it
- Full audit trail for compliance

## Common Tasks

### Create a New Manager
```typescript
await userApi.createUser({
  email: 'manager@restaurant.com',
  name: 'Sarah Manager',
  pin: '2024',
  role: 'MANAGER'
}, token);
```

### Deactivate a Waiter
```typescript
await userApi.deactivateUser(waiterId, token);
```

### View All Actions by an Admin
```typescript
const { data: logs } = await auditApi.getAdminActionLogs(adminId, 50, token);
```

### View All Actions on a User
```typescript
const { data: logs } = await auditApi.getUserAuditLogs(userId, 50, token);
```

### Get Management Dashboard Stats
```typescript
const stats = await adminApi.getStats(token);
console.log(stats.admins);    // Admin counts by role
console.log(stats.waiters);   // Waiter statistics
console.log(stats.recentAuditLogs); // Last 10 actions
```

## Error Handling

The API returns proper HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found
- `409`: Conflict (email already exists)
- `500`: Server error

Example error response:
```json
{
  "error": "Validation failed",
  "details": [
    "Email already exists",
    "PIN must be exactly 4 digits"
  ]
}
```

## Security Best Practices

1. **Always validate input** on the client before sending
2. **Check permissions** before showing UI elements
3. **Use tokens** from your auth system for API calls
4. **Never log actual PINs** (system automatically masks them)
5. **Verify permissions** on every critical operation
6. **Monitor audit logs** regularly
7. **Implement rate limiting** on production
8. **Use HTTPS** for all API calls

## File Locations

- **Utilities**: `lib/admin/` (audit.ts, rbac.ts, validation.ts)
- **API Routes**: `app/api/` (users, admin)
- **Frontend Helpers**: `lib/admin/client.ts`, `lib/admin/hooks.ts`
- **Database**: `prisma/schema.prisma` (AdminAuditLog model)
- **Documentation**: `ADMIN_MANAGEMENT.md` (full reference)

## Testing

1. Create a Super Admin user
2. Create a Manager as Super Admin
3. Try creating a Manager as Manager (should fail)
4. Create a Waiter as Manager (should succeed)
5. View audit logs to see the actions
6. Try unauthorized operations (should be rejected)
7. Check audit logs for all activities

## Troubleshooting

### "You don't have permission..."
- Check your role in the auth token
- Ensure you're using the right user account
- Verify the role hierarchy

### "Validation failed"
- Check email format
- PIN must be exactly 4 digits (0-9)
- Name must be 2-100 characters
- Role must be one of: SUPER_ADMIN, MANAGER, COUNTER, WAITER

### "Email already exists"
- Try a different email address
- Check if user already exists with that email

### Audit logs not appearing
- Ensure you have VIEW_AUDIT_LOGS permission (only Super Admin/Manager)
- Check if actions were actually performed
- Verify targetId or adminId parameters are correct

## Next Steps

1. **Frontend UI**: Create admin management interface using the provided hooks
2. **Permissions Display**: Show users what they can/cannot do
3. **Bulk Operations**: Add bulk create/delete functionality
4. **Reports**: Generate admin activity reports
5. **Notifications**: Notify admins of important actions
6. **API Rate Limiting**: Implement rate limiting for security
7. **Soft Deletes**: Change deletions to soft deletes for audit trail
8. **Data Export**: Export audit logs to CSV/Excel

## Support

For detailed API documentation, see [ADMIN_MANAGEMENT.md](./ADMIN_MANAGEMENT.md)

For component examples, check the hooks in [lib/admin/hooks.ts](./lib/admin/hooks.ts)
