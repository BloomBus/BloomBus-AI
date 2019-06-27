/**
 * Trains the AI to predict when a bus will arrive at a bus stop.
 * 
 * @author Michael O'Donnell
 * @version 0.1.0
 */

'use strict';

// Import Firebase / Get the database (may be removed in future in favor of a download site that sends the database as two json files being developed by John Gibson)
// import * as firebase from 'firebase'
// import 'firebase/auth'
// import 'firebase/database'
import * as fs from 'fs'
// const dbInfo = JSON.parse(fs.readFileSync('./dbInfo.json', 'utf8')); // contains sensitive data (do not put on GitHub)
// let dbApp = firebase.initializeApp(dbInfo);
// let db = dbApp.database();

// If John Gibson's download site can be accessed from Node.js
import * as https from 'https'
// documentation for firebase can be found at https://firebase.google.com/docs/
import * as tf from '@tensorflow/tfjs-node-gpu'
// documentation for tensorflow.js can be found at https://js.tensorflow.org/api/latest/
import * as turf from '@turf/turf'
import * as zlib from 'zlib'
import * as tar from 'tar'
import * as fstream from 'fstream'

async function getAndSaveFile(name) {
	const file = fs.createWriteStream(`./${name}.json`);
	const request = https.get(`https://bloombus.bloomu.edu/api/download/${name}/geojson`, response => {
		if (response.statusCode !== 200)
			console.log(`Response status for ${name} was ${response.statusCode}`);
		response.pipe(file);
		file.on('finish', () => {
			file.closeSync();
		})
	}).on('error', err => error(err));

	file.on('error', err => error(err));

	function error(err) {
		console.log(err.name);
		console.log(err.message);
		console.log(err.stack);
		file.closeSync();
		process.exit(1);
	}
}

async function getData(...args) {
	for (arg of args)
		getAndSaveFile(arg);
}

async function prepareData(inputs, expectedOutputs) {
	console.log('Retrieving data...');
	// If John Gibson's download site can be accessed from Node.js, remove the firebase import
	const garbage = await getData('loops', 'testData');

	global.gc();

	console.log('Extracting data...');
	const data = {
		loops: JSON.parse(fs.readFileSync('./loops.json', 'utf8')),
		shuttleData: JSON.parse(fs.readFileSync('./testData.json', 'utf8'))
	};

	// get locations | NEED TO CLEAN THIS SECTION
	// points
	let pointArrA = [];
	data.shuttleData[0].forEach(data => {
		pointArrA.push(turf.point([data[0], data[1]]));
	});
	let pointArrB = [];
	data.shuttleData[1].forEach(data => {
		pointArrB.push(turf.point([data[0], data[1]]));
	});
	let pointArrC = [];
	data.shuttleData[2].forEach(data => {
		pointArrC.push(turf.point([data[0], data[1]]));
	});
	let pointArrD = [];
	data.shuttleData[3].forEach(data => {
		pointArrD.push(turf.point([data[0], data[1]]));
	});
	// speeds
	let speedArrA = [];
	data.shuttleData[0].forEach(data => {
		speedArrA.push(data[2]);
	});
	let speedArrB = [];
	data.shuttleData[1].forEach(data => {
		speedArrB.push(data[2]);
	});
	let speedArrC = [];
	data.shuttleData[2].forEach(data => {
		speedArrC.push(data[2]);
	});
	let speedArrD = [];
	data.shuttleData[3].forEach(data => {
		speedArrD.push(data[2]);
	});
	// times
	let timeArrA = [];
	data.shuttleData[0].forEach(data => {
		timeArrA.push(data[3]);
	});
	let timeArrB = [];
	data.shuttleData[1].forEach(data => {
		timeArrB.push(data[3]);
	});
	let timeArrC = [];
	data.shuttleData[2].forEach(data => {
		timeArrC.push(data[3]);
	});
	let timeArrD = [];
	data.shuttleData[3].forEach(data => {
		timeArrD.push(data[3]);
	});
	let testData = {
		campusLoop: {
			loop: turf.lineString(data.loops.features[0].geometry.coordinates),
			points: pointArrA,
			speeds: speedArrA,
			times: timeArrA
		},
		downtownLoop: {
			loop: turf.lineString(data.loops.features[2].geometry.coordinates),
			points: pointArrB,
			speeds: speedArrB,
			times: timeArrB
		},
		latenightLoop: {
			loop: turf.lineString(data.loops.features[l].geometry.coordinates),
			points: pointArrC,
			speeds: speedArrC,
			times: timeArrC
		},
		walmartLoop: {
			loop: turf.lineString(data.loops.features[w].geometry.coordinates),
			points: pointArrD,
			speeds: speedArrD,
			times: timeArrD
		}
	};

	// get distances between points
	console.log('Analysing data...');
	const unitOfMeasurement = 'kilometers';

	for (loop in testData) {
		// snap points to the loop
		for (point of loop.points) {
			point = turf.nearestpointOnLine(loop.loop, point, {units: unitOfMeasurement});
		}
		loop.points.forEach((point, pointIndex) => {
			point.properties.distances = [];
			loop.points.forEach((pt, ptIndex) => {
				if (point !== pt && loop.times[pointIndex] < loop.times[ptIndex]) {
					point.properties.distances.push({
						distance: turf.length(turf.lineSlice(point, pt, loop.loop), {units: unitOfMeasurement}),
						//point: pt,
						pointIndex: ptIndex
					});
				}
			});
		});
	}

	// prepare data for training
	console.log('Preparing data...');
	for (loop in testData) {
		loop.points.forEach((point, pointIndex) => {
			point.properties.distances.forEach(dist => {
				inputs.push([
					dist.distance,
					// TODO: add number of intersections along path
					// TODO: add number of bus stops between point a and point b
					loop.speeds[pointIndex],
					loop.times[pointIndex]
				]);
				expectedOutputs.push([
					loop.times[dist.pointIndex]
				]);
			});
		});
	}
}

async function learnBusArrival() {
	let inputs = [];
	let expectedOutputs = [];

	const garbage = await prepareData(inputs, expectedOutputs);

	global.gc();

	console.log('Creating model...');

	/*
		WebGL on smartphones only supports IEEE-754 16-bit floating-point textures, this constraint will keep the model within those restrictions
		NOTE: This is claimed primarily by Tensorflow.js itself with no external links to further documentation (see https://www.tensorflow.org/js/guide/platform_environment#precision)
	*/


	/*
		Deprecate if ai runs on server

	const constraint = tf.constraints.minMaxNorm({
		minValue: 0.000000059605,
		maxValue: 65504,
		axis: 0,
		rate: 1.0
	});
	*/

	/*
		type of model we are using (here, a simple linearly layered structure)
		units is the number of nodes in this layer
		inputShape only needs to be set for the first hidden layer because it says the number of nodes in the input layer
	*/
	const model = tf.sequential({
		layers: [
			// Hidden Layer 1
			tf.layers.dense({
				units: 18,
				activation: 'relu',
				inputShape: [3],
				kernelConstraint: constraint,
				biasConstraint: constraint
			}),
			// Hidden Layer 2
			tf.layers.dense({
				units: 12,
				activation: 'relu',
				kernelConstraint: constraint,
				biasConstraint: constraint
			}),
			// Output Layer
			tf.layers.dense({
				units: 1,
				activation: 'linear',
				kernelConstraint: constraint,
				biasConstraint: constraint
			})
		]
	});

	/*
		adds the loss function, optimizer, and metrics
		does not do anything beyond adding those three attributes (no C-like compilation)
	*/
	model.compile({
		loss: 'meanSquaredError',
		optimizer: tf.train.adam(0.01), // number is the learning rate
		metrics: ['accuracy']
	});

	const input = tf.tensor2d(inputs);
	const output = tf.tensor2d(expectedOutputs);

	// Prevent overtraining
	let tfCallbacks = tf.callbacks.earlyStopping({
		monitor: 'val_loss',
		patience: 15
	});

	tfCallbacks.onEpochEnd = async (epoch, logs) => {
		console.log(`${epoch} : ${(logs.loss + '').replace(/Tensor\s+/, '')}`);
		await tf.nextFrame();
	};

	console.log('Training...');
	await model.fit(input, output, {
		//batchSize: 8192, // when you have a supercomputer at your disposal, why not?
		epochs: 2000,
		shuffle: true,
		validationSplit: 0.1,
		callbacks: tfCallbacks
	}).then(info => {
		console.log(`${info.history.acc.length} epochs occurred`);
	});

	/* Saves a model.json file and 1 or more .bin files to the destination folder */
	await model.save('file:///home/nvidia/Documents/BloomBus/ai/model/');
}

function uploadToServer() {
	var shelljs = require('shelljs');
	shelljs.exec('tar -zcvf model.tar.gz model');

	// upload compressed model
	console.log('Uploading...');
	const file = fs.createReadStream('model.tar.gz');
	const options = {
		hostname: 'bloombus.bloomu.edu',
		port: 80,
		path: '/ai',
		method: 'POST',
		headers: {
			'Content-Type': 'application/gzip',
			'Content-Length': Buffer.byteLength(file)
		}
	};
	const req = https.request(options, res => {
		console.log(`BloomBus Server StatusCode:\t${res.statusCode}`);
		console.log(`BloomBus Server Headers:\t${res.headers}`);

		res.on('data', d => {
			process.stdout.write(d);
		});

		res.on('error', e => {
			console.error(e);
		})
	}).on('error', e => {
		console.error(e);
	});

	req.write(file);

	req.end();
	console.log('Success!');
}

learnBusArrival().then(uploadToServer());
