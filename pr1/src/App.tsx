import React, { useCallback, useEffect, useRef, useState } from "react";

import "../node_modules/react-vis/dist/style.css";

import {
  ChartLabel,
  HorizontalGridLines,
  LineSeries,
  VerticalGridLines,
  XAxis,
  XYPlot,
  YAxis,
} from "react-vis";

import Circle from "./components/Circle";

import possibleCombinations from "./utils/possibleCombinations";

const defaultCurrentSimulation = (simulationSize: number): (0 | 1 | 2)[] =>
  new Array(simulationSize)
    .fill(0)
    .map(() => Math.floor(Math.random() * 3) as 0 | 1 | 2);

const App: React.FC = () => {
  const [cellDistribution, setCellDistribution] = useState<
    [number, number, number][]
  >([]);
  const [simulationSize] = useState<number>(120);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [rules, setRules] = useState<(0 | 1 | 2)[]>(new Array(27).fill(0));

  const [currentSimulation, setCurrentSimulation] = useState<(0 | 1 | 2)[][]>([
    defaultCurrentSimulation(simulationSize),
  ]);
  const simulationTimeout = useRef<number>();

  const changeRule = (index: number, value: 0 | 1 | 2): void => {
    setRules((prevState) => {
      const newState = [...prevState];
      newState[index] = value;
      return newState;
    });
  };

  const doNextStep = useCallback(
    (prevSimulationState: (0 | 1 | 2)[]) => {
      const newSimulationLine = prevSimulationState.map((value, index) => {
        const findRuleCombination = (() => {
          if (index === 0) {
            return `${prevSimulationState[simulationSize - 1]}${value}${
              prevSimulationState[index + 1]
            }`;
          }
          if (index === simulationSize - 1) {
            return `${prevSimulationState[index - 1]}${value}${
              prevSimulationState[0]
            }`;
          }
          return `${prevSimulationState[index - 1]}${value}${
            prevSimulationState[index + 1]
          }`;
        })();

        return rules[
          possibleCombinations.findIndex(
            (combination) => combination === findRuleCombination
          )
        ];
      });

      setCurrentSimulation((prevState) => {
        if (prevState.length === 10) {
          const [, ...rest] = prevState;
          return [...rest, newSimulationLine];
        }
        return [...prevState, newSimulationLine];
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      simulationTimeout.current = setTimeout(
        () => doNextStep(newSimulationLine),
        1000
      );
    },
    [rules, simulationSize]
  );

  const toggleRun = (newState: boolean) => {
    setIsRunning(newState);
    if (newState) {
      setTimeout(() => {
        doNextStep(currentSimulation[currentSimulation.length - 1]);
      });
    } else {
      clearTimeout(simulationTimeout.current);
      simulationTimeout.current = undefined;
    }
  };

  useEffect(() => {
    const distribution = currentSimulation[currentSimulation.length - 1]
      .reduce(
        (acc, val) => [
          acc[0] + +(val === 0),
          acc[1] + +(val === 1),
          acc[2] + +(val === 2),
        ],
        [0, 0, 0]
      )
      .map((count) => count / simulationSize) as [number, number, number];

    setCellDistribution((prevState) => [...prevState, distribution]);
  }, [currentSimulation, simulationSize]);

  return (
    <div className="App">
      <div className="container mx-auto py-4 w-100">
        <div className="flex flex-row">
          <div className="max-w-xs">
            <p className="text-2xl">Simulation settings</p>
            <div className="flex flex-row space-x-4 py-2">
              <button
                className={`${
                  isRunning
                    ? "bg-red-600 ring-red-400"
                    : "bg-green-400 ring-green-200"
                } focus:outline-none ring-4 ring-opacity-80 p-2 rounded-md text-white`}
                type="button"
                onClick={() => toggleRun(!isRunning)}>
                {isRunning ? "Stop" : "Start"}
              </button>
              <button
                className="bg-yellow-600 ring-yellow-400 focus:outline-none ring-4 ring-opacity-80 p-2 rounded-md text-white"
                type="button"
                onClick={() => {
                  setCurrentSimulation([
                    defaultCurrentSimulation(simulationSize),
                  ]);
                  setRules(new Array(27).fill(0));
                  setCellDistribution([]);
                }}
                disabled={isRunning}>
                Reset
              </button>
            </div>
            {rules.map((value, index) => (
              <div>
                <span className="pr-3">{possibleCombinations[index]}:</span>
                <span className="text-red-500 pr-2">0:</span>
                <input
                  className="mr-2"
                  type="radio"
                  value={0}
                  checked={value === 0}
                  onChange={() => changeRule(index, 0)}
                />
                <span className="text-green-500 pr-2">1:</span>
                <input
                  className="mr-2"
                  type="radio"
                  value={1}
                  checked={value === 1}
                  onChange={() => changeRule(index, 1)}
                />
                <span className="text-blue-500 pr-2">2:</span>
                <input
                  className="mr-2"
                  type="radio"
                  value={2}
                  checked={value === 2}
                  onChange={() => changeRule(index, 2)}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-grow items-center flex-col">
            <div>
              <p className="text-2xl">Chart</p>
              <XYPlot
                width={500}
                height={300}
                xDomain={[0, cellDistribution.length - 1]}
                yDomain={[0, 100]}>
                <HorizontalGridLines />
                <VerticalGridLines />
                <XAxis />
                <YAxis />
                <ChartLabel
                  text="Step"
                  className="alt-x-label"
                  includeMargin={false}
                  xPercent={0.025}
                  yPercent={1.01}
                />

                <ChartLabel
                  text="% distribution"
                  className="alt-y-label"
                  includeMargin={false}
                  xPercent={0.06}
                  yPercent={0.06}
                  style={{
                    transform: "rotate(-90)",
                    textAnchor: "end",
                  }}
                />
                <LineSeries
                  color="red"
                  data={cellDistribution.map(([distribution], index) => ({
                    x: index,
                    y: distribution * 100,
                  }))}
                  style={{
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                  }}
                />
                <LineSeries
                  color="green"
                  data={cellDistribution.map(([, distribution], index) => ({
                    x: index,
                    y: distribution * 100,
                  }))}
                  style={{
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                  }}
                />
                <LineSeries
                  color="blue"
                  data={cellDistribution.map(([, , distribution], index) => ({
                    x: index,
                    y: distribution * 100,
                  }))}
                  style={{
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                  }}
                />
              </XYPlot>
            </div>
            <div>
              <p className="text-2xl">Simulation</p>
              {currentSimulation.map((singleGeneration) => (
                <p className="whitespace-nowrap">
                  {singleGeneration.map((singleCell) => (
                    <Circle value={singleCell} />
                  ))}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
