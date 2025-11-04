from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
import secrets
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from database import init_db
from models import Conversation, Message

# Load environment variables
load_dotenv()

app = Flask(__name__)
# CORS configuration - allows all origins in production
# For production, you might want to restrict this to your frontend domain
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})

# Initialize database
init_db()

# Load API key from environment variable
gemini_api_key = os.getenv('GEMINI_API_KEY')

def get_gemini_response(message, conversation_history=None):
    """Get response from Gemini API with sleep training specialization"""
    if not gemini_api_key:
        raise ValueError("Gemini API key not configured. Please set GEMINI_API_KEY environment variable.")
    
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel('gemini-pro-latest')
    
    # Sleep training specialist prompt
    sleep_specialist_prompt = """You are a gentle sleep training specialist and baby sleep consultant with expertise in helping exhausted parents establish healthy sleep habits for their children. Your approach is:

1. **Gentle and No-Cry Methods First**: Always prioritize gentle, attachment-focused sleep training methods that minimize crying and stress for both baby and parents.

2. **Age-Appropriate Advice**: Consider the child's age, developmental stage, and individual needs when providing recommendations.

3. **Parent Support**: Acknowledge the challenges parents face and provide emotional support alongside practical advice.

4. **Evidence-Based**: Base recommendations on current sleep science and pediatric sleep research.

5. **Comprehensive Approach**: Address bedtime routines, nap schedules, night wakings, sleep associations, and environmental factors.

Key areas of expertise:
- Gentle sleep training methods (Fading, Chair Method, Pick Up/Put Down)
- No-cry sleep solutions and gradual approaches
- Age-appropriate sleep schedules and expectations
- Bedtime routine optimization
- Nap transition guidance
- Sleep regression support
- Sleep environment setup
- Feeding and sleep relationships
- Sleep training for different temperaments

Always be encouraging, understanding, and provide step-by-step guidance. Remember that every family and child is unique, so offer multiple options when possible.

"""
    
    # Prepare conversation context
    if conversation_history:
        # Format conversation history for Gemini
        context = sleep_specialist_prompt + "\n\nPrevious conversation:\n"
        for msg in conversation_history:
            role = "Parent" if msg['role'] == 'user' else "Sleep Specialist"
            context += f"{role}: {msg['content']}\n"
        context += f"Parent: {message}\n\nSleep Specialist:"
        
        response = model.generate_content(context)
    else:
        full_prompt = sleep_specialist_prompt + f"\nParent's question: {message}\n\nSleep Specialist:"
        response = model.generate_content(full_prompt)
    
    return response.text

@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    """Get all conversations"""
    conversations = Conversation.get_all()
    return jsonify([dict(conv) for conv in conversations])

@app.route('/api/conversations', methods=['POST'])
def create_conversation():
    """Create a new conversation"""
    conversation = Conversation.create()
    return jsonify({
        'id': conversation.id,
        'created_at': conversation.created_at
    })

@app.route('/api/conversations/<int:conversation_id>/messages', methods=['GET'])
def get_messages(conversation_id):
    """Get messages for a specific conversation"""
    messages = Message.get_by_conversation(conversation_id)
    return jsonify([dict(msg) for msg in messages])

@app.route('/api/chat', methods=['POST'])
def chat():
    """Send a message and get response"""
    try:
        data = request.get_json()
        message = data.get('message')
        conversation_id = data.get('conversation_id')
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Save user message
        user_message = Message(
            conversation_id=conversation_id,
            role='user',
            content=message
        )
        user_message.save()
        
        # Get conversation history
        conversation_history = None
        if conversation_id:
            messages = Message.get_by_conversation(conversation_id)
            conversation_history = [dict(msg) for msg in messages[:-1]]  # Exclude the message we just added
        
        # Get response from Gemini
        response_text = get_gemini_response(message, conversation_history)
        
        # Save assistant response
        assistant_message = Message(
            conversation_id=conversation_id,
            role='assistant',
            content=response_text
        )
        assistant_message.save()
        
        return jsonify({
            'response': response_text,
            'conversation_id': conversation_id
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to get response from AI: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'api_key_configured': bool(gemini_api_key),
        'service': 'Baby Sleep Helper',
        'specialization': 'Gentle sleep training and no-cry sleep solutions'
    })

# Forum endpoints
@app.route('/api/forum/channels', methods=['GET'])
def get_channels():
    """Get all forum channels"""
    from database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM forum_channels ORDER BY name ASC')
    channels = cursor.fetchall()
    conn.close()
    return jsonify([dict(channel) for channel in channels])

@app.route('/api/forum/channels/<int:channel_id>/posts', methods=['GET'])
def get_posts(channel_id):
    """Get all posts for a channel"""
    from database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM forum_posts 
        WHERE channel_id = ? 
        ORDER BY timestamp ASC
    ''', (channel_id,))
    posts = cursor.fetchall()
    conn.close()
    return jsonify([dict(post) for post in posts])

@app.route('/api/forum/posts', methods=['POST'])
def create_post():
    """Create a new forum post"""
    from database import get_db_connection
    try:
        data = request.get_json()
        channel_id = data.get('channel_id')
        author_name = data.get('author_name')
        content = data.get('content')
        
        if not channel_id or not author_name or not content:
            return jsonify({'error': 'Missing required fields'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Ensure user exists (create if not)
        cursor.execute('SELECT * FROM forum_users WHERE username = ?', (author_name,))
        user = cursor.fetchone()
        if not user:
            cursor.execute('''
                INSERT INTO forum_users (username, display_name)
                VALUES (?, ?)
            ''', (author_name, author_name))
        else:
            # Update last_seen
            cursor.execute('''
                UPDATE forum_users SET last_seen = CURRENT_TIMESTAMP
                WHERE username = ?
            ''', (author_name,))
        
        # Create the post
        cursor.execute('''
            INSERT INTO forum_posts (channel_id, author_name, content)
            VALUES (?, ?, ?)
        ''', (channel_id, author_name, content))
        post_id = cursor.lastrowid
        conn.commit()
        
        # Get the created post
        cursor.execute('SELECT * FROM forum_posts WHERE id = ?', (post_id,))
        post = cursor.fetchone()
        conn.close()
        
        return jsonify(dict(post))
    except Exception as e:
        return jsonify({'error': f'Failed to create post: {str(e)}'}), 500

@app.route('/api/forum/channels', methods=['POST'])
def create_channel():
    """Create a new forum channel"""
    from database import get_db_connection
    try:
        data = request.get_json()
        name = data.get('name')
        icon = data.get('icon', '💬')
        description = data.get('description', '')
        
        if not name:
            return jsonify({'error': 'Channel name is required'}), 400
        
        # Validate name (no spaces, lowercase, alphanumeric and hyphens)
        import re
        if not re.match(r'^[a-z0-9-]+$', name.lower()):
            return jsonify({'error': 'Channel name can only contain lowercase letters, numbers, and hyphens'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if channel already exists
        cursor.execute('SELECT * FROM forum_channels WHERE LOWER(name) = LOWER(?)', (name,))
        existing = cursor.fetchone()
        if existing:
            conn.close()
            return jsonify({'error': 'Channel name already exists'}), 400
        
        cursor.execute('''
            INSERT INTO forum_channels (name, icon, description)
            VALUES (?, ?, ?)
        ''', (name.lower(), icon, description))
        channel_id = cursor.lastrowid
        conn.commit()
        
        # Get the created channel
        cursor.execute('SELECT * FROM forum_channels WHERE id = ?', (channel_id,))
        channel = cursor.fetchone()
        conn.close()
        
        return jsonify(dict(channel))
    except Exception as e:
        return jsonify({'error': f'Failed to create channel: {str(e)}'}), 500

# Friends endpoints
@app.route('/api/forum/users/<username>', methods=['POST'])
def create_or_get_user(username):
    """Create or get a user"""
    from database import get_db_connection
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute('SELECT * FROM forum_users WHERE username = ?', (username,))
        user = cursor.fetchone()
        
        if not user:
            # Create new user
            cursor.execute('''
                INSERT INTO forum_users (username, display_name)
                VALUES (?, ?)
            ''', (username, username))
            user_id = cursor.lastrowid
            conn.commit()
            cursor.execute('SELECT * FROM forum_users WHERE id = ?', (user_id,))
            user = cursor.fetchone()
        else:
            # Update last_seen
            cursor.execute('''
                UPDATE forum_users SET last_seen = CURRENT_TIMESTAMP
                WHERE username = ?
            ''', (username,))
            conn.commit()
            cursor.execute('SELECT * FROM forum_users WHERE username = ?', (username,))
            user = cursor.fetchone()
        
        conn.close()
        return jsonify(dict(user))
    except Exception as e:
        return jsonify({'error': f'Failed to create/get user: {str(e)}'}), 500

@app.route('/api/forum/friends/<username>', methods=['GET'])
def get_friends(username):
    """Get all friends for a user"""
    from database import get_db_connection
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get accepted friendships
        cursor.execute('''
            SELECT 
                CASE 
                    WHEN user1_name = ? THEN user2_name
                    ELSE user1_name
                END as friend_name,
                f.created_at,
                u.display_name
            FROM friendships f
            LEFT JOIN forum_users u ON (
                CASE 
                    WHEN f.user1_name = ? THEN u.username = f.user2_name
                    ELSE u.username = f.user1_name
                END
            )
            WHERE (user1_name = ? OR user2_name = ?)
            AND status = 'accepted'
            ORDER BY f.created_at DESC
        ''', (username, username, username, username))
        
        friends = cursor.fetchall()
        conn.close()
        return jsonify([dict(friend) for friend in friends])
    except Exception as e:
        return jsonify({'error': f'Failed to get friends: {str(e)}'}), 500

@app.route('/api/forum/friend-requests', methods=['GET'])
def get_friend_requests():
    """Get pending friend requests for a user"""
    from database import get_db_connection
    try:
        username = request.args.get('username')
        if not username:
            return jsonify({'error': 'Username is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get pending requests where user is the recipient
        cursor.execute('''
            SELECT 
                user1_name as from_user,
                created_at
            FROM friendships
            WHERE user2_name = ? AND status = 'pending'
            ORDER BY created_at DESC
        ''', (username,))
        
        requests = cursor.fetchall()
        conn.close()
        return jsonify([dict(req) for req in requests])
    except Exception as e:
        return jsonify({'error': f'Failed to get friend requests: {str(e)}'}), 500

@app.route('/api/forum/friends', methods=['POST'])
def send_friend_request():
    """Send a friend request"""
    from database import get_db_connection
    try:
        data = request.get_json()
        from_user = data.get('from_user')
        to_user = data.get('to_user')
        
        if not from_user or not to_user:
            return jsonify({'error': 'Both users are required'}), 400
        
        if from_user.lower() == to_user.lower():
            return jsonify({'error': 'Cannot add yourself as a friend'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if friendship already exists
        cursor.execute('''
            SELECT * FROM friendships 
            WHERE (user1_name = ? AND user2_name = ?) 
            OR (user1_name = ? AND user2_name = ?)
        ''', (from_user, to_user, to_user, from_user))
        existing = cursor.fetchone()
        
        if existing:
            if existing['status'] == 'accepted':
                conn.close()
                return jsonify({'error': 'Already friends'}), 400
            elif existing['status'] == 'pending':
                conn.close()
                return jsonify({'error': 'Friend request already sent'}), 400
        
        # Create friend request
        cursor.execute('''
            INSERT INTO friendships (user1_name, user2_name, status)
            VALUES (?, ?, 'pending')
        ''', (from_user, to_user))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Friend request sent'})
    except Exception as e:
        return jsonify({'error': f'Failed to send friend request: {str(e)}'}), 500

@app.route('/api/forum/friends/accept', methods=['POST'])
def accept_friend_request():
    """Accept a friend request"""
    from database import get_db_connection
    try:
        data = request.get_json()
        from_user = data.get('from_user')
        to_user = data.get('to_user')
        
        if not from_user or not to_user:
            return jsonify({'error': 'Both users are required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update friendship status
        cursor.execute('''
            UPDATE friendships
            SET status = 'accepted'
            WHERE user1_name = ? AND user2_name = ? AND status = 'pending'
        ''', (from_user, to_user))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Friend request not found'}), 404
        
        conn.commit()
        conn.close()
        return jsonify({'message': 'Friend request accepted'})
    except Exception as e:
        return jsonify({'error': f'Failed to accept friend request: {str(e)}'}), 500

@app.route('/api/forum/users/search', methods=['GET'])
def search_users():
    """Search for users by username"""
    from database import get_db_connection
    try:
        query = request.args.get('q', '').strip()
        current_user = request.args.get('current_user', '')
        
        if not query:
            return jsonify([])
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT username, display_name, last_seen
            FROM forum_users
            WHERE username LIKE ? AND username != ?
            ORDER BY username ASC
            LIMIT 20
        ''', (f'%{query}%', current_user))
        
        users = cursor.fetchall()
        conn.close()
        return jsonify([dict(user) for user in users])
    except Exception as e:
        return jsonify({'error': f'Failed to search users: {str(e)}'}), 500

# Authentication endpoints
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    """Create a new user account"""
    from database import get_db_connection
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        if len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if username already exists
        cursor.execute('SELECT * FROM auth_users WHERE username = ?', (username,))
        existing = cursor.fetchone()
        if existing:
            conn.close()
            return jsonify({'error': 'Username already exists'}), 400
        
        # Hash password
        password_hash = generate_password_hash(password)
        
        # Create user
        cursor.execute('''
            INSERT INTO auth_users (username, email, password_hash)
            VALUES (?, ?, ?)
        ''', (username, email, password_hash))
        user_id = cursor.lastrowid
        
        # Create forum user entry
        cursor.execute('''
            INSERT OR IGNORE INTO forum_users (username, display_name)
            VALUES (?, ?)
        ''', (username, username))
        
        # Create session
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.now() + timedelta(days=30)
        
        cursor.execute('''
            INSERT INTO sessions (user_id, session_token, expires_at)
            VALUES (?, ?, ?)
        ''', (user_id, session_token, expires_at))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Account created successfully',
            'session_token': session_token,
            'username': username,
            'user_id': user_id
        })
    except Exception as e:
        return jsonify({'error': f'Failed to create account: {str(e)}'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login and create session"""
    from database import get_db_connection
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user
        cursor.execute('SELECT * FROM auth_users WHERE username = ?', (username,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Check password
        if not check_password_hash(user['password_hash'], password):
            conn.close()
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Create session
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.now() + timedelta(days=30)
        
        cursor.execute('''
            INSERT INTO sessions (user_id, session_token, expires_at)
            VALUES (?, ?, ?)
        ''', (user['id'], session_token, expires_at))
        
        # Update forum user last_seen
        cursor.execute('''
            UPDATE forum_users SET last_seen = CURRENT_TIMESTAMP
            WHERE username = ?
        ''', (username,))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Login successful',
            'session_token': session_token,
            'username': username,
            'user_id': user['id']
        })
    except Exception as e:
        return jsonify({'error': f'Failed to login: {str(e)}'}), 500

@app.route('/api/auth/session', methods=['GET'])
def check_session():
    """Check if session is valid"""
    from database import get_db_connection
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not session_token:
            return jsonify({'authenticated': False}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find session
        cursor.execute('''
            SELECT s.*, u.username, u.id as user_id
            FROM sessions s
            JOIN auth_users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP
        ''', (session_token,))
        session = cursor.fetchone()
        
        if not session:
            conn.close()
            return jsonify({'authenticated': False}), 401
        
        conn.close()
        return jsonify({
            'authenticated': True,
            'username': session['username'],
            'user_id': session['user_id']
        })
    except Exception as e:
        return jsonify({'authenticated': False, 'error': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Logout and invalidate session"""
    from database import get_db_connection
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if session_token:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('DELETE FROM sessions WHERE session_token = ?', (session_token,))
            conn.commit()
            conn.close()
        
        return jsonify({'message': 'Logged out successfully'})
    except Exception as e:
        return jsonify({'error': f'Failed to logout: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(debug=debug, host='0.0.0.0', port=port)
