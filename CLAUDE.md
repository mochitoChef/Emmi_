# R3F Virtual Girlfriend Chat System

## Quick Start
```bash
# Backend (port 3002)
cd r3f-virtual-girlfriend-backend && npm run dev

# Frontend (port 5173)
cd r3f-virtual-girlfriend-frontend && npm run dev
```

## Configuration
**Environment**: `r3f-virtual-girlfriend-backend/.env`
- `OPENAI_API_KEY` - Required for AI responses
- `ELEVEN_LABS_API_KEY` - Required for voice synthesis

**Rhubarb**: Ensure complete package is in `/bin/` directory

## Features ✅
- Multi-user WebSocket chat with Socket.io
- Custom usernames (2-20 characters)
- @emmi mentions trigger AI voice responses with lip-sync (unlimited)
- Rate limiting: 3 msgs/10s per user (general chat)
- Anti-spam filtering
- GPT-4o-mini AI model for detailed, engaging responses (2-4 sentences)

## Key Files
- Backend: `r3f-virtual-girlfriend-backend/index.js`
- Frontend: `r3f-virtual-girlfriend-frontend/src/components/UI.jsx`
- Chat Hook: `r3f-virtual-girlfriend-frontend/src/hooks/useChat.jsx`

## Deployment
- Frontend: Vercel-compatible
- Backend: Railway-compatible (handles Rhubarb binary)
- Repository: https://github.com/mochitoChef/Emmi_.git