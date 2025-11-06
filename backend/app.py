from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import google.generativeai as genai
import os
import secrets
import uuid
import json
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from database import init_db
from models import Conversation, Message

# Load environment variables
load_dotenv()

# Email configuration
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False
    print("Warning: SendGrid not installed. Email functionality will be disabled.")

def send_welcome_email(email, first_name, username):
    """Send a welcome email to new users"""
    if not SENDGRID_AVAILABLE:
        print(f"Email sending disabled. Would send welcome email to {email}")
        return False
    
    sendgrid_api_key = os.getenv('SENDGRID_API_KEY')
    sendgrid_from_email = os.getenv('SENDGRID_FROM_EMAIL', 'noreply@remi.app')
    
    if not sendgrid_api_key:
        print("Warning: SENDGRID_API_KEY not set. Email sending disabled.")
        return False
    
    try:
        message = Mail(
            from_email=sendgrid_from_email,
            to_emails=email,
            subject='Welcome to REMi! 🌙',
            html_content=f'''
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{
                        font-family: 'Nunito', Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }}
                    .header {{
                        background: #a68cab;
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }}
                    .header h1 {{
                        margin: 0;
                        font-size: 2.5rem;
                    }}
                    .content {{
                        background: #f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                    }}
                    .button {{
                        display: inline-block;
                        background: #a68cab;
                        color: white;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 5px;
                        margin-top: 20px;
                    }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1><span style="color: #fff3d1;">REM</span>i</h1>
                    <p style="margin: 10px 0 0 0;">Shaping sleep, one night at a time</p>
                </div>
                <div class="content">
                    <h2>Welcome, {first_name}! 👋</h2>
                    <p>Thank you for joining REMi! We're so excited to help you on your sleep training journey.</p>
                    <p>Your account has been successfully created with the username: <strong>{username}</strong></p>
                    <p>You can now:</p>
                    <ul>
                        <li>💬 Chat with our AI sleep specialist for personalized advice</li>
                        <li>🏘️ Join the Village community to connect with other parents</li>
                        <li>👥 Add friends and share experiences</li>
                        <li>📝 Get expert guidance on sleep training methods</li>
                    </ul>
                    <p>We're here to support you every step of the way. If you have any questions, don't hesitate to reach out!</p>
                    <p>Sweet dreams! 🌙</p>
                    <p style="margin-top: 30px; color: #666; font-size: 0.9rem;">
                        Best regards,<br>
                        The REMi Team
                    </p>
                </div>
            </body>
            </html>
            '''
        )
        
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        print(f"Welcome email sent to {email}: Status {response.status_code}")
        return True
    except Exception as e:
        print(f"Error sending welcome email to {email}: {str(e)}")
        # Don't fail signup if email fails
        return False

app = Flask(__name__)
# CORS configuration - allows all origins in production
# For production, you might want to restrict this to your frontend domain
CORS(app, resources={r"/api/*": {
    "origins": "*", 
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
    "allow_headers": ["Content-Type", "Authorization"],
    "expose_headers": ["Cache-Control", "X-Accel-Buffering"]
}})

# Initialize database
init_db()

# Load API key from environment variable
gemini_api_key = os.getenv('GEMINI_API_KEY')

def get_gemini_response(message, conversation_history=None, user_context=None, stream=False):
    """Get response from Gemini API with sleep training specialization"""
    if not gemini_api_key:
        raise ValueError("Gemini API key not configured. Please set GEMINI_API_KEY environment variable.")
    
    genai.configure(api_key=gemini_api_key)
    # Use faster model for quicker responses
    # Use gemini-flash-latest (the correct alias for the fastest model)
    model = genai.GenerativeModel('gemini-flash-latest')
    
    # Sleep training specialist prompt
    sleep_specialist_prompt = """You are a gentle sleep training specialist and baby sleep consultant with expertise in helping exhausted parents establish healthy sleep habits for their children. Your approach is:

1. Gentle and No-Cry Methods First: Always prioritize gentle, attachment-focused sleep training methods that minimize crying and stress for both baby and parents.

2. Age-Appropriate Advice: Consider the child's age, developmental stage, and individual needs when providing recommendations.

3. Parent Support: Acknowledge the challenges parents face and provide emotional support alongside practical advice.

4. Evidence-Based: Base recommendations on current sleep science and pediatric sleep research.

5. Comprehensive Approach: Address bedtime routines, nap schedules, night wakings, sleep associations, and environmental factors.

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

IMPORTANT: 
- Respond in plain text only. Do NOT use markdown formatting (no asterisks, bold, italics, code blocks, etc.)
- Keep responses concise and direct to minimize response time
- Use clear, simple language that's easy to read
- Break up long responses with line breaks for readability

Always be encouraging, understanding, and provide step-by-step guidance. Remember that every family and child is unique, so offer multiple options when possible.

"""
    
    # Add user context (baby profiles and sleep goals) to prompt if available
    if user_context:
        context_section = "\n\n=== PARENT AND BABY INFORMATION ===\n"
        
        if user_context.get('baby_profiles') and len(user_context['baby_profiles']) > 0:
            baby_profiles = user_context['baby_profiles']
            if len(baby_profiles) == 1:
                context_section += "Baby Information:\n"
            else:
                context_section += f"Baby Information ({len(baby_profiles)} babies):\n"
            
            for idx, bp in enumerate(baby_profiles, 1):
                if len(baby_profiles) > 1:
                    context_section += f"\nBaby {idx}:\n"
                if bp.get('name'):
                    context_section += f"- Baby's name: {bp['name']}\n"
                if bp.get('age_months'):
                    context_section += f"- Age: {bp['age_months']} months\n"
                elif bp.get('birth_date'):
                    context_section += f"- Birth date: {bp['birth_date']}\n"
                if bp.get('sleep_issues'):
                    context_section += f"- Sleep issues: {bp['sleep_issues']}\n"
                if bp.get('current_schedule'):
                    context_section += f"- Current sleep schedule: {bp['current_schedule']}\n"
                if bp.get('notes'):
                    context_section += f"- Additional notes: {bp['notes']}\n"
            context_section += "\n"
        
        if user_context.get('sleep_goals'):
            sg = user_context['sleep_goals']
            context_section += "Parent's Sleep Goals:\n"
            goals = []
            if sg.get('goal_1'):
                goals.append(f"1. {sg['goal_1']}")
            if sg.get('goal_2'):
                goals.append(f"2. {sg['goal_2']}")
            if sg.get('goal_3'):
                goals.append(f"3. {sg['goal_3']}")
            if sg.get('goal_4'):
                goals.append(f"4. {sg['goal_4']}")
            if sg.get('goal_5'):
                goals.append(f"5. {sg['goal_5']}")
            if goals:
                context_section += "\n".join(goals) + "\n"
            context_section += "\n"
        
        if context_section != "\n\n=== PARENT AND BABY INFORMATION ===\n":
            sleep_specialist_prompt += context_section
            sleep_specialist_prompt += "Use this information to provide personalized, tailored advice that addresses their specific baby and goals.\n\n"
    
    # Prepare conversation context
    if conversation_history:
        # Format conversation history for Gemini
        context = sleep_specialist_prompt + "\n\nPrevious conversation:\n"
        for msg in conversation_history:
            role = "Parent" if msg['role'] == 'user' else "Sleep Specialist"
            context += f"{role}: {msg['content']}\n"
        context += f"Parent: {message}\n\nSleep Specialist:"
        
        if stream:
            response = model.generate_content(context, stream=True)
        else:
            response = model.generate_content(context)
    else:
        full_prompt = sleep_specialist_prompt + f"\nParent's question: {message}\n\nSleep Specialist:"
        if stream:
            response = model.generate_content(full_prompt, stream=True)
        else:
            response = model.generate_content(full_prompt)
    
    if stream:
        return response
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
    """Send a message and get response (streaming)"""
    from database import get_db_connection
    try:
        data = request.get_json()
        message = data.get('message')
        conversation_id = data.get('conversation_id')
        stream = data.get('stream', True)  # Default to streaming
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Get user context (baby profile and sleep goals) if authenticated
        user_context = None
        if session_token:
            try:
                conn = get_db_connection()
                cursor = conn.cursor()
                
                # Find user from session
                cursor.execute('''
                    SELECT u.id
                    FROM sessions s
                    JOIN auth_users u ON s.user_id = u.id
                    WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP
                ''', (session_token,))
                session = cursor.fetchone()
                
                if session:
                    user_id = session['id']
                    
                    # Get all baby profiles
                    cursor.execute('SELECT * FROM baby_profiles WHERE user_id = ? ORDER BY created_at ASC', (user_id,))
                    baby_profiles = cursor.fetchall()
                    
                    # Get sleep goals
                    cursor.execute('SELECT * FROM sleep_goals WHERE user_id = ?', (user_id,))
                    sleep_goals = cursor.fetchone()
                    
                    if baby_profiles or sleep_goals:
                        user_context = {
                            'baby_profiles': [dict(bp) for bp in baby_profiles] if baby_profiles else [],
                            'sleep_goals': dict(sleep_goals) if sleep_goals else None
                        }
                
                conn.close()
            except Exception as e:
                print(f"Error fetching user context: {str(e)}")
                # Continue without user context if there's an error
        
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
        
        if stream:
            # Streaming response
            def generate():
                full_response = ""
                try:
                    response_stream = get_gemini_response(message, conversation_history, user_context=user_context, stream=True)
                    
                    for chunk in response_stream:
                        # Extract text from chunk - Gemini API structure
                        chunk_text = None
                        if hasattr(chunk, 'text'):
                            chunk_text = chunk.text
                        elif hasattr(chunk, 'candidates') and chunk.candidates:
                            if hasattr(chunk.candidates[0], 'content') and chunk.candidates[0].content:
                                if hasattr(chunk.candidates[0].content, 'parts') and chunk.candidates[0].content.parts:
                                    if hasattr(chunk.candidates[0].content.parts[0], 'text'):
                                        chunk_text = chunk.candidates[0].content.parts[0].text
                        
                        if chunk_text:
                            full_response += chunk_text
                            # Send chunk as SSE
                            yield f"data: {json.dumps({'chunk': chunk_text, 'done': False})}\n\n"
                    
                    # Save complete assistant response
                    assistant_message = Message(
                        conversation_id=conversation_id,
                        role='assistant',
                        content=full_response
                    )
                    assistant_message.save()
                    
                    # Send completion signal
                    yield f"data: {json.dumps({'chunk': '', 'done': True, 'conversation_id': conversation_id})}\n\n"
                except Exception as e:
                    import traceback
                    error_trace = traceback.format_exc()
                    print(f"Streaming error: {error_trace}")
                    yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"
            
            return Response(
                stream_with_context(generate()),
                mimetype='text/event-stream',
                headers={
                    'Cache-Control': 'no-cache',
                    'X-Accel-Buffering': 'no',
                    'Connection': 'keep-alive'
                }
            )
        else:
            # Non-streaming response (backward compatibility)
            response_text = get_gemini_response(message, conversation_history, user_context=user_context, stream=False)
        
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
    """Get all forum channels (public + user's private channels)"""
    from database import get_db_connection
    username = request.args.get('username', '')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if username:
        # Get public channels + private channels user is member of
        cursor.execute('''
            SELECT DISTINCT c.*
            FROM forum_channels c
            LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.username = ?
            WHERE c.is_private = 0 OR (c.is_private = 1 AND cm.username = ?)
            ORDER BY c.name ASC
        ''', (username, username))
    else:
        # Only public channels if no username
        cursor.execute('SELECT * FROM forum_channels WHERE is_private = 0 ORDER BY name ASC')
    
    channels = cursor.fetchall()
    
    # Add active user count for each channel
    channels_with_counts = []
    for channel in channels:
        channel_dict = dict(channel)
        channel_id = channel_dict['id']
        is_private = channel_dict.get('is_private', 0)
        
        if is_private:
            # For private channels, count members
            cursor.execute('''
                SELECT COUNT(DISTINCT username) as count
                FROM channel_members
                WHERE channel_id = ?
            ''', (channel_id,))
        else:
            # For public channels, count distinct users who have posted
            cursor.execute('''
                SELECT COUNT(DISTINCT author_name) as count
                FROM forum_posts
                WHERE channel_id = ?
            ''', (channel_id,))
        
        result = cursor.fetchone()
        channel_dict['active_users'] = result['count'] if result else 0
        channels_with_counts.append(channel_dict)
    
    conn.close()
    return jsonify(channels_with_counts)

@app.route('/api/forum/channels/<int:channel_id>/posts', methods=['GET'])
def get_posts(channel_id):
    """Get all posts for a channel - all members can see all posts"""
    from database import get_db_connection
    username = request.args.get('username', '')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if channel exists
    cursor.execute('SELECT is_private, owner_name FROM forum_channels WHERE id = ?', (channel_id,))
    channel = cursor.fetchone()
    
    if not channel:
        conn.close()
        return jsonify({'error': 'Channel not found'}), 404
    
    # For private channels, verify user is a member (owner or invited member)
    if channel['is_private']:
        if not username:
            conn.close()
            return jsonify({'error': 'Authentication required for private channel'}), 403
        
        # Check if user is owner
        is_owner = channel['owner_name'] == username
        
        # Check if user is a member (if not owner)
        is_member = False
        if not is_owner:
            cursor.execute('SELECT * FROM channel_members WHERE channel_id = ? AND username = ?', (channel_id, username))
            member = cursor.fetchone()
            is_member = member is not None
        
        # User must be either owner or member to see posts
        if not is_owner and not is_member:
            conn.close()
            return jsonify({'error': 'You do not have access to this private channel'}), 403
    
    # Return ALL posts in the channel - all members can see all posts regardless of who posted them
    # Join with auth_users to get profile picture and bio
    cursor.execute('''
        SELECT p.*, u.profile_picture, u.bio
        FROM forum_posts p
        LEFT JOIN auth_users u ON p.author_name = u.username
        WHERE p.channel_id = ? 
        ORDER BY p.timestamp ASC
    ''', (channel_id,))
    posts = cursor.fetchall()
    
    # Get reactions for each post
    posts_with_reactions = []
    for post in posts:
        post_dict = dict(post)
        # Get reactions for this post
        cursor.execute('''
            SELECT emoji, COUNT(*) as count
            FROM post_reactions
            WHERE post_id = ?
            GROUP BY emoji
        ''', (post['id'],))
        reactions = cursor.fetchall()
        post_dict['reactions'] = [dict(r) for r in reactions]
        
        # Get user's reactions for this post
        if username:
            cursor.execute('''
                SELECT emoji FROM post_reactions
                WHERE post_id = ? AND username = ?
            ''', (post['id'], username))
            user_reactions = cursor.fetchall()
            post_dict['user_reactions'] = [r['emoji'] for r in user_reactions]
        else:
            post_dict['user_reactions'] = []
        
        posts_with_reactions.append(post_dict)
    
    conn.close()
    return jsonify(posts_with_reactions)

@app.route('/api/forum/posts', methods=['POST'])
def create_post():
    """Create a new forum post - all members can post and all members can see all posts"""
    from database import get_db_connection
    try:
        data = request.get_json()
        channel_id = data.get('channel_id')
        author_name = data.get('author_name')
        content = data.get('content')
        parent_post_id = data.get('parent_post_id')  # For replies
        
        if not channel_id or not author_name or not content:
            return jsonify({'error': 'Missing required fields'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if channel is private and verify author is a member
        cursor.execute('SELECT is_private, owner_name FROM forum_channels WHERE id = ?', (channel_id,))
        channel = cursor.fetchone()
        
        if channel and channel['is_private']:
            # For private channels, verify the author is a member (owner or invited member)
            is_owner = channel['owner_name'] == author_name
            is_member = False
            
            if not is_owner:
                cursor.execute('SELECT * FROM channel_members WHERE channel_id = ? AND username = ?', (channel_id, author_name))
                member = cursor.fetchone()
                is_member = member is not None
            
            if not is_owner and not is_member:
                conn.close()
                return jsonify({'error': 'You must be a member of this private channel to post'}), 403
        
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
        
        # Create the post - all members will be able to see this post
        file_path = data.get('file_path')
        file_type = data.get('file_type')
        file_name = data.get('file_name')
        
        cursor.execute('''
            INSERT INTO forum_posts (channel_id, author_name, content, file_path, file_type, file_name, parent_post_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (channel_id, author_name, content, file_path, file_type, file_name, parent_post_id))
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
        is_private = data.get('is_private', False)
        owner_name = data.get('owner_name', '')
        
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
            INSERT INTO forum_channels (name, icon, description, is_private, owner_name)
            VALUES (?, ?, ?, ?, ?)
        ''', (name.lower(), icon, description, 1 if is_private else 0, owner_name))
        channel_id = cursor.lastrowid
        
        # Add owner as member if private
        if is_private and owner_name:
            cursor.execute('''
                INSERT INTO channel_members (channel_id, username, role)
                VALUES (?, ?, 'owner')
            ''', (channel_id, owner_name))
        
        conn.commit()
        
        # Get the created channel
        cursor.execute('SELECT * FROM forum_channels WHERE id = ?', (channel_id,))
        channel = cursor.fetchone()
        conn.close()
        
        return jsonify(dict(channel))
    except Exception as e:
        return jsonify({'error': f'Failed to create channel: {str(e)}'}), 500

@app.route('/api/forum/channels/<int:channel_id>', methods=['DELETE'])
def delete_channel(channel_id):
    """Delete a channel (only by owner)"""
    from database import get_db_connection
    try:
        username = request.args.get('username', '')
        if not username:
            return jsonify({'error': 'Username is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user is owner
        cursor.execute('SELECT owner_name FROM forum_channels WHERE id = ?', (channel_id,))
        channel = cursor.fetchone()
        
        if not channel:
            conn.close()
            return jsonify({'error': 'Channel not found'}), 404
        
        # Allow deletion if user is owner OR if channel has no owner (for backward compatibility)
        owner_name = channel['owner_name'] if channel['owner_name'] else ''
        if owner_name and owner_name != username:
            conn.close()
            return jsonify({'error': 'Only channel owner can delete the channel'}), 403
        
        # Delete channel members
        cursor.execute('DELETE FROM channel_members WHERE channel_id = ?', (channel_id,))
        # Delete channel invites
        cursor.execute('DELETE FROM channel_invites WHERE channel_id = ?', (channel_id,))
        # Delete posts
        cursor.execute('DELETE FROM forum_posts WHERE channel_id = ?', (channel_id,))
        # Delete channel
        cursor.execute('DELETE FROM forum_channels WHERE id = ?', (channel_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Channel deleted successfully'})
    except Exception as e:
        return jsonify({'error': f'Failed to delete channel: {str(e)}'}), 500

@app.route('/api/forum/channels/<int:channel_id>/privacy', methods=['PUT'])
def update_channel_privacy(channel_id):
    """Update channel privacy (only by owner)"""
    from database import get_db_connection
    try:
        data = request.get_json()
        is_private = data.get('is_private', False)
        username = data.get('username', '')
        
        if not username:
            return jsonify({'error': 'Username is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user is owner
        cursor.execute('SELECT owner_name FROM forum_channels WHERE id = ?', (channel_id,))
        channel = cursor.fetchone()
        
        if not channel:
            conn.close()
            return jsonify({'error': 'Channel not found'}), 404
        
        if channel['owner_name'] != username:
            conn.close()
            return jsonify({'error': 'Only channel owner can change privacy'}), 403
        
        cursor.execute('''
            UPDATE forum_channels 
            SET is_private = ?
            WHERE id = ?
        ''', (1 if is_private else 0, channel_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Channel privacy updated'})
    except Exception as e:
        return jsonify({'error': f'Failed to update privacy: {str(e)}'}), 500

@app.route('/api/forum/channels/<int:channel_id>/invite', methods=['POST'])
def invite_to_channel(channel_id):
    """Invite a user to a private channel"""
    from database import get_db_connection
    try:
        data = request.get_json()
        invited_by = data.get('invited_by', '')
        invitee_username = data.get('invitee_username', '')
        
        if not invited_by or not invitee_username:
            return jsonify({'error': 'Both inviter and invitee usernames are required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if channel exists and is private
        cursor.execute('SELECT is_private, owner_name FROM forum_channels WHERE id = ?', (channel_id,))
        channel = cursor.fetchone()
        
        if not channel:
            conn.close()
            return jsonify({'error': 'Channel not found'}), 404
        
        # Check if user has permission (owner or member)
        if channel['owner_name'] != invited_by:
            cursor.execute('SELECT * FROM channel_members WHERE channel_id = ? AND username = ?', (channel_id, invited_by))
            member = cursor.fetchone()
            if not member:
                conn.close()
                return jsonify({'error': 'You do not have permission to invite to this channel'}), 403
        
        # Add user as member
        cursor.execute('''
            INSERT OR IGNORE INTO channel_members (channel_id, username, role, invited_by)
            VALUES (?, ?, 'member', ?)
        ''', (channel_id, invitee_username, invited_by))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': f'User {invitee_username} added to channel'})
    except Exception as e:
        return jsonify({'error': f'Failed to invite user: {str(e)}'}), 500

@app.route('/api/forum/channels/<int:channel_id>/members', methods=['GET'])
def get_channel_members(channel_id):
    """Get all members of a channel"""
    from database import get_db_connection
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT username, role, joined_at
            FROM channel_members
            WHERE channel_id = ?
            ORDER BY joined_at ASC
        ''', (channel_id,))
        
        members = cursor.fetchall()
        conn.close()
        return jsonify([dict(member) for member in members])
    except Exception as e:
        return jsonify({'error': f'Failed to get members: {str(e)}'}), 500

# File upload configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'txt'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/forum/upload', methods=['POST'])
def upload_file():
    """Upload a file (photo or document)"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # Add unique prefix to avoid conflicts
            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
            file.save(filepath)
            
            # Determine file type
            file_ext = filename.rsplit('.', 1)[1].lower()
            file_type = 'image' if file_ext in ['png', 'jpg', 'jpeg', 'gif'] else 'document'
            
            return jsonify({
                'file_path': unique_filename,
                'file_name': filename,
                'file_type': file_type,
                'url': f'/api/forum/files/{unique_filename}'
            })
        else:
            return jsonify({'error': 'File type not allowed'}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to upload file: {str(e)}'}), 500

@app.route('/api/forum/files/<filename>', methods=['GET'])
def get_file(filename):
    """Serve uploaded files"""
    from flask import send_from_directory
    try:
        # Security: Only allow files in uploads folder
        if '..' in filename or '/' in filename or '\\' in filename:
            return jsonify({'error': 'Invalid filename'}), 400
        return send_from_directory(UPLOAD_FOLDER, filename)
    except Exception as e:
        return jsonify({'error': 'File not found'}), 404

# Direct Messages endpoints
@app.route('/api/dm/conversations', methods=['GET'])
def get_dm_conversations():
    """Get all conversations for a user"""
    from database import get_db_connection
    username = request.args.get('username', '')
    
    if not username:
        return jsonify({'error': 'Username is required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all unique conversations (people who have sent or received messages)
        cursor.execute('''
            SELECT DISTINCT 
                CASE 
                    WHEN sender_name = ? THEN receiver_name
                    ELSE sender_name
                END as other_user,
                MAX(created_at) as last_message_time,
                SUM(CASE WHEN receiver_name = ? AND is_read = 0 THEN 1 ELSE 0 END) as unread_count
            FROM direct_messages
            WHERE sender_name = ? OR receiver_name = ?
            GROUP BY other_user
            ORDER BY last_message_time DESC
        ''', (username, username, username, username))
        
        conversations = cursor.fetchall()
        conn.close()
        
        return jsonify([dict(conv) for conv in conversations])
    except Exception as e:
        return jsonify({'error': f'Failed to get conversations: {str(e)}'}), 500

@app.route('/api/dm/messages', methods=['GET'])
def get_dm_messages():
    """Get messages between two users"""
    from database import get_db_connection
    username = request.args.get('username', '')
    friend_username = request.args.get('friend', '')
    
    if not username or not friend_username:
        return jsonify({'error': 'Both username and friend are required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all messages between the two users
        cursor.execute('''
            SELECT * FROM direct_messages
            WHERE (sender_name = ? AND receiver_name = ?)
               OR (sender_name = ? AND receiver_name = ?)
            ORDER BY created_at ASC
        ''', (username, friend_username, friend_username, username))
        
        messages = cursor.fetchall()
        
        # Get reactions for each message
        messages_with_reactions = []
        for msg in messages:
            msg_dict = dict(msg)
            # Get reactions for this message
            cursor.execute('''
                SELECT emoji, COUNT(*) as count
                FROM message_reactions
                WHERE message_id = ?
                GROUP BY emoji
            ''', (msg['id'],))
            reactions = cursor.fetchall()
            msg_dict['reactions'] = [dict(r) for r in reactions]
            
            # Get user's reactions for this message
            cursor.execute('''
                SELECT emoji FROM message_reactions
                WHERE message_id = ? AND username = ?
            ''', (msg['id'], username))
            user_reactions = cursor.fetchall()
            msg_dict['user_reactions'] = [r['emoji'] for r in user_reactions]
            
            messages_with_reactions.append(msg_dict)
        
        # Mark messages as read
        cursor.execute('''
            UPDATE direct_messages
            SET is_read = 1
            WHERE receiver_name = ? AND sender_name = ? AND is_read = 0
        ''', (username, friend_username))
        
        conn.commit()
        conn.close()
        
        return jsonify(messages_with_reactions)
    except Exception as e:
        return jsonify({'error': f'Failed to get messages: {str(e)}'}), 500

@app.route('/api/dm/send', methods=['POST'])
def send_message():
    """Send a direct message"""
    from database import get_db_connection
    try:
        data = request.get_json()
        sender_name = data.get('sender_name', '')
        receiver_name = data.get('receiver_name', '')
        content = data.get('content', '')
        
        if not sender_name or not receiver_name or not content:
            return jsonify({'error': 'Missing required fields'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO direct_messages (sender_name, receiver_name, content)
            VALUES (?, ?, ?)
        ''', (sender_name, receiver_name, content))
        
        message_id = cursor.lastrowid
        conn.commit()
        
        # Get the created message
        cursor.execute('SELECT * FROM direct_messages WHERE id = ?', (message_id,))
        message = cursor.fetchone()
        conn.close()
        
        return jsonify(dict(message))
    except Exception as e:
        return jsonify({'error': f'Failed to send message: {str(e)}'}), 500

@app.route('/api/dm/unread-count', methods=['GET'])
def get_unread_count():
    """Get unread message count for a user"""
    from database import get_db_connection
    username = request.args.get('username', '')
    
    if not username:
        return jsonify({'error': 'Username is required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT COUNT(*) as count
            FROM direct_messages
            WHERE receiver_name = ? AND is_read = 0
        ''', (username,))
        
        result = cursor.fetchone()
        conn.close()
        
        return jsonify({'count': result['count'] if result else 0})
    except Exception as e:
        return jsonify({'error': f'Failed to get unread count: {str(e)}'}), 500

# Reaction endpoints
@app.route('/api/forum/posts/<int:post_id>/reactions', methods=['POST'])
def add_post_reaction(post_id):
    """Add or remove a reaction to a post"""
    from database import get_db_connection
    try:
        data = request.get_json()
        username = data.get('username', '')
        emoji = data.get('emoji', '')
        
        if not username or not emoji:
            return jsonify({'error': 'Username and emoji are required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if reaction already exists
        cursor.execute('''
            SELECT * FROM post_reactions
            WHERE post_id = ? AND username = ? AND emoji = ?
        ''', (post_id, username, emoji))
        existing = cursor.fetchone()
        
        if existing:
            # Remove reaction
            cursor.execute('''
                DELETE FROM post_reactions
                WHERE post_id = ? AND username = ? AND emoji = ?
            ''', (post_id, username, emoji))
        else:
            # Add reaction
            cursor.execute('''
                INSERT INTO post_reactions (post_id, username, emoji)
                VALUES (?, ?, ?)
            ''', (post_id, username, emoji))
        
        conn.commit()
        
        # Get updated reactions
        cursor.execute('''
            SELECT emoji, COUNT(*) as count
            FROM post_reactions
            WHERE post_id = ?
            GROUP BY emoji
        ''', (post_id,))
        reactions = cursor.fetchall()
        
        conn.close()
        return jsonify({'reactions': [dict(r) for r in reactions]})
    except Exception as e:
        return jsonify({'error': f'Failed to update reaction: {str(e)}'}), 500

@app.route('/api/dm/messages/<int:message_id>/reactions', methods=['POST'])
def add_message_reaction(message_id):
    """Add or remove a reaction to a direct message"""
    from database import get_db_connection
    try:
        data = request.get_json()
        username = data.get('username', '')
        emoji = data.get('emoji', '')
        
        if not username or not emoji:
            return jsonify({'error': 'Username and emoji are required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if reaction already exists
        cursor.execute('''
            SELECT * FROM message_reactions
            WHERE message_id = ? AND username = ? AND emoji = ?
        ''', (message_id, username, emoji))
        existing = cursor.fetchone()
        
        if existing:
            # Remove reaction
            cursor.execute('''
                DELETE FROM message_reactions
                WHERE message_id = ? AND username = ? AND emoji = ?
            ''', (message_id, username, emoji))
        else:
            # Add reaction
            cursor.execute('''
                INSERT INTO message_reactions (message_id, username, emoji)
                VALUES (?, ?, ?)
            ''', (message_id, username, emoji))
        
        conn.commit()
        
        # Get updated reactions
        cursor.execute('''
            SELECT emoji, COUNT(*) as count
            FROM message_reactions
            WHERE message_id = ?
            GROUP BY emoji
        ''', (message_id,))
        reactions = cursor.fetchall()
        
        conn.close()
        return jsonify({'reactions': [dict(r) for r in reactions]})
    except Exception as e:
        return jsonify({'error': f'Failed to update reaction: {str(e)}'}), 500

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    """Get all notifications for a user (new posts, messages, friend requests)"""
    from database import get_db_connection
    username = request.args.get('username', '')
    last_check = request.args.get('last_check', '')  # ISO timestamp
    
    if not username:
        return jsonify({'error': 'Username is required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        notifications = {
            'new_posts': [],
            'new_messages': 0,
            'new_friend_requests': []
        }
        
        # Check for new posts in channels user has access to
        if last_check:
            # Get channels user has access to (public or private where user is member/owner)
            cursor.execute('''
                SELECT DISTINCT c.id, c.name
                FROM forum_channels c
                LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.username = ?
                WHERE c.is_private = 0 
                   OR c.owner_name = ?
                   OR cm.username = ?
            ''', (username, username, username))
            
            accessible_channels = cursor.fetchall()
            channel_ids = [ch['id'] for ch in accessible_channels]
            
            if channel_ids:
                placeholders = ','.join(['?'] * len(channel_ids))
                # Get new posts since last check (excluding user's own posts)
                cursor.execute(f'''
                    SELECT p.id, p.channel_id, p.author_name, p.content, p.timestamp, c.name as channel_name
                    FROM forum_posts p
                    JOIN forum_channels c ON p.channel_id = c.id
                    WHERE p.channel_id IN ({placeholders})
                      AND p.author_name != ?
                      AND p.timestamp > ?
                    ORDER BY p.timestamp DESC
                    LIMIT 20
                ''', channel_ids + [username, last_check])
                
                new_posts = cursor.fetchall()
                notifications['new_posts'] = [dict(post) for post in new_posts]
        
        # Check for new unread messages
        cursor.execute('''
            SELECT COUNT(*) as count
            FROM direct_messages
            WHERE receiver_name = ? AND is_read = 0
        ''', (username,))
        result = cursor.fetchone()
        notifications['new_messages'] = result['count'] if result else 0
        
        # Check for new friend requests
        cursor.execute('''
            SELECT user1_name as from_user, created_at
            FROM friendships
            WHERE user2_name = ? AND status = 'pending'
            ORDER BY created_at DESC
        ''', (username,))
        friend_requests = cursor.fetchall()
        notifications['new_friend_requests'] = [dict(req) for req in friend_requests]
        
        conn.close()
        
        return jsonify(notifications)
    except Exception as e:
        return jsonify({'error': f'Failed to get notifications: {str(e)}'}), 500

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
        
        # Get accepted friendships with profile info
        cursor.execute('''
            SELECT 
                CASE 
                    WHEN user1_name = ? THEN user2_name
                    ELSE user1_name
                END as friend_name,
                f.created_at,
                u.display_name,
                au.profile_picture,
                au.bio
            FROM friendships f
            LEFT JOIN forum_users u ON (
                CASE 
                    WHEN f.user1_name = ? THEN u.username = f.user2_name
                    ELSE u.username = f.user1_name
                END
            )
            LEFT JOIN auth_users au ON (
                CASE 
                    WHEN f.user1_name = ? THEN au.username = f.user2_name
                    ELSE au.username = f.user1_name
                END
            )
            WHERE (user1_name = ? OR user2_name = ?)
            AND status = 'accepted'
            ORDER BY f.created_at DESC
        ''', (username, username, username, username, username))
        
        friends = cursor.fetchall()
        friend_list = [dict(friend) for friend in friends]
        
        # Debug logging
        print(f"Found {len(friend_list)} friends for user: {username}")
        if friend_list:
            print(f"Friend names: {[f.get('friend_name') for f in friend_list]}")
        
        conn.close()
        return jsonify(friend_list)
    except Exception as e:
        print(f"Error in get_friends for {username}: {str(e)}")
        import traceback
        traceback.print_exc()
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
        
        # Get pending requests where user is the recipient with profile info
        cursor.execute('''
            SELECT 
                f.user1_name as from_user,
                f.created_at,
                au.profile_picture,
                au.bio
            FROM friendships f
            LEFT JOIN auth_users au ON f.user1_name = au.username
            WHERE f.user2_name = ? AND f.status = 'pending'
            ORDER BY f.created_at DESC
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
        from_user = data.get('from_user', '').strip()
        to_user = data.get('to_user', '').strip()
        
        print(f"Friend request - from: '{from_user}', to: '{to_user}'")
        
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
                print(f"Already friends: {from_user} and {to_user}")
                return jsonify({'error': 'Already friends'}), 400
            elif existing['status'] == 'pending':
                conn.close()
                print(f"Friend request already pending: {from_user} and {to_user}")
                return jsonify({'error': 'Friend request already sent'}), 400
        
        # Create friend request
        cursor.execute('''
            INSERT INTO friendships (user1_name, user2_name, status)
            VALUES (?, ?, 'pending')
        ''', (from_user, to_user))
        conn.commit()
        print(f"Friend request created: {from_user} -> {to_user}")
        conn.close()
        
        return jsonify({'message': 'Friend request sent'})
    except Exception as e:
        print(f"Error in send_friend_request: {str(e)}")
        import traceback
        traceback.print_exc()
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
        
        # Update friendship status - check both directions since friendship can be stored either way
        cursor.execute('''
            UPDATE friendships
            SET status = 'accepted'
            WHERE ((user1_name = ? AND user2_name = ?) OR (user1_name = ? AND user2_name = ?))
            AND status = 'pending'
        ''', (from_user, to_user, to_user, from_user))
        
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
        
        print(f"Search request - query: '{query}', current_user: '{current_user}'")
        
        if not query:
            print("Empty query, returning empty list")
            return jsonify([])
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Search in auth_users to find all users with profile info
        # Only include active accounts (is_active = 1 or NULL for backward compatibility)
        # Use LOWER() for case-insensitive search
        search_pattern = f'%{query.lower()}%'
        
        # First, let's check how many users exist total
        cursor.execute('SELECT COUNT(*) as count FROM auth_users WHERE (is_active = 1 OR is_active IS NULL)')
        total_users = cursor.fetchone()['count']
        print(f"Total active users in database: {total_users}")
        
        cursor.execute('''
            SELECT DISTINCT 
                au.username as username,
                COALESCE(fu.display_name, au.username) as display_name,
                fu.last_seen,
                au.profile_picture,
                au.bio
            FROM auth_users au
            LEFT JOIN forum_users fu ON au.username = fu.username
            WHERE LOWER(au.username) LIKE ?
              AND au.username != ?
              AND (au.is_active = 1 OR au.is_active IS NULL)
            ORDER BY au.username ASC
            LIMIT 20
        ''', (search_pattern, current_user))
        
        users = cursor.fetchall()
        user_list = [dict(user) for user in users]
        print(f"Found {len(user_list)} users matching '{query}' (excluding current user '{current_user}')")
        if user_list:
            print(f"Matched usernames: {[u.get('username') for u in user_list]}")
        else:
            # Debug: show what users exist
            cursor.execute('''
                SELECT username FROM auth_users 
                WHERE (is_active = 1 OR is_active IS NULL)
                LIMIT 10
            ''')
            all_users = cursor.fetchall()
            print(f"Sample of all users in database: {[u['username'] for u in all_users]}")
        
        conn.close()
        return jsonify(user_list)
    except Exception as e:
        print(f"Error in search_users: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to search users: {str(e)}'}), 500

# Authentication endpoints
def generate_random_username():
    """Generate a random username"""
    import random
    adjectives = ['sleepy', 'cozy', 'dreamy', 'calm', 'gentle', 'peaceful', 'serene', 'tranquil', 'restful', 'quiet']
    nouns = ['baby', 'star', 'moon', 'cloud', 'angel', 'bear', 'bunny', 'bird', 'butterfly', 'flower']
    number = secrets.randbelow(1000)
    return f"{random.choice(adjectives)}_{random.choice(nouns)}_{number}"

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    """Create a new user account"""
    from database import get_db_connection
    try:
        data = request.get_json()
        first_name = (data.get('first_name') or '').strip()
        last_name = (data.get('last_name') or '').strip()
        email = (data.get('email') or '').strip()
        password = data.get('password', '')
        username = (data.get('username') or '').strip()
        use_random_username = data.get('use_random_username', False)
        remember_me = data.get('remember_me', False)
        
        # Validate required fields
        if not first_name or not last_name:
            return jsonify({'error': 'First name and last name are required'}), 400
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        if not password:
            return jsonify({'error': 'Password is required'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Generate or validate username
        if use_random_username:
            # If a username was provided and matches the random pattern, try to use it first
            import re
            if username and username.strip() and re.match(r'^[a-z]+_[a-z]+_\d+$', username.strip()):
                # Check if the provided username is available
                cursor.execute('SELECT * FROM auth_users WHERE username = ?', (username.strip(),))
                if not cursor.fetchone():
                    # Use the provided username
                    username = username.strip()
                else:
                    # Provided username is taken, generate a new one
                    username = None
            else:
                # No valid username provided, generate a new one
                username = None
            
            # If we still need to generate a username
            if not username:
                max_attempts = 10
                for _ in range(max_attempts):
                    username = generate_random_username()
                    cursor.execute('SELECT * FROM auth_users WHERE username = ?', (username,))
                    if not cursor.fetchone():
                        break
                else:
                    conn.close()
                    return jsonify({'error': 'Could not generate a unique username. Please try again.'}), 500
        else:
            # User provided username
            if not username:
                return jsonify({'error': 'Username is required'}), 400
            
            if len(username) < 3:
                return jsonify({'error': 'Username must be at least 3 characters'}), 400
            
            # Check if username already exists
            cursor.execute('SELECT * FROM auth_users WHERE username = ?', (username,))
            existing = cursor.fetchone()
            if existing:
                conn.close()
                return jsonify({'error': 'Username already exists. Please choose a different username.'}), 400
        
        # Check if email already exists
        cursor.execute('SELECT * FROM auth_users WHERE email = ?', (email,))
        existing_email = cursor.fetchone()
        if existing_email:
            conn.close()
            return jsonify({'error': 'Email already registered. Please use a different email or login.'}), 400
        
        # Hash password
        password_hash = generate_password_hash(password)
        
        # Create user
        cursor.execute('''
            INSERT INTO auth_users (username, first_name, last_name, email, password_hash)
            VALUES (?, ?, ?, ?, ?)
        ''', (username, first_name, last_name, email, password_hash))
        user_id = cursor.lastrowid
        
        # Create forum user entry
        cursor.execute('''
            INSERT OR IGNORE INTO forum_users (username, display_name)
            VALUES (?, ?)
        ''', (username, f"{first_name} {last_name}"))
        
        # Create session
        session_token = secrets.token_urlsafe(32)
        if remember_me:
            expires_at = datetime.now() + timedelta(days=30)
        else:
            expires_at = datetime.now() + timedelta(days=1)
        
        cursor.execute('''
            INSERT INTO sessions (user_id, session_token, expires_at)
            VALUES (?, ?, ?)
        ''', (user_id, session_token, expires_at))
        
        # Get created user to return profile data
        cursor.execute('SELECT profile_picture, bio, first_name FROM auth_users WHERE id = ?', (user_id,))
        user_data = cursor.fetchone()
        
        # Create baby profiles if provided (supports multiple babies)
        baby_profiles = data.get('baby_profiles', [])
        if baby_profiles and isinstance(baby_profiles, list):
            for baby_profile in baby_profiles:
                baby_name = (baby_profile.get('name') or '').strip()
                birth_date = (baby_profile.get('birth_date') or '').strip() or None
                age_months = baby_profile.get('age_months')
                sleep_issues = (baby_profile.get('sleep_issues') or '').strip() or None
                current_schedule = (baby_profile.get('current_schedule') or '').strip() or None
                notes = (baby_profile.get('notes') or '').strip() or None
                
                # Create if at least name is provided or if any other field has data
                if baby_name or birth_date or age_months or sleep_issues or current_schedule or notes:
                    cursor.execute('''
                        INSERT INTO baby_profiles (user_id, name, birth_date, age_months, sleep_issues, current_schedule, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (user_id, baby_name or None, birth_date, age_months, sleep_issues, current_schedule, notes))
        
        # Create sleep goals if provided
        sleep_goals = data.get('sleep_goals')
        if sleep_goals:
            goal_1 = (sleep_goals.get('goal_1') or '').strip() or None
            goal_2 = (sleep_goals.get('goal_2') or '').strip() or None
            goal_3 = (sleep_goals.get('goal_3') or '').strip() or None
            goal_4 = (sleep_goals.get('goal_4') or '').strip() or None
            goal_5 = (sleep_goals.get('goal_5') or '').strip() or None
            
            # Create if at least one goal is provided
            if goal_1 or goal_2 or goal_3 or goal_4 or goal_5:
                cursor.execute('''
                    INSERT INTO sleep_goals (user_id, goal_1, goal_2, goal_3, goal_4, goal_5)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (user_id, goal_1, goal_2, goal_3, goal_4, goal_5))
        
        conn.commit()
        
        # Get first_name from user_data before closing connection
        user_first_name = user_data['first_name'] if user_data else first_name
        
        conn.close()
        
        # Send welcome email (non-blocking - don't fail signup if email fails)
        try:
            send_welcome_email(email, first_name, username)
        except Exception as email_error:
            print(f"Failed to send welcome email: {str(email_error)}")
            # Continue with signup even if email fails
        
        return jsonify({
            'message': 'Account created successfully',
            'session_token': session_token,
            'username': username,
            'user_id': user_id,
            'first_name': user_first_name,
            'profile_picture': user_data['profile_picture'] if user_data else None,
            'bio': user_data['bio'] if user_data else None
        })
    except Exception as e:
        print(f'Signup error: {str(e)}')  # Debug logging
        return jsonify({'error': f'Failed to create account: {str(e)}'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login and create session"""
    from database import get_db_connection
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        remember_me = data.get('remember_me', False)
        
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
        
        # Check if account is active
        if user.get('is_active', 1) == 0:
            conn.close()
            return jsonify({'error': 'This account has been deactivated'}), 403
        
        # Check password
        if not check_password_hash(user['password_hash'], password):
            conn.close()
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Create session with different expiration based on remember_me
        session_token = secrets.token_urlsafe(32)
        # 30 days for remember me, 7 days for regular login
        expiration_days = 30 if remember_me else 7
        expires_at = datetime.now() + timedelta(days=expiration_days)
        
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
            'user_id': user['id'],
            'first_name': user['first_name'],
            'profile_picture': user['profile_picture'],
            'bio': user['bio']
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
            SELECT s.*, u.username, u.id as user_id, u.first_name, u.profile_picture, u.bio, u.is_active
            FROM sessions s
            JOIN auth_users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP
        ''', (session_token,))
        session = cursor.fetchone()
        
        if not session:
            conn.close()
            return jsonify({'authenticated': False}), 401
        
        # Check if account is active
        if session.get('is_active', 1) == 0:
            conn.close()
            return jsonify({'authenticated': False, 'error': 'Account has been deactivated'}), 403
        
        conn.close()
        return jsonify({
            'authenticated': True,
            'username': session['username'],
            'user_id': session['user_id'],
            'first_name': session['first_name'],
            'profile_picture': session['profile_picture'],
            'bio': session['bio']
        })
    except Exception as e:
        return jsonify({'authenticated': False, 'error': str(e)}), 500

@app.route('/api/auth/profile/<username>', methods=['GET'])
def get_user_profile(username):
    """Get another user's public profile (username, profile_picture, bio)"""
    from database import get_db_connection
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get public profile info
        cursor.execute('''
            SELECT username, profile_picture, bio
            FROM auth_users
            WHERE username = ?
        ''', (username,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        
        conn.close()
        return jsonify(dict(user))
    except Exception as e:
        return jsonify({'error': f'Failed to get profile: {str(e)}'}), 500

@app.route('/api/auth/profile', methods=['GET'])
def get_profile():
    """Get user profile"""
    from database import get_db_connection
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not session_token:
            return jsonify({'error': 'Not authenticated'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user from session
        cursor.execute('''
            SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.profile_picture, u.bio
            FROM sessions s
            JOIN auth_users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP
        ''', (session_token,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return jsonify({'error': 'Invalid session'}), 401
        
        conn.close()
        return jsonify(dict(user))
    except Exception as e:
        return jsonify({'error': f'Failed to get profile: {str(e)}'}), 500

@app.route('/api/auth/profile', methods=['PUT'])
def update_profile():
    """Update user profile (username, name, email, bio, and profile picture)"""
    from database import get_db_connection
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not session_token:
            return jsonify({'error': 'Not authenticated'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user from session
        cursor.execute('''
            SELECT u.id, u.username
            FROM sessions s
            JOIN auth_users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP
        ''', (session_token,))
        session = cursor.fetchone()
        
        if not session:
            conn.close()
            return jsonify({'error': 'Invalid session'}), 401
        
        user_id = session['id']
        current_username = session['username']
        data = request.get_json()
        
        # Debug logging
        print(f"Update profile request data: {data}")
        
        # Safely extract and strip values, handling None/null
        username = (data.get('username') or '').strip() if data.get('username') is not None else ''
        first_name = (data.get('first_name') or '').strip() if data.get('first_name') is not None else ''
        last_name = (data.get('last_name') or '').strip() if data.get('last_name') is not None else ''
        email = (data.get('email') or '').strip() if data.get('email') is not None else ''
        bio = (data.get('bio') or '').strip() if data.get('bio') is not None else ''
        profile_picture = (data.get('profile_picture') or '').strip() if data.get('profile_picture') is not None else ''
        
        print(f"Parsed values - username: '{username}', first_name: '{first_name}', last_name: '{last_name}', email: '{email}', bio: '{bio}', profile_picture: '{profile_picture}'")
        
        # Validate username if changed
        if username and username != current_username:
            if len(username) < 3:
                conn.close()
                return jsonify({'error': 'Username must be at least 3 characters'}), 400
            
            # Check if username already exists
            cursor.execute('SELECT * FROM auth_users WHERE username = ? AND id != ?', (username, user_id))
            existing = cursor.fetchone()
            if existing:
                conn.close()
                return jsonify({'error': 'Username already exists. Please choose a different username.'}), 400
        
        # Validate email if provided
        if email:
            # Check if email already exists (if changed)
            cursor.execute('SELECT email FROM auth_users WHERE id = ?', (user_id,))
            current_email_row = cursor.fetchone()
            if current_email_row:
                current_email = current_email_row['email']
                if email != current_email:
                    cursor.execute('SELECT * FROM auth_users WHERE email = ? AND id != ?', (email, user_id))
                    existing = cursor.fetchone()
                    if existing:
                        conn.close()
                        return jsonify({'error': 'Email already registered. Please use a different email.'}), 400
        
        # Update profile - always update all fields that are provided in the request
        updates = []
        values = []
        
        # Always update these fields if they're in the request (even if empty)
        # The frontend always sends all fields, so we update all of them
        if 'username' in data and username:  # Only update username if it's not empty
            updates.append('username = ?')
            values.append(username)
        
        if 'first_name' in data:
            updates.append('first_name = ?')
            values.append(first_name)
        
        if 'last_name' in data:
            updates.append('last_name = ?')
            values.append(last_name)
        
        if 'email' in data and email:  # Only update email if it's not empty
            updates.append('email = ?')
            values.append(email)
        
        if 'bio' in data:
            updates.append('bio = ?')
            values.append(bio)
        
        if 'profile_picture' in data:
            updates.append('profile_picture = ?')
            values.append(profile_picture)
        
        print(f"Updates to apply: {updates}")
        print(f"Values: {values}")
        
        if updates:
            values.append(user_id)
            cursor.execute(f'''
                UPDATE auth_users 
                SET {', '.join(updates)}
                WHERE id = ?
            ''', values)
            
            # If username changed, update forum_users table too
            if username and username != current_username:
                cursor.execute('''
                    UPDATE forum_users 
                    SET username = ?, display_name = ?
                    WHERE username = ?
                ''', (username, f"{first_name or ''} {last_name or ''}".strip() or username, current_username))
            
            conn.commit()
        
        # Get updated user
        cursor.execute('''
            SELECT id, username, first_name, last_name, email, profile_picture, bio
            FROM auth_users
            WHERE id = ?
        ''', (user_id,))
        user = cursor.fetchone()
        
        conn.close()
        return jsonify(dict(user))
    except Exception as e:
        return jsonify({'error': f'Failed to update profile: {str(e)}'}), 500

@app.route('/api/auth/deactivate', methods=['POST'])
def deactivate_account():
    """Deactivate user account"""
    from database import get_db_connection
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not session_token:
            return jsonify({'error': 'Not authenticated'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user from session
        cursor.execute('''
            SELECT u.id, u.username
            FROM sessions s
            JOIN auth_users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP
        ''', (session_token,))
        session = cursor.fetchone()
        
        if not session:
            conn.close()
            return jsonify({'error': 'Invalid session'}), 401
        
        user_id = session['id']
        
        # Deactivate account
        cursor.execute('''
            UPDATE auth_users 
            SET is_active = 0, deactivated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (user_id,))
        
        # Delete all sessions for this user
        cursor.execute('DELETE FROM sessions WHERE user_id = ?', (user_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Account deactivated successfully'})
    except Exception as e:
        return jsonify({'error': f'Failed to deactivate account: {str(e)}'}), 500

@app.route('/api/auth/profile-picture', methods=['POST'])
def upload_profile_picture():
    """Upload profile picture"""
    from database import get_db_connection
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not session_token:
            return jsonify({'error': 'Not authenticated'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user from session
        cursor.execute('''
            SELECT u.id
            FROM sessions s
            JOIN auth_users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP
        ''', (session_token,))
        session = cursor.fetchone()
        
        if not session:
            conn.close()
            return jsonify({'error': 'Invalid session'}), 401
        
        if 'file' not in request.files:
            conn.close()
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            conn.close()
            return jsonify({'error': 'No file selected'}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # Add unique prefix to avoid conflicts
            unique_filename = f"profile_{session['id']}_{uuid.uuid4().hex}_{filename}"
            filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
            file.save(filepath)
            
            # Update user's profile picture
            cursor.execute('''
                UPDATE auth_users 
                SET profile_picture = ?
                WHERE id = ?
            ''', (unique_filename, session['id']))
            
            conn.commit()
            conn.close()
            
            return jsonify({
                'profile_picture': unique_filename,
                'url': f'/api/forum/files/{unique_filename}'
            })
        else:
            conn.close()
            return jsonify({'error': 'File type not allowed. Please upload an image.'}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to upload profile picture: {str(e)}'}), 500

# Baby Profile endpoints
@app.route('/api/auth/baby-profile', methods=['GET'])
def get_baby_profiles():
    """Get all baby profiles for the authenticated user"""
    from database import get_db_connection
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not session_token:
            return jsonify({'error': 'Not authenticated'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user from session
        cursor.execute('''
            SELECT u.id
            FROM sessions s
            JOIN auth_users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP
        ''', (session_token,))
        session = cursor.fetchone()
        
        if not session:
            conn.close()
            return jsonify({'error': 'Invalid session'}), 401
        
        user_id = session['id']
        
        # Get all baby profiles
        cursor.execute('''
            SELECT * FROM baby_profiles
            WHERE user_id = ?
            ORDER BY created_at ASC
        ''', (user_id,))
        baby_profiles = cursor.fetchall()
        
        conn.close()
        
        if baby_profiles:
            return jsonify([dict(bp) for bp in baby_profiles])
        else:
            return jsonify([])  # No baby profiles yet
    except Exception as e:
        return jsonify({'error': f'Failed to get baby profiles: {str(e)}'}), 500

@app.route('/api/auth/baby-profile', methods=['POST'])
def create_baby_profile():
    """Create a new baby profile"""
    from database import get_db_connection
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not session_token:
            return jsonify({'error': 'Not authenticated'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user from session
        cursor.execute('''
            SELECT u.id
            FROM sessions s
            JOIN auth_users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP
        ''', (session_token,))
        session = cursor.fetchone()
        
        if not session:
            conn.close()
            return jsonify({'error': 'Invalid session'}), 401
        
        user_id = session['id']
        data = request.get_json()
        
        name = data.get('name', '').strip()
        birth_date = data.get('birth_date', '').strip() or None
        age_months = data.get('age_months')
        sleep_issues = data.get('sleep_issues', '').strip() or None
        current_schedule = data.get('current_schedule', '').strip() or None
        notes = data.get('notes', '').strip() or None
        
        if not name:
            conn.close()
            return jsonify({'error': 'Baby name is required'}), 400
        
        # Create new profile
        cursor.execute('''
            INSERT INTO baby_profiles (user_id, name, birth_date, age_months, sleep_issues, current_schedule, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, name, birth_date, age_months, sleep_issues, current_schedule, notes))
        
        baby_id = cursor.lastrowid
        conn.commit()
        
        # Get created profile
        cursor.execute('SELECT * FROM baby_profiles WHERE id = ?', (baby_id,))
        baby_profile = cursor.fetchone()
        
        conn.close()
        return jsonify(dict(baby_profile))
    except Exception as e:
        return jsonify({'error': f'Failed to create baby profile: {str(e)}'}), 500

@app.route('/api/auth/baby-profile/<int:baby_id>', methods=['PUT'])
def update_baby_profile(baby_id):
    """Update a specific baby profile"""
    from database import get_db_connection
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not session_token:
            return jsonify({'error': 'Not authenticated'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user from session
        cursor.execute('''
            SELECT u.id
            FROM sessions s
            JOIN auth_users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP
        ''', (session_token,))
        session = cursor.fetchone()
        
        if not session:
            conn.close()
            return jsonify({'error': 'Invalid session'}), 401
        
        user_id = session['id']
        data = request.get_json()
        
        # Verify baby belongs to user
        cursor.execute('SELECT * FROM baby_profiles WHERE id = ? AND user_id = ?', (baby_id, user_id))
        existing = cursor.fetchone()
        
        if not existing:
            conn.close()
            return jsonify({'error': 'Baby profile not found'}), 404
        
        name = data.get('name', '').strip()
        birth_date = data.get('birth_date', '').strip() or None
        age_months = data.get('age_months')
        sleep_issues = data.get('sleep_issues', '').strip() or None
        current_schedule = data.get('current_schedule', '').strip() or None
        notes = data.get('notes', '').strip() or None
        
        if not name:
            conn.close()
            return jsonify({'error': 'Baby name is required'}), 400
        
        # Update profile
        cursor.execute('''
            UPDATE baby_profiles
            SET name = ?, birth_date = ?, age_months = ?, sleep_issues = ?, 
                current_schedule = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        ''', (name, birth_date, age_months, sleep_issues, current_schedule, notes, baby_id, user_id))
        
        conn.commit()
        
        # Get updated profile
        cursor.execute('SELECT * FROM baby_profiles WHERE id = ?', (baby_id,))
        baby_profile = cursor.fetchone()
        
        conn.close()
        return jsonify(dict(baby_profile))
    except Exception as e:
        return jsonify({'error': f'Failed to update baby profile: {str(e)}'}), 500

@app.route('/api/auth/baby-profile/<int:baby_id>', methods=['DELETE'])
def delete_baby_profile(baby_id):
    """Delete a specific baby profile"""
    from database import get_db_connection
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not session_token:
            return jsonify({'error': 'Not authenticated'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user from session
        cursor.execute('''
            SELECT u.id
            FROM sessions s
            JOIN auth_users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP
        ''', (session_token,))
        session = cursor.fetchone()
        
        if not session:
            conn.close()
            return jsonify({'error': 'Invalid session'}), 401
        
        user_id = session['id']
        
        # Verify baby belongs to user
        cursor.execute('SELECT * FROM baby_profiles WHERE id = ? AND user_id = ?', (baby_id, user_id))
        existing = cursor.fetchone()
        
        if not existing:
            conn.close()
            return jsonify({'error': 'Baby profile not found'}), 404
        
        # Delete profile
        cursor.execute('DELETE FROM baby_profiles WHERE id = ? AND user_id = ?', (baby_id, user_id))
        
        conn.commit()
        conn.close()
        return jsonify({'message': 'Baby profile deleted successfully'})
    except Exception as e:
        return jsonify({'error': f'Failed to delete baby profile: {str(e)}'}), 500

# Sleep Goals endpoints
@app.route('/api/auth/sleep-goals', methods=['GET'])
def get_sleep_goals():
    """Get sleep goals for the authenticated user"""
    from database import get_db_connection
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not session_token:
            return jsonify({'error': 'Not authenticated'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user from session
        cursor.execute('''
            SELECT u.id
            FROM sessions s
            JOIN auth_users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP
        ''', (session_token,))
        session = cursor.fetchone()
        
        if not session:
            conn.close()
            return jsonify({'error': 'Invalid session'}), 401
        
        user_id = session['id']
        
        # Get sleep goals
        cursor.execute('''
            SELECT * FROM sleep_goals
            WHERE user_id = ?
        ''', (user_id,))
        sleep_goals = cursor.fetchone()
        
        conn.close()
        
        if sleep_goals:
            return jsonify(dict(sleep_goals))
        else:
            return jsonify(None)  # No sleep goals yet
    except Exception as e:
        return jsonify({'error': f'Failed to get sleep goals: {str(e)}'}), 500

@app.route('/api/auth/sleep-goals', methods=['PUT'])
def update_sleep_goals():
    """Create or update sleep goals"""
    from database import get_db_connection
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not session_token:
            return jsonify({'error': 'Not authenticated'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user from session
        cursor.execute('''
            SELECT u.id
            FROM sessions s
            JOIN auth_users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP
        ''', (session_token,))
        session = cursor.fetchone()
        
        if not session:
            conn.close()
            return jsonify({'error': 'Invalid session'}), 401
        
        user_id = session['id']
        data = request.get_json()
        
        goal_1 = data.get('goal_1', '').strip() or None
        goal_2 = data.get('goal_2', '').strip() or None
        goal_3 = data.get('goal_3', '').strip() or None
        goal_4 = data.get('goal_4', '').strip() or None
        goal_5 = data.get('goal_5', '').strip() or None
        
        # Check if sleep goals exist
        cursor.execute('SELECT * FROM sleep_goals WHERE user_id = ?', (user_id,))
        existing = cursor.fetchone()
        
        if existing:
            # Update existing goals
            cursor.execute('''
                UPDATE sleep_goals
                SET goal_1 = ?, goal_2 = ?, goal_3 = ?, goal_4 = ?, goal_5 = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ''', (goal_1, goal_2, goal_3, goal_4, goal_5, user_id))
        else:
            # Create new goals
            cursor.execute('''
                INSERT INTO sleep_goals (user_id, goal_1, goal_2, goal_3, goal_4, goal_5)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (user_id, goal_1, goal_2, goal_3, goal_4, goal_5))
        
        conn.commit()
        
        # Get updated goals
        cursor.execute('SELECT * FROM sleep_goals WHERE user_id = ?', (user_id,))
        sleep_goals = cursor.fetchone()
        
        conn.close()
        return jsonify(dict(sleep_goals))
    except Exception as e:
        return jsonify({'error': f'Failed to update sleep goals: {str(e)}'}), 500

@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset"""
    from database import get_db_connection
    try:
        data = request.get_json()
        email = data.get('email', '').strip()
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user by email
        cursor.execute('SELECT * FROM auth_users WHERE email = ?', (email,))
        user = cursor.fetchone()
        
        if not user:
            # Don't reveal if email exists for security
            conn.close()
            return jsonify({'message': 'If an account with that email exists, a password reset link has been sent.'}), 200
        
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        expires_at = datetime.now() + timedelta(hours=1)  # Token expires in 1 hour
        
        # Store reset token
        cursor.execute('''
            UPDATE auth_users 
            SET reset_token = ?, reset_token_expires = ?
            WHERE id = ?
        ''', (reset_token, expires_at, user['id']))
        
        conn.commit()
        conn.close()
        
        # In a real app, you would send an email here with the reset link
        # For now, we'll return the token (in production, remove this!)
        # TODO: Send email with reset link: /reset-password?token={reset_token}
        print(f"Password reset token for {email}: {reset_token}")
        
        return jsonify({
            'message': 'If an account with that email exists, a password reset link has been sent.',
            'reset_token': reset_token  # Remove this in production - only for testing
        })
    except Exception as e:
        return jsonify({'error': f'Failed to process password reset request: {str(e)}'}), 500

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    """Reset password using token"""
    from database import get_db_connection
    try:
        data = request.get_json()
        token = data.get('token', '').strip()
        new_password = data.get('password', '')
        
        if not token or not new_password:
            return jsonify({'error': 'Token and new password are required'}), 400
        
        if len(new_password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user with valid reset token
        cursor.execute('''
            SELECT * FROM auth_users 
            WHERE reset_token = ? AND reset_token_expires > ?
        ''', (token, datetime.now()))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return jsonify({'error': 'Invalid or expired reset token'}), 400
        
        # Update password and clear reset token
        password_hash = generate_password_hash(new_password)
        cursor.execute('''
            UPDATE auth_users 
            SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL
            WHERE id = ?
        ''', (password_hash, user['id']))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Password has been reset successfully'})
    except Exception as e:
        return jsonify({'error': f'Failed to reset password: {str(e)}'}), 500

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
