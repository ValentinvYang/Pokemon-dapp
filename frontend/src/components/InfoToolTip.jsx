import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export function InfoTooltip({ message }) {
  const [show, setShow] = useState(false);
  const buttonRef = useRef(null);
  const tooltipRef = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (show && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        x: rect.left - 256, // 256px = w-64, 16px extra spacing
        y: rect.top + rect.height + 4,
      });
    }
  }, [show]);

  // Close tooltip on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target) &&
        !buttonRef.current.contains(e.target)
      ) {
        setShow(false);
      }
    };

    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [show]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="text-gray-500 hover:text-blue-600 focus:outline-none"
        onClick={() => setShow((prev) => !prev)}
        title="Click for info"
      >
        ℹ️
      </button>
      {show &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[9999] w-64 p-2 bg-white border border-gray-300 rounded shadow text-sm"
            style={{
              left: `${coords.x}px`,
              top: `${coords.y}px`,
            }}
          >
            {message}
          </div>,
          document.body
        )}
    </>
  );
}
