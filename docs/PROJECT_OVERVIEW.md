# Project Overview

## Scope

The Collaborative Code Editor is a web-based platform that enables multiple developers to write and edit code together in real time. It combines Monaco with real-time synchronization through Yjs CRDTs. Code execution is disabled until a secure OS-enforced sandbox runtime is available.

## Target Users

- **Development teams** working remotely who need to collaborate on code in real time
- **Educators and students** conducting live coding sessions
- **Interviewers and candidates** performing technical interviews
- **Open-source contributors** reviewing and editing code together

## Planned Features

### Phase 1 — Foundation (Current)
- [x] Monorepo setup with npm workspaces
- [x] TypeScript configuration for all services
- [x] Basic Express server scaffold
- [x] React + Vite + Tailwind client scaffold
- [x] Execution API scaffold; source execution is disabled pending a secure sandbox
- [x] Documentation structure

### Phase 2 — Authentication & Projects
- [ ] User registration and login (JWT + bcrypt)
- [ ] Project creation and management
- [ ] MongoDB models for users and projects
- [ ] Protected API routes

### Phase 3 — Real-Time Collaboration
- [ ] Room creation and joining
- [ ] Socket.IO connection management
- [ ] Yjs document synchronization
- [ ] Monaco Editor integration with Yjs
- [ ] Presence indicators (cursors, selections)

### Phase 4 — Chat & Communication
- [ ] In-room text chat
- [ ] Message persistence
- [ ] Online user list

### Phase 5 — Code Execution
- [x] Separate execution API that fails closed
- [ ] OS-enforced sandbox design and hostile-code verification
- [ ] Re-enable supported languages only after isolation is verified

### Phase 6 — Polish & Production
- [ ] Error handling and logging
- [ ] Rate limiting
- [ ] CI/CD pipeline
- [ ] Comprehensive test suite
- [ ] Performance optimization

## Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| Foundation setup | Step 1 | ✅ Complete |
| Auth + Projects | Step 2 | 🔲 Pending |
| Real-time editing | Step 3 | 🔲 Pending |
| Chat system | Step 4 | 🔲 Pending |
| Code execution | Step 5 | 🔲 Pending |
| Production ready | Step 6 | 🔲 Pending |
