# NeuroGuard — Real-Time Eye Fatigue Monitor

A full-stack web application for real-time eye fatigue monitoring built for an IEEE research paper.

## Features
- Real-time eye fatigue detection using MediaPipe Face Mesh
- EAR (Eye Aspect Ratio), PERCLOS, and blink-rate metrics
- Three hybrid deep learning models: CNN+LSTM, ResNet+LSTM, DenseNet+LSTM
- Session management and alert history stored in PostgreSQL

## Stack
- **Frontend:** React + Vite
- **Backend:** Express 5 + Node.js
- **Database:** PostgreSQL + Drizzle ORM
- **Monorepo:** pnpm workspaces
