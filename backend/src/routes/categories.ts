import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken, requireAdmin } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

const toInt = (value: string | string[] | undefined): number => {
  if (!value) return NaN;
  return parseInt(Array.isArray(value) ? value[0] : value, 10);
};

// GET /api/categories - public
router.get("/", async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({
      ok: true,
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        productCount: cat._count.products,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      })),
      total: categories.length,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET /api/categories/:id - public
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const categoryId = toInt(req.params.id);
    if (Number.isNaN(categoryId)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            tax: true,
            unit: true,
            active: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({
      ok: true,
      category: {
        id: category.id,
        name: category.name,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        productCount: category.products.length,
        products: category.products,
      },
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

// POST /api/categories - admin only
router.post("/", verifyToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name } = req.body as { name?: string };

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const existing = await prisma.category.findFirst({
      where: { name: name.trim() },
    });

    if (existing) {
      return res.status(400).json({ error: `Category \"${name.trim()}\" already exists` });
    }

    const category = await prisma.category.create({
      data: { name: name.trim() },
    });

    res.status(201).json({
      ok: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// PUT /api/categories/:id - admin only
router.put("/:id", verifyToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const categoryId = toInt(req.params.id);
    if (Number.isNaN(categoryId)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const { name } = req.body as { name?: string };
    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return res.status(400).json({ error: "Category name must be a non-empty string" });
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    if (name && name.trim() !== category.name) {
      const existing = await prisma.category.findFirst({ where: { name: name.trim() } });
      if (existing) {
        return res.status(400).json({ error: `Category \"${name.trim()}\" already exists` });
      }
    }

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: { name: name ? name.trim() : undefined },
    });

    res.json({ ok: true, message: "Category updated successfully", category: updated });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// DELETE /api/categories/:id - admin only
router.delete("/:id", verifyToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const categoryId = toInt(req.params.id);
    if (Number.isNaN(categoryId)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    if (category._count.products > 0) {
      return res.status(400).json({
        error: `Cannot delete category with ${category._count.products} product(s). Delete products first.`,
      });
    }

    await prisma.category.delete({ where: { id: categoryId } });
    res.json({ ok: true, message: `Category \"${category.name}\" deleted successfully` });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
