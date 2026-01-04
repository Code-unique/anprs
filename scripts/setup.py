#!/usr/bin/env python3
"""
Complete setup script for ANPR system
"""

import os
import sys
import subprocess
from pathlib import Path

def setup_project():
    """Setup complete ANPR project"""
    print("🚀 Setting up ANPR System...")
    
    # Create directories
    directories = [
        "backend/app/services",
        "backend/app/api",
        "backend/app/utils",
        "frontend/src/components",
        "frontend/src/services",
        "frontend/src/types",
        "frontend/src/store",
        "ml_model",
        "scripts",
        "tests"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"📁 Created: {directory}")
    
    print("✅ Directory structure created")
    
    # Check requirements
    check_requirements()
    
    print("\n🎉 Setup complete!")
    print("\nNext steps:")
    print("1. cd backend && pip install -r requirements.txt")
    print("2. cd ../frontend && npm install")
    print("3. python ml_model/data_collection.py")
    print("4. python ml_model/train_model.py")
    print("5. ./start.sh to run the system")

def check_requirements():
    """Check system requirements"""
    print("\n🔍 Checking requirements...")
    
    requirements = [
        ("python3", "--version", "Python 3.8+"),
        ("node", "--version", "Node.js 18+"),
        ("npm", "--version", "npm"),
        ("docker", "--version", "Docker (optional)"),
        ("docker-compose", "--version", "Docker Compose (optional)")
    ]
    
    for cmd, version_flag, description in requirements:
        try:
            result = subprocess.run([cmd, version_flag], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ {description}: {result.stdout.strip()}")
            else:
                print(f"⚠️ {description}: Not found")
        except FileNotFoundError:
            print(f"❌ {description}: Not installed")

if __name__ == "__main__":
    setup_project()