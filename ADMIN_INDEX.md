# Admin Management System Index

Welcome to the Admin Management System for POS Admin! This document serves as the central hub for all admin management features.

## 📚 Documentation

### Quick Start
Start here if you're new to the system:
- **[Quick Start Guide](./ADMIN_QUICK_START.md)** - Get up and running in 5 minutes
  - Role capabilities summary
  - Common API calls
  - React hooks examples
  - Troubleshooting

### Complete Reference
Detailed information for everything:
- **[Admin Management Reference](./ADMIN_MANAGEMENT.md)** - Full API and feature documentation
  - All role permissions
  - Complete API endpoints
  - Validation rules
  - Error responses
  - Security features

### Technical Details
Implementation and architecture details:
- **[Files Reference](./ADMIN_FILES_REFERENCE.md)** - What files were created/modified
  - File-by-file breakdown
  - Architecture overview
  - Type definitions
  - Permission matrix

## 🎯 Quick Access

### For Frontend Developers
- Use **[lib/admin/client.ts](./lib/admin/client.ts)** for API calls
- Use **[lib/admin/hooks.ts](./lib/admin/hooks.ts)** for React components
- See **[ADMIN_QUICK_START.md](./ADMIN_QUICK_START.md)** for examples

### For Backend Developers
- API routes in **[app/api/users/](./app/api/users/)**
- API routes in **[app/api/admin/](./app/api/admin/)**
- Utilities in **[lib/admin/](./lib/admin/)**
- Database schema in **[prisma/schema.prisma](./prisma/schema.prisma)**

### For DevOps
- Run migration: `npx prisma migrate dev`
- Generate client: `npx prisma generate`
- View database: `npx prisma studio`

## 🔐 Role System

```
┌─────────────────────────────────────────┐
│         Super Admin (Full Access)        │
│  Creates/Manages all roles and features │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│    Manager (Most Features)              │
│  Cannot manage Super Admins or higher   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│    Counter (Limited Features)           │
│  Can only manage waiters and orders     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│    Waiter (Order Only)                  │
│  Can only create and manage orders      │
└─────────────────────────────────────────┘
```

## 📋 Features

### ✅ Implemented

- [x] Three admin roles (Super Admin, Manager, Counter)
- [x] Role-based access control on all endpoints
- [x] Create, read, update, delete users
- [x] Admin audit logging for all actions
- [x] Input validation (email, PIN, name, role)
- [x] Self-protection (can't delete/deactivate yourself)
- [x] Role hierarchy enforcement
- [x] Change tracking with details
- [x] Audit log querying and filtering
- [x] Admin statistics dashboard
- [x] React hooks for frontend
- [x] API client service
- [x] TypeScript types
- [x] Comprehensive documentation

### 🔄 API Endpoints

```
Users Management:
  GET    /api/users                 List users with filtering
  POST   /api/users                 Create user/admin
  GET    /api/users/{userId}        Get single user
  PUT    /api/users/{userId}        Update user
  DELETE /api/users/{userId}        Delete user

Admin Features:
  GET    /api/admin/audit-logs      View audit logs
  GET    /api/admin/stats           Get management stats
```

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd pos-admin
npx prisma migrate dev
```

### 2. Create First Admin
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "email": "superadmin@example.com",
    "name": "Super Admin",
    "pin": "0000",
    "role": "SUPER_ADMIN"
  }'
```

### 3. List Users
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer <your-token>"
```

### 4. In React Component
```typescript
import { useAdminUsers } from '@lib/admin/hooks';
import { useSession } from 'next-auth/react';

export function AdminPage() {
  const { data: session } = useSession();
  const { users, createUser } = useAdminUsers(session?.user?.token);
  
  return (
    <div>
      {users.map(user => <div key={user.id}>{user.name}</div>)}
    </div>
  );
}
```

## 📊 Audit Logging

Every action is logged with:
- **Who**: Which admin performed the action
- **What**: The type of action (CREATE, UPDATE, DELETE, etc.)
- **Where**: Which user was affected
- **When**: Timestamp of the action
- **How**: Details of what changed

### Logged Actions
- `CREATE_ADMIN` / `CREATE_WAITER`
- `UPDATE_ADMIN` / `UPDATE_WAITER`
- `DELETE_ADMIN` / `DELETE_WAITER`
- `ACTIVATE_ADMIN` / `ACTIVATE_WAITER`
- `DEACTIVATE_ADMIN` / `DEACTIVATE_WAITER`

## 🔒 Security

1. **Authentication**: Token-based with Better Auth
2. **Authorization**: RBAC on all endpoints
3. **Validation**: Input validation on all fields
4. **Audit**: Complete audit trail of all actions
5. **Protection**: Self-deletion prevention
6. **Encryption**: PINs masked in logs
7. **Hierarchy**: Role hierarchy enforcement

## 🐛 Troubleshooting

### "Forbidden: You don't have permission"
→ Check your role has the required permission  
→ See [Quick Start](./ADMIN_QUICK_START.md#troubleshooting)

### "Validation failed"
→ Check email format, PIN is 4 digits, name is 2-100 chars  
→ See [Validation Rules](./ADMIN_MANAGEMENT.md#validation-rules)

### "Email already exists"
→ Use a different email address

### Audit logs not appearing
→ Only Super Admin/Manager can view  
→ Confirm action was actually performed

See full troubleshooting in [Quick Start Guide](./ADMIN_QUICK_START.md#troubleshooting)

## 📝 Validation Rules

| Field | Rules |
|-------|-------|
| Email | Valid format, unique across system |
| PIN | Exactly 4 digits (0-9) |
| Name | 2-100 characters, non-empty |
| Role | One of: SUPER_ADMIN, MANAGER, COUNTER, WAITER |

## 🔄 API Response Patterns

### Success
```json
// GET single or PUT/DELETE returns user/object
{
  "id": "uuid",
  "name": "User Name",
  ...
}

// GET list returns array
[
  { "id": "uuid", ... },
  { "id": "uuid", ... }
]
```

### Error
```json
{
  "error": "Error message",
  "details": ["Optional", "validation", "errors"]
}
```

## 📚 Files Overview

| File | Purpose |
|------|---------|
| `lib/admin/audit.ts` | Audit logging functions |
| `lib/admin/rbac.ts` | Role-based access control |
| `lib/admin/validation.ts` | Input validation |
| `lib/admin/client.ts` | Frontend API client |
| `lib/admin/hooks.ts` | React hooks |
| `app/api/users/*` | User management endpoints |
| `app/api/admin/*` | Admin features endpoints |
| `prisma/schema.prisma` | Database schema |

See [Files Reference](./ADMIN_FILES_REFERENCE.md) for complete details

## 🎓 Learning Path

1. **Day 1**: Read [Quick Start](./ADMIN_QUICK_START.md)
2. **Day 2**: Review [Full Reference](./ADMIN_MANAGEMENT.md)
3. **Day 3**: Explore [Files Reference](./ADMIN_FILES_REFERENCE.md)
4. **Day 4**: Build UI components using hooks
5. **Day 5**: Test all features with different roles

## 💡 Common Use Cases

### Create a Manager
See: [ADMIN_QUICK_START.md#create-a-new-manager](./ADMIN_QUICK_START.md#create-a-new-manager)

### List Waiters
See: [ADMIN_QUICK_START.md#common-tasks](./ADMIN_QUICK_START.md#common-tasks)

### View Audit Trail
See: [ADMIN_QUICK_START.md#view-all-actions-by-an-admin](./ADMIN_QUICK_START.md#view-all-actions-by-an-admin)

### Deactivate User
See: [ADMIN_QUICK_START.md#deactivate-a-waiter](./ADMIN_QUICK_START.md#deactivate-a-waiter)

## 🚦 Status

✅ **Complete and Ready to Use**

All features implemented:
- Backend API ✅
- Database schema ✅
- Audit logging ✅
- RBAC ✅
- Validation ✅
- Frontend hooks ✅
- Documentation ✅

## 📞 Support

For questions about:
- **API**: See [Admin Management](./ADMIN_MANAGEMENT.md)
- **Quick answers**: See [Quick Start](./ADMIN_QUICK_START.md)
- **Implementation**: See [Files Reference](./ADMIN_FILES_REFERENCE.md)
- **React usage**: See [lib/admin/hooks.ts](./lib/admin/hooks.ts)

## 🎉 You're All Set!

The admin management system is fully implemented. Start with the [Quick Start Guide](./ADMIN_QUICK_START.md) and build your UI!

---

**Last Updated**: May 17, 2026  
**System Version**: 1.0  
**Status**: Production Ready ✅
