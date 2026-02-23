#!/bin/bash
# LoRA training launcher for AMD RX 7900 XTX on WSL2 ROCm 6.4.2
# Sets required environment and runs lora.py from the companion directory.

set -euo pipefail

# --- Determine ROCm library path ---
# WSL2 ROCm installs binaries to /usr/bin and libraries to /opt/rocm-*/lib
if [ -d /opt/rocm-6.4.2/lib ]; then
    ROCM_LIB=/opt/rocm-6.4.2/lib
elif [ -d /opt/rocm/lib ]; then
    ROCM_LIB=/opt/rocm/lib
else
    echo "ERROR: No ROCm lib found at /opt/rocm-6.4.2/lib or /opt/rocm/lib"
    exit 1
fi
echo "Using ROCm lib: $ROCM_LIB"

# --- ROCm environment ---
export LD_LIBRARY_PATH="$ROCM_LIB:${LD_LIBRARY_PATH:-}"

# IMPORTANT: Do NOT set HSA_OVERRIDE_GFX_VERSION on WSL2.
# The WSL HSA runtime auto-detects gfx1100 (7900 XTX) correctly.
# Setting it causes: "Assertion 'props.EngineId.ui32.Major' failed"
unset HSA_OVERRIDE_GFX_VERSION

# Disable SDMA — required for stability on gfx1100 WSL2
export HSA_ENABLE_SDMA=0

# Avoid HIP memory pool fragmentation issues
export PYTORCH_HIP_ALLOC_CONF=expandable_segments:True

# --- Run from finetune directory so config.yaml relative paths work ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPANION_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$SCRIPT_DIR"

PYTHON="$COMPANION_DIR/venv-wsl/bin/python"
if [ ! -f "$PYTHON" ]; then
    echo "ERROR: venv not found at $COMPANION_DIR/venv-wsl"
    exit 1
fi

echo "Working directory: $(pwd)"
echo "Python: $PYTHON"
echo "HSA_OVERRIDE_GFX_VERSION: ${HSA_OVERRIDE_GFX_VERSION:-<unset>}"
echo "HSA_ENABLE_SDMA: $HSA_ENABLE_SDMA"
echo ""

exec "$PYTHON" lora.py "$@"
