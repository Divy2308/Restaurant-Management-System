import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken, requireStaff, requireAdmin } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

const toInt = (value: string | string[] | undefined): number => {
  if (!value) return NaN;
  return parseInt(Array.isArray(value) ? value[0] : value, 10);
};

const toStr = (value: string | string[] | undefined): string | undefined => {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
};

// GET /api/products - public, with filter + pagination
router.get("/", async (req: Request, res: Response) => {
  try {
    const category = toStr(req.query.category as string | string[] | undefined);
    const active = toStr(req.query.active as string | string[] | undefined);
    const search = toStr(req.query.search as string | string[] | undefined);
    const limit = toInt(req.query.limit as string | string[] | undefined) || 50;
    const offset = toInt(req.query.offset as string | string[] | undefined) || 0;

    const pageLimit = Math.min(limit, 100);

    const where: Record<string, unknown> = {};

    if (category) {
      const categoryId = parseInt(category, 10);
      if (!Number.isNaN(categoryId)) where.categoryId = categoryId;
    }

    if (active !== undefined) {
      where.active = active === "true";
    }

    if (search && search.trim().length > 0) {
      where.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { description: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
        skip: offset,
        take: pageLimit,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      ok: true,
      products,
      pagination: {
        total,
        limit: pageLimit,
        offset,
        hasMore: offset + pageLimit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET /api/products/category/:categoryId - public
router.get("/category/:categoryId", async (req: Request, res: Response) => {
  try {
    const categoryId = toInt(req.params.categoryId);
    if (Number.isNaN(categoryId)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    const products = await prisma.product.findMany({
      where: { categoryId },
      orderBy: { name: "asc" },
    });

    res.json({
      ok: true,
      category: { id: category.id, name: category.name },
      products,
      count: products.length,
    });
  } catch (error) {
    console.error("Error fetching category products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// POST /api/products/seed-demo - public helper for pre-auth flow
router.post("/seed-demo", async (_req: Request, res: Response) => {
  try {
    const ensureCategory = async (name: string) => {
      const existing = await prisma.category.findFirst({ where: { name } });
      if (existing) return existing;
      return prisma.category.create({ data: { name } });
    };

    const [biryani, beverages, starters, mains, desserts] = await Promise.all([
      ensureCategory("Biryani"),
      ensureCategory("Beverages"),
      ensureCategory("Starters"),
      ensureCategory("Main Course"),
      ensureCategory("Desserts"),
    ]);

    const demoProducts = [
        {
          name: "Chicken Biryani",
          description: "Long grain rice, masala chicken",
          categoryId: biryani.id,
          price: 249,
          tax: 5,
          unit: "plate",
          active: true,
        },
        {
          name: "Paneer Biryani",
          description: "Paneer cubes, saffron rice",
          categoryId: biryani.id,
          price: 219,
          tax: 5,
          unit: "plate",
          active: true,
        },
        {
          name: "Mutton Biryani",
          description: "Slow-cooked mutton, dum rice",
          categoryId: biryani.id,
          price: 289,
          tax: 5,
          unit: "plate",
          active: true,
        },
        {
          name: "Egg Biryani",
          description: "Masala boiled eggs, fragrant basmati",
          categoryId: biryani.id,
          price: 179,
          tax: 5,
          unit: "plate",
          active: true,
        },
        {
          name: "Veg Biryani",
          description: "Garden vegetables, mint rice",
          categoryId: biryani.id,
          price: 169,
          tax: 5,
          unit: "plate",
          active: true,
        },
        {
          name: "Lime Soda",
          description: "Fresh lime and soda",
          categoryId: beverages.id,
          price: 69,
          tax: 5,
          unit: "glass",
          active: true,
        },
        {
          name: "Cold Coffee",
          description: "Chilled coffee with cream",
          categoryId: beverages.id,
          price: 119,
          tax: 5,
          unit: "glass",
          active: true,
        },
        {
          name: "Masala Chai",
          description: "Spiced tea with milk",
          categoryId: beverages.id,
          price: 39,
          tax: 5,
          unit: "cup",
          active: true,
        },
        {
          name: "Fresh Orange Juice",
          description: "Freshly pressed citrus",
          categoryId: beverages.id,
          price: 99,
          tax: 5,
          unit: "glass",
          active: true,
        },
        {
          name: "Mineral Water",
          description: "500ml chilled bottle",
          categoryId: beverages.id,
          price: 30,
          tax: 5,
          unit: "bottle",
          active: true,
        },
        {
          name: "Masala Fries",
          description: "Crispy fries with house spice",
          categoryId: starters.id,
          price: 129,
          tax: 5,
          unit: "plate",
          active: true,
        },
        {
          name: "Paneer Tikka",
          description: "Char-grilled paneer cubes",
          categoryId: starters.id,
          price: 189,
          tax: 5,
          unit: "plate",
          active: true,
        },
        {
          name: "Chicken 65",
          description: "Spicy fried chicken bites",
          categoryId: starters.id,
          price: 209,
          tax: 5,
          unit: "plate",
          active: true,
        },
        {
          name: "Veg Spring Rolls",
          description: "Crunchy rolls with sweet chili dip",
          categoryId: starters.id,
          price: 149,
          tax: 5,
          unit: "plate",
          active: true,
        },
        {
          name: "Crispy Corn",
          description: "Golden corn tossed in spices",
          categoryId: starters.id,
          price: 139,
          tax: 5,
          unit: "plate",
          active: true,
        },
        {
          name: "Butter Chicken",
          description: "Creamy tomato gravy and tandoori chicken",
          categoryId: mains.id,
          price: 259,
          tax: 5,
          unit: "bowl",
          active: true,
        },
        {
          name: "Paneer Butter Masala",
          description: "Paneer in rich makhani sauce",
          categoryId: mains.id,
          price: 229,
          tax: 5,
          unit: "bowl",
          active: true,
        },
        {
          name: "Dal Tadka",
          description: "Yellow lentils finished with tempering",
          categoryId: mains.id,
          price: 159,
          tax: 5,
          unit: "bowl",
          active: true,
        },
        {
          name: "Butter Naan",
          description: "Soft tandoor bread brushed with butter",
          categoryId: mains.id,
          price: 45,
          tax: 5,
          unit: "pcs",
          active: true,
        },
        {
          name: "Jeera Rice",
          description: "Cumin rice with ghee finish",
          categoryId: mains.id,
          price: 129,
          tax: 5,
          unit: "plate",
          active: true,
        },
        {
          name: "Gulab Jamun",
          description: "Warm khoya dumplings in syrup",
          categoryId: desserts.id,
          price: 79,
          tax: 5,
          unit: "portion",
          active: true,
        },
        {
          name: "Brownie Sundae",
          description: "Chocolate brownie with vanilla scoop",
          categoryId: desserts.id,
          price: 149,
          tax: 5,
          unit: "portion",
          active: true,
        },
        {
          name: "Kulfi Falooda",
          description: "Traditional kulfi with rose falooda",
          categoryId: desserts.id,
          price: 139,
          tax: 5,
          unit: "glass",
          active: true,
        },
        {
          name: "Cheesecake Jar",
          description: "Creamy cheesecake layered in a jar",
          categoryId: desserts.id,
          price: 159,
          tax: 5,
          unit: "jar",
          active: true,
        },
      ];

    let insertedCount = 0;

    for (const product of demoProducts) {
      const existing = await prisma.product.findFirst({
        where: { name: product.name, categoryId: product.categoryId },
      });

      if (existing) continue;

      await prisma.product.create({ data: product });
      insertedCount += 1;
    }

    const message =
      insertedCount > 0
        ? `${insertedCount} demo menu items are ready`
        : "Demo menu already contains all default items";

    return res.status(201).json({ ok: true, message });
  } catch (error) {
    console.error("Error seeding demo products:", error);
    return res.status(500).json({ error: "Failed to seed demo products" });
  }
});

// GET /api/products/:id - public
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const productId = toInt(req.params.id);
    if (Number.isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: { select: { id: true, name: true } } },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ ok: true, product });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// POST /api/products - staff+
router.post("/", verifyToken, requireStaff, async (req: Request, res: Response) => {
  try {
    const { name, description, categoryId, price, tax, unit, active } = req.body as {
      name?: string;
      description?: string;
      categoryId?: number;
      price?: number;
      tax?: number;
      unit?: string;
      active?: boolean;
    };

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Product name is required" });
    }

    if (!Number.isInteger(categoryId) || (categoryId as number) <= 0) {
      return res.status(400).json({ error: "Valid category ID is required" });
    }
    const parsedCategoryId = categoryId as number;

    if (typeof price !== "number" || Number.isNaN(price) || price < 0) {
      return res.status(400).json({ error: "Valid non-negative price is required" });
    }

    const category = await prisma.category.findUnique({ where: { id: parsedCategoryId } });
    if (!category) {
      return res.status(400).json({ error: "Category not found" });
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description: typeof description === "string" ? description : "",
        categoryId: parsedCategoryId,
        price,
        tax: typeof tax === "number" ? tax : 0,
        unit: typeof unit === "string" && unit.trim().length > 0 ? unit.trim() : "pcs",
        active: active !== false,
      },
      include: { category: { select: { id: true, name: true } } },
    });

    res.status(201).json({ ok: true, message: "Product created successfully", product });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// PUT /api/products/:id - staff+
router.put("/:id", verifyToken, requireStaff, async (req: Request, res: Response) => {
  try {
    const productId = toInt(req.params.id);
    if (Number.isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) {
      return res.status(404).json({ error: "Product not found" });
    }

    const { name, description, categoryId, price, tax, unit, active } = req.body as {
      name?: string;
      description?: string;
      categoryId?: number;
      price?: number;
      tax?: number;
      unit?: string;
      active?: boolean;
    };

    if (categoryId !== undefined) {
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return res.status(400).json({ error: "Valid category ID is required" });
      }
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        return res.status(400).json({ error: "Category not found" });
      }
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        name: typeof name === "string" ? name.trim() : undefined,
        description: typeof description === "string" ? description : undefined,
        categoryId,
        price,
        tax,
        unit: typeof unit === "string" ? unit.trim() : undefined,
        active,
      },
      include: { category: { select: { id: true, name: true } } },
    });

    res.json({ ok: true, message: "Product updated successfully", product: updated });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// DELETE /api/products/:id - admin only
router.delete("/:id", verifyToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const productId = toInt(req.params.id);
    if (Number.isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    await prisma.product.delete({ where: { id: productId } });
    res.json({ ok: true, message: `Product \"${product.name}\" deleted successfully` });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// PATCH /api/products/:id/toggle-active - staff+
router.patch("/:id/toggle-active", verifyToken, requireStaff, async (req: Request, res: Response) => {
  try {
    const productId = toInt(req.params.id);
    if (Number.isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { active: !product.active },
      include: { category: { select: { id: true, name: true } } },
    });

    res.json({
      ok: true,
      message: `Product is now ${updated.active ? "active" : "inactive"}`,
      product: updated,
    });
  } catch (error) {
    console.error("Error toggling product active state:", error);
    res.status(500).json({ error: "Failed to toggle product status" });
  }
});

export default router;
