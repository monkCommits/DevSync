import React from "react";

export default function Output({ output, isError }) {
  // Split the string by newline characters (\n) into an array of lines
  const outputLines = output ? output.split("\n") : [];

  return (
    <div className="output-container">
      <div className={`output-text${isError ? "-error" : ""}`}>
        {outputLines.map((line, index) => (
          <div key={index}>{line}</div> // Use <div> or <span> to render each line
        ))}
      </div>
    </div>
  );
}
