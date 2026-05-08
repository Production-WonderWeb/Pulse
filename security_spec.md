# Security Specification - Pulse Platform

## Data Invariants
1. **Profiles**: Every user must have a profile document. Only Administrators can change user roles. Users can update their own basic info (name, image).
2. **Projects**: Must have a valid client, status, and timeline. Only Managers/Admins can create/delete.
3. **Equipment**: Must have a status and category. Only Managers/Admins can create/delete.
4. **Attendance**: Each record must be linked to a staff ID. Users can only create their own records.
5. **Assignments**: Links resources to projects. Only Managers/Admins can manage.

## The "Dirty Dozen" (Attack Payloads)

1. **Role Escalation**: Authenticated user (Staff) attempts `updateDoc(profile, { role: 'Administrator' })`.
2. **Profile Hijacking**: User A attempts to update User B's profile.
3. **Project Spoofing**: Staff user attempts to create a new project.
4. **ID Poisoning**: Attempting to create a profile with a 2KB junk string as the document ID.
5. **PII Scraping**: Anonymous user attempts to list all profiles.
6. **Phantom Attendance**: User A attempts to log check-in for User B.
7. **Negative Assignment**: Creating an assignment with an invalid project ID.
8. **Schema Injection**: Adding a binary blob into the `display_name` field of a profile.
9. **Asset Theft**: User attempts to delete equipment without being an Admin.
10. **State Corruption**: Setting a project status to a value not in the enum (e.g., "deleted_by_hacker").
11. **Time Drift**: Providing a manual `createdAt` timestamp from 2005.
12. **Shadow Field**: Adding `isTerminated: true` to a profile when it's not in the schema.

## The Test Runner (Plan)
A `firestore.rules.test.ts` would verify these payloads return `PERMISSION_DENIED`. For now, I will implement robust rules to block them.
