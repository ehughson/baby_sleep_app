import React from 'react';

const ChatMessage = ({ message }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const sanitizeContent = (text) => {
    if (!text) return '';

    return text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/~~([^~]+)~~/g, '$1')
      .replace(/\*([^*\n]+)\*/g, '$1')
      .replace(/_([^_\n]+)_/g, '$1');
  };

  const renderInline = (text) => {
    if (!text) return null;

    const elements = [];
    const boldRegex = /(\*\*[^*]+\*\*|__[^_]+__)/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        elements.push(text.slice(lastIndex, match.index));
      }

      const segment = match[0];
      const boldText = segment.slice(2, -2);
      elements.push(<strong key={`bold-${key++}`}>{boldText}</strong>);
      lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      elements.push(text.slice(lastIndex));
    }

    return elements.length > 0 ? elements : text;
  };

  const formatMessage = (content) => {
    const sanitized = sanitizeContent(content);
    if (!sanitized.trim()) return null;

    const paragraphs = sanitized.split(/\n\n+/).filter(paragraph => paragraph.trim().length > 0);

    return paragraphs.map((paragraph, index) => {
      const trimmed = paragraph.trim();

      if (trimmed.match(/^[-*•]\s/) || trimmed.match(/^\d+\.\s/)) {
        const listItems = trimmed.split(/\n/).map(line => line.trim()).filter(Boolean);
        return (
          <ul key={index} className="message-list">
            {listItems.map((item, itemIndex) => {
              const cleanItem = item.replace(/^[-*•]\s/, '').replace(/^\d+\.\s/, '');
              return <li key={itemIndex}>{renderInline(cleanItem)}</li>;
            })}
          </ul>
        );
      }

      const lines = trimmed.split(/\n/);
      return (
        <p key={index} className="message-paragraph">
          {lines.map((line, lineIndex) => (
            <React.Fragment key={lineIndex}>
              {renderInline(line)}
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
