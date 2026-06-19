import React, { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SharedValue } from "react-native-gesture-handler/lib/typescript/v3/types";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

// ── Theme ──────────────────────────────────────────────────────────────────

export interface DataTableTheme {
  /** Default cell / header text color */
  text: string;
  /** Subdued text (header labels, empty state) */
  subText: string;
  /** Primary background for even rows and the container */
  background: string;
  /** Slightly elevated background for odd rows, sticky header, total row */
  background2: string;
  /** Darker tint used for alternating rows */
  backgroundDark: string;
  /** Separator / border color */
  border: string;
  /** Accent color (loader spinner) */
  accent: string;
  /** Font family for regular cell text */
  fontRegular?: string;
  /** Font family for medium-weight text */
  fontMedium?: string;
  /** Font family for semi-bold header text */
  fontSemiBold?: string;
  /** Font family for bold text (section rows, total row) */
  fontBold?: string;
}

const DEFAULT_LIGHT_THEME: DataTableTheme = {
  text: "#111827",
  subText: "#6B7280",
  background: "#FFFFFF",
  background2: "#F9FAFB",
  backgroundDark: "#F3F4F6",
  border: "#E5E7EB",
  accent: "#6366F1",
};

// ── Types ──────────────────────────────────────────────────────────────────

export type Column = {
  key: string;
  title: string;
  width: number;
  sticky?: boolean;
};

export interface DataTableProps {
  columns: Column[];
  data: any[];
  nestedKey?: string;
  onLoadMore?: () => any;
  isLoading?: boolean;
  isFetchingMore?: boolean;
  keyExtractor?: (item: any, index: number) => string;
  emptyText?: string;
  onPressRow?: (row: any) => void;
  onRefresh?: () => any;
  refreshing?: boolean;
  hasNextPage?: boolean;
  /** Keys are column keys; values are the totals to display in the footer row. */
  totals?: Record<string, string | number>;
  /**
   * Visual theme. Defaults to a light palette if omitted.
   * Pass your own colors to match your app's design system.
   */
  theme?: Partial<DataTableTheme>;
}

interface FlatRow<T> {
  row: T;
  depth: number;
  rowKey: string;
  hasNested: boolean;
  nestedRows: T[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function mergeTheme(override?: Partial<DataTableTheme>): DataTableTheme {
  return { ...DEFAULT_LIGHT_THEME, ...override };
}

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const ChevronIcon = ({ expanded, color }: { expanded: boolean; color: string }) => (
  <View
    style={[
      styles.chevron,
      { transform: [{ rotate: expanded ? "90deg" : "0deg" }] },
    ]}
  >
    <View style={[styles.chevronArrow, { borderLeftColor: color }]} />
  </View>
);

function buildVisibleRows<T extends Record<string, unknown>>(
  data: T[],
  nestedKey: string | undefined,
  keyExtractor: ((item: T, index: number) => string) | undefined,
  expandedKeys: Record<string, boolean>,
): FlatRow<T>[] {
  const result: FlatRow<T>[] = [];

  const walk = (rows: T[], depth: number, parentKey: string) => {
    rows.forEach((row, i) => {
      const rowKey =
        depth === 0
          ? keyExtractor
            ? keyExtractor(row, i)
            : String(i)
          : `${parentKey}-${i}`;

      const nested = nestedKey ? (row[nestedKey] as T[] | undefined) : undefined;
      const hasNested = Array.isArray(nested) && nested.length > 0;

      result.push({ row, depth, rowKey, hasNested, nestedRows: nested ?? [] });

      if (expandedKeys[rowKey] && hasNested) {
        walk(nested!, depth + 1, rowKey);
      }
    });
  };

  walk(data, 0, "");
  return result;
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface ScrollableHeaderProps {
  stickyColumns: Column[];
  scrollColumns: Column[];
  stickyWidth: number;
  theme: DataTableTheme;
}

const ScrollableHeader = memo(
  ({ stickyColumns, scrollColumns, stickyWidth, theme }: ScrollableHeaderProps) => (
    <View
      style={[
        styles.headerRow,
        {
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          backgroundColor: theme.background2,
        },
      ]}
    >
      {/* Invisible room for the sticky overlay */}
      <View style={{ width: stickyWidth }} />

      {scrollColumns.map((col) => (
        <View key={col.key} style={[styles.headerCell, { width: col.width }]}>
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[
              styles.headerText,
              {
                color: theme.subText,
                fontFamily: theme.fontSemiBold,
              },
            ]}
          >
            {col.title}
          </Text>
        </View>
      ))}
    </View>
  ),
);

interface ScrollableRowProps {
  item: FlatRow<any>;
  index: number;
  scrollColumns: Column[];
  stickyWidth: number;
  onPressRow?: (row: any) => void;
  toggleRow: (key: string) => void;
  renderValue: (col: Column, row: any) => React.ReactNode;
  theme: DataTableTheme;
}

const ScrollableRow = memo(
  ({
    item: { row, depth, rowKey, hasNested },
    index,
    scrollColumns,
    stickyWidth,
    onPressRow,
    toggleRow,
    renderValue,
    theme,
  }: ScrollableRowProps) => {
    const rowBg =
      depth > 0
        ? theme.background2
        : index % 2 === 0
          ? theme.background
          : theme.backgroundDark;

    return (
      <TouchableOpacity
        activeOpacity={onPressRow || hasNested ? 0.6 : 1}
        disabled={!onPressRow && !hasNested}
        onPress={() => {
          if (hasNested) toggleRow(rowKey);
          else onPressRow?.(row);
        }}
        style={[styles.row, { backgroundColor: rowBg }]}
      >
        {/* Spacer — the sticky overlay sits above this */}
        <View style={{ width: stickyWidth }} />

        {/* Scrollable columns only */}
        <View style={styles.scrollableColumnsContainer}>
          {scrollColumns.map((col) => (
            <View key={col.key} style={[styles.cell, { width: col.width }]}>
              {renderValue(col, row)}
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  },
);

// ── Sticky Overlay ─────────────────────────────────────────────────────────

interface StickyOverlayProps {
  stickyColumns: Column[];
  scrollColumns: Column[];
  visibleRows: FlatRow<any>[];
  expandedKeys: Record<string, boolean>;
  toggleRow: (key: string) => void;
  onPressRow?: (row: any) => void;
  renderValue: (col: Column, row: any) => React.ReactNode;
  scrollY: SharedValue<number>;
  totals?: Record<string, string | number>;
  theme: DataTableTheme;
}

const StickyOverlay = memo(
  ({
    stickyColumns,
    visibleRows,
    expandedKeys,
    toggleRow,
    onPressRow,
    renderValue,
    scrollY,
    totals,
    theme,
  }: StickyOverlayProps) => {
    const stickyTranslate = useAnimatedStyle(() => ({
      transform: [{ translateY: -scrollY.value }],
    }));

    return (
      <Animated.View pointerEvents="box-none" style={styles.stickyOverlay}>
        {/* Sticky header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            height: 52,
            zIndex: 999,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            backgroundColor: theme.background2,
          }}
        >
          {stickyColumns.map((col) => (
            <Animated.View
              key={col.key}
              style={{
                flex: 1,
                width: col.width,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                paddingVertical: 14,
              }}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[
                  styles.headerText,
                  { color: theme.subText, fontFamily: theme.fontSemiBold },
                ]}
              >
                {col.title}
              </Text>
            </Animated.View>
          ))}
        </View>

        <Animated.View style={stickyTranslate}>
          {visibleRows.map(({ row, depth, rowKey, hasNested }, index) => {
            const expanded = !!expandedKeys[rowKey];
            const rowBg =
              depth > 0
                ? theme.background2
                : index % 2 === 0
                  ? theme.background
                  : theme.backgroundDark;

            return (
              <React.Fragment key={rowKey}>
                <TouchableOpacity
                  activeOpacity={onPressRow || hasNested ? 0.6 : 1}
                  disabled={!onPressRow && !hasNested}
                  onPress={() => {
                    if (hasNested) toggleRow(rowKey);
                    else onPressRow?.(row);
                  }}
                  style={[styles.row, { backgroundColor: rowBg }]}
                >
                  {stickyColumns.map((col, i) => (
                    <View
                      key={col.key}
                      style={[
                        styles.cell,
                        {
                          width: col.width,
                          paddingLeft: i === 0 ? 14 + depth * 12 : 14,
                        },
                      ]}
                    >
                      {i === 0 && hasNested && (
                        <View style={styles.expandBtn}>
                          <ChevronIcon expanded={expanded} color={theme.subText} />
                        </View>
                      )}
                      {renderValue(col, row)}
                    </View>
                  ))}
                </TouchableOpacity>

                {/* Row divider — must mirror FlatList's ItemSeparatorComponent */}
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              </React.Fragment>
            );
          })}

          {/* Sticky portion of the Total row */}
          {totals && (
            <View
              style={[
                styles.row,
                styles.totalRow,
                {
                  backgroundColor: theme.background2,
                  borderTopColor: theme.border,
                },
              ]}
            >
              {stickyColumns.map((col, i) => (
                <View key={col.key} style={[styles.cell, { width: col.width }]}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.cellText,
                      styles.totalText,
                      {
                        color: theme.text,
                        fontFamily: theme.fontBold,
                      },
                    ]}
                  >
                    {i === 0
                      ? "Total"
                      : totals[col.key] !== undefined
                        ? String(totals[col.key])
                        : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </Animated.View>
    );
  },
);

// ── Main DataTable Component ───────────────────────────────────────────────

export const DataTable = memo(
  ({
    columns,
    data,
    nestedKey,
    onLoadMore,
    isLoading = false,
    isFetchingMore = false,
    keyExtractor,
    emptyText = "No data available",
    onPressRow,
    onRefresh,
    refreshing = false,
    hasNextPage,
    totals,
    theme: themeOverride,
  }: DataTableProps) => {
    const theme = useMemo(() => mergeTheme(themeOverride), [themeOverride]);
    const { width } = useWindowDimensions();

    const stickyColumns = columns.filter((c) => c.sticky);
    const scrollColumns = columns.filter((c) => !c.sticky);
    const stickyWidth = stickyColumns.reduce((s, c) => s + c.width, 0);
    const scrollContentWidth = scrollColumns.reduce((s, c) => s + c.width, 0);
    const totalWidth = stickyWidth + scrollContentWidth;

    const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

    const toggleRow = useCallback((key: string) => {
      setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const visibleRows = buildVisibleRows(data, nestedKey, keyExtractor, expandedKeys);

    const scrollY = useSharedValue(0);

    const onScroll = useAnimatedScrollHandler({
      onScroll: (e) => {
        scrollY.value = e.contentOffset.y;
      },
    });

    const renderValue = useCallback(
      (col: Column, row: any) => {
        const value = row[col.key];
        const content = String(value ?? "");
        const isBold =
          row._type === "section" || row._type === "total";

        return (
          <Text
            style={[
              styles.cellText,
              {
                color: theme.text,
                fontFamily: isBold ? theme.fontBold : theme.fontMedium,
              },
            ]}
            numberOfLines={1}
          >
            {content}
          </Text>
        );
      },
      [theme],
    );

    const renderFooter = () => (
      <>
        {/* Scrollable portion of the Total row */}
        {totals && (
          <View
            style={[
              styles.row,
              styles.totalRow,
              {
                backgroundColor: theme.background2,
                borderTopColor: theme.border,
              },
            ]}
          >
            {/* Spacer to align with sticky overlay */}
            <View style={{ width: stickyWidth }} />
            <View style={styles.scrollableColumnsContainer}>
              {scrollColumns.map((col) => (
                <View key={col.key} style={[styles.cell, { width: col.width }]}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.cellText,
                      styles.totalText,
                      {
                        color: theme.text,
                        fontFamily: theme.fontBold,
                      },
                    ]}
                  >
                    {totals[col.key] !== undefined
                      ? String(totals[col.key])
                      : ""}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {isFetchingMore && (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={[styles.footerText, { color: theme.subText }]}>
              Loading more…
            </Text>
          </View>
        )}
      </>
    );

    const handleScrollPagination = useCallback(() => {
      if (hasNextPage && !isFetchingMore) {
        onLoadMore?.();
      }
    }, [hasNextPage, isFetchingMore, onLoadMore]);

    if (isLoading && visibleRows.length === 0) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      );
    }

    if (visibleRows.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyIcon, { color: theme.subText }]}>⊘</Text>
          <Text style={[styles.emptyText, { color: theme.subText }]}>{emptyText}</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <AnimatedScrollView
          horizontal
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator
          bounces={false}
          contentContainerStyle={{ flexGrow: 1 }}
          overScrollMode="never"
        >
          <Animated.FlatList
            data={visibleRows}
            onScroll={onScroll}
            overScrollMode="never"
            bounces={false}
            keyExtractor={({ rowKey }) => rowKey}
            style={{ width: Math.max(totalWidth, width) }}
            contentContainerStyle={{ flexGrow: 1 }}
            ListHeaderComponent={
              <ScrollableHeader
                stickyColumns={stickyColumns}
                scrollColumns={scrollColumns}
                stickyWidth={stickyWidth}
                theme={theme}
              />
            }
            ItemSeparatorComponent={() => (
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            )}
            renderItem={({ item, index }) => (
              <ScrollableRow
                item={item}
                index={index}
                scrollColumns={scrollColumns}
                stickyWidth={stickyWidth}
                onPressRow={onPressRow}
                toggleRow={toggleRow}
                renderValue={renderValue}
                theme={theme}
              />
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            onEndReached={handleScrollPagination}
            onEndReachedThreshold={0.7}
            ListFooterComponent={renderFooter}
            initialNumToRender={25}
            maxToRenderPerBatch={25}
            windowSize={25}
            stickyHeaderIndices={[0]}
          />
        </AnimatedScrollView>

        <StickyOverlay
          stickyColumns={stickyColumns}
          scrollColumns={scrollColumns}
          visibleRows={visibleRows}
          expandedKeys={expandedKeys}
          toggleRow={toggleRow}
          onPressRow={onPressRow}
          scrollY={scrollY}
          renderValue={renderValue}
          totals={totals}
          theme={theme}
        />
      </View>
    );
  },
);

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, zIndex: -1 },

  // Header
  headerRow: { flexDirection: "row", alignItems: "center", minHeight: 52 },
  headerCell: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  headerText: {
    fontSize: 11.5,
    textTransform: "capitalize",
    letterSpacing: -0.2,
    flex: 1,
  },

  // Rows
  row: { flexDirection: "row", alignItems: "center", minHeight: 50 },
  cell: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 50,
  },
  cellText: { fontSize: 12, flex: 1 },
  scrollableColumnsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Total row
  totalRow: {
    borderTopWidth: 1.5,
    minHeight: 52,
  },
  totalText: {
    fontSize: 12.5,
    fontWeight: "700",
  },

  // Expand chevron
  expandBtn: {
    marginRight: 6,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  chevron: {
    width: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  chevronArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 4.5,
    borderBottomWidth: 4.5,
    borderLeftWidth: 7,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },

  // Sticky overlay
  stickyOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 10,
  },

  // Misc
  divider: { height: StyleSheet.hairlineWidth },
  footerLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  footerText: { fontSize: 12 },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: { fontSize: 32, marginBottom: 10 },
  emptyText: { fontSize: 14, textAlign: "center" },
});

export default DataTable;
