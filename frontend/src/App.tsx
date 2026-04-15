import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

type Table = {
  id: number;
  number: string;
  seats: number;
  status: "free" | "occupied";
};

type Floor = {
  id: number;
  name: string;
  tables: Table[];
};

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  active: boolean;
};

type Category = {
  id: number;
  name: string;
};

type CartItem = {
  productId: number;
  name: string;
  price: number;
  qty: number;
};

type KitchenItem = {
  id: number;
  productName: string;
  qty: number;
  kitchenStatus: "pending" | "to_cook" | "preparing" | "completed";
};

type KitchenOrder = {
  id: number;
  orderNumber: string;
  table: { id: number; number: string } | null;
  items: KitchenItem[];
  sentToKitchenAt: string | null;
};

type FlowUpdatePayload = {
  event?: string;
  orderId?: number;
  tableId?: number;
  timestamp?: string;
};

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:3001";
const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) || "http://localhost:3001";

const navItems = [
  { id: "floor", label: "Floor View", hint: "Tables and seating", icon: "FV" },
  { id: "order", label: "Order View", hint: "Live order entry", icon: "OV" },
  { id: "bills", label: "Bills", hint: "Checkout workflow", icon: "BI" },
  { id: "kitchen", label: "Kitchen Display", hint: "Preparation board", icon: "KD" },
] as const;

const productThemes = ["ember", "sage", "sun", "berry", "ocean"] as const;

function toCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function prettyKitchenStatus(status: KitchenItem["kitchenStatus"]): string {
  if (status === "to_cook") return "To Cook";
  if (status === "pending") return "Pending";
  if (status === "preparing") return "Preparing";
  return "Completed";
}

function productAccent(product: Product): string {
  return productThemes[product.id % productThemes.length];
}

function categoryBadge(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function App() {
  const [view, setView] = useState<"pos" | "kitchen">("pos");
  const [activePanel, setActivePanel] = useState<(typeof navItems)[number]["id"]>("order");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<number | "all">("all");

  const [floors, setFloors] = useState<Floor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderStatus, setOrderStatus] = useState<"draft" | "sent" | "paid" | null>(null);

  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [newOrderPulse, setNewOrderPulse] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const alertTimeoutRef = useRef<number | null>(null);

  const tableList = useMemo(() => floors.flatMap((floor) => floor.tables), [floors]);
  const selectedTable = tableList.find((table) => table.id === selectedTableId) || null;
  const occupiedTables = tableList.filter((table) => table.status === "occupied").length;

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        activeCategoryId === "all" ? true : product.categoryId === activeCategoryId;
      const matchesSearch =
        normalizedSearch.length === 0
          ? true
          : `${product.name} ${product.description}`.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategoryId, products, searchTerm]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  const catalogStats = useMemo(
    () => ({
      itemCount: filteredProducts.length,
      categoryCount: categories.length,
    }),
    [categories.length, filteredProducts.length]
  );

  const loadLayout = useCallback(async () => {
    const response = await fetch(`${API_BASE}/api/tables/layout`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to load tables");
    setFloors(data.floors || []);

    if (!selectedTableId && data.floors?.length) {
      const firstTable = data.floors[0]?.tables?.[0];
      if (firstTable) setSelectedTableId(firstTable.id);
    }
  }, [selectedTableId]);

  const loadCatalog = useCallback(async () => {
    const [categoriesRes, productsRes] = await Promise.all([
      fetch(`${API_BASE}/api/categories`),
      fetch(`${API_BASE}/api/products?active=true&limit=100`),
    ]);

    const categoriesData = await categoriesRes.json();
    const productsData = await productsRes.json();

    if (!categoriesRes.ok) throw new Error(categoriesData.error || "Failed to load categories");
    if (!productsRes.ok) throw new Error(productsData.error || "Failed to load products");

    setCategories(categoriesData.categories || []);
    setProducts(productsData.products || []);
  }, []);

  const loadKitchenBoard = useCallback(async () => {
    const response = await fetch(`${API_BASE}/api/orders/kitchen/board`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to load kitchen board");
    setKitchenOrders(data.orders || []);
  }, []);

  const playAlertTone = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new window.AudioContext();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Ignore audio issues (browser permission / unsupported context).
    }
  }, []);

  const triggerNewOrderAlert = useCallback(() => {
    setNewOrderPulse(true);
    setMessage("New order received in kitchen");
    playAlertTone();

    if (alertTimeoutRef.current) {
      window.clearTimeout(alertTimeoutRef.current);
    }

    alertTimeoutRef.current = window.setTimeout(() => {
      setNewOrderPulse(false);
    }, 1800);
  }, [playAlertTone]);

  const setupDefaultTables = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/tables/setup-default`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to setup tables");

      await loadLayout();
      setMessage(data.message || "Default layout ready");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const setupDemoCatalog = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/products/seed-demo`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to seed catalog");

      await loadCatalog();
      setMessage(data.message || "Demo menu ready");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await Promise.all([loadLayout(), loadCatalog()]);
      } catch (error) {
        setMessage((error as Error).message);
      }
    };
    bootstrap();
  }, [loadLayout, loadCatalog]);

  useEffect(() => {
    const unlockAudio = () => {
      if (audioContextRef.current?.state === "suspended") {
        void audioContextRef.current.resume();
      }
    };

    window.addEventListener("pointerdown", unlockAudio);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      if (alertTimeoutRef.current) {
        window.clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setMessage("Live updates connected");
    });

    socket.on("flow:updated", async (payload: FlowUpdatePayload) => {
      try {
        if (payload?.event === "order:sent") {
          triggerNewOrderAlert();
        }

        await Promise.all([loadLayout(), loadKitchenBoard()]);
      } catch {
        // Ignore transient refresh errors.
      }
    });

    socket.on("disconnect", () => {
      setMessage("Live updates disconnected. Retrying...");
    });

    return () => {
      socket.disconnect();
    };
  }, [loadKitchenBoard, loadLayout, triggerNewOrderAlert]);

  useEffect(() => {
    if (view !== "kitchen") return;
    loadKitchenBoard().catch((error: Error) => setMessage(error.message));
  }, [view, loadKitchenBoard]);

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }

      return [
        ...current,
        { productId: product.id, name: product.name, price: product.price, qty: 1 },
      ];
    });
  };

  const setQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      setCart((current) => current.filter((item) => item.productId !== productId));
      return;
    }

    setCart((current) =>
      current.map((item) => (item.productId === productId ? { ...item, qty } : item))
    );
  };

  const clearCurrentOrder = () => {
    setCart([]);
    setOrderId(null);
    setOrderStatus(null);
    setMessage("Current order cleared");
  };

  const createOrder = async () => {
    if (!selectedTableId) {
      setMessage("Select a table first");
      return;
    }

    if (cart.length === 0) {
      setMessage("Add at least one item to cart");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: selectedTableId,
          items: cart.map((item) => ({ productId: item.productId, qty: item.qty })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create order");

      setOrderId(data.order.id);
      setOrderStatus("draft");
      setMessage(`Order ${data.order.orderNumber} created`);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const sendToKitchen = async () => {
    if (!orderId) {
      setMessage("Create an order first");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/orders/${orderId}/send-to-kitchen`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send order");

      setOrderStatus("sent");
      setCart([]);
      setMessage("Order sent to kitchen");
      await loadLayout();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const markPaid = async () => {
    if (!orderId) {
      setMessage("No active order");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: "cash", tip: 0 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to pay order");

      setOrderStatus("paid");
      setOrderId(null);
      setSelectedTableId(null);
      setMessage("Payment completed. Table is now free.");
      await loadLayout();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const updateKitchenItemStatus = async (
    orderIdValue: number,
    itemId: number,
    status: KitchenItem["kitchenStatus"]
  ) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/orders/${orderIdValue}/items/${itemId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kitchenStatus: status }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update kitchen item");

      await loadKitchenBoard();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const openNavItem = (id: (typeof navItems)[number]["id"]) => {
    setActivePanel(id);
    setView(id === "kitchen" ? "kitchen" : "pos");
  };

  return (
    <div className="app-shell">
      <div className="dashboard-shell">
        <aside className="sidebar">
          <div className="brand-card">
            <div className="brand-icon">PC</div>
            <div>
              <p className="brand-eyebrow">POS Cafe</p>
              <h1>Restaurant Flow</h1>
              <span>Fast dining operations</span>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="POS sections">
            {navItems.map((item) => {
              const selected = item.id === (view === "kitchen" ? "kitchen" : activePanel);
              return (
                <button
                  key={item.id}
                  className={selected ? "nav-item active" : "nav-item"}
                  onClick={() => openNavItem(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-copy">
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="sidebar-summary">
            <p>Session #3 open</p>
            <button onClick={setupDefaultTables} disabled={loading}>
              Setup Floor
            </button>
          </div>
        </aside>

        {view === "pos" ? (
          <main className="pos-layout">
            <section className="catalog-panel">
              <header className="content-topbar">
                <div>
                  <p className="section-label">Order Screen</p>
                  <h2>Build a table order in one view</h2>
                </div>
                <div className="content-actions">
                  <button className="ghost-action" onClick={setupDemoCatalog} disabled={loading}>
                    Seed Demo Menu
                  </button>
                  <button className="ghost-action" onClick={loadCatalog} disabled={loading}>
                    Reload
                  </button>
                </div>
              </header>

              {message ? <p className="banner">{message}</p> : null}

              <div className="catalog-toolbar">
                <div className="table-pill">
                  <span>Selected Table</span>
                  <strong>{selectedTable ? selectedTable.number : "Choose a table"}</strong>
                  <small>
                    {selectedTable
                      ? `${selectedTable.seats} seats • ${selectedTable.status}`
                      : `${tableList.length} tables ready`}
                  </small>
                </div>
                <label className="search-box">
                  <span>Search products</span>
                  <input
                    type="search"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </label>
              </div>

              <div className="catalog-filters">
                <button
                  className={activeCategoryId === "all" ? "filter-chip active" : "filter-chip"}
                  onClick={() => setActiveCategoryId("all")}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    className={
                      activeCategoryId === category.id ? "filter-chip active" : "filter-chip"
                    }
                    onClick={() => setActiveCategoryId(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              <div className="status-strip">
                <div>
                  <span>Visible Items</span>
                  <strong>{catalogStats.itemCount}</strong>
                </div>
                <div>
                  <span>Categories</span>
                  <strong>{catalogStats.categoryCount}</strong>
                </div>
                <div>
                  <span>Occupied Tables</span>
                  <strong>{occupiedTables}</strong>
                </div>
              </div>

              <section className="table-panel">
                <div className="table-panel-header">
                  <div>
                    <p className="section-label">Floor View</p>
                    <h3>Choose a table before placing the order</h3>
                  </div>
                </div>
                {floors.length === 0 ? <p className="empty-state">No table layout yet.</p> : null}
                <div className="floor-list">
                  {floors.map((floor) => (
                    <div key={floor.id} className="floor-block">
                      <div className="floor-meta">
                        <strong>{floor.name}</strong>
                        <span>{floor.tables.length} tables</span>
                      </div>
                      <div className="table-grid">
                        {floor.tables.map((table) => (
                          <button
                            key={table.id}
                            className={
                              selectedTableId === table.id
                                ? "table-card selected"
                                : `table-card ${table.status}`
                            }
                            onClick={() => setSelectedTableId(table.id)}
                          >
                            <strong>{table.number}</strong>
                            <span>{table.seats} seats</span>
                            <small>{table.status}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="products-panel">
                <div className="products-panel-header">
                  <div>
                    <p className="section-label">Menu</p>
                    <h3>Tap any item to add it to the current cart</h3>
                  </div>
                </div>
                {filteredProducts.length === 0 ? (
                  <p className="empty-state">No products match this filter.</p>
                ) : null}
                <div className="menu-grid">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      className={`menu-item theme-${productAccent(product)}`}
                      onClick={() => addToCart(product)}
                    >
                      <div className="menu-item-badge">
                        <span>{categoryBadge(product.name)}</span>
                      </div>
                      <div className="menu-item-copy">
                        <strong>{product.name}</strong>
                        <span>{product.description || "Chef special"}</span>
                        <em>{toCurrency(product.price)}</em>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </section>

            <aside className="order-panel">
              <header className="order-panel-header">
                <div>
                  <p className="section-label">Order</p>
                  <h3>{selectedTable ? selectedTable.number : "No table selected"}</h3>
                </div>
                <div className="order-status">
                  <span>Status</span>
                  <strong>{orderStatus || "open"}</strong>
                </div>
              </header>

              <div className="order-meta-card">
                <div>
                  <span>Table</span>
                  <strong>{selectedTable ? selectedTable.number : "Pending"}</strong>
                </div>
                <div>
                  <span>Items</span>
                  <strong>{cart.reduce((count, item) => count + item.qty, 0)}</strong>
                </div>
                <div>
                  <span>Order ID</span>
                  <strong>{orderId || "--"}</strong>
                </div>
              </div>

              <div className="cart-list">
                {cart.length === 0 ? <p className="empty-state">Cart is empty.</p> : null}
                {cart.map((item) => (
                  <div key={item.productId} className="cart-row">
                    <div className="cart-copy">
                      <strong>{item.name}</strong>
                      <small>{toCurrency(item.price)} each</small>
                    </div>
                    <div className="qty-control">
                      <button onClick={() => setQty(item.productId, item.qty - 1)}>-</button>
                      <span>{item.qty}</span>
                      <button onClick={() => setQty(item.productId, item.qty + 1)}>+</button>
                    </div>
                    <em>{toCurrency(item.price * item.qty)}</em>
                  </div>
                ))}
              </div>

              <div className="totals-card">
                <div className="totals-row">
                  <span>Subtotal</span>
                  <strong>{toCurrency(subtotal)}</strong>
                </div>
                <div className="totals-row grand">
                  <span>Total</span>
                  <strong>{toCurrency(subtotal)}</strong>
                </div>
              </div>

              <div className="actions">
                <button onClick={createOrder} disabled={loading}>
                  Create Draft
                </button>
                <button
                  onClick={sendToKitchen}
                  disabled={loading || !orderId || orderStatus !== "draft"}
                >
                  Send to Kitchen
                </button>
                <button
                  className="secondary-action"
                  onClick={markPaid}
                  disabled={loading || !orderId || orderStatus !== "sent"}
                >
                  Mark Paid
                </button>
                <button className="danger-action" onClick={clearCurrentOrder} disabled={loading}>
                  Clear Order
                </button>
              </div>
            </aside>
          </main>
        ) : (
          <main className="kitchen-layout">
            <section className={newOrderPulse ? "kitchen-board pulse" : "kitchen-board"}>
              <header className="content-topbar">
                <div>
                  <p className="section-label">Kitchen Display</p>
                  <h2>Live preparation queue</h2>
                </div>
                <div className="content-actions">
                  <button className="ghost-action" onClick={loadKitchenBoard} disabled={loading}>
                    Reload
                  </button>
                  <button className="ghost-action" onClick={() => setView("pos")}>
                    Back to POS
                  </button>
                </div>
              </header>

              {message ? <p className="banner">{message}</p> : null}

              <div className="kitchen-list">
                {kitchenOrders.length === 0 ? (
                  <p className="empty-state">No active kitchen tickets.</p>
                ) : null}
                {kitchenOrders.map((order) => (
                  <article key={order.id} className="kitchen-card">
                    <header>
                      <strong>{order.orderNumber}</strong>
                      <span>{order.table ? order.table.number : "Takeaway"}</span>
                    </header>
                    <div className="kitchen-items">
                      {order.items.map((item) => (
                        <div key={item.id} className="kitchen-row">
                          <div>
                            <strong>
                              {item.productName} x{item.qty}
                            </strong>
                            <small>
                              Status:
                              <span className={`status-badge ${item.kitchenStatus}`}>
                                {prettyKitchenStatus(item.kitchenStatus)}
                              </span>
                            </small>
                          </div>
                          <div className="status-actions">
                            <button
                              onClick={() =>
                                updateKitchenItemStatus(order.id, item.id, "preparing")
                              }
                              disabled={
                                item.kitchenStatus === "preparing" ||
                                item.kitchenStatus === "completed"
                              }
                            >
                              Preparing
                            </button>
                            <button
                              onClick={() =>
                                updateKitchenItemStatus(order.id, item.id, "completed")
                              }
                              disabled={item.kitchenStatus === "completed"}
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </main>
        )}
      </div>
    </div>
  );
}

export default App;
