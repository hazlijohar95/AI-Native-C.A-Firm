# Phase 2: Core Features
## Implementation Plan

> **Status:** In Progress  
> **Started:** 2026-01-21

---

## Overview

Phase 2 implements the core client portal features:
1. **Documents** - Upload, download, organize files with R2 storage
2. **Tasks** - Track action items assigned to clients
3. **Announcements** - Firm-wide and client-specific updates
4. **Notifications** - Real-time in-app alerts
5. **Dashboard** - Live data and activity feed

---

## 1. Documents Feature

### Database Tables
- `documents` - File metadata (name, type, size, R2 key, category)
- `folders` - Optional folder organization

### Convex Functions
- `documents.list` - List documents for organization
- `documents.get` - Get single document
- `documents.create` - Create document record after upload
- `documents.delete` - Soft delete document
- `documents.getUploadUrl` - Generate R2 presigned upload URL
- `documents.getDownloadUrl` - Generate R2 presigned download URL

### UI Components
- `DocumentsPage` - Main documents view
- `DocumentList` - Table/grid of documents
- `DocumentUpload` - Upload dialog with drag-drop
- `DocumentCard` - Individual document display
- `CategoryFilter` - Filter by document type

### Categories
- Tax Returns
- Financial Statements  
- Invoices
- Agreements
- Other

---

## 2. Tasks Feature

### Database Tables
- `tasks` - Task records with status, priority, due dates

### Convex Functions
- `tasks.list` - List tasks for organization
- `tasks.get` - Get single task
- `tasks.create` - Create new task (admin/staff)
- `tasks.update` - Update task details
- `tasks.complete` - Mark task complete
- `tasks.delete` - Delete task

### UI Components
- `TasksPage` - Main tasks view
- `TaskList` - List of tasks with filters
- `TaskCard` - Individual task display
- `TaskStatusBadge` - Visual status indicator
- `TaskFilters` - Filter by status/priority

### Statuses
- Pending
- In Progress
- Completed

### Priorities
- Low
- Medium
- High

---

## 3. Announcements Feature

### Database Tables
- `announcements` - Announcement content and metadata
- `announcementReads` - Track who read each announcement

### Convex Functions
- `announcements.list` - List announcements for user
- `announcements.get` - Get single announcement
- `announcements.create` - Create announcement (admin)
- `announcements.markRead` - Mark as read
- `announcements.getUnreadCount` - Count unread

### UI Components
- `AnnouncementsPage` - Main announcements view
- `AnnouncementList` - List of announcements
- `AnnouncementCard` - Individual announcement
- `AnnouncementBadge` - Unread indicator

### Types
- General
- Tax Update
- Deadline Reminder
- News

---

## 4. Notifications Feature

### Database Tables
- `notifications` - User notifications

### Convex Functions
- `notifications.list` - List user notifications
- `notifications.markRead` - Mark as read
- `notifications.markAllRead` - Mark all as read
- `notifications.getUnreadCount` - Count unread
- `notifications.create` - Internal: create notification

### UI Components
- `NotificationBell` - Header notification icon
- `NotificationDropdown` - Notification list popup
- `NotificationItem` - Individual notification

### Notification Types
- New Document
- New Task
- Task Due Soon
- New Announcement

---

## 5. Dashboard Updates

### Components
- Status cards with real counts
- Recent activity feed
- Quick actions (functional)

### Data Sources
- Document count from `documents.count`
- Task count from `tasks.countPending`
- Announcement count from `announcements.getUnreadCount`
- Activity from `notifications.list`

---

## File Structure

```
portal/
├── convex/
│   ├── schema.ts          # Updated with new tables
│   ├── documents.ts       # Document functions
│   ├── tasks.ts           # Task functions
│   ├── announcements.ts   # Announcement functions
│   └── notifications.ts   # Notification functions
├── src/
│   ├── components/
│   │   ├── documents/
│   │   │   ├── DocumentList.tsx
│   │   │   ├── DocumentCard.tsx
│   │   │   ├── DocumentUpload.tsx
│   │   │   └── CategoryFilter.tsx
│   │   ├── tasks/
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   └── TaskStatusBadge.tsx
│   │   ├── announcements/
│   │   │   ├── AnnouncementList.tsx
│   │   │   └── AnnouncementCard.tsx
│   │   └── notifications/
│   │       ├── NotificationBell.tsx
│   │       └── NotificationDropdown.tsx
│   └── pages/
│       ├── Documents.tsx
│       ├── Tasks.tsx
│       └── Announcements.tsx
```

---

## Acceptance Criteria

- [ ] Users can upload documents (drag-drop or click)
- [ ] Users can download their documents
- [ ] Users can filter documents by category
- [ ] Users can view assigned tasks
- [ ] Users can mark tasks as complete
- [ ] Users can view announcements
- [ ] Unread announcements show indicator
- [ ] Notification bell shows unread count
- [ ] Dashboard shows real counts
- [ ] All features work on mobile
