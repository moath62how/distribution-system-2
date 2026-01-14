# API Features Implementation Summary

## Backend Changes

### 1. Updated Routes: `backend/routes/clients.js`

- **GET /api/clients** - Now supports:

  - **Search**: `?q=term` (searches name and phone)
  - **Filter**: `?id=value` (filters by ID)
  - **Sort**: `?sort=field` or `?sort=-field` (ascending/descending)
  - **Pagination**: `?page=1&limit=25`
  - **Response format**: `{ data: [...], pagination: { page, limit, pages, total } }`

- **GET /api/clients/:id** - Enhanced with:
  - Material totals calculation (volume and value per material type)
  - Returns: `{ client, totals, deliveries, payments, adjustments, materialTotals }`

### 2. ApiFeatures Class: `backend/controllers/apiFeatures.js`

Reusable utility for API features:

- `search(fields)` - Full-text search across multiple fields
- `filter(allowedFields)` - Exact match and range filtering (min*/max* suffixes)
- `sort(defaultSort)` - Dynamic sorting with - prefix for descending
- `paginate(defaultLimit)` - Pagination with total count
- `get()` - Async execution with pagination metadata

## Frontend Changes

### 1. Clients List: `backend/public/js/clients.js`

- Added search bar with real-time filtering
- Pagination controls (Previous/Next buttons)
- Page info display
- New responsive styles for pagination
- `loadClients(page)` function handles pagination state

### 2. Client Details: `backend/public/js/clients-details.js`

- New `renderMaterialCards()` function displays material totals in card format
- New `renderAdjustmentsTable()` for adjustment history
- New `fetchClientDetails()` fetches and renders all data from API
- Material cards show:
  - Material name
  - Total quantity (m³)
  - Total value (currency)
- Gradient cards with hover effects
- Responsive grid layout

## Usage Examples

### Search Clients

```
GET /api/clients?q=أحمد
```

### Paginate Clients

```
GET /api/clients?page=2&limit=25
```

### Filter & Sort

```
GET /api/clients?sort=-id&page=1&limit=10
```

### Get Client Details with Materials

```
GET /api/clients/123
```

Returns material breakdown like:

```json
{
  "materialTotals": [
    {
      "material": "رمل",
      "totalQty": 1250.5,
      "totalValue": 25000
    }
  ]
}
```

## Frontend Features

### Clients Page

- Search box to find clients by name/phone
- Pagination with page navigation
- Responsive card grid layout

### Client Details Page

- Financial summary (opening balance, deliveries, payments, adjustments)
- Deliveries table with all transaction details
- Payments table
- Adjustments table
- **Material Summary Cards** showing:
  - Total volume per material
  - Total value per material
  - Sorted by highest volume first
  - Attractive gradient design with hover effects

## Configuration

Default pagination limit: **25 records per page**

Search fields for clients:

- `name`
- `phone`

Allowed filter fields:

- `id`

Material cards are automatically calculated from deliveries data on the backend.
