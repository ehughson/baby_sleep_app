from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv
from database import init_db
from models import Conversation, Message

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

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

if __name__ == '__main__':
    app.run(debug=True, port=5001)
