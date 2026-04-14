import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PAD_LEFT = 48;
const PAD_RIGHT = 12;
const PAD_TOP = 10;
const PAD_BOTTOM = 24;
const CHART_HEIGHT = 180;
const Y_TICKS = 4;

function formatYLabel(val) {
  if (val >= 1000) return `$${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
  return `$${Math.round(val)}`;
}

export default function TrendChart({ data }) {
  const [containerWidth, setContainerWidth] = useState(0);

  // Hide if all values are zero
  const hasData = data?.length > 0 &&
    data.some(d => parseFloat(d.total_income) > 0 || parseFloat(d.total_expenses) > 0);

  if (!hasData) return null;

  const plotW = containerWidth - PAD_LEFT - PAD_RIGHT;
  const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const incomeVals = data.map(d => parseFloat(d.total_income) || 0);
  const expenseVals = data.map(d => parseFloat(d.total_expenses) || 0);
  const maxVal = Math.max(...incomeVals, ...expenseVals, 1);

  // Round max up to a nice number for ticks
  const rawStep = maxVal / Y_TICKS;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceStep = Math.ceil(rawStep / magnitude) * magnitude;
  const niceMax = niceStep * Y_TICKS;

  const xFor = (i) => PAD_LEFT + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2);
  const yFor = (val) => PAD_TOP + plotH - (val / niceMax) * plotH;

  const incomePoints = data.map((d, i) => `${xFor(i)},${yFor(parseFloat(d.total_income) || 0)}`).join(' ');
  const expensePoints = data.map((d, i) => `${xFor(i)},${yFor(parseFloat(d.total_expenses) || 0)}`).join(' ');

  const yTickValues = Array.from({ length: Y_TICKS + 1 }, (_, i) => niceStep * i);

  return (
    <View style={styles.wrapper}>
      {/* Title + legend */}
      <View style={styles.header}>
        <Text style={styles.title}>Spending Trend</Text>
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: '#48bb78' }]} />
          <Text style={styles.legendLabel}>Income</Text>
          <View style={[styles.legendDot, { backgroundColor: '#fc8181', marginLeft: 10 }]} />
          <Text style={styles.legendLabel}>Expenses</Text>
        </View>
      </View>

      {/* Chart */}
      <View
        style={styles.chartContainer}
        onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {containerWidth > 0 && (
          <Svg width={containerWidth} height={CHART_HEIGHT}>
            {/* Y-axis grid lines + labels */}
            {yTickValues.map((val, i) => {
              const y = yFor(val);
              return (
                <React.Fragment key={i}>
                  <Line
                    x1={PAD_LEFT}
                    y1={y}
                    x2={containerWidth - PAD_RIGHT}
                    y2={y}
                    stroke="#2a2a2a"
                    strokeWidth={1}
                  />
                  <SvgText
                    x={PAD_LEFT - 6}
                    y={y + 4}
                    fontSize={10}
                    fill="#6b7280"
                    textAnchor="end"
                  >
                    {formatYLabel(val)}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {/* Income line */}
            <Polyline
              points={incomePoints}
              fill="none"
              stroke="#48bb78"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Expense line */}
            <Polyline
              points={expensePoints}
              fill="none"
              stroke="#fc8181"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Income dots */}
            {data.map((d, i) => (
              <Circle
                key={`inc-${i}`}
                cx={xFor(i)}
                cy={yFor(parseFloat(d.total_income) || 0)}
                r={3}
                fill="#48bb78"
              />
            ))}

            {/* Expense dots */}
            {data.map((d, i) => (
              <Circle
                key={`exp-${i}`}
                cx={xFor(i)}
                cy={yFor(parseFloat(d.total_expenses) || 0)}
                r={3}
                fill="#fc8181"
              />
            ))}

            {/* X-axis labels */}
            {data.map((d, i) => (
              <SvgText
                key={`lbl-${i}`}
                x={xFor(i)}
                y={CHART_HEIGHT - 4}
                fontSize={10}
                fill="#6b7280"
                textAnchor="middle"
              >
                {MONTH_ABBR[(d.month - 1) % 12]}
              </SvgText>
            ))}
          </Svg>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#1a1a2a',
    borderRadius: 16,
    paddingTop: 14,
    paddingBottom: 6,
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: '#9ca3af',
  },
  chartContainer: {
    width: '100%',
  },
});
