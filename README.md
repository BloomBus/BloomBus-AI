[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

# BloomBus-AI

BloomBus-AI is the code behind the AI powering the bus arrival time predictions in [BloomBus-Client][] which will be trained on a [Nvidia Jetson TX2 Developer Kit][] and then used in [BloomBus-Server][].

## AI
### Training
The AI will focus on predicting the time a bus will arrive at a bus stop, from the data avaiable with the REST API of [BloomBus-Server][] (connected to the BloomBus Firebase DB).

Training can be initiated by using the `npm start` command in the Jetson's terminal while in the project directory.

The following reflects the code as it currently stands and is subject to possible change in the near future:

*Input Variables*

* distance between bus and target bus stop along route
* bus's speed
* number of intersections along route between bus and target bus stop
* number of other bus stops along route between bus and target bus stop
* time bus's speed and location were recorded

*Expected Output*

* bus arrival time at target bus stop

### Trained Model

Once there is a trained model that can attempt to predict bus arrival times, the model will be uploaded to the server hosting [BloomBus-Server][] where the server can call `predictArrivalTime(loop, bus, busStop)` to get the bus arrival time predictions for each bus stop.

[BloomBus-Client]: https://github.com/BloomBus/BloomBus-Client
[Nvidia Jetson TX2 Developer Kit]: https://developer.nvidia.com/embedded/jetson-tx2-developer-kit
[BloomBus-Server]: https://github.com/BloomBus/BloomBus-Server
