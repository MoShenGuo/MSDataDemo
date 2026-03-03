import React, { forwardRef, useImperativeHandle, useState } from "react";
import Svg, { Path } from "react-native-svg";

export interface ECGChartRef {
  setData: (data: number[]) => void;
}

const ECGNewChartView = forwardRef<ECGChartRef, any>(
  ({ width, height, lineColor }, ref) => {

    const [data, setData] = useState<number[]>([]);

    useImperativeHandle(ref, () => ({
      setData
    }));

    const buildPath = () => {
      if (data.length === 0) return "";

      const max = Math.max(...data);
      const min = Math.min(...data);
      const range = max - min || 1;
      const stepX = width / data.length;

      return data
        .map((v, i) => {
          const x = i * stepX;
          const y = height * (1 - (v - min) / range);
          return `${i === 0 ? "M" : "L"}${x},${y}`;
        })
        .join(" ");
    };

    return (
      <Svg width={width} height={height}>
        <Path
          d={buildPath()}
          stroke={lineColor}
          strokeWidth="1.5"
          fill="none"
        />
      </Svg>
    );
  }
);

// ⭐ 关键修复
ECGNewChartView.displayName = "ECGNewChartView";

export default ECGNewChartView;