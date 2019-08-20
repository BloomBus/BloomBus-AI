/**
 * Trains the AI to predict when a bus will arrive at a bus stop.
 *
 * @author Michael O'Donnell
 * @version 0.4.0
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
    `https://bloombus.mads.bloomu.edu/api/download/${name}/geojson`,
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
    "loop-stops",
    "historical-logs",
    "stops",
    "intersections"
  );

  console.log("Extracting data...");
  const data = {
    intersections: JSON.parse(readFileSync("./intersections.json", "utf8")),
    loops: JSON.parse(readFileSync("./loops.json", "utf8")),
    loopStops: JSON.parse(readFileSync("./loop-stops.json", "utf8")),
    historicalLogs: JSON.parse(readFileSync("./historical-logs.json", "utf8")),
    stops: JSON.parse(readFileSync("./stops.json", "utf8"))
  };

  // sort data by bus loop
  let sortedHistoricalLogs = {
    campus: [],
    downtown: [],
    latenight: [],
    walmart: []
  };

  for (log in data.historicalLogs) {
    switch (log.loopKey) {
      case "campus":
        sortedHistoricalLogs.campus.push(log);
        break;
      case "downtown":
        sortedHistoricalLogs.downtown.push(log);
        break;
      case "latenight":
        sortedHistoricalLogs.latenight.push(log);
        break;
      case "walmart":
        sortedHistoricalLogs.walmart.push(log);
        break;
      default:
        console.error(`Unsorted loop name present in database: ${log.loopKey}`);
        process.exit(2);
    }
  }

  // gather data
  function getPoints(member) {
    let pointArr = [];
    for (log of sortedHistoricalLogs[member])
      for (histPoint of log.histpoints)
        pointArr.push(
          _point([histPoint.coordinates[0], histPoint.coordinates[1]])
        );
    return pointArr;
  }
  function getSpeeds(member) {
    let speedArr = [];
    for (log of sortedHistoricalLogs[member])
      for (histPoint of log.histpoints) speedArr.push(histPoint.speed);
    return speedArr;
  }
  function getCollectedTimes(member) {
    let collectedTimeArr = [];
    for (log of sortedHistoricalLogs[member])
      for (histPoint of log.histPoints)
        collectedTimeArr.push({
          time: histPoint.timestamp,
          nextStop: log.nextStop
        });
    return collectedTimeArr;
  }
  function getArrivalTimes(member) {
    let arrivalTimeArr = [];
    for (log of sortedHistoricalLogs[member])
      arrivalTimeArr.push({ arrivalTime: log.arrivalTime, stop: log.nextStop });
    return arrivalTimeArr;
  }
  let loopNames = {
    campus: "campus",
    downtown: "downtown",
    latenight: "latenight",
    walmart: "walmart"
  };
  let trainingData = {
    campusLoop: {
      name: loopNames.campus,
      loop: lineString(data.loops.features[0].geometry.coordinates),
      points: getPoints(loopNames.campus),
      speeds: getSpeeds(loopNames.campus),
      collectedTimes: getCollectedTimes(loopNames.campus),
      arrivalTimes: getArrivalTimes(loopNames.campus)
    },
    downtownLoop: {
      name: loopNames.downtown,
      loop: lineString(data.loops.features[2].geometry.coordinates),
      points: getPoints(loopNames.downtown),
      speeds: getSpeeds(loopNames.downtown),
      collectedTimes: getCollectedTimes(loopNames.downtown),
      arrivalTimes: getArrivalTimes(loopNames.downtown)
    },
    latenightLoop: {
      name: loopNames.latenight,
      loop: lineString(data.loops.features[l].geometry.coordinates),
      points: getPoints(loopNames.latenight),
      speeds: getSpeeds(loopNames.latenight),
      collectedTimes: getCollectedTimes(loopNames.latenight),
      arrivalTimes: getArrivalTimes(loopNames.latenight)
    },
    walmartLoop: {
      name: loopNames.walmart,
      loop: lineString(data.loops.features[w].geometry.coordinates),
      points: getPoints(loopNames.walmart),
      speeds: getSpeeds(loopNames.walmart),
      collectedTimes: getCollectedTimes(loopNames.walmart),
      arrivalTimes: getArrivalTimes(loopNames.walmart)
    }
  };

  // assemble logs into runs and separate data in loop (do not ask how long it'll be until the bus comes back to stop X and then the next stop)
  function sortRuns(loopData, stops) {
    // sort arrivals
    loopData.sortedByStop = {};
    for (stop of stops) loopData.sortedByStop[stop] = [];
    // sort arrivals by stop
    for (arrival of loopData.arrivalTimes)
      for (stop of stops)
        if (arrival.stop === stop) loopData.sortedByStop[stop].push(arrival);

    // sort arrivals by time
    for (stop of stops)
      loopData.sortedByStop[stop].sort((a, b) => a.arrivalTime - b.arrivalTime);

    // sort points between arrivals
    loopData.dataSortedByTime = [];
    for (stop of stops) {
      let arr = [];
      loopData.sortedByStop[stop].forEach((arrivalTime, index) => {
        loopData.collectedTimes.forEach((time, idx) => {
          if (
            index === 0 &&
            time < arrivalTime &&
            new Date(time).getDate() === new Date(arrivalTime).getDate()
          )
            arr.push({
              currentPoint: loopData.points[idx],
              destination: data.stops[stop].geometry.coordinates,
              speed: loopData.speeds[idx],
              currentTime: time,
              arrivalTime: arrivalTime
            });
          else if (
            // this is an else-if to prevent index-out-of-bounds (index of -1)
            time > loopData.sortedByStop[stop][index - 1] &&
            time < arrivalTime &&
            new Date(loopData.sortedByStop[stop][index - 1]).getDate() ===
              new Date(arrivalTime).getDate()
          )
            arr.push({
              currentPoint: loopData.points[idx],
              destination: data.stops[stop].geometry.coordinates,
              speed: loopData.speeds[idx],
              currentTime: time,
              arrivalTime: arrivalTime
            });
        });
      });
      loopData.dataSortedByTime.push(arr);
    }
  }

  for (loopData in trainingData)
    sortRuns(loopData, data.loopStops[loopData.name]);

  // get distances between points
  console.log("Analysing data...");
  const unitOfMeasurement = "kilometers";

  for (loop of trainingData) {
    for (entry of loop.dataSortedByTime) {
      entry.currentPoint = nearestPointOnLine(loop.loop, entry.currentPoint, {
        units: unitOfMeasurement
      });
      entry.destination = nearestPointOnLine(
        loop.loop,
        _point(entry.destination),
        {
          units: unitOfMeasurement
        }
      );
      let slice = lineSlice(entry.currentPoint, entry.destination, loop.loop);

      let numOfBusStops = 0;
      for (stop of data.stops)
        if (booleanPointOnLine(_point(stop.geometry.coordinates), slice))
          numOfBusStops++;
      numOfBusStops--; // booleanPointOnLine will include the target bus stop (remove this line if we want that included)

      let numOfIntersections = 0;
      for (intersection of data.intersections)
        if (
          booleanPointOnLine(_point(intersection.geometry.coordinates), slice)
        )
          numOfIntersections++;

      inputs.push([
        length(slice, { units: unitsOfMeasurement }), // distance
        numOfBusStops,
        numOfIntersections,
        speed
      ]);

      expectedOutputs.push([(entry.arrivalTime - entry.currentTime) / 1000]); // predict number of seconds instead of number of milliseconds
    }
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
    hostname: "bloombus.mads.bloomu.edu",
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
