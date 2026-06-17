import type { ReactNode } from 'react';

interface PixelDeviceFrameProps {
  children: ReactNode;
}

export function PixelDeviceFrame({ children }: PixelDeviceFrameProps) {
  return (
    <div className="device-stage">
      <div className="pixel-device">
        <span aria-hidden="true" className="device-button device-button-power" />
        <span aria-hidden="true" className="device-button device-button-volume" />
        <div className="pixel-screen">
          <div aria-hidden="true" className="android-status-bar">
            <span className="status-time">9:41</span>
            <span className="camera-cutout" />
            <div className="status-icons">
              <span className="signal-icon">
                <i />
                <i />
                <i />
                <i />
              </span>
              <span className="wifi-icon" />
              <span className="battery-icon">
                <i />
              </span>
            </div>
          </div>
          <div className="device-app-viewport">{children}</div>
          <div aria-hidden="true" className="android-navigation-bar">
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}
