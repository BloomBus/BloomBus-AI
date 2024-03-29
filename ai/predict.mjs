"use strict";

import { tensor1d, loadLayersModel } from "@tensorflow/tfjs-node-gpu"; // should likely change to tfjs-node for server deployment (function calls will remain the same)
import {
  booleanPointOnLine,
  nearestPointOnLine,
  length,
  lineSlice,
  _point
} from "@turf/turf";

/**
 * Predicts the arrival time of the given bus at the given bus stop.
 *
 * @author Michael O'Donnell
 * @param {LineString} loop The loop the bus is on.
 * @param {Feature} bus The geojson of the bus.
 * @param {Point} busStop The location of the bus stop.
 * @returns {Number} The predicted arrival time.
 */
async function predictArrivalTime(loop, stops, intersections, bus, busStop) {
  const unitOfMeasurement = "kilometers";
  const busCoord = nearestPointOnLine(loop, bus.geometry.coordinates, {
    units: unitOfMeasurement
  });

  const path = lineSlice(busCoord, busStop, loop);

  let numOfStops = 0;
  for (stop of stops)
    if (booleanPointOnLine(_point(stop.geometry.coordinates), path))
      numOfStops++;
  numOfStops--; // remove target bus stop

  let numOfIntersections = 0;
  for (intersection in intersections)
    if (booleanPointOnLine(_point(intersection.geometry.coordinates), path))
      numOfIntersections++;

  const model = await loadLayersModel(
    "file:///home/nvidia/Documents/BloomBus/ai/model/model.json" /*, 'file:///home/nvidia/Documents/BloomBus/ai/model/something.bin'*/
  ); // something.bin is the weights (might not be needed) (should load from server once set up)
  let prediction = model.predict(
    tensor1d([
      length(path, { units: unitOfMeasurement }),
      numOfIntersections,
      numOfStops,
      bus.speed,
      Date.now()
    ])
  );

  prediction = `${prediction}`; // Converts Tensor object to a string
  prediction = prediction.substring(
    prediction.lastIndexOf("[") + 1,
    prediction.indexOf("]")
  ); // Removes excess text
  prediction = Number.parseFloat(prediction); // Converts String to Number

  return prediction;
}

export default predictArrivalTime;
