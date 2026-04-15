import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import categoryRoutes from "./routes/categories";
import orderRoutes from "./routes/orders";
import tableRoutes from "./routes/tables";
import { initSocket } from "./socket";

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
initSocket(httpServer);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/tables", tableRoutes);

// Health check endpoint
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ ok: true, message: "Server is running" });
});

// Error handling
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV}`);
  console.log(`✓ Auth endpoints ready at /api/auth`);
  console.log(`✓ Product endpoints ready at /api/products`);
  console.log(`✓ Category endpoints ready at /api/categories`);
  console.log(`✓ Order endpoints ready at /api/orders`);
  console.log(`✓ Table endpoints ready at /api/tables`);
  console.log(`✓ Socket.IO ready`);
});
