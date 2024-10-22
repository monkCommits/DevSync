import React from "react";

export default function Output({ output, isError }) {
  return (
    <div className={`output-text${isError ? "-error" : ""}`}>{output}</div>
  );
}
