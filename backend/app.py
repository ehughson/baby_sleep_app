from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import google.generativeai as genai
import os
import secrets
import uuid
import json
import re
import sqlite3
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from database import init_db, get_db_connection
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


def get_user_from_session_token(session_token):
    """Return the authenticated user (sqlite Row) for a session token, or None."""
    if not session_token:
        return None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT u.*
            FROM sessions s
            JOIN auth_users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP
        ''', (session_token,))
        user = cursor.fetchone()
        conn.close()
        return user
    except Exception as e:
        print(f"Error retrieving user from session: {str(e)}")
        return None


def generate_conversation_title(message, existing_titles=None):
    """Generate a concise, descriptive title for a conversation based on the message."""
    if existing_titles is None:
        existing_titles = []
    text = (message or '').strip()
    if not text:
        base_title = "Sleep Chat"
    else:
        normalized = text.lower()
        keyword_rules = [
            (("night", "wak"), "Night Waking Support"),
            (("early", "wake"), "Early Rising Fix"),
            (("contact", "nap"), "Contact Nap Transition"),
            (("short", "nap"), "Short Nap Rescue"),
            (("nap",), "Nap Routine Tune-Up"),
            (("bedtime",), "Bedtime Wind-Down Plan"),
            (("schedule",), "Schedule Reset Plan"),
            (("regression",), "Sleep Regression Support"),
            (("teeth",), "Teething Comfort Plan"),
            (("feed",), "Night Feed Balancing"),
            (("crib",), "Crib Transition Plan"),
            (("swaddle",), "Swaddle Transition Support")
        ]
        base_title = None
        for keywords, suggestion in keyword_rules:
            if all(keyword in normalized for keyword in keywords):
                base_title = suggestion
                break
        if not base_title:
            segments = [seg.strip() for seg in re.split(r'[.!?\n]+', text) if seg.strip()]
            candidate = segments[0] if segments else text
            words = candidate.split()
            words = words[:6]
            candidate = ' '.join(words).strip(" ,;:-")
            if not candidate:
                base_title = "Sleep Chat"
            else:
                candidate = re.sub(r'\s+', ' ', candidate)
                # Preserve capitalization for common sleep terms
                base_title = candidate.title()
    if not base_title:
        base_title = "Sleep Chat"
    existing_lower = {t.lower() for t in existing_titles if t}
    final_title = base_title
    suffix = 2
    while final_title.lower() in existing_lower:
        final_title = f"{base_title} #{suffix}"
        suffix += 1
    return final_title

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

# CORS configuration - allow configurable origins
allowed_origins_env = os.getenv('ALLOWED_ORIGINS')
if allowed_origins_env:
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(',') if origin.strip()]
else:
    allowed_origins = ['*']

CORS(app, resources={r"/api/*": {
    "origins": allowed_origins,
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"],
    "expose_headers": ["Cache-Control", "X-Accel-Buffering"]
}})

# Initialize database
init_db()

# Load API key from environment variable
gemini_api_key = os.getenv('GEMINI_API_KEY')

DEFAULT_CHANNEL_NAMES = {
    'general',
    'night-wakings',
    'bedtime-routines',
    'nap-schedules',
    'gentle-methods',
    'support'
}

ONLINE_THRESHOLD_SECONDS = 120
ONLINE_THRESHOLD_SQL = f'-{ONLINE_THRESHOLD_SECONDS} seconds'


BAD_NAME_WORDS = {
    'fuck',
    'shit',
    'bitch',
    'cunt',
    'asshole',
    'bastard',
    'dick',
    'damn',
    'slut',
    'whore',
    'nigger',
    'spic',
    'kike',
    'faggot',
    'hitler',
    'nazi',
    'retard'
}

MAX_BABY_AGE_MONTHS = 60


def contains_banned_language(value):
    if not value:
        return False
    normalized = re.sub(r'[^a-z0-9]', '', value.lower())
    return any(word in normalized for word in BAD_NAME_WORDS)


def calculate_age_months(birth_date):
    today = datetime.utcnow().date()
    months = (today.year - birth_date.year) * 12 + (today.month - birth_date.month)
    if today.day < birth_date.day:
        months -= 1
    return months


def validate_baby_birthdate(birth_date_str):
    try:
        birth_date = datetime.strptime(birth_date_str, '%Y-%m-%d').date()
    except ValueError:
        raise ValueError('Invalid birth date. Please select a valid date.')

    today = datetime.utcnow().date()
    if birth_date > today:
        raise ValueError('Birth date cannot be in the future.')

    age_months = calculate_age_months(birth_date)
    if age_months < 0:
        raise ValueError('Birth date cannot be in the future.')
    if age_months > MAX_BABY_AGE_MONTHS:
        raise ValueError('Baby age must be 5 years old or younger.')

    return birth_date, age_months


def touch_forum_user(cursor, username):
    if not username:
        return
    cursor.execute(
        '''
        INSERT INTO forum_users (username, display_name, last_seen)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(username) DO UPDATE SET last_seen = CURRENT_TIMESTAMP
        ''',
        (username, username)
    )


def get_gemini_response(message, conversation_history=None, user_context=None, stream=False):
    """Get response from Gemini API with sleep training specialization"""
    if not gemini_api_key:
        raise ValueError("Gemini API key not configured. Please set GEMINI_API_KEY environment variable.")
    
    genai.configure(api_key=gemini_api_key)
    # Use faster model for quicker responses
    # Use gemini-flash-latest (the correct alias for the fastest model)
    model = genai.GenerativeModel('gemini-flash-latest')
    
    # Sleep training specialist prompt
    sleep_specialist_prompt = """# REM-i — System Prompt

## Role
You are REM-i, a gentle baby sleep consultant. You help tired parents reduce night wakings and build healthy, sustainable sleep habits while protecting attachment and following safe-sleep guidelines.

## Priorities (in order)
1. Safety first  
   • You are not a medical professional and do not provide medical diagnoses.  
   • If red flags appear (poor weight gain or growth concerns, breathing issues, persistent snoring, reflux with pain, suspected allergy, fever, chronic illness, apnea events, recurrent vomiting, significant developmental delay, under 12 weeks, preterm without corrected-age use, or reported unsafe sleep), pause coaching and advise consulting their pediatrician.  
   • Always include safe-sleep basics: firm flat sleep surface, baby on back, no soft bedding or bumpers, smoke-free, avoid overheating, no inclined sleepers or weighted sleepwear. If parents bed-share, offer harm-reduction tips and recommend discussing risks with their clinician.  
   • Suspend intensive training during illness, major travel disruption, or immunization day if the parent prefers.

2. Gentle and low-cry by default  
   Prioritize responsive approaches (Fading, Chair Method, Pick Up/Put Down, in-room reassurance, gradual night-weaning). Offer graduated/check-in methods only if the parent explicitly asks for or accepts them. Never push “cry-it-out.”

3. Age-appropriate coaching  
   Use corrected age until 24 months for preterm babies.  
   • 0–3 months: no formal sleep training; focus on soothing, day/night cues, flexible routines.  
   • 4–6 months: gentle methods only; establish routine, optimize naps; consider gradual night-weaning if appropriate.  
   • 7–18 months: gentle first; structured check-ins optional with explicit consent.  
   • 18–36 months: strong routines, clear boundaries, choices, visual cues (ok-to-wake), crib/bed decisions.

4. Parent-centered support  
   Validate feelings. Be warm, nonjudgmental, concise. Offer 1–3 options that fit their values, capacity, and baby’s temperament. Protect feeding and milk supply; do not restrict feeds in young infants or where growth/supply is uncertain.

5. Evidence-based and practical  
   Use current pediatric sleep science. Avoid absolutes; give ranges, not rigid rules. Tailor to temperament and family context.

## Output style
Plain text only. Do not use markdown, symbols for formatting, or code blocks in responses.  
Keep responses concise, scannable, and direct. Use short paragraphs and line breaks.  
Never reveal internal chain-of-thought. Provide clear, user-ready steps only.

## Conversation flow
        
### First message behavior (mandatory)
Begin with a warm greeting and acknowledge whatever the parent already shared. Gather only the key details you still need before offering a plan, but adapt your questions to the parent’s tone and bandwidth. Ask at most 2–3 focused questions at once, referencing what the parent has already told you. If the parent skips a question or seems overwhelmed, summarize what’s still missing, explain why it helps, and then proceed with the best guidance you can using the information available. Do not delay support waiting for a perfect intake, and do not repeat long checklists verbatim.

### After intake is answered
1) If red flags are present, pause coaching and advise contacting their pediatrician. Offer comfort strategies and safe-sleep reminders without a training plan.  
2) Otherwise, provide a brief, tailored plan with clear steps and realistic expectations.

### Default response structure (after intake)
1) Empathy + restated goal  
2) Tonight’s plan (3–6 short steps)  
3) Daytime plan (wake-window or nap-timing ranges, nap count, last-nap cutoff, target bedtime window)  
4) Environment checklist (dark room, continuous white noise, safe-sleep setup, room temp)  
5) What to expect (first 1–3 nights), how to handle tears, when to pause or reset  
6) Options (1–3 methods matched to age/temperament: Fading, Chair, Pick Up/Put Down; plus a night-feed plan if appropriate)  
7) One focused follow-up question or a choice between two paths

### Interaction rules
Be concise. Avoid overwhelming parents with long lists.  
If details are missing mid-conversation, ask only the minimum follow-up needed to proceed.  
When parents choose a method, provide a micro-plan for nights 1–3 and a simple adjustment rule (“if X, then Y”).  
If distress escalates or the parent feels uneasy, recommend pausing and trying a gentler approach.  
During regressions/teething/travel: prioritize comfort, slightly earlier bedtime, and temporary flexibility; resume plan after 2–3 stable days.  
For twins/siblings: stagger starts if needed; keep cues consistent but individualized.  
Do not promise zero night wakings; focus on progress and consistency.

## Learning + Adaptation Rules
Observe → Reflect → Adjust

At the end of each plan, include one micro check-in to assess progress.
Examples:
* “How did last night go — easier, same, or harder?”
* “Were there fewer, more, or the same number of night wakings?”
* “Did your baby settle faster, slower, or about the same?”

Use the parent’s response to adapt the next night’s plan.

### Pattern Learning
Identify recurring patterns (e.g., bedtime consistency, nap duration, settling method).

Reflect those patterns back to parents so they can see improvement.
Example: “It seems your baby settles best when bedtime stays within 15 minutes of 7:30 p.m. Let’s keep that tonight.”

### Emotional Feedback
Occasionally check in on the parent’s wellbeing (“How are you feeling today — exhausted, okay, or rested?”).

Adjust tone accordingly: if “exhausted,” lead with warmth and reassurance before next steps.

### Adaptive Planning
Modify future plans based on reported outcomes.
* If “easier” → reinforce success and maintain plan.
* If “same” → offer a small tweak (e.g., shift bedtime, adjust settling steps).
* If “harder” → simplify or pause training, increase comfort measures.

### Progress Summaries
Every few interactions, summarize visible gains:
“Over the past few nights, you’ve gone from 4 wakes to 2 — that’s real progress.”

Reinforce consistency and resilience.

### Data Consistency
Treat all user inputs (sleep times, wakings, feeds, emotional tone, chosen method) as contextual learning signals.

Use them to make future recommendations more personalized without asking for additional manual tracking.

## Method guidance (offer 1–3 options)
Fading: reduce assistance gradually (time, intensity, or proximity) over several nights.  
Chair Method: parent seated by crib; brief verbal/physical reassurance; increase distance every 1–3 nights.  
Pick Up/Put Down: soothe to calm, put down drowsy; repeat with decreasing assistance.  
Responsive settling: brief comforting before each escalation step; stop if distress rises.  
Night-weaning (only when age/growth appropriate or cleared by clinician): reduce ounces or minutes gradually; preserve one feed if needed; avoid abrupt weans where supply risk exists.  
Schedule tweaks/wake-to-sleep for habitual wakes when appropriate.

## Scheduling rules
Build around age-appropriate total day sleep and wake windows; provide ranges and a sample day anchored to their target wake-up time when possible.  
Include: sample nap timings, caps as needed, last nap latest start, target bedtime window, and a practical night-feed plan.  
Offer fallback plans for short naps, late naps, or off-days.

## Safety and boundaries reminders
Reinforce safe-sleep practices in plans.  
Avoid unsafe recommendations (prone sleeping, inclined sleepers, soft bedding, weighted wearables for infants, overheating).  
Respect culture and family preferences; be nonjudgmental and inclusive.  
Encourage parents to seek medical advice when appropriate.

## Closing prompt examples
Would you like to start with Fading or the Chair approach tonight?  
Do you want to keep one feed around 3–4 a.m., or begin gradual weaning?  
Should we anchor wake-up to 7:00 a.m. or keep it flexible for a few days?

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
    session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_user_from_session_token(session_token)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    user_id = user['id']
    conversations = Conversation.get_all(user_id=user_id)
    conversation_list = []
    for conv in conversations:
        conv_dict = dict(conv)
        title = conv_dict.get('title') or "Sleep Chat"
        conversation_list.append({
            'id': conv_dict.get('id'),
            'title': title,
            'created_at': conv_dict.get('created_at'),
            'last_message_at': conv_dict.get('last_message_at')
        })
    return jsonify(conversation_list)

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
    session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_user_from_session_token(session_token)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    user_id = user['id']
    conversation = Conversation.get_by_id(conversation_id)
    if not conversation:
        return jsonify({'error': 'Conversation not found'}), 404
    
    conversation_dict = dict(conversation)
    record_user_id = conversation_dict.get('user_id')
    if record_user_id and record_user_id != user_id:
        return jsonify({'error': 'Conversation unavailable'}), 403
    
    if not record_user_id:
        Conversation.update_user(conversation_id, user_id)
    
    messages = Message.get_by_conversation(conversation_id)
    return jsonify([dict(msg) for msg in messages])

@app.route('/api/chat', methods=['POST'])
def chat():
    """Send a message and get response (streaming)"""
    try:
        data = request.get_json() or {}
        message = data.get('message')
        conversation_id = data.get('conversation_id')
        stream = data.get('stream', True)  # Default to streaming
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if message is None or not str(message).strip():
            return jsonify({'error': 'Message is required'}), 400
        message = str(message)
        
        if conversation_id is not None and conversation_id != '':
            try:
                conversation_id = int(conversation_id)
            except (TypeError, ValueError):
                return jsonify({'error': 'Invalid conversation ID'}), 400
        else:
            conversation_id = None
        
        user = get_user_from_session_token(session_token)
        user_id = user['id'] if user else None
        
        # Get user context (baby profile and sleep goals) if authenticated
        user_context = None
        if user_id:
            try:
                conn = get_db_connection()
                cursor = conn.cursor()
                
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
        
        conversation_was_new = False
        conversation_title = None
        
        if not conversation_id:
            conversation = Conversation.create(user_id=user_id)
            conversation_id = conversation.id
            conversation_was_new = True
        
        conversation_record = Conversation.get_by_id(conversation_id) if conversation_id else None
        if conversation_record is None:
            return jsonify({'error': 'Conversation not found'}), 404

        conversation_record_dict = dict(conversation_record)
        record_user_id = conversation_record_dict.get('user_id')
        
        if user_id and record_user_id and record_user_id != user_id:
            return jsonify({'error': 'Conversation unavailable'}), 403
        
        if user_id and (not record_user_id):
            Conversation.update_user(conversation_id, user_id)
            conversation_record = Conversation.get_by_id(conversation_id)
            conversation_record_dict = dict(conversation_record) if conversation_record else {}
            record_user_id = conversation_record_dict.get('user_id')
        
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
        
        current_title = conversation_record_dict.get('title')
        DEFAULT_AUTO_TITLES = {'Sleep Chat'}
        if not current_title or (current_title.strip() in DEFAULT_AUTO_TITLES) or conversation_was_new:
            existing_titles = Conversation.get_titles_for_user(user_id) if user_id else []
            conversation_title = generate_conversation_title(message, existing_titles)
            Conversation.update_title(conversation_id, conversation_title)
        else:
            conversation_title = current_title

        if not conversation_title:
            refreshed_record = Conversation.get_by_id(conversation_id)
            if refreshed_record:
                refreshed_dict = dict(refreshed_record)
                conversation_title = refreshed_dict.get('title') or "Sleep Chat"
            else:
                conversation_title = "Sleep Chat"
        
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
                    yield f"data: {json.dumps({'chunk': '', 'done': True, 'conversation_id': conversation_id, 'conversation_title': conversation_title})}\n\n"
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
            'conversation_id': conversation_id,
            'conversation_title': conversation_title
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
        touch_forum_user(cursor, username)
        conn.commit()
        # Get public channels + private channels user is member of, excluding channels they've opted out of
        cursor.execute('''
            SELECT DISTINCT c.*
            FROM forum_channels c
            LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.username = ?
            LEFT JOIN channel_opt_out coo ON c.id = coo.channel_id AND coo.username = ?
            WHERE coo.id IS NULL AND (
                c.is_private = 0 OR (c.is_private = 1 AND cm.username = ?)
            )
            ORDER BY c.name ASC
        ''', (username, username, username))
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
            # For private channels, count members who are currently online
            cursor.execute('''
                SELECT COUNT(DISTINCT cm.username) as count
                FROM channel_members cm
                JOIN forum_users fu ON fu.username = cm.username
                WHERE cm.channel_id = ?
                  AND fu.last_seen >= datetime('now', ?)
            ''', (channel_id, ONLINE_THRESHOLD_SQL))
        else:
            # For public channels, count users currently online in the app
            cursor.execute('''
                SELECT COUNT(*) as count
                FROM forum_users
                WHERE last_seen >= datetime('now', ?)
            ''', (ONLINE_THRESHOLD_SQL,))

        result = cursor.fetchone()
        active_count = result['count'] if result else 0

        if username and active_count > 0:
            if is_private:
                cursor.execute('''
                    SELECT 1
                    FROM channel_members
                    WHERE channel_id = ? AND username = ?
                ''', (channel_id, username))
                if cursor.fetchone():
                    active_count -= 1
            else:
                # For public channels, subtract the current user if they're online
                cursor.execute('''
                    SELECT 1
                    FROM forum_users
                    WHERE username = ? AND last_seen >= datetime('now', ?)
                ''', (username, ONLINE_THRESHOLD_SQL))
                if cursor.fetchone():
                    active_count -= 1

        channel_dict['active_users'] = active_count if active_count > 0 else 0
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
    
    # If user has opted out of this channel, block access
    if username:
        cursor.execute('SELECT 1 FROM channel_opt_out WHERE channel_id = ? AND username = ?', (channel_id, username))
        left_record = cursor.fetchone()
        if left_record:
            conn.close()
            return jsonify({'error': 'You have left this channel'}), 403

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
        cursor.execute('SELECT name, is_private, owner_name FROM forum_channels WHERE id = ?', (channel_id,))
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
        # Create notifications for channel members (excluding the author)
        recipients = set()
        channel_name = None
        
        if channel:
            channel_name = channel['name'] if 'name' in channel.keys() else None
            owner_name = channel['owner_name'] if 'owner_name' in channel.keys() else None
            if owner_name:
                recipients.add(owner_name)
        
        cursor.execute('''
            SELECT username FROM channel_members
            WHERE channel_id = ?
        ''', (channel_id,))
        members = cursor.fetchall()
        for member in members:
            recipients.add(member['username'])
        
        # Do not notify the author of their own post
        recipients.discard(author_name)
        
        for recipient in recipients:
            cursor.execute('''
                INSERT OR IGNORE INTO channel_post_notifications (channel_id, post_id, recipient_username)
                VALUES (?, ?, ?)
            ''', (channel_id, post_id, recipient))
        
        conn.commit()
        
        # Get the created post
        cursor.execute('SELECT * FROM forum_posts WHERE id = ?', (post_id,))
        post = cursor.fetchone()
        post_dict = dict(post)
        if channel_name:
            post_dict['channel_name'] = channel_name
        conn.close()
        
        return jsonify(post_dict)
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
        
        name = name.strip()
        if not name:
            return jsonify({'error': 'Channel name cannot be empty'}), 400
        
        if len(name) > 80:
            return jsonify({'error': 'Channel name must be 80 characters or fewer'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if channel already exists
        cursor.execute('SELECT * FROM forum_channels WHERE name = ?', (name,))
        existing = cursor.fetchone()
        if existing:
            conn.close()
            return jsonify({'error': 'Channel name already exists'}), 400
        
        cursor.execute('''
            INSERT INTO forum_channels (name, icon, description, is_private, owner_name)
            VALUES (?, ?, ?, ?, ?)
        ''', (name, icon, description, 1 if is_private else 0, owner_name))
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
        
        # Check if user is owner and channel is not permanent
        cursor.execute('SELECT name, owner_name FROM forum_channels WHERE id = ?', (channel_id,))
        channel = cursor.fetchone()
        
        if not channel:
            conn.close()
            return jsonify({'error': 'Channel not found'}), 404
        
        channel_name = channel['name']
        owner_name = channel['owner_name'] if channel['owner_name'] else ''

        # Prevent deletion of permanent/system channels
        if channel_name in DEFAULT_CHANNEL_NAMES:
            conn.close()
            return jsonify({'error': 'This channel is permanent and cannot be deleted'}), 403

        # Determine ownership - allow delete if explicit owner matches or user has owner role in channel_members
        is_owner = False
        if owner_name:
            is_owner = owner_name == username
        else:
            # Fallback: check channel_members for owner role (for legacy data)
            cursor.execute('''
                SELECT role FROM channel_members
                WHERE channel_id = ? AND username = ?
            ''', (channel_id, username))
            member = cursor.fetchone()
            is_owner = bool(member and member['role'] == 'owner')

        if not is_owner:
            conn.close()
            return jsonify({'error': 'Only the channel owner can delete the channel'}), 403
        
        # Delete channel members
        cursor.execute('DELETE FROM channel_members WHERE channel_id = ?', (channel_id,))
        # Delete channel invites
        cursor.execute('DELETE FROM channel_invites WHERE channel_id = ?', (channel_id,))
        # Delete opt-out records
        cursor.execute('DELETE FROM channel_opt_out WHERE channel_id = ?', (channel_id,))
        # Delete posts
        cursor.execute('DELETE FROM forum_posts WHERE channel_id = ?', (channel_id,))
        # Delete channel
        cursor.execute('DELETE FROM forum_channels WHERE id = ?', (channel_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Channel deleted successfully'})
    except Exception as e:
        return jsonify({'error': f'Failed to delete channel: {str(e)}'}), 500

@app.route('/api/forum/channels/<int:channel_id>/leave', methods=['POST'])
def leave_channel(channel_id):
    """Allow a user to leave a channel"""
    from database import get_db_connection
    try:
        data = request.get_json() or {}
        username = (data.get('username') or '').strip()
        if not username:
            return jsonify({'error': 'Username is required'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT name, owner_name, is_private FROM forum_channels WHERE id = ?', (channel_id,))
        channel = cursor.fetchone()

        if not channel:
            conn.close()
            return jsonify({'error': 'Channel not found'}), 404

        channel_name = channel['name']
        owner_name = channel['owner_name']

        if owner_name == username:
            conn.close()
            return jsonify({'error': 'Channel owners must delete the channel before leaving'}), 403

        # Remove membership if present (for private channels)
        cursor.execute('DELETE FROM channel_members WHERE channel_id = ? AND username = ?', (channel_id, username))

        # Record opt-out so channel is hidden for this user (works for public and private)
        cursor.execute('''
            INSERT OR REPLACE INTO channel_opt_out (channel_id, username)
            VALUES (?, ?)
        ''', (channel_id, username))

        conn.commit()
        conn.close()

        return jsonify({'message': f'You have left the "{channel_name}" channel'})
    except Exception as e:
        return jsonify({'error': f'Failed to leave channel: {str(e)}'}), 500

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
    """Invite a user to a channel"""
    from database import get_db_connection
    try:
        data = request.get_json()
        invited_by = data.get('invited_by', '')
        invitee_username = data.get('invitee_username', '')
        
        if not invited_by or not invitee_username:
            return jsonify({'error': 'Both inviter and invitee usernames are required'}), 400
        
        invited_by = invited_by.strip()
        invitee_username = invitee_username.strip()
        if invited_by.lower() == invitee_username.lower():
            return jsonify({'error': 'You cannot invite yourself to a topic.'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, name, is_private, owner_name FROM forum_channels WHERE id = ?', (channel_id,))
        channel = cursor.fetchone()
        if not channel:
            conn.close()
            return jsonify({'error': 'Channel not found'}), 404
        
        is_private = bool(channel['is_private'])
        owner_name = (channel['owner_name'] or '').strip()
        is_owner = owner_name.lower() == invited_by.lower() if owner_name else False
        
        # Verify inviter has access (owner or member)
        if not is_owner:
            cursor.execute('''
                SELECT role FROM channel_members
                WHERE channel_id = ? AND LOWER(username) = LOWER(?)
            ''', (channel_id, invited_by))
            membership = cursor.fetchone()
            if not membership:
                conn.close()
                return jsonify({'error': 'You need to be a member of this topic before sending invites.'}), 403
        
        # Prevent duplicate memberships or invites
        cursor.execute('''
            SELECT 1 FROM channel_members
            WHERE channel_id = ? AND LOWER(username) = LOWER(?)
        ''', (channel_id, invitee_username))
        if cursor.fetchone():
            conn.close()
            return jsonify({'message': f'{invitee_username} is already part of this channel.'})
        
        cursor.execute('''
            SELECT id, status FROM channel_invites
            WHERE channel_id = ? AND LOWER(invitee_username) = LOWER(?) AND status IN ('pending_owner', 'pending_recipient')
        ''', (channel_id, invitee_username))
        existing_invite = cursor.fetchone()
        if existing_invite:
            status = existing_invite['status']
            conn.close()
            if status == 'pending_owner':
                return jsonify({'message': f'An invite for {invitee_username} is waiting for the owner to approve.'})
            return jsonify({'message': f'{invitee_username} already has a pending invite.'})
        
        requires_owner_approval = 1 if is_private and not is_owner else 0
        status = 'pending_owner' if requires_owner_approval else 'pending_recipient'
        invite_token = uuid.uuid4().hex
        now = datetime.utcnow()
        owner_approved_at = None
        owner_approved_by = None
        if is_owner and status == 'pending_recipient':
            owner_approved_at = now
            owner_approved_by = owner_name
        
        cursor.execute('''
            INSERT INTO channel_invites (
                channel_id,
                invited_by,
                invitee_username,
                invite_token,
                expires_at,
                status,
                requires_owner_approval,
                owner_approved_at,
                owner_approved_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            channel_id,
            invited_by,
            invitee_username,
            invite_token,
            None,
            status,
            requires_owner_approval,
            owner_approved_at,
            owner_approved_by
        ))
        
        conn.commit()
        conn.close()
        
        if status == 'pending_owner':
            message = f'Invite sent! The topic owner will need to approve before {invitee_username} can join.'
        else:
            message = f'Invite sent to {invitee_username}. They can accept it from their notifications.'
        return jsonify({'message': message, 'status': status})
    except Exception as e:
        return jsonify({'error': f'Failed to invite user: {str(e)}'}), 500

@app.route('/api/forum/invites', methods=['GET'])
def get_channel_invites():
    """Get pending channel invites for a user"""
    from database import get_db_connection
    username = request.args.get('username', '')
    if not username:
        return jsonify({'error': 'Username is required'}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT 
                ci.id,
                ci.channel_id,
                ci.invited_by,
                ci.invitee_username,
                ci.status,
                ci.requires_owner_approval,
                ci.owner_approved_at,
                ci.owner_approved_by,
                ci.created_at,
                c.name as channel_name,
                c.is_private
            FROM channel_invites ci
            JOIN forum_channels c ON c.id = ci.channel_id
            WHERE LOWER(ci.invitee_username) = LOWER(?)
              AND ci.status = 'pending_recipient'
            ORDER BY ci.created_at DESC
        ''', (username,))
        invites = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(invites)
    except Exception as e:
        return jsonify({'error': f'Failed to get invites: {str(e)}'}), 500

@app.route('/api/forum/invites/approvals', methods=['GET'])
def get_channel_invite_approvals():
    """Get invites awaiting owner approval"""
    from database import get_db_connection
    username = request.args.get('username', '')
    if not username:
        return jsonify({'error': 'Username is required'}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT 
                ci.id,
                ci.channel_id,
                ci.invited_by,
                ci.invitee_username,
                ci.status,
                ci.requires_owner_approval,
                ci.created_at,
                c.name as channel_name,
                c.is_private
            FROM channel_invites ci
            JOIN forum_channels c ON c.id = ci.channel_id
            WHERE c.owner_name = ?
              AND ci.status = 'pending_owner'
            ORDER BY ci.created_at DESC
        ''', (username,))
        invites = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(invites)
    except Exception as e:
        return jsonify({'error': f'Failed to get invite approvals: {str(e)}'}), 500

@app.route('/api/forum/invites/<int:invite_id>/approve', methods=['POST'])
def approve_channel_invite(invite_id):
    """Owner approves or declines an invite"""
    from database import get_db_connection
    try:
        data = request.get_json() or {}
        username = data.get('username', '')
        action = (data.get('action') or '').lower()
        if not username or action not in ('approve', 'decline'):
            return jsonify({'error': 'Username and valid action are required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT ci.*, c.owner_name
            FROM channel_invites ci
            JOIN forum_channels c ON c.id = ci.channel_id
            WHERE ci.id = ?
        ''', (invite_id,))
        invite = cursor.fetchone()
        if not invite:
            conn.close()
            return jsonify({'error': 'Invite not found'}), 404
        if invite['owner_name'] != username:
            conn.close()
            return jsonify({'error': 'Only the topic owner can act on this invite.'}), 403
        if invite['status'] != 'pending_owner':
            conn.close()
            return jsonify({'error': 'This invite has already been processed.'}), 400
        
        if action == 'approve':
            cursor.execute('''
                UPDATE channel_invites
                SET status = 'pending_recipient',
                    owner_approved_at = ?,
                    owner_approved_by = ?
                WHERE id = ?
            ''', (datetime.utcnow(), username, invite_id))
            conn.commit()
            conn.close()
            return jsonify({'message': 'Invite approved.'})
        else:
            cursor.execute('''
                UPDATE channel_invites
                SET status = 'declined',
                    responded_at = ?
                WHERE id = ?
            ''', (datetime.utcnow(), invite_id))
            conn.commit()
            conn.close()
            return jsonify({'message': 'Invite declined.'})
    except Exception as e:
        return jsonify({'error': f'Failed to update invite: {str(e)}'}), 500

@app.route('/api/forum/invites/<int:invite_id>/respond', methods=['POST'])
def respond_to_channel_invite(invite_id):
    """Invitee accepts or declines an invitation"""
    from database import get_db_connection
    try:
        data = request.get_json() or {}
        username = data.get('username', '')
        action = (data.get('action') or '').lower()
        if not username or action not in ('accept', 'decline'):
            return jsonify({'error': 'Username and valid action are required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT ci.*, c.name as channel_name, c.is_private
            FROM channel_invites ci
            JOIN forum_channels c ON c.id = ci.channel_id
            WHERE ci.id = ?
        ''', (invite_id,))
        invite = cursor.fetchone()
        if not invite:
            conn.close()
            return jsonify({'error': 'Invite not found'}), 404
        if invite['status'] != 'pending_recipient':
            conn.close()
            return jsonify({'error': 'This invite is no longer active.'}), 400
        if invite['invitee_username'].lower() != username.lower():
            conn.close()
            return jsonify({'error': 'This invite does not belong to you.'}), 403
        if invite['requires_owner_approval'] and not invite['owner_approved_at']:
            conn.close()
            return jsonify({'error': 'This invite is awaiting owner approval.'}), 400
        
        if action == 'accept':
            cursor.execute('''
                INSERT OR IGNORE INTO channel_members (channel_id, username, role, invited_by)
                VALUES (?, ?, 'member', ?)
            ''', (invite['channel_id'], username, invite['invited_by']))
            cursor.execute('DELETE FROM channel_opt_out WHERE channel_id = ? AND username = ?', (invite['channel_id'], username))
            cursor.execute('''
                UPDATE channel_invites
                SET status = 'accepted',
                    responded_at = ?
                WHERE id = ?
            ''', (datetime.utcnow(), invite_id))
            conn.commit()
            conn.close()
            return jsonify({'message': f"You've joined {invite['channel_name']}!"})
        else:
            cursor.execute('''
                UPDATE channel_invites
                SET status = 'declined',
                    responded_at = ?
                WHERE id = ?
            ''', (datetime.utcnow(), invite_id))
            conn.commit()
            conn.close()
            return jsonify({'message': 'Invite declined.'})
    except Exception as e:
        return jsonify({'error': f'Failed to respond to invite: {str(e)}'}), 500

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
# Use persistent storage for uploads if available (Railway volumes), otherwise use local directory
if os.path.exists('/data'):
    UPLOAD_FOLDER = '/data/uploads'
else:
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
            'new_message_senders': [],
            'new_friend_requests': [],
            'channel_invites': [],
            'invite_approvals': []
        }

        # Fetch unread channel post notifications
        cursor.execute('''
            SELECT 
                n.id as notification_id,
                p.id as post_id,
                p.channel_id,
                p.author_name,
                p.content,
                p.timestamp,
                c.name as channel_name
            FROM channel_post_notifications n
            JOIN forum_posts p ON p.id = n.post_id
            JOIN forum_channels c ON c.id = p.channel_id
            WHERE n.recipient_username = ? AND n.is_read = 0
            ORDER BY p.timestamp DESC
            LIMIT 50
        ''', (username,))
        channel_notifications = cursor.fetchall()

        notified_post_ids = set()
        for row in channel_notifications:
            notified_post_ids.add(row['post_id'])
            notifications['new_posts'].append({
                'id': row['post_id'],
                'channel_id': row['channel_id'],
                'channel_name': row['channel_name'],
                'author_name': row['author_name'],
                'content': row['content'],
                'timestamp': row['timestamp'],
                'notification_id': row['notification_id']
            })
        
        # Fallback to time-based check for posts (e.g., for public channels without explicit memberships)
        if last_check:
            cursor.execute('''
                SELECT DISTINCT c.id, c.name
                FROM forum_channels c
                LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.username = ?
                LEFT JOIN channel_opt_out coo ON coo.channel_id = c.id AND coo.username = ?
                WHERE coo.id IS NULL
                  AND (c.is_private = 0 
                   OR c.owner_name = ?
                   OR cm.username = ?)
            ''', (username, username, username, username))
            
            accessible_channels = cursor.fetchall()
            channel_ids = [ch['id'] for ch in accessible_channels]
            
            if channel_ids:
                placeholders = ','.join(['?'] * len(channel_ids))
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
                for post in new_posts:
                    if post['id'] in notified_post_ids:
                        continue
                    post_dict = dict(post)
                    post_dict['notification_id'] = None
                    notifications['new_posts'].append(post_dict)
        
        # Check for new unread messages
        cursor.execute('''
            SELECT COUNT(*) as count
            FROM direct_messages
            WHERE receiver_name = ? AND is_read = 0
        ''', (username,))
        result = cursor.fetchone()
        notifications['new_messages'] = result['count'] if result else 0

        # Get details of unread message senders (for navigation)
        cursor.execute('''
            SELECT sender_name, COUNT(*) as unread_count, MAX(created_at) as last_message_time
            FROM direct_messages
            WHERE receiver_name = ? AND is_read = 0
            GROUP BY sender_name
            ORDER BY last_message_time DESC
        ''', (username,))
        message_senders = cursor.fetchall()
        notifications['new_message_senders'] = [dict(sender) for sender in message_senders]
        
        # Check for new friend requests
        cursor.execute('''
            SELECT user1_name as from_user, created_at
            FROM friendships
            WHERE user2_name = ? AND status = 'pending'
            ORDER BY created_at DESC
        ''', (username,))
        friend_requests = cursor.fetchall()
        notifications['new_friend_requests'] = [dict(req) for req in friend_requests]

        # Pending channel invites for the user
        cursor.execute('''
            SELECT 
                ci.id,
                ci.channel_id,
                ci.invited_by,
                ci.created_at,
                ci.requires_owner_approval,
                c.name as channel_name,
                c.is_private
            FROM channel_invites ci
            JOIN forum_channels c ON c.id = ci.channel_id
            WHERE LOWER(ci.invitee_username) = LOWER(?)
              AND ci.status = 'pending_recipient'
            ORDER BY ci.created_at DESC
        ''', (username,))
        notifications['channel_invites'] = [dict(invite) for invite in cursor.fetchall()]

        # Invites needing owner approval
        cursor.execute('''
            SELECT 
                ci.id,
                ci.channel_id,
                ci.invited_by,
                ci.invitee_username,
                ci.created_at,
                c.name as channel_name,
                c.is_private
            FROM channel_invites ci
            JOIN forum_channels c ON c.id = ci.channel_id
            WHERE c.owner_name = ?
              AND ci.status = 'pending_owner'
            ORDER BY ci.created_at DESC
        ''', (username,))
        notifications['invite_approvals'] = [dict(invite) for invite in cursor.fetchall()]
        
        conn.close()
        
        return jsonify(notifications)
    except Exception as e:
        return jsonify({'error': f'Failed to get notifications: {str(e)}'}), 500


@app.route('/api/notifications/read', methods=['POST'])
def mark_notifications_read():
    """Mark channel post notifications as read for a user"""
    from database import get_db_connection
    data = request.get_json() or {}
    username = data.get('username', '')
    notification_ids = data.get('notification_ids') or []
    post_ids = data.get('post_ids') or []
    mark_all = data.get('mark_all', False)

    if not username:
        return jsonify({'error': 'Username is required'}), 400

    if not mark_all and not notification_ids and not post_ids:
        return jsonify({'error': 'No notifications specified to mark as read'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        affected = 0
        if mark_all:
            cursor.execute('''
                UPDATE channel_post_notifications
                SET is_read = 1, read_at = CURRENT_TIMESTAMP
                WHERE recipient_username = ? AND is_read = 0
            ''', (username,))
            affected = cursor.rowcount
        elif notification_ids:
            if not isinstance(notification_ids, (list, tuple)):
                notification_ids = [notification_ids]
            placeholders = ','.join(['?'] * len(notification_ids))
            query = f'''
                UPDATE channel_post_notifications
                SET is_read = 1, read_at = CURRENT_TIMESTAMP
                WHERE recipient_username = ? AND id IN ({placeholders})
            '''
            cursor.execute(query, [username, *notification_ids])
            affected = cursor.rowcount
        elif post_ids:
            if not isinstance(post_ids, (list, tuple)):
                post_ids = [post_ids]
            placeholders = ','.join(['?'] * len(post_ids))
            query = f'''
                UPDATE channel_post_notifications
                SET is_read = 1, read_at = CURRENT_TIMESTAMP
                WHERE recipient_username = ? AND post_id IN ({placeholders})
            '''
            cursor.execute(query, [username, *post_ids])
            affected = cursor.rowcount

        conn.commit()
        conn.close()

        return jsonify({'updated': affected})
    except Exception as e:
        return jsonify({'error': f'Failed to mark notifications as read: {str(e)}'}), 500

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
            touch_forum_user(cursor, username)
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

        touch_forum_user(cursor, username)
        conn.commit()
        
        # Get accepted friendships with profile info and online status
        cursor.execute('''
            SELECT 
                CASE 
                    WHEN f.user1_name = ? THEN f.user2_name
                    ELSE f.user1_name
                END as friend_name,
                f.created_at,
                fu.display_name,
                au.profile_picture,
                au.bio,
                fu.last_seen,
                CASE 
                    WHEN fu.last_seen IS NOT NULL AND fu.last_seen >= datetime('now', ?) THEN 1
                    ELSE 0
                END AS is_online
            FROM friendships f
            LEFT JOIN auth_users au ON au.username = CASE 
                WHEN f.user1_name = ? THEN f.user2_name
                ELSE f.user1_name
            END
            LEFT JOIN forum_users fu ON fu.username = CASE 
                WHEN f.user1_name = ? THEN f.user2_name
                ELSE f.user1_name
            END
            WHERE (f.user1_name = ? OR f.user2_name = ?)
              AND f.status = 'accepted'
            ORDER BY f.created_at DESC
        ''', (username, ONLINE_THRESHOLD_SQL, username, username, username, username))
        
        friends = cursor.fetchall()
        friend_list = [dict(friend) for friend in friends]
        
        # Debug logging - check all friendships for this user
        cursor.execute('''
            SELECT * FROM friendships 
            WHERE user1_name = ? OR user2_name = ?
        ''', (username, username))
        all_friendships = cursor.fetchall()
        print(f"DEBUG: All friendships for '{username}': {len(all_friendships)}")
        for f in all_friendships:
            print(f"  - {dict(f)}")
        
        # Also check ALL friendships in database (for debugging)
        cursor.execute('SELECT COUNT(*) as count FROM friendships')
        total_friendships = cursor.fetchone()['count']
        print(f"DEBUG: Total friendships in database: {total_friendships}")
        if total_friendships > 0:
            cursor.execute('SELECT * FROM friendships LIMIT 10')
            sample_friendships = cursor.fetchall()
            print(f"DEBUG: Sample friendships (first 10):")
            for f in sample_friendships:
                print(f"  - {dict(f)}")
        
        print(f"Found {len(friend_list)} accepted friends for user: {username}")
        if friend_list:
            print(f"Friend names: {[f.get('friend_name') for f in friend_list]}")
        else:
            print(f"WARNING: No friends found for user '{username}'")
            # Check if user exists
            cursor.execute('SELECT username FROM auth_users WHERE username = ?', (username,))
            user_check = cursor.fetchone()
            print(f"User exists in auth_users: {user_check is not None}")
        
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
        try:
            cursor.execute('''
                INSERT INTO friendships (user1_name, user2_name, status)
                VALUES (?, ?, 'pending')
            ''', (from_user, to_user))
            conn.commit()
            print(f"Friend request created: {from_user} -> {to_user}")
            return jsonify({'message': 'Friend request sent'})
        except sqlite3.IntegrityError:
            conn.rollback()
            print(f"Duplicate friend request detected: {from_user} -> {to_user}")
            return jsonify({'error': 'Friend request already exists'}), 400
        finally:
            conn.close()
        
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
            
            # Also check if the search query matches any username exactly (case-insensitive)
            cursor.execute('''
                SELECT username FROM auth_users 
                WHERE LOWER(username) = LOWER(?)
                AND (is_active = 1 OR is_active IS NULL)
            ''', (query,))
            exact_match = cursor.fetchone()
            if exact_match:
                print(f"DEBUG: Found exact match (case-insensitive): {exact_match['username']}")
        
        conn.close()
        return jsonify(user_list)
    except Exception as e:
        print(f"Error in search_users: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to search users: {str(e)}'}), 500

@app.route('/api/debug/friendships/<username>', methods=['GET'])
def debug_friendships(username):
    """Debug endpoint to check friendships for a user"""
    from database import get_db_connection
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all friendships for this user
        cursor.execute('''
            SELECT * FROM friendships 
            WHERE user1_name = ? OR user2_name = ?
        ''', (username, username))
        all_friendships = cursor.fetchall()
        
        # Get total friendships count
        cursor.execute('SELECT COUNT(*) as count FROM friendships')
        total_friendships = cursor.fetchone()['count']
        
        # Get sample friendships
        cursor.execute('SELECT * FROM friendships LIMIT 20')
        sample_friendships = cursor.fetchall()
        
        # Check if user exists
        cursor.execute('SELECT username FROM auth_users WHERE username = ?', (username,))
        user_exists = cursor.fetchone() is not None
        
        conn.close()
        
        return jsonify({
            'username': username,
            'user_exists': user_exists,
            'total_friendships_in_db': total_friendships,
            'friendships_for_user': len(all_friendships),
            'all_friendships_for_user': [dict(f) for f in all_friendships],
            'sample_friendships': [dict(f) for f in sample_friendships]
        })
    except Exception as e:
        return jsonify({'error': f'Failed to debug: {str(e)}'}), 500

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

        if contains_banned_language(first_name) or contains_banned_language(last_name):
            return jsonify({'error': 'Please use respectful language in your name.'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Generate or validate username
        if use_random_username:
            # If a username was provided and matches the random pattern, try to use it first
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
        
        # Validate and normalize baby profiles before creating user
        baby_profiles_input = data.get('baby_profiles', [])
        processed_baby_profiles = []
        if baby_profiles_input and isinstance(baby_profiles_input, list):
            for baby_profile in baby_profiles_input:
                baby_name = (baby_profile.get('name') or '').strip()
                birth_date_raw = (baby_profile.get('birth_date') or '').strip() or None
                age_months = baby_profile.get('age_months')
                sleep_issues = (baby_profile.get('sleep_issues') or '').strip() or None
                current_schedule = (baby_profile.get('current_schedule') or '').strip() or None
                notes = (baby_profile.get('notes') or '').strip() or None

                if baby_name and contains_banned_language(baby_name):
                    conn.close()
                    return jsonify({'error': 'Please use respectful language in baby names.'}), 400

                birth_date_iso = None
                computed_age_months = None

                if birth_date_raw:
                    try:
                        birth_date_obj, computed_age_months = validate_baby_birthdate(birth_date_raw)
                    except ValueError as ve:
                        conn.close()
                        return jsonify({'error': str(ve)}), 400

                    birth_date_iso = birth_date_obj.isoformat()
                elif age_months is not None:
                    try:
                        age_months = int(age_months)
                    except (TypeError, ValueError):
                        age_months = None

                processed_baby_profiles.append({
                    'name': baby_name or None,
                    'birth_date': birth_date_iso,
                    'age_months': computed_age_months if birth_date_iso else (age_months if isinstance(age_months, int) else None),
                    'sleep_issues': sleep_issues,
                    'current_schedule': current_schedule,
                    'notes': notes
                })

        # Hash password
        password_hash = generate_password_hash(password)
        
        # Create user
        cursor.execute('''
            INSERT INTO auth_users (username, first_name, last_name, email, password_hash)
            VALUES (?, ?, ?, ?, ?)
        ''', (username, first_name, last_name, email, password_hash))
        user_id = cursor.lastrowid
        
        # Create forum user entry
        sanitized_display_name = f"{first_name} {last_name}".strip()
        if contains_banned_language(sanitized_display_name):
            sanitized_display_name = username

        cursor.execute('''
            INSERT OR IGNORE INTO forum_users (username, display_name)
            VALUES (?, ?)
        ''', (username, sanitized_display_name or username))
        
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
        if processed_baby_profiles:
            for baby_profile in processed_baby_profiles:
                if baby_profile['name'] or baby_profile['birth_date'] or baby_profile['age_months'] or baby_profile['sleep_issues'] or baby_profile['current_schedule'] or baby_profile['notes']:
                    cursor.execute('''
                        INSERT INTO baby_profiles (user_id, name, birth_date, age_months, sleep_issues, current_schedule, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        user_id,
                        baby_profile['name'],
                        baby_profile['birth_date'],
                        baby_profile['age_months'],
                        baby_profile['sleep_issues'],
                        baby_profile['current_schedule'],
                        baby_profile['notes']
                    ))
        
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
        try:
            if 'conn' in locals():
                conn.rollback()
        except Exception:
            pass
        if 'conn' in locals():
            conn.close()
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
        
        print(f"Login attempt for username: '{username}'")
        
        if not user:
            print(f"User not found: '{username}'")
            conn.close()
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Check if account is active
        user_keys = user.keys() if hasattr(user, 'keys') else []
        is_active = user['is_active'] if 'is_active' in user_keys else 1
        print(f"User found, is_active: {is_active}")
        if is_active == 0:
            conn.close()
            return jsonify({'error': 'This account has been deactivated'}), 403
        
        # Check password
        password_valid = check_password_hash(user['password_hash'], password)
        print(f"Password valid: {password_valid}")
        if not password_valid:
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
        touch_forum_user(cursor, username)

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
        session_keys = session.keys() if hasattr(session, 'keys') else []
        if ('is_active' in session_keys and session['is_active'] == 0):
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

@app.route('/api/activity/ping', methods=['POST'])
def activity_ping():
    """Update the user's last seen timestamp"""
    from database import get_db_connection
    try:
        data = request.get_json() or {}
        username = (data.get('username') or '').strip()
        if not username:
            return jsonify({'error': 'Username is required'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        touch_forum_user(cursor, username)
        conn.commit()
        conn.close()

        return jsonify({'status': 'ok'})
    except Exception as e:
        return jsonify({'error': f'Failed to update activity: {str(e)}'}), 500


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
        if 'first_name' in data and first_name and contains_banned_language(first_name):
            conn.close()
            return jsonify({'error': 'Please use respectful language in your name.'}), 400

        if 'last_name' in data and last_name and contains_banned_language(last_name):
            conn.close()
            return jsonify({'error': 'Please use respectful language in your name.'}), 400


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
                ''', (
                    username,
                    (f"{first_name or ''} {last_name or ''}".strip() or username)
                    if not contains_banned_language(f"{first_name or ''} {last_name or ''}")
                    else username,
                    current_username
                ))
            
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

        if contains_banned_language(name):
            conn.close()
            return jsonify({'error': 'Please use respectful language in baby names.'}), 400

        if birth_date:
            try:
                birth_date_obj, computed_age_months = validate_baby_birthdate(birth_date)
            except ValueError as ve:
                conn.close()
                return jsonify({'error': str(ve)}), 400

            birth_date = birth_date_obj.isoformat()
            age_months = computed_age_months
        elif age_months is not None:
            try:
                age_months = int(age_months)
            except (TypeError, ValueError):
                age_months = None

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

        if contains_banned_language(name):
            conn.close()
            return jsonify({'error': 'Please use respectful language in baby names.'}), 400

        if birth_date:
            try:
                birth_date_obj, computed_age_months = validate_baby_birthdate(birth_date)
            except ValueError as ve:
                conn.close()
                return jsonify({'error': str(ve)}), 400

            birth_date = birth_date_obj.isoformat()
            age_months = computed_age_months
        elif age_months is not None:
            try:
                age_months = int(age_months)
            except (TypeError, ValueError):
                age_months = None

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
