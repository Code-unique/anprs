#!/bin/bash

# ANPR System Setup Script

echo "🚀 Setting up Automatic Number Plate Recognition System"
echo "======================================================"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create project structure
echo "📁 Creating project structure..."
mkdir -p anpr-system
cd anpr-system

mkdir -p backend/app/{services,api,utils}
mkdir -p frontend/src/{components,services,types,store}
mkdir -p ml_model/{training_data,models}
mkdir -p scripts tests

echo "✅ Project structure created"

# Setup backend
echo "🔧 Setting up backend..."
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install fastapi uvicorn sqlmodel opencv-python numpy pytesseract pillow easyocr ultralytics torch torchvision

# Initialize database
echo "🗄️ Initializing database..."
cd app
python3 -c "
from database import create_db_and_tables, init_db
create_db_and_tables()
init_db()
print('✅ Database initialized')
"

cd ../..

# Setup frontend
echo "🎨 Setting up frontend..."
cd frontend

# Initialize package.json
cat > package.json << 'EOF'
{
  "name": "anpr-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-webcam": "^7.0.1",
    "react-dropzone": "^14.2.3",
    "lucide-react": "^0.309.0",
    "axios": "^1.6.2",
    "recharts": "^2.10.3",
    "date-fns": "^3.0.6",
    "socket.io-client": "^4.7.2",
    "zustand": "^4.4.7",
    "react-hot-toast": "^2.4.1",
    "framer-motion": "^10.16.16",
    "react-router-dom": "^6.20.1",
    "jwt-decode": "^4.0.0",
    "tailwindcss": "^3.3.6",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  },
  "devDependencies": {
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}
EOF

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Create Tailwind config
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

# Create PostCSS config
cat > postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

cd ../..

# Create environment files
echo "🔐 Creating environment files..."

cat > .env << 'EOF'
# Backend Configuration
DATABASE_URL=sqlite:///./anpr.db
SECRET_KEY=change-this-in-production
DEBUG=True

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# ML Configuration
MODEL_PATH=./ml_model/anpr_model.pt
USE_GPU=False
EOF

cat > frontend/.env << 'EOF'
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=ANPR System
VITE_APP_VERSION=2.0.0
EOF

# Create startup scripts
echo "⚡ Creating startup scripts..."

cat > start_backend.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting ANPR Backend..."
cd backend
source venv/bin/activate
cd app
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
EOF

cat > start_frontend.sh << 'EOF'
#!/bin/bash
echo "🎨 Starting ANPR Frontend..."
cd frontend
npm run dev
EOF

cat > start_all.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting ANPR System..."
echo "=========================="

# Start backend
cd backend
source venv/bin/activate
cd app
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
cd ../../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ ANPR System is running!"
echo "📡 Backend: http://localhost:8000"
echo "🎨 Frontend: http://localhost:5173"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"

# Wait for interrupt
trap 'kill $BACKEND_PID $FRONTEND_PID; exit' INT
wait
EOF

chmod +x start_backend.sh start_frontend.sh start_all.sh

# Create test script
cat > test_system.py << 'EOF'
#!/usr/bin/env python3
"""
Test script for ANPR System
"""

import requests
import cv2
import numpy as np
import os

def test_system():
    print("🧪 Testing ANPR System...")
    print("=" * 50)
    
    # Test backend health
    try:
        response = requests.get("http://localhost:8000/health")
        print(f"✅ Backend health: {response.json()}")
    except:
        print("❌ Backend not reachable")
        return
    
    # Create test image
    print("\n🖼️ Creating test image...")
    os.makedirs("test_images", exist_ok=True)
    
    # Create synthetic plate image
    img = np.zeros((400, 600, 3), dtype=np.uint8)
    img.fill(200)  # Gray background
    
    # Draw plate
    cv2.rectangle(img, (100, 150), (500, 250), (255, 255, 255), -1)
    cv2.rectangle(img, (100, 150), (500, 250), (0, 0, 0), 3)
    
    # Draw plate text
    plate_text = "BA 1 PA 1234"
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 1.2
    thickness = 3
    text_size = cv2.getTextSize(plate_text, font, font_scale, thickness)[0]
    
    text_x = (600 - text_size[0]) // 2
    text_y = (400 + text_size[1]) // 2
    
    cv2.putText(img, plate_text, (text_x, text_y), font, font_scale, (0, 0, 0), thickness)
    
    # Save test image
    test_path = "test_images/test_plate.jpg"
    cv2.imwrite(test_path, img)
    print(f"✅ Test image saved: {test_path}")
    
    # Test scan endpoint
    print("\n🔍 Testing scan endpoint...")
    try:
        with open(test_path, "rb") as f:
            files = {"file": ("test_plate.jpg", f, "image/jpeg")}
            response = requests.post("http://localhost:8000/api/scan", files=files)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Scan successful!")
            print(f"   Plate: {result.get('plate_number')}")
            print(f"   Confidence: {result.get('confidence')}")
            print(f"   Status: {result.get('status')}")
        else:
            print(f"❌ Scan failed: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test stats endpoint
    print("\n📊 Testing stats endpoint...")
    try:
        response = requests.get("http://localhost:8000/api/stats")
        stats = response.json()
        print(f"✅ Stats retrieved")
        print(f"   Total scans: {stats.get('total_scans')}")
        print(f"   Success rate: {stats.get('success_rate')}%")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_system()
EOF

chmod +x test_system.py

echo ""
echo "🎉 ANPR System setup complete!"
echo ""
echo "To start the system:"
echo "1. Run: ./start_all.sh"
echo "2. Or separately:"
echo "   - Backend: ./start_backend.sh"
echo "   - Frontend: ./start_frontend.sh"
echo ""
echo "Access points:"
echo "- Frontend: http://localhost:5173"
echo "- Backend API: http://localhost:8000"
echo "- API Docs: http://localhost:8000/docs"
echo ""
echo "Default login: admin / admin123"
echo ""
echo "To test the system: python test_system.py"