import React, { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import '../App.css';

export default function QRDownloader() {
  const [url, setUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const canvasRef = useRef(null);

  const handleGenerate = (e) => {
    e.preventDefault();
    setUrl(inputUrl);
  };

  const downloadQRCode = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;

    const imageUri = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = imageUri;
    downloadLink.download = 'qrcode.png';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="qr-container">
      <form onSubmit={handleGenerate} className="qr-form">
        <input
          type="url"
          placeholder="Type or paste your link here..."
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          required
          className="qr-input"
        />
        <button type="submit" className="qr-btn">Generate QR</button>
      </form>

      {url && (
        <div className="qr-output">
          <div ref={canvasRef} className="qr-preview-box">
            <QRCodeCanvas
              value={url}
              size={256}
              bgColor="transparent"
              fgColor="#c86161"
              level="H"
              includeMargin={false}
            />
          </div>
          <button onClick={downloadQRCode} className="qr-download-btn">
            Download Transparent PNG
          </button>
        </div>
      )}
    </div>
  );
}