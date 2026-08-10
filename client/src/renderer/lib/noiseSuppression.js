import { RnnoiseWorkletNode } from '@sapphi-red/web-noise-suppressor';
import rnnoiseWorkletSource from '@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?raw';
import rnnoiseWasmBase64 from '@sapphi-red/web-noise-suppressor/rnnoise.wasm?inline';
import rnnoiseSimdWasmBase64 from '@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?inline';

const WORKLET_URL_PATCH = /new URL\("rnnoise\.wasm"\s*,\s*import\.meta\.url\)/g;

const SIMD_PROBE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253,
  15, 253, 98, 11,
]);

function supportsSimd() {
  try {
    return WebAssembly.validate(SIMD_PROBE);
  } catch {
    return false;
  }
}

function decodeBase64DataUri(uri) {
  const comma = uri.indexOf('base64,');
  const base64 = comma >= 0 ? uri.slice(comma + 7) : uri;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

let binaryPromise = null;

export function loadRnnoiseBinary() {
  if (!binaryPromise) {
    binaryPromise = Promise.resolve().then(() => {
      const uri = supportsSimd() ? rnnoiseSimdWasmBase64 : rnnoiseWasmBase64;
      return decodeBase64DataUri(uri);
    });
  }
  return binaryPromise;
}

let workletBlobUrl = null;

function getWorkletBlobUrl() {
  if (!workletBlobUrl) {
    const patched = rnnoiseWorkletSource.replace(WORKLET_URL_PATCH, '"rnnoise.wasm"');
    workletBlobUrl = URL.createObjectURL(
      new Blob([patched], { type: 'application/javascript' })
    );
  }
  return workletBlobUrl;
}

export async function setupRnnoise(context) {
  const [wasmBinary] = await Promise.all([
    loadRnnoiseBinary(),
    context.audioWorklet.addModule(getWorkletBlobUrl()),
  ]);
  return new RnnoiseWorkletNode(context, { wasmBinary, maxChannels: 1 });
}
