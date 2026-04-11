# Real-Time Chat Application

Full-stack real-time chat app with React, Node.js, Express, Socket.io, MongoDB, and Cloudinary.

## Features

- Signup and login with JWT auth
- One-to-one real-time chat
- Text and image messages
- Online/offline presence
- Typing indicator
- Last seen status
- Read receipts
- WhatsApp-inspired responsive UI

## Project Structure

```text
frontend/   React + Vite client
backend/    Express + Socket.io API
```

## Environment Setup

### Backend `.env`

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/realtime-chat
JWT_SECRET=replace-with-a-strong-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Install

```bash
npm install
npm install --workspace frontend
npm install --workspace backend
```

## Run

```bash
npm run dev:backend
npm run dev:frontend
```

## Suggested Backend Dependencies

```bash
npm install --workspace backend express socket.io mongoose cors dotenv bcryptjs jsonwebtoken multer cloudinary streamifier
npm install --workspace backend -D nodemon
```

## Suggested Frontend Dependencies

```bash
npm install --workspace frontend react react-dom react-router-dom axios socket.io-client
npm install --workspace frontend -D vite @vitejs/plugin-react
```

## Realtime Flow

1. User logs in and receives JWT.
2. Frontend connects to Socket.io with JWT.
3. User selects another user and sends text or image.
4. Backend stores message in MongoDB.
5. Receiver gets `message:new` instantly.
6. UI updates chats, read receipts, and presence states.
