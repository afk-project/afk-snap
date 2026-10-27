import { useEffect, useRef } from "react";

export default function LiveVideo({ stream, className = "", style }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream || null;
    if (stream) videoRef.current.play().catch(() => {});
  }, [stream]);
  return <video ref={videoRef} autoPlay muted playsInline style={style} className={`-scale-x-100 object-cover ${className}`} />;
}
