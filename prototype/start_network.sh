#!/bin/bash
cd ../test-network
./network.sh down && ./network.sh up createChannel -c mychannel -ca && ./network.sh deployCC -ccn prototype -ccl javascript