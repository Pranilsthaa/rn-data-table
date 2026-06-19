# rn-data-table

A performant, horizontally-scrollable **React Native data table** with:

- 📌 **Sticky columns** — pin any column to the left while the rest scroll horizontally
- 🌲 **Nested / expandable rows** — tree-structured data with chevron expand/collapse
- ➕ **Totals footer row** — display summed columns below the data with a bold highlighted row
- ♻️ **Pull-to-refresh** and **infinite scroll** (pagination)
- 🎨 **Fully themeable** — supply your own colors and font families via a single `theme` prop
- ⚡ **Single animated style** for the sticky overlay, regardless of row count

## Installation

```bash
npm install rn-data-table
# or
yarn add rn-data-table
```

### Peer dependencies

```bash
npm install react-native-gesture-handler react-native-reanimated
```

Follow the setup guides for each:
- [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/installation)
- [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/)

## Basic usage

```tsx
import DataTable from 'rn-data-table';

const columns = [
  { key: 'name',   title: 'Name',   width: 140, sticky: true },
  { key: 'date',   title: 'Date',   width: 100 },
  { key: 'amount', title: 'Amount', width: 90  },
];

const data = [
  { name: 'Alice', date: '2082-01-21', amount: 500 },
  { name: 'Bob',   date: '2082-01-22', amount: 300 },
];

export default function MyScreen() {
  return (
    <DataTable
      columns={columns}
      data={data}
      totals={{ amount: 800 }}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `Column[]` | **required** | Column definitions |
| `data` | `any[]` | **required** | Row data |
| `totals` | `Record<string, string \| number>` | — | Values to show in the Total footer row |
| `nestedKey` | `string` | — | Object key that holds child rows |
| `onPressRow` | `(row) => void` | — | Tap handler for a data row |
| `onLoadMore` | `() => void` | — | Called when scrolled near the bottom |
| `hasNextPage` | `boolean` | — | Controls whether `onLoadMore` fires |
| `isLoading` | `boolean` | `false` | Shows a full-table spinner |
| `isFetchingMore` | `boolean` | `false` | Shows a footer spinner |
| `onRefresh` | `() => void` | — | Pull-to-refresh handler |
| `refreshing` | `boolean` | `false` | Pull-to-refresh state |
| `emptyText` | `string` | `"No data available"` | Empty state message |
| `keyExtractor` | `(item, index) => string` | — | Custom row key |
| `theme` | `Partial<DataTableTheme>` | Light palette | Visual theme (see below) |

### `Column`

```ts
type Column = {
  key: string;       // matches a key in your data objects
  title: string;     // displayed in the header
  width: number;     // fixed pixel width
  sticky?: boolean;  // pin to the left
};
```

### `DataTableTheme`

```ts
interface DataTableTheme {
  text: string;          // cell text
  subText: string;       // header / empty state text
  background: string;    // even-row background
  background2: string;   // sticky header / odd-row / total row background
  backgroundDark: string;// alternate row tint
  border: string;        // separator color
  accent: string;        // spinner / loader color
  fontRegular?: string;  // fontFamily strings (optional — use system fonts if omitted)
  fontMedium?: string;
  fontSemiBold?: string;
  fontBold?: string;
}
```

### Theming example (dark mode)

```tsx
<DataTable
  columns={columns}
  data={data}
  theme={{
    text: '#F9FAFB',
    subText: '#9CA3AF',
    background: '#111827',
    background2: '#1F2937',
    backgroundDark: '#1a2232',
    border: '#374151',
    accent: '#818CF8',
    fontMedium: 'Inter_500Medium',
    fontSemiBold: 'Inter_600SemiBold',
    fontBold: 'Inter_700Bold',
  }}
/>
```

### Nested rows

```tsx
const data = [
  {
    name: 'Fee Income',
    amount: 1500,
    children: [
      { name: 'Tuition', amount: 1000 },
      { name: 'Transport', amount: 500 },
    ],
  },
];

<DataTable columns={columns} data={data} nestedKey="children" />
```

## Special row types

Rows with `_type: "section"` or `_type: "total"` automatically render in **bold**.

## License

MIT
