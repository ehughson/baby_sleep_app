from database import get_db_connection

class Conversation:
    def __init__(self, id=None, created_at=None, title=None, user_id=None, last_message_at=None):
        self.id = id
        self.created_at = created_at
        self.title = title
        self.user_id = user_id
        self.last_message_at = last_message_at
    
    @staticmethod
    def create(user_id=None, title=None):
        """Create a new conversation"""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO conversations (user_id, title)
            VALUES (?, ?)
        ''', (user_id, title))
        conversation_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return Conversation(id=conversation_id, user_id=user_id, title=title)
    
    @staticmethod
    def get_all(user_id=None):
        """Get all conversations"""
        conn = get_db_connection()
        cursor = conn.cursor()
        if user_id is not None:
            cursor.execute('''
                SELECT * FROM conversations 
                WHERE user_id = ?
                ORDER BY COALESCE(last_message_at, created_at) DESC, id DESC
            ''', (user_id,))
        else:
            cursor.execute('SELECT * FROM conversations ORDER BY COALESCE(last_message_at, created_at) DESC, id DESC')
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

    @staticmethod
    def update_title(conversation_id, title):
        if not conversation_id:
            return
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE conversations SET title = ? WHERE id = ?', (title, conversation_id))
        conn.commit()
        conn.close()

    @staticmethod
    def update_user(conversation_id, user_id):
        if not conversation_id or user_id is None:
            return
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE conversations SET user_id = ? WHERE id = ?', (user_id, conversation_id))
        conn.commit()
        conn.close()

    @staticmethod
    def touch(conversation_id):
        if not conversation_id:
            return
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?', (conversation_id,))
        conn.commit()
        conn.close()

    @staticmethod
    def get_titles_for_user(user_id):
        if user_id is None:
            return []
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT title FROM conversations WHERE user_id = ?', (user_id,))
        titles = [row['title'] for row in cursor.fetchall() if row['title']]
        conn.close()
        return titles

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
        if self.conversation_id:
            cursor.execute('UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?', (self.conversation_id,))
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
