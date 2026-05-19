import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const cfg = window.CHILL_SMOKE_CONFIG || {};
const firebaseConfig = cfg.FIREBASE_CONFIG || {};
const collectionName = cfg.FIRESTORE_COLLECTION || "products";
const storageFolder = cfg.STORAGE_FOLDER || "chill-smoke-archive";
const adminPin = cfg.ADMIN_PIN ?? "";

const els = {
  grid: document.querySelector("#productsGrid"),
  empty: document.querySelector("#emptyState"),
  setupWarning: document.querySelector("#setupWarning"),
  totalCount: document.querySelector("#totalCount"),

  search: document.querySelector("#searchInput"),
  typeFilter: document.querySelector("#typeFilter"),
  versionFilter: document.querySelector("#versionFilter"),
  refreshBtn: document.querySelector("#refreshBtn"),

  adminDialog: document.querySelector("#adminDialog"),
  openAdminBtn: document.querySelector("#openAdminBtn"),
  closeDialogBtn: document.querySelector("#closeDialogBtn"),
  productForm: document.querySelector("#productForm"),
  formTitle: document.querySelector("#formTitle"),
  pinArea: document.querySelector("#pinArea"),
  pinInput: document.querySelector("#pinInput"),
  unlockBtn: document.querySelector("#unlockBtn"),
  adminArea: document.querySelector("#adminArea"),
  editingId: document.querySelector("#editingId"),

  name: document.querySelector("#nameInput"),
  type: document.querySelector("#typeInput"),
  version: document.querySelector("#versionInput"),
  period: document.querySelector("#periodInput"),
  description: document.querySelector("#descriptionInput"),
  notes: document.querySelector("#notesInput"),
  beforeFile: document.querySelector("#beforeFile"),
  afterFile: document.querySelector("#afterFile"),
  beforePreview: document.querySelector("#beforePreview"),
  afterPreview: document.querySelector("#afterPreview"),

  progressWrap: document.querySelector("#progressWrap"),
  progressText: document.querySelector("#progressText"),
  progressPercent: document.querySelector("#progressPercent"),
  progressBar: document.querySelector("#progressBar"),

  deleteBtn: document.querySelector("#deleteBtn"),
  resetFormBtn: document.querySelector("#resetFormBtn"),
  saveBtn: document.querySelector("#saveBtn"),

  detailDialog: document.querySelector("#detailDialog"),
  closeDetailBtn: document.querySelector("#closeDetailBtn"),
  detailMeta: document.querySelector("#detailMeta"),
  detailTitle: document.querySelector("#detailTitle"),
  detailBefore: document.querySelector("#detailBefore"),
  detailAfter: document.querySelector("#detailAfter"),
  detailPeriod: document.querySelector("#detailPeriod"),
  detailDescription: document.querySelector("#detailDescription"),
  detailNotes: document.querySelector("#detailNotes"),
  editFromDetailBtn: document.querySelector("#editFromDetailBtn")
};

let app;
let db;
let storage;
let auth;
let products = [];
let selectedProduct = null;
let adminUnlocked = false;
let unsubscribe = null;

const placeholderSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700" viewBox="0 0 900 700">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop stop-color="#171020"/>
      <stop offset="1" stop-color="#0a0710"/>
    </linearGradient>
  </defs>
  <rect width="900" height="700" fill="url(#g)"/>
  <circle cx="690" cy="170" r="140" fill="#8a55ff" opacity=".12"/>
  <circle cx="220" cy="510" r="160" fill="#d6ac55" opacity=".12"/>
  <text x="450" y="350" text-anchor="middle" fill="#f0d48d" font-family="sans-serif" font-size="42" opacity=".7">NO IMAGE</text>
</svg>`);

const placeholderImage = `data:image/svg+xml;charset=utf-8,${placeholderSvg}`;

function isFirebaseConfigured() {
  return firebaseConfig
    && firebaseConfig.apiKey
    && !String(firebaseConfig.apiKey).includes("YOUR_")
    && firebaseConfig.projectId
    && !String(firebaseConfig.projectId).includes("YOUR_");
}

function formatText(value, fallback = "-") {
  const text = String(value || "").trim();
  return text || fallback;
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function uniqueFileName(file) {
  const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "jpg";
  const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
  return `${Date.now()}-${crypto.randomUUID()}.${safeExt}`;
}

function setProgress(label, percent) {
  els.progressWrap.classList.remove("hidden");
  els.progressText.textContent = label;
  els.progressPercent.textContent = `${Math.round(percent)}%`;
  els.progressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function hideProgress() {
  els.progressWrap.classList.add("hidden");
  els.progressBar.style.width = "0%";
}

function renderPreview(input, preview) {
  const file = input.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  preview.innerHTML = `<img src="${url}" alt="preview">`;
}

async function uploadImage(file, kind) {
  if (!file) return null;

  if (!file.type.startsWith("image/")) {
    throw new Error(`${kind}は画像ファイルを選択してください。`);
  }

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`${kind}は10MB以下にしてください。`);
  }

  const path = `${storageFolder}/${kind}/${uniqueFileName(file)}`;
  const storageRef = ref(storage, path);
  const metadata = {
    contentType: file.type,
    customMetadata: {
      originalName: file.name,
      archive: "chill-smoke"
    }
  };

  return await new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      "state_changed",
      snapshot => {
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(`${kind}画像をアップロード中`, percent);
      },
      error => reject(error),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({ url, path });
      }
    );
  });
}

function currentFormData() {
  return {
    name: els.name.value.trim(),
    type: els.type.value,
    version: els.version.value,
    period: els.period.value.trim(),
    description: els.description.value.trim(),
    notes: els.notes.value.trim()
  };
}

function validateProduct(data, isEditing) {
  if (!data.name) throw new Error("商品名を入力してください。");
  if (!data.type) throw new Error("商品区分を選択してください。");
  if (!data.version) throw new Error("バージョンを選択してください。");
  if (!isEditing && !els.beforeFile.files?.[0] && !els.afterFile.files?.[0]) {
    throw new Error("開封前または開封後の画像を1枚以上選択してください。");
  }
}

async function saveProduct(event) {
  event.preventDefault();
  if (!isFirebaseConfigured()) {
    alert("Firebase設定を先に入れてください。");
    return;
  }

  const id = els.editingId.value;
  const isEditing = Boolean(id);
  const existing = products.find(item => item.id === id);

  try {
    els.saveBtn.disabled = true;
    const data = currentFormData();
    validateProduct(data, isEditing);

    const beforeUpload = await uploadImage(els.beforeFile.files?.[0], "before");
    const afterUpload = await uploadImage(els.afterFile.files?.[0], "after");

    const payload = {
      ...data,
      beforeImageUrl: beforeUpload?.url || existing?.beforeImageUrl || "",
      beforeImagePath: beforeUpload?.path || existing?.beforeImagePath || "",
      afterImageUrl: afterUpload?.url || existing?.afterImageUrl || "",
      afterImagePath: afterUpload?.path || existing?.afterImagePath || "",
      updatedAt: serverTimestamp()
    };

    if (isEditing) {
      await updateDoc(doc(db, collectionName, id), payload);
    } else {
      await addDoc(collection(db, collectionName), {
        ...payload,
        createdAt: serverTimestamp()
      });
    }

    resetForm();
    els.adminDialog.close();
  } catch (error) {
    alert(error.message || "保存に失敗しました。");
  } finally {
    els.saveBtn.disabled = false;
    hideProgress();
  }
}

async function deleteProduct() {
  const id = els.editingId.value;
  if (!id) return;
  const item = products.find(product => product.id === id);
  if (!item) return;

  const confirmed = confirm(`「${item.name}」を削除しますか？画像もStorageから削除します。`);
  if (!confirmed) return;

  try {
    els.deleteBtn.disabled = true;

    const paths = [item.beforeImagePath, item.afterImagePath].filter(Boolean);
    await Promise.allSettled(paths.map(path => deleteObject(ref(storage, path))));
    await deleteDoc(doc(db, collectionName, id));

    resetForm();
    els.adminDialog.close();
  } catch (error) {
    alert(error.message || "削除に失敗しました。");
  } finally {
    els.deleteBtn.disabled = false;
  }
}

function resetForm() {
  els.productForm.reset();
  els.editingId.value = "";
  els.formTitle.textContent = "商品登録";
  els.beforePreview.textContent = "Before";
  els.afterPreview.textContent = "After";
  els.deleteBtn.classList.add("hidden");
  hideProgress();
}

function loadIntoForm(item) {
  adminUnlocked = true;
  revealAdminArea();

  els.editingId.value = item.id;
  els.formTitle.textContent = "商品編集";
  els.name.value = item.name || "";
  els.type.value = item.type || "恒常商品";
  els.version.value = item.version || "ベータ";
  els.period.value = item.period || "";
  els.description.value = item.description || "";
  els.notes.value = item.notes || "";
  els.beforeFile.value = "";
  els.afterFile.value = "";

  els.beforePreview.innerHTML = item.beforeImageUrl
    ? `<img src="${item.beforeImageUrl}" alt="開封前プレビュー">`
    : "Before";
  els.afterPreview.innerHTML = item.afterImageUrl
    ? `<img src="${item.afterImageUrl}" alt="開封後プレビュー">`
    : "After";

  els.deleteBtn.classList.remove("hidden");
}

function revealAdminArea() {
  els.pinArea.classList.add("hidden");
  els.adminArea.classList.remove("hidden");
}

function unlockAdmin() {
  const value = els.pinInput.value;
  if (adminPin && value !== adminPin) {
    alert("PINが違います。");
    return;
  }
  adminUnlocked = true;
  revealAdminArea();
}

function openAdmin() {
  resetForm();

  if (adminUnlocked || !adminPin) {
    revealAdminArea();
  } else {
    els.pinArea.classList.remove("hidden");
    els.adminArea.classList.add("hidden");
  }

  els.adminDialog.showModal();
}

function productMatches(item) {
  const search = els.search.value.trim().toLowerCase();
  const type = els.typeFilter.value;
  const version = els.versionFilter.value;

  if (type !== "all" && item.type !== type) return false;
  if (version !== "all" && item.version !== version) return false;

  if (!search) return true;

  const haystack = [
    item.name,
    item.type,
    item.version,
    item.period,
    item.description,
    item.notes
  ].join(" ").toLowerCase();

  return haystack.includes(search);
}

function renderProducts() {
  const filtered = products.filter(productMatches);

  els.totalCount.textContent = String(products.length);
  els.empty.classList.toggle("hidden", filtered.length > 0);
  els.grid.innerHTML = filtered.map(item => `
    <article class="product-card">
      <div class="product-images">
        <div class="product-image">
          <img src="${escapeHtml(item.beforeImageUrl || placeholderImage)}" alt="${escapeHtml(item.name)} 開封前">
          <span>開封前</span>
        </div>
        <div class="product-image">
          <img src="${escapeHtml(item.afterImageUrl || placeholderImage)}" alt="${escapeHtml(item.name)} 開封後">
          <span>開封後</span>
        </div>
      </div>
      <div class="product-body">
        <div class="badges">
          <span class="badge">${escapeHtml(formatText(item.type))}</span>
          <span class="badge">${escapeHtml(formatText(item.version))}</span>
        </div>
        <h3>${escapeHtml(formatText(item.name))}</h3>
        <p>${escapeHtml(formatText(item.description, "説明文は未入力です。")).slice(0, 90)}</p>
        <div class="product-footer">
          <small>${escapeHtml(formatText(item.period))}</small>
          <button class="text-btn" data-detail-id="${escapeHtml(item.id)}" type="button">詳細を見る</button>
        </div>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-detail-id]").forEach(button => {
    button.addEventListener("click", () => {
      const item = products.find(product => product.id === button.dataset.detailId);
      if (item) openDetail(item);
    });
  });
}

function openDetail(item) {
  selectedProduct = item;
  els.detailMeta.textContent = `${item.type || "-"} / ${item.version || "-"}`;
  els.detailTitle.textContent = item.name || "-";
  els.detailBefore.src = item.beforeImageUrl || placeholderImage;
  els.detailAfter.src = item.afterImageUrl || placeholderImage;
  els.detailPeriod.textContent = formatText(item.period);
  els.detailDescription.textContent = formatText(item.description);
  els.detailNotes.textContent = formatText(item.notes);
  els.detailDialog.showModal();
}

function sortProducts(items) {
  return items.sort((a, b) => {
    const at = a.createdAt?.seconds || 0;
    const bt = b.createdAt?.seconds || 0;
    return bt - at;
  });
}

function subscribeProducts() {
  if (unsubscribe) unsubscribe();

  const q = query(collection(db, collectionName), orderBy("createdAt", "desc"));
  unsubscribe = onSnapshot(q, snapshot => {
    products = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    products = sortProducts(products);
    renderProducts();
  }, error => {
    console.error(error);
    alert("商品データの読み込みに失敗しました。Firestoreルールや設定を確認してください。");
  });
}

async function initFirebase() {
  if (!isFirebaseConfigured()) {
    els.setupWarning.classList.remove("hidden");
    renderProducts();
    return;
  }

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  await signInAnonymously(auth);
  subscribeProducts();
}

els.search.addEventListener("input", renderProducts);
els.typeFilter.addEventListener("change", renderProducts);
els.versionFilter.addEventListener("change", renderProducts);
els.refreshBtn.addEventListener("click", () => {
  if (isFirebaseConfigured()) subscribeProducts();
});

els.openAdminBtn.addEventListener("click", openAdmin);
els.closeDialogBtn.addEventListener("click", () => els.adminDialog.close());
els.unlockBtn.addEventListener("click", unlockAdmin);
els.pinInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    unlockAdmin();
  }
});

els.beforeFile.addEventListener("change", () => renderPreview(els.beforeFile, els.beforePreview));
els.afterFile.addEventListener("change", () => renderPreview(els.afterFile, els.afterPreview));
els.productForm.addEventListener("submit", saveProduct);
els.deleteBtn.addEventListener("click", deleteProduct);
els.resetFormBtn.addEventListener("click", resetForm);

els.closeDetailBtn.addEventListener("click", () => els.detailDialog.close());
els.editFromDetailBtn.addEventListener("click", () => {
  if (!selectedProduct) return;
  els.detailDialog.close();
  loadIntoForm(selectedProduct);
  els.adminDialog.showModal();
});

initFirebase().catch(error => {
  console.error(error);
  alert("Firebase初期化に失敗しました。firebase-config.js の設定を確認してください。");
});
