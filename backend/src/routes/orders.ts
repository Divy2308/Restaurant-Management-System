import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getIO } from "../socket";

const router = Router();
const prisma = new PrismaClient();

const toInt = (value: string | string[] | undefined): number => {
  if (!value) return NaN;
  return parseInt(Array.isArray(value) ? value[0] : value, 10);
};

const buildOrderNumber = () => `ORD-${Date.now()}`;

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

async function ensureSystemUserId(): Promise<number> {
  const email = "pos.system@local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing.id;

  const created = await prisma.user.create({
    data: {
      name: "POS System",
      email,
      password: "system-not-used",
      role: "cashier",
    },
  });

  return created.id;
}

async function ensureOpenSessionId(userId: number): Promise<number> {
  const existing = await prisma.session.findFirst({
    where: { userId, status: "open" },
    orderBy: { openedAt: "desc" },
  });

  if (existing) return existing.id;

  const created = await prisma.session.create({
    data: {
      userId,
      status: "open",
    },
  });

  return created.id;
}

router.get("/kitchen/board", async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { in: ["sent"] } },
      include: {
        table: { select: { id: true, number: true } },
        items: {
          select: {
            id: true,
            productName: true,
            qty: true,
            kitchenStatus: true,
            startedAt: true,
            completedAt: true,
          },
        },
        kitchenTickets: {
          orderBy: { sentAt: "desc" },
          take: 1,
        },
      },
      orderBy: { sentToKitchenAt: "asc" },
    });

    res.json({ ok: true, orders, total: orders.length });
  } catch (error) {
    console.error("Error fetching kitchen board:", error);
    res.status(500).json({ error: "Failed to fetch kitchen board" });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const tableIdRaw = req.query.tableId as string | string[] | undefined;
    const tableId = toInt(tableIdRaw);

    const where: { status?: string; tableId?: number } = {};

    if (status && ["draft", "sent", "paid"].includes(status)) {
      where.status = status;
    }

    if (!Number.isNaN(tableId)) {
      where.tableId = tableId;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true } },
        table: { select: { id: true, number: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ ok: true, orders, total: orders.length });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const orderId = toInt(req.params.id);
    if (Number.isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, name: true, role: true } },
        table: { select: { id: true, number: true } },
        items: {
          include: {
            product: { select: { id: true, name: true } },
          },
        },
        kitchenTickets: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ ok: true, order });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { tableId, items } = req.body as {
      tableId?: number;
      items?: Array<{ productId: number; qty: number }>;
    };

    if (!Number.isInteger(tableId) || (tableId as number) <= 0) {
      return res.status(400).json({ error: "Valid tableId is required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "At least one item is required" });
    }

    const parsedTableId = tableId as number;
    const table = await prisma.table.findUnique({ where: { id: parsedTableId } });
    if (!table) {
      return res.status(400).json({ error: "Table not found" });
    }

    const userId = await ensureSystemUserId();
    const sessionId = await ensureOpenSessionId(userId);

    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
      select: { id: true, name: true, price: true },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ error: "One or more products are invalid or inactive" });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    const normalizedItems = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product || !Number.isInteger(item.qty) || item.qty <= 0) {
        throw new Error("Invalid item payload");
      }
      return {
        productId: item.productId,
        qty: item.qty,
        productName: product.name,
        price: product.price,
      };
    });

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.price * item.qty, 0);

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber: buildOrderNumber(),
          tableId: parsedTableId,
          sessionId,
          userId,
          status: "draft",
          total: subtotal,
        },
      });

      await tx.orderItem.createMany({
        data: normalizedItems.map((item) => ({
          orderId: createdOrder.id,
          productId: item.productId,
          productName: item.productName,
          qty: item.qty,
          price: item.price,
          kitchenStatus: "pending",
        })),
      });

      return tx.order.findUnique({
        where: { id: createdOrder.id },
        include: { items: true, table: true },
      });
    });

    emitFlowUpdate("order:created", {
      orderId: order?.id,
      tableId: parsedTableId,
    });

    res.status(201).json({ ok: true, message: "Order created", order });
  } catch (error) {
    if ((error as Error).message === "Invalid item payload") {
      return res.status(400).json({ error: "Invalid item payload" });
    }
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.post("/:id/send-to-kitchen", async (req: Request, res: Response) => {
  try {
    const orderId = toInt(req.params.id);
    if (Number.isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "draft") {
      return res.status(400).json({ error: "Only draft orders can be sent to kitchen" });
    }

    if (order.items.length === 0) {
      return res.status(400).json({ error: "Order has no items" });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.orderItem.updateMany({
        where: { orderId: order.id, kitchenStatus: "pending" },
        data: { kitchenStatus: "to_cook" },
      });

      await tx.kitchenTicket.create({
        data: {
          orderId: order.id,
          status: "to_cook",
        },
      });

      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: "occupied" },
        });
      }

      return tx.order.update({
        where: { id: order.id },
        data: {
          status: "sent",
          sentToKitchenAt: new Date(),
        },
        include: { items: true, kitchenTickets: true, table: true },
      });
    });

    emitFlowUpdate("order:sent", {
      orderId: updatedOrder.id,
      tableId: updatedOrder.tableId,
    });

    res.json({ ok: true, message: "Order sent to kitchen", order: updatedOrder });
  } catch (error) {
    console.error("Error sending order to kitchen:", error);
    res.status(500).json({ error: "Failed to send order to kitchen" });
  }
});

router.post("/:id/pay", async (req: Request, res: Response) => {
  try {
    const orderId = toInt(req.params.id);
    const { paymentMethod, tip } = req.body as { paymentMethod?: string; tip?: number };

    if (Number.isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    if (!paymentMethod || typeof paymentMethod !== "string") {
      return res.status(400).json({ error: "paymentMethod is required" });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const subtotal = order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const parsedTip = typeof tip === "number" && tip > 0 ? tip : 0;

    const updated = await prisma.$transaction(async (tx) => {
      const paid = await tx.order.update({
        where: { id: orderId },
        data: {
          status: "paid",
          paymentMethod: paymentMethod.trim(),
          tip: parsedTip,
          total: subtotal + parsedTip,
          completedAt: new Date(),
        },
        include: { items: true, table: true },
      });

      if (paid.tableId) {
        await tx.table.update({
          where: { id: paid.tableId },
          data: { status: "free" },
        });
      }

      return paid;
    });

    emitFlowUpdate("order:paid", {
      orderId: updated.id,
      tableId: updated.tableId,
    });

    res.json({ ok: true, message: "Order paid successfully", order: updated });
  } catch (error) {
    console.error("Error paying order:", error);
    res.status(500).json({ error: "Failed to pay order" });
  }
});

router.patch("/:orderId/items/:itemId/status", async (req: Request, res: Response) => {
  try {
    const orderId = toInt(req.params.orderId);
    const itemId = toInt(req.params.itemId);
    const { kitchenStatus } = req.body as { kitchenStatus?: string };

    if (Number.isNaN(orderId) || Number.isNaN(itemId)) {
      return res.status(400).json({ error: "Invalid orderId or itemId" });
    }

    const allowedStatuses = ["pending", "to_cook", "preparing", "completed"];
    if (!kitchenStatus || !allowedStatuses.includes(kitchenStatus)) {
      return res.status(400).json({ error: "Invalid kitchenStatus" });
    }

    const item = await prisma.orderItem.findFirst({
      where: {
        id: itemId,
        orderId,
      },
    });

    if (!item) {
      return res.status(404).json({ error: "Order item not found" });
    }

    const now = new Date();
    const updatedItem = await prisma.orderItem.update({
      where: { id: item.id },
      data: {
        kitchenStatus,
        startedAt: kitchenStatus === "preparing" ? now : item.startedAt,
        completedAt: kitchenStatus === "completed" ? now : item.completedAt,
      },
    });

    const remaining = await prisma.orderItem.count({
      where: {
        orderId,
        kitchenStatus: { not: "completed" },
      },
    });

    if (remaining === 0) {
      await prisma.kitchenTicket.updateMany({
        where: { orderId, status: { not: "completed" } },
        data: { status: "completed", completedAt: now },
      });
    } else if (kitchenStatus === "preparing") {
      await prisma.kitchenTicket.updateMany({
        where: { orderId, status: "to_cook" },
        data: { status: "preparing", startedAt: now },
      });
    }

    emitFlowUpdate("kitchen:item-status", {
      orderId,
      itemId,
      kitchenStatus,
    });

    res.json({ ok: true, message: "Order item status updated", item: updatedItem });
  } catch (error) {
    console.error("Error updating order item status:", error);
    res.status(500).json({ error: "Failed to update item status" });
  }
});

export default router;
