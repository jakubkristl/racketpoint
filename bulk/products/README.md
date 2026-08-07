# Offline Bulk Product Workflow

Use this folder to manage products offline and upload in bulk when ready.

## Files and folders

- `bulk/products/products-template.csv`
  - Main spreadsheet template. Open it in Excel/Google Sheets.
- `public/imports/product-images/`
  - Put product images here. Use the `imageFile` column in CSV.
- `bulk/products/base-snapshot.json`
  - Export this from Admin panel (`Export JSON`) and save it here before bulk generation.
- `bulk/products/bulk-import.json`
  - Generated import payload. Paste into Admin `Import JSON` area.

## CSV column guide

- `sku`: unique product identifier.
- `name`: product title shown in cards and search.
- `categorySlug`: e.g. `squash`, `tennis`, `badminton`, `padel`, `table-tennis`.
- `type`: one of `Racket`, `Balls`, `Wear`, `Bag`, `Accessory`, `String`, `Grip`, `Shoe`.
- `brand`: brand name (auto-added to brands if missing).
- `priceEur`: selling price for filters and storefront.
- `costEur`: internal margin analytics (not shown to customers).
- `stock`: quantity for in-stock filtering.
- `details`: searchable product description.
- `badges`: tags separated by `|` (example: `NEW|PRO|LIMITED`).
- `sizes`: values separated by `|` (example: `S|M|L|43|44`).
  - Added to details text to support current size filtering behavior.
- `weightGrams`: numeric weight for weight filters.
- `balance`: `Head-heavy`, `Balanced`, or `Head-light`.
- `color`: optional.
- `headShape`: `Teardrop`, `Round`, or `Hybrid` (rackets).
- `imageFile`: filename located in `public/imports/product-images/`.
- `imageUrl`: optional full URL, overrides `imageFile` if present.
- `originalPriceEur`: optional old price (strikethrough sale style).
- `salePriceEur`: optional promo price.
- `active`: `true` or `false` (rows with `false` are skipped).

## Bulk generate command

From project root:

```bash
node scripts/buildBulkImportFromCsv.js
```

Optional custom paths:

```bash
node scripts/buildBulkImportFromCsv.js --csv bulk/products/products-template.csv --base bulk/products/base-snapshot.json --out bulk/products/bulk-import.json
```

## Import into admin

1. Open `/admin`
2. Click `Load JSON export` (optional check)
3. Paste contents of `bulk/products/bulk-import.json` into import box
4. Click `Import JSON`

## Recommended offline process

1. Maintain products in CSV only.
2. Keep all new images in `public/imports/product-images/`.
3. Re-run script after each update.
4. Import JSON in one batch when ready.
