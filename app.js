const STORAGE_KEY = "money-minder-transactions";

const form = document.getElementById("transaction-form");
const list = document.getElementById("transaction-list");
const template = document.getElementById("transaction-template");
const totalSpent = document.getElementById("total-spent");
const monthSpent = document.getElementById("month-spent");
const txCount = document.getElementById("tx-count");
const search = document.getElementById("search");
const filterCategory = document.getElementById("filter-category");

const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const merchantInput = document.getElementById("merchant");
const notesInput = document.getElementById("notes");
const dateInput = document.getElementById("date");
const receiptInput = document.getElementById("receipt");

let transactions = loadTransactions();

dateInput.valueAsDate = new Date();
render();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const tx = {
    id: crypto.randomUUID(),
    date: dateInput.value,
    amount: Number(amountInput.value),
    category: categoryInput.value,
    merchant: merchantInput.value.trim(),
    notes: notesInput.value.trim(),
    receiptDataUrl: "",
  };

  if (!tx.date || !tx.merchant || Number.isNaN(tx.amount) || tx.amount <= 0) {
    return;
  }

  const receiptFile = receiptInput.files?.[0];
  if (receiptFile) {
    tx.receiptDataUrl = await fileToDataUrl(receiptFile);
  }

  transactions.unshift(tx);
  persistTransactions();

  form.reset();
  dateInput.valueAsDate = new Date();
  render();
});

search.addEventListener("input", render);
filterCategory.addEventListener("change", render);

function loadTransactions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function render() {
  list.innerHTML = "";

  const searchText = search.value.trim().toLowerCase();
  const categoryFilter = filterCategory.value;

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.merchant.toLowerCase().includes(searchText) ||
      (tx.notes || "").toLowerCase().includes(searchText);
    const matchesCategory = categoryFilter === "All" || tx.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (!filtered.length) {
    const empty = document.createElement("li");
    empty.textContent = "No transactions found.";
    empty.className = "transaction-item";
    list.append(empty);
  } else {
    filtered.forEach((tx) => list.append(renderTransaction(tx)));
  }

  updateSummary();
}

function renderTransaction(tx) {
  const item = template.content.firstElementChild.cloneNode(true);
  item.querySelector(".merchant").textContent = tx.merchant;
  item.querySelector(".amount").textContent = formatCurrency(tx.amount);
  item.querySelector(".date").textContent = formatDate(tx.date);
  item.querySelector(".category").textContent = tx.category;
  item.querySelector(".notes").textContent = tx.notes || "No notes";

  const receiptWrap = item.querySelector(".receipt-wrap");
  const receiptImage = item.querySelector(".receipt");
  const toggleButton = item.querySelector(".toggle-receipt");

  if (tx.receiptDataUrl) {
    receiptImage.src = tx.receiptDataUrl;
    toggleButton.addEventListener("click", () => {
      receiptWrap.classList.toggle("hidden");
      toggleButton.textContent = receiptWrap.classList.contains("hidden")
        ? "View receipt"
        : "Hide receipt";
    });
  } else {
    toggleButton.disabled = true;
    toggleButton.textContent = "No receipt";
  }

  item.querySelector(".delete").addEventListener("click", () => {
    transactions = transactions.filter((entry) => entry.id !== tx.id);
    persistTransactions();
    render();
  });

  return item;
}

function updateSummary() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const totals = transactions.reduce(
    (acc, tx) => {
      acc.total += tx.amount;

      const txDate = new Date(tx.date);
      if (txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth) {
        acc.month += tx.amount;
      }

      return acc;
    },
    { total: 0, month: 0 },
  );

  totalSpent.textContent = formatCurrency(totals.total);
  monthSpent.textContent = formatCurrency(totals.month);
  txCount.textContent = transactions.length.toString();
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount || 0);
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
