import React from 'react';

const ChatMessage = ({ message }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatMessage = (content) => {
    if (!content) return '';
    
    // Split by double newlines to create paragraphs
    const paragraphs = content.split(/\n\n+/);
    
    return paragraphs.map((paragraph, index) => {
      // Check if it's a list item (starts with -, *, or number)
      const trimmed = paragraph.trim();
      
      if (trimmed.match(/^[-*•]\s/) || trimmed.match(/^\d+\.\s/)) {
        // It's a list - split by newlines and format as list items
        const listItems = trimmed.split(/\n/).map(line => line.trim()).filter(line => line);
        return (
          <ul key={index} className="message-list">
            {listItems.map((item, itemIndex) => {
              // Remove the bullet/number from the item
              const cleanItem = item.replace(/^[-*•]\s/, '').replace(/^\d+\.\s/, '');
              return <li key={itemIndex}>{cleanItem}</li>;
            })}
          </ul>
        );
      }
      
      // Check if it looks like a heading (short line, might be bold)
      if (trimmed.length < 100 && !trimmed.includes('.') && trimmed.length > 0) {
        return <h3 key={index} className="message-heading">{trimmed}</h3>;
      }
      
      // Regular paragraph - split by single newlines and add breaks
      const lines = trimmed.split(/\n/);
      return (
        <p key={index} className="message-paragraph">
          {lines.map((line, lineIndex) => (
            <React.Fragment key={lineIndex}>
              {line}
              {lineIndex < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
    });
  };

  return (
    <div className={`message ${message.role}`}>
      <div className="message-content">
        {formatMessage(message.content)}
      </div>
      <div className="message-time">
        {formatTime(message.timestamp)}
      </div>
    </div>
  );
};

export default ChatMessage;
