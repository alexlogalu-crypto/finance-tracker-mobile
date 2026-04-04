# Transaction Detail + Transactions List + Dark Theme

**Date:** 2026-04-03
**Status:** Approved

---

## Overview

Three related changes:
1. Add a `TransactionDetailScreen` to view and delete a single transaction.
2. Add a `TransactionsScreen` (full list) as a new bottom tab.
3. Retheme all existing screens to the dark/blue color palette.

---

## Color System

| Token | Value | Usage |
|---|---|---|
| `BG` | `#1a1a2e` | All screen backgrounds |
| `SURFACE` | `#16213e` | Cards, inputs, modal sheets |
| `ACCENT` | `#4f6ef7` | Buttons, active tabs, highlights |
| `TEXT` | `#f0f4f8` | Primary text |
| `TEXT_MUTED` | `#a0aec0` | Secondary/date/label text |
| `INCOME` | `#48bb78` | Income amounts |
| `EXPENSE` | `#fc8181` | Expense amounts |
| `ERROR` | `#fc8181` | Error messages |
| `BORDER` | `#2a2a4a` | Dividers, input borders |

---

## TransactionDetailScreen

**File:** `screens/TransactionDetailScreen.js`
**Route:** `TransactionDetail` (Stack, with back header)
**Params:** `route.params.transaction` — full transaction object

### Layout

- **Header area:** Category color dot + category name, type badge (Income/Expense pill in accent/red)
- **Description:** Large prominent text
- **Amount:** Large, colored green (`#48bb78`) for income, red (`#fc8181`) for expense
- **Date:** Muted secondary text
- **Delete button:** Fixed at bottom, red background, full-width

### Delete flow

1. User taps Delete
2. `deleting` state → button shows `ActivityIndicator`, disabled
3. `DELETE /api/v1/transactions/{id}` with `Authorization: Bearer {token}`
4. On 200: `Alert.alert('Transaction deleted', '', [{ text: 'OK', onPress: () => navigation.goBack() }])`
5. On error: `Alert.alert('Error', message)`
6. On 401: clear token, navigate to Login

---

## TransactionsScreen

**File:** `screens/TransactionsScreen.js`
**Route:** `Transactions` tab (3rd tab in bottom nav)

### Data

- `GET /api/v1/transactions` with JWT
- Fetches on focus (`useFocusEffect`)
- Supports pull-to-refresh (`RefreshControl`)

### Layout

- Header: "Transactions" title
- FlatList of transaction rows (same style as Dashboard rows, tappable)
- Each row → `navigation.navigate('TransactionDetail', { transaction: item })`
- Empty state: "No transactions yet."
- Error state: error message + Retry button
- Loading state: `ActivityIndicator`

---

## Navigation Changes

### App.js

- Add `Transactions` tab to `Tab.Navigator` (between Dashboard and Budget, or after Budget)
- Add `TransactionDetail` to `Stack.Navigator` with `headerShown: true`, title "Transaction", back button

### DashboardScreen

- `renderTransaction` wraps `View` → `TouchableOpacity`
- `onPress={() => navigation.navigate('TransactionDetail', { transaction: item })}`

---

## Screens to Retheme

All existing screens updated with the new color tokens:

- `LoginScreen.js`
- `DashboardScreen.js`
- `AddTransactionScreen.js`
- `BudgetScreen.js`

Changes per screen:
- `backgroundColor` on containers: `#f5f5f5` → `#1a1a2e`
- Card/input `backgroundColor`: `#fff` → `#16213e`
- Primary text `color`: `#111` → `#f0f4f8`
- Secondary text: `#888`, `#555`, `#444` → `#a0aec0`
- Borders: `#eee`, `#ddd` → `#2a2a4a`
- Accent buttons (currently `#111` bg): → `#4f6ef7`
- Tab bar: `backgroundColor` → `#1a1a2e`, active tint → `#4f6ef7`, inactive → `#a0aec0`

---

## API Reference

- **Base URL:** `https://finance-tracker-production-e13e.up.railway.app/api/v1`
- **Token storage key:** `access_token` (AsyncStorage)
- **List transactions:** `GET /transactions`
- **Delete transaction:** `DELETE /transactions/{id}`

---

## Out of Scope

- Editing transactions (separate feature)
- Pagination/infinite scroll on transactions list
- Filter/sort on transactions list
