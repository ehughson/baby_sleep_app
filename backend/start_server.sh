#!/bin/bash
# Start the Flask backend server

cd "$(dirname "$0")"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. Create one with your GEMINI_API_KEY"
fi

echo "Starting Flask backend server on port 5001..."
echo "Press Ctrl+C to stop the server"
echo ""

python app.py

