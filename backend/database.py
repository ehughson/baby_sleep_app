import sqlite3
import os
from datetime import datetime

# Use persistent storage path if available (Railway volumes), otherwise use current directory
# Railway volumes are mounted at /data by default
if os.path.exists('/data'):
    DATABASE_PATH = '/data/chatbot.db'
    # Ensure /data directory exists and is writable
    os.makedirs('/data', exist_ok=True)
else:
    # Fallback to current directory for local development
    DATABASE_PATH = 'chatbot.db'

def init_db():
    """Initialize the database with required tables"""
    conn = sqlite3.connect(DATABASE_PATH, timeout=30, check_same_thread=False)
    conn.execute('PRAGMA journal_mode=WAL;')
    conn.execute('PRAGMA busy_timeout = 30000;')
    conn.execute('PRAGMA foreign_keys = ON;')
    cursor = conn.cursor()
    
    # Create conversations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES auth_users (id)
        )
    ''')
    
    # Ensure new columns exist on older databases
    cursor.execute("PRAGMA table_info(conversations)")
    conversation_columns = {row[1] for row in cursor.fetchall()}
    if 'user_id' not in conversation_columns:
        try:
            cursor.execute('ALTER TABLE conversations ADD COLUMN user_id INTEGER')
        except sqlite3.OperationalError:
            pass
    if 'title' not in conversation_columns:
        try:
            cursor.execute('ALTER TABLE conversations ADD COLUMN title TEXT')
        except sqlite3.OperationalError:
            pass
    if 'last_message_at' not in conversation_columns:
        try:
            cursor.execute('ALTER TABLE conversations ADD COLUMN last_message_at TIMESTAMP')
            cursor.execute('UPDATE conversations SET last_message_at = created_at WHERE last_message_at IS NULL')
        except sqlite3.OperationalError:
            pass
    
    # Create messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations (id)
        )
    ''')
    
    # Create forum channels table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS forum_channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            icon TEXT,
            description TEXT,
            is_private INTEGER DEFAULT 0,
            owner_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create channel members table (for private channels and invites)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS channel_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            role TEXT DEFAULT 'member',
            invited_by TEXT,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (channel_id) REFERENCES forum_channels (id),
            UNIQUE(channel_id, username)
        )
    ''')

    # Create channel opt-out table (tracks users who leave/hide channels)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS channel_opt_out (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(channel_id, username),
            FOREIGN KEY (channel_id) REFERENCES forum_channels (id) ON DELETE CASCADE
        )
    ''')
    
    # Create channel invites table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS channel_invites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id INTEGER NOT NULL,
            invited_by TEXT NOT NULL,
            invitee_username TEXT,
            invite_token TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMP,
            status TEXT DEFAULT 'pending_recipient',
            requires_owner_approval INTEGER DEFAULT 0,
            owner_approved_at TIMESTAMP,
            owner_approved_by TEXT,
            responded_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (channel_id) REFERENCES forum_channels (id)
        )
    ''')
    # Ensure new columns exist for older databases
    cursor.execute('PRAGMA table_info(channel_invites)')
    invite_columns = {row[1] for row in cursor.fetchall()}
    if 'invitee_username' not in invite_columns:
        try:
            cursor.execute('ALTER TABLE channel_invites ADD COLUMN invitee_username TEXT')
        except sqlite3.OperationalError:
            pass
    if 'status' not in invite_columns:
        try:
            cursor.execute("ALTER TABLE channel_invites ADD COLUMN status TEXT DEFAULT 'pending_recipient'")
        except sqlite3.OperationalError:
            pass
    if 'requires_owner_approval' not in invite_columns:
        try:
            cursor.execute('ALTER TABLE channel_invites ADD COLUMN requires_owner_approval INTEGER DEFAULT 0')
        except sqlite3.OperationalError:
            pass
    if 'owner_approved_at' not in invite_columns:
        try:
            cursor.execute('ALTER TABLE channel_invites ADD COLUMN owner_approved_at TIMESTAMP')
        except sqlite3.OperationalError:
            pass
    if 'owner_approved_by' not in invite_columns:
        try:
            cursor.execute('ALTER TABLE channel_invites ADD COLUMN owner_approved_by TEXT')
        except sqlite3.OperationalError:
            pass
    if 'responded_at' not in invite_columns:
        try:
            cursor.execute('ALTER TABLE channel_invites ADD COLUMN responded_at TIMESTAMP')
        except sqlite3.OperationalError:
            pass

    # Backfill missing values
    cursor.execute("""
        UPDATE channel_invites
        SET invitee_username = invited_by
        WHERE invitee_username IS NULL
    """)
    cursor.execute("""
        UPDATE channel_invites
        SET status = COALESCE(status, 'accepted')
    """)

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_channel_invites_invitee
        ON channel_invites(invitee_username, status)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_channel_invites_owner
        ON channel_invites(channel_id, status)
    ''')
    
    # Create forum posts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS forum_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id INTEGER NOT NULL,
            author_name TEXT NOT NULL,
            content TEXT NOT NULL,
            file_path TEXT,
            file_type TEXT,
            file_name TEXT,
            parent_post_id INTEGER,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (channel_id) REFERENCES forum_channels (id),
            FOREIGN KEY (parent_post_id) REFERENCES forum_posts (id)
        )
    ''')
    
    # Create post reactions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS post_reactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            emoji TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES forum_posts (id) ON DELETE CASCADE,
            UNIQUE(post_id, username, emoji)
        )
    ''')

    # Create channel post notifications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS channel_post_notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id INTEGER NOT NULL,
            post_id INTEGER NOT NULL,
            recipient_username TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_read INTEGER DEFAULT 0,
            read_at TIMESTAMP,
            FOREIGN KEY (channel_id) REFERENCES forum_channels (id) ON DELETE CASCADE,
            FOREIGN KEY (post_id) REFERENCES forum_posts (id) ON DELETE CASCADE,
            UNIQUE(post_id, recipient_username)
        )
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_channel_post_notifications_recipient
        ON channel_post_notifications(recipient_username, is_read, created_at DESC)
    ''')
    
    # Create message reactions table (for direct messages)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS message_reactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            emoji TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (message_id) REFERENCES direct_messages (id) ON DELETE CASCADE,
            UNIQUE(message_id, username, emoji)
        )
    ''')
    
    # Create users table (for friends feature)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS forum_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            display_name TEXT,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create friendships table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS friendships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user1_name TEXT NOT NULL,
            user2_name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user1_name, user2_name),
            CHECK(status IN ('pending', 'accepted', 'blocked'))
        )
    ''')
    
    # Create authenticated users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS auth_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            first_name TEXT,
            last_name TEXT,
            email TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            profile_picture TEXT,
            bio TEXT,
            reset_token TEXT,
            reset_token_expires TIMESTAMP,
            is_active INTEGER DEFAULT 1,
            deactivated_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Add is_active and deactivated_at columns to existing tables if they don't exist
    try:
        cursor.execute('ALTER TABLE auth_users ADD COLUMN is_active INTEGER DEFAULT 1')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        cursor.execute('ALTER TABLE auth_users ADD COLUMN deactivated_at TIMESTAMP')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    # Create sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_token TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES auth_users (id)
        )
    ''')
    
    # Create direct messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS direct_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_name TEXT NOT NULL,
            receiver_name TEXT NOT NULL,
            content TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create baby profiles table (supports multiple babies per user)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS baby_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT,
            birth_date DATE,
            age_months INTEGER,
            sleep_issues TEXT,
            current_schedule TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE CASCADE
        )
    ''')
    
    # Create sleep goals table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sleep_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            goal_1 TEXT,
            goal_2 TEXT,
            goal_3 TEXT,
            goal_4 TEXT,
            goal_5 TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE CASCADE,
            UNIQUE(user_id)
        )
    ''')
    
    # Create sleep factors table (user-declared factors influencing sleep)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sleep_factors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date DATE NOT NULL,
            factor TEXT NOT NULL,
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, date, factor),
            FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE CASCADE
        )
    ''')
    
    # Create index for faster message queries
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_dm_conversation 
        ON direct_messages(sender_name, receiver_name, created_at)
    ''')
    
    # Insert default channels if they don't exist
    default_channels = [
        ('general', '💬', 'General sleep training discussions'),
        ('night-wakings', '🌙', 'Dealing with night wakings'),
        ('bedtime-routines', '🛌', 'Bedtime routine ideas'),
        ('nap-schedules', '😴', 'Nap schedule discussions'),
        ('gentle-methods', '💤', 'Gentle sleep training methods'),
        ('support', '💙', 'Support and encouragement')
    ]
    
    for name, icon, description in default_channels:
        cursor.execute('''
            INSERT OR IGNORE INTO forum_channels (name, icon, description)
            VALUES (?, ?, ?)
        ''', (name, icon, description))
    
    conn.commit()
    conn.close()

def get_db_connection():
    """Get a database connection"""
    conn = sqlite3.connect(DATABASE_PATH, timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON;')
    conn.execute('PRAGMA busy_timeout = 30000;')
    conn.execute('PRAGMA journal_mode=WAL;')
    return conn
