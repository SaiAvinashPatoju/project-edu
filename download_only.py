"""
RAM-Safe Model Download Script
Downloads models to disk without loading them into memory.
Run this BEFORE starting the main app.
"""
from huggingface_hub import hf_hub_download
import os

print("⏳ Starting RAM-Safe Model Download...")
print("=" * 50)

# Create models directory
os.makedirs("./models/qwen2.5-3b.gguf", exist_ok=True)

# 1. Download Qwen 2.5-3B (smaller, faster, lower RAM)
print("\n⬇️  Downloading Qwen 2.5-3B LLM (~2.2 GB)...")
print("   This is the Q4_K_M quantized version for low memory usage.")
try:
    hf_hub_download(
        repo_id="Qwen/Qwen2.5-3B-Instruct-GGUF",
        filename="qwen2.5-3b-instruct-q4_k_m.gguf",
        local_dir="./models/qwen2.5-3b.gguf",
        local_dir_use_symlinks=False  # Important for Windows
    )
    print("✅ LLM Downloaded successfully!")
except Exception as e:
    print(f"❌ LLM Download failed: {e}")

# 2. Download Moonshine ASR (much smaller ~200MB, handled automatically)
print("\n⬇️  Moonshine ASR will download automatically on first use (~200 MB)")
print("   No action needed - it caches to HuggingFace cache directory.")

print("\n" + "=" * 50)
print("🎉 Model download complete!")
print("\nNext steps:")
print("1. Update backend/.env to use the smaller model:")
print("   QWEN_MODEL_PATH=../models/qwen2.5-3b.gguf/qwen2.5-3b-instruct-q4_k_m.gguf")
print("2. Run: .\\start-dev.bat")
