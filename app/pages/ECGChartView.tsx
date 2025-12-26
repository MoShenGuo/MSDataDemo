import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";

export interface ECGChartRef {
  addShowDatasECG: (datas: number[]) => void;
  addShowDatasPPG: (datas: number[]) => void;
}

interface Props {
  width: number;
  height: number;
  showTime: number;
  singleNumber: number;
  lineColor?: string;
  lineWidth?: number;
  blankCount?: number;
}

const ECGChartView = forwardRef<ECGChartRef, Props>(
  (
    {
      width,
      height,
      showTime,
      singleNumber,
      lineColor = "#e4232a",
      lineWidth = 1.5,
      blankCount = 0,
    },
    ref
  ) => {
    const chartHeight = height - 30;
    const maxCount = showTime * singleNumber;

    /** ===== 数据区 ===== */
    const dataRef = useRef<number[]>([]);
    const writeIndexRef = useRef(0);

    const maxValueRef = useRef(2);
    const minValueRef = useRef(-2);
    const baseRef = useRef(2);

    const [path, setPath] = useState("");

    /** ========== ECG ========= */
    const addShowDatasECG = (datas: number[]) => {
      if (datas.length === 0) {
        dataRef.current = [];
        writeIndexRef.current = 0;
        return;
      }

      datas.forEach((v) => {
        if (dataRef.current.length < maxCount) {
          dataRef.current.push(v);
        } else {
          dataRef.current[writeIndexRef.current] = v;
          writeIndexRef.current =
            (writeIndexRef.current + 1) % maxCount;
        }
      });

      maxValueRef.current = 2;
      minValueRef.current = -2;
      baseRef.current = 2;

      redraw();
    };

    /** ========== PPG ========= */
    const addShowDatasPPG = (datas: number[]) => {
      datas.forEach((v) => {
        if (dataRef.current.length < maxCount) {
          dataRef.current.push(v);
        } else {
          dataRef.current[writeIndexRef.current] = v;
          writeIndexRef.current =
            (writeIndexRef.current + 1) % maxCount;
        }
      });

      const max = Math.max(...dataRef.current);
      const min = Math.min(...dataRef.current);

      maxValueRef.current = max + (max - min) / 2;
      minValueRef.current = min - (max - min) / 2;
      baseRef.current = maxValueRef.current;

      redraw();
    };

    /** ========== 重绘 Path ========= */
    const redraw = () => {
      //重绘相当于setNeedsDisplay
      requestAnimationFrame(() => {
        const datas = dataRef.current;
        if (datas.length < 2) return;

        const dx = width / maxCount;
        const range = maxValueRef.current - minValueRef.current;

        let d = "";

        datas.forEach((v, i) => {
          const x = i * dx;
          const y =
            ((baseRef.current - v) / range) * chartHeight;
          //moveTo  绘图
          if (i === 0) d += `M ${x} ${y}`;
          else d += ` L ${x} ${y}`;//AddLineTo
        });
        //drawRect  绘图
        setPath(d);
      });
    };
    //父控件里通过子视图调用子视图方法需要加
    useImperativeHandle(ref, () => ({
      addShowDatasECG,
      addShowDatasPPG,
    }));

    /** ========== 网格 ========= */
    const renderGrid = () => {
      const lines = [];
      const secWidth = width / showTime / 5;

      for (let i = 0; i < width / secWidth; i++) {
        lines.push(
          <Line
            key={`v-${i}`}
            x1={i * secWidth}
            y1={0}
            x2={i * secWidth}
            y2={chartHeight}
            stroke="rgba(52,73,73,0.2)"
            strokeWidth={i % 5 === 0 ? 1 : 0.3}
          />
        );
      }

      for (let i = 0; i < 6; i++) {
        lines.push(
          <Line
            key={`h-${i}`}
            x1={0}
            y1={(chartHeight / 5) * i}
            x2={width}
            y2={(chartHeight / 5) * i}
            stroke="rgba(52,73,73,0.2)"
            strokeWidth={0.3}
          />
        );
      }

      return lines;
    };

    return (
      <View>
        <Svg width={width} height={height}>
          {renderGrid()}
          <Path
            d={path}//d="M 0 100 L 10 98 L 20 105 ..." //路径数据
            stroke={lineColor}
            strokeWidth={lineWidth}
            fill="none"
          />
        </Svg>
      </View>
    );
  }
);
ECGChartView.displayName = "ECGChartView";
export default ECGChartView;
