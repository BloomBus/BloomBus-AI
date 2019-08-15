/**
 * Trains the AI to predict when a bus will arrive at a bus stop.
 *
 * @author Michael O'Donnell
 * @version 0.3.0
 */

"use strict";

import { createWriteStream, readFileSync, createReadStream } from "fs";
// If John Gibson's download site can be accessed from Node.js
import { get, request as _request } from "https";
import {
  sequential,
  layers as _layers,
  train,
  tensor2d,
  callbacks as _callbacks,
  nextFrame
} from "@tensorflow/tfjs-node-gpu";
import {
  booleanPointOnLine,
  point as _point,
  lineString,
  nearestPointOnLine,
  length,
  lineSlice
} from "@turf/turf";
import { exec } from "shelljs";

// documentation for firebase can be found at https://firebase.google.com/docs/
// documentation for tensorflow.js can be found at https://js.tensorflow.org/api/latest/
// documentation for turf can be found at https://turfjs.org/

async function getAndSaveFile(name) {
  const file = createWriteStream(`./${name}.json`);
  const request = get(
    `https://bloombus.bloomu.edu/api/download/${name}/geojson`,
    response => {
      if (response.statusCode !== 200)
        console.log(`Response status for ${name} was ${response.statusCode}`);
      response.pipe(file);
      file.on("finish", () => {
        file.closeSync();
      });
    }
  ).on("error", err => error(err));

  file.on("error", err => error(err));

  function error(err) {
    console.log(err.name);
    console.log(err.message);
    console.log(err.stack);
    file.closeSync();
    process.exit(1);
  }
}

async function getData(...args) {
  for (arg of args) getAndSaveFile(arg);
}

async function prepareData(inputs, expectedOutputs) {
  console.log("Retrieving data...");
  const garbage = await getData(
    "loops",
    "historical-logs",
    "stops",
    "intersections"
  );

  console.log("Extracting data...");
  const data = {
    intersections: JSON.parse(readFileSync("./intersections.json", "utf8")),
    loops: JSON.parse(readFileSync("./loops.json", "utf8")),
    historicalLogs: JSON.parse(readFileSync("./historical-logs.json", "utf8")),
    stops: JSON.parse(readFileSync("./stops.json", "utf8"))
  };

  // sort data by bus loop
  let sortedHistoricalLogs = {
    campusLoop: [],
    downtownLoop: [],
    latenightLoop: [],
    walmartLoop: []
  };

  for (log in data.historicalLogs) {
    switch (log.loopKey) {
      case "campus":
        sortedHistoricalLogs.campusLoop.push(log);
        break;
      case "downtown":
        sortedHistoricalLogs.downtownLoop.push(log);
        break;
      case "latenight":
        sortedHistoricalLogs.latenightLoop.push(log);
        break;
      case "walmart":
        sortedHistoricalLogs.walmartLoop.push(log);
        break;
      default:
        console.error(`Unsorted loop name present in database: ${log.loopKey}`);
        process.exit(2);
    }
  }

  // gather data
  function getPoints(member) {
    let pointArr = [];
    sortedHistoricalLogs[member]["histPoints"].forEach(data => {
      pointArr.push(_point([data.coordinates[0], data.coordinates[1]]));
    });
    return pointArr;
  }
  function getSpeeds(member) {
    let speedArr = [];
    sortedHistoricalLogs[member]["histPoints"].forEach(data => {
      speedArr.push(data.speed);
    });
    return speedArr;
  }
  function getTimes(member) {
    let timeArr = [];
    sortedHistoricalLogs[member]["histPoints"].forEach(data => {
      timeArr.push(data.timestamp);
    });
    return timeArr;
  }
  let trainingData = {
    campusLoop: {
      loop: lineString(data.loops.features[0].geometry.coordinates),
      points: getPoints("campus"),
      speeds: getSpeeds("campus"),
      times: getTimes("campus")
    },
    downtownLoop: {
      loop: lineString(data.loops.features[2].geometry.coordinates),
      points: getPoints("downtown"),
      speeds: getSpeeds("downtown"),
      times: getTimes("downtown")
    },
    latenightLoop: {
      loop: lineString(data.loops.features[l].geometry.coordinates),
      points: getPoints("latenight"),
      speeds: getSpeeds("latenight"),
      times: getTimes("latenight")
    },
    walmartLoop: {
      loop: lineString(data.loops.features[w].geometry.coordinates),
      points: getPoints("walmart"),
      speeds: getSpeeds("walmart"),
      times: getTimes("walmart")
    }
  };

  // get distances between points
  console.log("Analysing data...");
  const unitOfMeasurement = "kilometers";

  for (loop in trainingData) {
    // snap points to the loop
    for (point of loop.points) {
      point = nearestPointOnLine(loop.loop, point, {
        units: unitOfMeasurement
      });
    }
    loop.points.forEach((point, pointIndex) => {
      point.properties.distances = [];
      loop.points.forEach((pt, ptIndex) => {
        if (point !== pt && loop.times[pointIndex] < loop.times[ptIndex]) {
          const slice = lineSlice(point, pt, loop.loop);
          let num_of_intersections = 0;
          for (intersection of data.intersections) {
            if (
              booleanPointOnLine(
                _point(intersection.geometry.coordinates),
                slice
              )
            ) {
              num_of_intersections++;
            }
          }
          let numOfStops = 0;
          for (stop in data.stops) {
            if (booleanPointOnLine(_point(stop.geometry.coordinates), slice)) {
              numOfStops++;
            }
          }
          num_of_stops--; // booleanPointOnLine will include the target bus stop (remove this line if we want that included)
          point.properties.distances.push({
            distance: length(slice, { units: unitOfMeasurement }),
            numOfIntersections: num_of_intersections,
            numOfBusStops: numOfStops,
            pointIndex: ptIndex
          });
        }
      });
    });
  }

  // prepare data for training
  console.log("Preparing data...");
  for (loop in trainingData) {
    loop.points.forEach((point, pointIndex) => {
      point.properties.distances.forEach(dist => {
        inputs.push([
          dist.distance,
          dist.numOfIntersections,
          dist.numOfBusStops,
          loop.speeds[pointIndex],
          loop.times[pointIndex]
        ]);
        expectedOutputs.push([loop.times[dist.pointIndex]]);
      });
    });
  }
}

async function learnBusArrival() {
  let inputs = [];
  let expectedOutputs = [];

  const garbage = await prepareData(inputs, expectedOutputs);

  console.log("Creating model...");

  /*
    type of model we are using (here, a simple linearly layered structure)
    units is the number of nodes in this layer
    inputShape only needs to be set for the first hidden layer because it says the number of nodes in the input layer
  */
  const model = sequential({
    layers: [
      // Hidden Layer 1
      _layers.dense({
        units: 18,
        activation: "relu",
        inputShape: [inputs[0].length] // Use the length of one of the input vectors as input size/shape
      }),
      // Hidden Layer 2
      _layers.dense({
        units: 12,
        activation: "relu"
      }),
      // Output Layer
      _layers.dense({
        units: 1,
        activation: "linear"
      })
    ]
  });

  /*
    adds the loss function, optimizer, and metrics
    does not do anything beyond adding those three attributes (no C-like compilation)
  */
  model.compile({
    loss: "meanSquaredError",
    optimizer: train.adam(0.01), // number is the learning rate
    metrics: ["accuracy"]
  });

  const input = tensor2d(inputs);
  const output = tensor2d(expectedOutputs);

  // Prevent overtraining
  let tfCallbacks = _callbacks.earlyStopping({
    monitor: "val_loss",
    patience: 15
  });

  tfCallbacks.onEpochEnd = async (epoch, logs) => {
    console.log(`${epoch} : ${(logs.loss + "").replace(/Tensor\s+/, "")}`);
    await nextFrame();
  };

  console.log("Training...");
  await model
    .fit(input, output, {
      //batchSize: 8192, // when you have a supercomputer at your disposal, why not?
      epochs: 2000,
      shuffle: true,
      validationSplit: 0.1,
      callbacks: tfCallbacks
    })
    .then(info => {
      console.log(`${info.history.acc.length} epochs occurred`);
    });

  /* Saves a model.json file and 1 or more .bin files to the destination folder */
  await model.save("file:///home/nvidia/Documents/BloomBus/ai/model/");
}

function uploadToServer() {
  exec("tar -zcvf model.tar.gz model");

  // upload compressed model
  console.log("Uploading...");
  const file = createReadStream("model.tar.gz");
  const options = {
    hostname: "bloombus.bloomu.edu",
    port: 80,
    path: "/ai",
    method: "POST",
    headers: {
      "Content-Type": "application/gzip",
      "Content-Length": Buffer.byteLength(file)
    }
  };
  const req = _request(options, res => {
    console.log(
      `BloomBus Server StatusCode:\t${res.statusCode}\nBloomBus Server Headers:\t${res.headers}`
    );

    res.on("data", d => {
      process.stdout.write(d);
    });

    res.on("error", e => {
      console.error(e);
    });
  }).on("error", e => {
    console.error(e);
  });

  req.write(file);
  req.end();
  console.log("Success!");
}

learnBusArrival().then(() => {
  uploadToServer();
});
