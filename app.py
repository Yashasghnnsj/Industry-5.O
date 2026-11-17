"""
🛡️ ErgoVision AI - Root Launcher
Launches the full Python Streamlit Ergonomics Dashboard.
Run via: streamlit run app.py
"""
import os
import sys

# Add python_engine to Python module search path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "python_engine"))

from python_engine.streamlit_app import main

if __name__ == "__main__":
    main()
