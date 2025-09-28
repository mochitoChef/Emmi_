# R3F Virtual Girlfriend Chat System - Emmi

## 🌐 Production URLs
- **Live Site**: https://emmiverse.org
- **Backend API**: https://emmi-production.up.railway.app
- **Twitter**: https://x.com/Emmiversee

## Quick Start (Development)
```bash
# Backend (port 3002)
cd r3f-virtual-girlfriend-backend && npm run dev

# Frontend (port 5173)
cd r3f-virtual-girlfriend-frontend && npm run dev
```

## Production Deployment ✅

### Frontend (Vercel)
- **Domain**: emmiverse.org
- **Framework**: Vite + React + R3F
- **Environment Variables**:
  - `VITE_API_URL=https://emmi-production.up.railway.app`

### Backend (Railway)
- **URL**: https://emmi-production.up.railway.app
- **Root Directory**: `r3f-virtual-girlfriend-backend`
- **Environment Variables**:
  - `OPENAI_API_KEY` - GPT-4o-mini AI responses
  - `ELEVEN_LABS_API_KEY` - Voice synthesis
- **Auto-installs**: Linux Rhubarb binary for lip-sync

## Configuration
**Local Environment**: `r3f-virtual-girlfriend-backend/.env`
- `OPENAI_API_KEY` - Required for AI responses
- `ELEVEN_LABS_API_KEY` - Required for voice synthesis

**Rhubarb**: Auto-downloads Linux binary on Railway, Windows .exe in `/bin/` for local dev

## Features ✅
- Multi-user WebSocket chat with Socket.io
- Custom usernames (2-20 characters)
- @emmi mentions trigger AI voice responses with lip-sync (unlimited)
- Rate limiting: 3 msgs/10s per user (general chat)
- Anti-spam filtering
- GPT-4o-mini AI model for detailed, engaging responses (2-4 sentences)
- Cross-platform Rhubarb lip-sync (Windows/Linux)
- Real-time crypto prices (BTC/SOL)
- Social media integration (Twitter, Pump.fun)

## Key Files
- Backend: `r3f-virtual-girlfriend-backend/index.js`
- Frontend: `r3f-virtual-girlfriend-frontend/src/components/UI.jsx`
- Chat Hook: `r3f-virtual-girlfriend-frontend/src/hooks/useChat.jsx`
- Rhubarb Installer: `r3f-virtual-girlfriend-backend/install-rhubarb.js`

## Architecture
- **Frontend**: Vercel (emmiverse.org) → **Backend**: Railway API
- **CORS**: Configured for production domains
- **WebSocket**: Real-time chat with Socket.io
- **AI**: OpenAI GPT-4o-mini + ElevenLabs voice + Rhubarb lip-sync

## Repository
- **GitHub**: https://github.com/mochitoChef/Emmi_.git
- **Branches**: master (auto-deploys to production)