
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  FileText,
  Loader2,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Trash2,
  User,
  Wallet,
  X
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// =====================================================
// Helpers
// =====================================================

const formatCurrency = (value) => {
  const number = Number(value || 0);

  return `GH₵${number.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const formatDateTime = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(date);
  }

  return parsedDate.toLocaleString("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const getStatusClasses = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "completed":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";

    case "failed":
      return "border-rose-500/20 bg-rose-500/10 text-rose-400";

    case "pending":
      return "border-amber-500/20 bg-amber-500/10 text-amber-400";

    case "refunded":
      return "border-sky-500/20 bg-sky-500/10 text-sky-400";

    default:
      return "border-white/[0.08] bg-[#18181d] text-zinc-400";
  }
};

const getErrorMessage = (
  error,
  fallback = "Something went wrong."
) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const getCustomerName = (customer) => {
  if (!customer) return "Walk-in Customer";

  return (
    `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
    customer.name ||
    "Customer"
  );
};

const getTodaySaleNumber = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const time =
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0") +
    String(now.getMilliseconds()).padStart(3, "0");

  return `SALE-${year}${month}${day}-${time}`;
};

const getLocalDateKey = (date) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "";

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// =====================================================
// Icon Box
// =====================================================

const IconBox = ({
  children,
  className = "",
  size = "md"
}) => {
  const dimensions =
    size === "sm"
      ? "h-9 w-9 rounded-xl"
      : size === "lg"
        ? "h-12 w-12 rounded-2xl"
        : "h-10 w-10 rounded-xl";

  return (
    <div
      className={`flex ${dimensions} shrink-0 items-center justify-center ring-1 ring-inset ring-white/[0.04] ${className}`}
    >
      {children}
    </div>
  );
};

// =====================================================
// Main Sales Component
// =====================================================

const Sales = () => {
  const { user } = useAuth();

  const [sales, setSales] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [inventory, setInventory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);

  const [medicineSearch, setMedicineSearch] = useState("");

  const userRole = String(user?.role || "")
    .trim()
    .toLowerCase();

  const canSell = [
    "admin",
    "pharmacist",
    "cashier"
  ].includes(userRole);

  // ---------------------------------------------------
  // Fetch sales, medicines, customers, prescriptions
  // and inventory
  // ---------------------------------------------------

  const fetchData = useCallback(
    async (showFullLoader = true) => {
      try {
        if (showFullLoader) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError("");

        const [
          salesResponse,
          medicinesResponse,
          customersResponse,
          prescriptionsResponse,
          inventoryResponse
        ] = await Promise.all([
          api.get("/sales"),
          api.get("/medicines"),
          api.get("/customers"),
          api.get("/prescriptions"),
          api.get("/inventory/summary")
        ]);

        if (salesResponse.data?.success) {
          setSales(salesResponse.data.sales || []);
        }

        if (medicinesResponse.data?.success) {
          setMedicines(medicinesResponse.data.medicines || []);
        }

        if (customersResponse.data?.success) {
          setCustomers(customersResponse.data.customers || []);
        }

        if (prescriptionsResponse.data?.success) {
          setPrescriptions(
            prescriptionsResponse.data.prescriptions || []
          );
        }

        if (inventoryResponse.data?.success) {
          setInventory(
            inventoryResponse.data.summary?.inventory || []
          );
        }
      } catch (fetchError) {
        console.error("Sales data loading error:", fetchError);

        setError(
          getErrorMessage(
            fetchError,
            "Unable to load sales data. Please check your connection."
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 4500);

    return () => clearTimeout(timer);
  }, [successMessage]);

  // ---------------------------------------------------
  // Inventory helpers
  // ---------------------------------------------------

  const getInventoryForMedicine = (medicineId) => {
    return inventory.find(
      (inventoryItem) =>
        Number(inventoryItem.medicineId) === Number(medicineId)
    );
  };

  const getAvailableStock = (medicineId) => {
    const inventoryItem = getInventoryForMedicine(medicineId);

    return Number(inventoryItem?.currentStock || 0);
  };

  const getAvailableBatches = (medicineId) => {
    const inventoryItem = getInventoryForMedicine(medicineId);

    if (!inventoryItem?.batches?.length) {
      return [];
    }

    const now = new Date();

    return [...inventoryItem.batches]
      .filter((batch) => {
        const quantity = Number(batch.quantity || 0);

        const expiryDate = batch.expiryDate
          ? new Date(batch.expiryDate)
          : null;

        const expiredByDate =
          expiryDate &&
          !Number.isNaN(expiryDate.getTime()) &&
          expiryDate < now;

        return (
          quantity > 0 &&
          !batch.isExpired &&
          !expiredByDate
        );
      })
      .sort((a, b) => {
        const dateA = a.expiryDate
          ? new Date(a.expiryDate).getTime()
          : Number.MAX_SAFE_INTEGER;

        const dateB = b.expiryDate
          ? new Date(b.expiryDate).getTime()
          : Number.MAX_SAFE_INTEGER;

        return dateA - dateB;
      });
  };

  const getFEFOBatch = (medicineId) => {
    return getAvailableBatches(medicineId)[0] || null;
  };

  const getSellingPrice = (medicineId) => {
    const batch = getFEFOBatch(medicineId);

    return Number(batch?.sellingPrice || 0);
  };

  // ---------------------------------------------------
  // Statistics
  // ---------------------------------------------------

  const statistics = useMemo(() => {
    const todayDate = getLocalDateKey(new Date());

    const todaySales = sales.filter((sale) => {
      if (!sale.saleDate) return false;

      return getLocalDateKey(sale.saleDate) === todayDate;
    });

    const todayRevenue = todaySales.reduce(
      (sum, sale) =>
        sum + Number(sale.totalAmount || 0),
      0
    );

    const totalRevenue = sales.reduce(
      (sum, sale) =>
        sum + Number(sale.totalAmount || 0),
      0
    );

    return {
      totalSales: sales.length,
      todaySales: todaySales.length,
      todayRevenue,
      totalRevenue
    };
  }, [sales]);

  // ---------------------------------------------------
  // Search sales
  // ---------------------------------------------------

  const filteredSales = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return sales;

    return sales.filter((sale) => {
      const customerName = getCustomerName(
        sale.customer
      ).toLowerCase();

      const saleNumber = String(
        sale.saleNumber || ""
      ).toLowerCase();

      return (
        saleNumber.includes(search) ||
        customerName.includes(search)
      );
    });
  }, [sales, searchTerm]);

  // ---------------------------------------------------
  // Cart totals
  // ---------------------------------------------------

  const subtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total +
        Number(item.unitPrice || 0) *
          Number(item.quantity || 0),
      0
    );
  }, [cart]);

  const discountAmount = Math.max(
    0,
    Number(discount || 0)
  );

  const taxAmount = Math.max(
    0,
    Number(tax || 0)
  );

  const totalAmount = Math.max(
    0,
    subtotal - discountAmount + taxAmount
  );

  const receivedAmount = Math.max(
    0,
    Number(paymentAmount || 0)
  );

  const changeAmount = Math.max(
    0,
    receivedAmount - totalAmount
  );

  const paymentShortfall = Math.max(
    0,
    totalAmount - receivedAmount
  );

  // ---------------------------------------------------
  // Search medicines
  // ---------------------------------------------------

  const filteredMedicines = useMemo(() => {
    const search = medicineSearch.trim().toLowerCase();

    const activeMedicines = medicines.filter(
      (medicine) => medicine.isActive !== false
    );

    if (!search) {
      return activeMedicines.slice(0, 30);
    }

    return activeMedicines
      .filter((medicine) => {
        return (
          medicine.name?.toLowerCase().includes(search) ||
          medicine.genericName?.toLowerCase().includes(search) ||
          medicine.brandName?.toLowerCase().includes(search) ||
          medicine.sku?.toLowerCase().includes(search) ||
          medicine.barcode?.toLowerCase().includes(search)
        );
      })
      .slice(0, 30);
  }, [medicines, medicineSearch]);

  const selectedCustomer = customers.find(
    (customer) =>
      Number(customer.id) === Number(selectedCustomerId)
  );

  // ---------------------------------------------------
  // Prescription helpers
  // ---------------------------------------------------

  const getPrescriptionForMedicine = (medicineId) => {
    if (!selectedCustomerId) return null;

    const customerPrescriptions = prescriptions.filter(
      (prescription) =>
        Number(prescription.customerId) ===
          Number(selectedCustomerId) &&
        String(prescription.status || "").toLowerCase() ===
          "active"
    );

    for (const prescription of customerPrescriptions) {
      const item = prescription.items?.find(
        (prescriptionItem) =>
          Number(prescriptionItem.medicineId) ===
            Number(medicineId) &&
          Number(prescriptionItem.quantity || 0) >
            Number(prescriptionItem.dispensedQuantity || 0)
      );

      if (item) {
        return {
          prescription,
          item
        };
      }
    }

    return null;
  };

  const getPrescriptionRemaining = (medicineId) => {
    const result = getPrescriptionForMedicine(medicineId);

    if (!result) return 0;

    return Math.max(
      0,
      Number(result.item.quantity || 0) -
        Number(result.item.dispensedQuantity || 0)
    );
  };

  // ---------------------------------------------------
  // Add medicine to cart
  // ---------------------------------------------------

  const addMedicineToCart = (medicine) => {
    setError("");

    if (!canSell) {
      setError(
        "Your account does not have permission to create sales."
      );
      return;
    }

    const availableStock = getAvailableStock(medicine.id);

    if (availableStock <= 0) {
      setError(
        `${medicine.name} is currently out of stock.`
      );
      return;
    }

    const availableBatch = getFEFOBatch(medicine.id);

    if (!availableBatch) {
      setError(
        `No available non-expired batch was found for ${medicine.name}.`
      );
      return;
    }

    const unitPrice = Number(
      availableBatch.sellingPrice || 0
    );

    if (unitPrice <= 0) {
      setError(
        `No valid selling price is available for ${medicine.name}.`
      );
      return;
    }

    const existing = cart.find(
      (item) =>
        Number(item.medicineId) === Number(medicine.id)
    );

    const prescription = medicine.isPrescriptionRequired
      ? getPrescriptionForMedicine(medicine.id)
      : null;

    if (
      medicine.isPrescriptionRequired &&
      !selectedCustomerId
    ) {
      setError(
        `${medicine.name} requires a prescription. Select a customer first.`
      );
      return;
    }

    if (
      medicine.isPrescriptionRequired &&
      !prescription
    ) {
      setError(
        `No active prescription with remaining quantity was found for ${medicine.name} for this customer.`
      );
      return;
    }

    const prescriptionRemaining =
      medicine.isPrescriptionRequired
        ? getPrescriptionRemaining(medicine.id)
        : Infinity;

    const nextQuantity = existing
      ? Number(existing.quantity) + 1
      : 1;

    if (nextQuantity > availableStock) {
      setError(
        `Only ${availableStock} unit${
          availableStock === 1 ? "" : "s"
        } of ${medicine.name} ${
          availableStock === 1 ? "is" : "are"
        } currently available.`
      );
      return;
    }

    if (
      medicine.isPrescriptionRequired &&
      nextQuantity > prescriptionRemaining
    ) {
      setError(
        `Only ${prescriptionRemaining} unit${
          prescriptionRemaining === 1 ? "" : "s"
        } remain on the active prescription for ${medicine.name}.`
      );
      return;
    }

    if (existing) {
      setCart((current) =>
        current.map((item) =>
          Number(item.medicineId) === Number(medicine.id)
            ? {
                ...item,
                quantity: nextQuantity,
                unitPrice,
                availableStock,
                batchId: availableBatch.id,
                batchNumber: availableBatch.batchNumber,
                prescriptionItemId:
                  prescription?.item?.id ||
                  item.prescriptionItemId ||
                  null
              }
            : item
        )
      );

      return;
    }

    setCart((current) => [
      ...current,
      {
        medicineId: medicine.id,
        medicine,
        quantity: 1,
        unitPrice,
        availableStock,
        batchId: availableBatch.id,
        batchNumber: availableBatch.batchNumber,
        isPrescriptionRequired: Boolean(
          medicine.isPrescriptionRequired
        ),
        prescriptionItemId:
          prescription?.item?.id || null
      }
    ]);
  };

  // ---------------------------------------------------
  // Update cart quantity
  // ---------------------------------------------------

  const updateCartQuantity = (medicineId, quantity) => {
    setError("");

    const cartItem = cart.find(
      (item) =>
        Number(item.medicineId) === Number(medicineId)
    );

    if (!cartItem) return;

    const medicine = cartItem.medicine;
    const nextQuantity = Math.max(
      1,
      Math.floor(Number(quantity || 1))
    );

    const availableStock = getAvailableStock(
      medicine.id
    );

    if (nextQuantity > availableStock) {
      setError(
        `Only ${availableStock} unit${
          availableStock === 1 ? "" : "s"
        } of ${medicine.name} ${
          availableStock === 1 ? "is" : "are"
        } currently available.`
      );
      return;
    }

    if (medicine.isPrescriptionRequired) {
      const remaining = getPrescriptionRemaining(
        medicine.id
      );

      if (nextQuantity > remaining) {
        setError(
          `Only ${remaining} unit${
            remaining === 1 ? "" : "s"
          } remain on the active prescription for ${medicine.name}.`
        );
        return;
      }
    }

    setCart((current) =>
      current.map((item) =>
        Number(item.medicineId) === Number(medicineId)
          ? {
              ...item,
              quantity: nextQuantity
            }
          : item
      )
    );
  };

  // ---------------------------------------------------
  // Remove item from cart
  // ---------------------------------------------------

  const removeCartItem = (medicineId) => {
    setCart((current) =>
      current.filter(
        (item) =>
          Number(item.medicineId) !== Number(medicineId)
      )
    );
  };

  // ---------------------------------------------------
  // Customer selection
  // ---------------------------------------------------

  const handleCustomerChange = (value) => {
    setSelectedCustomerId(value);
    setError("");
  };

  // ---------------------------------------------------
  // Build sale payload items
  // ---------------------------------------------------

  const buildSaleItems = () => {
    return cart.map((item) => {
      let prescriptionItemId;

      if (item.medicine.isPrescriptionRequired) {
        const prescription = getPrescriptionForMedicine(
          item.medicineId
        );

        if (!prescription) {
          throw new Error(
            `No active prescription with remaining quantity was found for ${item.medicine.name}.`
          );
        }

        prescriptionItemId = Number(
          prescription.item.id
        );
      }

      return {
        medicineId: Number(item.medicineId),
        quantity: Number(item.quantity),
        ...(prescriptionItemId
          ? { prescriptionItemId }
          : {})
      };
    });
  };

  // ---------------------------------------------------
  // Complete sale
  // ---------------------------------------------------

  const handleCompleteSale = async () => {
    if (submitting) return;

    if (!canSell) {
      setError(
        "You do not have permission to create sales."
      );
      return;
    }

    if (!cart.length) {
      setError("Add at least one medicine to the cart.");
      return;
    }

    if (discountAmount > subtotal) {
      setError(
        "Discount cannot be greater than the subtotal."
      );
      return;
    }

    if (taxAmount < 0 || discountAmount < 0) {
      setError(
        "Discount and tax cannot be negative."
      );
      return;
    }

    if (!paymentAmount || receivedAmount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    if (receivedAmount < totalAmount) {
      setError(
        `Payment is short by ${formatCurrency(paymentShortfall)}.`
      );
      return;
    }

    // Recheck current stock before submitting.
    for (const item of cart) {
      const availableStock = getAvailableStock(
        item.medicineId
      );

      if (Number(item.quantity) > availableStock) {
        setError(
          `${item.medicine.name} only has ${availableStock} unit${
            availableStock === 1 ? "" : "s"
          } available.`
        );
        return;
      }

      const currentBatch = getFEFOBatch(
        item.medicineId
      );

      if (!currentBatch) {
        setError(
          `No available non-expired batch was found for ${item.medicine.name}. Refresh inventory and try again.`
        );
        return;
      }
    }

    // Recheck prescriptions before submitting.
    for (const item of cart) {
      if (item.medicine.isPrescriptionRequired) {
        if (!selectedCustomerId) {
          setError(
            `${item.medicine.name} requires a customer and valid prescription.`
          );
          return;
        }

        const prescription = getPrescriptionForMedicine(
          item.medicineId
        );

        if (!prescription) {
          setError(
            `No active prescription with remaining quantity was found for ${item.medicine.name}.`
          );
          return;
        }

        const remaining = getPrescriptionRemaining(
          item.medicineId
        );

        if (Number(item.quantity) > remaining) {
          setError(
            `${item.medicine.name} exceeds the remaining prescription quantity.`
          );
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      setError("");

      const saleItems = buildSaleItems();

      const payload = {
        saleNumber: getTodaySaleNumber(),
        discount: discountAmount,
        tax: taxAmount,
        customerId: selectedCustomerId
          ? Number(selectedCustomerId)
          : undefined,
        items: saleItems,
        payment: {
          amount: receivedAmount,
          paymentMethod,
          transactionReference:
            transactionReference.trim() || undefined,
          notes: paymentNotes.trim() || undefined
        }
      };

      const response = await api.post(
        "/sales",
        payload
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Unable to complete sale."
        );
      }

      const createdSale = response.data.sale;

      setSuccessMessage(
        `Sale ${
          createdSale?.saleNumber || ""
        } completed successfully for ${formatCurrency(
          createdSale?.totalAmount ?? totalAmount
        )}.`
      );

      // Reset the POS form after a successful sale.
      setCart([]);
      setSelectedCustomerId("");
      setPaymentAmount("");
      setPaymentMethod("cash");
      setTransactionReference("");
      setPaymentNotes("");
      setDiscount(0);
      setTax(0);
      setMedicineSearch("");

      await fetchData(false);
    } catch (saleError) {
      console.error(
        "Complete sale error:",
        saleError
      );

      setError(
        getErrorMessage(
          saleError,
          "Unable to complete sale."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------
  // Open sale details
  // ---------------------------------------------------

  const openSaleDetails = async (sale) => {
    try {
      setError("");

      const response = await api.get(
        `/sales/${sale.id}`
      );

      if (response.data?.success) {
        setSelectedSale(response.data.sale);
      } else {
        setSelectedSale(sale);
      }
    } catch (detailsError) {
      console.error(
        "Sale details error:",
        detailsError
      );

      setSelectedSale(sale);
    }

    setShowDetailsModal(true);
  };

  // ---------------------------------------------------
  // Loading screen
  // ---------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#08080a] px-4 text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-[#111014]">
            <Loader2
              size={28}
              className="animate-spin text-violet-400"
            />

            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400" />
          </div>

          <div className="text-center">
            <p className="font-semibold text-white">
              Loading sales
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Connecting to the PharmaCore API...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------
  // Main UI
  // ---------------------------------------------------

  return (
    <div className="relative isolate min-h-full overflow-hidden bg-[#08080a] text-zinc-100">
      {/* Stable background: no large blurred layers */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[#08080a]" />

      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-violet-400">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-violet-500/10 ring-1 ring-inset ring-violet-500/20">
                <ShoppingCart className="h-3 w-3" />
              </span>

              Point of Sale
            </div>

            <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Sales
              <Sparkles
                size={20}
                className="text-violet-400/70"
              />
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Process pharmacy sales, handle payments, and
              automatically reduce inventory through FEFO batch
              selection.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchData(false)}
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-white/[0.08] bg-[#111114] px-4 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/[0.15] hover:bg-[#19191e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />

            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-[#1b1013] p-4 text-sm text-rose-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                Sale could not be completed
              </p>

              <p className="mt-1 break-words text-rose-300/80">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="rounded-lg p-1 text-rose-300/60 transition-colors hover:bg-rose-500/10 hover:text-rose-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Success alert */}
        {successMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-[#0e1b15] p-4 text-sm text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                Sale completed
              </p>

              <p className="mt-1 break-words text-emerald-300/80">
                {successMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              aria-label="Dismiss success message"
              className="rounded-lg p-1 text-emerald-300/60 transition-colors hover:bg-emerald-500/10 hover:text-emerald-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Today's Sales"
            value={statistics.todaySales}
            description="Recorded transactions today"
            icon={ShoppingCart}
            accent="violet"
          />

          <StatCard
            label="Today's Revenue"
            value={formatCurrency(statistics.todayRevenue)}
            description="Revenue recorded today"
            icon={Wallet}
            accent="emerald"
          />

          <StatCard
            label="Total Sales"
            value={statistics.totalSales}
            description="All recorded sales"
            icon={FileText}
            accent="sky"
          />

          <StatCard
            label="Total Revenue"
            value={formatCurrency(statistics.totalRevenue)}
            description="Revenue across recorded sales"
            icon={CreditCard}
            accent="amber"
          />
        </div>

        {/* Point of Sale */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          {/* Medicine selection */}
          <section className="min-w-0 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101014] shadow-xl shadow-black/20">
            <div className="border-b border-white/[0.06] bg-[#121216] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Select Medicines
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    Search and add medicines to the sale.
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    type="text"
                    value={medicineSearch}
                    onChange={(event) =>
                      setMedicineSearch(event.target.value)
                    }
                    placeholder="Search medicines..."
                    className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#08080a] pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10"
                  />
                </div>
              </div>
            </div>

            <div className="max-h-[620px] overflow-y-auto overscroll-contain p-4">
              {filteredMedicines.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No medicines found"
                  description="Try a different medicine name, barcode, or SKU."
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {filteredMedicines.map((medicine) => {
                    const availableStock = getAvailableStock(
                      medicine.id
                    );

                    const fefoBatch = getFEFOBatch(
                      medicine.id
                    );

                    const sellingPrice = getSellingPrice(
                      medicine.id
                    );

                    const inCart = cart.some(
                      (item) =>
                        Number(item.medicineId) ===
                        Number(medicine.id)
                    );

                    const prescriptionRequired = Boolean(
                      medicine.isPrescriptionRequired
                    );

                    const outOfStock = availableStock <= 0;

                    return (
                      <button
                        type="button"
                        key={medicine.id}
                        onClick={() =>
                          addMedicineToCart(medicine)
                        }
                        disabled={outOfStock || !canSell}
                        className={`min-w-0 rounded-2xl border p-4 text-left transition-colors ${
                          outOfStock || !canSell
                            ? "cursor-not-allowed border-white/[0.04] bg-[#0c0c0f] opacity-60"
                            : "border-white/[0.08] bg-[#141418] hover:border-violet-500/30 hover:bg-[#19161f]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-white">
                                {medicine.name}
                              </p>

                              {prescriptionRequired && (
                                <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                                  RX
                                </span>
                              )}
                            </div>

                            <p className="mt-1 truncate text-xs text-zinc-500">
                              {medicine.genericName ||
                                "No generic name"}

                              {medicine.strength
                                ? ` · ${medicine.strength}`
                                : ""}
                            </p>
                          </div>

                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                              outOfStock
                                ? "border-white/[0.04] bg-[#0c0c0f] text-zinc-700"
                                : "border-white/[0.08] bg-[#0b0b0e] text-zinc-500"
                            }`}
                          >
                            {outOfStock ? (
                              <X className="h-4 w-4" />
                            ) : inCart ? (
                              <Check className="h-4 w-4 text-violet-300" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex items-end justify-between gap-3">
                          <div className="min-w-0">
                            <span className="inline-block max-w-full truncate rounded-lg border border-white/[0.06] bg-[#0b0b0e] px-2 py-1 text-[10px] font-semibold text-zinc-500">
                              {medicine.sku || "No SKU"}
                            </span>

                            <div className="mt-2">
                              <span
                                className={`text-xs font-semibold ${
                                  outOfStock
                                    ? "text-rose-400"
                                    : "text-emerald-400"
                                }`}
                              >
                                {outOfStock
                                  ? "Out of stock"
                                  : `${availableStock} available`}
                              </span>
                            </div>
                          </div>

                          <div className="min-w-0 text-right">
                            {!outOfStock && (
                              <>
                                <p className="text-sm font-bold text-violet-300">
                                  {formatCurrency(sellingPrice)}
                                </p>

                                {fefoBatch && (
                                  <p className="mt-1 max-w-[120px] truncate text-[10px] text-zinc-600">
                                    FEFO ·{" "}
                                    {fefoBatch.batchNumber || "Batch"}
                                  </p>
                                )}
                              </>
                            )}

                            {outOfStock && (
                              <span className="text-xs font-semibold text-zinc-600">
                                Unavailable
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Current sale / cart */}
          <section className="min-w-0 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101014] shadow-xl shadow-black/20">
            <div className="border-b border-white/[0.06] bg-[#121216] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Current Sale
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    {cart.length}{" "}
                    {cart.length === 1
                      ? "medicine"
                      : "medicines"}{" "}
                    in cart
                  </p>
                </div>

                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    Clear cart
                  </button>
                )}
              </div>
            </div>

            {/* Cart items */}
            <div className="max-h-[350px] overflow-y-auto overscroll-contain">
              {cart.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/[0.08] bg-[#141418]">
                    <ShoppingCart className="h-6 w-6 text-zinc-600" />
                  </div>

                  <p className="mt-4 text-sm font-semibold text-zinc-300">
                    Cart is empty
                  </p>

                  <p className="mt-1 max-w-xs text-xs leading-5 text-zinc-600">
                    Select medicines from the medicine list to start
                    a sale.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {cart.map((item) => (
                    <div
                      key={item.medicineId}
                      className="p-4"
                    >
                      <div className="flex items-start gap-3">
                        <IconBox
                          size="sm"
                          className="bg-violet-500/10 text-violet-400 ring-violet-500/20"
                        >
                          <Package className="h-4 w-4" />
                        </IconBox>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="break-words text-sm font-semibold text-white">
                                {item.medicine?.name}
                              </p>

                              <p className="mt-1 text-xs text-zinc-600">
                                {item.medicine?.strength || ""}

                                {item.medicine
                                  ?.isPrescriptionRequired && (
                                  <span className="ml-2 text-amber-400">
                                    Prescription
                                  </span>
                                )}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                removeCartItem(item.medicineId)
                              }
                              aria-label={`Remove ${item.medicine?.name || "medicine"}`}
                              className="shrink-0 rounded-lg p-1 text-zinc-600 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-white/[0.08] bg-[#08080a]">
                              <button
                                type="button"
                                onClick={() =>
                                  updateCartQuantity(
                                    item.medicineId,
                                    item.quantity - 1
                                  )
                                }
                                aria-label="Decrease quantity"
                                className="flex h-8 w-8 items-center justify-center text-zinc-500 transition-colors hover:bg-[#1b1b20] hover:text-white"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>

                              <span className="w-8 text-center text-xs font-bold text-white">
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  updateCartQuantity(
                                    item.medicineId,
                                    item.quantity + 1
                                  )
                                }
                                aria-label="Increase quantity"
                                className="flex h-8 w-8 items-center justify-center text-zinc-500 transition-colors hover:bg-[#1b1b20] hover:text-white"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="min-w-0 text-right">
                              <p className="text-sm font-bold text-white">
                                {formatCurrency(
                                  Number(item.unitPrice) *
                                    Number(item.quantity)
                                )}
                              </p>

                              <p className="text-[10px] text-zinc-600">
                                {formatCurrency(item.unitPrice)} each
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.batchNumber && (
                              <span className="max-w-full truncate rounded-md border border-white/[0.06] bg-[#0b0b0e] px-2 py-1 text-[10px] text-zinc-500">
                                FEFO: {item.batchNumber}
                              </span>
                            )}

                            <span className="rounded-md border border-white/[0.06] bg-[#0b0b0e] px-2 py-1 text-[10px] text-zinc-500">
                              {item.availableStock} in stock
                            </span>
                          </div>

                          {item.medicine
                            ?.isPrescriptionRequired && (
                            <div className="mt-3 rounded-lg border border-amber-500/20 bg-[#1b160b] p-2">
                              <p className="text-[11px] leading-4 text-amber-300">
                                Prescription remaining:{" "}
                                <span className="font-bold">
                                  {getPrescriptionRemaining(
                                    item.medicineId
                                  )}
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkout form */}
            <div className="border-t border-white/[0.06] p-4 sm:p-5">
              <div className="space-y-4">
                {/* Customer */}
                <div>
                  <label
                    htmlFor="sale-customer"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500"
                  >
                    Customer
                  </label>

                  <select
                    id="sale-customer"
                    value={selectedCustomerId}
                    onChange={(event) =>
                      handleCustomerChange(event.target.value)
                    }
                    className="h-11 w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#08080a] px-3 text-sm text-white outline-none transition-colors focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10"
                  >
                    <option
                      value=""
                      className="bg-[#111113]"
                    >
                      Walk-in Customer
                    </option>

                    {customers.map((customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                        className="bg-[#111113]"
                      >
                        {getCustomerName(customer)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCustomer && (
                  <div className="rounded-xl border border-violet-500/15 bg-[#15111d] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                      Selected Customer
                    </p>

                    <p className="mt-1 break-words text-xs font-semibold text-violet-300">
                      {getCustomerName(selectedCustomer)}
                    </p>
                  </div>
                )}

                {/* Discount and tax */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="sale-discount"
                      className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500"
                    >
                      Discount (GH₵)
                    </label>

                    <input
                      id="sale-discount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={discount}
                      onChange={(event) =>
                        setDiscount(event.target.value)
                      }
                      className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#08080a] px-3 text-sm text-white outline-none transition-colors focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="sale-tax"
                      className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500"
                    >
                      Tax (GH₵)
                    </label>

                    <input
                      id="sale-tax"
                      type="number"
                      min="0"
                      step="0.01"
                      value={tax}
                      onChange={(event) =>
                        setTax(event.target.value)
                      }
                      className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#08080a] px-3 text-sm text-white outline-none transition-colors focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10"
                    />
                  </div>
                </div>

                {/* Totals */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b0e] p-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-3 text-zinc-500">
                      <span>Subtotal</span>

                      <span className="text-zinc-300">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 text-zinc-500">
                      <span>Discount</span>

                      <span className="text-zinc-300">
                        - {formatCurrency(discountAmount)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 text-zinc-500">
                      <span>Tax</span>

                      <span className="text-zinc-300">
                        + {formatCurrency(taxAmount)}
                      </span>
                    </div>

                    <div className="border-t border-white/[0.06] pt-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-white">
                          Total
                        </span>

                        <span className="text-xl font-bold text-violet-300">
                          {formatCurrency(totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment method */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Payment Method
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <PaymentMethodButton
                      selected={paymentMethod === "cash"}
                      onClick={() => setPaymentMethod("cash")}
                      icon={<Wallet className="h-4 w-4" />}
                      label="Cash"
                    />

                    <PaymentMethodButton
                      selected={
                        paymentMethod === "mobile_money"
                      }
                      onClick={() =>
                        setPaymentMethod("mobile_money")
                      }
                      icon={<Smartphone className="h-4 w-4" />}
                      label="Mobile Money"
                    />

                    <PaymentMethodButton
                      selected={paymentMethod === "card"}
                      onClick={() => setPaymentMethod("card")}
                      icon={<CreditCard className="h-4 w-4" />}
                      label="Card"
                    />

                    <PaymentMethodButton
                      selected={
                        paymentMethod === "bank_transfer"
                      }
                      onClick={() =>
                        setPaymentMethod("bank_transfer")
                      }
                      icon={<CreditCard className="h-4 w-4" />}
                      label="Bank Transfer"
                    />
                  </div>
                </div>

                {/* Amount received */}
                <div>
                  <label
                    htmlFor="sale-payment-amount"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500"
                  >
                    Amount Received
                  </label>

                  <input
                    id="sale-payment-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(event) =>
                      setPaymentAmount(event.target.value)
                    }
                    placeholder="0.00"
                    className="h-12 w-full rounded-xl border border-white/[0.08] bg-[#08080a] px-3 text-base font-semibold text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10"
                  />
                </div>

                {/* Change or shortfall */}
                {paymentAmount !== "" && (
                  <div
                    className={`rounded-xl border p-3 ${
                      receivedAmount >= totalAmount
                        ? "border-emerald-500/20 bg-[#0d1a13]"
                        : "border-rose-500/20 bg-[#1b1013]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`text-xs font-semibold ${
                          receivedAmount >= totalAmount
                            ? "text-emerald-300"
                            : "text-rose-300"
                        }`}
                      >
                        {receivedAmount >= totalAmount
                          ? "Change"
                          : "Amount Short"}
                      </span>

                      <span
                        className={`text-sm font-bold ${
                          receivedAmount >= totalAmount
                            ? "text-emerald-300"
                            : "text-rose-300"
                        }`}
                      >
                        {formatCurrency(
                          receivedAmount >= totalAmount
                            ? changeAmount
                            : paymentShortfall
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Transaction reference */}
                {(paymentMethod === "mobile_money" ||
                  paymentMethod === "card" ||
                  paymentMethod === "bank_transfer") && (
                  <div>
                    <label
                      htmlFor="sale-transaction-reference"
                      className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500"
                    >
                      Transaction Reference
                    </label>

                    <input
                      id="sale-transaction-reference"
                      type="text"
                      value={transactionReference}
                      onChange={(event) =>
                        setTransactionReference(
                          event.target.value
                        )
                      }
                      placeholder="Optional transaction reference"
                      className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#08080a] px-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10"
                    />
                  </div>
                )}

                {/* Payment notes */}
                <div>
                  <label
                    htmlFor="sale-payment-notes"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500"
                  >
                    Payment Notes
                  </label>

                  <textarea
                    id="sale-payment-notes"
                    rows={2}
                    value={paymentNotes}
                    onChange={(event) =>
                      setPaymentNotes(event.target.value)
                    }
                    placeholder="Optional payment notes..."
                    className="w-full resize-y rounded-xl border border-white/[0.08] bg-[#08080a] px-3 py-3 text-xs text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10"
                  />
                </div>

                {/* Complete sale */}
                <button
                  type="button"
                  onClick={handleCompleteSale}
                  disabled={
                    submitting ||
                    !cart.length ||
                    !canSell
                  }
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition-colors hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}

                  <span>
                    {submitting
                      ? "Processing Sale..."
                      : "Complete Sale"}
                  </span>
                </button>

                {!canSell && (
                  <p className="text-center text-xs text-rose-400">
                    Your account does not have permission to create
                    sales.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Sales history */}
        <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101014] shadow-xl shadow-black/20">
          <div className="flex flex-col gap-3 border-b border-white/[0.06] bg-[#121216] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Sales History
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                {filteredSales.length} sale
                {filteredSales.length === 1 ? "" : "s"} found
              </p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search sale or customer..."
                className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#08080a] pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10"
              />
            </div>
          </div>

          {filteredSales.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No sales found"
              description="Completed sales will appear here."
            />
          ) : (
            <>
              {/* Mobile sales cards */}
              <div className="divide-y divide-white/[0.05] md:hidden">
                {filteredSales.map((sale) => {
                  const payment = sale.payments?.[0];

                  return (
                    <div
                      key={sale.id}
                      className="space-y-3 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-white">
                            {sale.saleNumber || `Sale #${sale.id}`}
                          </p>

                          <p className="mt-1 text-xs text-zinc-600">
                            #{sale.id}
                          </p>
                        </div>

                        <span className="shrink-0 text-sm font-bold text-white">
                          {formatCurrency(sale.totalAmount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <IconBox
                          size="sm"
                          className="bg-violet-500/10 text-violet-400 ring-violet-500/20"
                        >
                          <User className="h-3.5 w-3.5" />
                        </IconBox>

                        <span className="min-w-0 break-words text-sm text-zinc-300">
                          {getCustomerName(sale.customer)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <CalendarDays className="h-4 w-4 text-zinc-600" />

                          {formatDateTime(sale.saleDate)}
                        </div>

                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusClasses(
                            payment?.status || "completed"
                          )}`}
                        >
                          {String(
                            payment?.paymentMethod || "Payment"
                          ).replace("_", " ")}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => openSaleDetails(sale)}
                        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#151519] px-3 text-xs font-semibold text-zinc-300 transition-colors hover:border-violet-500/30 hover:text-violet-300"
                      >
                        <Eye className="h-4 w-4" />
                        View Sale Details
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Desktop sales table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-[#131317] text-left">
                      <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Sale
                      </th>

                      <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Customer
                      </th>

                      <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Date
                      </th>

                      <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Total
                      </th>

                      <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Payment
                      </th>

                      <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredSales.map((sale) => {
                      const payment = sale.payments?.[0];

                      return (
                        <tr
                          key={sale.id}
                          className="transition-colors hover:bg-[#151519]"
                        >
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-white">
                              {sale.saleNumber}
                            </p>

                            <p className="mt-1 text-xs text-zinc-600">
                              #{sale.id}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <IconBox
                                size="sm"
                                className="bg-violet-500/10 text-violet-400 ring-violet-500/20"
                              >
                                <User className="h-3.5 w-3.5" />
                              </IconBox>

                              <span className="text-sm text-zinc-300">
                                {getCustomerName(sale.customer)}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-zinc-400">
                              <CalendarDays className="h-4 w-4 text-zinc-600" />

                              {formatDateTime(sale.saleDate)}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-sm font-bold text-white">
                              {formatCurrency(sale.totalAmount)}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                                payment?.status || "completed"
                              )}`}
                            >
                              {String(
                                payment?.paymentMethod || "Payment"
                              ).replace("_", " ")}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  openSaleDetails(sale)
                                }
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-[#151519] px-3 text-xs font-semibold text-zinc-300 transition-colors hover:border-violet-500/30 hover:bg-[#1b1625] hover:text-violet-300"
                              >
                                <Eye className="h-4 w-4" />

                                Details

                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* Sale details modal */}
        {showDetailsModal && selectedSale && (
          <SaleDetailsModal
            sale={selectedSale}
            onClose={() => setShowDetailsModal(false)}
          />
        )}
      </div>
    </div>
  );
};

// =====================================================
// Stat Card
// =====================================================

const StatCard = ({
  label,
  value,
  description,
  icon: Icon,
  accent = "violet"
}) => {
  const accents = {
    violet: {
      gradient: "from-violet-500/[0.12]",
      icon: "bg-violet-500/10 text-violet-400 ring-violet-500/20"
    },

    emerald: {
      gradient: "from-emerald-500/[0.12]",
      icon: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
    },

    sky: {
      gradient: "from-sky-500/[0.12]",
      icon: "bg-sky-500/10 text-sky-400 ring-sky-500/20"
    },

    amber: {
      gradient: "from-amber-500/[0.12]",
      icon: "bg-amber-500/10 text-amber-400 ring-amber-500/20"
    }
  };

  const style = accents[accent] || accents.violet;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101014] p-4 transition-colors duration-200 hover:border-white/[0.15]">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${style.gradient} to-transparent`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-500">
            {label}
          </p>

          <p className="mt-2 break-words text-xl font-bold text-white">
            {value}
          </p>

          <p className="mt-1 text-xs leading-5 text-zinc-600">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${style.icon}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

// =====================================================
// Payment Method Button
// =====================================================

const PaymentMethodButton = ({
  selected,
  onClick,
  icon,
  label
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-10 items-center justify-center gap-2 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
        selected
          ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
          : "border-white/[0.08] bg-[#151519] text-zinc-500 hover:border-white/[0.15] hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
};

// =====================================================
// Empty State
// =====================================================

const EmptyState = ({
  icon: Icon,
  title,
  description
}) => {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/[0.08] bg-[#141418]">
        <Icon className="h-7 w-7 text-zinc-600" />
      </div>

      <p className="mt-4 text-sm font-semibold text-zinc-300">
        {title}
      </p>

      <p className="mt-1 max-w-sm text-xs leading-5 text-zinc-600">
        {description}
      </p>
    </div>
  );
};

// =====================================================
// Sale Details Modal
// =====================================================

const SaleDetailsModal = ({ sale, onClose }) => {
  const payment = sale.payments?.[0];

  const [downloading, setDownloading] = useState(false);
  const [receiptError, setReceiptError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !downloading) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, downloading]);

  const handleDownloadReceipt = async () => {
    if (downloading) return;

    try {
      setDownloading(true);
      setReceiptError("");

      const response = await api.get(
        `/sales/${sale.id}/receipt`,
        {
          responseType: "blob"
        }
      );

      const blob = new Blob([response.data], {
        type: "application/pdf"
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `receipt-${sale.saleNumber || sale.id}.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error(
        "Receipt download error:",
        downloadError
      );

      setReceiptError(
        getErrorMessage(
          downloadError,
          "Unable to download receipt. Please try again."
        )
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/85 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sale-details-title"
    >
      <button
        type="button"
        aria-label="Close sale details"
        onClick={onClose}
        disabled={downloading}
        className="absolute inset-0 h-full w-full cursor-default bg-transparent"
      />

      <div className="relative flex max-h-[95dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101014] shadow-2xl shadow-black/60 sm:max-h-[92dvh]">
        {/* Modal header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.06] bg-[#121216] px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">
              Sale Details
            </p>

            <h2
              id="sale-details-title"
              className="mt-1 break-words text-lg font-bold text-white"
            >
              {sale.saleNumber || `Sale #${sale.id}`}
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              {formatDateTime(sale.saleDate)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={downloading}
            aria-label="Close modal"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#19191e] text-zinc-400 transition-colors hover:text-white disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable modal body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <div className="space-y-6">
            {/* Sale overview */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#0b0b0e] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                  Customer
                </p>

                <p className="mt-2 break-words text-sm font-semibold text-white">
                  {getCustomerName(sale.customer)}
                </p>
              </div>

              <div className="rounded-2xl border border-violet-500/15 bg-[#15111d] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                  Total
                </p>

                <p className="mt-2 break-words text-sm font-bold text-violet-300">
                  {formatCurrency(sale.totalAmount)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b0e] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                  Payment
                </p>

                <p className="mt-2 break-words text-sm font-semibold capitalize text-emerald-400">
                  {String(
                    payment?.paymentMethod || "—"
                  ).replace("_", " ")}
                </p>
              </div>
            </div>

            {/* Items sold */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c0f]">
              <div className="border-b border-white/[0.06] bg-[#131317] p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-violet-400" />

                  <h3 className="text-sm font-semibold text-white">
                    Items Sold
                  </h3>
                </div>
              </div>

              {!sale.items?.length ? (
                <p className="p-5 text-sm text-zinc-500">
                  No item details are available for this sale.
                </p>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {sale.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-white">
                            {item.medicine?.name || "Medicine"}
                          </p>

                          <p className="mt-1 break-words text-xs text-zinc-500">
                            {item.medicine?.strength || ""}

                            {item.batch?.batchNumber
                              ? ` · Batch ${item.batch.batchNumber}`
                              : ""}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 sm:gap-6">
                          <DetailValue
                            label="Quantity"
                            value={item.quantity}
                          />

                          <DetailValue
                            label="Unit Price"
                            value={formatCurrency(item.unitPrice)}
                          />

                          <DetailValue
                            label="Total"
                            value={formatCurrency(item.totalPrice)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment information */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0f] p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-violet-400" />

                <h3 className="text-sm font-semibold text-white">
                  Payment Information
                </h3>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailValue
                  label="Method"
                  value={String(
                    payment?.paymentMethod || "—"
                  ).replace("_", " ")}
                />

                <DetailValue
                  label="Amount"
                  value={
                    payment
                      ? formatCurrency(payment.amount)
                      : "—"
                  }
                />

                <DetailValue
                  label="Status"
                  value={payment?.status}
                />

                <DetailValue
                  label="Reference"
                  value={
                    payment?.transactionReference || "—"
                  }
                />
              </div>

              {receiptError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-[#1b1013] p-3 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />

                  <p className="break-words">
                    {receiptError}
                  </p>
                </div>
              )}
            </div>

            {/* Financial summary */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b0e] p-4 sm:p-5">
              <div className="space-y-3">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-zinc-500">
                    Subtotal
                  </span>

                  <span className="text-zinc-300">
                    {formatCurrency(
                      sale.subtotal ?? sale.totalAmount
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-zinc-500">
                    Discount
                  </span>

                  <span className="text-zinc-300">
                    - {formatCurrency(sale.discount)}
                  </span>
                </div>

                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-zinc-500">
                    Tax
                  </span>

                  <span className="text-zinc-300">
                    + {formatCurrency(sale.tax)}
                  </span>
                </div>

                <div className="flex justify-between gap-3 border-t border-white/[0.06] pt-3">
                  <span className="font-semibold text-white">
                    Total
                  </span>

                  <span className="text-xl font-bold text-violet-300">
                    {formatCurrency(sale.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pinned modal footer */}
        <div className="flex shrink-0 flex-col-reverse justify-end gap-3 border-t border-white/[0.06] bg-[#121216] px-4 py-4 sm:flex-row sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={downloading}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#19191e] px-5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-[#222228] hover:text-white disabled:opacity-50"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleDownloadReceipt}
            disabled={downloading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 text-sm font-semibold text-white transition-colors hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />

                Generating...
              </>
            ) : (
              <>
                <Download size={16} />

                Download Receipt
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// Detail Value
// =====================================================

const DetailValue = ({ label, value }) => {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-zinc-200">
        {value ?? "—"}
      </p>
    </div>
  );
};

export default Sales;