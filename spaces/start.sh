#!/bin/bash
# ================================================
# Project EDU - Startup Script
# ================================================

set -e

# HuggingFace cache
export HF_HOME=${HF_HOME:-/data/hf}
export HF_HUB_ENABLE_HF_TRANSFER=1

# Model directory
export MODEL_DIR=${MODEL_DIR:-/data/models}
mkdir -p $MODEL_DIR

# llama-cpp-python build flags (CPU only on Spaces)
export CMAKE_ARGS="-DLLAMA_BLAS=OFF -DLLAMA_NATIVE=OFF"
export FORCE_CMAKE=1

echo "=============================================="
echo "Project EDU - Edge AI Server"
echo "=============================================="
echo "MODEL_DIR: $MODEL_DIR"
echo "HF_HOME: $HF_HOME"
echo "=============================================="

# Start server
exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-7860}
