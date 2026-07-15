// Dynamic loader and helper for vladmandic/face-api (highly optimized face recognition in browser)

let isLoaded = false;
let isLoading = false;
let loadPromise = null;

const SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.js';
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model/';

// Suppress TFJS Kernel Registration Warnings
const originalWarn = console.warn;
console.warn = function(...args) {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('already registered')) {
    return;
  }
  originalWarn.apply(console, args);
};

/**
 * Dynamically loads face-api.js library and its weights from CDN
 */
export const loadFaceApi = () => {
  if (isLoaded) return Promise.resolve(window.faceapi);
  if (isLoading) return loadPromise;

  isLoading = true;
  loadPromise = new Promise((resolve, reject) => {
    // Check if script is already present
    if (window.faceapi) {
      isLoaded = true;
      isLoading = false;
      resolve(window.faceapi);
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = async () => {
      try {
        console.log("🚀 Vladmandic face-api.js script loaded. Initializing models...");
        const faceapi = window.faceapi;

        // Load models directly from Vladmandic's npm package folder on jsDelivr CDN
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        console.log("✅ Vladmandic face-api.js models initialized successfully.");
        isLoaded = true;
        isLoading = false;
        resolve(faceapi);
      } catch (err) {
        console.error("❌ Failed to load face-api.js models:", err);
        isLoading = false;
        reject(err);
      }
    };
    script.onerror = (err) => {
      console.error("❌ Failed to load face-api.js script from CDN:", err);
      isLoading = false;
      reject(err);
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};

/**
 * Extracts 128-dimensional biometric face embedding vector from an image or video element
 * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} element 
 * @returns {Promise<Array<number>|null>} 128-d float array or null if no face detected
 */
export const getFaceEmbedding = async (element) => {
  try {
    const faceapi = await loadFaceApi();
    
    // Detect single face, landmarks, and extract 128-dimensional face descriptor (embedding)
    const detection = await faceapi.detectSingleFace(element)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return null;
    }

    // Convert Float32Array to standard JavaScript array of floats
    return Array.from(detection.descriptor);
  } catch (err) {
    console.error("Error extracting face embedding vector:", err);
    return null;
  }
};
