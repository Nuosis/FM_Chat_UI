#!/bin/bash

# Script to run the Simple Chat application

echo "Starting Simple Chat Application..."
echo "Navigating to src/simpleChat directory..."
cd src/simpleChat || { echo "Error: src/simpleChat directory not found"; exit 1; }

echo "Running start.sh script..."
./start.sh

# If start.sh exits, return to the original directory
cd - > /dev/null