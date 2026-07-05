import { useMemo, useState } from 'react';
import {
  exportStoreSnapshot,
  importStoreSnapshot,
  resetStoreSnapshot,
  saveStoreSnapshot,
  type StoreSnapshot,
  createBrand,
  createCategory,
  createProduct,
  deleteBrand,
  deleteCategory,
  deleteProduct,
} from '../data/store';
import { createProductArtwork } from '../data/catalog';
import type { Brand, Category, Product, CategorySlug, ProductType } from '../data/catalog';
import { getAdminPasswordHint, signInAdmin, signOutAdmin } from '../data/adminAuth';
import type { FormEvent } from 'react';
import BrandLogo from '../components/BrandLogo';

type AdminPageProps = {
  snapshot: StoreSnapshot;
  onSnapshotChange: (snapshot: StoreSnapshot) => void;
  isAuthenticated: boolean;
  onAuthChange: (nextValue: boolean) => void;
};

const productTypes: ProductType[] = ['Racket', 'Balls', 'Wear', 'Bag', 'Accessory', 'String', 'Grip'];
const newCategoryTemplate: Category = {
  slug: 'rackets',
  name: 'Нова секция',
  description: 'Добави описание на секцията.',
  heroTitle: 'Заглавие на секцията',
  heroCopy: 'Текст за hero секцията.',
  accent: 'Нова секция',
  focus: ['Ракети', 'Обувки'],
};
const newProductTemplate: Product = {
  sku: 'SKU-NEW',
  name: 'Нов продукт',
  categorySlug: 'rackets',
  type: 'Racket',
  brand: 'Нова марка',
  price: '€0.00',
  details: 'Добави детайли за продукта.',
  badges: ['Нов'],
  imageUrl: createProductArtwork('Нов продукт', 'Продуктова карта', '#6ea8fe'),
};
const newBrandTemplate: Brand = {
  name: 'Нова марка',
  categorySlugs: ['rackets'],
  note: 'Добави бележки за марката.',
};

function AdminPage({ snapshot, onSnapshotChange, isAuthenticated, onAuthChange }: AdminPageProps) {
  const [password, setPassword] = useState('');
  const [selectedProductSku, setSelectedProductSku] = useState(snapshot.products[0]?.sku ?? '');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(snapshot.categories[0]?.slug ?? '');
  const [selectedBrandName, setSelectedBrandName] = useState(snapshot.brands[0]?.name ?? '');
  const [selectedOrderReference, setSelectedOrderReference] = useState(snapshot.orders[0]?.reference ?? '');
  const [newCategory, setNewCategory] = useState<Category>(newCategoryTemplate);
  const [newProduct, setNewProduct] = useState<Product>(newProductTemplate);
  const [newBrand, setNewBrand] = useState<Brand>(newBrandTemplate);
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState('');

  const selectedProduct = snapshot.products.find((product) => product.sku === selectedProductSku) ?? snapshot.products[0];
  const selectedCategory = snapshot.categories.find((category) => category.slug === selectedCategorySlug) ?? snapshot.categories[0];
  const selectedBrand = snapshot.brands.find((brand) => brand.name === selectedBrandName) ?? snapshot.brands[0];
  const selectedOrder = snapshot.orders.find((order) => order.reference === selectedOrderReference) ?? snapshot.orders[0];

  const visibleOrders = useMemo(() => snapshot.orders.slice(0, 20), [snapshot.orders]);

  function persistAndSelect(nextSnapshot: StoreSnapshot, statusMessage: string) {
    onSnapshotChange(nextSnapshot);
    saveStoreSnapshot(nextSnapshot);
    setMessage(statusMessage);
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const authed = signInAdmin(password);
    onAuthChange(authed);
    setMessage(authed ? 'Админ достъпът е разрешен.' : 'Невалидна админ парола.');
    if (authed) {
      setPassword('');
    }
  }

  function handleLogout() {
    signOutAdmin();
    onAuthChange(false);
    setMessage('Админът е отписан.');
  }

  function updateProductField(field: keyof Product, value: string) {
    if (!selectedProduct) {
      return;
    }

    const updatedProducts = snapshot.products.map((product) =>
      product.sku === selectedProduct.sku
        ? {
            ...product,
            [field]: field === 'badges' ? value.split(',').map((item) => item.trim()).filter(Boolean) : value,
          }
        : product,
    );

    persistAndSelect({ ...snapshot, products: updatedProducts }, 'Продуктът е записан.');
  }

  function updateCategoryField(field: keyof Category, value: string) {
    if (!selectedCategory) {
      return;
    }

    const updatedCategories = snapshot.categories.map((category) =>
      category.slug === selectedCategory.slug
        ? {
            ...category,
            [field]: field === 'focus' ? value.split(',').map((item) => item.trim()).filter(Boolean) : value,
          }
        : category,
    );

    persistAndSelect({ ...snapshot, categories: updatedCategories }, 'Секцията е записана.');
  }

  function updateBrandField(field: keyof Brand, value: string) {
    if (!selectedBrand) {
      return;
    }

    const updatedBrands = snapshot.brands.map((brand) =>
      brand.name === selectedBrand.name
        ? {
            ...brand,
            [field]: field === 'categorySlugs' ? value.split(',').map((item) => item.trim()).filter(Boolean) as CategorySlug[] : value,
          }
        : brand,
    );

    persistAndSelect({ ...snapshot, brands: updatedBrands }, 'Марката е записана.');
  }

  function handleCreateProduct() {
    const nextSnapshot = createProduct({
      ...newProduct,
      sku: `${newProduct.sku}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
    });
    persistAndSelect(nextSnapshot, 'Продуктът е създаден.');
  }

  function handleCreateCategory() {
    const nextSnapshot = createCategory({
      ...newCategory,
      slug: `${newCategory.slug}-${Date.now().toString(36).slice(-4).toLowerCase()}`,
    });
    persistAndSelect(nextSnapshot, 'Секцията е създадена.');
  }

  function handleCreateBrand() {
    const nextSnapshot = createBrand({
      ...newBrand,
      name: `${newBrand.name} ${Date.now().toString(36).slice(-3).toUpperCase()}`,
    });
    persistAndSelect(nextSnapshot, 'Марката е създадена.');
  }

  function handleDeleteProduct() {
    if (!selectedProduct) {
      return;
    }

    const nextSnapshot = deleteProduct(selectedProduct.sku);
    persistAndSelect(nextSnapshot, 'Продуктът е изтрит.');
  }

  function handleDeleteCategory() {
    if (!selectedCategory) {
      return;
    }

    const nextSnapshot = deleteCategory(selectedCategory.slug);
    persistAndSelect(nextSnapshot, 'Секцията е изтрита.');
  }

  function handleDeleteBrand() {
    if (!selectedBrand) {
      return;
    }

    const nextSnapshot = deleteBrand(selectedBrand.name);
    persistAndSelect(nextSnapshot, 'Марката е изтрита.');
  }

  function handleImport() {
    try {
      const parsed = JSON.parse(importText) as StoreSnapshot;

      if (!parsed.categories || !parsed.brands || !parsed.products) {
        throw new Error('Invalid export payload.');
      }

      const nextSnapshot: StoreSnapshot = {
        categories: parsed.categories,
        brands: parsed.brands,
        products: parsed.products,
        orders: parsed.orders ?? snapshot.orders,
      };

      importStoreSnapshot(nextSnapshot);
      onSnapshotChange(nextSnapshot);
      setMessage('Съдържанието е импортирано успешно.');
    } catch {
      setMessage('Импортът не успя. Постави JSON експорт от тази CMS.');
    }
  }

  function handleReset() {
    resetStoreSnapshot();
    const nextSnapshot = {
      ...snapshot,
      ...JSON.parse(exportStoreSnapshot()),
    } as StoreSnapshot;
    onSnapshotChange(nextSnapshot);
    setMessage('Каталогът е върнат към началните данни.');
  }

  if (!isAuthenticated) {
    return (
      <div className="page-shell admin-shell">
        <header className="hero admin-hero">
          <BrandLogo compact subtitle="CMS" />
          <h1>Вход за админ</h1>
          <p className="intro">{getAdminPasswordHint()}</p>
          <form className="admin-login" onSubmit={handleLogin}>
            <label>
              Парола
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button className="button button-primary" type="submit">
              Вход
            </button>
          </form>
          {message ? <p className="form-status">{message}</p> : null}
        </header>
      </div>
    );
  }

  return (
    <div className="page-shell admin-shell">
      <header className="hero admin-hero">
        <div className="topbar">
          <div>
            <BrandLogo compact subtitle="CMS" />
            <h1>Racketpoint съдържание.</h1>
          </div>
          <a className="nav-cta" href="/">
            Обратно към магазина
          </a>
        </div>

        <div className="admin-actions">
          <button className="button button-primary" type="button" onClick={() => setImportText(exportStoreSnapshot())}>
            Експорт на JSON
          </button>
          <button className="button button-secondary" type="button" onClick={handleReset}>
            Нулирай каталога
          </button>
          <button className="button button-secondary" type="button" onClick={handleLogout}>
            Изход
          </button>
        </div>

        {message ? <p className="form-status">{message}</p> : null}
      </header>

      <main className="admin-layout">
        <aside className="admin-sidebar">
          <section className="admin-list-card">
            <p className="eyebrow">Продукти</p>
            {snapshot.products.map((product) => (
              <button
                key={product.sku}
                className={product.sku === selectedProductSku ? 'admin-list-item active' : 'admin-list-item'}
                type="button"
                onClick={() => setSelectedProductSku(product.sku)}
              >
                <strong>{product.name}</strong>
                <span>{product.categorySlug}</span>
              </button>
            ))}
            <div className="admin-create-stack">
              <input value={newProduct.sku} onChange={(event) => setNewProduct({ ...newProduct, sku: event.target.value })} placeholder="Нов SKU" />
              <input value={newProduct.name} onChange={(event) => setNewProduct({ ...newProduct, name: event.target.value })} placeholder="Име на продукта" />
              <button className="button button-primary" type="button" onClick={handleCreateProduct}>
                Добави продукт
              </button>
            </div>
          </section>

          <section className="admin-list-card">
            <p className="eyebrow">Категории</p>
            {snapshot.categories.map((category) => (
              <button
                key={category.slug}
                className={category.slug === selectedCategorySlug ? 'admin-list-item active' : 'admin-list-item'}
                type="button"
                onClick={() => setSelectedCategorySlug(category.slug)}
              >
                <strong>{category.name}</strong>
                <span>{category.slug}</span>
              </button>
            ))}
            <div className="admin-create-stack">
              <input value={newCategory.slug} onChange={(event) => setNewCategory({ ...newCategory, slug: event.target.value as CategorySlug })} placeholder="slug на категория" />
              <input value={newCategory.name} onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })} placeholder="Име на категория" />
              <button className="button button-primary" type="button" onClick={handleCreateCategory}>
                Добави категория
              </button>
            </div>
          </section>

          <section className="admin-list-card">
            <p className="eyebrow">Марки</p>
            {snapshot.brands.map((brand) => (
              <button
                key={brand.name}
                className={brand.name === selectedBrandName ? 'admin-list-item active' : 'admin-list-item'}
                type="button"
                onClick={() => setSelectedBrandName(brand.name)}
              >
                <strong>{brand.name}</strong>
                <span>{brand.categorySlugs.join(', ')}</span>
              </button>
            ))}
            <div className="admin-create-stack">
              <input value={newBrand.name} onChange={(event) => setNewBrand({ ...newBrand, name: event.target.value })} placeholder="Име на марка" />
              <button className="button button-primary" type="button" onClick={handleCreateBrand}>
                Добави марка
              </button>
            </div>
          </section>

          <section className="admin-list-card">
            <p className="eyebrow">Поръчки</p>
            {visibleOrders.length > 0 ? (
              visibleOrders.map((order) => (
                <button
                  key={order.reference}
                  className={order.reference === selectedOrderReference ? 'admin-list-item active' : 'admin-list-item'}
                  type="button"
                  onClick={() => setSelectedOrderReference(order.reference)}
                >
                  <strong>{order.reference}</strong>
                  <span>{order.fullName}</span>
                </button>
              ))
            ) : (
              <p className="admin-empty">Все още няма заявки.</p>
            )}
          </section>
        </aside>

        <section className="admin-editor">
          <article className="admin-panel">
            <p className="eyebrow">Редакция на продукт</p>
            {selectedProduct ? (
              <div className="admin-form-grid">
                <label>
                  Име
                  <input value={selectedProduct.name} onChange={(event) => updateProductField('name', event.target.value)} />
                </label>
                <label>
                  Категория
                  <select value={selectedProduct.categorySlug} onChange={(event) => updateProductField('categorySlug', event.target.value)}>
                    {snapshot.categories.map((category) => (
                      <option key={category.slug} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Тип
                  <select value={selectedProduct.type} onChange={(event) => updateProductField('type', event.target.value)}>
                    {productTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Марка
                  <input value={selectedProduct.brand} onChange={(event) => updateProductField('brand', event.target.value)} />
                </label>
                <label>
                  Цена
                  <input value={selectedProduct.price} onChange={(event) => updateProductField('price', event.target.value)} />
                </label>
                <label className="full-width">
                  Детайли
                  <textarea rows={4} value={selectedProduct.details} onChange={(event) => updateProductField('details', event.target.value)} />
                </label>
                <label className="full-width">
                  Етикети, разделени със запетая
                  <input value={selectedProduct.badges.join(', ')} onChange={(event) => updateProductField('badges', event.target.value)} />
                </label>
                <label className="full-width">
                  Image URL
                  <input value={selectedProduct.imageUrl} onChange={(event) => updateProductField('imageUrl', event.target.value)} />
                </label>
                <div className="full-width admin-inline-actions">
                  <button className="button button-primary" type="button" onClick={() => persistAndSelect(snapshot, 'Продуктът е обновен.')}>Запази</button>
                  <button className="button button-secondary" type="button" onClick={handleDeleteProduct}>Изтрий</button>
                </div>
              </div>
            ) : (
              <p className="admin-empty">Избери продукт.</p>
            )}
          </article>

          <article className="admin-panel">
            <p className="eyebrow">Редакция на категория</p>
            {selectedCategory ? (
              <div className="admin-form-grid">
                <label>
                  Име
                  <input value={selectedCategory.name} onChange={(event) => updateCategoryField('name', event.target.value)} />
                </label>
                <label>
                  Slug
                  <input value={selectedCategory.slug} onChange={(event) => updateCategoryField('slug', event.target.value)} />
                </label>
                <label className="full-width">
                  Описание
                  <textarea rows={3} value={selectedCategory.description} onChange={(event) => updateCategoryField('description', event.target.value)} />
                </label>
                <label className="full-width">
                  Заглавие
                  <input value={selectedCategory.heroTitle} onChange={(event) => updateCategoryField('heroTitle', event.target.value)} />
                </label>
                <label className="full-width">
                  Текст на hero секцията
                  <textarea rows={4} value={selectedCategory.heroCopy} onChange={(event) => updateCategoryField('heroCopy', event.target.value)} />
                </label>
                <label>
                  Акцент
                  <input value={selectedCategory.accent} onChange={(event) => updateCategoryField('accent', event.target.value)} />
                </label>
                <label className="full-width">
                  Фокус елементи, разделени със запетая
                  <input value={selectedCategory.focus.join(', ')} onChange={(event) => updateCategoryField('focus', event.target.value)} />
                </label>
                <div className="full-width admin-inline-actions">
                  <button className="button button-primary" type="button" onClick={() => persistAndSelect(snapshot, 'Категорията е обновена.')}>Запази</button>
                  <button className="button button-secondary" type="button" onClick={handleDeleteCategory}>Изтрий</button>
                </div>
              </div>
            ) : (
              <p className="admin-empty">Избери категория.</p>
            )}
          </article>

          <article className="admin-panel">
            <p className="eyebrow">Редакция на марка</p>
            {selectedBrand ? (
              <div className="admin-form-grid">
                <label>
                  Име
                  <input value={selectedBrand.name} onChange={(event) => updateBrandField('name', event.target.value)} />
                </label>
                <label className="full-width">
                  Бележки
                  <textarea rows={3} value={selectedBrand.note} onChange={(event) => updateBrandField('note', event.target.value)} />
                </label>
                <label className="full-width">
                  Slugs на категории, разделени със запетая
                  <input
                    value={selectedBrand.categorySlugs.join(', ')}
                    onChange={(event) => updateBrandField('categorySlugs', event.target.value)}
                  />
                </label>
                <div className="full-width admin-inline-actions">
                  <button className="button button-primary" type="button" onClick={() => persistAndSelect(snapshot, 'Марката е обновена.')}>Запази</button>
                  <button className="button button-secondary" type="button" onClick={handleDeleteBrand}>Изтрий</button>
                </div>
              </div>
            ) : (
              <p className="admin-empty">Избери марка.</p>
            )}
          </article>

          <article className="admin-panel">
            <p className="eyebrow">Импорт и експорт</p>
            <textarea
              className="admin-import"
              rows={10}
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="Постави JSON експорт тук, за да импортираш каталога."
            />
            <div className="admin-actions">
              <button className="button button-primary" type="button" onClick={handleImport}>
                Импортирай JSON
              </button>
              <button className="button button-secondary" type="button" onClick={() => setImportText(exportStoreSnapshot())}>
                Зареди JSON експорт
              </button>
            </div>
          </article>

          <article className="admin-panel">
            <p className="eyebrow">Входящи заявки</p>
            {selectedOrder ? (
              <div className="admin-order-detail">
                <h3>{selectedOrder.reference}</h3>
                <p>{selectedOrder.fullName}</p>
                <p>{selectedOrder.email}</p>
                <p>{selectedOrder.createdAt}</p>
                <p>{selectedOrder.notes || 'Няма бележки.'}</p>
                <p>
                  Артикули:{' '}
                  {selectedOrder.items.map((item) => `${item.sku} x${item.quantity}`).join(', ')}
                </p>
              </div>
            ) : (
              <p className="admin-empty">Няма избрана заявка.</p>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}

export default AdminPage;
