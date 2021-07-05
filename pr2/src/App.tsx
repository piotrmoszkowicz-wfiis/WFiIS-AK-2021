import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "../node_modules/react-vis/dist/style.css";

import {
  AreaSeries,
  ChartLabel,
  HorizontalGridLines,
  VerticalGridLines,
  XAxis,
  XYPlot,
  YAxis,
} from "react-vis";

interface ParticlesState {
  lower: number;
  upper: number;
}

const baseSimulationSpeed = 500; // Bazowa prędkość w milisekundach
const cellColor = "#7346E4";
const emptyColor = "#B5A5F525";

type ParticleState = [boolean, boolean, boolean, boolean, boolean];

const App: React.FC = () => {
  const [simulationSpeed, setSimulationSpeed] = useState<number>(5);
  const [particlesDensity, setParticlesDensity] = useState<number>(50);
  const [gridSize, setGridSize] = useState<number>(50);
  const [wallPosition, setWallPosition] = useState<number>(gridSize / 2);
  const [wallSize, setWallSize] = useState<number>(gridSize / 2);

  const properDensity = useMemo<number>(() => particlesDensity / 100, [
    particlesDensity,
  ]);
  const properSpeed = useMemo<number>(
    () => baseSimulationSpeed / simulationSpeed,
    [simulationSpeed]
  );
  const maxPossibleParticles = useMemo<ParticlesState>(
    () => ({
      lower: (gridSize - 2) * (gridSize - wallPosition - 2) * 4,
      upper: (gridSize - 2) * (wallPosition - 1) * 4,
    }),
    [gridSize, wallPosition]
  );

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runningInterval, setRunningInterval] = useState<any>();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cells, setCells] = useState<ParticleState[][]>([]);

  const [lowerPressure, setLowerPressure] = useState<number[]>([]);
  const [upperPressure, setUpperPressure] = useState<number[]>([]);

  const isParticleOnWall = useCallback(
    (x: number, y: number): boolean => {
      if (x === 0 || x === gridSize - 1) {
        return true;
      }
      if (y === 0 || y === gridSize - 1) {
        return true;
      }
      if (x <= gridSize / 2 - wallSize / 2 && y === wallPosition) {
        return true;
      }
      if (gridSize - x <= gridSize / 2 - wallSize / 2 && y === wallPosition) {
        return true;
      }
      return false;
    },
    [gridSize, wallSize, wallPosition]
  );

  const clearGrid = useCallback(() => {
    setCells(() =>
      new Array(gridSize)
        .fill(0)
        .map(() => new Array(gridSize).fill(0))
        .map((xArr, x) =>
          xArr.map((yArr, y) => [
            isParticleOnWall(x, y),
            false,
            false,
            false,
            false,
          ])
        )
    );
  }, [isParticleOnWall, gridSize]);

  const spawnParticles = useCallback(() => {
    setCells((prevState) =>
      prevState.map((xArr, x) =>
        xArr.map((yArr, y) => {
          if (y >= wallPosition || isParticleOnWall(x, y)) {
            return yArr;
          }

          return [
            yArr[0],
            Math.random() <= properDensity,
            Math.random() <= properDensity,
            Math.random() <= properDensity,
            Math.random() <= properDensity,
          ];
        })
      )
    );
    // eslint-disable-next-line
  }, [isParticleOnWall, properDensity, wallPosition]);

  const resetSimulation = useCallback((): void => {
    setIsRunning(false);

    clearGrid();
    spawnParticles();

    setLowerPressure([]);
    setUpperPressure([]);
  }, [clearGrid, spawnParticles]);

  const restartSimulation = (): void => {
    resetSimulation();
    setIsRunning(true);
  };

  const updateSimulation = useCallback(() => {
    setCells((prevCells) =>
      prevCells.map((row, x) =>
        row.map((cell, y) => {
          if (cell[0]) {
            return cell;
          }

          const result: ParticleState = [
            false,
            prevCells[x][y + 1][1] ||
              (prevCells[x][y + 1][0] && prevCells[x][y][3]),
            prevCells[x + 1][y][2] ||
              (prevCells[x + 1][y][0] && prevCells[x][y][4]),
            prevCells[x][y - 1][3] ||
              (prevCells[x][y - 1][0] && prevCells[x][y][1]),
            prevCells[x - 1][y][4] ||
              (prevCells[x - 1][y][0] && prevCells[x][y][2]),
          ];

          if (
            !prevCells[x][y + 1][1] &&
            !prevCells[x][y - 1][3] &&
            prevCells[x + 1][y][2] &&
            prevCells[x - 1][y][4]
          ) {
            result[1] = true;
            result[2] = false;
            result[3] = true;
            result[4] = false;
          }

          if (
            prevCells[x][y + 1][1] &&
            prevCells[x][y - 1][3] &&
            !prevCells[x + 1][y][2] &&
            !prevCells[x - 1][y][4]
          ) {
            result[1] = false;
            result[2] = true;
            result[3] = false;
            result[4] = true;
          }

          return result;
        })
      )
    );
  }, []);

  useEffect(() => {
    if (wallPosition > gridSize) {
      setWallPosition(Math.round(gridSize / 2));
    }
    if (wallSize > gridSize) {
      setWallSize(Math.round(gridSize / 2));
    }
  }, [gridSize, wallPosition, wallSize]);

  useEffect(() => {
    if (wallSize % 2 === 0) {
      setWallSize((prevValue) => prevValue + 1);
    }
  }, [wallSize]);

  useEffect(() => {
    resetSimulation();

    const canvasCtx = canvasRef.current!.getContext("2d")!;

    canvasCtx.canvas.width = gridSize * 8;
    canvasCtx.canvas.height = gridSize * 8;
    canvasCtx.strokeStyle = emptyColor;
    canvasCtx.fillStyle = cellColor;
  }, [clearGrid, spawnParticles, gridSize, resetSimulation]);

  useEffect(() => {
    if (isRunning) {
      setRunningInterval(setInterval(() => updateSimulation(), properSpeed));
    } else {
      clearInterval(runningInterval);
    }
    // eslint-disable-next-line
  }, [isRunning, properSpeed, updateSimulation]);

  useEffect(() => {
    if (cells.length !== gridSize) {
      return;
    }
    // Render canvas
    const canvasCtx = canvasRef.current!.getContext("2d")!;

    canvasCtx.clearRect(0, 0, gridSize * 8, gridSize * 8);

    cells.forEach((row, x) =>
      row.forEach((cell, y) => {
        canvasCtx.beginPath();

        if (cell[0]) {
          canvasCtx.fillStyle = "#000000";
          canvasCtx.rect(x * 8 + 1, y * 8 + 1, 6, 6);
        } else {
          canvasCtx.fillStyle = cellColor;
          canvasCtx.arc(x * 8 + 4, y * 8 + 4, 2, 0, 2 * Math.PI);
        }

        if (cell.some((axis) => axis)) {
          canvasCtx.fill();
        } else {
          canvasCtx.stroke();
        }
      })
    );

    // Update chart data
    if (isRunning) {
      let particlesUpper = 0;
      let particlesLower = 0;

      if (cells.length > 0) {
        // eslint-disable-next-line no-plusplus
        for (let i = 0; i < gridSize; i++) {
          // eslint-disable-next-line no-plusplus
          for (let j = 0; j < gridSize; j++) {
            // eslint-disable-next-line no-plusplus
            for (let k = 1; k < 5; k++) {
              if (cells[i][j][k]) {
                if (j < wallPosition) {
                  // eslint-disable-next-line no-plusplus
                  particlesUpper++;
                }
                if (j > wallPosition) {
                  // eslint-disable-next-line no-plusplus
                  particlesLower++;
                }
              }
            }
          }
        }
      }

      setLowerPressure((prevState) => [
        ...prevState,
        particlesLower / maxPossibleParticles.lower,
      ]);
      setUpperPressure((prevState) => [
        ...prevState,
        particlesUpper / maxPossibleParticles.upper,
      ]);
    }
  }, [cells, gridSize, isRunning, maxPossibleParticles, wallPosition]);

  return (
    <div className="App">
      <nav className="bg-gray-800">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16">
            <div className="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start">
              <div className="hidden sm:block sm:ml-6">
                <div className="flex space-x-4">
                  <p className="text-gray-300 px-3 py-2 rounded-md text-sm font-medium">
                    Hardy, Pomeau and de Pazzis model - hydrodynamika na sieci
                    kwadratowej :: Piotr Moszkowicz
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <div className="container mx-auto py-4 w-100">
        <div className="grid grid-cols-2 gap-4">
          <div className="max-w-4xl  bg-white w-full rounded-lg shadow-xl">
            <div className="p-4 border-b">
              <h2 className="text-2xl ">Ustawienia symulacji</h2>
              <p className="text-sm text-gray-500">
                Główne ustawienia symulacji
              </p>
            </div>
            <div>
              <div className="md:grid md:grid-cols-2 hover:bg-gray-50 md:space-y-0 space-y-1 p-4 border-b">
                <p className="text-gray-600">
                  Gęstość cząsteczek ({particlesDensity}%)
                </p>
                <input
                  className="rounded-lg overflow-hidden appearance-none bg-gray-400 h-3 w-128"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={particlesDensity}
                  onChange={(event) =>
                    setParticlesDensity(parseInt(event.target.value, 10))
                  }
                />
              </div>
              <div className="md:grid md:grid-cols-2 hover:bg-gray-50 md:space-y-0 space-y-1 p-4 border-b">
                <p className="text-gray-600">Szerokość wyrwy ({wallSize})</p>
                <input
                  className="rounded-lg overflow-hidden appearance-none bg-gray-400 h-3 w-128"
                  type="range"
                  min={1}
                  max={gridSize}
                  step={1}
                  value={wallSize}
                  onChange={(event) =>
                    setWallSize(parseInt(event.target.value, 10))
                  }
                />
              </div>
              <div className="md:grid md:grid-cols-2 hover:bg-gray-50 md:space-y-0 space-y-1 p-4 border-b">
                <p className="text-gray-600">Pozycja wyrwy ({wallPosition})</p>
                <input
                  className="rounded-lg overflow-hidden appearance-none bg-gray-400 h-3 w-128"
                  type="range"
                  min={0}
                  max={gridSize}
                  step={1}
                  value={wallPosition}
                  onChange={(event) =>
                    setWallPosition(parseInt(event.target.value, 10))
                  }
                />
              </div>
              <div className="md:grid md:grid-cols-2 hover:bg-gray-50 md:space-y-0 space-y-1 p-4 border-b">
                <p className="text-gray-600">
                  Szybkość symulacji ({simulationSpeed}x)
                </p>
                <input
                  className="rounded-lg overflow-hidden appearance-none bg-gray-400 h-3 w-128"
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={simulationSpeed}
                  onChange={(event) =>
                    setSimulationSpeed(parseInt(event.target.value, 10))
                  }
                />
              </div>
              <div className="md:grid md:grid-cols-2 hover:bg-gray-50 md:space-y-0 space-y-1 p-4 border-b">
                <p className="text-gray-600">Wielkość siatki ({gridSize})</p>
                <input
                  className="rounded-lg overflow-hidden appearance-none bg-gray-400 h-3 w-128"
                  type="range"
                  min={20}
                  max={150}
                  step={1}
                  value={gridSize}
                  onChange={(event) =>
                    setGridSize(parseInt(event.target.value, 10))
                  }
                />
              </div>
            </div>
          </div>
          <div className="max-w-4xl  bg-white w-full rounded-lg shadow-xl">
            <div className="p-4 border-b">
              <h2 className="text-2xl ">Kontrola symulacji symulacji</h2>
              <p className="text-sm text-gray-500">
                Kontrolowanie stanu symulacji
              </p>
            </div>
            <div>
              <div className="md:space-y-0 space-y-1 p-4">
                <div className="pb-5">
                  <button
                    className={`${
                      isRunning
                        ? "bg-red-600 ring-red-400"
                        : "bg-green-400 ring-green-200"
                    } focus:outline-none ring-4 ring-opacity-80 p-2 rounded-md text-white`}
                    type="button"
                    onClick={() => setIsRunning((prevValue) => !prevValue)}>
                    {isRunning ? "Stop" : "Start"}
                  </button>
                </div>
                <div className="pb-5">
                  <button
                    className="bg-purple-600 ring-purple-400 focus:outline-none ring-4 ring-opacity-80 p-2 rounded-md text-white"
                    type="button"
                    onClick={resetSimulation}>
                    Reset
                  </button>
                </div>
                <div className="pb-5">
                  <button
                    className="bg-purple-600 ring-purple-400 focus:outline-none ring-4 ring-opacity-80 p-2 rounded-md text-white"
                    type="button"
                    onClick={restartSimulation}>
                    Restart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-4 w-100">
        <div className="grid grid-cols-2 gap-4">
          <div className="max-w-4xl  bg-white w-full rounded-lg shadow-xl">
            <div className="p-4 border-b">
              <h2 className="text-2xl ">Ciśnienie w górnej części symulacji</h2>
            </div>
            <div className="p-4">
              <XYPlot width={window.screen.width / 2 - 120} height={300}>
                <VerticalGridLines />
                <HorizontalGridLines />
                <XAxis />
                <YAxis />
                <AreaSeries
                  curve="curveNatural"
                  data={upperPressure.map((value, index) => ({
                    x: index,
                    y: value,
                  }))}
                />
                <ChartLabel
                  text="Iteracja"
                  className="alt-x-label"
                  includeMargin={false}
                  xPercent={0.025}
                  yPercent={1.01}
                />

                <ChartLabel
                  text="ciśnienie"
                  className="alt-y-label"
                  includeMargin={false}
                  xPercent={0.06}
                  yPercent={0.06}
                  style={{
                    transform: "rotate(-90)",
                    textAnchor: "end",
                  }}
                />
              </XYPlot>
            </div>
          </div>
          <div className="max-w-4xl  bg-white w-full rounded-lg shadow-xl">
            <div className="p-4 border-b">
              <h2 className="text-2xl ">Ciśnienie w dolnej części symulacji</h2>
            </div>
            <div className="p-4">
              <XYPlot width={window.screen.width / 2 - 120} height={300}>
                <VerticalGridLines />
                <HorizontalGridLines />
                <XAxis />
                <YAxis />
                <AreaSeries
                  curve="curveNatural"
                  data={lowerPressure.map((value, index) => ({
                    x: index,
                    y: value,
                  }))}
                />
                <ChartLabel
                  text="Iteracja"
                  className="alt-x-label"
                  includeMargin={false}
                  xPercent={0.025}
                  yPercent={1.01}
                />

                <ChartLabel
                  text="ciśnienie"
                  className="alt-y-label"
                  includeMargin={false}
                  xPercent={0.06}
                  yPercent={0.06}
                  style={{
                    transform: "rotate(-90)",
                    textAnchor: "end",
                  }}
                />
              </XYPlot>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-4 w-100 flex flex-row justify-center">
        <div className="flex flex-row justify-center bg-white w-full rounded-lg shadow-xl">
          <canvas ref={canvasRef} width={512} height={512} />
        </div>
      </div>
    </div>
  );
};

export default App;
