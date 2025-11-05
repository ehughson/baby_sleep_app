import React from 'react';

const ChatMessage = ({ message }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const stripMarkdown = (text) => {
    if (!text) return '';
    
    // Remove markdown formatting while preserving structure
    let cleaned = text
      // Remove bold markers (but preserve content)
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold**
      .replace(/__([^_]+)__/g, '$1')      // __bold__
      // Remove italic markers (but preserve content)
      .replace(/\*([^*\n]+?)\*/g, '$1')   // *italic* (but not list markers)
      .replace(/_([^_\n]+?)_/g, '$1')     // _italic_ (but not list markers)
      // Remove code blocks (keep content)
      .replace(/```[\s\S]*?```/g, '')     // ```code blocks```
      .replace(/`([^`]+)`/g, '$1')        // `inline code`
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')  // [text](url)
      // Remove header markers but keep the text
      .replace(/^#{1,6}\s+/gm, '')        // # headers
      // Remove strikethrough
      .replace(/~~([^~]+)~~/g, '$1');     // ~~strikethrough~~
    
    // Clean up multiple spaces (but preserve line breaks)
    cleaned = cleaned.replace(/[ \t]+/g, ' ');  // Multiple spaces to single space
    cleaned = cleaned.replace(/[ \t]*\n[ \t]*/g, '\n');  // Clean up around line breaks
    
    return cleaned;
  };

  const formatMessage = (content) => {
    if (!content) return '';
    
    // First strip markdown
    const cleanedContent = stripMarkdown(content);
    
    // Split by double newlines to create paragraphs
    const paragraphs = cleanedContent.split(/\n\n+/);
    
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
