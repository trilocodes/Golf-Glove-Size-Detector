import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';

const recommendSize = (handLengthInches) => {
  const inches = parseFloat(handLengthInches);
  if (Number.isNaN(inches)) return null;

  if (inches < 6.5) return 'Small';
  if (inches >= 8.0 && inches <= 8.25) return 'X-Large';
  if (inches > 8.25) return 'X-Large';
  if (inches >= 7.5 && inches < 8.0) return 'Large';
  if (inches >= 7.25 && inches < 7.5) return 'Med/Large';
  if (inches >= 7.0 && inches < 7.25) return 'Medium';
  return 'Small';
};

const REFERENCE_OBJECTS = {
  golfBall: {
    label: 'Golf ball',
    guideLabel: 'golf ball',
    diameterMm: 43,
  },
  coin: {
    label: 'Coin',
    guideLabel: 'coin',
    diameterMm: 24.26,
  },
};

const GUIDE_DIAMETER_RATIO = 0.2;
const GUIDE_CENTER_Y_RATIO = 0.66;
const SIZE_ORDER = ['Small', 'Medium', 'Med/Large', 'Large', 'X-Large'];
const HAND_MISS_FRAME_THRESHOLD = 8;

const adjustSizeForPalmWidth = (baseSize, palmWidthInches) => {
  if (!baseSize) return null;

  const width = parseFloat(palmWidthInches);
  if (Number.isNaN(width)) return baseSize;

  const index = SIZE_ORDER.indexOf(baseSize);
  if (index === -1) return baseSize;

  if (width >= 4.0 && index < SIZE_ORDER.length - 1) {
    return SIZE_ORDER[index + 1];
  }

  if (width <= 3.35 && index > 0) {
    return SIZE_ORDER[index - 1];
  }

  return baseSize;
};

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const referenceConfigRef = useRef(REFERENCE_OBJECTS.golfBall);
  const ballCalibratedRef = useRef(false);
  const handDetectedRef = useRef(false);
  const missedFramesRef = useRef(0);

  const [stage, setStage] = useState('instruction');
  const [referenceType, setReferenceType] = useState('golfBall');
  const [measurement, setMeasurement] = useState(null);
  const [recommendedSize, setRecommendedSize] = useState(null);
  const [gloveSize, setGloveSize] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ballCalibrated, setBallCalibrated] = useState(false);
  const [handDetected, setHandDetected] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

  const selectedReference = REFERENCE_OBJECTS[referenceType] || REFERENCE_OBJECTS.golfBall;

  const handleReferenceChange = (nextReferenceType) => {
    const nextReference = REFERENCE_OBJECTS[nextReferenceType] || REFERENCE_OBJECTS.golfBall;
    referenceConfigRef.current = nextReference;
    setReferenceType(nextReferenceType);
    setMeasurement(null);
    setRecommendedSize(null);
    setBallCalibrated(false);
    ballCalibratedRef.current = false;
    setError('');
  };

  useEffect(() => {
    const scripts = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.4.1633559619/camera_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1633559619/hands.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.4.1633559619/drawing_utils.js',
    ];

    scripts.forEach((src) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    });
  }, []);

  const onHandsResults = useCallback((results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height * GUIDE_CENTER_Y_RATIO;
    const guideDiameter = Math.min(canvas.width, canvas.height) * GUIDE_DIAMETER_RATIO;
    const radius = guideDiameter / 2;
    const referenceLabel = referenceConfigRef.current.guideLabel;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = 'rgba(74, 144, 226, 0.08)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = 'rgba(74, 144, 226, 0.35)';
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 14, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY - radius - 18);
    ctx.lineTo(centerX + radius, centerY - radius - 18);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(39, 174, 96, 0.8)';
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY + radius + 18);
    ctx.lineTo(centerX + radius, centerY + radius + 18);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Place ${referenceLabel} in the circle`, centerX, centerY - radius - 24);
    ctx.fillText('Palm end', centerX, centerY + radius + 30);

    const landmarkSets = results.multiHandLandmarks || results.landmarks;

    if (landmarkSets && landmarkSets.length > 0) {
      const landmarks = landmarkSets[0];
      missedFramesRef.current = 0;
      setHandDetected(true);
      handDetectedRef.current = true;

      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [5, 6], [6, 7], [7, 8],
        [9, 10], [10, 11], [11, 12],
        [13, 14], [14, 15], [15, 16],
        [17, 18], [18, 19], [19, 20],
        [0, 5], [5, 9], [9, 13], [13, 17],
      ];

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.strokeStyle = 'rgba(9, 32, 63, 0.45)';
      ctx.lineWidth = 5;
      connections.forEach(([start, end]) => {
        ctx.beginPath();
        ctx.moveTo(
          landmarks[start].x * canvas.width,
          landmarks[start].y * canvas.height
        );
        ctx.lineTo(
          landmarks[end].x * canvas.width,
          landmarks[end].y * canvas.height
        );
        ctx.stroke();
      });

      ctx.strokeStyle = 'rgba(110, 229, 255, 0.95)';
      ctx.lineWidth = 2.6;
      connections.forEach(([start, end]) => {
        ctx.beginPath();
        ctx.moveTo(
          landmarks[start].x * canvas.width,
          landmarks[start].y * canvas.height
        );
        ctx.lineTo(
          landmarks[end].x * canvas.width,
          landmarks[end].y * canvas.height
        );
        ctx.stroke();
      });

      ctx.fillStyle = 'rgba(16, 43, 77, 0.75)';
      landmarks.forEach((landmark) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = 'rgba(187, 246, 255, 0.96)';
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = 'rgba(16, 43, 77, 0.75)';
      });

      const wrist = landmarks[0];
      const middleTip = landmarks[12];
      const indexMcp = landmarks[5];
      const pinkyMcp = landmarks[17];
      ctx.strokeStyle = 'rgba(39, 174, 96, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wrist.x * canvas.width, wrist.y * canvas.height);
      ctx.lineTo(middleTip.x * canvas.width, middleTip.y * canvas.height);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(231, 76, 60, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(indexMcp.x * canvas.width, indexMcp.y * canvas.height);
      ctx.lineTo(pinkyMcp.x * canvas.width, pinkyMcp.y * canvas.height);
      ctx.stroke();

      if (ballCalibratedRef.current) {
        const mmPerPixel = referenceConfigRef.current.diameterMm / guideDiameter;

        const dx = (middleTip.x - wrist.x) * canvas.width;
        const dy = (middleTip.y - wrist.y) * canvas.height;
        const handLengthPixels = Math.sqrt(dx * dx + dy * dy);
        const handLengthInches = ((handLengthPixels * mmPerPixel) / 25.4).toFixed(2);

        const palmDx = (pinkyMcp.x - indexMcp.x) * canvas.width;
        const palmDy = (pinkyMcp.y - indexMcp.y) * canvas.height;
        const palmWidthPixels = Math.sqrt(palmDx * palmDx + palmDy * palmDy);
        const palmWidthInches = ((palmWidthPixels * mmPerPixel) / 25.4).toFixed(2);
        const baseRecommendation = recommendSize(handLengthInches);
        const adjustedRecommendation = adjustSizeForPalmWidth(baseRecommendation, palmWidthInches);

        setMeasurement({
          handLengthPixels: Math.round(handLengthPixels),
          palmWidthPixels: Math.round(palmWidthPixels),
          handLengthInches,
          palmWidthInches,
        });
        setRecommendedSize(adjustedRecommendation);
      }
    } else {
      missedFramesRef.current += 1;
      if (missedFramesRef.current >= HAND_MISS_FRAME_THRESHOLD) {
        setHandDetected(false);
        handDetectedRef.current = false;
      }
    }
  }, []);

  const startCapture = async () => {
    setError('');
    setSuccess('');
    setMeasurement(null);
    setRecommendedSize(null);
    setBallCalibrated(false);
    setHandDetected(false);
    ballCalibratedRef.current = false;
    handDetectedRef.current = false;

    try {
      const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
      let stream;

      if (isMobileDevice) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
        } catch (mobileCameraError) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
          });
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
        });
      }

      streamRef.current = stream;
      setStage('measuring');
    } catch (err) {
      setError('📷 Camera access denied. Please enable camera permissions.');
    }
  };

  useEffect(() => {
    if (stage !== 'measuring' || !streamRef.current || !videoRef.current) {
      return undefined;
    }

    const video = videoRef.current;
    let cancelled = false;
    video.srcObject = streamRef.current;

    const startMediaPipe = () => {
      const interval = setInterval(() => {
        if (cancelled || !window.Hands || !window.Camera || !videoRef.current) return;
        clearInterval(interval);

        const hands = new window.Hands({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1633559619/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });

        hands.onResults(onHandsResults);

        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            await hands.send({ image: videoRef.current });
          },
          width: videoRef.current.videoWidth || 1280,
          height: videoRef.current.videoHeight || 720,
        });

        camera.start();
      }, 100);
    };

    const handleVideoReady = async () => {
      try {
        await video.play();
      } catch (playErr) {
        setError('📷 Camera started, but the video preview could not play.');
        return;
      }

      if (canvasRef.current) {
        canvasRef.current.width = video.videoWidth || 1280;
        canvasRef.current.height = video.videoHeight || 720;
      }

      startMediaPipe();
    };

    if (video.readyState >= 1) {
      handleVideoReady();
    } else {
      video.onloadedmetadata = handleVideoReady;
    }

    return () => {
      cancelled = true;
      video.onloadedmetadata = null;
    };
  }, [stage, onHandsResults]);

  const handleCalibrateGolfBall = () => {
    if (!handDetectedRef.current) {
      setError('❌ Hand not detected. Position your hand in the guide.');
      return;
    }

    ballCalibratedRef.current = true;
    setBallCalibrated(true);
    setError('');
  };

  const handleCapture = () => {
    if (!measurement) {
      setError('❌ No measurement yet. Try again.');
      return;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }

    streamRef.current = null;
    setStage('result');
  };

  const handleSubmit = async () => {
    if (!gloveSize) {
      setError('❌ Please select your current glove size');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hand_length: parseFloat(measurement.handLengthInches),
          palm_width: parseFloat(measurement.palmWidthInches),
          finger_length: 0,
          glove_size: gloveSize,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setSuccess('✅ Perfect! Your measurement has been saved. Thank you!');
        setTimeout(() => {
          setStage('instruction');
          setMeasurement(null);
          setRecommendedSize(null);
          setBallCalibrated(false);
          ballCalibratedRef.current = false;
          setHandDetected(false);
          handDetectedRef.current = false;
          setGloveSize('');
          setSuccess('');
        }, 3000);
      } else {
        setError('❌ Failed to submit. Please try again.');
      }
    } catch (err) {
      setError('❌ Connection error. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {stage === 'instruction' && (
        <div className="card">
          <div className="header">
            <h1>🏌️ Golf Glove Finder</h1>
            <p>Find your perfect glove size in seconds</p>
          </div>

          <div className="instruction-box">
            <h2>What You'll Need:</h2>
            <div className="checklist">
              <p>✓ One golf ball or coin</p>
              <p>✓ Flat surface (table)</p>
              <p>✓ Good lighting</p>
              <p>✓ Your hand</p>
            </div>
          </div>

          <div className="reference-picker">
            <button
              className={`reference-option ${referenceType === 'golfBall' ? 'reference-option-active' : ''}`}
              onClick={() => handleReferenceChange('golfBall')}
              type="button"
            >
              Golf ball
            </button>
            <button
              className={`reference-option ${referenceType === 'coin' ? 'reference-option-active' : ''}`}
              onClick={() => handleReferenceChange('coin')}
              type="button"
            >
              Coin
            </button>
          </div>

          <button className="btn-primary" onClick={startCapture}>
            Start Scanning
          </button>

          <div className="info-box">
            <p style={{ fontSize: '12px', color: '#718096' }}>
              💡 <strong>How it works:</strong> Place your hand with a golf ball on a table.
              The app uses your selected reference object as the scale reference, then measures your hand
              length and palm width to recommend the best Holen glove size.
            </p>
          </div>
        </div>
      )}

      {stage === 'measuring' && (
        <div className="card">
          <div className="header">
            <h1>📱 Position Your Hand</h1>
            <p>Place hand flat on table with {selectedReference.guideLabel}</p>
          </div>

          <div className="measuring-layout">
            <div className="camera-column">
              <div className="camera-container">
                <video ref={videoRef} autoPlay muted playsInline />
                <div className="guide-overlay" aria-hidden="true">
                  <div className="guide-ring" />
                  <div className="guide-copy">
                    <p>Align {selectedReference.guideLabel} inside the circle</p>
                    <span>{selectedReference.diameterMm} mm reference</span>
                  </div>
                </div>
                <canvas ref={canvasRef} className="canvas-overlay" />
              </div>

              <div className="status">
                {!ballCalibrated && <p>👉 Align {selectedReference.guideLabel} with circle, then tap calibrate</p>}
                {ballCalibrated && handDetected && <p>✅ Hand detected! Measuring...</p>}
                {ballCalibrated && !handDetected && <p>❌ Hand not detected. Reposition.</p>}
              </div>

              <div className="button-group">
                {!ballCalibrated && (
                  <button className="btn-secondary btn-calibrate" onClick={handleCalibrateGolfBall}>
                    {selectedReference.label} Aligned
                  </button>
                )}
                {ballCalibrated && measurement && (
                  <button className="btn-primary" onClick={handleCapture}>
                    ✓ Capture
                  </button>
                )}
              </div>

              <div className={`mobile-size-summary ${handDetected ? 'mobile-size-summary-active' : ''}`}>
                <span className="mobile-size-label">Golf size</span>
                <strong>{recommendedSize || (ballCalibrated ? 'Calibrating...' : '—')}</strong>
              </div>

              {error && <div className="error-message">{error}</div>}
            </div>

            <aside className="side-column">
              <div className={`live-feedback ${handDetected ? 'live-feedback-active' : ''}`}>
                <p className="live-feedback-title">
                  {handDetected ? '✅ Hand detected' : 'Waiting for hand'}
                </p>
                <p className="live-feedback-copy">
                  {handDetected
                    ? 'Keep your hand flat for live sizing.'
                    : 'Show your hand to get green confirmation.'}
                </p>
              </div>

              <div className={`measurement-display size-card ${recommendedSize ? 'has-size' : ''}`}>
                <p className="measurement-label">Golf size</p>
                <p className="measurement-value">{recommendedSize || '—'}</p>
                <p className="recommendation">
                  {ballCalibrated
                    ? recommendedSize || 'Calibrating...'
                    : `Calibrate the ${selectedReference.guideLabel} to calculate your size`}
                </p>
              </div>

              {measurement && ballCalibrated && (
                <div className="measurement-display compact-metrics">
                  <p className="measurement-label">Live measurements</p>
                  <div className="measurement-breakdown">
                    <div>
                      <span className="measurement-sub-label">Hand Length</span>
                      <span className="measurement-sub-value">{measurement.handLengthInches}"</span>
                    </div>
                    <div>
                      <span className="measurement-sub-label">Palm Width</span>
                      <span className="measurement-sub-value">{measurement.palmWidthInches}"</span>
                    </div>
                  </div>
                  <div className="measurement-breakdown">
                    <div>
                      <span className="measurement-sub-label">Ball Reference</span>
                      <span className="measurement-sub-value">{selectedReference.diameterMm} mm</span>
                    </div>
                    <div>
                      <span className="measurement-sub-label">Hand Status</span>
                      <span className="measurement-sub-value">{handDetected ? 'Detected' : 'Search'}</span>
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      {stage === 'result' && (
        <div className="card">
          <div className="header">
            <h1>📏 Your Measurements</h1>
          </div>

          <div className="results-grid">
            <div className="result-box">
              <p className="result-label">Hand Length</p>
              <p className="result-value">{measurement.handLengthInches}"</p>
              <p className="result-unit">(inches)</p>
            </div>

            <div className="result-box">
              <p className="result-label">Palm Width</p>
              <p className="result-value">{measurement.palmWidthInches}"</p>
              <p className="result-unit">(inches)</p>
            </div>

            {recommendedSize && (
              <div className="result-box recommended">
                <p className="result-label">Recommended Size</p>
                <p className="result-value recommendation-text">{recommendedSize}</p>
              </div>
            )}
          </div>

          <div className="form-section">
            <label htmlFor="glove-size">What size glove do you currently wear?</label>
            <select
              id="glove-size"
              value={gloveSize}
              onChange={(e) => setGloveSize(e.target.value)}
              className="select-input"
            >
              <option value="">Select your size...</option>
              <option value="Small">Small (6.5 - 7.0")</option>
              <option value="Medium">Medium (7.0 - 7.25")</option>
              <option value="Med/Large">Med/Large (7.25 - 7.5")</option>
              <option value="Large">Large (7.5 - 8.0")</option>
              <option value="X-Large">X-Large (8.0 - 8.25")</option>
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Submitting...' : '✓ Submit'}
          </button>

          <p style={{ fontSize: '12px', color: '#718096', textAlign: 'center', marginTop: '16px' }}>
            Your measurement helps us improve recommendations for all golfers.
          </p>
        </div>
      )}
    </div>
  );
}