# R3F Virtual Girlfriend Project

## Project Structure
- `r3f-virtual-girlfriend-backend/` - Node.js/Express backend server
- `r3f-virtual-girlfriend-frontend/` - React Three Fiber frontend

## Development Commands

### Backend
```bash
cd r3f-virtual-girlfriend-backend
npm run dev  # Start backend server on port 3000
```

### Frontend
```bash
cd r3f-virtual-girlfriend-frontend
npm run dev  # Start frontend server on port 5173
```

## Environment Setup
- Backend environment file: `r3f-virtual-girlfriend-backend/.env`
- Required API keys:
  - `OPENAI_API_KEY` - OpenAI API key for chat functionality
  - `ELEVEN_LABS_API_KEY` - ElevenLabs API key for voice synthesis

## Voice Configuration
- **ElevenLabs Voice ID**: `eXpIbVcVbLo8ZJQDlDnl` (configured in backend)
- Audio generation pipeline working with lip-sync

## Dependencies
- **Rhubarb Lip Sync**: Complete package installed at `r3f-virtual-girlfriend-backend/bin/`
  - Download from: https://github.com/DanielSWolf/rhubarb-lip-sync/releases
  - Current version: v1.14.0
  - **IMPORTANT**: Extract the complete ZIP package, not just the .exe file
  - Required files: `rhubarb.exe`, `res/` folder with resource files

## Audio Generation Status ✅
- ElevenLabs API integration: **WORKING**
- Rhubarb lip-sync processing: **WORKING**
- Audio files generated in: `r3f-virtual-girlfriend-backend/audios/`
- Chat endpoint `/chat` fully functional with audio responses

## Servers
- Backend: http://localhost:3000
- Frontend: http://localhost:5173

## Package Managers
- npm and yarn are both available
- Project was set up using npm

## Troubleshooting
- If audio generation fails, ensure complete Rhubarb package is installed
- Check that API keys are correctly set in `.env` file
- Verify both servers are running on correct ports