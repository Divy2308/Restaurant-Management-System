import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getIO } from "../socket";

const router = Router();
const prisma = new PrismaClient();

function emitFlowUpdate(event: string, payload: Record<string, unknown>): void {
  try {
    const io = getIO();
    io.emit(event, payload);
    io.emit("flow:updated", {
      event,
      ...payload,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Socket may not be initialized in some test contexts.
  }
}

const toInt = (value: string | string[] | undefined): number => {
  if (!value) return NaN;
  return parseInt(Array.isArray(value) ? value[0] : value, 10);
};

router.post("/setup-default", async (_req: Request, res: Response) => {
  try {
    const existingFloorCount = await prisma.floor.count();
    if (existingFloorCount > 0) {
      return res.json({ ok: true, message: "Layout already exists" });
    }

    const floor = await prisma.floor.create({
      data: {
        name: "Main Floor",
        tables: {
          create: Array.from({ length: 12 }).map((_, index) => ({
            number: `T${index + 1}`,
            seats: index < 4 ? 2 : 4,
            status: "free",
            active: true,
          })),
        },
      },
      include: { tables: true },
    });

    emitFlowUpdate("tables:updated", { reason: "setup-default" });

    res.status(201).json({ ok: true, message: "Default floor and tables created", floor });
  } catch (error) {
    console.error("Error creating default layout:", error);
    res.status(500).json({ error: "Failed to create default layout" });
  }
});

router.get("/layout", async (_req: Request, res: Response) => {
  try {
    const floors = await prisma.floor.findMany({
      include: {
        tables: {
          where: { active: true },
          orderBy: { number: "asc" },
        },
      },
      orderBy: { id: "asc" },
    });

    res.json({ ok: true, floors, totalFloors: floors.length });
  } catch (error) {
    console.error("Error fetching table layout:", error);
    res.status(500).json({ error: "Failed to fetch table layout" });
  }
});

router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const tableId = toInt(req.params.id);
    const { status } = req.body as { status?: string };

    if (Number.isNaN(tableId)) {
      return res.status(400).json({ error: "Invalid table ID" });
    }

    if (!status || !["free", "occupied"].includes(status)) {
      return res.status(400).json({ error: "Status must be free or occupied" });
    }

    const existing = await prisma.table.findUnique({ where: { id: tableId } });
    if (!existing) {
      return res.status(404).json({ error: "Table not found" });
    }

    const table = await prisma.table.update({
      where: { id: tableId },
      data: { status },
    });

    emitFlowUpdate("tables:updated", {
      reason: "status-change",
      tableId,
      status,
    });

    res.json({ ok: true, message: "Table status updated", table });
  } catch (error) {
    console.error("Error updating table status:", error);
    res.status(500).json({ error: "Failed to update table status" });
  }
});

export default router;
