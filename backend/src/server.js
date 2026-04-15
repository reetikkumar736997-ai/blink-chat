import http from "http";
import dotenv from "dotenv";
import { Server } from "socket.io";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { configureCloudinary } from "./config/cloudinary.js";
import { corsOriginHandler } from "./config/origins.js";
import { registerSocketHandlers } from "./socket/index.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: corsOriginHandler,
    credentials: true
  },
  pingInterval: 25000,
  pingTimeout: 60000
});

app.set("io", io);
registerSocketHandlers(io);

const startServer = async () => {
  await connectDB();
  configureCloudinary();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
