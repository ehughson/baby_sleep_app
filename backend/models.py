from database import get_db_connection
from datetime import datetime

class Conversation:
    def __init__(self, id=None, created_at=None):
        self.id = id
        self.created_at = created_at
    
    @staticmethod
    def create():
        """Create a new conversation"""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO conversations DEFAULT VALUES')
        conversation_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return Conversation(id=conversation_id)
    
    @staticmethod
    def get_all():
        """Get all conversations"""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM conversations ORDER BY created_at DESC')
        conversations = cursor.fetchall()
        conn.close()
        return conversations
    
    @staticmethod
    def get_by_id(conversation_id):
        """Get a conversation by ID"""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM conversations WHERE id = ?', (conversation_id,))
        conversation = cursor.fetchone()
        conn.close()
        return conversation

class Message:
    def __init__(self, id=None, conversation_id=None, role=None, content=None, timestamp=None):
        self.id = id
        self.conversation_id = conversation_id
        self.role = role
        self.content = content
        self.timestamp = timestamp
    
    def save(self):
        """Save a message to the database"""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO messages (conversation_id, role, content)
            VALUES (?, ?, ?)
        ''', (self.conversation_id, self.role, self.content))
        self.id = cursor.lastrowid
        conn.commit()
        conn.close()
        return self
    
    @staticmethod
    def get_by_conversation(conversation_id):
        """Get all messages for a conversation"""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM messages 
            WHERE conversation_id = ? 
            ORDER BY timestamp ASC
        ''', (conversation_id,))
        messages = cursor.fetchall()
        conn.close()
        return messages
