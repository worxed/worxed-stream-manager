#!/bin/bash
export PATH=$PATH:/opt/rocm/bin
export LD_LIBRARY_PATH=/opt/rocm/lib:/opt/rocm/lib64:$LD_LIBRARY_PATH
export HSA_OVERRIDE_GFX_VERSION=11.0.0
export HSA_ENABLE_SDMA=0

echo "=== ROCm Verification ==="
echo ""

echo "--- rocminfo ---"
rocminfo 2>&1 | grep -E "Name:|Marketing|gfx|Agent" | head -15
echo ""

echo "--- rocm-smi ---"
rocm-smi 2>&1 | head -20
echo ""

echo "=== Done ==="
