#!/bin/bash
# =============================================================
# ROCm 6.4.2.1 Setup for WSL2 — AMD Radeon RX 7900 XTX
# =============================================================
# Prerequisites:
#   - Windows 11 with AMD Adrenalin Edition 26.1.1+ driver
#   - WSL2 with Ubuntu 24.04 (Noble)
#
# Run this inside your WSL2 Ubuntu terminal:
#   cd /mnt/f/Projects/git/worxed-stream-manager/companion
#   bash setup_rocm_wsl.sh
#
# Based on:
#   - AMD blog: https://rocm.blogs.amd.com/software-tools-optimization/rocm-on-wsl/README.html
#   - AMD docs: https://rocm.docs.amd.com/projects/radeon/en/latest/docs/install/wsl/install-radeon.html
#   - Community: https://gist.github.com/kerikh/e2a52a9d13ad35c8f55d75de109f9a68
#
# NOTE: ROCm 7.x does NOT have WSL2 packages yet.
#       ROCm 6.4.2.1 is the latest WSL-compatible version.
# =============================================================

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "==========================================================="
echo "  ROCm 6.4.2.1 for WSL2 -- AMD Radeon RX 7900 XTX"
echo "==========================================================="
echo ""

# --- Step 0: Clean up any previous ROCm installation ---
echo "[0/7] Cleaning up previous ROCm installation..."
sudo rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/cache/apt/archives/lock 2>/dev/null || true
sudo dpkg --configure -a 2>/dev/null || true

# Remove old repo configs
sudo rm -f /etc/apt/sources.list.d/rocm.list
sudo rm -f /etc/apt/preferences.d/rocm-pin-600

# Remove any existing amdgpu-install
sudo dpkg --remove --force-remove-reinstreq amdgpu-install 2>/dev/null || true

# Purge old ROCm packages if any remain
sudo apt purge -y rocm-core rocm-hip-runtime rocm-opencl rocm-opencl-runtime \
  rocm-opencl-icd-loader rocm-smi-lib rocminfo hip-runtime-amd \
  hsa-rocr hsa-rocr-dev comgr rocm-language-runtime \
  hsa-runtime-rocr4wsl-amdgpu 2>/dev/null || true
sudo apt autoremove -y 2>/dev/null || true
echo "  Old packages cleaned."

# --- Step 1: Install amdgpu-install 6.4.2.1 for Ubuntu 24.04 ---
echo ""
echo "[1/7] Downloading amdgpu-install for ROCm 6.4.2.1 + Ubuntu 24.04..."
cd /tmp
rm -f amdgpu-install_6.4.60402-1_all.deb 2>/dev/null || true
wget -q https://repo.radeon.com/amdgpu-install/6.4.2.1/ubuntu/noble/amdgpu-install_6.4.60402-1_all.deb
sudo apt install -y ./amdgpu-install_6.4.60402-1_all.deb
rm -f amdgpu-install_6.4.60402-1_all.deb
echo "  amdgpu-install 6.4.2.1 ready."

# --- Step 2: Install ROCm with WSL usecase ---
echo ""
echo "[2/7] Installing ROCm with WSL usecase... (this takes several minutes)"
echo "  Command: amdgpu-install -y --usecase=wsl,rocm --no-dkms"
echo "  (--no-dkms: WSL2 uses Windows kernel, no Linux kernel modules needed)"
amdgpu-install -y --usecase=wsl,rocm --no-dkms
echo "  ROCm 6.4.2.1 installed."

# --- Step 3: Configure environment ---
echo ""
echo "[3/7] Configuring environment..."

# Remove old ROCm env block if present, then add fresh one
if grep -q "HSA_OVERRIDE_GFX_VERSION" ~/.bashrc 2>/dev/null; then
    # Remove old block (between markers)
    sed -i '/# ROCm.*for AMD GPU/,/^$/d' ~/.bashrc 2>/dev/null || true
    # Also remove standalone env vars from old setup
    sed -i '/HSA_OVERRIDE_GFX_VERSION/d' ~/.bashrc 2>/dev/null || true
    sed -i '/HSA_ENABLE_SDMA/d' ~/.bashrc 2>/dev/null || true
    sed -i '/LD_PRELOAD.*libamdhip64/d' ~/.bashrc 2>/dev/null || true
    sed -i '/\/opt\/rocm\/bin/d' ~/.bashrc 2>/dev/null || true
    sed -i '/\/opt\/rocm\/lib/d' ~/.bashrc 2>/dev/null || true
fi

cat >> ~/.bashrc << 'ROCMEOF'

# ROCm 6.4.2.1 for AMD GPU (WSL2)
# NOTE: Do NOT set HSA_OVERRIDE_GFX_VERSION — it crashes the WSL HSA runtime.
#       The WSL runtime auto-detects gfx1100 (7900 XTX) correctly without it.
export PATH=$PATH:/opt/rocm/bin
export LD_LIBRARY_PATH=/opt/rocm-6.4.2/lib:/opt/rocm/lib:/opt/rocm/lib64:$LD_LIBRARY_PATH
export HSA_ENABLE_SDMA=0
ROCMEOF

echo "  Updated ~/.bashrc with ROCm environment"

# Apply now for this session
export PATH=$PATH:/opt/rocm/bin
export LD_LIBRARY_PATH=/opt/rocm-6.4.2/lib:/opt/rocm/lib:/opt/rocm/lib64:$LD_LIBRARY_PATH
export HSA_ENABLE_SDMA=0
echo "  Environment configured for this session."

# --- Step 4: Verify ROCm sees the GPU ---
echo ""
echo "[4/7] Verifying ROCm..."
if command -v rocminfo &>/dev/null; then
    if rocminfo 2>&1 | grep -q "gfx"; then
        rocminfo 2>&1 | grep -E "Name:|Marketing Name:|gfx" | head -10
        echo "  ROCm verified! GPU detected."
    else
        echo "  WARNING: rocminfo ran but no GPU agent found."
        echo "  Check: Windows Adrenalin driver >= 26.1.1"
        echo "  Try:   wsl --shutdown (from Windows CMD), then restart WSL"
    fi
else
    echo "  WARNING: rocminfo not found after install."
fi

# --- Step 5: Create Python venv ---
echo ""
echo "[5/7] Setting up Python venv..."
cd "$SCRIPT_DIR"
VENV_DIR="$SCRIPT_DIR/venv-wsl"

if [ -d "$VENV_DIR" ]; then
    echo "  Removing old venv-wsl..."
    rm -rf "$VENV_DIR"
fi

python3 -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"
pip install --upgrade pip wheel setuptools -q
echo "  venv-wsl created."

# --- Step 6: Install PyTorch with AMD ROCm wheels ---
echo ""
echo "[6/7] Installing PyTorch with AMD's official ROCm 6.4.2 wheels..."
echo "  (These are from repo.radeon.com, built specifically for ROCm WSL2)"

cd /tmp
rm -f torch-*.whl torchvision-*.whl torchaudio-*.whl pytorch_triton_rocm-*.whl 2>/dev/null || true

echo "  Downloading torch..."
wget -q https://repo.radeon.com/rocm/manylinux/rocm-rel-6.4.2/torch-2.6.0%2Brocm6.4.2.git76481f7c-cp312-cp312-linux_x86_64.whl
echo "  Downloading torchvision..."
wget -q https://repo.radeon.com/rocm/manylinux/rocm-rel-6.4.2/torchvision-0.21.0%2Brocm6.4.2.git4040d51f-cp312-cp312-linux_x86_64.whl
echo "  Downloading torchaudio..."
wget -q https://repo.radeon.com/rocm/manylinux/rocm-rel-6.4.2/torchaudio-2.6.0%2Brocm6.4.2.gitd8831425-cp312-cp312-linux_x86_64.whl
echo "  Downloading triton..."
wget -q https://repo.radeon.com/rocm/manylinux/rocm-rel-6.4.2/pytorch_triton_rocm-3.2.0%2Brocm6.4.2.git7e948ebf-cp312-cp312-linux_x86_64.whl

echo "  Installing wheels..."
pip install \
  torch-2.6.0+rocm6.4.2.git76481f7c-cp312-cp312-linux_x86_64.whl \
  torchvision-0.21.0+rocm6.4.2.git4040d51f-cp312-cp312-linux_x86_64.whl \
  torchaudio-2.6.0+rocm6.4.2.gitd8831425-cp312-cp312-linux_x86_64.whl \
  pytorch_triton_rocm-3.2.0+rocm6.4.2.git7e948ebf-cp312-cp312-linux_x86_64.whl \
  -q

# Critical WSL fix: remove PyTorch's bundled HSA runtime so it uses the system one
echo "  Applying WSL runtime fix..."
TORCH_LIB=$(python3 -c "import torch; print(torch.__path__[0])")/lib
if [ -f "$TORCH_LIB/libhsa-runtime64.so" ]; then
    rm -f "$TORCH_LIB"/libhsa-runtime64.so*
    echo "  Removed bundled libhsa-runtime64 (will use system ROCm instead)"
else
    echo "  No bundled libhsa-runtime64 found (OK)"
fi

rm -f /tmp/torch-*.whl /tmp/torchvision-*.whl /tmp/torchaudio-*.whl /tmp/pytorch_triton_rocm-*.whl

echo "  Installing companion dependencies..."
pip install "python-socketio[asyncio_client]" aiohttp python-dotenv -q
pip install transformers safetensors huggingface_hub tokenizers -q
pip install soundfile sounddevice numpy librosa -q
echo "  All packages installed."

# --- Step 7: Test PyTorch + GPU ---
echo ""
echo "[7/7] Testing PyTorch + ROCm GPU..."
cd "$SCRIPT_DIR"
python3 -c "
import torch
print(f'  PyTorch version: {torch.__version__}')
print(f'  ROCm available:  {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'  GPU:             {torch.cuda.get_device_name(0)}')
    props = torch.cuda.get_device_properties(0)
    print(f'  VRAM:            {props.total_mem / 1024**3:.1f} GB')
    x = torch.randn(1000, 1000, device='cuda')
    y = x @ x.T
    print(f'  Matrix multiply: OK (shape: {y.shape})')
    print('')
    print('  GPU is working!')
else:
    print('')
    print('  WARNING: GPU not detected by PyTorch')
    print('  Troubleshooting:')
    print('    1. Check Windows driver: AMD Adrenalin 26.1.1+')
    print('    2. Restart WSL: wsl --shutdown (from Windows CMD)')
    print('    3. Check: ls -la /dev/dri/  (should show card0 + renderD128)')
    print('    4. Verify ROCm: rocminfo | grep gfx')
"

echo ""
echo "==========================================================="
echo "  Setup Complete!"
echo "==========================================================="
echo ""
echo "  Activate venv:"
echo "    source venv-wsl/bin/activate"
echo ""
echo "  Test engine (personality only):"
echo "    python engine.py --no-voice"
echo ""
echo "  Run with voice (loads CSM-1B on GPU):"
echo "    python engine.py"
echo ""
echo "  Your 7900 XTX has 24GB VRAM -- CSM-1B needs ~2GB"
echo ""
