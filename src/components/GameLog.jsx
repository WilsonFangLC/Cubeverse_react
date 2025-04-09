import React, { useEffect, useRef } from 'react';

function GameLog({ logEntries }) {
  const logEndRef = useRef(null); // Ref to scroll to bottom

  // Scroll to bottom whenever logEntries change
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logEntries]);

  return (
    <div id="turnLog">
      {logEntries.map((entry, index) => (
        // Use dangerouslySetInnerHTML because original log entries contain HTML spans
        // In a real app, prefer structured data + mapping to elements for security
        <p key={index} dangerouslySetInnerHTML={{ __html: entry }} />
      ))}
      <div ref={logEndRef} /> {/* Invisible element to mark the end */}
    </div>
  );
}

export default GameLog; 